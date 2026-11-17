import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

test('Fungoid Ejection advances firmware generation after an enemy hit', () => {
  const run = (choiceId, attacker = 'b') => {
    const { match, world } = createAbilityMatch('checkpoint10-fungoid');
    const random = Math.random;
    try {
      Math.random = () => 0;
      assert.ok(
        match.setModifiers('a', [
          { id: 'health', stat: 'maximumHealth', add: 900, multiplier: 1 },
        ]),
      );
      match.repairPlayer('a', 1000, false);
      for (let rank = 1; rank <= 3; rank++)
        assert.ok(match.grantUpgrade('a', 'fungoid', 'rare', rank));
      assert.ok(match.advance(20));
      const offer = match.view('a').offer;
      assert.ok(offer && offer.choices.includes(choiceId));
      assert.ok(
        match.consume({
          kind: 'choice',
          matchId: 'checkpoint10-fungoid',
          playerId: 'a',
          sequence: 1,
          offerId: offer.id,
          revision: offer.revision,
          choiceId,
        }),
      );
      const player = match.view('a').players.find((entry) => entry.id === 'a');
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
      body.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      assert.ok(match.advance(20));
      const before = new Set(
        match.view('a').firmware.map((module) => module.id),
      );
      const [result] = match.damageBatch([
        {
          targetId: 'a',
          ownerId: attacker,
          channel: 'direct',
          amount: 1,
          depth: 0,
        },
      ]);
      assert.ok(result.hull > 0);
      match.takeDamageLedger();
      for (let i = 0; i < 140; i++) {
        for (const bot of match.view('a').bots)
          match.damageBatch([
            {
              targetId: bot.id,
              ownerId: null,
              channel: 'direct',
              amount: 10000,
              depth: 0,
            },
          ]);
        assert.ok(match.advance(100));
      }
      assert.equal(
        match
          .takeDamageLedger()
          .filter(
            ({ event, result }) =>
              event.targetId === 'a' &&
              event.ownerId !== 'a' &&
              result.hull + result.plating > 0,
          ).length,
        0,
      );
      return match
        .view('a')
        .firmware.filter((module) => !before.has(module.id));
    } finally {
      Math.random = random;
      match.dispose();
    }
  };
  assert.equal(run('fungoid-ejection').length, 1);
  assert.equal(run('skip').length, 0);
  assert.equal(run('fungoid-ejection', 'a').length, 0);
});

test('Cordyceps charms on an owned corrosion tick but not after skip or during protection', () => {
  const original = crypto.randomInt;
  crypto.randomInt = (...args) =>
    args.length === 1 && args[0] === 1_000_000 ? 0 : original(...args);
  syncBuiltinESMExports();
  const run = (choiceId, protectedOwner) => {
    const { match } = createAbilityMatch('checkpoint10-cordyceps');
    const random = Math.random;
    try {
      Math.random = () => 0.99;
      assert.ok(
        match.setModifiers('a', [
          { id: 'senses', stat: 'senses', add: 400, multiplier: 1 },
        ]),
      );
      for (let rank = 1; rank <= 3; rank++)
        assert.ok(match.grantUpgrade('a', 'fungoid', 'rare', rank));
      assert.ok(match.advance(20));
      const offer = match.view('a').offer;
      assert.ok(offer && offer.choices.includes(choiceId));
      assert.ok(
        match.consume({
          kind: 'choice',
          matchId: 'checkpoint10-cordyceps',
          playerId: 'a',
          sequence: 1,
          offerId: offer.id,
          revision: offer.revision,
          choiceId,
        }),
      );
      const bot = match
        .view('a')
        .bots.find((entry) => entry.kind === 'wild' && !entry.elite);
      assert.ok(bot);
      assert.ok(
        match.applyStatus(bot.id, {
          kind: 'corrosion',
          ownerId: 'a',
          magnitude: 1,
          duration: 2000,
        }),
      );
      if (protectedOwner)
        assert.ok(
          match.setOffer('a', {
            id: 'cordyceps-protected',
            revision: 1,
            choices: ['done'],
          }),
        );
      match.takeDamageLedger();
      for (let i = 0; i < 11; i++) assert.ok(match.advance(100));
      const ticks = match
        .takeDamageLedger()
        .filter(
          ({ event }) =>
            event.channel === 'corrosion' &&
            event.targetId === bot.id &&
            event.ownerId === 'a',
        );
      const target = match.view('a').bots.find((entry) => entry.id === bot.id);
      assert.ok(target);
      if (protectedOwner) {
        assert.equal(target.ownerId, null);
        assert.equal(ticks.length, 0);
        assert.ok(
          match.consume({
            kind: 'choice',
            matchId: 'checkpoint10-cordyceps',
            playerId: 'a',
            sequence: 2,
            offerId: 'cordyceps-protected',
            revision: 1,
            choiceId: 'done',
          }),
        );
        assert.ok(match.advance(500));
        assert.equal(
          match
            .takeDamageLedger()
            .filter(
              ({ event }) =>
                event.channel === 'corrosion' && event.targetId === bot.id,
            ).length,
          0,
        );
        for (let i = 0; i < 5; i++) assert.ok(match.advance(100));
        assert.equal(
          match.view('a').bots.find((entry) => entry.id === bot.id).ownerId,
          'a',
        );
      }
      return { owner: target.ownerId, ticks: ticks.length };
    } finally {
      Math.random = random;
      match.dispose();
    }
  };
  try {
    assert.deepEqual(run('fungoid-cordyceps', false), { owner: 'a', ticks: 1 });
    assert.deepEqual(run('skip', false), { owner: null, ticks: 1 });
    assert.deepEqual(run('fungoid-cordyceps', true), { owner: null, ticks: 0 });
  } finally {
    crypto.randomInt = original;
    syncBuiltinESMExports();
  }
});
