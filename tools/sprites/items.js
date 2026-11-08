import { recolor, canvas } from './util.js';

/** Sprite folder under packs/RP/textures. */
export const folder = 'items';

/** @typedef {import('./util.js').Sprite} Sprite */

/** @type {Sprite} */
export const bun = {
  name: 'bun',
  palette: {
    k: '#4a2a0e', d: '#a8631f', m: '#d28a36', l: '#edb85a', s: '#fff3cf', e: '#8a4d18',
  },
  rows: [
    '................',
    '................',
    '.....kkkkkk.....',
    '...kkmlllllkk...',
    '..kmllsllllsmk..',
    '.kmllllllslllmk.',
    '.kmlsllllllllmk.',
    'kmllllllsllsllmk',
    'kmlllsllllllmmdk',
    'kmmllllllsllmddk',
    'kmmmmllllmmmdddk',
    'kdmmmmmmmmmdddek',
    '.kddmmmmmmdddek.',
    '..kkeddddddekk..',
    '....kkkkkkkk....',
    '................',
  ],
};

/** @type {Sprite} */
export const cooked_patty = {
  name: 'cooked_patty',
  palette: {
    k: '#2b1608', h: '#a8683a', m: '#7a4120', d: '#5a2d14', g: '#34190b',
  },
  rows: [
    '................',
    '................',
    '................',
    '................',
    '....kkkkkkkk....',
    '..kkhhhhhhmmkk..',
    '.khhghhmgmmmgmk.',
    'khhghhmgmmmgmmdk',
    'khghhmgmmmgmmddk',
    'kghmmgmmmgmmdddk',
    '.kmmgmmmgmdddk..',
    '.kkddddddddddkk.',
    '..kkkddddddkkk..',
    '....kkkkkkkk....',
    '................',
    '................',
  ],
};

export const raw_patty = recolor(cooked_patty, 'raw_patty', {
  k: '#7a2a3a', h: '#f4a6ae', m: '#e27d8c', d: '#c45a6c', g: '#e27d8c',
});

export const burnt_patty = recolor(cooked_patty, 'burnt_patty', {
  k: '#050505', h: '#38322f', m: '#211d1b', d: '#141110', g: '#0a0808',
});

/** @type {Sprite} */
export const lettuce = {
  name: 'lettuce',
  palette: {
    k: '#1c5218', d: '#3c8a2a', m: '#5fb83c', l: '#98dc5a', v: '#d6f7a0',
  },
  rows: [
    '................',
    '...kk...kkk.....',
    '..kmlkk.kllkk...',
    '.kmllmlkkmllmk..',
    '.kmlvvllmllvlkk.',
    'kkmlvmlllvlvmlmk',
    'kmllvlmlvlllvlmk',
    'kdmlmvllvmllvmlk',
    'kdmmllvmvlmmlmdk',
    '.kdmmlvlvllmmdk.',
    '.kkdmmllvlmmdkk.',
    '..kdddmmvmmddk..',
    '...kkkddmddkk...',
    '.....kkkkkk.....',
    '................',
    '................',
  ],
};

/** @type {Sprite} */
export const tomato = {
  name: 'tomato',
  palette: {
    k: '#5c0f10', r: '#dc2f20', h: '#ff8068', d: '#a81c16', g: '#3a9a2e', G: '#1f6a1c',
  },
  rows: [
    '................',
    '.......kk.......',
    '.....kkGgkk.....',
    '...kkgggGgggk...',
    '..kkrrgGgGgrrk..',
    '.krrrrrgggrrrrk.',
    '.krhhrrrrrrrrrk.',
    'krhhhrrrrrrrrrdk',
    'krhhrrrrrrrrrddk',
    'krrrrrrrrrrrrddk',
    'krrrrrrrrrrrdddk',
    '.krrrrrrrrrdddk.',
    '.kdrrrrrrrdddk..',
    '..kkddddddddkk..',
    '....kkkkkkkk....',
    '................',
  ],
};

/** @type {Sprite} */
export const tomato_slices = {
  name: 'tomato_slices',
  palette: {
    k: '#5c0f10', r: '#d92b1e', p: '#ff7a66', y: '#ffd890', d: '#a81c16',
  },
  rows: [
    '................',
    '....kkkkkk......',
    '..kkrrrrrrkk....',
    '.krrpprpprrrk...',
    '.krpyprpypprk...',
    'krrprpyprpprrk..',
    'krpypprrpyprrkkk',
    'krrprpyrprrrkrrk',
    'krrpyprprrkkpprk',
    '.krrprrrrkrppypk',
    '.kkrrrrkkrppyprk',
    '...kkkkkkrpyprrk',
    '.........krrrrk.',
    '..........kkkk..',
    '................',
    '................',
  ],
};

/** @type {Sprite} */
export const cheese = {
  name: 'cheese',
  palette: {
    k: '#7a4a08', h: '#ffeb7a', y: '#ffc929', o: '#e09a12', d: '#b87208', w: '#fff6b8',
  },
  rows: [
    '................',
    '................',
    '..........kkkk..',
    '.......kkkhhhyk.',
    '....kkkhhhhhyykk',
    '..kkhhhhhhhyyokk',
    'kkhhhhhhhyyyyyok',
    'kkkkkkkkkkkkkkok',
    'kyyyyyyyyyyyyydk',
    'kyyodyyyyyoyyydk',
    'kyyyyyyoyyyyyydk',
    'kyoyyyyyyyyodyyk',
    'kyyyyydyyyyyyydk',
    'kkddddddddddddkk',
    '.kkkkkkkkkkkkkk.',
    '................',
  ],
};

/** @type {Sprite} */
export const knife = {
  name: 'knife',
  palette: {
    k: '#2a2f38', s: '#e8edf2', m: '#aab4c0', d: '#76808e', b: '#6b3d17', B: '#8f5826', r: '#d8dde3',
  },
  rows: [
    '................',
    '............kkk.',
    '...........ksskk',
    '..........ksssmk',
    '.........ksssmmk',
    '........ksssmmk.',
    '.......ksssmmdk.',
    '......ksssmmdk..',
    '.....ksssmmdk...',
    '....kssmmddk....',
    '...kkrkmddk.....',
    '..kBBkkkkk......',
    '.kBBbkk.........',
    'kBBbbk..........',
    'kbbkk...........',
    '.kk.............',
  ],
};

/** @type {Sprite} */
export const multitool = {
  name: 'multitool',
  palette: {
    k: '#2a2f38', s: '#e8edf2', m: '#aab4c0', d: '#76808e', h: '#40464f', b: '#6b3d17', B: '#a0622a',
  },
  rows: [
    '................',
    '.kk......kkkkkk.',
    '.ksk....ksssssmk',
    '.kssk...kshsshmk',
    '..kssk..kshsshdk',
    '..kssmk.kssssddk',
    '...ksmdk.kddddk.',
    '...kmmdk..kmmk..',
    '....kdkk..kmk...',
    '.....kkkkkkk....',
    '.......kBk......',
    '......kBBbk.....',
    '......kBBbk.....',
    '......kBBbk.....',
    '......kBbbk.....',
    '.......kkk......',
  ],
};

/** @type {Sprite} */
export const spatula = {
  name: 'spatula',
  palette: {
    k: '#2a2f38', s: '#e8edf2', m: '#aab4c0', d: '#76808e', h: '#40464f', b: '#6b3d17', B: '#a0622a',
  },
  rows: [
    '................',
    '...kkkkkkkkk....',
    '..ksssssssssmk..',
    '..kshsshsshsmk..',
    '..kshsshsshsmk..',
    '..kshsshsshsmk..',
    '..ksssssssssdk..',
    '..kmmmmmmmmddk..',
    '...kddddddddk...',
    '.....kmmmmk.....',
    '....kmmdk.......',
    '...kBBBk........',
    '..kBBbBk........',
    '.kBBbBk.........',
    '.kBbbk..........',
    '..kkk...........',
  ],
};

/** @type {Sprite} */
export const hamburger = {
  name: 'hamburger',
  palette: {
    k: '#3a1f0a', d: '#a8631f', m: '#d28a36', l: '#edb85a', s: '#fff3cf', e: '#8a4d18',
    g: '#4fb02e', G: '#2f7a1e', t: '#d92b1e', T: '#a81c16', p: '#5e3016', P: '#3a1c0c', c: '#e8c27a',
  },
  rows: [
    '................',
    '.....kkkkkk.....',
    '...kkmlllllkk...',
    '..kmllsllllsmk..',
    '.kmlllllslllllk.',
    '.kmlsllllllllmk.',
    'kmlllllsllllmddk',
    'kddmmmmmmmmmddek',
    'kgGgGgGgGgGgGgGk',
    'kkttttttttttTTkk',
    'kkppppppppppPPkk',
    'kkPPPPPPPPPPPPkk',
    '.kcccccccccccck.',
    '.kdeeeeeeeeedek.',
    '..kkkkkkkkkkkk..',
    '................',
  ],
};

/** @type {Sprite} */
export const cheeseburger = {
  name: 'cheeseburger',
  palette: { ...hamburger.palette, y: '#ffc929', o: '#e09a12', q: '#7a4a08' },
  rows: [
    '................',
    '.....kkkkkk.....',
    '...kkmlllllkk...',
    '..kmllsllllsmk..',
    '.kmlllllslllllk.',
    '.kmlsllllllllmk.',
    'kmlllllsllllmddk',
    'kddmmmmmmmmmddek',
    'kgGgGgGgGgGgGgGk',
    'kkttttttttttTTkk',
    'qyyyyyyyyyyyyyyq',
    'kqyoyyyyyyyyoyqk',
    'kkppppPPPPPPPPkk',
    '.kcccccccccccck.',
    '.kdeeeeeeeeedek.',
    '..kkkkkkkkkkkk..',
  ],
};

/** @type {Sprite} */
export const failed_dish = {
  name: 'failed_dish',
  palette: {
    k: '#3a3a3a', w: '#f2f2f2', a: '#c8c8c8', b: '#8e8e8e', g: '#7f8f5a', G: '#5d6b3e', D: '#3e4a28', h: '#a3b27a',
  },
  rows: [
    '................',
    '................',
    '.......kk.......',
    '.....kkGGkk.....',
    '....kGggGhgk....',
    '...kGghgGgDgk...',
    '..kkGggGgggGkk..',
    '.kwkkGgDgGGkkwk.',
    'kwwwakkkkkkawwwk',
    'kwwwwwwwwwwwwwak',
    'kawwwwwwwwwwwabk',
    '.kabwwwwwwwwabk.',
    '..kkbbaaaabbkk..',
    '....kkkkkkkk....',
    '................',
    '................',
  ],
};

/**
 * Clean plate seen from above: white with a light-blue rim. The "s" pixels are where
 * the dirty plate has its brown smears; on the clean plate they are plain white.
 * @type {Sprite}
 */
export const clean_plate = {
  name: 'clean_plate',
  palette: {
    o: '#5f8fb0', r: '#9fd3f2', h: '#d6f0ff', w: '#f4f6f7', c: '#ffffff', s: '#ffffff',
  },
  rows: [
    '......oooo......',
    '....oorrrroo....',
    '..oorhhhhrrroo..',
    '..orhwwwwwwrro..',
    '.orhwwccccwwrro.',
    '.ohwwcccsccwwro.',
    'orhwcsscccccwrro',
    'orhwccsscccswrro',
    'orhwccccccccwrro',
    'orrwcccccsscwrro',
    '.orwwcccccswwro.',
    '.orrwwccccwwrro.',
    '..orrwwwwwwrro..',
    '..oorrrrrrrroo..',
    '....oorrrroo....',
    '......oooo......',
  ],
};

export const dirty_plate = recolor(clean_plate, 'dirty_plate', { s: '#8a5a2b', c: '#f1ece2' });

/** Restaurant-Baukasten: a small restaurant with a chef's hat on the roof. */
/** @type {Sprite} */
export const restaurant_kit = {
  name: 'restaurant_kit',
  palette: {
    k: '#2a2320', w: '#ffffff', g: '#c9ccd1', r: '#d8402f', d: '#9c2a1e', y: '#f3e3b5', b: '#7a4a24', c: '#7cc4ec',
  },
  rows: [
    '.....kkkkkk.....',
    '....kwwwwwwk....',
    '...kwwwgwwwwk...',
    '...kwwwwwwgwk...',
    '....kwwwwwwk....',
    '.....kggggk.....',
    '....kkrrrrkk....',
    '...krrrrrrrrk...',
    '..krrddrrddrrk..',
    '.krrrrrrrrrrrrk.',
    'kkkkkkkkkkkkkkkk',
    '.kyyyyyyyyyyyyk.',
    '.kyccyybbyyccyk.',
    '.kyccyybbyyccyk.',
    '.kyyyyybbyyyyyk.',
    '.kkkkkkkkkkkkkk.',
  ],
};

/**
 * Themed Baukasten: the restaurant_kit picture with a 5x5 theme badge in the top right corner.
 * @param {string} name
 * @param {Record<string, string>} palette extra colours (upper-case keys, so they never clash with the kit's)
 * @param {string[]} inner the badge's 3x3 inside, outlined in 'k'
 * @returns {Sprite}
 */
function kitWithBadge(name, palette, inner) {
  const rows = restaurant_kit.rows.map((r) => [...r]);
  for (let y = 0; y < 5; y++) {
    for (let x = 11; x < 16; x++) rows[y][x] = y === 0 || y === 4 || x === 11 || x === 15 ? 'k' : inner[y - 1][x - 12];
  }
  return { name, palette: { ...restaurant_kit.palette, ...palette }, rows: rows.map((r) => r.join('')) };
}

export const kit_burger = kitWithBadge('kit_burger', { O: '#e8a33a', B: '#6b3a1e' }, ['OOO', 'BBB', 'OOO']);
export const kit_italian = kitWithBadge('kit_italian', { G: '#2e9e47' }, ['Gwr', 'Gwr', 'Gwr']);
export const kit_japanese = kitWithBadge('kit_japanese', {}, ['www', 'wrw', 'www']);
export const kit_doner = kitWithBadge('kit_doner', { Y: '#f6d548', B: '#8a4a22' }, ['YBY', 'BBB', 'YBY']);
export const kit_classic = kitWithBadge('kit_classic', {}, ['ccc', 'cwc', 'ccc']);
export const kit_mega = kitWithBadge('kit_mega', { Y: '#f2c230' }, ['YYY', 'kkk', 'YYY']);

// ---- Stage 2 sprites: drawn with the canvas helper, outlined in 'k' ----

/**
 * @param {string} name
 * @param {Record<string, string>} palette
 * @param {(c: ReturnType<typeof canvas>) => void} draw
 * @returns {Sprite}
 */
function paint(name, palette, draw) {
  const c = canvas();
  draw(c);
  c.outline('k');
  return { name, palette: { k: '#2a1a12', ...palette }, rows: c.rows() };
}

// -- fridge ingredients --

export const salami = paint('salami', { d: '#7a1a17', r: '#b32a22', f: '#f2b9aa' }, (c) => {
  c.ellipse(8, 8, 6.5, 6.5, 'd').ellipse(8, 8, 5.5, 5.5, 'r');
  for (const [x, y] of [[5, 5], [9, 5], [7, 8], [11, 8], [5, 10], [9, 11], [12, 6]]) c.dot(x, y, 'f');
});

export const egg = paint('egg', { w: '#f6eed8', s: '#d6c59c', h: '#ffffff' }, (c) => {
  c.ellipse(8, 9.5, 4.8, 5.3, 's').ellipse(8, 6.5, 3.6, 4.2, 's');
  c.ellipse(7.4, 9, 3.8, 4.4, 'w').ellipse(7.4, 6.6, 2.8, 3.4, 'w');
  c.dot(6, 6, 'h').dot(6, 7, 'h').dot(7, 5, 'h');
});

export const salmon = paint('salmon', { o: '#f0713e', p: '#f8b48a', l: '#ffd2b0', e: '#1c1c1c', f: '#d4562a' }, (c) => {
  c.ellipse(7, 8, 6.2, 3.8, 'o');
  for (let x = 12; x <= 14; x++) c.rect(x, 8 - (x - 10), 1, 2 * (x - 10), 'f');
  for (let y = 9; y < 16; y++) for (let x = 0; x < 16; x++) if (c.rows()[y][x] === 'o') c.set(x, y, 'p');
  c.line(5, 6, 10, 6, 'l').line(4, 7, 9, 7, 'l');
  c.rect(7, 3, 3, 1, 'f').set(3, 7, 'e');
});

export const cream = paint('cream', { w: '#f5f7fb', s: '#c3cad8', b: '#3f78c7', B: '#2c5a9e' }, (c) => {
  c.rect(4, 7, 8, 7, 'w').rect(5, 5, 6, 2, 'w').rect(6, 3, 4, 2, 's');
  c.rect(11, 5, 1, 9, 's').rect(4, 9, 8, 3, 'b').rect(11, 9, 1, 3, 'B');
  c.set(7, 10, 'w').set(8, 10, 'w').set(8, 11, 'w').set(7, 11, 'w');
});

export const onion = paint('onion', { y: '#e6b04a', d: '#a8741f', m: '#c8902f', g: '#5aa832' }, (c) => {
  c.ellipse(8, 9.5, 5.8, 5, 'd').ellipse(7.4, 9, 4.8, 4.2, 'y').rect(7, 3, 2, 3, 'y');
  c.set(8, 2, 'g').set(8, 3, 'g').set(7, 4, 'd').set(9, 4, 'd');
  for (let y = 7; y <= 12; y++) c.dot(5, y, 'm').dot(9, y, 'm');
});

export const carrot = paint('carrot', { o: '#f08a25', d: '#c2641a', l: '#ffb25c', g: '#4fa83a', G: '#2f7a22' }, (c) => {
  for (let i = 0; i < 10; i++) {
    const r = 0.7 + i * 0.32;
    c.ellipse(2.5 + i, 13.5 - i, r, r, 'o');
  }
  c.dot(7, 8, 'd').dot(9, 6, 'd').dot(5, 11, 'd').dot(6, 10, 'l').dot(8, 8, 'l');
  c.line(11, 5, 13, 2, 'g').line(12, 5, 14, 4, 'G').line(11, 4, 10, 1, 'G').line(12, 4, 12, 1, 'g');
});

export const potato = paint('potato', { b: '#a87a3f', t: '#caa062', d: '#6e4a22' }, (c) => {
  c.ellipse(8, 9, 6.3, 4.8, 'b').ellipse(7.5, 8.5, 5.2, 3.8, 't');
  c.dot(5, 8, 'd').dot(9, 10, 'd').dot(10, 7, 'd').dot(7, 11, 'd').dot(6, 6, 'd');
});

export const spring_onion = paint('spring_onion', { w: '#f2f2e6', l: '#b9de8c', g: '#4fae3a', G: '#2f7d2a', r: '#cfc9a8' }, (c) => {
  c.rect(7, 9, 2, 5, 'w').rect(7, 7, 2, 2, 'l').rect(6, 14, 1, 1, 'r').rect(8, 14, 2, 1, 'r');
  c.line(7, 7, 4, 1, 'g').line(8, 7, 5, 1, 'G').line(8, 7, 9, 0, 'g').line(8, 6, 11, 1, 'G').line(9, 7, 12, 2, 'g');
});

export const doner_meat_raw = paint('doner_meat_raw', { p: '#d2616b', d: '#a8414c', f: '#f3cbcb' }, (c) => {
  c.ellipse(8, 8.5, 6.5, 5, 'd').ellipse(7.6, 8, 5.7, 4.2, 'p');
  c.line(4, 8, 8, 5, 'f').line(7, 10, 11, 7, 'f').dot(10, 10, 'f').dot(5, 10, 'f');
});

// -- pantry ingredients --

export const dough = paint('dough', { s: '#d4b574', d: '#efdba8', h: '#fff4d0' }, (c) => {
  c.ellipse(8, 9.5, 6.5, 4.8, 's').ellipse(7.6, 9, 5.5, 3.8, 'd').dot(5, 7, 'h').dot(6, 7, 'h').dot(5, 8, 'h');
});

/** @param {boolean} label */
const jar = (label) => (/** @type {ReturnType<typeof canvas>} */ c) => {
  c.rect(4, 4, 8, 10, 'g').rect(5, 6, 6, 7, 'f').rect(10, 6, 1, 7, 'F').rect(4, 2, 8, 2, 'm');
  c.dot(5, 5, 'h').dot(5, 4, 'h');
  if (label) c.rect(5, 8, 5, 3, 'w').set(7, 9, 'F');
};
export const tomato_sauce = paint('tomato_sauce', { g: '#cfe3ea', f: '#d33a2a', F: '#9e2418', m: '#8a909a', h: '#ffffff', w: '#f3e6c8' }, jar(false));
export const broth = paint('broth', { g: '#cfe3ea', f: '#d9993a', F: '#a8691f', m: '#8a909a', h: '#ffffff', w: '#f3e6c8' }, jar(true));

export const noodles = paint('noodles', { y: '#f2d25a', d: '#c99a2a' }, (c) => {
  for (const [y, phase] of [[4, 0], [7, 2], [10, 4]]) {
    for (let x = 2; x <= 13; x++) {
      const yy = y + Math.round(Math.sin(x * 0.9 + phase) * 1.3);
      c.set(x, yy, 'y').set(x, yy + 1, 'd');
    }
  }
  c.line(3, 12, 12, 12, 'd').line(4, 3, 11, 3, 'y');
});

export const rice = paint('rice', { w: '#fbfaf2', s: '#cfd0c4', g: '#aeb0a4' }, (c) => {
  c.ellipse(8, 11, 6.5, 3.5, 's').ellipse(8, 8.5, 4.7, 3.8, 's').ellipse(8, 6, 2.7, 2.2, 's');
  c.ellipse(7.5, 10.6, 5.7, 2.9, 'w').ellipse(7.5, 8.2, 3.9, 3.1, 'w').ellipse(7.6, 5.8, 2, 1.6, 'w');
  for (const [x, y] of [[6, 6], [8, 8], [5, 10], [10, 11], [7, 12], [9, 9], [4, 12]]) c.dot(x, y, 'g');
});

export const nori = paint('nori', { g: '#1f3d2a', h: '#335f42', d: '#142a1d' }, (c) => {
  c.rect(2, 2, 12, 12, 'g');
  c.set(2, 2, '.').set(13, 2, '.').set(2, 13, '.').set(13, 13, '.');
  for (let y = 3; y <= 12; y += 2) for (let x = 3 + (y % 4 ? 1 : 0); x <= 12; x += 3) c.dot(x, y, 'h');
  c.line(3, 12, 12, 12, 'd');
});

/** Pita body: half-moon with the pocket opening at row 6. @param {ReturnType<typeof canvas>} c */
const pitaBody = (c) => {
  c.ellipse(8, 6.5, 7, 7.6, 'd').ellipse(8, 6.5, 6, 6.6, 'l').clearRows(0, 6);
  c.line(3, 6, 12, 6, 'i');
  for (const [x, y] of [[5, 9], [9, 8], [7, 11], [11, 10], [4, 7]]) c.dot(x, y, 'b');
};
const PITA = { d: '#c89a58', l: '#efd29a', i: '#a8743a', b: '#c08a48' };
export const pita = paint('pita', PITA, pitaBody);

/** @param {ReturnType<typeof canvas>} c */
const bottle = (c) => {
  c.rect(5, 6, 6, 8, 'b').rect(7, 3, 2, 3, 'b').rect(6, 1, 4, 2, 'c').rect(5, 9, 6, 3, 'l').dot(6, 7, 'h').dot(6, 8, 'h');
};
export const doner_sauce = paint('doner_sauce', { b: '#f2ecda', c: '#e0452e', l: '#f0a03a', h: '#ffffff' }, bottle);
export const soy_sauce = paint('soy_sauce', { b: '#34201a', c: '#d32f2a', l: '#f3e9d2', h: '#6b4a3c' }, bottle);

// -- prepared items --

export const onion_rings = paint('onion_rings', { w: '#f5e9c4', s: '#d9bf7c' }, (c) => {
  c.ring(10, 10, 4.6, 2.4, 's').ring(10, 9.6, 4.4, 2.6, 'w');
  c.ring(6, 6, 4.6, 2.4, 's').ring(6, 5.7, 4.4, 2.6, 'w');
});

export const carrot_slices = paint('carrot_slices', { o: '#f08a25', l: '#ffc070', d: '#c2641a' }, (c) => {
  for (const [x, y] of [[5, 5], [11, 6], [7, 11.5]]) c.ellipse(x, y, 3.2, 3.2, 'o').ellipse(x, y, 1.9, 1.9, 'l').ellipse(x, y, 0.9, 0.9, 'd');
});

export const potato_cubes = paint('potato_cubes', { y: '#f0d682', d: '#c9a850', l: '#fff0b0' }, (c) => {
  for (const [x, y] of [[2, 3], [9, 4], [5, 9]]) {
    c.rect(x, y, 5, 5, 'y').rect(x, y + 4, 5, 1, 'd').rect(x + 4, y, 1, 5, 'd').set(x, y, 'l').set(x + 1, y, 'l').set(x, y + 1, 'l');
  }
});

export const potato_sticks = paint('potato_sticks', { y: '#f0d682', d: '#c9a850', l: '#fff0b0' }, (c) => {
  for (const [x, y, h] of [[3, 3, 10], [6, 2, 11], [9, 4, 9], [12, 3, 10]]) {
    c.rect(x, y, 2, h, 'y').rect(x + 1, y, 1, h, 'd').set(x, y, 'l').set(x, y + 1, 'l');
  }
});

export const salmon_strips = paint('salmon_strips', { o: '#f0713e', w: '#fde0cc', d: '#d4562a' }, (c) => {
  for (const [x, y, w] of [[2, 3, 12], [3, 7, 11], [2, 11, 12]]) {
    c.rect(x, y, w, 3, 'o').rect(x, y + 2, w, 1, 'd');
    for (let i = x + 1; i < x + w; i += 3) c.dot(i, y + 1, 'w');
  }
});

export const doner_meat = paint('doner_meat', { b: '#9a5a2e', l: '#c88a50', d: '#5e3216' }, (c) => {
  c.ellipse(8, 5, 6.3, 2.4, 'b').ellipse(7, 9, 6.3, 2.4, 'b').ellipse(9, 12.7, 5.6, 2.1, 'b');
  c.line(4, 4, 10, 4, 'l').line(3, 8, 9, 8, 'l').line(6, 12, 11, 12, 'l');
  for (const [x, y] of [[11, 5], [10, 9], [5, 6], [6, 13], [12, 12]]) c.dot(x, y, 'd');
});

/** Bowl body, drawn first; contents are added above its rim afterwards. @param {ReturnType<typeof canvas>} c */
const bowlBody = (c) => {
  c.ellipse(8, 5.5, 6.7, 8.2, 'b').clearRows(0, 6);
  c.rect(1, 6, 14, 1, 'r').rect(5, 14, 6, 1, 's').dot(3, 8, 'h').dot(3, 9, 'h');
  for (let x = 4; x <= 11; x++) c.dot(x, 13, 's');
};
const BOWL = { b: '#4a78c2', r: '#a8c4ee', s: '#2f5290', h: '#d6e4fa', e: '#e8f0fc' };
export const bowl = paint('bowl', BOWL, (c) => {
  bowlBody(c);
  c.ellipse(8, 6, 6, 1.6, 'e').rect(2, 6, 12, 1, 'r');
});

const SOUP = { b: '#eef2f6', r: '#ffffff', s: '#b4bfcc', h: '#ffffff', e: '#f6e7b0' };
export const soup_bowl = paint('soup_bowl', SOUP, (c) => {
  bowlBody(c);
  c.ellipse(8, 6, 6, 1.6, 'e').rect(2, 6, 12, 1, 'r');
});

export const dirty_bowl = paint('dirty_bowl', { ...SOUP, e: '#7a5a34', m: '#8a5a2b' }, (c) => {
  bowlBody(c);
  c.ellipse(8, 6, 6, 1.6, 'e').rect(2, 6, 12, 1, 'r');
  for (const [x, y] of [[5, 9], [6, 10], [10, 8], [9, 11], [7, 12], [11, 10]]) c.dot(x, y, 'm');
  c.dot(4, 6, 'm').dot(11, 6, 'm');
});

export const pizza_box = paint('pizza_box', { b: '#c89a5a', d: '#8f6a35', l: '#e2bd84', r: '#d6452b', y: '#f0c040' }, (c) => {
  c.rect(1, 4, 14, 9, 'b').rect(1, 12, 14, 1, 'd').rect(1, 4, 14, 1, 'l').rect(1, 4, 1, 9, 'd').rect(14, 4, 1, 9, 'd');
  c.ellipse(8, 8.5, 3.6, 3.2, 'y').ellipse(8, 8.5, 2.6, 2.2, 'r');
  for (const [x, y] of [[7, 8], [9, 9], [8, 10]]) c.dot(x, y, 'y');
});

export const cooked_rice = paint('cooked_rice', { ...BOWL, w: '#fbfaf2', g: '#aeb0a4' }, (c) => {
  bowlBody(c);
  c.ellipse(8, 6, 5.8, 4.6, 'w');
  c.rect(1, 6, 14, 1, 'r');
  for (const [x, y] of [[5, 4], [8, 3], [10, 5], [7, 5], [11, 3]]) c.dot(x, y, 'g');
});

/** @param {boolean} salami @param {boolean} cooked */
const pizzaDraw = (salami, cooked) => (/** @type {ReturnType<typeof canvas>} */ c) => {
  c.ellipse(8, 8, 7, 7, 'd').ellipse(8, 8, 5.7, 5.7, cooked ? 'c' : 'r');
  if (cooked) {
    for (const [x, y] of [[5, 6], [9, 4], [10, 10], [6, 11], [8, 8], [11, 7]]) c.dot(x, y, 'u');
    if (!salami) for (const [x, y] of [[6, 4], [10, 8], [7, 10]]) c.rect(x, y, 2, 2, 'g');
  } else {
    for (const [x, y] of [[6, 5], [9, 6], [11, 8], [8, 9], [5, 9], [7, 12], [10, 11], [6, 7], [9, 4]]) c.rect(x, y, 2, 1, 'c');
  }
  if (salami) for (const [x, y] of [[6, 5], [10, 6], [7, 9], [11, 10], [5, 11], [9, 12]]) c.rect(x, y, 2, 2, 's').dot(x, y, 'f');
};
const PIZZA_RAW = { d: '#e6c88a', r: '#cf3a2b', c: '#f5eab0', s: '#8e2320', f: '#d86a60' };
const PIZZA_COOKED = { d: '#d79a45', c: '#f4d56e', u: '#c98a30', g: '#3f9a2e', s: '#8e2320', f: '#d86a60' };
export const raw_pizza_margherita = paint('raw_pizza_margherita', PIZZA_RAW, pizzaDraw(false, false));
export const raw_salami_pizza = paint('raw_salami_pizza', PIZZA_RAW, pizzaDraw(true, false));
export const burnt_pizza = recolor(paint('x', PIZZA_COOKED, pizzaDraw(false, true)), 'burnt_pizza', {
  d: '#2b1a10', c: '#4a3524', u: '#18100a', g: '#1f2a18', k: '#120a06',
});

const FRIES_DRAW = (/** @type {ReturnType<typeof canvas>} */ c) => {
  // paper bag with sticks poking out
  for (const [x, y, h] of [[4, 2, 6], [6, 1, 7], [8, 3, 5], [10, 2, 6], [7, 4, 4]]) c.rect(x, y, 2, h, 'y').set(x, y, 'l');
  c.rect(3, 8, 10, 6, 'r').rect(3, 8, 10, 1, 'R').rect(6, 10, 4, 2, 'w');
};
const FRIES_PALETTE = { y: '#f2c94c', l: '#fff0a8', r: '#c73a2b', R: '#e0584a', w: '#f8f4e8' };
export const fries = paint('fries', FRIES_PALETTE, FRIES_DRAW);
export const burnt_fries = recolor(paint('x', FRIES_PALETTE, FRIES_DRAW), 'burnt_fries', { y: '#4a3320', l: '#6a4a30' });

// -- tools --

export const pizza_peel = paint('pizza_peel', { w: '#d3a362', d: '#a8763a', g: '#8a5a28', B: '#b98446' }, (c) => {
  c.ellipse(10, 6, 5.6, 5.6, 'd').ellipse(9.6, 5.6, 4.8, 4.8, 'w');
  c.line(6, 10, 1, 15, 'B').line(7, 10, 2, 15, 'g').line(6, 9, 1, 14, 'B');
  c.dot(8, 4, 'B').dot(10, 7, 'B').dot(11, 4, 'B').dot(7, 7, 'B');
});

export const wok_spatula = paint('wok_spatula', { m: '#c3cad2', s: '#8c95a0', h: '#f1f4f7', b: '#7a4a1f', B: '#a8672b' }, (c) => {
  c.rect(8, 1, 6, 5, 's').rect(8, 1, 5, 4, 'm').rect(9, 2, 3, 1, 'h').set(8, 1, '.').set(13, 5, '.').set(8, 5, '.');
  c.line(8, 7, 6, 9, 's').line(6, 9, 2, 14, 'B').line(7, 9, 3, 14, 'b').line(6, 10, 2, 15, 'b');
});

export const recipe_book = paint('recipe_book', { k: '#3b1a14', r: '#b8372c', R: '#d9574a', p: '#f4ecd6', w: '#f8f4e8', g: '#caa24a' }, (c) => {
  c.rect(2, 1, 12, 14, 'k').rect(3, 2, 10, 12, 'r').rect(3, 2, 1, 12, 'k').rect(13, 3, 1, 11, 'p').rect(4, 2, 9, 1, 'R');
  // plate on the cover
  c.ellipse(8, 8, 3.6, 3.6, 'g').ellipse(8, 8, 2.6, 2.6, 'w');
});

// -- dishes --

export const pizza_margherita = paint('pizza_margherita', PIZZA_COOKED, pizzaDraw(false, true));
export const salami_pizza = paint('salami_pizza', PIZZA_COOKED, pizzaDraw(true, true));

export const ramen = paint('ramen', { b: '#c4372a', r: '#f1b0a0', s: '#8a1f16', h: '#ffd9ce', n: '#f2d25a', d: '#c99a2a', w: '#f8f4e8', e: '#f0a020', g: '#1f3d2a', G: '#4fae3a' }, (c) => {
  bowlBody(c);
  c.rect(1, 9, 14, 1, 'w');
  c.ellipse(8, 6, 5.8, 3.4, 'n').rect(1, 6, 14, 1, 'r');
  c.line(4, 3, 11, 3, 'd').line(5, 4, 12, 5, 'd');
  c.ellipse(5, 4, 2, 1.8, 'w').set(5, 4, 'e').set(4, 4, 'e');
  c.rect(10, 0, 3, 5, 'g').dot(11, 2, 'h');
  c.dot(8, 2, 'G').dot(7, 3, 'G').dot(9, 4, 'G');
});

export const potato_soup = paint('potato_soup', { b: '#a8713a', r: '#e0b878', s: '#7a4a22', h: '#f2d8aa', c: '#f3dfa0', o: '#f08a25', y: '#e6c45a', g: '#4fae3a' }, (c) => {
  bowlBody(c);
  c.ellipse(8, 5.5, 6.3, 2.6, 'c').rect(1, 6, 14, 1, 'r');
  c.rect(5, 3, 2, 2, 'o').rect(9, 4, 2, 2, 'y').rect(11, 3, 2, 1, 'o').rect(7, 5, 1, 1, 'o');
  c.dot(4, 5, 'g').dot(8, 3, 'g').dot(12, 5, 'g');
});

export const doner = paint('doner', { ...PITA, m: '#9a5a2e', g: '#4fae3a', t: '#d92b1e', w: '#fbf6e8' }, (c) => {
  pitaBody(c);
  c.ellipse(5.5, 4.5, 3.2, 2.6, 'g').ellipse(10.5, 4.8, 3.2, 2.4, 'm');
  c.rect(7, 3, 2, 2, 't').rect(4, 5, 1, 1, 'w').rect(9, 2, 3, 1, 'w').line(6, 6, 11, 6, 'i').dot(12, 4, 't');
});

export const sushi = paint('sushi', { g: '#1f3d2a', w: '#fbfaf2', o: '#f0713e', c: '#6ac24a' }, (c) => {
  for (const [x, y, f] of [[5, 5, 'o'], [11, 5, 'c'], [8, 11, 'o']]) {
    c.ellipse(x, y, 3.3, 3.3, 'g').ellipse(x, y, 2.4, 2.4, 'w').ellipse(x, y, 1, 1, f);
  }
});

export const fried_noodles = paint('fried_noodles', { p: '#3a3a46', q: '#565664', n: '#e8b84a', d: '#a8741f', g: '#4fae3a', o: '#f08a25' }, (c) => {
  c.ellipse(8, 11, 7.2, 3.8, 'p').ellipse(8, 10.5, 5.8, 2.7, 'q');
  c.ellipse(8, 7.5, 5.2, 4, 'n');
  c.line(4, 6, 11, 6, 'd').line(5, 8, 12, 9, 'd').line(6, 5, 10, 4, 'd');
  c.dot(7, 7, 'g').dot(10, 7, 'g').dot(6, 9, 'o').dot(9, 5, 'o').dot(11, 8, 'g');
});
