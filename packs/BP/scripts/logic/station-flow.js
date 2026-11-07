import { INITIAL, grill, dishwasherTick, dishwasherView } from './stations.js';

/** @typedef {ReturnType<typeof import('./stations.js').timedStation>} CookingStation */

/** @typedef {import('./stations.js').GrillState} GrillState */
/** @typedef {import('./stations.js').DishwasherState} DishwasherState */

/**
 * Runs one interaction. Order matters: the block view is set first, then the
 * state is saved, then side effects run. If setting the view throws, nothing
 * is saved and no item is taken or given.
 * @template S, V
 * @param {(state: S, held: string | null) => import('./stations.js').Result<S>} interact
 * @param {(state: S) => V} view
 * @param {S} state
 * @param {string | null} held
 * @param {{ setView(view: V): void, save(state: S): void, apply(result: import('./stations.js').Result<S>): void }} io
 */
export function interactStation(interact, view, state, held, io) {
  const result = interact(state, held);
  io.setView(view(result.state));
  io.save(result.state);
  io.apply(result);
  return result;
}

/**
 * Drops a station's contents and forgets it (player break or explosion).
 * @template S
 * @param {(state: S) => string[]} drops
 * @param {S} state
 * @param {{ drop(itemIds: string[]): void, forget(): void }} io
 */
export function breakStation(drops, state, io) {
  io.drop(drops(state));
  io.forget();
}

/**
 * A station that changes over time (grill, dishwasher).
 * @template {{ ticks: number }} S
 * @template V
 * @typedef {{ name: string, initial: S, tick: (state: S, dt: number) => S, view: (state: S) => V }} TimedDef
 */
/**
 * blockTypeAt returns undefined while the chunk is not loaded.
 * @template S, V
 * @typedef {{
 *   blockTypeAt(key: string): string | undefined,
 *   load(key: string): S | undefined,
 *   save(key: string, state: S): void,
 *   forget(key: string): void,
 *   setView(key: string, view: V): void,
 *   warn(message: string): void,
 * }} TickIo
 */

/**
 * Advances every registered station of one kind by `dt`. Each key is isolated: an
 * error on one key is reported via `warn` and the remaining stations keep running.
 * A loaded station without saved state is initialised, a replaced block is forgotten,
 * unchanged state is not rewritten and the view is only set when it changes.
 * @template {{ ticks: number }} S
 * @template V
 * @param {string[]} keys
 * @param {number} dt
 * @param {TickIo<S, V>} io
 * @param {string} typeId
 * @param {TimedDef<S, V>} def
 */
export function tickTimed(keys, dt, io, typeId, def) {
  for (const key of keys) {
    try {
      const blockType = io.blockTypeAt(key);
      if (blockType === undefined) continue;
      if (blockType !== typeId) {
        io.forget(key);
        continue;
      }
      const state = io.load(key);
      if (!state) {
        io.save(key, def.initial);
        continue;
      }
      const next = def.tick(state, dt);
      if (next.ticks === state.ticks) continue;
      const nextView = def.view(next);
      if (nextView !== def.view(state)) io.setView(key, nextView);
      io.save(key, next);
    } catch (e) {
      io.warn(`kochmod: ${def.name} tick failed for ${key}: ${e}`);
    }
  }
}

/** @type {TimedDef<DishwasherState, ReturnType<typeof dishwasherView>>} */
const DISHWASHER_TIMER = { name: 'dishwasher', initial: INITIAL.dishwasher, tick: dishwasherTick, view: dishwasherView };

/**
 * Advances every registered station of one cooking kind (grill, oven) by `dt` (see tickTimed).
 * @param {string[]} keys
 * @param {number} dt
 * @param {TickIo<GrillState, ReturnType<CookingStation['view']>>} io
 * @param {string} typeId
 * @param {string} name station kind, for warnings
 * @param {CookingStation} station
 */
export function tickTimedStation(keys, dt, io, typeId, name, station) {
  tickTimed(keys, dt, io, typeId, { name, initial: station.INITIAL, tick: station.tick, view: station.view });
}

/**
 * Advances every registered grill by `dt` (see tickTimed).
 * @param {string[]} keys
 * @param {number} dt
 * @param {TickIo<GrillState, ReturnType<typeof grill.view>>} io
 * @param {string} grillTypeId
 */
export function tickGrills(keys, dt, io, grillTypeId) {
  tickTimedStation(keys, dt, io, grillTypeId, 'grill', grill);
}

/**
 * Advances every registered dishwasher by `dt` (see tickTimed).
 * @param {string[]} keys
 * @param {number} dt
 * @param {TickIo<DishwasherState, ReturnType<typeof dishwasherView>>} io
 * @param {string} dishwasherTypeId
 */
export function tickDishwashers(keys, dt, io, dishwasherTypeId) {
  tickTimed(keys, dt, io, dishwasherTypeId, DISHWASHER_TIMER);
}
