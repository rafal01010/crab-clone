import { test } from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { Match } from '../../build-host/server/match/match.js';
import { createStarterRegistry } from '../../build-host/server/content/starter.js';

await RAPIER.init();
const ids = ['a', 'b', 'c', 'd'];
function setup(world = new RAPIER.World({ x: 0, y: 0, z: 0 })) {
  const match = new Match('room', world, 42);
  for (const id of ids) {
    assert.equal(match.accept({ kind: 'join', playerId: id, name: id }), true);
    match.setReady(id, true);
  }
  assert.equal(match.accept({ kind: 'start' }), true);
  const revision = match.view('a').loadingRevision;
  for (const id of ids)
    assert.equal(
      match.accept({ kind: 'loaded', playerId: id, revision }),
      true,
    );
  match.advance(3000);
  for (const bot of match.view('a').bots) match.setBotHostility(bot.id, false);
  return match;
}
function step(match, ms) {
  for (let n = 0; n < ms; n += 1000 / 60)
    match.advance(Math.min(1000 / 60, ms - n));
}
function player(match, id) {
  return match.view(id).players.find((p) => p.id === id);
}
function damage(targetId, ownerId, amount, channel = 'direct') {
  return { targetId, ownerId, amount, channel, depth: 0 };
}
function modifiers(entries) {
  return Object.entries(entries).map(([stat, add]) => ({
    id: 'scenario',
    stat,
    add,
    multiplier: 1,
  }));
}

test('loading waits for everyone, rejects stale revisions and recovers on failure', () => {
  const m = new Match('room', new RAPIER.World({ x: 0, y: 0, z: 0 }), 42);
  try {
    for (const id of ids) {
      assert.ok(m.accept({ kind: 'join', playerId: id }));
      m.setReady(id, true);
    }
    assert.equal(m.accept({ kind: 'join', playerId: 'e' }), false);
    assert.ok(m.accept({ kind: 'start' }));
    const rev = m.view('a').loadingRevision;
    assert.equal(
      m.accept({ kind: 'loaded', playerId: 'a', revision: rev - 1 }),
      false,
    );
    for (const id of ids.slice(0, 3))
      assert.ok(m.accept({ kind: 'loaded', playerId: id, revision: rev }));
    m.advance(10000);
    assert.equal(m.view('a').phase, 'loading');
    assert.ok(
      m.accept({ kind: 'loading-failed', playerId: 'd', revision: rev }),
    );
    assert.equal(m.view('a').phase, 'lobby');
    assert.equal(m.accept({ kind: 'start' }), false);
    for (const id of ids) m.setReady(id, true);
    assert.ok(m.accept({ kind: 'start' }));
    m.advance(30000);
    assert.equal(m.view('a').phase, 'lobby');
  } finally {
    m.dispose();
  }
});

test('combat, repair, status, reflection, and simultaneous death use authoritative ledgers', () => {
  const m = setup();
  try {
    assert.ok(m.grantUpgrade('a', 'plated', 'common', 1));
    assert.ok(
      m.setModifiers('a', [
        ...modifiers({ damageResistance: 50, poisonResistance: 25 }),
        ...modifiers({ plating: 5 }).map((x) => ({ ...x, id: 'armor' })),
      ]),
    );
    const hit = m.damageBatch([damage('a', 'b', 20)])[0];
    assert.equal(hit.plating, 5);
    assert.equal(hit.hull, 5);
    assert.equal(m.repairPlayer('a', 2, false).actual, 2);
    assert.deepEqual(m.repairPlayer('a', 100, true), {
      attempted: 100,
      actual: 3,
      consumed: true,
      consumedAtFullHealth: false,
    });
    assert.equal(m.repairPlayer('a', 3, true).consumedAtFullHealth, true);
    assert.ok(
      m.applyStatus('a', {
        kind: 'corrosion',
        ownerId: 'b',
        magnitude: 4,
        duration: 2100,
      }),
    );
    assert.ok(
      m.applyStatus('a', {
        kind: 'corrosion',
        ownerId: 'c',
        magnitude: 4,
        duration: 2100,
      }),
    );
    step(m, 1050);
    assert.equal(player(m, 'a').health.hull, 59);
    const ticks = m
      .takeDamageLedger()
      .filter((x) => x.event.channel === 'corrosion');
    assert.equal(ticks.length, 2);
    assert.ok(m.setReflection('a', 1));
    m.damageBatch([damage('a', 'b', 1000), damage('b', 'a', 1000)]);
    assert.deepEqual(
      m
        .takeDeaths()
        .filter((x) => ids.includes(x.playerId))
        .map((x) => x.playerId)
        .sort(),
      ['a', 'b'],
    );
  } finally {
    m.dispose();
  }
});

test('salvage stages, wallet idempotency and XP overflow preserve outcomes', () => {
  const m = setup();
  try {
    const pos = player(m, 'a').position;
    const id = m.spawnResource({
      position: { x: pos.x, z: pos.z },
      source: 'meat',
      rarity: 'rare',
      killerId: 'a',
      ownerId: 'a',
      killerKind: 'player',
      repair: false,
    });
    assert.ok(id);
    step(m, 3100);
    const events = m.takeCollections().filter((e) => e.resourceId === id);
    assert.deepEqual(
      events.map((e) => e.stage),
      [1, 2, 3, 4],
    );
    assert.equal(
      events.reduce((n, e) => n + e.progress, 0),
      30,
    );
    assert.ok(
      events.every((e) => e.playerId === 'a' && e.provenance === 'own-kill'),
    );
    assert.equal(m.walletTransaction('a', 'grant', 'grant', 10).balance, 10);
    assert.equal(m.walletTransaction('a', 'spend', 'spend', 7).balance, 3);
    assert.equal(m.walletTransaction('a', 'spend', 'spend', 7).balance, 3);
    assert.equal(m.walletTransaction('a', 'spend', 'spend', 6), null);
    assert.equal(m.walletTransaction('a', 'over', 'spend', 4).accepted, false);
    assert.ok(m.grantProgress('a', 2000));
    const progression = m.view('a').progression;
    const rewards = [];
    let reward;
    while ((reward = m.takePendingReward('a'))) rewards.push(reward);
    assert.equal(rewards.find((r) => r.level === 12).pool, 'branching');
    assert.equal(rewards.find((r) => r.level === 24).pool, 'branching');
    assert.equal(rewards.length, progression.level - 1);
    const spent = Array.from(
      { length: progression.level - 1 },
      (_, i) => 10 + i * 5,
    ).reduce((a, b) => a + b, 0);
    assert.equal(progression.progress, 2030 - spent);
  } finally {
    m.dispose();
  }
});

test('every selectable starter rank and rarity changes the corresponding authoritative result', () => {
  const registry = createStarterRegistry();
  const values = {
    'muscular-tissue': {
      common: [2, 4, 6, 8, 10],
      rare: [2.3, 4.5, 7, 9.5, 11.5],
      epic: [2.7, 5.5, 8, 11, 13.5],
      legendary: [3.3, 6.6, 10, 13, 16],
    },
    stomach: {
      common: [25, 50, 75, 100, 125],
      rare: [28, 55, 85, 112, 140],
      epic: [33, 66, 100, 133, 166],
      legendary: [40, 80, 120, 160, 200],
    },
    plated: {
      common: [5, 10, 15, 20, 25],
      rare: [6, 12, 18, 24, 30],
      epic: [7, 14, 21, 28, 35],
      legendary: [8, 16, 24, 32, 40],
    },
    arms: { branching: [2, 4, 6] },
    slithery: { branching: [1, 1.75, 2.25] },
    wings: { branching: [1] },
  };
  for (const [id, rarities] of Object.entries(values))
    for (const [rarity, table] of Object.entries(rarities)) {
      const m = setup();
      try {
        for (const [i, value] of table.entries()) {
          assert.ok(registry.describe(id, rarity, i + 1));
          assert.ok(m.grantUpgrade('a', id, rarity, i + 1));
          const p = player(m, 'a');
          if (id === 'muscular-tissue')
            assert.equal(p.stats.physical, 10 + value);
          if (id === 'stomach') assert.equal(p.stats.salvageSpeed, 100 + value);
          if (id === 'plated') {
            assert.equal(p.stats.plating, value);
            assert.equal(p.health.plating, value);
          }
          if (id === 'arms') {
            assert.equal(p.stats.physical, 10 + value);
            assert.equal(p.stats.ability, 10 + value);
            assert.equal(p.stats.salvageReach, 1 + value);
          }
          if (id === 'slithery' || id === 'wings') {
            assert.equal(p.stats.speed, 5 + value);
            assert.equal(
              p.stats.terrainAdaptation,
              id === 'wings' ? 40 : (i + 1) * 20,
            );
            assert.ok(m.terrainMovementFactor('a', 'water') > 0.5);
          }
        }
      } finally {
        m.dispose();
      }
    }
  assert.deepEqual(
    registry.eligible(new Map(), new Set(), 'branching').sort(),
    ['arms', 'slithery', 'wings'],
  );
  assert.ok(
    !registry
      .eligible(new Map([['legs', 1]]), new Set(), 'branching')
      .includes('slithery'),
  );
});

test('Body Slam ranks inflict physical and maximum-hull damage at the declared cooldown', () => {
  const tables = {
    rare: [
      [0.725, 0.825, 0.925, 1.025, 1.125],
      [0.1, 0.11, 0.12, 0.13, 0.14],
    ],
    epic: [
      [0.775, 0.875, 0.975, 1.075, 1.175],
      [0.11, 0.12, 0.13, 0.14, 0.15],
    ],
    legendary: [
      [0.9, 1, 1.1, 1.2, 1.3],
      [0.13, 0.14, 0.15, 0.16, 0.17],
    ],
  };
  for (const [rarity, [physical, health]] of Object.entries(tables)) {
    const m = setup();
    try {
      assert.ok(m.setModifiers('c', modifiers({ maximumHealth: 800 })));
      m.repairPlayer('c', 800, true);
      let sequence = 0;
      const control = (x, y, buttons = 0) =>
        m.consume({
          kind: 'control',
          matchId: 'room',
          playerId: 'a',
          sequence: ++sequence,
          x,
          y,
          aim: 0,
          buttons,
        });
      for (
        let i = 0;
        i < 600 && player(m, 'c').position.z - player(m, 'a').position.z > 1.6;
        i++
      ) {
        control(0, 1);
        m.advance(1000 / 60);
      }
      control(0, 0);
      step(m, 350);
      const distance = Math.abs(
        player(m, 'c').position.z - player(m, 'a').position.z,
      );
      assert.ok(distance < 2, `approached target: ${distance}`);
      for (let rank = 1; rank <= 5; rank++) {
        for (
          let i = 0;
          i < 200 &&
          player(m, 'c').position.z - player(m, 'a').position.z > 1.5;
          i++
        ) {
          control(0, 1);
          m.advance(1000 / 60);
        }
        control(0, 0);
        step(m, 300);
        if (rank === 3) {
          assert.ok(m.setModifiers('a', modifiers({ maximumHealth: 20 })));
          assert.ok(m.grantUpgrade('a', 'muscular-tissue', 'common', 1));
        }
        assert.ok(m.grantUpgrade('a', 'body-slam', rarity, rank));
        m.takeDamageLedger();
        control(0, 0, 1);
        step(m, 230);
        control(0, 0);
        const hits = m
          .takeDamageLedger()
          .filter(
            (e) =>
              e.event.ownerId === 'a' &&
              e.event.targetId === 'c' &&
              e.event.channel === 'contact',
          );
        assert.equal(hits.length, 1, `${rarity} rank ${rank} must hit once`);
        assert.ok(
          Math.abs(
            hits[0].result.hull -
              (physical[rank - 1] * (rank >= 3 ? 12 : 10) +
                health[rank - 1] * (rank >= 3 ? 85 : 65)),
          ) < 1e-8,
        );
        control(0, 0, 1);
        step(m, 300);
        control(0, 0);
        assert.equal(
          m
            .takeDamageLedger()
            .filter((e) => e.event.ownerId === 'a' && e.event.targetId === 'c')
            .length,
          0,
          'cooldown prevents a second hit',
        );
        step(m, 800);
      }
    } finally {
      m.dispose();
    }
  }
});

test('spawn exits and dash move through host physics without crossing arena walls', () => {
  const m = setup();
  try {
    for (const id of ids) {
      const start = player(m, id).position;
      const x = start.x < 0 ? 1 : -1;
      const z = start.z < 0 ? 1 : -1;
      for (let n = 0; n < 90; n++) {
        m.consume({
          kind: 'control',
          matchId: 'room',
          playerId: id,
          sequence: n,
          x: x / Math.SQRT2,
          y: z / Math.SQRT2,
          aim: 0,
          buttons: 0,
        });
        m.advance(1000 / 60);
      }
      const end = player(m, id).position;
      assert.ok(
        Math.hypot(end.x - start.x, end.z - start.z) > 3,
        `${id} can leave spawn: ${JSON.stringify({ start, end, life: player(m, id).life })}`,
      );
    }
  } finally {
    m.dispose();
  }
});

test('dash cooldown, displacement and wall collision remain server authoritative', () => {
  const m = setup();
  try {
    let sequence = 0;
    const send = (x, y, buttons = 0) =>
      m.consume({
        kind: 'control',
        matchId: 'room',
        playerId: 'a',
        sequence: sequence++,
        x,
        y,
        aim: -Math.PI / 2,
        buttons,
      });
    const initial = player(m, 'a').position;
    send(-1, 0, 4);
    step(m, 200);
    send(0, 0);
    step(m, 30);
    const after = player(m, 'a').position;
    const distance = initial.x - after.x;
    assert.ok(distance > 3.8 && distance < 5, `dash displacement ${distance}`);
    const cooldown = m
      .view('a')
      .equipment.learned.find((a) => a.id === 'basic-dash').readyAt;
    send(-1, 0, 4);
    step(m, 250);
    send(0, 0);
    assert.equal(
      m.view('a').equipment.learned.find((a) => a.id === 'basic-dash').readyAt,
      cooldown,
    );
    for (let i = 0; i < 240; i++) {
      send(-1, 0, 0);
      m.advance(1000 / 60);
    }
    send(-1, 0, 4);
    step(m, 250);
    send(0, 0);
    step(m, 100);
    assert.ok(
      player(m, 'a').position.x >= -30,
      `wall stopped craft at ${player(m, 'a').position.x}`,
    );
  } finally {
    m.dispose();
  }
});

test('equipment swaps preserve learned abilities and cooldown, and plating refills once per level', () => {
  const m = setup();
  try {
    assert.ok(m.grantUpgrade('a', 'plated', 'rare', 1));
    m.damagePlayer('a', 4);
    assert.equal(player(m, 'a').health.plating, 2);
    assert.ok(m.levelPlayer('a', 2));
    assert.equal(player(m, 'a').health.plating, 6);
    m.damagePlayer('a', 3);
    assert.equal(player(m, 'a').health.plating, 3);
    assert.equal(m.levelPlayer('a', 2), false);
    assert.equal(player(m, 'a').health.plating, 3);
    assert.ok(m.grantUpgrade('a', 'body-slam', 'rare', 1));
    m.consume({
      kind: 'control',
      matchId: 'room',
      playerId: 'a',
      sequence: 1,
      x: 0,
      y: 0,
      aim: 0,
      buttons: 1,
    });
    step(m, 250);
    const readyAt = m
      .view('a')
      .equipment.learned.find((a) => a.id === 'body-slam').readyAt;
    assert.ok(readyAt > m.view('a').time);
    assert.ok(
      m.setOffer('a', { id: 'swap', revision: 1, choices: ['continue'] }),
    );
    m.consume({
      kind: 'equipment',
      matchId: 'room',
      playerId: 'a',
      sequence: 2,
      slot: 'primary',
      contentId: '-',
    });
    m.consume({
      kind: 'equipment',
      matchId: 'room',
      playerId: 'a',
      sequence: 3,
      slot: 'secondary',
      contentId: 'body-slam',
    });
    assert.equal(m.view('a').equipment.slots.secondary, 'body-slam');
    assert.equal(
      m.view('a').equipment.learned.find((a) => a.id === 'body-slam').readyAt,
      readyAt,
    );
    m.consume({
      kind: 'choice',
      matchId: 'room',
      playerId: 'a',
      sequence: 4,
      offerId: 'swap',
      revision: 1,
      choiceId: 'continue',
    });
    m.consume({
      kind: 'control',
      matchId: 'room',
      playerId: 'a',
      sequence: 5,
      x: 0,
      y: 0,
      aim: 0,
      buttons: 2,
    });
    step(m, 300);
    assert.equal(
      m.view('a').equipment.learned.find((a) => a.id === 'body-slam').readyAt,
      readyAt,
    );
  } finally {
    m.dispose();
  }
});

test('bot kills pay once and resource stages cannot be claimed twice', () => {
  const m = setup();
  try {
    const bot = m.view('a').bots[0];
    const before = m.view('a').resources.length;
    m.damageBatch([damage(bot.id, 'a', 1000), damage(bot.id, 'a', 1000)]);
    assert.equal(m.takeDeaths().filter((d) => d.playerId === bot.id).length, 1);
    assert.equal(m.view('a').progression.currency, bot.tier);
    assert.equal(m.view('a').resources.length, before + 1);
    m.damageBatch([damage(bot.id, 'a', 1000)]);
    assert.equal(m.view('a').progression.currency, bot.tier);
    assert.equal(m.view('a').resources.length, before + 1);
  } finally {
    m.dispose();
  }
});

test('two nearby players contest one resource without duplicating its stages', () => {
  const m = setup();
  try {
    let sequence = 0;
    for (
      let i = 0;
      i < 500 && player(m, 'b').position.x - player(m, 'a').position.x > 1.5;
      i++
    ) {
      m.consume({
        kind: 'control',
        matchId: 'room',
        playerId: 'b',
        sequence: sequence++,
        x: -1,
        y: 0,
        aim: 0,
        buttons: 0,
      });
      m.advance(1000 / 60);
    }
    m.consume({
      kind: 'control',
      matchId: 'room',
      playerId: 'b',
      sequence: sequence++,
      x: 0,
      y: 0,
      aim: 0,
      buttons: 0,
    });
    step(m, 300);
    const a = player(m, 'a').position,
      b = player(m, 'b').position;
    assert.ok(
      Math.hypot(a.x - b.x, a.z - b.z) < 2,
      'both players can reach resource',
    );
    const id = m.spawnResource({
      position: { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
      source: 'meat',
      rarity: 'common',
      killerId: 'b',
      ownerId: 'b',
      killerKind: 'player',
      repair: false,
    });
    step(m, 3100);
    const events = m.takeCollections().filter((e) => e.resourceId === id);
    assert.deepEqual(
      events.map((e) => e.stage),
      [1, 2, 3, 4],
    );
    assert.equal(
      events.reduce((n, e) => n + e.progress, 0),
      10,
    );
    assert.ok(
      events.every(
        (e) =>
          e.provenance === (e.playerId === 'b' ? 'own-kill' : 'third-party'),
      ),
    );
  } finally {
    m.dispose();
  }
});

test('Stomach shortens the actual interval between salvage stages', () => {
  const slow = setup(),
    fast = setup();
  try {
    assert.ok(fast.grantUpgrade('a', 'stomach', 'common', 1));
    const spawn = (m) => {
      const p = player(m, 'a').position;
      return m.spawnResource({
        position: { x: p.x, z: p.z },
        source: 'vegetation',
        rarity: 'common',
        killerId: null,
        ownerId: null,
        killerKind: null,
        repair: false,
      });
    };
    const slowId = spawn(slow),
      fastId = spawn(fast);
    step(slow, 850);
    step(fast, 850);
    assert.equal(
      slow.takeCollections().filter((e) => e.resourceId === slowId).length,
      1,
    );
    assert.equal(
      fast.takeCollections().filter((e) => e.resourceId === fastId).length,
      2,
    );
  } finally {
    slow.dispose();
    fast.dispose();
  }
});

test('a projectile hits one target only once and retains kill credit', () => {
  const m = setup();
  try {
    let sequence = 0;
    for (
      let i = 0;
      i < 500 && player(m, 'c').position.z - player(m, 'a').position.z > 6;
      i++
    ) {
      m.consume({
        kind: 'control',
        matchId: 'room',
        playerId: 'a',
        sequence: sequence++,
        x: 0,
        y: 1,
        aim: 0,
        buttons: 0,
      });
      m.advance(1000 / 60);
    }
    m.consume({
      kind: 'control',
      matchId: 'room',
      playerId: 'a',
      sequence: sequence++,
      x: 0,
      y: 0,
      aim: 0,
      buttons: 0,
    });
    step(m, 350);
    m.takeDamageLedger();
    assert.ok(m.launchProjectile('a', 0, 16, 1800, 100, 0));
    step(m, 600);
    const hits = m
      .takeDamageLedger()
      .filter((e) => e.event.ownerId === 'a' && e.event.targetId === 'c');
    assert.equal(hits.length, 1);
    assert.deepEqual(
      m.takeDeaths().find((d) => d.playerId === 'c'),
      { playerId: 'c', ownerId: 'a' },
    );
  } finally {
    m.dispose();
  }
});

test('joined players defeat a bot, collect its drop and advance through a level', () => {
  const m = setup();
  try {
    const bot = m.view('a').bots[0];
    m.damageBatch([damage(bot.id, 'a', 1000)]);
    const death = m.takeDeaths().find((d) => d.playerId === bot.id);
    assert.deepEqual(death, { playerId: bot.id, ownerId: 'a' });
    assert.equal(m.view('a').progression.currency, bot.tier);
    const drop = m.view('a').resources.find((r) => r.source === 'meat');
    assert.ok(drop);
    let sequence = 0;
    for (let i = 0; i < 800; i++) {
      const p = player(m, 'a').position;
      const dx = drop.position.x - p.x,
        dz = drop.position.z - p.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.7) break;
      m.consume({
        kind: 'control',
        matchId: 'room',
        playerId: 'a',
        sequence: sequence++,
        x: dx / distance,
        y: dz / distance,
        aim: 0,
        buttons: 0,
      });
      m.advance(1000 / 60);
    }
    m.consume({
      kind: 'control',
      matchId: 'room',
      playerId: 'a',
      sequence: sequence++,
      x: 0,
      y: 0,
      aim: 0,
      buttons: 0,
    });
    step(m, 3500);
    const ledger = m.takeCollections().filter((e) => e.resourceId === drop.id);
    assert.deepEqual(
      ledger.map((e) => e.stage),
      [1, 2, 3, 4],
    );
    assert.ok(
      ledger.every((e) => e.playerId === 'a' && e.provenance === 'own-kill'),
    );
    assert.ok(m.view('a').progression.level >= 2);
    assert.deepEqual(m.takePendingReward('a'), { level: 2, pool: 'ordinary' });
  } finally {
    m.dispose();
  }
});

test('boundary damage bypasses protection and passive progress continues during a choice', () => {
  const m = setup();
  try {
    assert.ok(
      m.setModifiers(
        'a',
        modifiers({ plating: 10, damageResistance: 100, passiveProgress: 10 }),
      ),
    );
    assert.ok(
      m.setOffer('a', { id: 'protected', revision: 1, choices: ['x'] }),
    );
    const initial = player(m, 'a').health.hull;
    assert.equal(m.damageBatch([damage('a', 'b', 10)])[0].hull, 0);
    assert.equal(
      m.damageBatch([damage('a', null, 10, 'boundary')])[0].hull,
      10,
    );
    assert.equal(player(m, 'a').health.hull, initial - 10);
    step(m, 1200);
    assert.ok(m.view('a').progression.level >= 2);
  } finally {
    m.dispose();
  }
});

test('mobility upgrades change distance and Arms extends salvage collection reach', () => {
  const baseline = setup(),
    slithery = setup(),
    wings = setup(),
    arms = setup();
  try {
    assert.ok(slithery.grantUpgrade('a', 'slithery', 'branching', 1));
    assert.ok(wings.grantUpgrade('a', 'wings', 'branching', 1));
    assert.ok(arms.grantUpgrade('a', 'arms', 'branching', 1));
    const distance = (m) => {
      const start = player(m, 'a').position;
      for (let i = 0; i < 120; i++) {
        m.consume({
          kind: 'control',
          matchId: 'room',
          playerId: 'a',
          sequence: i,
          x: 1,
          y: 0,
          aim: 0,
          buttons: 0,
        });
        m.advance(1000 / 60);
      }
      return player(m, 'a').position.x - start.x;
    };
    const base = distance(baseline);
    assert.ok(distance(slithery) > base + 1);
    assert.ok(distance(wings) > base + 1);
    const spawn = (m) => {
      const p = player(m, 'a').position;
      return m.spawnResource({
        position: { x: p.x, z: p.z + 2 },
        source: 'vegetation',
        rarity: 'common',
        killerId: null,
        ownerId: null,
        killerKind: null,
        repair: false,
      });
    };
    const baseId = spawn(baseline),
      armsId = spawn(arms);
    step(baseline, 100);
    step(arms, 100);
    assert.equal(
      baseline.takeCollections().filter((e) => e.resourceId === baseId).length,
      0,
    );
    assert.equal(
      arms.takeCollections().filter((e) => e.resourceId === armsId).length,
      1,
    );
  } finally {
    baseline.dispose();
    slithery.dispose();
    wings.dispose();
    arms.dispose();
  }
});

test('repair salvage counts actual hull recovery and full-hull consumption', () => {
  const m = setup();
  try {
    m.damagePlayer('a', 3);
    const p = player(m, 'a').position;
    const id = m.spawnResource({
      position: { x: p.x, z: p.z },
      source: 'vegetation',
      rarity: 'common',
      killerId: null,
      ownerId: null,
      killerKind: null,
      repair: true,
    });
    step(m, 3100);
    const stages = m.takeCollections().filter((e) => e.resourceId === id);
    assert.equal(stages.length, 4);
    assert.ok(
      Math.abs(stages.reduce((n, e) => n + e.repair.actual, 0) - 3) < 1e-8,
    );
    assert.ok(stages.some((e) => e.repair.consumedAtFullHealth));
    assert.equal(player(m, 'a').health.hull, 65);
  } finally {
    m.dispose();
  }
});

test('bots show windup, damage players, and credit a single reward when defeated', () => {
  const m = setup();
  try {
    const bot = m.view('a').bots[0];
    let sequence = 0;
    for (let i = 0; i < 500; i++) {
      const p = player(m, 'a').position;
      const b = m.view('a').bots.find((x) => x.id === bot.id).position;
      const dx = b.x - p.x,
        dz = b.z - p.z,
        d = Math.hypot(dx, dz);
      if (d < 1.5) break;
      m.consume({
        kind: 'control',
        matchId: 'room',
        playerId: 'a',
        sequence: sequence++,
        x: dx / d,
        y: dz / d,
        aim: 0,
        buttons: 0,
      });
      m.advance(1000 / 60);
    }
    m.consume({
      kind: 'control',
      matchId: 'room',
      playerId: 'a',
      sequence: sequence++,
      x: 0,
      y: 0,
      aim: 0,
      buttons: 0,
    });
    assert.ok(m.setBotHostility(bot.id, true));
    let sawWindup = false;
    for (let i = 0; i < 180; i++) {
      m.advance(1000 / 60);
      if (m.view('a').bots.find((x) => x.id === bot.id)?.attacking)
        sawWindup = true;
    }
    assert.ok(sawWindup);
    assert.ok(player(m, 'a').health.hull < 65);
    m.damageBatch([damage(bot.id, 'a', 1000)]);
    assert.equal(m.view('a').progression.currency, 1);
  } finally {
    m.dispose();
  }
});

test('status refresh, immunity, elimination, and regeneration respect lifecycle', () => {
  const m = setup();
  try {
    assert.ok(m.setModifiers('a', modifiers({ regeneration: 10 })));
    m.damagePlayer('a', 10);
    step(m, 1000);
    assert.ok(Math.abs(player(m, 'a').health.hull - 56) < 0.01);
    assert.ok(
      m.applyStatus('a', {
        kind: 'corrosion',
        ownerId: 'b',
        magnitude: 4,
        duration: 3000,
      }),
    );
    assert.ok(
      m.applyStatus('a', {
        kind: 'corrosion',
        ownerId: 'b',
        magnitude: 2,
        duration: 3000,
      }),
    );
    assert.equal(
      player(m, 'a').statuses.filter((s) => s.kind === 'corrosion').length,
      1,
    );
    assert.ok(m.setStatusImmunity('a', 'corrosion', true));
    assert.equal(player(m, 'a').statuses.length, 0);
    assert.equal(
      m.applyStatus('a', {
        kind: 'corrosion',
        ownerId: 'b',
        magnitude: 4,
        duration: 3000,
      }),
      false,
    );
    m.damageBatch([damage('a', 'b', 1000, 'boundary')]);
    assert.equal(player(m, 'a').life.kind, 'eliminated');
    assert.equal(m.repairPlayer('a', 100, true).actual, 0);
    assert.equal(m.grantProgress('a', 100), false);
    step(m, 2000);
    assert.equal(player(m, 'a').health.hull, 0);
  } finally {
    m.dispose();
  }
});

test('derived stats remain order independent and removal does not heal', () => {
  const a = setup(),
    b = setup();
  try {
    const first = [
      { id: 'x', stat: 'physical', add: 3, multiplier: 1.2 },
      { id: 'y', stat: 'physical', add: 4, multiplier: 1 },
    ];
    assert.ok(a.setModifiers('a', first));
    assert.ok(b.setModifiers('a', [...first].reverse()));
    assert.equal(player(a, 'a').stats.physical, player(b, 'a').stats.physical);
    a.damagePlayer('a', 20);
    const health = player(a, 'a').health.hull;
    assert.ok(a.setModifiers('a', modifiers({ maximumHealth: 20 })));
    assert.equal(player(a, 'a').health.hull, health);
    assert.ok(a.setModifiers('a', []));
    assert.equal(player(a, 'a').health.hull, health);
  } finally {
    a.dispose();
    b.dispose();
  }
});

test('a projectile cannot pass an intervening wall', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const m = setup(world);
  try {
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(2, 2, 0.5).setTranslation(-20, 1, -15),
    );
    step(m, 100);
    m.takeDamageLedger();
    assert.ok(m.launchProjectile('a', 0, 16, 1800, 10, 0));
    step(m, 700);
    assert.equal(m.view('a').projectiles.length, 0);
    assert.equal(
      m.takeDamageLedger().filter((e) => e.event.ownerId === 'a').length,
      0,
    );
  } finally {
    m.dispose();
  }
});

test('reflected damage preserves attribution and terminates causal chains', () => {
  const m = setup();
  try {
    assert.ok(m.setReflection('a', 1));
    assert.ok(m.setReflection('b', 1));
    m.damageBatch([damage('a', 'b', 1)]);
    const ledger = m.takeDamageLedger();
    assert.equal(ledger.length, 9);
    assert.deepEqual(
      ledger.map((x) => x.event.depth),
      [0, 1, 2, 3, 4, 5, 6, 7, 8],
    );
    assert.deepEqual(
      ledger.slice(0, 3).map((x) => [x.event.targetId, x.event.ownerId]),
      [
        ['a', 'b'],
        ['b', 'a'],
        ['a', 'b'],
      ],
    );
    assert.equal(player(m, 'a').health.hull, 60);
    assert.equal(player(m, 'b').health.hull, 61);
  } finally {
    m.dispose();
  }
});

test('damage channels apply mitigation, plating bypass, vulnerability and protection distinctly', () => {
  const m = setup();
  try {
    assert.ok(
      m.setModifiers(
        'a',
        modifiers({ plating: 20, damageResistance: 50, poisonResistance: 25 }),
      ),
    );
    assert.ok(m.levelPlayer('a', 2));
    let result = m.damageBatch([
      { ...damage('a', 'b', 10), vulnerability: 2 },
    ])[0];
    assert.equal(result.plating, 10);
    assert.equal(result.hull, 0);
    result = m.damageBatch([damage('a', 'b', 8, 'corrosion')])[0];
    assert.equal(result.plating, 0);
    assert.equal(result.hull, 6);
    result = m.damageBatch([damage('a', null, 8, 'environmental')])[0];
    assert.equal(result.hull, 4);
    assert.equal(result.plating, 0);
    result = m.damageBatch([damage('a', 'a', 8, 'self')])[0];
    assert.equal(result.plating, 4);
    assert.equal(result.hull, 0);
    assert.ok(m.setOffer('a', { id: 'protect', revision: 1, choices: ['x'] }));
    assert.equal(m.damageBatch([damage('a', 'b', 10, 'contact')])[0].hull, 0);
    result = m.damageBatch([damage('a', null, 10, 'boundary')])[0];
    assert.equal(result.hull, 10);
    assert.equal(result.plating, 0);
  } finally {
    m.dispose();
  }
});

test('resource killer and source provenance survive each partial stage', () => {
  const m = setup();
  try {
    const p = player(m, 'a').position;
    const kinds = [
      ['vegetation', null, null, null, 'none'],
      ['meat', 'a', 'a', 'player', 'own-kill'],
      ['aquatic', 'b', 'b', 'player', 'third-party'],
      ['meat', 'ally', 'a', 'ally', 'ally-kill'],
    ];
    for (const [source, killerId, ownerId, killerKind, provenance] of kinds) {
      const id = m.spawnResource({
        position: { x: p.x, z: p.z },
        source,
        rarity: 'common',
        killerId,
        ownerId,
        killerKind,
        repair: false,
      });
      step(m, 3100);
      const events = m.takeCollections().filter((e) => e.resourceId === id);
      assert.deepEqual(
        events.map((e) => e.stage),
        [1, 2, 3, 4],
      );
      assert.ok(
        events.every(
          (e) =>
            e.source === source &&
            e.killerId === killerId &&
            e.ownerId === ownerId &&
            e.provenance === provenance,
        ),
      );
    }
  } finally {
    m.dispose();
  }
});

test('dash distance remains consistent across simulation step sizes', () => {
  const distances = [];
  for (const rate of [30, 60, 120]) {
    const m = setup();
    try {
      const start = player(m, 'a').position.x;
      m.consume({
        kind: 'control',
        matchId: 'room',
        playerId: 'a',
        sequence: 0,
        x: 1,
        y: 0,
        aim: 0,
        buttons: 4,
      });
      for (let i = 0; i < Math.ceil(rate * 0.2); i++) m.advance(1000 / rate);
      m.consume({
        kind: 'control',
        matchId: 'room',
        playerId: 'a',
        sequence: 1,
        x: 0,
        y: 0,
        aim: 0,
        buttons: 0,
      });
      m.advance(1000 / rate);
      distances.push(player(m, 'a').position.x - start);
    } finally {
      m.dispose();
    }
  }
  assert.ok(
    distances.every((d) => d > 4.3 && d < 4.7),
    `dash distances ${distances}`,
  );
});

test('an intervening wall blocks bot attacks until the route is open', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 }),
    m = setup(world);
  try {
    const id = m.view('a').bots[0].id;
    let seq = 0;
    for (let i = 0; i < 400; i++) {
      const p = player(m, 'a').position,
        bot = m.view('a').bots.find((b) => b.id === id).position;
      const dx = bot.x - p.x,
        dz = bot.z - p.z,
        d = Math.hypot(dx, dz);
      if (d < 3) break;
      m.consume({
        kind: 'control',
        matchId: 'room',
        playerId: 'a',
        sequence: seq++,
        x: dx / d,
        y: dz / d,
        aim: 0,
        buttons: 0,
      });
      m.advance(1000 / 60);
    }
    m.consume({
      kind: 'control',
      matchId: 'room',
      playerId: 'a',
      sequence: seq++,
      x: 0,
      y: 0,
      aim: 0,
      buttons: 0,
    });
    const p = player(m, 'a').position,
      b = m.view('a').bots.find((v) => v.id === id).position;
    const wall = world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.15, 2, 8).setTranslation(
        (p.x + b.x) / 2,
        1,
        (p.z + b.z) / 2,
      ),
    );
    m.takeDamageLedger();
    step(m, 2500);
    assert.equal(
      m
        .takeDamageLedger()
        .filter((e) => e.event.ownerId === id && e.event.targetId === 'a')
        .length,
      0,
    );
    world.removeCollider(wall, true);
    step(m, 3000);
    assert.ok(
      m
        .takeDamageLedger()
        .some((e) => e.event.ownerId === id && e.event.targetId === 'a'),
    );
  } finally {
    m.dispose();
  }
});

test('spawn points remain separated and traversable across arena seeds', () => {
  for (const seed of [1, 42, 4294967295]) {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 }),
      m = new Match('room', world, seed);
    try {
      for (const id of ids) {
        assert.ok(m.accept({ kind: 'join', playerId: id }));
        m.setReady(id, true);
      }
      const starts = ids.map((id) => player(m, id).position);
      for (let i = 0; i < starts.length; i++)
        for (let j = i + 1; j < starts.length; j++)
          assert.ok(
            Math.hypot(starts[i].x - starts[j].x, starts[i].z - starts[j].z) >
              2,
          );
      assert.ok(m.accept({ kind: 'start' }));
      const revision = m.view('a').loadingRevision;
      for (const id of ids)
        m.accept({ kind: 'loaded', playerId: id, revision });
      m.advance(3000);
      for (const id of ids) {
        const p = player(m, id).position;
        for (let i = 0; i < 60; i++) {
          m.consume({
            kind: 'control',
            matchId: 'room',
            playerId: id,
            sequence: i,
            x: p.x < 0 ? 1 : -1,
            y: 0,
            aim: 0,
            buttons: 0,
          });
          m.advance(1000 / 60);
        }
        const q = player(m, id).position;
        assert.ok(Math.abs(p.x - q.x) > 2, `${seed} ${id} can exit`);
      }
    } finally {
      m.dispose();
    }
  }
});
