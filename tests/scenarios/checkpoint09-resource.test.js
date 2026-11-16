import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

function setup() {
  const { match, world } = createAbilityMatch('checkpoint09-resource');
  for (const bot of match.view('a').bots) match.setBotHostility(bot.id, false);
  return { match, world };
}
function player(match, id = 'a') {
  return match.view(id).players.find((p) => p.id === id);
}
function body(world, position) {
  const found = world.bodies
    .getAll()
    .find(
      (b) =>
        b.isDynamic() &&
        Math.hypot(
          b.translation().x - position.x,
          b.translation().z - position.z,
        ) < 0.01,
    );
  assert.ok(found);
  return found;
}
function move(world, match, id, x, z) {
  const b = body(world, player(match, id).position);
  b.setTranslation({ x, y: 0.25, z }, true);
  b.setLinvel({ x: 0, y: 0, z: 0 }, true);
}
function spawn(
  match,
  source,
  killerId = null,
  ownerId = null,
  killerKind = null,
  repair = false,
) {
  const { x, z } = player(match).position;
  const id = match.spawnResource({
    position: { x, z },
    source,
    rarity: 'common',
    killerId,
    ownerId,
    killerKind,
    repair,
  });
  assert.ok(id);
  return id;
}
function step(match, ms) {
  for (let t = 0; t < ms; t += 50)
    assert.ok(match.advance(Math.min(50, ms - t)));
}
function collectFirst(match, id) {
  step(match, 50);
  const events = match
    .takeCollections()
    .filter((event) => event.resourceId === id);
  assert.equal(events.length, 1);
  return events[0];
}

test('live Saliva enables a learned and equipped Spit projectile that damages another player', () => {
  const { match, world } = setup();
  try {
    assert.equal(match.grantUpgrade('a', 'spit', 'common', 1), false);
    assert.ok(match.grantUpgrade('a', 'saliva', 'common', 1));
    assert.ok(match.grantUpgrade('a', 'spit', 'common', 1));
    step(match, 20);
    const slots = match.view('a').equipment.slots;
    assert.ok(slots.primary === 'spit' || slots.secondary === 'spit');
    move(world, match, 'a', 0, 0);
    move(world, match, 'b', 5, 0);
    step(match, 20);
    match.takeDamageLedger();
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'checkpoint09-resource',
        playerId: 'a',
        sequence: 1,
        x: 0,
        y: 0,
        aim: Math.PI / 2,
        buttons: slots.primary === 'spit' ? 1 : 2,
      }),
    );
    step(match, 1750);
    assert.ok(
      match
        .takeDamageLedger()
        .some(
          ({ event, result }) =>
            event.abilityId === 'spit' &&
            event.targetId === 'b' &&
            result.hull + result.plating > 0,
        ),
    );
  } finally {
    match.dispose();
  }
});

test('diet prerequisites and Vegan exclusions are enforced by live acquisition in both orders', () => {
  const { match } = setup();
  try {
    assert.equal(match.grantUpgrade('a', 'omnivore', 'rare', 1), false);
    for (const diet of ['carnivore', 'herbivore', 'piscivore']) {
      assert.ok(match.grantUpgrade('a', diet, 'rare', 1));
      if (diet !== 'piscivore')
        assert.equal(match.grantUpgrade('a', 'omnivore', 'rare', 1), false);
    }
    assert.ok(match.grantUpgrade('a', 'omnivore', 'rare', 1));
    assert.equal(match.grantUpgrade('a', 'vegan', 'epic', 1), false);
    assert.equal(match.grantUpgrade('b', 'vegan', 'epic', 1), false);
    assert.ok(match.grantUpgrade('b', 'herbivore', 'rare', 1));
    assert.equal(match.grantUpgrade('b', 'vegan', 'epic', 1), false);
    assert.ok(match.grantUpgrade('b', 'herbivore', 'rare', 2));
    assert.ok(match.grantUpgrade('b', 'vegan', 'epic', 1));
    for (const id of ['carnivore', 'piscivore', 'scavenger'])
      assert.equal(match.grantUpgrade('b', id, 'rare', 1), false);
  } finally {
    match.dispose();
  }
});

test('diet and scavenger bonuses preserve source and kill provenance', () => {
  const cases = [
    ['vegetation', null, null, null, 'none', 2.6],
    ['meat', 'a', 'a', 'player', 'own-kill', 2.6],
    ['meat', 'b', 'b', 'player', 'third-party', 3.6],
    ['aquatic', 'ally-bot', 'a', 'ally', 'ally-kill', 3.8],
    ['aquatic', 'b', 'b', 'ally', 'third-party', 3.8],
  ];
  for (const [source, killer, owner, kind, provenance, expected] of cases) {
    const { match } = setup();
    try {
      assert.ok(match.grantUpgrade('a', 'herbivore', 'rare', 1));
      assert.ok(match.grantUpgrade('a', 'carnivore', 'rare', 1));
      assert.ok(match.grantUpgrade('a', 'piscivore', 'rare', 1));
      assert.ok(match.grantUpgrade('a', 'scavenger', 'rare', 1));
      const event = collectFirst(
        match,
        spawn(match, source, killer, owner, kind),
      );
      assert.equal(event.source, source);
      assert.equal(event.killerId, killer);
      assert.equal(event.ownerId, owner);
      assert.equal(event.provenance, provenance);
      assert.ok(
        Math.abs(event.progress - expected) < 1e-8,
        JSON.stringify(event),
      );
    } finally {
      match.dispose();
    }
  }
});

test('Cheek Pouch consumes captured aquatic food after moving out of reach', () => {
  const { match, world } = setup();
  try {
    assert.ok(match.grantUpgrade('a', 'cheek-pouch', 'rare', 1));
    const id = spawn(match, 'aquatic', 'b', 'b', 'player');
    const first = collectFirst(match, id);
    assert.equal(first.provenance, 'third-party');
    move(world, match, 'a', -15, -15);
    step(match, 3100);
    const remaining = match
      .takeCollections()
      .filter((event) => event.resourceId === id);
    assert.deepEqual(
      remaining.map((event) => event.stage),
      [2, 3, 4],
    );
    assert.ok(
      remaining.every(
        (event) =>
          event.source === 'aquatic' &&
          event.killerId === 'b' &&
          event.provenance === 'third-party',
      ),
    );
  } finally {
    match.dispose();
  }
});

test('Vegan consumes vegetation but leaves meat and aquatic food untouched', () => {
  const { match } = setup();
  try {
    assert.ok(match.grantUpgrade('a', 'herbivore', 'rare', 1));
    assert.ok(match.grantUpgrade('a', 'herbivore', 'rare', 2));
    assert.ok(match.grantUpgrade('a', 'vegan', 'epic', 1));
    const ids = ['vegetation', 'meat', 'aquatic'].map((source) =>
      spawn(match, source),
    );
    step(match, 50);
    const events = match.takeCollections();
    assert.ok(
      events.some(
        (event) => event.resourceId === ids[0] && event.source === 'vegetation',
      ),
    );
    assert.ok(
      events.every((event) => !ids.slice(1).includes(event.resourceId)),
    );
  } finally {
    match.dispose();
  }
});

test('Ruminant adds passive progress after its interval, and damage interrupts the next interval', () => {
  const { match } = setup();
  try {
    assert.ok(match.grantUpgrade('a', 'ruminant', 'branching', 1));
    step(match, 9950);
    const before = match.view('a').progression;
    assert.equal(before.level, 1);
    assert.equal(before.progress, 0);
    step(match, 50);
    assert.ok(match.view('a').progression.progress > 0);
    assert.ok(
      match.damageBatch([
        { targetId: 'a', ownerId: 'b', amount: 1, channel: 'direct', depth: 0 },
      ])[0].hull > 0,
    );
    const afterDamage = match.view('a').progression.progress;
    const levelAfterDamage = match.view('a').progression.level;
    step(match, 9950);
    assert.equal(match.view('a').progression.progress, afterDamage);
    step(match, 50);
    assert.ok(
      match.view('a').progression.level > levelAfterDamage ||
        match.view('a').progression.progress > afterDamage,
    );
  } finally {
    match.dispose();
  }
});

test('Cheek Pouch capacity does not carry overflow resources', () => {
  const { match, world } = setup();
  try {
    assert.ok(match.grantUpgrade('a', 'cheek-pouch', 'rare', 1));
    const held = spawn(match, 'aquatic');
    const overflow = spawn(match, 'meat');
    step(match, 50);
    const initial = match.takeCollections();
    assert.ok(initial.some((event) => event.resourceId === held));
    assert.ok(initial.some((event) => event.resourceId === overflow));
    assert.equal(match.view('a').progression.storedSalvage, 1);
    move(world, match, 'a', -15, -15);
    step(match, 3100);
    const later = match.takeCollections();
    assert.deepEqual(
      later
        .filter((event) => event.resourceId === held)
        .map((event) => event.stage),
      [2, 3, 4],
    );
    assert.equal(
      later.filter((event) => event.resourceId === overflow).length,
      0,
    );
  } finally {
    match.dispose();
  }
});

test('Forager converts eligible salvage into repair and reports actual healing', () => {
  const savedRandom = Math.random;
  const { match } = setup();
  try {
    assert.ok(match.grantUpgrade('a', 'forager', 'rare', 1));
    assert.equal(player(match).stats.poisonResistance, 10);
    assert.ok(
      match.damageBatch([
        {
          targetId: 'a',
          ownerId: 'b',
          amount: 0.5,
          channel: 'direct',
          depth: 0,
        },
      ])[0].hull > 0,
    );
    Math.random = () => 0.01;
    const event = collectFirst(match, spawn(match, 'vegetation'));
    assert.ok(event.repair);
    assert.ok(Math.abs(event.repair.attempted - 1.3) < 1e-8);
    assert.ok(Math.abs(event.repair.actual - 0.5) < 1e-8);
    assert.equal(event.repair.consumedAtFullHealth, false);
  } finally {
    Math.random = savedRandom;
    match.dispose();
  }
});

test('queued level rewards and progress retain the full granted XP', () => {
  const { match } = setup();
  try {
    assert.ok(match.grantProgress('a', 2000));
    const progression = match.view('a').progression;
    let rewards = 0;
    while (match.takePendingReward('a')) rewards++;
    assert.equal(
      rewards + match.takeSelections().length + (match.view('a').offer ? 1 : 0),
      progression.level - 1,
    );
    const spent = Array.from(
      { length: progression.level - 1 },
      (_, i) => 10 + i * 5,
    ).reduce((a, b) => a + b, 0);
    assert.equal(progression.progress, 2000 - spent);
  } finally {
    match.dispose();
  }
});

test('Cheek Pouch Storage adds four Stoner charges regardless of acquisition order', () => {
  for (const stonerFirst of [true, false]) {
    const { match } = setup();
    try {
      assert.ok(match.grantUpgrade('a', 'arms', 'branching', 1));
      if (stonerFirst)
        assert.ok(match.grantUpgrade('a', 'stoner', 'common', 1));
      for (let rank = 1; rank <= 3; rank++)
        assert.ok(match.grantUpgrade('a', 'cheek-pouch', 'rare', rank));
      step(match, 20);
      const offer = match.view('a').offer;
      assert.equal(offer.kind, 'specialization');
      assert.ok(offer.choices.includes('cheek-pouch-storage'));
      assert.ok(
        match.consume({
          kind: 'choice',
          matchId: 'checkpoint09-resource',
          playerId: 'a',
          sequence: 1,
          offerId: offer.id,
          revision: offer.revision,
          choiceId: 'cheek-pouch-storage',
        }),
      );
      if (!stonerFirst)
        assert.ok(match.grantUpgrade('a', 'stoner', 'common', 1));
      const stoner = match
        .view('a')
        .equipment.learned.find((item) => item.id === 'stoner');
      assert.equal(stoner.ammunition.capacity, 6);
    } finally {
      match.dispose();
    }
  }
});

test('passive progress continues during a choice while collapse bypasses protection', () => {
  const { match } = setup();
  try {
    assert.ok(match.grantUpgrade('a', 'ruminant', 'branching', 1));
    assert.ok(
      match.setOffer('a', { id: 'protected', revision: 1, choices: ['x'] }),
    );
    assert.equal(
      match.damageBatch([
        {
          targetId: 'a',
          ownerId: 'b',
          amount: 10,
          channel: 'direct',
          depth: 0,
        },
      ])[0].hull,
      0,
    );
    assert.equal(
      match.damageBatch([
        {
          targetId: 'a',
          ownerId: null,
          amount: 10,
          channel: 'boundary',
          depth: 0,
        },
      ])[0].hull,
      10,
    );
    step(match, 10_000);
    assert.ok(
      match.view('a').progression.progress > 0 ||
        match.view('a').progression.level > 1,
    );
  } finally {
    match.dispose();
  }
});

test('resource and diet upgrades apply their rank and rarity stat tables', () => {
  const matrices = [
    [
      'stomach',
      'salvageSpeed',
      100,
      {
        common: [25, 50, 75, 100, 125],
        rare: [28, 55, 85, 112, 140],
        epic: [33, 66, 100, 133, 166],
        legendary: [40, 80, 120, 160, 200],
      },
    ],
    [
      'saliva',
      'salvageSpeed',
      100,
      {
        common: [15, 30, 45, 60, 75],
        rare: [17, 35, 52, 70, 85],
        epic: [20, 40, 60, 80, 100],
        legendary: [23, 45, 70, 95, 120],
      },
    ],
    [
      'forager',
      'repairFoodChance',
      0,
      { rare: [7.5, 15, 22.5], epic: [9, 18, 27], legendary: [11, 22, 33] },
    ],
    [
      'reach',
      'attackArea',
      100,
      {
        common: [15, 30, 45],
        rare: [17, 35, 52],
        epic: [20, 40, 60],
        legendary: [23, 45, 70],
      },
    ],
    [
      'herbivore',
      'vegetationProgress',
      100,
      {
        rare: [30, 50, 70, 90, 110],
        epic: [35, 60, 85, 110, 135],
        legendary: [40, 70, 100, 130, 160],
      },
    ],
    [
      'carnivore',
      'meatProgress',
      100,
      {
        rare: [30, 50, 70, 90, 110],
        epic: [35, 60, 85, 110, 135],
        legendary: [40, 70, 100, 130, 160],
      },
    ],
    [
      'piscivore',
      'fishProgress',
      100,
      {
        rare: [40, 70, 100, 130, 160],
        epic: [50, 85, 120, 155, 190],
        legendary: [60, 100, 140, 180, 220],
      },
    ],
    [
      'scavenger',
      'carrionProgress',
      100,
      {
        rare: [50, 100, 150, 200, 250],
        epic: [66, 133, 200, 266, 333],
        legendary: [75, 150, 225, 300, 375],
      },
    ],
  ];
  for (const [id, stat, baseline, rarities] of matrices) {
    for (const [rarity, values] of Object.entries(rarities)) {
      const { match } = setup();
      try {
        for (const [index, value] of values.entries()) {
          assert.ok(
            match.grantUpgrade('a', id, rarity, index + 1),
            `${id} ${rarity} ${index + 1}`,
          );
          assert.equal(
            player(match).stats[stat],
            baseline + value,
            `${id} ${rarity} ${index + 1}`,
          );
        }
      } finally {
        match.dispose();
      }
    }
  }
});

test('Cheek Pouch Provider charms a nearby wild animal after finishing food', () => {
  const { match, world } = setup();
  const savedRandom = Math.random;
  const savedRandomInt = crypto.randomInt;
  try {
    for (let rank = 1; rank <= 3; rank++)
      assert.ok(match.grantUpgrade('a', 'cheek-pouch', 'rare', rank));
    step(match, 20);
    const offer = match.view('a').offer;
    assert.equal(offer.kind, 'specialization');
    assert.ok(
      match.consume({
        kind: 'choice',
        matchId: 'checkpoint09-resource',
        playerId: 'a',
        sequence: 1,
        offerId: offer.id,
        revision: offer.revision,
        choiceId: 'cheek-pouch-provider',
      }),
    );
    const bot = match
      .view('a')
      .bots.find((item) => !item.elite && !item.ownerId);
    assert.ok(bot);
    const botBody = body(world, bot.position);
    const at = player(match).position;
    botBody.setTranslation({ x: at.x + 2, y: 0.25, z: at.z }, true);
    botBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    Math.random = () => 0;
    crypto.randomInt = () => 0;
    syncBuiltinESMExports();
    const id = spawn(match, 'vegetation');
    for (let t = 0; t < 3200; t += 50) {
      const position = player(match).position;
      botBody.setTranslation(
        { x: position.x + 2, y: 0.25, z: position.z },
        true,
      );
      botBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      step(match, 50);
    }
    assert.equal(
      match.takeCollections().filter((event) => event.resourceId === id).length,
      4,
    );
    assert.equal(match.view('a').lastCharm?.success, true);
    assert.equal(
      match.view('a').bots.find((item) => item.id === bot.id)?.ownerId,
      'a',
    );
  } finally {
    Math.random = savedRandom;
    crypto.randomInt = savedRandomInt;
    syncBuiltinESMExports();
    match.dispose();
  }
});

test('Slow Metabolism applies a reduced threshold to XP already earned', () => {
  const { match } = setup();
  try {
    assert.ok(match.grantProgress('a', 9));
    assert.ok(match.grantUpgrade('a', 'slow-metabolism', 'epic', 1));
    const progress = match.view('a').progression;
    assert.equal(progress.level, 2);
    assert.equal(progress.progress, 0.5);
    assert.equal(player(match).stats.speed, 4.5);
  } finally {
    match.dispose();
  }
});

test('resource secondary effects and gated diet bonuses match every rank and rarity', () => {
  const cases = [
    {
      id: 'saliva',
      stat: 'regeneration',
      rows: {
        common: [1, 2, 3, 4, 5],
        rare: [1.2, 2.5, 3.7, 5, 6.2],
        epic: [1.4, 3, 4.5, 6, 7.5],
        legendary: [1.7, 3.5, 5.2, 7, 9],
      },
    },
    {
      id: 'forager',
      stat: 'poisonResistance',
      rows: { rare: [10, 20, 30], epic: [12, 25, 37], legendary: [15, 35, 50] },
    },
    {
      id: 'slow-metabolism',
      stat: 'progressRequirement',
      base: 100,
      sign: -1,
      rows: { epic: [15, 20, 25, 30, 37], legendary: [20, 27, 33, 40, 50] },
    },
    {
      id: 'omnivore',
      stat: 'vegetationProgress',
      base: 130,
      prerequisites: [
        ['carnivore', 1],
        ['herbivore', 1],
        ['piscivore', 1],
      ],
      rows: {
        rare: [40, 80, 120],
        epic: [50, 100, 150],
        legendary: [60, 120, 180],
      },
    },
    {
      id: 'vegan',
      stat: 'vegetationProgress',
      base: 150,
      prerequisites: [['herbivore', 2]],
      rows: { epic: [75, 150, 225], legendary: [100, 200, 300] },
    },
  ];
  for (const item of cases) {
    for (const [rarity, values] of Object.entries(item.rows)) {
      const { match } = setup();
      try {
        for (const [id, ranks] of item.prerequisites ?? [])
          for (let rank = 1; rank <= ranks; rank++)
            assert.ok(match.grantUpgrade('a', id, 'rare', rank));
        for (const [index, value] of values.entries()) {
          assert.ok(match.grantUpgrade('a', item.id, rarity, index + 1));
          const actual = player(match).stats[item.stat];
          const expected = (item.base ?? 0) + value * (item.sign ?? 1);
          assert.ok(
            Math.abs(actual - expected) < 1e-8,
            `${item.id} ${rarity} ${index + 1}: ${actual} != ${expected}`,
          );
        }
      } finally {
        match.dispose();
      }
    }
  }
});

test('Cheek Pouch carries its listed capacity at each rank and rarity', () => {
  const rows = { rare: [1, 2, 3], epic: [2, 3, 4], legendary: [3, 4, 5] };
  for (const [rarity, values] of Object.entries(rows)) {
    for (const [index, capacity] of values.entries()) {
      const { match } = setup();
      try {
        for (let rank = 1; rank <= index + 1; rank++)
          assert.ok(match.grantUpgrade('a', 'cheek-pouch', rarity, rank));
        if (index === 2) {
          step(match, 20);
          const offer = match.view('a').offer;
          assert.ok(
            match.consume({
              kind: 'choice',
              matchId: 'checkpoint09-resource',
              playerId: 'a',
              sequence: 1,
              offerId: offer.id,
              revision: offer.revision,
              choiceId: 'cheek-pouch-storage',
            }),
          );
        }
        for (let n = 0; n < 5; n++) spawn(match, 'vegetation');
        step(match, 50);
        assert.equal(
          match.view('a').progression.storedSalvage,
          capacity,
          `${rarity} rank ${index + 1}`,
        );
      } finally {
        match.dispose();
      }
    }
  }
});

test('bot kills create meat whose provenance survives collection for player and allied killers', () => {
  for (const kind of ['own-kill', 'ally-kill', 'third-party']) {
    const { match, world } = setup();
    try {
      let killer = kind === 'own-kill' ? 'a' : 'b';
      if (kind === 'ally-kill') {
        assert.ok(match.recruitCompanion('a', 'companion', 0));
        killer = match.view('a').bots.find((bot) => bot.ownerId === 'a').id;
      }
      assert.ok(match.grantUpgrade('a', 'scavenger', 'rare', 1));
      const victim = match
        .view('a')
        .bots.find((bot) => !bot.ownerId && !bot.elite);
      assert.ok(victim);
      const victimBody = body(world, victim.position);
      const at = player(match).position;
      victimBody.setTranslation({ x: at.x + 0.8, y: 0.25, z: at.z }, true);
      victimBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      const existing = new Set(
        match.view('a').resources.map((resource) => resource.id),
      );
      assert.ok(
        match.damageBatch([
          {
            targetId: victim.id,
            ownerId: killer,
            amount: 10000,
            channel: 'direct',
            depth: 0,
          },
        ])[0],
      );
      const drop = match
        .view('a')
        .resources.find(
          (resource) =>
            !existing.has(resource.id) && resource.source === 'meat',
        );
      assert.ok(drop, kind);
      const event = collectFirst(match, drop.id);
      assert.equal(event.source, 'meat');
      assert.equal(event.killerId, killer);
      assert.equal(event.ownerId, kind === 'third-party' ? 'b' : 'a');
      assert.equal(event.provenance, kind);
      assert.equal(event.progress, kind === 'own-kill' ? 2 : 3);
    } finally {
      match.dispose();
    }
  }
});

test('Forager reduces corrosion damage immediately without changing boundary damage', () => {
  const { match } = setup();
  try {
    assert.ok(
      match.applyStatus('a', {
        kind: 'corrosion',
        ownerId: 'b',
        magnitude: 10,
        duration: 3000,
      }),
    );
    match.takeDamageLedger();
    step(match, 1000);
    const before = match
      .takeDamageLedger()
      .filter(
        ({ event }) => event.targetId === 'a' && event.channel === 'corrosion',
      );
    assert.equal(before.length, 1);
    assert.equal(before[0].result.hull, 10);
    assert.ok(match.grantUpgrade('a', 'forager', 'rare', 1));
    step(match, 1000);
    const after = match
      .takeDamageLedger()
      .filter(
        ({ event }) => event.targetId === 'a' && event.channel === 'corrosion',
      );
    assert.equal(after.length, 1);
    assert.equal(after[0].result.hull, 9);
    assert.equal(
      match.damageBatch([
        {
          targetId: 'a',
          ownerId: null,
          amount: 10,
          channel: 'boundary',
          depth: 0,
        },
      ])[0].hull,
      10,
    );
  } finally {
    match.dispose();
  }
});

test('Reach extends actual attack distance without extending salvage collection', () => {
  for (const upgraded of [false, true]) {
    const { match, world } = setup();
    try {
      if (upgraded)
        for (let rank = 1; rank <= 3; rank++)
          assert.ok(match.grantUpgrade('a', 'reach', 'legendary', rank));
      move(world, match, 'a', 0, 0);
      move(world, match, 'b', 3, 0);
      step(match, 20);
      const id = match.spawnResource({
        position: { x: 2.5, z: 0 },
        source: 'vegetation',
        rarity: 'common',
        killerId: null,
        ownerId: null,
        killerKind: null,
        repair: false,
      });
      assert.ok(id);
      match.takeDamageLedger();
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint09-resource',
          playerId: 'a',
          sequence: 1,
          x: 0,
          y: 0,
          aim: Math.PI / 2,
          buttons: 1,
        }),
      );
      step(match, 300);
      const landed = match
        .takeDamageLedger()
        .some(
          ({ event, result }) =>
            event.targetId === 'b' &&
            event.abilityId === 'bop' &&
            result.hull > 0,
        );
      assert.equal(landed, upgraded);
      assert.equal(
        match
          .takeCollections()
          .some((event) => event.resourceId === id && event.playerId === 'a'),
        false,
      );
    } finally {
      match.dispose();
    }
  }
});
