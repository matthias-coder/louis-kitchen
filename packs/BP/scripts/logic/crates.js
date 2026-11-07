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
  fridge: {
    title: 'kochmod.crate.fridge',
    entries: [
      { item: 'kochmod:tomato', count: 4 },
      { item: 'kochmod:lettuce', count: 4 },
      { item: 'kochmod:raw_patty', count: 4 },
      { item: 'kochmod:cheese', count: 4 },
    ],
  },
  // Dry goods; stage 2 adds noodles, rice and so on here.
  pantry: { title: 'kochmod.crate.pantry', entries: [{ item: 'kochmod:bun', count: 4 }] },
  crate_tools: {
    title: 'kochmod.crate.tools',
    entries: [
      { item: 'kochmod:knife', count: 1 },
      { item: 'kochmod:spatula', count: 1 },
      { item: 'kochmod:clean_plate', count: 4 },
    ],
  },
};

/** Items of the crate_all menu with the amount handed out: ingredients and plates x4, tools, dishes and the restaurant kit x1. */
const ALL_ITEMS = [
  ...['bun', 'raw_patty', 'cooked_patty', 'burnt_patty', 'lettuce', 'tomato', 'tomato_slices', 'cheese'].map((id) => ({ id, count: 4 })),
  ...['knife', 'spatula', 'hamburger', 'cheeseburger', 'failed_dish'].map((id) => ({ id, count: 1 })),
  { id: 'clean_plate', count: 4 },
  { id: 'restaurant_kit', count: 1 },
];
/** Every block of the add-on, in menu order (block items are handed out like items). */
export const ALL_BLOCKS = [
  'grill', 'cutting_board', 'counter',
  'crate_vegetables', 'crate_meat', 'crate_bread', 'crate_dairy', 'crate_tools', 'crate_all', 'fridge', 'pantry',
  'dishwasher', 'dish_cabinet',
  'table', 'chair', 'bell',
];

CRATES.crate_all = {
  title: 'kochmod.crate.all',
  entries: [
    ...ALL_ITEMS.map(({ id, count }) => ({ item: `kochmod:${id}`, count })),
    ...ALL_BLOCKS.map((id) => ({ item: `kochmod:${id}`, count: 1 })),
  ],
};

/**
 * Button label and icon of a crate entry (block item or plain item).
 * @param {string} item namespaced id
 * @returns {{ name: import('@minecraft/server').RawMessage, icon: string }}
 */
export function entryLook(item) {
  const id = item.replace('kochmod:', '');
  // blocks get a dedicated 16x16 front-view icon (tools/sprites/icons.js), not their block atlas
  if (ALL_BLOCKS.includes(id)) return { name: { translate: `tile.${item}.name` }, icon: `textures/items/block_${id}` };
  return { name: { translate: `item.${item}` }, icon: `textures/items/${id}` };
}

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
