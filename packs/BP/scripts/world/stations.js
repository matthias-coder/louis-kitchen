import { BlockPermutation, system } from '@minecraft/server';
import {
  INITIAL,
  grillInteract, grillView, grillDrops,
  boardInteract, boardView, boardDrops,
  counterInteract, counterView, counterDrops,
  dishwasherInteract, dishwasherView, dishwasherDrops,
  cabinetInteract, cabinetView, cabinetDrops,
} from '../logic/stations.js';
import { locKey } from '../logic/store.js';
import { interactStation, breakStation, tickGrills, tickDishwashers } from '../logic/station-flow.js';
import { worldStore, applyResult, heldItemId, dropItems, loadedBlock } from './effects.js';

/** @typedef {import('@minecraft/server').Block} Block */
/** @typedef {import('@minecraft/server').BlockComponentRegistry} BlockComponentRegistry */
/** @typedef {import('@minecraft/server').BlockCustomComponent} BlockCustomComponent */
/** @typedef {Record<string, string | boolean | number>} BlockStates */

/**
 * @template S
 * @typedef {{
 *   typeId: string,
 *   initial: S,
 *   interact: (state: S, held: string | null) => import('../logic/stations.js').Result<S>,
 *   states: (state: S) => BlockStates,
 *   drops: (state: S) => string[],
 *   syncOnPlace?: boolean,
 * }} StationDef syncOnPlace: set the block states from `initial` right after placing
 * (for stations whose initial view differs from the block's default states)
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

const DISHWASHER_ID = 'kochmod:dishwasher';

/** @param {import('../logic/stations.js').DishwasherState} s @returns {BlockStates} */
const dishwasherStates = (s) => ({ 'kochmod:state': dishwasherView(s) });

/** @type {StationDef<import('../logic/stations.js').DishwasherState>} */
const dishwasher = {
  typeId: DISHWASHER_ID,
  initial: INITIAL.dishwasher,
  interact: dishwasherInteract,
  states: dishwasherStates,
  drops: dishwasherDrops,
};

/** @type {StationDef<import('../logic/stations.js').CabinetState>} */
const dishCabinet = {
  typeId: 'kochmod:dish_cabinet',
  initial: INITIAL.cabinet,
  interact: cabinetInteract,
  states: (s) => ({ 'kochmod:plates': cabinetView(s) }),
  drops: cabinetDrops,
  syncOnPlace: true,
};

/** @param {Block} block */
const keyOf = (block) => locKey(block.dimension.id, block.location);

/**
 * Sets the given block states; all other states (e.g. the facing direction) are kept.
 * @param {Block} block @param {string} typeId @param {BlockStates} states
 */
function setStates(block, typeId, states) {
  block.setPermutation(BlockPermutation.resolve(typeId, { ...block.permutation.getAllStates(), ...states }));
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
 * Sets the block states from the stored state one tick later, after the placement has finished.
 * @template S
 * @param {StationDef<S>} def
 * @param {import('@minecraft/server').Dimension} dimension
 * @param {import('@minecraft/server').Vector3} location
 * @param {string} key
 */
function syncViewLater(def, dimension, location, key) {
  system.run(() => {
    try {
      const block = dimension.getBlock(location);
      if (block?.typeId !== def.typeId) return;
      /** @type {S} */
      const state = worldStore.load(key) ?? def.initial;
      setStates(block, def.typeId, def.states(state));
    } catch (e) {
      console.warn(`kochmod: showing ${def.typeId} failed: ${e}`);
    }
  });
}

/**
 * Registers a freshly placed station with its initial state (what onPlace does).
 * @template S
 * @param {string} kind
 * @param {StationDef<S>} def
 * @param {Block} block
 */
function registerAs(kind, def, block) {
  const key = keyOf(block);
  worldStore.registryAdd(kind, key);
  worldStore.save(key, def.initial);
  if (def.syncOnPlace) syncViewLater(def, block.dimension, block.location, key);
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
      registerAs(kind, def, block);
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
  [dishwasher.typeId]: ['dishwasher', dishwasher],
  [dishCabinet.typeId]: ['dish_cabinet', dishCabinet],
};

/**
 * Registers a station placed by script (scripted placement may not fire onPlace).
 * Same effect as the station's onPlace; other blocks are ignored.
 * @param {Block} block
 * @returns {boolean} whether the block is a station
 */
export function registerStationBlock(block) {
  const entry = BY_TYPE[block.typeId];
  if (!entry) return false;
  registerAs(entry[0], entry[1], block);
  return true;
}

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
 * World io for the tick loop of one station kind.
 * @template S, V
 * @param {string} kind registry name
 * @param {string} typeId
 * @param {(view: V) => BlockStates} statesOf
 * @returns {import('../logic/station-flow.js').TickIo<S, V>}
 */
function tickIo(kind, typeId, statesOf) {
  return {
    blockTypeAt: (key) => loadedBlock(key)?.typeId,
    load: (key) => worldStore.load(key),
    save: (key, state) => worldStore.save(key, state),
    forget: (key) => {
      worldStore.remove(key);
      worldStore.registryRemove(kind, key);
    },
    setView: (key, view) => {
      const block = loadedBlock(key);
      if (block) setStates(block, typeId, statesOf(view));
    },
    warn: (message) => console.warn(message),
  };
}

/**
 * Advances every loaded grill and dishwasher by `dt` ticks. Stations in unloaded chunks pause.
 * @param {number} dt
 */
export function tickStations(dt) {
  tickGrills(worldStore.registryList('grill'), dt, tickIo('grill', GRILL_ID, (view) => ({ 'kochmod:content': view })), GRILL_ID);
  tickDishwashers(
    worldStore.registryList('dishwasher'), dt,
    tickIo('dishwasher', DISHWASHER_ID, (view) => ({ 'kochmod:state': view })), DISHWASHER_ID,
  );
}
