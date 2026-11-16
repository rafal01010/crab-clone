import { randomInt } from 'node:crypto';
import type { Point } from '../../shared/arena.js';

// Effect identities stay on the host.
export type FirmwareEffect =
  | 'delicious'
  | 'lethal'
  | 'medicinal'
  | 'inert'
  | 'poisonous'
  | 'refreshing'
  | 'spicy'
  | 'stinging'
  | 'yummy'
  | 'entertaining'
  | 'prolific'
  | 'deafening'
  | 'hallucinogenic'
  | 'mystic'
  | 'amusing'
  | 'nutritious';
const EFFECTS: readonly FirmwareEffect[] = [
  'delicious',
  'lethal',
  'medicinal',
  'inert',
  'poisonous',
  'refreshing',
  'spicy',
  'stinging',
  'yummy',
  'entertaining',
  'prolific',
  'deafening',
  'hallucinogenic',
  'mystic',
  'amusing',
  'nutritious',
];
export type FirmwareModule = {
  id: string;
  appearance: string;
  position: Point;
};

// Senses uses the project's 100-based units. Values interpolate the unversioned source table.
const IDENTIFICATION_CURVE = [
  [0, 0],
  [50, 0.05],
  [100, 0.25],
  [150, 0.6],
  [200, 0.9],
  [250, 1],
] as const;
export function identificationChance(senses: number, bonus: number): number {
  const value = Math.max(0, senses);
  const upper = IDENTIFICATION_CURVE.findIndex(
    ([threshold]) => value <= threshold,
  );
  let chance = 1;
  if (upper === 0) chance = 0;
  else if (upper > 0) {
    const lowerPoint = IDENTIFICATION_CURVE[upper - 1];
    const upperPoint = IDENTIFICATION_CURVE[upper];
    if (!lowerPoint || !upperPoint)
      throw new Error('Invalid identification curve');
    chance =
      lowerPoint[1] +
      ((upperPoint[1] - lowerPoint[1]) * (value - lowerPoint[0])) /
        (upperPoint[0] - lowerPoint[0]);
  }
  return Math.max(0, Math.min(1, chance + bonus / 100));
}

function shuffled<T>(values: readonly T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = randomInt(index + 1);
    const value = result[index];
    const swap = result[other];
    if (value === undefined || swap === undefined)
      throw new Error('Invalid firmware shuffle');
    result[index] = swap;
    result[other] = value;
  }
  return result;
}

export class FirmwareField {
  readonly #effects = new Map<string, FirmwareEffect>();
  readonly #modules: FirmwareModule[];
  #nextId: number;

  constructor(positions: readonly Point[]) {
    const effects = shuffled(EFFECTS);
    const appearances = shuffled(
      EFFECTS.map((_, index) => `pattern-${index + 1}`),
    );
    for (let index = 0; index < appearances.length; index++) {
      const appearance = appearances[index];
      const effect = effects[index];
      if (appearance && effect) this.#effects.set(appearance, effect);
    }
    const present = appearances.slice(
      0,
      Math.max(1, Math.ceil(positions.length / 2)),
    );
    this.#nextId = positions.length + 1;
    this.#modules = positions.map((position, index) => {
      const appearance = present[index % present.length];
      if (!appearance) throw new Error('Missing firmware appearance');
      return {
        id: `firmware-${index + 1}`,
        appearance,
        position: { ...position },
      };
    });
  }
  visible(): FirmwareModule[] {
    return this.#modules.map((module) => ({
      ...module,
      position: { ...module.position },
    }));
  }
  find(id: string): FirmwareModule | undefined {
    return this.#modules.find((item) => item.id === id);
  }
  spawn(position: Point): boolean {
    if (this.#modules.length >= 64) return false;
    const appearances = [...this.#effects.keys()];
    const appearance = appearances[randomInt(appearances.length)];
    if (!appearance) return false;
    this.#modules.push({
      id: `firmware-${this.#nextId++}`,
      appearance,
      position: { ...position },
    });
    return true;
  }
  take(
    id: string,
  ): { module: FirmwareModule; effect: FirmwareEffect } | undefined {
    const index = this.#modules.findIndex((item) => item.id === id);
    const module = this.#modules[index];
    const effect = module && this.#effects.get(module.appearance);
    if (!module || !effect) return undefined;
    this.#modules.splice(index, 1);
    return { module, effect };
  }
  effectFor(id: string): FirmwareEffect | undefined {
    const module = this.find(id);
    return module ? this.#effects.get(module.appearance) : undefined;
  }
}
