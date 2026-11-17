import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

function build(choiceId) {
  const fixture = createAbilityMatch('checkpoint10-virulent');
  const { match } = fixture;
  assert.ok(match.grantUpgrade('a', 'saliva', 'common', 1));
  assert.ok(match.grantUpgrade('a', 'jaws', 'common', 1));
  assert.ok(match.grantUpgrade('a', 'poisonous-saliva', 'rare', 1));
  for (let rank = 1; rank <= 3; rank++)
    assert.ok(match.grantUpgrade('a', 'virulent', 'rare', rank));
  assert.ok(match.advance(20));
  const offer = match.view('a').offer;
  assert.ok(offer && offer.choices.includes(choiceId));
  assert.ok(
    match.consume({
      kind: 'choice',
      matchId: 'checkpoint10-virulent',
      playerId: 'a',
      sequence: 1,
      offerId: offer.id,
      revision: offer.revision,
      choiceId,
    }),
  );
  return fixture;
}

test('Neurotoxin accelerates owner-attributed corrosion ticks', () => {
  const run = (choiceId) => {
    const { match } = build(choiceId);
    try {
      assert.ok(
        match.applyStatus('b', {
          kind: 'corrosion',
          ownerId: 'a',
          magnitude: 1,
          duration: 2000,
        }),
      );
      match.takeDamageLedger();
      for (let i = 0; i < 8; i++) assert.ok(match.advance(100));
      return match
        .takeDamageLedger()
        .filter(
          ({ event }) =>
            event.channel === 'corrosion' &&
            event.ownerId === 'a' &&
            event.targetId === 'b',
        ).length;
    } finally {
      match.dispose();
    }
  };
  assert.equal(run('virulent-neurotoxin'), 1);
  assert.equal(run('skip'), 0);
});

test('Metabolisation heals its owner only for damaging corrosion against another player', () => {
  const run = (choiceId, targetId, amount) => {
    const { match } = build(choiceId);
    try {
      match.damagePlayer('a', 20);
      const player = () =>
        match.view('a').players.find((entry) => entry.id === 'a');
      const before = player().health.hull;
      const regeneration = player().stats.regeneration;
      match.damageBatch([
        { targetId, ownerId: 'a', channel: 'corrosion', amount, depth: 0 },
      ]);
      return { delta: player().health.hull - before, regeneration };
    } finally {
      match.dispose();
    }
  };
  const treated = run('virulent-metabolisation', 'b', 1);
  assert.ok(Math.abs(treated.delta - treated.regeneration * 0.005) < 1e-9);
  assert.equal(run('skip', 'b', 1).delta, 0);
  assert.equal(run('virulent-metabolisation', 'b', 0).delta, 0);
  assert.equal(run('virulent-metabolisation', 'a', 1).delta, -1);
});

test('Metabolisation heals from a bot tick and is suppressed during a protected choice', () => {
  const run = (protectedOwner) => {
    const { match } = build('virulent-metabolisation');
    try {
      const bot = match
        .view('a')
        .bots.find((entry) => entry.kind === 'wild' && !entry.elite);
      assert.ok(bot);
      match.damagePlayer('a', 20);
      assert.ok(
        match.applyStatus(bot.id, {
          kind: 'corrosion',
          ownerId: 'a',
          magnitude: 1,
          duration: 2000,
        }),
      );
      if (protectedOwner)
        assert.ok(
          match.setOffer('a', {
            id: 'metabolisation-protection',
            revision: 1,
            choices: ['done'],
          }),
        );
      const player = () =>
        match.view('a').players.find((entry) => entry.id === 'a');
      const before = player().health.hull;
      const regeneration = player().stats.regeneration;
      match.takeDamageLedger();
      for (let i = 0; i < 10; i++) assert.ok(match.advance(100));
      const ledger = match.takeDamageLedger();
      const damage = ledger
        .filter(({ event }) => event.targetId === 'a')
        .reduce((sum, { result }) => sum + result.hull, 0);
      const ticks = ledger.filter(
        ({ event }) =>
          event.targetId === bot.id &&
          event.ownerId === 'a' &&
          event.channel === 'corrosion',
      ).length;
      const healing =
        player().health.hull - before + damage - regeneration * 0.1;
      if (protectedOwner) {
        assert.ok(
          match.consume({
            kind: 'choice',
            matchId: 'checkpoint10-virulent',
            playerId: 'a',
            sequence: 2,
            offerId: 'metabolisation-protection',
            revision: 1,
            choiceId: 'done',
          }),
        );
        assert.ok(match.advance(500));
        assert.equal(
          match
            .takeDamageLedger()
            .filter(
              ({ event }) =>
                event.targetId === bot.id && event.channel === 'corrosion',
            ).length,
          0,
        );
        for (let i = 0; i < 5; i++) assert.ok(match.advance(100));
        assert.equal(
          match
            .takeDamageLedger()
            .filter(
              ({ event }) =>
                event.targetId === bot.id && event.channel === 'corrosion',
            ).length,
          1,
        );
      }
      return { ticks, healing, regeneration };
    } finally {
      match.dispose();
    }
  };
  const active = run(false);
  assert.equal(active.ticks, 1);
  assert.ok(Math.abs(active.healing - active.regeneration * 0.005) < 1e-9);
  const protectedResult = run(true);
  assert.equal(protectedResult.ticks, 0);
  assert.ok(Math.abs(protectedResult.healing) < 1e-9);
});
