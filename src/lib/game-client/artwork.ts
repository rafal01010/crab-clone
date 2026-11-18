import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const modelNames = [
  'hull',
  'forager',
  'hunter',
  'scavenger',
  'rock',
  'stone',
  'grass',
  'roots',
  'tree',
] as const;
export type ModelName = (typeof modelNames)[number];
export type EffectSprite = 'trace' | 'spark' | 'smoke';

async function fetchArt(name: string, signal: AbortSignal) {
  const response = await fetch(`/art/${name}`, { signal });
  if (!response.ok) throw new Error(`Could not load local art (${name})`);
  return response;
}

export async function loadArtwork(signal: AbortSignal) {
  const [bundle, atlas] = await Promise.all([
    fetchArt('arena.glb', signal).then((response) => response.arrayBuffer()),
    fetchArt('effects.png', signal).then((response) => response.blob()),
  ]);
  const { scene } = await new GLTFLoader().parseAsync(bundle, '/art/');
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      geometries.add(child.geometry);
      const list = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const material of list) materials.add(material);
    }
  });
  materials.forEach((material) => material.dispose());
  let bitmap: ImageBitmap | undefined;
  try {
    const models = new Map<ModelName, THREE.BufferGeometry>();
    for (const name of modelNames) {
      const mesh = scene.getObjectByName(name);
      if (!(mesh instanceof THREE.Mesh) || !mesh.geometry.hasAttribute('color'))
        throw new Error(`Invalid local model (${name})`);
      models.set(name, mesh.geometry);
    }
    bitmap = await createImageBitmap(atlas, { imageOrientation: 'flipY' });
    signal.throwIfAborted();
    if (bitmap.width !== 256 || bitmap.height !== 128)
      throw new Error('Invalid local effect atlas');
    const texture = new THREE.Texture(bitmap);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return {
      models,
      texture,
      dispose() {
        texture.dispose();
        bitmap?.close();
        geometries.forEach((geometry) => geometry.dispose());
      },
    };
  } catch (error) {
    bitmap?.close();
    geometries.forEach((geometry) => geometry.dispose());
    throw error;
  }
}
