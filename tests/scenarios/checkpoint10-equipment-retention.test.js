import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';
import { createStarterRegistry } from '../../build-host/server/content/starter.js';
import { contentRankValue } from '../../build-host/server/content/registry.js';
import { upgradeEffect } from '../../build-host/server/match/upgrade-effects.js';

test('learned stats survive repeated equipment changes for every selectable ability', () => {
  const registry = createStarterRegistry();
  const covered = [];
  for (const entry of registry.publicContent()) {
    if (entry.pool === 'starting') continue;
    const definition = registry.definition(entry.id);
    const rarity = definition.rarities[0];
    const details = Object.fromEntries(
      Object.entries(definition.detailValues ?? {}).map(([name, values]) => [
        name,
        values[rarity]?.[0],
      ]),
    );
    const effect = upgradeEffect(
      entry.id,
      definition.effect,
      rarity,
      1,
      contentRankValue(definition, rarity, 1),
      details,
    );
    if (!effect?.ability) continue;
    const path = registry.findBuildPath(entry.id, 1, new Set(['finale']));
    assert.equal(path.kind, 'reachable', entry.id);
    const { match } = createAbilityMatch('equipment-retention');
    try {
      assert.ok(match.setWorldCondition('finale', true));
      let sequence = 0;
      const choose = (offer, choiceId) =>
        match.consume({
          kind: 'choice',
          matchId: 'equipment-retention',
          playerId: 'a',
          sequence: ++sequence,
          offerId: offer.id,
          revision: offer.revision,
          choiceId,
        });
      for (const step of path.steps) {
        const stepDefinition = registry.definition(step.id);
        assert.ok(
          match.grantUpgrade(
            'a',
            step.id,
            stepDefinition.rarities[0],
            step.rank,
          ),
          `${entry.id}: ${step.id}`,
        );
        if (step.specialization) {
          assert.ok(match.advance(20));
          const offer = match.view('a').offer;
          assert.equal(offer?.kind, 'specialization', entry.id);
          assert.ok(choose(offer, step.specialization), entry.id);
        }
      }
      assert.ok(match.grantProgress('a', 20));
      assert.ok(match.advance(20));
      const offer = match.view('a').offer;
      assert.ok(offer, entry.id);
      const slot =
        effect.ability.slotType === 'attack'
          ? 'primary'
          : effect.ability.slotType;
      const equip = (contentId) => {
        const current = match.view('a').offer;
        assert.ok(
          match.consume({
            kind: 'equipment',
            matchId: 'equipment-retention',
            playerId: 'a',
            sequence: ++sequence,
            offerId: current.id,
            revision: current.revision,
            slot,
            contentId,
          }),
          `${entry.id}: equip ${contentId}`,
        );
      };
      equip(entry.id);
      assert.equal(match.view('a').equipment.slots[slot], entry.id);
      const stats = () =>
        match.view('a').players.find((player) => player.id === 'a').stats;
      const learned = stats();
      for (let i = 0; i < 3; i++) {
        equip('-');
        assert.equal(match.view('a').equipment.slots[slot], null, entry.id);
        assert.deepEqual(
          stats(),
          learned,
          `${entry.id}: unequipping changed learned stats`,
        );
        equip(entry.id);
        assert.equal(match.view('a').equipment.slots[slot], entry.id);
        assert.deepEqual(
          stats(),
          learned,
          `${entry.id}: re-equipping changed learned stats`,
        );
      }
      covered.push(entry.id);
    } finally {
      match.dispose();
    }
  }
  assert.ok(
    covered.length >= 20,
    `unexpected ability count: ${covered.length}`,
  );
});

test('distinct learned modifiers combine once regardless of acquisition order', () => {
  for (const [stat, first, second] of [
    ['physical', ['muscular-tissue', 'common'], ['aggressive', 'common']],
    ['ability', ['cortex', 'common'], ['cunning', 'common']],
    ['senses', ['more-eyes', 'common'], ['snout', 'rare']],
  ]) {
    const measure = (upgrades) => {
      const { match } = createAbilityMatch('modifier-combination');
      try {
        assert.ok(match.setWorldCondition('finale', true));
        const read = () =>
          match.view('a').players.find((player) => player.id === 'a').stats[
            stat
          ];
        const baseline = read();
        for (const [id, rarity] of upgrades)
          assert.ok(match.grantUpgrade('a', id, rarity, 1), id);
        return { baseline, value: read() };
      } finally {
        match.dispose();
      }
    };
    const a = measure([first]);
    const b = measure([second]);
    const ab = measure([first, second]);
    const ba = measure([second, first]);
    assert.ok(a.value > a.baseline && b.value > b.baseline, stat);
    assert.ok(
      Math.abs(ab.value - (a.value + b.value - a.baseline)) < 1e-9,
      stat,
    );
    assert.equal(ba.value, ab.value, stat);
  }
});

test('compatible independent upgrades combine shared stat bonuses once in either order', () => {
  const registry = createStarterRegistry();
  const world = new Set(['finale']);
  const roots = registry.publicContent().flatMap((entry) => {
    if (entry.pool === 'starting') return [];
    const definition = registry.definition(entry.id);
    if (definition.requirement.kind !== 'none') return [];
    const rarity = definition.rarities[0];
    const details = Object.fromEntries(
      Object.entries(definition.detailValues ?? {}).map(([name, values]) => [
        name,
        values[rarity]?.[0],
      ]),
    );
    const effect = upgradeEffect(
      entry.id,
      definition.effect,
      rarity,
      1,
      contentRankValue(definition, rarity, 1),
      details,
    );
    const modifiers = (effect?.modifiers ?? []).filter(
      (modifier) => modifier.add > 0 && modifier.multiplier === 1,
    );
    return modifiers.length ? [{ entry, rarity, modifiers }] : [];
  });
  let checked = 0;
  const measure = (upgrades, stat) => {
    const { match } = createAbilityMatch('shared-modifiers');
    try {
      assert.ok(match.setWorldCondition('finale', true));
      const read = () =>
        match.view('a').players.find((player) => player.id === 'a').stats[stat];
      const baseline = read();
      for (const item of upgrades)
        assert.ok(
          match.grantUpgrade('a', item.entry.id, item.rarity, 1),
          item.entry.id,
        );
      return { baseline, value: read() };
    } finally {
      match.dispose();
    }
  };
  for (let i = 0; i < roots.length; i++)
    for (let j = i + 1; j < roots.length; j++) {
      const a = roots[i],
        b = roots[j];
      if (
        !registry
          .eligible(new Map([[a.entry.id, 1]]), new Set(), b.entry.pool, world)
          .includes(b.entry.id) ||
        !registry
          .eligible(new Map([[b.entry.id, 1]]), new Set(), a.entry.pool, world)
          .includes(a.entry.id)
      )
        continue;
      for (const modifier of a.modifiers) {
        if (!b.modifiers.some((item) => item.stat === modifier.stat)) continue;
        const stat = modifier.stat;
        const onlyA = measure([a], stat),
          onlyB = measure([b], stat);
        const both = measure([a, b], stat),
          reversed = measure([b, a], stat);
        assert.ok(
          Math.abs(both.value - reversed.value) < 1e-8,
          `${a.entry.id} + ${b.entry.id}: ${stat} differs by order`,
        );
        assert.ok(
          Math.abs(both.value - (onlyA.value + onlyB.value - onlyA.baseline)) <
            1e-6,
          `${a.entry.id} + ${b.entry.id}: ${stat} combined=${both.value} expected=${onlyA.value + onlyB.value - onlyA.baseline}`,
        );
        checked++;
      }
    }
  assert.ok(checked >= 20, `only ${checked} compatible shared-stat pairs`);
});
