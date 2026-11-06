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
