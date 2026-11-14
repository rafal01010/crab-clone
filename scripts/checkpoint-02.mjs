import { spawn } from 'node:child_process';
import { once } from 'node:events';

const fixture = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--config',
    'tests/scenarios/vite.config.js',
    '--host',
    '127.0.0.1',
    '--port',
    '3223',
    '--strictPort',
  ],
  { stdio: ['ignore', 'pipe', 'inherit'] },
);
let output = '';
fixture.stdout.on('data', (chunk) => {
  output += chunk;
  process.stdout.write(chunk);
});
try {
  for (let i = 0; i < 100 && !output.includes('http://127.0.0.1:3223/'); i++) {
    if (fixture.exitCode !== null) throw new Error('Fixture host exited');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!output.includes('http://127.0.0.1:3223/'))
    throw new Error('Fixture host did not start');
  const scenarios =
    process.argv.length > 2
      ? process.argv.slice(2)
      : [
          'tests/scenarios/checkpoint02.test.js',
          'tests/scenarios/checkpoint02-browser.test.js',
          'tests/scenarios/browser.test.js',
        ];
  const child = spawn(process.execPath, ['--test', ...scenarios], {
    stdio: 'inherit',
    env: { ...process.env, YCCE_FIXTURE_URL: 'http://127.0.0.1:3223' },
  });
  const [code] = await once(child, 'exit');
  process.exitCode = code ?? 1;
} finally {
  if (fixture.exitCode === null) {
    const exited = once(fixture, 'exit');
    fixture.kill('SIGTERM');
    await exited;
  }
}
