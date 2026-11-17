import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

test('Courting Display captures a nearby wild animal', () => {
  const { match, world } = createAbilityMatch('checkpoint10-courting');
  try {
    assert.ok(match.grantUpgrade('a', 'courting-display', 'epic', 1));
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
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'checkpoint10-courting',
        playerId: 'a',
        sequence: 1,
        x: 0,
        y: 0,
        aim: 0,
        buttons: 8,
      }),
    );
    assert.ok(match.advance(100));
    assert.equal(
      match.view('a').bots.find((bot) => bot.id === target.id)?.ownerId,
      'a',
    );
  } finally {
    match.dispose();
  }
});

test('Lick Wounds heals actual damage and incoming hits shorten its cooldown', () => {
  const { match } = createAbilityMatch('checkpoint10-lick-wounds');
  try {
    for (const bot of match.view('a').bots)
      match.setBotHostility(bot.id, false);
    assert.equal(match.grantUpgrade('a', 'lick-wounds', 'rare', 1), false);
    assert.ok(match.grantUpgrade('a', 'saliva', 'common', 1));
    assert.ok(match.grantUpgrade('a', 'lick-wounds', 'rare', 1));
    const self = () => match.view('a').players.find((item) => item.id === 'a');
    assert.ok(match.damagePlayer('a', 30) > 0);
    const before = self().health.hull;
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'checkpoint10-lick-wounds',
        playerId: 'a',
        sequence: 1,
        x: 0,
        y: 0,
        aim: 0,
        buttons: 8,
      }),
    );
    assert.ok(match.advance(100));
    assert.ok(self().health.hull >= before + 10);
    const readyAt = () =>
      match
        .view('a')
        .equipment.learned.find((item) => item.id === 'lick-wounds').readyAt;
    const beforeHit = readyAt();
    const [hit] = match.damageBatch([
      { targetId: 'a', ownerId: 'b', channel: 'direct', amount: 5, depth: 0 },
    ]);
    assert.ok(hit.hull + hit.plating > 0);
    assert.ok(readyAt() < beforeHit);
  } finally {
    match.dispose();
  }
});

test('Constriction damages and stuns nearby opponents, and movement cancels later ticks', () => {
  const { match, world } = createAbilityMatch('checkpoint10-constriction');
  try {
    for (const bot of match.view('a').bots)
      match.setBotHostility(bot.id, false);
    assert.equal(match.grantUpgrade('a', 'constriction', 'rare', 1), false);
    assert.ok(match.grantUpgrade('a', 'tail', 'common', 1));
    assert.ok(match.grantUpgrade('a', 'constriction', 'rare', 1));
    assert.equal(match.view('a').equipment.slots.ultimate, 'constriction');
    for (const [id, x] of [
      ['a', 0],
      ['b', 2],
    ]) {
      const position = match
        .view(id)
        .players.find((player) => player.id === id).position;
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
      body.setTranslation({ x, y: 0.25, z: 0 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    const control = (sequence, x, buttons) =>
      match.consume({
        kind: 'control',
        matchId: 'checkpoint10-constriction',
        playerId: 'a',
        sequence,
        x,
        y: 0,
        aim: 0,
        buttons,
      });
    assert.ok(match.advance(20));
    match.takeDamageLedger();
    assert.ok(control(1, 0, 8));
    for (let i = 0; i < 5; i++) assert.ok(match.advance(100));
    const hits = (events) =>
      events.filter(
        ({ event, result }) =>
          event.ownerId === 'a' &&
          event.targetId === 'b' &&
          event.channel === 'direct' &&
          result.hull + result.plating > 0,
      );
    assert.equal(hits(match.takeDamageLedger()).length, 1);
    assert.ok(
      match
        .view('a')
        .players.find((player) => player.id === 'b')
        .statuses.some((status) => status.kind === 'stun'),
    );
    assert.ok(control(2, 1, 0));
    for (let i = 0; i < 20; i++) assert.ok(match.advance(100));
    assert.equal(hits(match.takeDamageLedger()).length, 0);
  } finally {
    match.dispose();
  }
});

test('Pistol Pincer requires Pincer and lands a higher-stat hit with knockback', () => {
  const { match, world } = createAbilityMatch('checkpoint10-pistol-pincer');
  try {
    for (const bot of match.view('a').bots)
      match.setBotHostility(bot.id, false);
    assert.equal(match.grantUpgrade('a', 'pistol-pincer', 'epic', 1), false);
    assert.ok(match.grantUpgrade('a', 'arms', 'branching', 1));
    assert.ok(match.grantUpgrade('a', 'pincer', 'common', 1));
    assert.ok(match.grantUpgrade('a', 'pistol-pincer', 'epic', 1));
    assert.ok(
      match.setModifiers('a', [
        { id: 'qa-ability', stat: 'ability', add: 10, multiplier: 1 },
      ]),
    );
    assert.equal(match.view('a').equipment.slots.ultimate, 'pistol-pincer');
    for (const [id, x] of [
      ['a', 0],
      ['b', 1.8],
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
    const stats = match.view('a').players.find((item) => item.id === 'a').stats;
    assert.ok(stats.ability > stats.physical);
    match.takeDamageLedger();
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'checkpoint10-pistol-pincer',
        playerId: 'a',
        sequence: 1,
        x: 0,
        y: 0,
        aim: Math.PI / 2,
        buttons: 8,
      }),
    );
    for (let i = 0; i < 10; i++) assert.ok(match.advance(50));
    const hits = match
      .takeDamageLedger()
      .filter(
        ({ event }) =>
          event.ownerId === 'a' &&
          event.targetId === 'b' &&
          event.abilityId === 'pistol-pincer',
      );
    assert.equal(hits.length, 1);
    const event = hits[0].event;
    const scale = (stats.ability * stats.damage) / 100;
    assert.ok(
      event.amount >= 2.2 * scale - 1e-8 && event.amount <= 2.6 * scale + 1e-8,
    );
    assert.ok(event.impulse.x > 0);
  } finally {
    match.dispose();
  }
});

test('Moulting requires Exoskeleton, stuns its user, and grants a bonus after the channel', () => {
  const { match } = createAbilityMatch('checkpoint10-moulting');
  try {
    for (const bot of match.view('a').bots)
      match.setBotHostility(bot.id, false);
    assert.equal(match.grantUpgrade('a', 'moulting', 'rare', 1), false);
    assert.ok(match.grantUpgrade('a', 'exoskeleton', 'rare', 1));
    assert.ok(match.grantUpgrade('a', 'moulting', 'rare', 1));
    assert.ok(match.view('a').progression.carcinisation > 0);
    const self = () => match.view('a').players.find((item) => item.id === 'a');
    const before = self().stats;
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'checkpoint10-moulting',
        playerId: 'a',
        sequence: 1,
        x: 0,
        y: 0,
        aim: 0,
        buttons: 8,
      }),
    );
    assert.ok(match.advance(100));
    assert.ok(self().statuses.some((status) => status.kind === 'stun'));
    for (let i = 0; i < 32; i++) assert.ok(match.advance(100));
    assert.ok(!self().statuses.some((status) => status.kind === 'stun'));
    assert.ok(
      Object.keys(before).some((stat) => self().stats[stat] > before[stat]),
    );
  } finally {
    match.dispose();
  }
});

test('Sharpen increases contact damage while its boost is active', () => {
  const run = (activate) => {
    const random = Math.random;
    Math.random = () => 0.5;
    const { match, world } = createAbilityMatch('checkpoint10-sharpen');
    try {
      for (const bot of match.view('a').bots)
        match.setBotHostility(bot.id, false);
      assert.ok(match.grantUpgrade('a', 'jaws', 'common', 1));
      assert.ok(match.grantUpgrade('a', 'sharpen', 'epic', 1));
      for (const [id, x] of [
        ['a', 0],
        ['b', 1.8],
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
      const control = (sequence, buttons) =>
        match.consume({
          kind: 'control',
          matchId: 'checkpoint10-sharpen',
          playerId: 'a',
          sequence,
          x: 0,
          y: 0,
          aim: Math.PI / 2,
          buttons,
        });
      assert.ok(match.advance(20));
      if (activate) {
        assert.ok(control(1, 8));
        for (let i = 0; i < 4; i++) assert.ok(match.advance(100));
      }
      match.takeDamageLedger();
      const slots = match.view('a').equipment.slots;
      assert.ok(control(2, slots.primary === 'jaws' ? 1 : 2));
      for (let i = 0; i < 10; i++) assert.ok(match.advance(50));
      const hits = match
        .takeDamageLedger()
        .filter(
          ({ event }) =>
            event.ownerId === 'a' &&
            event.targetId === 'b' &&
            event.abilityId === 'jaws',
        );
      assert.equal(hits.length, 1);
      return hits[0].result.hull + hits[0].result.plating;
    } finally {
      match.dispose();
      Math.random = random;
    }
  };
  assert.ok(run(true) > run(false));
});

test('Moulting loses its reward when damage interrupts the channel', () => {
  const { match } = createAbilityMatch('checkpoint10-moulting-interruption');
  try {
    for (const bot of match.view('a').bots)
      match.setBotHostility(bot.id, false);
    assert.ok(match.grantUpgrade('a', 'exoskeleton', 'rare', 1));
    assert.ok(match.grantUpgrade('a', 'moulting', 'rare', 1));
    const self = () => match.view('a').players.find((item) => item.id === 'a');
    const before = self().stats;
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'checkpoint10-moulting-interruption',
        playerId: 'a',
        sequence: 1,
        x: 0,
        y: 0,
        aim: 0,
        buttons: 8,
      }),
    );
    assert.ok(match.advance(100));
    assert.ok(self().statuses.some((status) => status.kind === 'stun'));
    const [result] = match.damageBatch([
      {
        targetId: 'a',
        ownerId: 'b',
        channel: 'direct',
        amount: before.maximumHealth * 0.6,
        depth: 0,
      },
    ]);
    assert.ok(result.hull + result.plating >= before.maximumHealth * 0.3);
    for (let i = 0; i < 32; i++) assert.ok(match.advance(100));
    assert.ok(self().health.hull > 0);
    assert.deepEqual(self().stats, before);
  } finally {
    match.dispose();
  }
});
