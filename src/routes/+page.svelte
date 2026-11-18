<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import type { Observation } from '../../shared/protocol/index.js';
  import {
    connectSession,
    type Session,
    type RoomSummary,
    type ConnectionState,
  } from '../lib/net/session.js';
  import { createWorld } from '../lib/game-client/world.js';
  import { createControls } from '../lib/game-client/controls.js';
  import ChoiceOverlay from '../lib/ui/ChoiceOverlay.svelte';
  import MatchHud from '../lib/ui/MatchHud.svelte';
  import MenuJourney from '../lib/ui/MenuJourney.svelte';
  import SettingsPanel from '../lib/ui/SettingsPanel.svelte';
  import { createAudio } from '../lib/game-client/audio.js';
  import {
    DEFAULT_PREFERENCES,
    PREFERENCE_CONTEXT,
    PREFERENCE_KEY,
    parsePreferences,
    type PreferenceContext,
    type Preferences,
  } from '../lib/game-client/preferences.js';

  let preferences = $state<Preferences>({
    ...DEFAULT_PREFERENCES,
    bindings: { ...DEFAULT_PREFERENCES.bindings },
  });
  let storageMessage = $state<string | null>(null);
  let audioMessage = $state<string | null>(null);
  let preferenceStorageReady = false;
  let applyPreferences: (() => void) | null = null;
  let sound: ReturnType<typeof createAudio> | null = null;
  function savePreferences(patch: Partial<Preferences>) {
    preferences = { ...preferences, ...patch };
    applyPreferences?.();
    if (patch.muted === false) sound?.unlock();
    if (preferenceStorageReady) {
      try {
        localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences));
        storageMessage = null;
      } catch {
        storageMessage =
          'Browser storage is unavailable. These settings apply until you close or reload this page.';
      }
    }
  }
  setContext<PreferenceContext>(PREFERENCE_CONTEXT, {
    get current() {
      return preferences;
    },
    update: savePreferences,
  });

  let canvas: HTMLCanvasElement;
  let observation = $state<Observation | null>(null);
  let session = $state<Session | null>(null);
  let status = $state<ConnectionState>({ kind: 'connecting', message: null });
  let rooms = $state<RoomSummary[]>([]);
  let loadingMessage = $state('');
  let artMessage = $state<string | null>(null);
  let actionMessage = $state<string | null>(null);
  let connection: ReturnType<typeof connectSession>;
  const dangerWarning = $derived(
    observation?.state.phase === 'running'
      ? [
          observation.state.boundary.shrinkStartMs -
            observation.state.boundary.elapsedMs <=
          60000
            ? `Danger: boundary ${observation.state.boundary.elapsedMs >= observation.state.boundary.shrinkStartMs ? 'closing' : 'closes soon'}. Collapse in ${Math.max(0, Math.ceil((observation.state.boundary.collapseAtMs - observation.state.boundary.elapsedMs) / 1000))}s.`
            : '',
          observation.state.meteors.length
            ? 'Danger: meteor incoming. Avoid its impact ring.'
            : '',
        ]
          .filter(Boolean)
          .join(' ')
      : '',
  );
  onMount(() => {
    try {
      const saved = localStorage.getItem(PREFERENCE_KEY);
      if (saved) preferences = parsePreferences(JSON.parse(saved));
    } catch {
      storageMessage =
        'Saved settings could not load. Defaults are active; you can change them here.';
    }
    preferenceStorageReady = true;
    const audio = createAudio((message) => {
      audioMessage = message;
    });
    sound = audio;
    const world = createWorld(canvas);

    const controls = createControls(canvas, world.aimAt, (control) => {
      world.setControl(control);
      connection.sendControl(control);
    });
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let lastBindings = '';
    applyPreferences = () => {
      const reducedMotion = preferences.motion === 'reduced' || motion.matches;
      document.documentElement.style.setProperty(
        '--ui-scale',
        String(preferences.uiScale),
      );
      document.documentElement.dataset.reducedMotion = String(reducedMotion);
      world.setPresentation({ ...preferences, reducedMotion });
      audio.setPreferences(preferences);
      const bindings = JSON.stringify(preferences.bindings);
      if (bindings !== lastBindings) {
        controls.setBindings(preferences.bindings);
        lastBindings = bindings;
      }
    };
    applyPreferences();
    const motionChanged = () => applyPreferences?.();
    motion.addEventListener('change', motionChanged);
    let loading: {
      roundId: string;
      revision: number;
      controller: AbortController;
    } | null = null;
    let requestedRunningArt = '';
    function cancelLoading() {
      loading?.controller.abort();
      loading = null;
      loadingMessage = '';
    }
    async function loadAssets(next: Observation['state']) {
      if (next.phase !== 'loading') {
        if (loading) cancelLoading();
        if (next.phase === 'running' && requestedRunningArt !== next.roundId) {
          requestedRunningArt = next.roundId;
          try {
            await world.loadArt();
          } catch {
            if (observation?.state.roundId === next.roundId)
              artMessage =
                'Some local artwork could not load. Reload the page to retry.';
          }
        }
        return;
      }
      const { roundId, loadingRevision: revision } = next;
      if (loading?.roundId === roundId && loading.revision === revision) return;
      cancelLoading();
      const controller = new AbortController();
      loading = { roundId, revision, controller };
      loadingMessage = 'Loading local assets';
      artMessage = null;
      try {
        await Promise.all([
          world.loadArt(),
          document.fonts.load('400 16px Inter'),
          fetch('/fonts/InterVariable.woff2', {
            signal: controller.signal,
          }).then((response) => {
            if (!response.ok) throw new Error('Font unavailable');
            return response.arrayBuffer();
          }),
        ]);
        if (controller.signal.aborted) return;
        loadingMessage = 'Your assets are ready. Waiting for the crew.';
        connection.loaded(true, revision);
      } catch {
        if (controller.signal.aborted) return;
        loadingMessage =
          'Local assets could not load. Ready again in the lobby to retry.';
        connection.loaded(false, revision);
      }
    }
    function updateControls() {
      const player = observation?.state.players.find(
        (item) => item.id === session?.playerId,
      );
      controls.setEnabled(
        status.kind === 'connected' &&
          observation?.state.phase === 'running' &&
          player?.life.kind === 'alive' &&
          player.life.activity === 'playing',
      );
    }
    connection = connectSession(
      (next) => {
        if (!world.update(next, status.kind === 'connected')) return false;
        if (next.state.roundId !== observation?.state.roundId) {
          actionMessage = null;
          artMessage = null;
        }
        observation = next;
        audio.update(next.state, session?.playerId ?? null);
        void loadAssets(next.state);
        updateControls();
        return true;
      },
      (next, current) => {
        if (
          session?.matchId !== current?.matchId ||
          session?.playerId !== current?.playerId
        ) {
          world.reset();
          audio.reset();
          observation = null;
          requestedRunningArt = '';
          artMessage = null;
          cancelLoading();
          actionMessage = null;
        }
        status = next;
        session = current;
        world.setConnected(next.kind === 'connected');
        audio.setConnected(next.kind === 'connected');
        world.setViewer(current?.playerId ?? null);
        updateControls();
      },
      (next) => {
        rooms = next;
      },
    );
    return () => {
      cancelLoading();
      controls.dispose();
      applyPreferences = null;
      sound = null;
      audio.dispose();
      motion.removeEventListener('change', motionChanged);
      document.documentElement.style.removeProperty('--ui-scale');
      delete document.documentElement.dataset.reducedMotion;
      connection.disconnect();
      world.dispose();
    };
  });
</script>

<svelte:head
  ><title>You Can Crab Everything</title><meta
    name="description"
    content="A hovercraft survival game for one to four players on a local network."
  /></svelte:head
>
<main class:playing={observation?.state.phase === 'running'}>
  <SettingsPanel
    {storageMessage}
    {audioMessage}
    warning={dangerWarning}
    choiceOpen={Boolean(observation?.state.offer)}
  />
  {#if observation?.state.phase !== 'running'}
    <MenuJourney
      match={observation?.state ?? null}
      playerId={session?.playerId ?? null}
      connection={status}
      {rooms}
      {loadingMessage}
      onjoin={(roomId, name) => connection.join(roomId, name)}
      onready={(ready) => connection.ready(ready)}
      onstart={() => connection.start()}
      onleave={() => connection.leave()}
      onreturn={() => connection.returnToLobby()}
      onretry={() => connection.reconnect()}
    />
  {/if}
  {#if observation?.state.phase === 'running'}
    {#if observation.state.canFinishSurvivor}
      <section class="match-notice" aria-label="Last survivor">
        <p>You can keep playing or finish the match.</p>
        <button onclick={() => connection.finishMatch()}>Finish match</button>
      </section>
    {/if}
    {#if observation.state.players.find((player) => player.id === session?.playerId)?.life.kind === 'eliminated'}
      <section class="match-notice spectator" aria-label="Spectating">
        <h2>Eliminated</h2>
        <p>
          {observation.state.spectating
            ? 'Spectating a survivor'
            : 'No survivors to spectate'}
        </p>
        {#each observation.state.players.filter((player) => player.life.kind === 'alive') as player (player.id)}
          <button
            disabled={player.id === observation.state.spectating}
            onclick={() => connection.spectate(player.id)}
            >Follow {player.name}</button
          >
        {/each}
      </section>
    {/if}
    {#if status.message}<div class="connection-notice" role="alert">
        {status.message}
      </div>{/if}
    {#if observation.state.offer}
      {@const offer = observation.state.offer}
      <ChoiceOverlay
        offerId={offer.id}
        revision={offer.revision}
        kind={offer.kind ?? 'upgrade'}
        pool={offer.pool}
        protectedChoice={offer.protected !== false}
        queued={offer.queued ?? 0}
        parentName={offer.parentName}
        site={offer.site}
        now={observation.state.time}
        currency={observation.state.progression.currency}
        connected={status.kind === 'connected'}
        offers={offer.choices.map((id) => {
          const detail = offer.details?.find((item) => item.id === id);
          const label = offer.labels?.find((item) => item.id === id);
          const reward = offer.poiOptions?.find((item) => item.id === id);
          return {
            ...detail,
            id,
            name:
              (offer.kind === 'poi' ? label?.label : detail?.name) ??
              label?.label ??
              id,
            description: detail?.description ?? label?.description ?? '',
            rarity: detail?.rarity ?? '',
            rank: detail?.rank ?? 0,
            cost: reward?.cost ?? null,
            consequence: reward?.consequence,
            unavailableReason: reward?.unavailableReason,
          };
        })}
        remainingMs={Math.max(
          0,
          (offer.deadline ?? observation.state.time) - observation.state.time,
        )}
        warning={[
          offer.protected === false
            ? 'You are vulnerable while choosing at this site.'
            : null,
          observation.state.meteors.length
            ? 'Meteor incoming. Its impact countdown continues.'
            : null,
          observation.state.boundary.elapsedMs >=
          observation.state.boundary.shrinkStartMs
            ? `Boundary closing. Collapse in ${Math.max(0, Math.ceil((observation.state.boundary.collapseAtMs - observation.state.boundary.elapsedMs) / 1000))}s. Boundary damage bypasses selection protection.`
            : observation.state.boundary.shrinkStartMs -
                  observation.state.boundary.elapsedMs <=
                60000
              ? `Boundary closes in ${Math.ceil((observation.state.boundary.shrinkStartMs - observation.state.boundary.elapsedMs) / 1000)}s.`
              : null,
        ]
          .filter(Boolean)
          .join(' ') || null}
        rerollCost={offer.rerollCost ?? 1}
        rerollCostAvailable={observation.state.progression.currency >=
          (offer.rerollCost ?? 1)}
        rarityCost={offer.rarityCost ?? null}
        rarityCostAvailable={offer.rarityCost != null &&
          observation.state.progression.currency >= offer.rarityCost}
        onchoose={async (choice) => {
          const roundId = observation?.state.roundId;
          const applied = await connection.choose(
            offer.id,
            offer.revision,
            choice,
          );
          if (
            applied &&
            observation?.state.roundId === roundId &&
            offer.kind !== 'poi' &&
            choice !== 'skip'
          )
            sound?.confirmedUpgrade();
          if (offer.kind === 'poi' && observation?.state.roundId === roundId)
            actionMessage = applied
              ? null
              : 'The site choice was not confirmed. Check your build, currency, and the latest claim state before trying again.';
          return applied;
        }}
        onreroll={() => connection.reroll(offer.id, offer.revision)}
        onupgrade={() => connection.upgradeRarity(offer.id, offer.revision)}
        equipment={observation.state.equipment}
        onequip={(slot, id) =>
          connection.equip(offer.id, offer.revision, slot, id)}
      />
    {/if}
  {/if}
  <div class="arena" class:active={observation?.state.phase === 'running'}>
    <canvas
      bind:this={canvas}
      class:distorted={observation?.state.firmwareSensory.distortion}
      tabindex={observation?.state.phase === 'running' ? 0 : -1}
      aria-label="Match world"
    ></canvas>
    {#if observation?.state.phase === 'running' && session}
      <MatchHud
        connected={status.kind === 'connected'}
        notice={actionMessage ?? artMessage}
        onnumbers={(enabled) => savePreferences({ damageNumbers: enabled })}
        state={observation.state}
        playerId={session.playerId}
        oninteract={(id) => connection.interact(id)}
        onuse={(id) => connection.useFirmware(id)}
        onshelter={(id) => connection.shelter(id)}
        oncharm={(id) => connection.charm(id)}
      />
    {/if}
  </div>
</main>

<style>
  @font-face {
    font-family: Inter;
    src: url('/fonts/InterVariable.woff2') format('woff2');
    font-style: normal;
    font-weight: 100 900;
    font-display: swap;
  }
  :global(body) {
    margin: 0;
    background: #000;
    color: #fff;
    font-family: Inter, sans-serif;
  }
  :global(button),
  :global(input),
  :global(select) {
    font-family: inherit;
  }
  :global(:is(button, input, select, summary, a):focus-visible) {
    outline: 3px solid #ffb829;
    outline-offset: 3px;
  }
  :global(html[data-reduced-motion='true'] *) {
    scroll-behavior: auto !important;
    animation: none !important;
    transition: none !important;
  }
  :global(html[data-reduced-motion='true'] canvas.distorted) {
    filter: none;
  }
  main {
    min-height: 100svh;
  }
  .arena {
    position: relative;
    height: 0;
    overflow: hidden;
  }
  .arena.active {
    height: 100svh;
    min-height: 480px;
  }
  canvas {
    display: block;
    cursor: crosshair;
    width: 100%;
    height: 100%;
  }
  canvas.distorted {
    filter: hue-rotate(130deg) saturate(1.8);
  }
  .match-notice {
    zoom: var(--ui-scale, 1);
    position: fixed;
    z-index: 3;
    bottom: 160px;
    left: 12px;
    max-width: 240px;
    padding: 10px;
    background: #080b10ed;
    border: 1px solid #666f80;
    font-size: 13px;
  }
  .match-notice h2 {
    margin: 0 0 8px;
    font-size: 18px;
  }
  .match-notice p {
    margin: 0 0 8px;
  }
  .match-notice button {
    color: white;
    background: transparent;
    border: 1px solid #aaa;
    border-radius: 20px;
    padding: 8px 12px;
    cursor: pointer;
    margin: 3px;
  }
  .connection-notice {
    zoom: var(--ui-scale, 1);
    position: fixed;
    z-index: 12;
    top: 0;
    left: 25%;
    right: 25%;
    padding: 10px;
    color: #ffb829;
    background: #080b10;
    border: 1px solid #ffb829;
    font-size: 14px;
  }
  button:focus-visible {
    outline: 2px solid #ffb829;
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    canvas.distorted {
      filter: none;
    }
  }
</style>
