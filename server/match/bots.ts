import type { Terrain } from '../../shared/movement.js';
import type { Point } from '../../shared/arena.js';
import type { createCraft } from './physics/hover.js';
import type { Status } from './combat.js';
import {
  SOURCE_ENEMIES,
  type SourceLoot,
  type SourceWeights,
} from '../content/source-balance.js';
import type { ResourceRarity } from './economy.js';

export type AllyKind = 'wild' | 'charmed' | 'summoned' | 'offspring' | 'decoy';
export type BotRole = 'forager' | 'hunter' | 'scavenger';
export type Bot = {
  id: string;
  kind: AllyKind;
  expiresAt: number | null;
  damage: number;
  speedFactor: number;
  tier: number;
  role: BotRole;
  biome: Terrain;
  ownerId: string | null;
  elite: boolean;
  health: number;
  statuses: Status[];
  maxHealth: number;
  plating: number;
  archetype: string | null;
  loot: SourceLoot | null;
  craft: ReturnType<typeof createCraft>;
  targetId: string | null;
  hostileToBots: boolean;
  windupUntil: number | null;
  readyAt: number;
  charmReadyAt: number;
  forageAt: number;
  home: Point;
  friendship: { playerId: string; until: number } | null;
  friendshipReadyAt: number;
  waypoint: Point | null;
  waypointTarget: string | null;
  waypointAt: number;
};

export function sourceEnemyProfile(
  biome: Terrain,
  role: BotRole,
  tier: number,
  alpha: boolean,
  serial: number,
) {
  // Species selection remains a multiplayer adaptation. Stats come from each variant.
  const choices =
    role === 'forager'
      ? biome === 'water'
        ? ['Blobfish']
        : biome === 'snow'
          ? ['SnowHare']
          : ['HatBirb', 'Turtoid']
      : role === 'scavenger'
        ? ['Thief', 'Mimic']
        : biome === 'water'
          ? ['Spitfish']
          : biome === 'sand'
            ? ['Sandshark']
            : ['Beeware', 'Spiderfrog', 'Pantther'];
  const archetype = choices[Math.floor((serial - 1) / 4) % choices.length];
  const stage = tier >= 3 ? 'late' : tier >= 2 ? 'mid' : 'early';
  const profile =
    archetype && SOURCE_ENEMIES[archetype]?.[stage + (alpha ? 'Alpha' : '')];
  if (!profile || !archetype) throw new Error('Missing source enemy profile');
  return { ...profile, archetype };
}

function weightedNumber(table: SourceWeights): number {
  let roll =
    Math.random() * table.m_values.reduce((sum, value) => sum + value, 0);
  for (let index = 0; index < table.m_keys.length; index++) {
    roll -= table.m_values[index] ?? 0;
    if (roll < 0) return table.m_keys[index] ?? 0;
  }
  return 0;
}

export function enemyLoot(loot: SourceLoot | null) {
  if (!loot) return { rarities: [] as ResourceRarity[], currency: 0 };
  const rarities: ResourceRarity[] = [];
  const count = weightedNumber(loot.counts);
  const rows = Object.entries(loot.rarities) as [ResourceRarity, number][];
  for (let index = 0; index < count; index++) {
    let roll =
      Math.random() * rows.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [rarity, weight] of rows) {
      roll -= weight;
      if (roll < 0) {
        rarities.push(rarity);
        break;
      }
    }
  }
  return { rarities, currency: weightedNumber(loot.currency) };
}
export const BOT_RULES = {
  count: 4,
  maxCount: 64,
  maxElites: 2,
  speed: 0.55,
  aggro: 18,
  attackRange: 2,
  windup: 600,
  cooldown: 1800,
  forageInterval: 4000,
  spawnInterval: 1000,
} as const;

// Time-based estimates, independent of player level.
export const BOT_STAGES = [
  { at: 0, population: 4, tier: 1 },
  { at: 6 * 60_000, population: 6, tier: 2 },
  { at: 12 * 60_000, population: 8, tier: 3 },
] as const;

export const ALLY_LIMITS = {
  total: 96,
  summoned: 4,
  offspring: 8,
  decoy: 2,
  pending: 16,
} as const;
