import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  boundaryRadius,
  DEFAULT_FINALE,
} from '../../build-host/server/match/finale.js';

test('the boundary shrinks from 18 minutes and collapses at 28 minutes', () => {
  const minute = 60_000;
  assert.equal(
    boundaryRadius(18 * minute, DEFAULT_FINALE),
    DEFAULT_FINALE.initialRadius,
  );
  assert.ok(
    boundaryRadius(18 * minute + 1, DEFAULT_FINALE) <
      DEFAULT_FINALE.initialRadius,
  );
  assert.equal(
    boundaryRadius(25 * minute, DEFAULT_FINALE),
    DEFAULT_FINALE.tinyRadius,
  );
  assert.ok(boundaryRadius(28 * minute - 1, DEFAULT_FINALE) > 0);
  assert.equal(boundaryRadius(28 * minute, DEFAULT_FINALE), 0);
});
