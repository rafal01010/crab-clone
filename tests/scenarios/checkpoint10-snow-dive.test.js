import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createArena,
  terrainAt,
  arenaPointClear,
} from '../../build-host/shared/arena.js';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

test('Snow Dive spawns vegetation after a snow dash, but not on grass or after skipping', () => {
  const arena = createArena(42);
  const point = (terrain) => {
    for (let x = -90; x <= 90; x += 2)
      for (let z = -90; z <= 90; z += 2)
        if (
          terrainAt(arena, x, z) === terrain &&
          arenaPointClear(arena.obstacles, { x, z }, 3)
        )
          return { x, z };
    throw new Error(`No ${terrain} point`);
  };
  const run = (choiceId, terrain) => {
    const { match, world } = createAbilityMatch('checkpoint10-snow-dive');
    const originalRandom = Math.random;
    try {
      for (let rank = 1; rank <= 3; rank++)
        assert.ok(match.grantUpgrade('a', 'fur', 'common', rank));
      assert.ok(match.advance(20));
      const offer = match.view('a').offer;
      assert.equal(offer.kind, 'specialization');
      assert.ok(
        match.consume({
          kind: 'choice',
          matchId: 'checkpoint10-snow-dive',
          playerId: 'a',
          sequence: 1,
          offerId: offer.id,
          revision: offer.revision,
          choiceId,
        }),
      );
      const pos = match.view('a').players.find((p) => p.id === 'a').position;
      const body = world.bodies
        .getAll()
        .find(
          (b) =>
            b.isDynamic() &&
            Math.hypot(b.translation().x - pos.x, b.translation().z - pos.z) <
              0.01,
        );
      assert.ok(body);
      const destination = point(terrain);
      body.setTranslation({ ...destination, y: 0.25 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      assert.ok(match.advance(20));
      const before = new Set(match.view('a').resources.map((r) => r.id));
      Math.random = () => 0.1;
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint10-snow-dive',
          playerId: 'a',
          sequence: 2,
          x: 0,
          y: 0,
          aim: 0,
          buttons: 4,
        }),
      );
      assert.ok(match.advance(50));
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint10-snow-dive',
          playerId: 'a',
          sequence: 3,
          x: 0,
          y: 0,
          aim: 0,
          buttons: 0,
        }),
      );
      assert.ok(match.advance(1000));
      body.setTranslation({ ...destination, y: 0.25 }, true);
      assert.ok(match.advance(20));
      return match
        .view('a')
        .resources.filter(
          (r) => !before.has(r.id) && r.source === 'vegetation',
        );
    } finally {
      Math.random = originalRandom;
      match.dispose();
    }
  };
  assert.equal(run('fur-snow-dive', 'snow').length, 1);
  assert.equal(run('fur-snow-dive', 'grass').length, 0);
  assert.equal(run('skip', 'snow').length, 0);
});
