import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const textures = path.join(root, 'tools', 'gen-textures.js');
if (fs.existsSync(textures)) {
  const r = spawnSync(process.execPath, [textures], { stdio: 'inherit', cwd: root });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const zip = new AdmZip();
zip.addLocalFolder(path.join(root, 'packs', 'BP'), 'LouisKitchen_BP');
zip.addLocalFolder(path.join(root, 'packs', 'RP'), 'LouisKitchen_RP');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'packs', 'BP', 'manifest.json'), 'utf8'));
const version = manifest.header.version.join('.');
const out = path.join(root, 'dist', `LouisKitchen_${version}.mcaddon`);
fs.mkdirSync(path.dirname(out), { recursive: true });
zip.writeZip(out);
console.log(`built ${out}`);
