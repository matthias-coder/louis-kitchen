import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL, COUNTER_MAX,
  grillInteract, grillTick, grillView, grillDrops,
  boardInteract, boardView, boardDrops,
  counterInteract, counterView, counterDrops,
} from '../packs/BP/scripts/logic/stations.js';

const k = (/** @type {string} */ id) => `kochmod:${id}`;
const ING = ['bun', 'raw_patty', 'cooked_patty', 'burnt_patty', 'lettuce', 'tomato', 'tomato_slices', 'cheese'].map(k);

/** @param {any} r */
const noFields = (r) => {
  for (const f of ['take', 'give', 'hint', 'sound']) assert.equal(f in r, false, `${f} should be absent`);
};

// ---- Grill
test('grill: empty + raw_patty starts cooking', () => {
  const r = grillInteract(INITIAL.grill, k('raw_patty'));
  assert.deepEqual(r.state, { occupied: true, ticks: 0 });
  assert.equal(r.take, true);
  assert.equal(r.sound, 'kochmod.sizzle');
});
test('grill: occupied + raw_patty is full', () => {
  const s = { occupied: true, ticks: 5 };
  const r = grillInteract(s, k('raw_patty'));
  assert.deepEqual(r.state, s);
  assert.equal(r.hint, 'kochmod.hint.grill_full');
  assert.equal(r.take, undefined);
});
for (const [ticks, out] of [[0, 'raw_patty'], [200, 'cooked_patty'], [800, 'burnt_patty']]) {
  test(`grill: spatula at ${ticks} gives ${out}`, () => {
    const r = grillInteract({ occupied: true, ticks }, k('spatula'));
    assert.equal(r.give, k(out));
    assert.deepEqual(r.state, { occupied: false, ticks: 0 });
  });
}
test('grill: occupied + other or empty hand needs spatula', () => {
  for (const held of [k('knife'), k('bun'), null]) {
    const s = { occupied: true, ticks: 9 };
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
test('grill: tick only when occupied, caps at BURNT_AT, 16x10 is cooked', () => {
  assert.deepEqual(grillTick({ occupied: false, ticks: 0 }, 50), { occupied: false, ticks: 0 });
  assert.equal(grillTick({ occupied: true, ticks: 700 }, 500).ticks, 760);
  let s = { occupied: true, ticks: 0 };
  for (let i = 0; i < 10; i++) s = grillTick(s, 16);
  assert.equal(grillView(s), 'cooked');
});
test('grill: view', () => {
  assert.equal(grillView(INITIAL.grill), 'empty');
  assert.equal(grillView({ occupied: true, ticks: 0 }), 'raw');
  assert.equal(grillView({ occupied: true, ticks: 760 }), 'burnt');
});
test('grill: drops', () => {
  assert.deepEqual(grillDrops(INITIAL.grill), []);
  assert.deepEqual(grillDrops({ occupied: true, ticks: 200 }), [k('cooked_patty')]);
});

// ---- Board
test('board: empty + tomato', () => {
  const r = boardInteract(INITIAL.board, k('tomato'));
  assert.deepEqual(r.state, { item: k('tomato') });
  assert.equal(r.take, true);
});
test('board: tomato + knife slices it', () => {
  const r = boardInteract({ item: k('tomato') }, k('knife'));
  assert.deepEqual(r.state, { item: k('tomato_slices') });
  assert.equal(r.sound, 'kochmod.chop');
});
test('board: slices + knife unchanged', () => {
  const s = { item: k('tomato_slices') };
  assert.deepEqual(boardInteract(s, k('knife')), { state: s });
});
test('board: occupied + empty hand gives item', () => {
  const r = boardInteract({ item: k('tomato') }, null);
  assert.equal(r.give, k('tomato'));
  assert.deepEqual(r.state, { item: null });
});
test('board: occupied + tomato is full', () => {
  const s = { item: k('tomato') };
  const r = boardInteract(s, k('tomato'));
  assert.deepEqual(r.state, s);
  assert.equal(r.hint, 'kochmod.hint.board_full');
  assert.equal(r.take, undefined);
});
test('board: empty + lettuce unchanged', () => {
  const r = boardInteract(INITIAL.board, k('lettuce'));
  assert.deepEqual(r, { state: INITIAL.board });
});
test('board: view and drops', () => {
  assert.equal(boardView(INITIAL.board), 'empty');
  assert.equal(boardView({ item: k('tomato') }), 'tomato');
  assert.equal(boardView({ item: k('tomato_slices') }), 'tomato_slices');
  assert.deepEqual(boardDrops(INITIAL.board), []);
  assert.deepEqual(boardDrops({ item: k('tomato') }), [k('tomato')]);
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
test('counter: view', () => {
  assert.deepEqual(counterView(INITIAL.counter), { bun: false, patty: 'none', lettuce: false, tomato: 'none', cheese: false });
  const v = counterView({ items: ['bun', 'raw_patty', 'cooked_patty', 'tomato', 'tomato_slices', 'lettuce', 'cheese'].map(k) });
  assert.deepEqual(v, { bun: true, patty: 'cooked', lettuce: true, tomato: 'slices', cheese: true });
  assert.equal(counterView({ items: [k('tomato')] }).tomato, 'whole');
  assert.equal(counterView({ items: [k('burnt_patty')] }).patty, 'burnt');
  assert.equal(counterView({ items: [k('raw_patty')] }).patty, 'raw');
});
test('counter: drops', () => {
  assert.deepEqual(counterDrops({ items: [k('bun'), k('cheese')] }), [k('bun'), k('cheese')]);
});

// ---- Purity
test('reducers do not mutate input', () => {
  const s = Object.freeze({ items: Object.freeze([k('bun')]) });
  counterInteract(/** @type {any} */ (s), k('cheese'));
  counterInteract(/** @type {any} */ (s), null);
  assert.deepEqual(s.items, [k('bun')]);
});
