import { absorbDamage, type Health } from './health.js';
import type { Stats } from './stats.js';

export type DamageChannel =
  | 'direct'
  | 'contact'
  | 'corrosion'
  | 'self'
  | 'environmental'
  | 'meteor'
  | 'deferred'
  | 'boundary';
export type DamageEvent = {
  targetId: string;
  ownerId: string | null;
  channel: DamageChannel;
  amount: number;
  depth: number;
  vulnerability?: number;
  impulse?: { x: number; z: number };
  bypassPlating?: boolean;
  origin?: 'manual';
  abilityId?: string;
  credit?: { ownerId: string | null; kind: 'player' | 'ally' | 'third-party' };
};
export type DamageResult = {
  attempted: number;
  hull: number;
  plating: number;
  dodged: boolean;
};

export const MAX_CAUSAL_DEPTH = 8;

export function reflectedDamage(
  event: DamageEvent,
  result: DamageResult,
  reflection: number,
): DamageEvent | null {
  const actual = result.hull + result.plating;
  if (
    !event.ownerId ||
    event.ownerId === event.targetId ||
    event.channel === 'boundary' ||
    event.channel === 'deferred' ||
    event.depth >= MAX_CAUSAL_DEPTH ||
    reflection <= 0 ||
    actual <= 0
  )
    return null;
  return {
    targetId: event.ownerId,
    ownerId: event.targetId,
    channel: 'direct',
    amount: actual * reflection,
    depth: event.depth + 1,
  };
}

export function applyDamage(
  health: Health,
  stats: Stats,
  event: DamageEvent,
  protectedFromDamage: boolean,
  roll: number,
  defer?: {
    fraction: number;
    schedule: (amount: number, bypassPlating: boolean) => boolean;
  },
): DamageResult {
  if (
    !Number.isFinite(event.amount) ||
    event.amount < 0 ||
    (event.vulnerability !== undefined &&
      (!Number.isFinite(event.vulnerability) || event.vulnerability < 0))
  )
    throw new Error('Invalid damage amount');
  const result: DamageResult = {
    attempted: event.amount,
    hull: 0,
    plating: 0,
    dodged: false,
  };
  if (health.hull <= 0) return result;
  const boundary = event.channel === 'boundary';
  const deferred = event.channel === 'deferred';
  if (!boundary && !deferred && protectedFromDamage) return result;
  const dodgeable = event.channel === 'direct' || event.channel === 'contact';
  if (dodgeable && roll < stats.dodge / 100) {
    result.dodged = true;
    return result;
  }
  const resistance =
    boundary || deferred
      ? 0
      : event.channel === 'corrosion'
        ? stats.poisonResistance
        : event.channel === 'meteor'
          ? stats.cataclysmResistance
          : stats.damageResistance;
  let damage =
    event.amount *
    (boundary || deferred ? 1 : (event.vulnerability ?? 1)) *
    Math.max(0, 1 - resistance / 100);
  const bypassPlating =
    boundary ||
    event.channel === 'corrosion' ||
    event.channel === 'environmental' ||
    ((deferred || event.channel === 'direct' || event.channel === 'contact') &&
      event.bypassPlating === true);
  if (!boundary && !deferred && defer && damage > 0) {
    const postponed = damage * defer.fraction;
    if (postponed > 0 && defer.schedule(postponed, bypassPlating))
      damage -= postponed;
  }
  const before = health.plating;
  result.hull = absorbDamage(health, damage, bypassPlating);
  result.plating = before - health.plating;
  return result;
}

export type StatusKind = 'corrosion' | 'slow' | 'stun' | 'heat' | 'cold';
export type Status = {
  kind: StatusKind;
  ownerId: string | null;
  magnitude: number;
  expiresAt: number;
  nextTick: number;
  tickIntervalMs: number;
};

export function addStatus(
  statuses: Status[],
  input: {
    kind: StatusKind;
    ownerId: string | null;
    magnitude: number;
    duration: number;
    tickIntervalMs?: number;
  },
  now: number,
): void {
  if (
    !Number.isFinite(input.magnitude) ||
    input.magnitude < 0 ||
    !Number.isFinite(input.duration) ||
    input.duration <= 0 ||
    input.duration > 300000 ||
    (input.tickIntervalMs !== undefined &&
      (!Number.isFinite(input.tickIntervalMs) ||
        input.tickIntervalMs < 250 ||
        input.tickIntervalMs > 10000))
  )
    throw new Error('Invalid status');
  const existing =
    input.kind === 'corrosion'
      ? undefined
      : statuses.find(
          (status) =>
            status.kind === input.kind && status.ownerId === input.ownerId,
        );
  if (existing) {
    existing.expiresAt = Math.max(existing.expiresAt, now + input.duration);
    existing.magnitude = Math.max(existing.magnitude, input.magnitude);
    existing.tickIntervalMs = input.tickIntervalMs ?? 1000;
    existing.nextTick = Math.min(
      existing.nextTick,
      now + existing.tickIntervalMs,
    );
  } else {
    if (statuses.length >= 128) {
      const oldest = statuses.reduce(
        (selected, status, index) =>
          status.kind === 'corrosion' &&
          (selected < 0 || status.expiresAt < statuses[selected]!.expiresAt)
            ? index
            : selected,
        -1,
      );
      if (oldest < 0) throw new Error('Status limit reached');
      statuses.splice(oldest, 1);
    }
    statuses.push({
      kind: input.kind,
      ownerId: input.ownerId,
      magnitude: input.magnitude,
      expiresAt: now + input.duration,
      nextTick: now + (input.tickIntervalMs ?? 1000),
      tickIntervalMs: input.tickIntervalMs ?? 1000,
    });
  }
}

export function advanceStatuses(
  statuses: Status[],
  targetId: string,
  now: number,
): DamageEvent[] {
  const events: DamageEvent[] = [];
  for (const status of statuses) {
    if (
      status.kind === 'corrosion' ||
      status.kind === 'heat' ||
      status.kind === 'cold'
    ) {
      const lastTick = Math.min(now, status.expiresAt);
      let emitted = 0;
      while (status.nextTick <= lastTick && emitted < 32) {
        events.push({
          targetId,
          ownerId: status.ownerId,
          channel: status.kind === 'corrosion' ? 'corrosion' : 'environmental',
          amount: status.magnitude,
          depth: 0,
        });
        status.nextTick += status.tickIntervalMs;
        emitted++;
      }
      if (status.nextTick <= lastTick)
        status.nextTick +=
          (Math.floor((lastTick - status.nextTick) / status.tickIntervalMs) +
            1) *
          status.tickIntervalMs;
    }
  }
  for (let index = statuses.length - 1; index >= 0; index--)
    if ((statuses[index]?.expiresAt ?? 0) <= now) statuses.splice(index, 1);
  return events;
}
