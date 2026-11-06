import { BlockPermutation, system } from '@minecraft/server';
import { DIRECTIONS, offset, seatDirection, spawnDelay, tableInteract } from '../logic/restaurant.js';
import { BELL, CHAIR, TABLE } from '../logic/guest-flow.js';
import { locKey } from '../logic/store.js';
import { interactStation } from '../logic/station-flow.js';
import { worldStore, applyResult, heldItemId } from './effects.js';
import { forgetBell, hasWaitingGuest, onTableServed, setPlate } from './guests.js';

/** @typedef {import('@minecraft/server').Block} Block */
/** @typedef {import('@minecraft/server').Dimension} Dimension */
/** @typedef {import('@minecraft/server').Vector3} Vector3 */
/** @typedef {import('@minecraft/server').BlockComponentRegistry} BlockComponentRegistry */
/** @typedef {import('@minecraft/server').BlockCustomComponent} BlockCustomComponent */
/** @typedef {import('../logic/restaurant.js').TableState} TableState */

const BELL_SOUND = 'note.bell';

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

/** @type {BlockCustomComponent} */
const tableComponent = {
  onPlace({ block, dimension, previousBlock }) {
    if (previousBlock.type.id === TABLE) return; // own permutation change
    const key = keyAt(dimension, block.location);
    worldStore.registryAdd('table', key);
    worldStore.save(key, /** @type {TableState} */ ({ plate: 'none' }));
    orientChairsAround(dimension, block.location);
  },
  onPlayerInteract({ block, dimension, player }) {
    if (!player) return;
    const key = keyAt(dimension, block.location);
    /** @type {TableState} */
    const state = worldStore.load(key) ?? { plate: 'none' };
    const waiting = hasWaitingGuest(key);
    /** @type {string | undefined} */
    let serve;
    interactStation((s, held) => {
      const result = tableInteract(s, held, waiting);
      serve = result.serve;
      return result;
    }, (s) => s.plate, state, heldItemId(player), {
      setView: (plate) => { if (plate !== state.plate) setPlate(key, plate); },
      save: (next) => {
        worldStore.save(key, next);
        worldStore.registryAdd('table', key);
      },
      apply: (result) => applyResult(result, player, block),
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
    worldStore.registryAdd('chair', keyAt(dimension, block.location));
    orientChairLater(dimension, block.location);
  },
  onPlayerBreak({ block, dimension }) {
    forgetChair(dimension, block.location);
  },
};

/** @type {BlockCustomComponent} */
const bellComponent = {
  onPlace({ block, dimension, previousBlock }) {
    if (previousBlock.type.id === BELL) return;
    const key = keyAt(dimension, block.location);
    worldStore.registryAdd('bell', key);
    worldStore.save(key, { guestId: null, cooldown: spawnDelay(Math.random) });
  },
  onPlayerInteract({ block, dimension }) {
    dimension.playSound(BELL_SOUND, block.center());
    const key = keyAt(dimension, block.location);
    /** @type {import('../logic/guest-flow.js').BellState | undefined} */
    const state = worldStore.load(key);
    if (state?.guestId) return;
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
