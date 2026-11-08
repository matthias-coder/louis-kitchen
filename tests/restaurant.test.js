import { RECIPES } from '../packs/BP/scripts/logic/recipes.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RADIUS, SPAWN_MIN, SPAWN_MAX, DIRECTIONS,
  withinRadius, offset, seatDirection, availableDishes, pickWish, offeredCuisines, CUISINES,
  spawnDelay, rate, seatStillValid, tableInteract, tableView,
  servedIn, leftover, EMPTY_BOWL, DIRTY_PLATE,
} from '../packs/BP/scripts/logic/restaurant.js';

import { DIRTY_BOWL } from '../packs/BP/scripts/logic/catalog.js';

const k = (name) => `kochmod:${name}`;
const HAM = 'kochmod:hamburger';
const CHEESE = 'kochmod:cheeseburger';
const FAILED = 'kochmod:failed_dish';
const O = { x: 0, y: 0, z: 0 };

test('constants', () => {
  assert.equal(RADIUS, 16);
  assert.equal(SPAWN_MIN, 400);
  assert.equal(SPAWN_MAX, 800);
  assert.deepEqual(DIRECTIONS, ['north', 'east', 'south', 'west']);
});

test('withinRadius: 16 true, 17 false on each axis', () => {
  assert.equal(withinRadius(O, { x: 16, y: 0, z: 0 }), true);
  assert.equal(withinRadius(O, { x: 0, y: -16, z: 16 }), true);
  assert.equal(withinRadius(O, { x: 17, y: 0, z: 0 }), false);
  assert.equal(withinRadius(O, { x: 0, y: 17, z: 0 }), false);
  assert.equal(withinRadius(O, { x: 0, y: 0, z: -17 }), false);
});

test('offset moves one block in the direction', () => {
  const l = { x: 5, y: 6, z: 7 };
  assert.deepEqual(offset(l, 'north'), { x: 5, y: 6, z: 6 });
  assert.deepEqual(offset(l, 'south'), { x: 5, y: 6, z: 8 });
  assert.deepEqual(offset(l, 'east'), { x: 6, y: 6, z: 7 });
  assert.deepEqual(offset(l, 'west'), { x: 4, y: 6, z: 7 });
});

test('seatDirection: east table, first in order, none', () => {
  const at = (/** @type {{x:number,y:number,z:number}[]} */ ...tables) => (/** @type {{x:number,y:number,z:number}} */ l) =>
    tables.some((t) => t.x === l.x && t.y === l.y && t.z === l.z);
  assert.equal(seatDirection(O, at({ x: 1, y: 0, z: 0 })), 'east');
  assert.equal(seatDirection(O, at({ x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 1 })), 'north');
  assert.equal(seatDirection(O, at()), null);
});

test('availableDishes', () => {
  assert.deepEqual(availableDishes(new Set(['grill', 'cutting_board', 'counter'])), [HAM, CHEESE]);
  assert.deepEqual(availableDishes(new Set(['cutting_board', 'counter'])), []);
});

test('availableDishes: pizzas need the oven (and the counter)', () => {
  const PIZZAS = ['kochmod:pizza_margherita', 'kochmod:salami_pizza'];
  assert.deepEqual(availableDishes(new Set(['counter', 'oven'])), PIZZAS);
  assert.deepEqual(availableDishes(new Set(['grill', 'cutting_board', 'counter', 'oven'])), [HAM, CHEESE, ...PIZZAS]);
  assert.deepEqual(availableDishes(new Set(['oven'])), []);
});

test('availableDishes: ramen needs only the pot, potato soup also the cutting board', () => {
  assert.deepEqual(availableDishes(new Set(['pot'])), []);
  assert.deepEqual(availableDishes(new Set(['pot', 'wok'])), ['kochmod:ramen']);
  assert.deepEqual(availableDishes(new Set(['pot', 'cutting_board'])), ['kochmod:potato_soup']);
});

test('availableDishes: with every station all dishes, and each recipe needs exactly its derived stations', () => {
  const all = new Set(RECIPES.flatMap((r) => r.stations));
  assert.deepEqual(availableDishes(all), RECIPES.map((r) => r.dish));
  for (const r of RECIPES) {
    const signature = Object.values(CUISINES).filter((c) => c.dishes.includes(r.dish)).map((c) => c.station);
    assert.ok(availableDishes(new Set([...r.stations, ...signature])).includes(r.dish), r.dish);
    for (const missing of r.stations) {
      const rest = new Set([...r.stations, ...signature].filter((s) => s !== missing));
      assert.ok(!availableDishes(rest).includes(r.dish), `${r.dish} without ${missing}`);
    }
  }
});

test('pickWish', () => {
  assert.equal(pickWish([], () => 0), null);
  assert.equal(pickWish([HAM, CHEESE], () => 0), HAM);
  assert.equal(pickWish([HAM, CHEESE], () => 0.999), CHEESE);
});

test('spawnDelay', () => {
  assert.equal(spawnDelay(() => 0), 400);
  assert.equal(spawnDelay(() => 0.9999999), 800);
  for (const r of [0, 0.1, 0.33, 0.5, 0.77, 0.999]) {
    assert.ok(Number.isInteger(spawnDelay(() => r)));
  }
});

test('rate', () => {
  assert.deepEqual(rate(HAM, HAM, new Set(['burger']), () => 0), { happy: true, emeralds: 1 });
  assert.deepEqual(rate(HAM, HAM, new Set(['burger']), () => 0.999), { happy: true, emeralds: 3 });
  assert.deepEqual(rate(HAM, CHEESE, new Set(['burger']), () => 0.5), { happy: true, emeralds: 1 });
  assert.deepEqual(rate(HAM, k('sushi'), new Set(['burger']), () => 0.5), { happy: false, emeralds: 0 });
  assert.deepEqual(rate(HAM, CHEESE, new Set(), () => 0.5), { happy: false, emeralds: 0 });
  assert.deepEqual(rate(HAM, FAILED, new Set(['burger']), () => 0.5), { happy: false, emeralds: 0 });
});

test('seatStillValid only when all three exist', () => {
  assert.equal(seatStillValid({ bellExists: true, chairExists: true, tableExists: true }), true);
  assert.equal(seatStillValid({ bellExists: false, chairExists: true, tableExists: true }), false);
  assert.equal(seatStillValid({ bellExists: true, chairExists: false, tableExists: true }), false);
  assert.equal(seatStillValid({ bellExists: true, chairExists: true, tableExists: false }), false);
});

const DIRTY = 'kochmod:dirty_plate';

test('tableInteract: serve a dish to a waiting guest with a clean plate', () => {
  const state = { plate: /** @type {const} */ ('none') };
  assert.deepEqual(tableInteract(state, CHEESE, true, true), {
    state: { plate: 'cheeseburger' }, take: true, serve: CHEESE, sound: 'kochmod.plate', consumePlate: true,
  });
  assert.deepEqual(tableInteract(state, FAILED, true, true).state, { plate: 'failed_dish' });
});

test('tableInteract: no clean plate gives a hint and takes nothing', () => {
  for (const plate of /** @type {const} */ (['none', 'empty'])) {
    const state = { plate };
    assert.deepEqual(tableInteract(state, HAM, true, false), { state, hint: 'kochmod.hint.need_plate' });
  }
});

test('tableInteract: dish without guest gives hint', () => {
  const state = { plate: /** @type {const} */ ('none') };
  assert.deepEqual(tableInteract(state, HAM, false, true), { state, hint: 'kochmod.hint.no_guest' });
  assert.deepEqual(tableInteract(state, HAM, false, false), { state, hint: 'kochmod.hint.no_guest' });
});

test('tableInteract: non-dish on empty table does nothing', () => {
  const state = { plate: /** @type {const} */ ('none') };
  assert.deepEqual(tableInteract(state, 'kochmod:bun', true, true), { state });
  assert.deepEqual(tableInteract(state, null, true, true), { state });
});

test('tableInteract: any other tap on an empty plate hands out a dirty plate', () => {
  const state = { plate: /** @type {const} */ ('empty') };
  for (const held of [null, 'kochmod:bun', 'kochmod:clean_plate']) {
    for (const hasPlate of [true, false]) {
      assert.deepEqual(tableInteract(state, held, true, hasPlate), { state: { plate: 'none' }, give: DIRTY });
    }
  }
  assert.deepEqual(tableInteract(state, HAM, false, true), { state: { plate: 'none' }, give: DIRTY });
});

test('tableInteract: a dish on an empty plate with a waiting guest is served and the dirty plate comes back', () => {
  const state = { plate: /** @type {const} */ ('empty') };
  assert.deepEqual(tableInteract(state, HAM, true, true), {
    state: { plate: 'hamburger' }, take: true, serve: HAM, sound: 'kochmod.plate', consumePlate: true, give: DIRTY,
  });
});

test('tableInteract: busy table with another dish gives hint', () => {
  const state = { plate: /** @type {const} */ ('hamburger') };
  assert.deepEqual(tableInteract(state, CHEESE, false, true), { state, hint: 'kochmod.hint.table_busy' });
  assert.deepEqual(tableInteract(state, CHEESE, true, true), { state, hint: 'kochmod.hint.table_busy' });
});

test('tableInteract: busy table with non-dish does nothing', () => {
  const state = { plate: /** @type {const} */ ('hamburger') };
  assert.deepEqual(tableInteract(state, 'kochmod:bun', false, true), { state });
  assert.deepEqual(tableInteract(state, null, false, false), { state });
});

test('tableView: any served dish shows as food, the failed dish as failed', () => {
  assert.equal(tableView('hamburger'), 'food');
  assert.equal(tableView('cheeseburger'), 'food');
  assert.equal(tableView('failed_dish'), 'failed');
  assert.equal(tableView('empty'), 'empty');
  assert.equal(tableView('none'), 'none');
  assert.equal(tableView('no_such_dish'), 'none', 'unknown stored values show no plate');
});

test('availableDishes: doner needs spit, cutting board and counter; sushi cutting board and counter; fried noodles the wok', () => {
  assert.deepEqual(availableDishes(new Set(['spit', 'cutting_board', 'counter'])), ['kochmod:doner']);
  assert.deepEqual(availableDishes(new Set(['spit', 'counter'])), []);
  assert.deepEqual(availableDishes(new Set(['wok', 'cutting_board', 'counter'])), ['kochmod:sushi', 'kochmod:fried_noodles']);
  assert.deepEqual(availableDishes(new Set(['wok', 'cutting_board'])), ['kochmod:fried_noodles']);
  assert.deepEqual(availableDishes(new Set(['wok'])), []);
});

test('servedIn / leftover: soups come in the bowl, everything else on the plate', () => {
  assert.equal(servedIn(k('ramen')), 'bowl');
  assert.equal(servedIn(k('potato_soup')), 'bowl');
  assert.equal(servedIn(k('hamburger')), 'plate');
  assert.equal(leftover(k('ramen')), EMPTY_BOWL);
  assert.equal(leftover(k('hamburger')), 'empty');
  assert.equal(tableView(EMPTY_BOWL), 'empty');
});

test('tableInteract: a soup is served without a plate; the empty bowl comes back dirty', () => {
  assert.deepEqual(tableInteract({ plate: 'none' }, k('ramen'), true, false), { state: { plate: 'ramen' }, take: true, serve: k('ramen'), sound: 'kochmod.plate', consumePlate: false });
  assert.deepEqual(tableInteract({ plate: EMPTY_BOWL }, null, false, false), { state: { plate: 'none' }, give: DIRTY_BOWL });
  assert.deepEqual(tableInteract({ plate: 'empty' }, null, false, false), { state: { plate: 'none' }, give: DIRTY_PLATE });
});

test('offeredCuisines follows the signature stations', () => {
  assert.deepEqual([...offeredCuisines(new Set(['grill', 'cutting_board', 'counter']))], ['burger']);
  assert.deepEqual([...offeredCuisines(new Set(['oven', 'pot', 'cutting_board', 'counter']))], ['italian', 'classic']);
  assert.deepEqual([...offeredCuisines(new Set(['cutting_board', 'counter']))], []);
});

test('availableDishes: cookable and of an offered cuisine (sushi needs the wok nearby to be wished)', () => {
  assert.deepEqual(availableDishes(new Set(['grill', 'cutting_board', 'counter'])), [HAM, CHEESE]);
  assert.deepEqual(availableDishes(new Set(['pot', 'wok', 'cutting_board', 'counter'])), [k('sushi'), k('ramen'), k('potato_soup'), k('fried_noodles')]);
});
