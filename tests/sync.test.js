import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bookIndex, bookPages } from '../packs/BP/scripts/logic/recipe-book.js';
import { DISHES } from '../packs/BP/scripts/logic/recipes.js';
import { cabinetMenu } from '../packs/BP/scripts/logic/stations.js';
import { CRATES, ALL_BLOCKS, entryLook } from '../packs/BP/scripts/logic/crates.js';
import { STATION_KINDS } from '../packs/BP/scripts/logic/guest-flow.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCRIPTS = path.join(ROOT, 'packs/BP/scripts');
const BLOCKS_DIR = path.join(ROOT, 'packs/BP/blocks');

/** @param {string} file @returns {Set<string>} */
function langKeys(file) {
  const text = fs.readFileSync(path.join(ROOT, 'packs/RP/texts', file), 'utf8');
  return new Set(text.split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => l.slice(0, l.indexOf('='))));
}
const LANGS = { de_DE: langKeys('de_DE.lang'), en_US: langKeys('en_US.lang') };

/** @param {string} dir @returns {string[]} every .js file below dir */
function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return jsFiles(p);
    return e.name.endsWith('.js') ? [p] : [];
  });
}

/** @type {{ id: string, json: any }[]} */
const BLOCKS = fs.readdirSync(BLOCKS_DIR).filter((f) => f.endsWith('.json')).map((f) => {
  const json = JSON.parse(fs.readFileSync(path.join(BLOCKS_DIR, f), 'utf8'));
  return { id: json['minecraft:block'].description.identifier, json };
});
const BLOCK_IDS = new Set(BLOCKS.map((b) => b.id));

test('every kochmod.hint/book/theme/crate key written in the scripts exists in both lang files', () => {
  const found = new Set();
  for (const file of jsFiles(SCRIPTS)) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/kochmod\.(?:hint|book|theme|crate)\.[a-z0-9_]+(?![a-z0-9_$.{])/g)) found.add(m[0]);
  }
  assert.ok(found.size > 20, `only ${found.size} keys found`);
  for (const key of found) {
    for (const [name, keys] of Object.entries(LANGS)) assert.ok(keys.has(key), `${name}: ${key}`);
  }
});

test('every icon of the recipe book and the crate menus exists as a texture', () => {
  const icons = [
    ...bookIndex().buttons.map((b) => b.icon),
    ...DISHES.flatMap((d) => bookPages(d).buttons.map((b) => b.icon)),
    ...cabinetMenu({ plates: 1, bowls: 1 }).buttons.map((b) => b.icon),
    ...Object.values(CRATES).flatMap((c) => c.entries.map((e) => entryLook(e).icon)),
  ];
  for (const icon of new Set(icons)) assert.ok(fs.existsSync(path.join(ROOT, 'packs/RP', `${icon}.png`)), icon);
});

test('ALL_BLOCKS lists exactly the blocks in packs/BP/blocks', () => {
  assert.equal(new Set(ALL_BLOCKS).size, ALL_BLOCKS.length, 'no duplicates');
  assert.deepEqual(new Set(ALL_BLOCKS.map((id) => `kochmod:${id}`)), BLOCK_IDS);
});

/** @param {string} kind */
const hasComponent = (kind) => {
  const block = BLOCKS.find((b) => b.id === `kochmod:${kind}`);
  return Boolean(block && Object.hasOwn(block.json['minecraft:block'].components ?? {}, `kochmod:${kind}`));
};

test('every station kind the dishes need is a block with its kochmod:<kind> custom component', () => {
  assert.ok(STATION_KINDS.length >= 7);
  for (const kind of STATION_KINDS) {
    assert.ok(BLOCK_IDS.has(`kochmod:${kind}`), `no block kochmod:${kind}`);
    assert.ok(hasComponent(kind), `kochmod:${kind} lacks its custom component`);
  }
});

test('the world station registry (BY_TYPE) covers every needed kind, each a block with its component', () => {
  const src = fs.readFileSync(path.join(SCRIPTS, 'world/stations.js'), 'utf8');
  const body = src.slice(src.indexOf('const BY_TYPE = {'), src.indexOf('};', src.indexOf('const BY_TYPE = {')));
  const kinds = [...body.matchAll(/\]:\s*\['([a-z_]+)'/g)].map((m) => m[1]);
  assert.ok(kinds.length >= 10, `parsed ${kinds.length} kinds`);
  for (const kind of STATION_KINDS) assert.ok(kinds.includes(kind), `BY_TYPE lacks ${kind}`);
  for (const kind of kinds) assert.ok(hasComponent(kind), `kochmod:${kind} block or component missing`);
});
