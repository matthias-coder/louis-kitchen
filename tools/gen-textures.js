import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { encodePng } from './png.js';
import { spriteToRgba } from './sprites/util.js';
import { writeBlockGeometry, writeEntityGeometry } from './geometry.js';
import { guestLayout, GUEST_TEXTURE } from './sprites/entity.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const spritesDir = path.join(root, 'tools', 'sprites');
const textureDir = path.join(root, 'packs', 'RP', 'textures');

/** @type {Record<string, { textures: string }>} */
const itemTextures = {};
/** @type {Record<string, { textures: string }>} */
const terrainTextures = {};
let count = 0;

const files = fs.readdirSync(spritesDir).filter((f) => f.endsWith('.js') && f !== 'util.js').sort();
for (const file of files) {
  const mod = await import(pathToFileURL(path.join(spritesDir, file)).href);
  const folder = mod.folder;
  if (typeof folder !== 'string') throw new Error(`${file} must export a string "folder"`);
  const outDir = path.join(textureDir, folder);
  fs.mkdirSync(outDir, { recursive: true });
  for (const sprite of Object.values(mod)) {
    if (!sprite || typeof sprite !== 'object' || !Array.isArray(sprite.rows)) continue;
    const { width, height, rgba } = spriteToRgba(sprite);
    fs.writeFileSync(path.join(outDir, `${sprite.name}.png`), encodePng(width, height, rgba));
    if (folder === 'items') itemTextures[`kochmod_${sprite.name}`] = { textures: `textures/items/${sprite.name}` };
    if (folder === 'blocks') terrainTextures[`kochmod_${sprite.name}`] = { textures: `textures/blocks/${sprite.name}` };
    count++;
  }
}

const itemTextureJson = {
  resource_pack_name: 'kochmod',
  texture_name: 'atlas.items',
  texture_data: itemTextures,
};
fs.writeFileSync(path.join(textureDir, 'item_texture.json'), `${JSON.stringify(itemTextureJson, null, 2)}\n`);
const terrainTextureJson = {
  resource_pack_name: 'kochmod',
  texture_name: 'atlas.terrain',
  padding: 8,
  num_mip_levels: 4,
  texture_data: terrainTextures,
};
fs.writeFileSync(path.join(textureDir, 'terrain_texture.json'), `${JSON.stringify(terrainTextureJson, null, 2)}\n`);
// Pack icon: hamburger sprite scaled x4 on a plain background
const { hamburger } = await import(pathToFileURL(path.join(spritesDir, 'items.js')).href);
const icon = spriteToRgba(hamburger);
const iconBg = [143, 199, 232];
const iconRgba = new Uint8Array(64 * 64 * 4);
for (let y = 0; y < 64; y++) {
  for (let x = 0; x < 64; x++) {
    const s = ((y >> 2) * icon.width + (x >> 2)) * 4;
    const solid = icon.rgba[s + 3] > 0;
    const o = (y * 64 + x) * 4;
    for (let c = 0; c < 3; c++) iconRgba[o + c] = solid ? icon.rgba[s + c] : iconBg[c];
    iconRgba[o + 3] = 255;
  }
}
for (const pack of ['BP', 'RP']) {
  fs.writeFileSync(path.join(root, 'packs', pack, 'pack_icon.png'), encodePng(64, 64, iconRgba));
}
const geoCount = writeBlockGeometry(root);
writeEntityGeometry(root, guestLayout, GUEST_TEXTURE);
console.log(`gen-textures: wrote ${count} PNGs, ${geoCount} block geometries and the guest geometry`);
