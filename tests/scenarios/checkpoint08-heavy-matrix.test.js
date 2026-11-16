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

const tables = {
  pincer: {
    common: [0.8, 1, 1.2, 1.4, 1.6],
    rare: [0.85, 1.05, 1.25, 1.475, 1.675],
    epic: [0.9, 1.1, 1.3, 1.55, 1.75],
    legendary: [1.1, 1.2, 1.4, 1.65, 1.85],
  },
  jaws: {
    common: [0.85, 1.05, 1.25, 1.45, 1.65],
    rare: [0.95, 1.15, 1.35, 1.55, 1.8],
    epic: [1.05, 1.3, 1.45, 1.7, 1.9],
    legendary: [1.25, 1.45, 1.65, 1.9, 2.1],
  },
  antlers: {
    common: [1.4, 1.6, 1.8, 2, 2.2],
    rare: [1.5, 1.7, 1.9, 2.15, 2.45],
    epic: [1.6, 1.8, 2.05, 2.35, 2.7],
    legendary: [1.8, 2, 2.25, 2.55, 2.95],
  },
  trunk: {
    rare: [1.2, 1.5, 1.8, 2.1, 2.4],
    epic: [1.4, 1.7, 2, 2.3, 2.6],
    legendary: [1.6, 1.9, 2.2, 2.5, 2.8],
  },
  horns: {
    rare: [1.2, 1.4, 1.6, 1.85, 2.1],
    epic: [1.3, 1.5, 1.75, 1.95, 2.2],
    legendary: [1.5, 1.7, 1.95, 2.15, 2.4],
  },
};
for (const [id, rarities] of Object.entries(tables)) {
  test(`${id} rank and rarity coefficients drive real attacks`, () => {
    for (const [rarity, values] of Object.entries(rarities)) {
      for (const [index, coefficient] of values.entries()) {
        const { match, a, b } = setup();
        try {
          if (id === 'pincer')
            assert.ok(match.grantUpgrade('a', 'arms', 'branching', 1));
          for (let rank = 1; rank <= index + 1; rank++)
            assert.ok(match.grantUpgrade('a', id, rarity, rank));
          if (id === 'jaws' && index >= 2) {
            assert.ok(match.advance(20));
            const offer = match.view('a').offer;
            assert.equal(offer.kind, 'specialization');
            assert.ok(
              match.consume({
                kind: 'choice',
                matchId: 'attacks',
                playerId: 'a',
                sequence: 1,
                offerId: offer.id,
                revision: offer.revision,
                choiceId: 'jaws-stalker',
              }),
            );
            assert.ok(match.advance(2000));
          }
          const button = equip(match, id);
          position(a, b, id === 'horns' ? 3 : 1.8);
          assert.ok(match.advance(20));
          match.takeDamageLedger();
          attack(match, button);
          const hits = match
            .takeDamageLedger()
            .filter(
              ({ event }) => event.abilityId === id && event.targetId === 'b',
            );
          assert.equal(
            hits.length,
            id === 'pincer' ? 2 : 1,
            `${id} ${rarity} rank ${index + 1}`,
          );
          const expected = coefficient * (id === 'pincer' ? 12 : 10);
          assert.ok(
            hits.every(
              ({ result }) => Math.abs(result.hull - expected) < 0.001,
            ),
            `${id} ${rarity} rank ${index + 1}`,
          );
        } finally {
          match.dispose();
        }
      }
    }
  });
}
