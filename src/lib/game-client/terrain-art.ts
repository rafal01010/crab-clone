import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  MAP_RULES,
  type Arena,
  type Point,
  type TerrainRegion,
} from '../../../shared/arena.js';
import type { Terrain } from '../../../shared/movement.js';
import { createAssets, PRESENTATION } from './assets.js';
import type { Preferences } from './preferences.js';

type Assets = ReturnType<typeof createAssets>;
type Placement = Point & { rotation: number; size: number; tint: number };
const CELL = MAP_RULES.terrainCellSize;
const CLUSTER = 5;
const kinds = ['grass', 'sand', 'snow', 'water'] as const;
const colors = PRESENTATION.terrain;
const waterColors = [colors.water, 0x30748e, 0x234e6c];

function noise(x: number, z: number, salt: number) {
  const n = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ salt;
  const t = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((t ^ (t >>> 16)) >>> 0) / 0x100000000;
}

export function terrainColor(terrain: Terrain, waterDepth: number) {
  return terrain === 'water'
    ? (waterColors[waterDepth] ?? colors.water)
    : colors[terrain];
}

const surfacePattern = {
  grass: `
    float moss = smoothstep(.33, .71, mix(large, terrainNoise(arenaPoint * .82), .39));
    diffuseColor.rgb *= mix(vec3(1.36, 1.06, .70), vec3(.64, .92, .68), moss);
    diffuseColor.rgb *= mix(.76, 1.22, grit);`,
  sand: `
    float dune = .5 + .5 * sin(dot(arenaPoint, vec2(.76, 1.65)) + large * 5.0);
    diffuseColor.rgb *= mix(.75, 1.23, mix(large, dune, .38));
    diffuseColor.rgb *= mix(.85, 1.13, grit);`,
  snow: `
    float drift = smoothstep(.32, .78, mix(large, terrainNoise(arenaPoint * .71), .42));
    diffuseColor.rgb *= mix(vec3(.65, .78, .92), vec3(1.16, 1.20, 1.22), drift);
    diffuseColor.rgb *= mix(.90, 1.08, grit);`,
  water: `
    float swells = sin(dot(arenaPoint, vec2(.48, 2.4)) + large * 6.5);
    float crossing = sin(dot(arenaPoint, vec2(1.37, -1.42)) + large * 2.1);
    float ripple = smoothstep(.83, .99, swells * .86 + crossing * .14);
    diffuseColor.rgb *= mix(.65, 1.25, large) * mix(.92, 1.10, .5 + .5 * swells);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.21, .50, .65), ripple * .45);`,
} satisfies Record<Terrain, string>;

export function groundMaterial(terrain: Terrain) {
  const material = new THREE.MeshStandardMaterial({
    roughness: terrain === 'water' ? 0.67 : 1,
  });
  material.customProgramCacheKey = () => `arena-ground:${terrain}`;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader =
      'varying vec2 arenaPoint;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
      arenaPoint = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xz;`,
      );
    shader.fragmentShader =
      `varying vec2 arenaPoint;
      float terrainHash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float terrainNoise(vec2 p) {
        vec2 f = fract(p);
        vec2 i = floor(p);
        f = f * f * (3.0 - 2.0 * f);
        vec4 h = vec4(terrainHash(i), terrainHash(i + vec2(1.0, 0.0)),
          terrainHash(i + vec2(0.0, 1.0)), terrainHash(i + vec2(1.0, 1.0)));
        return mix(mix(h.x,h.y,f.x), mix(h.z,h.w,f.x), f.y);
      }
    ` +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
      float large = terrainNoise(arenaPoint * .24);
      float grit = terrainNoise(arenaPoint * 2.3);
      ${surfacePattern[terrain]}`,
      );
  };
  return material;
}

export function biomeEdges(regions: readonly TerrainRegion[]) {
  const tiles = new Map<string, TerrainRegion>();
  const key = (x: number, z: number) => `${x},${z}`;
  const tileBounds = (center: number, size: number) => ({
    start: Math.ceil((center - size / 2) / CELL - 0.5),
    end: Math.ceil((center + size / 2) / CELL - 0.5),
  });
  for (const region of regions) {
    const x = tileBounds(region.x, region.width);
    const z = tileBounds(region.z, region.depth);
    for (let row = z.start; row < z.end; row++)
      for (let col = x.start; col < x.end; col++)
        tiles.set(key(col, row), region);
  }
  const positions: number[] = [];
  const colors: number[] = [];
  const tint = new THREE.Color();
  const foam = new THREE.Color(0xaedcdb);
  const wetBank = new THREE.Color(0x675745);
  function band(
    owner: TerrainRegion,
    neighbor: TerrainRegion,
    x: number,
    z: number,
    axis: 'x' | 'z',
    side: number,
  ) {
    if (
      owner === neighbor ||
      (owner.terrain === neighbor.terrain &&
        owner.waterDepth === neighbor.waterDepth)
    )
      return;
    const halfSize = (axis === 'x' ? owner.width : owner.depth) / 2;
    const edge = owner[axis] + side * halfSize;
    const gridEdge = (axis === 'x' ? x : z) + (side * CELL) / 2;
    if (Math.abs(edge - gridEdge) > 0.001) return;
    const along = axis === 'x' ? 'z' : 'x';
    const span = (axis === 'x' ? owner.depth : owner.width) / 2;
    const center = axis === 'x' ? z : x;
    const from = Math.max(owner[along] - span, center - CELL / 2);
    const to = Math.min(owner[along] + span, center + CELL / 2);
    if (from >= to) return;
    const inWater = owner.terrain === 'water';
    const atShore = inWater !== (neighbor.terrain === 'water');
    const width = Math.min(
      halfSize,
      (atShore ? (inWater ? 0.42 : 0.6) : inWater ? 0.85 : 0.68) *
        (0.7 + noise(x, z, 37) * 0.63),
    );
    const edgeOpacity = atShore
      ? inWater
        ? 0.52 + noise(x, z, 21) * 0.24
        : 0.5
      : 0.39;
    tint.setHex(terrainColor(neighbor.terrain, neighbor.waterDepth));
    if (atShore) tint.copy(inWater ? foam : wetBank);
    const coords = [
      [edge, from],
      [edge, to],
      [edge - width * side, from],
      [edge - width * side, to],
    ];
    for (const index of [0, 1, 2, 2, 1, 3]) {
      const coord = coords[index];
      if (!coord) continue;
      const [across = 0, along = 0] = coord;
      positions.push(
        axis === 'x' ? across : along,
        -0.014,
        axis === 'x' ? along : across,
      );
      colors.push(tint.r, tint.g, tint.b, index < 2 ? edgeOpacity : 0);
    }
  }
  for (const [tile, region] of tiles) {
    const [column = 0, row = 0] = tile.split(',').map(Number);
    for (const [dx, dz] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const neighbor = tiles.get(key(column + dx, row + dz));
      if (neighbor)
        band(
          region,
          neighbor,
          (column + 0.5) * CELL,
          (row + 0.5) * CELL,
          dx ? 'x' : 'z',
          dx || dz,
        );
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
  return new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    }),
  );
}

export function createTerrainClusters(scene: THREE.Scene, assets: Assets) {
  const maxInstances = 92;
  const paints = {
    grass: 0x768768,
    sand: 0xaa956f,
    snow: 0x879da3,
    water: 0x58877d,
  };
  const stone = assets.model('stone');
  const grass = assets.model('grass');
  const rock = assets.model('rock');
  const roots = assets.model('roots');
  const prop = {
    grass: [grass, roots],
    sand: [stone, null],
    snow: [rock, null],
    water: [stone, grass],
  };
  function bandGeometry(kind: Terrain) {
    const width = kind === 'sand' ? 1.0 : 0.75;
    const height = kind === 'snow' ? 0.035 : 0.014;
    return assets.geometry('cluster:bands:' + kind, [
      {
        at: [-0.19, 0.018, -0.24],
        size: [width, height, 0.071],
        form: 'wedge',
        turn: [0, -0.14, 0],
      },
      {
        at: [0.27, 0.016, 0.03],
        size: [width * 1.18, height, 0.072],
        form: 'wedge',
        turn: [0, -0.22, 0],
      },
      {
        at: [0.48, 0.019, 0.3],
        size: [width * 0.66, height, 0.064],
        form: 'wedge',
        turn: [0, -0.28, 0],
      },
    ]);
  }
  const bands = assets.material(0xffffff);
  const batches = kinds.map((kind) => {
    const variants = prop[kind].map((model) => {
      const mesh = new THREE.InstancedMesh(
        model?.geometry ?? bandGeometry(kind),
        model?.material ?? bands,
        maxInstances,
      );
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);
      return mesh;
    });
    return { kind, variants, points: [] as Placement[] };
  });
  const stamp = new THREE.Object3D();
  const color = new THREE.Color();
  const white = new THREE.Color(0xffffff);
  let previousX = Infinity;
  let previousZ = Infinity;
  let previousQuality: Preferences['quality'] | undefined;
  return {
    setArena(arena: Pick<Arena, 'terrain' | 'obstacles'>) {
      previousX = Infinity;
      for (const batch of batches) batch.points.length = 0;
      for (const region of arena.terrain) {
        const batch = batches.find(({ kind }) => kind === region.terrain);
        if (!batch) continue;
        const minX = region.x - region.width / 2;
        const minZ = region.z - region.depth / 2;
        const maxX = minX + region.width;
        const maxZ = minZ + region.depth;
        for (
          let cx = Math.floor(minX / CLUSTER);
          cx <= Math.floor(maxX / CLUSTER);
          cx++
        ) {
          for (
            let cz = Math.floor(minZ / CLUSTER);
            cz <= Math.floor(maxZ / CLUSTER);
            cz++
          ) {
            const x = (cx + 0.21 + noise(cx, cz, 1321) * 0.58) * CLUSTER;
            const z = (cz + 0.21 + noise(cx, cz, 2129) * 0.58) * CLUSTER;
            const size = 0.57 + noise(cx, cz, 11825) * 0.58;
            const edge = 0.4 + size * 0.13;
            if (
              x < minX + edge ||
              x >= maxX - edge ||
              z < minZ + edge ||
              z >= maxZ - edge
            )
              continue;
            if (
              arena.obstacles.some(
                (box) =>
                  Math.abs(box.x - x) < box.width / 2 + 0.8 &&
                  Math.abs(box.z - z) < box.depth / 2 + 0.8,
              )
            )
              continue;
            if (
              region.terrain === 'water' &&
              region.waterDepth === 2 &&
              noise(cx, cz, 723) < 0.65
            )
              continue;
            batch.points.push({
              x,
              z,
              size,
              rotation: noise(cx, cz, 511) * Math.PI * 2,
              tint: region.waterDepth,
            });
          }
        }
      }
    },
    update(x: number, z: number, quality: Preferences['quality']) {
      if (
        quality === previousQuality &&
        Math.hypot(x - previousX, z - previousZ) < 2
      )
        return;
      previousX = x;
      previousZ = z;
      previousQuality = quality;
      const radius = quality === 'low' ? 17 : 29;
      const cap = quality === 'low' ? 40 : maxInstances;
      for (const { kind, variants, points } of batches) {
        const nearby = points
          .map((point) => ({
            point,
            distance: Math.hypot(point.x - x, point.z - z),
          }))
          .filter(({ distance }) => distance <= radius)
          .sort((a, b) => a.distance - b.distance)
          .slice(0, cap);
        for (const [variant, mesh] of variants.entries()) {
          let count = 0;
          for (const { point } of nearby) {
            if (kind === 'water' && variant === 1 && point.tint !== 0) continue;
            if (kind === 'grass' && variant === 1 && point.size < 0.83)
              continue;
            stamp.position.set(
              point.x + variant * 0.36,
              0.006,
              point.z + variant * 0.21,
            );
            stamp.rotation.y = point.rotation + variant * 0.72;
            const height = kind === 'snow' ? 0.38 : kind === 'sand' ? 0.64 : 1;
            stamp.scale.set(point.size, point.size * height, point.size);
            stamp.updateMatrix();
            mesh.setMatrixAt(count, stamp.matrix);
            mesh.setColorAt(
              count++,
              color.setHex(paints[kind]).lerp(white, variant ? 0.51 : 0.22),
            );
          }
          mesh.count = count;
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
      }
    },
    clear() {
      for (const batch of batches) {
        batch.points.length = 0;
        for (const mesh of batch.variants) mesh.count = 0;
      }
      previousX = Infinity;
    },
    dispose() {
      for (const { variants } of batches)
        for (const mesh of variants) {
          scene.remove(mesh);
          mesh.dispose();
        }
    },
  };
}

export function obstacleGeometry(
  assets: Assets,
  box: Arena['obstacles'][number],
) {
  const rock = assets.model('rock');
  const baseHeight = box.height * (rock ? 0.46 : 1);
  const base = new THREE.BoxGeometry(
    box.width,
    baseHeight,
    box.depth,
  ).translate(0, baseHeight / 2, 0);
  if (!rock) return base;
  base.deleteAttribute('normal');
  base.deleteAttribute('uv');
  const color = new Uint8Array(base.getAttribute('position').count * 4);
  for (let index = 0; index < color.length; index += 4)
    color.set([169, 159, 143, 255], index);
  base.setAttribute('color', new THREE.Uint8BufferAttribute(color, 4, true));
  const cap = rock.geometry.clone();
  cap.scale(box.width, box.height - baseHeight + 0.04, box.depth);
  cap.translate(0, baseHeight - 0.04, 0);
  const geometry = mergeGeometries([base, cap]);
  cap.dispose();
  if (!geometry) return base;
  base.dispose();
  return geometry;
}
