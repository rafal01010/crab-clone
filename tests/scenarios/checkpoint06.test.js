import { test } from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { Match } from '../../build-host/server/match/match.js';
import {
  FirmwareField,
  identificationChance,
} from '../../build-host/server/match/firmware.js';
import {
  createArena,
  terrainAt,
  arenaPointClear,
} from '../../build-host/shared/arena.js';
import { createPointsOfInterest } from '../../build-host/server/match/points-of-interest.js';
import { SOURCE_GAMEPLAY } from '../../build-host/server/content/source-gameplay.js';
import { sourceCurve } from '../../build-host/server/content/source-curve.js';

await RAPIER.init();
const ids = ['a', 'b', 'c', 'd'];
const mods = (values) =>
  Object.entries(values).map(([stat, add]) => ({
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
  const bodies = world.bodies.getAll();
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
  return { match, world, players, arena: createArena(seed) };
}
function step(match, ms, tick = 100) {
  for (let t = 0; t < ms; t += tick)
    assert.ok(match.advance(Math.min(tick, ms - t)));
}
function move(players, id, p) {
  players.get(id).setTranslation({ x: p.x, y: 0.25, z: p.z }, true);
  players.get(id).setLinvel({ x: 0, y: 0, z: 0 }, true);
}
function intent(match, playerId, kind, targetId) {
  return match.consume({
    matchId: 'room',
    playerId,
    sequence: 1,
    kind,
    targetId,
  });
}
function choose(match, id, choiceId) {
  const offer = match.view(id).offer;
  assert.ok(offer);
  return match.consume({
    matchId: 'room',
    playerId: id,
    sequence: 2,
    kind: 'choice',
    offerId: offer.id,
    revision: offer.revision,
    choiceId,
  });
}
function sites(arena, seed) {
  return createPointsOfInterest(
    arena.poiSockets,
    (p) => terrainAt(arena, p.x, p.z),
    seed,
  );
}
function self(match, id) {
  return match.view(id).players.find((p) => p.id === id);
}
function initialFirmwarePoint(arena) {
  const point = arena.spawns
    .map((spawn) => ({ x: spawn.x + 5, z: spawn.z + 8 }))
    .find(
      (p) =>
        arenaPointClear(arena.obstacles, p) &&
        terrainAt(arena, p.x, p.z) !== 'water',
    );
  assert.ok(point);
  return point;
}

function assertAcceleratedFirmwareSpawn(match, players, arena) {
  const point = arena.resources.find((candidate) => {
    const nearby = arena.resources.filter(
      (resource) =>
        Math.hypot(resource.x - candidate.x, resource.z - candidate.z) < 32,
    );
    return (
      nearby.length > 1 &&
      nearby
        .slice(0, 2)
        .every(
          (resource) =>
            terrainAt(arena, resource.x, resource.z) !== 'water' &&
            Math.hypot(resource.x - candidate.x, resource.z - candidate.z) < 30,
        ) &&
      Math.hypot(nearby[0].x - nearby[1].x, nearby[0].z - nearby[1].z) > 5
    );
  });
  assert.ok(point);
  const positionPlayers = () => {
    for (const id of ids) move(players, id, point);
  };
  const visibleIds = () =>
    new Set(
      ids.flatMap((id) => match.view(id).firmware.map((item) => item.id)),
    );
  step(match, 29900 - match.view('a').time, 100);
  positionPlayers();
  step(match, 200, 100);
  step(match, 57100 - match.view('a').time, 100);
  positionPlayers();
  const before = visibleIds();
  step(match, 500, 100);
  const spawned = ids
    .flatMap((id) => match.view(id).firmware)
    .filter((item) => !before.has(item.id));
  const secondSite = arena.resources.filter(
    (resource) => Math.hypot(resource.x - point.x, resource.z - point.z) < 32,
  )[1];
  assert.ok(
    spawned.some(
      (item) =>
        Math.hypot(
          item.position.x - secondSite.x,
          item.position.z - secondSite.z,
        ) < 0.01,
    ),
  );
  assert.ok(match.view('a').time < 60000);
}

test('contested discovery, claims, currency and wallet retries', () => {
  const f = setup();
  const { match, players, arena } = f;
  try {
    const site = sites(arena, 42).find((p) => p.kind === 'chaos-tree');
    assert.ok(site);
    move(players, 'a', site.position);
    step(match, 100);
    assert.ok(
      match
        .takeDiscoveries()
        .some((x) => x.playerId === 'a' && x.siteId === site.id),
    );
    assert.ok(intent(match, 'a', 'interaction', site.id));
    move(players, 'b', site.position);
    step(match, 100);
    assert.equal(intent(match, 'b', 'interaction', site.id), false);
    const before = match.view('a').progression.currency;
    assert.ok(choose(match, 'a', 'currency'));
    assert.equal(match.view('a').progression.currency, before + 5);
    assert.equal(intent(match, 'b', 'interaction', site.id), false);
    assert.ok(
      match
        .takeDiscoveries()
        .some((x) => x.playerId === 'b' && x.siteId === site.id),
    );
    assert.equal(
      match.view('b').pointsOfInterest.find((p) => p.id === site.id).status,
      'claimed',
    );
    assert.ok(match.grantUpgrade('c', 'nomadic', 'rare', 1));
    const progressBeforeDiscovery = match.view('c').progression.progress;
    move(players, 'c', site.position);
    step(match, 100);
    assert.ok(
      match
        .takeDiscoveries()
        .some((x) => x.playerId === 'c' && x.siteId === site.id),
    );
    assert.ok(match.view('c').progression.progress > progressBeforeDiscovery);
    assert.equal(
      match.walletTransaction('a', 'poor', 'spend', 100).accepted,
      false,
    );
    assert.equal(match.view('a').progression.currency, before + 5);
    assert.equal(
      match.walletTransaction('a', 'once', 'spend', 2).accepted,
      true,
    );
    assert.equal(
      match.walletTransaction('a', 'once', 'spend', 2).accepted,
      true,
    );
    assert.equal(match.view('a').progression.currency, before + 3);
    assert.equal(match.walletTransaction('a', 'once', 'spend', 3), null);
  } finally {
    match.dispose();
  }
});

test('firmware scanning keeps individual knowledge private and consumption is single use', () => {
  const { match, players, arena } = setup();
  try {
    assert.ok(match.setModifiers('a', mods({ senses: -100 })));
    assert.ok(match.setModifiers('b', mods({ senses: -100 })));
    const point = initialFirmwarePoint(arena);
    move(players, 'a', point);
    move(players, 'b', { x: point.x + 1, z: point.z });
    step(match, 100);
    const module = match
      .view('a')
      .firmware.find(
        (x) => Math.hypot(x.position.x - point.x, x.position.z - point.z) < 3,
      );
    assert.ok(module);
    assert.ok(match.setModifiers('a', mods({ senses: 400 })));
    assert.ok(intent(match, 'a', 'scan', module.id));
    const known = match
      .view('a')
      .firmware.find((x) => x.id === module.id).knowledge;
    assert.equal(known.kind, 'identified');
    assert.equal(
      match.view('b').firmware.find((x) => x.id === module.id).knowledge.kind,
      'failed',
    );
    assert.ok(match.setModifiers('b', mods({ senses: 400 })));
    assert.ok(intent(match, 'b', 'scan', module.id));
    assert.deepEqual(
      match.view('b').firmware.find((x) => x.id === module.id).knowledge,
      known,
    );
    assert.ok(intent(match, 'a', 'use-firmware', module.id));
    step(match, 2200, 100);
    assert.equal(match.view('a').lastFirmware.effect, known.effect);
    assert.equal(intent(match, 'b', 'use-firmware', module.id), false);
    assert.equal(
      match.view('a').firmware.some((x) => x.id === module.id),
      false,
    );
  } finally {
    match.dispose();
  }
});

test('shelter expires and prevents ordinary damage, but never boundary damage', () => {
  const { match, players, arena } = setup();
  try {
    move(players, 'a', arena.shelters[0]);
    step(match, 100);
    assert.ok(intent(match, 'a', 'shelter', 'shelter-0'));
    const hp = self(match, 'a').health.hull;
    match.damageBatch([
      { targetId: 'a', ownerId: 'b', amount: 20, channel: 'direct', depth: 0 },
    ]);
    assert.equal(self(match, 'a').health.hull, hp);
    match.damageBatch([
      {
        targetId: 'a',
        ownerId: null,
        amount: 10,
        channel: 'boundary',
        depth: 0,
      },
    ]);
    assert.ok(self(match, 'a').health.hull < hp);
    step(match, 5100);
    assert.equal(self(match, 'a').shelter, null);
  } finally {
    match.dispose();
  }
});

test('recruitment, independent ally caps and owner death cleanup', () => {
  const { match } = setup();
  try {
    assert.ok(match.setModifiers('a', mods({ social: 100 })));
    assert.equal(intent(match, 'a', 'charm', 'b'), false);
    assert.ok(match.recruitCompanion('a', 'recruit', 0));
    assert.equal(match.recruitCompanion('a', 'recruit', 0), false);
    for (const [kind, cap] of [
      ['summoned', 4],
      ['offspring', 10],
      ['decoy', 2],
    ]) {
      for (let i = 0; i < cap; i++)
        assert.ok(match.scheduleAlly('a', kind, 0, 10000));
      assert.equal(match.scheduleAlly('a', kind, 0, 10000), false);
    }
    step(match, 100);
    const owned = match.view('a').bots.filter((b) => b.ownerId === 'a');
    for (const [kind, cap] of [
      ['charmed', 1],
      ['summoned', 4],
      ['offspring', 10],
      ['decoy', 2],
    ])
      assert.equal(owned.filter((b) => b.kind === kind).length, cap);
    assert.ok(match.scheduleAlly('b', 'offspring', 1000, 10000));
    assert.ok(match.accept({ kind: 'eliminate', playerId: 'b', ownerId: 'a' }));
    step(match, 1200);
    assert.equal(
      match.view('a').bots.some((b) => b.ownerId === 'b'),
      false,
    );
    assert.ok(match.accept({ kind: 'eliminate', playerId: 'a', ownerId: 'c' }));
    step(match, 100);
    assert.equal(
      match.view('c').bots.some((b) => b.ownerId === 'a'),
      false,
    );
  } finally {
    match.dispose();
  }
});

test('collider mass and pull direction follow relative sizes', () => {
  const { match, players, arena } = setup();
  try {
    let point;
    for (let x = -20; x <= 20 && !point; x += 2)
      for (let z = -20; z <= 20 && !point; z += 2)
        if (arenaPointClear(arena.obstacles, { x, z }, 5)) point = { x, z };
    assert.ok(point);
    for (const [aSize, bSize, which] of [
      [-50, 150, 'a'],
      [150, -50, 'b'],
      [0, 0, 'both'],
    ]) {
      assert.ok(match.setModifiers('a', mods({ size: aSize })));
      assert.ok(match.setModifiers('b', mods({ size: bSize })));
      move(players, 'a', point);
      move(players, 'b', { x: point.x + 5, z: point.z });
      step(match, 100);
      const a = players.get('a'),
        b = players.get('b');
      assert.ok(a.collider(0).radius() > 0 && b.collider(0).radius() > 0);
      const pa = a.translation().x,
        pb = b.translation().x;
      assert.ok(match.startPull('a', 'b', 1000, 20));
      step(match, 500, 50);
      const da = a.translation().x - pa,
        db = pb - b.translation().x;
      if (which === 'a') {
        assert.ok(da > 0.01);
        assert.ok(Math.abs(db) < 0.01);
      } else if (which === 'b') {
        assert.ok(db > 0.01);
        assert.ok(Math.abs(da) < 0.01);
      } else {
        assert.ok(da > 0.01);
        assert.ok(db > 0.01);
      }
      match.cancelPull('a');
    }
  } finally {
    match.dispose();
  }
});

const rewardCases = [
  ['algae-reef', 'hull', 'maximumHealth', 7],
  ['algae-reef', 'ability', 'ability', 1],
  ['carved-tree', 'physical', 'physical', 1],
  ['healing-pond', 'regen', 'regeneration', 1.5],
  ['oasis', 'regen', 'regeneration', 3],
  ['mud-pond', 'adaptation', 'heatAdaptation', 10],
  ['giant-mushroom', 'study', 'firmwareIdentification', 10],
  ['giant-mushroom', 'dip', 'additionalPoisonTicks', 1],
  ['unattended-nest', 'social', 'social', 1],
];
function seedFor(kind) {
  for (let seed = 0; seed < 200; seed++) {
    const arena = createArena(seed),
      site = sites(arena, seed).find((p) => p.kind === kind);
    if (site) return { seed, site };
  }
  throw Error(`No site for ${kind}`);
}

test('POI stat, repair, progress and growth reward matrix', () => {
  for (const [kind, choice, stat, delta] of rewardCases) {
    const { seed, site } = seedFor(kind),
      { match, players } = setup(seed);
    try {
      move(players, 'a', site.position);
      step(match, 50);
      const before = self(match, 'a').stats[stat];
      assert.ok(intent(match, 'a', 'interaction', site.id), `${kind} open`);
      assert.ok(choose(match, 'a', choice), `${kind}/${choice}`);
      assert.equal(
        self(match, 'a').stats[stat],
        before + delta,
        `${kind}/${choice}`,
      );
    } finally {
      match.dispose();
    }
  }
  for (const [kind, choice, fraction] of [
    ['healing-pond', 'repair', 0.5],
    ['oasis', 'repair', 1],
  ]) {
    const { seed, site } = seedFor(kind),
      { match, players } = setup(seed);
    try {
      move(players, 'a', site.position);
      step(match, 50);
      match.damagePlayer('a', 40);
      const before = self(match, 'a').health.hull,
        max = self(match, 'a').stats.maximumHealth;
      assert.ok(intent(match, 'a', 'interaction', site.id));
      assert.ok(choose(match, 'a', choice));
      assert.equal(
        self(match, 'a').health.hull,
        Math.min(max, before + max * fraction),
      );
    } finally {
      match.dispose();
    }
  }
  for (const kind of ['carved-tree', 'lotus-plant']) {
    const { seed, site } = seedFor(kind),
      { match, players } = setup(seed);
    try {
      move(players, 'a', site.position);
      step(match, 50);
      const before = match.view('a').progression.level;
      assert.ok(intent(match, 'a', 'interaction', site.id));
      assert.ok(choose(match, 'a', 'progress'));
      assert.equal(match.view('a').progression.level, before + 1);
    } finally {
      match.dispose();
    }
  }
  for (const [choice, stat] of [
    ['physical', 'physical'],
    ['ability', 'ability'],
  ]) {
    const { seed, site } = seedFor('growing-tree'),
      { match, players } = setup(seed);
    try {
      move(players, 'a', site.position);
      step(match, 50);
      const before = self(match, 'a').stats[stat];
      assert.ok(intent(match, 'a', 'interaction', site.id));
      assert.ok(choose(match, 'a', choice));
      assert.equal(self(match, 'a').stats[stat], before * 1.05);
    } finally {
      match.dispose();
    }
  }
});

test('POI purchases reject insufficient funds and charge successful choice once', () => {
  const { seed, site } = seedFor('frozen-specimen'),
    { match, players } = setup(seed);
  try {
    move(players, 'a', site.position);
    step(match, 50);
    assert.ok(intent(match, 'a', 'interaction', site.id));
    assert.ok(match.view('a').offer.choices.includes('rare'));
    const stats = self(match, 'a').stats;
    assert.equal(choose(match, 'a', 'rare'), false);
    assert.equal(match.view('a').progression.currency, 0);
    assert.deepEqual(self(match, 'a').stats, stats);
    assert.equal(
      match.view('a').pointsOfInterest.find((p) => p.id === site.id).status,
      'available',
    );
    assert.ok(match.walletTransaction('a', 'fund', 'grant', 5).accepted);
    step(match, 2100);
    assert.ok(intent(match, 'a', 'interaction', site.id));
    assert.ok(choose(match, 'a', 'rare'));
    assert.equal(match.view('a').progression.currency, 0);
    assert.equal(intent(match, 'a', 'interaction', site.id), false);
  } finally {
    match.dispose();
  }
});

test('firmware effect identities grant progress and apply their observable effects', () => {
  const expected = new Set([
    'delicious',
    'lethal',
    'medicinal',
    'inert',
    'poisonous',
    'refreshing',
    'spicy',
    'stinging',
    'yummy',
    'entertaining',
    'prolific',
    'deafening',
    'hallucinogenic',
    'mystic',
    'amusing',
    'nutritious',
  ]);
  const seen = new Set();
  for (let attempt = 0; attempt < 240 && seen.size < expected.size; attempt++) {
    const { match, players, arena } = setup();
    try {
      assert.ok(match.setModifiers('a', mods({ senses: 400 })));
      const point = initialFirmwarePoint(arena);
      move(players, 'a', point);
      step(match, 10);
      const module = match
        .view('a')
        .firmware.find(
          (x) => Math.hypot(x.position.x - point.x, x.position.z - point.z) < 1,
        );
      assert.ok(module);
      assert.ok(intent(match, 'a', 'scan', module.id));
      const effect = match.view('a').firmware.find((x) => x.id === module.id)
        .knowledge.effect;
      if (seen.has(effect)) continue;
      const before = match.view('a');
      const beforeStats = self(match, 'a').stats;
      consumeFirmware(match, module);
      const after = match.view('a');
      assert.equal(after.lastFirmware.effect, effect);
      const tuning = SOURCE_GAMEPLAY.mushroom;
      const bonus = effect === 'delicious' ? 0.3 : effect === 'yummy' ? 0.1 : 0;
      const expectedProgress =
        tuning.bites *
          (tuning.staticXp +
            (before.progression.required *
              tuning.dynamicXp *
              beforeStats.vegetationProgress) /
              100) +
        before.progression.required * bonus;
      assert.ok(after.progression.level <= before.progression.level + 1);
      const spent =
        after.progression.level > before.progression.level
          ? before.progression.required
          : 0;
      assert.ok(
        Math.abs(
          after.progression.progress +
            spent -
            before.progression.progress -
            expectedProgress,
        ) < 1e-6,
        `${effect} progress`,
      );
      if (['lethal', 'poisonous', 'stinging'].includes(effect)) {
        assert.ok(
          self(match, 'a').statuses.some(
            (s) => s.kind === 'corrosion' && s.remaining > 3800,
          ),
          effect,
        );
      } else if (effect === 'medicinal') {
        match.damagePlayer('a', 20);
        const damaged = self(match, 'a').health.hull;
        step(match, 1000);
        assert.ok(self(match, 'a').health.hull > damaged);
      } else if (effect === 'spicy') assert.ok(after.thermal.heat >= 25);
      else if (effect === 'refreshing') assert.ok(after.thermal.cold >= 25);
      else if (effect === 'hallucinogenic')
        assert.equal(after.firmwareSensory.distortion, true);
      else if (effect === 'deafening')
        assert.equal(after.firmwareSensory.deafened, true);
      else if (effect === 'mystic')
        assert.ok(
          [
            'physical',
            'ability',
            'maximumHealth',
            'speed',
            'regeneration',
          ].some((k) => self(match, 'a').stats[k] > beforeStats[k]),
        );
      else if (effect === 'entertaining' || effect === 'amusing') {
        assert.ok(match.recruitCompanion('a', 'one', 0));
        assert.ok(match.recruitCompanion('a', 'two', 0));
        assert.equal(match.recruitCompanion('a', 'three', 0), false);
      }
      seen.add(effect);
    } finally {
      match.dispose();
    }
  }
  assert.deepEqual([...seen].sort(), [...expected].sort());
});

test('recruited companion attacks marked visible opponents and stops while owner chooses', () => {
  const { match, players, world, arena } = setup();
  try {
    let point;
    for (let x = -18; x <= 18 && !point; x += 2)
      for (let z = -18; z <= 18 && !point; z += 2)
        if (arenaPointClear(arena.obstacles, { x, z }, 5)) point = { x, z };
    move(players, 'a', point);
    move(players, 'b', { x: point.x + 5, z: point.z });
    step(match, 100);
    assert.ok(match.recruitCompanion('a', 'combat', 0));
    const ally = match.view('a').bots.find((b) => b.ownerId === 'a');
    assert.ok(ally);
    const allyBody = world.bodies
      .getAll()
      .find(
        (b) =>
          b.isDynamic() &&
          Math.hypot(
            b.translation().x - ally.position.x,
            b.translation().z - ally.position.z,
          ) < 0.01,
      );
    assert.ok(allyBody);
    allyBody.setTranslation({ x: point.x + 2, y: 0.25, z: point.z }, true);
    move(players, 'b', { x: point.x + 3.5, z: point.z });
    assert.ok(match.markAllyTarget('a', 'b'));
    step(match, 1500, 50);
    assert.ok(
      match
        .takeDamageLedger()
        .some(
          ({ event, result }) =>
            event.ownerId === ally.id &&
            event.targetId === 'b' &&
            result.hull > 0,
        ),
    );
    assert.ok(
      match.setOffer('a', { id: 'pause', revision: 0, choices: ['none'] }),
    );
    step(match, 2500, 50);
    assert.equal(
      match.takeDamageLedger().some((entry) => entry.event.ownerId === ally.id),
      false,
    );
    assert.equal(match.markAllyTarget('a', ally.id), false);
    assert.ok(match.setPlayerVisibility('a', 'b', false));
    assert.equal(match.markAllyTarget('a', 'b'), false);
  } finally {
    match.dispose();
  }
});

test('sun-dial changes future day and night lengths in opposite directions', () => {
  for (const [choice, night, day] of [
    ['summer', 90000, 210000],
    ['winter', 150000, 150000],
  ]) {
    const { seed, site } = seedFor('sun-dial'),
      { match, players } = setup(seed);
    try {
      for (const id of ids)
        assert.ok(
          match.setModifiers(
            id,
            mods({
              maximumHealth: 100000,
              regeneration: 10000,
              damageResistance: 100,
              heatAdaptation: 100,
              coldAdaptation: 100,
            }),
          ),
        );
      move(players, 'a', site.position);
      step(match, 50);
      assert.ok(intent(match, 'a', 'interaction', site.id));
      assert.ok(choose(match, 'a', choice));
      const current = match.view('a').worldClock;
      assert.equal(current.nextTransitionAt, day);
      step(match, current.nextTransitionAt - match.view('a').time, 500);
      const next = match.view('a').worldClock;
      assert.equal(next.phase, 'night');
      assert.equal(next.nextTransitionAt - next.phaseStartedAt, night);
      step(match, night, 500);
      const last = match.view('a').worldClock;
      assert.equal(last.phase, 'day');
      assert.equal(last.nextTransitionAt - last.phaseStartedAt, day);
    } finally {
      match.dispose();
    }
  }
});

test('nest defense awards an ally after a minute and cancels on owner death', () => {
  for (const die of [false, true]) {
    const { seed, site } = seedFor('unattended-nest'),
      { match, players } = setup(seed);
    try {
      assert.ok(
        match.setModifiers(
          'a',
          mods({
            social: 30,
            damageResistance: 100,
            heatAdaptation: 100,
            coldAdaptation: 100,
            senses: 400,
          }),
        ),
      );
      move(players, 'a', site.position);
      step(match, 50);
      for (const bot of match.view('a').bots)
        match.damageBatch([
          {
            targetId: bot.id,
            ownerId: null,
            channel: 'direct',
            amount: 10000,
            depth: 0,
          },
        ]);
      assert.ok(intent(match, 'a', 'interaction', site.id));
      assert.ok(choose(match, 'a', 'defend'));
      assert.equal(match.view('a').nestDefenses.length, 1);
      if (die) {
        assert.ok(
          match.accept({ kind: 'eliminate', playerId: 'a', ownerId: 'b' }),
        );
        step(match, 100);
        assert.equal(match.view('a').nestDefenses.length, 0);
      } else {
        for (let elapsed = 0; elapsed < 59000; elapsed += 250) {
          for (const bot of match.view('a').bots)
            if (
              Math.hypot(
                bot.position.x - site.position.x,
                bot.position.z - site.position.z,
              ) < 8
            )
              match.damageBatch([
                {
                  targetId: bot.id,
                  ownerId: null,
                  channel: 'direct',
                  amount: 10000,
                  depth: 0,
                },
              ]);
          step(match, 250);
        }
        assert.equal(match.view('a').nestDefenses.length, 1);
        step(match, 1100, 100);
        assert.equal(match.view('a').nestDefenses.length, 0);
        assert.ok(
          match
            .view('a')
            .bots.some(
              (b) => b.ownerId === 'a' && b.kind === 'charmed' && b.tier === 2,
            ),
        );
      }
    } finally {
      match.dispose();
    }
  }
});

test('reservation expires, disconnect releases it and rediscovery emits once', () => {
  for (const disconnect of [false, true]) {
    const { match, players, arena } = setup();
    try {
      const site = sites(arena, 42).find((p) => p.kind === 'chaos-tree');
      move(players, 'a', site.position);
      move(players, 'b', { x: site.position.x + 1, z: site.position.z });
      step(match, 100);
      const first = match.takeDiscoveries();
      assert.equal(
        first.filter((x) => x.playerId === 'a' && x.siteId === site.id).length,
        1,
      );
      assert.ok(intent(match, 'a', 'interaction', site.id));
      if (disconnect)
        assert.ok(match.accept({ kind: 'disconnect', playerId: 'a' }));
      else step(match, 10100, 100);
      assert.ok(intent(match, 'b', 'interaction', site.id));
      assert.ok(choose(match, 'b', 'currency'));
      step(match, 100);
      assert.equal(
        match
          .takeDiscoveries()
          .filter((x) => x.playerId === 'a' && x.siteId === site.id).length,
        0,
      );
    } finally {
      match.dispose();
    }
  }
});

test('shelter occupancy, size duration and selection cannot restart protection', () => {
  for (const size of [-50, 0, 100]) {
    const { match, players, arena } = setup();
    try {
      assert.ok(match.setModifiers('a', mods({ size })));
      move(players, 'a', arena.shelters[0]);
      move(players, 'b', arena.shelters[0]);
      step(match, 100);
      assert.ok(intent(match, 'a', 'shelter', 'shelter-0'));
      assert.equal(intent(match, 'b', 'shelter', 'shelter-0'), false);
      const shelter = self(match, 'a').shelter;
      const tuning = SOURCE_GAMEPLAY.burrow;
      const duration =
        ((1 - tuning.entryPenalty) * tuning.lifetimeMs) /
        Math.max(
          0.01,
          sourceCurve(
            tuning.sizeContribution,
            self(match, 'a').stats.size / 100,
          ),
        );
      assert.ok(
        Math.abs(shelter.until - match.view('a').time - duration) < 1e-6,
      );
      const nearSite = match
        .view('a')
        .pointsOfInterest.find(
          (p) =>
            Math.hypot(
              p.position.x - arena.shelters[0].x,
              p.position.z - arena.shelters[0].z,
            ) < 3,
        );
      if (nearSite)
        assert.equal(intent(match, 'a', 'interaction', nearSite.id), false);
      assert.equal(match.canUseOwnedOffense('a'), false);
      assert.ok(
        match.setOffer('a', {
          id: 'shelter-choice',
          revision: 0,
          choices: ['none'],
        }),
      );
      step(match, Math.floor(duration) - 100, 100);
      assert.ok(self(match, 'a').shelter);
      step(match, 200);
      assert.equal(self(match, 'a').shelter, null);
      assert.equal(intent(match, 'a', 'shelter', 'shelter-0'), false);
    } finally {
      match.dispose();
    }
  }
});

test('delayed offspring and decoys expire and are canceled on disconnect', () => {
  const { match } = setup();
  try {
    assert.ok(match.scheduleAlly('a', 'offspring', 500, 2000));
    assert.ok(match.scheduleAlly('a', 'decoy', 0, 1000));
    step(match, 100);
    assert.equal(
      match
        .view('a')
        .bots.filter((b) => b.ownerId === 'a' && b.kind === 'decoy').length,
      1,
    );
    step(match, 500);
    assert.equal(
      match
        .view('a')
        .bots.filter((b) => b.ownerId === 'a' && b.kind === 'offspring').length,
      1,
    );
    step(match, 600);
    assert.equal(
      match
        .view('a')
        .bots.filter((b) => b.ownerId === 'a' && b.kind === 'decoy').length,
      0,
    );
    assert.ok(match.scheduleAlly('a', 'summoned', 1000, 5000));
    assert.ok(match.accept({ kind: 'disconnect', playerId: 'a' }));
    step(match, 1200);
    assert.equal(
      match.view('b').bots.some((b) => b.ownerId === 'a'),
      false,
    );
  } finally {
    match.dispose();
  }
});

test('firmware mapping is consistent within a field, private and regenerated', () => {
  const positions = Array.from({ length: 64 }, (_, i) => ({ x: i, z: 0 }));
  const first = new FirmwareField(positions),
    second = new FirmwareField(positions);
  function mapping(field) {
    const visible = field.visible(),
      result = new Map();
    for (const module of visible) {
      assert.deepEqual(Object.keys(module).sort(), [
        'appearance',
        'id',
        'position',
        'stage',
      ]);
      const taken = field.take(module.id);
      assert.ok(taken);
      if (result.has(module.appearance))
        assert.equal(taken.effect, result.get(module.appearance));
      result.set(module.appearance, taken.effect);
    }
    return result;
  }
  const one = mapping(first),
    two = mapping(second);
  assert.ok(one.size > 1);
  assert.ok(
    [...one].some(
      ([appearance, effect]) =>
        two.has(appearance) && two.get(appearance) !== effect,
    ),
  );
  assert.equal(identificationChance(0, 0), 0);
  assert.ok(
    Math.abs(identificationChance(100, 0) - 0.21147609424591068) < 1e-12,
  );
  assert.equal(identificationChance(250, 0), 1);
  assert.equal(
    identificationChance(100, 25),
    identificationChance(100, 0) + 0.25,
  );
});

test('random stat, cooldown, resistance and recruitment POI choices produce their effects', () => {
  for (const kind of ['chaos-tree', 'growing-tree']) {
    const { seed, site } = seedFor(kind),
      { match, players } = setup(seed);
    try {
      move(players, 'a', site.position);
      step(match, 50);
      const before = self(match, 'a').stats;
      assert.ok(intent(match, 'a', 'interaction', site.id));
      assert.ok(choose(match, 'a', 'random'));
      const after = self(match, 'a').stats;
      assert.equal(
        [
          'physical',
          'ability',
          'maximumHealth',
          'speed',
          'regeneration',
        ].filter((k) => after[k] > before[k]).length,
        1,
      );
    } finally {
      match.dispose();
    }
  }
  {
    const { seed, site } = seedFor('lotus-plant'),
      { match, players } = setup(seed);
    try {
      assert.ok(match.setModifiers('a', mods({ size: -25 })));
      move(players, 'a', site.position);
      step(match, 50);
      assert.ok(intent(match, 'a', 'interaction', site.id));
      assert.ok(choose(match, 'a', 'cooldown'));
      assert.equal(self(match, 'a').stats.cooldowns, 95);
    } finally {
      match.dispose();
    }
  }
  {
    const { seed, site } = seedFor('mud-pond'),
      { match, players } = setup(seed);
    try {
      move(players, 'a', site.position);
      step(match, 50);
      assert.ok(intent(match, 'a', 'interaction', site.id));
      assert.ok(!match.view('a').offer.choices.includes('tail'));
      assert.ok(choose(match, 'a', 'bath'));
      const hp = self(match, 'a').health.hull;
      match.damagePlayer('a', 20);
      assert.equal(self(match, 'a').health.hull, hp - 15);
    } finally {
      match.dispose();
    }
  }
  {
    const { seed, site } = seedFor('frozen-specimen'),
      { match, players } = setup(seed);
    try {
      move(players, 'a', site.position);
      step(match, 50);
      assert.ok(intent(match, 'a', 'interaction', site.id));
      assert.ok(choose(match, 'a', 'recruit'));
      assert.equal(
        match
          .view('a')
          .bots.filter((b) => b.ownerId === 'a' && b.kind === 'charmed').length,
        1,
      );
      assert.equal(intent(match, 'a', 'interaction', site.id), false);
    } finally {
      match.dispose();
    }
  }
});

test('friendship offers can only be accepted by their intended player', () => {
  const { match, players, world } = setup();
  const random = Math.random;
  try {
    for (const id of ['a', 'b'])
      assert.ok(
        match.setModifiers(
          id,
          mods({ social: 100, senses: 400, maximumHealth: 1000 }),
        ),
      );
    const bot = match.view('a').bots.find((b) => !b.elite);
    assert.ok(bot);
    const body = world.bodies
      .getAll()
      .find(
        (b) =>
          b.isDynamic() &&
          Math.hypot(
            b.translation().x - bot.position.x,
            b.translation().z - bot.position.z,
          ) < 0.01,
      );
    assert.ok(body);
    move(players, 'a', { x: bot.position.x + 1, z: bot.position.z });
    Math.random = () => 0;
    let offered;
    for (let attempt = 0; attempt < 60 && !offered; attempt++) {
      step(match, 100);
      offered = match.view('a').bots.find((entry) => entry.friendshipUntil);
    }
    assert.ok(offered);
    const offeredBody = world.bodies
      .getAll()
      .find(
        (entry) =>
          entry.isDynamic() &&
          Math.hypot(
            entry.translation().x - offered.position.x,
            entry.translation().z - offered.position.z,
          ) < 0.01,
      );
    assert.ok(offeredBody);
    const position = offeredBody.translation();
    move(players, 'a', { x: position.x + 1, z: position.z });
    move(players, 'b', { x: position.x - 1, z: position.z });
    assert.equal(intent(match, 'b', 'charm', offered.id), false);
    assert.ok(intent(match, 'a', 'charm', offered.id));
    assert.equal(intent(match, 'b', 'charm', offered.id), false);
    const copies = match
      .view('b')
      .bots.filter((entry) => entry.id === offered.id);
    assert.equal(copies.length, 1);
    assert.equal(copies[0].ownerId, 'a');
  } finally {
    Math.random = random;
    match.dispose();
  }
});

test('growth near a wall and craft avoids overlap, and pulls stop at walls', () => {
  const { match, players, arena } = setup();
  try {
    const wall = arena.obstacles.find((box) => {
      const a = { x: box.x - box.width / 2 - 1, z: box.z },
        b = { x: box.x + box.width / 2 + 1, z: box.z };
      return (
        arenaPointClear(arena.obstacles, a, 0.6) &&
        arenaPointClear(arena.obstacles, b, 0.6) &&
        Math.hypot(a.x - b.x, a.z - b.z) < 15
      );
    });
    assert.ok(wall);
    const a = { x: wall.x - wall.width / 2 - 1, z: wall.z },
      b = { x: wall.x + wall.width / 2 + 1, z: wall.z };
    move(players, 'a', a);
    move(players, 'b', b);
    step(match, 50);
    const first = players.get('a').translation().x,
      second = players.get('b').translation().x;
    assert.ok(match.startPull('a', 'b', 1000, 20));
    step(match, 500, 50);
    assert.ok(Math.abs(players.get('a').translation().x - first) < 0.05);
    assert.ok(Math.abs(players.get('b').translation().x - second) < 0.05);
    assert.ok(match.setModifiers('a', mods({ size: 200 })));
    step(match, 100);
    const body = players.get('a'),
      pos = body.translation(),
      radius = body.collider(0).radius();
    if (radius > 0.5) assert.ok(arenaPointClear(arena.obstacles, pos, radius));
    assert.ok(
      Math.hypot(
        pos.x - players.get('b').translation().x,
        pos.z - players.get('b').translation().z,
      ) >=
        radius + players.get('b').collider(0).radius() - 0.01,
    );
  } finally {
    match.dispose();
  }
});

test('mushroom spread advances subsequent firmware generation', () => {
  let data;
  for (let seed = 0; seed < 200; seed++) {
    const arena = createArena(seed),
      site = sites(arena, seed).find((p) => p.kind === 'giant-mushroom');
    if (
      site &&
      arena.shelters
        .slice(0, 2)
        .every((p) => terrainAt(arena, p.x, p.z) !== 'water')
    ) {
      data = { seed, site };
      break;
    }
  }
  assert.ok(data);
  const { match, players, arena } = setup(data.seed);
  try {
    for (const id of ids)
      assert.ok(
        match.setModifiers(
          id,
          mods({
            senses: 400,
            maximumHealth: 10000,
            regeneration: 1000,
            damageResistance: 100,
            heatAdaptation: 100,
            coldAdaptation: 100,
          }),
        ),
      );
    move(players, 'a', data.site.position);
    step(match, 50);
    assert.ok(intent(match, 'a', 'interaction', data.site.id));
    assert.ok(choose(match, 'a', 'spread'));
    assertAcceleratedFirmwareSpawn(match, players, arena);
  } finally {
    match.dispose();
  }
});

test('nest salvage choice releases rare meat and consumes the site', () => {
  const { seed, site } = seedFor('unattended-nest'),
    { match, players } = setup(seed);
  try {
    move(players, 'a', site.position);
    step(match, 50);
    for (const bot of match.view('a').bots)
      match.damageBatch([
        {
          targetId: bot.id,
          ownerId: 'a',
          channel: 'direct',
          amount: 10000,
          depth: 0,
        },
      ]);
    assert.ok(intent(match, 'a', 'interaction', site.id));
    assert.ok(choose(match, 'a', 'crack'));
    assert.ok(
      match
        .view('a')
        .resources.some(
          (r) =>
            r.source === 'meat' &&
            r.rarity === 'rare' &&
            Math.hypot(
              r.position.x - site.position.x,
              r.position.z - site.position.z,
            ) < 0.01,
        ),
    );
    assert.equal(intent(match, 'a', 'interaction', site.id), false);
  } finally {
    match.dispose();
  }
});

test('grown craft reaches target once per attack after collider resize', () => {
  const { match, players, arena } = setup();
  try {
    let p;
    for (let x = -18; x <= 18 && !p; x += 2)
      for (let z = -18; z <= 18 && !p; z += 2)
        if (arenaPointClear(arena.obstacles, { x, z }, 5)) p = { x, z };
    move(players, 'a', p);
    move(players, 'b', { x: p.x + 3, z: p.z });
    assert.ok(match.setModifiers('a', mods({ size: 200 })));
    step(match, 50);
    assert.equal(players.get('a').collider(0).radius(), 1.5);
    match.takeDamageLedger();
    assert.ok(
      match.consume({
        matchId: 'room',
        playerId: 'a',
        sequence: 1,
        kind: 'control',
        x: 0,
        y: 0,
        aim: Math.PI / 2,
        buttons: 1,
      }),
    );
    step(match, 300, 50);
    const hits = match
      .takeDamageLedger()
      .filter(
        (x) =>
          x.event.ownerId === 'a' &&
          x.event.targetId === 'b' &&
          x.event.channel === 'contact',
      );
    assert.equal(hits.length, 1);
    assert.ok(hits[0].result.hull > 0);
  } finally {
    match.dispose();
  }
});

test('paid companion recruitment is atomic and respects capacity', () => {
  const { match } = setup();
  try {
    assert.equal(match.recruitCompanion('a', 'purchase', 5), false);
    assert.equal(match.view('a').progression.currency, 0);
    assert.ok(match.walletTransaction('a', 'fund', 'grant', 10).accepted);
    assert.ok(match.recruitCompanion('a', 'purchase', 5));
    assert.equal(match.view('a').progression.currency, 5);
    assert.equal(match.recruitCompanion('a', 'purchase', 5), false);
    assert.equal(match.recruitCompanion('a', 'second', 5), false);
    assert.equal(match.view('a').progression.currency, 5);
    assert.equal(
      match.view('a').bots.filter((b) => b.ownerId === 'a').length,
      1,
    );
  } finally {
    match.dispose();
  }
});

test('actual closing boundary defeats shelter and eliminates occupants', () => {
  const { match, players, arena } = setup(42, {
    shrinkStartMs: 1000,
    tinyAtMs: 3000,
    collapseAtMs: 6000,
    boundaryDamagePerSecond: 1000,
  });
  try {
    move(players, 'b', { x: 0, z: 0 });
    move(players, 'c', { x: 2, z: 0 });
    move(players, 'd', { x: 0, z: 2 });
    move(players, 'a', arena.shelters[0]);
    step(match, 50);
    assert.ok(intent(match, 'a', 'shelter', 'shelter-0'));
    for (
      let i = 0;
      i < 80 &&
      self(match, 'a').life.kind === 'alive' &&
      match.view('a').phase === 'running';
      i++
    )
      match.advance(50);
    assert.equal(self(match, 'a').life.kind, 'eliminated');
  } finally {
    match.dispose();
  }
});

function findFirmwareEffect(wanted) {
  for (let attempt = 0; attempt < 250; attempt++) {
    const f = setup();
    const { match, players, arena } = f;
    assert.ok(
      match.setModifiers(
        'a',
        mods({
          senses: 400,
          heatAdaptation: 100,
          coldAdaptation: 100,
          maximumHealth: 1000,
        }),
      ),
    );
    match.repairPlayer('a', 1000, false);
    const point = initialFirmwarePoint(arena);
    move(players, 'a', point);
    step(match, 10);
    const module = match
      .view('a')
      .firmware.find(
        (m) => Math.hypot(m.position.x - point.x, m.position.z - point.z) < 1,
      );
    assert.ok(intent(match, 'a', 'scan', module.id));
    if (
      match.view('a').firmware.find((m) => m.id === module.id).knowledge
        .effect === wanted
    )
      return { ...f, module };
    match.dispose();
  }
  throw Error(`Did not encounter ${wanted}`);
}

function consumeFirmware(match, module) {
  assert.ok(intent(match, 'a', 'use-firmware', module.id));
  for (let i = 0; i < 30 && !match.view('a').lastFirmware; i++)
    step(match, 100, 100);
  assert.ok(match.view('a').lastFirmware);
}

test('harmful firmware ticks four times and corrosion immunity blocks it', () => {
  for (const [effect, amount] of [
    ['stinging', 2],
    ['poisonous', 5],
    ['lethal', null],
  ]) {
    {
      const { match, module } = findFirmwareEffect(effect);
      try {
        consumeFirmware(match, module);
        step(match, 4000, 100);
        const damage = match
          .takeDamageLedger()
          .filter(
            (x) => x.event.channel === 'corrosion' && x.event.targetId === 'a',
          )
          .reduce((sum, x) => sum + x.result.hull, 0);
        assert.equal(
          damage,
          (amount ?? self(match, 'a').stats.maximumHealth * 0.2) * 4,
        );
        assert.equal(
          self(match, 'a').statuses.some((s) => s.kind === 'corrosion'),
          false,
        );
      } finally {
        match.dispose();
      }
    }
    {
      const { match, module } = findFirmwareEffect(effect);
      try {
        assert.ok(match.setStatusImmunity('a', 'corrosion', true));
        consumeFirmware(match, module);
        step(match, 4000, 100);
        assert.equal(
          match
            .takeDamageLedger()
            .some(
              (x) =>
                x.event.channel === 'corrosion' && x.event.targetId === 'a',
            ),
          false,
        );
      } finally {
        match.dispose();
      }
    }
  }
});

test('medicinal firmware heals over four seconds and sensory effects expire', () => {
  {
    const { match, module } = findFirmwareEffect('medicinal');
    try {
      match.damagePlayer('a', 400);
      consumeFirmware(match, module);
      const before = self(match, 'a').health.hull;
      match.takeDamageLedger();
      step(match, 4000, 100);
      const stats = self(match, 'a').stats;
      const damage = match
        .takeDamageLedger()
        .filter((entry) => entry.event.targetId === 'a')
        .reduce((sum, entry) => sum + entry.result.hull, 0);
      assert.ok(
        Math.abs(
          self(match, 'a').health.hull -
            before +
            damage -
            (stats.maximumHealth * 0.05 * 3.9 + stats.regeneration * 0.4),
        ) < 0.001,
      );
      const end = self(match, 'a').health.hull;
      step(match, 2000, 100);
      const laterDamage = match
        .takeDamageLedger()
        .filter((entry) => entry.event.targetId === 'a')
        .reduce((sum, entry) => sum + entry.result.hull, 0);
      assert.ok(
        Math.abs(
          self(match, 'a').health.hull -
            end +
            laterDamage -
            stats.regeneration * 0.2,
        ) < 0.001,
      );
    } finally {
      match.dispose();
    }
  }
  for (const [effect, key] of [
    ['deafening', 'deafened'],
    ['hallucinogenic', 'distortion'],
  ]) {
    const { match, module } = findFirmwareEffect(effect);
    try {
      consumeFirmware(match, module);
      assert.equal(match.view('a').firmwareSensory[key], true);
      step(match, 10100, 100);
      assert.equal(match.view('a').firmwareSensory[key], false);
    } finally {
      match.dispose();
    }
  }
});

test('nest elite roll finds safe space when initial elite sites are occupied', () => {
  const { seed, site } = seedFor('unattended-nest'),
    { match, players, arena } = setup(seed);
  const random = Math.random;
  try {
    assert.ok(match.setModifiers('a', mods({ senses: 400 })));
    move(players, 'a', site.position);
    step(match, 50);
    assert.ok(intent(match, 'a', 'interaction', site.id));
    const occupied = { x: arena.eliteSites[0].x + 1, z: arena.eliteSites[0].z };
    move(players, 'b', occupied);
    Math.random = () => 0;
    assert.ok(choose(match, 'a', 'crack'));
    let elite;
    for (const point of arena.eliteSites) {
      move(players, 'c', point);
      elite = match.view('c').bots.find((b) => b.elite);
      if (elite) break;
    }
    assert.ok(elite);
    assert.ok(
      Math.hypot(
        elite.position.x - occupied.x,
        elite.position.z - occupied.z,
      ) >=
        elite.radius + 0.5,
    );
    assert.ok(arenaPointClear(arena.obstacles, elite.position, elite.radius));
    for (const other of match.view('c').bots.filter((b) => b.id !== elite.id))
      assert.ok(
        Math.hypot(
          other.position.x - elite.position.x,
          other.position.z - elite.position.z,
        ) >=
          other.radius + elite.radius,
      );
    assert.ok(
      match
        .view('a')
        .resources.some(
          (r) =>
            r.rarity === 'rare' &&
            r.source === 'meat' &&
            Math.hypot(
              r.position.x - site.position.x,
              r.position.z - site.position.z,
            ) < 0.01,
        ),
    );
  } finally {
    Math.random = random;
    match.dispose();
  }
});

test('legendary site purchase consumes exactly its price', () => {
  const { seed, site } = seedFor('frozen-specimen'),
    { match, players } = setup(seed);
  try {
    move(players, 'a', site.position);
    step(match, 50);
    assert.ok(match.walletTransaction('a', 'fund', 'grant', 15).accepted);
    assert.ok(intent(match, 'a', 'interaction', site.id));
    assert.ok(match.view('a').offer.choices.includes('legendary'));
    assert.ok(choose(match, 'a', 'legendary'));
    assert.equal(match.view('a').progression.currency, 0);
    assert.equal(intent(match, 'a', 'interaction', site.id), false);
  } finally {
    match.dispose();
  }
});

test('refreshing firmware reduces an active dash cooldown', () => {
  const { match, players, module } = findFirmwareEffect('refreshing');
  try {
    assert.ok(
      match.consume({
        matchId: 'room',
        playerId: 'a',
        sequence: 1,
        kind: 'control',
        x: 0,
        y: 0,
        aim: 0,
        buttons: 4,
      }),
    );
    step(match, 500, 50);
    move(players, 'a', module.position);
    assert.ok(
      match.consume({
        matchId: 'room',
        playerId: 'a',
        sequence: 2,
        kind: 'control',
        x: 0,
        y: 0,
        aim: 0,
        buttons: 0,
      }),
    );
    const before = match
      .view('a')
      .equipment.learned.find((a) => a.id === 'basic-dash').readyAt;
    assert.ok(before > match.view('a').time);
    consumeFirmware(match, module);
    const after = match
      .view('a')
      .equipment.learned.find((a) => a.id === 'basic-dash').readyAt;
    assert.equal(
      after,
      Math.max(match.view('a').lastFirmware.at, before - 3000),
    );
  } finally {
    match.dispose();
  }
});

test('firmware identification knowledge survives reconnect and resets with a new match', () => {
  const { match, players, arena } = setup();
  try {
    assert.ok(match.setModifiers('a', mods({ senses: 400 })));
    const p = initialFirmwarePoint(arena);
    move(players, 'a', p);
    step(match, 50);
    const module = match
      .view('a')
      .firmware.find(
        (m) => Math.hypot(m.position.x - p.x, m.position.z - p.z) < 1,
      );
    assert.ok(intent(match, 'a', 'scan', module.id));
    const known = match
      .view('a')
      .firmware.find((m) => m.id === module.id).knowledge;
    assert.ok(match.accept({ kind: 'disconnect', playerId: 'a' }));
    assert.ok(match.accept({ kind: 'connect', playerId: 'a' }));
    assert.deepEqual(
      match.view('a').firmware.find((m) => m.id === module.id).knowledge,
      known,
    );
    const next = setup();
    try {
      assert.ok(
        next.match
          .view('a')
          .firmware.every((m) => m.knowledge.kind === 'unknown'),
      );
    } finally {
      next.match.dispose();
    }
  } finally {
    match.dispose();
  }
});

test('companion follows its owner and its kill gives owner salvage credit', () => {
  const { match, players, world, arena } = setup();
  try {
    let p;
    for (let x = -18; x <= 18 && !p; x += 2)
      for (let z = -18; z <= 18 && !p; z += 2)
        if (
          terrainAt(arena, x, z) === 'grass' &&
          arenaPointClear(arena.obstacles, { x, z }, 7)
        )
          p = { x, z };
    move(players, 'a', p);
    move(players, 'b', { x: p.x + 15, z: p.z });
    move(players, 'c', { x: p.x + 18, z: p.z });
    move(players, 'd', { x: p.x + 20, z: p.z });
    step(match, 50);
    for (const bot of match.view('a').bots)
      match.damageBatch([
        {
          targetId: bot.id,
          ownerId: null,
          channel: 'direct',
          amount: 10000,
          depth: 0,
        },
      ]);
    assert.ok(match.recruitCompanion('a', 'follow', 0));
    const ally = match.view('a').bots.find((b) => b.ownerId === 'a');
    const body = world.bodies
      .getAll()
      .find(
        (b) =>
          b.isDynamic() &&
          Math.hypot(
            b.translation().x - ally.position.x,
            b.translation().z - ally.position.z,
          ) < 0.01,
      );
    body.setTranslation({ x: p.x - 6, y: 0.25, z: p.z }, true);
    const before = body.translation().x;
    step(match, 1000, 50);
    assert.ok(body.translation().x > before);
    body.setTranslation({ x: p.x + 2, y: 0.25, z: p.z }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    move(players, 'b', { x: p.x + 3.5, z: p.z });
    match.damagePlayer('b', 64);
    assert.ok(match.markAllyTarget('a', 'b'));
    step(match, 1500, 50);
    assert.equal(self(match, 'b').life.kind, 'eliminated');
    const drop = match
      .view('a')
      .resources.find(
        (r) =>
          r.source === 'meat' &&
          Math.hypot(r.position.x - (p.x + 3.5), r.position.z - p.z) < 2,
      );
    assert.ok(drop);
    move(players, 'a', drop.position);
    step(match, 100);
    const entry = match
      .takeCollections()
      .find((e) => e.resourceId === drop.id && e.playerId === 'a');
    assert.equal(entry?.provenance, 'ally-kill');
    assert.equal(entry.ownerId, 'a');
  } finally {
    match.dispose();
  }
});

test('pull constraints stop after target death and owner disconnect', () => {
  const { match, players, arena } = setup();
  try {
    let p;
    for (let x = -18; x <= 18 && !p; x += 2)
      for (let z = -18; z <= 18 && !p; z += 2)
        if (arenaPointClear(arena.obstacles, { x, z }, 5)) p = { x, z };
    move(players, 'a', p);
    move(players, 'b', { x: p.x + 5, z: p.z });
    step(match, 50);
    assert.ok(match.startPull('a', 'b', 5000, 20));
    assert.ok(match.accept({ kind: 'eliminate', playerId: 'b', ownerId: 'c' }));
    step(match, 100);
    assert.equal(match.startPull('a', 'b', 1000, 20), false);
    move(players, 'c', { x: p.x + 5, z: p.z });
    assert.ok(match.startPull('a', 'c', 5000, 20));
    assert.ok(match.accept({ kind: 'disconnect', playerId: 'a' }));
    step(match, 100);
    assert.equal(match.startPull('a', 'c', 1000, 20), false);
  } finally {
    match.dispose();
  }
});

test('failed firmware scans are stable until sensing improves', () => {
  const { match, players, arena } = setup();
  try {
    assert.ok(match.setModifiers('a', mods({ senses: -100 })));
    const point = initialFirmwarePoint(arena);
    move(players, 'a', point);
    step(match, 50);
    const module = match
      .view('a')
      .firmware.find(
        (m) => Math.hypot(m.position.x - point.x, m.position.z - point.z) < 1,
      );
    for (let i = 0; i < 5; i++) {
      assert.ok(intent(match, 'a', 'scan', module.id));
      assert.equal(
        match.view('a').firmware.find((m) => m.id === module.id).knowledge.kind,
        'failed',
      );
    }
    assert.ok(match.setModifiers('a', mods({ senses: 400 })));
    assert.ok(intent(match, 'a', 'scan', module.id));
    assert.equal(
      match.view('a').firmware.find((m) => m.id === module.id).knowledge.kind,
      'identified',
    );
    move(players, 'a', { x: point.x + 10, z: point.z });
    assert.equal(intent(match, 'a', 'scan', module.id), false);
  } finally {
    match.dispose();
  }
});

test('leaving interaction range cancels a site claim without a reward', () => {
  const { match, players, arena } = setup();
  try {
    const site = sites(arena, 42).find((s) => s.kind === 'chaos-tree');
    move(players, 'a', site.position);
    step(match, 50);
    assert.ok(intent(match, 'a', 'interaction', site.id));
    const before = match.view('a').progression.currency;
    move(players, 'a', { x: site.position.x + 8, z: site.position.z });
    assert.equal(choose(match, 'a', 'currency'), false);
    assert.equal(match.view('a').progression.currency, before);
    assert.equal(
      match.view('a').pointsOfInterest.find((s) => s.id === site.id).status,
      'available',
    );
  } finally {
    match.dispose();
  }
});

test('disconnect does not extend shelter or a protected choice', () => {
  const { match, players, arena } = setup();
  try {
    move(players, 'a', arena.shelters[0]);
    step(match, 50);
    assert.ok(intent(match, 'a', 'shelter', 'shelter-0'));
    assert.ok(match.accept({ kind: 'disconnect', playerId: 'a' }));
    step(match, 5100);
    assert.ok(match.accept({ kind: 'connect', playerId: 'a' }));
    assert.equal(self(match, 'a').shelter, null);
    const site = sites(arena, 42).find((s) => s.kind === 'chaos-tree');
    move(players, 'a', site.position);
    step(match, 50);
    assert.ok(intent(match, 'a', 'interaction', site.id));
    assert.ok(match.accept({ kind: 'disconnect', playerId: 'a' }));
    step(match, 11000);
    assert.ok(match.accept({ kind: 'connect', playerId: 'a' }));
    assert.equal(match.view('a').offer, null);
  } finally {
    match.dispose();
  }
});

test('spicy firmware increases movement while its effect lasts', () => {
  const { match, players, arena, module } = findFirmwareEffect('spicy');
  try {
    let p;
    for (let x = -18; x <= 18 && !p; x += 2)
      for (let z = -18; z <= 18 && !p; z += 2)
        if (arenaPointClear(arena.obstacles, { x, z }, 6)) p = { x, z };
    function drive() {
      for (let i = 0; i < 8; i++) {
        assert.ok(
          match.consume({
            matchId: 'room',
            playerId: 'a',
            sequence: i,
            kind: 'control',
            x: 1,
            y: 0,
            aim: 0,
            buttons: 0,
          }),
        );
        step(match, 50, 50);
      }
    }
    move(players, 'a', p);
    drive();
    const baseline = players.get('a').translation().x - p.x;
    move(players, 'a', module.position);
    consumeFirmware(match, module);
    move(players, 'a', p);
    drive();
    const boosted = players.get('a').translation().x - p.x;
    assert.ok(boosted > baseline * 1.1, `${boosted} versus ${baseline}`);
  } finally {
    match.dispose();
  }
});

test('prolific firmware shortens the next generation interval', () => {
  const { match, module, players, arena } = findFirmwareEffect('prolific');
  try {
    consumeFirmware(match, module);
    for (const id of ids)
      assert.ok(
        match.setModifiers(
          id,
          mods({
            senses: 400,
            maximumHealth: 10000,
            regeneration: 1000,
            damageResistance: 100,
            heatAdaptation: 100,
            coldAdaptation: 100,
          }),
        ),
      );
    assertAcceleratedFirmwareSpawn(match, players, arena);
  } finally {
    match.dispose();
  }
});

test('mushroom dip extends owner-inflicted corrosion by one tick', () => {
  const { seed, site } = seedFor('giant-mushroom'),
    { match, players } = setup(seed);
  try {
    move(players, 'a', site.position);
    step(match, 50);
    assert.ok(intent(match, 'a', 'interaction', site.id));
    assert.ok(choose(match, 'a', 'dip'));
    assert.ok(
      match.applyStatus('b', {
        kind: 'corrosion',
        ownerId: 'a',
        magnitude: 2,
        duration: 4000,
      }),
    );
    assert.equal(
      self(match, 'b').statuses.find((s) => s.kind === 'corrosion').remaining,
      5000,
    );
    step(match, 5000, 100);
    const ticks = match
      .takeDamageLedger()
      .filter(
        (x) =>
          x.event.targetId === 'b' &&
          x.event.ownerId === 'a' &&
          x.event.channel === 'corrosion',
      );
    assert.equal(ticks.length, 5);
  } finally {
    match.dispose();
  }
});

test('decoy draws enemy attacks and does not draw them while owner is protected', () => {
  const { match, players, world, arena } = setup();
  try {
    let p;
    for (let x = -18; x <= 18 && !p; x += 2)
      for (let z = -18; z <= 18 && !p; z += 2)
        if (arenaPointClear(arena.obstacles, { x, z }, 7)) p = { x, z };
    move(players, 'a', { x: p.x - 6, z: p.z });
    move(players, 'b', { x: p.x + 12, z: p.z });
    move(players, 'c', { x: p.x + 14, z: p.z });
    move(players, 'd', { x: p.x + 16, z: p.z });
    step(match, 50);
    assert.ok(match.scheduleAlly('a', 'decoy', 0, 15000));
    step(match, 50);
    const decoy = match.view('a').bots.find((b) => b.kind === 'decoy');
    const hunter = match
      .view('a')
      .bots.find((b) => b.kind === 'wild' && b.role === 'hunter');
    assert.ok(decoy && hunter);
    const bodyFor = (unit) =>
      world.bodies
        .getAll()
        .find(
          (b) =>
            b.isDynamic() &&
            Math.hypot(
              b.translation().x - unit.position.x,
              b.translation().z - unit.position.z,
            ) < 0.01,
        );
    const db = bodyFor(decoy),
      hb = bodyFor(hunter);
    assert.ok(db && hb);
    db.setTranslation({ x: p.x, y: 0.25, z: p.z }, true);
    hb.setTranslation({ x: p.x + 1.5, y: 0.25, z: p.z }, true);
    step(match, 1000, 50);
    assert.ok(
      match
        .takeDamageLedger()
        .some(
          (e) => e.event.ownerId === hunter.id && e.event.targetId === decoy.id,
        ),
    );
    assert.ok(
      match.setOffer('a', { id: 'safe-decoy', revision: 0, choices: ['none'] }),
    );
    step(match, 2500, 50);
    assert.equal(
      match
        .takeDamageLedger()
        .some(
          (e) => e.event.ownerId === hunter.id && e.event.targetId === decoy.id,
        ),
      false,
    );
  } finally {
    match.dispose();
  }
});

test('summons relocate into the shrinking area and are removed at match teardown', () => {
  const { match, players, world } = setup(42, {
    shrinkStartMs: 1000,
    tinyAtMs: 3000,
    collapseAtMs: 6000,
  });
  try {
    for (const [id, p] of [
      ['a', { x: 0, z: 0 }],
      ['b', { x: 2, z: 0 }],
      ['c', { x: 0, z: 2 }],
      ['d', { x: -2, z: 0 }],
    ])
      move(players, id, p);
    step(match, 50);
    assert.ok(match.scheduleAlly('a', 'summoned', 0, 30000));
    step(match, 50);
    const ally = match
      .view('a')
      .bots.find((b) => b.kind === 'summoned' && b.ownerId === 'a');
    assert.ok(ally);
    const body = world.bodies
      .getAll()
      .find(
        (b) =>
          b.isDynamic() &&
          Math.hypot(
            b.translation().x - ally.position.x,
            b.translation().z - ally.position.z,
          ) < 0.01,
      );
    body.setTranslation({ x: 25, y: 0.25, z: 0 }, true);
    step(match, 2200, 50);
    const moved = match.view('a').bots.find((b) => b.id === ally.id);
    assert.ok(moved);
    assert.ok(
      Math.hypot(moved.position.x, moved.position.z) <
        match.view('a').boundary.radius,
    );
    assert.ok(match.scheduleAlly('a', 'offspring', 3000, 10000));
    assert.ok(match.accept({ kind: 'finish' }));
    assert.equal(
      match
        .view('a')
        .bots.some((b) => ['summoned', 'offspring', 'decoy'].includes(b.kind)),
      false,
    );
    assert.equal(match.advance(4000), false);
  } finally {
    match.dispose();
  }
});
