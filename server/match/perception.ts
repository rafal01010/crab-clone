import type { Point } from '../../shared/arena.js';
import type { RadarHint } from '../../shared/match.js';
import type { RegionalWeather } from '../../shared/weather.js';
import type { LightPhase } from './world-clock.js';

export function sightRange(
  senses: number,
  phase: LightPhase,
  localWeather: RegionalWeather | undefined,
): number {
  if (phase === 'day') return 96;
  const nightRange = Math.max(8, Math.min(38, 8 + Math.max(0, senses) * 0.06));
  return localWeather?.state === 'active' &&
    (localWeather.kind === 'rain' || localWeather.kind === 'blizzard')
    ? nightRange * 0.8
    : nightRange;
}
export function radarRange(senses: number): number {
  return Math.max(14, Math.min(80, 14 + Math.max(0, senses) * 0.2));
}
export function radarHint(
  kind: RadarHint['kind'],
  origin: Point,
  target: Point,
  range: number,
): RadarHint | null {
  const dx = target.x - origin.x;
  const dz = target.z - origin.z;
  const distance = Math.hypot(dx, dz);
  if (distance > range || distance < 0.01) return null;
  const directions: RadarHint['direction'][] = [
    'N',
    'NE',
    'E',
    'SE',
    'S',
    'SW',
    'W',
    'NW',
  ];
  const direction =
    directions[(Math.round(Math.atan2(dx, -dz) / (Math.PI / 4)) + 8) % 8] ??
    'N';
  return {
    kind,
    direction,
    distance:
      distance < range / 3
        ? 'near'
        : distance < (range * 2) / 3
          ? 'mid'
          : 'far',
  };
}
