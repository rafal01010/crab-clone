import type { Arena } from './arena.js';

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
  life: PlayerLife;
}
export type MatchResult = {
  outcome: { kind: 'winner'; playerId: string } | { kind: 'draw' };
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
  arena: Arena;
  bots: {
    id: string;
    tier: number;
    position: { x: number; y: number; z: number };
    health: number;
    maxHealth: number;
    attacking: boolean;
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
    currency: number;
    carcinisation: number;
    carcinisationDamage: number;
    carcinisationRarity: number;
    affinities: { id: string; rank: number }[];
  };
  projectiles: { id: number; position: { x: number; y: number; z: number } }[];
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
    }[];
  };
  offer: {
    id: string;
    revision: number;
    choices: string[];
    deadline?: number;
    kind?: 'upgrade' | 'specialization' | 'equipment';
    labels?: { id: string; label: string }[];
    details?: {
      id: string;
      name: string;
      rarity: string;
      rank: number;
      description: string;
    }[];
  } | null;
}
