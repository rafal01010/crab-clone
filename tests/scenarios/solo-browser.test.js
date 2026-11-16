import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';

test(
  'a solo player can start, play, and finish a match',
  { timeout: 60000 },
  async () => {
    const host = fork('build-host/server/index.js', [], {
      env: { ...process.env, HOST: '127.0.0.1', PORT: '3228' },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    let output = '';
    let browser;
    host.stdout.on('data', (data) => (output += data));
    host.stderr.on('data', (data) => (output += data));
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
      const page = await browser.newPage();
      await page.goto('http://127.0.0.1:3228');
      await page.getByText(/^Connected · Verified starter subset/).waitFor();
      await page.getByLabel('Display name').fill('Solo');
      await page
        .getByRole('button', { name: 'Create room', exact: true })
        .click();
      const start = page.getByRole('button', { name: 'Start', exact: true });
      assert.equal(await start.isDisabled(), true);
      await page.getByRole('button', { name: 'Ready', exact: true }).click();
      await start.waitFor({ state: 'visible' });
      await page.waitForFunction(
        () =>
          ![...document.querySelectorAll('button')].find(
            (button) => button.textContent.trim() === 'Start',
          )?.disabled,
      );
      await start.click();
      await page.getByLabel('Match status').waitFor({ timeout: 15000 });
      const finish = page.getByRole('button', {
        name: 'Finish match',
        exact: true,
      });
      await finish.waitFor();
      await delay(1500);
      assert.equal(await finish.isVisible(), true);
      await finish.click();
      await page
        .getByRole('button', { name: 'Return everyone to lobby' })
        .waitFor();
    } finally {
      if (browser) await browser.close();
      host.kill('SIGTERM');
      if (host.connected) host.disconnect();
    }
  },
);
