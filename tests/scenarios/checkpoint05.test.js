import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import { Match } from '../../build-host/server/match/match.js';
import {
  createArena,
  terrainAt,
  terrainRegionAt,
  arenaPointClear,
} from '../../build-host/shared/arena.js';
import { WorldClock } from '../../build-host/server/match/world-clock.js';

await RAPIER.init();
const ids = ['a', 'b', 'c', 'd'];
const mods = (entries) =>
  Object.entries(entries).map(([stat, add]) => ({
    id: stat,
    stat,
    add,
    multiplier: 1,
  }));
function setup(seed = 42, finale = {}) {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const match = new Match('room', world, seed, finale);
  for (const id of ids) {
    assert.ok(match.accept({ kind: 'join', playerId: id }));
    match.setReady(id, true);
  }
  assert.ok(match.accept({ kind: 'start' }));
  const revision = match.view('a').loadingRevision;
  for (const id of ids)
    assert.ok(match.accept({ kind: 'loaded', playerId: id, revision }));
  match.advance(3000);
  const bodies = [...world.bodies.getAll()];
  const players = new Map(
    ids.map((id) => {
      const p = match.view(id).players.find((item) => item.id === id).position;
      const body = bodies.find(
        (b) =>
          b.isDynamic() &&
          Math.hypot(b.translation().x - p.x, b.translation().z - p.z) < 0.01,
      );
      assert.ok(body);
      return [id, body];
    }),
  );
  return { match, players, world };
}
function step(match, ms, tick = 100) {
  for (let t = 0; t < ms; t += tick)
    assert.ok(match.advance(Math.min(tick, ms - t)));
}
function move(players, id, point) {
  players.get(id).setTranslation({ x: point.x, y: 0.25, z: point.z }, true);
  players.get(id).setLinvel({ x: 0, y: 0, z: 0 }, true);
}
function pointFor(arena, biome) {
  for (let x = -26; x <= 26; x += 2)
    for (let z = -26; z <= 26; z += 2)
      if (
        terrainAt(arena, x, z) === biome &&
        arenaPointClear(arena.obstacles, { x, z }, 2)
      )
        return { x, z };
  throw new Error(`No point in ${biome}`);
}

test('bounded seeds have connected starts, resources, sites and final area', () => {
  const signatures = new Set();
  const report = [];
  const seeds = [
    0,
    1,
    2,
    42,
    ...Array.from({ length: 20 }, (_, i) => Math.imul(i + 1, 0x9e3779b9) >>> 0),
  ];
  for (const seed of seeds) {
    const arena = createArena(seed);
    signatures.add(JSON.stringify(arena.obstacles));
    const cells = new Set(),
      queue = [[-20, -20]];
    for (let i = 0; i < queue.length; i++) {
      const [x, z] = queue[i],
        key = `${x},${z}`;
      if (
        cells.has(key) ||
        Math.abs(x) > 28 ||
        Math.abs(z) > 28 ||
        !arenaPointClear(arena.obstacles, { x, z })
      )
        continue;
      cells.add(key);
      for (const [dx, dz] of [
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
      ])
        queue.push([x + dx, z + dz]);
    }
    for (const p of [
      ...arena.spawns,
      ...arena.resources,
      ...arena.shelters,
      ...arena.poiSockets,
      ...arena.eliteSites,
      { x: 0, z: 0 },
    ]) {
      assert.ok(
        arenaPointClear(arena.obstacles, p),
        `seed ${seed} point ${JSON.stringify(p)}`,
      );
      assert.ok(
        cells.has(`${Math.round(p.x / 2) * 2},${Math.round(p.z / 2) * 2}`),
        `seed ${seed} unreachable ${JSON.stringify(p)}`,
      );
    }
    report.push({
      seed,
      obstacles: arena.obstacles,
      spawns: arena.spawns,
      resources: arena.resources,
      shelters: arena.shelters,
      poiSockets: arena.poiSockets,
      eliteSites: arena.eliteSites,
      reachableCells: [...cells],
    });
    for (const spawn of arena.spawns)
      assert.ok(
        arena.resources.filter(
          (resource) =>
            Math.hypot(resource.x - spawn.x, resource.z - spawn.z) < 12,
        ).length >= 2,
      );
    assert.deepEqual(
      new Set(arena.terrain.map((r) => r.terrain)),
      new Set(['grass', 'sand', 'snow', 'water']),
    );
    assert.deepEqual(
      new Set(
        arena.terrain
          .filter((r) => r.terrain === 'water')
          .map((r) => r.waterDepth),
      ),
      new Set([0, 1, 2]),
    );
  }
  assert.ok(signatures.size > 1);
  mkdirSync('test-results/checkpoint05', { recursive: true });
  writeFileSync(
    'test-results/checkpoint05/seed-routes.json',
    JSON.stringify(report),
  );
});

test('world clock changes future durations without moving current deadline', () => {
  const c = new WorldClock();
  assert.ok(c.setAdjustment('one', 'day', 10000));
  assert.ok(c.setAdjustment('two', 'night', -20000));
  assert.equal(c.view().nextTransitionAt, 180000);
  c.advance(180000);
  assert.deepEqual(c.view(), {
    phase: 'night',
    phaseStartedAt: 180000,
    nextTransitionAt: 280000,
  });
  c.advance(280000);
  assert.deepEqual(c.view(), {
    phase: 'day',
    phaseStartedAt: 280000,
    nextTransitionAt: 470000,
  });
});

test('four biome conditions, terrain adaptation, thermal damage and recovery', () => {
  const { match, players } = setup();
  try {
    const arena = createArena(42);
    for (const biome of ['grass', 'sand', 'snow', 'water']) {
      const p = pointFor(arena, biome);
      move(players, 'a', p);
      assert.equal(terrainAt(match.view('a').arena, p.x, p.z), biome);
    }
    const before = ['grass', 'sand', 'snow', 'water'].map((b) =>
      match.terrainMovementFactor('a', b, 2),
    );
    assert.ok(match.setModifiers('a', mods({ terrainAdaptation: 100 })));
    const after = ['grass', 'sand', 'snow', 'water'].map((b) =>
      match.terrainMovementFactor('a', b, 2),
    );
    assert.deepEqual(after, [1, 1, 1, 1]);
    assert.ok(before[1] < 1 && before[2] < 1 && before[3] < 1);
    const water = arena.terrain.find(
      (r) => r.terrain === 'water' && r.waterDepth === 2,
    );
    assert.equal(terrainRegionAt(arena, water.x, water.z).waterDepth, 2);
    assert.ok(
      match.terrainMovementFactor('b', 'water', 0) >
        match.terrainMovementFactor('b', 'water', 2),
    );
    const sand = pointFor(arena, 'sand');
    move(players, 'a', sand);
    move(players, 'b', { x: sand.x + 1, z: sand.z });
    assert.ok(
      match.setModifiers(
        'a',
        mods({ terrainAdaptation: 100, heatAdaptation: 100, plating: 50 }),
      ),
    );
    assert.ok(match.setModifiers('b', mods({ plating: 50 })));
    step(match, 45000);
    assert.equal(
      match.view('a').weather.find((w) => w.kind === 'heatwave')?.state,
      'active',
    );
    const hullA = match.view('a').players.find((p) => p.id === 'a').health;
    const hullB = match.view('b').players.find((p) => p.id === 'b').health;
    step(match, 22000);
    const a = match.view('a'),
      b = match.view('b');
    assert.ok(
      a.thermal.heat < b.thermal.heat,
      `${a.thermal.heat} vs ${b.thermal.heat}`,
    );
    assert.ok(b.players.find((p) => p.id === 'b').health.hull < hullB.hull);
    assert.equal(
      b.players.find((p) => p.id === 'b').health.plating,
      hullB.plating,
    );
    assert.equal(a.players.find((p) => p.id === 'a').health.hull, hullA.hull);
    const exposure = b.thermal.heat;
    move(players, 'b', pointFor(arena, 'grass'));
    step(match, 5000);
    assert.ok(match.view('b').thermal.heat < exposure);
  } finally {
    match.dispose();
  }
});

test('night views remove hidden players, dependent projectiles and exact radar references', () => {
  const { match, players } = setup();
  try {
    for (const id of ids)
      assert.ok(
        match.setModifiers(
          id,
          mods({
            maximumHealth: 900,
            damageResistance: 100,
            heatAdaptation: 10000,
            coldAdaptation: 10000,
          }),
        ),
      );
    step(match, 180000, 500);
    assert.equal(match.view('a').worldClock.phase, 'night');
    move(players, 'a', { x: -24, z: -24 });
    move(players, 'b', { x: 24, z: 24 });
    assert.ok(match.launchProjectile('b', 0, 1, 10000, 1, 0));
    const a = match.view('a');
    assert.ok(!a.players.some((p) => p.id === 'b'));
    assert.equal(a.projectiles.length, 0);
    assert.deepEqual(Object.keys(a.arena).sort(), ['obstacles', 'terrain']);
    for (const hint of a.radar)
      assert.deepEqual(Object.keys(hint).sort(), [
        'direction',
        'distance',
        'kind',
      ]);
    assert.ok(match.setPlayerVisibility('b', 'c', false));
    match.damageBatch([
      {
        targetId: 'a',
        ownerId: null,
        channel: 'boundary',
        amount: 100000,
        depth: 0,
      },
    ]);
    assert.equal(match.view('a').spectating, 'b');
    assert.ok(!match.view('a').players.some((p) => p.id === 'c'));
  } finally {
    match.dispose();
  }
});

test('cold exposure respects cold adaptation independently of snow traction and recovers', () => {
  const { match, players } = setup();
  try {
    const arena = createArena(42),
      snow = pointFor(arena, 'snow');
    move(players, 'a', snow);
    move(players, 'b', { x: snow.x + 1, z: snow.z });
    assert.ok(
      match.setModifiers('a', mods({ coldAdaptation: 100, plating: 50 })),
    );
    assert.ok(
      match.setModifiers('b', mods({ snowAdaptation: 100, plating: 50 })),
    );
    assert.ok(
      match.terrainMovementFactor('a', 'snow') <
        match.terrainMovementFactor('b', 'snow'),
    );
    step(match, 50000);
    assert.equal(
      match.view('a').weather.find((w) => w.kind === 'blizzard')?.state,
      'active',
    );
    const initial = match.view('b').players.find((p) => p.id === 'b').health;
    step(match, 22000);
    const a = match.view('a'),
      b = match.view('b');
    assert.ok(a.thermal.cold < b.thermal.cold);
    assert.ok(b.players.find((p) => p.id === 'b').health.hull < initial.hull);
    assert.equal(
      b.players.find((p) => p.id === 'b').health.plating,
      initial.plating,
    );
    move(players, 'b', pointFor(arena, 'grass'));
    step(match, 5000);
    assert.ok(match.view('b').thermal.cold < b.thermal.cold);
  } finally {
    match.dispose();
  }
});

test('senses change night discovery and spectator requests cannot select a concealed player', () => {
  const { match, players } = setup();
  try {
    for (const id of ids)
      assert.ok(
        match.setModifiers(
          id,
          mods({
            damageResistance: 100,
            heatAdaptation: 10000,
            coldAdaptation: 10000,
          }),
        ),
      );
    step(match, 180000, 500);
    move(players, 'a', { x: -20, z: -20 });
    move(players, 'b', { x: 0, z: -20 });
    assert.ok(!match.view('a').players.some((p) => p.id === 'b'));
    assert.ok(
      match.setModifiers('a', mods({ senses: 400, damageResistance: 100 })),
    );
    assert.ok(match.view('a').players.some((p) => p.id === 'b'));
    match.damageBatch([
      {
        targetId: 'a',
        ownerId: null,
        channel: 'boundary',
        amount: 100000,
        depth: 0,
      },
    ]);
    assert.equal(match.view('a').spectating, 'b');
    move(players, 'c', { x: -20, z: 20 });
    assert.ok(!match.view('a').players.some((p) => p.id === 'c'));
    assert.equal(
      match.authorize({
        kind: 'spectate',
        matchId: 'room',
        playerId: 'a',
        sequence: 1,
        targetId: 'c',
      }),
      false,
    );
  } finally {
    match.dispose();
  }
});

test('hunter kills a forager and a player collects the third-party wreckage', () => {
  const { match, players, world } = setup();
  try {
    for (const id of ids) move(players, id, { x: -25, z: -25 });
    const bots = match.view('a').bots;
    const hunter = bots.find((bot) => bot.role === 'hunter'),
      prey = bots.find((bot) => bot.role === 'forager');
    assert.ok(hunter && prey);
    const bodies = world.bodies.getAll();
    const botBody = (bot) =>
      bodies.find(
        (body) =>
          body.isDynamic() &&
          Math.hypot(
            body.translation().x - bot.position.x,
            body.translation().z - bot.position.z,
          ) < 0.01,
      );
    const hunterBody = botBody(hunter),
      preyBody = botBody(prey);
    assert.ok(hunterBody && preyBody);
    const point = pointFor(createArena(42), 'grass');
    hunterBody.setTranslation({ x: point.x, y: 0.25, z: point.z }, true);
    preyBody.setTranslation({ x: point.x + 1.3, y: 0.25, z: point.z }, true);
    assert.ok(
      match.damageBatch([
        {
          targetId: prey.id,
          ownerId: null,
          channel: 'direct',
          amount: 29,
          depth: 0,
        },
      ])[0],
    );
    let view;
    for (let elapsed = 0; elapsed < 30000; elapsed += 50) {
      step(match, 50, 50);
      view = match.view('a');
      if (!view.bots.some((bot) => bot.id === prey.id)) break;
    }
    assert.ok(!view.bots.some((bot) => bot.id === prey.id));
    const wreck = view.resources.find((resource) => resource.source === 'meat');
    assert.ok(wreck, 'bot kill should leave meat');
    move(players, 'a', wreck.position);
    step(match, 200, 20);
    const collection = match
      .takeCollections()
      .find((e) => e.resourceId === wreck.id && e.playerId === 'a');
    assert.equal(collection?.provenance, 'third-party');
    assert.equal(collection?.killerId, hunter.id);
  } finally {
    match.dispose();
  }
});

test('bot resource consumption yields to a nearby player and resumes after departure', () => {
  const { match, players, world } = setup();
  try {
    const arena = createArena(42),
      point = pointFor(arena, 'grass');
    for (const id of ids) move(players, id, { x: -25, z: -25 });
    const bots = match.view('a').bots;
    for (const bot of bots) assert.ok(match.setBotHostility(bot.id, false));
    const forager = bots.find((bot) => bot.role === 'forager');
    const body = world.bodies
      .getAll()
      .find(
        (b) =>
          b.isDynamic() &&
          Math.hypot(
            b.translation().x - forager.position.x,
            b.translation().z - forager.position.z,
          ) < 0.01,
      );
    assert.ok(body);
    body.setTranslation({ x: point.x, y: 0.25, z: point.z }, true);
    const food = match.spawnResource({
      position: { x: point.x + 1, z: point.z },
      source: 'vegetation',
      rarity: 'common',
      killerId: null,
      ownerId: null,
      killerKind: null,
      repair: false,
    });
    assert.ok(food);
    move(players, 'a', { x: point.x + 1, z: point.z });
    assert.ok(
      match.setOffer('a', { id: 'fixture', revision: 0, choices: ['x'] }),
    );
    step(match, 5000, 50);
    assert.equal(
      match.view('b').resources.find((r) => r.id === food)?.stage,
      0,
    );
    move(players, 'a', { x: -25, z: -25 });
    step(match, 5000, 50);
    assert.ok(
      (match.view('b').resources.find((r) => r.id === food)?.stage ?? 4) > 0,
    );
  } finally {
    match.dispose();
  }
});

test('director raises bot tier over time without exceeding its population budget', () => {
  const { match } = setup();
  try {
    for (const id of ids)
      assert.ok(
        match.setModifiers(
          id,
          mods({
            damageResistance: 100,
            heatAdaptation: 10000,
            coldAdaptation: 10000,
          }),
        ),
      );
    match.syncWallClock(1000);
    match.syncWallClock(361000);
    step(match, 16000, 100);
    const middle = match.view('a').bots;
    assert.ok(
      middle.some((bot) => bot.tier === 2),
      JSON.stringify(middle),
    );
    assert.ok(middle.length <= 6);
    match.syncWallClock(721000);
    step(match, 16000, 100);
    const late = match.view('a').bots;
    assert.ok(
      late.some((bot) => bot.tier === 3),
      JSON.stringify(late),
    );
    assert.ok(late.length <= 8);
  } finally {
    match.dispose();
  }
});

test('weather warnings, activation, expiration and reconnect preserve match and choice clocks', () => {
  const { match } = setup();
  try {
    for (const id of ids)
      assert.ok(
        match.setModifiers(
          id,
          mods({
            damageResistance: 100,
            heatAdaptation: 10000,
            coldAdaptation: 10000,
          }),
        ),
      );
    step(match, 30000, 100);
    const warning = match.view('a');
    assert.equal(
      warning.weather.find((w) => w.kind === 'heatwave')?.state,
      'warning',
    );
    assert.ok(
      match.setOffer('a', {
        id: 'weather-choice',
        revision: 0,
        choices: ['x'],
      }),
    );
    match.markSelectionDisplayed('a', 'weather-choice', 0);
    const deadline = match.view('a').offer.deadline;
    const boundary = match.view('a').boundary.elapsedMs;
    step(match, 5000, 100);
    assert.equal(match.view('a').offer.deadline, deadline);
    assert.equal(match.view('a').boundary.elapsedMs - boundary, 5000);
    assert.ok(match.accept({ kind: 'disconnect', playerId: 'b' }));
    assert.ok(match.accept({ kind: 'connect', playerId: 'b' }));
    assert.deepEqual(match.view('a').weather, match.view('b').weather);
    assert.deepEqual(match.view('a').worldClock, match.view('b').worldClock);
    step(match, 10000, 100);
    assert.equal(
      match.view('a').weather.find((w) => w.kind === 'heatwave')?.state,
      'active',
    );
    step(match, 60000, 100);
    assert.ok(!match.view('a').weather.some((w) => w.kind === 'heatwave'));
  } finally {
    match.dispose();
  }
});

test('night blizzard increases exposure relative to daytime under the recorded estimate', () => {
  const { match, players } = setup();
  try {
    const arena = createArena(42),
      snow = pointFor(arena, 'snow');
    for (const id of ids)
      assert.ok(match.setModifiers(id, mods({ damageResistance: 100 })));
    move(players, 'a', snow);
    step(match, 50000, 100);
    assert.equal(
      match.view('a').weather.find((w) => w.kind === 'blizzard').intensity,
      1,
    );
    step(match, 2000, 100);
    const day = match.view('a').thermal.cold;
    move(players, 'a', pointFor(arena, 'grass'));
    step(match, 178000, 500);
    assert.equal(match.view('a').worldClock.phase, 'night');
    assert.equal(match.view('a').thermal.cold, 0);
    move(players, 'a', snow);
    assert.equal(
      match.view('a').weather.find((w) => w.kind === 'blizzard').intensity,
      1.5,
    );
    step(match, 2000, 100);
    const night = match.view('a').thermal.cold;
    assert.ok(Math.abs(night / day - 1.5) < 0.01);
  } finally {
    match.dispose();
  }
});

test('greater senses reveal more coarse site hints without exact locations', () => {
  const { match, players } = setup();
  try {
    const arena = createArena(42);
    let improved = false;
    for (let x = -24; x <= 24 && !improved; x += 8)
      for (let z = -24; z <= 24 && !improved; z += 8) {
        if (!arenaPointClear(arena.obstacles, { x, z }, 1)) continue;
        move(players, 'a', { x, z });
        assert.ok(match.setModifiers('a', mods({ senses: -100 })));
        const low = match.view('a').radar.filter((h) => h.kind === 'poi');
        assert.ok(match.setModifiers('a', mods({ senses: 400 })));
        const high = match.view('a').radar.filter((h) => h.kind === 'poi');
        if (high.length > low.length) {
          for (const hint of high)
            assert.deepEqual(Object.keys(hint).sort(), [
              'direction',
              'distance',
              'kind',
            ]);
          improved = true;
        }
      }
    assert.ok(
      improved,
      'higher senses should reveal a previously distant site',
    );
  } finally {
    match.dispose();
  }
});

test('snow adaptation changes actual controlled travel over the same route', () => {
  function travel(adaptation) {
    const { match, players } = setup();
    try {
      const arena = createArena(42);
      let start;
      for (let x = -24; x <= 16 && !start; x += 2)
        for (let z = -24; z <= 24 && !start; z += 2) {
          if (
            [0, 2, 4, 6, 8].every(
              (dx) =>
                terrainAt(arena, x + dx, z) === 'snow' &&
                arenaPointClear(arena.obstacles, { x: x + dx, z }, 2),
            )
          )
            start = { x, z };
        }
      assert.ok(start);
      move(players, 'a', start);
      for (const id of ['b', 'c', 'd']) move(players, id, { x: -25, z: -25 });
      assert.ok(
        match.setModifiers(
          'a',
          mods({ snowAdaptation: adaptation, damageResistance: 100 }),
        ),
      );
      const begin = match.view('a').players.find((p) => p.id === 'a')
        .position.x;
      for (let t = 0; t < 1500; t += 50) {
        match.setControl('a', {
          kind: 'control',
          matchId: 'room',
          playerId: 'a',
          sequence: t,
          x: 1,
          y: 0,
          aim: 0,
          buttons: 0,
        });
        step(match, 50, 50);
      }
      return (
        match.view('a').players.find((p) => p.id === 'a').position.x - begin
      );
    } finally {
      match.dispose();
    }
  }
  const normal = travel(0),
    adapted = travel(100);
  assert.ok(normal > 0);
  assert.ok(adapted > normal + 1, `${normal} versus ${adapted}`);
});
