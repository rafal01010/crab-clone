import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

function setup(choice, role) {
  const { match, world } = createAbilityMatch('anaesthetic');
  for (let rank = 1; rank <= 3; rank++)
    assert.ok(match.grantUpgrade('a', 'leech', 'rare', rank));
  assert.ok(match.advance(20));
  const offer = match.view('a').offer;
  assert.equal(offer.kind, 'specialization');
  assert.ok(
    match.consume({
      kind: 'choice',
      matchId: 'anaesthetic',
      playerId: 'a',
      sequence: 1,
      offerId: offer.id,
      revision: offer.revision,
      choiceId: choice,
    }),
  );
  const view = match.view('a');
  const bot = view.bots.find((entry) => entry.role === role);
  assert.ok(bot);
  const findBody = (position) =>
    world.bodies
      .getAll()
      .find(
        (body) =>
          body.isDynamic() &&
          Math.hypot(
            body.translation().x - position.x,
            body.translation().z - position.z,
          ) < 0.01,
      );
  const a = findBody(view.players.find((player) => player.id === 'a').position);
  const target = findBody(bot.position);
  assert.ok(a && target);
  for (const other of view.bots.filter((entry) => entry.id !== bot.id)) {
    const body = findBody(other.position);
    assert.ok(body);
    body.setTranslation({ x: -25, y: 0.25, z: -25 }, true);
  }
  a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
  target.setTranslation({ x: 1.8, y: 0.25, z: 0 }, true);
  a.setLinvel({ x: 0, y: 0, z: 0 }, true);
  target.setLinvel({ x: 0, y: 0, z: 0 }, true);
  return { match, bot, target };
}
function hit(match, bot, abilityId = 'leech') {
  const result = match.damageBatch([
    {
      targetId: bot.id,
      ownerId: 'a',
      amount: 1,
      channel: 'contact',
      origin: 'manual',
      abilityId,
      depth: 0,
    },
  ])[0];
  assert.equal(result.hull + result.plating, 1);
}
function advance(match, ms) {
  for (let elapsed = 0; elapsed < ms; elapsed += 50)
    assert.ok(match.advance(50));
}

test('Anaesthetic does not prevent naturally hostile hunters from attacking', () => {
  for (const choice of ['leech-vasodilators', 'leech-anaesthetic', 'skip']) {
    const { match, bot } = setup(choice, 'hunter');
    try {
      hit(match, bot);
      match.takeDamageLedger();
      advance(match, 1500);
      const attacks = match
        .takeDamageLedger()
        .filter(
          ({ event }) => event.ownerId === bot.id && event.targetId === 'a',
        );
      assert.ok(attacks.length > 0, `hunter attacks with ${choice}`);
    } finally {
      match.dispose();
    }
  }
});

test('ordinary hits provoke foragers while Anaesthetic Leech hits do not', () => {
  for (const choice of ['leech-vasodilators', 'leech-anaesthetic', 'skip']) {
    const { match, bot } = setup(choice, 'forager');
    try {
      hit(match, bot);
      match.takeDamageLedger();
      advance(match, 1500);
      const attacks = match
        .takeDamageLedger()
        .filter(
          ({ event }) => event.ownerId === bot.id && event.targetId === 'a',
        );
      assert.equal(attacks.length > 0, choice !== 'leech-anaesthetic', choice);
    } finally {
      match.dispose();
    }
  }
});

test('Anaesthetic does not cancel existing provocation', () => {
  const { match, bot } = setup('leech-anaesthetic', 'forager');
  try {
    hit(match, bot, 'body-slam');
    hit(match, bot);
    match.takeDamageLedger();
    advance(match, 1500);
    assert.ok(
      match
        .takeDamageLedger()
        .some(
          ({ event }) => event.ownerId === bot.id && event.targetId === 'a',
        ),
    );
  } finally {
    match.dispose();
  }
});

test('forager aggression expires after five seconds', () => {
  const { match, bot, target } = setup('leech-anaesthetic', 'forager');
  try {
    hit(match, bot, 'body-slam');
    advance(match, 5100);
    target.setTranslation({ x: 1.8, y: 0.25, z: 0 }, true);
    target.setLinvel({ x: 0, y: 0, z: 0 }, true);
    match.takeDamageLedger();
    advance(match, 1500);
    assert.equal(
      match
        .takeDamageLedger()
        .some(
          ({ event }) => event.ownerId === bot.id && event.targetId === 'a',
        ),
      false,
    );
    assert.ok(target.translation().x > 1.8);
  } finally {
    match.dispose();
  }
});
