import type { MatchPhase, MatchView, PlayerLife } from '../../shared/match.js';
import type { Intent } from '../../shared/protocol/index.js';
import RAPIER, { type World } from '@dimforge/rapier3d-compat';
import { initialStartingStats } from '../content/starting.js';
import { COLLISION, createCraft, steerCraft } from './physics/hover.js';

type MatchCommand =
  | { kind: 'join'; playerId: string }
  | { kind: 'connect'; playerId: string }
  | { kind: 'disconnect'; playerId: string }
  | { kind: 'eliminate'; playerId: string }
  | {
      kind: 'activity';
      playerId: string;
      activity: Extract<PlayerLife, { kind: 'alive' }>['activity'];
    }
  | { kind: 'start' }
  | { kind: 'finish' }
  | { kind: 'abort' };

type Player = {
  connected: boolean;
  maximumHealthBonus: number;
  craft: ReturnType<typeof createCraft>;
  aim: number;
  life: PlayerLife;
  ready: boolean;
  control: {
    intent: Extract<Intent, { kind: 'control' }>;
    expiresAt: number;
  } | null;
};

const CONTROL_EXPIRY_MS = 250;

function setSelecting(player: Player, selecting: boolean): void {
  player.craft.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  player.craft.body.setEnabledTranslations(
    !selecting,
    !selecting,
    !selecting,
    true,
  );
  player.craft.collider.setSensor(selecting);
}

export class Match {
  readonly #id: string;
  readonly #world: World;
  #phase: MatchPhase = 'lobby';
  #time = 0;
  readonly #players = new Map<string, Player>();
  readonly #hiddenPlayers = new Map<string, Set<string>>();
  readonly #selections: { playerId: string; choiceId: string }[] = [];
  readonly #offers = new Map<
    string,
    { id: string; revision: number; choices: readonly string[] }
  >();

  constructor(id: string, world: World) {
    if (!id) throw new Error('Match identity is required');
    this.#id = id;
    this.#world = world;
    this.#world.gravity = { x: 0, y: -9.81, z: 0 };
    this.#world.createCollider(
      RAPIER.ColliderDesc.cuboid(1000, 0.25, 1000)
        .setTranslation(0, -0.25, 0)
        .setFriction(0)
        .setCollisionGroups(COLLISION.terrain),
    );
  }

  accept(command: MatchCommand): boolean {
    if (command.kind === 'join') {
      if (
        this.#phase !== 'lobby' ||
        !command.playerId ||
        this.#players.has(command.playerId) ||
        this.#players.size >= 4
      )
        return false;
      this.#players.set(command.playerId, {
        connected: true,
        ...initialStartingStats(),
        craft: createCraft(this.#world, {
          x: (this.#players.size % 2) * 3 - 1.5,
          y: 0.25,
          z: Math.floor(this.#players.size / 2) * 3 - 1.5,
        }),
        aim: 0,
        ready: false,
        control: null,
        life: { kind: 'alive', activity: 'playing' },
      });
      return true;
    }
    if (command.kind === 'start') {
      if (this.#phase !== 'lobby' || this.#players.size === 0) return false;
      this.#phase = 'running';
      return true;
    }
    if (command.kind === 'finish') {
      if (this.#phase !== 'running') return false;
      this.#phase = 'finished';
      return true;
    }
    if (command.kind === 'abort') {
      if (this.#phase === 'finished' || this.#phase === 'aborted') return false;
      this.#phase = 'aborted';
      return true;
    }
    const player = this.#players.get(command.playerId);
    if (!player || this.#phase === 'finished' || this.#phase === 'aborted')
      return false;
    if (command.kind === 'connect' || command.kind === 'disconnect') {
      player.connected = command.kind === 'connect';
      if (!player.connected) {
        player.ready = false;
        player.control = null;
      }
      return true;
    }
    if (this.#phase !== 'running' || player.life.kind !== 'alive') return false;
    if (command.kind === 'eliminate') {
      if (player.life.activity === 'selecting') setSelecting(player, false);
      player.life = { kind: 'eliminated' };
      this.#offers.delete(command.playerId);
    } else {
      if (
        command.activity === 'selecting' &&
        !this.#offers.has(command.playerId)
      )
        return false;
      if (command.activity !== 'selecting')
        this.#offers.delete(command.playerId);
      if (
        (player.life.activity === 'selecting') !==
        (command.activity === 'selecting')
      )
        setSelecting(player, command.activity === 'selecting');
      player.life = { kind: 'alive', activity: command.activity };
    }
    if (player.life.kind === 'eliminated' || player.life.activity !== 'playing')
      player.control = null;
    return true;
  }

  setPlayerVisibility(
    viewerId: string,
    playerId: string,
    visible: boolean,
  ): boolean {
    if (
      !this.#players.has(viewerId) ||
      !this.#players.has(playerId) ||
      viewerId === playerId
    )
      return false;
    if (visible) {
      this.#hiddenPlayers.get(viewerId)?.delete(playerId);
    } else {
      const hidden = this.#hiddenPlayers.get(viewerId) ?? new Set<string>();
      hidden.add(playerId);
      this.#hiddenPlayers.set(viewerId, hidden);
    }
    return true;
  }

  setOffer(
    playerId: string,
    offer: { id: string; revision: number; choices: readonly string[] },
  ): boolean {
    const player = this.#players.get(playerId);
    if (
      this.#phase !== 'running' ||
      player?.life.kind !== 'alive' ||
      !offer.id ||
      !Number.isSafeInteger(offer.revision) ||
      offer.revision < 0 ||
      offer.choices.length === 0 ||
      offer.choices.some((id) => !id)
    )
      return false;
    this.#offers.set(playerId, { ...offer, choices: [...offer.choices] });
    setSelecting(player, true);
    player.life = { kind: 'alive', activity: 'selecting' };
    player.control = null;
    return true;
  }

  authorize(intent: Intent): boolean {
    const player = this.#players.get(intent.playerId);
    if (
      !player?.connected ||
      intent.matchId !== this.#id ||
      player.life.kind !== 'alive'
    )
      return false;
    if (intent.kind === 'ready') return this.#phase === 'lobby';
    if (this.#phase !== 'running') return false;
    if (intent.kind === 'control') return player.life.activity === 'playing';
    if (intent.kind === 'choice') {
      const offer = this.#offers.get(intent.playerId);
      return (
        player.life.activity === 'selecting' &&
        !!offer &&
        offer.id === intent.offerId &&
        offer.revision === intent.revision &&
        offer.choices.includes(intent.choiceId)
      );
    }
    return false;
  }

  consume(intent: Intent): void {
    if (!this.authorize(intent)) return;
    if (intent.kind === 'ready') this.setReady(intent.playerId, intent.ready);
    if (intent.kind === 'control') this.setControl(intent.playerId, intent);
    if (intent.kind === 'choice') {
      this.#selections.push({
        playerId: intent.playerId,
        choiceId: intent.choiceId,
      });
      this.#offers.delete(intent.playerId);
      const player = this.#players.get(intent.playerId);
      if (player) {
        setSelecting(player, false);
        player.life = { kind: 'alive', activity: 'playing' };
      }
    }
  }

  takeSelections(): { playerId: string; choiceId: string }[] {
    return this.#selections.splice(0);
  }

  setReady(playerId: string, ready: boolean): void {
    const player = this.#players.get(playerId);
    if (this.#phase === 'lobby' && player?.connected) player.ready = ready;
  }

  setControl(
    playerId: string,
    intent: Extract<Intent, { kind: 'control' }>,
  ): void {
    const player = this.#players.get(playerId);
    if (
      this.#phase === 'running' &&
      player?.connected &&
      player.life.kind === 'alive' &&
      player.life.activity === 'playing'
    ) {
      player.control = { intent, expiresAt: this.#time + CONTROL_EXPIRY_MS };
      player.aim = intent.aim;
    }
  }

  advance(deltaMs: number): boolean {
    if (this.#phase !== 'running' || !Number.isFinite(deltaMs) || deltaMs < 0)
      return false;
    const dt = deltaMs / 1000;
    for (const player of this.#players.values()) {
      if (player.control && player.control.expiresAt <= this.#time)
        player.control = null;
      const input = player.control?.intent ?? { x: 0, y: 0 };
      steerCraft(player.craft.body, input, dt);
    }
    this.#world.timestep = dt;
    this.#world.step();
    this.#time += deltaMs;
    return true;
  }

  dispose(): void {
    this.#world.free();
  }

  view(viewerId: string): MatchView | undefined {
    if (!this.#players.has(viewerId)) return undefined;
    return {
      id: this.#id,
      phase: this.#phase,
      time: this.#time,
      offer: (() => {
        const offer = this.#offers.get(viewerId);
        return offer ? { ...offer, choices: [...offer.choices] } : null;
      })(),
      players: [...this.#players]
        .filter(([id]) => !this.#hiddenPlayers.get(viewerId)?.has(id))
        .map(([id, player]) => ({
          id,
          connected: player.connected,
          maximumHealthBonus: player.maximumHealthBonus,
          position: player.craft.body.translation(),
          radius: player.craft.collider.radius(),
          aim: player.aim,
          life: { ...player.life },
        })),
    };
  }
}
