import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

test('competing charm hits in one damage batch produce one owner', () => {
  const original = crypto.randomInt;
  crypto.randomInt = (...args) =>
    args.length === 1 && args[0] === 1_000_000 ? 0 : original(...args);
  syncBuiltinESMExports();
  try {
    for (const order of [
      ['b', 'c'],
      ['c', 'b'],
    ]) {
      const { match, world } = createAbilityMatch('checkpoint10-charm-race');
      try {
        for (const id of order) {
          assert.ok(match.grantUpgrade(id, 'arms', 'branching', 1));
          assert.ok(match.grantUpgrade(id, 'toe-beans', 'common', 1));
        }
        assert.ok(match.recruitCompanion('a', 'contested', 0));
        const target = match.view('a').bots.find((bot) => bot.ownerId === 'a');
        assert.ok(target);
        for (const id of order) {
          const player = match
            .view(id)
            .players.find((entry) => entry.id === id);
          const body = world.bodies
            .getAll()
            .find(
              (entry) =>
                entry.isDynamic() &&
                Math.hypot(
                  entry.translation().x - player.position.x,
                  entry.translation().z - player.position.z,
                ) < 0.01,
            );
          assert.ok(body);
          body.setTranslation({ ...target.position, y: 0.25 }, true);
        }
        const results = match.damageBatch(
          order.map((ownerId) => ({
            targetId: target.id,
            ownerId,
            amount: 1,
            channel: 'contact',
            origin: 'manual',
            abilityId: 'toe-beans',
            depth: 0,
          })),
        );
        assert.equal(results.length, 2);
        const copies = match
          .view(order[0])
          .bots.filter((bot) => bot.id === target.id);
        assert.equal(copies.length, 1);
        assert.equal(copies[0].ownerId, order[0]);
      } finally {
        match.dispose();
      }
    }
  } finally {
    crypto.randomInt = original;
    syncBuiltinESMExports();
  }
});

test('a charm hit transfers one companion only when the attacker has capacity', () => {
  const original = crypto.randomInt;
  crypto.randomInt = (...args) =>
    args.length === 1 && args[0] === 1_000_000 ? 0 : original(...args);
  syncBuiltinESMExports();
  const { match, world } = createAbilityMatch('checkpoint10-charm-transfer');
  try {
    assert.ok(match.grantUpgrade('b', 'arms', 'branching', 1));
    assert.ok(match.grantUpgrade('b', 'toe-beans', 'common', 1));
    assert.ok(match.recruitCompanion('a', 'first-owner', 0));
    assert.ok(match.recruitCompanion('b', 'full-capacity', 0));
    const target = match.view('a').bots.find((bot) => bot.ownerId === 'a');
    const blocker = match.view('b').bots.find((bot) => bot.ownerId === 'b');
    assert.ok(target && blocker);
    const player = match.view('b').players.find((entry) => entry.id === 'b');
    const body = world.bodies
      .getAll()
      .find(
        (entry) =>
          entry.isDynamic() &&
          Math.hypot(
            entry.translation().x - player.position.x,
            entry.translation().z - player.position.z,
          ) < 0.01,
      );
    assert.ok(body);
    body.setTranslation({ ...target.position, y: 0.25 }, true);
    const hit = (targetId, amount = 1) =>
      match.damageBatch([
        {
          targetId,
          ownerId: 'b',
          amount,
          channel: 'contact',
          origin: 'manual',
          abilityId: 'toe-beans',
          depth: 0,
        },
      ]);
    hit(target.id);
    assert.equal(
      match.view('b').bots.find((bot) => bot.id === target.id).ownerId,
      'a',
    );
    match.damageBatch([
      {
        targetId: blocker.id,
        ownerId: 'a',
        amount: 10000,
        channel: 'direct',
        depth: 0,
      },
    ]);
    hit(target.id);
    const copies = match.view('b').bots.filter((bot) => bot.id === target.id);
    assert.equal(copies.length, 1);
    assert.equal(copies[0].ownerId, 'b');
  } finally {
    match.dispose();
    crypto.randomInt = original;
    syncBuiltinESMExports();
  }
});

test('an equipped Toe Beans attack can transfer an enemy companion', () => {
  const original = crypto.randomInt;
  crypto.randomInt = (...args) =>
    args.length === 1 && args[0] === 1_000_000 ? 0 : original(...args);
  syncBuiltinESMExports();
  const { match, world } = createAbilityMatch('checkpoint10-charm-swing');
  try {
    assert.ok(match.grantUpgrade('b', 'arms', 'branching', 1));
    assert.ok(match.grantUpgrade('b', 'toe-beans', 'common', 1));
    assert.ok(match.recruitCompanion('a', 'swing-target', 0));
    const target = match.view('a').bots.find((bot) => bot.ownerId === 'a');
    assert.ok(target);
    const player = match.view('b').players.find((entry) => entry.id === 'b');
    const findBody = (position) =>
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
    const attackerBody = findBody(player.position);
    const targetBody = findBody(target.position);
    assert.ok(attackerBody && targetBody && attackerBody !== targetBody);
    attackerBody.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
    attackerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    targetBody.setTranslation({ x: 1.8, y: 0.25, z: 0 }, true);
    targetBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    const slots = match.view('b').equipment.slots;
    const button =
      slots.primary === 'toe-beans'
        ? 1
        : slots.secondary === 'toe-beans'
          ? 2
          : 0;
    assert.ok(button);
    match.takeDamageLedger();
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'checkpoint10-charm-swing',
        playerId: 'b',
        sequence: 1,
        x: 0,
        y: 0,
        aim: Math.PI / 2,
        buttons: button,
      }),
    );
    for (let i = 0; i < 30; i++) assert.ok(match.advance(50));
    assert.ok(
      match
        .takeDamageLedger()
        .some(
          ({ event }) =>
            event.targetId === target.id &&
            event.ownerId === 'b' &&
            event.abilityId === 'toe-beans',
        ),
    );
    const transferred = match
      .view('b')
      .bots.filter((bot) => bot.id === target.id);
    assert.equal(transferred.length, 1);
    assert.equal(transferred[0].ownerId, 'b');
  } finally {
    match.dispose();
    crypto.randomInt = original;
    syncBuiltinESMExports();
  }
});
