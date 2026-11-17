import { SOURCE_GAMEPLAY } from '../content/source-gameplay.js';
import type { ContentDefinition } from '../content/registry.js';

const RARITY_ORDER: Readonly<Record<string, number>> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
  branching: 0,
  fixed: 0,
};

export function rarityRank(rarity: string): number {
  return RARITY_ORDER[rarity] ?? -1;
}

export function nextRarity(
  definition: ContentDefinition,
  current: string,
): string | undefined {
  const rank = rarityRank(current);
  if (rank < 0 || current === 'branching' || current === 'fixed')
    return undefined;
  return definition.rarities
    .filter((rarity) => rarityRank(rarity) > rank)
    .sort((a, b) => rarityRank(a) - rarityRank(b))[0];
}

export type OfferChoice = { id: string; rarity: string; rank: number };

function draw<T>(
  items: readonly T[],
  weight: (item: T) => number,
  random: () => number,
): T | undefined {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  if (total <= 0) return undefined;
  let value = random() * total;
  for (const item of items) {
    value -= weight(item);
    if (value < 0) return item;
  }
  return items.at(-1);
}

export function generateOffer(
  definitions: readonly ContentDefinition[],
  ranks: ReadonlyMap<string, number>,
  affinities: ReadonlyMap<string, number>,
  ownedRarities: ReadonlyMap<string, string>,
  random: () => number,
  level = 1,
  carcinisation = 0,
  carcinisationWeight = 0,
): OfferChoice[] {
  const table =
    SOURCE_GAMEPLAY.offerRarities.find(
      (row) => level >= row.minimumLevel && level <= row.maximumLevel,
    ) ?? SOURCE_GAMEPLAY.offerRarities.at(-1);
  const weights: Readonly<Record<string, number>> = {
    ...table?.weights,
    branching: 1,
    fixed: 1,
  };
  const remaining = definitions.filter((entry) =>
    entry.rarities.some((rarity) => (weights[rarity] ?? 0) > 0),
  );
  const result: OfferChoice[] = [];
  while (remaining.length && result.length < 3) {
    const entry = draw(
      remaining,
      (item) =>
        (1 +
          item.affinities.reduce(
            (sum, affinity) =>
              sum +
              (affinity === 'Carcinisation'
                ? 0
                : Math.max(0, affinities.get(affinity) ?? 0) * 0.1),
            0,
          )) *
        (1 + (ranks.get(item.id) ?? 0) * 0.25) *
        (item.affinities.includes('Carcinisation')
          ? 1 + carcinisation * carcinisationWeight
          : 1),
      random,
    );
    if (!entry) break;
    remaining.splice(remaining.indexOf(entry), 1);
    const rarity = draw(entry.rarities, (item) => weights[item] ?? 0, random);
    const owned = ownedRarities.get(entry.id);
    const effectiveRarity =
      owned && rarityRank(owned) > rarityRank(rarity ?? '') ? owned : rarity;
    if (effectiveRarity)
      result.push({
        id: entry.id,
        rarity: effectiveRarity,
        rank: (ranks.get(entry.id) ?? 0) + 1,
      });
  }
  return result;
}
