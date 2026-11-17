import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

test('Pack boosts owner and ally damage according to charmed companions, not summons', () => {
  const { match } = createAbilityMatch('checkpoint10-pack');
  try {
    assert.equal(match.grantUpgrade('a', 'pack', 'rare', 1), false);
    assert.ok(match.grantUpgrade('a', 'alpha', 'branching', 1));
    assert.ok(match.grantUpgrade('a', 'pack', 'rare', 1));
    const hit = (ownerId) =>
      match.damageBatch([
        { targetId: 'b', ownerId, amount: 10, channel: 'direct', depth: 0 },
      ])[0].hull;
    assert.equal(hit('a'), 10);
    assert.ok(match.scheduleAlly('a', 'summoned', 0, 30000));
    assert.ok(match.advance(50));
    const summon = match
      .view('a')
      .bots.find((bot) => bot.ownerId === 'a' && bot.kind === 'summoned');
    assert.ok(summon);
    assert.equal(hit('a'), 10);
    assert.ok(match.recruitCompanion('a', 'pack-companion', 0));
    assert.ok(match.advance(50));
    const companion = match
      .view('a')
      .bots.find((bot) => bot.ownerId === 'a' && bot.kind === 'charmed');
    assert.ok(companion);
    for (const ownerId of ['a', companion.id, summon.id])
      assert.ok(Math.abs(hit(ownerId) - 10.3) < 1e-8);
  } finally {
    match.dispose();
  }
});

test('finale ally upgrades distinguish charmed companions, summons, and boundary damage', () => {
  const { match } = createAbilityMatch('checkpoint10-finale-allies');
  try {
    assert.equal(
      match.grantUpgrade('a', 'strength-in-numbers', 'legendary', 1),
      false,
    );
    assert.ok(match.setWorldCondition('finale', true));
    for (let rank = 1; rank <= 5; rank++)
      assert.ok(
        match.grantUpgrade('a', 'strength-in-numbers', 'legendary', rank),
      );
    for (let rank = 1; rank <= 2; rank++)
      assert.ok(match.grantUpgrade('a', 'commanding', 'common', rank));
    assert.ok(match.recruitCompanion('a', 'finale-companion', 0));
    assert.ok(match.scheduleAlly('a', 'summoned', 0, 30000));
    assert.ok(match.advance(50));
    const bots = match.view('a').bots;
    const charmed = bots.find(
      (bot) => bot.ownerId === 'a' && bot.kind === 'charmed',
    );
    const summoned = bots.find(
      (bot) => bot.ownerId === 'a' && bot.kind === 'summoned',
    );
    assert.ok(charmed);
    assert.ok(summoned);
    const hit = (targetId, channel, ownerId = null) =>
      match.damageBatch([
        { targetId, ownerId, amount: 1, channel, depth: 0 },
      ])[0];
    assert.ok(Math.abs(hit('a', 'meteor').hull - 0.95) < 1e-8);
    assert.ok(Math.abs(hit(charmed.id, 'meteor').hull - 0.95) < 1e-8);
    assert.equal(hit(summoned.id, 'meteor').hull, 1);
    assert.equal(hit('a', 'boundary').hull, 1);
    assert.equal(hit(charmed.id, 'boundary').hull, 1);
    assert.ok(Math.abs(hit('b', 'direct', charmed.id).hull - 1.1) < 1e-8);
    assert.equal(hit('b', 'direct', summoned.id).hull, 1);
  } finally {
    match.dispose();
  }
});

test('timed finale unlocks its upgrade at the boundary and applies real meteor and collapse hazards', () => {
  const { match } = createAbilityMatch('checkpoint10-timed-finale', {
    finale: {
      shrinkStartMs: 1000,
      tinyAtMs: 100000,
      collapseAtMs: 200000,
      initialRadius: 110,
      tinyRadius: 3,
      meteorIntervalMs: 1000,
      meteorWarningMs: 50,
      meteorRadius: 109,
      meteorDamage: 1,
    },
  });
  try {
    assert.equal(
      match.grantUpgrade('a', 'strength-in-numbers', 'legendary', 1),
      false,
    );
    assert.ok(match.recruitCompanion('a', 'timed-companion', 0));
    assert.ok(match.advance(1000));
    assert.equal(match.view('a').boundary.elapsedMs, 1000);
    assert.ok(match.grantUpgrade('a', 'strength-in-numbers', 'legendary', 1));
    const companion = match
      .view('a')
      .bots.find((bot) => bot.ownerId === 'a' && bot.kind === 'charmed');
    assert.ok(companion);
    match.takeDamageLedger();
    assert.ok(match.advance(50));
    const meteor = match.takeDamageLedger();
    for (const targetId of ['a', companion.id]) {
      const hit = meteor.find(
        ({ event }) =>
          event.channel === 'meteor' && event.targetId === targetId,
      );
      assert.ok(hit, `meteor hit ${targetId}`);
      assert.ok(Math.abs(hit.result.hull - 0.99) < 1e-8);
    }
    match.syncWallClock(1000);
    match.syncWallClock(200000);
    match.takeDamageLedger();
    assert.ok(match.advance(50));
    const collapse = match.takeDamageLedger();
    assert.ok(
      collapse.some(
        ({ event, result }) =>
          event.channel === 'boundary' &&
          event.targetId === companion.id &&
          result.hull > 0,
      ),
    );
    assert.ok(
      collapse.some(
        ({ event, result }) =>
          event.channel === 'boundary' &&
          event.targetId === 'a' &&
          result.hull > 0,
      ),
    );
  } finally {
    match.dispose();
  }
});
