import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MinecraftBlockTypes } from '@minecraft/vanilla-data';
import {
  RESTAURANT, DOOR_XS, ENTRANCE_DISTANCE, THEMES, THEME_IDS, themeForKit, rotateLayout, rotateDirection, rotateOffset, placementOrigin,
  facingFromView, clearanceOffsets, floorOffsets, isReplaceable, isOverwritable, hasSpace,
} from '../packs/BP/scripts/logic/layout.js';
import { RADIUS, seatDirection, withinRadius, offset, availableDishes } from '../packs/BP/scripts/logic/restaurant.js';
import { RECIPES, DISHES } from '../packs/BP/scripts/logic/recipes.js';
import { TIMED } from '../packs/BP/scripts/logic/processes.js';
import { ALL_BLOCKS } from '../packs/BP/scripts/logic/crates.js';

/** @typedef {import('../packs/BP/scripts/logic/restaurant.js').Direction} Direction */
/** @type {Direction[]} */
const FACINGS = ['north', 'east', 'south', 'west'];
const { blocks, width, depth, height } = RESTAURANT;
const STATIONS = ['grill', 'cutting_board', 'counter', 'oven', 'pot', 'spit', 'wok', 'dishwasher', 'dish_cabinet'];
const CABINETS = ['fridge', 'pantry'];
const CRATES = ['crate_tools', 'crate_all', 'crate_kits'];

/** @param {{ x: number, y: number, z: number }} p */
const key = (p) => `${p.x},${p.y},${p.z}`;
/** @param {string} id */
const ofId = (id) => blocks.filter((b) => b.id === `kochmod:${id}`);
/** @param {import('../packs/BP/scripts/logic/layout.js').LayoutBlock[]} list */
const byPos = (list) => new Map(list.map((b) => [key(b), b]));

test('footprint is about 15 x 11 with four wall layers and a roof', () => {
  assert.equal(width, 15);
  assert.equal(depth, 11);
  assert.equal(height, 6);
});

test('every kochmod id used exists as a block file', () => {
  for (const id of new Set(blocks.map((b) => b.id))) {
    if (!id.startsWith('kochmod:')) continue;
    assert.ok(fs.existsSync(new URL(`../packs/BP/blocks/${id.slice(8)}.json`, import.meta.url)), id);
  }
});

test('exactly one of each station, cabinet and crate, one bell, four tables and four chairs', () => {
  for (const id of [...STATIONS, ...CABINETS, ...CRATES, 'bell']) assert.equal(ofId(id).length, 1, id);
  assert.equal(ofId('table').length, 4);
  assert.equal(ofId('chair').length, 4);
});

test('the kitchen has every station kind: every timed station and every station a dish needs', () => {
  const kinds = new Set([...Object.keys(TIMED), ...RECIPES.flatMap((r) => r.stations)]);
  for (const kind of kinds) {
    assert.equal(ofId(kind).length, 1, kind);
    assert.ok(STATIONS.includes(kind), `${kind} is covered by the bell-radius and walkability checks`);
  }
});

test('the oven stands on the back row between counter and dishwasher', () => {
  const at = (/** @type {string} */ id) => ofId(id)[0];
  assert.deepEqual([at('counter').x, at('oven').x, at('dishwasher').x], [7, 8, 9]);
  assert.equal(at('oven').z, at('counter').z);
  assert.equal(at('oven').y, 1);
});

test('the pot stands on the back kitchen row at x=2, next to the fridge', () => {
  const at = (/** @type {string} */ id) => ofId(id)[0];
  assert.deepEqual([at('pot').x, at('pot').y, at('pot').z], [2, 1, at('counter').z]);
  assert.equal(at('fridge').x, 3);
});

test('the doner spit stands on the back row at x=1, the wok at x=11; x=12 stays free', () => {
  const at = (/** @type {string} */ id) => ofId(id)[0];
  const z = at('counter').z;
  assert.deepEqual([at('spit').x, at('spit').y, at('spit').z], [1, 1, z]);
  assert.deepEqual([at('wok').x, at('wok').y, at('wok').z], [11, 1, z]);
  assert.ok(!blocks.some((b) => b.x === 12 && b.y === 1 && b.z === z));
});

test('the dish cabinet starts with 8 plates', () => {
  assert.equal(ofId('dish_cabinet')[0].states?.['kochmod:plates'], 8);
});

test('nothing outside the footprint, no two blocks at one position', () => {
  for (const b of blocks) {
    assert.ok(b.x >= 0 && b.x < width && b.z >= 0 && b.z < depth && b.y >= 0 && b.y < height, key(b));
  }
  assert.equal(byPos(blocks).size, blocks.length);
});

test('the floor is fully covered', () => {
  const floor = new Set(blocks.filter((b) => b.y === 0).map(key));
  for (let z = 0; z < depth; z++) for (let x = 0; x < width; x++) assert.ok(floor.has(`${x},0,${z}`), `${x},${z}`);
});

test('the front wall has a 2 wide, 2 high door opening and stands closed above it', () => {
  const at = byPos(blocks);
  for (const x of DOOR_XS) {
    assert.equal(at.get(`${x},1,0`), undefined);
    assert.equal(at.get(`${x},2,0`), undefined);
    assert.ok(at.get(`${x},3,0`));
  }
});

test('blocks are listed floor, walls, roof, furniture, stations, bell', () => {
  const last = (/** @type {(b: any) => boolean} */ f) => blocks.findLastIndex(f);
  const first = (/** @type {(b: any) => boolean} */ f) => blocks.findIndex(f);
  const isStation = (/** @type {any} */ b) => STATIONS.includes(b.id.slice(8));
  assert.ok(last((b) => b.y === 0) < first((b) => b.id === 'minecraft:white_terracotta'));
  assert.ok(last((b) => b.id === 'minecraft:white_terracotta') < first((b) => b.id === 'minecraft:dark_oak_planks'));
  assert.ok(last((b) => b.y === height - 1) < first((b) => b.id.startsWith('kochmod:')));
  assert.ok(last((b) => b.id.startsWith('kochmod:') && !isStation(b) && b.id !== 'kochmod:bell') < first(isStation));
  assert.equal(blocks[blocks.length - 1].id, 'kochmod:bell');
});

for (const facing of FACINGS) {
  test(`facing ${facing}: every table has exactly one chair beside it, on the side away from the kitchen, facing it`, () => {
    const world = rotateLayout(RESTAURANT, facing);
    const tables = new Set(world.filter((b) => b.id === 'kochmod:table').map(key));
    const isTable = (/** @type {any} */ l) => tables.has(key(l));
    const chairs = world.filter((b) => b.id === 'kochmod:chair');
    const intoRoom = rotateDirection('north', facing);
    for (const chair of chairs) {
      const dir = seatDirection(chair, isTable);
      assert.equal(chair.states?.['minecraft:cardinal_direction'], dir, `chair ${key(chair)}`);
      assert.equal(dir, intoRoom, 'the chair looks towards the kitchen, so it stands on the far side');
      const neighbours = FACINGS.map((d) => offset(chair, d)).filter(isTable);
      assert.equal(neighbours.length, 1, `chair ${key(chair)} touches one table`);
    }
    for (const t of tables) {
      const [x, y, z] = t.split(',').map(Number);
      const around = FACINGS.map((d) => key(offset({ x, y, z }, d)));
      assert.equal(chairs.filter((c) => around.includes(key(c))).length, 1, `table ${t}`);
    }
  });
}

test('the bell is within RADIUS of every station and every chair', () => {
  const bell = ofId('bell')[0];
  for (const b of blocks.filter((x) => [...STATIONS, 'chair', 'table'].includes(x.id.slice(8)))) {
    assert.ok(withinRadius(bell, b), `${b.id} at ${key(b)} (RADIUS ${RADIUS})`);
  }
});

test('the bell has free air beside it on the dining side, for the guest to appear', () => {
  const bell = ofId('bell')[0];
  const at = byPos(blocks);
  const front = { x: bell.x, y: bell.y, z: bell.z - 1 };
  assert.equal(at.get(key(front)), undefined);
  assert.equal(at.get(key({ ...front, y: front.y + 1 })), undefined);
  assert.ok(at.get(key({ ...bell, y: bell.y - 1 })), 'the bell stands on a counter');
});

test('everything is reachable on foot: a flood fill from the door touches every station, crate and chair', () => {
  const at = byPos(blocks);
  // walkable: floor below, feet and head cells empty
  const free = (/** @type {number} */ x, /** @type {number} */ z) => x >= 0 && x < width && z >= 0 && z < depth
    && !at.has(`${x},1,${z}`) && !at.has(`${x},2,${z}`);
  const seen = new Set();
  const queue = [[DOOR_XS[0], 0]];
  while (queue.length) {
    const [x, z] = /** @type {number[]} */ (queue.pop());
    if (seen.has(`${x},${z}`) || !free(x, z)) continue;
    seen.add(`${x},${z}`);
    queue.push([x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]);
  }
  const reachable = (/** @type {any} */ b) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => seen.has(`${b.x + dx},${b.z + dz}`));
  for (const b of blocks.filter((x) => x.id.startsWith('kochmod:'))) assert.ok(reachable(b), `${b.id} at ${key(b)}`);
  assert.ok(seen.size > 50);
});

test('rotation keeps every block and maps directions clockwise', () => {
  for (const facing of FACINGS) {
    const world = rotateLayout(RESTAURANT, facing);
    assert.equal(world.length, blocks.length);
    assert.equal(byPos(world).size, blocks.length);
    const count = (/** @type {any[]} */ list) => JSON.stringify(Object.entries(list.reduce((m, b) => ({ ...m, [b.id]: (m[b.id] ?? 0) + 1 }), {})).sort());
    assert.equal(count(world), count(blocks));
  }
  assert.deepEqual(rotateLayout(RESTAURANT, 'north').map(key), blocks.map((b) => key({ x: b.x, y: b.y, z: -b.z })));
  assert.equal(rotateDirection('north', 'east'), 'east');
  assert.equal(rotateDirection('south', 'east'), 'west');
  assert.equal(rotateDirection('east', 'south'), 'west');
  assert.equal(rotateDirection('west', 'west'), 'south');
  const fridge = (/** @type {Direction} */ f) => rotateLayout(RESTAURANT, f).find((b) => b.id === 'kochmod:fridge')?.states?.['minecraft:cardinal_direction'];
  // the fridge faces back towards the entrance, i.e. towards the player
  assert.deepEqual(FACINGS.map(fridge), ['south', 'west', 'north', 'east']);
});

test('rotateOffset turns the room so that "into the room" is the facing direction', () => {
  assert.deepEqual(rotateOffset({ x: 0, y: 0, z: 1 }, 'north'), { x: 0, y: 0, z: -1 });
  assert.deepEqual(rotateOffset({ x: 0, y: 0, z: 1 }, 'east'), { x: 1, y: 0, z: 0 });
  assert.deepEqual(rotateOffset({ x: 1, y: 2, z: 0 }, 'east'), { x: 0, y: 2, z: 1 });
  assert.deepEqual(rotateOffset({ x: 1, y: 0, z: 0 }, 'south'), { x: -1, y: 0, z: 0 });
  assert.deepEqual(rotateOffset({ x: 0, y: 0, z: 1 }, 'west'), { x: -1, y: 0, z: 0 });
});

test('placementOrigin puts the door ENTRANCE_DISTANCE blocks in front of the tapped block', () => {
  const tapped = { x: 100, y: 64, z: -20 };
  for (const facing of FACINGS) {
    const origin = placementOrigin(tapped, facing);
    const door = rotateOffset({ x: DOOR_XS[0], y: 0, z: 0 }, facing);
    const ahead = rotateOffset({ x: 0, y: 0, z: ENTRANCE_DISTANCE }, facing);
    assert.deepEqual(
      { x: origin.x + door.x, y: origin.y, z: origin.z + door.z },
      { x: tapped.x + ahead.x, y: tapped.y, z: tapped.z + ahead.z },
      facing,
    );
  }
});

test('facingFromView picks the dominant horizontal axis', () => {
  assert.equal(facingFromView({ x: 0, z: -1 }), 'north');
  assert.equal(facingFromView({ x: 0.2, z: 0.9 }), 'south');
  assert.equal(facingFromView({ x: 0.8, z: -0.5 }), 'east');
  assert.equal(facingFromView({ x: -0.7, z: 0.1 }), 'west');
});

test('clearance covers every cell above the floor inside the footprint', () => {
  const cells = clearanceOffsets(RESTAURANT, 'east');
  assert.equal(cells.length, width * depth * (height - 1));
  assert.equal(new Set(cells.map(key)).size, cells.length);
  assert.ok(cells.every((c) => c.y >= 1 && c.y < height));
});

test('grass, flowers and snow layers count as replaceable, stone does not; more than 10 % blocked is too much', () => {
  for (const id of ['air', 'short_grass', 'tall_grass', 'poppy', 'dandelion', 'snow_layer']) assert.ok(isReplaceable(`minecraft:${id}`), id);
  for (const id of ['stone', 'dirt', 'oak_log', 'water', 'kochmod:table']) assert.ok(!isReplaceable(id.includes(':') ? id : `minecraft:${id}`), id);
  assert.equal(hasSpace(82, 825), true);
  assert.equal(hasSpace(83, 825), false);
  assert.equal(hasSpace(0, 825), true);
});

test('restaurant kit item: stack of 1, kit component, name and hints in both lang files', () => {
  const item = JSON.parse(fs.readFileSync(new URL('../packs/BP/items/restaurant_kit.json', import.meta.url), 'utf8'))['minecraft:item'];
  assert.equal(item.description.identifier, 'kochmod:restaurant_kit');
  assert.equal(item.description.menu_category.category, 'items');
  assert.equal(item.components['minecraft:max_stack_size'], 1);
  assert.ok('kochmod:restaurant_kit' in item.components);
  for (const f of ['de_DE', 'en_US']) {
    const t = fs.readFileSync(new URL(`../packs/RP/texts/${f}.lang`, import.meta.url), 'utf8');
    assert.ok(t.includes('\nitem.kochmod:restaurant_kit=Restaurant-Baukasten\n'), f);
    assert.ok(t.includes('\nkochmod.hint.kit_built=Dein Restaurant steht! Tipp die Glocke an.\n'), f);
    assert.ok(t.includes('\nkochmod.hint.kit_no_space=Hier ist nicht genug Platz. Such eine freie, ebene Fläche.\n'), f);
  }
});

test('isOverwritable allows air, plants and natural ground only', () => {
  for (const id of ['air', 'short_grass', 'poppy', 'snow_layer', 'grass_block', 'dirt', 'coarse_dirt', 'podzol', 'stone', 'deepslate', 'sand', 'gravel', 'sandstone', 'snow', 'moss_block', 'mud', 'oak_leaves', 'cherry_leaves', 'oak_log', 'stripped_birch_log', 'spruce_wood']) {
    assert.equal(isOverwritable(`minecraft:${id}`, false), true, id);
  }
  for (const id of ['chest', 'oak_door', 'red_bed', 'oak_sign', 'water', 'oak_planks', 'furnace', 'glass', 'torch']) {
    assert.equal(isOverwritable(`minecraft:${id}`, false), false, id);
  }
  assert.equal(isOverwritable('kochmod:table', false), false);
  assert.equal(isOverwritable('minecraft:barrel', true), false);
  assert.equal(isOverwritable('minecraft:dirt', true), false);
});

test('floorOffsets covers the whole footprint at y = 0', () => {
  for (const facing of ['north', 'east', 'south', 'west']) {
    const cells = floorOffsets(RESTAURANT, facing);
    assert.equal(cells.length, RESTAURANT.width * RESTAURANT.depth);
    assert.ok(cells.every((c) => c.y === 0));
    assert.equal(new Set(cells.map((c) => `${c.x},${c.z}`)).size, cells.length);
  }
});

// ---- Stage 2: themed restaurants, one Baukasten per theme ----

const ALL_DEVICES = ['grill', 'cutting_board', 'counter', 'oven', 'pot', 'spit', 'wok'];
/** The theme table of the task brief, verbatim: kitchen devices and number of tables. */
const THEME_TABLE = {
  burger: { devices: ['grill', 'cutting_board', 'counter'], tables: 4 },
  italian: { devices: ['oven', 'pot', 'cutting_board', 'counter'], tables: 4 },
  japanese: { devices: ['pot', 'wok', 'cutting_board', 'counter'], tables: 4 },
  doner: { devices: ['spit', 'cutting_board', 'counter'], tables: 3 },
  classic: { devices: ALL_DEVICES, tables: 4 },
  mega: { devices: ALL_DEVICES, tables: 8 },
};
/** Every theme has these exactly once. */
const EVERY_THEME = ['fridge', 'pantry', 'crate_tools', 'crate_all', 'crate_kits', 'dishwasher', 'dish_cabinet'];
const dishIds = (/** @type {string[]} */ ...ids) => ids.map((i) => `kochmod:${i}`);
/** What guests may wish for at each theme (RECIPES order). */
const MENUS = {
  burger: dishIds('hamburger', 'cheeseburger'),
  // pot + cutting board + counter is also the sushi kitchen (RECIPES: sushi needs pot, cutting_board, counter)
  italian: dishIds('sushi', 'pizza_margherita', 'salami_pizza', 'ramen', 'potato_soup'),
  japanese: dishIds('sushi', 'ramen', 'potato_soup', 'fried_noodles'),
  doner: dishIds('doner'),
  classic: DISHES,
  mega: DISHES,
};
/** Vanilla blocks the layouts may use (each one checked against @minecraft/vanilla-data below). */
const MINECRAFT_BLOCKS = [
  'smooth_stone', 'polished_andesite', 'white_terracotta', 'red_terracotta', 'glass_pane', 'dark_oak_planks', 'glowstone',
  'smooth_stone_slab', 'dark_oak_slab', 'black_concrete', 'white_concrete', 'green_concrete', 'red_concrete',
  'light_gray_concrete', 'brick_block', 'oak_planks', 'oak_slab', 'oak_fence', 'spruce_planks', 'lantern',
].map((id) => `minecraft:${id}`);
/** kochmod blocks that are neither a kitchen device nor part of EVERY_THEME. */
const SEATING = ['table', 'chair', 'bell'];
/** Vanilla blocks a player cannot stand on in the walk model (thin or taller than a block). */
const NOT_STANDABLE = new Set(['minecraft:lantern', 'minecraft:oak_fence']);

/** @typedef {import('../packs/BP/scripts/logic/layout.js').Layout} Layout */
/** @typedef {import('../packs/BP/scripts/logic/layout.js').LayoutBlock} LayoutBlock */

/** @param {LayoutBlock} b */
const isBottomSlab = (b) => b.id.endsWith('_slab') && b.states?.['minecraft:vertical_half'] === 'bottom';
/** @param {Layout} layout @param {string} id */
const blocksOf = (layout, id) => layout.blocks.filter((b) => b.id === `kochmod:${id}`);

/**
 * Walk model in half blocks: a player stands on the top of a vanilla block (a bottom slab is half a block high),
 * needs four free half blocks (two blocks) above the feet and steps at most half a block up or down per move.
 * Flood fill from the door cell; returns the visited standing spots as "x,z,surface" (surface in half blocks).
 * @param {Layout} layout
 */
function walk(layout) {
  const at = byPos(layout.blocks);
  const occupied = (/** @type {number} */ x, /** @type {number} */ h, /** @type {number} */ z) => {
    const b = at.get(`${x},${h >> 1},${z}`);
    return b !== undefined && !(isBottomSlab(b) && (h & 1) === 1);
  };
  /** @type {Map<string, number[]>} */
  const surfaceCache = new Map();
  const surfaces = (/** @type {number} */ x, /** @type {number} */ z) => {
    const k = `${x},${z}`;
    let list = surfaceCache.get(k);
    if (list) return list;
    list = [];
    for (let y = 0; y < layout.height; y++) {
      const b = at.get(`${x},${y},${z}`);
      if (!b || !b.id.startsWith('minecraft:') || NOT_STANDABLE.has(b.id)) continue;
      const s = isBottomSlab(b) ? 2 * y + 1 : 2 * y + 2;
      if ([0, 1, 2, 3].every((d) => !occupied(x, s + d, z))) list.push(s);
    }
    surfaceCache.set(k, list);
    return list;
  };
  const start = { x: layout.door.xs[0], z: layout.door.z, s: 2 };
  assert.ok(surfaces(start.x, start.z).includes(2), 'the door cell is walkable at floor level');
  /** @type {Set<string>} */
  const seen = new Set();
  const queue = [start];
  while (queue.length) {
    const { x, z, s } = /** @type {{ x: number, z: number, s: number }} */ (queue.pop());
    const k = `${x},${z},${s}`;
    if (seen.has(k)) continue;
    seen.add(k);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= layout.width || nz >= layout.depth) continue;
      for (const ns of surfaces(nx, nz)) if (Math.abs(ns - s) <= 1) queue.push({ x: nx, z: nz, s: ns });
    }
  }
  /** A block is reachable if a visited spot beside it has its feet at most one block above or below it. */
  const reaches = (/** @type {{ x: number, y: number, z: number }} */ b) => [...seen].some((k) => {
    const [x, z, s] = k.split(',').map(Number);
    return Math.abs(x - b.x) + Math.abs(z - b.z) === 1 && Math.abs(b.y - Math.floor(s / 2)) <= 1;
  });
  return { seen, reaches };
}

test('THEMES: six themes in menu order, each with name key, kit item, a dish icon it can cook and a layout', () => {
  assert.deepEqual(THEME_IDS, ['burger', 'italian', 'japanese', 'doner', 'classic', 'mega']);
  assert.deepEqual(Object.keys(THEMES), THEME_IDS);
  for (const id of THEME_IDS) {
    const t = THEMES[id];
    assert.equal(t.id, id);
    assert.equal(t.name, `kochmod.theme.${id}`);
    assert.equal(t.kit, `kochmod:kit_${id}`);
    assert.ok(MENUS[id].includes(t.icon), `${id} icon ${t.icon} is a dish of the theme`);
    assert.ok(Array.isArray(t.layout.blocks) && t.layout.blocks.length > 0);
  }
  assert.equal(RESTAURANT, THEMES.classic.layout, 'the stage 1 restaurant is the classic theme');
  assert.deepEqual(DOOR_XS, RESTAURANT.door.xs);
});

test('themeForKit: each kit builds its theme, the old restaurant_kit builds the classic one', () => {
  for (const id of THEME_IDS) assert.equal(themeForKit(`kochmod:kit_${id}`), THEMES[id]);
  assert.equal(themeForKit('kochmod:restaurant_kit'), THEMES.classic);
  assert.equal(themeForKit('kochmod:knife'), undefined);
  assert.equal(themeForKit('minecraft:stick'), undefined);
});

test('the expected menus follow from RECIPES and the theme table', () => {
  for (const id of THEME_IDS) {
    const devices = THEME_TABLE[id].devices;
    assert.deepEqual(RECIPES.filter((r) => r.stations.every((s) => devices.includes(s))).map((r) => r.dish), MENUS[id], id);
  }
});

test('every vanilla block of the whitelist exists in Minecraft 1.26', () => {
  const known = new Set(Object.values(MinecraftBlockTypes));
  for (const id of MINECRAFT_BLOCKS) assert.ok(known.has(id), id);
});

for (const id of THEME_IDS) {
  const theme = THEMES[id];
  const layout = theme.layout;
  const { blocks: list } = layout;
  const bells = blocksOf(layout, 'bell');

  test(`${id}: every block id exists (kochmod blocks of the add-on, whitelisted vanilla blocks)`, () => {
    for (const b of list) {
      if (b.id.startsWith('kochmod:')) assert.ok(ALL_BLOCKS.includes(b.id.slice(8)), b.id);
      else assert.ok(MINECRAFT_BLOCKS.includes(b.id), b.id);
    }
  });

  test(`${id}: blocks stay inside the declared footprint, no two share a cell, the floor is complete`, () => {
    for (const b of list) {
      assert.ok(b.x >= 0 && b.x < layout.width && b.z >= 0 && b.z < layout.depth && b.y >= 0 && b.y < layout.height, key(b));
    }
    assert.equal(byPos(list).size, list.length);
    const floor = new Set(list.filter((b) => b.y === 0).map(key));
    for (let z = 0; z < layout.depth; z++) for (let x = 0; x < layout.width; x++) assert.ok(floor.has(`${x},0,${z}`), `${x},${z}`);
  });

  test(`${id}: kitchen devices as in the theme table, every common device once, ${THEME_TABLE[id].tables} tables with one chair each`, () => {
    /** @type {Record<string, number>} */
    const count = {};
    for (const b of list.filter((x) => x.id.startsWith('kochmod:'))) count[b.id.slice(8)] = (count[b.id.slice(8)] ?? 0) + 1;
    /** @type {Record<string, number>} */
    const expected = { table: THEME_TABLE[id].tables, chair: THEME_TABLE[id].tables, bell: id === 'mega' ? 2 : 1 };
    for (const d of [...THEME_TABLE[id].devices, ...EVERY_THEME]) expected[d] = 1;
    assert.deepEqual(Object.entries(count).sort(), Object.entries(expected).sort());
    for (const k of Object.keys(count)) assert.ok([...ALL_DEVICES, ...EVERY_THEME, ...SEATING].includes(k), k);
  });

  test(`${id}: the door is a 2 wide, 2 high opening in the front wall`, () => {
    const at = byPos(list);
    assert.equal(layout.door.xs.length, 2);
    for (const x of layout.door.xs) {
      assert.equal(at.get(`${x},1,${layout.door.z}`), undefined);
      assert.equal(at.get(`${x},2,${layout.door.z}`), undefined);
      assert.ok(at.get(`${x},3,${layout.door.z}`), 'wall above the door');
    }
  });

  test(`${id}: placement order is vanilla blocks, furniture, stations, bells last`, () => {
    const rank = (/** @type {LayoutBlock} */ b) => {
      if (!b.id.startsWith('kochmod:')) return 0;
      const short = b.id.slice(8);
      if (short === 'bell') return 3;
      return ['table', 'chair', 'fridge', 'pantry', 'crate_tools', 'crate_all', 'crate_kits'].includes(short) ? 1 : 2;
    };
    for (let i = 1; i < list.length; i++) assert.ok(rank(list[i - 1]) <= rank(list[i]), `${list[i - 1].id} before ${list[i].id}`);
    assert.equal(list[list.length - 1].id, 'kochmod:bell');
    assert.ok(list.findIndex((b) => b.y === 0) === 0 && list.findLastIndex((b) => b.y === 0) < list.findIndex((b) => b.y === 1), 'floor first');
  });

  for (const facing of FACINGS) {
    test(`${id} facing ${facing}: every chair touches exactly one table and faces it, every table has one chair`, () => {
      const world = rotateLayout(layout, facing);
      const tables = new Set(world.filter((b) => b.id === 'kochmod:table').map(key));
      const isTable = (/** @type {any} */ l) => tables.has(key(l));
      const chairs = world.filter((b) => b.id === 'kochmod:chair');
      for (const chair of chairs) {
        const dir = seatDirection(chair, isTable);
        assert.ok(dir, `chair ${key(chair)} has a table`);
        assert.equal(chair.states?.['minecraft:cardinal_direction'], dir, `chair ${key(chair)} faces its table`);
        assert.equal(FACINGS.map((d) => offset(chair, d)).filter(isTable).length, 1, `chair ${key(chair)} touches one table`);
      }
      for (const t of tables) {
        const [x, y, z] = t.split(',').map(Number);
        const around = FACINGS.map((d) => key(offset({ x, y, z }, d)));
        assert.equal(chairs.filter((c) => around.includes(key(c))).length, 1, `table ${t}`);
      }
    });
  }

  test(`${id}: every chair is within RADIUS of a bell; each bell's kitchen makes exactly the theme's menu`, () => {
    for (const chair of blocksOf(layout, 'chair')) assert.ok(bells.some((bell) => withinRadius(bell, chair)), `chair ${key(chair)}`);
    for (const bell of bells) {
      const kinds = new Set(list.filter((b) => b.id.startsWith('kochmod:') && withinRadius(bell, b)).map((b) => b.id.slice(8)));
      assert.deepEqual(availableDishes(kinds), MENUS[id], `bell ${key(bell)}`);
    }
  });

  test(`${id}: every bell stands on a counter with free air beside it for the guest to appear`, () => {
    const at = byPos(list);
    for (const bell of bells) {
      assert.ok(at.get(key({ ...bell, y: bell.y - 1 })), 'counter below the bell');
      const spots = FACINGS.map((d) => offset(bell, d)).filter((s) => !at.has(key(s)) && !at.has(key({ ...s, y: s.y + 1 })));
      assert.ok(spots.length > 0, `bell ${key(bell)}`);
    }
  });

  test(`${id}: walkable from the door to every station, crate, chair, bell and the spare kitchen cell`, () => {
    const { seen, reaches } = walk(layout);
    const chairs = blocksOf(layout, 'chair');
    for (const b of list.filter((x) => x.id.startsWith('kochmod:'))) {
      // a bar table may only be reached across its own chair: two blocks away, well within a player's reach
      const acrossChair = b.id === 'kochmod:table' && chairs.some((c) => Math.abs(c.x - b.x) + Math.abs(c.z - b.z) === 1 && c.y === b.y && reaches(c));
      assert.ok(reaches(b) || acrossChair, `${b.id} at ${key(b)}`);
    }
    assert.ok(reaches(layout.spare), `spare cell ${key(layout.spare)}`);
    assert.ok(seen.size > 40, `${seen.size} standing spots`);
  });

  test(`${id}: one free kitchen-row cell is kept for the trash can`, () => {
    const at = byPos(list);
    const { spare } = layout;
    assert.equal(at.get(key(spare)), undefined);
    assert.equal(at.get(key({ ...spare, y: spare.y + 1 })), undefined);
    assert.ok(at.get(key({ ...spare, y: spare.y - 1 })), 'floor below the spare cell');
    assert.equal(spare.z, blocksOf(layout, 'dishwasher')[0].z, 'on the kitchen row');
    assert.ok(FACINGS.some((d) => at.get(key(offset(spare, d)))?.id.startsWith('kochmod:')), 'next to a kitchen device');
  });

  test(`${id}: placementOrigin puts the door ENTRANCE_DISTANCE blocks in front of the tapped block`, () => {
    const tapped = { x: -40, y: 70, z: 13 };
    for (const facing of FACINGS) {
      const origin = placementOrigin(tapped, facing, layout);
      const door = rotateOffset({ x: layout.door.xs[0], y: 0, z: layout.door.z }, facing);
      const ahead = rotateOffset({ x: 0, y: 0, z: ENTRANCE_DISTANCE }, facing);
      assert.deepEqual({ x: origin.x + door.x, y: origin.y, z: origin.z + door.z }, { x: tapped.x + ahead.x, y: tapped.y, z: tapped.z + ahead.z }, facing);
    }
  });

  test(`${id}: clearance and floor offsets cover the footprint`, () => {
    for (const facing of FACINGS) {
      assert.equal(new Set(clearanceOffsets(layout, facing).map(key)).size, layout.width * layout.depth * (layout.height - 1));
      assert.equal(new Set(floorOffsets(layout, facing).map(key)).size, layout.width * layout.depth);
    }
  });
}

test('footprints: the classic size for burger, pizzeria and sushi bar, a smaller döner stand, the 20 x 14 x 9 mega restaurant', () => {
  const size = (/** @type {string} */ id) => [THEMES[id].layout.width, THEMES[id].layout.depth, THEMES[id].layout.height];
  for (const id of ['burger', 'italian', 'japanese', 'classic']) assert.deepEqual(size(id), [15, 11, 6], id);
  const [w, d, h] = size('doner');
  assert.ok(w * d < 15 * 11 && h === 6, 'the döner stand is small');
  assert.deepEqual(size('mega'), [20, 14, 9]);
});

/** @param {Layout} layout @returns {boolean} neighbouring floor cells always differ (tiles / checkerboard) */
function checkered(layout) {
  const floor = new Map(layout.blocks.filter((b) => b.y === 0).map((b) => [`${b.x},${b.z}`, b.id]));
  for (let z = 1; z < layout.depth - 1; z++) {
    for (let x = 1; x < layout.width - 2; x++) {
      if (floor.get(`${x},${z}`) === floor.get(`${x + 1},${z}`)) return false;
    }
  }
  return true;
}

test('looks: each theme uses its materials', () => {
  const uses = (/** @type {string} */ id, /** @type {string} */ block, /** @type {(b: LayoutBlock) => boolean} */ where = () => true) => THEMES[id].layout.blocks.some((b) => b.id === `minecraft:${block}` && where(b));
  const wall = (/** @type {string} */ id) => (/** @type {LayoutBlock} */ b) => b.y > 0 && (b.x === 0 || b.z === 0 || b.x === THEMES[id].layout.width - 1 || b.z === THEMES[id].layout.depth - 1);
  // burger: red/white terracotta, checkered floor
  for (const m of ['red_terracotta', 'white_terracotta']) assert.ok(uses('burger', m, wall('burger')), m);
  assert.ok(checkered(THEMES.burger.layout), 'burger floor is checkered');
  assert.ok(uses('burger', 'black_concrete', (b) => b.y === 0) && uses('burger', 'white_concrete', (b) => b.y === 0));
  // pizzeria: brick walls with a green/white/red awning row in the front wall
  assert.ok(uses('italian', 'brick_block', wall('italian')));
  for (const m of ['green_concrete', 'white_concrete', 'red_concrete']) assert.ok(uses('italian', m, (b) => b.z === 0 && b.y > 2), m);
  // sushi bar: dark oak frame, paper-like white concrete, hanging lanterns, the tables in one bar row
  assert.ok(uses('japanese', 'dark_oak_planks', wall('japanese')) && uses('japanese', 'white_concrete', wall('japanese')));
  assert.ok(uses('japanese', 'lantern', (b) => b.states?.hanging === true));
  const bar = blocksOf(THEMES.japanese.layout, 'table').sort((a, b) => a.x - b.x);
  assert.ok(bar.every((t, i) => t.z === bar[0].z && t.y === bar[0].y && t.x === bar[0].x + i), 'four tables side by side');
  // döner stand: bright tiles
  assert.ok(checkered(THEMES.doner.layout), 'döner floor is tiled');
  assert.ok(uses('doner', 'white_concrete', wall('doner')));
});

test('mega: two storeys joined by a staircase, kitchen downstairs, four tables and one bell on each floor', () => {
  const layout = THEMES.mega.layout;
  const upper = (/** @type {LayoutBlock} */ b) => b.y >= 5;
  const tables = blocksOf(layout, 'table');
  assert.equal(tables.filter(upper).length, 4);
  assert.equal(tables.filter((b) => !upper(b)).length, 4);
  const bells = blocksOf(layout, 'bell');
  assert.equal(bells.filter(upper).length, 1);
  const top = bells.filter(upper)[0];
  for (const chair of blocksOf(layout, 'chair').filter(upper)) assert.ok(withinRadius(top, chair), `upstairs chair ${key(chair)} near the upper bell`);
  // guests take the nearest free chair: the upper bell fills the upper floor before sending anyone downstairs
  const d2 = (/** @type {LayoutBlock} */ a) => (a.x - top.x) ** 2 + (a.y - top.y) ** 2 + (a.z - top.z) ** 2;
  const chairs = blocksOf(layout, 'chair');
  assert.ok(Math.max(...chairs.filter(upper).map(d2)) < Math.min(...chairs.filter((b) => !upper(b)).map(d2)));
  for (const d of ALL_DEVICES) assert.ok(blocksOf(layout, d).every((b) => b.y === 1), `${d} on the ground floor`);
  const { seen } = walk(layout);
  // the upper floor layer is y = 4, so its walking surface is 10 half blocks up
  assert.ok([...seen].filter((k) => k.endsWith(',10')).length > 100, 'the upper floor is reached over the stairs');
  assert.ok([...seen].some((k) => [3, 5, 7, 9].includes(Number(k.split(',')[2]))), 'half-block steps on the way up');
});

const KIT_NAMES = {
  burger: 'Baukasten: Burger-Laden', italian: 'Baukasten: Pizzeria', japanese: 'Baukasten: Sushi-Bar',
  doner: 'Baukasten: Döner-Imbiss', classic: 'Baukasten: Restaurant', mega: 'Baukasten: Mega-Restaurant',
};
const THEME_NAMES = {
  burger: 'Burger-Laden', italian: 'Pizzeria', japanese: 'Sushi-Bar', doner: 'Döner-Imbiss', classic: 'Restaurant', mega: 'Mega-Restaurant',
};

test('kit items: stack of 1, shared kit component, icon, German names and theme names in both lang files', () => {
  for (const id of THEME_IDS) {
    const item = JSON.parse(fs.readFileSync(new URL(`../packs/BP/items/kit_${id}.json`, import.meta.url), 'utf8'))['minecraft:item'];
    assert.equal(item.description.identifier, `kochmod:kit_${id}`);
    assert.equal(item.description.menu_category.category, 'items');
    assert.equal(item.components['minecraft:max_stack_size'], 1);
    assert.equal(item.components['minecraft:icon'].textures.default, `kochmod_kit_${id}`);
    assert.ok('kochmod:kit' in item.components, id);
  }
  for (const f of ['de_DE', 'en_US']) {
    const t = fs.readFileSync(new URL(`../packs/RP/texts/${f}.lang`, import.meta.url), 'utf8');
    for (const id of THEME_IDS) {
      assert.ok(t.includes(`\nitem.kochmod:kit_${id}=${KIT_NAMES[id]}\n`), `${f} kit ${id}`);
      assert.ok(t.includes(`\nkochmod.theme.${id}=${THEME_NAMES[id]}\n`), `${f} theme ${id}`);
    }
  }
});
