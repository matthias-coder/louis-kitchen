import * as items from './items.js';

/**
 * Guest skin (128x64): a villager-style guest with a big head, long nose and a
 * unibrow, brown robe, plus one thought-bubble picture per wish. The geometry
 * (tools/geometry.js `guestModel`) maps cube faces onto the regions in `guestLayout`;
 * each face uses its whole region (bubble pictures are scaled onto the quad).
 */

/** Sprite folder under packs/RP/textures. */
export const folder = 'entity';

/** @typedef {import('./util.js').Sprite} Sprite */
/** @typedef {[number, number, number, number]} Region u, v, width, height */

export const GUEST_TEXTURE = { width: 160, height: 64 };

/** @type {Record<string, Region>} */
export const guestLayout = {
  head_front: [0, 0, 10, 10],
  head_back: [10, 0, 10, 10],
  head_side: [20, 0, 10, 10],
  head_top: [30, 0, 10, 10],
  head_bottom: [40, 0, 10, 10],
  nose_front: [50, 0, 2, 4],
  nose_side: [52, 0, 2, 4],
  nose_top: [54, 0, 2, 2],
  body_front: [0, 12, 8, 11],
  body_back: [8, 12, 8, 11],
  body_side: [16, 12, 6, 11],
  body_top: [22, 12, 8, 6],
  arm_front: [30, 12, 2, 9],
  arm_side: [32, 12, 3, 9],
  arm_top: [35, 12, 2, 3],
  arm_hand: [37, 12, 2, 3],
  leg_front: [0, 24, 4, 8],
  leg_side: [4, 24, 4, 8],
  leg_top: [8, 24, 4, 4],
  leg_sole: [12, 24, 4, 4],
  bubble_hamburger: [64, 0, 20, 20],
  bubble_cheeseburger: [84, 0, 20, 20],
  bubble_pizza_margherita: [64, 20, 20, 20],
  bubble_salami_pizza: [84, 20, 20, 20],
  bubble_ramen: [64, 40, 20, 20],
  bubble_potato_soup: [84, 40, 20, 20],
  bubble_doner: [104, 4, 20, 20],
  bubble_sushi: [104, 24, 20, 20],
  bubble_fried_noodles: [104, 44, 20, 20],
  bubble_fries: [128, 0, 20, 20],
  run_symbol: [128, 20, 12, 12],
  bubble_edge: [104, 0, 1, 1],
  dot: [106, 0, 2, 2],
};

const C = {
  skin: '#bd8b72', skinDark: '#a0705a', nose: '#a86c55', noseDark: '#8a5442',
  eye: '#ffffff', pupil: '#2e8b57', brow: '#3b2417', mouth: '#7a4434',
  robe: '#6b4a2e', robeLight: '#80593a', robeDark: '#4e3420', belt: '#3a2616',
  leg: '#4a3220', shoe: '#2a1a10',
  bubble: '#ffffff', outline: '#4a4a52',
};

/** @typedef {(string | null)[][]} Pixels */

/** @param {number} w @param {number} h @returns {Pixels} */
const blank = (w, h) => Array.from({ length: h }, () => Array(w).fill(null));

/** @param {Pixels} px */
function painter(px) {
  const p = {
    /** @param {Region} r @param {number} x @param {number} y @param {string | null} color */
    px(r, x, y, color) {
      if (x >= 0 && y >= 0 && x < r[2] && y < r[3]) px[r[1] + y][r[0] + x] = color;
    },
    /** @param {Region} r @param {string} color */
    fill(r, color) {
      for (let y = 0; y < r[3]; y++) for (let x = 0; x < r[2]; x++) p.px(r, x, y, color);
    },
    /** @param {Region} r @param {number} y @param {string} color */
    row(r, y, color) {
      for (let x = 0; x < r[2]; x++) p.px(r, x, y, color);
    },
  };
  return p;
}

/** @param {Sprite} s @returns {Pixels} */
function pixelsOf(s) {
  return s.rows.map((row) => [...row].map((ch) => (ch === '.' ? null : s.palette[ch])));
}

/**
 * @param {string} name
 * @param {Pixels} px
 * @returns {Sprite}
 */
function toSprite(name, px) {
  /** @type {Record<string, string>} */
  const palette = {};
  /** @type {Map<string, string>} */
  const chars = new Map();
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&*+-/:;<=>?@^_~';
  const rows = px.map((row) => row.map((c) => {
    if (!c) return '.';
    let ch = chars.get(c);
    if (!ch) {
      if (chars.size >= alphabet.length) throw new Error(`${name}: too many colors`);
      ch = alphabet[chars.size];
      chars.set(c, ch);
      palette[ch] = c;
    }
    return ch;
  }).join(''));
  return { name, palette, rows };
}

/**
 * White rounded thought bubble with the dish sprite in the middle.
 * @param {ReturnType<typeof painter>} p
 * @param {Region} r 20x20
 * @param {Sprite} dish 16x16 item sprite
 */
function drawBubble(p, r, dish) {
  p.fill(r, C.bubble);
  const n = r[2];
  for (let i = 0; i < n; i++) {
    p.px(r, i, 0, C.outline); p.px(r, i, n - 1, C.outline);
    p.px(r, 0, i, C.outline); p.px(r, n - 1, i, C.outline);
  }
  // round the corners
  for (const [x, y] of [[0, 0], [1, 0], [0, 1]]) {
    for (const [fx, fy] of [[x, y], [n - 1 - x, y], [x, n - 1 - y], [n - 1 - x, n - 1 - y]]) p.px(r, fx, fy, null);
  }
  for (const [x, y] of [[1, 1], [n - 2, 1], [1, n - 2], [n - 2, n - 2]]) p.px(r, x, y, C.outline);
  pixelsOf(dish).forEach((row, y) => row.forEach((c, x) => { if (c) p.px(r, 2 + x, 2 + y, c); }));
}

/**
 * White sign with a running stick figure: the guest takes the dish away.
 * @param {ReturnType<typeof painter>} p
 * @param {Region} r 12x12
 */
function drawRunSymbol(p, r) {
  p.fill(r, C.bubble);
  const n = r[2];
  for (let i = 0; i < n; i++) {
    p.px(r, i, 0, C.outline); p.px(r, i, n - 1, C.outline);
    p.px(r, 0, i, C.outline); p.px(r, n - 1, i, C.outline);
  }
  const dots = [
    [6, 2], [7, 2], [6, 3], [7, 3], // head
    [5, 4], [6, 4], [7, 5], [8, 5], [4, 5], // arms and shoulders
    [5, 5], [5, 6], [6, 6], // torso
    [4, 7], [7, 7], [3, 8], [8, 8], [2, 9], [8, 9], // legs
  ];
  for (const [x, y] of dots) p.px(r, x, y, C.outline);
}

function drawGuest() {
  const L = guestLayout;
  const px = blank(GUEST_TEXTURE.width, GUEST_TEXTURE.height);
  const p = painter(px);

  // head: big, bald, with the villager unibrow
  p.fill(L.head_front, C.skin);
  for (let x = 2; x <= 7; x++) p.px(L.head_front, x, 3, C.brow);
  p.px(L.head_front, 2, 4, C.eye); p.px(L.head_front, 3, 4, C.pupil);
  p.px(L.head_front, 6, 4, C.pupil); p.px(L.head_front, 7, 4, C.eye);
  p.px(L.head_front, 4, 8, C.mouth); p.px(L.head_front, 5, 8, C.mouth);
  p.row(L.head_front, 9, C.skinDark);
  p.fill(L.head_back, C.skin);
  p.row(L.head_back, 9, C.skinDark);
  p.row(L.head_back, 8, C.skinDark);
  p.fill(L.head_side, C.skin);
  p.px(L.head_side, 5, 4, C.skinDark); p.px(L.head_side, 5, 5, C.skinDark);
  p.row(L.head_side, 9, C.skinDark);
  p.fill(L.head_top, C.skin);
  for (const [x, y] of [[3, 3], [6, 4], [4, 6]]) p.px(L.head_top, x, y, C.skinDark);
  p.fill(L.head_bottom, C.skinDark);

  // long nose
  p.fill(L.nose_front, C.nose);
  p.row(L.nose_front, 3, C.noseDark);
  p.fill(L.nose_side, C.nose);
  p.row(L.nose_side, 3, C.noseDark);
  p.fill(L.nose_top, C.nose);

  // brown robe with a belt
  p.fill(L.body_front, C.robe);
  p.row(L.body_front, 0, C.robeDark);
  for (let y = 1; y < 11; y++) p.px(L.body_front, 3, y, C.robeLight);
  p.row(L.body_front, 6, C.belt);
  p.row(L.body_front, 10, C.robeDark);
  p.fill(L.body_back, C.robe);
  p.row(L.body_back, 6, C.belt);
  p.row(L.body_back, 10, C.robeDark);
  p.fill(L.body_side, C.robe);
  p.row(L.body_side, 6, C.belt);
  p.row(L.body_side, 10, C.robeDark);
  p.fill(L.body_top, C.robeDark);

  // arms: robe sleeves with hands
  for (const r of [L.arm_front, L.arm_side]) {
    p.fill(r, C.robe);
    p.row(r, 0, C.robeLight);
    p.row(r, 7, C.skin);
    p.row(r, 8, C.skin);
  }
  p.fill(L.arm_top, C.robeLight);
  p.fill(L.arm_hand, C.skin);

  // legs and shoes
  for (const r of [L.leg_front, L.leg_side]) {
    p.fill(r, C.leg);
    p.row(r, 6, C.shoe);
    p.row(r, 7, C.shoe);
  }
  p.fill(L.leg_top, C.leg);
  p.fill(L.leg_sole, C.shoe);

  // thought bubbles
  drawBubble(p, L.bubble_hamburger, items.hamburger);
  drawBubble(p, L.bubble_cheeseburger, items.cheeseburger);
  drawBubble(p, L.bubble_pizza_margherita, items.pizza_margherita);
  drawBubble(p, L.bubble_salami_pizza, items.salami_pizza);
  drawBubble(p, L.bubble_ramen, items.ramen);
  drawBubble(p, L.bubble_potato_soup, items.potato_soup);
  // placeholders until the real stage 2 bubbles
  drawBubble(p, L.bubble_doner, items.doner);
  drawBubble(p, L.bubble_sushi, items.sushi);
  drawBubble(p, L.bubble_fried_noodles, items.fried_noodles);
  drawBubble(p, L.bubble_fries, items.fries);
  drawRunSymbol(p, L.run_symbol);
  p.fill(L.bubble_edge, C.outline);
  p.fill(L.dot, C.bubble);
  return px;
}

/** @type {Sprite} */
export const guest = toSprite('guest', drawGuest());
