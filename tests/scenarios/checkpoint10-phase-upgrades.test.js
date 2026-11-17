import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createAbilityMatch,
  enableQaSurvival,
} from './checkpoint08-ability-fixture.js';

test('Diurnal and Nocturnal adjust phase length, phase damage, and mutual eligibility', () => {
  for (const [id, opposite, dayAdjustment] of [
    ['diurnal', 'nocturnal', 8000],
    ['nocturnal', 'diurnal', -8000],
  ]) {
    const { match } = createAbilityMatch('checkpoint10-phase-upgrades');
    try {
      const restore = enableQaSurvival(match, 'a');
      for (const bot of match.view('a').bots)
        match.setBotHostility(bot.id, false);
      assert.ok(match.setPhaseDurationAdjustment('qa-speed', 'day', -150000));
      const before = match.view('a');
      const stats = () =>
        match.view('a').players.find((item) => item.id === 'a').stats;
      const baseline = stats();
      assert.equal(before.worldClock.phase, 'day');
      assert.ok(match.grantUpgrade('a', id, 'epic', 1));
      assert.equal(match.grantUpgrade('a', opposite, 'epic', 1), false);
      assert.equal(
        match.view('a').worldClock.nextTransitionAt -
          before.worldClock.nextTransitionAt,
        dayAdjustment,
      );
      assert.equal(
        stats().damage,
        baseline.damage + (id === 'diurnal' ? 7 : 0),
      );
      if (id === 'nocturnal')
        assert.equal(stats().senses, baseline.senses + 18);
      for (
        let i = 0;
        i < 100 && match.view('a').worldClock.phase === 'day';
        i++
      ) {
        assert.ok(match.advance(500));
        restore();
      }
      assert.equal(match.view('a').worldClock.phase, 'night');
      assert.equal(
        stats().damage,
        baseline.damage + (id === 'nocturnal' ? 7 : 0),
      );
    } finally {
      match.dispose();
    }
  }
});
