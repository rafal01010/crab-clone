export type ChoiceOption = { id: string; label: string };
type Options = readonly [ChoiceOption, ...ChoiceOption[]];
export type SelectionPrompt =
  | { kind: 'upgrade'; id: string; revision: number; options: Options }
  | { kind: 'specialization'; id: string; revision: number; options: Options }
  | { kind: 'equipment'; id: string; revision: number; options: Options };
export type SelectionOutcome =
  | {
      kind: 'chosen';
      prompt: SelectionPrompt;
      optionId: string;
      automatic: boolean;
    }
  | {
      kind: 'skipped';
      prompt: Extract<SelectionPrompt, { kind: 'specialization' }>;
      automatic: true;
    }
  | {
      kind: 'kept-equipment';
      prompt: Extract<SelectionPrompt, { kind: 'equipment' }>;
      automatic: true;
    };
export type SelectionState =
  | { kind: 'idle' }
  | { kind: 'waiting'; pending: readonly SelectionPrompt[] }
  | {
      kind: 'protected';
      deadline: number;
      prompt: SelectionPrompt;
      pending: readonly SelectionPrompt[];
    }
  | { kind: 'exposed'; until: number; pending: readonly SelectionPrompt[] };

export const SELECTION_WINDOW_MS = 10_000;
export const EXPOSED_INTERVAL_MS = 2_000;

export class SelectionWindow {
  #state: SelectionState = { kind: 'idle' };
  readonly #outcomes: SelectionOutcome[] = [];
  readonly #random: () => number;
  readonly #exposedMs: number;
  #connected = true;

  constructor(random: () => number, exposedMs = EXPOSED_INTERVAL_MS) {
    this.#random = random;
    this.#exposedMs = exposedMs;
  }
  get state(): SelectionState {
    return structuredClone(this.#state);
  }
  takeOutcomes(): SelectionOutcome[] {
    return this.#outcomes.splice(0);
  }

  setConnected(connected: boolean, now: number): void {
    this.#connected = connected;
    this.advance(now);
  }

  enqueue(prompt: SelectionPrompt, now: number): void {
    this.advance(now);
    const state = this.#state;
    if (state.kind === 'idle') {
      if (this.#connected) this.open(prompt, [], now);
      else this.#state = { kind: 'waiting', pending: [prompt] };
    } else this.#state = { ...state, pending: [...state.pending, prompt] };
  }

  choose(id: string, revision: number, optionId: string, now: number): boolean {
    this.advance(now);
    const state = this.#state;
    if (
      !this.#connected ||
      state.kind !== 'protected' ||
      state.prompt.id !== id ||
      state.prompt.revision !== revision ||
      !state.prompt.options.some((option) => option.id === optionId)
    )
      return false;
    this.#outcomes.push({
      kind: 'chosen',
      prompt: state.prompt,
      optionId,
      automatic: false,
    });
    this.next(state, now);
    return true;
  }

  reroll(id: string, revision: number, options: Options, now: number): boolean {
    this.advance(now);
    const state = this.#state;
    if (
      !this.#connected ||
      state.kind !== 'protected' ||
      state.prompt.kind !== 'upgrade' ||
      state.prompt.id !== id ||
      state.prompt.revision !== revision
    )
      return false;
    this.#state = {
      ...state,
      prompt: { ...state.prompt, revision: revision + 1, options },
    };
    return true;
  }

  advance(now: number): void {
    for (;;) {
      const state = this.#state;
      if (state.kind === 'protected' && now >= state.deadline) {
        const prompt = state.prompt;
        if (prompt.kind === 'upgrade') {
          const option =
            prompt.options[Math.floor(this.#random() * prompt.options.length)];
          if (!option)
            throw new Error(
              'Selection random source returned an invalid value',
            );
          this.#outcomes.push({
            kind: 'chosen',
            prompt,
            optionId: option.id,
            automatic: true,
          });
        } else if (prompt.kind === 'specialization') {
          this.#outcomes.push({ kind: 'skipped', prompt, automatic: true });
        } else {
          this.#outcomes.push({
            kind: 'kept-equipment',
            prompt,
            automatic: true,
          });
        }
        this.#state = {
          kind: 'exposed',
          until: state.deadline + this.#exposedMs,
          pending: state.pending,
        };
      } else if (
        (state.kind === 'exposed' && now >= state.until) ||
        state.kind === 'waiting'
      ) {
        if (!this.#connected) return;
        const [prompt, ...pending] = state.pending;
        if (prompt) this.open(prompt, pending, now);
        else this.#state = { kind: 'idle' };
      } else return;
    }
  }

  private open(
    prompt: SelectionPrompt,
    pending: readonly SelectionPrompt[],
    now: number,
  ): void {
    this.#state = {
      kind: 'protected',
      deadline: now + SELECTION_WINDOW_MS,
      prompt,
      pending,
    };
  }
  private next(
    state: Extract<SelectionState, { kind: 'protected' }>,
    now: number,
  ): void {
    const [prompt, ...pending] = state.pending;
    this.#state = prompt
      ? { ...state, prompt, pending }
      : { kind: 'exposed', until: now + this.#exposedMs, pending: [] };
  }
}

export function selectionPermissions(state: SelectionState) {
  const protectedChoice = state.kind === 'protected';
  return {
    movement: !protectedChoice,
    salvage: !protectedChoice,
    attacks: !protectedChoice,
    contactDisplacement: !protectedChoice,
    reactiveOffense: !protectedChoice,
    ownedOffense: !protectedChoice,
    ownedControl: !protectedChoice,
    combatDamage: !protectedChoice,
    boundaryDamage: true,
    passiveExperience: true,
  };
}
