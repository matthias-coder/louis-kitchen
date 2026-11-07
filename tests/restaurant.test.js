import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RADIUS, SPAWN_MIN, SPAWN_MAX, DIRECTIONS,
  withinRadius, offset, seatDirection, availableDishes, pickWish,
  spawnDelay, rate, seatStillValid, tableInteract, tableView,
} from '../packs/BP/scripts/logic/restaurant.js';

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
  assert.deepEqual(rate(HAM, HAM, () => 0), { happy: true, emeralds: 1 });
  assert.deepEqual(rate(HAM, HAM, () => 0.999), { happy: true, emeralds: 3 });
  assert.deepEqual(rate(HAM, CHEESE, () => 0.5), { happy: false, emeralds: 0 });
  assert.deepEqual(rate(HAM, FAILED, () => 0.5), { happy: false, emeralds: 0 });
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
