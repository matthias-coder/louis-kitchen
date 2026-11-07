import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAssembly, RECIPES, DISHES, FAILED } from '../packs/BP/scripts/logic/recipes.js';

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
  assert.equal(RECIPES.length, 4);
  for (const r of RECIPES.slice(0, 2)) assert.deepEqual(r.stations, ['grill', 'cutting_board', 'counter']);
  for (const r of RECIPES.slice(2)) assert.deepEqual(r.stations, ['counter', 'oven']);
});

test('dishes: assembled ones first, then the ones an oven bakes', () => {
  assert.deepEqual(DISHES, k('hamburger', 'cheeseburger', 'pizza_margherita', 'salami_pizza'));
  assert.deepEqual(RECIPES.find((r) => r.dish === 'kochmod:salami_pizza')?.parts, k('raw_salami_pizza'));
});

test('raw pizzas are assembled on the counter in any order', () => {
  assert.equal(evaluateAssembly(k('dough', 'tomato_sauce', 'cheese')), 'kochmod:raw_pizza_margherita');
  assert.equal(evaluateAssembly(k('cheese', 'dough', 'tomato_sauce')), 'kochmod:raw_pizza_margherita');
  assert.equal(evaluateAssembly(k('dough', 'tomato_sauce', 'cheese', 'salami')), 'kochmod:raw_salami_pizza');
  assert.equal(evaluateAssembly(k('salami', 'cheese', 'tomato_sauce', 'dough')), 'kochmod:raw_salami_pizza');
  assert.equal(evaluateAssembly(k('dough', 'tomato_sauce')), FAILED);
});

test('evaluateAssembly does not mutate input', () => {
  const items = k('lettuce', 'bun', 'tomato_slices', 'cooked_patty');
  const copy = [...items];
  evaluateAssembly(items);
  assert.deepEqual(items, copy);
});
