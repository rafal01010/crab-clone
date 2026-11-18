import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';

test(
  'fixture-granted builds work in a four-client final area',
  { timeout: 360000 },
  async () => {
    await mkdir('test-results/checkpoint10', { recursive: true });
    const host = fork('build-host/server/index.js', [], {
      env: { ...process.env, HOST: '127.0.0.1', PORT: '3225' },
      execArgv: ['--import', './tests/scenarios/checkpoint10-browser-host.js'],
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    let completed = false,
      output = '',
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
                  dir: 'test-results/checkpoint10',
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
        await page.goto('http://127.0.0.1:3225');
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
      const request = (action) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(
            () => reject(Error('fixture timeout')),
            5000,
          );
          host.once('message', (message) => {
            clearTimeout(timer);
            if (message.kind === 'error') reject(Error(message.message));
            else resolve(message);
          });
          host.send({
            kind: 'checkpoint10',
            action,
            playerId: sessions[0].playerId,
            targetId: sessions[1].playerId,
            playerIds: sessions.map((session) => session.playerId),
          });
        });
      const waitFor = async (predicate, label) => {
        for (let i = 0; i < 100; i++) {
          if (predicate()) return;
          await delay(100);
        }
        assert.fail(`timed out waiting for ${label}`);
      };
      await request('protect');
      await request('grant-ranged');
      await waitFor(
        () =>
          states[0]?.progression.upgrades.some(
            (upgrade) => upgrade.id === 'spit',
          ),
        'fixture build',
      );
      assert.ok(Object.values(states[0].equipment.slots).includes('spit'));
      await page.getByText('Your upgrades', { exact: true }).click();
      await page.getByText('Plasma Shot', { exact: false }).first().waitFor();
      await page.screenshot({
        path: 'test-results/checkpoint10/saliva-spit.png',
      });
      await page.getByText('Your upgrades', { exact: true }).click();
      await request('position-combatants');
      await waitFor(
        () =>
          states[0]?.players.some(
            (player) =>
              player.id === sessions[1].playerId &&
              Math.abs(player.position.x - 4) < 1,
          ),
        'opponent in range',
      );
      await waitFor(
        () =>
          states[1]?.players.some(
            (player) => player.id === sessions[0].playerId,
          ),
        'both clients see the combatants',
      );
      for (let i = 0; i < 30 && states[0]?.offer; i++) {
        const offer = states[0].offer;
        const index = offer.choices.includes('skip')
          ? offer.choices.indexOf('skip')
          : 0;
        await page.getByRole('dialog', { name: 'Choose an upgrade' }).waitFor();
        await page.keyboard.press(String(index + 1));
        await page.keyboard.press('Enter');
        await waitFor(
          () => !states[0]?.offer || states[0].offer.id !== offer.id,
          'queued choice accepted',
        );
      }
      await page
        .getByRole('dialog', { name: 'Choose an upgrade' })
        .waitFor({ state: 'hidden' });
      const canvas = page.locator('canvas');
      const bounds = await canvas.boundingBox();
      assert.ok(bounds);
      const button =
        states[0].equipment.slots.primary === 'spit' ? 'left' : 'right';
      await page.mouse.move(
        bounds.x + bounds.width / 2 + 160,
        bounds.y + bounds.height / 2,
      );
      await page.mouse.down({ button });
      await delay(500);
      await page.mouse.up({ button });
      assert.equal(states[0]?.offer, null, 'combat should remain visible');
      const combat = await request('combat-ledger');
      assert.ok(
        combat.ledger.some(
          ({ event, result }) =>
            event.abilityId === 'spit' &&
            event.ownerId === sessions[0].playerId &&
            event.targetId === sessions[1].playerId &&
            result.hull + result.plating > 0,
        ),
        JSON.stringify(combat.ledger),
      );
      await page.screenshot({
        path: 'test-results/checkpoint10/saliva-spit-combat.png',
      });
      await request('protect');
      await request('position-finale');
      await waitFor(
        () =>
          states[0]?.boundary.radius <= 3.01 &&
          states[0]?.players.some(
            (player) =>
              player.id === sessions[1].playerId &&
              Math.abs(player.position.x - 1) < 1,
          ),
        'combatants in the final area',
      );
      for (let i = 0; i < 30 && states[0]?.offer; i++) {
        const offer = states[0].offer;
        const index = offer.choices.includes('skip')
          ? offer.choices.indexOf('skip')
          : 0;
        await page.getByRole('dialog', { name: 'Choose an upgrade' }).waitFor();
        await page.keyboard.press(String(index + 1));
        await page.keyboard.press('Enter');
        await waitFor(
          () => !states[0]?.offer || states[0].offer.id !== offer.id,
          'final-area choice accepted',
        );
      }
      await page
        .getByRole('dialog', { name: 'Choose an upgrade' })
        .waitFor({ state: 'hidden' });
      await delay(3000);
      await request('position-finale');
      await delay(300);
      await request('combat-ledger');
      await page.mouse.move(
        bounds.x + bounds.width / 2 + 80,
        bounds.y + bounds.height / 2,
      );
      await page.mouse.down({ button });
      await delay(700);
      await page.mouse.up({ button });
      const finale = await request('combat-ledger');
      await page.screenshot({
        path: 'test-results/checkpoint10/saliva-spit-finale-attempt.png',
      });
      assert.ok(
        finale.ledger.some(
          ({ event, result }) =>
            event.abilityId === 'spit' &&
            event.ownerId === sessions[0].playerId &&
            event.targetId === sessions[1].playerId &&
            result.hull + result.plating > 0,
        ),
        JSON.stringify({
          players: states[0].players.filter((player) =>
            [sessions[0].playerId, sessions[1].playerId].includes(player.id),
          ),
          offers: [states[0].offer, states[1].offer],
          attacks: finale.ledger.filter(
            ({ event }) => event.abilityId === 'spit',
          ),
        }),
      );
      assert.ok(states[0].boundary.radius <= 3.01);
      await page.screenshot({
        path: 'test-results/checkpoint10/saliva-spit-finale.png',
      });
      if (process.env.CHECKPOINT10_JET_ONLY) {
        await request('grant-trap-movement');
        await waitFor(
          () => states[0]?.equipment.slots.movement === 'jet',
          'equipped Jet',
        );
        await request('position-finale');
        await delay(300);
        await page.keyboard.down('Space');
        await delay(600);
        await page.keyboard.up('Space');
        await waitFor(() => states[0]?.trails.length > 0, 'Jet trail');
        assert.ok(states[0].boundary.radius <= 3.01);
        await page.screenshot({
          path: 'test-results/checkpoint10/jet-finale.png',
        });
      } else {
        await request('grant-heavy');
        await waitFor(
          () =>
            Object.values(states[0]?.equipment.slots ?? {}).includes('horns'),
          'equipped Horns',
        );
        await request('position-finale');
        await request('clear-combat-lane');
        await delay(300);
        const heavyButton =
          states[0].equipment.slots.primary === 'horns' ? 'left' : 'right';
        await request('combat-ledger');
        await page.mouse.move(
          bounds.x + bounds.width / 2 + 80,
          bounds.y + bounds.height / 2,
        );
        await page.mouse.down({ button: heavyButton });
        await delay(700);
        await page.mouse.up({ button: heavyButton });
        const heavy = await request('combat-ledger');
        assert.ok(
          heavy.ledger.some(
            ({ event, result }) =>
              event.abilityId === 'horns' &&
              event.ownerId === sessions[0].playerId &&
              event.targetId === sessions[1].playerId &&
              result.hull + result.plating > 0,
          ),
          JSON.stringify(
            heavy.ledger.filter(({ event }) => event.abilityId === 'horns'),
          ),
        );
        await page.screenshot({
          path: 'test-results/checkpoint10/heavy-finale.png',
        });
      }
      await delay(500);
      completed = true;
    } finally {
      for (const context of contexts) await context.close();
      host.kill('SIGTERM');
      if (host.connected) host.disconnect();
      if (video && completed) {
        await copyFile(
          await video.path(),
          process.env.CHECKPOINT10_JET_ONLY
            ? 'test-results/checkpoint10/jet-finale.webm'
            : 'test-results/checkpoint10/saliva-spit-finale.webm',
        );
      }
      if (browser) await browser.close();
    }
  },
);
