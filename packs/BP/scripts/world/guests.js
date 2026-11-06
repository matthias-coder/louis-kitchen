import { BlockPermutation, ItemStack, world } from '@minecraft/server';
import { DIRECTIONS, offset } from '../logic/restaurant.js';
import { parseLocKey } from '../logic/store.js';
import { TABLE, tickBells, serveTable, findWaitingGuest, releaseBell, sweepOrphans } from '../logic/guest-flow.js';
import { worldStore, loadedBlock } from './effects.js';

/** @typedef {import('@minecraft/server').Entity} Entity */
/** @typedef {import('@minecraft/server').Vector3} Vector3 */
/** @typedef {import('../logic/guest-flow.js').Guest} Guest */
/** @typedef {import('../logic/guest-flow.js').GuestIo} GuestIo */
/** @typedef {import('../logic/guest-flow.js').GuestData} GuestData */

const GUEST_ID = 'kochmod:guest';
const DIMENSIONS = ['minecraft:overworld', 'minecraft:nether', 'minecraft:the_end'];
/** A seated guest further than this (blocks) from its seat is put back. */
const DRIFT = 0.3;
const SOUND = { sit: 'mob.villager.idle', happy: 'mob.villager.yes', grumpy: 'mob.villager.no' };
const PARTICLE = { happy: 'minecraft:heart_particle', grumpy: 'minecraft:villager_angry', poof: 'minecraft:explosion_particle' };

/** Centre of the chair seat (the seat top is half a block up). @param {string} seatKey @returns {Vector3} */
function seatPos(seatKey) {
  const { x, y, z } = parseLocKey(seatKey);
  return { x: x + 0.5, y: y + 0.5, z: z + 0.5 };
}

/** Where a seated guest looks: the table centre at eye height. @param {string} tableKey @returns {Vector3} */
function facePos(tableKey) {
  const { x, y, z } = parseLocKey(tableKey);
  return { x: x + 0.5, y: y + 2, z: z + 0.5 };
}

/** @param {Vector3} a @param {Vector3} b */
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** @param {Entity} entity @param {string} id */
function stringProp(entity, id) {
  const v = entity.getDynamicProperty(id);
  return typeof v === 'string' ? v : '';
}

/** @param {Entity} entity @param {string} seatKey @param {string} tableKey */
function placeOnSeat(entity, seatKey, tableKey) {
  entity.teleport(seatPos(seatKey), { facingLocation: facePos(tableKey), keepVelocity: false, checkForBlocks: false });
}

/**
 * @param {Entity} entity
 * @param {string} particle
 * @param {number} count
 */
function burst(entity, particle, count) {
  const { x, y, z } = entity.location;
  for (let i = 0; i < count; i++) {
    entity.dimension.spawnParticle(particle, { x: x + (Math.random() - 0.5) * 0.8, y: y + 1.6 + Math.random() * 0.6, z: z + (Math.random() - 0.5) * 0.8 });
  }
}

/** @param {Entity} entity @returns {Guest} */
function guestHandle(entity) {
  return {
    id: entity.id,
    data() {
      const timer = entity.getDynamicProperty('timer');
      return {
        phase: stringProp(entity, 'phase'),
        seat: stringProp(entity, 'seat'),
        table: stringProp(entity, 'table'),
        bell: stringProp(entity, 'bell'),
        served: stringProp(entity, 'served'),
        wish: stringProp(entity, 'wish'),
        timer: typeof timer === 'number' ? timer : 0,
      };
    },
    update(patch) {
      for (const [k, v] of Object.entries(patch)) entity.setDynamicProperty(k, v);
    },
    look(patch) {
      for (const [k, v] of Object.entries(patch)) entity.setProperty(`kochmod:${k}`, v);
    },
    distanceTo(seatKey) {
      return distance(entity.location, seatPos(seatKey));
    },
    sit(seatKey, tableKey) {
      entity.triggerEvent('kochmod:sit');
      placeOnSeat(entity, seatKey, tableKey);
      entity.dimension.playSound(SOUND.sit, entity.location);
    },
    hold(seatKey, tableKey) {
      if (distance(entity.location, seatPos(seatKey)) > DRIFT) placeOnSeat(entity, seatKey, tableKey);
    },
    react(happy) {
      burst(entity, happy ? PARTICLE.happy : PARTICLE.grumpy, 5);
      entity.dimension.playSound(happy ? SOUND.happy : SOUND.grumpy, entity.location);
    },
    remove(poof) {
      if (poof) burst(entity, PARTICLE.poof, 3);
      entity.remove();
    },
  };
}

/**
 * Free spot one block beside the bell (air with air above), else on top of the bell.
 * @param {string} bellKey
 * @returns {Vector3}
 */
function spawnSpot(bellKey) {
  const { dimensionId, x, y, z } = parseLocKey(bellKey);
  const dim = world.getDimension(dimensionId);
  const isAir = (/** @type {Vector3} */ loc) => {
    try {
      return dim.getBlock(loc)?.isAir === true;
    } catch {
      return false;
    }
  };
  for (const dir of DIRECTIONS) {
    const loc = offset({ x, y, z }, dir);
    if (isAir(loc) && isAir({ ...loc, y: loc.y + 1 })) return { x: loc.x + 0.5, y: loc.y, z: loc.z + 0.5 };
  }
  return { x: x + 0.5, y: y + 1, z: z + 0.5 };
}

/** Plate state of a table: worldStore is the truth, the block state `kochmod:plate` the view. */
/** @param {string} tableKey */
function getPlate(tableKey) {
  const state = worldStore.load(tableKey);
  return typeof state?.plate === 'string' ? state.plate : 'none';
}

/**
 * @param {string} tableKey
 * @param {string} plate
 */
export function setPlate(tableKey, plate) {
  const block = loadedBlock(tableKey);
  if (block?.typeId === TABLE) block.setPermutation(BlockPermutation.resolve(TABLE, { 'kochmod:plate': plate }));
  worldStore.save(tableKey, { plate });
}

/** @type {GuestIo} */
const io = {
  blockTypeAt: (key) => loadedBlock(key)?.typeId,
  registryList: (kind) => worldStore.registryList(kind),
  loadBell: (key) => worldStore.load(key),
  saveBell: (key, state) => worldStore.save(key, state),
  forgetBell: (key) => {
    worldStore.remove(key);
    worldStore.registryRemove('bell', key);
  },
  getGuest: (id) => {
    const entity = world.getEntity(id);
    return entity && entity.isValid && entity.typeId === GUEST_ID ? guestHandle(entity) : undefined;
  },
  spawnGuest: (bellKey, data) => {
    const dim = world.getDimension(parseLocKey(bellKey).dimensionId);
    const guest = guestHandle(dim.spawnEntity(GUEST_ID, spawnSpot(bellKey)));
    guest.update(data);
    return guest;
  },
  getPlate,
  setPlate,
  payout: (tableKey, emeralds) => {
    const { dimensionId, x, y, z } = parseLocKey(tableKey);
    world.getDimension(dimensionId).spawnItem(new ItemStack('minecraft:emerald', emeralds), { x: x + 0.5, y: y + 1.1, z: z + 0.5 });
  },
  warn: (message) => console.warn(message),
};

/** All loaded guest entities. @returns {Guest[]} */
function loadedGuests() {
  return DIMENSIONS.flatMap((id) => {
    try {
      return world.getDimension(id).getEntities({ type: GUEST_ID }).map(guestHandle);
    } catch (e) {
      console.warn(`kochmod: guest scan failed in ${id}: ${e}`);
      return [];
    }
  });
}

/**
 * Advances every bell and its guest by `dt` ticks, then removes stray guests.
 * @param {number} dt
 */
export function tickGuests(dt) {
  tickBells(worldStore.registryList('bell'), dt, io, Math.random);
  try {
    sweepOrphans(loadedGuests(), io);
  } catch (e) {
    console.warn(`kochmod: guest sweep failed: ${e}`);
  }
}

/**
 * A dish was put on this table: the waiting guest starts eating.
 * @param {string} tableKey
 * @param {string} dishId
 */
export function onTableServed(tableKey, dishId) {
  serveTable(tableKey, dishId, io);
}

/** @param {string} tableKey */
export function hasWaitingGuest(tableKey) {
  return findWaitingGuest(tableKey, io) !== null;
}

/** Bell broken or exploded: its guest leaves, the bell is forgotten. @param {string} bellKey */
export function forgetBell(bellKey) {
  releaseBell(bellKey, io, Math.random);
}
