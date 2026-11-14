import type { ContentDefinition } from './registry.js';

type StartingStats = { maximumHealthBonus: number };
type StartingEffect = (stats: StartingStats, value: number) => StartingStats;

export const startingDefinitions: readonly ContentDefinition[] = [
  {
    id: 'standard',
    aliases: [],
    disposition: 'implemented',
    selectable: false,
    name: 'Standard',
    description: 'Starting configuration: +15 maximum health.',
    pool: 'starting',
    maxRank: 1,
    rarities: ['fixed'],
    values: { fixed: [15] },
    requirement: { kind: 'none' },
    exclusions: [],
    affinities: [],
    effect: 'starting-maximum-health',
    specializations: [],
  },
];

const startingEffects: ReadonlyMap<string, StartingEffect> = new Map([
  [
    'starting-maximum-health',
    (stats, value) => ({
      ...stats,
      maximumHealthBonus: stats.maximumHealthBonus + value,
    }),
  ],
]);
export const startingEffectIds: ReadonlySet<string> = new Set(
  startingEffects.keys(),
);

export function initialStartingStats(): StartingStats {
  return startingDefinitions.reduce(
    (stats, definition) => {
      const effect = startingEffects.get(definition.effect);
      const value = definition.values.fixed?.[0];
      if (!effect || value === undefined)
        throw new Error(`Invalid starting effect: ${definition.id}`);
      return effect(stats, value);
    },
    { maximumHealthBonus: 0 },
  );
}
