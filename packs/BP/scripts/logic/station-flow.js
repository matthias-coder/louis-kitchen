import { INITIAL, grillTick, grillView } from './stations.js';

/** @typedef {import('./stations.js').GrillState} GrillState */

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
 * Advances every registered grill by `dt`. Each key is isolated: an error on
 * one key is reported via `warn` and the remaining grills keep cooking.
 * A loaded grill without saved state is initialised to INITIAL.grill.
 * @param {string[]} keys
 * @param {number} dt
 * @param {{
 *   blockTypeAt(key: string): string | undefined,
 *   load(key: string): GrillState | undefined,
 *   save(key: string, state: GrillState): void,
 *   forget(key: string): void,
 *   setView(key: string, view: ReturnType<typeof grillView>): void,
 *   warn(message: string): void,
 * }} io blockTypeAt returns undefined while the chunk is not loaded
 * @param {string} grillTypeId
 */
export function tickGrills(keys, dt, io, grillTypeId) {
  for (const key of keys) {
    try {
      const typeId = io.blockTypeAt(key);
      if (typeId === undefined) continue;
      if (typeId !== grillTypeId) {
        io.forget(key);
        continue;
      }
      const state = io.load(key);
      if (!state) {
        io.save(key, INITIAL.grill);
        continue;
      }
      const next = grillTick(state, dt);
      if (next.ticks === state.ticks) continue;
      const nextView = grillView(next);
      if (nextView !== grillView(state)) io.setView(key, nextView);
      io.save(key, next);
    } catch (e) {
      io.warn(`kochmod: grill tick failed for ${key}: ${e}`);
    }
  }
}
