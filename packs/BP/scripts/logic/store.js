/**
 * JSON store and key registries over an injected string backend.
 * Station state lives under `kochmod:st:<key>`, registries under `kochmod:reg:<kind>`.
 * @typedef {{ get(key: string): string | undefined, set(key: string, value: string | undefined): void }} Backend
 */

const STATE_PREFIX = 'kochmod:st:';
const REGISTRY_PREFIX = 'kochmod:reg:';

/** @param {Backend} backend */
export function createStore(backend) {
  /** @param {string} kind @returns {string[]} */
  function registryList(kind) {
    const raw = backend.get(REGISTRY_PREFIX + kind);
    return raw === undefined ? [] : JSON.parse(raw);
  }

  /** @param {string} kind @param {string[]} keys */
  function writeRegistry(kind, keys) {
    backend.set(REGISTRY_PREFIX + kind, keys.length === 0 ? undefined : JSON.stringify(keys));
  }

  return {
    /** @param {string} key @returns {any} */
    load(key) {
      const raw = backend.get(STATE_PREFIX + key);
      return raw === undefined ? undefined : JSON.parse(raw);
    },
    /** @param {string} key @param {unknown} obj */
    save(key, obj) {
      backend.set(STATE_PREFIX + key, JSON.stringify(obj));
    },
    /** @param {string} key */
    remove(key) {
      backend.set(STATE_PREFIX + key, undefined);
    },
    /** @param {string} kind @param {string} key */
    registryAdd(kind, key) {
      const keys = registryList(kind);
      if (!keys.includes(key)) writeRegistry(kind, [...keys, key]);
    },
    /** @param {string} kind @param {string} key */
    registryRemove(kind, key) {
      const keys = registryList(kind);
      if (keys.includes(key)) writeRegistry(kind, keys.filter((k) => k !== key));
    },
    registryList,
  };
}

/** @typedef {ReturnType<typeof createStore>} Store */

/**
 * @param {string} dimensionId
 * @param {{ x: number, y: number, z: number }} loc
 * @returns {string}
 */
export function locKey(dimensionId, loc) {
  return `${dimensionId}|${loc.x},${loc.y},${loc.z}`;
}

/**
 * @param {string} key
 * @returns {{ dimensionId: string, x: number, y: number, z: number }}
 */
export function parseLocKey(key) {
  const bar = key.lastIndexOf('|');
  const [x, y, z] = key.slice(bar + 1).split(',').map(Number);
  return { dimensionId: key.slice(0, bar), x, y, z };
}
