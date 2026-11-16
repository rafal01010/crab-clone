import { io, type Socket } from 'socket.io-client';
import type { Observation } from '../../../shared/protocol/index.js';
import type { MatchPhase } from '../../../shared/match.js';

export type Session = { matchId: string; playerId: string; token: string };
export type RoomSummary = { id: string; players: number; phase: MatchPhase };
type Saved = Session & { name: string };

export function connectSession(
  onObservation: (observation: Observation) => boolean,
  onStatus: (status: string, session: Session | null) => void,
  onRooms: (rooms: RoomSummary[]) => void,
) {
  let session: Session | null = null;
  let saved: Saved | null = null;
  try {
    saved = JSON.parse(sessionStorage.getItem('ycce-room-session') ?? 'null');
  } catch {
    sessionStorage.removeItem('ycce-room-session');
  }
  let sequence = Math.max(
    Number(sessionStorage.getItem('ycce-sequence')) || 0,
    Date.now() * 1000,
  );
  const socket: Socket = io();
  const pendingTransactions = new Map<number, (applied: boolean) => void>();
  socket.on('intent-result', (result: unknown) => {
    if (
      !result ||
      typeof result !== 'object' ||
      !('sequence' in result) ||
      !('status' in result)
    )
      return;
    if (
      typeof result.sequence !== 'number' ||
      (result.status !== 'applied' && result.status !== 'rejected')
    )
      return;
    pendingTransactions.get(result.sequence)?.(result.status === 'applied');
  });
  function join(roomId: string | null, name: string, token?: string) {
    if (socket.connected) onStatus('Connected', session);
    socket.emit(
      'join-room',
      { roomId, name, ...(token ? { token } : {}) },
      (error: string | null) => {
        if (error) {
          if (token && error === 'Saved session is no longer available') {
            saved = null;
            sessionStorage.removeItem('ycce-room-session');
          }
          onStatus(error, session);
        }
      },
    );
  }
  socket.on('connect', () => {
    onStatus('Connected', session);
    if (saved) join(saved.matchId, saved.name, saved.token);
  });
  socket.on('session', (next: Session) => {
    session = next;
    const name = saved?.name ?? pendingName;
    saved = { ...next, name };
    sessionStorage.setItem('ycce-room-session', JSON.stringify(saved));
    onStatus('Connected', next);
  });
  socket.on('left-room', () => {
    session = null;
    saved = null;
    sessionStorage.removeItem('ycce-room-session');
    onStatus('Connected', null);
  });
  socket.on('rooms', onRooms);
  socket.on(
    'observation',
    (observation: Observation, acknowledge?: () => void) => {
      const accepted = onObservation(observation);
      if (accepted && typeof acknowledge === 'function')
        requestAnimationFrame(() => requestAnimationFrame(acknowledge));
    },
  );
  socket.on('connect_error', () => onStatus('Connecting', session));
  socket.on('room-error', (message: unknown) => {
    if (typeof message === 'string') onStatus(message, session);
  });
  socket.on('disconnect', () => {
    for (const finish of pendingTransactions.values()) finish(false);
    onStatus('Disconnected', session);
  });
  let pendingName = '';
  function send(intent: object) {
    if (!socket.connected || !session) return;
    sequence += 1;
    sessionStorage.setItem('ycce-sequence', String(sequence));
    socket.emit('intent', {
      ...intent,
      matchId: session.matchId,
      playerId: session.playerId,
      sequence,
    });
  }
  function sendTransaction(intent: object): Promise<boolean> {
    if (!socket.connected || !session) return Promise.resolve(false);
    sequence += 1;
    const currentSequence = sequence;
    sessionStorage.setItem('ycce-sequence', String(sequence));
    return new Promise((resolve) => {
      const timeout = setTimeout(() => finish(false), 5000);
      function finish(applied: boolean) {
        clearTimeout(timeout);
        pendingTransactions.delete(currentSequence);
        resolve(applied);
      }
      pendingTransactions.set(currentSequence, finish);
      socket.emit(
        'intent',
        {
          ...intent,
          matchId: session?.matchId,
          playerId: session?.playerId,
          sequence: currentSequence,
        },
        (ack: unknown) => {
          if (
            !ack ||
            typeof ack !== 'object' ||
            !('status' in ack) ||
            ack.status !== 'queued'
          )
            finish(false);
        },
      );
    });
  }
  return {
    join(roomId: string | null, name: string) {
      if (saved) {
        onStatus(
          'Saved session is already in use. Reconnect to that room.',
          session,
        );
        return;
      }
      pendingName = name;
      join(roomId, name);
    },
    leave() {
      socket.emit('leave-room');
    },
    ready(ready: boolean) {
      send({ kind: 'ready', ready });
    },
    scan(targetId: string) {
      send({ kind: 'scan', targetId });
    },
    useFirmware(targetId: string) {
      send({ kind: 'use-firmware', targetId });
    },
    shelter(targetId: string) {
      send({ kind: 'shelter', targetId });
    },
    charm(targetId: string) {
      send({ kind: 'charm', targetId });
    },
    interact(targetId: string) {
      send({ kind: 'interaction', targetId });
    },
    spectate(targetId: string) {
      send({ kind: 'spectate', targetId });
    },
    start() {
      socket.emit('start-match');
    },
    finishMatch() {
      socket.emit('finish-match');
    },
    returnToLobby() {
      if (socket.connected) onStatus('Connected', session);
      socket.emit('return-to-lobby');
    },
    loaded(success: boolean, revision: number) {
      socket.emit('loaded', success, revision);
    },
    equip(offerId: string, revision: number, slot: string, contentId: string) {
      return sendTransaction({
        kind: 'equipment',
        offerId,
        revision,
        slot,
        contentId,
      });
    },
    choose(offerId: string, revision: number, choiceId: string) {
      return sendTransaction({ kind: 'choice', offerId, revision, choiceId });
    },
    reroll(offerId: string, revision: number) {
      return sendTransaction({ kind: 'reroll', offerId, revision });
    },
    upgradeRarity(offerId: string, revision: number) {
      return sendTransaction({ kind: 'upgrade-rarity', offerId, revision });
    },
    sendControl(control: {
      x: number;
      y: number;
      aim: number;
      buttons: number;
    }) {
      send({ ...control, kind: 'control' });
    },
    disconnect() {
      for (const finish of pendingTransactions.values()) finish(false);
      socket.removeAllListeners();
      socket.disconnect();
    },
  };
}
