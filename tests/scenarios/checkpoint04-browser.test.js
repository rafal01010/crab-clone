import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const url = 'http://127.0.0.1:3219';
test(
  'four clients earn a choice, observe its real deadline, finish and return to a clean lobby',
  { timeout: 100000 },
  async () => {
    await mkdir('test-results/checkpoint04', { recursive: true });
    const host = fork('build-host/server/index.js', [], {
      env: { ...process.env, HOST: '127.0.0.1', PORT: '3219' },
      execArgv: ['--import', './tests/scenarios/checkpoint04-clock.js'],
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    let output = '';
    host.stdout.on('data', (data) => {
      output += data;
    });
    host.stderr.on('data', (data) => {
      output += data;
    });
    const contexts = [];
    let browser;
    let recording;
    try {
      for (let i = 0; i < 100 && !output.includes('Host listening'); i++) {
        if (host.exitCode !== null) throw new Error(output);
        await delay(100);
      }
      assert.match(output, /Host listening/);
      browser = await chromium.launch({
        executablePath:
          process.env.CHROME_PATH ||
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: true,
        args: ['--no-sandbox'],
      });
      const pages = [];
      let firstState;
      let firstSession;
      const states = [];
      const sessions = [];

      for (let i = 0; i < 4; i++) {
        const context = await browser.newContext({
          viewport: { width: 1366, height: 768 },
          ...(i === 0
            ? {
                recordVideo: {
                  dir: 'test-results/checkpoint04',
                  size: { width: 1366, height: 768 },
                },
              }
            : {}),
        });
        contexts.push(context);
        const page = await context.newPage();
        pages.push(page);
        if (i === 0) recording = page.video();
        page.on('websocket', (socket) =>
          socket.on('framereceived', ({ payload }) => {
            const message =
              typeof payload === 'string' ? payload : payload.toString();
            if (!message.startsWith('42')) return;
            const start = message.indexOf('[');
            if (start < 0) return;
            try {
              const [name, body] = JSON.parse(message.slice(start));
              if (name === 'session') {
                sessions[i] = body;
                if (i === 0) firstSession = body;
              }
              if (name === 'observation') {
                states[i] = body.state;
                if (i === 0) firstState = body.state;
              }
            } catch {
              /* Other Socket.IO frames need no inspection. */
            }
          }),
        );
        await page.goto(url);
        await page.getByText(/^Connected · Verified starter subset/).waitFor();
        await page.getByLabel('Display name').fill(`Pilot ${i + 1}`);
        await page
          .getByRole('button', {
            name: i === 0 ? 'Create room' : 'Join',
            exact: true,
          })
          .click();
        await page
          .getByRole('heading', { name: 'lobby', exact: true })
          .waitFor();
      }
      for (const page of pages)
        await page.getByRole('button', { name: 'Ready', exact: true }).click();
      await pages[0]
        .getByRole('button', { name: 'Start', exact: true })
        .click();
      for (const page of pages)
        await page.getByLabel('Match status').waitFor({ timeout: 15000 });
      const page = pages[0];
      const targets = [
        { x: -15, z: -15 },
        { x: 15, z: -15 },
        { x: -15, z: 15 },
        { x: 15, z: 15 },
      ];
      async function earnOffer(index) {
        const client = pages[index];
        await client.bringToFront();
        await client.locator('canvas').click({ position: { x: 400, y: 300 } });
        for (let i = 0; i < 100 && !states[index]?.offer; i++) {
          const self = states[index]?.players.find(
            (player) => player.id === sessions[index]?.playerId,
          );
          if (self) {
            const dx = targets[index].x - self.position.x;
            const dz = targets[index].z - self.position.z;
            for (const [key, pressed] of [
              ['d', dx > 0.8],
              ['a', dx < -0.8],
              ['s', dz > 0.8],
              ['w', dz < -0.8],
            ]) {
              if (pressed) await client.keyboard.down(key);
              else await client.keyboard.up(key);
            }
          }
          await client.waitForTimeout(150);
        }
        for (const key of ['w', 'a', 's', 'd']) await client.keyboard.up(key);
        const prompt = client.getByRole('dialog', {
          name: 'Choose an upgrade',
        });
        await prompt.waitFor({ timeout: 5000 });
        return [...states[index].offer.choices];
      }
      const offeredByPlayer = [await earnOffer(0)];
      const dialog = page.getByRole('dialog', { name: 'Choose an upgrade' });
      await dialog.waitFor({ timeout: 10000 });
      const options = await dialog.locator('.offer-name').allTextContents();
      const offeredIds = offeredByPlayer[0];
      assert.ok(options.length > 0);
      const start = performance.now();
      host.send({ kind: 'advance-clock', ms: 18 * 60 * 1000 + 500 });
      await dialog.getByRole('status').first().waitFor({ timeout: 5000 });
      assert.equal(
        await dialog
          .getByText('Meteor incoming. Move away from the red ring.')
          .count(),
        0,
      );
      await page.screenshot({ path: 'test-results/checkpoint04/choice.png' });
      await dialog.waitFor({ state: 'hidden', timeout: 24000 });
      const observedMs = performance.now() - start;
      assert.ok(
        observedMs > 17500 && observedMs < 21500,
        `choice elapsed ${observedMs}ms`,
      );
      await page
        .getByText(/Level 2/)
        .first()
        .waitFor();
      await page.screenshot({ path: 'test-results/checkpoint04/hud.png' });
      for (let index = 1; index < pages.length; index++) {
        offeredByPlayer[index] = await earnOffer(index);
        const prompt = pages[index].getByRole('dialog', {
          name: 'Choose an upgrade',
        });
        await prompt.locator('.offer').first().click();
        await prompt.getByRole('button', { name: 'Confirm selection' }).click();
        await prompt.waitFor({ state: 'hidden' });
      }
      await page.bringToFront();
      host.send({ kind: 'eliminate', playerId: firstSession.playerId });
      await page
        .getByRole('heading', { name: 'Eliminated' })
        .waitFor({ timeout: 5000 });
      const follow = firstState.spectating;
      assert.ok(follow);
      await contexts[0].setOffline(true);
      await page.getByText(/^Disconnected/).waitFor({ timeout: 5000 });
      await contexts[0].setOffline(false);
      await page
        .getByText(/^Connected · Verified starter subset/)
        .waitFor({ timeout: 10000 });
      await page
        .getByRole('heading', { name: 'Eliminated' })
        .waitFor({ timeout: 10000 });
      assert.equal(
        firstState.players.find((player) => player.id === firstSession.playerId)
          .life.kind,
        'eliminated',
      );
      assert.ok(firstState.spectating);
      assert.equal(await page.getByText(/Move close to collect/).count(), 0);
      await page.screenshot({
        path: 'test-results/checkpoint04/spectator-reconnected.png',
      });
      host.send({ kind: 'advance-clock', ms: 29 * 60 * 1000 });
      for (const p of pages)
        await p
          .getByRole('heading', { name: 'Match results' })
          .waitFor({ timeout: 10000 });
      assert.equal(
        await page.getByRole('heading', { name: 'Draw', exact: true }).count(),
        1,
      );
      const build = firstState.result.players.find(
        (player) => player.id === firstSession.playerId,
      );
      assert.ok(
        build.upgrades.some((upgrade) => offeredIds.includes(upgrade.id)),
      );
      for (let index = 1; index < 4; index++) {
        const other = firstState.result.players.find(
          (player) => player.id === sessions[index].playerId,
        );
        assert.ok(
          other.upgrades.some((upgrade) =>
            offeredByPlayer[index].includes(upgrade.id),
          ),
        );
      }
      await page.screenshot({ path: 'test-results/checkpoint04/results.png' });
      await page
        .getByRole('button', { name: 'Return everyone to lobby' })
        .click();
      for (const p of pages) {
        await p.getByRole('heading', { name: 'lobby', exact: true }).waitFor();
        assert.equal(
          await p.getByRole('button', { name: 'Ready', exact: true }).count(),
          1,
        );
      }
      await page.screenshot({
        path: 'test-results/checkpoint04/rematch-lobby.png',
      });
      for (const p of pages)
        await p.getByRole('button', { name: 'Ready', exact: true }).click();
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      for (const p of pages)
        await p.getByLabel('Match status').waitFor({ timeout: 15000 });
      assert.equal(firstState.progression.level, 1);
      assert.equal(firstState.progression.pending, 0);
      assert.equal(firstState.progression.currency, 0);
      assert.equal(firstState.progression.carcinisation, 0);
      assert.equal(
        firstState.players.filter((player) => player.life.kind === 'alive')
          .length,
        4,
      );
      assert.equal(firstState.equipment.slots.movement, 'basic-dash');
      for (const state of states) {
        assert.equal(state.progression.level, 1);
        assert.equal(state.progression.pending, 0);
        assert.equal(state.progression.carcinisation, 0);
        assert.equal(state.equipment.slots.movement, 'basic-dash');
      }
      await page.screenshot({
        path: 'test-results/checkpoint04/rematch-start.png',
      });
      console.log(
        `Displayed options: ${options.join(', ')}; real-time expiry observed after ${Math.round(observedMs)} ms from dialog detection.`,
      );
    } finally {
      for (const context of contexts) await context.close();
      host.kill('SIGTERM');
      if (host.connected) host.disconnect();
      if (recording)
        await copyFile(
          await recording.path(),
          'test-results/checkpoint04/journey.webm',
        );
      if (browser) await browser.close();
    }
  },
);
