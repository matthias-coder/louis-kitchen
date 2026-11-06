import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cookStage, COOKED_AT, BURNT_AT } from '../packs/BP/scripts/logic/cooking.js';

test('thresholds', () => {
  assert.equal(COOKED_AT, 160);
  assert.equal(BURNT_AT, 760);
});

for (const [ticks, stage] of [[0, 'raw'], [159, 'raw'], [160, 'cooked'], [759, 'cooked'], [760, 'burnt'], [100000, 'burnt']]) {
  test(`cookStage(${ticks}) is ${stage}`, () => {
    assert.equal(cookStage(ticks), stage);
  });
}
