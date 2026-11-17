import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createArena } from '../../build-host/shared/arena.js';
import {
  createAbilityMatch,
  enableQaSurvival,
} from './checkpoint08-ability-fixture.js';

test('a Hibernation build creates and uses a shelter in the final area', () => {
  const { match, world } = createAbilityMatch('checkpoint10-final-shelter');
  try {
    const restore = enableQaSurvival(match, 'a');
    assert.ok(match.grantUpgrade('a', 'fur', 'common', 1));
    assert.ok(match.grantUpgrade('a', 'hibernation', 'common', 1));
    assert.ok(match.grantUpgrade('a', 'burrower', 'rare', 1));
    const player = match.view('a').players.find((item) => item.id === 'a');
    const body = world.bodies
      .getAll()
      .find(
        (item) =>
          item.isDynamic() &&
          Math.hypot(
            item.translation().x - player.position.x,
            item.translation().z - player.position.z,
          ) < 0.01,
      );
    assert.ok(body);
    body.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    match.syncWallClock(1000);
    match.syncWallClock(1501000);
    assert.ok(match.advance(50));
    restore();
    assert.ok(match.view('a').boundary.radius <= 3.01);
    const existing = new Set(match.view('a').shelters.map((item) => item.id));
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'checkpoint10-final-shelter',
        playerId: 'a',
        sequence: 1,
        x: 0,
        y: 0,
        aim: 0,
        buttons: 8,
      }),
    );
    assert.ok(match.advance(100));
    const shelter = match
      .view('a')
      .shelters.find((item) => !existing.has(item.id));
    assert.ok(
      shelter && Math.hypot(shelter.position.x, shelter.position.z) < 3,
    );
    assert.ok(
      match.consume({
        kind: 'shelter',
        matchId: 'checkpoint10-final-shelter',
        playerId: 'a',
        sequence: 2,
        targetId: shelter.id,
      }),
    );
    const before = match.view('a').progression;
    for (let i = 0; i < 10; i++) {
      assert.ok(match.advance(100));
      restore();
    }
    const after = match.view('a').progression;
    assert.ok(after.progress > before.progress || after.level > before.level);
  } finally {
    match.dispose();
  }
});

test('Fur unlocks Hibernation and combines shelter progress with Ambush on exit', () => {
  const { match, world } = createAbilityMatch('checkpoint10-shelter-build');
  try {
    assert.equal(match.grantUpgrade('a', 'hibernation', 'common', 1), false);
    assert.ok(match.grantUpgrade('a', 'ambush', 'epic', 1));
    assert.ok(match.grantUpgrade('a', 'fur', 'common', 1));
    assert.ok(match.grantUpgrade('a', 'hibernation', 'common', 1));
    const self = () => match.view('a').players.find((p) => p.id === 'a');
    const body = world.bodies
      .getAll()
      .find(
        (b) =>
          b.isDynamic() &&
          Math.hypot(
            b.translation().x - self().position.x,
            b.translation().z - self().position.z,
          ) < 0.01,
      );
    assert.ok(body);
    const shelter = createArena(42).shelters[0];
    body.setTranslation({ ...shelter, y: 0.25 }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    const before = match.view('a').progression;
    const damage = self().stats.damage;
    assert.ok(
      match.consume({
        kind: 'shelter',
        matchId: 'checkpoint10-shelter-build',
        playerId: 'a',
        sequence: 1,
        targetId: 'shelter-0',
      }),
    );
    for (let i = 0; i < 20; i++) assert.ok(match.advance(100));
    const during = match.view('a').progression;
    assert.ok(
      Math.abs(during.progress - before.progress - before.required * 0.05) <
        1e-8,
    );
    assert.ok(
      match.consume({
        kind: 'shelter',
        matchId: 'checkpoint10-shelter-build',
        playerId: 'a',
        sequence: 2,
        targetId: 'shelter-0',
      }),
    );
    assert.ok(Math.abs(self().stats.damage - damage * 1.3) < 1e-8);
    for (let i = 0; i < 31; i++) assert.ok(match.advance(100));
    assert.equal(self().stats.damage, damage);
    assert.equal(match.view('a').progression.progress, during.progress);
  } finally {
    match.dispose();
  }
});

test('Ambush and Overwhelm do not require a Burrower or Plated rank', () => {
  const { match } = createAbilityMatch('checkpoint10-reverse-links');
  try {
    assert.ok(match.grantUpgrade('a', 'ambush', 'epic', 1));
    assert.ok(match.grantUpgrade('a', 'overwhelm', 'epic', 1));
    const owned = match.view('a').progression.upgrades.map((item) => item.id);
    assert.equal(owned.includes('burrower'), false);
    assert.equal(owned.includes('plated'), false);
  } finally {
    match.dispose();
  }
});

test('Ambush increases an equipped Jaws hit only during the shelter exit window', () => {
  const run = (delay) => {
    const originalRandom = Math.random;
    Math.random = () => 0.5;
    const { match, world } = createAbilityMatch('checkpoint10-ambush-hit');
    try {
      assert.ok(match.grantUpgrade('a', 'ambush', 'epic', 1));
      assert.ok(match.grantUpgrade('a', 'jaws', 'common', 1));
      const body = (id) => {
        const position = match
          .view(id)
          .players.find((p) => p.id === id).position;
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
      a.setTranslation({ ...createArena(42).shelters[0], y: 0.25 }, true);
      a.setLinvel({ x: 0, y: 0, z: 0 }, true);
      for (const sequence of [1, 2])
        assert.ok(
          match.consume({
            kind: 'shelter',
            matchId: 'checkpoint10-ambush-hit',
            playerId: 'a',
            sequence,
            targetId: 'shelter-0',
          }),
        );
      for (let elapsed = 0; elapsed < delay; elapsed += 100)
        assert.ok(match.advance(100));
      a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
      b.setTranslation({ x: 1.8, y: 0.25, z: 0 }, true);
      a.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      assert.ok(match.advance(20));
      match.takeDamageLedger();
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint10-ambush-hit',
          playerId: 'a',
          sequence: 3,
          x: 0,
          y: 0,
          aim: Math.PI / 2,
          buttons: 1,
        }),
      );
      for (let i = 0; i < 10; i++) assert.ok(match.advance(50));
      const hits = match
        .takeDamageLedger()
        .filter(
          ({ event }) => event.abilityId === 'jaws' && event.targetId === 'b',
        );
      assert.equal(hits.length, 1);
      return hits[0].result.hull;
    } finally {
      match.dispose();
      Math.random = originalRandom;
    }
  };
  const boosted = run(0);
  const expired = run(3100);
  assert.ok(
    Math.abs(boosted - expired * 1.3) < 1e-8,
    `${boosted} vs ${expired}`,
  );
});
