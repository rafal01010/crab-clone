import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

test(
  'four browser clients join, load, move and use starting combat controls',
  { timeout: 60000 },
  async () => {
    await mkdir('test-results/checkpoint03', { recursive: true });
    const browser = await chromium.launch({
      executablePath:
        process.env.CHROME_PATH ||
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
      args: ['--no-sandbox'],
    });
    const contexts = [];
    try {
      const pages = [];
      for (let i = 0; i < 4; i++) {
        const context = await browser.newContext({
          viewport: { width: 1280, height: 720 },
          ...(i === 0
            ? {
                recordVideo: {
                  dir: 'test-results/checkpoint03',
                  size: { width: 1280, height: 720 },
                },
              }
            : {}),
        });
        contexts.push(context);
        const page = await context.newPage();
        pages.push(page);
        await page.goto('http://127.0.0.1:3217');
        await page.getByText('Connected', { exact: true }).waitFor();
        await page.getByLabel('Display name').fill(`Pilot ${i + 1}`);
        if (i === 0)
          await page.getByRole('button', { name: 'Create room' }).click();
        else
          await page.getByRole('button', { name: 'Join', exact: true }).click();
        await page
          .getByRole('heading', { name: 'lobby', exact: true })
          .waitFor();
      }
      for (const page of pages)
        await page.getByRole('button', { name: 'Ready', exact: true }).click();
      const start = pages[0].getByRole('button', {
        name: 'Start',
        exact: true,
      });
      await start.waitFor({ state: 'visible' });
      await assert.doesNotReject(() => start.click({ timeout: 5000 }));
      for (const page of pages) {
        await page
          .getByText('Match: running', { exact: true })
          .waitFor({ timeout: 15000 });
        await page.getByText('Players: 4 / 4', { exact: true }).waitFor();
        await page.getByText('movement: basic-dash', { exact: true }).waitFor();
      }
      const page = pages[0];
      await page.locator('canvas').click({ position: { x: 400, y: 300 } });
      await page.keyboard.down('d');
      await page.keyboard.down('s');
      await page.waitForTimeout(1000);
      await page.keyboard.up('d');
      await page.keyboard.up('s');
      await page
        .getByText('Level 2', { exact: true })
        .waitFor({ timeout: 8000 });
      await page.keyboard.press('Space');
      await page.mouse.click(600, 500);
      await page.waitForTimeout(700);
      await page.screenshot({
        path: 'test-results/checkpoint03/four-client-journey.png',
      });
      assert.equal(await page.locator('canvas').count(), 1);
    } finally {
      for (const context of contexts) await context.close();
      await browser.close();
    }
  },
);
