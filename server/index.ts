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
import type { Acknowledgment } from '../shared/protocol/index.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';
const roomLimit = Number(process.env.ROOM_LIMIT ?? 2);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('PORT must be an integer between 1 and 65535');
if (!Number.isSafeInteger(roomLimit) || roomLimit < 1)
  throw new Error('ROOM_LIMIT must be a positive integer');
await RAPIER.init();
const content = await loadCatalogue();
type Session = { playerId: string; socketId: string | null; roomId: string };
type Room = {
  id: string;
  match: Match;
  intents: IntentQueue;
  sessions: Map<string, Session>;
  revision: number;
};
const rooms = new Map<string, Room>();
const sessions = new Map<string, Session>();
const server = createServer(handler);
const io = new Server(server, { maxHttpBufferSize: 4096, serveClient: false });
const commands: (() => void)[] = [];
function roomList() {
  return [...rooms.values()].map((room) => {
    const first = room.sessions.values().next().value;
    const view = first ? room.match.view(first.playerId) : undefined;
    return {
      id: room.id,
      players: room.sessions.size,
      phase: view?.phase ?? 'lobby',
    };
  });
}
function publishRooms() {
  io.emit('rooms', roomList());
}
function removeRoom(room: Room) {
  rooms.delete(room.id);
  for (const token of room.sessions.keys()) sessions.delete(token);
  room.match.dispose();
  publishRooms();
}
io.on('connection', (socket) => {
  let active: Session | null = null;
  let activeToken = '';
  let pendingCommands = 0;
  function enqueue(command: () => void, allowDisconnected = false) {
    if (!allowDisconnected && pendingCommands >= 16) {
      socket.disconnect();
      return;
    }
    pendingCommands++;
    commands.push(() => {
      pendingCommands--;
      if (!allowDisconnected && !socket.connected) return;
      try {
        command();
      } catch (error) {
        console.error('Room command failed:', error);
        socket.disconnect();
      }
    });
  }
  socket.emit('rooms', roomList());
  socket.on('join-room', (payload: unknown, reply: unknown) =>
    enqueue(() => {
      const respond = (error: string | null) => {
        if (typeof reply === 'function') reply(error);
      };
      if (
        active ||
        !payload ||
        typeof payload !== 'object' ||
        Array.isArray(payload)
      )
        return respond('Invalid request');
      const input = Object.fromEntries(Object.entries(payload));
      if (
        typeof input.name !== 'string' ||
        !input.name.trim() ||
        input.name.trim().length > 24 ||
        (input.roomId !== null && typeof input.roomId !== 'string') ||
        (input.token !== undefined &&
          (typeof input.token !== 'string' || input.token.length > 128))
      )
        return respond('Invalid name or room');
      const requested = typeof input.token === 'string' ? input.token : '';
      let session = requested ? sessions.get(requested) : undefined;
      if (requested && !session)
        return respond('Saved session is no longer available');
      if (session && (session.socketId || session.roomId !== input.roomId))
        return respond('Session is in use or belongs to another room');
      let room = session
        ? rooms.get(session.roomId)
        : typeof input.roomId === 'string'
          ? rooms.get(input.roomId)
          : undefined;
      if (!session && input.roomId === null) {
        if (rooms.size >= roomLimit) return respond('Room limit reached');
        const id = randomUUID();
        room = {
          id,
          match: new Match(id, new RAPIER.World({ x: 0, y: 0, z: 0 })),
          intents: new IntentQueue(),
          sessions: new Map(),
          revision: 0,
        };
        rooms.set(id, room);
      }
      if (!room) return respond('Room unavailable');
      if (session) {
        if (!room.match.accept({ kind: 'connect', playerId: session.playerId }))
          return respond('Session unavailable');
        activeToken = requested;
      } else {
        const playerId = randomUUID();
        if (
          !room.match.accept({
            kind: 'join',
            playerId,
            name: input.name.trim(),
          })
        )
          return respond('Room is full or already started');
        activeToken = randomBytes(32).toString('hex');
        session = { playerId, socketId: null, roomId: room.id };
        sessions.set(activeToken, session);
        room.sessions.set(activeToken, session);
      }
      active = session;
      active.socketId = socket.id;
      socket.emit('session', {
        matchId: room.id,
        playerId: active.playerId,
        token: activeToken,
      });
      socket.emit('content', content.registry.publicContent());
      respond(null);
      publishRooms();
    }),
  );
  socket.on('intent', (payload: unknown, reply: unknown) => {
    const room = active ? rooms.get(active.roomId) : undefined;
    let ack: Acknowledgment = {
      sequence: null,
      status: 'rejected',
      reason: 'Session unavailable',
    };
    if (room && active?.socketId === socket.id)
      ack = room.intents.accept(
        payload,
        { playerId: active.playerId, matchId: room.id },
        (intent) => room.match.authorize(intent),
      );
    if (typeof reply === 'function') reply(ack);
  });
  socket.on('start-match', () =>
    enqueue(() => {
      const room = active ? rooms.get(active.roomId) : undefined;
      if (
        room &&
        active?.socketId === socket.id &&
        room.sessions.values().next().value?.playerId === active.playerId
      )
        room.match.accept({ kind: 'start' });
    }),
  );
  socket.on('return-to-lobby', () =>
    enqueue(() => {
      const room = active ? rooms.get(active.roomId) : undefined;
      if (
        !room ||
        !active ||
        active.socketId !== socket.id ||
        room.sessions.values().next().value?.playerId !== active.playerId
      )
        return;
      const phase = room.match.view(active.playerId)?.phase;
      if (phase !== 'finished' && phase !== 'aborted') return;
      const previous = room.match;
      const roster = previous.roster();
      const next = new Match(
        room.id,
        new RAPIER.World({ x: 0, y: 0, z: 0 }),
        undefined,
        undefined,
        room.revision + 1,
      );
      for (const player of roster) {
        if (
          !next.accept({ kind: 'join', playerId: player.id, name: player.name })
        ) {
          next.dispose();
          throw new Error('Could not restore room roster');
        }
        if (!player.connected)
          next.accept({ kind: 'disconnect', playerId: player.id });
      }
      room.match = next;
      room.intents = new IntentQueue();
      previous.dispose();
      publishRooms();
    }),
  );
  socket.on('loaded', (success: unknown, revision: unknown) =>
    enqueue(() => {
      const room = active ? rooms.get(active.roomId) : undefined;
      if (
        room &&
        active?.socketId === socket.id &&
        typeof success === 'boolean' &&
        typeof revision === 'number' &&
        Number.isSafeInteger(revision)
      )
        room.match.accept({
          kind: success ? 'loaded' : 'loading-failed',
          playerId: active.playerId,
          revision,
        });
    }),
  );
  socket.on('leave-room', () =>
    enqueue(() => {
      const room = active ? rooms.get(active.roomId) : undefined;
      if (
        !room ||
        !active ||
        active.socketId !== socket.id ||
        !room.match.accept({ kind: 'leave', playerId: active.playerId })
      )
        return;
      room.intents.discardPlayer(active.playerId);
      room.sessions.delete(activeToken);
      sessions.delete(activeToken);
      active = null;
      activeToken = '';
      socket.emit('left-room');
      if (!room.sessions.size) removeRoom(room);
      else publishRooms();
    }),
  );
  socket.on('disconnect', () =>
    enqueue(() => {
      if (!active || active.socketId !== socket.id) return;
      const room = rooms.get(active.roomId);
      active.socketId = null;
      room?.intents.discardPlayer(active.playerId);
      room?.match.accept({ kind: 'disconnect', playerId: active.playerId });
      publishRooms();
    }, true),
  );
});
server.on('error', (error) => {
  console.error('Host startup failed:', error.message);
  process.exitCode = 1;
  clearInterval(timer);
  for (const room of rooms.values()) room.match.dispose();
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
const timer = setInterval(() => {
  const now = performance.now();
  for (const command of commands.splice(0)) command();
  backlog += now - previous;
  previous = now;
  if (backlog > 250) backlog = 250;
  for (const room of rooms.values()) {
    try {
      room.match.syncWallClock(now);
      for (const intent of room.intents.drain()) {
        const applied = room.match.consume(intent);
        if (intent.kind === 'choice' || intent.kind === 'reroll') {
          const session = [...room.sessions.values()].find(
            (item) => item.playerId === intent.playerId,
          );
          if (session?.socketId)
            io.to(session.socketId).emit('intent-result', {
              sequence: intent.sequence,
              status: applied ? 'applied' : 'rejected',
            });
        }
      }
      let remaining = backlog;
      while (remaining >= stepMs) {
        room.match.advance(stepMs);
        remaining -= stepMs;
      }
      room.match.syncWallClock(now);
      if (now >= nextObservation) {
        room.revision++;
        for (const session of room.sessions.values()) {
          if (!session.socketId) continue;
          const observation = observe(
            room.match,
            session.playerId,
            room.revision,
            performance.timeOrigin + performance.now(),
          );
          if (observation) {
            const socketId = session.socketId;
            const socket = io.sockets.sockets.get(socketId);
            const offer = observation.state.offer;
            if (offer)
              socket
                ?.timeout(1000)
                .emit('observation', observation, (error: Error | null) => {
                  if (!error && session.socketId === socketId)
                    room.match.markSelectionDisplayed(
                      session.playerId,
                      offer.id,
                      offer.revision,
                    );
                });
            else socket?.emit('observation', observation);
          }
        }
        const first = room.sessions.values().next().value;
        const phase = first && room.match.view(first.playerId)?.phase;
        if (
          (phase === 'finished' || phase === 'aborted') &&
          [...room.sessions.values()].every((item) => !item.socketId)
        )
          removeRoom(room);
      }
    } catch (error) {
      console.error(`Room ${room.id} failed:`, error);
      room.match.accept({ kind: 'abort' });
    }
  }
  backlog %= stepMs;
  if (now >= nextObservation) {
    nextObservation = now + 50;
    publishRooms();
  }
}, 10);
function shutdown() {
  if (stopping) return;
  stopping = true;
  clearInterval(timer);
  io.close(() => {
    for (const room of rooms.values()) room.match.dispose();
  });
  server.closeAllConnections();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
