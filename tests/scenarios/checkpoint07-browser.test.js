import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';

test(
  'players acquire, equip and specialize an ability through the interface',
  { timeout: 90000 },
  async () => {
    await mkdir('test-results/checkpoint07', { recursive: true });
    const host = fork('build-host/server/index.js', [], {
      env: { ...process.env, HOST: '127.0.0.1', PORT: '3222' },
      execArgv: ['--import', './tests/scenarios/checkpoint07-host.js'],
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
                  dir: 'test-results/checkpoint07',
                  size: { width: 1366, height: 768 },
                },
              }
            : {}),
        });
        contexts.push(context);
        const page = await context.newPage();
        pages.push(page);
        if (i === 0) video = page.video();
        page.on('websocket', (socket) =>
          socket.on('framereceived', ({ payload }) => {
            const msg =
              typeof payload === 'string' ? payload : payload.toString();
            if (!msg.startsWith('42')) return;
            try {
              const [name, body] = JSON.parse(msg.slice(msg.indexOf('[')));
              if (name === 'session') sessions[i] = body;
              if (name === 'observation') states[i] = body.state;
            } catch {
              // Ignore non-event Socket.IO frames.
            }
          }),
        );
        await page.goto('http://127.0.0.1:3222');
        await page.getByText(/^Connected · Verified starter subset/).waitFor();
        await page.getByLabel('Display name').fill(`Progression ${i + 1}`);
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
      const ready = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error('fixture timeout')), 5000);
        host.once('message', (message) => {
          clearTimeout(timer);
          resolve(message);
        });
        host.send({
          kind: 'progression-fixture',
          playerId: sessions[0].playerId,
        });
      });
      assert.equal(ready.kind, 'progression-ready', ready.message);
      const dialog = page.getByRole('dialog', { name: 'Choose an upgrade' });
      await dialog.waitFor();
      for (
        let i = 0;
        i < 8 && !states[0].offer.choices.includes('body-slam');
        i++
      ) {
        await page.getByRole('button', { name: /Reroll/ }).click();
        await delay(250);
      }
      assert.ok(states[0].offer.choices.includes('body-slam'));
      await dialog.getByRole('button', { name: /Body Slam/ }).click();
      await page.keyboard.press('Enter');
      await page
        .getByRole('heading', { name: 'Choose a specialization.' })
        .waitFor();
      await page.getByText('Change equipped abilities').click();
      await page.getByRole('button', { name: 'Unequip primary' }).click();
      await page
        .getByRole('button', { name: 'Equip body-slam in secondary' })
        .click();
      const physical = states[0].players.find(
        (p) => p.id === sessions[0].playerId,
      ).stats.physical;
      await dialog.getByRole('button', { name: /Impact fixture/ }).click();
      await page.keyboard.press('Enter');
      await delay(500);
      assert.equal(states[0].equipment.slots.secondary, 'body-slam');
      assert.equal(
        states[0].players.find((p) => p.id === sessions[0].playerId).stats
          .physical,
        physical + 3,
      );
      await page.screenshot({
        path: 'test-results/checkpoint07/specialized.png',
      });
    } finally {
      for (const context of contexts) await context.close();
      host.kill('SIGTERM');
      if (host.connected) host.disconnect();
      if (video)
        await copyFile(
          await video.path(),
          'test-results/checkpoint07/progression.webm',
        );
      if (browser) await browser.close();
    }
  },
);
