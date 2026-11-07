/**
 * @typedef {{ name: string, palette: Record<string, string>, rows: string[] }} Sprite
 */

/** @param {string} hex #rrggbb or #rrggbbaa @returns {[number, number, number, number]} */
function parseColor(hex) {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!m) throw new Error(`bad color ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, m[2] ? parseInt(m[2], 16) : 255];
}

/**
 * @param {Sprite} sprite
 * @returns {{ width: number, height: number, rgba: Uint8Array }}
 */
export function spriteToRgba(sprite) {
  const height = sprite.rows.length;
  const width = sprite.rows[0].length;
  const rgba = new Uint8Array(width * height * 4);
  sprite.rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`${sprite.name}: row ${y} has length ${row.length}, expected ${width}`);
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const hex = sprite.palette[ch];
      if (!hex) throw new Error(`${sprite.name}: unknown palette char "${ch}" at row ${y}`);
      rgba.set(parseColor(hex), (y * width + x) * 4);
    });
  });
  return { width, height, rgba };
}

/**
 * Copy of a sprite with some palette entries replaced.
 * @param {Sprite} sprite
 * @param {string} name
 * @param {Record<string, string>} paletteOverrides
 * @returns {Sprite}
 */
export function recolor(sprite, name, paletteOverrides) {
  return { name, palette: { ...sprite.palette, ...paletteOverrides }, rows: [...sprite.rows] };
}

/**
 * Tiny 16x16 drawing board for sprites that are easier to describe with shapes than with hand-typed rows.
 * Coordinates are pixel units; ellipse centers may be fractional (8 is the exact middle of the sprite).
 */
export function canvas() {
  const g = Array.from({ length: 16 }, () => Array(16).fill('.'));
  const inside = (/** @type {number} */ x, /** @type {number} */ y) => x >= 0 && x < 16 && y >= 0 && y < 16;
  const c = {
    set(/** @type {number} */ x, /** @type {number} */ y, /** @type {string} */ ch) { if (inside(x, y)) g[y][x] = ch; return c; },
    /** Sets a pixel only where something is already drawn (speckles, highlights). */
    dot(/** @type {number} */ x, /** @type {number} */ y, /** @type {string} */ ch) { if (inside(x, y) && g[y][x] !== '.') g[y][x] = ch; return c; },
    rect(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ w, /** @type {number} */ h, /** @type {string} */ ch) {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) c.set(i, j, ch);
      return c;
    },
    ellipse(/** @type {number} */ cx, /** @type {number} */ cy, /** @type {number} */ rx, /** @type {number} */ ry, /** @type {string} */ ch) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) g[y][x] = ch;
      }
      return c;
    },
    ring(/** @type {number} */ cx, /** @type {number} */ cy, /** @type {number} */ ro, /** @type {number} */ ri, /** @type {string} */ ch) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d <= ro && d >= ri) g[y][x] = ch;
      }
      return c;
    },
    line(/** @type {number} */ x0, /** @type {number} */ y0, /** @type {number} */ x1, /** @type {number} */ y1, /** @type {string} */ ch) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) c.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), ch);
      return c;
    },
    /** Empties the rows y0 (inclusive) to y1 (exclusive). */
    clearRows(/** @type {number} */ y0, /** @type {number} */ y1) {
      for (let y = y0; y < y1; y++) g[y].fill('.');
      return c;
    },
    /** Surrounds everything drawn so far with a one pixel outline. */
    outline(/** @type {string} */ ch) {
      const snap = g.map((r) => [...r]);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        if (snap[y][x] !== '.') continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inside(x + dx, y + dy) && snap[y + dy][x + dx] !== '.')) g[y][x] = ch;
      }
      return c;
    },
    rows() { return g.map((r) => r.join('')); },
  };
  return c;
}
