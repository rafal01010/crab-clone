import type { ContentDefinition } from './registry.js';
import { SOURCE_ABILITIES, type SourceRankTable } from './source-balance.js';

export function sourceRank(
  table: SourceRankTable | undefined,
  rarity: string,
  rank: number,
): number | undefined {
  const rows = table?.[rarity];
  return rows?.[Math.min(rank, rows.length) - 1];
}

export function sourceRange(
  table:
    Readonly<Record<string, readonly { x: number; y: number }[]>> | undefined,
  rarity: string,
  rank: number,
): { x: number; y: number } | undefined {
  const rows = table?.[rarity];
  return rows?.[Math.min(rank, rows.length) - 1];
}

export function applySourceDefinition(
  definition: ContentDefinition,
): ContentDefinition {
  const tuning = SOURCE_ABILITIES[definition.id];
  if (!tuning) return definition;
  const expand = (table: SourceRankTable) =>
    Object.fromEntries(
      definition.rarities.map((rarity) => [
        rarity,
        Array.from({ length: definition.maxRank }, (_, index) => {
          const value = sourceRank(table, rarity, index + 1);
          if (value === undefined)
            throw new Error(`Missing source value for ${definition.id}`);
          return value;
        }),
      ]),
    );
  const detailValues = { ...definition.detailValues };
  for (const [name, table] of Object.entries(tuning.details))
    detailValues[name] = expand(table);
  let rankDescription = definition.rankDescription;
  if (tuning.damageRanges && definition.id !== 'stoner') {
    for (const [name, component] of [
      ['minimumDamage', 'x'],
      ['maximumDamage', 'y'],
    ] as const)
      detailValues[name] = expand(
        Object.fromEntries(
          Object.entries(tuning.damageRanges).map(([rarity, ranges]) => [
            rarity,
            ranges.map((range) => Math.round(range[component] * 1e6) / 1e6),
          ]),
        ),
      );
    rankDescription = rankDescription?.replace(
      definition.id === 'body-slam' ? '{physical}' : '{value}',
      '{minimumDamage} to {maximumDamage}',
    );
  }
  if (definition.id === 'fibroblasts')
    rankDescription =
      'Gain {value} maximum hull for every {healingInterval} hull actually healed.';
  return {
    ...definition,
    values: expand(tuning.values),
    detailValues,
    rankDescription,
  };
}
