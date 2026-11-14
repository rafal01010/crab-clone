import type { createCraft } from './physics/hover.js';

export type Bot = {
  id: string;
  tier: number;
  health: number;
  maxHealth: number;
  craft: ReturnType<typeof createCraft>;
  targetId: string | null;
  hostileToBots: boolean;
  windupUntil: number | null;
  readyAt: number;
};
export const BOT_RULES = {
  count: 4,
  health: 30,
  damage: 4,
  speed: 0.55,
  aggro: 10,
  attackRange: 2,
  windup: 600,
  cooldown: 1800,
} as const;
