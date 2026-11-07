/**
 * Every item of the add-on. Recipes, crates and station rules are derived from this table, so a new dish
 * only needs rows here (and in processes.js), not hand-written lists elsewhere.
 * @typedef {'ingredient' | 'prepared' | 'tool' | 'dish' | 'plate' | 'misc'} ItemKind
 * @typedef {'fridge' | 'pantry' | 'tools'} CrateSource
 * @typedef {{ kind: ItemKind, source?: CrateSource, stack: number, menu?: boolean }} ItemDef
 */

const PREFIX = 'kochmod:';

/**
 * Catalog order is the crate_all menu order. `menu: false` keeps an item out of crate_all.
 * @type {Record<string, ItemDef>} keyed by namespaced id
 */
export const ITEMS = {
  'kochmod:bun': { kind: 'ingredient', source: 'pantry', stack: 64 },
  'kochmod:tomato': { kind: 'ingredient', source: 'fridge', stack: 64 },
  'kochmod:lettuce': { kind: 'ingredient', source: 'fridge', stack: 64 },
  'kochmod:raw_patty': { kind: 'ingredient', source: 'fridge', stack: 64 },
  'kochmod:cheese': { kind: 'ingredient', source: 'fridge', stack: 64 },
  'kochmod:cooked_patty': { kind: 'prepared', stack: 64 },
  'kochmod:burnt_patty': { kind: 'prepared', stack: 64 },
  'kochmod:tomato_slices': { kind: 'prepared', stack: 64 },
  'kochmod:knife': { kind: 'tool', source: 'tools', stack: 1 },
  'kochmod:spatula': { kind: 'tool', source: 'tools', stack: 1 },
  'kochmod:hamburger': { kind: 'dish', stack: 64 },
  'kochmod:cheeseburger': { kind: 'dish', stack: 64 },
  'kochmod:failed_dish': { kind: 'dish', stack: 64 },
  'kochmod:clean_plate': { kind: 'plate', source: 'tools', stack: 64 },
  'kochmod:dirty_plate': { kind: 'plate', stack: 64, menu: false },
  'kochmod:restaurant_kit': { kind: 'misc', stack: 64 },
};

/**
 * @param {ItemKind} kind
 * @returns {string[]} ids of that kind, in catalog order
 */
export function itemsOf(kind) {
  return Object.keys(ITEMS).filter((id) => ITEMS[id].kind === kind);
}

/**
 * @param {CrateSource} source
 * @returns {string[]} ids supplied by that crate, in catalog order
 */
export function itemsFrom(source) {
  return Object.keys(ITEMS).filter((id) => ITEMS[id].source === source);
}

/**
 * @param {string | null | undefined} id
 * @returns {boolean} whether the id is a dish (including the failed dish)
 */
export function isDish(id) {
  return typeof id === 'string' && Object.hasOwn(ITEMS, id) && ITEMS[id].kind === 'dish';
}

/**
 * @param {string} dishId namespaced dish id
 * @returns {string} id without namespace, used as the plate state / guest wish value
 */
export function plateName(dishId) {
  return dishId.startsWith(PREFIX) ? dishId.slice(PREFIX.length) : dishId;
}
