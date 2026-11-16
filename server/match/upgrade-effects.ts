import { SOURCE_GAMEPLAY } from '../content/source-gameplay.js';
import { SOURCE_ABILITIES } from '../content/source-balance.js';
import { sourceRank } from '../content/source-tuning.js';
import type { Ability } from './equipment.js';
import type { Stat, StatModifier } from './stats.js';

type UpgradeEffect =
  | { kind: 'stats'; stats: readonly Stat[] }
  | {
      kind: 'multi-stats';
      primary: Stat;
      details: readonly { name: string; stat: Stat; sign: 1 | -1 }[];
    }
  | { kind: 'slow-metabolism' }
  | { kind: 'saliva' }
  | { kind: 'forager' }
  | { kind: 'ruminant' }
  | { kind: 'terrain' }
  | { kind: 'tentacles' }
  | { kind: 'tail' }
  | { kind: 'hollow-bones' }
  | { kind: 'body-slam' }
  | { kind: 'claws' }
  | { kind: 'pincer' }
  | { kind: 'toe-beans' }
  | { kind: 'antlers' }
  | { kind: 'jaws' }
  | { kind: 'trunk' }
  | { kind: 'horns' }
  | { kind: 'beak' }
  | { kind: 'stoner' }
  | { kind: 'spit' }
  | { kind: 'projectile-tongue' }
  | { kind: 'leech' }
  | { kind: 'stinger' }
  | { kind: 'spur' }
  | { kind: 'slide' }
  | { kind: 'sprint' }
  | { kind: 'leap' }
  | { kind: 'scuttle' }
  | { kind: 'turtle-down' };

const effects: ReadonlyMap<string, UpgradeEffect> = new Map<
  string,
  UpgradeEffect
>([
  ['muscular-tissue', { kind: 'stats', stats: ['physical'] }],
  ['stomach', { kind: 'stats', stats: ['salvageSpeed'] }],
  ['slow-metabolism', { kind: 'slow-metabolism' }],
  ['saliva', { kind: 'saliva' }],
  ['forager', { kind: 'forager' }],
  ['ruminant', { kind: 'ruminant' }],
  ['cheek-pouch', { kind: 'ruminant' }],
  ['reach', { kind: 'stats', stats: ['attackArea'] }],
  ['herbivore', { kind: 'stats', stats: ['vegetationProgress'] }],
  ['carnivore', { kind: 'stats', stats: ['meatProgress'] }],
  ['piscivore', { kind: 'stats', stats: ['fishProgress'] }],
  [
    'omnivore',
    {
      kind: 'stats',
      stats: ['vegetationProgress', 'meatProgress', 'fishProgress'],
    },
  ],
  ['vegan', { kind: 'stats', stats: ['vegetationProgress'] }],
  ['scavenger', { kind: 'stats', stats: ['carrionProgress'] }],
  [
    'chonky',
    {
      kind: 'multi-stats',
      primary: 'size',
      details: [{ name: 'physical', stat: 'physical', sign: 1 }],
    },
  ],
  [
    'more-mass',
    {
      kind: 'multi-stats',
      primary: 'size',
      details: [
        { name: 'physical', stat: 'physical', sign: 1 },
        { name: 'health', stat: 'maximumHealth', sign: 1 },
      ],
    },
  ],
  [
    'elusive',
    {
      kind: 'multi-stats',
      primary: 'dodge',
      details: [{ name: 'size', stat: 'size', sign: -1 }],
    },
  ],
  [
    'smol',
    {
      kind: 'multi-stats',
      primary: 'speed',
      details: [{ name: 'size', stat: 'size', sign: -1 }],
    },
  ],
  [
    'agile',
    {
      kind: 'multi-stats',
      primary: 'dodge',
      details: [{ name: 'penalty', stat: 'attackPenalty', sign: -1 }],
    },
  ],
  [
    'dexterous',
    {
      kind: 'multi-stats',
      primary: 'ability',
      details: [{ name: 'cooldown', stat: 'cooldowns', sign: -1 }],
    },
  ],
  [
    'scales',
    {
      kind: 'multi-stats',
      primary: 'damageResistance',
      details: [{ name: 'heat', stat: 'heatAdaptation', sign: 1 }],
    },
  ],
  [
    'carapace',
    {
      kind: 'multi-stats',
      primary: 'damageResistance',
      details: [{ name: 'plating', stat: 'plating', sign: 1 }],
    },
  ],
  ['shell', { kind: 'stats', stats: ['damageResistance'] }],
  ['robust', { kind: 'stats', stats: ['robust'] }],
  ['overwhelm', { kind: 'stats', stats: ['platingHitFactor'] }],
  ['plated', { kind: 'stats', stats: ['plating'] }],
  ['spines', { kind: 'stats', stats: ['spines'] }],
  ['shifty', { kind: 'stats', stats: ['shifty'] }],
  ['impervious', { kind: 'stats', stats: ['maximumHealth'] }],
  ['regenerative-tissue', { kind: 'stats', stats: ['regeneration'] }],
  ['immune-system', { kind: 'stats', stats: ['poisonResistance'] }],
  ['fibroblasts', { kind: 'stats', stats: [] }],
  ['turtle-down', { kind: 'turtle-down' }],
  [
    'exoskeleton',
    {
      kind: 'multi-stats',
      primary: 'plating',
      details: [{ name: 'social', stat: 'social', sign: 1 }],
    },
  ],
  [
    'arms',
    {
      kind: 'multi-stats',
      primary: 'ability',
      details: [
        { name: 'physical', stat: 'physical', sign: 1 },
        { name: 'reach', stat: 'salvageReach', sign: 1 },
      ],
    },
  ],
  ['tentacles', { kind: 'tentacles' }],
  ['legs', { kind: 'stats', stats: ['speed'] }],
  ['more-legs', { kind: 'stats', stats: ['speed'] }],
  ['tail', { kind: 'tail' }],
  ['tail-wag', { kind: 'stats', stats: [] }],
  ['prehensile-tail', { kind: 'stats', stats: ['salvageReach'] }],
  ['fin', { kind: 'stats', stats: ['waterAdaptation'] }],
  ['hollow-bones', { kind: 'hollow-bones' }],
  ['slithery', { kind: 'terrain' }],
  ['wings', { kind: 'terrain' }],
  ['body-slam', { kind: 'body-slam' }],
  ['claws', { kind: 'claws' }],
  ['pincer', { kind: 'pincer' }],
  ['toe-beans', { kind: 'toe-beans' }],
  ['antlers', { kind: 'antlers' }],
  ['jaws', { kind: 'jaws' }],
  ['trunk', { kind: 'trunk' }],
  ['horns', { kind: 'horns' }],
  ['beak', { kind: 'beak' }],
  ['stoner', { kind: 'stoner' }],
  ...(
    [
      'spit',
      'projectile-tongue',
      'leech',
      'stinger',
      'spur',
      'slide',
      'sprint',
      'leap',
      'scuttle',
    ] as const
  ).map((kind) => [kind, { kind }] as const),
]);
export const upgradeEffectIds: ReadonlySet<string> = new Set(effects.keys());

export function upgradeEffect(
  id: string,
  effectId: string,
  rarity: string,
  rank: number,
  value: number,
  details: Readonly<Record<string, number>> = {},
): { modifiers: StatModifier[]; ability: Ability | null } | null {
  const effect = baseUpgradeEffect(id, effectId, rarity, rank, value, details);
  const tuning = SOURCE_ABILITIES[id];
  if (!effect?.ability || !tuning) return effect;
  const cooldown = sourceRank(tuning.cooldownMs, rarity, rank);
  if (cooldown !== undefined) effect.ability.cooldown = cooldown;
  if (tuning.recoveryMs !== undefined)
    effect.ability.recoveryMs = tuning.recoveryMs;
  const ranges = tuning.damageRanges?.[rarity];
  const range = ranges?.[Math.min(rank, ranges.length) - 1];
  if (range) effect.ability.damageRange = { ...range };
  return effect;
}

function baseUpgradeEffect(
  id: string,
  effectId: string,
  rarity: string,
  rank: number,
  value: number,
  details: Readonly<Record<string, number>> = {},
): { modifiers: StatModifier[]; ability: Ability | null } | null {
  const effect = effects.get(effectId);
  if (!effect) return null;
  const modifier = (stat: Stat, add: number): StatModifier => ({
    id: `starter:${id}`,
    stat,
    add,
    multiplier: 1,
  });
  switch (effect.kind) {
    case 'multi-stats': {
      const modifiers = [modifier(effect.primary, value)];
      for (const detail of effect.details) {
        const amount = details[detail.name];
        if (amount === undefined) return null;
        modifiers.push(modifier(detail.stat, amount * detail.sign));
      }
      return { modifiers, ability: null };
    }
    case 'slow-metabolism':
      if (details.speed === undefined) return null;
      return {
        modifiers: [
          { ...modifier('speed', 0), multiplier: 1 - details.speed / 100 },
          modifier('progressRequirement', -value),
        ],
        ability: null,
      };
    case 'saliva':
      if (details.regeneration === undefined) return null;
      return {
        modifiers: [
          modifier('salvageSpeed', value),
          modifier('regeneration', details.regeneration),
        ],
        ability: null,
      };
    case 'forager':
      if (details.resistance === undefined) return null;
      return {
        modifiers: [
          modifier('repairFoodChance', value),
          modifier('poisonResistance', details.resistance),
        ],
        ability: null,
      };
    case 'ruminant':
      return { modifiers: [], ability: null };
    case 'stats':
      return {
        modifiers: effect.stats.map((stat) => modifier(stat, value)),
        ability: null,
      };
    case 'terrain':
      if (details.adaptation === undefined) return null;
      return {
        modifiers: [
          modifier('speed', value),
          modifier('terrainAdaptation', details.adaptation),
        ],
        ability: null,
      };
    case 'tentacles':
      if (details.ability === undefined) return null;
      return {
        modifiers: [
          modifier('speed', value),
          modifier('ability', details.ability),
        ],
        ability: null,
      };
    case 'tail': {
      const amount = details.social;
      return amount === undefined
        ? null
        : {
            modifiers: [modifier('ability', value), modifier('social', amount)],
            ability: null,
          };
    }
    case 'hollow-bones':
      if (details.resistanceCost === undefined) return null;
      return {
        modifiers: [
          modifier('speed', value),
          modifier('damageResistance', -details.resistanceCost),
        ],
        ability: null,
      };
    case 'body-slam': {
      const physicalScale = details.physical;
      if (physicalScale === undefined) return null;
      return {
        modifiers: [],
        ability: {
          id,
          slotType: 'attack',
          action: 'body-slam',
          cooldown: 1250,
          damage: physicalScale,
          healthScale: value / 100,
        },
      };
    }
    case 'claws':
      if (details.cooldown === undefined) return null;
      return {
        modifiers: [],
        ability: {
          id,
          slotType: 'attack',
          action: 'physical-strike',
          cooldown: details.cooldown * 1000,
          damage: value,
        },
      };
    case 'pincer':
      return {
        modifiers: [],
        ability: {
          id,
          slotType: 'attack',
          action: 'ability-strike',
          cooldown: 800,
          damage: value,
          hits: 2,
        },
      };
    case 'toe-beans':
      if (details.charm === undefined) return null;
      return {
        modifiers: [],
        ability: {
          id,
          slotType: 'attack',
          action: 'social-strike',
          cooldown: 1500,
          damage: value,
          charmMultiplier: details.charm,
        },
      };
    case 'antlers':
      if (details.selfDamage === undefined) return null;
      return {
        modifiers: [],
        ability: {
          id,
          slotType: 'attack',
          action: 'physical-strike',
          cooldown: 1250,
          damage: value,
          selfDamageFraction: details.selfDamage / 100,
        },
      };
    case 'jaws':
      if (details.salvageSpeed === undefined) return null;
      return {
        modifiers: [modifier('salvageSpeed', details.salvageSpeed)],
        ability: {
          id,
          slotType: 'attack',
          action: 'physical-strike',
          cooldown: 800,
          damage: value,
        },
      };
    case 'trunk':
      if (details.salvageReach === undefined) return null;
      return {
        modifiers: [modifier('salvageReach', details.salvageReach)],
        ability: {
          id,
          slotType: 'attack',
          action: 'hybrid-strike',
          cooldown: 1500,
          damage: value,
          range: 2,
        },
      };
    case 'horns':
      return {
        modifiers: [],
        ability: {
          id,
          slotType: 'attack',
          action: 'physical-strike',
          cooldown: SOURCE_GAMEPLAY.horns.cooldownMs,
          recoveryMs: 300,
          damage: value,
          bypassPlating: true,
        },
      };
    case 'beak':
      if (details.salvageSpeed === undefined) return null;
      return {
        modifiers: [modifier('salvageSpeed', details.salvageSpeed)],
        ability: {
          id,
          slotType: 'attack',
          action: 'ability-strike',
          cooldown: 1000,
          damage: value,
          range: 4,
        },
      };
    case 'spit':
      if (details.range === undefined) return null;
      return {
        modifiers: [],
        ability: {
          id,
          slotType: 'attack',
          action: 'projectile',
          cooldown: 1500,
          damage: value,
          damageBasis: 'ability',
          range: details.range,
        },
      };
    case 'projectile-tongue':
      if (details.cooldown === undefined) return null;
      return {
        modifiers: [],
        ability: {
          id,
          slotType: 'attack',
          action: 'projectile',
          cooldown: details.cooldown * 1000,
          damage: value,
          damageBasis: 'physical',
          range: details.range ?? 12,
          rootDuringFlight: true,
        },
      };
    case 'leech':
      return {
        modifiers: [],
        ability: {
          id,
          slotType: 'attack',
          action: 'ability-strike',
          cooldown: 1500,
          damage: value,
        },
      };
    case 'stinger':
      return {
        modifiers: [],
        ability: {
          id,
          slotType: 'attack',
          action: 'physical-strike',
          cooldown: 3000,
          damage: value,
        },
      };
    case 'spur':
      return {
        modifiers: [],
        ability: {
          id,
          slotType: 'attack',
          action: 'physical-strike',
          cooldown: 2000,
          damage: value,
        },
      };
    case 'slide':
      if (details.distance === undefined || details.duration === undefined)
        return null;
      return {
        modifiers: [],
        ability: {
          id,
          slotType: 'movement',
          action: 'dash',
          cooldown: value * 1000,
          damage: 0,
          distance: details.distance,
          durationMs: details.duration * 1000,
        },
      };
    case 'sprint':
      if (details.duration === undefined || details.cooldown === undefined)
        return null;
      return {
        modifiers: [],
        ability: {
          id,
          slotType: 'movement',
          action: 'speed-boost',
          cooldown: details.cooldown * 1000,
          damage: 0,
          durationMs: details.duration * 1000,
          speedMultiplier: 1 + value / 100,
        },
      };
    case 'leap':
      return {
        modifiers: [],
        ability: {
          id,
          slotType: 'movement',
          action: 'dash',
          cooldown: value * 1000,
          damage: 0,
          distance: 6.5,
          durationMs: 400,
          invulnerabilityMs: 400,
        },
      };
    case 'scuttle':
      return {
        modifiers: [],
        ability: {
          id,
          slotType: 'movement',
          action: 'dash',
          cooldown: value * 1000,
          damage: 0,
          distance: details.distance ?? 3.5,
          durationMs: (details.duration ?? 0.2) * 1000,
        },
      };
    case 'turtle-down':
      return {
        modifiers: [],
        ability: {
          id,
          slotType: 'movement',
          action: 'guard',
          cooldown: value * 1000,
          damage: 0,
          durationMs: (details.duration ?? 0.75) * 1000,
          stunMs: (details.stun ?? 1.5) * 1000,
        },
      };
    case 'stoner':
      if (details.chargedDamage === undefined) return null;
      return {
        modifiers: [
          modifier('physical', details.statBonus ?? 0),
          modifier('ability', details.statBonus ?? 0),
        ],
        ability: {
          id,
          slotType: 'attack',
          action: 'projectile',
          cooldown: 800,
          damage: value,
          chargedDamage: details.chargedDamage,
          chargeMs: (details.chargeSeconds ?? 1.2) * 1000,
          damageBasis: 'hybrid',
          ammunition: { capacity: details.ammo ?? rank + 1, reloadMs: 3000 },
        },
      };
  }
}
