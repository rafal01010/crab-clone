import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';
function setup() {
  const { match, world } = createAbilityMatch('ranged-matrix');
  const body = (id) => {
    const position = match.view(id).players.find((p) => p.id === id).position;
    return world.bodies
      .getAll()
      .find(
        (b) =>
          b.isDynamic() &&
          Math.hypot(
            b.translation().x - position.x,
            b.translation().z - position.z,
          ) < 0.01,
      );
  };
  const a = body('a'),
    b = body('b');
  assert.ok(a && b);
  return { match, a, b };
}
function prepare(match, id, rarity, rank) {
  if (id === 'spit') assert.ok(match.grantUpgrade('a', 'jaws', 'common', 1));
  if (id === 'stinger') assert.ok(match.grantUpgrade('a', 'tail', 'common', 1));
  for (let current = 1; current <= rank; current++)
    assert.ok(match.grantUpgrade('a', id, rarity, current));
  assert.ok(match.advance(20));
  const offer = match.view('a').offer;
  if (offer?.kind === 'specialization') {
    assert.ok(
      match.consume({
        kind: 'choice',
        matchId: 'ranged-matrix',
        playerId: 'a',
        sequence: 1,
        offerId: offer.id,
        revision: offer.revision,
        choiceId: 'skip',
      }),
    );
    assert.ok(match.advance(20));
  }
  const slots = match.view('a').equipment.slots;
  assert.ok(slots.primary === id || slots.secondary === id);
  return slots.primary === id ? 1 : 2;
}
function attack(fixture, id, rarity, rank, distance) {
  const { match, a, b } = fixture;
  const button = prepare(match, id, rarity, rank);
  a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
  b.setTranslation({ x: distance, y: 0.25, z: 0 }, true);
  a.setLinvel({ x: 0, y: 0, z: 0 }, true);
  b.setLinvel({ x: 0, y: 0, z: 0 }, true);
  assert.ok(match.advance(20));
  match.takeDamageLedger();
  const control = (buttons) =>
    match.consume({
      kind: 'control',
      matchId: 'ranged-matrix',
      playerId: 'a',
      sequence: 2,
      x: 0,
      y: 0,
      aim: Math.PI / 2,
      buttons,
    });
  assert.ok(control(button));
  assert.ok(match.advance(50));
  assert.ok(control(0));
  for (let i = 0; i < 15; i++) assert.ok(match.advance(50));
  return match
    .takeDamageLedger()
    .filter(
      ({ event }) =>
        event.abilityId === id &&
        event.targetId === 'b' &&
        event.origin === 'manual',
    );
}
function assertClose(actual, expected, context) {
  assert.ok(
    Math.abs(actual - expected) < 0.001,
    `${context}: ${actual} != ${expected}`,
  );
}
const rows = {
  beak: {
    common: [0.9, 1.1, 1.3, 1.5, 1.7],
    rare: [1, 1.2, 1.4, 1.65, 1.85],
    epic: [1.1, 1.3, 1.5, 1.8, 2],
    legendary: [1.3, 1.5, 1.7, 2, 2.25],
  },
  spit: {
    common: [0.6, 0.7, 0.8, 0.95, 1.2],
    rare: [0.65, 0.75, 0.85, 1.05, 1.25],
    epic: [0.7, 0.8, 0.9, 1.1, 1.3],
    legendary: [0.8, 0.9, 1, 1.2, 1.4],
  },
  'projectile-tongue': {
    rare: [1.05, 1.25, 1.45, 1.65, 1.85],
    epic: [1.15, 1.35, 1.6, 1.8, 2.05],
    legendary: [1.35, 1.55, 1.8, 2, 2.25],
  },
  leech: {
    rare: [1.05, 1.25, 1.45, 1.65, 1.85],
    epic: [1.15, 1.35, 1.6, 1.8, 2.05],
    legendary: [1.35, 1.55, 1.8, 2, 2.25],
  },
  stinger: {
    rare: [0.8, 0.9, 1, 1.1, 1.2],
    epic: [1.1, 1.3, 1.5, 1.75, 2],
    legendary: [1.3, 1.5, 1.7, 1.95, 2.25],
  },
};
for (const [id, rarities] of Object.entries(rows))
  test(`${id} damage uses the source midpoint at every rank and rarity`, () => {
    for (const [rarity, values] of Object.entries(rarities))
      for (const [index, coefficient] of values.entries()) {
        const fixture = setup();
        try {
          const hits = attack(
            fixture,
            id,
            rarity,
            index + 1,
            id === 'beak'
              ? 3
              : id === 'spit' || id === 'projectile-tongue'
                ? 5
                : 1.8,
          );
          assert.equal(
            hits.length,
            1,
            `${id} ${rarity} rank ${index + 1}: expected one attributed hit`,
          );
          assertClose(
            hits[0].result.hull,
            coefficient * 10,
            `${id} ${rarity} rank ${index + 1}`,
          );
        } finally {
          fixture.match.dispose();
        }
      }
  });

test('Stoner full-charge damage and ammunition follow rank and rarity', () => {
  const charged = {
    common: [2.2, 2.4, 2.6, 2.8, 3],
    rare: [2.4, 2.6, 2.8, 3, 3.2],
    epic: [2.6, 2.8, 3, 3.2, 3.4],
    legendary: [2.8, 3, 3.2, 3.4, 3.6],
  };
  for (const [rarity, values] of Object.entries(charged))
    for (const [index, coefficient] of values.entries()) {
      const { match, a, b } = setup();
      try {
        assert.ok(match.grantUpgrade('a', 'arms', 'branching', 1));
        const button = prepare(match, 'stoner', rarity, index + 1);
        a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
        b.setTranslation({ x: 5, y: 0.25, z: 0 }, true);
        a.setLinvel({ x: 0, y: 0, z: 0 }, true);
        b.setLinvel({ x: 0, y: 0, z: 0 }, true);
        const ammo = () =>
          match
            .view('a')
            .equipment.learned.find((entry) => entry.id === 'stoner')
            .ammunition;
        assert.equal(ammo().capacity, index + 2);
        assert.equal(ammo().charges, index + 2);
        match.takeDamageLedger();
        const control = (buttons) =>
          match.consume({
            kind: 'control',
            matchId: 'ranged-matrix',
            playerId: 'a',
            sequence: 2,
            x: 0,
            y: 0,
            aim: Math.PI / 2,
            buttons,
          });
        for (let i = 0; i < 26; i++) {
          assert.ok(control(button));
          assert.ok(match.advance(50));
        }
        assert.ok(control(0));
        for (let i = 0; i < 16; i++) assert.ok(match.advance(50));
        const hits = match
          .takeDamageLedger()
          .filter(
            ({ event }) =>
              event.abilityId === 'stoner' &&
              event.targetId === 'b' &&
              event.origin === 'manual',
          );
        assert.equal(hits.length, 1, `${rarity} rank ${index + 1}`);
        assertClose(
          hits[0].result.hull,
          coefficient * 12,
          `${rarity} rank ${index + 1}`,
        );
        assert.equal(ammo().charges, index + 1);
      } finally {
        match.dispose();
      }
    }
});
