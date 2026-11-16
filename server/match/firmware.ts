import { SOURCE_GAMEPLAY } from '../content/source-gameplay.js';
import { sourceCurve } from '../content/source-curve.js';
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
  stage: number;
  position: Point;
};

export function identificationChance(senses: number, bonus: number): number {
  return Math.max(
    0,
    Math.min(
      1,
      sourceCurve(SOURCE_GAMEPLAY.firmwareIdentification, senses / 100) +
        bonus / 100,
    ),
  );
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
        stage: 0,
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
    if (
      this.#modules.length >= 64 ||
      this.#modules.some(
        (module) =>
          Math.hypot(
            module.position.x - position.x,
            module.position.z - position.z,
          ) < 4,
      )
    )
      return false;
    const appearances = [...this.#effects.keys()];
    const appearance = appearances[randomInt(appearances.length)];
    if (!appearance) return false;
    this.#modules.push({
      id: `firmware-${this.#nextId++}`,
      appearance,
      stage: 0,
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
