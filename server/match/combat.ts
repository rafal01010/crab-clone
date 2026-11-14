import { absorbDamage, type Health } from './health.js';
import type { Stats } from './stats.js';

export type DamageChannel =
  | 'direct'
  | 'contact'
  | 'corrosion'
  | 'self'
  | 'environmental'
  | 'meteor'
  | 'boundary';
export type DamageEvent = {
  targetId: string;
  ownerId: string | null;
  channel: DamageChannel;
  amount: number;
  depth: number;
  vulnerability?: number;
  impulse?: { x: number; z: number };
};
export type DamageResult = {
  attempted: number;
  hull: number;
  plating: number;
  dodged: boolean;
};

export function applyDamage(
  health: Health,
  stats: Stats,
  event: DamageEvent,
  protectedFromDamage: boolean,
  roll: number,
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
  if (!boundary && protectedFromDamage) return result;
  const dodgeable = event.channel === 'direct' || event.channel === 'contact';
  if (dodgeable && roll < stats.dodge / 100) {
    result.dodged = true;
    return result;
  }
  const resistance = boundary
    ? 0
    : event.channel === 'corrosion'
      ? stats.poisonResistance
      : event.channel === 'meteor'
        ? stats.cataclysmResistance
        : stats.damageResistance;
  const damage =
    event.amount *
    (boundary ? 1 : (event.vulnerability ?? 1)) *
    Math.max(0, 1 - resistance / 100);
  const before = health.plating;
  result.hull = absorbDamage(
    health,
    damage,
    boundary ||
      event.channel === 'corrosion' ||
      event.channel === 'environmental',
  );
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
};

export function addStatus(
  statuses: Status[],
  input: {
    kind: StatusKind;
    ownerId: string | null;
    magnitude: number;
    duration: number;
  },
  now: number,
): void {
  if (
    !Number.isFinite(input.magnitude) ||
    input.magnitude < 0 ||
    !Number.isFinite(input.duration) ||
    input.duration <= 0 ||
    input.duration > 300000
  )
    throw new Error('Invalid status');
  const existing = statuses.find(
    (status) => status.kind === input.kind && status.ownerId === input.ownerId,
  );
  if (existing) {
    existing.expiresAt = Math.max(existing.expiresAt, now + input.duration);
    existing.magnitude = Math.max(existing.magnitude, input.magnitude);
  } else {
    if (statuses.length >= 128) throw new Error('Status limit reached');
    statuses.push({
      kind: input.kind,
      ownerId: input.ownerId,
      magnitude: input.magnitude,
      expiresAt: now + input.duration,
      nextTick: now + 1000,
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
      while (status.nextTick <= now && status.nextTick <= status.expiresAt) {
        events.push({
          targetId,
          ownerId: status.ownerId,
          channel: status.kind === 'corrosion' ? 'corrosion' : 'environmental',
          amount: status.magnitude,
          depth: 0,
        });
        status.nextTick += 1000;
      }
    }
  }
  for (let index = statuses.length - 1; index >= 0; index--)
    if ((statuses[index]?.expiresAt ?? 0) <= now) statuses.splice(index, 1);
  return events;
}
