import { system } from '@minecraft/server';
import { registerStations, tickStations } from './world/stations.js';

const STATION_TICK = 10;

system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  registerStations(blockComponentRegistry);
});

system.runInterval(() => tickStations(STATION_TICK), STATION_TICK);
