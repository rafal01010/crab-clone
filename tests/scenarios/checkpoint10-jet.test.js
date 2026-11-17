import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

test('an egg due during a protected choice does not hatch after the choice', () => {
  const { match } = createAbilityMatch('checkpoint10-protected-egg');
  try {
    assert.ok(
      match.scheduleAlly('a', 'offspring', 1000, 30000, { x: 0, z: 0 }),
    );
    assert.ok(
      match.setOffer('a', {
        id: 'egg-protection',
        revision: 1,
        choices: ['done'],
      }),
    );
    for (let i = 0; i < 12; i++) assert.ok(match.advance(100));
    assert.ok(
      match.consume({
        kind: 'choice',
        matchId: 'checkpoint10-protected-egg',
        playerId: 'a',
        sequence: 1,
        offerId: 'egg-protection',
        revision: 1,
        choiceId: 'done',
      }),
    );
    assert.ok(match.advance(100));
    assert.equal(
      match
        .view('a')
        .bots.filter((bot) => bot.kind === 'offspring' && bot.ownerId === 'a')
        .length,
      0,
    );
  } finally {
    match.dispose();
  }
});

test('Jet requires Tentacles plus either secretion and emits that secretion while dashing', () => {
  const missingSecretion = createAbilityMatch('checkpoint10-jet-missing');
  try {
    assert.ok(
      missingSecretion.match.grantUpgrade('a', 'tentacles', 'branching', 1),
    );
    assert.equal(
      missingSecretion.match.grantUpgrade('a', 'jet', 'common', 1),
      false,
    );
  } finally {
    missingSecretion.match.dispose();
  }
  for (const secretion of ['pedal-glands', 'spinnerets']) {
    const { match } = createAbilityMatch('checkpoint10-jet');
    try {
      assert.equal(match.grantUpgrade('a', 'jet', 'common', 1), false);
      if (secretion === 'pedal-glands')
        assert.ok(match.grantUpgrade('a', 'slithery', 'branching', 1));
      assert.ok(
        match.grantUpgrade(
          'a',
          secretion,
          secretion === 'spinnerets' ? 'epic' : 'common',
          1,
        ),
      );
      assert.equal(match.grantUpgrade('a', 'jet', 'common', 1), false);
      assert.ok(match.grantUpgrade('a', 'tentacles', 'branching', 1));
      assert.ok(match.grantUpgrade('a', 'jet', 'common', 1));
      assert.equal(match.view('a').equipment.slots.movement, 'jet');
      assert.equal(match.view('a').trails.length, 0);
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint10-jet',
          playerId: 'a',
          sequence: 1,
          x: 1,
          y: 0,
          aim: Math.PI / 2,
          buttons: 4,
        }),
      );
      for (let i = 0; i < 6; i++) assert.ok(match.advance(50));
      assert.ok(match.view('a').trails.length > 0, `${secretion} trail`);
    } finally {
      match.dispose();
    }
  }
});

test('Jet trails cease slowing opponents while their owner is choosing', () => {
  const run = (mode) => {
    const { match, world } = createAbilityMatch('checkpoint10-jet-protection');
    try {
      assert.ok(match.grantUpgrade('a', 'tentacles', 'branching', 1));
      assert.ok(match.grantUpgrade('a', 'spinnerets', 'epic', 1));
      assert.ok(match.grantUpgrade('a', 'jet', 'common', 1));
      for (const bot of match.view('a').bots)
        match.setBotHostility(bot.id, false);
      const body = (id) => {
        const p = match
          .view(id)
          .players.find((entry) => entry.id === id).position;
        return world.bodies
          .getAll()
          .find(
            (entry) =>
              entry.isDynamic() &&
              Math.hypot(
                entry.translation().x - p.x,
                entry.translation().z - p.z,
              ) < 0.01,
          );
      };
      const a = body('a'),
        b = body('b');
      assert.ok(a && b);
      a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
      b.setTranslation({ x: 30, y: 0.25, z: 0 }, true);
      assert.ok(match.advance(20));
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint10-jet-protection',
          playerId: 'a',
          sequence: 1,
          x: 1,
          y: 0,
          aim: Math.PI / 2,
          buttons: 4,
        }),
      );
      for (let i = 0; i < 6; i++) assert.ok(match.advance(50));
      const trail = match.view('a').trails[0];
      assert.ok(trail);
      a.setTranslation({ x: 20, y: 0.25, z: 0 }, true);
      a.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.setTranslation({ ...trail.position, y: 0.25 }, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      if (mode !== 'active') {
        assert.ok(
          match.setOffer('a', {
            id: 'jet-protection',
            revision: 1,
            choices: ['done'],
          }),
        );
        assert.equal(match.view('b').trails.length, 0);
        if (mode === 'resumed') {
          assert.ok(
            match.consume({
              kind: 'choice',
              matchId: 'checkpoint10-jet-protection',
              playerId: 'a',
              sequence: 2,
              offerId: 'jet-protection',
              revision: 1,
              choiceId: 'done',
            }),
          );
          assert.ok(match.view('b').trails.length > 0);
        }
      }
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint10-jet-protection',
          playerId: 'b',
          sequence: 1,
          x: 1,
          y: 0,
          aim: Math.PI / 2,
          buttons: 0,
        }),
      );
      const start = b.translation().x;
      for (let i = 0; i < 4; i++) assert.ok(match.advance(50));
      return b.translation().x - start;
    } finally {
      match.dispose();
    }
  };
  const slowed = run('active');
  const protectedDistance = run('protected');
  const resumed = run('resumed');
  assert.ok(
    slowed > 0 && protectedDistance > slowed * 1.1,
    `${slowed} vs ${protectedDistance}`,
  );
  assert.ok(Math.abs(resumed - slowed) < 1e-5, `${resumed} vs ${slowed}`);
});

test('Jet Nemertide corrosion is attributed to its owner and suppressed during selection', () => {
  const { match, world } = createAbilityMatch('checkpoint10-jet-corrosion');
  try {
    assert.ok(match.grantUpgrade('a', 'slithery', 'branching', 1));
    assert.ok(match.grantUpgrade('a', 'tentacles', 'branching', 1));
    for (let rank = 1; rank <= 3; rank++)
      assert.ok(match.grantUpgrade('a', 'pedal-glands', 'common', rank));
    assert.ok(match.advance(20));
    const offer = match.view('a').offer;
    assert.equal(offer.kind, 'specialization');
    assert.ok(
      match.consume({
        kind: 'choice',
        matchId: 'checkpoint10-jet-corrosion',
        playerId: 'a',
        sequence: 1,
        offerId: offer.id,
        revision: offer.revision,
        choiceId: 'pedal-glands-nemertide',
      }),
    );
    assert.ok(match.grantUpgrade('a', 'jet', 'common', 1));
    for (const bot of match.view('a').bots)
      match.setBotHostility(bot.id, false);
    const body = (id) => {
      const p = match
        .view(id)
        .players.find((entry) => entry.id === id).position;
      return world.bodies
        .getAll()
        .find(
          (entry) =>
            entry.isDynamic() &&
            Math.hypot(
              entry.translation().x - p.x,
              entry.translation().z - p.z,
            ) < 0.01,
        );
    };
    const a = body('a'),
      b = body('b');
    assert.ok(a && b);
    a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
    b.setTranslation({ x: 30, y: 0.25, z: 0 }, true);
    assert.ok(match.advance(20));
    assert.ok(
      match.consume({
        kind: 'control',
        matchId: 'checkpoint10-jet-corrosion',
        playerId: 'a',
        sequence: 2,
        x: 1,
        y: 0,
        aim: Math.PI / 2,
        buttons: 4,
      }),
    );
    for (let i = 0; i < 6; i++) assert.ok(match.advance(50));
    const trail = match.view('a').trails[0];
    assert.ok(trail);
    a.setTranslation({ x: 20, y: 0.25, z: 0 }, true);
    a.setLinvel({ x: 0, y: 0, z: 0 }, true);
    b.setTranslation({ ...trail.position, y: 0.25 }, true);
    b.setLinvel({ x: 0, y: 0, z: 0 }, true);
    assert.ok(
      match.setOffer('a', {
        id: 'protected-jet',
        revision: 1,
        choices: ['done'],
      }),
    );
    match.takeDamageLedger();
    for (let i = 0; i < 30; i++) assert.ok(match.advance(50));
    const corrosion = (events) =>
      events.filter(
        ({ event }) =>
          event.channel === 'corrosion' &&
          event.targetId === 'b' &&
          event.ownerId === 'a',
      );
    assert.equal(corrosion(match.takeDamageLedger()).length, 0);
    assert.ok(
      match.consume({
        kind: 'choice',
        matchId: 'checkpoint10-jet-corrosion',
        playerId: 'a',
        sequence: 3,
        offerId: 'protected-jet',
        revision: 1,
        choiceId: 'done',
      }),
    );
    for (let i = 0; i < 50; i++) assert.ok(match.advance(50));
    assert.ok(
      corrosion(match.takeDamageLedger()).some(({ result }) => result.hull > 0),
    );
  } finally {
    match.dispose();
  }
});

test('Jet webs apply Trap or hatch Egg Sac offspring, while skipping does neither', () => {
  for (const choiceId of ['spinnerets-trap', 'spinnerets-egg-sac', 'skip']) {
    const { match, world } = createAbilityMatch('checkpoint10-jet-web-choices');
    try {
      for (const id of ['a', 'b', 'c', 'd']) {
        assert.ok(
          match.setModifiers(id, [
            {
              id: 'fixture-health',
              stat: 'maximumHealth',
              add: 900,
              multiplier: 1,
            },
            {
              id: 'fixture-resistance',
              stat: 'damageResistance',
              add: 100,
              multiplier: 1,
            },
          ]),
        );
        match.repairPlayer(id, 900, false);
      }
      assert.ok(match.grantUpgrade('a', 'tentacles', 'branching', 1));
      for (let rank = 1; rank <= 3; rank++)
        assert.ok(match.grantUpgrade('a', 'spinnerets', 'epic', rank));
      assert.ok(match.advance(20));
      const offer = match.view('a').offer;
      assert.equal(offer.kind, 'specialization');
      assert.ok(
        match.consume({
          kind: 'choice',
          matchId: 'checkpoint10-jet-web-choices',
          playerId: 'a',
          sequence: 1,
          offerId: offer.id,
          revision: offer.revision,
          choiceId,
        }),
      );
      assert.ok(match.grantUpgrade('a', 'jet', 'common', 1));
      const body = (id) => {
        const p = match
          .view(id)
          .players.find((entry) => entry.id === id).position;
        return world.bodies
          .getAll()
          .find(
            (entry) =>
              entry.isDynamic() &&
              Math.hypot(
                entry.translation().x - p.x,
                entry.translation().z - p.z,
              ) < 0.01,
          );
      };
      const a = body('a'),
        b = body('b');
      assert.ok(a && b);
      a.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
      b.setTranslation({ x: 30, y: 0.25, z: 0 }, true);
      assert.ok(match.advance(20));
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint10-jet-web-choices',
          playerId: 'a',
          sequence: 2,
          x: 1,
          y: 0,
          aim: Math.PI / 2,
          buttons: 4,
        }),
      );
      for (let i = 0; i < 6; i++) assert.ok(match.advance(50));
      const trail = match.view('a').trails[0];
      assert.ok(trail);
      a.setTranslation({ x: 20, y: 0.25, z: 0 }, true);
      a.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.setTranslation({ ...trail.position, y: 0.25 }, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      assert.ok(match.advance(50));
      assert.equal(
        match
          .view('b')
          .players.find((p) => p.id === 'b')
          .statuses.some((status) => status.kind === 'stun'),
        choiceId === 'spinnerets-trap',
        choiceId,
      );
      const offspring = () =>
        match
          .view('a')
          .bots.filter(
            (bot) => bot.kind === 'offspring' && bot.ownerId === 'a',
          );
      assert.equal(offspring().length, 0);
      for (let i = 0; i < 75; i++) assert.ok(match.advance(100));
      assert.equal(
        offspring().length > 0,
        choiceId === 'spinnerets-egg-sac',
        choiceId,
      );
    } finally {
      match.dispose();
    }
  }
});
