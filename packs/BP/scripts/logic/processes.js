import { ITEMS } from './catalog.js';

/**
 * @typedef {{ item: string, station: string, tool?: string, result?: string, parts?: string[] }} Step
 * @typedef {{ dish: string, parts: string[] }} DishRecipe
 */

/**
 * Raw item -> what the cutting board makes of it.
 * @type {Record<string, string>}
 */
export const CUTTABLE = {
  'kochmod:tomato': 'kochmod:tomato_slices',
  'kochmod:onion': 'kochmod:onion_rings',
  'kochmod:carrot': 'kochmod:carrot_slices',
  'kochmod:potato': 'kochmod:potato_cubes',
  'kochmod:salmon': 'kochmod:salmon_strips',
};

/**
 * Stations that cook by time. `accepts`: raw item -> cooked / burnt result.
 * @type {Record<string, { accepts: Record<string, { cooked: string, burnt: string }>, tool: string, hintTool: string, hintFull: string, sound: string }>}
 */
export const TIMED = {
  grill: {
    accepts: { 'kochmod:raw_patty': { cooked: 'kochmod:cooked_patty', burnt: 'kochmod:burnt_patty' } },
    tool: 'kochmod:spatula',
    hintTool: 'kochmod.hint.need_spatula',
    hintFull: 'kochmod.hint.grill_full',
    sound: 'kochmod.sizzle',
  },
};

const BASE = ['kochmod:bun', 'kochmod:cooked_patty', 'kochmod:lettuce', 'kochmod:tomato_slices'];

/** @type {DishRecipe[]} counter recipes */
export const ASSEMBLY = [
  { dish: 'kochmod:hamburger', parts: BASE },
  { dish: 'kochmod:cheeseburger', parts: [...BASE, 'kochmod:cheese'] },
];
/** @type {DishRecipe[]} pot recipes (later tasks) */
export const POT = [];
/** @type {DishRecipe[]} wok recipes (later tasks) */
export const WOK = [];

/** @type {[string, DishRecipe[]][]} assembling station -> its recipe list */
const FINAL_STATIONS = [['counter', ASSEMBLY], ['pot', POT], ['wok', WOK]];

/**
 * @param {string} item
 * @returns {Step | null} the process step that makes a prepared item, or null
 */
function processStep(item) {
  for (const [raw, cut] of Object.entries(CUTTABLE)) {
    if (cut === item) return { item: raw, station: 'cutting_board', tool: 'kochmod:knife', result: cut };
  }
  for (const [station, def] of Object.entries(TIMED)) {
    for (const [raw, out] of Object.entries(def.accepts)) {
      if (out.cooked === item) return { item: raw, station, tool: def.tool, result: item };
    }
  }
  return null;
}

/**
 * Steps that produce `item`, preparation of its inputs first.
 * @param {string} item
 * @returns {Step[]}
 */
function stepsToMake(item) {
  if (ITEMS[item]?.kind !== 'prepared') return [];
  const step = processStep(item);
  return step ? [...stepsToMake(step.item), step] : [];
}

/**
 * @param {string} dishId
 * @returns {Step[]} preparation steps in part order, then one final step at the assembling station; [] for unknown dishes
 */
export function stepsFor(dishId) {
  for (const [station, list] of FINAL_STATIONS) {
    const recipe = list.find((r) => r.dish === dishId);
    if (!recipe) continue;
    return [...recipe.parts.flatMap(stepsToMake), { item: dishId, station, parts: [...recipe.parts] }];
  }
  return [];
}

/**
 * @param {string} dishId
 * @returns {string[]} distinct stations of the dish's steps, in order of first appearance
 */
export function stationsFor(dishId) {
  return [...new Set(stepsFor(dishId).map((s) => s.station))];
}
