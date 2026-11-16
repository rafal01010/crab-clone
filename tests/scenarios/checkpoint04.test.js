import { test } from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { Match } from '../../build-host/server/match/match.js';
import {
  createStarterRegistry,
  starterDefinitions,
} from '../../build-host/server/content/starter.js';
import {
  startingDefinitions,
  startingEffectIds,
} from '../../build-host/server/content/starting.js';
import { createRegistry } from '../../build-host/server/content/registry.js';
import { generateOffer } from '../../build-host/server/match/offers.js';
import { SelectionWindow } from '../../build-host/server/match/selection-window.js';
import { applyDamage } from '../../build-host/server/match/combat.js';

await RAPIER.init();
const ids = ['a', 'b', 'c', 'd'];
function setup(
  finale = {},
  content = createStarterRegistry(),
  world = new RAPIER.World({ x: 0, y: 0, z: 0 }),
) {
  const match = new Match('room', world, 42, finale, 0, content);
  for (const id of ids) {
    assert.ok(match.accept({ kind: 'join', playerId: id }));
    match.setReady(id, true);
  }
  assert.ok(match.accept({ kind: 'start' }));
  const revision = match.view('a').loadingRevision;
  for (const id of ids)
    assert.ok(match.accept({ kind: 'loaded', playerId: id, revision }));
  match.advance(3000);
  return match;
}
function step(match, ms) {
  for (let t = 0; t < ms; t += 1000 / 60)
    match.advance(Math.min(1000 / 60, ms - t));
}
function player(match, id, viewer = id) {
  return match.view(viewer).players.find((p) => p.id === id);
}
function hit(targetId, ownerId, amount, channel = 'direct') {
  return { targetId, ownerId, amount, channel, depth: 0 };
}
function intent(id, kind, values) {
  return { matchId: 'room', playerId: id, sequence: 1, kind, ...values };
}

test('offers use eligible pools, prerequisites, exclusions, rank limits and retained rarity', () => {
  const registry = createStarterRegistry();
  const empty = new Map();
  const normal = registry.eligible(empty, new Set(), 'ordinary');
  const branching = registry.eligible(empty, new Set(), 'branching');
  assert.ok(normal.length && branching.length);
  assert.ok(normal.every((id) => !branching.includes(id)));
  assert.ok(!normal.includes('legs'));
  assert.ok(
    !registry
      .eligible(new Map([['muscular-tissue', 5]]), new Set(), 'ordinary')
      .includes('muscular-tissue'),
  );
  const definitions = normal.map((id) => registry.definition(id));
  const result = generateOffer(
    definitions,
    empty,
    new Map([['Predator', 3]]),
    new Map([['muscular-tissue', 'legendary']]),
    () => 0,
  );
  assert.equal(new Set(result.map((choice) => choice.id)).size, result.length);
  const retained = generateOffer(
    [registry.definition('muscular-tissue')],
    empty,
    new Map([['Predator', 3]]),
    new Map([['muscular-tissue', 'legendary']]),
    () => 0,
  ).find((choice) => choice.id === 'muscular-tissue');
  assert.equal(retained?.rarity, 'legendary');
});

test('earned choices reject stale transactions and preserve protection through reroll and disconnect', () => {
  const match = setup();
  try {
    assert.ok(match.launchProjectile('a', 0, 10, 1000, 3, 0));
    assert.ok(match.grantProgress('a', 100));
    step(match, 50);
    const offer = match.view('a').offer;
    assert.ok(offer && offer.choices.length);
    assert.equal(match.view('a').projectiles.length, 0);
    assert.equal(match.canUseOwnedOffense('a'), false);
    const before = player(match, 'a').health.hull;
    assert.equal(match.damageBatch([hit('a', 'b', 10)])[0].hull, 0);
    assert.equal(player(match, 'a').health.hull, before);
    assert.equal(
      match.consume(
        intent('a', 'choice', {
          offerId: offer.id,
          revision: offer.revision + 1,
          choiceId: offer.choices[0],
        }),
      ),
      false,
    );
    assert.ok(match.walletTransaction('a', 'grant', 'grant', 2));
    assert.ok(
      match.consume(
        intent('a', 'reroll', { offerId: offer.id, revision: offer.revision }),
      ),
    );
    const rerolled = match.view('a').offer;
    assert.equal(rerolled.deadline, offer.deadline);
    assert.equal(
      match.consume(
        intent('a', 'reroll', { offerId: offer.id, revision: offer.revision }),
      ),
      false,
    );
    assert.ok(match.accept({ kind: 'disconnect', playerId: 'a' }));
    assert.ok(match.accept({ kind: 'connect', playerId: 'a' }));
    assert.equal(match.view('a').offer.deadline, offer.deadline);
    assert.ok(
      match.consume(
        intent('a', 'choice', {
          offerId: rerolled.id,
          revision: rerolled.revision,
          choiceId: rerolled.choices[0],
        }),
      ),
    );
    assert.equal(
      match.consume(
        intent('a', 'choice', {
          offerId: rerolled.id,
          revision: rerolled.revision,
          choiceId: rerolled.choices[0],
        }),
      ),
      false,
    );
  } finally {
    match.dispose();
  }
});

test('displayed choice expires without resetting deadline and queued prompts expose the player', () => {
  const window = new SelectionWindow(() => 0);
  const prompt = (id) => ({
    kind: 'upgrade',
    id,
    revision: 0,
    options: [
      { id: 'one', label: 'One' },
      { id: 'two', label: 'Two' },
    ],
  });
  window.enqueue(prompt('first'), 0);
  window.enqueue(prompt('second'), 10);
  window.markDisplayed('first', 0);
  window.setConnected(false, 100);
  window.setConnected(true, 9000);
  assert.equal(window.state.deadline, 10000);
  assert.equal(window.choose('first', 0, 'two', 10000), false);
  assert.equal(window.takeOutcomes()[0].optionId, 'one');
  assert.equal(window.state.kind, 'exposed');
  window.advance(12000);
  assert.equal(window.state.kind, 'protected');
  assert.equal(window.state.deadline, 22000);
});

test('dead players remain dead on reconnect and spectator visibility follows survivor', () => {
  const match = setup();
  try {
    assert.ok(match.setPlayerVisibility('b', 'c', false));
    match.damageBatch([hit('a', 'b', 100000)]);
    assert.equal(player(match, 'a').life.kind, 'eliminated');
    assert.equal(match.view('a').spectating, 'b');
    assert.equal(player(match, 'c', 'a'), undefined);
    assert.equal(
      match.authorize(
        intent('a', 'control', { x: 0, y: 0, aim: 0, buttons: 1 }),
      ),
      false,
    );
    assert.ok(match.accept({ kind: 'disconnect', playerId: 'a' }));
    assert.ok(match.accept({ kind: 'connect', playerId: 'a' }));
    assert.equal(player(match, 'a').life.kind, 'eliminated');
    assert.equal(match.repairPlayer('a', 100, false).actual, 0);
  } finally {
    match.dispose();
  }
});

test('collapse bypasses protection, plating and extreme defenses, and resolves a draw once', () => {
  const match = setup({ shrinkStartMs: 100, tinyAtMs: 200, collapseAtMs: 300 });
  try {
    assert.ok(
      match.setModifiers(
        'a',
        ['maximumHealth', 'damageResistance', 'regeneration', 'plating'].map(
          (stat) => ({ id: stat, stat, add: 10000, multiplier: 1 }),
        ),
      ),
    );
    assert.ok(
      match.setOffer('a', { id: 'protected', revision: 0, choices: ['x'] }),
    );
    match.syncWallClock(1000);
    match.syncWallClock(1301);
    match.advance(16);
    const result = match.view('a').result;
    assert.equal(result.outcome.kind, 'draw');
    assert.deepEqual(result.eliminationGroups[0], ids);
    assert.equal(match.view('a').phase, 'finished');
    assert.equal(match.advance(16), false);
    assert.deepEqual(match.view('a').result, result);
  } finally {
    match.dispose();
  }
});

test('meteor resistance is distinct from boundary damage', () => {
  const match = setup();
  try {
    const stats = player(match, 'a').stats;
    const health = { hull: 100, plating: 0, level: 1 };
    const resistant = {
      ...stats,
      cataclysmResistance: 80,
      damageResistance: 0,
    };
    assert.ok(
      Math.abs(
        applyDamage(health, resistant, hit('a', null, 50, 'meteor'), false, 1)
          .hull - 10,
      ) < 1e-9,
    );
    assert.equal(
      applyDamage(health, resistant, hit('a', null, 50, 'boundary'), true, 1)
        .hull,
      50,
    );
  } finally {
    match.dispose();
  }
});

test('nested prerequisites and symmetric exclusions filter selectable definitions', () => {
  const base = starterDefinitions.find(
    (entry) => entry.id === 'muscular-tissue',
  );
  const make = (id, extra = {}) => ({
    ...base,
    id,
    name: id,
    effect: 'muscular-tissue',
    maxRank: 1,
    values: { common: [1] },
    rarities: ['common'],
    aliases: [],
    affinities: [],
    exclusions: [],
    ...extra,
  });
  const defs = [
    make('root', {
      specializations: ['spec'],
      specializationChoices: [
        {
          id: 'spec',
          name: 'Spec',
          triggerRank: 1,
          carcinisationBonus: 1,
          effect: {
            kind: 'stats',
            changes: [{ stat: 'physical', add: 1, multiplier: 1 }],
          },
        },
      ],
    }),
    make('alternative', {
      requirement: {
        kind: 'any',
        conditions: [
          { kind: 'rank', id: 'root', minimum: 1 },
          { kind: 'specialization', id: 'spec' },
        ],
      },
    }),
    make('gated', {
      requirement: {
        kind: 'all',
        conditions: [
          { kind: 'rank', id: 'root', minimum: 1 },
          { kind: 'world', condition: 'night' },
        ],
      },
    }),
    make('left', { exclusions: ['right'] }),
    make('right'),
    make('blocked', { disposition: 'blocked', selectable: false }),
    make('branch', { pool: 'branching' }),
  ];
  const registry = createRegistry(defs, new Set(['muscular-tissue']));
  const eligible = (ranks = [], world = []) =>
    registry.eligible(new Map(ranks), new Set(), 'ordinary', new Set(world));
  assert.ok(!eligible().includes('alternative'));
  assert.ok(eligible([['root', 1]]).includes('alternative'));
  assert.ok(
    registry
      .eligible(new Map(), new Set(['spec']), 'ordinary')
      .includes('alternative'),
  );
  assert.deepEqual(
    generateOffer([], new Map(), new Map(), new Map(), () => 0),
    [],
  );
  assert.ok(!eligible().includes('gated'));
  assert.ok(!eligible([['root', 1]]).includes('gated'));
  assert.ok(eligible([['root', 1]], ['night']).includes('gated'));
  assert.ok(!eligible([['left', 1]]).includes('right'));
  assert.ok(!eligible([['right', 1]]).includes('left'));
  assert.ok(!eligible().includes('blocked'));
  assert.ok(!eligible().includes('branch'));
});

test('personal Carcinisation changes only the chooser against humans and bots', () => {
  const definitions = starterDefinitions.map((entry) =>
    entry.id === 'muscular-tissue'
      ? { ...entry, affinities: [...entry.affinities, 'Carcinisation'] }
      : entry,
  );
  const handlers = new Set([
    ...startingEffectIds,
    ...definitions.map((entry) => entry.effect),
    'basic-dash',
  ]);
  const registry = createRegistry(
    [...startingDefinitions, ...definitions],
    handlers,
  );
  const match = setup({}, registry);
  try {
    assert.ok(match.grantUpgrade('a', 'muscular-tissue', 'common', 1));
    assert.equal(match.view('a').progression.carcinisation, 1);
    assert.ok(match.grantUpgrade('a', 'muscular-tissue', 'common', 2));
    assert.equal(match.view('a').progression.carcinisation, 1);
    assert.equal(match.view('b').progression.carcinisation, 0);
    const botId = match.view('a').bots[0].id;
    const events = [
      hit('a', 'b', 10),
      hit('b', 'a', 10),
      hit('a', botId, 10),
      hit('b', botId, 10),
    ];
    const results = match.damageBatch(events);
    for (const [index, expected] of [11, 10, 11, 10].entries())
      assert.ok(Math.abs(results[index].hull - expected) < 1e-9);
  } finally {
    match.dispose();
  }
});

test('meteor warns inside the boundary before impact and applies catastrophe resistance', () => {
  const match = setup({
    shrinkStartMs: 100,
    tinyAtMs: 100000,
    collapseAtMs: 200000,
    meteorIntervalMs: 500,
    meteorWarningMs: 100,
  });
  const random = Math.random;
  try {
    assert.ok(
      match.setModifiers('a', [
        { id: 'resist', stat: 'cataclysmResistance', add: 80, multiplier: 1 },
      ]),
    );
    const rolls = [8 / 9, 0.625];
    Math.random = () => rolls.shift() ?? 0.5;
    match.syncWallClock(1000);
    match.syncWallClock(1101);
    match.advance(16);
    const state = match.view('a');
    assert.equal(state.meteors.length, 1);
    const meteor = state.meteors[0];
    assert.ok(
      Math.hypot(meteor.position.x, meteor.position.z) <= state.boundary.radius,
    );
    assert.ok(meteor.impactAt > state.boundary.elapsedMs);
    match.syncWallClock(1202);
    match.advance(16);
    const impact = match
      .takeDamageLedger()
      .find(
        (entry) =>
          entry.event.channel === 'meteor' && entry.event.targetId === 'a',
      );
    assert.ok(impact);
    assert.ok(Math.abs(impact.result.hull - 5) < 1e-9);
  } finally {
    Math.random = random;
    match.dispose();
  }
});

test('last human can finish as winner regardless of living bots', () => {
  const match = setup();
  try {
    assert.ok(match.view('a').bots.length);
    match.damageBatch([
      hit('b', 'a', 1000),
      hit('c', 'a', 1000),
      hit('d', 'a', 1000),
    ]);
    match.advance(16);
    assert.equal(match.view('a').phase, 'running');
    assert.ok(match.accept({ kind: 'finish-survivor', playerId: 'a' }));
    assert.deepEqual(match.view('a').result.outcome, {
      kind: 'winner',
      playerId: 'a',
    });
  } finally {
    match.dispose();
  }
});

test('protection stops movement and owned damage while passive experience keeps accruing', () => {
  const match = setup();
  try {
    assert.ok(
      match.setModifiers('a', [
        { id: 'passive', stat: 'passiveProgress', add: 2, multiplier: 1 },
      ]),
    );
    assert.ok(match.grantProgress('a', 10));
    step(match, 20);
    assert.ok(match.view('a').offer);
    const before = player(match, 'a').position;
    const progress = match.view('a').progression.progress;
    const targetHealth = player(match, 'b').health.hull;
    assert.equal(match.damageBatch([hit('b', 'a', 20)])[0].hull, 0);
    step(match, 1500);
    const after = player(match, 'a').position;
    assert.ok(Math.hypot(after.x - before.x, after.z - before.z) < 0.01);
    assert.ok(match.view('a').progression.progress > progress);
    assert.equal(player(match, 'b').health.hull, targetHealth);
  } finally {
    match.dispose();
  }
});

test('bots remain within the shrinking playable territory before collapse', () => {
  const match = setup({
    shrinkStartMs: 100,
    tinyAtMs: 200,
    collapseAtMs: 2000,
  });
  try {
    match.syncWallClock(1000);
    match.syncWallClock(1200);
    match.advance(16);
    const state = match.view('a');
    assert.ok(state.bots.length > 0);
    for (const bot of state.bots)
      assert.ok(
        Math.hypot(bot.position.x, bot.position.z) <= state.boundary.radius,
      );
  } finally {
    match.dispose();
  }
});

test('elimination clears choice and owned status, leaves salvage and rejects interactions', () => {
  const match = setup();
  try {
    assert.ok(
      match.applyStatus('b', {
        kind: 'corrosion',
        ownerId: 'a',
        magnitude: 5,
        duration: 5000,
      }),
    );
    assert.ok(match.grantProgress('a', 10));
    step(match, 20);
    assert.ok(match.view('a').offer);
    const before = match.view('b').resources.length;
    const damage = match.damageBatch([hit('a', null, 10000, 'boundary')])[0];
    assert.ok(damage.hull > 0);
    assert.equal(match.view('a').offer, null);
    assert.equal(match.view('b').resources.length, before + 1);
    assert.ok(
      match.view('b').resources.some((resource) => resource.source === 'meat'),
    );
    assert.ok(
      !player(match, 'b').statuses.some(
        (status) => status.kind === 'corrosion',
      ),
    );
    assert.equal(
      match.authorize(intent('a', 'interaction', { targetId: 'resource-1' })),
      false,
    );
    assert.equal(
      match.consume(
        intent('a', 'choice', { offerId: 'old', revision: 0, choiceId: 'x' }),
      ),
      false,
    );
    assert.equal(match.canUseOwnedOffense('a'), false);
  } finally {
    match.dispose();
  }
});

test('rapid experience cannot chain protected windows or extend the displayed deadline', () => {
  const match = setup();
  try {
    assert.ok(match.grantProgress('a', 1000));
    step(match, 20);
    const offer = match.view('a').offer;
    assert.ok(match.view('a').progression.pending > 0);
    const selected = offer.choices[0];
    assert.ok(
      match.consume(
        intent('a', 'choice', {
          offerId: offer.id,
          revision: offer.revision,
          choiceId: selected,
        }),
      ),
    );
    assert.equal(match.view('a').offer, null);
    assert.notEqual(player(match, 'a').life.activity, 'selecting');
    step(match, 1000);
    assert.equal(match.view('a').offer, null);
    step(match, 1050);
    assert.ok(match.view('a').offer);
    assert.notEqual(match.view('a').offer.id, offer.id);
  } finally {
    match.dispose();
  }
});

test('affinity changes offer weighting without changing the eligible pool', () => {
  const registry = createStarterRegistry();
  const definitions = [
    registry.definition('muscular-tissue'),
    registry.definition('stomach'),
  ];
  const neutral = generateOffer(
    definitions,
    new Map(),
    new Map(),
    new Map(),
    () => 0.49,
  );
  const prey = generateOffer(
    definitions,
    new Map(),
    new Map([['Prey', 3]]),
    new Map(),
    () => 0.49,
  );
  assert.equal(neutral[0].id, 'muscular-tissue');
  assert.equal(prey[0].id, 'stomach');
  assert.deepEqual(
    new Set(neutral.map((item) => item.id)),
    new Set(prey.map((item) => item.id)),
  );
});

test('Carcinisation threshold adds risk only to the owning player', () => {
  const definitions = starterDefinitions.map((entry) =>
    entry.pool === 'ordinary' && entry.selectable
      ? { ...entry, affinities: [...entry.affinities, 'Carcinisation'] }
      : entry,
  );
  const handlers = new Set([
    ...startingEffectIds,
    ...definitions.map((entry) => entry.effect),
    'basic-dash',
  ]);
  const match = setup(
    {},
    createRegistry([...startingDefinitions, ...definitions], handlers),
  );
  try {
    for (const id of ['muscular-tissue', 'stomach', 'plated', 'body-slam'])
      assert.ok(
        match.grantUpgrade('a', id, id === 'body-slam' ? 'rare' : 'common', 1),
      );
    assert.equal(match.view('a').progression.carcinisation, 4);
    assert.ok(
      Math.abs(match.view('a').progression.carcinisationDamage - 0.45) < 1e-9,
    );
    const result = match.damageBatch([hit('a', 'b', 10), hit('b', 'a', 10)]);
    assert.ok(Math.abs(result[0].hull + result[0].plating - 14.5) < 1e-9);
    assert.equal(result[1].hull + result[1].plating, 10);
  } finally {
    match.dispose();
  }
});

test('a lethal meteor resolves simultaneous human deaths as one draw', () => {
  const match = setup({
    shrinkStartMs: 100,
    tinyAtMs: 100000,
    collapseAtMs: 200000,
    meteorIntervalMs: 500,
    meteorWarningMs: 100,
    meteorRadius: 100,
    meteorDamage: 1000,
  });
  try {
    match.syncWallClock(1000);
    match.syncWallClock(1101);
    match.advance(16);
    assert.equal(match.view('a').meteors.length, 1);
    match.syncWallClock(1202);
    match.advance(16);
    const result = match.view('a').result;
    assert.deepEqual(result.outcome, { kind: 'draw' });
    assert.deepEqual(result.eliminationGroups[0], ids);
    assert.equal(
      match.takeDeaths().filter((death) => ids.includes(death.playerId)).length,
      4,
    );
  } finally {
    match.dispose();
  }
});

test('specialization and equipment expiry keep their safe defaults', () => {
  for (const [prompt, expected] of [
    [
      {
        kind: 'specialization',
        id: 'spec',
        revision: 0,
        parentId: 'root',
        options: [{ id: 'option', label: 'Option' }],
      },
      'skipped',
    ],
    [
      {
        kind: 'equipment',
        id: 'equip',
        revision: 0,
        abilityId: 'ability',
        options: [{ id: 'slot', label: 'Slot' }],
      },
      'kept-equipment',
    ],
  ]) {
    const window = new SelectionWindow(() => 0);
    window.enqueue(prompt, 0);
    window.markDisplayed(prompt.id, 0);
    window.advance(10000);
    assert.equal(window.takeOutcomes()[0].kind, expected);
    assert.equal(window.takeOutcomes().length, 0);
  }
});

test('earned level twelve opens only the branching pool', () => {
  const match = setup();
  try {
    assert.ok(match.grantProgress('a', 385));
    for (let level = 2; level < 12; level++)
      assert.equal(match.takePendingReward('a').pool, 'ordinary');
    step(match, 20);
    const offer = match.view('a').offer;
    const branching = createStarterRegistry().eligible(
      new Map(),
      new Set(),
      'branching',
    );
    assert.ok(offer && offer.choices.length);
    assert.ok(offer.choices.every((id) => branching.includes(id)));
    const before = player(match, 'a').stats;
    assert.ok(
      match.consume(
        intent('a', 'choice', {
          offerId: offer.id,
          revision: offer.revision,
          choiceId: offer.choices[0],
        }),
      ),
    );
    assert.notDeepEqual(player(match, 'a').stats, before);
  } finally {
    match.dispose();
  }
});

test('resource rarity is rolled per claimant and does not alter the shared resource', () => {
  const definitions = starterDefinitions.map((entry) =>
    entry.id === 'muscular-tissue'
      ? { ...entry, affinities: [...entry.affinities, 'Carcinisation'] }
      : entry,
  );
  const handlers = new Set([
    ...startingEffectIds,
    ...definitions.map((entry) => entry.effect),
    'basic-dash',
  ]);
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const match = setup(
    {},
    createRegistry([...startingDefinitions, ...definitions], handlers),
    world,
  );
  const random = Math.random;
  try {
    assert.ok(match.grantUpgrade('a', 'muscular-tissue', 'common', 1));
    const a = player(match, 'a').position;
    const b = player(match, 'b').position;
    const bodies = [];
    world.bodies.forEach((body) => bodies.push(body));
    const locate = (point) =>
      bodies.find((body) => {
        const p = body.translation();
        return (
          Math.hypot(p.x - point.x, p.z - point.z) < 0.01 && body.isDynamic()
        );
      });
    const bodyA = locate(a),
      bodyB = locate(b);
    assert.ok(bodyA && bodyB);
    const resourceId = match.spawnResource({
      position: { x: a.x, z: a.z },
      source: 'vegetation',
      rarity: 'common',
      killerId: null,
      ownerId: null,
      killerKind: null,
      repair: false,
    });
    Math.random = () => 0;
    step(match, 20);
    const first = match
      .takeCollections()
      .find((event) => event.resourceId === resourceId);
    assert.equal(first.playerId, 'a');
    assert.equal(first.rarity, 'rare');
    assert.equal(
      match.view('b').resources.find((resource) => resource.id === resourceId)
        .rarity,
      'common',
    );
    bodyA.setTranslation({ x: 25, y: a.y, z: 25 }, true);
    bodyB.setTranslation({ x: a.x, y: b.y, z: a.z }, true);
    step(match, 1100);
    const second = match
      .takeCollections()
      .find((event) => event.resourceId === resourceId);
    assert.equal(second.playerId, 'b');
    assert.equal(second.rarity, 'common');
  } finally {
    Math.random = random;
    match.dispose();
  }
});
