import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, itemsOf, itemsFrom, isDish, plateName } from '../packs/BP/scripts/logic/catalog.js';
import { RECIPES, DISHES, FAILED } from '../packs/BP/scripts/logic/recipes.js';
import { CRATES } from '../packs/BP/scripts/logic/crates.js';
import { CUTTABLE, TIMED, ASSEMBLY, POT, WOK } from '../packs/BP/scripts/logic/processes.js';

const k = (/** @type {string[]} */ ...ids) => ids.map((i) => `kochmod:${i}`);

test('every id used by recipes, crates and processes exists in ITEMS', () => {
  const used = [
    ...RECIPES.flatMap((r) => [r.dish, ...r.parts]),
    ...Object.values(CRATES).flatMap((c) => c.entries.map((e) => e.item)).filter((i) => !i.match(/kochmod:(grill|cutting_board|counter|crate_tools|crate_all|fridge|pantry|dishwasher|dish_cabinet|table|chair|bell)$/)),
    ...Object.entries(CUTTABLE).flat(),
    ...Object.values(TIMED).flatMap((t) => [t.tool, ...Object.entries(t.accepts).flatMap(([raw, o]) => [raw, o.cooked, o.burnt])]),
    ...[...ASSEMBLY, ...POT, ...WOK].flatMap((r) => [r.dish, ...r.parts]),
  ];
  for (const id of used) assert.ok(Object.hasOwn(ITEMS, id), id);
});

test('DISHES equals the dishes of RECIPES in order and excludes the failed dish', () => {
  assert.deepEqual(DISHES, RECIPES.map((r) => r.dish));
  assert.deepEqual(DISHES, k('hamburger', 'cheeseburger'));
  assert.ok(isDish(FAILED));
  assert.ok(!DISHES.includes(FAILED));
});

test('itemsFrom lists what each crate supplies, in catalog order', () => {
  assert.deepEqual(itemsFrom('fridge'), k('tomato', 'lettuce', 'raw_patty', 'cheese'));
  assert.deepEqual(itemsFrom('pantry'), k('bun'));
  assert.deepEqual(itemsFrom('tools'), k('knife', 'spatula', 'clean_plate'));
});

test('itemsOf, isDish and plateName', () => {
  assert.deepEqual(itemsOf('dish'), k('hamburger', 'cheeseburger', 'failed_dish'));
  assert.deepEqual(itemsOf('prepared'), k('cooked_patty', 'burnt_patty', 'tomato_slices'));
  assert.equal(isDish('kochmod:hamburger'), true);
  assert.equal(isDish('kochmod:bun'), false);
  assert.equal(isDish('kochmod:nope'), false);
  assert.equal(isDish(null), false);
  assert.equal(plateName('kochmod:cheeseburger'), 'cheeseburger');
});

test('tools stack to 1, everything else to 64', () => {
  for (const [id, def] of Object.entries(ITEMS)) assert.equal(def.stack, def.kind === 'tool' ? 1 : 64, id);
});
