import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';
import {
  createArena,
  terrainAt,
  arenaPointClear,
} from '../../build-host/shared/arena.js';

test('weapon salvage bonuses persist after unequipping', () => {
  for (const [id, stat] of [
    ['beak', 'salvageSpeed'],
    ['jaws', 'salvageSpeed'],
    ['trunk', 'salvageReach'],
  ]) {
    const { match } = createAbilityMatch('retention');
    try {
      const stats = () =>
        match.view('a').players.find((player) => player.id === 'a').stats;
      const baseline = stats()[stat];
      assert.ok(
        match.grantUpgrade('a', id, id === 'trunk' ? 'rare' : 'common', 1),
      );
      const learned = stats()[stat];
      assert.ok(learned > baseline);
      assert.ok(match.grantProgress('a', 20));
      assert.ok(match.advance(20));
      const offer = match.view('a').offer;
      assert.ok(offer);
      const slots = match.view('a').equipment.slots;
      const slot = slots.primary === id ? 'primary' : 'secondary';
      assert.equal(slots[slot], id);
      assert.ok(
        match.consume({
          kind: 'equipment',
          matchId: 'retention',
          playerId: 'a',
          sequence: 1,
          offerId: offer.id,
          revision: offer.revision,
          slot,
          contentId: '-',
        }),
      );
      assert.equal(match.view('a').equipment.slots[slot], null);
      assert.equal(stats()[stat], learned);
    } finally {
      match.dispose();
    }
  }
});

test('Fin preserves normal heat and cold exposure during weather', () => {
  for (const [terrain, kind] of [
    ['sand', 'heat'],
    ['snow', 'cold'],
  ]) {
    const { match, world } = createAbilityMatch('thermal-fin');
    try {
      const arena = createArena(42);
      const points = [];
      for (let x = -24; x <= 24 && points.length < 2; x += 2)
        for (let z = -24; z <= 24 && points.length < 2; z += 2) {
          if (
            terrainAt(arena, x, z) === terrain &&
            arenaPointClear(arena.obstacles, { x, z }, 2) &&
            (!points.length ||
              Math.hypot(x - points[0].x, z - points[0].z) >= 4)
          )
            points.push({ x, z });
        }
      assert.equal(points.length, 2);
      for (const [index, id] of ['a', 'b'].entries()) {
        const pos = match
          .view(id)
          .players.find((player) => player.id === id).position;
        const body = world.bodies
          .getAll()
          .find(
            (entry) =>
              entry.isDynamic() &&
              Math.hypot(
                entry.translation().x - pos.x,
                entry.translation().z - pos.z,
              ) < 0.01,
          );
        assert.ok(body);
        body.setTranslation({ ...points[index], y: 0.25 }, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
      assert.ok(match.grantUpgrade('a', 'fin', 'rare', 1));
      for (let time = 0; time < 60000; time += 100)
        assert.ok(match.advance(100));
      const a = match.view('a').thermal[kind],
        b = match.view('b').thermal[kind];
      assert.ok(a > 0 && b > 0, `${terrain}: ${a}, ${b}`);
      assert.ok(Math.abs(a - b) < 0.001, `${terrain}: ${a}, ${b}`);
    } finally {
      match.dispose();
    }
  }
});
