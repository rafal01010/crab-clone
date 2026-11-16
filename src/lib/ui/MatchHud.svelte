<script lang="ts">
  import type { MatchView } from '../../../shared/match.js';
  import { terrainAt } from '../../../shared/arena.js';
  import { FIRMWARE_SCAN_RANGE } from '../../../shared/firmware.js';

  let {
    state,
    playerId,
    oninteract,
    onscan,
    onuse,
    onshelter,
    oncharm,
  }: {
    state: MatchView;
    playerId: string;
    oninteract: (id: string) => void;
    onscan: (id: string) => void;
    onuse: (id: string) => void;
    onshelter: (id: string) => void;
    oncharm: (id: string) => void;
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
  const canAct = $derived(
    me?.life.kind === 'alive' &&
      me.life.activity === 'playing' &&
      !me.statuses.some((status) => status.kind === 'stun'),
  );
  const seconds = $derived(Math.floor(state.boundary.elapsedMs / 1000));
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
  const nearbySites = $derived(
    me?.life.kind === 'alive'
      ? state.pointsOfInterest.filter(
          (site) =>
            Math.hypot(
              site.position.x - me.position.x,
              site.position.z - me.position.z,
            ) <= 3,
        )
      : [],
  );
  const nearbyFirmware = $derived(
    me?.life.kind === 'alive'
      ? state.firmware.filter(
          (module) =>
            Math.hypot(
              module.position.x - me.position.x,
              module.position.z - me.position.z,
            ) <= FIRMWARE_SCAN_RANGE,
        )
      : [],
  );
  const nearbyShelters = $derived(
    me?.life.kind === 'alive'
      ? state.shelters.filter(
          (site) =>
            Math.hypot(
              site.position.x - me.position.x,
              site.position.z - me.position.z,
            ) <= 3 || me.shelter?.id === site.id,
        )
      : [],
  );
  const nearbyBots = $derived(
    me?.life.kind === 'alive'
      ? state.bots.filter(
          (bot) =>
            bot.ownerId !== playerId &&
            (bot.kind === 'wild' || bot.kind === 'charmed') &&
            Math.hypot(
              bot.position.x - me.position.x,
              bot.position.z - me.position.z,
            ) <= 3,
        )
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
    <span
      >{state.worldClock.phase === 'day' ? 'Day' : 'Night'} · next phase in {Math.max(
        0,
        Math.ceil((state.worldClock.nextTransitionAt - state.time) / 1000),
      )}s</span
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
      {#if state.progression.storedSalvage > 0}
        <span>Stored salvage: {state.progression.storedSalvage}</span>
      {/if}
      {#if state.progression.basking}
        <span>
          Basking {state.progression.basking.active
            ? `${Math.ceil(state.progression.basking.remainingMs / 1000)}s`
            : 'paused'}
        </span>
      {/if}
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
    {#if state.progression.upgrades.length}
      <details data-game-capture>
        <summary>Your upgrades</summary>
        {#each state.progression.upgrades as upgrade (upgrade.id)}
          <p>
            {upgrade.name} · {upgrade.rarity} · rank {upgrade.rank}. {upgrade.description}
          </p>
        {/each}
      </details>
    {/if}
    {#if state.progression.depletedRewards > 0}<span
        >No legal upgrade available for {state.progression.depletedRewards} level
        reward(s).</span
      >{/if}
    {#if state.thermal}
      <span
        >Heat {Math.round(state.thermal.heat)}% · Cold {Math.round(
          state.thermal.cold,
        )}%</span
      >
    {/if}
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
    {#each state.radar as hint (`${hint.kind}:${hint.direction}:${hint.distance}`)}
      <span
        >{hint.kind === 'elite' ? 'Elite' : 'Site'} · {hint.direction} · {hint.distance}</span
      >
    {/each}
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
        >{me?.life.kind === 'eliminated'
          ? 'Meteor incoming.'
          : 'Danger: meteor incoming. Leave the red ring.'}</strong
      >{/if}
    {#each state.nestDefenses as nest (nest.siteId)}
      <span
        >Defend the egg · {Math.ceil(
          Math.max(0, nest.endsAt - state.time) / 1000,
        )}s · integrity {Math.ceil(nest.health)}</span
      >
    {/each}
    {#each nearbySites as site (site.id)}
      <button
        class="site-action"
        disabled={!canAct || site.status !== 'available'}
        onclick={() => oninteract(site.id)}
      >
        {site.kind.replaceAll('-', ' ')} · {site.status === 'available'
          ? 'Interact (E)'
          : site.status}
      </button>
    {/each}
    {#each nearbyShelters as site (site.id)}
      <button
        class="site-action"
        disabled={!canAct || (site.occupied && me?.shelter?.id !== site.id)}
        onclick={() => onshelter(site.id)}
        >{me?.shelter?.id === site.id
          ? 'Exit shelter'
          : 'Enter shelter'}</button
      >
    {/each}
    {#each nearbyBots as bot (bot.id)}
      <button
        class="site-action"
        disabled={!canAct || !!me?.shelter}
        onclick={() => oncharm(bot.id)}>Charm nearby creature</button
      >
    {/each}
    {#if state.firmwareSensory.deafened}<span>Deafening effect active</span
      >{/if}
    {#if state.lastCharm && state.time - state.lastCharm.at < 5000}<span
        >{state.lastCharm.success
          ? 'Creature charmed.'
          : 'Charm failed. Try again shortly.'}</span
      >{/if}
    {#if state.lastFirmware && state.time - state.lastFirmware.at < 5000}<span
        >Firmware used: {state.lastFirmware.effect}</span
      >{/if}
    {#each nearbyFirmware as module (module.id)}
      {#if module.knowledge.kind === 'identified'}
        <span>Firmware {module.appearance} · {module.knowledge.effect}</span>
      {:else}
        <button
          class="site-action"
          disabled={!canAct}
          onclick={() => onscan(module.id)}
        >
          {module.knowledge.kind === 'failed' ? 'Retry scan' : 'Scan firmware'} ·
          {module.appearance}
        </button>
        {#if module.knowledge.kind === 'failed'}<span
            >Not identified. More senses or identification chance may help.</span
          >{/if}
      {/if}
      <button
        class="site-action"
        disabled={!canAct || !!me?.shelter}
        onclick={() => onuse(module.id)}
        >Use firmware · {module.appearance}</button
      >
    {/each}
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
        {#if ability?.ammunition}
          <span
            >Stones {ability.ammunition.charges} / {ability.ammunition
              .capacity}</span
          >
        {/if}
        <span
          >{!canAct
            ? 'Unavailable'
            : id || slot.id === 'primary'
              ? ability?.ammunition && ability.ammunition.charges === 0
                ? `Reloading · ${Math.max(0, Math.ceil((ability.ammunition.nextAt - state.time) / 1000))}s`
                : cooldown > 0
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
  .vitals details {
    pointer-events: auto;
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
  .site-action {
    pointer-events: auto;
    text-transform: capitalize;
    cursor: pointer;
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
