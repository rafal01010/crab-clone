import * as THREE from 'three';
import type { Observation } from '../../../shared/protocol/index.js';
import { SnapshotClock, SnapshotTimeline } from './snapshots.js';
import { LocalPrediction } from './local-prediction.js';
import {
  terrainSpeedMultiplier,
  type Movement,
} from '../../../shared/movement.js';
import { terrainRegionAt } from '../../../shared/arena.js';
import { THERMAL_RULES } from '../../../shared/weather.js';
import type { Terrain } from '../../../shared/movement.js';

type Entity = {
  mesh: THREE.Mesh;
  radius: number;
  timeline: SnapshotTimeline;
  modules: Record<
    | 'arms'
    | 'tentacles'
    | 'legs'
    | 'more-legs'
    | 'fin'
    | 'lightweight'
    | 'wings'
    | 'tail'
    | 'slam'
    | 'spines'
    | 'crest'
    | 'fins',
    THREE.Group
  >;
  attackCue: THREE.Mesh;
  hitCue: THREE.Mesh;
  guardCue: THREE.Mesh;
};

export function createWorld(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x171b27);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 12, 12);
  camera.lookAt(0, 0, 0);
  const light = new THREE.HemisphereLight(0xffffff, 0x303040, 2);
  scene.add(light);
  const geometry = new THREE.BoxGeometry(1, 0.5, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0xff8e64 });
  const headingGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.55);
  const headingMaterial = new THREE.MeshBasicMaterial({ color: 0x26384a });
  const hitMaterial = new THREE.MeshBasicMaterial({ color: 0xffe9a3 });
  const guardGeometry = new THREE.TorusGeometry(0.8, 0.045, 6, 20);
  const guardMaterial = new THREE.MeshBasicMaterial({ color: 0x91d8e7 });
  const moduleGeometry = new THREE.BoxGeometry(1, 1, 1);
  const moduleMaterial = new THREE.MeshStandardMaterial({ color: 0xf7b16e });
  function makeModules(mesh: THREE.Mesh): Entity['modules'] {
    const modules = {
      arms: new THREE.Group(),
      tentacles: new THREE.Group(),
      legs: new THREE.Group(),
      'more-legs': new THREE.Group(),
      fin: new THREE.Group(),
      lightweight: new THREE.Group(),
      wings: new THREE.Group(),
      tail: new THREE.Group(),
      slam: new THREE.Group(),
      spines: new THREE.Group(),
      crest: new THREE.Group(),
      fins: new THREE.Group(),
    };
    const part = (
      group: THREE.Group,
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
    ) => {
      const shape = new THREE.Mesh(moduleGeometry, moduleMaterial);
      shape.position.set(x, y, z);
      shape.scale.set(sx, sy, sz);
      group.add(shape);
    };
    for (const side of [-1, 1]) {
      part(modules.arms, side * 0.7, 0, 0.25, 0.55, 0.18, 0.2);
      part(modules.tentacles, side * 0.72, 0, -0.05, 0.68, 0.12, 0.16);
      part(modules.tentacles, side * 0.9, 0, -0.32, 0.42, 0.12, 0.14);
      part(modules.legs, side * 0.52, -0.15, 0.3, 0.32, 0.15, 0.14);
      part(modules.legs, side * 0.52, -0.15, -0.2, 0.32, 0.15, 0.14);
      part(modules['more-legs'], side * 0.53, -0.15, -0.43, 0.36, 0.15, 0.14);
      part(modules.lightweight, side * 0.33, 0.27, 0, 0.08, 0.08, 0.85);
      part(modules.wings, side * 0.75, 0.25, -0.15, 0.6, 0.08, 0.55);
      part(modules.spines, side * 0.35, 0.38, -0.12, 0.1, 0.45, 0.1);
    }
    part(modules.tail, 0, 0, -0.75, 0.25, 0.15, 0.65);
    part(modules.fin, 0, 0.35, -0.25, 0.12, 0.45, 0.5);
    part(modules.slam, 0, 0.05, 0.6, 0.55, 0.25, 0.28);
    part(modules.crest, 0, 0.43, -0.08, 0.12, 0.4, 0.55);
    for (const side of [-1, 1])
      part(modules.fins, side * 0.55, 0.29, -0.3, 0.12, 0.36, 0.52);
    for (const group of Object.values(modules)) mesh.add(group);
    return modules;
  }
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0));
  const aimPoint = new THREE.Vector3();
  const occluders = new Set<
    THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
  >();
  const entities = new Map<string, Entity>();
  const projectileGeometry = new THREE.SphereGeometry(0.18);
  const projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xffdb74 });
  const projectiles = new Map<number, THREE.Mesh>();
  const trailGeometry = new THREE.CircleGeometry(1, 24);
  const trailMaterial = new THREE.MeshBasicMaterial({
    color: 0x568b7b,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });
  const trails = new Map<number, THREE.Mesh>();
  const botGeometry = new THREE.ConeGeometry(0.7, 1, 4);
  const botMaterial = new THREE.MeshStandardMaterial({ color: 0xa1a9b3 });
  const botAllyMaterial = new THREE.MeshStandardMaterial({ color: 0x66dbbc });
  const botTier2Material = new THREE.MeshStandardMaterial({ color: 0x8a70c4 });
  const botEliteMaterial = new THREE.MeshStandardMaterial({ color: 0xe7bc58 });
  const botTellMaterial = new THREE.MeshStandardMaterial({ color: 0xff754a });
  const bots = new Map<string, THREE.Mesh>();
  const resourceGeometry = new THREE.SphereGeometry(0.4);
  const resourceMaterials = {
    vegetation: new THREE.MeshStandardMaterial({ color: 0x72c77b }),
    meat: new THREE.MeshStandardMaterial({ color: 0xe08f6c }),
    aquatic: new THREE.MeshStandardMaterial({ color: 0x70b9dd }),
    repair: new THREE.MeshStandardMaterial({ color: 0xe9d475 }),
  };
  const resources = new Map<string, THREE.Mesh>();
  const poiGeometry = new THREE.CylinderGeometry(0.48, 0.68, 1.3, 6);
  const poiMaterials = {
    available: new THREE.MeshStandardMaterial({ color: 0x6de6d0 }),
    reserved: new THREE.MeshStandardMaterial({ color: 0xf2ba57 }),
    claimed: new THREE.MeshStandardMaterial({ color: 0x626a6d }),
  };
  const sites = new Map<string, THREE.Mesh>();
  const shelterGeometry = new THREE.TorusGeometry(1, 0.13, 8, 24);
  const shelterMaterial = new THREE.MeshStandardMaterial({ color: 0x846f5d });
  const shelters = new Map<string, THREE.Mesh>();
  const firmwareGeometry = new THREE.OctahedronGeometry(0.5);
  const firmwareMaterials = Array.from(
    { length: 16 },
    (_, index) =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(index / 16, 0.65, 0.55),
      }),
  );
  const firmware = new Map<string, THREE.Mesh>();
  const ringGeometry = new THREE.RingGeometry(0.96, 1, 96);
  const boundaryMaterial = new THREE.MeshBasicMaterial({
    color: 0xffae45,
    side: THREE.DoubleSide,
  });
  const meteorMaterial = new THREE.MeshBasicMaterial({
    color: 0xff493d,
    side: THREE.DoubleSide,
  });
  const boundary = new THREE.Mesh(ringGeometry, boundaryMaterial);
  boundary.rotation.x = -Math.PI / 2;
  boundary.position.y = 0.07;
  boundary.visible = false;
  scene.add(boundary);
  const meteors = new Map<number, THREE.Mesh>();
  const prediction = new LocalPrediction();
  let snapshotClock = new SnapshotClock();
  let arenaSeed: string | null = null;
  const arenaObjects: THREE.Mesh[] = [];
  const terrainMeshes: {
    mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
    terrain: Terrain;
    waterDepth: number;
  }[] = [];
  let matchId = '';
  let roundId = '';
  let viewerId: string | null = null;
  let followId: string | null = null;
  let connected = false;
  let canPredict = false;
  let lastTimestamp = 0;
  let lastRevision = -1;
  let frame = 0;
  function clearObservedEntities() {
    for (const entity of entities.values()) scene.remove(entity.mesh);
    entities.clear();
    for (const mesh of projectiles.values()) scene.remove(mesh);
    projectiles.clear();
    for (const mesh of trails.values()) scene.remove(mesh);
    trails.clear();
    for (const mesh of bots.values()) scene.remove(mesh);
    bots.clear();
    for (const mesh of resources.values()) scene.remove(mesh);
    resources.clear();
    for (const mesh of sites.values()) scene.remove(mesh);
    sites.clear();
    for (const mesh of shelters.values()) scene.remove(mesh);
    shelters.clear();
    for (const mesh of firmware.values()) scene.remove(mesh);
    firmware.clear();
    for (const mesh of meteors.values()) scene.remove(mesh);
    meteors.clear();
  }
  function clearTerrain() {
    for (const mesh of arenaObjects) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material))
        mesh.material.forEach((material) => material.dispose());
      else mesh.material.dispose();
    }
    arenaObjects.length = 0;
    terrainMeshes.length = 0;
    arenaSeed = null;
  }
  function clear() {
    clearTerrain();
    clearObservedEntities();
    boundary.visible = false;
    followId = null;
  }
  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  function draw() {
    const now = performance.now();
    for (const entity of entities.values()) {
      const position = entity.timeline.sample(now);
      if (position)
        entity.mesh.position.set(position.x, position.y, position.z);
    }
    const viewer = followId ? entities.get(followId) : undefined;
    if (viewer) {
      if (followId === viewerId && connected && canPredict) {
        const position = prediction.sample(now);
        if (position)
          viewer.mesh.position.set(position.x, position.y, position.z);
      }
      const { x, y, z } = viewer.mesh.position;
      const distance = Math.max(12, viewer.radius * 12);
      camera.position.set(x, y + distance, z + distance);
      const far = Math.max(100, distance * 4);
      if (camera.far !== far) {
        camera.far = far;
        camera.updateProjectionMatrix();
      }
      camera.lookAt(x, y, z);
      camera.updateMatrixWorld();
      const direction = viewer.mesh.position.clone().sub(camera.position);
      raycaster.set(camera.position, direction.clone().normalize());
      raycaster.far = direction.length();
      const blocked = new Set(
        raycaster
          .intersectObjects([...occluders], false)
          .map((hit) => hit.object),
      );
      for (const obstacle of occluders) {
        obstacle.material.opacity = blocked.has(obstacle) ? 0.25 : 1;
        obstacle.material.transparent = blocked.has(obstacle);
        obstacle.material.depthWrite = !blocked.has(obstacle);
      }
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  }
  draw();
  return {
    setControl(input: Movement) {
      prediction.input(input);
    },
    setConnected(value: boolean) {
      connected = value;
      if (!value) prediction.reset();
    },
    aimAt(clientX: number, clientY: number): number | null {
      const viewer = viewerId ? entities.get(viewerId) : undefined;
      const rect = canvas.getBoundingClientRect();
      if (!viewer || !rect.width || !rect.height) return null;
      pointer.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((clientY - rect.top) / rect.height) * 2,
      );
      camera.updateMatrixWorld();
      raycaster.setFromCamera(pointer, camera);
      groundPlane.constant = -viewer.mesh.position.y;
      if (!raycaster.ray.intersectPlane(groundPlane, aimPoint)) return null;
      const dx = aimPoint.x - viewer.mesh.position.x;
      const dz = aimPoint.z - viewer.mesh.position.z;
      return Math.hypot(dx, dz) > 0.001 ? Math.atan2(dx, dz) : null;
    },
    addOccluder(
      mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>,
    ) {
      mesh.material = mesh.material.clone();
      occluders.add(mesh);
      scene.add(mesh);
      return () => {
        occluders.delete(mesh);
        scene.remove(mesh);
        mesh.material.dispose();
      };
    },
    reset() {
      clear();
      snapshotClock = new SnapshotClock();
      prediction.reset();
      canPredict = false;
      matchId = '';
      roundId = '';
      lastTimestamp = 0;
      lastRevision = -1;
    },
    setViewer(id: string | null) {
      if (viewerId !== id) prediction.reset();
      viewerId = id;
    },
    update(observation: Observation) {
      if (
        matchId !== observation.matchId ||
        roundId !== observation.state.roundId
      ) {
        clear();
        snapshotClock = new SnapshotClock();
        prediction.reset();
        canPredict = false;
        matchId = observation.matchId;
        roundId = observation.state.roundId;
        lastTimestamp = 0;
        lastRevision = -1;
      }
      if (
        observation.timestamp < lastTimestamp ||
        observation.revision <= lastRevision
      )
        return false;
      const geometryKey =
        observation.state.roundId + JSON.stringify(observation.state.arena);
      if (arenaSeed !== geometryKey) {
        clearTerrain();
        const terrainColors = {
          grass: 0x486b4c,
          sand: 0xa78b58,
          snow: 0xb2c5cb,
          water: 0x416d88,
        };
        for (const region of observation.state.arena.terrain) {
          const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(region.width, region.depth),
            new THREE.MeshStandardMaterial({
              color:
                region.terrain === 'water' && region.waterDepth > 0
                  ? region.waterDepth === 1
                    ? 0x32566e
                    : 0x263f59
                  : terrainColors[region.terrain],
            }),
          );
          mesh.rotation.x = -Math.PI / 2;
          mesh.position.set(region.x, -0.02, region.z);
          scene.add(mesh);
          arenaObjects.push(mesh);
          terrainMeshes.push({
            mesh,
            terrain: region.terrain,
            waterDepth: region.waterDepth,
          });
        }
        for (const box of observation.state.arena.obstacles) {
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(box.width, box.height, box.depth),
            new THREE.MeshStandardMaterial({ color: 0x59686a }),
          );
          mesh.position.set(box.x, box.height / 2, box.z);
          scene.add(mesh);
          arenaObjects.push(mesh);
        }
        arenaSeed = geometryKey;
      }
      const nextFollowId = observation.state.spectating ?? viewerId;
      if (followId !== nextFollowId) {
        clearObservedEntities();
        prediction.reset();
      }
      followId = nextFollowId;
      const terrainColors = {
        grass: 0x486b4c,
        sand: 0xa78b58,
        snow: 0xb2c5cb,
        water: 0x416d88,
      };
      for (const { mesh, terrain, waterDepth } of terrainMeshes) {
        const event = observation.state.weather.find(
          (item) => item.biome === terrain && item.state === 'active',
        );
        const color =
          event?.kind === 'heatwave'
            ? 0xb9693b
            : event?.kind === 'blizzard'
              ? 0x849eae
              : event?.kind === 'rain'
                ? 0x365d62
                : terrain === 'water' && waterDepth > 0
                  ? waterDepth === 1
                    ? 0x32566e
                    : 0x263f59
                  : terrainColors[terrain];
        mesh.material.color.setHex(color);
      }
      const clock = observation.state.worldClock;
      const transition = Math.max(
        0,
        Math.min(1, (clock.nextTransitionAt - observation.state.time) / 10_000),
      );
      light.intensity =
        clock.phase === 'day'
          ? 0.65 + 1.35 * transition
          : 2 - 1.35 * transition;
      boundary.visible =
        observation.state.phase === 'running' &&
        observation.state.boundary.elapsedMs >=
          observation.state.boundary.shrinkStartMs;
      boundary.scale.setScalar(observation.state.boundary.radius);
      const meteorIds = new Set(
        observation.state.meteors.map((meteor) => meteor.id),
      );
      for (const [id, mesh] of meteors)
        if (!meteorIds.has(id)) {
          scene.remove(mesh);
          meteors.delete(id);
        }
      for (const meteor of observation.state.meteors) {
        let mesh = meteors.get(meteor.id);
        if (!mesh) {
          mesh = new THREE.Mesh(ringGeometry, meteorMaterial);
          mesh.rotation.x = -Math.PI / 2;
          scene.add(mesh);
          meteors.set(meteor.id, mesh);
        }
        mesh.position.set(meteor.position.x, 0.08, meteor.position.z);
        mesh.scale.setScalar(meteor.radius);
      }
      lastRevision = observation.revision;
      lastTimestamp = observation.timestamp;
      const botIds = new Set(observation.state.bots.map((bot) => bot.id));
      for (const [id, mesh] of bots)
        if (!botIds.has(id)) {
          scene.remove(mesh);
          bots.delete(id);
        }
      for (const bot of observation.state.bots) {
        let mesh = bots.get(bot.id);
        if (!mesh) {
          mesh = new THREE.Mesh(botGeometry, botMaterial);
          scene.add(mesh);
          bots.set(bot.id, mesh);
        }
        mesh.material = bot.attacking
          ? botTellMaterial
          : bot.ownerId ||
              (bot.friendshipUntil !== null &&
                bot.friendshipUntil > observation.state.time)
            ? botAllyMaterial
            : bot.elite
              ? botEliteMaterial
              : bot.tier > 1
                ? botTier2Material
                : botMaterial;
        mesh.position.set(
          bot.position.x,
          bot.position.y + 0.35,
          bot.position.z,
        );
        mesh.scale.setScalar(bot.radius * 2 * (bot.elite ? 1.4 : 1));
      }
      const resourceIds = new Set(
        observation.state.resources.map((resource) => resource.id),
      );
      for (const [id, mesh] of resources)
        if (!resourceIds.has(id)) {
          scene.remove(mesh);
          resources.delete(id);
        }
      for (const resource of observation.state.resources) {
        let mesh = resources.get(resource.id);
        if (!mesh) {
          mesh = new THREE.Mesh(
            resourceGeometry,
            resourceMaterials[resource.source],
          );
          scene.add(mesh);
          resources.set(resource.id, mesh);
        }
        mesh.material = resource.repair
          ? resourceMaterials.repair
          : resourceMaterials[resource.source];
        mesh.position.set(resource.position.x, 0.4, resource.position.z);
        mesh.scale.setScalar(1 - resource.stage * 0.2);
      }
      const siteIds = new Set(
        observation.state.pointsOfInterest.map((site) => site.id),
      );
      for (const [id, mesh] of sites)
        if (!siteIds.has(id)) {
          scene.remove(mesh);
          sites.delete(id);
        }
      for (const site of observation.state.pointsOfInterest) {
        let mesh = sites.get(site.id);
        if (!mesh) {
          mesh = new THREE.Mesh(poiGeometry, poiMaterials.available);
          scene.add(mesh);
          sites.set(site.id, mesh);
        }
        mesh.material = poiMaterials[site.status];
        mesh.position.set(site.position.x, 0.65, site.position.z);
      }
      const shelterIds = new Set(
        observation.state.shelters.map((site) => site.id),
      );
      for (const [id, mesh] of shelters)
        if (!shelterIds.has(id)) {
          scene.remove(mesh);
          shelters.delete(id);
        }
      for (const site of observation.state.shelters) {
        let mesh = shelters.get(site.id);
        if (!mesh) {
          mesh = new THREE.Mesh(shelterGeometry, shelterMaterial);
          mesh.rotation.x = -Math.PI / 2;
          scene.add(mesh);
          shelters.set(site.id, mesh);
        }
        mesh.position.set(site.position.x, 0.1, site.position.z);
      }
      const firmwareIds = new Set(
        observation.state.firmware.map((module) => module.id),
      );
      for (const [id, mesh] of firmware)
        if (!firmwareIds.has(id)) {
          scene.remove(mesh);
          firmware.delete(id);
        }
      for (const module of observation.state.firmware) {
        let mesh = firmware.get(module.id);
        if (!mesh) {
          const index = Number(module.appearance.replace('pattern-', '')) - 1;
          mesh = new THREE.Mesh(
            firmwareGeometry,
            firmwareMaterials[index] ?? firmwareMaterials[0],
          );
          scene.add(mesh);
          firmware.set(module.id, mesh);
        }
        mesh.position.set(module.position.x, 0.55, module.position.z);
      }
      const activeProjectiles = new Set(
        observation.state.projectiles.map((projectile) => projectile.id),
      );
      for (const [id, mesh] of projectiles)
        if (!activeProjectiles.has(id)) {
          scene.remove(mesh);
          projectiles.delete(id);
        }
      for (const projectile of observation.state.projectiles) {
        let mesh = projectiles.get(projectile.id);
        if (!mesh) {
          mesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
          scene.add(mesh);
          projectiles.set(projectile.id, mesh);
        }
        mesh.position.set(
          projectile.position.x,
          projectile.position.y,
          projectile.position.z,
        );
      }
      const activeTrails = new Set(
        observation.state.trails.map((trail) => trail.id),
      );
      for (const [id, mesh] of trails)
        if (!activeTrails.has(id)) {
          scene.remove(mesh);
          trails.delete(id);
        }
      for (const trail of observation.state.trails) {
        let mesh = trails.get(trail.id);
        if (!mesh) {
          mesh = new THREE.Mesh(trailGeometry, trailMaterial);
          mesh.rotation.x = -Math.PI / 2;
          scene.add(mesh);
          trails.set(trail.id, mesh);
        }
        mesh.position.set(trail.position.x, 0.04, trail.position.z);
        mesh.scale.setScalar(trail.radius);
      }
      const visible = new Set(
        observation.state.players.map((player) => player.id),
      );
      for (const [id, entity] of entities)
        if (!visible.has(id)) {
          scene.remove(entity.mesh);
          entities.delete(id);
          if (id === viewerId) {
            prediction.reset();
            canPredict = false;
          }
        }
      for (const player of observation.state.players) {
        let entity = entities.get(player.id);
        if (!entity) {
          const mesh = new THREE.Mesh(geometry, material);
          const heading = new THREE.Mesh(headingGeometry, headingMaterial);
          heading.position.set(0, 0.3, 0.45);
          mesh.add(heading);
          const attackCue = new THREE.Mesh(moduleGeometry, headingMaterial);
          attackCue.position.set(0, 0.1, 0.85);
          attackCue.scale.set(0.65, 0.08, 0.12);
          mesh.add(attackCue);
          const hitCue = new THREE.Mesh(moduleGeometry, hitMaterial);
          hitCue.position.set(0, 0.32, 0);
          hitCue.scale.set(0.7, 0.06, 0.7);
          mesh.add(hitCue);
          const guardCue = new THREE.Mesh(guardGeometry, guardMaterial);
          guardCue.rotation.x = Math.PI / 2;
          mesh.add(guardCue);
          scene.add(mesh);
          entity = {
            mesh,
            radius: player.radius,
            timeline: new SnapshotTimeline(snapshotClock),
            modules: makeModules(mesh),
            attackCue,
            hitCue,
            guardCue,
          };
          entity.mesh.position.set(
            player.position.x,
            player.position.y,
            player.position.z,
          );
          entities.set(player.id, entity);
        }
        entity.mesh.visible = player.life.kind === 'alive' && !player.shelter;
        entity.attackCue.visible = player.attacking;
        const worldScale = player.radius * 2;
        entity.attackCue.scale.z = player.attackReach / worldScale;
        entity.attackCue.position.z = player.attackReach / (2 * worldScale);
        entity.hitCue.visible = player.hit;
        entity.guardCue.visible = player.guarding;
        for (const [name, group] of Object.entries(entity.modules)) {
          const module = player.modules?.find((item) => item.kind === name);
          group.visible = !!module;
          if (module)
            group.scale.setScalar(
              1 + Math.min(4, Math.max(0, module.rank - 1)) * 0.08,
            );
        }
        entity.radius = player.radius;
        entity.mesh.scale.setScalar(worldScale);
        entity.mesh.rotation.y = player.aim;
        if (player.id === viewerId) {
          canPredict =
            observation.state.phase === 'running' &&
            player.life.kind === 'alive' &&
            player.life.activity === 'playing' &&
            !player.shelter;
          if (connected && canPredict) {
            const region = terrainRegionAt(
              observation.state.arena,
              player.position.x,
              player.position.z,
            );
            const terrain = region?.terrain ?? 'grass';
            const specific =
              terrain === 'sand'
                ? player.stats?.sandAdaptation
                : terrain === 'snow'
                  ? player.stats?.snowAdaptation
                  : terrain === 'water'
                    ? player.stats?.waterAdaptation
                    : 0;
            prediction.speedFactor(
              ((player.stats?.speed ?? 5) / 5) *
                terrainSpeedMultiplier(
                  terrain,
                  player.stats?.terrainAdaptation ?? 0,
                  specific ?? 0,
                  region?.waterDepth,
                ) *
                ((observation.state.thermal?.cold ?? 0) >= 100
                  ? THERMAL_RULES.coldSpeedFactor
                  : 1),
            );
            prediction.observe(player.position, performance.now());
          } else prediction.reset();
        }
        if (player.life.kind === 'eliminated') {
          entity.timeline = new SnapshotTimeline(snapshotClock);
          entity.mesh.position.set(
            player.position.x,
            player.position.y,
            player.position.z,
          );
        }
        entity.timeline.add(
          observation.timestamp,
          player.position,
          performance.now(),
        );
      }
      return true;
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      clear();
      ringGeometry.dispose();
      boundaryMaterial.dispose();
      meteorMaterial.dispose();
      geometry.dispose();
      material.dispose();
      headingGeometry.dispose();
      headingMaterial.dispose();
      hitMaterial.dispose();
      guardGeometry.dispose();
      guardMaterial.dispose();
      moduleGeometry.dispose();
      moduleMaterial.dispose();
      projectileGeometry.dispose();
      projectileMaterial.dispose();
      trailGeometry.dispose();
      trailMaterial.dispose();
      botGeometry.dispose();
      botMaterial.dispose();
      botAllyMaterial.dispose();
      botTier2Material.dispose();
      botEliteMaterial.dispose();
      botTellMaterial.dispose();
      resourceGeometry.dispose();
      poiGeometry.dispose();
      shelterGeometry.dispose();
      shelterMaterial.dispose();
      for (const material of Object.values(poiMaterials)) material.dispose();
      firmwareGeometry.dispose();
      for (const material of firmwareMaterials) material.dispose();
      for (const material of Object.values(resourceMaterials))
        material.dispose();
      for (const mesh of occluders) mesh.material.dispose();
      occluders.clear();
      renderer.dispose();
    },
  };
}
