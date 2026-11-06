import { ItemStack, system } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { CRATES } from '../logic/crates.js';
import { giveOrDrop } from '../logic/give.js';

/** @typedef {import('@minecraft/server').Player} Player */
/** @typedef {import('@minecraft/server').BlockComponentRegistry} BlockComponentRegistry */

/**
 * Opens the picture menu of a crate and gives the chosen entry; never throws.
 * @param {Player} player
 * @param {import('../logic/crates.js').CrateDef} crate
 */
async function openCrate(player, crate) {
  try {
    const form = new ActionFormData().title({ translate: crate.title });
    for (const { item } of crate.entries) {
      const id = item.replace('kochmod:', '');
      form.button({ translate: `item.${item}` }, `textures/items/${id}`);
    }
    const response = await form.show(player);
    if (response.canceled || response.selection === undefined) return;
    const entry = crate.entries[response.selection];
    if (!entry) return;
    const container = player.getComponent('minecraft:inventory')?.container;
    const stack = new ItemStack(entry.item, entry.count);
    const drop = (/** @type {ItemStack} */ s) => { player.dimension.spawnItem(s, player.location); };
    if (container) giveOrDrop(container, stack, drop);
    else drop(stack);
  } catch {
    // player left, form rejected or world not ready: the crate stays closed, nothing is lost
  }
}

/** @param {BlockComponentRegistry} blockComponentRegistry */
export function registerCrates(blockComponentRegistry) {
  blockComponentRegistry.registerCustomComponent('kochmod:crate', {
    onPlayerInteract({ block, player }) {
      if (!player) return;
      const crate = CRATES[block.typeId.replace('kochmod:', '')];
      if (!crate) return;
      // Forms cannot be shown from inside the (read-only) event callback.
      system.run(() => { void openCrate(player, crate); });
    },
  });
}
