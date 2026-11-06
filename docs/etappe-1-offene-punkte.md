# Etappe 1 – offene Punkte fuer Etappe 2

Collected from the stage 1 reviews. In-game test of stage 1 passed on 2026-11-06 (user report).

## First step of the stage 2 plan (extensibility)
- Grill state does not store WHAT is cooking ({occupied,ticks}); output is patty only (logic/stations.js)
- Cutting board knows only tomato; make cuttable/cookable lookup tables
- INGREDIENTS is a hand-written list; derive it from RECIPES
- counterView and counter block states are burger layers; needs a per-dish-family view
- STATION_KINDS (guest-flow.js) duplicates STATIONS (recipes.js)
- Wish enum (guest.json), plate states (table.json) and DISH_PLATES are hand-synced with RECIPES; add a pack test
- "Hier wartet kein Gast." shows while a guest is still walking to the seat
- registryList is outside try in both intervals (log spam on corrupt store)
- Guest leaves by puff instead of walking out (revisit in stage 3)

## Deferred minor findings
Task 1: minor (deferred): readLang in tests/packs.test.js does not reject duplicate lang keys
Task 1: minor (deferred): deploy.js silently ignores a non-existent KOCHMOD_COM_MOJANG
Task 1: minor (deferred): tools/ and tests/ are outside the typecheck include
Task 2: minor (deferred): food items lack `minecraft:use_animation: "eat"` — carry into Task 5 dispatch
Task 2: minor (deferred): tomato_slices sprite is the weakest silhouette; burnt_patty low contrast; cheeseburger 1px vertical offset vs hamburger
Task 2: minor (deferred): no lint cross-check item icon key ↔ item_texture.json key
Task 2: minor (deferred): failed_dish has can_always_eat true (not in brief, harmless)
Task 3+4: minor (deferred): counterView tests cannot distinguish "last patty wins"/"slices win" from alternatives (add reversed-order cases)
Task 3+4: minor (deferred): purity test covers only counter; INITIAL and recipe arrays are shared mutable references (freeze)
Task 3+4: minor (deferred): duplicated stage→item-id map in stations.js; item id strings duplicated across logic files
Task 7: minor (deferred): no frozen-state non-mutation test; no busy-table case for failed_dish/cheeseburger plates; noisy JSDoc double cast at restaurant.js:128
Task 5: minor (deferred): registry is one JSON string (~800 stations per kind limit); stations.js adapter untested; counter layers float when lower layers missing; counter bun_top shows only with bun + filling (accepted reading)
Task 5: in-game checks to target at Checkpoint A: onPlace vs setPermutation; bone_visibility Molang string compare + bool states; direct-key custom component; mutations inside custom component events; dynamic property keys with | : ,; block interact vs item use; alpha_test 64x64 atlas mip bleeding; vanilla sound paths; creative mode consume/drops; pistons moving stations
Task 5: minor (deferred): corrupt grill state warns every 10 ticks (log spam); stations.js missing trailing newline; onBlockExploded relies on block.center() of the now-air block (unverified)
Task 6: minor (deferred): crates share one map_color; crate tests do not check material_instances face keys; tool crate picture (knife+spatula at 8x8) reads as a blob; verbose sprite typedefs
Task 6: in-game checks: form opens with picture buttons and German names; side/top textures on full_block; metal sound on tool crate; full inventory drops item
Task 6: minor (deferred): crate busy-retry chains can stack per tap (bounded); world-side crate wiring untested
Task 8: minor (deferred): placing a second table next to an occupied chair can rotate the chair away from its seated guest (skip re-orienting a chair that is a bell's seat)
Task 8: minor (deferred): tickGuests registryList('bell') outside try; additive arm rotation eat+sit; duplicated typeAt/DISH_PLATES/PREFIX; can_open_doors without annotation; pistons desync furniture and stations (no minecraft:movable restriction)
Task 8: minor (deferred): guest collision box 1.8 on a seat at y+0.5 may fight low ceilings (use ~1.4)
Task 8: in-game checks for Checkpoint B: damage_sensor deals_damage "no"; Entity.id persistence and reappearance within 3 s after reload; model orientation and chair east/west rotation; entity_spawned + kochmod:sit group swap; head controller eat flash; table bone_visibility || chains; sound/particle ids (note.bell, mob.villager.*, heart_particle, villager_angry, explosion_particle)
