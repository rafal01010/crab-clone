export type Movement = { x: number; y: number };
export type HorizontalVelocity = { x: number; z: number };

export const MOVEMENT = { speed: 7, acceleration: 24 } as const;

export function controlledVelocity(
  velocity: HorizontalVelocity,
  input: Movement,
  dt: number,
): HorizontalVelocity {
  const dx = input.x * MOVEMENT.speed - velocity.x;
  const dz = input.y * MOVEMENT.speed - velocity.z;
  const change = Math.hypot(dx, dz);
  const scale = change ? Math.min(1, (MOVEMENT.acceleration * dt) / change) : 0;
  return { x: velocity.x + dx * scale, z: velocity.z + dz * scale };
}

export type Terrain = 'grass' | 'sand' | 'snow' | 'water';
export function terrainSpeedMultiplier(
  terrain: Terrain,
  adaptation: number,
  specificAdaptation = 0,
): number {
  const penalty = { grass: 0, sand: 0.25, snow: 0.25, water: 0.5 }[terrain];
  const resistance =
    Math.max(0, Math.min(100, adaptation + specificAdaptation)) / 100;
  return 1 - penalty * (1 - resistance);
}
