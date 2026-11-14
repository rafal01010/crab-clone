import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { randomUUID, randomBytes } from 'node:crypto';
import { Server } from 'socket.io';
import RAPIER from '@dimforge/rapier3d-compat';
import { handler } from '../../build/handler.js';
import { Match } from './match/match.js';
import { loadCatalogue } from './content/catalogue.js';
import { observe } from './match/view.js';
import { IntentQueue } from './network/intents.js';
import type {
  Acknowledgment,
  SessionRejection,
} from '../shared/protocol/index.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('PORT must be an integer between 1 and 65535');
await RAPIER.init();
const content = await loadCatalogue();
const matchId = randomUUID();
const match = new Match(matchId, new RAPIER.World({ x: 0, y: 0, z: 0 }));
const intents = new IntentQueue();
const sessions = new Map<
  string,
  { playerId: string; socketId: string | null }
>();
const server = createServer(handler);
const io = new Server(server, { maxHttpBufferSize: 4096, serveClient: false });
io.on('connection', (socket) => {
  const rejectSession = (reason: SessionRejection) => {
    socket.emit('session-rejected', { reason });
    socket.disconnect();
  };
  const requestedToken: unknown = socket.handshake.auth.token;
  if (
    requestedToken !== undefined &&
    (typeof requestedToken !== 'string' ||
      requestedToken.length === 0 ||
      requestedToken.length > 128)
  ) {
    rejectSession('invalid-token');
    return;
  }
  let token =
    typeof requestedToken === 'string' && requestedToken.length <= 128
      ? requestedToken
      : '';
  let session = sessions.get(token);
  if (session && session.socketId !== null) {
    rejectSession('session-in-use');
    return;
  }
  if (!session) {
    if (token) {
      rejectSession('unknown-session');
      return;
    }
    const playerId = randomUUID();
    if (!match.accept({ kind: 'join', playerId })) {
      rejectSession('match-full');
      return;
    }
    token = randomBytes(32).toString('hex');
    session = { playerId, socketId: null };
    sessions.set(token, session);
  } else if (!match.accept({ kind: 'connect', playerId: session.playerId })) {
    rejectSession('session-unavailable');
    return;
  }
  const active = session;
  active.socketId = socket.id;
  socket.emit('session', { matchId, playerId: active.playerId, token });
  const observation = observe(
    match,
    active.playerId,
    0,
    performance.timeOrigin + performance.now(),
  );
  if (observation) socket.emit('observation', observation);
  socket.emit('content', content.registry.publicContent());
  socket.on('intent', (payload: unknown, reply: unknown) => {
    let ack: Acknowledgment;
    const state = match.view(active.playerId);
    if (!state || active.socketId !== socket.id)
      ack = {
        sequence: null,
        status: 'rejected',
        reason: 'Session unavailable',
      };
    else if (!payload || typeof payload !== 'object' || Array.isArray(payload))
      ack = { sequence: null, status: 'rejected', reason: 'Invalid intent' };
    else if (
      state.players.find((player) => player.id === active.playerId)?.life
        .kind !== 'alive'
    )
      ack = { sequence: null, status: 'rejected', reason: 'Player eliminated' };
    else {
      ack = intents.accept(
        payload,
        { playerId: active.playerId, matchId },
        (intent) => match.authorize(intent),
      );
    }
    if (typeof reply === 'function') reply(ack);
  });
  socket.on('disconnect', () => {
    if (active.socketId === socket.id) {
      active.socketId = null;
      intents.discardPlayer(active.playerId);
      match.accept({ kind: 'disconnect', playerId: active.playerId });
    }
  });
});
server.on('error', (error) => {
  console.error('Host startup failed:', error.message);
  process.exitCode = 1;
  clearInterval(timer);
  match.dispose();
});
server.listen(port, host, () => {
  console.log(`Host listening on ${host}:${port}`);
  if (host === '0.0.0.0' || host === '::')
    for (const entries of Object.values(networkInterfaces()))
      for (const entry of entries ?? [])
        if (entry.family === 'IPv4' && !entry.internal)
          console.log(`LAN: http://${entry.address}:${port}`);
});
let stopping = false;
const stepMs = 1000 / 60;
let previous = performance.now();
let backlog = 0;
let nextObservation = previous;
let revision = 0;
const timer = setInterval(() => {
  const now = performance.now();
  backlog += now - previous;
  previous = now;
  if (backlog > 1000) {
    match.accept({ kind: 'abort' });
    backlog = 0;
    return;
  }
  for (const intent of intents.drain()) {
    match.consume(intent);
  }
  while (backlog >= stepMs) {
    match.advance(stepMs);
    backlog -= stepMs;
  }
  if (now >= nextObservation) {
    nextObservation = now + 50;
    revision += 1;
    for (const session of sessions.values()) {
      if (!session.socketId) continue;
      const observation = observe(
        match,
        session.playerId,
        revision,
        performance.timeOrigin + performance.now(),
      );
      if (observation) io.to(session.socketId).emit('observation', observation);
    }
  }
}, 10);
function shutdown() {
  if (stopping) return;
  stopping = true;
  clearInterval(timer);
  io.close(() => {
    match.dispose();
  });
  server.closeAllConnections();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
