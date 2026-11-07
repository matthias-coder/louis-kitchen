import { BlockPermutation, GameMode, Player, system } from '@minecraft/server';
import {
  RESTAURANT, rotateLayout, placementOrigin, facingFromView, clearanceOffsets, isReplaceable, hasSpace,
} from '../logic/layout.js';
import { registerStationBlock } from './stations.js';
import { registerFurnitureBlock } from './furniture.js';
import { removeOneItem } from './effects.js';

/** @typedef {import('@minecraft/server').Block} Block */
/** @typedef {import('@minecraft/server').Dimension} Dimension */
/** @typedef {import('@minecraft/server').Vector3} Vector3 */
/** @typedef {import('@minecraft/server').ItemComponentRegistry} ItemComponentRegistry */
/** @typedef {import('../logic/layout.js').LayoutBlock} LayoutBlock */

const KIT_ID = 'kochmod:restaurant_kit';
const AIR = 'minecraft:air';
/** Block changes per tick while building (the job continues on the next tick). */
const BLOCKS_PER_TICK = 96;
const HINT = { built: 'kochmod.hint.kit_built', noSpace: 'kochmod.hint.kit_no_space' };

/** One restaurant at a time; a second tap while building is ignored. */
let building = false;

/** @param {Vector3} a @param {Vector3} b @returns {Vector3} */
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
/** @param {Vector3} p */
const posKey = (p) => `${p.x},${p.y},${p.z}`;

/** @param {Player} player @param {string} key */
function hint(player, key) {
  try {
    player.onScreenDisplay.setActionBar({ translate: key });
  } catch (error) {
    console.warn(`kochmod kit: hint failed: ${error}`);
  }
}

/** @param {Dimension} dimension @param {Vector3} loc @returns {Block | undefined} */
function blockAt(dimension, loc) {
  try {
    return dimension.getBlock(loc);
  } catch {
    return undefined; // unloaded or outside the world
  }
}

/**
 * Number of cells above the floor that are neither air nor replaceable (unloaded cells count as blocked).
 * @param {Dimension} dimension @param {Vector3} origin @param {Vector3[]} cells
 */
function countBlocked(dimension, origin, cells) {
  let blocked = 0;
  for (const c of cells) {
    const block = blockAt(dimension, add(origin, c));
    if (!block || !isReplaceable(block.typeId)) blocked++;
  }
  return blocked;
}

/**
 * Places one block and runs the registration its onPlace component would do.
 * @param {Dimension} dimension @param {Vector3} loc @param {string} id @param {LayoutBlock['states']} states
 * @returns {boolean} success
 */
function place(dimension, loc, id, states) {
  try {
    const block = dimension.getBlock(loc);
    if (!block) return false;
    block.setPermutation(BlockPermutation.resolve(id, states));
    // Scripted placement may not fire onPlace: register stations and furniture explicitly (idempotent).
    if (id.startsWith('kochmod:') && !registerStationBlock(block)) registerFurnitureBlock(block);
    return true;
  } catch (error) {
    console.warn(`kochmod kit: placing ${id} at ${posKey(loc)} failed: ${error}`);
    return false;
  }
}

/**
 * Clears the inside, then places the blocks in layout order (floor, walls, roof, furniture, stations, bell).
 * @param {Player} player @param {Dimension} dimension @param {Vector3} origin
 * @param {Vector3[]} cells clearance cells (offsets) @param {LayoutBlock[]} blocks rotated layout
 * @returns {Generator<void, void, void>}
 */
function* buildJob(player, dimension, origin, cells, blocks) {
  let failures = 0;
  let done = 0;
  try {
    const taken = new Set(blocks.map(posKey));
    for (const c of cells) {
      if (taken.has(posKey(c))) continue;
      const loc = add(origin, c);
      const block = blockAt(dimension, loc);
      if (block && block.typeId !== AIR && !place(dimension, loc, AIR, undefined)) failures++;
      if (++done % BLOCKS_PER_TICK === 0) yield;
    }
    for (const b of blocks) {
      if (!place(dimension, add(origin, b), b.id, b.states)) failures++;
      if (++done % BLOCKS_PER_TICK === 0) yield;
    }
    if (failures > 0) console.warn(`kochmod kit: ${failures} block(s) could not be placed`);
    if (player.isValid) hint(player, HINT.built);
  } finally {
    building = false;
  }
}

/**
 * Builds the restaurant in front of the player, its door facing them.
 * @param {Player} player @param {Block} tapped
 */
function buildFor(player, tapped) {
  if (building) return;
  const dimension = tapped.dimension;
  // tapping a flower or grass means the ground below it
  const ground = isReplaceable(tapped.typeId) ? tapped.below() ?? tapped : tapped;
  const facing = facingFromView(player.getViewDirection());
  const origin = placementOrigin(ground.location, facing);
  const cells = clearanceOffsets(RESTAURANT, facing);
  if (!hasSpace(countBlocked(dimension, origin, cells), cells.length)) {
    hint(player, HINT.noSpace);
    return;
  }
  if (player.getGameMode() !== GameMode.Creative) removeOneItem(player, KIT_ID);
  building = true;
  try {
    system.runJob(buildJob(player, dimension, origin, cells, rotateLayout(RESTAURANT, facing)));
  } catch (error) {
    building = false;
    console.warn(`kochmod kit: build failed: ${error}`);
  }
}

/** @param {ItemComponentRegistry} itemComponentRegistry */
export function registerKit(itemComponentRegistry) {
  itemComponentRegistry.registerCustomComponent(KIT_ID, {
    onUseOn({ source, block }) {
      if (!(source instanceof Player)) return;
      // build outside the event callback, which may not allow world changes
      system.run(() => {
        try {
          buildFor(source, block);
        } catch (error) {
          building = false;
          console.warn(`kochmod kit: ${error}`);
        }
      });
    },
  });
}
