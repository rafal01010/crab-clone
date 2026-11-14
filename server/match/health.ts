import type { Stats } from './stats.js';

export type Health = { hull: number; plating: number; level: number };
export type Repair = {
  attempted: number;
  actual: number;
  consumed: boolean;
  consumedAtFullHealth: boolean;
};
export function initialHealth(stats: Stats): Health {
  return { hull: stats.maximumHealth, plating: stats.plating, level: 1 };
}
export function updateHealthStats(health: Health, stats: Stats): void {
  health.hull = Math.min(health.hull, stats.maximumHealth);
  health.plating = Math.min(health.plating, stats.plating);
}
export function gainLevels(
  health: Health,
  level: number,
  stats: Stats,
): boolean {
  if (health.hull <= 0 || !Number.isSafeInteger(level) || level <= health.level)
    return false;
  health.level = level;
  updateHealthStats(health, stats);
  health.plating = stats.plating;
  return true;
}
export function repair(
  health: Health,
  stats: Stats,
  amount: number,
  consumeAtFull: boolean,
): Repair {
  if (!Number.isFinite(amount) || amount < 0)
    throw new Error('Invalid repair amount');
  const wasFull = health.hull > 0 && health.hull >= stats.maximumHealth;
  const actual =
    health.hull > 0
      ? Math.min(amount, Math.max(0, stats.maximumHealth - health.hull))
      : 0;
  health.hull += actual;
  return {
    attempted: amount,
    actual,
    consumed: actual > 0 || (wasFull && consumeAtFull),
    consumedAtFullHealth: wasFull && consumeAtFull,
  };
}
export function absorbDamage(
  health: Health,
  amount: number,
  bypassPlating = false,
): number {
  if (!Number.isFinite(amount) || amount < 0)
    throw new Error('Invalid damage amount');
  if (health.hull <= 0) return 0;
  const absorbed = bypassPlating ? 0 : Math.min(health.plating, amount);
  health.plating -= absorbed;
  const hullDamage = Math.min(health.hull, amount - absorbed);
  health.hull -= hullDamage;
  return hullDamage;
}
