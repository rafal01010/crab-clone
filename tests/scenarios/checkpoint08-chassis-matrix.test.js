import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';
function setup() {
  const { match } = createAbilityMatch('chassis-matrix');
  return match;
}
const stats = (match) =>
  match.view('a').players.find((p) => p.id === 'a').stats;
const close = (actual, expected, context) =>
  assert.ok(
    Math.abs(actual - expected) < 1e-8,
    `${context}: ${actual} != ${expected}`,
  );
function checkRanks({ id, rarity, values, before = () => {}, expect }) {
  const match = setup();
  try {
    before(match);
    const initial = { ...stats(match) };
    for (const [index, expected] of values.entries()) {
      const rank = index + 1;
      assert.ok(
        match.grantUpgrade('a', id, rarity, rank),
        `${id} ${rarity} rank ${rank} rejected`,
      );
      for (const [stat, amount] of Object.entries(expect(expected)))
        close(
          stats(match)[stat],
          initial[stat] + amount,
          `${id} ${rarity} rank ${rank} ${stat}`,
        );
    }
  } finally {
    match.dispose();
  }
}

test('Tail matches the ability and social tables at each rank and rarity', () => {
  const values = {
    common: [
      [1, 1.5],
      [2, 3],
      [3, 4.5],
      [4, 6],
      [5, 7.5],
    ],
    rare: [
      [1.2, 1.7],
      [2.5, 3.5],
      [3.7, 5.2],
      [5, 7],
      [6.2, 8.7],
    ],
    epic: [
      [1.4, 2],
      [3, 4],
      [4.5, 6],
      [6, 8],
      [7.5, 10],
    ],
    legendary: [
      [1.7, 2.3],
      [3.5, 4.5],
      [5.2, 6.7],
      [7, 9],
      [9, 11.2],
    ],
  };
  for (const [rarity, table] of Object.entries(values))
    checkRanks({
      id: 'tail',
      rarity,
      values: table,
      expect: ([ability, social]) => ({ ability, social }),
    });
});

test('Slithery and Tentacles match the branching rank tables', () => {
  checkRanks({
    id: 'slithery',
    rarity: 'branching',
    values: [
      [1, 20],
      [1.75, 40],
      [2.25, 60],
    ],
    expect: ([speed, terrainAdaptation]) => ({ speed, terrainAdaptation }),
  });
  checkRanks({
    id: 'tentacles',
    rarity: 'branching',
    values: [
      [0.75, 2],
      [1.25, 4],
      [1.75, 6],
      [2.25, 8],
      [2.75, 10],
    ],
    expect: ([speed, ability]) => ({ speed, ability }),
  });
});

test('Prehensile Tail matches feeding reach at each rarity and rank', () => {
  for (const [rarity, values] of Object.entries({
    rare: [2, 4, 6],
    epic: [2.5, 5, 7.5],
    legendary: [3, 6, 9],
  }))
    checkRanks({
      id: 'prehensile-tail',
      rarity,
      values,
      before: (match) =>
        assert.ok(match.grantUpgrade('a', 'tail', 'common', 1)),
      expect: (salvageReach) => ({ salvageReach }),
    });
});

test('Hollow Bones matches speed and resistance costs at each rarity and rank', () => {
  const tables = {
    epic: [
      [0.25, 5],
      [0.5, 10],
      [0.75, 15],
      [1, 20],
      [1.25, 25],
    ],
    legendary: [
      [0.3, 4],
      [0.6, 8],
      [0.9, 12],
      [1.2, 16],
      [1.5, 20],
    ],
  };
  for (const [rarity, values] of Object.entries(tables))
    checkRanks({
      id: 'hollow-bones',
      rarity,
      values,
      expect: ([speed, cost]) => ({ speed, damageResistance: -cost }),
    });
});

test('More Legs matches speed at every rarity and rank after choosing Arthropod', () => {
  const chooseArthropod = (match) => {
    for (let rank = 1; rank <= 3; rank++)
      assert.ok(match.grantUpgrade('a', 'legs', 'branching', rank));
    assert.ok(match.advance(50));
    const offer = match.view('a').offer;
    assert.equal(offer.kind, 'specialization');
    assert.ok(
      match.consume({
        kind: 'choice',
        matchId: 'chassis-matrix',
        playerId: 'a',
        sequence: 1,
        offerId: offer.id,
        revision: offer.revision,
        choiceId: 'legs-arthropod',
      }),
    );
  };
  for (const [rarity, values] of Object.entries({
    rare: [0.4, 0.8, 1.2],
    epic: [0.55, 1.1, 1.65],
    legendary: [0.7, 1.4, 2.1],
  }))
    checkRanks({
      id: 'more-legs',
      rarity,
      values,
      before: chooseArthropod,
      expect: (speed) => ({ speed }),
    });
});

test('Fin applies each documented implementation estimate without changing thermal stats', () => {
  for (const [rarity, value] of Object.entries({
    rare: 60,
    epic: 80,
    legendary: 100,
  }))
    checkRanks({
      id: 'fin',
      rarity,
      values: [value],
      expect: (waterAdaptation) => ({
        waterAdaptation,
        heatAdaptation: 0,
        coldAdaptation: 0,
      }),
    });
});
