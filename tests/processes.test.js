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
  assert.deepEqual(Object.keys(TIMED), ['grill']);
  assert.deepEqual(TIMED.grill.accepts, { [k('raw_patty')]: { cooked: k('cooked_patty'), burnt: k('burnt_patty') } });
  assert.equal(TIMED.grill.tool, k('spatula'));
});

test('every CUTTABLE key and value is a catalog item', () => {
  for (const [raw, cut] of Object.entries(CUTTABLE)) {
    assert.ok(raw in ITEMS, raw);
    assert.ok(cut in ITEMS, cut);
  }
});
