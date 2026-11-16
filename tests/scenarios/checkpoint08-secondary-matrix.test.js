import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

function equip(id, rarity, rank) {
  const { match } = createAbilityMatch('secondary-matrix');
  if (id === 'slide')
    assert.ok(match.grantUpgrade('a', 'slithery', 'branching', 1));
  for (let n = 1; n <= rank; n++)
    assert.ok(match.grantUpgrade('a', id, rarity, n));
  assert.ok(match.advance(20));
  let offer = match.view('a').offer;
  if (offer?.kind === 'specialization') {
    assert.ok(
      match.consume({
        kind: 'choice',
        matchId: 'secondary-matrix',
        playerId: 'a',
        sequence: 1,
        offerId: offer.id,
        revision: offer.revision,
        choiceId: 'skip',
      }),
    );
    assert.ok(match.advance(20));
    offer = match.view('a').offer;
  }
  if (offer?.kind === 'equipment') {
    assert.ok(
      match.consume({
        kind: 'choice',
        matchId: 'secondary-matrix',
        playerId: 'a',
        sequence: 1,
        offerId: offer.id,
        revision: offer.revision,
        choiceId: id === 'slide' ? 'movement' : 'primary',
      }),
    );
  }
  const slots = match.view('a').equipment.slots;
  const button = id === 'slide' ? 4 : slots.primary === id ? 1 : 2;
  assert.ok(
    id === 'slide'
      ? slots.movement === id
      : slots.primary === id || slots.secondary === id,
  );
  return { match, button };
}

for (const [id, table] of Object.entries({
  'projectile-tongue': {
    rare: [5500, 5000, 4500, 4000, 3500],
    epic: [5500, 5000, 4500, 4000, 3500],
    legendary: [5500, 5000, 4500, 4000, 3500],
  },
  slide: {
    common: [4000, 3400, 2800],
    rare: [3800, 3200, 2600],
    epic: [3600, 3000, 2400],
    legendary: [3400, 2800, 2200],
  },
})) {
  test(`${id} cooldown follows every rarity and rank`, () => {
    for (const [rarity, values] of Object.entries(table))
      for (const [index, cooldown] of values.entries()) {
        const { match, button } = equip(id, rarity, index + 1);
        try {
          const before = match.view('a').time;
          assert.ok(
            match.consume({
              kind: 'control',
              matchId: 'secondary-matrix',
              playerId: 'a',
              sequence: 2,
              x: 1,
              y: 0,
              aim: Math.PI / 2,
              buttons: button,
            }),
          );
          assert.ok(match.advance(50));
          assert.equal(
            match.view('a').equipment.learned.find((entry) => entry.id === id)
              .readyAt,
            before + cooldown,
            `${rarity} rank ${index + 1}`,
          );
        } finally {
          match.dispose();
        }
      }
  });
}

test('Spit reaches targets inside its rank range but not beyond it at every rarity', () => {
  const fireAt = (rarity, rank, distance) => {
    const { match, world } = createAbilityMatch('spit-range');
    try {
      assert.ok(match.grantUpgrade('a', 'jaws', 'common', 1));
      for (let n = 1; n <= rank; n++)
        assert.ok(match.grantUpgrade('a', 'spit', rarity, n));
      assert.ok(match.advance(20));
      const slots = match.view('a').equipment.slots;
      const button = slots.primary === 'spit' ? 1 : 2;
      assert.ok(slots.primary === 'spit' || slots.secondary === 'spit');
      for (const [id, x] of [
        ['a', 0],
        ['b', distance],
      ]) {
        const pos = match.view(id).players.find((p) => p.id === id).position;
        const body = world.bodies
          .getAll()
          .find(
            (b) =>
              b.isDynamic() &&
              Math.hypot(b.translation().x - pos.x, b.translation().z - pos.z) <
                0.01,
          );
        assert.ok(body);
        body.setTranslation({ x, y: 0.25, z: 0 }, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
      assert.ok(match.advance(20));
      match.takeDamageLedger();
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'spit-range',
          playerId: 'a',
          sequence: 2,
          x: 0,
          y: 0,
          aim: Math.PI / 2,
          buttons: button,
        }),
      );
      for (let i = 0; i < 35; i++) assert.ok(match.advance(50));
      return match
        .takeDamageLedger()
        .some(
          ({ event }) =>
            event.abilityId === 'spit' &&
            event.targetId === 'b' &&
            event.origin === 'manual',
        );
    } finally {
      match.dispose();
    }
  };
  for (const rarity of ['common', 'rare', 'epic', 'legendary'])
    for (const [index, range] of [10, 12, 14, 16, 20].entries()) {
      assert.equal(
        fireAt(rarity, index + 1, range - 2),
        true,
        `${rarity} rank ${index + 1} inside`,
      );
      assert.equal(
        fireAt(rarity, index + 1, range + 2),
        false,
        `${rarity} rank ${index + 1} outside`,
      );
    }
});
