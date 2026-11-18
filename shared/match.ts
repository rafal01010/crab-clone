import type { Arena } from './arena.js';
import type { RegionalWeather, ThermalExposure } from './weather.js';

export type RadarHint = {
  kind: 'elite' | 'poi' | 'firmware';
  direction: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  distance: 'near' | 'mid' | 'far';
};
export type UpgradeIcon =
  | 'power'
  | 'salvage'
  | 'plating'
  | 'attack'
  | 'arms'
  | 'movement'
  | 'wings'
  | 'projectile'
  | 'sensor'
  | 'beacon';

export type UpgradeDetail = {
  id: string;
  name: string;
  rarity: string;
  rank: number;
  description: string;
  icon?: UpgradeIcon;
  currentRank?: number;
  currentDescription?: string;
  maxRank?: number;
  affinities?: string[];
  requirements?: string;
  exclusions?: string[];
  acquisition?: {
    slot: 'primary' | 'secondary' | 'movement' | 'ultimate';
    replaces: string | null;
  };
};

export type PresentationFeedback = {
  id: number;
  at: number;
  targetId: string;
  position: { x: number; y: number; z: number };
  localAttacker: boolean;
  hull: number;
  plating: number;
  kind:
    | 'hull'
    | 'plating'
    | 'break'
    | 'dodge'
    | 'blocked'
    | 'repair'
    | 'salvage'
    | 'reward';
  lethal: boolean;
  channel: string;
};

export type ContactTool = 'bumper' | 'jaws' | 'blade';
export type StrikePose = {
  phase: 'windup' | 'strike' | 'recovery';
  progress: number;
};
export type ContactVisual = StrikePose & {
  tool: ContactTool;
  aim: number;
  reach: number;
};
export type ProjectileVisual = 'glob' | 'tether' | 'stone' | 'bolt';
export type AttackFlash =
  | { kind: 'launch'; shape: ProjectileVisual; aim: number; at: number }
  | { kind: 'pulse'; shape: 'wave' | 'burst'; radius: number; at: number };

export type MatchPhase =
  'lobby' | 'loading' | 'countdown' | 'running' | 'finished' | 'aborted';
export type PlayerLife =
  | {
      kind: 'alive';
      activity: 'playing' | 'selecting' | 'awaiting-choice-window';
    }
  | { kind: 'eliminated' };
export interface PlayerView {
  id: string;
  connected: boolean;
  name: string;
  ready: boolean;
  host: boolean;
  maximumHealthBonus: number;
  stats: Record<string, number> | null;
  health: { hull: number; plating: number; level: number };
  statuses: { kind: string; remaining: number }[];
  position: { x: number; y: number; z: number };
  radius: number;
  aim: number;
  attacking: boolean;
  attackReach: number;
  contact: ContactVisual | null;
  attackFlash: AttackFlash | null;
  thrust: { aim: number; kind: 'dash' | 'charge' | 'leap' } | null;
  hit: boolean;
  guarding: boolean;
  life: PlayerLife;
  shelter: { id: string; until: number } | null;
  modules: {
    kind:
      | 'more-eyes'
      | 'antennae'
      | 'snout'
      | 'fungoid'
      | 'arms'
      | 'tentacles'
      | 'legs'
      | 'more-legs'
      | 'fin'
      | 'lightweight'
      | 'wings'
      | 'tail'
      | 'slam'
      | 'spines'
      | 'crest'
      | 'fins'
      | 'shield'
      | 'command'
      | 'jet'
      | 'cannon'
      | 'pincer'
      | 'blade';
    rank: number;
  }[];
}
export type MatchResult = {
  outcome:
    | { kind: 'winner'; playerId: string }
    | { kind: 'draw' }
    | { kind: 'run-ended' };
  durationMs: number;
  eliminationGroups: string[][];
  contentNames: Record<string, string>;
  players: {
    id: string;
    name: string;
    level: number;
    upgrades: { id: string; rank: number; rarity: string }[];
    specializations: string[];
    learnedAbilities: string[];
    equipment: Record<
      'primary' | 'secondary' | 'movement' | 'ultimate',
      string | null
    >;
    damageDealt: number;
    damageTaken: number;
    eliminations: number;
    salvageStages: number;
  }[];
};

export interface MatchView {
  id: string;
  roundId: string;
  phase: MatchPhase;
  result: MatchResult | null;
  arena: Pick<Arena, 'terrain' | 'obstacles'>;
  weather: RegionalWeather[];
  thermal: ThermalExposure | null;
  radar: RadarHint[];
  worldClock: {
    phase: 'day' | 'night';
    phaseStartedAt: number;
    nextTransitionAt: number;
  };
  feedback: PresentationFeedback[];
  bots: {
    id: string;
    tier: number;
    role: 'forager' | 'hunter' | 'scavenger';
    biome: import('./movement.js').Terrain;
    elite: boolean;
    ownerId: string | null;
    kind: 'wild' | 'charmed' | 'summoned' | 'offspring' | 'decoy';
    radius: number;
    position: { x: number; y: number; z: number };
    health: number;
    maxHealth: number;
    plating: number;
    statuses: { kind: string; remaining: number }[];
    aim: number;
    attacking: boolean;
    strikePose: StrikePose | null;
    friendshipUntil: number | null;
  }[];
  shelters: {
    id: string;
    position: { x: number; z: number };
    occupied: boolean;
    remainingFraction: number;
    entryDurationMs?: number;
  }[];
  firmwareSensory: { distortion: boolean; deafened: boolean };
  nestDefenses: { siteId: string; endsAt: number; health: number }[];
  lastCharm: { success: boolean; at: number } | null;
  lastFirmware: { effect: string; at: number } | null;
  firmware: {
    id: string;
    appearance: string;
    stage: number;
    stages?: number;
    consumption?: 'idle' | 'yours' | 'other';
    scanChance?: number;
    position: { x: number; z: number };
    knowledge:
      | { kind: 'unknown' }
      | { kind: 'failed' }
      | { kind: 'identified'; effect: string };
  }[];
  pointsOfInterest: {
    id: string;
    kind: string;
    name: string;
    position: { x: number; z: number };
    status: 'available' | 'reserved' | 'claimed';
    discovered: boolean;
    claim?:
      | {
          kind: 'available';
          protectionMs: number;
          unavailableReason: string | null;
        }
      | { kind: 'reserved'; yours: boolean; expiresAt: number }
      | { kind: 'claimed'; yours: boolean };
  }[];
  resources: {
    id: string;
    position: { x: number; z: number };
    source: 'vegetation' | 'meat' | 'aquatic';
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    stage: number;
    repair: boolean;
  }[];
  progression: {
    level: number;
    progress: number;
    required: number;
    pending: number;
    depletedRewards: number;
    storedSalvage: number;
    basking: { active: boolean; remainingMs: number } | null;
    currency: number;
    carcinisation: number;
    carcinisationDamage: number;
    carcinisationRarity: number;
    affinities: { id: string; name: string; rank: number }[];
    upgrades: {
      id: string;
      name: string;
      rank: number;
      rarity: string;
      description: string;
      icon?: UpgradeIcon;
    }[];
  };
  projectiles: {
    id: number;
    position: { x: number; y: number; z: number };
    heading: number;
    shape: ProjectileVisual;
  }[];
  trails: {
    id: number;
    position: { x: number; z: number };
    radius: number;
    kind: 'pedal' | 'web';
  }[];
  players: PlayerView[];
  spectating: string | null;
  survivors: number;
  canFinishSurvivor: boolean;
  boundary: {
    radius: number;
    elapsedMs: number;
    shrinkStartMs: number;
    collapseAtMs: number;
  };
  meteors: {
    id: number;
    position: { x: number; z: number };
    radius: number;
    impactAt: number;
  }[];
  time: number;
  countdown: number | null;
  loadingError: string | null;
  loadingRevision: number;
  build?: {
    specializations: { id: string; name: string; description: string }[];
    modifiers: {
      source: string;
      stat: string;
      add: number;
      multiplier: number;
      active: boolean;
    }[];
    temporary: { label: string; until: number }[];
  };
  equipment: {
    basicReadyAt: number;
    slots: Record<
      'primary' | 'secondary' | 'movement' | 'ultimate',
      string | null
    >;
    learned: {
      id: string;
      name?: string;
      description?: string;
      rarity?: string;
      rank?: number;
      icon?: UpgradeIcon;
      cooldownMs?: number;
      slotType: 'attack' | 'movement' | 'ultimate';
      readyAt: number;
      ammunition?: { charges: number; capacity: number; nextAt: number };
    }[];
  };
  offer: {
    id: string;
    revision: number;
    choices: string[];
    deadline?: number;
    protected?: boolean;
    pool?: 'ordinary' | 'branching' | 'finale';
    queued?: number;
    parentName?: string;
    kind?: 'upgrade' | 'specialization' | 'equipment' | 'poi';
    rerollCost?: number;
    rarityCost?: number | null;
    site?: { id: string; name: string; discovered: boolean; expiresAt: number };
    poiOptions?: {
      id: string;
      cost: number;
      consequence: string;
      unavailableReason: string | null;
    }[];
    labels?: { id: string; label: string; description?: string }[];
    details?: UpgradeDetail[];
  } | null;
}
