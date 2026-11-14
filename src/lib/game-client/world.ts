import * as THREE from 'three';
import type { Observation } from '../../../shared/protocol/index.js';
import { SnapshotClock, SnapshotTimeline } from './snapshots.js';
import { LocalPrediction } from './local-prediction.js';
import type { Movement } from '../../../shared/movement.js';

type Entity = {
  mesh: THREE.Mesh;
  radius: number;
  timeline: SnapshotTimeline;
};

export function createWorld(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x171b27);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 12, 12);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x303040, 2));
  const geometry = new THREE.BoxGeometry(1, 0.5, 1);
  const material = new THREE.MeshStandardMaterial({ color: 0xff8e64 });
  const headingGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.55);
  const headingMaterial = new THREE.MeshBasicMaterial({ color: 0x26384a });
  const grid = new THREE.GridHelper(200, 200, 0x566176, 0x333d50);
  scene.add(grid);
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
  const botGeometry = new THREE.ConeGeometry(0.7, 1, 4);
  const botMaterial = new THREE.MeshStandardMaterial({ color: 0xa1a9b3 });
  const botTier2Material = new THREE.MeshStandardMaterial({ color: 0x8a70c4 });
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
  let arenaSeed: number | null = null;
  const arenaObjects: THREE.Mesh[] = [];
  let matchId = '';
  let roundId = '';
  let viewerId: string | null = null;
  let followId: string | null = null;
  let connected = false;
  let canPredict = false;
  let lastTimestamp = 0;
  let lastRevision = -1;
  let frame = 0;
  function clear() {
    for (const mesh of arenaObjects) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material))
        mesh.material.forEach((material) => material.dispose());
      else mesh.material.dispose();
    }
    arenaObjects.length = 0;
    arenaSeed = null;
    for (const entity of entities.values()) scene.remove(entity.mesh);
    entities.clear();
    for (const mesh of projectiles.values()) scene.remove(mesh);
    projectiles.clear();
    for (const mesh of bots.values()) scene.remove(mesh);
    bots.clear();
    for (const mesh of resources.values()) scene.remove(mesh);
    resources.clear();
    for (const mesh of meteors.values()) scene.remove(mesh);
    meteors.clear();
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
      if (arenaSeed !== observation.state.arena.seed) {
        if (arenaSeed !== null) {
          clear();
          snapshotClock = new SnapshotClock();
          prediction.reset();
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
        arenaSeed = observation.state.arena.seed;
      }
      followId = observation.state.spectating ?? viewerId;
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
          : bot.tier > 1
            ? botTier2Material
            : botMaterial;
        mesh.position.set(
          bot.position.x,
          bot.position.y + 0.35,
          bot.position.z,
        );
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
          scene.add(mesh);
          entity = {
            mesh,
            radius: player.radius,
            timeline: new SnapshotTimeline(snapshotClock),
          };
          entity.mesh.position.set(
            player.position.x,
            player.position.y,
            player.position.z,
          );
          entities.set(player.id, entity);
        }
        entity.mesh.visible = player.life.kind === 'alive';
        entity.radius = player.radius;
        entity.mesh.scale.set(player.radius * 2, 1, player.radius * 2);
        entity.mesh.rotation.y = player.aim;
        if (player.id === viewerId) {
          canPredict =
            observation.state.phase === 'running' &&
            player.life.kind === 'alive' &&
            player.life.activity === 'playing';
          if (connected && canPredict) {
            prediction.speedFactor((player.stats?.speed ?? 5) / 5);
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
      projectileGeometry.dispose();
      projectileMaterial.dispose();
      botGeometry.dispose();
      botMaterial.dispose();
      botTier2Material.dispose();
      botTellMaterial.dispose();
      resourceGeometry.dispose();
      for (const material of Object.values(resourceMaterials))
        material.dispose();
      grid.geometry.dispose();
      for (const material of Array.isArray(grid.material)
        ? grid.material
        : [grid.material])
        material.dispose();
      for (const mesh of occluders) mesh.material.dispose();
      occluders.clear();
      renderer.dispose();
    },
  };
}
