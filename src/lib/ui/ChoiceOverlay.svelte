<script lang="ts">
  import { onMount } from 'svelte';
  import type { UpgradeIcon } from '../../../shared/match.js';
  export type Offer = {
    id: string;
    name: string;
    description: string;
    rarity: string;
    rank: number;
    cost: number | null;
    icon?: UpgradeIcon;
  };
  const icons: Record<UpgradeIcon, string> = {
    power: '◆',
    salvage: '◉',
    plating: '⬡',
    attack: '✦',
    arms: '⋔',
    movement: '➜',
    wings: '◇',
  };
  let {
    offerId,
    revision,
    offers,
    remainingMs,
    warning,
    onchoose,
    kind = 'upgrade',
    rerollCostAvailable = false,
    rerollCost = 1,
    rarityCost = null,
    rarityCostAvailable = false,
    onreroll,
    onupgrade,
    equipment,
    onequip,
  }: {
    offerId: string;
    revision: number;
    offers: readonly Offer[];
    remainingMs: number;
    warning: string | null;
    onchoose: (id: string) => Promise<boolean>;
    kind?: 'upgrade' | 'specialization' | 'equipment' | 'poi';
    rerollCostAvailable?: boolean;
    rerollCost?: number;
    rarityCost?: number | null;
    rarityCostAvailable?: boolean;
    onreroll?: () => Promise<boolean>;
    onupgrade?: () => Promise<boolean>;
    equipment?: {
      slots: Record<
        'primary' | 'secondary' | 'movement' | 'ultimate',
        string | null
      >;
      learned: {
        id: string;
        slotType: 'attack' | 'movement' | 'ultimate';
        readyAt: number;
      }[];
    };
    onequip?: (slot: string, id: string) => Promise<boolean>;
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
  async function upgrade() {
    if (!onupgrade || submitted || remainingMs <= 0) return;
    const identity = JSON.stringify([offerId, revision]);
    submitted = true;
    try {
      if (
        !(await onupgrade()) &&
        identity === JSON.stringify([offerId, revision])
      ) {
        submitted = false;
        transactionError = 'The rarity upgrade was not applied. Try again.';
      }
    } catch {
      if (identity === JSON.stringify([offerId, revision])) submitted = false;
    }
  }
  async function changeEquipment(slot: string, id: string) {
    if (!onequip || submitted || remainingMs <= 0) return;
    const identity = JSON.stringify([offerId, revision]);
    submitted = true;
    try {
      if (
        !(await onequip(slot, id)) &&
        identity === JSON.stringify([offerId, revision])
      ) {
        submitted = false;
        transactionError = 'The equipment change was not applied. Try again.';
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
    if (['1', '2', '3', '4'].includes(event.key)) {
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
  aria-label={kind === 'poi' ? 'Choose a site reward' : 'Choose an upgrade'}
  data-game-capture
>
  <div class="choice-shell">
    <header class="choice-header">
      <div>
        <p class="eyebrow">
          {kind === 'poi' ? 'Site discovered' : 'Evolution available'}
        </p>
        <h1>
          {kind === 'poi'
            ? 'Choose a site reward.'
            : kind === 'specialization'
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
    {#if equipment && onequip && (kind === 'upgrade' || kind === 'specialization')}
      <details>
        <summary>Change equipped abilities</summary>
        <p>Replacing an ability keeps it learned and preserves its cooldown.</p>
        {#each ['primary', 'secondary', 'movement', 'ultimate'] as slot (slot)}
          {@const current =
            equipment.slots[slot as keyof typeof equipment.slots]}
          <p>{slot}: {current ?? 'Empty'}</p>
          {#if current}
            <button
              type="button"
              disabled={submitted || remainingMs <= 0}
              onclick={() => changeEquipment(slot, '-')}>Unequip {slot}</button
            >
          {/if}
          {#each equipment.learned.filter((ability) => ability.slotType === (slot === 'primary' || slot === 'secondary' ? 'attack' : slot) && ability.id !== current) as ability (ability.id)}
            <button
              type="button"
              disabled={submitted || remainingMs <= 0}
              onclick={() => changeEquipment(slot, ability.id)}
              >Equip {ability.id} in {slot}</button
            >
          {/each}
        {/each}
      </details>
    {/if}
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
            <span class="offer-name"
              >{#if offer.icon}<span aria-hidden="true"
                  >{icons[offer.icon]}
                </span>{/if}{offer.name}</span
            >
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
    </div>
    <footer>
      <p>Use 1, 2, or 3 to select. Press Enter to confirm.</p>
      {#if kind === 'upgrade' && onreroll}
        <button
          type="button"
          disabled={submitted || !rerollCostAvailable || remainingMs <= 0}
          onclick={reroll}>Reroll ({rerollCost} currency)</button
        >
      {/if}
      {#if kind === 'upgrade' && onupgrade && rarityCost !== null}
        <button
          type="button"
          disabled={submitted || !rarityCostAvailable || remainingMs <= 0}
          onclick={upgrade}>Upgrade rarity ({rarityCost} currency)</button
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
