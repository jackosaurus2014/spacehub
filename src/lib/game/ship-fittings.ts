// ─── Space Tycoon: ship fittings — the server-registered module layer ───────
// Mining Phase D (docs/SPACE_MINING_DESIGN_2026-09-12.md §5 "Modules over new
// hulls", §8 row D; docs/STATS_DESIGN.md Phase IV "Modules").
//
// WHY THIS EXISTS. Phase C shipped refining and then deliberately did NOT ship
// yield-affecting modules, in as many words: "module fitting is client-owned
// condition today — the assets route says so and computes cargo capacity from
// the hull alone for exactly that reason. A yield-affecting module would
// therefore either be a forgeable claim or a quote the server refuses to
// honour. Modules wait for a server-registered fitting table." This file is
// that table's pure half.
//
// THE BOUNDARY WITH modules.ts (v1). `modules.ts` stays exactly as it is: a
// CLIENT-owned inventory of salvage/shop modules whose only engine effects are
// the LEGACY parked-ship trickle (game-engine.ts §ship mining), freight cargo
// capacity (cargo-logistics.ts getShipCargoCapacity) and display. It is never
// consulted by a Mining Order. A FITTING, by contrast, is a row in the
// `ShipFitting` table written only by /api/space-tycoon/assets/fitting, and it
// is the ONLY thing that can change a Mining Order's yield, hold, plant,
// sweep, propellant bill or shakedown odds. Two layers, one rule: if the
// server did not write it, the mining loop does not read it.
//
// HOW IT REACHES THE ENGINE. There is no parallel yield formula. A fitting
// produces an EFFECTIVE ShipDefinition (`effectiveShipDefinition`) plus two
// leg terms (`fittingFuelMult`, `fittingTransitMult`) and one lane term
// (`fittingShakedownMult`), and those are fed into the SAME
// mining-orders.ts `planMiningOrder` both sides already run. The server quotes
// with the fitting it has on file; the client previews with the mirror the
// sync handed it. Identical inputs → identical schedule, fuel bill and fill.
//
// THE TRADE-OFF (CLAUDE.md "meaningful decisions"). Three things stop fitting
// from being a strictly-additive upgrade:
//   1. SLOT POINTS. A hull's budget is `getShipDerivedStats(def).moduleSlots`
//      (role+tier: mining/survey 3+tier, everything else 2+tier). The strong
//      fittings cost TWO points, so a five-point Prospector Barge cannot take
//      five of anything.
//   2. ONE PER GROUP. Every fitting belongs to an exclusive group (extraction,
//      hold, plant, sensor, armour, drive). A hull may carry at most one from
//      each. You choose a bore array OR an ice extractor, never both.
//   3. MASS. Every slot point consumed adds FITTING_SLOT_FUEL_PENALTY to the
//      propellant bill of EVERY leg that hull ever flies. A fully fitted rig
//      is a more expensive rig to move, forever.
// On top of that most fittings carry an explicit opposing effect (a bore array
// costs hold and hull life; a compactor costs propellant; a Hall cluster is
// fast and thirsty), and each one bills FITTING_UPKEEP_SHARE of its price
// every game-month for as long as it is bolted on.
//
// Pure data + pure functions. No React, no DB, no clock beyond what is passed.

import type { AsteroidClass } from './asteroids';
import { MOBILE_REFINERY_RECOVERY, FIXED_REFINERY_RECOVERY } from './ore-refining';
import { SHIP_MAP, getShipDerivedStats, type ShipDefinition, type ShipHardpointType, type ShipRole } from './ships';

// ─── Tunables ────────────────────────────────────────────────────────────────

/** Propellant penalty per SLOT POINT consumed, on every leg. Slot points are
 *  the mass model: there is no second mass number to keep in sync, and a
 *  five-point rig therefore flies at 1.15x the burn of a bare hull. Sized so
 *  a maxed Prospector Barge pays back about a sixth of a laser's gain in
 *  propellant — real friction, never a veto (docs/BALANCE.md Pass 16). */
export const FITTING_SLOT_FUEL_PENALTY = 0.03;

/** Yard labour on a refit, as a share of the fittings' price. */
export const FITTING_LABOUR_SHARE = 0.10;

/** Flat yard fee per refit visit, regardless of how much is bolted on. Makes
 *  "one visit, fit everything" the right call and stops slot-thrash. */
export const FITTING_YARD_FEE = 5_000_000;

/** What a stripped fitting recovers. Below book by design (a BALANCE.md
 *  money sink, the same posture as computeDecommissionRecovery). */
export const FITTING_SALVAGE_SHARE = 0.35;

/** Monthly upkeep per fitting, as a share of its price. 0.3% per game-month
 *  — the Escort Cutter's own ratio ($600K on a $260M hull = 0.23%), a shade
 *  higher because a bolted-on plant is harder to service than a hull. */
export const FITTING_UPKEEP_SHARE = 0.003;

/** A refit takes wall-clock time: this many real seconds per slot point,
 *  plus the fitting's own `installHours`. The hull cannot take an order
 *  while the yard has it (docs/SESSION_DESIGN.md: refits land on the DAILY
 *  loop — long enough to plan around, short enough to matter in a session). */
export const FITTING_SECONDS_PER_SLOT = 900;

/** A mobile plant can never be refitted past this. FIXED_REFINERY_RECOVERY
 *  (0.95) stays the fixed refinery's exclusive reward — a pod narrows the
 *  gap, it never closes it. */
export const FITTING_MAX_REFINERY_RECOVERY = 0.92;

/** Clamps on the stacked effect of everything bolted to one hull. Every
 *  consumer reads the clamped figures, never the raw sum. */
export const FITTING_CLAMPS = {
  oreRate: [0.40, 2.20] as const,
  cargo: [0.50, 2.00] as const,
  refineRate: [0.50, 2.00] as const,
  fuel: [0.70, 1.80] as const,
  transit: [0.75, 1.30] as const,
  shakedown: [0.25, 1.00] as const,
  hullWear: [0.50, 1.80] as const,
};

// ─── The registry ────────────────────────────────────────────────────────────

/** At most one fitting per group on a hull. */
export type FittingGroup = 'extraction' | 'hold' | 'plant' | 'sensor' | 'armour' | 'drive';

export const FITTING_GROUP_LABEL: Readonly<Record<FittingGroup, string>> = {
  extraction: 'Extraction head',
  hold: 'Hold',
  plant: 'Refinery plant',
  sensor: 'Sensor suite',
  armour: 'Armour & defence',
  drive: 'Drive',
};

export interface FittingEffects {
  /** Fractional change to `oreExtractionPerHour`, all classes. */
  oreRatePct?: number;
  /** Extra fractional change by the rock's SPECTRAL CLASS — the whole point
   *  of an ice extractor vs a magnetic rake. Sums with `oreRatePct`. */
  oreRateByClass?: Partial<Record<AsteroidClass, number>>;
  /** Fractional change to `cargoCapacity`. */
  cargoPct?: number;
  /** Fractional change to `refineOrePerHour`. */
  refineRatePct?: number;
  /** ADDITIVE change to the mobile plant's recovery (0.82 baseline), capped
   *  at FITTING_MAX_REFINERY_RECOVERY. */
  refineRecoveryAdd?: number;
  /** Extra rocks per survey pass (`surveySweep`). */
  surveySweepAdd?: number;
  /** Fractional change to the propellant bill per leg. Negative = cheaper. */
  fuelPct?: number;
  /** Fractional change to transit SECONDS per leg. Negative = faster. */
  transitPct?: number;
  /** Fractional change to NPC shakedown odds on the lane home. Negative =
   *  harder to shake down. Never applies to another player (docs/POLICY.md). */
  shakedownOddsPct?: number;
  /** Fractional change to rubble hull wear. Negative = tougher. */
  hullWearPct?: number;
}

export interface FittingDefinition {
  id: string;
  name: string;
  icon: string;
  group: FittingGroup;
  /** The hardpoint class the hull must expose (ships.ts hardpointTypes). */
  hardpoint: ShipHardpointType;
  /** Slot points consumed out of the hull's budget. */
  slotCost: 1 | 2;
  /** Flat floor of the price. */
  baseCost: number;
  /** Plus this share of the HOST HULL's own price — so one registry prices
   *  honestly on a $180M barge and on a $1B Deep Space Miner without a
   *  per-hull table (fittingPrice). */
  hullShare: number;
  /** Extra install time beyond FITTING_SECONDS_PER_SLOT x slotCost. */
  installHours: number;
  requiredResearch: string[];
  /** Roles that may carry it. Empty/absent = every role. */
  roles?: ShipRole[];
  description: string;
  /** The line the console shows under the name: what you give up. */
  tradeoff: string;
  effects: FittingEffects;
}

/**
 * Thirteen fittings across the six groups. Every one changes a quantity the
 * simulation ALREADY computes — extraction rate, hold size, plant throughput
 * and recovery, survey sweep, propellant, transit seconds, shakedown odds,
 * hull wear — and every one of the strong ones costs two slot points and
 * carries an explicit cost somewhere else.
 */
export const FITTINGS: readonly FittingDefinition[] = [
  // ── Extraction ────────────────────────────────────────────────────────────
  {
    id: 'fit_laser_cluster', name: 'Focused Laser Cluster', icon: '🎯',
    group: 'extraction', hardpoint: 'drone', slotCost: 1,
    baseCost: 20_000_000, hullShare: 0.28, installHours: 2,
    requiredResearch: ['resource_prospecting'], roles: ['mining'],
    description: 'A tighter beam and a bigger capacitor bank on the standard cutting head.',
    tradeoff: 'Nothing but the slot, the price and the mass — the honest baseline every other head is measured against.',
    effects: { oreRatePct: 0.25 },
  },
  {
    id: 'fit_bore_array', name: 'Deep Bore Array', icon: '🛠️',
    group: 'extraction', hardpoint: 'drone', slotCost: 2,
    baseCost: 40_000_000, hullShare: 0.72, installHours: 6,
    requiredResearch: ['asteroid_capture'], roles: ['mining'],
    description: 'Four percussive bores on deployable booms: it does not cut the rock, it takes it apart.',
    tradeoff: 'Two slots, a tenth of the hold to the boom stowage, and 40% more hull wear on a rubble field.',
    effects: { oreRatePct: 0.60, cargoPct: -0.10, hullWearPct: 0.40 },
  },
  {
    id: 'fit_ice_extractor', name: 'Volatile Ice Extractor', icon: '❄️',
    group: 'extraction', hardpoint: 'drone', slotCost: 1,
    baseCost: 25_000_000, hullShare: 0.32, installHours: 3,
    requiredResearch: ['regolith_processing'], roles: ['mining'],
    description: 'Sublimation hood and a cold trap. Built for carbonaceous rock and useless on a metal core.',
    tradeoff: 'Superb on C-types, a liability on M and X — the fit that makes the FIELD you work a decision.',
    effects: { oreRateByClass: { C: 0.50, S: 0.10, M: -0.12, X: -0.12 } },
  },
  {
    id: 'fit_magnetic_rake', name: 'Magnetic Rake', icon: '🧲',
    group: 'extraction', hardpoint: 'drone', slotCost: 1,
    baseCost: 28_000_000, hullShare: 0.34, installHours: 3,
    requiredResearch: ['magnetic_separation'], roles: ['mining'],
    description: 'A superconducting rake that pulls ferrous fines straight out of a rubble pile.',
    tradeoff: 'The mirror of the ice extractor: metal and silicate pay, volatiles and exotics do not.',
    effects: { oreRateByClass: { M: 0.50, S: 0.25, C: -0.15, X: -0.10 } },
  },

  // ── Hold ──────────────────────────────────────────────────────────────────
  {
    id: 'fit_ore_hold', name: 'Expanded Ore Hold', icon: '📦',
    group: 'hold', hardpoint: 'cargo', slotCost: 1,
    baseCost: 12_000_000, hullShare: 0.18, installHours: 2,
    requiredResearch: [], description: 'Extra bunkerage in the void between the frames.',
    tradeoff: 'A third more hold, but the cutting head has to share power with the conveyors.',
    effects: { cargoPct: 0.35, oreRatePct: -0.08 },
  },
  {
    id: 'fit_ore_compactor', name: 'Ore Compactor', icon: '🗜️',
    group: 'hold', hardpoint: 'cargo', slotCost: 2,
    baseCost: 30_000_000, hullShare: 0.46, installHours: 5,
    requiredResearch: ['zero_g_refining'],
    description: 'A ram press that crushes loose rubble into slugs before it ever reaches the hold.',
    tradeoff: 'Two slots and a heavier, thirstier ship — 8% more propellant on every leg on top of the mass.',
    effects: { cargoPct: 0.70, fuelPct: 0.08 },
  },

  // ── Plant ─────────────────────────────────────────────────────────────────
  {
    id: 'fit_refinery_pod', name: 'Auxiliary Refinery Pod', icon: '🏭',
    group: 'plant', hardpoint: 'utility', slotCost: 2,
    baseCost: 60_000_000, hullShare: 0.55, installHours: 8,
    requiredResearch: ['zero_g_refining'], roles: ['mining'],
    description: 'A second carbonyl column and a bigger slag chute bolted to the plant deck.',
    tradeoff: `Two slots and a tenth of the hold. Recovery rises toward ${Math.round(FITTING_MAX_REFINERY_RECOVERY * 100)}% — never to the ${Math.round(FIXED_REFINERY_RECOVERY * 100)}% a fixed refinery gets.`,
    effects: { refineRecoveryAdd: 0.05, refineRatePct: 0.25, cargoPct: -0.10 },
  },
  {
    id: 'fit_slag_recycler', name: 'Slag Recycler', icon: '♻️',
    group: 'plant', hardpoint: 'utility', slotCost: 1,
    baseCost: 25_000_000, hullShare: 0.26, installHours: 4,
    requiredResearch: ['zero_g_refining'], roles: ['mining'],
    description: 'Runs the tailings back through the column once more before they go over the side.',
    tradeoff: 'Cheaper than the pod and only one slot, but it costs plant throughput to run the second pass.',
    effects: { refineRecoveryAdd: 0.03, refineRatePct: -0.15 },
  },

  // ── Sensor ────────────────────────────────────────────────────────────────
  {
    id: 'fit_survey_array', name: 'Wide-Field Survey Array', icon: '📡',
    group: 'sensor', hardpoint: 'sensor', slotCost: 1,
    baseCost: 30_000_000, hullShare: 0.22, installHours: 3,
    requiredResearch: ['hyperspectral'], roles: ['survey', 'mining'],
    description: 'A second hyperspectral head on a short boom, staring off-axis.',
    tradeoff: 'Two more rocks a pass. On a single-rock hull it is two rocks instead of one, which is the whole gain.',
    effects: { surveySweepAdd: 2 },
  },
  {
    id: 'fit_gravimetric_boom', name: 'Gravimetric Boom', icon: '🛰️',
    group: 'sensor', hardpoint: 'sensor', slotCost: 2,
    baseCost: 70_000_000, hullShare: 0.42, installHours: 6,
    requiredResearch: ['hyperspectral'], roles: ['survey'],
    description: 'A forty-metre gradiometer boom that reads a rock\'s interior instead of its skin.',
    tradeoff: 'Four more rocks a pass, but the boom is a sail: 10% more propellant on every leg.',
    effects: { surveySweepAdd: 4, fuelPct: 0.10 },
  },

  // ── Armour ────────────────────────────────────────────────────────────────
  {
    id: 'fit_whipple_belt', name: 'Whipple Armour Belt', icon: '🛡️',
    group: 'armour', hardpoint: 'shield', slotCost: 1,
    baseCost: 18_000_000, hullShare: 0.24, installHours: 3,
    requiredResearch: ['spacecraft_armor'],
    description: 'Stand-off bumper plate around the hold and the plant deck.',
    tradeoff: 'A quarter off shakedown odds and a third off rubble wear — for a slot and 8% of the hold.',
    effects: { shakedownOddsPct: -0.25, hullWearPct: -0.35, cargoPct: -0.08 },
  },
  {
    id: 'fit_pd_turret', name: 'Point-Defence Turret', icon: '⚡',
    group: 'armour', hardpoint: 'shield', slotCost: 2,
    baseCost: 45_000_000, hullShare: 0.50, installHours: 6,
    requiredResearch: ['spacecraft_armor', 'autonomous_docking'],
    description: 'A tracking kinetic mount with its own radar. Against pirates and debris — never against a corporation.',
    tradeoff: 'Halves shakedown odds without an escort, but two slots and a cutting head that shares its power budget.',
    effects: { shakedownOddsPct: -0.50, oreRatePct: -0.05 },
  },

  // ── Drive ─────────────────────────────────────────────────────────────────
  {
    id: 'fit_ion_drive', name: 'High-Isp Ion Bank', icon: '🔋',
    group: 'drive', hardpoint: 'engine', slotCost: 1,
    baseCost: 35_000_000, hullShare: 0.30, installHours: 4,
    requiredResearch: ['electric_propulsion_sat'],
    description: 'Gridded ion thrusters in place of the chemical kick stage. Sips propellant; takes its time.',
    tradeoff: 'A fifth off the propellant bill for a tenth more transit time on every leg.',
    effects: { fuelPct: -0.20, transitPct: 0.10 },
  },
  {
    id: 'fit_hall_cluster', name: 'Hall Thruster Cluster', icon: '🚀',
    group: 'drive', hardpoint: 'engine', slotCost: 2,
    baseCost: 55_000_000, hullShare: 0.52, installHours: 5,
    requiredResearch: ['nuclear_thermal'],
    description: 'Six high-power Hall thrusters on a shared bus. The fit for a lane you run every day.',
    tradeoff: 'A fifth off transit time and 18% MORE propellant — the exact opposite trade to the ion bank.',
    effects: { transitPct: -0.20, fuelPct: 0.18 },
  },
];

export const FITTING_MAP: ReadonlyMap<string, FittingDefinition> =
  new Map(FITTINGS.map(f => [f.id, f]));

// ─── Price, upkeep and time ──────────────────────────────────────────────────

/** What one fitting costs on THIS hull: a flat floor plus a share of the
 *  hull's own price. One registry, honest on a barge and on a flagship. */
export function fittingPrice(def: FittingDefinition, hull: Pick<ShipDefinition, 'baseCost'>): number {
  const hullCost = Number.isFinite(hull.baseCost) && hull.baseCost > 0 ? hull.baseCost : 0;
  return Math.round(def.baseCost + def.hullShare * hullCost);
}

/** Σ of the prices of a fit, on this hull. */
export function fittingSetPrice(ids: readonly string[], hull: Pick<ShipDefinition, 'baseCost'>): number {
  let total = 0;
  for (const id of ids) {
    const def = FITTING_MAP.get(id);
    if (def) total += fittingPrice(def, hull);
  }
  return total;
}

/** The bill for a refit: the NEW fittings' price + yard labour on it + the
 *  flat visit fee, minus salvage on everything being taken OFF. Never below
 *  zero — a strip-only visit still pays the yard fee, and a strip that
 *  salvages more than the fee is worth returns the difference (see
 *  `refund`). */
export interface RefitQuote {
  /** Fittings added by this visit. */
  added: string[];
  /** Fittings removed by this visit. */
  removed: string[];
  /** Price of the added fittings. */
  hardware: number;
  labour: number;
  yardFee: number;
  /** Salvage credited back for the removed fittings. */
  salvage: number;
  /** Net cash the player pays (0 when salvage covers the bill). */
  cost: number;
  /** Net cash the player receives (0 unless salvage exceeded the bill). */
  refund: number;
  /** Real seconds in the yard. */
  seconds: number;
  /** Slot points the resulting fit consumes. */
  slotsUsed: number;
  /** Ongoing upkeep of the resulting fit, per game-month. */
  upkeepPerMonth: number;
}

export function quoteRefit(
  hull: Pick<ShipDefinition, 'baseCost'>,
  currentIds: readonly string[],
  nextIds: readonly string[],
): RefitQuote {
  const cur = new Set(currentIds);
  const next = new Set(nextIds);
  const added = Array.from(next).filter(id => !cur.has(id) && FITTING_MAP.has(id));
  const removed = Array.from(cur).filter(id => !next.has(id) && FITTING_MAP.has(id));
  const hardware = fittingSetPrice(added, hull);
  const labour = Math.round(hardware * FITTING_LABOUR_SHARE);
  const yardFee = added.length === 0 && removed.length === 0 ? 0 : FITTING_YARD_FEE;
  const salvage = Math.round(fittingSetPrice(removed, hull) * FITTING_SALVAGE_SHARE);
  const gross = hardware + labour + yardFee;
  const net = gross - salvage;
  let seconds = 0;
  for (const id of [...added, ...removed]) {
    const def = FITTING_MAP.get(id);
    if (!def) continue;
    seconds += FITTING_SECONDS_PER_SLOT * def.slotCost + Math.round(def.installHours * 3600);
  }
  return {
    added, removed, hardware, labour, yardFee, salvage,
    cost: Math.max(0, net), refund: Math.max(0, -net),
    seconds,
    slotsUsed: slotsUsedBy(nextIds),
    upkeepPerMonth: fittingUpkeep(nextIds, hull),
  };
}

/** Upkeep of a fit, per game-month, on this hull. */
export function fittingUpkeep(ids: readonly string[], hull: Pick<ShipDefinition, 'baseCost'>): number {
  return Math.round(fittingSetPrice(ids, hull) * FITTING_UPKEEP_SHARE);
}

// ─── Slots and validation ────────────────────────────────────────────────────

/**
 * A hull's slot budget. Deliberately the DERIVED stat the ship table already
 * carries (ships.ts ROLE_PROFILE: mining/survey 3 + tier, every other role
 * 2 + tier, with per-hull overrides like the Refinery Barge's 4 and the
 * Hauler's 3). Re-deriving it here would silently re-budget every hull in
 * ModulesPanel as well, so it is read, not redefined.
 */
export function hullSlotBudget(def: ShipDefinition): number {
  try {
    const s = getShipDerivedStats(def).moduleSlots;
    return Number.isFinite(s) && s > 0 ? Math.floor(s) : 0;
  } catch {
    return 0;
  }
}

export function slotsUsedBy(ids: readonly string[]): number {
  let used = 0;
  for (const id of ids) {
    const def = FITTING_MAP.get(id);
    if (def) used += def.slotCost;
  }
  return used;
}

export type FittingError =
  | 'unknown_hull'
  | 'unknown_fitting'
  | 'duplicate_fitting'
  | 'group_conflict'
  | 'no_hardpoint'
  | 'role_incompatible'
  | 'research_missing'
  | 'slots_exceeded'
  | 'too_many'
  | 'no_change';

export const FITTING_ERROR_TEXT: Readonly<Record<FittingError, string>> = {
  unknown_hull: 'Unknown hull.',
  unknown_fitting: 'That fitting is not in the registry.',
  duplicate_fitting: 'A hull carries at most one of each fitting.',
  group_conflict: 'Only one fitting per group — strip the one already in that group first.',
  no_hardpoint: 'This hull has no hardpoint of that class.',
  role_incompatible: 'That fitting does not belong on this class of hull.',
  research_missing: 'The research that unlocks that fitting is not complete.',
  slots_exceeded: 'That fit exceeds the hull\'s slot budget.',
  too_many: 'Too many fittings in one refit.',
  no_change: 'That hull already carries exactly that fit.',
};

/** Hard bound on a single refit request (a defensive cap, not a design one —
 *  the slot budget binds long before this). */
export const MAX_FITTINGS_PER_HULL = 8;

export interface FittingValidation {
  ok: boolean;
  error?: FittingError;
  /** The offending fitting id, when there is one. */
  detail?: string;
  slotsUsed: number;
  slotBudget: number;
}

/**
 * Validate a proposed fit against a hull and a research list. The SERVER
 * runs this against its own registry view; the client runs the identical
 * function for the preview, so a refusal is never a surprise.
 */
export function validateFit(
  hull: ShipDefinition | undefined,
  ids: readonly string[],
  completedResearch: readonly string[] = [],
): FittingValidation {
  if (!hull) return { ok: false, error: 'unknown_hull', slotsUsed: 0, slotBudget: 0 };
  const budget = hullSlotBudget(hull);
  if (ids.length > MAX_FITTINGS_PER_HULL) return { ok: false, error: 'too_many', slotsUsed: 0, slotBudget: budget };
  const stats = getShipDerivedStats(hull);
  const research = new Set(completedResearch);
  const seen = new Set<string>();
  const groups = new Set<FittingGroup>();
  let used = 0;
  for (const id of ids) {
    const def = FITTING_MAP.get(id);
    if (!def) return { ok: false, error: 'unknown_fitting', detail: id, slotsUsed: used, slotBudget: budget };
    if (seen.has(id)) return { ok: false, error: 'duplicate_fitting', detail: id, slotsUsed: used, slotBudget: budget };
    seen.add(id);
    if (groups.has(def.group)) return { ok: false, error: 'group_conflict', detail: id, slotsUsed: used, slotBudget: budget };
    groups.add(def.group);
    if (!stats.hardpointTypes.includes(def.hardpoint)) return { ok: false, error: 'no_hardpoint', detail: id, slotsUsed: used, slotBudget: budget };
    if (def.roles && def.roles.length > 0 && !def.roles.includes(hull.role)) return { ok: false, error: 'role_incompatible', detail: id, slotsUsed: used, slotBudget: budget };
    for (const r of def.requiredResearch) {
      if (!research.has(r)) return { ok: false, error: 'research_missing', detail: r, slotsUsed: used, slotBudget: budget };
    }
    used += def.slotCost;
  }
  if (used > budget) return { ok: false, error: 'slots_exceeded', slotsUsed: used, slotBudget: budget };
  return { ok: true, slotsUsed: used, slotBudget: budget };
}

/** Normalize a client-supplied id list: strings only, known ids only,
 *  de-duplicated, bounded. Shape validation — `validateFit` decides legality. */
export function sanitizeFittingIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== 'string' || !FITTING_MAP.has(v) || out.includes(v)) continue;
    out.push(v);
    if (out.length >= MAX_FITTINGS_PER_HULL) break;
  }
  return out;
}

// ─── The effect math ─────────────────────────────────────────────────────────

/** The stacked, clamped effect of one hull's fit. Every consumer reads this
 *  — there is no second place where a fitting's numbers are combined. */
export interface FittingProfile {
  ids: string[];
  slotsUsed: number;
  /** Multiplier on `oreExtractionPerHour` for a rock of unknown class. */
  oreRateMult: number;
  /** Multiplier on `cargoCapacity`. */
  cargoMult: number;
  /** Multiplier on `refineOrePerHour`. */
  refineRateMult: number;
  /** The mobile plant's recovery for this hull (0.82 baseline). */
  refineRecovery: number;
  /** Extra rocks per survey pass. */
  surveySweepAdd: number;
  /** Multiplier on the propellant bill per leg (includes the mass penalty). */
  fuelMult: number;
  /** Multiplier on transit seconds per leg. */
  transitMult: number;
  /** Multiplier on NPC shakedown odds. */
  shakedownMult: number;
  /** Multiplier on rubble hull wear. */
  hullWearMult: number;
}

export const NEUTRAL_FITTING_PROFILE: FittingProfile = {
  ids: [], slotsUsed: 0,
  oreRateMult: 1, cargoMult: 1, refineRateMult: 1,
  refineRecovery: MOBILE_REFINERY_RECOVERY,
  surveySweepAdd: 0, fuelMult: 1, transitMult: 1, shakedownMult: 1, hullWearMult: 1,
};

const clamp = (v: number, range: readonly [number, number]): number =>
  Math.max(range[0], Math.min(range[1], Number.isFinite(v) ? v : range[0]));

const r3 = (v: number): number => Math.round(v * 1000) / 1000;

/**
 * Stack a fit into a profile. `rockClass` selects the per-class extraction
 * terms (an ice extractor is +50% on a C-type and −12% on an M-type); omit
 * it and only the class-agnostic terms apply, which is the CONSERVATIVE
 * reading every ceiling and preview uses when the rock is not known.
 *
 * `bestClass: true` instead takes the BEST class term of each fitting — the
 * upper bound the plausibility ceilings need (resource-plausibility.ts).
 */
export function fittingProfile(
  ids: readonly string[],
  opts: { rockClass?: AsteroidClass | null; bestClass?: boolean } = {},
): FittingProfile {
  const known = ids.filter(id => FITTING_MAP.has(id));
  if (known.length === 0) return { ...NEUTRAL_FITTING_PROFILE };
  let oreRate = 0, cargo = 0, refineRate = 0, recoveryAdd = 0, sweep = 0;
  let fuel = 0, transit = 0, shakedown = 0, wear = 0;
  for (const id of known) {
    const def = FITTING_MAP.get(id)!;
    const e = def.effects;
    oreRate += e.oreRatePct || 0;
    if (e.oreRateByClass) {
      if (opts.bestClass) {
        oreRate += Math.max(0, ...Object.values(e.oreRateByClass).filter(v => typeof v === 'number') as number[]);
      } else if (opts.rockClass) {
        oreRate += e.oreRateByClass[opts.rockClass] || 0;
      }
    }
    cargo += e.cargoPct || 0;
    refineRate += e.refineRatePct || 0;
    recoveryAdd += e.refineRecoveryAdd || 0;
    sweep += e.surveySweepAdd || 0;
    fuel += e.fuelPct || 0;
    transit += e.transitPct || 0;
    shakedown += e.shakedownOddsPct || 0;
    wear += e.hullWearPct || 0;
  }
  const slotsUsed = slotsUsedBy(known);
  return {
    ids: known,
    slotsUsed,
    oreRateMult: r3(clamp(1 + oreRate, FITTING_CLAMPS.oreRate)),
    cargoMult: r3(clamp(1 + cargo, FITTING_CLAMPS.cargo)),
    refineRateMult: r3(clamp(1 + refineRate, FITTING_CLAMPS.refineRate)),
    refineRecovery: r3(Math.max(0.1, Math.min(FITTING_MAX_REFINERY_RECOVERY, MOBILE_REFINERY_RECOVERY + recoveryAdd))),
    surveySweepAdd: Math.max(0, Math.floor(sweep)),
    // The mass penalty rides on top of the declared fuel terms.
    fuelMult: r3(clamp((1 + fuel) * (1 + FITTING_SLOT_FUEL_PENALTY * slotsUsed), FITTING_CLAMPS.fuel)),
    transitMult: r3(clamp(1 + transit, FITTING_CLAMPS.transit)),
    shakedownMult: r3(clamp(1 + shakedown, FITTING_CLAMPS.shakedown)),
    hullWearMult: r3(clamp(1 + wear, FITTING_CLAMPS.hullWear)),
  };
}

/**
 * The EFFECTIVE hull. This is the single integration point with the mining
 * loop: `planMiningOrder` is handed this definition instead of the bare one,
 * so extraction rate, batch size, plant time, sweep width and every figure
 * derived from them come out of the SAME formulas they always did. There is
 * no second yield path anywhere.
 */
export function effectiveShipDefinition(def: ShipDefinition, profile: FittingProfile): ShipDefinition {
  if (profile.slotsUsed === 0 && profile.ids.length === 0) return def;
  const out: ShipDefinition = { ...def };
  out.cargoCapacity = Math.max(0, Math.floor(def.cargoCapacity * profile.cargoMult));
  if (def.oreExtractionPerHour) {
    out.oreExtractionPerHour = Math.max(1, Math.round(def.oreExtractionPerHour * profile.oreRateMult * 100) / 100);
  }
  if (def.refineOrePerHour) {
    out.refineOrePerHour = Math.max(1, Math.round(def.refineOrePerHour * profile.refineRateMult));
  }
  if (profile.surveySweepAdd > 0 && def.survey) {
    out.surveySweep = Math.max(1, Math.floor(def.surveySweep ?? 1) + profile.surveySweepAdd);
  }
  return out;
}

// ─── Records (the shape the server writes and the client mirrors) ───────────

/** One hull's registered fit, as the sync hands it to the client. Money and
 *  the row id stay on the server; nothing here can be forged into an
 *  advantage because the mining route re-reads the row it wrote. */
export interface ShipFittingRecord {
  shipInstanceId: string;
  /** Fitting definition ids. */
  ids: string[];
  slotsUsed: number;
  /** ms — when the yard finishes. Until then the fit is INERT and the hull
   *  cannot take a mining order. */
  readyAtMs: number;
  /** Where the refit happened. */
  yardLocationId: string;
  /** Upkeep per game-month (mirrored so the client tick can bill it). */
  upkeepPerMonth: number;
}

/** A fit is only live once the yard has finished with it. */
export function fittingIsReady(rec: Pick<ShipFittingRecord, 'readyAtMs'> | null | undefined, nowMs: number): boolean {
  return !!rec && rec.readyAtMs <= nowMs;
}

/** The profile a hull is flying RIGHT NOW: its registered fit if the yard is
 *  done with it, the neutral profile otherwise. The one accessor every
 *  caller should use. */
export function activeFittingProfile(
  rec: ShipFittingRecord | null | undefined,
  nowMs: number,
  opts: { rockClass?: AsteroidClass | null; bestClass?: boolean } = {},
): FittingProfile {
  if (!fittingIsReady(rec, nowMs)) return { ...NEUTRAL_FITTING_PROFILE };
  return fittingProfile(rec!.ids, opts);
}

/** The fittings map as the client holds it (GameState.shipFittings). */
export type ShipFittingMap = Record<string, ShipFittingRecord>;

export function readFittingRecord(map: ShipFittingMap | undefined, shipInstanceId: string): ShipFittingRecord | null {
  const rec = map?.[shipInstanceId];
  return rec && Array.isArray(rec.ids) ? rec : null;
}

/** Total fitting upkeep per game-month across a corporation's fleet. Billed
 *  by the client tick beside `maintenancePerMonth` (game-engine.ts), the
 *  same client-applied posture hull maintenance has always had. */
export function fleetFittingUpkeep(map: ShipFittingMap | undefined, nowMs: number): number {
  if (!map || typeof map !== 'object') return 0;
  let total = 0;
  for (const rec of Object.values(map)) {
    if (!rec || !fittingIsReady(rec, nowMs)) continue;
    const u = Number(rec.upkeepPerMonth);
    if (Number.isFinite(u) && u > 0) total += u;
  }
  return Math.round(total);
}

// ─── Ceiling support (resource-plausibility.ts) ─────────────────────────────

/**
 * The single largest extraction multiplier ANY legal fit can produce on ANY
 * hull in the registry — the upper bound the plausibility ceilings must
 * allow so an honestly fitted rig is never rejected. Derived, never typed:
 * adding a fitting to FITTINGS moves this number automatically.
 *
 * Computed by brute force over the hull roster: for each hull, the best legal
 * combination (one per group, inside the slot budget, hardpoints honoured,
 * every research assumed complete, the best class term of each fitting
 * taken). Small enough to evaluate at module load — six groups, at most four
 * candidates each.
 */
export const MAX_FITTING_ORE_RATE_MULT: number = (() => {
  let best = 1;
  for (const hull of Array.from(SHIP_MAP.values())) {
    if (!hull.oreExtractionPerHour) continue;
    best = Math.max(best, bestFitFor(hull, p => p.oreRateMult));
  }
  return best;
})();

/** Same, for cargo capacity (the hold a fitted rig can legally carry). */
export const MAX_FITTING_CARGO_MULT: number = (() => {
  let best = 1;
  for (const hull of Array.from(SHIP_MAP.values())) {
    best = Math.max(best, bestFitFor(hull, p => p.cargoMult));
  }
  return best;
})();

/**
 * Best value of `score` over every LEGAL fit of one hull. Enumerates the
 * per-group choices (including "nothing") and keeps the fits inside the slot
 * budget. Research is assumed complete — a ceiling must bound the fully
 * researched corporation, not the current one.
 */
export function bestFitFor(hull: ShipDefinition, score: (p: FittingProfile) => number): number {
  const stats = getShipDerivedStats(hull);
  const budget = hullSlotBudget(hull);
  const byGroup = new Map<FittingGroup, FittingDefinition[]>();
  for (const def of FITTINGS) {
    if (!stats.hardpointTypes.includes(def.hardpoint)) continue;
    if (def.roles && def.roles.length > 0 && !def.roles.includes(hull.role)) continue;
    const list = byGroup.get(def.group) ?? [];
    list.push(def);
    byGroup.set(def.group, list);
  }
  const groups = Array.from(byGroup.values());
  let best = score(NEUTRAL_FITTING_PROFILE);
  const walk = (i: number, ids: string[], slots: number): void => {
    if (i >= groups.length) {
      best = Math.max(best, score(fittingProfile(ids, { bestClass: true })));
      return;
    }
    walk(i + 1, ids, slots); // take nothing from this group
    for (const def of groups[i]) {
      if (slots + def.slotCost > budget) continue;
      ids.push(def.id);
      walk(i + 1, ids, slots + def.slotCost);
      ids.pop();
    }
  };
  walk(0, [], 0);
  return best;
}
