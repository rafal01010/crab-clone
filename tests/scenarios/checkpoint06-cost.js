import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import RAPIER from '@dimforge/rapier3d-compat';
import { Match } from '../../build-host/server/match/match.js';

await RAPIER.init();
const ids = ['a', 'b', 'c', 'd'];
function run() {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const match = new Match('cost', world, 42);
  try {
    for (const playerId of ids) {
      assert.ok(match.accept({ kind: 'join', playerId }));
      match.setReady(playerId, true);
    }
    assert.ok(match.accept({ kind: 'start' }));
    const revision = match.view('a').loadingRevision;
    for (const playerId of ids)
      assert.ok(match.accept({ kind: 'loaded', playerId, revision }));
    assert.ok(match.advance(3000));
    for (const playerId of ['a', 'b']) {
      for (const [kind, cap] of [
        ['summoned', 4],
        ['offspring', 8],
        ['decoy', 2],
      ])
        for (let i = 0; i < cap; i++)
          assert.ok(match.scheduleAlly(playerId, kind, 0, 300000));
      assert.ok(match.advance(100));
    }
    assert.ok(match.advance(100));
    const initialIds = match
      .view('a')
      .bots.map((bot) => bot.id)
      .sort();
    const count = initialIds.length;
    assert.equal(count, 32);
    for (let i = 0; i < 10; i++) assert.ok(match.advance(1000 / 60));
    let advanced = 0,
      errors = 0;
    const start = performance.now();
    for (let i = 0; i < 60; i++) {
      if (match.advance(1000 / 60)) advanced++;
      else errors++;
    }
    const elapsed = performance.now() - start;
    const after = match.view('a');
    assert.equal(errors, 0);
    assert.equal(advanced, 60);
    assert.equal(after.phase, 'running');
    assert.deepEqual(after.bots.map((bot) => bot.id).sort(), initialIds);
    return {
      entities: count,
      ticks: advanced,
      errors,
      msPerTick: elapsed / advanced,
    };
  } finally {
    match.dispose();
  }
}
const runs = Array.from({ length: 5 }, run);
const values = runs.map((r) => r.msPerTick).sort((a, b) => a - b);
console.log(
  JSON.stringify(
    {
      scope:
        'Match.advance only, four players and 32 bots, 60 ticks at 60 Hz per run',
      runs,
      medianMs: values[2],
      rangeMs: [values[0], values[4]],
    },
    null,
    2,
  ),
);
