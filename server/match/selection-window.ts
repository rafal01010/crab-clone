export type ChoiceOption = { id: string; label: string; description?: string };
type Options = readonly [ChoiceOption, ...ChoiceOption[]];
export type SelectionPrompt =
  | {
      kind: 'upgrade';
      id: string;
      revision: number;
      options: Options;
      rerolls?: number;
      rarityPurchases?: number;
    }
  | {
      kind: 'poi';
      id: string;
      revision: number;
      siteId: string;
      budgetMs: number;
      protected: boolean;
      options: Options;
    }
  | {
      kind: 'specialization';
      id: string;
      revision: number;
      parentId: string;
      options: Options;
    }
  | {
      kind: 'equipment';
      id: string;
      revision: number;
      abilityId: string;
      options: Options;
    };
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
      kind: 'cancelled-poi';
      prompt: Extract<SelectionPrompt, { kind: 'poi' }>;
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
      displayed: boolean;
      displayedPrompt?: SelectionPrompt;
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

  cancel(): void {
    this.#state = { kind: 'idle' };
    this.#outcomes.length = 0;
  }

  cancelPoi(now: number): void {
    const state = this.#state;
    if (state.kind !== 'protected' || state.prompt.kind !== 'poi') return;
    this.#outcomes.push({
      kind: 'cancelled-poi',
      prompt: state.prompt,
      automatic: true,
    });
    this.next(state, now);
  }

  markDisplayed(id: string, revision: number): void {
    if (
      this.#state.kind === 'protected' &&
      this.#state.prompt.id === id &&
      this.#state.prompt.revision === revision
    )
      this.#state = {
        ...this.#state,
        displayed: true,
        displayedPrompt: structuredClone(this.#state.prompt),
      };
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
      displayed: false,
      prompt: {
        ...state.prompt,
        revision: revision + 1,
        options,
        rerolls: (state.prompt.rerolls ?? 0) + 1,
        rarityPurchases: 0,
      },
    };
    return true;
  }

  upgradeRarity(id: string, revision: number, now: number): boolean {
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
      displayed: false,
      prompt: {
        ...state.prompt,
        revision: revision + 1,
        rarityPurchases: (state.prompt.rarityPurchases ?? 0) + 1,
      },
    };
    return true;
  }

  revise(id: string, revision: number, now: number): boolean {
    this.advance(now);
    const state = this.#state;
    if (
      !this.#connected ||
      state.kind !== 'protected' ||
      state.prompt.kind === 'poi' ||
      state.prompt.id !== id ||
      state.prompt.revision !== revision
    )
      return false;
    this.#state = {
      ...state,
      prompt: { ...state.prompt, revision: revision + 1 },
    };
    return true;
  }

  advance(now: number): void {
    for (;;) {
      const state = this.#state;
      if (state.kind === 'protected' && now >= state.deadline) {
        const prompt = state.displayedPrompt ?? state.prompt;
        if (prompt.kind === 'poi') {
          this.#outcomes.push({
            kind: 'cancelled-poi',
            prompt,
            automatic: true,
          });
          this.#state = {
            kind: 'exposed',
            until: state.deadline + this.#exposedMs,
            pending: state.pending,
          };
          continue;
        }
        if (!state.displayed && !state.displayedPrompt) {
          this.#state = {
            kind: 'exposed',
            until: state.deadline + this.#exposedMs,
            pending: [
              { ...prompt, revision: prompt.revision + 1 },
              ...state.pending,
            ],
          };
          continue;
        }
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
      deadline:
        now + (prompt.kind === 'poi' ? prompt.budgetMs : SELECTION_WINDOW_MS),
      displayed: false,
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
      ? {
          ...state,
          prompt,
          pending,
          displayed: false,
          displayedPrompt: undefined,
        }
      : { kind: 'exposed', until: now + this.#exposedMs, pending: [] };
  }
}

export function selectionPermissions(state: SelectionState) {
  const protectedChoice =
    state.kind === 'protected' &&
    (state.prompt.kind !== 'poi' || state.prompt.protected);
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
