import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CRATES, ALL_BLOCKS, BUSY_RETRIES, entryLook, shouldRetryBusy } from '../packs/BP/scripts/logic/crates.js';

const lang = fs.readFileSync(new URL('../packs/RP/texts/de_DE.lang', import.meta.url), 'utf8');
const SUPPLIED = ['raw_patty', 'bun', 'lettuce', 'tomato', 'cheese', 'knife', 'spatula', 'clean_plate'].map((i) => `kochmod:${i}`);
const TOOLS = ['kochmod:knife', 'kochmod:spatula'];
// Stage 1 recipes need these; cooked patty and tomato slices are produced at stations.
const NEEDED = ['kochmod:bun', 'kochmod:raw_patty', 'kochmod:lettuce', 'kochmod:tomato', 'kochmod:cheese', ...TOOLS];

const { crate_all: ALL, ...SUPPLY } = CRATES;
const entries = Object.values(SUPPLY).flatMap((c) => c.entries);
const ALL_ITEM_IDS = ['bun', 'raw_patty', 'cooked_patty', 'burnt_patty', 'lettuce', 'tomato', 'tomato_slices', 'cheese', 'knife', 'spatula', 'hamburger', 'cheeseburger', 'failed_dish', 'clean_plate', 'restaurant_kit'];
const ALL_BLOCK_IDS = ['grill', 'cutting_board', 'counter', 'crate_vegetables', 'crate_meat', 'crate_bread', 'crate_dairy', 'crate_tools', 'crate_all', 'fridge', 'pantry', 'dishwasher', 'dish_cabinet', 'table', 'chair', 'bell'];

test('there are exactly the eight crates', () => {
  assert.deepEqual(Object.keys(CRATES).sort(), ['crate_all', 'crate_bread', 'crate_dairy', 'crate_meat', 'crate_tools', 'crate_vegetables', 'fridge', 'pantry']);
});

test('crates only hand out the supply items, and together all that stage 1 needs', () => {
  for (const e of entries) assert.ok(SUPPLIED.includes(e.item), e.item);
  const given = new Set(entries.map((e) => e.item));
  for (const n of NEEDED) assert.ok(given.has(n), `no crate supplies ${n}`);
});

test('tools come singly, ingredients in fours, and no crate is empty', () => {
  for (const c of Object.values(CRATES)) assert.ok(c.entries.length > 0);
  for (const e of entries) assert.equal(e.count, ['kochmod:knife', 'kochmod:spatula'].includes(e.item) ? 1 : 4, e.item);
});

test('crate_all lists every item and every block exactly once, in order', () => {
  assert.deepEqual(ALL.entries.map((e) => e.item), [...ALL_ITEM_IDS, ...ALL_BLOCK_IDS].map((i) => `kochmod:${i}`));
  assert.equal(ALL.entries.length, 31);
  ALL.entries.forEach((e, i) => assert.equal(e.count, i < 8 || e.item === 'kochmod:clean_plate' ? 4 : 1, e.item));
});

test('every crate title exists in de_DE.lang', () => {
  for (const c of Object.values(CRATES)) assert.ok(lang.includes(`\n${c.title}=`), c.title);
});

test('each crate has a block file using the kochmod:crate component', () => {
  for (const id of Object.keys(CRATES)) {
    const json = JSON.parse(fs.readFileSync(new URL(`../packs/BP/blocks/${id}.json`, import.meta.url), 'utf8'));
    assert.equal(json['minecraft:block'].description.identifier, `kochmod:${id}`);
    assert.ok('kochmod:crate' in json['minecraft:block'].components);
  }
});

test('fridge holds the cold ingredients, pantry the dry goods', () => {
  assert.deepEqual(CRATES.fridge.entries.map((e) => e.item), ['tomato', 'lettuce', 'raw_patty', 'cheese'].map((i) => `kochmod:${i}`));
  assert.deepEqual(CRATES.pantry.entries.map((e) => e.item), ['kochmod:bun']);
});

test('fridge and pantry geometry exists, UVs stay inside the texture and the facing state is wired', () => {
  const png = (/** @type {string} */ id) => fs.readFileSync(new URL(`../packs/RP/textures/blocks/${id}.png`, import.meta.url));
  for (const id of ['fridge', 'pantry']) {
    const block = JSON.parse(fs.readFileSync(new URL(`../packs/BP/blocks/${id}.json`, import.meta.url), 'utf8'))['minecraft:block'];
    const geo = JSON.parse(fs.readFileSync(new URL(`../packs/RP/models/blocks/${id}.geo.json`, import.meta.url), 'utf8'))['minecraft:geometry'][0];
    assert.equal(block.components['minecraft:geometry'], geo.description.identifier);
    assert.ok(block.description.traits['minecraft:placement_direction'].enabled_states.includes('minecraft:cardinal_direction'));
    assert.equal(block.permutations.length, 4);
    assert.deepEqual(block.components['minecraft:collision_box'].size, [16, 16, 16]);
    const texture = png(id);
    assert.equal(texture.readUInt32BE(16), geo.description.texture_width);
    assert.equal(texture.readUInt32BE(20), geo.description.texture_height);
    for (const cube of geo.bones.flatMap((/** @type {any} */ b) => b.cubes)) {
      assert.deepEqual(cube.size, [14, 23, 14]);
      assert.ok(cube.origin[1] === 0 && cube.origin[1] + cube.size[1] <= 23);
      assert.ok(Math.abs(cube.origin[0]) + cube.size[0] / 2 <= 15 && cube.origin[0] === -cube.size[0] / 2 && cube.origin[2] === -cube.size[2] / 2);
      for (const f of Object.values(cube.uv)) {
        assert.ok(f.uv[0] + f.uv_size[0] <= geo.description.texture_width && f.uv[1] + f.uv_size[1] <= geo.description.texture_height);
      }
    }
    assert.equal(JSON.parse(fs.readFileSync(new URL('../packs/RP/textures/terrain_texture.json', import.meta.url), 'utf8')).texture_data[`kochmod_${id}`].textures, `textures/blocks/${id}`);
  }
});

test('shouldRetryBusy retries only UserBusy, at most BUSY_RETRIES times', () => {
  assert.equal(shouldRetryBusy('UserBusy', 0), true);
  assert.equal(shouldRetryBusy('UserBusy', BUSY_RETRIES - 1), true);
  assert.equal(shouldRetryBusy('UserBusy', BUSY_RETRIES), false);
  assert.equal(shouldRetryBusy('UserClosed', 0), false);
  assert.equal(shouldRetryBusy(undefined, 0), false);
});

test('crate_failed hint exists in both lang files', () => {
  for (const f of ['de_DE', 'en_US']) {
    const t = fs.readFileSync(new URL(`../packs/RP/texts/${f}.lang`, import.meta.url), 'utf8');
    assert.ok(t.includes('\nkochmod.hint.crate_failed=Das hat nicht geklappt. Tippe die Kiste noch einmal an.'), f);
  }
});

test('every block in crate_all has a 16x16 menu icon and entryLook uses it', () => {
  const blocks = ALL.entries.map((e) => e.item.replace('kochmod:', '')).filter((id) => ALL_BLOCKS.includes(id));
  assert.deepEqual(blocks, ALL_BLOCK_IDS);
  for (const id of blocks) {
    const look = entryLook(`kochmod:${id}`);
    assert.equal(look.icon, `textures/items/block_${id}`);
    const png = fs.readFileSync(new URL(`../packs/RP/${look.icon}.png`, import.meta.url));
    assert.equal(png.readUInt32BE(16), 16, `${id} width`);
    assert.equal(png.readUInt32BE(20), 16, `${id} height`);
  }
});

test('items keep their item texture as menu icon', () => {
  assert.deepEqual(entryLook('kochmod:clean_plate'), { name: { translate: 'item.kochmod:clean_plate' }, icon: 'textures/items/clean_plate' });
});

test('crate_tools also hands out four clean plates', () => {
  assert.deepEqual(CRATES.crate_tools.entries, [
    { item: 'kochmod:knife', count: 1 }, { item: 'kochmod:spatula', count: 1 }, { item: 'kochmod:clean_plate', count: 4 },
  ]);
});
