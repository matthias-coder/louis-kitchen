# Kochmod Etappe 2 (Alle Gerichte, neue Geräte, Rezeptbuch) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the working burger restaurant to nine dishes cooked on four new kitchen devices (Pizzaofen, Dönerspieß, Suppentopf, Wok), with a picture recipe book and six themed Baukasten restaurants, and make recipes/stations pure data so later dishes need no code.

**Architecture:** Same shape as stage 1: pure logic in `packs/BP/scripts/logic/` tested with `node --test`, thin world glue in `packs/BP/scripts/world/`, generated art in `tools/`. Stage 2 first replaces the hard-wired burger logic with three data tables (item catalog, process tables, recipes) and generic station factories; every later task then only adds rows, sprites and block JSON.

**Tech Stack:** unchanged — Bedrock 1.26.62, `@minecraft/server` 2.0.0, `@minecraft/server-ui` 2.0.0, plain ESM JavaScript with JSDoc, Node 24.

**Spec:** `docs/superpowers/specs/2026-11-05-kochmod-design.md` §7–§11, §14 Etappe 2. Additions agreed with the user on 2026-11-07: devices Pizzaofen, Dönerspieß, Suppentopf, Wok as blocks; a Wok dish (Bratnudeln); the four ingredient crates are gone (fridge + pantry + tool crate supply everything). Known review findings to resolve are in `docs/etappe-1-offene-punkte.md`.

## Global Constraints

- Everything in `docs/superpowers/plans/2026-11-05-kochmod-etappe-1-burger.md` → Global Constraints still binds (namespace, stable APIs, German texts in both lang files, tap-only, 160/760 ticks, world-owned state, drops on break, invulnerable guests, generated 16×16 art committed, pure logic without Minecraft imports, nobody can run the game).
- Stage 1 behavior the family already tested must keep working: burger flow, plates, dishwasher, cabinet, fridge, pantry, crates, guest flow, Baukasten. Every task ends with `npm test && npm run typecheck && npm run build` green; stage 1 tests may be adapted to new interfaces but never deleted without a replacement.
- Block geometry stays within 0..23 px height.
- Pack version becomes `2.0.0` (Task 9); names carry the version.
- Nobody can run Minecraft here: each task's report lists the format/API details it could not verify; human checkpoints are run by the controller.

## Review Focus

1. **Data drift between tables and pack files**: a dish present in `RECIPES` but missing in the guest wish enum, the bubble textures, the recipe book or the Baukasten availability → pack tests in Task 1 and Task 8 assert the sync for every dish.
2. **A station holding an item whose table row changed** (e.g. a saved pot with an unknown item after an update) → reducers must tolerate unknown ids (drop them as items on break, never throw); Task 2 tests feed unknown ids.
3. **Old worlds**: counter/table block states change shape in Task 2; blocks placed with old states must still load (new states have defaults) and stored station state must be migrated or reset without items vanishing → Task 2 migration test.
4. **Timed stations left running while the chunk is unloaded or the world is closed** → tick accumulation only while loaded (stage 1 pattern) for oven, pot, wok, spit; Task 2 factory test.
5. **Wrong thing at the wrong place**: wrong tool on oven/pot/wok/spit, ingredient into a running pot, scooping an empty pot, tapping the spit without meat → reducer tests in Tasks 5–7 assert "nothing consumed, hint or no-op".

---

## Identifiers added in stage 2 (prefix `kochmod:`)

| Kind | id | German |
|---|---|---|
| Fridge ingredients | `salami`, `egg`, `salmon`, `cream`, `onion`, `carrot`, `potato`, `spring_onion`, `doner_meat_raw` | Salami, Ei, Lachs, Sahne, Zwiebel, Karotte, Kartoffel, Frühlingszwiebel, Dönerfleisch (roh) |
| Pantry ingredients | `dough`, `tomato_sauce`, `noodles`, `rice`, `broth`, `nori`, `pita`, `doner_sauce`, `soy_sauce` | Pizzateig, Tomatensoße, Nudeln, Reis, Brühe, Algenblatt, Dönertasche, Dönersoße, Sojasoße |
| Prepared | `onion_rings`, `carrot_slices`, `potato_cubes`, `salmon_strips`, `doner_meat`, `cooked_rice`, `raw_pizza_margherita`, `raw_salami_pizza`, `burnt_pizza` | Zwiebelringe, Karottenscheiben, Kartoffelwürfel, Lachsstreifen, Dönerfleisch, Gekochter Reis, Pizza Margherita (roh), Salamipizza (roh), Verbrannte Pizza |
| Tools | `bowl`, `pizza_peel`, `wok_spatula` | Schüssel, Pizzaschieber, Wokwender |
| Dishes | `pizza_margherita`, `salami_pizza`, `ramen`, `potato_soup`, `doner`, `sushi`, `fried_noodles` | Pizza Margherita, Salamipizza, Ramen, Kartoffelsuppe, Döner, Sushi, Bratnudeln |
| Blocks | `oven`, `spit`, `pot`, `wok` | Pizzaofen, Dönerspieß, Suppentopf, Wok |
| Item | `recipe_book` | Rezeptbuch |

Hints: `kochmod.hint.need_peel` „Nimm den Pizzaschieber!", `kochmod.hint.oven_full` „Der Ofen ist belegt.", `kochmod.hint.pot_full` „Der Topf ist voll.", `kochmod.hint.pot_cooking` „Das kocht noch.", `kochmod.hint.need_bowl` „Nimm eine Schüssel!", `kochmod.hint.pot_empty` „Der Topf ist leer.", `kochmod.hint.wok_full` „Der Wok ist voll.", `kochmod.hint.need_wok_spatula` „Nimm den Wokwender!", `kochmod.hint.spit_busy` „Da hängt schon Fleisch.", `kochmod.hint.spit_raw` „Das Fleisch ist noch nicht fertig.", `kochmod.hint.spit_empty` „Häng Dönerfleisch an den Spieß."

## Dishes and their steps (the data every table must agree on)

| Dish | Preparation | Final step |
|---|---|---|
| Hamburger / Cheeseburger | grill patty; cut tomato | counter |
| Pizza Margherita | counter: dough + tomato_sauce + cheese → raw_pizza_margherita | oven (pizza_peel to take out) |
| Salamipizza | counter: + salami → raw_salami_pizza | oven |
| Ramen | — | pot: broth + noodles + egg + spring_onion → bowl |
| Kartoffelsuppe | cut potato, carrot | pot: potato_cubes + carrot_slices + cream → bowl |
| Gekochter Reis (intermediate) | — | pot: rice → bowl → cooked_rice |
| Sushi | cook rice; cut salmon | counter: nori + cooked_rice + salmon_strips |
| Döner | spit: doner_meat_raw grills, knife → doner_meat; cut tomato, onion | counter: pita + doner_meat + lettuce + tomato_slices + onion_rings + doner_sauce |
| Bratnudeln | cut carrot | wok: noodles + egg + carrot_slices + spring_onion + soy_sauce, wok_spatula → fried_noodles |

---

### Task 1: Item catalog and data-driven recipes (no gameplay change)

**Files:**
- Create: `packs/BP/scripts/logic/catalog.js`, `packs/BP/scripts/logic/processes.js`
- Modify: `logic/recipes.js`, `logic/crates.js`, `logic/guest-flow.js` (`STATION_KINDS`, `DISH_PLATES`), `logic/restaurant.js` (`availableDishes`), `tests/*`
- Test: `tests/catalog.test.js`, `tests/processes.test.js`, extend `tests/packs.test.js`

**Interfaces:**
- `catalog.js`: `ITEMS: Record<string, { kind: 'ingredient'|'prepared'|'tool'|'dish'|'plate'|'misc', source?: 'fridge'|'pantry'|'tools', stack: number }>` for every stage 1 item (stage 2 items are added in Task 3); helpers `itemsOf(kind)`, `itemsFrom(source)`, `isDish(id)`, `DISHES: string[]` (ordered, stage 1: hamburger, cheeseburger; `failed_dish` is kind `dish` but excluded from `DISHES`), `plateName(dishId)` (strip prefix).
- `processes.js`:
  - `CUTTABLE: Record<string, string>` (tomato → tomato_slices)
  - `TIMED: Record<station, { accepts: Record<string, { cooked: string, burnt: string }>, tool: string, hintTool: string, hintFull: string, sound: string }>` with `grill` (raw_patty → cooked_patty/burnt_patty, tool spatula) now; `oven` added in Task 5.
  - `ASSEMBLY: { dish: string, parts: string[] }[]` for the counter (burgers now; pizza raws, sushi, doner later) and `POT`, `WOK` recipe lists (Tasks 6–7, empty now).
  - `stepsFor(dishId): Step[]` where `Step = { item: string, station: string, tool?: string, result?: string }` derived from the tables by walking each part back to its source (prepared items → their process; ingredients → fridge/pantry). Used by the recipe book (Task 8) and by `stationsFor(dishId): string[]` (replaces hand-written `stations` in RECIPES).
- `recipes.js`: `RECIPES` becomes derived: `{ dish, parts, stations: stationsFor(dish) }` from `ASSEMBLY` + `POT` + `WOK` entries whose result is a dish; `evaluateAssembly(itemIds)` unchanged behavior; `evaluateFor(list, itemIds)` generic.
- `crates.js`: fridge/pantry/tools entries derived from `itemsFrom(source)` (ingredients ×4, tools ×1, clean_plate ×4 stays in tools); `crate_all` items derived from `Object.keys(ITEMS)` in catalog order + `ALL_BLOCKS`.
- `guest-flow.js`: `STATION_KINDS` → union of all `stationsFor` over `DISHES`; `DISH_PLATES` → `DISHES.map(plateName)` + `failed_dish`.

- [ ] **Step 1: Write failing tests.** `catalog.test.js`: every id used in `RECIPES`, `CRATES` and `CUTTABLE` exists in `ITEMS`; `DISHES` equals the dishes of `RECIPES` in order; `itemsFrom('fridge')` = tomato, lettuce, raw_patty, cheese. `processes.test.js`: `stepsFor('kochmod:cheeseburger')` lists, in order, raw_patty→grill, tomato→cutting_board (knife), then the counter step with all five parts; `stationsFor` = `['grill','cutting_board','counter']`. `packs.test.js`: the guest wish enum in `packs/BP/entities/guest.json` equals `['none', ...DISHES.map(plateName)]`; the table plate states equal `['none', ...DISH_PLATES, 'empty']` (this test is rewritten in Task 2 when the table view changes).
- [ ] **Step 2: Run `npm test`** — FAIL (modules missing).
- [ ] **Step 3: Implement** catalog, processes, derived recipes/crates/guest-flow constants. No gameplay change: the existing stations, crates, guest and restaurant tests must still pass unchanged (except imports).
- [ ] **Step 4: Run `npm test && npm run typecheck`** — PASS, all 201 old tests still green.
- [ ] **Step 5: Commit** `refactor: item catalog, process tables and derived recipes`.

---

### Task 2: Generic station factories and family-based views

**Files:**
- Modify: `logic/stations.js`, `logic/station-flow.js`, `world/stations.js`, `packs/BP/blocks/counter.json`, `packs/BP/blocks/table.json`, `tools/geometry.js`, `tools/sprites/blocks.js`, tests

**Interfaces:**
- `timedStation(def)` factory in `logic/stations.js` returning `{ interact(state, held), tick(state, dt), view(state), drops(state), INITIAL }` with `TimedState = { item: string | null, ticks: number }`; `grill` = `timedStation(TIMED.grill)`; `view` returns `'empty' | 'raw' | 'cooked' | 'burnt'`. Exports `grillInteract` etc. stay as thin aliases so Task 1 tests keep passing. Unknown `item` ids (not in `accepts`) are tolerated: view `raw`, drops return the id as is.
- Counter view becomes `counterView(state): { family: 'none'|'burger'|'pizza'|'doner'|'sushi', layers: 0..6 }`; `family` from the first base item present (bun → burger, dough → pizza, pita → doner, nori → sushi, else burger when any item), `layers = min(items.length, 6)`. Block states `kochmod:family` enum + `kochmod:layers` int 0..6; geometry: one stack of 6 layer bones per family with family textures (burger layers look like bun/patty/lettuce/tomato/cheese/top bun in fixed order).
- Table view becomes `kochmod:plate` `["none","food","failed","empty"]` with a generic plated meal model; `tableInteract` keeps storing the dish id in state (`plate: dishId | 'empty' | 'none'`), only the view maps it to `food`/`failed`.
- Migration: `migrateStationState(kind, saved)` in `logic/stations.js` turns stage 1 shapes (`{occupied,ticks}` grill, counter `{items}`) into the new shapes; unknown → `INITIAL`.

- [ ] **Step 1: Write failing tests**: factory behaves exactly like the stage 1 grill rules (reuse the Task 4 stage 1 test list through the aliases); `tick` caps at BURNT_AT and only accumulates while an item is present; unknown item tolerated; `counterView` family/layers for bun-based, dough-based, pita-based, nori-based and empty; `migrateStationState` for the two old shapes; the table view mapping (`hamburger` → `food`, `failed_dish` → `failed`).
- [ ] **Step 2: Run `npm test`** — FAIL.
- [ ] **Step 3: Implement** factory, views, migration (called in `world/stations.js` when loading state), new counter/table block JSON + geometry + textures, `syncOnPlace`-style view refresh after migration.
- [ ] **Step 4: Run `npm run textures && npm test && npm run typecheck && npm run build`** — PASS.
- [ ] **Step 5: Commit** `refactor: timed-station factory, family counter view, generic table plate`.
- [ ] **Step 6: HUMAN CHECKPOINT 2A** (German): deploy; in the existing world the burger flow still works end to end; a grill that was cooking before the update still shows a patty; the counter shows a growing burger stack; the table shows a plated meal; guests still pay.

---

### Task 3: Stage 2 items, sprites, fridge and pantry contents

**Files:**
- Modify: `logic/catalog.js` (all rows from the identifier table except blocks and `recipe_book`), `tools/sprites/items.js`, `packs/BP/items/*.json` (one per new item; dishes edible nutrition 8, `failed`-like intermediates not edible; tools stack 1), lang files
- Test: `tests/catalog.test.js`, `tests/sprites.test.js`

- [ ] **Step 1: Tests**: every catalog id has an item JSON, a lang name and a sprite; dishes have `minecraft:food`; `itemsFrom('fridge')` and `itemsFrom('pantry')` equal the identifier table columns; tools crate = knife, spatula, bowl, pizza_peel, wok_spatula ×1 + clean_plate ×4.
- [ ] **Step 2: Run `npm test`** — FAIL.
- [ ] **Step 3: Implement** rows, item JSON (generate the JSON files with a small script from the catalog if the implementer prefers; then commit the generated files), 30 sprites (recognizable silhouettes: noodles as a yellow tangle, nori dark green square, pita a half-moon pocket, pizza round with red/yellow, ramen a bowl with noodles, sushi three rolls, soup a bowl with orange cubes, fried noodles a dark plate with noodles).
- [ ] **Step 4: Run `npm run textures && npm test && npm run typecheck`** — PASS.
- [ ] **Step 5: Commit** `feat: stage 2 ingredients, tools and dishes as items`.

---

### Task 4: Cutting board as a table

**Files:** Modify `logic/processes.js` (`CUTTABLE`: tomato→tomato_slices, onion→onion_rings, carrot→carrot_slices, potato→potato_cubes, salmon→salmon_strips), `logic/stations.js` (board reads `CUTTABLE`), `packs/BP/blocks/cutting_board.json` + geometry (view: `kochmod:content` `["empty","whole","cut"]` with a generic item-on-board model, two textures), tests.

- [ ] **Step 1: Tests**: each cuttable pair; non-cuttable rejected; view `whole`/`cut`.
- [ ] **Step 2–4:** RED → implement → `npm run textures && npm test && npm run typecheck` PASS.
- [ ] **Step 5: Commit** `feat: cutting board cuts every CUTTABLE ingredient`.

---

### Task 5: Pizzaofen and pizzas

**Files:** Create `packs/BP/blocks/oven.json`, geometry/sprites; modify `logic/processes.js` (`TIMED.oven`: raw_pizza_margherita → pizza_margherita, raw_salami_pizza → salami_pizza, both burnt → burnt_pizza, tool `pizza_peel`, hints `need_peel`/`oven_full`, sound `kochmod.oven`; `ASSEMBLY` += `{ dish: raw_pizza_margherita, parts: [dough, tomato_sauce, cheese] }`, `{ dish: raw_salami_pizza, parts: [dough, tomato_sauce, cheese, salami] }`), `logic/stations.js` (`oven = timedStation(TIMED.oven)`), `world/stations.js` (register `kochmod:oven`, tick), `logic/crates.js` `ALL_BLOCKS`, `logic/layout.js` (oven in the Baukasten kitchen), lang, tests.

- [ ] **Step 1: Tests**: oven rules (empty + raw pizza → placed; occupied + raw pizza → hint; empty hand → need_peel; peel → cooked/burnt by stage); assembling dough+sauce+cheese on the counter yields `raw_pizza_margherita`, with salami `raw_salami_pizza`; `stepsFor('kochmod:salami_pizza')` = counter step then oven step; `stationsFor` = `['counter','oven']`; `availableDishes` requires `oven` for pizzas; layout test includes the oven.
- [ ] **Step 2–4:** RED → implement (stone oven with arched opening, fire glow bone while occupied, pizza bone raw/cooked/burnt) → PASS.
- [ ] **Step 5: Commit** `feat: pizza oven and two pizzas`.

---

### Task 6: Suppentopf (pot) and bowl dishes

**Files:** Create `packs/BP/blocks/pot.json`, geometry/sprites; modify `logic/processes.js` (`POT` recipes: ramen = broth+noodles+egg+spring_onion; potato_soup = potato_cubes+carrot_slices+cream; cooked_rice = rice), `logic/stations.js` (`potInteract/potTick/potView/potDrops`), `world/stations.js`, `ALL_BLOCKS`, `layout.js`, lang, tests.

**Rules** (`PotState = { items: string[], ticks: number }`, `POT_MAX = 6`):
- held ingredient/prepared item and items < 6 and ticks < COOKED_AT → push, ticks unchanged, take, sound `kochmod.bubble`; items = 6 → hint `pot_full`; adding when ticks ≥ COOKED_AT → hint `pot_cooking` (no take) — a finished pot must be scooped first
- `tick` accumulates while items ≥ 1, caps at BURNT_AT
- held `bowl` and items ≥ 1 and ticks ≥ COOKED_AT → gives `evaluateFor(POT, items)` (cookStage burnt → `failed_dish`; `cooked_rice` is a prepared item, not a dish), takes one bowl, pot empty; held `bowl` and ticks < COOKED_AT → hint `pot_cooking`; held `bowl` and empty → hint `pot_empty`
- empty hand and items ≥ 1 → hint `need_bowl`; anything else → unchanged
- view `kochmod:state` `["empty","raw","cooking","done","burnt"]` (raw = items but ticks 0..?, keep: `raw` while ticks < COOKED_AT/2, `cooking` until COOKED_AT, `done`, `burnt`); drops: the items
- [ ] **Step 1: Tests** for each rule, plus `stepsFor('kochmod:ramen')` = pantry/fridge sources then one pot step with bowl; `stepsFor('kochmod:sushi')` includes rice → pot → cooked_rice before the counter step.
- [ ] **Step 2–4:** RED → implement (iron pot on a small stove, lid, steam particle bone while cooking) → PASS.
- [ ] **Step 5: Commit** `feat: soup pot with ramen, potato soup and rice`.

---

### Task 7: Dönerspieß, Wok, Döner, Sushi, Bratnudeln

**Files:** Create `packs/BP/blocks/spit.json`, `packs/BP/blocks/wok.json`, geometry/sprites; modify `logic/processes.js` (`ASSEMBLY` += doner, sushi; `WOK` recipes: fried_noodles = noodles+egg+carrot_slices+spring_onion+soy_sauce), `logic/stations.js` (spit and wok reducers), `world/stations.js`, `ALL_BLOCKS`, `layout.js`, lang, tests.

**Spit rules** (`SpitState = { meat: boolean, ticks: number, slices: number }`, `SPIT_SLICES = 6`): held `doner_meat_raw` and !meat → meat, ticks 0, slices 6, take; held it and meat → hint `spit_busy`; held `knife` and meat and ticks ≥ COOKED_AT → give `doner_meat`, slices−1, empty when 0; knife and ticks < COOKED_AT → hint `spit_raw`; knife and !meat → hint `spit_empty`; tick accumulates while meat, caps at COOKED_AT (never burns); view `["empty","raw","cooked"]` + rotating spit animation is optional; drops: `doner_meat_raw` if raw else `doner_meat` × slices.

**Wok rules**: like the pot (`WOK_MAX = 6`, recipes `WOK`, tool `wok_spatula` instead of bowl, hints `wok_full`/`need_wok_spatula`, sound `kochmod.sizzle`), burnt → `failed_dish`. Implement pot and wok through one `potStation(def)` factory with `{ recipes, tool, max, hints, sound }`.

- [ ] **Step 1: Tests** for spit and wok rules; assembling pita+doner_meat+lettuce+tomato_slices+onion_rings+doner_sauce → doner; nori+cooked_rice+salmon_strips → sushi; `stepsFor` for all three new dishes; `stationsFor('kochmod:doner')` = spit, cutting_board, counter.
- [ ] **Step 2–4:** RED → implement → PASS.
- [ ] **Step 5: Commit** `feat: doner spit, wok, and the doner, sushi and fried noodle dishes`.

---

### Task 8: Guests for nine dishes and the recipe book

**Files:** Modify `packs/BP/entities/guest.json` (wish enum from `DISHES`), `tools/sprites/entity.js` (bubble texture per dish from the dish sprites), render controller, `logic/guest-flow.js` (nothing hard-wired left), `packs/BP/items/recipe_book.json`, create `world/recipe-book.js`, `logic/recipe-book.js`, tests.

**Recipe book**: item `kochmod:recipe_book` (stack 1, in tools crate and crate_all). On use (`onUse` item custom component, or `itemUse` after-event): `ActionFormData` titled „Rezeptbuch" with one button per dish in `DISHES` (dish icon + German name). Selecting a dish opens a second form titled with the dish name whose buttons are its steps from `stepsFor(dish)`: label `„${n}. ${name(item)} ➜ ${name(station)}${tool ? ' (' + name(tool) + ')' : ''}"`, icon = the item's texture; last button „Zurück" returns to the list. Pure helper `bookPages(dishId): { title, buttons: { label: RawMessage, icon: string }[] }` in `logic/recipe-book.js` with tests; `name()` uses `{ translate: 'item.kochmod:<id>' }` / `tile.kochmod:<id>.name` raw messages, the station names being the block names.

- [ ] **Step 1: Tests**: guest wish enum equals `['none', ...DISHES.map(plateName)]`; a bubble texture file exists per dish; `bookPages` for cheeseburger and ramen produce the expected button count and icon paths; `availableDishes` picks dishes by their derived stations.
- [ ] **Step 2–4:** RED → implement → PASS.
- [ ] **Step 5: Commit** `feat: guests wish for every dish; picture recipe book`.

---

### Task 9: Baukasten kitchen, docs, version 2.0.0

**Files:** Modify `logic/layout.js` (kitchen holds oven, pot, wok, spit beside the stage 1 stations; still walkable), `docs/test-etappe-2.md` (new German play-test sheet: each dish once, each device, recipe book, old world still works), `README.md`, manifests + lang `pack.name` → 2.0.0, `tests/packs.test.js` version expectations.

- [ ] **Step 1: Tests**: layout contains every station in `STATION_KINDS` exactly once; walkable; bell within radius; versions 2.0.0 and names.
- [ ] **Step 2–4:** RED → implement → `npm run textures && npm test && npm run typecheck && npm run build` PASS; `npm run deploy`.
- [ ] **Step 5: Commit** `chore: stage 2 Baukasten kitchen, test sheet, version 2.0.0`.
- [ ] **Step 6: HUMAN CHECKPOINT 2B**: the family plays `docs/test-etappe-2.md` on the PC, then on the tablet.

---

### Task 10: Themed restaurants from one Baukasten

**Files:** Modify `logic/layout.js` (layouts become data: `THEMES`), `world/kit.js` (picture menu), lang, `tests/layout.test.js`, `docs/test-etappe-2.md`.

**Design (changed 2026-11-07 on the user's request):** the designs live in their own crate block `kochmod:crate_kits` „Restaurant-Kiste" (crate component like the others, look: a wooden crate with a small house and blueprint on the front). Its picture menu has one button per theme (icon = a dish of that theme) and hands out that theme's own Baukasten item ×1: `kochmod:kit_burger`, `kit_italian`, `kit_japanese`, `kit_doner`, `kit_classic`, `kit_mega` (German names „Baukasten: Burger-Laden" etc.). Each kit item builds its theme directly on tap, exactly like today's `restaurant_kit`, which becomes `kit_classic` (keep `kochmod:restaurant_kit` as an alias item that behaves like `kit_classic` so old worlds keep working). `crate_all` lists `crate_kits` among the blocks and the six kits among the items. Themes (German names in both lang files, key `kochmod.theme.<id>`):

| id | Name | Kitchen devices | Tables | Look |
|---|---|---|---|---|
| `burger` | Burger-Laden | grill, cutting_board, counter | 4 | red/white terracotta, checkered floor |
| `italian` | Pizzeria | oven, pot, cutting_board, counter | 4 | brick walls, green/white/red awning blocks |
| `japanese` | Sushi-Bar | pot, wok, cutting_board, counter | 4 (a bar counter row) | dark oak, paper-like white concrete, lanterns |
| `doner` | Döner-Imbiss | spit, cutting_board, counter | 3 | small, bright, tiled |
| `classic` | Restaurant | all devices | 4 | the stage 1 layout |
| `mega` | Mega-Restaurant | all devices | 8 on two floors | two storeys with a staircase, kitchen on the ground floor, dining on both floors, 20 × 14 footprint, 9 high |

Every theme has fridge, pantry, crate_tools, crate_all, dishwasher and dish_cabinet; the bell sits where every chair is within `RADIUS` (for `mega` one bell per floor). Guests automatically only wish for dishes the theme's kitchen can make (`availableDishes` on the derived stations).

- [ ] **Step 1: Tests**: for every theme — all referenced block ids exist, no overlapping cells, floor covered, walkable (flood fill from the entrance reaches every station and chair; the `mega` staircase connects both floors), every chair has its table and is within radius of a bell, the kitchen devices match the table above, the footprint fits the declared size; `availableDishes` for the `doner` theme = `['kochmod:doner']`.
- [ ] **Step 2–4:** RED → implement (layouts generated by composable helpers: `room(w,d,h,materials)`, `kitchenRow(devices, wall)`, `diningGrid(n)`, `staircase(...)`) → `npm test && npm run typecheck && npm run build` PASS.
- [ ] **Step 5: Commit** `feat: themed restaurants chosen from the Baukasten menu`.
- [ ] **Step 6: HUMAN CHECKPOINT 2C**: build each theme once on the PC (kits taken from the Restaurant-Kiste); walk through; ring the bell; the döner stand only gets döner guests; the mega restaurant's upper floor gets guests too.

---

### Task 11: Mülleimer (trash can)

**Files:** Create `packs/BP/blocks/trash_can.json`, geometry/sprites; modify `logic/stations.js` (pure `trashInteract(held)`), `world/stations.js`, `ALL_BLOCKS`, every theme layout in `logic/layout.js` (one trash can in each kitchen), lang, tests, `docs/test-etappe-2.md`.

**Rules:** block `kochmod:trash_can` „Mülleimer" (grey metal bin with a lid, 12×14×12 px). Tap with any item in hand → exactly ONE item of the held stack disappears with sound `kochmod.trash` (a vanilla lid/click sound) and a small smoke puff; the lid bone pops up for 10 ticks (`kochmod:open` bool state, reset by the station tick). Tap with an empty hand → hint `kochmod.hint.trash_empty_hand` „Nimm etwas in die Hand, das weg soll." Tools (knife, spatula, bowl, pizza_peel, wok_spatula, kits, recipe_book) are refused with hint `kochmod.hint.trash_no_tools` „Werkzeuge gehören nicht in den Müll." Nothing is stored; breaking drops nothing.

- [ ] **Step 1: Tests**: `trashInteract('kochmod:burnt_pizza')` → `{ take: true, sound: 'kochmod.trash' }`; `trashInteract(null)` → hint; `trashInteract('kochmod:knife')` → hint `trash_no_tools`, no take; tools are derived from the catalog (`kind === 'tool'` or `'misc'`), not hand-listed; every theme layout contains exactly one trash can.
- [ ] **Step 2–4:** RED → implement → PASS.
- [ ] **Step 5: Commit** `feat: trash can for burnt and failed food`.

---

## Decisions made in this plan (not in the spec)

- Suppentopf and Wok are single blocks (pot/wok on a burner), not a Kochplatte plus a pot item; the Schüssel (bowl) is the tool that takes the dish out of the pot, the Wokwender out of the wok. The Schöpfkelle from the concept is dropped.
- Pizzas are assembled on the Anrichte (counter) like everything else, then baked; the counter shows a family-specific stack (burger / pizza / döner / sushi) with a layer count instead of per-ingredient visuals; the table shows a generic plated meal. The guest's thought bubble still shows the exact dish.
- Gekochter Reis is an intermediate item made in the pot; Sushi is assembled on the counter.
- Bratnudeln (Wok) is a new ninth dish so the Wok has a purpose.
- A finished pot must be scooped before more ingredients go in; the spit never burns and yields six slices.
- All dishes, including soups, need a clean plate to be served (one rule for the child).
- Burnt pizza is a distinct item (so the child sees what went wrong); other burnt outcomes stay `failed_dish`.
- Six themed restaurants (user idea 2026-11-07) come as six Baukasten items handed out by their own Restaurant-Kiste; a theme only has the devices of its cuisine, so guests order accordingly.
- A Mülleimer (user idea 2026-11-07) destroys one held item per tap, refuses tools, and stands in every kitchen.
