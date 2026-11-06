import fs from 'node:fs';
import path from 'node:path';
import { layouts } from './sprites/blocks.js';

/** @typedef {[number, number, number, number]} Region */
/** @typedef {{ origin: [number, number, number], size: [number, number, number], top: string, side: string, bottom?: string }} CubeDef */
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

/** @type {Record<keyof typeof layouts, BoneDef[]>} */
export const models = {
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
          north: crop(side, sx, sy, what),
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
