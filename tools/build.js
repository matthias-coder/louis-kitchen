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
zip.addLocalFolder(path.join(root, 'packs', 'BP'), 'Kochmod_BP');
zip.addLocalFolder(path.join(root, 'packs', 'RP'), 'Kochmod_RP');
const out = path.join(root, 'dist', 'kochmod.mcaddon');
fs.mkdirSync(path.dirname(out), { recursive: true });
zip.writeZip(out);
console.log(`built ${out}`);
