import { BlockPermutation, world } from '@minecraft/server';
import {
  INITIAL,
  grillInteract, grillTick, grillView, grillDrops,
  boardInteract, boardView, boardDrops,
  counterInteract, counterView, counterDrops,
} from '../logic/stations.js';
import { locKey, parseLocKey } from '../logic/store.js';
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
 * One custom component per station kind; `kind` is also the registry name.
 * @template S
 * @param {string} kind
 * @param {StationDef<S>} def
 * @returns {BlockCustomComponent}
 */
function stationComponent(kind, def) {
  return {
    onPlace({ block }) {
      const key = keyOf(block);
      worldStore.registryAdd(kind, key);
      worldStore.save(key, def.initial);
    },
    onPlayerInteract({ block, player }) {
      if (!player) return;
      const key = keyOf(block);
      /** @type {S} */
      const state = worldStore.load(key) ?? def.initial;
      const result = def.interact(state, heldItemId(player));
      worldStore.save(key, result.state);
      worldStore.registryAdd(kind, key);
      setStates(block, def.typeId, def.states(result.state));
      applyResult(result, player, block);
    },
    onPlayerBreak({ block, dimension }) {
      const key = locKey(dimension.id, block.location);
      /** @type {S} */
      const state = worldStore.load(key) ?? def.initial;
      dropItems(dimension, block.center(), def.drops(state));
      worldStore.remove(key);
      worldStore.registryRemove(kind, key);
    },
  };
}

/** @param {BlockComponentRegistry} blockComponentRegistry */
export function registerStations(blockComponentRegistry) {
  blockComponentRegistry.registerCustomComponent('kochmod:grill', stationComponent('grill', grill));
  blockComponentRegistry.registerCustomComponent('kochmod:cutting_board', stationComponent('cutting_board', cuttingBoard));
  blockComponentRegistry.registerCustomComponent('kochmod:counter', stationComponent('counter', counter));
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
  for (const key of worldStore.registryList('grill')) {
    const block = loadedBlock(key);
    if (!block) continue;
    if (block.typeId !== GRILL_ID) {
      worldStore.remove(key);
      worldStore.registryRemove('grill', key);
      continue;
    }
    /** @type {import('../logic/stations.js').GrillState | undefined} */
    const state = worldStore.load(key);
    if (!state) continue;
    const next = grillTick(state, dt);
    if (next.ticks === state.ticks) continue;
    worldStore.save(key, next);
    if (grillView(next) !== grillView(state)) setStates(block, GRILL_ID, grillStates(next));
  }
}
