<script lang="ts">
  import { onMount } from 'svelte';
  export type Offer = {
    id: string;
    name: string;
    description: string;
    rarity: string;
    rank: number;
    cost: number | null;
  };
  export type MapPoint = { id: string; x: number; y: number; self: boolean };
  let {
    offerId,
    revision,
    offers,
    remainingMs,
    mapPoints,
    boundary,
    warning,
    onchoose,
    kind = 'upgrade',
    rerollCostAvailable = false,
    onreroll,
  }: {
    offerId: string;
    revision: number;
    offers: readonly Offer[];
    remainingMs: number;
    mapPoints: readonly MapPoint[];
    boundary: { x: number; y: number; radius: number } | null;
    warning: string | null;
    onchoose: (id: string) => Promise<boolean>;
    kind?: 'upgrade' | 'specialization' | 'equipment';
    rerollCostAvailable?: boolean;
    onreroll?: () => Promise<boolean>;
  } = $props();
  let selected = $state<string | null>(null);
  let submitted = $state(false);
  let transactionError = $state('');
  let dialog: HTMLDivElement;
  let previousIdentity = '';
  $effect(() => {
    const identity = JSON.stringify([offerId, revision]);
    if (identity !== previousIdentity) {
      previousIdentity = identity;
      selected = null;
      submitted = false;
      transactionError = '';
    }
  });
  onMount(() => {
    const previous = document.activeElement;
    dialog.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  });
  const choice = $derived(offers.find((offer) => offer.id === selected));
  function select(index: number) {
    if (!submitted) selected = offers[index]?.id ?? null;
  }
  async function confirm() {
    if (!choice || submitted || remainingMs <= 0) return;
    const identity = JSON.stringify([offerId, revision]);
    submitted = true;
    try {
      const accepted = await onchoose(choice.id);
      if (!accepted && identity === JSON.stringify([offerId, revision])) {
        submitted = false;
        transactionError = 'That choice was not applied. Try again.';
      }
    } catch {
      if (identity === JSON.stringify([offerId, revision])) submitted = false;
    }
  }
  async function reroll() {
    if (!onreroll || submitted || remainingMs <= 0) return;
    const identity = JSON.stringify([offerId, revision]);
    submitted = true;
    try {
      if (
        !(await onreroll()) &&
        identity === JSON.stringify([offerId, revision])
      ) {
        submitted = false;
        transactionError = 'The reroll was not applied. Try again.';
      }
    } catch {
      if (identity === JSON.stringify([offerId, revision])) submitted = false;
    }
  }
  function keyboard(event: KeyboardEvent) {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || target.matches('input, textarea, select'))
    )
      return;
    if (event.repeat) return;
    if (event.key === 'Tab') {
      const buttons = [
        ...dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
      ];
      if (!buttons.length) {
        event.preventDefault();
        return;
      }
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === dialog)
      ) {
        event.preventDefault();
        first?.focus();
      }
      return;
    }
    if (['1', '2', '3'].includes(event.key)) {
      event.preventDefault();
      select(Number(event.key) - 1);
    } else if (event.key === 'Enter' && choice) {
      event.preventDefault();
      confirm();
    }
  }
</script>

<svelte:window onkeydown={keyboard} />
<div
  bind:this={dialog}
  class="choice-overlay"
  role="dialog"
  tabindex="-1"
  aria-modal="true"
  aria-label="Choose an upgrade"
  data-game-capture
>
  <div class="choice-shell">
    <header class="choice-header">
      <div>
        <p class="eyebrow">Evolution available</p>
        <h1>
          {kind === 'specialization'
            ? 'Choose a specialization.'
            : kind === 'equipment'
              ? 'Choose equipment.'
              : 'Choose your next upgrade.'}
        </h1>
      </div>
      <div class="time">
        <span>Time remaining</span><strong
          >{Math.max(0, Math.ceil(remainingMs / 1000))}s</strong
        >
      </div>
    </header>
    {#if warning}<p class="warning" role="status">{warning}</p>{/if}
    {#if transactionError}<p class="warning" role="status">
        {transactionError}
      </p>{/if}
    <div class="choice-body">
      <div class="offers">
        {#each offers as offer, index (offer.id)}
          <button
            class:chosen={selected === offer.id}
            class="offer"
            type="button"
            aria-pressed={selected === offer.id}
            disabled={submitted}
            onclick={() => select(index)}
          >
            <span class="offer-index">0{index + 1} <kbd>{index + 1}</kbd></span>
            <span class="offer-name">{offer.name}</span>
            <span class="offer-meta"
              >{offer.rarity}{#if offer.rank > 0}
                · Rank {offer.rank}{/if}{#if offer.cost !== null}
                · Cost {offer.cost}{/if}</span
            >
            <span class="offer-description">{offer.description}</span>
            <span class="select-label"
              >{selected === offer.id ? 'Selected' : 'Select'}
              <span aria-hidden="true">↗</span></span
            >
          </button>
        {/each}
      </div>
      <aside class="map" aria-label="Live map">
        <span class="eyebrow">Live map</span>
        <svg
          viewBox="0 0 100 100"
          role="img"
          aria-label="Player positions and safe area"
        >
          <rect x="0" y="0" width="100" height="100" fill="#111" />
          {#if boundary}<circle
              cx={boundary.x}
              cy={boundary.y}
              r={boundary.radius}
              fill="none"
              stroke="#ffb829"
              stroke-width="1"
            />{/if}
          {#each mapPoints as point (point.id)}<circle
              cx={point.x}
              cy={point.y}
              r={point.self ? 2.5 : 1.5}
              fill={point.self ? '#fff' : '#bdbdbd'}
            />{/each}
        </svg>
        <p>You are protected while choosing. The boundary still harms you.</p>
      </aside>
    </div>
    <footer>
      <p>Use 1, 2, or 3 to select. Press Enter to confirm.</p>
      {#if kind === 'upgrade' && onreroll}
        <button
          type="button"
          disabled={submitted || !rerollCostAvailable || remainingMs <= 0}
          onclick={reroll}>Reroll (1 currency)</button
        >
      {/if}
      <button
        class="confirm"
        type="button"
        disabled={!choice || submitted || remainingMs <= 0}
        onclick={confirm}>Confirm selection</button
      >
    </footer>
  </div>
</div>

<style>
  .choice-overlay {
    position: fixed;
    inset: 0;
    z-index: 10;
    overflow: auto;
    background: #000;
    color: #fff;
    font-family: Inter, sans-serif;
  }
  .choice-shell {
    box-sizing: border-box;
    max-width: 1280px;
    min-height: 100%;
    margin: auto;
    padding: clamp(24px, 4vw, 60px);
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .choice-header {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    align-items: start;
  }
  .eyebrow {
    margin: 0 0 12px;
    color: #bdbdbd;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  h1 {
    margin: 0;
    font-size: clamp(36px, 4vw, 54px);
    letter-spacing: -0.04em;
    font-weight: 400;
    line-height: 1.05;
  }
  .time {
    display: grid;
    text-align: right;
    gap: 6px;
    white-space: nowrap;
    color: #bdbdbd;
    font-size: 13px;
  }
  .time strong {
    color: #ffb829;
    font-size: 30px;
    font-weight: 600;
  }
  .warning {
    margin: 0;
    color: #ffb829;
    font-size: 15px;
    font-weight: 600;
  }
  .choice-body {
    display: flex;
    gap: 36px;
    align-items: start;
    flex: 1;
  }
  .offers {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 30px;
  }
  .offer {
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: 12px;
    padding: 18px 0;
    color: #fff;
    background: none;
    border: 0;
    border-top: 1px solid #555;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .offer:hover,
  .offer:focus-visible,
  .offer.chosen {
    border-top-color: #fff;
    outline-offset: 5px;
  }
  .offer:disabled {
    cursor: default;
  }
  .offer-index,
  .offer-meta {
    color: #bdbdbd;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  kbd {
    margin-left: 6px;
    color: #fff;
    font: inherit;
  }
  .offer-name {
    font-size: 24px;
    line-height: 1.15;
    letter-spacing: -0.02em;
  }
  .offer-description {
    color: #fff;
    font-size: 16px;
    line-height: 1.5;
  }
  .select-label {
    margin-top: 6px;
    font-size: 14px;
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  .map {
    flex: 0 0 148px;
  }
  .map svg {
    display: block;
    width: 100%;
  }
  .map p,
  footer p {
    color: #bdbdbd;
    font-size: 13px;
    line-height: 1.45;
  }
  footer {
    display: flex;
    gap: 24px;
    justify-content: space-between;
    align-items: center;
  }
  .confirm {
    border: 0;
    border-radius: 24px;
    padding: 15px 24px;
    background: #8052ff;
    color: #fff;
    font: inherit;
    cursor: pointer;
  }
  .confirm:disabled {
    opacity: 0.45;
    cursor: default;
  }
  @media (max-width: 700px) {
    .choice-body {
      flex-direction: column-reverse;
    }
    .offers {
      grid-template-columns: 1fr;
    }
    .map {
      width: 120px;
    }
    footer {
      align-items: start;
      flex-direction: column;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
    }
  }
</style>
