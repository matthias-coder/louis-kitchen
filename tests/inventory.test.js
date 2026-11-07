import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasItem, removeOne } from '../packs/BP/scripts/logic/inventory.js';

const CLEAN = 'kochmod:clean_plate';

/**
 * Fake container: getItem hands out copies like the real API, setItem stores them.
 * @param {({ typeId: string, amount: number } | undefined)[]} slots
 */
function fakeContainer(slots) {
  return {
    size: slots.length,
    slots,
    getItem: (/** @type {number} */ i) => (slots[i] ? { ...slots[i] } : undefined),
    setItem: (/** @type {number} */ i, /** @type {{ typeId: string, amount: number } | undefined} */ item) => { slots[i] = item; },
  };
}

test('hasItem finds the item in any slot', () => {
  assert.equal(hasItem(fakeContainer([undefined, { typeId: 'kochmod:bun', amount: 3 }, { typeId: CLEAN, amount: 1 }]), CLEAN), true);
  assert.equal(hasItem(fakeContainer([{ typeId: 'kochmod:bun', amount: 3 }, undefined]), CLEAN), false);
  assert.equal(hasItem(fakeContainer([]), CLEAN), false);
});

test('removeOne lowers the first matching stack by one', () => {
  const c = fakeContainer([{ typeId: 'kochmod:bun', amount: 2 }, { typeId: CLEAN, amount: 3 }, { typeId: CLEAN, amount: 5 }]);
  assert.equal(removeOne(c, CLEAN), true);
  assert.deepEqual(c.slots, [{ typeId: 'kochmod:bun', amount: 2 }, { typeId: CLEAN, amount: 2 }, { typeId: CLEAN, amount: 5 }]);
});

test('removeOne empties a slot holding the last one', () => {
  const c = fakeContainer([{ typeId: CLEAN, amount: 1 }, { typeId: 'kochmod:bun', amount: 1 }]);
  assert.equal(removeOne(c, CLEAN), true);
  assert.deepEqual(c.slots, [undefined, { typeId: 'kochmod:bun', amount: 1 }]);
});

test('removeOne without the item changes nothing', () => {
  const c = fakeContainer([{ typeId: 'kochmod:bun', amount: 1 }, undefined]);
  assert.equal(removeOne(c, CLEAN), false);
  assert.deepEqual(c.slots, [{ typeId: 'kochmod:bun', amount: 1 }, undefined]);
});
