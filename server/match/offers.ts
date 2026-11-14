import type { ContentDefinition } from '../content/registry.js';

const RARITY_WEIGHT: Readonly<Record<string, number>> = {
  common: 60,
  rare: 25,
  epic: 12,
  legendary: 3,
  branching: 1,
  fixed: 1,
};
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

export type OfferChoice = { id: string; rarity: string; rank: number };

function draw<T>(
  items: readonly T[],
  weight: (item: T) => number,
  random: () => number,
): T | undefined {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
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
): OfferChoice[] {
  const remaining = definitions.filter((entry) =>
    entry.rarities.some((rarity) => (RARITY_WEIGHT[rarity] ?? 0) > 0),
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
                : (affinities.get(affinity) ?? 0) * 0.1),
            0,
          )) *
        (1 + (ranks.get(item.id) ?? 0) * 0.25),
      random,
    );
    if (!entry) break;
    remaining.splice(remaining.indexOf(entry), 1);
    const rarity = draw(
      entry.rarities,
      (item) => RARITY_WEIGHT[item] ?? 0,
      random,
    );
    const owned = ownedRarities.get(entry.id);
    const effectiveRarity =
      owned && rarityRank(owned) > rarityRank(rarity ?? '') ? owned : rarity;
    if (effectiveRarity && (RARITY_WEIGHT[effectiveRarity] ?? 0) > 0)
      result.push({
        id: entry.id,
        rarity: effectiveRarity,
        rank: (ranks.get(entry.id) ?? 0) + 1,
      });
  }
  return result;
}
