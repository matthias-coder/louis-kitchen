import { BlockPermutation, world } from '@minecraft/server';
import {
  INITIAL,
  grillInteract, grillView, grillDrops,
  boardInteract, boardView, boardDrops,
  counterInteract, counterView, counterDrops,
} from '../logic/stations.js';
import { locKey, parseLocKey } from '../logic/store.js';
import { interactStation, breakStation, tickGrills } from '../logic/station-flow.js';
import { worldStore, applyResult, heldItemId, dropItems } from './effects.js';

/** @typedef {import('@minecraft/server').Block} Block */
/** @typedef {import('@minecraft/server').BlockComponentRegistry} BlockComponentRegistry */
/** @typedef {import('@minecraft/server').BlockCustomComponent} BlockCustomComponent */
/** @typedef {Record<string, string | boolean>} BlockStates */

/**
 * @template S
 * @typedef {{
 *   typeId: string,
 *   initial: S,
 *   interact: (state: S, held: string | null) => import('../logic/stations.js').Result<S>,
 *   states: (state: S) => BlockStates,
 *   drops: (state: S) => string[],
 * }} StationDef
 */

const GRILL_ID = 'kochmod:grill';

/** @param {import('../logic/stations.js').GrillState} s @returns {BlockStates} */
const grillStates = (s) => ({ 'kochmod:content': grillView(s) });

/** @type {StationDef<import('../logic/stations.js').GrillState>} */
const grill = { typeId: GRILL_ID, initial: INITIAL.grill, interact: grillInteract, states: grillStates, drops: grillDrops };

/** @type {StationDef<import('../logic/stations.js').BoardState>} */
const cuttingBoard = {
  typeId: 'kochmod:cutting_board',
  initial: INITIAL.board,
  interact: boardInteract,
  states: (s) => ({ 'kochmod:content': boardView(s) }),
  drops: boardDrops,
};

/** @type {StationDef<import('../logic/stations.js').CounterState>} */
const counter = {
  typeId: 'kochmod:counter',
  initial: INITIAL.counter,
  interact: counterInteract,
  states: (s) => {
    const v = counterView(s);
    return {
      'kochmod:bun': v.bun,
      'kochmod:patty': v.patty,
      'kochmod:lettuce': v.lettuce,
      'kochmod:tomato': v.tomato,
      'kochmod:cheese': v.cheese,
    };
  },
  drops: counterDrops,
};

/** @param {Block} block */
const keyOf = (block) => locKey(block.dimension.id, block.location);

/** @param {Block} block @param {string} typeId @param {BlockStates} states */
function setStates(block, typeId, states) {
  block.setPermutation(BlockPermutation.resolve(typeId, states));
}

/**
 * @template S
 * @param {string} kind registry name
 * @param {StationDef<S>} def
 * @param {import('@minecraft/server').Dimension} dimension
 * @param {Block} block
 */
function breakAt(kind, def, dimension, block) {
  const key = locKey(dimension.id, block.location);
  /** @type {S} */
  const state = worldStore.load(key) ?? def.initial;
  breakStation(def.drops, state, {
    drop: (ids) => dropItems(dimension, block.center(), ids),
    forget: () => {
      worldStore.remove(key);
      worldStore.registryRemove(kind, key);
    },
  });
}

/**
 * One custom component per station kind; `kind` is also the registry name.
 * @template S
 * @param {string} kind
 * @param {StationDef<S>} def
 * @returns {BlockCustomComponent}
 */
function stationComponent(kind, def) {
  return {
    onPlace({ block, previousBlock }) {
      // Guard: if onPlace also fired on our own permutation changes, it must not reset the state.
      if (previousBlock.type.id === def.typeId) return;
      const key = keyOf(block);
      worldStore.registryAdd(kind, key);
      worldStore.save(key, def.initial);
    },
    onPlayerInteract({ block, player }) {
      if (!player) return;
      const key = keyOf(block);
      /** @type {S} */
      const state = worldStore.load(key) ?? def.initial;
      interactStation(def.interact, def.states, state, heldItemId(player), {
        setView: (states) => setStates(block, def.typeId, states),
        save: (next) => {
          worldStore.save(key, next);
          worldStore.registryAdd(kind, key);
        },
        apply: (result) => applyResult(result, player, block),
      });
    },
    onPlayerBreak({ block, dimension }) {
      breakAt(kind, def, dimension, block);
    },
  };
}

/** @type {Record<string, [string, StationDef<any>]>} */
const BY_TYPE = {
  [grill.typeId]: ['grill', grill],
  [cuttingBoard.typeId]: ['cutting_board', cuttingBoard],
  [counter.typeId]: ['counter', counter],
};

/** @param {BlockComponentRegistry} blockComponentRegistry */
export function registerStations(blockComponentRegistry) {
  for (const [typeId, [kind, def]] of Object.entries(BY_TYPE)) {
    blockComponentRegistry.registerCustomComponent(typeId, stationComponent(kind, def));
  }
}

/**
 * Exploded stations drop their contents and are forgotten, like a player break.
 * @param {import('@minecraft/server').BlockExplodeAfterEvent} event
 */
export function onBlockExploded({ block, dimension, explodedBlockPermutation }) {
  const entry = BY_TYPE[explodedBlockPermutation.type.id];
  if (!entry) return;
  breakAt(entry[0], entry[1], dimension, block);
}

/**
 * Loaded block at a registry key, or undefined while its chunk is not loaded.
 * @param {string} key
 * @returns {Block | undefined}
 */
function loadedBlock(key) {
  const { dimensionId, x, y, z } = parseLocKey(key);
  try {
    return world.getDimension(dimensionId).getBlock({ x, y, z });
  } catch {
    return undefined; // LocationInUnloadedChunkError / out of bounds
  }
}

/**
 * Advances every loaded grill by `dt` ticks. Grills in unloaded chunks pause.
 * @param {number} dt
 */
export function tickStations(dt) {
  tickGrills(worldStore.registryList('grill'), dt, {
    blockTypeAt: (key) => loadedBlock(key)?.typeId,
    load: (key) => worldStore.load(key),
    save: (key, state) => worldStore.save(key, state),
    forget: (key) => {
      worldStore.remove(key);
      worldStore.registryRemove('grill', key);
    },
    setView: (key, view) => {
      const block = loadedBlock(key);
      if (block) setStates(block, GRILL_ID, { 'kochmod:content': view });
    },
    warn: (message) => console.warn(message),
  }, GRILL_ID);
}