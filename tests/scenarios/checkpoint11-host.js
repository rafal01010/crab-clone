import RAPIER from '@dimforge/rapier3d-compat';
import { Match } from '../../build-host/server/match/match.js';
import {
  arenaPointClear,
  createArena,
  terrainAt,
} from '../../build-host/shared/arena.js';
import {
  createPointsOfInterest,
  poiOptions,
} from '../../build-host/server/match/points-of-interest.js';
import { WEATHER_SCHEDULE } from '../../build-host/server/match/weather.js';

const mapSeed = Number(process.env.PRESENTATION_MAP_SEED);
const initialRandom = Math.random;
let seeding = Number.isSafeInteger(mapSeed);
if (seeding) Math.random = () => mapSeed / 2 ** 32;

const matches = new Set();
const worlds = new Set();
const clockOffsets = new WeakMap();
const advance = Match.prototype.advance;
const syncWallClock = Match.prototype.syncWallClock;
const createBody = RAPIER.World.prototype.createRigidBody;
const freeWorld = RAPIER.World.prototype.free;
RAPIER.World.prototype.free = function () {
  worlds.delete(this);
  return freeWorld.call(this);
};
Match.prototype.advance = function (deltaMs) {
  matches.add(this);
  return advance.call(this, deltaMs);
};
Match.prototype.syncWallClock = function (now) {
  return syncWallClock.call(this, now + (clockOffsets.get(this) ?? 0));
};
RAPIER.World.prototype.createRigidBody = function (...args) {
  worlds.add(this);
  if (seeding) {
    Math.random = initialRandom;
    seeding = false;
  }
  return createBody.apply(this, args);
};

function locateBody(point) {
  return [...worlds]
    .flatMap((world) => world.bodies.getAll())
    .find((body) => {
      if (!body.isValid() || !body.isDynamic()) return false;
      const current = body.translation();
      return Math.hypot(point.x - current.x, point.z - current.z) < 0.001;
    });
}

function position(body, point) {
  if (!body) throw Error('Missing body for fixture position');
  body.setTranslation({ ...point, y: 0.25 }, true);
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
}

function explore(match, playerId, action, selector) {
  const view = match.view(playerId);
  const player = view.players.find(({ id }) => id === playerId);
  const collection = {
    site: view.pointsOfInterest,
    firmware: view.firmware,
    shelter: view.shelters,
  }[action];
  const target = collection
    .filter(
      (entry) => !selector || entry.id === selector || entry.kind === selector,
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
  if (!target) throw Error(`No ${action} matching ${selector}`);
  position(locateBody(player.position), target.position);
  return target;
}

process.on('message', ({ kind, playerId, action, args }) => {
  if (kind !== 'presentation') return;
  try {
    const match = [...matches]
      .reverse()
      .find((entry) => entry.view(playerId)?.phase === 'running');
    if (!match) throw Error('No running match for player');
    const view = match.view(playerId);
    let value = null;
    switch (action) {
      case 'modifiers':
        if (!match.setModifiers(playerId, args))
          throw Error('Modifiers rejected');
        break;
      case 'repair':
        match.repairPlayer(playerId, args, false);
        break;
      case 'site':
      case 'firmware':
      case 'shelter':
        value = explore(match, playerId, action, args);
        break;
      case 'site-matrix': {
        if (!Number.isSafeInteger(mapSeed))
          throw Error('A map seed is required');
        const arena = createArena(mapSeed);
        const sites = createPointsOfInterest(
          arena.poiSockets,
          (point) => terrainAt(arena, point.x, point.z),
          mapSeed,
        );
        value = [
          ...new Map(
            sites
              .filter(({ id }) => id !== args)
              .map((site) => [site.kind, site]),
          ).values(),
        ].map(({ id, kind, position }) => ({
          id,
          kind,
          position,
          options: poiOptions(kind).map(({ id, label, reward }) => ({
            id,
            label,
            reward,
          })),
        }));
        break;
      }
      case 'move': {
        const point = view.players.find(({ id }) => id === playerId).position;
        position(locateBody(point), args);
        break;
      }
      case 'approach': {
        const player = view.players.find(({ id }) => id === playerId);
        const point = [
          { x: args.x + 1.1, z: args.z },
          { x: args.x - 1.1, z: args.z },
          { x: args.x, z: args.z + 1.1 },
          { x: args.x, z: args.z - 1.1 },
        ].find((candidate) =>
          arenaPointClear(view.arena.obstacles, candidate, player.radius),
        );
        if (!point) throw Error('No clear point beside the interaction');
        position(locateBody(player.position), point);
        break;
      }
      case 'clear-point': {
        for (let x = -18; x <= 18 && !value; x += 6) {
          for (let z = -18; z <= 18 && !value; z += 6) {
            if (arenaPointClear(view.arena.obstacles, { x, z }, 5))
              value = { x, z };
          }
        }
        if (!value) throw Error('No clear arena point');
        break;
      }
      case 'clear-biome': {
        const { arena } = view;
        for (const region of arena.terrain) {
          if (value) break;
          if (terrainAt(arena, region.x, region.z) !== args) continue;
          const point = { x: region.x, z: region.z };
          if (arenaPointClear(arena.obstacles, point, 5)) value = point;
        }
        if (!value) throw Error(`No nearby clear ${args}`);
        break;
      }
      case 'cluster': {
        const owner = view.players.find(({ id }) => id === playerId);
        const craft = locateBody(owner.position);
        const bodies = [...worlds].at(-1).bodies.getAll();
        const bots = new Map(view.bots.map((bot) => [bot.id, bot]));
        try {
          for (const body of bodies) {
            if (
              !body.isValid() ||
              !body.isDynamic() ||
              body.handle === craft.handle
            )
              continue;
            position(craft, body.translation());
            for (const bot of match.view(playerId).bots) bots.set(bot.id, bot);
            if (bots.size >= 6) break;
          }
        } finally {
          position(craft, owner.position);
        }
        if (!bots.size) throw Error('No bots to cluster');
        const origin = args.origin ?? owner.position;
        value = [];
        for (const bot of [...bots.values()].sort(
          (a, b) => b.plating - a.plating,
        )) {
          const i = value.length;
          const point = {
            x: origin.x + (i === 0 ? 0 : Math.cos(i * 2) * 3.2),
            z: origin.z + (i === 0 ? args.reach : Math.sin(i * 2) * 3.2),
          };
          if (!arenaPointClear(view.arena.obstacles, point, 1)) continue;
          position(locateBody(bot.position), point);
          match.setBotHostility(bot.id, true);
          value.push(bot.id);
          if (value.length >= 6) break;
        }
        break;
      }
      case 'bot-near': {
        const player = view.players.find(({ id }) => id === playerId);
        const bot = view.bots
          .filter((unit) => !args.id || unit.id === args.id)
          .sort((a, b) => b.plating - a.plating)[0];
        if (!bot) throw Error('No visible bot for combat');
        position(locateBody(bot.position), {
          x: player.position.x,
          z: player.position.z + args.distance,
        });
        value = bot;
        break;
      }
      case 'clock':
        clockOffsets.set(
          match,
          (clockOffsets.get(match) ?? 0) + args - view.boundary.elapsedMs,
        );
        match.syncWallClock(performance.now());
        break;
      case 'shift-time':
        for (let i = 0; i < args; i += 20) match.advance(20);
        break;
      case 'rain': {
        const rain = WEATHER_SCHEDULE.find(({ biome }) => biome === 'grass');
        const first = rain.offset + rain.warning + 1000;
        const cycle = Math.max(0, Math.floor((view.time - first) / rain.cycle));
        const start = first + cycle * rain.cycle;
        const targetAt =
          view.time < start + rain.duration - 5000 ? start : start + rain.cycle;
        for (let time = view.time; time < targetAt; time += 20)
          match.advance(20);
        break;
      }
      case 'short-day':
        if (!match.setPhaseDurationAdjustment('presentation', 'day', -170_000))
          throw Error('Could not shorten day');
        break;
      case 'level':
        if (!match.levelPlayer(playerId, args)) throw Error('Level rejected');
        break;
      case 'currency':
        if (
          !match.walletTransaction(
            playerId,
            'presentation-currency',
            'grant',
            args,
          )?.accepted
        )
          throw Error('Currency rejected');
        break;
      case 'spend':
        if (
          !match.walletTransaction(
            playerId,
            'presentation-spend',
            'spend',
            args,
          )?.accepted
        )
          throw Error('Spend rejected');
        break;
      case 'resource':
        value = match.spawnResource({
          ...args,
          position:
            args.position ??
            view.players.find(({ id }) => id === playerId).position,
          killerId: null,
          ownerId: null,
          killerKind: null,
        });
        if (!value) throw Error('Resource rejected');
        break;
      case 'collections':
        value = match.takeCollections();
        break;
      case 'damage':
        value = match.damageBatch(
          args.map((event) => ({ ownerId: playerId, depth: 0, ...event })),
        );
        break;
      case 'status':
        if (
          !match.applyStatus(args.target, { ...args.status, ownerId: playerId })
        )
          throw Error('Status rejected');
        break;
      case 'visibility':
        if (!match.setPlayerVisibility(playerId, args.target, args.visible))
          throw Error('Visibility rejected');
        break;
      case 'finish':
        if (!match.accept({ kind: 'abort' })) throw Error('Abort rejected');
        break;
      case 'progress':
        if (
          !match.grantProgress(
            playerId,
            args ?? view.progression.required - view.progression.progress,
          )
        )
          throw Error('Progress rejected');
        break;
      case 'common-offer': {
        if (
          !match.grantProgress(
            playerId,
            view.progression.required - view.progression.progress,
          )
        )
          throw Error('Progress rejected');
        const random = Math.random;
        try {
          Math.random = () => 0;
          match.advance(20);
        } finally {
          Math.random = random;
        }
        break;
      }
      case 'grant':
        for (const [id, rarity, rank] of args)
          if (!match.grantUpgrade(playerId, id, rarity, rank))
            throw Error(`Grant rejected for ${id}`);
        break;
      case 'eliminate':
        match.damageBatch(
          args.map((targetId) => ({
            targetId,
            ownerId: null,
            channel: 'boundary',
            amount: 10_000,
            depth: 0,
          })),
        );
        break;
      default:
        throw Error(`Unknown fixture action ${action}`);
    }
    process.send({ value });
  } catch (error) {
    process.send({ error: error.message });
  }
});
