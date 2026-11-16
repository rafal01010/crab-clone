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

test('Claws damage and cooldown follow rank and rarity in a live attack', () => {
  const coefficients = {
    common: [0.775, 0.975, 1.175, 1.375, 1.575],
    rare: [0.825, 1.025, 1.225, 1.425, 1.625],
    epic: [0.875, 1.075, 1.275, 1.475, 1.675],
    legendary: [1, 1.2, 1.4, 1.6, 1.8],
  };
  for (const [rarity, values] of Object.entries(coefficients))
    for (const [index, coefficient] of values.entries()) {
      const rank = index + 1;
      const expectedDamage = coefficient * 12;
      const expectedCooldown = 500 - index * 50;
      const { match, a, b } = setup();
      try {
        assert.ok(match.grantUpgrade('a', 'arms', 'branching', 1));
        for (let r = 1; r <= rank; r++)
          assert.ok(match.grantUpgrade('a', 'claws', rarity, r));
        const button = equip(match, 'claws');
        position(a, b, 1.8);
        assert.ok(match.advance(20));
        const time = match.view('a').time;
        match.takeDamageLedger();
        assert.ok(
          match.consume({
            kind: 'control',
            matchId: 'attacks',
            playerId: 'a',
            sequence: 2,
            x: 0,
            y: 0,
            aim: Math.PI / 2,
            buttons: button,
          }),
        );
        assert.ok(match.advance(50));
        assert.ok(
          match.consume({
            kind: 'control',
            matchId: 'attacks',
            playerId: 'a',
            sequence: 3,
            x: 0,
            y: 0,
            aim: Math.PI / 2,
            buttons: 0,
          }),
        );
        for (let i = 0; i < 9; i++) assert.ok(match.advance(50));
        const hits = match
          .takeDamageLedger()
          .filter(
            ({ event }) =>
              event.abilityId === 'claws' && event.targetId === 'b',
          );
        assert.equal(hits.length, 1);
        assert.ok(Math.abs(hits[0].result.hull - expectedDamage) < 0.001);
        const ability = match
          .view('a')
          .equipment.learned.find((entry) => entry.id === 'claws');
        assert.ok(Math.abs(ability.readyAt - time - expectedCooldown) < 25);
      } finally {
        match.dispose();
      }
    }
});

test('Toe Beans uses social damage at every rank and rarity', () => {
  const coefficients = {
    common: [1.2, 1.4, 1.6, 1.8, 2],
    rare: [1.25, 1.475, 1.675, 1.875, 2.075],
    epic: [1.3, 1.55, 1.75, 1.95, 2.15],
    legendary: [1.4, 1.65, 1.85, 2.05, 2.25],
  };
  for (const [rarity, values] of Object.entries(coefficients))
    for (const [index, coefficient] of values.entries()) {
      const rank = index + 1;
      const expected = coefficient * 5;
      const { match, a, b } = setup();
      try {
        assert.ok(match.grantUpgrade('a', 'arms', 'branching', 1));
        for (let r = 1; r <= rank; r++)
          assert.ok(match.grantUpgrade('a', 'toe-beans', rarity, r));
        const button = equip(match, 'toe-beans');
        position(a, b, 1.8);
        assert.ok(match.advance(20));
        match.takeDamageLedger();
        attack(match, button);
        const hits = match
          .takeDamageLedger()
          .filter(
            ({ event }) =>
              event.abilityId === 'toe-beans' && event.targetId === 'b',
          );
        assert.equal(hits.length, 1);
        assert.ok(Math.abs(hits[0].result.hull - expected) < 0.001);
      } finally {
        match.dispose();
      }
    }
});

test('Beak lands its ability-scaled attack at range and grants salvage speed', () => {
  const { match, a, b } = setup();
  try {
    assert.ok(match.grantUpgrade('a', 'beak', 'rare', 1));
    const button = equip(match, 'beak');
    assert.ok(
      match.view('a').players.find((player) => player.id === 'a').stats
        .salvageSpeed > 100,
    );
    position(a, b, 4);
    assert.ok(match.advance(20));
    match.takeDamageLedger();
    attack(match, button);
    const hits = match
      .takeDamageLedger()
      .filter(
        ({ event }) => event.abilityId === 'beak' && event.targetId === 'b',
      );
    assert.equal(hits.length, 1);
    assert.equal(hits[0].result.hull, 10);
  } finally {
    match.dispose();
  }
});
