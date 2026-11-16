import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { Match } from '../../build-host/server/match/match.js';

await RAPIER.init();

export function createAbilityMatch(
  id,
  { world = new RAPIER.World({ x: 0, y: 0, z: 0 }), registry } = {},
) {
  const match = new Match(id, world, 42, {}, 0, registry);
  for (const playerId of ['a', 'b', 'c', 'd']) {
    assert.ok(match.accept({ kind: 'join', playerId }));
    match.setReady(playerId, true);
  }
  assert.ok(match.accept({ kind: 'start' }));
  const revision = match.view('a').loadingRevision;
  for (const playerId of ['a', 'b', 'c', 'd'])
    assert.ok(match.accept({ kind: 'loaded', playerId, revision }));
  assert.ok(match.advance(3000));
  return { match, world };
}
