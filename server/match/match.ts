import { randomUUID } from 'node:crypto';
import { createArena } from '../../shared/arena.js';
import type {
  MatchPhase,
  MatchView,
  MatchResult,
  PlayerLife,
} from '../../shared/match.js';
import { CONTROL_BUTTON, type Intent } from '../../shared/protocol/index.js';
import RAPIER, { type World } from '@dimforge/rapier3d-compat';
import { initialStartingStats } from '../content/starting.js';
import {
  BODY_SLAM_PHYSICAL,
  createStarterRegistry,
} from '../content/starter.js';
import { terrainSpeedMultiplier, type Terrain } from '../../shared/movement.js';
import { BASE_STATS, type Stat } from './stats.js';
import { deriveStats, type Stats, type StatModifier } from './stats.js';
import {
  initialHealth,
  repair,
  gainLevels,
  updateHealthStats,
  type Health,
} from './health.js';
import { COLLISION, createCraft, steerCraft } from './physics/hover.js';
import {
  addStatus,
  advanceStatuses,
  applyDamage,
  type DamageEvent,
  type Status,
  type StatusKind,
} from './combat.js';
import {
  equip,
  initialEquipment,
  isAbilitySlot,
  type Ability,
  type AbilitySlot,
  type Equipment,
} from './equipment.js';
import { BOT_RULES, type Bot } from './bots.js';
import { boundaryRadius, finaleConfig, type FinaleConfig } from './finale.js';
import { SelectionWindow } from './selection-window.js';
import { generateOffer, rarityRank, type OfferChoice } from './offers.js';
import {
  MAX_RESOURCES,
  RESOURCE_TOTAL,
  STAGE_WEIGHT,
  levelRequirement,
  transact,
  type CollectionEvent,
  type Progression,
  type Resource,
  type Wallet,
} from './economy.js';

type MatchCommand =
  | { kind: 'join'; playerId: string; name?: string }
  | { kind: 'connect'; playerId: string }
  | { kind: 'disconnect'; playerId: string }
  | { kind: 'eliminate'; playerId: string; ownerId?: string | null }
  | {
      kind: 'activity';
      playerId: string;
      activity: Extract<PlayerLife, { kind: 'alive' }>['activity'];
    }
  | { kind: 'start' }
  | { kind: 'loaded'; playerId: string; revision: number }
  | { kind: 'loading-failed'; playerId: string; revision: number }
  | { kind: 'leave'; playerId: string }
  | { kind: 'finish' }
  | { kind: 'abort' };

type Player = {
  connected: boolean;
  spectating: string | null;
  matchStats: {
    damageDealt: number;
    damageTaken: number;
    eliminations: number;
    salvageStages: number;
  };
  name: string;
  loaded: boolean;
  slot: number;
  stats: Stats;
  health: Health;
  modifiers: StatModifier[];
  statuses: Status[];
  statusImmunities: Set<StatusKind>;
  reflection: number;
  attack: {
    hitAt: number;
    readyAt: number;
    aim: number;
    damage: number;
  } | null;
  attackReadyAt: number;
  equipment: Equipment;
  ranks: Map<string, number>;
  rarities: Map<string, string>;
  affinities: Map<string, number>;
  carcinisation: number;
  specializations: Set<string>;
  selection: SelectionWindow;
  managedSelection: boolean;
  generatedChoices: OfferChoice[];
  activeReward: Progression['pending'][number] | null;
  dash: { x: number; z: number; until: number } | null;
  progression: Progression;
  wallet: Wallet;
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

type Projectile = {
  id: number;
  ownerId: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  remaining: number;
  damage: number;
  impulse: number;
};

const CONTROL_EXPIRY_MS = 250;
const CARCINISATION_DAMAGE_PER_POINT = 0.1;
const CARCINISATION_RARITY_PER_POINT = 0.08;
const CARCINISATION_THRESHOLD_LEVELS = [4, 7, 10] as const;
const CARCINISATION_THRESHOLD_DAMAGE = 0.05;

function carcinisationDamage(level: number): number {
  return (
    level * CARCINISATION_DAMAGE_PER_POINT +
    CARCINISATION_THRESHOLD_LEVELS.filter((threshold) => level >= threshold)
      .length *
      CARCINISATION_THRESHOLD_DAMAGE
  );
}

function setSelecting(player: Player, selecting: boolean): void {
  if (selecting) player.dash = null;
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
  readonly #roundId = randomUUID();
  readonly #world: World;
  readonly #arena: ReturnType<typeof createArena>;
  #phase: MatchPhase = 'lobby';
  #result: MatchResult | null = null;
  readonly #eliminationGroups: string[][] = [];
  #time = 0;
  #wallTime = 0;
  #wallAnchor: number | null = null;
  readonly #finale: FinaleConfig;
  #nextMeteorAt = 0;
  #meteorId = 0;
  readonly #meteors: {
    id: number;
    position: { x: number; z: number };
    radius: number;
    impactAt: number;
  }[] = [];
  #loadingTime = 0;
  #loadingRevision = 0;
  #countdown = 0;
  #loadingError: string | null = null;
  readonly #players = new Map<string, Player>();
  readonly #hiddenPlayers = new Map<string, Set<string>>();
  readonly #selections: { playerId: string; choiceId: string }[] = [];
  readonly #deaths: { playerId: string; ownerId: string | null }[] = [];
  readonly #damageLedger: {
    event: DamageEvent;
    result: ReturnType<typeof applyDamage>;
  }[] = [];
  readonly #projectiles: Projectile[] = [];
  readonly #content = createStarterRegistry();
  readonly #worldConditions = new Set<string>();
  readonly #abilityCatalog = new Map<string, Ability>();
  readonly #bots = new Map<string, Bot>();
  #nextBotId = 0;
  #nextBotSpawn = 15000;
  readonly #resources = new Map<string, Resource>();
  readonly #collections: CollectionEvent[] = [];
  #resourceId = 0;
  #projectileId = 0;
  #promptId = 0;
  readonly #offers = new Map<
    string,
    { id: string; revision: number; choices: readonly string[] }
  >();

  constructor(
    id: string,
    world: World,
    terrainSeed = Math.floor(Math.random() * 0x100000000),
    finale: Partial<FinaleConfig> = {},
    initialLoadingRevision = 0,
  ) {
    this.#loadingRevision = initialLoadingRevision;
    this.#finale = finaleConfig(finale);
    this.#nextMeteorAt = this.#finale.shrinkStartMs;
    if (!id) throw new Error('Match identity is required');
    this.#id = id;
    this.#world = world;
    this.#arena = createArena(terrainSeed);
    this.#world.gravity = { x: 0, y: -9.81, z: 0 };
    this.#world.createCollider(
      RAPIER.ColliderDesc.cuboid(64, 0.25, 64)
        .setTranslation(0, -0.25, 0)
        .setFriction(0)
        .setCollisionGroups(COLLISION.terrain),
    );
    for (const box of this.#arena.obstacles) {
      this.#world.createCollider(
        RAPIER.ColliderDesc.cuboid(box.width / 2, box.height / 2, box.depth / 2)
          .setTranslation(box.x, box.height / 2, box.z)
          .setCollisionGroups(COLLISION.terrain),
      );
    }
    for (const position of this.#arena.resources) {
      this.#createResource({
        position,
        source: 'vegetation',
        rarity: 'common',
        killerId: null,
        ownerId: null,
        killerKind: null,
        repair: false,
      });
      this.#createResource({
        position: { x: position.x + 1.5, z: position.z },
        source: 'vegetation',
        rarity: 'common',
        killerId: null,
        ownerId: null,
        killerKind: null,
        repair: true,
      });
    }
    const positions = [
      { x: 0, z: -22 },
      { x: 22, z: 0 },
      { x: 0, z: 22 },
      { x: -22, z: 0 },
    ];
    for (let index = 0; index < BOT_RULES.count; index++) {
      const position = positions[index];
      if (!position) continue;
      this.#spawnBot(position, 1);
    }
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
      const slot = [0, 1, 2, 3].find((index) =>
        [...this.#players.values()].every((item) => item.slot !== index),
      );
      if (slot === undefined) return false;
      const stats = deriveStats([], 1);
      this.#players.set(command.playerId, {
        connected: true,
        spectating: null,
        matchStats: {
          damageDealt: 0,
          damageTaken: 0,
          eliminations: 0,
          salvageStages: 0,
        },
        name: command.name ?? 'Player',
        loaded: false,
        slot,
        stats,
        health: initialHealth(stats),
        modifiers: [],
        statuses: [],
        statusImmunities: new Set(),
        reflection: 0,
        attack: null,
        attackReadyAt: 0,
        equipment: initialEquipment(),
        ranks: new Map(),
        rarities: new Map(),
        affinities: new Map(),
        carcinisation: 0,
        specializations: new Set(),
        selection: new SelectionWindow(Math.random),
        managedSelection: false,
        generatedChoices: [],
        activeReward: null,
        dash: null,
        progression: { progress: 0, pending: [], depletedRewards: 0 },
        wallet: { balance: 0, receipts: new Map() },
        ...initialStartingStats(),
        craft: createCraft(
          this.#world,
          this.#arena.spawns[slot] ?? { x: 0, y: 0.25, z: 0 },
        ),
        aim: 0,
        ready: false,
        control: null,
        life: { kind: 'alive', activity: 'playing' },
      });
      return true;
    }
    if (command.kind === 'start') {
      if (
        this.#phase !== 'lobby' ||
        this.#players.size !== 4 ||
        [...this.#players.values()].some(
          (player) => !player.connected || !player.ready,
        )
      )
        return false;
      this.#phase = 'loading';
      this.#loadingRevision++;
      this.#loadingError = null;
      this.#loadingTime = 0;
      for (const player of this.#players.values()) player.loaded = false;
      return true;
    }
    if (command.kind === 'finish') {
      if (this.#phase !== 'running') return false;
      this.#phase = 'finished';
      this.#clearCombat();
      return true;
    }
    if (command.kind === 'abort') {
      if (this.#phase === 'finished' || this.#phase === 'aborted') return false;
      this.#phase = 'aborted';
      this.#clearCombat();
      return true;
    }
    const player = this.#players.get(command.playerId);
    if (!player) return false;
    if (command.kind === 'leave') {
      if (
        this.#phase !== 'lobby' &&
        this.#phase !== 'finished' &&
        this.#phase !== 'aborted'
      )
        return false;
      this.#world.removeRigidBody(player.craft.body);
      this.#players.delete(command.playerId);
      return true;
    }
    if (command.kind === 'connect' || command.kind === 'disconnect') {
      player.connected = command.kind === 'connect';
      player.selection.setConnected(player.connected, this.#time);
      if (!player.connected) {
        if (this.#phase === 'loading' || this.#phase === 'countdown')
          this.#returnToLobby(
            'A player disconnected while loading. Ready again to retry.',
          );
        player.ready = false;
        player.control = null;
      }
      return true;
    }
    if (this.#phase === 'finished' || this.#phase === 'aborted') return false;
    if (command.kind === 'loaded') {
      if (
        this.#phase !== 'loading' ||
        !player.connected ||
        command.revision !== this.#loadingRevision
      )
        return false;
      player.loaded = true;
      if (
        [...this.#players.values()].every(
          (item) => item.loaded && item.connected,
        )
      ) {
        this.#phase = 'countdown';
        this.#countdown = 3000;
      }
      return true;
    }
    if (command.kind === 'loading-failed') {
      if (
        (this.#phase !== 'loading' && this.#phase !== 'countdown') ||
        command.revision !== this.#loadingRevision
      )
        return false;
      this.#returnToLobby(
        'A player could not load the required assets. Ready again to retry.',
      );
      return true;
    }
    if (this.#phase !== 'running' || player.life.kind !== 'alive') return false;
    if (command.kind === 'eliminate') {
      if (player.life.activity === 'selecting') setSelecting(player, false);
      const position = player.craft.body.translation();
      this.#createResource({
        position,
        source: 'meat',
        rarity: 'common',
        killerId: command.ownerId ?? null,
        ownerId: command.ownerId ?? null,
        killerKind:
          command.ownerId && this.#players.has(command.ownerId)
            ? 'player'
            : 'third-party',
        repair: false,
      });
      player.life = { kind: 'eliminated' };
      player.spectating =
        [...this.#players].find(
          ([id, other]) =>
            id !== command.playerId && other.life.kind === 'alive',
        )?.[0] ?? null;
      player.selection.cancel();
      player.progression.pending.length = 0;
      player.activeReward = null;
      player.generatedChoices = [];
      player.dash = null;
      player.craft.body.setEnabled(false);
      for (let index = this.#projectiles.length - 1; index >= 0; index--)
        if (this.#projectiles[index]?.ownerId === command.playerId)
          this.#projectiles.splice(index, 1);
      for (const other of this.#players.values()) {
        other.statuses = other.statuses.filter(
          (status) => status.ownerId !== command.playerId,
        );
        if (
          other.life.kind === 'eliminated' &&
          other.spectating === command.playerId
        )
          other.spectating =
            [...this.#players].find(
              ([, candidate]) => candidate.life.kind === 'alive',
            )?.[0] ?? null;
      }
      player.statuses.length = 0;
      player.attack = null;
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

  #returnToLobby(reason: string): void {
    this.#phase = 'lobby';
    this.#loadingError = reason;
    for (const player of this.#players.values()) {
      player.ready = false;
      player.loaded = false;
    }
  }

  #clearCombat(): void {
    this.#projectiles.length = 0;
    for (const player of this.#players.values()) {
      player.statuses.length = 0;
      player.attack = null;
    }
  }

  #combatantAtCollider(handle: number): string | null {
    for (const [id, player] of this.#players)
      if (
        player.craft.collider.handle === handle &&
        player.life.kind === 'alive'
      )
        return id;
    for (const [id, bot] of this.#bots)
      if (bot.craft.collider.handle === handle && bot.health > 0) return id;
    return null;
  }

  #spawnBot(position: { x: number; z: number }, tier: number): void {
    const id = `bot-${++this.#nextBotId}`;
    this.#bots.set(id, {
      id,
      tier,
      health: BOT_RULES.health * tier,
      maxHealth: BOT_RULES.health * tier,
      craft: createCraft(this.#world, { ...position, y: 0.25 }),
      targetId: null,
      hostileToBots: false,
      windupUntil: null,
      readyAt: 0,
    });
  }

  #replenishBots(): void {
    if (this.#time < this.#nextBotSpawn) return;
    this.#nextBotSpawn = this.#time + 3000;
    if (this.#bots.size >= 8) return;
    const spawnRadius = Math.min(
      22,
      Math.max(0, boundaryRadius(this.#wallTime, this.#finale) - 2),
    );
    if (spawnRadius < 1) return;
    const positions = [
      { x: 0, z: -spawnRadius },
      { x: spawnRadius, z: 0 },
      { x: 0, z: spawnRadius },
      { x: -spawnRadius, z: 0 },
    ];
    const candidates = positions.filter((position) => {
      for (const player of this.#players.values()) {
        const point = player.craft.body.translation();
        if (
          player.life.kind === 'alive' &&
          Math.hypot(point.x - position.x, point.z - position.z) < 8
        )
          return false;
      }
      for (const bot of this.#bots.values()) {
        const point = bot.craft.body.translation();
        if (Math.hypot(point.x - position.x, point.z - position.z) < 4)
          return false;
      }
      return true;
    });
    const position = candidates[this.#nextBotId % candidates.length];
    if (!position) return;
    this.#spawnBot(position, this.#time >= 120000 ? 2 : 1);
    this.#nextBotSpawn = this.#time + 15000;
  }

  #advanceBots(deltaMs: number): DamageEvent[] {
    const attacks: DamageEvent[] = [];
    for (const bot of this.#bots.values()) {
      const position = bot.craft.body.translation();
      let target: {
        id: string;
        position: { x: number; y: number; z: number };
      } | null = null;
      let closest: number = BOT_RULES.aggro;
      for (const [id, player] of this.#players) {
        if (player.life.kind !== 'alive' || player.life.activity !== 'playing')
          continue;
        const other = player.craft.body.translation();
        const distance = Math.hypot(other.x - position.x, other.z - position.z);
        if (distance < closest) {
          closest = distance;
          target = { id, position: other };
        }
      }
      if (bot.hostileToBots)
        for (const other of this.#bots.values()) {
          if (other.id === bot.id || other.health <= 0) continue;
          const otherPosition = other.craft.body.translation();
          const distance = Math.hypot(
            otherPosition.x - position.x,
            otherPosition.z - position.z,
          );
          if (distance < closest) {
            closest = distance;
            target = { id: other.id, position: otherPosition };
          }
        }
      bot.targetId = target?.id ?? null;
      if (!target) {
        bot.windupUntil = null;
        const angle = this.#time / 4000 + Number(bot.id.slice(4)) * 2;
        steerCraft(
          bot.craft.body,
          { x: Math.cos(angle) * 0.25, y: Math.sin(angle) * 0.25 },
          deltaMs / 1000,
        );
        continue;
      }
      const dx = target.position.x - position.x;
      const dz = target.position.z - position.z;
      const distance = Math.hypot(dx, dz);
      const direction =
        distance > 0
          ? { x: dx / distance, y: 0, z: dz / distance }
          : { x: 0, y: 0, z: 1 };
      const ray = this.#world.castRay(
        new RAPIER.Ray(position, direction),
        Math.max(distance + 0.6, 0.6),
        true,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
        undefined,
        bot.craft.collider,
      );
      const visible =
        ray && this.#combatantAtCollider(ray.collider.handle) === target.id;
      if (bot.windupUntil !== null && this.#time + deltaMs >= bot.windupUntil) {
        if (visible && distance <= BOT_RULES.attackRange)
          attacks.push({
            targetId: target.id,
            ownerId: bot.id,
            channel: 'contact',
            amount: BOT_RULES.damage * bot.tier,
            depth: 0,
          });
        bot.windupUntil = null;
      }
      if (
        bot.windupUntil === null &&
        this.#time >= bot.readyAt &&
        visible &&
        distance <= BOT_RULES.attackRange
      ) {
        bot.windupUntil = this.#time + BOT_RULES.windup;
        bot.readyAt = this.#time + BOT_RULES.cooldown;
      }
      const moving = bot.windupUntil === null && distance > 1.5;
      steerCraft(
        bot.craft.body,
        {
          x: moving ? direction.x * BOT_RULES.speed : 0,
          y: moving ? direction.z * BOT_RULES.speed : 0,
        },
        deltaMs / 1000,
      );
    }
    return attacks;
  }

  setBotHostility(botId: string, hostile: boolean): boolean {
    const bot = this.#bots.get(botId);
    if (!bot) return false;
    bot.hostileToBots = hostile;
    return true;
  }

  #advanceResources(deltaMs: number): void {
    const players = [...this.#players.entries()].sort(([a], [b]) =>
      a === b ? 0 : a < b ? -1 : 1,
    );
    for (const resource of this.#resources.values()) {
      if (resource.expiresAt <= this.#time + deltaMs) {
        this.#resources.delete(resource.id);
        continue;
      }
      for (const [playerId, player] of players) {
        if (
          !player.connected ||
          player.life.kind !== 'alive' ||
          player.life.activity !== 'playing'
        )
          continue;
        const position = player.craft.body.translation();
        if (
          Math.hypot(
            position.x - resource.position.x,
            position.z - resource.position.z,
          ) > player.stats.salvageReach
        )
          continue;
        const elapsed =
          (resource.collectors.get(playerId) ?? 0) +
          (deltaMs * player.stats.salvageSpeed) / 100;
        resource.collectors.set(playerId, elapsed);
        if (resource.stage > 0 && elapsed < 1000) continue;
        const weight = STAGE_WEIGHT[resource.stage];
        if (weight === undefined) continue;
        const sourceFactor =
          resource.source === 'vegetation'
            ? player.stats.vegetationProgress
            : resource.source === 'aquatic'
              ? player.stats.fishProgress
              : player.stats.meatProgress;
        let rarity = resource.claimantRarities.get(playerId);
        if (!rarity) {
          const tiers = ['common', 'rare', 'epic', 'legendary'] as const;
          const base = tiers.indexOf(resource.rarity);
          const improved =
            Math.random() <
            Math.min(1, player.carcinisation * CARCINISATION_RARITY_PER_POINT);
          rarity =
            tiers[Math.min(tiers.length - 1, base + (improved ? 1 : 0))] ??
            resource.rarity;
          resource.claimantRarities.set(playerId, rarity);
        }
        const progress =
          (((((RESOURCE_TOTAL[rarity] * weight) / 5) * player.stats.progress) /
            100) *
            sourceFactor) /
          100;
        const healing = resource.repair
          ? repair(
              player.health,
              player.stats,
              player.stats.maximumHealth * 0.02 * weight,
              true,
            )
          : null;
        const provenance =
          resource.killerKind === 'player' && resource.killerId === playerId
            ? 'own-kill'
            : resource.killerKind === 'ally' && resource.ownerId === playerId
              ? 'ally-kill'
              : resource.killerKind === null
                ? 'none'
                : 'third-party';
        this.#collections.push({
          resourceId: resource.id,
          playerId,
          stage: resource.stage + 1,
          source: resource.source,
          rarity,
          killerId: resource.killerId,
          ownerId: resource.ownerId,
          provenance,
          progress,
          repair: healing && {
            attempted: healing.attempted,
            actual: healing.actual,
            consumedAtFullHealth: healing.consumedAtFullHealth,
          },
        });
        if (this.#collections.length > 4096) this.#collections.shift();
        player.matchStats.salvageStages++;
        resource.stage++;
        resource.collectors.clear();
        this.grantProgress(playerId, progress);
        if (resource.stage === STAGE_WEIGHT.length)
          this.#resources.delete(resource.id);
        break;
      }
    }
  }

  #createResource(
    input: Pick<
      Resource,
      | 'position'
      | 'source'
      | 'rarity'
      | 'killerId'
      | 'ownerId'
      | 'killerKind'
      | 'repair'
    >,
  ): string | null {
    if (
      !Number.isFinite(input.position.x) ||
      !Number.isFinite(input.position.z)
    )
      return null;
    if (this.#resources.size >= MAX_RESOURCES) {
      const oldest = this.#resources.keys().next().value;
      if (oldest) this.#resources.delete(oldest);
    }
    const id = `resource-${++this.#resourceId}`;
    this.#resources.set(id, {
      ...input,
      position: { ...input.position },
      id,
      stage: 0,
      expiresAt: this.#time + 180000,
      collectors: new Map(),
      claimantRarities: new Map(),
    });
    return id;
  }

  spawnResource(
    input: Pick<
      Resource,
      | 'position'
      | 'source'
      | 'rarity'
      | 'killerId'
      | 'ownerId'
      | 'killerKind'
      | 'repair'
    >,
  ): string | null {
    if (
      this.#phase !== 'running' ||
      !Object.hasOwn(RESOURCE_TOTAL, input.rarity) ||
      !['vegetation', 'meat', 'aquatic'].includes(input.source)
    )
      return null;
    return this.#createResource(input);
  }

  walletTransaction(
    playerId: string,
    receiptId: string,
    kind: 'grant' | 'spend',
    amount: number,
  ) {
    const player = this.#players.get(playerId);
    if (!player) return null;
    const prior = player.wallet.receipts.get(receiptId);
    if (prior)
      return prior.kind === kind && prior.amount === amount ? prior : null;
    if (this.#phase !== 'running' || player.life.kind !== 'alive') return null;
    return transact(player.wallet, receiptId, kind, amount);
  }

  grantProgress(playerId: string, amount: number): boolean {
    const player = this.#players.get(playerId);
    if (
      this.#phase !== 'running' ||
      !player ||
      player.life.kind !== 'alive' ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      amount > 1000000
    )
      return false;
    player.progression.progress += amount;
    while (
      player.progression.progress >=
      levelRequirement(player.health.level, player.stats.progressRequirement)
    ) {
      const required = levelRequirement(
        player.health.level,
        player.stats.progressRequirement,
      );
      const next = player.health.level + 1;
      if (!this.levelPlayer(playerId, next)) break;
      player.progression.progress -= required;
      player.progression.pending.push({
        level: next,
        pool: next % 12 === 0 ? 'branching' : 'ordinary',
      });
    }
    return true;
  }

  takePendingReward(playerId: string) {
    return this.#players.get(playerId)?.progression.pending.shift();
  }

  takeCollections(): CollectionEvent[] {
    return this.#collections.splice(0);
  }

  setWorldCondition(condition: string, enabled: boolean): boolean {
    if (!condition || condition.length > 128) return false;
    if (enabled) this.#worldConditions.add(condition);
    else this.#worldConditions.delete(condition);
    return true;
  }

  setModifiers(playerId: string, modifiers: readonly StatModifier[]): boolean {
    const player = this.#players.get(playerId);
    if (!player || player.life.kind !== 'alive') return false;
    const stats = deriveStats(modifiers, player.health.level);
    player.modifiers = modifiers.map((modifier) => ({ ...modifier }));
    player.stats = stats;
    updateHealthStats(player.health, stats);
    this.grantProgress(playerId, 0);
    return true;
  }

  grantUpgrade(
    playerId: string,
    id: string,
    rarity: string,
    rank: number,
  ): boolean {
    const player = this.#players.get(playerId);
    const definition = this.#content.definition(id);
    if (
      this.#phase !== 'running' ||
      !player ||
      player.life.kind !== 'alive' ||
      !definition?.selectable ||
      !definition.rarities.includes(rarity) ||
      (player.rarities.has(id) &&
        rarityRank(rarity) < rarityRank(player.rarities.get(id) ?? '')) ||
      rank !== (player.ranks.get(id) ?? 0) + 1 ||
      !this.#content
        .eligible(
          player.ranks,
          player.specializations,
          definition.pool,
          this.#worldConditions,
        )
        .includes(id)
    )
      return false;
    const value = definition.values[rarity]?.[rank - 1];
    if (value === undefined) return false;
    const changes: Partial<Record<Stat, number>> = {};
    if (id === 'muscular-tissue') changes.physical = value;
    else if (id === 'stomach') changes.salvageSpeed = value;
    else if (id === 'plated') changes.plating = value;
    else if (id === 'arms') {
      changes.physical = value;
      changes.ability = value;
      changes.salvageReach = value;
    } else if (id === 'slithery') {
      changes.speed = value;
      changes.terrainAdaptation = rank * 20;
    } else if (id === 'wings') {
      changes.speed = value;
      changes.terrainAdaptation = 40;
    } else if (id !== 'body-slam') return false;
    const modifiers = player.modifiers.filter((m) => m.id !== `starter:${id}`);
    for (const [stat, add] of Object.entries(changes) as [Stat, number][])
      modifiers.push({ id: `starter:${id}`, stat, add, multiplier: 1 });
    const stats = deriveStats(modifiers, player.health.level);
    let ability: Ability | undefined;
    if (id === 'body-slam') {
      const physicalScale = BODY_SLAM_PHYSICAL[rarity]?.[rank - 1];
      if (physicalScale === undefined) return false;
      ability = {
        id,
        slotType: 'attack',
        action: 'body-slam',
        cooldown: 1250,
        damage: physicalScale,
        healthScale: value / 100,
      };
    }
    const oldPlating = player.stats.plating;
    player.modifiers = modifiers;
    player.stats = stats;
    updateHealthStats(player.health, stats);
    if (id === 'plated')
      player.health.plating = Math.min(
        stats.plating,
        player.health.plating + Math.max(0, stats.plating - oldPlating),
      );
    if (ability) {
      if (player.equipment.learned.has(id))
        player.equipment.learned.set(id, ability);
      else this.learnAbility(playerId, ability);
    }
    if (rank === 1 && definition.affinities.includes('Carcinisation'))
      player.carcinisation = Math.min(10, player.carcinisation + 1);
    for (const affinity of definition.affinities)
      if (affinity !== 'Carcinisation')
        player.affinities.set(
          affinity,
          (player.affinities.get(affinity) ?? 0) + 1,
        );
    player.ranks.set(id, rank);
    player.rarities.set(id, rarity);
    const choices = (definition.specializationChoices ?? []).filter(
      (choice) =>
        choice.triggerRank === rank && !player.specializations.has(choice.id),
    );
    const first = choices[0];
    if (first) {
      player.selection.enqueue(
        {
          kind: 'specialization',
          id: `choice-${++this.#promptId}`,
          revision: 0,
          parentId: id,
          options: [
            {
              id: first.id,
              label: `${first.name} (+${first.carcinisationBonus} Carcinisation)`,
            },
            ...choices.slice(1).map((choice) => ({
              id: choice.id,
              label: `${choice.name} (+${choice.carcinisationBonus} Carcinisation)`,
            })),
            { id: 'skip', label: 'Skip specialization' },
          ],
        },
        this.#time,
      );
    }
    this.grantProgress(playerId, 0);
    return true;
  }

  terrainMovementFactor(
    playerId: string,
    terrain: Terrain,
  ): number | undefined {
    const player = this.#players.get(playerId);
    if (!player) return undefined;
    const specific =
      terrain === 'sand'
        ? player.stats.sandAdaptation
        : terrain === 'snow'
          ? player.stats.snowAdaptation
          : terrain === 'water'
            ? player.stats.waterAdaptation
            : 0;
    return terrainSpeedMultiplier(
      terrain,
      player.stats.terrainAdaptation,
      specific,
    );
  }

  levelPlayer(playerId: string, level: number): boolean {
    const player = this.#players.get(playerId);
    if (
      !player ||
      player.life.kind !== 'alive' ||
      level <= player.health.level ||
      !Number.isSafeInteger(level)
    )
      return false;
    const stats = deriveStats(player.modifiers, level);
    if (!gainLevels(player.health, level, stats)) return false;
    player.stats = stats;
    return true;
  }

  damagePlayer(
    playerId: string,
    amount: number,
    bypassPlating = false,
  ): number {
    const player = this.#players.get(playerId);
    if (this.#phase !== 'running' || !player || player.life.kind !== 'alive')
      return 0;
    return (
      this.damageBatch([
        {
          targetId: playerId,
          ownerId: null,
          channel: bypassPlating ? 'environmental' : 'direct',
          amount,
          depth: 0,
        },
      ])[0]?.hull ?? 0
    );
  }

  canUseOwnedOffense(ownerId: string): boolean {
    const owner = this.#players.get(ownerId);
    return (
      !owner ||
      (owner.life.kind === 'alive' && owner.life.activity !== 'selecting')
    );
  }

  damageBatch(events: readonly DamageEvent[]) {
    const deaths = new Map<string, string | null>();
    const botDeaths = new Map<string, string | null>();
    const queue = [...events];
    const results: ReturnType<typeof applyDamage>[] = [];
    for (
      let index = 0;
      index < queue.length && index < events.length + 512;
      index++
    ) {
      const event = queue[index];
      if (!event) continue;
      if (
        event.ownerId !== null &&
        event.ownerId !== event.targetId &&
        !this.canUseOwnedOffense(event.ownerId)
      ) {
        if (index < events.length)
          results.push({
            attempted: event.amount,
            hull: 0,
            plating: 0,
            dodged: false,
          });
        continue;
      }
      const player = this.#players.get(event.targetId);
      const bot = this.#bots.get(event.targetId);
      if (
        this.#phase === 'running' &&
        bot &&
        bot.health > 0 &&
        event.depth >= 0 &&
        event.depth <= 8
      ) {
        if (
          !Number.isFinite(event.amount) ||
          event.amount < 0 ||
          (event.vulnerability !== undefined &&
            (!Number.isFinite(event.vulnerability) || event.vulnerability < 0))
        )
          throw new Error('Invalid damage amount');
        const hull = Math.min(
          bot.health,
          event.amount * (event.vulnerability ?? 1),
        );
        bot.health -= hull;
        if (event.ownerId) {
          const owner = this.#players.get(event.ownerId);
          if (owner && event.ownerId !== event.targetId)
            owner.matchStats.damageDealt += hull;
        }
        const result = {
          attempted: event.amount,
          hull,
          plating: 0,
          dodged: false,
        };
        this.#damageLedger.push({ event: { ...event }, result });
        if (this.#damageLedger.length > 1024) this.#damageLedger.shift();
        if (event.impulse && hull > 0) {
          const magnitude = Math.hypot(event.impulse.x, event.impulse.z);
          if (Number.isFinite(magnitude) && magnitude > 0) {
            const scale = Math.min(1, 20 / magnitude);
            bot.craft.body.applyImpulse(
              { x: event.impulse.x * scale, y: 0, z: event.impulse.z * scale },
              true,
            );
          }
        }
        if (bot.health === 0 && !botDeaths.has(bot.id))
          botDeaths.set(bot.id, event.ownerId);
        if (index < events.length) results.push(result);
        continue;
      }
      if (
        this.#phase !== 'running' ||
        !player ||
        player.life.kind !== 'alive' ||
        event.depth > 8 ||
        event.depth < 0
      ) {
        if (index < events.length)
          results.push({
            attempted: event.amount,
            hull: 0,
            plating: 0,
            dodged: false,
          });
        continue;
      }
      const result = applyDamage(
        player.health,
        player.stats,
        {
          ...event,
          vulnerability:
            (event.vulnerability ?? 1) *
            ((event.channel === 'direct' ||
              event.channel === 'contact' ||
              event.channel === 'corrosion') &&
            event.ownerId !== event.targetId
              ? 1 + carcinisationDamage(player.carcinisation)
              : 1),
        },
        player.life.activity === 'selecting',
        Math.random(),
      );
      player.matchStats.damageTaken += result.hull + result.plating;
      if (event.ownerId && event.ownerId !== event.targetId) {
        const owner = this.#players.get(event.ownerId);
        if (owner) owner.matchStats.damageDealt += result.hull + result.plating;
      }
      this.#damageLedger.push({ event: { ...event }, result: { ...result } });
      if (this.#damageLedger.length > 1024) this.#damageLedger.shift();
      if (event.impulse && result.hull + result.plating > 0) {
        const length = Math.hypot(event.impulse.x, event.impulse.z);
        if (Number.isFinite(length) && length > 0) {
          const scale = Math.min(1, 20 / length);
          player.craft.body.applyImpulse(
            { x: event.impulse.x * scale, y: 0, z: event.impulse.z * scale },
            true,
          );
        }
      }
      if (player.health.hull === 0 && !deaths.has(event.targetId))
        deaths.set(event.targetId, event.ownerId);
      if (index < events.length) results.push(result);
      if (
        event.ownerId &&
        event.ownerId !== event.targetId &&
        event.channel !== 'boundary' &&
        event.depth < 8 &&
        player.reflection > 0 &&
        result.hull + result.plating > 0
      )
        queue.push({
          targetId: event.ownerId,
          ownerId: event.targetId,
          channel: 'direct',
          amount: (result.hull + result.plating) * player.reflection,
          depth: event.depth + 1,
        });
    }
    if (deaths.size) this.#eliminationGroups.push([...deaths.keys()].sort());
    for (const [playerId, ownerId] of deaths) {
      if (ownerId && ownerId !== playerId) {
        const owner = this.#players.get(ownerId);
        if (owner) owner.matchStats.eliminations++;
      }
      this.#deaths.push({ playerId, ownerId });
      this.accept({ kind: 'eliminate', playerId, ownerId });
    }
    for (const [botId, ownerId] of botDeaths) {
      const bot = this.#bots.get(botId);
      if (!bot) continue;
      const position = bot.craft.body.translation();
      this.#createResource({
        position,
        source: 'meat',
        rarity: bot.tier > 1 ? 'rare' : 'common',
        killerId: ownerId,
        ownerId,
        killerKind:
          ownerId && this.#players.has(ownerId) ? 'player' : 'third-party',
        repair: false,
      });
      const owner = ownerId && this.#players.get(ownerId);
      if (owner) transact(owner.wallet, `bot:${botId}`, 'grant', bot.tier);
      this.#deaths.push({ playerId: botId, ownerId });
      this.#world.removeRigidBody(bot.craft.body);
      this.#bots.delete(botId);
    }
    return results;
  }

  setReflection(playerId: string, fraction: number): boolean {
    const player = this.#players.get(playerId);
    if (!player || !Number.isFinite(fraction) || fraction < 0 || fraction > 1)
      return false;
    player.reflection = fraction;
    return true;
  }

  applyStatus(
    playerId: string,
    status: {
      kind: StatusKind;
      ownerId: string | null;
      magnitude: number;
      duration: number;
    },
  ): boolean {
    const player = this.#players.get(playerId);
    if (
      this.#phase !== 'running' ||
      !player ||
      player.life.kind !== 'alive' ||
      player.life.activity === 'selecting'
    )
      return false;
    if (player.statusImmunities.has(status.kind)) return false;
    const resistance =
      status.kind === 'stun'
        ? player.stats.stunResistance
        : status.kind === 'heat'
          ? player.stats.heatAdaptation
          : status.kind === 'cold'
            ? player.stats.coldAdaptation
            : 0;
    const duration = status.duration * Math.max(0, 1 - resistance / 100);
    if (duration <= 0) return false;
    addStatus(player.statuses, { ...status, duration }, this.#time);
    return true;
  }

  setStatusImmunity(
    playerId: string,
    kind: StatusKind,
    immune: boolean,
  ): boolean {
    const player = this.#players.get(playerId);
    if (!player || player.life.kind !== 'alive') return false;
    if (immune) {
      player.statusImmunities.add(kind);
      player.statuses = player.statuses.filter(
        (status) => status.kind !== kind,
      );
    } else player.statusImmunities.delete(kind);
    return true;
  }

  takeDeaths(): { playerId: string; ownerId: string | null }[] {
    return this.#deaths.splice(0);
  }

  takeDamageLedger() {
    return this.#damageLedger.splice(0);
  }

  learnAbility(playerId: string, ability: Ability): boolean {
    const player = this.#players.get(playerId);
    if (
      !player ||
      player.life.kind !== 'alive' ||
      !ability.id ||
      !Number.isFinite(ability.cooldown) ||
      ability.cooldown < 0 ||
      !Number.isFinite(ability.damage) ||
      ability.damage < 0 ||
      player.equipment.learned.has(ability.id)
    )
      return false;
    player.equipment.learned.set(ability.id, { ...ability });
    const slots: AbilitySlot[] =
      ability.slotType === 'attack'
        ? ['primary', 'secondary']
        : [ability.slotType];
    const empty = slots.find((slot) => player.equipment.slots[slot] === null);
    if (empty) equip(player.equipment, empty, ability.id);
    else if (this.#phase === 'running') {
      const first = slots[0];
      if (first)
        player.selection.enqueue(
          {
            kind: 'equipment',
            id: `choice-${++this.#promptId}`,
            revision: 0,
            abilityId: ability.id,
            options: [
              { id: first, label: `Equip in ${first}` },
              ...slots
                .slice(1)
                .map((slot) => ({ id: slot, label: `Equip in ${slot}` })),
              { id: 'keep', label: 'Keep current equipment' },
            ],
          },
          this.#time,
        );
    }
    return true;
  }

  registerAbility(ability: Ability): boolean {
    if (
      !ability.id ||
      this.#abilityCatalog.has(ability.id) ||
      !Number.isFinite(ability.cooldown) ||
      ability.cooldown < 0 ||
      !Number.isFinite(ability.damage) ||
      ability.damage < 0
    )
      return false;
    this.#abilityCatalog.set(ability.id, { ...ability });
    return true;
  }

  launchProjectile(
    ownerId: string,
    aim: number,
    speed: number,
    lifetime: number,
    damage: number,
    impulse: number,
  ): boolean {
    const player = this.#players.get(ownerId);
    if (
      this.#phase !== 'running' ||
      !player ||
      player.life.kind !== 'alive' ||
      player.life.activity !== 'playing' ||
      !Number.isFinite(aim) ||
      !Number.isFinite(speed) ||
      speed <= 0 ||
      speed > 100 ||
      !Number.isFinite(lifetime) ||
      lifetime <= 0 ||
      lifetime > 10000 ||
      !Number.isFinite(damage) ||
      damage < 0 ||
      !Number.isFinite(impulse) ||
      impulse < 0 ||
      this.#projectiles.length >= 512
    )
      return false;
    const position = player.craft.body.translation();
    this.#projectiles.push({
      id: ++this.#projectileId,
      ownerId,
      position: { x: position.x, y: position.y, z: position.z },
      velocity: { x: Math.sin(aim) * speed, y: 0, z: Math.cos(aim) * speed },
      remaining: lifetime,
      damage,
      impulse: Math.min(impulse, 20),
    });
    return true;
  }

  repairPlayer(playerId: string, amount: number, consumeAtFull: boolean) {
    const player = this.#players.get(playerId);
    if (this.#phase !== 'running' || !player || player.life.kind !== 'alive')
      return {
        attempted: amount,
        actual: 0,
        consumed: false,
        consumedAtFullHealth: false,
      };
    return repair(player.health, player.stats, amount, consumeAtFull);
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

  #advanceSelections(
    now: number,
    requested?: { playerId: string; promptId: string },
  ): boolean {
    let applied = false;
    for (const [playerId, player] of this.#players) {
      if (player.life.kind !== 'alive') continue;
      player.selection.advance(now);
      for (const outcome of player.selection.takeOutcomes()) {
        let committed = outcome.kind !== 'chosen';
        if (outcome.kind === 'chosen' && outcome.prompt.kind === 'upgrade') {
          const choice = player.generatedChoices.find(
            (item) => item.id === outcome.optionId,
          );
          committed =
            !!choice &&
            this.grantUpgrade(playerId, choice.id, choice.rarity, choice.rank);
          if (committed && choice)
            this.#selections.push({ playerId, choiceId: choice.id });
          else if (player.activeReward)
            player.progression.pending.unshift(player.activeReward);
          player.activeReward = null;
          player.generatedChoices = [];
        } else if (
          outcome.kind === 'chosen' &&
          outcome.prompt.kind === 'equipment' &&
          isAbilitySlot(outcome.optionId)
        ) {
          committed = equip(
            player.equipment,
            outcome.optionId,
            outcome.prompt.abilityId,
          );
        } else if (
          outcome.kind === 'chosen' &&
          outcome.prompt.kind === 'equipment'
        ) {
          committed = outcome.optionId === 'keep';
        } else if (
          outcome.kind === 'chosen' &&
          outcome.prompt.kind === 'specialization'
        ) {
          const definition = this.#content.definition(outcome.prompt.parentId);
          const choice = definition?.specializationChoices?.find(
            (item) => item.id === outcome.optionId,
          );
          if (choice && !player.specializations.has(choice.id)) {
            player.specializations.add(choice.id);
            player.carcinisation = Math.min(
              10,
              player.carcinisation + choice.carcinisationBonus,
            );
            committed = true;
          } else committed = outcome.optionId === 'skip';
        }
        if (
          requested?.playerId === playerId &&
          requested.promptId === outcome.prompt.id
        )
          applied = committed;
      }
      const state = player.selection.state;
      if (
        state.kind !== 'protected' &&
        (state.kind === 'idle' || state.pending.length === 0) &&
        !player.generatedChoices.length &&
        player.progression.pending.length
      ) {
        const reward = player.progression.pending.shift();
        if (reward) {
          const definitions = this.#content
            .eligible(
              player.ranks,
              player.specializations,
              reward.pool,
              this.#worldConditions,
            )
            .map((id) => this.#content.definition(id))
            .filter((entry) => entry !== undefined);
          const choices = generateOffer(
            definitions,
            player.ranks,
            player.affinities,
            player.rarities,
            Math.random,
          );
          const first = choices[0];
          if (first) {
            player.generatedChoices = choices;
            player.activeReward = reward;
            player.selection.enqueue(
              {
                kind: 'upgrade',
                id: `choice-${++this.#promptId}`,
                revision: 0,
                options: [
                  { id: first.id, label: first.id },
                  ...choices
                    .slice(1)
                    .map((choice) => ({ id: choice.id, label: choice.id })),
                ],
              },
              now,
            );
          } else player.progression.depletedRewards++;
        }
      }
      const current = player.selection.state;
      if (current.kind === 'protected') {
        player.managedSelection = true;
        this.#offers.set(playerId, {
          id: current.prompt.id,
          revision: current.prompt.revision,
          choices: current.prompt.options.map((option) => option.id),
        });
        if (player.life.activity !== 'selecting') {
          setSelecting(player, true);
          player.life = { kind: 'alive', activity: 'selecting' };
          player.control = null;
          player.attack = null;
          for (let i = this.#projectiles.length - 1; i >= 0; i--)
            if (this.#projectiles[i]?.ownerId === playerId)
              this.#projectiles.splice(i, 1);
        }
      } else if (player.managedSelection) {
        this.#offers.delete(playerId);
        player.managedSelection = false;
        if (player.life.activity === 'selecting') {
          setSelecting(player, false);
          player.life = { kind: 'alive', activity: 'playing' };
        }
      }
    }
    return applied;
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

  markSelectionDisplayed(playerId: string, id: string, revision: number): void {
    const player = this.#players.get(playerId);
    if (player?.connected) player.selection.markDisplayed(id, revision);
  }

  authorize(intent: Intent): boolean {
    const player = this.#players.get(intent.playerId);
    if (!player?.connected || intent.matchId !== this.#id) return false;
    if (intent.kind === 'spectate')
      return (
        this.#phase === 'running' &&
        player.life.kind === 'eliminated' &&
        this.#players.get(intent.targetId)?.life.kind === 'alive' &&
        !!this.view(intent.playerId)?.players.some(
          (candidate) => candidate.id === intent.targetId,
        )
      );
    if (player.life.kind !== 'alive') return false;
    if (intent.kind === 'ready') return this.#phase === 'lobby';
    if (this.#phase !== 'running') return false;
    if (intent.kind === 'control') return player.life.activity === 'playing';
    if (intent.kind === 'choice' || intent.kind === 'reroll') {
      const offer = this.#offers.get(intent.playerId);
      return (
        player.life.activity === 'selecting' &&
        !!offer &&
        offer.id === intent.offerId &&
        offer.revision === intent.revision &&
        (intent.kind === 'reroll'
          ? player.managedSelection &&
            player.generatedChoices.length > 0 &&
            player.wallet.balance >= 1
          : offer.choices.includes(intent.choiceId))
      );
    }
    if (intent.kind === 'equipment')
      return (
        player.life.activity === 'selecting' &&
        isAbilitySlot(intent.slot) &&
        (intent.contentId === '-' ||
          player.equipment.learned.has(intent.contentId))
      );
    return false;
  }

  consume(intent: Intent): boolean {
    if (!this.authorize(intent)) return false;
    if (intent.kind === 'spectate') {
      const player = this.#players.get(intent.playerId);
      if (player) player.spectating = intent.targetId;
      return true;
    }
    if (intent.kind === 'ready') this.setReady(intent.playerId, intent.ready);
    if (intent.kind === 'control') this.setControl(intent.playerId, intent);
    if (intent.kind === 'equipment' && isAbilitySlot(intent.slot)) {
      const player = this.#players.get(intent.playerId);
      if (player)
        equip(
          player.equipment,
          intent.slot,
          intent.contentId === '-' ? null : intent.contentId,
        );
    }
    if (intent.kind === 'reroll') {
      const player = this.#players.get(intent.playerId);
      const current = player?.selection.state;
      if (
        !player ||
        current?.kind !== 'protected' ||
        current.prompt.kind !== 'upgrade' ||
        this.#time >= current.deadline
      )
        return false;
      const firstChoice = player.generatedChoices[0];
      const definition =
        firstChoice && this.#content.definition(firstChoice.id);
      if (!definition) return false;
      const definitions = this.#content
        .eligible(
          player.ranks,
          player.specializations,
          definition.pool,
          this.#worldConditions,
        )
        .map((id) => this.#content.definition(id))
        .filter((entry) => entry !== undefined);
      const choices = generateOffer(
        definitions,
        player.ranks,
        player.affinities,
        player.rarities,
        Math.random,
      );
      const first = choices[0];
      if (!first) return false;
      const receipt = transact(
        player.wallet,
        `reroll:${intent.offerId}:${intent.revision}`,
        'spend',
        1,
      );
      if (!receipt?.accepted) return false;
      if (
        player.selection.reroll(
          intent.offerId,
          intent.revision,
          [
            { id: first.id, label: first.id },
            ...choices
              .slice(1)
              .map((choice) => ({ id: choice.id, label: choice.id })),
          ],
          this.#time,
        )
      ) {
        player.generatedChoices = choices;
        this.#advanceSelections(this.#time);
        return true;
      }
      return false;
    }
    if (intent.kind === 'choice') {
      const choosingPlayer = this.#players.get(intent.playerId);
      if (choosingPlayer?.managedSelection) {
        if (
          !choosingPlayer.selection.choose(
            intent.offerId,
            intent.revision,
            intent.choiceId,
            this.#time,
          )
        )
          return false;
        return this.#advanceSelections(this.#time, {
          playerId: intent.playerId,
          promptId: intent.offerId,
        });
      }
      const ability = this.#abilityCatalog.get(intent.choiceId);
      if (ability) this.learnAbility(intent.playerId, ability);
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
    return true;
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

  #resolveOutcome(): void {
    if (this.#phase !== 'running' || this.#result) return;
    const survivors = [...this.#players].filter(
      ([, player]) => player.life.kind === 'alive',
    );
    if (survivors.length > 1) return;
    const winner = survivors[0];
    this.#result = {
      outcome: winner
        ? { kind: 'winner', playerId: winner[0] }
        : { kind: 'draw' },
      durationMs: this.#wallTime,
      eliminationGroups: this.#eliminationGroups.map((group) => [...group]),
      players: [...this.#players].map(([id, player]) => ({
        id,
        name: player.name,
        level: player.health.level,
        upgrades: [...player.ranks].map(([upgradeId, rank]) => ({
          id: upgradeId,
          rank,
          rarity: player.rarities.get(upgradeId) ?? 'common',
        })),
        specializations: [...player.specializations],
        learnedAbilities: [...player.equipment.learned.keys()],
        equipment: { ...player.equipment.slots },
        ...player.matchStats,
      })),
    };
    this.#phase = 'finished';
    this.#clearCombat();
  }

  syncWallClock(now: number): void {
    if (this.#phase !== 'running' || !Number.isFinite(now)) return;
    if (this.#wallAnchor === null) this.#wallAnchor = now - this.#wallTime;
    this.#wallTime = Math.max(this.#wallTime, now - this.#wallAnchor);
  }

  #finaleDamage(deltaMs: number): DamageEvent[] {
    const config = this.#finale;
    const radius = boundaryRadius(this.#wallTime, config);
    const collapsed = this.#wallTime >= config.collapseAtMs;
    const damage: DamageEvent[] = [];
    for (const [id, player] of this.#players) {
      if (player.life.kind !== 'alive') continue;
      const position = player.craft.body.translation();
      if (collapsed || Math.hypot(position.x, position.z) > radius)
        damage.push({
          targetId: id,
          ownerId: null,
          channel: 'boundary',
          amount: collapsed
            ? player.health.hull
            : (config.boundaryDamagePerSecond * deltaMs) / 1000,
          depth: 0,
        });
    }
    for (const bot of this.#bots.values()) {
      const position = bot.craft.body.translation();
      if (collapsed)
        damage.push({
          targetId: bot.id,
          ownerId: null,
          channel: 'boundary',
          amount: bot.health,
          depth: 0,
        });
      else {
        const distance = Math.hypot(position.x, position.z);
        const limit = Math.max(0, radius - 1);
        if (distance > limit && distance > 0) {
          bot.craft.body.setTranslation(
            {
              x: (position.x * limit) / distance,
              y: position.y,
              z: (position.z * limit) / distance,
            },
            true,
          );
          bot.craft.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }
      }
    }
    for (let index = this.#meteors.length - 1; index >= 0; index--) {
      const meteor = this.#meteors[index];
      if (!meteor) continue;
      if (
        collapsed ||
        Math.hypot(meteor.position.x, meteor.position.z) > radius
      ) {
        this.#meteors.splice(index, 1);
      } else if (this.#wallTime >= meteor.impactAt) {
        for (const [id, player] of this.#players) {
          const point = player.craft.body.translation();
          if (
            player.life.kind === 'alive' &&
            Math.hypot(
              point.x - meteor.position.x,
              point.z - meteor.position.z,
            ) <= meteor.radius
          )
            damage.push({
              targetId: id,
              ownerId: null,
              channel: 'meteor',
              amount: config.meteorDamage,
              depth: 0,
            });
        }
        for (const bot of this.#bots.values()) {
          const point = bot.craft.body.translation();
          if (
            Math.hypot(
              point.x - meteor.position.x,
              point.z - meteor.position.z,
            ) <= meteor.radius
          )
            damage.push({
              targetId: bot.id,
              ownerId: null,
              channel: 'meteor',
              amount: config.meteorDamage,
              depth: 0,
            });
        }
        this.#meteors.splice(index, 1);
      }
    }
    if (!collapsed && this.#wallTime >= this.#nextMeteorAt) {
      const distance = Math.sqrt(Math.random()) * Math.min(30, radius);
      const angle = Math.random() * Math.PI * 2;
      this.#meteors.push({
        id: ++this.#meteorId,
        position: {
          x: Math.cos(angle) * distance,
          z: Math.sin(angle) * distance,
        },
        radius: config.meteorRadius,
        impactAt: this.#wallTime + config.meteorWarningMs,
      });
      this.#nextMeteorAt = this.#wallTime + config.meteorIntervalMs;
    }
    return damage;
  }

  advance(deltaMs: number): boolean {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) return false;
    if (this.#phase === 'loading') {
      this.#loadingTime += deltaMs;
      if (this.#loadingTime >= 30000)
        this.#returnToLobby('Loading timed out. Ready again to retry.');
      return true;
    }
    if (this.#phase === 'countdown') {
      this.#countdown -= deltaMs;
      if (this.#countdown <= 0) this.#phase = 'running';
      return true;
    }
    if (this.#phase !== 'running') return false;
    const dt = deltaMs / 1000;
    if (this.#wallAnchor === null) this.#wallTime += deltaMs;
    this.#replenishBots();
    const statusDamage: DamageEvent[] = [];
    for (const [id, player] of this.#players)
      if (player.life.kind === 'alive')
        statusDamage.push(
          ...advanceStatuses(player.statuses, id, this.#time + deltaMs),
        );
    const attacks: DamageEvent[] = [
      ...this.#finaleDamage(deltaMs),
      ...statusDamage,
      ...this.#advanceBots(deltaMs),
    ];
    for (let index = this.#projectiles.length - 1; index >= 0; index--) {
      const projectile = this.#projectiles[index];
      if (!projectile) continue;
      const step = Math.min(deltaMs, projectile.remaining) / 1000;
      const speed = Math.hypot(projectile.velocity.x, projectile.velocity.z);
      const direction = {
        x: projectile.velocity.x / speed,
        y: 0,
        z: projectile.velocity.z / speed,
      };
      const owner = this.#players.get(projectile.ownerId);
      const hit = this.#world.castRay(
        new RAPIER.Ray(projectile.position, direction),
        speed * step,
        true,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
        undefined,
        owner?.craft.collider,
      );
      const target = hit && this.#combatantAtCollider(hit.collider.handle);
      if (target && target !== projectile.ownerId) {
        attacks.push({
          targetId: target,
          ownerId: projectile.ownerId,
          channel: 'direct',
          amount: projectile.damage,
          depth: 0,
          impulse: {
            x: direction.x * projectile.impulse,
            z: direction.z * projectile.impulse,
          },
        });
      }
      projectile.position.x += projectile.velocity.x * step;
      projectile.position.z += projectile.velocity.z * step;
      projectile.remaining -= deltaMs;
      if (hit || projectile.remaining <= 0) this.#projectiles.splice(index, 1);
    }
    for (const [id, player] of this.#players) {
      if (player.control && player.control.expiresAt <= this.#time)
        player.control = null;
      if (player.life.kind !== 'alive' || player.life.activity !== 'playing') {
        player.attack = null;
        player.dash = null;
        continue;
      }
      const stunned = player.statuses.some((status) => status.kind === 'stun');
      if (stunned) player.attack = null;
      const controls: readonly [AbilitySlot, number][] = [
        ['primary', CONTROL_BUTTON.primary],
        ['secondary', CONTROL_BUTTON.secondary],
        ['movement', CONTROL_BUTTON.movement],
        ['ultimate', CONTROL_BUTTON.ultimate],
      ];
      if (!stunned && !player.attack && this.#time >= player.attackReadyAt)
        for (const [slot, button] of controls) {
          const abilityId = player.equipment.slots[slot];
          const ability = abilityId && player.equipment.learned.get(abilityId);
          if (
            !ability ||
            !((player.control?.intent.buttons ?? 0) & button) ||
            this.#time < (player.equipment.readyAt.get(ability.id) ?? 0)
          )
            continue;
          if (ability.action === 'strike' || ability.action === 'body-slam') {
            player.attack = {
              hitAt: this.#time + 200,
              readyAt: this.#time + Math.max(200, ability.cooldown),
              aim: player.aim,
              damage:
                ability.action === 'body-slam'
                  ? ((ability.damage * player.stats.physical +
                      (ability.healthScale ?? 0) * player.stats.maximumHealth) *
                      player.stats.damage) /
                    100
                  : ability.damage,
            };
            player.attackReadyAt = player.attack.readyAt;
          } else if (ability.action === 'projectile') {
            if (
              !this.launchProjectile(
                id,
                player.aim,
                16,
                1800,
                ability.damage,
                3,
              )
            )
              continue;
            player.attackReadyAt = this.#time + 200;
          } else {
            const input = player.control?.intent;
            const magnitude = Math.hypot(input?.x ?? 0, input?.y ?? 0);
            player.dash = {
              x: magnitude ? (input?.x ?? 0) / magnitude : Math.sin(player.aim),
              z: magnitude ? (input?.y ?? 0) / magnitude : Math.cos(player.aim),
              until: this.#time + 200,
            };
            player.attackReadyAt = this.#time + 200;
          }
          player.equipment.readyAt.set(
            ability.id,
            this.#time + ability.cooldown,
          );
          break;
        }
      if (
        !stunned &&
        !player.attack &&
        !player.equipment.slots.primary &&
        this.#time >= player.attackReadyAt &&
        ((player.control?.intent.buttons ?? 0) & CONTROL_BUTTON.primary) !== 0
      ) {
        player.attack = {
          hitAt: this.#time + 200,
          readyAt:
            this.#time + Math.max(200, (800 * player.stats.cooldowns) / 100),
          aim: player.aim,
          damage: (0.7 * player.stats.physical * player.stats.damage) / 100,
        };
        player.attackReadyAt = player.attack.readyAt;
      }
      if (player.attack && player.attack.hitAt <= this.#time + deltaMs) {
        const origin = player.craft.body.translation();
        const ray = new RAPIER.Ray(origin, {
          x: Math.sin(player.attack.aim),
          y: 0,
          z: Math.cos(player.attack.aim),
        });
        const hit = this.#world.castRay(
          ray,
          2,
          true,
          RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
          undefined,
          player.craft.collider,
        );
        const target = hit && this.#combatantAtCollider(hit.collider.handle);
        if (target && target !== id)
          attacks.push({
            targetId: target,
            ownerId: id,
            channel: 'contact',
            amount: player.attack.damage,
            depth: 0,
            impulse: {
              x: Math.sin(player.attack.aim) * 2,
              z: Math.cos(player.attack.aim) * 2,
            },
          });
        player.attack = null;
      }
    }
    this.damageBatch(attacks);
    this.#resolveOutcome();
    if (this.#phase !== 'running') return true;
    this.#advanceResources(deltaMs);
    for (const [id, player] of this.#players)
      if (player.life.kind === 'alive' && player.stats.passiveProgress > 0)
        this.grantProgress(id, player.stats.passiveProgress * dt);
    for (const player of this.#players.values()) {
      if (player.life.kind !== 'alive') continue;
      if (player.control && player.control.expiresAt <= this.#time)
        player.control = null;
      if (player.life.kind === 'alive')
        repair(
          player.health,
          player.stats,
          (player.stats.regeneration * dt) / 10,
          false,
        );
      const input = player.statuses.some((status) => status.kind === 'stun')
        ? { x: 0, y: 0 }
        : (player.control?.intent ?? { x: 0, y: 0 });
      const slow = Math.min(
        1,
        player.statuses
          .filter((status) => status.kind === 'slow')
          .reduce((sum, status) => sum + status.magnitude, 0) / 100,
      );
      const attackFactor =
        this.#time < player.attackReadyAt
          ? Math.max(0, Math.min(1, (0.7 * player.stats.attackPenalty) / 100))
          : 1;
      const speed =
        (player.stats.speed / BASE_STATS.speed) *
        terrainSpeedMultiplier('grass', player.stats.terrainAdaptation);
      const movement = {
        x: input.x * (1 - slow) * attackFactor * speed,
        y: input.y * (1 - slow) * attackFactor * speed,
      };
      if (
        player.dash &&
        this.#time < player.dash.until &&
        player.life.kind === 'alive' &&
        player.life.activity === 'playing'
      ) {
        const velocity = player.craft.body.linvel();
        const factor =
          Math.min(deltaMs, player.dash.until - this.#time) / deltaMs;
        player.craft.body.setLinvel(
          {
            x: player.dash.x * 22.5 * factor,
            y: velocity.y,
            z: player.dash.z * 22.5 * factor,
          },
          true,
        );
      } else {
        if (player.dash) {
          const velocity = player.craft.body.linvel();
          player.craft.body.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
        }
        player.dash = null;
        steerCraft(player.craft.body, movement, dt);
      }
    }
    this.#world.timestep = dt;
    this.#world.step();
    this.#time += deltaMs;
    this.#advanceSelections(this.#time);
    return true;
  }

  roster(): { id: string; name: string; connected: boolean }[] {
    return [...this.#players].map(([id, player]) => ({
      id,
      name: player.name,
      connected: player.connected,
    }));
  }

  dispose(): void {
    this.#clearCombat();
    this.#world.free();
  }

  view(viewerId: string): MatchView | undefined {
    const viewer = this.#players.get(viewerId);
    if (!viewer) return undefined;
    const projectionId =
      viewer.life.kind === 'eliminated' ? viewer.spectating : viewerId;
    return {
      id: this.#id,
      roundId: this.#roundId,
      phase: this.#phase,
      result: this.#result ? structuredClone(this.#result) : null,
      arena: this.#arena,
      time: this.#time,
      spectating: viewer.life.kind === 'eliminated' ? viewer.spectating : null,
      survivors: [...this.#players.values()].filter(
        (player) => player.life.kind === 'alive',
      ).length,
      boundary: {
        radius: boundaryRadius(this.#wallTime, this.#finale),
        elapsedMs: this.#wallTime,
        shrinkStartMs: this.#finale.shrinkStartMs,
        collapseAtMs: this.#finale.collapseAtMs,
      },
      meteors: projectionId
        ? this.#meteors.map((meteor) => ({
            ...meteor,
            position: { ...meteor.position },
          }))
        : [],
      loadingError: this.#loadingError,
      loadingRevision: this.#loadingRevision,
      equipment: {
        basicReadyAt: viewer.attackReadyAt,
        slots: { ...viewer.equipment.slots },
        learned: [...viewer.equipment.learned.values()].map(
          ({ id, slotType }) => ({
            id,
            slotType,
            readyAt: viewer.equipment.readyAt.get(id) ?? 0,
          }),
        ),
      },
      progression: {
        level: viewer.health.level,
        progress: viewer.progression.progress,
        required: levelRequirement(
          viewer.health.level,
          viewer.stats.progressRequirement,
        ),
        pending: viewer.progression.pending.length,
        depletedRewards: viewer.progression.depletedRewards,
        currency: viewer.wallet.balance,
        affinities: [...viewer.affinities].map(([id, rank]) => ({ id, rank })),
        carcinisation: viewer.carcinisation,
        carcinisationDamage: carcinisationDamage(viewer.carcinisation),
        carcinisationRarity: Math.min(
          1,
          viewer.carcinisation * CARCINISATION_RARITY_PER_POINT,
        ),
      },
      bots: [...(projectionId ? this.#bots.values() : [])].map((bot) => ({
        id: bot.id,
        tier: bot.tier,
        position: bot.craft.body.translation(),
        health: bot.health,
        maxHealth: bot.maxHealth,
        attacking: bot.windupUntil !== null,
      })),
      resources: [...(projectionId ? this.#resources.values() : [])].map(
        ({ id, position, source, rarity, stage, repair }) => ({
          id,
          position: { ...position },
          source,
          rarity,
          stage,
          repair,
        }),
      ),
      projectiles: this.#projectiles
        .filter(
          ({ ownerId }) =>
            !!projectionId &&
            !this.#hiddenPlayers.get(projectionId)?.has(ownerId),
        )
        .map(({ id, position }) => ({ id, position: { ...position } })),
      countdown:
        this.#phase === 'countdown' ? Math.max(0, this.#countdown) : null,
      offer: (() => {
        const offer = this.#offers.get(viewerId);
        if (!offer) return null;
        const state = viewer.selection.state;
        const details = viewer.generatedChoices.flatMap((choice) => {
          const description = this.#content.describe(
            choice.id,
            choice.rarity,
            choice.rank,
          );
          return description ? [description] : [];
        });
        return {
          ...offer,
          choices: [...offer.choices],
          ...(state.kind === 'protected'
            ? {
                deadline: state.deadline,
                details,
                kind: state.prompt.kind,
                labels: [...state.prompt.options],
              }
            : {}),
        };
      })(),
      players: [...this.#players]
        .filter(
          ([id]) =>
            id === viewerId ||
            (!!projectionId && !this.#hiddenPlayers.get(projectionId)?.has(id)),
        )
        .map(([id, player]) => ({
          id,
          connected: player.connected,
          name: player.name,
          ready: player.ready,
          host: id === this.#players.keys().next().value,
          maximumHealthBonus: player.maximumHealthBonus,
          stats: id === viewerId ? { ...player.stats } : null,
          health: { ...player.health },
          statuses: player.statuses.map((status) => ({
            kind: status.kind,
            remaining: Math.max(0, status.expiresAt - this.#time),
          })),
          position: player.craft.body.translation(),
          radius: player.craft.collider.radius(),
          aim: player.aim,
          life: { ...player.life },
        })),
    };
  }
}
