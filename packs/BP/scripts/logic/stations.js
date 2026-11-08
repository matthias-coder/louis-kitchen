import { BURNT_AT, COOKED_AT, cookStage } from './cooking.js';
import { evaluateAssembly, evaluateFor, FAILED } from './recipes.js';
import { ITEMS, SOUP_BOWL, DIRTY_BOWL, PIZZA_BOX } from './catalog.js';
import { CUTTABLE, CUT_TOOLS, TIMED, POT_DEF, WOK_DEF, SPIT } from './processes.js';

/**
 * take: consume one held item. give: item id handed to the player, `count` of them
 * as one stack (default 1). hint: lang key for the action bar. sound: sound id to play at the block.
 * particle: particle id spawned just above the block. consume: remove one of this item from any inventory slot.
 * gives: several stacks handed over at once. menu: open the station's menu (only the dish cabinet).
 * @template S
 * @typedef {{ state: S, take?: boolean, consume?: string, give?: string, count?: number, gives?: { item: string, count: number }[], menu?: boolean, hint?: string, sound?: string, particle?: string }} Result
 */
/** Whether the player carries the item in any inventory slot. @typedef {(id: string) => boolean} Carried */
/** item: what lies on the station (null when empty); ticks: cooking time so far. @typedef {{ item: string | null, ticks: number }} TimedState */
/** @typedef {TimedState} GrillState */
/** items: what is in the pot, in order; ticks: cooking time so far. @typedef {{ items: string[], ticks: number }} PotState */
/** @typedef {import('./processes.js').PotDef} PotDef */
/** meat: a cone hangs on the spit; ticks: roasting time so far; slices: cuts left. @typedef {{ meat: boolean, ticks: number, slices: number }} SpitState */
/** @typedef {typeof TIMED[string]} TimedDef */
/** @typedef {{ item: string | null }} BoardState */
/** @typedef {{ items: string[] }} CounterState */
/** @typedef {{ plates: number, bowls: number, ticks: number }} DishwasherState */
/** @typedef {{ plates: number, bowls: number }} CabinetState */
/** @typedef {'plate' | 'bowl' | 'box'} CabinetChoice */
/** open: ticks the lid stays up (the trash can stores nothing else). @typedef {{ open: number }} TrashState */

export const COUNTER_MAX = 8;
/** Layers the counter shows at most (block state `kochmod:layers`). */
export const COUNTER_LAYERS = 6;
/** Counter view families (block state `kochmod:family`), 'none' first as the default. */
export const COUNTER_FAMILIES = /** @type {const} */ (['none', 'burger', 'pizza', 'doner', 'sushi']);
/** @typedef {typeof COUNTER_FAMILIES[number]} CounterFamily */
/** Base item -> the family whose stack the counter shows. Plain ids: some of them join the catalog later. */
const FAMILY_BASES = /** @type {Record<string, CounterFamily>} */ ({
  'kochmod:bun': 'burger',
  'kochmod:dough': 'pizza',
  'kochmod:pita': 'doner',
  'kochmod:nori': 'sushi',
});
/** Ticks a dishwasher needs (10 s). */
export const WASH_TICKS = 200;
export const DISHWASHER_MAX = 4;
export const CABINET_MAX = 8;
export const CABINET_CHOICES = /** @type {const} */ (['plate', 'bowl', 'box']);

/** A player who carries nothing: only the held item counts. */
export const NO_CARRY = (/** @type {string} */ _id) => false;

/**
 * The first of `tools` that is in hand, else the first the inventory carries.
 * @param {string | null} held
 * @param {Carried} carried
 * @param {string[]} tools
 * @returns {{ id: string, inHand: boolean } | null}
 */
export function findTool(held, carried, tools) {
  const inHand = tools.find((t) => t === held);
  if (inHand !== undefined) return { id: inHand, inHand: true };
  const inBag = tools.find((t) => carried(t));
  return inBag === undefined ? null : { id: inBag, inHand: false };
}

const ID = {
  rawPatty: 'kochmod:raw_patty', // what a stage 1 grill was cooking
  dirtyPlate: 'kochmod:dirty_plate',
  cleanPlate: 'kochmod:clean_plate',
};

/** Every ingredient and prepared item of the catalog (no tools, dishes or plates): what counter and pot take. */
function isFood(/** @type {string} */ id) {
  return Object.hasOwn(ITEMS, id) && (ITEMS[id].kind === 'ingredient' || ITEMS[id].kind === 'prepared');
}

// ---- Timed stations (grill, oven)

/**
 * A station that cooks one item by time, built from a `TIMED` row. Unknown stored items never throw:
 * they show as raw and come back unchanged.
 * @param {TimedDef} def
 */
export function timedStation(def) {
  /** @type {TimedState} */
  const initial = { item: null, ticks: 0 };
  /** @param {string} item @param {number} ticks @returns {string} what the item has become */
  const resultOf = (item, ticks) => {
    if (!Object.hasOwn(def.accepts, item)) return item;
    const out = def.accepts[item];
    return { raw: item, cooked: out.cooked, burnt: out.burnt }[cookStage(ticks)];
  };
  /** @param {string | null} held */
  const accepted = (held) => held !== null && Object.hasOwn(def.accepts, held);
  return {
    INITIAL: initial,
    /**
     * @param {TimedState} state
     * @param {string | null} held
     * @param {Carried} [carried]
     * @returns {Result<TimedState>}
     */
    interact(state, held, carried = NO_CARRY) {
      if (state.item === null) {
        if (accepted(held)) return { state: { item: /** @type {string} */ (held), ticks: 0 }, take: true, sound: def.sound };
        return { state };
      }
      if (accepted(held)) return { state, hint: def.hintFull };
      if (findTool(held, carried, def.tools)) return { state: { item: null, ticks: 0 }, give: resultOf(state.item, state.ticks) };
      return { state, hint: def.hintTool };
    },
    /**
     * @param {TimedState} state
     * @param {number} dt
     * @returns {TimedState}
     */
    tick(state, dt) {
      if (state.item === null) return state;
      return { item: state.item, ticks: Math.min(state.ticks + dt, BURNT_AT) };
    },
    /**
     * @param {TimedState} state
     * @returns {'empty' | 'raw' | 'cooked' | 'burnt'}
     */
    view(state) {
      if (state.item === null) return 'empty';
      return Object.hasOwn(def.accepts, state.item) ? cookStage(state.ticks) : 'raw';
    },
    /**
     * @param {TimedState} state
     * @returns {string[]}
     */
    drops(state) {
      return state.item === null ? [] : [resultOf(state.item, state.ticks)];
    },
  };
}

export const grill = timedStation(TIMED.grill);
export const grillInteract = grill.interact;
export const grillTick = grill.tick;
export const grillView = grill.view;
export const grillDrops = grill.drops;

export const oven = timedStation(TIMED.oven);
export const fryer = timedStation(TIMED.fryer);

// ---- Pot stations (soup pot, wok)

/**
 * A station that cooks a mix of up to `def.max` items by time; the tool scoops out what the mix has become.
 * Unknown stored items never throw: they make a failed dish and drop unchanged.
 * @param {PotDef} def
 */
export function potStation(def) {
  /** @type {PotState} */
  const initial = { items: [], ticks: 0 };
  return {
    INITIAL: initial,
    /**
     * @param {PotState} state
     * @param {string | null} held
     * @param {Carried} [carried]
     * @returns {Result<PotState>}
     */
    interact(state, held, carried = NO_CARRY) {
      const { items, ticks } = state;
      const tool = isFood(held ?? '') ? null : findTool(held, carried, def.tools);
      if (tool) {
        if (items.length === 0) return { state, hint: def.hints.empty };
        if (ticks < COOKED_AT) return { state, hint: def.hints.cooking };
        const give = cookStage(ticks) === 'burnt' ? FAILED : evaluateFor(def.recipes, items);
        if (!def.consumesTool) return { state: initial, give };
        return tool.inHand ? { state: initial, take: true, give } : { state: initial, consume: tool.id, give };
      }
      if (held === null) return items.length === 0 ? { state } : { state, hint: def.hints.needTool };
      if (!isFood(held)) return { state };
      if (items.length >= def.max) return { state, hint: def.hints.full };
      if (ticks >= COOKED_AT) return { state, hint: def.hints.cooking };
      return { state: { items: [...items, held], ticks }, take: true, sound: def.sound };
    },
    /**
     * @param {PotState} state
     * @param {number} dt
     * @returns {PotState}
     */
    tick(state, dt) {
      if (state.items.length === 0) return state;
      return { items: state.items, ticks: Math.min(state.ticks + dt, BURNT_AT) };
    },
    /**
     * @param {PotState} state
     * @returns {'empty' | 'raw' | 'cooking' | 'done' | 'burnt'}
     */
    view(state) {
      if (state.items.length === 0) return 'empty';
      if (state.ticks < COOKED_AT / 2) return 'raw';
      if (state.ticks < COOKED_AT) return 'cooking';
      return state.ticks < BURNT_AT ? 'done' : 'burnt';
    },
    /**
     * @param {PotState} state
     * @returns {string[]}
     */
    drops(state) {
      return [...state.items];
    },
  };
}

export const POT_MAX = POT_DEF.max;
export const pot = potStation(POT_DEF);
export const potInteract = pot.interact;
export const potTick = pot.tick;
export const potView = pot.view;
export const potDrops = pot.drops;

export const WOK_MAX = WOK_DEF.max;
export const wok = potStation(WOK_DEF);
export const wokInteract = wok.interact;
export const wokTick = wok.tick;
export const wokView = wok.view;
export const wokDrops = wok.drops;

// ---- Doner spit

/** How many doner meat slices one cone gives. */
export const SPIT_SLICES = 6;

/** @type {SpitState} */
const SPIT_EMPTY = { meat: false, ticks: 0, slices: 0 };

/**
 * Raw meat goes on an empty spit; the multitool cuts cooked meat off, one slice at a time.
 * @param {SpitState} state
 * @param {string | null} held
 * @param {Carried} [carried]
 * @returns {Result<SpitState>}
 */
export function spitInteract(state, held, carried = NO_CARRY) {
  if (held === SPIT.raw) {
    if (state.meat) return { state, hint: 'kochmod.hint.spit_busy' };
    return { state: { meat: true, ticks: 0, slices: SPIT_SLICES }, take: true };
  }
  if (!findTool(held, carried, SPIT.tools)) return { state };
  if (!state.meat) return { state, hint: 'kochmod.hint.spit_empty' };
  if (state.ticks < COOKED_AT) return { state, hint: 'kochmod.hint.spit_raw' };
  const slices = state.slices - 1;
  return { state: slices > 0 ? { ...state, slices } : SPIT_EMPTY, give: SPIT.cooked };
}

/**
 * Roasts while meat hangs on the spit, up to COOKED_AT: the meat never burns.
 * @param {SpitState} state
 * @param {number} dt
 * @returns {SpitState}
 */
export function spitTick(state, dt) {
  if (!state.meat || state.ticks >= COOKED_AT) return state;
  return { ...state, ticks: Math.min(state.ticks + dt, COOKED_AT) };
}

/**
 * @param {SpitState} state
 * @returns {'empty' | 'raw' | 'cooked'}
 */
export function spitView(state) {
  if (!state.meat) return 'empty';
  return state.ticks < COOKED_AT ? 'raw' : 'cooked';
}

/**
 * Raw meat comes back as the one cone that went on (it cannot be cut yet); cooked meat as the slices left.
 * @param {SpitState} state
 * @returns {string[]}
 */
export function spitDrops(state) {
  if (!state.meat) return [];
  return state.ticks < COOKED_AT ? [SPIT.raw] : Array(state.slices).fill(SPIT.cooked);
}

/** The spit's rules as one station (for the tick loop). */
export const spit = { INITIAL: SPIT_EMPTY, interact: spitInteract, tick: spitTick, view: spitView, drops: spitDrops };

/** @type {{ grill: GrillState, oven: TimedState, fryer: TimedState, pot: PotState, wok: PotState, spit: SpitState, board: BoardState, counter: CounterState, dishwasher: DishwasherState, cabinet: CabinetState, trash: TrashState }} */
export const INITIAL = {
  grill: grill.INITIAL,
  oven: oven.INITIAL,
  fryer: fryer.INITIAL,
  pot: pot.INITIAL,
  wok: wok.INITIAL,
  spit: SPIT_EMPTY,
  board: { item: null },
  counter: { items: [] },
  dishwasher: { plates: 0, bowls: 0, ticks: 0 },
  cabinet: { plates: CABINET_MAX, bowls: CABINET_MAX }, // a placed cabinet comes full of clean plates and bowls
  trash: { open: 0 },
};

// ---- Cutting board

/**
 * @param {BoardState} state
 * @param {string | null} held
 * @param {Carried} [carried]
 * @returns {Result<BoardState>}
 */
export function boardInteract(state, held, carried = NO_CARRY) {
  const cuttable = held !== null && Object.hasOwn(CUTTABLE, held);
  if (state.item === null) {
    if (cuttable) return { state: { item: held }, take: true };
    return { state };
  }
  if (Object.hasOwn(CUTTABLE, state.item) && findTool(held, carried, CUT_TOOLS)) {
    return { state: { item: CUTTABLE[state.item] }, sound: 'kochmod.chop' };
  }
  if (held === null) return { state: { item: null }, give: state.item };
  if (cuttable) return { state, hint: 'kochmod.hint.board_full' };
  return { state };
}

/**
 * Unknown stored ids show as whole.
 * @param {BoardState} state
 * @returns {'empty' | 'whole' | 'cut'}
 */
export function boardView(state) {
  if (state.item === null) return 'empty';
  if (Object.values(CUTTABLE).includes(state.item)) return 'cut';
  return 'whole';
}

/**
 * @param {BoardState} state
 * @returns {string[]}
 */
export function boardDrops(state) {
  return state.item === null ? [] : [state.item];
}

// ---- Counter

/**
 * @param {CounterState} state
 * @param {string | null} held
 * @param {Carried} [_carried] ignored: same signature as every station
 * @returns {Result<CounterState>}
 */
export function counterInteract(state, held, _carried = NO_CARRY) {
  if (held === null) {
    if (state.items.length === 0) return { state };
    return { state: { items: [] }, give: evaluateAssembly(state.items), sound: 'kochmod.plate' };
  }
  if (!isFood(held)) return { state };
  if (state.items.length >= COUNTER_MAX) return { state, hint: 'kochmod.hint.counter_full' };
  return { state: { items: [...state.items, held] }, take: true };
}

/**
 * The stack on the counter: the family of the first base item (a stack without one shows as a burger),
 * one layer per item up to COUNTER_LAYERS.
 * @param {CounterState} state
 * @returns {{ family: CounterFamily, layers: number }}
 */
export function counterView(state) {
  const { items } = state;
  if (items.length === 0) return { family: 'none', layers: 0 };
  const base = items.find((id) => Object.hasOwn(FAMILY_BASES, id));
  return { family: base ? FAMILY_BASES[base] : 'burger', layers: Math.min(items.length, COUNTER_LAYERS) };
}

/**
 * @param {CounterState} state
 * @returns {string[]}
 */
export function counterDrops(state) {
  return [...state.items];
}

// ---- Dishwasher

/**
 * @param {DishwasherState} state
 * @param {string | null} held
 * @param {Carried} [_carried] ignored: same signature as every station
 * @returns {Result<DishwasherState>}
 */
export function dishwasherInteract(state, held, _carried = NO_CARRY) {
  if (held === ID.dirtyPlate || held === DIRTY_BOWL) {
    if (state.plates + state.bowls >= DISHWASHER_MAX) return { state, hint: 'kochmod.hint.dishwasher_full' };
    const next = held === DIRTY_BOWL
      ? { plates: state.plates, bowls: state.bowls + 1, ticks: 0 }
      : { plates: state.plates + 1, bowls: state.bowls, ticks: 0 };
    return { state: next, take: true, sound: 'kochmod.bubble' };
  }
  if (held === null && state.plates + state.bowls > 0) {
    if (state.ticks >= WASH_TICKS) {
      const gives = [];
      if (state.plates > 0) gives.push({ item: ID.cleanPlate, count: state.plates });
      if (state.bowls > 0) gives.push({ item: SOUP_BOWL, count: state.bowls });
      return { state: INITIAL.dishwasher, gives };
    }
    return { state, hint: 'kochmod.hint.washing' };
  }
  return { state };
}

/**
 * @param {DishwasherState} state
 * @param {number} dt
 * @returns {DishwasherState}
 */
export function dishwasherTick(state, dt) {
  if (state.plates + state.bowls === 0) return state;
  return { plates: state.plates, bowls: state.bowls, ticks: Math.min(state.ticks + dt, WASH_TICKS) };
}

/**
 * @param {DishwasherState} state
 * @returns {'empty' | 'running' | 'done'}
 */
export function dishwasherView(state) {
  if (state.plates + state.bowls === 0) return 'empty';
  return state.ticks >= WASH_TICKS ? 'done' : 'running';
}

/**
 * @param {DishwasherState} state
 * @returns {string[]}
 */
export function dishwasherDrops(state) {
  const done = dishwasherView(state) === 'done';
  return [
    ...Array(state.plates).fill(done ? ID.cleanPlate : ID.dirtyPlate),
    ...Array(state.bowls).fill(done ? SOUP_BOWL : DIRTY_BOWL),
  ];
}

// ---- Dish cabinet

/**
 * Putting a plate or bowl in; an empty hand asks for the menu (see cabinetTake).
 * @param {CabinetState} state
 * @param {string | null} held
 * @param {Carried} [_carried] ignored: same signature as every station
 * @returns {Result<CabinetState>}
 */
export function cabinetInteract(state, held, _carried = NO_CARRY) {
  if (held === ID.cleanPlate) {
    if (state.plates >= CABINET_MAX) return { state, hint: 'kochmod.hint.cabinet_full' };
    return { state: { ...state, plates: state.plates + 1 }, take: true, sound: 'kochmod.plate' };
  }
  if (held === SOUP_BOWL) {
    if (state.bowls >= CABINET_MAX) return { state, hint: 'kochmod.hint.cabinet_full' };
    return { state: { ...state, bowls: state.bowls + 1 }, take: true, sound: 'kochmod.plate' };
  }
  if (held === null) return { state, menu: true };
  return { state };
}

/**
 * The picture menu of the cabinet: plate and bowl with their counts, the pizza box without.
 * @param {CabinetState} state
 * @returns {{ title: string, buttons: { choice: CabinetChoice, label: import('@minecraft/server').RawMessage, icon: string }[] }}
 */
export function cabinetMenu(state) {
  /** @type {Record<CabinetChoice, { item: string, count?: number }>} */
  const look = {
    plate: { item: ID.cleanPlate, count: state.plates },
    bowl: { item: SOUP_BOWL, count: state.bowls },
    box: { item: PIZZA_BOX },
  };
  return {
    title: 'kochmod.crate.cabinet',
    buttons: CABINET_CHOICES.map((choice) => {
      const { item, count } = look[choice];
      const name = { translate: `item.${item}` };
      return {
        choice,
        label: count === undefined ? name : { rawtext: [name, { text: ` (${count})` }] },
        icon: `textures/items/${item.replace('kochmod:', '')}`,
      };
    }),
  };
}

/**
 * Takes the chosen item out of the cabinet (boxes are unlimited).
 * @param {CabinetState} state
 * @param {CabinetChoice} choice
 * @returns {Result<CabinetState>}
 */
export function cabinetTake(state, choice) {
  if (choice === 'box') return { state, give: PIZZA_BOX };
  if (choice === 'bowl') {
    if (state.bowls === 0) return { state, hint: 'kochmod.hint.cabinet_no_bowls' };
    return { state: { ...state, bowls: state.bowls - 1 }, give: SOUP_BOWL };
  }
  if (state.plates === 0) return { state, hint: 'kochmod.hint.cabinet_empty' };
  return { state: { ...state, plates: state.plates - 1 }, give: ID.cleanPlate };
}

/**
 * Number of plates shown in the cabinet (block state `kochmod:plates`).
 * @param {CabinetState} state
 * @returns {number}
 */
export function cabinetView(state) {
  return state.plates;
}

/**
 * @param {CabinetState} state
 * @returns {string[]}
 */
export function cabinetDrops(state) {
  return [...Array(state.plates).fill(ID.cleanPlate), ...Array(state.bowls).fill(SOUP_BOWL)];
}

// ---- Trash can

/** Ticks the lid stays up after a throw. The station tick runs every 10 ticks, so it is visible for 10–20 ticks. */
export const TRASH_LID_TICKS = 20;

/**
 * One held item disappears for good (any id, also unknown ones), with sound, a smoke puff and the lid
 * popping up. Tools, Baukästen and the recipe book (catalog kinds 'tool' and 'misc') are refused, an empty
 * hand gets a hint; a refusal keeps the given state.
 * @param {string | null} held
 * @param {TrashState} [state]
 * @returns {Result<TrashState>}
 */
export function trashInteract(held, state = INITIAL.trash) {
  if (held === null) return { state, hint: 'kochmod.hint.trash_empty_hand' };
  const kind = Object.hasOwn(ITEMS, held) ? ITEMS[held].kind : undefined;
  if (kind === 'tool' || kind === 'misc') return { state, hint: 'kochmod.hint.trash_no_tools' };
  return { state: { open: TRASH_LID_TICKS }, take: true, sound: 'kochmod.trash', particle: 'minecraft:basic_smoke_particle' };
}

/**
 * The lid closes by itself; a closed lid comes back as the same object.
 * @param {TrashState} state
 * @param {number} dt
 * @returns {TrashState}
 */
export function trashTick(state, dt) {
  if (state.open === 0) return state;
  return { open: Math.max(0, state.open - dt) };
}

/**
 * Block states of the trash can.
 * @param {TrashState} state
 * @returns {{ 'kochmod:open': boolean }}
 */
export function trashView(state) {
  return { 'kochmod:open': state.open > 0 };
}

/**
 * Nothing is stored, so a broken trash can drops nothing.
 * @param {TrashState} _state
 * @returns {string[]}
 */
export function trashDrops(_state) {
  return [];
}

/** The trash can's rules as one station (for the station glue and the tick loop). */
export const trash = {
  INITIAL: INITIAL.trash,
  /** @param {TrashState} state @param {string | null} held @param {Carried} [_carried] @returns {Result<TrashState>} */
  interact: (state, held, _carried) => trashInteract(held, state),
  tick: trashTick,
  view: trashView,
  drops: trashDrops,
};

// ---- Saved states from stage 1

/** @param {unknown} v @returns {v is Record<string, unknown>} */
const isRecord = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
/** @param {unknown} v @returns {v is number} */
const isCount = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** Saved shape of every timed station. */
const validTimed = (/** @type {Record<string, unknown>} */ s) => (s.item === null || typeof s.item === 'string') && isCount(s.ticks);

/** Saved shape of every pot station. */
const validPot = (/** @type {Record<string, unknown>} */ s) => Array.isArray(s.items) && s.items.every((i) => typeof i === 'string') && isCount(s.ticks);

/** Shape checks of the current saved states. @type {{ [K in keyof typeof INITIAL]: (s: Record<string, unknown>) => boolean }} */
const VALID = {
  grill: validTimed,
  oven: validTimed,
  fryer: validTimed,
  pot: validPot,
  wok: validPot,
  spit: (s) => typeof s.meat === 'boolean' && isCount(s.ticks) && isCount(s.slices) && Number.isInteger(s.slices)
    && /** @type {number} */ (s.slices) <= SPIT_SLICES && s.meat === /** @type {number} */ (s.slices) > 0,
  board: (s) => s.item === null || typeof s.item === 'string',
  counter: (s) => Array.isArray(s.items) && s.items.every((i) => typeof i === 'string'),
  dishwasher: (s) => isCount(s.plates) && isCount(s.bowls) && isCount(s.ticks),
  cabinet: (s) => isCount(s.plates) && isCount(s.bowls),
  trash: (s) => isCount(s.open),
};

/**
 * Turns a loaded station state into the current shape. Current shapes come back as the same object;
 * the stage 1 grill `{ occupied, ticks }` becomes a raw patty on the grill; anything unreadable becomes INITIAL.
 * @template {keyof typeof INITIAL} K
 * @param {K} kind
 * @param {unknown} saved
 * @returns {typeof INITIAL[K]}
 */
export function migrateStationState(kind, saved) {
  if (!isRecord(saved)) return INITIAL[kind];
  if (VALID[kind](saved)) return /** @type {typeof INITIAL[K]} */ (/** @type {unknown} */ (saved));
  if (kind === 'grill' && typeof saved.occupied === 'boolean') {
    if (!saved.occupied) return INITIAL[kind];
    return /** @type {typeof INITIAL[K]} */ ({ item: ID.rawPatty, ticks: isCount(saved.ticks) ? Math.min(saved.ticks, BURNT_AT) : 0 });
  }
  if (kind === 'cabinet' && isCount(saved.plates)) {
    return /** @type {typeof INITIAL[K]} */ (/** @type {unknown} */ ({ plates: saved.plates, bowls: CABINET_MAX }));
  }
  if (kind === 'dishwasher' && isCount(saved.plates) && isCount(saved.ticks)) {
    return /** @type {typeof INITIAL[K]} */ (/** @type {unknown} */ ({ plates: saved.plates, bowls: 0, ticks: saved.ticks }));
  }
  return INITIAL[kind];
}
