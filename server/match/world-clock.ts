export type LightPhase = 'day' | 'night';

// Provisional phase lengths. Adjustments are additive milliseconds, keyed by source.
export const BASE_PHASE_MS: Record<LightPhase, number> = {
  day: 180_000,
  night: 120_000,
};
const MIN_PHASE_MS = 10_000;
const MAX_PHASE_MS = 600_000;

export class WorldClock {
  #phase: LightPhase = 'day';
  #phaseStartedAt = 0;
  #nextTransitionAt = BASE_PHASE_MS.day;
  readonly #adjustments = new Map<string, Map<LightPhase, number>>();

  setAdjustment(
    source: string,
    phase: LightPhase,
    milliseconds: number,
  ): boolean {
    if (
      !source ||
      source.length > 128 ||
      !Number.isSafeInteger(milliseconds) ||
      Math.abs(milliseconds) > MAX_PHASE_MS ||
      (phase !== 'day' && phase !== 'night')
    )
      return false;
    if (
      !this.#adjustments.has(source) &&
      milliseconds !== 0 &&
      this.#adjustments.size >= 256
    )
      return false;
    if (milliseconds === 0) {
      const entries = this.#adjustments.get(source);
      entries?.delete(phase);
      if (entries?.size === 0) this.#adjustments.delete(source);
    } else {
      const entries =
        this.#adjustments.get(source) ?? new Map<LightPhase, number>();
      entries.set(phase, milliseconds);
      this.#adjustments.set(source, entries);
    }
    return true;
  }

  advance(now: number): void {
    if (!Number.isFinite(now) || now < this.#nextTransitionAt) return;
    const duration = (phase: LightPhase) => {
      let adjustment = 0;
      for (const item of this.#adjustments.values())
        adjustment += item.get(phase) ?? 0;
      return Math.max(
        MIN_PHASE_MS,
        Math.min(MAX_PHASE_MS, BASE_PHASE_MS[phase] + adjustment),
      );
    };
    const cycle = duration('day') + duration('night');
    const cycles = Math.floor((now - this.#nextTransitionAt) / cycle);
    this.#nextTransitionAt += cycles * cycle;
    if (cycles > 0)
      this.#phaseStartedAt = this.#nextTransitionAt - duration(this.#phase);
    while (now >= this.#nextTransitionAt) {
      this.#phaseStartedAt = this.#nextTransitionAt;
      this.#phase = this.#phase === 'day' ? 'night' : 'day';
      this.#nextTransitionAt += duration(this.#phase);
    }
  }

  view() {
    return {
      phase: this.#phase,
      phaseStartedAt: this.#phaseStartedAt,
      nextTransitionAt: this.#nextTransitionAt,
    };
  }
}
