import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS } from '../packs/BP/scripts/logic/catalog.js';
import { stepsFor, stationsFor, CUTTABLE, TIMED, POT, POT_DEF } from '../packs/BP/scripts/logic/processes.js';

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

test('pot recipes: ramen, potato soup and cooked rice', () => {
  assert.deepEqual(POT, [
    { dish: k('ramen'), parts: ['broth', 'noodles', 'egg', 'spring_onion'].map(k) },
    { dish: k('potato_soup'), parts: ['potato_cubes', 'carrot_slices', 'cream'].map(k) },
    { dish: k('cooked_rice'), parts: [k('rice')] },
  ]);
  for (const r of POT) for (const id of [r.dish, ...r.parts]) assert.ok(id in ITEMS, id);
});

test('pot def: recipes, bowl, six items, hints and the bubble sound', () => {
  assert.deepEqual(POT_DEF, {
    recipes: POT,
    tool: k('bowl'),
    max: 6,
    hints: { full: 'kochmod.hint.pot_full', cooking: 'kochmod.hint.pot_cooking', needTool: 'kochmod.hint.need_bowl', empty: 'kochmod.hint.pot_empty' },
    sound: 'kochmod.bubble',
  });
});

test('ramen steps: only the pot step with the bowl (all parts come from fridge and pantry)', () => {
  assert.deepEqual(stepsFor(k('ramen')), [
    { item: k('ramen'), station: 'pot', tool: k('bowl'), parts: ['broth', 'noodles', 'egg', 'spring_onion'].map(k) },
  ]);
  assert.deepEqual(stationsFor(k('ramen')), ['pot']);
});

test('potato soup steps: cut potato and carrot, then the pot step with the bowl', () => {
  assert.deepEqual(stepsFor(k('potato_soup')), [
    { item: k('potato'), station: 'cutting_board', tool: k('knife'), result: k('potato_cubes') },
    { item: k('carrot'), station: 'cutting_board', tool: k('knife'), result: k('carrot_slices') },
    { item: k('potato_soup'), station: 'pot', tool: k('bowl'), parts: ['potato_cubes', 'carrot_slices', 'cream'].map(k) },
  ]);
  assert.deepEqual(stationsFor(k('potato_soup')), ['cutting_board', 'pot']);
});

test('cooked rice is a prepared item, so it has no steps of its own as a dish', () => {
  assert.deepEqual(stepsFor(k('cooked_rice')), []);
});
