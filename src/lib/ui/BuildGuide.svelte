<script lang="ts">
  import { usePreferences, actionLabel } from '../game-client/preferences.js';
  const preferences = usePreferences();
  import { onMount } from 'svelte';
  import type { MatchView, PlayerView } from '../../../shared/match.js';
  import { ABILITY_SLOTS, abilityName } from './presentation.js';
  import RarityBadge from './RarityBadge.svelte';
  import UpgradeIcon from './UpgradeIcon.svelte';
  import FieldGuide from './FieldGuide.svelte';
  let {
    match,
    player,
    onnumbers,
  }: {
    match: MatchView;
    player: PlayerView | undefined;
    onnumbers: (enabled: boolean) => void;
  } = $props();
  let panel: HTMLDetailsElement;
  onMount(() => {
    const close = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        !panel.open ||
        document.querySelector('[aria-modal="true"]')
      )
        return;
      event.preventDefault();
      panel.open = false;
      (
        document.querySelector<HTMLCanvasElement>('canvas[tabindex="0"]') ??
        panel.querySelector('summary')
      )?.focus();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  });
  function statName(stat: string) {
    return names[stat]?.[0] ?? stat.replace(/([A-Z])/g, ' $1').toLowerCase();
  }
  const names: Readonly<Record<string, readonly [string, string]>> = {
    physical: [
      'Physical damage',
      'Base physical power. Attacks apply their own multipliers.',
    ],
    ability: [
      'Ability damage',
      'Base ability power. Each ability uses its listed scaling.',
    ],
    maximumHealth: [
      'Maximum hull',
      'Hull capacity. Hull at zero eliminates your craft.',
    ],
    plating: [
      'Maximum plating',
      'Plating absorbs eligible damage before hull. Penetrating damage can bypass it.',
    ],
    regeneration: ['Regeneration', 'Hull repaired per ten seconds.'],
    speed: [
      'Movement speed',
      'Movement speed before terrain, thermal, and status penalties.',
    ],
    damage: ['Damage', 'Percent of normal outgoing damage. 100 is normal.'],
    cooldowns: [
      'Cooldown duration',
      'Percent of base cooldown duration. Lower values mean shorter cooldowns.',
    ],
    size: [
      'Size',
      'Percent of normal size. Affects collision size, shelter lifetime, and some upgrades.',
    ],
    senses: [
      'Sensors',
      'Affects night spotting, radar, and firmware identification.',
    ],
    social: [
      'Signal strength',
      'Helps determine how many bots you can recruit.',
    ],
    terrainAdaptation: [
      'Terrain adaptation',
      'Reduces movement penalties across terrain.',
    ],
    sandAdaptation: [
      'Sand adaptation',
      'Reduces the movement penalty on sand.',
    ],
    snowAdaptation: [
      'Snow adaptation',
      'Reduces the movement penalty on snow.',
    ],
    waterAdaptation: [
      'Water adaptation',
      'Reduces the movement penalty in water.',
    ],
    heatAdaptation: ['Heat adaptation', 'Slows heat exposure buildup.'],
    coldAdaptation: ['Cold adaptation', 'Slows cold exposure buildup.'],
    salvageSpeed: ['Salvage speed', 'Percent of normal collection speed.'],
    salvageReach: ['Salvage reach', 'Additional collection reach.'],
    progress: ['Progress gain', 'Percent of normal progress gain.'],
    progressRequirement: [
      'Progress requirement',
      'Percent of normal progress needed for a level. Lower is better.',
    ],
    firmwareIdentification: [
      'Firmware identification bonus',
      'Percentage points added to automatic firmware identification chance.',
    ],
    damageResistance: [
      'Damage resistance',
      'Reduces eligible incoming combat damage. Boundary damage bypasses protection.',
    ],
    dodge: [
      'Dodge chance',
      'Chance in percent to avoid eligible incoming attacks.',
    ],
    attackArea: ['Attack area', 'Percent of base attack reach or area.'],
    healthFoodMaximumHealth: [
      'Hull from repair salvage',
      'Maximum hull gained through repair salvage effects.',
    ],
    temporaryInvulnerability: [
      'Temporary combat protection',
      'Duration bonus used by applicable protection effects.',
    ],
    repairFoodChance: [
      'Repair salvage chance',
      'Bonus chance for salvage to repair hull.',
    ],
    poisonResistance: ['Corrosion resistance', 'Reduces incoming corrosion.'],
    additionalPoisonTicks: [
      'Additional corrosion ticks',
      'Extra damage ticks on applied corrosion.',
    ],
    poisonTickSpeed: ['Corrosion tick speed', 'Percent of normal tick speed.'],
    shieldedResistance: [
      'Shielded resistance',
      'Damage resistance while shielded.',
    ],
    soakAdaptation: ['Rain adaptation', 'Reduces rain exposure effects.'],
    stunResistance: [
      'Stun resistance',
      'Reduces the duration of incoming stuns.',
    ],
    stunDuration: [
      'Stun duration',
      'Percent of base duration for stuns you inflict.',
    ],
    cataclysmResistance: ['Meteor resistance', 'Resistance to meteor damage.'],
    alphaDamage: ['Elite damage', 'Percent of normal damage against elites.'],
    effectArea: ['Effect area', 'Percent of base area for applicable effects.'],
    statChange: [
      'Stat change',
      'Percent of base gain for applicable stat changes.',
    ],
    attackPenalty: [
      'Attack movement penalty',
      'Percent of normal movement penalty during attacks.',
    ],
    sprintSpeed: ['Sprint speed', 'Percent of base sprint speed.'],
    sprintRecovery: ['Sprint recovery', 'Recovery rate for sprint stamina.'],
    dashCooldown: ['Dash cooldown', 'Percent of base dash cooldown.'],
    vegetationProgress: [
      'Vegetation progress',
      'Percent of base progress from vegetation.',
    ],
    meatProgress: [
      'Wreck progress',
      'Percent of base progress from wreck salvage.',
    ],
    fishProgress: [
      'Aquatic salvage progress',
      'Percent of base progress from aquatic salvage.',
    ],
    carrionProgress: [
      'Derelict salvage progress',
      'Percent of base progress from salvage left by other combatants.',
    ],
    passiveProgress: [
      'Passive progress',
      'Progress gained automatically through applicable upgrades.',
    ],
    robust: [
      'Robust',
      'Enables the size-dependent maximum hull benefit described by this upgrade.',
    ],
    shifty: [
      'Shifty',
      'Enables the small-craft dodge and damage benefit described by this upgrade.',
    ],
    spines: ['Reactive Studs', 'Retaliation power for Reactive Studs.'],
    trackerFood: [
      'Tracker salvage',
      'Additional salvage chance from the Tracker effect.',
    ],
    platingHitFactor: [
      'Plating attack factor',
      'Additional attack scaling from current plating.',
    ],
    poisonDamage: ['Corrosion damage', 'Percent of base corrosion damage.'],
  };
  const percentageStats = new Set([
    'damage',
    'cooldowns',
    'size',
    'senses',
    'salvageSpeed',
    'progress',
    'progressRequirement',
    'attackArea',
    'attackPenalty',
    'sprintSpeed',
    'dashCooldown',
    'poisonDamage',
    'poisonTickSpeed',
    'alphaDamage',
    'effectArea',
    'statChange',
    'vegetationProgress',
    'meatProgress',
    'fishProgress',
    'carrionProgress',
  ]);
</script>

<details bind:this={panel} data-game-capture>
  <summary>Build, stats, and help</summary>
  <div class="inspection">
    <header>
      <h2>Your craft</h2>
      <p>
        The world continues. Inspection grants no protection or pause. Close
        this panel to resume controls. Escape closes it.
      </p>
      {#if match.boundary.elapsedMs >= match.boundary.shrinkStartMs}<p
          class="danger"
          role="status"
        >
          Boundary closing. Collapse in {Math.max(
            0,
            Math.ceil(
              (match.boundary.collapseAtMs - match.boundary.elapsedMs) / 1000,
            ),
          )}s. Boundary damage bypasses protection.
        </p>
      {:else if match.boundary.shrinkStartMs - match.boundary.elapsedMs <= 60000}<p
          class="danger"
          role="status"
        >
          Boundary closes in {Math.ceil(
            (match.boundary.shrinkStartMs - match.boundary.elapsedMs) / 1000,
          )}s.
        </p>{/if}
      {#if match.meteors.length}<p class="danger" role="status">
          Meteor incoming. Impact countdown continues.
        </p>{/if}
    </header>
    {#if player?.life.kind === 'eliminated'}<p>
        Your final build is shown. You are spectating another craft's world
        view.
      </p>{/if}
    <p>
      Overload {match.progression.carcinisation}. Incoming combat damage +{Math.round(
        match.progression.carcinisationDamage * 100,
      )}%. Rarity chance +{Math.round(
        match.progression.carcinisationRarity * 100,
      )}%.
    </p>
    <h3>Equipment and learned abilities</h3>
    <ul>
      {#each ABILITY_SLOTS as slot (slot.id)}
        {@const id = match.equipment.slots[slot.id]}
        {@const ability = match.equipment.learned.find(
          (item) => item.id === id,
        )}
        {@const readyAt =
          ability?.readyAt ??
          (slot.id === 'primary' ? match.equipment.basicReadyAt : 0)}
        <li>
          {slot.label} · {actionLabel(preferences, slot.id)} · {abilityName(
            match.equipment,
            id,
            slot.id,
          )}
          {#if id || slot.id === 'primary'}
            · {readyAt > match.time
              ? `Cooldown ${((readyAt - match.time) / 1000).toFixed(1)}s`
              : 'Cooldown ready'}{/if}
        </li>
      {/each}
    </ul>
    {#each match.equipment.learned as ability (ability.id)}
      <article>
        <strong>{ability.name ?? 'Unknown ability'}</strong>
        {#if ability.rarity}<RarityBadge rarity={ability.rarity} />{/if}
        {#if ability.rank}<span>Rank {ability.rank}</span>{/if}
        <p>
          {Object.values(match.equipment.slots).includes(ability.id)
            ? 'Equipped'
            : 'Learned, unequipped'} · {ability.readyAt > match.time
            ? `Cooldown ${((ability.readyAt - match.time) / 1000).toFixed(1)}s`
            : 'Cooldown ready'}{ability.ammunition
            ? ` · Ammunition ${ability.ammunition.charges}/${ability.ammunition.capacity}`
            : ''}
        </p>
        {#if ability.ammunition && ability.ammunition.charges < ability.ammunition.capacity}<p
          >
            Next ammunition in {Math.max(
              0,
              Math.ceil((ability.ammunition.nextAt - match.time) / 1000),
            )}s.
          </p>{/if}
        {#if ability.description}<p>{ability.description}</p>{/if}
      </article>
    {/each}
    <p>
      Learned passive benefits remain when unequipped. Cooldown readiness alone
      does not permit an attack while stunned, sheltered, eliminated, or
      choosing.
    </p>
    <h3>Upgrades and affinities</h3>
    <p>
      {match.progression.affinities
        .map((item) => `${item.name} ${item.rank}`)
        .join(', ') || 'No affinities yet.'}
    </p>
    {#each match.progression.upgrades as upgrade (upgrade.id)}<article>
        <strong
          >{#if upgrade.icon}<UpgradeIcon
              kind={upgrade.icon}
            />{/if}{upgrade.name}</strong
        >
        <RarityBadge rarity={upgrade.rarity} /><span>Rank {upgrade.rank}</span>
        <p>{upgrade.description}</p>
      </article>{/each}
    {#each match.build?.specializations ?? [] as specialization (specialization.id)}<article
      >
        <strong>{specialization.name}</strong><span>Specialization</span>
        <p>{specialization.description}</p>
      </article>{/each}
    <h3>Current stat totals</h3>
    <p>
      These are your current totals, including active build effects and stat
      limits. Terrain, exposure, statuses, and individual attacks can further
      affect an action.
    </p>
    <dl>
      {#each Object.entries(player?.stats ?? {}) as [stat, value] (stat)}
        <div>
          <dt>{statName(stat)}</dt>
          <dd>
            {Number(value.toFixed(2))}{percentageStats.has(stat) ? '%' : ''}
          </dd>
          {#if names[stat]}<p>{names[stat][1]}</p>{/if}
        </div>
      {/each}
    </dl>
    <details>
      <summary>Stat modifiers</summary>
      <p>
        Additions combine before multipliers. Stat limits and conditional
        effects can change the final total. The list below shows recorded stat
        changes; upgrade descriptions also explain triggered effects.
      </p>
      {#each match.build?.modifiers ?? [] as modifier, index (index)}
        <p>
          {modifier.source} · {statName(modifier.stat)} · {modifier.add >= 0
            ? '+'
            : ''}{Number(modifier.add.toFixed(2))} · ×{Number(
            modifier.multiplier.toFixed(3),
          )} · {modifier.active ? 'Active' : 'Inactive this phase'}
        </p>
      {/each}
    </details>
    {#each match.build?.temporary ?? [] as effect, index (index)}<p>
        {effect.label} · {Math.max(
          0,
          Math.ceil((effect.until - match.time) / 1000),
        )}s remaining.
      </p>{/each}
    {#if match.progression.depletedRewards > 0}<p>
        No legal upgrade was available for {match.progression.depletedRewards} level
        rewards.
      </p>{/if}
    <h3>Controls and field guide</h3>
    <FieldGuide />
    <label
      ><input
        type="checkbox"
        checked={preferences?.current.damageNumbers ?? false}
        onchange={(event) => onnumbers(event.currentTarget.checked)}
      /> Damage numbers</label
    >
  </div>
</details>

<style>
  details {
    pointer-events: auto;
    border-top: 1px solid #555e6e;
    padding-top: 7px;
  }
  summary {
    cursor: pointer;
  }
  summary:focus-visible,
  input:focus-visible {
    outline: 2px solid #ffb829;
    outline-offset: 3px;
  }
  .inspection {
    position: fixed;
    top: 190px;
    left: 12px;
    bottom: 150px;
    width: min(680px, calc(100vw - 48px));
    padding: 16px;
    overflow-y: auto;
    background: #080b10f5;
    border: 1px solid #9299a9;
    z-index: 4;
    font-size: 13px;
  }
  header {
    border-bottom: 1px solid #777;
    position: sticky;
    top: -16px;
    background: #080b10;
    padding: 12px 0;
  }
  .danger {
    color: #ffcf74;
    border-left: 3px solid #ffb829;
    padding-left: 8px;
  }
  h2 {
    margin-top: 0;
  }
  h3 {
    margin: 22px 0 10px;
    font-size: 16px;
  }
  p {
    line-height: 1.5;
  }
  article {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    border-top: 1px solid #555e6e;
    padding: 10px 0;
  }
  article strong {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  article p {
    flex-basis: 100%;
    margin: 2px 0;
  }
  dl {
    margin: 0;
  }
  dl div {
    display: grid;
    grid-template-columns: 1fr auto;
    padding: 8px 0;
    border-top: 1px solid #555e6e;
  }
  dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
  }
  dl p {
    grid-column: 1 / -1;
    color: #c7cbd4;
    margin: 4px 0 0;
  }
  @media (max-height: 650px) {
    .inspection {
      top: 120px;
      bottom: 120px;
    }
  }
</style>
