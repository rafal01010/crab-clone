<script lang="ts">
  import { onMount } from 'svelte';
  import type { Observation } from '../../shared/protocol/index.js';
  import {
    connectSession,
    type Session,
    type RoomSummary,
  } from '../lib/net/session.js';
  import { createWorld } from '../lib/game-client/world.js';
  import { createControls } from '../lib/game-client/controls.js';
  import ChoiceOverlay from '../lib/ui/ChoiceOverlay.svelte';
  import MatchHud from '../lib/ui/MatchHud.svelte';

  let canvas: HTMLCanvasElement;
  let observation = $state<Observation | null>(null);
  let session = $state<Session | null>(null);
  let status = $state('Connecting');
  let rooms = $state<RoomSummary[]>([]);
  let name = $state('');
  let loadingMessage = $state('');
  let connection: ReturnType<typeof connectSession>;
  let loading = false;
  onMount(() => {
    const world = createWorld(canvas);

    const controls = createControls(canvas, world.aimAt, (control) => {
      world.setControl(control);
      connection.sendControl(control);
    });
    function updateControls() {
      const player = observation?.state.players.find(
        (item) => item.id === session?.playerId,
      );
      controls.setEnabled(
        status === 'Connected' &&
          observation?.state.phase === 'running' &&
          player?.life.kind === 'alive' &&
          player.life.activity === 'playing',
      );
    }
    connection = connectSession(
      (next) => {
        if (world.update(next)) {
          observation = next;
          if (next.state.phase === 'loading' && !loading) {
            loading = true;
            const revision = next.state.loadingRevision;
            loadingMessage = 'Loading local assets';
            Promise.all([
              document.fonts.load('400 16px Inter'),
              fetch('/fonts/InterVariable.woff2').then((response) => {
                if (!response.ok) throw new Error('Font unavailable');
                return response.arrayBuffer();
              }),
            ])
              .then(() => {
                loadingMessage = 'Ready';
                connection.loaded(true, revision);
              })
              .catch(() => {
                loadingMessage = 'Asset loading failed. Ready again to retry.';
                connection.loaded(false, revision);
              });
          } else if (next.state.phase === 'lobby') loading = false;
          updateControls();
          return true;
        }
        return false;
      },
      (next, current) => {
        if (
          session?.matchId !== current?.matchId ||
          session?.playerId !== current?.playerId
        ) {
          world.reset();
          observation = null;
        }
        status = next;
        session = current;
        world.setConnected(next === 'Connected');
        world.setViewer(current?.playerId ?? null);
        updateControls();
      },
      (next) => {
        rooms = next;
      },
    );
    return () => {
      controls.dispose();
      connection.disconnect();
      world.dispose();
    };
  });
</script>

<svelte:head
  ><title>You Can Crab Everything</title><meta
    name="description"
    content="A hovercraft survival game for four players on a local network."
  /></svelte:head
>
<main>
  <header>
    <h1>You Can Crab Everything</h1>
    <p>{status} · Starter playable subset. Checkpoint verification pending.</p>
  </header>
  {#if !session}
    <section aria-label="Rooms">
      <label>Display name <input bind:value={name} maxlength="24" /></label>
      <button
        disabled={!name.trim() || status !== 'Connected'}
        onclick={() => connection.join(null, name.trim())}>Create room</button
      >
      <h2>Rooms</h2>
      {#each rooms as room (room.id)}
        <p>
          {room.id.slice(0, 8)}. {room.players} / 4. {room.phase}
          <button
            disabled={!name.trim() ||
              room.players >= 4 ||
              room.phase !== 'lobby'}
            onclick={() => connection.join(room.id, name.trim())}>Join</button
          >
        </p>
      {:else}<p>No rooms yet.</p>{/each}
    </section>
  {:else if observation && observation.state.phase !== 'running'}
    <section aria-label="Lobby">
      <h2>
        {observation.state.phase === 'finished'
          ? 'Match results'
          : observation.state.phase}
      </h2>
      {#if observation.state.result}
        {@const result = observation.state.result}
        <h3>
          {result.outcome.kind === 'draw'
            ? 'Draw'
            : `${result.players.find((player) => result.outcome.kind === 'winner' && player.id === result.outcome.playerId)?.name ?? 'Player'} wins`}
        </h3>
        <p>
          Match time {Math.floor(result.durationMs / 60000)}m {Math.floor(
            result.durationMs / 1000,
          ) % 60}s
        </p>
        <p>
          Elimination order: {result.eliminationGroups
            .map((group) =>
              group
                .map(
                  (id) =>
                    result.players.find((player) => player.id === id)?.name ??
                    id,
                )
                .join(' and '),
            )
            .join(' → ') || 'None'}
        </p>
        {#each result.players as player (player.id)}
          <article>
            <h3>{player.name} · level {player.level}</h3>
            <p>
              Damage dealt {Math.round(player.damageDealt)} · damage taken {Math.round(
                player.damageTaken,
              )} · eliminations {player.eliminations} · salvage stages {player.salvageStages}
            </p>
            <p>
              Upgrades: {player.upgrades
                .map((item) => `${item.id} ${item.rarity} rank ${item.rank}`)
                .join(', ') || 'None'}
            </p>
            <p>
              Specializations: {player.specializations.join(', ') || 'None'} · Learned
              abilities: {player.learnedAbilities.join(', ') || 'None'}
            </p>
            <p>
              Equipment: {Object.entries(player.equipment)
                .map(([slot, id]) => `${slot}: ${id ?? 'empty'}`)
                .join(', ')}
            </p>
          </article>
        {/each}
      {:else if observation.state.phase === 'aborted'}
        <p>The match ended without a result because the host stopped it.</p>
      {/if}
      {#each observation.state.players as player (player.id)}
        <p>
          {player.name}
          {player.host ? '(host)' : ''} - Standard - {player.connected
            ? player.ready
              ? 'Ready'
              : 'Not ready'
            : 'Disconnected'}
        </p>
      {/each}
      {#if observation.state.phase === 'lobby'}
        {@const me = observation.state.players.find(
          (player) => player.id === session?.playerId,
        )}
        <button onclick={() => connection.ready(!me?.ready)}
          >{me?.ready ? 'Unready' : 'Ready'}</button
        >
        {#if me?.host}<button
            disabled={observation.state.players.length !== 4 ||
              observation.state.players.some(
                (player) => !player.ready || !player.connected,
              )}
            onclick={() => connection.start()}>Start</button
          >{/if}
        <button onclick={() => connection.leave()}>Leave</button>
        <p>{observation.state.loadingError ?? loadingMessage}</p>
      {:else if observation.state.phase === 'finished' || observation.state.phase === 'aborted'}
        {#if observation.state.players.find((player) => player.id === session?.playerId)?.host}<button
            onclick={() => connection.returnToLobby()}
            >Return everyone to lobby</button
          >{:else}<p>
            Waiting for the host to return everyone to the lobby.
          </p>{/if}
        <button onclick={() => connection.leave()}>Leave room</button>
      {:else if observation.state.phase === 'countdown'}
        <p>
          Starting in {Math.ceil((observation.state.countdown ?? 0) / 1000)}
        </p>
      {:else}<p>{loadingMessage}</p>{/if}
    </section>
  {/if}
  {#if observation?.state.phase === 'running'}
    {#if observation.state.players.find((player) => player.id === session?.playerId)?.life.kind === 'eliminated'}
      <section aria-label="Spectating">
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
    {#if observation.state.offer}
      {@const offer = observation.state.offer}
      <ChoiceOverlay
        offerId={offer.id}
        revision={offer.revision}
        kind={offer.kind ?? 'upgrade'}
        offers={offer.choices.map((id) => {
          const detail = offer.details?.find((item) => item.id === id);
          return {
            id,
            name:
              detail?.name ??
              offer.labels?.find((item) => item.id === id)?.label ??
              id,
            description: detail?.description ?? '',
            rarity: detail?.rarity ?? '',
            rank: detail?.rank ?? 0,
            cost: null,
          };
        })}
        remainingMs={Math.max(
          0,
          (offer.deadline ?? observation.state.time) - observation.state.time,
        )}
        mapPoints={observation.state.players.map((player) => ({
          id: player.id,
          x: ((player.position.x + 32) * 100) / 64,
          y: ((player.position.z + 32) * 100) / 64,
          self: player.id === session?.playerId,
        }))}
        boundary={{
          x: 50,
          y: 50,
          radius: (observation.state.boundary.radius * 100) / 64,
        }}
        warning={observation.state.meteors.length
          ? 'Meteor incoming. Move away from the red ring.'
          : observation.state.boundary.elapsedMs >=
              observation.state.boundary.shrinkStartMs
            ? 'The boundary is closing.'
            : observation.state.boundary.shrinkStartMs -
                  observation.state.boundary.elapsedMs <=
                60000
              ? 'The boundary will begin closing soon.'
              : null}
        rerollCostAvailable={observation.state.progression.currency >= 1}
        onchoose={(choice) =>
          connection.choose(offer.id, offer.revision, choice)}
        onreroll={() => connection.reroll(offer.id, offer.revision)}
      />
    {/if}
    {#if observation.state.offer}
      <section aria-label="Equipment">
        <h2>Equipment</h2>
        {#each ['primary', 'secondary', 'movement', 'ultimate'] as slot (slot)}
          <p>
            {slot}: {observation.state.equipment.slots[
              slot as keyof typeof observation.state.equipment.slots
            ] ?? 'Empty'}
          </p>
          {#if observation.state.offer}
            <button onclick={() => connection.equip(slot, '-')}
              >Unequip {slot}</button
            >
            {#each observation.state.equipment.learned.filter((ability) => ability.slotType === (slot === 'primary' || slot === 'secondary' ? 'attack' : slot)) as ability (ability.id)}
              <button onclick={() => connection.equip(slot, ability.id)}
                >Equip {ability.id} in {slot}</button
              >
            {/each}
          {/if}
        {/each}
      </section>
    {/if}
  {/if}
  <div class="arena">
    <canvas bind:this={canvas} tabindex="0" aria-label="Match world"></canvas>
    {#if observation?.state.phase === 'running' && session}
      <MatchHud state={observation.state} playerId={session.playerId} />
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
  main {
    max-width: 80rem;
    margin: auto;
    padding: 1rem;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  h1 {
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 400;
    letter-spacing: -0.04em;
  }
  .arena {
    position: relative;
  }
  canvas {
    display: block;
    cursor: crosshair;
    width: 100%;
    height: min(65vh, 40rem);
  }
</style>
