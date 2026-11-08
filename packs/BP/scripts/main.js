import { system, world, Player } from '@minecraft/server';
import { registerCrates } from './world/crates.js';
import { registerStations, tickStations, onBlockExploded } from './world/stations.js';
import { registerFurniture, onFurnitureExploded } from './world/furniture.js';
import { tickGuests, onGuestInteract } from './world/guests.js';
import { registerKit } from './world/kit.js';
import { registerRecipeBook } from './world/recipe-book.js';

const STATION_TICK = 10;
const GUEST_TICK = 20;

system.beforeEvents.startup.subscribe(({ blockComponentRegistry, itemComponentRegistry }) => {
  registerStations(blockComponentRegistry);
  registerCrates(blockComponentRegistry);
  registerFurniture(blockComponentRegistry);
  registerKit(itemComponentRegistry);
  registerRecipeBook(itemComponentRegistry);
});

system.runInterval(() => tickStations(STATION_TICK), STATION_TICK);
system.runInterval(() => tickGuests(GUEST_TICK), GUEST_TICK);

world.afterEvents.blockExplode.subscribe(onBlockExploded);
world.afterEvents.blockExplode.subscribe(onFurnitureExploded);

world.afterEvents.playerInteractWithEntity.subscribe(({ player, target }) => {
  try {
    onGuestInteract(player, target);
  } catch (e) {
    console.warn(`kochmod: takeaway serve failed: ${e}`);
  }
});

// On touch devices a tap on an entity is an attack and no interact event fires: serve on the hit too.
// The guest's damage sensor blocks the damage; serveTakeaway's phase check stops a double serve.
world.afterEvents.entityHitEntity.subscribe(({ damagingEntity, hitEntity }) => {
  try {
    if (damagingEntity instanceof Player && hitEntity.typeId === 'kochmod:guest') onGuestInteract(damagingEntity, hitEntity);
  } catch (e) {
    console.warn(`kochmod: takeaway serve (hit) failed: ${e}`);
  }
});
