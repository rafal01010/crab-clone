import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

test('Revenge stacks eligible hits to its cap and the temporary bonus expires', () => {
  const random = Math.random;
  Math.random = () => 0.999999;
  const { match, world } = createAbilityMatch('checkpoint10-revenge');
  try {
    for (const bot of match.view('a').bots)
      match.setBotHostility(bot.id, false);
    const point = match
      .view('a')
      .players.find((player) => player.id === 'a').position;
    const body = world.bodies
      .getAll()
      .find(
        (item) =>
          item.isDynamic() &&
          Math.hypot(
            item.translation().x - point.x,
            item.translation().z - point.z,
          ) < 0.01,
      );
    assert.ok(body);
    body.setTranslation({ x: 20, y: 0.25, z: 20 }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    assert.ok(match.grantUpgrade('a', 'revenge', 'rare', 1));
    const stats = () =>
      match.view('a').players.find((player) => player.id === 'a').stats;
    const baseline = stats();
    const hit = (amount) =>
      match.damageBatch([
        { targetId: 'a', ownerId: 'b', channel: 'direct', amount, depth: 0 },
      ])[0];
    hit(0);
    assert.equal(stats().physical, baseline.physical);
    for (let index = 1; index <= 6; index++) {
      const result = hit(1);
      assert.ok(result.hull + result.plating > 0);
      for (const stat of ['physical', 'ability'])
        assert.ok(
          Math.abs(
            stats()[stat] - baseline[stat] * (1 + Math.min(index, 4) * 0.1),
          ) < 1e-8,
          `${stat} after ${index} hits`,
        );
    }
    match.takeDamageLedger();
    for (let i = 0; i < 41; i++) assert.ok(match.advance(100));
    assert.equal(
      stats().physical,
      baseline.physical,
      JSON.stringify(
        match.takeDamageLedger().filter(({ event }) => event.targetId === 'a'),
      ),
    );
    assert.equal(stats().ability, baseline.ability);
  } finally {
    match.dispose();
    Math.random = random;
  }
});
