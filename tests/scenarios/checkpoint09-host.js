import { Match } from '../../build-host/server/match/match.js';

const matches = new Set();
const advance = Match.prototype.advance;
Match.prototype.advance = function (deltaMs) {
  matches.add(this);
  return advance.call(this, deltaMs);
};

process.on('message', (message) => {
  if (message?.kind !== 'checkpoint09') return;
  try {
    const match = [...matches].find(
      (candidate) => candidate.view(message.playerId)?.phase === 'running',
    );
    if (!match) throw Error('match not found');
    if (message.action === 'collections') {
      process.send?.({
        kind: 'checkpoint09-collections',
        collections: match.takeCollections(),
      });
      return;
    }
    for (const [id, rarity] of [
      ['saliva', 'common'],
      ['chonky', 'common'],
      ['carapace', 'rare'],
      ['spines', 'rare'],
    ]) {
      if (!match.grantUpgrade(message.playerId, id, rarity, 1))
        throw Error(`${id} grant rejected`);
    }
    for (let rank = 1; rank <= 3; rank++)
      if (!match.grantUpgrade(message.playerId, 'reach', 'legendary', rank))
        throw Error('Reach grant rejected');
    const progression = match.view(message.playerId).progression;
    if (
      !match.grantProgress(
        message.playerId,
        Math.max(0, progression.required - progression.progress - 1),
      )
    )
      throw Error('progress setup rejected');
    const player = match
      .view(message.playerId)
      .players.find((p) => p.id === message.playerId);
    const resourceId = match.spawnResource({
      position: { x: player.position.x, z: player.position.z },
      source: 'vegetation',
      rarity: 'common',
      killerId: null,
      ownerId: null,
      killerKind: null,
      repair: false,
    });
    if (!resourceId) throw Error('resource spawn rejected');
    process.send?.({ kind: 'checkpoint09-ready', resourceId });
  } catch (error) {
    process.send?.({ kind: 'error', message: error.message });
  }
});
