import { initialStartingStats } from '../content/starting.js';
import {
  SOURCE_BASE_STATS,
  SOURCE_STAT_LIMITS,
} from '../content/source-balance.js';

// Percent-valued stats retain the source's 100-based units.
export const BASE_STATS = {
  passiveProgress: 0,
  firmwareIdentification: 0,
  temporaryInvulnerability: 0,
  repairFoodChance: 0,
  robust: 0,
  shifty: 0,
  spines: 0,
  platingHitFactor: 0,
  vegetationProgress: 100,
  meatProgress: 100,
  fishProgress: 100,
  carrionProgress: 100,
  progressRequirement: 100,
  ...SOURCE_BASE_STATS,
} as const;
export type Stat = keyof typeof BASE_STATS;
export type Stats = Record<Stat, number>;
export type StatModifier = {
  id: string;
  stat: Stat;
  add: number;
  multiplier: number;
};

// Imported bounds use project percentage units. Progress requirement is the inverse reduction stat.
const STAT_LIMITS: Partial<Record<Stat, readonly [number, number]>> = {
  ...SOURCE_STAT_LIMITS,
  progressRequirement: [25, 100],
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
