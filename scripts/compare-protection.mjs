import {
  SelectionWindow,
  selectionPermissions,
} from '../server/match/selection-window.ts';

const results = [];
for (const interval of [1000, 2000, 3000]) {
  const selection = new SelectionWindow(() => 0.7, interval);
  const trace = [];
  const simulated = {
    playerHealth: 100,
    playerXp: 0,
    opponentTicks: 0,
    playerActions: 0,
    effects: [],
  };
  const exercise = () => {
    const rules = selectionPermissions(selection.state);
    simulated.playerXp += rules.passiveExperience ? 1 : 0;
    simulated.opponentTicks += 1;
    for (const action of [
      'movement',
      'salvage',
      'attacks',
      'contactDisplacement',
      'reactiveOffense',
      'ownedOffense',
      'ownedControl',
    ]) {
      simulated.effects.push({ action, allowed: rules[action] });
      if (rules[action]) simulated.playerActions++;
    }
    if (rules.combatDamage) simulated.playerHealth -= 3;
    if (rules.boundaryDamage) simulated.playerHealth -= 2;
  };
  const options = [
    { id: 'one', label: 'First' },
    { id: 'two', label: 'Second' },
    { id: 'three', label: 'Third' },
  ];
  const prompt = (kind, id) => ({ kind, id, revision: 0, options });
  const record = (time, event) =>
    trace.push({
      time,
      event,
      state: selection.state,
      permissions: selectionPermissions(selection.state),
      outcomes: selection.takeOutcomes(),
    });
  selection.enqueue(prompt('upgrade', 'upgrade-a'), 0);
  selection.enqueue(prompt('upgrade', 'upgrade-b'), 100);
  selection.enqueue(prompt('specialization', 'branch'), 200);
  selection.enqueue(prompt('equipment', 'equipment'), 300);
  exercise();
  record(300, 'rapid rewards queued and protected actions attempted');
  selection.reroll(
    'upgrade-a',
    0,
    [
      { id: 'four', label: 'Fourth' },
      { id: 'five', label: 'Fifth' },
      { id: 'six', label: 'Sixth' },
    ],
    9000,
  );
  record(9000, 'reroll during displayed window');
  const staleAccepted = selection.choose('upgrade-a', 0, 'one', 9500);
  record(9500, `stale choice accepted: ${staleAccepted}`);
  selection.setConnected(false, 9600);
  record(9600, 'disconnect');
  selection.advance(10000);
  exercise();
  record(10000, 'deadline while disconnected and exposed actions attempted');
  selection.enqueue(prompt('upgrade', 'passive-xp'), 10000 + interval / 2);
  record(10000 + interval / 2, 'passive reward during exposure');
  selection.advance(30000 + interval);
  record(30000 + interval, 'still disconnected after exposure');
  const reconnect = 30000 + interval;
  selection.setConnected(true, reconnect);
  record(reconnect, 'reconnected and first queued prompt displayed');
  selection.choose('upgrade-b', 0, 'one', reconnect + 500);
  record(reconnect + 500, 'follow-up displayed with remaining time');
  selection.advance(reconnect + 10000);
  record(reconnect + 10000, 'specialization expiry');
  selection.advance(reconnect + 10000 + interval);
  record(reconnect + 10000 + interval, 'equipment displayed');
  selection.advance(reconnect + 20000 + interval);
  record(reconnect + 20000 + interval, 'equipment expiry');
  results.push({ interval, trace, simulated });
}
console.log(
  JSON.stringify(
    {
      model:
        'selection state and permission policy only; no damage or combat systems',
      results,
    },
    null,
    2,
  ),
);
