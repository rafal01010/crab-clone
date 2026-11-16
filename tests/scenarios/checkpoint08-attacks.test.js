import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

function setup() {
  const { match, world } = createAbilityMatch('attacks');
  const body = (id) => {
    const pos = match.view(id).players.find((p) => p.id === id).position;
    return world.bodies
      .getAll()
      .find(
        (b) =>
          b.isDynamic() &&
          Math.hypot(b.translation().x - pos.x, b.translation().z - pos.z) <
            0.01,
      );
  };
  return { match, a: body('a'), b: body('b') };
}
function equip(match, id) {
  assert.ok(match.advance(20));
  const view = match.view('a');
  if (view.offer)
    assert.ok(
      match.consume({
        kind: 'choice',
        matchId: 'attacks',
        playerId: 'a',
        sequence: 1,
        offerId: view.offer.id,
        revision: view.offer.revision,
        choiceId: 'primary',
      }),
    );
  const slots = match.view('a').equipment.slots;
  assert.ok(slots.primary === id || slots.secondary === id);
  return slots.primary === id ? 1 : 2;
}
function attack(match, buttons) {
  assert.ok(
    match.consume({
      kind: 'control',
      matchId: 'attacks',
      playerId: 'a',
      sequence: 2,
      x: 0,
      y: 0,
      aim: Math.PI / 2,
      buttons,
    }),
  );
  for (let i = 0; i < 10; i++) assert.ok(match.advance(50));
}
function position(a, b, distance) {
  a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
  b.setTranslation({ x: distance, y: 0.25, z: 0 }, true);
  a.setLinvel({ x: 0, y: 0, z: 0 }, true);
  b.setLinvel({ x: 0, y: 0, z: 0 }, true);
}

test('Pincer lands two ability-scaled hits from one attack', () => {
  const { match, a, b } = setup();
  try {
    assert.ok(match.grantUpgrade('a', 'arms', 'branching', 1));
    assert.ok(match.grantUpgrade('a', 'pincer', 'common', 1));
    const button = equip(match, 'pincer');
    position(a, b, 1.8);
    assert.ok(match.advance(20));
    match.takeDamageLedger();
    attack(match, button);
    const hits = match
      .takeDamageLedger()
      .filter(
        ({ event }) => event.abilityId === 'pincer' && event.targetId === 'b',
      );
    assert.equal(hits.length, 2);
    assert.ok(hits.every(({ result }) => Math.abs(result.hull - 9.6) < 0.001));
  } finally {
    match.dispose();
  }
});

test('Trunk strikes at its extended range using the lower combat stat', () => {
  const run = (distance) => {
    const { match, a, b } = setup();
    try {
      assert.ok(
        match.setModifiers('a', [
          { id: 'ability', stat: 'ability', add: 10, multiplier: 1 },
        ]),
      );
      assert.ok(match.grantUpgrade('a', 'trunk', 'rare', 1));
      const button = equip(match, 'trunk');
      assert.ok(
        Math.abs(
          match.view('a').players.find((p) => p.id === 'a').stats.salvageReach -
            1.66,
        ) < 0.001,
      );
      position(a, b, distance);
      assert.ok(match.advance(20));
      match.takeDamageLedger();
      attack(match, button);
      return match
        .takeDamageLedger()
        .filter(
          ({ event }) => event.abilityId === 'trunk' && event.targetId === 'b',
        );
    } finally {
      match.dispose();
    }
  };
  const hits = run(2.3);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].result.hull, 12);
  assert.equal(run(3.2).length, 0);
});

test('repeated Stinger hits create independent corrosion stacks', () => {
  const { match } = setup();
  try {
    assert.ok(match.grantUpgrade('a', 'tail', 'common', 1));
    assert.ok(match.grantUpgrade('a', 'stinger', 'rare', 1));
    const hit = () =>
      match.damageBatch([
        {
          targetId: 'b',
          ownerId: 'a',
          amount: 1,
          channel: 'contact',
          origin: 'manual',
          abilityId: 'stinger',
          depth: 0,
        },
      ]);
    hit();
    hit();
    match.takeDamageLedger();
    for (let i = 0; i < 10; i++) assert.ok(match.advance(100));
    const ticks = match
      .takeDamageLedger()
      .filter(
        ({ event }) => event.targetId === 'b' && event.channel === 'corrosion',
      );
    assert.equal(ticks.length, 2);
    assert.ok(
      ticks.every(({ result }) => Math.abs(result.hull - 1.925) < 0.001),
    );
  } finally {
    match.dispose();
  }
});

test('same-owner non-poison status applications still refresh', () => {
  const { match } = setup();
  try {
    for (const duration of [1000, 3000])
      assert.ok(
        match.applyStatus('b', {
          kind: 'slow',
          ownerId: 'a',
          magnitude: 0.2,
          duration,
        }),
      );
    const statuses = match
      .view('b')
      .players.find((player) => player.id === 'b')
      .statuses.filter((status) => status.kind === 'slow');
    assert.equal(statuses.length, 1);
    assert.equal(statuses[0].remaining, 3000);
  } finally {
    match.dispose();
  }
});

test('a non-poison status can replace a corrosion stack at capacity', () => {
  const { match } = setup();
  try {
    for (let i = 0; i < 128; i++)
      assert.ok(
        match.applyStatus('b', {
          kind: 'corrosion',
          ownerId: 'a',
          magnitude: 1,
          duration: i === 0 ? 1000 : 3000,
        }),
      );
    assert.ok(
      match.applyStatus('b', {
        kind: 'stun',
        ownerId: 'a',
        magnitude: 1,
        duration: 2000,
      }),
    );
    const statuses = match
      .view('b')
      .players.find((player) => player.id === 'b').statuses;
    assert.equal(
      statuses.filter((status) => status.kind === 'corrosion').length,
      127,
    );
    assert.ok(
      statuses
        .filter((status) => status.kind === 'corrosion')
        .every((status) => status.remaining === 3000),
    );
    assert.equal(statuses.filter((status) => status.kind === 'stun').length, 1);
  } finally {
    match.dispose();
  }
});
