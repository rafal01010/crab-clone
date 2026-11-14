<script lang="ts">
  import type { MatchView } from '../../../shared/match.js';

  let { state, playerId }: { state: MatchView; playerId: string } = $props();
  const me = $derived(state.players.find((player) => player.id === playerId));
  const canAct = $derived(
    me?.life.kind === 'alive' &&
      me.life.activity === 'playing' &&
      !me.statuses.some((status) => status.kind === 'stun'),
  );
  const seconds = $derived(Math.floor(state.boundary.elapsedMs / 1000));
  const near = $derived(
    me
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
  const slots = [
    { id: 'primary', label: 'Primary', key: 'Mouse 1' },
    { id: 'secondary', label: 'Secondary', key: 'Mouse 2' },
    { id: 'movement', label: 'Movement', key: 'Space' },
    { id: 'ultimate', label: 'Ultimate', key: 'Q' },
  ] as const;
</script>

<div class="hud" aria-label="Match status">
  <div class="panel vitals">
    <strong
      >Running · Survivors {state.survivors} / 4 · {Math.floor(
        seconds / 60,
      )}:{String(seconds % 60).padStart(2, '0')}</strong
    >
    {#if me}
      <span
        >Hull {Math.ceil(me.health.hull)} / {Math.ceil(
          me.stats?.maximumHealth ?? me.health.hull,
        )}</span
      >
      <progress
        aria-label="Hull"
        value={me.health.hull}
        max={me.stats?.maximumHealth || 1}
      ></progress>
      <span
        >Plating {Math.ceil(me.health.plating)} / {Math.ceil(
          me.stats?.plating ?? me.health.plating,
        )}</span
      >
      <progress
        aria-label="Plating"
        value={me.health.plating}
        max={me.stats?.plating || 1}
      ></progress>
      <span
        >Level {state.progression.level} · XP {Math.floor(
          state.progression.progress,
        )} / {Math.ceil(state.progression.required)}</span
      >
      <progress
        aria-label="Experience"
        value={state.progression.progress}
        max={state.progression.required}
      ></progress>
      {#if me.statuses.length}<span
          >Status: {me.statuses
            .map(
              (status) =>
                `${status.kind} ${Math.ceil(status.remaining / 1000)}s`,
            )
            .join(', ')}</span
        >{/if}
    {/if}
    <span
      >Carcinisation {state.progression.carcinisation} · incoming combat damage +{Math.round(
        state.progression.carcinisationDamage * 100,
      )}% · rarity chance +{Math.round(
        state.progression.carcinisationRarity * 100,
      )}%</span
    >
    <span
      >Affinities: {state.progression.affinities
        .map((affinity) => `${affinity.id} ${affinity.rank}`)
        .join(', ') || 'None'}</span
    >
    <span
      >Currency {state.progression.currency} · pending upgrades {state
        .progression.pending}</span
    >
    {#if state.progression.depletedRewards > 0}<span
        >No legal upgrade available for {state.progression.depletedRewards} level
        reward(s).</span
      >{/if}
    <span>Temperature — · Sensing —</span>
  </div>
  <div class="panel map">
    <strong>Minimap</strong>
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label="Observed players and closing boundary"
    >
      <rect x="0" y="0" width="100" height="100" fill="#263b3d" />
      <circle
        cx="50"
        cy="50"
        r={(state.boundary.radius * 100) / 64}
        fill="none"
        stroke="#ffce72"
        stroke-width="1.5"
      />
      {#each state.players.filter((player) => player.life.kind === 'alive') as player (player.id)}
        {#if player.id === playerId}
          <rect
            x={((player.position.x + 32) * 100) / 64 - 2.5}
            y={((player.position.z + 32) * 100) / 64 - 2.5}
            width="5"
            height="5"
            fill="#fff"
          />
        {:else}
          <circle
            cx={((player.position.x + 32) * 100) / 64}
            cy={((player.position.z + 32) * 100) / 64}
            r="2.5"
            fill="#ff8665"
          />
        {/if}
      {/each}
    </svg>
  </div>
  <div class="panel warnings" role="status">
    {#if state.boundary.elapsedMs >= state.boundary.shrinkStartMs}
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
    {#if state.meteors.length}<strong
        >Danger: meteor incoming. Leave the red ring.</strong
      >{/if}
    {#each near as resource (resource.id)}
      <span
        >Salvage {resource.source} · {resource.rarity} · stage {resource.stage +
          1} / 4{resource.repair ? ' · repairs hull' : ''}. Move close to
        collect.</span
      >
    {/each}
  </div>
  <div class="slots" aria-label="Abilities">
    {#each slots as slot (slot.id)}
      {@const id = state.equipment.slots[slot.id]}
      {@const ability = state.equipment.learned.find((item) => item.id === id)}
      {@const cooldown = Math.max(
        0,
        Math.max(ability?.readyAt ?? 0, state.equipment.basicReadyAt) -
          state.time,
      )}
      <div class="panel slot">
        <strong>{slot.label} · {slot.key}</strong>
        <span>{id ?? (slot.id === 'primary' ? 'Basic strike' : 'Empty')}</span>
        <span
          >{!canAct
            ? 'Unavailable'
            : id || slot.id === 'primary'
              ? cooldown > 0
                ? `Ready in ${Math.ceil(cooldown / 1000)}s`
                : 'Ready'
              : 'Unavailable'}</span
        >
      </div>
    {/each}
  </div>
</div>

<style>
  .hud {
    position: absolute;
    inset: 0;
    pointer-events: none;
    color: white;
    font-size: 12px;
  }
  .panel {
    background: rgb(0 0 0 / 88%);
    border: 1px solid #809098;
    border-radius: 4px;
    padding: 7px;
  }
  .vitals {
    position: absolute;
    top: 8px;
    left: 8px;
    width: min(245px, 27%);
    display: grid;
    gap: 3px;
  }
  progress {
    width: 100%;
    height: 7px;
  }
  .map {
    position: absolute;
    right: 8px;
    top: 8px;
    width: min(130px, 16%);
    display: grid;
    gap: 4px;
  }
  svg {
    width: 100%;
    border: 1px solid #85938b;
    overflow: hidden;
  }
  .warnings {
    position: absolute;
    top: 8px;
    left: 30%;
    width: 36%;
    display: grid;
    gap: 3px;
  }
  .warnings:empty {
    display: none;
  }
  .slots {
    position: absolute;
    bottom: 8px;
    left: 25%;
    right: 25%;
    display: flex;
    gap: 4px;
  }
  .slot {
    flex: 1;
    display: grid;
    gap: 3px;
    min-width: 0;
    overflow-wrap: anywhere;
  }
</style>
