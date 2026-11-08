/**
 * Every item of the add-on. Recipes, crates and station rules are derived from this table, so a new dish
 * only needs rows here (and in processes.js), not hand-written lists elsewhere.
 * @typedef {'ingredient' | 'prepared' | 'tool' | 'dish' | 'plate' | 'misc'} ItemKind
 * @typedef {'fridge' | 'pantry' | 'tools'} CrateSource
 * @typedef {{ kind: ItemKind, source?: CrateSource, stack: number, menu?: boolean }} ItemDef
 */

const PREFIX = 'kochmod:';

/** The one kitchen tool that replaces knife, spatula, pizza peel and wok spatula. */
export const MULTITOOL = 'kochmod:multitool';

/** Dishes for the pot dishes and pizza; taken from the cupboard, not the crates. */
export const SOUP_BOWL = 'kochmod:soup_bowl';
export const DIRTY_BOWL = 'kochmod:dirty_bowl';
export const PIZZA_BOX = 'kochmod:pizza_box';

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
  'kochmod:salami': { kind: 'ingredient', source: 'fridge', stack: 64 },
  'kochmod:egg': { kind: 'ingredient', source: 'fridge', stack: 64 },
  'kochmod:salmon': { kind: 'ingredient', source: 'fridge', stack: 64 },
  'kochmod:cream': { kind: 'ingredient', source: 'fridge', stack: 64 },
  'kochmod:potato': { kind: 'ingredient', source: 'pantry', stack: 64 },
  'kochmod:onion': { kind: 'ingredient', source: 'pantry', stack: 64 },
  'kochmod:carrot': { kind: 'ingredient', source: 'pantry', stack: 64 },
  'kochmod:spring_onion': { kind: 'ingredient', source: 'fridge', stack: 64 },
  'kochmod:doner_meat_raw': { kind: 'ingredient', source: 'fridge', stack: 64 },
  'kochmod:dough': { kind: 'ingredient', source: 'fridge', stack: 64 },
  'kochmod:doner_sauce': { kind: 'ingredient', source: 'fridge', stack: 64 },
  'kochmod:tomato_sauce': { kind: 'ingredient', source: 'pantry', stack: 64 },
  'kochmod:noodles': { kind: 'ingredient', source: 'pantry', stack: 64 },
  'kochmod:cooked_rice': { kind: 'ingredient', source: 'pantry', stack: 64 },
  // raw rice is only the legacy pot input (old worlds); the crates hand out cooked rice
  'kochmod:rice': { kind: 'ingredient', stack: 64, menu: false },
  'kochmod:broth': { kind: 'ingredient', source: 'pantry', stack: 64 },
  'kochmod:nori': { kind: 'ingredient', source: 'pantry', stack: 64 },
  'kochmod:pita': { kind: 'ingredient', source: 'pantry', stack: 64 },
  'kochmod:soy_sauce': { kind: 'ingredient', source: 'pantry', stack: 64 },
  'kochmod:cooked_patty': { kind: 'prepared', stack: 64 },
  'kochmod:burnt_patty': { kind: 'prepared', stack: 64 },
  'kochmod:tomato_slices': { kind: 'prepared', stack: 64 },
  'kochmod:onion_rings': { kind: 'prepared', stack: 64 },
  'kochmod:carrot_slices': { kind: 'prepared', stack: 64 },
  'kochmod:potato_cubes': { kind: 'prepared', stack: 64 },
  'kochmod:salmon_strips': { kind: 'prepared', stack: 64 },
  'kochmod:doner_meat': { kind: 'prepared', stack: 64 },
  'kochmod:raw_pizza_margherita': { kind: 'prepared', stack: 64 },
  'kochmod:raw_salami_pizza': { kind: 'prepared', stack: 64 },
  'kochmod:burnt_pizza': { kind: 'prepared', stack: 64 },
  'kochmod:multitool': { kind: 'tool', source: 'tools', stack: 1 },
  'kochmod:knife': { kind: 'tool', stack: 1, menu: false },
  'kochmod:spatula': { kind: 'tool', stack: 1, menu: false },
  'kochmod:bowl': { kind: 'tool', stack: 1, menu: false },
  'kochmod:pizza_peel': { kind: 'tool', stack: 1, menu: false },
  'kochmod:wok_spatula': { kind: 'tool', stack: 1, menu: false },
  'kochmod:recipe_book': { kind: 'tool', source: 'tools', stack: 1 },
  'kochmod:hamburger': { kind: 'dish', stack: 64 },
  'kochmod:cheeseburger': { kind: 'dish', stack: 64 },
  'kochmod:failed_dish': { kind: 'dish', stack: 64 },
  'kochmod:pizza_margherita': { kind: 'dish', stack: 64 },
  'kochmod:salami_pizza': { kind: 'dish', stack: 64 },
  'kochmod:ramen': { kind: 'dish', stack: 64 },
  'kochmod:potato_soup': { kind: 'dish', stack: 64 },
  'kochmod:doner': { kind: 'dish', stack: 64 },
  'kochmod:sushi': { kind: 'dish', stack: 64 },
  'kochmod:fried_noodles': { kind: 'dish', stack: 64 },
  'kochmod:clean_plate': { kind: 'plate', source: 'tools', stack: 64 },
  'kochmod:dirty_plate': { kind: 'plate', stack: 64, menu: false },
  'kochmod:soup_bowl': { kind: 'plate', stack: 64 },
  'kochmod:dirty_bowl': { kind: 'plate', stack: 64, menu: false },
  'kochmod:pizza_box': { kind: 'plate', stack: 64 },
  // stage 1 Baukasten: hidden alias of kit_classic so old worlds keep working
  'kochmod:restaurant_kit': { kind: 'misc', stack: 1, menu: false },
  'kochmod:kit_burger': { kind: 'misc', stack: 1 },
  'kochmod:kit_italian': { kind: 'misc', stack: 1 },
  'kochmod:kit_japanese': { kind: 'misc', stack: 1 },
  'kochmod:kit_doner': { kind: 'misc', stack: 1 },
  'kochmod:kit_classic': { kind: 'misc', stack: 1 },
  'kochmod:kit_mega': { kind: 'misc', stack: 1 },
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
