import {
  WALK_TIMEOUT, EAT_TICKS, LEAVE_TICKS,
  withinRadius, offset, seatDirection, availableDishes, pickWish, spawnDelay, rate, seatStillValid,
} from './restaurant.js';
import { locKey, parseLocKey } from './store.js';
import { DISHES, FAILED } from './recipes.js';
import { plateName } from './catalog.js';
import { stationsFor } from './processes.js';

/**
 * Guest life cycle, one guest per bell. Pure: the world is reached only
 * through the injected `GuestIo` and `Guest` handles (see world/guests.js).
 */

export const BELL = 'kochmod:bell';
export const CHAIR = 'kochmod:chair';
export const TABLE = 'kochmod:table';
/** Ticks until the next spawn attempt when no seat or no dish is available. */
export const RETRY_TICKS = 100;
/** A walking guest this close (blocks) to the seat centre sits down. */
export const ARRIVE_DISTANCE = 1.5;
/** Guest ticks the entity may be missing before the bell gives up on it (entities load after blocks). */
export const MISSING_GRACE = 3;

const STATION_KINDS = [...new Set(DISHES.flatMap(stationsFor))];
/** Plate states of the table: one per dish plus the failed dish. */
export const DISH_PLATES = [...DISHES.map(plateName), plateName(FAILED)];
const PREFIX = 'kochmod:';

/**
 * Per-bell state under `kochmod:st:<bellKey>`. `seat`/`table` are kept on the
 * bell so the guest can be cleaned up even when its entity is gone.
 * @typedef {{ guestId: string | null, cooldown: number, seat?: string, table?: string, missing?: number }} BellState
 */
/**
 * Script state of one guest (entity dynamic properties). `wish` and `served`
 * are full item ids (`kochmod:hamburger`).
 * @typedef {{ phase: string, seat: string, table: string, bell: string, timer: number, served: string, wish: string }} GuestData
 */
/** @typedef {{ wish?: string, pose?: 'stand' | 'sit', mood?: 'neutral' | 'happy' | 'grumpy' }} Look */
/**
 * @typedef {{
 *   id: string,
 *   data(): GuestData,
 *   update(patch: Partial<GuestData>): void,
 *   look(patch: Look): void,
 *   distanceTo(seatKey: string): number,
 *   sit(seatKey: string, tableKey: string): void,
 *   hold(seatKey: string, tableKey: string): void,
 *   react(happy: boolean): void,
 *   remove(poof: boolean): void,
 * }} Guest
 */
/**
 * @typedef {{
 *   blockTypeAt(key: string): string | undefined,
 *   registryList(kind: string): string[],
 *   loadBell(key: string): BellState | undefined,
 *   saveBell(key: string, state: BellState): void,
 *   forgetBell(key: string): void,
 *   getGuest(id: string): Guest | undefined,
 *   spawnGuest(bellKey: string, data: GuestData): Guest,
 *   getPlate(tableKey: string): string,
 *   setPlate(tableKey: string, plate: string): void,
 *   payout(tableKey: string, emeralds: number): void,
 *   warn(message: string): void,
 * }} GuestIo blockTypeAt returns undefined while the chunk is not loaded
 */

/** @typedef {'ok' | 'no_seat' | 'no_kitchen'} GuestAvailability */

/** @param {string} dishId @returns {string} the `kochmod:wish` property value */
const wishLook = (dishId) => (dishId.startsWith(PREFIX) ? dishId.slice(PREFIX.length) : 'none');

/** @param {() => number} rnd @returns {BellState} */
const freeBell = (rnd) => ({ guestId: null, cooldown: spawnDelay(rnd) });

/**
 * The table a chair faces, or null when the chair is not loaded/not a chair or has no table.
 * @param {string} chairKey
 * @param {GuestIo} io
 * @returns {string | null}
 */
function tableOf(chairKey, io) {
  if (io.blockTypeAt(chairKey) !== CHAIR) return null;
  const chair = parseLocKey(chairKey);
  const at = (/** @type {import('./restaurant.js').Loc} */ loc) => locKey(chair.dimensionId, loc);
  const dir = seatDirection(chair, (loc) => io.blockTypeAt(at(loc)) === TABLE);
  return dir === null ? null : at(offset(chair, dir));
}

/**
 * Seats and tables used by the guests of all other bells.
 * @param {string} bellKey
 * @param {GuestIo} io
 * @returns {Set<string>}
 */
function occupied(bellKey, io) {
  const taken = new Set();
  for (const key of io.registryList('bell')) {
    if (key === bellKey) continue;
    const state = io.loadBell(key);
    if (!state?.guestId) continue;
    if (state.seat) taken.add(state.seat);
    if (state.table) taken.add(state.table);
  }
  return taken;
}

/**
 * Whether a guest could come to this bell right now, and what the pick would be.
 * The seat is checked first, then the kitchen.
 * @param {string} bellKey
 * @param {GuestIo} io
 * @param {() => number} rnd
 * @returns {{ status: GuestAvailability, seat?: string, table?: string, wish?: string }}
 */
function assess(bellKey, io, rnd) {
  const bell = parseLocKey(bellKey);
  const near = (/** @type {string} */ key) => {
    const p = parseLocKey(key);
    return p.dimensionId === bell.dimensionId && withinRadius(bell, p);
  };
  const taken = occupied(bellKey, io);
  const dist2 = (/** @type {string} */ key) => {
    const p = parseLocKey(key);
    return (p.x - bell.x) ** 2 + (p.y - bell.y) ** 2 + (p.z - bell.z) ** 2;
  };
  const seats = io.registryList('chair')
    .filter((seat) => near(seat) && !taken.has(seat))
    .map((seat) => ({ seat, table: tableOf(seat, io) }))
    .filter((s) => s.table !== null && !taken.has(s.table))
    .sort((a, b) => dist2(a.seat) - dist2(b.seat));
  if (seats.length === 0) return { status: 'no_seat' };
  const kinds = new Set(STATION_KINDS.filter((kind) => io.registryList(kind).some(near)));
  const wish = pickWish(availableDishes(kinds), rnd);
  if (wish === null) return { status: 'no_kitchen' };
  return { status: 'ok', seat: seats[0].seat, table: /** @type {string} */ (seats[0].table), wish };
}

/**
 * Can a guest come to this bell, and if not, why not.
 * @param {string} bellKey
 * @param {GuestIo} io
 * @returns {GuestAvailability}
 */
export function guestAvailability(bellKey, io) {
  return assess(bellKey, io, () => 0).status;
}

/**
 * Counts down; at 0 spawns a guest if a free seat and a cookable dish exist.
 * @param {string} bellKey
 * @param {BellState} state
 * @param {number} dt
 * @param {GuestIo} io
 * @param {() => number} rnd
 * @returns {BellState}
 */
function trySpawn(bellKey, state, dt, io, rnd) {
  const cooldown = state.cooldown - dt;
  if (cooldown > 0) return { guestId: null, cooldown };
  const found = assess(bellKey, io, rnd);
  if (found.status !== 'ok') return { guestId: null, cooldown: RETRY_TICKS };
  const seat = /** @type {string} */ (found.seat);
  const table = /** @type {string} */ (found.table);
  const guest = io.spawnGuest(bellKey, {
    phase: 'walking', seat, table, bell: bellKey, timer: WALK_TIMEOUT, served: '', wish: /** @type {string} */ (found.wish),
  });
  return { guestId: guest.id, cooldown: 0, seat, table };
}

/**
 * Removes the guest (if present), clears a dish left on its table, frees the bell.
 * The dish was served, so it is consumed and not dropped; an empty plate stays.
 * @param {BellState} state
 * @param {Guest | undefined} guest
 * @param {boolean} tableExists
 * @param {GuestIo} io
 * @param {() => number} rnd
 * @returns {BellState}
 */
function cleanup(state, guest, tableExists, io, rnd) {
  if (guest) guest.remove(false);
  if (tableExists && state.table && DISH_PLATES.includes(io.getPlate(state.table))) io.setPlate(state.table, 'none');
  return freeBell(rnd);
}

/**
 * One step of the bell's guest.
 * @param {BellState} state with a guestId
 * @param {number} dt
 * @param {GuestIo} io
 * @param {() => number} rnd
 * @returns {BellState}
 */
function stepGuest(state, dt, io, rnd) {
  const guestId = /** @type {string} */ (state.guestId);
  const { seat, table } = state;
  if (!seat || !table) return cleanup(state, io.getGuest(guestId), false, io, rnd);
  const chairType = io.blockTypeAt(seat);
  const tableType = io.blockTypeAt(table);
  if (chairType === undefined || tableType === undefined) return state; // not loaded: pause
  const tableExists = tableType === TABLE;
  const guest = io.getGuest(guestId);
  if (!seatStillValid({ bellExists: true, chairExists: chairType === CHAIR, tableExists })) {
    return cleanup(state, guest, tableExists, io, rnd);
  }
  if (!guest) {
    const missing = (state.missing ?? 0) + 1;
    return missing >= MISSING_GRACE ? cleanup(state, undefined, tableExists, io, rnd) : { ...state, missing };
  }
  /** @type {BellState} */
  const keep = { guestId, cooldown: 0, seat, table };
  const d = guest.data();
  switch (d.phase) {
    case 'walking': {
      const timer = d.timer - dt;
      if (timer > 0 && guest.distanceTo(seat) > ARRIVE_DISTANCE) {
        guest.update({ timer });
        return keep;
      }
      guest.sit(seat, table);
      guest.look({ pose: 'sit', wish: wishLook(d.wish) });
      guest.update({ phase: 'waiting', timer: 0 });
      return keep;
    }
    case 'waiting':
      guest.hold(seat, table);
      return keep;
    case 'eating': {
      guest.hold(seat, table);
      const timer = d.timer - dt;
      if (timer > 0) {
        guest.update({ timer });
        return keep;
      }
      const { happy, emeralds } = rate(d.wish, d.served, rnd);
      guest.look({ mood: happy ? 'happy' : 'grumpy' });
      guest.react(happy);
      if (emeralds > 0) io.payout(table, emeralds);
      io.setPlate(table, 'empty');
      guest.update({ phase: 'leaving', timer: LEAVE_TICKS });
      return keep;
    }
    case 'leaving': {
      guest.hold(seat, table);
      const timer = d.timer - dt;
      if (timer > 0) {
        guest.update({ timer });
        return keep;
      }
      guest.remove(true);
      return freeBell(rnd);
    }
    default:
      return cleanup(state, guest, tableExists, io, rnd);
  }
}

/**
 * Removes the bell's guest (dish plate cleared) and forgets the bell: bell broken or replaced.
 * @param {string} bellKey
 * @param {GuestIo} io
 * @param {() => number} rnd
 */
export function releaseBell(bellKey, io, rnd) {
  const state = io.loadBell(bellKey);
  if (state?.guestId) {
    const tableExists = state.table !== undefined && io.blockTypeAt(state.table) === TABLE;
    cleanup(state, io.getGuest(state.guestId), tableExists, io, rnd);
  }
  io.forgetBell(bellKey);
}

/**
 * @param {string} bellKey
 * @param {number} dt
 * @param {GuestIo} io
 * @param {() => number} rnd
 */
function tickBell(bellKey, dt, io, rnd) {
  const type = io.blockTypeAt(bellKey);
  if (type === undefined) return; // chunk not loaded
  if (type !== BELL) {
    releaseBell(bellKey, io, rnd);
    return;
  }
  const state = io.loadBell(bellKey) ?? freeBell(rnd);
  io.saveBell(bellKey, state.guestId === null ? trySpawn(bellKey, state, dt, io, rnd) : stepGuest(state, dt, io, rnd));
}

/**
 * Advances every bell by `dt` ticks. Each bell is isolated: an error is
 * reported via `warn` and the remaining bells keep running.
 * @param {string[]} bellKeys
 * @param {number} dt
 * @param {GuestIo} io
 * @param {() => number} rnd
 */
export function tickBells(bellKeys, dt, io, rnd) {
  for (const key of bellKeys) {
    try {
      tickBell(key, dt, io, rnd);
    } catch (e) {
      io.warn(`kochmod: guest tick failed for bell ${key}: ${e}`);
    }
  }
}

/**
 * The guest waiting at this table, or null.
 * @param {string} tableKey
 * @param {GuestIo} io
 * @returns {Guest | null}
 */
export function findWaitingGuest(tableKey, io) {
  for (const key of io.registryList('bell')) {
    const state = io.loadBell(key);
    if (!state?.guestId || state.table !== tableKey) continue;
    const guest = io.getGuest(state.guestId);
    if (guest && guest.data().phase === 'waiting') return guest;
  }
  return null;
}

/**
 * A dish was put on the table: the waiting guest starts eating.
 * @param {string} tableKey
 * @param {string} dishId
 * @param {GuestIo} io
 * @returns {boolean} whether a guest took the dish
 */
export function serveTable(tableKey, dishId, io) {
  const guest = findWaitingGuest(tableKey, io);
  if (!guest) return false;
  guest.update({ served: dishId, phase: 'eating', timer: EAT_TICKS });
  guest.look({ wish: 'none' });
  return true;
}

/**
 * Removes guest entities that no bell points at (spawned but never recorded,
 * or left over after their bell was cleaned up). No poof: they just vanish.
 * @param {Guest[]} guests loaded guest entities
 * @param {GuestIo} io
 */
export function sweepOrphans(guests, io) {
  for (const guest of guests) {
    const bell = guest.data().bell;
    const state = bell ? io.loadBell(bell) : undefined;
    if (state?.guestId !== guest.id) guest.remove(false);
  }
}
