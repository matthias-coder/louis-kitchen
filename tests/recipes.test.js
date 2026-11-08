import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAssembly, evaluateFor, RECIPES, DISHES, FAILED } from '../packs/BP/scripts/logic/recipes.js';
import { POT, WOK } from '../packs/BP/scripts/logic/processes.js';

const k = (/** @type {string[]} */ ...ids) => ids.map((i) => `kochmod:${i}`);

test('RECIPES lists every dish once even when a dish has a legacy recipe', () => {
  assert.equal(new Set(DISHES).size, DISHES.length);
});

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
  assert.equal(RECIPES.length, 9);
  for (const r of RECIPES.slice(0, 2)) assert.deepEqual(r.stations, ['grill', 'cutting_board', 'counter']);
  assert.deepEqual(RECIPES[2].stations, ['spit', 'cutting_board', 'counter']);
  assert.deepEqual(RECIPES[3].stations, ['cutting_board', 'counter']);
  for (const r of RECIPES.slice(4, 6)) assert.deepEqual(r.stations, ['counter', 'oven']);
  assert.deepEqual(RECIPES[6].stations, ['pot']);
  assert.deepEqual(RECIPES[7].stations, ['cutting_board', 'pot']);
  assert.deepEqual(RECIPES[8].stations, ['cutting_board', 'wok']);
});

test('dishes: assembled ones first, then the ones an oven bakes, then the pot and wok dishes (cooked rice is not a dish)', () => {
  assert.deepEqual(DISHES, k('hamburger', 'cheeseburger', 'doner', 'sushi', 'pizza_margherita', 'salami_pizza', 'ramen', 'potato_soup', 'fried_noodles'));
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

test('pot recipes evaluate in any order; cooked rice from rice; anything else fails', () => {
  assert.equal(evaluateFor(POT, k('egg', 'spring_onion', 'noodles', 'broth')), 'kochmod:ramen');
  assert.equal(evaluateFor(POT, k('cream', 'potato_cubes', 'carrot_slices')), 'kochmod:potato_soup');
  assert.equal(evaluateFor(POT, k('rice')), 'kochmod:cooked_rice');
  assert.equal(evaluateFor(POT, k('rice', 'rice')), FAILED);
  assert.equal(evaluateFor(POT, k('broth', 'noodles', 'egg')), FAILED);
  assert.ok(!DISHES.includes('kochmod:cooked_rice'));
});

test('doner and sushi are assembled on the counter in any order', () => {
  assert.equal(evaluateAssembly(k('pita', 'doner_meat', 'lettuce', 'tomato_slices', 'onion_rings', 'doner_sauce')), 'kochmod:doner');
  assert.equal(evaluateAssembly(k('doner_sauce', 'onion_rings', 'tomato_slices', 'lettuce', 'doner_meat', 'pita')), 'kochmod:doner');
  assert.equal(evaluateAssembly(k('pita', 'doner_meat_raw', 'lettuce', 'tomato_slices', 'onion_rings', 'doner_sauce')), FAILED);
  assert.equal(evaluateAssembly(k('nori', 'cooked_rice', 'salmon_strips')), 'kochmod:sushi');
  assert.equal(evaluateAssembly(k('salmon_strips', 'nori', 'cooked_rice')), 'kochmod:sushi');
  assert.equal(evaluateAssembly(k('nori', 'rice', 'salmon_strips')), FAILED);
  assert.equal(evaluateAssembly(k('nori', 'cooked_rice', 'salmon')), FAILED);
});

test('wok recipes evaluate in any order; anything else fails', () => {
  assert.equal(evaluateFor(WOK, k('soy_sauce', 'noodles', 'spring_onion', 'egg', 'carrot_slices')), 'kochmod:fried_noodles');
  assert.equal(evaluateFor(WOK, k('noodles', 'egg', 'carrot', 'spring_onion', 'soy_sauce')), FAILED);
});
