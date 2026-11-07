import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ITEMS, itemsOf, itemsFrom, isDish, plateName } from '../packs/BP/scripts/logic/catalog.js';
import { RECIPES, DISHES, FAILED } from '../packs/BP/scripts/logic/recipes.js';
import { CRATES, ALL_BLOCKS } from '../packs/BP/scripts/logic/crates.js';
import { CUTTABLE, TIMED, ASSEMBLY, POT, WOK } from '../packs/BP/scripts/logic/processes.js';

const k = (/** @type {string[]} */ ...ids) => ids.map((i) => `kochmod:${i}`);

test('every id used by recipes, crates and processes exists in ITEMS', () => {
  const used = [
    ...RECIPES.flatMap((r) => [r.dish, ...r.parts]),
    ...Object.values(CRATES).flatMap((c) => c.entries.map((e) => e.item)).filter((i) => !ALL_BLOCKS.includes(i.slice('kochmod:'.length))),
    ...Object.entries(CUTTABLE).flat(),
    ...Object.values(TIMED).flatMap((t) => [t.tool, ...Object.entries(t.accepts).flatMap(([raw, o]) => [raw, o.cooked, o.burnt])]),
    ...[...ASSEMBLY, ...POT, ...WOK].flatMap((r) => [r.dish, ...r.parts]),
  ];
  for (const id of used) assert.ok(Object.hasOwn(ITEMS, id), id);
});

test('DISHES equals the dishes of RECIPES in order and excludes the failed dish', () => {
  assert.deepEqual(DISHES, RECIPES.map((r) => r.dish));
  assert.deepEqual(DISHES, k('hamburger', 'cheeseburger', 'doner', 'sushi', 'pizza_margherita', 'salami_pizza', 'ramen', 'potato_soup', 'fried_noodles'));
  assert.ok(isDish(FAILED));
  assert.ok(!DISHES.includes(FAILED));
});

test('itemsFrom lists what each crate supplies, in catalog order', () => {
  assert.deepEqual(itemsFrom('fridge'), k('tomato', 'lettuce', 'raw_patty', 'cheese',
    'salami', 'egg', 'salmon', 'cream', 'onion', 'carrot', 'potato', 'spring_onion', 'doner_meat_raw'));
  assert.deepEqual(itemsFrom('pantry'), k('bun',
    'dough', 'tomato_sauce', 'noodles', 'rice', 'broth', 'nori', 'pita', 'doner_sauce', 'soy_sauce'));
  assert.deepEqual(itemsFrom('tools'), k('knife', 'spatula', 'bowl', 'pizza_peel', 'wok_spatula', 'clean_plate'));
});

test('itemsOf, isDish and plateName', () => {
  assert.deepEqual(itemsOf('dish'), k('hamburger', 'cheeseburger', 'failed_dish',
    'pizza_margherita', 'salami_pizza', 'ramen', 'potato_soup', 'doner', 'sushi', 'fried_noodles'));
  assert.deepEqual(itemsOf('prepared'), k('cooked_patty', 'burnt_patty', 'tomato_slices',
    'onion_rings', 'carrot_slices', 'potato_cubes', 'salmon_strips', 'doner_meat', 'cooked_rice',
    'raw_pizza_margherita', 'raw_salami_pizza', 'burnt_pizza'));
  assert.equal(isDish('kochmod:hamburger'), true);
  assert.equal(isDish('kochmod:bun'), false);
  assert.equal(isDish('kochmod:nope'), false);
  assert.equal(isDish(null), false);
  assert.equal(plateName('kochmod:cheeseburger'), 'cheeseburger');
});

test('tools stack to 1, everything else to 64', () => {
  for (const [id, def] of Object.entries(ITEMS)) assert.equal(def.stack, def.kind === 'tool' ? 1 : 64, id);
});

const read = (/** @type {string} */ rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const langOf = (/** @type {string} */ f) => Object.fromEntries(read(`packs/RP/texts/${f}.lang`).split('\n')
  .filter((l) => l.startsWith('item.')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));

test('every catalog id has an item JSON, a name in both lang files, an icon texture and a sprite', async () => {
  const sprites = await import('../tools/sprites/items.js');
  const spriteNames = new Set(Object.values(sprites).filter((v) => v && typeof v === 'object' && 'rows' in v).map((v) => v.name));
  const textures = JSON.parse(read('packs/RP/textures/item_texture.json')).texture_data;
  const [de, en] = [langOf('de_DE'), langOf('en_US')];
  for (const [id, def] of Object.entries(ITEMS)) {
    const short = id.replace('kochmod:', '');
    const item = JSON.parse(read(`packs/BP/items/${short}.json`))['minecraft:item'];
    assert.equal(item.description.identifier, id);
    assert.equal(item.components['minecraft:icon'].textures.default, `kochmod_${short}`);
    // stage 1 plates and the kit keep their own (smaller) stack sizes in the item JSON
    if (!['plate', 'misc'].includes(def.kind)) assert.equal(item.components['minecraft:max_stack_size'], def.stack, id);
    assert.equal(item.description.menu_category.category, def.kind === 'tool' ? 'equipment' : 'items', id);
    if (def.kind === 'dish') assert.equal(item.components['minecraft:food'].nutrition, id === FAILED ? 1 : 8, id);
    if (['ingredient', 'prepared', 'tool'].includes(def.kind)) assert.ok(!('minecraft:food' in item.components), id);
    assert.ok(de[`item.${id}`], `de name ${id}`);
    assert.equal(en[`item.${id}`], de[`item.${id}`], `en name ${id}`);
    assert.ok(spriteNames.has(short), `sprite ${id}`);
    assert.ok(textures[`kochmod_${short}`], `texture ${id}`);
  }
});
