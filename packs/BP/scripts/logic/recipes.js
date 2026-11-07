import { isDish } from './catalog.js';
import { ASSEMBLY, TIMED_RECIPES, POT, WOK, stationsFor } from './processes.js';

export const FAILED = 'kochmod:failed_dish';

/** @typedef {{ dish: string, parts: string[], stations: string[] }} Recipe */

/** @type {Recipe[]} every assembly / timed-station / pot / wok entry whose result is a real dish */
export const RECIPES = [...ASSEMBLY, ...TIMED_RECIPES, ...POT, ...WOK]
  .filter((r) => isDish(r.dish) && r.dish !== FAILED)
  .map((r) => ({ dish: r.dish, parts: r.parts, stations: stationsFor(r.dish) }));

/** Dish ids in recipe order (the failed dish is not one of them). */
export const DISHES = RECIPES.map((r) => r.dish);

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
 * @param {{ dish: string, parts: string[] }[]} list
 * @param {string[]} itemIds
 * @returns {string} dish id on exact multiset match, else FAILED
 */
export function evaluateFor(list, itemIds) {
  const match = list.find((r) => sameMultiset(r.parts, itemIds));
  return match ? match.dish : FAILED;
}

/**
 * @param {string[]} itemIds
 * @returns {string} dish id on exact multiset match, else FAILED
 */
export function evaluateAssembly(itemIds) {
  return evaluateFor(ASSEMBLY, itemIds);
}
