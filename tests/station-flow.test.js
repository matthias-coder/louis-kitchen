import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interactStation, breakStation, tickGrills } from '../packs/BP/scripts/logic/station-flow.js';
import { INITIAL, boardInteract, boardView, boardDrops, grillView } from '../packs/BP/scripts/logic/stations.js';

const GRILL = 'kochmod:grill';

test('interactStation sets the view, then saves, then applies', () => {
  /** @type {string[]} */
  const calls = [];
  const r = interactStation(boardInteract, boardView, INITIAL.board, 'kochmod:tomato', {
    setView: (v) => calls.push(`view:${v}`),
    save: (s) => calls.push(`save:${s.item}`),
    apply: (res) => calls.push(`apply:${res.take}`),
  });
  assert.deepEqual(calls, ['view:tomato', 'save:kochmod:tomato', 'apply:true']);
  assert.deepEqual(r.state, { item: 'kochmod:tomato' });
});

test('interactStation saves nothing and takes nothing when setting the view throws', () => {
  /** @type {string[]} */
  const calls = [];
  assert.throws(() => interactStation(boardInteract, boardView, INITIAL.board, 'kochmod:tomato', {
    setView: () => { throw new Error('boom'); },
    save: () => calls.push('save'),
    apply: () => calls.push('apply'),
  }));
  assert.deepEqual(calls, []);
});

test('breakStation drops the contents and forgets the station', () => {
  /** @type {unknown[]} */
  const calls = [];
  breakStation(boardDrops, { item: 'kochmod:tomato_slices' }, {
    drop: (ids) => calls.push(ids),
    forget: () => calls.push('forget'),
  });
  assert.deepEqual(calls, [['kochmod:tomato_slices'], 'forget']);
});

/**
 * @param {Record<string, string | undefined | Error>} blocks
 * @param {Record<string, any>} states
 */
function fakeWorld(blocks, states) {
  /** @type {string[]} */
  const warnings = [];
  /** @type {string[]} */
  const forgotten = [];
  /** @type {Record<string, string>} */
  const views = {};
  const io = {
    blockTypeAt: (/** @type {string} */ key) => {
      const b = blocks[key];
      if (b instanceof Error) throw b;
      return b;
    },
    load: (/** @type {string} */ key) => {
      const s = states[key];
      if (s instanceof Error) throw s;
      return s;
    },
    save: (/** @type {string} */ key, /** @type {any} */ s) => { states[key] = s; },
    forget: (/** @type {string} */ key) => { forgotten.push(key); delete states[key]; },
    setView: (/** @type {string} */ key, /** @type {string} */ v) => { views[key] = v; },
    warn: (/** @type {string} */ m) => { warnings.push(m); },
  };
  return { io, warnings, forgotten, views, states };
}

test('tickGrills: one failing key does not stop the grills after it', () => {
  const w = fakeWorld(
    { a: GRILL, b: GRILL, c: GRILL },
    { a: new Error('corrupt'), b: { occupied: true, ticks: 150 }, c: { occupied: true, ticks: 0 } },
  );
  tickGrills(['a', 'b', 'c'], 10, w.io, GRILL);
  assert.equal(w.warnings.length, 1);
  assert.match(w.warnings[0], /a/);
  assert.deepEqual(w.states.b, { occupied: true, ticks: 160 });
  assert.equal(w.views.b, 'cooked');
  assert.deepEqual(w.states.c, { occupied: true, ticks: 10 });
  assert.equal('c' in w.views, false, 'view unchanged, no permutation update');
});

test('tickGrills: a throwing block lookup is isolated too', () => {
  const w = fakeWorld({ a: new Error('unloaded'), b: GRILL }, { b: { occupied: true, ticks: 0 } });
  tickGrills(['a', 'b'], 10, w.io, GRILL);
  assert.equal(w.warnings.length, 1);
  assert.equal(w.states.b.ticks, 10);
});

test('tickGrills: unloaded grills pause, replaced grills are forgotten', () => {
  const w = fakeWorld({ a: undefined, b: 'minecraft:air' }, { a: { occupied: true, ticks: 5 }, b: { occupied: true, ticks: 5 } });
  tickGrills(['a', 'b'], 10, w.io, GRILL);
  assert.deepEqual(w.states.a, { occupied: true, ticks: 5 });
  assert.deepEqual(w.forgotten, ['b']);
});

test('tickGrills: a loaded grill without saved state is initialised', () => {
  const w = fakeWorld({ a: GRILL }, {});
  tickGrills(['a'], 10, w.io, GRILL);
  assert.deepEqual(w.states.a, INITIAL.grill);
  assert.equal(w.warnings.length, 0);
});

test('tickGrills: empty and fully burnt grills are not rewritten', () => {
  const burnt = { occupied: true, ticks: 760 };
  const w = fakeWorld({ a: GRILL, b: GRILL }, { a: INITIAL.grill, b: burnt });
  let saves = 0;
  const save = w.io.save;
  w.io.save = (k, s) => { saves++; save(k, s); };
  tickGrills(['a', 'b'], 10, w.io, GRILL);
  assert.equal(saves, 0);
  assert.equal(grillView(w.states.b), 'burnt');
});
