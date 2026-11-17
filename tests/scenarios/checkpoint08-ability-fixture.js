import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { Match } from '../../build-host/server/match/match.js';

await RAPIER.init();

// Explicitly opt in within a scenario; the returned function restores health
// after each simulation step. It does not alter progression or enemy behavior.
export function enableQaSurvival(match, playerId) {
  assert.ok(
    match.setModifiers(playerId, [
      { id: 'qa-health', stat: 'maximumHealth', add: 900, multiplier: 1 },
      {
        id: 'qa-resistance',
        stat: 'damageResistance',
        add: 100,
        multiplier: 1,
      },
      { id: 'qa-heat', stat: 'heatAdaptation', add: 400, multiplier: 1 },
      { id: 'qa-cold', stat: 'coldAdaptation', add: 400, multiplier: 1 },
    ]),
  );
  const restore = () => match.repairPlayer(playerId, 900, false);
  restore();
  return restore;
}

export function createAbilityMatch(
  id,
  {
    world = new RAPIER.World({ x: 0, y: 0, z: 0 }),
    registry,
    finale = {},
  } = {},
) {
  const match = new Match(id, world, 42, finale, 0, registry);
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
