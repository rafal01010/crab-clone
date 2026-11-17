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
function position(a, b, distance) {
  a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
  b.setTranslation({ x: distance, y: 0.25, z: 0 }, true);
  a.setLinvel({ x: 0, y: 0, z: 0 }, true);
  b.setLinvel({ x: 0, y: 0, z: 0 }, true);
}

const poisons = {
  rare: [0.175, 0.225, 0.275, 0.325, 0.375],
  epic: [0.225, 0.275, 0.325, 0.375, 0.425],
  legendary: [0.275, 0.325, 0.375, 0.425, 0.475],
};
test('Stinger poison ticks follow every rank and rarity coefficient', () => {
  for (const [rarity, values] of Object.entries(poisons))
    for (const [index, coefficient] of values.entries()) {
      const { match } = setup();
      try {
        assert.ok(match.grantUpgrade('a', 'tail', 'common', 1));
        for (let rank = 1; rank <= index + 1; rank++)
          assert.ok(match.grantUpgrade('a', 'stinger', rarity, rank));
        const result = match.damageBatch([
          {
            targetId: 'b',
            ownerId: 'a',
            amount: 1,
            channel: 'contact',
            origin: 'manual',
            abilityId: 'stinger',
            depth: 0,
          },
        ])[0];
        assert.equal(result.hull, 1);
        match.takeDamageLedger();
        for (let i = 0; i < 10; i++) assert.ok(match.advance(100));
        const ticks = match
          .takeDamageLedger()
          .filter(
            ({ event }) =>
              event.channel === 'corrosion' && event.targetId === 'b',
          );
        assert.equal(ticks.length, 1, `${rarity} rank ${index + 1}`);
        assert.ok(
          Math.abs(ticks[0].result.hull - coefficient * 11) < 0.001,
          `${rarity} rank ${index + 1}`,
        );
      } finally {
        match.dispose();
      }
    }
});

test('Leech heals the stated percentage at every rank and rarity', () => {
  for (const [rarity, percent] of [
    ['rare', 10],
    ['epic', 12],
    ['legendary', 15],
  ])
    for (let rank = 1; rank <= 5; rank++) {
      const { match } = setup();
      try {
        for (let r = 1; r <= rank; r++)
          assert.ok(match.grantUpgrade('a', 'leech', rarity, r));
        match.damageBatch([
          {
            targetId: 'a',
            ownerId: 'b',
            amount: 20,
            channel: 'direct',
            depth: 0,
          },
        ]);
        const hull = () =>
          match.view('a').players.find((player) => player.id === 'a').health
            .hull;
        const before = hull();
        const hit = match.damageBatch([
          {
            targetId: 'b',
            ownerId: 'a',
            amount: 20,
            channel: 'contact',
            origin: 'manual',
            abilityId: 'leech',
            depth: 0,
          },
        ])[0];
        assert.equal(hit.hull, 20);
        assert.ok(
          Math.abs(hull() - before - percent / 5) < 0.001,
          `${rarity} rank ${rank}`,
        );
      } finally {
        match.dispose();
      }
    }
});

test('Stoner quick throws use near-minimum hybrid damage at every rank and rarity', () => {
  for (const [rarity, values] of Object.entries({
    common: [1.1, 1.3, 1.5, 1.7, 1.9],
    rare: [1.2, 1.4, 1.6, 1.8, 2],
    epic: [1.3, 1.5, 1.7, 1.9, 2.1],
    legendary: [1.4, 1.6, 1.8, 2, 2.2],
  }))
    for (const [index, coefficient] of values.entries()) {
      const random = Math.random;
      Math.random = () => 0;
      const { match, a, b } = setup();
      try {
        assert.ok(match.grantUpgrade('a', 'arms', 'branching', 1));
        assert.ok(match.grantUpgrade('a', 'stoner', rarity, 1));
        const button = equip(match, 'stoner');
        for (let rank = 2; rank <= index + 1; rank++)
          assert.ok(match.grantUpgrade('a', 'stoner', rarity, rank));
        if (index >= 1) {
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
              choiceId: 'stoner-training',
            }),
          );
        }
        position(a, b, 1.8);
        assert.ok(match.advance(20));
        match.takeDamageLedger();
        const control = (buttons) =>
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
        control(button);
        assert.ok(match.advance(50));
        control(0);
        for (let i = 0; i < 20; i++) assert.ok(match.advance(50));
        const hits = match
          .takeDamageLedger()
          .filter(
            ({ event }) =>
              event.abilityId === 'stoner' && event.targetId === 'b',
          );
        assert.equal(hits.length, 1, `${rarity} rank ${index + 1}`);
        const stats = match.view('a').players.find((p) => p.id === 'a').stats;
        const minimum =
          (coefficient *
            Math.min(stats.physical, stats.ability) *
            stats.damage) /
          100;
        assert.ok(
          hits[0].result.hull >= minimum - 0.001 &&
            hits[0].result.hull <= minimum * 1.01,
          `${rarity} rank ${index + 1}: ${hits[0].result.hull}`,
        );
      } finally {
        match.dispose();
        Math.random = random;
      }
    }
});
