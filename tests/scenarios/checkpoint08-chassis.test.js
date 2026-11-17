import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';
import { createArena } from '../../build-host/shared/arena.js';

function setup() {
  const { match, world } = createAbilityMatch('chassis');
  for (const bot of match.view('a').bots) match.setBotHostility(bot.id, false);
  const player = () => match.view('a').players.find((p) => p.id === 'a');
  const start = player().position;
  const body = world.bodies
    .getAll()
    .find(
      (b) =>
        b.isDynamic() &&
        Math.hypot(b.translation().x - start.x, b.translation().z - start.z) <
          0.01,
    );
  assert.ok(body);
  const step = (ms) => {
    for (let t = 0; t < ms; t += 50)
      assert.ok(match.advance(Math.min(50, ms - t)));
  };
  const move = (x, z) =>
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'chassis',
        playerId: 'a',
        sequence: 1,
        x,
        y: z,
        aim: 0,
        buttons: 0,
      }),
    );
  return { match, player, body, step, move };
}

test('Wings improve movement over terrain while craft remain blocked by the same planar obstacle', () => {
  for (const wings of [false, true]) {
    const { match, player, body, step, move } = setup();
    try {
      const before = match.terrainMovementFactor('a', 'water', 2);
      if (wings) {
        assert.ok(match.grantUpgrade('a', 'wings', 'branching', 1));
        assert.equal(player().stats.speed, 6);
        assert.ok(match.terrainMovementFactor('a', 'water', 2) > before);
      }
      const box = createArena(42).obstacles[4];
      const edge = box.x - box.width / 2;
      body.setTranslation({ x: edge - 1, y: 0.25, z: box.z }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      for (let i = 0; i < 20; i++) {
        move(1, 0);
        step(50);
      }
      assert.ok(
        body.translation().x <= edge - 0.49,
        `wings=${wings}: crossed wall`,
      );
      assert.equal(body.translation().y, 0.25);
    } finally {
      match.dispose();
    }
  }
});

test('Fin improves shallow and deep water movement without changing thermal adaptation', () => {
  const { match, player } = setup();
  try {
    const before = {
      shallow: match.terrainMovementFactor('a', 'water', 1),
      deep: match.terrainMovementFactor('a', 'water', 2),
      heat: player().stats.heatAdaptation,
      cold: player().stats.coldAdaptation,
      sand: match.terrainMovementFactor('a', 'sand'),
    };
    assert.ok(match.grantUpgrade('a', 'fin', 'rare', 1));
    assert.ok(Math.abs(player().stats.waterAdaptation - 60) < 0.00001);
    assert.ok(match.terrainMovementFactor('a', 'water', 1) > before.shallow);
    assert.ok(match.terrainMovementFactor('a', 'water', 2) > before.deep);
    assert.equal(player().stats.heatAdaptation, before.heat);
    assert.equal(player().stats.coldAdaptation, before.cold);
    assert.equal(match.terrainMovementFactor('a', 'sand'), before.sand);
    assert.equal(match.grantUpgrade('a', 'fin', 'rare', 2), false);
  } finally {
    match.dispose();
  }
});

test('Hollow Bones increases movement speed and increases actual damage received', () => {
  const baseline = setup(),
    upgraded = setup();
  try {
    assert.ok(upgraded.match.grantUpgrade('a', 'hollow-bones', 'epic', 1));
    assert.equal(
      upgraded.player().stats.speed,
      baseline.player().stats.speed + 0.25,
    );
    assert.equal(
      upgraded.player().stats.damageResistance,
      baseline.player().stats.damageResistance - 5,
    );
    for (const fixture of [baseline, upgraded]) {
      fixture.body.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
      fixture.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      for (let i = 0; i < 20; i++) {
        fixture.move(1, 0);
        fixture.step(50);
      }
    }
    assert.ok(upgraded.body.translation().x > baseline.body.translation().x);
    const event = {
      targetId: 'a',
      ownerId: 'b',
      amount: 20,
      channel: 'direct',
      depth: 0,
    };
    assert.equal(baseline.match.damageBatch([event])[0].hull, 20);
    assert.equal(upgraded.match.damageBatch([event])[0].hull, 21);
  } finally {
    baseline.match.dispose();
    upgraded.match.dispose();
  }
});

test('More Legs requires Arthropod and adds one risk point and one module across ranks', () => {
  const { match, player, step } = setup();
  try {
    assert.equal(match.grantUpgrade('a', 'more-legs', 'rare', 1), false);
    for (let rank = 1; rank <= 3; rank++)
      assert.ok(match.grantUpgrade('a', 'legs', 'branching', rank));
    assert.equal(match.grantUpgrade('a', 'more-legs', 'rare', 1), false);
    step(50);
    const offer = match.view('a').offer;
    assert.equal(offer.kind, 'specialization');
    assert.ok(
      match.consume({
        kind: 'choice',
        matchId: 'chassis',
        playerId: 'a',
        sequence: 1,
        offerId: offer.id,
        revision: offer.revision,
        choiceId: 'legs-arthropod',
      }),
    );
    assert.equal(match.view('a').progression.carcinisation, 1);
    assert.ok(match.grantUpgrade('a', 'more-legs', 'rare', 1));
    assert.equal(match.view('a').progression.carcinisation, 2);
    assert.equal(
      player().modules.filter((m) => m.kind === 'more-legs').length,
      1,
    );
    assert.equal(match.grantUpgrade('a', 'more-legs', 'rare', 1), false);
    assert.ok(match.grantUpgrade('a', 'more-legs', 'rare', 2));
    assert.equal(match.view('a').progression.carcinisation, 2);
    assert.deepEqual(
      player().modules.filter((m) => m.kind === 'more-legs'),
      [{ kind: 'more-legs', rank: 2 }],
    );
  } finally {
    match.dispose();
  }
});
