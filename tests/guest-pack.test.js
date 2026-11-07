import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGuestGeometry } from '../tools/geometry.js';
import { DISHES } from '../packs/BP/scripts/logic/recipes.js';
import { plateName } from '../packs/BP/scripts/logic/catalog.js';
import { guestLayout, GUEST_TEXTURE } from '../tools/sprites/entity.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** @param {string} rel @returns {any} */
const json = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

const geo = json('packs/RP/models/entity/guest.geo.json');
const bones = new Set(geo['minecraft:geometry'][0].bones.map((/** @type {any} */ b) => b.name));

test('committed guest geometry matches the generator', () => {
  assert.deepEqual(geo, buildGuestGeometry(guestLayout, GUEST_TEXTURE));
});

test('every bone used by animations and the render controller exists in the guest geometry', () => {
  const anims = json('packs/RP/animations/guest.animation.json').animations;
  for (const [name, a] of Object.entries(anims)) {
    for (const bone of Object.keys(/** @type {any} */ (a).bones)) assert.ok(bones.has(bone), `${name}: ${bone}`);
  }
  const rc = json('packs/RP/render_controllers/guest.render_controllers.json').render_controllers['controller.render.kochmod.guest'];
  for (const entry of rc.part_visibility) {
    for (const bone of Object.keys(entry)) if (bone !== '*') assert.ok(bones.has(bone), `part_visibility: ${bone}`);
  }
});

test('every bone has a known parent and the bubble has one picture per wish', () => {
  for (const b of geo['minecraft:geometry'][0].bones) if (b.parent) assert.ok(bones.has(b.parent), b.name);
  const wishes = json('packs/BP/entities/guest.json')['minecraft:entity'].description.properties['kochmod:wish'].values;
  for (const w of wishes.filter((/** @type {string} */ w) => w !== 'none')) assert.ok(bones.has(`bubble_${w}`), w);
});

test('client entity references the declared animations and controllers', () => {
  const desc = json('packs/RP/entity/guest.entity.json')['minecraft:client_entity'].description;
  const anims = Object.keys(json('packs/RP/animations/guest.animation.json').animations);
  const controllers = json('packs/RP/animation_controllers/guest.animation_controllers.json').animation_controllers;
  for (const id of Object.values(desc.animations)) {
    assert.ok(anims.includes(/** @type {string} */ (id)) || id in controllers, `${id}`);
  }
  for (const c of Object.values(controllers)) {
    for (const state of Object.values(/** @type {any} */ (c).states)) {
      for (const a of /** @type {any} */ (state).animations ?? []) assert.ok(a in desc.animations, `controller uses ${a}`);
    }
  }
  for (const a of desc.scripts.animate) assert.ok(a in desc.animations, a);
});

test('every dish has a wish value, a bubble picture, a bubble bone and a render controller entry', () => {
  const wishes = json('packs/BP/entities/guest.json')['minecraft:entity'].description.properties['kochmod:wish'].values;
  assert.deepEqual(wishes, ['none', ...DISHES.map(plateName)]);
  const rc = json('packs/RP/render_controllers/guest.render_controllers.json').render_controllers['controller.render.kochmod.guest'];
  for (const dish of DISHES) {
    const w = plateName(dish);
    assert.ok(`bubble_${w}` in guestLayout, `layout bubble_${w}`);
    assert.ok(bones.has(`bubble_${w}`), `bone bubble_${w}`);
    const entry = rc.part_visibility.find((/** @type {any} */ e) => `bubble_${w}` in e);
    assert.ok(entry, `part_visibility bubble_${w}`);
    assert.ok(entry[`bubble_${w}`].includes(`'${w}'`), `condition for ${w}`);
  }
});
