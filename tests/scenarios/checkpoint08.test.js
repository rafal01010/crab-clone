import { test } from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { Match } from '../../build-host/server/match/match.js';
import { createStarterRegistry } from '../../build-host/server/content/starter.js';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

await RAPIER.init();
const registry = createStarterRegistry();
const ids = ['a', 'b', 'c', 'd'];
function setup(world = new RAPIER.World({ x: 0, y: 0, z: 0 })) {
  return createAbilityMatch('checkpoint08', { world, registry }).match;
}

test('craft remain on the gameplay plane after selection and vertical impulses', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const match = setup(world);
  try {
    const position = match.view('a').players.find((p) => p.id === 'a').position;
    const body = world.bodies
      .getAll()
      .find(
        (b) =>
          b.isDynamic() &&
          Math.hypot(
            b.translation().x - position.x,
            b.translation().z - position.z,
          ) < 0.01,
      );
    assert.ok(body);
    const height = body.translation().y;
    body.applyImpulse({ x: 0, y: 1000, z: 0 }, true);
    for (let i = 0; i < 20; i++) assert.ok(match.advance(50));
    assert.equal(body.translation().y, height);
    assert.ok(match.grantProgress('a', 10));
    assert.ok(match.advance(20));
    const offer = match.view('a').offer;
    assert.ok(offer);
    assert.ok(
      match.consume({
        kind: 'choice',
        matchId: 'checkpoint08',
        playerId: 'a',
        sequence: 1,
        offerId: offer.id,
        revision: offer.revision,
        choiceId: offer.choices[0],
      }),
    );
    const before = body.translation();
    const direction = Math.sign(-before.x) || 1;
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'checkpoint08',
        playerId: 'a',
        sequence: 2,
        x: direction,
        y: 0,
        aim: 0,
        buttons: 0,
      }),
    );
    body.applyImpulse({ x: 0, y: 1000, z: 0 }, true);
    for (let i = 0; i < 20; i++) assert.ok(match.advance(50));
    assert.equal(body.translation().y, height);
    assert.ok(Math.abs(body.translation().x - before.x) > 0.1);
  } finally {
    match.dispose();
  }
});
const eligible = (id, ranks = [], specializations = []) => {
  const definition = registry.definition(id);
  return registry
    .eligible(new Map(ranks), new Set(specializations), definition.pool)
    .includes(id);
};

test('epic rank-two tongue and leech use the source damage midpoint', () => {
  for (const id of ['projectile-tongue', 'leech']) {
    assert.equal(registry.definition(id).values.epic[1], 1.35);
  }
});

test('chassis and weapon paths enforce prerequisites and exclusions in both orders', () => {
  for (const [left, right] of [
    ['legs', 'slithery'],
    ['legs', 'tentacles'],
    ['pincer', 'claws'],
    ['leap', 'scuttle'],
  ]) {
    assert.equal(eligible(left, [[right, 1]]), false, `${left} after ${right}`);
    assert.equal(eligible(right, [[left, 1]]), false, `${right} after ${left}`);
  }
  assert.equal(eligible('claws'), false);
  assert.equal(eligible('claws', [['arms', 1]]), true);
  assert.equal(eligible('claws', [['tentacles', 2]]), false);
  assert.equal(eligible('claws', [['tentacles', 3]]), true);
  assert.equal(eligible('slide'), false);
  assert.equal(eligible('slide', [['slithery', 1]]), true);
  assert.equal(eligible('scuttle'), false);
  assert.equal(eligible('scuttle', [['legs', 1]]), true);
  assert.equal(eligible('more-legs', [['legs', 3]]), false);
  assert.equal(eligible('more-legs', [['legs', 3]], ['legs-arthropod']), true);
  assert.equal(eligible('spit'), false);
  for (const ranks of [[['beak', 2]], [['jaws', 1]], [['saliva', 1]]])
    assert.equal(eligible('spit', ranks), true);
  assert.equal(eligible('spit', [['beak', 1]]), false);
  assert.equal(registry.definition('pincers').id, 'pincer');
});

test('actual Match applies chassis gains and rejects illegal acquisitions', () => {
  const match = setup();
  try {
    const stats = () => match.view('a').players.find((p) => p.id === 'a').stats;
    const baseline = { ...stats() };
    assert.equal(match.grantUpgrade('a', 'claws', 'common', 1), false);
    assert.ok(match.grantUpgrade('a', 'arms', 'branching', 1));
    assert.equal(stats().physical, baseline.physical + 2);
    assert.equal(stats().ability, baseline.ability + 2);
    assert.equal(stats().salvageReach, baseline.salvageReach + 2);
    assert.ok(match.grantUpgrade('a', 'claws', 'common', 1));
    assert.equal(match.grantUpgrade('a', 'pincer', 'common', 1), false);
    assert.ok(match.grantUpgrade('a', 'legs', 'branching', 1));
    assert.equal(match.grantUpgrade('a', 'slithery', 'branching', 1), false);
    assert.equal(stats().speed, baseline.speed + 1.25);
    assert.ok(match.grantUpgrade('a', 'arms', 'branching', 2));
    assert.equal(stats().physical, baseline.physical + 4);
    assert.equal(stats().ability, baseline.ability + 4);
    assert.equal(stats().salvageReach, baseline.salvageReach + 4);
  } finally {
    match.dispose();
  }
});

test('Dash and Slide travel their expected distances and stop at obstacles across tick sizes', async () => {
  const { createArena } = await import('../../build-host/shared/arena.js');
  for (const id of ['basic-dash', 'slide']) {
    for (const tick of [10, 25, 50, 100]) {
      for (const wall of [false, true]) {
        const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
        const match = new Match('course', world, 42, {}, 0, registry);
        try {
          for (const playerId of ids) {
            assert.ok(match.accept({ kind: 'join', playerId }));
            match.setReady(playerId, true);
          }
          assert.ok(match.accept({ kind: 'start' }));
          const revision = match.view('a').loadingRevision;
          for (const playerId of ids)
            assert.ok(match.accept({ kind: 'loaded', playerId, revision }));
          assert.ok(match.advance(3000));
          const position = match
            .view('a')
            .players.find((p) => p.id === 'a').position;
          const body = world.bodies
            .getAll()
            .find(
              (b) =>
                b.isDynamic() &&
                Math.hypot(
                  b.translation().x - position.x,
                  b.translation().z - position.z,
                ) < 0.01,
            );
          assert.ok(body);
          if (id === 'slide') {
            assert.ok(match.grantUpgrade('a', 'slithery', 'branching', 1));
            assert.ok(match.grantUpgrade('a', 'slide', 'common', 1));
            assert.ok(match.advance(20));
            const offer = match.view('a').offer;
            assert.equal(offer.kind, 'equipment');
            assert.ok(
              match.consume({
                kind: 'choice',
                matchId: 'course',
                playerId: 'a',
                sequence: 1,
                offerId: offer.id,
                revision: offer.revision,
                choiceId: 'movement',
              }),
            );
          }
          const obstacle = createArena(42).obstacles[4];
          const edge = obstacle.x - obstacle.width / 2;
          const start = wall ? { x: edge - 1, z: obstacle.z } : { x: 0, z: 0 };
          body.setTranslation({ ...start, y: 0.25 }, true);
          body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          const control = (buttons) =>
            match.consume({
              kind: 'control',
              matchId: 'course',
              playerId: 'a',
              sequence: 1,
              x: buttons ? 1 : 0,
              y: 0,
              aim: Math.PI / 2,
              buttons,
            });
          assert.ok(control(4));
          for (let elapsed = 0; elapsed < 600; elapsed += tick) {
            if (elapsed >= tick) assert.ok(control(0));
            assert.ok(match.advance(tick));
          }
          const x = body.translation().x;
          const expected = wall ? edge - 0.5 : id === 'slide' ? 10 : 4.5;
          assert.ok(
            Math.abs(x - expected) < 0.02,
            `${id}, ${tick}ms, wall=${wall}: ${x} != ${expected}`,
          );
        } finally {
          match.dispose();
        }
      }
    }
  }
});

test('Leap crosses a planar obstacle and lands clear without changing height', async () => {
  const { createArena, arenaPointClear } =
    await import('../../build-host/shared/arena.js');
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const match = setup(world);
  try {
    const position = match.view('a').players.find((p) => p.id === 'a').position;
    const body = world.bodies
      .getAll()
      .find(
        (b) =>
          b.isDynamic() &&
          Math.hypot(
            b.translation().x - position.x,
            b.translation().z - position.z,
          ) < 0.01,
      );
    assert.ok(body);
    assert.ok(match.grantUpgrade('a', 'legs', 'branching', 1));
    assert.ok(match.grantUpgrade('a', 'leap', 'common', 1));
    assert.ok(match.advance(20));
    const offer = match.view('a').offer;
    assert.equal(offer.kind, 'equipment');
    assert.ok(
      match.consume({
        kind: 'choice',
        matchId: 'checkpoint08',
        playerId: 'a',
        sequence: 1,
        offerId: offer.id,
        revision: offer.revision,
        choiceId: 'movement',
      }),
    );
    const arena = createArena(42);
    const obstacle = arena.obstacles[4];
    const start = {
      x: obstacle.x - obstacle.width / 2 - 1,
      y: 0.25,
      z: obstacle.z,
    };
    body.setTranslation(start, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    const control = (buttons) =>
      match.consume({
        kind: 'control',
        matchId: 'checkpoint08',
        playerId: 'a',
        sequence: 1,
        x: 1,
        y: 0,
        aim: Math.PI / 2,
        buttons,
      });
    assert.ok(control(4));
    assert.ok(match.advance(100));
    assert.ok(control(0));
    assert.ok(match.advance(50));
    const landing = body.translation();
    assert.ok(landing.x > obstacle.x + obstacle.width / 2 + 0.5);
    assert.ok(arenaPointClear(arena.obstacles, landing, 0.5));
    assert.equal(landing.y, start.y);
  } finally {
    match.dispose();
  }
});

function equipMovement(match, id, rarity = 'common') {
  assert.ok(match.grantUpgrade('a', id, rarity, 1));
  assert.ok(match.advance(20));
  const offer = match.view('a').offer;
  assert.equal(offer.kind, 'equipment');
  assert.ok(
    match.consume({
      kind: 'choice',
      matchId: 'checkpoint08',
      playerId: 'a',
      sequence: 1,
      offerId: offer.id,
      revision: offer.revision,
      choiceId: 'movement',
    }),
  );
}
function playerBody(match, world, id = 'a') {
  const position = match.view(id).players.find((p) => p.id === id).position;
  const body = world.bodies
    .getAll()
    .find(
      (b) =>
        b.isDynamic() &&
        Math.hypot(
          b.translation().x - position.x,
          b.translation().z - position.z,
        ) < 0.01,
    );
  assert.ok(body);
  return body;
}
function control(match, buttons, x = 1) {
  assert.ok(
    match.consume({
      kind: 'control',
      matchId: 'checkpoint08',
      playerId: 'a',
      sequence: 1,
      x,
      y: 0,
      aim: Math.PI / 2,
      buttons,
    }),
  );
}

test('Scuttle requires Legs, adds its risk once, and enforces its cooldown', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const match = setup(world);
  try {
    assert.equal(match.grantUpgrade('a', 'scuttle', 'common', 1), false);
    assert.ok(match.grantUpgrade('a', 'legs', 'branching', 1));
    const risk = match.view('a').progression.carcinisation;
    equipMovement(match, 'scuttle');
    assert.equal(match.view('a').progression.carcinisation, risk + 1);
    assert.equal(match.grantUpgrade('a', 'scuttle', 'common', 1), false);
    assert.equal(match.grantUpgrade('a', 'scuttle', 'common', 2), false);
    assert.equal(match.view('a').progression.carcinisation, risk + 1);
    const body = playerBody(match, world);
    body.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    control(match, 4);
    assert.ok(match.advance(100));
    control(match, 0, 0);
    assert.ok(match.advance(100));
    assert.ok(Math.abs(body.translation().x - 3.5) < 0.02);
    const readyAt = match
      .view('a')
      .equipment.learned.find((item) => item.id === 'scuttle').readyAt;
    assert.ok(readyAt > match.view('a').time);
    control(match, 4);
    assert.ok(match.advance(100));
    assert.ok(body.translation().x < 4.5);
    assert.equal(
      match.view('a').equipment.learned.find((item) => item.id === 'scuttle')
        .readyAt,
      readyAt,
    );
  } finally {
    match.dispose();
  }
});

test('Leap immunity expires and does not prevent boundary damage', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const match = setup(world);
  try {
    assert.ok(match.grantUpgrade('a', 'legs', 'branching', 1));
    equipMovement(match, 'leap');
    const body = playerBody(match, world);
    body.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
    control(match, 4);
    assert.ok(match.advance(100));
    control(match, 0);
    assert.ok(match.advance(50));
    const hit = (channel) =>
      match.damageBatch([
        { targetId: 'a', ownerId: 'b', amount: 10, channel, depth: 0 },
      ])[0];
    assert.equal(hit('direct').hull, 0);
    assert.equal(hit('meteor').hull, 0);
    assert.equal(hit('boundary').hull, 10);
    for (let i = 0; i < 4; i++) assert.ok(match.advance(100));
    assert.equal(hit('direct').hull, 10);
  } finally {
    match.dispose();
  }
});

test('Leech heals from actual damage and does not heal from a blocked hit', () => {
  const match = setup();
  try {
    assert.ok(match.grantUpgrade('a', 'leech', 'rare', 1));
    match.damageBatch([
      { targetId: 'a', ownerId: 'b', amount: 30, channel: 'direct', depth: 0 },
    ]);
    const hull = (id) =>
      match.view(id).players.find((p) => p.id === id).health.hull;
    const before = hull('a');
    const result = match.damageBatch([
      {
        targetId: 'b',
        ownerId: 'a',
        amount: 20,
        channel: 'direct',
        origin: 'manual',
        abilityId: 'leech',
        depth: 0,
      },
    ])[0];
    assert.equal(result.hull + result.plating, 20);
    assert.equal(hull('a'), before + 2);
    assert.ok(match.grantProgress('b', 10));
    assert.ok(match.advance(20));
    const healed = hull('a');
    const blocked = match.damageBatch([
      {
        targetId: 'b',
        ownerId: 'a',
        amount: 20,
        channel: 'direct',
        origin: 'manual',
        abilityId: 'leech',
        depth: 0,
      },
    ])[0];
    assert.equal(blocked.hull + blocked.plating, 0);
    assert.equal(hull('a'), healed);
  } finally {
    match.dispose();
  }
});

test('Sprint boosts movement temporarily without changing permanent speed', () => {
  const run = (sprint) => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const match = setup(world);
    try {
      if (sprint) equipMovement(match, 'sprint', 'rare');
      const body = playerBody(match, world);
      body.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      const speed = () =>
        match.view('a').players.find((p) => p.id === 'a').stats.speed;
      const permanent = speed();
      const distances = [];
      for (let t = 0; t < 3000; t += 100) {
        body.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
        control(match, sprint && t === 0 ? 4 : 0);
        assert.ok(match.advance(100));
        distances.push(body.translation().x);
      }
      assert.equal(speed(), permanent);
      return distances;
    } finally {
      match.dispose();
    }
  };
  const baseline = run(false),
    sprint = run(true);
  assert.ok(Math.abs(sprint[10] / baseline[10] - 1.4) < 0.01);
  assert.ok(Math.abs(sprint[29] - baseline[29]) < 0.01);
});

test('Spur follows a live attack once without occupying an attack slot', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const match = setup(world);
  try {
    assert.ok(match.grantUpgrade('a', 'tail', 'common', 1));
    assert.ok(match.grantUpgrade('a', 'spur', 'rare', 1));
    const slots = match.view('a').equipment.slots;
    assert.notEqual(slots.primary, 'spur');
    assert.notEqual(slots.secondary, 'spur');
    const a = playerBody(match, world),
      b = playerBody(match, world, 'b');
    a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
    b.setTranslation({ x: 1.8, y: 0.25, z: 0 }, true);
    assert.ok(match.advance(20));
    match.takeDamageLedger();
    control(match, 1, 0);
    for (let i = 0; i < 10; i++) assert.ok(match.advance(50));
    const trace = match
      .takeDamageLedger()
      .filter(({ event }) => event.ownerId === 'a' && event.targetId === 'b');
    assert.equal(
      trace.filter(({ event }) => event.abilityId === 'spur').length,
      1,
    );
    assert.equal(trace.filter(({ event }) => event.depth === 0).length, 1);
    assert.ok(trace.every(({ event }) => event.depth <= 1));
    assert.equal(
      trace.find(({ event }) => event.abilityId === 'spur').result.hull,
      4.5,
    );
  } finally {
    match.dispose();
  }
});

test('Legs specialization choices apply their distinct gains and graph routes', () => {
  for (const specialization of ['legs-arthropod', 'legs-bipedal']) {
    const match = setup();
    try {
      for (let rank = 1; rank <= 3; rank++)
        assert.ok(match.grantUpgrade('a', 'legs', 'branching', rank));
      assert.ok(match.advance(20));
      const offer = match.view('a').offer;
      assert.equal(offer.kind, 'specialization');
      assert.ok(offer.choices.includes(specialization));
      const risk = match.view('a').progression.carcinisation;
      const speed = match.view('a').players.find((p) => p.id === 'a')
        .stats.speed;
      assert.ok(
        match.consume({
          kind: 'choice',
          matchId: 'checkpoint08',
          playerId: 'a',
          sequence: 1,
          offerId: offer.id,
          revision: offer.revision,
          choiceId: specialization,
        }),
      );
      const view = match.view('a');
      if (specialization === 'legs-arthropod') {
        assert.equal(view.progression.carcinisation, risk + 1);
        assert.ok(match.grantUpgrade('a', 'more-legs', 'rare', 1));
        assert.equal(match.view('a').progression.carcinisation, risk + 2);
        assert.equal(match.grantUpgrade('a', 'more-legs', 'rare', 1), false);
        assert.equal(match.view('a').progression.carcinisation, risk + 2);
      } else {
        assert.ok(
          view.progression.upgrades.some(
            (entry) => entry.id === 'arms' && entry.rank === 1,
          ),
        );
        assert.equal(
          view.players.find((p) => p.id === 'a').stats.speed,
          speed - 1,
        );
        assert.equal(match.grantUpgrade('a', 'more-legs', 'rare', 1), false);
      }
    } finally {
      match.dispose();
    }
  }
});

test('Jaws doubles a hit against a stunned target and keeps its salvage bonus', () => {
  const match = setup();
  try {
    const stats = () => match.view('a').players.find((p) => p.id === 'a').stats;
    const before = stats().salvageSpeed;
    assert.ok(match.grantUpgrade('a', 'jaws', 'common', 1));
    assert.ok(stats().salvageSpeed > before);
    const hit = () =>
      match.damageBatch([
        {
          targetId: 'b',
          ownerId: 'a',
          amount: 10,
          channel: 'contact',
          origin: 'manual',
          abilityId: 'jaws',
          depth: 0,
        },
      ])[0].hull;
    assert.equal(hit(), 10);
    assert.ok(
      match.applyStatus('b', {
        kind: 'stun',
        ownerId: 'a',
        magnitude: 0,
        duration: 2000,
      }),
    );
    assert.equal(hit(), 20);
  } finally {
    match.dispose();
  }
});

test('Stinger attributes corrosion ticks to its owner after an actual hit', () => {
  const match = setup();
  try {
    assert.ok(match.grantUpgrade('a', 'tail', 'common', 1));
    assert.ok(match.grantUpgrade('a', 'stinger', 'rare', 1));
    match.takeDamageLedger();
    match.damageBatch([
      {
        targetId: 'b',
        ownerId: 'a',
        amount: 1,
        channel: 'contact',
        origin: 'manual',
        abilityId: 'stinger',
        depth: 0,
      },
    ]);
    match.takeDamageLedger();
    for (let i = 0; i < 50; i++) assert.ok(match.advance(100));
    const ticks = match
      .takeDamageLedger()
      .filter(
        ({ event }) => event.targetId === 'b' && event.channel === 'corrosion',
      );
    assert.equal(ticks.length, 5);
    assert.ok(ticks.every(({ event }) => event.ownerId === 'a'));
    assert.ok(
      ticks.every(({ result }) => Math.abs(result.hull - 1.925) < 0.001),
    );
  } finally {
    match.dispose();
  }
});

test('all covered rank and rarity combinations can be acquired along legal Match paths', () => {
  const covered = [
    'arms',
    'tentacles',
    'legs',
    'slithery',
    'wings',
    'tail',
    'prehensile-tail',
    'more-legs',
    'fin',
    'hollow-bones',
    'body-slam',
    'claws',
    'pincer',
    'toe-beans',
    'antlers',
    'jaws',
    'horns',
    'trunk',
    'stoner',
    'beak',
    'spit',
    'projectile-tongue',
    'leech',
    'stinger',
    'spur',
    'slide',
    'sprint',
    'leap',
    'scuttle',
  ];
  for (const id of covered) {
    const definition = registry.definition(id);
    const path = registry.findBuildPath(id, 1, new Set(), 50000);
    assert.equal(path.kind, 'reachable', id);
    for (const rarity of definition.rarities) {
      const match = setup();
      try {
        for (const step of path.steps) {
          const entry = registry.definition(step.id);
          const selectedRarity = step.id === id ? rarity : entry.rarities[0];
          assert.ok(
            match.grantUpgrade('a', step.id, selectedRarity, step.rank),
            `${id} ${rarity}: ${step.id} ${step.rank}`,
          );
          if (step.specialization) {
            assert.ok(match.advance(20));
            const offer = match.view('a').offer;
            assert.equal(offer.kind, 'specialization');
            assert.ok(
              match.consume({
                kind: 'choice',
                matchId: 'checkpoint08',
                playerId: 'a',
                sequence: 1,
                offerId: offer.id,
                revision: offer.revision,
                choiceId: step.specialization,
              }),
            );
          }
        }
        for (let rank = 2; rank <= definition.maxRank; rank++) {
          assert.ok(
            match.grantUpgrade('a', id, rarity, rank),
            `${id} ${rarity} rank ${rank}`,
          );
        }
        assert.equal(
          match.view('a').progression.upgrades.find((item) => item.id === id)
            .rank,
          definition.maxRank,
        );
      } finally {
        match.dispose();
      }
    }
  }
});

function chooseSpecialization(match, id) {
  assert.ok(match.advance(20));
  const offer = match.view('a').offer;
  assert.equal(offer.kind, 'specialization');
  assert.ok(offer.choices.includes(id));
  assert.ok(
    match.consume({
      kind: 'choice',
      matchId: 'checkpoint08',
      playerId: 'a',
      sequence: 1,
      offerId: offer.id,
      revision: offer.revision,
      choiceId: id,
    }),
  );
}

test('Sticky Tongue pulls the lighter end toward the heavier end', () => {
  for (const [large, expected] of [
    ['a', 'b'],
    ['b', 'a'],
    [null, 'both'],
  ]) {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const match = setup(world);
    try {
      for (let rank = 1; rank <= 3; rank++)
        assert.ok(match.grantUpgrade('a', 'projectile-tongue', 'rare', rank));
      chooseSpecialization(match, 'projectile-tongue-sticky');
      if (large)
        assert.ok(
          match.setModifiers(large, [
            { id: 'size', stat: 'size', add: 100, multiplier: 1 },
          ]),
        );
      const a = playerBody(match, world),
        b = playerBody(match, world, 'b');
      a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
      b.setTranslation({ x: 6, y: 0.25, z: 0 }, true);
      a.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      assert.ok(match.advance(20));
      match.damageBatch([
        {
          targetId: 'b',
          ownerId: 'a',
          amount: 1,
          channel: 'direct',
          origin: 'manual',
          abilityId: 'projectile-tongue',
          depth: 0,
        },
      ]);
      for (let i = 0; i < 5; i++) assert.ok(match.advance(50));
      const movedA = a.translation().x,
        movedB = 6 - b.translation().x;
      if (expected === 'a') {
        assert.ok(movedA > 0.05);
        assert.ok(Math.abs(movedB) < 0.02);
      } else if (expected === 'b') {
        assert.ok(movedB > 0.05);
        assert.ok(Math.abs(movedA) < 0.02);
      } else {
        assert.ok(movedA > 0.05);
        assert.ok(movedB > 0.05);
      }
    } finally {
      match.dispose();
    }
  }
});

test('live Tongue roots its owner during flight, stuns its target and releases movement', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const match = setup(world);
  try {
    assert.ok(match.grantUpgrade('a', 'projectile-tongue', 'rare', 1));
    const a = playerBody(match, world),
      b = playerBody(match, world, 'b');
    a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
    b.setTranslation({ x: 5, y: 0.25, z: 0 }, true);
    assert.ok(match.advance(20));
    match.takeDamageLedger();
    control(match, 1);
    assert.ok(match.advance(100));
    assert.ok(Math.abs(a.translation().x) < 0.01);
    control(match, 0);
    for (let i = 0; i < 6; i++) assert.ok(match.advance(50));
    const trace = match
      .takeDamageLedger()
      .filter(
        ({ event }) =>
          event.abilityId === 'projectile-tongue' && event.targetId === 'b',
      );
    assert.equal(trace.length, 1);
    assert.equal(trace[0].result.hull, 10.5);
    assert.ok(
      match
        .view('a')
        .players.find((p) => p.id === 'b')
        .statuses.some((s) => s.kind === 'stun' && s.remaining > 0),
    );
    control(match, 0);
    for (let i = 0; i < 4; i++) assert.ok(match.advance(50));
    assert.ok(a.translation().x > 0.1);
  } finally {
    match.dispose();
  }
});

test('Antlers self-damage is capped at 90 percent of maximum hull per hit', () => {
  const match = setup();
  try {
    assert.ok(match.grantUpgrade('a', 'antlers', 'common', 1));
    assert.ok(
      match.setModifiers('b', [
        { id: 'hull', stat: 'maximumHealth', add: 900, multiplier: 1 },
      ]),
    );
    match.repairPlayer('b', 900, false);
    const maximum = match.view('a').players.find((p) => p.id === 'a')
      .stats.maximumHealth;
    match.takeDamageLedger();
    match.damageBatch([
      {
        targetId: 'b',
        ownerId: 'a',
        amount: 900,
        channel: 'contact',
        origin: 'manual',
        abilityId: 'antlers',
        depth: 0,
      },
    ]);
    const selfHit = match
      .takeDamageLedger()
      .find(({ event }) => event.targetId === 'a' && event.channel === 'self');
    assert.ok(selfHit);
    assert.equal(selfHit.event.amount, maximum * 0.9);
    assert.equal(selfHit.result.hull, maximum * 0.9);
  } finally {
    match.dispose();
  }
});

test('Stoner spends ammunition, rejects an empty throw and reloads', () => {
  const match = setup();
  try {
    assert.ok(match.grantUpgrade('a', 'arms', 'branching', 1));
    assert.ok(match.grantUpgrade('a', 'stoner', 'common', 1));
    const ammo = () =>
      match.view('a').equipment.learned.find((item) => item.id === 'stoner')
        .ammunition.charges;
    const fire = () => {
      control(match, 1, 0);
      assert.ok(match.advance(50));
      control(match, 0, 0);
      assert.ok(match.advance(50));
    };
    assert.equal(ammo(), 2);
    fire();
    assert.equal(ammo(), 1);
    for (let i = 0; i < 8; i++) assert.ok(match.advance(100));
    fire();
    assert.equal(ammo(), 0);
    for (let i = 0; i < 8; i++) assert.ok(match.advance(100));
    const before = match.view('a').projectiles.length;
    fire();
    assert.equal(ammo(), 0);
    assert.equal(match.view('a').projectiles.length, before);
    for (let i = 0; i < 15; i++) assert.ok(match.advance(100));
    assert.ok(ammo() > 0);
  } finally {
    match.dispose();
  }
});

test('Horns charges into a plated target once and bypasses plating', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const match = setup(world);
  try {
    assert.ok(match.grantUpgrade('a', 'horns', 'rare', 1));
    assert.ok(match.grantUpgrade('b', 'plated', 'common', 1));
    const a = playerBody(match, world),
      b = playerBody(match, world, 'b');
    a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
    b.setTranslation({ x: 3, y: 0.25, z: 0 }, true);
    assert.ok(match.advance(20));
    match.takeDamageLedger();
    control(match, 1, 0);
    assert.ok(match.advance(50));
    control(match, 0, 0);
    for (let i = 0; i < 8; i++) assert.ok(match.advance(50));
    const trace = match
      .takeDamageLedger()
      .filter(
        ({ event }) =>
          event.ownerId === 'a' &&
          event.targetId === 'b' &&
          event.abilityId === 'horns',
      );
    assert.equal(trace.length, 1);
    assert.equal(trace[0].result.plating, 0);
    assert.ok(trace[0].result.hull > 0);
    assert.equal(
      match.view('b').players.find((p) => p.id === 'b').health.plating,
      5,
    );
  } finally {
    match.dispose();
  }
});

test('Stoner Training grants permanent stats once for a credited kill', () => {
  const match = setup();
  try {
    assert.ok(match.grantUpgrade('a', 'arms', 'branching', 1));
    assert.ok(match.grantUpgrade('a', 'stoner', 'rare', 1));
    assert.ok(match.grantUpgrade('a', 'stoner', 'rare', 2));
    chooseSpecialization(match, 'stoner-training');
    const stats = () => match.view('a').players.find((p) => p.id === 'a').stats;
    const before = { ...stats() };
    const event = {
      targetId: 'b',
      ownerId: 'a',
      amount: 1000,
      channel: 'direct',
      origin: 'manual',
      abilityId: 'stoner',
      depth: 0,
    };
    match.damageBatch([event]);
    assert.equal(stats().physical, before.physical + 0.5);
    assert.equal(stats().ability, before.ability + 0.5);
    match.damageBatch([event]);
    assert.equal(stats().physical, before.physical + 0.5);
    assert.equal(stats().ability, before.ability + 0.5);
  } finally {
    match.dispose();
  }
});

test('weapon aliases resolve to one learned ability and one equipment entry', () => {
  const match = setup();
  try {
    assert.ok(match.grantUpgrade('a', 'arms', 'branching', 1));
    assert.ok(match.grantUpgrade('a', 'pincers', 'common', 1));
    assert.equal(match.grantUpgrade('a', 'pincer', 'common', 1), false);
    assert.ok(match.grantUpgrade('a', 'pincer', 'common', 2));
    const view = match.view('a');
    assert.equal(
      view.progression.upgrades.filter((item) => item.id === 'pincer').length,
      1,
    );
    assert.equal(
      view.progression.upgrades.find((item) => item.id === 'pincer').rank,
      2,
    );
    assert.equal(
      view.equipment.learned.filter((item) => item.id === 'pincer').length,
      1,
    );
    assert.ok(match.grantUpgrade('b', 'body-slam-tail', 'rare', 1));
    assert.equal(match.grantUpgrade('b', 'body-slam', 'rare', 1), false);
    assert.equal(
      match
        .view('b')
        .progression.upgrades.filter((item) => item.id === 'body-slam').length,
      1,
    );
  } finally {
    match.dispose();
  }
});

test('Slide distance and cooldown follow every rank and rarity', () => {
  for (const [rarity, distance, cooldowns] of [
    ['common', 10, [4, 3.4, 2.8]],
    ['rare', 11, [3.8, 3.2, 2.6]],
    ['epic', 12, [3.6, 3, 2.4]],
    ['legendary', 13, [3.4, 2.8, 2.2]],
  ]) {
    for (let rank = 1; rank <= 3; rank++) {
      const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
      const match = setup(world);
      try {
        assert.ok(match.grantUpgrade('a', 'slithery', 'branching', 1));
        equipMovement(match, 'slide', rarity);
        for (let next = 2; next <= rank; next++)
          assert.ok(match.grantUpgrade('a', 'slide', rarity, next));
        const body = playerBody(match, world);
        body.setTranslation({ x: -4, y: 0.25, z: 0 }, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        const before = match.view('a').time;
        control(match, 4);
        assert.ok(match.advance(20));
        control(match, 0, 0);
        for (let t = 0; t < 600; t += 20) assert.ok(match.advance(20));
        const readyAt = match
          .view('a')
          .equipment.learned.find((item) => item.id === 'slide').readyAt;
        assert.ok(
          Math.abs(body.translation().x + 4 - distance) < 0.05,
          `${rarity} rank ${rank} distance`,
        );
        assert.ok(
          Math.abs(readyAt - before - cooldowns[rank - 1] * 1000) < 25,
          `${rarity} rank ${rank} cooldown`,
        );
      } finally {
        match.dispose();
      }
    }
  }
});

test('Sprint speed, duration, and cooldown follow every rank and rarity', () => {
  for (const [rarity, bonuses, durations, cooldown] of [
    ['rare', [40, 50, 60], [2, 2.5, 3], 4.5],
    ['epic', [50, 60, 70], [2.25, 2.75, 3.25], 4],
    ['legendary', [60, 70, 80], [2.5, 3, 3.5], 3.5],
  ]) {
    for (let rank = 1; rank <= 3; rank++) {
      const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
      const match = setup(world);
      try {
        equipMovement(match, 'sprint', rarity);
        for (let next = 2; next <= rank; next++)
          assert.ok(match.grantUpgrade('a', 'sprint', rarity, next));
        const body = playerBody(match, world);
        const permanent = match.view('a').players.find((p) => p.id === 'a')
          .stats.speed;
        const before = match.view('a').time;
        let boosted, lateBoosted, expired;
        for (
          let elapsed = 0;
          elapsed < durations[rank - 1] * 1000 + 600;
          elapsed += 100
        ) {
          body.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
          control(match, elapsed === 0 ? 4 : 0);
          assert.ok(match.advance(100));
          if (elapsed === 500) boosted = body.translation().x;
          if (elapsed <= durations[rank - 1] * 1000 - 300)
            lateBoosted = body.translation().x;
          if (elapsed >= durations[rank - 1] * 1000 + 500)
            expired = body.translation().x;
        }
        assert.ok(
          Math.abs(boosted / expired - (1 + bonuses[rank - 1] / 100)) < 0.05,
          `${rarity} rank ${rank} speed: ${boosted} / ${expired}`,
        );
        assert.ok(
          Math.abs(lateBoosted / expired - (1 + bonuses[rank - 1] / 100)) <
            0.05,
          `${rarity} rank ${rank} duration`,
        );
        assert.equal(
          match.view('a').players.find((p) => p.id === 'a').stats.speed,
          permanent,
        );
        const readyAt = match
          .view('a')
          .equipment.learned.find((item) => item.id === 'sprint').readyAt;
        assert.ok(
          Math.abs(readyAt - before - cooldown * 1000) < 25,
          `${rarity} rank ${rank} cooldown`,
        );
      } finally {
        match.dispose();
      }
    }
  }
});
