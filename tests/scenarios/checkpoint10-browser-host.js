import { Match } from '../../build-host/server/match/match.js';
import RAPIER from '@dimforge/rapier3d-compat';
import crypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';

let randomState = 42;
Math.random = () => {
  randomState = (1664525 * randomState + 1013904223) >>> 0;
  return randomState / 2 ** 32;
};
crypto.randomInt = (min, max) =>
  max === undefined
    ? Math.floor(Math.random() * min)
    : min + Math.floor(Math.random() * (max - min));
syncBuiltinESMExports();

const matches = new Set();
const worlds = new Set();
let clearLane;
const createRigidBody = RAPIER.World.prototype.createRigidBody;
RAPIER.World.prototype.createRigidBody = function (...args) {
  worlds.add(this);
  return createRigidBody.apply(this, args);
};
const advance = Match.prototype.advance;
Match.prototype.advance = function (deltaMs) {
  matches.add(this);
  const result = advance.call(this, deltaMs);
  if (clearLane?.match === this) {
    for (const body of clearLane.world.bodies.getAll()) {
      const point = body.translation();
      if (
        body.isDynamic() &&
        !clearLane.players.has(body.handle) &&
        Math.hypot(point.x, point.z) < 7
      ) {
        body.setTranslation({ x: 25, y: 0.25, z: 25 }, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
  }
  return result;
};
process.on('message', (message) => {
  if (message?.kind !== 'checkpoint10') return;
  try {
    const match = [...matches].find(
      (entry) => entry.view(message.playerId)?.phase === 'running',
    );
    if (!match) throw Error('match not found');
    if (message.action === 'protect') {
      for (const playerId of message.playerIds) {
        if (
          !match.setModifiers(playerId, [
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
          ])
        )
          throw Error(`could not protect ${playerId}`);
        match.repairPlayer(playerId, 900, false);
      }
    } else if (message.action === 'grant-ranged') {
      if (
        !match.grantUpgrade(message.playerId, 'saliva', 'common', 1) ||
        !match.grantUpgrade(message.playerId, 'spit', 'rare', 1)
      )
        throw Error('could not grant ranged build');
    } else if (message.action === 'grant-heavy') {
      if (
        !match.grantUpgrade(message.playerId, 'jaws', 'rare', 1) ||
        !match.grantUpgrade(message.playerId, 'horns', 'rare', 1)
      )
        throw Error('could not grant heavy build');
    } else if (message.action === 'grant-trap-movement') {
      for (const [id, rarity] of [
        ['tentacles', 'branching'],
        ['spinnerets', 'epic'],
        ['jet', 'rare'],
      ])
        if (!match.grantUpgrade(message.playerId, id, rarity, 1))
          throw Error(`could not grant ${id}`);
    } else if (
      ['position-combatants', 'position-finale'].includes(message.action)
    ) {
      const positions = [message.playerId, message.targetId].map((id) => {
        const state = match.view(id);
        const player = state?.players.find((entry) => entry.id === id);
        if (!player) throw Error(`player ${id} not found`);
        return player.position;
      });
      const world = [...worlds].find((entry) =>
        positions.every((point) =>
          entry.bodies
            .getAll()
            .some(
              (body) =>
                body.isDynamic() &&
                Math.hypot(
                  body.translation().x - point.x,
                  body.translation().z - point.z,
                ) < 0.01,
            ),
        ),
      );
      if (!world) throw Error('combat world not found');
      for (const [index, point] of positions.entries()) {
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
        body.setTranslation(
          {
            x: message.action === 'position-finale' ? index * 2 - 1 : index * 4,
            y: 0.25,
            z: 0,
          },
          true,
        );
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
      if (message.action === 'position-finale') {
        for (const bot of match.view(message.playerId).bots) {
          match.setBotHostility(bot.id, false);
          const body = world.bodies
            .getAll()
            .find(
              (item) =>
                item.isDynamic() &&
                Math.hypot(
                  item.translation().x - bot.position.x,
                  item.translation().z - bot.position.z,
                ) < 0.01,
            );
          if (body) {
            body.setTranslation({ x: 25, y: 0.25, z: 25 }, true);
            body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          }
        }
        const elapsed = match.view(message.playerId).boundary.elapsedMs;
        match.syncWallClock(performance.now() + 1500000 - elapsed);
      }
      match.takeDamageLedger();
    } else if (message.action === 'clear-combat-lane') {
      const positions = message.playerIds.map((id) => {
        const player = match.view(id)?.players.find((entry) => entry.id === id);
        if (!player) throw Error(`player ${id} not found`);
        return player.position;
      });
      const world = [...worlds].find((entry) =>
        positions.every((point) =>
          entry.bodies.getAll().some((body) => {
            const position = body.translation();
            return (
              body.isDynamic() &&
              Math.hypot(position.x - point.x, position.z - point.z) < 0.01
            );
          }),
        ),
      );
      if (!world) throw Error('combat world not found');
      const players = new Set(
        positions.map((point) => {
          const body = world.bodies.getAll().find((item) => {
            const position = item.translation();
            return (
              item.isDynamic() &&
              Math.hypot(position.x - point.x, position.z - point.z) < 0.01
            );
          });
          return body.handle;
        }),
      );
      if (players.size !== positions.length)
        throw Error('players overlap other bodies');
      clearLane = { match, world, players };
    } else if (message.action === 'combat-ledger') {
      process.send?.({
        kind: 'checkpoint10-ok',
        ledger: match.takeDamageLedger(),
      });
      return;
    } else if (message.action === 'progress') {
      const progress = match.view(message.playerId).progression;
      if (
        !match.grantProgress(
          message.playerId,
          progress.required - progress.progress,
        )
      )
        throw Error('progress rejected');
    }
    process.send?.({ kind: 'checkpoint10-ok' });
  } catch (error) {
    process.send?.({ kind: 'error', message: error.message });
  }
});
