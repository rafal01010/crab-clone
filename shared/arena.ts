export type ArenaBox = {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
};
export type Arena = {
  seed: number;
  obstacles: ArenaBox[];
  spawns: { x: number; y: number; z: number }[];
  resources: { x: number; z: number }[];
};

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
  const obstacles: ArenaBox[] = [
    { x: 0, z: -31, width: 64, depth: 2, height: 2 },
    { x: 0, z: 31, width: 64, depth: 2, height: 2 },
    { x: -31, z: 0, width: 2, depth: 60, height: 2 },
    { x: 31, z: 0, width: 2, depth: 60, height: 2 },
  ];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 + random() * 0.25;
    const distance = 8 + random() * 4;
    obstacles.push({
      x: Math.cos(angle) * distance,
      z: Math.sin(angle) * distance,
      width: 2 + random() * 2,
      depth: 2 + random() * 2,
      height: 2,
    });
  }
  return {
    seed,
    obstacles,
    spawns,
    resources: spawns.map(({ x, z }) => ({ x: x * 0.75, z: z * 0.75 })),
  };
}
