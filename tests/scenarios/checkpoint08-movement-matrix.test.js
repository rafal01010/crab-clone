import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';
function setup(id, rarity, rank) {
  const { match, world } = createAbilityMatch('movement-matrix');
  assert.ok(match.grantUpgrade('a', 'legs', 'branching', 1));
  for (let current = 1; current <= rank; current++)
    assert.ok(match.grantUpgrade('a', id, rarity, current));
  assert.ok(match.advance(20));
  let offer = match.view('a').offer;
  assert.equal(offer.kind, 'equipment');
  assert.ok(
    match.consume({
      kind: 'choice',
      matchId: 'movement-matrix',
      playerId: 'a',
      sequence: 1,
      offerId: offer.id,
      revision: offer.revision,
      choiceId: 'movement',
    }),
  );
  if (id === 'leap' && rank === 3) {
    for (let i = 0; i < 21; i++) assert.ok(match.advance(100));
    offer = match.view('a').offer;
    assert.equal(offer.kind, 'specialization');
    assert.ok(
      match.consume({
        kind: 'choice',
        matchId: 'movement-matrix',
        playerId: 'a',
        sequence: 1,
        offerId: offer.id,
        revision: offer.revision,
        choiceId: 'skip',
      }),
    );
  }
  const position = match.view('a').players.find((p) => p.id === 'a').position;
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
  body.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  const control = (buttons) =>
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'movement-matrix',
        playerId: 'a',
        sequence: 1,
        x: 0,
        y: 0,
        aim: Math.PI / 2,
        buttons,
      }),
    );
  const readyAt = () =>
    match.view('a').equipment.learned.find((item) => item.id === id).readyAt;
  return { match, body, control, readyAt };
}

test('Leap cooldown is authoritative at every rarity and rank', () => {
  const cooldowns = {
    common: [5500, 5000, 4500],
    rare: [5000, 4500, 4000],
    epic: [4500, 4000, 3500],
    legendary: [4000, 3500, 3000],
  };
  for (const [rarity, values] of Object.entries(cooldowns))
    for (const [index, expected] of values.entries()) {
      const { match, body, control, readyAt } = setup(
        'leap',
        rarity,
        index + 1,
      );
      try {
        control(4);
        assert.ok(match.advance(100));
        const beforeRelease = match.view('a').time;
        control(0);
        assert.ok(match.advance(50));
        assert.equal(
          readyAt(),
          beforeRelease + expected,
          `${rarity} rank ${index + 1}`,
        );
        const landing = body.translation().x;
        assert.ok(landing > 6 && landing < 7);
        const originalReady = readyAt();
        control(4);
        assert.ok(match.advance(50));
        control(0);
        assert.ok(match.advance(50));
        assert.equal(readyAt(), originalReady);
        assert.ok(Math.abs(body.translation().x - landing) < 0.02);
      } finally {
        match.dispose();
      }
    }
});

test('Scuttle cooldown and distance are authoritative at every rarity', () => {
  for (const [rarity, expected] of Object.entries({
    common: 4000,
    rare: 3500,
    epic: 3000,
    legendary: 2500,
  })) {
    const { match, body, control, readyAt } = setup('scuttle', rarity, 1);
    try {
      const start = match.view('a').time;
      control(4);
      assert.ok(match.advance(50));
      control(0);
      for (let i = 0; i < 4; i++) assert.ok(match.advance(50));
      assert.equal(readyAt(), start + expected, rarity);
      assert.ok(Math.abs(body.translation().x - 3.5) < 0.02, rarity);
      const originalReady = readyAt();
      control(4);
      assert.ok(match.advance(50));
      assert.equal(readyAt(), originalReady);
    } finally {
      match.dispose();
    }
  }
});

test('holding Leap increases its clear-path distance and caps the charge', () => {
  const run = (holdMs) => {
    const { match, body, control } = setup('leap', 'common', 1);
    try {
      for (let elapsed = 0; elapsed < holdMs; elapsed += 50) {
        control(4);
        assert.ok(match.advance(50));
      }
      control(0);
      assert.ok(match.advance(50));
      return body.translation().x;
    } finally {
      match.dispose();
    }
  };
  const short = run(50),
    full = run(1000),
    overcharged = run(1500);
  assert.ok(short > 6.5 && short < 6.8, `short ${short}`);
  assert.ok(Math.abs(full - 9.75) < 0.02, `full ${full}`);
  assert.ok(Math.abs(overcharged - full) < 0.02, `overcharged ${overcharged}`);
});
