import { io, type Socket } from 'socket.io-client';
import type {
  Observation,
  SessionRejection,
} from '../../../shared/protocol/index.js';

export type Session = { matchId: string; playerId: string; token: string };

export function connectSession(
  onObservation: (observation: Observation) => void,
  onStatus: (status: string, session: Session | null) => void,
): {
  sendControl: (control: {
    x: number;
    y: number;
    aim: number;
    buttons: number;
  }) => void;
  disconnect: () => void;
} {
  let session: Session | null = null;
  let token = sessionStorage.getItem('ycce-session');
  let rejection: SessionRejection | null = null;
  const savedSequence = Number(sessionStorage.getItem('ycce-sequence'));
  const storedSequence =
    Number.isSafeInteger(savedSequence) && savedSequence >= 0
      ? savedSequence
      : 0;
  let sequence = Math.max(storedSequence, Date.now() * 1000);
  const socket: Socket = io({
    auth: (callback) => callback(token ? { token } : {}),
  });
  socket.on('session', (next: Session) => {
    rejection = null;
    session = next;
    token = next.token;
    sessionStorage.setItem('ycce-session', next.token);
    onStatus('Connected', next);
  });
  socket.on('observation', onObservation);
  socket.on('session-rejected', (message: { reason: SessionRejection }) => {
    rejection = message.reason;
  });
  socket.on('connect_error', () => onStatus('Connecting', session));
  socket.on('disconnect', (reason) => {
    if (
      reason === 'io server disconnect' &&
      rejection === 'unknown-session' &&
      token
    ) {
      sessionStorage.removeItem('ycce-session');
      token = null;
      session = null;
      rejection = null;
      onStatus('Connecting', null);
      socket.connect();
      return;
    }
    const message =
      rejection === 'session-in-use'
        ? 'Session already connected'
        : rejection === 'match-full'
          ? 'Match is full'
          : 'Disconnected';
    onStatus(message, session);
  });
  return {
    sendControl(control) {
      if (!socket.connected || !session) return;
      sequence += 1;
      sessionStorage.setItem('ycce-sequence', String(sequence));
      socket.emit('intent', {
        ...control,
        kind: 'control',
        matchId: session.matchId,
        playerId: session.playerId,
        sequence,
      });
    },
    disconnect() {
      socket.removeAllListeners();
      socket.disconnect();
    },
  };
}
