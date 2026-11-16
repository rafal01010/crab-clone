import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';
import { createStarterRegistry } from '../../build-host/server/content/starter.js';

const registry = createStarterRegistry();
const expected = {
  rare: [0.45, 0.55, 0.65, 0.75, 0.85],
  epic: [0.55, 0.65, 0.75, 0.85, 0.95],
  legendary: [0.65, 0.75, 0.85, 0.95, 1.05],
};

test('Spur follows a real attack with the source damage for every rank and rarity', () => {
  for (const [rarity, values] of Object.entries(expected)) {
    for (let rank = 1; rank <= values.length; rank++) {
      const { match, world } = createAbilityMatch('spur-matrix', { registry });
      try {
        assert.ok(match.grantUpgrade('a', 'tail', 'common', 1));
        for (let n = 1; n <= rank; n++)
          assert.ok(match.grantUpgrade('a', 'spur', rarity, n));
        if (rank >= 3) {
          assert.ok(match.advance(20));
          const offer = match.view('a').offer;
          assert.equal(offer.kind, 'specialization');
          assert.ok(
            match.consume({
              kind: 'choice',
              matchId: 'spur-matrix',
              playerId: 'a',
              sequence: 1,
              offerId: offer.id,
              revision: offer.revision,
              choiceId: 'spur-marking',
            }),
          );
        }
        const body = (id) => {
          const pos = match.view(id).players.find((p) => p.id === id).position;
          return world.bodies
            .getAll()
            .find(
              (b) =>
                b.isDynamic() &&
                Math.hypot(
                  b.translation().x - pos.x,
                  b.translation().z - pos.z,
                ) < 0.01,
            );
        };
        const a = body('a'),
          b = body('b');
        assert.ok(a && b);
        a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
        b.setTranslation({ x: 1.8, y: 0.25, z: 0 }, true);
        assert.ok(match.advance(20));
        match.takeDamageLedger();
        assert.ok(
          match.consume({
            kind: 'control',
            matchId: 'spur-matrix',
            playerId: 'a',
            sequence: 2,
            x: 0,
            y: 0,
            aim: Math.PI / 2,
            buttons: 1,
          }),
        );
        for (let i = 0; i < 10; i++) assert.ok(match.advance(50));
        const events = match
          .takeDamageLedger()
          .filter(
            ({ event }) => event.ownerId === 'a' && event.targetId === 'b',
          );
        const spur = events.filter(({ event }) => event.abilityId === 'spur');
        assert.equal(spur.length, 1, `${rarity} rank ${rank}`);
        assert.equal(spur[0].event.depth, 1);
        assert.ok(
          Math.abs(spur[0].result.hull - values[rank - 1] * 10) < 0.00001,
          `${rarity} rank ${rank}: ${spur[0].result.hull}`,
        );
      } finally {
        match.dispose();
      }
    }
  }
});
