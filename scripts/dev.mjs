import { spawn } from 'node:child_process';
import { once } from 'node:events';

const build = spawn(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'build'],
  { stdio: 'inherit', env: process.env },
);
const [buildCode] = await once(build, 'exit');
if (buildCode !== 0) process.exit(buildCode ?? 1);

const host = spawn(process.execPath, ['build-host/server/index.js'], {
  stdio: 'inherit',
  env: process.env,
});
const vite = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0'],
  { stdio: 'inherit', env: process.env },
);
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of [host, vite])
    if (child.exitCode === null && child.signalCode === null)
      child.kill('SIGTERM');
}
for (const child of [host, vite]) {
  child.on('error', (error) => {
    console.error(error);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping) stop(code || 1);
  });
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
