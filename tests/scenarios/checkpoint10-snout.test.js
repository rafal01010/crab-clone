import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createArena,
  arenaPointClear,
  terrainAt,
} from '../../build-host/shared/arena.js';
import { createAbilityMatch } from './checkpoint08-ability-fixture.js';

test('Whiskers scales night speed with senses and turns off during the day', () => {
  for (const choiceId of ['snout-whiskers', 'skip']) {
    const { match, world } = createAbilityMatch('checkpoint10-snout', {
      finale: { shrinkStartMs: 500000, tinyAtMs: 600000, collapseAtMs: 700000 },
    });
    try {
      for (const id of ['a', 'b', 'c', 'd']) {
        assert.ok(
          match.setModifiers(id, [
            {
              id: 'resistance',
              stat: 'damageResistance',
              add: 100,
              multiplier: 1,
            },
            { id: 'heat', stat: 'heatAdaptation', add: 100, multiplier: 1 },
            { id: 'cold', stat: 'coldAdaptation', add: 100, multiplier: 1 },
            { id: 'health', stat: 'maximumHealth', add: 900, multiplier: 1 },
            { id: 'regen', stat: 'regeneration', add: 100, multiplier: 1 },
          ]),
        );
        match.repairPlayer(id, 1000, false);
      }
      for (let rank = 1; rank <= 3; rank++)
        assert.ok(match.grantUpgrade('a', 'snout', 'rare', rank));
      assert.ok(match.advance(20));
      const offer = match.view('a').offer;
      assert.ok(offer && offer.choices.includes(choiceId));
      assert.ok(
        match.consume({
          kind: 'choice',
          matchId: 'checkpoint10-snout',
          playerId: 'a',
          sequence: 1,
          offerId: offer.id,
          revision: offer.revision,
          choiceId,
        }),
      );
      const stats = () =>
        match.view('a').players.find((entry) => entry.id === 'a').stats;
      const position = match
        .view('a')
        .players.find((entry) => entry.id === 'a').position;
      const body = world.bodies
        .getAll()
        .find(
          (entry) =>
            entry.isDynamic() &&
            Math.hypot(
              entry.translation().x - position.x,
              entry.translation().z - position.z,
            ) < 0.01,
        );
      assert.ok(body);
      const arena = createArena(42);
      let course;
      for (let x = -18; x <= 18 && !course; x += 2)
        for (let z = -18; z <= 18 && !course; z += 2)
          if (arenaPointClear(arena.obstacles, { x, z }, 6)) course = { x, z };
      assert.ok(course);
      let sequence = 10;
      const drive = () => {
        body.setTranslation({ ...course, y: 0.25 }, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        for (const bot of match.view('a').bots)
          match.damageBatch([
            {
              targetId: bot.id,
              ownerId: null,
              channel: 'direct',
              amount: 10000,
              depth: 0,
            },
          ]);
        for (let i = 0; i < 8; i++) {
          assert.ok(
            match.consume({
              kind: 'control',
              matchId: 'checkpoint10-snout',
              playerId: 'a',
              sequence: sequence++,
              x: 1,
              y: 0,
              aim: 0,
              buttons: 0,
            }),
            JSON.stringify({
              player: match.view('a').players.find((entry) => entry.id === 'a')
                ?.life,
              offer: match.view('a').offer,
              phase: match.view('a').phase,
            }),
          );
          assert.ok(match.advance(50));
        }
        return body.translation().x - course.x;
      };
      const day = stats();
      const dayDistance = drive();
      assert.ok(
        match.setOffer('a', {
          id: 'phase-wait',
          revision: 1,
          choices: ['done'],
        }),
      );
      const untilNight =
        match.view('a').worldClock.nextTransitionAt - match.view('a').time;
      for (let elapsed = 0; elapsed < untilNight; elapsed += 1000)
        assert.ok(match.advance(Math.min(1000, untilNight - elapsed)));
      assert.equal(match.view('a').worldClock.phase, 'night');
      assert.ok(
        match.consume({
          kind: 'choice',
          matchId: 'checkpoint10-snout',
          playerId: 'a',
          sequence: sequence++,
          offerId: 'phase-wait',
          revision: 1,
          choiceId: 'done',
        }),
      );
      const nightDistance = drive();
      assert.ok(
        choiceId === 'snout-whiskers'
          ? nightDistance > dayDistance * 1.2
          : Math.abs(nightDistance - dayDistance) < 0.01,
        `${choiceId}: day ${dayDistance}, night ${nightDistance}`,
      );
      assert.ok(
        Math.abs(
          stats().speed -
            day.speed *
              (choiceId === 'snout-whiskers'
                ? 1 + Math.floor(day.senses / 30) * 0.1
                : 1),
        ) < 1e-9,
        JSON.stringify({
          choiceId,
          day,
          night: stats(),
          player: match.view('a').players.find((entry) => entry.id === 'a')
            .life,
        }),
      );
      assert.ok(
        match.setModifiers('a', [
          {
            id: 'resistance',
            stat: 'damageResistance',
            add: 100,
            multiplier: 1,
          },
          { id: 'health', stat: 'maximumHealth', add: 900, multiplier: 1 },
          { id: 'regen', stat: 'regeneration', add: 100, multiplier: 1 },
          { id: 'heat', stat: 'heatAdaptation', add: 100, multiplier: 1 },
          { id: 'cold', stat: 'coldAdaptation', add: 100, multiplier: 1 },
          { id: 'senses', stat: 'senses', add: 60, multiplier: 1 },
        ]),
      );
      const raised = stats();
      assert.ok(
        Math.abs(
          raised.speed -
            day.speed *
              (choiceId === 'snout-whiskers'
                ? 1 + Math.floor(raised.senses / 30) * 0.1
                : 1),
        ) < 1e-9,
      );
      const untilDay =
        match.view('a').worldClock.nextTransitionAt - match.view('a').time;
      for (let elapsed = 0; elapsed < untilDay; elapsed += 1000)
        assert.ok(match.advance(Math.min(1000, untilDay - elapsed)));
      assert.equal(match.view('a').worldClock.phase, 'day');
      assert.equal(stats().speed, day.speed);
    } finally {
      match.dispose();
    }
  }
});

test('Toxic Sequestration gains poison damage only from poisonous firmware', () => {
  const run = (choiceId, wanted) => {
    for (let attempt = 0; attempt < 256; attempt++) {
      const { match, world } = createAbilityMatch('checkpoint10-toxic-snout');
      try {
        assert.ok(
          match.setModifiers('a', [
            { id: 'senses', stat: 'senses', add: 400, multiplier: 1 },
            { id: 'health', stat: 'maximumHealth', add: 900, multiplier: 1 },
          ]),
        );
        match.repairPlayer('a', 1000, false);
        for (let rank = 1; rank <= 3; rank++)
          assert.ok(match.grantUpgrade('a', 'snout', 'rare', rank));
        assert.ok(match.advance(20));
        const offer = match.view('a').offer;
        assert.ok(offer && offer.choices.includes(choiceId));
        assert.ok(
          match.consume({
            kind: 'choice',
            matchId: 'checkpoint10-toxic-snout',
            playerId: 'a',
            sequence: 1,
            offerId: offer.id,
            revision: offer.revision,
            choiceId,
          }),
        );
        const arena = createArena(42);
        const point = arena.spawns
          .map((spawn) => ({ x: spawn.x + 5, z: spawn.z + 8 }))
          .find(
            (p) =>
              arenaPointClear(arena.obstacles, p) &&
              terrainAt(arena, p.x, p.z) !== 'water',
          );
        assert.ok(point);
        const player = match
          .view('a')
          .players.find((entry) => entry.id === 'a');
        const body = world.bodies
          .getAll()
          .find(
            (entry) =>
              entry.isDynamic() &&
              Math.hypot(
                entry.translation().x - player.position.x,
                entry.translation().z - player.position.z,
              ) < 0.01,
          );
        assert.ok(body);
        body.setTranslation({ ...point, y: 0.25 }, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        assert.ok(match.advance(10));
        const module = match
          .view('a')
          .firmware.find(
            (entry) =>
              Math.hypot(
                entry.position.x - point.x,
                entry.position.z - point.z,
              ) < 1,
          );
        assert.ok(module && module.knowledge.kind === 'identified');
        if ((module.knowledge.effect === 'poisonous') !== wanted) continue;
        const before = match.view('a').players.find((entry) => entry.id === 'a')
          .stats.poisonDamage;
        assert.ok(
          match.consume({
            kind: 'use-firmware',
            matchId: 'checkpoint10-toxic-snout',
            playerId: 'a',
            sequence: 2,
            targetId: module.id,
          }),
        );
        for (let i = 0; i < 30 && !match.view('a').lastFirmware; i++)
          assert.ok(match.advance(100));
        assert.equal(
          match.view('a').lastFirmware?.effect,
          module.knowledge.effect,
        );
        return (
          match.view('a').players.find((entry) => entry.id === 'a').stats
            .poisonDamage - before
        );
      } finally {
        match.dispose();
      }
    }
    throw new Error('No suitable firmware appeared after 256 matches');
  };
  assert.equal(run('snout-toxic-sequestration', true), 10);
  assert.equal(run('skip', true), 0);
  assert.equal(run('snout-toxic-sequestration', false), 0);
});

test('Toxic Sequestration stacks poisonous firmware and caps its contribution', () => {
  for (const [initial, offset, expected] of [
    [0, 0, [110, 120]],
    [895, -100, [900, 900]],
  ]) {
    let observed = false;
    for (let attempt = 0; attempt < 256 && !observed; attempt++) {
      const { match, world } = createAbilityMatch('checkpoint10-toxic-stacks');
      try {
        const modifiers = [
          { id: 'senses', stat: 'senses', add: 400, multiplier: 1 },
          { id: 'health', stat: 'maximumHealth', add: 900, multiplier: 1 },
          {
            id: 'fixture-offset',
            stat: 'poisonDamage',
            add: offset,
            multiplier: 1,
          },
          {
            id: 'specialization:snout-toxic-sequestration',
            stat: 'poisonDamage',
            add: initial,
            multiplier: 1,
          },
        ];
        assert.ok(match.setModifiers('a', modifiers));
        match.repairPlayer('a', 1000, false);
        for (let rank = 1; rank <= 3; rank++)
          assert.ok(match.grantUpgrade('a', 'snout', 'rare', rank));
        assert.ok(match.advance(20));
        const specialization = match.view('a').offer;
        assert.ok(specialization);
        let sequence = 1;
        assert.ok(
          match.consume({
            kind: 'choice',
            matchId: 'checkpoint10-toxic-stacks',
            playerId: 'a',
            sequence: sequence++,
            offerId: specialization.id,
            revision: specialization.revision,
            choiceId: 'snout-toxic-sequestration',
          }),
        );
        const arena = createArena(42);
        const points = arena.spawns
          .map((spawn) => ({ x: spawn.x + 5, z: spawn.z + 8 }))
          .filter(
            (point) =>
              arenaPointClear(arena.obstacles, point) &&
              terrainAt(arena, point.x, point.z) !== 'water',
          );
        assert.equal(points.length, 4);
        const player = match
          .view('a')
          .players.find((entry) => entry.id === 'a');
        const body = world.bodies
          .getAll()
          .find(
            (entry) =>
              entry.isDynamic() &&
              Math.hypot(
                entry.translation().x - player.position.x,
                entry.translation().z - player.position.z,
              ) < 0.01,
          );
        assert.ok(body);
        const visit = (point) => {
          body.setTranslation({ ...point, y: 0.25 }, true);
          body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          assert.ok(match.advance(10));
          return match
            .view('a')
            .firmware.find(
              (item) =>
                Math.hypot(
                  item.position.x - point.x,
                  item.position.z - point.z,
                ) < 1,
            );
        };
        const first = visit(points[0]);
        assert.ok(first && first.knowledge.kind === 'identified');
        if (first.knowledge.effect !== 'poisonous') continue;
        const consume = (module) => {
          for (let i = 0; i < 10 && match.view('a').offer; i++) {
            const offer = match.view('a').offer;
            assert.ok(
              match.consume({
                kind: 'choice',
                matchId: 'checkpoint10-toxic-stacks',
                playerId: 'a',
                sequence: sequence++,
                offerId: offer.id,
                revision: offer.revision,
                choiceId: offer.choices.includes('skip')
                  ? 'skip'
                  : offer.choices[0],
              }),
            );
            assert.ok(match.advance(10));
          }
          const previous = match.view('a').lastFirmware?.at;
          assert.ok(
            match.consume({
              kind: 'use-firmware',
              matchId: 'checkpoint10-toxic-stacks',
              playerId: 'a',
              sequence: sequence++,
              targetId: module.id,
            }),
          );
          for (
            let i = 0;
            i < 50 && match.view('a').lastFirmware?.at === previous;
            i++
          ) {
            assert.ok(match.advance(100));
            const pending = match.view('a').offer;
            if (pending) {
              assert.ok(
                match.consume({
                  kind: 'choice',
                  matchId: 'checkpoint10-toxic-stacks',
                  playerId: 'a',
                  sequence: sequence++,
                  offerId: pending.id,
                  revision: pending.revision,
                  choiceId: pending.choices.includes('skip')
                    ? 'skip'
                    : pending.choices[0],
                }),
              );
              if (match.view('a').lastFirmware?.at === previous)
                assert.ok(
                  match.consume({
                    kind: 'use-firmware',
                    matchId: 'checkpoint10-toxic-stacks',
                    playerId: 'a',
                    sequence: sequence++,
                    targetId: module.id,
                  }),
                );
            }
          }
          assert.equal(match.view('a').lastFirmware?.effect, 'poisonous');
          assert.notEqual(match.view('a').lastFirmware?.at, previous);
          const offer = match.view('a').offer;
          if (offer)
            assert.ok(
              match.consume({
                kind: 'choice',
                matchId: 'checkpoint10-toxic-stacks',
                playerId: 'a',
                sequence: sequence++,
                offerId: offer.id,
                revision: offer.revision,
                choiceId: offer.choices.includes('skip')
                  ? 'skip'
                  : offer.choices[0],
              }),
            );
          return match.view('a').players.find((entry) => entry.id === 'a').stats
            .poisonDamage;
        };
        const actual = [consume(first)];
        const second = visit(points[2]);
        assert.ok(second && second.appearance === first.appearance);
        actual.push(consume(second));
        assert.deepEqual(actual, expected);
        if (initial === 0) {
          assert.ok(match.grantUpgrade('a', 'saliva', 'common', 1));
          assert.ok(match.grantUpgrade('a', 'projectile-tongue', 'rare', 1));
          assert.ok(match.grantUpgrade('a', 'poisonous-saliva', 'rare', 1));
          const target = match
            .view('b')
            .players.find((entry) => entry.id === 'b');
          const targetBody = world.bodies
            .getAll()
            .find(
              (entry) =>
                entry.isDynamic() &&
                Math.hypot(
                  entry.translation().x - target.position.x,
                  entry.translation().z - target.position.z,
                ) < 0.01,
            );
          assert.ok(targetBody);
          body.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
          body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          targetBody.setTranslation({ x: 4, y: 0.25, z: 0 }, true);
          targetBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
          assert.ok(match.advance(20));
          const ability = match
            .view('a')
            .players.find((entry) => entry.id === 'a').stats.ability;
          const slots = match.view('a').equipment.slots;
          const button =
            slots.primary === 'projectile-tongue'
              ? 1
              : slots.secondary === 'projectile-tongue'
                ? 2
                : 0;
          assert.ok(button);
          match.takeDamageLedger();
          assert.ok(
            match.consume({
              kind: 'control',
              matchId: 'checkpoint10-toxic-stacks',
              playerId: 'a',
              sequence: sequence++,
              x: 0,
              y: 0,
              aim: Math.PI / 2,
              buttons: button,
            }),
          );
          for (let i = 0; i < 40; i++) {
            for (const bot of match.view('a').bots)
              match.damageBatch([
                {
                  targetId: bot.id,
                  ownerId: null,
                  channel: 'direct',
                  amount: 10000,
                  depth: 0,
                },
              ]);
            assert.ok(match.advance(50));
          }
          const ledger = match.takeDamageLedger();
          assert.ok(
            ledger.some(
              ({ event, result }) =>
                event.abilityId === 'projectile-tongue' &&
                event.targetId === 'b' &&
                result.hull + result.plating > 0,
            ),
          );
          const tick = ledger.find(
            ({ event }) =>
              event.channel === 'corrosion' &&
              event.ownerId === 'a' &&
              event.targetId === 'b',
          );
          assert.ok(tick);
          assert.ok(Math.abs(tick.result.hull - ability * 0.1 * 1.2) < 1e-6);
        }
        observed = true;
      } finally {
        match.dispose();
      }
    }
    assert.ok(observed, 'poisonous firmware found');
  }
});
