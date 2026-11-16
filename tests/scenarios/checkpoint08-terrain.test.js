import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';
import {
  createArena,
  terrainAt,
  arenaPointClear,
} from '../../build-host/shared/arena.js';

function setup() {
  const { match, world } = createAbilityMatch('terrain');
  const pos = match.view('a').players.find((p) => p.id === 'a').position;
  const body = world.bodies
    .getAll()
    .find(
      (b) =>
        b.isDynamic() &&
        Math.hypot(b.translation().x - pos.x, b.translation().z - pos.z) < 0.01,
    );
  assert.ok(body);
  return { match, body };
}
function choose(match, choiceId) {
  assert.ok(match.advance(20));
  const offer = match.view('a').offer;
  assert.ok(offer);
  assert.ok(
    match.consume({
      kind: 'choice',
      matchId: 'terrain',
      playerId: 'a',
      sequence: 1,
      offerId: offer.id,
      revision: offer.revision,
      choiceId,
    }),
  );
}
function control(match, buttons, x = 1, y = 0, aim = Math.PI / 2) {
  assert.ok(
    match.consume({
      kind: 'control',
      matchId: 'terrain',
      playerId: 'a',
      sequence: 1,
      x,
      y,
      aim,
      buttons,
    }),
  );
}
function openPosition(terrain) {
  const arena = createArena(42);
  for (let x = -20; x <= 15; x++)
    for (let z = -20; z <= 20; z++) {
      if (terrainAt(arena, x, z) !== terrain) continue;
      if (
        Array.from({ length: 9 }, (_, i) => ({ x: x + i, z })).every((p) =>
          arenaPointClear(arena.obstacles, p, 1),
        )
      )
        return { x, z };
    }
  throw new Error(`No clear ${terrain} route`);
}

test('terrain adaptations improve relevant movement factors', () => {
  for (const [upgrade, rarity, terrains] of [
    ['wings', 'branching', ['sand', 'snow', 'water']],
    ['slithery', 'branching', ['sand', 'snow', 'water']],
    ['fin', 'rare', ['water']],
  ]) {
    const { match } = setup();
    try {
      const before = terrains.map((terrain) =>
        match.terrainMovementFactor('a', terrain),
      );
      assert.ok(match.grantUpgrade('a', upgrade, rarity, 1));
      terrains.forEach((terrain, i) =>
        assert.ok(
          match.terrainMovementFactor('a', terrain) > before[i],
          `${upgrade} on ${terrain}`,
        ),
      );
      if (upgrade === 'fin')
        assert.equal(match.terrainMovementFactor('a', 'snow'), 0.7);
    } finally {
      match.dispose();
    }
  }
});

test('Slide travels farther when started on snow', () => {
  const distances = [];
  for (const terrain of ['grass', 'snow']) {
    const { match, body } = setup();
    try {
      assert.ok(match.grantUpgrade('a', 'slithery', 'branching', 1));
      assert.ok(match.grantUpgrade('a', 'slide', 'common', 1));
      choose(match, 'movement');
      const start = openPosition(terrain);
      body.setTranslation({ ...start, y: 0.25 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      control(match, 4);
      assert.ok(match.advance(100));
      control(match, 0, 0);
      assert.ok(match.advance(100));
      distances.push(body.translation().x - start.x);
    } finally {
      match.dispose();
    }
  }
  assert.ok(
    Math.abs(distances[1] / distances[0] - 1.15) < 0.03,
    `${distances}`,
  );
});

test('Arthropod Scuttle moves sideways and halves cooldown', () => {
  const { match, body } = setup();
  try {
    for (let rank = 1; rank <= 3; rank++)
      assert.ok(match.grantUpgrade('a', 'legs', 'branching', rank));
    choose(match, 'legs-arthropod');
    assert.ok(match.advance(2000));
    assert.ok(match.grantUpgrade('a', 'scuttle', 'common', 1));
    choose(match, 'movement');
    const start = openPosition('grass');
    body.setTranslation({ ...start, y: 0.25 }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    const now = match.view('a').time;
    control(match, 4, 1, 0, 0);
    assert.ok(match.advance(100));
    const end = body.translation();
    assert.ok(end.x > start.x + 1);
    assert.ok(Math.abs(end.z - start.z) < 0.1);
    const readyAt = match
      .view('a')
      .equipment.learned.find((item) => item.id === 'scuttle').readyAt;
    assert.ok(Math.abs(readyAt - now - 2000) < 30, `${readyAt - now}`);
  } finally {
    match.dispose();
  }
});
