import { recolor } from './util.js';

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
