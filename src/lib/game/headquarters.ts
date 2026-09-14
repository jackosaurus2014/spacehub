// ─── Space Tycoon: Headquarters (the Command Center as a place) ─────────────
// docs/COMMAND_CENTER_DESIGN_2026-09-13.md — the headquarters is a place with
// a window, and the window changes as the corporation grows. CC-1 ships the
// Earth Operations Center only; the rest of the ladder is listed here (with
// `comingSoon`) so the Bridge can show where the corporation is headed.
// CC-2 (2026-09-13) adds the relocation machinery's CONSTANTS here — seat
// counts and posted prices per stage, relocation cost/time, monthly upkeep,
// and the ±10-15% bonus profile per seat (design §2/§8) — so this file stays
// the one place the ladder's numbers live.
// CC-3 (2026-09-13) opens the OUTER rungs — Mars, Jovian, Saturnian,
// deep-space and interstellar — gives Mars-and-outward seats to a sealed-bid
// AUCTION (HQ_AUCTION_STAGES), moves seat upkeep server-side
// (HQ_SEAT_UPKEEP_GRACE_MONTHS) and wires every outer bonus term through the
// ONE helper the tick, the P&L, the server ceiling and the sim all call:
// hqServiceRevenueMult / hqServiceCostMult below. Adding a term anywhere
// else is a bug: the server's monthly-gross ceiling must agree with the
// client or the income it computes is rejected on sync. The pure relocation logic
// (requirements, quotes, transitions) is hq-relocation.ts; server I/O is
// hq-relocation-server.ts; the route is /api/space-tycoon/hq/relocate.
// CC-4 (2026-09-13) closes the last two gaps CC-3 left open:
//   1. expeditionReturnMult was the ONE bonus with no server mirror. It now
//      has the same single-site treatment every other term has —
//      hqExpeditionReturnMult() below, called by the client tick
//      (expeditions.ts) and by the server's expedition headroom credit
//      (server-expeditions.ts creditDueExpeditionReturns), so a returning
//      expedition's legitimate payout is never rejected by the sync ceiling.
//   2. the interstellar rung's gate stopped being a proxy: expeditions now
//      carry a server record (prisma Expedition + server-expeditions.ts), so
//      hq-relocation.ts gates the seat on a genuinely COMPLETED interstellar
//      expedition alongside the colony charter, exactly as design §3 says.
// Each stage also carries `windowPreview`: one sentence of what the window
// will show once the corporation arrives (design §1's table), rendered by the
// Headquarters console so a rung whose art has not landed still tells the
// player what they are moving toward.
//
// The stage registry is the single source of truth for: the HQ chip on the
// Bridge, the sync route's sanitizer (GameProfile.hqLocationId only ever
// holds a registered location), and the public corp page / leaderboard
// label ("HQ: Earth Operations Center").

import type { GameState, HeadquartersState } from './types';
import { BUILDING_MAP } from './buildings';
import { EXPANDED_LOCATIONS } from './colonies';

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
  /** One sentence of what the window shows at this seat (design §1 table).
   *  Rendered by the Headquarters console and by the Bridge's fallback
   *  overlay, so a stage whose plates have not been rendered yet still says
   *  what the player will be looking at when they arrive. */
  windowPreview: string;
  /** Plates rendered and a stage manifest published under public/game/hq/. */
  plates?: { dir: string };
  /** Listed on the ladder but not yet reachable. CC-3 opens the whole
   *  ladder, so no stage carries this today; the field stays because the
   *  ladder UI, the requirement check and the relocate route all honour it
   *  and a future rung (a second star system) will need it again. */
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
    windowPreview: "Your launch pad across the field, an ocean horizon and the world clock's day/night. Your own launches lift off; the pad lights when a build completes.",
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
    windowPreview: "Earth's limb filling the window, the terminator sweeping past, your satellites as glints — sunrise every ninety minutes. Debris streaks during hazard events; aurora during solar storms.",
    plates: { dir: '/game/hq/orbital_deck/' },
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
    windowPreview: 'The south-pole crater rim from the Gateway, colony lights along the ridge and your rigs working the regolith below. Earth hangs fixed above the horizon.',
    plates: { dir: '/game/hq/lunar_hq/' },
    clockOffsetHours: 0,
  },
  {
    id: 'mars_hq',
    label: 'Mars Orbital HQ',
    shortLabel: 'Mars HQ',
    locationId: 'mars_orbit',
    tier: 4,
    lore: 'The relay station above Meridian. Dust storms roll across the window in season.',
    requirement: 'Tier 4 · a Mars orbital station or habitat · a Mars seat won at auction · a 6-month relocation project.',
    windowPreview: 'Meridian from orbit: the relay trusses in the foreground, the surface colony a thread of lights below, and dust storms rolling across the disc in season.',
    clockOffsetHours: 0,
  },
  {
    id: 'jovian_hq',
    label: 'Jovian Station HQ',
    shortLabel: 'Jovian HQ',
    locationId: 'jupiter_system',
    tier: 5,
    lore: 'Bordering Void Corsair space. Radiation glow on the horizon, pirate warnings in the window.',
    requirement: 'Tier 5 · a Jovian station · a Jovian seat won at auction · an 8-month relocation project. One of Jovian or Saturnian — never both.',
    windowPreview: "Jupiter's cloud bands filling two thirds of the glass, Europa and Io crossing the face, and the radiation glow of the belt on the horizon. Void Corsair traffic warnings paint the window.",
    clockOffsetHours: 0,
  },
  {
    id: 'saturnian_hq',
    label: 'Saturnian Ring HQ',
    shortLabel: 'Saturn HQ',
    locationId: 'saturn_system',
    tier: 5,
    lore: 'Ring shadow sweeps the deck twice a shift. The quietest seat in the system, and the furthest from help.',
    requirement: 'Tier 5 · a Kronos station at Saturn · a Saturnian seat won at auction · an 8-month relocation project. One of Jovian or Saturnian — never both.',
    windowPreview: 'The ring plane edge-on, shadow sweeping the deck twice a shift, Titan hazing orange to starboard. The quietest window in the system.',
    clockOffsetHours: 0,
  },
  {
    id: 'deep_space_hq',
    label: 'Heliopause Station HQ',
    shortLabel: 'Deep Space',
    locationId: 'outer_system',
    tier: 6,
    lore: 'A Kuiper station at the edge of the heliosphere. Expedition ships return through the haze.',
    requirement: 'Tier 6 · a Deep Space Outpost · an interstellar-capable hull docked · a deep-space seat won at auction · a 12-month relocation project.',
    windowPreview: 'The heliopause haze, the Sun reduced to the brightest star in the field, and your expedition ships coming home through it — hours of light-lag behind their own telemetry.',
    clockOffsetHours: 0,
  },
  {
    id: 'interstellar_hq',
    label: 'Interstellar HQ',
    shortLabel: 'Interstellar',
    locationId: 'interstellar',
    tier: 7,
    lore: "A new star's disc and an unfamiliar planet. The corporation writes its own chapter.",
    requirement: 'Tier 7 · Interstellar Colonization charted · a Colony Ark built · an interstellar seat won at auction · an 18-month relocation project.',
    windowPreview: "A new star's disc and an unfamiliar planet, its bodies revealed one by one as your surveys chart them. No horizon you have ever seen before, and no authority in the window but yours.",
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

/** Stages a corporation can relocate to today (CC-3: the whole ladder). */
export function hqReachableStages(): HqStageDef[] {
  return HQ_STAGES.filter(s => !s.comingSoon);
}

// ─── CC-2: seats, relocation, upkeep, bonuses ────────────────────────────────
// docs/BALANCE.md "Pass 11 — HQ relocation (2026-09-13)" carries the
// rationale and the sim delta behind every number below.

/** Finite anchorages per stage for THIS world epoch (design §2 "seats are
 *  scarce"). Earth is unlimited (0 = no seat needed); every other rung is a
 *  finite pool that shrinks as it gets further out. CC-3 gives the
 *  interstellar rung a pool of its own (2) so the seat, its upkeep cursor
 *  and its auction all have a row to live on. */
export const HQ_SEAT_COUNTS: Readonly<Record<HqStageId, number>> = {
  earth_ops: 0,
  orbital_deck: 24,
  lunar_hq: 12,
  mars_hq: 8,
  jovian_hq: 4,
  saturnian_hq: 4,
  deep_space_hq: 2,
  interstellar_hq: 2,
};

/** Posted seat price at an EMPTY pool ($). The pool marks it up with
 *  occupancy — hq-relocation.ts postedSeatPrice: base × (1 + 2·(occ/total)^1.5),
 *  so the last LEO seat lists near 3× the first. Burned on claim (a money
 *  sink, exactly like a slot-auction win — BALANCE.md).
 *  CC-3: at an AUCTION stage (HQ_AUCTION_STAGES) the same figure is the
 *  auction's RESERVE — the posted price stops being "pay this and it is
 *  yours" and becomes the minimum qualifying bid. */
export const HQ_SEAT_BASE_PRICE: Readonly<Record<HqStageId, number>> = {
  earth_ops: 0,
  orbital_deck: 25_000_000,
  lunar_hq: 150_000_000,
  // CC-3 (BALANCE.md Pass 13): every outer reserve is ~40% of the outlay a
  // MATCHING corporation clears in 24 game-months, measured by
  // scripts/sim-hq-relocation.ts — a floor, not a valuation. These pools are
  // auctioned, so a contested seat clears wherever the bidders take it.
  mars_hq: 250_000_000,
  jovian_hq: 420_000_000,
  saturnian_hq: 420_000_000,
  deep_space_hq: 2_800_000_000,
  interstellar_hq: 1_500_000_000,
};

/** Seat lease term in game-months (6 h real each): auto-renews while the
 *  HQ stays; released to the pool when the corporation moves. */
export const HQ_SEAT_TERM_MONTHS = 6;

/** CC-3: stages whose vacant seats change hands ONLY at a sealed-bid
 *  auction (design §2 "sold through the existing orbital-slot auctions …
 *  ownership transfers at market-clearing prices"). LEO and Luna keep
 *  CC-2's first-come posted-price lease: their pools are large enough that
 *  an auction round-trip would be pure friction on the tier-2/3 on-ramp.
 *  From Mars outward the pools are 8 seats or fewer and genuinely
 *  contested, so price discovery is worth the wait. */
export const HQ_AUCTION_STAGES: ReadonlySet<HqStageId> = new Set<HqStageId>([
  'mars_hq', 'jovian_hq', 'saturnian_hq', 'deep_space_hq', 'interstellar_hq',
]);

/** Whether a seat at this stage must be WON rather than claimed. */
export function hqSeatIsAuctioned(stage: HqStageId | string | null | undefined): boolean {
  return isHqStageId(stage) && HQ_SEAT_COUNTS[stage] > 0 && HQ_AUCTION_STAGES.has(stage);
}

/** Relocation project: money + campaign-loop time per TARGET stage. */
export interface HqRelocationSpec { cost: number; months: number }
export const HQ_RELOCATION: Readonly<Record<HqStageId, HqRelocationSpec>> = {
  earth_ops: { cost: 0, months: 1 },            // return leg: see HQ_RETURN_COST_FRACTION
  orbital_deck: { cost: 45_000_000, months: 2 },
  lunar_hq: { cost: 220_000_000, months: 4 },
  // CC-3: ~60% of the 24-month outlay each rung's matching corporation
  // clears (Pass 13). The deep-space rung is the dearest seat in the game
  // because Kuiper extraction is the biggest revenue line in the game and
  // its +15% lands squarely on it; the interstellar rung costs LESS on
  // purpose — its barrier is the gate (a $80B Colony Ark and the
  // Interstellar Colonization tech), not the rent.
  mars_hq: { cost: 380_000_000, months: 6 },
  jovian_hq: { cost: 650_000_000, months: 8 },
  saturnian_hq: { cost: 650_000_000, months: 8 },
  deep_space_hq: { cost: 4_400_000_000, months: 12 },
  interstellar_hq: { cost: 2_400_000_000, months: 18 },
};

/** Moving BACK to Earth costs this fraction of the departing stage's
 *  relocation cost (design §3 "moving back is allowed (at cost)") and takes
 *  HQ_RELOCATION.earth_ops.months. */
export const HQ_RETURN_COST_FRACTION = 0.25;

/** Monthly HQ upkeep per stage ($ per game-month). CC-3 moved the CHARGE
 *  server-side (hq-relocation-server.ts chargeHqSeatUpkeep → the
 *  `hq_seat_upkeep` ledger reason, debited against the persisted wallet);
 *  the client tick applies the identical figure on its own monthly beat,
 *  which is why the reason sits in ledger-reconcile.ts
 *  CLIENT_APPLIED_LEDGER_REASONS and never comes back as a pending delta.
 *  Earth pays nothing. */
export const HQ_UPKEEP_MONTHLY: Readonly<Record<HqStageId, number>> = {
  earth_ops: 0,
  orbital_deck: 1_000_000,
  lunar_hq: 3_500_000,
  // CC-3: ~15% of the measured monthly gain of a matching corporation, the
  // same share LEO's $1.0M is of its +12% launch line.
  mars_hq: 5_000_000,
  jovian_hq: 8_000_000,
  saturnian_hq: 8_000_000,
  deep_space_hq: 50_000_000,
  interstellar_hq: 20_000_000,
};

/** CC-3: consecutive unpayable upkeep months before the seat lapses back to
 *  the pool and the headquarters is returned to Earth. Two game-months = 12
 *  real hours of grace — long enough that one bad trading day never costs a
 *  corporation its anchorage, short enough that an abandoned seat returns to
 *  a contested pool inside a day. Mirrors the mining claim's "an unpayable
 *  month lapses the claim" rule with one extra month, because an HQ seat is
 *  the single most visible asset a corporation owns. */
export const HQ_SEAT_UPKEEP_GRACE_MONTHS = 2;

/** The ±10-15% seat bonus profile (design §2, Jay 2026-09-13 call 1). Every
 *  field is a MULTIPLIER (1.0 = neutral) so a stage that does not touch a
 *  term simply leaves it at 1. Wired terms:
 *   - hiringCostMult      → labor-market.ts getHireCostWithWageIndex
 *   - contractPayoutMult  → contracts.ts applyContractReward,
 *                           delivery-contracts.ts completeDelivery
 *                           (server ceiling: contract-credit.ts MAX mult)
 *   - miningFuelMult, beltDeltaVMult → mining-orders.ts quoteLeg (client
 *                           preview, page handler and the server route all
 *                           call the same pure planner)
 *   - expeditionReturnMult→ hqExpeditionReturnMult below (CC-4), called by
 *                           expeditions.ts (the tick pays the survey data
 *                           out) AND by server-expeditions.ts (the server's
 *                           one-shot headroom credit for that same payout)
 *   - EVERY service-revenue / service-cost term (launchRevenueMult,
 *     satelliteOpsCostMult, colonyThroughputMult, marsOpsMult,
 *     outerExtractionMult, scienceMult) → hqServiceRevenueMult /
 *     hqServiceCostMult below, called by game-engine.ts §1 (the tick),
 *     economy-report.ts (the P&L), resource-plausibility.ts (the SERVER's
 *     monthly-gross ceiling) and scripts/sim-harness.ts (balance). One
 *     helper, four callers — the ceiling can never fall behind the tick. */
export interface HqBonuses {
  hiringCostMult: number;
  contractPayoutMult: number;
  launchRevenueMult: number;
  satelliteOpsCostMult: number;
  miningFuelMult: number;
  beltDeltaVMult: number;
  /** Service revenue at a settled colony surface (HQ_COLONY_LOCATIONS). */
  colonyThroughputMult: number;
  /** Service revenue in MARS ORBIT — the relay and contract business above
   *  Meridian, deliberately disjoint from the colony-surface term so the
   *  Mars seat can carry both without breaking the ±15% band. */
  marsOpsMult: number;
  /** mining_output revenue at an OUTER region (HQ_OUTER_LOCATIONS). */
  outerExtractionMult: number;
  /** sensor_service ("science and sensing") revenue, wherever it operates. */
  scienceMult: number;
  /** Interstellar survey-data payout on an expedition's return. */
  expeditionReturnMult: number;
}

export const NEUTRAL_HQ_BONUSES: Readonly<HqBonuses> = Object.freeze({
  hiringCostMult: 1, contractPayoutMult: 1, launchRevenueMult: 1, satelliteOpsCostMult: 1,
  miningFuelMult: 1, beltDeltaVMult: 1, colonyThroughputMult: 1, marsOpsMult: 1,
  outerExtractionMult: 1, scienceMult: 1, expeditionReturnMult: 1,
});

const HQ_BONUS_TABLE: Readonly<Record<HqStageId, Partial<HqBonuses>>> = {
  earth_ops: { hiringCostMult: 0.90, contractPayoutMult: 1.10 },
  orbital_deck: { launchRevenueMult: 1.12, satelliteOpsCostMult: 0.90 },
  lunar_hq: { miningFuelMult: 0.88, beltDeltaVMult: 0.90 },
  mars_hq: { colonyThroughputMult: 1.12, marsOpsMult: 1.10 },
  // The two tier-5 seats are a real CHOICE, not a coin flip: Jupiter leans
  // extraction, Saturn leans science. A corporation takes one, never both.
  jovian_hq: { outerExtractionMult: 1.12, scienceMult: 1.10 },
  saturnian_hq: { outerExtractionMult: 1.10, scienceMult: 1.12 },
  // The ladder's extraction term climbs as the seat goes out (1.12 Jupiter,
  // 1.10 Saturn which leans science instead, 1.15 at the heliopause), and
  // the deep-space seat is the first that pays on expeditions.
  deep_space_hq: { outerExtractionMult: 1.15, expeditionReturnMult: 1.15 },
  interstellar_hq: { colonyThroughputMult: 1.15, expeditionReturnMult: 1.15 },
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

// ─── CC-3 region sets (derived from the location data, not hand lists) ──────

/** Settled colony SURFACES — every colonizable body in colonies.ts plus the
 *  two surfaces the base solar system already settles (Luna, Mars). The
 *  Mars and interstellar seats' "colony throughput" term applies here. */
export const HQ_COLONY_LOCATIONS: ReadonlySet<string> = new Set<string>([
  ...EXPANDED_LOCATIONS.map(l => l.id),
  'lunar_surface', 'mars_surface',
]);

/** Mars ORBIT — the relay business above Meridian. Deliberately disjoint
 *  from HQ_COLONY_LOCATIONS so the Mars seat's two terms never multiply. */
export const HQ_MARS_ORBITAL_LOCATIONS: ReadonlySet<string> = new Set<string>(['mars_orbit']);

/** The OUTER regions: the three system-scale locations beyond the belt plus
 *  every colonizable body that hangs off one of them (colonies.ts `type`). */
export const HQ_OUTER_LOCATIONS: ReadonlySet<string> = new Set<string>([
  'jupiter_system', 'saturn_system', 'outer_system',
  ...EXPANDED_LOCATIONS
    .filter(l => ['jupiter', 'saturn', 'uranus', 'neptune', 'outer_system'].includes(String(l.type)))
    .map(l => l.id),
]);

export function isHqColonyLocation(locationId: string | null | undefined): boolean {
  return !!locationId && HQ_COLONY_LOCATIONS.has(locationId);
}
export function isHqMarsOrbitalLocation(locationId: string | null | undefined): boolean {
  return !!locationId && HQ_MARS_ORBITAL_LOCATIONS.has(locationId);
}
export function isHqOuterLocation(locationId: string | null | undefined): boolean {
  return !!locationId && HQ_OUTER_LOCATIONS.has(locationId);
}

/** The minimum a revenue/cost term needs to know about a running service. */
export interface HqServiceContext { definitionId: string; locationId: string; type: string }

/**
 * THE single site every service-revenue HQ term is computed on. The client
 * tick (game-engine.ts §1), the P&L (economy-report.ts), the server's
 * monthly-gross ceiling (resource-plausibility.ts) and the balance harness
 * (scripts/sim-harness.ts) all call this with the same arguments, so the
 * ceiling can never come out below what the tick paid — the failure mode
 * that rejected real income twice in the week CC-2 shipped.
 *
 * Terms are chosen so no stage's own profile ever multiplies two of them on
 * the same service (the colony-surface and Mars-orbit sets are disjoint; no
 * stage carries both a colony and an outer term), which keeps every seat
 * inside the founder's ±10-15% band. The Frontier stacking cap is applied
 * here once, exactly as CC-2 applied it to the launch term.
 */
export function hqServiceRevenueMult(bonuses: HqBonuses, svc: HqServiceContext, frontierMult = 1): number {
  let m = 1;
  if (svc.type === 'launch_payload') m *= bonuses.launchRevenueMult;
  if (isHqColonyLocation(svc.locationId)) m *= bonuses.colonyThroughputMult;
  if (isHqMarsOrbitalLocation(svc.locationId)) m *= bonuses.marsOpsMult;
  if (svc.type === 'mining_output' && isHqOuterLocation(svc.locationId)) m *= bonuses.outerExtractionMult;
  if (svc.type === 'sensor_service') m *= bonuses.scienceMult;
  return hqRevenueMultUnderFrontier(m, frontierMult);
}

/** The operating-cost side of the same contract (LEO's −10% satellite ops). */
export function hqServiceCostMult(bonuses: HqBonuses, serviceId: string): number {
  return isHqSatelliteOpsService(serviceId) ? bonuses.satelliteOpsCostMult : 1;
}

/**
 * CC-4: THE single site the expedition-return term is computed on — the
 * counterpart of hqServiceRevenueMult for the one bonus that is NOT tick
 * income. Callers:
 *   - expeditions.ts processExpeditionTick (the client pays the survey data
 *     out when an expedition comes home);
 *   - server-expeditions.ts creditDueExpeditionReturns (the SERVER's
 *     one-shot headroom credit for that same payout, from its own
 *     Expedition rows — the sync ceiling would otherwise reject an $8-17B
 *     return outright);
 *   - scripts/sim-hq-relocation.ts (balance).
 * Three callers, one definition. A term added anywhere else is the exact
 * failure that rejected real income twice the week CC-2 shipped.
 *
 * Unlike the service terms there is no Frontier interaction to cap: the
 * Frontier doubling applies to SERVICE revenue only, and a corporation
 * inside its first month has neither an interstellar hull nor a seat that
 * carries this term.
 */
export function hqExpeditionReturnMult(bonuses: HqBonuses): number {
  const m = bonuses.expeditionReturnMult;
  return Number.isFinite(m) && m > 0 ? m : 1;
}

/** The same term for a stage id (the server holds a stage, not a profile). */
export function hqExpeditionReturnMultForStage(stage: HqStageId | string | null | undefined): number {
  return hqExpeditionReturnMult(getHqBonuses(stage));
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

/** A synthetic profile holding EVERY stage's best value per term — what the
 *  server ceiling uses when it cannot vouch for the seated stage
 *  (`hqStage: 'unknown'`). Never a real seat; always an upper bound. */
export function maxHqBonusesForCeiling(): HqBonuses {
  const out = { ...NEUTRAL_HQ_BONUSES } as HqBonuses;
  for (const key of Object.keys(NEUTRAL_HQ_BONUSES) as Array<keyof HqBonuses>) {
    out[key] = maxHqBonus(key);
  }
  return out;
}

/** Frontier interaction rule (docs/BALANCE.md Pass 11): an HQ revenue
 *  bonus never stacks multiplicatively with the Frontier ×2.0 on the SAME
 *  term beyond ×2.3. Returns the HQ multiplier to apply alongside a given
 *  Frontier multiplier — the full bonus for veterans, trimmed only if the
 *  product would exceed the cap (2.0 × 1.15 = 2.30 today, so nothing is
 *  trimmed; the rule binds the moment either constant grows). Client engine,
 *  the P&L and the server ceiling all reach it via hqServiceRevenueMult. */
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
