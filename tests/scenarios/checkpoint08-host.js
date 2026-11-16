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
  if (message?.kind !== 'checkpoint08') return;
  try {
    const match = [...matches].find(
      (m) => m.view(message.playerId)?.phase === 'running',
    );
    if (!match) throw Error('match not found');
    if (message.action === 'build') {
      if (!match.grantUpgrade(message.playerId, 'arms', 'branching', 1))
        throw Error('arms grant rejected');
      if (!match.grantUpgrade(message.playerId, 'legs', 'branching', 1))
        throw Error('legs grant rejected');
      if (
        !match.walletTransaction(
          message.playerId,
          'checkpoint08-funds',
          'grant',
          1000,
        )
      )
        throw Error('wallet grant rejected');
      if (!match.grantProgress(message.playerId, 10))
        throw Error('progress grant rejected');
    } else if (message.action === 'leap') {
      if (!match.grantUpgrade(message.playerId, 'leap', 'common', 1))
        throw Error('leap grant rejected');
    } else if (message.action === 'combat') {
      const view = match.view(message.playerId);
      const player = view.players.find((p) => p.id === message.playerId);
      const target = view.players.find((p) => p.id === message.targetId);
      const findBody = (position) =>
        bodies.find(
          (b) =>
            b.isValid() &&
            b.isDynamic() &&
            Math.hypot(
              b.translation().x - position.x,
              b.translation().z - position.z,
            ) < 0.01,
        );
      const playerBody = player && findBody(player.position);
      const targetBody = target && findBody(target.position);
      if (!playerBody || !targetBody) throw Error('combat bodies not found');
      let point;
      for (let x = -18; x <= 18 && !point; x += 2)
        for (let z = -18; z <= 18 && !point; z += 2)
          if (arenaPointClear(view.arena.obstacles, { x, z }, 5))
            point = { x, z };
      if (!point) throw Error('no clear combat point');
      playerBody.setTranslation({ x: point.x, y: 0.25, z: point.z }, true);
      targetBody.setTranslation(
        { x: point.x + 1.5, y: 0.25, z: point.z },
        true,
      );
      playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      targetBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    } else throw Error('unknown fixture action');
    process.send?.({ kind: 'checkpoint08-ready', action: message.action });
  } catch (error) {
    process.send?.({ kind: 'error', message: error.message });
  }
});
