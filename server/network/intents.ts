import type { Acknowledgment, Intent } from '../../shared/protocol/index.js';

type Session = { playerId: string; matchId: string };
const text = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= 128;
const integer = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const finite = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

export class IntentQueue {
  readonly #last = new Map<string, number>();
  readonly #queue: Intent[] = [];
  accept(
    input: unknown,
    session: Session,
    authorize: (intent: Intent) => boolean,
  ): Acknowledgment {
    const reject = (
      reason: string,
      sequence: number | null = null,
    ): Acknowledgment => ({ sequence, status: 'rejected', reason });
    if (!input || typeof input !== 'object' || Array.isArray(input))
      return reject('invalid message');
    const item = Object.fromEntries(Object.entries(input));
    if (Object.keys(item).length > 10 || !integer(item.sequence))
      return reject('invalid envelope');
    const fields: Record<string, readonly string[]> = {
      control: ['x', 'y', 'aim', 'buttons'],
      choice: ['offerId', 'revision', 'choiceId'],
      reroll: ['offerId', 'revision'],
      equipment: ['slot', 'contentId'],
      interaction: ['targetId'],
      spectate: ['targetId'],
      ready: ['ready'],
      resume: ['token'],
    };
    if (typeof item.kind !== 'string' || !Object.hasOwn(fields, item.kind))
      return reject('unknown intent', item.sequence);
    const allowed = new Set([
      'kind',
      'matchId',
      'playerId',
      'sequence',
      ...(fields[item.kind] ?? []),
    ]);
    if (Object.keys(item).some((key) => !allowed.has(key)))
      return reject('unexpected field', item.sequence);
    const sequence = item.sequence;
    if (item.playerId !== session.playerId || item.matchId !== session.matchId)
      return reject('unauthorized', sequence);
    if (sequence <= (this.#last.get(session.playerId) ?? -1))
      return reject('stale sequence', sequence);
    if (this.#queue.length >= 1024) return reject('queue full', sequence);
    const base = {
      playerId: session.playerId,
      matchId: session.matchId,
      sequence,
    };
    let intent: Intent;
    switch (item.kind) {
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
          item.buttons > 255
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
        if (!text(item.offerId) || !integer(item.revision))
          return reject('invalid reroll', sequence);
        intent = {
          ...base,
          kind: 'reroll',
          offerId: item.offerId,
          revision: item.revision,
        };
        break;
      case 'equipment':
        if (!text(item.slot) || !text(item.contentId))
          return reject('invalid equipment', sequence);
        intent = {
          ...base,
          kind: 'equipment',
          slot: item.slot,
          contentId: item.contentId,
        };
        break;
      case 'interaction':
      case 'spectate':
        if (!text(item.targetId))
          return reject('invalid interaction', sequence);
        intent = { ...base, kind: item.kind, targetId: item.targetId };
        break;
      case 'ready':
        if (typeof item.ready !== 'boolean')
          return reject('invalid ready', sequence);
        intent = { ...base, kind: 'ready', ready: item.ready };
        break;
      case 'resume':
        if (!text(item.token)) return reject('invalid resume', sequence);
        intent = { ...base, kind: 'resume', token: item.token };
        break;
      default:
        return reject('unknown intent', sequence);
    }
    if (!authorize(intent)) return reject('intent unavailable', sequence);
    this.#last.set(session.playerId, sequence);
    this.#queue.push(intent);
    return { sequence, status: 'queued' };
  }
  drain(): Intent[] {
    return this.#queue.splice(0);
  }
  discardPlayer(playerId: string): void {
    for (let index = this.#queue.length - 1; index >= 0; index--) {
      if (this.#queue[index]?.playerId === playerId)
        this.#queue.splice(index, 1);
    }
  }
}
