import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import {
  createAbilityMatch,
  enableQaSurvival,
} from './checkpoint08-ability-fixture.js';
import { createArena, terrainAt } from '../../build-host/shared/arena.js';
import { createPointsOfInterest } from '../../build-host/server/match/points-of-interest.js';

function foodRoute(first, second, initialSeed, third) {
  const originalRandom = Math.random,
    originalRandomInt = crypto.randomInt;
  let seed = initialSeed;
  Math.random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  crypto.randomInt = (min, max) =>
    max === undefined
      ? Math.floor(Math.random() * min)
      : min + Math.floor(Math.random() * (max - min));
  syncBuiltinESMExports();
  const { match, world } = createAbilityMatch('checkpoint10-food-route');
  try {
    for (const bot of match.view('a').bots)
      match.setBotHostility(bot.id, false);
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
          {
            id: 'fixture-heat',
            stat: 'heatAdaptation',
            add: 400,
            multiplier: 1,
          },
          {
            id: 'fixture-cold',
            stat: 'coldAdaptation',
            add: 400,
            multiplier: 1,
          },
        ]),
      );
      match.repairPlayer(id, 900, false);
    }
    let firstChosen = false,
      sequence = 0,
      collections = 0,
      foodProgress = 0;
    for (let tick = 0; tick < 4000; tick++) {
      const state = match.view('a');
      const owned = state.progression.upgrades.map((item) => item.id);
      if (
        owned.includes(first) &&
        owned.includes(second) &&
        (!third || owned.includes(third)) &&
        !(second === 'hibernation' && state.offer)
      ) {
        assert.ok(firstChosen && collections > 0 && foodProgress > 0);
        if (second === 'vegan') {
          const point = state.players.find(
            (player) => player.id === 'a',
          ).position;
          const body = world.bodies
            .getAll()
            .find(
              (item) =>
                item.isDynamic() &&
                Math.hypot(
                  item.translation().x - point.x,
                  item.translation().z - point.z,
                ) < 0.01,
            );
          assert.ok(body);
          const elapsed = state.boundary.elapsedMs;
          match.syncWallClock(1000);
          match.syncWallClock(1000 + 1500000 - elapsed);
          body.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
          body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          assert.ok(match.advance(20));
          for (let i = 0; i < 20 && match.view('a').offer; i++) {
            const offer = match.view('a').offer;
            assert.ok(
              match.consume({
                kind: 'choice',
                matchId: 'checkpoint10-food-route',
                playerId: 'a',
                sequence: ++sequence,
                offerId: offer.id,
                revision: offer.revision,
                choiceId: offer.choices.includes('skip')
                  ? 'skip'
                  : offer.choices[0],
              }),
            );
            assert.ok(match.advance(20));
          }
          assert.equal(match.view('a').offer, null);
          match.takeCollections();
          const spawn = (source) =>
            match.spawnResource({
              position: { x: 0, z: 0 },
              source,
              rarity: 'common',
              killerId: null,
              ownerId: null,
              killerKind: null,
              repair: false,
            });
          const vegetation = spawn('vegetation');
          const meat = spawn('meat');
          assert.ok(vegetation && meat);
          assert.ok(match.advance(50));
          const events = match
            .takeCollections()
            .filter((event) => event.playerId === 'a');
          assert.ok(match.view('a').boundary.radius <= 3.01);
          assert.ok(
            events.some(
              (event) => event.resourceId === vegetation && event.progress > 0,
            ),
          );
          assert.ok(events.every((event) => event.resourceId !== meat));
          return;
        }
        if (second === 'tracker') {
          const tracker = state.progression.upgrades.find(
            (item) => item.id === 'tracker',
          );
          const rate = { rare: 20, epic: 25, legendary: 30 }[tracker.rarity];
          assert.equal(
            state.players.find((player) => player.id === 'a').stats.trackerFood,
            rate * tracker.rank,
          );
          const arena = createArena(42);
          const sites = createPointsOfInterest(
            arena.poiSockets,
            (point) => terrainAt(arena, point.x, point.z),
            42,
          );
          const discovered = new Set(
            match
              .takeDiscoveries()
              .filter((event) => event.playerId === 'a')
              .map((event) => event.siteId),
          );
          const site = sites.find((entry) => !discovered.has(entry.id));
          assert.ok(site);
          const point = state.players.find(
            (player) => player.id === 'a',
          ).position;
          const body = world.bodies
            .getAll()
            .find(
              (entry) =>
                entry.isDynamic() &&
                Math.hypot(
                  entry.translation().x - point.x,
                  entry.translation().z - point.z,
                ) < 0.01,
            );
          assert.ok(body);
          const level = state.players.find((player) => player.id === 'a').health
            .level;
          const progress = state.progression.progress;
          body.setTranslation({ ...site.position, y: 0.25 }, true);
          body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          assert.ok(match.advance(50));
          assert.ok(
            match
              .takeDiscoveries()
              .some(
                (event) => event.playerId === 'a' && event.siteId === site.id,
              ),
          );
          const after = match.view('a');
          assert.ok(
            after.progression.progress > progress ||
              after.players.find((player) => player.id === 'a').health.level >
                level,
          );
          return;
        }
        if (third === 'jet') {
          assert.equal(state.equipment.slots.movement, 'jet');
          const position = state.players.find(
            (player) => player.id === 'a',
          ).position;
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
          const elapsed = state.boundary.elapsedMs;
          match.syncWallClock(1000);
          match.syncWallClock(1000 + 1500000 - elapsed);
          body.setTranslation({ x: -1.5, y: 0.25, z: 0 }, true);
          body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          assert.ok(
            match.consume({
              kind: 'control',
              matchId: 'checkpoint10-food-route',
              playerId: 'a',
              sequence: ++sequence,
              x: 1,
              y: 0,
              aim: Math.PI / 2,
              buttons: 4,
            }),
          );
          for (let i = 0; i < 6; i++) assert.ok(match.advance(50));
          assert.ok(match.view('a').boundary.radius <= 3.01);
          assert.ok(match.view('a').trails.length > 0);
          return;
        }
        if (second === 'toe-beans') {
          assert.ok(match.recruitCompanion('b', 'command-target', 0));
          const target = match
            .view('b')
            .bots.find((bot) => bot.ownerId === 'b');
          assert.ok(target);
          const findBody = (position) =>
            world.bodies
              .getAll()
              .find(
                (entry) =>
                  entry.isDynamic() &&
                  Math.hypot(
                    entry.translation().x - position.x,
                    entry.translation().z - position.z,
                  ) < 0.01,
              );
          const attacker = findBody(
            state.players.find((player) => player.id === 'a').position,
          );
          const targetBody = findBody(target.position);
          assert.ok(attacker && targetBody && attacker !== targetBody);
          const elapsed = state.boundary.elapsedMs;
          match.syncWallClock(1000);
          match.syncWallClock(1000 + 1500000 - elapsed);
          attacker.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
          attacker.setLinvel({ x: 0, y: 0, z: 0 }, true);
          targetBody.setTranslation({ x: 1.8, y: 0.25, z: 0 }, true);
          targetBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
          const slots = state.equipment.slots;
          const button =
            slots.primary === 'toe-beans'
              ? 1
              : slots.secondary === 'toe-beans'
                ? 2
                : 0;
          assert.ok(button);
          crypto.randomInt = (...args) =>
            args.length === 1 && args[0] === 1_000_000
              ? 0
              : originalRandomInt(...args);
          syncBuiltinESMExports();
          match.takeDamageLedger();
          assert.ok(
            match.consume({
              kind: 'control',
              matchId: 'checkpoint10-food-route',
              playerId: 'a',
              sequence: ++sequence,
              x: 0,
              y: 0,
              aim: Math.PI / 2,
              buttons: button,
            }),
          );
          for (let i = 0; i < 30; i++) assert.ok(match.advance(50));
          assert.ok(match.view('a').boundary.radius <= 3.01);
          assert.ok(
            match
              .takeDamageLedger()
              .some(
                ({ event }) =>
                  event.ownerId === 'a' &&
                  event.targetId === target.id &&
                  event.abilityId === 'toe-beans',
              ),
          );
          assert.equal(
            match.view('a').bots.find((bot) => bot.id === target.id)?.ownerId,
            'a',
          );
          return;
        }
        if (second === 'shifty') {
          const stats = state.players.find((player) => player.id === 'a').stats;
          assert.ok(stats.size < 100, `size ${stats.size}`);
          assert.ok(stats.dodge > 0, `dodge ${stats.dodge}`);
          assert.ok(stats.damage > 100, `damage ${stats.damage}`);
          const elapsed = state.boundary.elapsedMs;
          match.syncWallClock(1000);
          match.syncWallClock(1000 + 1500000 - elapsed);
          const point = state.players.find(
            (player) => player.id === 'a',
          ).position;
          const body = world.bodies
            .getAll()
            .find(
              (entry) =>
                entry.isDynamic() &&
                Math.hypot(
                  entry.translation().x - point.x,
                  entry.translation().z - point.z,
                ) < 0.01,
            );
          assert.ok(body);
          body.setTranslation({ x: 0, y: 0.25, z: 0 }, true);
          body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          assert.ok(match.advance(20));
          assert.ok(match.view('a').boundary.radius <= 3.01);
          for (let i = 0; i < 20 && match.view('a').offer; i++) {
            const offer = match.view('a').offer;
            assert.ok(
              match.consume({
                kind: 'choice',
                matchId: 'checkpoint10-food-route',
                playerId: 'a',
                sequence: ++sequence,
                offerId: offer.id,
                revision: offer.revision,
                choiceId: offer.choices.includes('skip')
                  ? 'skip'
                  : (offer.choices.find((id) => id !== 'chonky') ??
                    offer.choices[0]),
              }),
            );
            assert.ok(match.advance(20));
          }
          assert.equal(match.view('a').offer, null);
          Math.random = () => 0;
          const dodged = match.damageBatch([
            {
              targetId: 'a',
              ownerId: 'b',
              amount: 20,
              channel: 'direct',
              depth: 0,
            },
          ])[0];
          assert.equal(dodged.dodged, true);
          Math.random = () => 0.999999;
          const hit = match.damageBatch([
            {
              targetId: 'a',
              ownerId: 'b',
              amount: 20,
              channel: 'direct',
              depth: 0,
            },
          ])[0];
          assert.equal(hit.dodged, false);
          assert.ok(hit.hull + hit.plating > 0);
          const opponentPosition = match
            .view('b')
            .players.find((p) => p.id === 'b').position;
          const opponent = world.bodies
            .getAll()
            .find(
              (entry) =>
                entry.isDynamic() &&
                Math.hypot(
                  entry.translation().x - opponentPosition.x,
                  entry.translation().z - opponentPosition.z,
                ) < 0.01,
            );
          assert.ok(opponent);
          opponent.setTranslation({ x: -1.5, y: 0.25, z: 0 }, true);
          opponent.setLinvel({ x: 0, y: 0, z: 0 }, true);
          Math.random = () => 0;
          match.takeDamageLedger();
          assert.ok(
            match.consume({
              kind: 'control',
              matchId: 'checkpoint10-food-route',
              playerId: 'b',
              sequence: 1,
              x: 0,
              y: 0,
              aim: Math.PI / 2,
              buttons: 1,
            }),
          );
          for (let i = 0; i < 10; i++) assert.ok(match.advance(50));
          assert.ok(
            match
              .takeDamageLedger()
              .some(
                ({ event, result }) =>
                  event.ownerId === 'b' &&
                  event.targetId === 'a' &&
                  result.dodged,
              ),
          );
          assert.ok(
            match.consume({
              kind: 'control',
              matchId: 'checkpoint10-food-route',
              playerId: 'b',
              sequence: 2,
              x: 0,
              y: 0,
              aim: Math.PI / 2,
              buttons: 0,
            }),
          );
          for (let i = 0; i < 20; i++) assert.ok(match.advance(50));
          Math.random = () => 0.999999;
          match.takeDamageLedger();
          assert.ok(
            match.consume({
              kind: 'control',
              matchId: 'checkpoint10-food-route',
              playerId: 'b',
              sequence: 3,
              x: 0,
              y: 0,
              aim: Math.PI / 2,
              buttons: 1,
            }),
          );
          for (let i = 0; i < 10; i++) assert.ok(match.advance(50));
          assert.ok(
            match
              .takeDamageLedger()
              .some(
                ({ event, result }) =>
                  event.ownerId === 'b' &&
                  event.targetId === 'a' &&
                  !result.dodged &&
                  result.hull + result.plating > 0,
              ),
          );
          return;
        }
        if (second === 'hibernation') {
          const hibernation = state.progression.upgrades.find(
            (item) => item.id === 'hibernation',
          );
          assert.ok(hibernation);
          const position = state.players.find(
            (player) => player.id === 'a',
          ).position;
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
          const shelters = createArena(42).shelters;
          const shelter = shelters.reduce((closest, point) =>
            Math.hypot(point.x, point.z) < Math.hypot(closest.x, closest.z)
              ? point
              : closest,
          );
          const shelterId = `shelter-${shelters.indexOf(shelter)}`;
          const elapsed = match.view('a').boundary.elapsedMs;
          match.syncWallClock(1000);
          match.syncWallClock(1000 + 1410000 - elapsed);
          body.setTranslation({ ...shelter, y: 0.25 }, true);
          body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          assert.ok(match.advance(50));
          match.takeDiscoveries();
          match.takeCollections();
          for (let i = 0; i < 10 && match.view('a').offer; i++) {
            const offer = match.view('a').offer;
            assert.ok(
              match.consume({
                kind: 'choice',
                matchId: 'checkpoint10-food-route',
                playerId: 'a',
                sequence: ++sequence,
                offerId: offer.id,
                revision: offer.revision,
                choiceId: offer.choices.includes('skip')
                  ? 'skip'
                  : offer.choices[0],
              }),
            );
            assert.ok(match.advance(10));
          }
          match.takeDiscoveries();
          match.takeCollections();
          assert.ok(
            match.view('a').boundary.radius > Math.hypot(shelter.x, shelter.z),
          );
          assert.ok(match.view('a').boundary.radius < 30);
          assert.ok(
            match.consume({
              kind: 'shelter',
              matchId: 'checkpoint10-food-route',
              playerId: 'a',
              sequence: ++sequence,
              targetId: shelterId,
            }),
          );
          const before = match.view('a').progression;
          for (let i = 0; i < 10; i++) assert.ok(match.advance(100));
          const after = match.view('a').progression;
          assert.equal(
            match.takeCollections().filter((event) => event.playerId === 'a')
              .length,
            0,
          );
          assert.equal(
            match.takeDiscoveries().filter((event) => event.playerId === 'a')
              .length,
            0,
          );
          const rates = { common: 2.5, rare: 3, epic: 3.5, legendary: 4 };
          const earned =
            after.progress +
            (after.level - before.level) * before.required -
            before.progress;
          assert.ok(
            earned >=
              (before.required * rates[hibernation.rarity] * hibernation.rank) /
                100 -
                1e-6,
          );
          return;
        }
        const weapon = second === 'horns' ? 'horns' : 'spit';
        const finale = third === 'poisonous-saliva' || weapon === 'horns';
        assert.ok(Object.values(state.equipment.slots).includes(weapon));
        if (weapon === 'horns') {
          const jaws = state.progression.upgrades.find(
            (item) => item.id === 'jaws',
          );
          const values = {
            common: [10, 20, 30, 40, 50],
            rare: [12, 25, 37, 50, 62],
            epic: [14, 30, 45, 60, 75],
            legendary: [17, 35, 52, 70, 90],
          };
          assert.ok(jaws);
          assert.ok(
            state.players.find((player) => player.id === 'a').stats
              .salvageSpeed >=
              100 + values[jaws.rarity][jaws.rank - 1],
          );
        }
        const body = (id) => {
          const point = match
            .view(id)
            .players.find((player) => player.id === id).position;
          return world.bodies
            .getAll()
            .find(
              (entry) =>
                entry.isDynamic() &&
                Math.hypot(
                  entry.translation().x - point.x,
                  entry.translation().z - point.z,
                ) < 0.01,
            );
        };
        const a = body('a'),
          b = body('b');
        assert.ok(a && b);
        if (finale) {
          const elapsed = match.view('a').boundary.elapsedMs;
          match.syncWallClock(1000);
          match.syncWallClock(1000 + 1500000 - elapsed);
        }
        a.setTranslation(
          { x: weapon === 'horns' ? -0.9 : third ? -2 : 0, y: 0.25, z: 0 },
          true,
        );
        b.setTranslation(
          { x: weapon === 'horns' ? 0.9 : third ? 2 : 5, y: 0.25, z: 0 },
          true,
        );
        a.setLinvel({ x: 0, y: 0, z: 0 }, true);
        b.setLinvel({ x: 0, y: 0, z: 0 }, true);
        assert.ok(match.advance(20));
        if (finale) {
          const boundary = match.view('a').boundary;
          assert.ok(boundary.radius <= 3.01 && boundary.radius > 2.5);
        }
        const clearBots = () => {
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
        };
        if (finale) clearBots();
        match.takeDamageLedger();
        assert.ok(
          match.consume({
            kind: 'control',
            matchId: 'checkpoint10-food-route',
            playerId: 'a',
            sequence: ++sequence,
            x: 0,
            y: 0,
            aim: Math.PI / 2,
            buttons: state.equipment.slots.primary === weapon ? 1 : 2,
          }),
        );
        for (let i = 0; i < 35; i++) {
          if (finale) clearBots();
          assert.ok(match.advance(50));
        }
        const ledger = match.takeDamageLedger();
        assert.ok(
          ledger.some(
            ({ event, result }) =>
              event.abilityId === weapon &&
              event.targetId === 'b' &&
              result.hull + result.plating > 0,
          ),
        );
        if (third === 'poisonous-saliva')
          assert.ok(
            ledger.some(
              ({ event }) =>
                event.channel === 'corrosion' &&
                event.ownerId === 'a' &&
                event.targetId === 'b',
            ),
          );
        return;
      }
      if (state.offer) {
        const needsDietRank =
          second === 'vegan' &&
          state.progression.upgrades.find((item) => item.id === 'herbivore')
            ?.rank < 2;
        const wanted = !owned.includes(first) || needsDietRank
          ? first
          : !owned.includes(second)
            ? second
            : third;
        const choice = state.offer.choices.includes(wanted)
          ? wanted
          : state.offer.choices.includes('skip')
            ? 'skip'
            : (state.offer.choices.find(
                (id) =>
                  id !== 'vegan' &&
                  (second !== 'vegan' ||
                    !['carnivore', 'piscivore', 'scavenger'].includes(id)) &&
                  (first !== 'arms' || id !== 'claws') &&
                  (first !== 'smol' || id !== 'chonky') &&
                  (firstChosen || id !== second) &&
                  (first !== 'fur' ||
                    firstChosen ||
                    !['scales', 'exoskeleton'].includes(id)) &&
                  (first !== 'jaws' ||
                    firstChosen ||
                    !['snout', 'beak', 'leech'].includes(id)),
              ) ?? state.offer.choices[0]);
        if (
          third &&
          owned.includes('spit') &&
          !Object.values(state.equipment.slots).includes('spit')
        )
          assert.ok(
            match.consume({
              kind: 'equipment',
              matchId: 'checkpoint10-food-route',
              playerId: 'a',
              sequence: ++sequence,
              offerId: state.offer.id,
              revision: state.offer.revision,
              slot: 'primary',
              contentId: 'spit',
            }),
            JSON.stringify({ offer: state.offer, equipment: state.equipment }),
          );
        assert.ok(
          match.consume({
            kind: 'choice',
            matchId: 'checkpoint10-food-route',
            playerId: 'a',
            sequence: ++sequence,
            offerId: state.offer.id,
            revision: match.view('a').offer.revision,
            choiceId: choice,
          }),
        );
        if (choice === first) firstChosen = true;
      } else if (tick % 20 === 0) {
        const position = state.players.find(
          (player) => player.id === 'a',
        ).position;
        for (let i = 0; i < 10; i++)
          match.spawnResource({
            position,
            source: 'vegetation',
            rarity: 'legendary',
            killerId: null,
            ownerId: null,
            killerKind: null,
            repair: false,
          });
      }
      assert.ok(match.advance(50));
      for (const event of match.takeCollections())
        if (event.playerId === 'a' && event.source === 'vegetation') {
          collections++;
          foodProgress += event.progress;
        }
    }
    assert.fail(
      `route incomplete: first=${firstChosen}, collections=${collections}, xp=${foodProgress}, level=${match.view('a').progression.level}`,
    );
  } finally {
    match.dispose();
    Math.random = originalRandom;
    crypto.randomInt = originalRandomInt;
    syncBuiltinESMExports();
  }
}

function naturalControlRoute(godMode) {
  const originalRandom = Math.random;
  const originalRandomInt = crypto.randomInt;
  let seed = 4291;
  Math.random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  crypto.randomInt = (min, max) =>
    max === undefined
      ? Math.floor(Math.random() * min)
      : min + Math.floor(Math.random() * (max - min));
  syncBuiltinESMExports();
  const { match } = createAbilityMatch('checkpoint10-natural-controls');
  try {
    const restoreHealth = godMode ? enableQaSurvival(match, 'a') : null;
    let sequence = 0;
    let collectedProgress = 0;
    let choices = 0;
    const attacks = new Set();
    const finaleAttacks = new Set();
    let finaleJetTrail = false;
    let jetTrailWindow = 0;
    let trailsBeforeJet = new Set();
    let lastPosition;
    let escapeUntil = 0;
    let escapeAngle = 0;
    for (let step = 0; step < (godMode ? 18000 : 7000); step++) {
      const state = match.view('a');
      const player = state.players.find((item) => item.id === 'a');
      assert.equal(player.life.kind, 'alive', 'player must survive the route');
      if (
        godMode &&
        state.boundary.radius <= 3.01 &&
        Math.hypot(player.position.x, player.position.z) < 3 &&
        finaleAttacks.has('spit') &&
        finaleJetTrail
      ) {
        assert.ok(choices > 0 && collectedProgress > 0);
        assert.ok(attacks.size > 0, 'the player used an acquired attack');
        const owned = state.progression.upgrades.map((item) => item.id);
        for (const id of ['spit', 'jet', 'pedal-glands', 'shifty', 'nomadic'])
          assert.ok(owned.includes(id), `${id} was acquired`);
        console.log(
          `QA finale: ${choices} choices; upgrades ${state.progression.upgrades.map((item) => item.id).join(', ')}; finale attacks ${[...finaleAttacks].join(', ')}`,
        );
        return;
      }
      if (state.offer) {
        const priorities = [
          'saliva',
          'spit',
          'jaws',
          'horns',
          'beak',
          'body-slam',
          'stinger',
          'antlers',
          'regenerative-tissue',
          'robust',
          'impervious',
          'shifty',
          'carapace',
          'scales',
          'fur',
          'hump',
        ];
        const choice = state.offer.choices.includes('skip')
          ? 'skip'
          : (priorities.find((id) => state.offer.choices.includes(id)) ??
            state.offer.choices[0]);
        assert.ok(collectedProgress > 0);
        assert.ok(
          match.consume({
            kind: 'choice',
            matchId: 'checkpoint10-natural-controls',
            playerId: 'a',
            sequence: ++sequence,
            offerId: state.offer.id,
            revision: state.offer.revision,
            choiceId: choice,
          }),
        );
        choices++;
        if (!godMode && choices >= 26) {
          const owned = match
            .view('a')
            .progression.upgrades.map((item) => item.id);
          for (const id of ['jaws', 'horns', 'saliva'])
            assert.ok(owned.includes(id), `${id} was acquired`);
          assert.ok(
            ['body-slam', 'jaws', 'horns'].some((id) => attacks.has(id)),
            `the naturally acquired attack dealt damage: ${[...attacks]}`,
          );
          return;
        }
      }
      const target = state.resources
        .filter(
          (resource) =>
            Math.hypot(resource.position.x, resource.position.z) <
              Math.min(95, state.boundary.radius - 7) &&
            (!resource.repair ||
              player.health.hull < player.stats.maximumHealth * 0.8),
        )
        .sort(
          (a, b) =>
            Math.hypot(
              a.position.x - player.position.x,
              a.position.z - player.position.z,
            ) -
            Math.hypot(
              b.position.x - player.position.x,
              b.position.z - player.position.z,
            ),
        )[0];
      const dx = target
        ? target.position.x - player.position.x
        : -player.position.x;
      const dz = target
        ? target.position.z - player.position.z
        : -player.position.z;
      const distance = Math.hypot(dx, dz) || 1;
      let x = distance > 0.8 ? dx / distance : 0;
      let y = distance > 0.8 ? dz / distance : 0;
      const threat = state.bots
        .filter((bot) => bot.kind === 'wild' && bot.role === 'hunter')
        .sort(
          (a, b) =>
            Math.hypot(
              a.position.x - player.position.x,
              a.position.z - player.position.z,
            ) -
            Math.hypot(
              b.position.x - player.position.x,
              b.position.z - player.position.z,
            ),
        )[0];
      const tx = threat?.position.x - player.position.x;
      const tz = threat?.position.z - player.position.z;
      const threatDistance = Math.hypot(tx, tz);
      if (threatDistance < 12) {
        let awayX = 0;
        let awayZ = 0;
        for (const bot of state.bots.filter(
          (item) => item.kind === 'wild' && item.role === 'hunter',
        )) {
          const bx = player.position.x - bot.position.x;
          const bz = player.position.z - bot.position.z;
          const distance = Math.hypot(bx, bz);
          if (distance > 0 && distance < 12) {
            awayX += (bx / distance) * (12 - distance);
            awayZ += (bz / distance) * (12 - distance);
          }
        }
        const length = Math.hypot(awayX, awayZ);
        if (length > 0) {
          x = awayX / length;
          y = awayZ / length;
        }
      }
      if (step % 20 === 0) {
        if (
          lastPosition &&
          Math.hypot(
            player.position.x - lastPosition.x,
            player.position.z - lastPosition.z,
          ) < 0.4 &&
          Math.hypot(x, y) > 0.1
        ) {
          escapeUntil = step + 40;
          escapeAngle = Math.atan2(y, x) + Math.PI / 2;
        }
        lastPosition = player.position;
      }
      if (step < escapeUntil) {
        x = Math.cos(escapeAngle);
        y = Math.sin(escapeAngle);
      }
      let aim = threatDistance < 8 ? Math.atan2(tx, tz) : Math.atan2(dx, dz);
      let buttons = threatDistance < 8 ? 5 : threatDistance < 14 ? 1 : 0;
      let jetAttempt = false;
      if (godMode && state.boundary.radius < 12) {
        const centerDistance = Math.hypot(player.position.x, player.position.z);
        const centerThreshold = finaleAttacks.has('spit') ? 0.4 : 1;
        x =
          centerDistance > centerThreshold
            ? -player.position.x / centerDistance
            : 0;
        y =
          centerDistance > centerThreshold
            ? -player.position.z / centerDistance
            : 0;
        const opponent = state.bots
          .filter((bot) => bot.kind === 'wild')
          .sort(
            (a, b) =>
              Math.hypot(
                a.position.x - player.position.x,
                a.position.z - player.position.z,
              ) -
              Math.hypot(
                b.position.x - player.position.x,
                b.position.z - player.position.z,
              ),
          )[0];
        if (opponent) {
          aim = Math.atan2(
            opponent.position.x - player.position.x,
            opponent.position.z - player.position.z,
          );
          buttons = 3;
        }
        if (
          state.boundary.radius <= 3.01 &&
          centerDistance < 0.9 &&
          finaleAttacks.has('spit') &&
          !finaleJetTrail &&
          jetTrailWindow === 0 &&
          step % 2 === 0
        ) {
          assert.equal(state.equipment.slots.movement, 'jet');
          buttons |= 4;
          jetAttempt = true;
          trailsBeforeJet = new Set(state.trails.map((trail) => trail.id));
        }
      }
      assert.ok(
        match.consume({
          kind: 'control',
          matchId: 'checkpoint10-natural-controls',
          playerId: 'a',
          sequence: ++sequence,
          x,
          y,
          aim,
          buttons,
        }),
      );
      assert.ok(match.advance(100));
      restoreHealth?.();
      if (jetAttempt) {
        const after = match.view('a');
        const beforeReady = state.equipment.learned.find(
          (item) => item.id === 'jet',
        ).readyAt;
        const afterReady = after.equipment.learned.find(
          (item) => item.id === 'jet',
        ).readyAt;
        if (afterReady > beforeReady) jetTrailWindow = 6;
      }
      if (jetTrailWindow > 0) {
        finaleJetTrail = match
          .view('a')
          .trails.some(
            (trail) =>
              !trailsBeforeJet.has(trail.id) &&
              Math.hypot(trail.position.x, trail.position.z) < 3,
          );
        jetTrailWindow--;
      }
      for (const { event, result } of match.takeDamageLedger())
        if (
          event.ownerId === 'a' &&
          event.abilityId &&
          result.hull + result.plating > 0
        ) {
          attacks.add(event.abilityId);
          if (
            state.boundary.radius <= 3.01 &&
            Math.hypot(player.position.x, player.position.z) < 3
          ) {
            finaleAttacks.add(event.abilityId);
          }
        }
      collectedProgress += match
        .takeCollections()
        .filter((event) => event.playerId === 'a')
        .reduce((sum, event) => sum + event.progress, 0);
    }
    const end = match.view('a');
    assert.fail(
      `route accepted ${choices} choices without reaching its goal: ${JSON.stringify({ position: end.players.find((item) => item.id === 'a')?.position, boundary: end.boundary, finaleAttacks: [...finaleAttacks], finaleJetTrail, jetTrailWindow })}`,
    );
  } finally {
    match.dispose();
    Math.random = originalRandom;
    crypto.randomInt = originalRandomInt;
    syncBuiltinESMExports();
  }
}

test('movement controls fund several generated choices from natural resources without fixture assistance', () =>
  naturalControlRoute(false));

test(
  'QA survival mode reaches the final area through natural movement and progression',
  { timeout: 120000 },
  () => naturalControlRoute(true),
);

test('naturally initialized food funds a generated level-up choice', () => {
  const originalRandom = Math.random;
  const originalRandomInt = crypto.randomInt;
  let seed = 4291;
  Math.random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  crypto.randomInt = (min, max) =>
    max === undefined
      ? Math.floor(Math.random() * min)
      : min + Math.floor(Math.random() * (max - min));
  syncBuiltinESMExports();
  const { match, world } = createAbilityMatch('checkpoint10-natural-food');
  try {
    const self = () =>
      match.view('a').players.find((player) => player.id === 'a');
    const initialPosition = self().position;
    const body = world.bodies
      .getAll()
      .find(
        (entry) =>
          entry.isDynamic() &&
          Math.hypot(
            entry.translation().x - initialPosition.x,
            entry.translation().z - initialPosition.z,
          ) < 0.01,
      );
    assert.ok(body);
    const initialProgress = match.view('a').progression;
    const initialFood = new Map();
    for (const spawn of createArena(42).spawns) {
      body.setTranslation({ ...spawn, y: 0.25 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      for (const food of match.view('a').resources)
        if (food.source === 'vegetation' && food.rarity === 'common')
          initialFood.set(food.id, food);
    }
    assert.ok(initialFood.size > 0);
    let earned = 0;
    let collections = 0;
    for (const food of initialFood.values()) {
      body.setTranslation({ ...food.position, y: 0.25 }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      for (let i = 0; i < 30 && !match.view('a').offer; i++) {
        assert.ok(match.advance(100));
        for (const event of match.takeCollections()) {
          if (event.playerId === 'a' && initialFood.has(event.resourceId)) {
            earned += event.progress;
            collections++;
          }
        }
        if (
          !match.view('a').resources.some((resource) => resource.id === food.id)
        )
          break;
      }
      if (match.view('a').offer) break;
    }
    const offer = match.view('a').offer;
    assert.ok(
      offer,
      `no offer after ${collections} food stages and ${earned} progress`,
    );
    assert.ok(
      earned >= initialProgress.required - initialProgress.progress &&
        collections > 0,
    );
    assert.ok(
      match.consume({
        kind: 'choice',
        matchId: 'checkpoint10-natural-food',
        playerId: 'a',
        sequence: 1,
        offerId: offer.id,
        revision: offer.revision,
        choiceId: offer.choices[0],
      }),
    );
    assert.ok(
      match
        .view('a')
        .progression.upgrades.some(
          (upgrade) => upgrade.id === offer.choices[0],
        ),
    );
  } finally {
    match.dispose();
    Math.random = originalRandom;
    crypto.randomInt = originalRandomInt;
    syncBuiltinESMExports();
  }
});

test(
  'generated Saliva to Spit choices are funded by collected vegetation',
  { timeout: 90000 },
  () => foodRoute('saliva', 'spit', 42),
);
test(
  'generated Nomadic to Tracker choices are funded by collected vegetation',
  { timeout: 90000 },
  () => foodRoute('nomadic', 'tracker', 123456789),
);
test(
  'food-funded Herbivore, Vegan, and Forager form a final-area diet build',
  { timeout: 90000 },
  () => foodRoute('herbivore', 'vegan', 42, 'forager'),
);
test(
  'food-funded Saliva, Spit, and Poisonous Saliva combine in an equipped attack',
  { timeout: 90000 },
  () => foodRoute('saliva', 'spit', 42, 'poisonous-saliva'),
);
test(
  'food-funded Jaws and Horns form a heavy contact build',
  { timeout: 90000 },
  () => foodRoute('jaws', 'horns', 7),
);
test(
  'food-funded Fur unlocks Hibernation and shelter progress',
  { timeout: 90000 },
  () => foodRoute('fur', 'hibernation', 42),
);
test(
  'food-funded Smol and Shifty provide evasion in the final area',
  { timeout: 90000 },
  () => foodRoute('smol', 'shifty', 7),
);
test(
  'food-funded Arms and Toe Beans can transfer a companion',
  { timeout: 90000 },
  () => foodRoute('arms', 'toe-beans', 42),
);
test(
  'food-funded Tentacles and Spinnerets unlock Jet and its web trail',
  { timeout: 90000 },
  () => foodRoute('tentacles', 'spinnerets', 42, 'jet'),
);
