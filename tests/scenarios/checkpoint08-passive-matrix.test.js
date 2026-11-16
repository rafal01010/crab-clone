import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

const stats = (match) =>
  match.view('a').players.find((player) => player.id === 'a').stats;
function check(id, rarity, stat, values) {
  const { match } = createAbilityMatch('passive-matrix');
  try {
    const initial = stats(match)[stat];
    for (const [index, value] of values.entries()) {
      assert.ok(match.grantUpgrade('a', id, rarity, index + 1));
      assert.ok(
        Math.abs(stats(match)[stat] - initial - value) < 1e-8,
        `${id} ${rarity} rank ${index + 1}`,
      );
    }
  } finally {
    match.dispose();
  }
}

test('Legs speed follows each branching rank', () => {
  check('legs', 'branching', 'speed', [1.25, 2, 2.75]);
});

test('Jaws and Beak salvage speed follows every rank and rarity', () => {
  const values = {
    common: [10, 20, 30, 40, 50],
    rare: [12, 25, 37, 50, 62],
    epic: [14, 30, 45, 60, 75],
    legendary: [17, 35, 52, 70, 90],
  };
  for (const id of ['jaws', 'beak'])
    for (const [rarity, table] of Object.entries(values))
      check(id, rarity, 'salvageSpeed', table);
});

test('Trunk salvage reach follows every rank and rarity', () => {
  for (const [rarity, table] of Object.entries({
    rare: [0.66, 1.33, 2, 2.66, 3.33],
    epic: [0.8, 1.6, 2.4, 3.2, 4],
    legendary: [1, 2, 3, 4, 5],
  }))
    check('trunk', rarity, 'salvageReach', table);
});
