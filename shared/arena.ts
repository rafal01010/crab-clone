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

// Source regions are 15 × 10 cells. World extent and unit mapping are multiplayer estimates.
export const MAP_RULES = {
  halfExtent: 120,
  regionWidth: 15,
  regionDepth: 10,
  terrainCellSize: 2,
  startRadius: 24,
  viewDistance: 48,
  activeDistance: 64,
};

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

export function arenaPointClear(
  obstacles: readonly ArenaBox[],
  point: Point,
  clearance = 1,
): boolean {
  return (
    Math.abs(point.x) <= MAP_RULES.halfExtent - clearance &&
    Math.abs(point.z) <= MAP_RULES.halfExtent - clearance &&
    obstacles.every(
      (box) =>
        Math.abs(point.x - box.x) >= box.width / 2 + clearance ||
        Math.abs(point.z - box.z) >= box.depth / 2 + clearance,
    )
  );
}

function segmentClear(
  obstacles: readonly ArenaBox[],
  from: Point,
  to: Point,
): boolean {
  return obstacles.every((box) => {
    let enter = 0;
    let leave = 1;
    for (const axis of ['x', 'z'] as const) {
      const half = (axis === 'x' ? box.width : box.depth) / 2 + 1;
      const delta = to[axis] - from[axis];
      const low = box[axis] - half - from[axis];
      const high = box[axis] + half - from[axis];
      if (Math.abs(delta) < 0.0001) {
        if (low > 0 || high < 0) return true;
      } else {
        enter = Math.max(enter, Math.min(low / delta, high / delta));
        leave = Math.min(leave, Math.max(low / delta, high / delta));
        if (enter > leave) return true;
      }
    }
    return leave < 0 || enter > 1;
  });
}

export function nextArenaWaypoint(
  obstacles: readonly ArenaBox[],
  from: Point,
  to: Point,
  radius = Infinity,
): Point | null {
  if (
    Math.hypot(to.x, to.z) <= radius &&
    arenaPointClear(obstacles, to) &&
    segmentClear(obstacles, from, to)
  )
    return to;
  const step = 2;
  const start = {
    x: Math.round(from.x / step) * step,
    z: Math.round(from.z / step) * step,
  };
  const key = (point: Point) => `${point.x},${point.z}`;
  const open = [start];
  const visited = new Set<string>();
  const parents = new Map<string, Point>();
  const cost = new Map<string, number>([[key(start), 0]]);
  const distance = (point: Point) => Math.hypot(point.x - to.x, point.z - to.z);
  for (let count = 0; open.length && count < 512; count++) {
    open.sort(
      (a, b) =>
        (cost.get(key(a)) ?? Infinity) +
        distance(a) -
        (cost.get(key(b)) ?? Infinity) -
        distance(b),
    );
    const current = open.shift();
    if (!current) break;
    const currentKey = key(current);
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    if (
      Math.hypot(to.x, to.z) <= radius &&
      arenaPointClear(obstacles, to) &&
      (distance(current) <= step ||
        (count > 0 && segmentClear(obstacles, current, to)))
    ) {
      let waypoint = current;
      let parent = parents.get(key(waypoint));
      while (parent && key(parent) !== key(start)) {
        waypoint = parent;
        parent = parents.get(key(waypoint));
      }
      return arenaPointClear(obstacles, waypoint) ? waypoint : null;
    }
    for (const delta of [
      { x: step, z: 0 },
      { x: -step, z: 0 },
      { x: 0, z: step },
      { x: 0, z: -step },
    ]) {
      const next = { x: current.x + delta.x, z: current.z + delta.z };
      const nextKey = key(next);
      const nextCost = (cost.get(currentKey) ?? 0) + step;
      if (
        visited.has(nextKey) ||
        Math.hypot(next.x, next.z) > radius ||
        !arenaPointClear(obstacles, next) ||
        !segmentClear(obstacles, current, next) ||
        nextCost >= (cost.get(nextKey) ?? Infinity)
      )
        continue;
      cost.set(nextKey, nextCost);
      parents.set(nextKey, current);
      open.push(next);
    }
  }
  return null;
}

function hash(seed: number, x: number, z: number): number {
  let value = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ seed;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return (value ^ (value >>> 16)) >>> 0;
}

function noise(seed: number, x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const fade = (value: number) =>
    value * value * value * (value * (value * 6 - 15) + 10);
  const gradient = (dx: number, dz: number) => {
    const angle = (hash(seed, ix + dx, iz + dz) / 0x100000000) * Math.PI * 2;
    return Math.cos(angle) * (fx - dx) + Math.sin(angle) * (fz - dz);
  };
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  return Math.max(
    0,
    Math.min(
      1,
      0.5 +
        mix(
          mix(gradient(0, 0), gradient(1, 0), fade(fx)),
          mix(gradient(0, 1), gradient(1, 1), fade(fx)),
          fade(fz),
        ),
    ),
  );
}

export function createArena(seed: number): Arena {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new ArenaGenerationError(
      'Map seed must be an unsigned 32-bit integer',
    );
  const extent = MAP_RULES.halfExtent;
  const startOffset = extent * 0.4;
  const spawns = [
    { x: -startOffset, y: 0.25, z: -startOffset },
    { x: startOffset, y: 0.25, z: -startOffset },
    { x: -startOffset, y: 0.25, z: startOffset },
    { x: startOffset, y: 0.25, z: startOffset },
  ];
  const sample = (x: number, z: number): Terrain => {
    if (
      spawns.some(
        (point) =>
          Math.hypot(x - point.x, z - point.z) <= MAP_RULES.startRadius,
      )
    )
      return 'grass';
    const heat = noise(seed ^ 0x9e3779b9, x / 73 + 0.37, z / 73 + 0.61);
    const humidity = noise(seed ^ 0x85ebca6b, x / 43 + 0.19, z / 43 + 0.83);
    return humidity >= 0.95
      ? 'water'
      : heat >= 0.85
        ? 'sand'
        : heat <= 0.3 && humidity <= 0.7
          ? 'snow'
          : heat >= 0.45 && humidity <= 0.6
            ? 'sand'
            : heat <= 0.6 && humidity >= 0.51
              ? 'water'
              : 'grass';
  };
  const terrain: TerrainRegion[] = [];
  const cell = MAP_RULES.terrainCellSize;
  const side = Math.ceil((extent * 2) / cell);
  const tiles = Array.from({ length: side * side }, (_, index) =>
    sample(
      -extent + (index % side) * cell + cell / 2,
      -extent + Math.floor(index / side) * cell + cell / 2,
    ),
  );
  const shore = Int16Array.from(tiles, (tile) => (tile === 'water' ? 6 : 0));
  const shoreAt = (index: number) => shore[index] ?? 6;
  for (let index = 0; index < shore.length; index++) {
    if (index % side)
      shore[index] = Math.min(shoreAt(index), shoreAt(index - 1) + cell);
    if (index >= side)
      shore[index] = Math.min(shoreAt(index), shoreAt(index - side) + cell);
  }
  for (let index = shore.length - 1; index >= 0; index--) {
    if (index % side < side - 1)
      shore[index] = Math.min(shoreAt(index), shoreAt(index + 1) + cell);
    if (index + side < shore.length)
      shore[index] = Math.min(shoreAt(index), shoreAt(index + side) + cell);
  }
  const tileAt = (
    x: number,
    z: number,
  ): Pick<TerrainRegion, 'terrain' | 'waterDepth'> => {
    const index =
      Math.round((z + extent) / cell) * side + Math.round((x + extent) / cell);
    return {
      terrain: tiles[index] ?? sample(x + cell / 2, z + cell / 2),
      waterDepth: shoreAt(index) <= 2 ? 0 : shoreAt(index) <= 4 ? 1 : 2,
    };
  };
  let previous = new Map<string, TerrainRegion>();
  for (let z = -extent; z < extent; z += cell) {
    const next = new Map<string, TerrainRegion>();
    for (let x = -extent; x < extent;) {
      const tile = tileAt(x, z);
      const start = x;
      x += cell;
      while (x < extent) {
        const neighbor = tileAt(x, z);
        if (
          neighbor.terrain !== tile.terrain ||
          neighbor.waterDepth !== tile.waterDepth
        )
          break;
        x += cell;
      }
      const key = `${start}:${x}:${tile.terrain}:${tile.waterDepth}`;
      const prior = previous.get(key);
      if (prior) {
        prior.depth += cell;
        prior.z += cell / 2;
        next.set(key, prior);
      } else {
        const region = {
          ...tile,
          x: (start + x) / 2,
          z: z + cell / 2,
          width: x - start,
          depth: cell,
        };
        terrain.push(region);
        next.set(key, region);
      }
    }
    previous = next;
  }
  const obstacles: ArenaBox[] = [
    { x: 0, z: -extent - 1, width: extent * 2 + 4, depth: 2, height: 2 },
    { x: 0, z: extent + 1, width: extent * 2 + 4, depth: 2, height: 2 },
    { x: -extent - 1, z: 0, width: 2, depth: extent * 2, height: 2 },
    { x: extent + 1, z: 0, width: 2, depth: extent * 2, height: 2 },
  ];
  const resources: Point[] = [];
  const shelters: Point[] = [];
  const poiSockets: Point[] = [];
  const eliteSites: Point[] = [];
  for (let z = -extent; z < extent; z += MAP_RULES.regionDepth) {
    for (let x = -extent; x < extent; x += MAP_RULES.regionWidth) {
      const random = (salt: number) => hash(seed ^ salt, x, z) / 0x100000000;
      const point = { x: x + 3 + random(1) * 9, z: z + 2 + random(2) * 6 };
      if (Math.hypot(point.x, point.z) > extent - 4) continue;
      resources.push(point, { x: point.x + 2, z: point.z + 2 });
      if (random(3) < 0.5) resources.push({ x: point.x - 2, z: point.z + 1 });
      if (random(4) < 0.175)
        poiSockets.push({ x: point.x + 3, z: point.z - 1 });
      if (sample(point.x, point.z) !== 'water' && random(5) < 0.08)
        shelters.push({ x: point.x - 3, z: point.z - 2 });
      if (random(6) < 0.025) eliteSites.push({ ...point });
      const rock = {
        x: x + 11,
        z: z + 7,
        width: 1 + random(7) * 2,
        depth: 1 + random(8) * 2,
        height: 0.7 + random(9),
      };
      if (
        random(10) < 0.3 &&
        spawns.every((p) => Math.hypot(p.x - rock.x, p.z - rock.z) > 14)
      )
        obstacles.push(rock);
    }
  }
  for (const spawn of spawns) {
    resources.push(
      ...[
        { x: 4, z: 0 },
        { x: -4, z: 0 },
        { x: 0, z: 5 },
        { x: 0, z: -5 },
      ].map((offset) => ({ x: spawn.x + offset.x, z: spawn.z + offset.z })),
    );
    shelters.push({ x: spawn.x + 8, z: spawn.z });
    poiSockets.push({ x: spawn.x - 9, z: spawn.z + 4 });
  }
  const clear = (point: Point) => arenaPointClear(obstacles, point, 1.5);
  return {
    seed,
    obstacles,
    spawns,
    terrain,
    resources: resources.filter(clear),
    shelters: shelters.filter(clear),
    poiSockets: poiSockets.filter(clear),
    eliteSites: eliteSites.filter(clear),
  };
}
