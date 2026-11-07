import { DISHES } from './recipes.js';
import { stepsFor } from './processes.js';
import { plateName } from './catalog.js';

/** @typedef {import('@minecraft/server').RawMessage} RawMessage */
/** @typedef {{ label: RawMessage, icon: string }} BookButton */

const PREFIX = 'kochmod:';
const BOOK_ICON = 'textures/items/recipe_book';
/** @type {BookButton} */
const BACK = { label: { translate: 'kochmod.book.back' }, icon: BOOK_ICON };

/** @param {string} id namespaced item id @returns {RawMessage} */
const itemName = (id) => ({ translate: `item.${id}` });
/** @param {string} station station id without namespace @returns {RawMessage} */
const stationName = (station) => ({ translate: `tile.${PREFIX}${station}.name` });

/**
 * The dish list: one button per dish.
 * @returns {{ title: RawMessage, buttons: (BookButton & { dish: string })[] }}
 */
export function bookIndex() {
  return {
    title: { translate: 'kochmod.book.title' },
    buttons: DISHES.map((dish) => ({ label: itemName(dish), icon: `textures/items/${plateName(dish)}`, dish })),
  };
}

/**
 * The steps of one dish, one button each, plus a back button. Identical preparation steps appear once.
 * @param {string} dishId
 * @returns {{ title: RawMessage, buttons: BookButton[] }}
 */
export function bookPages(dishId) {
  const seen = new Set();
  const steps = stepsFor(dishId).filter((s) => {
    const key = `${s.item}|${s.station}|${s.result ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  /** @type {BookButton[]} */
  const buttons = steps.map((s, i) => ({
    label: {
      rawtext: [
        { text: `${i + 1}. ` }, itemName(s.item), { text: ' ➜ ' }, stationName(s.station),
        ...(s.tool ? [{ text: ' (' }, itemName(s.tool), { text: ')' }] : []),
      ],
    },
    icon: `textures/items/${s.item.replace(PREFIX, '')}`,
  }));
  return { title: itemName(dishId), buttons: [...buttons, BACK] };
}
