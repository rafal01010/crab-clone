import type { Terrain } from './movement.js';

export type WeatherKind = 'rain' | 'heatwave' | 'blizzard';
export type RegionalWeather = {
  biome: Terrain;
  kind: WeatherKind;
  state: 'warning' | 'active';
  startsAt: number;
  endsAt: number;
  intensity: number;
};
export type ThermalExposure = { heat: number; cold: number };
export const THERMAL_RULES = {
  buildupPerSecond: 5,
  recoveryPerSecond: 8,
  heatDamagePerSecond: 3,
  coldDamagePerSecond: 2,
  nightBlizzardMultiplier: 1.5,
  coldSpeedFactor: 0.7,
} as const;
