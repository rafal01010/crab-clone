import { randomInt } from 'node:crypto';
import type { StatModifier } from './stats.js';
import { validFieldStatus, type FieldStatus } from './field-status.js';

export type RuntimeEffect =
  | {
      kind: 'healing-growth';
      id: string;
      healingRequired: number;
      healthPerThreshold: number;
    }
  | { kind: 'full-repair-growth'; id: string; healthPerPickup: number }
  | { kind: 'shelter-progress'; id: string; progressPerSecond: number }
  | { kind: 'shelter-entry-progress'; id: string; progress: number }
  | {
      kind: 'shelter-exit-boost';
      id: string;
      durationMs: number;
      damageMultiplier: number;
    }
  | {
      kind: 'periodic-strike';
      id: string;
      intervalMs: number;
      range: number;
      damage: number;
    }
  | { kind: 'plating-hit'; id: string; factor: number }
  | { kind: 'contact-reflection'; id: string; fraction: number }
  | {
      kind: 'hit-self-damage';
      id: string;
      amount: number;
      maxHealthFraction: number;
      abilityId?: string;
    }
  | { kind: 'hit-repair'; id: string; fraction: number; abilityId?: string }
  | { kind: 'hit-charm'; id: string; chance: number; abilityId?: string }
  | {
      kind: 'hit-mark';
      id: string;
      abilityId: string;
      durationMs: number;
      allyMultiplier: number;
    }
  | {
      kind: 'stunned-hit-bonus';
      id: string;
      multiplier: number;
      abilityId?: string;
    }
  | {
      kind: 'hit-cooldown';
      id: string;
      targetAbilityId: string;
      reductionMs: number;
      abilityId?: string;
    }
  | {
      kind: 'hit-status';
      id: string;
      status: 'corrosion' | 'slow' | 'stun';
      magnitude: number;
      durationMs: number;
      abilityId?: string;
    }
  | {
      kind: 'attack-followup';
      id: string;
      damage: number;
      cooldownMs: number;
      damagePerCurrency?: number;
    }
  | {
      kind: 'charm-aura';
      id: string;
      trigger: 'interval' | 'hurt' | 'attack';
      intervalMs: number;
      range: number;
      chanceMultiplier?: number;
    }
  | {
      kind: 'hurt-status-aura';
      id: string;
      status: 'corrosion' | 'slow' | 'stun';
      magnitude: number;
      durationMs: number;
      range: number;
      cooldownMs: number;
    }
  | {
      kind: 'periodic-resource';
      id: string;
      intervalMs: number;
      repair: boolean;
    }
  | {
      kind: 'unharmed-progress';
      id: string;
      progressPerAffinitySecond: number;
      pauseMs: number;
      intervalMs?: number;
    }
  | {
      kind: 'ally-damage';
      id: string;
      perCharmedAlly: number;
      ownerBonus: boolean;
      allyBonus: boolean;
    }
  | { kind: 'discovery-progress'; id: string; progress: number }
  | {
      kind: 'progress-storage';
      id: string;
      capacity: number;
      fraction: number;
      progressPerSecond: number;
    }
  | {
      kind: 'discovery-bonus';
      id: string;
      stats: readonly ('physical' | 'ability' | 'maximumHealth' | 'speed')[];
      amount: number;
      vegetation: boolean;
    }
  | { kind: 'size-health'; id: string; healthPer100Size: number }
  | {
      kind: 'ally-flat-damage';
      id: string;
      multiplier: number;
      finaleOnly: boolean;
    }
  | {
      kind: 'ally-resistance';
      id: string;
      perCharmedAlly: number;
      finaleOnly: boolean;
    }
  | {
      kind: 'finale-stat';
      id: string;
      stat: 'physical' | 'ability' | 'maximumHealth' | 'cataclysmResistance';
      add: number;
    }
  | { kind: 'deferred-damage'; id: string; fraction: number; delayMs: number }
  | {
      kind: 'hurt-boost';
      id: string;
      physical: number;
      ability: number;
      durationMs: number;
    }
  | {
      kind: 'hurt-stacks';
      id: string;
      fraction: number;
      maximum: number;
      durationMs: number;
    }
  | {
      kind: 'slowing-trail';
      id: string;
      trigger: 'movement' | 'pursuit';
      intervalMs: number;
      durationMs: number;
      radius: number;
      slowPercent: number;
      pursuitRange: number;
      activationCooldownMs?: number;
      emissionMs?: number;
      status?: FieldStatus;
    }
  | {
      kind: 'kill-growth';
      id: string;
      stat: 'physical' | 'ability';
      perKill: number;
    }
  | {
      kind: 'decoy-on-hurt';
      id: string;
      cooldownMs: number;
      durationMs: number;
    };

type WithoutId<T> = T extends { id: string } ? Omit<T, 'id'> : never;
export type RuntimeEffectDefinition = WithoutId<RuntimeEffect>;

type EffectState =
  | {
      kind: 'healing-growth';
      effect: Extract<RuntimeEffect, { kind: 'healing-growth' }>;
      remainder: number;
      gained: number;
    }
  | {
      kind: 'full-repair-growth';
      effect: Extract<RuntimeEffect, { kind: 'full-repair-growth' }>;
      gained: number;
    }
  | {
      kind: 'shelter-progress';
      effect: Extract<RuntimeEffect, { kind: 'shelter-progress' }>;
    }
  | {
      kind: 'shelter-entry-progress';
      effect: Extract<RuntimeEffect, { kind: 'shelter-entry-progress' }>;
    }
  | {
      kind: 'shelter-exit-boost';
      effect: Extract<RuntimeEffect, { kind: 'shelter-exit-boost' }>;
      until: number;
    }
  | {
      kind: 'periodic-strike';
      effect: Extract<RuntimeEffect, { kind: 'periodic-strike' }>;
      nextAt: number;
    }
  | {
      kind: 'plating-hit';
      effect: Extract<RuntimeEffect, { kind: 'plating-hit' }>;
    }
  | {
      kind: 'contact-reflection';
      effect: Extract<RuntimeEffect, { kind: 'contact-reflection' }>;
    }
  | {
      kind: 'hit-self-damage';
      effect: Extract<RuntimeEffect, { kind: 'hit-self-damage' }>;
    }
  | {
      kind: 'hit-repair';
      effect: Extract<RuntimeEffect, { kind: 'hit-repair' }>;
    }
  | { kind: 'hit-charm'; effect: Extract<RuntimeEffect, { kind: 'hit-charm' }> }
  | {
      kind: 'hit-mark';
      effect: Extract<RuntimeEffect, { kind: 'hit-mark' }>;
      targetId: string | null;
      until: number;
    }
  | {
      kind: 'stunned-hit-bonus';
      effect: Extract<RuntimeEffect, { kind: 'stunned-hit-bonus' }>;
    }
  | {
      kind: 'hit-cooldown';
      effect: Extract<RuntimeEffect, { kind: 'hit-cooldown' }>;
    }
  | {
      kind: 'hit-status';
      effect: Extract<RuntimeEffect, { kind: 'hit-status' }>;
    }
  | {
      kind: 'attack-followup';
      effect: Extract<RuntimeEffect, { kind: 'attack-followup' }>;
      nextAt: number;
    }
  | {
      kind: 'charm-aura';
      effect: Extract<RuntimeEffect, { kind: 'charm-aura' }>;
      nextAt: number;
    }
  | {
      kind: 'hurt-status-aura';
      effect: Extract<RuntimeEffect, { kind: 'hurt-status-aura' }>;
      nextAt: number;
    }
  | {
      kind: 'periodic-resource';
      effect: Extract<RuntimeEffect, { kind: 'periodic-resource' }>;
      nextAt: number;
    }
  | {
      kind: 'unharmed-progress';
      effect: Extract<RuntimeEffect, { kind: 'unharmed-progress' }>;
      resumeAt: number;
      nextAt: number;
    }
  | {
      kind: 'ally-damage';
      effect: Extract<RuntimeEffect, { kind: 'ally-damage' }>;
    }
  | {
      kind: 'ally-resistance';
      effect: Extract<RuntimeEffect, { kind: 'ally-resistance' }>;
    }
  | {
      kind: 'ally-flat-damage';
      effect: Extract<RuntimeEffect, { kind: 'ally-flat-damage' }>;
    }
  | {
      kind: 'size-health';
      effect: Extract<RuntimeEffect, { kind: 'size-health' }>;
    }
  | {
      kind: 'finale-stat';
      effect: Extract<RuntimeEffect, { kind: 'finale-stat' }>;
    }
  | {
      kind: 'discovery-progress';
      effect: Extract<RuntimeEffect, { kind: 'discovery-progress' }>;
    }
  | {
      kind: 'progress-storage';
      effect: Extract<RuntimeEffect, { kind: 'progress-storage' }>;
      stored: number;
    }
  | {
      kind: 'discovery-bonus';
      effect: Extract<RuntimeEffect, { kind: 'discovery-bonus' }>;
      gained: Map<'physical' | 'ability' | 'maximumHealth' | 'speed', number>;
    }
  | {
      kind: 'deferred-damage';
      effect: Extract<RuntimeEffect, { kind: 'deferred-damage' }>;
    }
  | {
      kind: 'hurt-boost';
      effect: Extract<RuntimeEffect, { kind: 'hurt-boost' }>;
      until: number;
    }
  | {
      kind: 'hurt-stacks';
      effect: Extract<RuntimeEffect, { kind: 'hurt-stacks' }>;
      expiries: number[];
    }
  | {
      kind: 'slowing-trail';
      effect: Extract<RuntimeEffect, { kind: 'slowing-trail' }>;
      nextAt: number;
      activeUntil: number;
      readyAt: number;
    }
  | {
      kind: 'kill-growth';
      effect: Extract<RuntimeEffect, { kind: 'kill-growth' }>;
      gained: number;
    }
  | {
      kind: 'decoy-on-hurt';
      effect: Extract<RuntimeEffect, { kind: 'decoy-on-hurt' }>;
      nextAt: number;
    };

type GrowthChange = { id: string; total: number };
const positive = (value: number, maximum: number) =>
  Number.isFinite(value) && value > 0 && value <= maximum;
const duration = (value: number) => positive(value, 300_000);

export function validRuntimeEffect(effect: RuntimeEffect): boolean {
  if (!effect.id || effect.id.length > 128) return false;
  switch (effect.kind) {
    case 'healing-growth':
      return (
        positive(effect.healingRequired, 1_000_000) &&
        effect.healingRequired >= 0.001 &&
        positive(effect.healthPerThreshold, 1_000_000)
      );
    case 'full-repair-growth':
      return positive(effect.healthPerPickup, 1_000_000);
    case 'contact-reflection':
      return positive(effect.fraction, 1);
    case 'shelter-progress':
      return positive(effect.progressPerSecond, 1_000_000);
    case 'shelter-entry-progress':
      return positive(effect.progress, 1_000_000);
    case 'shelter-exit-boost':
      return (
        duration(effect.durationMs) && positive(effect.damageMultiplier, 10)
      );
    case 'periodic-strike':
      return (
        duration(effect.intervalMs) &&
        effect.intervalMs >= 250 &&
        positive(effect.range, 100) &&
        positive(effect.damage, 1_000_000)
      );
    case 'plating-hit':
      return positive(effect.factor, 100);
    case 'hit-self-damage':
      return (
        positive(effect.amount, 1_000_000) &&
        positive(effect.maxHealthFraction, 1) &&
        (effect.abilityId === undefined ||
          (!!effect.abilityId && effect.abilityId.length <= 128))
      );
    case 'hit-repair':
      return (
        positive(effect.fraction, 10) &&
        (effect.abilityId === undefined ||
          (effect.abilityId.length > 0 && effect.abilityId.length <= 128))
      );
    case 'hit-charm':
      return (
        positive(effect.chance, 1) &&
        (effect.abilityId === undefined ||
          (!!effect.abilityId && effect.abilityId.length <= 128))
      );
    case 'hit-mark':
      return (
        !!effect.abilityId &&
        effect.abilityId.length <= 128 &&
        duration(effect.durationMs) &&
        Number.isFinite(effect.allyMultiplier) &&
        effect.allyMultiplier > 1 &&
        effect.allyMultiplier <= 10
      );
    case 'stunned-hit-bonus':
      return (
        Number.isFinite(effect.multiplier) &&
        effect.multiplier > 1 &&
        effect.multiplier <= 10 &&
        (effect.abilityId === undefined ||
          (!!effect.abilityId && effect.abilityId.length <= 128))
      );
    case 'hit-cooldown':
      return (
        !!effect.targetAbilityId &&
        effect.targetAbilityId.length <= 128 &&
        duration(effect.reductionMs) &&
        (effect.abilityId === undefined ||
          (!!effect.abilityId && effect.abilityId.length <= 128))
      );
    case 'hit-status':
      return (
        (effect.status === 'corrosion' ||
          effect.status === 'slow' ||
          effect.status === 'stun') &&
        Number.isFinite(effect.magnitude) &&
        effect.magnitude >= 0 &&
        effect.magnitude <= 1_000_000 &&
        duration(effect.durationMs) &&
        (effect.abilityId === undefined ||
          (effect.abilityId.length > 0 && effect.abilityId.length <= 128))
      );
    case 'attack-followup':
      return (
        Number.isFinite(effect.damage) &&
        effect.damage >= 0 &&
        effect.damage <= 1_000_000 &&
        (effect.damage > 0 || (effect.damagePerCurrency ?? 0) > 0) &&
        duration(effect.cooldownMs) &&
        effect.cooldownMs >= 250 &&
        (effect.damagePerCurrency === undefined ||
          (Number.isFinite(effect.damagePerCurrency) &&
            effect.damagePerCurrency >= 0 &&
            effect.damagePerCurrency <= 1_000_000))
      );
    case 'charm-aura':
      return (
        (effect.trigger === 'interval' ||
          effect.trigger === 'hurt' ||
          effect.trigger === 'attack') &&
        duration(effect.intervalMs) &&
        effect.intervalMs >= 250 &&
        positive(effect.range, 100) &&
        (effect.chanceMultiplier === undefined ||
          positive(effect.chanceMultiplier, 100))
      );
    case 'hurt-status-aura':
      return (
        (effect.status === 'corrosion' ||
          effect.status === 'slow' ||
          effect.status === 'stun') &&
        Number.isFinite(effect.magnitude) &&
        effect.magnitude >= 0 &&
        effect.magnitude <= 1_000_000 &&
        duration(effect.durationMs) &&
        positive(effect.range, 100) &&
        duration(effect.cooldownMs) &&
        effect.cooldownMs >= 250
      );
    case 'periodic-resource':
      return (
        duration(effect.intervalMs) &&
        effect.intervalMs >= 250 &&
        typeof effect.repair === 'boolean'
      );
    case 'size-health':
      return positive(effect.healthPer100Size, 1_000_000);
    case 'ally-flat-damage':
      return (
        Number.isFinite(effect.multiplier) &&
        effect.multiplier > 1 &&
        effect.multiplier <= 10 &&
        typeof effect.finaleOnly === 'boolean'
      );
    case 'ally-resistance':
      return (
        positive(effect.perCharmedAlly, 100) &&
        typeof effect.finaleOnly === 'boolean'
      );
    case 'ally-damage':
      return (
        positive(effect.perCharmedAlly, 1) &&
        typeof effect.ownerBonus === 'boolean' &&
        typeof effect.allyBonus === 'boolean' &&
        (effect.ownerBonus || effect.allyBonus)
      );
    case 'finale-stat':
      return (
        [
          'physical',
          'ability',
          'maximumHealth',
          'cataclysmResistance',
        ].includes(effect.stat) && positive(effect.add, 999)
      );
    case 'unharmed-progress':
      return (
        positive(effect.progressPerAffinitySecond, 10000) &&
        duration(effect.pauseMs) &&
        (effect.intervalMs === undefined || duration(effect.intervalMs))
      );
    case 'discovery-progress':
      return positive(effect.progress, 10000);
    case 'progress-storage':
      return (
        positive(effect.capacity, 1_000_000) &&
        positive(effect.fraction, 1) &&
        positive(effect.progressPerSecond, 10_000)
      );
    case 'discovery-bonus':
      return (
        effect.stats.length > 0 &&
        effect.stats.length <= 4 &&
        new Set(effect.stats).size === effect.stats.length &&
        effect.stats.every((stat) =>
          ['physical', 'ability', 'maximumHealth', 'speed'].includes(stat),
        ) &&
        positive(effect.amount, 999) &&
        typeof effect.vegetation === 'boolean'
      );
    case 'deferred-damage':
      return positive(effect.fraction, 1) && duration(effect.delayMs);
    case 'hurt-boost':
      return (
        Number.isFinite(effect.physical) &&
        effect.physical >= 0 &&
        effect.physical <= 999 &&
        Number.isFinite(effect.ability) &&
        effect.ability >= 0 &&
        effect.ability <= 999 &&
        (effect.physical > 0 || effect.ability > 0) &&
        duration(effect.durationMs)
      );
    case 'hurt-stacks':
      return (
        positive(effect.fraction, 1) &&
        Number.isSafeInteger(effect.maximum) &&
        effect.maximum > 0 &&
        effect.maximum <= 100 &&
        duration(effect.durationMs)
      );
    case 'slowing-trail':
      return (
        (effect.trigger === 'movement' || effect.trigger === 'pursuit') &&
        duration(effect.intervalMs) &&
        effect.intervalMs >= 250 &&
        duration(effect.durationMs) &&
        positive(effect.radius, 20) &&
        positive(effect.slowPercent, 100) &&
        positive(effect.pursuitRange, 100) &&
        (effect.activationCooldownMs === undefined ||
          duration(effect.activationCooldownMs)) &&
        (effect.emissionMs === undefined || duration(effect.emissionMs)) &&
        (effect.status === undefined || validFieldStatus(effect.status))
      );
    case 'kill-growth':
      return (
        (effect.stat === 'physical' || effect.stat === 'ability') &&
        positive(effect.perKill, 100)
      );
    case 'decoy-on-hurt':
      return duration(effect.cooldownMs) && duration(effect.durationMs);
  }
}

export class RuntimeEffects {
  readonly #effects = new Map<string, EffectState>();

  configure(effect: RuntimeEffect, now: number): boolean {
    if (!validRuntimeEffect(effect) || !Number.isFinite(now)) return false;
    const old = this.#effects.get(effect.id);
    if ((old && old.kind !== effect.kind) || (!old && this.#effects.size >= 64))
      return false;
    switch (effect.kind) {
      case 'healing-growth':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
          remainder: old?.kind === effect.kind ? old.remainder : 0,
          gained: old?.kind === effect.kind ? old.gained : 0,
        });
        return true;
      case 'full-repair-growth':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
          gained: old?.kind === effect.kind ? old.gained : 0,
        });
        return true;
      case 'shelter-progress':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
        });
        return true;
      case 'shelter-entry-progress':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
        });
        return true;
      case 'shelter-exit-boost':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
          until: old?.kind === effect.kind ? old.until : 0,
        });
        return true;
      case 'periodic-strike':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
          nextAt:
            old?.kind === effect.kind ? old.nextAt : now + effect.intervalMs,
        });
        return true;
      case 'plating-hit':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
        });
        return true;
      case 'hit-self-damage':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
        });
        return true;
      case 'contact-reflection':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
        });
        return true;
      case 'hit-repair':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
        });
        return true;
      case 'hit-charm':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
        });
        return true;
      case 'hit-mark':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
          targetId: old?.kind === effect.kind ? old.targetId : null,
          until: old?.kind === effect.kind ? old.until : 0,
        });
        return true;
      case 'stunned-hit-bonus':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
        });
        return true;
      case 'hit-cooldown':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
        });
        return true;
      case 'hit-status':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
        });
        return true;
      case 'attack-followup':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
          nextAt: old?.kind === effect.kind ? old.nextAt : now,
        });
        return true;
      case 'charm-aura':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
          nextAt:
            old?.kind === effect.kind ? old.nextAt : now + effect.intervalMs,
        });
        return true;
      case 'hurt-status-aura':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
          nextAt: old?.kind === effect.kind ? old.nextAt : now,
        });
        return true;
      case 'periodic-resource':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
          nextAt:
            old?.kind === effect.kind ? old.nextAt : now + effect.intervalMs,
        });
        return true;
      case 'size-health':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
        });
        return true;
      case 'ally-flat-damage':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
        });
        return true;
      case 'ally-resistance':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
        });
        return true;
      case 'ally-damage':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
        });
        return true;
      case 'finale-stat':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
        });
        return true;
      case 'unharmed-progress':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
          resumeAt: old?.kind === effect.kind ? old.resumeAt : now,
          nextAt:
            old?.kind === effect.kind
              ? old.nextAt
              : now + (effect.intervalMs ?? 0),
        });
        return true;
      case 'discovery-progress':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
        });
        return true;
      case 'progress-storage':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
          stored: old?.kind === effect.kind ? old.stored : 0,
        });
        return true;
      case 'discovery-bonus':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect, stats: [...effect.stats] },
          gained: old?.kind === effect.kind ? old.gained : new Map(),
        });
        return true;
      case 'deferred-damage':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
        });
        return true;
      case 'hurt-boost':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
          until: old?.kind === effect.kind ? old.until : 0,
        });
        return true;
      case 'hurt-stacks':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
          expiries:
            old?.kind === effect.kind
              ? old.expiries.slice(-effect.maximum)
              : [],
        });
        return true;
      case 'slowing-trail':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
          nextAt:
            old?.kind === effect.kind ? old.nextAt : now + effect.intervalMs,
          activeUntil: old?.kind === effect.kind ? old.activeUntil : 0,
          readyAt: old?.kind === effect.kind ? old.readyAt : now,
        });
        return true;
      case 'kill-growth':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
          gained: old?.kind === effect.kind ? old.gained : 0,
        });
        return true;
      case 'decoy-on-hurt':
        this.#effects.set(effect.id, {
          kind: effect.kind,
          effect: { ...effect },
          nextAt: old?.kind === effect.kind ? old.nextAt : now,
        });
        return true;
    }
  }

  healed(actual: number): GrowthChange[] {
    if (!Number.isFinite(actual) || actual <= 0) return [];
    const changes: GrowthChange[] = [];
    for (const [id, state] of this.#effects) {
      if (state.kind !== 'healing-growth') continue;
      state.remainder += actual;
      const count = Math.floor(state.remainder / state.effect.healingRequired);
      if (count < 1) continue;
      state.remainder -= count * state.effect.healingRequired;
      state.gained = Math.min(
        1_000_000,
        state.gained + count * state.effect.healthPerThreshold,
      );
      changes.push({ id, total: state.gained });
    }
    return changes;
  }

  fullRepairPickup(): GrowthChange[] {
    const changes: GrowthChange[] = [];
    for (const [id, state] of this.#effects) {
      if (state.kind !== 'full-repair-growth') continue;
      state.gained = Math.min(
        1_000_000,
        state.gained + state.effect.healthPerPickup,
      );
      changes.push({ id, total: state.gained });
    }
    return changes;
  }

  shelterEntryProgress(): number {
    let progress = 0;
    for (const state of this.#effects.values())
      if (state.kind === 'shelter-entry-progress')
        progress += state.effect.progress;
    return Math.min(1_000_000, progress);
  }

  shelterProgress(elapsedMs: number): number {
    if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
    let progress = 0;
    for (const state of this.#effects.values())
      if (state.kind === 'shelter-progress')
        progress += (state.effect.progressPerSecond * elapsedMs) / 1000;
    return progress;
  }

  leaveShelter(now: number): boolean {
    let changed = false;
    for (const state of this.#effects.values()) {
      if (state.kind !== 'shelter-exit-boost') continue;
      state.until = now + state.effect.durationMs;
      changed = true;
    }
    return changed;
  }

  temporaryModifiers(now: number): StatModifier[] {
    const modifiers: StatModifier[] = [];
    for (const [id, state] of this.#effects)
      if (state.kind === 'shelter-exit-boost' && state.until > now)
        modifiers.push({
          id: JSON.stringify(['runtime-exit', id]),
          stat: 'damage',
          add: 0,
          multiplier: state.effect.damageMultiplier,
        });
      else if (state.kind === 'hurt-boost' && state.until > now) {
        if (state.effect.physical)
          modifiers.push({
            id: JSON.stringify(['runtime-hurt', id, 'physical']),
            stat: 'physical',
            add: state.effect.physical,
            multiplier: 1,
          });
        if (state.effect.ability)
          modifiers.push({
            id: JSON.stringify(['runtime-hurt', id, 'ability']),
            stat: 'ability',
            add: state.effect.ability,
            multiplier: 1,
          });
      } else if (state.kind === 'hurt-stacks') {
        const stacks = state.expiries.filter((expiry) => expiry > now).length;
        if (stacks)
          for (const stat of ['physical', 'ability'] as const)
            modifiers.push({
              id: JSON.stringify(['runtime-hurt-stacks', id, stat]),
              stat,
              add: 0,
              multiplier: 1 + stacks * state.effect.fraction,
            });
      }
    return modifiers;
  }

  hurt(now: number): boolean {
    this.interruptProgress(now);
    let changed = false;
    for (const state of this.#effects.values()) {
      if (state.kind === 'hurt-boost') {
        state.until = now + state.effect.durationMs;
        changed = true;
      } else if (state.kind === 'hurt-stacks') {
        state.expiries = state.expiries.filter((expiry) => expiry > now);
        if (state.expiries.length >= state.effect.maximum)
          state.expiries.shift();
        state.expiries.push(now + state.effect.durationMs);
        changed = true;
      }
    }
    return changed;
  }

  interruptProgress(now: number): void {
    for (const state of this.#effects.values()) {
      if (state.kind !== 'unharmed-progress') continue;
      state.resumeAt = now + state.effect.pauseMs;
      if (state.effect.intervalMs !== undefined) state.nextAt = state.resumeAt;
    }
  }

  unharmedProgress(start: number, end: number, affinity: number): number {
    let progress = 0;
    for (const state of this.#effects.values())
      if (state.kind === 'unharmed-progress') {
        if (state.effect.intervalMs !== undefined) {
          if (end >= state.nextAt) {
            const count =
              Math.floor((end - state.nextAt) / state.effect.intervalMs) + 1;
            progress +=
              ((count * state.effect.intervalMs) / 1000) *
              state.effect.progressPerAffinitySecond *
              Math.max(0, affinity);
            state.nextAt += count * state.effect.intervalMs;
          }
        } else
          progress +=
            (Math.max(0, end - Math.max(start, state.resumeAt)) / 1000) *
            state.effect.progressPerAffinitySecond *
            Math.max(0, affinity);
      }
    return progress;
  }

  expire(now: number): boolean {
    let changed = false;
    for (const state of this.#effects.values())
      if (
        (state.kind === 'shelter-exit-boost' || state.kind === 'hurt-boost') &&
        state.until > 0 &&
        state.until <= now
      ) {
        state.until = 0;
        changed = true;
      } else if (state.kind === 'hurt-stacks') {
        const active = state.expiries.filter((expiry) => expiry > now);
        if (active.length !== state.expiries.length) changed = true;
        state.expiries = active;
      }
    return changed;
  }

  sizeHealthModifiers(size: number): StatModifier[] {
    const modifiers: StatModifier[] = [];
    for (const [id, state] of this.#effects)
      if (state.kind === 'size-health')
        modifiers.push({
          id: JSON.stringify(['runtime-size-health', id]),
          stat: 'maximumHealth',
          add: (size / 100) * state.effect.healthPer100Size,
          multiplier: 1,
        });
    return modifiers;
  }

  finaleModifiers(active: boolean): StatModifier[] {
    if (!active) return [];
    const modifiers: StatModifier[] = [];
    for (const [id, state] of this.#effects)
      if (state.kind === 'finale-stat')
        modifiers.push({
          id: JSON.stringify(['runtime-finale', id]),
          stat: state.effect.stat,
          add: state.effect.add,
          multiplier: 1,
        });
    return modifiers;
  }

  allyResistance(charmedCount: number, finale: boolean): number {
    let resistance = 0;
    for (const state of this.#effects.values())
      if (
        state.kind === 'ally-resistance' &&
        (!state.effect.finaleOnly || finale)
      )
        resistance += state.effect.perCharmedAlly * charmedCount;
    return Math.min(100, resistance);
  }

  allyDamageMultiplier(
    charmedCount: number,
    allyAttack: boolean,
    finale: boolean,
  ): number {
    let bonus = 0;
    for (const state of this.#effects.values())
      if (
        state.kind === 'ally-damage' &&
        (allyAttack ? state.effect.allyBonus : state.effect.ownerBonus)
      )
        bonus += state.effect.perCharmedAlly * charmedCount;
      else if (
        state.kind === 'ally-flat-damage' &&
        allyAttack &&
        (!state.effect.finaleOnly || finale)
      )
        bonus += state.effect.multiplier - 1;
    return 1 + Math.min(9, bonus);
  }

  periodicStrikes(
    now: number,
    enabled: boolean,
  ): { range: number; damage: number }[] {
    const strikes: { range: number; damage: number }[] = [];
    for (const state of this.#effects.values()) {
      if (state.kind !== 'periodic-strike' || state.nextAt > now) continue;
      state.nextAt = now + state.effect.intervalMs;
      if (enabled)
        strikes.push({
          range: state.effect.range,
          damage: state.effect.damage,
        });
    }
    return strikes;
  }

  platingDamage(plating: number): number {
    let damage = 0;
    for (const state of this.#effects.values())
      if (state.kind === 'plating-hit') damage += plating * state.effect.factor;
    return damage;
  }

  hitRepair(actualDamage: number, abilityId: string | undefined): number {
    let repair = 0;
    for (const state of this.#effects.values())
      if (
        state.kind === 'hit-repair' &&
        (state.effect.abilityId === undefined ||
          state.effect.abilityId === abilityId)
      )
        repair += actualDamage * state.effect.fraction;
    return repair;
  }

  hitSelfDamage(abilityId: string | undefined, maximumHealth: number): number {
    let damage = 0;
    for (const state of this.#effects.values())
      if (
        state.kind === 'hit-self-damage' &&
        (state.effect.abilityId === undefined ||
          state.effect.abilityId === abilityId)
      )
        damage += Math.min(
          state.effect.amount,
          maximumHealth * state.effect.maxHealthFraction,
        );
    return damage;
  }

  stunnedHitMultiplier(abilityId: string | undefined): number {
    let multiplier = 1;
    for (const state of this.#effects.values())
      if (
        state.kind === 'stunned-hit-bonus' &&
        (state.effect.abilityId === undefined ||
          state.effect.abilityId === abilityId)
      )
        multiplier = Math.min(10, multiplier * state.effect.multiplier);
    return multiplier;
  }

  hitCharmChances(abilityId: string | undefined): number[] {
    const chances: number[] = [];
    for (const state of this.#effects.values())
      if (
        state.kind === 'hit-charm' &&
        (state.effect.abilityId === undefined ||
          state.effect.abilityId === abilityId)
      )
        chances.push(state.effect.chance);
    return chances;
  }

  markHit(abilityId: string | undefined, targetId: string, now: number): void {
    for (const state of this.#effects.values())
      if (state.kind === 'hit-mark' && state.effect.abilityId === abilityId) {
        state.targetId = targetId;
        state.until = now + state.effect.durationMs;
      }
  }

  markedAllyMultiplier(targetId: string, now: number): number {
    let multiplier = 1;
    for (const state of this.#effects.values())
      if (
        state.kind === 'hit-mark' &&
        state.targetId === targetId &&
        state.until > now
      )
        multiplier = Math.max(multiplier, state.effect.allyMultiplier);
    return multiplier;
  }

  hitCooldowns(
    abilityId: string | undefined,
  ): { targetAbilityId: string; reductionMs: number }[] {
    const changes: { targetAbilityId: string; reductionMs: number }[] = [];
    for (const state of this.#effects.values())
      if (
        state.kind === 'hit-cooldown' &&
        (state.effect.abilityId === undefined ||
          state.effect.abilityId === abilityId)
      )
        changes.push({
          targetAbilityId: state.effect.targetAbilityId,
          reductionMs: state.effect.reductionMs,
        });
    return changes;
  }

  hitStatuses(
    abilityId: string | undefined,
  ): Extract<RuntimeEffect, { kind: 'hit-status' }>[] {
    const effects: Extract<RuntimeEffect, { kind: 'hit-status' }>[] = [];
    for (const state of this.#effects.values())
      if (
        state.kind === 'hit-status' &&
        (state.effect.abilityId === undefined ||
          state.effect.abilityId === abilityId)
      )
        effects.push(state.effect);
    return effects;
  }

  attackFollowups(now: number, capacity: number, currency: number): number[] {
    const amounts: number[] = [];
    for (const state of this.#effects.values()) {
      if (amounts.length >= capacity) break;
      if (state.kind !== 'attack-followup' || state.nextAt > now) continue;
      state.nextAt = now + state.effect.cooldownMs;
      amounts.push(
        Math.min(
          1_000_000,
          state.effect.damage +
            currency * (state.effect.damagePerCurrency ?? 0),
        ),
      );
    }
    return amounts;
  }

  charmAuras(
    now: number,
    trigger: 'interval' | 'hurt' | 'attack',
    enabled: boolean,
  ): Extract<RuntimeEffect, { kind: 'charm-aura' }>[] {
    const effects: Extract<RuntimeEffect, { kind: 'charm-aura' }>[] = [];
    for (const state of this.#effects.values()) {
      if (
        state.kind !== 'charm-aura' ||
        state.effect.trigger !== trigger ||
        state.nextAt > now
      )
        continue;
      state.nextAt = now + state.effect.intervalMs;
      if (enabled) effects.push(state.effect);
    }
    return effects;
  }

  hurtStatusAuras(
    now: number,
  ): Extract<RuntimeEffect, { kind: 'hurt-status-aura' }>[] {
    const effects: Extract<RuntimeEffect, { kind: 'hurt-status-aura' }>[] = [];
    for (const state of this.#effects.values()) {
      if (state.kind !== 'hurt-status-aura' || state.nextAt > now) continue;
      state.nextAt = now + state.effect.cooldownMs;
      effects.push(state.effect);
    }
    return effects;
  }

  periodicResources(now: number, enabled: boolean): boolean[] {
    const resources: boolean[] = [];
    for (const state of this.#effects.values()) {
      if (state.kind !== 'periodic-resource' || state.nextAt > now) continue;
      state.nextAt = now + state.effect.intervalMs;
      if (enabled) resources.push(state.effect.repair);
    }
    return resources;
  }

  discoveryProgress(): number {
    let progress = 0;
    for (const state of this.#effects.values())
      if (state.kind === 'discovery-progress')
        progress += state.effect.progress;
    return progress;
  }

  storeProgress(amount: number): number {
    let remaining = amount;
    for (const state of this.#effects.values()) {
      if (state.kind !== 'progress-storage') continue;
      const stored = Math.min(
        remaining * state.effect.fraction,
        Math.max(0, state.effect.capacity - state.stored),
      );
      state.stored += stored;
      remaining -= stored;
    }
    return remaining;
  }

  consumeStoredProgress(elapsedMs: number): number {
    let consumed = 0;
    for (const state of this.#effects.values()) {
      if (state.kind !== 'progress-storage') continue;
      const amount = Math.min(
        state.stored,
        (state.effect.progressPerSecond * elapsedMs) / 1000,
        1_000_000 - consumed,
      );
      state.stored -= amount;
      consumed += amount;
    }
    return consumed;
  }

  storedProgress(): number {
    let total = 0;
    for (const state of this.#effects.values())
      if (state.kind === 'progress-storage') total += state.stored;
    return total;
  }

  discoveryBonuses(): { modifiers: StatModifier[]; vegetation: number } {
    const modifiers: StatModifier[] = [];
    let vegetation = 0;
    for (const [id, state] of this.#effects) {
      if (state.kind !== 'discovery-bonus') continue;
      const stat = state.effect.stats[randomInt(state.effect.stats.length)];
      if (!stat) continue;
      const amount = Math.min(
        999,
        (state.gained.get(stat) ?? 0) + state.effect.amount,
      );
      state.gained.set(stat, amount);
      modifiers.push({
        id: JSON.stringify(['runtime-discovery', id, stat]),
        stat,
        add: amount,
        multiplier: 1,
      });
      if (state.effect.vegetation) vegetation++;
    }
    return { modifiers, vegetation };
  }

  damageDelay(): { fraction: number; delayMs: number } | null {
    let strongest: { fraction: number; delayMs: number } | null = null;
    for (const state of this.#effects.values()) {
      if (state.kind !== 'deferred-damage') continue;
      if (!strongest || state.effect.fraction > strongest.fraction)
        strongest = {
          fraction: state.effect.fraction,
          delayMs: state.effect.delayMs,
        };
    }
    return strongest;
  }

  secretionTrail():
    Extract<RuntimeEffect, { kind: 'slowing-trail' }> | undefined {
    const state = this.#effects.get('upgrade:pedal-glands');
    return state?.kind === 'slowing-trail' ? state.effect : undefined;
  }

  trails(
    now: number,
    enabled: boolean,
    moving: boolean,
    pursuedWithin: (range: number) => boolean,
  ): Extract<RuntimeEffect, { kind: 'slowing-trail' }>[] {
    const emitted: Extract<RuntimeEffect, { kind: 'slowing-trail' }>[] = [];
    for (const state of this.#effects.values()) {
      if (state.kind !== 'slowing-trail' || state.nextAt > now) continue;
      state.nextAt = now + state.effect.intervalMs;
      if (state.effect.activationCooldownMs !== undefined) {
        if (
          enabled &&
          moving &&
          now >= state.readyAt &&
          pursuedWithin(state.effect.pursuitRange)
        ) {
          state.activeUntil =
            now + (state.effect.emissionMs ?? state.effect.intervalMs);
          state.readyAt = now + state.effect.activationCooldownMs;
        }
        if (enabled && moving && now < state.activeUntil)
          emitted.push(state.effect);
        continue;
      }
      if (
        enabled &&
        moving &&
        (state.effect.trigger === 'movement' ||
          pursuedWithin(state.effect.pursuitRange))
      )
        emitted.push(state.effect);
    }
    return emitted;
  }

  killGrowth(): StatModifier[] {
    const modifiers: StatModifier[] = [];
    for (const [id, state] of this.#effects) {
      if (state.kind !== 'kill-growth') continue;
      state.gained = Math.min(999, state.gained + state.effect.perKill);
      modifiers.push({
        id: JSON.stringify(['runtime-kill-growth', id]),
        stat: state.effect.stat,
        add: state.gained,
        multiplier: 1,
      });
    }
    return modifiers;
  }

  contactReflection(): number {
    let fraction = 0;
    for (const state of this.#effects.values())
      if (state.kind === 'contact-reflection')
        fraction += state.effect.fraction;
    return Math.min(1, fraction);
  }

  readyDecoys(now: number): { id: string; durationMs: number }[] {
    const ready: { id: string; durationMs: number }[] = [];
    for (const [id, state] of this.#effects)
      if (state.kind === 'decoy-on-hurt' && now >= state.nextAt)
        ready.push({ id, durationMs: state.effect.durationMs });
    return ready;
  }

  consumeDecoy(id: string, now: number): void {
    const state = this.#effects.get(id);
    if (state?.kind === 'decoy-on-hurt')
      state.nextAt = now + state.effect.cooldownMs;
  }
}
