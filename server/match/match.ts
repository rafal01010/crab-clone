import { randomInt, randomUUID } from 'node:crypto';
import {
  MAP_RULES,
  arenaPointClear,
  createArena,
  nextArenaWaypoint,
  terrainAt,
  terrainRegionAt,
  type Point,
} from '../../shared/arena.js';
import type {
  MatchPhase,
  MatchView,
  MatchResult,
  PlayerLife,
} from '../../shared/match.js';
import { CONTROL_BUTTON, type Intent } from '../../shared/protocol/index.js';
import RAPIER, { type World } from '@dimforge/rapier3d-compat';
import { SOURCE_GAMEPLAY } from '../content/source-gameplay.js';
import {
  SOURCE_ACTIONS,
  SOURCE_STAT_LIMITS,
} from '../content/source-balance.js';
import { sourceRange } from '../content/source-tuning.js';
import { sourceCurve } from '../content/source-curve.js';
import { initialStartingStats } from '../content/starting.js';
import { createStarterRegistry } from '../content/starter.js';
import { contentRankValue } from '../content/registry.js';
import type { ContentDefinition } from '../content/registry.js';
import { terrainSpeedMultiplier, type Terrain } from '../../shared/movement.js';
import { BASE_STATS, type Stat } from './stats.js';
import { deriveStats, type Stats, type StatModifier } from './stats.js';
import { upgradeEffect } from './upgrade-effects.js';
import { RuntimeEffects, type RuntimeEffect } from './runtime-effects.js';
import type { FieldStatus } from './field-status.js';
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
  MAX_CAUSAL_DEPTH,
  reflectedDamage,
  type DamageEvent,
  type Status,
  type StatusKind,
} from './combat.js';
import {
  acquisitionSlot,
  availableAmmunition,
  ammunitionView,
  equip,
  initialEquipment,
  isAbilitySlot,
  validAbility,
  rollAbilityDamage,
  type Ability,
  type AbilitySlot,
  type Equipment,
} from './equipment.js';
import {
  ALLY_LIMITS,
  BOT_RULES,
  BOT_STAGES,
  sourceEnemyProfile,
  enemyLoot,
  type AllyKind,
  type Bot,
  type BotRole,
} from './bots.js';
import { boundaryRadius, finaleConfig, type FinaleConfig } from './finale.js';
import { SelectionWindow } from './selection-window.js';
import {
  createPointsOfInterest,
  discoverPointOfInterest,
  distance as poiDistance,
  poiOptions,
  releasePointOfInterest,
  remainingProtection,
  reservePointOfInterest,
  POI_INTERACTION_RANGE,
  POI_RESERVATION_MS,
  RANDOM_POI_STATS,
  type PoiOption,
} from './points-of-interest.js';
import { WorldClock, type LightPhase } from './world-clock.js';
import {
  FirmwareField,
  identificationChance,
  type FirmwareEffect,
} from './firmware.js';
import { FIRMWARE_SCAN_RANGE } from '../../shared/firmware.js';
import { regionalWeather } from './weather.js';
import { radarHint, radarRange, sightRange } from './perception.js';
import { THERMAL_RULES, type ThermalExposure } from '../../shared/weather.js';
import type { RadarHint } from '../../shared/match.js';
import {
  generateOffer,
  nextRarity,
  rarityRank,
  type OfferChoice,
} from './offers.js';
import {
  MAX_RESOURCES,
  RESOURCE_TOTAL,
  STAGE_WEIGHT,
  foodHealing,
  healingFood,
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
  | {
      kind: 'eliminate';
      playerId: string;
      ownerId?: string | null;
      credit?: {
        ownerId: string | null;
        kind: 'player' | 'ally' | 'third-party';
      };
    }
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
  | { kind: 'finish-survivor'; playerId: string }
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
  thermal: ThermalExposure;
  modifiers: StatModifier[];
  phaseModifiers: Map<string, { phase: LightPhase; modifiers: StatModifier[] }>;
  runtimeEffects: RuntimeEffects;
  deferredDamage: { at: number; event: DamageEvent }[];
  statuses: Status[];
  statusImmunities: Set<StatusKind>;
  reflection: number;
  attack: {
    abilityId: string;
    hitAt: number;
    aim: number;
    damage: number;
    hits?: number;
    range?: number;
    impulse?: number;
    bypassPlating?: boolean;
  } | null;
  interactHeld: boolean;
  attackReadyAt: number;
  lastManualAttackAt: number;
  lastFriendshipAt: number;
  nextFriendshipAt: number;
  throwCharge: { abilityId: string; button: number; startedAt: number } | null;
  leapCharge: number | null;
  leapRepeatUntil: number;
  hitCueUntil: number;
  guard: {
    until: number;
    stunMs: number;
    parryUntil?: number;
    damageFactor?: number;
  } | null;
  invulnerableUntil: number;
  channel: {
    until: number;
    nextAt: number;
    origin: { x: number; z: number };
    intervalMs: number;
    radius: number;
    stunMs: number;
    damage: number;
  } | null;
  speedBoost: { until: number; multiplier: number } | null;
  contactBoost: { until: number; perAffinity: number } | null;
  moulting: { until: number; damage: number; points: number } | null;
  delayedBoost: {
    startsAt: number;
    endsAt: number;
    physical: number;
    ability: number;
    active: boolean;
  } | null;
  equipment: Equipment;
  ranks: Map<string, number>;
  rarities: Map<string, string>;
  affinities: Map<string, number>;
  baskingElapsed: number;
  carcinisation: number;
  specializations: Set<string>;
  obstacleSpeed: {
    range: number;
    bonusPerObstacle: number;
    maxBonus: number;
    decayPerSecond: number;
    bonus: number;
  } | null;
  abilityDamageMultipliers: Map<string, number>;
  lateralDashes: Map<string, number>;
  selection: SelectionWindow;
  managedSelection: boolean;
  selectionProtected: boolean;
  generatedChoices: OfferChoice[];
  displayedOffer: {
    id: string;
    revision: number;
    choices: OfferChoice[];
  } | null;
  poiChoices: Map<string, { option: PoiOption; upgrade?: OfferChoice }>;
  temporaryPoi: Map<string, { until: number; factor: number }>;
  firmwareKnowledge: Map<
    string,
    | { kind: 'failed'; roll: number }
    | { kind: 'identified'; effect: FirmwareEffect }
  >;
  nextFungoidAt: number;
  shelter: { id: string; until: number } | null;
  hibernationElapsed: number;
  pollinatorDiscoveries: number;
  pollinatorSinceBonus: number;
  firmwareSpawnBonus: number;
  firmwareHealUntil: number;
  firmwareSpeedUntil: number;
  firmwareAllySlots: number;
  firmwareDistortionUntil: number;
  firmwareDeafUntil: number;
  lastCharm: { success: boolean; at: number } | null;
  lastFirmware: { effect: FirmwareEffect; at: number } | null;
  activeReward: Progression['pending'][number] | null;
  dash: {
    x: number;
    z: number;
    until: number;
    charge?: { abilityId: string; damage: number };
    speed?: number;
    leap?: boolean;
    jetNextAt?: number;
  } | null;
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
  abilityId?: string;
  bypassPlating?: boolean;
  rootOwner: boolean;
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

function isSelectionProtected(player: Player): boolean {
  return (
    player.life.kind === 'alive' &&
    player.life.activity === 'selecting' &&
    player.selectionProtected
  );
}

function setSelecting(player: Player, selecting: boolean): void {
  player.selectionProtected = selecting;
  if (selecting) player.dash = null;
  player.craft.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  player.craft.body.setEnabledTranslations(!selecting, false, !selecting, true);
  player.craft.collider.setSensor(selecting);
}

export class Match {
  readonly #id: string;
  readonly #roundId = randomUUID();
  readonly #world: World;
  readonly #arena: ReturnType<typeof createArena>;
  readonly #closedShelters = new Set<number>();
  #phase: MatchPhase = 'lobby';
  #result: MatchResult | null = null;
  readonly #eliminationGroups: string[][] = [];
  #time = 0;
  #wallTime = 0;
  #finaleStatsApplied = false;
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
  readonly #discoveries: { playerId: string; siteId: string }[] = [];
  readonly #shelterEvents: {
    playerId: string;
    siteId: string;
    kind: 'enter' | 'exit';
    at: number;
  }[] = [];
  readonly #deaths: { playerId: string; ownerId: string | null }[] = [];
  readonly #damageLedger: {
    event: DamageEvent;
    result: ReturnType<typeof applyDamage>;
  }[] = [];
  readonly #projectiles: Projectile[] = [];
  readonly #trails: {
    id: number;
    ownerId: string;
    position: Point;
    radius: number;
    slowPercent: number;
    until: number;
    kind?: 'pedal' | 'web';
    status?: { effect: FieldStatus; nextAt: number };
    trapped?: Set<string>;
  }[] = [];
  #nextTrailId = 0;
  readonly #thickExposure = new Map<
    string,
    { since: number; stunned: boolean }
  >();
  readonly #content: ReturnType<typeof createStarterRegistry>;
  readonly #worldConditions = new Set<string>();
  readonly #worldClock = new WorldClock();
  readonly #pointsOfInterest: ReturnType<typeof createPointsOfInterest>;
  readonly #firmware: FirmwareField;
  readonly #abilityCatalog = new Map<string, Ability>();
  readonly #bots = new Map<string, Bot>();
  readonly #markedTargets = new Map<string, string>();
  readonly #signalTargets = new Map<string, Set<string>>();
  readonly #provoked = new Map<string, { ownerId: string; until: number }>();
  readonly #recruitReceipts = new Set<string>();
  readonly #pulls = new Map<
    string,
    { ownerId: string; targetId: string; until: number; strength: number }
  >();
  readonly #pendingAllies: {
    ownerId: string;
    kind: 'summoned' | 'offspring' | 'decoy';
    at: number;
    duration: number;
    health: number;
    damage: number;
    radius: number;
    speedFactor: number;
    terrainAdaptation: number;
    origin?: Point;
  }[] = [];
  readonly #nestDefenses = new Map<
    string,
    { ownerId: string; siteId: string; endsAt: number; health: number }
  >();
  #nextBotId = 0;
  #nextBotSpawn = 0;
  readonly #resources = new Map<string, Resource>();
  #nextResourceSpawn = 5_000;
  #nextFirmwareSpawn = 30_000;
  #firmwareSite = 0;
  readonly #shelterDecay = new Map<string, number>();
  readonly #firmwareConsumers = new Map<
    string,
    { playerId: string; elapsed: number }
  >();
  #resourceSite = 0;
  readonly #providerSpawned = new Map<string, number>();
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
    content = createStarterRegistry(),
  ) {
    this.#content = content;
    this.#worldConditions.add('day');
    this.#loadingRevision = initialLoadingRevision;
    this.#finale = finaleConfig(finale);
    this.#nextMeteorAt = this.#finale.shrinkStartMs;
    if (!id) throw new Error('Match identity is required');
    this.#id = id;
    this.#world = world;
    this.#arena = createArena(terrainSeed);
    this.#pointsOfInterest = createPointsOfInterest(
      this.#arena.poiSockets,
      (point) => terrainAt(this.#arena, point.x, point.z),
      terrainSeed,
    );
    this.#firmware = new FirmwareField(
      this.#arena.spawns
        .map((spawn) => ({ x: spawn.x + 5, z: spawn.z + 8 }))
        .filter(
          (point) =>
            arenaPointClear(this.#arena.obstacles, point) &&
            terrainAt(this.#arena, point.x, point.z) !== 'water',
        ),
    );
    this.#world.gravity = { x: 0, y: -9.81, z: 0 };
    this.#world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        MAP_RULES.halfExtent + 2,
        0.25,
        MAP_RULES.halfExtent + 2,
      )
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
    const startingResources = this.#arena.spawns.flatMap((spawn) =>
      this.#arena.resources
        .filter(
          (point) => Math.hypot(point.x - spawn.x, point.z - spawn.z) < 12,
        )
        .slice(0, 4),
    );
    for (const position of startingResources) {
      this.#createResource({
        position,
        source:
          terrainAt(this.#arena, position.x, position.z) === 'water'
            ? 'aquatic'
            : 'vegetation',
        rarity: 'common',
        killerId: null,
        ownerId: null,
        killerKind: null,
        repair: false,
      });
      this.#providerSpawned.set(`${position.x},${position.z}`, 1);
    }
    const positions = this.#arena.spawns.map((spawn) =>
      [
        { x: spawn.x + 12, z: spawn.z + 8 },
        { x: spawn.x - 12, z: spawn.z - 8 },
        { x: spawn.x, z: spawn.z + 12 },
      ].find((point) => arenaPointClear(this.#arena.obstacles, point)),
    );
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
        thermal: { heat: 0, cold: 0 },
        modifiers: [],
        phaseModifiers: new Map(),
        runtimeEffects: new RuntimeEffects(),
        deferredDamage: [],
        statuses: [],
        statusImmunities: new Set(),
        reflection: 0,
        attack: null,
        throwCharge: null,
        leapCharge: null,
        leapRepeatUntil: 0,
        interactHeld: false,
        attackReadyAt: 0,
        lastManualAttackAt: 0,
        lastFriendshipAt: 0,
        nextFriendshipAt: 3000,
        hitCueUntil: 0,
        guard: null,
        invulnerableUntil: 0,
        channel: null,
        speedBoost: null,
        contactBoost: null,
        moulting: null,
        delayedBoost: null,
        equipment: initialEquipment(),
        ranks: new Map(),
        rarities: new Map(),
        affinities: new Map(),
        baskingElapsed: 0,
        carcinisation: 0,
        specializations: new Set(),
        obstacleSpeed: null,
        abilityDamageMultipliers: new Map(),
        lateralDashes: new Map(),
        selection: new SelectionWindow(Math.random),
        managedSelection: false,
        selectionProtected: false,
        generatedChoices: [],
        displayedOffer: null,
        poiChoices: new Map(),
        temporaryPoi: new Map(),
        firmwareKnowledge: new Map(),
        nextFungoidAt: 0,
        lastFirmware: null,
        firmwareSpawnBonus: 0,
        firmwareHealUntil: 0,
        firmwareSpeedUntil: 0,
        firmwareAllySlots: 0,
        firmwareDistortionUntil: 0,
        firmwareDeafUntil: 0,
        lastCharm: null,
        shelter: null,
        hibernationElapsed: 0,
        pollinatorDiscoveries: 0,
        pollinatorSinceBonus: 0,
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
        this.#players.size === 0 ||
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
    if (command.kind === 'finish-survivor') {
      const survivors = [...this.#players].filter(
        ([, player]) => player.life.kind === 'alive',
      );
      if (
        this.#phase !== 'running' ||
        this.#players.size < 2 ||
        survivors.length !== 1 ||
        survivors[0]?.[0] !== command.playerId
      )
        return false;
      this.#resolveOutcome(true);
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
        this.#cancelOwnedWork(command.playerId);
        player.selection.cancelPoi(this.#time);
        for (const point of this.#pointsOfInterest)
          releasePointOfInterest(point, command.playerId, this.#time);
        this.#advanceSelections(this.#time);
        if (this.#phase === 'loading' || this.#phase === 'countdown')
          this.#returnToLobby(
            'A player disconnected while loading. Ready again to retry.',
          );
        player.ready = false;
        player.control = null;
        player.attack = null;
        player.channel = null;
        for (let i = this.#projectiles.length - 1; i >= 0; i--)
          if (this.#projectiles[i]?.ownerId === command.playerId)
            this.#projectiles.splice(i, 1);
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
      for (const resource of this.#resources.values()) {
        if (resource.storedBy !== command.playerId) continue;
        resource.storedBy = null;
        resource.position = { x: position.x, z: position.z };
        resource.expiresAt = this.#time + 180_000;
      }
      const credit =
        command.credit ?? this.#killCredit(command.ownerId ?? null);
      this.#createResource({
        position,
        source: 'meat',
        rarity: 'common',
        killerId: command.ownerId ?? null,
        ownerId: credit.ownerId,
        killerKind: credit.kind,
        repair: false,
      });
      if (player.shelter) this.#leaveShelter(player);
      const ownedBotIds = new Set(
        [...this.#bots.values()]
          .filter((bot) => bot.ownerId === command.playerId)
          .map((bot) => bot.id),
      );
      for (const bot of this.#bots.values()) {
        if (bot.ownerId !== command.playerId) continue;
        if (bot.kind === 'charmed') {
          bot.ownerId = null;
          bot.kind = 'wild';
        } else {
          this.#world.removeRigidBody(bot.craft.body);
          this.#bots.delete(bot.id);
        }
      }
      this.#cancelOwnedWork(command.playerId);
      player.life = { kind: 'eliminated' };
      player.spectating =
        [...this.#players].find(
          ([id, other]) =>
            id !== command.playerId && other.life.kind === 'alive',
        )?.[0] ?? null;
      for (const point of this.#pointsOfInterest)
        releasePointOfInterest(point, command.playerId, this.#time);
      player.poiChoices.clear();
      player.selection.cancel();
      player.progression.pending.length = 0;
      player.activeReward = null;
      player.generatedChoices = [];
      player.deferredDamage.length = 0;
      for (let i = this.#trails.length - 1; i >= 0; i--)
        if (this.#trails[i]?.ownerId === command.playerId)
          this.#trails.splice(i, 1);
      player.dash = null;
      player.guard = null;
      player.invulnerableUntil = 0;
      player.channel = null;
      player.speedBoost = null;
      player.delayedBoost = null;
      player.craft.body.setEnabled(false);
      for (let index = this.#projectiles.length - 1; index >= 0; index--)
        if (this.#projectiles[index]?.ownerId === command.playerId)
          this.#projectiles.splice(index, 1);
      for (const other of this.#players.values()) {
        other.statuses = other.statuses.filter(
          (status) =>
            status.ownerId !== command.playerId &&
            (!status.ownerId || !ownedBotIds.has(status.ownerId)),
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
      for (const bot of this.#bots.values())
        bot.statuses = bot.statuses.filter(
          (status) =>
            status.ownerId !== command.playerId &&
            (!status.ownerId || !ownedBotIds.has(status.ownerId)),
        );
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
    this.#trails.length = 0;
    this.#pendingAllies.length = 0;
    this.#nestDefenses.clear();
    this.#markedTargets.clear();
    this.#closedShelters.clear();
    this.#signalTargets.clear();
    this.#provoked.clear();
    this.#pulls.clear();
    for (const bot of this.#bots.values()) {
      bot.statuses.length = 0;
      if (
        bot.kind === 'summoned' ||
        bot.kind === 'offspring' ||
        bot.kind === 'decoy'
      ) {
        this.#world.removeRigidBody(bot.craft.body);
        this.#bots.delete(bot.id);
      }
    }
    for (const player of this.#players.values()) {
      player.statuses.length = 0;
      player.deferredDamage.length = 0;
      player.hitCueUntil = 0;
      player.guard = null;
      player.invulnerableUntil = 0;
      player.channel = null;
      player.speedBoost = null;
      player.delayedBoost = null;
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

  #killCredit(killerId: string | null): {
    ownerId: string | null;
    kind: 'player' | 'ally' | 'third-party';
  } {
    if (killerId && this.#players.has(killerId))
      return { ownerId: killerId, kind: 'player' };
    const ownerId = killerId ? this.#bots.get(killerId)?.ownerId : null;
    return ownerId
      ? { ownerId, kind: 'ally' }
      : { ownerId: null, kind: 'third-party' };
  }

  #spawnBot(position: Point, tier: number, elite = false): Bot {
    const id = `bot-${++this.#nextBotId}`;
    const roles: BotRole[] = ['hunter', 'forager', 'hunter', 'scavenger'];
    const role = roles[(this.#nextBotId - 1) % roles.length] ?? 'forager';
    const biome = terrainAt(this.#arena, position.x, position.z);
    const profile = sourceEnemyProfile(
      biome,
      role,
      tier,
      elite,
      this.#nextBotId,
    );
    const health = profile.health;
    const bot: Bot = {
      id,
      kind: 'wild',
      expiresAt: null,
      damage: profile.physical,
      speedFactor: 1,
      terrainAdaptation: 0,
      tier,
      role,
      elite,
      biome,
      ownerId: null,
      health,
      statuses: [],
      maxHealth: health,
      plating: profile.plating,
      archetype: profile.archetype,
      loot: profile.loot,
      craft: createCraft(this.#world, { ...position, y: 0.25 }),
      targetId: null,
      hostileToBots: role === 'hunter',
      windupUntil: null,
      readyAt: 0,
      charmReadyAt: 0,
      home: { ...position },
      friendship: null,
      friendshipReadyAt: 0,
      forageAt: this.#time + BOT_RULES.forageInterval,
      waypoint: null,
      waypointTarget: null,
      waypointAt: 0,
    };
    this.#bots.set(id, bot);
    return bot;
  }

  #safeSpawn(origin: Point, radius = 0.5): Point | null {
    const candidates: Point[] = [];
    for (let ring = 1; ring <= 8; ring++)
      for (let index = 0; index < 16; index++) {
        const angle = (index * Math.PI) / 8;
        candidates.push({
          x: origin.x + Math.cos(angle) * ring,
          z: origin.z + Math.sin(angle) * ring,
        });
      }
    return (
      candidates.find(
        (point) =>
          Math.hypot(point.x, point.z) + radius <
            boundaryRadius(this.#wallTime, this.#finale) &&
          arenaPointClear(this.#arena.obstacles, point, radius) &&
          [...this.#players.values()].every(
            (player) =>
              player.life.kind !== 'alive' ||
              Math.hypot(
                player.craft.body.translation().x - point.x,
                player.craft.body.translation().z - point.z,
              ) >=
                player.craft.collider.radius() + radius + 0.1,
          ) &&
          [...this.#bots.values()].every(
            (bot) =>
              Math.hypot(
                bot.craft.body.translation().x - point.x,
                bot.craft.body.translation().z - point.z,
              ) >=
              bot.craft.collider.radius() + radius + 0.1,
          ),
      ) ?? null
    );
  }

  #charmCapacity(ownerId: string): number {
    const owner = this.#players.get(ownerId);
    return owner
      ? Math.max(
          0,
          Math.min(
            SOURCE_GAMEPLAY.passiveCharm.maximumCapacity,
            Math.floor(
              sourceCurve(
                SOURCE_GAMEPLAY.passiveCharm.capacity,
                owner.stats.social,
              ),
            ),
          ) + owner.firmwareAllySlots,
        )
      : 0;
  }

  #ownedCount(ownerId: string, kind: AllyKind): number {
    return [...this.#bots.values()].filter(
      (bot) => bot.ownerId === ownerId && bot.kind === kind && bot.health > 0,
    ).length;
  }

  #effectiveStats(ownerId: string, player: Player): Stats {
    const bonus = player.runtimeEffects.allyResistance(
      this.#ownedCount(ownerId, 'charmed'),
      this.#wallTime >= this.#finale.shrinkStartMs,
    );
    const speedMultiplier = 1 + (player.obstacleSpeed?.bonus ?? 0);
    const meteorBonus =
      (player.ranks.get('strength-in-numbers') ?? 0) *
      this.#ownedCount(ownerId, 'charmed');
    return bonus > 0 || meteorBonus > 0 || speedMultiplier !== 1
      ? {
          ...player.stats,
          speed: player.stats.speed * speedMultiplier,
          cataclysmResistance: Math.min(
            100,
            player.stats.cataclysmResistance + meteorBonus,
          ),
          damageResistance: Math.min(
            100,
            player.stats.damageResistance + bonus,
          ),
        }
      : player.stats;
  }

  #specializationAvailable(
    player: Player,
    choice: NonNullable<ContentDefinition['specializationChoices']>[number],
  ): boolean {
    if (choice.requiresUnowned?.some((id) => (player.ranks.get(id) ?? 0) > 0))
      return false;
    if (choice.effect?.kind === 'grant-upgrade') {
      const granted = this.#content.definition(choice.effect.id);
      return (
        !!granted &&
        !player.ranks.has(granted.id) &&
        this.#content
          .eligible(
            player.ranks,
            player.specializations,
            granted.pool,
            this.#worldConditions,
          )
          .includes(granted.id)
      );
    }
    return !!choice.effect || choice.carcinisationBonus > 0;
  }

  recruitCompanion(ownerId: string, receiptId: string, cost: number): boolean {
    const owner = this.#players.get(ownerId);
    const receiptKey = JSON.stringify([ownerId, receiptId]);
    if (
      this.#phase !== 'running' ||
      !owner?.connected ||
      owner.life.kind !== 'alive' ||
      this.#recruitReceipts.has(receiptKey) ||
      this.#recruitReceipts.size >= 4096 ||
      !Number.isSafeInteger(cost) ||
      cost < 0 ||
      !receiptId ||
      receiptId.length > 128 ||
      owner.wallet.receipts.has(receiptId) ||
      (cost > 0 &&
        (owner.wallet.balance < cost || owner.wallet.receipts.size >= 4096))
    )
      return false;
    const reserved = [...this.#nestDefenses.values()].filter(
      (item) => item.ownerId === ownerId,
    ).length;
    const point = this.#safeSpawn(owner.craft.body.translation());
    if (
      !point ||
      this.#bots.size + this.#pendingAllies.length + this.#nestDefenses.size >=
        ALLY_LIMITS.total ||
      this.#ownedCount(ownerId, 'charmed') + reserved >=
        this.#charmCapacity(ownerId)
    )
      return false;
    const bot = this.#spawnBot(point, 1 + randomInt(2));
    if (
      cost > 0 &&
      !transact(owner.wallet, receiptId, 'spend', cost)?.accepted
    ) {
      this.#world.removeRigidBody(bot.craft.body);
      this.#bots.delete(bot.id);
      return false;
    }
    bot.ownerId = ownerId;
    bot.kind = 'charmed';
    this.#recruitReceipts.add(receiptKey);
    return true;
  }

  #cancelOwnedWork(ownerId: string): void {
    for (let i = this.#pendingAllies.length - 1; i >= 0; i--)
      if (this.#pendingAllies[i]?.ownerId === ownerId)
        this.#pendingAllies.splice(i, 1);
    for (const [site, defense] of this.#nestDefenses)
      if (defense.ownerId === ownerId) this.#nestDefenses.delete(site);
    this.#markedTargets.delete(ownerId);
    this.#signalTargets.delete(ownerId);
    for (const [id, pull] of this.#pulls)
      if (pull.ownerId === ownerId || pull.targetId === ownerId)
        this.#pulls.delete(id);
  }

  markAllyTarget(ownerId: string, targetId: string): boolean {
    const owner = this.#players.get(ownerId);
    const targetBot = this.#bots.get(targetId);
    const view = this.view(ownerId);
    if (
      !owner ||
      !owner.connected ||
      owner.life.kind !== 'alive' ||
      !view ||
      targetId === ownerId ||
      targetBot?.ownerId === ownerId ||
      !(
        view.players.some(
          (player) => player.id === targetId && player.life.kind === 'alive',
        ) || view.bots.some((bot) => bot.id === targetId)
      )
    )
      return false;
    this.#markedTargets.set(ownerId, targetId);
    return true;
  }

  scheduleAlly(
    ownerId: string,
    kind: 'summoned' | 'offspring' | 'decoy',
    delay: number,
    duration: number,
    origin?: Point,
  ): boolean {
    const owner = this.#players.get(ownerId);
    const cap = ALLY_LIMITS[kind];
    if (
      this.#phase !== 'running' ||
      !owner?.connected ||
      owner.life.kind !== 'alive' ||
      owner.life.activity !== 'playing' ||
      owner.shelter ||
      !Number.isFinite(delay) ||
      delay < 0 ||
      delay > 60000 ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > 300000 ||
      this.#pendingAllies.length >= ALLY_LIMITS.pending ||
      this.#ownedCount(ownerId, kind) +
        this.#pendingAllies.filter(
          (item) => item.ownerId === ownerId && item.kind === kind,
        ).length >=
        cap ||
      this.#bots.size + this.#pendingAllies.length + this.#nestDefenses.size >=
        ALLY_LIMITS.total
    )
      return false;
    this.#pendingAllies.push({
      ownerId,
      kind,
      origin,
      at: this.#time + delay,
      duration,
      health: Math.max(
        1,
        owner.stats.maximumHealth * (kind === 'decoy' ? 0.2 : 0.35),
      ),
      damage: Math.max(
        0,
        owner.stats.physical * (kind === 'offspring' ? 1 : 0.5),
      ),
      terrainAdaptation:
        kind === 'offspring' ? owner.stats.terrainAdaptation : 0,
      radius: Math.max(
        0.25,
        Math.min(0.75, owner.craft.collider.radius() * 0.5),
      ),
      speedFactor: Math.max(
        0.25,
        Math.min(2, owner.stats.speed / BASE_STATS.speed),
      ),
    });
    return true;
  }

  #advanceOwnedEntities(deltaMs: number): void {
    for (const bot of this.#bots.values()) {
      const owner = bot.ownerId && this.#players.get(bot.ownerId);
      if (
        bot.kind !== 'wild' &&
        bot.kind !== 'charmed' &&
        (!owner ||
          !owner.connected ||
          owner.life.kind !== 'alive' ||
          (bot.expiresAt !== null && bot.expiresAt <= this.#time + deltaMs))
      ) {
        this.#world.removeRigidBody(bot.craft.body);
        this.#bots.delete(bot.id);
      }
    }
    for (let i = this.#pendingAllies.length - 1; i >= 0; i--) {
      const item = this.#pendingAllies[i];
      if (!item || item.at > this.#time + deltaMs) continue;
      const owner = this.#players.get(item.ownerId);
      this.#pendingAllies.splice(i, 1);
      if (
        !owner?.connected ||
        owner.life.kind !== 'alive' ||
        this.#phase !== 'running' ||
        owner.life.activity !== 'playing' ||
        owner.shelter ||
        this.#bots.size >= ALLY_LIMITS.total ||
        this.#ownedCount(item.ownerId, item.kind) >= ALLY_LIMITS[item.kind]
      )
        continue;
      const point = this.#safeSpawn(
        item.origin ?? owner.craft.body.translation(),
        item.radius,
      );
      if (!point) continue;
      const bot = this.#spawnBot(point, 1);
      bot.ownerId = item.ownerId;
      bot.kind = item.kind;
      bot.health = item.health;
      bot.maxHealth = item.health;
      bot.plating = 0;
      bot.archetype = null;
      bot.loot = null;
      bot.damage = item.damage;
      bot.speedFactor = item.speedFactor;
      bot.terrainAdaptation = item.terrainAdaptation;
      bot.craft.collider.setRadius(item.radius);
      bot.craft.body.recomputeMassPropertiesFromColliders();
      bot.expiresAt = this.#time + deltaMs + item.duration;
    }
    for (const [siteId, defense] of this.#nestDefenses) {
      const owner = this.#players.get(defense.ownerId);
      const site = this.#pointsOfInterest.find((point) => point.id === siteId);
      if (
        !owner?.connected ||
        owner.life.kind !== 'alive' ||
        !site ||
        Math.hypot(site.position.x, site.position.z) >=
          boundaryRadius(this.#wallTime, this.#finale)
      ) {
        this.#nestDefenses.delete(siteId);
        continue;
      }
      const enemies = [...this.#bots.values()].filter(
        (bot) =>
          bot.ownerId !== defense.ownerId &&
          Math.hypot(
            bot.craft.body.translation().x - site.position.x,
            bot.craft.body.translation().z - site.position.z,
          ) < 2.5,
      ).length;
      defense.health -= ((enemies * deltaMs) / 1000) * 3;
      if (defense.health <= 0) {
        this.#nestDefenses.delete(siteId);
        continue;
      }
      if (
        this.#time + deltaMs < defense.endsAt ||
        isSelectionProtected(owner) ||
        owner.shelter
      )
        continue;
      const point = this.#safeSpawn(site.position);
      if (
        point &&
        this.#ownedCount(defense.ownerId, 'charmed') <
          this.#charmCapacity(defense.ownerId) &&
        this.#bots.size < ALLY_LIMITS.total
      ) {
        const bot = this.#spawnBot(point, 2);
        bot.ownerId = defense.ownerId;
        bot.kind = 'charmed';
      }
      this.#nestDefenses.delete(siteId);
    }
  }

  #resizeCraft(player: Player): void {
    const desired = Math.max(0.1, Math.min(1.5, player.stats.size / 200));
    const current = player.craft.collider.radius();
    if (Math.abs(desired - current) < 0.001) return;
    const origin = player.craft.body.translation();
    const clear = (point: Point) =>
      arenaPointClear(this.#arena.obstacles, point, desired) &&
      [...this.#players.values()].every(
        (other) =>
          other === player ||
          other.life.kind !== 'alive' ||
          other.shelter !== null ||
          Math.hypot(
            other.craft.body.translation().x - point.x,
            other.craft.body.translation().z - point.z,
          ) >=
            desired + other.craft.collider.radius() + 0.02,
      ) &&
      [...this.#bots.values()].every(
        (bot) =>
          Math.hypot(
            bot.craft.body.translation().x - point.x,
            bot.craft.body.translation().z - point.z,
          ) >=
          desired + bot.craft.collider.radius() + 0.02,
      );
    let point: Point | undefined = clear(origin) ? origin : undefined;
    for (let ring = 1; !point && ring <= 10; ring++)
      for (let i = 0; !point && i < 16; i++) {
        const angle = (i * Math.PI) / 8;
        const candidate = {
          x: origin.x + Math.cos(angle) * ring * 0.5,
          z: origin.z + Math.sin(angle) * ring * 0.5,
        };
        if (clear(candidate)) {
          const dx = candidate.x - origin.x,
            dz = candidate.z - origin.z;
          const distance = Math.hypot(dx, dz);
          const hit = this.#world.castRay(
            new RAPIER.Ray(origin, {
              x: dx / distance,
              y: 0,
              z: dz / distance,
            }),
            distance,
            true,
            RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
            undefined,
            player.craft.collider,
          );
          if (!hit) point = candidate;
        }
      }
    if (!point) return;
    if (point !== origin)
      player.craft.body.setTranslation(
        { x: point.x, y: origin.y, z: point.z },
        true,
      );
    player.craft.collider.setRadius(desired);
    player.craft.body.recomputeMassPropertiesFromColliders();
  }

  startPull(
    ownerId: string,
    targetId: string,
    duration: number,
    strength: number,
  ): boolean {
    const owner = this.#players.get(ownerId);
    const target = this.#players.get(targetId) ?? this.#bots.get(targetId);
    if (
      this.#phase !== 'running' ||
      !owner?.connected ||
      owner.life.kind !== 'alive' ||
      owner.life.activity !== 'playing' ||
      owner.shelter ||
      !target ||
      ownerId === targetId ||
      ('life' in target &&
        (target.life.kind !== 'alive' ||
          target.shelter !== null ||
          isSelectionProtected(target))) ||
      ('health' in target &&
        typeof target.health === 'number' &&
        target.health <= 0) ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > 5000 ||
      !Number.isFinite(strength) ||
      strength <= 0 ||
      strength > 20 ||
      this.#pulls.size >= 64
    )
      return false;
    const a = owner.craft.body.translation(),
      b = target.craft.body.translation();
    if (Math.hypot(a.x - b.x, a.z - b.z) > 15) return false;
    this.#pulls.set(ownerId, {
      ownerId,
      targetId,
      until: this.#time + duration,
      strength,
    });
    return true;
  }

  cancelPull(ownerId: string): void {
    this.#pulls.delete(ownerId);
  }

  #advancePulls(deltaMs: number): void {
    for (const [id, pull] of this.#pulls) {
      const owner = this.#players.get(pull.ownerId);
      const target =
        this.#players.get(pull.targetId) ?? this.#bots.get(pull.targetId);
      if (
        !owner?.connected ||
        owner.life.kind !== 'alive' ||
        owner.life.activity !== 'playing' ||
        owner.shelter ||
        !target ||
        ('life' in target &&
          (target.life.kind !== 'alive' ||
            target.shelter !== null ||
            isSelectionProtected(target))) ||
        ('health' in target &&
          typeof target.health === 'number' &&
          target.health <= 0) ||
        pull.until <= this.#time
      ) {
        this.#pulls.delete(id);
        continue;
      }
      const a = owner.craft.body.translation(),
        b = target.craft.body.translation();
      const dx = b.x - a.x,
        dz = b.z - a.z,
        distance = Math.hypot(dx, dz);
      if (
        distance > 15 ||
        distance <=
          owner.craft.collider.radius() + target.craft.collider.radius()
      ) {
        this.#pulls.delete(id);
        continue;
      }
      const hit = this.#world.castRay(
        new RAPIER.Ray(a, { x: dx / distance, y: 0, z: dz / distance }),
        distance,
        true,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
        undefined,
        owner.craft.collider,
      );
      if (hit && hit.collider.handle !== target.craft.collider.handle) {
        this.#pulls.delete(id);
        continue;
      }
      const ownerMass = owner.craft.body.mass(),
        targetMass = target.craft.body.mass();
      const impulse = Math.min(
        20,
        (pull.strength * Math.min(deltaMs, pull.until - this.#time)) / 1000,
      );
      if (ownerMass <= targetMass * 1.5)
        owner.craft.body.applyImpulse(
          { x: (dx / distance) * impulse, y: 0, z: (dz / distance) * impulse },
          true,
        );
      if (targetMass <= ownerMass * 1.5)
        target.craft.body.applyImpulse(
          {
            x: (-dx / distance) * impulse,
            y: 0,
            z: (-dz / distance) * impulse,
          },
          true,
        );
    }
  }

  #replenishBots(): void {
    if (this.#time < this.#nextBotSpawn) return;
    this.#nextBotSpawn = this.#time + BOT_RULES.spawnInterval;
    const centers = [...this.#players.values()]
      .filter((player) => player.life.kind === 'alive')
      .map((player) => player.craft.body.translation());
    if (!centers.length) return;
    for (const [id, bot] of this.#bots) {
      const point = bot.craft.body.translation();
      if (
        bot.kind === 'wild' &&
        centers.every(
          (center) => Math.hypot(center.x - point.x, center.z - point.z) > 42,
        )
      ) {
        this.#world.removeRigidBody(bot.craft.body);
        this.#bots.delete(id);
        this.#provoked.delete(id);
        for (const tracked of this.#signalTargets.values()) tracked.delete(id);
      }
    }
    const stage =
      BOT_STAGES.findLast((item) => this.#wallTime >= item.at) ?? BOT_STAGES[0];
    const source = SOURCE_GAMEPLAY.enemyPopulation.findLast(
      (item) => this.#wallTime >= item.atMs,
    );
    // Three nearby region equivalents; the scale and multiplayer cap are adaptation estimates.
    const target = source
      ? Math.min(
          24,
          Math.ceil(
            ((3 * (source.minimum + source.maximum)) / 2) * source.density,
          ),
        )
      : 10;
    const radius = Math.max(
      0,
      boundaryRadius(this.#wallTime, this.#finale) - 2,
    );
    if (radius < 2) return;
    const wild = [...this.#bots.values()].filter((bot) => bot.kind === 'wild');
    const population = (center: Point) =>
      wild.filter((bot) => {
        const point = bot.craft.body.translation();
        return Math.hypot(center.x - point.x, center.z - point.z) < 32;
      }).length;
    for (let attempt = 0; attempt < centers.length * 3; attempt++) {
      if (
        wild.length >= BOT_RULES.maxCount ||
        this.#bots.size +
          this.#pendingAllies.length +
          this.#nestDefenses.size >=
          ALLY_LIMITS.total
      )
        break;
      centers.sort((a, b) => population(a) - population(b));
      const center = centers[0];
      if (!center || population(center) >= target) break;
      let position: Point | null = null;
      for (let candidate = 0; candidate < 48; candidate++) {
        const angle =
          ((candidate + this.#nextBotId * 0.618) * Math.PI * 2) / 16;
        const distance = Math.min(
          14 + Math.floor(candidate / 16) * 4,
          radius * 0.6,
        );
        const point = {
          x: center.x + Math.cos(angle) * distance,
          z: center.z + Math.sin(angle) * distance,
        };
        if (
          Math.hypot(point.x, point.z) > radius ||
          !arenaPointClear(this.#arena.obstacles, point)
        )
          continue;
        if (
          centers.some(
            (other) =>
              Math.hypot(other.x - point.x, other.z - point.z) <
              Math.min(8, radius * 0.2),
          )
        )
          continue;
        if (
          [...this.#bots.values()].some((bot) => {
            const other = bot.craft.body.translation();
            return Math.hypot(other.x - point.x, other.z - point.z) < 3;
          })
        )
          continue;
        position = point;
        break;
      }
      if (!position) break;
      const elite =
        this.#wallTime >= 180_000 &&
        (this.#nextBotId + 1) % 5 === 0 &&
        wild.filter((bot) => bot.elite).length < BOT_RULES.maxElites;
      wild.push(this.#spawnBot(position, stage.tier, elite));
    }
  }

  #trailSlow(targetId: string, position: Point): number {
    const target = this.#players.get(targetId);
    if (
      target &&
      (target.life.kind !== 'alive' ||
        isSelectionProtected(target) ||
        target.shelter ||
        target.statusImmunities.has('slow'))
    )
      return 0;
    const botOwner = this.#bots.get(targetId)?.ownerId;
    let slow = 0;
    for (const trail of this.#trails) {
      if (
        trail.until <= this.#time ||
        trail.ownerId === targetId ||
        trail.ownerId === botOwner ||
        !this.canUseOwnedOffense(trail.ownerId)
      )
        continue;
      if (
        Math.hypot(
          position.x - trail.position.x,
          position.z - trail.position.z,
        ) <= trail.radius
      )
        slow = Math.max(
          slow,
          (trail.slowPercent / 100) *
            (trail.kind === 'pedal' &&
            this.#players
              .get(trail.ownerId)
              ?.specializations.has('pedal-glands-thick')
              ? 1 +
                Math.min(
                  1,
                  (this.#time -
                    (this.#thickExposure.get(`${trail.ownerId}:${targetId}`)
                      ?.since ?? this.#time)) /
                    3000,
                )
              : 1),
        );
    }
    return slow;
  }

  #advanceTrails(now: number): void {
    for (let i = this.#trails.length - 1; i >= 0; i--)
      if ((this.#trails[i]?.until ?? 0) <= now) this.#trails.splice(i, 1);
    const activeThick = new Set<string>();
    for (const trail of this.#trails) {
      if (
        trail.kind === 'pedal' &&
        this.#players
          .get(trail.ownerId)
          ?.specializations.has('pedal-glands-thick') &&
        this.canUseOwnedOffense(trail.ownerId)
      ) {
        const targets = [
          ...[...this.#players]
            .filter(
              ([id, player]) =>
                id !== trail.ownerId && player.life.kind === 'alive',
            )
            .map(([id, player]) => ({
              id,
              point: player.craft.body.translation(),
            })),
          ...[...this.#bots.values()]
            .filter((bot) => bot.health > 0 && bot.ownerId !== trail.ownerId)
            .map((bot) => ({
              id: bot.id,
              point: bot.craft.body.translation(),
            })),
        ];
        for (const target of targets)
          if (
            Math.hypot(
              target.point.x - trail.position.x,
              target.point.z - trail.position.z,
            ) <= trail.radius
          ) {
            const key = `${trail.ownerId}:${target.id}`;
            activeThick.add(key);
            const exposure = this.#thickExposure.get(key) ?? {
              since: now,
              stunned: false,
            };
            if (
              !exposure.stunned &&
              now - exposure.since >= 3000 &&
              this.applyStatus(target.id, {
                kind: 'stun',
                ownerId: trail.ownerId,
                magnitude: 0,
                duration: 2000,
              })
            )
              exposure.stunned = true;
            this.#thickExposure.set(key, exposure);
          }
      }
      if (trail.trapped && this.canUseOwnedOffense(trail.ownerId)) {
        const targets = [
          ...[...this.#players]
            .filter(
              ([id, player]) =>
                id !== trail.ownerId && player.life.kind === 'alive',
            )
            .map(([id, player]) => ({
              id,
              point: player.craft.body.translation(),
            })),
          ...[...this.#bots.values()]
            .filter((bot) => bot.health > 0 && bot.ownerId !== trail.ownerId)
            .map((bot) => ({
              id: bot.id,
              point: bot.craft.body.translation(),
            })),
        ];
        for (const target of targets)
          if (
            !trail.trapped.has(target.id) &&
            Math.hypot(
              target.point.x - trail.position.x,
              target.point.z - trail.position.z,
            ) <=
              trail.radius * 0.4 &&
            this.applyStatus(target.id, {
              kind: 'stun',
              ownerId: trail.ownerId,
              magnitude: 0,
              duration: 3000,
            })
          )
            trail.trapped.add(target.id);
      }
      const status = trail.status;
      if (!status || status.nextAt > now) continue;
      status.nextAt = now + status.effect.intervalMs;
      if (!this.canUseOwnedOffense(trail.ownerId)) continue;
      const targets = [
        ...[...this.#players]
          .filter(([id]) => id !== trail.ownerId)
          .map(([id, player]) => ({
            id,
            craft: player.craft,
            statuses: player.statuses,
          })),
        ...[...this.#bots.values()]
          .filter((bot) => bot.ownerId !== trail.ownerId)
          .map((bot) => ({
            id: bot.id,
            craft: bot.craft,
            statuses: bot.statuses,
          })),
      ];
      for (const target of targets) {
        const point = target.craft.body.translation();
        if (
          Math.hypot(point.x - trail.position.x, point.z - trail.position.z) >
          trail.radius * status.effect.radiusFraction
        )
          continue;
        const slow = Math.min(
          1,
          this.#trailSlow(target.id, point) +
            target.statuses
              .filter(
                (item) => item.kind === 'slow' && this.#statusIsActive(item),
              )
              .reduce((sum, item) => sum + item.magnitude / 100, 0),
        );
        this.applyStatus(target.id, {
          kind: status.effect.kind,
          ownerId: trail.ownerId,
          magnitude:
            status.effect.magnitude * (1 + slow * status.effect.slowMultiplier),
          duration: status.effect.durationMs,
        });
      }
    }
    for (const key of this.#thickExposure.keys())
      if (!activeThick.has(key)) this.#thickExposure.delete(key);
    for (const [id, player] of this.#players) {
      if (player.life.kind !== 'alive') continue;
      const position = player.craft.body.translation();
      const velocity = player.craft.body.linvel();
      const pursuedWithin = (range: number) => {
        for (const bot of this.#bots.values()) {
          const point = bot.craft.body.translation();
          if (
            bot.ownerId !== id &&
            bot.targetId === id &&
            Math.hypot(point.x - position.x, point.z - position.z) <= range
          )
            return true;
        }
        for (const [otherId, other] of this.#players) {
          if (
            otherId === id ||
            other.life.kind !== 'alive' ||
            !this.canUseOwnedOffense(otherId)
          )
            continue;
          const point = other.craft.body.translation();
          const dx = position.x - point.x,
            dz = position.z - point.z;
          const distance = Math.hypot(dx, dz);
          if (distance === 0 || distance > range) continue;
          const otherVelocity = other.craft.body.linvel();
          if (
            ((otherVelocity.x - velocity.x) * dx +
              (otherVelocity.z - velocity.z) * dz) /
              distance >
            0.25
          )
            return true;
        }
        return false;
      };
      const effects = player.runtimeEffects.trails(
        now,
        this.canUseOwnedOffense(id),
        Math.hypot(velocity.x, velocity.z) > 0.25,
        pursuedWithin,
      );
      if (
        player.dash?.jetNextAt !== undefined &&
        player.dash.until > now &&
        player.dash.jetNextAt <= now &&
        this.canUseOwnedOffense(id)
      ) {
        player.dash.jetNextAt = now + 100;
        const secretion = player.runtimeEffects.secretionTrail();
        if (secretion) effects.push(secretion);
        const web = player.equipment.learned.get('spinnerets');
        if (
          web?.action === 'slow-field' &&
          this.#trails.length < 128 &&
          !this.#trails.some(
            (trail) =>
              trail.kind === 'web' &&
              Math.hypot(
                trail.position.x - position.x,
                trail.position.z - position.z,
              ) < 2,
          )
        ) {
          if (player.specializations.has('spinnerets-egg-sac'))
            this.scheduleAlly(id, 'offspring', web.durationMs, 30000, {
              x: position.x,
              z: position.z,
            });
          this.#trails.push({
            id: ++this.#nextTrailId,
            ownerId: id,
            kind: 'web',
            position: { x: position.x, z: position.z },
            radius: Math.min(20, (web.radius * player.stats.effectArea) / 100),
            slowPercent: web.slowPercent,
            until: now + web.durationMs,
            ...(player.specializations.has('spinnerets-trap')
              ? { trapped: new Set<string>() }
              : {}),
            ...(web.status
              ? { status: { effect: { ...web.status }, nextAt: now } }
              : {}),
          });
        }
      }
      for (const effect of effects) {
        if (this.#trails.length >= 128) break;
        this.#trails.push({
          id: ++this.#nextTrailId,
          ownerId: id,
          kind: effect.id === 'upgrade:pedal-glands' ? 'pedal' : undefined,
          position: { x: position.x, z: position.z },
          radius: Math.min(20, (effect.radius * player.stats.effectArea) / 100),
          slowPercent: effect.slowPercent,
          until: now + effect.durationMs,
          ...(effect.status
            ? { status: { effect: { ...effect.status }, nextAt: now } }
            : {}),
        });
      }
    }
  }

  #steerBot(
    bot: Bot,
    destination: Point,
    target: string,
    deltaMs: number,
    speed: number,
  ): void {
    const origin = bot.craft.body.translation();
    const radius = Math.max(
      0,
      boundaryRadius(this.#wallTime, this.#finale) - 1,
    );
    if (bot.waypointTarget !== target || this.#time >= bot.waypointAt) {
      bot.waypoint = nextArenaWaypoint(
        this.#arena.obstacles,
        origin,
        destination,
        radius,
      );
      bot.waypointTarget = target;
      bot.waypointAt = this.#time + 1000;
    }
    const point = bot.waypoint;
    const dx = point ? point.x - origin.x : 0;
    const dz = point ? point.z - origin.z : 0;
    const distance = Math.hypot(dx, dz);
    const region = terrainRegionAt(this.#arena, origin.x, origin.z);
    const terrain = region?.terrain ?? 'grass';
    const traction = terrainSpeedMultiplier(
      terrain,
      bot.kind === 'offspring'
        ? bot.terrainAdaptation
        : terrain === bot.biome
          ? 100
          : 0,
      0,
      region?.waterDepth,
    );
    const statusSlow = Math.min(
      1,
      bot.statuses
        .filter(
          (status) => status.kind === 'slow' && this.#statusIsActive(status),
        )
        .reduce((sum, status) => sum + status.magnitude, 0) / 100,
    );
    const speedFactor =
      1 - Math.min(1, this.#trailSlow(bot.id, origin) + statusSlow);
    steerCraft(
      bot.craft.body,
      distance > 0.1
        ? {
            x: (dx / distance) * speed * traction * speedFactor,
            y: (dz / distance) * speed * traction * speedFactor,
          }
        : { x: 0, y: 0 },
      deltaMs / 1000,
    );
  }

  #advanceCompanion(bot: Bot, deltaMs: number): DamageEvent[] {
    const ownerId = bot.ownerId;
    const owner = ownerId ? this.#players.get(ownerId) : undefined;
    if (!ownerId || !owner || owner.life.kind !== 'alive' || !owner.connected) {
      bot.windupUntil = null;
      steerCraft(bot.craft.body, { x: 0, y: 0 }, deltaMs / 1000);
      return [];
    }
    const position = bot.craft.body.translation();
    const ownerPosition = owner.craft.body.translation();
    const distanceToOwner = Math.hypot(
      position.x - ownerPosition.x,
      position.z - ownerPosition.z,
    );
    if (bot.kind === 'decoy' || !this.canUseOwnedOffense(ownerId)) {
      bot.windupUntil = null;
      bot.targetId = null;
      steerCraft(bot.craft.body, { x: 0, y: 0 }, deltaMs / 1000);
      return [];
    }
    const view = this.view(ownerId);
    const marked = this.#markedTargets.get(ownerId);
    const tracked = this.#signalTargets.get(ownerId);
    const choices: { id: string; point: Point; distance: number }[] = [];
    for (const other of view?.bots ?? []) {
      if (other.id === bot.id || other.ownerId === ownerId) continue;
      const distance = Math.hypot(
        other.position.x - position.x,
        other.position.z - position.z,
      );
      if (distance <= 12)
        choices.push({ id: other.id, point: other.position, distance });
    }
    for (const other of view?.players ?? []) {
      if (other.id === ownerId || other.life.kind !== 'alive' || other.shelter)
        continue;
      const distance = Math.hypot(
        other.position.x - position.x,
        other.position.z - position.z,
      );
      if (distance <= 12)
        choices.push({ id: other.id, point: other.position, distance });
    }
    choices.sort(
      (a, b) =>
        Number(owner.ranks.has('tracker') && !!this.#bots.get(b.id)?.elite) -
          Number(owner.ranks.has('tracker') && !!this.#bots.get(a.id)?.elite) ||
        Number(tracked?.has(b.id) ?? false) -
          Number(tracked?.has(a.id) ?? false) ||
        Number(b.id === marked) - Number(a.id === marked) ||
        a.distance - b.distance ||
        a.id.localeCompare(b.id),
    );
    const target = distanceToOwner <= 20 ? choices[0] : undefined;
    bot.targetId = target?.id ?? null;
    if (!target) {
      bot.windupUntil = null;
      if (distanceToOwner > 3)
        this.#steerBot(
          bot,
          ownerPosition,
          `follow:${ownerId}`,
          deltaMs,
          BOT_RULES.speed * 1.2 * bot.speedFactor,
        );
      else steerCraft(bot.craft.body, { x: 0, y: 0 }, deltaMs / 1000);
      return [];
    }
    const dx = target.point.x - position.x,
      dz = target.point.z - position.z;
    const ray =
      target.distance > 0
        ? this.#world.castRay(
            new RAPIER.Ray(position, {
              x: dx / target.distance,
              y: 0,
              z: dz / target.distance,
            }),
            target.distance + 1,
            true,
            RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
            undefined,
            bot.craft.collider,
          )
        : null;
    const visible =
      !!ray && this.#combatantAtCollider(ray.collider.handle) === target.id;
    const attackRange =
      BOT_RULES.attackRange + Math.max(0, bot.craft.collider.radius() - 0.5);
    const events: DamageEvent[] = [];
    if (bot.windupUntil !== null && this.#time + deltaMs >= bot.windupUntil) {
      if (visible && target.distance <= attackRange)
        events.push({
          targetId: target.id,
          ownerId: bot.id,
          channel: 'contact',
          amount: bot.damage,
          depth: 0,
        });
      bot.windupUntil = null;
    }
    if (
      bot.windupUntil === null &&
      this.#time >= bot.readyAt &&
      visible &&
      target.distance <= attackRange
    ) {
      bot.windupUntil = this.#time + BOT_RULES.windup;
      bot.readyAt = this.#time + BOT_RULES.cooldown;
    }
    if (bot.windupUntil === null && target.distance > attackRange * 0.75)
      this.#steerBot(
        bot,
        target.point,
        `ally:${target.id}`,
        deltaMs,
        BOT_RULES.speed * 1.2 * bot.speedFactor,
      );
    else steerCraft(bot.craft.body, { x: 0, y: 0 }, deltaMs / 1000);
    return events;
  }

  #advanceBots(deltaMs: number): DamageEvent[] {
    const attacks: DamageEvent[] = [];
    for (const bot of this.#bots.values()) {
      if (
        bot.statuses.some(
          (status) => status.kind === 'stun' && this.#statusIsActive(status),
        )
      ) {
        bot.windupUntil = null;
        steerCraft(bot.craft.body, { x: 0, y: 0 }, deltaMs / 1000);
        continue;
      }
      if (bot.ownerId) {
        attacks.push(...this.#advanceCompanion(bot, deltaMs));
        continue;
      }
      const position = bot.craft.body.translation();
      let target: {
        id: string;
        position: Point;
        distance: number;
        threat: boolean;
      } | null = null;
      for (const [id, player] of this.#players) {
        if (
          id === bot.ownerId ||
          (bot.friendship?.playerId === id &&
            bot.friendship.until > this.#time) ||
          player.shelter !== null ||
          player.life.kind !== 'alive' ||
          (player.life.activity !== 'playing' && isSelectionProtected(player))
        )
          continue;
        const point = player.craft.body.translation();
        const distance = Math.hypot(point.x - position.x, point.z - position.z);
        if (
          distance < BOT_RULES.aggro &&
          (!target || distance < target.distance)
        )
          target = {
            id,
            position: point,
            distance,
            threat:
              (bot.role !== 'hunter' &&
                !(
                  this.#provoked.get(bot.id)?.ownerId === id &&
                  (this.#provoked.get(bot.id)?.until ?? 0) > this.#time
                )) ||
              (bot.role === 'hunter' && bot.health < bot.maxHealth * 0.3),
          };
      }
      for (const other of this.#bots.values()) {
        if (
          other.id === bot.id ||
          other.health <= 0 ||
          (other.kind === 'decoy' &&
            other.ownerId !== null &&
            !this.canUseOwnedOffense(other.ownerId)) ||
          (bot.ownerId !== null && bot.ownerId === other.ownerId)
        )
          continue;
        const point = other.craft.body.translation();
        const distance = Math.hypot(point.x - position.x, point.z - position.z);
        const prey =
          (other.kind === 'decoy' && other.ownerId !== bot.ownerId) ||
          (bot.hostileToBots && other.role !== 'hunter');
        const threat =
          other.kind !== 'decoy' &&
          other.hostileToBots &&
          bot.role !== 'hunter';
        const decoyAttracts = other.kind === 'decoy' && distance <= 12;
        if (
          (prey || threat) &&
          (decoyAttracts || distance < BOT_RULES.aggro) &&
          (decoyAttracts
            ? !target ||
              this.#bots.get(target.id)?.kind !== 'decoy' ||
              distance < target.distance
            : !target ||
              (this.#bots.get(target.id)?.kind !== 'decoy' &&
                distance < target.distance))
        )
          target = { id: other.id, position: point, distance, threat };
      }
      bot.targetId = target?.id ?? null;
      if (target?.threat) {
        bot.windupUntil = null;
        const dx = position.x - target.position.x;
        const dz = position.z - target.position.z;
        const distance = Math.hypot(dx, dz) || 1;
        const radius = Math.max(
          0,
          boundaryRadius(this.#wallTime, this.#finale) - 2,
        );
        const destination = {
          x: position.x + (dx / distance) * 6,
          z: position.z + (dz / distance) * 6,
        };
        const length = Math.hypot(destination.x, destination.z);
        if (length > radius && length > 0) {
          destination.x *= radius / length;
          destination.z *= radius / length;
        }
        this.#steerBot(
          bot,
          destination,
          `flee:${target.id}`,
          deltaMs,
          BOT_RULES.speed,
        );
        continue;
      }
      if (target) {
        const dx = target.position.x - position.x;
        const dz = target.position.z - position.z;
        const direction =
          target.distance > 0
            ? { x: dx / target.distance, y: 0, z: dz / target.distance }
            : { x: 0, y: 0, z: 1 };
        const ray = this.#world.castRay(
          new RAPIER.Ray(position, direction),
          Math.max(target.distance + 0.6, 0.6),
          true,
          RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
          undefined,
          bot.craft.collider,
        );
        const visible =
          ray && this.#combatantAtCollider(ray.collider.handle) === target.id;
        if (
          bot.windupUntil !== null &&
          this.#time + deltaMs >= bot.windupUntil
        ) {
          if (visible && target.distance <= BOT_RULES.attackRange)
            attacks.push({
              targetId: target.id,
              ownerId: bot.id,
              channel: 'contact',
              amount: bot.damage,
              depth: 0,
            });
          bot.windupUntil = null;
        }
        if (
          bot.windupUntil === null &&
          this.#time >= bot.readyAt &&
          visible &&
          target.distance <= BOT_RULES.attackRange
        ) {
          bot.windupUntil = this.#time + BOT_RULES.windup;
          bot.readyAt = this.#time + BOT_RULES.cooldown;
        }
        if (bot.windupUntil === null && target.distance > 1.5)
          this.#steerBot(
            bot,
            target.position,
            `pursue:${target.id}`,
            deltaMs,
            BOT_RULES.speed,
          );
        else steerCraft(bot.craft.body, { x: 0, y: 0 }, deltaMs / 1000);
        continue;
      }
      bot.windupUntil = null;
      let food: Resource | undefined;
      let foodDistance = 12;
      for (const resource of this.#resources.values()) {
        if (
          resource.storedBy !== null ||
          resource.repair ||
          (bot.ownerId !== null && resource.ownerId === bot.ownerId) ||
          (bot.role === 'scavenger'
            ? resource.source !== 'meat'
            : resource.source === 'meat')
        )
          continue;
        const distance = Math.hypot(
          resource.position.x - position.x,
          resource.position.z - position.z,
        );
        if (distance < foodDistance) {
          food = resource;
          foodDistance = distance;
        }
      }
      if (food) {
        if (foodDistance <= 2.5) {
          steerCraft(bot.craft.body, { x: 0, y: 0 }, deltaMs / 1000);
          const contested = [...this.#players.values()].some((player) => {
            const p = player.craft.body.translation();
            return (
              player.life.kind === 'alive' &&
              Math.hypot(p.x - food.position.x, p.z - food.position.z) < 2.5
            );
          });
          if (!contested && this.#time >= bot.forageAt) {
            bot.forageAt = this.#time + BOT_RULES.forageInterval;
            food.stage++;
            food.collectors.clear();
            if (food.stage >= STAGE_WEIGHT.length)
              this.#resources.delete(food.id);
          }
        } else
          this.#steerBot(
            bot,
            food.position,
            `food:${food.id}`,
            deltaMs,
            BOT_RULES.speed * 0.7,
          );
      } else {
        const angle =
          Math.floor(this.#time / 8000) * 1.7 + Number(bot.id.slice(4)) * 2;
        const radius = Math.max(
          0,
          boundaryRadius(this.#wallTime, this.#finale) - 2,
        );
        const destination = {
          x: bot.home.x + Math.cos(angle) * 6,
          z: bot.home.z + Math.sin(angle) * 6,
        };
        const length = Math.hypot(destination.x, destination.z);
        if (length > radius && length > 0) {
          destination.x *= radius / length;
          destination.z *= radius / length;
        }
        this.#steerBot(
          bot,
          destination,
          'wander',
          deltaMs,
          BOT_RULES.speed * 0.45,
        );
      }
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
      if (
        resource.storedBy === null &&
        resource.expiresAt <= this.#time + deltaMs
      ) {
        this.#resources.delete(resource.id);
        continue;
      }
      for (const [playerId, player] of players) {
        if (resource.storedBy !== null && resource.storedBy !== playerId)
          continue;
        if (player.ranks.has('vegan') && resource.source !== 'vegetation')
          continue;
        if (
          !player.connected ||
          player.life.kind !== 'alive' ||
          player.life.activity !== 'playing' ||
          player.shelter !== null
        )
          continue;
        const position = player.craft.body.translation();
        if (
          resource.storedBy === null &&
          Math.hypot(
            position.x - resource.position.x,
            position.z - resource.position.z,
          ) >
            player.stats.salvageReach +
              Math.max(0, player.craft.collider.radius() - 0.5)
        )
          continue;
        if (resource.storedBy === null) {
          const rank = player.ranks.get('cheek-pouch') ?? 0;
          const rarity = player.rarities.get('cheek-pouch');
          const capacity =
            rarity &&
            this.#content.definition('cheek-pouch')?.values[rarity]?.[rank - 1];
          const stored = [...this.#resources.values()].filter(
            (item) => item.storedBy === playerId,
          ).length;
          if (capacity && stored < capacity) resource.storedBy = playerId;
        }
        if (
          resource.storedBy !== null &&
          [...this.#resources.values()].find(
            (item) => item.storedBy === playerId,
          ) !== resource
        )
          continue;
        const elapsed =
          (resource.collectors.get(playerId) ?? 0) +
          (deltaMs * player.stats.salvageSpeed) / 100;
        resource.collectors.set(playerId, elapsed);
        if (
          resource.stage > 0 &&
          elapsed < SOURCE_GAMEPLAY.food.subsequentBiteMs
        )
          continue;
        const weight = STAGE_WEIGHT[resource.stage];
        if (weight === undefined) continue;
        const provenance =
          resource.killerKind === 'player' && resource.killerId === playerId
            ? 'own-kill'
            : resource.killerKind === 'ally' && resource.ownerId === playerId
              ? 'ally-kill'
              : resource.killerKind === null
                ? 'none'
                : 'third-party';
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
        const scavengerBonus =
          resource.source !== 'vegetation' &&
          resource.killerKind !== null &&
          resource.killerId !== playerId
            ? player.stats.carrionProgress - 100
            : 0;
        const earnedProgress =
          ((RESOURCE_TOTAL[rarity] * weight) / 5) *
          (player.stats.progress / 100) *
          ((sourceFactor + scavengerBonus) / 100);
        const progress = player.runtimeEffects.storeProgress(earnedProgress);
        let repairFood = resource.claimantRepair.get(playerId);
        if (repairFood === undefined) {
          repairFood = healingFood(
            resource,
            rarity,
            player.stats.repairFoodChance,
          );
          resource.claimantRepair.set(playerId, repairFood);
        }
        const healing = repairFood
          ? this.repairPlayer(
              playerId,
              foodHealing(player.stats.maximumHealth, resource.stage),
              true,
            )
          : null;
        if (healing?.consumedAtFullHealth)
          this.#applyHealthGrowth(
            playerId,
            player.runtimeEffects.fullRepairPickup(),
          );
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
        if (
          resource.stage === STAGE_WEIGHT.length &&
          player.specializations.has('cheek-pouch-provider')
        ) {
          const affinity = Math.max(
            0,
            player.affinities.get('Gregarious') ?? 0,
          );
          const origin = player.craft.body.translation();
          for (const bot of this.#bots.values()) {
            const point = bot.craft.body.translation();
            if (Math.hypot(point.x - origin.x, point.z - origin.z) > 5)
              continue;
            if (bot.ownerId === playerId && bot.kind === 'charmed')
              bot.health = Math.min(bot.maxHealth, bot.health + affinity);
            else if (
              bot.kind === 'wild' &&
              this.#ownedCount(playerId, 'charmed') <
                this.#charmCapacity(playerId) &&
              this.#time >= bot.charmReadyAt
            )
              this.#attemptCharm(playerId, bot, 0.2);
          }
        }
        if (resource.stage === STAGE_WEIGHT.length)
          this.#resources.delete(resource.id);
        break;
      }
    }
  }

  #advanceThermal(deltaMs: number): DamageEvent[] {
    const events: DamageEvent[] = [];
    const weather = regionalWeather(this.#time, this.#worldClock.view());
    const seconds = deltaMs / 1000;
    for (const [id, player] of this.#players) {
      if (player.life.kind !== 'alive') continue;
      const point = player.craft.body.translation();
      const biome = terrainAt(this.#arena, point.x, point.z);
      const active = weather.find(
        (item) => item.biome === biome && item.state === 'active',
      );
      for (const kind of ['heat', 'cold'] as const) {
        const exposed =
          !player.shelter &&
          !player.statusImmunities.has(kind) &&
          (kind === 'heat'
            ? active?.kind === 'heatwave'
            : active?.kind === 'blizzard');
        const before = player.thermal[kind];
        if (!exposed || !active) {
          player.thermal[kind] = Math.max(
            0,
            before -
              THERMAL_RULES.recoveryPerSecond *
                seconds *
                (player.shelter ? 3 : 1),
          );
          continue;
        }
        const adaptation =
          kind === 'heat'
            ? player.stats.heatAdaptation
            : player.stats.coldAdaptation;
        const rate =
          (THERMAL_RULES.buildupPerSecond * active.intensity) /
          (1 + Math.max(0, adaptation) / 100);
        const safeSeconds = Math.max(0, (100 - before) / rate);
        player.thermal[kind] = Math.min(100, before + rate * seconds);
        const damagingSeconds = Math.max(0, seconds - safeSeconds);
        if (damagingSeconds > 0)
          events.push({
            targetId: id,
            ownerId: null,
            channel: 'environmental',
            amount:
              damagingSeconds *
              (kind === 'heat'
                ? THERMAL_RULES.heatDamagePerSecond
                : THERMAL_RULES.coldDamagePerSecond),
            depth: 0,
          });
      }
    }
    return events;
  }

  #grantPollinatorBonus(playerId: string, player: Player): void {
    const choices = [
      { affinity: 'Predator', stat: 'physical', amount: 2 },
      { affinity: 'Trickster', stat: 'ability', amount: 2 },
      { affinity: 'Imposing', stat: 'maximumHealth', amount: 10 },
      { affinity: 'Prey', stat: 'dodge', amount: 6 },
      { affinity: 'Gregarious', stat: 'social', amount: 2 },
    ] as const;
    const weights = choices.map(
      (choice) => 1 + Math.max(0, player.affinities.get(choice.affinity) ?? 0),
    );
    let roll = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);
    let selected: (typeof choices)[number] = choices[0];
    for (let i = 0; i < choices.length; i++) {
      roll -= weights[i] ?? 0;
      if (roll < 0) {
        selected = choices[i] ?? selected;
        break;
      }
    }
    const modifierId = `pollinator:${selected.stat}`;
    const previous = player.modifiers.find(
      (modifier) => modifier.id === modifierId,
    );
    this.setModifiers(playerId, [
      ...player.modifiers.filter((modifier) => modifier.id !== modifierId),
      {
        id: modifierId,
        stat: selected.stat,
        add: Math.min(999, (previous?.add ?? 0) + selected.amount),
        multiplier: 1,
      },
    ]);
  }

  #replenishResources(): void {
    if (this.#time < this.#nextResourceSpawn) return;
    this.#nextResourceSpawn = this.#time + 5_000;
    const radius = Math.max(
      0,
      boundaryRadius(this.#wallTime, this.#finale) - 1,
    );
    for (const player of this.#players.values()) {
      if (player.life.kind !== 'alive') continue;
      const origin = player.craft.body.translation();
      const sites = this.#arena.resources.filter(
        (point) => Math.hypot(point.x - origin.x, point.z - origin.z) < 24,
      );
      const existing = [...this.#resources.values()].filter(
        (food) =>
          food.killerKind === null &&
          food.storedBy === null &&
          Math.hypot(food.position.x - origin.x, food.position.z - origin.z) <
            24,
      ).length;
      let spawned = 0;
      for (
        let offset = 0;
        offset < sites.length &&
        spawned <
          Math.min(
            2,
            Math.min(
              20,
              Math.ceil(4 * (1 + player.pollinatorDiscoveries * 0.05)),
            ) - existing,
          );
        offset++
      ) {
        const point = sites[(this.#resourceSite + offset) % sites.length];
        if (
          !point ||
          (this.#providerSpawned.get(`${point.x},${point.z}`) ?? 0) >= 3 ||
          Math.hypot(point.x, point.z) > radius ||
          [...this.#resources.values()].some(
            (resource) =>
              Math.hypot(
                resource.position.x - point.x,
                resource.position.z - point.z,
              ) < 2,
          )
        )
          continue;
        this.#createResource({
          position: point,
          source:
            terrainAt(this.#arena, point.x, point.z) === 'water'
              ? 'aquatic'
              : 'vegetation',
          rarity: 'common',
          killerId: null,
          ownerId: null,
          killerKind: null,
          repair: false,
        });
        this.#providerSpawned.set(
          `${point.x},${point.z}`,
          (this.#providerSpawned.get(`${point.x},${point.z}`) ?? 0) + 1,
        );
        spawned++;
      }
    }
    this.#resourceSite++;
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
      const oldest = [...this.#resources.values()].find(
        (resource) => resource.storedBy === null,
      );
      if (!oldest) return null;
      this.#resources.delete(oldest.id);
    }
    const id = `resource-${++this.#resourceId}`;
    this.#resources.set(id, {
      ...input,
      position: { ...input.position },
      id,
      stage: 0,
      healingRoll: Math.random(),
      expiresAt: this.#time + 180000,
      collectors: new Map(),
      claimantRarities: new Map(),
      claimantRepair: new Map(),
      storedBy: null,
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
    if (
      !condition ||
      condition.length > 128 ||
      condition === 'day' ||
      condition === 'night'
    )
      return false;
    if (enabled) this.#worldConditions.add(condition);
    else this.#worldConditions.delete(condition);
    return true;
  }

  setPhaseDurationAdjustment(
    source: string,
    phase: LightPhase,
    milliseconds: number,
  ): boolean {
    return this.#worldClock.setAdjustment(source, phase, milliseconds);
  }

  #phaseStats(
    player: Player,
    phase: LightPhase,
    modifiers: readonly StatModifier[] = player.modifiers,
    level = player.health.level,
  ): Stats {
    const conditional = [...player.phaseModifiers.values()]
      .filter((entry) => entry.phase === phase)
      .flatMap((entry) => entry.modifiers);
    const allModifiers: StatModifier[] = [
      ...modifiers,
      ...conditional,
      ...player.runtimeEffects.temporaryModifiers(this.#time),
      ...player.runtimeEffects.finaleModifiers(
        this.#wallTime >= this.#finale.shrinkStartMs,
      ),
      ...(player.delayedBoost &&
      player.delayedBoost.startsAt <= this.#time &&
      player.delayedBoost.endsAt > this.#time
        ? [
            {
              id: 'active-delayed-boost',
              stat: 'physical' as const,
              add: player.delayedBoost.physical,
              multiplier: 1,
            },
            {
              id: 'active-delayed-boost',
              stat: 'ability' as const,
              add: player.delayedBoost.ability,
              multiplier: 1,
            },
          ]
        : []),
      ...(player.speedBoost && player.speedBoost.until > this.#time
        ? [
            {
              id: 'active-speed-boost',
              stat: 'speed' as const,
              add: 0,
              multiplier: player.speedBoost.multiplier,
            },
          ]
        : []),
    ];
    const base = deriveStats(allModifiers, level);
    const sizeHealth = player.runtimeEffects.sizeHealthModifiers(base.size);
    const stats = sizeHealth.length
      ? deriveStats([...allModifiers, ...sizeHealth], level)
      : base;
    if (player.specializations.has('fur-wool'))
      stats.heatAdaptation = Math.min(
        SOURCE_STAT_LIMITS.heatAdaptation[1],
        stats.heatAdaptation + stats.coldAdaptation,
      );
    if (phase === 'night' && player.specializations.has('snout-whiskers'))
      stats.speed *= 1 + Math.floor(stats.senses / 30) * 0.1;
    if (stats.shifty > 0) {
      const deficit = Math.max(0, 100 - stats.size);
      stats.dodge = Math.min(
        75,
        stats.dodge + deficit * SOURCE_ACTIONS.shifty._dodgeMultiplierPerLevel,
      );
      stats.damage += deficit * SOURCE_ACTIONS.shifty._damageMultiplierPerLevel;
    }
    if (stats.robust > 0)
      stats.maximumHealth = Math.min(
        999,
        stats.maximumHealth *
          (1 +
            Math.max(0, stats.size / 100 - 1) *
              SOURCE_ACTIONS.robust.sizeToHealth),
      );
    return stats;
  }

  #configurePedalGlands(
    player: Player,
    rank: number,
    rarity: string,
    specialization?: string,
  ): boolean {
    const definition = this.#content.definition('pedal-glands');
    const slow = definition?.values[rarity]?.[rank - 1];
    const cooldown = definition?.detailValues?.cooldown?.[rarity]?.[rank - 1];
    if (slow === undefined || cooldown === undefined) return false;
    const thick =
      specialization === 'pedal-glands-thick' ||
      player.specializations.has('pedal-glands-thick');
    const nemertide =
      specialization === 'pedal-glands-nemertide' ||
      player.specializations.has('pedal-glands-nemertide');
    return player.runtimeEffects.configure(
      {
        kind: 'slowing-trail',
        id: 'upgrade:pedal-glands',
        trigger: 'pursuit',
        intervalMs: 500,
        durationMs: 5000,
        radius: thick ? 2.25 : 1.5,
        slowPercent: slow,
        pursuitRange: 12,
        activationCooldownMs: cooldown * 1000,
        emissionMs: 5000,
        ...(nemertide
          ? {
              status: {
                kind: 'corrosion' as const,
                intervalMs: 1000,
                durationMs: 2000,
                radiusFraction: 1,
                magnitude: player.stats.ability * 0.275,
                slowMultiplier: 0,
              },
            }
          : {}),
      },
      this.#time,
    );
  }

  setPhaseStatModifiers(
    playerId: string,
    source: string,
    phase: LightPhase,
    modifiers: readonly StatModifier[],
  ): boolean {
    const player = this.#players.get(playerId);
    if (
      !player ||
      player.life.kind !== 'alive' ||
      !source ||
      source.length > 128 ||
      (phase !== 'day' && phase !== 'night') ||
      modifiers.length > 64 ||
      modifiers.some((modifier) => !modifier.id)
    )
      return false;
    const key = JSON.stringify([source, phase]);
    if (
      !player.phaseModifiers.has(key) &&
      modifiers.length &&
      player.phaseModifiers.size >= 256
    )
      return false;
    const previous = player.phaseModifiers.get(key);
    if (modifiers.length)
      player.phaseModifiers.set(key, {
        phase,
        modifiers: modifiers.map((modifier) => ({
          ...modifier,
          id: JSON.stringify(['phase', source, phase, modifier.id]),
        })),
      });
    else player.phaseModifiers.delete(key);
    let stats: Stats;
    try {
      this.#phaseStats(player, phase);
      stats = this.#phaseStats(player, this.#worldClock.view().phase);
    } catch {
      if (previous) player.phaseModifiers.set(key, previous);
      else player.phaseModifiers.delete(key);
      return false;
    }
    player.stats = stats;
    updateHealthStats(player.health, stats);
    this.grantProgress(playerId, 0);
    return true;
  }

  setModifiers(playerId: string, modifiers: readonly StatModifier[]): boolean {
    const player = this.#players.get(playerId);
    if (!player || player.life.kind !== 'alive') return false;
    this.#phaseStats(player, 'day', modifiers);
    this.#phaseStats(player, 'night', modifiers);
    const stats = this.#phaseStats(
      player,
      this.#worldClock.view().phase,
      modifiers,
    );
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
    id = definition?.id ?? id;
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
    const value = contentRankValue(definition, rarity, rank);
    if (value === undefined) return false;
    const details: Record<string, number> = {};
    for (const [name, tables] of Object.entries(
      definition.detailValues ?? {},
    )) {
      const detail = tables[rarity]?.[rank - 1];
      if (detail === undefined) return false;
      details[name] = detail;
    }
    const effect = upgradeEffect(
      id,
      definition.effect,
      rarity,
      rank,
      value,
      details,
    );
    if (!effect) return false;
    if (
      id === 'revenge' &&
      !player.runtimeEffects.configure(
        {
          kind: 'hurt-stacks',
          id: 'upgrade:revenge',
          maximum: value,
          fraction: (details.increase ?? 0) / 100,
          durationMs: 4000,
        },
        this.#time,
      )
    )
      return false;
    if (
      id === 'poisonous-spores' &&
      !player.runtimeEffects.configure(
        {
          kind: 'hurt-status-aura',
          id: 'upgrade:poisonous-spores',
          status: 'corrosion',
          magnitude: value,
          durationMs: 5000,
          range: 6,
          cooldownMs: 500,
        },
        this.#time,
      )
    )
      return false;
    if (
      id === 'pack' &&
      !player.runtimeEffects.configure(
        {
          kind: 'ally-damage',
          id: 'upgrade:pack',
          perCharmedAlly: value / 100,
          ownerBonus: true,
          allyBonus: true,
        },
        this.#time,
      )
    )
      return false;
    if (
      id === 'whining' &&
      !player.runtimeEffects.configure(
        {
          kind: 'charm-aura',
          id: 'upgrade:whining',
          trigger: 'hurt',
          intervalMs: 250,
          range: 6,
          chanceMultiplier: value,
        },
        this.#time,
      )
    )
      return false;
    if (
      id === 'pedal-glands' &&
      !this.#configurePedalGlands(player, rank, rarity)
    )
      return false;
    if (
      id === 'ambush' &&
      !player.runtimeEffects.configure(
        {
          kind: 'shelter-exit-boost',
          id: 'upgrade:ambush',
          damageMultiplier: 1 + value / 100,
          durationMs: 3000,
        },
        this.#time,
      )
    )
      return false;
    if (
      id === 'detachable-tail' &&
      !player.runtimeEffects.configure(
        {
          kind: 'decoy-on-hurt',
          id: 'upgrade:detachable-tail',
          durationMs: value * 1000,
          cooldownMs: (details.cooldown ?? 14) * 1000,
        },
        this.#time,
      )
    )
      return false;
    if (
      id === 'tail-wag' &&
      !player.runtimeEffects.configure(
        {
          kind: 'charm-aura',
          id: 'upgrade:tail-wag',
          trigger: 'interval',
          intervalMs: SOURCE_GAMEPLAY.tailWag.intervalMs,
          range: 6,
          chanceMultiplier: value,
        },
        this.#time,
      )
    )
      return false;
    if (
      id === 'ruminant' &&
      !player.runtimeEffects.configure(
        {
          kind: 'unharmed-progress',
          id: 'upgrade:ruminant',
          progressPerAffinitySecond: value / 10,
          pauseMs: 10_000,
          intervalMs: 10_000,
        },
        this.#time,
      )
    )
      return false;
    if (
      id === 'impervious' &&
      !player.runtimeEffects.configure(
        {
          kind: 'deferred-damage',
          id: 'upgrade:impervious',
          fraction: 0.5,
          delayMs: 1000,
        },
        this.#time,
      )
    )
      return false;
    if (
      id === 'hump' &&
      !player.runtimeEffects.configure(
        {
          kind: 'full-repair-growth',
          id: 'upgrade:hump',
          healthPerPickup: value,
        },
        this.#time,
      )
    )
      return false;
    if (
      id === 'fibroblasts' &&
      !player.runtimeEffects.configure(
        {
          kind: 'healing-growth',
          id: 'upgrade:fibroblasts',
          healingRequired: details.healingInterval ?? 50,
          healthPerThreshold: value,
        },
        this.#time,
      )
    )
      return false;
    const modifiers = player.modifiers.filter((m) => m.id !== `starter:${id}`);
    modifiers.push(...effect.modifiers);
    if (id === 'diurnal' || id === 'nocturnal') {
      const phase = id === 'diurnal' ? 'day' : 'night';
      player.phaseModifiers.set(`upgrade:${id}`, {
        phase,
        modifiers: [
          { id: `upgrade:${id}`, stat: 'damage', add: value, multiplier: 1 },
        ],
      });
      if (id === 'nocturnal')
        modifiers.push({
          id: 'starter:nocturnal',
          stat: 'senses',
          add: details.senses ?? 0,
          multiplier: 1,
        });
      const duration = (details.duration ?? 0) * 1000;
      this.#worldClock.setAdjustment(
        `upgrade:${playerId}:${id}`,
        phase,
        duration,
      );
      this.#worldClock.setAdjustment(
        `upgrade:${playerId}:${id}`,
        phase === 'day' ? 'night' : 'day',
        -duration,
      );
    }
    this.#phaseStats(player, 'day', modifiers);
    this.#phaseStats(player, 'night', modifiers);
    const stats = this.#phaseStats(
      player,
      this.#worldClock.view().phase,
      modifiers,
    );
    const ability = effect.ability;
    const oldPlating = player.stats.plating;
    player.modifiers = modifiers;
    player.stats = stats;
    updateHealthStats(player.health, stats);
    if (id === 'plated' || id === 'carapace' || id === 'exoskeleton')
      player.health.plating = Math.min(
        stats.plating,
        player.health.plating + Math.max(0, stats.plating - oldPlating),
      );
    if (ability) {
      if (
        id === 'stoner' &&
        ability.action === 'projectile' &&
        ability.ammunition &&
        player.specializations.has('cheek-pouch-storage')
      )
        ability.ammunition.capacity += 4;
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
    if (id === 'herbivore' || id === 'carnivore') {
      const reduced = id === 'herbivore' ? 'Predator' : 'Prey';
      player.affinities.set(reduced, (player.affinities.get(reduced) ?? 0) - 1);
    }
    if (id === 'vegan') {
      player.affinities.set(
        'Predator',
        (player.affinities.get('Predator') ?? 0) - 3,
      );
      for (const resource of this.#resources.values()) {
        if (resource.storedBy !== playerId || resource.source === 'vegetation')
          continue;
        resource.storedBy = null;
        const position = player.craft.body.translation();
        resource.position = { x: position.x, z: position.z };
        resource.expiresAt = this.#time + 180_000;
      }
    }
    if (id === 'alpha')
      player.affinities.set(
        'Gregarious',
        (player.affinities.get('Gregarious') ?? 0) + 1,
      );
    if (id === 'smol')
      player.affinities.set(
        'Imposing',
        (player.affinities.get('Imposing') ?? 0) - 2,
      );
    player.ranks.set(id, rank);
    player.rarities.set(id, rarity);
    if (id === 'convergent-evolution') {
      const names = ['Gregarious', 'Imposing', 'Predator', 'Prey', 'Trickster'];
      const highest = Math.max(
        ...names.map((name) => player.affinities.get(name) ?? 0),
      );
      const tied = names.filter(
        (name) => (player.affinities.get(name) ?? 0) === highest,
      );
      const selected = tied[randomInt(tied.length)];
      if (selected) player.affinities.set(selected, highest + value);
    }
    if (id === 'outlier') {
      const candidates = this.#content
        .eligible(
          player.ranks,
          player.specializations,
          'ordinary',
          this.#worldConditions,
        )
        .map((candidate) => this.#content.definition(candidate))
        .filter(
          (candidate): candidate is ContentDefinition =>
            !!candidate &&
            candidate.id !== 'outlier' &&
            candidate.rarities.includes('legendary'),
        );
      const weighted = candidates.map((candidate) => ({
        candidate,
        weight: candidate.rarities.length === 1 ? value : 1,
      }));
      let roll =
        Math.random() * weighted.reduce((sum, item) => sum + item.weight, 0);
      const selected = weighted.find(
        (item) => (roll -= item.weight) < 0,
      )?.candidate;
      if (selected)
        this.grantUpgrade(
          playerId,
          selected.id,
          'legendary',
          (player.ranks.get(selected.id) ?? 0) + 1,
        );
    }
    if (id === 'pollinator') {
      player.pollinatorSinceBonus = 0;
      this.#grantPollinatorBonus(playerId, player);
    }
    if (id === 'fungoid' && rank === 1)
      player.nextFungoidAt =
        this.#time +
        (value + Math.random() * ((details.maximum ?? value) - value)) * 1000;
    const choices = definition.specializations.some((id) =>
      player.specializations.has(id),
    )
      ? []
      : (definition.specializationChoices ?? []).filter(
          (choice) =>
            choice.triggerRank === rank &&
            this.#specializationAvailable(player, choice),
        );
    const first = choices[0];
    if (first) {
      const describe = (choice: (typeof choices)[number]) => {
        const effect = choice.effect;
        if (effect?.kind === 'grant-upgrade')
          return `Gain Arms and lose 1 speed.`;
        if (effect?.kind === 'near-obstacle-speed')
          return `Gain ${effect.bonusPerObstacle * 100}% speed per nearby obstacle, up to ${effect.maxBonus * 100}%. The bonus fades after leaving.`;
        if (effect?.kind === 'ability-damage')
          return `Stoner deals ${Math.round((effect.multiplier - 1) * 100)}% more damage.`;
        if (effect?.kind === 'lateral-dash')
          return `Scuttle moves sideways and its cooldown is reduced by ${Math.round((1 - effect.cooldownMultiplier) * 100)}%.`;
        if (effect?.kind === 'ability-feature')
          return {
            'jaws-neck-bite':
              'Jaws deals half damage; Jaws kills yield twice the salvage.',
            'jaws-stalker': 'Jaws deals 50% more damage at night.',
            'beak-sharp': 'Beak penetrates plating.',
            'beak-long':
              'Beak closes unoccupied shelters and releases salvage.',
            'stoner-training':
              'Stoner kills permanently grant 0.5 physical and ability.',
            'stoner-signal':
              'Stoner marks enemies for allies; charmed allies deal 50% more damage to marked targets.',
            'projectile-tongue-sticky':
              'Tongue pulls targets according to relative mass.',
            'projectile-tongue-whiplash':
              'Tongue travels faster and scales with salvage speed.',
            'leech-anaesthetic': 'Leech does not provoke its target.',
            'leech-vasodilators': 'Leech healing scales with salvage speed.',
            'spur-marking':
              'Spur tracks targets and doubles their charm chance.',
            'spur-primal': 'Spur gains 1% damage per saved currency.',
            'leap-bouncy': 'Leap a second time before the cooldown.',
            'leap-heavy': 'Leap damages nearby enemies on landing.',
            'cheek-pouch-provider':
              'Consumed salvage can charm nearby enemies and heal allied bots.',
            'cheek-pouch-storage': 'Stoner carries four additional stones.',
            'scales-basking':
              'On sand during the day, gain progress every eight seconds based on heat adaptation.',
            'scales-hard':
              'Contact hits stun the attacker, with duration based on active plating.',
            'fur-snow-dive':
              'Dashes on snow can spawn salvage. Leap doubles the chance.',
            'fur-wool': 'Cold adaptation also grants heat adaptation.',
            'spines-poisonous':
              'Contact attackers receive corrosion based on your ability.',
            'spines-detachable': 'Spines also retaliate when you dodge.',
            'turtle-down-reinforced': 'Stuns you inflict last twice as long.',
            'turtle-down-spiked': 'Spines deal double damage while guarding.',
            'fungoid-cordyceps': 'Poison ticks can charm animals.',
            'fungoid-ejection': 'Taking damage hastens firmware generation.',
            'virulent-neurotoxin': 'Poison ticks 50% faster.',
            'virulent-metabolisation': 'Poison ticks advance regeneration.',
            'pedal-glands-thick': 'Slime trails cover a wider area.',
            'pedal-glands-nemertide': 'Slime trails inflict corrosion.',
            'spinnerets-trap': 'The center of each web stuns enemies.',
            'spinnerets-egg-sac': 'Webs hatch an ally after expiring.',
            'snout-whiskers': 'At night, gain 10% speed for every 30 senses.',
            'snout-toxic-sequestration':
              'Each poisonous firmware consumed adds 10% poison damage.',
          }[effect.feature];
        if (effect?.kind === 'healing-growth')
          return `Gain ${effect.healthPerThreshold} maximum hull per ${effect.healingRequired} hull actually repaired.`;
        if (effect?.kind === 'shelter-progress')
          return `Gain ${effect.progressPerSecond} progress per second in shelter.`;
        if (effect?.kind === 'shelter-entry-progress')
          return `Gain ${effect.progress} progress when entering shelter.`;
        if (effect?.kind === 'periodic-strike')
          return `Every ${effect.intervalMs / 1000} seconds, hit a visible target within ${effect.range} units for ${effect.damage} damage.`;
        if (effect?.kind === 'full-repair-growth')
          return `Gain ${effect.healthPerPickup} maximum hull when collecting repair salvage at full hull.`;
        if (effect?.kind === 'shelter-exit-boost')
          return `After leaving shelter, damage is multiplied by ${effect.damageMultiplier} for ${effect.durationMs / 1000} seconds.`;
        if (effect?.kind === 'plating-hit')
          return `Hits deal extra damage equal to ${effect.factor * 100}% of current plating.`;
        if (effect?.kind === 'contact-reflection')
          return `Return ${effect.fraction * 100}% of contact damage to the attacker.`;
        if (effect?.kind === 'hit-self-damage')
          return `Manual hits${effect.abilityId ? ` from ${effect.abilityId}` : ''} cause up to ${effect.amount} self-damage, capped at ${effect.maxHealthFraction * 100}% of maximum hull.`;
        if (effect?.kind === 'hit-repair')
          return `Repair hull equal to ${effect.fraction * 100}% of damage dealt by ${effect.abilityId ? `${effect.abilityId} attacks` : 'manual attacks'}.`;
        if (effect?.kind === 'hit-charm')
          return `Manual hits${effect.abilityId ? ` from ${effect.abilityId}` : ''} have a ${effect.chance * 100}% chance to charm their target.`;
        if (effect?.kind === 'hit-mark')
          return `${effect.abilityId} hits mark the target for ${effect.durationMs / 1000} seconds. Allies deal ${effect.allyMultiplier} times damage to it.`;
        if (effect?.kind === 'stunned-hit-bonus')
          return `Manual hits${effect.abilityId ? ` from ${effect.abilityId}` : ''} deal ${effect.multiplier} times damage to stunned targets.`;
        if (effect?.kind === 'hit-cooldown')
          return `Manual hits reduce ${effect.targetAbilityId} cooldown by ${effect.reductionMs / 1000} seconds.`;
        if (effect?.kind === 'hit-status')
          return `Manual hits${effect.abilityId ? ` from ${effect.abilityId}` : ''} apply ${effect.status} for ${effect.durationMs / 1000} seconds.`;
        if (effect?.kind === 'attack-followup')
          return `A manual attack that reaches a surviving target triggers a ${effect.damage} damage follow-up${effect.damagePerCurrency ? ` plus ${effect.damagePerCurrency} per saved currency` : ''}. Cooldown ${effect.cooldownMs / 1000} seconds.`;
        if (effect?.kind === 'charm-aura')
          return `Attempt to charm a nearby enemy ${effect.trigger === 'hurt' ? 'after taking damage' : effect.trigger === 'attack' ? 'after a successful attack' : 'periodically'}, within ${effect.range} units.`;
        if (effect?.kind === 'hurt-status-aura')
          return `After taking damage, apply ${effect.status} to nearby enemies for ${effect.durationMs / 1000} seconds.`;
        if (effect?.kind === 'periodic-resource')
          return `Generate ${effect.repair ? 'repair' : 'vegetation'} salvage every ${effect.intervalMs / 1000} seconds.`;
        if (effect?.kind === 'unharmed-progress')
          return `Gain ${effect.progressPerAffinitySecond} progress per second per Prey affinity; pauses for ${effect.pauseMs / 1000} seconds after a hit.`;
        if (effect?.kind === 'ally-damage')
          return `Gain ${effect.perCharmedAlly * 100}% attack damage per charmed ally for ${effect.ownerBonus && effect.allyBonus ? 'you and your allies' : effect.ownerBonus ? 'your attacks' : 'allied attacks'}.`;
        if (effect?.kind === 'ally-resistance')
          return `Gain ${effect.perCharmedAlly} damage resistance per charmed ally${effect.finaleOnly ? ' during the finale' : ''}.`;
        if (effect?.kind === 'ally-flat-damage')
          return `Allied attacks deal ${effect.multiplier} times damage${effect.finaleOnly ? ' during the finale' : ''}.`;
        if (effect?.kind === 'size-health')
          return `Gain ${effect.healthPer100Size} maximum hull per 100 size.`;
        if (effect?.kind === 'finale-stat')
          return `Gain ${effect.add} ${effect.stat} during the finale.`;
        if (effect?.kind === 'decoy-on-hurt')
          return `After damage or a dodge, deploy a decoy for ${effect.durationMs / 1000} seconds. Cooldown ${effect.cooldownMs / 1000} seconds.`;
        if (effect?.kind === 'discovery-progress')
          return `Gain ${effect.progress} progress for each new discovery.`;
        if (effect?.kind === 'progress-storage')
          return `Store ${effect.fraction * 100}% of collected progress, up to ${effect.capacity}, and consume ${effect.progressPerSecond} per second while active.`;
        if (effect?.kind === 'discovery-bonus')
          return `Each new discovery grants ${effect.amount} to a random stat${effect.vegetation ? ' and generates vegetation salvage' : ''}.`;
        if (effect?.kind === 'deferred-damage')
          return `Delay ${effect.fraction * 100}% of incoming damage for ${effect.delayMs / 1000} seconds.`;
        if (effect?.kind === 'hurt-boost')
          return `After taking a hit, gain ${effect.physical} physical and ${effect.ability} ability for ${effect.durationMs / 1000} seconds.`;
        if (effect?.kind === 'slowing-trail')
          return `Leave a slowing trail ${effect.trigger === 'pursuit' ? 'while pursued' : 'while moving'} (${effect.slowPercent}% slow).`;
        if (effect?.kind === 'kill-growth')
          return `Gain ${effect.perKill} ${effect.stat} for each credited elimination.`;
        return effect?.kind === 'stats'
          ? effect.changes
              .map(({ stat, add, multiplier }) => {
                const name = stat.replace(/([A-Z])/g, ' $1').toLowerCase();
                const parts = [
                  ...(add === 0 ? [] : [`${add > 0 ? '+' : ''}${add} ${name}`]),
                  ...(multiplier === 1 ? [] : [`${multiplier}× ${name}`]),
                ];
                return parts.join(', ');
              })
              .join('; ')
          : undefined;
      };
      player.selection.enqueue(
        {
          kind: 'specialization',
          id: `choice-${++this.#promptId}`,
          revision: 0,
          parentId: id,
          options: [
            {
              id: first.id,
              label: first.carcinisationBonus
                ? `${first.name} (+${first.carcinisationBonus} Carcinisation)`
                : first.name,
              description: describe(first),
            },
            ...choices.slice(1).map((choice) => ({
              id: choice.id,
              label: choice.carcinisationBonus
                ? `${choice.name} (+${choice.carcinisationBonus} Carcinisation)`
                : choice.name,
              description: describe(choice),
            })),
            { id: 'skip', label: 'Skip specialization (+10 currency)' },
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
    waterDepth: 0 | 1 | 2 = 1,
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
      player.stats.terrainAdaptation +
        (this.#trails.some(
          (trail) =>
            trail.kind === 'pedal' &&
            trail.ownerId === playerId &&
            trail.until > this.#time &&
            Math.hypot(
              trail.position.x - player.craft.body.translation().x,
              trail.position.z - player.craft.body.translation().z,
            ) <= trail.radius,
        )
          ? (this.#content.definition('pedal-glands')?.detailValues
              ?.adaptation?.[player.rarities.get('pedal-glands') ?? '']?.[
              (player.ranks.get('pedal-glands') ?? 0) - 1
            ] ?? 0)
          : 0),
      specific,
      waterDepth,
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
    this.#phaseStats(player, 'day', player.modifiers, level);
    this.#phaseStats(player, 'night', player.modifiers, level);
    const stats = this.#phaseStats(
      player,
      this.#worldClock.view().phase,
      player.modifiers,
      level,
    );
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

  #statusIsActive(status: Status): boolean {
    if (!status.ownerId) return true;
    if (!this.#players.has(status.ownerId) && !this.#bots.has(status.ownerId))
      return false;
    return this.canUseOwnedOffense(status.ownerId);
  }

  #hasActiveStatus(statuses: readonly Status[], kind: StatusKind): boolean {
    return statuses.some(
      (status) => status.kind === kind && this.#statusIsActive(status),
    );
  }

  canUseOwnedOffense(ownerId: string): boolean {
    const owner = this.#players.get(
      this.#bots.get(ownerId)?.ownerId ?? ownerId,
    );
    return (
      !owner ||
      (owner.connected &&
        owner.life.kind === 'alive' &&
        owner.life.activity !== 'selecting' &&
        owner.shelter === null)
    );
  }

  #queueAttackFollowups(
    event: DamageEvent,
    queue: DamageEvent[],
    limit: number,
  ): void {
    if (
      event.origin !== 'manual' ||
      event.depth !== 0 ||
      !event.ownerId ||
      !this.canUseOwnedOffense(event.ownerId)
    )
      return;
    const owner = this.#players.get(event.ownerId);
    if (!owner) return;
    for (const amount of owner.runtimeEffects.attackFollowups(
      this.#time,
      Math.max(0, limit - queue.length),
      owner.wallet.balance,
    ))
      queue.push({
        targetId: event.targetId,
        ownerId: event.ownerId,
        channel: 'direct',
        amount,
        depth: event.depth + 1,
      });
  }

  #triggerSpur(
    ownerId: string,
    player: Player,
    attacks: DamageEvent[],
    triggeringAbility: string,
  ): void {
    if (
      triggeringAbility === 'spur' ||
      ![
        player.equipment.slots.primary,
        player.equipment.slots.secondary,
      ].includes('spur')
    )
      return;
    const rank = player.ranks.get('spur');
    const rarity = player.rarities.get('spur');
    const learned = player.equipment.learned.get('spur');
    const value = rank && rarity && learned && rollAbilityDamage(learned);
    if (!value) return;
    const origin = player.craft.body.translation();
    const hit = this.#world.castRay(
      new RAPIER.Ray(origin, {
        x: Math.sin(player.aim),
        y: 0,
        z: Math.cos(player.aim),
      }),
      1.5 * Math.min(4, player.stats.attackArea / 100) +
        player.craft.collider.radius(),
      true,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
      undefined,
      player.craft.collider,
    );
    const target = hit && this.#combatantAtCollider(hit.collider.handle);
    if (!target || target === ownerId) return;
    attacks.push({
      targetId: target,
      ownerId,
      channel: 'contact',
      abilityId: 'spur',
      amount:
        ((value * player.stats.physical * player.stats.damage) / 100) *
        (player.specializations.has('spur-primal')
          ? 1 + player.wallet.balance / 100
          : 1),
      depth: 1,
    });
  }

  #manualHitBenefits(
    event: DamageEvent,
    actual: number,
    queue: DamageEvent[],
    capacity: number,
  ): void {
    if (
      event.origin !== 'manual' ||
      !event.ownerId ||
      event.ownerId === event.targetId ||
      actual <= 0
    )
      return;
    const owner = this.#players.get(event.ownerId);
    if (!owner || owner.health.hull <= 0) return;
    owner.runtimeEffects.markHit(event.abilityId, event.targetId, this.#time);
    if (event.abilityId === 'leech') {
      const rank = owner.ranks.get('leech') ?? 0;
      const rarity = owner.rarities.get('leech') ?? '';
      const drain =
        this.#content.definition('leech')?.detailValues?.drain?.[rarity]?.[
          rank - 1
        ] ?? 0;
      this.repairPlayer(
        event.ownerId,
        ((actual * drain) / 100) *
          (owner.specializations.has('leech-vasodilators')
            ? owner.stats.salvageSpeed / 100
            : 1),
        false,
      );
    }
    if (event.abilityId === 'projectile-tongue') {
      const rarity = owner.rarities.get('projectile-tongue') ?? '';
      const rank = owner.ranks.get('projectile-tongue') ?? 1;
      const stun =
        this.#content.definition('projectile-tongue')?.detailValues?.stun?.[
          rarity
        ]?.[rank - 1] ?? 2;
      this.applyStatus(event.targetId, {
        kind: 'stun',
        ownerId: event.ownerId,
        magnitude: 0,
        duration: stun * 1000,
      });
      if (owner.specializations.has('projectile-tongue-sticky'))
        this.startPull(event.ownerId, event.targetId, 1000, 12);
    }
    if (event.abilityId === 'stinger') {
      const rank = owner.ranks.get('stinger') ?? 0;
      const rarity = owner.rarities.get('stinger') ?? '';
      const poison =
        this.#content.definition('stinger')?.detailValues?.poison?.[rarity]?.[
          rank - 1
        ] ?? 0;
      if (poison > 0)
        this.applyStatus(event.targetId, {
          kind: 'corrosion',
          ownerId: event.ownerId,
          magnitude: poison * owner.stats.ability,
          duration: 5000,
        });
    }
    if (
      event.abilityId === 'stoner' &&
      owner.specializations.has('stoner-signal')
    ) {
      const tracked =
        this.#signalTargets.get(event.ownerId) ?? new Set<string>();
      tracked.add(event.targetId);
      this.#signalTargets.set(event.ownerId, tracked);
      this.markAllyTarget(event.ownerId, event.targetId);
    }
    this.#charmAura(event.ownerId, 'attack', this.#time);
    const selfDamage =
      owner.runtimeEffects.hitSelfDamage(
        event.abilityId,
        owner.stats.maximumHealth,
      ) +
      (() => {
        const ability =
          event.abilityId && owner.equipment.learned.get(event.abilityId);
        return ability &&
          'selfDamageFraction' in ability &&
          ability.selfDamageFraction !== undefined
          ? Math.min(
              actual * ability.selfDamageFraction,
              owner.stats.maximumHealth * 0.9,
            )
          : 0;
      })();
    if (
      selfDamage > 0 &&
      event.depth < MAX_CAUSAL_DEPTH &&
      queue.length < capacity
    )
      queue.push({
        targetId: event.ownerId,
        ownerId: event.ownerId,
        channel: 'self',
        amount: selfDamage,
        depth: event.depth + 1,
      });
    const bot = this.#bots.get(event.targetId);
    if (
      bot &&
      bot.health > 0 &&
      (bot.kind === 'wild' || bot.kind === 'charmed') &&
      bot.ownerId !== event.ownerId &&
      this.#time >= bot.charmReadyAt
    ) {
      const chances = owner.runtimeEffects.hitCharmChances(event.abilityId);
      const ability =
        event.abilityId && owner.equipment.learned.get(event.abilityId);
      if (
        ability &&
        'charmMultiplier' in ability &&
        ability.charmMultiplier !== undefined
      )
        chances.push(
          Math.min(
            1,
            Math.max(0.05, owner.stats.social / 10) * ability.charmMultiplier,
          ),
        );
      const reserved = [...this.#nestDefenses.values()].filter(
        (item) => item.ownerId === event.ownerId,
      ).length;
      if (
        chances.length &&
        this.#ownedCount(event.ownerId, 'charmed') + reserved <
          this.#charmCapacity(event.ownerId)
      )
        this.#attemptCharm(event.ownerId, bot, Math.max(...chances));
    }
    for (const change of owner.runtimeEffects.hitCooldowns(event.abilityId)) {
      const ready = owner.equipment.readyAt.get(change.targetAbilityId);
      if (ready !== undefined)
        owner.equipment.readyAt.set(
          change.targetAbilityId,
          Math.max(this.#time, ready - change.reductionMs),
        );
    }
    const amount = owner.runtimeEffects.hitRepair(actual, event.abilityId);
    if (amount > 0) this.repairPlayer(event.ownerId, amount, false);
  }

  #statusFromManualHit(event: DamageEvent, actual: number): void {
    if (
      event.origin !== 'manual' ||
      !event.ownerId ||
      event.ownerId === event.targetId ||
      actual <= 0
    )
      return;
    const owner = this.#players.get(event.ownerId);
    if (!owner) return;
    if (
      event.abilityId &&
      ['jaws', 'beak', 'leech', 'spit', 'projectile-tongue'].includes(
        event.abilityId,
      )
    ) {
      const rank = owner.ranks.get('poisonous-saliva') ?? 0;
      const rarity = owner.rarities.get('poisonous-saliva') ?? '';
      const value =
        this.#content.definition('poisonous-saliva')?.values[rarity]?.[
          rank - 1
        ];
      if (value !== undefined)
        this.applyStatus(event.targetId, {
          kind: 'corrosion',
          ownerId: event.ownerId,
          magnitude: value * owner.stats.ability,
          duration: 5000,
        });
    }
    for (const effect of owner.runtimeEffects.hitStatuses(event.abilityId))
      this.applyStatus(event.targetId, {
        kind: effect.status,
        ownerId: event.ownerId,
        magnitude: effect.magnitude,
        duration: effect.durationMs,
      });
  }

  damageBatch(events: readonly DamageEvent[]) {
    const deaths = new Map<string, string | null>();
    const deferredCredits = new Map<
      string,
      NonNullable<DamageEvent['credit']>
    >();
    const botDeaths = new Map<string, string | null>();
    const killingBlows = new Map<string, DamageEvent>();
    const queue = [...events];
    const results: ReturnType<typeof applyDamage>[] = [];
    for (
      let index = 0;
      index < queue.length && index < events.length + 512;
      index++
    ) {
      const queued = queue[index];
      if (!queued) continue;
      if (
        !Number.isFinite(queued.amount) ||
        queued.amount < 0 ||
        !Number.isSafeInteger(queued.depth) ||
        queued.depth < 0 ||
        (queued.vulnerability !== undefined &&
          (!Number.isFinite(queued.vulnerability) || queued.vulnerability < 0))
      )
        throw new Error('Invalid damage amount');
      const attackingPlayer =
        queued.ownerId && this.#players.get(queued.ownerId);
      const bonus =
        attackingPlayer &&
        queued.ownerId !== queued.targetId &&
        queued.amount > 0 &&
        queued.depth === 0 &&
        (queued.channel === 'direct' || queued.channel === 'contact')
          ? attackingPlayer.runtimeEffects.platingDamage(
              attackingPlayer.health.plating,
            ) +
            attackingPlayer.stats.platingHitFactor *
              attackingPlayer.health.plating +
            (queued.channel === 'contact' &&
            attackingPlayer.contactBoost &&
            attackingPlayer.contactBoost.until > this.#time
              ? Math.max(0, attackingPlayer.affinities.get('Predator') ?? 0) *
                attackingPlayer.contactBoost.perAffinity
              : 0)
          : 0;
      const attackingAlly = queued.ownerId
        ? this.#bots.get(queued.ownerId)
        : undefined;
      const sourceOwnerId = attackingAlly?.ownerId ?? queued.ownerId;
      const sourceOwner = sourceOwnerId
        ? this.#players.get(sourceOwnerId)
        : undefined;
      const multiplier =
        sourceOwner &&
        sourceOwnerId &&
        queued.depth === 0 &&
        queued.ownerId !== queued.targetId &&
        (queued.channel === 'direct' || queued.channel === 'contact')
          ? sourceOwner.runtimeEffects.allyDamageMultiplier(
              this.#ownedCount(sourceOwnerId, 'charmed'),
              !!attackingAlly,
              this.#wallTime >= this.#finale.shrinkStartMs,
            ) *
            (attackingAlly
              ? (attackingAlly.kind === 'charmed'
                  ? 1 + (sourceOwner.ranks.get('commanding') ?? 0) * 0.05
                  : 1) *
                (attackingAlly.kind === 'charmed' &&
                sourceOwner.specializations.has('stoner-signal') &&
                this.#signalTargets.get(sourceOwnerId)?.has(queued.targetId)
                  ? 1.5
                  : 1) *
                sourceOwner.runtimeEffects.markedAllyMultiplier(
                  queued.targetId,
                  this.#time,
                )
              : 1)
          : 1;
      const targetStatuses =
        this.#players.get(queued.targetId)?.statuses ??
        this.#bots.get(queued.targetId)?.statuses;
      const stunMultiplier =
        queued.origin === 'manual' &&
        attackingPlayer &&
        targetStatuses &&
        this.#hasActiveStatus(targetStatuses, 'stun')
          ? (queued.abilityId === 'jaws' ? 2 : 1) *
            attackingPlayer.runtimeEffects.stunnedHitMultiplier(
              queued.abilityId,
            )
          : 1;
      const targetPoint = (
        this.#players.get(queued.targetId)?.craft ??
        this.#bots.get(queued.targetId)?.craft
      )?.body.translation();
      const webMultiplier =
        targetPoint &&
        targetStatuses &&
        this.#hasActiveStatus(targetStatuses, 'stun') &&
        this.#trails.some(
          (trail) =>
            trail.kind === 'web' &&
            trail.ownerId !== queued.targetId &&
            this.canUseOwnedOffense(trail.ownerId) &&
            Math.hypot(
              targetPoint.x - trail.position.x,
              targetPoint.z - trail.position.z,
            ) <= trail.radius,
        )
          ? 1.5
          : 1;
      const poisonMultiplier =
        queued.channel === 'corrosion' &&
        targetPoint &&
        this.#trails.some(
          (trail) =>
            trail.kind === 'pedal' &&
            trail.ownerId !== queued.targetId &&
            this.#players
              .get(trail.ownerId)
              ?.specializations.has('pedal-glands-nemertide') &&
            this.canUseOwnedOffense(trail.ownerId) &&
            Math.hypot(
              targetPoint.x - trail.position.x,
              targetPoint.z - trail.position.z,
            ) <= trail.radius,
        )
          ? 1 + this.#trailSlow(queued.targetId, targetPoint) * 0.5
          : 1;
      const event =
        bonus ||
        multiplier !== 1 ||
        stunMultiplier !== 1 ||
        webMultiplier !== 1 ||
        poisonMultiplier !== 1
          ? {
              ...queued,
              amount:
                (queued.amount + bonus) *
                multiplier *
                stunMultiplier *
                webMultiplier *
                poisonMultiplier,
            }
          : queued;
      if (
        event.channel !== 'deferred' &&
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
        event.channel !== 'deferred' &&
        event.ownerId &&
        this.#players.has(event.ownerId) &&
        event.ownerId !== event.targetId &&
        event.amount > 0
      )
        this.markAllyTarget(event.ownerId, event.targetId);
      const attackingBot = event.ownerId
        ? this.#bots.get(event.ownerId)
        : undefined;
      if (
        (attackingBot?.ownerId &&
          (attackingBot.ownerId === event.targetId ||
            attackingBot.ownerId === bot?.ownerId)) ||
        (bot?.ownerId && bot.ownerId === event.ownerId)
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
      if (
        this.#phase === 'running' &&
        bot &&
        bot.health > 0 &&
        event.depth >= 0 &&
        event.depth <= MAX_CAUSAL_DEPTH
      ) {
        if (
          !Number.isFinite(event.amount) ||
          event.amount < 0 ||
          (event.vulnerability !== undefined &&
            (!Number.isFinite(event.vulnerability) || event.vulnerability < 0))
        )
          throw new Error('Invalid damage amount');
        const health = { hull: bot.health, plating: bot.plating, level: 1 };
        const owner =
          bot.kind === 'charmed' && bot.ownerId
            ? this.#players.get(bot.ownerId)
            : undefined;
        const meteorBonus =
          owner && bot.ownerId
            ? (owner.ranks.get('strength-in-numbers') ?? 0) *
              this.#ownedCount(bot.ownerId, 'charmed')
            : 0;
        const result = applyDamage(
          health,
          {
            ...BASE_STATS,
            cataclysmResistance: Math.min(
              100,
              BASE_STATS.cataclysmResistance + meteorBonus,
            ),
          },
          event,
          false,
          1,
        );
        const hull = result.hull;
        const actual = hull + result.plating;
        bot.health = health.hull;
        bot.plating = health.plating;
        const attacker = event.ownerId && this.#players.get(event.ownerId);
        if (
          actual > 0 &&
          bot.health > 0 &&
          bot.kind === 'wild' &&
          event.origin === 'manual' &&
          attacker &&
          event.ownerId &&
          !(
            event.abilityId === 'leech' &&
            attacker.specializations.has('leech-anaesthetic')
          )
        )
          this.#provoked.set(bot.id, {
            ownerId: event.ownerId,
            until: this.#time + 5000,
          });
        if (event.ownerId) {
          const credited = this.#killCredit(event.ownerId).ownerId;
          const owner = credited && this.#players.get(credited);
          if (owner && credited !== event.targetId)
            owner.matchStats.damageDealt += actual;
        }
        if (
          actual > 0 &&
          event.abilityId === 'spur' &&
          event.ownerId &&
          this.#players.get(event.ownerId)?.specializations.has('spur-marking')
        ) {
          const tracked =
            this.#signalTargets.get(event.ownerId) ?? new Set<string>();
          tracked.add(event.targetId);
          this.#signalTargets.set(event.ownerId, tracked);
        }
        this.#manualHitBenefits(event, actual, queue, events.length + 512);
        if (bot.health > 0) this.#statusFromManualHit(event, actual);
        if (actual > 0 && event.channel === 'corrosion' && event.ownerId) {
          const owner = this.#players.get(event.ownerId);
          if (owner && this.canUseOwnedOffense(event.ownerId)) {
            if (owner.specializations.has('virulent-metabolisation'))
              this.repairPlayer(
                event.ownerId,
                owner.stats.regeneration * 0.005,
                false,
              );
            const reserved = [...this.#nestDefenses.values()].filter(
              (item) => item.ownerId === event.ownerId,
            ).length;
            if (
              bot.health > 0 &&
              bot.ownerId !== event.ownerId &&
              (bot.kind === 'wild' || bot.kind === 'charmed') &&
              owner.specializations.has('fungoid-cordyceps') &&
              this.#ownedCount(event.ownerId, 'charmed') + reserved <
                this.#charmCapacity(event.ownerId)
            )
              this.#attemptCharm(
                event.ownerId,
                bot,
                this.#evolutionCharmChance(owner) * 0.4,
              );
          }
        }
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
        if (bot.health === 0 && !botDeaths.has(bot.id)) {
          botDeaths.set(bot.id, event.ownerId);
          killingBlows.set(bot.id, event);
        }
        if (bot.health > 0)
          this.#queueAttackFollowups(event, queue, events.length + 512);
        if (index < events.length) results.push(result);
        continue;
      }
      if (
        this.#phase !== 'running' ||
        !player ||
        player.life.kind !== 'alive' ||
        event.depth > MAX_CAUSAL_DEPTH ||
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
      const guard =
        player.guard && player.guard.until > this.#time ? player.guard : null;
      const platingBeforeHit = player.health.plating;
      const delay = player.runtimeEffects.damageDelay();
      const result = applyDamage(
        player.health,
        this.#effectiveStats(event.targetId, player),
        {
          ...event,
          amount:
            event.channel === 'boundary' || event.channel === 'deferred'
              ? event.amount
              : event.amount *
                (guard?.damageFactor ?? 1) *
                [...player.temporaryPoi.values()].reduce(
                  (factor, item) =>
                    factor * (item.until > this.#time ? item.factor : 1),
                  1,
                ),
          vulnerability:
            (event.vulnerability ?? 1) *
            ((event.channel === 'direct' ||
              event.channel === 'contact' ||
              event.channel === 'corrosion') &&
            event.ownerId !== event.targetId
              ? 1 + carcinisationDamage(player.carcinisation)
              : 1),
        },
        isSelectionProtected(player) ||
          player.shelter !== null ||
          (guard !== null && guard.damageFactor === undefined) ||
          player.invulnerableUntil > this.#time,
        Math.random(),
        delay && event.channel !== 'deferred'
          ? {
              fraction: delay.fraction,
              schedule: (amount, bypassPlating) => {
                if (player.deferredDamage.length >= 256) return false;
                player.deferredDamage.push({
                  at: this.#time + delay.delayMs,
                  event: {
                    targetId: event.targetId,
                    ownerId: event.ownerId,
                    credit: event.credit ?? this.#killCredit(event.ownerId),
                    channel: 'deferred',
                    amount,
                    depth: event.depth,
                    bypassPlating,
                  },
                });
                return true;
              },
            }
          : undefined,
      );
      if (
        player.specializations.has('scales-hard') &&
        event.channel === 'contact' &&
        event.ownerId &&
        event.ownerId !== event.targetId &&
        result.hull + result.plating > 0
      )
        this.applyStatus(event.ownerId, {
          kind: 'stun',
          ownerId: event.targetId,
          magnitude: 0,
          duration: Math.min(300_000, 500 * (1 + platingBeforeHit * 0.05)),
        });
      if (
        guard &&
        guard.stunMs > 0 &&
        (guard.parryUntil === undefined || this.#time <= guard.parryUntil) &&
        (guard.damageFactor === undefined ||
          (!result.dodged &&
            !isSelectionProtected(player) &&
            !player.shelter &&
            player.invulnerableUntil <= this.#time)) &&
        event.channel === 'contact' &&
        event.amount > 0 &&
        event.ownerId &&
        event.ownerId !== event.targetId &&
        this.canUseOwnedOffense(event.targetId)
      )
        this.applyStatus(event.ownerId, {
          kind: 'stun',
          ownerId: event.targetId,
          magnitude: 0,
          duration: guard.stunMs,
        });
      if (
        result.hull + result.plating > 0 &&
        event.abilityId === 'spur' &&
        event.ownerId &&
        this.#players.get(event.ownerId)?.specializations.has('spur-marking')
      ) {
        const tracked =
          this.#signalTargets.get(event.ownerId) ?? new Set<string>();
        tracked.add(event.targetId);
        this.#signalTargets.set(event.ownerId, tracked);
      }
      this.#manualHitBenefits(
        event,
        result.hull + result.plating,
        queue,
        events.length + 512,
      );
      if (player.health.hull > 0)
        this.#statusFromManualHit(event, result.hull + result.plating);
      if (
        result.hull + result.plating > 0 &&
        event.channel === 'corrosion' &&
        event.ownerId &&
        event.ownerId !== event.targetId
      ) {
        const owner = this.#players.get(event.ownerId);
        if (
          owner?.specializations.has('virulent-metabolisation') &&
          this.canUseOwnedOffense(event.ownerId)
        )
          this.repairPlayer(
            event.ownerId,
            owner.stats.regeneration * 0.005,
            false,
          );
      }
      player.matchStats.damageTaken += result.hull + result.plating;
      if (
        result.hull + result.plating > 0 &&
        event.ownerId !== event.targetId &&
        (event.channel === 'direct' || event.channel === 'contact') &&
        player.ranks.has('lick-wounds')
      ) {
        const ready = player.equipment.readyAt.get('lick-wounds') ?? this.#time;
        const fraction = sourceCurve(
          [
            { time: 0, value: 0, inSlope: 0, outSlope: 0 },
            { time: 1, value: 0.1, inSlope: 0.1, outSlope: 0.45 },
            { time: 3, value: 1, inSlope: 0.45, outSlope: 0.5 },
          ],
          player.stats.salvageSpeed / 100,
        );
        player.equipment.readyAt.set(
          'lick-wounds',
          Math.max(this.#time, ready - (1 + 4 * fraction) * 1000),
        );
      }
      if (player.moulting) {
        player.moulting.damage += result.hull + result.plating;
        if (
          player.moulting.damage >= player.stats.maximumHealth * 0.3 ||
          player.health.hull <= player.stats.maximumHealth * 0.1
        )
          player.moulting = null;
      }
      if (result.hull + result.plating > 0)
        player.hitCueUntil = this.#time + 200;
      if (result.hull + result.plating > 0)
        player.runtimeEffects.interruptProgress(this.#time);
      if (
        player.health.hull > 0 &&
        result.hull + result.plating > 0 &&
        event.ownerId !== event.targetId &&
        (event.channel === 'direct' || event.channel === 'contact') &&
        player.runtimeEffects.hurt(this.#time)
      )
        this.setModifiers(event.targetId, player.modifiers);
      if (
        player.health.hull > 0 &&
        result.hull + result.plating > 0 &&
        event.ownerId !== event.targetId &&
        (event.channel === 'direct' || event.channel === 'contact')
      ) {
        this.#charmAura(event.targetId, 'hurt', this.#time);
        this.#hurtStatusAura(event.targetId);
        if (player.specializations.has('fungoid-ejection'))
          player.nextFungoidAt = Math.max(
            this.#time,
            player.nextFungoidAt - 5000,
          );
      }
      if (event.ownerId && event.ownerId !== event.targetId) {
        const credited = event.credit
          ? event.credit.ownerId
          : this.#killCredit(event.ownerId).ownerId;
        const owner = credited && this.#players.get(credited);
        if (owner && credited !== event.targetId)
          owner.matchStats.damageDealt += result.hull + result.plating;
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
      if (player.health.hull === 0 && !deaths.has(event.targetId)) {
        deaths.set(event.targetId, event.ownerId);
        killingBlows.set(event.targetId, event);
        if (event.credit) deferredCredits.set(event.targetId, event.credit);
      }
      if (index < events.length) results.push(result);
      if (
        player.health.hull > 0 &&
        !isSelectionProtected(player) &&
        !player.shelter
      )
        this.#queueAttackFollowups(event, queue, events.length + 512);
      if (
        player.health.hull > 0 &&
        (result.dodged || result.hull + result.plating > 0) &&
        this.canUseOwnedOffense(event.targetId)
      ) {
        for (const decoy of player.runtimeEffects.readyDecoys(this.#time))
          if (this.scheduleAlly(event.targetId, 'decoy', 0, decoy.durationMs))
            player.runtimeEffects.consumeDecoy(decoy.id, this.#time);
      }
      if (
        (event.channel === 'contact' ||
          (event.channel === 'direct' &&
            result.dodged &&
            player.specializations.has('spines-detachable'))) &&
        event.ownerId &&
        event.ownerId !== event.targetId &&
        event.depth < MAX_CAUSAL_DEPTH &&
        player.stats.spines > 0 &&
        this.canUseOwnedOffense(event.targetId) &&
        !isSelectionProtected(player) &&
        !player.shelter &&
        (result.hull + result.plating > 0 ||
          (result.dodged && player.specializations.has('spines-detachable')))
      ) {
        const damage = result.dodged
          ? event.amount
          : result.hull + result.plating;
        const factor =
          (player.stats.spines / 100) *
          (guard && player.specializations.has('turtle-down-spiked') ? 2 : 1);
        queue.push({
          targetId: event.ownerId,
          ownerId: event.targetId,
          channel: 'direct',
          amount: damage * factor,
          depth: event.depth + 1,
        });
        if (player.specializations.has('spines-poisonous'))
          this.applyStatus(event.ownerId, {
            kind: 'corrosion',
            ownerId: event.targetId,
            magnitude: player.stats.ability * 0.3,
            duration: 5000,
          });
      }
      const reflection = reflectedDamage(
        event,
        result,
        Math.min(
          1,
          player.reflection +
            (event.channel === 'contact'
              ? player.runtimeEffects.contactReflection()
              : 0),
        ),
      );
      if (reflection) queue.push(reflection);
    }
    const playerCredits = new Map(
      [...deaths].map(([id, killer]) => [
        id,
        deferredCredits.get(id) ?? this.#killCredit(killer),
      ]),
    );
    const botCredits = new Map(
      [...botDeaths].map(([id, killer]) => [id, this.#killCredit(killer)]),
    );
    if (deaths.size) this.#eliminationGroups.push([...deaths.keys()].sort());
    for (const [playerId, ownerId] of deaths) {
      if (ownerId && ownerId !== playerId) {
        const credited = playerCredits.get(playerId)?.ownerId;
        const owner = credited && this.#players.get(credited);
        if (owner && credited !== playerId) {
          owner.matchStats.eliminations++;
          this.#applyKillGrowth(credited);
          this.#applyStonerGrowth(credited, killingBlows.get(playerId));
        }
      }
      this.#deaths.push({ playerId, ownerId });
      this.accept({
        kind: 'eliminate',
        playerId,
        ownerId,
        ...(playerCredits.get(playerId)
          ? { credit: playerCredits.get(playerId)! }
          : {}),
      });
    }
    for (const [botId, ownerId] of botDeaths) {
      const bot = this.#bots.get(botId);
      if (!bot) continue;
      const position = bot.craft.body.translation();
      const credit = botCredits.get(botId) ?? {
        ownerId: null,
        kind: 'third-party' as const,
      };
      const loot = enemyLoot(bot.loot);
      const owner = credit.ownerId && this.#players.get(credit.ownerId);
      for (const rarity of loot.rarities) {
        this.#createResource({
          position,
          source: bot.biome === 'water' ? 'aquatic' : 'meat',
          rarity,
          killerId: ownerId,
          ownerId: credit.ownerId,
          killerKind: credit.kind,
          repair: false,
        });
        if (
          owner &&
          (bot.elite ||
            this.#signalTargets.get(credit.ownerId ?? '')?.has(bot.id)) &&
          Math.random() * 100 < owner.stats.trackerFood
        )
          this.#createResource({
            position,
            source: bot.biome === 'water' ? 'aquatic' : 'meat',
            rarity,
            killerId: ownerId,
            ownerId: credit.ownerId,
            killerKind: credit.kind,
            repair: false,
          });
      }
      const killingBlow = killingBlows.get(botId);
      if (
        owner &&
        bot.kind !== 'decoy' &&
        killingBlow?.ownerId === credit.ownerId &&
        killingBlow.abilityId === 'jaws' &&
        owner.specializations.has('jaws-neck-bite')
      )
        this.#createResource({
          position,
          source: 'meat',
          rarity:
            bot.elite || bot.tier >= 3
              ? 'epic'
              : bot.tier > 1
                ? 'rare'
                : 'common',
          killerId: ownerId,
          ownerId: credit.ownerId,
          killerKind: credit.kind,
          repair: false,
        });
      if (owner && credit.ownerId && bot.kind !== 'decoy')
        this.#applyKillGrowth(credit.ownerId);
      if (owner && credit.ownerId && bot.kind !== 'decoy')
        this.#applyStonerGrowth(credit.ownerId, killingBlow);
      if (owner && loot.currency > 0)
        transact(owner.wallet, `bot:${botId}`, 'grant', loot.currency);
      this.#deaths.push({ playerId: botId, ownerId });
      for (const other of this.#players.values())
        other.statuses = other.statuses.filter(
          (status) => status.ownerId !== botId,
        );
      for (const other of this.#bots.values())
        other.statuses = other.statuses.filter(
          (status) => status.ownerId !== botId,
        );
      for (const [id, pull] of this.#pulls)
        if (pull.targetId === botId) this.#pulls.delete(id);
      this.#world.removeRigidBody(bot.craft.body);
      this.#bots.delete(botId);
      this.#provoked.delete(botId);
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
    const bot = this.#bots.get(playerId);
    if (!['corrosion', 'slow', 'stun', 'heat', 'cold'].includes(status.kind))
      return false;
    const sourceBotOwner = status.ownerId
      ? this.#bots.get(status.ownerId)?.ownerId
      : null;
    if (
      sourceBotOwner &&
      (sourceBotOwner === playerId || sourceBotOwner === bot?.ownerId)
    )
      return false;
    if (
      !Number.isFinite(status.magnitude) ||
      status.magnitude < 0 ||
      !Number.isFinite(status.duration) ||
      status.duration <= 0 ||
      status.duration > 300000
    )
      return false;
    if (
      status.ownerId &&
      !this.#players.has(status.ownerId) &&
      !this.#bots.has(status.ownerId)
    )
      return false;
    if (
      status.ownerId &&
      status.ownerId !== playerId &&
      !this.canUseOwnedOffense(status.ownerId)
    )
      return false;
    if (this.#phase === 'running' && bot && bot.health > 0) {
      if (
        status.ownerId &&
        (status.ownerId === bot.ownerId ||
          !this.canUseOwnedOffense(status.ownerId))
      )
        return false;
      const owner = status.ownerId
        ? this.#players.get(sourceBotOwner ?? status.ownerId)
        : undefined;
      const tickIntervalMs =
        status.kind === 'corrosion' && owner
          ? Math.max(
              250,
              Math.min(
                10000,
                100000 / Math.max(1, owner.stats.poisonTickSpeed),
              ),
            )
          : 1000;
      const extra =
        status.kind === 'corrosion'
          ? Math.max(0, Math.floor(owner?.stats.additionalPoisonTicks ?? 0)) *
            tickIntervalMs
          : 0;
      const magnitude =
        status.kind === 'corrosion' && owner
          ? (status.magnitude * owner.stats.poisonDamage) / 100
          : status.magnitude;
      const duration = Math.min(
        300000,
        (status.duration + extra) *
          (status.kind === 'stun' && owner
            ? owner.stats.stunDuration / 100
            : 1),
      );
      if (
        !Number.isFinite(duration) ||
        duration <= 0 ||
        !Number.isFinite(magnitude)
      )
        return false;
      if (
        bot.statuses.length >= 128 &&
        !bot.statuses.some((existing) => existing.kind === 'corrosion') &&
        !bot.statuses.some(
          (existing) =>
            existing.kind === status.kind &&
            existing.ownerId === status.ownerId,
        )
      )
        return false;
      addStatus(
        bot.statuses,
        {
          ...status,
          magnitude,
          duration,
          tickIntervalMs,
        },
        this.#time,
      );
      return true;
    }
    if (
      this.#phase !== 'running' ||
      !player ||
      player.life.kind !== 'alive' ||
      isSelectionProtected(player) ||
      player.shelter !== null
    )
      return false;
    if (player.statusImmunities.has(status.kind)) return false;
    if (
      player.statuses.length >= 128 &&
      !player.statuses.some((existing) => existing.kind === 'corrosion') &&
      !player.statuses.some(
        (existing) =>
          existing.kind === status.kind && existing.ownerId === status.ownerId,
      )
    )
      return false;
    const resistance =
      status.kind === 'stun' && status.ownerId !== playerId
        ? player.stats.stunResistance
        : status.kind === 'heat'
          ? player.stats.heatAdaptation
          : status.kind === 'cold'
            ? player.stats.coldAdaptation
            : 0;
    const owner = status.ownerId
      ? this.#players.get(sourceBotOwner ?? status.ownerId)
      : undefined;
    const tickIntervalMs =
      status.kind === 'corrosion' && owner && status.ownerId !== playerId
        ? Math.max(
            250,
            Math.min(10000, 100000 / Math.max(1, owner.stats.poisonTickSpeed)),
          )
        : 1000;
    const extra =
      status.kind === 'corrosion' && status.ownerId !== playerId
        ? Math.max(0, Math.floor(owner?.stats.additionalPoisonTicks ?? 0)) *
          tickIntervalMs
        : 0;
    const duration = Math.min(
      300000,
      (status.duration + extra) *
        Math.max(0, 1 - resistance / 100) *
        (status.kind === 'stun' && owner && status.ownerId !== playerId
          ? owner.stats.stunDuration / 100
          : 1),
    );
    if (!Number.isFinite(duration) || duration <= 0) return false;
    const magnitude =
      status.kind === 'corrosion' && owner && status.ownerId !== playerId
        ? (status.magnitude * owner.stats.poisonDamage) / 100
        : status.magnitude;
    if (!Number.isFinite(magnitude)) return false;
    addStatus(
      player.statuses,
      { ...status, magnitude, duration, tickIntervalMs },
      this.#time,
    );
    if (status.kind === 'stun') player.channel = null;
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

  #describeAcquisition(player: Player, choice: OfferChoice) {
    const description = this.#content.describe(
      choice.id,
      choice.rarity,
      choice.rank,
    );
    const definition = this.#content.definition(choice.id);
    const value = definition?.values[choice.rarity]?.[choice.rank - 1];
    if (
      !description ||
      !definition ||
      value === undefined ||
      player.equipment.learned.has(choice.id)
    )
      return description;
    const details: Record<string, number> = {};
    for (const [name, tables] of Object.entries(
      definition.detailValues ?? {},
    )) {
      const detail = tables[choice.rarity]?.[choice.rank - 1];
      if (detail !== undefined) details[name] = detail;
    }
    const ability = upgradeEffect(
      choice.id,
      definition.effect,
      choice.rarity,
      choice.rank,
      value,
      details,
    )?.ability;
    if (!ability) return description;
    const slot = acquisitionSlot(player.equipment, ability);
    const current = player.equipment.slots[slot];
    const previous = current
      ? (this.#content.definition(current)?.name ?? current)
      : null;
    return {
      ...description,
      description: `${description.description} Equips in ${slot}${previous ? `, replacing ${previous}` : ''}.`,
    };
  }

  learnAbility(playerId: string, ability: Ability): boolean {
    const player = this.#players.get(playerId);
    if (
      !player ||
      player.life.kind !== 'alive' ||
      !validAbility(ability) ||
      player.equipment.learned.has(ability.id)
    )
      return false;
    player.equipment.learned.set(ability.id, { ...ability });
    equip(
      player.equipment,
      acquisitionSlot(player.equipment, ability),
      ability.id,
    );
    return true;
  }

  registerAbility(ability: Ability): boolean {
    if (!validAbility(ability) || this.#abilityCatalog.has(ability.id))
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
    abilityId?: string,
    bypassPlating?: boolean,
    rootOwner = false,
  ): boolean {
    const player = this.#players.get(ownerId);
    const damageMultiplier = abilityId
      ? (player?.abilityDamageMultipliers.get(abilityId) ?? 1)
      : 1;
    if (
      this.#phase !== 'running' ||
      !player ||
      !player.connected ||
      player.life.kind !== 'alive' ||
      player.life.activity !== 'playing' ||
      player.shelter !== null ||
      !Number.isFinite(aim) ||
      !Number.isFinite(speed) ||
      speed <= 0 ||
      speed > 100 ||
      !Number.isFinite(lifetime) ||
      lifetime <= 0 ||
      lifetime > 10000 ||
      !Number.isFinite(damage) ||
      damage < 0 ||
      !Number.isFinite(damage * damageMultiplier) ||
      !Number.isFinite(impulse) ||
      impulse < 0 ||
      (abilityId !== undefined && (!abilityId || abilityId.length > 128)) ||
      (bypassPlating !== undefined && typeof bypassPlating !== 'boolean') ||
      typeof rootOwner !== 'boolean' ||
      this.#projectiles.length >= 512
    )
      return false;
    const position = player.craft.body.translation();
    this.#projectiles.push({
      id: ++this.#projectileId,
      ownerId,
      abilityId,
      bypassPlating,
      rootOwner,
      position: { x: position.x, y: position.y, z: position.z },
      velocity: { x: Math.sin(aim) * speed, y: 0, z: Math.cos(aim) * speed },
      remaining: lifetime,
      damage: damage * damageMultiplier,
      impulse: Math.min(impulse, 20),
    });
    if (rootOwner) player.dash = null;
    return true;
  }

  #isRooted(playerId: string): boolean {
    return this.#projectiles.some(
      (projectile) => projectile.ownerId === playerId && projectile.rootOwner,
    );
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
    const result = repair(player.health, player.stats, amount, consumeAtFull);
    this.#applyHealthGrowth(
      playerId,
      player.runtimeEffects.healed(result.actual),
    );
    return result;
  }

  #applyHealthGrowth(
    playerId: string,
    growth: { id: string; total: number }[],
  ): void {
    const player = this.#players.get(playerId);
    if (!player) return;
    if (growth.length) {
      const modifiers = [...player.modifiers];
      for (const change of growth) {
        const id = JSON.stringify(['runtime-healing-growth', change.id]);
        const index = modifiers.findIndex(
          (modifier) => modifier.id === id && modifier.stat === 'maximumHealth',
        );
        const modifier: StatModifier = {
          id,
          stat: 'maximumHealth',
          add: change.total,
          multiplier: 1,
        };
        if (index < 0) modifiers.push(modifier);
        else modifiers[index] = modifier;
      }
      this.setModifiers(playerId, modifiers);
    }
  }

  #applyKillGrowth(playerId: string): void {
    const player = this.#players.get(playerId);
    if (!player || player.life.kind !== 'alive' || player.health.hull <= 0)
      return;
    const growth = player.runtimeEffects.killGrowth();
    if (!growth.length) return;
    const ids = new Set(growth.map((modifier) => modifier.id));
    this.setModifiers(playerId, [
      ...player.modifiers.filter((modifier) => !ids.has(modifier.id)),
      ...growth,
    ]);
  }

  #applyStonerGrowth(playerId: string, event: DamageEvent | undefined): void {
    const player = this.#players.get(playerId);
    if (
      !player ||
      event?.ownerId !== playerId ||
      event.abilityId !== 'stoner' ||
      !player.specializations.has('stoner-training')
    )
      return;
    const id = 'specialization:stoner-training';
    const previous =
      player.modifiers.find(
        (modifier) => modifier.id === id && modifier.stat === 'physical',
      )?.add ?? 0;
    const add = previous + 0.5;
    this.setModifiers(playerId, [
      ...player.modifiers.filter((modifier) => modifier.id !== id),
      { id, stat: 'physical', add, multiplier: 1 },
      { id, stat: 'ability', add, multiplier: 1 },
    ]);
  }

  configureRuntimeEffect(playerId: string, effect: RuntimeEffect): boolean {
    const player = this.#players.get(playerId);
    if (
      this.#phase !== 'running' ||
      !player ||
      player.life.kind !== 'alive' ||
      !player.runtimeEffects.configure(effect, this.#time)
    )
      return false;
    if (
      effect.kind === 'size-health' ||
      (effect.kind === 'finale-stat' &&
        this.#wallTime >= this.#finale.shrinkStartMs)
    )
      this.setModifiers(playerId, player.modifiers);
    return true;
  }

  storedProgress(playerId: string): number | null {
    return this.#players.get(playerId)?.runtimeEffects.storedProgress() ?? null;
  }

  #recordManualAttack(playerId: string, player: Player): void {
    player.lastManualAttackAt = this.#time;
    for (const bot of this.#bots.values()) {
      if (bot.friendship?.playerId === playerId) bot.friendship = null;
    }
  }

  #advanceFriendships(): void {
    const tuning = SOURCE_GAMEPLAY.passiveCharm;
    for (const bot of this.#bots.values()) {
      if (
        bot.friendship &&
        (bot.friendship.until <= this.#time ||
          this.#players.get(bot.friendship.playerId)?.life.kind !== 'alive')
      )
        bot.friendship = null;
    }
    for (const [id, player] of this.#players) {
      if (this.#time < player.nextFriendshipAt) continue;
      player.nextFriendshipAt =
        this.#time +
        tuning.reevaluateMs.x +
        Math.random() * (tuning.reevaluateMs.y - tuning.reevaluateMs.x);
      const allies = this.#ownedCount(id, 'charmed');
      if (
        !player.connected ||
        player.life.kind !== 'alive' ||
        player.life.activity !== 'playing' ||
        player.shelter ||
        allies >= this.#charmCapacity(id) ||
        [...this.#bots.values()].some((bot) => bot.friendship?.playerId === id)
      )
        continue;
      const position = player.craft.body.translation();
      const candidates = [...this.#bots.values()].filter(
        (bot) =>
          bot.kind === 'wild' &&
          !bot.friendship &&
          bot.health > 0 &&
          bot.friendshipReadyAt <= this.#time,
      );
      const start = Math.floor(Math.random() * candidates.length);
      for (let index = 0; index < candidates.length; index++) {
        const bot = candidates[(start + index) % candidates.length];
        if (!bot) continue;
        const point = bot.craft.body.translation();
        const distance = Math.hypot(point.x - position.x, point.z - position.z);
        if (distance > 20) continue;
        // Curves are extracted; multiplying them is an estimated reconstruction.
        const chance = Math.min(
          1,
          Math.max(
            tuning.minimumChance,
            sourceCurve(tuning.social, player.stats.social) *
              sourceCurve(tuning.distance, distance) *
              sourceCurve(
                tuning.pacifism,
                (this.#time - player.lastManualAttackAt) / 1000,
              ) *
              sourceCurve(tuning.allies, allies) *
              sourceCurve(
                tuning.pity,
                (this.#time - player.lastFriendshipAt) / 1000,
              ) *
              (bot.elite ? tuning.alphaMultiplier : 1),
          ),
        );
        if (Math.random() >= chance) continue;
        bot.friendship = {
          playerId: id,
          until: this.#time + tuning.durationMs,
        };
        bot.friendshipReadyAt = this.#time + tuning.reofferMs;
        player.lastFriendshipAt = this.#time;
        if (bot.targetId === id) {
          bot.targetId = null;
          bot.windupUntil = null;
        }
        break;
      }
    }
  }

  #attemptCharm(
    ownerId: string,
    bot: Bot,
    chanceOverride?: number,
    acceptedFriendship = false,
  ): void {
    const owner = this.#players.get(ownerId);
    if (!owner) return;
    bot.charmReadyAt = this.#time + 5000;
    const chance =
      (chanceOverride ?? this.#evolutionCharmChance(owner)) *
      (bot.elite ? SOURCE_GAMEPLAY.evolutionCharm.alphaMultiplier : 1) *
      (owner.specializations.has('spur-marking') &&
      this.#signalTargets.get(ownerId)?.has(bot.id)
        ? 2
        : 1);
    const success =
      acceptedFriendship || randomInt(1_000_000) / 1_000_000 < chance;
    owner.lastCharm = { success, at: this.#time };
    if (!success) return;
    bot.ownerId = ownerId;
    bot.kind = 'charmed';
    bot.friendship = null;
    this.#provoked.delete(bot.id);
    for (const target of this.#players.values())
      target.statuses = target.statuses.filter(
        (status) => status.ownerId !== bot.id,
      );
    for (const target of this.#bots.values())
      target.statuses = target.statuses.filter(
        (status) => status.ownerId !== bot.id,
      );
    bot.statuses = bot.statuses.filter(
      (status) =>
        status.ownerId !== ownerId &&
        (!status.ownerId ||
          this.#bots.get(status.ownerId)?.ownerId !== ownerId),
    );
    bot.targetId = null;
    bot.windupUntil = null;
    bot.waypoint = null;
    bot.waypointTarget = null;
  }

  #hurtStatusAura(ownerId: string): void {
    const owner = this.#players.get(ownerId);
    if (!owner || !this.canUseOwnedOffense(ownerId)) return;
    const origin = owner.craft.body.translation();
    for (const effect of owner.runtimeEffects.hurtStatusAuras(this.#time)) {
      const targets = [
        ...[...this.#players.entries()]
          .filter(
            ([id, player]) => id !== ownerId && player.life.kind === 'alive',
          )
          .map(([id, player]) => ({
            id,
            position: player.craft.body.translation(),
          })),
        ...[...this.#bots.values()]
          .filter((bot) => bot.health > 0 && bot.ownerId !== ownerId)
          .map((bot) => ({
            id: bot.id,
            position: bot.craft.body.translation(),
          })),
      ];
      for (const target of targets)
        if (
          Math.hypot(
            target.position.x - origin.x,
            target.position.z - origin.z,
          ) <= effect.range
        )
          this.applyStatus(target.id, {
            kind: effect.status,
            ownerId,
            magnitude: effect.magnitude * owner.stats.ability,
            duration: effect.durationMs,
          });
    }
  }

  #charmAura(
    ownerId: string,
    trigger: 'interval' | 'hurt' | 'attack',
    now: number,
  ): void {
    const owner = this.#players.get(ownerId);
    if (!owner) return;
    const enabled =
      owner.life.kind === 'alive' && this.canUseOwnedOffense(ownerId);
    for (const effect of owner.runtimeEffects.charmAuras(
      now,
      trigger,
      enabled,
    )) {
      const reserved = [...this.#nestDefenses.values()].filter(
        (item) => item.ownerId === ownerId,
      ).length;
      if (
        this.#ownedCount(ownerId, 'charmed') + reserved >=
        this.#charmCapacity(ownerId)
      )
        break;
      const origin = owner.craft.body.translation();
      const targets = [...this.#bots.values()]
        .filter(
          (bot) =>
            bot.health > 0 &&
            (bot.kind === 'wild' || bot.kind === 'charmed') &&
            bot.ownerId !== ownerId &&
            now >= bot.charmReadyAt &&
            Math.hypot(
              bot.craft.body.translation().x - origin.x,
              bot.craft.body.translation().z - origin.z,
            ) <=
              effect.range * (1 + owner.stats.attackArea / 100),
        )
        .sort((a, b) => {
          const distance = (bot: Bot) =>
            Math.hypot(
              bot.craft.body.translation().x - origin.x,
              bot.craft.body.translation().z - origin.z,
            );
          return distance(a) - distance(b) || a.id.localeCompare(b.id);
        });
      for (const target of targets) {
        if (
          this.#ownedCount(ownerId, 'charmed') + reserved >=
          this.#charmCapacity(ownerId)
        )
          break;
        this.#attemptCharm(
          ownerId,
          target,
          this.#evolutionCharmChance(owner) * (effect.chanceMultiplier ?? 1),
        );
      }
    }
  }

  #evolutionCharmChance(owner: Player): number {
    const tuning = SOURCE_GAMEPLAY.evolutionCharm;
    return Math.min(
      1,
      Math.max(
        0,
        tuning.initialChance *
          (1 + sourceCurve(tuning.socialImpact, owner.stats.social)),
      ),
    );
  }

  #periodicOffense(now: number): DamageEvent[] {
    const events: DamageEvent[] = [];
    for (const [ownerId, owner] of this.#players) {
      this.#charmAura(ownerId, 'interval', now);
      const active =
        owner.life.kind === 'alive' && this.canUseOwnedOffense(ownerId);
      for (const repair of owner.runtimeEffects.periodicResources(
        now,
        active,
      )) {
        if (this.#resources.size >= MAX_RESOURCES) break;
        const point = owner.craft.body.translation();
        if (
          [...this.#resources.values()].some(
            (resource) =>
              Math.hypot(
                resource.position.x - point.x,
                resource.position.z - point.z,
              ) < 1,
          )
        )
          continue;
        this.#createResource({
          position: { x: point.x, z: point.z },
          source: 'vegetation',
          rarity: 'common',
          killerId: null,
          ownerId,
          killerKind: null,
          repair,
        });
      }
      const strikes = owner.runtimeEffects.periodicStrikes(
        now,
        owner.life.kind === 'alive' && this.canUseOwnedOffense(ownerId),
      );
      if (!strikes.length) continue;
      const observation = this.view(ownerId);
      if (!observation) continue;
      const origin = owner.craft.body.translation();
      const candidates = [
        ...observation.players
          .filter(
            (target) =>
              target.id !== ownerId &&
              target.life.kind === 'alive' &&
              !target.shelter,
          )
          .map((target) => ({ id: target.id, position: target.position })),
        ...observation.bots
          .filter(
            (target) => target.ownerId !== ownerId && target.kind !== 'decoy',
          )
          .map((target) => ({ id: target.id, position: target.position })),
      ]
        .map((target) => ({
          ...target,
          distance: Math.hypot(
            target.position.x - origin.x,
            target.position.z - origin.z,
          ),
        }))
        .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
      for (const strike of strikes) {
        for (const target of candidates) {
          if (target.distance > strike.range || target.distance === 0) continue;
          const direction = {
            x: (target.position.x - origin.x) / target.distance,
            y: 0,
            z: (target.position.z - origin.z) / target.distance,
          };
          const hit = this.#world.castRay(
            new RAPIER.Ray(origin, direction),
            target.distance + 1,
            true,
            RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
            undefined,
            owner.craft.collider,
          );
          if (
            !hit ||
            this.#combatantAtCollider(hit.collider.handle) !== target.id
          )
            continue;
          events.push({
            targetId: target.id,
            ownerId,
            channel: 'direct',
            amount: strike.damage,
            depth: 0,
          });
          break;
        }
      }
    }
    return events;
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

  takeDiscoveries(): { playerId: string; siteId: string }[] {
    return this.#discoveries.splice(0);
  }

  #openPointOfInterest(playerId: string, siteId: string): boolean {
    const player = this.#players.get(playerId);
    const point = this.#pointsOfInterest.find((site) => site.id === siteId);
    if (
      !player ||
      !point ||
      !player.connected ||
      player.life.kind !== 'alive' ||
      player.life.activity !== 'playing' ||
      player.selection.state.kind !== 'idle' ||
      this.#hasActiveStatus(player.statuses, 'stun')
    )
      return false;
    const choices = new Map<
      string,
      { option: PoiOption; upgrade?: OfferChoice }
    >();
    for (const option of poiOptions(point.kind)) {
      if (
        point.kind === 'mud-pond' &&
        option.id === 'tail' &&
        !player.ranks.has('tail')
      )
        continue;
      if (
        point.kind === 'lotus-plant' &&
        option.id === 'cooldown' &&
        player.stats.size >= 100
      )
        continue;
      if (option.reward.kind !== 'upgrade') {
        choices.set(option.id, { option });
        continue;
      }
      const rarity = option.reward.rarity;
      const eligible = this.#content
        .eligible(
          player.ranks,
          player.specializations,
          'ordinary',
          this.#worldConditions,
        )
        .map((id) => this.#content.definition(id))
        .filter(
          (definition) =>
            definition !== undefined &&
            definition.rarities.includes(rarity) &&
            rarityRank(player.rarities.get(definition.id) ?? '') <=
              rarityRank(rarity),
        );
      const definition = eligible[Math.floor(Math.random() * eligible.length)];
      if (!definition) continue;
      const upgrade = {
        id: definition.id,
        rank: (player.ranks.get(definition.id) ?? 0) + 1,
        rarity,
      };
      choices.set(option.id, {
        option: {
          ...option,
          label: `${definition.name} (${rarity}, ${option.reward.cost} currency)`,
        },
        upgrade,
      });
    }
    const entries = [...choices.values()];
    const first = entries[0];
    if (
      !first ||
      !reservePointOfInterest(
        point,
        playerId,
        player.craft.body.translation(),
        this.#time,
      )
    )
      return false;
    player.poiChoices = choices;
    player.selection.enqueue(
      {
        kind: 'poi',
        id: `poi-choice-${++this.#promptId}`,
        revision: 0,
        siteId,
        budgetMs: remainingProtection(point, playerId) || POI_RESERVATION_MS,
        protected: remainingProtection(point, playerId) > 0,
        options: [
          { id: first.option.id, label: first.option.label },
          ...entries
            .slice(1)
            .map(({ option }) => ({ id: option.id, label: option.label })),
          { id: 'cancel', label: 'Leave without claiming' },
        ],
      },
      this.#time,
    );
    this.#advanceSelections(this.#time);
    return true;
  }

  #commitPointOfInterest(
    playerId: string,
    siteId: string,
    choiceId: string,
  ): boolean {
    const player = this.#players.get(playerId);
    const point = this.#pointsOfInterest.find((site) => site.id === siteId);
    if (!player || !point) return false;
    if (choiceId === 'cancel') {
      releasePointOfInterest(point, playerId, this.#time);
      return true;
    }
    const choice = player.poiChoices.get(choiceId);
    if (
      !choice ||
      !player.connected ||
      player.life.kind !== 'alive' ||
      point.claim.kind !== 'reserved' ||
      point.claim.playerId !== playerId ||
      this.#time >= point.claim.expiresAt ||
      poiDistance(point, player.craft.body.translation()) >
        POI_INTERACTION_RANGE ||
      this.#hasActiveStatus(player.statuses, 'stun') ||
      (point.kind === 'lotus-plant' &&
        choiceId === 'cooldown' &&
        player.stats.size >= 100) ||
      (point.kind === 'mud-pond' &&
        choiceId === 'tail' &&
        !player.ranks.has('tail'))
    )
      return false;
    const reward = choice.option.reward;
    const source = `poi:${point.id}`;
    const addStats = (modifiers: StatModifier[]) =>
      this.setModifiers(playerId, [...player.modifiers, ...modifiers]);
    const modifier = (
      stat: Stat,
      add: number,
      multiplier = 1,
    ): StatModifier => ({ id: source, stat, add, multiplier });
    let applied = false;
    switch (reward.kind) {
      case 'repair':
        this.repairPlayer(
          playerId,
          player.stats.maximumHealth * reward.fraction,
          true,
        );
        applied = true;
        break;
      case 'progress':
        applied = this.grantProgress(
          playerId,
          levelRequirement(
            player.health.level,
            player.stats.progressRequirement,
          ) * reward.levels,
        );
        break;
      case 'stat':
        applied = addStats([
          modifier(reward.stat, reward.add, reward.multiplier),
        ]);
        break;
      case 'random-stat': {
        const stat =
          RANDOM_POI_STATS[Math.floor(Math.random() * RANDOM_POI_STATS.length)];
        if (stat)
          applied = addStats([
            modifier(
              stat,
              Math.max(0.5, player.stats[stat] * (reward.multiplier - 1)),
            ),
          ]);
        break;
      }
      case 'adaptation':
        applied = addStats([
          modifier('heatAdaptation', reward.amount),
          modifier('coldAdaptation', reward.amount),
        ]);
        break;
      case 'temporary-resistance':
        player.temporaryPoi.set(source, {
          until: this.#time + reward.duration,
          factor: 1 - reward.amount / 100,
        });
        applied = true;
        break;
      case 'nest-salvage': {
        const spawnElite = Math.random() < 0.5;
        const elitePosition = this.#arena.eliteSites
          .map((site) => this.#safeSpawn(site))
          .find((site) => site !== null);
        if (
          spawnElite &&
          (this.#bots.size >= BOT_RULES.maxCount ||
            this.#bots.size +
              this.#pendingAllies.length +
              this.#nestDefenses.size >=
              ALLY_LIMITS.total ||
            [...this.#bots.values()].filter((bot) => bot.elite).length >=
              BOT_RULES.maxElites ||
            !elitePosition)
        )
          break;
        applied = !!this.#createResource({
          position: point.position,
          source: 'meat',
          rarity: 'rare',
          killerId: null,
          ownerId: null,
          killerKind: null,
          repair: false,
        });
        if (applied && spawnElite && elitePosition)
          this.#spawnBot(elitePosition, 1, true);
        break;
      }
      case 'currency':
        applied = !!transact(player.wallet, source, 'grant', reward.amount)
          ?.accepted;
        break;
      case 'upgrade': {
        const upgrade = choice.upgrade;
        const receiptId = `${source}:purchase`;
        if (
          !upgrade ||
          player.wallet.balance < reward.cost ||
          player.wallet.receipts.size >= 4096 ||
          player.wallet.receipts.has(receiptId)
        )
          break;
        if (
          !this.grantUpgrade(playerId, upgrade.id, upgrade.rarity, upgrade.rank)
        )
          break;
        const receipt = transact(
          player.wallet,
          receiptId,
          'spend',
          reward.cost,
        );
        if (!receipt?.accepted)
          throw new Error('Validated POI purchase could not be charged');
        applied = true;
        break;
      }
      case 'recruit':
        applied = this.recruitCompanion(playerId, source, 0);
        break;
      case 'defend-nest': {
        const reserved = [...this.#nestDefenses.values()].filter(
          (item) => item.ownerId === playerId,
        ).length;
        if (
          !this.#safeSpawn(point.position) ||
          this.#bots.size +
            this.#pendingAllies.length +
            this.#nestDefenses.size >=
            ALLY_LIMITS.total ||
          this.#ownedCount(playerId, 'charmed') + reserved >=
            this.#charmCapacity(playerId)
        )
          break;
        this.#nestDefenses.set(point.id, {
          ownerId: playerId,
          siteId: point.id,
          endsAt: this.#time + 60000,
          health: 60,
        });
        applied = true;
        break;
      }
      case 'firmware-spawn':
        player.firmwareSpawnBonus += reward.percent;
        applied = true;
        break;
      case 'clock':
        applied =
          this.#worldClock.setAdjustment(source, 'day', reward.dayMs) &&
          this.#worldClock.setAdjustment(source, 'night', reward.nightMs);
        break;
      case 'cancel':
        break;
    }
    if (applied) point.claim = { kind: 'claimed', playerId };
    return applied;
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
        if (outcome.prompt.kind === 'poi') {
          const siteId = outcome.prompt.siteId;
          const point = this.#pointsOfInterest.find(
            (site) => site.id === siteId,
          );
          committed =
            outcome.kind === 'chosen' &&
            this.#commitPointOfInterest(playerId, siteId, outcome.optionId);
          if (point) releasePointOfInterest(point, playerId, this.#time);
          player.poiChoices.clear();
        } else if (
          outcome.kind === 'chosen' &&
          outcome.prompt.kind === 'upgrade'
        ) {
          const source =
            outcome.automatic &&
            player.displayedOffer?.id === outcome.prompt.id &&
            player.displayedOffer.revision === outcome.prompt.revision
              ? player.displayedOffer.choices
              : player.generatedChoices;
          const choice = source.find((item) => item.id === outcome.optionId);
          committed =
            !!choice &&
            this.grantUpgrade(playerId, choice.id, choice.rarity, choice.rank);
          if (committed && choice)
            this.#selections.push({ playerId, choiceId: choice.id });
          else if (player.activeReward)
            player.progression.pending.unshift(player.activeReward);
          player.activeReward = null;
          player.generatedChoices = [];
          player.displayedOffer = null;
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
        } else if (outcome.prompt.kind === 'specialization') {
          const definition = this.#content.definition(outcome.prompt.parentId);
          const choice =
            outcome.kind === 'chosen'
              ? definition?.specializationChoices?.find(
                  (item) => item.id === outcome.optionId,
                )
              : undefined;
          if (
            choice &&
            definition &&
            this.#specializationAvailable(player, choice) &&
            !definition.specializations.some((id) =>
              player.specializations.has(id),
            )
          ) {
            const effect = choice.effect;
            if (!effect) committed = choice.carcinisationBonus > 0;
            else if (effect.kind === 'near-obstacle-speed') {
              player.obstacleSpeed = { ...effect, bonus: 0 };
              committed = true;
            } else if (effect.kind === 'ability-damage') {
              player.abilityDamageMultipliers.set(
                effect.abilityId,
                (player.abilityDamageMultipliers.get(effect.abilityId) ?? 1) *
                  effect.multiplier,
              );
              committed = true;
            } else if (effect.kind === 'lateral-dash') {
              player.lateralDashes.set(
                effect.abilityId,
                effect.cooldownMultiplier,
              );
              committed = true;
            } else if (effect.kind === 'ability-feature') {
              if (effect.feature === 'cheek-pouch-storage') {
                const stoner = player.equipment.learned.get('stoner');
                if (stoner?.action === 'projectile' && stoner.ammunition)
                  stoner.ammunition.capacity += 4;
              }
              committed = true;
            } else if (
              effect.kind === 'stats' ||
              effect.kind === 'grant-upgrade'
            ) {
              committed =
                effect.kind !== 'grant-upgrade' ||
                this.grantUpgrade(playerId, effect.id, effect.rarity, 1);
              if (committed)
                committed = this.setModifiers(playerId, [
                  ...player.modifiers,
                  ...effect.changes.map((change) => ({
                    ...change,
                    id: `specialization:${choice.id}`,
                  })),
                ]);
            } else
              committed = this.configureRuntimeEffect(playerId, {
                ...effect,
                id: `specialization:${choice.id}`,
              });
            if (committed) {
              player.specializations.add(choice.id);
              if (choice.id === 'virulent-neurotoxin')
                this.setModifiers(playerId, [
                  ...player.modifiers,
                  {
                    id: 'specialization:virulent-neurotoxin',
                    stat: 'poisonTickSpeed',
                    add: 50,
                    multiplier: 1,
                  },
                ]);
              if (choice.id === 'snout-whiskers' || choice.id === 'fur-wool')
                this.setModifiers(playerId, player.modifiers);
              if (choice.id.startsWith('pedal-glands-'))
                this.#configurePedalGlands(
                  player,
                  player.ranks.get('pedal-glands') ?? 0,
                  player.rarities.get('pedal-glands') ?? '',
                  choice.id,
                );

              player.carcinisation = Math.min(
                10,
                player.carcinisation + choice.carcinisationBonus,
              );
            }
          } else if (
            outcome.kind === 'skipped' ||
            (outcome.kind === 'chosen' && outcome.optionId === 'skip')
          ) {
            committed = !!transact(
              player.wallet,
              `specialization-skip:${outcome.prompt.id}`,
              'grant',
              10,
            )?.accepted;
          } else committed = false;
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
            reward.level,
            player.carcinisation,
            (this.#content.definition('convergent-evolution')?.detailValues
              ?.chance?.[
              player.rarities.get('convergent-evolution') ?? ''
            ]?.[0] ?? 0) / 100,
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
        const protectedChoice =
          current.prompt.kind !== 'poi' || current.prompt.protected;
        if (
          player.life.activity !== 'selecting' ||
          player.selectionProtected !== protectedChoice
        ) {
          setSelecting(player, protectedChoice);
          player.life = { kind: 'alive', activity: 'selecting' };
          player.control = null;
          player.attack = null;
          player.channel = null;
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
    player.attack = null;
    player.channel = null;
    for (let i = this.#projectiles.length - 1; i >= 0; i--)
      if (this.#projectiles[i]?.ownerId === playerId)
        this.#projectiles.splice(i, 1);
    return true;
  }

  markSelectionDisplayed(playerId: string, id: string, revision: number): void {
    const player = this.#players.get(playerId);
    if (player?.connected) {
      const state = player.selection.state;
      if (
        state.kind === 'protected' &&
        state.prompt.kind === 'upgrade' &&
        state.prompt.id === id &&
        state.prompt.revision === revision
      )
        player.displayedOffer = {
          id,
          revision,
          choices: structuredClone(player.generatedChoices),
        };
      player.selection.markDisplayed(id, revision);
    }
  }

  createShelter(position: Point): string | null {
    if (
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.z) ||
      Math.hypot(position.x, position.z) >=
        boundaryRadius(this.#wallTime, this.#finale) - 1 ||
      this.#arena.shelters.length >= 512 ||
      this.#arena.shelters.some(
        (shelter, index) =>
          !this.#closedShelters.has(index) &&
          Math.hypot(shelter.x - position.x, shelter.z - position.z) < 3,
      ) ||
      !arenaPointClear(this.#arena.obstacles, position, 1)
    )
      return null;
    const id = `shelter-${this.#arena.shelters.length}`;
    this.#arena.shelters.push({ ...position });
    return id;
  }

  takeShelterEvents(): {
    playerId: string;
    siteId: string;
    kind: 'enter' | 'exit';
    at: number;
  }[] {
    return this.#shelterEvents.splice(0);
  }

  #leaveShelter(player: Player): void {
    if (!player.shelter) return;
    const playerId = [...this.#players].find(
      ([, value]) => value === player,
    )?.[0];
    if (playerId)
      this.#shelterEvents.push({
        playerId,
        siteId: player.shelter.id,
        kind: 'exit',
        at: this.#time,
      });
    const origin = player.craft.body.translation();
    const radius = player.craft.collider.radius();
    const candidates = [
      { x: origin.x, z: origin.z },
      ...Array.from({ length: 32 }, (_, index) => {
        const angle = (index * Math.PI) / 4;
        const distance = (Math.floor(index / 8) + 1) * 1.5;
        return {
          x: origin.x + Math.cos(angle) * distance,
          z: origin.z + Math.sin(angle) * distance,
        };
      }),
    ];
    const clear = candidates.find(
      (point) =>
        arenaPointClear(this.#arena.obstacles, point, radius) &&
        [...this.#players.values()].every(
          (other) =>
            other === player ||
            other.life.kind !== 'alive' ||
            other.shelter !== null ||
            Math.hypot(
              other.craft.body.translation().x - point.x,
              other.craft.body.translation().z - point.z,
            ) >=
              radius + other.craft.collider.radius(),
        ) &&
        [...this.#bots.values()].every(
          (bot) =>
            Math.hypot(
              bot.craft.body.translation().x - point.x,
              bot.craft.body.translation().z - point.z,
            ) >=
            radius + bot.craft.collider.radius(),
        ),
    );
    if (clear)
      player.craft.body.setTranslation(
        { x: clear.x, y: origin.y, z: clear.z },
        true,
      );
    if (this.#shelterEvents.length > 4096) this.#shelterEvents.shift();
    player.shelter = null;
    player.hibernationElapsed = 0;
    player.craft.collider.setCollisionGroups(COLLISION.craft);
    if (
      playerId &&
      player.connected &&
      player.health.hull > 0 &&
      player.life.kind === 'alive' &&
      player.runtimeEffects.leaveShelter(this.#time)
    )
      this.setModifiers(playerId, player.modifiers);
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
    if (intent.kind === 'shelter') {
      if (player.shelter) return player.shelter.id === intent.targetId;
      const index = Number(intent.targetId.replace(/^shelter-/, ''));
      const site =
        Number.isInteger(index) &&
        !this.#closedShelters.has(index) &&
        intent.targetId === `shelter-${index}`
          ? this.#arena.shelters[index]
          : undefined;
      const pos = player.craft.body.translation();
      return (
        player.life.activity === 'playing' &&
        !this.#hasActiveStatus(player.statuses, 'stun') &&
        !!site &&
        Math.hypot(site.x - pos.x, site.z - pos.z) <= 3 &&
        ![...this.#players.values()].some(
          (other) => other.shelter?.id === intent.targetId,
        )
      );
    }
    if (intent.kind === 'charm') {
      const bot = this.#bots.get(intent.targetId);
      const pos = player.craft.body.translation();
      const target = bot?.craft.body.translation();
      const capacity = this.#charmCapacity(intent.playerId);
      return (
        player.life.activity === 'playing' &&
        !player.shelter &&
        !this.#hasActiveStatus(player.statuses, 'stun') &&
        !!bot &&
        bot.health > 0 &&
        bot.kind === 'wild' &&
        bot.friendship?.playerId === intent.playerId &&
        bot.friendship.until > this.#time &&
        this.#time >= bot.charmReadyAt &&
        bot.ownerId !== intent.playerId &&
        !!target &&
        Math.hypot(pos.x - target.x, pos.z - target.z) <= 3 &&
        this.#ownedCount(intent.playerId, 'charmed') +
          [...this.#nestDefenses.values()].filter(
            (item) => item.ownerId === intent.playerId,
          ).length <
          capacity
      );
    }
    if (
      player.shelter &&
      (intent.kind === 'scan' ||
        intent.kind === 'use-firmware' ||
        intent.kind === 'interaction')
    )
      return false;
    if (intent.kind === 'scan' || intent.kind === 'use-firmware') {
      const module = this.#firmware.find(intent.targetId);
      const position = player.craft.body.translation();
      return (
        player.life.activity === 'playing' &&
        !this.#hasActiveStatus(player.statuses, 'stun') &&
        !!module &&
        Math.hypot(
          module.position.x - position.x,
          module.position.z - position.z,
        ) <= FIRMWARE_SCAN_RANGE
      );
    }
    if (intent.kind === 'interaction')
      return (
        player.life.activity === 'playing' &&
        this.#pointsOfInterest.some(
          (point) =>
            point.id === intent.targetId &&
            point.claim.kind !== 'claimed' &&
            poiDistance(point, player.craft.body.translation()) <=
              POI_INTERACTION_RANGE,
        )
      );
    if (
      intent.kind === 'choice' ||
      intent.kind === 'reroll' ||
      intent.kind === 'upgrade-rarity'
    ) {
      const offer = this.#offers.get(intent.playerId);
      const state = player.selection.state;
      return (
        player.life.activity === 'selecting' &&
        !!offer &&
        offer.id === intent.offerId &&
        offer.revision === intent.revision &&
        (intent.kind === 'choice'
          ? offer.choices.includes(intent.choiceId)
          : player.managedSelection &&
            state.kind === 'protected' &&
            state.prompt.kind === 'upgrade' &&
            this.#time < state.deadline &&
            player.generatedChoices.length > 0 &&
            (intent.kind === 'reroll'
              ? player.wallet.balance >=
                (player.activeReward?.pool === 'branching' ? 10 : 1) +
                  (state.prompt.rerolls ?? 0)
              : player.activeReward?.pool === 'ordinary' &&
                player.wallet.balance >=
                  10 * (1 + (state.prompt.rarityPurchases ?? 0)) &&
                player.generatedChoices.some((choice) => {
                  const definition = this.#content.definition(choice.id);
                  return definition && nextRarity(definition, choice.rarity);
                })))
      );
    }
    if (intent.kind === 'equipment') {
      const selection = player.selection.state;
      return (
        player.life.activity === 'selecting' &&
        player.managedSelection &&
        selection.kind === 'protected' &&
        (selection.prompt.kind === 'upgrade' ||
          selection.prompt.kind === 'specialization') &&
        selection.prompt.id === intent.offerId &&
        selection.prompt.revision === intent.revision &&
        this.#time < selection.deadline &&
        isAbilitySlot(intent.slot) &&
        (intent.contentId === '-' ||
          player.equipment.learned.has(intent.contentId))
      );
    }
    return false;
  }

  #finishFirmware(playerId: string, targetId: string): boolean {
    const player = this.#players.get(playerId);
    const item = this.#firmware.take(targetId);
    if (!player || !item) return false;
    player.firmwareKnowledge.set(item.module.appearance, {
      kind: 'identified',
      effect: item.effect,
    });
    player.lastFirmware = { effect: item.effect, at: this.#time };
    if (
      item.effect === 'poisonous' &&
      player.specializations.has('snout-toxic-sequestration')
    )
      this.setModifiers(playerId, [
        ...player.modifiers.filter(
          (modifier) =>
            modifier.id !== 'specialization:snout-toxic-sequestration',
        ),
        {
          id: 'specialization:snout-toxic-sequestration',
          stat: 'poisonDamage',
          add: Math.min(
            900,
            (player.modifiers.find(
              (modifier) =>
                modifier.id === 'specialization:snout-toxic-sequestration',
            )?.add ?? 0) + 10,
          ),
          multiplier: 1,
        },
      ]);
    if (item.effect === 'yummy' || item.effect === 'delicious')
      this.grantProgress(
        playerId,
        levelRequirement(
          player.health.level,
          player.stats.progressRequirement,
        ) * (item.effect === 'yummy' ? 0.1 : 0.3),
      );
    if (item.effect === 'medicinal')
      player.firmwareHealUntil = this.#time + 4000;
    else if (item.effect === 'entertaining' || item.effect === 'amusing')
      player.firmwareAllySlots++;
    else if (item.effect === 'prolific') player.firmwareSpawnBonus += 10;
    else if (item.effect === 'hallucinogenic')
      player.firmwareDistortionUntil = this.#time + 10000;
    else if (item.effect === 'deafening')
      player.firmwareDeafUntil = this.#time + 10000;
    else if (item.effect === 'mystic') {
      const stat = RANDOM_POI_STATS[randomInt(RANDOM_POI_STATS.length)];
      if (stat)
        this.setModifiers(playerId, [
          ...player.modifiers,
          {
            id: `firmware:${item.module.id}`,
            stat,
            add: Math.max(0.5, player.stats[stat] * 0.1),
            multiplier: 1,
          },
        ]);
    } else if (item.effect === 'spicy') {
      player.thermal.heat = Math.min(100, player.thermal.heat + 30);
      player.firmwareSpeedUntil = this.#time + 5000;
    } else if (item.effect === 'refreshing') {
      player.thermal.cold = Math.min(100, player.thermal.cold + 30);
      for (const [id, ready] of player.equipment.readyAt)
        player.equipment.readyAt.set(id, Math.max(this.#time, ready - 3000));
    } else if (
      item.effect === 'stinging' ||
      item.effect === 'poisonous' ||
      item.effect === 'lethal'
    ) {
      this.applyStatus(playerId, {
        kind: 'corrosion',
        ownerId: playerId,
        magnitude:
          item.effect === 'stinging'
            ? 2
            : item.effect === 'poisonous'
              ? 5
              : player.stats.maximumHealth * 0.2,
        duration: 4000,
      });
    }
    return true;
  }

  #advanceFirmware(deltaMs: number): void {
    for (const [playerId, player] of this.#players) {
      if (player.life.kind !== 'alive') continue;
      const rank = player.ranks.get('fungoid') ?? 0;
      const rarity = player.rarities.get('fungoid') ?? '';
      const definition = this.#content.definition('fungoid');
      const minimum = definition?.values[rarity]?.[rank - 1];
      const maximum = definition?.detailValues?.maximum?.[rarity]?.[rank - 1];
      if (
        minimum !== undefined &&
        maximum !== undefined &&
        player.nextFungoidAt <= this.#time
      ) {
        player.nextFungoidAt =
          this.#time + (minimum + Math.random() * (maximum - minimum)) * 1000;
        if (this.canUseOwnedOffense(playerId)) {
          const origin = player.craft.body.translation();
          const angle = Math.random() * Math.PI * 2;
          const point = {
            x: origin.x + Math.cos(angle) * 2,
            z: origin.z + Math.sin(angle) * 2,
          };
          if (
            terrainAt(this.#arena, point.x, point.z) !== 'water' &&
            Math.hypot(point.x, point.z) <
              boundaryRadius(this.#wallTime, this.#finale) - 1
          )
            this.#firmware.spawn(point);
        }
      }
      if (player.shelter) continue;
      const position = player.craft.body.translation();
      for (const module of this.#firmware.visible()) {
        if (
          Math.hypot(
            module.position.x - position.x,
            module.position.z - position.z,
          ) > FIRMWARE_SCAN_RANGE
        )
          continue;
        const previous = player.firmwareKnowledge.get(module.appearance);
        if (previous?.kind === 'identified') continue;
        const effect = this.#firmware.effectFor(module.id);
        const roll = previous?.roll ?? Math.random();
        if (effect)
          player.firmwareKnowledge.set(
            module.appearance,
            roll <
              identificationChance(
                player.stats.senses,
                player.stats.firmwareIdentification,
              )
              ? { kind: 'identified', effect }
              : { kind: 'failed', roll },
          );
      }
    }
    for (const [id, consumer] of this.#firmwareConsumers) {
      const player = this.#players.get(consumer.playerId);
      const module = this.#firmware.find(id);
      const position = player?.craft.body.translation();
      if (
        !player ||
        !module ||
        !position ||
        !player.connected ||
        player.life.kind !== 'alive' ||
        player.life.activity !== 'playing' ||
        player.shelter ||
        this.#hasActiveStatus(player.statuses, 'stun') ||
        Math.hypot(
          module.position.x - position.x,
          module.position.z - position.z,
        ) > FIRMWARE_SCAN_RANGE
      ) {
        this.#firmwareConsumers.delete(id);
        continue;
      }
      consumer.elapsed += (deltaMs * player.stats.salvageSpeed) / 100;
      if (
        module.stage > 0 &&
        consumer.elapsed < SOURCE_GAMEPLAY.mushroom.biteMs
      )
        continue;
      consumer.elapsed = 0;
      module.stage++;
      this.grantProgress(
        consumer.playerId,
        SOURCE_GAMEPLAY.mushroom.staticXp +
          (levelRequirement(
            player.health.level,
            player.stats.progressRequirement,
          ) *
            SOURCE_GAMEPLAY.mushroom.dynamicXp *
            player.stats.vegetationProgress) /
            100,
      );
      if (module.stage >= SOURCE_GAMEPLAY.mushroom.bites) {
        this.#firmwareConsumers.delete(id);
        this.#finishFirmware(consumer.playerId, id);
      }
    }
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
    if (intent.kind === 'interaction')
      return this.#openPointOfInterest(intent.playerId, intent.targetId);
    if (intent.kind === 'shelter') {
      const player = this.#players.get(intent.playerId);
      if (!player) return false;
      if (player.shelter) this.#leaveShelter(player);
      else {
        const tuning = SOURCE_GAMEPLAY.burrow;
        let decay = this.#shelterDecay.get(intent.targetId) ?? 0;
        if (decay < tuning.maximumEntryPenaltyDecay)
          decay = Math.min(1, decay + tuning.entryPenalty);
        this.#shelterDecay.set(intent.targetId, decay);
        player.shelter = {
          id: intent.targetId,
          until:
            this.#time +
            ((1 - decay) * tuning.lifetimeMs) /
              Math.max(
                0.01,
                sourceCurve(tuning.sizeContribution, player.stats.size / 100),
              ),
        };
        const site =
          this.#arena.shelters[
            Number(intent.targetId.slice('shelter-'.length))
          ];
        if (site) player.craft.body.setTranslation({ ...site, y: 0.25 }, true);
        player.attack = null;
        player.dash = null;
        player.channel = null;
        player.control = null;
        for (let i = this.#projectiles.length - 1; i >= 0; i--)
          if (this.#projectiles[i]?.ownerId === intent.playerId)
            this.#projectiles.splice(i, 1);
        player.craft.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        player.craft.collider.setCollisionGroups((2 << 16) | 1);
        const progress = player.runtimeEffects.shelterEntryProgress();
        if (progress > 0) this.grantProgress(intent.playerId, progress);
        this.#shelterEvents.push({
          playerId: intent.playerId,
          siteId: intent.targetId,
          kind: 'enter',
          at: this.#time,
        });
        if (this.#shelterEvents.length > 4096) this.#shelterEvents.shift();
      }
      return true;
    }
    if (intent.kind === 'charm') {
      const bot = this.#bots.get(intent.targetId);
      if (!bot) return false;
      this.#attemptCharm(intent.playerId, bot, 1, true);
      return true;
    }
    if (intent.kind === 'scan') {
      const player = this.#players.get(intent.playerId);
      const module = this.#firmware.find(intent.targetId);
      const effect = this.#firmware.effectFor(intent.targetId);
      if (!player || !module || !effect) return false;
      const previous = player.firmwareKnowledge.get(module.appearance);
      if (previous?.kind === 'identified') return true;
      const roll = previous?.roll ?? randomInt(1_000_000) / 1_000_000;
      player.firmwareKnowledge.set(
        module.appearance,
        roll <
          identificationChance(
            player.stats.senses,
            player.stats.firmwareIdentification,
          )
          ? { kind: 'identified', effect }
          : { kind: 'failed', roll },
      );
      return true;
    }

    if (intent.kind === 'use-firmware') {
      const existing = this.#firmwareConsumers.get(intent.targetId);
      if (existing) return existing.playerId === intent.playerId;
      for (const [id, consumer] of this.#firmwareConsumers)
        if (consumer.playerId === intent.playerId)
          this.#firmwareConsumers.delete(id);
      this.#firmwareConsumers.set(intent.targetId, {
        playerId: intent.playerId,
        elapsed: 0,
      });
      return true;
    }

    if (intent.kind === 'equipment' && isAbilitySlot(intent.slot)) {
      const player = this.#players.get(intent.playerId);
      if (
        !player ||
        !equip(
          player.equipment,
          intent.slot,
          intent.contentId === '-' ? null : intent.contentId,
        )
      )
        return false;
      if (!player.selection.revise(intent.offerId, intent.revision, this.#time))
        throw new Error('Equipment transaction lost its active offer');
      this.#advanceSelections(this.#time);
      return true;
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
        player.activeReward?.level ?? player.health.level,
        player.carcinisation,
        (this.#content.definition('convergent-evolution')?.detailValues
          ?.chance?.[player.rarities.get('convergent-evolution') ?? '']?.[0] ??
          0) / 100,
      );
      const first = choices[0];
      if (!first) return false;
      const receiptId = `reroll:${intent.offerId}:${intent.revision}`;
      if (
        player.wallet.receipts.has(receiptId) ||
        player.wallet.receipts.size >= 4096
      )
        return false;
      const receipt = transact(
        player.wallet,
        receiptId,
        'spend',
        (player.activeReward?.pool === 'branching' ? 10 : 1) +
          (current.prompt.rerolls ?? 0),
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
      throw new Error('Reroll transaction lost its active offer');
    }
    if (intent.kind === 'upgrade-rarity') {
      const player = this.#players.get(intent.playerId);
      const current = player?.selection.state;
      if (
        !player ||
        current?.kind !== 'protected' ||
        current.prompt.kind !== 'upgrade' ||
        current.prompt.id !== intent.offerId ||
        current.prompt.revision !== intent.revision ||
        this.#time >= current.deadline ||
        player.activeReward?.pool !== 'ordinary'
      )
        return false;
      const choices = player.generatedChoices.map((choice) => {
        const definition = this.#content.definition(choice.id);
        return {
          ...choice,
          rarity:
            (definition && nextRarity(definition, choice.rarity)) ??
            choice.rarity,
        };
      });
      if (
        !choices.some(
          (choice, index) =>
            choice.rarity !== player.generatedChoices[index]?.rarity,
        )
      )
        return false;
      const receiptId = `rarity:${intent.offerId}:${intent.revision}`;
      const cost = 10 * (1 + (current.prompt.rarityPurchases ?? 0));
      if (
        player.wallet.receipts.has(receiptId) ||
        player.wallet.receipts.size >= 4096 ||
        player.wallet.balance < cost
      )
        return false;
      if (!transact(player.wallet, receiptId, 'spend', cost)?.accepted)
        return false;
      if (
        !player.selection.upgradeRarity(
          intent.offerId,
          intent.revision,
          this.#time,
        )
      )
        throw new Error('Rarity transaction lost its active offer');
      player.generatedChoices = choices;
      this.#advanceSelections(this.#time);
      return true;
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
      this.#phase !== 'running' ||
      !player?.connected ||
      player.life.kind !== 'alive' ||
      player.life.activity !== 'playing'
    )
      return;
    const held = (intent.buttons & CONTROL_BUTTON.interact) !== 0;
    const pressedInteract = held && !player.interactHeld;
    player.interactHeld = held;
    if (player.shelter) {
      if (pressedInteract) this.#leaveShelter(player);
      return;
    }
    player.control = { intent, expiresAt: this.#time + CONTROL_EXPIRY_MS };
    player.aim = intent.aim;
    if (!pressedInteract) return;
    const position = player.craft.body.translation();
    const candidates: {
      kind: 'shelter' | 'charm' | 'use-firmware' | 'interaction';
      targetId: string;
      distance: number;
    }[] = [];
    for (const [index, point] of this.#arena.shelters.entries())
      candidates.push({
        kind: 'shelter',
        targetId: `shelter-${index}`,
        distance: Math.hypot(point.x - position.x, point.z - position.z),
      });
    for (const point of this.#pointsOfInterest)
      candidates.push({
        kind: 'interaction',
        targetId: point.id,
        distance: poiDistance(point, position),
      });
    for (const point of this.#firmware.visible())
      candidates.push({
        kind: 'use-firmware',
        targetId: point.id,
        distance: Math.hypot(
          point.position.x - position.x,
          point.position.z - position.z,
        ),
      });
    for (const bot of this.#bots.values()) {
      if (bot.friendship?.playerId !== playerId) continue;
      const point = bot.craft.body.translation();
      candidates.push({
        kind: 'charm',
        targetId: bot.id,
        distance: Math.hypot(point.x - position.x, point.z - position.z),
      });
    }
    for (const candidate of candidates.sort(
      (a, b) => a.distance - b.distance,
    )) {
      if (candidate.distance > Math.max(3, FIRMWARE_SCAN_RANGE)) break;
      const interaction = {
        ...intent,
        kind: candidate.kind,
        targetId: candidate.targetId,
      };
      if (this.consume(interaction)) break;
    }
  }

  #resolveOutcome(finishSurvivor = false): void {
    if (this.#phase !== 'running' || this.#result) return;
    const survivors = [...this.#players].filter(
      ([, player]) => player.life.kind === 'alive',
    );
    if (survivors.length > 1 || (survivors.length === 1 && !finishSurvivor))
      return;
    const lastGroup = this.#eliminationGroups.at(-1);
    const winnerId =
      survivors[0]?.[0] ?? (lastGroup?.length === 1 ? lastGroup[0] : undefined);
    this.#result = {
      outcome:
        this.#players.size === 1
          ? { kind: 'run-ended' }
          : winnerId
            ? { kind: 'winner', playerId: winnerId }
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
          amount:
            (config.boundaryDamagePerSecond *
              (collapsed
                ? 1 + (this.#wallTime - config.collapseAtMs) / 30_000
                : 1) *
              deltaMs) /
            1000,
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
          const projected = {
            x: (position.x * limit) / distance,
            z: (position.z * limit) / distance,
          };
          const candidates: Point[] = [];
          if (arenaPointClear(this.#arena.obstacles, projected, 0.6))
            candidates.push(projected);
          for (
            let x = Math.max(-MAP_RULES.halfExtent + 2, projected.x - 12);
            x <= Math.min(MAP_RULES.halfExtent - 2, projected.x + 12);
            x += 2
          )
            for (
              let z = Math.max(-MAP_RULES.halfExtent + 2, projected.z - 12);
              z <= Math.min(MAP_RULES.halfExtent - 2, projected.z + 12);
              z += 2
            )
              if (
                Math.hypot(x, z) <= limit &&
                arenaPointClear(this.#arena.obstacles, { x, z })
              )
                candidates.push({ x, z });
          const unoccupied = candidates.filter((candidate) =>
            [...this.#players.values()].every((player) => {
              const point = player.craft.body.translation();
              return (
                player.life.kind !== 'alive' ||
                Math.hypot(point.x - candidate.x, point.z - candidate.z) >= 1.5
              );
            }),
          );
          const choices = unoccupied.length ? unoccupied : candidates;
          choices.sort(
            (a, b) =>
              Math.hypot(a.x - position.x, a.z - position.z) -
              Math.hypot(b.x - position.x, b.z - position.z),
          );
          const safe = choices[0] ?? { x: 0, z: 0 };
          bot.craft.body.setTranslation(
            {
              x: safe.x,
              y: position.y,
              z: safe.z,
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
      const distance =
        Math.sqrt(Math.random()) * Math.max(0, radius - config.meteorRadius);
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
    if (
      !Number.isFinite(deltaMs) ||
      deltaMs < 0 ||
      this.#time + deltaMs > Number.MAX_SAFE_INTEGER
    )
      return false;
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
    if (this.#wallAnchor === null) this.#wallTime += deltaMs;
    if (this.#wallTime >= this.#finale.shrinkStartMs)
      this.#worldConditions.add('finale');
    const dt = deltaMs / 1000;
    this.#advanceTrails(this.#time);
    for (const [id, player] of this.#players) {
      if (!player.shelter || player.life.kind !== 'alive') continue;
      const tuning = SOURCE_GAMEPLAY.burrow;
      const contribution = Math.max(
        0.01,
        sourceCurve(tuning.sizeContribution, player.stats.size / 100),
      );
      const previousDecay = this.#shelterDecay.get(player.shelter.id) ?? 0;
      const remainingMs =
        ((1 - previousDecay) * tuning.lifetimeMs) / contribution;
      player.shelter.until = this.#time + remainingMs;
      const shelteredMs = Math.max(0, Math.min(deltaMs, remainingMs));
      const burrowReady = player.equipment.readyAt.get('burrower');
      if (burrowReady !== undefined && burrowReady > this.#time)
        player.equipment.readyAt.set('burrower', burrowReady + shelteredMs);
      const decay = Math.min(
        1,
        previousDecay + (shelteredMs / tuning.lifetimeMs) * contribution,
      );
      this.#shelterDecay.set(player.shelter.id, decay);
      const progress = player.runtimeEffects.shelterProgress(shelteredMs);
      if (progress > 0) this.grantProgress(id, progress);
      const rank = player.ranks.get('hibernation') ?? 0;
      const rarity = player.rarities.get('hibernation') ?? '';
      const hibernation =
        this.#content.definition('hibernation')?.values[rarity]?.[rank - 1] ??
        0;
      if (hibernation > 0) {
        player.hibernationElapsed += shelteredMs;
        while (player.hibernationElapsed >= 1000) {
          player.hibernationElapsed -= 1000;
          this.grantProgress(
            id,
            (levelRequirement(
              player.health.level,
              player.stats.progressRequirement,
            ) *
              hibernation) /
              100,
          );
        }
      }
      if (this.#time + deltaMs >= player.shelter.until) {
        this.#closedShelters.add(
          Number(player.shelter.id.slice('shelter-'.length)),
        );
        this.#leaveShelter(player);
      }
    }
    if (
      !this.#finaleStatsApplied &&
      this.#wallTime >= this.#finale.shrinkStartMs
    ) {
      this.#finaleStatsApplied = true;
      for (const [id, player] of this.#players)
        if (player.life.kind === 'alive')
          this.setModifiers(id, player.modifiers);
    }
    for (const player of this.#players.values())
      if (player.life.kind === 'alive') this.#resizeCraft(player);
    this.#advanceOwnedEntities(deltaMs);
    this.#replenishBots();
    this.#advanceFriendships();
    this.#advanceFirmware(deltaMs);
    if (this.#time >= this.#nextFirmwareSpawn) {
      const bonus = [...this.#players.values()]
        .filter((player) => player.life.kind === 'alive')
        .reduce((sum, player) => sum + player.firmwareSpawnBonus, 0);
      this.#nextFirmwareSpawn = this.#time + 30_000 / (1 + bonus / 100);
      const positions = this.#arena.resources.filter((site) =>
        [...this.#players.values()].some((player) => {
          const point = player.craft.body.translation();
          return (
            player.life.kind === 'alive' &&
            Math.hypot(point.x - site.x, point.z - site.z) < 32
          );
        }),
      );
      const site = positions[this.#firmwareSite++ % positions.length];
      if (
        site &&
        terrainAt(this.#arena, site.x, site.z) !== 'water' &&
        Math.hypot(site.x, site.z) <
          boundaryRadius(this.#wallTime, this.#finale) - 1
      )
        this.#firmware.spawn(site);
    }
    const statusDamage: DamageEvent[] = [];
    for (const [id, player] of this.#players)
      if (player.life.kind === 'alive')
        statusDamage.push(
          ...advanceStatuses(player.statuses, id, this.#time + deltaMs),
        );
    for (const bot of this.#bots.values())
      statusDamage.push(
        ...advanceStatuses(bot.statuses, bot.id, this.#time + deltaMs),
      );
    const attacks: DamageEvent[] = [
      ...this.#finaleDamage(deltaMs),
      ...statusDamage.filter(
        (event) =>
          !event.ownerId ||
          ((this.#players.has(event.ownerId) ||
            this.#bots.has(event.ownerId)) &&
            this.canUseOwnedOffense(event.ownerId)),
      ),
      ...this.#advanceThermal(deltaMs),
      ...this.#advanceBots(deltaMs),
      ...this.#periodicOffense(this.#time + deltaMs),
    ];
    for (let index = this.#projectiles.length - 1; index >= 0; index--) {
      const projectile = this.#projectiles[index];
      if (!projectile) continue;
      const projectileOwner = this.#players.get(projectile.ownerId);
      if (
        !this.canUseOwnedOffense(projectile.ownerId) ||
        (projectile.rootOwner &&
          projectileOwner &&
          this.#hasActiveStatus(projectileOwner.statuses, 'stun'))
      ) {
        this.#projectiles.splice(index, 1);
        continue;
      }
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
      if (
        projectile.abilityId === 'projectile-tongue' &&
        owner?.specializations.has('projectile-tongue-sticky')
      ) {
        const limit = Math.min(speed * step, hit?.timeOfImpact ?? Infinity);
        for (const resource of this.#resources.values()) {
          const dx = resource.position.x - projectile.position.x;
          const dz = resource.position.z - projectile.position.z;
          const along = dx * direction.x + dz * direction.z;
          const lateral = Math.abs(dx * direction.z - dz * direction.x);
          if (along >= 0 && along <= limit && lateral <= 0.75) {
            const origin = owner.craft.body.translation();
            resource.position = { x: origin.x, z: origin.z };
            resource.collectors.clear();
          }
        }
      }
      if (target && target !== projectile.ownerId) {
        attacks.push({
          targetId: target,
          ownerId: projectile.ownerId,
          channel: 'direct',
          origin: 'manual',
          abilityId: projectile.abilityId,
          bypassPlating: projectile.bypassPlating,
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
      if (
        player.life.kind !== 'alive' ||
        player.life.activity !== 'playing' ||
        player.shelter ||
        !player.connected
      ) {
        player.attack = null;
        player.throwCharge = null;
        player.leapCharge = null;
        player.leapRepeatUntil = 0;
        player.dash = null;
        player.channel = null;
        player.moulting = null;
        continue;
      }
      if (player.moulting && player.moulting.until <= this.#time) {
        const points = player.moulting.points;
        player.moulting = null;
        for (let i = 0; i < points; i++) this.#grantPollinatorBonus(id, player);
      }
      const stunned = this.#hasActiveStatus(player.statuses, 'stun');
      if (stunned) player.attack = null;
      if (stunned) {
        player.throwCharge = null;
        player.leapCharge = null;
      }
      const movement = player.control?.intent;
      if (
        player.channel &&
        (stunned ||
          this.#time >= player.channel.until ||
          Math.hypot(movement?.x ?? 0, movement?.y ?? 0) > 0.01 ||
          Math.hypot(
            player.craft.body.translation().x - player.channel.origin.x,
            player.craft.body.translation().z - player.channel.origin.z,
          ) > 0.2)
      )
        player.channel = null;
      const channel = player.channel;
      if (channel && channel.nextAt <= this.#time) {
        channel.nextAt = this.#time + channel.intervalMs;
        const origin = player.craft.body.translation();
        const targets = [
          ...[...this.#players]
            .filter(([targetId]) => targetId !== id)
            .map(([targetId, target]) => ({
              id: targetId,
              craft: target.craft,
            })),
          ...[...this.#bots.values()]
            .filter((bot) => bot.ownerId !== id)
            .map((bot) => ({ id: bot.id, craft: bot.craft })),
        ];
        for (const target of targets) {
          const point = target.craft.body.translation();
          if (
            Math.hypot(point.x - origin.x, point.z - origin.z) > channel.radius
          )
            continue;
          this.applyStatus(target.id, {
            kind: 'stun',
            ownerId: id,
            magnitude: 0,
            duration: channel.stunMs,
          });
          attacks.push({
            targetId: target.id,
            ownerId: id,
            channel: 'direct',
            amount: Math.min(
              1_000_000,
              (channel.damage * player.stats.physical * player.stats.damage) /
                100,
            ),
            depth: 0,
          });
        }
      }
      const controls: readonly [AbilitySlot, number][] = [
        ['primary', CONTROL_BUTTON.primary],
        ['secondary', CONTROL_BUTTON.secondary],
        ['movement', CONTROL_BUTTON.movement],
        ['ultimate', CONTROL_BUTTON.ultimate],
      ];
      if (player.throwCharge) {
        const charge = player.throwCharge;
        const ability = player.equipment.learned.get(charge.abilityId);
        if (
          !ability ||
          ability.action !== 'projectile' ||
          ability.chargeMs === undefined ||
          ability.chargedDamage === undefined ||
          !Object.values(player.equipment.slots).includes(charge.abilityId)
        ) {
          player.throwCharge = null;
        } else if ((player.control?.intent.buttons ?? 0) & charge.button) {
          continue;
        } else {
          const ammo = availableAmmunition(
            player.equipment,
            ability,
            this.#time,
          );
          const fraction = Math.min(
            1,
            Math.max(0, (this.#time - charge.startedAt) / ability.chargeMs),
          );
          const rarity = player.rarities.get(ability.id) ?? 'common';
          const rank = player.ranks.get(ability.id) ?? 1;
          const multiplier = sourceRange(
            SOURCE_GAMEPLAY.stoner.multipliers,
            rarity,
            rank,
          );
          const distance = sourceRange(
            SOURCE_GAMEPLAY.stoner.distances,
            rarity,
            rank,
          );
          const sourceThrow =
            ability.id === 'stoner' && multiplier && distance
              ? { multiplier, distance }
              : null;
          const coefficient = sourceThrow
            ? rollAbilityDamage(ability) *
              (sourceThrow.multiplier.x +
                (sourceThrow.multiplier.y - sourceThrow.multiplier.x) *
                  sourceCurve(SOURCE_GAMEPLAY.stoner.damageCharge, fraction))
            : ability.damage +
              (ability.chargedDamage - ability.damage) * fraction;
          const travelDistance = sourceThrow
            ? sourceThrow.distance.x +
              (sourceThrow.distance.y - sourceThrow.distance.x) *
                sourceCurve(SOURCE_GAMEPLAY.stoner.distanceCharge, fraction)
            : 8 + 20.8 * fraction;
          const damage =
            (coefficient *
              Math.min(player.stats.physical, player.stats.ability) *
              player.stats.damage) /
            100;
          if (
            (!ammo || ammo.charges > 0) &&
            this.launchProjectile(
              id,
              player.aim,
              16,
              (travelDistance / 16) * 1000,
              damage,
              3,
              ability.id,
              ability.bypassPlating,
              ability.rootDuringFlight,
            )
          ) {
            if (ammo && ability.ammunition) {
              if (ammo.charges === ability.ammunition.capacity)
                ammo.nextAt = this.#time + ability.ammunition.reloadMs;
              ammo.charges--;
            }
            this.#recordManualAttack(id, player);
            this.#triggerSpur(id, player, attacks, ability.id);
            player.equipment.readyAt.set(
              ability.id,
              this.#time + (ability.cooldown * player.stats.cooldowns) / 100,
            );
            player.attackReadyAt = this.#time + (ability.recoveryMs ?? 200);
          }
          player.throwCharge = null;
        }
      }
      let leapRelease: number | null = null;
      if (player.leapCharge !== null) {
        if (player.equipment.slots.movement !== 'leap' || !player.control)
          player.leapCharge = null;
        else if (!(player.control.intent.buttons & CONTROL_BUTTON.movement)) {
          leapRelease = Math.min(
            1,
            Math.max(0, (this.#time - player.leapCharge) / 1000),
          );
          player.leapCharge = null;
        }
      }
      if (!stunned && !player.attack && this.#time >= player.attackReadyAt)
        for (const [slot, button] of controls) {
          const abilityId = player.equipment.slots[slot];
          const ability = abilityId && player.equipment.learned.get(abilityId);
          if (
            !ability ||
            (!((player.control?.intent.buttons ?? 0) & button) &&
              !(ability.id === 'leap' && leapRelease !== null)) ||
            (this.#time < (player.equipment.readyAt.get(ability.id) ?? 0) &&
              !(ability.id === 'leap' && player.leapRepeatUntil > this.#time))
          )
            continue;
          if (ability.id === 'leap' && leapRelease === null) {
            if (player.leapCharge === null) player.leapCharge = this.#time;
            break;
          }
          const baseCooldown = Math.min(
            Number.MAX_SAFE_INTEGER,
            ability.cooldown * (player.stats.cooldowns / 100),
          );
          const cooldown = Math.min(
            Number.MAX_SAFE_INTEGER - this.#time,
            baseCooldown *
              (ability.slotType === 'movement'
                ? player.stats.dashCooldown / 100
                : 1) *
              (player.lateralDashes.get(ability.id) ?? 1) *
              (ability.id === 'projectile-tongue' &&
              player.specializations.has('projectile-tongue-whiplash')
                ? 0.5
                : 1),
          );
          const attackDamage = rollAbilityDamage(ability);
          if (
            ability.action === 'strike' ||
            ability.action === 'physical-strike' ||
            ability.action === 'ability-strike' ||
            ability.action === 'social-strike' ||
            ability.action === 'hybrid-strike' ||
            ability.action === 'body-slam'
          ) {
            player.attack = {
              abilityId: ability.id,
              hitAt: this.#time + 200,
              aim: player.aim,
              bypassPlating:
                ability.bypassPlating ||
                (ability.id === 'beak' &&
                  player.specializations.has('beak-sharp')),
              hits: ability.hits,
              range: ability.range,
              impulse:
                ability.id === 'pistol-pincer'
                  ? 2.5 + 2.5 * (player.ranks.get('pistol-pincer') ?? 1)
                  : undefined,
              damage:
                ability.action === 'body-slam'
                  ? ((attackDamage * player.stats.physical +
                      (ability.healthScale ?? 0) * player.stats.maximumHealth) *
                      player.stats.damage) /
                    100
                  : ability.action === 'physical-strike'
                    ? (attackDamage *
                        player.stats.physical *
                        player.stats.damage *
                        (ability.id === 'spur' &&
                        player.specializations.has('spur-primal')
                          ? 1 + player.wallet.balance / 100
                          : 1) *
                        (ability.id === 'jaws' &&
                        player.specializations.has('jaws-neck-bite')
                          ? 0.5
                          : 1) *
                        (ability.id === 'jaws' &&
                        player.specializations.has('jaws-stalker') &&
                        this.#worldClock.view().phase === 'night'
                          ? 1.5
                          : 1)) /
                      100
                    : ability.action === 'ability-strike'
                      ? (attackDamage *
                          player.stats.ability *
                          player.stats.damage) /
                        100
                      : ability.action === 'social-strike'
                        ? (attackDamage *
                            player.stats.social *
                            player.stats.damage) /
                          100
                        : ability.action === 'hybrid-strike'
                          ? (attackDamage *
                              (ability.id === 'pistol-pincer'
                                ? Math.max
                                : Math.min)(
                                player.stats.physical,
                                player.stats.ability,
                              ) *
                              player.stats.damage) /
                            100
                          : attackDamage,
            };
            player.attackReadyAt = this.#time + (ability.recoveryMs ?? 200);
          } else if (ability.action === 'projectile') {
            const ammunition = availableAmmunition(
              player.equipment,
              ability,
              this.#time,
            );
            if (ammunition && ammunition.charges === 0) continue;
            if (ability.chargeMs !== undefined) {
              this.#recordManualAttack(id, player);
              player.throwCharge = {
                abilityId: ability.id,
                button,
                startedAt: this.#time,
              };
              break;
            }
            if (
              !this.launchProjectile(
                id,
                player.aim,
                ability.id === 'projectile-tongue' &&
                  player.specializations.has('projectile-tongue-whiplash')
                  ? 24
                  : 16,
                ability.range === undefined
                  ? 1800
                  : (ability.range /
                      (ability.id === 'projectile-tongue' &&
                      player.specializations.has('projectile-tongue-whiplash')
                        ? 24
                        : 16)) *
                      1000,
                ability.damageBasis === 'hybrid'
                  ? (attackDamage *
                      Math.min(player.stats.physical, player.stats.ability) *
                      player.stats.damage) /
                      100
                  : ability.damageBasis === 'physical'
                    ? ((attackDamage *
                        player.stats.physical *
                        player.stats.damage) /
                        100) *
                      (ability.id === 'projectile-tongue' &&
                      player.specializations.has('projectile-tongue-whiplash')
                        ? player.stats.salvageSpeed / 100
                        : 1)
                    : ability.damageBasis === 'ability'
                      ? (attackDamage *
                          player.stats.ability *
                          player.stats.damage) /
                        100
                      : attackDamage,
                3,
                ability.id,
                ability.bypassPlating,
                ability.rootDuringFlight,
              )
            )
              continue;
            if (ammunition && ability.ammunition) {
              if (ammunition.charges === ability.ammunition.capacity)
                ammunition.nextAt = this.#time + ability.ammunition.reloadMs;
              ammunition.charges--;
            }
            player.attackReadyAt = this.#time + (ability.recoveryMs ?? 200);
          } else if (ability.action === 'guard') {
            player.guard = {
              until: this.#time + ability.durationMs,
              stunMs: ability.stunMs,
              ...(ability.id === 'turtle-down'
                ? { parryUntil: this.#time + 300, damageFactor: 0.05 }
                : {}),
            };
            player.attackReadyAt = this.#time + 200;
          } else if (ability.action === 'repair') {
            this.repairPlayer(
              id,
              ability.repairAmount *
                (ability.scalesWithSalvageSpeed
                  ? player.stats.salvageSpeed / 100
                  : 1),
              false,
            );
            player.attackReadyAt = this.#time + 200;
          } else if (ability.action === 'create-shelter') {
            const position = player.craft.body.translation();
            if (!this.createShelter({ x: position.x, z: position.z })) {
              player.equipment.readyAt.set(ability.id, this.#time + 1000);
              continue;
            }
            player.attackReadyAt = this.#time + 200;
          } else if (ability.action === 'moult') {
            if (
              !this.applyStatus(id, {
                kind: 'stun',
                ownerId: id,
                magnitude: 0,
                duration: ability.stunMs,
              })
            )
              continue;
            player.moulting = {
              until: this.#time + ability.stunMs,
              damage: 0,
              points: player.carcinisation,
            };
            player.attackReadyAt = this.#time + 200;
          } else if (ability.action === 'contact-boost') {
            player.contactBoost = {
              until: this.#time + ability.durationMs,
              perAffinity: ability.perAffinity,
            };
            player.attackReadyAt = this.#time + 200;
          } else if (ability.action === 'speed-boost') {
            player.speedBoost = {
              until: this.#time + ability.durationMs,
              multiplier: ability.speedMultiplier,
            };
            this.setModifiers(id, player.modifiers);
            player.attackReadyAt = this.#time + 200;
          } else if (ability.action === 'capture') {
            const origin = player.craft.body.translation();
            const reserved = [...this.#nestDefenses.values()].filter(
              (item) => item.ownerId === id,
            ).length;
            const target = [...this.#bots.values()]
              .filter(
                (bot) =>
                  bot.health > 0 &&
                  bot.ownerId !== id &&
                  (bot.kind === 'wild' || bot.kind === 'charmed') &&
                  Math.hypot(
                    bot.craft.body.translation().x - origin.x,
                    bot.craft.body.translation().z - origin.z,
                  ) <= ability.range,
              )
              .sort(
                (a, b) =>
                  Math.hypot(
                    a.craft.body.translation().x - origin.x,
                    a.craft.body.translation().z - origin.z,
                  ) -
                  Math.hypot(
                    b.craft.body.translation().x - origin.x,
                    b.craft.body.translation().z - origin.z,
                  ),
              )[0];
            if (
              !target ||
              this.#ownedCount(id, 'charmed') + reserved >=
                this.#charmCapacity(id)
            ) {
              player.equipment.readyAt.set(ability.id, this.#time + 2000);
              continue;
            }
            this.#attemptCharm(id, target, 1, true);
            player.attackReadyAt = this.#time + 200;
          } else if (ability.action === 'slow-field') {
            if (this.#trails.length >= 128) continue;
            const origin = player.craft.body.translation();
            if (
              ability.id === 'spinnerets' &&
              this.#trails.some(
                (trail) =>
                  trail.kind === 'web' &&
                  Math.hypot(
                    trail.position.x - origin.x,
                    trail.position.z - origin.z,
                  ) < 2,
              )
            )
              continue;
            if (
              ability.id === 'spinnerets' &&
              player.specializations.has('spinnerets-egg-sac')
            )
              this.scheduleAlly(id, 'offspring', ability.durationMs, 30000, {
                x: origin.x,
                z: origin.z,
              });
            this.#trails.push({
              kind: ability.id === 'spinnerets' ? 'web' : undefined,
              trapped:
                ability.id === 'spinnerets' &&
                player.specializations.has('spinnerets-trap')
                  ? new Set<string>()
                  : undefined,
              id: ++this.#nextTrailId,
              ownerId: id,
              position: { x: origin.x, z: origin.z },
              radius: Math.min(
                20,
                (ability.radius * player.stats.effectArea) / 100,
              ),
              slowPercent: ability.slowPercent,
              until: this.#time + ability.durationMs,
              ...(ability.status
                ? {
                    status: {
                      effect: { ...ability.status },
                      nextAt: this.#time,
                    },
                  }
                : {}),
            });
            player.attackReadyAt = this.#time + 200;
          } else if (ability.action === 'delayed-boost') {
            if (
              !this.applyStatus(id, {
                kind: 'stun',
                ownerId: id,
                magnitude: 0,
                duration: ability.stunMs,
              })
            )
              continue;
            const startsAt = this.#time + ability.stunMs;
            player.delayedBoost = {
              startsAt,
              endsAt: startsAt + ability.durationMs,
              physical: ability.physicalPerPoint * player.carcinisation,
              ability: ability.abilityPerPoint * player.carcinisation,
              active: false,
            };
            this.setModifiers(id, player.modifiers);
            player.attackReadyAt = this.#time + 200;
          } else if (ability.action === 'stationary-channel') {
            if (
              player.channel ||
              Math.hypot(movement?.x ?? 0, movement?.y ?? 0) > 0.01
            )
              continue;
            const origin = player.craft.body.translation();
            player.channel = {
              until: this.#time + ability.durationMs,
              nextAt: this.#time,
              origin: { x: origin.x, z: origin.z },
              intervalMs: ability.intervalMs,
              radius: Math.min(
                100,
                (ability.radius * player.stats.effectArea) / 100,
              ),
              stunMs: ability.stunMs,
              damage: attackDamage,
            };
            player.attackReadyAt = this.#time + 200;
          } else if (ability.action === 'area-status') {
            const origin = player.craft.body.translation();
            const radius = Math.min(
              100,
              (ability.radius * player.stats.effectArea) / 100,
            );
            const status = {
              kind: ability.status,
              ownerId: id,
              magnitude: ability.magnitude,
              duration: ability.durationMs,
            };
            for (const [targetId, target] of this.#players) {
              if (targetId === id) continue;
              const point = target.craft.body.translation();
              if (Math.hypot(point.x - origin.x, point.z - origin.z) <= radius)
                this.applyStatus(targetId, status);
            }
            for (const bot of this.#bots.values()) {
              const point = bot.craft.body.translation();
              if (
                bot.ownerId !== id &&
                Math.hypot(point.x - origin.x, point.z - origin.z) <= radius
              )
                this.applyStatus(bot.id, status);
            }
            player.attackReadyAt = this.#time + 200;
          } else if (ability.action === 'charge') {
            if (this.#isRooted(id)) continue;
            player.dash = {
              x: Math.sin(player.aim),
              z: Math.cos(player.aim),
              until: this.#time + 200,
              charge: {
                abilityId: ability.id,
                damage:
                  (ability.damage *
                    player.stats.physical *
                    player.stats.damage) /
                  100,
              },
            };
            player.attackReadyAt = this.#time + 200;
          } else if (ability.action === 'dash') {
            if (this.#isRooted(id)) continue;
            const input = player.control?.intent;
            const magnitude = Math.hypot(input?.x ?? 0, input?.y ?? 0);
            const sideways = player.lateralDashes.has(ability.id);
            const lateralX = Math.cos(player.aim);
            const lateralZ = -Math.sin(player.aim);
            const sign =
              (input?.x ?? 0) * lateralX + (input?.y ?? 0) * lateralZ < 0
                ? -1
                : 1;
            player.dash = {
              x: sideways
                ? lateralX * sign
                : magnitude
                  ? (input?.x ?? 0) / magnitude
                  : Math.sin(player.aim),
              z: sideways
                ? lateralZ * sign
                : magnitude
                  ? (input?.y ?? 0) / magnitude
                  : Math.cos(player.aim),
              until: this.#time + (ability.durationMs ?? 200),
              speed:
                ((ability.distance ?? 4.5) *
                  (ability.id === 'slide' &&
                  terrainAt(
                    this.#arena,
                    player.craft.body.translation().x,
                    player.craft.body.translation().z,
                  ) === 'snow'
                    ? 1.15
                    : 1)) /
                ((ability.durationMs ?? 200) / 1000),
              leap: ability.id === 'leap',
              ...(ability.id === 'jet' ? { jetNextAt: this.#time } : {}),
            };
            if (ability.id === 'leap') {
              const start = player.craft.body.translation();
              const direction = player.dash;
              const distance =
                (ability.distance ?? 6.5) * (1 + (leapRelease ?? 0) * 0.5);
              if (player.specializations.has('leap-bouncy'))
                player.leapRepeatUntil =
                  player.leapRepeatUntil > this.#time ? 0 : this.#time + 2500;
              let landing = { x: start.x, z: start.z };
              for (let step = 1; step <= 40; step++) {
                const candidate = {
                  x: start.x + (direction.x * distance * step) / 40,
                  z: start.z + (direction.z * distance * step) / 40,
                };
                if (
                  Math.abs(candidate.x) >= MAP_RULES.halfExtent - 1 ||
                  Math.abs(candidate.z) >= MAP_RULES.halfExtent - 1
                )
                  break;
                if (
                  arenaPointClear(
                    this.#arena.obstacles,
                    candidate,
                    player.craft.collider.radius(),
                  )
                )
                  landing = candidate;
              }
              player.craft.body.setTranslation(
                { x: landing.x, y: start.y, z: landing.z },
                true,
              );
              player.dash.speed = 0;
              if (player.specializations.has('leap-heavy')) {
                const targets = [...this.#players.entries()]
                  .filter(
                    ([targetId, target]) =>
                      targetId !== id && target.life.kind === 'alive',
                  )
                  .map(([targetId, target]) => ({
                    id: targetId,
                    craft: target.craft,
                  }));
                targets.push(
                  ...[...this.#bots.values()]
                    .filter(
                      (target) => target.ownerId !== id && target.health > 0,
                    )
                    .map((target) => ({ id: target.id, craft: target.craft })),
                );
                for (const target of targets) {
                  const point = target.craft.body.translation();
                  if (
                    Math.hypot(point.x - landing.x, point.z - landing.z) <=
                    2 + target.craft.collider.radius()
                  )
                    attacks.push({
                      targetId: target.id,
                      ownerId: id,
                      channel: 'direct',
                      amount: (player.stats.physical * player.stats.size) / 100,
                      depth: 0,
                    });
                }
              }
            }
            player.invulnerableUntil =
              this.#time + (ability.invulnerabilityMs ?? 0);
            player.attackReadyAt = this.#time + 200;
          }
          if (slot === 'primary' || slot === 'secondary') {
            this.#recordManualAttack(id, player);
            this.#triggerSpur(id, player, attacks, ability.id);
          }
          player.equipment.readyAt.set(ability.id, this.#time + cooldown);
          break;
        }
      if (
        !stunned &&
        !player.attack &&
        !player.equipment.slots.primary &&
        this.#time >= (player.equipment.readyAt.get('bop') ?? 0) &&
        this.#time >= player.attackReadyAt &&
        ((player.control?.intent.buttons ?? 0) & CONTROL_BUTTON.primary) !== 0
      ) {
        player.attack = {
          abilityId: 'bop',
          hitAt: this.#time + 200,
          aim: player.aim,
          damage:
            ((SOURCE_ACTIONS.bop.damageRange.x +
              Math.random() *
                (SOURCE_ACTIONS.bop.damageRange.y -
                  SOURCE_ACTIONS.bop.damageRange.x)) *
              player.stats.physical *
              player.stats.damage) /
            100,
        };
        player.attackReadyAt = this.#time + 200;
        player.equipment.readyAt.set(
          'bop',
          this.#time +
            Math.max(
              SOURCE_ACTIONS.bop.recoveryMs,
              (SOURCE_ACTIONS.bop.cooldownMs * player.stats.cooldowns) / 100,
            ),
        );
        this.#recordManualAttack(id, player);
        this.#triggerSpur(id, player, attacks, 'bop');
      }
      if (player.dash?.charge && this.#time < player.dash.until) {
        const origin = player.craft.body.translation();
        const hit = this.#world.castRay(
          new RAPIER.Ray(origin, { x: player.dash.x, y: 0, z: player.dash.z }),
          player.craft.collider.radius() +
            (22.5 * Math.min(deltaMs, player.dash.until - this.#time)) / 1000,
          true,
          RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
          undefined,
          player.craft.collider,
        );
        if (hit) {
          const target = this.#combatantAtCollider(hit.collider.handle);
          if (target && target !== id)
            attacks.push({
              targetId: target,
              ownerId: id,
              channel: 'contact',
              origin: 'manual',
              abilityId: player.dash.charge.abilityId,
              bypassPlating: true,
              amount: player.dash.charge.damage,
              depth: 0,
            });
          player.dash = null;
        }
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
          (player.attack.range ?? 1.5) *
            Math.min(4, player.stats.attackArea / 100) +
            player.craft.collider.radius(),
          true,
          RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
          undefined,
          player.craft.collider,
        );
        const target = hit && this.#combatantAtCollider(hit.collider.handle);
        if (
          player.attack.abilityId === 'beak' &&
          player.specializations.has('beak-long')
        ) {
          const direction = {
            x: Math.sin(player.attack.aim),
            z: Math.cos(player.attack.aim),
          };
          const maximum = Math.min(
            (player.attack.range ?? 1.5) *
              Math.min(4, player.stats.attackArea / 100) +
              player.craft.collider.radius(),
            hit?.timeOfImpact ?? Infinity,
          );
          const site = this.#arena.shelters
            .map((position, index) => ({
              position,
              index,
              along:
                (position.x - origin.x) * direction.x +
                (position.z - origin.z) * direction.z,
              lateral: Math.abs(
                (position.x - origin.x) * direction.z -
                  (position.z - origin.z) * direction.x,
              ),
            }))
            .filter(
              (candidate) =>
                !this.#closedShelters.has(candidate.index) &&
                candidate.along >= 0 &&
                candidate.along <= maximum &&
                candidate.lateral <= 1 &&
                ![...this.#players.values()].some(
                  (other) => other.shelter?.id === `shelter-${candidate.index}`,
                ),
            )
            .sort((a, b) => a.along - b.along)[0];
          if (
            site &&
            this.#createResource({
              position: site.position,
              source: 'vegetation',
              rarity: 'common',
              killerId: id,
              ownerId: id,
              killerKind: 'player',
              repair: false,
            })
          )
            this.#closedShelters.add(site.index);
        }
        if (target && target !== id)
          for (
            let hitIndex = 0;
            hitIndex < (player.attack.hits ?? 1);
            hitIndex++
          )
            attacks.push({
              targetId: target,
              ownerId: id,
              channel: 'contact',
              origin: 'manual',
              abilityId: player.attack.abilityId,
              bypassPlating: player.attack.bypassPlating,
              amount: player.attack.damage,
              depth: 0,
              impulse: {
                x: Math.sin(player.attack.aim) * (player.attack.impulse ?? 2),
                z: Math.cos(player.attack.aim) * (player.attack.impulse ?? 2),
              },
            });
        player.attack = null;
      }
    }
    for (const player of this.#players.values()) {
      if (player.life.kind !== 'alive') continue;
      const remaining: typeof player.deferredDamage = [];
      for (const item of player.deferredDamage) {
        if (item.at <= this.#time + deltaMs) attacks.push(item.event);
        else remaining.push(item);
      }
      player.deferredDamage = remaining;
    }
    this.damageBatch(attacks);
    this.#resolveOutcome();
    if (this.#phase !== 'running') return true;
    this.#replenishResources();
    this.#advanceResources(deltaMs);
    for (const player of this.#players.values()) {
      for (const [source, effect] of player.temporaryPoi)
        if (effect.until <= this.#time) player.temporaryPoi.delete(source);
    }
    for (const [id, player] of this.#players) {
      if (player.life.kind !== 'alive' || !player.connected) continue;
      const position = player.craft.body.translation();
      for (const point of this.#pointsOfInterest)
        if (discoverPointOfInterest(point, id, position)) {
          this.#discoveries.push({ playerId: id, siteId: point.id });
          const pollinatorRank = player.ranks.get('pollinator') ?? 0;
          if (pollinatorRank > 0) {
            player.pollinatorDiscoveries++;
            player.pollinatorSinceBonus++;
            const interval =
              this.#content.definition('pollinator')?.values.branching?.[
                pollinatorRank - 1
              ] ?? 4;
            if (player.pollinatorSinceBonus >= interval) {
              player.pollinatorSinceBonus = 0;
              this.#grantPollinatorBonus(id, player);
            }
          }
          const progress = player.runtimeEffects.discoveryProgress();
          if (progress > 0) this.grantProgress(id, progress);
          const nomadicRank = player.ranks.get('nomadic') ?? 0;
          const nomadicRarity = player.rarities.get('nomadic') ?? '';
          const nomadic =
            this.#content.definition('nomadic')?.values[nomadicRarity]?.[
              nomadicRank - 1
            ] ?? 0;
          if (nomadic > 0)
            this.grantProgress(
              id,
              (levelRequirement(
                player.health.level,
                player.stats.progressRequirement,
              ) *
                nomadic) /
                100,
            );
          const bonus = player.runtimeEffects.discoveryBonuses();
          if (bonus.modifiers.length) {
            const ids = new Set(bonus.modifiers.map((modifier) => modifier.id));
            this.setModifiers(id, [
              ...player.modifiers.filter((modifier) => !ids.has(modifier.id)),
              ...bonus.modifiers,
            ]);
          }
          if (
            bonus.vegetation > 0 &&
            this.#resources.size < MAX_RESOURCES &&
            ![...this.#resources.values()].some(
              (resource) =>
                Math.hypot(
                  resource.position.x - position.x,
                  resource.position.z - position.z,
                ) < 1,
            )
          )
            this.#createResource({
              position: { x: position.x, z: position.z },
              source: 'vegetation',
              rarity: 'common',
              killerId: null,
              ownerId: id,
              killerKind: null,
              repair: false,
            });
        }
    }
    for (const [id, player] of this.#players) {
      if (player.life.kind !== 'alive') continue;
      if (
        player.specializations.has('scales-basking') &&
        player.connected &&
        player.life.activity === 'playing' &&
        !player.shelter &&
        this.#worldClock.view().phase === 'day'
      ) {
        const point = player.craft.body.translation();
        if (
          terrainRegionAt(this.#arena, point.x, point.z)?.terrain === 'sand'
        ) {
          player.baskingElapsed += deltaMs;
          let grants = 0;
          while (player.baskingElapsed >= 8_000 && grants++ < 64) {
            player.baskingElapsed -= 8_000;
            const required = levelRequirement(
              player.health.level,
              player.stats.progressRequirement,
            );
            this.grantProgress(
              id,
              Math.min(
                1_000_000,
                (required * player.stats.heatAdaptation) / 1000,
              ),
            );
          }
        }
      }
      const unharmed = player.connected
        ? player.runtimeEffects.unharmedProgress(
            this.#time,
            this.#time + deltaMs,
            player.affinities.get('Prey') ?? 0,
          )
        : 0;
      const progress = player.stats.passiveProgress * dt + unharmed;
      if (progress > 0) this.grantProgress(id, progress);
      if (
        player.connected &&
        player.life.activity === 'playing' &&
        !player.shelter
      ) {
        const stored = player.runtimeEffects.consumeStoredProgress(deltaMs);
        if (stored > 0) this.grantProgress(id, stored);
      }
    }
    for (const [playerId, player] of this.#players) {
      if (player.life.kind !== 'alive') continue;
      if (player.control && player.control.expiresAt <= this.#time)
        player.control = null;
      if (player.life.kind === 'alive')
        this.repairPlayer(
          playerId,
          (player.stats.regeneration * dt) / 10 +
            (this.#time < player.firmwareHealUntil
              ? (player.stats.maximumHealth *
                  0.05 *
                  Math.min(deltaMs, player.firmwareHealUntil - this.#time)) /
                1000
              : 0),
          false,
        );
      const input =
        player.shelter ||
        this.#isRooted(playerId) ||
        this.#hasActiveStatus(player.statuses, 'stun')
          ? { x: 0, y: 0 }
          : (player.control?.intent ?? { x: 0, y: 0 });
      const slow = Math.min(
        1,
        player.statuses
          .filter(
            (status) => status.kind === 'slow' && this.#statusIsActive(status),
          )
          .reduce((sum, status) => sum + status.magnitude, 0) /
          100 +
          this.#trailSlow(playerId, player.craft.body.translation()),
      );
      const attackFactor =
        this.#time < player.attackReadyAt
          ? Math.max(
              0,
              Math.min(1, 1 - (0.3 * player.stats.attackPenalty) / 100),
            )
          : 1;
      const point = player.craft.body.translation();
      if (player.obstacleSpeed) {
        const boost = player.obstacleSpeed;
        const nearby = this.#arena.obstacles.slice(4).filter((box) => {
          const dx = Math.max(0, Math.abs(point.x - box.x) - box.width / 2);
          const dz = Math.max(0, Math.abs(point.z - box.z) - box.depth / 2);
          return Math.hypot(dx, dz) <= boost.range;
        }).length;
        const target = Math.min(
          boost.maxBonus,
          nearby * boost.bonusPerObstacle,
        );
        boost.bonus =
          target >= boost.bonus
            ? target
            : Math.max(target, boost.bonus - boost.decayPerSecond * dt);
      }
      const region = terrainRegionAt(this.#arena, point.x, point.z);
      const speed =
        (player.stats.speed / BASE_STATS.speed) *
        (1 + (player.obstacleSpeed?.bonus ?? 0)) *
        (this.terrainMovementFactor(
          playerId,
          region?.terrain ?? 'grass',
          region?.waterDepth,
        ) ?? 1) *
        (player.thermal.cold >= 100 ? THERMAL_RULES.coldSpeedFactor : 1) *
        (this.#time < player.firmwareSpeedUntil ? 1.2 : 1);
      const movement = {
        x: input.x * (1 - slow) * attackFactor * speed,
        y: input.y * (1 - slow) * attackFactor * speed,
      };
      if (this.#isRooted(playerId)) {
        const velocity = player.craft.body.linvel();
        player.craft.body.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
        player.dash = null;
      } else if (
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
            x: player.dash.x * (player.dash.speed ?? 22.5) * factor,
            y: velocity.y,
            z: player.dash.z * (player.dash.speed ?? 22.5) * factor,
          },
          true,
        );
      } else {
        if (player.dash) {
          const velocity = player.craft.body.linvel();
          player.craft.body.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
          if (
            !player.dash.charge &&
            player.specializations.has('fur-snow-dive') &&
            terrainAt(this.#arena, point.x, point.z) === 'snow' &&
            Math.random() < (player.dash.leap ? 0.4 : 0.2)
          ) {
            const countRoll = Math.random();
            const count =
              countRoll < 0.2
                ? 1
                : countRoll < 0.6
                  ? 2
                  : countRoll < 0.9
                    ? 3
                    : 4;
            for (let i = 0; i < count; i++) {
              const angle = Math.random() * Math.PI * 2;
              const distance = 1 + Math.random();
              const roll = Math.random();
              this.#createResource({
                position: {
                  x: point.x + Math.cos(angle) * distance,
                  z: point.z + Math.sin(angle) * distance,
                },
                source: 'vegetation',
                rarity:
                  roll < 0.75
                    ? 'common'
                    : roll < 0.94
                      ? 'rare'
                      : roll < 0.99
                        ? 'epic'
                        : 'legendary',
                killerId: null,
                ownerId: null,
                killerKind: null,
                repair: false,
              });
            }
          }
        }
        player.dash = null;
        steerCraft(player.craft.body, movement, dt);
      }
    }
    this.#advancePulls(deltaMs);
    this.#world.timestep = dt;
    this.#world.step();
    this.#time += deltaMs;
    for (const [id, player] of this.#players) {
      if (player.life.kind !== 'alive') continue;
      const speedExpired =
        !!player.speedBoost && player.speedBoost.until <= this.#time;
      if (speedExpired) player.speedBoost = null;
      const runtimeExpired = player.runtimeEffects.expire(this.#time);
      const boost = player.delayedBoost;
      const boostActive =
        !!boost && boost.startsAt <= this.#time && boost.endsAt > this.#time;
      const boostChanged = !!boost && boost.active !== boostActive;
      if (boost) boost.active = boostActive;
      if (boost && boost.endsAt <= this.#time) player.delayedBoost = null;
      if (speedExpired || runtimeExpired || boostChanged)
        this.setModifiers(id, player.modifiers);
    }
    const previousLightPhase = this.#worldClock.view().phase;
    this.#worldClock.advance(this.#time);
    const lightPhase = this.#worldClock.view().phase;
    this.#worldConditions.delete(lightPhase === 'day' ? 'night' : 'day');
    this.#worldConditions.add(lightPhase);
    if (lightPhase !== previousLightPhase) {
      for (const [id, player] of this.#players) {
        if (
          player.life.kind !== 'alive' ||
          (player.phaseModifiers.size === 0 &&
            !player.specializations.has('snout-whiskers'))
        )
          continue;
        player.stats = this.#phaseStats(player, lightPhase);
        updateHealthStats(player.health, player.stats);
        this.grantProgress(id, 0);
      }
    }
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
    const projection = projectionId
      ? this.#players.get(projectionId)
      : undefined;
    const origin = projection?.craft.body.translation();
    const terrainCenter = origin
      ? {
          x:
            Math.round(origin.x / MAP_RULES.regionWidth) *
            MAP_RULES.regionWidth,
          z:
            Math.round(origin.z / MAP_RULES.regionDepth) *
            MAP_RULES.regionDepth,
        }
      : null;
    const clock = this.#worldClock.view();
    const weather = regionalWeather(this.#time, clock);
    const localWeather = origin
      ? weather.find(
          (item) => item.biome === terrainAt(this.#arena, origin.x, origin.z),
        )
      : undefined;
    const sight = projection
      ? sightRange(projection.stats.senses, clock.phase, localWeather)
      : 0;
    const visibleAt = (point: Point) =>
      !!origin &&
      (this.#phase !== 'running' ||
        Math.hypot(point.x - origin.x, point.z - origin.z) <= sight);
    const visiblePlayer = (id: string, player: Player) =>
      id === viewerId ||
      this.#phase !== 'running' ||
      (!!projectionId &&
        (id === projectionId ||
          (player.life.kind === 'alive' &&
            !this.#hiddenPlayers.get(projectionId)?.has(id) &&
            visibleAt(player.craft.body.translation()))));
    const visiblePlayerIds = new Set(
      [...this.#players]
        .filter(([id, player]) => visiblePlayer(id, player))
        .map(([id]) => id),
    );
    const radar: RadarHint[] = [];
    if (origin && projection && this.#phase === 'running') {
      const range = radarRange(projection.stats.senses);
      for (const site of this.#pointsOfInterest) {
        if (site.claim.kind === 'claimed') continue;
        const hint = radarHint('poi', origin, site.position, range);
        if (hint) radar.push(hint);
      }
      if (projection.ranks.has('snout'))
        for (const module of this.#firmware.visible()) {
          if (visibleAt(module.position)) continue;
          const hint = radarHint('firmware', origin, module.position, range);
          if (hint) radar.push(hint);
        }
      for (const bot of this.#bots.values()) {
        const point = bot.craft.body.translation();
        if (!bot.elite || visibleAt(point)) continue;
        const hint = radarHint(
          'elite',
          origin,
          point,
          projection.ranks.has('tracker') ? range * 2 : range,
        );
        if (hint) radar.push(hint);
      }
    }
    const uniqueRadar = [
      ...new Map(
        radar.map((hint) => [
          `${hint.kind}:${hint.direction}:${hint.distance}`,
          hint,
        ]),
      ).values(),
    ].sort((a, b) =>
      `${a.kind}:${a.direction}:${a.distance}`.localeCompare(
        `${b.kind}:${b.direction}:${b.distance}`,
      ),
    );
    return {
      id: this.#id,
      roundId: this.#roundId,
      phase: this.#phase,
      result: this.#result ? structuredClone(this.#result) : null,
      arena: {
        terrain: terrainCenter
          ? this.#arena.terrain.filter(
              (region) =>
                Math.abs(region.x - terrainCenter.x) <=
                  region.width / 2 + MAP_RULES.viewDistance &&
                Math.abs(region.z - terrainCenter.z) <=
                  region.depth / 2 + MAP_RULES.viewDistance,
            )
          : [],
        obstacles: terrainCenter
          ? this.#arena.obstacles.filter(
              (box) =>
                Math.abs(box.x - terrainCenter.x) <=
                  box.width / 2 + MAP_RULES.viewDistance &&
                Math.abs(box.z - terrainCenter.z) <=
                  box.depth / 2 + MAP_RULES.viewDistance,
            )
          : [],
      },
      worldClock: clock,
      weather,
      thermal: projection ? { ...projection.thermal } : null,
      radar: uniqueRadar,
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
        ? this.#meteors
            .filter(
              (meteor) =>
                visibleAt(meteor.position) ||
                (!!origin &&
                  Math.hypot(
                    meteor.position.x - origin.x,
                    meteor.position.z - origin.z,
                  ) <=
                    sight + meteor.radius),
            )
            .map((meteor) => ({
              ...meteor,
              position: { ...meteor.position },
            }))
        : [],
      loadingError: this.#loadingError,
      loadingRevision: this.#loadingRevision,
      equipment: {
        basicReadyAt: viewer.equipment.readyAt.get('bop') ?? 0,
        slots: { ...viewer.equipment.slots },
        learned: [...viewer.equipment.learned.values()].map((ability) => {
          const ammo =
            ability.action === 'projectile' && ability.ammunition
              ? ammunitionView(viewer.equipment, ability, this.#time)
              : null;
          return {
            id: ability.id,
            slotType: ability.slotType,
            readyAt: viewer.equipment.readyAt.get(ability.id) ?? 0,
            ...(ammo && ability.action === 'projectile' && ability.ammunition
              ? {
                  ammunition: {
                    ...ammo,
                    capacity: ability.ammunition.capacity,
                  },
                }
              : {}),
          };
        }),
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
        storedSalvage: [...this.#resources.values()].filter(
          (resource) => resource.storedBy === viewerId,
        ).length,
        basking: viewer.specializations.has('scales-basking')
          ? {
              active:
                viewer.connected &&
                viewer.life.kind === 'alive' &&
                viewer.life.activity === 'playing' &&
                !viewer.shelter &&
                clock.phase === 'day' &&
                terrainAt(
                  this.#arena,
                  viewer.craft.body.translation().x,
                  viewer.craft.body.translation().z,
                ) === 'sand',
              remainingMs: Math.max(0, 8_000 - viewer.baskingElapsed),
            }
          : null,
        currency: viewer.wallet.balance,
        affinities: [...viewer.affinities].map(([id, rank]) => ({ id, rank })),
        upgrades: [...viewer.ranks].flatMap(([id, rank]) => {
          const description = this.#content.describe(
            id,
            viewer.rarities.get(id) ?? '',
            rank,
          );
          return description ? [description] : [];
        }),
        carcinisation: viewer.carcinisation,
        carcinisationDamage: carcinisationDamage(viewer.carcinisation),
        carcinisationRarity: Math.min(
          1,
          viewer.carcinisation * CARCINISATION_RARITY_PER_POINT,
        ),
      },
      bots: [...(projectionId ? this.#bots.values() : [])]
        .filter((bot) => visibleAt(bot.craft.body.translation()))
        .map((bot) => ({
          id: bot.id,
          tier: bot.tier,
          role: bot.role,
          biome: bot.biome,
          elite: bot.elite,
          ownerId: bot.ownerId,
          kind: bot.kind,
          radius: bot.craft.collider.radius(),
          position: bot.craft.body.translation(),
          health: bot.health,
          maxHealth: bot.maxHealth,
          attacking: bot.windupUntil !== null,
          friendshipUntil:
            bot.friendship?.playerId === viewerId ? bot.friendship.until : null,
        })),
      shelters: this.#arena.shelters
        .map((position, index) => ({
          id: `shelter-${index}`,
          position,
          remainingFraction: Math.max(
            0,
            1 - (this.#shelterDecay.get(`shelter-${index}`) ?? 0),
          ),
          occupied: [...this.#players.values()].some(
            (player) => player.shelter?.id === `shelter-${index}`,
          ),
        }))
        .filter(
          (site) =>
            !this.#closedShelters.has(Number(site.id.slice('shelter-'.length))),
        )
        .filter((site) => !!projectionId && visibleAt(site.position)),
      firmwareSensory: {
        distortion:
          !!projection && projection.firmwareDistortionUntil > this.#time,
        deafened: !!projection && projection.firmwareDeafUntil > this.#time,
      },
      nestDefenses: [...this.#nestDefenses.values()]
        .filter((item) => item.ownerId === viewerId)
        .map((item) => ({
          siteId: item.siteId,
          endsAt: item.endsAt,
          health: Math.max(0, item.health),
        })),
      lastCharm: viewer.lastCharm,
      lastFirmware: viewer.lastFirmware,
      firmware: this.#firmware
        .visible()
        .filter((module) => !!projectionId && visibleAt(module.position))
        .map((module) => {
          const knowledge = viewer.firmwareKnowledge.get(module.appearance);
          return {
            ...module,
            knowledge:
              knowledge?.kind === 'identified'
                ? { kind: 'identified' as const, effect: knowledge.effect }
                : knowledge?.kind === 'failed'
                  ? { kind: 'failed' as const }
                  : { kind: 'unknown' as const },
          };
        }),
      pointsOfInterest: this.#pointsOfInterest
        .filter((point) => !!projectionId && visibleAt(point.position))
        .map((point) => ({
          id: point.id,
          kind: point.kind,
          position: { ...point.position },
          status: point.claim.kind,
          discovered: !!projectionId && point.discoveredBy.has(projectionId),
        })),
      resources: [...(projectionId ? this.#resources.values() : [])]
        .filter(
          (resource) =>
            resource.storedBy === null && visibleAt(resource.position),
        )
        .map((resource) => ({
          id: resource.id,
          position: { ...resource.position },
          source: resource.source,
          rarity: resource.rarity,
          stage: resource.stage,
          repair: healingFood(
            resource,
            resource.rarity,
            viewer.stats.repairFoodChance,
          ),
        })),
      projectiles: this.#projectiles
        .filter(
          ({ ownerId }) => !!projectionId && visiblePlayerIds.has(ownerId),
        )
        .filter((projectile) => visibleAt(projectile.position))
        .map(({ id, position }) => ({ id, position: { ...position } })),
      trails: this.#trails
        .filter(
          (trail) =>
            !!projectionId &&
            visiblePlayerIds.has(trail.ownerId) &&
            visibleAt(trail.position) &&
            this.canUseOwnedOffense(trail.ownerId),
        )
        .map(({ id, position, radius }) => ({
          id,
          position: { ...position },
          radius,
        })),
      countdown:
        this.#phase === 'countdown' ? Math.max(0, this.#countdown) : null,
      offer: (() => {
        const offer = this.#offers.get(viewerId);
        if (!offer) return null;
        const state = viewer.selection.state;
        const details =
          state.kind === 'protected' && state.prompt.kind === 'poi'
            ? [...viewer.poiChoices].flatMap(([id, choice]) => {
                if (!choice.upgrade) return [];
                const description = this.#describeAcquisition(
                  viewer,
                  choice.upgrade,
                );
                return description ? [{ ...description, id }] : [];
              })
            : viewer.generatedChoices.flatMap((choice) => {
                const description = this.#describeAcquisition(viewer, choice);
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
                ...(state.prompt.kind === 'upgrade'
                  ? {
                      rerollCost:
                        (viewer.activeReward?.pool === 'branching' ? 10 : 1) +
                        (state.prompt.rerolls ?? 0),
                      rarityCost:
                        viewer.activeReward?.pool === 'ordinary' &&
                        viewer.generatedChoices.some((choice) => {
                          const definition = this.#content.definition(
                            choice.id,
                          );
                          return (
                            definition && nextRarity(definition, choice.rarity)
                          );
                        })
                          ? 10 * (1 + (state.prompt.rarityPurchases ?? 0))
                          : null,
                    }
                  : {}),
                protected:
                  state.prompt.kind !== 'poi' || state.prompt.protected,
                labels: [...state.prompt.options],
              }
            : {}),
        };
      })(),
      players: [...this.#players]
        .filter(([id, player]) => visiblePlayer(id, player))
        .map(([id, player]) => ({
          id,
          connected: player.connected,
          name: player.name,
          ready: player.ready,
          host: id === this.#players.keys().next().value,
          maximumHealthBonus: player.maximumHealthBonus,
          stats:
            id === viewerId ? { ...this.#effectiveStats(id, player) } : null,
          health: { ...player.health },
          statuses: player.statuses.map((status) => ({
            kind: status.kind,
            remaining: Math.max(0, status.expiresAt - this.#time),
          })),
          position: player.craft.body.translation(),
          radius: player.craft.collider.radius(),
          aim: player.aim,
          attacking: player.attack !== null,
          attackReach: player.attack
            ? (player.attack.range ?? 1.5) *
                Math.min(4, player.stats.attackArea / 100) +
              player.craft.collider.radius()
            : 0,
          hit: player.hitCueUntil > this.#time,
          guarding: (player.guard?.until ?? 0) > this.#time,
          modules: [
            ...(['more-eyes', 'antennae', 'snout', 'fungoid'] as const)
              .filter((kind) => player.ranks.has(kind))
              .map((kind) => ({ kind, rank: player.ranks.get(kind) ?? 1 })),
            ...(player.ranks.has('spines')
              ? [
                  {
                    kind: 'spines' as const,
                    rank: player.ranks.get('spines') ?? 1,
                  },
                ]
              : []),
            ...(player.ranks.has('arms')
              ? [
                  {
                    kind: 'arms' as const,
                    rank: player.ranks.get('arms') ?? 1,
                  },
                ]
              : []),
            ...(player.ranks.has('tentacles')
              ? [
                  {
                    kind: 'tentacles' as const,
                    rank: player.ranks.get('tentacles') ?? 1,
                  },
                ]
              : []),
            ...(player.ranks.has('wings')
              ? [
                  {
                    kind: 'wings' as const,
                    rank: player.ranks.get('wings') ?? 1,
                  },
                ]
              : []),
            ...(player.ranks.has('slithery') ||
            player.ranks.has('tail') ||
            player.ranks.has('prehensile-tail')
              ? [
                  {
                    kind: 'tail' as const,
                    rank: Math.max(
                      player.ranks.get('slithery') ?? 0,
                      player.ranks.get('tail') ?? 0,
                      player.ranks.get('prehensile-tail') ?? 0,
                    ),
                  },
                ]
              : []),
            ...(player.ranks.has('legs')
              ? [
                  {
                    kind: 'legs' as const,
                    rank: player.ranks.get('legs') ?? 1,
                  },
                ]
              : []),
            ...(player.ranks.has('more-legs')
              ? [
                  {
                    kind: 'more-legs' as const,
                    rank: player.ranks.get('more-legs') ?? 1,
                  },
                ]
              : []),
            ...(player.ranks.has('fin')
              ? [{ kind: 'fin' as const, rank: player.ranks.get('fin') ?? 1 }]
              : []),
            ...(player.ranks.has('hollow-bones')
              ? [
                  {
                    kind: 'lightweight' as const,
                    rank: player.ranks.get('hollow-bones') ?? 1,
                  },
                ]
              : []),
            ...(Object.values(player.equipment.slots).includes('body-slam')
              ? [
                  {
                    kind: 'slam' as const,
                    rank: player.ranks.get('body-slam') ?? 1,
                  },
                ]
              : []),
            ...[...player.ranks].flatMap(([parentId, rank]) => {
              const definition = this.#content.definition(parentId);
              return (definition?.specializationChoices ?? []).flatMap(
                (choice) =>
                  choice.visual &&
                  player.specializations.has(choice.id) &&
                  (choice.visual.visibility === 'public' || id === viewerId)
                    ? [{ kind: choice.visual.attachment, rank }]
                    : [],
              );
            }),
          ],
          life: { ...player.life },
          shelter: player.shelter ? { ...player.shelter } : null,
        })),
    };
  }
}
