export type Requirement =
  | { kind: 'all' | 'any'; conditions: readonly Requirement[] }
  | { kind: 'rank'; id: string; minimum: number }
  | { kind: 'specialization'; id: string }
  | { kind: 'world'; condition: string }
  | { kind: 'none' };
function references(requirement: Requirement): string[] {
  if (requirement.kind === 'none') return [];
  if (requirement.kind === 'rank') return [requirement.id];
  if (requirement.kind === 'specialization' || requirement.kind === 'world')
    return [];
  return requirement.conditions.flatMap(references);
}
function satisfied(
  requirement: Requirement,
  ranks: ReadonlyMap<string, number>,
  specializations: ReadonlySet<string>,
  worldConditions: ReadonlySet<string>,
): boolean {
  if (requirement.kind === 'none') return true;
  if (requirement.kind === 'rank')
    return (ranks.get(requirement.id) ?? 0) >= requirement.minimum;
  if (requirement.kind === 'specialization')
    return specializations.has(requirement.id);
  if (requirement.kind === 'world')
    return worldConditions.has(requirement.condition);
  return requirement.kind === 'all'
    ? requirement.conditions.every((child) =>
        satisfied(child, ranks, specializations, worldConditions),
      )
    : requirement.conditions.some((child) =>
        satisfied(child, ranks, specializations, worldConditions),
      );
}
function validateRequirement(
  requirement: Requirement,
  entries: ReadonlyMap<string, ContentDefinition>,
  specializations: ReadonlyMap<string, string>,
): void {
  if (requirement.kind === 'rank') {
    const parent = entries.get(requirement.id);
    if (
      !parent ||
      !Number.isSafeInteger(requirement.minimum) ||
      requirement.minimum < 1 ||
      requirement.minimum > parent.maxRank
    )
      throw new Error(`Invalid required rank for ${requirement.id}`);
  } else if (requirement.kind === 'specialization') {
    if (!specializations.has(requirement.id))
      throw new Error(`Unknown required specialization ${requirement.id}`);
  } else if (requirement.kind === 'world') {
    if (!requirement.condition) throw new Error('Empty world condition');
  } else if (requirement.kind === 'all' || requirement.kind === 'any') {
    if (requirement.conditions.length === 0)
      throw new Error('Empty requirement group');
    for (const child of requirement.conditions)
      validateRequirement(child, entries, specializations);
  }
}
export interface ContentDefinition {
  id: string;
  aliases: readonly string[];
  disposition: 'implemented' | 'blocked' | 'omitted';
  selectable: boolean;
  name: string;
  description: string;
  rankDescription?: string;
  pool: 'ordinary' | 'branching' | 'starting' | 'finale';
  maxRank: number;
  rarities: readonly string[];
  values: Readonly<Record<string, readonly number[]>>;
  requirement: Requirement;
  exclusions: readonly string[];
  affinities: readonly string[];
  effect: string;
  specializations: readonly string[];
  specializationChoices?: readonly {
    id: string;
    name: string;
    triggerRank: number;
    carcinisationBonus: number;
  }[];
}

export function createRegistry(
  definitions: readonly ContentDefinition[],
  handlers: ReadonlySet<string>,
  completeRelease = false,
) {
  const byId = new Map<string, ContentDefinition>();
  const names = new Set<string>();
  const specializations = new Map<string, string>();
  for (const entry of definitions) {
    if (!entry.id || byId.has(entry.id))
      throw new Error(`Duplicate or empty content id: ${entry.id}`);
    for (const name of [entry.id, ...entry.aliases]) {
      const key = name.toLowerCase();
      if (!key || names.has(key))
        throw new Error(`Conflicting content alias: ${name}`);
      names.add(key);
    }
    byId.set(entry.id, structuredClone(entry));
    for (const specialization of entry.specializations) {
      if (!specialization || specializations.has(specialization))
        throw new Error(`Duplicate or empty specialization: ${specialization}`);
      specializations.set(specialization, entry.id);
    }
  }
  if (completeRelease)
    throw new Error(
      'Complete release requires the source catalogue audit and release manifest',
    );
  for (const entry of byId.values()) {
    const referencedIds = [
      ...entry.exclusions,
      ...references(entry.requirement),
    ];
    for (const id of referencedIds)
      if (!byId.has(id))
        throw new Error(`${entry.id}: unknown reference ${id}`);
    if (!Number.isSafeInteger(entry.maxRank) || entry.maxRank < 1)
      throw new Error(`${entry.id}: invalid rank`);
    validateRequirement(entry.requirement, byId, specializations);
    const offeredSpecializations = new Set<string>();
    for (const choice of entry.specializationChoices ?? []) {
      if (
        !entry.specializations.includes(choice.id) ||
        choice.id === 'skip' ||
        offeredSpecializations.has(choice.id) ||
        !choice.name ||
        !Number.isSafeInteger(choice.triggerRank) ||
        choice.triggerRank < 1 ||
        choice.triggerRank > entry.maxRank ||
        !Number.isSafeInteger(choice.carcinisationBonus) ||
        choice.carcinisationBonus < 1 ||
        choice.carcinisationBonus > 10
      )
        throw new Error(
          `${entry.id}: invalid specialization choice ${choice.id}`,
        );
      offeredSpecializations.add(choice.id);
    }
    if (
      entry.selectable &&
      offeredSpecializations.size !== entry.specializations.length
    )
      throw new Error(
        `${entry.id}: specialization choices need implemented effects`,
      );
    if (entry.selectable || entry.disposition === 'implemented') {
      if (
        entry.disposition !== 'implemented' ||
        !entry.name ||
        !entry.description ||
        !handlers.has(entry.effect) ||
        !entry.rarities.length
      )
        throw new Error(`${entry.id}: unfinished selectable content`);
      for (const rarity of entry.rarities) {
        const values = entry.values[rarity];
        if (
          !values ||
          values.length !== entry.maxRank ||
          values.some((n) => !Number.isFinite(n))
        )
          throw new Error(`${entry.id}: invalid ${rarity} rank table`);
      }
    }
  }
  const byPool = new Map<ContentDefinition['pool'], ContentDefinition[]>();
  const excludedBy = new Map<string, Set<string>>();
  for (const entry of byId.values()) {
    if (entry.selectable) {
      const pool = byPool.get(entry.pool) ?? [];
      pool.push(entry);
      byPool.set(entry.pool, pool);
    }
    for (const excluded of entry.exclusions) {
      const blockers = excludedBy.get(excluded) ?? new Set<string>();
      blockers.add(entry.id);
      excludedBy.set(excluded, blockers);
    }
  }
  return {
    definition: (id: string) => {
      const entry = byId.get(id);
      return entry ? structuredClone(entry) : undefined;
    },
    describe: (id: string, rarity: string, rank: number) => {
      const entry = byId.get(id);
      if (
        !entry?.selectable ||
        !entry.rarities.includes(rarity) ||
        !Number.isSafeInteger(rank) ||
        rank < 1 ||
        rank > entry.maxRank
      )
        return undefined;
      const value = entry.values[rarity]?.[rank - 1];
      if (value === undefined) return undefined;
      return {
        id: entry.id,
        name: entry.name,
        rarity,
        rank,
        description: (entry.rankDescription ?? entry.description).replaceAll(
          '{value}',
          String(value),
        ),
      };
    },
    coverage: () =>
      [...byId.values()].map(({ id, disposition, selectable }) => ({
        id,
        disposition,
        selectable,
      })),
    publicContent: () =>
      [...byId.values()]
        .filter((entry) => entry.selectable)
        .map(({ id, name, description, pool, maxRank, rarities }) => ({
          id,
          name,
          description,
          pool,
          maxRank,
          rarities: [...rarities],
        })),
    eligible: (
      ranks: ReadonlyMap<string, number>,
      specializations: ReadonlySet<string>,
      pool: ContentDefinition['pool'],
      worldConditions: ReadonlySet<string> = new Set(),
    ) =>
      (byPool.get(pool) ?? [])
        .filter(
          (entry) =>
            (ranks.get(entry.id) ?? 0) < entry.maxRank &&
            !entry.exclusions.some((id) => (ranks.get(id) ?? 0) > 0) &&
            ![...(excludedBy.get(entry.id) ?? [])].some(
              (id) => (ranks.get(id) ?? 0) > 0,
            ) &&
            satisfied(
              entry.requirement,
              ranks,
              specializations,
              worldConditions,
            ),
        )
        .map((entry) => entry.id),
  };
}
