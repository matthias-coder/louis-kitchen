import * as blocks from './blocks.js';

/**
 * 16x16 menu icons for blocks (crate menu buttons): a simple front view per block,
 * written to textures/items/block_<id>.png.
 */

/** Sprite folder under packs/RP/textures. */
export const folder = 'items';

/** @typedef {import('./util.js').Sprite} Sprite */
/**
 * @typedef {{
 *   rect(x0: number, y0: number, x1: number, y1: number, ch: string): void,
 *   px(x: number, y: number, ch: string): void,
 * }} Pen rect corners are inclusive
 */

/**
 * @param {string} id block id without namespace
 * @param {Record<string, string>} palette
 * @param {(pen: Pen) => void} draw
 * @returns {Sprite}
 */
function icon(id, palette, draw) {
  const grid = Array.from({ length: 16 }, () => Array(16).fill('.'));
  /** @type {Pen} */
  const pen = {
    rect(x0, y0, x1, y1, ch) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = ch;
    },
    px(x, y, ch) {
      grid[y][x] = ch;
    },
  };
  draw(pen);
  return { name: `block_${id}`, palette, rows: grid.map((r) => r.join('')) };
}

/** A crate already is a 16x16 cube face: its icon is that face. @param {Sprite} face @returns {Sprite} */
const crateIcon = (face) => ({ name: `block_${face.name}`, palette: { ...face.palette }, rows: [...face.rows] });

const WOOD = { A: '#c28a52', B: '#d9a46a', C: '#8a5a2e', D: '#6b4423' };
const PLATE = { w: '#ffffff', r: '#9fd3f2', o: '#5f8fb0' };

export const block_grill = icon('grill', {
  a: '#1b1c1f', b: '#3d4047', c: '#5c616b', g: '#9aa0a8', G: '#dfe4ea',
  e: '#ff7a1a', E: '#ffc04d', r: '#c0392b', p: '#844622', q: '#5e3016',
}, ({ rect, px }) => {
  rect(1, 6, 14, 15, 'b');
  rect(1, 6, 14, 6, 'c');
  rect(1, 15, 14, 15, 'a');
  rect(4, 9, 11, 9, 'a');
  rect(4, 11, 11, 11, 'a');
  px(3, 13, 'r'); px(12, 13, 'r');
  rect(0, 5, 15, 5, 'g');
  for (const x of [1, 4, 7, 10, 13]) px(x, 5, 'G');
  rect(4, 3, 11, 4, 'p');
  rect(4, 4, 11, 4, 'q');
  for (const [x, y] of [[2, 4], [2, 3], [13, 4], [13, 3], [3, 2]]) px(x, y, 'e');
  for (const [x, y] of [[2, 2], [13, 2], [12, 1]]) px(x, y, 'E');
});

export const block_cutting_board = icon('cutting_board', {
  s: '#9a9a9a', S: '#7d7d7d', k: '#5a5a5a', w: '#c08a4c', W: '#8d5f2f', t: '#e0302a', T: '#a81f18', l: '#3c8a2a',
}, ({ rect, px }) => {
  rect(1, 7, 14, 15, 's');
  for (const [x, y] of [[3, 9], [8, 10], [12, 12], [5, 13], [10, 8], [2, 12]]) px(x, y, 'S');
  rect(1, 15, 14, 15, 'k');
  rect(2, 5, 13, 6, 'w');
  rect(2, 6, 13, 6, 'W');
  rect(6, 2, 9, 4, 't');
  px(6, 2, '.'); px(9, 2, '.'); // rounded top
  px(9, 4, 'T'); px(8, 4, 'T');
  px(7, 1, 'l'); px(8, 1, 'l');
});

export const block_counter = icon('counter', {
  a: '#a8763e', A: '#8d5f2f', F: '#6b4423', ...PLATE,
  b: '#d28a36', B: '#a8631f', p: '#844622', l: '#5cbf3a',
}, ({ rect }) => {
  rect(1, 8, 14, 15, 'a');
  rect(1, 11, 14, 11, 'A');
  rect(1, 14, 14, 14, 'A');
  rect(1, 8, 14, 8, 'F');
  rect(1, 8, 1, 15, 'F');
  rect(14, 8, 14, 15, 'F');
  rect(3, 7, 12, 7, 'w');
  rect(5, 6, 10, 6, 'B');
  rect(4, 5, 11, 5, 'p');
  rect(4, 4, 11, 4, 'l');
  rect(5, 2, 10, 3, 'b');
  rect(6, 1, 9, 1, 'b');
});

export const block_crate_vegetables = crateIcon(blocks.crate_vegetables);
export const block_crate_meat = crateIcon(blocks.crate_meat);
export const block_crate_bread = crateIcon(blocks.crate_bread);
export const block_crate_dairy = crateIcon(blocks.crate_dairy);
export const block_crate_tools = crateIcon(blocks.crate_tools);
export const block_crate_all = crateIcon(blocks.crate_all);

export const block_fridge = icon('fridge', {
  W: '#f1f4f6', L: '#cfd5da', S: '#9aa3aa', H: '#3b4147', B: '#5aa9e6', D: '#4a4f55',
}, ({ rect, px }) => {
  rect(4, 0, 11, 15, 'W');
  rect(4, 0, 11, 0, 'L');
  rect(4, 0, 4, 15, 'L');
  rect(11, 0, 11, 15, 'L');
  rect(5, 5, 10, 5, 'S');
  rect(9, 2, 9, 3, 'H');
  rect(9, 7, 9, 11, 'H');
  px(6, 2, 'B');
  rect(4, 15, 11, 15, 'D');
});

export const block_pantry = icon('pantry', {
  O: '#d9b274', K: '#8a5a2b', Y: '#f3dc9a',
}, ({ rect, px }) => {
  rect(4, 0, 11, 15, 'O');
  rect(4, 0, 11, 0, 'K');
  rect(4, 0, 4, 15, 'K');
  rect(11, 0, 11, 15, 'K');
  rect(7, 1, 8, 14, 'K');
  rect(5, 5, 10, 5, 'K');
  for (const [x, y] of [[6, 3], [9, 3], [6, 9], [9, 9]]) px(x, y, 'Y');
  rect(4, 15, 11, 15, 'K');
});

export const block_dishwasher = icon('dishwasher', {
  W: '#f1f4f6', L: '#cfd5da', D: '#2f3439', B: '#9aa3aa', b: '#3fa9ff', H: '#3b4147', K: '#4a4f55',
}, ({ rect, px }) => {
  rect(1, 1, 14, 15, 'W');
  rect(1, 1, 1, 15, 'L');
  rect(14, 1, 14, 15, 'L');
  rect(1, 1, 14, 3, 'D');
  px(3, 2, 'b'); px(4, 2, 'b');
  px(9, 2, 'B'); px(11, 2, 'B'); px(13, 2, 'B');
  rect(2, 4, 13, 4, 'L');
  rect(4, 6, 11, 6, 'H');
  rect(1, 14, 14, 15, 'K');
});

export const block_dish_cabinet = icon('dish_cabinet', {
  K: '#6b4423', I: '#5e3a1d', N: '#c08a4c', ...PLATE,
}, ({ rect }) => {
  rect(1, 1, 14, 15, 'K');
  rect(2, 2, 13, 14, 'I');
  rect(2, 8, 13, 8, 'N');
  rect(2, 14, 13, 14, 'N');
  for (const base of [7, 13]) {
    for (let i = 0; i < 4; i++) rect(4, base - i, 11, base - i, i % 2 === 0 ? 'w' : 'r');
    rect(4, base - 3, 4, base, 'o');
    rect(11, base - 3, 11, base, 'o');
  }
});

export const block_table = icon('table', { ...WOOD, ...PLATE }, ({ rect }) => {
  rect(0, 6, 15, 7, 'A');
  rect(0, 7, 15, 7, 'D');
  rect(1, 8, 2, 15, 'C');
  rect(13, 8, 14, 15, 'C');
  rect(5, 5, 10, 5, 'w');
  rect(4, 5, 4, 5, 'r');
  rect(11, 5, 11, 5, 'r');
});

export const block_chair = icon('chair', { A: '#9c6534', B: '#b97c45', C: '#734520', D: '#4f2e14', H: '#e0303a' }, ({ rect, px }) => {
  rect(3, 1, 12, 8, 'A');
  rect(3, 1, 12, 1, 'D');
  rect(3, 1, 3, 8, 'D');
  rect(12, 1, 12, 8, 'D');
  for (const [x, y] of [[6, 3], [9, 3], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [6, 5], [7, 5], [8, 5], [9, 5], [7, 6], [8, 6]]) px(x, y, 'H');
  rect(2, 9, 13, 10, 'B');
  rect(2, 10, 13, 10, 'D');
  rect(3, 11, 4, 15, 'C');
  rect(11, 11, 12, 15, 'C');
});

export const block_bell = icon('bell', {
  w: '#5a3a22', v: '#3a2412', g: '#e0b040', G: '#f2cc5c', Y: '#fff2a8', d: '#a07020', s: '#b8bcc4',
}, ({ rect, px }) => {
  rect(2, 13, 13, 15, 'w');
  rect(2, 15, 13, 15, 'v');
  rect(4, 9, 11, 12, 'g');
  rect(4, 12, 11, 12, 'd');
  rect(5, 8, 10, 8, 'g');
  rect(6, 7, 9, 7, 'G');
  rect(7, 5, 8, 6, 's');
  px(5, 9, 'Y'); px(6, 8, 'Y');
});
