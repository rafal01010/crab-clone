import * as THREE from 'three';
import { createAssets, PRESENTATION } from './assets.js';
import { createCombatBatches, createCraftCombat } from './combat-art.js';
import {
  biomeEdges,
  createTerrainClusters,
  groundMaterial,
  obstacleGeometry,
  terrainColor,
} from './terrain-art.js';
import type { PresentationFeedback } from '../../../shared/match.js';
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
import type { Preferences } from './preferences.js';

type Entity = {
  mesh: THREE.Mesh;
  radius: number;
  timeline: SnapshotTimeline;
  modules: ReturnType<ReturnType<typeof createAssets>['craft']>['modules'];
  moving: boolean;
  combat: ReturnType<typeof createCraftCombat>;
  hitCue: THREE.Mesh;
  guardCue: THREE.Mesh;
};

export function createWorld(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  const assets = createAssets();
  const scene = new THREE.Scene();
  const combatBatches = createCombatBatches(scene);
  let clusters = createTerrainClusters(scene, assets);
  let artLoaded = false;
  let disposed = false;
  scene.background = new THREE.Color(0x101722);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const gameplayCamera = PRESENTATION.camera;
  const camera = new THREE.PerspectiveCamera(
    gameplayCamera.fieldOfView,
    1,
    0.1,
    100,
  );
  camera.position.set(0, gameplayCamera.distance, gameplayCamera.distance);
  camera.lookAt(0, 0, 0);
  const light = new THREE.HemisphereLight(0xffffff, 0x303040, 2);
  scene.add(light);
  const sun = new THREE.DirectionalLight(0xffefd9, 1.6);
  sun.position.set(-8, 14, 6);
  scene.add(sun);
  const hitMaterial = assets.light;
  const guardGeometry = new THREE.TorusGeometry(0.58, 0.035, 4, 16);
  const guardMaterial = assets.ally;
  const moduleGeometry = new THREE.BoxGeometry(1, 1, 1);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0));
  const aimPoint = new THREE.Vector3();
  const occluders = new Set<
    THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
  >();
  const terrainOccluders = new Set<
    THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
  >();
  const obstacleMaterials = {
    solid: new THREE.MeshStandardMaterial({
      color: 0x697771,
      vertexColors: true,
      roughness: 1,
      flatShading: true,
    }),
    faded: new THREE.MeshStandardMaterial({
      color: 0x697771,
      vertexColors: true,
      roughness: 1,
      flatShading: true,
      opacity: 0.25,
      transparent: true,
      depthWrite: false,
    }),
  };
  const entities = new Map<string, Entity>();
  const rain = assets.mesh(
    'weather:rain',
    Array.from({ length: 24 }, (_, index) => ({
      at: [
        ((index % 6) - 2.5) * 2.7,
        2 + (index % 3),
        (Math.floor(index / 6) - 1.5) * 3,
      ],
      size: [0.025, 0.4, 0.025],
    })),
    assets.hull,
  );
  rain.visible = false;
  scene.add(rain);
  type BotAsset = ReturnType<typeof assets.bot> & {
    bars: ReturnType<typeof makeBars>;
    fraction: number;
    previous: number;
    changedAt: number;
  };
  const bots = new Map<string, BotAsset>();
  const resources = new Map<string, ReturnType<typeof assets.resource>>();
  const sites = new Map<string, ReturnType<typeof assets.site>>();
  const shelters = new Map<string, ReturnType<typeof assets.shelter>>();
  const firmware = new Map<string, THREE.Mesh>();
  function makeBars() {
    const root = new THREE.Group();
    const background = assets.mesh(
      'bar',
      [{ at: [0, 0, 0], size: [1.2, 0.08, 0.08] }],
      assets.dark,
    );
    root.add(background);
    const loss = new THREE.Mesh(background.geometry, assets.light);
    const hull = new THREE.Mesh(background.geometry, assets.ally);
    const plating = new THREE.Mesh(background.geometry, assets.trim);
    loss.position.z = 0.02;
    hull.position.z = 0.04;
    plating.position.set(0, 0.12, 0);
    root.add(loss, hull, plating);
    return { root, hull, loss, plating };
  }
  const feedbackLayer = document.createElement('div');
  feedbackLayer.setAttribute('aria-hidden', 'true');
  feedbackLayer.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:4;overflow:hidden';
  document.body.append(feedbackLayer);
  const impactRing = new THREE.RingGeometry(0.57, 0.68, 16).rotateX(
    -Math.PI / 2,
  );
  const impactPaint = {
    hull: new THREE.MeshBasicMaterial({ color: 0xffb835 }),
    plating: new THREE.MeshBasicMaterial({ color: 0xcfb1ff }),
    break: new THREE.MeshBasicMaterial({ color: 0xf1dcff }),
    other: new THREE.MeshBasicMaterial({ color: 0xcde9ef }),
  };
  type Impact = {
    label: HTMLSpanElement;
    shape: THREE.Mesh;
    ring: THREE.Mesh;
    spark: THREE.Mesh | null;
    until: number;
    targetId: string;
    value: PresentationFeedback | null;
  };
  const impactPool: Impact[] = Array.from(
    { length: PRESENTATION.maxImpacts },
    () => {
      const label = document.createElement('span');
      label.style.cssText =
        'position:absolute;display:none;padding:3px 6px;background:#101722ee;border:1px solid #c2c9cc;border-radius:3px;color:#fff;font:600 12px Inter, sans-serif;white-space:nowrap;transform:translate(-50%,-100%)';
      feedbackLayer.append(label);
      const shape = assets.mesh(
        'impact',
        Array.from({ length: 6 }, (_, index) => {
          const angle = (index * Math.PI) / 3 + Math.PI / 12;
          return {
            at: [Math.sin(angle) * 0.77, 0, Math.cos(angle) * 0.77],
            size: [0.13, 0.07, index % 2 ? 0.32 : 0.43],
            form: 'wedge',
            turn: [0, angle, 0],
          };
        }),
        impactPaint.hull,
      );
      const ring = new THREE.Mesh(impactRing, impactPaint.hull);
      shape.add(ring);
      shape.visible = false;
      scene.add(shape);
      return {
        label,
        shape,
        ring,
        spark: null,
        until: 0,
        targetId: '',
        value: null,
      };
    },
  );
  let lastFeedbackId = 0;
  let damageNumbers = false;
  let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let quality: Preferences['quality'] = 'low';
  const feedbackText = (value: PresentationFeedback) => {
    const label = {
      hull: 'HULL HIT',
      plating: 'PLATE HIT',
      break: 'PLATE BREAK',
      dodge: 'DODGE',
      blocked: 'BLOCKED',
      repair: 'REPAIR',
      salvage: 'SALVAGED',
      reward: 'LEVEL GAINED',
    }[value.kind];
    return (
      (value.lethal ? 'ELIMINATED' : label) +
      (damageNumbers && value.hull + value.plating > 0
        ? ` ${value.kind === 'repair' ? '+' : '−'}${Math.ceil(value.hull + value.plating)}`
        : '')
    );
  };
  function showFeedback(value: PresentationFeedback, now: number) {
    const existing = impactPool.find(
      (item) => item.targetId === value.targetId && item.until > now,
    );
    const slot =
      existing ??
      impactPool.find((item) => item.until <= now) ??
      impactPool.reduce((a, b) => (a.until < b.until ? a : b));
    const priority = {
      hull: 4,
      plating: 4,
      break: 5,
      dodge: 3,
      blocked: 3,
      repair: 2,
      reward: 1,
      salvage: 0,
    };
    if (existing?.value && priority[existing.value.kind] > priority[value.kind])
      return;
    slot.value = value;
    slot.targetId = value.targetId;
    slot.until = now + PRESENTATION.impactMs;
    slot.label.textContent = feedbackText(value);
    slot.label.style.borderColor =
      value.kind === 'repair'
        ? '#76cdb4'
        : value.kind === 'plating' || value.kind === 'break'
          ? '#b393ff'
          : '#ffbc51';
  }
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
  const ground = {
    grass: groundMaterial('grass'),
    sand: groundMaterial('sand'),
    snow: groundMaterial('snow'),
    water: groundMaterial('water'),
  };
  const groundTint = new THREE.Color();
  const terrainMeshes: {
    mesh: THREE.InstancedMesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
    terrain: Terrain;
    waterDepth: number;
    color: number | null;
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
  function clearImpact(slot: (typeof impactPool)[number]) {
    slot.until = 0;
    slot.targetId = '';
    slot.value = null;
    slot.label.textContent = '';
    slot.label.style.display = 'none';
    slot.label.style.removeProperty('left');
    slot.label.style.removeProperty('top');
    slot.shape.visible = false;
    slot.shape.position.set(0, 0, 0);
  }
  function clearObservedEntities() {
    for (const slot of impactPool) clearImpact(slot);
    for (const entity of entities.values()) scene.remove(entity.mesh);
    entities.clear();
    combatBatches.clear();
    for (const bot of bots.values()) scene.remove(bot.root);
    bots.clear();
    for (const item of resources.values()) scene.remove(item.root);
    resources.clear();
    for (const item of sites.values()) scene.remove(item.root);
    sites.clear();
    for (const item of shelters.values()) scene.remove(item.root);
    shelters.clear();
    for (const mesh of firmware.values()) scene.remove(mesh);
    firmware.clear();
    for (const mesh of meteors.values()) scene.remove(mesh);
    meteors.clear();
  }
  function clearTerrain() {
    for (const mesh of arenaObjects) {
      scene.remove(mesh);
      if (mesh instanceof THREE.InstancedMesh) mesh.dispose();
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material))
        mesh.material.forEach((material) => material.dispose());
      else if (
        mesh.material !== obstacleMaterials.solid &&
        mesh.material !== obstacleMaterials.faded &&
        !(mesh instanceof THREE.InstancedMesh)
      )
        mesh.material.dispose();
    }
    arenaObjects.length = 0;
    terrainMeshes.length = 0;
    clusters.clear();
    arenaSeed = null;
    for (const mesh of terrainOccluders) occluders.delete(mesh);
    terrainOccluders.clear();
  }
  function clear() {
    clearTerrain();
    clearObservedEntities();
    boundary.visible = false;
    rain.visible = false;
    followId = null;
  }
  let renderScale = 1;
  let pixelRatio = window.devicePixelRatio;
  function resize() {
    pixelRatio = window.devicePixelRatio;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const scale = renderScale * pixelRatio;
    const bufferWidth = Math.max(1, Math.floor(width * scale));
    const bufferHeight = Math.max(1, Math.floor(height * scale));
    if (canvas.width !== bufferWidth || canvas.height !== bufferHeight)
      renderer.setSize(bufferWidth, bufferHeight, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  function draw() {
    if (window.devicePixelRatio !== pixelRatio) resize();
    const now = performance.now();
    for (const entity of entities.values()) {
      const position = entity.timeline.sample(now);
      if (position)
        entity.mesh.position.set(position.x, position.y, position.z);
      for (const kind of ['jet', 'wings', 'legs', 'more-legs']) {
        const module = entity.modules[kind];
        if (module)
          module.position.y =
            !reducedMotion && entity.moving ? Math.sin(now / 140) * 0.025 : 0;
      }
    }
    const viewer = followId ? entities.get(followId) : undefined;
    if (viewer) {
      if (followId === viewerId && connected && canPredict) {
        const position = prediction.sample(now);
        if (position)
          viewer.mesh.position.set(position.x, position.y, position.z);
      }
      const { x, y, z } = viewer.mesh.position;
      rain.position.set(x, reducedMotion ? 0 : -((now / 700) % 1), z);
      const distance = Math.max(
        gameplayCamera.distance,
        viewer.radius * gameplayCamera.distance,
      );
      camera.position.set(x, y + distance, z + distance);
      const far = Math.max(100, distance * 4);
      if (camera.far !== far) {
        camera.far = far;
        camera.updateProjectionMatrix();
      }
      camera.lookAt(x, y, z);
      camera.updateMatrixWorld();
      clusters.update(x, z, quality);
      const direction = viewer.mesh.position.clone().sub(camera.position);
      raycaster.set(camera.position, direction.clone().normalize());
      raycaster.far = direction.length();
      const blocked = new Set(
        raycaster
          .intersectObjects([...occluders], false)
          .map((hit) => hit.object),
      );
      for (const obstacle of occluders) {
        if (terrainOccluders.has(obstacle)) {
          obstacle.material = blocked.has(obstacle)
            ? obstacleMaterials.faded
            : obstacleMaterials.solid;
          continue;
        }
        obstacle.material.opacity = blocked.has(obstacle) ? 0.25 : 1;
        obstacle.material.transparent = blocked.has(obstacle);
        obstacle.material.depthWrite = !blocked.has(obstacle);
      }
    }
    for (const bot of bots.values()) {
      const trail = Math.max(
        bot.fraction,
        bot.previous -
          Math.max(0, now - bot.changedAt - 120) / PRESENTATION.damageTrailMs,
      );
      bot.bars.loss.scale.x = Math.max(0.001, trail);
      bot.bars.loss.position.x = (trail - 1) * 0.6;
    }
    for (const slot of impactPool) {
      if (!slot.value) continue;
      if (slot.until <= now) {
        clearImpact(slot);
        continue;
      }
      const bot = bots.get(slot.targetId);
      const player = entities.get(slot.targetId);
      const origin =
        bot?.root.position ?? player?.mesh.position ?? slot.value.position;
      const age = PRESENTATION.impactMs - slot.until + now;
      const outcome = slot.value.kind;
      const damage =
        outcome === 'hull' || outcome === 'plating' || outcome === 'break';
      slot.shape.visible = age < (damage ? 265 : 190);
      slot.shape.position.set(
        origin.x,
        Math.max(0.25, origin.y + 0.31),
        origin.z,
      );
      slot.shape.material = slot.ring.material = damage
        ? impactPaint[outcome]
        : outcome === 'repair'
          ? assets.ally
          : impactPaint.other;
      slot.ring.visible = damage;
      const targetSize = Math.max(
        0.9,
        Math.min(1.75, bot?.root.scale.x ?? player?.mesh.scale.x ?? 1),
      );
      const burst =
        targetSize * (reducedMotion ? 1.12 : 0.88 + Math.min(0.42, age / 540));
      slot.shape.rotation.y = outcome === 'dodge' ? Math.PI / 4 : 0;
      slot.shape.scale.set(
        burst * (outcome === 'blocked' ? 0.74 : outcome === 'break' ? 1.18 : 1),
        1,
        burst * (outcome === 'dodge' ? 0.54 : outcome === 'break' ? 1.18 : 1),
      );
      if (slot.spark) {
        slot.spark.visible =
          !reducedMotion &&
          (outcome === 'hull' || outcome === 'break') &&
          (quality !== 'low' || impactPool.indexOf(slot) < 12);
        const size = 1.1 + Math.min(0.55, age / 440);
        slot.spark.scale.set(size, size, 1);
      }
      const point = new THREE.Vector3(
        origin.x,
        origin.y + (bot ? 1.7 : 1.2),
        origin.z,
      ).project(camera);
      const rect = canvas.getBoundingClientRect();
      const visible =
        point.z > -1 &&
        point.z < 1 &&
        Math.abs(point.x) < 1 &&
        Math.abs(point.y) < 1;
      slot.label.style.display = visible ? 'block' : 'none';
      slot.label.style.left = `${rect.left + ((point.x + 1) * rect.width) / 2}px`;
      slot.label.style.top = `${rect.top + ((1 - point.y) * rect.height) / 2}px`;
    }
    for (const entity of entities.values()) {
      entity.combat.draw(now, reducedMotion);
      const shadow = entity.mesh.getObjectByName('contact-shadow');
      if (shadow)
        shadow.position.y =
          (0.03 - entity.mesh.position.y) / entity.mesh.scale.y;
    }
    for (const bot of bots.values()) {
      const shadow = bot.root.getObjectByName('contact-shadow');
      if (shadow)
        shadow.position.y = (0.03 - bot.root.position.y) / bot.root.scale.y;
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  }
  draw();
  return {
    async loadArt() {
      await assets.load();
      if (artLoaded || disposed) return;
      artLoaded = true;
      clear();
      clusters.dispose();
      clusters = createTerrainClusters(scene, assets);
      for (const slot of impactPool) {
        slot.spark = assets.sprite('spark');
        if (slot.spark) {
          slot.spark.position.y = 0.056;
          slot.shape.add(slot.spark);
        }
      }
    },
    setPresentation(options: {
      renderScale?: number;
      damageNumbers?: boolean;
      reducedMotion?: boolean;
      quality?: Preferences['quality'];
    }) {
      renderScale = Math.max(
        0.5,
        Math.min(1, options.renderScale ?? renderScale),
      );
      damageNumbers = options.damageNumbers ?? damageNumbers;
      reducedMotion = options.reducedMotion ?? reducedMotion;
      quality = options.quality ?? quality;
      rain.geometry.setDrawRange(
        0,
        rain.geometry.getAttribute('position').count /
          (quality === 'low' ? 3 : 1),
      );
      for (const slot of impactPool)
        if (slot.value) slot.label.textContent = feedbackText(slot.value);
      resize();
    },
    setControl(input: Movement) {
      prediction.input(input);
    },
    setConnected(value: boolean) {
      connected = value;
      if (!value) {
        prediction.reset();
        combatBatches.clear();
        for (const entity of entities.values())
          entity.combat.update(null, 0, 0);
        for (const bot of bots.values()) bot.pose(null, reducedMotion);
      }
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
      lastFeedbackId = 0;
    },
    setViewer(id: string | null) {
      if (viewerId !== id) prediction.reset();
      viewerId = id;
    },
    update(observation: Observation, showRecentFeedback = true) {
      if (
        matchId === observation.matchId &&
        (observation.timestamp < lastTimestamp ||
          observation.revision <= lastRevision)
      )
        return false;
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
        lastFeedbackId = 0;
      }
      lastRevision = observation.revision;
      lastTimestamp = observation.timestamp;
      if (observation.state.phase !== 'running') {
        if (arenaSeed !== null) {
          clear();
          snapshotClock = new SnapshotClock();
          prediction.reset();
          canPredict = false;
        }
        return true;
      }
      const geometryKey =
        observation.state.roundId + JSON.stringify(observation.state.arena);
      if (arenaSeed !== geometryKey) {
        clearTerrain();
        const groups = new Map<
          string,
          typeof observation.state.arena.terrain
        >();
        for (const region of observation.state.arena.terrain) {
          const key = `${region.terrain}:${region.waterDepth}`;
          const group = groups.get(key) ?? [];
          group.push(region);
          groups.set(key, group);
        }
        const matrix = new THREE.Matrix4();
        for (const regions of groups.values()) {
          const first = regions[0];
          if (!first) continue;
          const geometry = new THREE.PlaneGeometry(1, 1);
          geometry.rotateX(-Math.PI / 2);
          const mesh = new THREE.InstancedMesh(
            geometry,
            ground[first.terrain],
            regions.length,
          );
          regions.forEach((region, index) => {
            matrix.makeScale(region.width, 1, region.depth);
            matrix.setPosition(region.x, -0.02, region.z);
            mesh.setMatrixAt(index, matrix);
          });
          mesh.instanceMatrix.needsUpdate = true;
          mesh.computeBoundingSphere();
          scene.add(mesh);
          arenaObjects.push(mesh);
          terrainMeshes.push({
            mesh,
            terrain: first.terrain,
            waterDepth: first.waterDepth,
            color: null,
          });
        }
        const edges = biomeEdges(observation.state.arena.terrain);
        scene.add(edges);
        arenaObjects.push(edges);
        clusters.setArena(observation.state.arena);
        for (const box of observation.state.arena.obstacles) {
          const mesh = new THREE.Mesh(
            obstacleGeometry(assets, box),
            obstacleMaterials.solid,
          );
          mesh.position.set(box.x, 0, box.z);
          scene.add(mesh);
          arenaObjects.push(mesh);
          if (box.height > 1) {
            occluders.add(mesh);
            terrainOccluders.add(mesh);
          }
        }
        arenaSeed = geometryKey;
      }
      const nextFollowId = observation.state.spectating ?? viewerId;
      if (followId !== nextFollowId) {
        clearObservedEntities();
        prediction.reset();
      }
      followId = nextFollowId;
      for (const batch of terrainMeshes) {
        const { mesh, terrain, waterDepth } = batch;
        const event = observation.state.weather.find(
          (item) => item.biome === terrain && item.state === 'active',
        );
        const color =
          event?.kind === 'heatwave'
            ? 0xae7548
            : event?.kind === 'blizzard'
              ? 0xaec8d2
              : event?.kind === 'rain'
                ? terrain === 'water'
                  ? terrainColor(terrain, waterDepth)
                  : 0x435841
                : terrainColor(terrain, waterDepth);
        if (batch.color !== color) {
          batch.color = color;
          groundTint.setHex(color);
          for (let index = 0; index < mesh.count; index++)
            mesh.setColorAt(index, groundTint);
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
      }
      const observed = observation.state.players.find(
        (player) => player.id === followId,
      );
      const localTerrain =
        observed &&
        terrainRegionAt(
          observation.state.arena,
          observed.position.x,
          observed.position.z,
        )?.terrain;
      const activeWeather = observation.state.weather.find(
        (event) => event.biome === localTerrain && event.state === 'active',
      );
      rain.visible =
        activeWeather?.kind === 'rain' || activeWeather?.kind === 'blizzard';
      rain.scale.y = activeWeather?.kind === 'blizzard' ? 0.25 : 1;
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
      sun.intensity =
        clock.phase === 'day' ? 0.65 + transition : 1.65 - transition;
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
          const cross = assets.mesh(
            'meteor:cross',
            [
              { at: [0, 0, 0], size: [0.75, 0.07, 0.07] },
              { at: [0, 0, 0], size: [0.07, 0.75, 0.07] },
            ],
            assets.danger,
          );
          mesh.add(cross);
          scene.add(mesh);
          meteors.set(meteor.id, mesh);
        }
        mesh.position.set(meteor.position.x, 0.08, meteor.position.z);
        mesh.scale.setScalar(meteor.radius);
        const cross = mesh.children[0];
        if (cross)
          cross.scale.setScalar(
            0.25 +
              0.75 *
                (1 -
                  Math.min(
                    1,
                    Math.max(0, meteor.impactAt - observation.state.time) /
                      2000,
                  )),
          );
      }
      const now = performance.now();
      const authorizedFeedback = new Set(
        observation.state.feedback?.map((item) => item.id),
      );
      for (const slot of impactPool)
        if (slot.value && !authorizedFeedback.has(slot.value.id))
          clearImpact(slot);
      for (const event of observation.state.feedback ?? []) {
        if (event.id <= lastFeedbackId) continue;
        if (showRecentFeedback && event.at >= observation.state.time - 900)
          showFeedback(event, now);
        lastFeedbackId = event.id;
      }
      const botIds = new Set(observation.state.bots.map((bot) => bot.id));
      for (const [id, asset] of bots)
        if (!botIds.has(id)) {
          scene.remove(asset.root);
          bots.delete(id);
        }
      for (const bot of observation.state.bots) {
        let asset = bots.get(bot.id);
        if (!asset) {
          const model = assets.bot(bot.role);
          const bars = makeBars();
          model.root.add(bars.root);
          bars.root.position.y = 1;
          asset = {
            ...model,
            bars,
            fraction: bot.health / bot.maxHealth,
            previous: bot.health / bot.maxHealth,
            changedAt: now,
          };
          scene.add(asset.root);
          bots.set(bot.id, asset);
        }
        asset.badge.visible = true;
        asset.badge.geometry = assets.geometry(
          'bot:tier:' + bot.tier,
          Array.from(
            { length: Math.max(1, Math.min(3, bot.tier)) },
            (_, index) => ({
              form: 'gem',
              at: [(index - (bot.tier - 1) / 2) * 0.25, 0.65, 0],
              size: [0.2, 0.18, 0.25],
            }),
          ),
        );
        asset.badge.scale.setScalar(bot.elite ? 1.4 : 0.7);
        const friendly =
          bot.kind !== 'wild' ||
          (bot.friendshipUntil ?? 0) > observation.state.time;
        asset.badge.material = friendly
          ? assets.ally
          : bot.elite
            ? assets.light
            : bot.tier > 1
              ? assets.trim
              : assets.hull;
        asset.pose(
          showRecentFeedback ? (bot.strikePose ?? null) : null,
          reducedMotion,
        );
        const status = bot.statuses.find(
          (item) =>
            item.kind === 'stun' ||
            item.kind === 'corrosion' ||
            item.kind === 'slow',
        );
        asset.status.visible = !!status;
        if (status) {
          asset.status.geometry = assets.geometry(
            'status:' + status.kind,
            status.kind === 'stun'
              ? [{ at: [0, 0.9, 0], size: [0.28, 0.35, 0.28], form: 'gem' }]
              : status.kind === 'corrosion'
                ? [
                    {
                      at: [-0.12, 0.9, 0],
                      size: [0.12, 0.25, 0.12],
                      form: 'cone',
                    },
                    {
                      at: [0.12, 0.9, 0],
                      size: [0.12, 0.25, 0.12],
                      form: 'cone',
                    },
                  ]
                : [
                    { at: [0, 0.85, 0], size: [0.45, 0.05, 0.18] },
                    { at: [0, 0.98, 0], size: [0.45, 0.05, 0.18] },
                  ],
          );
        }
        if (bot.statuses.some((status) => status.kind === 'corrosion'))
          asset.bars.hull.material = assets.light;
        else if (bot.statuses.some((status) => status.kind === 'stun'))
          asset.bars.hull.material = assets.trim;
        else asset.bars.hull.material = assets.ally;
        asset.root.position.set(
          bot.position.x,
          bot.position.y + 0.15,
          bot.position.z,
        );
        asset.root.rotation.y = bot.aim;
        asset.root.scale.setScalar(bot.radius * 1.35);
        asset.bars.root.rotation.y = -bot.aim;
        const fraction = Math.max(0, Math.min(1, bot.health / bot.maxHealth));
        if (fraction !== asset.fraction) {
          asset.previous = Math.max(
            asset.fraction,
            asset.previous -
              Math.max(0, now - asset.changedAt - 120) /
                PRESENTATION.damageTrailMs,
          );
          asset.fraction = fraction;
          asset.changedAt = now;
        }
        asset.bars.hull.scale.x = Math.max(0.001, fraction);
        asset.bars.hull.position.x = (fraction - 1) * 0.6;
        asset.bars.plating.visible = bot.plating > 0;
        asset.bars.plating.scale.x = Math.max(
          0.001,
          Math.min(1, bot.plating / bot.maxHealth),
        );
      }
      const resourceIds = new Set(
        observation.state.resources.map((resource) => resource.id),
      );
      for (const [id, asset] of resources)
        if (!resourceIds.has(id)) {
          scene.remove(asset.root);
          resources.delete(id);
        }
      for (const resource of observation.state.resources) {
        let asset = resources.get(resource.id);
        if (!asset) {
          asset = assets.resource(resource.source);
          scene.add(asset.root);
          resources.set(resource.id, asset);
        }
        asset.root.position.set(resource.position.x, 0.35, resource.position.z);
        asset.root.scale.setScalar(1 - resource.stage * 0.16);
        asset.repair.visible = resource.repair;
        asset.bites.geometry = assets.geometry(
          'resource:bites:' + resource.stage,
          Array.from(
            { length: Math.max(1, 4 - resource.stage) },
            (_, index) => ({
              at: [(index - (3 - resource.stage) / 2) * 0.15, -0.2, -0.32],
              size: [0.1, 0.04, 0.07],
            }),
          ),
        );
        const rarity = ['common', 'rare', 'epic', 'legendary'].indexOf(
          resource.rarity,
        );
        asset.badges.forEach((badge, index) => {
          badge.visible = index === rarity;
          badge.material =
            assets.rarityMaterials[resource.rarity] ?? assets.hull;
        });
      }
      const siteIds = new Set(
        observation.state.pointsOfInterest.map((site) => site.id),
      );
      for (const [id, asset] of sites)
        if (!siteIds.has(id)) {
          scene.remove(asset.root);
          sites.delete(id);
        }
      for (const site of observation.state.pointsOfInterest) {
        let asset = sites.get(site.id);
        if (!asset) {
          asset = assets.site(site.kind);
          scene.add(asset.root);
          sites.set(site.id, asset);
        }
        asset.root.position.set(site.position.x, 0, site.position.z);
        asset.marker.visible = true;
        asset.marker.material =
          site.status === 'claimed'
            ? assets.muted
            : site.status === 'reserved'
              ? assets.light
              : assets.ally;
        asset.marker.scale.y =
          site.status === 'claimed'
            ? 0.22
            : site.status === 'reserved'
              ? 1.6
              : 1;
      }
      const shelterIds = new Set(
        observation.state.shelters.map((site) => site.id),
      );
      for (const [id, asset] of shelters)
        if (!shelterIds.has(id)) {
          scene.remove(asset.root);
          shelters.delete(id);
        }
      for (const site of observation.state.shelters) {
        let asset = shelters.get(site.id);
        if (!asset) {
          asset = assets.shelter();
          scene.add(asset.root);
          shelters.set(site.id, asset);
        }
        asset.root.position.set(site.position.x, 0, site.position.z);
        asset.exit.material = site.occupied ? assets.danger : assets.light;
        asset.root.scale.y = 0.65 + site.remainingFraction * 0.35;
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
          mesh = assets.firmware(module.appearance);
          scene.add(mesh);
          firmware.set(module.id, mesh);
        }
        mesh.position.set(module.position.x, 0.35, module.position.z);
        mesh.scale.setScalar(1 - module.stage * 0.15);
      }
      if (showRecentFeedback) combatBatches.update(observation.state);
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
          const model = assets.craft();
          const mesh = model.root;
          const hitCue = new THREE.Mesh(moduleGeometry, hitMaterial);
          hitCue.position.set(-0.39, 0.12, -0.06);
          hitCue.scale.set(0.1, 0.07, 0.45);
          mesh.add(hitCue);
          const guardCue = new THREE.Mesh(guardGeometry, guardMaterial);
          guardCue.rotation.x = Math.PI / 2;
          mesh.add(guardCue);
          scene.add(mesh);
          entity = {
            mesh,
            radius: player.radius,
            timeline: new SnapshotTimeline(snapshotClock),
            modules: model.modules,
            moving: false,
            combat: createCraftCombat(assets, model),
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
        const previous = entity.timeline.sample(performance.now());
        entity.moving =
          !!previous &&
          Math.hypot(
            previous.x - player.position.x,
            previous.z - player.position.z,
          ) > 0.015;
        entity.mesh.visible = player.life.kind === 'alive' && !player.shelter;
        const worldScale = player.radius * 2;
        entity.combat.update(
          showRecentFeedback && entity.mesh.visible ? player : null,
          observation.state.time,
          now,
        );
        entity.hitCue.visible = player.hit;
        entity.guardCue.visible = player.guarding;
        for (const [name, group] of Object.entries(entity.modules)) {
          const module = player.modules
            ?.filter((item) => item.kind === name)
            .reduce<(typeof player.modules)[number] | undefined>(
              (best, item) => (!best || item.rank > best.rank ? item : best),
              undefined,
            );
          group.visible = !!module;
          if (module)
            group.scale.setScalar(
              1 + Math.min(4, Math.max(0, module.rank - 1)) * 0.035,
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
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      clear();
      ringGeometry.dispose();
      boundaryMaterial.dispose();
      meteorMaterial.dispose();
      guardGeometry.dispose();
      moduleGeometry.dispose();
      combatBatches.dispose();
      impactRing.dispose();
      for (const material of Object.values(impactPaint)) material.dispose();
      clusters.dispose();
      assets.dispose();
      feedbackLayer.remove();
      for (const mesh of occluders) mesh.material.dispose();
      obstacleMaterials.solid.dispose();
      obstacleMaterials.faded.dispose();
      for (const material of Object.values(ground)) material.dispose();
      occluders.clear();
      renderer.dispose();
    },
  };
}
