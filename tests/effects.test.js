import { test } from 'node:test';
import assert from 'node:assert/strict';
import { giveOrDrop } from '../packs/BP/scripts/logic/give.js';

test('giveOrDrop drops the leftover when addItem returns one', () => {
  const item = { id: 'kochmod:bun' };
  const leftover = { id: 'kochmod:bun', rest: true };
  /** @type {unknown[]} */
  const added = [];
  /** @type {unknown[]} */
  const dropped = [];
  giveOrDrop({ addItem: (i) => { added.push(i); return leftover; } }, item, (i) => dropped.push(i));
  assert.deepEqual(added, [item]);
  assert.deepEqual(dropped, [leftover]);
});

test('giveOrDrop does not drop when addItem returns undefined', () => {
  /** @type {unknown[]} */
  const dropped = [];
  giveOrDrop({ addItem: () => undefined }, { id: 'kochmod:bun' }, (i) => dropped.push(i));
  assert.deepEqual(dropped, []);
});
