import { CABINET_MAX } from './stations.js';
import { DIRECTIONS } from './restaurant.js';

/**
 * Restaurants built by the Baukasten items, one layout per theme (pure data, no world access).
 *
 * Local coordinates: x to the right, z into the room from the entrance, y up; y = 0 is the floor layer.
 * `minecraft:cardinal_direction` values in the layout are written for an entrance seen by a
 * player looking north: local +z (into the room) is 'north', local +x (right) is 'east'.
 *
 * @typedef {import('./restaurant.js').Direction} Direction
 * @typedef {Record<string, string | number | boolean>} BlockStates
 * @typedef {{ x: number, y: number, z: number, id: string, states?: BlockStates }} LayoutBlock
 * @typedef {{ x: number, y: number, z: number }} Vec
 * @typedef {{ xs: number[], z: number }} Door entrance columns `xs` in the front wall row `z`
 * @typedef {{
 *   width: number, depth: number, height: number, door: Door,
 *   spare: Vec,
 *   blocks: LayoutBlock[],
 * }} Layout `spare`: the kitchen-row cell left free for the trash can (next task); blocks in placement order
 * @typedef {'burger' | 'italian' | 'japanese' | 'doner' | 'classic' | 'mega'} ThemeId
 * @typedef {{ id: ThemeId, name: string, kit: string, icon: string, layout: Layout }} Theme
 *   name: lang key; kit: the Baukasten item id; icon: dish id shown on the Restaurant-Kiste button
 */

/** Distance from the tapped block to the front wall. */
export const ENTRANCE_DISTANCE = 2;

const mc = (/** @type {string} */ id) => `minecraft:${id}`;
const FLOOR = mc('smooth_stone');
const KITCHEN_FLOOR = mc('polished_andesite');
const WALL = mc('white_terracotta');
const WINDOW = mc('glass_pane');
const ROOF = mc('dark_oak_planks');
const LIGHT = mc('glowstone');
const HALF_WALL = mc('smooth_stone');
const WORKTOP = mc('smooth_stone_slab');

const BOTTOM = { 'minecraft:vertical_half': 'bottom' };
const SOUTH = { 'minecraft:cardinal_direction': 'south' };
/** States of kitchen devices standing against the back wall, facing the entrance. */
/** @type {Record<string, BlockStates>} */
const DEVICE_STATES = {
  fridge: SOUTH,
  pantry: SOUTH,
  dishwasher: SOUTH,
  dish_cabinet: { ...SOUTH, 'kochmod:plates': CABINET_MAX },
};

/** kochmod blocks placed before the stations; the bell comes last, so no guest is called before the chairs exist. */
const FURNITURE = new Set(['table', 'chair', 'fridge', 'pantry', 'crate_tools', 'crate_all', 'crate_kits'].map((id) => `kochmod:${id}`));
const BELL = 'kochmod:bell';
/** @param {LayoutBlock} b @returns {number} placement phase: vanilla blocks, furniture, stations, bell */
const phase = (b) => {
  if (!b.id.startsWith('kochmod:')) return 0;
  if (FURNITURE.has(b.id)) return 1;
  return b.id === BELL ? 3 : 2;
};

// ---- building helpers ----

/**
 * Empty building site. A later `put` replaces an earlier block in the same cell and moves it to the end of
 * the placement order; `finish` sorts stably by phase.
 * @param {number} width @param {number} depth @param {number} height
 */
function plan(width, depth, height) {
  /** @type {Map<string, LayoutBlock>} */
  const cells = new Map();
  return {
    width,
    depth,
    height,
    /** @param {number} x @param {number} y @param {number} z @param {string} id @param {BlockStates} [states] */
    put(x, y, z, id, states) {
      if (x < 0 || y < 0 || z < 0 || x >= width || y >= height || z >= depth) throw new Error(`layout: ${id} at ${x},${y},${z} is outside`);
      const k = `${x},${y},${z}`;
      cells.delete(k);
      cells.set(k, states ? { x, y, z, id, states } : { x, y, z, id });
    },
    /** @param {number} x @param {number} y @param {number} z */
    clear(x, y, z) { cells.delete(`${x},${y},${z}`); },
    /** @param {Door} door @param {Vec} spare @returns {Layout} */
    finish(door, spare) {
      const blocks = [...cells.values()].sort((a, b) => phase(a) - phase(b));
      return { width, depth, height, door, spare, blocks };
    },
  };
}
/** @typedef {ReturnType<typeof plan>} Plan */

/** @param {Plan} p @param {number} x @param {number} z @returns {boolean} whether (x, z) is on the outer wall ring */
const onRing = (p, x, z) => x === 0 || z === 0 || x === p.width - 1 || z === p.depth - 1;

/** Fills one whole horizontal layer. @param {Plan} p @param {number} y @param {(x: number, z: number) => string} idAt */
function layer(p, y, idAt) {
  for (let z = 0; z < p.depth; z++) for (let x = 0; x < p.width; x++) p.put(x, y, z, idAt(x, z));
}

/** @param {string} base @param {number[]} xs @param {number[]} zs @returns {(x: number, z: number) => string} glowstone lights in a grid */
const withLights = (base, xs, zs) => (x, z) => (xs.includes(x) && zs.includes(z) ? LIGHT : base);
/** @param {string} a @param {string} b @returns {(x: number, z: number) => string} checkerboard tiles */
const checker = (a, b) => (x, z) => ((x + z) % 2 === 0 ? a : b);

/**
 * @typedef {{
 *   y0?: number, walls: number,
 *   floor?: (x: number, z: number) => string,
 *   wall: (x: number, y: number, z: number) => string,
 *   roof: (x: number, z: number) => string,
 *   windows: { front: number[], side: number[], ys: number[] },
 *   door?: number[],
 * }} RoomSpec
 *   y0: floor layer (default 0; without `floor` the existing layer is kept); walls: wall layers above it;
 *   windows: glass panes in the front wall (columns x) and both side walls (rows z), `ys` counted from y0;
 *   door: 2 high opening in the front wall
 */

/**
 * A storey: floor layer, wall ring with windows and door, flat roof (or the next storey's floor) on top.
 * @param {Plan} p @param {RoomSpec} s
 */
function room(p, s) {
  const y0 = s.y0 ?? 0;
  const roofY = y0 + s.walls + 1;
  if (s.floor) layer(p, y0, s.floor);
  for (let y = y0 + 1; y < roofY; y++) {
    const dy = y - y0;
    for (let z = 0; z < p.depth; z++) {
      for (let x = 0; x < p.width; x++) {
        if (!onRing(p, x, z)) continue;
        if (s.door && z === 0 && s.door.includes(x) && dy <= 2) continue;
        const window = (z === 0 && s.windows.front.includes(x)) || ((x === 0 || x === p.width - 1) && s.windows.side.includes(z));
        p.put(x, y, z, window && s.windows.ys.includes(dy) ? WINDOW : s.wall(x, y, z));
      }
    }
  }
  layer(p, roofY, s.roof);
}

/**
 * Half-wall between dining room and kitchen with a worktop slab on it and a pass-through gap.
 * @param {Plan} p @param {{ z: number, x0: number, x1: number, gap: number[], block: string, top: string, y?: number }} s
 */
function halfWall(p, { z, x0, x1, gap, block, top, y = 1 }) {
  for (let x = x0; x <= x1; x++) {
    if (gap.includes(x)) continue;
    p.put(x, y, z, block);
    p.put(x, y + 1, z, top, BOTTOM);
  }
}

/** The bell on a small counter. @param {Plan} p @param {Vec} at bell position @param {string} counter */
function bellCounter(p, at, counter) {
  p.put(at.x, at.y - 1, at.z, counter);
  p.put(at.x, at.y, at.z, BELL);
}

/**
 * A table at every (x, z); its chair stands one block nearer the entrance, facing the table.
 * @param {Plan} p @param {{ xs: number[], zs: number[], y?: number }} s
 */
function diningGrid(p, { xs, zs, y = 1 }) {
  for (const z of zs) {
    for (const x of xs) {
      p.put(x, y, z, 'kochmod:table');
      p.put(x, y, z - 1, 'kochmod:chair', { 'minecraft:cardinal_direction': 'north' });
    }
  }
}

/**
 * Kitchen devices side by side from x0 along row z (against the back wall). `null` leaves that cell free:
 * every kitchen row keeps exactly one free cell for the trash can, returned as the layout's `spare`.
 * @param {Plan} p @param {(string | null)[]} devices @param {{ z: number, x0: number, y?: number }} s
 * @returns {Vec} the free cell
 */
function kitchenRow(p, devices, { z, x0, y = 1 }) {
  if (devices.filter((d) => d === null).length !== 1) throw new Error('layout: a kitchen row needs exactly one free cell');
  /** @type {Vec | undefined} */
  let spare;
  devices.forEach((d, i) => {
    if (d === null) spare = { x: x0 + i, y, z };
    else p.put(x0 + i, y, z, `kochmod:${d}`, DEVICE_STATES[d]);
  });
  return /** @type {Vec} */ (spare);
}

/** The three crates in a column from the back wall forward: all, tools, kits. @param {Plan} p @param {number} x @param {number} zBack */
function crates(p, x, zBack, y = 1) {
  p.put(x, y, zBack, 'kochmod:crate_all');
  p.put(x, y, zBack - 1, 'kochmod:crate_tools');
  p.put(x, y, zBack - 2, 'kochmod:crate_kits');
}

/**
 * One block wide stairs of half-block steps (bottom slab, full block, slab ...) climbing along +z in column x,
 * from the floor layer y0 to the floor layer y0 + rise. Where a player's head would bump into the upper floor it
 * is opened, and a railing upstairs (column x + side, and across the near end) keeps people from falling in.
 * @param {Plan} p
 * @param {{ x: number, z0: number, y0: number, rise: number, side: 1 | -1, block: string, slab: string, rail: string }} s
 * @returns {number} z of the top step, level with the upper floor
 */
function staircase(p, { x, z0, y0, rise, side, block, slab, rail }) {
  const upper = y0 + rise;
  const steps = 2 * rise;
  let firstOpen = -1;
  for (let i = 0; i < steps; i++) {
    const z = z0 + i;
    // feet height in half blocks on this step; a player needs four free half blocks above the feet
    const feet = 2 * (y0 + 1) + i + 1;
    if (i < steps - 1 && feet + 3 >= 2 * upper) {
      p.clear(x, upper, z);
      p.put(x + side, upper + 1, z, rail);
      if (firstOpen < 0) firstOpen = z;
    }
    const full = Math.floor((i + 1) / 2);
    for (let y = y0 + 1; y <= y0 + full; y++) p.put(x, y, z, block);
    if (i % 2 === 0) p.put(x, y0 + full + 1, z, slab, BOTTOM);
  }
  if (firstOpen > 0) p.put(x, upper + 1, firstOpen - 1, rail);
  return z0 + steps - 1;
}

/** Hanging lanterns. @param {Plan} p @param {number} y @param {[number, number][]} xz */
function lanterns(p, y, xz) {
  for (const [x, z] of xz) p.put(x, y, z, mc('lantern'), { hanging: true });
}

// ---- the themes ----

/** Every device of the stage 1 kitchen, in its back-row order; `null` is the free trash-can cell (x = 12). */
const FULL_KITCHEN = ['spit', 'pot', 'fridge', 'pantry', 'grill', 'cutting_board', 'counter', 'oven', 'dishwasher', 'dish_cabinet', 'wok', null];

/**
 * @typedef {{
 *   floor: (x: number, z: number) => string,
 *   wall: (x: number, y: number, z: number) => string,
 *   halfWall: string, worktop: string,
 *   tables: { xs: number[], zs: number[] },
 *   kitchen: (string | null)[], kitchenX0: number,
 *   decorate?: (p: Plan) => void,
 * }} StandardSpec
 */

/**
 * The stage 1 floor plan, 15 x 11 x 6: dining room in front, a half-wall with the pass straight behind the
 * 2 wide door, the kitchen row along the back wall (z = 9), crates in the back right corner, the bell on a
 * small counter beside the pass. Themes change materials, tables and kitchen.
 * @param {StandardSpec} s
 * @returns {Layout}
 */
function standard(s) {
  const p = plan(15, 11, 6);
  const door = [7, 8];
  room(p, {
    walls: 4, floor: s.floor, wall: s.wall, roof: withLights(ROOF, [3, 7, 11], [2, 5, 8]),
    windows: { front: [2, 3, 4, 10, 11, 12], side: [2, 3, 7, 8], ys: [2, 3] }, door,
  });
  halfWall(p, { z: 5, x0: 1, x1: 13, gap: door, block: s.halfWall, top: s.worktop });
  bellCounter(p, { x: 6, y: 2, z: 4 }, s.halfWall);
  diningGrid(p, s.tables);
  const spare = kitchenRow(p, s.kitchen, { z: 9, x0: s.kitchenX0 });
  crates(p, 13, 9);
  s.decorate?.(p);
  return p.finish({ xs: door, z: 0 }, spare);
}

/** Stage 1 restaurant: every device; the trash-can cell is (12, 1, 9) at the right end of the kitchen row. */
const classic = () => standard({
  floor: (x, z) => (z >= 5 ? KITCHEN_FLOOR : FLOOR),
  wall: () => WALL,
  halfWall: HALF_WALL,
  worktop: WORKTOP,
  tables: { xs: [2, 5, 10, 13], zs: [3] },
  kitchen: FULL_KITCHEN,
  kitchenX0: 1,
});

/** Burger-Laden: red/white terracotta, checkered floor. Trash-can cell: (9, 1, 9), right of the dish cabinet. */
const burger = () => standard({
  floor: checker(mc('black_concrete'), mc('white_concrete')),
  wall: (x, y) => (y === 1 || y === 4 ? mc('red_terracotta') : WALL),
  halfWall: mc('red_terracotta'),
  worktop: WORKTOP,
  tables: { xs: [2, 5, 10, 13], zs: [3] },
  kitchen: ['fridge', 'pantry', 'grill', 'cutting_board', 'counter', 'dishwasher', 'dish_cabinet', null],
  kitchenX0: 2,
});

const AWNING = [mc('green_concrete'), mc('white_concrete'), mc('red_concrete')];
/** Pizzeria: brick walls, a green/white/red awning row along the top of the front wall. Trash-can cell: (10, 1, 9). */
const italian = () => standard({
  floor: (x, z) => (z >= 5 ? KITCHEN_FLOOR : mc('oak_planks')),
  wall: (x, y, z) => (z === 0 && y === 4 ? AWNING[x % 3] : mc('brick_block')),
  halfWall: mc('brick_block'),
  worktop: WORKTOP,
  tables: { xs: [2, 4, 11, 13], zs: [3] },
  kitchen: ['fridge', 'pantry', 'oven', 'pot', 'cutting_board', 'counter', 'dishwasher', 'dish_cabinet', null],
  kitchenX0: 2,
});

const DARK_OAK = mc('dark_oak_planks');
/** @param {number} x @param {number} z @returns {boolean} dark oak posts of the paper walls */
const post = (x, z) => ((z === 0 || z === 10) && [0, 4, 10, 14].includes(x)) || ((x === 0 || x === 14) && [0, 5, 10].includes(z));
/** Sushi-Bar: dark oak frame with paper-like white walls, lanterns, the four tables as one bar row. Trash-can cell: (10, 1, 9). */
const japanese = () => standard({
  floor: (x, z) => (z >= 5 ? KITCHEN_FLOOR : mc('spruce_planks')),
  wall: (x, y, z) => (y === 4 || post(x, z) ? DARK_OAK : mc('white_concrete')),
  halfWall: DARK_OAK,
  worktop: mc('dark_oak_slab'),
  tables: { xs: [2, 3, 4, 5], zs: [4] },
  kitchen: ['fridge', 'pantry', 'pot', 'wok', 'cutting_board', 'counter', 'dishwasher', 'dish_cabinet', null],
  kitchenX0: 2,
  decorate: (p) => lanterns(p, 4, [[2, 3], [5, 3], [10, 3], [12, 3]]),
});

/** Döner-Imbiss: a small, bright, tiled stand, 11 x 10 x 6, three tables. Trash-can cell: (8, 1, 8). */
function doner() {
  const p = plan(11, 10, 6);
  const door = [5, 6];
  const tile = mc('white_concrete');
  room(p, {
    walls: 4, floor: checker(tile, mc('light_gray_concrete')), wall: (x, y) => (y === 4 ? mc('red_concrete') : tile),
    roof: withLights(ROOF, [2, 5, 8], [2, 7]), windows: { front: [2, 3, 8, 9], side: [2, 3, 7], ys: [2, 3] }, door,
  });
  halfWall(p, { z: 5, x0: 1, x1: 9, gap: door, block: tile, top: WORKTOP });
  bellCounter(p, { x: 4, y: 2, z: 4 }, tile);
  diningGrid(p, { xs: [2, 3, 8], zs: [3] });
  const spare = kitchenRow(p, ['fridge', 'pantry', 'spit', 'cutting_board', 'counter', 'dishwasher', 'dish_cabinet', null], { z: 8, x0: 1 });
  crates(p, 9, 8);
  return p.finish({ xs: door, z: 0 }, spare);
}

/**
 * Mega-Restaurant, 20 x 14 x 9: two storeys of three wall layers each, the upper floor is layer 4.
 * Ground floor: dining room, half-wall, the full kitchen along the back wall, stairs along the left wall.
 * Upper floor: dining only, with its own bell. Trash-can cell: (12, 1, 12), right of the wok.
 */
function mega() {
  const p = plan(20, 14, 9);
  const door = [9, 10];
  const windows = { front: [2, 3, 4, 5, 14, 15, 16, 17], side: [3, 4, 10, 11], ys: [2] };
  const lightXs = [4, 9, 14];
  const lightZs = [3, 7, 11];
  room(p, {
    walls: 3, floor: (x, z) => (z >= 8 ? KITCHEN_FLOOR : FLOOR), wall: () => WALL, windows, door,
    // the ground floor's ceiling is the upper floor: a dark oak beam outside, planks inside, lights in the ceiling
    roof: (x, z) => (onRing(p, x, z) ? DARK_OAK : withLights(mc('oak_planks'), lightXs, lightZs)(x, z)),
  });
  room(p, { y0: 4, walls: 3, wall: () => WALL, roof: withLights(ROOF, lightXs, lightZs), windows });
  staircase(p, { x: 1, z0: 2, y0: 0, rise: 4, side: 1, block: mc('oak_planks'), slab: mc('oak_slab'), rail: mc('oak_fence') });
  halfWall(p, { z: 8, x0: 2, x1: 18, gap: door, block: HALF_WALL, top: WORKTOP });
  bellCounter(p, { x: 8, y: 2, z: 7 }, HALF_WALL);
  diningGrid(p, { xs: [4, 7, 13, 16], zs: [5] });
  const spare = kitchenRow(p, FULL_KITCHEN, { z: 12, x0: 1 });
  crates(p, 18, 12);
  bellCounter(p, { x: 10, y: 6, z: 7 }, HALF_WALL);
  diningGrid(p, { xs: [6, 14], zs: [4, 10], y: 5 });
  return p.finish({ xs: door, z: 0 }, spare);
}

/** @param {ThemeId} id @param {string} icon dish id @param {Layout} layout @returns {Theme} */
const theme = (id, icon, layout) => ({ id, name: `kochmod.theme.${id}`, kit: `kochmod:kit_${id}`, icon, layout });

/** Every theme, in Restaurant-Kiste menu order. @type {Record<ThemeId, Theme>} */
export const THEMES = {
  burger: theme('burger', 'kochmod:hamburger', burger()),
  italian: theme('italian', 'kochmod:pizza_margherita', italian()),
  japanese: theme('japanese', 'kochmod:sushi', japanese()),
  doner: theme('doner', 'kochmod:doner', doner()),
  classic: theme('classic', 'kochmod:potato_soup', classic()),
  mega: theme('mega', 'kochmod:fried_noodles', mega()),
};

/** @type {ThemeId[]} */
export const THEME_IDS = /** @type {ThemeId[]} */ (Object.keys(THEMES));

/** The stage 1 Restaurant-Baukasten item, kept so old worlds keep working: it builds the classic restaurant. */
export const LEGACY_KIT = 'kochmod:restaurant_kit';

/**
 * @param {string} itemId typeId of the Baukasten item that was used
 * @returns {Theme | undefined}
 */
export function themeForKit(itemId) {
  if (itemId === LEGACY_KIT) return THEMES.classic;
  return Object.values(THEMES).find((t) => t.kit === itemId);
}

/** The stage 1 sample restaurant (the classic theme), blocks in placement order. */
export const RESTAURANT = THEMES.classic.layout;
/** Columns of the 2-wide door opening of the stage 1 restaurant. */
export const DOOR_XS = RESTAURANT.door.xs;

/** Forward (into the room) and right unit vectors on the x/z plane for a player facing `facing`. */
const AXES = {
  north: { f: { x: 0, z: -1 }, r: { x: 1, z: 0 } },
  east: { f: { x: 1, z: 0 }, r: { x: 0, z: 1 } },
  south: { f: { x: 0, z: 1 }, r: { x: -1, z: 0 } },
  west: { f: { x: -1, z: 0 }, r: { x: 0, z: -1 } },
};

/**
 * World offset of a local position for a player facing `facing`.
 * @param {Vec} local
 * @param {Direction} facing
 * @returns {Vec}
 */
export function rotateOffset(local, facing) {
  const { f, r } = AXES[facing];
  return { x: local.x * r.x + local.z * f.x, y: local.y, z: local.x * r.z + local.z * f.z };
}

/**
 * Turns a direction written for a north-facing layout so it fits a layout facing `facing`.
 * @param {Direction} dir
 * @param {Direction} facing
 * @returns {Direction}
 */
export function rotateDirection(dir, facing) {
  return DIRECTIONS[(DIRECTIONS.indexOf(dir) + DIRECTIONS.indexOf(facing)) % 4];
}

/**
 * World-space offsets (from `placementOrigin`) of every block, for a player looking towards `facing`:
 * the entrance then faces the player. Cardinal direction states are rotated with the layout.
 * @param {Layout} layout
 * @param {Direction} facing
 * @returns {LayoutBlock[]}
 */
export function rotateLayout(layout, facing) {
  return layout.blocks.map((b) => {
    const { x, y, z } = rotateOffset(b, facing);
    if (!b.states) return { x, y, z, id: b.id };
    /** @type {BlockStates} */
    const states = { ...b.states };
    const dir = states['minecraft:cardinal_direction'];
    if (typeof dir === 'string') states['minecraft:cardinal_direction'] = rotateDirection(/** @type {Direction} */ (dir), facing);
    return { x, y, z, id: b.id, states };
  });
}

/**
 * World position of the layout origin (local 0,0,0): the door stands ENTRANCE_DISTANCE blocks
 * beyond the tapped block, the door opening starts in the tapped block's column, the floor layer is
 * level with the tapped block (so the doorway has no step).
 * @param {Vec} tapped location of the ground block that was tapped
 * @param {Direction} facing direction the player looks
 * @param {Layout} [layout] the restaurant to build (default: the stage 1 restaurant)
 * @returns {Vec}
 */
export function placementOrigin(tapped, facing, layout = RESTAURANT) {
  const { f, r } = AXES[facing];
  const ahead = ENTRANCE_DISTANCE - layout.door.z;
  const side = layout.door.xs[0];
  return {
    x: tapped.x + ahead * f.x - side * r.x,
    y: tapped.y,
    z: tapped.z + ahead * f.z - side * r.z,
  };
}

/**
 * Cardinal direction the player looks towards (horizontal part of the view vector).
 * @param {{ x: number, z: number }} view
 * @returns {Direction}
 */
export function facingFromView(view) {
  if (Math.abs(view.x) > Math.abs(view.z)) return view.x > 0 ? 'east' : 'west';
  return view.z > 0 ? 'south' : 'north';
}

/**
 * World offsets of every cell above the floor inside the footprint (walls and roof layers).
 * @param {Layout} layout
 * @param {Direction} facing
 * @returns {Vec[]}
 */
export function clearanceOffsets(layout, facing) {
  /** @type {Vec[]} */
  const cells = [];
  for (let y = 1; y < layout.height; y++) {
    for (let z = 0; z < layout.depth; z++) {
      for (let x = 0; x < layout.width; x++) cells.push(rotateOffset({ x, y, z }, facing));
    }
  }
  return cells;
}

/** Blocks that may be built over: air, grass, flowers, snow layers and similar plants. */
const REPLACEABLE = new Set([
  'air', 'short_grass', 'tall_grass', 'fern', 'large_fern', 'deadbush', 'bush', 'short_dry_grass', 'tall_dry_grass',
  'firefly_bush', 'leaf_litter', 'snow_layer', 'vine',
  'dandelion', 'poppy', 'blue_orchid', 'allium', 'azure_bluet', 'red_tulip', 'orange_tulip', 'white_tulip', 'pink_tulip',
  'oxeye_daisy', 'cornflower', 'lily_of_the_valley', 'torchflower', 'sunflower', 'lilac', 'rose_bush', 'peony',
  'pink_petals', 'wildflowers', 'cactus_flower', 'open_eyeblossom', 'closed_eyeblossom',
].map((id) => `minecraft:${id}`));

/** @param {string} typeId @returns {boolean} */
export function isReplaceable(typeId) {
  return REPLACEABLE.has(typeId);
}

/** Natural ground and terrain blocks the kit may overwrite (besides replaceable plants and air). */
const NATURAL = new Set([
  'grass_block', 'dirt', 'coarse_dirt', 'podzol', 'stone', 'deepslate', 'sand', 'gravel', 'sandstone', 'snow', 'moss_block', 'mud',
  'tall_grass', 'short_grass',
].map((id) => `minecraft:${id}`));

/**
 * Whether the Baukasten may overwrite a block: air, replaceable plants, natural ground, leaves, logs.
 * Everything else (player builds, kochmod blocks, containers, beds, doors, signs, water ...) is protected.
 * @param {string} typeId
 * @param {boolean} hasInventory the block has a minecraft:inventory component (chest, barrel, furnace ...)
 * @returns {boolean}
 */
export function isOverwritable(typeId, hasInventory) {
  if (hasInventory || !typeId.startsWith('minecraft:')) return false;
  if (isReplaceable(typeId) || NATURAL.has(typeId)) return true;
  return /_leaves$|_log$|_wood$|^minecraft:(leaves|leaves2|log|log2)$/.test(typeId);
}

/**
 * World offsets of every floor-layer cell (y = 0) of the footprint.
 * @param {Layout} layout
 * @param {Direction} facing
 * @returns {Vec[]}
 */
export function floorOffsets(layout, facing) {
  /** @type {Vec[]} */
  const cells = [];
  for (let z = 0; z < layout.depth; z++) {
    for (let x = 0; x < layout.width; x++) cells.push(rotateOffset({ x, y: 0, z }, facing));
  }
  return cells;
}

/** At most this share of the space above the floor may be blocked. */
export const MAX_BLOCKED_SHARE = 0.1;

/**
 * @param {number} blocked natural blocks sticking into the room above the floor
 * @param {number} total all cells above the floor
 * @returns {boolean}
 */
export function hasSpace(blocked, total) {
  return blocked <= total * MAX_BLOCKED_SHARE;
}
