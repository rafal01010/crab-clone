import RAPIER from '@dimforge/rapier3d-compat';
import { Match } from '../../build-host/server/match/match.js';
import { arenaPointClear } from '../../build-host/shared/arena.js';

const bodies = [];
const createBody = RAPIER.World.prototype.createRigidBody;
RAPIER.World.prototype.createRigidBody = function (...args) {
  const body = createBody.apply(this, args);
  bodies.push(body);
  return body;
};
const matches = new Set();
const advance = Match.prototype.advance;
Match.prototype.advance = function (deltaMs) {
  matches.add(this);
  return advance.call(this, deltaMs);
};
process.on('message', (message) => {
  if (message?.kind !== 'explore') return;
  try {
    const match = [...matches].find(
      (m) => m.view(message.playerId)?.phase === 'running',
    );
    if (!match) throw Error('match not found');
    if (message.target === 'finish') {
      if (!match.accept({ kind: 'finish' })) throw Error('finish failed');
      process.send?.({ kind: 'explored', target: {} });
      return;
    }
    match.setModifiers(message.playerId, [
      { id: 'fixture-senses', stat: 'senses', add: 400, multiplier: 1 },
      { id: 'fixture-social', stat: 'social', add: 30, multiplier: 1 },
    ]);
    const view = match.view(message.playerId);
    const self = view.players.find((p) => p.id === message.playerId);
    const body = bodies.find(
      (b) =>
        b.isValid() &&
        b.isDynamic() &&
        Math.hypot(
          b.translation().x - self.position.x,
          b.translation().z - self.position.z,
        ) < 0.01,
    );
    if (!body) throw Error('player body not found');
    if (message.target === 'ally-combat') {
      const other = view.players.find(
        (player) => player.id === message.otherId,
      );
      const targetBody =
        other &&
        bodies.find(
          (b) =>
            b.isValid() &&
            b.isDynamic() &&
            Math.hypot(
              b.translation().x - other.position.x,
              b.translation().z - other.position.z,
            ) < 0.01,
        );
      if (!targetBody) throw Error('target body not found');
      let point;
      for (let x = -18; x <= 18 && !point; x += 2)
        for (let z = -18; z <= 18 && !point; z += 2)
          if (arenaPointClear(view.arena.obstacles, { x, z }, 6))
            point = { x, z };
      if (!point) throw Error('no combat space');
      body.setTranslation({ x: point.x, y: 0.25, z: point.z }, true);
      targetBody.setTranslation(
        { x: point.x + 3.5, y: 0.25, z: point.z },
        true,
      );
      if (!match.recruitCompanion(message.playerId, 'fixture-recruit', 0))
        throw Error('recruit failed');
      const ally = match
        .view(message.playerId)
        .bots.find(
          (bot) => bot.ownerId === message.playerId && bot.kind === 'charmed',
        );
      const allyBody =
        ally &&
        bodies.find(
          (b) =>
            b.isValid() &&
            b.isDynamic() &&
            Math.hypot(
              b.translation().x - ally.position.x,
              b.translation().z - ally.position.z,
            ) < 0.01,
        );
      if (!allyBody) throw Error('ally body not found');
      allyBody.setTranslation({ x: point.x + 2, y: 0.25, z: point.z }, true);
      if (!match.markAllyTarget(message.playerId, message.otherId))
        throw Error('target marking failed');
      process.send?.({
        kind: 'explored',
        target: { allyId: ally.id, health: other.health.hull },
      });
      return;
    }
    const list =
      message.target === 'poi'
        ? view.pointsOfInterest.filter((p) => p.status === 'available')
        : message.target === 'firmware'
          ? view.firmware
          : view.shelters;
    const target = list.sort(
      (a, b) =>
        Math.hypot(
          a.position.x - self.position.x,
          a.position.z - self.position.z,
        ) -
        Math.hypot(
          b.position.x - self.position.x,
          b.position.z - self.position.z,
        ),
    )[0];
    if (!target) throw Error(`no ${message.target} in view`);
    body.setTranslation(
      { x: target.position.x, y: 0.25, z: target.position.z },
      true,
    );
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    process.send?.({ kind: 'explored', target });
  } catch (error) {
    process.send?.({ kind: 'error', message: error.message });
  }
});
