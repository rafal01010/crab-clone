import { createRegistry, type ContentDefinition } from './registry.js';
import { startingDefinitions, startingEffectIds } from './starting.js';

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
    plated: 'Increases maximum plating.',
    'body-slam': 'A close attack that scales with physical and maximum hull.',
    arms: 'Increases physical, ability, and salvage reach.',
    slithery: 'Increases speed and terrain adaptation.',
    wings: 'Increases speed and terrain adaptation.',
  };
  return {
    id,
    name,
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
export const starterDefinitions: readonly ContentDefinition[] = [
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
  entry(
    'body-slam',
    'Body Slam',
    'ordinary',
    {
      rare: [10, 11, 12, 13, 14],
      epic: [11, 12, 13, 14, 15],
      legendary: [13, 14, 15, 16, 17],
    },
    'A close attack that adds {value}% of maximum hull to physical damage.',
  ),
  entry(
    'arms',
    'Arms',
    'branching',
    { branching: [2, 4, 6] },
    '+{value} physical, ability, and salvage reach.',
  ),
  entry(
    'slithery',
    'Slithery',
    'branching',
    { branching: [1, 1.75, 2.25] },
    '+{value} speed and improved terrain adaptation.',
    ['legs', 'more-legs'],
  ),
  entry(
    'wings',
    'Wings',
    'branching',
    { branching: [1] },
    '+{value} speed and improved terrain adaptation.',
  ),
  entry('basic-dash', 'Dash', 'starting', fixed, 'Dash a short distance.'),
  ...['legs', 'more-legs'].map((id) => ({
    ...entry(id, id, 'branching', fixed, 'Unavailable.'),
    disposition: 'blocked' as const,
    selectable: false,
    ...(id === 'legs'
      ? {
          maxRank: 3,
          specializations: ['legs-arthropod', 'legs-bipedal'],
          specializationChoices: [
            {
              id: 'legs-arthropod',
              name: 'Arthropod',
              triggerRank: 3,
              carcinisationBonus: 1,
            },
          ],
        }
      : {}),
  })),
];
export const starterUnlocks = {
  arms: ['pincer', 'claws', 'toe-beans', 'stoner'],
  slithery: ['constriction', 'slide', 'pedal-glands'],
  wings: [],
} as const;
export function createStarterRegistry() {
  return createRegistry(
    [...startingDefinitions, ...starterDefinitions],
    new Set([
      ...startingEffectIds,
      'muscular-tissue',
      'stomach',
      'plated',
      'body-slam',
      'arms',
      'slithery',
      'wings',
      'basic-dash',
    ]),
  );
}
export const BODY_SLAM_PHYSICAL: Readonly<Record<string, readonly number[]>> = {
  rare: [0.725, 0.825, 0.925, 1.025, 1.125],
  epic: [0.775, 0.875, 0.975, 1.075, 1.175],
  legendary: [0.9, 1, 1.1, 1.2, 1.3],
};
