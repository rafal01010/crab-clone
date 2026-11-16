import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';

test(
  'four players see a legal chassis, weapon, and movement build in play',
  { timeout: 90000 },
  async () => {
    await mkdir('test-results/checkpoint08', { recursive: true });
    const host = fork('build-host/server/index.js', [], {
      env: { ...process.env, HOST: '127.0.0.1', PORT: '3223' },
      execArgv: ['--import', './tests/scenarios/checkpoint08-host.js'],
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    let output = '',
      browser,
      video;
    host.stdout.on('data', (data) => (output += data));
    host.stderr.on('data', (data) => (output += data));
    const contexts = [],
      pages = [],
      states = [],
      sessions = [];
    try {
      for (let i = 0; i < 100 && !output.includes('Host listening'); i++) {
        if (host.exitCode !== null) throw Error(output);
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
      for (let i = 0; i < 4; i++) {
        const context = await browser.newContext({
          viewport: { width: 1366, height: 768 },
          ...(i === 0
            ? {
                recordVideo: {
                  dir: 'test-results/checkpoint08',
                  size: { width: 1366, height: 768 },
                },
              }
            : {}),
        });
        contexts.push(context);
        const page = await context.newPage();
        pages.push(page);
        if (i === 0) video = page.video();
        page.on('websocket', (socket) => {
          socket.on('framereceived', ({ payload }) => {
            const msg =
              typeof payload === 'string' ? payload : payload.toString();
            if (!msg.startsWith('42')) return;
            try {
              const [name, body] = JSON.parse(msg.slice(msg.indexOf('[')));
              if (name === 'session') sessions[i] = body;
              if (name === 'observation') states[i] = body.state;
            } catch {
              /* Socket.IO control frames do not contain observations. */
            }
          });
        });
        await page.goto('http://127.0.0.1:3223');
        await page.getByText(/^Connected · Verified starter subset/).waitFor();
        await page.getByLabel('Display name').fill(`Build ${i + 1}`);
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
      await page.bringToFront();
      async function fixture(action) {
        const result = await new Promise((resolve, reject) => {
          const timer = setTimeout(
            () => reject(Error('fixture timeout')),
            5000,
          );
          host.once('message', (message) => {
            clearTimeout(timer);
            resolve(message);
          });
          host.send({
            kind: 'checkpoint08',
            action,
            playerId: sessions[0].playerId,
            targetId: sessions[1].playerId,
          });
        });
        assert.equal(result.kind, 'checkpoint08-ready', result.message);
      }
      const waitFor = async (predicate, label) => {
        for (let i = 0; i < 100; i++) {
          if (predicate()) return;
          await delay(100);
        }
        assert.fail(`timed out waiting for ${label}`);
      };
      await fixture('build');
      const dialog = page.getByRole('dialog', { name: 'Choose an upgrade' });
      await dialog.waitFor();
      await waitFor(
        () => states[0]?.offer?.kind === 'upgrade',
        'upgrade offer',
      );
      const upgrades = () => states[0].progression.upgrades;
      assert.ok(upgrades().some((u) => u.id === 'arms'));
      assert.ok(upgrades().some((u) => u.id === 'legs'));
      for (
        let i = 0;
        i < 30 && !states[0].offer.choices.includes('claws');
        i++
      ) {
        const revision = states[0].offer.revision;
        await page.getByRole('button', { name: /Reroll/ }).click();
        await waitFor(
          () => states[0].offer?.revision !== revision,
          'rerolled offer',
        );
      }
      assert.ok(
        states[0].offer.choices.includes('claws'),
        'Claws appeared on a legal Arms path',
      );
      await dialog.getByRole('button', { name: /Claws/ }).click();
      await page.keyboard.press('Enter');
      await waitFor(
        () => upgrades().some((u) => u.id === 'claws'),
        'Claws acquisition',
      );
      await waitFor(
        () => states[0].equipment.slots.primary === 'claws',
        'Claws equipped',
      );
      await fixture('leap');
      await page.getByRole('heading', { name: 'Choose equipment.' }).waitFor();
      await dialog.getByRole('button', { name: /movement/i }).click();
      await page.keyboard.press('Enter');
      await waitFor(
        () => states[0].equipment.slots.movement === 'leap',
        'Leap equipped',
      );
      await fixture('combat');
      await delay(500);
      const targetId = sessions[1].playerId;
      const target = () => states[0].players.find((p) => p.id === targetId);
      await waitFor(() => !!target(), 'target observation');
      const health = target().health.hull + target().health.plating;
      const box = await page.locator('canvas').boundingBox();
      assert.ok(box);
      await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.5);
      await delay(300);
      await page.mouse.down();
      await delay(300);
      await page.mouse.up();
      await waitFor(
        () => target().health.hull + target().health.plating < health,
        'Claws damage',
      );
      const self = () =>
        states[0].players.find((p) => p.id === sessions[0].playerId);
      const before = { ...self().position };
      await page.keyboard.down('d');
      await page.keyboard.down('Space');
      await delay(350);
      await page.keyboard.up('Space');
      await page.keyboard.up('d');
      await waitFor(
        () =>
          Math.hypot(
            self().position.x - before.x,
            self().position.z - before.z,
          ) > 3,
        'Leap movement',
      );
      assert.ok(
        states[1].players.some((p) => p.id === sessions[0].playerId),
        'second client observes the player',
      );
      await page.screenshot({
        path: 'test-results/checkpoint08/combined-build.png',
      });
      await delay(1000);
    } finally {
      for (const context of contexts) await context.close();
      host.kill('SIGTERM');
      if (host.connected) host.disconnect();
      if (video)
        await copyFile(
          await video.path(),
          'test-results/checkpoint08/combined-build.webm',
        );
      if (browser) await browser.close();
    }
  },
);
