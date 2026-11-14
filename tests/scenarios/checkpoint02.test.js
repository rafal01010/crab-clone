import { test } from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { Match } from '../../build-host/server/match/match.js';
import {
  SelectionWindow,
  selectionPermissions,
} from '../../build-host/server/match/selection-window.js';

await RAPIER.init();

test('authoritative movement expires stale input and resumes only with new control', () => {
  const match = new Match('m', new RAPIER.World({ x: 0, y: 0, z: 0 }));
  try {
    match.accept({ kind: 'join', playerId: 'a' });
    match.accept({ kind: 'start' });
    const control = {
      kind: 'control',
      matchId: 'm',
      playerId: 'a',
      sequence: 1,
      x: 1,
      y: 0,
      aim: 0,
      buttons: 0,
    };
    const x = () => match.view('a').players[0].position.x;
    const step = (count) => {
      for (let i = 0; i < count; i++) match.advance(1000 / 60);
    };
    const initial = x();
    match.consume(control);
    step(15);
    assert.ok(x() > initial + 0.4, 'valid input moves the craft');
    step(60);
    const stopped = x();
    step(60);
    assert.ok(
      Math.abs(x() - stopped) < 0.01,
      'expired input no longer drives movement',
    );
    match.consume({ ...control, sequence: 2 });
    step(10);
    assert.ok(x() > stopped + 0.2, 'fresh input resumes movement');
    match.accept({ kind: 'disconnect', playerId: 'a' });
    step(60);
    const afterDisconnect = x();
    step(60);
    assert.ok(
      Math.abs(x() - afterDisconnect) < 0.01,
      'disconnect clears held movement',
    );
  } finally {
    match.dispose();
  }
});

test('choice windows preserve deadlines and do not consume unseen prompts on disconnect', () => {
  const window = new SelectionWindow(() => 0.9);
  const options = [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ];
  const prompt = (id, kind = 'upgrade') => ({ kind, id, revision: 0, options });
  window.enqueue(prompt('first'), 0);
  window.enqueue(prompt('second'), 100);
  window.enqueue(prompt('branch', 'specialization'), 200);
  assert.equal(window.reroll('first', 0, options, 9000), true);
  assert.equal(window.state.deadline, 10000);
  assert.equal(window.choose('first', 0, 'a', 9001), false);
  assert.deepEqual(selectionPermissions(window.state), {
    movement: false,
    salvage: false,
    attacks: false,
    contactDisplacement: false,
    reactiveOffense: false,
    ownedOffense: false,
    ownedControl: false,
    combatDamage: false,
    boundaryDamage: true,
    passiveExperience: true,
  });
  window.setConnected(false, 9500);
  window.advance(30000);
  assert.equal(window.state.kind, 'exposed');
  assert.deepEqual(
    window
      .takeOutcomes()
      .map(({ prompt, kind, optionId }) => [prompt.id, kind, optionId]),
    [['first', 'chosen', 'b']],
  );
  window.setConnected(true, 30000);
  assert.equal(window.state.prompt.id, 'second');
  assert.equal(window.state.deadline, 40000);
  assert.equal(window.choose('second', 0, 'a', 31000), true);
  assert.equal(window.state.prompt.id, 'branch');
  assert.equal(window.state.deadline, 40000);
  window.advance(40000);
  assert.equal(window.state.kind, 'exposed');
  assert.deepEqual(
    window.takeOutcomes().map(({ kind }) => kind),
    ['chosen', 'skipped'],
  );
});

test('opening a choice stops a moving player immediately', () => {
  const match = new Match('m', new RAPIER.World({ x: 0, y: 0, z: 0 }));
  try {
    match.accept({ kind: 'join', playerId: 'a' });
    match.accept({ kind: 'start' });
    for (let sequence = 1; sequence <= 30; sequence++) {
      match.consume({
        kind: 'control',
        matchId: 'm',
        playerId: 'a',
        sequence,
        x: 1,
        y: 0,
        aim: 0,
        buttons: 0,
      });
      match.advance(1000 / 60);
    }
    const before = match.view('a').players[0].position;
    assert.equal(
      match.setOffer('a', { id: 'choice', revision: 0, choices: ['a', 'b'] }),
      true,
    );
    match.advance(1000 / 60);
    const after = match.view('a').players[0].position;
    assert.ok(
      Math.hypot(after.x - before.x, after.z - before.z) < 0.01,
      'choice starts stationary',
    );
  } finally {
    match.dispose();
  }
});

test('other craft can pass a choosing player and that player can move after choosing', () => {
  const match = new Match('m', new RAPIER.World({ x: 0, y: 0, z: 0 }));
  try {
    match.accept({ kind: 'join', playerId: 'a' });
    match.accept({ kind: 'join', playerId: 'b' });
    match.accept({ kind: 'start' });
    match.setOffer('a', { id: 'offer', revision: 0, choices: ['x'] });
    const position = (id) =>
      match.view('a').players.find((player) => player.id === id).position;
    const fixed = position('a');
    for (let sequence = 1; sequence <= 90; sequence++) {
      match.consume({
        kind: 'control',
        matchId: 'm',
        playerId: 'b',
        sequence,
        x: -1,
        y: 0,
        aim: 0,
        buttons: 0,
      });
      match.advance(1000 / 60);
    }
    assert.ok(
      position('b').x < fixed.x - 0.6,
      'other craft passes through the choosing player',
    );
    assert.ok(
      Math.abs(position('a').x - fixed.x) < 0.01,
      'choosing craft remains stationary',
    );
    match.consume({
      kind: 'choice',
      matchId: 'm',
      playerId: 'a',
      sequence: 1,
      offerId: 'offer',
      revision: 0,
      choiceId: 'x',
    });
    match.consume({
      kind: 'control',
      matchId: 'm',
      playerId: 'a',
      sequence: 2,
      x: 1,
      y: 0,
      aim: 0,
      buttons: 0,
    });
    for (let i = 0; i < 10; i++) match.advance(1000 / 60);
    assert.ok(
      position('a').x > fixed.x + 0.2,
      'movement resumes after choosing',
    );
  } finally {
    match.dispose();
  }
});
