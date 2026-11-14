import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, rename } from 'node:fs/promises';
import { Server } from 'socket.io';
import { chromium } from 'playwright-core';
import RAPIER from '@dimforge/rapier3d-compat';
import { Match } from '../../build-host/server/match/match.js';
import { IntentQueue } from '../../build-host/server/network/intents.js';
import { SelectionWindow } from '../../build-host/server/match/selection-window.js';

await RAPIER.init();

test(
  'integrated movement, aiming, focus loss and timed choice',
  { timeout: 45000, skip: !process.env.YCCE_FIXTURE_URL },
  async () => {
    const match = new Match('course', new RAPIER.World({ x: 0, y: 0, z: 0 }));
    match.accept({ kind: 'join', playerId: 'pilot' });
    match.accept({ kind: 'join', playerId: 'other' });
    match.accept({ kind: 'start' });
    const queue = new IntentQueue();
    const selection = new SelectionWindow(() => 0.5);
    const start = performance.now();
    const http = createServer();
    const io = new Server(http, { cors: { origin: '*' } });
    await new Promise((resolve) => http.listen(0, '127.0.0.1', resolve));
    const address = http.address();
    const host = `http://127.0.0.1:${address.port}`;
    let revision = 0,
      outcome = '',
      otherSequence = 0,
      lastPilotControl = null;
    const pending = new Set();
    function delayed(callback, delay = 50) {
      const timer = setTimeout(() => {
        pending.delete(timer);
        callback();
      }, delay);
      pending.add(timer);
    }
    io.on('connection', (socket) => {
      socket.emit('session', { playerId: 'pilot' });
      socket.on('intent', (intent) =>
        delayed(
          () => {
            const result = queue.accept(
              intent,
              { playerId: 'pilot', matchId: 'course' },
              (value) => match.authorize(value),
            );
            if (result.status === 'queued') lastPilotControl = intent;
          },
          35 + (intent.sequence % 31),
        ),
      );
      socket.on('open-offer', () => {
        const prompt = {
          kind: 'upgrade',
          id: 'offer',
          revision: 0,
          options: [
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
            { id: 'c', label: 'C' },
          ],
        };
        selection.enqueue(prompt, performance.now() - start);
        match.setOffer('pilot', {
          id: 'offer',
          revision: 0,
          choices: ['a', 'b', 'c'],
        });
      });
      socket.on('choose', (id, reply) => {
        const accepted = selection.choose(
          'offer',
          0,
          id,
          performance.now() - start,
        );
        if (accepted)
          match.consume({
            kind: 'choice',
            matchId: 'course',
            playerId: 'pilot',
            sequence: 1000000,
            offerId: 'offer',
            revision: 0,
            choiceId: id,
          });
        reply(accepted);
      });
    });
    const tick = setInterval(() => {
      for (const intent of queue.drain()) match.consume(intent);
      match.consume({
        kind: 'control',
        matchId: 'course',
        playerId: 'other',
        sequence: ++otherSequence,
        x: 0,
        y: 1,
        aim: 0,
        buttons: 0,
      });
      match.advance(1000 / 60);
      selection.advance(performance.now() - start);
      for (const value of selection.takeOutcomes()) {
        outcome = value.kind === 'chosen' ? value.optionId : value.kind;
        if (match.view('pilot').offer)
          match.accept({
            kind: 'activity',
            playerId: 'pilot',
            activity: 'playing',
          });
      }
    }, 1000 / 60);
    const broadcast = setInterval(() => {
      const state = match.view('pilot');
      const clock = performance.now() - start;
      const current = selection.state;
      const message = {
        observation: {
          matchId: 'course',
          timestamp: performance.timeOrigin + performance.now(),
          revision: ++revision,
          state,
          events: [],
        },
        remainingMs:
          current.kind === 'protected'
            ? Math.max(0, current.deadline - clock)
            : 0,
        outcome,
      };
      delayed(() => io.emit('observation', message));
    }, 50);
    let browser, context, page;
    const output = 'test-results/checkpoint02';
    const errors = [];
    try {
      browser = await chromium.launch({
        executablePath:
          process.env.CHROME_PATH ||
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: true,
      });
      await mkdir(output, { recursive: true });
      context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        reducedMotion: 'reduce',
        recordVideo: { dir: output, size: { width: 1366, height: 768 } },
      });
      page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      const state = async () =>
        JSON.parse(await page.getByTestId('state').textContent());
      await page.goto(
        `${process.env.YCCE_FIXTURE_URL}/tests/scenarios/checkpoint02.html?host=${encodeURIComponent(host)}`,
      );
      await page.getByTestId('status').getByText('Connected').waitFor();
      await page.waitForFunction(
        () =>
          JSON.parse(document.querySelector('[data-testid=state]').textContent)
            .position,
      );
      const initial = await state();
      const canvas = page.locator('canvas');
      const box = await canvas.boundingBox();
      await page.mouse.move(
        box.x + box.width * 0.75,
        box.y + box.height * 0.45,
      );
      await page.keyboard.down('KeyW');
      await page.keyboard.down('KeyD');
      await page.waitForTimeout(900);
      const moving = await state();
      assert.ok(
        moving.position.x > initial.position.x + 0.5 &&
          moving.position.z < initial.position.z - 0.5,
        'diagonal input moves on both axes',
      );
      assert.ok(
        moving.aim > 0.1,
        'mouse position independently sets world aim',
      );
      await page.mouse.move(
        box.x + box.width * 0.25,
        box.y + box.height * 0.45,
      );
      await page.waitForTimeout(300);
      const redirected = await state();
      assert.ok(
        redirected.aim < -0.1,
        'aim reverses when the pointer crosses the player',
      );
      assert.ok(
        redirected.position.x > moving.position.x &&
          redirected.position.z < moving.position.z,
        'aim changes without changing movement direction',
      );
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      await page.waitForTimeout(750);
      const stopped = await state();
      await page.waitForTimeout(400);
      const still = await state();
      assert.ok(
        Math.hypot(
          still.position.x - stopped.position.x,
          still.position.z - stopped.position.z,
        ) < 0.1,
        'focus loss clears held controls',
      );
      await page.keyboard.up('KeyW');
      await page.keyboard.up('KeyD');
      const target = { x: still.position.x + 4, z: still.position.z + 3 };
      const pointAtTarget = async () => {
        const current = await state();
        const screen = await page.evaluate(
          async ({ position, target }) => {
            const THREE =
              await import('/node_modules/three/build/three.module.js');
            const canvas = document.querySelector('canvas');
            const rect = canvas.getBoundingClientRect();
            const camera = new THREE.PerspectiveCamera(
              45,
              rect.width / rect.height,
              0.1,
              100,
            );
            camera.position.set(position.x, position.y + 12, position.z + 12);
            camera.lookAt(position.x, position.y, position.z);
            camera.updateMatrixWorld();
            const projected = new THREE.Vector3(
              target.x,
              position.y,
              target.z,
            ).project(camera);
            return {
              x: rect.left + ((projected.x + 1) * rect.width) / 2,
              y: rect.top + ((1 - projected.y) * rect.height) / 2,
            };
          },
          { position: current.position, target },
        );
        await page.mouse.move(screen.x, screen.y);
      };
      for (const key of ['KeyW', 'KeyD', 'KeyS', 'KeyA']) {
        await page.keyboard.down(key);
        for (let i = 0; i < 3; i++) {
          await pointAtTarget();
          await page.waitForTimeout(100);
        }
        await page.keyboard.up(key);
        await pointAtTarget();
        await page.waitForTimeout(120);
        const directed = await state();
        const expected = Math.atan2(
          target.x - directed.position.x,
          target.z - directed.position.z,
        );
        const difference = Math.atan2(
          Math.sin(directed.aim - expected),
          Math.cos(directed.aim - expected),
        );
        assert.ok(
          Math.abs(difference) < 0.5,
          `aim remains on the target while moving ${key}`,
        );
      }
      await page.waitForTimeout(700);
      const aimBeforeWall = (await state()).aim;
      await page.evaluate(() =>
        window.dispatchEvent(new Event('fixture-wall')),
      );
      await page.waitForTimeout(200);
      const afterWall = await state();
      assert.ok(
        Math.abs(afterWall.aim - aimBeforeWall) < 0.02,
        'foreground objects do not alter aim projection',
      );
      await page.mouse.down({ button: 'right' });
      await page.waitForTimeout(150);
      assert.ok(
        (lastPilotControl.buttons & 2) !== 0,
        'secondary mouse attack reaches the host',
      );
      await page.mouse.up({ button: 'right' });
      await page.getByRole('textbox', { name: 'Chat' }).focus();
      await page.keyboard.type('wasd');
      await page.waitForTimeout(250);
      const textEntry = await state();
      assert.ok(
        Math.hypot(
          textEntry.position.x - afterWall.position.x,
          textEntry.position.z - afterWall.position.z,
        ) < 0.1,
        'typing does not steer',
      );
      await canvas.focus();
      await page.keyboard.down('KeyD');
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: 'Open choice' }).click();
      await page.keyboard.up('KeyD');
      const dialog = page.getByRole('dialog', { name: 'Choose an upgrade' });
      await dialog.waitFor();
      assert.equal(await dialog.getByRole('button').count(), 4);
      await dialog.getByText('Boundary closing').waitFor();
      await page.screenshot({ path: `${output}/choice-1366.png` });
      const largeContext = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        reducedMotion: 'reduce',
      });
      try {
        const largePage = await largeContext.newPage();
        await largePage.goto(
          `${process.env.YCCE_FIXTURE_URL}/tests/scenarios/checkpoint02.html?host=${encodeURIComponent(host)}`,
        );
        const largeDialog = largePage.getByRole('dialog', {
          name: 'Choose an upgrade',
        });
        await largeDialog.waitFor();
        const largeBoxes = await largeDialog
          .locator('.offer, .map, footer')
          .evaluateAll((nodes) =>
            nodes.map((node) => {
              const rect = node.getBoundingClientRect();
              return {
                left: rect.left,
                right: rect.right,
                top: rect.top,
                bottom: rect.bottom,
              };
            }),
          );
        assert.ok(
          largeBoxes.every(
            (rect) =>
              rect.left >= 0 &&
              rect.right <= 1920 &&
              rect.top >= 0 &&
              rect.bottom <= 1080,
          ),
          'choice fits the larger viewport',
        );
        await largePage.screenshot({ path: `${output}/choice-1920.png` });
      } finally {
        await largeContext.close();
      }
      const boxes = await dialog
        .locator('.offer, .map, footer')
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const r = node.getBoundingClientRect();
            return {
              left: r.left,
              right: r.right,
              top: r.top,
              bottom: r.bottom,
            };
          }),
        );
      assert.ok(
        boxes.every(
          (r) =>
            r.left >= 0 && r.right <= 1366 && r.top >= 0 && r.bottom <= 768,
        ),
        'choice, map and action fit the laptop viewport',
      );
      const choiceStart = await state();
      await page.waitForTimeout(300);
      const choiceStill = await state();
      assert.ok(
        Math.hypot(
          choiceStill.position.x - choiceStart.position.x,
          choiceStill.position.z - choiceStart.position.z,
        ) < 0.05,
        'choosing stops the craft immediately',
      );
      await page.keyboard.press('3');
      assert.equal(
        await dialog
          .getByRole('button', { name: /Poisonous Saliva/ })
          .getAttribute('aria-pressed'),
        'true',
      );
      await page.keyboard.press('Enter');
      await dialog.waitFor({ state: 'detached' });
      await page.waitForFunction(
        () =>
          JSON.parse(document.querySelector('[data-testid=state]').textContent)
            .selected === 'c',
      );
      await page.waitForTimeout(2200);
      await page.getByRole('button', { name: 'Open choice' }).click();
      await dialog.waitFor();
      const mapMarkers = dialog.locator('svg circle');
      await mapMarkers.nth(2).waitFor();
      const markerBefore = Number(await mapMarkers.nth(2).getAttribute('cy'));
      await page.waitForTimeout(600);
      const markerAfter = Number(await mapMarkers.nth(2).getAttribute('cy'));
      assert.ok(
        markerAfter > markerBefore + 0.2,
        'the map reflects the other craft moving',
      );
      const otherBefore = match
        .view('pilot')
        .players.find((player) => player.id === 'other').position.z;
      await dialog.waitFor({ state: 'detached', timeout: 14000 });
      const end = await state();
      const otherAfter = match
        .view('pilot')
        .players.find((player) => player.id === 'other').position.z;
      assert.equal(end.selected, 'b', 'expiry chooses an offered option');
      assert.ok(
        otherAfter > otherBefore + 1,
        'another player continues during the choice',
      );
      assert.deepEqual(errors, []);
      const distances = [];
      for (const fps of [30, 60, 120]) {
        const rateContext = await browser.newContext({
          viewport: { width: 1366, height: 768 },
        });
        try {
          await rateContext.addInitScript((rate) => {
            window.requestAnimationFrame = (callback) =>
              window.setTimeout(() => callback(performance.now()), 1000 / rate);
            window.cancelAnimationFrame = (id) => window.clearTimeout(id);
          }, fps);
          const ratePage = await rateContext.newPage();
          await ratePage.goto(
            `${process.env.YCCE_FIXTURE_URL}/tests/scenarios/checkpoint02.html?host=${encodeURIComponent(host)}`,
          );
          await ratePage.getByTestId('status').getByText('Connected').waitFor();
          await ratePage.waitForFunction(
            () =>
              JSON.parse(
                document.querySelector('[data-testid=state]').textContent,
              ).phase === 'running',
          );
          const startX = match
            .view('pilot')
            .players.find((player) => player.id === 'pilot').position.x;
          await ratePage.keyboard.down('KeyD');
          await ratePage.waitForTimeout(1000);
          await ratePage.keyboard.up('KeyD');
          await ratePage.waitForTimeout(800);
          const endX = match
            .view('pilot')
            .players.find((player) => player.id === 'pilot').position.x;
          distances.push({ fps, distance: endX - startX });
        } finally {
          await rateContext.close();
        }
      }
      assert.ok(
        distances.every(({ distance }) => distance > 4),
        'movement works at each simulated render cadence',
      );
      assert.ok(
        Math.max(...distances.map(({ distance }) => distance)) -
          Math.min(...distances.map(({ distance }) => distance)) <
          1.5,
        'render cadence does not materially change authoritative distance',
      );
      console.log('Render cadence observations:', JSON.stringify(distances));
    } finally {
      const video = page?.video();
      clearInterval(tick);
      clearInterval(broadcast);
      for (const timer of pending) clearTimeout(timer);
      await context?.close();
      if (video) await rename(await video.path(), `${output}/course.webm`);
      await browser?.close();
      await new Promise((resolve) => io.close(resolve));
      match.dispose();
    }
  },
);
