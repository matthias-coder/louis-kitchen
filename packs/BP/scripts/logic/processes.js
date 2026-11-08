import { ITEMS, MULTITOOL, SOUP_BOWL } from './catalog.js';

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
 * @type {Record<string, { accepts: Record<string, { cooked: string, burnt: string }>, tools: string[], tool: string, hintTool: string, hintFull: string, sound: string }>}
 */
export const TIMED = {
  grill: {
    accepts: { 'kochmod:raw_patty': { cooked: 'kochmod:cooked_patty', burnt: 'kochmod:burnt_patty' } },
    tools: [MULTITOOL, 'kochmod:spatula'],
    tool: MULTITOOL,
    hintTool: 'kochmod.hint.need_multitool',
    hintFull: 'kochmod.hint.grill_full',
    sound: 'kochmod.sizzle',
  },
  oven: {
    accepts: {
      'kochmod:raw_pizza_margherita': { cooked: 'kochmod:pizza_margherita', burnt: 'kochmod:burnt_pizza' },
      'kochmod:raw_salami_pizza': { cooked: 'kochmod:salami_pizza', burnt: 'kochmod:burnt_pizza' },
    },
    tools: [MULTITOOL, 'kochmod:pizza_peel'],
    tool: MULTITOOL,
    hintTool: 'kochmod.hint.need_multitool',
    hintFull: 'kochmod.hint.oven_full',
    sound: 'kochmod.oven',
  },
};

/**
 * The doner spit roasts one cone of raw meat; the knife cuts the cooked meat off it.
 * @type {{ raw: string, cooked: string, tools: string[], tool: string, station: string }}
 */
export const SPIT = { raw: 'kochmod:doner_meat_raw', cooked: 'kochmod:doner_meat', tools: [MULTITOOL, 'kochmod:knife'], tool: MULTITOOL, station: 'spit' };

/** Tools that cut on the cutting board: the multitool, or the old knife. */
export const CUT_TOOLS = [MULTITOOL, 'kochmod:knife'];

const BASE = ['kochmod:bun', 'kochmod:cooked_patty', 'kochmod:lettuce', 'kochmod:tomato_slices'];

const PIZZA_BASE = ['kochmod:dough', 'kochmod:tomato_sauce', 'kochmod:cheese'];

/** @type {DishRecipe[]} counter recipes; a result need not be a dish (a raw pizza still goes into the oven) */
export const ASSEMBLY = [
  { dish: 'kochmod:hamburger', parts: BASE },
  { dish: 'kochmod:cheeseburger', parts: [...BASE, 'kochmod:cheese'] },
  { dish: 'kochmod:raw_pizza_margherita', parts: PIZZA_BASE },
  { dish: 'kochmod:raw_salami_pizza', parts: [...PIZZA_BASE, 'kochmod:salami'] },
  {
    dish: 'kochmod:doner',
    parts: ['kochmod:pita', 'kochmod:doner_meat', 'kochmod:lettuce', 'kochmod:tomato_slices', 'kochmod:onion_rings', 'kochmod:doner_sauce'],
  },
  { dish: 'kochmod:sushi', parts: ['kochmod:nori', 'kochmod:cooked_rice', 'kochmod:salmon_strips'] },
];
/** @type {DishRecipe[]} pot recipes; a result need not be a dish (cooked rice is a prepared item) */
export const POT = [
  { dish: 'kochmod:ramen', parts: ['kochmod:broth', 'kochmod:noodles', 'kochmod:egg', 'kochmod:spring_onion'] },
  { dish: 'kochmod:potato_soup', parts: ['kochmod:potato_cubes', 'kochmod:carrot_slices', 'kochmod:cream'] },
  { dish: 'kochmod:cooked_rice', parts: ['kochmod:rice'] },
];

/**
 * A station that cooks a mix of items by time and is emptied with a tool (pot, wok).
 * hints: lang keys for full, still cooking, empty hand on a filled station, tool on an empty station.
 * consumesTool: whether scooping uses up the tool (the pot's bowl becomes the dish container; the wok spatula stays).
 * @typedef {{ recipes: DishRecipe[], tools: string[], tool: string, consumesTool: boolean, max: number,
 *   hints: { full: string, cooking: string, needTool: string, empty: string }, sound: string }} PotDef
 */
/** @type {PotDef} */
export const POT_DEF = {
  recipes: POT,
  tools: [SOUP_BOWL, 'kochmod:bowl'],
  tool: SOUP_BOWL,
  consumesTool: true,
  max: 6,
  hints: { full: 'kochmod.hint.pot_full', cooking: 'kochmod.hint.pot_cooking', needTool: 'kochmod.hint.need_soup_bowl', empty: 'kochmod.hint.pot_empty' },
  sound: 'kochmod.bubble',
};
/** @type {DishRecipe[]} wok recipes */
export const WOK = [
  { dish: 'kochmod:fried_noodles', parts: ['kochmod:noodles', 'kochmod:egg', 'kochmod:carrot_slices', 'kochmod:spring_onion', 'kochmod:soy_sauce'] },
];
/** @type {PotDef} */
export const WOK_DEF = {
  recipes: WOK,
  tools: [MULTITOOL, 'kochmod:wok_spatula'],
  tool: MULTITOOL,
  consumesTool: false,
  max: 6,
  hints: { full: 'kochmod.hint.wok_full', cooking: 'kochmod.hint.pot_cooking', needTool: 'kochmod.hint.need_multitool', empty: 'kochmod.hint.pot_empty' },
  sound: 'kochmod.sizzle',
};

/** @type {[string, DishRecipe[], string?][]} assembling station -> its recipe list and the tool that empties it */
const FINAL_STATIONS = [['counter', ASSEMBLY], ['pot', POT, POT_DEF.tool], ['wok', WOK, WOK_DEF.tool]];

/** @type {DishRecipe[]} what timed stations make: cooked result <- the one raw item, in TIMED / accepts order */
export const TIMED_RECIPES = Object.values(TIMED).flatMap((def) => (
  Object.entries(def.accepts).map(([raw, out]) => ({ dish: out.cooked, parts: [raw] }))
));

/**
 * @param {string} item
 * @returns {Step | null} the cutting, roasting or cooking step that makes an item, or null
 */
function processStep(item) {
  for (const [raw, cut] of Object.entries(CUTTABLE)) {
    if (cut === item) return { item: raw, station: 'cutting_board', tool: MULTITOOL, result: cut };
  }
  if (item === SPIT.cooked) return { item: SPIT.raw, station: SPIT.station, tool: SPIT.tool, result: item };
  for (const [station, def] of Object.entries(TIMED)) {
    for (const [raw, out] of Object.entries(def.accepts)) {
      if (out.cooked === item) return { item: raw, station, tool: def.tool, result: item };
    }
  }
  return null;
}

/**
 * Steps that produce `item`, preparation of its inputs first: an assembly (counter, pot, wok) in part
 * order, or a cutting / cooking step. Ingredients and unknown ids need no steps.
 * @param {string} item
 * @returns {Step[]}
 */
function stepsToMake(item) {
  if (!Object.hasOwn(ITEMS, item) || ITEMS[item].kind === 'ingredient') return [];
  for (const [station, list, tool] of FINAL_STATIONS) {
    const recipe = list.find((r) => r.dish === item);
    if (recipe) return [...recipe.parts.flatMap(stepsToMake), { item, station, ...(tool ? { tool } : {}), parts: [...recipe.parts] }];
  }
  const step = processStep(item);
  return step ? [...stepsToMake(step.item), step] : [];
}

/**
 * @param {string} dishId
 * @returns {Step[]} preparation steps in part order, then the final step (assembly, the pot, the wok, or the oven for a pizza);
 * [] for unknown dishes
 */
export function stepsFor(dishId) {
  return ITEMS[dishId]?.kind === 'dish' ? stepsToMake(dishId) : [];
}

/**
 * @param {string} dishId
 * @returns {string[]} distinct stations of the dish's steps, in order of first appearance
 */
export function stationsFor(dishId) {
  return [...new Set(stepsFor(dishId).map((s) => s.station))];
}
