import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';
import { createStarterRegistry } from '../../build-host/server/content/starter.js';
import { contentRankValue } from '../../build-host/server/content/registry.js';
import { upgradeEffect } from '../../build-host/server/match/upgrade-effects.js';
import { generateOffer } from '../../build-host/server/match/offers.js';

test('every selectable rank and rarity resolves its configured upgrade handler', () => {
  const registry = createStarterRegistry();
  for (const entry of registry.publicContent()) {
    if (entry.pool === 'starting') continue;
    const definition = registry.definition(entry.id);
    const ranks = definition.repeatable
      ? [1, 2, 5]
      : Array.from({ length: definition.maxRank }, (_, index) => index + 1);
    for (const rarity of definition.rarities)
      for (const rank of ranks) {
        const value = contentRankValue(definition, rarity, rank);
        assert.notEqual(
          value,
          undefined,
          `${entry.id}: ${rarity} rank ${rank} value`,
        );
        const details = Object.fromEntries(
          Object.entries(definition.detailValues ?? {}).map(
            ([name, values]) => [name, values[rarity]?.[rank - 1]],
          ),
        );
        assert.ok(
          Object.values(details).every((item) => item !== undefined),
          `${entry.id}: ${rarity} rank ${rank} details`,
        );
        assert.ok(
          upgradeEffect(
            entry.id,
            definition.effect,
            rarity,
            rank,
            value,
            details,
          ),
          `${entry.id}: ${rarity} rank ${rank} handler`,
        );
      }
  }
});

test('every selectable non-starting upgrade has a runtime graph path and is excluded at its rank cap', () => {
  const registry = createStarterRegistry();
  const world = new Set(['finale']);
  for (const entry of registry.publicContent()) {
    if (entry.pool === 'starting') continue;
    const path = registry.findBuildPath(entry.id, 1, world);
    assert.equal(path.kind, 'reachable', `${entry.id}: ${path.kind}`);
    const capped = new Map([[entry.id, entry.maxRank]]);
    assert.equal(
      registry
        .eligible(capped, new Set(), entry.pool, world)
        .includes(entry.id),
      false,
      entry.id,
    );
  }
});

test('each selectable non-starting graph path and finite rank cap can be applied by Match', () => {
  const registry = createStarterRegistry();
  const world = new Set(['finale']);
  for (const entry of registry.publicContent()) {
    if (entry.pool === 'starting') continue;
    const path = registry.findBuildPath(entry.id, 1, world);
    assert.equal(path.kind, 'reachable', entry.id);
    const { match } = createAbilityMatch('checkpoint10-graph-replay');
    try {
      assert.ok(match.setWorldCondition('finale', true));
      let sequence = 0;
      for (const step of path.steps) {
        const definition = registry.definition(step.id);
        assert.ok(
          match.grantUpgrade('a', step.id, definition.rarities[0], step.rank),
          `${entry.id}: ${step.id} rank ${step.rank}`,
        );
        if (step.specialization) {
          assert.ok(match.advance(20));
          const offer = match.view('a').offer;
          assert.equal(offer?.kind, 'specialization', entry.id);
          assert.ok(
            match.consume({
              kind: 'choice',
              matchId: 'checkpoint10-graph-replay',
              playerId: 'a',
              sequence: ++sequence,
              offerId: offer.id,
              revision: offer.revision,
              choiceId: step.specialization,
            }),
            entry.id,
          );
        }
      }
      assert.ok(
        match
          .view('a')
          .progression.upgrades.some((upgrade) => upgrade.id === entry.id),
        entry.id,
      );
      const stats = () =>
        match.view('a').players.find((player) => player.id === 'a').stats;
      const definition = registry.definition(entry.id);
      const beforeReplay = stats();
      assert.equal(
        match.grantUpgrade('a', entry.id, definition.rarities[0], 1),
        false,
      );
      assert.equal(
        match.grantUpgrade('a', entry.id, definition.rarities[0], 1),
        false,
      );
      assert.deepEqual(
        stats(),
        beforeReplay,
        `${entry.id}: rejected replays must not duplicate modifiers`,
      );
      if (!definition.repeatable) {
        for (let rank = 2; rank <= definition.maxRank; rank++)
          assert.ok(
            match.grantUpgrade('a', entry.id, definition.rarities[0], rank),
            `${entry.id} rank ${rank}`,
          );
        assert.equal(
          match.grantUpgrade(
            'a',
            entry.id,
            definition.rarities[0],
            definition.maxRank + 1,
          ),
          false,
          entry.id,
        );
      }
    } finally {
      match.dispose();
    }
  }
});

test('Tracker requires and accepts each of its three live prerequisite routes', () => {
  for (const route of [
    [['nomadic', 'rare', 1]],
    [['snout', 'rare', 1]],
    [
      ['more-eyes', 'common', 1],
      ['more-eyes', 'common', 2],
    ],
  ]) {
    const { match } = createAbilityMatch('checkpoint10-routes');
    try {
      assert.equal(match.grantUpgrade('a', 'tracker', 'rare', 1), false);
      for (const [id, rarity, rank] of route)
        assert.ok(
          match.grantUpgrade('a', id, rarity, rank),
          `${id} rank ${rank}`,
        );
      assert.ok(match.grantUpgrade('a', 'tracker', 'rare', 1));
      assert.ok(
        match
          .view('a')
          .progression.upgrades.some((item) => item.id === 'tracker'),
      );
    } finally {
      match.dispose();
    }
  }
});

test('Snout and Jaws remain available and can be acquired in either order', () => {
  const registry = createStarterRegistry();
  for (const [first, second] of [
    ['snout', 'jaws'],
    ['jaws', 'snout'],
  ]) {
    const { match } = createAbilityMatch('checkpoint10-snout-jaws');
    try {
      assert.ok(match.grantUpgrade('a', first, 'rare', 1));
      assert.ok(
        registry
          .eligible(new Map([[first, 1]]), new Set(), 'ordinary', new Set())
          .includes(second),
      );
      assert.ok(match.grantUpgrade('a', second, 'rare', 1));
      const owned = match.view('a').progression.upgrades.map((item) => item.id);
      assert.ok(owned.includes(first) && owned.includes(second));
    } finally {
      match.dispose();
    }
  }
});

test('Tracker refuses a rank above its cap after legal successive ranks', () => {
  const { match } = createAbilityMatch('checkpoint10-cap');
  try {
    assert.ok(match.grantUpgrade('a', 'nomadic', 'rare', 1));
    for (let rank = 1; rank <= 3; rank++)
      assert.ok(match.grantUpgrade('a', 'tracker', 'rare', rank));
    assert.equal(match.grantUpgrade('a', 'tracker', 'rare', 4), false);
  } finally {
    match.dispose();
  }
});

test('generated offers respect Tracker prerequisite and maximum rank', () => {
  const registry = createStarterRegistry();
  const seen = (ranks) => {
    const definitions = registry
      .eligible(ranks, new Set(), 'ordinary', new Set())
      .map((id) => registry.definition(id));
    const choices = new Set();
    let state = 123456789;
    const random = () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 2 ** 32;
    };
    for (let i = 0; i < 400; i++)
      for (const choice of generateOffer(
        definitions,
        ranks,
        new Map(),
        new Map(),
        random,
        10,
      ))
        choices.add(choice.id);
    return choices;
  };
  assert.equal(seen(new Map()).has('tracker'), false);
  assert.equal(seen(new Map([['nomadic', 1]])).has('tracker'), true);
  assert.equal(
    seen(
      new Map([
        ['nomadic', 1],
        ['tracker', 3],
      ]),
    ).has('tracker'),
    false,
  );
});

function generatedRoute(first, second) {
  const originalRandom = Math.random;
  const originalRandomInt = crypto.randomInt;
  let seed = first === 'saliva' ? 42 : 123456789;
  Math.random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  crypto.randomInt = (min, max) =>
    max === undefined
      ? Math.floor(Math.random() * min)
      : min + Math.floor(Math.random() * (max - min));
  syncBuiltinESMExports();
  const { match } = createAbilityMatch('checkpoint10-generated-route');
  try {
    for (const id of ['a', 'b', 'c', 'd']) {
      assert.ok(
        match.setModifiers(id, [
          {
            id: 'route-resistance',
            stat: 'damageResistance',
            add: 100,
            multiplier: 1,
          },
          {
            id: 'route-health',
            stat: 'maximumHealth',
            add: 900,
            multiplier: 1,
          },
          { id: 'route-heat', stat: 'heatAdaptation', add: 400, multiplier: 1 },
          { id: 'route-cold', stat: 'coldAdaptation', add: 400, multiplier: 1 },
        ]),
      );
      match.repairPlayer(id, 900, false);
    }
    let sequence = 0;
    let firstChosen = false;
    for (let i = 0; i < 1000; i++) {
      const state = match.view('a');
      const owned = state.progression.upgrades.map((upgrade) => upgrade.id);
      if (owned.includes(second)) {
        assert.ok(firstChosen);
        if (second === 'spit')
          assert.ok(Object.values(state.equipment.slots).includes('spit'));
        return;
      }
      const offer = state.offer;
      if (offer) {
        const desired = !firstChosen ? first : second;
        const choice = offer.choices.includes(desired)
          ? desired
          : offer.choices.includes('skip')
            ? 'skip'
            : offer.choices.find((id) => firstChosen || id !== second);
        assert.ok(choice);
        assert.ok(
          match.consume({
            kind: 'choice',
            matchId: 'checkpoint10-generated-route',
            playerId: 'a',
            sequence: ++sequence,
            offerId: offer.id,
            revision: offer.revision,
            choiceId: choice,
          }),
        );
        if (choice === first) firstChosen = true;
      } else if (
        state.progression.pending === 0 &&
        state.players.find((player) => player.id === 'a').life.activity ===
          'playing'
      ) {
        assert.ok(
          match.grantProgress(
            'a',
            state.progression.required - state.progression.progress,
          ),
        );
      }
      assert.ok(
        match.advance(100),
        JSON.stringify({
          i,
          state: match.view('a')?.phase,
          owned,
          firstChosen,
        }),
      );
    }
    const state = match.view('a');
    assert.fail(
      `Seeded route did not acquire both upgrades: ${JSON.stringify({ firstChosen, level: state.progression.level, owned: state.progression.upgrades.map((item) => item.id), offer: state.offer })}`,
    );
  } finally {
    match.dispose();
    Math.random = originalRandom;
    crypto.randomInt = originalRandomInt;
    syncBuiltinESMExports();
  }
}

test('Saliva unlocks equipped Spit through generated progression choices', () =>
  generatedRoute('saliva', 'spit'));

test('Fur specialization choices apply once and skipping grants currency', () => {
  for (const choiceId of ['fur-wool', 'fur-snow-dive', 'skip']) {
    const { match } = createAbilityMatch('checkpoint10-fur');
    try {
      for (let rank = 1; rank <= 3; rank++)
        assert.ok(match.grantUpgrade('a', 'fur', 'common', rank));
      assert.ok(
        match.setModifiers('a', [
          { id: 'extra-cold', stat: 'coldAdaptation', add: 250, multiplier: 1 },
        ]),
      );
      assert.ok(match.advance(20));
      const before = match.view('a');
      const playerBefore = before.players.find((player) => player.id === 'a');
      assert.equal(before.offer.kind, 'specialization');
      assert.ok(before.offer.choices.includes(choiceId));
      const intent = {
        kind: 'choice',
        matchId: 'checkpoint10-fur',
        playerId: 'a',
        sequence: 1,
        offerId: before.offer.id,
        revision: before.offer.revision,
        choiceId,
      };
      assert.ok(match.consume(intent));
      assert.equal(match.consume(intent), false);
      const after = match.view('a');
      const playerAfter = after.players.find((player) => player.id === 'a');
      if (choiceId === 'fur-wool')
        assert.equal(
          playerAfter.stats.heatAdaptation,
          Math.min(
            400,
            playerBefore.stats.heatAdaptation +
              playerBefore.stats.coldAdaptation,
          ),
        );
      else
        assert.equal(
          playerAfter.stats.heatAdaptation,
          playerBefore.stats.heatAdaptation,
        );
      assert.equal(
        after.progression.currency,
        before.progression.currency + (choiceId === 'skip' ? 10 : 0),
      );
    } finally {
      match.dispose();
    }
  }
});

test('specializations offer each branch and accept only one choice', () => {
  const registry = createStarterRegistry();
  const ids = [
    'snout',
    'fungoid',
    'virulent',
    'pedal-glands',
    'spinnerets',
    'scales',
    'spines',
    'turtle-down',
    'cheek-pouch',
    'beak',
    'stoner',
    'jaws',
    'projectile-tongue',
    'leech',
    'spur',
    'leap',
    'legs',
    'prehensile-tail',
  ];
  const parents = registry
    .publicContent()
    .filter(
      (entry) => registry.definition(entry.id).specializationChoices?.length,
    )
    .map((entry) => entry.id);
  assert.deepEqual([...parents].sort(), [...ids, 'fur'].sort());
  for (const id of ids) {
    const definition = registry.definition(id);
    for (const option of [...definition.specializations, 'skip']) {
      const { match } = createAbilityMatch('checkpoint10-specializations');
      try {
        const choice = definition.specializationChoices.find(
          (item) => item.id === option,
        );
        const triggerRank =
          choice?.triggerRank ??
          definition.specializationChoices[0].triggerRank;
        const path = registry.findBuildPath(id, triggerRank);
        assert.equal(path.kind, 'reachable', id);
        for (const step of path.steps) {
          const rarity = registry.definition(step.id).rarities[0];
          assert.ok(
            match.grantUpgrade('a', step.id, rarity, step.rank),
            `${id}: ${step.id} rank ${step.rank}`,
          );
        }
        assert.ok(match.advance(20));
        const before = match.view('a');
        assert.equal(before.offer?.kind, 'specialization', `${id}: ${option}`);
        assert.ok(before.offer.choices.includes(option), `${id}: ${option}`);
        const intent = {
          kind: 'choice',
          matchId: 'checkpoint10-specializations',
          playerId: 'a',
          sequence: 1,
          offerId: before.offer.id,
          revision: before.offer.revision,
          choiceId: option,
        };
        assert.ok(match.consume(intent), `${id}: ${option}`);
        assert.equal(match.consume(intent), false);
        const after = match.view('a');
        assert.equal(
          after.progression.currency,
          before.progression.currency + (option === 'skip' ? 10 : 0),
        );
        assert.equal(after.offer?.id === before.offer.id, false);
      } finally {
        match.dispose();
      }
    }
  }
});
