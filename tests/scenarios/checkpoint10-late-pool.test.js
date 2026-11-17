import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';
import { createStarterRegistry } from '../../build-host/server/content/starter.js';
import { contentRankValue } from '../../build-host/server/content/registry.js';
import { upgradeEffect } from '../../build-host/server/match/upgrade-effects.js';

test('all seven repeatable upgrades unlock only in the finale and apply successive ranks once', () => {
  const registry = createStarterRegistry();
  const repeatables = registry
    .publicContent()
    .filter((entry) => registry.definition(entry.id).repeatable);
  assert.equal(repeatables.length, 7);
  for (const entry of repeatables) {
    const definition = registry.definition(entry.id),
      rarity = definition.rarities[0];
    const { match } = createAbilityMatch('checkpoint10-late-pool');
    try {
      assert.equal(
        match.grantUpgrade('a', entry.id, rarity, 1),
        false,
        entry.id,
      );
      assert.ok(match.setWorldCondition('finale', true));
      const stats = () =>
        match.view('a').players.find((player) => player.id === 'a').stats;
      const baseline = stats();
      for (let rank = 1; rank <= 5; rank++) {
        assert.ok(
          match.grantUpgrade('a', entry.id, rarity, rank),
          `${entry.id} rank ${rank}`,
        );
        const owned = match
          .view('a')
          .progression.upgrades.find((item) => item.id === entry.id);
        assert.equal(owned.rank, rank, entry.id);
        const value = contentRankValue(definition, rarity, rank);
        const details = Object.fromEntries(
          Object.entries(definition.detailValues ?? {}).map(([key, values]) => [
            key,
            values[rarity]?.[rank - 1],
          ]),
        );
        const effect = upgradeEffect(
          entry.id,
          definition.effect,
          rarity,
          rank,
          value,
          details,
        );
        for (const modifier of effect.modifiers)
          assert.ok(
            Math.abs(
              stats()[modifier.stat] - (baseline[modifier.stat] + modifier.add),
            ) < 1e-6,
            `${entry.id} rank ${rank}: ${modifier.stat}`,
          );
        const before = stats();
        assert.equal(match.grantUpgrade('a', entry.id, rarity, rank), false);
        assert.deepEqual(stats(), before, `${entry.id} replay rank ${rank}`);
      }
    } finally {
      match.dispose();
    }
  }
});

test('Outlier awards an eligible legendary upgrade without duplicating itself', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;
  const { match } = createAbilityMatch('checkpoint10-outlier');
  try {
    const registry = createStarterRegistry();
    const before = match.view('a').progression.upgrades;
    const ranks = new Map(before.map((item) => [item.id, item.rank]));
    const eligible = new Set(
      registry.eligible(ranks, new Set(), 'ordinary', new Set()),
    );
    assert.ok(match.grantUpgrade('a', 'outlier', 'epic', 1));
    const gained = match
      .view('a')
      .progression.upgrades.filter(
        (item) => item.id !== 'outlier' && !ranks.has(item.id),
      );
    assert.equal(gained.length, 1);
    assert.ok(eligible.has(gained[0].id));
    assert.equal(gained[0].rarity, 'legendary');
    assert.equal(gained[0].rank, 1);
    assert.equal(match.grantUpgrade('a', 'outlier', 'epic', 1), false);
  } finally {
    match.dispose();
    Math.random = originalRandom;
  }
});

test('Convergent Evolution increases one highest affinity by its configured amount', () => {
  const { match } = createAbilityMatch('checkpoint10-convergent');
  try {
    assert.ok(match.grantUpgrade('a', 'jaws', 'common', 1));
    const affinities = () =>
      new Map(
        match
          .view('a')
          .progression.affinities.map(({ id, rank }) => [id, rank]),
      );
    const before = affinities();
    const names = ['Gregarious', 'Imposing', 'Predator', 'Prey', 'Trickster'];
    const highest = Math.max(...names.map((name) => before.get(name) ?? 0));
    assert.ok(match.grantUpgrade('a', 'convergent-evolution', 'epic', 1));
    const after = affinities();
    const changes = names
      .map((name) => ({
        name,
        delta: (after.get(name) ?? 0) - (before.get(name) ?? 0),
      }))
      .filter((item) => item.delta !== 0);
    assert.equal(changes.length, 1);
    assert.equal(before.get(changes[0].name) ?? 0, highest);
    assert.equal(changes[0].delta, 10);
  } finally {
    match.dispose();
  }
});
