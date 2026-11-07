import { DISHES } from './recipes.js';
import { stepsFor } from './processes.js';
import { ITEMS, plateName } from './catalog.js';

/** @typedef {import('@minecraft/server').RawMessage} RawMessage */
/** @typedef {{ label: RawMessage, icon: string }} BookButton */
/** @typedef {import('./processes.js').Step} Step */

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

/** @param {string} id @returns {boolean} */
const isIngredient = (id) => Object.hasOwn(ITEMS, id) && ITEMS[id].kind === 'ingredient';

/**
 * The picture sequence of one dish: walks the recipe parts in order; an ingredient becomes
 * "<Zutat> ➜ <Kühlschrank|Vorratsschrank>", a prepared part first its own inputs, then its process step.
 * Each ingredient and each step appears once; the final step comes last.
 * @param {string} dishId
 * @returns {{ item: string, station: string, tool?: string }[]}
 */
function sequence(dishId) {
  const steps = stepsFor(dishId);
  /** @type {Map<string, Step>} output item -> the step that makes it */
  const makes = new Map(steps.map((s) => [s.result ?? s.item, s]));
  /** @type {{ item: string, station: string, tool?: string }[]} */
  const out = [];
  const seen = new Set();
  /** @param {string} key @param {{ item: string, station: string, tool?: string }} entry */
  const emit = (key, entry) => {
    if (seen.has(key)) return;
    seen.add(key);
    out.push(entry);
  };
  /** @param {string} item */
  const walk = (item) => {
    if (isIngredient(item)) {
      const source = ITEMS[item].source;
      if (source) emit(`fetch|${item}`, { item, station: source });
      return;
    }
    const step = makes.get(item);
    if (!step) return;
    for (const input of step.parts ?? [step.item]) walk(input);
    emit(`${step.item}|${step.station}|${step.result ?? ''}`, step);
  };
  walk(dishId);
  return out;
}

/**
 * The steps of one dish, one button each, plus a back button: every ingredient with the crate it comes
 * from, then the station step that uses it; the final step last.
 * @param {string} dishId
 * @returns {{ title: RawMessage, buttons: BookButton[] }}
 */
export function bookPages(dishId) {
  /** @type {BookButton[]} */
  const buttons = sequence(dishId).map((s, i) => ({
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
