import { BlockPermutation, system } from '@minecraft/server';
import { CLEAN_PLATE, DIRECTIONS, offset, seatDirection, spawnDelay, tableInteract } from '../logic/restaurant.js';
import { BELL, CHAIR, TABLE } from '../logic/guest-flow.js';
import { locKey } from '../logic/store.js';
import { interactStation } from '../logic/station-flow.js';
import { worldStore, applyResult, heldItemId, playerHasItem, removeOneItem } from './effects.js';
import { bellAvailability, forgetBell, hasWaitingGuest, onTableServed, setPlate } from './guests.js';

/** @typedef {import('@minecraft/server').Block} Block */
/** @typedef {import('@minecraft/server').Dimension} Dimension */
/** @typedef {import('@minecraft/server').Vector3} Vector3 */
/** @typedef {import('@minecraft/server').BlockComponentRegistry} BlockComponentRegistry */
/** @typedef {import('@minecraft/server').BlockCustomComponent} BlockCustomComponent */
/** @typedef {import('../logic/restaurant.js').TableState} TableState */

const BELL_SOUND = 'note.bell';
const BELL_HINTS = {
  ok: 'kochmod.hint.bell_guest_coming',
  no_seat: 'kochmod.hint.bell_no_seat',
  no_kitchen: 'kochmod.hint.bell_no_kitchen',
};

/** @param {Dimension} dimension @param {Vector3} loc */
const keyAt = (dimension, loc) => locKey(dimension.id, loc);

/** @param {Dimension} dimension @param {Vector3} loc @returns {string | undefined} */
function typeAt(dimension, loc) {
  try {
    return dimension.getBlock(loc)?.typeId;
  } catch {
    return undefined; // unloaded
  }
}

/**
 * Turns the chair at `loc` towards an adjacent table; unchanged when there is none.
 * Runs one tick later, so it sees the world after a place/break has finished.
 * @param {Dimension} dimension
 * @param {Vector3} loc
 */
function orientChairLater(dimension, loc) {
  system.run(() => {
    try {
      const block = dimension.getBlock(loc);
      if (block?.typeId !== CHAIR) return;
      const dir = seatDirection(loc, (l) => typeAt(dimension, l) === TABLE);
      if (dir === null) return;
      block.setPermutation(BlockPermutation.resolve(CHAIR, { 'minecraft:cardinal_direction': dir }));
    } catch (e) {
      console.warn(`kochmod: turning chair failed: ${e}`);
    }
  });
}

/** Re-orients every chair next to a table location. @param {Dimension} dimension @param {Vector3} loc */
function orientChairsAround(dimension, loc) {
  for (const dir of DIRECTIONS) orientChairLater(dimension, offset(loc, dir));
}

/** @param {Dimension} dimension @param {Vector3} loc */
function forgetTable(dimension, loc) {
  const key = keyAt(dimension, loc);
  worldStore.remove(key);
  worldStore.registryRemove('table', key);
  orientChairsAround(dimension, loc);
}

/** @param {Dimension} dimension @param {Vector3} loc */
function forgetChair(dimension, loc) {
  const key = keyAt(dimension, loc);
  worldStore.remove(key);
  worldStore.registryRemove('chair', key);
}

/** A new table starts without a plate and turns the chairs around it. @param {Dimension} dimension @param {Vector3} loc */
function registerTable(dimension, loc) {
  const key = keyAt(dimension, loc);
  worldStore.registryAdd('table', key);
  worldStore.save(key, /** @type {TableState} */ ({ plate: 'none' }));
  orientChairsAround(dimension, loc);
}

/** A new chair turns towards an adjacent table. @param {Dimension} dimension @param {Vector3} loc */
function registerChair(dimension, loc) {
  worldStore.registryAdd('chair', keyAt(dimension, loc));
  orientChairLater(dimension, loc);
}

/** A new bell calls its first guest after the spawn delay. @param {Dimension} dimension @param {Vector3} loc */
function registerBell(dimension, loc) {
  const key = keyAt(dimension, loc);
  worldStore.registryAdd('bell', key);
  worldStore.save(key, { guestId: null, cooldown: spawnDelay(Math.random) });
}

/**
 * Registers furniture placed by script (scripted placement may not fire onPlace).
 * Same effect as the block's onPlace; other blocks are ignored.
 * @param {Block} block
 * @returns {boolean} whether the block is a table, chair or bell
 */
export function registerFurnitureBlock(block) {
  switch (block.typeId) {
    case TABLE: registerTable(block.dimension, block.location); return true;
    case CHAIR: registerChair(block.dimension, block.location); return true;
    case BELL: registerBell(block.dimension, block.location); return true;
    default: return false;
  }
}

/** @type {BlockCustomComponent} */
const tableComponent = {
  onPlace({ block, dimension, previousBlock }) {
    if (previousBlock.type.id === TABLE) return; // own permutation change
    registerTable(dimension, block.location);
  },
  onPlayerInteract({ block, dimension, player }) {
    if (!player) return;
    const key = keyAt(dimension, block.location);
    /** @type {TableState} */
    const state = worldStore.load(key) ?? { plate: 'none' };
    const waiting = hasWaitingGuest(key);
    const hasPlate = playerHasItem(player, CLEAN_PLATE);
    /** @type {string | undefined} */
    let serve;
    let consumePlate = false;
    interactStation((s, held) => {
      const result = tableInteract(s, held, waiting, hasPlate);
      serve = result.serve;
      consumePlate = result.consumePlate === true;
      return result;
    }, (s) => s.plate, state, heldItemId(player), {
      setView: (plate) => { if (plate !== state.plate) setPlate(key, plate); },
      save: (next) => {
        worldStore.save(key, next);
        worldStore.registryAdd('table', key);
      },
      apply: (result) => {
        applyResult(result, player, block);
        // the dish goes onto one clean plate from the inventory
        if (consumePlate) removeOneItem(player, CLEAN_PLATE);
      },
    });
    if (serve) onTableServed(key, serve);
  },
  onPlayerBreak({ block, dimension }) {
    forgetTable(dimension, block.location);
  },
};

/** @type {BlockCustomComponent} */
const chairComponent = {
  onPlace({ block, dimension, previousBlock }) {
    if (previousBlock.type.id === CHAIR) return; // own permutation change (turning)
    registerChair(dimension, block.location);
  },
  onPlayerBreak({ block, dimension }) {
    forgetChair(dimension, block.location);
  },
};

/** @type {BlockCustomComponent} */
const bellComponent = {
  onPlace({ block, dimension, previousBlock }) {
    if (previousBlock.type.id === BELL) return;
    registerBell(dimension, block.location);
  },
  onPlayerInteract({ block, dimension, player }) {
    dimension.playSound(BELL_SOUND, block.center());
    const key = keyAt(dimension, block.location);
    /** @type {import('../logic/guest-flow.js').BellState | undefined} */
    const state = worldStore.load(key);
    if (state?.guestId) return;
    const hint = BELL_HINTS[bellAvailability(key)];
    try {
      player?.onScreenDisplay.setActionBar({ translate: hint });
    } catch (error) {
      console.warn(`kochmod bell: hint failed: ${error}`);
    }
    // ringing calls the next guest right away
    worldStore.save(key, { guestId: null, cooldown: 0 });
    worldStore.registryAdd('bell', key);
  },
  onPlayerBreak({ block, dimension }) {
    forgetBell(keyAt(dimension, block.location));
  },
};

/** @param {BlockComponentRegistry} blockComponentRegistry */
export function registerFurniture(blockComponentRegistry) {
  blockComponentRegistry.registerCustomComponent('kochmod:table', tableComponent);
  blockComponentRegistry.registerCustomComponent('kochmod:chair', chairComponent);
  blockComponentRegistry.registerCustomComponent('kochmod:bell', bellComponent);
}

/**
 * Exploded furniture is forgotten like a player break (a dish on a table is not dropped).
 * @param {import('@minecraft/server').BlockExplodeAfterEvent} event
 */
export function onFurnitureExploded({ block, dimension, explodedBlockPermutation }) {
  switch (explodedBlockPermutation.type.id) {
    case TABLE: forgetTable(dimension, block.location); break;
    case CHAIR: forgetChair(dimension, block.location); break;
    case BELL: forgetBell(keyAt(dimension, block.location)); break;
    default: break;
  }
}
