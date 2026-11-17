import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';
import { createStarterRegistry } from '../../build-host/server/content/starter.js';

const registry = createStarterRegistry();
function setup() {
  const { match } = createAbilityMatch('tracking', { registry });
  return match;
}
function choose(match, playerId, specialization) {
  assert.ok(match.advance(20));
  const offer = match.view(playerId).offer;
  assert.equal(offer.kind, 'specialization');
  assert.ok(offer.choices.includes(specialization));
  assert.ok(
    match.consume({
      kind: 'choice',
      matchId: 'tracking',
      playerId,
      sequence: 1,
      offerId: offer.id,
      revision: offer.revision,
      choiceId: specialization,
    }),
  );
}
function signal(match, playerId) {
  assert.ok(match.grantUpgrade(playerId, 'arms', 'branching', 1));
  for (let rank = 1; rank <= 2; rank++)
    assert.ok(match.grantUpgrade(playerId, 'stoner', 'common', rank));
  choose(match, playerId, 'stoner-signal');
}

test('Signal marks belong to their owner and boost only that owner’s charmed ally', () => {
  const match = setup();
  try {
    signal(match, 'a');
    signal(match, 'c');
    assert.ok(match.recruitCompanion('a', 'ally-a', 0));
    assert.ok(match.recruitCompanion('c', 'ally-c', 0));
    const bots = match.view('a').bots;
    const a = bots.find((b) => b.kind === 'charmed' && b.ownerId === 'a');
    const c = match
      .view('c')
      .bots.find((b) => b.kind === 'charmed' && b.ownerId === 'c');
    assert.ok(a && c);
    const hit = (ownerId) =>
      match.damageBatch([
        { targetId: 'b', ownerId, amount: 10, channel: 'direct', depth: 0 },
      ])[0].hull;
    assert.equal(hit(a.id), 10);
    assert.equal(hit(c.id), 10);
    match.damageBatch([
      {
        targetId: 'b',
        ownerId: 'a',
        amount: 1,
        channel: 'direct',
        origin: 'manual',
        abilityId: 'stoner',
        depth: 0,
      },
    ]);
    assert.equal(hit(a.id), 15);
    assert.equal(hit(c.id), 10);
  } finally {
    match.dispose();
  }
});

test('Marking doubles Toe Beans charm probability at controlled boundaries', () => {
  const original = crypto.randomInt;
  let roll = 454_000;
  crypto.randomInt = (...args) =>
    args.length === 1 && args[0] === 1_000_000 ? roll : original(...args);
  syncBuiltinESMExports();
  try {
    const run = (mark) => {
      const match = setup();
      try {
        assert.ok(match.grantUpgrade('a', 'arms', 'branching', 1));
        assert.ok(match.grantUpgrade('a', 'toe-beans', 'common', 1));
        assert.ok(match.grantUpgrade('a', 'tail', 'common', 1));
        for (let rank = 1; rank <= 3; rank++)
          assert.ok(match.grantUpgrade('a', 'spur', 'rare', rank));
        choose(match, 'a', 'spur-marking');
        const target = match
          .view('a')
          .bots.find((b) => b.kind === 'wild' && !b.elite);
        assert.ok(target);
        if (mark)
          match.damageBatch([
            {
              targetId: target.id,
              ownerId: 'a',
              amount: 1,
              channel: 'contact',
              abilityId: 'spur',
              depth: 1,
            },
          ]);
        match.damageBatch([
          {
            targetId: target.id,
            ownerId: 'a',
            amount: 1,
            channel: 'contact',
            origin: 'manual',
            abilityId: 'toe-beans',
            depth: 0,
          },
        ]);
        return match.view('a').bots.find((b) => b.id === target.id).kind;
      } finally {
        match.dispose();
      }
    };
    assert.equal(run(false), 'charmed');
    roll = 456_000;
    assert.equal(run(false), 'wild');
    roll = 909_000;
    assert.equal(run(true), 'charmed');
    roll = 911_000;
    assert.equal(run(true), 'wild');
  } finally {
    crypto.randomInt = original;
    syncBuiltinESMExports();
  }
});
