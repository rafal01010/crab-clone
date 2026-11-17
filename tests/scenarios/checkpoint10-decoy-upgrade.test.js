import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

test('Detachable Tail requires Tail rank two and creates one decoy on a dodged hit', () => {
  const random = Math.random;
  Math.random = () => 0;
  const { match } = createAbilityMatch('checkpoint10-decoy-upgrade');
  try {
    assert.equal(match.grantUpgrade('a', 'detachable-tail', 'rare', 1), false);
    assert.ok(match.grantUpgrade('a', 'tail', 'common', 1));
    assert.equal(match.grantUpgrade('a', 'detachable-tail', 'rare', 1), false);
    assert.ok(match.grantUpgrade('a', 'tail', 'common', 2));
    assert.ok(match.grantUpgrade('a', 'detachable-tail', 'rare', 1));
    assert.ok(
      match.setModifiers('a', [
        { id: 'qa-dodge', stat: 'dodge', add: 75, multiplier: 1 },
      ]),
    );
    const hit = () =>
      match.damageBatch([
        {
          targetId: 'a',
          ownerId: 'b',
          amount: 10,
          channel: 'direct',
          depth: 0,
        },
      ])[0];
    assert.equal(hit().dodged, true);
    assert.ok(match.advance(100));
    const decoys = () =>
      match
        .view('a')
        .bots.filter((bot) => bot.ownerId === 'a' && bot.kind === 'decoy');
    assert.equal(decoys().length, 1);
    assert.equal(hit().dodged, true);
    assert.ok(match.advance(100));
    assert.equal(decoys().length, 1);
    for (let i = 0; i < 25; i++) assert.ok(match.advance(100));
    assert.equal(decoys().length, 0);
  } finally {
    match.dispose();
    Math.random = random;
  }
});

test('Whining and Tail Wag charm a nearby wild animal through their upgrade bindings', () => {
  const randomInt = crypto.randomInt;
  const random = Math.random;
  crypto.randomInt = (...args) =>
    args.length === 1 && args[0] === 1_000_000 ? 0 : randomInt(...args);
  syncBuiltinESMExports();
  Math.random = () => 0.999999;
  try {
    for (const id of ['whining', 'tail-wag']) {
      const { match, world } = createAbilityMatch('checkpoint10-charm-aura');
      try {
        if (id === 'tail-wag')
          assert.ok(match.grantUpgrade('a', 'tail', 'common', 1));
        assert.ok(match.grantUpgrade('a', id, 'rare', 1));
        const view = match.view('a');
        const player = view.players.find((item) => item.id === 'a');
        const target = view.bots.find(
          (item) => item.kind === 'wild' && !item.elite,
        );
        assert.ok(target);
        for (const point of [player.position, target.position]) {
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
          body.setTranslation(
            { x: point === player.position ? 20 : 22, y: 0.25, z: 20 },
            true,
          );
          body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }
        assert.ok(match.setBotHostility(target.id, false));
        if (id === 'whining')
          assert.ok(
            match.damageBatch([
              {
                targetId: 'a',
                ownerId: 'b',
                amount: 1,
                channel: 'direct',
                depth: 0,
              },
            ])[0].hull > 0,
          );
        for (
          let i = 0;
          i < 60 &&
          !match
            .view('a')
            .bots.some((bot) => bot.id === target.id && bot.ownerId === 'a');
          i++
        )
          assert.ok(match.advance(100));
        assert.equal(
          match.view('a').bots.find((bot) => bot.id === target.id)?.ownerId,
          'a',
          id,
        );
      } finally {
        match.dispose();
      }
    }
  } finally {
    crypto.randomInt = randomInt;
    syncBuiltinESMExports();
    Math.random = random;
  }
});
