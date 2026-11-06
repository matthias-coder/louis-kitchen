import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { encodePng } from './png.js';
import { spriteToRgba } from './sprites/util.js';
import { writeBlockGeometry } from './geometry.js';

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
const geoCount = writeBlockGeometry(root);
console.log(`gen-textures: wrote ${count} PNGs and ${geoCount} block geometries`);
