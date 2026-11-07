import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as items from '../tools/sprites/items.js';
import { recolor, spriteToRgba } from '../tools/sprites/util.js';

const ITEM_IDS = [
  'bun', 'raw_patty', 'cooked_patty', 'burnt_patty', 'lettuce', 'tomato', 'tomato_slices',
  'cheese', 'knife', 'spatula', 'hamburger', 'cheeseburger', 'failed_dish', 'clean_plate', 'dirty_plate',
];

/** @type {import('../tools/sprites/util.js').Sprite[]} */
const sprites = Object.values(items).filter((v) => v && typeof v === 'object' && Array.isArray(v.rows));

test('items.js exports folder "items" and one sprite per item id', () => {
  assert.equal(items.folder, 'items');
  const names = sprites.map((s) => s.name);
  assert.equal(new Set(names).size, names.length, 'names are unique');
  assert.deepEqual([...names].sort(), [...ITEM_IDS].sort());
});

test('every item sprite is 16x16 and only uses palette characters or "."', () => {
  for (const s of sprites) {
    assert.equal(s.rows.length, 16, `${s.name} height`);
    s.rows.forEach((row, y) => {
      assert.equal(row.length, 16, `${s.name} row ${y} width`);
      for (const ch of row) assert.ok(ch === '.' || ch in s.palette, `${s.name} row ${y}: "${ch}"`);
    });
    assert.ok(spriteToRgba(s).rgba.some((v, i) => i % 4 === 3 && v > 0), `${s.name} is not empty`);
  }
});

test('spriteToRgba maps "." to transparent and palette chars to their colors', () => {
  const { width, height, rgba } = spriteToRgba({ name: 't', palette: { a: '#ff8000', b: '#01020380' }, rows: ['.a', 'b.'] });
  assert.equal(width, 2);
  assert.equal(height, 2);
  assert.deepEqual([...rgba], [0, 0, 0, 0, 255, 128, 0, 255, 1, 2, 3, 128, 0, 0, 0, 0]);
});

test('recolor changes only the overridden colors and keeps the rows', () => {
  const base = { name: 'a', palette: { x: '#111111', y: '#222222' }, rows: ['xy'] };
  const r = recolor(base, 'b', { y: '#333333' });
  assert.equal(r.name, 'b');
  assert.deepEqual(r.palette, { x: '#111111', y: '#333333' });
  assert.deepEqual(r.rows, base.rows);
  assert.equal(base.palette.y, '#222222', 'original untouched');
});

test('raw, cooked and burnt patty share their shape but differ in color', () => {
  const [raw, cooked, burnt] = ['raw_patty', 'cooked_patty', 'burnt_patty'].map((n) => sprites.find((s) => s.name === n));
  assert.ok(raw && cooked && burnt);
  assert.deepEqual(raw.rows, cooked.rows);
  assert.deepEqual(burnt.rows, cooked.rows);
  assert.notDeepEqual(raw.palette, cooked.palette);
  assert.notDeepEqual(burnt.palette, cooked.palette);
});

test('clean and dirty plate share their shape; the dirty one has brown smears', () => {
  const [clean, dirty] = ['clean_plate', 'dirty_plate'].map((n) => sprites.find((s) => s.name === n));
  assert.ok(clean && dirty);
  assert.deepEqual(dirty.rows, clean.rows);
  assert.equal(clean.palette.s, clean.palette.c, 'no smears on the clean plate');
  assert.notEqual(dirty.palette.s, dirty.palette.c);
});
