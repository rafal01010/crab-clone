import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loadArtwork, type EffectSprite, type ModelName } from './artwork.js';
import type {
  MatchView,
  PlayerView,
  StrikePose,
} from '../../../shared/match.js';

export type ModuleKind = PlayerView['modules'][number]['kind'];
export type Treatment = 'matte' | 'signal';
export const PRESENTATION = {
  terrain: { grass: 0x526647, sand: 0x9b7953, snow: 0xa5bac8, water: 0x3d8fab },
  rarity: {
    common: 0xc2c9cc,
    rare: 0x6db4e9,
    epic: 0xb393ff,
    legendary: 0xffbc51,
  },
  camera: { fieldOfView: 45, distance: 12 },
  maxImpacts: 32,
  impactMs: 700,
  damageTrailMs: 650,
};
type Part = {
  form?: 'box' | 'cone' | 'drum' | 'gem' | 'wedge';
  at: [number, number, number];
  size: [number, number, number];
  turn?: [number, number, number];
};
const part = (
  at: Part['at'],
  size: Part['size'],
  form: Part['form'] = 'box',
  turn?: Part['turn'],
): Part => ({ at, size, form, turn });
const pair = (
  x: number,
  y: number,
  z: number,
  size: Part['size'],
  form: Part['form'] = 'box',
) => [-1, 1].map((side) => part([side * x, y, z], size, form));
const MODULES = {
  'more-eyes': pair(0.29, 0.42, 0.22, [0.15, 0.13, 0.18], 'gem'),
  antennae: [
    ...pair(0.28, 0.52, -0.12, [0.045, 0.48, 0.045]),
    ...pair(0.28, 0.78, -0.12, [0.12, 0.08, 0.12], 'gem'),
  ],
  snout: [
    part([0, 0.1, 0.55], [0.24, 0.18, 0.32], 'drum', [Math.PI / 2, 0, 0]),
  ],
  fungoid: [
    ...pair(0.23, 0.36, -0.24, [0.25, 0.38, 0.34]),
    ...pair(0.23, 0.55, -0.24, [0.17, 0.04, 0.24], 'gem'),
  ],
  arms: [
    ...pair(0.52, 0.08, 0.1, [0.36, 0.15, 0.17]),
    ...pair(0.69, 0.08, 0.25, [0.16, 0.2, 0.32], 'gem'),
  ],
  tentacles: [
    ...pair(0.54, 0.02, 0.02, [0.42, 0.1, 0.15]),
    ...pair(0.7, 0.02, -0.2, [0.12, 0.1, 0.4]),
  ],
  legs: [
    ...pair(0.5, -0.14, 0.25, [0.32, 0.12, 0.17]),
    ...pair(0.5, -0.14, -0.27, [0.32, 0.12, 0.17]),
  ],
  'more-legs': [
    ...pair(0.53, -0.13, 0, [0.37, 0.1, 0.12]),
    ...pair(0.53, -0.13, -0.43, [0.37, 0.1, 0.12]),
  ],
  fin: [part([0, 0.45, -0.2], [0.08, 0.48, 0.45], 'cone')],
  lightweight: pair(0.31, 0.26, 0, [0.05, 0.06, 0.75]),
  wings: pair(0.62, 0.18, -0.14, [0.55, 0.08, 0.55], 'gem'),
  tail: [
    part([0, 0.02, -0.65], [0.13, 0.1, 0.5]),
    part([0, 0.02, -0.9], [0.32, 0.16, 0.2], 'gem'),
  ],
  slam: [part([0, 0.05, 0.53], [0.56, 0.28, 0.26], 'gem')],
  spines: [
    ...pair(0.34, 0.37, 0.05, [0.12, 0.4, 0.12], 'cone'),
    ...pair(0.34, 0.37, -0.25, [0.12, 0.4, 0.12], 'cone'),
  ],
  crest: [part([0, 0.51, -0.12], [0.12, 0.4, 0.5], 'gem')],
  fins: pair(0.49, 0.35, -0.24, [0.12, 0.4, 0.48], 'gem'),
  shield: [
    ...pair(0.48, 0.13, 0, [0.17, 0.25, 0.82], 'wedge'),
    part([0, 0.31, -0.28], [0.7, 0.1, 0.3], 'gem'),
  ],
  command: [
    part([0, 0.5, -0.28], [0.06, 0.4, 0.06]),
    part([0, 0.69, -0.28], [0.4, 0.08, 0.2], 'gem'),
  ],
  jet: [
    ...[-0.3, 0.3].map((x) =>
      part([x, 0.018, -0.52], [0.25, 0.33, 0.24], 'drum', [Math.PI / 2, 0, 0]),
    ),
    ...pair(0.3, 0.018, -0.69, [0.15, 0.15, 0.08], 'gem'),
  ],
  cannon: [
    part([0, 0.23, 0.35], [0.34, 0.21, 0.32], 'wedge'),
    part([0, 0.28, 0.53], [0.24, 0.48, 0.2], 'drum', [Math.PI / 2, 0, 0]),
  ],
  pincer: [],
  blade: [-0.24, 0.24].map((x) =>
    part([x, 0.08, 0.57], [0.2, 0.39, 0.11], 'cone', [Math.PI / 2, 0, 0]),
  ),
} satisfies Record<ModuleKind, Part[]>;

export function createAssets(treatment: Treatment = 'matte') {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const cache = new Map<string, THREE.BufferGeometry>();
  const loading = new AbortController();
  let artwork: Awaited<ReturnType<typeof loadArtwork>> | undefined;
  let pending: Promise<void> | undefined;
  function load() {
    pending ??= loadArtwork(loading.signal)
      .then((result) => {
        if (loading.signal.aborted) result.dispose();
        else artwork = result;
      })
      .catch((error: unknown) => {
        pending = undefined;
        throw error;
      });
    return pending;
  }
  const artSurface =
    treatment === 'matte'
      ? new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 1,
          flatShading: true,
        })
      : new THREE.MeshBasicMaterial({ vertexColors: true });
  materials.add(artSurface);
  function model(name: ModelName) {
    const source = artwork?.models.get(name);
    return source ? new THREE.Mesh(source, artSurface) : null;
  }
  const effectPlanes = new Map<EffectSprite, THREE.PlaneGeometry>();
  let effectMaterial: THREE.MeshBasicMaterial | undefined;
  function sprite(kind: EffectSprite) {
    if (!artwork) return null;
    effectMaterial ??= new THREE.MeshBasicMaterial({
      map: artwork.texture,
      transparent: true,
      depthWrite: false,
      color: 0xffd984,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    materials.add(effectMaterial);
    let plane = effectPlanes.get(kind);
    if (!plane) {
      plane = new THREE.PlaneGeometry(1, 1);
      const uv = plane.getAttribute('uv');
      const frame = { trace: 42, spark: 128, smoke: 214 }[kind];
      for (let index = 0; index < uv.count; index++)
        uv.setX(index, (frame + (uv.getX(index) - 0.5) * 82) / 256);
      geometries.add(plane);
      effectPlanes.set(kind, plane);
    }
    const mesh = new THREE.Mesh(plane, effectMaterial);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  let allyLinkMaterial: THREE.SpriteMaterial | undefined;
  function allyLink() {
    if (!allyLinkMaterial) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const paint = canvas.getContext('2d');
      if (!paint) return null;
      paint.beginPath();
      paint.arc(32, 32, 29, 0, 2 * Math.PI);
      paint.fillStyle = '#101722';
      paint.fill();
      paint.strokeStyle = '#76cdb4';
      paint.lineWidth = 2;
      paint.stroke();
      paint.strokeStyle = paint.fillStyle = '#a6ffd2';
      paint.lineWidth = 5;
      paint.lineCap = 'round';
      for (const radius of [12, 22]) {
        paint.beginPath();
        paint.arc(32, 45, radius, -0.8 * Math.PI, -0.2 * Math.PI);
        paint.stroke();
      }
      paint.beginPath();
      paint.arc(32, 45, 3.5, 0, 2 * Math.PI);
      paint.fill();
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      allyLinkMaterial = new THREE.SpriteMaterial({
        map: texture,
        depthWrite: false,
      });
      materials.add(allyLinkMaterial);
    }
    return new THREE.Sprite(allyLinkMaterial);
  }

  function geometry(key: string, parts: Part[]) {
    const cached = cache.get(key);
    if (cached) return cached;
    const pieces = parts.map(({ form, at, size, turn }) => {
      const shape =
        form === 'cone'
          ? new THREE.ConeGeometry(0.5, 1, 4)
          : form === 'drum'
            ? new THREE.CylinderGeometry(0.5, 0.5, 1, 6)
            : form === 'gem'
              ? new THREE.OctahedronGeometry(0.5, 0)
              : form === 'wedge'
                ? new THREE.CylinderGeometry(0.25, 0.55, 1, 4, 1).rotateY(
                    Math.PI / 4,
                  )
                : new THREE.BoxGeometry(1, 1, 1);
      shape.scale(...size);
      if (turn) {
        shape.rotateX(turn[0]);
        shape.rotateY(turn[1]);
        shape.rotateZ(turn[2]);
      }
      shape.translate(...at);
      if (!shape.index) return shape;
      const nonIndexed = shape.toNonIndexed();
      shape.dispose();
      return nonIndexed;
    });
    const merged = mergeGeometries(pieces);
    pieces.forEach((piece) => piece.dispose());
    if (!merged) throw new Error('Cannot construct presentation geometry');
    geometries.add(merged);
    cache.set(key, merged);
    return merged;
  }
  function material(color: number) {
    const value =
      treatment === 'matte'
        ? new THREE.MeshStandardMaterial({
            color,
            roughness: 1,
            metalness: 0,
            flatShading: true,
          })
        : new THREE.MeshBasicMaterial({ color });
    materials.add(value);
    return value;
  }
  const hull = material(0xb7c4cc);
  const glass = material(0x223f4b);
  const shellPaint = material(0xa5a57a);
  const water = material(0x4f9b9d);
  const dark = material(0x202837);
  const trim = material(0xa78bdb);
  const light = material(0xffbc51);
  const ally = material(0x76cdb4);
  const danger = material(0xff805d);
  const muted = material(0x667275);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x14202a,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  materials.add(shadowMaterial);
  const circle = new THREE.CircleGeometry(1, 12);
  circle.rotateX(-Math.PI / 2);
  geometries.add(circle);
  function shadow(root: THREE.Object3D, radius = 0.55) {
    const mesh = new THREE.Mesh(circle, shadowMaterial);
    mesh.name = 'contact-shadow';
    mesh.scale.setScalar(radius);
    mesh.position.y = -0.22;
    root.add(mesh);
  }
  function mesh(key: string, parts: Part[], mat: THREE.Material = hull) {
    return new THREE.Mesh(geometry(key, parts), mat);
  }
  function jaws(key: string, pieces: Part[], paint: THREE.Material) {
    return [-1, 1].map((side) => {
      const group = new THREE.Group();
      const mirror = (x: number) => side * x;
      group.add(
        mesh(
          key + ':' + side,
          pieces.map(({ at, size, form, turn }) =>
            part(
              [mirror(at[0]), at[1], at[2]],
              size,
              form,
              turn && [turn[0], mirror(turn[1]), mirror(turn[2])],
            ),
          ),
          paint,
        ),
      );
      return group;
    });
  }
  function craft() {
    const root =
      model('hull') ??
      mesh('hull', [
        part([0, 0, 0], [0.98, 0.26, 1.28], 'wedge'),
        part([0, -0.09, 0], [0.65, 0.18, 0.85]),
      ]);
    root.add(
      mesh(
        'craft:dark',
        [
          ...pair(0.35, -0.09, -0.11, [0.22, 0.23, 0.69], 'wedge'),
          part([0, 0.2, -0.08], [0.49, 0.19, 0.58], 'wedge'),
        ],
        glass,
      ),
    );
    root.add(
      mesh(
        'craft:running-lights',
        [
          ...pair(0.17, 0.11, 0.39, [0.11, 0.07, 0.19], 'wedge'),
          ...pair(0.34, -0.03, -0.4, [0.13, 0.11, 0.08], 'wedge'),
        ],
        light,
      ),
    );
    shadow(root, 0.58);
    const bumper = new THREE.Group();
    bumper.position.z = 0.39;
    const bumperJaws = jaws(
      'craft:bumper',
      [
        part([0.23, -0.035, 0.105], [0.21, 0.12, 0.26], 'wedge', [0, -0.22, 0]),
        part([0.15, -0.02, 0.2], [0.15, 0.09, 0.07], 'wedge'),
      ],
      hull,
    );
    bumper.add(...bumperJaws);
    root.add(bumper);
    const pincerJaws = jaws(
      'craft:pincer',
      [
        part([0.28, 0.03, 0.05], [0.31, 0.15, 0.19], 'wedge'),
        part([0.4, 0.06, 0.24], [0.19, 0.18, 0.5], 'wedge', [0, -0.32, 0]),
        part([0.28, 0.075, 0.47], [0.23, 0.14, 0.19], 'wedge', [0, -0.64, 0]),
      ],
      trim,
    );
    const modules = Object.fromEntries(
      Object.entries(MODULES).map(([kind, parts]) => {
        const group = new THREE.Group();
        if (kind === 'pincer') {
          group.position.z = 0.27;
          group.add(...pincerJaws);
        } else {
          group.add(
            mesh(
              'module:' + kind,
              parts,
              kind === 'shield' ? hull : kind === 'jet' ? light : trim,
            ),
          );
        }
        group.visible = false;
        root.add(group);
        return [kind, group];
      }),
    );
    return { root, modules, bumper, bumperJaws, pincerJaws };
  }
  const botPaint = {
    forager: shellPaint,
    hunter: material(0xbf7963),
    scavenger: material(0x75a5ac),
  };
  const roleParts = {
    forager: {
      body: [part([0, 0.1, 0], [1.3, 0.48, 1.15], 'wedge')],
      belt: [
        ...pair(0.5, -0.05, -0.08, [0.34, 0.24, 0.78], 'wedge'),
        part([0, 0.25, -0.2], [0.65, 0.21, 0.5], 'wedge'),
      ],
      arms: [
        part([0.34, -0.06, 0.43], [0.31, 0.23, 0.46], 'wedge', [0, -0.32, 0]),
        part([0.17, -0.1, 0.62], [0.41, 0.14, 0.24], 'wedge'),
      ],
    },
    hunter: {
      body: [part([0, 0.1, -0.12], [1, 0.5, 1.48], 'wedge')],
      belt: [
        part([0, 0.15, 0.29], [0.39, 0.15, 0.52], 'wedge'),
        ...pair(0.31, 0.05, -0.32, [0.31, 0.23, 0.55], 'wedge'),
      ],
      arms: [
        part([0.31, -0.02, 0.37], [0.19, 0.23, 0.68], 'wedge', [0, -0.26, 0]),
        part([0.22, 0.02, 0.68], [0.19, 0.2, 0.38], 'cone', [
          Math.PI / 2,
          -0.22,
          0,
        ]),
      ],
    },
    scavenger: {
      body: [part([0, 0.08, -0.05], [0.84, 0.42, 1.6], 'wedge')],
      belt: [
        ...pair(0.44, -0.06, -0.27, [0.31, 0.18, 0.9], 'wedge'),
        part([0, 0.28, -0.44], [0.44, 0.12, 0.43], 'wedge'),
      ],
      arms: [
        part([0.42, 0.045, 0.45], [0.14, 0.16, 0.67], 'wedge', [0, -0.18, 0]),
        part([0.33, -0.01, 0.78], [0.16, 0.16, 0.3], 'wedge'),
      ],
    },
  };
  function bot(role: MatchView['bots'][number]['role']) {
    const parts = roleParts[role];
    const root = model(role) ?? mesh('bot:' + role, parts.body, botPaint[role]);
    const shell = new THREE.Group();
    // The suspension and tools can pose without moving the contact shadow or UI.
    const base = new THREE.Group();
    base.add(shell);
    shell.add(root, mesh('bot:belt:' + role, parts.belt, dark));
    const tools = jaws('bot:tool:' + role, parts.arms, botPaint[role]);
    shell.add(...tools);
    const badge = mesh(
      'bot:badge',
      [part([0, 0.61, 0], [0.65, 0.15, 0.65], 'wedge')],
      light,
    );
    base.add(badge);
    const tell = mesh(
      'bot:tell',
      [
        part([-0.35, -0.1, 1.01], [0.25, 0.04, 0.36], 'wedge', [0, 0.45, 0]),
        part([0.35, -0.1, 1.01], [0.25, 0.04, 0.36], 'wedge', [0, -0.45, 0]),
      ],
      danger,
    );
    base.add(tell);
    shadow(base, 0.85);
    const status = mesh(
      'bot:status',
      [part([0, 0.9, 0], [0.2, 0.35, 0.2], 'gem')],
      danger,
    );
    base.add(status);
    function pose(action: StrikePose | null, reduced: boolean) {
      const open =
        action?.phase === 'windup'
          ? reduced
            ? 0.65
            : 0.25 + action.progress * 0.55
          : 0;
      const lunge =
        action?.phase === 'strike'
          ? 1
          : action?.phase === 'recovery' && !reduced
            ? (1 - action.progress) * 0.55
            : 0;
      tools.forEach((tool, index) => {
        tool.rotation.y = (index * 2 - 1) * (open * 0.75 - lunge * 0.22);
        tool.position.z =
          lunge * (role === 'scavenger' ? 0.3 : 0.19) - open * 0.13;
        tool.rotation.x = role === 'forager' ? open * -0.35 + lunge * 0.16 : 0;
      });
      shell.rotation.x = !reduced ? -0.08 * open + lunge * 0.12 : 0;
      tell.visible = action?.phase === 'windup' || action?.phase === 'strike';
      tell.material = action?.phase === 'strike' ? light : danger;
    }
    return { root: base, badge, tell, status, pose };
  }
  const sourceParts = {
    vegetation: [
      part([0, 0, 0], [0.6, 0.48, 0.6], 'gem'),
      part([0.17, 0.3, 0], [0.3, 0.1, 0.22], 'gem'),
    ],
    meat: [
      part([0, 0, 0], [0.56, 0.27, 0.46]),
      ...pair(0.23, 0.04, 0, [0.12, 0.34, 0.5]),
      part([0.06, 0.19, 0.07], [0.23, 0.16, 0.25], 'wedge'),
    ],
    aquatic: [
      part([0, 0, 0], [0.5, 0.34, 0.5], 'drum'),
      part([0, 0.21, 0], [0.34, 0.1, 0.34], 'drum'),
      part([0.19, 0.1, 0], [0.18, 0.13, 0.23]),
    ],
  };
  const sourceMaterials = {
    vegetation: material(0x9ab38b),
    meat: material(0xc7937d),
    aquatic: material(0x8fbac5),
  };
  const rarityMaterials = Object.fromEntries(
    Object.entries(PRESENTATION.rarity).map(([key, value]) => [
      key,
      material(value),
    ]),
  );
  function resource(source: MatchView['resources'][number]['source']) {
    const root = mesh(
      'resource:' + source,
      sourceParts[source],
      sourceMaterials[source],
    );
    const repair = mesh(
      'repair',
      [
        part([0, 0.37, 0], [0.12, 0.05, 0.4]),
        part([0, 0.37, 0], [0.4, 0.05, 0.12]),
      ],
      ally,
    );
    root.add(repair);
    const badges = [0, 1, 2, 3].map((index) => {
      const badge = mesh(
        'rarity:' + index,
        Array.from({ length: index + 1 }, (_, i) =>
          part([(i - index / 2) * 0.16, -0.17, 0.36], [0.1, 0.12, 0.16], 'gem'),
        ),
        light,
      );
      root.add(badge);
      return badge;
    });
    const bites = mesh(
      'resource:bites',
      [part([0, -0.2, -0.32], [0.6, 0.04, 0.05])],
      dark,
    );
    root.add(bites);
    return { root, repair, badges, bites };
  }
  function site(kind: string) {
    const tree = kind.includes('tree');
    const pond = kind.includes('pond') || kind === 'oasis';
    const shape = tree
      ? kind === 'chaos-tree'
        ? [
            part([0, 0.5, 0], [0.2, 1, 0.2]),
            ...pair(0.3, 1.1, 0, [0.7, 0.9, 0.7], 'gem'),
          ]
        : kind === 'growing-tree'
          ? [
              part([0, 0.5, 0], [0.2, 1, 0.2]),
              part([0, 1.2, 0], [1.3, 1.6, 1.3], 'cone'),
            ]
          : [
              part([0, 0.5, 0], [0.3, 1, 0.3]),
              part([0, 1.2, 0], [1.4, 0.7, 1.4], 'gem'),
            ]
      : pond
        ? [part([0, 0.06, 0], [1.8, 0.12, 1.8], 'drum')]
        : kind === 'giant-mushroom'
          ? [
              part([0, 0.5, 0], [0.4, 1, 0.4]),
              part([0, 1.1, 0], [1.5, 0.3, 1.5], 'drum'),
            ]
          : kind === 'unattended-nest'
            ? [
                part([0, 0.1, 0], [1.33, 0.2, 1.1]),
                part([0, 0.27, 0], [0.64, 0.27, 0.8], 'wedge'),
                ...pair(0.55, 0.32, -0.3, [0.12, 0.56, 0.18]),
              ]
            : kind === 'sun-dial'
              ? [
                  part([0, 0.15, 0], [1.3, 0.3, 1.3], 'drum'),
                  part([0, 0.55, 0], [0.15, 0.7, 0.5], 'cone'),
                ]
              : kind === 'frozen-specimen'
                ? [part([0, 0.65, 0], [0.8, 1.3, 0.8], 'gem')]
                : kind === 'lotus-plant'
                  ? [
                      ...pair(0.3, 0.25, 0, [0.7, 0.25, 0.6], 'gem'),
                      part([0, 0.5, 0], [0.5, 0.7, 0.5], 'cone'),
                    ]
                  : [
                      part([0, 0.25, 0], [0.9, 0.5, 0.9], 'gem'),
                      ...pair(0.45, 0.6, 0, [0.3, 1, 0.3], 'cone'),
                    ];
    const root = pond
      ? mesh(
          'site:pond-bank',
          [part([0, 0.025, 0], [2.6, 0.08, 2.2], 'drum')],
          shellPaint,
        )
      : mesh(
          'site:' + kind,
          shape,
          kind === 'growing-tree' ? shellPaint : trim,
        );
    if (pond) {
      root.add(
        mesh(
          'site:pond-water',
          [part([0, 0.073, 0], [2.3, 0.065, 1.88], 'drum')],
          water,
        ),
      );
      root.add(
        mesh(
          'site:pond-ripples',
          [
            part(
              [-0.23, 0.112, 0.1],
              [0.66, 0.018, 0.047],
              'wedge',
              [0, 0.12, 0],
            ),
            part(
              [0.18, 0.112, -0.25],
              [0.82, 0.018, 0.047],
              'wedge',
              [0, 0.12, 0],
            ),
          ],
          ally,
        ),
      );
      for (const [x, z, turn] of [
        [-0.84, 0.45, 0.3],
        [0.89, -0.42, 1.1],
        [-0.59, -0.66, -0.8],
      ] satisfies [number, number, number][]) {
        const reeds = model('grass');
        if (!reeds) continue;
        reeds.position.set(x, 0.03, z);
        reeds.scale.set(0.7, 1.3, 0.7);
        reeds.rotation.y = turn;
        root.add(reeds);
      }
    } else if (kind === 'carved-tree') {
      const canopy = model('tree');
      if (canopy) {
        root.geometry = geometry('site:tree-roots', [
          part([0, 0.05, 0], [1.0, 0.15, 0.82], 'wedge'),
        ]);
        canopy.scale.setScalar(0.94);
        root.add(canopy);
      }
    }

    const marker = mesh(
      'site:marker',
      [part([0, 1.95, 0], [0.35, 0.35, 0.35], 'gem')],
      ally,
    );
    root.add(marker);
    return { root, marker };
  }
  function shelter() {
    const root = mesh(
      'shelter',
      [
        ...pair(0.65, 0.28, 0, [0.25, 0.55, 0.6]),
        part([0, 0.58, 0], [1.55, 0.25, 0.7]),
      ],
      muted,
    );
    const bank = model('rock');
    if (bank) {
      bank.position.set(0, 0.49, -0.14);
      bank.scale.set(1.62, 0.49, 0.9);
      root.add(bank);
    }
    const exit = mesh(
      'exit',
      [part([0, 0.04, 0.65], [0.45, 0.04, 0.45], 'cone', [Math.PI / 2, 0, 0])],
      light,
    );
    root.add(exit);
    return { root, exit };
  }
  function firmware(appearance: string) {
    const index = Math.max(0, Number(appearance.replace('pattern-', '')) - 1);
    const root = mesh(
      'firmware',
      [part([0, 0.1, 0], [0.55, 0.55, 0.55], 'gem')],
      trim,
    );
    const marks = Array.from({ length: 1 + (index % 4) }, (_, i) =>
      part([(i - (index % 4) / 2) * 0.12, 0.39, 0], [0.055, 0.045, 0.3]),
    );
    root.add(mesh('firmware:' + (index % 4), marks, index < 8 ? hull : light));
    root.rotation.y = (Math.floor(index / 4) * Math.PI) / 4;
    return root;
  }
  return {
    load,
    model,
    sprite,
    allyLink,
    artSurface,
    craft,
    bot,
    resource,
    site,
    shelter,
    firmware,
    mesh,
    material,
    geometry,
    hull,
    dark,
    trim,
    light,
    ally,
    danger,
    muted,
    rarityMaterials,
    dispose() {
      loading.abort();
      artwork?.dispose();
      allyLinkMaterial?.map?.dispose();
      geometries.forEach((value) => value.dispose());
      materials.forEach((value) => value.dispose());
    },
  };
}
