import { starterDefinitions } from '../../build-host/server/content/starter.js';
import { Match } from '../../build-host/server/match/match.js';

const slam = starterDefinitions.find((entry) => entry.id === 'body-slam');
slam.specializations = ['fixture-impact'];
slam.specializationChoices = [
  {
    id: 'fixture-impact',
    name: 'Impact fixture',
    triggerRank: 1,
    carcinisationBonus: 0,
    effect: {
      kind: 'stats',
      changes: [{ stat: 'physical', add: 3, multiplier: 1 }],
    },
  },
];
const matches = new Set();
const advance = Match.prototype.advance;
Match.prototype.advance = function (deltaMs) {
  matches.add(this);
  return advance.call(this, deltaMs);
};
process.on('message', (message) => {
  if (message?.kind !== 'progression-fixture') return;
  try {
    const match = [...matches].find(
      (m) => m.view(message.playerId)?.phase === 'running',
    );
    if (!match) throw Error('match not found');
    if (
      !match.walletTransaction(message.playerId, 'fixture-funds', 'grant', 100)
    )
      throw Error('wallet grant failed');
    if (!match.grantProgress(message.playerId, 10))
      throw Error('progress grant failed');
    process.send?.({ kind: 'progression-ready' });
  } catch (error) {
    process.send?.({ kind: 'error', message: error.message });
  }
});
