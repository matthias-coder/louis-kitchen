import * as items from './items.js';

/**
 * Block atlases (64x64, 16 texels per block). Each block has one texture; the
 * geometry (tools/geometry.js) maps cube faces onto the regions in `layouts`.
 */

/** Sprite folder under packs/RP/textures. */
export const folder = 'blocks';

/** @typedef {import('./util.js').Sprite} Sprite */
/** @typedef {[number, number, number, number]} Region u, v, width, height */

const SIZE = 64;

/** @param {number} seed */
function random(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function canvas() {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill('.'));
  const c = {
    /** @param {Region} r @param {number} x @param {number} y @param {string} ch */
    px(r, x, y, ch) {
      if (x >= 0 && y >= 0 && x < r[2] && y < r[3]) grid[r[1] + y][r[0] + x] = ch;
    },
    /** @param {Region} r @param {string} ch */
    fill(r, ch) {
      for (let y = 0; y < r[3]; y++) for (let x = 0; x < r[2]; x++) c.px(r, x, y, ch);
    },
    /** @param {Region} r @param {string} ch */
    border(r, ch) {
      for (let x = 0; x < r[2]; x++) { c.px(r, x, 0, ch); c.px(r, x, r[3] - 1, ch); }
      for (let y = 0; y < r[3]; y++) { c.px(r, 0, y, ch); c.px(r, r[2] - 1, y, ch); }
    },
    /** @param {Region} r @param {number} y @param {string} ch */
    row(r, y, ch) {
      for (let x = 0; x < r[2]; x++) c.px(r, x, y, ch);
    },
    /** Sprinkles `ch` over pixels that currently hold `on`. @param {Region} r @param {string} on @param {string} ch @param {number} density @param {number} seed */
    speckle(r, on, ch, density, seed) {
      const rnd = random(seed);
      for (let y = 0; y < r[3]; y++) {
        for (let x = 0; x < r[2]; x++) {
          if (rnd() < density && grid[r[1] + y][r[0] + x] === on) c.px(r, x, y, ch);
        }
      }
    },
    rows: () => grid.map((r) => r.join('')),
  };
  return c;
}

// ---- Patty (shared by grill and counter)

const PATTY_PALETTE = {
  // raw: clearly pink with white fat
  p: '#f29aac', q: '#d9708a', w: '#fde0e6', x: '#b04a64',
  // cooked: warm brown with dark grill marks
  h: '#b0703e', m: '#844622', n: '#5e3016', z: '#2e1408',
  // burnt: black with grey ash and a few dark-red embers
  u: '#2a2421', v: '#141110', y: '#4a403b', s: '#0a0808', k: '#6a1a0c',
};

/**
 * @param {ReturnType<typeof canvas>} c
 * @param {Region} top 10x10
 * @param {Region} side 10x2
 * @param {'raw' | 'cooked' | 'burnt'} kind
 * @param {number} seed
 */
function drawPatty(c, top, side, kind, seed) {
  const corners = /** @param {string} ch */ (ch) => {
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [9, 0], [8, 0], [9, 1], [0, 9], [1, 9], [0, 8], [9, 9], [8, 9], [9, 8]]) c.px(top, x, y, ch);
  };
  if (kind === 'raw') {
    c.fill(top, 'p');
    c.speckle(top, 'p', 'q', 0.3, seed);
    c.speckle(top, 'p', 'w', 0.12, seed + 1);
    c.border(top, 'x');
    corners('x');
    c.row(side, 0, 'q');
    c.row(side, 1, 'x');
  } else if (kind === 'cooked') {
    c.fill(top, 'm');
    c.speckle(top, 'm', 'h', 0.3, seed);
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) if ((x + y) % 4 === 1) c.px(top, x, y, 'z');
    c.border(top, 'n');
    corners('n');
    c.row(side, 0, 'm');
    c.row(side, 1, 'n');
  } else {
    c.fill(top, 'u');
    c.speckle(top, 'u', 'v', 0.35, seed);
    c.speckle(top, 'u', 'y', 0.2, seed + 1);
    c.speckle(top, 'v', 'k', 0.08, seed + 2);
    c.border(top, 's');
    corners('s');
    c.row(side, 0, 'u');
    c.row(side, 1, 's');
  }
}

// ---- Layouts (source of truth for the geometry UVs)

/** Tall cabinet atlas (fridge, pantry): 14x23 front, side and back, 14x14 top and bottom. */
const TALL = {
  front: /** @type {Region} */ ([0, 0, 14, 23]),
  side: /** @type {Region} */ ([14, 0, 14, 23]),
  top: /** @type {Region} */ ([28, 0, 14, 14]),
  bottom: /** @type {Region} */ ([28, 14, 14, 14]),
};

export const layouts = {
  fridge: TALL,
  pantry: TALL,
  dishwasher: {
    front: /** @type {Region} */ ([0, 0, 16, 16]),
    side: /** @type {Region} */ ([16, 0, 16, 16]),
    top: /** @type {Region} */ ([32, 0, 16, 16]),
    bottom: /** @type {Region} */ ([48, 0, 16, 16]),
    light_off: /** @type {Region} */ ([0, 16, 2, 2]),
    light_blue: /** @type {Region} */ ([4, 16, 2, 2]),
    light_green: /** @type {Region} */ ([8, 16, 2, 2]),
  },
  dish_cabinet: {
    panel: /** @type {Region} */ ([0, 0, 16, 16]),
    panel_top: /** @type {Region} */ ([16, 0, 16, 16]),
    inside: /** @type {Region} */ ([32, 0, 16, 16]),
    board_edge: /** @type {Region} */ ([48, 0, 16, 1]),
    board_top: /** @type {Region} */ ([0, 16, 16, 16]),
    plate_top: /** @type {Region} */ ([16, 16, 8, 8]),
    plate_side: /** @type {Region} */ ([32, 16, 8, 1]),
  },
  grill: {
    body_side: /** @type {Region} */ ([0, 0, 16, 11]),
    body_top: /** @type {Region} */ ([16, 0, 16, 16]),
    body_bottom: /** @type {Region} */ ([32, 0, 16, 16]),
    grate_top: /** @type {Region} */ ([0, 16, 14, 14]),
    grate_side: /** @type {Region} */ ([16, 16, 14, 1]),
    patty_raw_top: /** @type {Region} */ ([0, 32, 10, 10]),
    patty_raw_side: /** @type {Region} */ ([0, 42, 10, 2]),
    patty_cooked_top: /** @type {Region} */ ([16, 32, 10, 10]),
    patty_cooked_side: /** @type {Region} */ ([16, 42, 10, 2]),
    patty_burnt_top: /** @type {Region} */ ([32, 32, 10, 10]),
    patty_burnt_side: /** @type {Region} */ ([32, 42, 10, 2]),
  },
  cutting_board: {
    body_side: /** @type {Region} */ ([0, 0, 16, 12]),
    body_top: /** @type {Region} */ ([16, 0, 16, 16]),
    body_bottom: /** @type {Region} */ ([32, 0, 16, 16]),
    board_top: /** @type {Region} */ ([0, 16, 12, 10]),
    board_side: /** @type {Region} */ ([16, 16, 12, 1]),
    whole_top: /** @type {Region} */ ([0, 32, 4, 4]),
    whole_side: /** @type {Region} */ ([8, 32, 4, 4]),
    stem: /** @type {Region} */ ([16, 32, 1, 1]),
    cut_top: /** @type {Region} */ ([0, 40, 4, 4]),
    cut_side: /** @type {Region} */ ([8, 40, 4, 1]),
  },
  // counter: body, plate and the layer pictures of the four stack families (tools/geometry.js COUNTER_STACKS)
  counter: {
    body_side: /** @type {Region} */ ([0, 0, 16, 12]),
    body_top: /** @type {Region} */ ([16, 0, 16, 16]),
    body_bottom: /** @type {Region} */ ([32, 0, 16, 16]),
    plate_top: /** @type {Region} */ ([0, 16, 10, 10]),
    patty_top: /** @type {Region} */ ([10, 16, 10, 10]),
    lettuce_top: /** @type {Region} */ ([20, 16, 10, 10]),
    cheese_top: /** @type {Region} */ ([30, 16, 10, 10]),
    dough_top: /** @type {Region} */ ([40, 16, 10, 10]),
    nori_top: /** @type {Region} */ ([50, 16, 10, 10]),
    rice_top: /** @type {Region} */ ([0, 26, 9, 9]),
    salmon_top: /** @type {Region} */ ([10, 26, 8, 8]),
    sauce_top: /** @type {Region} */ ([20, 26, 9, 9]),
    pizza_cheese_top: /** @type {Region} */ ([30, 26, 8, 8]),
    pita_top: /** @type {Region} */ ([40, 26, 10, 6]),
    meat_top: /** @type {Region} */ ([50, 26, 9, 5]),
    bun_cut: /** @type {Region} */ ([0, 36, 8, 8]),
    bun_top: /** @type {Region} */ ([8, 36, 8, 8]),
    slices_top: /** @type {Region} */ ([16, 36, 8, 8]),
    dome_top: /** @type {Region} */ ([24, 36, 6, 6]),
    doner_sauce_top: /** @type {Region} */ ([32, 36, 8, 4]),
    maki_top: /** @type {Region} */ ([42, 36, 3, 3]),
    maki_side: /** @type {Region} */ ([46, 36, 3, 3]),
    salami: /** @type {Region} */ ([50, 36, 2, 2]),
    pepper: /** @type {Region} */ ([54, 36, 2, 2]),
    olive: /** @type {Region} */ ([58, 36, 1, 1]),
    plate_side: /** @type {Region} */ ([0, 44, 10, 1]),
    lettuce_side: /** @type {Region} */ ([10, 44, 10, 1]),
    cheese_side: /** @type {Region} */ ([20, 44, 10, 1]),
    slices_side: /** @type {Region} */ ([30, 44, 8, 1]),
    dough_side: /** @type {Region} */ ([40, 44, 10, 1]),
    nori_side: /** @type {Region} */ ([50, 44, 10, 1]),
    patty_side: /** @type {Region} */ ([0, 46, 10, 2]),
    bun_side: /** @type {Region} */ ([10, 46, 8, 2]),
    pita_side: /** @type {Region} */ ([20, 46, 10, 2]),
    meat_side: /** @type {Region} */ ([30, 46, 9, 2]),
    rice_side: /** @type {Region} */ ([40, 46, 9, 1]),
    salmon_side: /** @type {Region} */ ([50, 46, 8, 1]),
    sauce_side: /** @type {Region} */ ([0, 49, 9, 1]),
    pizza_cheese_side: /** @type {Region} */ ([10, 49, 8, 1]),
    doner_sauce_side: /** @type {Region} */ ([20, 49, 8, 1]),
    salami_side: /** @type {Region} */ ([30, 49, 2, 1]),
    pepper_side: /** @type {Region} */ ([33, 49, 2, 1]),
  },
  table: {
    top_top: /** @type {Region} */ ([0, 0, 16, 16]),
    top_bottom: /** @type {Region} */ ([16, 0, 16, 16]),
    top_side: /** @type {Region} */ ([32, 0, 16, 2]),
    leg_side: /** @type {Region} */ ([32, 4, 2, 14]),
    leg_end: /** @type {Region} */ ([36, 4, 2, 2]),
    plate_top: /** @type {Region} */ ([0, 16, 10, 10]),
    plate_side: /** @type {Region} */ ([12, 16, 10, 1]),
    plate_empty_top: /** @type {Region} */ ([0, 28, 10, 10]),
    food_top: /** @type {Region} */ ([24, 20, 7, 7]),
    food_side: /** @type {Region} */ ([32, 20, 7, 2]),
    food_small_top: /** @type {Region} */ ([40, 20, 4, 4]),
    food_small_side: /** @type {Region} */ ([46, 20, 4, 2]),
    garnish: /** @type {Region} */ ([52, 20, 2, 2]),
    failed_top: /** @type {Region} */ ([24, 30, 7, 7]),
    failed_side: /** @type {Region} */ ([32, 30, 7, 2]),
    failed_small_top: /** @type {Region} */ ([40, 30, 3, 3]),
    failed_small_side: /** @type {Region} */ ([46, 30, 3, 2]),
  },
  chair: {
    seat_top: /** @type {Region} */ ([0, 0, 12, 12]),
    seat_side: /** @type {Region} */ ([16, 0, 12, 2]),
    seat_bottom: /** @type {Region} */ ([0, 16, 12, 12]),
    leg_side: /** @type {Region} */ ([16, 4, 2, 6]),
    leg_end: /** @type {Region} */ ([20, 4, 2, 2]),
    back_side: /** @type {Region} */ ([32, 0, 12, 10]),
    back_top: /** @type {Region} */ ([32, 12, 12, 2]),
  },
  bell: {
    base_top: /** @type {Region} */ ([0, 0, 8, 8]),
    base_side: /** @type {Region} */ ([8, 0, 8, 2]),
    bell_side: /** @type {Region} */ ([0, 8, 6, 3]),
    bell_top: /** @type {Region} */ ([8, 8, 6, 6]),
    cap_side: /** @type {Region} */ ([16, 0, 4, 1]),
    cap_top: /** @type {Region} */ ([16, 4, 4, 4]),
    knob: /** @type {Region} */ ([24, 0, 2, 2]),
  },
  oven: {
    body_side: /** @type {Region} */ ([0, 0, 16, 8]),
    body_top: /** @type {Region} */ ([16, 0, 16, 16]),
    body_bottom: /** @type {Region} */ ([32, 0, 16, 16]),
    roof: /** @type {Region} */ ([48, 0, 16, 16]),
    brick: /** @type {Region} */ ([0, 16, 16, 16]),
    ember: /** @type {Region} */ ([16, 16, 8, 2]),
    flame: /** @type {Region} */ ([24, 16, 2, 3]),
    pizza_raw_top: /** @type {Region} */ ([0, 32, 7, 7]),
    pizza_raw_side: /** @type {Region} */ ([0, 40, 7, 1]),
    pizza_cooked_top: /** @type {Region} */ ([8, 32, 7, 7]),
    pizza_cooked_side: /** @type {Region} */ ([8, 40, 7, 1]),
    pizza_burnt_top: /** @type {Region} */ ([16, 32, 7, 7]),
    pizza_burnt_side: /** @type {Region} */ ([16, 40, 7, 1]),
  },
};

// ---- Grill: dark metal box, red knobs, silver grate over glowing coals

function drawGrill() {
  const L = layouts.grill;
  const c = canvas();
  c.fill(L.body_side, 'b');
  c.speckle(L.body_side, 'b', 'a', 0.15, 11);
  c.row(L.body_side, 0, 'c');
  c.row(L.body_side, 10, 'd');
  for (const y of [3, 5]) for (let x = 3; x <= 12; x++) c.px(L.body_side, x, y, 'd');
  for (const x0 of [3, 11]) {
    c.px(L.body_side, x0, 7, 'R'); c.px(L.body_side, x0 + 1, 7, 'r');
    c.px(L.body_side, x0, 8, 'r'); c.px(L.body_side, x0 + 1, 8, 'Q');
  }
  for (let y = 1; y < 10; y++) { c.px(L.body_side, 0, y, 'a'); c.px(L.body_side, 15, y, 'a'); }

  c.fill(L.body_top, 'b');
  c.border(L.body_top, 'c');
  c.fill(L.body_bottom, 'd');

  c.fill(L.grate_top, 'o');
  c.speckle(L.grate_top, 'o', 'f', 0.35, 12);
  c.speckle(L.grate_top, 'o', 'e', 0.3, 13);
  c.speckle(L.grate_top, 'f', 'E', 0.2, 14);
  for (let y = 0; y < 14; y++) for (const x of [2, 5, 8, 11]) c.px(L.grate_top, x, y, (y % 4 === 0) ? 'G' : 'g');
  c.border(L.grate_top, 'g');
  c.fill(L.grate_side, 'g');

  drawPatty(c, L.patty_raw_top, L.patty_raw_side, 'raw', 21);
  drawPatty(c, L.patty_cooked_top, L.patty_cooked_side, 'cooked', 22);
  drawPatty(c, L.patty_burnt_top, L.patty_burnt_side, 'burnt', 23);
  return c.rows();
}

/** @type {Sprite} */
export const grill = {
  name: 'grill',
  palette: {
    ...PATTY_PALETTE,
    a: '#2b2d31', b: '#3d4047', c: '#5c616b', d: '#1b1c1f',
    r: '#c0392b', R: '#ff6b5a', Q: '#7a1f16',
    g: '#9aa0a8', G: '#dfe4ea',
    o: '#2a1208', f: '#8a1f0a', e: '#ff7a1a', E: '#ffc04d',
  },
  rows: drawGrill(),
};

// ---- Cutting board: stone worktop, wooden board, a generic whole item and a generic cut pile

function drawBoard() {
  const L = layouts.cutting_board;
  const c = canvas();
  c.fill(L.body_side, 'S');
  c.speckle(L.body_side, 'S', 'U', 0.15, 31);
  c.speckle(L.body_side, 'S', 'T', 0.15, 32);
  c.row(L.body_side, 0, 'V');
  c.row(L.body_side, 1, 'T');
  c.row(L.body_side, 11, 'U');
  for (let y = 3; y <= 10; y++) { c.px(L.body_side, 1, y, 'U'); c.px(L.body_side, 14, y, 'U'); }
  for (let x = 1; x <= 14; x++) c.px(L.body_side, x, 3, 'U');
  for (let x = 6; x <= 9; x++) c.px(L.body_side, x, 5, 'D');

  c.fill(L.body_top, 'T');
  c.speckle(L.body_top, 'T', 'S', 0.25, 33);
  c.speckle(L.body_top, 'T', 'V', 0.15, 34);
  c.fill(L.body_bottom, 'U');

  c.fill(L.board_top, 'W');
  for (const y of [2, 5, 7]) for (let x = 1; x < 11; x++) if ((x + y) % 5 !== 0) c.px(L.board_top, x, y, 'X');
  c.speckle(L.board_top, 'W', 'Y', 0.12, 35);
  c.border(L.board_top, 'Z');
  c.fill(L.board_side, 'Z');

  c.fill(L.whole_top, 't');
  for (const [x, y] of [[1, 1], [2, 1], [1, 2], [2, 2]]) c.px(L.whole_top, x, y, 'l');
  c.px(L.whole_top, 0, 0, 'j'); c.px(L.whole_top, 3, 3, 'j');
  c.fill(L.whole_side, 't');
  c.px(L.whole_side, 1, 1, 'i');
  c.row(L.whole_side, 3, 'j');
  c.fill(L.stem, 'L');

  c.fill(L.cut_top, 't');
  c.px(L.cut_top, 1, 1, 'k'); c.px(L.cut_top, 2, 1, 'i');
  c.px(L.cut_top, 1, 2, 'i'); c.px(L.cut_top, 2, 2, 'k');
  c.fill(L.cut_side, 'j');
  return c.rows();
}

/** @type {Sprite} */
export const cutting_board = {
  name: 'cutting_board',
  palette: {
    S: '#8e9196', T: '#a9adb3', U: '#62656a', V: '#cdd1d6', D: '#3e4044',
    W: '#cf9a5c', X: '#a8743c', Y: '#e8bc82', Z: '#7d5426',
    t: '#e0742f', i: '#f6a45e', j: '#a8481a', k: '#f6d36b', l: '#3fa34d', L: '#2a7a35',
  },
  rows: drawBoard(),
};

// ---- Counter: wooden cabinet, white plate, burger layers

function drawCounter() {
  const L = layouts.counter;
  const c = canvas();
  c.fill(L.body_side, 'A');
  c.speckle(L.body_side, 'A', 'C', 0.12, 41);
  c.row(L.body_side, 0, 'D');
  c.row(L.body_side, 1, 'B');
  c.row(L.body_side, 11, 'C');
  for (let x = 1; x <= 14; x++) { c.px(L.body_side, x, 3, 'C'); c.px(L.body_side, x, 10, 'C'); }
  for (let y = 3; y <= 10; y++) { c.px(L.body_side, 1, y, 'C'); c.px(L.body_side, 14, y, 'C'); }
  c.px(L.body_side, 12, 6, 'H'); c.px(L.body_side, 12, 7, 'H');

  c.fill(L.body_top, 'B');
  for (const y of [3, 7, 11, 15]) c.row(L.body_top, y, 'A');
  c.speckle(L.body_top, 'B', 'D', 0.12, 42);
  c.fill(L.body_bottom, 'C');

  c.fill(L.plate_top, 'P');
  c.border(L.plate_top, 'Q');
  for (const [x, y] of [[0, 0], [9, 0], [0, 9], [9, 9]]) c.px(L.plate_top, x, y, 'O');
  for (let i = 2; i < 8; i++) { c.px(L.plate_top, i, 1, 'R'); c.px(L.plate_top, 1, i, 'R'); }
  c.fill(L.plate_side, 'Q');

  // ---- burger: bun bottom, patty, lettuce, tomato, cheese, top bun
  c.fill(L.bun_cut, 'I');
  c.border(L.bun_cut, 'M');
  c.fill(L.bun_side, 'F');
  c.row(L.bun_side, 1, 'N');

  c.fill(L.bun_top, 'F');
  c.speckle(L.bun_top, 'F', 'M', 0.3, 43);
  c.border(L.bun_top, 'N');
  for (const [x, y] of [[2, 2], [5, 2], [3, 4], [6, 5], [2, 6]]) c.px(L.bun_top, x, y, 'J');
  c.fill(L.dome_top, 'M');
  c.speckle(L.dome_top, 'M', 'F', 0.25, 44);
  for (const [x, y] of [[1, 1], [4, 2], [2, 4]]) c.px(L.dome_top, x, y, 'J');

  drawPatty(c, L.patty_top, L.patty_side, 'cooked', 52);

  c.fill(L.cheese_top, 'E');
  c.speckle(L.cheese_top, 'E', 'G', 0.2, 45);
  c.border(L.cheese_top, 'K');
  c.fill(L.cheese_side, 'K');

  c.fill(L.slices_top, 't');
  for (const [x, y] of [[1, 1], [2, 2], [1, 3], [2, 5], [1, 6], [5, 1], [6, 2], [5, 4], [6, 5], [5, 6]]) c.px(L.slices_top, x, y, 'i');
  for (const [x, y] of [[2, 1], [1, 5], [6, 1], [5, 5]]) c.px(L.slices_top, x, y, 'S');
  for (let y = 0; y < 8; y++) c.px(L.slices_top, 4, y, 'j');
  c.fill(L.slices_side, 't');

  c.fill(L.lettuce_top, 'l');
  c.speckle(L.lettuce_top, 'l', 'g', 0.25, 46);
  c.speckle(L.lettuce_top, 'l', 'L', 0.2, 47);
  for (let i = 0; i < 10; i++) {
    const ch = i % 2 === 0 ? '.' : 'L';
    c.px(L.lettuce_top, i, 0, ch); c.px(L.lettuce_top, i, 9, ch);
    c.px(L.lettuce_top, 0, i, ch); c.px(L.lettuce_top, 9, i, ch);
  }
  for (let i = 0; i < 10; i++) c.px(L.lettuce_side, i, 0, i % 2 === 0 ? 'g' : 'L');

  // ---- pizza: light dough with a golden crust, red sauce, yellow cheese, salami, pepper, olives
  c.fill(L.dough_top, '1');
  c.speckle(L.dough_top, '1', '2', 0.15, 71);
  c.border(L.dough_top, '3');
  for (const [x, y] of [[0, 0], [9, 0], [0, 9], [9, 9]]) c.px(L.dough_top, x, y, '.');
  c.fill(L.dough_side, '3');
  c.fill(L.sauce_top, '4');
  c.speckle(L.sauce_top, '4', '5', 0.25, 72);
  for (const [x, y] of [[0, 0], [8, 0], [0, 8], [8, 8]]) c.px(L.sauce_top, x, y, '.');
  c.fill(L.sauce_side, '5');
  c.fill(L.pizza_cheese_top, 'E');
  c.speckle(L.pizza_cheese_top, 'E', 'G', 0.35, 73);
  c.speckle(L.pizza_cheese_top, 'E', '6', 0.08, 74);
  for (const [x, y] of [[0, 0], [7, 0], [0, 7], [7, 7]]) c.px(L.pizza_cheese_top, x, y, '.');
  c.fill(L.pizza_cheese_side, 'K');
  c.fill(L.salami, '7');
  c.px(L.salami, 0, 0, '8');
  c.fill(L.salami_side, '9');
  c.fill(L.pepper, 'l');
  c.px(L.pepper, 1, 1, 'L');
  c.fill(L.pepper_side, 'L');
  c.fill(L.olive, '0');

  // ---- doner: pale pita, brown meat strips, white garlic sauce
  c.fill(L.pita_top, 'a');
  c.speckle(L.pita_top, 'a', 'b', 0.25, 75);
  c.border(L.pita_top, 'c');
  c.fill(L.pita_side, 'a');
  c.row(L.pita_side, 1, 'c');
  c.fill(L.meat_top, 'm');
  for (let y = 0; y < 5; y++) for (let x = 0; x < 9; x++) if ((x + 2 * y) % 3 === 0) c.px(L.meat_top, x, y, 'n');
  c.speckle(L.meat_top, 'm', 'h', 0.2, 76);
  c.fill(L.meat_side, 'h');
  c.row(L.meat_side, 1, 'n');
  c.fill(L.doner_sauce_top, 'W');
  c.speckle(L.doner_sauce_top, 'W', 'V', 0.25, 77);
  c.fill(L.doner_sauce_side, 'W');

  // ---- sushi: dark nori, white rice, pink salmon with fat stripes, maki rolls
  c.fill(L.nori_top, 'd');
  c.speckle(L.nori_top, 'd', 'e', 0.25, 78);
  c.fill(L.nori_side, 'd');
  c.fill(L.rice_top, 'W');
  c.speckle(L.rice_top, 'W', 'V', 0.3, 79);
  c.fill(L.rice_side, 'V');
  c.fill(L.salmon_top, 'o');
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 3 === 0) c.px(L.salmon_top, x, y, 'r');
  c.fill(L.salmon_side, 'Y');
  c.fill(L.maki_top, 'W');
  c.border(L.maki_top, 'd');
  c.px(L.maki_top, 1, 1, 'o');
  c.fill(L.maki_side, 'd');
  c.speckle(L.maki_side, 'd', 'e', 0.3, 80);
  return c.rows();
}

/** @type {Sprite} */
export const counter = {
  name: 'counter',
  palette: {
    ...PATTY_PALETTE,
    A: '#9c6b3c', B: '#b9824b', C: '#6e4622', D: '#d8a565', H: '#f0c840',
    P: '#f6f6f2', Q: '#d4d4cc', O: '#b4b4ac', R: '#ffffff',
    F: '#d28a36', M: '#edb85a', N: '#a8631f', I: '#f7e2b0', J: '#fff6dc',
    E: '#f7c531', G: '#ffe680', K: '#d49a14',
    t: '#e23a28', i: '#ff8a6a', j: '#a8231a', S: '#f6d36b',
    l: '#5cbf3a', L: '#2f7f22', g: '#9be86a',
    // pizza
    1: '#f2d9a0', 2: '#e8c47c', 3: '#c98a3a', 4: '#d42a1a', 5: '#a81c10', 6: '#f9a03a',
    7: '#b8242c', 8: '#e8606a', 9: '#7a1218', 0: '#2a2a2a',
    // doner
    a: '#f0dcae', b: '#e2c48a', c: '#c49a5a', W: '#fafaf4', V: '#dedcd2',
    // sushi
    d: '#1f3324', e: '#33503a', o: '#ff8c78', r: '#ffd2c6', Y: '#e8684f',
  },
  rows: drawCounter(),
};

// ---- Supply crates (16x16 plain cubes; each shows its content on the sides and the top)

/** @typedef {(string | null)[][]} Pixels */

/** @param {import('./util.js').Sprite} s @returns {Pixels} */
function pixelsOf(s) {
  return s.rows.map((row) => [...row].map((ch) => (ch === '.' ? null : s.palette[ch])));
}

/**
 * Halves a 16x16 picture to 8x8, preferring an opaque pixel of each 2x2 block.
 * @param {Pixels} p
 * @returns {Pixels}
 */
function half(p) {
  return Array.from({ length: 8 }, (_, y) => Array.from({ length: 8 }, (_, x) => (
    p[2 * y + 1][2 * x + 1] ?? p[2 * y][2 * x + 1] ?? p[2 * y + 1][2 * x] ?? p[2 * y][2 * x]
  )));
}

/** @param {Pixels} base @param {Pixels} pic @param {number} ox @param {number} oy */
function stamp(base, pic, ox, oy) {
  pic.forEach((row, y) => row.forEach((c, x) => { if (c) base[oy + y][ox + x] = c; }));
}

/** @returns {Pixels} */
function emptyPixels() {
  return Array.from({ length: 16 }, () => Array(16).fill(null));
}

/**
 * @param {string} name
 * @param {Pixels} px
 * @returns {import('./util.js').Sprite}
 */
function toSprite(name, px) {
  /** @type {Record<string, string>} */
  const palette = {};
  /** @type {Map<string, string>} */
  const chars = new Map();
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rows = px.map((row) => row.map((c) => {
    if (!c) return '.';
    let ch = chars.get(c);
    if (!ch) {
      ch = alphabet[chars.size];
      chars.set(c, ch);
      palette[ch] = c;
    }
    return ch;
  }).join(''));
  return { name, palette, rows };
}

const WOOD = { frame: '#6b4423', plank: '#a8763e', plankLight: '#c08a4c', plankDark: '#8d5f2f', nail: '#3e2810' };
const METAL = { frame: '#5a1010', plank: '#b32424', plankLight: '#d44a4a', plankDark: '#8e1a1a', nail: '#e8e8e8' };
const LABEL = { fill: '#f4ead2', edge: '#7a5a30' };

/**
 * A crate face: wooden (or metal) planks with a framed cream label holding the pictures.
 * @param {string} name
 * @param {typeof WOOD} mat
 * @param {{ pic: Pixels, x: number, y: number }[]} pics pictures in label coordinates (label is 12x12 at 2,2)
 * @param {boolean} top the top face has plank lines running the other way
 */
function crateFace(name, mat, pics, top) {
  const px = emptyPixels();
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const line = top ? x % 5 === 4 : y % 5 === 4;
      px[y][x] = line ? mat.plankDark : ((top ? y : x) % 7 === 0 ? mat.plankLight : mat.plank);
    }
  }
  for (let i = 0; i < 16; i++) {
    px[0][i] = mat.frame; px[15][i] = mat.frame; px[i][0] = mat.frame; px[i][15] = mat.frame;
  }
  for (const [x, y] of [[1, 1], [14, 1], [1, 14], [14, 14]]) px[y][x] = mat.nail;
  for (let y = 2; y < 14; y++) {
    for (let x = 2; x < 14; x++) {
      const edge = x === 2 || x === 13 || y === 2 || y === 13;
      px[y][x] = edge ? LABEL.edge : LABEL.fill;
    }
  }
  for (const { pic, x, y } of pics) stamp(px, pic, 3 + x, 3 + y);
  return toSprite(name, px);
}

/** @param {Pixels} p @returns {Pixels} */
function flip(p) {
  return p.map((row) => [...row].reverse());
}

/** @param {string} item @returns {Pixels} */
function icon(item) {
  return half(pixelsOf(/** @type {import('./util.js').Sprite} */ (/** @type {any} */ (items)[item])));
}

/** @typedef {{ pic: Pixels, x: number, y: number }} Pic */
/** @type {Record<string, { mat: typeof WOOD, pics: Pic[], topPics?: Pic[] }>} */
const CRATE_PICTURES = {
  crate_tools: { mat: METAL, pics: [{ pic: icon('spatula'), x: 2, y: 2 }, { pic: flip(icon('knife')), x: 0, y: 0 }] },
};

/** @type {Sprite} */ export const crate_tools = crateFace('crate_tools', CRATE_PICTURES.crate_tools.mat, CRATE_PICTURES.crate_tools.pics, false);
/** @type {Sprite} */ export const crate_tools_top = crateFace('crate_tools_top', CRATE_PICTURES.crate_tools.mat, CRATE_PICTURES.crate_tools.pics, true);

/**
 * Ender-chest style crate face: dark green-black body, lighter frame, purple glowing latch.
 * @param {string} name
 * @param {boolean} top the top shows a glowing eye instead of the front latch
 * @returns {import('./util.js').Sprite}
 */
function enderCrateFace(name, top) {
  const BODY = ['#0f1a17', '#14231f', '#0b1311'];
  const FRAME = '#2f5a4e';
  const FRAME_LIGHT = '#3f7767';
  const GLOW = '#c77dff';
  const CORE = '#f1d4ff';
  const px = emptyPixels();
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) px[y][x] = BODY[(x * 7 + y * 13 + (x ^ y)) % 5 === 0 ? 1 : (x + 2 * y) % 11 === 0 ? 2 : 0];
  }
  for (let i = 0; i < 16; i++) {
    px[0][i] = FRAME; px[15][i] = FRAME; px[i][0] = FRAME; px[i][15] = FRAME;
    px[1][i] = FRAME_LIGHT; px[i][1] = FRAME_LIGHT;
  }
  if (top) {
    // glowing eye in the middle
    for (const [x, y] of [[5, 7], [6, 6], [7, 6], [8, 6], [9, 6], [10, 7], [6, 9], [7, 9], [8, 9], [9, 9], [5, 8], [10, 8]]) px[y][x] = GLOW;
    for (const [x, y] of [[7, 7], [8, 7], [7, 8], [8, 8]]) px[y][x] = CORE;
  } else {
    // horizontal band with a purple glowing latch
    for (let x = 2; x < 14; x++) { px[6][x] = FRAME; px[9][x] = FRAME; }
    for (let y = 5; y < 11; y++) { for (let x = 6; x < 10; x++) px[y][x] = GLOW; }
    for (const [x, y] of [[7, 7], [8, 7], [7, 8], [8, 8]]) px[y][x] = CORE;
    for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) px[y][x] = FRAME_LIGHT;
  }
  return toSprite(name, px);
}

/** @type {Sprite} */ export const crate_all = enderCrateFace('crate_all', false);
/** @type {Sprite} */ export const crate_all_top = enderCrateFace('crate_all_top', true);

// ---- Table: light wooden four-leg table; plate with dish variants

function drawTable() {
  const L = layouts.table;
  const c = canvas();
  c.fill(L.top_top, 'A');
  for (const y of [3, 7, 11]) c.row(L.top_top, y, 'C');
  c.speckle(L.top_top, 'A', 'B', 0.15, 61);
  c.border(L.top_top, 'D');
  c.fill(L.top_bottom, 'C');
  c.row(L.top_side, 0, 'B');
  c.row(L.top_side, 1, 'D');
  c.fill(L.leg_side, 'A');
  for (let y = 0; y < 14; y++) c.px(L.leg_side, 1, y, 'C');
  c.fill(L.leg_end, 'C');

  for (const r of [L.plate_top, L.plate_empty_top]) {
    c.fill(r, 'P');
    c.border(r, 'Q');
    for (const [x, y] of [[0, 0], [9, 0], [0, 9], [9, 9]]) c.px(r, x, y, 'O');
    for (let i = 2; i < 8; i++) { c.px(r, i, 1, 'R'); c.px(r, 1, i, 'R'); }
  }
  c.fill(L.plate_side, 'Q');
  // the empty plate: crumbs and a ketchup smear
  for (const [x, y] of [[3, 3], [6, 4], [4, 6], [7, 7], [2, 7]]) c.px(L.plate_empty_top, x, y, 'F');
  for (const [x, y] of [[5, 5], [6, 5], [6, 6]]) c.px(L.plate_empty_top, x, y, 't');

  // plated meal (any served dish): brown heap with green, red and yellow bits, a green garnish leaf
  c.fill(L.food_top, 'm');
  c.speckle(L.food_top, 'm', 'h', 0.3, 63);
  c.speckle(L.food_top, 'm', 'l', 0.12, 64);
  c.speckle(L.food_top, 'm', 't', 0.1, 65);
  c.speckle(L.food_top, 'm', 'E', 0.08, 66);
  for (const [x, y] of [[0, 0], [6, 0], [0, 6], [6, 6]]) c.px(L.food_top, x, y, '.');
  c.fill(L.food_side, 'h');
  c.speckle(L.food_side, 'h', 'm', 0.3, 67);
  c.row(L.food_side, 1, 'n');
  c.fill(L.food_small_top, 'h');
  c.speckle(L.food_small_top, 'h', 'E', 0.2, 68);
  c.fill(L.food_small_side, 'h');
  c.row(L.food_small_side, 1, 'm');
  c.fill(L.garnish, 'l');
  c.px(L.garnish, 1, 1, 'L');

  // failed dish: grey-black burnt heap with ash
  c.fill(L.failed_top, 'b');
  c.speckle(L.failed_top, 'b', 'c', 0.35, 69);
  c.speckle(L.failed_top, 'b', 'e', 0.15, 70);
  for (const [x, y] of [[0, 0], [6, 0], [0, 6], [6, 6]]) c.px(L.failed_top, x, y, '.');
  c.fill(L.failed_side, 'b');
  c.speckle(L.failed_side, 'b', 'c', 0.3, 71);
  c.row(L.failed_side, 1, 'd');
  c.fill(L.failed_small_top, 'c');
  c.px(L.failed_small_top, 1, 1, 'e');
  c.fill(L.failed_small_side, 'c');
  c.row(L.failed_small_side, 1, 'd');
  return c.rows();
}

/** @type {Sprite} */
export const table = {
  name: 'table',
  palette: {
    A: '#c28a52', B: '#d9a46a', C: '#8a5a2e', D: '#6b4423',
    P: '#f6f6f2', Q: '#d4d4cc', O: '#b4b4ac', R: '#ffffff',
    F: '#d28a36',
    m: '#844622', h: '#b0703e', n: '#5e3016',
    l: '#5cbf3a', L: '#2f7f22',
    E: '#f7c531',
    t: '#d23a28',
    b: '#3a3836', c: '#1c1a19', d: '#0c0b0a', e: '#7a7672',
  },
  rows: drawTable(),
};

// ---- Chair: darker wood, backrest with a red heart

function drawChair() {
  const L = layouts.chair;
  const c = canvas();
  c.fill(L.seat_top, 'A');
  for (const y of [3, 7]) c.row(L.seat_top, y, 'C');
  c.speckle(L.seat_top, 'A', 'B', 0.15, 71);
  c.border(L.seat_top, 'D');
  c.fill(L.seat_bottom, 'C');
  c.row(L.seat_side, 0, 'B');
  c.row(L.seat_side, 1, 'D');
  c.fill(L.leg_side, 'A');
  for (let y = 0; y < 6; y++) c.px(L.leg_side, 1, y, 'C');
  c.fill(L.leg_end, 'C');
  c.fill(L.back_side, 'A');
  for (const x of [3, 8]) for (let y = 0; y < 10; y++) c.px(L.back_side, x, y, 'C');
  c.border(L.back_side, 'D');
  const heart = [[4, 3], [5, 3], [7, 3], [8, 3], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [4, 5], [5, 5], [6, 5], [7, 5], [5, 6], [6, 6]];
  for (const [x, y] of heart) c.px(L.back_side, x, y, 'H');
  c.px(L.back_side, 4, 3, 'W');
  c.row(L.back_top, 0, 'B');
  c.row(L.back_top, 1, 'D');
  return c.rows();
}

/** @type {Sprite} */
export const chair = {
  name: 'chair',
  palette: { A: '#9c6534', B: '#b97c45', C: '#734520', D: '#4f2e14', H: '#e0303a', W: '#ff8a8f' },
  rows: drawChair(),
};

// ---- Bell: brass counter bell on a dark wooden base

function drawBell() {
  const L = layouts.bell;
  const c = canvas();
  c.fill(L.base_top, 'w');
  c.border(L.base_top, 'v');
  c.row(L.base_side, 0, 'w');
  c.row(L.base_side, 1, 'v');
  c.row(L.bell_side, 0, 'G');
  c.row(L.bell_side, 1, 'g');
  c.row(L.bell_side, 2, 'd');
  c.px(L.bell_side, 1, 0, 'Y'); c.px(L.bell_side, 1, 1, 'G');
  c.fill(L.bell_top, 'g');
  c.border(L.bell_top, 'd');
  c.px(L.bell_top, 2, 2, 'Y'); c.px(L.bell_top, 3, 2, 'G'); c.px(L.bell_top, 2, 3, 'G');
  c.fill(L.cap_side, 'G');
  c.fill(L.cap_top, 'G');
  c.px(L.cap_top, 1, 1, 'Y');
  c.fill(L.knob, 's');
  c.px(L.knob, 0, 0, 'S');
  return c.rows();
}

/** @type {Sprite} */
export const bell = {
  name: 'bell',
  palette: {
    w: '#5a3a22', v: '#3a2412',
    g: '#e0b040', G: '#f2cc5c', Y: '#fff2a8', d: '#a07020',
    s: '#b8bcc4', S: '#eef0f4',
  },
  rows: drawBell(),
};

// ---- Fridge and pantry: tall cabinets sharing the TALL layout (geometry in tools/geometry.js)

/**
 * Fridge: white body, seam at 2/3 height (freezer above, fridge door below), dark handles, dark grey base.
 * @returns {string[]}
 */
function drawFridge() {
  const L = TALL;
  const c = canvas();
  c.fill(L.front, 'W');
  c.border(L.front, 'L');
  c.row(L.front, 7, 'S');
  c.row(L.front, 6, 'L');
  c.row(L.front, 8, 'L');
  for (let y = 2; y <= 5; y++) c.px(L.front, 11, y, 'H');
  for (let y = 11; y <= 17; y++) c.px(L.front, 11, y, 'H');
  c.px(L.front, 10, 2, 'M'); c.px(L.front, 10, 11, 'M');
  c.px(L.front, 3, 3, 'B'); c.px(L.front, 4, 3, 'B'); // small indicator light on the freezer
  for (let y = 21; y < 23; y++) c.row(L.front, y, 'D');
  c.fill(L.side, 'G');
  c.border(L.side, 'F');
  c.row(L.side, 7, 'F');
  for (let y = 21; y < 23; y++) c.row(L.side, y, 'D');
  c.fill(L.top, 'W');
  c.border(L.top, 'L');
  c.fill(L.bottom, 'D');
  return c.rows();
}

/** @type {Sprite} */
export const fridge = {
  name: 'fridge',
  palette: {
    W: '#f1f4f6', L: '#cfd5da', S: '#9aa3aa', G: '#d3d9de', F: '#aab2b9',
    H: '#3b4147', M: '#6c747b', B: '#5aa9e6', D: '#4a4f55',
  },
  rows: drawFridge(),
};

/**
 * Pantry: light oak kitchen cabinet, darker frame, a shelf line, two doors with round knobs.
 * @returns {string[]}
 */
function drawPantry() {
  const L = TALL;
  const c = canvas();
  c.fill(L.front, 'O');
  for (let y = 0; y < 21; y += 2) for (let x = 1; x < 13; x += 5) c.px(L.front, x + (y % 4 === 0 ? 0 : 2), y, 'P'); // wood grain
  c.border(L.front, 'K');
  c.row(L.front, 1, 'K');
  for (let y = 0; y < 23; y++) { c.px(L.front, 1, y, 'K'); c.px(L.front, 12, y, 'K'); }
  c.row(L.front, 7, 'K'); // shelf line between the upper and lower door panels
  c.row(L.front, 8, 'N');
  for (let y = 0; y < 21; y++) { c.px(L.front, 6, y, 'K'); c.px(L.front, 7, y, 'K'); } // gap between the two doors
  for (let y = 9; y < 20; y++) { c.px(L.front, 2, y, 'N'); c.px(L.front, 11, y, 'N'); }
  for (const [kx, ky] of [[4, 13], [8, 13], [4, 3], [8, 3]]) { // round knobs, 2x2 with a highlight
    c.px(L.front, kx, ky, 'Y'); c.px(L.front, kx + 1, ky, 'Q');
    c.px(L.front, kx, ky + 1, 'Q'); c.px(L.front, kx + 1, ky + 1, 'K');
  }
  for (let y = 21; y < 23; y++) c.row(L.front, y, 'K');
  c.fill(L.side, 'O');
  for (let y = 1; y < 21; y += 3) c.row(L.side, y, 'P');
  c.border(L.side, 'K');
  c.row(L.side, 7, 'K');
  for (let y = 21; y < 23; y++) c.row(L.side, y, 'K');
  c.fill(L.top, 'O');
  c.border(L.top, 'K');
  c.fill(L.bottom, 'K');
  return c.rows();
}

/** @type {Sprite} */
export const pantry = {
  name: 'pantry',
  palette: {
    O: '#d9b274', P: '#c9a063', K: '#8a5a2b', N: '#b98b4e', Y: '#f3dc9a', Q: '#a8742f',
  },
  rows: drawPantry(),
};

// ---- Dishwasher: white box, dark control strip with a status light, door line and handle

function drawDishwasher() {
  const L = layouts.dishwasher;
  const c = canvas();
  c.fill(L.front, 'W');
  for (let y = 0; y < 4; y++) c.row(L.front, y, 'D');
  c.row(L.front, 3, 'E');
  for (const x of [9, 11, 13]) c.px(L.front, x, 1, 'B'); // buttons
  for (let y = 0; y < 4; y++) for (let x = 1; x <= 4; x++) c.px(L.front, x, y, 'E'); // socket behind the light (north face: u = 8 - x)
  c.row(L.front, 4, 'L'); // door line
  for (let x = 3; x <= 12; x++) { c.px(L.front, x, 6, 'H'); c.px(L.front, x, 7, 'M'); } // handle
  for (let y = 4; y < 14; y++) { c.px(L.front, 0, y, 'L'); c.px(L.front, 15, y, 'L'); }
  for (let y = 14; y < 16; y++) c.row(L.front, y, 'K'); // kick plate
  c.fill(L.side, 'G');
  c.border(L.side, 'F');
  for (let y = 14; y < 16; y++) c.row(L.side, y, 'K');
  c.fill(L.top, 'W');
  c.border(L.top, 'L');
  c.fill(L.bottom, 'K');
  c.fill(L.light_off, 'o');
  c.px(L.light_off, 0, 0, 'p');
  c.fill(L.light_blue, 'b');
  c.px(L.light_blue, 0, 0, 'c');
  c.fill(L.light_green, 'g');
  c.px(L.light_green, 0, 0, 'h');
  return c.rows();
}

/** @type {Sprite} */
export const dishwasher = {
  name: 'dishwasher',
  palette: {
    W: '#f1f4f6', L: '#cfd5da', G: '#d3d9de', F: '#aab2b9', K: '#4a4f55',
    D: '#2f3439', E: '#1f2327', B: '#9aa3aa', H: '#3b4147', M: '#9aa3aa',
    o: '#3a3f44', p: '#555b61', b: '#3fa9ff', c: '#bfe6ff', g: '#46d35a', h: '#c8ffc8',
  },
  rows: drawDishwasher(),
};

// ---- Dish cabinet: open wooden cabinet with a middle shelf; the plate stack grows with the count

function drawDishCabinet() {
  const L = layouts.dish_cabinet;
  const c = canvas();
  c.fill(L.panel, 'O');
  for (let x = 0; x < 16; x += 4) for (let y = 0; y < 16; y++) c.px(L.panel, x, y, 'P');
  c.border(L.panel, 'K');
  c.fill(L.panel_top, 'O');
  for (let y = 0; y < 16; y += 4) c.row(L.panel_top, y, 'P');
  c.border(L.panel_top, 'K');
  c.fill(L.inside, 'I');
  for (let x = 1; x < 16; x += 5) for (let y = 0; y < 16; y++) c.px(L.inside, x, y, 'J');
  c.fill(L.board_edge, 'K');
  c.fill(L.board_top, 'N');
  for (let y = 2; y < 16; y += 5) c.row(L.board_top, y, 'P');
  c.fill(L.plate_top, 'w');
  c.border(L.plate_top, 'r');
  for (const [x, y] of [[0, 0], [7, 0], [0, 7], [7, 7]]) c.px(L.plate_top, x, y, '.');
  for (let i = 2; i < 6; i++) c.px(L.plate_top, i, 1, 'v'); // light-blue inner ring hint
  c.fill(L.plate_side, 'r');
  c.px(L.plate_side, 0, 0, 's'); c.px(L.plate_side, 7, 0, 's');
  return c.rows();
}

/** @type {Sprite} */
export const dish_cabinet = {
  name: 'dish_cabinet',
  palette: {
    O: '#a8763e', P: '#8d5f2f', K: '#6b4423', I: '#6e4524', J: '#5e3a1d', N: '#c08a4c',
    w: '#ffffff', r: '#9fd3f2', v: '#d6f0ff', s: '#5f8fb0',
  },
  rows: drawDishCabinet(),
};

// ---- Pizza oven: stone plinth, brick chamber with an arched opening, embers at the back, a round pizza

/** Round 7x7 disc: X where the pizza is, '.' at the cut-off corners. */
const DISC = ['..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..'];
/** @param {number} x @param {number} y */
const inDisc = (x, y) => y >= 0 && y < 7 && x >= 0 && x < 7 && DISC[y][x] === 'X';

/**
 * @param {ReturnType<typeof canvas>} c
 * @param {Region} top 7x7
 * @param {Region} side 7x1
 * @param {string} crust edge colour
 * @param {string} fill inner colour
 * @param {[number, number, string][]} dots toppings
 */
function drawPizza(c, top, side, crust, fill, dots) {
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      if (!inDisc(x, y)) continue;
      const edge = !inDisc(x - 1, y) || !inDisc(x + 1, y) || !inDisc(x, y - 1) || !inDisc(x, y + 1);
      c.px(top, x, y, edge ? crust : fill);
    }
  }
  for (const [x, y, ch] of dots) c.px(top, x, y, ch);
  c.row(side, 0, crust);
}

function drawOven() {
  const L = layouts.oven;
  const c = canvas();
  // plinth: light stone blocks
  c.fill(L.body_side, 's');
  c.speckle(L.body_side, 's', 'S', 0.25, 31);
  c.row(L.body_side, 0, 'k');
  c.row(L.body_side, 4, 'k');
  c.row(L.body_side, 7, 'k');
  for (const x of [0, 8]) for (let y = 1; y < 4; y++) c.px(L.body_side, x, y, 'k');
  for (const x of [4, 12]) for (let y = 5; y < 7; y++) c.px(L.body_side, x, y, 'k');
  // top: stone rim around the dark, ashy hearth inside the chamber
  c.fill(L.body_top, 's');
  c.speckle(L.body_top, 's', 'S', 0.25, 32);
  for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) c.px(L.body_top, x, y, 'h');
  c.speckle(L.body_top, 'h', 'H', 0.3, 33);
  c.fill(L.body_bottom, 'k');
  // chamber walls: warm bricks with light mortar
  c.fill(L.brick, 'b');
  c.speckle(L.brick, 'b', 'B', 0.2, 34);
  for (let y = 0; y < 16; y++) {
    if (y % 3 === 2) {
      c.row(L.brick, y, 'm');
      continue;
    }
    const shift = Math.floor(y / 3) % 2 === 0 ? 0 : 2;
    for (let x = shift; x < 16; x += 4) c.px(L.brick, x, y, 'm');
  }
  // roof: darker bricks
  c.fill(L.roof, 'r');
  c.speckle(L.roof, 'r', 'B', 0.3, 35);
  for (let y = 0; y < 16; y += 4) c.row(L.roof, y, 'm');
  // fire
  c.fill(L.ember, 'o');
  for (const [x, y] of [[1, 0], [4, 0], [6, 1], [2, 1]]) c.px(L.ember, x, y, 'e');
  c.px(L.ember, 5, 0, 'E');
  c.fill(L.flame, 'e');
  c.px(L.flame, 0, 0, 'E');
  c.px(L.flame, 1, 0, 'Y');
  c.px(L.flame, 1, 1, 'E');
  // pizzas: raw (pale dough, red sauce), baked (golden, red and yellow), burnt (black)
  drawPizza(c, L.pizza_raw_top, L.pizza_raw_side, 'D', 'R', [[2, 2, 'w'], [4, 3, 'w'], [3, 5, 'w'], [5, 4, 'w']]);
  drawPizza(c, L.pizza_cooked_top, L.pizza_cooked_side, 'g', 'R', [[2, 2, 'y'], [3, 3, 'y'], [4, 2, 'y'], [2, 4, 'y'], [4, 4, 'y'], [3, 5, 'y'], [5, 3, 'y']]);
  drawPizza(c, L.pizza_burnt_top, L.pizza_burnt_side, 'x', 'X', [[2, 3, 'a'], [4, 2, 'a'], [4, 4, 'a']]);
  return c.rows();
}

/** @type {Sprite} */
export const oven = {
  name: 'oven',
  palette: {
    s: '#9a9a9a', S: '#858585', k: '#5e5e5e', h: '#3a2a22', H: '#241812',
    b: '#b5654a', B: '#8f4a35', m: '#d8c8b0', r: '#9c5640',
    o: '#8a1f0a', e: '#ff7a1a', E: '#ffc04d', Y: '#fff2a0',
    D: '#e6cc94', R: '#d33a2a', w: '#fff4d0',
    g: '#d9a24a', y: '#ffd23f',
    x: '#1a1614', X: '#2e2723', a: '#4a403b',
  },
  rows: drawOven(),
};
