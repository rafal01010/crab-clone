import { initialStartingStats } from '../content/starting.js';

// Percent-valued stats retain the source's 100-based units.
export const BASE_STATS = {
  physical: 10,
  ability: 10,
  maximumHealth: 50,
  social: 5,
  speed: 5,
  damage: 100,
  cooldowns: 100,
  attackArea: 100,
  attackPenalty: 100,
  size: 100,
  regeneration: 0,
  plating: 0,
  damageResistance: 0,
  poisonResistance: 0,
  dodge: 0,
  heatAdaptation: 0,
  coldAdaptation: 0,
  progress: 100,
  passiveProgress: 0,
  salvageSpeed: 100,
  salvageReach: 1,
  terrainAdaptation: 0,
  senses: 100,
  sandAdaptation: 0,
  snowAdaptation: 0,
  waterAdaptation: 0,
  sprintSpeed: 100,
  sprintRecovery: 100,
  dashCooldown: 100,
  poisonDamage: 100,
  shieldedResistance: 0,
  soakAdaptation: 0,
  stunResistance: 0,
  stunDuration: 100,
  cataclysmResistance: 0,
  temporaryInvulnerability: 0,
  healthFoodMaximumHealth: 0,
  vegetationProgress: 100,
  meatProgress: 100,
  fishProgress: 100,
  carrionProgress: 100,
  progressRequirement: 100,
  additionalPoisonTicks: 0,
  poisonTickSpeed: 100,
  alphaDamage: 100,
  effectArea: 100,
  statChange: 100,
} as const;
export type Stat = keyof typeof BASE_STATS;
export type Stats = Record<Stat, number>;
export type StatModifier = {
  id: string;
  stat: Stat;
  add: number;
  multiplier: number;
};

// Caps with no pinned-version evidence are provisional balance limits.
const STAT_LIMITS: Partial<Record<Stat, readonly [number, number]>> = {
  maximumHealth: [1, 999],
  physical: [0, 999],
  ability: [0, 999],
  regeneration: [0, 300],
  plating: [0, 999],
  size: [0, 300],
  dodge: [0, 75],
  damageResistance: [0, 100],
  poisonResistance: [0, 100],
  salvageSpeed: [0, 500],
  senses: [0, 500],
};

export function deriveStats(
  modifiers: readonly StatModifier[],
  level: number,
): Stats {
  if (!Number.isSafeInteger(level) || level < 1)
    throw new Error('Invalid level');
  const stats: Stats = { ...BASE_STATS };
  stats.maximumHealth += initialStartingStats().maximumHealthBonus + level - 1;
  const ordered = [...modifiers].sort((a, b) => {
    if (a.id !== b.id) return a.id < b.id ? -1 : 1;
    return a.stat === b.stat ? 0 : a.stat < b.stat ? -1 : 1;
  });
  const seen = new Set<string>();
  const additions: Partial<Record<Stat, number>> = {};
  const multipliers: Partial<Record<Stat, number>> = {};
  for (const modifier of ordered) {
    const key = `${modifier.id}\0${modifier.stat}`;
    if (
      !modifier.id ||
      seen.has(key) ||
      !Object.hasOwn(stats, modifier.stat) ||
      !Number.isFinite(modifier.add) ||
      !Number.isFinite(modifier.multiplier) ||
      modifier.multiplier < 0
    )
      throw new Error('Invalid stat modifier');
    seen.add(key);
    additions[modifier.stat] = (additions[modifier.stat] ?? 0) + modifier.add;
    multipliers[modifier.stat] =
      (multipliers[modifier.stat] ?? 1) * modifier.multiplier;
  }
  for (const stat of Object.keys(BASE_STATS) as Stat[]) {
    const value =
      (stats[stat] + (additions[stat] ?? 0)) * (multipliers[stat] ?? 1);
    if (!Number.isFinite(value)) throw new Error('Stat modifier overflow');
    const [min, max] = STAT_LIMITS[stat] ?? [0, Infinity];
    stats[stat] = Math.min(max, Math.max(min, value));
  }
  return stats;
}
