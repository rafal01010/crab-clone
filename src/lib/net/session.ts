import { io, type Socket } from 'socket.io-client';
import type {
  IntentAction,
  Observation,
} from '../../../shared/protocol/index.js';
import type { MatchPhase } from '../../../shared/match.js';

export type Session = { matchId: string; playerId: string; token: string };
export type RoomSummary = { id: string; players: number; phase: MatchPhase };
export type ConnectionState = {
  kind: 'connecting' | 'restoring' | 'connected' | 'disconnected';
  message: string | null;
};
type Saved = Session & { name: string; hostId: string | null };
type JoinRequest = { roomId: string | null; name: string; token?: string };
const SESSION_KEY = 'ycce-room-session';
const SEQUENCE_KEY = 'ycce-sequence';

function readStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // The active tab can still resume with its in-memory identity.
  }
}

function readSavedSession(): Saved | null {
  try {
    const value: unknown = JSON.parse(readStorage(SESSION_KEY) ?? 'null');
    if (
      value &&
      typeof value === 'object' &&
      'matchId' in value &&
      typeof value.matchId === 'string' &&
      'playerId' in value &&
      typeof value.playerId === 'string' &&
      'token' in value &&
      typeof value.token === 'string' &&
      /^[a-f0-9]{64}$/.test(value.token) &&
      'name' in value &&
      typeof value.name === 'string' &&
      value.name.trim() &&
      value.name.trim().length <= 24
    )
      return {
        matchId: value.matchId,
        playerId: value.playerId,
        token: value.token,
        name: value.name,
        hostId:
          'hostId' in value && typeof value.hostId === 'string'
            ? value.hostId
            : null,
      };
  } catch {
    return null;
  }
  return null;
}

export function connectSession(
  onObservation: (observation: Observation) => boolean,
  onStatus: (status: ConnectionState, session: Session | null) => void,
  onRooms: (rooms: RoomSummary[]) => void,
) {
  let session: Session | null = null;
  let saved = readSavedSession();
  let hostId: string | null = null;
  let lastPhase: MatchPhase | null = null;
  let lastObservation:
    | (Pick<Observation, 'timestamp' | 'revision'> & {
        roundId: string;
      })
    | null = null;
  let closedRoomMessage: string | null = null;
  let pendingJoin: JoinRequest | null = null;
  let state: ConnectionState = { kind: 'connecting', message: null };
  const storedSequence = Number(readStorage(SEQUENCE_KEY));
  let sequence = Math.max(
    Number.isSafeInteger(storedSequence) ? storedSequence : 0,
    Date.now() * 1000,
  );
  const socket: Socket = io();
  const pendingTransactions = new Map<number, (applied: boolean) => void>();
  let pendingDisplay: {
    id: string;
    revision: number;
    frame: number;
    acknowledge: () => void;
  } | null = null;
  function cancelDisplay() {
    if (pendingDisplay) cancelAnimationFrame(pendingDisplay.frame);
    pendingDisplay = null;
  }
  function clearPendingWork() {
    cancelDisplay();
    for (const finish of pendingTransactions.values()) finish(false);
  }
  function publish(
    kind: ConnectionState['kind'],
    message: string | null = null,
  ) {
    state = { kind, message };
    onStatus(state, session);
  }
  function clearRoom() {
    clearPendingWork();
    session = null;
    saved = null;
    lastPhase = null;
    lastObservation = null;
    writeStorage(SESSION_KEY, null);
  }
  function dropTransport() {
    clearPendingWork();
    pendingJoin = null;
    session = null;
    hostId = null;
    // A heartbeat can expire before the disconnect event reaches this handler.
    socket.sendBuffer.length = 0;
  }
  function nextSequence() {
    sequence += 1;
    writeStorage(SEQUENCE_KEY, String(sequence));
    return sequence;
  }
  function canCommand() {
    return socket.connected && state.kind === 'connected' ? session : null;
  }
  function acknowledgeAfterPaint(
    id: string,
    revision: number,
    acknowledge: () => void,
  ) {
    if (pendingDisplay?.id === id && pendingDisplay.revision === revision) {
      pendingDisplay.acknowledge = acknowledge;
      return;
    }
    cancelDisplay();
    const display = {
      id,
      revision,
      acknowledge,
      frame: requestAnimationFrame(() => {
        display.frame = requestAnimationFrame(() => {
          pendingDisplay = null;
          if (canCommand()) display.acknowledge();
        });
      }),
    };
    pendingDisplay = display;
  }
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
  function join(request: JoinRequest) {
    if (!socket.connected || !hostId || pendingJoin || session) return;
    pendingJoin = request;
    publish(
      'restoring',
      request.token ? 'Restoring your room.' : 'Joining the room.',
    );
    socket
      .timeout(5000)
      .emit(
        'join-room',
        request,
        (timeout: Error | null, error?: string | null) => {
          if (pendingJoin !== request) return;
          if (timeout || !error) {
            publish(
              'disconnected',
              'The host did not confirm the room. Retry the connection.',
            );
            return;
          }
          pendingJoin = null;
          if (!request.token) {
            publish('connected', error);
          } else if (error === 'Session is in use or belongs to another room') {
            publish(
              'disconnected',
              'This room session is still connected. Close any other tab using it, then retry the connection.',
            );
          } else {
            clearRoom();
            closedRoomMessage =
              'Your previous room has closed. Create or join a room to play again.';
            publish('connected', closedRoomMessage);
          }
        },
      );
  }
  socket.on('host-session', (nextHostId: string) => {
    if (typeof nextHostId !== 'string' || !socket.connected) return;
    if (saved?.hostId && saved.hostId !== nextHostId) {
      clearRoom();
      closedRoomMessage =
        'The host restarted. Your previous room ended. Create or join a room to play again.';
    }
    hostId = nextHostId;
    if (saved)
      join({ roomId: saved.matchId, name: saved.name, token: saved.token });
    else publish('connected', closedRoomMessage);
  });
  socket.on('session', (next: Session) => {
    if (!hostId || !pendingJoin || !socket.connected) return;
    session = next;
    saved = { ...next, name: pendingJoin.name, hostId };
    pendingJoin = null;
    closedRoomMessage = null;
    writeStorage(SESSION_KEY, JSON.stringify(saved));
    publish('restoring', 'Waiting for the current room state.');
  });
  socket.on('left-room', () => {
    clearRoom();
    publish('connected');
  });
  socket.on('rooms', onRooms);
  socket.on(
    'observation',
    (observation: Observation, acknowledge?: () => void) => {
      if (!session || observation.matchId !== session.matchId) return;
      if (
        lastObservation &&
        (observation.timestamp < lastObservation.timestamp ||
          observation.revision <= lastObservation.revision)
      )
        return;
      const accepted = onObservation(observation);
      if (!accepted) return;
      const { roundId, offer } = observation.state;
      if (lastObservation && lastObservation.roundId !== roundId)
        clearPendingWork();
      lastObservation = {
        roundId,
        timestamp: observation.timestamp,
        revision: observation.revision,
      };
      lastPhase = observation.state.phase;
      if (state.kind === 'restoring') publish('connected');
      if (offer && typeof acknowledge === 'function')
        acknowledgeAfterPaint(offer.id, offer.revision, acknowledge);
      else cancelDisplay();
    },
  );
  socket.on('connect_error', () => {
    publish(
      'disconnected',
      closedRoomMessage ??
        (lastPhase === 'running'
          ? 'Cannot reach the host. Your craft remains vulnerable while the host is running.'
          : 'Cannot reach the host. Check its LAN address and whether it is running.'),
    );
  });
  socket.on('room-error', (message: unknown) => {
    if (typeof message === 'string' && canCommand())
      publish('connected', message);
  });
  socket.on('host-shutdown', (acknowledge?: () => void) => {
    const wasPlaying = lastPhase === 'running';
    closedRoomMessage = wasPlaying
      ? 'Connection to the host was lost when it shut down. The match ended. Restart the host to play again.'
      : 'Connection to the host was lost when it shut down. Restart the host to play again.';
    dropTransport();
    clearRoom();
    onRooms([]);
    publish('disconnected', closedRoomMessage);
    if (typeof acknowledge === 'function') acknowledge();
  });
  socket.on('disconnect', () => {
    dropTransport();
    onRooms([]);
    publish(
      'disconnected',
      closedRoomMessage ??
        (lastPhase === 'running'
          ? 'Connection lost. Your craft remains vulnerable if the host is still running.'
          : 'Connection to the host was lost. Keep this page open to reconnect.'),
    );
  });
  function send(intent: IntentAction) {
    const active = canCommand();
    if (!active) return;
    const transport = intent.kind === 'control' ? socket.volatile : socket;
    transport.emit('intent', {
      ...intent,
      matchId: active.matchId,
      playerId: active.playerId,
      sequence: nextSequence(),
    });
  }
  function sendTransaction(intent: IntentAction): Promise<boolean> {
    const active = canCommand();
    if (!active) return Promise.resolve(false);
    const currentSequence = nextSequence();
    const timeoutMs = 5000;
    return new Promise((resolve) => {
      const timeout = setTimeout(() => finish(false), timeoutMs);
      function finish(applied: boolean) {
        clearTimeout(timeout);
        pendingTransactions.delete(currentSequence);
        resolve(applied);
      }
      pendingTransactions.set(currentSequence, finish);
      socket.timeout(timeoutMs).emit(
        'intent',
        {
          ...intent,
          matchId: active.matchId,
          playerId: active.playerId,
          sequence: currentSequence,
        },
        (error: Error | null, ack: unknown) => {
          if (
            error ||
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
      if (state.kind === 'connected' && !saved) join({ roomId, name });
    },
    reconnect() {
      if (
        state.kind === 'connected' ||
        (state.kind === 'restoring' && pendingJoin)
      )
        return;
      if (socket.connected) socket.disconnect();
      publish('connecting', closedRoomMessage ?? 'Reconnecting to the host.');
      socket.connect();
    },
    leave() {
      if (canCommand()) socket.emit('leave-room');
    },
    ready(ready: boolean) {
      send({ kind: 'ready', ready });
    },
    scan(targetId: string) {
      send({ kind: 'scan', targetId });
    },
    useFirmware(targetId: string) {
      return sendTransaction({ kind: 'use-firmware', targetId });
    },
    shelter(targetId: string) {
      return sendTransaction({ kind: 'shelter', targetId });
    },
    charm(targetId: string) {
      send({ kind: 'charm', targetId });
    },
    interact(targetId: string) {
      return sendTransaction({ kind: 'interaction', targetId });
    },
    spectate(targetId: string) {
      send({ kind: 'spectate', targetId });
    },
    start() {
      if (canCommand()) socket.emit('start-match');
    },
    finishMatch() {
      if (canCommand()) socket.emit('finish-match');
    },
    returnToLobby() {
      if (!canCommand()) return;
      publish('connected');
      socket.emit('return-to-lobby');
    },
    loaded(success: boolean, revision: number) {
      if (canCommand()) socket.emit('loaded', success, revision);
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
      dropTransport();
      socket.removeAllListeners();
      socket.disconnect();
    },
  };
}
