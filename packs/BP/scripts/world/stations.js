import { BlockPermutation, system } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import {
  migrateStationState, grill as grillStation, oven as ovenStation, pot as potStation, wok as wokStation,
  spit as spitStation,
  boardInteract, boardView, boardDrops,
  counterInteract, counterView, counterDrops,
  dishwasherInteract, dishwasherView, dishwasherDrops,
  cabinetInteract, cabinetView, cabinetDrops, cabinetMenu, cabinetTake, CABINET_CHOICES, INITIAL,
  trash as trashStation,
} from '../logic/stations.js';
import { locKey } from '../logic/store.js';
import { BUSY_RETRY_TICKS, shouldRetryBusy } from '../logic/crates.js';
import { interactStation, breakStation, tickTimedStation, tickDishwashers } from '../logic/station-flow.js';
import { worldStore, applyResult, heldItemId, playerHasItem, dropItems, loadedBlock } from './effects.js';

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
 *   migrate: (saved: unknown) => S,
 *   syncOnPlace?: boolean,
 * }} StationDef migrate: turns a loaded saved state into the current shape (stage 1 states, garbage).
 * syncOnPlace: set the block states from `initial` right after placing
 * (for stations whose initial view differs from the block's default states)
 */

/** @typedef {import('../logic/stations.js').TimedState} TimedState */
/** @typedef {import('../logic/station-flow.js').CookingStation} CookingStation */

/**
 * A cooking station block (grill, oven): block state `kochmod:content` shows the view.
 * @param {'grill' | 'oven'} kind registry name and saved-state kind
 * @param {CookingStation} station
 * @returns {StationDef<TimedState>}
 */
const cookingDef = (kind, station) => ({
  typeId: `kochmod:${kind}`,
  initial: station.INITIAL,
  interact: station.interact,
  states: (s) => ({ 'kochmod:content': station.view(s) }),
  drops: station.drops,
  migrate: (saved) => migrateStationState(kind, saved),
});

const grill = cookingDef('grill', grillStation);
const oven = cookingDef('oven', ovenStation);

/** Cooking stations ticked by tickStations: registry kind, block def, rules. @type {[string, StationDef<TimedState>, CookingStation][]} */
const COOKING = [['grill', grill, grillStation], ['oven', oven, ovenStation]];

/** @typedef {import('../logic/stations.js').PotState} PotState */
/** @typedef {ReturnType<typeof import('../logic/stations.js').potStation>} PotStation */

/**
 * A pot station block (pot, wok): block state `kochmod:state` shows the view.
 * @param {'pot' | 'wok'} kind registry name and saved-state kind
 * @param {PotStation} station
 * @returns {StationDef<PotState>}
 */
const potDef = (kind, station) => ({
  typeId: `kochmod:${kind}`,
  initial: station.INITIAL,
  interact: station.interact,
  states: (s) => ({ 'kochmod:state': station.view(s) }),
  drops: station.drops,
  migrate: (saved) => migrateStationState(kind, saved),
});

const pot = potDef('pot', potStation);
const wok = potDef('wok', wokStation);

/** Pot stations ticked by tickStations: registry kind, block def, rules. @type {[string, StationDef<PotState>, PotStation][]} */
const POTS = [['pot', pot, potStation], ['wok', wok, wokStation]];

/** Doner spit: block state `kochmod:content` shows empty / raw / cooked. @type {StationDef<import('../logic/stations.js').SpitState>} */
const spit = {
  typeId: 'kochmod:spit',
  initial: spitStation.INITIAL,
  interact: spitStation.interact,
  states: (s) => ({ 'kochmod:content': spitStation.view(s) }),
  drops: spitStation.drops,
  migrate: (saved) => migrateStationState('spit', saved),
};

/** @type {StationDef<import('../logic/stations.js').BoardState>} */
const cuttingBoard = {
  typeId: 'kochmod:cutting_board',
  initial: INITIAL.board,
  interact: boardInteract,
  states: (s) => ({ 'kochmod:content': boardView(s) }),
  drops: boardDrops,
  migrate: (saved) => migrateStationState('board', saved),
};

/** @type {StationDef<import('../logic/stations.js').CounterState>} */
const counter = {
  typeId: 'kochmod:counter',
  initial: INITIAL.counter,
  interact: counterInteract,
  states: (s) => {
    const v = counterView(s);
    return { 'kochmod:family': v.family, 'kochmod:layers': v.layers };
  },
  drops: counterDrops,
  migrate: (saved) => migrateStationState('counter', saved),
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
  migrate: (saved) => migrateStationState('dishwasher', saved),
};

/** @type {StationDef<import('../logic/stations.js').CabinetState>} */
const dishCabinet = {
  typeId: 'kochmod:dish_cabinet',
  initial: INITIAL.cabinet,
  interact: cabinetInteract,
  states: (s) => ({ 'kochmod:plates': cabinetView(s) }),
  drops: cabinetDrops,
  migrate: (saved) => migrateStationState('cabinet', saved),
  syncOnPlace: true,
};

/**
 * Trash can: block state `kochmod:open` lifts the lid for a moment after each throw. It stores nothing,
 * so breaking it drops nothing.
 * @type {StationDef<import('../logic/stations.js').TrashState>}
 */
const trashCan = {
  typeId: 'kochmod:trash_can',
  initial: trashStation.INITIAL,
  interact: trashStation.interact,
  states: trashStation.view,
  drops: trashStation.drops,
  migrate: (saved) => migrateStationState('trash', saved),
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
 * Loads a station's saved state in the current shape. A state that had to be migrated
 * (e.g. a stage 1 grill) is saved back right away.
 * @template S
 * @param {StationDef<S>} def
 * @param {string} key
 * @returns {{ state: S | undefined, migrated: boolean }} state undefined: nothing saved yet
 */
function loadState(def, key) {
  const saved = worldStore.load(key);
  if (saved === undefined) return { state: undefined, migrated: false };
  const state = def.migrate(saved);
  if (state === saved) return { state, migrated: false };
  worldStore.save(key, state);
  return { state, migrated: true };
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
  const state = loadState(def, key).state ?? def.initial;
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
      const state = loadState(def, key).state ?? def.initial;
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
 * Loads the state, runs one interaction and applies it.
 * @template S
 * @param {string} kind
 * @param {StationDef<S>} def
 * @param {Block} block
 * @param {import('@minecraft/server').Player} player
 * @param {(state: S, held: string | null, carried: import('../logic/stations.js').Carried) => import('../logic/stations.js').Result<S>} interact
 * @returns {import('../logic/stations.js').Result<S>}
 */
function runInteraction(kind, def, block, player, interact) {
  const key = keyOf(block);
  // a migrated state needs no extra view refresh: interactStation sets the view anyway
  const state = loadState(def, key).state ?? def.initial;
  return interactStation(interact, def.states, state, heldItemId(player), (id) => playerHasItem(player, id), {
    setView: (states) => setStates(block, def.typeId, states),
    save: (next) => {
      worldStore.save(key, next);
      worldStore.registryAdd(kind, key);
    },
    apply: (result) => applyResult(result, player, block),
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
      registerAs(kind, def, block);
    },
    onPlayerInteract({ block, player }) {
      if (!player) return;
      runInteraction(kind, def, block, player, def.interact);
    },
    onPlayerBreak({ block, dimension }) {
      breakAt(kind, def, dimension, block);
    },
  };
}

/** @param {import('@minecraft/server').Player} player */
function cabinetFailedHint(player) {
  try {
    player.onScreenDisplay.setActionBar({ translate: 'kochmod.hint.crate_failed' });
  } catch (error) {
    console.warn(`kochmod cabinet: hint failed: ${error}`);
  }
}

/**
 * Opens the cabinet menu and hands out the chosen item from freshly loaded state; never throws.
 * A busy player (chat or another screen open) gets the menu again a few times.
 * @param {import('@minecraft/server').Player} player
 * @param {import('@minecraft/server').Dimension} dimension
 * @param {import('@minecraft/server').Vector3} location
 * @param {number} retriesDone
 * @returns {Promise<void>}
 */
async function openCabinet(player, dimension, location, retriesDone) {
  /** @type {import('@minecraft/server-ui').ActionFormResponse} */
  let response;
  try {
    const block = dimension.getBlock(location);
    if (block?.typeId !== dishCabinet.typeId) return;
    const menu = cabinetMenu(loadState(dishCabinet, keyOf(block)).state ?? dishCabinet.initial);
    const form = new ActionFormData().title({ translate: menu.title });
    for (const button of menu.buttons) form.button(button.label, button.icon);
    response = await form.show(player);
  } catch (error) {
    console.warn(`kochmod cabinet: form failed: ${error}`);
    return;
  }
  if (response.canceled) {
    if (shouldRetryBusy(response.cancelationReason, retriesDone)) {
      system.runTimeout(() => { void openCabinet(player, dimension, location, retriesDone + 1); }, BUSY_RETRY_TICKS);
    } else if (response.cancelationReason === 'UserBusy') {
      cabinetFailedHint(player);
    }
    return;
  }
  const choice = response.selection === undefined ? undefined : CABINET_CHOICES[response.selection];
  if (!choice) return;
  try {
    const block = dimension.getBlock(location);
    if (block?.typeId !== dishCabinet.typeId) return;
    runInteraction('dish_cabinet', dishCabinet, block, player, (s) => cabinetTake(s, choice));
  } catch (error) {
    console.warn(`kochmod cabinet: taking ${choice} failed: ${error}`);
    cabinetFailedHint(player);
  }
}

/** The dish cabinet: putting dishes in works like any station, an empty hand opens the menu. @returns {BlockCustomComponent} */
function cabinetComponent() {
  const base = stationComponent('dish_cabinet', dishCabinet);
  return {
    ...base,
    onPlayerInteract({ block, player }) {
      if (!player) return;
      const result = runInteraction('dish_cabinet', dishCabinet, block, player, cabinetInteract);
      if (!result.menu) return;
      const { dimension, location } = block;
      // Forms cannot be shown from inside the (read-only) event callback.
      system.run(() => { void openCabinet(player, dimension, location, 0); });
    },
  };
}

/** @type {Record<string, [string, StationDef<any>]>} */
const BY_TYPE = {
  [grill.typeId]: ['grill', grill],
  [oven.typeId]: ['oven', oven],
  [pot.typeId]: ['pot', pot],
  [wok.typeId]: ['wok', wok],
  [spit.typeId]: ['spit', spit],
  [cuttingBoard.typeId]: ['cutting_board', cuttingBoard],
  [counter.typeId]: ['counter', counter],
  [dishwasher.typeId]: ['dishwasher', dishwasher],
  [dishCabinet.typeId]: ['dish_cabinet', dishCabinet],
  [trashCan.typeId]: ['trash_can', trashCan],
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
    blockComponentRegistry.registerCustomComponent(typeId, def === dishCabinet ? cabinetComponent() : stationComponent(kind, def));
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
 * World io for the tick loop of one station kind. A migrated state gets its block view refreshed.
 * @template S, V
 * @param {string} kind registry name
 * @param {StationDef<S>} def
 * @param {(view: V) => BlockStates} statesOf
 * @returns {import('../logic/station-flow.js').TickIo<S, V>}
 */
function tickIo(kind, def, statesOf) {
  return {
    blockTypeAt: (key) => loadedBlock(key)?.typeId,
    load: (key) => {
      const { state, migrated } = loadState(def, key);
      const block = migrated ? loadedBlock(key) : undefined;
      if (block) syncViewLater(def, block.dimension, block.location, key);
      return state;
    },
    save: (key, state) => worldStore.save(key, state),
    forget: (key) => {
      worldStore.remove(key);
      worldStore.registryRemove(kind, key);
    },
    setView: (key, view) => {
      const block = loadedBlock(key);
      if (block) setStates(block, def.typeId, statesOf(view));
    },
    warn: (message) => console.warn(message),
  };
}

/**
 * Advances every loaded grill, oven, pot, wok, doner spit and dishwasher by `dt` ticks and closes open
 * trash-can lids (with STATION_TICK = 10 a lid closes on the next station tick). Stations in unloaded chunks pause.
 * @param {number} dt
 */
export function tickStations(dt) {
  for (const [kind, def, station] of COOKING) {
    tickTimedStation(worldStore.registryList(kind), dt, tickIo(kind, def, (view) => ({ 'kochmod:content': view })), def.typeId, kind, station);
  }
  for (const [kind, def, station] of POTS) {
    tickTimedStation(worldStore.registryList(kind), dt, tickIo(kind, def, (view) => ({ 'kochmod:state': view })), def.typeId, kind, station);
  }
  tickTimedStation(worldStore.registryList('spit'), dt, tickIo('spit', spit, (view) => ({ 'kochmod:content': view })), spit.typeId, 'spit', spitStation);
  tickTimedStation(worldStore.registryList('trash_can'), dt, tickIo('trash_can', trashCan, (view) => view), trashCan.typeId, 'trash_can', trashStation);
  tickDishwashers(
    worldStore.registryList('dishwasher'), dt,
    tickIo('dishwasher', dishwasher, (view) => ({ 'kochmod:state': view })), DISHWASHER_ID,
  );
}
