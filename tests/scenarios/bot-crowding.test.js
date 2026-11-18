import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arenaPointClear, createArena } from '../../build-host/shared/arena.js';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

const ids = ['a', 'b', 'c', 'd'];
function bots(match) {
  return [
    ...new Map(
      ids.flatMap((id) => match.view(id).bots.map((bot) => [bot.id, bot])),
    ).values(),
  ];
}
function move(world, point, x, z) {
  const body = world.bodies
    .getAll()
    .find(
      (item) =>
        item.isDynamic() &&
        Math.hypot(
          item.translation().x - point.x,
          item.translation().z - point.z,
        ) < 0.01,
    );
  assert.ok(body);
  body.setTranslation({ x, y: 0.25, z }, true);
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  return body;
}

test('wild bots move away during selection and resume immediately after a choice', () => {
  const { match, world } = createAbilityMatch('bot-choice-clearance');
  try {
    const all = bots(match);
    const hunter = all.find((bot) => bot.role === 'hunter');
    assert.ok(hunter);
    for (const player of match.view('a').players)
      move(world, player.position, player.id === 'a' ? 20 : -80, 20);
    for (const bot of all)
      if (bot.id !== hunter.id) move(world, bot.position, -60, -60);
    const body = move(world, hunter.position, 24, 20);
    assert.ok(
      match.setOffer('a', {
        id: 'upgrade',
        revision: 0,
        choices: ['muscular-tissue'],
      }),
    );
    const elapsed = match.view('a').boundary.elapsedMs;
    assert.ok(match.advance(100));
    assert.ok(body.linvel().x > 0, 'bot moves away from selecting player');
    assert.ok(match.view('a').boundary.elapsedMs > elapsed, 'world continues');
    assert.ok(
      match.consume({
        kind: 'choice',
        matchId: 'bot-choice-clearance',
        playerId: 'a',
        sequence: 1,
        offerId: 'upgrade',
        revision: 0,
        choiceId: 'muscular-tissue',
      }),
    );
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    assert.ok(match.advance(100));
    assert.ok(body.linvel().x < 0, 'hunter immediately resumes pursuit');
    assert.ok(
      match.damageBatch([
        {
          targetId: 'a',
          ownerId: hunter.id,
          channel: 'contact',
          amount: 1,
          depth: 0,
        },
      ])[0].hull > 0,
      'no extra protection after choosing',
    );
  } finally {
    match.dispose();
  }
});

test('nearby hunters steer apart while pursuing the same player', () => {
  const { match, world } = createAbilityMatch('bot-separation');
  try {
    const all = bots(match);
    const hunters = all.filter((bot) => bot.role === 'hunter').slice(0, 2);
    assert.equal(hunters.length, 2);
    for (const player of match.view('a').players)
      move(world, player.position, player.id === 'a' ? 20 : -80, 20);
    for (const bot of all)
      if (!hunters.includes(bot)) move(world, bot.position, -60, -60);
    const lower = move(world, hunters[0].position, 26, 19.3);
    const upper = move(world, hunters[1].position, 26, 20.7);
    assert.ok(match.advance(100));
    assert.ok(
      upper.linvel().z > lower.linvel().z,
      'hunters spread rather than converge',
    );
  } finally {
    match.dispose();
  }
});

function prepareRefill(match, world, centers) {
  match.damageBatch(
    bots(match).map((bot) => ({
      targetId: bot.id,
      ownerId: null,
      channel: 'environmental',
      amount: 100_000,
      bypassPlating: true,
      depth: 0,
    })),
  );
  for (const [index, id] of ids.entries()) {
    const player = match.view(id).players.find((item) => item.id === id);
    const center = centers[index] ?? centers[0];
    move(world, player.position, center.x, center.z).setEnabled(false);
  }
  match.syncWallClock(1000);
}

function freezeBots(match, world) {
  for (const bot of bots(match))
    move(world, bot.position, bot.position.x, bot.position.z).setEnabled(false);
}

function refill(match, world) {
  const before = new Set(bots(match).map((bot) => bot.id));
  assert.ok(match.advance(1));
  const added = bots(match).filter((bot) => !before.has(bot.id));
  assert.ok(added.length <= 1, 'one global refill per two seconds');
  freezeBots(match, world);
  assert.ok(match.advance(1999));
  return added;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

test('replenishment succeeds nearby, staggers by two seconds, and rotates around the player', () => {
  const { match, world } = createAbilityMatch('bot-replenishment');
  const center = { x: 20, z: 20 };
  try {
    prepareRefill(match, world, [center]);
    assert.ok(match.advance(1));
    const [first] = bots(match);
    assert.equal(
      bots(match).length,
      1,
      'first underfilled neighborhood refills',
    );
    freezeBots(match, world);
    assert.ok(match.advance(1999));
    assert.equal(bots(match).length, 1, 'no second spawn before two seconds');
    assert.ok(match.advance(1));
    const second = bots(match).find((bot) => bot.id !== first.id);
    assert.ok(second, 'another enemy appears at two seconds');
    const arena = createArena(42);
    for (const bot of [first, second]) {
      assert.ok(Math.abs(distance(bot.position, center) - 13) < 0.01);
      assert.ok(arenaPointClear(arena.obstacles, bot.position));
    }
    assert.ok(
      distance(first.position, second.position) > 15,
      'successive spawns use different sides',
    );
    assert.ok(distance(first.position, second.position) >= 3);
  } finally {
    match.dispose();
  }
});

test('local density follows the source schedule, caps at twelve, and ignores the outer neighborhood', () => {
  const { match, world } = createAbilityMatch('bot-local-density');
  const center = { x: 20, z: 20 };
  try {
    prepareRefill(match, world, [center]);
    for (const [elapsed, target] of [
      [0, 5],
      [9000, 7],
      [44000, 9],
      [569000, 12],
    ]) {
      match.syncWallClock(1000 + elapsed);
      for (let tick = 0; tick < target + 2; tick++) refill(match, world);
      assert.equal(bots(match).length, target, `local target at ${elapsed}ms`);
      for (const bot of bots(match))
        assert.ok(
          distance(bot.position, center) < 22,
          'density is visible nearby',
        );
    }
    const all = bots(match);
    for (const [index, bot] of all.entries()) {
      const angle = (index * Math.PI * 2) / all.length;
      move(
        world,
        bot.position,
        center.x + Math.cos(angle) * 26,
        center.z + Math.sin(angle) * 26,
      );
    }
    const [added] = refill(match, world);
    assert.ok(
      added,
      'bots outside twenty-two units do not block nearby refill',
    );
    assert.ok(distance(added.position, center) >= 12);
    assert.ok(distance(added.position, center) < 22);
  } finally {
    match.dispose();
  }
});

test('an obstructed neighborhood does not starve another player', () => {
  const { match, world } = createAbilityMatch('bot-obstructed-center');
  const center = { x: 20, z: 20 };
  try {
    prepareRefill(match, world, [{ x: 118, z: 118 }, center, center, center]);
    const [added] = refill(match, world);
    assert.ok(
      added,
      'tries a later player when the first has no legal candidate',
    );
    assert.ok(distance(added.position, center) < 22);
  } finally {
    match.dispose();
  }
});

test('replenishment avoids protected players and stops when all players are choosing', () => {
  const { match, world } = createAbilityMatch('bot-protected-refill');
  const protectedCenter = { x: 0, z: 0 };
  const activeCenter = { x: 25, z: 0 };
  const protect = (id) =>
    assert.ok(
      match.setOffer(id, {
        id: `upgrade-${id}`,
        revision: 0,
        choices: ['muscular-tissue'],
      }),
    );
  try {
    prepareRefill(match, world, [
      protectedCenter,
      activeCenter,
      activeCenter,
      activeCenter,
    ]);
    protect('a');
    const [added] = refill(match, world);
    assert.ok(added, 'an unprotected neighborhood can still refill');
    assert.ok(distance(added.position, protectedCenter) >= 12);
    assert.ok(distance(added.position, activeCenter) >= 12);
    for (const id of ids.slice(1)) protect(id);
    const seen = bots(match).map((bot) => bot.id);
    for (let tick = 0; tick < 4; tick++) {
      refill(match, world);
      assert.deepEqual(
        bots(match).map((bot) => bot.id),
        seen,
      );
    }
  } finally {
    match.dispose();
  }
});

test('refill keeps the first ring and player clearance as the finale shrinks', () => {
  const { match, world } = createAbilityMatch('bot-finale-refill', {
    finale: {
      initialRadius: 20,
      shrinkStartMs: 1,
      tinyAtMs: 10000,
      collapseAtMs: 20000,
    },
  });
  const center = { x: 0, z: 0 };
  try {
    prepareRefill(match, world, [center]);
    const [added] = refill(match, world);
    assert.ok(added);
    assert.ok(Math.abs(distance(added.position, center) - 13) < 0.01);
    match.syncWallClock(7000);
    assert.ok(match.view('a').boundary.radius < 12);
    assert.equal(
      refill(match, world).length,
      0,
      'shrinking space cannot squeeze spawns toward the player',
    );
  } finally {
    match.dispose();
  }
});

test('the shrinking boundary retires excess wild bots and retains companions', () => {
  const { match, world } = createAbilityMatch('bot-finale-population');
  const wildBots = () => bots(match).filter((bot) => bot.kind === 'wild');
  try {
    prepareRefill(match, world, [{ x: 0, z: 0 }]);
    match.syncWallClock(721000);
    for (let i = 0; i < 12; i++) refill(match, world);
    assert.equal(wildBots().length, 12);
    assert.ok(match.recruitCompanion('a', 'finale-ally', 0));
    const ally = bots(match).find((bot) => bot.ownerId === 'a');
    assert.ok(ally);
    move(world, ally.position, 12, 0);

    match.syncWallClock(1501000);
    assert.ok(match.advance(10));
    assert.equal(wildBots().length, 4);
    const radius = match.view('a').boundary.radius;
    for (const bot of bots(match))
      assert.ok(Math.hypot(bot.position.x, bot.position.z) < radius);
    assert.ok(bots(match).some((bot) => bot.id === ally.id));
  } finally {
    match.dispose();
  }
});

test('separate neighborhoods share the thirty-two wild enemy limit', () => {
  const { match, world } = createAbilityMatch('bot-global-density');
  const centers = [
    { x: -50, z: -50 },
    { x: 50, z: -50 },
    { x: -50, z: 50 },
    { x: 50, z: 50 },
  ];
  try {
    prepareRefill(match, world, centers);
    match.syncWallClock(570000);
    for (let tick = 0; tick < 35; tick++) refill(match, world);
    assert.equal(bots(match).length, 32);
    for (const center of centers)
      assert.ok(
        bots(match).filter((bot) => distance(bot.position, center) < 22)
          .length <= 12,
      );
    const all = bots(match);
    for (const [index, bot] of all.entries()) {
      assert.ok(
        centers.every((center) => distance(bot.position, center) >= 12),
      );
      for (const other of all.slice(index + 1))
        assert.ok(
          distance(bot.position, other.position) >= 2.99,
          'refill keeps three-unit bot gaps',
        );
    }
  } finally {
    match.dispose();
  }
});
