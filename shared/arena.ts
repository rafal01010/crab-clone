import type { Terrain } from './movement.js';

export type Point = { x: number; z: number };
export type TerrainRegion = Point & {
  terrain: Terrain;
  width: number;
  depth: number;
  waterDepth: 0 | 1 | 2;
};
export type ArenaBox = Point & { width: number; depth: number; height: number };
export type Arena = {
  seed: number;
  obstacles: ArenaBox[];
  spawns: { x: number; y: number; z: number }[];
  resources: Point[];
  shelters: Point[];
  poiSockets: Point[];
  eliteSites: Point[];
  terrain: TerrainRegion[];
};
export class ArenaGenerationError extends Error {}

export function terrainRegionAt(
  arena: Pick<Arena, 'terrain'>,
  x: number,
  z: number,
): TerrainRegion | undefined {
  return arena.terrain.findLast(
    (region) =>
      x >= region.x - region.width / 2 &&
      x < region.x + region.width / 2 &&
      z >= region.z - region.depth / 2 &&
      z < region.z + region.depth / 2,
  );
}

export function terrainAt(
  arena: Pick<Arena, 'terrain'>,
  x: number,
  z: number,
): Terrain {
  return terrainRegionAt(arena, x, z)?.terrain ?? 'grass';
}

// Grid centers have clearance for the standard craft and for each axis-aligned edge.
const GRID_STEP = 2;
const GRID_LIMIT = 14;
const CLEARANCE = 1;
function key(point: Point): string {
  return `${point.x},${point.z}`;
}
function cell(point: Point): Point {
  return {
    x: Math.max(
      -GRID_LIMIT,
      Math.min(GRID_LIMIT, Math.round(point.x / GRID_STEP)),
    ),
    z: Math.max(
      -GRID_LIMIT,
      Math.min(GRID_LIMIT, Math.round(point.z / GRID_STEP)),
    ),
  };
}
function position(point: Point): Point {
  return { x: point.x * GRID_STEP, z: point.z * GRID_STEP };
}
export function arenaPointClear(
  obstacles: readonly ArenaBox[],
  point: Point,
  clearance = CLEARANCE,
): boolean {
  return (
    Math.abs(point.x) <= 30 - clearance &&
    Math.abs(point.z) <= 30 - clearance &&
    obstacles.every(
      (box) =>
        Math.abs(point.x - box.x) >= box.width / 2 + clearance ||
        Math.abs(point.z - box.z) >= box.depth / 2 + clearance,
    )
  );
}

function reachable(
  obstacles: readonly ArenaBox[],
  start: Point,
  radius = Infinity,
): Map<string, Point | null> {
  const first = cell(start);
  const parents = new Map<string, Point | null>();
  const queue: Point[] = [first];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (!current) continue;
    const currentKey = key(current);
    if (parents.has(currentKey)) continue;
    const point = position(current);
    if (
      Math.abs(current.x) > GRID_LIMIT ||
      Math.abs(current.z) > GRID_LIMIT ||
      Math.hypot(point.x, point.z) > radius ||
      !arenaPointClear(obstacles, point)
    )
      continue;
    parents.set(currentKey, null);
    for (const next of [
      { x: current.x + 1, z: current.z },
      { x: current.x - 1, z: current.z },
      { x: current.x, z: current.z + 1 },
      { x: current.x, z: current.z - 1 },
    ]) {
      if (!parents.has(key(next))) queue.push(next);
    }
  }
  return parents;
}

export function nextArenaWaypoint(
  obstacles: readonly ArenaBox[],
  from: Point,
  to: Point,
  radius = Infinity,
): Point | null {
  const first = cell(from);
  const targetCell = cell(to);
  const options: Point[] = [];
  for (let x = targetCell.x - 2; x <= targetCell.x + 2; x++)
    for (let z = targetCell.z - 2; z <= targetCell.z + 2; z++) {
      const candidate = { x, z };
      const point = position(candidate);
      if (
        Math.abs(x) <= GRID_LIMIT &&
        Math.abs(z) <= GRID_LIMIT &&
        Math.hypot(point.x, point.z) <= radius &&
        arenaPointClear(obstacles, point)
      )
        options.push(candidate);
    }
  options.sort((a, b) => {
    const pa = position(a);
    const pb = position(b);
    return (
      Math.hypot(pa.x - to.x, pa.z - to.z) -
      Math.hypot(pb.x - to.x, pb.z - to.z)
    );
  });
  const destination = options[0];
  if (!destination) return null;
  const queue = [first];
  const parents = new Map<string, Point | null>([[key(first), null]]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (!current) continue;
    if (key(current) === key(destination)) {
      let step = current;
      let parent = parents.get(key(step));
      while (parent && key(parent) !== key(first)) {
        step = parent;
        parent = parents.get(key(step));
      }
      return key(step) === key(first) &&
        key(destination) === key(targetCell) &&
        arenaPointClear(obstacles, to, 0.5)
        ? to
        : position(step);
    }
    for (const next of [
      { x: current.x + 1, z: current.z },
      { x: current.x - 1, z: current.z },
      { x: current.x, z: current.z + 1 },
      { x: current.x, z: current.z - 1 },
    ]) {
      const nextKey = key(next);
      const point = position(next);
      if (
        parents.has(nextKey) ||
        Math.abs(next.x) > GRID_LIMIT ||
        Math.abs(next.z) > GRID_LIMIT ||
        Math.hypot(point.x, point.z) > radius ||
        !arenaPointClear(obstacles, point)
      )
        continue;
      parents.set(nextKey, current);
      queue.push(next);
    }
  }
  return null;
}

export function createArena(seed: number): Arena {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const spawns = [
    { x: -20, y: 0.25, z: -20 },
    { x: 20, y: 0.25, z: -20 },
    { x: -20, y: 0.25, z: 20 },
    { x: 20, y: 0.25, z: 20 },
  ];
  const terrains: Terrain[] = ['grass', 'sand', 'snow', 'water'];
  const offset = Math.floor(random() * terrains.length);
  const splitX = Math.floor(random() * 5 - 2) * 2;
  const splitZ = Math.floor(random() * 5 - 2) * 2;
  const terrain: TerrainRegion[] = spawns.map(({ x, z }, index) => ({
    terrain: terrains[(index + offset) % terrains.length] ?? 'grass',
    x: x < 0 ? (-31 + splitX) / 2 : (31 + splitX) / 2,
    z: z < 0 ? (-31 + splitZ) / 2 : (31 + splitZ) / 2,
    width: x < 0 ? 31 + splitX : 31 - splitX,
    depth: z < 0 ? 31 + splitZ : 31 - splitZ,
    waterDepth: 0,
  }));
  const water = terrain.find((region) => region.terrain === 'water');
  if (water) {
    terrain.push({
      ...water,
      x: water.x + Math.sign(water.x) * water.width * 0.1,
      z: water.z + Math.sign(water.z) * water.depth * 0.1,
      width: water.width * 0.6,
      depth: water.depth * 0.6,
      waterDepth: 1,
    });
    terrain.push({
      ...water,
      x: water.x + Math.sign(water.x) * water.width * 0.2,
      z: water.z + Math.sign(water.z) * water.depth * 0.2,
      width: water.width * 0.25,
      depth: water.depth * 0.25,
      waterDepth: 2,
    });
  }
  const obstacles: ArenaBox[] = [
    { x: 0, z: -31, width: 64, depth: 2, height: 2 },
    { x: 0, z: 31, width: 64, depth: 2, height: 2 },
    { x: -31, z: 0, width: 2, depth: 60, height: 2 },
    { x: 31, z: 0, width: 2, depth: 60, height: 2 },
  ];
  const resources = spawns.flatMap(({ x, z }) => [
    { x: x * 0.8, z: z * 0.8 },
    { x: x * 0.9, z: z * 0.5 },
  ]);
  const shelters = spawns.map(({ x, z }) => ({ x: x * 1.2, z: z * 0.6 }));
  const poiSockets = spawns.flatMap(({ x, z }) => [
    {
      x: x * 0.6 + (Math.floor(random() * 5) - 2) * 2,
      z: z * 1.2 + (Math.floor(random() * 5) - 2) * 2,
    },
    { x: x * 0.45, z: z * 0.85 },
    { x: x * 0.85, z: z * 0.3 },
  ]);
  const eliteSites = [
    { x: 0, z: -22 },
    { x: 22, z: 0 },
    { x: 0, z: 22 },
    { x: -22, z: 0 },
  ];
  const points = [
    ...spawns,
    ...resources,
    ...resources.map(({ x, z }) => ({ x: x + 1.5, z })),
    ...shelters,
    ...poiSockets,
    ...eliteSites,
    { x: 0, z: 0 },
  ];
  let valid = false;
  for (let attempt = 0; attempt < 32 && !valid; attempt++) {
    obstacles.splice(4);
    const rotation = random() * Math.PI * 2;
    for (let i = 0; i < 7; i++) {
      const angle = rotation + (i * Math.PI * 2) / 7 + random() * 0.3;
      const distance = 8 + random() * 7;
      obstacles.push({
        x: Math.cos(angle) * distance,
        z: Math.sin(angle) * distance,
        width: 2 + random() * 2,
        depth: 2 + random() * 2,
        height: 2,
      });
    }
    const cells = reachable(obstacles, spawns[0] ?? { x: 0, z: 0 });
    valid = points.every(
      (point) =>
        arenaPointClear(obstacles, point) && cells.has(key(cell(point))),
    );
  }
  if (!valid)
    throw new ArenaGenerationError(
      `Could not generate a connected arena for seed ${seed} after 32 attempts`,
    );
  return {
    seed,
    obstacles,
    spawns,
    resources,
    shelters,
    poiSockets,
    eliteSites,
    terrain,
  };
}
