import type { Terrain } from '../../shared/movement.js';
import type { LightPhase } from './world-clock.js';

import {
  THERMAL_RULES,
  type RegionalWeather,
  type WeatherKind,
} from '../../shared/weather.js';

type Schedule = {
  biome: Terrain;
  kind: WeatherKind;
  offset: number;
  cycle: number;
  warning: number;
  duration: number;
};
// Provisional durations in milliseconds. Heatwaves are scheduled within each day.
export const WEATHER_SCHEDULE: readonly Schedule[] = [
  {
    biome: 'grass',
    kind: 'rain',
    offset: 15_000,
    cycle: 160_000,
    warning: 15_000,
    duration: 60_000,
  },
  {
    biome: 'water',
    kind: 'rain',
    offset: 65_000,
    cycle: 200_000,
    warning: 15_000,
    duration: 60_000,
  },
  {
    biome: 'sand',
    kind: 'heatwave',
    offset: 30_000,
    cycle: 150_000,
    warning: 15_000,
    duration: 60_000,
  },
  {
    biome: 'snow',
    kind: 'blizzard',
    offset: 35_000,
    cycle: 180_000,
    warning: 15_000,
    duration: 60_000,
  },
];

export function regionalWeather(
  now: number,
  clock: {
    phase: LightPhase;
    phaseStartedAt: number;
    nextTransitionAt: number;
  },
): RegionalWeather[] {
  return WEATHER_SCHEDULE.flatMap((schedule) => {
    if (schedule.kind === 'heatwave' && clock.phase !== 'day') return [];
    const origin = schedule.kind === 'heatwave' ? clock.phaseStartedAt : 0;
    const elapsed = now - origin - schedule.offset;
    if (elapsed < 0) return [];
    const cycleStart =
      origin +
      schedule.offset +
      Math.floor(elapsed / schedule.cycle) * schedule.cycle;
    const startsAt = cycleStart + schedule.warning;
    const endsAt = Math.min(
      startsAt + schedule.duration,
      schedule.kind === 'heatwave' ? clock.nextTransitionAt : Infinity,
    );
    if (now >= endsAt || startsAt >= endsAt) return [];
    const state = now < startsAt ? 'warning' : 'active';
    const intensity =
      state === 'warning'
        ? 0
        : schedule.kind === 'blizzard' && clock.phase === 'night'
          ? THERMAL_RULES.nightBlizzardMultiplier
          : 1;
    return [
      {
        biome: schedule.biome,
        kind: schedule.kind,
        state,
        startsAt,
        endsAt,
        intensity,
      },
    ];
  });
}
