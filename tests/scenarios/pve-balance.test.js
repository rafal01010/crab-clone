import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

test('PvE damage uses a smaller player bonus without changing PvP, hazards, or wild-versus-wild damage', () => {
  const random = Math.random;
  const { match } = createAbilityMatch('pve-balance');
  Math.random = () => 0.999999;
  try {
    const [wild, other] = [
      ...new Map(
        ['a', 'b', 'c', 'd'].flatMap((id) =>
          match.view(id).bots.map((bot) => [bot.id, bot]),
        ),
      ).values(),
    ];
    assert.ok(wild && other);
    const hit = (ownerId, targetId, channel = 'direct') => {
      const [result] = match.damageBatch([
        {
          ownerId,
          targetId,
          channel,
          amount: 1,
          depth: 0,
          bypassPlating: true,
        },
      ]);
      return result.hull;
    };
    assert.equal(hit('a', wild.id), 1.2);
    assert.equal(hit('a', wild.id, 'corrosion'), 1.2);
    assert.equal(hit(wild.id, 'a'), 0.6);
    assert.equal(hit(wild.id, 'a', 'contact'), 0.6);
    assert.equal(hit('a', 'b'), 1);
    assert.equal(hit(wild.id, other.id), 1);
    assert.equal(hit(null, 'a', 'boundary'), 1);
    assert.equal(hit('a', wild.id, 'environmental'), 1);
    assert.equal(hit(wild.id, 'a', 'deferred'), 1);
    assert.ok(match.recruitCompanion('a', 'pve-companion', 0));
    const companion = match.view('a').bots.find((bot) => bot.ownerId === 'a');
    assert.ok(companion);
    assert.equal(hit(companion.id, wild.id), 1.2);
    assert.equal(hit(companion.id, 'b'), 1);
  } finally {
    match.dispose();
    Math.random = random;
  }
});

test('a wounded hunter pursues the player instead of fleeing', () => {
  const { match, world } = createAbilityMatch('pve-wounded-hunter');
  const random = Math.random;
  Math.random = () => 0.999999;
  try {
    const view = match.view('a');
    const hunter = view.bots.find((bot) => bot.role === 'hunter');
    assert.ok(hunter);
    const move = (position, x, z) => {
      const body = world.bodies
        .getAll()
        .find(
          (item) =>
            item.isDynamic() &&
            Math.hypot(
              item.translation().x - position.x,
              item.translation().z - position.z,
            ) < 0.01,
        );
      assert.ok(body);
      body.setTranslation({ x, y: 0.25, z }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return body;
    };
    for (const player of view.players)
      move(player.position, player.id === 'a' ? 20 : -80, 20);
    for (const bot of view.bots)
      if (bot.id !== hunter.id) move(bot.position, -60, -60);
    const body = move(hunter.position, 26, 20);
    match.damageBatch([
      {
        targetId: hunter.id,
        ownerId: 'a',
        channel: 'direct',
        amount: (hunter.health * 0.75) / 1.2,
        bypassPlating: true,
        depth: 0,
      },
    ]);
    const afterHit = match.view('a').bots.find((bot) => bot.id === hunter.id);
    assert.ok(afterHit.health > 0);
    assert.ok(Math.abs(afterHit.health / hunter.health - 0.25) < 0.001);
    assert.ok(match.advance(100));
    const wounded = match.view('a').bots.find((bot) => bot.id === hunter.id);
    assert.ok(wounded.health < hunter.health * 0.3);
    assert.ok(body.linvel().x < 0, 'hunter should move toward the player');
  } finally {
    match.dispose();
    Math.random = random;
  }
});
