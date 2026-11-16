import type { Terrain } from '../../shared/movement.js';
import type { Point } from '../../shared/arena.js';
import type { createCraft } from './physics/hover.js';
import type { Status } from './combat.js';

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
  craft: ReturnType<typeof createCraft>;
  targetId: string | null;
  hostileToBots: boolean;
  windupUntil: number | null;
  readyAt: number;
  charmReadyAt: number;
  forageAt: number;
  waypoint: Point | null;
  waypointTarget: string | null;
  waypointAt: number;
};
export const BOT_RULES = {
  count: 4,
  maxCount: 8,
  maxElites: 2,
  health: 30,
  damage: 4,
  speed: 0.55,
  aggro: 10,
  attackRange: 2,
  windup: 600,
  cooldown: 1800,
  forageInterval: 4000,
  spawnInterval: 15000,
} as const;

// Time-based estimates, independent of player level.
export const BOT_STAGES = [
  { at: 0, population: 4, tier: 1 },
  { at: 6 * 60_000, population: 6, tier: 2 },
  { at: 12 * 60_000, population: 8, tier: 3 },
] as const;

export const ALLY_LIMITS = {
  total: 32,
  summoned: 4,
  offspring: 8,
  decoy: 2,
  pending: 16,
} as const;
