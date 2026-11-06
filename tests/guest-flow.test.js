import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BELL, CHAIR, TABLE, RETRY_TICKS, MISSING_GRACE,
  tickBells, serveTable, findWaitingGuest, releaseBell, sweepOrphans,
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
   * Puts a guest into the world with the given data and points the bell at it.
   * @param {Partial<GuestData>} data
   */
  const seatGuest = (data) => {
    const id = `g${nextId++}`;
    guests[id] = {
      data: { phase: 'waiting', seat: CHAIR_KEY, table: TABLE_KEY, bell: BELL_KEY, timer: 0, served: '', wish: HAM, ...data },
      look: {},
      dist: 0,
      removed: false,
    };
    bells[BELL_KEY] = { guestId: id, cooldown: 0, seat: CHAIR_KEY, table: TABLE_KEY };
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
  assert.deepEqual(w.bells[BELL_KEY], { guestId: null, cooldown: SPAWN_MIN - 20 });
  assert.equal(Object.keys(w.guests).length, 0);
});

test('the cooldown counts down without spawning', () => {
  const w = fakeWorld({ bells: { [BELL_KEY]: { guestId: null, cooldown: 100 } } });
  tick(w);
  assert.deepEqual(w.bells[BELL_KEY], { guestId: null, cooldown: 80 });
  assert.equal(Object.keys(w.guests).length, 0);
});

test('at 0 a guest spawns walking to the chair with a wish the kitchen can cook', () => {
  const w = fakeWorld({ bells: { [BELL_KEY]: { guestId: null, cooldown: 20 } } });
  tick(w);
  assert.deepEqual(w.log, [['spawn', BELL_KEY, 'g1']]);
  assert.deepEqual(w.guests.g1.data, {
    phase: 'walking', seat: CHAIR_KEY, table: TABLE_KEY, bell: BELL_KEY, timer: WALK_TIMEOUT, served: '', wish: HAM,
  });
  assert.deepEqual(w.bells[BELL_KEY], { guestId: 'g1', cooldown: 0, seat: CHAIR_KEY, table: TABLE_KEY });
});

test('the wish is picked from the available dishes', () => {
  const w = fakeWorld({ bells: { [BELL_KEY]: { guestId: null, cooldown: 0 } } });
  tickBells([BELL_KEY], 20, w.io, () => 0.99);
  assert.equal(w.guests.g1.data.wish, CHEESE);
});

test('no guest without a grill nearby: retry later', () => {
  const w = fakeWorld({ bells: { [BELL_KEY]: { guestId: null, cooldown: 0 } }, registries: { grill: [] } });
  tick(w);
  assert.deepEqual(w.bells[BELL_KEY], { guestId: null, cooldown: RETRY_TICKS });
  assert.equal(Object.keys(w.guests).length, 0);
});

test('stations out of radius or in another dimension do not count', () => {
  for (const grill of [K(17, 64, 0), locKey('minecraft:nether', { x: 5, y: 64, z: 5 })]) {
    const w = fakeWorld({ bells: { [BELL_KEY]: { guestId: null, cooldown: 0 } }, registries: { grill: [grill] } });
    tick(w);
    assert.equal(w.bells[BELL_KEY].cooldown, RETRY_TICKS, grill);
    assert.equal(Object.keys(w.guests).length, 0, grill);
  }
});

test('no guest without a chair next to a table: retry later', () => {
  const w = fakeWorld({ bells: { [BELL_KEY]: { guestId: null, cooldown: 0 } }, blocks: { [TABLE_KEY]: 'minecraft:air' } });
  tick(w);
  assert.deepEqual(w.bells[BELL_KEY], { guestId: null, cooldown: RETRY_TICKS });
  assert.equal(Object.keys(w.guests).length, 0);
});

test('a chair out of radius or not loaded is not a seat', () => {
  const far = K(20, 64, 0);
  const w = fakeWorld({
    bells: { [BELL_KEY]: { guestId: null, cooldown: 0 } },
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
      [BELL_KEY]: { guestId: null, cooldown: 0 },
      [other]: { guestId: 'gX', cooldown: 0, seat: near, table: tableNear },
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
      [BELL_KEY]: { guestId: null, cooldown: 0 },
      [other]: { guestId: 'gX', cooldown: 0, seat: CHAIR_KEY, table: TABLE_KEY },
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
  assert.equal(w.bells[BELL_KEY].guestId, id);
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

test('eating → leaving, grumpy: wrong dish gives no emeralds, plate becomes empty', () => {
  for (const served of [CHEESE, 'kochmod:failed_dish']) {
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
  assert.deepEqual(w.bells[BELL_KEY], { guestId: null, cooldown: SPAWN_MIN });
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
    assert.deepEqual(w.bells[BELL_KEY], { guestId: null, cooldown: SPAWN_MIN }, phase);
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
    assert.equal(w.bells[BELL_KEY].guestId, null, phase);
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
  releaseBell(BELL_KEY, w.io, zero);
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
      assert.equal(w.bells[BELL_KEY].guestId, id, `${phase} still waiting for the entity (${i})`);
      assert.equal(w.bells[BELL_KEY].missing, i, phase);
    }
    tick(w);
    assert.deepEqual(w.bells[BELL_KEY], { guestId: null, cooldown: SPAWN_MIN }, phase);
    assert.equal(w.plates[TABLE_KEY], 'none', phase);
  }
});

test('a guest that shows up again resets the missing count', () => {
  const w = fakeWorld();
  const id = w.seatGuest({ phase: 'waiting' });
  w.guests[id].removed = true;
  tick(w);
  assert.equal(w.bells[BELL_KEY].missing, 1);
  w.guests[id].removed = false;
  tick(w);
  assert.equal(w.bells[BELL_KEY].missing, undefined);
  assert.equal(w.bells[BELL_KEY].guestId, id);
});

test('an unknown phase is cleaned up', () => {
  const w = fakeWorld();
  const id = w.seatGuest({ phase: '' });
  tick(w);
  assert.equal(w.guests[id].removed, true);
  assert.equal(w.bells[BELL_KEY].guestId, null);
});

// ---- loading and isolation

test('an unloaded bell is skipped', () => {
  const w = fakeWorld({ blocks: { [BELL_KEY]: undefined }, bells: { [BELL_KEY]: { guestId: null, cooldown: 20 } } });
  tick(w);
  assert.deepEqual(w.bells[BELL_KEY], { guestId: null, cooldown: 20 });
  assert.deepEqual(w.log, []);
});

test('an unloaded chair or table pauses the guest instead of cleaning up', () => {
  for (const key of [CHAIR_KEY, TABLE_KEY]) {
    const w = fakeWorld({ blocks: { [key]: undefined } });
    const id = w.seatGuest({ phase: 'eating', timer: 20, served: HAM });
    tick(w);
    assert.equal(w.guests[id].removed, false, key);
    assert.equal(w.guests[id].data.phase, 'eating', key);
    assert.equal(w.bells[BELL_KEY].guestId, id, key);
  }
});

test('one failing bell does not stop the others', () => {
  const bad = K(-5, 64, 0);
  const w = fakeWorld({
    registries: { bell: [bad, BELL_KEY] },
    blocks: { [bad]: new Error('boom') },
    bells: { [BELL_KEY]: { guestId: null, cooldown: 100 } },
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
  w.bells[other] = { guestId: null, cooldown: 100 };
  w.io.getGuest = () => { throw new Error('entity broke'); };
  tick(w);
  assert.equal(w.warnings.length, 1);
  assert.equal(w.bells[other].cooldown, 80);
  assert.equal(w.bells[BELL_KEY].guestId, id);
});

// ---- orphans

test('sweepOrphans removes guests no bell points at', () => {
  const w = fakeWorld();
  const stray = w.handle(w.seatGuest({ phase: 'waiting' }));
  const noBell = w.handle(w.seatGuest({ phase: 'waiting', bell: K(9, 9, 9) }));
  const kept = w.handle(w.seatGuest({ phase: 'waiting' })); // the bell points at this one
  sweepOrphans([stray, noBell, kept], w.io);
  assert.equal(w.guests[kept.id].removed, false);
  assert.equal(w.guests[stray.id].removed, true);
  assert.equal(w.guests[noBell.id].removed, true);
  assert.ok(w.log.every((e) => e[0] !== 'remove' || e[2] === false), 'no poof for orphans');
});
