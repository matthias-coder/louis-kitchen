import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findComMojang } from '../tools/deploy.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BP = path.join(root, 'packs', 'BP');
const RP = path.join(root, 'packs', 'RP');
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

/** Strips // comments that are outside of string literals. */
function stripComments(/** @type {string} */ text) {
  let out = '';
  let inStr = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      out += c;
      if (c === '\\') out += text[++i];
      else if (c === '"') inStr = false;
    } else if (c === '"') {
      inStr = true;
      out += c;
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
    } else {
      out += c;
    }
  }
  return out;
}

/** @param {string} file @returns {any} */
function readJson(file) {
  return JSON.parse(stripComments(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')));
}

/** @param {string} file @returns {Map<string,string>} */
function readLang(file) {
  const map = new Map();
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('##')) continue;
    const eq = line.indexOf('=');
    assert.ok(eq > 0, `bad lang line in ${file}: ${line}`);
    map.set(line.slice(0, eq), line.slice(eq + 1));
  }
  return map;
}

const bp = () => readJson(path.join(BP, 'manifest.json'));
const rp = () => readJson(path.join(RP, 'manifest.json'));

test('every .json under packs/ parses', () => {
  const files = walk(path.join(root, 'packs')).filter((f) => f.endsWith('.json'));
  assert.ok(files.length >= 3);
  for (const f of files) {
    assert.doesNotThrow(() => readJson(f), f);
  }
});

test('BP manifest declares script module with entry scripts/main.js and dependencies @minecraft/server 2.0.0, @minecraft/server-ui 2.0.0, and the RP uuid', () => {
  const m = bp();
  const script = m.modules.find((/** @type {any} */ x) => x.type === 'script');
  assert.ok(script, 'script module missing');
  assert.equal(script.language, 'javascript');
  assert.equal(script.entry, 'scripts/main.js');
  assert.ok(m.modules.some((/** @type {any} */ x) => x.type === 'data'), 'data module missing');
  const dep = (/** @type {string} */ name) =>
    m.dependencies.find((/** @type {any} */ d) => d.module_name === name)?.version;
  assert.equal(dep('@minecraft/server'), '2.0.0');
  assert.equal(dep('@minecraft/server-ui'), '2.0.0');
  assert.ok(
    m.dependencies.some((/** @type {any} */ d) => d.uuid === rp().header.uuid),
    'RP dependency missing',
  );
});

test('RP manifest depends on the BP header uuid; all five uuids are distinct valid v4 uuids', () => {
  const b = bp();
  const r = rp();
  assert.ok(r.dependencies.some((/** @type {any} */ d) => d.uuid === b.header.uuid));
  const ids = [
    b.header.uuid,
    ...b.modules.map((/** @type {any} */ x) => x.uuid),
    r.header.uuid,
    ...r.modules.map((/** @type {any} */ x) => x.uuid),
  ];
  assert.equal(ids.length, 5);
  for (const id of ids) assert.match(id, UUID_V4);
  assert.equal(new Set(ids).size, 5);
});

test('min_engine_version is [1, 26, 0] in both', () => {
  assert.deepEqual(bp().header.min_engine_version, [1, 26, 0]);
  assert.deepEqual(rp().header.min_engine_version, [1, 26, 0]);
});

test('de_DE.lang and en_US.lang have identical key sets', () => {
  const de = [...readLang(path.join(RP, 'texts', 'de_DE.lang')).keys()].sort();
  const en = [...readLang(path.join(RP, 'texts', 'en_US.lang')).keys()].sort();
  assert.deepEqual(en, de);
});

test('every item/block/entity identifier defined in BP has a name key in de_DE.lang', () => {
  const lang = readLang(path.join(RP, 'texts', 'de_DE.lang'));
  /** @type {[string, string, (id: string) => string][]} */
  const kinds = [
    ['items', 'minecraft:item', (id) => `item.${id}`],
    ['blocks', 'minecraft:block', (id) => `tile.${id}.name`],
    ['entities', 'minecraft:entity', (id) => `entity.${id}.name`],
  ];
  for (const [dir, key, langKey] of kinds) {
    const files = walk(path.join(BP, dir)).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      const id = readJson(f)[key]?.description?.identifier;
      assert.ok(id, `no identifier in ${f}`);
      assert.ok(id.startsWith('kochmod:'), `${id} is not in the kochmod namespace`);
      assert.ok(lang.has(langKey(id)), `missing lang key ${langKey(id)} for ${f}`);
    }
  }
});

test('every texture path referenced from RP item_texture.json, terrain_texture.json and entity files exists as .png', () => {
  /** @type {string[]} */
  const refs = [];
  /** @param {any} node */
  const collectTextures = (node) => {
    if (Array.isArray(node)) node.forEach(collectTextures);
    else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (k === 'textures') {
          for (const t of [v].flat()) {
            if (typeof t === 'string') refs.push(t);
            else if (t && typeof t === 'object' && typeof t.path === 'string') refs.push(t.path);
          }
        } else collectTextures(v);
      }
    }
  };
  for (const f of ['item_texture.json', 'terrain_texture.json']) {
    const p = path.join(RP, 'textures', f);
    if (fs.existsSync(p)) collectTextures(readJson(p).texture_data);
  }
  for (const f of walk(path.join(RP, 'entity')).filter((x) => x.endsWith('.json'))) {
    const textures = readJson(f)['minecraft:client_entity']?.description?.textures ?? {};
    refs.push(...Object.values(textures).filter((t) => typeof t === 'string'));
  }
  for (const ref of refs) {
    assert.ok(fs.existsSync(path.join(RP, `${ref}.png`)), `missing texture ${ref}.png`);
  }
});

test('findComMojang prefers env, then APPDATA, then LOCALAPPDATA, else null', () => {
  const env = {
    KOCHMOD_COM_MOJANG: 'E:\\custom',
    APPDATA: 'C:\\Users\\x\\AppData\\Roaming',
    LOCALAPPDATA: 'C:\\Users\\x\\AppData\\Local',
  };
  const appData = path.join(env.APPDATA, 'Minecraft Bedrock', 'Users', 'Shared', 'games', 'com.mojang');
  const localData = path.join(
    env.LOCALAPPDATA,
    'Packages',
    'Microsoft.MinecraftUWP_8wekyb3d8bbwe',
    'LocalState',
    'games',
    'com.mojang',
  );
  const all = new Set([env.KOCHMOD_COM_MOJANG, appData, localData]);
  assert.equal(findComMojang(env, (p) => all.has(p)), env.KOCHMOD_COM_MOJANG);
  all.delete(env.KOCHMOD_COM_MOJANG);
  assert.equal(findComMojang(env, (p) => all.has(p)), appData);
  all.delete(appData);
  assert.equal(findComMojang(env, (p) => all.has(p)), localData);
  all.delete(localData);
  assert.equal(findComMojang(env, (p) => all.has(p)), null);
  assert.equal(findComMojang({}, () => true), null);
});

test('BP and RP manifest versions are equal', () => {
  assert.deepEqual(bp().header.version, rp().header.version);
  assert.deepEqual(bp().header.version, [1, 2, 0]);
  for (const m of [bp(), rp()]) {
    for (const mod of m.modules) assert.deepEqual(mod.version, [1, 2, 0]);
  }
  const bpDep = bp().dependencies.find((/** @type {any} */ d) => d.uuid);
  const rpDep = rp().dependencies.find((/** @type {any} */ d) => d.uuid);
  assert.deepEqual(bpDep.version, rp().header.version);
  assert.deepEqual(rpDep.version, bp().header.version);
});

test('pack_icon.png exists in both packs', () => {
  for (const dir of [BP, RP]) {
    const file = path.join(dir, 'pack_icon.png');
    assert.ok(fs.existsSync(file), file);
    assert.equal(fs.readFileSync(file).subarray(1, 4).toString(), 'PNG');
  }
});

test('pack names carry the version so Minecraft lists versions apart', () => {
  const v = bp().header.version.join('.');
  assert.equal(bp().header.name, `Louis Kitchen ${v}`);
  assert.equal(rp().header.name, `Louis Kitchen ${v}`);
  for (const lang of ['de_DE', 'en_US']) {
    const text = fs.readFileSync(path.join(root, 'packs/RP/texts', `${lang}.lang`), 'utf8');
    assert.match(text, new RegExp(`^pack\.name=Louis Kitchen ${v.replaceAll('.', '\.')}$`, 'm'));
  }
});

test('guest wish enum follows the dish catalog', async () => {
  const { DISHES } = await import('../packs/BP/scripts/logic/recipes.js');
  const { plateName } = await import('../packs/BP/scripts/logic/catalog.js');
  const guest = JSON.parse(fs.readFileSync(path.join(BP, 'entities', 'guest.json'), 'utf8'));
  assert.deepEqual(guest['minecraft:entity'].description.properties['kochmod:wish'].values, ['none', ...DISHES.map(plateName)]);
});

/** @param {string} id */
function blockWithGeometry(id) {
  const block = JSON.parse(fs.readFileSync(path.join(BP, 'blocks', `${id}.json`), 'utf8'))['minecraft:block'];
  const geo = JSON.parse(fs.readFileSync(path.join(root, 'packs', 'RP', 'models', 'blocks', `${id}.geo.json`), 'utf8'))['minecraft:geometry'][0];
  const vis = block.components['minecraft:geometry'].bone_visibility;
  const bones = geo.bones.map((/** @type {any} */ b) => b.name);
  for (const bone of Object.keys(vis)) assert.ok(bones.includes(bone), `${id}: bone ${bone} exists`);
  return { block, geo, vis, bones };
}

test('table: generic plate states (dish ids map to food / failed), one bone per plate look', async () => {
  const { DISH_PLATES } = await import('../packs/BP/scripts/logic/guest-flow.js');
  const { tableView } = await import('../packs/BP/scripts/logic/restaurant.js');
  const { block, vis } = blockWithGeometry('table');
  const states = block.description.states['kochmod:plate'];
  assert.deepEqual(states, ['none', 'food', 'failed', 'empty']);
  for (const plate of [...DISH_PLATES, 'none', 'empty']) assert.ok(states.includes(tableView(plate)), plate);
  assert.deepEqual(Object.keys(vis).sort(), ['failed', 'food', 'plate', 'plate_empty']);
  assert.equal(vis.food, "q.block_state('kochmod:plate') == 'food'");
  assert.equal(vis.failed, "q.block_state('kochmod:plate') == 'failed'");
  assert.equal(vis.plate_empty, "q.block_state('kochmod:plate') == 'empty'");
});

test('counter: family enum and layer count, one stack of 6 layer bones per family, nothing above 23 px', async () => {
  const { COUNTER_FAMILIES, COUNTER_LAYERS } = await import('../packs/BP/scripts/logic/stations.js');
  const { block, geo, vis } = blockWithGeometry('counter');
  assert.deepEqual(block.description.states, {
    'kochmod:family': ['none', 'burger', 'pizza', 'doner', 'sushi'],
    'kochmod:layers': [0, 1, 2, 3, 4, 5, 6],
  });
  assert.deepEqual(COUNTER_FAMILIES, block.description.states['kochmod:family']);
  /** @type {Record<string, string>} */
  const expected = {};
  for (const family of COUNTER_FAMILIES.slice(1)) {
    for (let n = 1; n <= COUNTER_LAYERS; n++) {
      expected[`${family}_${n}`] = `q.block_state('kochmod:family') == '${family}' && q.block_state('kochmod:layers') >= ${n}`;
    }
  }
  assert.deepEqual(vis, expected);
  for (const bone of geo.bones) {
    for (const cube of bone.cubes) assert.ok(cube.origin[1] + cube.size[1] <= 23, `${bone.name} reaches above 23 px`);
  }
});

test('oven: content states, fire and one pizza bone per stage, nothing above 23 px, collision within the block', () => {
  const { block, geo, vis } = blockWithGeometry('oven');
  assert.equal(block.description.identifier, 'kochmod:oven');
  assert.deepEqual(block.description.states, { 'kochmod:content': ['empty', 'raw', 'cooked', 'burnt'] });
  assert.deepEqual(vis, {
    fire: "q.block_state('kochmod:content') != 'empty'",
    pizza_raw: "q.block_state('kochmod:content') == 'raw'",
    pizza_cooked: "q.block_state('kochmod:content') == 'cooked'",
    pizza_burnt: "q.block_state('kochmod:content') == 'burnt'",
  });
  assert.equal(block.components['minecraft:geometry'].identifier, 'geometry.kochmod.oven');
  assert.deepEqual(block.components['minecraft:material_instances']['*'], { texture: 'kochmod_oven', render_method: 'alpha_test' });
  assert.ok('kochmod:oven' in block.components);
  for (const box of ['minecraft:collision_box', 'minecraft:selection_box']) {
    const { origin, size } = block.components[box];
    assert.ok(origin[1] + size[1] <= 16, box);
  }
  for (const bone of geo.bones) {
    for (const cube of bone.cubes) assert.ok(cube.origin[1] + cube.size[1] <= 23, `${bone.name} reaches above 23 px`);
  }
});

test('oven: name, hints and sound exist', () => {
  for (const lang of ['de_DE', 'en_US']) {
    const text = fs.readFileSync(path.join(root, 'packs/RP/texts', `${lang}.lang`), 'utf8');
    for (const line of ['tile.kochmod:oven.name=Pizzaofen', 'kochmod.hint.need_peel=Nimm den Pizzaschieber!', 'kochmod.hint.oven_full=Der Ofen ist belegt.']) {
      assert.ok(text.split(/\r?\n/).includes(line), `${lang}: ${line}`);
    }
  }
  const sounds = JSON.parse(fs.readFileSync(path.join(root, 'packs/RP/sounds/sound_definitions.json'), 'utf8')).sound_definitions;
  assert.ok(sounds['kochmod.oven']?.sounds?.length > 0);
});
