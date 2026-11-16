import { createRegistry, type ContentDefinition } from './registry.js';
import { startingDefinitions, startingEffectIds } from './starting.js';
import { upgradeEffectIds } from '../match/upgrade-effects.js';
import { researchGraph } from './research-graph.js';

const fixed = { fixed: [1] };
function entry(
  id: string,
  name: string,
  pool: ContentDefinition['pool'],
  values: Record<string, readonly number[]>,
  description: string,
  exclusions: string[] = [],
): ContentDefinition {
  const keys = Object.keys(values);
  const summaries: Record<string, string> = {
    'muscular-tissue': 'Increases physical.',
    stomach: 'Increases salvage speed.',
    'slow-metabolism': 'Reduces movement speed and progress required to level.',
    saliva: 'Increases salvage speed and regeneration.',
    forager:
      'Adds a chance of repair salvage and increases corrosion resistance.',
    'cheek-pouch': 'Stores salvage for automatic consumption.',
    reach: 'Increases attack area.',
    ruminant: 'Generates progress based on Prey affinity while unharmed.',
    herbivore: 'Increases vegetation progress and reduces Predator affinity.',
    carnivore: 'Increases meat progress and reduces Prey affinity.',
    piscivore: 'Increases aquatic progress.',
    omnivore: 'Increases progress from all salvage.',
    vegan:
      'Increases vegetation progress but prevents animal salvage consumption.',
    scavenger: 'Increases progress from animals you did not defeat.',
    chonky: 'Increases size and physical.',
    'more-mass': 'Increases size, physical, and maximum hull.',
    elusive: 'Reduces size and increases dodge.',
    smol: 'Reduces size and increases speed.',
    overwhelm: 'Adds damage based on active plating.',
    agile: 'Increases dodge and reduces the movement penalty while attacking.',
    dexterous: 'Increases ability and reduces cooldowns.',
    robust: 'Increases maximum hull with size above normal.',
    scales: 'Increases damage resistance and heat adaptation.',
    carapace: 'Increases damage resistance and plating.',
    shell: 'Increases damage resistance.',
    plated: 'Increases maximum plating.',
    spines: 'Returns damage from contact attacks.',
    exoskeleton: 'Increases plating and social.',
    shifty: 'Converts reduced size into dodge and damage.',
    impervious: 'Delays half of incoming damage and increases maximum hull.',
    'regenerative-tissue': 'Increases regeneration.',
    fibroblasts: 'Gain maximum hull after enough actual healing.',
    'immune-system': 'Increases corrosion resistance.',
    'turtle-down':
      'Briefly reduce damage and stun correctly timed contact attackers.',
    'body-slam': 'A close attack that scales with physical and maximum hull.',
    arms: 'Increases physical, ability, and salvage reach.',
    slithery: 'Increases speed and terrain adaptation.',
    wings: 'Increases speed and terrain adaptation.',
    tentacles: 'Increases speed and ability.',
    legs: 'Increases speed and offers locomotion specializations.',
    tail: 'Increases ability and social.',
    'prehensile-tail':
      'Increases salvage reach and offers tail specializations.',
    'more-legs': 'Increases speed and adds personal risk.',
    fin: 'Improves movement through water.',
    'hollow-bones': 'Increases speed while reducing damage resistance.',
    spit: 'Fire a ranged ability attack.',
    'projectile-tongue': 'Root yourself and fire a stunning tongue.',
    leech: 'Drain hull with a short-range ability attack.',
    stinger: 'Strike and inflict corrosion.',
    spur: 'Automatically follow attacks with physical damage.',
    slide: 'Slide a long distance.',
    sprint: 'Temporarily increase speed.',
    leap: 'Jump over obstacles and avoid direct impacts.',
    scuttle: 'Move a short distance and gain Carcinisation.',
  };
  const icons: Record<string, ContentDefinition['icon']> = {
    'muscular-tissue': 'power',
    stomach: 'salvage',
    plated: 'plating',
    'body-slam': 'attack',
    claws: 'arms',
    arms: 'arms',
    slithery: 'movement',
    wings: 'wings',
    tentacles: 'arms',
    legs: 'movement',
    'more-legs': 'movement',
    tail: 'arms',
    'prehensile-tail': 'salvage',
    fin: 'movement',
    'hollow-bones': 'movement',
  };
  return {
    id,
    name,
    icon: icons[id],
    aliases: [],
    disposition: 'implemented',
    selectable: pool !== 'starting',
    description: summaries[id] ?? description,
    rankDescription: description,
    pool,
    maxRank: values[keys[0] ?? '']?.length ?? 1,
    rarities: keys,
    values,
    requirement: { kind: 'none' },
    exclusions,
    affinities:
      (
        {
          'body-slam': ['Imposing'],
          stomach: ['Imposing', 'Prey'],
          plated: ['Imposing'],
          'muscular-tissue': ['Predator'],
          arms: ['Trickster'],
          slithery: ['Trickster'],
          wings: ['Predator', 'Prey'],
        } as Record<string, string[]>
      )[id] ?? [],
    effect: id,
    specializations: [],
  };
}
const rows = (
  common: number[],
  rare: number[],
  epic: number[],
  legendary: number[],
) => ({ common, rare, epic, legendary });
const limbRequirement: ContentDefinition['requirement'] = {
  kind: 'any',
  conditions: [
    { kind: 'rank', id: 'arms', minimum: 1 },
    { kind: 'rank', id: 'tentacles', minimum: 3 },
  ],
};
const salvageSpeedRows = rows(
  [10, 20, 30, 40, 50],
  [12, 25, 37, 50, 62],
  [14, 30, 45, 60, 75],
  [17, 35, 52, 70, 90],
);
const physicalThree = rows(
  [1, 2, 3],
  [1.2, 2.5, 3.7],
  [1.4, 3, 4.5],
  [1.7, 3.5, 5.2],
);
const sizeThree = rows([10, 20, 30], [12, 25, 37], [14, 30, 45], [17, 35, 52]);
const resistanceThree = rows(
  [5, 10, 15],
  [6, 12, 18],
  [7, 15, 22],
  [8, 17, 26],
);
const feature = (
  id:
    | 'jaws-neck-bite'
    | 'jaws-stalker'
    | 'beak-sharp'
    | 'beak-long'
    | 'stoner-training'
    | 'stoner-signal'
    | 'projectile-tongue-sticky'
    | 'projectile-tongue-whiplash'
    | 'leech-anaesthetic'
    | 'leech-vasodilators'
    | 'spur-marking'
    | 'spur-primal'
    | 'leap-bouncy'
    | 'leap-heavy'
    | 'cheek-pouch-provider'
    | 'cheek-pouch-storage'
    | 'scales-basking'
    | 'scales-hard'
    | 'spines-poisonous'
    | 'spines-detachable'
    | 'turtle-down-reinforced'
    | 'turtle-down-spiked',
  name: string,
  triggerRank: number,
) => ({
  id,
  name,
  triggerRank,
  carcinisationBonus: 0,
  effect: { kind: 'ability-feature' as const, feature: id },
});
const playableDefinitions: readonly ContentDefinition[] = [
  {
    ...entry(
      'omnivore',
      'Omnivore',
      'ordinary',
      { rare: [40, 80, 120], epic: [50, 100, 150], legendary: [60, 120, 180] },
      '+{value}% progress from all salvage.',
    ),
    requirement: {
      kind: 'all',
      conditions: [
        { kind: 'rank', id: 'carnivore', minimum: 1 },
        { kind: 'rank', id: 'herbivore', minimum: 1 },
        { kind: 'rank', id: 'piscivore', minimum: 1 },
      ],
    },
  },
  {
    ...entry(
      'vegan',
      'Vegan',
      'ordinary',
      { epic: [75, 150, 225], legendary: [100, 200, 300] },
      '+{value}% vegetation progress. Cannot consume animal salvage. Lose three Predator affinity per rank.',
      ['carnivore', 'piscivore', 'scavenger'],
    ),
    requirement: { kind: 'rank', id: 'herbivore', minimum: 2 },
  },
  {
    ...entry(
      'scavenger',
      'Scavenger',
      'ordinary',
      {
        rare: [50, 100, 150, 200, 250],
        epic: [66, 133, 200, 266, 333],
        legendary: [75, 150, 225, 300, 375],
      },
      '+{value}% progress from animals you did not defeat.',
      ['vegan'],
    ),
    aliases: ['carrion'],
    affinities: ['Gregarious', 'Prey'],
  },
  {
    ...entry(
      'chonky',
      'Chonky',
      'ordinary',
      sizeThree,
      '+{value}% size and +{physical} physical.',
    ),
    affinities: ['Predator', 'Imposing'],
    detailValues: { physical: physicalThree },
  },
  {
    ...entry(
      'more-mass',
      'More Mass',
      'ordinary',
      rows([7, 15, 22], [8, 17, 25], [9, 20, 30], [10, 22, 35]),
      '+{value}% size, +{physical} physical, and +{health} maximum hull.',
    ),
    affinities: ['Imposing'],
    detailValues: {
      physical: physicalThree,
      health: rows([10, 20, 30], [12, 25, 37], [14, 30, 45], [16, 35, 52]),
    },
  },
  {
    ...entry(
      'elusive',
      'Elusive',
      'ordinary',
      rows([8, 16, 25], [9, 18, 28], [10, 20, 30], [12, 24, 35]),
      '+{value}% dodge and -{size}% size.',
    ),
    affinities: ['Prey'],
    detailValues: { size: sizeThree },
  },
  {
    ...entry(
      'smol',
      'Smol',
      'ordinary',
      {
        rare: [0.1, 0.2, 0.3, 0.4, 0.5],
        epic: [0.12, 0.25, 0.38, 0.5, 0.62],
        legendary: [0.15, 0.3, 0.45, 0.6, 0.75],
      },
      '+{value} speed, -{size}% size, and -2 Imposing affinity per rank.',
    ),
    affinities: ['Prey'],
    detailValues: {
      size: {
        rare: [10, 20, 30, 40, 50],
        epic: [11, 22, 33, 44, 55],
        legendary: [13, 25, 37, 50, 62],
      },
    },
  },
  {
    ...entry(
      'overwhelm',
      'Overwhelm',
      'ordinary',
      { epic: [0.5, 0.7, 0.9], legendary: [0.6, 0.8, 1] },
      'Hits deal {value} times active plating as bonus damage.',
    ),
    affinities: ['Imposing'],
  },
  {
    ...entry(
      'agile',
      'Agile',
      'ordinary',
      rows(
        [5, 10, 15, 20, 25],
        [6, 12, 18, 25, 32],
        [7, 15, 22, 30, 38],
        [8, 17, 26, 35, 45],
      ),
      '+{value}% dodge and -{penalty}% attack movement penalty.',
    ),
    affinities: ['Trickster'],
    detailValues: {
      penalty: rows(
        [10, 20, 30, 40, 50],
        [12, 25, 37, 50, 62],
        [14, 30, 45, 60, 75],
        [17, 35, 52, 70, 90],
      ),
    },
  },
  {
    ...entry(
      'dexterous',
      'Dexterous',
      'ordinary',
      rows(
        [1, 2, 3, 4, 5],
        [1.2, 2.5, 3.7, 5, 6.2],
        [1.4, 3, 4.5, 6, 7.5],
        [1.7, 3.5, 5.2, 7, 9],
      ),
      '+{value} ability and -{cooldown}% cooldown.',
    ),
    affinities: ['Trickster'],
    detailValues: {
      cooldown: rows(
        [5, 10, 15, 20, 25],
        [6, 12, 18, 25, 32],
        [7, 15, 22, 30, 38],
        [8, 17, 26, 35, 45],
      ),
    },
  },
  {
    ...entry(
      'robust',
      'Robust',
      'ordinary',
      { legendary: [1] },
      'Multiply maximum hull by size when size exceeds 100%.',
    ),
    affinities: ['Imposing'],
  },
  {
    ...entry(
      'scales',
      'Scales',
      'ordinary',
      resistanceThree,
      '+{value}% damage resistance and +{heat}% heat adaptation.',
      ['fur', 'exoskeleton'],
    ),
    detailValues: {
      heat: rows([33, 66, 100], [36, 72, 110], [40, 80, 120], [50, 100, 150]),
    },
    specializations: ['scales-basking', 'scales-hard'],
    specializationChoices: [
      feature('scales-basking', 'Basking', 3),
      feature('scales-hard', 'Hard', 3),
    ],
  },
  {
    ...entry(
      'carapace',
      'Carapace',
      'ordinary',
      resistanceThree,
      '+{value}% damage resistance and +{plating} plating.',
      ['shell', 'fin'],
    ),
    affinities: ['Imposing', 'Prey'],
    detailValues: {
      plating: rows([3, 6, 9], [4, 8, 12], [5, 10, 15], [6, 12, 18]),
    },
  },
  {
    ...entry(
      'shell',
      'Shell',
      'ordinary',
      {
        rare: [7.5, 15, 22.5],
        epic: [10, 20, 30],
        legendary: [12.5, 25, 32.5],
      },
      '+{value}% damage resistance.',
      ['carapace', 'fin'],
    ),
    affinities: ['Carcinisation', 'Imposing'],
  },
  {
    ...entry(
      'spines',
      'Spines',
      'ordinary',
      {
        rare: [35, 70, 105, 140, 175],
        epic: [45, 90, 135, 180, 225],
        legendary: [55, 110, 165, 220, 275],
      },
      'Return {value}% of contact damage.',
      ['fin'],
    ),
    affinities: ['Imposing'],
    specializations: ['spines-poisonous', 'spines-detachable'],
    specializationChoices: [
      feature('spines-poisonous', 'Poisonous', 4),
      feature('spines-detachable', 'Detachable', 4),
    ],
  },
  {
    ...entry(
      'exoskeleton',
      'Exoskeleton',
      'ordinary',
      { rare: [4, 8, 12], epic: [6, 12, 18], legendary: [8, 16, 24] },
      '+{value} plating and +{social} social.',
      ['scales', 'fur'],
    ),
    affinities: ['Gregarious', 'Carcinisation'],
    detailValues: {
      social: {
        rare: [1.7, 3.5, 5.2],
        epic: [2, 4, 6],
        legendary: [2.3, 4.5, 6.7],
      },
    },
  },
  {
    ...entry(
      'shifty',
      'Shifty',
      'ordinary',
      { legendary: [1] },
      'Gain dodge and damage equal to half of size below 100%.',
    ),
    affinities: ['Prey', 'Trickster'],
  },
  {
    ...entry(
      'impervious',
      'Impervious',
      'ordinary',
      { epic: [10], legendary: [20] },
      '+{value} maximum hull. Take half of incoming damage one second later.',
    ),
    affinities: ['Imposing'],
  },
  {
    ...entry(
      'regenerative-tissue',
      'Regenerative Tissue',
      'ordinary',
      rows(
        [2, 4, 6, 8, 10],
        [2.3, 4.5, 7, 9.5, 11.5],
        [2.7, 5.5, 8, 11, 13.5],
        [3.3, 6.6, 10, 13, 16],
      ),
      '+{value} hull regenerated per 10 seconds.',
    ),
    affinities: ['Imposing'],
  },
  {
    ...entry(
      'fibroblasts',
      'Fibroblasts',
      'ordinary',
      { epic: [1, 1.5, 2], legendary: [1.5, 2, 2.5] },
      'Gain {value} maximum hull for every 50 hull actually healed.',
    ),
    affinities: ['Imposing'],
  },
  {
    ...entry(
      'immune-system',
      'Immune System',
      'ordinary',
      { rare: [15, 20, 25], epic: [30, 40, 50], legendary: [45, 60, 75] },
      '+{value}% corrosion resistance.',
    ),
    affinities: ['Imposing'],
  },
  {
    ...entry(
      'turtle-down',
      'Turtle Down',
      'ordinary',
      { rare: [4, 3.5, 3], epic: [3.5, 3, 2.5], legendary: [3, 2.5, 2] },
      'Reduce damage by 95% for a short time. Block contact early to stun. Cooldown {value}s.',
    ),
    aliases: ['hide'],
    affinities: ['Imposing'],
    requirement: {
      kind: 'any',
      conditions: [
        { kind: 'rank', id: 'carapace', minimum: 1 },
        { kind: 'rank', id: 'shell', minimum: 1 },
      ],
    },
    specializations: ['turtle-down-reinforced', 'turtle-down-spiked'],
    specializationChoices: [
      {
        id: 'turtle-down-reinforced',
        name: 'Reinforced',
        triggerRank: 3,
        carcinisationBonus: 0,
        effect: {
          kind: 'stats',
          changes: [{ stat: 'stunDuration', add: 0, multiplier: 2 }],
        },
      },
      feature('turtle-down-spiked', 'Spiked', 3),
    ],
  },
  {
    ...entry(
      'cheek-pouch',
      'Cheek Pouch',
      'ordinary',
      { rare: [1, 2, 3], epic: [2, 3, 4], legendary: [3, 4, 5] },
      'Store up to {value} salvage pieces for automatic consumption.',
    ),
    affinities: ['Gregarious', 'Trickster'],
    specializations: ['cheek-pouch-provider', 'cheek-pouch-storage'],
    specializationChoices: [
      feature('cheek-pouch-provider', 'Provider', 3),
      feature('cheek-pouch-storage', 'Storage', 3),
    ],
  },
  {
    ...entry(
      'forager',
      'Forager',
      'ordinary',
      { rare: [7.5, 15, 22.5], epic: [9, 18, 27], legendary: [11, 22, 33] },
      '+{value}% repair salvage chance and +{resistance}% corrosion resistance.',
    ),
    affinities: ['Prey'],
    detailValues: {
      resistance: {
        rare: [10, 20, 30],
        epic: [12, 25, 37],
        legendary: [15, 35, 50],
      },
    },
  },
  {
    ...entry(
      'reach',
      'Reach',
      'ordinary',
      rows([15, 30, 45], [17, 35, 52], [20, 40, 60], [23, 45, 70]),
      '+{value}% attack area.',
    ),
    affinities: ['Trickster'],
  },
  {
    ...entry(
      'ruminant',
      'Ruminant',
      'branching',
      { branching: [5, 7, 9] },
      'Gain {value} progress per Prey affinity every 10 seconds. Damage interrupts this for 10 seconds.',
    ),
    affinities: ['Prey'],
  },
  {
    ...entry(
      'herbivore',
      'Herbivore',
      'ordinary',
      {
        rare: [30, 50, 70, 90, 110],
        epic: [35, 60, 85, 110, 135],
        legendary: [40, 70, 100, 130, 160],
      },
      '+{value}% vegetation progress. Lose one Predator affinity per rank.',
    ),
    affinities: ['Prey'],
  },
  {
    ...entry(
      'carnivore',
      'Carnivore',
      'ordinary',
      {
        rare: [30, 50, 70, 90, 110],
        epic: [35, 60, 85, 110, 135],
        legendary: [40, 70, 100, 130, 160],
      },
      '+{value}% meat progress. Lose one Prey affinity per rank.',
      ['vegan'],
    ),
    affinities: ['Predator'],
  },
  entry(
    'piscivore',
    'Piscivore',
    'ordinary',
    {
      rare: [40, 70, 100, 130, 160],
      epic: [50, 85, 120, 155, 190],
      legendary: [60, 100, 140, 180, 220],
    },
    '+{value}% aquatic progress.',
    ['vegan'],
  ),
  {
    ...entry(
      'slow-metabolism',
      'Slow Metabolism',
      'ordinary',
      {
        epic: [15, 20, 25, 30, 37],
        legendary: [20, 27, 33, 40, 50],
      },
      'Reduce progress required by {value}% and speed by {speed}%.',
    ),
    affinities: ['Prey'],
    detailValues: {
      speed: { epic: [10, 13, 16, 20, 25], legendary: [10, 13, 16, 20, 25] },
    },
  },
  {
    ...entry(
      'saliva',
      'Saliva',
      'ordinary',
      rows(
        [15, 30, 45, 60, 75],
        [17, 35, 52, 70, 85],
        [20, 40, 60, 80, 100],
        [23, 45, 70, 95, 120],
      ),
      '+{value}% salvage speed and +{regeneration} regeneration.',
    ),
    affinities: ['Predator', 'Prey'],
    detailValues: {
      regeneration: rows(
        [1, 2, 3, 4, 5],
        [1.2, 2.5, 3.7, 5, 6.2],
        [1.4, 3, 4.5, 6, 7.5],
        [1.7, 3.5, 5.2, 7, 9],
      ),
    },
  },
  entry(
    'muscular-tissue',
    'Muscular Tissue',
    'ordinary',
    rows(
      [2, 4, 6, 8, 10],
      [2.3, 4.5, 7, 9.5, 11.5],
      [2.7, 5.5, 8, 11, 13.5],
      [3.3, 6.6, 10, 13, 16],
    ),
    '+{value} physical.',
  ),
  entry(
    'stomach',
    'Stomach',
    'ordinary',
    rows(
      [25, 50, 75, 100, 125],
      [28, 55, 85, 112, 140],
      [33, 66, 100, 133, 166],
      [40, 80, 120, 160, 200],
    ),
    '+{value}% salvage speed.',
  ),
  entry(
    'plated',
    'Plated',
    'ordinary',
    rows(
      [5, 10, 15, 20, 25],
      [6, 12, 18, 24, 30],
      [7, 14, 21, 28, 35],
      [8, 16, 24, 32, 40],
    ),
    '+{value} maximum plating.',
  ),
  {
    ...entry(
      'body-slam',
      'Body Slam',
      'ordinary',
      {
        rare: [10, 11, 12, 13, 14],
        epic: [11, 12, 13, 14, 15],
        legendary: [13, 14, 15, 16, 17],
      },
      'A close attack dealing {physical} times physical plus {value}% of maximum hull.',
    ),
    detailValues: {
      physical: {
        rare: [0.725, 0.825, 0.925, 1.025, 1.125],
        epic: [0.775, 0.875, 0.975, 1.075, 1.175],
        legendary: [0.9, 1, 1.1, 1.2, 1.3],
      },
    },
    aliases: ['body-slam-tail', 'Body Slam (Tail)'],
  },
  {
    ...entry(
      'claws',
      'Claws',
      'ordinary',
      rows(
        [0.775, 0.975, 1.175, 1.375, 1.575],
        [0.825, 1.025, 1.225, 1.425, 1.625],
        [0.875, 1.075, 1.275, 1.475, 1.675],
        [1, 1.2, 1.4, 1.6, 1.8],
      ),
      'A quick strike dealing {value} times physical damage every {cooldown} seconds.',
      ['pincer'],
    ),
    affinities: ['Predator'],
    requirement: {
      kind: 'any',
      conditions: [
        { kind: 'rank', id: 'arms', minimum: 1 },
        { kind: 'rank', id: 'tentacles', minimum: 3 },
      ],
    },
    detailValues: {
      cooldown: rows(
        [0.5, 0.45, 0.4, 0.35, 0.3],
        [0.5, 0.45, 0.4, 0.35, 0.3],
        [0.5, 0.45, 0.4, 0.35, 0.3],
        [0.5, 0.45, 0.4, 0.35, 0.3],
      ),
    },
  },
  {
    ...entry(
      'pincer',
      'Pincer',
      'ordinary',
      rows(
        [0.8, 1, 1.2, 1.4, 1.6],
        [0.85, 1.05, 1.25, 1.475, 1.675],
        [0.9, 1.1, 1.3, 1.55, 1.75],
        [1.1, 1.2, 1.4, 1.65, 1.85],
      ),
      'Two pincers each deal {value} times ability damage.',
      ['claws', 'toe-beans'],
    ),
    aliases: ['pincers'],
    icon: 'arms',
    affinities: ['Trickster', 'Carcinisation'],
    requirement: limbRequirement,
  },
  {
    ...entry(
      'toe-beans',
      'Toe Beans',
      'ordinary',
      rows(
        [1.2, 1.4, 1.6, 1.8, 2],
        [1.25, 1.475, 1.675, 1.875, 2.075],
        [1.3, 1.55, 1.75, 1.95, 2.15],
        [1.4, 1.65, 1.85, 2.05, 2.25],
      ),
      'Deal {value} times social damage and attempt to charm a bot at {charm} times the usual chance.',
      ['pincer'],
    ),
    icon: 'arms',
    affinities: ['Gregarious'],
    requirement: limbRequirement,
    detailValues: {
      charm: rows(
        [0.7, 0.8, 0.9, 1, 1.1],
        [0.9, 1, 1.1, 1.2, 1.3],
        [1.1, 1.2, 1.3, 1.4, 1.5],
        [1.3, 1.4, 1.5, 1.6, 1.7],
      ),
    },
  },
  {
    ...entry(
      'beak',
      'Beak',
      'ordinary',
      rows(
        [0.9, 1.1, 1.3, 1.5, 1.7],
        [1, 1.2, 1.4, 1.65, 1.85],
        [1.1, 1.3, 1.5, 1.8, 2],
        [1.3, 1.5, 1.7, 2, 2.25],
      ),
      'Peck at range for {value} times ability damage; gain {salvageSpeed}% salvage speed.',
      ['jaws', 'trunk', 'snout'],
    ),
    icon: 'attack',
    affinities: ['Trickster'],
    detailValues: { salvageSpeed: salvageSpeedRows },
    specializations: ['beak-sharp', 'beak-long'],
    specializationChoices: [
      feature('beak-sharp', 'Sharp', 3),
      feature('beak-long', 'Long', 3),
    ],
  },
  {
    ...entry(
      'stoner',
      'Stoner',
      'ordinary',
      rows(
        [1.1, 1.3, 1.5, 1.7, 1.9],
        [1.2, 1.4, 1.6, 1.8, 2],
        [1.3, 1.5, 1.7, 1.9, 2.1],
        [1.4, 1.6, 1.8, 2, 2.2],
      ),
      'Throw a stone for {value} to {chargedDamage} times the lower of physical or ability. Hold to charge. Carries {ammo} stones.',
    ),
    icon: 'attack',
    affinities: ['Trickster'],
    requirement: {
      kind: 'any',
      conditions: [
        { kind: 'rank', id: 'arms', minimum: 1 },
        { kind: 'rank', id: 'prehensile-tail', minimum: 1 },
        { kind: 'rank', id: 'tentacles', minimum: 1 },
        { kind: 'rank', id: 'trunk', minimum: 1 },
      ],
    },
    detailValues: {
      chargedDamage: rows(
        [2.2, 2.4, 2.6, 2.8, 3],
        [2.4, 2.6, 2.8, 3, 3.2],
        [2.6, 2.8, 3, 3.2, 3.4],
        [2.8, 3, 3.2, 3.4, 3.6],
      ),
      ammo: rows(
        [2, 3, 4, 5, 6],
        [2, 3, 4, 5, 6],
        [2, 3, 4, 5, 6],
        [2, 3, 4, 5, 6],
      ),
    },
    specializations: ['stoner-training', 'stoner-signal'],
    specializationChoices: [
      feature('stoner-training', 'Training', 2),
      feature('stoner-signal', 'Signal', 2),
    ],
  },
  {
    ...entry(
      'antlers',
      'Antlers',
      'ordinary',
      rows(
        [1.4, 1.6, 1.8, 2, 2.2],
        [1.5, 1.7, 1.9, 2.15, 2.45],
        [1.6, 1.8, 2.05, 2.35, 2.7],
        [1.8, 2, 2.25, 2.55, 2.95],
      ),
      'Deal {value} times physical damage; take {selfDamage}% of damage dealt, capped at 90% of maximum hull.',
      ['horns'],
    ),
    icon: 'attack',
    affinities: ['Imposing'],
    detailValues: {
      selfDamage: rows(
        [10, 10, 10, 10, 10],
        [9, 9, 9, 9, 9],
        [8, 8, 8, 8, 8],
        [7, 7, 7, 7, 7],
      ),
    },
  },
  {
    ...entry(
      'jaws',
      'Jaws',
      'ordinary',
      rows(
        [0.85, 1.05, 1.25, 1.45, 1.65],
        [0.95, 1.15, 1.35, 1.55, 1.8],
        [1.05, 1.3, 1.45, 1.7, 1.9],
        [1.25, 1.45, 1.65, 1.9, 2.1],
      ),
      'Deal {value} times physical damage, doubled against stunned targets. Gain {salvageSpeed}% salvage speed.',
      ['leech', 'beak'],
    ),
    icon: 'attack',
    affinities: ['Predator'],
    detailValues: { salvageSpeed: salvageSpeedRows },
    specializations: ['jaws-neck-bite', 'jaws-stalker'],
    specializationChoices: [
      feature('jaws-neck-bite', 'Neck Bite', 3),
      feature('jaws-stalker', 'Stalker', 3),
    ],
  },
  {
    ...entry(
      'horns',
      'Horns',
      'ordinary',
      {
        rare: [1.2, 1.4, 1.6, 1.85, 2.1],
        epic: [1.3, 1.5, 1.75, 1.95, 2.2],
        legendary: [1.5, 1.7, 1.95, 2.15, 2.4],
      },
      'Charge for {value} times physical damage, bypassing plating.',
      ['antlers'],
    ),
    icon: 'attack',
    affinities: ['Imposing'],
  },
  {
    ...entry(
      'trunk',
      'Trunk',
      'ordinary',
      {
        rare: [1.2, 1.5, 1.8, 2.1, 2.4],
        epic: [1.4, 1.7, 2, 2.3, 2.6],
        legendary: [1.6, 1.9, 2.2, 2.5, 2.8],
      },
      'Swipe for {value} times the lower of physical or ability; gain {salvageReach} salvage reach.',
      ['beak', 'leech', 'snout'],
    ),
    icon: 'attack',
    affinities: ['Imposing'],
    detailValues: {
      salvageReach: {
        rare: [0.66, 1.33, 2, 2.66, 3.33],
        epic: [0.8, 1.6, 2.4, 3.2, 4],
        legendary: [1, 2, 3, 4, 5],
      },
    },
  },
  {
    ...entry(
      'spit',
      'Spit',
      'ordinary',
      rows(
        [0.6, 0.7, 0.8, 0.95, 1.2],
        [0.65, 0.75, 0.85, 1.05, 1.25],
        [0.7, 0.8, 0.9, 1.1, 1.3],
        [0.8, 0.9, 1, 1.2, 1.4],
      ),
      'Fire a projectile for {value} times ability damage, reaching {range} units.',
    ),
    icon: 'attack',
    affinities: ['Trickster'],
    requirement: {
      kind: 'any',
      conditions: [
        { kind: 'rank', id: 'beak', minimum: 2 },
        { kind: 'rank', id: 'jaws', minimum: 1 },
        { kind: 'rank', id: 'saliva', minimum: 1 },
      ],
    },
    detailValues: {
      range: rows(
        [10, 12, 14, 16, 20],
        [10, 12, 14, 16, 20],
        [10, 12, 14, 16, 20],
        [10, 12, 14, 16, 20],
      ),
    },
  },
  {
    ...entry(
      'projectile-tongue',
      'Projectile Tongue',
      'ordinary',
      {
        rare: [1.05, 1.25, 1.45, 1.65, 1.85],
        epic: [1.15, 1.35, 1.6, 1.8, 2.05],
        legendary: [1.35, 1.55, 1.8, 2, 2.25],
      },
      'Extend your tongue for {value} times physical damage and stun the target.',
    ),
    icon: 'attack',
    affinities: ['Trickster'],
    detailValues: {
      cooldown: {
        rare: [5.5, 5, 4.5, 4, 3.5],
        epic: [5.5, 5, 4.5, 4, 3.5],
        legendary: [5.5, 5, 4.5, 4, 3.5],
      },
    },
    specializations: ['projectile-tongue-sticky', 'projectile-tongue-whiplash'],
    specializationChoices: [
      feature('projectile-tongue-sticky', 'Sticky', 3),
      feature('projectile-tongue-whiplash', 'Whiplash', 3),
    ],
  },
  {
    ...entry(
      'leech',
      'Leech',
      'ordinary',
      {
        rare: [1.05, 1.25, 1.45, 1.65, 1.85],
        epic: [1.15, 1.35, 1.6, 1.8, 2.05],
        legendary: [1.35, 1.55, 1.8, 2, 2.25],
      },
      'Drain {drain}% of damage dealt by a {value} times ability attack as hull.',
      ['jaws', 'snout', 'trunk'],
    ),
    icon: 'attack',
    affinities: ['Trickster'],
    detailValues: {
      drain: {
        rare: [10, 10, 10, 10, 10],
        epic: [11, 11, 11, 11, 11],
        legendary: [12, 12, 12, 12, 12],
      },
    },
    specializations: ['leech-anaesthetic', 'leech-vasodilators'],
    specializationChoices: [
      feature('leech-anaesthetic', 'Anaesthetic', 3),
      feature('leech-vasodilators', 'Vasodilators', 3),
    ],
  },
  {
    ...entry(
      'stinger',
      'Stinger',
      'ordinary',
      {
        rare: [0.8, 0.9, 1, 1.1, 1.2],
        epic: [1.1, 1.3, 1.5, 1.75, 2],
        legendary: [1.3, 1.5, 1.7, 1.95, 2.25],
      },
      'Strike for {value} times physical and apply corrosion for five seconds.',
      ['detachable-tail'],
    ),
    icon: 'attack',
    affinities: ['Trickster'],
    detailValues: {
      poison: {
        rare: [0.175, 0.225, 0.275, 0.325, 0.375],
        epic: [0.325, 0.375, 0.425, 0.475, 0.525],
        legendary: [0.375, 0.425, 0.475, 0.525, 0.575],
      },
    },
  },
  {
    ...entry(
      'spur',
      'Spur',
      'ordinary',
      {
        rare: [0.45, 0.55, 0.65, 0.75, 0.85],
        epic: [0.55, 0.65, 0.75, 0.85, 0.95],
        legendary: [0.65, 0.75, 0.85, 0.95, 1.05],
      },
      'Automatically follow your attacks for {value} times physical damage.',
    ),
    icon: 'attack',
    affinities: ['Predator'],
    specializations: ['spur-marking', 'spur-primal'],
    specializationChoices: [
      feature('spur-marking', 'Marking', 3),
      feature('spur-primal', 'Primal', 3),
    ],
  },
  {
    ...entry(
      'slide',
      'Slide',
      'ordinary',
      rows([4, 3.4, 2.8], [3.8, 3.2, 2.6], [3.6, 3, 2.4], [3.4, 2.8, 2.2]),
      'Slide {distance} units with a {value} second cooldown.',
    ),
    icon: 'movement',
    affinities: ['Prey', 'Trickster'],
    requirement: { kind: 'rank', id: 'slithery', minimum: 1 },
    detailValues: {
      distance: rows([10, 10, 10], [11, 11, 11], [12, 12, 12], [13, 13, 13]),
      duration: rows(
        [0.55, 0.5, 0.45],
        [0.55, 0.5, 0.45],
        [0.55, 0.5, 0.45],
        [0.55, 0.5, 0.45],
      ),
    },
  },
  {
    ...entry(
      'sprint',
      'Sprint',
      'ordinary',
      { rare: [40, 50, 60], epic: [50, 60, 70], legendary: [60, 70, 80] },
      'Gain {value}% speed for {duration} seconds.',
    ),
    icon: 'movement',
    affinities: ['Predator'],
    detailValues: {
      duration: {
        rare: [2, 2.5, 3],
        epic: [2.25, 2.75, 3.25],
        legendary: [2.5, 3, 3.5],
      },
      cooldown: {
        rare: [4.5, 4.5, 4.5],
        epic: [4, 4, 4],
        legendary: [3.5, 3.5, 3.5],
      },
    },
  },
  {
    ...entry(
      'leap',
      'Leap',
      'ordinary',
      rows([5.5, 5, 4.5], [5, 4.5, 4], [4.5, 4, 3.5], [4, 3.5, 3]),
      'Leap over obstacles with a {value} second cooldown.',
      ['scuttle'],
    ),
    icon: 'movement',
    affinities: ['Predator'],
    requirement: { kind: 'rank', id: 'legs', minimum: 1 },
    specializations: ['leap-bouncy', 'leap-heavy'],
    specializationChoices: [
      feature('leap-bouncy', 'Bouncy', 3),
      feature('leap-heavy', 'Heavy', 3),
    ],
  },
  {
    ...entry(
      'scuttle',
      'Scuttle',
      'ordinary',
      rows([4], [3.5], [3], [2.5]),
      'Scuttle 3.5 units with a {value} second cooldown.',
      ['leap'],
    ),
    icon: 'movement',
    affinities: ['Prey', 'Carcinisation'],
    requirement: { kind: 'rank', id: 'legs', minimum: 1 },
  },
  {
    ...entry(
      'arms',
      'Arms',
      'branching',
      { branching: [2, 4, 6] },
      '+{value} physical, ability, and salvage reach.',
    ),
    rankBlocks: [{ id: 'tentacles', minimum: 3, fromRank: 1, throughRank: 1 }],
  },
  {
    ...entry(
      'tentacles',
      'Tentacles',
      'branching',
      { branching: [0.75, 1.25, 1.75, 2.25, 2.75] },
      '+{value} speed and +{ability} ability.',
      ['legs'],
    ),
    affinities: ['Trickster'],
    detailValues: { ability: { branching: [2, 4, 6, 8, 10] } },
    rankBlocks: [{ id: 'arms', minimum: 2, fromRank: 3 }],
  },
  {
    ...entry(
      'legs',
      'Legs',
      'branching',
      { branching: [1.25, 2, 2.75] },
      '+{value} speed.',
      ['slithery', 'tentacles'],
    ),
    affinities: ['Predator', 'Prey'],
    specializations: ['legs-arthropod', 'legs-bipedal'],
    specializationChoices: [
      {
        id: 'legs-arthropod',
        name: 'Arthropod',
        triggerRank: 3,
        carcinisationBonus: 1,
        visual: { attachment: 'fins', visibility: 'public' },
        effect: {
          kind: 'lateral-dash',
          abilityId: 'scuttle',
          cooldownMultiplier: 0.5,
        },
      },
      {
        id: 'legs-bipedal',
        name: 'Bipedal',
        triggerRank: 3,
        carcinisationBonus: 0,
        requiresUnowned: ['arms'],
        visual: { attachment: 'crest', visibility: 'public' },
        effect: {
          kind: 'grant-upgrade',
          id: 'arms',
          rarity: 'branching',
          changes: [{ stat: 'speed', add: -1, multiplier: 1 }],
        },
      },
    ],
  },
  {
    ...entry(
      'tail',
      'Tail',
      'ordinary',
      rows(
        [1, 2, 3, 4, 5],
        [1.2, 2.5, 3.7, 5, 6.2],
        [1.4, 3, 4.5, 6, 7.5],
        [1.7, 3.5, 5.2, 7, 9],
      ),
      '+{value} ability and +{social} social.',
    ),
    affinities: ['Gregarious'],
    detailValues: {
      social: rows(
        [1.5, 3, 4.5, 6, 7.5],
        [1.7, 3.5, 5.2, 7, 8.7],
        [2, 4, 6, 8, 10],
        [2.3, 4.5, 6.7, 9, 11.2],
      ),
    },
  },
  {
    ...entry(
      'prehensile-tail',
      'Prehensile Tail',
      'ordinary',
      { rare: [2, 4, 6], epic: [2.5, 5, 7.5], legendary: [3, 6, 9] },
      '+{value} salvage reach.',
    ),
    affinities: ['Prey'],
    requirement: { kind: 'rank', id: 'tail', minimum: 1 },
    specializations: ['prehensile-tail-arboreal', 'prehensile-tail-thrower'],
    specializationChoices: [
      {
        id: 'prehensile-tail-arboreal',
        name: 'Arboreal',
        triggerRank: 3,
        carcinisationBonus: 0,
        visual: { attachment: 'fins', visibility: 'public' },
        effect: {
          kind: 'near-obstacle-speed',
          range: 5,
          bonusPerObstacle: 0.3,
          maxBonus: 0.9,
          decayPerSecond: 0.3,
        },
      },
      {
        id: 'prehensile-tail-thrower',
        name: 'Thrower',
        triggerRank: 3,
        carcinisationBonus: 0,
        visual: { attachment: 'crest', visibility: 'public' },
        effect: {
          kind: 'ability-damage',
          abilityId: 'stoner',
          multiplier: 1.75,
        },
      },
    ],
  },
  {
    ...entry(
      'more-legs',
      'More Legs',
      'ordinary',
      {
        rare: [0.4, 0.8, 1.2],
        epic: [0.55, 1.1, 1.65],
        legendary: [0.7, 1.4, 2.1],
      },
      '+{value} speed. The first rank adds one Carcinisation point.',
      ['slithery'],
    ),
    affinities: ['Carcinisation'],
    requirement: {
      kind: 'all',
      conditions: [
        { kind: 'rank', id: 'legs', minimum: 3 },
        { kind: 'specialization', id: 'legs-arthropod' },
      ],
    },
  },
  {
    ...entry(
      'fin',
      'Fin',
      'ordinary',
      { rare: [60], epic: [80], legendary: [100] },
      '+{value}% water adaptation.',
      ['hump', 'shell', 'carapace', 'spines'],
    ),
  },
  {
    ...entry(
      'hollow-bones',
      'Hollow Bones',
      'ordinary',
      {
        epic: [0.25, 0.5, 0.75, 1, 1.25],
        legendary: [0.3, 0.6, 0.9, 1.2, 1.5],
      },
      '+{value} speed and -{resistanceCost}% damage resistance.',
    ),
    affinities: ['Prey'],
    detailValues: {
      resistanceCost: {
        epic: [5, 10, 15, 20, 25],
        legendary: [4, 8, 12, 16, 20],
      },
    },
  },
  {
    ...entry(
      'slithery',
      'Slithery',
      'branching',
      { branching: [1, 1.75, 2.25] },
      '+{value} speed and +{adaptation}% terrain adaptation.',
      ['legs', 'more-legs'],
    ),
    detailValues: { adaptation: { branching: [20, 40, 60] } },
  },
  {
    ...entry(
      'wings',
      'Wings',
      'branching',
      { branching: [0.5] },
      '+{value} speed and +{adaptation}% terrain adaptation.',
    ),
    detailValues: { adaptation: { branching: [80] } },
  },
  entry('basic-dash', 'Dash', 'starting', fixed, 'Dash a short distance.'),
];
const playableIds = new Set(
  playableDefinitions.map((definition) => definition.id),
);
export const starterDefinitions: readonly ContentDefinition[] = [
  ...playableDefinitions,
  ...researchGraph.filter(
    (definition) =>
      !playableIds.has(definition.id) && definition.id !== 'body-slam-tail',
  ),
];
export function createStarterRegistry() {
  return createRegistry(
    [...startingDefinitions, ...starterDefinitions],
    new Set([...startingEffectIds, ...upgradeEffectIds, 'basic-dash']),
  );
}
