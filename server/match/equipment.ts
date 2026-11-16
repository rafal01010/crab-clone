import { validFieldStatus, type FieldStatus } from './field-status.js';
import { SOURCE_ACTIONS } from '../content/source-balance.js';

export type AbilitySlot = 'primary' | 'secondary' | 'movement' | 'ultimate';
export type Ability = {
  id: string;
  slotType: 'attack' | 'movement' | 'ultimate';
  cooldown: number;
  damage: number;
  recoveryMs?: number;
  damageRange?: { x: number; y: number };
} & (
  | {
      action:
        | 'strike'
        | 'physical-strike'
        | 'ability-strike'
        | 'social-strike'
        | 'hybrid-strike'
        | 'body-slam';
      healthScale?: number;
      bypassPlating?: boolean;
      hits?: number;
      range?: number;
      charmMultiplier?: number;
      selfDamageFraction?: number;
    }
  | {
      action: 'projectile';
      healthScale?: number;
      bypassPlating?: boolean;
      rootDuringFlight?: boolean;
      ammunition?: { capacity: number; reloadMs: number };
      damageBasis?: 'hybrid' | 'physical' | 'ability';
      range?: number;
      chargedDamage?: number;
      chargeMs?: number;
    }
  | {
      action: 'dash';
      healthScale?: number;
      bypassPlating?: boolean;
      invulnerabilityMs?: number;
      distance?: number;
      durationMs?: number;
    }
  | { action: 'charge'; bypassPlating: boolean }
  | { action: 'guard'; durationMs: number; stunMs: number }
  | { action: 'repair'; repairAmount: number; scalesWithSalvageSpeed?: boolean }
  | { action: 'speed-boost'; durationMs: number; speedMultiplier: number }
  | {
      action: 'slow-field';
      radius: number;
      slowPercent: number;
      durationMs: number;
      status?: FieldStatus;
    }
  | {
      action: 'delayed-boost';
      stunMs: number;
      durationMs: number;
      physicalPerPoint: number;
      abilityPerPoint: number;
    }
  | {
      action: 'area-status';
      radius: number;
      status: 'corrosion' | 'slow' | 'stun';
      magnitude: number;
      durationMs: number;
    }
  | {
      action: 'stationary-channel';
      radius: number;
      durationMs: number;
      intervalMs: number;
      stunMs: number;
    }
);
export function validAbility(ability: Ability): boolean {
  return (
    !!ability.id &&
    ability.id.length <= 128 &&
    ['attack', 'movement', 'ultimate'].includes(ability.slotType) &&
    [
      'strike',
      'physical-strike',
      'ability-strike',
      'social-strike',
      'hybrid-strike',
      'projectile',
      'dash',
      'charge',
      'body-slam',
      'guard',
      'repair',
      'speed-boost',
      'slow-field',
      'delayed-boost',
      'area-status',
      'stationary-channel',
    ].includes(ability.action) &&
    Number.isFinite(ability.cooldown) &&
    ability.cooldown >= 0 &&
    Number.isFinite(ability.damage) &&
    ability.damage >= 0 &&
    (ability.damageRange === undefined ||
      (Number.isFinite(ability.damageRange.x) &&
        Number.isFinite(ability.damageRange.y) &&
        ability.damageRange.x >= 0 &&
        ability.damageRange.y >= ability.damageRange.x)) &&
    (ability.recoveryMs === undefined ||
      (Number.isFinite(ability.recoveryMs) &&
        ability.recoveryMs >= 0 &&
        ability.recoveryMs <= 2000)) &&
    (!('hits' in ability) ||
      ability.hits === undefined ||
      (Number.isSafeInteger(ability.hits) &&
        ability.hits >= 1 &&
        ability.hits <= 2)) &&
    (!('range' in ability) ||
      ability.range === undefined ||
      (Number.isFinite(ability.range) &&
        ability.range > 0 &&
        ability.range <= 20)) &&
    (!('charmMultiplier' in ability) ||
      ability.charmMultiplier === undefined ||
      (Number.isFinite(ability.charmMultiplier) &&
        ability.charmMultiplier > 0 &&
        ability.charmMultiplier <= 10)) &&
    (!('selfDamageFraction' in ability) ||
      ability.selfDamageFraction === undefined ||
      (Number.isFinite(ability.selfDamageFraction) &&
        ability.selfDamageFraction > 0 &&
        ability.selfDamageFraction <= 1)) &&
    (ability.action === 'guard' ||
      ability.action === 'repair' ||
      ability.action === 'speed-boost' ||
      ability.action === 'slow-field' ||
      ability.action === 'delayed-boost' ||
      ability.action === 'area-status' ||
      ability.action === 'stationary-channel' ||
      ability.action === 'charge' ||
      ability.healthScale === undefined ||
      (Number.isFinite(ability.healthScale) && ability.healthScale >= 0)) &&
    (ability.action === 'guard' ||
      ability.action === 'repair' ||
      ability.action === 'speed-boost' ||
      ability.action === 'slow-field' ||
      ability.action === 'delayed-boost' ||
      ability.action === 'area-status' ||
      ability.action === 'stationary-channel' ||
      ability.bypassPlating === undefined ||
      typeof ability.bypassPlating === 'boolean') &&
    (ability.action !== 'guard' ||
      (Number.isFinite(ability.durationMs) &&
        ability.durationMs > 0 &&
        ability.durationMs <= 300000 &&
        Number.isFinite(ability.stunMs) &&
        ability.stunMs >= 0 &&
        ability.stunMs <= 300000)) &&
    (ability.action !== 'projectile' ||
      ability.rootDuringFlight === undefined ||
      typeof ability.rootDuringFlight === 'boolean') &&
    (ability.action !== 'projectile' ||
      (ability.chargedDamage === undefined && ability.chargeMs === undefined) ||
      (ability.chargedDamage !== undefined &&
        ability.chargeMs !== undefined &&
        Number.isFinite(ability.chargedDamage) &&
        ability.chargedDamage >= ability.damage &&
        Number.isFinite(ability.chargeMs) &&
        ability.chargeMs > 0 &&
        ability.chargeMs <= 10000)) &&
    (ability.action !== 'projectile' ||
      ability.ammunition === undefined ||
      (Number.isSafeInteger(ability.ammunition.capacity) &&
        ability.ammunition.capacity > 0 &&
        ability.ammunition.capacity <= 1000 &&
        Number.isFinite(ability.ammunition.reloadMs) &&
        ability.ammunition.reloadMs >= 250 &&
        ability.ammunition.reloadMs <= 300_000)) &&
    (ability.action !== 'dash' ||
      ((ability.distance === undefined ||
        (Number.isFinite(ability.distance) &&
          ability.distance > 0 &&
          ability.distance <= 100)) &&
        (ability.durationMs === undefined ||
          (Number.isFinite(ability.durationMs) &&
            ability.durationMs > 0 &&
            ability.durationMs <= 10000)))) &&
    (ability.action !== 'dash' ||
      ability.invulnerabilityMs === undefined ||
      (Number.isFinite(ability.invulnerabilityMs) &&
        ability.invulnerabilityMs >= 0 &&
        ability.invulnerabilityMs <= 300_000)) &&
    (ability.action !== 'repair' ||
      (Number.isFinite(ability.repairAmount) &&
        ability.repairAmount > 0 &&
        ability.repairAmount <= 1_000_000 &&
        (ability.scalesWithSalvageSpeed === undefined ||
          typeof ability.scalesWithSalvageSpeed === 'boolean'))) &&
    (ability.action !== 'speed-boost' ||
      (Number.isFinite(ability.durationMs) &&
        ability.durationMs > 0 &&
        ability.durationMs <= 300_000 &&
        Number.isFinite(ability.speedMultiplier) &&
        ability.speedMultiplier > 1 &&
        ability.speedMultiplier <= 10)) &&
    (ability.action !== 'slow-field' ||
      (Number.isFinite(ability.radius) &&
        ability.radius > 0 &&
        ability.radius <= 20 &&
        Number.isFinite(ability.slowPercent) &&
        ability.slowPercent > 0 &&
        ability.slowPercent <= 100 &&
        Number.isFinite(ability.durationMs) &&
        ability.durationMs > 0 &&
        ability.durationMs <= 300_000 &&
        (ability.status === undefined || validFieldStatus(ability.status)))) &&
    (ability.action !== 'delayed-boost' ||
      (Number.isFinite(ability.stunMs) &&
        ability.stunMs > 0 &&
        ability.stunMs <= 300_000 &&
        Number.isFinite(ability.durationMs) &&
        ability.durationMs > 0 &&
        ability.durationMs <= 300_000 &&
        Number.isFinite(ability.physicalPerPoint) &&
        ability.physicalPerPoint >= 0 &&
        ability.physicalPerPoint <= 100 &&
        Number.isFinite(ability.abilityPerPoint) &&
        ability.abilityPerPoint >= 0 &&
        ability.abilityPerPoint <= 100 &&
        (ability.physicalPerPoint > 0 || ability.abilityPerPoint > 0))) &&
    (ability.action !== 'stationary-channel' ||
      (Number.isFinite(ability.radius) &&
        ability.radius > 0 &&
        ability.radius <= 100 &&
        Number.isFinite(ability.durationMs) &&
        ability.durationMs > 0 &&
        ability.durationMs <= 300_000 &&
        Number.isFinite(ability.intervalMs) &&
        ability.intervalMs >= 250 &&
        ability.intervalMs <= 300_000 &&
        Number.isFinite(ability.stunMs) &&
        ability.stunMs > 0 &&
        ability.stunMs <= 300_000)) &&
    (ability.action !== 'area-status' ||
      (Number.isFinite(ability.radius) &&
        ability.radius > 0 &&
        ability.radius <= 100 &&
        ['corrosion', 'slow', 'stun'].includes(ability.status) &&
        Number.isFinite(ability.magnitude) &&
        ability.magnitude >= 0 &&
        ability.magnitude <= 1_000_000 &&
        Number.isFinite(ability.durationMs) &&
        ability.durationMs > 0 &&
        ability.durationMs <= 300_000))
  );
}

export function rollAbilityDamage(ability: Ability): number {
  const range = ability.damageRange;
  return range ? range.x + Math.random() * (range.y - range.x) : ability.damage;
}
export type Equipment = {
  learned: Map<string, Ability>;
  slots: Record<AbilitySlot, string | null>;
  readyAt: Map<string, number>;
  ammunition: Map<string, { charges: number; nextAt: number }>;
};
export function initialEquipment(): Equipment {
  return {
    learned: new Map([
      [
        'basic-dash',
        {
          id: 'basic-dash',
          slotType: 'movement',
          action: 'dash',
          cooldown: SOURCE_ACTIONS.dash.cooldownMs,
          damage: 0,
          distance: SOURCE_ACTIONS.dash.distance,
          durationMs: SOURCE_ACTIONS.dash.durationMs,
        },
      ],
    ]),
    slots: {
      primary: null,
      secondary: null,
      movement: 'basic-dash',
      ultimate: null,
    },
    readyAt: new Map(),
    ammunition: new Map(),
  };
}

export function availableAmmunition(
  equipment: Equipment,
  ability: Extract<Ability, { action: 'projectile' }>,
  now: number,
): { charges: number; nextAt: number } | null {
  const state = ammunitionView(equipment, ability, now);
  if (state) equipment.ammunition.set(ability.id, state);
  return state;
}
export function ammunitionView(
  equipment: Equipment,
  ability: Extract<Ability, { action: 'projectile' }>,
  now: number,
): { charges: number; nextAt: number } | null {
  const config = ability.ammunition;
  if (!config) return null;
  const state = {
    ...(equipment.ammunition.get(ability.id) ?? {
      charges: config.capacity,
      nextAt: now + config.reloadMs,
    }),
  };
  state.charges = Math.min(config.capacity, state.charges);
  if (state.charges < config.capacity && now >= state.nextAt) {
    const refilled = Math.floor((now - state.nextAt) / config.reloadMs) + 1;
    state.charges = Math.min(config.capacity, state.charges + refilled);
    state.nextAt += refilled * config.reloadMs;
  }
  return state;
}
export function isAbilitySlot(value: string): value is AbilitySlot {
  return (
    value === 'primary' ||
    value === 'secondary' ||
    value === 'movement' ||
    value === 'ultimate'
  );
}
export function equip(
  equipment: Equipment,
  slot: AbilitySlot,
  id: string | null,
): boolean {
  if (id === null) {
    equipment.slots[slot] = null;
    return true;
  }
  const ability = equipment.learned.get(id);
  const slotType = slot === 'primary' || slot === 'secondary' ? 'attack' : slot;
  if (!ability || ability.slotType !== slotType) return false;
  for (const other of ['primary', 'secondary', 'movement', 'ultimate'] as const)
    if (equipment.slots[other] === id) equipment.slots[other] = null;
  equipment.slots[slot] = id;
  return true;
}

export function acquisitionSlot(
  equipment: Equipment,
  ability: Ability,
): AbilitySlot {
  const slots: AbilitySlot[] =
    ability.slotType === 'attack'
      ? ['primary', 'secondary']
      : [ability.slotType];
  return (
    slots.find((slot) => equipment.slots[slot] === null) ??
    (ability.slotType === 'attack' ? 'secondary' : ability.slotType)
  );
}
