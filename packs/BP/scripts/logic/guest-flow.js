import {
  WALK_TIMEOUT, EAT_TICKS, LEAVE_TICKS,
  TAKEAWAY_CHANCE, PIZZA_DISHES,
  withinRadius, offset, seatDirection, availableDishes, offeredCuisines, pickWish, spawnDelay, rate, seatStillValid, leftover,
} from './restaurant.js';
import { locKey, parseLocKey } from './store.js';
import { DISHES, FAILED } from './recipes.js';
import { plateName, PIZZA_BOX } from './catalog.js';
import { stationsFor } from './processes.js';

/**
 * Guest life cycle, any number of guests per bell (one per seat). Pure: the
 * world is reached only through the injected `GuestIo` and `Guest` handles
 * (see world/guests.js).
 */

export const BELL = 'kochmod:bell';
export const CHAIR = 'kochmod:chair';
export const TABLE = 'kochmod:table';
/** Ticks until the next spawn attempt when no seat or no dish is available. */
export const RETRY_TICKS = 100;
/** Ticks between the guests called by one ring of the bell. */
export const RING_STAGGER = 10;
/** A walking guest this close (blocks) to the seat centre sits down. */
export const ARRIVE_DISTANCE = 1.5;
/** Guest ticks the entity may be missing before the bell gives up on it (entities load after blocks). */
export const MISSING_GRACE = 3;

/** Station kinds the dishes need (registry kinds; each is also a block id). */
export const STATION_KINDS = [...new Set(DISHES.flatMap(stationsFor))];
/** Plate states of the table: one per dish plus the failed dish. */
export const DISH_PLATES = [...DISHES.map(plateName), plateName(FAILED)];
const PREFIX = 'kochmod:';

/**
 * One seated (or walking) guest of a bell. The table is kept on the bell so
 * the guest can be cleaned up even when its entity is gone.
 * @typedef {{ guestId: string, table: string, missing?: number }} SeatEntry
 */
/**
 * Per-bell state under `kochmod:st:<bellKey>`: the guests by seat key, the
 * spawn countdown and how many guests of a ring are still to be called.
 * The takeaway guest (at most one, no seat) is listed under `takeaway`.
 * @typedef {{ guests: Record<string, SeatEntry>, cooldown: number, pending?: number, takeaway?: { guestId: string, missing?: number } }} BellState
 */
/**
 * Script state of one guest (entity dynamic properties). `wish` and `served`
 * are full item ids (`kochmod:hamburger`).
 * @typedef {{ phase: string, seat: string, table: string, bell: string, timer: number, served: string, wish: string }} GuestData
 */
/** @typedef {{ wish?: string, pose?: 'stand' | 'sit', mood?: 'neutral' | 'happy' | 'grumpy', takeaway?: boolean }} Look */
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
 *   stay(): void,
 *   pay(emeralds: number): void,
 * }} Guest
 */
/**
 * @typedef {{
 *   blockTypeAt(key: string): string | undefined,
 *   registryList(kind: string): string[],
 *   loadBell(key: string): unknown,
 *   saveBell(key: string, state: BellState): void,
 *   forgetBell(key: string): void,
 *   getGuest(id: string): Guest | undefined,
 *   spawnGuest(bellKey: string, data: GuestData): Guest,
 *   getPlate(tableKey: string): string,
 *   setPlate(tableKey: string, plate: string): void,
 *   payout(tableKey: string, emeralds: number): void,
 *   warn(message: string): void,
 * }} GuestIo blockTypeAt returns undefined while the chunk is not loaded;
 *   loadBell returns the raw stored value (any stage), read through `migrateBellState`
 */

/** @typedef {'ok' | 'no_seat' | 'no_kitchen'} GuestAvailability */
/** @typedef {GuestAvailability | 'full'} RingStatus `full`: there are seats in range, but all are taken */

/** @param {string} dishId @returns {string} the `kochmod:wish` property value */
const wishLook = (dishId) => (dishId.startsWith(PREFIX) ? dishId.slice(PREFIX.length) : 'none');

/** @param {unknown} v @returns {v is Record<string, any>} */
const isRecord = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A bell without guests that calls the next one after the spawn delay. @param {() => number} rnd @returns {BellState} */
export const freeBell = (rnd) => ({ guests: {}, cooldown: spawnDelay(rnd) });

/** @param {unknown} v @returns {{ guestId: string, missing?: number } | null} the entry, or null when it is unusable */
function takeawayEntry(v) {
  if (!isRecord(v) || typeof v.guestId !== 'string') return null;
  /** @type {{ guestId: string, missing?: number }} */
  const entry = { guestId: v.guestId };
  if (typeof v.missing === 'number') entry.missing = v.missing;
  return entry;
}

/** @param {unknown} v @returns {SeatEntry | null} the entry, or null when it is unusable */
function seatEntry(v) {
  if (!isRecord(v) || typeof v.guestId !== 'string' || typeof v.table !== 'string') return null;
  /** @type {SeatEntry} */
  const entry = { guestId: v.guestId, table: v.table };
  if (typeof v.missing === 'number') entry.missing = v.missing;
  return entry;
}

/**
 * Reads a stored bell state of any stage. Stage 1 kept one guest
 * (`{ guestId, cooldown, seat?, table?, missing? }`); it moves under its seat.
 * Unusable seat entries are dropped (their guest is swept as an orphan);
 * anything unreadable becomes a free bell that retries soon.
 * @param {unknown} saved
 * @returns {BellState}
 */
export function migrateBellState(saved) {
  if (!isRecord(saved) || typeof saved.cooldown !== 'number') return { guests: {}, cooldown: RETRY_TICKS };
  /** @type {BellState} */
  const state = { guests: {}, cooldown: saved.cooldown };
  if (isRecord(saved.guests)) {
    for (const [seat, v] of Object.entries(saved.guests)) {
      const entry = seatEntry(v);
      if (entry) state.guests[seat] = entry;
    }
    if (typeof saved.pending === 'number' && saved.pending > 0) state.pending = saved.pending;
    const takeaway = takeawayEntry(saved.takeaway);
    if (takeaway) state.takeaway = takeaway;
    return state;
  }
  if (!('guestId' in saved)) return { guests: {}, cooldown: RETRY_TICKS };
  const entry = seatEntry(saved);
  if (entry && typeof saved.seat === 'string') state.guests[saved.seat] = entry;
  return state;
}

/**
 * The bell's state, or undefined when nothing is stored.
 * @param {string} bellKey
 * @param {GuestIo} io
 * @returns {BellState | undefined}
 */
function loadBell(bellKey, io) {
  const saved = io.loadBell(bellKey);
  return saved === undefined ? undefined : migrateBellState(saved);
}

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
 * Seats and tables used by the guests of all bells (this bell's own included).
 * @param {GuestIo} io
 * @returns {Set<string>}
 */
function occupied(io) {
  const taken = new Set();
  for (const key of io.registryList('bell')) {
    for (const [seat, entry] of Object.entries(loadBell(key, io)?.guests ?? {})) {
      taken.add(seat);
      taken.add(entry.table);
    }
  }
  return taken;
}

/**
 * Whether a guest could come to this bell right now, and what the pick would be.
 * The seat is checked first, then the kitchen. `free` lists every free seat in
 * range, nearest first. `takeaway`: the oven is near and a pizza can be cooked;
 * then the status is `ok` even without a free seat (`noSeat` tells why there is none).
 * @param {string} bellKey
 * @param {GuestIo} io
 * @param {() => number} rnd
 * @returns {{ status: RingStatus, free: { seat: string, table: string }[], wish?: string, takeaway: boolean, pizzaWish?: string, noSeat?: 'no_seat' | 'full' }}
 */
function assess(bellKey, io, rnd) {
  const bell = parseLocKey(bellKey);
  const near = (/** @type {string} */ key) => {
    const p = parseLocKey(key);
    return p.dimensionId === bell.dimensionId && withinRadius(bell, p);
  };
  const dist2 = (/** @type {string} */ key) => {
    const p = parseLocKey(key);
    return (p.x - bell.x) ** 2 + (p.y - bell.y) ** 2 + (p.z - bell.z) ** 2;
  };
  /** @type {{ seat: string, table: string }[]} */
  const seats = [];
  for (const seat of io.registryList('chair')) {
    if (!near(seat)) continue;
    const table = tableOf(seat, io);
    if (table !== null) seats.push({ seat, table });
  }
  const taken = occupied(io);
  const free = seats
    .filter((s) => !taken.has(s.seat) && !taken.has(s.table))
    .sort((a, b) => dist2(a.seat) - dist2(b.seat));
  const kinds = kindsNear(bellKey, io);
  const dishes = availableDishes(kinds);
  const noSeat = seats.length === 0 ? 'no_seat' : 'full';
  const wish = free.length === 0 ? null : pickWish(dishes, rnd);
  const pizzaWish = offeredCuisines(kinds).has('italian')
    ? pickWish(dishes.filter((d) => PIZZA_DISHES.includes(d)), rnd) ?? undefined
    : undefined;
  const takeaway = pizzaWish !== undefined;
  if (free.length === 0) return { status: takeaway ? 'ok' : noSeat, free, takeaway, pizzaWish, noSeat };
  if (wish === null) return { status: 'no_kitchen', free, takeaway, pizzaWish };
  return { status: 'ok', free, wish, takeaway, pizzaWish };
}

/**
 * Whether the next guest is the takeaway guest: none waits yet, and either no seat is free or the dice say so.
 * @param {BellState} state
 * @param {{ takeaway: boolean, free: unknown[] }} found
 * @param {() => number} rnd
 * @returns {boolean}
 */
export function wantsTakeaway(state, found, rnd) {
  return found.takeaway && !state.takeaway && (found.free.length === 0 || rnd() < TAKEAWAY_CHANCE);
}

/**
 * Station kinds with a registered device within reach of the bell.
 * @param {string} bellKey
 * @param {GuestIo} io
 * @returns {Set<string>}
 */
export function kindsNear(bellKey, io) {
  const bell = parseLocKey(bellKey);
  const near = (/** @type {string} */ key) => {
    const p = parseLocKey(key);
    return p.dimensionId === bell.dimensionId && withinRadius(bell, p);
  };
  return new Set(STATION_KINDS.filter((kind) => io.registryList(kind).some(near)));
}

/**
 * Can a guest come to this bell, and if not, why not (all seats taken counts as no_seat).
 * @param {string} bellKey
 * @param {GuestIo} io
 * @returns {GuestAvailability}
 */
export function guestAvailability(bellKey, io) {
  const { status } = assess(bellKey, io, () => 0);
  return status === 'full' ? 'no_seat' : status;
}

/**
 * Spawns a guest walking to the nearest free seat (the assessment must be `ok`).
 * @param {string} bellKey
 * @param {BellState} state
 * @param {ReturnType<typeof assess>} found
 * @param {GuestIo} io
 * @returns {BellState} with the new guest listed under its seat
 */
function spawnAt(bellKey, state, found, io) {
  const { seat, table } = found.free[0];
  const guest = io.spawnGuest(bellKey, {
    phase: 'walking', seat, table, bell: bellKey, timer: WALK_TIMEOUT, served: '', wish: /** @type {string} */ (found.wish),
  });
  return { ...state, guests: { ...state.guests, [seat]: { guestId: guest.id, table } } };
}

/**
 * Spawns the takeaway guest: it stands at the bell with a pizza wish.
 * @param {string} bellKey
 * @param {BellState} state
 * @param {ReturnType<typeof assess>} found
 * @param {GuestIo} io
 * @returns {BellState}
 */
function spawnTakeaway(bellKey, state, found, io) {
  const wish = /** @type {string} */ (found.pizzaWish);
  const guest = io.spawnGuest(bellKey, { phase: 'takeaway_waiting', seat: '', table: '', bell: bellKey, timer: 0, served: '', wish });
  guest.stay();
  guest.look({ takeaway: true, wish: wishLook(wish) });
  return { ...state, takeaway: { guestId: guest.id } };
}

/**
 * Calls the next guest: the takeaway guest, else one for the nearest free seat.
 * @param {string} bellKey
 * @param {BellState} state
 * @param {ReturnType<typeof assess>} found
 * @param {GuestIo} io
 * @param {() => number} rnd
 * @returns {{ state: BellState, seated: boolean } | null} null: nobody can come (no free seat, takeaway guest waits)
 */
function callGuest(bellKey, state, found, io, rnd) {
  if (wantsTakeaway(state, found, rnd)) return { state: spawnTakeaway(bellKey, state, found, io), seated: false };
  if (found.free.length > 0) return { state: spawnAt(bellKey, state, found, io), seated: true };
  return null;
}

/**
 * Counts down; at 0 calls one guest: the next one of a ring while some are
 * pending, else the automatic spawner fills one free seat.
 * @param {string} bellKey
 * @param {BellState} state
 * @param {number} dt
 * @param {GuestIo} io
 * @param {() => number} rnd
 * @returns {BellState}
 */
function trySpawn(bellKey, state, dt, io, rnd) {
  const cooldown = state.cooldown - dt;
  if (cooldown > 0) return { ...state, cooldown };
  const { pending: _, ...rest } = state;
  const found = assess(bellKey, io, rnd);
  if (found.status !== 'ok') return { ...rest, cooldown: RETRY_TICKS };
  const called = callGuest(bellKey, rest, found, io, rnd);
  if (!called) return { ...rest, cooldown: RETRY_TICKS };
  const next = called.state;
  const pending = (state.pending ?? 0) - (called.seated ? 1 : 0);
  return pending > 0 ? { ...next, cooldown: RING_STAGGER, pending } : { ...next, cooldown: spawnDelay(rnd) };
}

/**
 * Removes the guest (if present) and clears a dish left on its table.
 * The dish was served, so it is consumed and not dropped; an empty plate stays.
 * @param {SeatEntry} entry
 * @param {Guest | undefined} guest
 * @param {boolean} tableExists
 * @param {GuestIo} io
 * @returns {null} the seat is free
 */
function cleanup(entry, guest, tableExists, io) {
  if (guest) guest.remove(false);
  if (tableExists && DISH_PLATES.includes(io.getPlate(entry.table))) io.setPlate(entry.table, 'none');
  return null;
}

/**
 * One step of the takeaway guest: it waits at the bell; after paying it leaves.
 * @param {{ guestId: string, missing?: number }} entry
 * @param {number} dt
 * @param {GuestIo} io
 * @param {() => number} _rnd
 * @returns {{ guestId: string, missing?: number } | null} the updated entry, or null when the guest is gone
 */
function stepTakeaway(entry, dt, io, _rnd) {
  const guest = io.getGuest(entry.guestId);
  if (!guest) {
    const missing = (entry.missing ?? 0) + 1;
    return missing >= MISSING_GRACE ? null : { ...entry, missing };
  }
  const d = guest.data();
  if (d.phase !== 'takeaway_leaving') return { guestId: entry.guestId };
  const timer = d.timer - dt;
  if (timer > 0) {
    guest.update({ timer });
    return { guestId: entry.guestId };
  }
  guest.remove(true);
  return null;
}

/**
 * One step of the guest on one seat.
 * @param {string} seat
 * @param {SeatEntry} entry
 * @param {number} dt
 * @param {GuestIo} io
 * @param {() => number} rnd
 * @returns {SeatEntry | null} the updated entry, or null when the guest is gone
 */
function stepGuest(seat, entry, dt, io, rnd) {
  const { guestId, table } = entry;
  const chairType = io.blockTypeAt(seat);
  const tableType = io.blockTypeAt(table);
  if (chairType === undefined || tableType === undefined) return entry; // not loaded: pause
  const tableExists = tableType === TABLE;
  const guest = io.getGuest(guestId);
  if (!seatStillValid({ bellExists: true, chairExists: chairType === CHAIR, tableExists })) {
    return cleanup(entry, guest, tableExists, io);
  }
  if (!guest) {
    const missing = (entry.missing ?? 0) + 1;
    return missing >= MISSING_GRACE ? cleanup(entry, undefined, tableExists, io) : { ...entry, missing };
  }
  /** @type {SeatEntry} */
  const keep = { guestId, table };
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
      const { happy, emeralds } = rate(d.wish, d.served, offeredCuisines(kindsNear(d.bell, io)), rnd);
      guest.look({ mood: happy ? 'happy' : 'grumpy' });
      guest.react(happy);
      if (emeralds > 0) io.payout(table, emeralds);
      io.setPlate(table, leftover(d.served));
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
      return null;
    }
    default:
      return cleanup(entry, guest, tableExists, io);
  }
}

/**
 * Removes all guests of the bell (dish plates cleared) and forgets the bell: bell broken or replaced.
 * @param {string} bellKey
 * @param {GuestIo} io
 */
export function releaseBell(bellKey, io) {
  const state = loadBell(bellKey, io);
  for (const entry of Object.values(state?.guests ?? {})) {
    cleanup(entry, io.getGuest(entry.guestId), io.blockTypeAt(entry.table) === TABLE, io);
  }
  if (state?.takeaway) io.getGuest(state.takeaway.guestId)?.remove(false);
  io.forgetBell(bellKey);
}

/**
 * The bell was rung: calls one guest for every free seat in range, the first
 * right away, each further one RING_STAGGER ticks later (via `pending`).
 * @param {string} bellKey
 * @param {GuestIo} io
 * @param {() => number} rnd
 * @returns {{ status: RingStatus, spawned: number }} spawned: guests spawned right now
 */
export function ringBell(bellKey, io, rnd) {
  const state = loadBell(bellKey, io) ?? freeBell(rnd);
  const found = assess(bellKey, io, rnd);
  if (found.status !== 'ok') {
    io.saveBell(bellKey, state);
    return { status: found.status, spawned: 0 };
  }
  const { pending: _, ...rest } = state;
  const called = callGuest(bellKey, rest, found, io, rnd);
  if (!called) {
    io.saveBell(bellKey, state);
    return { status: found.noSeat ?? 'full', spawned: 0 };
  }
  const next = called.state;
  const pending = found.free.length - (called.seated ? 1 : 0);
  io.saveBell(bellKey, pending > 0 ? { ...next, cooldown: RING_STAGGER, pending } : { ...next, cooldown: spawnDelay(rnd) });
  return { status: 'ok', spawned: 1 };
}

/**
 * Spawner first (a seat freed in this step is filled only after a fresh delay),
 * then one step per seated guest; the spawner and each guest are isolated by their own try/catch.
 * @param {string} bellKey
 * @param {number} dt
 * @param {GuestIo} io
 * @param {() => number} rnd
 */
function tickBell(bellKey, dt, io, rnd) {
  const type = io.blockTypeAt(bellKey);
  if (type === undefined) return; // chunk not loaded
  if (type !== BELL) {
    releaseBell(bellKey, io);
    return;
  }
  const loaded = loadBell(bellKey, io) ?? freeBell(rnd);
  /** @type {BellState} */
  let state;
  try {
    state = trySpawn(bellKey, loaded, dt, io, rnd);
  } catch (e) {
    // a failing spawner must not freeze the bell: retry later, the seated guests still step
    io.warn(`kochmod: spawning failed at bell ${bellKey}: ${e}`);
    const { pending: _, ...rest } = loaded;
    state = { ...rest, cooldown: RETRY_TICKS };
  }
  /** @type {Record<string, SeatEntry>} */
  const guests = { ...state.guests };
  let left = false;
  for (const [seat, entry] of Object.entries(loaded.guests)) {
    try {
      const next = stepGuest(seat, entry, dt, io, rnd);
      if (next) {
        guests[seat] = next;
      } else {
        delete guests[seat];
        left = true;
      }
    } catch (e) {
      io.warn(`kochmod: guest step failed at seat ${seat} of bell ${bellKey}: ${e}`);
    }
  }
  const cooldown = left && !state.pending ? spawnDelay(rnd) : state.cooldown;
  let takeaway = state.takeaway;
  if (loaded.takeaway) {
    try {
      takeaway = stepTakeaway(loaded.takeaway, dt, io, rnd) ?? undefined;
    } catch (e) {
      io.warn(`kochmod: takeaway guest step failed at bell ${bellKey}: ${e}`);
    }
  }
  const { takeaway: _t, ...base } = state;
  io.saveBell(bellKey, takeaway ? { ...base, guests, cooldown, takeaway } : { ...base, guests, cooldown });
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
    for (const entry of Object.values(loadBell(key, io)?.guests ?? {})) {
      if (entry.table !== tableKey) continue;
      const guest = io.getGuest(entry.guestId);
      if (guest && guest.data().phase === 'waiting') return guest;
    }
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
 * A held item is offered to the takeaway guest with this id.
 * @param {string} guestId
 * @param {string | null} held
 * @param {(id: string) => boolean} carried whether the player carries the item
 * @param {GuestIo} io
 * @param {() => number} [rnd]
 * @returns {{ take?: boolean, consume?: string, hint?: string } | null} null: no waiting takeaway guest with this id
 */
export function serveTakeaway(guestId, held, carried, io, rnd = Math.random) {
  const guest = io.getGuest(guestId);
  if (!guest) return null;
  const d = guest.data();
  if (d.phase !== 'takeaway_waiting') return null;
  if (held === null || !PIZZA_DISHES.includes(held)) {
    guest.react(false);
    return { hint: 'kochmod.hint.takeaway_pizza_only' };
  }
  if (!carried(PIZZA_BOX)) return { hint: 'kochmod.hint.need_pizza_box' };
  const { happy, emeralds } = rate(d.wish, held, new Set(['italian']), rnd);
  guest.look({ mood: happy ? 'happy' : 'grumpy', wish: 'none' });
  guest.react(happy);
  guest.pay(emeralds);
  guest.update({ served: held, phase: 'takeaway_leaving', timer: LEAVE_TICKS });
  return { take: true, consume: PIZZA_BOX };
}

/**
 * Removes guest entities that no bell lists under a seat (spawned but never
 * recorded, or left over after their bell was cleaned up). No poof: they just vanish.
 * @param {Guest[]} guests loaded guest entities
 * @param {GuestIo} io
 */
export function sweepOrphans(guests, io) {
  const listed = new Set();
  for (const key of io.registryList('bell')) {
    const state = loadBell(key, io);
    for (const entry of Object.values(state?.guests ?? {})) listed.add(entry.guestId);
    if (state?.takeaway) listed.add(state.takeaway.guestId);
  }
  for (const guest of guests) {
    if (!listed.has(guest.id)) guest.remove(false);
  }
}
