import fs from 'node:fs';
import path from 'node:path';
import { layouts } from './sprites/blocks.js';

/** @typedef {[number, number, number, number]} Region */
/** @typedef {{ origin: [number, number, number], size: [number, number, number], top: string, side: string, bottom?: string, front?: string }} CubeDef */
/** @typedef {{ name: string, cubes: CubeDef[] }} BoneDef */

/** Station body: 16x12x16 worktop. @param {number} [height] @returns {BoneDef} */
const body = (height = 12) => ({
  name: 'body',
  cubes: [{ origin: [-8, 0, -8], size: [16, height, 16], top: 'body_top', side: 'body_side', bottom: 'body_bottom' }],
});

/** @param {number} y @param {number} half @returns {BoneDef[]} */
const patties = (y, half) => ['raw', 'cooked', 'burnt'].map((kind) => ({
  name: `patty_${kind}`,
  cubes: [{ origin: [-half, y, -half], size: [half * 2, 2, half * 2], top: `patty_${kind}_top`, side: `patty_${kind}_side` }],
}));

/**
 * Tall cabinet (fridge, pantry): one 14x23x14 box, front (north, -z) distinct from the sides.
 * Blocks may reach 23 px high (Bedrock allows 7 px beyond the block); their collision box is capped at 16 in the block JSON.
 * @type {BoneDef[]}
 */
const tallCabinet = [
  { name: 'cabinet', cubes: [{ origin: [-7, 0, -7], size: [14, 23, 14], top: 'top', side: 'side', bottom: 'bottom', front: 'front' }] },
];

/** Dish cabinet plates: 4 on the bottom board, 4 on the shelf; plate_n shows when the count is >= n. */
const PLATE_Y = [1, 2, 3, 4, 8, 9, 10, 11];

/** @type {Record<keyof typeof layouts, BoneDef[]>} */
export const models = {
  fridge: tallCabinet,
  pantry: tallCabinet,
  // Front (north, -z) faces the player after the cardinal_direction rotation; the status light sticks out 0.5 px.
  dishwasher: [
    { name: 'body', cubes: [{ origin: [-8, 0, -8], size: [16, 16, 16], top: 'top', side: 'side', bottom: 'bottom', front: 'front' }] },
    ...['off', 'blue', 'green'].map((light) => ({
      name: `light_${light}`,
      cubes: [/** @type {CubeDef} */ ({ origin: [4, 13, -8.5], size: [2, 2, 0.5], top: `light_${light}`, side: `light_${light}` })],
    })),
  ],
  // Open towards north (-z): back wall, two side walls, bottom, middle shelf and top board.
  dish_cabinet: [
    {
      name: 'cabinet',
      cubes: [
        { origin: [-8, 0, 7], size: [16, 16, 1], top: 'panel_top', side: 'panel', front: 'inside' },
        { origin: [-8, 0, -8], size: [1, 16, 15], top: 'panel_top', side: 'panel' },
        { origin: [7, 0, -8], size: [1, 16, 15], top: 'panel_top', side: 'panel' },
        { origin: [-7, 0, -8], size: [14, 1, 15], top: 'board_top', side: 'board_edge' },
        { origin: [-7, 7, -8], size: [14, 1, 15], top: 'board_top', side: 'board_edge' },
        { origin: [-7, 15, -8], size: [14, 1, 15], top: 'panel_top', side: 'board_edge', bottom: 'board_top' },
      ],
    },
    ...PLATE_Y.map((y, i) => ({
      name: `plate_${i + 1}`,
      cubes: [/** @type {CubeDef} */ ({ origin: [-4, y, -5], size: [8, 0.75, 8], top: 'plate_top', side: 'plate_side' })],
    })),
  ],
  grill: [
    body(11),
    { name: 'grate', cubes: [{ origin: [-7, 11, -7], size: [14, 1, 14], top: 'grate_top', side: 'grate_side', bottom: 'body_bottom' }] },
    ...patties(12, 5),
  ],
  cutting_board: [
    body(),
    { name: 'board', cubes: [{ origin: [-6, 12, -5], size: [12, 1, 10], top: 'board_top', side: 'board_side' }] },
    {
      name: 'tomato',
      cubes: [
        { origin: [-2, 13, -2], size: [4, 4, 4], top: 'tomato_top', side: 'tomato_side' },
        { origin: [-0.5, 17, -0.5], size: [1, 1, 1], top: 'stem', side: 'stem' },
      ],
    },
    {
      name: 'tomato_slices',
      cubes: [
        { origin: [-6, 13, -3], size: [4, 1, 4], top: 'slice_top', side: 'slice_side' },
        { origin: [-2, 13, -1], size: [4, 1, 4], top: 'slice_top', side: 'slice_side' },
        { origin: [2, 13, -3], size: [4, 1, 4], top: 'slice_top', side: 'slice_side' },
      ],
    },
  ],
  counter: [
    body(),
    { name: 'plate', cubes: [{ origin: [-5, 12, -5], size: [10, 1, 10], top: 'plate_top', side: 'plate_side' }] },
    { name: 'bun_bottom', cubes: [{ origin: [-4, 13, -4], size: [8, 2, 8], top: 'bun_cut', side: 'bun_side' }] },
    ...patties(15, 5),
    { name: 'cheese', cubes: [{ origin: [-5, 17, -5], size: [10, 1, 10], top: 'cheese_top', side: 'cheese_side' }] },
    { name: 'tomato_slices', cubes: [{ origin: [-4, 18, -4], size: [8, 1, 8], top: 'slices_top', side: 'slices_side' }] },
    {
      name: 'tomato_whole',
      cubes: [
        { origin: [5, 12, 4], size: [3, 3, 3], top: 'tomato_top', side: 'tomato_side' },
        { origin: [6, 15, 5], size: [1, 1, 1], top: 'stem', side: 'stem' },
      ],
    },
    { name: 'lettuce', cubes: [{ origin: [-5, 19, -5], size: [10, 1, 10], top: 'lettuce_top', side: 'lettuce_side' }] },
    {
      name: 'bun_top',
      cubes: [
        { origin: [-4, 20, -4], size: [8, 2, 8], top: 'bun_top', side: 'bun_side', bottom: 'bun_cut' },
        { origin: [-3, 22, -3], size: [6, 1, 6], top: 'dome_top', side: 'bun_side' },
      ],
    },
  ],
  table: [
    {
      name: 'table',
      cubes: [
        { origin: [-8, 14, -8], size: [16, 2, 16], top: 'top_top', side: 'top_side', bottom: 'top_bottom' },
        ...[[-7, -7], [5, -7], [-7, 5], [5, 5]].map(([x, z]) => (
          /** @type {CubeDef} */ ({ origin: [x, 0, z], size: [2, 14, 2], top: 'leg_end', side: 'leg_side' })
        )),
      ],
    },
    { name: 'plate', cubes: [{ origin: [-5, 16, -5], size: [10, 1, 10], top: 'plate_top', side: 'plate_side' }] },
    { name: 'plate_empty', cubes: [{ origin: [-5, 16, -5], size: [10, 1, 10], top: 'plate_empty_top', side: 'plate_side' }] },
    {
      name: 'hamburger',
      cubes: [
        { origin: [-4, 17, -4], size: [8, 2, 8], top: 'bun_cut', side: 'bun_side' },
        { origin: [-4.5, 19, -4.5], size: [9, 2, 9], top: 'patty_top', side: 'patty_side' },
        { origin: [-5, 21, -5], size: [10, 1, 10], top: 'lettuce_top', side: 'lettuce_side' },
        { origin: [-4, 22, -4], size: [8, 2, 8], top: 'bun_top', side: 'bun_side', bottom: 'bun_cut' },
        { origin: [-3, 24, -3], size: [6, 1, 6], top: 'dome_top', side: 'bun_side' },
      ],
    },
    {
      name: 'cheeseburger',
      cubes: [
        { origin: [-4, 17, -4], size: [8, 2, 8], top: 'bun_cut', side: 'bun_side' },
        { origin: [-4.5, 19, -4.5], size: [9, 2, 9], top: 'patty_top', side: 'patty_side' },
        { origin: [-5.5, 21, -5.5], size: [11, 1, 11], top: 'cheese_top', side: 'cheese_side' },
        { origin: [-5, 22, -5], size: [10, 1, 10], top: 'lettuce_top', side: 'lettuce_side' },
        { origin: [-4, 23, -4], size: [8, 2, 8], top: 'bun_top', side: 'bun_side', bottom: 'bun_cut' },
        { origin: [-3, 25, -3], size: [6, 1, 6], top: 'dome_top', side: 'bun_side' },
      ],
    },
    {
      name: 'failed_dish',
      cubes: [
        { origin: [-3.5, 17, -3.5], size: [7, 3, 7], top: 'blob_top', side: 'blob_side' },
        { origin: [-1, 20, -2], size: [4, 2, 4], top: 'blob_small_top', side: 'blob_small_side' },
      ],
    },
  ],
  // Faces north (seat opening at -z, backrest at +z); the block rotates it by minecraft:cardinal_direction.
  chair: [
    {
      name: 'chair',
      cubes: [
        { origin: [-6, 6, -6], size: [12, 2, 12], top: 'seat_top', side: 'seat_side', bottom: 'seat_bottom' },
        ...[[-6, -6], [4, -6], [-6, 4], [4, 4]].map(([x, z]) => (
          /** @type {CubeDef} */ ({ origin: [x, 0, z], size: [2, 6, 2], top: 'leg_end', side: 'leg_side' })
        )),
        { origin: [-6, 8, 4], size: [12, 10, 2], top: 'back_top', side: 'back_side' },
      ],
    },
  ],
  bell: [
    {
      name: 'bell',
      cubes: [
        { origin: [-4, 0, -4], size: [8, 2, 8], top: 'base_top', side: 'base_side' },
        { origin: [-3, 2, -3], size: [6, 3, 6], top: 'bell_top', side: 'bell_side' },
        { origin: [-2, 5, -2], size: [4, 1, 4], top: 'cap_top', side: 'cap_side' },
        { origin: [-1, 6, -1], size: [2, 1, 2], top: 'knob', side: 'knob' },
      ],
    },
  ],
};

/**
 * @param {Region} r
 * @param {number} w
 * @param {number} h
 * @param {string} what
 */
function crop(r, w, h, what) {
  const cw = Math.max(1, Math.ceil(w));
  const ch = Math.max(1, Math.ceil(h));
  if (cw > r[2] || ch > r[3]) throw new Error(`${what}: face ${cw}x${ch} does not fit region ${r[2]}x${r[3]}`);
  return { uv: [r[0], r[1]], uv_size: [cw, ch] };
}

/** @param {Record<string, Region>} layout */
function assertNoOverlap(layout) {
  const entries = Object.entries(layout);
  for (const [a, ra] of entries) {
    if (ra[0] + ra[2] > 64 || ra[1] + ra[3] > 64) throw new Error(`region ${a} leaves the 64x64 atlas`);
    for (const [b, rb] of entries) {
      if (a >= b) continue;
      const apart = ra[0] + ra[2] <= rb[0] || rb[0] + rb[2] <= ra[0] || ra[1] + ra[3] <= rb[1] || rb[1] + rb[3] <= ra[1];
      if (!apart) throw new Error(`regions ${a} and ${b} overlap`);
    }
  }
}

/**
 * @param {string} id block id without namespace
 * @returns {object} geometry file content
 */
export function buildGeometry(id) {
  const layout = /** @type {Record<string, Region>} */ (layouts[/** @type {keyof typeof layouts} */ (id)]);
  assertNoOverlap(layout);
  const bones = models[/** @type {keyof typeof models} */ (id)].map((bone) => ({
    name: bone.name,
    pivot: [0, 0, 0],
    cubes: bone.cubes.map((cube) => {
      const [sx, sy, sz] = cube.size;
      const region = (/** @type {string} */ key) => {
        const r = layout[key];
        if (!r) throw new Error(`${id}.${bone.name}: unknown region ${key}`);
        return r;
      };
      const what = `${id}.${bone.name}`;
      const side = region(cube.side);
      const top = region(cube.top);
      const bottom = region(cube.bottom ?? cube.top);
      return {
        origin: cube.origin,
        size: cube.size,
        uv: {
          north: crop(cube.front ? region(cube.front) : side, sx, sy, what),
          south: crop(side, sx, sy, what),
          east: crop(side, sz, sy, what),
          west: crop(side, sz, sy, what),
          up: crop(top, sx, sz, what),
          down: crop(bottom, sx, sz, what),
        },
      };
    }),
  }));
  return {
    format_version: '1.12.0',
    'minecraft:geometry': [
      {
        description: {
          identifier: `geometry.kochmod.${id}`,
          texture_width: 64,
          texture_height: 64,
          visible_bounds_width: 2,
          visible_bounds_height: 2.5,
          visible_bounds_offset: [0, 0.75, 0],
        },
        bones,
      },
    ],
  };
}

/** @param {string} root project root @returns {number} files written */
export function writeBlockGeometry(root) {
  const outDir = path.join(root, 'packs', 'RP', 'models', 'blocks');
  fs.mkdirSync(outDir, { recursive: true });
  const ids = Object.keys(models);
  for (const id of ids) {
    fs.writeFileSync(path.join(outDir, `${id}.geo.json`), `${JSON.stringify(buildGeometry(id), null, 2)}\n`);
  }
  return ids.length;
}

// ---- Guest entity

/** @typedef {'north' | 'south' | 'east' | 'west' | 'up' | 'down'} Face */
/** @typedef {{ origin: [number, number, number], size: [number, number, number], faces: Partial<Record<Face, string>> }} EntityCube */
/** @typedef {{ name: string, parent?: string, pivot: [number, number, number], cubes: EntityCube[] }} EntityBone */

/**
 * @param {[number, number, number]} origin
 * @param {[number, number, number]} size
 * @param {string} front north face (the guest looks towards -z)
 * @param {string} back
 * @param {string} side
 * @param {string} top
 * @param {string} [bottom]
 * @returns {EntityCube}
 */
const box = (origin, size, front, back, side, top, bottom = top) => ({
  origin, size, faces: { north: front, south: back, east: side, west: side, up: top, down: bottom },
});

/** @param {[number, number, number]} origin @param {[number, number, number]} size @param {string} region @returns {EntityCube} */
const solid = (origin, size, region) => box(origin, size, region, region, region, region);

/**
 * Bone names are the contract with guest.animation.json and guest.render_controllers.json.
 * Feet at y=0, face towards -z. The bubble quads are 0.1 thick so both sides show the picture.
 * @type {EntityBone[]}
 */
export const guestModel = [
  { name: 'root', pivot: [0, 0, 0], cubes: [] },
  { name: 'leg_left', parent: 'root', pivot: [2, 8, 0], cubes: [box([0, 0, -2], [4, 8, 4], 'leg_front', 'leg_front', 'leg_side', 'leg_top', 'leg_sole')] },
  { name: 'leg_right', parent: 'root', pivot: [-2, 8, 0], cubes: [box([-4, 0, -2], [4, 8, 4], 'leg_front', 'leg_front', 'leg_side', 'leg_top', 'leg_sole')] },
  { name: 'body', parent: 'root', pivot: [0, 8, 0], cubes: [box([-4, 8, -3], [8, 11, 6], 'body_front', 'body_back', 'body_side', 'body_top')] },
  { name: 'head', parent: 'body', pivot: [0, 19, 0], cubes: [box([-5, 19, -5], [10, 10, 10], 'head_front', 'head_back', 'head_side', 'head_top', 'head_bottom')] },
  { name: 'nose', parent: 'head', pivot: [0, 22, -5], cubes: [box([-1, 20, -7], [2, 4, 2], 'nose_front', 'nose_front', 'nose_side', 'nose_top')] },
  { name: 'arm_left', parent: 'body', pivot: [5, 18, 0], cubes: [box([4, 9, -1.5], [2, 9, 3], 'arm_front', 'arm_front', 'arm_side', 'arm_top', 'arm_hand')] },
  { name: 'arm_right', parent: 'body', pivot: [-5, 18, 0], cubes: [box([-6, 9, -1.5], [2, 9, 3], 'arm_front', 'arm_front', 'arm_side', 'arm_top', 'arm_hand')] },
  {
    name: 'bubble',
    parent: 'root',
    pivot: [0, 30, 0],
    cubes: [solid([2, 29.5, -0.5], [1, 1, 1], 'dot'), solid([3.5, 31, -0.75], [1.5, 1.5, 1.5], 'dot')],
  },
  ...['hamburger', 'cheeseburger'].map((wish) => (/** @type {EntityBone} */ ({
    name: `bubble_${wish}`,
    parent: 'bubble',
    pivot: [0, 40, 0],
    cubes: [box([-7, 33, -0.05], [14, 14, 0.1], `bubble_${wish}`, `bubble_${wish}`, 'bubble_edge', 'bubble_edge')],
  }))),
];

/**
 * @param {Record<string, [number, number, number, number]>} layout
 * @param {{ width: number, height: number }} texture
 * @returns {object} geometry file content
 */
export function buildGuestGeometry(layout, texture) {
  for (const [name, r] of Object.entries(layout)) {
    if (r[0] + r[2] > texture.width || r[1] + r[3] > texture.height) throw new Error(`guest region ${name} leaves the texture`);
  }
  const bones = guestModel.map((bone) => ({
    name: bone.name,
    ...(bone.parent ? { parent: bone.parent } : {}),
    pivot: bone.pivot,
    cubes: bone.cubes.map((cube) => ({
      origin: cube.origin,
      size: cube.size,
      uv: Object.fromEntries(Object.entries(cube.faces).map(([face, key]) => {
        const r = layout[/** @type {string} */ (key)];
        if (!r) throw new Error(`guest.${bone.name}: unknown region ${key}`);
        return [face, { uv: [r[0], r[1]], uv_size: [r[2], r[3]] }];
      })),
    })),
  }));
  return {
    format_version: '1.16.0',
    'minecraft:geometry': [
      {
        description: {
          identifier: 'geometry.kochmod.guest',
          texture_width: texture.width,
          texture_height: texture.height,
          visible_bounds_width: 2,
          visible_bounds_height: 3.5,
          visible_bounds_offset: [0, 1.5, 0],
        },
        bones,
      },
    ],
  };
}

/**
 * @param {string} root project root
 * @param {Record<string, [number, number, number, number]>} layout
 * @param {{ width: number, height: number }} texture
 */
export function writeEntityGeometry(root, layout, texture) {
  const outDir = path.join(root, 'packs', 'RP', 'models', 'entity');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'guest.geo.json'), `${JSON.stringify(buildGuestGeometry(layout, texture), null, 2)}\n`);
}
