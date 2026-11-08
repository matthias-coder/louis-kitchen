# Kochmod Etappe 3 – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Küchen-Multitool, das nur im Inventar liegen muss, Sushi mit fertigem Reis, bereinigte Kisten, großzügige Gäste nach Küchen, Teller/Suppenschüssel/Pizzakarton im Geschirrschrank, Pommes aus der Fritteuse und Gäste, die Pizza zum Mitnehmen bestellen.

**Architecture:** Alle Spielregeln bleiben reine Funktionen unter `packs/BP/scripts/logic/` (getestet mit `node --test`), die Welt-Anbindung unter `packs/BP/scripts/world/`. Stationen bekommen neben `held` einen zweiten Blick ins Inventar (`carried(id)`), Gerichte eine Küchen-Zuordnung, Gäste einen zweiten Lebenslauf (Mitnahme). Neue Items, Blöcke und Gast-Bilder entstehen über die vorhandenen Sprite- und Geometrie-Generatoren (`npm run textures`).

**Tech Stack:** Minecraft Bedrock Script API (`@minecraft/server` 2.0.0, `@minecraft/server-ui` 2.0.0), ES-Module JavaScript mit JSDoc-Typen (`npm run typecheck`), Node-Test (`npm test`), eigene PNG/Geometrie-Generatoren unter `tools/`.

**Spec:** `docs/superpowers/specs/2026-11-08-kochmod-etappe-3-vereinfachung-design.md`

## Global Constraints

- Jede neue Logik liegt in `packs/BP/scripts/logic/` und ist ohne Minecraft testbar; die Welt-Dateien unter `world/` enthalten nur Anbindung.
- Alte Items (`knife`, `spatula`, `pizza_peel`, `wok_spatula`, `bowl`, `rice`, `potato_cubes`) bleiben als Item-JSON, Sprite und Lang-Eintrag bestehen; sie verschwinden nur aus Kisten (`source` entfällt, `menu: false`) und aus dem Rezeptbuch. Stationen akzeptieren sie weiter.
- Gespeicherte Zustände (Stationen, Glocken, Tische, Gäste) laden weiter: jede Formänderung bekommt einen Migrationszweig in `migrateStationState` bzw. `migrateBellState`, nie ein Umbau der alten Felder.
- Jeder Lang-Key existiert in `de_DE.lang` und `en_US.lang` (gleiche Key-Menge, `tests/packs.test.js`). Deutsche Texte kurz und kindgerecht.
- Jedes Katalog-Item hat Item-JSON, Sprite in `tools/sprites/items.js`, Lang-Eintrag und PNG (`tests/catalog.test.js`); jeder Block steht in `ALL_BLOCKS` und hat seine `kochmod:<id>`-Komponente (`tests/sync.test.js`).
- `npm test` und `npm run typecheck` sind nach jeder Task grün; nach Änderungen an `tools/sprites/*`, `tools/geometry.js` wird `npm run textures` ausgeführt und das Ergebnis mit committet.
- Commits auf Englisch im Stil der Historie (`feat:`, `fix:`, `docs:`), mit der Zeile `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Smaragd-Regel (Spec 5.5): Wunschgericht 1–3, anderes Gericht einer angebotenen Küche genau 1, sonst 0.

## Review Focus

1. Zeitstation (Grill/Ofen/Fritteuse) mit fertigem Inhalt, Hand hält eine fremde Zutat, Multitool liegt im Inventar: das Fertige wird abgenommen (Test in Task 2).
2. Topf mit fertiger Suppe, Hand hält eine Zutat, Suppenschüssel nur im Inventar: die Zutat wird eingelegt, nicht geschöpft; mit leerer Hand wird geschöpft und die Schüssel aus dem Inventar verbraucht (Task 2 und 5).
3. Alte Welt: gespeicherter Schrank `{ plates: 3 }` lädt als `{ plates: 3, bowls: 8 }`, alte Spülmaschine `{ plates: 2, ticks: 50 }` als `{ plates: 2, bowls: 0, ticks: 50 }`, alter Tisch `'empty'` gibt weiter einen Teller (Task 6 und 7).
4. Küche ändert sich zwischen Wunsch und Servieren (Grill abgebaut): Die Bewertung nutzt die Stationen zur Servierzeit; ein Burger ohne Grill in Reichweite bringt 0 Smaragde, ohne Absturz (Task 8).
5. Mitnahme-Gast und Tischgast an derselben Glocke: der Mitnahme-Gast blockiert keinen Stuhl, ein zweiter Mitnahme-Gast kommt nicht, solange einer wartet; Pommes an den Mitnahme-Gast gegeben: Kopfschütteln, nichts wird genommen (Task 12).

---

### Task 1: Multitool-Item und Werkzeuglisten

**Files:**
- Modify: `packs/BP/scripts/logic/catalog.js` (ITEMS, neue Konstanten)
- Modify: `packs/BP/scripts/logic/processes.js` (TIMED, SPIT, POT_DEF, WOK_DEF, neue `tools`)
- Create: `packs/BP/items/multitool.json`
- Modify: `tools/sprites/items.js` (Sprite `multitool`), `packs/RP/texts/de_DE.lang`, `packs/RP/texts/en_US.lang`
- Test: `tests/catalog.test.js`, `tests/processes.test.js`, `tests/crates.test.js`

**Interfaces:**
- Produces: `export const MULTITOOL = 'kochmod:multitool'` in `catalog.js`. In `processes.js`: `TIMED[k].tools: string[]` (Multitool zuerst, dann das alte Werkzeug), `TIMED[k].tool` bleibt und zeigt auf `MULTITOOL` (das Rezeptbuch zeigt `tool`); `TIMED[k].hintTool = 'kochmod.hint.need_multitool'` für beide; `export const CUT_TOOLS = [MULTITOOL, 'kochmod:knife']`; `SPIT.tools = [MULTITOOL, 'kochmod:knife']`, `SPIT.tool = MULTITOOL`; `POT_DEF.tools = ['kochmod:bowl']` (Task 5 ergänzt die Suppenschüssel), `WOK_DEF.tools = [MULTITOOL, 'kochmod:wok_spatula']`, `WOK_DEF.tool = MULTITOOL`, `WOK_DEF.hints.needTool = 'kochmod.hint.need_multitool'`. `PotDef` typedef bekommt `tools: string[]`.

- [ ] **Step 1: Failing tests**

In `tests/catalog.test.js`:
```js
test('multitool: tool from the tools crate, stack 1; the four old tools stay as items but leave the crates', () => {
  assert.deepEqual(ITEMS[MULTITOOL], { kind: 'tool', source: 'tools', stack: 1 });
  for (const old of ['knife', 'spatula', 'pizza_peel', 'wok_spatula'].map(k)) {
    assert.equal(ITEMS[old].kind, 'tool');
    assert.equal(ITEMS[old].source, undefined);
    assert.equal(ITEMS[old].menu, false);
  }
  assert.deepEqual(itemsFrom('tools'), [MULTITOOL, k('recipe_book'), k('clean_plate')]);
});
```
In `tests/processes.test.js`:
```js
test('every station lists the multitool first and its old tool second; the book shows the multitool', () => {
  assert.deepEqual(TIMED.grill.tools, [MULTITOOL, k('spatula')]);
  assert.deepEqual(TIMED.oven.tools, [MULTITOOL, k('pizza_peel')]);
  assert.deepEqual(SPIT.tools, [MULTITOOL, k('knife')]);
  assert.deepEqual(CUT_TOOLS, [MULTITOOL, k('knife')]);
  assert.deepEqual(WOK_DEF.tools, [MULTITOOL, k('wok_spatula')]);
  for (const def of [TIMED.grill, TIMED.oven, SPIT, WOK_DEF]) assert.equal(def.tool, MULTITOOL);
  assert.equal(TIMED.grill.hintTool, 'kochmod.hint.need_multitool');
  assert.deepEqual(stepsFor(k('hamburger'))[0], { item: k('raw_patty'), station: 'grill', tool: MULTITOOL, result: k('cooked_patty') });
});
```
Bestehende Tests anpassen, die `tool: 'kochmod:spatula'` / `knife` / `wok_spatula` in Schritten oder `hintTool`-Werte prüfen (`processes.test.js`, `recipe-book.test.js`, `crates.test.js` „tools come singly…“, „crates only hand out…“).

- [ ] **Step 2: Run, expect FAIL** — `npm test` (fehlende Exporte `MULTITOOL`, `CUT_TOOLS`).

- [ ] **Step 3: Implement**

`catalog.js`: `MULTITOOL` exportieren, Zeile `'kochmod:multitool': { kind: 'tool', source: 'tools', stack: 1 }` vor `recipe_book`; bei `knife`, `spatula`, `pizza_peel`, `wok_spatula` `source` entfernen und `menu: false` setzen. `processes.js` wie unter Interfaces. `packs/BP/items/multitool.json` nach dem Muster von `knife.json` (Textur `kochmod_multitool`, Stack 1, Kategorie `equipment`). Sprite `multitool` in `items.js`: 16×16, Messerklinge und Wenderblatt an einem Griff, erkennbar als Kombination. Lang: `item.kochmod:multitool=Küchen-Multitool` / `Kitchen Multitool`; `kochmod.hint.need_multitool=Du brauchst das Küchen-Multitool aus der Werkzeugkiste.` / englisch sinngemäß. Die alten Hints `need_spatula`, `need_peel`, `need_wok_spatula` bleiben in den Lang-Dateien (keine Referenz mehr nötig, aber harmlos).

- [ ] **Step 4: `npm run textures && npm test && npm run typecheck`** — alles grün (die Werkzeugkiste zeigt nur noch Multitool, Rezeptbuch, Teller).

- [ ] **Step 5: Commit** — `feat: kitchen multitool replaces knife, spatula, peel and wok spatula`

---

### Task 2: Werkzeug aus dem Inventar (Stationslogik)

**Files:**
- Modify: `packs/BP/scripts/logic/stations.js`
- Modify: `packs/BP/scripts/logic/station-flow.js` (`interactStation` reicht `carried` durch)
- Test: `tests/stations.test.js`, `tests/station-flow.test.js`

**Interfaces:**
- Produces: in `stations.js`
  - `export const NO_CARRY = (/** @type {string} */ _id) => false;`
  - `/** @typedef {(id: string) => boolean} Carried */`
  - `export function findTool(held, carried, tools)` → `{ id: string, inHand: boolean } | null`: das erste Werkzeug aus `tools`, das in der Hand ist, sonst das erste, das `carried` bejaht, sonst null.
  - `Result<S>` bekommt `consume?: string` (ein Stück dieses Items aus einem beliebigen Inventar-Slot entfernen).
  - Jede `interact(state, held, carried = NO_CARRY)` der Stationen: `timedStation(def).interact`, `potStation(def).interact`, `spitInteract`, `boardInteract`; `counterInteract`, `dishwasherInteract`, `cabinetInteract`, `trash.interact` nehmen den Parameter an und ignorieren ihn (gleiche Signatur für die Welt-Anbindung).
- `interactStation(interact, view, state, held, carried, io)` in `station-flow.js` (neuer 5. Parameter).

Regeln:
- Zeitstation belegt: Hand hält akzeptierte Rohware → `hintFull`; sonst `findTool(held, carried, def.tools)` → abnehmen (wie bisher `give: resultOf(...)`), ohne Werkzeug → `hintTool`.
- Schneidebrett: ganzes Stück liegt (`Object.hasOwn(CUTTABLE, state.item)`) und Werkzeug gefunden (Hand oder Inventar, `CUT_TOOLS`) → schneiden; sonst leere Hand → zurückgeben wie bisher; geschnittenes Stück + leere Hand → zurückgeben.
- Spieß: Fleisch hängt, Hand hält nicht die rohe Keule, Werkzeug gefunden (`SPIT.tools`) → Scheibe abschneiden (Hinweise wie bisher). Werkzeug nur im Inventar und Hand hält etwas anderes als die rohe Keule: ebenfalls schneiden.
- Topf/Wok: Werkzeug gefunden und Hand hält **kein** Essen (`!isFood(held)`) → schöpfen; `consumesTool` und das Werkzeug kam aus dem Inventar → `consume: id` statt `take: true`; aus der Hand → `take: true` wie bisher. Hand hält Essen → einlegen (unverändert). Leere Hand, Inhalt da, kein Werkzeug → `hints.needTool`.

- [ ] **Step 1: Failing tests** (`tests/stations.test.js`; `const carry = (...ids) => (id) => ids.includes(id)`):
```js
test('findTool: hand first, then the inventory, in tools order', () => {
  assert.deepEqual(findTool(k('spatula'), carry(MULTITOOL), [MULTITOOL, k('spatula')]), { id: k('spatula'), inHand: true });
  assert.deepEqual(findTool(null, carry(k('spatula')), [MULTITOOL, k('spatula')]), { id: k('spatula'), inHand: false });
  assert.equal(findTool(k('bun'), NO_CARRY, [MULTITOOL]), null);
});
test('grill: cooked patty comes off with the multitool in the inventory, even while holding lettuce', () => {
  const s = { item: RAW, ticks: COOKED_AT };
  assert.deepEqual(grillInteract(s, k('lettuce'), carry(MULTITOOL)), { state: INITIAL.grill, give: k('cooked_patty') });
  assert.deepEqual(grillInteract(s, null, carry(k('spatula'))), { state: INITIAL.grill, give: k('cooked_patty') });
  assert.deepEqual(grillInteract(s, null, NO_CARRY), { state: s, hint: 'kochmod.hint.need_multitool' });
  assert.deepEqual(grillInteract(s, RAW, carry(MULTITOOL)), { state: s, hint: 'kochmod.hint.grill_full' });
});
test('board: an empty hand with the multitool in the inventory cuts, without it takes the item back', () => {
  assert.deepEqual(boardInteract({ item: k('tomato') }, null, carry(MULTITOOL)), { state: { item: k('tomato_slices') }, sound: 'kochmod.chop' });
  assert.deepEqual(boardInteract({ item: k('tomato') }, null, NO_CARRY), { state: { item: null }, give: k('tomato') });
  assert.deepEqual(boardInteract({ item: k('tomato_slices') }, null, carry(MULTITOOL)), { state: { item: null }, give: k('tomato_slices') });
});
test('spit: cooked meat is cut with the multitool from the inventory', () => {
  const s = { meat: true, ticks: COOKED_AT, slices: SPIT_SLICES };
  assert.deepEqual(spitInteract(s, null, carry(MULTITOOL)), { state: { ...s, slices: SPIT_SLICES - 1 }, give: k('doner_meat') });
});
test('pot: a bowl from the inventory scoops and is consumed; a held ingredient still goes in', () => {
  const s = { items: [k('rice')], ticks: COOKED_AT };
  assert.deepEqual(potInteract(s, null, carry(k('bowl'))), { state: INITIAL.pot, consume: k('bowl'), give: k('cooked_rice') });
  assert.deepEqual(potInteract(s, k('bowl'), NO_CARRY), { state: INITIAL.pot, take: true, give: k('cooked_rice') });
  assert.deepEqual(potInteract({ items: [k('rice')], ticks: 0 }, k('egg'), carry(k('bowl'))), { state: { items: [k('rice'), k('egg')], ticks: 0 }, take: true, sound: 'kochmod.bubble' });
});
test('wok: the multitool from the inventory scoops and stays', () => {
  const s = { items: [k('noodles')], ticks: COOKED_AT };
  assert.deepEqual(wokInteract(s, null, carry(MULTITOOL)), { state: INITIAL.wok, give: FAILED });
});
```
`tests/station-flow.test.js`: bestehende `interactStation`-Aufrufe um `NO_CARRY` ergänzen; ein Test, dass `carried` an `interact` durchgereicht wird.

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** wie unter Interfaces/Regeln. `noFields`-Helfer in den Tests um `consume` erweitern.
- [ ] **Step 4: `npm test && npm run typecheck`** grün.
- [ ] **Step 5: Commit** — `feat: stations find their tool in the player's inventory`

---

### Task 3: Welt-Anbindung des Inventar-Werkzeugs

**Files:**
- Modify: `packs/BP/scripts/world/stations.js` (StationDef-Typ `interact(state, held, carried)`; `onPlayerInteract` übergibt `(id) => playerHasItem(player, id)`)
- Modify: `packs/BP/scripts/world/effects.js` (`applyResult`: `if (result.consume) removeOneItem(player, result.consume)`)
- Modify: `packs/BP/scripts/world/furniture.js` (Tisch-Aufruf von `interactStation` mit `NO_CARRY`)
- Modify: `docs/kochbuch.md` (Tabelle „Die Küche“: Werkzeugspalte → Multitool, Hinweis „muss nur im Inventar sein“; Faustregeln)

- [ ] **Step 1: Implement** (keine neue Logik, nur Durchreichen). `playerHasItem` existiert bereits in `effects.js`.
- [ ] **Step 2: `npm run typecheck && npm test`** grün.
- [ ] **Step 3: `npm run build`** erzeugt das Paket ohne Fehler.
- [ ] **Step 4: Commit** — `feat: world passes the inventory to the stations; cookbook names the multitool`

---

### Task 4: Gekochter Reis als Zutat, Kisten-Zuordnung

**Files:**
- Modify: `packs/BP/scripts/logic/catalog.js` (Reihenfolge und `source` der Zutaten)
- Modify: `packs/BP/scripts/logic/recipes.js` (RECIPES ohne doppelte Gerichte)
- Modify: `docs/kochbuch.md` (Kühlschrank/Vorratsschrank-Zeilen, Sushi-Schritte)
- Test: `tests/catalog.test.js`, `tests/crates.test.js`, `tests/processes.test.js`, `tests/recipes.test.js`, `tests/recipe-book.test.js`

**Interfaces:**
- Katalog: `cooked_rice: { kind: 'ingredient', source: 'pantry', stack: 64 }`; `rice: { kind: 'ingredient', stack: 64, menu: false }` (kein `source`); `potato`, `onion`, `carrot` → `source: 'pantry'`; `dough`, `doner_sauce` → `source: 'fridge'`. Kühlschrank-Reihenfolge: tomato, lettuce, raw_patty, cheese, salami, egg, salmon, cream, spring_onion, doner_meat_raw, dough, doner_sauce (12). Vorratsschrank: bun, potato, onion, carrot, tomato_sauce, noodles, cooked_rice, broth, nori, pita, soy_sauce (11).
- `recipes.js`: `RECIPES` behält pro Gericht nur den ersten Eintrag (`dedupeByDish`), damit Legacy-Rezepte (Task 9) `DISHES` nicht verdoppeln.

- [ ] **Step 1: Failing tests**
```js
// catalog.test.js
test('fridge and pantry after stage 3: vegetables and cooked rice are dry goods, dough and doner sauce are cold', () => {
  assert.deepEqual(itemsFrom('fridge').map(short), ['tomato', 'lettuce', 'raw_patty', 'cheese', 'salami', 'egg', 'salmon', 'cream', 'spring_onion', 'doner_meat_raw', 'dough', 'doner_sauce']);
  assert.deepEqual(itemsFrom('pantry').map(short), ['bun', 'potato', 'onion', 'carrot', 'tomato_sauce', 'noodles', 'cooked_rice', 'broth', 'nori', 'pita', 'soy_sauce']);
  assert.deepEqual(ITEMS[k('rice')], { kind: 'ingredient', stack: 64, menu: false });
});
// processes.test.js
test('sushi steps: cut the salmon, then the counter; the rice comes cooked from the pantry', () => {
  assert.deepEqual(stepsFor(k('sushi')).map((s) => s.station), ['cutting_board', 'counter']);
  assert.deepEqual(stationsFor(k('sushi')), ['cutting_board', 'counter']);
});
// recipes.test.js
test('RECIPES lists every dish once even when a dish has a legacy recipe', () => {
  assert.equal(new Set(DISHES).size, DISHES.length);
});
```
`crates.test.js` „fridge holds the cold ingredients, pantry the dry goods“ auf die neuen Listen umschreiben; `recipe-book.test.js` Sushi-Seite: Schritt „Gekochter Reis ➜ Vorratsschrank“ statt Topf-Schritt. `layout.test.js` MENUS: Sushi fällt bei `italian`/`japanese` nicht weg, kommt aber in `burger` und `doner` dazu (Schneidebrett + Anrichte) – diese Zwischenstufe wird in Task 8 durch die Küchenregel wieder eingefangen; hier die MENUS entsprechend anpassen.

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** Kochbuch: Sushi-Anleitung ohne Reis kochen; Kistentabellen anpassen.
- [ ] **Step 4: `npm test && npm run typecheck`** grün.
- [ ] **Step 5: Commit** — `feat: cooked rice from the pantry; vegetables dry, dough and doner sauce cold`

---

### Task 5: Suppenschüssel, schmutzige Schüssel, Pizzakarton als Items

**Files:**
- Modify: `packs/BP/scripts/logic/catalog.js`, `packs/BP/scripts/logic/processes.js` (POT_DEF)
- Create: `packs/BP/items/soup_bowl.json`, `packs/BP/items/dirty_bowl.json`, `packs/BP/items/pizza_box.json`
- Modify: `tools/sprites/items.js` (drei Sprites: `soup_bowl` = die bisherige `bowl`-Form hell, `dirty_bowl` mit braunen Schlieren wie `dirty_plate`, `pizza_box` flacher Karton mit Pizza-Aufdruck), Lang-Dateien
- Test: `tests/catalog.test.js`, `tests/processes.test.js`, `tests/stations.test.js`, `tests/sprites.test.js`

**Interfaces:**
- `catalog.js`: `export const SOUP_BOWL = 'kochmod:soup_bowl'`, `DIRTY_BOWL = 'kochmod:dirty_bowl'`, `PIZZA_BOX = 'kochmod:pizza_box'`. Katalog: `soup_bowl: { kind: 'plate', stack: 64 }`, `dirty_bowl: { kind: 'plate', stack: 64, menu: false }`, `pizza_box: { kind: 'plate', stack: 64 }`; `bowl: { kind: 'tool', stack: 1, menu: false }` (kein `source`).
- `processes.js`: `POT_DEF.tool = SOUP_BOWL`, `POT_DEF.tools = [SOUP_BOWL, 'kochmod:bowl']`, `POT_DEF.hints.needTool = 'kochmod.hint.need_soup_bowl'`.
- Item-JSON: Stack 16 wie `clean_plate.json`; Lang: `Suppenschüssel`, `Schmutzige Schüssel`, `Pizzakarton`; Hint `kochmod.hint.need_soup_bowl=Hol eine Suppenschüssel aus dem Geschirrschrank.`

- [ ] **Step 1: Failing tests**
```js
// processes.test.js
test('pot def: soup bowl (consumed), the old bowl still works, hint names the soup bowl', () => {
  assert.equal(POT_DEF.tool, SOUP_BOWL);
  assert.deepEqual(POT_DEF.tools, [SOUP_BOWL, k('bowl')]);
  assert.equal(POT_DEF.consumesTool, true);
  assert.equal(POT_DEF.hints.needTool, 'kochmod.hint.need_soup_bowl');
});
// stations.test.js
test('pot: scoops with the soup bowl from hand or inventory and with the old bowl', () => {
  const s = { items: [k('potato_cubes'), k('carrot_slices'), k('cream')], ticks: COOKED_AT };
  assert.deepEqual(potInteract(s, SOUP_BOWL, NO_CARRY), { state: INITIAL.pot, take: true, give: k('potato_soup') });
  assert.deepEqual(potInteract(s, null, carry(SOUP_BOWL)), { state: INITIAL.pot, consume: SOUP_BOWL, give: k('potato_soup') });
  assert.deepEqual(potInteract(s, null, carry(k('bowl'))), { state: INITIAL.pot, consume: k('bowl'), give: k('potato_soup') });
});
```
`catalog.test.js` „tools and Baukästen stack to 1“ bleibt gültig (Teller-Kind stackt 64); Werkzeugkisten-Erwartung aus Task 1 unverändert.

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: `npm run textures && npm test && npm run typecheck`** grün.
- [ ] **Step 5: Commit** — `feat: soup bowl, dirty bowl and pizza box items; the pot scoops into the soup bowl`

---

### Task 6: Geschirrschrank mit Menü, Spülmaschine für Teller und Schüsseln

**Files:**
- Modify: `packs/BP/scripts/logic/stations.js` (CabinetState, DishwasherState, Menü-Funktionen, Migration)
- Modify: `packs/BP/scripts/world/stations.js` (Schrank öffnet ein Formular), `packs/BP/scripts/world/effects.js` (`gives`)
- Modify: `tools/sprites/items.js` (keine neuen Sprites nötig: Menü-Icons sind die Item-Texturen), Lang-Dateien
- Test: `tests/stations.test.js`, `tests/sync.test.js` (Icons des Schrankmenüs existieren)

**Interfaces:**
- `/** @typedef {{ plates: number, bowls: number }} CabinetState */`, `INITIAL.cabinet = { plates: CABINET_MAX, bowls: CABINET_MAX }`.
- `/** @typedef {{ plates: number, bowls: number, ticks: number }} DishwasherState */`, `INITIAL.dishwasher = { plates: 0, bowls: 0, ticks: 0 }`. `DISHWASHER_MAX = 4` gilt für `plates + bowls`.
- `Result<S>` bekommt `gives?: { item: string, count: number }[]` (mehrere Stapel auf einmal).
- `/** @typedef {'plate' | 'bowl' | 'box'} CabinetChoice */`
- `export const CABINET_CHOICES = /** @type {const} */ (['plate', 'bowl', 'box'])`
- `export function cabinetMenu(state)` → `{ title: 'kochmod.crate.cabinet', buttons: { choice: CabinetChoice, label: RawMessage, icon: string }[] }` — drei Buttons in CABINET_CHOICES-Reihenfolge; Label `{ rawtext: [{ translate: 'item.kochmod:clean_plate' }, { text: ' (3)' }] }` mit der Anzahl bei Teller und Schüssel, der Karton ohne Zahl; Icons `textures/items/clean_plate`, `textures/items/soup_bowl`, `textures/items/pizza_box`.
- `export function cabinetTake(state, choice)` → `Result<CabinetState>`: `plate` → `give: ID.cleanPlate` und `plates - 1`, bei 0 `hint: 'kochmod.hint.cabinet_empty'`; `bowl` → `give: SOUP_BOWL`, bei 0 `hint: 'kochmod.hint.cabinet_no_bowls'`; `box` → `give: PIZZA_BOX`, Zustand unverändert.
- `cabinetInteract(state, held, carried)`: `held === ID.cleanPlate` → einräumen (wie bisher, Hinweis `cabinet_full`); `held === SOUP_BOWL` → `bowls + 1` (max CABINET_MAX, `cabinet_full`); `held === null` → `{ state, menu: true }` (neues optionales Result-Feld `menu?: boolean`, nur der Schrank nutzt es); alles andere `{ state }`.
- `cabinetView(state)` → `state.plates` (unverändert), `cabinetDrops(state)` → Teller und Schüsseln.
- `dishwasherInteract`: `held === ID.dirtyPlate` oder `DIRTY_BOWL` → einlegen, `plates + bowls >= DISHWASHER_MAX` → `dishwasher_full`; leere Hand fertig → `gives: [{ item: cleanPlate, count: plates }, { item: SOUP_BOWL, count: bowls }]` ohne leere Einträge, Zustand `INITIAL.dishwasher`. `dishwasherView`/`dishwasherTick`: `plates + bowls` statt `plates`. `dishwasherDrops`: schmutzige/saubere Teller und Schüsseln je nach View.
- Migration: `VALID.cabinet = isCount(plates) && isCount(bowls)`; ein Record mit nur `plates` → `{ plates, bowls: CABINET_MAX }`. `VALID.dishwasher` verlangt `bowls`; ein Record mit `plates`+`ticks` ohne `bowls` → `{ plates, bowls: 0, ticks }`.
- Welt (`world/stations.js`): Der Schrank bekommt eine eigene Komponente: `onPlayerInteract` ruft `cabinetInteract`; bei `result.menu` wird in `system.run` ein `ActionFormData` aus `cabinetMenu(state)` gezeigt (Muster `openCrate` in `world/crates.js`, inklusive `shouldRetryBusy`), die Auswahl läuft über `interactStation((s) => cabinetTake(s, choice), …)` mit frisch geladenem Zustand. `applyResult` verarbeitet `gives` (jeden Stapel per `give`).
- Lang: `kochmod.crate.cabinet=Geschirrschrank`, `kochmod.hint.cabinet_no_bowls=Keine sauberen Schüsseln mehr. Spül die schmutzigen!`

- [ ] **Step 1: Failing tests** (`tests/stations.test.js`):
```js
test('cabinet: empty hand opens the menu; the menu lists plate, bowl and box with counts', () => {
  assert.deepEqual(cabinetInteract(INITIAL.cabinet, null), { state: INITIAL.cabinet, menu: true });
  const m = cabinetMenu({ plates: 3, bowls: 0 });
  assert.deepEqual(m.buttons.map((b) => b.choice), ['plate', 'bowl', 'box']);
  assert.deepEqual(m.buttons[0].label, { rawtext: [{ translate: 'item.kochmod:clean_plate' }, { text: ' (3)' }] });
  assert.deepEqual(m.buttons[2].label, { translate: 'item.kochmod:pizza_box' });
  assert.deepEqual(m.buttons.map((b) => b.icon), ['textures/items/clean_plate', 'textures/items/soup_bowl', 'textures/items/pizza_box']);
});
test('cabinet: taking plates, bowls and boxes', () => {
  assert.deepEqual(cabinetTake({ plates: 1, bowls: 2 }, 'plate'), { state: { plates: 0, bowls: 2 }, give: k('clean_plate') });
  assert.deepEqual(cabinetTake({ plates: 0, bowls: 2 }, 'plate'), { state: { plates: 0, bowls: 2 }, hint: 'kochmod.hint.cabinet_empty' });
  assert.deepEqual(cabinetTake({ plates: 0, bowls: 0 }, 'bowl'), { state: { plates: 0, bowls: 0 }, hint: 'kochmod.hint.cabinet_no_bowls' });
  assert.deepEqual(cabinetTake({ plates: 0, bowls: 0 }, 'box'), { state: { plates: 0, bowls: 0 }, give: PIZZA_BOX });
  assert.deepEqual(cabinetInteract({ plates: 8, bowls: 7 }, SOUP_BOWL), { state: { plates: 8, bowls: 8 }, take: true, sound: 'kochmod.plate' });
});
test('cabinet and dishwasher: old saves load with full bowls / no bowls', () => {
  assert.deepEqual(migrateStationState('cabinet', { plates: 3 }), { plates: 3, bowls: CABINET_MAX });
  assert.deepEqual(migrateStationState('dishwasher', { plates: 2, ticks: 50 }), { plates: 2, bowls: 0, ticks: 50 });
});
test('dishwasher: plates and bowls share the four slots and come back sorted', () => {
  let s = dishwasherInteract(INITIAL.dishwasher, k('dirty_plate')).state;
  s = dishwasherInteract(s, DIRTY_BOWL).state;
  assert.deepEqual(s, { plates: 1, bowls: 1, ticks: 0 });
  const done = dishwasherTick(s, WASH_TICKS);
  assert.deepEqual(dishwasherInteract(done, null), { state: INITIAL.dishwasher, gives: [{ item: k('clean_plate'), count: 1 }, { item: SOUP_BOWL, count: 1 }] });
  assert.deepEqual(dishwasherDrops(done), [k('clean_plate'), SOUP_BOWL]);
});
```
Bestehende Schrank-/Spülmaschinen-Tests an die neuen Zustandsformen anpassen (`bowls: 0` bzw. `bowls: 8`).

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** Logik, dann Welt-Formular, `gives` in `applyResult`. `tests/layout.test.js` „the dish cabinet starts with 8 plates“ bleibt (plates = 8).
- [ ] **Step 4: `npm test && npm run typecheck && npm run build`** grün.
- [ ] **Step 5: Commit** — `feat: dish cabinet menu with plates, soup bowls and pizza boxes; dishwasher washes bowls`

---

### Task 7: Suppen ohne Teller, schmutzige Schüssel am Tisch

**Files:**
- Modify: `packs/BP/scripts/logic/restaurant.js` (`tableInteract`, `tableView`, `servedIn`, `leftover`)
- Modify: `packs/BP/scripts/logic/guest-flow.js` (nach dem Essen `leftover(served)` statt `'empty'`; `DISH_PLATES` unverändert)
- Modify: `packs/BP/scripts/world/furniture.js` (Teller-Prüfung nur bei Tellergerichten)
- Modify: `docs/kochbuch.md` (Servieren: Suppen kommen in der Schüssel)
- Test: `tests/restaurant.test.js`, `tests/guest-flow.test.js`

**Interfaces:**
- `export const EMPTY_BOWL = 'empty_bowl'` (Tisch-Zustand nach einer Suppe).
- `export function servedIn(dishId)` → `'plate' | 'bowl'`: `'bowl'` für jedes Gericht aus `POT` (Ramen, Kartoffelsuppe), sonst `'plate'`.
- `export function leftover(dishId)` → `'empty' | 'empty_bowl'`.
- `tableInteract(state, held, guestWaiting, hasPlate)`: Suppengericht braucht kein `hasPlate` und setzt `consumePlate: false`; Zustand `'empty'` + Klick ohne Servieren → `give: DIRTY_PLATE` (wie bisher), Zustand `EMPTY_BOWL` → `give: DIRTY_BOWL`; beides räumt den Tisch (`plate: 'none'`).
- `tableView(EMPTY_BOWL)` → `'empty'` (gleiche Blockansicht wie der leere Teller).
- `guest-flow.js` Essen fertig: `io.setPlate(table, leftover(d.served))`.
- `furniture.js`: `hasPlate` wird weiter berechnet; die Logik entscheidet, ob sie zählt. `consumePlate` entfernt weiter `CLEAN_PLATE`.

- [ ] **Step 1: Failing tests**
```js
// restaurant.test.js
test('servedIn / leftover: soups come in the bowl, everything else on the plate', () => {
  assert.equal(servedIn(k('ramen')), 'bowl');
  assert.equal(servedIn(k('potato_soup')), 'bowl');
  assert.equal(servedIn(k('hamburger')), 'plate');
  assert.equal(leftover(k('ramen')), EMPTY_BOWL);
  assert.equal(leftover(k('hamburger')), 'empty');
  assert.equal(tableView(EMPTY_BOWL), 'empty');
});
test('tableInteract: a soup is served without a plate; the empty bowl comes back dirty', () => {
  assert.deepEqual(tableInteract({ plate: 'none' }, k('ramen'), true, false), { state: { plate: 'ramen' }, take: true, serve: k('ramen'), sound: 'kochmod.plate', consumePlate: false });
  assert.deepEqual(tableInteract({ plate: EMPTY_BOWL }, null, false, false), { state: { plate: 'none' }, give: DIRTY_BOWL });
  assert.deepEqual(tableInteract({ plate: 'empty' }, null, false, false), { state: { plate: 'none' }, give: DIRTY_PLATE });
});
// guest-flow.test.js
test('after a soup the table keeps an empty bowl, after a burger an empty plate', ...) // serve ramen, tick EAT_TICKS, assert plates[TABLE_KEY] === 'empty_bowl'
```
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: `npm test && npm run typecheck`** grün.
- [ ] **Step 5: Commit** — `feat: soups are served in the bowl and leave a dirty bowl on the table`

---

### Task 8: Küchen und großzügige Gäste

**Files:**
- Modify: `packs/BP/scripts/logic/restaurant.js` (CUISINES, offeredCuisines, availableDishes, rate)
- Modify: `packs/BP/scripts/logic/guest-flow.js` (`kindsNear`, Bewertung mit angebotenen Küchen)
- Modify: `docs/kochbuch.md` (Abschnitt „Welches Restaurant kann was?“: Küchenregel, neue Tabelle, Smaragd-Regel)
- Test: `tests/restaurant.test.js`, `tests/guest-flow.test.js`, `tests/layout.test.js` (MENUS)

**Interfaces:**
- `/** @typedef {'burger' | 'italian' | 'japanese' | 'doner' | 'classic'} Cuisine */`
- `export const CUISINES = /** @type {Record<Cuisine, { station: string, dishes: string[] }>} */ ({ burger: { station: 'grill', dishes: [hamburger, cheeseburger] }, italian: { station: 'oven', dishes: [pizza_margherita, salami_pizza] }, japanese: { station: 'wok', dishes: [sushi, ramen, fried_noodles] }, doner: { station: 'spit', dishes: [doner] }, classic: { station: 'pot', dishes: [potato_soup] } })` — `station` ist das Kennzeichen-Gerät der Küche. (Pommes kommen in Task 9 zu `burger` und `doner` dazu.)
- `export function cuisinesOf(dishId)` → `Cuisine[]`.
- `export function offeredCuisines(kinds: Set<string>)` → `Set<Cuisine>`: jede Küche, deren `station` in `kinds` liegt.
- `availableDishes(kinds)` → kochbare Gerichte (wie bisher), **zusätzlich** gefiltert auf Gerichte, von denen mindestens eine Küche angeboten wird.
- `rate(wish, served, offered: Set<Cuisine>, rnd)` → `{ happy, emeralds }`: `served === FAILED` → `{ false, 0 }`; `served === wish` → `{ true, 1 + floor(rnd*3) }`; `cuisinesOf(served).some((c) => offered.has(c))` → `{ true, 1 }`; sonst `{ false, 0 }`.
- `guest-flow.js`: `export function kindsNear(bellKey, io)` → `Set<string>` (aus `assess` herausgelöst: Stationen aus `STATION_KINDS`, deren Registry-Eintrag in Reichweite liegt). Beim Essen fertig: `rate(d.wish, d.served, offeredCuisines(kindsNear(d.bell, io)), rnd)`.
- `tests/layout.test.js`: `MENUS` neu: burger → hamburger, cheeseburger; italian → pizza_margherita, salami_pizza, potato_soup; japanese → sushi, ramen, potato_soup, fried_noodles; doner → doner; classic/mega → DISHES. Der Test „the expected menus follow from RECIPES and the theme table“ ruft `availableDishes(new Set(devices))`.

- [ ] **Step 1: Failing tests**
```js
// restaurant.test.js
test('offeredCuisines follows the signature stations', () => {
  assert.deepEqual([...offeredCuisines(new Set(['grill', 'cutting_board', 'counter']))], ['burger']);
  assert.deepEqual([...offeredCuisines(new Set(['oven', 'pot', 'cutting_board', 'counter']))], ['italian', 'classic']);
  assert.deepEqual([...offeredCuisines(new Set(['cutting_board', 'counter']))], []);
});
test('availableDishes: cookable and of an offered cuisine (sushi needs the wok nearby to be wished)', () => {
  assert.deepEqual(availableDishes(new Set(['grill', 'cutting_board', 'counter'])), [HAM, CHEESE]);
  assert.deepEqual(availableDishes(new Set(['pot', 'wok', 'cutting_board', 'counter'])), [k('sushi'), k('ramen'), k('potato_soup'), k('fried_noodles')]);
});
test('rate: wish 1-3, another dish of an offered cuisine 1, foreign cuisine or failed 0', () => {
  const burger = new Set(['burger']);
  assert.deepEqual(rate(HAM, HAM, burger, () => 0.999), { happy: true, emeralds: 3 });
  assert.deepEqual(rate(HAM, CHEESE, burger, () => 0.5), { happy: true, emeralds: 1 });
  assert.deepEqual(rate(HAM, k('sushi'), burger, () => 0.5), { happy: false, emeralds: 0 });
  assert.deepEqual(rate(HAM, FAILED, burger, () => 0.5), { happy: false, emeralds: 0 });
  assert.deepEqual(rate(HAM, CHEESE, new Set(), () => 0.5), { happy: false, emeralds: 0 });
});
// guest-flow.test.js
test('a cheeseburger for a hamburger wish pays one emerald; after the grill is gone it pays nothing', ...)
// fakeWorld, serve CHEESE to a HAM wish, tick EAT_TICKS → payout 1; second run with registries.grill = [] after spawning → no payout, react false
```
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** Kochbuch-Tabelle und Regeltext („Der Gast nimmt jedes Gericht, das zu seiner Küche passt…“).
- [ ] **Step 4: `npm test && npm run typecheck`** grün.
- [ ] **Step 5: Commit** — `feat: guests accept any dish of an offered cuisine; cuisines follow the signature stations`

---

### Task 9: Pommes, Kartoffelstifte, Fritteusen-Regeln

**Files:**
- Modify: `packs/BP/scripts/logic/catalog.js`, `packs/BP/scripts/logic/processes.js`, `packs/BP/scripts/logic/restaurant.js` (CUISINES)
- Create: `packs/BP/items/potato_sticks.json`, `packs/BP/items/fries.json`, `packs/BP/items/burnt_fries.json`
- Modify: `tools/sprites/items.js` (Sprites `potato_sticks`, `fries`, `burnt_fries`), `tools/sprites/entity.js` (Region `bubble_fries`, Zeichnung), `tools/geometry.js` (`guestModel` Wunschliste um `fries`), `packs/RP/render_controllers/guest.render_controllers.json`, `packs/BP/entities/guest.json` (Wish-Enum), Lang-Dateien
- Test: `tests/catalog.test.js`, `tests/processes.test.js`, `tests/recipes.test.js`, `tests/stations.test.js`, `tests/packs.test.js` (Wish-Enum folgt DISHES: läuft automatisch)

**Interfaces:**
- Katalog: `potato_sticks: { kind: 'prepared', stack: 64 }`, `potato_cubes: { kind: 'prepared', stack: 64, menu: false }`, `fries: { kind: 'dish', stack: 64 }` (nach `salami_pizza`, damit die Reihenfolge Grill/Ofen-Gerichte zusammenhält), `burnt_fries: { kind: 'prepared', stack: 64 }`.
- `CUTTABLE['kochmod:potato'] = 'kochmod:potato_sticks'`.
- `POT`: `potato_soup` mit `potato_sticks` (erster Eintrag), danach ein zweiter `potato_soup`-Eintrag mit `potato_cubes` (Legacy; `RECIPES` dedupliziert, `evaluateFor` trifft beide).
- `TIMED.fryer = { accepts: { 'kochmod:potato_sticks': { cooked: 'kochmod:fries', burnt: 'kochmod:burnt_fries' } }, tool: MULTITOOL, tools: [MULTITOOL], hintTool: 'kochmod.hint.need_multitool', hintFull: 'kochmod.hint.fryer_full', sound: 'kochmod.sizzle' }`.
- `stations.js`: `export const fryer = timedStation(TIMED.fryer)`, `INITIAL.fryer`, `VALID.fryer = validTimed`.
- `CUISINES.burger.dishes` und `CUISINES.doner.dishes` enthalten `kochmod:fries`.
- Gast: `GUEST_TEXTURE` auf `{ width: 160, height: 64 }`; `guestLayout.bubble_fries = [128, 0, 20, 20]`; `drawBubble(p, L.bubble_fries, items.fries)`; Wunschliste in `guestModel` um `'fries'`; Render-Controller-Zeile `bubble_fries`; Enum-Wert `fries` in `guest.json`.
- Lang: `Kartoffelstifte`, `Pommes`, `Verbrannte Pommes`, `kochmod.hint.fryer_full=Die Fritteuse ist voll.`

- [ ] **Step 1: Failing tests**
```js
// processes.test.js
test('the potato is cut into sticks; the soup takes sticks (cubes still work); fries come from the fryer', () => {
  assert.equal(CUTTABLE[k('potato')], k('potato_sticks'));
  assert.deepEqual(stepsFor(k('fries')).map((s) => s.station), ['cutting_board', 'fryer']);
  assert.deepEqual(stepsFor(k('potato_soup')).map((s) => s.item), [k('potato'), k('carrot'), k('potato_soup')]);
  assert.equal(TIMED.fryer.accepts[k('potato_sticks')].cooked, k('fries'));
});
// recipes.test.js
test('potato soup from sticks or from legacy cubes', () => {
  assert.equal(evaluateFor(POT, [k('potato_sticks'), k('carrot_slices'), k('cream')]), k('potato_soup'));
  assert.equal(evaluateFor(POT, [k('potato_cubes'), k('carrot_slices'), k('cream')]), k('potato_soup'));
  assert.equal(DISHES.filter((d) => d === k('potato_soup')).length, 1);
});
// stations.test.js
test('fryer: sticks in, fries out with the multitool, burnt after BURNT_AT', () => {
  const s = fryer.interact(INITIAL.fryer, k('potato_sticks')).state;
  assert.deepEqual(fryer.interact(fryer.tick(s, COOKED_AT), null, carry(MULTITOOL)).give, k('fries'));
  assert.deepEqual(fryer.interact(fryer.tick(s, BURNT_AT), null, carry(MULTITOOL)).give, k('burnt_fries'));
});
// restaurant.test.js
test('fries belong to the burger and the doner cuisine', () => { assert.deepEqual(cuisinesOf(k('fries')), ['burger', 'doner']); });
```
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** Bestehende Tests mit `potato_cubes` in Suppenschritten auf `potato_sticks` umstellen (`processes.test.js` „potato soup steps“, `recipe-book.test.js`).
- [ ] **Step 4: `npm run textures && npm test && npm run typecheck`** grün (Block `fryer` fehlt noch: `tests/sync.test.js` „every station kind … is a block“ schlägt fehl, bis Task 10 fertig ist; beide Tasks daher ohne Zwischen-Commit oder Task 10 direkt anschließen).
- [ ] **Step 5: Commit** zusammen mit Task 10.

---

### Task 10: Fritteusen-Block, Bausätze, Kochbuch

**Files:**
- Create: `packs/BP/blocks/fryer.json` (Muster `grill.json`: States `kochmod:content` empty/raw/cooked/burnt, Komponente `kochmod:fryer`, Textur `kochmod_fryer`, Kollision innerhalb des Blocks, `map_color` Edelstahl-Grau)
- Modify: `tools/sprites/blocks.js` (`layouts.fryer`, `drawFryer`, Export `fryer`), `tools/geometry.js` (`models.fryer`: Edelstahlkasten 16×12×16 mit zwei Körben; Bones `basket_raw`, `basket_cooked`, `basket_burnt`, `oil`; nichts über 23 px), `tools/sprites/icons.js` (`block_fryer`), `packs/RP/blocks.json` (`"kochmod:fryer": { "sound": "metal" }`)
- Modify: `packs/BP/scripts/logic/crates.js` (`ALL_BLOCKS` nach `wok`: `'fryer'`), `packs/BP/scripts/world/stations.js` (`const fryer = cookingDef('fryer', fryerStation)`, in `COOKING` und `BY_TYPE`)
- Modify: `packs/BP/scripts/logic/layout.js`: `trashCanAtWall(p, z)` wird zu `deviceAtWall(p, id, z)` (`p.put(1, 1, z, \`kochmod:${id}\`)`); Burger-Küche `['fridge', 'pantry', 'grill', 'fryer', 'cutting_board', 'counter', 'dishwasher', 'dish_cabinet', 'trash_can']` (x0 = 2); Döner: `deviceAtWall(p, 'fryer', 7)` zusätzlich zum Mülleimer bei z = 6; Classic: `deviceAtWall(p, 'fryer', 7)` (die Reihe bleibt `FULL_KITCHEN`, x = 12 bleibt frei); Mega: `kitchenRow(p, [...FULL_KITCHEN, 'fryer', 'trash_can'], { z: 12, x0: 1 })`; Pizzeria und Sushi-Bar unverändert.
- Modify: `tests/layout.test.js` (`ALL_DEVICES` + `fryer`; THEME_TABLE devices burger/doner + `fryer`; Test „the doner spit stands … the trash can stands at the left wall“ um die Fritteuse bei (1, 1, 7) ergänzen; „exactly one of each station“ zählt die Fritteuse mit), `tests/packs.test.js` (Test „fryer: content states, one basket bone per stage, nothing above 23 px, collision within the block“ nach dem Muster des Ofen-Tests; „fryer: name, hints and sound exist“)
- Modify: Lang `tile.kochmod:fryer.name=Fritteuse` / `Deep Fryer`; `docs/kochbuch.md` (Küche-Tabelle: Fritteuse; Abschnitt „Pommes“ mit Schritten: Kartoffel → Schneidebrett → Fritteuse → Teller; Restaurant-Tabelle: Pommes bei Burger-Laden und Döner-Imbiss)

- [ ] **Step 1: Failing tests** (`packs.test.js` Fritteusen-Tests, `layout.test.js` Anpassungen, `sync.test.js` läuft von selbst).
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** Sprite-Layout, Modell, Block-JSON, Welt-Registrierung, Bausätze, Kochbuch.
- [ ] **Step 4: `npm run textures && npm test && npm run typecheck && npm run build`** grün.
- [ ] **Step 5: Commit** — `feat: fries from the deep fryer; fryer in the burger, doner, classic and mega kitchens`

---

### Task 11: Gast-Entity für Mitnahme (Property, Lauf-Symbol, Handle)

**Files:**
- Modify: `packs/BP/entities/guest.json` (Property `kochmod:takeaway` bool, default false, client_sync; Event `kochmod:stay`: entfernt `kochmod:walking`, fügt `kochmod:seated` hinzu)
- Modify: `tools/sprites/entity.js` (Region `run_symbol: [128, 20, 12, 12]`; Zeichnung: weißes Schild mit einem laufenden Strichmännchen in `C.outline`), `tools/geometry.js` (`guestModel`: Bone `run`, parent `root`, pivot `[0, 40, 0]`, ein Quad `box([-15, 36, -0.05], [10, 10, 0.1], 'run_symbol', 'run_symbol', 'bubble_edge', 'bubble_edge')` links oberhalb des Kopfes)
- Modify: `packs/RP/render_controllers/guest.render_controllers.json` (`{ "run": "q.property('kochmod:takeaway')" }`)
- Modify: `packs/BP/scripts/logic/guest-flow.js` (`Look` um `takeaway?: boolean`; `Guest` um `stay(): void` und `pay(emeralds: number): void`)
- Modify: `packs/BP/scripts/world/guests.js` (`guestHandle`: `stay()` → `entity.triggerEvent('kochmod:stay')`; `pay(n)` → Smaragde an `entity.location` spawnen)
- Test: `tests/packs.test.js` („guest: takeaway property and run bone“: Property vorhanden, Bone `run` in `guest.geo.json`, Render-Controller-Zeile vorhanden), `tests/guest-pack.test.js` falls dort die Entity geprüft wird
- Test-Fake in `tests/guest-flow.test.js`: `stay`, `pay` loggen.

- [ ] **Step 1: Failing test** in `packs.test.js`:
```js
test('guest: takeaway property, run bone and render line', () => {
  const guest = JSON.parse(fs.readFileSync(path.join(BP, 'entities', 'guest.json'), 'utf8'))['minecraft:entity'];
  assert.deepEqual(guest.description.properties['kochmod:takeaway'], { type: 'bool', default: false, client_sync: true });
  assert.ok(guest.events['kochmod:stay']);
  const geo = JSON.parse(fs.readFileSync(path.join(root, 'packs/RP/models/entity/guest.geo.json'), 'utf8'))['minecraft:geometry'][0];
  assert.ok(geo.bones.some((b) => b.name === 'run'));
  const rc = JSON.parse(fs.readFileSync(path.join(root, 'packs/RP/render_controllers/guest.render_controllers.json'), 'utf8'));
  assert.ok(rc.render_controllers['controller.render.kochmod.guest'].part_visibility.some((p) => p.run === "q.property('kochmod:takeaway')"));
});
```
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.** `npm run textures` schreibt `guest.png` und `guest.geo.json` neu.
- [ ] **Step 4: `npm run textures && npm test && npm run typecheck`** grün.
- [ ] **Step 5: Commit** — `feat: guest entity can stand and wait for takeaway, with a run symbol`

---

### Task 12: Mitnahme-Gast im Gäste-Ablauf

**Files:**
- Modify: `packs/BP/scripts/logic/guest-flow.js`
- Modify: `packs/BP/scripts/logic/restaurant.js` (`TAKEAWAY_CHANCE = 1 / 3`, `PIZZA_DISHES = CUISINES.italian.dishes`)
- Test: `tests/guest-flow.test.js`

**Interfaces:**
- `BellState` bekommt `takeaway?: { guestId: string, missing?: number }`; `migrateBellState` liest es (unbrauchbar → weggelassen).
- `GuestData.phase` neue Werte `'takeaway_waiting'`, `'takeaway_leaving'`; `seat` und `table` sind `''`.
- `assess(...)` liefert zusätzlich `takeaway: boolean` (italienische Küche angeboten: `offeredCuisines(kinds).has('italian')`) und `pizzaWish: string | undefined` (`pickWish(availableDishes(kinds).filter((d) => PIZZA_DISHES.includes(d)), rnd)`). Die Sitzprüfung bleibt wie bisher, aber `status` ist `'ok'` auch dann, wenn nur ein Mitnahme-Gast möglich ist (`free.length === 0 && takeaway`).
- `export function wantsTakeaway(state, found, rnd)` → `boolean`: `found.takeaway && !state.takeaway && (found.free.length === 0 || rnd() < TAKEAWAY_CHANCE)`.
- Spawn-Entscheidung in `trySpawn`/`ringBell`: `wantsTakeaway` → Mitnahme-Gast; sonst nur bei `found.free.length > 0` ein Sitzgast; sonst (keine Sitze, Mitnahme-Gast wartet schon) wie bisher `RETRY_TICKS` bzw. Status `'full'`/`'no_seat'`. `found.free[0]` wird nie bei leerer Liste gelesen.
- `spawnTakeaway(bellKey, state, found, io)`: `io.spawnGuest(bellKey, { phase: 'takeaway_waiting', seat: '', table: '', bell: bellKey, timer: 0, served: '', wish: pizzaWish })`, danach `guest.stay()` und `guest.look({ takeaway: true, wish: wishLook(pizzaWish) })`; Rückgabe `{ ...state, takeaway: { guestId } }`. In `trySpawn` und `ringBell` wird zuerst `wantsTakeaway` geprüft.
- `stepTakeaway(entry, dt, io, rnd)` → `entry | null`: Gast fehlt → `missing` wie bei Sitzgästen; Phase `takeaway_leaving` zählt `timer` herunter und entfernt mit Poof; sonst bleibt der Eintrag.
- `export function serveTakeaway(guestId, held, carried, io)` → `{ take?: boolean, consume?: string, hint?: string } | null` (null: kein wartender Mitnahme-Gast mit dieser Id): `held` nicht in `PIZZA_DISHES` → `guest.react(false)`, `{ hint: 'kochmod.hint.takeaway_pizza_only' }`; Pizza ohne `carried(PIZZA_BOX)` → `{ hint: 'kochmod.hint.need_pizza_box' }`; sonst `rate(d.wish, held, new Set(['italian']), rnd)` → `guest.look({ mood, wish: 'none' })`, `guest.react(happy)`, `guest.pay(emeralds)`, `guest.update({ served: held, phase: 'takeaway_leaving', timer: LEAVE_TICKS })`, Rückgabe `{ take: true, consume: PIZZA_BOX }`. `rnd` ist ein weiterer Parameter mit Default `Math.random`.
- `releaseBell` und `sweepOrphans` berücksichtigen `takeaway.guestId`; `cleanup` für den Mitnahme-Gast entfernt nur die Entity.
- `guestAvailability` meldet `'ok'`, wenn ein Mitnahme-Gast möglich ist (die Glocke sagt dann „Ein Gast ist unterwegs!“).

- [ ] **Step 1: Failing tests** (`guest-flow.test.js`; `fakeWorld` bekommt `registries.oven` optional):
```js
test('with an oven nearby a ring may call a takeaway guest who stands at the bell with a pizza wish', () => {
  // rnd: first call picks takeaway (0.1), later calls pick the wish
  // assert bells[BELL_KEY].takeaway.guestId, guest.data().phase === 'takeaway_waiting', look.takeaway === true, log contains ['stay', id]
});
test('no second takeaway guest while one waits; a table guest still comes', ...);
test('serveTakeaway: fries are refused, a pizza without a box asks for the box, pizza plus box pays and the guest leaves', () => {
  // assert.deepEqual(serveTakeaway(id, k('fries'), NO_CARRY, io), { hint: 'kochmod.hint.takeaway_pizza_only' }) and log has ['react', id, false]
  // assert.deepEqual(serveTakeaway(id, PIZZA, NO_CARRY, io), { hint: 'kochmod.hint.need_pizza_box' })
  // assert.deepEqual(serveTakeaway(id, PIZZA, carry(PIZZA_BOX), io, () => 0), { take: true, consume: PIZZA_BOX }); log has ['pay', id, 1]
  // tickBells LEAVE_TICKS → guest removed, bells[BELL_KEY].takeaway === undefined
});
test('a takeaway guest comes even when every seat is taken', ...);
test('migrateBellState keeps a takeaway entry and drops a broken one', ...);
test('releaseBell removes the takeaway guest; sweepOrphans keeps a listed takeaway guest', ...);
```
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: `npm test && npm run typecheck`** grün.
- [ ] **Step 5: Commit** — `feat: takeaway guests wait at the bell for a boxed pizza`

---

### Task 13: Mitnahme in der Welt, Texte, Kochbuch

**Files:**
- Modify: `packs/BP/scripts/world/guests.js` (`export function onGuestInteract(player, entity)`: nur für `kochmod:guest`; ruft `serveTakeaway(entity.id, heldItemId(player), (id) => playerHasItem(player, id), io)`; Ergebnis mit `applyResult` anwenden)
- Modify: `packs/BP/scripts/world/effects.js` (`applyResult(result, player, at)` mit `at: { dimension, center(): Vector3 }` — ein Block erfüllt das bereits; für den Gast `{ dimension: entity.dimension, center: () => entity.location }`)
- Modify: `packs/BP/scripts/main.js` (`world.afterEvents.playerInteractWithEntity.subscribe(({ player, target }) => onGuestInteract(player, target))`)
- Modify: Lang (`kochmod.hint.need_pizza_box=Pack die Pizza in einen Pizzakarton aus dem Geschirrschrank!`, `kochmod.hint.takeaway_pizza_only=Dieser Gast möchte nur Pizza zum Mitnehmen.`), `docs/kochbuch.md` (Abschnitt „Pizza zum Mitnehmen“)
- Test: `tests/sync.test.js` prüft die Lang-Keys automatisch.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: `npm test && npm run typecheck && npm run build`** grün.
- [ ] **Step 3: Commit** — `feat: hand a boxed pizza to the takeaway guest`

---

### Task 14: Abschluss: Version, Testanleitung, Paket

**Files:**
- Modify: `packs/BP/manifest.json`, `packs/RP/manifest.json` (Minor-Version erhöhen, Paketname mit Version; `tests/packs.test.js` prüft Gleichheit)
- Create: `docs/test-etappe-3.md` nach dem Muster von `docs/test-etappe-2.md`: Handtest-Checkliste im Spiel (Multitool im Inventar an jeder Station, Sushi ohne Topf, Kisteninhalt, Cheeseburger auf Hamburger-Wunsch zahlt 1, Sushi im Burger-Laden zahlt 0, Schrankmenü, Suppe ohne Teller, schmutzige Schüssel spülen, Pommes, Mitnahme-Gast mit und ohne Karton, alte Welt laden)
- Modify: `README.md` falls es die Gerichte oder Werkzeuge aufzählt

- [ ] **Step 1: `npm test && npm run typecheck && npm run build`** grün; `npm run deploy` auf den Test-PC (siehe Memory `minecraft-test-environment.md`).
- [ ] **Step 2: Commit** — `chore: release stage 3 (version bump, manual test guide)`
