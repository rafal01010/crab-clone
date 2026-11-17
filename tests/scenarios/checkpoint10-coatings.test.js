import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

test('Poisonous Saliva coats compatible equipped attacks with attributed corrosion', () => {
  for (const [weapon, rarity, distance] of [
    ['jaws', 'common', 1.8],
    ['beak', 'common', 1.8],
    ['leech', 'rare', 1.8],
    ['spit', 'common', 4],
    ['projectile-tongue', 'rare', 4],
  ]) {
    const { match, world } = createAbilityMatch('checkpoint10-coatings');
    try {
      assert.equal(
        match.grantUpgrade('a', 'poisonous-saliva', 'rare', 1),
        false,
      );
      assert.ok(match.grantUpgrade('a', 'saliva', 'common', 1));
      assert.ok(match.grantUpgrade('a', weapon, rarity, 1), weapon);
      assert.ok(match.grantUpgrade('a', 'poisonous-saliva', 'rare', 1), weapon);
      for (const [id, x] of [
        ['a', 0],
        ['b', distance],
      ]) {
        const point = match
          .view(id)
          .players.find((player) => player.id === id).position;
        const body = world.bodies
          .getAll()
          .find(
            (entry) =>
              entry.isDynamic() &&
              Math.hypot(
                entry.translation().x - point.x,
                entry.translation().z - point.z,
              ) < 0.01,
          );
        assert.ok(body);
        body.setTranslation({ x, y: 0.25, z: 0 }, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
      assert.ok(match.advance(20));
      match.takeDamageLedger();
      const slots = match.view('a').equipment.slots;
      const button =
        slots.primary === weapon ? 1 : slots.secondary === weapon ? 2 : 0;
      assert.ok(button, weapon);
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint10-coatings',
          playerId: 'a',
          sequence: 1,
          x: 0,
          y: 0,
          aim: Math.PI / 2,
          buttons: button,
        }),
      );
      for (let i = 0; i < 40; i++) assert.ok(match.advance(50));
      const ledger = match.takeDamageLedger();
      assert.ok(
        ledger.some(
          ({ event, result }) =>
            event.abilityId === weapon &&
            event.targetId === 'b' &&
            result.hull + result.plating > 0,
        ),
        `${weapon}: attack`,
      );
      assert.ok(
        ledger.some(
          ({ event, result }) =>
            event.channel === 'corrosion' &&
            event.ownerId === 'a' &&
            event.targetId === 'b' &&
            result.hull > 0,
        ),
        `${weapon}: corrosion`,
      );
    } finally {
      match.dispose();
    }
  }
});

test('Poisonous Saliva does not coat a Horns attack', () => {
  const { match, world } = createAbilityMatch('checkpoint10-uncoated');
  try {
    assert.ok(match.grantUpgrade('a', 'saliva', 'common', 1));
    assert.ok(match.grantUpgrade('a', 'jaws', 'common', 1));
    assert.ok(match.grantUpgrade('a', 'poisonous-saliva', 'rare', 1));
    assert.ok(match.grantUpgrade('a', 'horns', 'rare', 1));
    for (const [id, x] of [
      ['a', 0],
      ['b', 1.8],
    ]) {
      const point = match
        .view(id)
        .players.find((player) => player.id === id).position;
      const body = world.bodies
        .getAll()
        .find(
          (entry) =>
            entry.isDynamic() &&
            Math.hypot(
              entry.translation().x - point.x,
              entry.translation().z - point.z,
            ) < 0.01,
        );
      assert.ok(body);
      body.setTranslation({ x, y: 0.25, z: 0 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    assert.ok(match.advance(20));
    match.takeDamageLedger();
    const slots = match.view('a').equipment.slots;
    const button =
      slots.primary === 'horns' ? 1 : slots.secondary === 'horns' ? 2 : 0;
    assert.ok(button);
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'checkpoint10-uncoated',
        playerId: 'a',
        sequence: 1,
        x: 0,
        y: 0,
        aim: Math.PI / 2,
        buttons: button,
      }),
    );
    for (let i = 0; i < 40; i++) assert.ok(match.advance(50));
    const ledger = match.takeDamageLedger();
    assert.ok(
      ledger.some(
        ({ event, result }) =>
          event.abilityId === 'horns' &&
          event.targetId === 'b' &&
          result.hull + result.plating > 0,
      ),
    );
    assert.equal(
      ledger.some(
        ({ event }) =>
          event.channel === 'corrosion' &&
          event.ownerId === 'a' &&
          event.targetId === 'b',
      ),
      false,
    );
  } finally {
    match.dispose();
  }
});

test('a protected coating owner cannot deal or accumulate corrosion ticks', () => {
  const { match, world } = createAbilityMatch('checkpoint10-protected-coating');
  try {
    assert.ok(match.grantUpgrade('a', 'saliva', 'common', 1));
    assert.ok(match.grantUpgrade('a', 'jaws', 'common', 1));
    assert.ok(match.grantUpgrade('a', 'poisonous-saliva', 'rare', 1));
    for (const [id, x] of [
      ['a', 0],
      ['b', 1.8],
    ]) {
      const point = match
        .view(id)
        .players.find((player) => player.id === id).position;
      const body = world.bodies
        .getAll()
        .find(
          (entry) =>
            entry.isDynamic() &&
            Math.hypot(
              entry.translation().x - point.x,
              entry.translation().z - point.z,
            ) < 0.01,
        );
      assert.ok(body);
      body.setTranslation({ x, y: 0.25, z: 0 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    assert.ok(match.advance(20));
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'checkpoint10-protected-coating',
        playerId: 'a',
        sequence: 1,
        x: 0,
        y: 0,
        aim: Math.PI / 2,
        buttons: 1,
      }),
    );
    for (let i = 0; i < 5; i++) assert.ok(match.advance(50));
    assert.ok(
      match
        .view('a')
        .players.find((player) => player.id === 'b')
        .statuses.some((status) => status.kind === 'corrosion'),
    );
    match.takeDamageLedger();
    assert.ok(
      match.setOffer('a', {
        id: 'protected-coating',
        revision: 1,
        choices: ['done'],
      }),
    );
    for (let i = 0; i < 40; i++) assert.ok(match.advance(50));
    const ticks = (ledger) =>
      ledger.filter(
        ({ event }) =>
          event.channel === 'corrosion' &&
          event.ownerId === 'a' &&
          event.targetId === 'b',
      );
    assert.equal(ticks(match.takeDamageLedger()).length, 0);
    assert.ok(
      match.consume({
        kind: 'choice',
        matchId: 'checkpoint10-protected-coating',
        playerId: 'a',
        sequence: 2,
        offerId: 'protected-coating',
        revision: 1,
        choiceId: 'done',
      }),
    );
    for (let i = 0; i < 20; i++) assert.ok(match.advance(50));
    assert.equal(ticks(match.takeDamageLedger()).length, 1);
  } finally {
    match.dispose();
  }
});

test('overlapping corrosion keeps owner attribution and suppresses only the choosing owner', () => {
  const { match } = createAbilityMatch('checkpoint10-overlapping-corrosion');
  try {
    for (const bot of match.view('c').bots)
      match.setBotHostility(bot.id, false);
    for (const ownerId of ['a', 'b'])
      assert.ok(
        match.applyStatus('c', {
          kind: 'corrosion',
          ownerId,
          magnitude: 1,
          duration: 4000,
        }),
      );
    assert.ok(
      match.setOffer('a', {
        id: 'corrosion-choice',
        revision: 1,
        choices: ['done'],
      }),
    );
    match.takeDamageLedger();
    for (let i = 0; i < 12; i++) assert.ok(match.advance(100));
    const ticks = (ledger, ownerId) =>
      ledger.filter(
        ({ event }) =>
          event.channel === 'corrosion' &&
          event.ownerId === ownerId &&
          event.targetId === 'c',
      );
    const protectedLedger = match.takeDamageLedger();
    assert.equal(ticks(protectedLedger, 'a').length, 0);
    assert.ok(ticks(protectedLedger, 'b').length > 0);
    assert.ok(
      match.consume({
        kind: 'choice',
        matchId: 'checkpoint10-overlapping-corrosion',
        playerId: 'a',
        sequence: 1,
        offerId: 'corrosion-choice',
        revision: 1,
        choiceId: 'done',
      }),
    );
    for (let i = 0; i < 5; i++) assert.ok(match.advance(100));
    assert.equal(ticks(match.takeDamageLedger(), 'a').length, 0);
    for (let i = 0; i < 5; i++) assert.ok(match.advance(100));
    const resumed = match.takeDamageLedger();
    assert.equal(ticks(resumed, 'a').length, 1);
    assert.ok(ticks(resumed, 'b').length > 0);
  } finally {
    match.dispose();
  }
});
