import * as THREE from 'three';
import {
  createAssets,
  PRESENTATION,
  type Treatment,
} from '../src/lib/game-client/assets.js';
import { createCombatBatches } from '../src/lib/game-client/combat-art.js';
import { obstacleGeometry } from '../src/lib/game-client/terrain-art.js';

for (const treatment of ['matte', 'signal'] satisfies Treatment[]) {
  const canvas = document.getElementById(treatment);
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error('Missing comparison canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(1280, 720, false);
  const assets = createAssets(treatment);
  await assets.load();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101722);
  const { fieldOfView, distance } = PRESENTATION.camera;
  const camera = new THREE.PerspectiveCamera(fieldOfView, 1280 / 720, 0.1, 100);
  camera.position.set(0, distance, distance);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x303040, 2));
  const sun = new THREE.DirectionalLight(0xffefd9, 1.6);
  sun.position.set(-8, 14, 6);
  scene.add(sun);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    assets.material(PRESENTATION.terrain.grass),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1;
  scene.add(ground);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 24),
    assets.material(PRESENTATION.terrain.sand),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(8, -0.09, 0);
  scene.add(sand);
  const outcrop = new THREE.Mesh(
    obstacleGeometry(assets, {
      x: 4,
      z: -2,
      width: 1.8,
      height: 1.2,
      depth: 1.4,
    }),
    assets.artSurface,
  );
  outcrop.position.set(4, 0, -2);
  scene.add(outcrop);
  const oasis = assets.site('oasis');
  oasis.root.position.set(4.3, 0, 2.5);
  scene.add(oasis.root);
  const combat = createCombatBatches(scene);
  combat.update({
    projectiles: [
      {
        id: 1,
        shape: 'glob',
        heading: -0.4,
        position: { x: 1.2, y: 0.52, z: 1.25 },
      },
    ],
    trails: [],
  });
  const early = assets.craft();
  early.root.position.set(-2.4, 0.4, 0);
  early.root.rotation.y = 0.5;
  scene.add(early.root);
  const late = assets.craft();
  late.root.position.set(1.8, 0.4, 0);
  late.root.scale.setScalar(1.7);
  late.root.rotation.y = -0.4;
  for (const kind of [
    'arms',
    'shield',
    'jet',
    'cannon',
    'antennae',
    'command',
  ]) {
    const mount = late.modules[kind];
    if (mount) mount.visible = true;
  }
  scene.add(late.root);
  const hunter = assets.bot('hunter');
  hunter.root.position.set(-3, 0.5, -3);
  hunter.root.rotation.y = 0.6;
  hunter.badge.visible = false;
  hunter.status.visible = false;
  hunter.pose({ phase: 'windup', progress: 0.65 }, false);
  scene.add(hunter.root);
  const forager = assets.bot('forager');
  forager.root.position.set(1, 0.5, -4);
  forager.badge.visible = false;
  forager.status.visible = false;
  forager.tell.visible = false;
  scene.add(forager.root);
  for (const [index, rarity] of [
    'common',
    'rare',
    'epic',
    'legendary',
  ].entries()) {
    const resource = assets.resource(index % 2 ? 'aquatic' : 'vegetation');
    resource.root.position.set(-2 + index * 1.3, 0.3, 3);
    resource.repair.visible = index === 2;
    resource.badges.forEach((badge, i) => {
      badge.visible = i === index;
      badge.material = assets.rarityMaterials[rarity] ?? assets.hull;
    });
    scene.add(resource.root);
  }
  renderer.render(scene, camera);
  addEventListener(
    'pagehide',
    () => {
      ground.geometry.dispose();
      sand.geometry.dispose();
      outcrop.geometry.dispose();
      combat.dispose();
      assets.dispose();
      renderer.dispose();
    },
    { once: true },
  );
}
