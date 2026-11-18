import {
  CONTROL_BUTTON,
  type Acknowledgment,
  type Intent,
} from '../../shared/protocol/index.js';
import { TrafficBudget } from './traffic-budget.js';

type Session = { playerId: string; matchId: string };
type PlayerTraffic = {
  lastSequence: number;
  pending: number;
  actions: TrafficBudget;
};
const intentFields = {
  control: ['x', 'y', 'aim', 'buttons'],
  choice: ['offerId', 'revision', 'choiceId'],
  reroll: ['offerId', 'revision'],
  'upgrade-rarity': ['offerId', 'revision'],
  equipment: ['offerId', 'revision', 'slot', 'contentId'],
  interaction: ['targetId'],
  scan: ['targetId'],
  'use-firmware': ['targetId'],
  shelter: ['targetId'],
  charm: ['targetId'],
  spectate: ['targetId'],
  ready: ['ready'],
} satisfies Record<Exclude<Intent['kind'], 'resume'>, readonly string[]>;
const envelopeFields = ['kind', 'matchId', 'playerId', 'sequence'];
const controlMask = Object.values(CONTROL_BUTTON).reduce(
  (mask, button) => mask | button,
  0,
);
const maxPendingPerPlayer = 16;
const text = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= 128;
const integer = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const finite = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);
const isPacket = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isIntentKind = (kind: unknown): kind is keyof typeof intentFields =>
  typeof kind === 'string' && Object.hasOwn(intentFields, kind);

export class IntentQueue {
  readonly #traffic = new Map<string, PlayerTraffic>();
  #queue: Intent[] = [];
  accept(
    item: unknown,
    session: Session,
    authorize: (intent: Intent) => boolean,
  ): Acknowledgment {
    const reject = (
      reason: string,
      sequence: number | null = null,
    ): Acknowledgment => ({ sequence, status: 'rejected', reason });
    if (!isPacket(item)) return reject('invalid message');
    if (!integer(item.sequence)) return reject('invalid envelope');
    const sequence = item.sequence;
    if (item.playerId !== session.playerId || item.matchId !== session.matchId)
      return reject('unauthorized', sequence);
    const traffic = this.#traffic.get(session.playerId);
    if (sequence <= (traffic?.lastSequence ?? -1))
      return reject('stale sequence', sequence);
    if (traffic && traffic.pending >= maxPendingPerPlayer)
      return reject('queue full', sequence);
    if (!isIntentKind(item.kind)) return reject('unknown intent', sequence);
    const kind = item.kind;
    const fields: readonly string[] = intentFields[kind];
    const keys = Object.keys(item);
    if (
      keys.length !== envelopeFields.length + fields.length ||
      keys.some((key) => !envelopeFields.includes(key) && !fields.includes(key))
    )
      return reject('invalid fields', sequence);
    const base = {
      playerId: session.playerId,
      matchId: session.matchId,
      sequence,
    };
    let intent: Intent;
    switch (kind) {
      case 'control':
        if (
          !finite(item.x) ||
          Math.abs(item.x) > 1 ||
          !finite(item.y) ||
          Math.abs(item.y) > 1 ||
          Math.hypot(item.x, item.y) > 1.000001 ||
          !finite(item.aim) ||
          Math.abs(item.aim) > Math.PI * 2 ||
          !integer(item.buttons) ||
          item.buttons > controlMask ||
          (item.buttons & ~controlMask) !== 0
        )
          return reject('invalid control', sequence);
        intent = {
          ...base,
          kind: 'control',
          x: item.x,
          y: item.y,
          aim: item.aim,
          buttons: item.buttons,
        };
        break;
      case 'choice':
        if (
          !text(item.offerId) ||
          !integer(item.revision) ||
          !text(item.choiceId)
        )
          return reject('invalid choice', sequence);
        intent = {
          ...base,
          kind: 'choice',
          offerId: item.offerId,
          revision: item.revision,
          choiceId: item.choiceId,
        };
        break;
      case 'reroll':
      case 'upgrade-rarity':
        if (!text(item.offerId) || !integer(item.revision))
          return reject('invalid reroll', sequence);
        intent = {
          ...base,
          kind,
          offerId: item.offerId,
          revision: item.revision,
        };
        break;
      case 'equipment':
        if (
          !text(item.offerId) ||
          !integer(item.revision) ||
          !text(item.slot) ||
          !text(item.contentId)
        )
          return reject('invalid equipment', sequence);
        intent = {
          ...base,
          kind: 'equipment',
          offerId: item.offerId,
          revision: item.revision,
          slot: item.slot,
          contentId: item.contentId,
        };
        break;
      case 'interaction':
      case 'scan':
      case 'use-firmware':
      case 'shelter':
      case 'charm':
      case 'spectate':
        if (!text(item.targetId))
          return reject('invalid interaction', sequence);
        intent = { ...base, kind, targetId: item.targetId };
        break;
      case 'ready':
        if (typeof item.ready !== 'boolean')
          return reject('invalid ready', sequence);
        intent = { ...base, kind: 'ready', ready: item.ready };
        break;
    }
    const playerTraffic = traffic ?? {
      lastSequence: -1,
      pending: 0,
      actions: new TrafficBudget(12, 8),
    };
    if (!traffic) this.#traffic.set(session.playerId, playerTraffic);
    if (kind !== 'control' && !playerTraffic.actions.take())
      return reject('rate limited', sequence);
    if (!authorize(intent)) return reject('intent unavailable', sequence);
    playerTraffic.lastSequence = sequence;
    playerTraffic.pending++;
    this.#queue.push(intent);
    return { sequence, status: 'queued' };
  }
  drain(): Intent[] {
    const pending = this.#queue;
    this.discardPending();
    return pending;
  }
  discardPending(): void {
    this.#queue = [];
    for (const traffic of this.#traffic.values()) traffic.pending = 0;
  }
  discardPlayer(playerId: string): void {
    for (let index = this.#queue.length - 1; index >= 0; index--) {
      if (this.#queue[index]?.playerId === playerId)
        this.#queue.splice(index, 1);
    }
    const traffic = this.#traffic.get(playerId);
    if (traffic) traffic.pending = 0;
  }
  removePlayer(playerId: string): void {
    this.discardPlayer(playerId);
    this.#traffic.delete(playerId);
  }
}
