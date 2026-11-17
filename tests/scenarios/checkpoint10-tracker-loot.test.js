import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

test('Tracker duplicates attributed elite loot inside the final area', () => {
  const run = (tracker) => {
    const random = Math.random;
    Math.random = () => 0.5;
    const { match, world } = createAbilityMatch('checkpoint10-tracker-loot');
    try {
      if (tracker) {
        assert.ok(match.grantUpgrade('a', 'nomadic', 'rare', 1));
        assert.ok(match.grantUpgrade('a', 'tracker', 'legendary', 1));
      }
      match.syncWallClock(1000);
      match.syncWallClock(181000);
      let elite;
      for (let i = 0; i < 60 && !elite; i++) {
        assert.ok(match.advance(100));
        elite = match
          .view('a')
          .bots.find((bot) => bot.elite && bot.kind === 'wild');
      }
      assert.ok(elite, 'spawned elite near player');
      const player = match.view('a').players.find((entry) => entry.id === 'a');
      const bodyAt = (position) =>
        world.bodies
          .getAll()
          .find(
            (entry) =>
              entry.isDynamic() &&
              Math.hypot(
                entry.translation().x - position.x,
                entry.translation().z - position.z,
              ) < 0.01,
          );
      const playerBody = bodyAt(player.position);
      const eliteBody = bodyAt(elite.position);
      assert.ok(playerBody && eliteBody && playerBody !== eliteBody);
      playerBody.setTranslation({ x: -1, y: 0.25, z: 0 }, true);
      playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      eliteBody.setTranslation({ x: 1, y: 0.25, z: 0 }, true);
      eliteBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      const elapsed = match.view('a').boundary.elapsedMs;
      match.syncWallClock(181000 + 1500000 - elapsed);
      assert.ok(match.advance(50));
      assert.ok(match.view('a').boundary.radius <= 3.01);
      const before = new Set(
        match.view('a').resources.map((resource) => resource.id),
      );
      Math.random = () => 0;
      const result = match.damageBatch([
        {
          targetId: elite.id,
          ownerId: 'a',
          channel: 'direct',
          amount: 100000,
          depth: 0,
        },
      ]);
      assert.ok(result[0].hull > 0);
      const drops = match
        .view('a')
        .resources.filter((resource) => !before.has(resource.id));
      assert.ok(drops[0]);
      assert.ok(
        drops.every((drop) => Math.hypot(drop.position.x, drop.position.z) < 3),
      );
      playerBody.setTranslation({ ...drops[0].position, y: 0.25 }, true);
      playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      match.takeCollections();
      assert.ok(match.advance(50));
      const collected = match
        .takeCollections()
        .filter((event) => drops.some((drop) => drop.id === event.resourceId));
      return { drops, collected };
    } finally {
      match.dispose();
      Math.random = random;
    }
  };
  const baseline = run(false),
    withTracker = run(true);
  assert.ok(baseline.drops.length > 0, `baseline ${baseline.drops.length}`);
  assert.equal(withTracker.drops.length, baseline.drops.length * 2);
  assert.equal(withTracker.collected.length, withTracker.drops.length);
  assert.ok(
    withTracker.collected.every(
      (event) =>
        event.killerId === 'a' &&
        event.ownerId === 'a' &&
        event.provenance === 'own-kill',
    ),
  );
});
