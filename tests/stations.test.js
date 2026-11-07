import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL, COUNTER_MAX, WASH_TICKS, DISHWASHER_MAX, CABINET_MAX,
  grillInteract, grillTick, grillView, grillDrops,
  dishwasherInteract, dishwasherTick, dishwasherView, dishwasherDrops,
  cabinetInteract, cabinetView, cabinetDrops,
  boardInteract, boardView, boardDrops,
  counterInteract, counterView, counterDrops,
  timedStation, grill, migrateStationState, COUNTER_LAYERS,
} from '../packs/BP/scripts/logic/stations.js';
import { CUTTABLE } from '../packs/BP/scripts/logic/processes.js';
import { BURNT_AT, COOKED_AT } from '../packs/BP/scripts/logic/cooking.js';

const k = (/** @type {string} */ id) => `kochmod:${id}`;
const ING = ['bun', 'raw_patty', 'cooked_patty', 'burnt_patty', 'lettuce', 'tomato', 'tomato_slices', 'cheese'].map(k);

/** @param {any} r */
const noFields = (r) => {
  for (const f of ['take', 'give', 'count', 'hint', 'sound']) assert.equal(f in r, false, `${f} should be absent`);
};

// ---- Grill (timed-station factory with the stage 1 grill rules, through the aliases)
const RAW = k('raw_patty');
test('grill: empty + raw_patty starts cooking', () => {
  const r = grillInteract(INITIAL.grill, RAW);
  assert.deepEqual(r.state, { item: RAW, ticks: 0 });
  assert.equal(r.take, true);
  assert.equal(r.sound, 'kochmod.sizzle');
});
test('grill: occupied + raw_patty is full', () => {
  const s = { item: RAW, ticks: 5 };
  const r = grillInteract(s, RAW);
  assert.deepEqual(r.state, s);
  assert.equal(r.hint, 'kochmod.hint.grill_full');
  assert.equal(r.take, undefined);
});
for (const [ticks, out] of /** @type {const} */ ([[0, 'raw_patty'], [200, 'cooked_patty'], [800, 'burnt_patty']])) {
  test(`grill: spatula at ${ticks} gives ${out}`, () => {
    const r = grillInteract({ item: RAW, ticks }, k('spatula'));
    assert.equal(r.give, k(out));
    assert.deepEqual(r.state, { item: null, ticks: 0 });
  });
}
test('grill: occupied + other or empty hand needs spatula', () => {
  for (const held of [k('knife'), k('bun'), null]) {
    const s = { item: RAW, ticks: 9 };
    const r = grillInteract(s, held);
    assert.deepEqual(r.state, s);
    assert.equal(r.hint, 'kochmod.hint.need_spatula');
    assert.equal(r.take, undefined);
  }
});
test('grill: empty + anything else is unchanged with no fields', () => {
  for (const held of [k('cooked_patty'), k('spatula'), null]) {
    const r = grillInteract(INITIAL.grill, held);
    assert.deepEqual(r, { state: INITIAL.grill });
    noFields(r);
  }
});
test('grill: tick only while an item is on it, caps at BURNT_AT, 16x10 is cooked', () => {
  assert.deepEqual(grillTick({ item: null, ticks: 0 }, 50), { item: null, ticks: 0 });
  assert.deepEqual(grillTick({ item: RAW, ticks: 700 }, 500), { item: RAW, ticks: BURNT_AT });
  /** @type {import('../packs/BP/scripts/logic/stations.js').TimedState} */
  let s = { item: RAW, ticks: 0 };
  for (let i = 0; i < 10; i++) s = grillTick(s, 16);
  assert.equal(grillView(s), 'cooked');
});
test('grill: view', () => {
  assert.equal(grillView(INITIAL.grill), 'empty');
  assert.equal(grillView({ item: RAW, ticks: 0 }), 'raw');
  assert.equal(grillView({ item: RAW, ticks: 160 }), 'cooked');
  assert.equal(grillView({ item: RAW, ticks: 760 }), 'burnt');
});
test('grill: drops', () => {
  assert.deepEqual(grillDrops(INITIAL.grill), []);
  assert.deepEqual(grillDrops({ item: RAW, ticks: 0 }), [RAW]);
  assert.deepEqual(grillDrops({ item: RAW, ticks: 200 }), [k('cooked_patty')]);
  assert.deepEqual(grillDrops({ item: RAW, ticks: 760 }), [k('burnt_patty')]);
});
test('grill: initial state and aliases come from the factory', () => {
  assert.deepEqual(INITIAL.grill, { item: null, ticks: 0 });
  assert.deepEqual(grill.INITIAL, INITIAL.grill);
  assert.equal(grillInteract, grill.interact);
  assert.equal(grillTick, grill.tick);
  assert.equal(grillView, grill.view);
  assert.equal(grillDrops, grill.drops);
});
test('grill: an unknown stored item is tolerated (view raw, given back and dropped as is)', () => {
  const s = { item: 'kochmod:mystery', ticks: 500 };
  assert.equal(grillView(s), 'raw');
  assert.deepEqual(grillDrops(s), ['kochmod:mystery']);
  assert.deepEqual(grillInteract(s, k('spatula')), { state: { item: null, ticks: 0 }, give: 'kochmod:mystery' });
  assert.equal(grillTick(s, 500).ticks, BURNT_AT);
});
test('timedStation: works for any TIMED-shaped row', () => {
  const pot = timedStation({
    accepts: { 'kochmod:rice': { cooked: 'kochmod:cooked_rice', burnt: 'kochmod:burnt_rice' } },
    tool: 'kochmod:ladle', hintTool: 'kochmod.hint.need_ladle', hintFull: 'kochmod.hint.pot_full', sound: 'kochmod.bubble',
  });
  assert.deepEqual(pot.INITIAL, { item: null, ticks: 0 });
  const placed = pot.interact(pot.INITIAL, 'kochmod:rice');
  assert.deepEqual(placed, { state: { item: 'kochmod:rice', ticks: 0 }, take: true, sound: 'kochmod.bubble' });
  assert.deepEqual(pot.interact(pot.INITIAL, RAW), { state: pot.INITIAL });
  const done = pot.tick(placed.state, COOKED_AT);
  assert.equal(pot.view(done), 'cooked');
  assert.equal(pot.interact(done, 'kochmod:rice').hint, 'kochmod.hint.pot_full');
  assert.equal(pot.interact(done, null).hint, 'kochmod.hint.need_ladle');
  assert.deepEqual(pot.interact(done, 'kochmod:ladle'), { state: { item: null, ticks: 0 }, give: 'kochmod:cooked_rice' });
  assert.deepEqual(pot.drops(pot.tick(done, BURNT_AT)), ['kochmod:burnt_rice']);
});

// ---- Board
const CUT_PAIRS = Object.entries(CUTTABLE);
test('board: empty + any cuttable item takes it', () => {
  for (const [raw] of CUT_PAIRS) {
    const r = boardInteract(INITIAL.board, raw);
    assert.deepEqual(r.state, { item: raw });
    assert.equal(r.take, true);
  }
});
test('board: knife cuts every cuttable item', () => {
  for (const [raw, cut] of CUT_PAIRS) {
    const r = boardInteract({ item: raw }, k('knife'));
    assert.deepEqual(r.state, { item: cut });
    assert.equal(r.sound, 'kochmod.chop');
  }
});
test('board: already cut or unknown item + knife unchanged', () => {
  for (const item of [k('tomato_slices'), k('onion_rings'), k('lettuce'), 'kochmod:from_the_future']) {
    const s = { item };
    assert.deepEqual(boardInteract(s, k('knife')), { state: s });
  }
});
test('board: occupied + empty hand gives item', () => {
  const r = boardInteract({ item: k('salmon') }, null);
  assert.equal(r.give, k('salmon'));
  assert.deepEqual(r.state, { item: null });
});
test('board: occupied + a cuttable item is full', () => {
  const s = { item: k('onion') };
  const r = boardInteract(s, k('carrot'));
  assert.deepEqual(r.state, s);
  assert.equal(r.hint, 'kochmod.hint.board_full');
  assert.equal(r.take, undefined);
});
test('board: occupied + other item unchanged', () => {
  const s = { item: k('onion') };
  assert.deepEqual(boardInteract(s, k('lettuce')), { state: s });
});
test('board: empty + non-cuttable item unchanged', () => {
  for (const held of [k('lettuce'), k('tomato_slices'), k('knife')]) {
    assert.deepEqual(boardInteract(INITIAL.board, held), { state: INITIAL.board });
  }
});
test('board: view and drops', () => {
  assert.equal(boardView(INITIAL.board), 'empty');
  for (const [raw, cut] of CUT_PAIRS) {
    assert.equal(boardView({ item: raw }), 'whole');
    assert.equal(boardView({ item: cut }), 'cut');
    assert.deepEqual(boardDrops({ item: raw }), [raw]);
  }
  assert.equal(boardView({ item: 'kochmod:from_the_future' }), 'whole');
  assert.deepEqual(boardDrops(INITIAL.board), []);
});

// ---- Counter
test('counter: accepts the 8 ingredients', () => {
  for (const id of ING) {
    const r = counterInteract(INITIAL.counter, id);
    assert.deepEqual(r.state, { items: [id] });
    assert.equal(r.take, true);
  }
});
test('counter: full', () => {
  const s = { items: Array(COUNTER_MAX).fill(k('bun')) };
  const r = counterInteract(s, k('lettuce'));
  assert.deepEqual(r.state, s);
  assert.equal(r.hint, 'kochmod.hint.counter_full');
  assert.equal(r.take, undefined);
});
test('counter: tools and dishes rejected', () => {
  const s = { items: [k('bun')] };
  for (const held of [k('knife'), k('spatula'), k('hamburger'), k('failed_dish')]) {
    const r = counterInteract(s, held);
    assert.deepEqual(r, { state: s });
  }
});
test('counter: empty hand assembles', () => {
  const s = { items: ['bun', 'cooked_patty', 'lettuce', 'tomato_slices'].map(k) };
  const r = counterInteract(s, null);
  assert.equal(r.give, k('hamburger'));
  assert.deepEqual(r.state, { items: [] });
  assert.equal(r.sound, 'kochmod.plate');
  assert.equal(counterInteract({ items: [k('bun')] }, null).give, k('failed_dish'));
});
test('counter: empty hand with 0 items unchanged', () => {
  assert.deepEqual(counterInteract(INITIAL.counter, null), { state: INITIAL.counter });
});
test('counter: view is empty without items', () => {
  assert.deepEqual(counterView(INITIAL.counter), { family: 'none', layers: 0 });
});
test('counter: view family from the base item, layers grow with the items up to 6', () => {
  assert.deepEqual(counterView({ items: [k('bun')] }), { family: 'burger', layers: 1 });
  assert.deepEqual(counterView({ items: ['bun', 'cooked_patty', 'lettuce', 'tomato_slices', 'cheese'].map(k) }), { family: 'burger', layers: 5 });
  assert.deepEqual(counterView({ items: ['cheese', 'dough', 'tomato_slices'].map(k) }), { family: 'pizza', layers: 3 });
  assert.deepEqual(counterView({ items: ['pita', 'cooked_patty'].map(k) }), { family: 'doner', layers: 2 });
  assert.deepEqual(counterView({ items: ['nori', 'cheese', 'lettuce', 'tomato', 'bun', 'cheese', 'cheese', 'cheese'].map(k) }), { family: 'sushi', layers: COUNTER_LAYERS });
  assert.equal(COUNTER_LAYERS, 6);
});
test('counter: without a base item the stack shows as a burger', () => {
  assert.deepEqual(counterView({ items: [k('cheese'), k('tomato')] }), { family: 'burger', layers: 2 });
  assert.deepEqual(counterView({ items: ['kochmod:unknown_thing'] }), { family: 'burger', layers: 1 });
});
test('counter: drops', () => {
  assert.deepEqual(counterDrops({ items: [k('bun'), k('cheese')] }), [k('bun'), k('cheese')]);
});

// ---- Dishwasher
const DIRTY = k('dirty_plate');
const CLEAN = k('clean_plate');

test('dishwasher: constants and initial state', () => {
  assert.equal(WASH_TICKS, 200);
  assert.equal(DISHWASHER_MAX, 4);
  assert.deepEqual(INITIAL.dishwasher, { plates: 0, ticks: 0 });
});

test('dishwasher: dirty plate goes in and restarts the wash', () => {
  const r = dishwasherInteract({ plates: 2, ticks: 150 }, DIRTY);
  assert.deepEqual(r, { state: { plates: 3, ticks: 0 }, take: true, sound: 'kochmod.bubble' });
});

test('dishwasher: full with 4 plates gives a hint', () => {
  const s = { plates: 4, ticks: 50 };
  assert.deepEqual(dishwasherInteract(s, DIRTY), { state: s, hint: 'kochmod.hint.dishwasher_full' });
});

test('dishwasher: empty hand when done hands out all clean plates as one stack', () => {
  const r = dishwasherInteract({ plates: 3, ticks: WASH_TICKS }, null);
  assert.deepEqual(r, { state: { plates: 0, ticks: 0 }, give: CLEAN, count: 3 });
});

test('dishwasher: empty hand while washing gives a hint', () => {
  const s = { plates: 2, ticks: WASH_TICKS - 1 };
  assert.deepEqual(dishwasherInteract(s, null), { state: s, hint: 'kochmod.hint.washing' });
});

test('dishwasher: anything else is unchanged with no fields', () => {
  for (const [s, held] of [[INITIAL.dishwasher, null], [INITIAL.dishwasher, CLEAN], [{ plates: 2, ticks: WASH_TICKS }, k('bun')]]) {
    const r = dishwasherInteract(/** @type {any} */ (s), /** @type {any} */ (held));
    assert.deepEqual(r.state, s);
    noFields(r);
  }
});

test('dishwasher: tick only with plates inside, caps at WASH_TICKS', () => {
  assert.deepEqual(dishwasherTick({ plates: 0, ticks: 0 }, 10), { plates: 0, ticks: 0 });
  assert.deepEqual(dishwasherTick({ plates: 1, ticks: 0 }, 10), { plates: 1, ticks: 10 });
  assert.deepEqual(dishwasherTick({ plates: 4, ticks: 195 }, 10), { plates: 4, ticks: WASH_TICKS });
});

test('dishwasher: view', () => {
  assert.equal(dishwasherView(INITIAL.dishwasher), 'empty');
  assert.equal(dishwasherView({ plates: 1, ticks: 0 }), 'running');
  assert.equal(dishwasherView({ plates: 1, ticks: WASH_TICKS }), 'done');
});

test('dishwasher: drops dirty plates while running, clean plates when done', () => {
  assert.deepEqual(dishwasherDrops(INITIAL.dishwasher), []);
  assert.deepEqual(dishwasherDrops({ plates: 2, ticks: 10 }), [DIRTY, DIRTY]);
  assert.deepEqual(dishwasherDrops({ plates: 3, ticks: WASH_TICKS }), [CLEAN, CLEAN, CLEAN]);
});

// ---- Dish cabinet
test('cabinet: constants, a placed cabinet starts full', () => {
  assert.equal(CABINET_MAX, 8);
  assert.deepEqual(INITIAL.cabinet, { plates: 8 });
});

test('cabinet: clean plate goes in', () => {
  assert.deepEqual(cabinetInteract({ plates: 5 }, CLEAN), { state: { plates: 6 }, take: true, sound: 'kochmod.plate' });
});

test('cabinet: full gives a hint', () => {
  const s = { plates: 8 };
  assert.deepEqual(cabinetInteract(s, CLEAN), { state: s, hint: 'kochmod.hint.cabinet_full' });
});

test('cabinet: empty hand takes one plate', () => {
  assert.deepEqual(cabinetInteract({ plates: 8 }, null), { state: { plates: 7 }, give: CLEAN });
});

test('cabinet: empty hand on an empty cabinet gives a hint', () => {
  const s = { plates: 0 };
  assert.deepEqual(cabinetInteract(s, null), { state: s, hint: 'kochmod.hint.cabinet_empty' });
});

test('cabinet: anything else is unchanged with no fields', () => {
  for (const held of [DIRTY, k('bun'), k('hamburger')]) {
    const r = cabinetInteract({ plates: 3 }, held);
    assert.deepEqual(r.state, { plates: 3 });
    noFields(r);
  }
});

test('cabinet: view is the plate count, drops are the plates', () => {
  assert.equal(cabinetView({ plates: 0 }), 0);
  assert.equal(cabinetView({ plates: 8 }), 8);
  assert.deepEqual(cabinetDrops({ plates: 0 }), []);
  assert.deepEqual(cabinetDrops({ plates: 2 }), [CLEAN, CLEAN]);
});

// ---- Migration of stage 1 saved states
test('migrateStationState: stage 1 grill shapes', () => {
  assert.deepEqual(migrateStationState('grill', { occupied: true, ticks: 300 }), { item: RAW, ticks: 300 });
  assert.deepEqual(migrateStationState('grill', { occupied: true }), { item: RAW, ticks: 0 });
  assert.deepEqual(migrateStationState('grill', { occupied: false, ticks: 0 }), INITIAL.grill);
});
test('migrateStationState: new shapes pass through unchanged (same object)', () => {
  /** @type {[keyof typeof INITIAL, unknown][]} */
  const cases = [
    ['grill', { item: RAW, ticks: 12 }], ['grill', { item: null, ticks: 0 }], ['counter', { items: [k('bun')] }],
    ['board', { item: k('tomato') }], ['dishwasher', { plates: 2, ticks: 5 }], ['cabinet', { plates: 3 }],
  ];
  for (const [kind, s] of cases) assert.equal(migrateStationState(kind, s), s, kind);
});
test('migrateStationState: garbage becomes the initial state of that kind', () => {
  for (const kind of /** @type {const} */ (['grill', 'board', 'counter', 'dishwasher', 'cabinet'])) {
    for (const bad of [undefined, null, 42, 'x', [], {}, { items: 'no' }, { item: 7, ticks: 'a' }]) {
      assert.deepEqual(migrateStationState(kind, bad), INITIAL[kind], `${kind} ${JSON.stringify(bad)}`);
    }
  }
});

// ---- Purity
test('reducers do not mutate input', () => {
  const s = Object.freeze({ items: Object.freeze([k('bun')]) });
  counterInteract(/** @type {any} */ (s), k('cheese'));
  counterInteract(/** @type {any} */ (s), null);
  assert.deepEqual(s.items, [k('bun')]);
  const d = Object.freeze({ plates: 1, ticks: 0 });
  dishwasherInteract(d, DIRTY);
  dishwasherTick(d, 10);
  const c = Object.freeze({ plates: 1 });
  cabinetInteract(c, null);
  cabinetInteract(c, CLEAN);
});
