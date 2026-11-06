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

export const layouts = {
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
    tomato_top: /** @type {Region} */ ([0, 32, 4, 4]),
    tomato_side: /** @type {Region} */ ([8, 32, 4, 4]),
    stem: /** @type {Region} */ ([16, 32, 1, 1]),
    slice_top: /** @type {Region} */ ([0, 40, 4, 4]),
    slice_side: /** @type {Region} */ ([8, 40, 4, 1]),
  },
  counter: {
    body_side: /** @type {Region} */ ([0, 0, 16, 12]),
    body_top: /** @type {Region} */ ([16, 0, 16, 16]),
    body_bottom: /** @type {Region} */ ([32, 0, 16, 16]),
    plate_top: /** @type {Region} */ ([0, 16, 10, 10]),
    plate_side: /** @type {Region} */ ([16, 16, 10, 1]),
    bun_cut: /** @type {Region} */ ([32, 16, 8, 8]),
    bun_side: /** @type {Region} */ ([48, 16, 8, 2]),
    bun_top: /** @type {Region} */ ([0, 28, 8, 8]),
    dome_top: /** @type {Region} */ ([16, 28, 6, 6]),
    patty_raw_top: /** @type {Region} */ ([0, 40, 10, 10]),
    patty_raw_side: /** @type {Region} */ ([0, 50, 10, 2]),
    patty_cooked_top: /** @type {Region} */ ([16, 40, 10, 10]),
    patty_cooked_side: /** @type {Region} */ ([16, 50, 10, 2]),
    patty_burnt_top: /** @type {Region} */ ([32, 40, 10, 10]),
    patty_burnt_side: /** @type {Region} */ ([32, 50, 10, 2]),
    cheese_top: /** @type {Region} */ ([48, 40, 10, 10]),
    cheese_side: /** @type {Region} */ ([48, 50, 10, 1]),
    slices_top: /** @type {Region} */ ([0, 54, 8, 8]),
    slices_side: /** @type {Region} */ ([8, 54, 8, 1]),
    lettuce_top: /** @type {Region} */ ([16, 54, 10, 10]),
    lettuce_side: /** @type {Region} */ ([28, 54, 10, 1]),
    tomato_top: /** @type {Region} */ ([40, 54, 3, 3]),
    tomato_side: /** @type {Region} */ ([44, 54, 3, 3]),
    stem: /** @type {Region} */ ([48, 54, 1, 1]),
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

// ---- Cutting board: stone worktop, wooden board, tomato

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

  c.fill(L.tomato_top, 't');
  for (const [x, y] of [[1, 1], [2, 1], [1, 2], [2, 2]]) c.px(L.tomato_top, x, y, 'l');
  c.px(L.tomato_top, 0, 0, 'j'); c.px(L.tomato_top, 3, 3, 'j');
  c.fill(L.tomato_side, 't');
  c.px(L.tomato_side, 1, 1, 'i');
  c.row(L.tomato_side, 3, 'j');
  c.fill(L.stem, 'L');

  c.fill(L.slice_top, 't');
  c.px(L.slice_top, 1, 1, 'k'); c.px(L.slice_top, 2, 1, 'i');
  c.px(L.slice_top, 1, 2, 'i'); c.px(L.slice_top, 2, 2, 'k');
  c.fill(L.slice_side, 'j');
  return c.rows();
}

/** @type {Sprite} */
export const cutting_board = {
  name: 'cutting_board',
  palette: {
    S: '#8e9196', T: '#a9adb3', U: '#62656a', V: '#cdd1d6', D: '#3e4044',
    W: '#cf9a5c', X: '#a8743c', Y: '#e8bc82', Z: '#7d5426',
    t: '#e23a28', i: '#ff8a6a', j: '#a8231a', k: '#f6d36b', l: '#3fa34d', L: '#2a7a35',
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

  drawPatty(c, L.patty_raw_top, L.patty_raw_side, 'raw', 51);
  drawPatty(c, L.patty_cooked_top, L.patty_cooked_side, 'cooked', 52);
  drawPatty(c, L.patty_burnt_top, L.patty_burnt_side, 'burnt', 53);

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

  c.fill(L.tomato_top, 't');
  c.px(L.tomato_top, 1, 1, 'l');
  c.fill(L.tomato_side, 't');
  c.px(L.tomato_side, 0, 0, 'i');
  c.row(L.tomato_side, 2, 'j');
  c.fill(L.stem, 'L');
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
  },
  rows: drawCounter(),
};
