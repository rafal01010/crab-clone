import assert from 'node:assert/strict';
import { execFileSync, fork } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const output = 'test-results/checkpoint12';
const MiB = 1024 * 1024;
const viewport = { width: 1366, height: 768 };
const privacyMarker = 'private-audit-offer-12';
const names = ['Pilot', 'Scout', 'Concealed', 'Observer'];

async function until(read, message, timeout = 15000) {
  const deadline = Date.now() + timeout;
  do {
    const value = await read();
    if (value) return value;
    await delay(25);
  } while (Date.now() < deadline);
  assert.fail(message);
}

async function inspectChunks() {
  const root = 'build/client/_app/immutable';
  const files = (await readdir(root, { recursive: true })).filter((file) =>
    file.endsWith('.js'),
  );
  assert.ok(files.some((file) => file.startsWith('entry/')));
  assert.ok(files.some((file) => file.startsWith('nodes/')));
  const markers = [
    'source-catalogue.json',
    'sourceGameVersion',
    'candidateFields',
    'research-only',
    'grantUpgrade',
    'firmwareKnowledge',
    'Missing firmware appearance',
    'getRandomValues',
    'node:crypto',
    'checkpoint12-host',
    'previous-observation',
  ];
  for (const file of files) {
    const script = await readFile(`${root}/${file}`, 'utf8');
    for (const marker of markers)
      assert.ok(!script.includes(marker), `${file} contains ${marker}`);
  }
  return { files, markers };
}

function instrumentPage() {
  const counters = (window.checkpoint12Counts = {
    buffers: 0,
    textures: 0,
    vertexArrays: 0,
    audioVoices: 0,
    audioStarted: 0,
    draws: 0,
    clears: 0,
  });
  const gl = WebGL2RenderingContext.prototype;
  for (const name of [
    'drawArrays',
    'drawElements',
    'drawArraysInstanced',
    'drawElementsInstanced',
  ]) {
    const draw = gl[name];
    gl[name] = function (...args) {
      counters.draws++;
      return draw.apply(this, args);
    };
  }
  const clear = gl.clear;
  gl.clear = function (...args) {
    counters.clears++;
    return clear.apply(this, args);
  };
  for (const [name, key] of [
    ['Buffer', 'buffers'],
    ['Texture', 'textures'],
    ['VertexArray', 'vertexArrays'],
  ]) {
    const create = gl[`create${name}`];
    const remove = gl[`delete${name}`];
    const active = new WeakSet();
    gl[`create${name}`] = function () {
      const value = create.call(this);
      if (value) {
        active.add(value);
        counters[key]++;
      }
      return value;
    };
    gl[`delete${name}`] = function (value) {
      if (active.delete(value)) counters[key]--;
      return remove.call(this, value);
    };
  }
  const createOscillator = AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator = function () {
    const oscillator = createOscillator.call(this);
    const start = oscillator.start;
    oscillator.start = function (...args) {
      start.apply(this, args);
      counters.audioVoices++;
      counters.audioStarted++;
      oscillator.addEventListener('ended', () => counters.audioVoices--, {
        once: true,
      });
    };
    return oscillator;
  };
}

const button = (client, name) =>
  client.page.getByRole('button', { name, exact: true });
const phase = (client, expected) =>
  until(() => client.state?.phase === expected, `Expected ${expected}`);
const own = (client) =>
  client.state.players.find((player) => player.id === client.playerId);

function eventFromFrame(payload) {
  if (typeof payload !== 'string' || !payload.startsWith('42')) return [];
  return JSON.parse(payload.slice(payload.indexOf('[')));
}

test(
  'production privacy and repeated match cleanup',
  { timeout: 240000, skip: !process.env.YCCE_RELIABILITY },
  async (t) => {
    await mkdir(output, { recursive: true });
    const evidence = {
      chunks: await inspectChunks(),
      privacy: {},
      cycles: [],
      recoverySamples: [],
      populatedRounds: [],
      loads: [],
      requests: [],
      errors: [],
    };
    const port = process.env.YCCE_RELIABILITY_PORT ?? '3268';
    const origin = `http://127.0.0.1:${port}`;
    const host = fork('build-host/server/index.js', [], {
      env: { ...process.env, HOST: '127.0.0.1', PORT: port, ORIGIN: origin },
      execArgv: [
        '--expose-gc',
        '--import',
        './tests/scenarios/checkpoint12-host.js',
      ],
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    const exited = once(host, 'exit');
    let hostLog = '';
    for (const stream of [host.stdout, host.stderr])
      stream.on('data', (data) => (hostLog += data));
    const contexts = [];
    let browser;
    let recording;
    t.after(async () => {
      if (host.exitCode === null && host.signalCode === null) {
        if (host.connected) host.disconnect();
        host.kill('SIGTERM');
      }
      await exited;
      for (const context of contexts) await context.close();
      if (recording) await recording.saveAs(resolve(output, 'rematch.webm'));
      await browser?.close();
      await writeFile(`${output}/host.log`, hostLog);
      await writeFile(
        `${output}/verification.json`,
        JSON.stringify(evidence, null, 2),
      );
    });
    await until(() => {
      if (host.exitCode !== null) assert.fail(hostLog);
      return hostLog.includes('Host listening');
    }, 'Production host started');
    let requestId = 0;
    function fixture(action, args) {
      const id = ++requestId;
      return new Promise((accept, reject) => {
        const timer = setTimeout(() => {
          host.off('message', receive);
          reject(Error(`Fixture timed out for ${action}`));
        }, 6000);
        function receive(reply) {
          if (reply.requestId !== id) return;
          host.off('message', receive);
          clearTimeout(timer);
          if (reply.error) reject(Error(reply.error));
          else accept(reply.value);
        }
        host.on('message', receive);
        host.send({ requestId: id, action, args });
      });
    }
    browser = await chromium.launch({
      ...(process.env.CHROME_PATH
        ? { executablePath: process.env.CHROME_PATH }
        : { channel: 'chrome' }),
      headless: true,
    });
    evidence.chrome = browser.version();
    const browserCDP = await browser.newBrowserCDPSession();
    const clients = [];
    for (const [index, name] of names.entries()) {
      const context = await browser.newContext({
        viewport,
        ...(index === 0
          ? { recordVideo: { dir: `${output}/raw`, size: viewport } }
          : {}),
      });
      contexts.push(context);
      await context.addInitScript(instrumentPage);
      if (index === 0)
        await context.addInitScript(() => {
          localStorage.setItem('ycce.presentation.v1', '{"muted":false}');
        });
      const page = await context.newPage();
      if (index === 0) recording = page.video();
      const client = {
        page,
        cdp: await context.newCDPSession(page),
        sockets: 0,
        states: [],
        content: null,
        transfer: [],
      };
      clients.push(client);
      page.on('requestfinished', (request) => {
        evidence.requests.push(request.url());
        client.transfer.push(
          request.sizes().then(({ responseBodySize }) => responseBodySize),
        );
      });
      page.on('pageerror', (error) => evidence.errors.push(error.message));
      page.on('websocket', (socket) => {
        client.sockets++;
        socket.on('framereceived', ({ payload }) => {
          const [event, body] = eventFromFrame(payload);
          if (event === 'session') client.playerId = body.playerId;
          if (event === 'content') client.content = body;
          if (event !== 'observation') return;
          client.states.push(body);
          if (client.states.length > 120) client.states.shift();
          if (
            !client.observation ||
            body.revision > client.observation.revision
          ) {
            client.observation = body;
            client.state = body.state;
          }
        });
      });
      const navigation = performance.now();
      await page.goto(origin);
      await page.getByText('Host connected', { exact: true }).waitFor();
      const coldTitleMs = performance.now() - navigation;
      assert.ok(coldTitleMs <= 10000);
      evidence.loads.push({ name, coldTitleMs });
      await page.getByLabel('Your display name').fill(name);
      await button(client, index === 0 ? 'Create a room' : 'Join room').click();
      await phase(client, 'lobby');
    }
    const [main, scout, concealed, observer] = clients;
    const playerIds = clients.map((client) => client.playerId);
    const matchId = main.observation.matchId;
    const rounds = new Set([main.state.roundId]);
    const forbiddenKeys = new Set([
      'seed',
      'rng',
      'roll',
      'effects',
      'effectHandler',
      'debugGrant',
      'candidateFields',
    ]);
    function assertPublic(body) {
      if (!body || typeof body !== 'object') return;
      for (const [key, value] of Object.entries(body)) {
        assert.ok(
          !forbiddenKeys.has(key),
          `Private key in wire payload: ${key}`,
        );
        assertPublic(value);
      }
    }
    for (const client of clients) {
      assert.ok(client.content.length > 0);
      assertPublic(client.content);
      assert.deepEqual(Object.keys(client.content[0]).sort(), [
        'description',
        'id',
        'maxRank',
        'name',
        'pool',
        'rarities',
      ]);
    }

    function assertCleanLobby(client) {
      const state = client.state;
      assert.equal(client.observation.matchId, matchId);
      assert.equal(state.phase, 'lobby');
      assert.equal(state.offer, null);
      assert.equal(state.result, null);
      assert.equal(state.countdown, null);
      assert.equal(state.progression.currency, 0);
      assert.deepEqual(state.progression.upgrades, []);
      assert.equal(state.progression.pending, 0);
      assert.equal(state.spectating, null);
      assert.equal(own(client).life.kind, 'alive');
      for (const key of [
        'projectiles',
        'trails',
        'bots',
        'resources',
        'firmware',
        'pointsOfInterest',
        'shelters',
        'radar',
        'feedback',
        'meteors',
        'nestDefenses',
      ])
        assert.deepEqual(state[key], [], `${key} was cleared`);
      assert.deepEqual(state.arena, { terrain: [], obstacles: [] });
      assert.ok(
        state.players.every(
          (player) => player.position.x === 0 && player.position.z === 0,
        ),
      );
      assertPublic(client.observation);
    }
    clients.forEach(assertCleanLobby);

    async function start() {
      for (const client of clients)
        await button(client, 'Ready to play').click();
      await button(main, 'Start match').click();
    }
    async function running() {
      for (const client of clients)
        await button(client, 'Ready to play').click();
      const requested = performance.now();
      await button(main, 'Start match').click();
      await Promise.all(clients.map((client) => phase(client, 'running')));
      await Promise.all(
        clients.map((client) =>
          client.page.locator('main.playing canvas').waitFor(),
        ),
      );
      const matchReadyMs = performance.now() - requested;
      assert.ok(matchReadyMs <= 15000);
      for (const [index, client] of clients.entries()) {
        const observed = evidence.loads[index];
        (observed.matchReadyMs ??= []).push(matchReadyMs);
        observed.initialBytes ??= (await Promise.all(client.transfer)).reduce(
          (total, bytes) => total + bytes,
          0,
        );
        assert.ok(observed.initialBytes <= 20 * MiB);
      }
    }
    async function rematch() {
      const previous = main.state.roundId;
      await button(main, 'Return everyone to lobby').click();
      await Promise.all(clients.map((client) => phase(client, 'lobby')));
      assert.ok(!rounds.has(main.state.roundId));
      rounds.add(main.state.roundId);
      for (const client of clients) {
        assert.equal(client.state.roundId, main.state.roundId);
        assert.notEqual(client.state.roundId, previous);
        assertCleanLobby(client);
      }
    }

    async function populateRound(cycle) {
      const resource = await fixture('objects', { playerId: main.playerId });
      await fixture('equipJetWithSpinnerets', { playerId: main.playerId });
      await main.page.bringToFront();
      await main.page.getByLabel('Match world').focus();
      const seen = {
        salvage: false,
        ally: false,
        projectile: false,
        field: false,
      };
      await main.page.keyboard.down('Space');
      try {
        await until(() => {
          seen.salvage ||= main.state.resources.some(
            (item) => item.id === resource,
          );
          seen.ally ||= main.state.bots.some(
            (bot) => bot.ownerId === main.playerId,
          );
          seen.projectile ||= main.state.projectiles.length > 0;
          seen.field ||= main.state.trails.some(
            (trail) => trail.kind === 'web',
          );
          return seen.salvage && seen.ally && seen.projectile && seen.field;
        }, `Cycle ${cycle} did not show salvage, ally, projectile, and field`);
      } catch (error) {
        evidence.errors.push(
          JSON.stringify({ cycle, seen, phase: main.state.phase }),
        );
        throw error;
      } finally {
        await main.page.keyboard.up('Space');
      }
      await fixture('offer', {
        playerId: scout.playerId,
        id: `round-${cycle}-offer`,
      });
      await until(
        () => scout.state.offer?.id === `round-${cycle}-offer`,
        'Pending offer reached its owner',
      );
      evidence.populatedRounds.push({
        cycle,
        roundId: main.state.roundId,
        ...seen,
        pendingOffer: true,
      });
      return main.state.roundId;
    }

    async function finishRound(cycle) {
      const roundId = await populateRound(cycle);
      await fixture('eliminate', playerIds.slice(1));
      await until(
        () => main.state.canFinishSurvivor,
        'Last survivor can finish without exposing eliminated craft',
      );
      await button(main, 'Finish match').click();
      await Promise.all(clients.map((client) => phase(client, 'finished')));
      assert.deepEqual(main.state.result?.outcome, {
        kind: 'winner',
        playerId: main.playerId,
      });
      assert.equal(main.state.roundId, roundId);
      await rematch();
      return roundId;
    }

    async function takeSample(cycle, endedRoundId, recoveryDisposals) {
      await delay(1200);
      const server = await fixture('sample');
      const tabs = [];
      for (const client of clients) {
        await client.cdp.send('HeapProfiler.collectGarbage');
        const lobbyRender = await client.page.evaluate(async () => {
          const { draws, clears } = window.checkpoint12Counts;
          await new Promise((painted) =>
            requestAnimationFrame(() => requestAnimationFrame(painted)),
          );
          return {
            draws: window.checkpoint12Counts.draws - draws,
            clears: window.checkpoint12Counts.clears - clears,
          };
        });
        assert.ok(
          lobbyRender.clears > 0,
          'The lobby canvas continued to render',
        );
        assert.equal(
          lobbyRender.draws,
          0,
          'The lobby drew no old world geometry',
        );
        tabs.push({
          ...(await client.cdp.send('Runtime.getHeapUsage')),
          ...(await client.cdp.send('Memory.getDOMCounters')),
          ...(await client.page.evaluate(() => window.checkpoint12Counts)),
          lobbyRender,
        });
      }
      const { processInfo } = await browserCDP.send(
        'SystemInfo.getProcessInfo',
      );
      const renderers = processInfo
        .filter(({ type }) => type === 'renderer')
        .map(({ id }) => id);
      assert.ok(renderers.length > 0);
      const rendererRss = execFileSync(
        'ps',
        ['-o', 'rss=', '-p', renderers.join(',')],
        { encoding: 'utf8' },
      )
        .trim()
        .split(/\s+/)
        .map((kb) => Number(kb) * 1024);
      assert.ok(rendererRss.length > 0 && rendererRss.every((rss) => rss > 0));
      const sample = {
        cycle,
        endedRoundId,
        lobbyRoundId: main.state.roundId,
        server,
        tabs,
        rendererRss,
      };
      const samples =
        recoveryDisposals === undefined
          ? evidence.cycles
          : evidence.recoverySamples;
      samples.push(sample);
      assert.equal(server.matches, 1);
      assert.equal(server.worlds, 1);
      assert.equal(server.reachableRetired, 0);
      assert.equal(
        server.disposed,
        recoveryDisposals ?? evidence.cycles.length,
      );
      assert.equal(server.sockets, clients.length);
      assert.ok(server.rss < 1024 * MiB);
      for (const rss of rendererRss) assert.ok(rss < 512 * MiB);
      for (const tab of tabs) assert.equal(tab.audioVoices, 0);
      const warm = evidence.cycles[0];
      assert.equal(server.pid, warm.server.pid);
      assert.ok(
        server.heapUsed +
          server.external -
          (warm.server.heapUsed + warm.server.external) <=
          10 * MiB,
        `Host retained memory after cycle ${cycle} stays within 10 MiB`,
      );
      assert.deepEqual(server.listeners, warm.server.listeners);
      assert.deepEqual(server.bodies, warm.server.bodies);
      for (const [index, tab] of tabs.entries()) {
        assert.equal(tab.jsEventListeners, warm.tabs[index].jsEventListeners);
        assert.equal(tab.documents, warm.tabs[index].documents);
      }
      return sample;
    }

    await running();
    await fixture('stage', playerIds);
    const resource = await fixture('objects', { playerId: concealed.playerId });
    await until(
      () => main.state.bots.some((bot) => bot.ownerId === concealed.playerId),
      'Visible ally includes a visible owner',
    );
    const allyId = main.state.bots.find(
      (bot) => bot.ownerId === concealed.playerId,
    ).id;
    await fixture('hit', {
      target: concealed.playerId,
      ownerId: main.playerId,
    });
    await until(
      () =>
        main.state.feedback.some(
          (event) => event.targetId === concealed.playerId,
        ),
      'Visible target has a feedback event',
    );
    await until(
      () =>
        main.page.evaluate(() => window.checkpoint12Counts.audioStarted > 0),
      'Authorized feedback plays a cue',
    );
    await fixture('visibility', {
      viewer: main.playerId,
      target: concealed.playerId,
      visible: false,
    });
    await fixture('visibility', {
      viewer: scout.playerId,
      target: concealed.playerId,
      visible: false,
    });
    await fixture('offer', { playerId: concealed.playerId, id: privacyMarker });
    await until(
      () => concealed.state.offer?.id === privacyMarker,
      'Private prompt reached its owner',
    );
    await until(
      () => main.state.bots.find((bot) => bot.id === allyId)?.ownerId === null,
      'Concealed ally owner is redacted',
    );
    assert.ok(!JSON.stringify(main.observation).includes(concealed.playerId));
    assert.ok(!JSON.stringify(main.observation).includes(privacyMarker));
    assert.ok(
      !main.state.feedback.some(
        (event) => event.targetId === concealed.playerId,
      ),
    );
    assert.deepEqual(main.observation.events, []);
    assert.ok(main.state.resources.some((item) => item.id === resource));
    const started = await main.page.evaluate(
      () => window.checkpoint12Counts.audioStarted,
    );
    const revision = main.observation.revision;
    await fixture('hit', {
      target: concealed.playerId,
      ownerId: main.playerId,
    });
    await until(
      () => main.observation.revision >= revision + 3,
      'New observations arrived after concealed feedback',
    );
    assert.equal(
      await main.page.evaluate(() => window.checkpoint12Counts.audioStarted),
      started,
    );

    const capsule = await fixture('firmware', { viewer: scout.playerId });
    await until(
      () =>
        scout.state.firmware.some(
          (item) => item.id === capsule && item.knowledge.kind === 'identified',
        ),
      'Scanner identifies a capsule',
    );
    assert.deepEqual(
      main.state.firmware.find((item) => item.id === capsule)?.knowledge,
      { kind: 'unknown' },
    );
    for (const hint of main.state.radar)
      assert.deepEqual(Object.keys(hint).sort(), [
        'direction',
        'distance',
        'kind',
      ]);
    assert.ok(main.state.radar.length > 0);

    await fixture('eliminate', [observer.playerId]);
    await until(
      () => observer.state.spectating === main.playerId,
      'Eliminated player follows the first survivor',
    );
    await observer.page.getByRole('heading', { name: 'Eliminated' }).waitFor();
    await button(observer, 'Follow Scout').click();
    await until(
      () => observer.state.spectating === scout.playerId,
      'Spectator switched to a visible survivor',
    );
    assert.deepEqual(
      observer.state.firmware.find((item) => item.id === capsule)?.knowledge,
      { kind: 'unknown' },
    );
    assert.equal(observer.state.thermal, null);
    assert.deepEqual(observer.state.firmwareSensory, {
      distortion: false,
      deafened: false,
    });
    assert.ok(
      !JSON.stringify(observer.observation).includes(concealed.playerId),
    );
    assert.ok(!JSON.stringify(observer.observation).includes(privacyMarker));
    assert.equal(await button(observer, 'Follow Concealed').count(), 0);
    await observer.page.screenshot({
      path: `${output}/restricted-spectator.png`,
    });

    const spectatorSocketCount = observer.sockets;
    await fixture('reconnect', { playerId: observer.playerId });
    await until(
      () => observer.sockets > spectatorSocketCount && own(observer).connected,
      'Spectator reconnected',
    );
    await until(
      () =>
        observer.state.spectating === scout.playerId &&
        own(observer).life.kind === 'eliminated',
      'Reconnect preserves the restricted follow state',
    );
    assert.ok(
      !JSON.stringify(observer.observation).includes(concealed.playerId),
    );
    assertPublic(observer.observation);
    const stale = structuredClone(main.observation);
    const warmup = await finishRound('warmup');
    await main.page
      .getByRole('heading', { name: 'A small crew. A wild world.' })
      .waitFor();
    await main.page.evaluate(() => {
      const root = document.querySelector('main');
      const probe = window.checkpoint12Counts;
      probe.staleRendered = false;
      const watcher = new MutationObserver(() => {
        if (root.classList.contains('playing')) probe.staleRendered = true;
      });
      watcher.observe(root, { attributes: true, attributeFilter: ['class'] });
      setTimeout(() => watcher.disconnect(), 500);
    });
    const staleCopies = () =>
      main.states.filter(
        ({ revision, state }) =>
          revision === stale.revision && state.roundId === stale.state.roundId,
      ).length;
    const priorCopies = staleCopies();
    await fixture('previous-observation', {
      playerId: main.playerId,
      observation: stale,
    });
    await until(
      () => staleCopies() > priorCopies,
      'Old packet reached the browser transport',
    );
    await main.page
      .getByRole('heading', { name: 'A small crew. A wild world.' })
      .waitFor();
    assert.equal(await main.page.locator('main.playing').count(), 0);
    assert.equal(
      await main.page.evaluate(() => window.checkpoint12Counts.staleRendered),
      false,
    );
    evidence.privacy = {
      hiddenAllyOwner: true,
      hiddenFeedback: true,
      hiddenAudio: true,
      privateOffer: true,
      privateFirmware: true,
      spectatorSwitch: true,
      spectatorReconnect: true,
      staleRevision: true,
    };
    await main.page.screenshot({ path: `${output}/fresh-lobby.png` });
    await takeSample('warmup', warmup);

    for (let cycle = 1; cycle <= 5; cycle++) {
      await running();
      await fixture('stage', playerIds);
      const ended = await finishRound(cycle);
      await takeSample(cycle, ended);
    }

    const loadingRound = main.state.roundId;
    await scout.page.route('**/fonts/InterVariable.woff2', (route) =>
      route.abort(),
    );
    await start();
    await until(
      () =>
        clients.every(
          (client) =>
            client.state.phase === 'lobby' && client.state.loadingError,
        ),
      'Failed asset load returned all clients to the lobby',
    );
    await scout.page.unroute('**/fonts/InterVariable.woff2');
    clients.forEach(assertCleanLobby);
    assert.equal(main.state.roundId, loadingRound);
    await takeSample('failed-load', null, evidence.cycles.length);
    evidence.failedLoad = true;
    await running();
    await fixture('stage', playerIds);
    const abortedRound = await populateRound('abort');
    await fixture('abort');
    await Promise.all(clients.map((client) => phase(client, 'aborted')));
    await rematch();
    await takeSample('abort', abortedRound, evidence.cycles.length + 1);
    evidence.abort = true;
    await running();
    await main.page.bringToFront();
    await main.page.getByLabel('Match world').focus();
    const before = { ...own(main).position };
    await main.page.keyboard.down('w');
    try {
      await until(
        () =>
          Math.hypot(
            own(main).position.x - before.x,
            own(main).position.z - before.z,
          ) > 1,
        'Normal browser controls move the craft after recovery',
      );
    } finally {
      await main.page.keyboard.up('w');
    }
    await fixture('stage', playerIds);
    const recoveredRound = await finishRound('after-recovery');
    await takeSample(
      'after-recovery',
      recoveredRound,
      evidence.cycles.length + 2,
    );
    evidence.playAfterRecovery = true;
    assert.deepEqual(
      clients.map((client) => client.sockets),
      [1, 1, 1, 2],
    );
    assert.deepEqual(evidence.errors, []);
    assert.ok(evidence.requests.every((url) => new URL(url).origin === origin));
  },
);
