import { ItemStack, world } from '@minecraft/server';
import { createStore, parseLocKey } from '../logic/store.js';
import { giveOrDrop } from '../logic/give.js';

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
 * Gives one item to the player; drops it at the player's feet if the inventory is full.
 * @param {Player} player
 * @param {string} itemId
 */
function give(player, itemId) {
  const stack = new ItemStack(itemId, 1);
  const drop = (/** @type {ItemStack} */ s) => { player.dimension.spawnItem(s, player.location); };
  const container = inventory(player);
  if (container) giveOrDrop(container, stack, drop);
  else drop(stack);
}

/**
 * Spawns one item entity per id at a location.
 * @param {Dimension} dimension
 * @param {Vector3} location
 * @param {string[]} itemIds
 */
export function dropItems(dimension, location, itemIds) {
  for (const id of itemIds) dimension.spawnItem(new ItemStack(id, 1), location);
}

/**
 * Applies the side effects of a reducer result (the new state is saved by the caller).
 * @param {import('../logic/stations.js').Result<unknown>} result
 * @param {Player} player
 * @param {Block} block
 */
export function applyResult(result, player, block) {
  if (result.take) consumeHeld(player);
  if (result.give) give(player, result.give);
  if (result.hint) player.onScreenDisplay.setActionBar({ translate: result.hint });
  if (result.sound) block.dimension.playSound(result.sound, block.center());
}
