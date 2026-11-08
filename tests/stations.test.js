import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL, NO_CARRY, findTool, COUNTER_MAX, WASH_TICKS, DISHWASHER_MAX, CABINET_MAX,
  grillInteract, grillTick, grillView, grillDrops,
  dishwasherInteract, dishwasherTick, dishwasherView, dishwasherDrops,
  cabinetInteract, cabinetView, cabinetDrops, cabinetMenu, cabinetTake,
  boardInteract, boardView, boardDrops,
  counterInteract, counterView, counterDrops,
  timedStation, grill, oven, migrateStationState, COUNTER_LAYERS,
  pot, POT_MAX, potInteract, potTick, potView, potDrops,
  wok, WOK_MAX, wokInteract, wokTick, wokView, wokDrops,
  SPIT_SLICES, spitInteract, spitTick, spitView, spitDrops,
  trash, TRASH_LID_TICKS, trashInteract, trashTick, trashView, trashDrops,
} from '../packs/BP/scripts/logic/stations.js';
import { itemsOf, MULTITOOL, SOUP_BOWL, DIRTY_BOWL, PIZZA_BOX } from '../packs/BP/scripts/logic/catalog.js';
import { FAILED } from '../packs/BP/scripts/logic/recipes.js';
import { CUTTABLE } from '../packs/BP/scripts/logic/processes.js';
import { BURNT_AT, COOKED_AT } from '../packs/BP/scripts/logic/cooking.js';

const k = (/** @type {string} */ id) => `kochmod:${id}`;
const carry = (/** @type {string[]} */ ...ids) => (/** @type {string} */ id) => ids.includes(id);
const ING = ['bun', 'raw_patty', 'cooked_patty', 'burnt_patty', 'lettuce', 'tomato', 'tomato_slices', 'cheese'].map(k);

/** @param {any} r */
const noFields = (r) => {
  for (const f of ['take', 'give', 'count', 'hint', 'sound', 'consume', 'gives', 'menu']) assert.equal(f in r, false, `${f} should be absent`);
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
  test(`grill: multitool at ${ticks} gives ${out}`, () => {
    const r = grillInteract({ item: RAW, ticks }, MULTITOOL);
    assert.equal(r.give, k(out));
    assert.deepEqual(r.state, { item: null, ticks: 0 });
  });
}
test('grill: occupied + other or empty hand needs the multitool', () => {
  for (const held of [k('knife'), k('bun'), null]) {
    const s = { item: RAW, ticks: 9 };
    const r = grillInteract(s, held);
    assert.deepEqual(r.state, s);
    assert.equal(r.hint, 'kochmod.hint.need_multitool');
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
  assert.deepEqual(grillInteract(s, MULTITOOL), { state: { item: null, ticks: 0 }, give: 'kochmod:mystery' });
  assert.equal(grillTick(s, 500).ticks, BURNT_AT);
});
test('timedStation: works for any TIMED-shaped row', () => {
  const pot = timedStation({
    accepts: { 'kochmod:rice': { cooked: 'kochmod:cooked_rice', burnt: 'kochmod:burnt_rice' } },
    tools: ['kochmod:ladle'], tool: 'kochmod:ladle', hintTool: 'kochmod.hint.need_ladle', hintFull: 'kochmod.hint.pot_full', sound: 'kochmod.bubble',
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
test('board: the multitool cuts every cuttable item', () => {
  for (const [raw, cut] of CUT_PAIRS) {
    const r = boardInteract({ item: raw }, MULTITOOL);
    assert.deepEqual(r.state, { item: cut });
    assert.equal(r.sound, 'kochmod.chop');
  }
});
test('board: already cut or unknown item + multitool unchanged', () => {
  for (const item of [k('tomato_slices'), k('onion_rings'), k('lettuce'), 'kochmod:from_the_future']) {
    const s = { item };
    assert.deepEqual(boardInteract(s, MULTITOOL), { state: s });
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
test('board: a whole tomato is cut while the hand holds an onion and the multitool is in the inventory', () => {
  assert.deepEqual(boardInteract({ item: k('tomato') }, k('onion'), carry(MULTITOOL)), { state: { item: k('tomato_slices') }, sound: 'kochmod.chop' });
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
  assert.deepEqual(INITIAL.dishwasher, { plates: 0, bowls: 0, ticks: 0 });
});

test('dishwasher: dirty plate goes in and restarts the wash', () => {
  const r = dishwasherInteract({ plates: 2, bowls: 0, ticks: 150 }, DIRTY);
  assert.deepEqual(r, { state: { plates: 3, bowls: 0, ticks: 0 }, take: true, sound: 'kochmod.bubble' });
});

test('dishwasher: full with 4 plates gives a hint', () => {
  const s = { plates: 3, bowls: 1, ticks: 50 };
  assert.deepEqual(dishwasherInteract(s, DIRTY), { state: s, hint: 'kochmod.hint.dishwasher_full' });
});

test('dishwasher: empty hand when done hands out all clean plates as one stack', () => {
  const r = dishwasherInteract({ plates: 3, bowls: 0, ticks: WASH_TICKS }, null);
  assert.deepEqual(r, { state: INITIAL.dishwasher, gives: [{ item: CLEAN, count: 3 }] });
});

test('dishwasher: empty hand while washing gives a hint', () => {
  const s = { plates: 2, bowls: 0, ticks: WASH_TICKS - 1 };
  assert.deepEqual(dishwasherInteract(s, null), { state: s, hint: 'kochmod.hint.washing' });
});

test('dishwasher: anything else is unchanged with no fields', () => {
  for (const [s, held] of [[INITIAL.dishwasher, null], [INITIAL.dishwasher, CLEAN], [{ plates: 2, bowls: 0, ticks: WASH_TICKS }, k('bun')]]) {
    const r = dishwasherInteract(/** @type {any} */ (s), /** @type {any} */ (held));
    assert.deepEqual(r.state, s);
    noFields(r);
  }
});

test('dishwasher: tick only with plates inside, caps at WASH_TICKS', () => {
  assert.deepEqual(dishwasherTick({ plates: 0, bowls: 0, ticks: 0 }, 10), { plates: 0, bowls: 0, ticks: 0 });
  assert.deepEqual(dishwasherTick({ plates: 1, bowls: 0, ticks: 0 }, 10), { plates: 1, bowls: 0, ticks: 10 });
  assert.deepEqual(dishwasherTick({ plates: 2, bowls: 2, ticks: 195 }, 10), { plates: 2, bowls: 2, ticks: WASH_TICKS });
});

test('dishwasher: view', () => {
  assert.equal(dishwasherView(INITIAL.dishwasher), 'empty');
  assert.equal(dishwasherView({ plates: 0, bowls: 1, ticks: 0 }), 'running');
  assert.equal(dishwasherView({ plates: 1, bowls: 0, ticks: WASH_TICKS }), 'done');
});

test('dishwasher: drops dirty plates while running, clean plates when done', () => {
  assert.deepEqual(dishwasherDrops(INITIAL.dishwasher), []);
  assert.deepEqual(dishwasherDrops({ plates: 2, bowls: 1, ticks: 10 }), [DIRTY, DIRTY, DIRTY_BOWL]);
  assert.deepEqual(dishwasherDrops({ plates: 3, bowls: 0, ticks: WASH_TICKS }), [CLEAN, CLEAN, CLEAN]);
});

// ---- Dish cabinet
test('cabinet: constants, a placed cabinet starts full', () => {
  assert.equal(CABINET_MAX, 8);
  assert.deepEqual(INITIAL.cabinet, { plates: 8, bowls: 8 });
});

test('cabinet: clean plate goes in', () => {
  assert.deepEqual(cabinetInteract({ plates: 5, bowls: 0 }, CLEAN), { state: { plates: 6, bowls: 0 }, take: true, sound: 'kochmod.plate' });
});

test('cabinet: full gives a hint', () => {
  const s = { plates: 8, bowls: 0 };
  assert.deepEqual(cabinetInteract(s, CLEAN), { state: s, hint: 'kochmod.hint.cabinet_full' });
});

test('cabinet: anything else is unchanged with no fields', () => {
  for (const held of [DIRTY, k('bun'), k('hamburger')]) {
    const r = cabinetInteract({ plates: 3, bowls: 1 }, held);
    assert.deepEqual(r.state, { plates: 3, bowls: 1 });
    noFields(r);
  }
});

test('cabinet: view is the plate count, drops are the plates', () => {
  assert.equal(cabinetView({ plates: 0, bowls: 5 }), 0);
  assert.equal(cabinetView({ plates: 8, bowls: 0 }), 8);
  assert.deepEqual(cabinetDrops({ plates: 0, bowls: 0 }), []);
  assert.deepEqual(cabinetDrops({ plates: 2, bowls: 1 }), [CLEAN, CLEAN, SOUP_BOWL]);
});

// ---- Migration of stage 1 saved states
// ---- Oven (timed-station factory with the pizza rows)

const MARGHERITA = k('raw_pizza_margherita');
const SALAMI = k('raw_salami_pizza');

test('oven: empty + raw pizza is put in and starts baking', () => {
  for (const raw of [MARGHERITA, SALAMI]) {
    const r = oven.interact(INITIAL.oven, raw);
    assert.deepEqual(r, { state: { item: raw, ticks: 0 }, take: true, sound: 'kochmod.oven' });
  }
});

test('oven: occupied + raw pizza says the oven is full', () => {
  const s = { item: MARGHERITA, ticks: 40 };
  const r = oven.interact(s, SALAMI);
  assert.equal(r.state, s);
  assert.equal(r.hint, 'kochmod.hint.oven_full');
  assert.equal(r.take, undefined);
});

test('oven: occupied + empty hand or other item needs the multitool', () => {
  const s = { item: SALAMI, ticks: 40 };
  for (const held of [null, k('spatula'), k('cheese')]) {
    const r = oven.interact(s, held);
    assert.equal(r.state, s);
    assert.equal(r.hint, 'kochmod.hint.need_multitool');
  }
});

for (const [raw, ticks, out] of [
  [MARGHERITA, 0, MARGHERITA], [MARGHERITA, COOKED_AT, k('pizza_margherita')], [MARGHERITA, BURNT_AT, k('burnt_pizza')],
  [SALAMI, COOKED_AT - 1, SALAMI], [SALAMI, 400, k('salami_pizza')], [SALAMI, BURNT_AT, k('burnt_pizza')],
]) {
  test(`oven: multitool takes out ${out} after ${ticks} ticks of ${raw}`, () => {
    const r = oven.interact({ item: /** @type {string} */ (raw), ticks: /** @type {number} */ (ticks) }, MULTITOOL);
    assert.deepEqual(r, { state: INITIAL.oven, give: out });
  });
}

test('oven: empty + anything but a raw pizza is unchanged; raw patty is not for the oven', () => {
  for (const held of [null, k('raw_patty'), k('dough'), MULTITOOL]) assert.deepEqual(oven.interact(INITIAL.oven, held), { state: INITIAL.oven });
});

test('oven: view and drops by baking stage', () => {
  assert.equal(oven.view(INITIAL.oven), 'empty');
  assert.equal(oven.view({ item: SALAMI, ticks: 10 }), 'raw');
  assert.equal(oven.view({ item: SALAMI, ticks: COOKED_AT }), 'cooked');
  assert.equal(oven.view({ item: SALAMI, ticks: BURNT_AT }), 'burnt');
  assert.deepEqual(oven.drops(INITIAL.oven), []);
  assert.deepEqual(oven.drops({ item: MARGHERITA, ticks: 200 }), [k('pizza_margherita')]);
  assert.deepEqual(oven.tick({ item: SALAMI, ticks: 700 }, 500), { item: SALAMI, ticks: BURNT_AT });
});

test('migrateStationState: oven states pass through, garbage becomes an empty oven', () => {
  const s = { item: SALAMI, ticks: 12 };
  assert.equal(migrateStationState('oven', s), s);
  assert.deepEqual(INITIAL.oven, { item: null, ticks: 0 });
  for (const bad of [null, { occupied: true }, { item: 3, ticks: 0 }]) assert.deepEqual(migrateStationState('oven', bad), INITIAL.oven);
});

test('migrateStationState: stage 1 grill shapes', () => {
  assert.deepEqual(migrateStationState('grill', { occupied: true, ticks: 300 }), { item: RAW, ticks: 300 });
  assert.deepEqual(migrateStationState('grill', { occupied: true }), { item: RAW, ticks: 0 });
  assert.deepEqual(migrateStationState('grill', { occupied: false, ticks: 0 }), INITIAL.grill);
});
test('migrateStationState: new shapes pass through unchanged (same object)', () => {
  /** @type {[keyof typeof INITIAL, unknown][]} */
  const cases = [
    ['grill', { item: RAW, ticks: 12 }], ['grill', { item: null, ticks: 0 }], ['counter', { items: [k('bun')] }],
    ['board', { item: k('tomato') }], ['dishwasher', { plates: 2, bowls: 0, ticks: 5 }], ['cabinet', { plates: 3, bowls: 2 }],
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
  const d = Object.freeze({ plates: 1, bowls: 0, ticks: 0 });
  dishwasherInteract(d, DIRTY);
  dishwasherTick(d, 10);
  const c = Object.freeze({ plates: 1, bowls: 1 });
  cabinetInteract(c, null);
  cabinetInteract(c, CLEAN);
});

// ---- Soup pot (pot-station factory with the POT recipes)

const POT_EMPTY = { items: [], ticks: 0 };
const RAMEN_PARTS = ['broth', 'noodles', 'egg', 'spring_onion'].map(k);
const BOWL = k('bowl');

test('pot: INITIAL and POT_MAX', () => {
  assert.deepEqual(INITIAL.pot, POT_EMPTY);
  assert.deepEqual(pot.INITIAL, POT_EMPTY);
  assert.equal(POT_MAX, 6);
});

test('pot: ingredients and prepared items go in while not cooked, ticks unchanged, with the bubble sound', () => {
  for (const held of [k('rice'), k('broth'), k('potato_cubes'), k('cooked_rice')]) {
    assert.deepEqual(potInteract(POT_EMPTY, held), { state: { items: [held], ticks: 0 }, take: true, sound: 'kochmod.bubble' });
  }
  const s = { items: [k('broth')], ticks: COOKED_AT - 1 };
  assert.deepEqual(potInteract(s, k('egg')), { state: { items: [k('broth'), k('egg')], ticks: COOKED_AT - 1 }, take: true, sound: 'kochmod.bubble' });
});

test('pot: a full pot says so and takes nothing', () => {
  const s = { items: Array(POT_MAX).fill(k('rice')), ticks: 10 };
  const r = potInteract(s, k('rice'));
  assert.deepEqual(r, { state: s, hint: 'kochmod.hint.pot_full' });
});

test('pot: adding to a cooked pot says it is cooking and takes nothing', () => {
  for (const ticks of [COOKED_AT, BURNT_AT]) {
    const s = { items: [k('rice')], ticks };
    assert.deepEqual(potInteract(s, k('egg')), { state: s, hint: 'kochmod.hint.pot_cooking' });
  }
});

test('pot: tools other than the bowl, dishes, plates and unknown ids change nothing', () => {
  const s = { items: [k('rice')], ticks: 20 };
  for (const held of [k('knife'), k('spatula'), k('pizza_peel'), k('ramen'), k('failed_dish'), k('clean_plate'), k('dirty_plate'), k('nope')]) {
    assert.deepEqual(potInteract(s, held), { state: s }, held);
    assert.deepEqual(potInteract(POT_EMPTY, held), { state: POT_EMPTY }, held);
  }
  assert.deepEqual(potInteract(POT_EMPTY, null), { state: POT_EMPTY });
});

test('pot: empty hand on a filled pot asks for a bowl', () => {
  const s = { items: [k('rice')], ticks: 300 };
  assert.deepEqual(potInteract(s, null), { state: s, hint: 'kochmod.hint.need_soup_bowl' });
});

test('pot: the bowl on an empty pot says it is empty, on an uncooked pot that it is cooking; nothing consumed', () => {
  assert.deepEqual(potInteract(POT_EMPTY, BOWL), { state: POT_EMPTY, hint: 'kochmod.hint.pot_empty' });
  const s = { items: RAMEN_PARTS, ticks: COOKED_AT - 1 };
  assert.deepEqual(potInteract(s, BOWL), { state: s, hint: 'kochmod.hint.pot_cooking' });
});

for (const [parts, ticks, out] of /** @type {[string[], number, string][]} */ ([
  [RAMEN_PARTS, COOKED_AT, k('ramen')],
  [['spring_onion', 'egg', 'broth', 'noodles'].map(k), BURNT_AT - 1, k('ramen')],
  [['potato_cubes', 'carrot_slices', 'cream'].map(k), 400, k('potato_soup')],
  [[k('rice')], COOKED_AT, k('cooked_rice')],
  [[k('rice'), k('rice')], COOKED_AT, k('failed_dish')],
  [['potato', 'carrot', 'cream'].map(k), COOKED_AT, k('failed_dish')],
  [RAMEN_PARTS, BURNT_AT, k('failed_dish')],
  [[k('rice')], BURNT_AT, k('failed_dish')],
  [[k('mystery')], COOKED_AT, k('failed_dish')],
])) {
  test(`pot: the bowl scoops ${out} from ${parts.join('+')} after ${ticks} ticks, takes one bowl, empties the pot`, () => {
    assert.deepEqual(potInteract({ items: parts, ticks }, BOWL), { state: POT_EMPTY, take: true, give: out });
  });
}

test('pot: tick accumulates only with items, capped at BURNT_AT', () => {
  assert.equal(potTick(POT_EMPTY, 50), POT_EMPTY);
  assert.deepEqual(potTick({ items: [k('rice')], ticks: 10 }, 20), { items: [k('rice')], ticks: 30 });
  assert.deepEqual(potTick({ items: [k('rice')], ticks: 700 }, 500), { items: [k('rice')], ticks: BURNT_AT });
});

test('pot: view by items and cooking time', () => {
  const v = (/** @type {number} */ ticks) => potView({ items: [k('rice')], ticks });
  assert.equal(potView(POT_EMPTY), 'empty');
  assert.equal(potView({ items: [], ticks: 300 }), 'empty');
  assert.deepEqual([v(0), v(COOKED_AT / 2 - 1)], ['raw', 'raw']);
  assert.deepEqual([v(COOKED_AT / 2), v(COOKED_AT - 1)], ['cooking', 'cooking']);
  assert.deepEqual([v(COOKED_AT), v(BURNT_AT - 1)], ['done', 'done']);
  assert.equal(v(BURNT_AT), 'burnt');
});

test('pot: drops are the items as they are, unknown ids included', () => {
  assert.deepEqual(potDrops(POT_EMPTY), []);
  assert.deepEqual(potDrops({ items: [k('rice'), k('mystery')], ticks: 400 }), [k('rice'), k('mystery')]);
});

test('pot: reducers do not mutate input', () => {
  const s = Object.freeze({ items: Object.freeze([k('broth')]), ticks: 0 });
  potInteract(/** @type {any} */ (s), k('egg'));
  potInteract(/** @type {any} */ (s), BOWL);
  potTick(/** @type {any} */ (s), 10);
  assert.deepEqual(s, { items: [k('broth')], ticks: 0 });
});

test('migrateStationState: pot states pass through, garbage becomes an empty pot', () => {
  const s = { items: [k('rice')], ticks: 12 };
  assert.equal(migrateStationState('pot', s), s);
  for (const bad of [undefined, null, 42, [], {}, { items: 'no', ticks: 0 }, { items: [3], ticks: 0 }, { items: [], ticks: -1 }, { item: null, ticks: 0 }]) {
    assert.deepEqual(migrateStationState('pot', bad), INITIAL.pot, JSON.stringify(bad));
  }
});

// ---- Wok (pot-station factory with the WOK recipes and the wok spatula)

const WOK_EMPTY = { items: [], ticks: 0 };
const NOODLE_PARTS = ['noodles', 'egg', 'carrot_slices', 'spring_onion', 'soy_sauce'].map(k);
const TOOL = MULTITOOL;

test('wok: INITIAL and WOK_MAX', () => {
  assert.deepEqual(INITIAL.wok, WOK_EMPTY);
  assert.deepEqual(wok.INITIAL, WOK_EMPTY);
  assert.equal(WOK_MAX, 6);
});

test('wok: food goes in while not cooked, with the sizzle sound', () => {
  for (const held of [k('noodles'), k('carrot_slices'), k('soy_sauce')]) {
    assert.deepEqual(wokInteract(WOK_EMPTY, held), { state: { items: [held], ticks: 0 }, take: true, sound: 'kochmod.sizzle' });
  }
});

test('wok: a full wok says so and takes nothing', () => {
  const s = { items: Array(WOK_MAX).fill(k('egg')), ticks: 10 };
  assert.deepEqual(wokInteract(s, k('egg')), { state: s, hint: 'kochmod.hint.wok_full' });
});

test('wok: adding to a cooked wok says it is cooking and takes nothing', () => {
  const s = { items: [k('egg')], ticks: COOKED_AT };
  assert.deepEqual(wokInteract(s, k('noodles')), { state: s, hint: 'kochmod.hint.pot_cooking' });
});

test('wok: the bowl and other tools change nothing (the wok wants the multitool)', () => {
  const s = { items: NOODLE_PARTS, ticks: COOKED_AT };
  for (const held of [k('bowl'), k('spatula'), k('knife'), k('pizza_peel'), k('fried_noodles'), k('nope')]) {
    assert.deepEqual(wokInteract(s, held), { state: s }, held);
  }
});

test('wok: empty hand on a filled wok asks for the multitool; on an empty wok nothing happens', () => {
  const s = { items: [k('egg')], ticks: 30 };
  assert.deepEqual(wokInteract(s, null), { state: s, hint: 'kochmod.hint.need_multitool' });
  assert.deepEqual(wokInteract(WOK_EMPTY, null), { state: WOK_EMPTY });
});

test('wok: the multitool on an empty wok says it is empty, on an uncooked wok that it is cooking; nothing consumed', () => {
  assert.deepEqual(wokInteract(WOK_EMPTY, TOOL), { state: WOK_EMPTY, hint: 'kochmod.hint.pot_empty' });
  const s = { items: NOODLE_PARTS, ticks: COOKED_AT - 1 };
  assert.deepEqual(wokInteract(s, TOOL), { state: s, hint: 'kochmod.hint.pot_cooking' });
});

for (const [parts, ticks, out] of /** @type {[string[], number, string][]} */ ([
  [NOODLE_PARTS, COOKED_AT, k('fried_noodles')],
  [['soy_sauce', 'spring_onion', 'carrot_slices', 'egg', 'noodles'].map(k), BURNT_AT - 1, k('fried_noodles')],
  [NOODLE_PARTS, BURNT_AT, k('failed_dish')],
  [['noodles', 'egg', 'carrot', 'spring_onion', 'soy_sauce'].map(k), COOKED_AT, k('failed_dish')],
  [['broth', 'noodles', 'egg', 'spring_onion'].map(k), COOKED_AT, k('failed_dish')],
  [[k('mystery')], COOKED_AT, k('failed_dish')],
])) {
  test(`wok: the multitool serves ${out} from ${parts.join('+')} after ${ticks} ticks, empties the wok and stays in the hand`, () => {
    const r = wokInteract({ items: parts, ticks }, TOOL);
    assert.deepEqual(r, { state: WOK_EMPTY, give: out });
    assert.equal('take' in r, false, 'the multitool is not consumed');
  });
}

test('wok: tick, view and drops work like the pot', () => {
  assert.equal(wokTick(WOK_EMPTY, 50), WOK_EMPTY);
  assert.deepEqual(wokTick({ items: [k('egg')], ticks: 700 }, 500), { items: [k('egg')], ticks: BURNT_AT });
  const v = (/** @type {number} */ ticks) => wokView({ items: [k('egg')], ticks });
  assert.deepEqual([wokView(WOK_EMPTY), v(0), v(COOKED_AT / 2), v(COOKED_AT), v(BURNT_AT)], ['empty', 'raw', 'cooking', 'done', 'burnt']);
  assert.deepEqual(wokDrops({ items: [k('egg'), k('mystery')], ticks: 400 }), [k('egg'), k('mystery')]);
});

test('migrateStationState: wok states pass through, garbage becomes an empty wok', () => {
  const s = { items: [k('egg')], ticks: 12 };
  assert.equal(migrateStationState('wok', s), s);
  for (const bad of [undefined, null, 'x', {}, { items: [3], ticks: 0 }, { items: [], ticks: -1 }]) {
    assert.deepEqual(migrateStationState('wok', bad), INITIAL.wok, JSON.stringify(bad));
  }
});

// ---- Doner spit

const MEAT_RAW = k('doner_meat_raw');
const MEAT = k('doner_meat');
const SPIT_EMPTY = { meat: false, ticks: 0, slices: 0 };
const spitAt = (/** @type {number} */ ticks, slices = SPIT_SLICES) => ({ meat: true, ticks, slices });

test('spit: INITIAL and SPIT_SLICES', () => {
  assert.deepEqual(INITIAL.spit, SPIT_EMPTY);
  assert.equal(SPIT_SLICES, 6);
});

test('spit: raw doner meat goes on an empty spit with six slices', () => {
  assert.deepEqual(spitInteract(SPIT_EMPTY, MEAT_RAW), { state: { meat: true, ticks: 0, slices: 6 }, take: true });
});

test('spit: raw doner meat on a spit with meat says it is busy and takes nothing', () => {
  for (const s of [spitAt(0), spitAt(COOKED_AT, 3)]) {
    assert.deepEqual(spitInteract(s, MEAT_RAW), { state: s, hint: 'kochmod.hint.spit_busy' });
  }
});

test('spit: the multitool on cooked meat cuts one doner meat, the multitool stays', () => {
  assert.deepEqual(spitInteract(spitAt(COOKED_AT), TOOL), { state: spitAt(COOKED_AT, 5), give: MEAT });
  assert.deepEqual(spitInteract(spitAt(COOKED_AT, 2), TOOL), { state: spitAt(COOKED_AT, 1), give: MEAT });
});

test('spit: cutting the last slice empties the spit', () => {
  assert.deepEqual(spitInteract(spitAt(COOKED_AT, 1), TOOL), { state: SPIT_EMPTY, give: MEAT });
});

test('spit: the multitool on raw meat says it is not done yet; nothing given', () => {
  const s = spitAt(COOKED_AT - 1);
  assert.deepEqual(spitInteract(s, TOOL), { state: s, hint: 'kochmod.hint.spit_raw' });
});

test('spit: the multitool on an empty spit asks for doner meat', () => {
  assert.deepEqual(spitInteract(SPIT_EMPTY, TOOL), { state: SPIT_EMPTY, hint: 'kochmod.hint.spit_empty' });
});

test('spit: other items, an empty hand and unknown ids change nothing', () => {
  for (const s of [SPIT_EMPTY, spitAt(COOKED_AT)]) {
    for (const held of [null, MEAT, k('raw_patty'), k('spatula'), k('bowl'), k('doner'), k('nope')]) {
      assert.deepEqual(spitInteract(s, held), { state: s }, String(held));
    }
  }
});

test('spit: tick runs only with meat and stops at COOKED_AT (it never burns)', () => {
  assert.equal(spitTick(SPIT_EMPTY, 50), SPIT_EMPTY);
  assert.deepEqual(spitTick(spitAt(10), 20), spitAt(30));
  assert.deepEqual(spitTick(spitAt(150), 500), spitAt(COOKED_AT));
  assert.deepEqual(spitTick(spitAt(COOKED_AT, 2), 500), spitAt(COOKED_AT, 2));
});

test('spit: view empty, raw, cooked', () => {
  assert.equal(spitView(SPIT_EMPTY), 'empty');
  assert.equal(spitView(spitAt(0)), 'raw');
  assert.equal(spitView(spitAt(COOKED_AT - 1)), 'raw');
  assert.equal(spitView(spitAt(COOKED_AT, 1)), 'cooked');
});

test('spit: drops the raw meat as it went on, or the doner meat that is left', () => {
  assert.deepEqual(spitDrops(SPIT_EMPTY), []);
  assert.deepEqual(spitDrops(spitAt(COOKED_AT - 1)), [MEAT_RAW]);
  assert.deepEqual(spitDrops(spitAt(COOKED_AT)), Array(6).fill(MEAT));
  assert.deepEqual(spitDrops(spitAt(COOKED_AT, 2)), [MEAT, MEAT]);
});

test('spit: reducers do not mutate input', () => {
  const s = Object.freeze(spitAt(COOKED_AT, 3));
  spitInteract(s, TOOL);
  spitInteract(s, MEAT_RAW);
  spitTick(s, 10);
  assert.deepEqual(s, spitAt(COOKED_AT, 3));
});

test('migrateStationState: spit states pass through, garbage becomes an empty spit', () => {
  for (const s of [SPIT_EMPTY, spitAt(40), spitAt(COOKED_AT, 1)]) assert.equal(migrateStationState('spit', s), s);
  for (const bad of [
    undefined, null, 7, [], {}, { item: null, ticks: 0 }, { meat: 'yes', ticks: 0, slices: 6 },
    { meat: true, ticks: -1, slices: 6 }, { meat: true, ticks: 0, slices: 7 }, { meat: true, ticks: 0, slices: 0 },
    { meat: false, ticks: 0, slices: 3 }, { meat: false, ticks: 0, slices: -1 }, { meat: true, ticks: 0, slices: 2.5 },
  ]) {
    assert.deepEqual(migrateStationState('spit', bad), INITIAL.spit, JSON.stringify(bad));
  }
});

// ---- Trash can
const TRASH_RESULT = { take: true, sound: 'kochmod.trash', particle: 'minecraft:basic_smoke_particle' };

test('trash: any food in hand disappears, one at a time, with sound, smoke and the lid popping up', () => {
  assert.deepEqual(trashInteract(k('burnt_pizza')), { state: { open: TRASH_LID_TICKS }, ...TRASH_RESULT });
  assert.equal(TRASH_LID_TICKS, 20, 'the lid is visible for 10–20 ticks with a station tick every 10');
  for (const id of ['failed_dish', 'burnt_pizza', 'burnt_patty', 'dirty_plate', 'clean_plate', 'hamburger', 'tomato', 'cooked_rice'].map(k)) {
    assert.deepEqual(trashInteract(id), { state: { open: TRASH_LID_TICKS }, ...TRASH_RESULT }, id);
  }
  for (const id of [...itemsOf('ingredient'), ...itemsOf('prepared'), ...itemsOf('dish'), ...itemsOf('plate')]) {
    assert.equal(trashInteract(id).take, true, id);
  }
});

test('trash: unknown item ids (other add-ons, vanilla, block items) are thrown away too', () => {
  for (const id of ['kochmod:does_not_exist', 'minecraft:rotten_flesh', 'kochmod:grill', '']) {
    assert.deepEqual(trashInteract(id), { state: { open: TRASH_LID_TICKS }, ...TRASH_RESULT }, id);
  }
});

test('trash: an empty hand gets a hint, nothing else happens', () => {
  const r = trashInteract(null);
  assert.deepEqual(r, { state: INITIAL.trash, hint: 'kochmod.hint.trash_empty_hand' });
  const open = { open: 10 };
  assert.equal(trashInteract(null, open).state, open, 'a refusal keeps the lid as it is');
});

test('trash: tools, Baukästen and the recipe book (catalog kinds tool and misc) are refused', () => {
  const refused = [...itemsOf('tool'), ...itemsOf('misc')];
  for (const id of ['knife', 'spatula', 'bowl', 'pizza_peel', 'wok_spatula', 'recipe_book', 'kit_classic', 'restaurant_kit'].map(k)) {
    assert.ok(refused.includes(id), `${id} is a tool or misc item in the catalog`);
  }
  for (const id of refused) {
    const r = trashInteract(id);
    assert.deepEqual(r, { state: INITIAL.trash, hint: 'kochmod.hint.trash_no_tools' }, id);
    assert.equal('take' in r, false);
  }
  assert.deepEqual(trashInteract(k('knife')), { state: INITIAL.trash, hint: 'kochmod.hint.trash_no_tools' });
});

test('trash: the station interact keeps the state on refusals and opens the lid on a throw', () => {
  const open = { open: 10 };
  assert.equal(trash.interact(open, k('knife')).state, open);
  assert.deepEqual(trash.interact(INITIAL.trash, k('failed_dish')), { state: { open: TRASH_LID_TICKS }, ...TRASH_RESULT });
});

test('trash: the lid counts down to closed; view is the kochmod:open state', () => {
  assert.deepEqual(INITIAL.trash, { open: 0 });
  assert.equal(trash.INITIAL, INITIAL.trash);
  assert.deepEqual(trashTick({ open: 10 }, 4), { open: 6 });
  assert.deepEqual(trashTick({ open: 10 }, 10), { open: 0 });
  assert.deepEqual(trashTick({ open: 3 }, 10), { open: 0 });
  const closed = { open: 0 };
  assert.equal(trashTick(closed, 10), closed, 'a closed lid is returned unchanged');
  assert.deepEqual(trashView({ open: 0 }), { 'kochmod:open': false });
  assert.deepEqual(trashView({ open: 1 }), { 'kochmod:open': true });
  assert.deepEqual(trashView(trashInteract(k('burnt_pizza')).state), { 'kochmod:open': true });
  const afterOneTick = trashTick(trashInteract(k('burnt_pizza')).state, 10);
  assert.deepEqual(trashView(afterOneTick), { 'kochmod:open': true }, 'still open after the first station tick');
  assert.deepEqual(trashView(trashTick(afterOneTick, 10)), { 'kochmod:open': false }, 'closed after the second');
});

test('trash: nothing is stored, breaking drops nothing', () => {
  assert.deepEqual(trashDrops(INITIAL.trash), []);
  assert.deepEqual(trashDrops({ open: 10 }), []);
  assert.deepEqual(trash.drops({ open: 5 }), []);
});

test('trash: reducers do not mutate input', () => {
  const s = Object.freeze({ open: 10 });
  trashInteract(k('tomato'), s);
  trashInteract(null, s);
  trashTick(s, 10);
  assert.deepEqual(s, { open: 10 });
});

test('migrateStationState: trash states pass through, garbage becomes a closed trash can', () => {
  for (const s of [{ open: 0 }, { open: 10 }]) assert.equal(migrateStationState('trash', s), s);
  for (const bad of [undefined, null, 7, 'x', [], {}, { open: -1 }, { open: 'yes' }, { open: Infinity }, { item: null, ticks: 0 }]) {
    assert.deepEqual(migrateStationState('trash', bad), INITIAL.trash, JSON.stringify(bad));
  }
});

// ---- Tools from the inventory (stage 3)
test('findTool: hand first, then the inventory, in tools order', () => {
  assert.deepEqual(findTool(k('spatula'), carry(MULTITOOL), [MULTITOOL, k('spatula')]), { id: k('spatula'), inHand: true });
  assert.deepEqual(findTool(null, carry(k('spatula')), [MULTITOOL, k('spatula')]), { id: k('spatula'), inHand: false });
  assert.equal(findTool(k('bun'), NO_CARRY, [MULTITOOL]), null);
});
test('grill: cooked patty comes off with the multitool in the inventory, even while holding lettuce', () => {
  const s = { item: RAW, ticks: COOKED_AT };
  assert.deepEqual(grillInteract(s, k('lettuce'), carry(MULTITOOL)), { state: INITIAL.grill, give: k('cooked_patty') });
  assert.deepEqual(grillInteract(s, null, carry(k('spatula'))), { state: INITIAL.grill, give: k('cooked_patty') });
  assert.deepEqual(grillInteract(s, null, NO_CARRY), { state: s, hint: 'kochmod.hint.need_multitool' });
  assert.deepEqual(grillInteract(s, RAW, carry(MULTITOOL)), { state: s, hint: 'kochmod.hint.grill_full' });
});
test('old tools still work: spatula at the grill, pizza peel at the oven', () => {
  const s = { item: RAW, ticks: COOKED_AT };
  assert.deepEqual(grillInteract(s, k('spatula')), { state: INITIAL.grill, give: k('cooked_patty') });
  const o = oven.interact({ item: k('dough'), ticks: COOKED_AT }, k('pizza_peel'));
  assert.equal(o.state.item, null);
  assert.ok(o.give);
  assert.deepEqual(oven.interact({ item: k('dough'), ticks: COOKED_AT }, null, carry(k('pizza_peel'))), o);
});
test('board: an empty hand with the multitool in the inventory cuts, without it takes the item back', () => {
  assert.deepEqual(boardInteract({ item: k('tomato') }, null, carry(MULTITOOL)), { state: { item: k('tomato_slices') }, sound: 'kochmod.chop' });
  assert.deepEqual(boardInteract({ item: k('tomato') }, null, NO_CARRY), { state: { item: null }, give: k('tomato') });
  assert.deepEqual(boardInteract({ item: k('tomato_slices') }, null, carry(MULTITOOL)), { state: { item: null }, give: k('tomato_slices') });
});
test('board: the old knife still cuts, in hand and from the inventory', () => {
  assert.deepEqual(boardInteract({ item: k('tomato') }, k('knife')), { state: { item: k('tomato_slices') }, sound: 'kochmod.chop' });
  assert.deepEqual(boardInteract({ item: k('tomato') }, null, carry(k('knife'))), { state: { item: k('tomato_slices') }, sound: 'kochmod.chop' });
});
test('spit: cooked meat is cut with the multitool from the inventory', () => {
  const s = { meat: true, ticks: COOKED_AT, slices: SPIT_SLICES };
  assert.deepEqual(spitInteract(s, null, carry(MULTITOOL)), { state: { ...s, slices: SPIT_SLICES - 1 }, give: k('doner_meat') });
  assert.deepEqual(spitInteract(s, k('bun'), carry(MULTITOOL)), { state: { ...s, slices: SPIT_SLICES - 1 }, give: k('doner_meat') });
});
test('spit: the old knife still cuts, in hand and from the inventory', () => {
  const s = { meat: true, ticks: COOKED_AT, slices: SPIT_SLICES };
  const out = { state: { ...s, slices: SPIT_SLICES - 1 }, give: k('doner_meat') };
  assert.deepEqual(spitInteract(s, k('knife')), out);
  assert.deepEqual(spitInteract(s, null, carry(k('knife'))), out);
});
test('spit: raw meat in hand still goes on even with a tool in the inventory', () => {
  assert.deepEqual(spitInteract(INITIAL.spit, MEAT_RAW, carry(MULTITOOL)), { state: { meat: true, ticks: 0, slices: SPIT_SLICES }, take: true });
});
test('pot: scoops with the soup bowl from hand or inventory and with the old bowl', () => {
  const s = { items: [k('potato_cubes'), k('carrot_slices'), k('cream')], ticks: COOKED_AT };
  assert.deepEqual(potInteract(s, SOUP_BOWL, NO_CARRY), { state: INITIAL.pot, take: true, give: k('potato_soup') });
  assert.deepEqual(potInteract(s, null, carry(SOUP_BOWL)), { state: INITIAL.pot, consume: SOUP_BOWL, give: k('potato_soup') });
  assert.deepEqual(potInteract(s, null, carry(k('bowl'))), { state: INITIAL.pot, consume: k('bowl'), give: k('potato_soup') });
});

test('pot: a bowl from the inventory scoops and is consumed; a held ingredient still goes in', () => {
  const s = { items: [k('rice')], ticks: COOKED_AT };
  assert.deepEqual(potInteract(s, null, carry(k('bowl'))), { state: INITIAL.pot, consume: k('bowl'), give: k('cooked_rice') });
  assert.deepEqual(potInteract(s, k('bowl'), NO_CARRY), { state: INITIAL.pot, take: true, give: k('cooked_rice') });
  assert.deepEqual(potInteract({ items: [k('rice')], ticks: 0 }, k('egg'), carry(k('bowl'))), { state: { items: [k('rice'), k('egg')], ticks: 0 }, take: true, sound: 'kochmod.bubble' });
});
test('wok: the multitool from the inventory scoops and stays; the old wok spatula too', () => {
  const s = { items: [k('noodles')], ticks: COOKED_AT };
  assert.deepEqual(wokInteract(s, null, carry(MULTITOOL)), { state: INITIAL.wok, give: FAILED });
  assert.deepEqual(wokInteract(s, k('wok_spatula')), { state: INITIAL.wok, give: FAILED });
  assert.deepEqual(wokInteract(s, null, carry(k('wok_spatula'))), { state: INITIAL.wok, give: FAILED });
  assert.deepEqual(wokInteract(s, null, NO_CARRY), { state: s, hint: 'kochmod.hint.need_multitool' });
});

test('cabinet: empty hand opens the menu; the menu lists plate, bowl and box with counts', () => {
  assert.deepEqual(cabinetInteract(INITIAL.cabinet, null), { state: INITIAL.cabinet, menu: true });
  const m = cabinetMenu({ plates: 3, bowls: 0 });
  assert.deepEqual(m.buttons.map((b) => b.choice), ['plate', 'bowl', 'box']);
  assert.deepEqual(m.buttons[0].label, { rawtext: [{ translate: 'item.kochmod:clean_plate' }, { text: ' (3)' }] });
  assert.deepEqual(m.buttons[2].label, { translate: 'item.kochmod:pizza_box' });
  assert.deepEqual(m.buttons.map((b) => b.icon), ['textures/items/clean_plate', 'textures/items/soup_bowl', 'textures/items/pizza_box']);
});
test('cabinet: taking plates, bowls and boxes', () => {
  assert.deepEqual(cabinetTake({ plates: 1, bowls: 2 }, 'plate'), { state: { plates: 0, bowls: 2 }, give: k('clean_plate') });
  assert.deepEqual(cabinetTake({ plates: 0, bowls: 2 }, 'plate'), { state: { plates: 0, bowls: 2 }, hint: 'kochmod.hint.cabinet_empty' });
  assert.deepEqual(cabinetTake({ plates: 0, bowls: 0 }, 'bowl'), { state: { plates: 0, bowls: 0 }, hint: 'kochmod.hint.cabinet_no_bowls' });
  assert.deepEqual(cabinetTake({ plates: 0, bowls: 0 }, 'box'), { state: { plates: 0, bowls: 0 }, give: PIZZA_BOX });
  assert.deepEqual(cabinetInteract({ plates: 8, bowls: 7 }, SOUP_BOWL), { state: { plates: 8, bowls: 8 }, take: true, sound: 'kochmod.plate' });
  assert.deepEqual(cabinetInteract({ plates: 8, bowls: 8 }, SOUP_BOWL), { state: { plates: 8, bowls: 8 }, hint: 'kochmod.hint.cabinet_full' });
});
test('cabinet and dishwasher: old saves load with full bowls / no bowls', () => {
  assert.deepEqual(migrateStationState('cabinet', { plates: 3 }), { plates: 3, bowls: CABINET_MAX });
  assert.deepEqual(migrateStationState('dishwasher', { plates: 2, ticks: 50 }), { plates: 2, bowls: 0, ticks: 50 });
});
test('dishwasher: plates and bowls share the four slots and come back sorted', () => {
  let s = dishwasherInteract(INITIAL.dishwasher, k('dirty_plate')).state;
  s = dishwasherInteract(s, DIRTY_BOWL).state;
  assert.deepEqual(s, { plates: 1, bowls: 1, ticks: 0 });
  const done = dishwasherTick(s, WASH_TICKS);
  assert.deepEqual(dishwasherInteract(done, null), { state: INITIAL.dishwasher, gives: [{ item: k('clean_plate'), count: 1 }, { item: SOUP_BOWL, count: 1 }] });
  assert.deepEqual(dishwasherDrops(done), [k('clean_plate'), SOUP_BOWL]);
});
