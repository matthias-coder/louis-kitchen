import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bookIndex, bookPages } from '../packs/BP/scripts/logic/recipe-book.js';
import { DISHES } from '../packs/BP/scripts/logic/recipes.js';
import { stepsFor } from '../packs/BP/scripts/logic/processes.js';
import { ITEMS, plateName } from '../packs/BP/scripts/logic/catalog.js';

const BACK = { translate: 'kochmod.book.back' };
const BOOK_ICON = 'textures/items/recipe_book';
const labelOf = (/** @type {any} */ b) => JSON.stringify(b.label);

/** @param {string} file @returns {Map<string, string>} */
function readLang(file) {
  const text = fs.readFileSync(new URL(`../packs/RP/texts/${file}`, import.meta.url), 'utf8');
  return new Map(text.split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => {
    const i = l.indexOf('=');
    return [l.slice(0, i), l.slice(i + 1)];
  }));
}
const DE = readLang('de_DE.lang');
const EN = readLang('en_US.lang');

/** @param {any} msg @returns {string} the German text of a raw message */
function render(msg) {
  if (msg.rawtext) return msg.rawtext.map(render).join('');
  if (msg.translate) return DE.get(msg.translate) ?? `<${msg.translate}>`;
  return msg.text ?? '';
}
/** @param {any} msg @returns {string[]} every translate key of a raw message */
function keysOf(msg) {
  if (msg.rawtext) return msg.rawtext.flatMap(keysOf);
  return msg.translate ? [msg.translate] : [];
}
/** @param {string} dish @returns {string[]} the step labels of a page in German, without the back button */
const labels = (dish) => bookPages(dish).buttons.slice(0, -1).map((b) => render(b.label));

test('bookIndex: one button per dish in DISHES order with name and picture', () => {
  const index = bookIndex();
  assert.deepEqual(index.title, { translate: 'kochmod.book.title' });
  assert.equal(index.buttons.length, 10);
  assert.deepEqual(index.buttons.map((b) => b.dish), DISHES);
  for (const b of index.buttons) {
    assert.deepEqual(b.label, { translate: `item.${b.dish}` });
    assert.equal(b.icon, `textures/items/${plateName(b.dish)}`);
  }
});

test('bookPages: cheeseburger shows every ingredient with its crate before the step that uses it', () => {
  assert.deepEqual(labels('kochmod:cheeseburger'), [
    '1. Brötchen ➜ Vorratsschrank',
    '2. Rohe Frikadelle ➜ Kühlschrank',
    '3. Rohe Frikadelle ➜ Grill (Küchen-Multitool)',
    '4. Salat ➜ Kühlschrank',
    '5. Tomate ➜ Kühlschrank',
    '6. Tomate ➜ Schneidebrett (Küchen-Multitool)',
    '7. Käse ➜ Kühlschrank',
    '8. Cheeseburger ➜ Anrichte',
  ]);
  const page = bookPages('kochmod:cheeseburger');
  assert.deepEqual(page.title, { translate: 'item.kochmod:cheeseburger' });
  assert.deepEqual(page.buttons[0].label, {
    rawtext: [{ text: '1. ' }, { translate: 'item.kochmod:bun' }, { text: ' ➜ ' }, { translate: 'tile.kochmod:pantry.name' }],
  });
  assert.equal(page.buttons[0].icon, 'textures/items/bun');
  assert.equal(page.buttons[2].icon, 'textures/items/raw_patty');
  assert.equal(page.buttons[7].icon, 'textures/items/cheeseburger');
  assert.deepEqual(page.buttons[8], { label: BACK, icon: BOOK_ICON });
});

test('bookPages: ramen lists its four ingredients, then the pot with the bowl', () => {
  assert.deepEqual(labels('kochmod:ramen'), [
    '1. Brühe ➜ Vorratsschrank',
    '2. Nudeln ➜ Vorratsschrank',
    '3. Ei ➜ Kühlschrank',
    '4. Frühlingszwiebel ➜ Kühlschrank',
    '5. Ramen ➜ Suppentopf (Suppenschüssel)',
  ]);
  assert.equal(bookPages('kochmod:ramen').buttons[4].icon, 'textures/items/ramen');
});

test('bookPages: hamburger and cheeseburger pages differ', () => {
  assert.notDeepEqual(labels('kochmod:hamburger'), labels('kochmod:cheeseburger'));
  assert.ok(!labels('kochmod:hamburger').some((l) => l.includes('Käse')));
});

test('bookPages: every part of every recipe in a dish tree is on its page (ingredients with their crate, prepared parts via their step)', () => {
  for (const dish of DISHES) {
    const steps = stepsFor(dish);
    /** @type {Set<string>} "item|station" of every button */
    const shown = new Set(bookPages(dish).buttons.slice(0, -1).map((b) => {
      const r = /** @type {any} */ (b.label).rawtext;
      return `${r[1].translate}|${r[3].translate}`;
    }));
    const item = (/** @type {string} */ id) => `item.${id}`;
    const tile = (/** @type {string} */ st) => `tile.kochmod:${st}.name`;
    for (const step of steps) {
      for (const part of [...(step.parts ?? []), step.item]) {
        const def = ITEMS[part];
        if (def.kind === 'ingredient') {
          assert.ok(shown.has(`${item(part)}|${tile(/** @type {string} */ (def.source))}`), `${dish}: fetch ${part}`);
        } else {
          const maker = steps.find((s) => (s.result ?? s.item) === part);
          assert.ok(maker, `${dish}: no step makes ${part}`);
          assert.ok(shown.has(`${item(maker.item)}|${tile(maker.station)}`), `${dish}: make ${part}`);
        }
      }
    }
    assert.ok(shown.has(`${item(steps.at(-1)?.item ?? '')}|${tile(steps.at(-1)?.station ?? '')}`), `${dish}: final step`);
  }
});

test('bookPages: each ingredient fetched once, no duplicate steps for any dish', () => {
  for (const dish of DISHES) {
    const texts = labels(dish).map((l) => l.replace(/^\d+\. /, ''));
    assert.equal(new Set(texts).size, texts.length, dish);
  }
  assert.ok(bookPages('kochmod:doner').buttons.length > 1);
});

test('bookPages: steps are numbered without gaps', () => {
  for (const dish of DISHES) {
    const page = bookPages(dish);
    page.buttons.slice(0, -1).forEach((b, i) => assert.equal(/** @type {any} */ (b.label).rawtext[0].text, `${i + 1}. `, dish));
  }
});

test('bookPages: every translate key exists in both lang files and every icon exists as a texture', () => {
  const pages = [bookIndex(), ...DISHES.map(bookPages)];
  for (const page of pages) {
    for (const key of [...keysOf(page.title), ...page.buttons.flatMap((b) => keysOf(b.label))]) {
      assert.ok(DE.has(key), `de_DE: ${key}`);
      assert.ok(EN.has(key), `en_US: ${key}`);
    }
    for (const b of page.buttons) {
      assert.ok(fs.existsSync(new URL(`../packs/RP/${b.icon}.png`, import.meta.url)), b.icon);
    }
  }
});

test('bookPages: unknown dish yields only the back button and never throws', () => {
  const page = bookPages('kochmod:nope');
  assert.deepEqual(page.buttons, [{ label: BACK, icon: BOOK_ICON }]);
  assert.ok(page.title);
});

test('bookPages: labels stay unique per page', () => {
  for (const dish of DISHES) {
    const all = bookPages(dish).buttons.map(labelOf);
    assert.equal(new Set(all).size, all.length, dish);
  }
});

test('bookPages: sushi fetches the cooked rice from the pantry instead of cooking it', () => {
  const l = labels('kochmod:sushi');
  assert.ok(l.includes('2. Gekochter Reis ➜ Vorratsschrank'), l.join(' | '));
  assert.ok(!l.some((x) => x.includes('Suppentopf')));
});
