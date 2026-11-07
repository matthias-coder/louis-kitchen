import { ITEMS, itemsFrom } from './catalog.js';
import { THEMES, THEME_IDS } from './layout.js';

/**
 * Supply crates: tapping one opens a picture menu; every entry hands out `count` of `item`, forever.
 * `label` and `icon` replace the item's own button name and picture.
 * @typedef {{ item: string, count: number, label?: import('@minecraft/server').RawMessage, icon?: string }} CrateEntry
 * @typedef {{ title: string, entries: CrateEntry[] }} CrateDef
 */

/** Amount a crate hands out: tools singly, everything else in fours. */
const crateCount = (/** @type {string} */ id) => (ITEMS[id].kind === 'tool' ? 1 : 4);
/** @param {import('./catalog.js').CrateSource} source */
const crateEntries = (source) => itemsFrom(source).map((item) => ({ item, count: crateCount(item) }));

/** @type {Record<string, CrateDef>} keyed by block id (without namespace) */
export const CRATES = {
  fridge: { title: 'kochmod.crate.fridge', entries: crateEntries('fridge') },
  // Dry goods; stage 2 adds noodles, rice and so on here.
  pantry: { title: 'kochmod.crate.pantry', entries: crateEntries('pantry') },
  crate_tools: { title: 'kochmod.crate.tools', entries: crateEntries('tools') },
  // Restaurant-Kiste: one Baukasten per theme, the button shows the theme name and one of its dishes
  crate_kits: {
    title: 'kochmod.crate.kits',
    entries: THEME_IDS.map((id) => ({
      item: THEMES[id].kit,
      count: 1,
      label: { translate: THEMES[id].name },
      icon: `textures/items/${THEMES[id].icon.replace('kochmod:', '')}`,
    })),
  },
};

/** Every block of the add-on, in menu order (block items are handed out like items). */
export const ALL_BLOCKS = [
  'grill', 'cutting_board', 'counter', 'oven', 'pot', 'spit', 'wok',
  'crate_tools', 'crate_all', 'crate_kits', 'fridge', 'pantry',
  'dishwasher', 'dish_cabinet', 'trash_can',
  'table', 'chair', 'bell',
];

CRATES.crate_all = {
  title: 'kochmod.crate.all',
  entries: [
    // every catalog item except those marked menu: false (dirty plate); ingredients, prepared items and plates x4, the rest x1
    ...Object.keys(ITEMS)
      .filter((id) => ITEMS[id].menu !== false)
      .map((item) => ({ item, count: ['ingredient', 'prepared', 'plate'].includes(ITEMS[item].kind) ? 4 : 1 })),
    ...ALL_BLOCKS.map((id) => ({ item: `kochmod:${id}`, count: 1 })),
  ],
};

/**
 * Button label and icon of a crate entry (block item or plain item); the entry's own label and icon win.
 * @param {string | CrateEntry} entry crate entry or a namespaced item id
 * @returns {{ name: import('@minecraft/server').RawMessage, icon: string }}
 */
export function entryLook(entry) {
  const { item, label, icon } = typeof entry === 'string' ? { item: entry, label: undefined, icon: undefined } : entry;
  const id = item.replace('kochmod:', '');
  // blocks get a dedicated 16x16 front-view icon (tools/sprites/icons.js), not their block atlas
  const own = ALL_BLOCKS.includes(id)
    ? { name: { translate: `tile.${item}.name` }, icon: `textures/items/block_${id}` }
    : { name: { translate: `item.${item}` }, icon: `textures/items/${id}` };
  return { name: label ?? own.name, icon: icon ?? own.icon };
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
