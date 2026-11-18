<script lang="ts">
  import { usePreferences, actionLabel } from '../game-client/preferences.js';
  const preferences = usePreferences();
  import type { MatchView } from '../../../shared/match.js';
  import {
    ABILITY_SLOTS,
    abilityName,
    type AbilitySlot,
  } from './presentation.js';
  import RarityBadge from './RarityBadge.svelte';
  import UpgradeIcon from './UpgradeIcon.svelte';

  let {
    equipment,
    now,
    disabled,
    onapply,
  }: {
    equipment: MatchView['equipment'];
    now: number;
    disabled: boolean;
    onapply: (slot: AbilitySlot, id: string) => Promise<void>;
  } = $props();
  let draft = $state<{ slot: AbilitySlot; id: string | null } | null>(null);
  const next = $derived(
    equipment.learned.find((item) => item.id === draft?.id),
  );
  const movedFrom = $derived(
    draft?.id
      ? ABILITY_SLOTS.find(
          (slot) =>
            slot.id !== draft?.slot && equipment.slots[slot.id] === draft?.id,
        )
      : undefined,
  );
</script>

<details class="equipment-editor">
  <summary>Arrange learned abilities</summary>
  <p class="rules">
    Replacing a slot keeps the old ability learned and retains its passive
    benefits. Cooldowns keep running. Changes use this choice's remaining time.
  </p>
  <div class="loadout">
    {#each ABILITY_SLOTS as slot (slot.id)}
      {@const current = equipment.slots[slot.id]}
      {@const ability = equipment.learned.find((item) => item.id === current)}
      <div class="slot">
        <strong
          >{slot.label} <kbd>{actionLabel(preferences, slot.id)}</kbd></strong
        >
        <span class="equipped"
          >{#if ability?.icon}<UpgradeIcon
              kind={ability.icon}
            />{/if}{abilityName(equipment, current, slot.id)}</span
        >
        {#if ability?.rarity}<RarityBadge rarity={ability.rarity} />{/if}
        {#if ability?.rank}<span>Rank {ability.rank}</span>{/if}
        {#if ability}<span class="cooldown"
            >{ability.readyAt > now
              ? `Ready in ${Math.ceil((ability.readyAt - now) / 1000)}s`
              : 'Ready'}{ability.cooldownMs
              ? ` · ${ability.cooldownMs / 1000}s cooldown`
              : ''}</span
          >{/if}
        <label>
          Replace {slot.label.toLowerCase()}
          <select
            {disabled}
            value={draft?.slot === slot.id
              ? (draft.id ?? '-')
              : (current ?? '-')}
            onchange={(event) =>
              (draft = {
                slot: slot.id,
                id:
                  event.currentTarget.value === '-'
                    ? null
                    : event.currentTarget.value,
              })}
          >
            <option value="-"
              >{slot.id === 'primary' ? 'Basic strike' : 'Empty'}</option
            >
            {#each equipment.learned.filter((item) => item.slotType === slot.type) as candidate (candidate.id)}
              <option value={candidate.id}
                >{candidate.name ?? 'Unknown ability'}{candidate.id === current
                  ? ' · equipped'
                  : ''}</option
              >
            {/each}
          </select>
        </label>
      </div>
    {/each}
  </div>
  {#if draft && equipment.slots[draft.slot] !== draft.id}
    <div class="consequence" role="status">
      <strong
        >{draft.slot} will use {abilityName(
          equipment,
          draft.id,
          draft.slot,
        )}.</strong
      >
      <p>
        {abilityName(equipment, equipment.slots[draft.slot], draft.slot)} leaves this
        slot.{equipment.slots[draft.slot] ? ' It stays learned.' : ''}
        {#if movedFrom}Moves from {movedFrom.label.toLowerCase()}, which becomes {movedFrom.id ===
          'primary'
            ? 'Basic strike'
            : 'empty'}.{/if}
      </p>
      {#if next?.description}<p>{next.description}</p>{/if}
      <button
        type="button"
        {disabled}
        onclick={() => draft && onapply(draft.slot, draft.id ?? '-')}
        >Apply slot change</button
      >
      <button type="button" {disabled} onclick={() => (draft = null)}
        >Cancel change</button
      >
    </div>
  {/if}
</details>

<style>
  .equipment-editor {
    border-top: 1px solid #626877;
    padding-top: 12px;
  }
  summary {
    cursor: pointer;
    width: fit-content;
    font-weight: 600;
  }
  .rules,
  .cooldown,
  label {
    color: #c6cbd3;
    font-size: 13px;
    line-height: 1.5;
  }
  .loadout {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }
  .slot {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px;
    border: 1px solid #525766;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  kbd {
    font: inherit;
    font-size: 11px;
    color: #bdbdbd;
  }
  .equipped {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  label {
    margin-top: auto;
    display: grid;
    gap: 4px;
  }
  select {
    min-width: 0;
    width: 100%;
    background: #101116;
    color: white;
    padding: 8px;
    border: 1px solid #777;
    font: inherit;
  }
  .consequence {
    margin-top: 12px;
    padding: 12px;
    border-left: 3px solid #ffb829;
    background: #151515;
    font-size: 14px;
  }
  .consequence p {
    margin: 8px 0;
  }
  button {
    margin: 4px 8px 0 0;
    padding: 8px 14px;
    background: transparent;
    color: white;
    border: 1px solid #bdbdbd;
    border-radius: 18px;
    font: inherit;
    cursor: pointer;
  }
  button:disabled,
  select:disabled {
    opacity: 0.55;
    cursor: default;
  }
  :is(button, select, summary):focus-visible {
    outline: 2px solid #ffb829;
    outline-offset: 3px;
  }
  @media (max-width: 700px) {
    .loadout {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
