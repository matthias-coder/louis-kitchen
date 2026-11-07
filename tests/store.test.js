import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, locKey, parseLocKey } from '../packs/BP/scripts/logic/store.js';
import { grillInteract, grillTick, grillView, migrateStationState } from '../packs/BP/scripts/logic/stations.js';

/** @returns {{ map: Map<string, string>, backend: { get(key: string): string | undefined, set(key: string, value: string | undefined): void } }} */
function mapBackend() {
  const map = new Map();
  return {
    map,
    backend: {
      get: (key) => map.get(key),
      set: (key, value) => {
        if (value === undefined) map.delete(key);
        else map.set(key, value);
      },
    },
  };
}

test('save then load round-trips an object', () => {
  const store = createStore(mapBackend().backend);
  store.save('a', { items: ['kochmod:bun'], n: 3 });
  assert.deepEqual(store.load('a'), { items: ['kochmod:bun'], n: 3 });
});

test('load of a missing key is undefined', () => {
  assert.equal(createStore(mapBackend().backend).load('nope'), undefined);
});

test('state lives under kochmod:st:<key>', () => {
  const { map, backend } = mapBackend();
  createStore(backend).save('k', { x: 1 });
  assert.deepEqual([...map.keys()], ['kochmod:st:k']);
});

test('remove makes load return undefined and clears the backend entry', () => {
  const { map, backend } = mapBackend();
  const store = createStore(backend);
  store.save('a', { x: 1 });
  store.remove('a');
  assert.equal(store.load('a'), undefined);
  assert.equal(map.size, 0);
});

test('registryAdd twice lists the key once; registryRemove removes it', () => {
  const { map, backend } = mapBackend();
  const store = createStore(backend);
  store.registryAdd('grill', 'k1');
  store.registryAdd('grill', 'k1');
  store.registryAdd('grill', 'k2');
  assert.deepEqual(store.registryList('grill'), ['k1', 'k2']);
  assert.equal(map.get('kochmod:reg:grill'), JSON.stringify(['k1', 'k2']));
  store.registryRemove('grill', 'k1');
  assert.deepEqual(store.registryList('grill'), ['k2']);
  assert.deepEqual(store.registryList('counter'), []);
});

test('registries of different kinds are independent', () => {
  const store = createStore(mapBackend().backend);
  store.registryAdd('grill', 'k');
  store.registryAdd('counter', 'k');
  store.registryRemove('grill', 'k');
  assert.deepEqual(store.registryList('grill'), []);
  assert.deepEqual(store.registryList('counter'), ['k']);
});

test('parseLocKey(locKey(...)) round-trips, including negative coordinates', () => {
  const key = locKey('minecraft:overworld', { x: -3, y: 64, z: 12 });
  assert.equal(key, 'minecraft:overworld|-3,64,12');
  assert.deepEqual(parseLocKey(key), { dimensionId: 'minecraft:overworld', x: -3, y: 64, z: 12 });
});

test('a saved grill reloaded through a new store continues cooking from the saved ticks', () => {
  const { backend } = mapBackend();
  const key = locKey('minecraft:overworld', { x: 1, y: 2, z: 3 });
  let state = grillInteract({ item: null, ticks: 0 }, 'kochmod:raw_patty').state;
  for (let i = 0; i < 10; i++) state = grillTick(state, 10);
  createStore(backend).save(key, state);

  const reloaded = createStore(backend).load(key);
  assert.deepEqual(reloaded, { item: 'kochmod:raw_patty', ticks: 100 });
  let next = reloaded;
  for (let i = 0; i < 6; i++) next = grillTick(next, 10);
  assert.equal(next.ticks, 160);
  assert.equal(grillView(next), 'cooked');
});

test('a stage 1 grill saved before the update keeps cooking after migration', () => {
  const { backend } = mapBackend();
  const key = locKey('minecraft:overworld', { x: 1, y: 2, z: 3 });
  createStore(backend).save(key, { occupied: true, ticks: 100 });
  const migrated = migrateStationState('grill', createStore(backend).load(key));
  assert.deepEqual(migrated, { item: 'kochmod:raw_patty', ticks: 100 });
  assert.equal(grillView(grillTick(migrated, 60)), 'cooked');
});
