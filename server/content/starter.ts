import { SOURCE_GAMEPLAY } from './source-gameplay.js';
import { createRegistry, type ContentDefinition } from './registry.js';
import { startingDefinitions, startingEffectIds } from './starting.js';
import { upgradeEffectIds } from '../match/upgrade-effects.js';
import { researchGraph } from './research-graph.js';
import { applySourceDefinition } from './source-tuning.js';

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
    'more-eyes': 'Improves sensors and dodge.',
    antennae:
      'Improves sensors and signal strength. The first rank adds Overload.',
    cortex: 'Increases ability.',
    synapse: 'Reduces cooldowns.',
    snout: 'Improves sensors and offers sensor specializations.',
    tracker: 'Tracks elites and increases their salvage drops.',
    nomadic: 'Gain progress when discovering a point of interest.',
    diurnal: 'Extend day and deal more damage during it.',
    nocturnal: 'Extend night, improve sensors, and deal more damage at night.',
    hibernation: 'Gain progress each second inside shelter.',
    pollinator:
      'Discoveries increase nearby vegetation and grant affinity-weighted bonuses.',
    'subcutaneous-fat': 'Increases maximum hull and thermal adaptation.',
    sharpen: 'Temporarily adds contact damage based on Assault affinity.',
    'pistol-pincer':
      'Strike with your stronger offensive stat and push the target.',
    constriction: 'Hold still to stun and damage nearby enemies.',
    moulting: 'Stun yourself, then gain random bonuses for your Overload.',
    burrower: 'Create a finite shelter.',
    'lick-wounds':
      'Heal yourself. Incoming attacks shorten its cooldown based on salvage speed.',
    outlier: 'Gain a random eligible legendary module.',
    'convergent-evolution':
      'Increase your highest affinity and favor Overload offers.',
    ambush: 'Increases damage briefly after leaving shelter.',
    'detachable-tail': 'Deploys a decoy after damage or a dodge.',
    stomach: 'Increases salvage speed.',
    'slow-metabolism': 'Reduces movement speed and progress required to level.',
    saliva: 'Increases salvage speed and regeneration.',
    forager:
      'Adds a chance of repair salvage and increases corrosion resistance.',
    'cheek-pouch': 'Stores salvage for automatic consumption.',
    reach: 'Increases attack area.',
    ruminant: 'Generates progress based on Survival affinity while unharmed.',
    herbivore: 'Increases vegetation progress and reduces Assault affinity.',
    carnivore:
      'Increases wreck salvage progress and reduces Survival affinity.',
    piscivore: 'Increases aquatic progress.',
    omnivore: 'Increases progress from all salvage.',
    vegan:
      'Increases vegetation progress but blocks wreck and aquatic salvage.',
    scavenger:
      'Increases progress from salvage you did not earn a kill credit for.',
    chonky: 'Increases size and physical.',
    'more-mass': 'Increases size, physical, and maximum hull.',
    elusive: 'Reduces size and increases dodge.',
    smol: 'Reduces size and increases speed.',
    overwhelm: 'Adds damage based on active plating.',
    agile: 'Increases dodge and reduces the movement penalty while attacking.',
    dexterous: 'Increases ability and reduces cooldowns.',
    robust: 'Increases maximum hull with size above normal.',
    scales: 'Increases damage resistance and heat adaptation.',
    fur: 'Increases damage resistance and cold adaptation.',
    carapace: 'Increases damage resistance and plating.',
    shell: 'Increases damage resistance.',
    plated: 'Increases maximum plating.',
    spines: 'Returns damage from contact attacks.',
    exoskeleton: 'Increases plating and signal strength.',
    shifty: 'Converts reduced size into dodge and damage.',
    impervious: 'Delays half of incoming damage and increases maximum hull.',
    'regenerative-tissue': 'Increases regeneration.',
    fibroblasts: 'Gain maximum hull after enough actual healing.',
    hump: 'Gain maximum hull when consuming repair salvage at full hull.',
    'immune-system': 'Increases corrosion resistance.',
    'turtle-down':
      'Briefly reduce damage and stun correctly timed contact attackers.',
    'body-slam': 'A close attack that scales with physical and maximum hull.',
    arms: 'Increases physical, ability, and salvage reach.',
    slithery: 'Increases speed and terrain adaptation.',
    wings: 'Increases speed and terrain adaptation.',
    tentacles: 'Increases speed and ability.',
    legs: 'Increases speed and offers locomotion specializations.',
    tail: 'Increases ability power and signal strength.',
    'tail-wag':
      'Automatically attempts to recruit nearby bots every 5 seconds.',
    'prehensile-tail':
      'Increases salvage reach and offers boom specializations.',
    'more-legs': 'Increases speed and adds personal risk.',
    fin: 'Improves movement through water.',
    'hollow-bones': 'Increases speed while reducing damage resistance.',
    spit: 'Fire a ranged ability attack.',
    'projectile-tongue': 'Hold position and fire a stunning harpoon.',
    leech: 'Drain hull with a short-range ability attack.',
    stinger: 'Strike and inflict corrosion.',
    spur: 'Automatically follow attacks with physical damage.',
    slide: 'Slide a long distance.',
    sprint: 'Temporarily increase speed.',
    leap: 'Jump over obstacles and avoid direct impacts.',
    scuttle: 'Move a short distance and gain Overload.',
    jet: 'Dash and deploy any installed foam or snares along the way.',
  };
  const icons: Record<string, ContentDefinition['icon']> = {
    'muscular-tissue': 'power',
    'more-eyes': 'sensor',
    antennae: 'beacon',
    snout: 'sensor',
    'tail-wag': 'beacon',
    whining: 'beacon',
    'courting-display': 'beacon',
    stoner: 'projectile',
    spit: 'projectile',
    'projectile-tongue': 'projectile',
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
const repeatable = (
  id: string,
  name: string,
  amount: number,
  description: string,
  affinity: string,
): ContentDefinition => ({
  ...entry(
    id,
    name,
    'ordinary',
    rows([amount], [amount], [amount], [amount]),
    description,
  ),
  maxRank: Number.MAX_SAFE_INTEGER,
  repeatable: 'linear',
  requirement: { kind: 'world', condition: 'finale' },
  affinities: [affinity],
});
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
    | 'fur-snow-dive'
    | 'fur-wool'
    | 'spines-poisonous'
    | 'spines-detachable'
    | 'turtle-down-reinforced'
    | 'turtle-down-spiked'
    | 'snout-whiskers'
    | 'snout-toxic-sequestration'
    | 'fungoid-cordyceps'
    | 'fungoid-ejection'
    | 'virulent-neurotoxin'
    | 'virulent-metabolisation'
    | 'pedal-glands-thick'
    | 'pedal-glands-nemertide'
    | 'spinnerets-trap'
    | 'spinnerets-egg-sac',
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
  repeatable('aggressive', 'Aggressive', 1, '+{value} physical.', 'Predator'),
  repeatable('cunning', 'Cunning', 1, '+{value} ability.', 'Trickster'),
  repeatable('sturdy', 'Sturdy', 8, '+{value} maximum hull.', 'Imposing'),
  repeatable(
    'commanding',
    'Commanding',
    5,
    '+{value}% recruited bot damage.',
    'Gregarious',
  ),
  repeatable(
    'resourceful',
    'Resourceful',
    5,
    '+{value}% progress from all salvage.',
    'Prey',
  ),
  {
    ...repeatable(
      'extremophile',
      'Meteor Insulation',
      1,
      '+{value}% meteor resistance.',
      'Prey',
    ),
    rarities: ['legendary'],
    values: { legendary: [9, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1] },
    repeatable: 'cumulative',
    affinities: ['Prey', 'Imposing'],
  },
  {
    ...repeatable(
      'strength-in-numbers',
      'Strength in Numbers',
      1,
      '+{value}% meteor resistance per recruited bot for you and your recruited bots.',
      'Gregarious',
    ),
    rarities: ['legendary'],
    values: { legendary: [1] },
  },
  {
    ...entry(
      'more-eyes',
      'Optical Array',
      'ordinary',
      rows(
        [5, 10, 15, 20, 25],
        [6, 12, 18, 25, 32],
        [7, 15, 22, 30, 38],
        [8, 17, 26, 35, 45],
      ),
      '+{value}% dodge and +{senses}% sensors.',
    ),
    affinities: ['Gregarious', 'Prey'],
    detailValues: {
      senses: rows(
        [15, 30, 45, 60, 75],
        [17, 35, 52, 70, 85],
        [20, 40, 60, 80, 100],
        [23, 45, 70, 95, 120],
      ),
    },
  },
  {
    ...entry(
      'antennae',
      'Signal Antennas',
      'ordinary',
      {
        rare: [1.5, 3, 4.5, 6, 7.5],
        epic: [1.7, 3.5, 5.2, 7, 8.7],
        legendary: [2, 4, 6, 8, 10],
      },
      '+{value} signal strength and +{senses}% sensors. The first rank adds one Overload point.',
    ),
    affinities: ['Carcinisation', 'Gregarious'],
    detailValues: {
      senses: {
        rare: [15, 30, 45, 60, 75],
        epic: [18, 36, 55, 73, 90],
        legendary: [23, 45, 68, 90, 110],
      },
    },
  },
  {
    ...entry(
      'cortex',
      'Combat Processor',
      'ordinary',
      rows(
        [2, 4, 6, 8, 10],
        [2.3, 4.5, 7, 9.5, 11.5],
        [2.7, 5.5, 8, 11, 13.5],
        [3.3, 6.6, 10, 13, 16],
      ),
      '+{value} ability.',
    ),
    affinities: ['Trickster'],
  },
  {
    ...entry(
      'synapse',
      'Timing Circuit',
      'ordinary',
      {
        rare: [10, 20, 30],
        epic: [11, 23, 35],
        legendary: [13, 26, 40],
      },
      '-{value}% cooldown.',
    ),
    requirement: { kind: 'rank', id: 'cortex', minimum: 3 },
    affinities: ['Trickster'],
  },
  {
    ...entry(
      'snout',
      'Sensor Probe',
      'ordinary',
      {
        rare: [15, 30, 45],
        epic: [20, 40, 60],
        legendary: [25, 50, 75],
      },
      '+{value}% sensors.',
      ['trunk', 'beak', 'leech'],
    ),
    specializations: ['snout-whiskers', 'snout-toxic-sequestration'],
    affinities: ['Prey', 'Gregarious'],
    specializationChoices: [
      feature('snout-whiskers', 'Night Navigation', 3),
      feature('snout-toxic-sequestration', 'Reactive Filter', 3),
    ],
  },
  {
    ...entry(
      'diurnal',
      'Solar Calibration',
      'ordinary',
      { epic: [7, 15, 22], legendary: [10, 20, 30] },
      '+{value}% damage during the day. Extend day by {duration} seconds and shorten night by the same amount.',
      ['nocturnal'],
    ),
    detailValues: { duration: { epic: [8, 16, 24], legendary: [10, 20, 30] } },
  },
  {
    ...entry(
      'nocturnal',
      'Night Calibration',
      'ordinary',
      { epic: [7, 15, 22], legendary: [10, 20, 30] },
      '+{value}% damage at night and +{senses}% sensors. Extend night by {duration} seconds and shorten day by the same amount.',
      ['diurnal'],
    ),
    detailValues: {
      duration: { epic: [8, 16, 24], legendary: [10, 20, 30] },
      senses: { epic: [18, 36, 55], legendary: [23, 45, 68] },
    },
  },
  {
    ...entry(
      'pollinator',
      'Survey Seeder',
      'branching',
      { branching: [4, 3, 2] },
      'Discoveries increase vegetation by 5%. Gain an affinity-weighted bonus now and every {value} discoveries.',
    ),
    affinities: ['Gregarious'],
  },
  {
    ...entry(
      'hibernation',
      'Standby Cycle',
      'ordinary',
      rows(
        [2.5, 5, 7.5, 10, 12.5],
        [3, 6, 9, 12, 15],
        [3.5, 7, 10.5, 14, 17.5],
        [4, 8, 12, 16, 20],
      ),
      'Gain {value}% of the next level requirement each second in shelter.',
    ),
    requirement: { kind: 'rank', id: 'fur', minimum: 1 },
    affinities: ['Prey'],
  },
  {
    ...entry(
      'nomadic',
      'Survey Uplink',
      'ordinary',
      {
        rare: [20, 40, 60, 80, 100],
        epic: [25, 50, 75, 100, 125],
        legendary: [30, 60, 90, 120, 150],
      },
      'Gain {value}% of the next level requirement when discovering a point of interest.',
    ),
    affinities: ['Prey', 'Gregarious'],
  },
  {
    ...entry(
      'tracker',
      'Tracker',
      'ordinary',
      {
        rare: [20, 40, 60],
        epic: [25, 50, 75],
        legendary: [30, 60, 90],
      },
      'Elite salvage has a {value}% chance to produce an extra item.',
    ),
    requirement: {
      kind: 'any',
      conditions: [
        { kind: 'rank', id: 'nomadic', minimum: 1 },
        { kind: 'rank', id: 'snout', minimum: 1 },
        { kind: 'rank', id: 'more-eyes', minimum: 2 },
      ],
    },
    affinities: ['Predator'],
  },
  {
    ...entry(
      'ambush',
      'Ambush',
      'ordinary',
      {
        epic: [30, 60, 90],
        legendary: [40, 80, 120],
      },
      'Deal {value}% more damage for 3 seconds after leaving shelter.',
    ),
    affinities: ['Predator', 'Trickster'],
  },
  {
    ...entry(
      'detachable-tail',
      'Ejectable Decoy',
      'ordinary',
      { rare: [2, 2.5, 3], epic: [2.5, 3, 3.5], legendary: [3, 3.5, 4] },
      'Deploy a decoy for {value} seconds. Cooldown {cooldown} seconds.',
      ['stinger'],
    ),
    requirement: { kind: 'rank', id: 'tail', minimum: 2 },
    affinities: ['Prey', 'Trickster'],
    detailValues: {
      cooldown: { rare: [13, 11, 9], epic: [12, 10, 8], legendary: [11, 9, 7] },
    },
  },
  {
    ...entry(
      'fungoid',
      'Firmware Fabricator',
      'ordinary',
      {
        rare: [18, 16, 14, 12, 10],
        epic: [16, 14, 12, 10, 8],
        legendary: [14, 12, 10, 8, 6],
      },
      'Generate firmware every {value} to {maximum} seconds.',
    ),
    detailValues: {
      maximum: {
        rare: [24, 22, 20, 18, 16],
        epic: [22, 20, 18, 16, 14],
        legendary: [20, 18, 16, 14, 12],
      },
    },
    affinities: ['Prey'],
    specializations: ['fungoid-cordyceps', 'fungoid-ejection'],
    specializationChoices: [
      feature('fungoid-cordyceps', 'Infiltration Firmware', 3),
      feature('fungoid-ejection', 'Emergency Fabrication', 3),
    ],
  },
  {
    ...entry(
      'poisonous-saliva',
      'Corrosive Payload',
      'ordinary',
      {
        rare: [0.1, 0.15, 0.2],
        epic: [0.15, 0.2, 0.25],
        legendary: [0.25, 0.3, 0.35],
      },
      'Crusher, Piercing Probe, Drain Probe, Plasma Shot, and Shock Harpoon hits cause corrosion for 5 seconds.',
    ),
    requirement: {
      kind: 'all',
      conditions: [
        { kind: 'rank', id: 'saliva', minimum: 1 },
        {
          kind: 'any',
          conditions: [
            'jaws',
            'beak',
            'leech',
            'spit',
            'projectile-tongue',
          ].map((id) => ({ kind: 'rank' as const, id, minimum: 1 })),
        },
      ],
    },
    affinities: ['Trickster'],
  },
  {
    ...entry(
      'revenge',
      'Revenge',
      'ordinary',
      {
        rare: [4, 7, 10],
        epic: [4, 7, 10],
        legendary: [4, 7, 10],
      },
      'Taking a hit grants damage for 4 seconds, up to {value} stacks.',
    ),
    detailValues: {
      increase: {
        rare: [10, 10, 10],
        epic: [12, 12, 12],
        legendary: [15, 15, 15],
      },
    },
    affinities: ['Imposing', 'Predator'],
  },
  {
    ...entry(
      'poisonous-spores',
      'Corrosive Vent',
      'ordinary',
      {
        rare: [0.175, 0.225, 0.275],
        epic: [0.225, 0.275, 0.325],
        legendary: [0.275, 0.325, 0.375],
      },
      'Taking damage releases nearby corrosion for 5 seconds.',
    ),
    requirement: { kind: 'rank', id: 'fungoid', minimum: 1 },
    affinities: ['Trickster'],
  },
  {
    ...entry(
      'virulent',
      'Catalytic Mix',
      'ordinary',
      {
        rare: [15, 30, 45, 60, 75],
        epic: [20, 40, 60, 80, 100],
        legendary: [25, 50, 75, 100, 125],
      },
      '+{value}% corrosion damage.',
    ),
    requirement: {
      kind: 'any',
      conditions: ['poisonous-saliva', 'poisonous-spores', 'stinger'].map(
        (id) => ({ kind: 'rank' as const, id, minimum: 1 }),
      ),
    },
    affinities: ['Trickster'],
    specializations: ['virulent-neurotoxin', 'virulent-metabolisation'],
    specializationChoices: [
      feature('virulent-neurotoxin', 'Fast Catalyst', 3),
      feature('virulent-metabolisation', 'Recovery Loop', 3),
    ],
  },
  {
    ...entry(
      'pedal-glands',
      'Drag Foam',
      'ordinary',
      {
        common: [10, 20, 25],
        rare: [15, 25, 30],
        epic: [20, 30, 35],
        legendary: [25, 35, 40],
      },
      'Leave a slowing trail when pursued.',
    ),
    detailValues: {
      cooldown: {
        common: [25, 25, 25],
        rare: [20, 20, 20],
        epic: [15, 15, 15],
        legendary: [10, 10, 10],
      },
      adaptation: {
        common: [15, 15, 15],
        rare: [20, 20, 20],
        epic: [30, 30, 30],
        legendary: [40, 40, 40],
      },
    },
    requirement: { kind: 'rank', id: 'slithery', minimum: 1 },
    affinities: ['Prey', 'Trickster'],
    specializations: ['pedal-glands-thick', 'pedal-glands-nemertide'],
    specializationChoices: [
      feature('pedal-glands-thick', 'Wide Spray', 3),
      feature('pedal-glands-nemertide', 'Caustic Foam', 3),
    ],
  },
  {
    ...entry(
      'alpha',
      'Command Chassis',
      'branching',
      { branching: [15, 30, 45] },
      '+{value}% size, +{social} signal strength, and +{health} maximum hull.',
    ),
    detailValues: {
      social: { branching: [2, 4, 6] },
      health: { branching: [15, 30, 45] },
    },
    affinities: ['Imposing', 'Gregarious'],
  },
  {
    ...entry(
      'pack',
      'Squad Link',
      'ordinary',
      {
        rare: [3, 6, 9],
        epic: [4, 8, 12],
        legendary: [5, 10, 15],
      },
      'You and your allies gain {value}% damage per recruited bot.',
    ),
    requirement: { kind: 'rank', id: 'alpha', minimum: 1 },
    affinities: ['Gregarious'],
  },
  {
    ...entry(
      'whining',
      'Distress Beacon',
      'ordinary',
      {
        rare: [0.4, 0.5, 0.6],
        epic: [0.5, 0.65, 0.8],
        legendary: [0.6, 0.8, 1],
      },
      'Attempt to recruit nearby bots after taking a hit.',
    ),
    affinities: ['Gregarious'],
  },
  {
    ...entry(
      'courting-display',
      'Override Beacon',
      'ordinary',
      {
        epic: [25, 15, 5],
        legendary: [20, 10, 1],
      },
      'Attempt to override a nearby bot. Cooldown {value} seconds.',
    ),
    aliases: ['courting'],
    affinities: ['Gregarious'],
  },
  {
    ...entry(
      'spinnerets',
      'Snare Projector',
      'ordinary',
      {
        epic: [25, 20, 15],
        legendary: [20, 15, 10],
      },
      'Deploy a slowing snare for 7 seconds. Cooldown {value} seconds.',
    ),
    affinities: ['Predator', 'Trickster'],
    specializations: ['spinnerets-trap', 'spinnerets-egg-sac'],
    specializationChoices: [
      feature('spinnerets-trap', 'Stun Grid', 3),
      feature('spinnerets-egg-sac', 'Drone Canister', 3),
    ],
  },
  {
    ...entry(
      'omnivore',
      'Universal Recycler',
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
      'Plant-Only Feed',
      'ordinary',
      { epic: [75, 150, 225], legendary: [100, 200, 300] },
      '+{value}% vegetation progress. Cannot process wreck or aquatic salvage. Lose three Assault affinity per rank.',
      ['carnivore', 'piscivore', 'scavenger'],
    ),
    requirement: { kind: 'rank', id: 'herbivore', minimum: 2 },
  },
  {
    ...entry(
      'scavenger',
      'Derelict Scavenger',
      'ordinary',
      {
        rare: [50, 100, 150, 200, 250],
        epic: [66, 133, 200, 266, 333],
        legendary: [75, 150, 225, 300, 375],
      },
      '+{value}% progress from salvage you did not earn a kill credit for.',
      ['vegan'],
    ),
    aliases: ['carrion'],
    affinities: ['Gregarious', 'Prey'],
  },
  {
    ...entry(
      'chonky',
      'Heavy Frame',
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
      'Microframe',
      'ordinary',
      {
        rare: [0.1, 0.2, 0.3, 0.4, 0.5],
        epic: [0.12, 0.25, 0.38, 0.5, 0.62],
        legendary: [0.15, 0.3, 0.45, 0.6, 0.75],
      },
      '+{value} speed, -{size}% size, and -2 Armor affinity per rank.',
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
      'Precision Controls',
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
      'Heat Shielding',
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
      feature('scales-basking', 'Solar Charging', 3),
      feature('scales-hard', 'Shock Plates', 3),
    ],
  },
  {
    ...entry(
      'subcutaneous-fat',
      'Thermal Lining',
      'ordinary',
      { rare: [10, 20, 30], epic: [12, 24, 36], legendary: [16, 32, 48] },
      '+{value} maximum hull and +{thermal}% heat and cold adaptation.',
    ),
    aliases: ['fat'],
    affinities: ['Imposing'],
    detailValues: {
      thermal: {
        rare: [15, 30, 45],
        epic: [18, 36, 55],
        legendary: [23, 45, 68],
      },
    },
  },
  {
    ...entry(
      'fur',
      'Cold Shielding',
      'ordinary',
      resistanceThree,
      '+{value}% damage resistance and +{cold}% cold adaptation.',
      ['scales', 'exoskeleton'],
    ),
    detailValues: {
      cold: rows([33, 66, 100], [36, 72, 110], [40, 80, 120], [50, 100, 150]),
    },
    specializations: ['fur-snow-dive', 'fur-wool'],
    specializationChoices: [
      feature('fur-snow-dive', 'Snow Sweep', 3),
      feature('fur-wool', 'Dual-Climate Lining', 3),
    ],
  },
  {
    ...entry(
      'carapace',
      'Layered Armor',
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
      'Armor Panels',
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
      'Reactive Studs',
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
      feature('spines-poisonous', 'Caustic Studs', 4),
      feature('spines-detachable', 'Ejecting Studs', 4),
    ],
  },
  {
    ...entry(
      'exoskeleton',
      'Outer Frame',
      'ordinary',
      { rare: [4, 8, 12], epic: [6, 12, 18], legendary: [8, 16, 24] },
      '+{value} plating and +{social} signal strength.',
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
      'Auto-Repair',
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
      'hump',
      'Repair Reserve',
      'ordinary',
      { epic: [1, 1.5, 2], legendary: [1.5, 2, 2.5] },
      'Gain {value} maximum hull when consuming repair salvage at full hull.',
      ['fin'],
    ),
    affinities: ['Imposing', 'Prey'],
  },
  {
    ...entry(
      'fibroblasts',
      'Adaptive Hull',
      'ordinary',
      { epic: [1, 1.5, 2], legendary: [1.5, 2, 2.5] },
      'Gain {value} maximum hull for every 50 hull actually healed.',
    ),
    affinities: ['Imposing'],
  },
  {
    ...entry(
      'immune-system',
      'Corrosion Seal',
      'ordinary',
      { rare: [15, 20, 25], epic: [30, 40, 50], legendary: [45, 60, 75] },
      '+{value}% corrosion resistance.',
    ),
    affinities: ['Imposing'],
  },
  {
    ...entry(
      'turtle-down',
      'Guard Lock',
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
        name: 'Stun Amplifier',
        triggerRank: 3,
        carcinisationBonus: 0,
        effect: {
          kind: 'stats',
          changes: [{ stat: 'stunDuration', add: 0, multiplier: 2 }],
        },
      },
      feature('turtle-down-spiked', 'Guard Studs', 3),
    ],
  },
  {
    ...entry(
      'cheek-pouch',
      'Salvage Hopper',
      'ordinary',
      { rare: [1, 2, 3], epic: [2, 3, 4], legendary: [3, 4, 5] },
      'Store up to {value} salvage pieces for automatic consumption.',
    ),
    affinities: ['Gregarious', 'Trickster'],
    specializations: ['cheek-pouch-provider', 'cheek-pouch-storage'],
    specializationChoices: [
      feature('cheek-pouch-provider', 'Support Dispenser', 3),
      feature('cheek-pouch-storage', 'Magazine Rack', 3),
    ],
  },
  {
    ...entry(
      'forager',
      'Salvage Scanner',
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
      'Idle Processor',
      'branching',
      { branching: [5, 7, 9] },
      'Gain {value} progress per Survival affinity every 10 seconds. Damage interrupts this for 10 seconds.',
    ),
    affinities: ['Prey'],
  },
  {
    ...entry(
      'herbivore',
      'Plant Recycler',
      'ordinary',
      {
        rare: [30, 50, 70, 90, 110],
        epic: [35, 60, 85, 110, 135],
        legendary: [40, 70, 100, 130, 160],
      },
      '+{value}% vegetation progress. Lose one Assault affinity per rank.',
    ),
    affinities: ['Prey'],
  },
  {
    ...entry(
      'carnivore',
      'Wreck Recycler',
      'ordinary',
      {
        rare: [30, 50, 70, 90, 110],
        epic: [35, 60, 85, 110, 135],
        legendary: [40, 70, 100, 130, 160],
      },
      '+{value}% wreck salvage progress. Lose one Survival affinity per rank.',
      ['vegan'],
    ),
    affinities: ['Predator'],
  },
  entry(
    'piscivore',
    'Aquatic Recycler',
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
      'Economy Mode',
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
      'Recovery Coolant',
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
    'Power Actuators',
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
    'Salvage Grinder',
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
      'Hull Ram',
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
      'Rotary Cutters',
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
      'Shock Clamps',
      'ordinary',
      rows(
        [0.8, 1, 1.2, 1.4, 1.6],
        [0.85, 1.05, 1.25, 1.475, 1.675],
        [0.9, 1.1, 1.3, 1.55, 1.75],
        [1.1, 1.2, 1.4, 1.65, 1.85],
      ),
      'Each clamp deals {value} times ability damage.',
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
      'Signal Strike',
      'ordinary',
      rows(
        [1.2, 1.4, 1.6, 1.8, 2],
        [1.25, 1.475, 1.675, 1.875, 2.075],
        [1.3, 1.55, 1.75, 1.95, 2.15],
        [1.4, 1.65, 1.85, 2.05, 2.25],
      ),
      'Deal damage equal to {value} times your signal strength and attempt to recruit a bot at {charm} times the usual chance.',
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
      'Piercing Probe',
      'ordinary',
      rows(
        [0.9, 1.1, 1.3, 1.5, 1.7],
        [1, 1.2, 1.4, 1.65, 1.85],
        [1.1, 1.3, 1.5, 1.8, 2],
        [1.3, 1.5, 1.7, 2, 2.25],
      ),
      'Thrust the probe for {value} times ability damage; gain {salvageSpeed}% salvage speed.',
      ['jaws', 'trunk', 'snout'],
    ),
    icon: 'attack',
    affinities: ['Trickster'],
    detailValues: { salvageSpeed: salvageSpeedRows },
    specializations: ['beak-sharp', 'beak-long'],
    specializationChoices: [
      feature('beak-sharp', 'Armor Piercer', 3),
      feature('beak-long', 'Shelter Breaker', 3),
    ],
  },
  {
    ...entry(
      'stoner',
      'Slug Launcher',
      'ordinary',
      rows(
        [1.1, 1.3, 1.5, 1.7, 1.9],
        [1.2, 1.4, 1.6, 1.8, 2],
        [1.3, 1.5, 1.7, 1.9, 2.1],
        [1.4, 1.6, 1.8, 2, 2.2],
      ),
      'Launch a slug for {value} to {chargedDamage} times the lower of physical or ability. Hold to charge. Carries {ammo} slugs.',
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
      feature('stoner-training', 'Combat Calibration', 2),
      feature('stoner-signal', 'Target Beacon', 2),
    ],
  },
  {
    ...entry(
      'antlers',
      'Recoil Fork',
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
      'Crusher',
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
      feature('jaws-neck-bite', 'Salvage Crusher', 3),
      feature('jaws-stalker', 'Night Crusher', 3),
    ],
  },
  {
    ...entry(
      'horns',
      'Piercing Blade',
      'ordinary',
      Object.fromEntries(
        Object.entries(SOURCE_GAMEPLAY.horns.damageRanges)
          .filter(([rarity]) => rarity !== 'common')
          .map(([rarity, rows]) => [
            rarity,
            rows.map(({ x, y }) => Math.round((x + y) * 50) / 100),
          ]),
      ),
      'Strike for {value} times physical damage, bypassing plating.',
      ['antlers'],
    ),
    icon: 'attack',
    affinities: ['Imposing'],
  },
  {
    ...entry(
      'trunk',
      'Grapple Arm',
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
      'Plasma Shot',
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
      'Shock Harpoon',
      'ordinary',
      {
        rare: [1.05, 1.25, 1.45, 1.65, 1.85],
        epic: [1.15, 1.35, 1.6, 1.8, 2.05],
        legendary: [1.35, 1.55, 1.8, 2, 2.25],
      },
      'Fire the harpoon for {value} times physical damage and stun the target.',
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
      feature('projectile-tongue-sticky', 'Winch Cable', 3),
      feature('projectile-tongue-whiplash', 'Rapid Cable', 3),
    ],
  },
  {
    ...entry(
      'leech',
      'Drain Probe',
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
      feature('leech-anaesthetic', 'Quiet Drain', 3),
      feature('leech-vasodilators', 'Recovery Pump', 3),
    ],
  },
  {
    ...entry(
      'stinger',
      'Corrosion Spike',
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
      'Follow-up Blade',
      'ordinary',
      {
        rare: [0.45, 0.55, 0.65, 0.75, 0.85],
        epic: [0.55, 0.65, 0.75, 0.85, 0.95],
        legendary: [0.65, 0.75, 0.85, 0.95, 1.05],
      },
      'Strike for {value} times physical damage. While equipped, also follows your other attack automatically, even while this blade is on cooldown.',
    ),
    icon: 'attack',
    affinities: ['Predator'],
    specializations: ['spur-marking', 'spur-primal'],
    specializationChoices: [
      feature('spur-marking', 'Tracking Blade', 3),
      feature('spur-primal', 'Reserve Charge', 3),
    ],
  },
  {
    ...entry(
      'outlier',
      'Experimental Module',
      'ordinary',
      { rare: [1], epic: [1.5], legendary: [2] },
      'Gain an eligible legendary module. Legendary-only choices have {value} times the weight.',
    ),
  },
  {
    ...entry(
      'convergent-evolution',
      'Affinity Tuning',
      'ordinary',
      { epic: [10], legendary: [15] },
      'Add {value} to your highest affinity and increase the weight of Overload offers by {chance}% per risk point.',
    ),
    affinities: ['Carcinisation'],
    detailValues: { chance: { epic: [15], legendary: [20] } },
  },
  {
    ...entry(
      'lick-wounds',
      'Field Repair',
      'ordinary',
      {
        rare: [10, 15, 20, 25, 30],
        epic: [12, 20, 27, 35, 42],
        legendary: [15, 25, 35, 45, 55],
      },
      'Restore {value} hull. Attacks shorten the 25 second cooldown based on salvage speed.',
      ['poisonous-saliva'],
    ),
    requirement: {
      kind: 'any',
      conditions: [
        { kind: 'rank', id: 'saliva', minimum: 1 },
        { kind: 'rank', id: 'whining', minimum: 1 },
      ],
    },
  },
  {
    ...entry(
      'burrower',
      'Shelter Rig',
      'ordinary',
      { rare: [80, 60, 40], epic: [70, 50, 30], legendary: [60, 40, 20] },
      'Create a shelter. Cooldown {value} seconds, paused while sheltered.',
    ),
    affinities: ['Prey'],
  },
  {
    ...entry(
      'moulting',
      'System Refit',
      'ordinary',
      { rare: [90, 80, 70], epic: [85, 75, 65], legendary: [80, 70, 60] },
      'Stun yourself for 3 seconds, then gain a random bonus for each Overload point. Cooldown {value} seconds.',
    ),
    affinities: ['Carcinisation'],
    requirement: { kind: 'rank', id: 'exoskeleton', minimum: 1 },
  },
  {
    ...entry(
      'constriction',
      'Lockdown Field',
      'ordinary',
      {
        rare: [0.17, 0.2, 0.22, 0.25, 0.27],
        epic: [0.22, 0.25, 0.27, 0.3, 0.32],
        legendary: [0.27, 0.3, 0.32, 0.35, 0.37],
      },
      'Hold still for {duration} seconds, stunning nearby enemies and dealing {value} to {maximum} times physical damage each second.',
    ),
    affinities: ['Predator', 'Trickster'],
    requirement: {
      kind: 'any',
      conditions: [
        { kind: 'rank', id: 'slithery', minimum: 1 },
        { kind: 'rank', id: 'tail', minimum: 1 },
      ],
    },
    detailValues: {
      maximum: {
        rare: [0.27, 0.3, 0.32, 0.35, 0.37],
        epic: [0.32, 0.35, 0.37, 0.4, 0.42],
        legendary: [0.37, 0.4, 0.42, 0.45, 0.47],
      },
      duration: {
        rare: [3, 3.5, 4, 4.5, 5],
        epic: [3, 3.5, 4, 4.5, 5],
        legendary: [3, 3.5, 4, 4.5, 5],
      },
    },
  },
  {
    ...entry(
      'pistol-pincer',
      'Impact Cannon',
      'ordinary',
      { epic: [2.2, 2.6, 3], legendary: [2.5, 3, 3.5] },
      'Strike for {value} to {maximum} times the higher of physical or ability, and push the target.',
    ),
    requirement: { kind: 'rank', id: 'pincer', minimum: 1 },
    affinities: ['Carcinisation', 'Trickster'],
    detailValues: { maximum: { epic: [2.6, 3, 3.5], legendary: [3, 3.1, 4] } },
  },
  {
    ...entry(
      'sharpen',
      'Edge Charge',
      'ordinary',
      { epic: [0.6, 0.8, 1], legendary: [0.8, 1, 1.2] },
      'For 10 seconds, add {value} contact damage per Assault affinity. Cooldown {cooldown} seconds.',
    ),
    affinities: ['Predator'],
    detailValues: { cooldown: { epic: [20, 20, 20], legendary: [16, 16, 16] } },
  },
  {
    ...entry(
      'jet',
      'Jet',
      'ordinary',
      rows([6, 5.5, 5], [5.75, 5.25, 4.75], [5.5, 5, 4.5], [5, 4.5, 4]),
      'Dash {distance} units and deploy any installed foam or snares. Cooldown {value} seconds.',
    ),
    icon: 'movement',
    affinities: ['Trickster'],
    requirement: {
      kind: 'all',
      conditions: [
        { kind: 'rank', id: 'tentacles', minimum: 1 },
        {
          kind: 'any',
          conditions: [
            { kind: 'rank', id: 'pedal-glands', minimum: 1 },
            { kind: 'rank', id: 'spinnerets', minimum: 1 },
          ],
        },
      ],
    },
    detailValues: {
      distance: rows([4, 4.5, 5], [4, 4.5, 5], [4, 4.5, 5], [4, 4.5, 5]),
      duration: rows(
        [0.2, 0.2, 0.2],
        [0.2, 0.2, 0.2],
        [0.2, 0.2, 0.2],
        [0.2, 0.2, 0.2],
      ),
    },
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
      feature('leap-bouncy', 'Second Stage', 3),
      feature('leap-heavy', 'Impact Landing', 3),
    ],
  },
  {
    ...entry(
      'scuttle',
      'Quick Boost',
      'ordinary',
      rows([4], [3.5], [3], [2.5]),
      'Boost 3.5 units with a {value} second cooldown.',
      ['leap'],
    ),
    icon: 'movement',
    affinities: ['Prey', 'Carcinisation'],
    requirement: { kind: 'rank', id: 'legs', minimum: 1 },
  },
  {
    ...entry(
      'arms',
      'Manipulator Arms',
      'branching',
      { branching: [2, 4, 6] },
      '+{value} physical, ability, and salvage reach.',
    ),
    rankBlocks: [{ id: 'tentacles', minimum: 3, fromRank: 1, throughRank: 1 }],
  },
  {
    ...entry(
      'tentacles',
      'Flex Mounts',
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
      'Lift Pods',
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
        name: 'Vector Fins',
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
        name: 'Manipulator Retrofit',
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
      'Rear Stabilizer',
      'ordinary',
      rows(
        [1, 2, 3, 4, 5],
        [1.2, 2.5, 3.7, 5, 6.2],
        [1.4, 3, 4.5, 6, 7.5],
        [1.7, 3.5, 5.2, 7, 9],
      ),
      '+{value} ability power and +{social} signal strength.',
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
      'tail-wag',
      'Recruitment Transmitter',
      'ordinary',
      SOURCE_GAMEPLAY.tailWag.multipliers,
      'Automatically attempt to recruit nearby bots every 5 seconds at {value} times the usual recruitment chance. Requires a free ally slot.',
    ),
    requirement: { kind: 'rank', id: 'tail', minimum: 1 },
    affinities: ['Gregarious'],
  },
  {
    ...entry(
      'prehensile-tail',
      'Salvage Boom',
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
        name: 'Obstacle Assist',
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
        name: 'High-Caliber Slugs',
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
      'Auxiliary Lift Pods',
      'ordinary',
      {
        rare: [0.4, 0.8, 1.2],
        epic: [0.55, 1.1, 1.65],
        legendary: [0.7, 1.4, 2.1],
      },
      '+{value} speed. The first rank adds one Overload point.',
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
      'Hydrofoil',
      'ordinary',
      { rare: [60], epic: [80], legendary: [100] },
      '+{value}% water adaptation.',
      ['hump', 'shell', 'carapace', 'spines'],
    ),
  },
  {
    ...entry(
      'hollow-bones',
      'Hollow Frame',
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
      'Low-Friction Skirt',
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
  ...playableDefinitions.map(applySourceDefinition),
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
