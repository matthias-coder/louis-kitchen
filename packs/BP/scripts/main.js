import { system, world } from '@minecraft/server';
import { registerCrates } from './world/crates.js';
import { registerStations, tickStations, onBlockExploded } from './world/stations.js';

const STATION_TICK = 10;

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  registerStations(blockComponentRegistry);
  registerCrates(blockComponentRegistry);
});

system.runInterval(() => tickStations(STATION_TICK), STATION_TICK);

world.afterEvents.blockExplode.subscribe(onBlockExploded);
