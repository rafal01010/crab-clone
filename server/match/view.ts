import type { Match } from './match.js';
import type { Observation } from '../../shared/protocol/index.js';
export function observe(
  match: Match,
  viewerId: string,
  revision: number,
  timestamp: number,
): Observation | undefined {
  const state = match.view(viewerId);
  if (!state) return undefined;
  return { matchId: state.id, timestamp, revision, state, events: [] };
}
