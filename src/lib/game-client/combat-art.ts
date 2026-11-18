import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type {
  MatchView,
  PlayerView,
  ProjectileVisual,
} from '../../../shared/match.js';
import type { createAssets } from './assets.js';

type Assets = ReturnType<typeof createAssets>;
const shots = {
  glob: { color: 0x83f464, core: 0xefffdc, width: 0.49, length: 0.86 },
  tether: { color: 0x65d9ff, core: 0xe2fbff, width: 0.34, length: 1.18 },
  stone: { color: 0xf7a04a, core: 0xffebc1, width: 0.52, length: 0.62 },
  bolt: { color: 0xffdc65, core: 0xfff7d9, width: 0.34, length: 0.83 },
} satisfies Record<
  ProjectileVisual,
  { color: number; core: number; width: number; length: number }
>;

function shotGeometry(kind: ProjectileVisual) {
  const { width, length, color, core } = shots[kind];
  const body = (
    kind === 'stone'
      ? new THREE.IcosahedronGeometry(0.5, 0)
      : kind === 'tether'
        ? new THREE.ConeGeometry(0.5, 1, 5).rotateX(Math.PI / 2)
        : new THREE.SphereGeometry(0.5, 6, 4)
  ).scale(width, width, length);
  const streak = new THREE.ConeGeometry(0.5, 1, 4)
    .rotateX(-Math.PI / 2)
    .scale(width * 0.7, width * 0.42, length * 1.3)
    .translate(0, 0, -length * 0.78);
  const gleam = new THREE.IcosahedronGeometry(0.5, 0)
    .scale(width * 0.7, width * 0.5, length * 0.47)
    .translate(0, width * 0.35, length * 0.14);
  const parts = [
    { geometry: body, tint: new THREE.Color(color) },
    { geometry: streak, tint: new THREE.Color(color).multiplyScalar(0.43) },
    { geometry: gleam, tint: new THREE.Color(core) },
  ];
  const prepared = parts.map(({ geometry, tint }) => {
    const mesh = geometry.index ? geometry.toNonIndexed() : geometry;
    if (mesh !== geometry) geometry.dispose();
    const count = mesh.getAttribute('position').count;
    const paints = new THREE.Float32BufferAttribute(count * 3, 3);
    for (let index = 0; index < count; index++)
      paints.setXYZ(index, tint.r, tint.g, tint.b);
    mesh.setAttribute('color', paints);
    return mesh;
  });
  const geometry = mergeGeometries(prepared);
  prepared.forEach((part) => part.dispose());
  return geometry;
}

function webGeometry() {
  const rings = [
    [0.94, 1],
    [0.57, 0.62],
    [0.27, 0.31],
  ].map(([inner, outer]) =>
    new THREE.RingGeometry(inner, outer, 8).toNonIndexed(),
  );
  const threads = Array.from({ length: 4 }, (_, index) =>
    new THREE.PlaneGeometry(1.85, 0.035)
      .rotateZ((index * Math.PI) / 4)
      .toNonIndexed(),
  );
  const parts = [...rings, ...threads];
  const geometry = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return geometry.rotateX(-Math.PI / 2);
}

export function createCombatBatches(scene: THREE.Scene) {
  const material = new THREE.MeshBasicMaterial();
  const projectilePaint = new THREE.MeshBasicMaterial({ vertexColors: true });
  function batch(
    geometry: THREE.BufferGeometry,
    color: number,
    capacity: number,
    paint = material,
  ) {
    const mesh = new THREE.InstancedMesh(geometry, paint, capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const tint = new THREE.Color(color);
    for (let index = 0; index < capacity; index++) mesh.setColorAt(index, tint);
    mesh.count = 0;
    mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  }
  const projectiles = {
    glob: batch(shotGeometry('glob'), 0xffffff, 512, projectilePaint),
    tether: batch(shotGeometry('tether'), 0xffffff, 512, projectilePaint),
    stone: batch(shotGeometry('stone'), 0xffffff, 512, projectilePaint),
    bolt: batch(shotGeometry('bolt'), 0xffffff, 512, projectilePaint),
  } satisfies Record<ProjectileVisual, THREE.InstancedMesh>;
  const trails = {
    web: batch(webGeometry(), 0xb6c9bc, 128),
    pedal: batch(
      new THREE.RingGeometry(0.78, 1, 14, 1, 0, Math.PI * 1.88).rotateX(
        -Math.PI / 2,
      ),
      0x608a73,
      128,
    ),
  };
  const batches = [...Object.values(projectiles), ...Object.values(trails)];
  const stamp = new THREE.Object3D();
  function clear() {
    for (const mesh of batches) mesh.count = 0;
  }
  return {
    update(snapshot: Pick<MatchView, 'projectiles' | 'trails'>) {
      clear();
      for (const shot of snapshot.projectiles) {
        const mesh = projectiles[shot.shape] ?? projectiles.bolt;
        if (mesh.count >= mesh.instanceMatrix.count) continue;
        stamp.position.set(
          shot.position.x,
          shot.position.y + 0.13,
          shot.position.z,
        );
        stamp.rotation.y = shot.heading ?? 0;
        stamp.scale.setScalar(1);
        stamp.updateMatrix();
        mesh.setMatrixAt(mesh.count++, stamp.matrix);
      }
      for (const trail of snapshot.trails) {
        const mesh = trails[trail.kind];
        if (mesh.count >= mesh.instanceMatrix.count) continue;
        stamp.position.set(
          trail.position.x,
          trail.kind === 'web' ? 0.047 : 0.043,
          trail.position.z,
        );
        stamp.rotation.y = 0;
        stamp.scale.setScalar(trail.radius);
        stamp.updateMatrix();
        mesh.setMatrixAt(mesh.count++, stamp.matrix);
      }
      for (const mesh of batches) mesh.instanceMatrix.needsUpdate = true;
    },
    clear,
    dispose() {
      for (const mesh of batches) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.dispose();
      }
      material.dispose();
      projectilePaint.dispose();
    },
  };
}

export function createCraftCombat(
  assets: Assets,
  model: ReturnType<Assets['craft']>,
) {
  const { root, bumper, bumperJaws, pincerJaws, modules } = model;
  const arcs = {
    bumper: assets.mesh(
      'strike:bumper',
      [
        {
          at: [-0.32, 0, 0.48],
          size: [0.35, 0.04, 0.13],
          form: 'wedge',
          turn: [0, 0.35, 0],
        },
        { at: [0, 0, 0.53], size: [0.38, 0.04, 0.1], form: 'wedge' },
        {
          at: [0.32, 0, 0.48],
          size: [0.35, 0.04, 0.13],
          form: 'wedge',
          turn: [0, -0.35, 0],
        },
      ],
      assets.light,
    ),
    jaws: assets.mesh(
      'strike:jaws',
      [
        {
          at: [-0.28, 0, 0.46],
          size: [0.13, 0.04, 0.45],
          form: 'wedge',
          turn: [0, 0.65, 0],
        },
        {
          at: [0.28, 0, 0.46],
          size: [0.13, 0.04, 0.45],
          form: 'wedge',
          turn: [0, -0.65, 0],
        },
      ],
      assets.light,
    ),
    blade: assets.mesh(
      'strike:blade',
      [
        {
          at: [0, 0, 0.47],
          size: [0.31, 0.045, 0.35],
          form: 'cone',
          turn: [Math.PI / 2, 0, 0],
        },
      ],
      assets.light,
    ),
  };
  const strike = new THREE.Group();
  strike.position.y = -0.14;
  strike.add(...Object.values(arcs));
  const launch = new THREE.Group();
  const muzzle = assets.mesh(
    'launch:muzzle',
    [{ at: [0, 0, 0.18], size: [0.5, 0.16, 0.68], form: 'gem' }],
    assets.light,
  );
  launch.add(muzzle);
  const spark = assets.sprite('trace');
  if (spark) {
    spark.position.set(0, 0.03, 0.27);
    spark.scale.set(0.65, 1.12, 1);
    launch.add(spark);
  }
  const pulse = {
    wave: assets.mesh(
      'pulse:wave',
      Array.from({ length: 12 }, (_, index) => {
        const angle = (index * Math.PI) / 6;
        return {
          at: [Math.sin(angle) * 0.95, 0, Math.cos(angle) * 0.95],
          size: [0.41, 0.014, 0.07],
          form: 'wedge',
          turn: [0, angle, 0],
        };
      }),
      assets.ally,
    ),
    burst: assets.mesh(
      'pulse:burst',
      Array.from({ length: 8 }, (_, index) => {
        const angle = (index * Math.PI) / 4;
        return {
          at: [Math.sin(angle) * 0.87, 0, Math.cos(angle) * 0.87],
          size: [0.21, 0.015, 0.29],
          form: 'wedge',
          turn: [0, angle, 0],
        };
      }),
      assets.trim,
    ),
  };
  const rear = new THREE.Group();
  rear.position.set(0, -0.035, -0.43);
  const exhaust = assets.mesh(
    'thrust:core',
    [
      {
        at: [-0.25, 0, -0.28],
        size: [0.21, 0.12, 0.67],
        form: 'cone',
        turn: [-Math.PI / 2, 0, 0],
      },
      {
        at: [0.25, 0, -0.28],
        size: [0.21, 0.12, 0.67],
        form: 'cone',
        turn: [-Math.PI / 2, 0, 0],
      },
    ],
    assets.light,
  );
  rear.add(exhaust);
  const smoke = assets.sprite('smoke');
  if (smoke) {
    smoke.position.set(0, -0.035, -0.8);
    smoke.scale.set(1.05, 1.0, 1);
    rear.add(smoke);
  }
  const skid = assets.mesh(
    'thrust:skid',
    [
      { at: [-0.24, 0, -0.23], size: [0.14, 0.04, 0.44], form: 'wedge' },
      { at: [0.24, 0, -0.23], size: [0.14, 0.04, 0.44], form: 'wedge' },
    ],
    assets.hull,
  );
  rear.add(skid);
  root.add(strike, launch, rear, ...Object.values(pulse));
  let view: Pick<PlayerView, 'contact' | 'attackFlash' | 'thrust'> | null =
    null;
  let flashExpires = 0;
  return {
    update(player: PlayerView | null, serverTime: number, now: number) {
      const flash = player?.attackFlash;
      if (flash && flash.at !== view?.attackFlash?.at)
        flashExpires = now + Math.max(0, 300 - (serverTime - flash.at));
      view = player;
    },
    draw(now: number, reduced: boolean) {
      const { contact, attackFlash, thrust } = view ?? {};
      const { x: radiusScale } = root.scale;
      const action = contact && contact.phase !== 'recovery';
      strike.visible = !!action;
      if (contact) {
        strike.rotation.y = contact.aim - root.rotation.y;
        strike.scale.set(
          contact.phase === 'strike' ? 1.22 : 1,
          1,
          Math.max(1, contact.reach / (radiusScale * 0.62)),
        );
        for (const [kind, mesh] of Object.entries(arcs)) {
          mesh.visible = contact.tool === kind;
          mesh.material =
            contact.phase === 'windup' ? assets.hull : assets.light;
        }
      }
      const spread =
        contact?.phase === 'windup'
          ? reduced
            ? 0.7
            : 0.28 + 0.6 * contact.progress
          : 0;
      const close =
        contact?.phase === 'strike'
          ? 1
          : contact?.phase === 'recovery' && !reduced
            ? 0.45 * (1 - contact.progress)
            : 0;
      bumper.rotation.y =
        contact?.tool === 'bumper' ? contact.aim - root.rotation.y : 0;
      const pincer = modules.pincer;
      if (pincer)
        pincer.rotation.y =
          contact?.tool === 'jaws' ? contact.aim - root.rotation.y : 0;
      for (const [kind, jaws] of [
        ['bumper', bumperJaws],
        ['jaws', pincerJaws],
      ] as const) {
        jaws.forEach((jaw, index) => {
          const active = contact?.tool === kind;
          jaw.rotation.y =
            (index * 2 - 1) * (active ? 0.56 * spread - 0.32 * close : 0);
          jaw.position.z = active ? 0.11 * close - 0.04 * spread : 0;
        });
      }
      const flash = flashExpires > now ? attackFlash : null;
      launch.visible = flash?.kind === 'launch' && flashExpires - now > 90;
      if (flash?.kind === 'launch') {
        const angle = flash.aim - root.rotation.y;
        launch.rotation.y = angle;
        launch.position.set(Math.sin(angle) * 0.6, 0.23, Math.cos(angle) * 0.6);
        muzzle.material =
          flash.shape === 'glob'
            ? assets.ally
            : flash.shape === 'tether'
              ? assets.trim
              : assets.light;
        const cannon = modules.cannon;
        if (cannon) cannon.position.z = launch.visible && !reduced ? -0.1 : 0;
      } else if (modules.cannon) modules.cannon.position.z = 0;
      const flashScale = reduced
        ? 1
        : Math.min(1, 0.56 + (300 - (flashExpires - now)) / 420);
      for (const [kind, shape] of Object.entries(pulse)) {
        shape.visible = flash?.kind === 'pulse' && flash.shape === kind;
        if (flash?.kind === 'pulse') {
          shape.position.y = (0.052 - root.position.y) / radiusScale;
          shape.scale.setScalar((flashScale * flash.radius) / radiusScale);
        }
      }
      rear.visible = !!thrust;
      if (thrust) {
        rear.rotation.y = thrust.aim - root.rotation.y;
        exhaust.visible = thrust.kind !== 'leap';
        exhaust.material =
          thrust.kind === 'charge' ? assets.danger : assets.light;
        exhaust.scale.z = reduced ? 0.7 : 0.9 + 0.12 * Math.sin(now / 21);
        skid.visible = thrust.kind === 'leap';
        if (smoke) smoke.visible = !reduced && thrust.kind === 'dash';
      }
    },
  };
}
