import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { Match } from '../../build-host/server/match/match.js';
import {
  createArena,
  terrainRegionAt,
  arenaPointClear,
} from '../../build-host/shared/arena.js';

const id = 'checkpoint09-defense';
const player = (match, who = 'a') =>
  match.view(who).players.find((p) => p.id === who);
const damage = (
  match,
  targetId,
  ownerId,
  amount,
  channel = 'direct',
  depth = 0,
) => match.damageBatch([{ targetId, ownerId, amount, channel, depth }])[0];
const advance = (match, ms) => {
  while (ms > 0) {
    const step = Math.min(ms, 100);
    assert.ok(match.advance(step));
    ms -= step;
  }
};
const grant = (match, upgrade, rarity, rank = 1, who = 'a') => {
  for (let n = 1; n <= rank; n++)
    assert.ok(
      match.grantUpgrade(who, upgrade, rarity, n),
      `${upgrade} rank ${n}`,
    );
};
const choose = (match, choiceId, sequence = 1) => {
  advance(match, 20);
  const offer = match.view('a').offer;
  assert.ok(offer, choiceId);
  assert.ok(
    match.consume({
      kind: 'choice',
      matchId: id,
      playerId: 'a',
      sequence,
      offerId: offer.id,
      revision: offer.revision,
      choiceId,
    }),
  );
};
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

test('Impervious splits incoming damage once and delayed lethal damage credits one elimination', () => {
  const { match } = createAbilityMatch(id);
  try {
    grant(match, 'impervious', 'epic');
    const start = player(match).health.hull;
    close(damage(match, 'a', 'b', 40).hull, 20);
    close(player(match).health.hull, start - 20);
    advance(match, 900);
    close(player(match).health.hull, start - 20);
    advance(match, 100);
    close(player(match).health.hull, start - 40);
    match.takeDamageLedger();
    const remaining = player(match).health.hull;
    close(damage(match, 'a', 'b', remaining * 1.5).hull, remaining * 0.75);
    advance(match, 1000);
    assert.equal(player(match).life.kind, 'eliminated');
    assert.deepEqual(match.takeDeaths(), [{ playerId: 'a', ownerId: 'b' }]);
    const ledger = match.takeDamageLedger();
    assert.equal(
      ledger.filter(
        ({ event }) => event.channel === 'deferred' && event.targetId === 'a',
      ).length,
      1,
    );
    advance(match, 1000);
    assert.equal(
      match
        .takeDamageLedger()
        .filter(
          ({ event }) => event.channel === 'deferred' && event.targetId === 'a',
        ).length,
      0,
    );
    assert.deepEqual(match.takeDeaths(), []);
    assert.ok(
      match.accept({ kind: 'eliminate', playerId: 'c', ownerId: null }),
    );
    assert.ok(
      match.accept({ kind: 'eliminate', playerId: 'd', ownerId: null }),
    );
    advance(match, 1);
    const winnerStats = match
      .view('b')
      .result.players.find((p) => p.id === 'b');
    assert.equal(winnerStats.eliminations, 1);
  } finally {
    match.dispose();
  }
});

test('Fibroblasts count actual hull healed, not overheal or attempted recovery', () => {
  const { match } = createAbilityMatch(id);
  try {
    grant(match, 'fibroblasts', 'epic');
    const max = player(match).stats.maximumHealth;
    const noHealing = match.repairPlayer('a', 100, true);
    assert.equal(noHealing.actual, 0);
    close(player(match).stats.maximumHealth, max);
    damage(match, 'a', 'b', 40);
    assert.equal(match.repairPlayer('a', 100, false).actual, 40);
    close(player(match).stats.maximumHealth, max);
    damage(match, 'a', 'b', 11);
    assert.equal(match.repairPlayer('a', 9, false).actual, 9);
    close(player(match).stats.maximumHealth, max);
    assert.equal(match.repairPlayer('a', 99, false).actual, 2);
    close(player(match).stats.maximumHealth, max + 1);
  } finally {
    match.dispose();
  }
});

test('Spines reflect actual contact damage with bounded causal depth and correct owner', () => {
  const { match } = createAbilityMatch(id);
  try {
    grant(match, 'spines', 'rare', 1, 'a');
    grant(match, 'spines', 'rare', 1, 'b');
    match.takeDamageLedger();
    close(damage(match, 'a', 'b', 20, 'contact').hull, 20);
    const ledger = match.takeDamageLedger();
    assert.equal(ledger.length, 2);
    assert.equal(ledger[1].event.ownerId, 'a');
    assert.equal(ledger[1].event.targetId, 'b');
    assert.equal(ledger[1].event.depth, 1);
    close(ledger[1].result.hull, 7);
    match.takeDamageLedger();
    damage(match, 'a', 'b', 10, 'contact', 8);
    assert.equal(match.takeDamageLedger().length, 1);
  } finally {
    match.dispose();
  }
});

test('Immune System reduces corrosion but not boundary damage', () => {
  const { match } = createAbilityMatch(id);
  try {
    grant(match, 'immune-system', 'rare');
    close(damage(match, 'a', 'b', 20, 'corrosion').hull, 17);
    close(damage(match, 'a', null, 10, 'boundary').hull, 10);
  } finally {
    match.dispose();
  }
});

test('Turtle Down requires armor, parries early contact, and cannot block boundary damage', () => {
  const { match } = createAbilityMatch(id);
  try {
    assert.equal(match.grantUpgrade('a', 'turtle-down', 'rare', 1), false);
    grant(match, 'carapace', 'common');
    grant(match, 'turtle-down', 'rare');
    choose(match, 'movement');
    assert.equal(match.view('a').equipment.slots.movement, 'turtle-down');
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: id,
        playerId: 'a',
        sequence: 2,
        x: 0,
        y: 0,
        aim: 0,
        buttons: 4,
      }),
    );
    advance(match, 1);
    assert.equal(player(match).guarding, true);
    const hit = damage(match, 'a', 'b', 20, 'contact');
    close(hit.plating + hit.hull, 0.95);
    assert.ok(
      player(match, 'b').statuses.some((status) => status.kind === 'stun'),
    );
    close(damage(match, 'a', null, 10, 'boundary').hull, 10);
  } finally {
    match.dispose();
  }
});

test('Shell and Carapace conflict in both acquisition orders, as do Scales and Exoskeleton', () => {
  for (const [first, second, rarity1, rarity2] of [
    ['shell', 'carapace', 'rare', 'common'],
    ['carapace', 'shell', 'common', 'rare'],
    ['scales', 'exoskeleton', 'common', 'rare'],
    ['exoskeleton', 'scales', 'rare', 'common'],
  ]) {
    const { match } = createAbilityMatch(id);
    try {
      grant(match, first, rarity1);
      assert.equal(
        match.grantUpgrade('a', second, rarity2, 1),
        false,
        `${first} excludes ${second}`,
      );
    } finally {
      match.dispose();
    }
  }
});

test('Impervious resolves deferred lethal damage while disconnected in a protected choice', () => {
  const { match } = createAbilityMatch(id);
  try {
    grant(match, 'impervious', 'epic');
    const hull = player(match).health.hull;
    damage(match, 'a', 'b', hull * 1.5);
    assert.ok(match.grantProgress('a', 10));
    advance(match, 20);
    assert.ok(match.view('a').offer);
    assert.ok(match.accept({ kind: 'disconnect', playerId: 'a' }));
    advance(match, 980);
    assert.equal(player(match).life.kind, 'eliminated');
  } finally {
    match.dispose();
  }
});

function turtleMatch() {
  const { match } = createAbilityMatch(id);
  grant(match, 'carapace', 'common');
  grant(match, 'turtle-down', 'rare');
  choose(match, 'movement');
  assert.ok(
    match.consume({
      kind: 'control',
      matchId: id,
      playerId: 'a',
      sequence: 2,
      x: 0,
      y: 0,
      aim: 0,
      buttons: 4,
    }),
  );
  advance(match, 1);
  return match;
}

test('Turtle Down only parries inside the early window, then guard protection expires', () => {
  for (const [elapsed, expectedDamage, stuns] of [
    [200, 0.95, true],
    [350, 0.95, false],
    [800, 19, false],
  ]) {
    const match = turtleMatch();
    try {
      advance(match, elapsed);
      const hit = damage(match, 'a', 'b', 20, 'contact');
      close(hit.hull + hit.plating, expectedDamage);
      assert.equal(
        player(match, 'b').statuses.some((status) => status.kind === 'stun'),
        stuns,
      );
    } finally {
      match.dispose();
    }
  }
});

test('Poisonous Spines applies corrosion with the defender as owner', () => {
  const { match } = createAbilityMatch(id);
  try {
    grant(match, 'spines', 'rare', 4);
    choose(match, 'spines-poisonous');
    assert.ok(player(match).modules.some((item) => item.kind === 'spines'));
    damage(match, 'a', 'b', 10, 'contact');
    assert.ok(
      player(match, 'b').statuses.some((status) => status.kind === 'corrosion'),
    );
    match.takeDamageLedger();
    advance(match, 1000);
    const poison = match
      .takeDamageLedger()
      .find(
        ({ event }) => event.channel === 'corrosion' && event.targetId === 'b',
      );
    assert.ok(poison);
    assert.equal(poison.event.ownerId, 'a');
    close(poison.result.hull, 3);
  } finally {
    match.dispose();
  }
});

test('Detachable Spines retaliates on a dodged direct hit but ordinary Spines does not', () => {
  for (const detachable of [false, true]) {
    const { match } = createAbilityMatch(id);
    const random = Math.random;
    try {
      grant(match, 'spines', 'rare', detachable ? 4 : 1);
      if (detachable) choose(match, 'spines-detachable');
      grant(match, 'elusive', 'common');
      Math.random = () => 0;
      match.takeDamageLedger();
      assert.equal(damage(match, 'a', 'b', 10).dodged, true);
      const hits = match
        .takeDamageLedger()
        .filter(({ event }) => event.targetId === 'b');
      assert.equal(hits.length, detachable ? 1 : 0);
      if (detachable) close(hits[0].result.hull, 14);
    } finally {
      Math.random = random;
      match.dispose();
    }
  }
});

test('Turtle Down specializations strengthen stuns or guarded Spines', () => {
  for (const choice of ['turtle-down-reinforced', 'turtle-down-spiked']) {
    const { match } = createAbilityMatch(id);
    try {
      grant(match, 'carapace', 'common');
      grant(match, 'spines', 'rare');
      grant(match, 'turtle-down', 'rare');
      choose(match, 'movement');
      for (let rank = 2; rank <= 3; rank++)
        assert.ok(match.grantUpgrade('a', 'turtle-down', 'rare', rank));
      advance(match, 2100);
      choose(match, choice, 2);
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: id,
          playerId: 'a',
          sequence: 3,
          x: 0,
          y: 0,
          aim: 0,
          buttons: 4,
        }),
      );
      advance(match, 1);
      match.takeDamageLedger();
      damage(match, 'a', 'b', 20, 'contact');
      const stun = player(match, 'b').statuses.find(
        (status) => status.kind === 'stun',
      );
      assert.ok(stun);
      assert.equal(
        stun.remaining,
        choice === 'turtle-down-reinforced' ? 3000 : 1500,
      );
      const retaliation = match
        .takeDamageLedger()
        .find(({ event }) => event.targetId === 'b');
      assert.ok(retaliation);
      close(
        retaliation.result.hull,
        0.95 * 0.35 * (choice === 'turtle-down-spiked' ? 2 : 1),
      );
    } finally {
      match.dispose();
    }
  }
});

test('Hard Scales stun duration uses plating immediately before the hit', () => {
  const { match } = createAbilityMatch(id);
  try {
    grant(match, 'scales', 'common', 3);
    grant(match, 'carapace', 'common');
    choose(match, 'scales-hard');
    const plating = player(match).health.plating;
    assert.ok(plating > 0);
    damage(match, 'a', 'b', 20, 'contact');
    const stun = player(match, 'b').statuses.find(
      (status) => status.kind === 'stun',
    );
    assert.ok(stun);
    close(stun.remaining, 500 * (1 + plating * 0.05));
  } finally {
    match.dispose();
  }
});

test('Regenerative Tissue restores the listed hull amount over ten seconds and stops at full hull', () => {
  const { match } = createAbilityMatch(id);
  try {
    grant(match, 'regenerative-tissue', 'common');
    const max = player(match).health.hull;
    damage(match, 'a', 'b', 20);
    const damaged = player(match).health.hull;
    advance(match, 10_000);
    close(player(match).health.hull - damaged, 2);
    const missing = max - player(match).health.hull;
    close(match.repairPlayer('a', 1000, false).actual, missing);
    advance(match, 10_000);
    close(player(match).health.hull, max);
  } finally {
    match.dispose();
  }
});

test('Collapse defeats active Turtle Down, Fibroblasts, regeneration, and Impervious', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const match = new Match(id, world, 42, {
    shrinkStartMs: 100,
    tinyAtMs: 200,
    collapseAtMs: 300,
  });
  try {
    for (const playerId of ['a', 'b', 'c', 'd']) {
      assert.ok(match.accept({ kind: 'join', playerId }));
      match.setReady(playerId, true);
    }
    assert.ok(match.accept({ kind: 'start' }));
    const revision = match.view('a').loadingRevision;
    for (const playerId of ['a', 'b', 'c', 'd'])
      assert.ok(match.accept({ kind: 'loaded', playerId, revision }));
    advance(match, 3000);
    grant(match, 'fibroblasts', 'epic');
    grant(match, 'regenerative-tissue', 'legendary', 5);
    grant(match, 'impervious', 'legendary');
    grant(match, 'carapace', 'common');
    grant(match, 'turtle-down', 'rare');
    choose(match, 'movement');
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: id,
        playerId: 'a',
        sequence: 2,
        x: 0,
        y: 0,
        aim: 0,
        buttons: 4,
      }),
    );
    advance(match, 1);
    assert.equal(player(match).guarding, true);
    match.syncWallClock(1000);
    match.syncWallClock(1301);
    assert.ok(match.advance(16));
    assert.equal(match.view('a').phase, 'finished');
    assert.equal(player(match).life.kind, 'eliminated');
    assert.equal(match.view('a').result.outcome.kind, 'draw');
  } finally {
    match.dispose();
  }
});

test('Defensive passives match each recorded rarity and rank table', () => {
  const four = (common, rare, epic, legendary) => ({
    common,
    rare,
    epic,
    legendary,
  });
  const matrix = [
    [
      'plated',
      'plating',
      four(
        [5, 10, 15, 20, 25],
        [6, 12, 18, 24, 30],
        [7, 14, 21, 28, 35],
        [8, 16, 24, 32, 40],
      ),
    ],
    [
      'scales',
      'damageResistance',
      four([5, 10, 15], [6, 12, 18], [7, 15, 22], [8, 17, 26]),
    ],
    [
      'scales',
      'heatAdaptation',
      four([33, 66, 100], [36, 72, 110], [40, 80, 120], [50, 100, 150]),
    ],
    [
      'carapace',
      'damageResistance',
      four([5, 10, 15], [6, 12, 18], [7, 15, 22], [8, 17, 26]),
    ],
    [
      'carapace',
      'plating',
      four([3, 6, 9], [4, 8, 12], [5, 10, 15], [6, 12, 18]),
    ],
    [
      'shell',
      'damageResistance',
      {
        rare: [7.5, 15, 22.5],
        epic: [10, 20, 30],
        legendary: [12.5, 25, 32.5],
      },
    ],
    [
      'spines',
      'spines',
      {
        rare: [35, 70, 105, 140, 175],
        epic: [45, 90, 135, 180, 225],
        legendary: [55, 110, 165, 220, 275],
      },
    ],
    [
      'exoskeleton',
      'plating',
      { rare: [4, 8, 12], epic: [6, 12, 18], legendary: [8, 16, 24] },
    ],
    [
      'exoskeleton',
      'social',
      { rare: [1.7, 3.5, 5.2], epic: [2, 4, 6], legendary: [2.3, 4.5, 6.7] },
    ],
    [
      'regenerative-tissue',
      'regeneration',
      four(
        [2, 4, 6, 8, 10],
        [2.3, 4.5, 7, 9.5, 11.5],
        [2.7, 5.5, 8, 11, 13.5],
        [3.3, 6.6, 10, 13, 16],
      ),
    ],
    [
      'immune-system',
      'poisonResistance',
      { rare: [15, 20, 25], epic: [30, 40, 50], legendary: [45, 60, 75] },
    ],
    ['impervious', 'maximumHealth', { epic: [10], legendary: [20] }],
  ];
  for (const [upgrade, stat, rarities] of matrix) {
    for (const [rarity, values] of Object.entries(rarities)) {
      const { match } = createAbilityMatch(id);
      try {
        const initial = player(match).stats[stat];
        for (const [index, expected] of values.entries()) {
          assert.ok(
            match.grantUpgrade('a', upgrade, rarity, index + 1),
            `${upgrade} ${rarity} ${index + 1}`,
          );
          close(player(match).stats[stat] - initial, expected);
        }
      } finally {
        match.dispose();
      }
    }
  }
});

test('Basking advances only on sand by the heat-scaled share of the level threshold', () => {
  const { match, world } = createAbilityMatch(id);
  try {
    grant(match, 'scales', 'common', 3);
    choose(match, 'scales-basking');
    const position = player(match).position;
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
    const find = (terrain) => {
      for (let x = -30; x < 30; x++)
        for (let z = -30; z < 30; z++) {
          if (
            terrainRegionAt(arena, x, z)?.terrain === terrain &&
            arenaPointClear(arena.obstacles, { x, z }, 1)
          )
            return { x, z };
        }
      throw new Error(`no ${terrain} region`);
    };
    const move = (point) => {
      body.setTranslation({ ...point, y: 0.25 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    };
    move(find('snow'));
    const initial = match.view('a').progression.progress;
    advance(match, 8000);
    close(match.view('a').progression.progress, initial);
    move(find('sand'));
    assert.equal(match.view('a').progression.basking.active, true);
    const required = match.view('a').progression.required;
    advance(match, 8000);
    close(
      match.view('a').progression.progress - initial,
      (required * 100) / 1000,
    );
  } finally {
    match.dispose();
  }
});

test('Scales adapts to heat without granting cold adaptation', () => {
  const { match } = createAbilityMatch(id);
  try {
    grant(match, 'scales', 'common', 2);
    assert.ok(
      match.applyStatus('a', {
        kind: 'heat',
        ownerId: null,
        magnitude: 1,
        duration: 1000,
      }),
    );
    assert.ok(
      match.applyStatus('a', {
        kind: 'cold',
        ownerId: null,
        magnitude: 1,
        duration: 1000,
      }),
    );
    close(
      player(match).statuses.find((status) => status.kind === 'heat').remaining,
      340,
    );
    close(
      player(match).statuses.find((status) => status.kind === 'cold').remaining,
      1000,
    );
  } finally {
    match.dispose();
  }
});

test('Fibroblasts grants each rarity and rank amount for an actual 50 hull healed', () => {
  for (const [rarity, values] of Object.entries({
    epic: [1, 1.5, 2],
    legendary: [1.5, 2, 2.5],
  })) {
    for (const [index, expected] of values.entries()) {
      const { match } = createAbilityMatch(id);
      try {
        grant(match, 'fibroblasts', rarity, index + 1);
        const max = player(match).stats.maximumHealth;
        close(damage(match, 'a', 'b', 50).hull, 50);
        close(match.repairPlayer('a', 50, false).actual, 50);
        close(player(match).stats.maximumHealth - max, expected);
      } finally {
        match.dispose();
      }
    }
  }
});

test('Turtle Down cooldown follows each rarity and rank', () => {
  for (const [rarity, values] of Object.entries({
    rare: [4, 3.5, 3],
    epic: [3.5, 3, 2.5],
    legendary: [3, 2.5, 2],
  })) {
    for (const [index, expected] of values.entries()) {
      const { match } = createAbilityMatch(id);
      try {
        grant(match, 'shell', 'rare');
        grant(match, 'turtle-down', rarity, index + 1);
        choose(match, 'movement');
        if (index === 2) {
          advance(match, 2100);
          choose(match, 'skip', 2);
        }
        const start = match.view('a').time;
        assert.ok(
          match.consume({
            kind: 'control',
            matchId: id,
            playerId: 'a',
            sequence: 3,
            x: 0,
            y: 0,
            aim: 0,
            buttons: 4,
          }),
        );
        advance(match, 1);
        assert.equal(player(match).guarding, true);
        const readyAt = match
          .view('a')
          .equipment.learned.find((item) => item.id === 'turtle-down').readyAt;
        close(readyAt - start, expected * 1000);
      } finally {
        match.dispose();
      }
    }
  }
});

test('Scales reduces heatwave buildup in the live sand region', () => {
  const { match, world } = createAbilityMatch(id);
  try {
    grant(match, 'scales', 'common', 3);
    const arena = createArena(42);
    let points;
    for (let x = -30; x < 30 && !points; x++)
      for (let z = -30; z < 30 && !points; z++) {
        const candidates = [
          { x, z },
          { x: x + 3, z },
        ];
        if (
          candidates.every(
            (point) =>
              terrainRegionAt(arena, point.x, point.z)?.terrain === 'sand' &&
              arenaPointClear(arena.obstacles, point, 1),
          )
        )
          points = candidates;
      }
    assert.ok(points);
    for (const [index, who] of ['a', 'b'].entries()) {
      const position = player(match, who).position;
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
      body.setTranslation({ ...points[index], y: 0.25 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    for (const bot of match.view('a').bots)
      match.setBotHostility(bot.id, false);
    advance(match, 45_000);
    assert.equal(
      match.view('a').weather.find((weather) => weather.kind === 'heatwave')
        ?.state,
      'active',
    );
    advance(match, 10_000);
    const heatA = match.view('a').thermal.heat;
    const heatB = match.view('b').thermal.heat;
    close(heatA, heatB / 2);
    assert.ok(heatA > 0);
  } finally {
    match.dispose();
  }
});

test('Queued level offers do not refill plating again when a prompt resolves', () => {
  const { match } = createAbilityMatch(id);
  try {
    grant(match, 'plated', 'common');
    close(damage(match, 'a', 'b', 2).plating, 2);
    close(player(match).health.plating, 3);
    assert.ok(match.grantProgress('a', 25));
    assert.equal(player(match).health.level, 3);
    close(player(match).health.plating, 5);
    close(damage(match, 'a', 'b', 2).plating, 2);
    close(player(match).health.plating, 3);
    advance(match, 20);
    const offer = match.view('a').offer;
    assert.ok(offer);
    assert.ok(match.view('a').progression.pending >= 1);
    assert.ok(
      match.consume({
        kind: 'choice',
        matchId: id,
        playerId: 'a',
        sequence: 1,
        offerId: offer.id,
        revision: offer.revision,
        choiceId: offer.choices[0],
      }),
    );
    close(player(match).health.plating, 3);
  } finally {
    match.dispose();
  }
});

test('Turtle Down stuns a bot contact attacker during the parry window', () => {
  const match = turtleMatch();
  try {
    const bot = match.view('a').bots.find((item) => !item.ownerId);
    assert.ok(bot);
    const blocked = damage(match, 'a', bot.id, 10, 'contact');
    close(blocked.hull + blocked.plating, 0.475);
    const strike = match.damageBatch([
      {
        targetId: bot.id,
        ownerId: 'a',
        amount: 1,
        channel: 'contact',
        depth: 0,
        origin: 'manual',
        abilityId: 'jaws',
      },
    ])[0];
    close(strike.hull, 2);
  } finally {
    match.dispose();
  }
});

test('Turtle Down parries a hunter attack initiated by bot AI', () => {
  const { match, world } = createAbilityMatch(id);
  try {
    grant(match, 'carapace', 'common');
    grant(match, 'turtle-down', 'rare');
    choose(match, 'movement');
    const view = match.view('a');
    const hunter = view.bots.find((item) => item.role === 'hunter');
    assert.ok(hunter);
    const findBody = (position) =>
      world.bodies
        .getAll()
        .find(
          (item) =>
            item.isDynamic() &&
            Math.hypot(
              item.translation().x - position.x,
              item.translation().z - position.z,
            ) < 0.01,
        );
    const own = findBody(player(match).position);
    const enemy = findBody(hunter.position);
    assert.ok(own && enemy);
    for (const bot of view.bots.filter((item) => item.id !== hunter.id)) {
      const body = findBody(bot.position);
      assert.ok(body);
      body.setTranslation({ x: -30, y: 0.25, z: -30 }, true);
    }
    for (const other of view.players.filter((item) => item.id !== 'a')) {
      const body = findBody(other.position);
      assert.ok(body);
      body.setTranslation({ x: -20, y: 0.25, z: -20 }, true);
    }
    own.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
    enemy.setTranslation({ x: 1.8, y: 0.25, z: 0 }, true);
    own.setLinvel({ x: 0, y: 0, z: 0 }, true);
    enemy.setLinvel({ x: 0, y: 0, z: 0 }, true);
    match.takeDamageLedger();
    for (
      let elapsed = 0;
      elapsed < 2000 &&
      !match.view('a').bots.find((bot) => bot.id === hunter.id)?.attacking;
      elapsed += 25
    )
      advance(match, 25);
    assert.equal(
      match.view('a').bots.find((bot) => bot.id === hunter.id)?.attacking,
      true,
    );
    advance(match, 350);
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: id,
        playerId: 'a',
        sequence: 2,
        x: 0,
        y: 0,
        aim: 0,
        buttons: 4,
      }),
    );
    advance(match, 300);
    const attack = match
      .takeDamageLedger()
      .find(
        ({ event }) =>
          event.ownerId === hunter.id &&
          event.targetId === 'a' &&
          event.channel === 'contact',
      );
    assert.ok(attack, 'hunter contact arrives during guard');
    assert.ok(
      attack.result.hull + attack.result.plating < attack.event.amount * 0.06,
    );
    const follow = match.damageBatch([
      {
        targetId: hunter.id,
        ownerId: 'a',
        amount: 1,
        channel: 'contact',
        depth: 0,
        origin: 'manual',
        abilityId: 'jaws',
      },
    ])[0];
    close(follow.hull, 2);
  } finally {
    match.dispose();
  }
});
