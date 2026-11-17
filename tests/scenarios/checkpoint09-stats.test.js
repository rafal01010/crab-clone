import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';
import { createArena } from '../../build-host/shared/arena.js';

const player = (match, id = 'a') =>
  match.view(id).players.find((p) => p.id === id);
const close = (actual, expected, context) =>
  assert.ok(
    Math.abs(actual - expected) < 1e-5,
    `${context}: ${actual} != ${expected}`,
  );
const size = {
  common: [10, 20, 30],
  rare: [12, 25, 37],
  epic: [14, 30, 45],
  legendary: [17, 35, 52],
};
const physical = {
  common: [1, 2, 3],
  rare: [1.2, 2.5, 3.7],
  epic: [1.4, 3, 4.5],
  legendary: [1.7, 3.5, 5.2],
};
const dodge = {
  common: [5, 10, 15, 20, 25],
  rare: [6, 12, 18, 25, 32],
  epic: [7, 15, 22, 30, 38],
  legendary: [8, 17, 26, 35, 45],
};
const penalty = {
  common: [10, 20, 30, 40, 50],
  rare: [12, 25, 37, 50, 62],
  epic: [14, 30, 45, 60, 75],
  legendary: [17, 35, 52, 70, 90],
};
const ability = {
  common: [1, 2, 3, 4, 5],
  rare: [1.2, 2.5, 3.7, 5, 6.2],
  epic: [1.4, 3, 4.5, 6, 7.5],
  legendary: [1.7, 3.5, 5.2, 7, 9],
};
const health = {
  common: [10, 20, 30],
  rare: [12, 25, 37],
  epic: [14, 30, 45],
  legendary: [16, 35, 52],
};
const massSize = {
  common: [7, 15, 22],
  rare: [8, 17, 25],
  epic: [9, 20, 30],
  legendary: [10, 22, 35],
};
const elusiveDodge = {
  common: [8, 16, 25],
  rare: [9, 18, 28],
  epic: [10, 20, 30],
  legendary: [12, 24, 35],
};
const muscle = {
  common: [2, 4, 6, 8, 10],
  rare: [2.3, 4.5, 7, 9.5, 11.5],
  epic: [2.7, 5.5, 8, 11, 13.5],
  legendary: [3.3, 6.6, 10, 13, 16],
};
const smolSize = {
  rare: [10, 20, 30, 40, 50],
  epic: [11, 22, 33, 44, 55],
  legendary: [13, 25, 37, 50, 62],
};
const smolSpeed = {
  rare: [0.1, 0.2, 0.3, 0.4, 0.5],
  epic: [0.12, 0.25, 0.38, 0.5, 0.62],
  legendary: [0.15, 0.3, 0.45, 0.6, 0.75],
};

test('size, physical, dodge and cooldown upgrades match rank and rarity tables', () => {
  const cases = [
    {
      id: 'chonky',
      tables: size,
      expected: (r, i) => ({ size: size[r][i], physical: physical[r][i] }),
    },
    {
      id: 'more-mass',
      tables: massSize,
      expected: (r, i) => ({
        size: massSize[r][i],
        physical: physical[r][i],
        maximumHealth: health[r][i],
      }),
    },
    {
      id: 'elusive',
      tables: elusiveDodge,
      expected: (r, i) => ({ dodge: elusiveDodge[r][i], size: -size[r][i] }),
    },
    {
      id: 'smol',
      tables: smolSpeed,
      expected: (r, i) => ({ speed: smolSpeed[r][i], size: -smolSize[r][i] }),
    },
    {
      id: 'muscular-tissue',
      tables: muscle,
      expected: (r, i) => ({ physical: muscle[r][i] }),
    },
    {
      id: 'agile',
      tables: dodge,
      expected: (r, i) => ({
        dodge: dodge[r][i],
        attackPenalty: -penalty[r][i],
      }),
    },
    {
      id: 'dexterous',
      tables: ability,
      expected: (r, i) => ({ ability: ability[r][i], cooldowns: -dodge[r][i] }),
    },
  ];
  for (const { id, tables, expected } of cases) {
    for (const [rarity, values] of Object.entries(tables)) {
      const { match } = createAbilityMatch('checkpoint09-stats');
      try {
        const initial = { ...player(match).stats };
        values.forEach((_, i) => {
          assert.ok(
            match.grantUpgrade('a', id, rarity, i + 1),
            `${id} ${rarity} ${i + 1}`,
          );
          for (const [stat, delta] of Object.entries(expected(rarity, i)))
            close(
              player(match).stats[stat],
              stat === 'size'
                ? Math.max(40.000001, initial[stat] + delta)
                : stat === 'attackPenalty'
                  ? Math.max(20, initial[stat] + delta)
                  : initial[stat] + delta,
              `${id} ${rarity} ${i + 1} ${stat}`,
            );
        });
      } finally {
        match.dispose();
      }
    }
  }
});

test('Robust uses final size independent of acquisition order without shrinking health below baseline', () => {
  const { match } = createAbilityMatch('checkpoint09-order');
  try {
    for (const [id, order] of [
      ['a', ['robust', 'chonky', 'more-mass']],
      ['b', ['more-mass', 'chonky', 'robust']],
    ])
      for (const upgrade of order)
        assert.ok(
          match.grantUpgrade(
            id,
            upgrade,
            upgrade === 'robust' ? 'legendary' : 'common',
            1,
          ),
        );
    const a = player(match, 'a').stats;
    const b = player(match, 'b').stats;
    for (const stat of ['size', 'physical', 'maximumHealth'])
      close(a[stat], b[stat], stat);
    close(a.size, 117, 'growth size');
    close(a.maximumHealth, (65 + 10) * (1 + 0.17 * 0.75), 'Robust hull');
    assert.ok(match.grantUpgrade('c', 'robust', 'legendary', 1));
    assert.ok(match.grantUpgrade('c', 'elusive', 'common', 1));
    close(player(match, 'c').stats.maximumHealth, 65, 'Robust small hull');
    assert.ok(match.grantUpgrade('c', 'chonky', 'common', 1));
    assert.ok(match.grantUpgrade('d', 'chonky', 'common', 1));
    assert.ok(match.grantUpgrade('d', 'elusive', 'common', 1));
    assert.ok(match.grantUpgrade('d', 'robust', 'legendary', 1));
    for (const stat of ['size', 'physical', 'maximumHealth', 'dodge'])
      close(
        player(match, 'c').stats[stat],
        player(match, 'd').stats[stat],
        `mixed order ${stat}`,
      );
  } finally {
    match.dispose();
  }
});

test('Shifty uses final size below neutral, with bounded dodge', () => {
  const { match } = createAbilityMatch('checkpoint09-shifty');
  try {
    assert.ok(match.grantUpgrade('a', 'shifty', 'legendary', 1));
    assert.ok(match.grantUpgrade('a', 'smol', 'legendary', 1));
    close(player(match).stats.size, 87, 'small size');
    close(player(match).stats.dodge, 6.5, 'small dodge');
    close(player(match).stats.damage, 106.5, 'small damage');
    assert.ok(match.grantUpgrade('a', 'chonky', 'legendary', 1));
    close(player(match).stats.size, 104, 'grown size');
    close(player(match).stats.dodge, 0, 'grown dodge');
    close(player(match).stats.damage, 100, 'grown damage');
    for (let rank = 1; rank <= 5; rank++)
      assert.ok(match.grantUpgrade('b', 'smol', 'legendary', rank));
    for (let rank = 1; rank <= 3; rank++)
      assert.ok(match.grantUpgrade('b', 'elusive', 'legendary', rank));
    assert.ok(match.grantUpgrade('b', 'shifty', 'legendary', 1));
    close(player(match, 'b').stats.size, 40, 'minimum size');
    close(player(match, 'b').stats.dodge, 65, 'bounded size dodge');
    close(player(match, 'b').stats.damage, 130, 'bounded size damage');
  } finally {
    match.dispose();
  }
});

test('authoritative collider and mass grow and shrink with observed size without healing', () => {
  const { match, world } = createAbilityMatch('checkpoint09-geometry');
  try {
    const start = player(match);
    const body = world.bodies
      .getAll()
      .find(
        (b) =>
          b.isDynamic() &&
          Math.hypot(
            b.translation().x - start.position.x,
            b.translation().z - start.position.z,
          ) < 0.01,
      );
    assert.ok(body);
    body.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
    const originalMass = body.mass();
    assert.ok(match.damagePlayer('a', 5, true) > 0);
    const hull = player(match).health.hull;
    assert.ok(match.grantUpgrade('a', 'more-mass', 'legendary', 1));
    assert.ok(match.advance(50));
    close(player(match).radius, 0.55, 'grown collider');
    assert.ok(body.mass() > originalMass);
    const regenerationPerTick = (player(match).stats.regeneration * 0.05) / 10;
    close(
      player(match).health.hull,
      hull + regenerationPerTick,
      'growth only regenerates',
    );
    assert.ok(match.grantUpgrade('a', 'elusive', 'legendary', 1));
    assert.ok(match.advance(50));
    close(player(match).radius, 0.465, 'shrunk collider');
    assert.ok(body.mass() < originalMass);
    close(
      player(match).health.hull,
      hull + regenerationPerTick * 2,
      'shrink only regenerates',
    );
  } finally {
    match.dispose();
  }
});

test('Overwhelm uses current plating on each hit and responds to level refill', () => {
  const { match } = createAbilityMatch('checkpoint09-overwhelm');
  try {
    assert.ok(match.grantUpgrade('a', 'plated', 'common', 1));
    assert.ok(match.grantUpgrade('a', 'overwhelm', 'epic', 1));
    const hit = () =>
      match.damageBatch([
        {
          targetId: 'b',
          ownerId: 'a',
          amount: 1,
          channel: 'contact',
          depth: 0,
        },
      ])[0].hull;
    close(player(match).health.plating, 5, 'full plating');
    close(hit(), 3.5, 'full plating hit');
    match.damagePlayer('a', 2);
    close(player(match).health.plating, 3, 'partial plating');
    close(hit(), 2.5, 'partial plating hit');
    match.damagePlayer('a', 3);
    close(player(match).health.plating, 0, 'empty plating');
    close(hit(), 1, 'empty plating hit');
    assert.ok(match.levelPlayer('a', 2));
    close(player(match).health.plating, 5, 'refilled plating');
    close(hit(), 3.5, 'refilled plating hit');
  } finally {
    match.dispose();
  }
});

test('growth near a wall moves the collider into free space without duplication', () => {
  const { match, world } = createAbilityMatch('checkpoint09-wall');
  try {
    const initial = player(match);
    const body = world.bodies
      .getAll()
      .find(
        (b) =>
          b.isDynamic() &&
          Math.hypot(
            b.translation().x - initial.position.x,
            b.translation().z - initial.position.z,
          ) < 0.01,
      );
    const wall = createArena(42).obstacles[4];
    const left = wall.x - wall.width / 2;
    body.setTranslation({ x: left - 0.51, y: 0.25, z: wall.z }, true);
    const colliderCount = body.numColliders();
    assert.ok(match.grantUpgrade('a', 'more-mass', 'legendary', 1));
    assert.ok(match.advance(50));
    const grown = player(match);
    close(grown.radius, 0.55, 'grown wall collider');
    assert.ok(grown.position.x <= left - grown.radius + 0.001);
    assert.equal(body.numColliders(), colliderCount);
  } finally {
    match.dispose();
  }
});

test('seeded dodge avoids direct hits but never avoids environmental or boundary damage', () => {
  const { match } = createAbilityMatch('checkpoint09-dodge');
  const originalRandom = Math.random;
  try {
    assert.ok(match.grantUpgrade('a', 'elusive', 'common', 1));
    Math.random = () => 0.01;
    const hit = (channel) =>
      match.damageBatch([
        { targetId: 'a', ownerId: 'b', amount: 3, channel, depth: 0 },
      ])[0];
    assert.equal(hit('direct').dodged, true);
    close(hit('environmental').hull, 3, 'environmental damage');
    close(hit('boundary').hull, 3, 'boundary damage');
    Math.random = () => 0.99;
    const undodged = hit('direct');
    assert.equal(undodged.dodged, false);
    close(undodged.hull, 3, 'direct hit above dodge threshold');
  } finally {
    Math.random = originalRandom;
    match.dispose();
  }
});

test('Dexterous reduces a real movement ability cooldown', () => {
  const { match } = createAbilityMatch('checkpoint09-cooldown');
  try {
    assert.ok(match.grantUpgrade('a', 'legs', 'branching', 1));
    assert.ok(match.grantUpgrade('a', 'leap', 'common', 1));
    assert.ok(match.grantUpgrade('a', 'dexterous', 'common', 1));
    assert.ok(match.advance(20));
    assert.equal(match.view('a').equipment.slots.movement, 'leap');
    const control = (buttons) =>
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint09-cooldown',
          playerId: 'a',
          sequence: 2,
          x: 0,
          y: 0,
          aim: Math.PI / 2,
          buttons,
        }),
      );
    control(4);
    assert.ok(match.advance(100));
    const release = match.view('a').time;
    control(0);
    assert.ok(match.advance(50));
    const leap = match
      .view('a')
      .equipment.learned.find((item) => item.id === 'leap');
    close(leap.readyAt - release, 5500 * 0.95, 'Dexterous Leap cooldown');
  } finally {
    match.dispose();
  }
});

test('Muscular Tissue increases physical attacks without increasing ability attacks', () => {
  const damage = (weapon, muscular) => {
    const originalRandom = Math.random;
    Math.random = () => 0.5;
    const { match, world } = createAbilityMatch('checkpoint09-power');
    try {
      if (weapon === 'pincer')
        assert.ok(match.grantUpgrade('a', 'arms', 'branching', 1));
      if (muscular)
        assert.ok(match.grantUpgrade('a', 'muscular-tissue', 'common', 1));
      assert.ok(match.grantUpgrade('a', weapon, 'common', 1));
      assert.ok(match.advance(20));
      const offer = match.view('a').offer;
      if (offer) {
        assert.equal(offer.kind, 'equipment');
        assert.ok(
          match.consume({
            kind: 'choice',
            matchId: 'checkpoint09-power',
            playerId: 'a',
            sequence: 1,
            offerId: offer.id,
            revision: offer.revision,
            choiceId: 'primary',
          }),
        );
      }
      assert.equal(match.view('a').equipment.slots.primary, weapon);
      const body = (id) => {
        const position = player(match, id).position;
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
      const a = body('a');
      const b = body('b');
      a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
      b.setTranslation({ x: 1.8, y: 0.25, z: 0 }, true);
      a.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      assert.ok(match.advance(20));
      match.takeDamageLedger();
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint09-power',
          playerId: 'a',
          sequence: 2,
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
          ({ event }) => event.abilityId === weapon && event.targetId === 'b',
        );
      assert.equal(hits.length, weapon === 'pincer' ? 2 : 1);
      return hits[0].result.hull;
    } finally {
      match.dispose();
      Math.random = originalRandom;
    }
  };
  close(damage('jaws', false), 8.5, 'baseline physical hit');
  close(damage('jaws', true), 10.2, 'muscular physical hit');
  close(damage('pincer', false), 9.6, 'baseline ability hit');
  close(damage('pincer', true), 9.6, 'muscular ability hit');
});

test('Agile reduces movement slowdown while attacking without cancelling stun', () => {
  const distance = (agile, stunned) => {
    const { match, world } = createAbilityMatch('checkpoint09-agile');
    try {
      if (agile)
        for (let rank = 1; rank <= 5; rank++)
          assert.ok(match.grantUpgrade('a', 'agile', 'common', rank));
      assert.ok(match.grantUpgrade('a', 'jaws', 'common', 1));
      const position = player(match).position;
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
      body.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      if (stunned)
        assert.ok(
          match.applyStatus('a', {
            kind: 'stun',
            ownerId: 'b',
            magnitude: 0,
            duration: 1000,
          }),
        );
      for (let i = 0; i < 12; i++) {
        assert.ok(
          match.consume({
            kind: 'control',
            matchId: 'checkpoint09-agile',
            playerId: 'a',
            sequence: i + 1,
            x: 1,
            y: 0,
            aim: Math.PI / 2,
            buttons: 1,
          }),
        );
        assert.ok(match.advance(50));
      }
      return body.translation().x;
    } finally {
      match.dispose();
    }
  };
  const regular = distance(false, false);
  const agile = distance(true, false);
  assert.ok(
    regular > 0 && agile > regular,
    `regular ${regular}, agile ${agile}`,
  );
  close(distance(true, true), 0, 'stunned movement');
});
