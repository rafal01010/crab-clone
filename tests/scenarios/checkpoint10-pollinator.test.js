import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';
import { createArena, terrainAt } from '../../build-host/shared/arena.js';
import { createPointsOfInterest } from '../../build-host/server/match/points-of-interest.js';

test('Nomadic awards progress on first discovery but not on a revisit', () => {
  const { match, world } = createAbilityMatch('checkpoint10-nomadic-discovery');
  try {
    for (const bot of match.view('a').bots)
      match.setBotHostility(bot.id, false);
    assert.ok(match.grantUpgrade('a', 'nomadic', 'rare', 1));
    const position = match
      .view('a')
      .players.find((item) => item.id === 'a').position;
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
    const arena = createArena(42);
    const site = createPointsOfInterest(
      arena.poiSockets,
      (point) => terrainAt(arena, point.x, point.z),
      42,
    ).find((item) => item.kind === 'chaos-tree');
    assert.ok(site);
    const before = match.view('a').progression.progress;
    match.takeDiscoveries();
    body.setTranslation({ ...site.position, y: 0.25 }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    assert.ok(match.advance(20));
    assert.ok(
      match
        .takeDiscoveries()
        .some((item) => item.playerId === 'a' && item.siteId === site.id),
    );
    const after = match.view('a').progression.progress;
    assert.ok(after > before);
    assert.ok(match.advance(20));
    assert.equal(match.view('a').progression.progress, after);
    assert.ok(
      !match
        .takeDiscoveries()
        .some((item) => item.playerId === 'a' && item.siteId === site.id),
    );
  } finally {
    match.dispose();
  }
});

test('Pollinator grants its initial reward and another after four new discoveries', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;
  const { match, world } = createAbilityMatch('checkpoint10-pollinator');
  try {
    for (const bot of match.view('a').bots)
      match.setBotHostility(bot.id, false);
    const view = () => match.view('a');
    const self = () => view().players.find((item) => item.id === 'a');
    const initial = self().stats.physical;
    const position = self().position;
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
    match.takeDiscoveries();
    assert.ok(match.grantUpgrade('a', 'pollinator', 'branching', 1));
    assert.equal(self().stats.physical, initial + 2);
    const arena = createArena(42);
    const sites = createPointsOfInterest(
      arena.poiSockets,
      (point) => terrainAt(arena, point.x, point.z),
      42,
    );
    let discovered = 0;
    for (const site of sites) {
      body.setTranslation({ ...site.position, y: 0.25 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      assert.ok(match.advance(20));
      discovered += match
        .takeDiscoveries()
        .filter((item) => item.playerId === 'a').length;
      assert.equal(
        self().stats.physical,
        initial + 2 + Math.floor(discovered / 4) * 2,
      );
      if (discovered >= 4) break;
    }
    assert.ok(discovered >= 4, `only ${discovered} discoveries`);
  } finally {
    match.dispose();
    Math.random = originalRandom;
  }
});
