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
  const prediction = new LocalPrediction();
  let snapshotClock = new SnapshotClock();
  let matchId = '';
  let viewerId: string | null = null;
  let connected = false;
  let canPredict = false;
  let lastTimestamp = 0;
  let lastRevision = -1;
  let frame = 0;
  function clear() {
    for (const entity of entities.values()) scene.remove(entity.mesh);
    entities.clear();
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
    const viewer = viewerId ? entities.get(viewerId) : undefined;
    if (viewer) {
      if (connected && canPredict) {
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
      lastTimestamp = 0;
      lastRevision = -1;
    },
    setViewer(id: string | null) {
      if (viewerId !== id) prediction.reset();
      viewerId = id;
    },
    update(observation: Observation) {
      if (matchId !== observation.matchId) {
        clear();
        snapshotClock = new SnapshotClock();
        prediction.reset();
        canPredict = false;
        matchId = observation.matchId;
        lastTimestamp = 0;
        lastRevision = -1;
      }
      if (
        observation.timestamp < lastTimestamp ||
        observation.revision <= lastRevision
      )
        return false;
      lastRevision = observation.revision;
      lastTimestamp = observation.timestamp;
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
        entity.radius = player.radius;
        entity.mesh.scale.set(player.radius * 2, 1, player.radius * 2);
        entity.mesh.rotation.y = player.aim;
        if (player.id === viewerId) {
          canPredict =
            observation.state.phase === 'running' &&
            player.life.kind === 'alive' &&
            player.life.activity === 'playing';
          if (connected && canPredict)
            prediction.observe(player.position, performance.now());
          else prediction.reset();
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
      geometry.dispose();
      material.dispose();
      headingGeometry.dispose();
      headingMaterial.dispose();
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
