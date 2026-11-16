import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';

test(
  'four clients explore a point, scan firmware and enter shelter',
  { timeout: 90000 },
  async () => {
    await mkdir('test-results/checkpoint06', { recursive: true });
    const host = fork('build-host/server/index.js', [], {
      env: { ...process.env, HOST: '127.0.0.1', PORT: '3221' },
      execArgv: ['--import', './tests/scenarios/checkpoint06-host.js'],
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    let output = '';
    host.stdout.on('data', (d) => (output += d));
    host.stderr.on('data', (d) => (output += d));
    let browser, video;
    const contexts = [];
    const states = [],
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
      const pages = [];
      for (let i = 0; i < 4; i++) {
        const context = await browser.newContext({
          viewport: { width: 1366, height: 768 },
          ...(i === 0
            ? {
                recordVideo: {
                  dir: 'test-results/checkpoint06',
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
              /* Other frames are not observations. */
            }
          }),
        );
        await page.goto('http://127.0.0.1:3221');
        await page.getByText(/^Connected · Verified starter subset/).waitFor();
        await page.getByLabel('Display name').fill(`Explorer ${i + 1}`);
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
      async function move(target) {
        const result = await new Promise((resolve, reject) => {
          const timer = setTimeout(
            () => reject(Error('fixture timeout')),
            5000,
          );
          host.once('message', (m) => {
            clearTimeout(timer);
            resolve(m);
          });
          host.send({
            kind: 'explore',
            playerId: sessions[0].playerId,
            target,
            otherId: sessions[1].playerId,
          });
        });
        assert.equal(result.kind, 'explored', result.message);
        await delay(500);
        return result.target;
      }
      const site = await move('poi');
      await page
        .getByRole('button', {
          name: `${site.kind.replaceAll('-', ' ')} · Interact (E)`,
        })
        .click();
      const dialog = page.getByRole('dialog', { name: 'Choose a site reward' });
      await dialog.waitFor();
      await page.screenshot({ path: 'test-results/checkpoint06/point.png' });
      await page.keyboard.press('1');
      await page.keyboard.press('Enter');
      await delay(700);
      assert.equal(
        states[0].pointsOfInterest.find((p) => p.id === site.id)?.status,
        'claimed',
      );
      const module = await move('firmware');
      await page
        .getByRole('button', { name: `Scan firmware · ${module.appearance}` })
        .click();
      await delay(400);
      await page
        .getByRole('button', { name: `Use firmware · ${module.appearance}` })
        .click();
      await delay(600);
      assert.ok(states[0].lastFirmware);
      await move('shelter');
      await page
        .getByRole('button', { name: 'Enter shelter', exact: true })
        .first()
        .click();
      await delay(400);
      assert.ok(
        states[0].players.find((p) => p.id === sessions[0].playerId).shelter,
      );
      await page.screenshot({ path: 'test-results/checkpoint06/shelter.png' });
      await page
        .getByRole('button', { name: 'Exit shelter', exact: true })
        .first()
        .click();
      await delay(300);
      const combat = await move('ally-combat');
      await delay(2500);
      assert.ok(
        states[0].bots.some(
          (b) => b.id === combat.allyId && b.ownerId === sessions[0].playerId,
        ),
      );
      assert.ok(
        states[0].players.find((p) => p.id === sessions[1].playerId).health
          .hull < combat.health,
      );
      await page.screenshot({
        path: 'test-results/checkpoint06/ally-combat.png',
      });
      const previousRound = states[0].roundId;
      await move('finish');
      await page
        .getByRole('button', { name: 'Return everyone to lobby' })
        .click();
      for (const p of pages)
        await p.getByRole('heading', { name: 'lobby', exact: true }).waitFor();
      for (const p of pages)
        await p.getByRole('button', { name: 'Ready', exact: true }).click();
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      for (const p of pages)
        await p.getByLabel('Match status').waitFor({ timeout: 15000 });
      assert.notEqual(states[0].roundId, previousRound);
      assert.ok(
        states[0].firmware.every((m) => m.knowledge.kind === 'unknown'),
      );
    } finally {
      for (const context of contexts) await context.close();
      host.kill('SIGTERM');
      if (host.connected) host.disconnect();
      if (video)
        await copyFile(
          await video.path(),
          'test-results/checkpoint06/exploration.webm',
        );
      if (browser) await browser.close();
    }
  },
);
