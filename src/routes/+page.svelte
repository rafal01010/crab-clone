<script lang="ts">
  import { onMount } from 'svelte';
  import type { Observation } from '../../shared/protocol/index.js';
  import { connectSession, type Session } from '../lib/net/session.js';
  import { createWorld } from '../lib/game-client/world.js';
  import { createControls } from '../lib/game-client/controls.js';

  let canvas: HTMLCanvasElement;
  let observation = $state<Observation | null>(null);
  let session = $state<Session | null>(null);
  let status = $state('Connecting');
  onMount(() => {
    const world = createWorld(canvas);
    let connection: ReturnType<typeof connectSession>;
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
          updateControls();
        }
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
    <p>{status}</p>
  </header>
  <div class="arena">
    <canvas bind:this={canvas} tabindex="0" aria-label="Match world"></canvas>
    {#if observation}
      <section class="hud" aria-label="Match status">
        <p>Match: {observation.state.phase}</p>
        <p>Players: {observation.state.players.length} / 4</p>
      </section>
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
  .hud {
    position: absolute;
    top: 12px;
    left: 12px;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    pointer-events: none;
  }
  .hud p {
    margin: 0;
    padding: 6px 9px;
    background: rgb(0 0 0 / 90%);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
  }
</style>
