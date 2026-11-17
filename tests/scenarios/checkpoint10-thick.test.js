import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

test('Thick Jet slime widens the trail and stuns after sustained exposure', () => {
  const run = (choiceId) => {
    const { match, world } = createAbilityMatch('checkpoint10-thick');
    try {
      assert.ok(match.grantUpgrade('a', 'slithery', 'branching', 1));
      assert.ok(match.grantUpgrade('a', 'tentacles', 'branching', 1));
      for (let rank = 1; rank <= 3; rank++)
        assert.ok(match.grantUpgrade('a', 'pedal-glands', 'common', rank));
      assert.ok(match.advance(20));
      const offer = match.view('a').offer;
      assert.ok(offer && offer.choices.includes(choiceId));
      assert.ok(
        match.consume({
          kind: 'choice',
          matchId: 'checkpoint10-thick',
          playerId: 'a',
          sequence: 1,
          offerId: offer.id,
          revision: offer.revision,
          choiceId,
        }),
      );
      assert.ok(match.grantUpgrade('a', 'jet', 'common', 1));
      const body = (id) => {
        const position = match
          .view(id)
          .players.find((entry) => entry.id === id).position;
        return world.bodies
          .getAll()
          .find(
            (entry) =>
              entry.isDynamic() &&
              Math.hypot(
                entry.translation().x - position.x,
                entry.translation().z - position.z,
              ) < 0.01,
          );
      };
      const owner = body('a'),
        target = body('b');
      assert.ok(owner && target);
      owner.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
      target.setTranslation({ x: 30, y: 0.25, z: 0 }, true);
      assert.ok(match.advance(20));
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint10-thick',
          playerId: 'a',
          sequence: 2,
          x: 1,
          y: 0,
          aim: Math.PI / 2,
          buttons: 4,
        }),
      );
      for (let i = 0; i < 6; i++) assert.ok(match.advance(50));
      const trail = match.view('a').trails[0];
      assert.ok(trail);
      owner.setTranslation({ x: 30, y: 0.25, z: 0 }, true);
      owner.setLinvel({ x: 0, y: 0, z: 0 }, true);
      const distances = [];
      for (let i = 0; i < 35; i++) {
        target.setTranslation({ ...trail.position, y: 0.25 }, true);
        target.setLinvel({ x: 0, y: 0, z: 0 }, true);
        for (const bot of match.view('b').bots)
          match.damageBatch([
            {
              targetId: bot.id,
              ownerId: null,
              channel: 'direct',
              amount: 10000,
              depth: 0,
            },
          ]);
        const steps = i === 1 || i === 18 ? 8 : 1;
        const duration = steps === 8 ? 50 : 100;
        for (let step = 0; step < steps; step++) {
          assert.ok(
            match.consume({
              kind: 'control',
              matchId: 'checkpoint10-thick',
              playerId: 'b',
              sequence: i * 10 + step + 1,
              x: 1,
              y: 0,
              aim: Math.PI / 2,
              buttons: 0,
            }),
          );
          assert.ok(match.advance(duration));
        }
        if (steps === 8)
          distances.push(target.translation().x - trail.position.x);
      }
      return {
        radius: trail.radius,
        distances,
        stunned: match
          .view('b')
          .players.find((entry) => entry.id === 'b')
          .statuses.some((status) => status.kind === 'stun'),
      };
    } finally {
      match.dispose();
    }
  };
  const thick = run('pedal-glands-thick');
  const skipped = run('skip');
  assert.equal(thick.radius, 3.375);
  assert.equal(thick.stunned, true);
  assert.ok(
    thick.distances[1] < thick.distances[0] * 0.9,
    JSON.stringify(thick.distances),
  );
  assert.equal(skipped.radius, 2.25);
  assert.equal(skipped.stunned, false);
  assert.ok(
    Math.abs(skipped.distances[1] - skipped.distances[0]) < 0.001,
    JSON.stringify(skipped.distances),
  );
});
