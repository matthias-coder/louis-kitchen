import { ItemStack, system } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { CRATES, BUSY_RETRY_TICKS, shouldRetryBusy } from '../logic/crates.js';
import { giveOrDrop } from '../logic/give.js';

/** @typedef {import('@minecraft/server').Player} Player */
/** @typedef {import('@minecraft/server').BlockComponentRegistry} BlockComponentRegistry */

/** @param {Player} player */
function failedHint(player) {
  try {
    player.onScreenDisplay.setActionBar({ translate: 'kochmod.hint.crate_failed' });
  } catch (error) {
    console.warn(`kochmod crate: hint failed: ${error}`);
  }
}

/**
 * Gives the chosen entry; on any failure logs it and tells the player.
 * @param {Player} player
 * @param {import('../logic/crates.js').CrateEntry} entry
 */
function handOut(player, entry) {
  try {
    const container = player.getComponent('minecraft:inventory')?.container;
    const stack = new ItemStack(entry.item, entry.count);
    const drop = (/** @type {ItemStack} */ s) => { player.dimension.spawnItem(s, player.location); };
    if (container) giveOrDrop(container, stack, drop);
    else drop(stack);
  } catch (error) {
    console.warn(`kochmod crate: giving ${entry.item} failed: ${error}`);
    failedHint(player);
  }
}

/**
 * Opens the picture menu of a crate and gives the chosen entry; never throws.
 * A busy player (chat or another screen open) gets the menu again a few times.
 * @param {Player} player
 * @param {import('../logic/crates.js').CrateDef} crate
 * @param {number} retriesDone
 * @returns {Promise<void>}
 */
async function openCrate(player, crate, retriesDone) {
  /** @type {import('@minecraft/server-ui').ActionFormResponse} */
  let response;
  try {
    const form = new ActionFormData().title({ translate: crate.title });
    for (const { item } of crate.entries) {
      const id = item.replace('kochmod:', '');
      form.button({ translate: `item.${item}` }, `textures/items/${id}`);
    }
    response = await form.show(player);
  } catch (error) {
    // player left, malformed response or shutdown: nothing to retry
    console.warn(`kochmod crate: form failed: ${error}`);
    return;
  }
  if (response.canceled) {
    if (shouldRetryBusy(response.cancelationReason, retriesDone)) {
      system.runTimeout(() => { void openCrate(player, crate, retriesDone + 1); }, BUSY_RETRY_TICKS);
    } else if (response.cancelationReason === 'UserBusy') {
      failedHint(player);
    }
    return;
  }
  const entry = response.selection === undefined ? undefined : crate.entries[response.selection];
  if (entry) handOut(player, entry);
}

/** @param {BlockComponentRegistry} blockComponentRegistry */
export function registerCrates(blockComponentRegistry) {
  blockComponentRegistry.registerCustomComponent('kochmod:crate', {
    onPlayerInteract({ block, player }) {
      if (!player) return;
      const crate = CRATES[block.typeId.replace('kochmod:', '')];
      if (!crate) return;
      // Forms cannot be shown from inside the (read-only) event callback.
      system.run(() => { void openCrate(player, crate, 0); });
    },
  });
}
