import { test } from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { Match } from '../../build-host/server/match/match.js';
import {
  createStarterRegistry,
  starterDefinitions,
} from '../../build-host/server/content/starter.js';
import { createRegistry } from '../../build-host/server/content/registry.js';
import {
  arenaPointClear,
  createArena,
  terrainAt,
} from '../../build-host/shared/arena.js';
import { createPointsOfInterest } from '../../build-host/server/match/points-of-interest.js';

await RAPIER.init();
const ids = ['a', 'b', 'c', 'd'];
function setup(
  registry = createStarterRegistry(),
  world = new RAPIER.World({ x: 0, y: 0, z: 0 }),
) {
  const match = new Match('checkpoint07', world, 42, {}, 0, registry);
  for (const id of ids) {
    assert.ok(match.accept({ kind: 'join', playerId: id }));
    match.setReady(id, true);
  }
  assert.ok(match.accept({ kind: 'start' }));
  const revision = match.view('a').loadingRevision;
  for (const id of ids)
    assert.ok(match.accept({ kind: 'loaded', playerId: id, revision }));
  assert.ok(match.advance(3000));
  return match;
}
function step(match, ms, tick = 50) {
  for (let elapsed = 0; elapsed < ms; elapsed += tick)
    assert.ok(match.advance(Math.min(tick, ms - elapsed)));
}
function send(match, id, kind, offer, extra = {}) {
  return match.consume({
    matchId: 'checkpoint07',
    playerId: id,
    sequence: 1,
    kind,
    offerId: offer.id,
    revision: offer.revision,
    ...extra,
  });
}
function offer(match, id = 'a') {
  const result = match.view(id).offer;
  assert.ok(result);
  return result;
}
function fixtureRegistry() {
  const definitions = starterDefinitions.map((entry) =>
    entry.id !== 'muscular-tissue'
      ? entry
      : {
          ...entry,
          specializations: ['fixture-fork'],
          specializationChoices: [
            {
              id: 'fixture-fork',
              name: 'Fixture fork',
              triggerRank: 1,
              carcinisationBonus: 0,
              visual: { attachment: 'crest', visibility: 'owner' },
              effect: {
                kind: 'stats',
                changes: [{ stat: 'physical', add: 3, multiplier: 1 }],
              },
            },
          ],
        },
  );
  return createRegistry(
    definitions,
    new Set(starterDefinitions.map((entry) => entry.effect)),
  );
}

test('rarity and reroll purchases are revision-checked and conserve currency', () => {
  const match = setup();
  try {
    assert.ok(match.grantProgress('a', 10));
    step(match, 20);
    let current = offer(match);
    const deadline = current.deadline;
    assert.equal(send(match, 'a', 'reroll', current), false);
    assert.equal(match.view('a').progression.currency, 0);
    assert.ok(match.walletTransaction('a', 'seed', 'grant', 100));
    const old = current;
    assert.equal(current.rarityCost, 10);
    assert.ok(send(match, 'a', 'upgrade-rarity', current));
    current = offer(match);
    assert.equal(match.view('a').progression.currency, 90);
    assert.equal(send(match, 'a', 'upgrade-rarity', old), false);
    assert.equal(current.deadline, deadline);
    assert.equal(current.rarityCost, 20);
    assert.ok(send(match, 'a', 'upgrade-rarity', current));
    current = offer(match);
    assert.equal(match.view('a').progression.currency, 70);
    const before = match.view('a').progression.currency;
    const cost = current.rerollCost;
    assert.ok(send(match, 'a', 'reroll', current));
    const rerolled = offer(match);
    assert.equal(match.view('a').progression.currency, before - cost);
    assert.equal(rerolled.deadline, deadline);
    assert.equal(rerolled.rerollCost, cost + 1);
    assert.equal(rerolled.rarityCost, 10);
    assert.equal(send(match, 'a', 'reroll', current), false);
    assert.ok(send(match, 'a', 'reroll', rerolled));
    const secondReroll = offer(match);
    assert.equal(
      match.view('a').progression.currency,
      before - cost - rerolled.rerollCost,
    );
    assert.equal(secondReroll.rerollCost, rerolled.rerollCost + 1);
    assert.ok(
      send(match, 'a', 'choice', secondReroll, {
        choiceId: secondReroll.choices[0],
      }),
    );
    assert.equal(
      send(match, 'a', 'choice', rerolled, { choiceId: rerolled.choices[0] }),
      false,
    );
    assert.ok(match.grantProgress('a', 15));
    step(match, 2100);
    if (offer(match).kind === 'equipment') {
      const replacement = offer(match);
      assert.ok(send(match, 'a', 'choice', replacement, { choiceId: 'keep' }));
      step(match, 2100);
    }
    assert.equal(offer(match).rerollCost, 1);
  } finally {
    match.dispose();
  }
});

test('expired offers reject purchases without spending or extending protection', () => {
  const match = setup();
  try {
    assert.ok(match.walletTransaction('a', 'expiry-funds', 'grant', 100));
    assert.ok(match.grantProgress('a', 10));
    step(match, 20);
    const current = offer(match);
    match.markSelectionDisplayed('a', current.id, current.revision);
    step(match, current.deadline - match.view('a').time);
    assert.equal(send(match, 'a', 'reroll', current), false);
    assert.equal(send(match, 'a', 'upgrade-rarity', current), false);
    assert.equal(
      send(match, 'a', 'choice', current, { choiceId: current.choices[0] }),
      false,
    );
    assert.equal(match.view('a').progression.currency, 100);
    assert.equal(match.view('a').offer, null);
    step(match, 2100);
    assert.equal(match.view('a').offer, null);
  } finally {
    match.dispose();
  }
});

test('a rarity purchase applies only to the selected upgrade', () => {
  const match = setup();
  try {
    assert.ok(match.walletTransaction('a', 'rarity-funds', 'grant', 100));
    assert.ok(match.grantProgress('a', 10));
    step(match, 20);
    const original = offer(match);
    assert.ok(send(match, 'a', 'upgrade-rarity', original));
    const revised = offer(match);
    const changed = revised.details.find(
      (item) =>
        item.rarity !==
        original.details.find((old) => old.id === item.id).rarity,
    );
    assert.ok(changed);
    assert.ok(send(match, 'a', 'choice', revised, { choiceId: changed.id }));
    const upgrades = match.view('a').progression.upgrades;
    assert.equal(
      upgrades.find((item) => item.id === changed.id).rarity,
      changed.rarity,
    );
    assert.ok(
      revised.choices
        .filter((id) => id !== changed.id)
        .every((id) => !upgrades.some((item) => item.id === id)),
    );
  } finally {
    match.dispose();
  }
});

test('specialization choice and skip each resolve once with a real effect', () => {
  const match = setup(fixtureRegistry());
  try {
    for (const id of ['a', 'b'])
      assert.ok(match.grantUpgrade(id, 'muscular-tissue', 'common', 1));
    step(match, 20);
    const a = offer(match, 'a');
    const b = offer(match, 'b');
    assert.equal(a.kind, 'specialization');
    assert.equal(b.kind, 'specialization');
    const before = match.view('a').players.find((player) => player.id === 'a')
      .stats.physical;
    assert.ok(send(match, 'a', 'choice', a, { choiceId: 'fixture-fork' }));
    assert.equal(
      match.view('a').players.find((player) => player.id === 'a').stats
        .physical,
      before + 3,
    );
    assert.equal(
      send(match, 'a', 'choice', a, { choiceId: 'fixture-fork' }),
      false,
    );
    assert.ok(send(match, 'b', 'choice', b, { choiceId: 'skip' }));
    assert.equal(match.view('b').progression.currency, 10);
    assert.equal(send(match, 'b', 'choice', b, { choiceId: 'skip' }), false);
    assert.equal(match.view('b').progression.currency, 10);
  } finally {
    match.dispose();
  }
});

test('movement replacement and re-equipping preserve the original cooldown', () => {
  const match = setup();
  try {
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'checkpoint07',
        playerId: 'a',
        sequence: 1,
        x: 1,
        y: 0,
        aim: 0,
        buttons: 4,
      }),
    );
    step(match, 200);
    const dashReady = match
      .view('a')
      .equipment.learned.find((item) => item.id === 'basic-dash').readyAt;
    assert.ok(dashReady > match.view('a').time);
    assert.ok(
      match.learnAbility('a', {
        id: 'fixture-dash',
        slotType: 'movement',
        action: 'dash',
        cooldown: 5000,
        damage: 0,
      }),
    );
    step(match, 20);
    const replacement = offer(match);
    assert.equal(replacement.kind, 'equipment');
    assert.ok(
      send(match, 'a', 'choice', replacement, { choiceId: 'movement' }),
    );
    assert.equal(match.view('a').equipment.slots.movement, 'fixture-dash');
    assert.equal(
      send(match, 'a', 'choice', replacement, { choiceId: 'movement' }),
      false,
    );
    assert.ok(match.grantProgress('a', 10));
    step(match, 2100);
    const current = offer(match);
    assert.ok(
      send(match, 'a', 'equipment', current, {
        slot: 'movement',
        contentId: 'basic-dash',
      }),
    );
    const revised = offer(match);
    assert.equal(
      send(match, 'a', 'equipment', current, {
        slot: 'movement',
        contentId: 'fixture-dash',
      }),
      false,
    );
    assert.equal(match.view('a').equipment.slots.movement, 'basic-dash');
    assert.equal(
      match.view('a').equipment.learned.find((item) => item.id === 'basic-dash')
        .readyAt,
      dashReady,
    );
    assert.ok(
      send(match, 'a', 'choice', revised, { choiceId: revised.choices[0] }),
    );
  } finally {
    match.dispose();
  }
});

test('equipment replacement times out safely across disconnect and reconnect', () => {
  const match = setup();
  try {
    assert.ok(
      match.learnAbility('a', {
        id: 'fixture-move',
        slotType: 'movement',
        action: 'dash',
        cooldown: 5000,
        damage: 0,
      }),
    );
    step(match, 20);
    const current = offer(match);
    assert.equal(current.kind, 'equipment');
    match.markSelectionDisplayed('a', current.id, current.revision);
    assert.ok(match.accept({ kind: 'disconnect', playerId: 'a' }));
    step(match, 5000);
    assert.ok(match.accept({ kind: 'connect', playerId: 'a' }));
    assert.equal(offer(match).deadline, current.deadline);
    step(match, current.deadline - match.view('a').time);
    assert.equal(match.view('a').equipment.slots.movement, 'basic-dash');
    assert.ok(
      match
        .view('a')
        .equipment.learned.some((ability) => ability.id === 'fixture-move'),
    );
    assert.equal(
      send(match, 'a', 'choice', current, { choiceId: 'movement' }),
      false,
    );
  } finally {
    match.dispose();
  }
});

test('ultimate replacement retains cooldown and learned abilities', () => {
  const match = setup();
  try {
    const ability = (id) => ({
      id,
      slotType: 'ultimate',
      action: 'speed-boost',
      cooldown: 5000,
      damage: 0,
      durationMs: 1000,
      speedMultiplier: 1.2,
    });
    assert.ok(match.learnAbility('a', ability('first-ultimate')));
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'checkpoint07',
        playerId: 'a',
        sequence: 1,
        x: 0,
        y: 0,
        aim: 0,
        buttons: 8,
      }),
    );
    step(match, 50);
    const readyAt = match
      .view('a')
      .equipment.learned.find((item) => item.id === 'first-ultimate').readyAt;
    assert.ok(readyAt > match.view('a').time);
    assert.ok(match.learnAbility('a', ability('second-ultimate')));
    step(match, 20);
    const replacement = offer(match);
    assert.ok(
      send(match, 'a', 'choice', replacement, { choiceId: 'ultimate' }),
    );
    assert.equal(match.view('a').equipment.slots.ultimate, 'second-ultimate');
    assert.ok(match.grantProgress('a', 10));
    step(match, 2100);
    const current = offer(match);
    assert.ok(
      send(match, 'a', 'equipment', current, {
        slot: 'ultimate',
        contentId: 'first-ultimate',
      }),
    );
    assert.equal(match.view('a').equipment.slots.ultimate, 'first-ultimate');
    assert.equal(
      match
        .view('a')
        .equipment.learned.find((item) => item.id === 'first-ultimate').readyAt,
      readyAt,
    );
    assert.ok(
      match
        .view('a')
        .equipment.learned.some((item) => item.id === 'second-ultimate'),
    );
  } finally {
    match.dispose();
  }
});

test('module projections respect ownership and do not change collision geometry', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const match = setup(fixtureRegistry(), world);
  try {
    const self = () => match.view('a').players.find((p) => p.id === 'a');
    const other = match.view('b').players.find((p) => p.id === 'b');
    const bodies = world.bodies.getAll();
    const a = bodies.find(
      (body) =>
        body.isDynamic() &&
        Math.hypot(
          body.translation().x - self().position.x,
          body.translation().z - self().position.z,
        ) < 0.01,
    );
    const b = bodies.find(
      (body) =>
        body.isDynamic() &&
        Math.hypot(
          body.translation().x - other.position.x,
          body.translation().z - other.position.z,
        ) < 0.01,
    );
    assert.ok(a && b);
    let point;
    for (let x = -8; x <= 8 && !point; x += 2)
      for (let z = -8; z <= 8 && !point; z += 2)
        if (arenaPointClear(createArena(42).obstacles, { x, z }, 4))
          point = { x, z };
    assert.ok(point);
    a.setTranslation({ x: point.x, y: 0.25, z: point.z }, true);
    b.setTranslation({ x: point.x + 3, y: 0.25, z: point.z }, true);
    assert.ok(
      match.setModifiers('a', [
        { id: 'size', stat: 'size', add: 100, multiplier: 1 },
      ]),
    );
    step(match, 100);
    const radius = self().radius;
    const initialModules = self().modules;
    assert.equal(radius, 1);
    assert.ok(match.grantUpgrade('a', 'muscular-tissue', 'common', 1));
    step(match, 20);
    assert.deepEqual(self().modules, initialModules);
    const specialization = offer(match);
    assert.ok(
      send(match, 'a', 'choice', specialization, { choiceId: 'fixture-fork' }),
    );
    assert.ok(self().modules.some((module) => module.kind === 'crest'));
    assert.ok(
      !match
        .view('b')
        .players.find((p) => p.id === 'a')
        .modules.some((module) => module.kind === 'crest'),
    );
    assert.equal(self().radius, radius);
    assert.ok(match.grantUpgrade('a', 'arms', 'branching', 1));
    assert.ok(
      self().modules.some(
        (module) => module.kind === 'arms' && module.rank === 1,
      ),
    );
    assert.equal(self().radius, radius);
    assert.ok(
      match.setModifiers('a', [
        { id: 'size', stat: 'size', add: -50, multiplier: 1 },
      ]),
    );
    step(match, 100);
    assert.equal(self().radius, 0.25);
    assert.ok(self().modules.some((module) => module.kind === 'arms'));
    assert.ok(self().modules.some((module) => module.kind === 'crest'));
    assert.ok(match.setPlayerVisibility('b', 'a', false));
    assert.equal(
      match.view('b').players.some((p) => p.id === 'a'),
      false,
    );
  } finally {
    match.dispose();
  }
});

test('attack and hit cues follow authoritative combat events', () => {
  const match = setup();
  try {
    const self = (id) =>
      match.view(id).players.find((player) => player.id === id);
    assert.ok(match.grantUpgrade('a', 'body-slam', 'rare', 1));
    assert.equal(
      send(
        match,
        'a',
        'equipment',
        { id: 'invalid', revision: 0 },
        { slot: 'primary', contentId: '-' },
      ),
      false,
    );
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'checkpoint07',
        playerId: 'a',
        sequence: 1,
        x: 0,
        y: 0,
        aim: 0,
        buttons: 1,
      }),
    );
    step(match, 50);
    assert.equal(self('a').attacking, true);
    step(match, 250);
    assert.equal(self('a').attacking, false);
    assert.equal(self('b').hit, false);
    const result = match.damageBatch([
      { targetId: 'b', ownerId: 'a', amount: 5, channel: 'direct', depth: 0 },
    ])[0];
    assert.ok(result.hull + result.plating > 0);
    assert.equal(self('b').hit, true);
    step(match, 250);
    assert.equal(self('b').hit, false);
  } finally {
    match.dispose();
  }
});

test('rank and rarity acquisition order yields the same final stats', () => {
  const first = setup();
  const second = setup();
  try {
    assert.ok(first.grantUpgrade('a', 'muscular-tissue', 'common', 1));
    assert.ok(first.grantUpgrade('a', 'muscular-tissue', 'rare', 2));
    assert.ok(second.grantUpgrade('a', 'muscular-tissue', 'rare', 1));
    assert.ok(second.grantUpgrade('a', 'muscular-tissue', 'rare', 2));
    const stats = (match) =>
      match.view('a').players.find((p) => p.id === 'a').stats;
    assert.deepEqual(stats(first), stats(second));
  } finally {
    first.dispose();
    second.dispose();
  }
});

test('displayed specialization times out once without granting another window', () => {
  const match = setup(fixtureRegistry());
  try {
    assert.ok(match.grantUpgrade('a', 'muscular-tissue', 'common', 1));
    step(match, 20);
    const current = offer(match);
    match.markSelectionDisplayed('a', current.id, current.revision);
    step(match, current.deadline - match.view('a').time);
    assert.equal(match.view('a').progression.currency, 10);
    assert.equal(
      send(match, 'a', 'choice', current, { choiceId: 'skip' }),
      false,
    );
    step(match, 2100);
    assert.equal(match.view('a').progression.currency, 10);
    assert.equal(match.view('a').offer, null);
  } finally {
    match.dispose();
  }
});

test('healing growth counts actual healing rather than overheal', () => {
  const match = setup();
  try {
    assert.ok(
      match.configureRuntimeEffect('a', {
        kind: 'healing-growth',
        id: 'healing-fixture',
        healingRequired: 10,
        healthPerThreshold: 2,
      }),
    );
    const maximum = () =>
      match.view('a').players.find((p) => p.id === 'a').stats.maximumHealth;
    const before = maximum();
    assert.equal(match.repairPlayer('a', 100, true).actual, 0);
    assert.equal(maximum(), before);
    match.damagePlayer('a', 10);
    assert.equal(match.repairPlayer('a', 100, true).actual, 10);
    assert.equal(maximum(), before + 2);
    match.repairPlayer('a', 100, true);
    assert.equal(maximum(), before + 2);
  } finally {
    match.dispose();
  }
});

test('deferred lethal damage retains attribution and kills once', () => {
  const match = setup();
  try {
    assert.ok(
      match.configureRuntimeEffect('a', {
        kind: 'deferred-damage',
        id: 'delay-fixture',
        fraction: 0.5,
        delayMs: 1000,
      }),
    );
    match.takeDamageLedger();
    match.damageBatch([
      { targetId: 'a', ownerId: 'b', amount: 100, channel: 'direct', depth: 0 },
    ]);
    assert.equal(
      match.view('a').players.find((p) => p.id === 'a').life.kind,
      'alive',
    );
    step(match, 1200);
    assert.equal(
      match.view('a').players.find((p) => p.id === 'a').life.kind,
      'eliminated',
    );
    const deferred = match
      .takeDamageLedger()
      .filter((entry) => entry.event.channel === 'deferred');
    assert.equal(deferred.length, 1);
    assert.equal(deferred[0].event.ownerId, 'b');
    step(match, 1200);
    assert.equal(
      match
        .takeDamageLedger()
        .filter((entry) => entry.event.channel === 'deferred').length,
      0,
    );
  } finally {
    match.dispose();
  }
});

test('deferred damage matures during a disconnected protected choice', () => {
  const match = setup();
  try {
    assert.ok(
      match.configureRuntimeEffect('a', {
        kind: 'deferred-damage',
        id: 'delay',
        fraction: 0.5,
        delayMs: 1000,
      }),
    );
    match.damageBatch([
      { targetId: 'a', ownerId: 'b', amount: 20, channel: 'direct', depth: 0 },
    ]);
    const afterImmediate = match.view('a').players.find((p) => p.id === 'a')
      .health.hull;
    assert.ok(match.grantProgress('a', 10));
    step(match, 20);
    const current = offer(match);
    assert.ok(match.accept({ kind: 'disconnect', playerId: 'a' }));
    step(match, 1200);
    assert.equal(
      match.view('a').players.find((p) => p.id === 'a').health.hull,
      afterImmediate - 10,
    );
    assert.ok(match.accept({ kind: 'connect', playerId: 'a' }));
    assert.equal(offer(match).deadline, current.deadline);
  } finally {
    match.dispose();
  }
});

test('catalogue paths are reachable and rank-sensitive branches exclude symmetrically', () => {
  const registry = createStarterRegistry();
  for (const entry of registry.coverage()) {
    const definition = registry.definition(entry.id);
    if (definition.pool === 'starting') continue;
    const path = registry.findBuildPath(entry.id, 1, new Set(), 50000, true);
    assert.equal(
      path.kind,
      entry.selectable ? 'reachable' : 'hypothetical',
      entry.id,
    );
  }
  const steps = (id, count) =>
    Array.from({ length: count }, (_, i) => ({
      id,
      rank: i + 1,
      specialization: null,
    }));
  for (const [first, other] of [
    ['arms', 'tentacles'],
    ['tentacles', 'arms'],
  ]) {
    assert.equal(
      registry.findBuildPath(other, 1, new Set(), 50000, true, steps(first, 2))
        .kind,
      'reachable',
    );
    assert.equal(
      registry.findBuildPath(other, 1, new Set(), 50000, true, steps(first, 3))
        .kind,
      first === 'tentacles' ? 'unreachable' : 'reachable',
    );
  }
});

test('unbounded rank searches honor the state budget without building huge paths', () => {
  const registry = createStarterRegistry();
  assert.deepEqual(
    registry.findBuildPath(
      'aggressive',
      Number.MAX_SAFE_INTEGER,
      new Set(),
      1000,
      true,
    ),
    { kind: 'limit', explored: 0 },
  );
  const path = registry.findBuildPath(
    'aggressive',
    1000,
    new Set(),
    2000,
    true,
  );
  assert.equal(path.kind, 'hypothetical');
  assert.equal(path.steps.length, 1000);
  assert.equal(path.steps.at(-1).rank, 1000);
});

test('level 24 replaces the ordinary reward with one branch reward', () => {
  const match = setup();
  try {
    assert.ok(match.levelPlayer('a', 23));
    assert.ok(match.grantProgress('a', 125));
    step(match, 20);
    const current = offer(match);
    const branching = createStarterRegistry().eligible(
      new Map(),
      new Set(),
      'branching',
    );
    assert.ok(current.choices.length > 0);
    assert.ok(current.choices.every((id) => branching.includes(id)));
    assert.equal(match.takePendingReward('a'), undefined);
    assert.ok(
      send(match, 'a', 'choice', current, { choiceId: current.choices[0] }),
    );
    step(match, 2100);
    assert.equal(match.view('a').offer, null);
  } finally {
    match.dispose();
  }
});

test('branch rerolls spend their listed cost and reject rarity purchases', () => {
  const match = setup();
  try {
    assert.ok(match.walletTransaction('a', 'branch-funds', 'grant', 100));
    assert.ok(match.levelPlayer('a', 11));
    assert.ok(match.grantProgress('a', 60));
    step(match, 20);
    const current = offer(match);
    assert.equal(current.rarityCost, null);
    assert.equal(send(match, 'a', 'upgrade-rarity', current), false);
    assert.equal(match.view('a').progression.currency, 100);
    assert.ok(send(match, 'a', 'reroll', current));
    const revised = offer(match);
    assert.equal(
      match.view('a').progression.currency,
      100 - current.rerollCost,
    );
    assert.equal(revised.deadline, current.deadline);
    assert.equal(revised.rarityCost, null);
    const eligible = createStarterRegistry().eligible(
      new Map(),
      new Set(),
      'branching',
    );
    assert.ok(revised.choices.every((id) => eligible.includes(id)));
  } finally {
    match.dispose();
  }
});

test('periodic offense does not accumulate while its owner is choosing', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const match = setup(createStarterRegistry(), world);
  try {
    for (const bot of match.view('a').bots)
      match.setBotHostility(bot.id, false);
    const bodies = world.bodies.getAll();
    const body = (id) => {
      const p = match.view(id).players.find((item) => item.id === id).position;
      return bodies.find(
        (b) =>
          b.isDynamic() &&
          Math.hypot(b.translation().x - p.x, b.translation().z - p.z) < 0.01,
      );
    };
    let point;
    for (let x = -16; x <= 16 && !point; x += 2)
      for (let z = -16; z <= 16 && !point; z += 2)
        if (arenaPointClear(createArena(42).obstacles, { x, z }, 5))
          point = { x, z };
    assert.ok(point);
    const a = body('a'),
      b = body('b');
    assert.ok(a && b);
    a.setTranslation({ x: point.x, y: 0.25, z: point.z }, true);
    b.setTranslation({ x: point.x + 3, y: 0.25, z: point.z }, true);
    assert.ok(
      match.configureRuntimeEffect('a', {
        kind: 'periodic-strike',
        id: 'strike-fixture',
        intervalMs: 1000,
        range: 6,
        damage: 2,
      }),
    );
    step(match, 1200);
    assert.ok(
      match
        .takeDamageLedger()
        .some(
          (entry) =>
            entry.event.ownerId === 'a' && entry.event.targetId === 'b',
        ),
    );
    assert.ok(match.grantProgress('a', 10));
    step(match, 20);
    const current = offer(match);
    match.takeDamageLedger();
    step(match, 4000);
    assert.equal(
      match.takeDamageLedger().filter((entry) => entry.event.ownerId === 'a')
        .length,
      0,
    );
    assert.ok(
      send(match, 'a', 'choice', current, { choiceId: current.choices[0] }),
    );
    step(match, 100);
    assert.equal(
      match.takeDamageLedger().filter((entry) => entry.event.ownerId === 'a')
        .length,
      0,
    );
    step(match, 1000);
    assert.ok(
      match
        .takeDamageLedger()
        .some(
          (entry) =>
            entry.event.ownerId === 'a' && entry.event.targetId === 'b',
        ),
    );
  } finally {
    match.dispose();
  }
});

test('hurt boosts expire and kill growth applies once to the credited owner', () => {
  const match = setup();
  try {
    for (const bot of match.view('a').bots)
      match.setBotHostility(bot.id, false);
    assert.ok(
      match.configureRuntimeEffect('a', {
        kind: 'hurt-boost',
        id: 'hurt',
        physical: 4,
        ability: 0,
        durationMs: 1000,
      }),
    );
    assert.ok(
      match.configureRuntimeEffect('a', {
        kind: 'kill-growth',
        id: 'kill',
        stat: 'physical',
        perKill: 2,
      }),
    );
    const physical = () =>
      match.view('a').players.find((p) => p.id === 'a').stats.physical;
    const base = physical();
    match.damageBatch([
      { targetId: 'a', ownerId: 'b', amount: 5, channel: 'direct', depth: 0 },
    ]);
    assert.equal(physical(), base + 4);
    step(match, 1200);
    assert.equal(physical(), base);
    const bot = match.view('a').bots[0];
    match.damageBatch([
      {
        targetId: bot.id,
        ownerId: 'a',
        amount: 10000,
        channel: 'direct',
        depth: 0,
      },
    ]);
    assert.equal(physical(), base + 2);
    match.damageBatch([
      {
        targetId: bot.id,
        ownerId: 'a',
        amount: 10000,
        channel: 'direct',
        depth: 0,
      },
    ]);
    assert.equal(physical(), base + 2);
  } finally {
    match.dispose();
  }
});

test('shelter entry grants progress and its exit boost expires', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const match = setup(createStarterRegistry(), world);
  try {
    const self = match.view('a').players.find((p) => p.id === 'a');
    const body = world.bodies
      .getAll()
      .find(
        (b) =>
          b.isDynamic() &&
          Math.hypot(
            b.translation().x - self.position.x,
            b.translation().z - self.position.z,
          ) < 0.01,
      );
    assert.ok(body);
    const shelter = createArena(42).shelters[0];
    body.setTranslation({ x: shelter.x, y: 0.25, z: shelter.z }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    assert.ok(
      match.configureRuntimeEffect('a', {
        kind: 'shelter-entry-progress',
        id: 'entry',
        progress: 4,
      }),
    );
    assert.ok(
      match.configureRuntimeEffect('a', {
        kind: 'shelter-exit-boost',
        id: 'exit',
        durationMs: 1000,
        damageMultiplier: 2,
      }),
    );
    const view = () => match.view('a');
    const damage = () => view().players.find((p) => p.id === 'a').stats.damage;
    const before = damage();
    assert.ok(
      match.consume({
        kind: 'shelter',
        matchId: 'checkpoint07',
        playerId: 'a',
        sequence: 1,
        targetId: 'shelter-0',
      }),
    );
    assert.equal(view().progression.progress, 4);
    assert.ok(
      match.consume({
        kind: 'shelter',
        matchId: 'checkpoint07',
        playerId: 'a',
        sequence: 2,
        targetId: 'shelter-0',
      }),
    );
    assert.equal(damage(), before * 2);
    step(match, 1200);
    assert.equal(damage(), before);
  } finally {
    match.dispose();
  }
});

test('discovery triggers once per site and player', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const match = setup(createStarterRegistry(), world);
  try {
    const self = match.view('a').players.find((p) => p.id === 'a');
    const body = world.bodies
      .getAll()
      .find(
        (b) =>
          b.isDynamic() &&
          Math.hypot(
            b.translation().x - self.position.x,
            b.translation().z - self.position.z,
          ) < 0.01,
      );
    assert.ok(body);
    const arena = createArena(42);
    const site = createPointsOfInterest(
      arena.poiSockets,
      (p) => terrainAt(arena, p.x, p.z),
      42,
    ).find((p) => p.kind === 'chaos-tree');
    assert.ok(site);
    assert.ok(
      match.configureRuntimeEffect('a', {
        kind: 'discovery-progress',
        id: 'discovery',
        progress: 3,
      }),
    );
    body.setTranslation(
      { x: site.position.x, y: 0.25, z: site.position.z },
      true,
    );
    step(match, 100);
    assert.ok(
      match
        .takeDiscoveries()
        .some((entry) => entry.playerId === 'a' && entry.siteId === site.id),
    );
    const progress = match.view('a').progression.progress;
    assert.ok(progress >= 3);
    step(match, 100);
    assert.equal(match.view('a').progression.progress, progress);
    assert.equal(
      match
        .takeDiscoveries()
        .filter((entry) => entry.playerId === 'a' && entry.siteId === site.id)
        .length,
      0,
    );
  } finally {
    match.dispose();
  }
});

test('phase modifiers are recomputed when day changes to night', () => {
  const match = setup();
  try {
    for (const bot of match.view('a').bots)
      match.setBotHostility(bot.id, false);
    assert.ok(
      match.setModifiers('a', [
        { id: 'durability', stat: 'maximumHealth', add: 10000, multiplier: 1 },
      ]),
    );
    match.repairPlayer('a', 10000, false);
    assert.ok(
      match.setPhaseStatModifiers('a', 'night-fixture', 'night', [
        { id: 'night', stat: 'physical', add: 5, multiplier: 1 },
      ]),
    );
    const physical = () =>
      match.view('a').players.find((p) => p.id === 'a').stats.physical;
    const base = physical();
    step(match, 180050, 100);
    assert.equal(match.view('a').worldClock.phase, 'night');
    assert.equal(
      match.view('a').players.find((p) => p.id === 'a').life.kind,
      'alive',
    );
    assert.equal(physical(), base + 5);
  } finally {
    match.dispose();
  }
});

test('manual follow-ups and contact reflection preserve bounded attribution', () => {
  const match = setup();
  try {
    assert.ok(
      match.configureRuntimeEffect('a', {
        kind: 'attack-followup',
        id: 'followup',
        damage: 3,
        cooldownMs: 1000,
      }),
    );
    assert.ok(
      match.configureRuntimeEffect('b', {
        kind: 'contact-reflection',
        id: 'reflect',
        fraction: 0.5,
      }),
    );
    match.takeDamageLedger();
    match.damageBatch([
      {
        targetId: 'b',
        ownerId: 'a',
        amount: 10,
        channel: 'contact',
        origin: 'manual',
        depth: 0,
      },
    ]);
    const trace = match.takeDamageLedger();
    assert.equal(
      trace.filter(
        (entry) => entry.event.ownerId === 'a' && entry.event.targetId === 'b',
      ).length,
      2,
    );
    assert.equal(
      trace.filter(
        (entry) => entry.event.ownerId === 'b' && entry.event.targetId === 'a',
      ).length,
      1,
    );
    assert.ok(trace.every((entry) => entry.event.depth <= 1));
    match.damageBatch([
      {
        targetId: 'b',
        ownerId: 'a',
        amount: 1,
        channel: 'direct',
        origin: 'manual',
        depth: 0,
      },
    ]);
    assert.equal(
      match.takeDamageLedger().filter((entry) => entry.event.ownerId === 'a')
        .length,
      1,
    );
  } finally {
    match.dispose();
  }
});

test('a dodged hit can trigger a decoy without applying damage', () => {
  const match = setup();
  const random = Math.random;
  try {
    assert.ok(
      match.setModifiers('a', [
        { id: 'dodge', stat: 'dodge', add: 75, multiplier: 1 },
      ]),
    );
    assert.ok(
      match.configureRuntimeEffect('a', {
        kind: 'decoy-on-hurt',
        id: 'decoy',
        cooldownMs: 1000,
        durationMs: 3000,
      }),
    );
    Math.random = () => 0;
    const result = match.damageBatch([
      { targetId: 'a', ownerId: 'b', amount: 10, channel: 'direct', depth: 0 },
    ])[0];
    assert.equal(result.dodged, true);
    assert.equal(result.hull + result.plating, 0);
    step(match, 100);
    assert.ok(
      match
        .view('a')
        .bots.some((bot) => bot.ownerId === 'a' && bot.kind === 'decoy'),
    );
  } finally {
    Math.random = random;
    match.dispose();
  }
});

test('full-health repair pickups grant growth for consumed stages', () => {
  const match = setup();
  try {
    for (const bot of match.view('a').bots)
      match.setBotHostility(bot.id, false);
    assert.ok(
      match.configureRuntimeEffect('a', {
        kind: 'full-repair-growth',
        id: 'pickup-growth',
        healthPerPickup: 2,
      }),
    );
    const self = () => match.view('a').players.find((p) => p.id === 'a');
    const before = self().stats.maximumHealth;
    const level = self().health.level;
    const p = self().position;
    const id = match.spawnResource({
      position: { x: p.x, z: p.z },
      source: 'vegetation',
      rarity: 'common',
      killerId: null,
      ownerId: null,
      killerKind: null,
      repair: true,
    });
    step(match, 3100);
    const stages = match
      .takeCollections()
      .filter((entry) => entry.resourceId === id);
    assert.equal(stages.length, 4);
    const full = stages.filter(
      (entry) => entry.playerId === 'a' && entry.repair.consumedAtFullHealth,
    ).length;
    assert.ok(full > 0);
    assert.equal(
      self().stats.maximumHealth,
      before + full * 2 + self().health.level - level,
    );
  } finally {
    match.dispose();
  }
});

test('movement trails are emitted only while moving and expire', () => {
  const match = setup();
  try {
    for (const bot of match.view('a').bots)
      match.setBotHostility(bot.id, false);
    assert.ok(
      match.configureRuntimeEffect('a', {
        kind: 'slowing-trail',
        id: 'move-trail',
        trigger: 'movement',
        intervalMs: 250,
        durationMs: 500,
        radius: 1,
        slowPercent: 30,
        pursuitRange: 4,
      }),
    );
    step(match, 500);
    assert.equal(match.view('a').trails.length, 0);
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'checkpoint07',
        playerId: 'a',
        sequence: 1,
        x: 1,
        y: 0,
        aim: 0,
        buttons: 0,
      }),
    );
    step(match, 600);
    assert.ok(match.view('a').trails.length > 0);
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'checkpoint07',
        playerId: 'a',
        sequence: 2,
        x: 0,
        y: 0,
        aim: 0,
        buttons: 0,
      }),
    );
    step(match, 1500);
    assert.equal(match.view('a').trails.length, 0);
  } finally {
    match.dispose();
  }
});

test('pursuit trails require a nearby craft moving toward the owner', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const match = setup(createStarterRegistry(), world);
  try {
    for (const bot of match.view('a').bots)
      match.setBotHostility(bot.id, false);
    const bodies = world.bodies.getAll();
    const body = (id) => {
      const p = match
        .view(id)
        .players.find((entry) => entry.id === id).position;
      return bodies.find(
        (item) =>
          item.isDynamic() &&
          Math.hypot(item.translation().x - p.x, item.translation().z - p.z) <
            0.01,
      );
    };
    const a = body('a'),
      b = body('b');
    assert.ok(a && b);
    let point;
    for (let x = -8; x <= 8 && !point; x += 2)
      for (let z = -8; z <= 8 && !point; z += 2)
        if (arenaPointClear(createArena(42).obstacles, { x, z }, 4))
          point = { x, z };
    assert.ok(point);
    a.setTranslation({ x: point.x, y: 0.25, z: point.z }, true);
    b.setTranslation({ x: point.x - 3, y: 0.25, z: point.z }, true);
    assert.ok(
      match.setModifiers('b', [
        { id: 'pursuer-speed', stat: 'speed', add: 3, multiplier: 1 },
      ]),
    );
    assert.ok(
      match.configureRuntimeEffect('a', {
        kind: 'slowing-trail',
        id: 'pursuit',
        trigger: 'pursuit',
        intervalMs: 250,
        durationMs: 1000,
        radius: 1,
        slowPercent: 30,
        pursuitRange: 8,
      }),
    );
    let sequence = 1;
    const control = (id, x) =>
      match.consume({
        kind: 'control',
        matchId: 'checkpoint07',
        playerId: id,
        sequence: sequence++,
        x,
        y: 0,
        aim: 0,
        buttons: 0,
      });
    for (let i = 0; i < 4; i++) {
      assert.ok(control('a', 1));
      step(match, 50);
    }
    assert.equal(match.view('a').trails.length, 0);
    for (let i = 0; i < 10; i++) {
      assert.ok(control('a', 1));
      assert.ok(control('b', 1));
      step(match, 50);
    }
    assert.ok(match.view('a').trails.length > 0);
  } finally {
    match.dispose();
  }
});
