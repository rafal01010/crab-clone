import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';

test(
  'four players see a resource and defense build collect food',
  { timeout: 90000 },
  async () => {
    await mkdir('test-results/checkpoint09', { recursive: true });
    const host = fork('build-host/server/index.js', [], {
      env: { ...process.env, HOST: '127.0.0.1', PORT: '3224' },
      execArgv: ['--import', './tests/scenarios/checkpoint09-host.js'],
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
                  dir: 'test-results/checkpoint09',
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
            const [name, body] = JSON.parse(msg.slice(msg.indexOf('[')));
            if (name === 'session') sessions[i] = body;
            if (name === 'observation') states[i] = body.state;
          });
        });
        await page.goto('http://127.0.0.1:3224');
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
      const result = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error('fixture timeout')), 5000);
        host.once('message', (message) => {
          clearTimeout(timer);
          resolve(message);
        });
        host.send({ kind: 'checkpoint09', playerId: sessions[0].playerId });
      });
      assert.equal(result.kind, 'checkpoint09-ready', result.message);
      const waitFor = async (predicate, label) => {
        for (let i = 0; i < 100; i++) {
          if (predicate()) return;
          await delay(100);
        }
        assert.fail(`timed out waiting for ${label}`);
      };
      await waitFor(
        () =>
          ['saliva', 'chonky', 'carapace', 'spines'].every((id) =>
            states[0]?.progression.upgrades.some(
              (upgrade) => upgrade.id === id,
            ),
          ),
        'combined build',
      );
      await delay(500);
      const collected = await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(Error('collection timeout')),
          5000,
        );
        host.once('message', (message) => {
          clearTimeout(timer);
          resolve(message);
        });
        host.send({
          kind: 'checkpoint09',
          action: 'collections',
          playerId: sessions[0].playerId,
        });
      });
      assert.ok(
        collected.collections.some(
          (event) =>
            event.resourceId === result.resourceId &&
            event.playerId === sessions[0].playerId &&
            event.source === 'vegetation' &&
            event.progress > 0,
        ),
        'the build collected the spawned food',
      );
      const self = () =>
        states[0].players.find((player) => player.id === sessions[0].playerId);
      assert.ok(self().health.plating > 0, 'Carapace adds plating');
      assert.ok(
        states[1].players.some((player) => player.id === sessions[0].playerId),
        'another player observes the build',
      );
      const canvas = page.getByLabel('Match world');
      const bounds = await canvas.boundingBox();
      assert.ok(bounds);
      await page.mouse.move(
        bounds.x + bounds.width * 0.7,
        bounds.y + bounds.height * 0.5,
      );
      await page.mouse.down();
      await waitFor(() => self().attacking, 'attack reach observation');
      assert.ok(
        Math.abs(
          self().attackReach -
            (1.5 * Math.min(4, self().stats.attackArea / 100) + self().radius),
        ) < 1e-6,
        'attack cue receives the authoritative range',
      );
      await page.screenshot({
        path: 'test-results/checkpoint09/attack-reach.png',
      });
      await page.mouse.up();
      await page.getByText('Your upgrades', { exact: true }).click();
      await page.getByText('Carapace', { exact: false }).first().waitFor();
      await waitFor(
        () => states[0]?.offer?.kind === 'upgrade',
        'food-earned upgrade offer',
      );
      const chosenId = states[0].offer.choices[0];
      const previousRank =
        states[0].progression.upgrades.find(
          (upgrade) => upgrade.id === chosenId,
        )?.rank ?? 0;
      await page.getByRole('dialog', { name: 'Choose an upgrade' }).waitFor();
      await page.keyboard.press('1');
      await page.keyboard.press('Enter');
      await waitFor(
        () =>
          (states[0]?.progression.upgrades.find(
            (upgrade) => upgrade.id === chosenId,
          )?.rank ?? 0) > previousRank,
        'food-earned upgrade acquisition',
      );
      await delay(1000);
      await page.screenshot({
        path: 'test-results/checkpoint09/combined-build.png',
      });
      await delay(1000);
    } finally {
      for (const context of contexts) await context.close();
      host.kill('SIGTERM');
      if (host.connected) host.disconnect();
      if (video)
        await copyFile(
          await video.path(),
          'test-results/checkpoint09/combined-build.webm',
        );
      if (browser) await browser.close();
    }
  },
);
