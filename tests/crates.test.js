import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CRATES } from '../packs/BP/scripts/logic/crates.js';

const lang = fs.readFileSync(new URL('../packs/RP/texts/de_DE.lang', import.meta.url), 'utf8');
const SUPPLIED = ['raw_patty', 'bun', 'lettuce', 'tomato', 'cheese', 'knife', 'spatula'].map((i) => `kochmod:${i}`);
const TOOLS = ['kochmod:knife', 'kochmod:spatula'];
// Stage 1 recipes need these; cooked patty and tomato slices are produced at stations.
const NEEDED = ['kochmod:bun', 'kochmod:raw_patty', 'kochmod:lettuce', 'kochmod:tomato', 'kochmod:cheese', ...TOOLS];

const entries = Object.values(CRATES).flatMap((c) => c.entries);

test('there are exactly the five crates', () => {
  assert.deepEqual(Object.keys(CRATES).sort(), ['crate_bread', 'crate_dairy', 'crate_meat', 'crate_tools', 'crate_vegetables']);
});

test('crates only hand out the seven supply items, and together all that stage 1 needs', () => {
  for (const e of entries) assert.ok(SUPPLIED.includes(e.item), e.item);
  const given = new Set(entries.map((e) => e.item));
  for (const n of NEEDED) assert.ok(given.has(n), `no crate supplies ${n}`);
});

test('tools come singly, ingredients in fours, and no crate is empty', () => {
  for (const c of Object.values(CRATES)) assert.ok(c.entries.length > 0);
  for (const e of entries) assert.equal(e.count, TOOLS.includes(e.item) ? 1 : 4, e.item);
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
