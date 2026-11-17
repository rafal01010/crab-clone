import type { Arena } from './arena.js';
import type { RegionalWeather, ThermalExposure } from './weather.js';

export type RadarHint = {
  kind: 'elite' | 'poi' | 'firmware';
  direction: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  distance: 'near' | 'mid' | 'far';
};
export type UpgradeIcon =
  'power' | 'salvage' | 'plating' | 'attack' | 'arms' | 'movement' | 'wings';

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
      | 'fins';
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
    attacking: boolean;
    friendshipUntil: number | null;
  }[];
  shelters: {
    id: string;
    position: { x: number; z: number };
    occupied: boolean;
    remainingFraction: number;
  }[];
  firmwareSensory: { distortion: boolean; deafened: boolean };
  nestDefenses: { siteId: string; endsAt: number; health: number }[];
  lastCharm: { success: boolean; at: number } | null;
  lastFirmware: { effect: string; at: number } | null;
  firmware: {
    id: string;
    appearance: string;
    stage: number;
    position: { x: number; z: number };
    knowledge:
      | { kind: 'unknown' }
      | { kind: 'failed' }
      | { kind: 'identified'; effect: string };
  }[];
  pointsOfInterest: {
    id: string;
    kind: string;
    position: { x: number; z: number };
    status: 'available' | 'reserved' | 'claimed';
    discovered: boolean;
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
    affinities: { id: string; rank: number }[];
    upgrades: {
      id: string;
      name: string;
      rank: number;
      rarity: string;
      description: string;
      icon?: UpgradeIcon;
    }[];
  };
  projectiles: { id: number; position: { x: number; y: number; z: number } }[];
  trails: { id: number; position: { x: number; z: number }; radius: number }[];
  players: PlayerView[];
  spectating: string | null;
  survivors: number;
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
  equipment: {
    basicReadyAt: number;
    slots: Record<
      'primary' | 'secondary' | 'movement' | 'ultimate',
      string | null
    >;
    learned: {
      id: string;
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
    kind?: 'upgrade' | 'specialization' | 'equipment' | 'poi';
    rerollCost?: number;
    rarityCost?: number | null;
    labels?: { id: string; label: string; description?: string }[];
    details?: {
      id: string;
      name: string;
      rarity: string;
      rank: number;
      description: string;
      icon?: UpgradeIcon;
    }[];
  } | null;
}
