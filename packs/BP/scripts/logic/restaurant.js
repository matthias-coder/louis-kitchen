import { RECIPES, FAILED } from './recipes.js';

/** @typedef {{ x: number, y: number, z: number }} Loc */
/** @typedef {'north' | 'east' | 'south' | 'west'} Direction */
/** @typedef {{ plate: 'none' | 'hamburger' | 'cheeseburger' | 'failed_dish' | 'empty' }} TableState */
/**
 * serve: dish id handed to the waiting guest. consumePlate: remove one clean plate from the player's inventory.
 * @typedef {import('./stations.js').Result<TableState> & { serve?: string, consumePlate?: boolean }} TableResult
 */

export const RADIUS = 16;
export const SPAWN_MIN = 400;
export const SPAWN_MAX = 800;
export const WALK_TIMEOUT = 300;
export const EAT_TICKS = 60;
export const LEAVE_TICKS = 40;

/** @type {Direction[]} */
export const DIRECTIONS = ['north', 'east', 'south', 'west'];

const PREFIX = 'kochmod:';
export const CLEAN_PLATE = 'kochmod:clean_plate';
export const DIRTY_PLATE = 'kochmod:dirty_plate';
const DISH_IDS = [...RECIPES.map((r) => r.dish), FAILED];

/**
 * @param {Loc} a
 * @param {Loc} b
 * @returns {boolean}
 */
export function withinRadius(a, b) {
  return Math.abs(a.x - b.x) <= RADIUS && Math.abs(a.y - b.y) <= RADIUS && Math.abs(a.z - b.z) <= RADIUS;
}

/**
 * @param {Loc} loc
 * @param {Direction} dir
 * @returns {Loc}
 */
export function offset(loc, dir) {
  switch (dir) {
    case 'north': return { x: loc.x, y: loc.y, z: loc.z - 1 };
    case 'south': return { x: loc.x, y: loc.y, z: loc.z + 1 };
    case 'east': return { x: loc.x + 1, y: loc.y, z: loc.z };
    default: return { x: loc.x - 1, y: loc.y, z: loc.z };
  }
}

/**
 * @param {Loc} chair
 * @param {(loc: Loc) => boolean} isTableAt
 * @returns {Direction | null}
 */
export function seatDirection(chair, isTableAt) {
  return DIRECTIONS.find((d) => isTableAt(offset(chair, d))) ?? null;
}

/**
 * @param {Set<string>} kinds
 * @returns {string[]}
 */
export function availableDishes(kinds) {
  return RECIPES.filter((r) => r.stations.every((s) => kinds.has(s))).map((r) => r.dish);
}

/**
 * @param {string[]} dishes
 * @param {() => number} rnd
 * @returns {string | null}
 */
export function pickWish(dishes, rnd) {
  if (dishes.length === 0) return null;
  return dishes[Math.min(Math.floor(rnd() * dishes.length), dishes.length - 1)];
}

/**
 * @param {() => number} rnd
 * @returns {number}
 */
export function spawnDelay(rnd) {
  return Math.min(SPAWN_MIN + Math.floor(rnd() * (SPAWN_MAX - SPAWN_MIN + 1)), SPAWN_MAX);
}

/**
 * @param {string} wish
 * @param {string} served
 * @param {() => number} rnd
 * @returns {{ happy: boolean, emeralds: number }}
 */
export function rate(wish, served, rnd) {
  if (served === FAILED || served !== wish) return { happy: false, emeralds: 0 };
  return { happy: true, emeralds: 1 + Math.floor(rnd() * 3) };
}

/**
 * @param {{ bellExists: boolean, chairExists: boolean, tableExists: boolean }} s
 * @returns {boolean}
 */
export function seatStillValid(s) {
  return s.bellExists && s.chairExists && s.tableExists;
}

/**
 * Serving needs a clean plate in the player's inventory; an empty plate left on the
 * table comes back as a dirty plate.
 * @param {TableState} state
 * @param {string | null} held
 * @param {boolean} guestWaiting
 * @param {boolean} hasPlate the player carries a clean plate (any slot)
 * @returns {TableResult}
 */
export function tableInteract(state, held, guestWaiting, hasPlate) {
  const isDish = held !== null && DISH_IDS.includes(held);
  if (state.plate === 'empty' && !(isDish && guestWaiting)) return { state: { plate: 'none' }, give: DIRTY_PLATE };
  if (state.plate === 'none' || state.plate === 'empty') {
    if (!isDish) return { state };
    if (!guestWaiting) return { state, hint: 'kochmod.hint.no_guest' };
    if (!hasPlate) return { state, hint: 'kochmod.hint.need_plate' };
    return {
      state: { plate: /** @type {TableState['plate']} */ (/** @type {string} */ (held).slice(PREFIX.length)) },
      take: true,
      serve: /** @type {string} */ (held),
      sound: 'kochmod.plate',
      consumePlate: true,
      ...(state.plate === 'empty' ? { give: DIRTY_PLATE } : {}),
    };
  }
  if (isDish) return { state, hint: 'kochmod.hint.table_busy' };
  return { state };
}
