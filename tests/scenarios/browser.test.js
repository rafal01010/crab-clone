import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

test(
  'production lobby renders and reconnects with local assets',
  { skip: !process.env.YCCE_TEST_URL },
  async () => {
    const browser = await chromium.launch({
      executablePath:
        process.env.CHROME_PATH ||
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();
    const requests = [];
    const errors = [];
    page.on('request', (request) => requests.push(request.url()));
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.goto(process.env.YCCE_TEST_URL);
      await page.getByText('Connected', { exact: true }).waitFor();
      await page.getByText(/^Players: [1-4] \/ 4$/).waitFor();
      assert.equal(await page.locator('canvas').count(), 1);
      const original = await page.evaluate(() =>
        sessionStorage.getItem('ycce-session'),
      );
      assert.ok(original);
      await mkdir('test-results', { recursive: true });
      await page.screenshot({
        path:
          process.env.YCCE_FOUNDATION_SCREENSHOT ||
          'test-results/foundation.png',
      });
      await page.reload();
      await page.getByText('Connected', { exact: true }).waitFor();
      await page.getByText(/^Players: [1-4] \/ 4$/).waitFor();
      assert.equal(
        await page.evaluate(() => sessionStorage.getItem('ycce-session')),
        original,
      );
      const token = await page.evaluate(() =>
        sessionStorage.getItem('ycce-session'),
      );
      assert.ok(token);
      const duplicateContext = await browser.newContext();
      try {
        await duplicateContext.addInitScript(
          (saved) => sessionStorage.setItem('ycce-session', saved),
          token,
        );
        const duplicate = await duplicateContext.newPage();
        await duplicate.goto(process.env.YCCE_TEST_URL);
        await duplicate
          .getByText('Session already connected', { exact: true })
          .waitFor();
        assert.equal(
          await duplicate.evaluate(() =>
            sessionStorage.getItem('ycce-session'),
          ),
          token,
        );
        await page.getByText('Connected', { exact: true }).waitFor();
      } finally {
        await duplicateContext.close();
      }
      const canvasBeforeJoin = await page.locator('canvas').screenshot();
      const secondContext = await browser.newContext({
        viewport: { width: 1280, height: 720 },
      });
      try {
        const second = await secondContext.newPage();
        await second.goto(process.env.YCCE_TEST_URL);
        await second.getByText('Connected', { exact: true }).waitFor();
        await second.getByText(/^Players: [2-4] \/ 4$/).waitFor();
        await page.getByText(/^Players: [2-4] \/ 4$/).waitFor();
        assert.notEqual(
          await second.evaluate(() => sessionStorage.getItem('ycce-session')),
          original,
        );
        const expectedCount = await second.getByText(/^Players:/).textContent();
        await page.getByText(expectedCount, { exact: true }).waitFor();
        await page.waitForTimeout(300);
        assert.notDeepEqual(
          await page.locator('canvas').screenshot(),
          canvasBeforeJoin,
        );
      } finally {
        await secondContext.close();
      }
      assert.deepEqual(errors, []);
      assert.ok(
        requests.every(
          (url) =>
            new URL(url).origin === new URL(process.env.YCCE_TEST_URL).origin,
        ),
      );
    } finally {
      await context.close();
      await browser.close();
    }
  },
);

test(
  'renderer updates, removes, replaces, resizes, and stops after disposal',
  { skip: !process.env.YCCE_FIXTURE_URL },
  async () => {
    const browser = await chromium.launch({
      executablePath:
        process.env.CHROME_PATH ||
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
    });
    const page = await browser.newPage({
      viewport: { width: 800, height: 600 },
    });
    try {
      await page.goto(
        `${process.env.YCCE_FIXTURE_URL}/tests/scenarios/world.html`,
      );
      await page.waitForFunction(() => window.worldScenario);
      const update = (matchId, players) =>
        page.evaluate(
          ({ matchId, players }) =>
            window.worldScenario.update(matchId, players),
          { matchId, players },
        );
      const canvas = page.locator('canvas');
      const craftCentroid = async (image) =>
        page.evaluate(async (base64) => {
          const bitmap = new Image();
          bitmap.src = `data:image/png;base64,${base64}`;
          await bitmap.decode();
          const surface = document.createElement('canvas');
          surface.width = bitmap.width;
          surface.height = bitmap.height;
          const ctx = surface.getContext('2d');
          ctx.drawImage(bitmap, 0, 0);
          const pixels = ctx.getImageData(
            0,
            0,
            surface.width,
            surface.height,
          ).data;
          let x = 0,
            y = 0,
            count = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            const [r, g, b] = pixels.subarray(i, i + 3);
            if (r > 180 && g > 60 && g < 200 && b < 160 && r > g * 1.2) {
              const pixel = i / 4;
              x += pixel % surface.width;
              y += Math.floor(pixel / surface.width);
              count++;
            }
          }
          return { x: x / count, y: y / count, count };
        }, image.toString('base64'));
      await update('one', [['viewer', 0, 0]]);
      await page.waitForTimeout(300);
      const one = await canvas.screenshot();
      await update('one', [
        ['viewer', 0, 0],
        ['other', 3, 0],
      ]);
      await page.waitForTimeout(300);
      const two = await canvas.screenshot();
      assert.notDeepEqual(two, one);
      await update('one', [
        ['viewer', 0, 0],
        ['other', -3, 0],
      ]);
      await page.waitForTimeout(300);
      const moved = await canvas.screenshot();
      assert.notDeepEqual(moved, two);
      await update('one', [
        ['viewer', 20, 10],
        ['other', 17, 10],
      ]);
      await page.waitForTimeout(300);
      const translated = await canvas.screenshot();
      const beforeFollow = await craftCentroid(moved);
      const afterFollow = await craftCentroid(translated);
      assert.ok(
        beforeFollow.count > 10 && afterFollow.count > 10,
        'both views contain craft',
      );
      assert.ok(
        Math.hypot(
          beforeFollow.x - afterFollow.x,
          beforeFollow.y - afterFollow.y,
        ) < 3,
        'camera follows the viewer while nearby craft retain their screen position',
      );
      await update('one', [['viewer', 0, 0]]);
      await page.waitForTimeout(300);
      assert.ok(
        (await canvas.screenshot()).equals(one),
        'same visible state renders the same',
      );
      await update('two', [['viewer', 0, 0]]);
      await page.waitForTimeout(300);
      assert.ok(
        (await canvas.screenshot()).equals(one),
        'same visible state renders the same',
      );
      await page.evaluate(() => window.worldScenario.reset());
      await page.waitForTimeout(100);
      assert.ok(
        !(await canvas.screenshot()).equals(one),
        'reset clears visible entities',
      );
      await update('two', [['viewer', 0, 0]]);
      await page.waitForTimeout(300);
      assert.ok(
        (await canvas.screenshot()).equals(one),
        'same visible state renders the same',
      );
      await canvas.evaluate((element) => {
        element.style.width = '400px';
        element.style.height = '300px';
      });
      await page.waitForFunction(
        () => document.querySelector('canvas').width === 400,
      );
      await page.evaluate(() => window.worldScenario.dispose());
      await canvas.evaluate((element) => {
        element.style.width = '350px';
      });
      await page.waitForTimeout(100);
      assert.equal(await canvas.evaluate((element) => element.width), 400);
    } finally {
      await page.close();
      await browser.close();
    }
  },
);

test(
  'browser replaces its session after the host restarts',
  { skip: !process.env.YCCE_TEST_URL, timeout: 30000 },
  async () => {
    const { spawn } = await import('node:child_process');
    const { once } = await import('node:events');
    const origin = new URL(process.env.YCCE_TEST_URL);
    origin.port = '3222';
    let host;
    async function startHost() {
      const child = spawn(process.execPath, ['build-host/server/index.js'], {
        env: { ...process.env, HOST: origin.hostname, PORT: origin.port },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      await new Promise((resolve, reject) => {
        let output = '';
        const timer = setTimeout(
          () => reject(new Error('Host startup timed out')),
          5000,
        );
        child.stdout.on('data', (chunk) => {
          output += chunk.toString();
          if (output.includes('Host listening')) {
            clearTimeout(timer);
            resolve();
          }
        });
        child.once('exit', (code) => {
          clearTimeout(timer);
          reject(new Error(`Host exited before startup: ${code}`));
        });
      });
      return child;
    }
    async function stopHost(child) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      const [code] = await exited;
      assert.equal(code, 0);
    }
    const browser = await chromium.launch({
      executablePath:
        process.env.CHROME_PATH ||
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
    });
    try {
      host = await startHost();
      const page = await browser.newPage();
      await page.goto(origin.origin);
      await page.getByText('Connected', { exact: true }).waitFor();
      const previous = await page.evaluate(() =>
        sessionStorage.getItem('ycce-session'),
      );
      assert.ok(previous);
      await stopHost(host);
      host = undefined;
      await page.getByText('Disconnected', { exact: true }).waitFor();
      host = await startHost();
      await page
        .getByText('Connected', { exact: true })
        .waitFor({ timeout: 15000 });
      await page.getByText('Players: 1 / 4').waitFor();
      await page.waitForFunction(
        (old) => sessionStorage.getItem('ycce-session') !== old,
        previous,
      );
      assert.notEqual(
        await page.evaluate(() => sessionStorage.getItem('ycce-session')),
        previous,
      );
    } finally {
      await browser.close();
      if (host && host.exitCode === null && host.signalCode === null)
        await stopHost(host);
    }
  },
);
