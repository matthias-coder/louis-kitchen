import { RECIPES, FAILED } from './recipes.js';
import { isDish, plateName, DIRTY_BOWL } from './catalog.js';
import { POT } from './processes.js';

/** @typedef {{ x: number, y: number, z: number }} Loc */
/** @typedef {'north' | 'east' | 'south' | 'west'} Direction */
/** plate: 'none', 'empty' (eaten, dirty plate left), 'empty_bowl' (soup eaten, dirty bowl left) or the plateName of the served dish. @typedef {{ plate: string }} TableState */
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

export const CLEAN_PLATE = 'kochmod:clean_plate';
export const DIRTY_PLATE = 'kochmod:dirty_plate';
/** Table state after a soup. */
export const EMPTY_BOWL = 'empty_bowl';

/**
 * Soups (the dishes of the pot) come in the soup bowl, everything else on a plate.
 * @param {string} dishId
 * @returns {'plate' | 'bowl'}
 */
export function servedIn(dishId) {
  return POT.some((r) => r.dish === dishId && isDish(r.dish)) ? 'bowl' : 'plate';
}

/**
 * Table state once the guest has eaten the dish.
 * @param {string} dishId
 * @returns {'empty' | 'empty_bowl'}
 */
export function leftover(dishId) {
  return servedIn(dishId) === 'bowl' ? EMPTY_BOWL : 'empty';
}

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

/** @typedef {'burger' | 'italian' | 'japanese' | 'doner' | 'classic'} Cuisine */

const dish = (/** @type {string} */ name) => `kochmod:${name}`;

/** Each cuisine has a signature device (`station`); a kitchen offers the cuisines whose device stands nearby. */
export const CUISINES = /** @type {Record<Cuisine, { station: string, dishes: string[] }>} */ ({
  burger: { station: 'grill', dishes: [dish('hamburger'), dish('cheeseburger'), dish('fries')] },
  italian: { station: 'oven', dishes: [dish('pizza_margherita'), dish('salami_pizza')] },
  japanese: { station: 'wok', dishes: [dish('sushi'), dish('ramen'), dish('fried_noodles')] },
  doner: { station: 'spit', dishes: [dish('doner'), dish('fries')] },
  classic: { station: 'pot', dishes: [dish('potato_soup')] },
});

/** Chance that a ring calls the takeaway guest (when none waits yet and the oven is near). */
export const TAKEAWAY_CHANCE = 1 / 3;
/** The only dishes a takeaway guest wants (served in a pizza box). */
export const PIZZA_DISHES = CUISINES.italian.dishes;

/**
 * @param {string} dishId
 * @returns {Cuisine[]}
 */
export function cuisinesOf(dishId) {
  return /** @type {Cuisine[]} */ (Object.keys(CUISINES)).filter((c) => CUISINES[c].dishes.includes(dishId));
}

/**
 * @param {Set<string>} kinds station kinds near the bell
 * @returns {Set<Cuisine>}
 */
export function offeredCuisines(kinds) {
  return new Set(/** @type {Cuisine[]} */ (Object.keys(CUISINES)).filter((c) => kinds.has(CUISINES[c].station)));
}

/**
 * Dishes the kitchen can cook and that belong to an offered cuisine.
 * @param {Set<string>} kinds
 * @returns {string[]}
 */
export function availableDishes(kinds) {
  const offered = offeredCuisines(kinds);
  return RECIPES
    .filter((r) => r.stations.every((s) => kinds.has(s)) && cuisinesOf(r.dish).some((c) => offered.has(c)))
    .map((r) => r.dish);
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
 * @param {Set<Cuisine>} offered cuisines the kitchen offers now
 * @param {() => number} rnd
 * @returns {{ happy: boolean, emeralds: number }}
 */
export function rate(wish, served, offered, rnd) {
  if (served === FAILED) return { happy: false, emeralds: 0 };
  if (served === wish) return { happy: true, emeralds: 1 + Math.floor(rnd() * 3) };
  if (cuisinesOf(served).some((c) => offered.has(c))) return { happy: true, emeralds: 1 };
  return { happy: false, emeralds: 0 };
}

/**
 * @param {{ bellExists: boolean, chairExists: boolean, tableExists: boolean }} s
 * @returns {boolean}
 */
export function seatStillValid(s) {
  return s.bellExists && s.chairExists && s.tableExists;
}

/**
 * What the table shows (block state `kochmod:plate`) for a stored plate value: every served dish
 * looks like the same plated meal, the failed dish like a grey heap. Unknown values show no plate.
 * @param {string} plate stored TableState plate
 * @returns {'none' | 'food' | 'failed' | 'empty'}
 */
export function tableView(plate) {
  if (plate === 'empty' || plate === EMPTY_BOWL) return 'empty';
  if (plate === plateName(FAILED)) return 'failed';
  return isDish(`kochmod:${plate}`) ? 'food' : 'none';
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
  const holdsDish = isDish(held);
  const dirty = state.plate === EMPTY_BOWL ? DIRTY_BOWL : DIRTY_PLATE;
  const eaten = state.plate === 'empty' || state.plate === EMPTY_BOWL;
  if (eaten && !(holdsDish && guestWaiting)) return { state: { plate: 'none' }, give: dirty };
  if (state.plate === 'none' || eaten) {
    if (!holdsDish) return { state };
    if (!guestWaiting) return { state, hint: 'kochmod.hint.no_guest' };
    const bowl = servedIn(/** @type {string} */ (held)) === 'bowl';
    if (!bowl && !hasPlate) return { state, hint: 'kochmod.hint.need_plate' };
    return {
      state: { plate: plateName(/** @type {string} */ (held)) },
      take: true,
      serve: /** @type {string} */ (held),
      sound: 'kochmod.plate',
      consumePlate: !bowl,
      ...(eaten ? { give: dirty } : {}),
    };
  }
  if (holdsDish) return { state, hint: 'kochmod.hint.table_busy' };
  return { state };
}
