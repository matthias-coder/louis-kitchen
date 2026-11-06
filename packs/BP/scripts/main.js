import { system, world } from '@minecraft/server';
import { registerCrates } from './world/crates.js';
import { registerStations, tickStations, onBlockExploded } from './world/stations.js';
import { registerFurniture, onFurnitureExploded } from './world/furniture.js';
import { tickGuests } from './world/guests.js';

const STATION_TICK = 10;
const GUEST_TICK = 20;

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  registerStations(blockComponentRegistry);
  registerCrates(blockComponentRegistry);
  registerFurniture(blockComponentRegistry);
});

system.runInterval(() => tickStations(STATION_TICK), STATION_TICK);
system.runInterval(() => tickGuests(GUEST_TICK), GUEST_TICK);

world.afterEvents.blockExplode.subscribe(onBlockExploded);
world.afterEvents.blockExplode.subscribe(onFurnitureExploded);
