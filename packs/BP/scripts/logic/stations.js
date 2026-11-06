import { BURNT_AT, cookStage } from './cooking.js';
import { evaluateAssembly } from './recipes.js';

/**
 * take: consume one held item. give: item id handed to the player.
 * hint: lang key for the action bar. sound: sound id to play at the block.
 * @template S
 * @typedef {{ state: S, take?: boolean, give?: string, hint?: string, sound?: string }} Result
 */
/** @typedef {{ occupied: boolean, ticks: number }} GrillState */
/** @typedef {{ item: string | null }} BoardState */
/** @typedef {{ items: string[] }} CounterState */

export const COUNTER_MAX = 8;

const ID = {
  bun: 'kochmod:bun',
  rawPatty: 'kochmod:raw_patty',
  cookedPatty: 'kochmod:cooked_patty',
  burntPatty: 'kochmod:burnt_patty',
  lettuce: 'kochmod:lettuce',
  tomato: 'kochmod:tomato',
  tomatoSlices: 'kochmod:tomato_slices',
  cheese: 'kochmod:cheese',
  knife: 'kochmod:knife',
  spatula: 'kochmod:spatula',
};

const INGREDIENTS = [
  ID.bun, ID.rawPatty, ID.cookedPatty, ID.burntPatty,
  ID.lettuce, ID.tomato, ID.tomatoSlices, ID.cheese,
];

/** @type {{ grill: GrillState, board: BoardState, counter: CounterState }} */
export const INITIAL = {
  grill: { occupied: false, ticks: 0 },
  board: { item: null },
  counter: { items: [] },
};

// ---- Grill

/**
 * @param {GrillState} state
 * @param {string | null} held
 * @returns {Result<GrillState>}
 */
export function grillInteract(state, held) {
  if (!state.occupied) {
    if (held === ID.rawPatty) {
      return { state: { occupied: true, ticks: 0 }, take: true, sound: 'kochmod.sizzle' };
    }
    return { state };
  }
  if (held === ID.spatula) {
    const give = { raw: ID.rawPatty, cooked: ID.cookedPatty, burnt: ID.burntPatty }[cookStage(state.ticks)];
    return { state: { occupied: false, ticks: 0 }, give };
  }
  if (held === ID.rawPatty) return { state, hint: 'kochmod.hint.grill_full' };
  return { state, hint: 'kochmod.hint.need_spatula' };
}

/**
 * @param {GrillState} state
 * @param {number} dt
 * @returns {GrillState}
 */
export function grillTick(state, dt) {
  if (!state.occupied) return state;
  return { occupied: true, ticks: Math.min(state.ticks + dt, BURNT_AT) };
}

/**
 * @param {GrillState} state
 * @returns {'empty' | 'raw' | 'cooked' | 'burnt'}
 */
export function grillView(state) {
  return state.occupied ? cookStage(state.ticks) : 'empty';
}

/**
 * @param {GrillState} state
 * @returns {string[]}
 */
export function grillDrops(state) {
  if (!state.occupied) return [];
  return [{ raw: ID.rawPatty, cooked: ID.cookedPatty, burnt: ID.burntPatty }[cookStage(state.ticks)]];
}

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
  if (!INGREDIENTS.includes(held)) return { state };
  if (state.items.length >= COUNTER_MAX) return { state, hint: 'kochmod.hint.counter_full' };
  return { state: { items: [...state.items, held] }, take: true };
}

/**
 * @param {CounterState} state
 * @returns {{ bun: boolean, patty: 'none' | 'raw' | 'cooked' | 'burnt', lettuce: boolean, tomato: 'none' | 'whole' | 'slices', cheese: boolean }}
 */
export function counterView(state) {
  const { items } = state;
  /** @type {Record<string, 'raw' | 'cooked' | 'burnt'>} */
  const pattyKinds = { [ID.rawPatty]: 'raw', [ID.cookedPatty]: 'cooked', [ID.burntPatty]: 'burnt' };
  const lastPatty = [...items].reverse().find((i) => i in pattyKinds);
  return {
    bun: items.includes(ID.bun),
    patty: lastPatty ? pattyKinds[lastPatty] : 'none',
    lettuce: items.includes(ID.lettuce),
    tomato: items.includes(ID.tomatoSlices) ? 'slices' : items.includes(ID.tomato) ? 'whole' : 'none',
    cheese: items.includes(ID.cheese),
  };
}

/**
 * @param {CounterState} state
 * @returns {string[]}
 */
export function counterDrops(state) {
  return [...state.items];
}
