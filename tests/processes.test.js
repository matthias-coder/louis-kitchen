import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS } from '../packs/BP/scripts/logic/catalog.js';
import { stepsFor, stationsFor, CUTTABLE, TIMED } from '../packs/BP/scripts/logic/processes.js';

const k = (/** @type {string} */ id) => `kochmod:${id}`;

test('cheeseburger steps: grill, cutting board, then the counter with all five parts', () => {
  const steps = stepsFor(k('cheeseburger'));
  assert.deepEqual(steps, [
    { item: k('raw_patty'), station: 'grill', tool: k('spatula'), result: k('cooked_patty') },
    { item: k('tomato'), station: 'cutting_board', tool: k('knife'), result: k('tomato_slices') },
    { item: k('cheeseburger'), station: 'counter', parts: ['bun', 'cooked_patty', 'lettuce', 'tomato_slices', 'cheese'].map(k) },
  ]);
});

test('stationsFor lists distinct stations in order of first appearance', () => {
  assert.deepEqual(stationsFor(k('cheeseburger')), ['grill', 'cutting_board', 'counter']);
  assert.deepEqual(stationsFor(k('hamburger')), ['grill', 'cutting_board', 'counter']);
});

test('unknown dishes have no steps', () => {
  assert.deepEqual(stepsFor(k('nope')), []);
  assert.deepEqual(stationsFor(k('nope')), []);
});

test('process tables for stage 1', () => {
  assert.deepEqual(CUTTABLE, {
    [k('tomato')]: k('tomato_slices'),
    [k('onion')]: k('onion_rings'),
    [k('carrot')]: k('carrot_slices'),
    [k('potato')]: k('potato_cubes'),
    [k('salmon')]: k('salmon_strips'),
  });
  assert.deepEqual(Object.keys(TIMED), ['grill', 'oven']);
  assert.deepEqual(TIMED.grill.accepts, { [k('raw_patty')]: { cooked: k('cooked_patty'), burnt: k('burnt_patty') } });
  assert.equal(TIMED.grill.tool, k('spatula'));
});

test('oven: both raw pizzas bake into their pizza and burn into the burnt pizza, with the peel', () => {
  assert.deepEqual(TIMED.oven, {
    accepts: {
      [k('raw_pizza_margherita')]: { cooked: k('pizza_margherita'), burnt: k('burnt_pizza') },
      [k('raw_salami_pizza')]: { cooked: k('salami_pizza'), burnt: k('burnt_pizza') },
    },
    tool: k('pizza_peel'),
    hintTool: 'kochmod.hint.need_peel',
    hintFull: 'kochmod.hint.oven_full',
    sound: 'kochmod.oven',
  });
});

test('salami pizza steps: assemble the raw pizza on the counter, then bake it in the oven', () => {
  assert.deepEqual(stepsFor(k('salami_pizza')), [
    { item: k('raw_salami_pizza'), station: 'counter', parts: ['dough', 'tomato_sauce', 'cheese', 'salami'].map(k) },
    { item: k('raw_salami_pizza'), station: 'oven', tool: k('pizza_peel'), result: k('salami_pizza') },
  ]);
  assert.deepEqual(stationsFor(k('salami_pizza')), ['counter', 'oven']);
  assert.deepEqual(stepsFor(k('pizza_margherita')), [
    { item: k('raw_pizza_margherita'), station: 'counter', parts: ['dough', 'tomato_sauce', 'cheese'].map(k) },
    { item: k('raw_pizza_margherita'), station: 'oven', tool: k('pizza_peel'), result: k('pizza_margherita') },
  ]);
  assert.deepEqual(stationsFor(k('pizza_margherita')), ['counter', 'oven']);
});

test('every TIMED input and output is a catalog item', () => {
  for (const def of Object.values(TIMED)) {
    for (const [raw, out] of Object.entries(def.accepts)) for (const id of [raw, out.cooked, out.burnt]) assert.ok(id in ITEMS, id);
    assert.ok(def.tool in ITEMS, def.tool);
  }
});

test('every CUTTABLE key and value is a catalog item', () => {
  for (const [raw, cut] of Object.entries(CUTTABLE)) {
    assert.ok(raw in ITEMS, raw);
    assert.ok(cut in ITEMS, cut);
  }
});
