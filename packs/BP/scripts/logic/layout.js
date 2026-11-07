import { CABINET_MAX } from './stations.js';
import { DIRECTIONS } from './restaurant.js';

/**
 * Sample restaurant built by the Restaurant-Baukasten (pure data, no world access).
 *
 * Local coordinates: x to the right, z into the room from the entrance, y up; y = 0 is the floor layer.
 * `minecraft:cardinal_direction` values in the layout are written for an entrance seen by a
 * player looking north: local +z (into the room) is 'north', local +x (right) is 'east'.
 *
 * @typedef {import('./restaurant.js').Direction} Direction
 * @typedef {Record<string, string | number | boolean>} BlockStates
 * @typedef {{ x: number, y: number, z: number, id: string, states?: BlockStates }} LayoutBlock
 * @typedef {{ width: number, depth: number, height: number, blocks: LayoutBlock[] }} Layout
 * @typedef {{ x: number, y: number, z: number }} Vec
 */

const WIDTH = 15;
const DEPTH = 11;
/** Floor layer, four wall layers, roof layer. */
const HEIGHT = 6;
const WALL_TOP = 4;
const ROOF_Y = 5;
/** First row of the kitchen half (the half-wall row); the dining room is in front of it. */
const KITCHEN_Z = 5;
/** Columns of the 2-wide door opening in the front wall; the tapped block lines up with the first one. */
export const DOOR_XS = [7, 8];
/** Gap in the half-wall between dining room and kitchen, straight behind the door. */
const PASS_XS = [7, 8];
/** Distance from the tapped block to the front wall. */
export const ENTRANCE_DISTANCE = 2;

const FLOOR = 'minecraft:smooth_stone';
const KITCHEN_FLOOR = 'minecraft:polished_andesite';
const WALL = 'minecraft:white_terracotta';
const WINDOW = 'minecraft:glass_pane';
const ROOF = 'minecraft:dark_oak_planks';
const LIGHT = 'minecraft:glowstone';
const HALF_WALL = 'minecraft:smooth_stone';
const WORKTOP = 'minecraft:smooth_stone_slab';

const FRONT_WINDOWS = [2, 3, 4, 10, 11, 12];
const SIDE_WINDOWS = [2, 3, 7, 8];
const WINDOW_YS = [2, 3];
const LIGHT_XS = [3, 7, 11];
const LIGHT_ZS = [2, 5, 8];

/** Tables in the dining room; each chair stands one block nearer the entrance (away from the kitchen). */
const TABLE_XS = [2, 5, 10, 13];
const TABLE_Z = 3;
/** The bell stands on a small counter in the dining room, next to the kitchen pass-through. */
const BELL_POS = { x: 6, y: 2, z: 4 };

/**
 * @param {number} x @param {number} z
 * @returns {boolean} whether (x, z) is on the outer wall ring
 */
const onWall = (x, z) => x === 0 || x === WIDTH - 1 || z === 0 || z === DEPTH - 1;

/** @param {number} x @param {number} y @param {number} z @returns {string | null} wall block, null for the door opening */
function wallBlock(x, y, z) {
  if (z === 0 && DOOR_XS.includes(x) && y <= 2) return null;
  const front = z === 0 && FRONT_WINDOWS.includes(x);
  const side = (x === 0 || x === WIDTH - 1) && SIDE_WINDOWS.includes(z);
  return (front || side) && WINDOW_YS.includes(y) ? WINDOW : WALL;
}

/** @returns {Layout} */
function buildRestaurant() {
  /** @type {LayoutBlock[]} */
  const blocks = [];
  /** @param {number} x @param {number} y @param {number} z @param {string} id @param {BlockStates} [states] */
  const put = (x, y, z, id, states) => { blocks.push(states ? { x, y, z, id, states } : { x, y, z, id }); };
  const back = DEPTH - 2; // last row inside, against the back wall
  const right = WIDTH - 2; // last column inside, against the right wall

  // 1. floor
  for (let z = 0; z < DEPTH; z++) {
    for (let x = 0; x < WIDTH; x++) put(x, 0, z, z >= KITCHEN_Z ? KITCHEN_FLOOR : FLOOR);
  }
  // 2. walls, the half-wall between dining room and kitchen, the bell counter
  for (let y = 1; y <= WALL_TOP; y++) {
    for (let z = 0; z < DEPTH; z++) {
      for (let x = 0; x < WIDTH; x++) {
        if (!onWall(x, z)) continue;
        const id = wallBlock(x, y, z);
        if (id) put(x, y, z, id);
      }
    }
  }
  for (let x = 1; x <= right; x++) if (!PASS_XS.includes(x)) put(x, 1, KITCHEN_Z, HALF_WALL);
  put(BELL_POS.x, BELL_POS.y - 1, BELL_POS.z, HALF_WALL);
  // 3. flat roof with glowstone lights
  for (let z = 0; z < DEPTH; z++) {
    for (let x = 0; x < WIDTH; x++) {
      const light = LIGHT_XS.includes(x) && LIGHT_ZS.includes(z);
      put(x, ROOF_Y, z, light ? LIGHT : ROOF);
    }
  }
  // 4. furniture: worktops on the half-wall, tables with chairs, cabinets and crates
  for (let x = 1; x <= right; x++) if (!PASS_XS.includes(x)) put(x, 2, KITCHEN_Z, WORKTOP, { 'minecraft:vertical_half': 'bottom' });
  for (const x of TABLE_XS) {
    put(x, 1, TABLE_Z, 'kochmod:table');
    put(x, 1, TABLE_Z - 1, 'kochmod:chair', { 'minecraft:cardinal_direction': 'north' });
  }
  put(3, 1, back, 'kochmod:fridge', { 'minecraft:cardinal_direction': 'south' });
  put(4, 1, back, 'kochmod:pantry', { 'minecraft:cardinal_direction': 'south' });
  put(right, 1, back - 1, 'kochmod:crate_tools');
  put(right, 1, back, 'kochmod:crate_all');
  // 5. stations along the back wall
  put(5, 1, back, 'kochmod:grill');
  put(6, 1, back, 'kochmod:cutting_board');
  put(7, 1, back, 'kochmod:counter');
  put(8, 1, back, 'kochmod:oven');
  put(9, 1, back, 'kochmod:dishwasher', { 'minecraft:cardinal_direction': 'south' });
  put(10, 1, back, 'kochmod:dish_cabinet', { 'minecraft:cardinal_direction': 'south', 'kochmod:plates': CABINET_MAX });
  // 6. the bell last, so no guest is called before the chairs exist
  put(BELL_POS.x, BELL_POS.y, BELL_POS.z, 'kochmod:bell');
  return { width: WIDTH, depth: DEPTH, height: HEIGHT, blocks };
}

/** The sample restaurant, blocks in placement order: floor, walls, roof, furniture, stations, bell. */
export const RESTAURANT = buildRestaurant();

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
 * World position of the layout origin (local 0,0,0): the front wall stands ENTRANCE_DISTANCE blocks
 * beyond the tapped block, the door opening starts in the tapped block's column, the floor layer is
 * level with the tapped block (so the doorway has no step).
 * @param {Vec} tapped location of the ground block that was tapped
 * @param {Direction} facing direction the player looks
 * @returns {Vec}
 */
export function placementOrigin(tapped, facing) {
  const { f, r } = AXES[facing];
  return {
    x: tapped.x + ENTRANCE_DISTANCE * f.x - DOOR_XS[0] * r.x,
    y: tapped.y,
    z: tapped.z + ENTRANCE_DISTANCE * f.z - DOOR_XS[0] * r.z,
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
