import { BURNT_AT, cookStage } from './cooking.js';
import { evaluateAssembly } from './recipes.js';
import { ITEMS } from './catalog.js';
import { TIMED } from './processes.js';

/**
 * take: consume one held item. give: item id handed to the player, `count` of them
 * as one stack (default 1). hint: lang key for the action bar. sound: sound id to play at the block.
 * @template S
 * @typedef {{ state: S, take?: boolean, give?: string, count?: number, hint?: string, sound?: string }} Result
 */
/** item: what lies on the station (null when empty); ticks: cooking time so far. @typedef {{ item: string | null, ticks: number }} TimedState */
/** @typedef {TimedState} GrillState */
/** @typedef {typeof TIMED[string]} TimedDef */
/** @typedef {{ item: string | null }} BoardState */
/** @typedef {{ items: string[] }} CounterState */
/** @typedef {{ plates: number, ticks: number }} DishwasherState */
/** @typedef {{ plates: number }} CabinetState */

export const COUNTER_MAX = 8;
/** Layers the counter shows at most (block state `kochmod:layers`). */
export const COUNTER_LAYERS = 6;
/** Counter view families (block state `kochmod:family`), 'none' first as the default. */
export const COUNTER_FAMILIES = /** @type {const} */ (['none', 'burger', 'pizza', 'doner', 'sushi']);
/** @typedef {typeof COUNTER_FAMILIES[number]} CounterFamily */
/** Base item -> the family whose stack the counter shows. Plain ids: some of them join the catalog later. */
const FAMILY_BASES = /** @type {Record<string, CounterFamily>} */ ({
  'kochmod:bun': 'burger',
  'kochmod:dough': 'pizza',
  'kochmod:pita': 'doner',
  'kochmod:nori': 'sushi',
});
/** Ticks a dishwasher needs (10 s). */
export const WASH_TICKS = 200;
export const DISHWASHER_MAX = 4;
export const CABINET_MAX = 8;

const ID = {
  rawPatty: 'kochmod:raw_patty', // what a stage 1 grill was cooking
  tomato: 'kochmod:tomato',
  tomatoSlices: 'kochmod:tomato_slices',
  knife: 'kochmod:knife',
  dirtyPlate: 'kochmod:dirty_plate',
  cleanPlate: 'kochmod:clean_plate',
};

/** The counter takes every ingredient and prepared item of the catalog (no tools, dishes or plates). */
function acceptsOnCounter(/** @type {string} */ id) {
  return Object.hasOwn(ITEMS, id) && (ITEMS[id].kind === 'ingredient' || ITEMS[id].kind === 'prepared');
}

// ---- Timed stations (grill; pot and wok later)

/**
 * A station that cooks one item by time, built from a `TIMED` row. Unknown stored items never throw:
 * they show as raw and come back unchanged.
 * @param {TimedDef} def
 */
export function timedStation(def) {
  /** @type {TimedState} */
  const initial = { item: null, ticks: 0 };
  /** @param {string} item @param {number} ticks @returns {string} what the item has become */
  const resultOf = (item, ticks) => {
    if (!Object.hasOwn(def.accepts, item)) return item;
    const out = def.accepts[item];
    return { raw: item, cooked: out.cooked, burnt: out.burnt }[cookStage(ticks)];
  };
  /** @param {string | null} held */
  const accepted = (held) => held !== null && Object.hasOwn(def.accepts, held);
  return {
    INITIAL: initial,
    /**
     * @param {TimedState} state
     * @param {string | null} held
     * @returns {Result<TimedState>}
     */
    interact(state, held) {
      if (state.item === null) {
        if (accepted(held)) return { state: { item: /** @type {string} */ (held), ticks: 0 }, take: true, sound: def.sound };
        return { state };
      }
      if (held === def.tool) return { state: { item: null, ticks: 0 }, give: resultOf(state.item, state.ticks) };
      if (accepted(held)) return { state, hint: def.hintFull };
      return { state, hint: def.hintTool };
    },
    /**
     * @param {TimedState} state
     * @param {number} dt
     * @returns {TimedState}
     */
    tick(state, dt) {
      if (state.item === null) return state;
      return { item: state.item, ticks: Math.min(state.ticks + dt, BURNT_AT) };
    },
    /**
     * @param {TimedState} state
     * @returns {'empty' | 'raw' | 'cooked' | 'burnt'}
     */
    view(state) {
      if (state.item === null) return 'empty';
      return Object.hasOwn(def.accepts, state.item) ? cookStage(state.ticks) : 'raw';
    },
    /**
     * @param {TimedState} state
     * @returns {string[]}
     */
    drops(state) {
      return state.item === null ? [] : [resultOf(state.item, state.ticks)];
    },
  };
}

export const grill = timedStation(TIMED.grill);
export const grillInteract = grill.interact;
export const grillTick = grill.tick;
export const grillView = grill.view;
export const grillDrops = grill.drops;

/** @type {{ grill: GrillState, board: BoardState, counter: CounterState, dishwasher: DishwasherState, cabinet: CabinetState }} */
export const INITIAL = {
  grill: grill.INITIAL,
  board: { item: null },
  counter: { items: [] },
  dishwasher: { plates: 0, ticks: 0 },
  cabinet: { plates: CABINET_MAX }, // a placed cabinet comes full of clean plates
};

// ---- Cutting board

/**
 * @param {BoardState} state
 * @param {string | null} held
 * @returns {Result<BoardState>}
 */
export function boardInteract(state, held) {
  if (state.item === null) {
    if (held === ID.tomato) return { state: { item: ID.tomato }, take: true };
    return { state };
  }
  if (held === null) return { state: { item: null }, give: state.item };
  if (held === ID.knife && state.item === ID.tomato) {
    return { state: { item: ID.tomatoSlices }, sound: 'kochmod.chop' };
  }
  if (held === ID.tomato) return { state, hint: 'kochmod.hint.board_full' };
  return { state };
}

/**
 * @param {BoardState} state
 * @returns {'empty' | 'tomato' | 'tomato_slices'}
 */
export function boardView(state) {
  if (state.item === ID.tomato) return 'tomato';
  if (state.item === ID.tomatoSlices) return 'tomato_slices';
  return 'empty';
}

/**
 * @param {BoardState} state
 * @returns {string[]}
 */
export function boardDrops(state) {
  return state.item === null ? [] : [state.item];
}

// ---- Counter

/**
 * @param {CounterState} state
 * @param {string | null} held
 * @returns {Result<CounterState>}
 */
export function counterInteract(state, held) {
  if (held === null) {
    if (state.items.length === 0) return { state };
    return { state: { items: [] }, give: evaluateAssembly(state.items), sound: 'kochmod.plate' };
  }
  if (!acceptsOnCounter(held)) return { state };
  if (state.items.length >= COUNTER_MAX) return { state, hint: 'kochmod.hint.counter_full' };
  return { state: { items: [...state.items, held] }, take: true };
}

/**
 * The stack on the counter: the family of the first base item (a stack without one shows as a burger),
 * one layer per item up to COUNTER_LAYERS.
 * @param {CounterState} state
 * @returns {{ family: CounterFamily, layers: number }}
 */
export function counterView(state) {
  const { items } = state;
  if (items.length === 0) return { family: 'none', layers: 0 };
  const base = items.find((id) => Object.hasOwn(FAMILY_BASES, id));
  return { family: base ? FAMILY_BASES[base] : 'burger', layers: Math.min(items.length, COUNTER_LAYERS) };
}

/**
 * @param {CounterState} state
 * @returns {string[]}
 */
export function counterDrops(state) {
  return [...state.items];
}

// ---- Dishwasher

/**
 * @param {DishwasherState} state
 * @param {string | null} held
 * @returns {Result<DishwasherState>}
 */
export function dishwasherInteract(state, held) {
  if (held === ID.dirtyPlate) {
    if (state.plates >= DISHWASHER_MAX) return { state, hint: 'kochmod.hint.dishwasher_full' };
    return { state: { plates: state.plates + 1, ticks: 0 }, take: true, sound: 'kochmod.bubble' };
  }
  if (held === null && state.plates > 0) {
    if (state.ticks >= WASH_TICKS) return { state: { plates: 0, ticks: 0 }, give: ID.cleanPlate, count: state.plates };
    return { state, hint: 'kochmod.hint.washing' };
  }
  return { state };
}

/**
 * @param {DishwasherState} state
 * @param {number} dt
 * @returns {DishwasherState}
 */
export function dishwasherTick(state, dt) {
  if (state.plates === 0) return state;
  return { plates: state.plates, ticks: Math.min(state.ticks + dt, WASH_TICKS) };
}

/**
 * @param {DishwasherState} state
 * @returns {'empty' | 'running' | 'done'}
 */
export function dishwasherView(state) {
  if (state.plates === 0) return 'empty';
  return state.ticks >= WASH_TICKS ? 'done' : 'running';
}

/**
 * @param {DishwasherState} state
 * @returns {string[]}
 */
export function dishwasherDrops(state) {
  const id = dishwasherView(state) === 'done' ? ID.cleanPlate : ID.dirtyPlate;
  return Array(state.plates).fill(id);
}

// ---- Dish cabinet

/**
 * @param {CabinetState} state
 * @param {string | null} held
 * @returns {Result<CabinetState>}
 */
export function cabinetInteract(state, held) {
  if (held === ID.cleanPlate) {
    if (state.plates >= CABINET_MAX) return { state, hint: 'kochmod.hint.cabinet_full' };
    return { state: { plates: state.plates + 1 }, take: true, sound: 'kochmod.plate' };
  }
  if (held === null) {
    if (state.plates === 0) return { state, hint: 'kochmod.hint.cabinet_empty' };
    return { state: { plates: state.plates - 1 }, give: ID.cleanPlate };
  }
  return { state };
}

/**
 * Number of plates shown in the cabinet (block state `kochmod:plates`).
 * @param {CabinetState} state
 * @returns {number}
 */
export function cabinetView(state) {
  return state.plates;
}

/**
 * @param {CabinetState} state
 * @returns {string[]}
 */
export function cabinetDrops(state) {
  return Array(state.plates).fill(ID.cleanPlate);
}

// ---- Saved states from stage 1

/** @param {unknown} v @returns {v is Record<string, unknown>} */
const isRecord = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
/** @param {unknown} v @returns {v is number} */
const isCount = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** Shape checks of the current saved states. @type {{ [K in keyof typeof INITIAL]: (s: Record<string, unknown>) => boolean }} */
const VALID = {
  grill: (s) => (s.item === null || typeof s.item === 'string') && isCount(s.ticks),
  board: (s) => s.item === null || typeof s.item === 'string',
  counter: (s) => Array.isArray(s.items) && s.items.every((i) => typeof i === 'string'),
  dishwasher: (s) => isCount(s.plates) && isCount(s.ticks),
  cabinet: (s) => isCount(s.plates),
};

/**
 * Turns a loaded station state into the current shape. Current shapes come back as the same object;
 * the stage 1 grill `{ occupied, ticks }` becomes a raw patty on the grill; anything unreadable becomes INITIAL.
 * @template {keyof typeof INITIAL} K
 * @param {K} kind
 * @param {unknown} saved
 * @returns {typeof INITIAL[K]}
 */
export function migrateStationState(kind, saved) {
  if (!isRecord(saved)) return INITIAL[kind];
  if (VALID[kind](saved)) return /** @type {typeof INITIAL[K]} */ (/** @type {unknown} */ (saved));
  if (kind === 'grill' && typeof saved.occupied === 'boolean') {
    if (!saved.occupied) return INITIAL[kind];
    return /** @type {typeof INITIAL[K]} */ ({ item: ID.rawPatty, ticks: isCount(saved.ticks) ? Math.min(saved.ticks, BURNT_AT) : 0 });
  }
  return INITIAL[kind];
}
