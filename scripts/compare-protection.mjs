import {
  SELECTION_WINDOW_MS,
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
    SELECTION_WINDOW_MS - 1000,
  );
  selection.markDisplayed('upgrade-a', 1);
  record(SELECTION_WINDOW_MS - 1000, 'reroll during displayed window');
  const staleAt = SELECTION_WINDOW_MS - 500;
  const staleAccepted = selection.choose('upgrade-a', 0, 'one', staleAt);
  record(staleAt, `stale choice accepted: ${staleAccepted}`);
  selection.setConnected(false, SELECTION_WINDOW_MS - 400);
  record(SELECTION_WINDOW_MS - 400, 'disconnect');
  selection.advance(SELECTION_WINDOW_MS);
  exercise();
  record(
    SELECTION_WINDOW_MS,
    'deadline while disconnected and exposed actions attempted',
  );
  const passiveRewardAt = SELECTION_WINDOW_MS + interval / 2;
  selection.enqueue(prompt('upgrade', 'passive-xp'), passiveRewardAt);
  record(passiveRewardAt, 'passive reward during exposure');
  const reconnect = SELECTION_WINDOW_MS + 20000 + interval;
  selection.advance(reconnect);
  record(reconnect, 'still disconnected after exposure');
  selection.setConnected(true, reconnect);
  record(reconnect, 'reconnected and first queued prompt displayed');
  selection.choose('upgrade-b', 0, 'one', reconnect + 500);
  selection.markDisplayed('branch', 0);
  record(reconnect + 500, 'follow-up displayed with remaining time');
  const branchDeadline = reconnect + SELECTION_WINDOW_MS;
  selection.advance(branchDeadline);
  record(branchDeadline, 'specialization expiry');
  const equipmentOpens = branchDeadline + interval;
  selection.advance(equipmentOpens);
  selection.markDisplayed('equipment', 0);
  record(equipmentOpens, 'equipment displayed');
  const equipmentDeadline = equipmentOpens + SELECTION_WINDOW_MS;
  selection.advance(equipmentDeadline);
  record(equipmentDeadline, 'equipment expiry');
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
