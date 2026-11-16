import type { Point } from '../../shared/arena.js';
import type { Stat } from './stats.js';
import type { Terrain } from '../../shared/movement.js';

export type PoiReward =
  | { kind: 'repair'; fraction: number }
  | { kind: 'progress'; levels: number }
  | { kind: 'stat'; stat: Stat; add: number; multiplier: number }
  | { kind: 'random-stat'; multiplier: number }
  | { kind: 'adaptation'; amount: number }
  | { kind: 'temporary-resistance'; amount: number; duration: number }
  | { kind: 'nest-salvage' }
  | { kind: 'recruit' }
  | { kind: 'defend-nest' }
  | { kind: 'currency'; amount: number }
  | { kind: 'upgrade'; rarity: 'rare' | 'legendary'; cost: number }
  | { kind: 'clock'; dayMs: number; nightMs: number }
  | { kind: 'firmware-spawn'; percent: number }
  | { kind: 'cancel' };
export type PoiOption = { id: string; label: string; reward: PoiReward };
export type PointOfInterestKind =
  | 'algae-reef'
  | 'carved-tree'
  | 'chaos-tree'
  | 'frozen-specimen'
  | 'growing-tree'
  | 'giant-mushroom'
  | 'healing-pond'
  | 'lotus-plant'
  | 'mud-pond'
  | 'oasis'
  | 'sun-dial'
  | 'unattended-nest';
export type PointOfInterest = {
  id: string;
  kind: PointOfInterestKind;
  position: Point;
  discoveredBy: Set<string>;
  protectionSpent: Map<string, number>;
  claim:
    | { kind: 'available' }
    | {
        kind: 'reserved';
        playerId: string;
        startedAt: number;
        expiresAt: number;
      }
    | { kind: 'claimed'; playerId: string };
};

export const POI_DISCOVERY_RANGE = 8;
export const POI_INTERACTION_RANGE = 3;
export const POI_RESERVATION_MS = 10_000;
export const POI_CLOCK_CHANGE_MS = 30_000;
export const RANDOM_POI_STATS: readonly Stat[] = [
  'physical',
  'ability',
  'maximumHealth',
  'speed',
  'regeneration',
];

const stat = (
  id: string,
  label: string,
  stat: Stat,
  add: number,
  multiplier = 1,
): PoiOption => ({
  id,
  label,
  reward: { kind: 'stat', stat, add, multiplier },
});
const options: Record<PointOfInterestKind, readonly PoiOption[]> = {
  'algae-reef': [
    stat('hull', 'Increase maximum hull by 7', 'maximumHealth', 7),
    stat('ability', 'Increase ability damage by 1', 'ability', 1),
  ],
  'carved-tree': [
    {
      id: 'progress',
      label: 'Gain a level of progress',
      reward: { kind: 'progress', levels: 1 },
    },
    stat('physical', 'Increase physical damage by 1', 'physical', 1),
  ],
  'chaos-tree': [
    {
      id: 'random',
      label: 'Increase a random stat by 25%',
      reward: { kind: 'random-stat', multiplier: 1.25 },
    },
    {
      id: 'currency',
      label: 'Gain 5 currency',
      reward: { kind: 'currency', amount: 5 },
    },
  ],
  'frozen-specimen': [
    {
      id: 'recruit',
      label: 'Free a random companion',
      reward: { kind: 'recruit' },
    },
    {
      id: 'rare',
      label: 'Buy a rare upgrade for 5 currency',
      reward: { kind: 'upgrade', rarity: 'rare', cost: 5 },
    },
    {
      id: 'legendary',
      label: 'Buy a legendary upgrade for 15 currency',
      reward: { kind: 'upgrade', rarity: 'legendary', cost: 15 },
    },
  ],
  'giant-mushroom': [
    stat(
      'study',
      'Increase firmware identification by 10%',
      'firmwareIdentification',
      10,
    ),
    stat('dip', 'Add one corrosion tick', 'additionalPoisonTicks', 1),
    {
      id: 'spread',
      label: 'Increase firmware spawning by 10%',
      reward: { kind: 'firmware-spawn', percent: 10 },
    },
  ],
  'growing-tree': [
    stat('physical', 'Increase physical damage by 5%', 'physical', 0, 1.05),
    stat('ability', 'Increase ability damage by 5%', 'ability', 0, 1.05),
    {
      id: 'random',
      label: 'Increase a random stat by 10%',
      reward: { kind: 'random-stat', multiplier: 1.1 },
    },
  ],
  'healing-pond': [
    {
      id: 'repair',
      label: 'Repair 50% of maximum hull',
      reward: { kind: 'repair', fraction: 0.5 },
    },
    stat('regen', 'Increase regeneration by 1.5', 'regeneration', 1.5),
  ],
  'lotus-plant': [
    {
      id: 'progress',
      label: 'Gain a level of progress',
      reward: { kind: 'progress', levels: 1 },
    },
    stat('cooldown', 'Reduce cooldowns by 5%', 'cooldowns', 0, 0.95),
  ],
  'mud-pond': [
    {
      id: 'bath',
      label: 'Reduce damage for 60 seconds',
      reward: { kind: 'temporary-resistance', amount: 25, duration: 60_000 },
    },
    {
      id: 'adaptation',
      label: 'Increase heat and cold adaptation by 10',
      reward: { kind: 'adaptation', amount: 10 },
    },
    stat('tail', 'Increase social by 2 (requires Tail)', 'social', 2),
  ],
  'unattended-nest': [
    {
      id: 'defend',
      label: 'Defend the egg for one minute',
      reward: { kind: 'defend-nest' },
    },
    {
      id: 'crack',
      label: 'Release rare salvage, with a chance of an elite',
      reward: { kind: 'nest-salvage' },
    },
    stat('social', 'Increase social by 1', 'social', 1),
  ],
  oasis: [
    {
      id: 'repair',
      label: 'Repair 100% of maximum hull',
      reward: { kind: 'repair', fraction: 1 },
    },
    stat('regen', 'Increase regeneration by 3', 'regeneration', 3),
  ],
  'sun-dial': [
    {
      id: 'summer',
      label: 'Lengthen days and shorten nights',
      reward: {
        kind: 'clock',
        dayMs: POI_CLOCK_CHANGE_MS,
        nightMs: -POI_CLOCK_CHANGE_MS,
      },
    },
    {
      id: 'winter',
      label: 'Lengthen nights and shorten days',
      reward: {
        kind: 'clock',
        dayMs: -POI_CLOCK_CHANGE_MS,
        nightMs: POI_CLOCK_CHANGE_MS,
      },
    },
  ],
};
export function poiOptions(kind: PointOfInterestKind): readonly PoiOption[] {
  return options[kind];
}

export function createPointsOfInterest(
  positions: readonly Point[],
  biomeAt: (position: Point) => Terrain,
  seed: number,
): PointOfInterest[] {
  const byBiome: Record<Terrain, readonly PointOfInterestKind[]> = {
    grass: [
      'healing-pond',
      'giant-mushroom',
      'carved-tree',
      'chaos-tree',
      'growing-tree',
      'mud-pond',
    ],
    sand: [
      'sun-dial',
      'oasis',
      'chaos-tree',
      'mud-pond',
      'carved-tree',
      'unattended-nest',
    ],
    snow: [
      'frozen-specimen',
      'sun-dial',
      'healing-pond',
      'growing-tree',
      'carved-tree',
      'unattended-nest',
    ],
    water: ['algae-reef', 'lotus-plant'],
  };
  const counts: Record<Terrain, number> = {
    grass: 0,
    sand: 0,
    snow: 0,
    water: 0,
  };
  return positions.map((position, index) => {
    const biome = biomeAt(position);
    const kinds = byBiome[biome];
    const kind = kinds[(counts[biome]++ + (seed >>> 0)) % kinds.length];
    if (!kind) throw new Error('Missing point of interest type');
    return {
      id: `poi-${index + 1}`,
      kind,
      position: { ...position },
      discoveredBy: new Set(),
      protectionSpent: new Map(),
      claim: { kind: 'available' },
    };
  });
}
export function discoverPointOfInterest(
  point: PointOfInterest,
  playerId: string,
  position: Point,
): boolean {
  if (
    point.discoveredBy.has(playerId) ||
    distance(point, position) > POI_DISCOVERY_RANGE
  )
    return false;
  point.discoveredBy.add(playerId);
  return true;
}
export function distance(point: PointOfInterest, position: Point): number {
  return Math.hypot(
    point.position.x - position.x,
    point.position.z - position.z,
  );
}
export function remainingProtection(
  point: PointOfInterest,
  playerId: string,
): number {
  return Math.max(
    0,
    POI_RESERVATION_MS - (point.protectionSpent.get(playerId) ?? 0),
  );
}
export function releasePointOfInterest(
  point: PointOfInterest,
  playerId: string,
  now: number,
): void {
  if (point.claim.kind !== 'reserved' || point.claim.playerId !== playerId)
    return;
  const elapsed = Math.max(
    0,
    Math.min(now, point.claim.expiresAt) - point.claim.startedAt,
  );
  point.protectionSpent.set(
    playerId,
    Math.min(
      POI_RESERVATION_MS,
      (point.protectionSpent.get(playerId) ?? 0) + elapsed,
    ),
  );
  point.claim = { kind: 'available' };
}
export function releaseExpiredReservation(
  point: PointOfInterest,
  now: number,
): void {
  if (point.claim.kind === 'reserved' && now >= point.claim.expiresAt)
    releasePointOfInterest(point, point.claim.playerId, now);
}
export function reservePointOfInterest(
  point: PointOfInterest,
  playerId: string,
  position: Point,
  now: number,
): boolean {
  releaseExpiredReservation(point, now);
  const remaining = remainingProtection(point, playerId);
  if (
    point.claim.kind !== 'available' ||
    distance(point, position) > POI_INTERACTION_RANGE
  )
    return false;
  point.claim = {
    kind: 'reserved',
    playerId,
    startedAt: now,
    expiresAt: now + (remaining || POI_RESERVATION_MS),
  };
  return true;
}
