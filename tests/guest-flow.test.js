import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BELL, CHAIR, TABLE, RETRY_TICKS, MISSING_GRACE, RING_STAGGER,
  tickBells, guestAvailability, serveTable, findWaitingGuest, releaseBell, sweepOrphans, ringBell, migrateBellState,
} from '../packs/BP/scripts/logic/guest-flow.js';
import { WALK_TIMEOUT, EAT_TICKS, LEAVE_TICKS, SPAWN_MIN } from '../packs/BP/scripts/logic/restaurant.js';
import { locKey } from '../packs/BP/scripts/logic/store.js';

const D = 'minecraft:overworld';
/** @param {number} x @param {number} y @param {number} z */
const K = (x, y, z) => locKey(D, { x, y, z });

const BELL_KEY = K(0, 64, 0);
const CHAIR_KEY = K(3, 64, 0);
const TABLE_KEY = K(4, 64, 0); // east of the chair
const HAM = 'kochmod:hamburger';
const CHEESE = 'kochmod:cheeseburger';
const zero = () => 0;
/** @param {number} cooldown */
const FREE = (cooldown) => ({ guests: {}, cooldown });

/** @typedef {import('../packs/BP/scripts/logic/guest-flow.js').GuestData} GuestData */

/**
 * A small in-memory world: bell, chair next to a table, and the three stations.
 * @param {{ blocks?: Record<string, string | undefined | Error>, registries?: Record<string, string[]>, bells?: Record<string, any>, plates?: Record<string, string> }} [over]
 */
function fakeWorld(over = {}) {
  /** @type {Record<string, string | undefined | Error>} */
  const blocks = {
    [BELL_KEY]: BELL,
    [CHAIR_KEY]: CHAIR,
    [TABLE_KEY]: TABLE,
    ...over.blocks,
  };
  /** @type {Record<string, string[]>} */
  const registries = {
    bell: [BELL_KEY],
    chair: [CHAIR_KEY],
    table: [TABLE_KEY],
    grill: [K(5, 64, 5)],
    cutting_board: [K(6, 64, 5)],
    counter: [K(7, 64, 5)],
    ...over.registries,
  };
  /** @type {Record<string, any>} */
  const bells = { ...over.bells };
  /** @type {Record<string, string>} */
  const plates = { ...over.plates };
  /** @type {unknown[][]} */
  const log = [];
  /** @type {string[]} */
  const warnings = [];
  /** @type {Record<string, { data: GuestData, look: Record<string, string>, dist: number, removed: boolean }>} */
  const guests = {};
  let nextId = 1;

  /** @param {string} id @returns {import('../packs/BP/scripts/logic/guest-flow.js').Guest} */
  const handle = (id) => {
    const g = guests[id];
    return {
      id,
      data: () => ({ ...g.data }),
      update: (patch) => { Object.assign(g.data, patch); },
      look: (patch) => { Object.assign(g.look, patch); },
      distanceTo: () => g.dist,
      sit: (seat, table) => { log.push(['sit', id, seat, table]); },
      hold: () => { log.push(['hold', id]); },
      react: (happy) => { log.push(['react', id, happy]); },
      remove: (poof) => { g.removed = true; log.push(['remove', id, poof]); },
    };
  };

  /** @type {import('../packs/BP/scripts/logic/guest-flow.js').GuestIo} */
  const io = {
    blockTypeAt: (key) => {
      const b = blocks[key];
      if (b instanceof Error) throw b;
      return b;
    },
    registryList: (kind) => registries[kind] ?? [],
    loadBell: (key) => (bells[key] === undefined ? undefined : structuredClone(bells[key])),
    saveBell: (key, state) => { bells[key] = structuredClone(state); },
    forgetBell: (key) => {
      delete bells[key];
      registries.bell = (registries.bell ?? []).filter((k) => k !== key);
    },
    getGuest: (id) => (guests[id] && !guests[id].removed ? handle(id) : undefined),
    spawnGuest: (bellKey, data) => {
      const id = `g${nextId++}`;
      guests[id] = { data: { ...data }, look: {}, dist: 10, removed: false };
      log.push(['spawn', bellKey, id]);
      return handle(id);
    },
    getPlate: (key) => plates[key] ?? 'none',
    setPlate: (key, plate) => { plates[key] = plate; log.push(['plate', key, plate]); },
    payout: (key, emeralds) => { log.push(['payout', key, emeralds]); },
    warn: (message) => { warnings.push(message); },
  };

  /**
   * Puts a guest into the world with the given data and lists it under its
   * seat in its bell's state (unless `register` is false: a stray guest).
   * @param {Partial<GuestData>} data
   * @param {{ register?: boolean }} [opts]
   */
  const seatGuest = (data, { register = true } = {}) => {
    const id = `g${nextId++}`;
    const d = { phase: 'waiting', seat: CHAIR_KEY, table: TABLE_KEY, bell: BELL_KEY, timer: 0, served: '', wish: HAM, ...data };
    guests[id] = { data: d, look: {}, dist: 0, removed: false };
    if (register) {
      const state = bells[d.bell] ?? FREE(0);
      bells[d.bell] = { ...state, guests: { ...state.guests, [d.seat]: { guestId: id, table: d.table } } };
    }
    return id;
  };

  return { io, blocks, registries, bells, plates, log, warnings, guests, seatGuest, handle };
}

/** @param {ReturnType<typeof fakeWorld>} w @param {number} [dt] */
const tick = (w, dt = 20) => tickBells(w.io.registryList('bell'), dt, w.io, zero);

// ---- spawning

test('a bell without state starts a spawn countdown', () => {
  const w = fakeWorld();
  tick(w);
  assert.deepEqual(w.bells[BELL_KEY], FREE(SPAWN_MIN - 20));
  assert.equal(Object.keys(w.guests).length, 0);
});

test('the cooldown counts down without spawning', () => {
  const w = fakeWorld({ bells: { [BELL_KEY]: FREE(100) } });
  tick(w);
  assert.deepEqual(w.bells[BELL_KEY], FREE(80));
  assert.equal(Object.keys(w.guests).length, 0);
});

test('at 0 a guest spawns walking to the chair with a wish the kitchen can cook', () => {
  const w = fakeWorld({ bells: { [BELL_KEY]: FREE(20) } });
  tick(w);
  assert.deepEqual(w.log, [['spawn', BELL_KEY, 'g1']]);
  assert.deepEqual(w.guests.g1.data, {
    phase: 'walking', seat: CHAIR_KEY, table: TABLE_KEY, bell: BELL_KEY, timer: WALK_TIMEOUT, served: '', wish: HAM,
  });
  assert.deepEqual(w.bells[BELL_KEY], { guests: { [CHAIR_KEY]: { guestId: 'g1', table: TABLE_KEY } }, cooldown: SPAWN_MIN });
});

test('guestAvailability: ok with a seat at a table and all three stations', () => {
  const w = fakeWorld();
  assert.equal(guestAvailability(BELL_KEY, w.io), 'ok');
});

test('guestAvailability: no chair next to a table gives no_seat', () => {
  assert.equal(guestAvailability(BELL_KEY, fakeWorld({ registries: { chair: [] } }).io), 'no_seat');
  assert.equal(guestAvailability(BELL_KEY, fakeWorld({ blocks: { [TABLE_KEY]: undefined } }).io), 'no_seat');
  assert.equal(guestAvailability(BELL_KEY, fakeWorld({ registries: { chair: [K(40, 64, 0)] } }).io), 'no_seat');
});

test('guestAvailability: a seat taken by another bell gives no_seat', () => {
  const other = K(1, 64, 0);
  const w = fakeWorld({
    blocks: { [other]: BELL },
    registries: { bell: [BELL_KEY, other] },
    bells: { [other]: { guests: { [CHAIR_KEY]: { guestId: 'x', table: TABLE_KEY } }, cooldown: 0 } },
  });
  assert.equal(guestAvailability(BELL_KEY, w.io), 'no_seat');
});

test('guestAvailability: a missing station gives no_kitchen', () => {
  for (const kind of ['cutting_board', 'counter']) {
    assert.equal(guestAvailability(BELL_KEY, fakeWorld({ registries: { [kind]: [] } }).io), 'no_kitchen', kind);
  }
  assert.equal(guestAvailability(BELL_KEY, fakeWorld({ registries: { cutting_board: [K(50, 64, 5)] } }).io), 'no_kitchen');
});

test('guestAvailability: counter and cutting board alone offer no cuisine; a grill alone cooks nothing', () => {
  assert.equal(guestAvailability(BELL_KEY, fakeWorld({ registries: { grill: [] } }).io), 'no_kitchen');
  assert.equal(guestAvailability(BELL_KEY, fakeWorld({ registries: { cutting_board: [], counter: [] } }).io), 'no_kitchen');
});

test('guestAvailability: the seat is checked before the kitchen', () => {
  const w = fakeWorld({ registries: { chair: [], grill: [] } });
  assert.equal(guestAvailability(BELL_KEY, w.io), 'no_seat');
});

test('the spawn step spawns nothing unless availability is ok', () => {
  for (const registries of [{ chair: [] }, { cutting_board: [] }]) {
    const w = fakeWorld({ registries, bells: { [BELL_KEY]: FREE(0) } });
    tick(w);
    assert.equal(Object.keys(w.guests).length, 0);
    assert.deepEqual(w.bells[BELL_KEY], FREE(RETRY_TICKS));
  }
});

test('the wish is picked from the available dishes', () => {
  const w = fakeWorld({ bells: { [BELL_KEY]: FREE(0) } });
  // burger kitchen offers [hamburger, cheeseburger]; floor(0.6 * 2) = 1 picks the cheeseburger
  tickBells([BELL_KEY], 20, w.io, () => 0.6);
  assert.equal(w.guests.g1.data.wish, CHEESE);
});

test('no guest without a cutting board nearby: retry later', () => {
  const w = fakeWorld({ bells: { [BELL_KEY]: FREE(0) }, registries: { cutting_board: [] } });
  tick(w);
  assert.deepEqual(w.bells[BELL_KEY], FREE(RETRY_TICKS));
  assert.equal(Object.keys(w.guests).length, 0);
});

test('stations out of radius or in another dimension do not count', () => {
  for (const board of [K(17, 64, 0), locKey('minecraft:nether', { x: 5, y: 64, z: 5 })]) {
    const w = fakeWorld({ bells: { [BELL_KEY]: FREE(0) }, registries: { cutting_board: [board] } });
    tick(w);
    assert.equal(w.bells[BELL_KEY].cooldown, RETRY_TICKS, board);
    assert.equal(Object.keys(w.guests).length, 0, board);
  }
});

test('no guest without a chair next to a table: retry later', () => {
  const w = fakeWorld({ bells: { [BELL_KEY]: FREE(0) }, blocks: { [TABLE_KEY]: 'minecraft:air' } });
  tick(w);
  assert.deepEqual(w.bells[BELL_KEY], FREE(RETRY_TICKS));
  assert.equal(Object.keys(w.guests).length, 0);
});

test('a chair out of radius or not loaded is not a seat', () => {
  const far = K(20, 64, 0);
  const w = fakeWorld({
    bells: { [BELL_KEY]: FREE(0) },
    registries: { chair: [far, CHAIR_KEY] },
    blocks: { [far]: CHAIR, [K(21, 64, 0)]: TABLE, [CHAIR_KEY]: undefined },
  });
  tick(w);
  assert.equal(Object.keys(w.guests).length, 0);
  assert.equal(w.bells[BELL_KEY].cooldown, RETRY_TICKS);
});

test('a seat taken by the guest of another bell is not used; the nearest free seat is', () => {
  const other = K(1, 64, 1);
  const chair2 = K(3, 64, 3);
  const table2 = K(3, 64, 4); // south of chair2
  const near = K(1, 64, -1);
  const tableNear = K(1, 64, -2); // north of near
  const w = fakeWorld({
    registries: { bell: [BELL_KEY, other], chair: [CHAIR_KEY, chair2, near] },
    blocks: { [other]: BELL, [chair2]: CHAIR, [table2]: TABLE, [near]: CHAIR, [tableNear]: TABLE },
    bells: {
      [BELL_KEY]: FREE(0),
      [other]: { guests: { [near]: { guestId: 'gX', table: tableNear } }, cooldown: 0 },
    },
  });
  tickBells([BELL_KEY], 20, w.io, zero);
  assert.equal(w.guests.g1.data.seat, CHAIR_KEY);
  assert.equal(w.guests.g1.data.table, TABLE_KEY);
});

test('a table taken by the guest of another bell is not used', () => {
  const other = K(1, 64, 1);
  const chair2 = K(5, 64, 0); // also next to TABLE_KEY (west of it is CHAIR_KEY, east is chair2)
  const w = fakeWorld({
    registries: { bell: [BELL_KEY, other], chair: [chair2] },
    blocks: { [other]: BELL, [chair2]: CHAIR },
    bells: {
      [BELL_KEY]: FREE(0),
      [other]: { guests: { [CHAIR_KEY]: { guestId: 'gX', table: TABLE_KEY } }, cooldown: 0 },
    },
  });
  tickBells([BELL_KEY], 20, w.io, zero);
  assert.equal(Object.keys(w.guests).length, 0);
  assert.equal(w.bells[BELL_KEY].cooldown, RETRY_TICKS);
});

// ---- walking

test('walking: the timer counts down while the guest is far away', () => {
  const w = fakeWorld();
  const id = w.seatGuest({ phase: 'walking', timer: WALK_TIMEOUT });
  w.guests[id].dist = 10;
  tick(w);
  assert.equal(w.guests[id].data.phase, 'walking');
  assert.equal(w.guests[id].data.timer, WALK_TIMEOUT - 20);
  assert.ok(!w.log.some((e) => e[0] === 'sit'));
});

test('walking → waiting on arrival: sits down and shows the wish', () => {
  const w = fakeWorld();
  const id = w.seatGuest({ phase: 'walking', timer: WALK_TIMEOUT, wish: CHEESE });
  w.guests[id].dist = 1.5;
  tick(w);
  assert.deepEqual(w.log, [['sit', id, CHAIR_KEY, TABLE_KEY]]);
  assert.deepEqual(w.guests[id].look, { pose: 'sit', wish: 'cheeseburger' });
  assert.equal(w.guests[id].data.phase, 'waiting');
});

test('walking → waiting on timeout even when the guest never arrives', () => {
  const w = fakeWorld();
  const id = w.seatGuest({ phase: 'walking', timer: 20 });
  w.guests[id].dist = 50;
  tick(w);
  assert.deepEqual(w.log, [['sit', id, CHAIR_KEY, TABLE_KEY]]);
  assert.equal(w.guests[id].data.phase, 'waiting');
  assert.deepEqual(w.guests[id].look, { pose: 'sit', wish: 'hamburger' });
});

// ---- waiting

test('waiting never times out and keeps the guest on the seat', () => {
  const w = fakeWorld();
  const id = w.seatGuest({ phase: 'waiting' });
  for (let i = 0; i < 1000; i++) tick(w);
  assert.equal(w.guests[id].data.phase, 'waiting');
  assert.equal(w.guests[id].removed, false);
  assert.equal(w.bells[BELL_KEY].guests[CHAIR_KEY]?.guestId, id);
  assert.equal(w.log.filter((e) => e[0] === 'hold').length, 1000);
});

// ---- serving

test('findWaitingGuest finds only a waiting guest at that table', () => {
  const w = fakeWorld();
  const id = w.seatGuest({ phase: 'waiting' });
  assert.equal(findWaitingGuest(TABLE_KEY, w.io)?.id, id);
  assert.equal(findWaitingGuest(K(9, 9, 9), w.io), null);
  w.guests[id].data.phase = 'walking';
  assert.equal(findWaitingGuest(TABLE_KEY, w.io), null);
});

test('serveTable: the waiting guest starts eating and the bubble disappears', () => {
  const w = fakeWorld();
  const id = w.seatGuest({ phase: 'waiting' });
  assert.equal(serveTable(TABLE_KEY, HAM, w.io), true);
  assert.equal(w.guests[id].data.phase, 'eating');
  assert.equal(w.guests[id].data.served, HAM);
  assert.equal(w.guests[id].data.timer, EAT_TICKS);
  assert.deepEqual(w.guests[id].look, { wish: 'none' });
});

test('serveTable without a waiting guest does nothing', () => {
  const w = fakeWorld();
  const id = w.seatGuest({ phase: 'eating', timer: 40, served: HAM });
  assert.equal(serveTable(TABLE_KEY, HAM, w.io), false);
  assert.equal(w.guests[id].data.timer, 40);
});

// ---- eating → leaving → gone

test('eating counts down', () => {
  const w = fakeWorld();
  const id = w.seatGuest({ phase: 'eating', timer: EAT_TICKS, served: HAM });
  tick(w);
  assert.equal(w.guests[id].data.phase, 'eating');
  assert.equal(w.guests[id].data.timer, EAT_TICKS - 20);
});

test('eating → leaving, happy: nods, pays emeralds, plate becomes empty', () => {
  const w = fakeWorld({ plates: { [TABLE_KEY]: 'hamburger' } });
  const id = w.seatGuest({ phase: 'eating', timer: 20, wish: HAM, served: HAM });
  tickBells([BELL_KEY], 20, w.io, () => 0.99); // 1 + floor(0.99 * 3) = 3 emeralds
  assert.deepEqual(w.guests[id].look, { mood: 'happy' });
  assert.ok(w.log.some((e) => e[0] === 'react' && e[2] === true));
  assert.ok(w.log.some((e) => e[0] === 'payout' && e[1] === TABLE_KEY && e[2] === 3));
  assert.equal(w.plates[TABLE_KEY], 'empty');
  assert.equal(w.guests[id].data.phase, 'leaving');
  assert.equal(w.guests[id].data.timer, LEAVE_TICKS);
});

test('a cheeseburger for a hamburger wish pays one emerald; after the grill is gone it pays nothing', () => {
  const eat = (/** @type {boolean} */ grillStays) => {
    const w = fakeWorld({ plates: { [TABLE_KEY]: 'cheeseburger' } });
    const id = w.seatGuest({ phase: 'eating', timer: 20, wish: HAM, served: CHEESE });
    if (!grillStays) w.registries.grill = [];
    tickBells([BELL_KEY], 20, w.io, () => 0.99);
    return { w, id };
  };
  const a = eat(true);
  assert.ok(a.w.log.some((e) => e[0] === 'react' && e[2] === true));
  assert.ok(a.w.log.some((e) => e[0] === 'payout' && e[2] === 1));
  const b = eat(false);
  assert.ok(b.w.log.some((e) => e[0] === 'react' && e[2] === false));
  assert.ok(!b.w.log.some((e) => e[0] === 'payout'));
});

test('eating → leaving, grumpy: wrong dish gives no emeralds, plate becomes empty', () => {
  for (const served of ['kochmod:sushi', 'kochmod:failed_dish']) {
    const w = fakeWorld({ plates: { [TABLE_KEY]: served.slice('kochmod:'.length) } });
    const id = w.seatGuest({ phase: 'eating', timer: 20, wish: HAM, served });
    tick(w);
    assert.deepEqual(w.guests[id].look, { mood: 'grumpy' }, served);
    assert.ok(w.log.some((e) => e[0] === 'react' && e[2] === false), served);
    assert.ok(!w.log.some((e) => e[0] === 'payout'), served);
    assert.equal(w.plates[TABLE_KEY], 'empty', served);
    assert.equal(w.guests[id].data.phase, 'leaving', served);
  }
});

test('leaving counts down, then the guest vanishes with a poof and the bell waits for the next one', () => {
  const w = fakeWorld({ plates: { [TABLE_KEY]: 'empty' } });
  const id = w.seatGuest({ phase: 'leaving', timer: LEAVE_TICKS });
  tick(w);
  assert.equal(w.guests[id].data.timer, LEAVE_TICKS - 20);
  assert.equal(w.guests[id].removed, false);
  tick(w);
  assert.equal(w.guests[id].removed, true);
  assert.ok(w.log.some((e) => e[0] === 'remove' && e[2] === true));
  assert.deepEqual(w.bells[BELL_KEY], FREE(SPAWN_MIN));
  assert.equal(w.plates[TABLE_KEY], 'empty', 'the empty plate stays');
});

// ---- cleanup (Review Focus 2)

const PHASES = /** @type {const} */ (['walking', 'waiting', 'eating', 'leaving']);

test('chair gone in any phase: guest removed, dish plate reset, bell freed', () => {
  for (const phase of PHASES) {
    const w = fakeWorld({ blocks: { [CHAIR_KEY]: 'minecraft:air' }, plates: { [TABLE_KEY]: 'hamburger' } });
    const id = w.seatGuest({ phase, timer: 100, served: HAM });
    tick(w);
    assert.equal(w.guests[id].removed, true, phase);
    assert.equal(w.plates[TABLE_KEY], 'none', phase);
    assert.deepEqual(w.bells[BELL_KEY], FREE(SPAWN_MIN), phase);
  }
});

test('cleanup keeps an empty plate and a plate that is already clear', () => {
  for (const plate of ['empty', 'none']) {
    const w = fakeWorld({ blocks: { [CHAIR_KEY]: 'minecraft:air' }, plates: { [TABLE_KEY]: plate } });
    w.seatGuest({ phase: 'leaving', timer: 20 });
    tick(w);
    assert.equal(w.plates[TABLE_KEY], plate);
    assert.ok(!w.log.some((e) => e[0] === 'plate'), plate);
  }
});

test('table gone in any phase: guest removed, the missing table is not touched', () => {
  for (const phase of PHASES) {
    const w = fakeWorld({ blocks: { [TABLE_KEY]: 'minecraft:air' }, plates: { [TABLE_KEY]: 'hamburger' } });
    const id = w.seatGuest({ phase, timer: 100 });
    tick(w);
    assert.equal(w.guests[id].removed, true, phase);
    assert.ok(!w.log.some((e) => e[0] === 'plate'), phase);
    assert.equal(w.bells[BELL_KEY].guests[CHAIR_KEY], undefined, phase);
  }
});

test('bell gone in any phase: guest removed, dish plate reset, bell forgotten', () => {
  for (const phase of PHASES) {
    const w = fakeWorld({ blocks: { [BELL_KEY]: 'minecraft:air' }, plates: { [TABLE_KEY]: 'cheeseburger' } });
    const id = w.seatGuest({ phase, timer: 100 });
    tick(w);
    assert.equal(w.guests[id].removed, true, phase);
    assert.equal(w.plates[TABLE_KEY], 'none', phase);
    assert.equal(w.bells[BELL_KEY], undefined, phase);
    assert.deepEqual(w.registries.bell, [], phase);
  }
});

test('releaseBell (bell broken) removes its guest, clears the dish and forgets the bell', () => {
  const w = fakeWorld({ plates: { [TABLE_KEY]: 'failed_dish' } });
  const id = w.seatGuest({ phase: 'eating', timer: 40 });
  releaseBell(BELL_KEY, w.io);
  assert.equal(w.guests[id].removed, true);
  assert.equal(w.plates[TABLE_KEY], 'none');
  assert.equal(w.bells[BELL_KEY], undefined);
  assert.deepEqual(w.registries.bell, []);
});

test('guest entity missing in any phase: bell freed after a short grace period', () => {
  for (const phase of PHASES) {
    const w = fakeWorld({ plates: { [TABLE_KEY]: 'hamburger' } });
    const id = w.seatGuest({ phase, timer: 100 });
    w.guests[id].removed = true; // entity is gone from the world
    for (let i = 1; i < MISSING_GRACE; i++) {
      tick(w);
      assert.equal(w.bells[BELL_KEY].guests[CHAIR_KEY]?.guestId, id, `${phase} still waiting for the entity (${i})`);
      assert.equal(w.bells[BELL_KEY].guests[CHAIR_KEY]?.missing, i, phase);
    }
    tick(w);
    assert.deepEqual(w.bells[BELL_KEY], FREE(SPAWN_MIN), phase);
    assert.equal(w.plates[TABLE_KEY], 'none', phase);
  }
});

test('a guest that shows up again resets the missing count', () => {
  const w = fakeWorld();
  const id = w.seatGuest({ phase: 'waiting' });
  w.guests[id].removed = true;
  tick(w);
  assert.equal(w.bells[BELL_KEY].guests[CHAIR_KEY]?.missing, 1);
  w.guests[id].removed = false;
  tick(w);
  assert.equal(w.bells[BELL_KEY].guests[CHAIR_KEY]?.missing, undefined);
  assert.equal(w.bells[BELL_KEY].guests[CHAIR_KEY]?.guestId, id);
});

test('an unknown phase is cleaned up', () => {
  const w = fakeWorld();
  const id = w.seatGuest({ phase: '' });
  tick(w);
  assert.equal(w.guests[id].removed, true);
  assert.equal(w.bells[BELL_KEY].guests[CHAIR_KEY], undefined);
});

// ---- loading and isolation

test('an unloaded bell is skipped', () => {
  const w = fakeWorld({ blocks: { [BELL_KEY]: undefined }, bells: { [BELL_KEY]: FREE(20) } });
  tick(w);
  assert.deepEqual(w.bells[BELL_KEY], FREE(20));
  assert.deepEqual(w.log, []);
});

test('an unloaded chair or table pauses the guest instead of cleaning up', () => {
  for (const key of [CHAIR_KEY, TABLE_KEY]) {
    const w = fakeWorld({ blocks: { [key]: undefined } });
    const id = w.seatGuest({ phase: 'eating', timer: 20, served: HAM });
    tick(w);
    assert.equal(w.guests[id].removed, false, key);
    assert.equal(w.guests[id].data.phase, 'eating', key);
    assert.equal(w.bells[BELL_KEY].guests[CHAIR_KEY]?.guestId, id, key);
  }
});

test('one failing bell does not stop the others', () => {
  const bad = K(-5, 64, 0);
  const w = fakeWorld({
    registries: { bell: [bad, BELL_KEY] },
    blocks: { [bad]: new Error('boom') },
    bells: { [BELL_KEY]: FREE(100) },
  });
  tick(w);
  assert.equal(w.warnings.length, 1);
  assert.match(w.warnings[0], /boom/);
  assert.equal(w.bells[BELL_KEY].cooldown, 80);
});

test('a guest throwing in the middle of its step does not stop the other bells', () => {
  const other = K(-3, 64, 0);
  const w = fakeWorld({ registries: { bell: [BELL_KEY, other] }, blocks: { [other]: BELL } });
  const id = w.seatGuest({ phase: 'waiting' });
  w.bells[other] = FREE(100);
  w.io.getGuest = () => { throw new Error('entity broke'); };
  tick(w);
  assert.equal(w.warnings.length, 1);
  assert.equal(w.bells[other].cooldown, 80);
  assert.equal(w.bells[BELL_KEY].guests[CHAIR_KEY]?.guestId, id);
});

// ---- orphans

test('sweepOrphans removes guests no bell points at', () => {
  const w = fakeWorld();
  const stray = w.handle(w.seatGuest({ phase: 'waiting' }, { register: false }));
  const noBell = w.handle(w.seatGuest({ phase: 'waiting', bell: K(9, 9, 9) }, { register: false }));
  const kept = w.handle(w.seatGuest({ phase: 'waiting' })); // the bell points at this one
  sweepOrphans([stray, noBell, kept], w.io);
  assert.equal(w.guests[kept.id].removed, false);
  assert.equal(w.guests[stray.id].removed, true);
  assert.equal(w.guests[noBell.id].removed, true);
  assert.ok(w.log.every((e) => e[0] !== 'remove' || e[2] === false), 'no poof for orphans');
});

// ---- several guests per bell

const SEAT2 = K(3, 64, 3);
const TABLE2 = K(4, 64, 3);
const SEAT3 = K(3, 64, 6);
const TABLE3 = K(4, 64, 6);

/** A world with three seats in range of the bell (nearest first: CHAIR_KEY, SEAT2, SEAT3). @param {Parameters<typeof fakeWorld>[0]} [over] */
function threeSeats(over = {}) {
  return fakeWorld({
    ...over,
    blocks: { [SEAT2]: CHAIR, [TABLE2]: TABLE, [SEAT3]: CHAIR, [TABLE3]: TABLE, ...over.blocks },
    registries: { chair: [SEAT3, CHAIR_KEY, SEAT2], table: [TABLE_KEY, TABLE2, TABLE3], ...over.registries },
  });
}

/** @param {ReturnType<typeof fakeWorld>} w */
const spawned = (w) => w.log.filter((e) => e[0] === 'spawn').map((e) => e[2]);

test('ringing with 3 free seats calls 3 guests, one every RING_STAGGER ticks', () => {
  const w = threeSeats();
  assert.equal(RING_STAGGER, 10);
  assert.deepEqual(ringBell(BELL_KEY, w.io, zero), { status: 'ok', spawned: 1 });
  assert.deepEqual(spawned(w), ['g1']);
  assert.equal(w.guests.g1.data.seat, CHAIR_KEY);
  assert.equal(w.bells[BELL_KEY].pending, 2);
  assert.equal(w.bells[BELL_KEY].cooldown, RING_STAGGER);
  tick(w, 10);
  assert.deepEqual(spawned(w), ['g1', 'g2']);
  assert.equal(w.guests.g2.data.seat, SEAT2);
  assert.equal(w.guests.g2.data.table, TABLE2);
  assert.equal(w.bells[BELL_KEY].pending, 1);
  tick(w, 10);
  assert.deepEqual(spawned(w), ['g1', 'g2', 'g3']);
  assert.equal(w.guests.g3.data.seat, SEAT3);
  assert.deepEqual(w.bells[BELL_KEY], {
    guests: {
      [CHAIR_KEY]: { guestId: 'g1', table: TABLE_KEY },
      [SEAT2]: { guestId: 'g2', table: TABLE2 },
      [SEAT3]: { guestId: 'g3', table: TABLE3 },
    },
    cooldown: SPAWN_MIN,
  });
  tick(w, 10);
  assert.equal(spawned(w).length, 3, 'no further guest after the staggered ones');
});

test('ringing again when every seat is taken: full, nobody comes', () => {
  const w = threeSeats();
  ringBell(BELL_KEY, w.io, zero);
  tick(w, 10);
  tick(w, 10);
  const before = structuredClone(w.bells[BELL_KEY]);
  assert.deepEqual(ringBell(BELL_KEY, w.io, zero), { status: 'full', spawned: 0 });
  assert.equal(spawned(w).length, 3);
  assert.deepEqual(w.bells[BELL_KEY], before);
});

test('ringing: seats taken by another bell count as full; no seat and no kitchen spawn nobody', () => {
  const other = K(1, 64, 1);
  const w = fakeWorld({
    blocks: { [other]: BELL },
    registries: { bell: [BELL_KEY, other] },
    bells: { [other]: { guests: { [CHAIR_KEY]: { guestId: 'x', table: TABLE_KEY } }, cooldown: 0 } },
  });
  assert.deepEqual(ringBell(BELL_KEY, w.io, zero), { status: 'full', spawned: 0 });
  for (const [registries, status] of /** @type {const} */ ([[{ chair: [] }, 'no_seat'], [{ cutting_board: [] }, 'no_kitchen']])) {
    const v = fakeWorld({ registries });
    assert.deepEqual(ringBell(BELL_KEY, v.io, zero), { status, spawned: 0 }, status);
    assert.equal(spawned(v).length, 0, status);
  }
});

test('ringing with one free seat calls one guest and keeps the normal spawn delay', () => {
  const w = fakeWorld({ bells: { [BELL_KEY]: FREE(300) } });
  assert.deepEqual(ringBell(BELL_KEY, w.io, zero), { status: 'ok', spawned: 1 });
  assert.deepEqual(w.bells[BELL_KEY], { guests: { [CHAIR_KEY]: { guestId: 'g1', table: TABLE_KEY } }, cooldown: SPAWN_MIN });
});

test('a staggered guest whose seat is gone meanwhile stops the queue', () => {
  const w = threeSeats({ registries: { chair: [CHAIR_KEY, SEAT2] } });
  ringBell(BELL_KEY, w.io, zero);
  assert.equal(w.bells[BELL_KEY].pending, 1);
  w.registries.chair = [CHAIR_KEY]; // the second chair was broken
  tick(w, 10);
  assert.equal(spawned(w).length, 1);
  assert.deepEqual(w.bells[BELL_KEY], { guests: { [CHAIR_KEY]: { guestId: 'g1', table: TABLE_KEY } }, cooldown: RETRY_TICKS });
});

test('a guest leaving frees exactly its seat; the others stay', () => {
  const w = threeSeats({ plates: { [TABLE2]: 'empty' } });
  const a = w.seatGuest({ phase: 'waiting' });
  const b = w.seatGuest({ phase: 'leaving', timer: 20, seat: SEAT2, table: TABLE2 });
  const c = w.seatGuest({ phase: 'eating', timer: 400, seat: SEAT3, table: TABLE3, served: HAM });
  tick(w);
  assert.equal(w.guests[b].removed, true);
  assert.equal(w.guests[a].removed, false);
  assert.equal(w.guests[c].removed, false);
  assert.equal(w.guests[c].data.timer, 380, 'the other guests keep going');
  assert.deepEqual(w.bells[BELL_KEY], {
    guests: { [CHAIR_KEY]: { guestId: a, table: TABLE_KEY }, [SEAT3]: { guestId: c, table: TABLE3 } },
    cooldown: SPAWN_MIN,
  });
  assert.equal(spawned(w).length, 0, 'the freed seat is filled after a fresh spawn delay');
});

test('the spawner fills one free seat per cooldown', () => {
  const w = threeSeats({ bells: { [BELL_KEY]: FREE(20) } });
  tick(w);
  assert.deepEqual(spawned(w), ['g1']);
  assert.equal(w.bells[BELL_KEY].cooldown, SPAWN_MIN);
  tick(w, SPAWN_MIN - 20);
  assert.deepEqual(spawned(w), ['g1']);
  tick(w, 20);
  assert.deepEqual(spawned(w), ['g1', 'g2']);
  assert.equal(w.guests.g2.data.seat, SEAT2);
  tick(w, SPAWN_MIN);
  assert.equal(w.guests.g3.data.seat, SEAT3);
  tick(w, SPAWN_MIN);
  assert.equal(spawned(w).length, 3, 'all seats taken');
  assert.equal(w.bells[BELL_KEY].cooldown, RETRY_TICKS);
  assert.equal(Object.keys(w.bells[BELL_KEY].guests).length, 3);
});

test('two bells sharing one seat never double-book it', () => {
  const other = K(1, 64, 1);
  const w = fakeWorld({
    blocks: { [other]: BELL },
    registries: { bell: [BELL_KEY, other] },
    bells: { [BELL_KEY]: FREE(0), [other]: FREE(0) },
  });
  tick(w);
  assert.deepEqual(spawned(w), ['g1']);
  assert.deepEqual(w.bells[BELL_KEY].guests, { [CHAIR_KEY]: { guestId: 'g1', table: TABLE_KEY } });
  assert.deepEqual(w.bells[other], FREE(RETRY_TICKS));
  assert.equal(guestAvailability(other, w.io), 'no_seat');
  assert.deepEqual(ringBell(other, w.io, zero), { status: 'full', spawned: 0 });
});

test('guestAvailability is ok while at least one seat is free', () => {
  const w = threeSeats();
  w.seatGuest({ phase: 'waiting' });
  w.seatGuest({ phase: 'waiting', seat: SEAT2, table: TABLE2 });
  assert.equal(guestAvailability(BELL_KEY, w.io), 'ok');
  w.seatGuest({ phase: 'waiting', seat: SEAT3, table: TABLE3 });
  assert.equal(guestAvailability(BELL_KEY, w.io), 'no_seat');
});

test('findWaitingGuest and serveTable pick the guest at the served table', () => {
  const w = threeSeats();
  const a = w.seatGuest({ phase: 'waiting' });
  const b = w.seatGuest({ phase: 'waiting', seat: SEAT2, table: TABLE2, wish: CHEESE });
  assert.equal(findWaitingGuest(TABLE2, w.io)?.id, b);
  assert.equal(findWaitingGuest(TABLE_KEY, w.io)?.id, a);
  assert.equal(serveTable(TABLE2, CHEESE, w.io), true);
  assert.equal(w.guests[b].data.phase, 'eating');
  assert.equal(w.guests[a].data.phase, 'waiting');
  assert.equal(findWaitingGuest(TABLE2, w.io), null);
});

test('sweepOrphans keeps every guest listed under a seat', () => {
  const w = threeSeats();
  const a = w.handle(w.seatGuest({ phase: 'waiting' }));
  const b = w.handle(w.seatGuest({ phase: 'eating', seat: SEAT2, table: TABLE2 }));
  const stray = w.handle(w.seatGuest({ phase: 'waiting', seat: SEAT3, table: TABLE3 }, { register: false }));
  sweepOrphans([a, b, stray], w.io);
  assert.equal(w.guests[a.id].removed, false);
  assert.equal(w.guests[b.id].removed, false);
  assert.equal(w.guests[stray.id].removed, true);
});

test('releaseBell removes all guests of the bell and clears their dishes', () => {
  const w = threeSeats({ plates: { [TABLE_KEY]: 'hamburger', [TABLE2]: 'empty' } });
  const a = w.seatGuest({ phase: 'eating' });
  const b = w.seatGuest({ phase: 'leaving', seat: SEAT2, table: TABLE2 });
  releaseBell(BELL_KEY, w.io);
  assert.equal(w.guests[a].removed, true);
  assert.equal(w.guests[b].removed, true);
  assert.equal(w.plates[TABLE_KEY], 'none');
  assert.equal(w.plates[TABLE2], 'empty');
  assert.equal(w.bells[BELL_KEY], undefined);
});

test('a missing guest entity frees only its own seat after the grace period', () => {
  const w = threeSeats({ registries: { chair: [CHAIR_KEY, SEAT2] } });
  const a = w.seatGuest({ phase: 'waiting' });
  const b = w.seatGuest({ phase: 'waiting', seat: SEAT2, table: TABLE2 });
  w.guests[b].removed = true;
  for (let i = 0; i < MISSING_GRACE; i++) tick(w);
  assert.deepEqual(w.bells[BELL_KEY].guests, { [CHAIR_KEY]: { guestId: a, table: TABLE_KEY } });
});

test('garbage seat entries are dropped without throwing', () => {
  const w = threeSeats({
    bells: { [BELL_KEY]: { guests: { [CHAIR_KEY]: 'junk', [SEAT2]: { guestId: 5, table: TABLE2 }, [SEAT3]: null }, cooldown: 100 } },
  });
  tick(w);
  assert.deepEqual(w.warnings, []);
  assert.deepEqual(w.bells[BELL_KEY], FREE(80));
});

// ---- migration of the stage 1 bell state

test('migrateBellState: a free stage 1 bell keeps its cooldown', () => {
  assert.deepEqual(migrateBellState({ guestId: null, cooldown: 250 }), FREE(250));
});

test('migrateBellState: a stage 1 guest moves under its seat', () => {
  assert.deepEqual(
    migrateBellState({ guestId: 'g7', cooldown: 0, seat: CHAIR_KEY, table: TABLE_KEY, missing: 2 }),
    { guests: { [CHAIR_KEY]: { guestId: 'g7', table: TABLE_KEY, missing: 2 } }, cooldown: 0 },
  );
  assert.deepEqual(
    migrateBellState({ guestId: 'g7', cooldown: 0, seat: CHAIR_KEY, table: TABLE_KEY }),
    { guests: { [CHAIR_KEY]: { guestId: 'g7', table: TABLE_KEY } }, cooldown: 0 },
  );
});

test('migrateBellState: the new shape passes through unchanged', () => {
  const state = { guests: { [CHAIR_KEY]: { guestId: 'g1', table: TABLE_KEY, missing: 1 } }, cooldown: 30, pending: 2 };
  assert.deepEqual(migrateBellState(structuredClone(state)), state);
  assert.deepEqual(migrateBellState(FREE(5)), FREE(5));
});

test('migrateBellState: garbage becomes a free bell that retries later', () => {
  for (const saved of [undefined, null, 42, 'bell', [], { cooldown: 'soon' }, { guests: 'many', cooldown: 5 }]) {
    assert.deepEqual(migrateBellState(saved), FREE(RETRY_TICKS), JSON.stringify(saved));
  }
});

test('an old world keeps its seated guest after the migration', () => {
  const w = fakeWorld();
  const id = w.seatGuest({ phase: 'waiting' }, { register: false });
  w.bells[BELL_KEY] = { guestId: id, cooldown: 0, seat: CHAIR_KEY, table: TABLE_KEY };
  assert.equal(findWaitingGuest(TABLE_KEY, w.io)?.id, id);
  sweepOrphans([w.handle(id)], w.io);
  assert.equal(w.guests[id].removed, false);
  tick(w);
  assert.equal(w.guests[id].removed, false);
  assert.deepEqual(w.bells[BELL_KEY], { guests: { [CHAIR_KEY]: { guestId: id, table: TABLE_KEY } }, cooldown: RETRY_TICKS });
  assert.deepEqual(w.log, [['hold', id]]);
});

// ---- spawner errors

test('a throwing spawner does not freeze the bell: warn, retry later, seated guests still step', () => {
  const w = threeSeats({ bells: { [BELL_KEY]: FREE(0) } });
  const id = w.seatGuest({ phase: 'eating', timer: 400, served: HAM });
  w.io.spawnGuest = () => { throw new Error('boom'); };
  tick(w);
  assert.equal(w.guests[id].data.timer, 380, 'the seated guest keeps eating');
  assert.deepEqual(w.bells[BELL_KEY], { guests: { [CHAIR_KEY]: { guestId: id, table: TABLE_KEY } }, cooldown: RETRY_TICKS });
  assert.equal(w.warnings.length, 1);
  assert.match(w.warnings[0], /boom/);
});

test('a throwing spawner during a ring drops the pending guests and retries later', () => {
  const w = threeSeats({ bells: { [BELL_KEY]: { guests: {}, cooldown: 0, pending: 2 } } });
  w.io.spawnGuest = () => { throw new Error('boom'); };
  tick(w);
  assert.deepEqual(w.bells[BELL_KEY], { guests: {}, cooldown: RETRY_TICKS });
  assert.equal(w.warnings.length, 1);
});

test('after a soup the table keeps an empty bowl, after a burger an empty plate', () => {
  for (const [served, left] of [['kochmod:ramen', 'empty_bowl'], [HAM, 'empty']]) {
    const w = fakeWorld({ plates: { [TABLE_KEY]: served.slice('kochmod:'.length) } });
    w.seatGuest({ phase: 'eating', timer: 20, wish: served, served });
    tick(w);
    assert.equal(w.plates[TABLE_KEY], left, served);
  }
});
