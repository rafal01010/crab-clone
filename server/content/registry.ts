import { BASE_STATS, type Stat } from '../match/stats.js';
import type { UpgradeIcon } from '../../shared/match.js';
import {
  validRuntimeEffect,
  type RuntimeEffectDefinition,
} from '../match/runtime-effects.js';

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
  icon?: UpgradeIcon;
  description: string;
  rankDescription?: string;
  pool: 'ordinary' | 'branching' | 'starting' | 'finale';
  maxRank: number;
  repeatable?: 'linear' | 'cumulative';
  rarities: readonly string[];
  values: Readonly<Record<string, readonly number[]>>;
  detailValues?: Readonly<
    Record<string, Readonly<Record<string, readonly number[]>>>
  >;
  requirement: Requirement;
  exclusions: readonly string[];
  rankExclusions?: readonly { id: string; minimum: number }[];
  rankBlocks?: readonly {
    id: string;
    minimum: number;
    fromRank: number;
    throughRank?: number;
  }[];
  affinities: readonly string[];
  effect: string;
  specializations: readonly string[];
  specializationChoices?: readonly {
    id: string;
    name: string;
    triggerRank: number;
    carcinisationBonus: number;
    requiresUnowned?: readonly string[];
    visual?: { attachment: 'crest' | 'fins'; visibility: 'owner' | 'public' };
    effect?:
      | {
          kind: 'stats';
          changes: readonly { stat: Stat; add: number; multiplier: number }[];
        }
      | {
          kind: 'grant-upgrade';
          id: string;
          rarity: string;
          changes: readonly { stat: Stat; add: number; multiplier: number }[];
        }
      | {
          kind: 'near-obstacle-speed';
          range: number;
          bonusPerObstacle: number;
          maxBonus: number;
          decayPerSecond: number;
        }
      | { kind: 'ability-damage'; abilityId: string; multiplier: number }
      | { kind: 'lateral-dash'; abilityId: string; cooldownMultiplier: number }
      | {
          kind: 'ability-feature';
          feature:
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
            | 'spinnerets-egg-sac';
        }
      | RuntimeEffectDefinition;
  }[];
}

export function contentRankValue(
  entry: ContentDefinition,
  rarity: string,
  rank: number,
): number | undefined {
  const values = entry.values[rarity];
  if (!values?.length || !Number.isSafeInteger(rank) || rank < 1)
    return undefined;
  if (entry.repeatable === 'linear')
    return Math.min(1_000_000, (values[0] ?? 0) * rank);
  if (entry.repeatable === 'cumulative')
    return Math.min(
      1_000_000,
      values.slice(0, rank).reduce((sum, value) => sum + value, 0) +
        Math.max(0, rank - values.length) * (values.at(-1) ?? 0),
    );
  return values[rank - 1];
}

export function formatUpgradeNumber(value: number): string {
  return String(Number(value.toFixed(2)));
}

export type BuildStep = {
  id: string;
  rank: number;
  specialization: string | null;
};
export type BuildPath =
  | { kind: 'reachable'; steps: BuildStep[] }
  | { kind: 'hypothetical'; steps: BuildStep[] }
  | { kind: 'unreachable' }
  | { kind: 'limit'; explored: number }
  | { kind: 'invalid' };

export function createRegistry(
  definitions: readonly ContentDefinition[],
  handlers: ReadonlySet<string>,
  completeRelease = false,
) {
  const byId = new Map<string, ContentDefinition>();
  const names = new Set<string>();
  const aliases = new Map<string, string>();
  const specializations = new Map<string, string>();
  for (const entry of definitions) {
    if (!entry.id || byId.has(entry.id))
      throw new Error(`Duplicate or empty content id: ${entry.id}`);
    for (const name of [entry.id, ...entry.aliases]) {
      const key = name.toLowerCase();
      if (!key || names.has(key))
        throw new Error(`Conflicting content alias: ${name}`);
      names.add(key);
      aliases.set(key, entry.id);
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
    for (const exclusion of entry.rankExclusions ?? []) {
      const other = byId.get(exclusion.id);
      if (
        !other ||
        !Number.isSafeInteger(exclusion.minimum) ||
        exclusion.minimum < 1 ||
        exclusion.minimum > other.maxRank
      )
        throw new Error(`${entry.id}: invalid rank exclusion ${exclusion.id}`);
    }
    for (const block of entry.rankBlocks ?? []) {
      const other = byId.get(block.id);
      if (
        !other ||
        !Number.isSafeInteger(block.minimum) ||
        block.minimum < 1 ||
        block.minimum > other.maxRank ||
        !Number.isSafeInteger(block.fromRank) ||
        block.fromRank < 1 ||
        block.fromRank > entry.maxRank ||
        (block.throughRank !== undefined &&
          (!Number.isSafeInteger(block.throughRank) ||
            block.throughRank < block.fromRank ||
            block.throughRank > entry.maxRank))
      )
        throw new Error(`${entry.id}: invalid rank block ${block.id}`);
    }
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
        choice.carcinisationBonus < 0 ||
        choice.carcinisationBonus > 10 ||
        (choice.visual !== undefined &&
          (!['crest', 'fins'].includes(choice.visual.attachment) ||
            !['owner', 'public'].includes(choice.visual.visibility)))
      )
        throw new Error(
          `${entry.id}: invalid specialization choice ${choice.id}`,
        );
      offeredSpecializations.add(choice.id);
      if (choice.requiresUnowned?.some((id) => !byId.has(id)))
        throw new Error(`${entry.id}: unknown specialization exclusion`);
      if (entry.selectable) {
        const effect = choice.effect;
        const valid =
          effect?.kind === 'stats' || effect?.kind === 'grant-upgrade'
            ? effect.changes.length > 0 &&
              (effect.kind !== 'grant-upgrade' ||
                (effect.id !== entry.id &&
                  !!byId.get(effect.id)?.selectable &&
                  !!byId.get(effect.id)?.rarities.includes(effect.rarity))) &&
              new Set(effect.changes.map((change) => change.stat)).size ===
                effect.changes.length &&
              effect.changes.every(
                (change) =>
                  Object.hasOwn(BASE_STATS, change.stat) &&
                  Number.isFinite(change.add) &&
                  Number.isFinite(change.multiplier) &&
                  change.multiplier >= 0 &&
                  (change.add !== 0 || change.multiplier !== 1),
              )
            : effect?.kind === 'near-obstacle-speed'
              ? Number.isFinite(effect.range) &&
                effect.range > 0 &&
                effect.range <= 100 &&
                Number.isFinite(effect.bonusPerObstacle) &&
                effect.bonusPerObstacle > 0 &&
                Number.isFinite(effect.maxBonus) &&
                effect.maxBonus > 0 &&
                effect.maxBonus <= 10 &&
                Number.isFinite(effect.decayPerSecond) &&
                effect.decayPerSecond > 0
              : effect?.kind === 'ability-damage'
                ? !!byId.get(effect.abilityId) &&
                  Number.isFinite(effect.multiplier) &&
                  effect.multiplier > 0 &&
                  effect.multiplier <= 10
                : effect?.kind === 'lateral-dash'
                  ? !!byId.get(effect.abilityId) &&
                    Number.isFinite(effect.cooldownMultiplier) &&
                    effect.cooldownMultiplier > 0 &&
                    effect.cooldownMultiplier <= 1
                  : effect?.kind === 'ability-feature'
                    ? effect.feature === choice.id
                    : effect
                      ? validRuntimeEffect({ ...effect, id: choice.id })
                      : choice.carcinisationBonus > 0;
        if (!valid)
          throw new Error(
            `${entry.id}: specialization ${choice.id} needs an implemented effect`,
          );
      }
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
          (entry.repeatable
            ? values.length === 0
            : values.length !== entry.maxRank) ||
          values.some((n) => !Number.isFinite(n))
        )
          throw new Error(`${entry.id}: invalid ${rarity} rank table`);
        for (const [name, tables] of Object.entries(entry.detailValues ?? {})) {
          const details = tables[rarity];
          if (
            !/^[a-zA-Z][a-zA-Z0-9]*$/.test(name) ||
            name === 'value' ||
            !details ||
            details.length !== entry.maxRank ||
            details.some((value) => !Number.isFinite(value))
          )
            throw new Error(
              `${entry.id}: invalid ${name} ${rarity} rank table`,
            );
        }
      }
    }
  }
  const byPool = new Map<ContentDefinition['pool'], ContentDefinition[]>();
  const excludedBy = new Map<string, Set<string>>();
  for (const entry of byId.values()) {
    if (entry.disposition !== 'omitted') {
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
  const eligible = (
    ranks: ReadonlyMap<string, number>,
    ownedSpecializations: ReadonlySet<string>,
    pool: ContentDefinition['pool'],
    worldConditions: ReadonlySet<string> = new Set(),
    includeBlocked = false,
  ) =>
    (byPool.get(pool) ?? [])
      .filter(
        (entry) =>
          (entry.selectable ||
            (includeBlocked && entry.disposition === 'blocked')) &&
          (ranks.get(entry.id) ?? 0) < entry.maxRank &&
          !entry.exclusions.some((id) => (ranks.get(id) ?? 0) > 0) &&
          ![...(excludedBy.get(entry.id) ?? [])].some(
            (id) => (ranks.get(id) ?? 0) > 0,
          ) &&
          !(entry.rankExclusions ?? []).some(
            ({ id, minimum }) => (ranks.get(id) ?? 0) >= minimum,
          ) &&
          !(entry.rankBlocks ?? []).some(
            ({ id, minimum, fromRank, throughRank }) => {
              const nextRank = (ranks.get(entry.id) ?? 0) + 1;
              return (
                (ranks.get(id) ?? 0) >= minimum &&
                nextRank >= fromRank &&
                nextRank <= (throughRank ?? entry.maxRank)
              );
            },
          ) &&
          ![...byId.values()].some(
            (other) =>
              (ranks.get(other.id) ?? 0) > 0 &&
              (other.rankExclusions ?? []).some(
                ({ id, minimum }) =>
                  id === entry.id && (ranks.get(entry.id) ?? 0) + 1 >= minimum,
              ),
          ) &&
          satisfied(
            entry.requirement,
            ranks,
            ownedSpecializations,
            worldConditions,
          ),
      )
      .map((entry) => entry.id);
  const choiceAvailable = (
    choice: NonNullable<ContentDefinition['specializationChoices']>[number],
    ranks: ReadonlyMap<string, number>,
    owned: ReadonlySet<string>,
    worldConditions: ReadonlySet<string>,
    includeBlocked: boolean,
  ): boolean => {
    if (!(choice.effect || choice.carcinisationBonus > 0 || includeBlocked))
      return false;
    if (choice.requiresUnowned?.some((id) => (ranks.get(id) ?? 0) > 0))
      return false;
    if (choice.effect?.kind === 'grant-upgrade') {
      const granted = byId.get(choice.effect.id);
      return (
        !!granted &&
        (ranks.get(granted.id) ?? 0) === 0 &&
        eligible(
          ranks,
          owned,
          granted.pool,
          worldConditions,
          includeBlocked,
        ).includes(granted.id)
      );
    }
    return true;
  };
  return {
    definition: (id: string) => {
      const entry = byId.get(aliases.get(id.toLowerCase()) ?? id);
      return entry ? structuredClone(entry) : undefined;
    },
    specializationName: (id: string) =>
      byId
        .get(specializations.get(id) ?? '')
        ?.specializationChoices?.find((choice) => choice.id === id)?.name,
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
      const value = contentRankValue(entry, rarity, rank);
      if (value === undefined) return undefined;
      let description = (entry.rankDescription ?? entry.description).replaceAll(
        '{value}',
        formatUpgradeNumber(value),
      );
      for (const [name, tables] of Object.entries(entry.detailValues ?? {})) {
        const detail = tables[rarity]?.[rank - 1];
        if (detail === undefined) return undefined;
        description = description.replaceAll(
          `{${name}}`,
          formatUpgradeNumber(detail),
        );
      }
      return {
        id: entry.id,
        name: entry.name,
        icon: entry.icon,
        rarity,
        rank,
        description,
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
      owned: ReadonlySet<string>,
      pool: ContentDefinition['pool'],
      worldConditions?: ReadonlySet<string>,
    ) => eligible(ranks, owned, pool, worldConditions),
    findBuildPath: (
      targetId: string,
      targetRank: number,
      worldConditions: ReadonlySet<string> = new Set(),
      maxStates = 50_000,
      includeBlocked = false,
      initialSteps: readonly BuildStep[] = [],
    ): BuildPath => {
      const target = byId.get(targetId);
      if (
        !target ||
        (!target.selectable &&
          !(includeBlocked && target.disposition === 'blocked')) ||
        !Number.isSafeInteger(targetRank) ||
        targetRank < 1 ||
        targetRank > target.maxRank ||
        !Number.isSafeInteger(maxStates) ||
        maxStates < 1 ||
        maxStates > 100_000 ||
        initialSteps.length > maxStates
      )
        return { kind: 'invalid' };
      type State = {
        ranks: Map<string, number>;
        specializations: Set<string>;
        parent: State | null;
        step: BuildStep | null;
      };
      const initialRanks = new Map<string, number>();
      const initialSpecializations = new Set<string>();
      for (const step of initialSteps) {
        const entry = byId.get(step.id);
        if (
          !entry ||
          step.rank !== (initialRanks.get(step.id) ?? 0) + 1 ||
          !eligible(
            initialRanks,
            initialSpecializations,
            entry.pool,
            worldConditions,
            includeBlocked,
          ).includes(step.id)
        )
          return { kind: 'invalid' };
        initialRanks.set(step.id, step.rank);
        if (step.specialization !== null) {
          if (
            entry.specializations.some((id) =>
              initialSpecializations.has(id),
            ) ||
            !(entry.specializationChoices ?? []).some(
              (choice) =>
                choice.id === step.specialization &&
                choice.triggerRank === step.rank &&
                choiceAvailable(
                  choice,
                  initialRanks,
                  initialSpecializations,
                  worldConditions,
                  includeBlocked,
                ),
            )
          )
            return { kind: 'invalid' };
          initialSpecializations.add(step.specialization);
          const chosen = entry.specializationChoices?.find(
            (choice) => choice.id === step.specialization,
          );
          if (chosen?.effect?.kind === 'grant-upgrade')
            initialRanks.set(chosen.effect.id, 1);
        }
      }
      if (targetRank - (initialRanks.get(targetId) ?? 0) >= maxStates)
        return { kind: 'limit', explored: 0 };
      const pending: State[] = [
        {
          ranks: initialRanks,
          specializations: initialSpecializations,
          parent: null,
          step: null,
        },
      ];
      const seen = new Set<string>();
      const needed = new Set<string>();
      const addRequirements = (requirement: Requirement): void => {
        if (requirement.kind === 'rank') addEntry(requirement.id);
        else if (requirement.kind === 'specialization') {
          const parent = specializations.get(requirement.id);
          if (parent) addEntry(parent);
        } else if (requirement.kind === 'all' || requirement.kind === 'any')
          for (const condition of requirement.conditions)
            addRequirements(condition);
      };
      const addEntry = (id: string): void => {
        if (needed.has(id)) return;
        needed.add(id);
        const definition = byId.get(id);
        if (definition) addRequirements(definition.requirement);
      };
      addEntry(targetId);
      for (let index = 0; index < pending.length; index++) {
        if (index >= maxStates) return { kind: 'limit', explored: index };
        const state = pending[index];
        if (!state) continue;
        if ((state.ranks.get(targetId) ?? 0) >= targetRank) {
          const added: BuildStep[] = [];
          for (
            let current: State | null = state;
            current;
            current = current.parent
          )
            if (current.step) added.push(current.step);
          const steps = [
            ...initialSteps.map((step) => ({ ...step })),
            ...added.reverse(),
          ];
          return {
            kind: steps.some((step) => !byId.get(step.id)?.selectable)
              ? 'hypothetical'
              : 'reachable',
            steps,
          };
        }
        const candidates = (['ordinary', 'branching', 'finale'] as const)
          .flatMap((pool) =>
            eligible(
              state.ranks,
              state.specializations,
              pool,
              worldConditions,
              includeBlocked,
            ),
          )
          .filter((id) => needed.has(id));
        for (const id of candidates) {
          const entry = byId.get(id);
          if (!entry) continue;
          const rank = (state.ranks.get(id) ?? 0) + 1;
          const choices = entry.specializations.some((specialization) =>
            state.specializations.has(specialization),
          )
            ? []
            : (entry.specializationChoices ?? []).filter(
                (choice) =>
                  choice.triggerRank === rank &&
                  choiceAvailable(
                    choice,
                    state.ranks,
                    state.specializations,
                    worldConditions,
                    includeBlocked,
                  ),
              );
          for (const choice of [null, ...choices.map((item) => item.id)]) {
            const ranks = new Map(state.ranks);
            ranks.set(id, rank);
            const owned = new Set(state.specializations);
            if (choice) owned.add(choice);
            const selected = entry.specializationChoices?.find(
              (item) => item.id === choice,
            );
            if (selected?.effect?.kind === 'grant-upgrade')
              ranks.set(selected.effect.id, 1);
            const key = JSON.stringify([
              [...ranks].sort(([a], [b]) => a.localeCompare(b)),
              [...owned].sort(),
            ]);
            if (seen.has(key)) continue;
            if (seen.size >= maxStates)
              return { kind: 'limit', explored: index + 1 };
            seen.add(key);
            pending.push({
              ranks,
              specializations: owned,
              parent: state,
              step: { id, rank, specialization: choice },
            });
          }
        }
      }
      return { kind: 'unreachable' };
    },
  };
}
