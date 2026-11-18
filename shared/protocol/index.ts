import type { MatchView } from '../match.js';

export const CONTROL_BUTTON = {
  primary: 1,
  secondary: 2,
  movement: 4,
  ultimate: 8,
  interact: 16,
} as const;

export type IntentAction =
  | { kind: 'control'; x: number; y: number; aim: number; buttons: number }
  | { kind: 'choice'; offerId: string; revision: number; choiceId: string }
  | { kind: 'reroll'; offerId: string; revision: number }
  | { kind: 'upgrade-rarity'; offerId: string; revision: number }
  | {
      kind: 'equipment';
      offerId: string;
      revision: number;
      slot: string;
      contentId: string;
    }
  | { kind: 'interaction'; targetId: string }
  | { kind: 'scan' | 'use-firmware' | 'shelter' | 'charm'; targetId: string }
  | { kind: 'spectate'; targetId: string }
  | { kind: 'ready'; ready: boolean }
  | { kind: 'resume'; token: string };
export type Intent = {
  matchId: string;
  playerId: string;
  sequence: number;
} & IntentAction;
export type Acknowledgment = {
  sequence: number | null;
  status: 'queued' | 'rejected';
  reason?: string;
};
export type Observation = {
  matchId: string;
  timestamp: number;
  revision: number;
  state: MatchView;
  events: readonly never[];
};

export type SessionRejection =
  | 'invalid-token'
  | 'session-in-use'
  | 'unknown-session'
  | 'match-full'
  | 'session-unavailable';
