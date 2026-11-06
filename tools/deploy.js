import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Finds the Minecraft Bedrock com.mojang folder.
 * @param {Record<string, string | undefined>} env
 * @param {(p: string) => boolean} exists
 * @returns {string | null}
 */
export function findComMojang(env, exists) {
  /** @type {(string | undefined)[]} */
  const candidates = [
    env.KOCHMOD_COM_MOJANG,
    env.APPDATA &&
      path.join(env.APPDATA, 'Minecraft Bedrock', 'Users', 'Shared', 'games', 'com.mojang'),
    env.LOCALAPPDATA &&
      path.join(
        env.LOCALAPPDATA,
        'Packages',
        'Microsoft.MinecraftUWP_8wekyb3d8bbwe',
        'LocalState',
        'games',
        'com.mojang',
      ),
  ];
  for (const c of candidates) {
    if (c && exists(c)) return c;
  }
  return null;
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const target = findComMojang(process.env, fs.existsSync);
  if (!target) {
    console.error(
      'com.mojang folder not found. Looked in:\n' +
        '  1. %KOCHMOD_COM_MOJANG%\n' +
        '  2. %APPDATA%\\Minecraft Bedrock\\Users\\Shared\\games\\com.mojang\n' +
        '  3. %LOCALAPPDATA%\\Packages\\Microsoft.MinecraftUWP_8wekyb3d8bbwe\\LocalState\\games\\com.mojang\n' +
        'Start Minecraft once, or set KOCHMOD_COM_MOJANG.',
    );
    process.exit(1);
  }
  for (const [src, dest] of [
    ['BP', path.join('development_behavior_packs', 'Kochmod_BP')],
    ['RP', path.join('development_resource_packs', 'Kochmod_RP')],
  ]) {
    const out = path.join(target, dest);
    fs.rmSync(out, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.cpSync(path.join(root, 'packs', src), out, { recursive: true });
    console.log(`deployed ${src} -> ${out}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
