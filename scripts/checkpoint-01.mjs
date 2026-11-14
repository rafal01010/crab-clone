import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

const children = [];
function start(command, args, env = {}) {
  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stdout.pipe(process.stdout);
  children.push(child);
  return { child, output: () => output };
}
async function ready(process, marker) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (process.child.exitCode !== null || process.child.signalCode !== null)
      throw new Error(`Server exited before startup: ${marker}`);
    if (process.output().includes(marker)) return;
    await delay(100);
  }
  throw new Error(`Server did not report startup: ${marker}`);
}
async function stop(process, allowSignalExit) {
  const child = process.child;
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill('SIGTERM');
  const timeout = new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 5000);
    timer.unref();
  });
  const result = await Promise.race([exited, timeout]);
  if (!result) {
    child.kill('SIGKILL');
    throw new Error(
      `${allowSignalExit ? 'Fixture' : 'Production'} server did not stop after SIGTERM`,
    );
  }
  const [code, signal] = result;
  if (
    code !== 0 &&
    !(allowSignalExit && (code === 143 || signal === 'SIGTERM'))
  )
    throw new Error(`Server shutdown failed: code ${code}, signal ${signal}`);
}
let host;
let fixture;
try {
  const hostUrl = 'http://127.0.0.1:3217';
  const fixtureUrl = 'http://127.0.0.1:3219';
  host = start(process.execPath, ['build-host/server/index.js'], {
    HOST: '127.0.0.1',
    PORT: '3217',
  });
  fixture = start(process.execPath, [
    'node_modules/vite/bin/vite.js',
    '--config',
    'tests/scenarios/vite.config.js',
    '--host',
    '127.0.0.1',
    '--port',
    '3219',
    '--strictPort',
  ]);
  await Promise.all([
    ready(host, 'Host listening on 127.0.0.1:3217'),
    ready(fixture, 'http://127.0.0.1:3219/'),
  ]);
  const tests = start(
    process.execPath,
    [
      '--test',
      'tests/scenarios/browser.test.js',
      'tests/scenarios/foundation.test.js',
    ],
    { YCCE_TEST_URL: hostUrl, YCCE_FIXTURE_URL: fixtureUrl },
  );
  const [code] = await once(tests.child, 'exit');
  process.exitCode = code ?? 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  for (const process of [host, fixture]) {
    if (!process) continue;
    try {
      await stop(process, process === fixture);
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    }
  }
  for (const child of children)
    if (child.exitCode === null && child.signalCode === null)
      child.kill('SIGTERM');
}
