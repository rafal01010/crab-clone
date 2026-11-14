export type MatchPhase = 'lobby' | 'running' | 'finished' | 'aborted';
export type PlayerLife =
  | {
      kind: 'alive';
      activity: 'playing' | 'selecting' | 'awaiting-choice-window';
    }
  | { kind: 'eliminated' };
export interface PlayerView {
  id: string;
  connected: boolean;
  maximumHealthBonus: number;
  position: { x: number; y: number; z: number };
  radius: number;
  aim: number;
  life: PlayerLife;
}
export interface MatchView {
  id: string;
  phase: MatchPhase;
  players: PlayerView[];
  time: number;
  offer: { id: string; revision: number; choices: string[] } | null;
}
