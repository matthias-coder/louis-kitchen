/**
 * Supply crates: tapping one opens a picture menu; every entry hands out `count` of `item`, forever.
 * @typedef {{ item: string, count: number }} CrateEntry
 * @typedef {{ title: string, entries: CrateEntry[] }} CrateDef
 */

/** @type {Record<string, CrateDef>} keyed by block id (without namespace) */
export const CRATES = {
  crate_vegetables: {
    title: 'kochmod.crate.vegetables',
    entries: [
      { item: 'kochmod:tomato', count: 4 },
      { item: 'kochmod:lettuce', count: 4 },
    ],
  },
  crate_meat: { title: 'kochmod.crate.meat', entries: [{ item: 'kochmod:raw_patty', count: 4 }] },
  crate_bread: { title: 'kochmod.crate.bread', entries: [{ item: 'kochmod:bun', count: 4 }] },
  crate_dairy: { title: 'kochmod.crate.dairy', entries: [{ item: 'kochmod:cheese', count: 4 }] },
  crate_tools: {
    title: 'kochmod.crate.tools',
    entries: [
      { item: 'kochmod:knife', count: 1 },
      { item: 'kochmod:spatula', count: 1 },
    ],
  },
};

export const BUSY_RETRIES = 5;
export const BUSY_RETRY_TICKS = 10;

/**
 * Whether a cancelled crate form should be opened again: only while the player was busy
 * (chat or another screen open) and fewer than BUSY_RETRIES retries were made.
 * @param {string | undefined} reason cancelationReason of the response
 * @param {number} retriesDone
 * @returns {boolean}
 */
export function shouldRetryBusy(reason, retriesDone) {
  return reason === 'UserBusy' && retriesDone < BUSY_RETRIES;
}
