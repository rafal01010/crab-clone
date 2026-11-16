import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';
import { arenaPointClear, terrainAt } from '../../build-host/shared/arena.js';

const url = 'http://127.0.0.1:3220';
test(
  'four clients observe the same weather and day-night world',
  { timeout: 210000 },
  async () => {
    await mkdir('test-results/checkpoint05', { recursive: true });
    const host = fork('build-host/server/index.js', [], {
      env: { ...process.env, HOST: '127.0.0.1', PORT: '3220' },
      execArgv: ['--import', './tests/scenarios/checkpoint05-clock.js'],
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    let output = '';
    host.stdout.on('data', (d) => (output += d));
    host.stderr.on('data', (d) => (output += d));
    let browser;
    const contexts = [];
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
      const pages = [],
        states = [],
        observations = [],
        sessions = [];
      for (let i = 0; i < 4; i++) {
        const context = await browser.newContext({
          viewport: { width: 1366, height: 768 },
        });
        contexts.push(context);
        const page = await context.newPage();
        pages.push(page);
        page.on('websocket', (socket) =>
          socket.on('framereceived', ({ payload }) => {
            const msg =
              typeof payload === 'string' ? payload : payload.toString();
            if (!msg.startsWith('42')) return;
            try {
              const [name, body] = JSON.parse(msg.slice(msg.indexOf('[')));
              if (name === 'observation') {
                states[i] = body.state;
                observations[i] = body;
              }
              if (name === 'session') sessions[i] = body;
            } catch {
              /* Ignore unrelated frames. */
            }
          }),
        );
        await page.goto(url);
        await page.getByText(/^Connected · Verified starter subset/).waitFor();
        await page.getByLabel('Display name').fill(`World ${i + 1}`);
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
      await pages[0].screenshot({ path: 'test-results/checkpoint05/day.png' });
      async function advance(ms, expected) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error('world step timed out')),
            10000,
          );
          host.once('message', () => {
            clearTimeout(timer);
            resolve();
          });
          host.send({ kind: 'world-step', ms });
        });
        for (
          let i = 0;
          i < 100 && states.some((s) => !s || s.time < expected);
          i++
        )
          await delay(50);
        for (const s of states) assert.ok(s.time >= expected);
      }
      await advance(50000, 50000);
      for (const s of states) {
        assert.equal(s.worldClock.phase, 'day');
        assert.ok(
          s.weather.some((w) => w.kind === 'heatwave' && w.state === 'active'),
        );
        assert.ok(
          s.weather.some((w) => w.kind === 'blizzard' && w.state === 'active'),
        );
      }
      for (let i = 0; i < 4; i++) {
        assert.ok(sessions[i]?.playerId);
        await pages[i].screenshot({
          path: `test-results/checkpoint05/weather-${i + 1}.png`,
        });
      }
      const driver = pages[0];
      await driver.bringToFront();
      await driver.locator('canvas').click({ position: { x: 500, y: 300 } });
      const position = () =>
        states[0].players.find((p) => p.id === sessions[0].playerId)?.position;
      const route = (targetBiome) => {
        const arena = states[0].arena;
        const p = position();
        const start = [Math.round(p.x / 2) * 2, Math.round(p.z / 2) * 2];
        const key = ([x, z]) => `${x},${z}`;
        const queue = [start],
          parents = new Map([[key(start), null]]);
        let destination;
        for (let i = 0; i < queue.length; i++) {
          const current = queue[i];
          if (
            [
              [0, 0],
              [2, 0],
              [-2, 0],
              [0, 2],
              [0, -2],
            ].every(
              ([dx, dz]) =>
                terrainAt(arena, current[0] + dx, current[1] + dz) ===
                targetBiome,
            ) &&
            arenaPointClear(
              arena.obstacles,
              { x: current[0], z: current[1] },
              1.4,
            )
          ) {
            destination = current;
            break;
          }
          for (const [dx, dz] of [
            [2, 0],
            [-2, 0],
            [0, 2],
            [0, -2],
          ]) {
            const next = [current[0] + dx, current[1] + dz],
              k = key(next);
            if (
              parents.has(k) ||
              !arenaPointClear(arena.obstacles, { x: next[0], z: next[1] }, 1.4)
            )
              continue;
            parents.set(k, current);
            queue.push(next);
          }
        }
        assert.ok(destination, `route to ${targetBiome}`);
        const steps = [];
        for (
          let node = destination;
          parents.get(key(node));
          node = parents.get(key(node))
        )
          steps.push(node);
        return steps.reverse();
      };
      const keys = ['w', 'a', 's', 'd'];
      for (const biome of ['grass', 'sand', 'snow', 'water']) {
        const waypoints = route(biome);
        for (const [x, z] of waypoints) {
          let reached = false;
          for (let attempt = 0; attempt < 45; attempt++) {
            const dialog = driver.getByRole('dialog', {
              name: 'Choose an upgrade',
            });
            if (await dialog.isVisible()) {
              for (const key of keys) await driver.keyboard.up(key);
              await driver.keyboard.press('1');
              await driver.keyboard.press('Enter');
              await delay(250);
              await driver.locator('canvas').focus();
            }
            const p = position();
            assert.ok(p);
            const dx = x - p.x,
              dz = z - p.z;
            if (Math.hypot(dx, dz) < 1.15) {
              reached = true;
              break;
            }
            for (const [key, on] of [
              ['d', dx > 0.5],
              ['a', dx < -0.5],
              ['s', dz > 0.5],
              ['w', dz < -0.5],
            ]) {
              if (on) await driver.keyboard.down(key);
              else await driver.keyboard.up(key);
            }
            await delay(100);
          }
          assert.ok(
            reached,
            `could not reach ${x},${z} on route to ${biome}; at ${JSON.stringify(position())}`,
          );
        }
        for (const key of keys) await driver.keyboard.up(key);
        const p = position();
        assert.equal(terrainAt(states[0].arena, p.x, p.z), biome);
        await driver.screenshot({
          path: `test-results/checkpoint05/journey-${biome}.png`,
        });
      }
      await advance(131000, 180000);
      for (const s of states) assert.equal(s.worldClock.phase, 'night');
      let hiddenPairs = 0;
      for (let viewer = 0; viewer < 4; viewer++) {
        assert.deepEqual(observations[viewer].events, []);
        for (let target = 0; target < 4; target++) {
          const id = sessions[target].playerId;
          if (
            viewer === target ||
            states[viewer].players.some((p) => p.id === id)
          )
            continue;
          hiddenPairs++;
          assert.ok(!JSON.stringify(observations[viewer]).includes(id));
        }
        for (const hint of states[viewer].radar)
          assert.deepEqual(Object.keys(hint).sort(), [
            'direction',
            'distance',
            'kind',
          ]);
      }
      assert.ok(hiddenPairs > 0, 'night should conceal at least one opponent');
      for (let i = 0; i < 4; i++) {
        const visibleOpponents = states[i].players.filter(
          (p) => p.id !== sessions[i].playerId && p.life.kind === 'alive',
        ).length;
        const circles = await pages[i]
          .getByRole('img', { name: 'Observed players and closing boundary' })
          .locator('circle')
          .count();
        assert.equal(circles, visibleOpponents + 1);
      }

      await pages[0].screenshot({
        path: 'test-results/checkpoint05/night.png',
      });
    } finally {
      for (const context of contexts) await context.close();
      await browser?.close();
      host.kill('SIGKILL');
      if (host.connected) host.disconnect();
    }
  },
);
