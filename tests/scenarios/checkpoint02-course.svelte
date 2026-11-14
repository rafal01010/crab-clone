<script lang="ts">
  import { onMount } from 'svelte';
  import { io, type Socket } from 'socket.io-client';
  import * as THREE from 'three';
  import { createWorld } from '../../src/lib/game-client/world.js';
  import { createControls } from '../../src/lib/game-client/controls.js';
  import ChoiceOverlay from '../../src/lib/ui/ChoiceOverlay.svelte';
  import type { Observation } from '../../shared/protocol/index.js';

  const offers = [
    {
      id: 'a',
      name: 'Detachable Tail',
      rarity: 'Rare',
      rank: 2,
      cost: 0,
      description:
        'When an enemy damages you or you dodge, leave a decoy behind. It attracts nearby enemies for a limited time and has its own cooldown.',
    },
    {
      id: 'b',
      name: 'Pollinator',
      rarity: 'Branching',
      rank: 2,
      cost: 2,
      description:
        'Discovering a point of interest increases vegetation growth. After you discover several points of interest, receive a random bonus.',
    },
    {
      id: 'c',
      name: 'Poisonous Saliva',
      rarity: 'Rare',
      rank: 3,
      cost: 3,
      description:
        'Impacts from jaws, beak, leech, spit, and projectile tongue attacks apply poison. The poison deals ability damage once per second.',
    },
  ];
  let canvas: HTMLCanvasElement;
  let socket: Socket;
  let playerId = $state('');
  let status = $state('Connecting');
  let snapshot = $state<Observation | null>(null);
  let remaining = $state(0);
  let selected = $state('');
  let serverPosition = $derived(
    snapshot?.state.players.find((player) => player.id === playerId)?.position,
  );
  let serverAim = $derived(
    snapshot?.state.players.find((player) => player.id === playerId)?.aim,
  );
  let offer = $derived(snapshot?.state.offer);
  let seq = Date.now() * 1000;
  onMount(() => {
    const world = createWorld(canvas);
    socket = io(new URLSearchParams(location.search).get('host') ?? '', {
      transports: ['websocket'],
    });
    const controls = createControls(canvas, world.aimAt, (control) => {
      world.setControl(control);
      if (socket.connected && snapshot && playerId)
        socket.emit('intent', {
          ...control,
          kind: 'control',
          matchId: snapshot.matchId,
          playerId,
          sequence: ++seq,
        });
    });
    socket.on('session', (session: { playerId: string }) => {
      playerId = session.playerId;
      status = 'Connected';
      world.setConnected(true);
      world.setViewer(playerId);
    });
    socket.on(
      'observation',
      (message: {
        observation: Observation;
        remainingMs: number;
        outcome: string;
      }) => {
        if (!world.update(message.observation)) return;
        snapshot = message.observation;
        remaining = message.remainingMs;
        selected = message.outcome;
        const own = snapshot.state.players.find(
          (player) => player.id === playerId,
        );
        controls.setEnabled(
          snapshot.state.phase === 'running' &&
            own?.life.kind === 'alive' &&
            own.life.activity === 'playing',
        );
      },
    );
    socket.on('disconnect', () => {
      status = 'Disconnected';
      controls.setEnabled(false);
      world.setConnected(false);
    });
    let removeWall: (() => void) | undefined;
    function toggleWall() {
      if (removeWall) {
        removeWall();
        removeWall = undefined;
        return;
      }
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 3, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x777777 }),
      );
      wall.position.set(1, 1.5, 1);
      removeWall = world.addOccluder(wall);
    }
    window.addEventListener('fixture-wall', toggleWall);
    return () => {
      window.removeEventListener('fixture-wall', toggleWall);
      removeWall?.();
      controls.dispose();
      socket.disconnect();
      world.dispose();
    };
  });
  function choose(id: string): Promise<boolean> {
    return new Promise((resolve) =>
      socket
        .timeout(1000)
        .emit('choose', id, (error: unknown, accepted: boolean) =>
          resolve(!error && accepted),
        ),
    );
  }
</script>

<p data-testid="status">{status}</p>
<button onclick={() => socket.emit('open-offer')}>Open choice</button>
<button onclick={() => window.dispatchEvent(new Event('fixture-wall'))}
  >Toggle wall</button
>
<label>Chat <input aria-label="Chat" /></label>
<output data-testid="state"
  >{JSON.stringify({
    position: serverPosition,
    aim: serverAim,
    selected,
    phase: snapshot?.state.phase,
  })}</output
>
<canvas bind:this={canvas} tabindex="0" aria-label="Course"></canvas>
{#if offer}
  <ChoiceOverlay
    offerId={offer.id}
    revision={offer.revision}
    {offers}
    remainingMs={remaining}
    mapPoints={snapshot?.state.players.map((player) => ({
      id: player.id,
      x: Math.max(0, Math.min(100, 50 + player.position.x * 0.2)),
      y: Math.max(0, Math.min(100, 50 + player.position.z * 0.2)),
      self: player.id === playerId,
    })) ?? []}
    boundary={{ x: 50, y: 50, radius: 35 }}
    warning="Boundary closing"
    onchoose={choose}
  />
{/if}
