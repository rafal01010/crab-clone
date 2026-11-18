<script lang="ts">
  import { usePreferences, actionLabel } from '../game-client/preferences.js';
  const preferences = usePreferences();
  import type { MatchView } from '../../../shared/match.js';
  import { terrainAt } from '../../../shared/arena.js';
  import UpgradeIcon from './UpgradeIcon.svelte';
  import {
    ABILITY_SLOTS,
    abilityName,
    salvageName,
    timeLabel,
  } from './presentation.js';
  import WorldInteractions from './WorldInteractions.svelte';
  import BuildGuide from './BuildGuide.svelte';

  let {
    state,
    playerId,
    oninteract,
    onuse,
    onshelter,
    oncharm,
    onnumbers,
    connected = true,
    notice = null,
  }: {
    state: MatchView;
    playerId: string;
    oninteract: (id: string) => Promise<boolean>;
    onuse: (id: string) => Promise<boolean>;
    onshelter: (id: string) => Promise<boolean>;
    oncharm: (id: string) => void;
    onnumbers: (enabled: boolean) => void;
    connected?: boolean;
    notice?: string | null;
  } = $props();
  const me = $derived(state.players.find((player) => player.id === playerId));
  const observed = $derived(
    state.players.find(
      (player) => player.id === (state.spectating ?? playerId),
    ),
  );
  const localBiome = $derived(
    observed
      ? terrainAt(state.arena, observed.position.x, observed.position.z)
      : null,
  );
  const localWeather = $derived(
    state.weather.find((weather) => weather.biome === localBiome),
  );
  const outsideSafeZone = $derived(
    me?.life.kind === 'alive' &&
      state.boundary.elapsedMs < state.boundary.collapseAtMs &&
      Math.hypot(me.position.x, me.position.z) > state.boundary.radius,
  );
  const canAct = $derived(
    connected &&
      me?.life.kind === 'alive' &&
      me.life.activity === 'playing' &&
      !me.statuses.some((status) => status.kind === 'stun'),
  );
  const canUseAbilities = $derived(canAct && !me?.shelter);
  const hit = $derived(
    state.feedback?.findLast(
      (event) =>
        event.localAttacker &&
        event.at >= state.time - 700 &&
        event.kind !== 'repair' &&
        event.kind !== 'salvage' &&
        event.kind !== 'reward',
    ),
  );
  const hitLabels = {
    hull: 'Hull hit',
    plating: 'Plating absorbed',
    break: 'Plating broken',
    dodge: 'Dodged',
    blocked: 'Blocked',
    repair: 'Repair',
    salvage: 'Salvaged',
    reward: 'Level gained',
  };

  const near = $derived(
    me?.life.kind === 'alive'
      ? state.resources
          .filter(
            (resource) =>
              Math.hypot(
                resource.position.x - me.position.x,
                resource.position.z - me.position.z,
              ) <=
              (me.stats?.salvageReach ?? 0) + 2,
          )
          .slice(0, 3)
      : [],
  );
  const nearbyBots = $derived(
    me?.life.kind === 'alive'
      ? state.bots.filter(
          (bot) =>
            bot.ownerId !== playerId &&
            bot.friendshipUntil !== null &&
            bot.friendshipUntil > state.time &&
            Math.hypot(
              bot.position.x - me.position.x,
              bot.position.z - me.position.z,
            ) <= 3,
        )
      : [],
  );
</script>

<div class="hud" aria-label="Match status">
  {#if hit}<output
      class="hit-confirmation"
      class:damage={hit.hull + hit.plating > 0}
      aria-label="Attack outcome"
      >{hit.lethal ? 'Target eliminated' : hitLabels[hit.kind]}</output
    >{/if}
  <div class="panel vitals">
    <div class="match-clock">
      <strong>{timeLabel(state.boundary.elapsedMs)}</strong><span
        >{state.survivors}
        {state.survivors === 1 ? 'survivor' : 'survivors'}</span
      ><span
        >{state.worldClock.phase === 'day' ? 'Day' : 'Night'} · {Math.max(
          0,
          Math.ceil((state.worldClock.nextTransitionAt - state.time) / 1000),
        )}s</span
      >
    </div>
    {#if me}
      <div class="health-label">
        <strong>Hull</strong><span
          >{Math.ceil(me.health.hull)} / {Math.ceil(
            me.stats?.maximumHealth ?? me.health.hull,
          )}</span
        >
      </div>
      <progress
        class="hull"
        aria-label="Hull"
        value={me.health.hull}
        max={me.stats?.maximumHealth || 1}
      ></progress>
      <div class="health-label plating-label">
        <span>Plating</span><span
          >{Math.ceil(me.health.plating)} / {Math.ceil(
            me.stats?.plating ?? me.health.plating,
          )}</span
        >
      </div>
      <progress
        class="plating"
        aria-label="Plating"
        value={me.health.plating}
        max={me.stats?.plating || 1}
      ></progress>
      <div class="health-label">
        <span>Level {state.progression.level}</span><span
          >{Math.floor(state.progression.progress)} / {Math.ceil(
            state.progression.required,
          )} XP</span
        >
      </div>
      <progress
        class="experience"
        aria-label="Experience"
        value={state.progression.progress}
        max={state.progression.required}
      ></progress>
      <div class="status-list" aria-label="Active statuses">
        {#each me.statuses as status, index (index)}<span
            >{status.kind} · {Math.ceil(status.remaining / 1000)}s</span
          >{/each}
      </div>
      {#if me.life.kind === 'eliminated'}<strong
          >Eliminated. Your build is shown here.</strong
        >{:else if me.life.activity === 'selecting'}<strong
          >Choosing. World continues.</strong
        >{:else if me.life.activity === 'awaiting-choice-window'}<strong
          class="risk">Exposed between choices.</strong
        >{/if}
      {#if me.shelter}<span
          >Hidden in shelter · forced exit in {Math.max(
            0,
            Math.ceil((me.shelter.until - state.time) / 1000),
          )}s</span
        >{/if}
    {/if}
    <div class="economy">
      <span>{state.progression.currency} currency</span><span
        >{state.progression.pending} upgrades queued</span
      >
    </div>
    {#if state.thermal}<div class="temperature">
        <span>Heat {Math.round(state.thermal.heat)}%</span><span
          >Cold {Math.round(state.thermal.cold)}%</span
        >
      </div>{/if}
    {#if state.progression.storedSalvage > 0}<span
        >Stored salvage {state.progression.storedSalvage}</span
      >{/if}
    {#if state.progression.basking}<span
        >Solar Charging {state.progression.basking.active
          ? `${Math.ceil(state.progression.basking.remainingMs / 1000)}s`
          : 'paused'}</span
      >{/if}
    <span class="risk"
      >Overload {state.progression.carcinisation} · +{Math.round(
        state.progression.carcinisationDamage * 100,
      )}% incoming damage</span
    >
    <BuildGuide match={state} player={me} {onnumbers} />
  </div>
  <div class="warnings" role="status">
    {#if state.meteors.length}<strong
        >{me?.life.kind === 'eliminated'
          ? 'Meteor incoming.'
          : 'Danger: meteor incoming. Leave the marked ring.'}</strong
      >{/if}
    {#if outsideSafeZone}
      <strong>Outside the safe zone. Return to avoid boundary damage.</strong>
    {/if}
    {#if state.boundary.elapsedMs >= state.boundary.collapseAtMs}
      <strong>The safe zone has collapsed.</strong>
    {:else if state.boundary.elapsedMs >= state.boundary.shrinkStartMs}
      <strong
        >Danger: boundary closing. Collapse in {Math.ceil(
          Math.max(0, state.boundary.collapseAtMs - state.boundary.elapsedMs) /
            1000,
        )}s.</strong
      >
    {:else if state.boundary.shrinkStartMs - state.boundary.elapsedMs <= 60000}
      <strong
        >Boundary closes in {Math.ceil(
          (state.boundary.shrinkStartMs - state.boundary.elapsedMs) / 1000,
        )}s.</strong
      >
    {/if}
    {#if localWeather}
      <strong
        >{localWeather.kind === 'heatwave'
          ? 'Heatwave'
          : localWeather.kind === 'blizzard'
            ? 'Blizzard'
            : 'Rain'}
        {localWeather.state === 'warning'
          ? `in ${Math.max(0, Math.ceil((localWeather.startsAt - state.time) / 1000))}s`
          : `active · ends in ${Math.max(0, Math.ceil((localWeather.endsAt - state.time) / 1000))}s`}.</strong
      >
    {/if}
    {#if state.thermal && (state.thermal.heat >= 100 || state.thermal.cold >= 100)}
      <strong
        >{state.thermal.heat >= 100
          ? 'Heat exposure is dangerous.'
          : 'Cold exposure slows movement.'}</strong
      >
    {/if}
    {#each state.nestDefenses as nest (nest.siteId)}
      <span
        >Protect the dock · {Math.ceil(
          Math.max(0, nest.endsAt - state.time) / 1000,
        )}s · integrity {Math.ceil(nest.health)}</span
      >
    {/each}
    {#if state.radar.length}
      <div class="radar">
        {#each state.radar as hint (`${hint.kind}:${hint.direction}:${hint.distance}`)}
          <span
            >{hint.kind === 'elite'
              ? 'Elite'
              : hint.kind === 'firmware'
                ? 'Firmware'
                : 'Site'} · {hint.direction} · {hint.distance}</span
          >
        {/each}
      </div>
    {/if}
  </div>
  <aside class="interactions" aria-label="Nearby interactions">
    <WorldInteractions
      match={state}
      player={me}
      {connected}
      {oninteract}
      {onuse}
      {onshelter}
      {notice}
    />
    {#if state.bots.some((bot) => bot.friendshipUntil !== null && bot.friendshipUntil > state.time)}<span
        >A bot with green diamonds is available to recruit. Approach and press {actionLabel(
          preferences,
          'interact',
        )}; attacking cancels the offer.</span
      >{/if}
    {#each nearbyBots as bot (bot.id)}
      <button
        class="site-action"
        disabled={!canAct || !!me?.shelter}
        onclick={() => oncharm(bot.id)}
        >Recruit bot · {actionLabel(preferences, 'interact')}</button
      >
    {/each}
    {#if state.lastCharm && state.time - state.lastCharm.at < 5000}<span
        >{state.lastCharm.success
          ? 'Bot recruited.'
          : 'Recruitment failed.'}</span
      >{/if}
    {#each near as resource (resource.id)}
      <span
        >{salvageName[resource.source]} · {resource.rarity} · stage {resource.stage +
          1} / 4{resource.repair ? ' · repairs hull' : ''}. Move close to
        collect.</span
      >
    {/each}
  </aside>
  <div class="slots" aria-label="Abilities">
    {#each ABILITY_SLOTS as slot (slot.id)}
      {@const id = state.equipment.slots[slot.id]}
      {@const ability = state.equipment.learned.find((item) => item.id === id)}
      {@const cooldown = Math.max(
        0,
        (ability?.readyAt ??
          (slot.id === 'primary' ? state.equipment.basicReadyAt : 0)) -
          state.time,
      )}
      <div
        class="panel slot"
        class:unavailable={!canUseAbilities || (!id && slot.id !== 'primary')}
        class:cooling={cooldown > 0}
      >
        <div class="slot-key">
          <kbd>{actionLabel(preferences, slot.id)}</kbd><span>{slot.label}</span
          >
        </div>
        <strong class="ability-name"
          >{#if ability?.icon}<UpgradeIcon
              kind={ability.icon}
            />{/if}{abilityName(state.equipment, id, slot.id)}</strong
        >
        {#if ability?.ammunition}<span
            >Ammo {ability.ammunition.charges} / {ability.ammunition
              .capacity}</span
          >{/if}
        <span class="readiness"
          >{!connected
            ? 'Disconnected'
            : me?.shelter
              ? 'Inside shelter'
              : !canUseAbilities
                ? 'Unavailable'
                : id || slot.id === 'primary'
                  ? ability?.ammunition && ability.ammunition.charges === 0
                    ? `Reloading · ${Math.max(0, Math.ceil((ability.ammunition.nextAt - state.time) / 1000))}s`
                    : cooldown > 0
                      ? `Ready in ${(cooldown / 1000).toFixed(1)}s`
                      : 'Ready'
                  : 'No ability equipped'}</span
        >
        {#if ability?.cooldownMs}<progress
            aria-label={`${ability.name ?? id} readiness`}
            value={Math.max(0, ability.cooldownMs - cooldown)}
            max={ability.cooldownMs}
          ></progress>{/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .hud {
    zoom: var(--ui-scale, 1);
    position: absolute;
    top: 0;
    left: 0;
    width: calc(100vw / var(--ui-scale, 1));
    height: calc(100svh / var(--ui-scale, 1));
    pointer-events: none;
    color: white;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.35;
  }
  .panel {
    background: #080b10ed;
    border: 1px solid #666f80;
    border-radius: 4px;
    padding: 10px;
  }
  .vitals {
    position: absolute;
    top: 12px;
    left: 12px;
    width: 250px;
    max-height: calc(100% - 160px);
    overflow-y: auto;
    pointer-events: auto;
    display: grid;
    gap: 6px;
  }
  .match-clock,
  .economy,
  .temperature,
  .health-label,
  .slot-key {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    font-variant-numeric: tabular-nums;
  }
  .match-clock {
    font-size: 11px;
    color: #c6cbd3;
  }
  .match-clock strong {
    font-size: 18px;
    color: white;
  }
  .health-label {
    margin-top: 3px;
  }
  .health-label strong {
    font-size: 17px;
  }
  .plating-label {
    color: #b8d6ff;
  }
  progress {
    display: block;
    width: 100%;
    height: 6px;
    border: 0;
    border-radius: 0;
    accent-color: #a3d6b0;
  }
  progress::-webkit-progress-bar {
    background: #303746;
  }
  progress::-webkit-progress-value {
    background: #a3d6b0;
  }
  progress::-moz-progress-bar {
    background: #a3d6b0;
  }
  .plating,
  .experience {
    height: 4px;
  }
  .plating::-webkit-progress-value {
    background: #79b8ff;
  }
  .experience::-webkit-progress-value {
    background: #b698ff;
  }
  .plating::-moz-progress-bar {
    background: #79b8ff;
  }
  .experience::-moz-progress-bar {
    background: #b698ff;
  }
  .status-list {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .status-list:empty {
    display: none;
  }
  .status-list span {
    border: 1px solid #ffb829;
    color: #ffcf74;
    padding: 2px 5px;
    font-size: 12px;
  }
  .risk {
    color: #ffb829;
  }
  .economy,
  .temperature {
    font-size: 12px;
  }
  .warnings {
    position: absolute;
    top: 12px;
    left: 294px;
    right: 294px;
    display: grid;
    gap: 5px;
  }
  .warnings > :is(strong, span),
  .radar span {
    background: #080b10ed;
    padding: 6px 10px;
    border-left: 3px solid #ffb829;
    font-size: 13px;
  }
  .radar {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .radar span {
    padding: 3px 6px;
    border-left-color: #8b91a0;
    font-size: 12px;
  }
  .warnings:empty {
    display: none;
  }
  .interactions {
    pointer-events: auto;
    overscroll-behavior: contain;
    position: absolute;
    top: 12px;
    right: 12px;
    width: 250px;
    max-height: calc(100% - 150px);
    overflow-y: auto;
    display: grid;
    gap: 6px;
  }
  .interactions > :global(*) {
    background: #080b10ed;
    padding: 7px 10px;
    font-size: 12px;
  }
  .site-action {
    pointer-events: auto;
    text-align: left;
    text-transform: capitalize;
    cursor: pointer;
    border: 1px solid #8b91a0;
    border-radius: 4px;
    color: white;
    font: inherit;
  }
  .site-action:disabled {
    color: #a0a4ad;
    cursor: default;
  }
  .slots {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    width: min(760px, calc(100% - 412px));
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }
  .slot {
    display: grid;
    align-content: start;
    gap: 6px;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .slot-key {
    color: #c6cbd3;
    font-size: 11px;
  }
  kbd {
    border: 1px solid #818b9d;
    padding: 2px 5px;
    font: inherit;
    color: white;
  }
  .ability-name {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
  }
  .readiness {
    font-size: 12px;
  }
  .unavailable {
    border-style: dashed;
    color: #b6bac3;
  }
  .cooling .readiness {
    color: #ffcf74;
  }
  .hit-confirmation {
    position: absolute;
    left: 50%;
    top: 56%;
    transform: translateX(-50%);
    background: #101722ee;
    border: 1px solid #bdbdbd;
    border-radius: 4px;
    padding: 5px 10px;
    font-size: 13px;
    color: white;
  }
  .hit-confirmation.damage {
    border-color: #ffbc51;
  }
  button:focus-visible {
    outline: 2px solid #ffb829;
    outline-offset: 3px;
  }
  @media (max-width: 980px) {
    .vitals {
      width: 190px;
    }
    .warnings {
      left: 230px;
      right: 12px;
    }
    .interactions {
      top: 170px;
      width: 180px;
      max-height: 35%;
    }
    .slots {
      width: calc(100% - 24px);
      gap: 3px;
      bottom: 56px;
    }
    .slot {
      padding: 5px;
    }
    .ability-name {
      font-size: 12px;
    }
  }
</style>
