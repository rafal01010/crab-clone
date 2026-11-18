<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { MatchView, UpgradeDetail } from '../../../shared/match.js';
  import UpgradeIcon from './UpgradeIcon.svelte';
  import RarityBadge from './RarityBadge.svelte';
  import EquipmentEditor from './EquipmentEditor.svelte';
  import type { AbilitySlot } from './presentation.js';

  export type Offer = UpgradeDetail & {
    cost: number | null;
    consequence?: string;
    unavailableReason?: string | null;
  };
  let {
    offerId,
    revision,
    offers,
    remainingMs,
    warning,
    onchoose,
    kind = 'upgrade',
    pool = 'ordinary',
    protectedChoice = true,
    queued = 0,
    parentName,
    site,
    now = 0,
    currency = 0,
    connected = true,
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
    pool?: 'ordinary' | 'branching' | 'finale';
    protectedChoice?: boolean;
    queued?: number;
    parentName?: string;
    site?: NonNullable<MatchView['offer']>['site'];
    now?: number;
    currency?: number;
    connected?: boolean;
    rerollCostAvailable?: boolean;
    rerollCost?: number;
    rarityCost?: number | null;
    rarityCostAvailable?: boolean;
    onreroll?: () => Promise<boolean>;
    onupgrade?: () => Promise<boolean>;
    equipment?: MatchView['equipment'];
    onequip?: (slot: AbilitySlot, id: string) => Promise<boolean>;
  } = $props();
  type Transaction =
    | { kind: 'ready' }
    | { kind: 'pending'; label: string }
    | { kind: 'rejected'; message: string };
  let transaction = $state<Transaction>({ kind: 'ready' });
  let selected = $state<string | null>(null);
  let dialog: HTMLDivElement;
  let previousIdentity = '';
  const identity = $derived(JSON.stringify([offerId, revision]));
  const disabled = $derived(
    transaction.kind === 'pending' || remainingMs <= 0 || !connected,
  );
  const choice = $derived(offers.find((offer) => offer.id === selected));
  const title = $derived(
    kind === 'specialization'
      ? 'Choose a specialization.'
      : kind === 'equipment'
        ? 'Choose equipment.'
        : kind === 'poi'
          ? 'Choose a site reward.'
          : pool === 'branching'
            ? 'Choose a new branch.'
            : 'Choose your next upgrade.',
  );
  const timeout = $derived(
    kind === 'specialization'
      ? 'At timeout, skip this specialization and gain 10 currency.'
      : kind === 'equipment'
        ? 'At timeout, keep the current equipment.'
        : kind === 'poi'
          ? 'At timeout, leave this site unclaimed.'
          : 'At timeout, the host chooses one of the displayed upgrades.',
  );
  $effect(() => {
    if (identity !== previousIdentity) {
      previousIdentity = identity;
      selected = null;
      transaction = { kind: 'ready' };
      void tick().then(() => {
        if (dialog && !dialog.contains(document.activeElement)) dialog.focus();
      });
    }
  });
  onMount(() => {
    const previous = document.activeElement;
    dialog.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  });
  function select(index: number) {
    const offer = offers[index];
    if (!disabled && !offer?.unavailableReason) selected = offer?.id ?? null;
  }
  async function transact(label: string, action: () => Promise<boolean>) {
    if (disabled) return;
    const requestedIdentity = identity;
    transaction = { kind: 'pending', label };
    try {
      const accepted = await action();
      if (!accepted && identity === requestedIdentity)
        transaction = {
          kind: 'rejected',
          message:
            'The change was not confirmed. Check the updated choices, build, and currency before trying again.',
        };
    } catch {
      if (identity === requestedIdentity)
        transaction = {
          kind: 'rejected',
          message:
            'No confirmation received. Check the connection and try again.',
        };
    }
  }
  function confirm() {
    if (choice && !choice.unavailableReason)
      return transact('Confirming selection', () => onchoose(choice.id));
  }
  function changeEquipment(slot: AbilitySlot, id: string) {
    return transact('Applying equipment change', () =>
      onequip ? onequip(slot, id) : Promise.resolve(false),
    );
  }
  function keyboard(event: KeyboardEvent) {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Tab') {
      const elements = [
        ...dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), select:not(:disabled), summary',
        ),
      ].filter((element) => element.getClientRects().length > 0);
      const first = elements[0];
      const last = elements.at(-1);
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === dialog)
      ) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target.matches('input, textarea, select') ||
        target.closest('.equipment-area'))
    )
      return;
    if (/^[1-9]$/.test(event.key) && offers[Number(event.key) - 1]) {
      event.preventDefault();
      select(Number(event.key) - 1);
    } else if (
      event.key === 'Enter' &&
      choice &&
      (target === dialog ||
        (target instanceof HTMLButtonElement &&
          target.classList.contains('offer')))
    ) {
      event.preventDefault();
      void confirm();
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
  aria-labelledby="choice-title"
  aria-describedby="selection-rules"
  data-game-capture
>
  <div class="choice-shell">
    <div class="sticky-notice">
      <header>
        <div>
          <p class="eyebrow">
            {kind === 'specialization'
              ? `${parentName ?? 'Build'} specialization`
              : kind === 'equipment'
                ? 'Loadout decision'
                : kind === 'poi'
                  ? 'Site discovered'
                  : pool === 'branching'
                    ? 'Branching choice'
                    : pool === 'finale'
                      ? 'Finale choice'
                      : 'Level reward'}
          </p>
          <h1 id="choice-title">{title}</h1>
        </div>
        <div class="time" class:urgent={remainingMs <= 3000}>
          <span>Host deadline</span><strong
            >{Math.max(0, Math.ceil(remainingMs / 1000))}s</strong
          >
          <span>{currency} currency</span>
        </div>
      </header>
      <p id="selection-rules" class="rules">
        The world continues. {protectedChoice
          ? 'Your craft is stationary and protected from combat, but the boundary still damages you.'
          : 'You are vulnerable at this site.'}
        {timeout}
      </p>
      {#if site}<p class="rules">
          {site.discovered
            ? 'Discovery credited to you.'
            : 'Discovery credit pending.'} Discovery does not reserve or grant this
          reward. Your reservation ends in {Math.max(
            0,
            Math.ceil((site.expiresAt - now) / 1000),
          )}s. Claiming one reward consumes this site for everyone. Leaving or
          timing out releases it.
        </p>{/if}
      {#if warning}<p class="warning" role="status">{warning}</p>{/if}
      {#if !connected}<p class="warning" role="status">
          Connection interrupted. Choices are unavailable until the host
          reconnects. The deadline may pass while disconnected.
        </p>{/if}
      {#if transaction.kind === 'rejected'}<p class="warning" role="alert">
          {transaction.message}
        </p>{:else if transaction.kind === 'pending'}<p
          class="acknowledgment"
          role="status"
        >
          {transaction.label}. Waiting for the host.
        </p>{/if}
    </div>
    <div class="offers">
      {#each offers as offer, index (offer.id)}
        <article class="offer-column" data-rarity={offer.rarity}>
          <button
            class="offer"
            class:chosen={selected === offer.id}
            type="button"
            aria-pressed={selected === offer.id}
            disabled={disabled || !!offer.unavailableReason}
            onclick={() => select(index)}
          >
            <span class="offer-index"
              ><kbd>{index + 1}</kbd>{selected === offer.id
                ? 'Selected ✓'
                : 'Select option'}</span
            >
            {#if offer.rarity}<RarityBadge rarity={offer.rarity} />{:else}<span
                class="choice-type"
                >{kind === 'specialization'
                  ? offer.id === 'skip'
                    ? 'Skip reward'
                    : 'Specialization'
                  : kind === 'equipment'
                    ? 'Slot decision'
                    : 'Site reward'}</span
              >{/if}
            <span class="offer-name"
              >{#if offer.icon}<UpgradeIcon
                  kind={offer.icon}
                />{/if}{offer.name}</span
            >
            {#if offer.rank > 0}<span class="rank"
                >{offer.currentRank
                  ? `Rank ${offer.currentRank} → ${offer.rank}`
                  : `New · Rank ${offer.rank}`}{offer.maxRank
                  ? ` of ${offer.maxRank}`
                  : ''}</span
              >{/if}
            <span class="offer-description"
              >{#if offer.currentDescription}<span class="current-effect"
                  >Current. {offer.currentDescription}</span
                ><strong class="next-label">Next.</strong
                >{/if}{offer.description ||
                (offer.id === 'skip'
                  ? 'Keep your current build and receive 10 currency.'
                  : 'Choose this option to continue.')}</span
            >
            {#if offer.acquisition}<span class="acquisition"
                >Equips {offer.acquisition.slot}.{offer.acquisition.replaces
                  ? ` Replaces ${offer.acquisition.replaces}, which stays learned.`
                  : ' Fills this slot.'} Cooldowns are preserved.</span
              >{/if}
            {#if offer.cost !== null}<span>Cost {offer.cost} currency</span
              >{/if}
          </button>
          {#if offer.unavailableReason}<p class="warning">
              Unavailable. {offer.unavailableReason}
            </p>{/if}
          {#if offer.currentDescription || offer.requirements || offer.affinities?.length || offer.exclusions?.length}
            <details class="effect-details">
              <summary>Current effects and requirements</summary>
              {#if offer.currentDescription}<p>
                  <strong>Current rank {offer.currentRank}.</strong>
                  {offer.currentDescription}
                </p>
                <p>
                  <strong>Next rank {offer.rank}.</strong>
                  {offer.description}
                </p>{:else}<p>New to your build.</p>{/if}
              {#if offer.requirements}<p>
                  <strong>Requires.</strong>
                  {offer.requirements}
                </p>{/if}
              {#if offer.exclusions?.length}<p>
                  <strong>Cannot combine with.</strong>
                  {offer.exclusions.join(', ')}
                </p>{/if}
              {#if offer.affinities?.length}<p>
                  <strong>Affinities.</strong>
                  {offer.affinities.join(', ')}
                </p>{/if}
            </details>
          {/if}
        </article>
      {/each}
    </div>
    {#if equipment && onequip && (kind === 'upgrade' || kind === 'specialization')}
      <div class="equipment-area">
        {#key identity}<EquipmentEditor
            {equipment}
            {now}
            {disabled}
            onapply={changeEquipment}
          />{/key}
      </div>
    {/if}
    <footer>
      <div class="choice-help">
        <p>
          Use {offers.map((_, index) => index + 1).join(', ')} to select. Enter confirms.
          Tab reaches every action.
        </p>
        <p>
          {queued} queued {queued === 1 ? 'decision' : 'decisions'}. Queued
          choices include an exposed interval. Changes and purchases do not
          extend this deadline.
        </p>
      </div>
      <div class="actions">
        {#if kind === 'upgrade' && onreroll}<button
            type="button"
            disabled={disabled || !rerollCostAvailable}
            title={rerollCostAvailable
              ? 'Replaces these offers and clears purchased rarity boosts'
              : 'Not enough currency'}
            onclick={() => onreroll && transact('Rerolling offers', onreroll)}
            >Reroll · {rerollCost} currency{!rerollCostAvailable
              ? ' · insufficient currency'
              : ''}</button
          >{/if}
        {#if kind === 'upgrade' && onupgrade && rarityCost !== null}<button
            type="button"
            disabled={disabled || !rarityCostAvailable}
            title={rarityCostAvailable
              ? 'Raise available offer rarities for this offer only'
              : 'Not enough currency'}
            onclick={() =>
              onupgrade && transact('Raising offer rarity', onupgrade)}
            >Raise rarity · {rarityCost} currency{!rarityCostAvailable
              ? ' · insufficient currency'
              : ''}</button
          >{/if}
        <button
          class="confirm"
          type="button"
          disabled={!choice || !!choice.unavailableReason || disabled}
          onclick={confirm}
          >{remainingMs <= 0
            ? 'Deadline reached'
            : transaction.kind === 'pending'
              ? 'Waiting for host'
              : 'Confirm selection'}</button
        >
      </div>
    </footer>
  </div>
</div>

<style>
  .choice-overlay {
    zoom: var(--ui-scale, 1);
    position: fixed;
    top: 0;
    left: 0;
    width: calc(100vw / var(--ui-scale, 1));
    height: calc(100svh / var(--ui-scale, 1));
    z-index: 10;
    overflow: auto;
    background: #08090bf5;
    color: #fff;
    font-family: Inter, sans-serif;
    font-size: 14px;
  }
  .choice-shell {
    box-sizing: border-box;
    max-width: 1280px;
    min-height: 100%;
    margin: auto;
    padding: 18px 30px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .sticky-notice {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 12px 0;
    background: #08090b;
    border-bottom: 1px solid #5e6169;
  }
  header {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: start;
  }
  .eyebrow {
    margin: 0 0 8px;
    color: #bdbdbd;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  h1 {
    margin: 0;
    font-size: clamp(24px, 3vw, 38px);
    letter-spacing: -0.035em;
    font-weight: 400;
    line-height: 1.1;
  }
  .time {
    display: grid;
    text-align: right;
    gap: 3px;
    white-space: nowrap;
    color: #bdbdbd;
    font-size: 12px;
  }
  .time strong {
    color: white;
    font-size: 30px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .time.urgent strong,
  .warning {
    color: #ffb829;
  }
  .warning {
    margin: 8px 0 0;
    font-weight: 600;
    line-height: 1.4;
  }
  .rules {
    color: #d4d7dd;
    font-size: 13px;
    line-height: 1.45;
    margin: 8px 0 0;
  }
  .acknowledgment {
    margin: 8px 0 0;
    color: #d4c5ff;
  }
  .offers {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    flex: 1;
    align-items: start;
  }
  .offer-column {
    --accent: #c6cbd3;
    min-width: 0;
    border-top: 3px solid var(--accent);
  }
  [data-rarity='rare'] {
    --accent: #79b8ff;
  }
  [data-rarity='epic'] {
    --accent: #b698ff;
  }
  [data-rarity='legendary'] {
    --accent: #ffb829;
  }
  .offer {
    box-sizing: border-box;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: 12px;
    padding: 14px 12px;
    color: #fff;
    background: #0e1015;
    border: 1px solid #4d515c;
    font: inherit;
    text-align: left;
    cursor: pointer;
    overflow-wrap: anywhere;
  }
  .offer.chosen {
    border: 2px solid white;
    padding: 13px 11px;
    background: #1b1c23;
  }
  .offer:disabled {
    cursor: default;
  }
  .offer-index,
  .rank,
  .choice-type {
    color: #d0d3db;
    font-size: 12px;
    font-weight: 600;
  }
  .offer-index {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  kbd {
    border: 1px solid #8b91a0;
    padding: 2px 6px;
    font: inherit;
  }
  .offer-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 23px;
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }
  .offer-description {
    font-size: 15px;
    line-height: 1.5;
  }
  .current-effect {
    display: block;
    color: #bdbdbd;
    font-size: 13px;
    margin-bottom: 8px;
  }
  .next-label {
    margin-right: 4px;
    font-weight: 600;
  }
  .acquisition {
    border-top: 1px solid #656977;
    padding-top: 8px;
    color: #d6d9e3;
    font-size: 13px;
    line-height: 1.4;
  }
  .effect-details {
    font-size: 13px;
    line-height: 1.5;
    padding: 10px 12px;
    background: #0e1015;
    border: 1px solid #4d515c;
    border-top: 0;
    overflow-wrap: anywhere;
  }
  summary {
    cursor: pointer;
  }
  .effect-details p {
    margin: 8px 0 0;
  }
  footer {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid #5e6169;
    padding-top: 12px;
  }
  .choice-help {
    max-width: 430px;
  }
  footer p {
    color: #c6cbd3;
    font-size: 12px;
    line-height: 1.45;
    margin: 4px 0;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .actions button {
    padding: 10px 14px;
    background: transparent;
    border: 1px solid #777e90;
    border-radius: 22px;
    color: white;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }
  .actions .confirm {
    background: #8052ff;
    border-color: #8052ff;
  }
  .actions button:disabled {
    opacity: 0.55;
    cursor: default;
  }
  :is(button, summary):focus-visible {
    outline: 2px solid #ffb829;
    outline-offset: 3px;
  }
  @media (max-width: 700px) {
    .choice-shell {
      padding: 12px;
    }
    .offers {
      grid-template-columns: 1fr;
    }
    .sticky-notice {
      position: static;
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
