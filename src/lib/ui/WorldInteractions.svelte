<script lang="ts">
  import { usePreferences, actionLabel } from '../game-client/preferences.js';
  const preferences = usePreferences();
  import type { MatchView, PlayerView } from '../../../shared/match.js';
  import { FIRMWARE_SCAN_RANGE } from '../../../shared/firmware.js';

  let {
    match,
    player,
    connected,
    oninteract,
    onuse,
    onshelter,
    notice = null,
  }: {
    match: MatchView;
    player: PlayerView | undefined;
    connected: boolean;
    oninteract: (id: string) => Promise<boolean>;
    onuse: (id: string) => Promise<boolean>;
    onshelter: (id: string) => Promise<boolean>;
    notice?: string | null;
  } = $props();
  type Action =
    | { kind: 'idle' }
    | { kind: 'pending'; label: string }
    | { kind: 'result'; message: string };
  let action = $state<Action>({ kind: 'idle' });
  let previousShelter: string | null = null;
  let shelterMessage = $state('');
  let dismissedNotice = $state<string | null>(null);
  $effect(() => {
    const current = player?.shelter?.id ?? null;
    if (previousShelter && !current)
      shelterMessage =
        'Your craft is outside the shelter. Resume movement and watch the boundary.';
    if (current) shelterMessage = '';
    previousShelter = current;
  });
  const canAct = $derived(
    connected &&
      player?.life.kind === 'alive' &&
      player.life.activity === 'playing' &&
      !player.shelter &&
      !player.statuses.some((item) => item.kind === 'stun'),
  );
  const sites = $derived(
    match.pointsOfInterest.filter((site) => near(site.position, 3)),
  );
  const modules = $derived(
    match.firmware.filter((module) =>
      near(module.position, FIRMWARE_SCAN_RANGE),
    ),
  );
  const shelters = $derived(
    match.shelters.filter(
      (site) => near(site.position, 3) || player?.shelter?.id === site.id,
    ),
  );
  function near(position: { x: number; z: number }, range: number) {
    return (
      player?.life.kind === 'alive' &&
      Math.hypot(
        position.x - player.position.x,
        position.z - player.position.z,
      ) <= range
    );
  }
  async function apply(
    label: string,
    run: () => Promise<boolean>,
    success: string,
  ) {
    if (action.kind === 'pending') return;
    action = { kind: 'pending', label };
    try {
      const applied = await run();
      action = {
        kind: 'result',
        message: applied
          ? success
          : 'No confirmation received for that action. Check the current state, range, occupancy, eligibility, and connection before retrying.',
      };
    } catch {
      action = {
        kind: 'result',
        message:
          'No confirmation received. Reconnect and check the current state before retrying.',
      };
    }
  }
  const effects: Readonly<Record<string, string>> = {
    delicious: 'Extra progression',
    yummy: 'Extra progression',
    nutritious: 'Progression',
    inert: 'No extra effect',
    medicinal: 'Repair over four seconds',
    lethal: 'Severe corrosion',
    poisonous: 'Corrosion',
    stinging: 'Mild corrosion',
    refreshing: 'Adds cold and reduces remaining ability cooldowns',
    spicy: 'Adds heat and grants a brief speed boost',
    entertaining: 'Increases companion capacity',
    amusing: 'Increases companion capacity',
    prolific: 'More firmware capsules spawn',
    deafening: 'Temporary deafness',
    hallucinogenic: 'Temporary visual distortion',
    mystic: 'Permanent increase to a random stat',
  };
</script>

{#if shelterMessage}<p role="status">{shelterMessage}</p>{/if}
{#if notice && notice !== dismissedNotice}<p class="message" role="alert">
    {notice}<button onclick={() => (dismissedNotice = notice)}>Dismiss</button>
  </p>{/if}
{#if action.kind !== 'idle'}
  <div class="message" role="status">
    {action.kind === 'pending'
      ? `${action.label}. Waiting for host.`
      : action.message}
    {#if action.kind === 'result'}<button
        onclick={() => (action = { kind: 'idle' })}>Dismiss</button
      >{/if}
  </div>
{/if}
{#each sites as site (site.id)}
  <section aria-label={site.name}>
    <strong>{site.name}</strong>
    <p>
      {site.discovered
        ? 'Discovery credited to you.'
        : 'Not yet discovered by you.'} Discovery credit is separate from reward ownership.
    </p>
    {#if site.claim?.kind === 'reserved'}
      <p>
        {site.claim.yours ? 'Reserved by you' : 'Reserved by another player'} · {Math.max(
          0,
          Math.ceil((site.claim.expiresAt - match.time) / 1000),
        )}s left.
      </p>
    {:else if site.claim?.kind === 'claimed'}
      <p>
        {site.claim.yours
          ? 'You claimed this reward.'
          : 'Another player claimed this reward.'} No rewards remain.
      </p>
    {:else}
      <p>
        {(site.claim?.protectionMs ?? 0) > 0
          ? `${((site.claim?.protectionMs ?? 0) / 1000).toFixed(1)}s of combat protection left for you here.`
          : 'No combat protection remains for you here.'} The boundary still damages
        you.
      </p>
      {#if site.claim?.kind === 'available' && site.claim.unavailableReason}<p>
          {site.claim.unavailableReason}
        </p>{/if}
    {/if}
    <button
      disabled={!canAct ||
        action.kind === 'pending' ||
        site.status !== 'available' ||
        (site.claim?.kind === 'available' && !!site.claim.unavailableReason)}
      onclick={() =>
        apply(
          'Reserving site',
          () => oninteract(site.id),
          'Site reserved. Resolve the reward before its deadline.',
        )}
    >
      {site.status === 'available'
        ? `Review rewards · ${actionLabel(preferences, 'interact')}`
        : site.status === 'reserved'
          ? 'Reserved'
          : 'Claimed'}
    </button>
  </section>
{/each}
{#if shelters.length}
  <p>
    Shelters hide your craft and relieve temperature exposure. Attacks are
    unavailable inside. Lifetime is shared across visits, each entry uses some
    lifetime, and larger craft wear holes out faster. Expiry forces you outside.
    The boundary still damages you.
  </p>
{/if}
{#each shelters as site (site.id)}
  {@const inside = player?.shelter?.id === site.id}
  <section aria-label="Shelter">
    <strong
      >{inside
        ? 'Inside shelter'
        : site.occupied
          ? 'Shelter occupied'
          : 'Shelter available'}</strong
    >
    <p>
      {Math.ceil(site.remainingFraction * 100)}% lifetime remains.
      {inside && player?.shelter
        ? `Forced exit in ${Math.max(0, Math.ceil((player.shelter.until - match.time) / 1000))}s.`
        : `At your current size, this entry lasts about ${((site.entryDurationMs ?? 0) / 1000).toFixed(1)}s.`}
    </p>
    <button
      disabled={action.kind === 'pending' ||
        (inside
          ? !connected || player?.life.kind !== 'alive'
          : !canAct || site.occupied)}
      onclick={() =>
        apply(
          inside ? 'Leaving shelter' : 'Entering shelter',
          () => onshelter(site.id),
          inside
            ? 'You left the shelter.'
            : 'You entered the shelter. Watch the forced-exit countdown.',
        )}
    >
      {inside
        ? `Exit early · ${actionLabel(preferences, 'interact')}`
        : site.occupied
          ? 'Occupied'
          : `Enter shelter · ${actionLabel(preferences, 'interact')}`}
    </button>
  </section>
{/each}
{#if match.lastFirmware && match.time - match.lastFirmware.at < 5000}
  <p role="status">
    Consumed firmware. {effects[match.lastFirmware.effect] ??
      match.lastFirmware.effect}.
  </p>
{/if}
{#if match.firmwareSensory.deafened}<p>
    Deafening effect active. Watch visual warnings.
  </p>{/if}
{#if modules.length}<p>
    Matching patterns share an effect for this run. Identification is private to
    you. Unknown firmware can harm you. Stay close to finish consumption; each
    stage gives salvage progress.
  </p>{/if}
{#each modules as module (module.id)}
  <section aria-label={`Firmware ${module.appearance}`}>
    <strong>Firmware · {module.appearance}</strong>
    {#if module.knowledge.kind === 'identified'}
      <p>
        Identified for you. {effects[module.knowledge.effect] ??
          module.knowledge.effect}.
      </p>
    {:else if module.knowledge.kind === 'failed'}
      <p>
        Effect unknown. Automatic scan did not identify this pattern. More A
        sensor upgrade or an identification bonus may reveal it.
      </p>
    {:else}
      <p>
        Effect unknown. Your sensors check this pattern automatically while you
        are nearby.
      </p>
    {/if}
    {#if module.knowledge.kind !== 'identified' && module.scanChance !== undefined}<p
      >
        Current identification chance {Math.round(module.scanChance * 100)}%.
        Repeated scans do not give fresh rolls at unchanged stats.
      </p>{/if}
    <p>
      {module.stage} of {module.stages ?? 4} stages consumed.
      {module.consumption === 'yours'
        ? 'You are consuming it. Moving out of range or becoming unable to act stops consumption.'
        : module.consumption === 'other'
          ? 'Another player is consuming it.'
          : 'Ready to consume.'}
      The effect applies on completion.
    </p>
    <button
      disabled={!canAct ||
        action.kind === 'pending' ||
        module.consumption === 'other' ||
        module.consumption === 'yours'}
      onclick={() =>
        apply(
          'Starting consumption',
          () => onuse(module.id),
          'Consumption started. Stay within range until it finishes.',
        )}
    >
      {module.consumption === 'yours'
        ? 'Consuming'
        : module.consumption === 'other'
          ? 'In use'
          : `Consume ${module.knowledge.kind === 'identified' ? 'identified' : 'unknown'} firmware · ${actionLabel(preferences, 'interact')}`}
    </button>
  </section>
{/each}

<style>
  section {
    border: 1px solid #636b7b;
  }
  strong {
    text-transform: capitalize;
  }
  p {
    margin: 6px 0;
    line-height: 1.45;
  }
  button {
    pointer-events: auto;
    color: white;
    background: transparent;
    border: 1px solid #9299a9;
    border-radius: 16px;
    padding: 7px 10px;
    font: inherit;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.6;
    cursor: default;
  }
  button:focus-visible {
    outline: 2px solid #ffb829;
    outline-offset: 2px;
  }
  .message {
    color: #ffcf74;
  }
</style>
