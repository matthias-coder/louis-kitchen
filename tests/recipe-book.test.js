import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bookIndex, bookPages } from '../packs/BP/scripts/logic/recipe-book.js';
import { DISHES } from '../packs/BP/scripts/logic/recipes.js';
import { plateName } from '../packs/BP/scripts/logic/catalog.js';

const BACK = { translate: 'kochmod.book.back' };
const BOOK_ICON = 'textures/items/recipe_book';
const labelOf = (/** @type {any} */ b) => JSON.stringify(b.label);

test('bookIndex: one button per dish in DISHES order with name and picture', () => {
  const index = bookIndex();
  assert.deepEqual(index.title, { translate: 'kochmod.book.title' });
  assert.equal(index.buttons.length, 9);
  assert.deepEqual(index.buttons.map((b) => b.dish), DISHES);
  for (const b of index.buttons) {
    assert.deepEqual(b.label, { translate: `item.${b.dish}` });
    assert.equal(b.icon, `textures/items/${plateName(b.dish)}`);
  }
});

test('bookPages: cheeseburger has grill, cutting board, counter and a back button', () => {
  const page = bookPages('kochmod:cheeseburger');
  assert.deepEqual(page.title, { translate: 'item.kochmod:cheeseburger' });
  assert.equal(page.buttons.length, 4);
  assert.deepEqual(page.buttons[0].label, {
    rawtext: [
      { text: '1. ' }, { translate: 'item.kochmod:raw_patty' }, { text: ' ➜ ' }, { translate: 'tile.kochmod:grill.name' },
      { text: ' (' }, { translate: 'item.kochmod:spatula' }, { text: ')' },
    ],
  });
  assert.equal(page.buttons[0].icon, 'textures/items/raw_patty');
  const text = page.buttons.map(labelOf).join('|');
  for (const st of ['grill', 'cutting_board', 'counter']) assert.ok(text.includes(`tile.kochmod:${st}.name`), st);
  assert.deepEqual(page.buttons[3], { label: BACK, icon: BOOK_ICON });
});

test('bookPages: ramen is one step with the bowl in the label', () => {
  const page = bookPages('kochmod:ramen');
  assert.equal(page.buttons.length, 2);
  assert.deepEqual(page.buttons[0].label.rawtext.slice(-3), [
    { text: ' (' }, { translate: 'item.kochmod:bowl' }, { text: ')' },
  ]);
  assert.equal(page.buttons[0].icon, 'textures/items/ramen');
});

test('bookPages: no duplicate steps for any dish', () => {
  for (const dish of DISHES) {
    const labels = bookPages(dish).buttons.map(labelOf);
    assert.equal(new Set(labels).size, labels.length, dish);
  }
  assert.ok(bookPages('kochmod:doner').buttons.length > 1);
});

test('bookPages: steps are numbered without gaps', () => {
  const page = bookPages('kochmod:doner');
  page.buttons.slice(0, -1).forEach((b, i) => assert.equal(b.label.rawtext[0].text, `${i + 1}. `));
});

test('bookPages: unknown dish yields only the back button and never throws', () => {
  const page = bookPages('kochmod:nope');
  assert.deepEqual(page.buttons, [{ label: BACK, icon: BOOK_ICON }]);
  assert.ok(page.title);
});
