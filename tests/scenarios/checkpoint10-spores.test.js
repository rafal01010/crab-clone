import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

test('Poisonous Spores react to damage within range without recursive corrosion', () => {
  const random = Math.random;
  Math.random = () => 0.999999;
  const { match, world } = createAbilityMatch('checkpoint10-spores');
  try {
    for (const bot of match.view('a').bots)
      match.setBotHostility(bot.id, false);
    for (const id of ['a', 'b']) {
      assert.equal(
        match.grantUpgrade(id, 'poisonous-spores', 'rare', 1),
        false,
      );
      assert.ok(match.grantUpgrade(id, 'fungoid', 'rare', 1));
      assert.ok(match.grantUpgrade(id, 'poisonous-spores', 'rare', 1));
    }
    for (const [id, x] of [
      ['a', 0],
      ['b', 2],
      ['c', 12],
      ['d', -15],
    ]) {
      const point = match
        .view(id)
        .players.find((item) => item.id === id).position;
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
      body.setTranslation({ x, y: 0.25, z: 0 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    assert.ok(match.advance(20));
    const hit = (targetId, ownerId) =>
      match.damageBatch([
        { targetId, ownerId, channel: 'direct', amount: 1, depth: 0 },
      ])[0];
    assert.ok(hit('a', 'b').hull > 0);
    assert.ok(hit('b', 'a').hull > 0);
    const statuses = (id) =>
      match
        .view(id)
        .players.find((item) => item.id === id)
        .statuses.filter((status) => status.kind === 'corrosion');
    assert.equal(statuses('a').length, 1);
    assert.equal(statuses('b').length, 1);
    assert.equal(statuses('c').length, 0);
    match.takeDamageLedger();
    for (let i = 0; i < 11; i++) assert.ok(match.advance(100));
    const corrosion = match
      .takeDamageLedger()
      .filter(({ event }) => event.channel === 'corrosion');
    assert.ok(
      corrosion.some(
        ({ event }) => event.ownerId === 'a' && event.targetId === 'b',
      ),
    );
    assert.ok(
      corrosion.some(
        ({ event }) => event.ownerId === 'b' && event.targetId === 'a',
      ),
    );
    assert.equal(statuses('a').length, 1);
    assert.equal(statuses('b').length, 1);
    assert.equal(statuses('c').length, 0);
  } finally {
    match.dispose();
    Math.random = random;
  }
});
