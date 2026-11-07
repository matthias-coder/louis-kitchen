import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  RESTAURANT, DOOR_XS, ENTRANCE_DISTANCE, rotateLayout, rotateDirection, rotateOffset, placementOrigin,
  facingFromView, clearanceOffsets, floorOffsets, isReplaceable, isOverwritable, hasSpace,
} from '../packs/BP/scripts/logic/layout.js';
import { RADIUS, seatDirection, withinRadius, offset } from '../packs/BP/scripts/logic/restaurant.js';
import { RECIPES } from '../packs/BP/scripts/logic/recipes.js';
import { TIMED } from '../packs/BP/scripts/logic/processes.js';

/** @typedef {import('../packs/BP/scripts/logic/restaurant.js').Direction} Direction */
/** @type {Direction[]} */
const FACINGS = ['north', 'east', 'south', 'west'];
const { blocks, width, depth, height } = RESTAURANT;
const STATIONS = ['grill', 'cutting_board', 'counter', 'oven', 'pot', 'spit', 'wok', 'dishwasher', 'dish_cabinet'];
const CABINETS = ['fridge', 'pantry'];
const CRATES = ['crate_tools', 'crate_all'];

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
  for (const kind of kinds) assert.equal(ofId(kind).length, 1, kind);
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
