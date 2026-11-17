import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';
import { createStarterRegistry } from '../../build-host/server/content/starter.js';
import { contentRankValue } from '../../build-host/server/content/registry.js';
import { upgradeEffect } from '../../build-host/server/match/upgrade-effects.js';

test('passive stat upgrades apply their configured values at each rank and rarity', () => {
  const registry = createStarterRegistry();
  for (const id of [
    'alpha',
    'antennae',
    'more-eyes',
    'cortex',
    'synapse',
    'subcutaneous-fat',
  ]) {
    const definition = registry.definition(id);
    for (const rarity of definition.rarities) {
      const { match } = createAbilityMatch('checkpoint10-passive-stats');
      try {
        if (id === 'synapse') {
          assert.equal(match.grantUpgrade('a', id, rarity, 1), false);
          for (let rank = 1; rank <= 3; rank++)
            assert.ok(match.grantUpgrade('a', 'cortex', 'common', rank));
        }
        const stats = () =>
          match.view('a').players.find((player) => player.id === 'a').stats;
        const before = stats();
        for (let rank = 1; rank <= definition.maxRank; rank++) {
          assert.ok(
            match.grantUpgrade('a', id, rarity, rank),
            `${id} ${rarity} rank ${rank}`,
          );
          const details = Object.fromEntries(
            Object.entries(definition.detailValues ?? {}).map(
              ([key, values]) => [key, values[rarity]?.[rank - 1]],
            ),
          );
          const effect = upgradeEffect(
            id,
            definition.effect,
            rarity,
            rank,
            contentRankValue(definition, rarity, rank),
            details,
          );
          assert.ok(effect.modifiers.length > 0, id);
          for (const modifier of effect.modifiers)
            assert.ok(
              Math.abs(
                stats()[modifier.stat] -
                  (before[modifier.stat] + modifier.add) * modifier.multiplier,
              ) < 1e-5,
              `${id} ${rarity} rank ${rank} ${modifier.stat}: ${stats()[modifier.stat]}`,
            );
        }
      } finally {
        match.dispose();
      }
    }
  }
});

test('Synapse reduces an equipped movement ability cooldown', () => {
  const run = (withSynapse) => {
    const { match } = createAbilityMatch('checkpoint10-synapse-cooldown');
    try {
      assert.ok(match.grantUpgrade('a', 'sprint', 'rare', 1));
      if (withSynapse) {
        for (let rank = 1; rank <= 3; rank++)
          assert.ok(match.grantUpgrade('a', 'cortex', 'common', rank));
        assert.ok(match.grantUpgrade('a', 'synapse', 'rare', 1));
      }
      const before = match.view('a').time;
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint10-synapse-cooldown',
          playerId: 'a',
          sequence: 1,
          x: 0,
          y: 0,
          aim: 0,
          buttons: 4,
        }),
      );
      assert.ok(match.advance(100));
      return (
        match.view('a').equipment.learned.find((item) => item.id === 'sprint')
          .readyAt - before
      );
    } finally {
      match.dispose();
    }
  };
  const baseline = run(false),
    reduced = run(true);
  assert.equal(reduced, baseline * 0.9);
});
