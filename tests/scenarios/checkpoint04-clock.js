import { Match } from '../../build-host/server/match/match.js';

let offset = 0;
const now = performance.now.bind(performance);
Object.defineProperty(performance, 'now', { value: () => now() + offset });
const matches = new Set();
const advance = Match.prototype.advance;
Match.prototype.advance = function (deltaMs) {
  matches.add(this);
  return advance.call(this, deltaMs);
};
process.on('message', (message) => {
  if (message?.kind === 'advance-clock' && Number.isFinite(message.ms))
    offset += message.ms;
  if (message?.kind === 'eliminate' && typeof message.playerId === 'string') {
    for (const match of matches) {
      if (match.view(message.playerId)?.phase !== 'running') continue;
      match.damageBatch([
        {
          targetId: message.playerId,
          ownerId: null,
          channel: 'boundary',
          amount: 100000,
          depth: 0,
        },
      ]);
    }
  }
});
