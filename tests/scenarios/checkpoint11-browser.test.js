import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';
import { PerspectiveCamera, Vector3 } from 'three';
import { terrainAt } from '../../build-host/shared/arena.js';
import { observePresentation } from './checkpoint11-browser-probe.js';

const output = 'test-results/checkpoint11';
const preferenceKey = 'ycce.presentation.v1';
const title = 'You Can Crab Everything';
const laptop = { width: 1366, height: 768 };
const desktop = { width: 1920, height: 1080 };

async function until(read, description, timeout = 12000) {
  const end = Date.now() + timeout;
  do {
    const value = await read();
    if (value) return value;
    await delay(50);
  } while (Date.now() < end);
  assert.fail(description);
}

async function runJourney(t, port, name, seed) {
  await mkdir(output, { recursive: true });
  const origin = `http://127.0.0.1:${port}`;
  const host = fork('build-host/server/index.js', [], {
    env: {
      ...process.env,
      ...(seed === undefined ? {} : { PRESENTATION_MAP_SEED: String(seed) }),
      HOST: '127.0.0.1',
      PORT: String(port),
      ORIGIN: origin,
    },
    execArgv: ['--import', './tests/scenarios/checkpoint11-host.js'],
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  let hostLog = '';
  for (const stream of [host.stdout, host.stderr])
    stream.on('data', (data) => (hostLog += data));
  t.after(async () => {
    if (host.exitCode === null && host.signalCode === null) {
      if (host.connected) host.disconnect();
      host.kill('SIGTERM');
      await once(host, 'exit');
    }
    await writeFile(`${output}/${name}-host.log`, hostLog);
  });
  await until(() => {
    if (host.exitCode !== null) assert.fail(hostLog);
    return hostLog.includes('Host listening');
  }, 'Host did not start');
  const browser = await chromium.launch({
    ...(process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : { channel: 'chrome' }),
    headless: true,
  });
  const contexts = [];
  const evidence = {
    browser: browser.version(),
    requests: [],
    checks: {},
    errors: [],
  };
  const videos = [];
  t.after(async () => {
    for (const context of contexts) await context.close();
    for (const [video, path] of videos) await video.saveAs(path);
    await browser.close();
    await writeFile(
      `${output}/${name}.json`,
      JSON.stringify(evidence, null, 2),
    );
    assert.deepEqual(evidence.errors, [], 'Browser runtime errors');
    assert.ok(
      evidence.requests.every((request) => new URL(request).origin === origin),
      'Runtime requested an external asset',
    );
  });

  async function openPlayer({ viewport = laptop, record = false, init } = {}) {
    const context = await browser.newContext({
      viewport,
      ...(record
        ? { recordVideo: { dir: `${output}/raw`, size: viewport } }
        : {}),
    });
    contexts.push(context);
    if (init) await context.addInitScript(init);
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    if (record) videos.push([page.video(), resolve(output, `${name}.webm`)]);
    const client = {
      page,
      context,
      phases: new Set(),
      controls: [],
      frames: [],
      state: null,
      playerId: null,
    };
    page.on('pageerror', (error) => evidence.errors.push(error.message));
    page.on('request', (request) => {
      if (!evidence.requests.includes(request.url()))
        evidence.requests.push(request.url());
    });
    page.on('websocket', (socket) => {
      const parse = (payload) => {
        const data = typeof payload === 'string' ? payload : payload.toString();
        return data.startsWith('42')
          ? JSON.parse(data.slice(data.indexOf('[')))
          : [];
      };
      socket.on('framereceived', ({ payload }) => {
        const [event, body] = parse(payload);
        if (event === 'session') client.playerId = body.playerId;
        if (event === 'observation') {
          client.state = body.state;
          client.phases.add(body.state.phase);
          client.frames.push(body.state);
          if (client.frames.length > 300) client.frames.shift();
        }
      });
      socket.on('framesent', ({ payload }) => {
        const [event, body] = parse(payload);
        if (event === 'intent' && body.kind === 'control')
          client.controls.push(body);
      });
    });
    await page.goto(origin);
    return client;
  }

  function fixture(client, action, args) {
    return new Promise((accept, reject) => {
      const timer = setTimeout(() => {
        host.off('message', receive);
        reject(Error(`Fixture timed out: ${action}`));
      }, 5000);
      function receive(result) {
        clearTimeout(timer);
        if (result.error) reject(Error(result.error));
        else accept(result.value);
      }
      host.once('message', receive);
      host.send({
        kind: 'presentation',
        playerId: client.playerId,
        action,
        args,
      });
    });
  }

  return { openPlayer, fixture, evidence, host };
}

async function shot(client, name) {
  await client.page.screenshot({
    path: `${output}/${name}.png`,
    timeout: 10000,
  });
}
const button = (page, name) => page.getByRole('button', { name, exact: true });
const heading = (page, name) =>
  page.getByRole('heading', { name, exact: true });
const text = (page, name) => page.getByText(name, { exact: true });
const owner = (client) =>
  client.state?.players.find(({ id }) => id === client.playerId);
const phase = (client, kind) =>
  until(() => client.state?.phase === kind, `Expected ${kind}`);

async function join(client, name, create = false) {
  const { page } = client;
  await text(page, 'Host connected').waitFor();
  await page.getByLabel('Your display name').fill(name);
  await button(page, create ? 'Create a room' : 'Join room').click();
  await heading(page, 'A small crew. A wild world.').waitFor();
}

async function start(clients) {
  for (const { page } of clients) await button(page, 'Ready to play').click();
  await button(clients[0].page, 'Start match').click();
}

async function showSettings(page) {
  await page
    .locator('summary')
    .filter({ hasText: /^Settings and controls$/ })
    .click();
  await heading(page, 'Settings and controls').waitFor();
}

test(
  'presentation: first run, full lobby, load recovery, draw, and host loss',
  { timeout: 120000 },
  async (t) => {
    const { openPlayer, fixture, evidence, host } = await runJourney(
      t,
      3231,
      'menu',
    );
    const main = await openPlayer({ record: true });
    const { page } = main;
    await heading(page, title).waitFor();
    await text(page, 'Host connected').waitFor();
    await shot(main, '01-title-laptop');
    const titleBounds = await heading(page, title).boundingBox();
    const lineHeight = await heading(page, title).evaluate((element) =>
      parseFloat(getComputedStyle(element).lineHeight),
    );
    assert.ok(titleBounds.height > lineHeight * 1.5, 'Laptop title must wrap');
    await page.keyboard.press('Tab');
    assert.ok(
      await page.locator(':focus-visible').count(),
      'First Tab shows a keyboard focus indicator',
    );
    await join(main, 'Pilot', true);
    await text(page, 'First run? Controls and field guide').click();
    const guide = await page.locator('details.field-guide').innerText();
    assert.match(guide, /salvage/i);
    assert.match(guide, /boundary/i);
    await text(page, 'First run? Controls and field guide').click();
    const clients = [main];
    for (const name of ['Wing', 'Scout', 'Crew']) {
      const member = await openPlayer();
      await join(member, name);
      clients.push(member);
    }
    const visitor = await openPlayer({ viewport: desktop });
    await visitor.page.getByLabel('Your display name').fill('Visitor');
    await button(visitor.page, 'Full').waitFor();
    assert.equal(await button(visitor.page, 'Full').isDisabled(), true);
    await shot(visitor, '02-full-room-desktop');
    await shot(main, '03-four-seat-lobby');

    const font = '**/fonts/InterVariable.woff2';
    await clients[1].page.route(font, (route) =>
      route.fulfill({ status: 503, body: 'fixture asset unavailable' }),
    );
    await start(clients);
    await until(
      () =>
        clients.every(
          (client) =>
            client.state?.phase === 'lobby' && client.state.loadingError,
        ),
      'Failed load must return all clients to the lobby',
    );
    await page.locator('[role="alert"]').filter({ hasText: /load/i }).waitFor();
    await shot(main, '04-load-error');
    await clients[1].page.unroute(font);
    await start(clients);
    await heading(page, 'Ready for the wild.').waitFor();
    await shot(main, '05-countdown');
    await Promise.all(clients.map((client) => phase(client, 'running')));
    assert.ok(
      clients.every(
        ({ phases }) => phases.has('loading') && phases.has('countdown'),
      ),
    );
    await page
      .locator('summary')
      .filter({ hasText: /^Build, stats, and help$/ })
      .click();
    await heading(page, 'Your craft').waitFor();
    const stats = Object.values(owner(main).stats);
    assert.ok(stats.length > 5);
    assert.deepEqual(
      (await page.locator('.inspection dl dd').allInnerTexts()).map((value) =>
        Number(value.replace('%', '')),
      ),
      stats.map((value) => Number(value.toFixed(2))),
    );
    assert.equal(
      Number(
        await page.getByLabel('Hull', { exact: true }).getAttribute('max'),
      ),
      owner(main).stats.maximumHealth,
    );
    const matchingStats = stats.length;
    await shot(main, '29-current-stat-totals');
    assert.equal(owner(main).life.activity, 'playing');
    await page.keyboard.press('Escape');
    await fixture(
      main,
      'eliminate',
      clients.slice(2).map(({ playerId }) => playerId),
    );
    await heading(clients[2].page, 'Eliminated').waitFor();
    const spectator = clients[2];
    const target =
      spectator.state.spectating === main.playerId ? clients[1] : main;
    await button(spectator.page, `Follow ${owner(target).name}`).click();
    await until(
      () => spectator.state?.spectating === target.playerId,
      'Spectator target changed',
    );
    await shot(spectator, '06-spectating');
    await fixture(
      main,
      'eliminate',
      clients.slice(0, 2).map(({ playerId }) => playerId),
    );
    await heading(page, 'A shared ending.').waitFor();
    assert.equal(main.state.result.outcome.kind, 'draw');
    await text(page, 'Final builds').click();
    await shot(main, '07-draw-and-final-builds');
    await button(page, 'Return everyone to lobby').click();
    await heading(page, 'A small crew. A wild world.').waitFor();
    await visitor.page.route('**/socket.io/**', (route) => route.abort());
    await visitor.page.reload();
    await visitor.page.getByText(/Cannot reach the host/).waitFor();
    await visitor.page.getByLabel('Your display name').fill('Visitor');
    assert.equal(
      await button(visitor.page, 'Create a room').isDisabled(),
      true,
    );
    await shot(visitor, '08-unavailable-host');
    const hostExit = once(host, 'exit');
    host.disconnect();
    host.kill('SIGTERM');
    await hostExit;
    await page
      .getByRole('alert')
      .filter({
        hasText: /Connection to the host was lost|Cannot reach the host/,
      })
      .waitFor();
    evidence.checks = {
      phases: [...main.phases],
      matchingStats,
      guide,
      draw: main.frames.some((state) => state.result?.outcome.kind === 'draw'),
    };
  },
);

const nonzero = ({ x, y, buttons }) => x || y || buttons;
const canvasSize = (page) =>
  page.locator('canvas').evaluate((canvas) => {
    const { width, height } = canvas.getBoundingClientRect();
    const gl = canvas.getContext('webgl2');
    return {
      buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
      viewport: [width, height],
      pixelRatio: window.devicePixelRatio,
    };
  });
const savedPreferences = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key)), preferenceKey);

async function rebind(page, action, input) {
  await button(page, `Rebind ${action}`).click();
  await page
    .getByText(`Press a key or mouse button for ${action}.`, { exact: false })
    .waitFor();
  if (input === 'middle') {
    const bounds = await page.locator('.settings-body').boundingBox();
    await page.mouse.click(bounds.x + 12, bounds.y + 90, { button: 'middle' });
  } else await page.keyboard.press(input);
}

async function assertControl(client, input, expected) {
  const { page, controls } = client;
  const start = controls.length;
  if (input === 'middle') {
    await page.mouse.move(750, 355);
    await page.mouse.down({ button: 'middle' });
  } else await page.keyboard.down(input);
  await until(
    () =>
      controls
        .slice(start)
        .some((value) =>
          Object.entries(expected).every(
            ([field, match]) => value[field] === match,
          ),
        ),
    `Expected control for ${input}: ${JSON.stringify(expected)}`,
  );
  if (input === 'middle') await page.mouse.up({ button: 'middle' });
  else await page.keyboard.up(input);
  await until(
    () => controls.at(-1) && !nonzero(controls.at(-1)),
    `${input} did not release`,
  );
}

test(
  'presentation: laptop preferences, all bindings, and native desktop resolution',
  { timeout: 120000 },
  async (t) => {
    const { openPlayer, fixture, evidence } = await runJourney(
      t,
      3232,
      'settings',
    );
    const main = await openPlayer({ record: true, init: observePresentation });
    const { page } = main;
    await join(main, 'Controls', true);
    await start([main]);
    await phase(main, 'running');
    const point = await fixture(main, 'clear-point');
    await fixture(main, 'move', point);
    const initial = await canvasSize(page);
    assert.deepEqual(initial.buffer, [1366, 768]);
    assert.deepEqual(initial.viewport, [1366, 768]);
    assert.ok(
      (await page.evaluate(() => window.presentationProbe.draws)).calls > 0,
    );

    await page.locator('canvas').focus();
    await page.keyboard.down('w');
    await until(
      () => main.controls.at(-1)?.y === -1,
      'Default forward control',
    );
    await showSettings(page);
    await until(
      () => main.controls.at(-1)?.y === 0,
      'Settings must release held input',
    );
    await page.getByLabel('UI scale').selectOption('1.25');
    await page.getByLabel('Motion').selectOption('reduced');
    await page.getByLabel('Render scale').selectOption('0.75');
    await page.getByLabel('Show damage numbers').check();
    assert.equal(
      await page.locator('html').getAttribute('data-reduced-motion'),
      'true',
    );
    const scaled = await canvasSize(page);
    assert.deepEqual(scaled.viewport, initial.viewport);
    assert.deepEqual(scaled.buffer, [1024, 576]);
    assert.equal(await page.getByLabel('UI scale').inputValue(), '1.25');
    assert.equal(await page.getByLabel('Render scale').inputValue(), '0.75');
    await page.getByLabel('Quality').selectOption('balanced');
    const balanced = await canvasSize(page);
    assert.deepEqual(balanced.buffer, scaled.buffer);
    const settingsBox = await page.locator('.settings-body').boundingBox();
    assert.ok(settingsBox.y >= 0 && settingsBox.y + settingsBox.height <= 768);
    await shot(main, '09-scaled-accessibility-settings');

    const bindings = [
      ['Move forward', 'i', { y: -1 }],
      ['Move left', 'j', { x: -1 }],
      ['Move backward', 'k', { y: 1 }],
      ['Move right', 'l', { x: 1 }],
      ['Primary attack', 'f', { buttons: 1 }],
      ['Secondary attack', 'middle', { buttons: 2 }],
      ['Movement ability', 'u', { buttons: 4 }],
      ['Ultimate ability', 'o', { buttons: 8 }],
      ['Nearby interaction', 'p', { buttons: 16 }],
    ];
    const typingStart = main.controls.length;
    const controlsState = await page
      .locator('.settings')
      .evaluate((element) => ({
        open: element.open,
        inert: element.inert,
        labels: [...element.querySelectorAll('button')].map((item) =>
          item.getAttribute('aria-label'),
        ),
      }));
    assert.ok(
      controlsState.open && !controlsState.inert,
      JSON.stringify({
        controlsState,
        offer: main.state.offer,
      }),
    );
    assert.equal(
      await button(page, 'Rebind Move forward').count(),
      1,
      JSON.stringify(controlsState),
    );
    for (const [action, input] of bindings) await rebind(page, action, input);
    assert.ok(
      main.controls.slice(typingStart).every((value) => !nonzero(value)),
    );
    await rebind(page, 'Move forward', 'j');
    await page
      .getByText('J already controls Move left.', { exact: true })
      .waitFor();
    await button(page, 'Keep current bindings').click();
    assert.equal((await savedPreferences(page)).bindings.up, 'KeyI');
    await rebind(page, 'Move forward', 'j');
    await button(page, 'Swap bindings').click();
    assert.equal((await savedPreferences(page)).bindings.up, 'KeyJ');
    assert.equal((await savedPreferences(page)).bindings.left, 'KeyI');
    await rebind(page, 'Move forward', 'Escape');
    assert.equal((await savedPreferences(page)).bindings.up, 'KeyJ');
    await rebind(page, 'Move forward', 'Tab');
    assert.equal((await savedPreferences(page)).bindings.up, 'KeyJ');
    await button(page, 'Close').click();
    assert.equal(
      await page.locator(':focus').getAttribute('aria-label'),
      'Match world',
    );
    await page.keyboard.down('w');
    await delay(100);
    assert.equal(main.controls.at(-1)?.y, 0, 'Old held key must not resume');
    await page.keyboard.up('w');
    for (const [action, input, expected] of bindings) {
      await assertControl(
        main,
        action === 'Move forward' ? 'j' : action === 'Move left' ? 'i' : input,
        expected,
      );
    }
    await page.keyboard.down('j');
    await until(() => main.controls.at(-1)?.y === -1, 'Remapped input held');
    await page
      .locator('summary')
      .filter({ hasText: /^Settings and controls$/ })
      .focus();
    await until(
      () => main.controls.at(-1)?.y === 0,
      'Focusing an interactive control clears input',
    );
    await page.keyboard.up('j');

    const saved = await savedPreferences(page);
    assert.deepEqual(Object.keys(saved).sort(), [
      'bindings',
      'damageNumbers',
      'motion',
      'muted',
      'quality',
      'renderScale',
      'uiScale',
      'volume',
    ]);
    await page.reload();
    await phase(main, 'running');
    await until(
      () => main.controls.length > typingStart + 1 && owner(main)?.connected,
      'Session resumed',
    );
    await showSettings(page);
    for (const [label, expected] of [
      ['UI scale', '1.25'],
      ['Render scale', '0.75'],
      ['Quality', 'balanced'],
      ['Motion', 'reduced'],
    ])
      assert.equal(await page.getByLabel(label).inputValue(), expected);
    await button(page, 'Rebind Move forward')
      .locator('..')
      .locator('kbd')
      .getByText('J', { exact: true })
      .waitFor();
    assert.deepEqual(await savedPreferences(page), saved);
    await button(page, 'Reset controls').click();
    assert.equal((await savedPreferences(page)).bindings.up, 'KeyW');
    assert.equal((await savedPreferences(page)).bindings.primary, 'Mouse0');
    await button(page, 'Close').click();
    await assertControl(main, 'w', { y: -1 });
    await page.setViewportSize(desktop);
    await until(
      async () => (await canvasSize(page)).buffer[0] === 1440,
      'Desktop resize',
    );
    const desktopScaled = await canvasSize(page);
    assert.deepEqual(desktopScaled.buffer, [1440, 810]);
    await shot(main, '10-scaled-gameplay-desktop');

    const display = await page.context().newCDPSession(page);
    await display.send('Emulation.setDeviceMetricsOverride', {
      ...desktop,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await until(
      async () => (await canvasSize(page)).buffer[0] === 2880,
      'Display density change',
    );
    const scaled4k = await canvasSize(page);
    assert.deepEqual(scaled4k.buffer, [2880, 1620]);
    assert.deepEqual(scaled4k.viewport, desktopScaled.viewport);
    await showSettings(page);
    await page.getByLabel('Render scale').selectOption('1');
    await button(page, 'Close').click();
    await until(
      async () => (await canvasSize(page)).buffer[0] === 3840,
      'Native 4K',
    );
    const native4k = await canvasSize(page);
    assert.deepEqual(native4k.buffer, [3840, 2160]);
    assert.deepEqual(native4k.viewport, desktopScaled.viewport);
    await display.send('Emulation.clearDeviceMetricsOverride');
    await display.detach();
    await page.setViewportSize({ width: 3840, height: 2160 });
    const unscaled4k = await until(async () => {
      const size = await canvasSize(page);
      return (
        size.pixelRatio === 1 &&
        size.viewport[0] === 3840 &&
        size.buffer[0] === 3840 &&
        size
      );
    }, '4K viewport at standard pixel density');
    assert.deepEqual(unscaled4k.buffer, [3840, 2160]);
    assert.deepEqual(unscaled4k.viewport, [3840, 2160]);

    const brokenStorage = await openPlayer({
      init: () => {
        const getItem = Storage.prototype.getItem;
        const setItem = Storage.prototype.setItem;
        Storage.prototype.getItem = function (key) {
          if (this === localStorage)
            throw new Error('Fixture storage unavailable');
          return getItem.call(this, key);
        };
        Storage.prototype.setItem = function (key, value) {
          if (this === localStorage)
            throw new Error('Fixture storage unavailable');
          return setItem.call(this, key, value);
        };
      },
    });
    await showSettings(brokenStorage.page);
    await brokenStorage.page
      .getByText(/Saved settings could not load/)
      .waitFor();
    assert.equal(
      await brokenStorage.page.getByLabel('UI scale').inputValue(),
      '1',
    );
    await brokenStorage.page.getByLabel('UI scale').selectOption('1.1');
    await brokenStorage.page
      .getByText(/Browser storage is unavailable/)
      .waitFor();
    assert.equal(
      await brokenStorage.page.getByLabel('UI scale').inputValue(),
      '1.1',
    );
    evidence.checks = {
      initial,
      scaled,
      balanced,
      desktopScaled,
      scaled4k,
      native4k,
      unscaled4k,
      saved,
      actualBindingInputs: bindings.length,
      storageFailure: true,
    };
  },
);

const offerDialog = (page) => page.getByRole('dialog');
const offerState = (client, kind) =>
  until(
    () => client.state?.offer?.kind === kind && client.state.offer,
    `Expected a ${kind} offer`,
  );
const playing = (client) =>
  until(
    () => owner(client)?.life.activity === 'playing' && !client.state.offer,
    'Expected active play',
  );
const snapshot = (page) =>
  page.evaluate(() => ({
    draws: window.presentationProbe.draws,
    audio: window.presentationProbe.audio,
    active: window.presentationProbe.active,
    peak: window.presentationProbe.peaks,
    contexts: window.presentationProbe.recordings.map(
      ({ context }) => context.state,
    ),
  }));

async function simulateVisibility(page, hidden) {
  await page.evaluate((state) => {
    if (state)
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        value: true,
      });
    else delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

async function choose(client, choiceId, key = false) {
  const offer = client.state.offer;
  assert.ok(offer, 'Choice must have a current offer');
  const index = choiceId ? offer.choices.indexOf(choiceId) : 0;
  assert.ok(index >= 0, `Unavailable choice ${choiceId}`);
  const { page } = client;
  const dialog = offerDialog(page);
  await dialog.waitFor();
  if (key) {
    await dialog.focus();
    await page.keyboard.press(String(index + 1));
    await page.keyboard.press('Enter');
  } else {
    await dialog.locator('button.offer').nth(index).click();
    await button(dialog, 'Confirm selection').click();
  }
  await until(
    () => client.state.offer?.id !== offer.id,
    `The host did not close offer ${offer.kind}`,
  );
}

async function submitOutdatedChoice(page, revision) {
  await page.evaluate((outdated) => {
    const send = WebSocket.prototype.send;
    WebSocket.prototype.send = function (data) {
      if (typeof data === 'string' && /^42\d*\[/.test(data)) {
        const index = data.indexOf('[');
        const [name, intent] = JSON.parse(data.slice(index));
        if (name === 'intent' && intent.kind === 'choice') {
          WebSocket.prototype.send = send;
          return send.call(
            this,
            data.slice(0, index) +
              JSON.stringify([name, { ...intent, revision: outdated }]),
          );
        }
      }
      return send.call(this, data);
    };
  }, revision);
  await button(offerDialog(page), 'Confirm selection').click();
  await offerDialog(page)
    .getByRole('alert')
    .filter({
      hasText: 'The change was not confirmed',
    })
    .waitFor();
}

const modifier = (stat, add) => ({
  id: `presentation:${stat}`,
  stat,
  add,
  multiplier: 1,
});
const protection = [
  modifier('maximumHealth', 900),
  modifier('regeneration', 10),
  modifier('heatAdaptation', 200),
  modifier('coldAdaptation', 200),
  modifier('progressRequirement', 900),
];
async function protect(fixture, client, extra = []) {
  await fixture(client, 'modifiers', [...protection, ...extra]);
  await fixture(client, 'repair', 900);
}

const feedback = (client) => [
  ...new Map(
    client.frames.flatMap((state) =>
      state.feedback.map((event) => [event.id, event]),
    ),
  ).values(),
];

async function strike(client, point, buttonName = 'left') {
  const { page } = client;
  const craft = owner(client);
  const rect = await page.locator('canvas').boundingBox();
  const distance = Math.max(12, craft.radius * 12);
  const camera = new PerspectiveCamera(45, rect.width / rect.height, 0.1, 100);
  camera.position.set(
    craft.position.x,
    craft.position.y + distance,
    craft.position.z + distance,
  );
  camera.lookAt(craft.position.x, craft.position.y, craft.position.z);
  camera.updateMatrixWorld();
  const target = new Vector3(point.x, craft.position.y, point.z).project(
    camera,
  );
  await page.mouse.move(
    rect.x + ((target.x + 1) * rect.width) / 2,
    rect.y + ((1 - target.y) * rect.height) / 2,
  );
  await page.mouse.down({ button: buttonName });
  await delay(100);
  await page.mouse.up({ button: buttonName });
}

async function hitAfter(client, time, predicate, expectation) {
  return until(
    () =>
      feedback(client).find(
        (event) => event.at >= time && event.localAttacker && predicate(event),
      ),
    expectation,
    2400,
  );
}

test(
  'presentation: live growth, timed offers, equipment, audio, and finale',
  { timeout: 180000 },
  async (t) => {
    const { openPlayer, fixture, evidence } = await runJourney(
      t,
      3233,
      'match',
    );
    const main = await openPlayer({ record: true, init: observePresentation });
    const peer = await openPlayer({
      viewport: desktop,
      init: observePresentation,
    });
    const { page } = main;

    await join(main, 'Pilot', true);
    await join(peer, 'Scout');
    await start([main, peer]);
    await Promise.all([phase(main, 'running'), phase(peer, 'running')]);
    await page.bringToFront();
    await protect(fixture, main);
    await protect(fixture, peer);
    const point = await fixture(main, 'clear-point');
    await fixture(main, 'move', point);
    await fixture(peer, 'move', { x: point.x + 2.2, z: point.z });
    await until(
      () =>
        Math.hypot(
          owner(main).position.x - point.x,
          owner(main).position.z - point.z,
        ) < 0.75,
      'Player moved within test arena',
    );
    await shot(main, '11-starter-build');
    const early = owner(main);
    assert.ok(early.modules.every(({ kind }) => kind === 'jet'));
    const earlyCost = (await snapshot(page)).draws;
    assert.ok(earlyCost.calls > 0);

    const canvas = page.locator('canvas');
    await canvas.focus();
    await page.keyboard.down('d');
    await until(
      () => owner(main).position.x > early.position.x + 0.7,
      'Actual craft moves with the field guide control',
    );
    await page.keyboard.up('d');

    await page.waitForFunction(
      () => window.presentationProbe.recordings.length === 0,
    );
    await showSettings(page);
    await page.getByLabel('UI scale').selectOption('1.25');
    await page.getByLabel('Motion').selectOption('reduced');
    await page.getByLabel('Show damage numbers').check();
    await page.getByRole('slider', { name: /Master volume/ }).fill('0.45');
    assert.equal((await savedPreferences(page)).volume, 0.45);
    await page.getByLabel('Enable local cues').check();
    await until(
      async () => (await snapshot(page)).contexts.includes('running'),
      'Trusted gesture unlocks audio',
    );
    await button(page, 'Close').click();

    await fixture(peer, 'move', { x: point.x + 14, z: point.z });
    await until(
      () => Math.abs(owner(peer).position.x - owner(main).position.x) > 8,
      'Peer moved clear of the salvage',
    );
    const resource = await fixture(main, 'resource', {
      source: 'vegetation',
      rarity: 'common',
      repair: true,
    });
    const pickup = await until(
      () =>
        main.frames.find((state) =>
          state.feedback.some(
            (event) =>
              event.kind === 'salvage' && event.targetId === main.playerId,
          ),
        ),
      `Did not collect nearby resource ${resource}`,
    );
    assert.ok(pickup.progression.progress > 0);
    const collection = await fixture(main, 'collections');
    assert.ok(
      collection.some(
        ({ resourceId, playerId }) =>
          resourceId === resource && playerId === main.playerId,
      ),
    );
    await until(
      async () => (await snapshot(page)).audio.some(({ hz }) => hz === 560),
      'Pickup sound',
    );

    const bot = await fixture(main, 'bot-near', { distance: 1.35 });
    const currentBot = () => main.state.bots.find(({ id }) => id === bot.id);
    await until(() => {
      const craft = owner(main).position;
      return (
        currentBot() &&
        Math.hypot(
          currentBot().position.x - craft.x,
          currentBot().position.z - craft.z,
        ) < 2
      );
    }, 'Moving bot reached basic strike range');
    const contactTime = main.state.time;
    await strike(main, currentBot().position);
    const contact = await hitAfter(
      main,
      contactTime,
      (event) =>
        event.targetId === bot.id &&
        event.channel === 'contact' &&
        event.hull + event.plating > 0,
      'Manual basic strike reached a bot',
    );
    await page.getByLabel('Attack outcome').waitFor();
    await page
      .getByText(/(?:HULL HIT|PLATE HIT|PLATE BREAK) −\d+/)
      .first()
      .waitFor();
    await shot(main, '27-contact-bot-hit');
    await until(
      async () => (await snapshot(page)).audio.some(({ hz }) => hz === 210),
      'Authorized hit sound',
    );
    assert.ok(contact.hull || contact.plating);
    await page.getByLabel('Attack outcome').waitFor({ state: 'hidden' });

    await until(
      () => main.state.equipment.basicReadyAt <= main.state.time,
      'Basic strike is ready again',
    );
    const missTime = main.state.time;
    const missOrigin = owner(main).position;
    await strike(main, { x: missOrigin.x, z: missOrigin.z - 4 });
    await until(
      () => main.state.equipment.basicReadyAt > missTime,
      'Miss still starts the cooldown',
    );
    await delay(450);
    assert.ok(
      !feedback(main).some(
        (event) => event.at > missTime && event.localAttacker,
      ),
    );
    assert.equal(await page.getByLabel('Attack outcome').count(), 0);

    await fixture(main, 'grant', [
      ['arms', 'branching', 1],
      ['pincer', 'common', 1],
      ['saliva', 'common', 1],
      ['spit', 'rare', 1],
    ]);
    await until(
      () =>
        owner(main).modules.some(({ kind }) => kind === 'cannon') &&
        main.state.equipment.learned.some(({ id }) => id === 'pincer'),
      'Existing equipment shown in host view',
    );
    const projectileBot = await fixture(main, 'bot-near', { distance: 3.2 });
    await until(
      () =>
        main.state.bots.some(
          ({ id, position }) =>
            id === projectileBot.id &&
            Math.abs(position.z - owner(main).position.z - 3.2) < 0.5,
        ),
      'Projectile target within lane',
    );
    await until(
      () =>
        !main.state.equipment.learned.find(
          ({ id }) =>
            id === 'spit' &&
            main.state.time <
              main.state.equipment.learned.find((ability) => ability.id === id)
                .readyAt,
        ),
      'Spit is ready',
    );
    const projectileTime = main.state.time;
    await strike(
      main,
      main.state.bots.find(({ id }) => id === projectileBot.id).position,
      main.state.equipment.slots.primary === 'spit' ? 'left' : 'right',
    );
    const projectile = await hitAfter(
      main,
      projectileTime,
      (event) =>
        event.targetId === projectileBot.id &&
        event.channel === 'direct' &&
        event.hull + event.plating > 0,
      'Player projectile reached a bot',
    );
    assert.ok(
      main.frames.some(
        (state) => state.time >= projectileTime && state.projectiles.length > 0,
      ),
    );
    await shot(main, '28-projectile-bot-hit');

    if (main.state.offer) {
      await choose(main, undefined, true);
    }
    await playing(main);
    const target = peer.playerId;
    if (peer.state.offer) {
      await choose(peer, undefined, true);
    }
    await playing(peer);
    await fixture(peer, 'grant', [['plated', 'legendary', 1]]);
    await until(
      () => owner(peer).health.plating > 2,
      'Craft equipped fresh plating',
    );
    const near = owner(main).position;
    await fixture(peer, 'move', { x: near.x + 2, z: near.z });
    await until(
      () => main.state.players.some(({ id }) => id === target),
      'Armored target is visible',
    );
    const outcome = page.getByLabel('Attack outcome');
    async function direct(amount, kind, label) {
      const time = main.state.time;
      const results = await fixture(main, 'damage', [
        { targetId: target, channel: 'direct', amount },
      ]);
      assert.equal(
        results[0].plating > 0,
        kind !== 'blocked',
        `${label}: ${JSON.stringify(results[0])} with attacker and target activity ${owner(main).life.activity}, ${owner(peer).life.activity}`,
      );
      const event = await hitAfter(
        main,
        time,
        (entry) => entry.targetId === target && entry.kind === kind,
        label,
      );
      await outcome.filter({ hasText: label }).waitFor();
      return event;
    }
    const absorbed = await direct(2, 'plating', 'Plating absorbed');
    assert.ok(absorbed.plating > 0 && absorbed.hull === 0);
    await shot(main, '30-plating-absorbed');
    const broken = await direct(60, 'break', 'Plating broken');
    assert.ok(broken.plating > 0);

    await fixture(peer, 'progress');
    await offerState(peer, 'upgrade');
    const blocked = await direct(12, 'blocked', 'Blocked');
    assert.equal(blocked.plating + blocked.hull, 0);
    await shot(main, '31-blocked-hit');
    await choose(peer, undefined, true);
    await playing(peer);
    await protect(fixture, main, [modifier('poisonTickSpeed', 300)]);
    const corrosionOrigin = owner(main).position;
    await fixture(peer, 'move', {
      x: corrosionOrigin.x + 1.6,
      z: corrosionOrigin.z,
    });
    const poisonedAt = main.state.time;
    await fixture(main, 'status', {
      target,
      status: { kind: 'corrosion', magnitude: 8, duration: 4200 },
    });
    let recentCorrosion = [];
    const ticks = await until(
      () => {
        recentCorrosion = feedback(main).filter(
          (event) =>
            event.targetId === target &&
            event.channel === 'corrosion' &&
            event.at > poisonedAt,
        );
        const hits = recentCorrosion.filter(({ hull }) => hull > 0);
        return hits.length >= 2 && hits;
      },
      'Two distinct authoritative corrosion ticks',
      5000,
    ).catch((error) => {
      error.message += ` with ${JSON.stringify(recentCorrosion.slice(-4))} and ${JSON.stringify(owner(peer).statuses)}`;
      throw error;
    });
    assert.equal(await outcome.count(), 1);
    await shot(main, '32-corrosion-ticks');
    await until(
      () => owner(peer).statuses.every(({ kind }) => kind !== 'corrosion'),
      'Staged corrosion expires',
    );
    await protect(fixture, main);

    await showSettings(page);
    await page.getByLabel('Enable local cues').uncheck();
    await page.getByLabel('Show damage numbers').uncheck();
    await button(page, 'Close').click();
    const mutedStarts = (await snapshot(page)).audio.length;
    const abilitiesRect = await page
      .getByLabel('Abilities', { exact: true })
      .boundingBox();
    const settingsRect = await page.locator('.settings summary').boundingBox();
    assert.ok(
      abilitiesRect.x + abilitiesRect.width <= settingsRect.x ||
        abilitiesRect.y + abilitiesRect.height <= settingsRect.y,
    );
    const lethalBot = await fixture(main, 'bot-near', { distance: 1.5 });
    const lethalAt = main.state.time;
    await fixture(main, 'damage', [
      { targetId: lethalBot.id, channel: 'direct', amount: 10_000 },
    ]);
    const lethal = await hitAfter(
      main,
      lethalAt,
      (event) => event.targetId === lethalBot.id && event.lethal,
      'Actual bot elimination',
    );
    await outcome.filter({ hasText: 'Target eliminated' }).waitFor();
    await shot(main, '33-muted-reduced-motion-lethal');
    assert.equal((await snapshot(page)).audio.length, mutedStarts);
    await showSettings(page);
    await page.getByLabel('Enable local cues').check();
    await button(page, 'Close').click();

    const alternateTab = await main.context.newPage();
    await alternateTab.bringToFront();
    const emulatedVisibility = !(await page.evaluate(() => document.hidden));
    if (emulatedVisibility) await simulateVisibility(page, true);
    await until(
      async () => (await snapshot(page)).contexts.includes('suspended'),
      'Background tab suspends the audio context',
    );
    const backgroundCount = (await snapshot(page)).audio.length;
    await fixture(main, 'resource', { source: 'vegetation', rarity: 'common' });
    await delay(500);
    assert.equal((await snapshot(page)).audio.length, backgroundCount);
    await page.bringToFront();
    if (emulatedVisibility) await simulateVisibility(page, false);
    assert.deepEqual((await snapshot(page)).contexts, ['suspended']);
    await page.keyboard.press('Shift');
    await until(
      async () => (await snapshot(page)).contexts.includes('running'),
      'Foreground audio waits for a new gesture',
    );
    assert.equal((await snapshot(page)).audio.length, backgroundCount);
    await alternateTab.close();

    await fixture(main, 'grant', [
      ['leech', 'rare', 1],
      ['leech', 'rare', 2],
      ['leech', 'rare', 3],
    ]);
    await offerState(main, 'specialization');
    await heading(page, 'Choose a specialization.').waitFor();
    await shot(main, '15-specialization-and-skip');
    const currency = main.state.progression.currency;
    await choose(main, 'skip');
    await until(
      () => main.state.progression.currency === currency + 10,
      'Skip grants currency',
    );
    await playing(main);

    await fixture(main, 'currency', 200);
    if (!main.state.offer) await fixture(main, 'common-offer');
    let offer = await offerState(main, 'upgrade');
    const rarities = new Set();
    const rarityFrames = [];
    for (let step = 0; step < 5; step++) {
      await offerDialog(page).waitFor();
      await page.waitForFunction(
        (rarity) =>
          [...document.querySelectorAll('article.offer-column')]
            .map((element) => element.dataset.rarity)
            .join() === rarity.join(),
        offer.details.map(({ rarity }) => rarity),
      );
      for (const { rarity } of offer.details) rarities.add(rarity);
      const badges = await offerDialog(page)
        .locator('article .rarity-badge')
        .evaluateAll((items) =>
          items.map((element) => ({
            text: element.textContent.trim(),
            color: getComputedStyle(element).borderTopColor,
            style: getComputedStyle(element).borderTopStyle,
            radius: getComputedStyle(element).borderTopLeftRadius,
          })),
        );
      rarityFrames.push({ revision: offer.revision, badges });
      if (step === 0) await shot(main, '12-first-upgrade');
      if (
        rarities.has('legendary') &&
        rarities.has('epic') &&
        rarities.has('common') &&
        rarities.has('rare')
      )
        break;
      const raise = offerDialog(page).getByRole('button', {
        name: /^Raise rarity/,
      });
      if (!(await raise.count()) || (await raise.isDisabled())) break;
      const before = offer.revision;
      await raise.click();
      offer = await until(
        () => main.state.offer?.revision > before && main.state.offer,
        'Rarity purchase must advance revision',
      );
    }
    assert.deepEqual([...rarities].sort(), [
      'common',
      'epic',
      'legendary',
      'rare',
    ]);
    await page.evaluate(() => (document.body.style.filter = 'grayscale(1)'));
    await shot(main, '13-grayscale-rarity');
    await page.evaluate(() => document.body.style.removeProperty('filter'));

    const equipment = await until(
      () => main.state?.equipment,
      'Learned equipment',
    );
    const oldPrimary = equipment.slots.primary;
    const oldSecondary = equipment.slots.secondary;
    assert.ok(oldPrimary && oldSecondary && oldPrimary !== oldSecondary);
    await text(offerDialog(page), 'Arrange learned abilities').click();
    await offerDialog(page)
      .getByLabel('Replace primary')
      .selectOption(oldSecondary);
    await offerDialog(page)
      .getByText(/It stays learned/)
      .waitFor();
    const oldOffer = main.state.offer;
    await button(offerDialog(page), 'Apply slot change').click();
    await until(
      () =>
        main.state.equipment.slots.primary === oldSecondary &&
        main.state.offer?.revision > oldOffer.revision,
      'Host applied occupied slot replacement',
    );
    assert.ok(main.state.equipment.learned.some(({ id }) => id === oldPrimary));
    assert.equal(main.state.offer.deadline, oldOffer.deadline);
    await offerDialog(page).locator('button.offer').first().click();
    const buildBefore = main.state.equipment.slots;
    await submitOutdatedChoice(page, oldOffer.revision);
    assert.deepEqual(main.state.equipment.slots, buildBefore);
    assert.equal(main.state.offer.deadline, oldOffer.deadline);
    await shot(main, '34-outdated-choice-recovery');
    await text(offerDialog(page), 'Arrange learned abilities').click();
    await shot(main, '14-equipment');
    await choose(main, undefined, true);
    await until(
      async () => (await snapshot(page)).audio.some(({ hz }) => hz === 480),
      'Confirmed-upgrade audio',
    );
    await playing(main);

    await fixture(main, 'level', 11);
    await fixture(main, 'progress');
    await offerState(main, 'upgrade');
    assert.equal(main.state.offer.pool, 'branching');
    await heading(page, 'Choose a new branch.').waitFor();
    await shot(main, '16-branching');
    await choose(main);
    await playing(main);

    await fixture(main, 'progress');
    const expiring = await offerState(main, 'upgrade');
    const remainingAtOpen = expiring.deadline - main.state.time;
    assert.ok(remainingAtOpen > 19000 && remainingAtOpen <= 20000);
    await fixture(main, 'progress');
    await until(() => main.state.offer?.queued > 0, 'Another offer is queued');
    await offerDialog(page)
      .getByText(/queued/i)
      .first()
      .waitFor();
    await until(
      () => main.state.time >= expiring.deadline - 9000,
      'Past the old ten-second deadline',
    );
    assert.equal(main.state.offer?.id, expiring.id);
    await until(
      () => main.state.offer?.id !== expiring.id,
      'The server expires a displayed upgrade',
      14000,
    );
    const next = await offerState(main, 'upgrade');
    assert.notEqual(next.id, expiring.id);
    assert.ok(next.deadline > expiring.deadline);
    await choose(main, undefined, true);
    await playing(main);

    await fixture(main, 'rain');
    const grass = await fixture(main, 'clear-biome', 'grass');
    await fixture(main, 'move', grass);
    await fixture(peer, 'move', { x: grass.x + 1.4, z: grass.z });
    const dayBots = await fixture(main, 'cluster', { origin: grass, reach: 2 });
    assert.ok(dayBots.length >= 2);
    await until(() => {
      const { x, z } = owner(main).position;
      return (
        terrainAt(main.state.arena, x, z) === 'grass' &&
        main.state.weather.some(
          ({ biome, state }) => biome === 'grass' && state === 'active',
        )
      );
    }, 'Projected grass rain at the local craft').catch((error) => {
      error.message += ` at ${main.state.time} ms with ${JSON.stringify(main.state.weather)}`;
      throw error;
    });
    await page
      .locator('.warnings')
      .getByText(/Rain\s+active/i)
      .waitFor();
    await shot(main, '38-crowded-rain-day');
    const rainCost = (await snapshot(page)).draws;

    await fixture(main, 'clock', main.state.boundary.shrinkStartMs - 5000);
    await until(
      async () => (await snapshot(page)).audio.some(({ hz }) => hz === 740),
      'Urgent warning audio',
    );
    const clustered = await fixture(main, 'cluster', {
      origin: { x: 0, z: 0 },
      reach: 2.1,
    });
    await fixture(main, 'short-day');
    await fixture(main, 'shift-time', 10000);
    await until(
      () => main.state.worldClock.phase === 'night',
      'Natural phase transition on shortened test day',
    );
    await fixture(main, 'move', { x: 0, z: 0 });
    await fixture(peer, 'move', { x: 1.7, z: 0 });
    await until(
      () => Math.hypot(owner(main).position.x, owner(main).position.z) < 0.75,
      'Player moved near center',
    );
    assert.ok(clustered.length > 1, 'Expected multiple combat silhouettes');
    await fixture(main, 'cluster', { reach: 2.1 });
    await fixture(main, 'progress');
    await offerState(main, 'upgrade');
    await offerDialog(page)
      .getByText(/Boundary closes in|Boundary closing/)
      .waitFor();
    const beforeScroll = await offerDialog(page)
      .locator('.sticky-notice')
      .boundingBox();
    await offerDialog(page).evaluate((view) =>
      view.scrollTo(0, view.scrollHeight),
    );
    const afterScroll = await offerDialog(page)
      .locator('.sticky-notice')
      .boundingBox();
    assert.ok(afterScroll.y < 50 && afterScroll.y <= beforeScroll.y);
    await shot(main, '17-timed-choice-night-warning');
    await choose(main, undefined, true);
    await playing(main);
    await shot(main, '18-low-night-combat');
    const low = (await snapshot(page)).draws;
    assert.ok(main.state.players.some(({ id }) => id === peer.playerId));
    await fixture(peer, 'move', { x: 28, z: 0 });
    await until(
      () => !main.state.players.some(({ id }) => id === peer.playerId),
      'Night sight excludes the distant peer on low quality',
    );
    await showSettings(page);
    await page.getByLabel('Quality').selectOption('balanced');
    await button(page, 'Close').click();
    assert.ok(!main.state.players.some(({ id }) => id === peer.playerId));
    if (peer.state.offer) await choose(peer, undefined, true);
    await playing(peer);
    await playing(main);
    const unviewedAt = main.state.time;
    const unviewedAudio = (await snapshot(page)).audio.filter(
      ({ hz }) => hz === 210,
    ).length;
    const hiddenDamage = await fixture(main, 'damage', [
      { targetId: peer.playerId, channel: 'corrosion', amount: 15 },
    ]);
    assert.ok(
      hiddenDamage[0].hull > 0,
      `Positive hidden hull damage, got ${JSON.stringify(hiddenDamage[0])}`,
    );
    await delay(300);
    assert.ok(
      !feedback(main).some(
        (event) => event.targetId === peer.playerId && event.at > unviewedAt,
      ),
    );
    assert.equal(
      (await snapshot(page)).audio.filter(({ hz }) => hz === 210).length,
      unviewedAudio,
    );
    await fixture(peer, 'move', { x: 1.7, z: 0 });
    await until(
      () => main.state.players.some(({ id }) => id === peer.playerId),
      'Nearby player remains visible on balanced quality',
    );
    await shot(main, '19-balanced-night-combat');
    const balanced = (await snapshot(page)).draws;
    assert.ok(low.calls > 0 && balanced.calls > 0);
    const compactOrigin = owner(main).position;
    await protect(fixture, main, [modifier('size', -1000)]);
    const minimum = await until(
      () => owner(main).radius < 0.25 && owner(main).radius,
      'Minimum supported hull radius',
    );
    await fixture(main, 'move', compactOrigin);
    await shot(main, '35-minimum-hull');
    await protect(fixture, main, [modifier('size', 1000)]);
    const maximum = await until(
      () => owner(main).radius >= 1.49 && owner(main).radius,
      'Maximum supported hull radius',
    );
    await fixture(main, 'move', compactOrigin);
    await shot(main, '36-maximum-hull');
    await protect(fixture, main);

    await fixture(main, 'clock', main.state.boundary.collapseAtMs - 180000);
    await until(() => main.state.boundary.radius <= 3.01, 'Final circle');
    await shot(main, '20-final-area');
    const finalSounds = await snapshot(page);
    const audioBytes = await page.evaluate(() =>
      window.presentationProbe.recordings[0].stop(),
    );
    assert.ok(audioBytes.length > 0);
    await writeFile(`${output}/match-cues.webm`, new Uint8Array(audioBytes));
    await fixture(main, 'clock', main.state.boundary.collapseAtMs - 2000);
    await fixture(main, 'modifiers', []);
    await fixture(peer, 'modifiers', []);
    await until(
      () => main.state.phase === 'finished',
      'Collapse resolves the match',
      45000,
    );
    await page.getByRole('heading', { name: 'Round summary' }).waitFor();
    await shot(main, '21-results');
    const previous = main.state.roundId;
    await button(page, 'Return everyone to lobby').click();
    await Promise.all([phase(main, 'lobby'), phase(peer, 'lobby')]);
    await start([main, peer]);
    await Promise.all([phase(main, 'running'), phase(peer, 'running')]);
    assert.notEqual(main.state.roundId, previous);
    assert.deepEqual(owner(main).modules, early.modules);
    assert.ok(finalSounds.peak > 0 && finalSounds.peak <= 6);
    evidence.checks = {
      earlyCost,
      rainCost,
      contact,
      projectile,
      missTime,
      absorbed,
      broken,
      blocked,
      ticks,
      lethal,
      mutedStarts,
      backgroundCount,
      emulatedVisibility,
      minimum,
      maximum,
      queuedAndExpired: true,
      remainingAtOpen,
      outdatedChoiceRejected: true,
      nightQualityVisibility: true,
      low,
      balanced,
      rarityFrames,
      finalSounds,
      oldPrimary,
      oldSecondary,
      rematch: true,
    };
  },
);

const claimRegion = (page, site) =>
  page.getByRole('region', {
    name: site.kind.replaceAll('-', ' '),
    exact: true,
  });
const siteButton = (client, site) =>
  claimRegion(client.page, site).getByRole('button', {
    name: /Review rewards/,
  });
const firmwareRegion = (client, module) =>
  client.page
    .getByRole('region', { name: `Firmware ${module.appearance}`, exact: true })
    .first();

test(
  'presentation: contested sites, private firmware, and shelter expiry',
  { timeout: 120000 },
  async (t) => {
    const { openPlayer, fixture, evidence } = await runJourney(
      t,
      3234,
      'interactions',
      1,
    );
    const main = await openPlayer({ record: true });
    const peer = await openPlayer({ viewport: desktop });
    await join(main, 'Pilot', true);
    await join(peer, 'Scout');
    await start([main, peer]);
    await Promise.all([phase(main, 'running'), phase(peer, 'running')]);
    await protect(fixture, main, [modifier('firmwareIdentification', 100)]);
    await protect(fixture, peer, [modifier('firmwareIdentification', -100)]);
    const site = await fixture(main, 'site');
    await fixture(peer, 'move', {
      x: site.position.x + 1.2,
      z: site.position.z,
    });
    await Promise.all([
      siteButton(main, site).waitFor(),
      siteButton(peer, site).waitFor(),
    ]);
    await Promise.all(
      [main, peer].map(({ page }) => page.locator('canvas').focus()),
    );
    await Promise.all(
      [main, peer].map(({ page }) => page.keyboard.press('e', { delay: 100 })),
    );
    const winner = await until(
      () => [main, peer].find((client) => client.state.offer?.kind === 'poi'),
      'No player received a reservation',
    );
    const runnerUp = winner === main ? peer : main;
    await offerDialog(winner.page)
      .getByText(/Discovery does not reserve or grant/)
      .waitFor();
    await claimRegion(runnerUp.page, site)
      .getByText(/Reserved by another player/)
      .waitFor();
    assert.equal(
      await button(claimRegion(runnerUp.page, site), 'Reserved').isDisabled(),
      true,
    );
    assert.equal(runnerUp.state.offer, null);
    await shot(winner, '22-reservation-winner');
    await shot(runnerUp, '23-reservation-contested');

    await winner.context.setOffline(true);
    await runnerUp.page.bringToFront();
    const reopened = await until(
      () =>
        runnerUp.state.pointsOfInterest.find(
          ({ id, status }) => id === site.id && status === 'available',
        ),
      'Disconnected claimant releases its reservation',
      35000,
    );
    assert.equal(reopened.discovered, true);
    await siteButton(runnerUp, site).click();
    const award = await offerState(runnerUp, 'poi');
    const awardOption = award.poiOptions.find(
      ({ id, unavailableReason }) => id !== 'cancel' && !unavailableReason,
    );
    assert.ok(awardOption, JSON.stringify(award.poiOptions));
    await choose(runnerUp, awardOption.id);
    await until(
      () =>
        runnerUp.state.pointsOfInterest.find(
          ({ id, status }) => id === site.id && status === 'claimed',
        ),
      'Claim changed shared site status',
    );
    await winner.context.setOffline(false);
    await until(() => owner(winner)?.connected, 'Claimant reconnected');

    await showSettings(main.page);
    await rebind(main.page, 'Nearby interaction', 'p');
    await button(main.page, 'Close').click();
    const matrix = await fixture(main, 'site-matrix', site.id);
    assert.equal(matrix.length, 12);
    const rewardKinds = new Set();
    for (const entry of matrix) {
      await fixture(main, 'move', entry.position);
      const priced = entry.options.find(
        ({ reward }) => reward.kind === 'upgrade',
      );
      if (priced) await fixture(main, 'currency', 20);
      const action = siteButton(main, entry);
      await action.getByText(/Review rewards · P/).waitFor();
      await action.click();
      const prompt = await offerState(main, 'poi');
      assert.equal(prompt.site.id, entry.id);
      const modal = offerDialog(main.page);
      for (const [index, option] of entry.options.entries()) {
        rewardKinds.add(option.reward.kind);
        const card = modal.locator('button.offer').nth(index);
        const remaining = prompt.poiOptions[index];
        assert.equal(await card.isDisabled(), !!remaining.unavailableReason);
        if (option.reward.kind === 'upgrade') {
          assert.match(
            await card.innerText(),
            new RegExp(`Cost ${option.reward.cost} currency`),
          );
        } else {
          assert.ok(
            (await card.innerText()).includes(option.label),
            option.label,
          );
        }
      }
      if (priced) {
        const optionIndex = prompt.choices.indexOf(priced.id);
        const price = modal.locator('button.offer').nth(optionIndex);
        assert.equal(await price.isEnabled(), true);
        await fixture(main, 'spend', main.state.progression.currency);
        await until(
          () =>
            main.state.offer?.poiOptions.find(({ id }) => id === priced.id)
              ?.unavailableReason,
          'Host reports loss of eligibility while reserved',
        );
        await price.getByText(/Cost/).first().waitFor();
        await until(
          () => price.isDisabled(),
          'Purchase disables after balance changes',
        );
        await shot(main, '37-ineligible-site-reward');
      }
      await choose(main, 'cancel', true);
      await playing(main);
    }
    assert.deepEqual([...rewardKinds].sort(), [
      'adaptation',
      'clock',
      'currency',
      'defend-nest',
      'firmware-spawn',
      'nest-salvage',
      'progress',
      'random-stat',
      'recruit',
      'repair',
      'stat',
      'temporary-resistance',
      'upgrade',
    ]);
    evidence.checks.rewardKinds = [...rewardKinds].sort();

    const module = await fixture(main, 'firmware');
    await fixture(peer, 'approach', module.position);
    await until(() => {
      const item = peer.state.firmware.find(({ id }) => id === module.id);
      const { x, z } = owner(peer).position;
      return (
        item && Math.hypot(x - module.position.x, z - module.position.z) < 3
      );
    }, 'Second player reaches the same firmware');
    await firmwareRegion(main, module)
      .getByText(/Identified for you/)
      .waitFor();
    await firmwareRegion(peer, module)
      .getByText(/Effect unknown/)
      .waitFor();
    const privateKnowledge = main.state.firmware.find(
      ({ id }) => id === module.id,
    ).knowledge;
    assert.equal(privateKnowledge.kind, 'identified');
    const otherKnowledge = peer.state.firmware.find(
      ({ id }) => id === module.id,
    ).knowledge;
    assert.equal(Object.hasOwn(otherKnowledge, 'effect'), false);
    await shot(main, '24-private-firmware-identified');
    await shot(peer, '25-private-firmware-unknown');

    await firmwareRegion(main, module)
      .getByRole('button', { name: /^Consume identified/ })
      .click();
    await until(
      () =>
        main.state.firmware.find(
          ({ id, consumption }) => id === module.id && consumption === 'yours',
        ),
      'Firmware consumption started',
    );
    await firmwareRegion(peer, module)
      .getByText('Another player is consuming it.', { exact: false })
      .waitFor();
    assert.equal(
      await button(firmwareRegion(peer, module), 'In use').isDisabled(),
      true,
    );
    await until(
      () => main.state.lastFirmware?.effect === privateKnowledge.effect,
      'Only the consumer applied the firmware',
    );
    assert.equal(peer.state.lastFirmware, null);

    const shelter = await fixture(peer, 'shelter');
    const shelter = peer.page.getByRole('region', { name: 'Shelter' });
    await shelter.getByText(/entry lasts about/).waitFor();
    await shelter.getByRole('button', { name: /^Enter shelter/ }).click();
    await until(
      () => owner(peer).shelter?.id === shelter.id,
      'Player entered the burrow',
    );
    await shelter.getByText(/Forced exit in/).waitFor();
    await fixture(peer, 'clock', peer.state.boundary.collapseAtMs - 60000);
    await peer.page
      .locator('.warnings')
      .getByText(/Boundary closing/i)
      .waitFor();
    const inShelter = owner(peer);
    const lifetimeMs = inShelter.shelter.until - peer.state.time;
    await shot(peer, '26-burrow-warning');
    await until(
      () =>
        owner(peer).health.hull < inShelter.health.hull && owner(peer).shelter,
      'Boundary damages the player before burrow expires',
    );
    await until(
      () => !owner(peer).shelter,
      'Finite burrow forces the player out',
    );
    assert.ok(
      !peer.state.shelters.some(({ id }) => id === shelter.id),
      'Exhausted burrow is removed',
    );
    Object.assign(evidence.checks, {
      contestedSite: site.kind,
      claimOption: awardOption.id,
      privateKnowledge: privateKnowledge.kind,
      peerKnowledge: otherKnowledge.kind,
      burrowLifetimeMs: lifetimeMs,
    });
  },
);
