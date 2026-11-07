import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/** @param {string} rel @returns {any} */
const json = (rel) => JSON.parse(fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));

/** @param {string} id */
function blockAndGeo(id) {
  const block = json(`packs/BP/blocks/${id}.json`)['minecraft:block'];
  const geo = json(`packs/RP/models/blocks/${id}.geo.json`)['minecraft:geometry'][0];
  return { block, geo, bones: geo.bones.map((/** @type {any} */ b) => b.name) };
}

test('dishwasher and dish cabinet: geometry wired, every bone_visibility bone exists, UVs inside the texture, facing state wired', () => {
  for (const id of ['dishwasher', 'dish_cabinet']) {
    const { block, geo, bones } = blockAndGeo(id);
    const g = block.components['minecraft:geometry'];
    assert.equal(g.identifier, geo.description.identifier);
    for (const bone of Object.keys(g.bone_visibility)) assert.ok(bones.includes(bone), `${id}: bone ${bone}`);
    assert.ok(`kochmod:${id}` in block.components, `${id}: custom component`);
    assert.equal(block.components['minecraft:material_instances']['*'].texture, `kochmod_${id}`);
    assert.ok(block.description.traits['minecraft:placement_direction'].enabled_states.includes('minecraft:cardinal_direction'));
    assert.equal(block.permutations.length, 4);
    const png = fs.readFileSync(new URL(`../packs/RP/textures/blocks/${id}.png`, import.meta.url));
    assert.equal(png.readUInt32BE(16), geo.description.texture_width);
    for (const cube of geo.bones.flatMap((/** @type {any} */ b) => b.cubes)) {
      for (const f of Object.values(cube.uv)) {
        assert.ok(f.uv[0] + f.uv_size[0] <= 64 && f.uv[1] + f.uv_size[1] <= 64, `${id}: uv`);
      }
    }
    assert.equal(json('packs/RP/blocks.json')[`kochmod:${id}`].sound.length > 0, true);
  }
});

test('dishwasher: three light bones, one per view state', () => {
  const { block } = blockAndGeo('dishwasher');
  assert.deepEqual(block.description.states['kochmod:state'], ['empty', 'running', 'done']);
  const vis = block.components['minecraft:geometry'].bone_visibility;
  assert.deepEqual(Object.keys(vis), ['light_off', 'light_blue', 'light_green']);
  assert.match(vis.light_off, /'empty'/);
  assert.match(vis.light_blue, /'running'/);
  assert.match(vis.light_green, /'done'/);
});

test('dish cabinet: integer state 0..8 defaulting to 8, plate_n visible from n plates', () => {
  const { block, bones } = blockAndGeo('dish_cabinet');
  const values = block.description.states['kochmod:plates'];
  assert.equal(values[0], 8, 'first value is the default: a placed cabinet shows 8 plates');
  assert.deepEqual([...values].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const vis = block.components['minecraft:geometry'].bone_visibility;
  for (let n = 1; n <= 8; n++) {
    assert.ok(bones.includes(`plate_${n}`));
    assert.equal(vis[`plate_${n}`], `q.block_state('kochmod:plates') >= ${n}`);
  }
});

test('kochmod.bubble uses vanilla bubble sounds', () => {
  const defs = json('packs/RP/sounds/sound_definitions.json').sound_definitions;
  assert.deepEqual(defs['kochmod.bubble'].sounds, ['sounds/bubbles/bubble1', 'sounds/bubbles/bubble2', 'sounds/bubbles/bubble3']);
});

test('plate and dish hints exist in both lang files', () => {
  const keys = ['need_plate', 'dishwasher_full', 'washing', 'cabinet_full', 'cabinet_empty'];
  for (const f of ['de_DE', 'en_US']) {
    const t = fs.readFileSync(new URL(`../packs/RP/texts/${f}.lang`, import.meta.url), 'utf8');
    for (const k of keys) assert.ok(t.includes(`\nkochmod.hint.${k}=`), `${f}: ${k}`);
  }
});
