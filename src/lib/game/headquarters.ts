// ─── Space Tycoon: Headquarters (the Command Center as a place) ─────────────
// docs/COMMAND_CENTER_DESIGN_2026-09-13.md — the headquarters is a place with
// a window, and the window changes as the corporation grows. CC-1 ships the
// Earth Operations Center only; the rest of the ladder is listed here (with
// `comingSoon`) so the Bridge can show where the corporation is headed.
// CC-2 (2026-09-13) adds the relocation machinery's CONSTANTS here — seat
// counts and posted prices per stage, relocation cost/time, monthly upkeep,
// and the ±10-15% bonus profile per seat (design §2/§8) — so this file stays
// the one place the ladder's numbers live. The pure relocation logic
// (requirements, quotes, transitions) is hq-relocation.ts; server I/O is
// hq-relocation-server.ts; the route is /api/space-tycoon/hq/relocate.
//
// The stage registry is the single source of truth for: the HQ chip on the
// Bridge, the sync route's sanitizer (GameProfile.hqLocationId only ever
// holds a registered location), and the public corp page / leaderboard
// label ("HQ: Earth Operations Center").

import type { GameState, HeadquartersState } from './types';
import { BUILDING_MAP } from './buildings';

export type HqStageId =
  | 'earth_ops'
  | 'orbital_deck'
  | 'lunar_hq'
  | 'mars_hq'
  | 'jovian_hq'
  | 'saturnian_hq'
  | 'deep_space_hq'
  | 'interstellar_hq';

export interface HqStageDef {
  id: HqStageId;
  /** Full name, e.g. "Earth Operations Center". */
  label: string;
  /** Short name for chips and table cells, e.g. "Earth Ops". */
  shortLabel: string;
  /** The solar-system location the HQ sits at (solar-system.ts ids; the
   *  interstellar seat is a placeholder until CC-4 wires the colony charter). */
  locationId: string;
  /** Corporation tier (corporation-tiers.ts) at which this seat unlocks. */
  tier: number;
  /** One line of lore for the HoloTip (docs/LORE.md vocabulary). */
  lore: string;
  /** What the move requires, in the player's words (design §3). */
  requirement: string;
  /** Plates rendered and a stage manifest published under public/game/hq/. */
  plates?: { dir: string };
  /** Listed on the ladder but not yet reachable — CC-2 opens LEO and Luna;
   *  Mars/outer/deep-space/interstellar stay `comingSoon` (CC-3/CC-4). */
  comingSoon?: boolean;
  /** Hours added to UTC to get the window's local clock. The Earth centre
   *  keeps 0 for now (design: "day/night from the world clock"; the game
   *  clock has no hour-of-day, so real UTC drives the variant). Switching
   *  the Cape to local time is a one-line change here. */
  clockOffsetHours: number;
}

export const HQ_STAGES: readonly HqStageDef[] = [
  {
    id: 'earth_ops',
    label: 'Earth Operations Center',
    shortLabel: 'Earth Ops',
    locationId: 'earth_surface',
    tier: 1,
    lore: 'A coastal launch complex licensed under the Accord of 2089. Every corporation starts here.',
    requirement: 'Default seat — free.',
    plates: { dir: '/game/hq/earth/' },
    clockOffsetHours: 0,
  },
  {
    id: 'orbital_deck',
    label: 'Orbital Command Deck',
    shortLabel: 'LEO Deck',
    locationId: 'leo',
    tier: 2,
    lore: 'An anchorage rented from the Syndicate-run station registry. Earth fills the window; sunrise every ninety minutes.',
    requirement: 'Tier 2 · an Orbital Outpost in LEO · a leased LEO seat · a 2-month relocation project.',
    clockOffsetHours: 0,
  },
  {
    id: 'lunar_hq',
    label: 'Lunar Gateway HQ',
    shortLabel: 'Lunar HQ',
    locationId: 'lunar_surface',
    tier: 3,
    lore: 'A seat inside the Belt Rush-era infrastructure at the south pole. Colony lights on the crater rim.',
    requirement: 'Tier 3 · a Lunar Gateway or Lunar Habitat · a leased Lunar seat · a 4-month relocation project.',
    clockOffsetHours: 0,
  },
  {
    id: 'mars_hq',
    label: 'Mars Orbital HQ',
    shortLabel: 'Mars HQ',
    locationId: 'mars_orbit',
    tier: 4,
    lore: 'The relay station above Meridian. Dust storms roll across the window in season.',
    requirement: 'Mars relay + habitat; seat sold at auction.',
    comingSoon: true,
    clockOffsetHours: 0,
  },
  {
    id: 'jovian_hq',
    label: 'Jovian Station HQ',
    shortLabel: 'Jovian HQ',
    locationId: 'jupiter_system',
    tier: 5,
    lore: 'Bordering Void Corsair space. Radiation glow on the horizon, pirate warnings in the window.',
    requirement: 'Outer-system station; seat sold at auction. One of Jovian or Saturnian.',
    comingSoon: true,
    clockOffsetHours: 0,
  },
  {
    id: 'saturnian_hq',
    label: 'Saturnian Ring HQ',
    shortLabel: 'Saturn HQ',
    locationId: 'saturn_system',
    tier: 5,
    lore: 'Ring shadow sweeps the deck twice a shift. The quietest seat in the system, and the furthest from help.',
    requirement: 'Outer-system station; seat sold at auction. One of Jovian or Saturnian.',
    comingSoon: true,
    clockOffsetHours: 0,
  },
  {
    id: 'deep_space_hq',
    label: 'Heliopause Station HQ',
    shortLabel: 'Deep Space',
    locationId: 'outer_system',
    tier: 6,
    lore: 'A Kuiper station at the edge of the heliosphere. Expedition ships return through the haze.',
    requirement: 'Mothership-class flagship docked.',
    comingSoon: true,
    clockOffsetHours: 0,
  },
  {
    id: 'interstellar_hq',
    label: 'Interstellar HQ',
    shortLabel: 'Interstellar',
    locationId: 'interstellar',
    tier: 7,
    lore: "A new star's disc and an unfamiliar planet. The corporation writes its own chapter.",
    requirement: 'Completed interstellar expedition + colony charter.',
    comingSoon: true,
    clockOffsetHours: 0,
  },
];

export const HQ_STAGE_MAP: ReadonlyMap<HqStageId, HqStageDef> = new Map(HQ_STAGES.map(s => [s.id, s]));

export const DEFAULT_HQ_STAGE: HqStageId = 'earth_ops';
export const DEFAULT_HQ_LOCATION = HQ_STAGE_MAP.get(DEFAULT_HQ_STAGE)!.locationId;

export function isHqStageId(value: unknown): value is HqStageId {
  return typeof value === 'string' && HQ_STAGE_MAP.has(value as HqStageId);
}

export function getHqStage(id: HqStageId): HqStageDef {
  return HQ_STAGE_MAP.get(id) ?? HQ_STAGE_MAP.get(DEFAULT_HQ_STAGE)!;
}

/** Stages that have rendered plates today (the Bridge can draw them). A
 *  reachable stage WITHOUT plates (LEO and Luna in CC-2) is drawn on the
 *  Earth plate with a "window plates coming" overlay — BridgeStage.tsx. */
export function hqStagesWithPlates(): HqStageDef[] {
  return HQ_STAGES.filter(s => !!s.plates);
}

/** Stages a corporation can relocate to today (CC-2: Earth, LEO, Luna). */
export function hqReachableStages(): HqStageDef[] {
  return HQ_STAGES.filter(s => !s.comingSoon);
}

// ─── CC-2: seats, relocation, upkeep, bonuses ────────────────────────────────
// docs/BALANCE.md "Pass 11 — HQ relocation (2026-09-13)" carries the
// rationale and the sim delta behind every number below.

/** Finite anchorages per stage for THIS world epoch (design §2 "seats are
 *  scarce"). Earth is unlimited (0 = no seat needed). Later stages are
 *  listed so the pool math is generic; they stay unreachable (comingSoon)
 *  until CC-3/CC-4 open them. */
export const HQ_SEAT_COUNTS: Readonly<Record<HqStageId, number>> = {
  earth_ops: 0,
  orbital_deck: 24,
  lunar_hq: 12,
  mars_hq: 8,
  jovian_hq: 4,
  saturnian_hq: 4,
  deep_space_hq: 2,
  interstellar_hq: 0,
};

/** Posted seat price at an EMPTY pool ($). The pool marks it up with
 *  occupancy — hq-relocation.ts postedSeatPrice: base × (1 + 2·(occ/total)^1.5),
 *  so the last LEO seat lists near 3× the first. Burned on claim (a money
 *  sink, exactly like a slot-auction win — BALANCE.md). */
export const HQ_SEAT_BASE_PRICE: Readonly<Record<HqStageId, number>> = {
  earth_ops: 0,
  orbital_deck: 25_000_000,
  lunar_hq: 150_000_000,
  mars_hq: 400_000_000,
  jovian_hq: 900_000_000,
  saturnian_hq: 900_000_000,
  deep_space_hq: 2_500_000_000,
  interstellar_hq: 0,
};

/** Seat lease term in game-months (6 h real each): auto-renews while the
 *  HQ stays; released to the pool when the corporation moves. */
export const HQ_SEAT_TERM_MONTHS = 6;

/** Relocation project: money + campaign-loop time per TARGET stage. */
export interface HqRelocationSpec { cost: number; months: number }
export const HQ_RELOCATION: Readonly<Record<HqStageId, HqRelocationSpec>> = {
  earth_ops: { cost: 0, months: 1 },            // return leg: see HQ_RETURN_COST_FRACTION
  orbital_deck: { cost: 45_000_000, months: 2 },
  lunar_hq: { cost: 220_000_000, months: 4 },
  mars_hq: { cost: 600_000_000, months: 6 },
  jovian_hq: { cost: 1_500_000_000, months: 8 },
  saturnian_hq: { cost: 1_500_000_000, months: 8 },
  deep_space_hq: { cost: 4_000_000_000, months: 12 },
  interstellar_hq: { cost: 10_000_000_000, months: 18 },
};

/** Moving BACK to Earth costs this fraction of the departing stage's
 *  relocation cost (design §3 "moving back is allowed (at cost)") and takes
 *  HQ_RELOCATION.earth_ops.months. */
export const HQ_RETURN_COST_FRACTION = 0.25;

/** Monthly HQ upkeep per stage ($ per game-month, charged by the client
 *  tick inside the corporate-overhead line and shown by the P&L — the
 *  "daily: HQ upkeep" loop of design §2). Earth pays nothing. */
export const HQ_UPKEEP_MONTHLY: Readonly<Record<HqStageId, number>> = {
  earth_ops: 0,
  orbital_deck: 1_000_000,
  lunar_hq: 3_500_000,
  mars_hq: 8_000_000,
  jovian_hq: 15_000_000,
  saturnian_hq: 15_000_000,
  deep_space_hq: 30_000_000,
  interstellar_hq: 50_000_000,
};

/** The ±10-15% seat bonus profile (design §2, Jay 2026-09-13 call 1). Every
 *  field is a MULTIPLIER (1.0 = neutral) so a stage that does not touch a
 *  term simply leaves it at 1. Wired terms (CC-2):
 *   - hiringCostMult      → labor-market.ts getHireCostWithWageIndex
 *   - contractPayoutMult  → contracts.ts applyContractReward,
 *                           delivery-contracts.ts completeDelivery
 *                           (server ceiling: contract-credit.ts MAX mult)
 *   - launchRevenueMult   → game-engine.ts §1 + economy-report.ts (client),
 *                           resource-plausibility.ts monthly gross (server)
 *   - satelliteOpsCostMult→ game-engine.ts §1 + economy-report.ts
 *   - miningFuelMult, beltDeltaVMult → mining-orders.ts quoteLeg (client
 *                           preview, page handler and the server route all
 *                           call the same pure planner)
 *  Later-stage fields are defined so the ladder is honest about where it is
 *  headed, but nothing reads them until their stage opens. */
export interface HqBonuses {
  hiringCostMult: number;
  contractPayoutMult: number;
  launchRevenueMult: number;
  satelliteOpsCostMult: number;
  miningFuelMult: number;
  beltDeltaVMult: number;
  /** CC-3+: unwired. */
  colonyThroughputMult: number;
  marsContractMult: number;
  outerExtractionMult: number;
  scienceMult: number;
  expeditionReturnMult: number;
}

export const NEUTRAL_HQ_BONUSES: Readonly<HqBonuses> = Object.freeze({
  hiringCostMult: 1, contractPayoutMult: 1, launchRevenueMult: 1, satelliteOpsCostMult: 1,
  miningFuelMult: 1, beltDeltaVMult: 1, colonyThroughputMult: 1, marsContractMult: 1,
  outerExtractionMult: 1, scienceMult: 1, expeditionReturnMult: 1,
});

const HQ_BONUS_TABLE: Readonly<Record<HqStageId, Partial<HqBonuses>>> = {
  earth_ops: { hiringCostMult: 0.90, contractPayoutMult: 1.10 },
  orbital_deck: { launchRevenueMult: 1.12, satelliteOpsCostMult: 0.90 },
  lunar_hq: { miningFuelMult: 0.88, beltDeltaVMult: 0.90 },
  mars_hq: { colonyThroughputMult: 1.12, marsContractMult: 1.10 },
  jovian_hq: { outerExtractionMult: 1.12, scienceMult: 1.10 },
  saturnian_hq: { outerExtractionMult: 1.12, scienceMult: 1.10 },
  deep_space_hq: { expeditionReturnMult: 1.15 },
  interstellar_hq: { expeditionReturnMult: 1.15, colonyThroughputMult: 1.10 },
};

/** The bonus profile of a stage; an unknown id reads as neutral. */
export function getHqBonuses(stage: HqStageId | string | null | undefined): HqBonuses {
  const row = isHqStageId(stage) ? HQ_BONUS_TABLE[stage] : undefined;
  return { ...NEUTRAL_HQ_BONUSES, ...(row || {}) };
}

/** Bonuses for a state (reads the validated headquarters block). */
export function getHqBonusesForState(state: Pick<GameState, 'headquarters' | 'createdAt'>): HqBonuses {
  return getHqBonuses(getHeadquarters(state).stage);
}

/** Services enabled by a `satellite`-category building (buildings.ts) —
 *  the "satellite ops" the LEO deck's −10% operating-cost term applies to.
 *  Derived from the data, never a hand list. */
export const HQ_SATELLITE_SERVICE_IDS: ReadonlySet<string> = (() => {
  const out = new Set<string>();
  for (const b of BUILDING_MAP.values()) {
    if (b.category !== 'satellite') continue;
    for (const svc of b.enabledServices || []) out.add(svc);
  }
  return out;
})();

export function isHqSatelliteOpsService(serviceId: string): boolean {
  return HQ_SATELLITE_SERVICE_IDS.has(serviceId);
}

/** Solar-system locations whose asteroid fields count as "the belt" for
 *  the Lunar HQ's Δv-surcharge term (asteroids.ts field parents). */
export const HQ_BELT_LOCATIONS: readonly string[] = ['asteroid_belt', 'ceres_surface'];

/** The mining-order logistics terms for a stage (mining-orders.ts
 *  planMiningOrder `hqLogistics`). */
export interface HqMiningLogistics { fuelMult: number; beltDeltaVMult: number }
export function hqMiningLogisticsFor(stage: HqStageId | string | null | undefined): HqMiningLogistics {
  const b = getHqBonuses(stage);
  return { fuelMult: b.miningFuelMult, beltDeltaVMult: b.beltDeltaVMult };
}
export function hqMiningLogisticsForState(state: Pick<GameState, 'headquarters' | 'createdAt'>): HqMiningLogistics {
  return hqMiningLogisticsFor(getHeadquarters(state).stage);
}
/** Server routes hold the persisted locationId, not the stage id. */
export function hqMiningLogisticsForLocationId(locationId: string | null | undefined): HqMiningLogistics {
  return hqMiningLogisticsFor(hqStageForLocationId(locationId).id);
}

/** The largest value any stage carries for a bonus field — the server's
 *  upper bound when it cannot (or need not) know the exact stage. */
export function maxHqBonus(field: keyof HqBonuses): number {
  return HQ_STAGES.reduce((m, s) => Math.max(m, getHqBonuses(s.id)[field]), 1);
}

/** Frontier interaction rule (docs/BALANCE.md Pass 11): an HQ revenue
 *  bonus never stacks multiplicatively with the Frontier ×2.0 on the SAME
 *  term beyond ×2.3. Returns the HQ multiplier to apply alongside a given
 *  Frontier multiplier — the full bonus for veterans, trimmed only if the
 *  product would exceed the cap (2.0 × 1.12 = 2.24 today, so nothing is
 *  trimmed; the rule binds if either constant grows). Client engine and the
 *  server ceiling both call this. */
export const HQ_FRONTIER_STACK_CAP = 2.3;
export function hqRevenueMultUnderFrontier(hqMult: number, frontierMult: number): number {
  const h = Number.isFinite(hqMult) && hqMult > 0 ? hqMult : 1;
  const f = Number.isFinite(frontierMult) && frontierMult > 1 ? frontierMult : 1;
  if (f <= 1 || h <= 1) return h;
  return Math.min(h, Math.max(1, HQ_FRONTIER_STACK_CAP / f));
}

/** "LEO seat 7" — the public seat label (null for Earth / no seat). */
export function hqSeatLabel(stage: HqStageId | string, seatIndex: number | null | undefined): string | null {
  if (!isHqStageId(stage) || HQ_SEAT_COUNTS[stage] <= 0) return null;
  if (typeof seatIndex !== 'number' || !Number.isFinite(seatIndex) || seatIndex < 1) return null;
  const word = stage === 'orbital_deck' ? 'LEO' : stage === 'lunar_hq' ? 'Lunar' : getHqStage(stage).shortLabel;
  return `${word} seat ${seatIndex}`;
}

/** The founding-day default: Earth, moved in on the corporation's createdAt. */
export function defaultHeadquarters(foundedAtMs: number): HeadquartersState {
  const stage = getHqStage(DEFAULT_HQ_STAGE);
  return {
    stage: stage.id,
    locationId: stage.locationId,
    movedAtMs: Number.isFinite(foundedAtMs) && foundedAtMs > 0 ? foundedAtMs : 0,
  };
}

/** A save's headquarters block is valid when it names a registered stage
 *  and its location agrees with that stage's seat. Anything else (missing,
 *  pre-CC-1 save, tampered blob) is replaced by the default on load. */
export function isValidHeadquarters(hq: unknown): hq is HeadquartersState {
  if (!hq || typeof hq !== 'object') return false;
  const h = hq as Partial<HeadquartersState>;
  if (!isHqStageId(h.stage)) return false;
  if (h.locationId !== getHqStage(h.stage).locationId) return false;
  if (!(typeof h.movedAtMs === 'number' && Number.isFinite(h.movedAtMs) && h.movedAtMs >= 0)) return false;
  if (h.seatIndex !== undefined && !(typeof h.seatIndex === 'number' && Number.isFinite(h.seatIndex) && h.seatIndex >= 1)) return false;
  if (h.project !== undefined && h.project !== null && !isValidHqProject(h.project)) return false;
  return true;
}

/** CC-2: a relocation project block is valid when it targets a registered
 *  stage and its clock fields are finite and ordered. */
export function isValidHqProject(p: unknown): p is NonNullable<HeadquartersState['project']> {
  if (!p || typeof p !== 'object') return false;
  const q = p as Partial<NonNullable<HeadquartersState['project']>>;
  if (!isHqStageId(q.targetStage)) return false;
  if (!(typeof q.startedAtMs === 'number' && Number.isFinite(q.startedAtMs) && q.startedAtMs >= 0)) return false;
  if (!(typeof q.completesAtMs === 'number' && Number.isFinite(q.completesAtMs) && q.completesAtMs >= q.startedAtMs)) return false;
  if (q.seatIndex !== undefined && !(typeof q.seatIndex === 'number' && Number.isFinite(q.seatIndex) && q.seatIndex >= 1)) return false;
  return true;
}

/** Read the HQ off a state, never undefined — a save that predates CC-1
 *  (or a state built by a test fixture) reads as the Earth default. */
export function getHeadquarters(state: Pick<GameState, 'headquarters' | 'createdAt'>): HeadquartersState {
  return isValidHeadquarters(state.headquarters) ? state.headquarters : defaultHeadquarters(state.createdAt);
}

/** Bring a loaded save up to CC-1: add `headquarters` when missing or
 *  malformed. Additive, no SAVE_VERSION bump (constants.ts convention). */
export function migrateHeadquarters(state: GameState): GameState {
  // Already valid (CC-1 shape or CC-2 with seat/project) → untouched, same object.
  if (isValidHeadquarters(state.headquarters)) return state;
  const hq = state.headquarters as Partial<HeadquartersState> | undefined;
  // CC-2: a save whose OPTIONAL fields are malformed keeps its stage and
  // drops the bad fields instead of falling all the way back to Earth.
  if (hq && typeof hq === 'object' && isHqStageId(hq.stage) && hq.locationId === getHqStage(hq.stage).locationId
      && typeof hq.movedAtMs === 'number' && Number.isFinite(hq.movedAtMs) && hq.movedAtMs >= 0) {
    const cleaned: HeadquartersState = { stage: hq.stage, locationId: hq.locationId, movedAtMs: hq.movedAtMs };
    if (typeof hq.seatIndex === 'number' && Number.isFinite(hq.seatIndex) && hq.seatIndex >= 1) cleaned.seatIndex = hq.seatIndex;
    if (isValidHqProject(hq.project)) cleaned.project = hq.project;
    state.headquarters = cleaned;
    return state;
  }
  if (!isValidHeadquarters(state.headquarters)) state.headquarters = defaultHeadquarters(state.createdAt);
  return state;
}

/** Server-side sanitizer for a location id that should name an HQ seat:
 *  only a registered stage's own locationId passes, everything else
 *  collapses to Earth. CC-2: GameProfile.hqLocationId is now written ONLY by
 *  the relocation completion pass (hq-relocation-server.ts); the sync no
 *  longer mirrors the client's value, it READS the column and hands the
 *  client the server's headquarters block. */
export function sanitizeHqLocationId(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_HQ_LOCATION;
  const stage = HQ_STAGES.find(s => s.locationId === raw);
  return stage ? stage.locationId : DEFAULT_HQ_LOCATION;
}

/** Stage for a stored location id (public corp page, leaderboard). */
export function hqStageForLocationId(locationId: string | null | undefined): HqStageDef {
  return HQ_STAGES.find(s => s.locationId === locationId) ?? getHqStage(DEFAULT_HQ_STAGE);
}

/** "HQ: Earth Operations Center" — the public label. */
export function hqLabelForLocationId(locationId: string | null | undefined): string {
  return hqStageForLocationId(locationId).label;
}
