import { test } from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';
import { createStarterRegistry } from '../../build-host/server/content/starter.js';

const registry = createStarterRegistry();
function setup(world = new RAPIER.World({ x: 0, y: 0, z: 0 })) {
  const { match } = createAbilityMatch('checkpoint08-specializations', {
    world,
    registry,
  });
  return match;
}
function choose(match, id) {
  assert.ok(match.advance(20));
  const offer = match.view('a').offer;
  assert.equal(offer.kind, 'specialization');
  assert.ok(offer.choices.includes(id));
  assert.ok(
    match.consume({
      kind: 'choice',
      matchId: 'checkpoint08-specializations',
      playerId: 'a',
      sequence: 1,
      offerId: offer.id,
      revision: offer.revision,
      choiceId: id,
    }),
  );
}

test('Vasodilators scales healing from actual Leech damage with salvage speed', () => {
  const run = (salvageBonus) => {
    const match = setup();
    try {
      for (let rank = 1; rank <= 3; rank++)
        assert.ok(match.grantUpgrade('a', 'leech', 'rare', rank));
      choose(match, 'leech-vasodilators');
      assert.ok(
        match.setModifiers('a', [
          {
            id: 'salvage',
            stat: 'salvageSpeed',
            add: salvageBonus,
            multiplier: 1,
          },
        ]),
      );
      match.damageBatch([
        {
          targetId: 'a',
          ownerId: 'b',
          amount: 30,
          channel: 'direct',
          depth: 0,
        },
      ]);
      const hull = () =>
        match.view('a').players.find((p) => p.id === 'a').health.hull;
      const before = hull();
      const hit = match.damageBatch([
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
      assert.equal(hit.hull + hit.plating, 20);
      return hull() - before;
    } finally {
      match.dispose();
    }
  };
  assert.equal(run(0), 2);
  assert.equal(run(100), 4);
});

test('Primal Spur scales its follow-up damage with saved currency', () => {
  const run = (currency) => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const match = setup(world);
    try {
      assert.ok(match.grantUpgrade('a', 'tail', 'common', 1));
      for (let rank = 1; rank <= 3; rank++)
        assert.ok(match.grantUpgrade('a', 'spur', 'rare', rank));
      choose(match, 'spur-primal');
      if (currency)
        assert.ok(match.walletTransaction('a', 'credit', 'grant', currency));
      const body = (id) => {
        const pos = match.view(id).players.find((p) => p.id === id).position;
        return world.bodies
          .getAll()
          .find(
            (b) =>
              b.isDynamic() &&
              Math.hypot(b.translation().x - pos.x, b.translation().z - pos.z) <
                0.01,
          );
      };
      const a = body('a'),
        b = body('b');
      assert.ok(a && b);
      a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
      b.setTranslation({ x: 1.8, y: 0.25, z: 0 }, true);
      assert.ok(match.advance(20));
      match.takeDamageLedger();
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint08-specializations',
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
          ({ event }) =>
            event.ownerId === 'a' &&
            event.targetId === 'b' &&
            event.abilityId === 'spur',
        );
      assert.equal(hits.length, 1);
      return hits[0].result.hull;
    } finally {
      match.dispose();
    }
  };
  const base = run(0);
  assert.ok(base > 0);
  assert.equal(run(100), base * 2);
});

test('Whiplash Tongue scales projectile damage with salvage speed', () => {
  const run = (bonus) => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const match = setup(world);
    try {
      for (let rank = 1; rank <= 3; rank++)
        assert.ok(match.grantUpgrade('a', 'projectile-tongue', 'rare', rank));
      choose(match, 'projectile-tongue-whiplash');
      assert.ok(
        match.setModifiers('a', [
          { id: 'salvage', stat: 'salvageSpeed', add: bonus, multiplier: 1 },
        ]),
      );
      const body = (id) => {
        const pos = match.view(id).players.find((p) => p.id === id).position;
        return world.bodies
          .getAll()
          .find(
            (b) =>
              b.isDynamic() &&
              Math.hypot(b.translation().x - pos.x, b.translation().z - pos.z) <
                0.01,
          );
      };
      const a = body('a'),
        b = body('b');
      assert.ok(a && b);
      a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
      b.setTranslation({ x: 5, y: 0.25, z: 0 }, true);
      assert.ok(match.advance(20));
      match.takeDamageLedger();
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint08-specializations',
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
          ({ event }) =>
            event.abilityId === 'projectile-tongue' && event.targetId === 'b',
        );
      assert.equal(hits.length, 1);
      return hits[0].result.hull;
    } finally {
      match.dispose();
    }
  };
  const base = run(0);
  assert.ok(base > 0);
  assert.equal(run(100), base * 2);
});

function leapBuild(specialization) {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const match = setup(world);
  assert.ok(match.grantUpgrade('a', 'legs', 'branching', 1));
  assert.ok(match.grantUpgrade('a', 'leap', 'common', 1));
  assert.ok(match.advance(20));
  let offer = match.view('a').offer;
  assert.equal(offer.kind, 'equipment');
  assert.ok(
    match.consume({
      kind: 'choice',
      matchId: 'checkpoint08-specializations',
      playerId: 'a',
      sequence: 1,
      offerId: offer.id,
      revision: offer.revision,
      choiceId: 'movement',
    }),
  );
  for (let rank = 2; rank <= 3; rank++)
    assert.ok(match.grantUpgrade('a', 'leap', 'common', rank));
  for (let i = 0; i < 21; i++) assert.ok(match.advance(100));
  offer = match.view('a').offer;
  assert.equal(offer.kind, 'specialization');
  assert.ok(
    match.consume({
      kind: 'choice',
      matchId: 'checkpoint08-specializations',
      playerId: 'a',
      sequence: 2,
      offerId: offer.id,
      revision: offer.revision,
      choiceId: specialization,
    }),
  );
  const body = (id) => {
    const pos = match.view(id).players.find((p) => p.id === id).position;
    return world.bodies
      .getAll()
      .find(
        (b) =>
          b.isDynamic() &&
          Math.hypot(b.translation().x - pos.x, b.translation().z - pos.z) <
            0.01,
      );
  };
  let sequence = 2;
  const control = (buttons) =>
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'checkpoint08-specializations',
        playerId: 'a',
        sequence: ++sequence,
        x: 0,
        y: 0,
        aim: Math.PI / 2,
        buttons,
      }),
    );
  const leap = () => {
    control(4);
    assert.ok(match.advance(100));
    control(0);
    assert.ok(match.advance(50));
  };
  return { match, body, leap };
}

test('Bouncy Leap allows one repeat before its normal cooldown', () => {
  const { match, body, leap } = leapBuild('leap-bouncy');
  try {
    const a = body('a');
    assert.ok(a);
    a.setTranslation({ x: -15, y: 0.25, z: 0 }, true);
    assert.ok(match.advance(20));
    leap();
    const first = a.translation().x;
    for (let i = 0; i < 5; i++) assert.ok(match.advance(100));
    leap();
    const second = a.translation().x;
    for (let i = 0; i < 5; i++) assert.ok(match.advance(100));
    leap();
    const third = a.translation().x;
    assert.ok(first > -10);
    assert.ok(second - first > 5, `positions ${first} ${second} ${third}`);
    assert.ok(third - second < 0.1);
  } finally {
    match.dispose();
  }
});

test('Heavy Leap damages a nearby target on landing', () => {
  const { match, body, leap } = leapBuild('leap-heavy');
  try {
    const a = body('a'),
      b = body('b');
    assert.ok(a && b);
    a.setTranslation({ x: -10, y: 0.25, z: 0 }, true);
    b.setTranslation({ x: -3, y: 0.25, z: 1 }, true);
    assert.ok(match.advance(20));
    match.takeDamageLedger();
    leap();
    const hits = match
      .takeDamageLedger()
      .filter(({ event }) => event.ownerId === 'a' && event.targetId === 'b');
    assert.equal(hits.length, 1);
    assert.ok(hits[0].result.hull > 0);
  } finally {
    match.dispose();
  }
});

test('Sharp Beak bypasses plating while Long Beak does not', () => {
  const run = (specialization) => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const match = setup(world);
    try {
      for (let rank = 1; rank <= 3; rank++)
        assert.ok(match.grantUpgrade('a', 'beak', 'common', rank));
      choose(match, specialization);
      assert.ok(match.grantUpgrade('b', 'plated', 'common', 1));
      const body = (id) => {
        const pos = match.view(id).players.find((p) => p.id === id).position;
        return world.bodies
          .getAll()
          .find(
            (b) =>
              b.isDynamic() &&
              Math.hypot(b.translation().x - pos.x, b.translation().z - pos.z) <
                0.01,
          );
      };
      const a = body('a'),
        b = body('b');
      assert.ok(a && b);
      a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
      b.setTranslation({ x: 1.8, y: 0.25, z: 0 }, true);
      assert.ok(match.advance(20));
      match.takeDamageLedger();
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint08-specializations',
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
          ({ event }) =>
            event.ownerId === 'a' &&
            event.targetId === 'b' &&
            event.abilityId === 'beak',
        );
      assert.equal(hits.length, 1);
      return hits[0].result;
    } finally {
      match.dispose();
    }
  };
  const sharp = run('beak-sharp');
  const long = run('beak-long');
  assert.equal(sharp.plating, 0);
  assert.ok(sharp.hull > 0);
  assert.ok(long.plating > 0);
});

test('Neck Bite halves Jaws damage and Stalker gains damage at night', () => {
  const run = (specialization, night = false) => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const match = setup(world);
    try {
      for (let rank = 1; rank <= 3; rank++)
        assert.ok(match.grantUpgrade('a', 'jaws', 'common', rank));
      choose(match, specialization);
      if (night) {
        for (const bot of match.view('a').bots)
          match.setBotHostility(bot.id, false);
        for (const id of ['a', 'b', 'c', 'd']) {
          assert.ok(
            match.setModifiers(id, [
              {
                id: 'durability',
                stat: 'maximumHealth',
                add: 10000,
                multiplier: 1,
              },
            ]),
          );
          match.repairPlayer(id, 10000, false);
        }
        for (let i = 0; i < 1800; i++) assert.ok(match.advance(100));
        assert.equal(match.view('a').worldClock.phase, 'night');
      }
      const body = (id) => {
        const pos = match.view(id).players.find((p) => p.id === id).position;
        return world.bodies
          .getAll()
          .find(
            (b) =>
              b.isDynamic() &&
              Math.hypot(b.translation().x - pos.x, b.translation().z - pos.z) <
                0.01,
          );
      };
      const a = body('a'),
        b = body('b');
      assert.ok(a && b);
      a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
      b.setTranslation({ x: 1.8, y: 0.25, z: 0 }, true);
      assert.ok(match.advance(20));
      match.takeDamageLedger();
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint08-specializations',
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
          ({ event }) =>
            event.ownerId === 'a' &&
            event.targetId === 'b' &&
            event.abilityId === 'jaws',
        );
      assert.equal(hits.length, 1);
      return hits[0].result.hull;
    } finally {
      match.dispose();
    }
  };
  const normal = run('jaws-stalker');
  assert.ok(normal > 0);
  assert.equal(run('jaws-neck-bite'), normal / 2);
  assert.equal(run('jaws-stalker', true), normal * 1.5);
});

test('Long Beak opens an unoccupied shelter and releases food once', async () => {
  const { createArena } = await import('../../build-host/shared/arena.js');
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const match = setup(world);
  try {
    for (let rank = 1; rank <= 3; rank++)
      assert.ok(match.grantUpgrade('a', 'beak', 'common', rank));
    choose(match, 'beak-long');
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
    const shelter = createArena(42).shelters[0];
    body.setTranslation({ x: shelter.x - 1.5, y: 0.25, z: shelter.z }, true);
    assert.ok(match.advance(20));
    const before = new Set(match.view('a').resources.map((r) => r.id));
    const attack = (seq) => {
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint08-specializations',
          playerId: 'a',
          sequence: seq,
          x: 0,
          y: 0,
          aim: Math.PI / 2,
          buttons: 1,
        }),
      );
      for (let i = 0; i < 10; i++) assert.ok(match.advance(100));
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint08-specializations',
          playerId: 'a',
          sequence: seq + 1,
          x: 0,
          y: 0,
          aim: Math.PI / 2,
          buttons: 0,
        }),
      );
      assert.ok(match.advance(100));
    };
    attack(2);
    const generated = () =>
      match
        .view('a')
        .resources.filter(
          (r) =>
            !before.has(r.id) &&
            r.source === 'vegetation' &&
            Math.hypot(r.position.x - shelter.x, r.position.z - shelter.z) <
              0.1,
        );
    assert.equal(generated().length, 1);
    attack(4);
    assert.equal(generated().length, 1);
  } finally {
    match.dispose();
  }
});

test('Thrower increases Stoner projectile damage by 75 percent', () => {
  const run = (specialization) => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const match = setup(world);
    try {
      assert.ok(match.grantUpgrade('a', 'tail', 'common', 1));
      for (let rank = 1; rank <= 3; rank++)
        assert.ok(match.grantUpgrade('a', 'prehensile-tail', 'rare', rank));
      choose(match, specialization);
      assert.ok(match.grantUpgrade('a', 'stoner', 'common', 1));
      const body = (id) => {
        const pos = match.view(id).players.find((p) => p.id === id).position;
        return world.bodies
          .getAll()
          .find(
            (b) =>
              b.isDynamic() &&
              Math.hypot(b.translation().x - pos.x, b.translation().z - pos.z) <
                0.01,
          );
      };
      const a = body('a'),
        b = body('b');
      assert.ok(a && b);
      a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
      b.setTranslation({ x: 5, y: 0.25, z: 0 }, true);
      assert.ok(match.advance(20));
      match.takeDamageLedger();
      const control = (sequence, buttons) =>
        assert.ok(
          match.consume({
            kind: 'control',
            matchId: 'checkpoint08-specializations',
            playerId: 'a',
            sequence,
            x: 0,
            y: 0,
            aim: Math.PI / 2,
            buttons,
          }),
        );
      control(2, 1);
      assert.ok(match.advance(50));
      control(3, 0);
      for (let i = 0; i < 15; i++) assert.ok(match.advance(50));
      const hits = match
        .takeDamageLedger()
        .filter(
          ({ event }) =>
            event.ownerId === 'a' &&
            event.targetId === 'b' &&
            event.abilityId === 'stoner',
        );
      assert.equal(hits.length, 1);
      return hits[0].result.hull;
    } finally {
      match.dispose();
    }
  };
  const normal = run('prehensile-tail-arboreal');
  assert.ok(normal > 0);
  assert.ok(Math.abs(run('prehensile-tail-thrower') - normal * 1.75) < 0.001);
});

test('Stoner Signal boosts its charmed ally against the marked target only', () => {
  const match = setup();
  try {
    assert.ok(match.grantUpgrade('a', 'arms', 'branching', 1));
    for (let rank = 1; rank <= 2; rank++)
      assert.ok(match.grantUpgrade('a', 'stoner', 'common', rank));
    choose(match, 'stoner-signal');
    assert.ok(match.recruitCompanion('a', 'ally', 0));
    const ally = match
      .view('a')
      .bots.find((b) => b.ownerId === 'a' && b.kind === 'charmed');
    assert.ok(ally);
    const hit = (targetId) =>
      match.damageBatch([
        { targetId, ownerId: ally.id, amount: 10, channel: 'direct', depth: 0 },
      ])[0].hull;
    assert.equal(hit('b'), 10);
    assert.equal(hit('c'), 10);
    match.damageBatch([
      {
        targetId: 'b',
        ownerId: 'a',
        amount: 1,
        channel: 'direct',
        origin: 'manual',
        abilityId: 'stoner',
        depth: 0,
      },
    ]);
    assert.equal(hit('b'), 15);
    assert.equal(hit('c'), 10);
  } finally {
    match.dispose();
  }
});

test('Spur Marking makes its target available to Stoner Signal allies', () => {
  const match = setup();
  try {
    assert.ok(match.grantUpgrade('a', 'arms', 'branching', 1));
    for (let rank = 1; rank <= 2; rank++)
      assert.ok(match.grantUpgrade('a', 'stoner', 'common', rank));
    choose(match, 'stoner-signal');
    assert.ok(match.grantUpgrade('a', 'tail', 'common', 1));
    for (let rank = 1; rank <= 3; rank++)
      assert.ok(match.grantUpgrade('a', 'spur', 'rare', rank));
    for (let i = 0; i < 21; i++) assert.ok(match.advance(100));
    const offer = match.view('a').offer;
    assert.equal(offer.kind, 'specialization');
    assert.ok(
      match.consume({
        kind: 'choice',
        matchId: 'checkpoint08-specializations',
        playerId: 'a',
        sequence: 2,
        offerId: offer.id,
        revision: offer.revision,
        choiceId: 'spur-marking',
      }),
    );
    assert.ok(match.recruitCompanion('a', 'ally', 0));
    const ally = match
      .view('a')
      .bots.find((b) => b.ownerId === 'a' && b.kind === 'charmed');
    assert.ok(ally);
    const hit = (targetId) =>
      match.damageBatch([
        { targetId, ownerId: ally.id, amount: 10, channel: 'direct', depth: 0 },
      ])[0].hull;
    assert.equal(hit('b'), 10);
    match.damageBatch([
      {
        targetId: 'b',
        ownerId: 'a',
        amount: 1,
        channel: 'contact',
        abilityId: 'spur',
        depth: 1,
      },
    ]);
    assert.equal(hit('b'), 15);
    assert.equal(hit('c'), 10);
  } finally {
    match.dispose();
  }
});

test('Neck Bite yields an extra meat drop for a Jaws kill only', () => {
  const match = setup();
  try {
    for (let rank = 1; rank <= 3; rank++)
      assert.ok(match.grantUpgrade('a', 'jaws', 'common', rank));
    choose(match, 'jaws-neck-bite');
    const bots = match.view('a').bots.filter((bot) => bot.kind === 'wild');
    assert.ok(bots.length >= 2);
    const resources = () =>
      match.view('a').resources.filter((r) => r.source === 'meat').length;
    const start = resources();
    match.damageBatch([
      {
        targetId: bots[0].id,
        ownerId: 'a',
        amount: 10000,
        channel: 'direct',
        origin: 'manual',
        abilityId: 'jaws',
        depth: 0,
      },
    ]);
    assert.equal(resources() - start, 2);
    match.damageBatch([
      {
        targetId: bots[1].id,
        ownerId: 'a',
        amount: 10000,
        channel: 'direct',
        origin: 'manual',
        abilityId: 'body-slam',
        depth: 0,
      },
    ]);
    assert.equal(resources() - start, 3);
  } finally {
    match.dispose();
  }
});

test('Arboreal speed rises near obstacles and decays after leaving', async () => {
  const { createArena } = await import('../../build-host/shared/arena.js');
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const match = setup(world);
  try {
    assert.ok(match.grantUpgrade('a', 'tail', 'common', 1));
    for (let rank = 1; rank <= 3; rank++)
      assert.ok(match.grantUpgrade('a', 'prehensile-tail', 'rare', rank));
    choose(match, 'prehensile-tail-arboreal');
    const pos = match.view('a').players.find((p) => p.id === 'a').position;
    const body = world.bodies
      .getAll()
      .find(
        (b) =>
          b.isDynamic() &&
          Math.hypot(b.translation().x - pos.x, b.translation().z - pos.z) <
            0.01,
      );
    assert.ok(body);
    const obstacles = createArena(42).obstacles.slice(4);
    const count = (p) =>
      obstacles.filter(
        (box) =>
          Math.hypot(
            Math.max(0, Math.abs(p.x - box.x) - box.width / 2),
            Math.max(0, Math.abs(p.z - box.z) - box.depth / 2),
          ) <= 5,
      ).length;
    const far = [];
    for (let x = -20; x <= 20; x += 2)
      for (let z = -20; z <= 20; z += 2)
        if (!count({ x, z })) far.push({ x, z });
    assert.ok(far.length);
    body.setTranslation({ ...far[0], y: 0.25 }, true);
    for (let i = 0; i < 10; i++) assert.ok(match.advance(100));
    const speed = () =>
      match.view('a').players.find((p) => p.id === 'a').stats.speed;
    const base = speed();
    const box = obstacles[0];
    const near = { x: box.x + box.width / 2 + 1, z: box.z };
    body.setTranslation({ ...near, y: 0.25 }, true);
    assert.ok(match.advance(20));
    const boosted = speed();
    assert.ok(
      Math.abs(boosted / base - (1 + Math.min(0.9, count(near) * 0.3))) < 0.001,
    );
    body.setTranslation({ ...far[0], y: 0.25 }, true);
    assert.ok(match.advance(100));
    assert.ok(speed() < boosted && speed() > base);
    for (let i = 0; i < 30; i++) assert.ok(match.advance(100));
    assert.ok(Math.abs(speed() - base) < 0.001);
  } finally {
    match.dispose();
  }
});

test('Sticky Tongue pulls food along its path to its owner', () => {
  const run = (specialization) => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const match = setup(world);
    try {
      for (let rank = 1; rank <= 3; rank++)
        assert.ok(match.grantUpgrade('a', 'projectile-tongue', 'rare', rank));
      choose(match, specialization);
      const pos = match.view('a').players.find((p) => p.id === 'a').position;
      const body = world.bodies
        .getAll()
        .find(
          (b) =>
            b.isDynamic() &&
            Math.hypot(b.translation().x - pos.x, b.translation().z - pos.z) <
              0.01,
        );
      assert.ok(body);
      body.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
      assert.ok(match.advance(20));
      const resource = match.spawnResource({
        position: { x: 3, z: 0 },
        source: 'vegetation',
        rarity: 'common',
        killerId: null,
        ownerId: null,
        killerKind: 'third-party',
        repair: false,
      });
      assert.ok(resource);
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint08-specializations',
          playerId: 'a',
          sequence: 2,
          x: 0,
          y: 0,
          aim: Math.PI / 2,
          buttons: 1,
        }),
      );
      for (let i = 0; i < 8; i++) assert.ok(match.advance(50));
      return match.view('a').resources.find((r) => r.id === resource).position
        .x;
    } finally {
      match.dispose();
    }
  };
  assert.ok(Math.abs(run('projectile-tongue-sticky')) < 0.1);
  assert.equal(run('projectile-tongue-whiplash'), 3);
});

test('Whiplash Tongue reaches a target faster than Sticky Tongue', () => {
  const travelTime = (specialization) => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const match = setup(world);
    try {
      for (let rank = 1; rank <= 3; rank++)
        assert.ok(match.grantUpgrade('a', 'projectile-tongue', 'rare', rank));
      choose(match, specialization);
      const body = (id) => {
        const pos = match.view(id).players.find((p) => p.id === id).position;
        return world.bodies
          .getAll()
          .find(
            (b) =>
              b.isDynamic() &&
              Math.hypot(b.translation().x - pos.x, b.translation().z - pos.z) <
                0.01,
          );
      };
      const a = body('a'),
        b = body('b');
      assert.ok(a && b);
      a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
      b.setTranslation({ x: 5, y: 0.25, z: 0 }, true);
      assert.ok(match.advance(20));
      match.takeDamageLedger();
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint08-specializations',
          playerId: 'a',
          sequence: 2,
          x: 0,
          y: 0,
          aim: Math.PI / 2,
          buttons: 1,
        }),
      );
      for (let elapsed = 50; elapsed <= 1000; elapsed += 50) {
        assert.ok(match.advance(50));
        if (
          match
            .takeDamageLedger()
            .some(
              ({ event }) =>
                event.abilityId === 'projectile-tongue' &&
                event.targetId === 'b',
            )
        )
          return elapsed;
      }
      assert.fail('tongue missed the target');
    } finally {
      match.dispose();
    }
  };
  assert.ok(
    travelTime('projectile-tongue-whiplash') <
      travelTime('projectile-tongue-sticky'),
  );
});
