import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { Socket } from 'socket.io';
import { Match } from '../../build-host/server/match/match.js';
import { arenaPointClear } from '../../build-host/shared/arena.js';

const matches = new Set();
const worlds = new Set();
const sockets = new Map();
const retired = [];
let disposed = 0;

const advance = Match.prototype.advance;
Match.prototype.advance = function (delta) {
  matches.add(this);
  return advance.call(this, delta);
};
const dispose = Match.prototype.dispose;
Match.prototype.dispose = function () {
  matches.delete(this);
  retired.push(new WeakRef(this));
  disposed++;
  return dispose.call(this);
};
const createBody = RAPIER.World.prototype.createRigidBody;
RAPIER.World.prototype.createRigidBody = function (descriptor) {
  worlds.add(this);
  return createBody.call(this, descriptor);
};
const free = RAPIER.World.prototype.free;
RAPIER.World.prototype.free = function () {
  worlds.delete(this);
  return free.call(this);
};
const emit = Socket.prototype.emit;
Socket.prototype.emit = function (event, ...args) {
  if (event === 'session') {
    const { playerId } = args[0];
    sockets.set(playerId, this);
    this.once('disconnect', () => {
      if (sockets.get(playerId) === this) sockets.delete(playerId);
    });
  }
  return emit.call(this, event, ...args);
};

function player(match, id) {
  const result = match.view(id)?.players.find((entry) => entry.id === id);
  assert.ok(result, 'Fixture player exists');
  return result;
}

function move(match, id, { x, z }) {
  const { position } = player(match, id);
  const body = [...worlds][0]?.bodies.getAll().find((candidate) => {
    if (!candidate.isDynamic()) return false;
    const point = candidate.translation();
    return Math.hypot(point.x - position.x, point.z - position.z) < 0.0001;
  });
  assert.ok(body, 'Fixture player has a body');
  body.setTranslation({ x, y: position.y, z }, true);
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
}

function damage(match, targets, amount, ownerId = null, channel = 'boundary') {
  return match.damageBatch(
    targets.map((targetId) => ({
      targetId,
      ownerId,
      channel,
      amount,
      depth: 0,
    })),
  );
}

function stage(match, host, players) {
  const { arena, boundary } = match.view(host);
  const point = arena.terrain.find(
    (region) =>
      Math.hypot(region.x, region.z) + 10 < boundary.radius &&
      arenaPointClear(arena.obstacles, region, 6),
  );
  assert.ok(point, 'Fixture has clear space for four craft');
  for (const [index, id] of players.entries())
    move(match, id, { x: point.x - 3 + index * 2, z: point.z });
  return point;
}

function spawnRoundObjects(match, playerId) {
  const { position } = player(match, playerId);
  const resource = match.spawnResource({
    position: { x: position.x + 1, z: position.z + 3 },
    source: 'vegetation',
    rarity: 'legendary',
    killerId: null,
    ownerId: null,
    killerKind: null,
    repair: false,
  });
  assert.ok(resource);
  assert.ok(
    match.scheduleAlly(playerId, 'summoned', 0, 20000, {
      x: position.x,
      z: position.z - 3,
    }),
  );
  assert.ok(match.scheduleAlly(playerId, 'offspring', 30000, 20000));
  assert.ok(match.launchProjectile(playerId, 0, 0.5, 10000, 0, 0));
  return resource;
}

function equipJetWithSpinnerets(match, playerId) {
  assert.ok(match.grantUpgrade(playerId, 'spinnerets', 'epic', 1));
  assert.ok(match.grantUpgrade(playerId, 'tentacles', 'branching', 1));
  assert.ok(match.grantUpgrade(playerId, 'jet', 'common', 1));
  assert.equal(match.view(playerId).equipment.slots.movement, 'jet');
}

process.on('message', async ({ requestId, action, args }) => {
  try {
    const match = [...matches][0];
    assert.ok(match, 'Production room has a Match');
    let value;
    switch (action) {
      case 'sample': {
        await new Promise(setImmediate);
        global.gc();
        const memory = process.memoryUsage();
        value = {
          pid: process.pid,
          matches: matches.size,
          worlds: worlds.size,
          disposed,
          reachableRetired: retired.filter((ref) => ref.deref()).length,
          bodies: [...worlds].map((world) => world.bodies.len()),
          activeResources: process.getActiveResourcesInfo().sort(),
          sockets: sockets.size,
          listeners: [...sockets.values()].map((socket) =>
            socket
              .eventNames()
              .reduce((count, name) => count + socket.listenerCount(name), 0),
          ),
          ...memory,
        };
        break;
      }
      case 'stage':
        value = stage(match, args[0], args);
        break;
      case 'objects':
        value = spawnRoundObjects(match, args.playerId);
        break;
      case 'equipJetWithSpinnerets':
        equipJetWithSpinnerets(match, args.playerId);
        break;
      case 'visibility':
        assert.ok(
          match.setPlayerVisibility(args.viewer, args.target, args.visible),
        );
        break;
      case 'hit':
        damage(match, [args.target], 1, args.ownerId);
        break;
      case 'combat':
        damage(match, [args.target], 12, args.ownerId, 'direct');
        break;
      case 'view':
        value = match.view(args.playerId);
        break;
      case 'eliminate':
        damage(match, args, 1_000_000);
        break;
      case 'firmware': {
        const capsule = match
          .view(args.viewer)
          .firmware.find(({ position }) =>
            arenaPointClear(
              match.view(args.viewer).arena.obstacles,
              position,
              2,
            ),
          );
        assert.ok(capsule, 'Fixture found a visible firmware capsule');
        move(match, args.viewer, capsule.position);
        assert.ok(
          match.setModifiers(args.viewer, [
            {
              id: 'privacy-scan-fixture',
              stat: 'firmwareIdentification',
              add: 100,
              multiplier: 1,
            },
          ]),
        );
        assert.ok(
          match.consume({
            kind: 'scan',
            playerId: args.viewer,
            matchId: match.view(args.viewer).id,
            sequence: 0,
            targetId: capsule.id,
          }),
        );
        value = capsule.id;
        break;
      }
      case 'offer':
        assert.ok(
          match.setOffer(args.playerId, {
            id: args.id,
            revision: 1,
            choices: ['skip'],
          }),
        );
        break;
      case 'reconnect':
        assert.ok(sockets.has(args.playerId));
        sockets.get(args.playerId).conn.close();
        break;
      case 'previous-observation':
        assert.ok(sockets.has(args.playerId));
        sockets.get(args.playerId).emit('observation', args.observation);
        break;
      case 'abort':
        assert.ok(match.accept({ kind: 'abort' }));
        break;
      default:
        assert.fail(`Unknown fixture ${action}`);
    }
    process.send({ requestId, value });
  } catch (error) {
    process.send({ requestId, error: error.stack });
  }
});
