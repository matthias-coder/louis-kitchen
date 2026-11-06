import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAssembly, RECIPES, FAILED } from '../packs/BP/scripts/logic/recipes.js';

const k = (/** @type {string[]} */ ...ids) => ids.map((i) => `kochmod:${i}`);

test('FAILED id', () => assert.equal(FAILED, 'kochmod:failed_dish'));

test('hamburger in any order', () => {
  assert.equal(evaluateAssembly(k('bun', 'cooked_patty', 'lettuce', 'tomato_slices')), 'kochmod:hamburger');
  assert.equal(evaluateAssembly(k('tomato_slices', 'lettuce', 'cooked_patty', 'bun')), 'kochmod:hamburger');
});

test('cheeseburger', () => {
  assert.equal(evaluateAssembly(k('bun', 'cooked_patty', 'lettuce', 'tomato_slices', 'cheese')), 'kochmod:cheeseburger');
  assert.equal(evaluateAssembly(k('cheese', 'tomato_slices', 'bun', 'lettuce', 'cooked_patty')), 'kochmod:cheeseburger');
});

test('failures', () => {
  assert.equal(evaluateAssembly(k('bun', 'cooked_patty', 'tomato_slices')), FAILED);
  assert.equal(evaluateAssembly(k('bun', 'cooked_patty', 'lettuce', 'tomato_slices', 'cheese', 'cheese')), FAILED);
  assert.equal(evaluateAssembly(k('bun', 'raw_patty', 'lettuce', 'tomato_slices')), FAILED);
  assert.equal(evaluateAssembly(k('bun', 'burnt_patty', 'lettuce', 'tomato_slices')), FAILED);
  assert.equal(evaluateAssembly(k('bun', 'cooked_patty', 'lettuce', 'tomato')), FAILED);
  assert.equal(evaluateAssembly([]), FAILED);
});

test('recipes list stations', () => {
  assert.equal(RECIPES.length, 2);
  for (const r of RECIPES) assert.deepEqual(r.stations, ['grill', 'cutting_board', 'counter']);
});

test('evaluateAssembly does not mutate input', () => {
  const items = k('lettuce', 'bun', 'tomato_slices', 'cooked_patty');
  const copy = [...items];
  evaluateAssembly(items);
  assert.deepEqual(items, copy);
});
