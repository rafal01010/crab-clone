import { Match } from '../../build-host/server/match/match.js';

const matches = new Set();
const advance = Match.prototype.advance;
Match.prototype.advance = function (deltaMs) {
  matches.add(this);
  return advance.call(this, deltaMs);
};
process.on('message', (message) => {
  if (message?.kind !== 'world-step' || !Number.isFinite(message.ms)) return;
  for (const match of matches) {
    if (match.view(match.roster()[0]?.id)?.phase !== 'running') continue;
    for (const { id } of match.roster())
      match.setModifiers(
        id,
        ['damageResistance', 'heatAdaptation', 'coldAdaptation'].map(
          (stat) => ({ id: stat, stat, add: 10000, multiplier: 1 }),
        ),
      );
    for (let t = 0; t < message.ms; t += 500)
      advance.call(match, Math.min(500, message.ms - t));
  }
  process.send?.({ kind: 'world-stepped' });
});
