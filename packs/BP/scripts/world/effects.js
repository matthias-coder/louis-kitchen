import { ItemStack, world } from '@minecraft/server';
import { createStore, parseLocKey } from '../logic/store.js';
import { giveOrDrop } from '../logic/give.js';
import { hasItem, removeOne } from '../logic/inventory.js';

export { giveOrDrop };

/** @typedef {import('@minecraft/server').Player} Player */
/** @typedef {import('@minecraft/server').Block} Block */
/** @typedef {import('@minecraft/server').Dimension} Dimension */
/** @typedef {import('@minecraft/server').Vector3} Vector3 */

/** Station state and registries, stored in world dynamic properties (belongs to the world, not a player). */
export const worldStore = createStore({
  get(key) {
    const value = world.getDynamicProperty(key);
    return typeof value === 'string' ? value : undefined;
  },
  set(key, value) {
    world.setDynamicProperty(key, value);
  },
});

/**
 * Loaded block at a registry key, or undefined while its chunk is not loaded.
 * @param {string} key
 * @returns {Block | undefined}
 */
export function loadedBlock(key) {
  const { dimensionId, x, y, z } = parseLocKey(key);
  try {
    return world.getDimension(dimensionId).getBlock({ x, y, z });
  } catch {
    return undefined; // LocationInUnloadedChunkError / out of bounds
  }
}

/** @param {Player} player */
function inventory(player) {
  return player.getComponent('minecraft:inventory')?.container;
}

/**
 * Item id in the player's selected hotbar slot, or null for an empty hand.
 * @param {Player} player
 * @returns {string | null}
 */
export function heldItemId(player) {
  return inventory(player)?.getItem(player.selectedSlotIndex)?.typeId ?? null;
}

/**
 * Whether the player carries the item in any inventory slot.
 * @param {Player} player
 * @param {string} itemId
 * @returns {boolean}
 */
export function playerHasItem(player, itemId) {
  const container = inventory(player);
  return container ? hasItem(container, itemId) : false;
}

/**
 * Removes exactly one of the item from the player's inventory (any slot).
 * @param {Player} player
 * @param {string} itemId
 * @returns {boolean} whether one was removed
 */
export function removeOneItem(player, itemId) {
  const container = inventory(player);
  return container ? removeOne(container, itemId) : false;
}

/** @param {Player} player */
function consumeHeld(player) {
  const container = inventory(player);
  if (!container) return;
  const slot = container.getSlot(player.selectedSlotIndex);
  const item = slot.getItem();
  if (!item) return;
  if (item.amount > 1) slot.amount = item.amount - 1;
  else slot.setItem(undefined);
}

/**
 * Gives `count` of an item as one stack; whatever does not fit drops at the player's feet.
 * @param {Player} player
 * @param {string} itemId
 * @param {number} count
 */
function give(player, itemId, count) {
  const stack = new ItemStack(itemId, count);
  const drop = (/** @type {ItemStack} */ s) => { player.dimension.spawnItem(s, player.location); };
  const container = inventory(player);
  if (container) giveOrDrop(container, stack, drop);
  else drop(stack);
}

/**
 * Spawns one item entity per id at a location. An unknown id is skipped with a warning; the rest still drops.
 * @param {Dimension} dimension
 * @param {Vector3} location
 * @param {string[]} itemIds
 */
export function dropItems(dimension, location, itemIds) {
  for (const id of itemIds) {
    try {
      dimension.spawnItem(new ItemStack(id, 1), location);
    } catch (error) {
      console.warn(`kochmod: cannot drop ${id}: ${error}`);
    }
  }
}

/**
 * Applies the side effects of a reducer result (the new state is saved by the caller).
 * @param {import('../logic/stations.js').Result<unknown>} result
 * @param {Player} player
 * @param {Block} block
 */
export function applyResult(result, player, block) {
  if (result.take) consumeHeld(player);
  if (result.give) give(player, result.give, result.count ?? 1);
  if (result.hint) player.onScreenDisplay.setActionBar({ translate: result.hint });
  if (result.sound) block.dimension.playSound(result.sound, block.center());
  if (result.particle) {
    const { x, y, z } = block.center();
    try {
      block.dimension.spawnParticle(result.particle, { x, y: y + 0.6, z });
    } catch (e) {
      console.warn(`kochmod: particle ${result.particle} failed: ${e}`); // decoration only, never blocks the action
    }
  }
}
