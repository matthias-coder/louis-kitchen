import { system } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { bookIndex, bookPages } from '../logic/recipe-book.js';
import { BUSY_RETRY_TICKS, shouldRetryBusy } from '../logic/crates.js';

/** @typedef {import('@minecraft/server').Player} Player */
/** @typedef {import('@minecraft/server').ItemComponentRegistry} ItemComponentRegistry */
/** @typedef {import('../logic/recipe-book.js').BookButton} BookButton */

/**
 * Shows one form of the book; resolves to the chosen button index, or undefined when closed.
 * A busy player gets the form again a few times. Never throws.
 * @param {Player} player
 * @param {import('@minecraft/server').RawMessage} title
 * @param {BookButton[]} buttons
 * @param {number} retriesDone
 * @returns {Promise<number | undefined>}
 */
async function ask(player, title, buttons, retriesDone) {
  try {
    const form = new ActionFormData().title(title);
    for (const b of buttons) form.button(b.label, b.icon);
    const response = await form.show(player);
    if (response.canceled) {
      if (shouldRetryBusy(response.cancelationReason, retriesDone)) {
        await new Promise((resolve) => { system.runTimeout(() => resolve(undefined), BUSY_RETRY_TICKS); });
        return ask(player, title, buttons, retriesDone + 1);
      }
      return undefined;
    }
    return response.selection;
  } catch (error) {
    console.warn(`kochmod recipe book: form failed: ${error}`);
    return undefined;
  }
}

/** Index -> dish page -> back to the index, until the player closes a form. @param {Player} player */
async function openBook(player) {
  for (;;) {
    const index = bookIndex();
    const picked = await ask(player, index.title, index.buttons, 0);
    const dish = picked === undefined ? undefined : index.buttons[picked]?.dish;
    if (!dish) return;
    const page = bookPages(dish);
    const step = await ask(player, page.title, page.buttons, 0);
    // only the last button ("back") returns to the list; closing the page ends the book
    if (step !== page.buttons.length - 1) return;
  }
}

/** @param {ItemComponentRegistry} itemComponentRegistry */
export function registerRecipeBook(itemComponentRegistry) {
  itemComponentRegistry.registerCustomComponent('kochmod:recipe_book', {
    onUse({ source }) {
      // forms cannot be shown from inside the event callback
      system.run(() => { void openBook(source); });
    },
  });
}
