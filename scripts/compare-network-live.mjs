import { createServer } from 'node:http';
import { performance } from 'node:perf_hooks';
import { Server } from 'socket.io';
import { io } from 'socket.io-client';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  COLLISION,
  createCraft,
  steerCraft,
} from '../server/match/physics/hover.ts';
import { SnapshotTimeline } from '../src/lib/game-client/snapshots.ts';
import { LocalPrediction } from '../src/lib/game-client/local-prediction.ts';

await RAPIER.init();
const profiles = [
  { name: 'ordinary', delay: 10, jitter: 5, loss: 0 },
  { name: 'impaired', delay: 50, jitter: 20, loss: 0.01 },
  { name: 'recovery', delay: 150, jitter: 50, loss: 0.05, outage: true },
];
const results = [];
for (const profile of profiles) {
  const http = createServer();
  const server = new Server(http, { serveClient: false });
  await new Promise((resolve, reject) => {
    http.once('error', reject);
    http.listen(0, '127.0.0.1', resolve);
  });
  const address = http.address();
  if (!address || typeof address === 'string')
    throw new Error('Host did not bind');
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = 1 / 60;
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(50, 0.25, 50)
      .setTranslation(0, -0.25, 0)
      .setFriction(0)
      .setCollisionGroups(COLLISION.terrain),
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.25, 2, 3)
      .setTranslation(10, 2, 0)
      .setCollisionGroups(COLLISION.terrain),
  );
  const craft = createCraft(world, { x: 0, y: 0.25, z: 0 });
  const client = io(`http://127.0.0.1:${address.port}`, {
    transports: ['websocket'],
  });
  await new Promise((resolve, reject) => {
    client.once('connect', resolve);
    client.once('connect_error', reject);
  });
  const hostSocket = [...server.sockets.sockets.values()][0];
  if (!hostSocket) throw new Error('Missing host socket');
  const timeline = new SnapshotTimeline();
  const prediction = new LocalPrediction();
  const started = performance.now();
  const clock = () => performance.now() - started;
  const offline = () =>
    Boolean(profile.outage && clock() >= 3000 && clock() < 6000);
  let seed = 314159;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const timers = new Set();
  const send = (operation) => {
    if (offline() || random() < profile.loss) return;
    const timer = setTimeout(
      () => {
        timers.delete(timer);
        if (!offline()) operation();
      },
      Math.max(0, profile.delay + (random() * 2 - 1) * profile.jitter),
    );
    timers.add(timer);
  };
  let lastSeq = -1,
    receivedAt = 0,
    current = { x: 0, y: 0 };
  hostSocket.on('control', (message) => {
    if (message.sequence > lastSeq) {
      current = message.control;
      lastSeq = message.sequence;
      receivedAt = clock();
    }
  });
  let lastTimestamp = -1,
    delivered = 0,
    maxCorrection = 0,
    maxAge = 0;
  client.on('snapshot', (snapshot) => {
    if (snapshot.time <= lastTimestamp) return;
    lastTimestamp = snapshot.time;
    delivered++;
    const now = clock();
    const estimate = prediction.sample(now);
    if (estimate)
      maxCorrection = Math.max(
        maxCorrection,
        Math.hypot(
          estimate.x - snapshot.position.x,
          estimate.z - snapshot.position.z,
        ),
      );
    prediction.observe(snapshot.position, now);
    timeline.add(snapshot.time, snapshot.position, now);
    maxAge = Math.max(maxAge, now - snapshot.time);
  });
  let sequence = 0,
    wasOffline = false,
    predictionResponse = null,
    interpolationResponse = null;
  let interpolated = { x: 0, y: 0.25, z: 0 },
    estimated = { ...interpolated };
  const tick = setInterval(() => {
    const now = clock();
    if (now - receivedAt > 250 || offline()) current = { x: 0, y: 0 };
    steerCraft(craft.body, current, 1 / 60);
    world.step();
  }, 1000 / 60);
  const snapshots = setInterval(() => {
    const position = craft.body.translation();
    const snapshot = {
      time: clock(),
      position: { x: position.x, y: position.y, z: position.z },
    };
    send(() => hostSocket.emit('snapshot', snapshot));
  }, 50);
  const controls = setInterval(() => {
    const now = clock();
    const stopped = offline();
    if (stopped && !wasOffline) prediction.reset();
    wasOffline = stopped;
    const control = stopped
      ? { x: 0, y: 0 }
      : now >= 500 && now < 2200
        ? { x: 1, y: 0 }
        : now >= 2200 && now < 2900
          ? { x: 0, y: 1 }
          : { x: 0, y: 0 };
    prediction.input(control);
    const message = { sequence: sequence++, control };
    send(() => client.emit('control', message));
  }, 50);
  const render = setInterval(() => {
    const now = clock();
    interpolated = timeline.sample(now) ?? interpolated;
    estimated = prediction.sample(now) ?? estimated;
    if (now >= 500 && predictionResponse === null && estimated.x > 0.01)
      predictionResponse = now - 500;
    if (now >= 500 && interpolationResponse === null && interpolated.x > 0.01)
      interpolationResponse = now - 500;
  }, 1000 / 60);
  await new Promise((resolve) =>
    setTimeout(resolve, profile.outage ? 8000 : 4500),
  );
  clearInterval(tick);
  clearInterval(snapshots);
  clearInterval(controls);
  clearInterval(render);
  for (const timer of timers) clearTimeout(timer);
  const actual = craft.body.translation();
  results.push({
    profile,
    delivered,
    predictionResponseMs: predictionResponse,
    interpolationResponseMs: interpolationResponse,
    maxCorrection,
    maxSnapshotAgeMs: maxAge,
    finalPredictionError: Math.hypot(
      estimated.x - actual.x,
      estimated.z - actual.z,
    ),
    finalInterpolationError: Math.hypot(
      interpolated.x - actual.x,
      interpolated.z - actual.z,
    ),
  });
  client.disconnect();
  await new Promise((resolve) => server.close(resolve));
  world.free();
}
console.log(
  JSON.stringify(
    {
      setup:
        'One Node Socket.IO client and host over loopback, artificial message delay and drop, timer-driven presentation; no browser, TCP packet loss, or four-client load',
      seed: 314159,
      results,
    },
    null,
    2,
  ),
);
