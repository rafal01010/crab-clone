import { test } from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { once } from 'node:events';

const url = 'http://127.0.0.1:3217';
function connect() {
  return io(url, { forceNew: true, reconnection: false });
}
function join(socket, roomId, name, token) {
  return new Promise((resolve) =>
    socket.emit(
      'join-room',
      { roomId, name, ...(token ? { token } : {}) },
      resolve,
    ),
  );
}
function nextObservation(socket, predicate) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off('observation', on);
      reject(new Error('observation timed out'));
    }, 5000);
    function on(value) {
      if (predicate(value.state)) {
        clearTimeout(timeout);
        socket.off('observation', on);
        resolve(value.state);
      }
    }
    socket.on('observation', on);
  });
}

test(
  'two rooms isolate state, reject stolen identity, and enforce the room limit',
  { timeout: 20000 },
  async () => {
    const sockets = Array.from({ length: 7 }, connect);
    try {
      await Promise.all(sockets.map((s) => once(s, 'connect')));
      const s0 = once(sockets[0], 'session');
      assert.equal(await join(sockets[0], null, 'Host A'), null);
      const [a] = await s0;
      const s1 = once(sockets[1], 'session');
      assert.equal(await join(sockets[1], null, 'Host B'), null);
      const [b] = await s1;
      assert.notEqual(a.matchId, b.matchId);
      assert.equal(await join(sockets[2], null, 'Extra'), 'Room limit reached');
      assert.equal(
        await join(sockets[2], a.matchId, 'Impostor', a.token),
        'Session is in use or belongs to another room',
      );
      assert.equal(
        await join(sockets[2], a.matchId, 'Impostor', 'not-a-valid-session'),
        'Saved session is no longer available',
      );
      const sessions = new Map([[0, a]]);
      for (const [i, name] of [
        [2, 'A2'],
        [3, 'A3'],
        [4, 'A4'],
      ]) {
        const event = once(sockets[i], 'session');
        assert.equal(await join(sockets[i], a.matchId, name), null);
        sessions.set(i, (await event)[0]);
      }
      assert.equal(
        await join(sockets[5], a.matchId, 'Overflow'),
        'Room is full or already started',
      );
      assert.equal(await join(sockets[6], b.matchId, 'B2'), null);
      const viewA = await nextObservation(
        sockets[0],
        (s) => s.players.length === 4,
      );
      const viewB = await nextObservation(
        sockets[1],
        (s) => s.players.length === 2,
      );
      assert.deepEqual(viewA.players.map((p) => p.name).sort(), [
        'A2',
        'A3',
        'A4',
        'Host A',
      ]);
      assert.deepEqual(viewB.players.map((p) => p.name).sort(), [
        'B2',
        'Host B',
      ]);
      const response = await new Promise((resolve) =>
        sockets[1].emit(
          'intent',
          {
            kind: 'ready',
            matchId: a.matchId,
            playerId: a.playerId,
            sequence: 1,
            ready: true,
          },
          resolve,
        ),
      );
      assert.equal(response.status, 'rejected');
      assert.equal(
        await join(sockets[5], b.matchId, 'Wrong room', a.token),
        'Session is in use or belongs to another room',
      );
      for (const i of [0, 2, 3, 4]) {
        const session = sessions.get(i);
        const ack = await new Promise((resolve) =>
          sockets[i].emit(
            'intent',
            {
              kind: 'ready',
              matchId: a.matchId,
              playerId: session.playerId,
              sequence: 1,
              ready: true,
            },
            resolve,
          ),
        );
        assert.equal(ack.status, 'queued');
      }
      await nextObservation(sockets[0], (s) => s.players.every((p) => p.ready));
      sockets[0].emit('start-match');
      const loading = await nextObservation(
        sockets[0],
        (s) => s.phase === 'loading',
      );
      assert.equal(
        (await nextObservation(sockets[1], (s) => s.phase === 'lobby')).players
          .length,
        2,
      );
      for (const i of [0, 2, 3])
        sockets[i].emit('loaded', true, loading.loadingRevision);
      assert.equal(
        (await nextObservation(sockets[0], (s) => s.phase === 'loading')).phase,
        'loading',
      );
      sockets[4].emit('loaded', false, loading.loadingRevision);
      assert.equal(
        (await nextObservation(sockets[0], (s) => s.phase === 'lobby')).players
          .length,
        4,
      );
      assert.equal(
        (await nextObservation(sockets[1], (s) => s.phase === 'lobby')).players
          .length,
        2,
      );
      const left1 = once(sockets[1], 'left-room'),
        left2 = once(sockets[6], 'left-room');
      sockets[1].emit('leave-room');
      sockets[6].emit('leave-room');
      await Promise.all([left1, left2]);
      assert.equal(await join(sockets[5], null, 'Replacement'), null);
    } finally {
      for (const socket of sockets) socket.disconnect();
    }
  },
);
