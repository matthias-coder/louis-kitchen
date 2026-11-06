export const FAILED = 'kochmod:failed_dish';

/** @typedef {{ dish: string, parts: string[], stations: string[] }} Recipe */

const STATIONS = ['grill', 'cutting_board', 'counter'];
const BASE = ['kochmod:bun', 'kochmod:cooked_patty', 'kochmod:lettuce', 'kochmod:tomato_slices'];

/** @type {Recipe[]} */
export const RECIPES = [
  { dish: 'kochmod:hamburger', parts: BASE, stations: STATIONS },
  { dish: 'kochmod:cheeseburger', parts: [...BASE, 'kochmod:cheese'], stations: STATIONS },
];

/**
 * @param {string[]} a
 * @param {string[]} b
 */
function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  const x = [...a].sort();
  const y = [...b].sort();
  return x.every((v, i) => v === y[i]);
}

/**
 * @param {string[]} itemIds
 * @returns {string} dish id on exact multiset match, else FAILED
 */
export function evaluateAssembly(itemIds) {
  const match = RECIPES.find((r) => sameMultiset(r.parts, itemIds));
  return match ? match.dish : FAILED;
}
