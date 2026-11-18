import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';
import { io } from 'socket.io-client';

const output = 'test-results/checkpoint12';

async function waitFor(read, description, timeout = 12000) {
  const end = performance.now() + timeout;
  do {
    const value = await read();
    if (value) return value;
    await delay(25);
  } while (performance.now() < end);
  assert.fail(description);
}

test(
  'production session resumes current play and results, then invalidates on host loss',
  { timeout: 120000, skip: !process.env.YCCE_RELIABILITY },
  async (t) => {
    await mkdir(output, { recursive: true });
    const port = process.env.YCCE_RECOVERY_PORT ?? '3269';
    const url = `http://127.0.0.1:${port}`;
    const evidence = { checks: {}, warmTitleMs: [], errors: [] };
    const processes = [];
    const sockets = [];
    let browser;
    let context;
    let recording;
    async function stop(process, signal) {
      const { child, exited } = process;
      if (child.exitCode === null && child.signalCode === null) {
        if (child.connected) child.disconnect();
        child.kill(signal);
      }
      await exited;
    }
    t.after(async () => {
      for (const socket of sockets) socket.disconnect();
      for (const process of processes) await stop(process, 'SIGTERM');
      await context?.close();
      if (recording) await recording.saveAs(`${output}/recovery.webm`);
      await browser?.close();
      await writeFile(
        `${output}/recovery.json`,
        JSON.stringify(evidence, null, 2),
      );
      await writeFile(
        `${output}/recovery-host.log`,
        processes.map(({ log }) => log).join('\n'),
      );
    });
    async function startHost(instrumented) {
      const child = fork('build-host/server/index.js', [], {
        env: { ...process.env, HOST: '127.0.0.1', PORT: port, ORIGIN: url },
        execArgv: instrumented
          ? ['--import', './tests/scenarios/checkpoint12-host.js']
          : [],
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      });
      const host = { child, exited: once(child, 'exit'), log: '' };
      processes.push(host);
      for (const stream of [child.stdout, child.stderr])
        stream.on('data', (data) => (host.log += data));
      await waitFor(() => {
        if (child.exitCode !== null) assert.fail(host.log);
        return host.log.includes('Host listening');
      }, 'Production host listens');
      return host;
    }
    const original = await startHost(true);
    let requestId = 0;
    async function fixture(action, args) {
      const id = ++requestId;
      const reply = once(original.child, 'message', {
        signal: AbortSignal.timeout(5000),
      });
      original.child.send({ action, args, requestId: id });
      const [response] = await reply;
      assert.equal(response.requestId, id);
      assert.equal(response.error, undefined);
      return response.value;
    }
    async function connect() {
      const socket = io(url, {
        forceNew: true,
        reconnection: false,
        transports: ['websocket'],
      });
      sockets.push(socket);
      await once(socket, 'connect', { signal: AbortSignal.timeout(5000) });
      return socket;
    }
    browser = await chromium.launch({
      ...(process.env.CHROME_PATH
        ? { executablePath: process.env.CHROME_PATH }
        : { channel: 'chrome' }),
      headless: true,
    });
    context = await browser.newContext({
      recordVideo: { dir: `${output}/raw` },
    });
    const page = await context.newPage();
    recording = page.video();
    page.setDefaultTimeout(10000);
    page.on('pageerror', (error) => evidence.errors.push(error.message));
    let session;
    let state;
    page.on('websocket', (wire) => {
      wire.on('framereceived', ({ payload }) => {
        if (typeof payload !== 'string' || !/^42\d*\[/.test(payload)) return;
        const [event, value] = JSON.parse(payload.slice(payload.indexOf('[')));
        if (event === 'observation') state = value.state;
        if (event === 'session') session = value;
      });
    });
    const button = (name) => page.getByRole('button', { name, exact: true });
    const connected = () =>
      page.getByText('Host connected', { exact: true }).waitFor();
    const phase = (kind) =>
      waitFor(() => state?.phase === kind, `Browser reaches ${kind}`);
    const own = (view = state) =>
      view.players.find(({ id }) => id === session.playerId);
    await page.goto(url);
    await connected();
    for (let load = 0; load < 3; load++) {
      const start = performance.now();
      await page.reload();
      await connected();
      const elapsed = performance.now() - start;
      evidence.warmTitleMs.push(elapsed);
      assert.ok(elapsed <= 3000);
    }
    await page.getByLabel('Your display name').fill('Returning player');
    await button('Create a room').click();
    await phase('lobby');
    const originalSession = session;
    const saved = () =>
      page.evaluate(() =>
        JSON.parse(sessionStorage.getItem('ycce-room-session') ?? 'null'),
      );
    const originalHost = (await saved()).hostId;
    assert.ok(originalHost);
    const initialRound = state.roundId;
    const duplicate = await connect();
    assert.equal(
      await duplicate.timeout(5000).emitWithAck('join-room', {
        name: 'Second tab',
        roomId: session.matchId,
        token: session.token,
      }),
      'Session is in use or belongs to another room',
    );
    duplicate.disconnect();
    evidence.checks.duplicateSession = true;
    const oversized = await connect();
    const disconnectedLarge = once(oversized, 'disconnect', {
      signal: AbortSignal.timeout(5000),
    });
    oversized.emit('join-room', { name: 'x'.repeat(4097), roomId: null });
    await disconnectedLarge;
    evidence.checks.oversizedMessageClosed = true;

    let scout;
    let scoutSession;
    let scoutState;
    let autoLoad = false;
    async function joinScout(token) {
      scout = await connect();
      const event = once(scout, 'session', {
        signal: AbortSignal.timeout(5000),
      });
      let loadedRevision;
      scout.on('observation', ({ state: observed }) => {
        scoutState = observed;
        if (
          autoLoad &&
          observed.phase === 'loading' &&
          observed.loadingRevision !== loadedRevision
        ) {
          loadedRevision = observed.loadingRevision;
          scout.emit('loaded', true, loadedRevision);
        }
      });
      assert.equal(
        await scout.timeout(5000).emitWithAck('join-room', {
          name: 'Connected player',
          roomId: session.matchId,
          ...(token ? { token } : {}),
        }),
        null,
      );
      [scoutSession] = await event;
    }
    await joinScout();
    let sequence = 0;
    function readyIntent() {
      return {
        kind: 'ready',
        playerId: scoutSession.playerId,
        matchId: session.matchId,
        sequence: ++sequence,
        ready: true,
      };
    }
    async function readyBoth() {
      await button('Ready to play').click();
      const intent = readyIntent();
      assert.equal(
        (await scout.timeout(5000).emitWithAck('intent', intent)).status,
        'queued',
      );
      return intent;
    }
    const ready = await readyBoth();
    assert.equal(
      (await scout.timeout(5000).emitWithAck('intent', ready)).status,
      'rejected',
    );
    const invalid = { ...readyIntent(), ready: 'true' };
    assert.equal(
      (await scout.timeout(5000).emitWithAck('intent', invalid)).status,
      'rejected',
    );
    const unexpectedField = { ...readyIntent(), outcome: 'ready' };
    assert.equal(
      (await scout.timeout(5000).emitWithAck('intent', unexpectedField)).status,
      'rejected',
    );
    evidence.checks.protocol = [
      'valid ready queued',
      'duplicate rejected',
      'invalid field type rejected',
      'undeclared field rejected',
    ];
    await button('Start match').click();
    await phase('loading');
    const scoutToken = scoutSession.token;
    scout.disconnect();
    await waitFor(
      () =>
        state.phase === 'lobby' && state.loadingError?.includes('disconnected'),
      'Crew returns to lobby after loading transport loss',
    );
    await joinScout(scoutToken);
    assert.equal(
      (await scout.timeout(5000).emitWithAck('intent', ready)).status,
      'rejected',
    );
    evidence.checks.protocol.push(
      'accepted readiness sequence stays stale after reconnect',
    );
    await waitFor(
      () => state.players.every((player) => player.connected && !player.ready),
      'Returning crew must ready again',
    );
    evidence.checks.loadingDisconnect = true;

    autoLoad = true;
    await readyBoth();
    await button('Start match').click();
    await phase('running');
    await fixture('stage', [session.playerId, scoutSession.playerId]);
    await page.getByLabel('Match world').focus();
    const beforeMove = own().position;
    await page.keyboard.down('w');
    await waitFor(
      () =>
        Math.hypot(
          own().position.x - beforeMove.x,
          own().position.z - beforeMove.z,
        ) > 0.6,
      'Live controls move the craft',
    );
    await context.setOffline(true);
    await fixture('reconnect', { playerId: session.playerId });
    await page.getByText('Host disconnected', { exact: true }).waitFor();
    await waitFor(
      () =>
        scoutState.players.some(
          (player) => player.id === session.playerId && !player.connected,
        ),
      'Peer sees disconnected craft',
    );
    const playerView = () =>
      fixture('view', { playerId: originalSession.playerId });
    const disconnected = own(await playerView());
    await fixture('combat', {
      target: session.playerId,
      ownerId: scoutSession.playerId,
    });
    const damaged = own(await playerView());
    assert.ok(damaged.health.hull < disconnected.health.hull);
    await delay(450);
    const stopped = own(await playerView()).position;
    await delay(350);
    const still = own(await playerView()).position;
    assert.ok(Math.hypot(still.x - stopped.x, still.z - stopped.z) < 0.1);
    await page.keyboard.up('w');
    await context.setOffline(false);
    await waitFor(
      () =>
        state.phase === 'running' &&
        state.roundId === initialRound &&
        state.players.some(
          (player) =>
            player.id === originalSession.playerId && player.connected,
        ),
      'Browser received the resumed live craft',
    );
    await page.locator('main.playing').waitFor();
    assert.equal(session.playerId, originalSession.playerId);
    assert.ok(own().health.hull < disconnected.health.hull);
    evidence.checks.combatReconnect = {
      beforeHull: disconnected.health.hull,
      resumedHull: own().health.hull,
      heldInputStopped: true,
      sameCraft: true,
    };

    await context.setOffline(true);
    await fixture('reconnect', { playerId: session.playerId });
    await waitFor(
      () =>
        scoutState.players.some(
          (player) =>
            player.id === originalSession.playerId && !player.connected,
        ),
      'Peer sees second outage',
    );
    await fixture('eliminate', [session.playerId]);
    await waitFor(
      () => scoutState.canFinishSurvivor,
      'Remaining player can finish',
    );
    scout.emit('finish-match');
    await waitFor(
      () => scoutState.phase === 'finished',
      'Host records results while original player is offline',
    );
    await context.setOffline(false);
    await phase('finished');
    await button('Return everyone to lobby').waitFor();
    assert.equal(own().life.kind, 'eliminated');
    assert.deepEqual(state.result.outcome, {
      kind: 'winner',
      playerId: scoutSession.playerId,
    });
    evidence.checks.reconnectToResults = true;
    await button('Return everyone to lobby').click();
    await phase('lobby');
    assert.notEqual(state.roundId, initialRound);
    assert.equal(own().life.kind, 'alive');
    assert.equal(
      (await scout.timeout(5000).emitWithAck('intent', ready)).status,
      'rejected',
    );
    evidence.checks.protocol.push(
      'old readiness sequence stays stale across rematch',
    );
    evidence.checks.rematch = true;

    await readyBoth();
    await button('Start match').click();
    await phase('running');
    await stop(original, 'SIGKILL');
    await page.getByText('Host disconnected', { exact: true }).waitFor();
    assert.equal(await page.locator('main.playing').count(), 0);
    const replacement = await startHost(false);
    await page
      .getByText(/The host restarted\. Your previous room ended\./)
      .waitFor();
    assert.equal(await saved(), null);
    await page
      .getByRole('button', { name: 'Create a room', exact: true })
      .waitFor();
    const outsider = await connect();
    const oldRoom = await outsider.timeout(5000).emitWithAck('join-room', {
      name: 'Returning player',
      roomId: originalSession.matchId,
      token: originalSession.token,
    });
    assert.equal(oldRoom, 'Saved session is no longer available');
    outsider.disconnect();
    evidence.checks.abruptHostRestart = true;
    evidence.checks.oldSessionRejected = true;

    state = undefined;
    await page.getByLabel('Your display name').fill('Returning player');
    await button('Create a room').click();
    await phase('lobby');
    assert.notEqual(session.matchId, originalSession.matchId);
    assert.notEqual((await saved()).hostId, originalHost);
    await button('Ready to play').click();
    await button('Start match').click();
    await phase('running');
    await stop(replacement, 'SIGTERM');
    await page
      .getByText(
        /Connection to the host was lost when it shut down\. The match ended\./,
      )
      .waitFor();
    assert.equal(await page.locator('main.playing').count(), 0);
    evidence.checks.gracefulHostShutdown = true;
    assert.deepEqual(evidence.errors, []);
  },
);
