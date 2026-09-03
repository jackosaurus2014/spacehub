// ─── Space Tycoon: Interstellar Expedition Engine (Wave 10, Phase 1) ────────
// The end-game loop per CLAUDE.md "Long-horizon expansion": solar-system play
// is the mid-game; interstellar exploration, colonization, and trade are the
// campaign-scale endpoint. Per docs/SESSION_DESIGN.md, everything in this
// module lives on the CAMPAIGN loop — expeditions resolve over hundreds of
// game-months (hours-to-days of real time), colonies mature over weeks, trade
// routes pay out on multi-month lead times. Do not collapse this tempo.
//
// Lore (docs/LORE.md): the Breakthrough of 2147 gave humanity Alcubierre-class
// metric engines; Wanderer-1 returned telemetry from Proxima. Players in 2150
// are racing to commercialize the interstellar era. Destination data comes
// from INTERSTELLAR_SYSTEMS in interstellar.ts (the Phase VIII data spec).
//
// Design invariants honored (CLAUDE.md checklist):
// - Meaningful decisions: which system, which hull, insure-or-not, extra
//   shielding, colonize-or-return, which resource to route home.
// - Realistic economics: fuel + supplies + insurance are real launch costs;
//   logistics fees on every shipment; colony output enters the SAME inventory
//   the market trades from (state.resources), so exotic goods hit supply.
// - Real risk, no PvP: hazards en route mirror hazards.ts (environmental /
//   equipment only). Total loss is possible ONLY along with upfront
//   insurance-style mitigation options the player chose to buy or skip.
// - Determinism: every expedition fixes an RNG seed at launch (mulberry32,
//   same generator commanders.ts / delivery-contracts.ts use), so hazard and
//   outcome rolls are replayable and testable.

import type {
  GameState,
  GameEvent,
  GameReport,
  ExpeditionState,
  ExpeditionPhase,
  ExpeditionHazardEntry,
  ExpeditionOutcome,
  InterstellarColonyState,
  InterstellarTradeRouteState,
} from './types';
import { INTERSTELLAR_SYSTEM_MAP, getJumpPrerequisites, FIRST_CONTACT_EVENTS } from './interstellar';
import type { InterstellarSystem } from './interstellar';
import { SHIP_MAP, getShipDerivedStats } from './ships';
import { RESOURCE_MAP } from './resources';
import { generateId, formatMoney } from './formulas';
import { MAX_EVENT_LOG, STARTING_YEAR } from './constants';
// 4X Wave W6 (science-missions.ts): boundary-charting programs (Meridian
// exoplanet census, Heliopause Probe, GW array) buff expedition survey
// payouts and trim transit hazard damage — knowledge de-risks the frontier.
import { getExpeditionScienceBonuses } from './science-missions';
// Construction Purposes wave: deep-space support buildings trim transit
// hazard damage (expeditionSupport — see processExpeditionTick).
import { getGlobalCapabilityBonus } from './building-capabilities';
// AAA Round 1 E3.3: completed cooperative mega-projects discount launch
// spending — the consumer that turns the Space Elevator's reward from a
// label into a payoff.
import { applyLaunchCostReduction } from './mega-projects';

// ─── Tuning constants ────────────────────────────────────────────────────────

/**
 * Game-months of transit per light-year.
 * 30 game-months/ly ≈ 2.5 game-years per light-year ≈ 0.4c effective velocity
 * — consistent with LORE.md's "crewed interstellar missions expected within a
 * decade" of the 2147 Breakthrough (Proxima at 4.24 ly ≈ 10.6 game-years
 * one-way... with drive spool + sublight approach, jumps are fuel-bound, not
 * time-free; see interstellar.ts). In real time (6 real hours per game-month,
 * server-time.ts REAL_SECONDS_PER_GAME_MONTH — the one game clock since the
 * 2026-09-02 clock unification): Proxima ≈ 32 real days one-way, ~64 days
 * round trip; Sirius ≈ 130 days round trip — the multi-month campaign loop
 * docs/SESSION_DESIGN.md reserves for interstellar returns. The calendar
 * advances on the global server clock, so expeditions progress while offline.
 */
export const GAME_MONTHS_PER_LY = 30;

/** Survey window at the destination before an explorer auto-returns.
 *  Colony arks instead hold station indefinitely (they are built to stay),
 *  so an offline player never loses the colonize decision — holding costs
 *  (ark maintenance) keep ticking, which is the real trade-off. */
export const EXPLORE_DURATION_MONTHS = 12;

/** Ship definition ids allowed to launch expeditions / found colonies. */
export const EXPEDITION_CAPABLE_SHIP_IDS = ['starfarer_explorer', 'colony_ark'] as const;
export const COLONY_CAPABLE_SHIP_IDS = ['colony_ark'] as const;

/** Supplies cost per game-month of planned mission duration (crew consumables,
 *  spares, drive conditioning). $50M/month × ~260-month Proxima round trip ≈
 *  $13B — sized against the $25B Starfarer hull so consumables are a real but
 *  not dominant line item (compare: deep_space_miner $1B hull / $5M-month
 *  maintenance ≈ same ~0.5%/month order of magnitude). */
export const SUPPLIES_COST_PER_MONTH = 50_000_000;

/** Exotic fuel procured on the open market when the player's own inventory
 *  falls short, at a 25% broker premium over baseMarketPrice — mirrors the
 *  market broker-fee money-sink pattern (docs/BALANCE.md). Colonies that
 *  refine exotic_fuel let players skip this premium: the compounding
 *  "later jumps get cheaper" loop CLAUDE.md asks of long-horizon progression. */
export const FUEL_PROCUREMENT_PREMIUM = 1.25;

/** Single-premium expedition insurance: 8% of insured basis, 70% payout on
 *  total loss. 70% matches the building-insurance payout in hazards.ts; the
 *  8% flat premium is positive-EV for the insurer as long as loss rates stay
 *  under ~11%, consistent with the few-percent loss rate a shielded route
 *  should see. Skipping it is a legitimate gamble — that's the decision. */
export const INSURANCE_PREMIUM_RATE = 0.08;
export const INSURANCE_PAYOUT_RATE = 0.70;

/** Optional hardened-hull provisioning: +10% of hull cost for +0.15 shielding. */
export const EXTRA_SHIELDING_COST_RATE = 0.10;
export const EXTRA_SHIELDING_BONUS = 0.15;

/** heavy_radiation_shielding research grants a further -25% hazard damage
 *  (it is also a hard prerequisite for the Sirius route per interstellar.ts). */
export const HEAVY_SHIELDING_RESEARCH_ID = 'heavy_radiation_shielding';
export const HEAVY_SHIELDING_DAMAGE_REDUCTION = 0.25;

/** Total mitigation cap — matches STATS_DESIGN "Shielding cap at 90%". */
const MITIGATION_CAP = 0.85;

/** Per-game-month hazard probabilities in jump transit. Sized so a Proxima
 *  round trip (~260 transit months) sees ~5 events and loses ~25% hull on a
 *  baseline-shielded Starfarer — scary but survivable; longer/hotter routes
 *  require the shielding investments. Type mix mirrors hazards.ts (solar
 *  storm → radiation burst, micrometeorite → debris impact, equipment
 *  failure → systems failure). No pirates beyond the heliopause — Corsair
 *  clans don't own jump drives (LORE.md).
 */
const TRANSIT_HAZARD_PROB: Record<ExpeditionHazardEntry['type'], number> = {
  radiation_burst: 0.008,
  debris_impact: 0.006,
  systems_failure: 0.006,
};

/** Raw hull damage range per hazard event (before mitigation). */
const TRANSIT_HAZARD_DAMAGE: Record<ExpeditionHazardEntry['type'], [number, number]> = {
  radiation_burst: [0.04, 0.12],
  debris_impact: [0.03, 0.10],
  systems_failure: [0.05, 0.14],
};

/** Route danger multiplier per system — derived from the descriptions in
 *  interstellar.ts (Wolf 359 is a flare star; the Sirius route is "dangerous —
 *  high radiation"). Unknown systems default to 1.2. */
const SYSTEM_HAZARD_MULTIPLIER: Record<string, number> = {
  proxima_centauri: 1.0,
  alpha_centauri: 1.0,
  barnards_star: 1.2,
  wolf_359: 1.6,
  sirius: 2.0,
};

/** Survey data sale on return: $2B per light-year of distance (±25% roll).
 *  Anchor: the best solar-system survey-probe discovery (outer_system
 *  "Interstellar Object") pays $1B; first-party data from an actual other
 *  star is worth an order of magnitude more, scaling with how far no one
 *  else has gone. Proxima ≈ $8.5B, Sirius ≈ $17B. */
export const SURVEY_DATA_PAYOUT_PER_LY = 2_000_000_000;

/** Sample cargo rolled from a system's knownResources on arrival — only
 *  resources worth hauling across light-years (unit price ≥ rare_earth's
 *  $200K). Water and structural metals stay behind. */
const SAMPLE_WORTHY_RESOURCES = new Set(['exotic_materials', 'helium3', 'rare_earth', 'platinum_group', 'gold']);

// ─── Colony tuning ───────────────────────────────────────────────────────────

/** One-time founding cost on top of the (already committed) Colony Ark:
 *  site survey, landing operations, first-year infrastructure. Anchored at
 *  25% of the ark's $80B hull. */
export const COLONY_FOUNDING_COST = 20_000_000_000;

export const COLONY_STARTING_POPULATION = 100;
export const COLONY_MAX_INFRASTRUCTURE = 5; // STATS_DESIGN cap style: max level 5
export const COLONY_POP_CAP_PER_LEVEL = 500;
export const COLONY_POP_GROWTH_RATE = 0.02; // +2%/game-month

/** Upgrade cost doubles per level: L2 = $25B … L5 = $200B. Sized against
 *  corporation tier thresholds ($500B totalEarned for tier 5): a maxed colony
 *  is a program measured in hundreds of billions, i.e. a true end-game sink. */
export const COLONY_UPGRADE_BASE_COST = 25_000_000_000;
/** Upgrades take 24 game-months per target level (campaign cadence). */
export const COLONY_UPGRADE_MONTHS_PER_LEVEL = 24;
/** Organic-growth gate: population must reach 80% of the current cap before
 *  the next infrastructure level can begin — time-gates colony scaling to the
 *  campaign loop rather than a money-only fast lane. */
export const COLONY_UPGRADE_POP_THRESHOLD = 0.8;

/** Monthly colony output per infrastructure level at suitability 1.0.
 *  Anchors: svc_mining_europa produces 5 exotic_materials/month, so a fresh
 *  L1 colony (×suitability ~0.7-1.0) is comparable to the best solar-system
 *  source and scales past it with infrastructure — the reason to go at all.
 *  exotic_fuel at 20/month means ~50 months of L1 output funds one Proxima
 *  round trip's fuel (1,000 units) — the compounding cheaper-jumps loop. */
export const COLONY_OUTPUT_PER_LEVEL: Record<string, number> = {
  exotic_fuel: 20,
  exotic_materials: 4,
  helium3: 2,
  rare_earth: 10,
  platinum_group: 5,
  gold: 8,
  xenogenic_biomatter: 3,
};

/** Colony crisis (epidemic / life-support failure — CLAUDE.md hazard list):
 *  0.8%/month baseline, reduced 10% per infrastructure level above 1. Never
 *  destroys a colony (population floor), but costs people and stockpile. */
export const COLONY_CRISIS_BASE_PROB = 0.008;
export const COLONY_CRISIS_POP_FLOOR = 50;

// ─── Trade route tuning ──────────────────────────────────────────────────────

/** One-time route establishment: charter, nav beacons, transfer hardware. */
export const TRADE_ROUTE_SETUP_COST = 5_000_000_000;
/** Per-departure logistics fee — CLAUDE.md: "Logistics cost money." */
export const TRADE_LOGISTICS_BASE_FEE = 200_000_000;
export const TRADE_LOGISTICS_FEE_PER_LY = 100_000_000;
/** Departures at most every max(12, transit/2) game-months; a shipment skips
 *  its window if the stockpile holds fewer than MIN_SHIPMENT_UNITS. */
export const TRADE_MIN_CYCLE_MONTHS = 12;
export const TRADE_MIN_SHIPMENT_UNITS = 10;

/** Safety valve on catch-up processing after very long absences. 20,000
 *  game-months ≈ 14 real days of calendar; nothing in the sim needs more. */
const MAX_CATCHUP_MONTHS = 20_000;

// ─── Deterministic RNG (same generator as commanders.ts) ────────────────────

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash for string-derived seeds (colony/route monthly rolls). */
function hash32(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ─── Game-month bookkeeping ──────────────────────────────────────────────────

/** Total whole game-months elapsed since STARTING_YEAR/January — the same
 *  convention as quarterly-reports.ts's getTotalGameMonthsElapsed (kept local
 *  to avoid pulling the economy-report graph into this module). */
export function getTotalGameMonths(gameDate: { year: number; month: number }): number {
  return (gameDate.year - STARTING_YEAR) * 12 + (gameDate.month - 1);
}

// ─── Plan: validation + cost quote (pure, no mutation) ──────────────────────

export interface ExpeditionPlanRequest {
  targetSystemId: string;
  shipInstanceId: string;
  insured: boolean;
  extraShielding: boolean;
}

export interface ExpeditionCostQuote {
  fuelUnitsRequired: number;
  fuelFromInventory: number;
  fuelUnitsPurchased: number;
  fuelPurchaseCost: number;
  suppliesCost: number;
  shieldingCost: number;
  insuranceBasis: number;
  insurancePremium: number;
  totalMoneyCost: number;
}

export interface ExpeditionPlan {
  ok: true;
  system: InterstellarSystem;
  shipInstanceId: string;
  shipDefinitionId: string;
  isColonyShip: boolean;
  outboundMonths: number;
  exploreMonths: number;
  /** Explorer round trip; colony arks are one-way (0 return months). */
  totalPlannedMonths: number;
  crewRequired: number;
  costs: ExpeditionCostQuote;
}

export interface ExpeditionPlanError {
  ok: false;
  reason:
    | 'unknown_system'
    | 'missing_prerequisites'
    | 'ship_not_found'
    | 'ship_not_built'
    | 'ship_busy'
    | 'ship_not_expedition_capable'
    | 'insufficient_crew'
    | 'insufficient_funds';
  missingPrerequisites?: string[];
  detail?: string;
}

function getWorkforceTotal(state: GameState): number {
  const w = state.workforce;
  if (!w) return 0;
  return (w.pilots || 0) + w.scientists + w.engineers + w.operators + w.miners;
}

/** Validate an expedition and quote its full cost. Pure — never mutates. */
export function planExpedition(
  state: GameState,
  req: ExpeditionPlanRequest,
): ExpeditionPlan | ExpeditionPlanError {
  const system = INTERSTELLAR_SYSTEM_MAP.get(req.targetSystemId);
  if (!system) return { ok: false, reason: 'unknown_system' };

  const missing = getJumpPrerequisites(req.targetSystemId, state.completedResearch);
  if (missing.length > 0) {
    return { ok: false, reason: 'missing_prerequisites', missingPrerequisites: missing };
  }

  const ship = (state.ships || []).find(s => s.instanceId === req.shipInstanceId);
  if (!ship) return { ok: false, reason: 'ship_not_found' };
  if (!ship.isBuilt) return { ok: false, reason: 'ship_not_built' };
  if (ship.status !== 'idle') return { ok: false, reason: 'ship_busy' };
  if (!(EXPEDITION_CAPABLE_SHIP_IDS as readonly string[]).includes(ship.definitionId)) {
    return { ok: false, reason: 'ship_not_expedition_capable' };
  }
  const shipDef = SHIP_MAP.get(ship.definitionId);
  if (!shipDef) return { ok: false, reason: 'ship_not_found' };

  const isColonyShip = (COLONY_CAPABLE_SHIP_IDS as readonly string[]).includes(ship.definitionId);
  const crewRequired = getShipDerivedStats(shipDef).crewRequired;
  if (getWorkforceTotal(state) < crewRequired) {
    return { ok: false, reason: 'insufficient_crew', detail: `Requires ${crewRequired} crew from your workforce.` };
  }

  const outboundMonths = Math.ceil(system.distanceLy * GAME_MONTHS_PER_LY);
  const exploreMonths = EXPLORE_DURATION_MONTHS;
  // Colony arks are a one-way commitment (they become the colony's core);
  // explorers plan a full round trip — and buy fuel for both jumps.
  const totalPlannedMonths = isColonyShip
    ? outboundMonths + exploreMonths
    : outboundMonths * 2 + exploreMonths;

  const fuelUnitsRequired = system.jumpFuelRequired * (isColonyShip ? 1 : 2);
  const fuelInInventory = state.resources?.exotic_fuel || 0;
  const fuelFromInventory = Math.min(fuelInInventory, fuelUnitsRequired);
  const fuelUnitsPurchased = fuelUnitsRequired - fuelFromInventory;
  const fuelSpot = RESOURCE_MAP.get('exotic_fuel')?.baseMarketPrice || 5_000_000;
  const fuelPurchaseCost = Math.round(fuelUnitsPurchased * fuelSpot * FUEL_PROCUREMENT_PREMIUM);

  const suppliesCost = totalPlannedMonths * SUPPLIES_COST_PER_MONTH;
  const shieldingCost = req.extraShielding ? Math.round(shipDef.baseCost * EXTRA_SHIELDING_COST_RATE) : 0;

  // Insurance basis covers everything at risk: hull replacement + consumables
  // + fuel actually spent (inventory fuel is valued at spot — it is real
  // opportunity cost even when not purchased).
  const insuranceBasis = shipDef.baseCost + suppliesCost + Math.round(fuelUnitsRequired * fuelSpot) + shieldingCost;
  const insurancePremium = req.insured ? Math.round(insuranceBasis * INSURANCE_PREMIUM_RATE) : 0;

  // E3.3: an interstellar departure is the single largest "put mass into
  // space" transaction in the game, so a completed Space Elevator discounts
  // it. Identity (x1) on every save until a server finishes the project —
  // see mega-projects.ts::getLaunchCostMultiplier.
  const totalMoneyCost = applyLaunchCostReduction(
    fuelPurchaseCost + suppliesCost + shieldingCost + insurancePremium,
    state,
  );
  if (state.money < totalMoneyCost) {
    return { ok: false, reason: 'insufficient_funds', detail: `Launch requires ${formatMoney(totalMoneyCost)}.` };
  }

  return {
    ok: true,
    system,
    shipInstanceId: ship.instanceId,
    shipDefinitionId: ship.definitionId,
    isColonyShip,
    outboundMonths,
    exploreMonths,
    totalPlannedMonths,
    crewRequired,
    costs: {
      fuelUnitsRequired,
      fuelFromInventory,
      fuelUnitsPurchased,
      fuelPurchaseCost,
      suppliesCost,
      shieldingCost,
      insuranceBasis,
      insurancePremium,
      totalMoneyCost,
    },
  };
}

// ─── Launch ──────────────────────────────────────────────────────────────────

/** Crew is drawn from workforce pools in this order and returned to the same
 *  pools when the expedition comes home (lost with the ship otherwise). */
const CREW_DRAW_ORDER = ['pilots', 'scientists', 'engineers', 'operators', 'miners'] as const;

export interface LaunchResult {
  ok: true;
  state: GameState;
  expedition: ExpeditionState;
}

export function launchExpedition(
  state: GameState,
  req: ExpeditionPlanRequest,
  now: number = Date.now(),
  /** Deterministic seed override for tests; defaults to a random seed. */
  seedOverride?: number,
): LaunchResult | ExpeditionPlanError {
  const plan = planExpedition(state, req);
  if (!plan.ok) return plan;

  const { system, costs } = plan;

  // Deduct money.
  const money = state.money - costs.totalMoneyCost;
  const totalSpent = state.totalSpent + costs.totalMoneyCost;

  // Consume inventory fuel. Row 13 note (location-aware inventory): expedition
  // supplies stay on the HOME pool by design — interstellar missions stage
  // out of the Earth cluster, so their exotic fuel and consumables have to be
  // physically at Earth. Colony-refined exotic fuel reaches this pool the same
  // way any remote good does: an interstellar trade route (or a freighter)
  // brings it home first. That is the intended logistics cost, not an
  // oversight.
  const resources = { ...(state.resources || {}) };
  if (costs.fuelFromInventory > 0) {
    resources.exotic_fuel = (resources.exotic_fuel || 0) - costs.fuelFromInventory;
  }

  // Commit crew.
  const workforce = { ...(state.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 }) };
  const crewBreakdown: Record<string, number> = {};
  let crewLeft = plan.crewRequired;
  for (const pool of CREW_DRAW_ORDER) {
    if (crewLeft <= 0) break;
    const available = (workforce as Record<string, number | undefined>)[pool] || 0;
    const take = Math.min(available, crewLeft);
    if (take > 0) {
      (workforce as Record<string, number>)[pool] = available - take;
      crewBreakdown[pool] = take;
      crewLeft -= take;
    }
  }

  // Commit ship.
  const ships = (state.ships || []).map(s =>
    s.instanceId === plan.shipInstanceId
      ? { ...s, status: 'expedition' as const, currentLocation: `transit_${system.id}` }
      : s,
  );

  const seed = seedOverride !== undefined
    ? (seedOverride >>> 0)
    : (Math.floor(Math.random() * 0xffffffff) >>> 0);

  const expedition: ExpeditionState = {
    id: generateId(),
    targetSystemId: system.id,
    shipInstanceId: plan.shipInstanceId,
    shipDefinitionId: plan.shipDefinitionId,
    crew: plan.crewRequired,
    crewBreakdown,
    phase: 'outbound',
    launchedAtMs: now,
    launchGameMonth: getTotalGameMonths(state.gameDate),
    outboundMonths: plan.outboundMonths,
    exploreMonths: plan.exploreMonths,
    monthsElapsed: 0,
    seed,
    insured: req.insured,
    insurancePremiumPaid: costs.insurancePremium,
    extraShielding: req.extraShielding,
    totalCost: costs.totalMoneyCost + Math.round(costs.fuelFromInventory * (RESOURCE_MAP.get('exotic_fuel')?.baseMarketPrice || 5_000_000)),
    hullIntegrity: 1.0,
    hazardLog: [],
  };

  const event: GameEvent = {
    id: generateId(),
    date: state.gameDate,
    type: 'milestone',
    title: `🌠 Expedition Launched: ${system.name}`,
    description: `${plan.isColonyShip ? 'Colony ark' : 'Starfarer'} departs for ${system.name} (${system.distanceLy} ly, ~${plan.outboundMonths} months outbound). ${req.insured ? 'Fully insured.' : 'UNINSURED — total loss is uncovered.'}`,
  };

  const newState: GameState = {
    ...state,
    money,
    totalSpent,
    resources,
    workforce,
    ships,
    expeditions: [...(state.expeditions || []), expedition],
    eventLog: [event, ...(state.eventLog || [])].slice(0, MAX_EVENT_LOG),
  };

  return { ok: true, state: newState, expedition };
}

// ─── Arrival outcome (deterministic from expedition seed) ────────────────────

function rollOutcome(exp: ExpeditionState, system: InterstellarSystem): ExpeditionOutcome {
  const rng = mulberry32(exp.seed ^ 0x9e3779b9);

  const surveyDataPayout = Math.round(
    SURVEY_DATA_PAYOUT_PER_LY * system.distanceLy * (0.75 + rng() * 0.5),
  );

  const resourceSamples: Record<string, number> = {};
  for (const resId of system.knownResources) {
    if (!SAMPLE_WORTHY_RESOURCES.has(resId)) continue;
    resourceSamples[resId] = Math.round(20 + rng() * 40);
  }
  // First-contact systems yield xenogenic biomatter samples — the Hive
  // Collective "trades in bio-materials no other faction can provide" (LORE.md).
  if (system.firstContactFaction) {
    resourceSamples.xenogenic_biomatter = Math.round(5 + rng() * 10);
  }

  // Habitable-zone systems (per interstellar.ts descriptions) floor at 0.7.
  const habitableFloor = system.id === 'proxima_centauri' || system.id === 'alpha_centauri' ? 0.7 : 0.5;
  const colonySuitability = Math.min(1, habitableFloor + rng() * (1 - habitableFloor));

  const contact = FIRST_CONTACT_EVENTS[system.id];
  return {
    surveyDataPayout,
    resourceSamples,
    colonySuitability,
    firstContactFactionId: system.firstContactFaction,
    summary: contact
      ? `Survey of ${system.name} complete. ${contact.title}: ${contact.description}`
      : `Survey of ${system.name} complete. Exclusive stellar cartography and resource assays secured.`,
  };
}

// ─── Establish colony ────────────────────────────────────────────────────────

export interface ColonyResult {
  ok: true;
  state: GameState;
  colony: InterstellarColonyState;
}
export interface ColonyError {
  ok: false;
  reason:
    | 'expedition_not_found'
    | 'not_at_destination'
    | 'ship_not_colony_capable'
    | 'colony_already_exists_here'
    | 'insufficient_funds';
  detail?: string;
}

/** Found a colony at an expedition's destination. Requires the expedition to
 *  be in its 'exploring' phase with a colony-capable ship. The ark and its
 *  crew are permanently committed (crew become the colony's founding cadre —
 *  they do not return to the workforce). */
export function establishColony(
  state: GameState,
  expeditionId: string,
  name?: string,
  now: number = Date.now(),
  /** Row 12 (signal lag, docs/GAME_DESIGN_REVIEW_2026-09.md §2): when the
   *  founding fee already left at order-transmission time
   *  (interstellar-commands.ts), the arrival must not charge it twice.
   *  Default false keeps every direct/legacy call identical. */
  opts: { prepaid?: boolean } = {},
): ColonyResult | ColonyError {
  const expeditions = state.expeditions || [];
  const exp = expeditions.find(e => e.id === expeditionId);
  if (!exp) return { ok: false, reason: 'expedition_not_found' };
  if (exp.phase !== 'exploring') return { ok: false, reason: 'not_at_destination' };
  if (!(COLONY_CAPABLE_SHIP_IDS as readonly string[]).includes(exp.shipDefinitionId)) {
    return { ok: false, reason: 'ship_not_colony_capable' };
  }
  const system = INTERSTELLAR_SYSTEM_MAP.get(exp.targetSystemId);
  if (!system) return { ok: false, reason: 'expedition_not_found' };
  if ((state.interstellarColonies || []).some(c => c.systemId === system.id)) {
    return { ok: false, reason: 'colony_already_exists_here' };
  }
  const foundingCharge = opts.prepaid ? 0 : COLONY_FOUNDING_COST;
  if (state.money < foundingCharge) {
    return { ok: false, reason: 'insufficient_funds', detail: `Founding requires ${formatMoney(COLONY_FOUNDING_COST)}.` };
  }

  const suitability = exp.outcome?.colonySuitability ?? 0.6;

  // What the colony can produce: sample-worthy local resources, plus
  // exotic fuel if the corp has refining tech, plus biomatter at contact sites.
  const localResources: string[] = system.knownResources.filter(r => COLONY_OUTPUT_PER_LEVEL[r] !== undefined);
  if (state.completedResearch.includes('exotic_matter_refining') && !localResources.includes('exotic_fuel')) {
    localResources.push('exotic_fuel');
  }
  if (system.firstContactFaction === 'hive-collective' && !localResources.includes('xenogenic_biomatter')) {
    localResources.push('xenogenic_biomatter');
  }

  const currentMonth = getTotalGameMonths(state.gameDate);
  const colony: InterstellarColonyState = {
    id: generateId(),
    systemId: system.id,
    name: name || `${system.name} Colony`,
    foundedAtMs: now,
    foundedGameMonth: currentMonth,
    population: COLONY_STARTING_POPULATION,
    infrastructureLevel: 1,
    upgradeInProgress: null,
    localResources,
    stockpile: {},
    lastProcessedGameMonth: currentMonth,
    suitability,
  };

  const updatedExpeditions = expeditions.map(e =>
    e.id === expeditionId
      ? { ...e, phase: 'colonizing' as ExpeditionPhase, colonyId: colony.id, completedAtMs: now }
      : e,
  );
  // The ark remains on the books at the colony — its maintenance is the
  // colony's standing upkeep (a real recurring money sink).
  const ships = (state.ships || []).map(s =>
    s.instanceId === exp.shipInstanceId ? { ...s, currentLocation: system.id } : s,
  );

  const event: GameEvent = {
    id: generateId(),
    date: state.gameDate,
    type: 'milestone',
    title: `🏙️ Colony Founded: ${colony.name}`,
    description: `First permanent human settlement in the ${system.name} system. Suitability ${(suitability * 100).toFixed(0)}%. Produces: ${localResources.map(r => RESOURCE_MAP.get(r as never)?.name || r).join(', ') || 'nothing yet'}.`,
  };

  const newState: GameState = {
    ...state,
    money: state.money - foundingCharge,
    totalSpent: state.totalSpent + foundingCharge,
    expeditions: updatedExpeditions,
    interstellarColonies: [...(state.interstellarColonies || []), colony],
    ships,
    eventLog: [event, ...(state.eventLog || [])].slice(0, MAX_EVENT_LOG),
  };

  return { ok: true, state: newState, colony };
}

// ─── Upgrade colony ──────────────────────────────────────────────────────────

export interface UpgradeError {
  ok: false;
  reason: 'colony_not_found' | 'max_level' | 'upgrade_in_progress' | 'population_too_low' | 'insufficient_funds';
  detail?: string;
}

export function getColonyUpgradeCost(currentLevel: number): number {
  return COLONY_UPGRADE_BASE_COST * Math.pow(2, currentLevel - 1);
}

export function upgradeColony(
  state: GameState,
  colonyId: string,
  /** Row 12 (signal lag): fee already paid at transmission — see establishColony. */
  opts: { prepaid?: boolean } = {},
): { ok: true; state: GameState } | UpgradeError {
  const colonies = state.interstellarColonies || [];
  const colony = colonies.find(c => c.id === colonyId);
  if (!colony) return { ok: false, reason: 'colony_not_found' };
  if (colony.infrastructureLevel >= COLONY_MAX_INFRASTRUCTURE) return { ok: false, reason: 'max_level' };
  if (colony.upgradeInProgress) return { ok: false, reason: 'upgrade_in_progress' };

  const popCap = colony.infrastructureLevel * COLONY_POP_CAP_PER_LEVEL;
  if (colony.population < popCap * COLONY_UPGRADE_POP_THRESHOLD) {
    return {
      ok: false,
      reason: 'population_too_low',
      detail: `Needs ${Math.ceil(popCap * COLONY_UPGRADE_POP_THRESHOLD)} colonists (has ${Math.floor(colony.population)}).`,
    };
  }

  const cost = getColonyUpgradeCost(colony.infrastructureLevel);
  const upgradeCharge = opts.prepaid ? 0 : cost;
  if (state.money < upgradeCharge) {
    return { ok: false, reason: 'insufficient_funds', detail: `Upgrade requires ${formatMoney(cost)}.` };
  }

  const targetLevel = colony.infrastructureLevel + 1;
  const currentMonth = getTotalGameMonths(state.gameDate);
  const updated = colonies.map(c =>
    c.id === colonyId
      ? {
          ...c,
          upgradeInProgress: {
            targetLevel,
            completesAtGameMonth: currentMonth + COLONY_UPGRADE_MONTHS_PER_LEVEL * targetLevel,
          },
        }
      : c,
  );

  return {
    ok: true,
    state: {
      ...state,
      money: state.money - upgradeCharge,
      totalSpent: state.totalSpent + upgradeCharge,
      interstellarColonies: updated,
      eventLog: [{
        id: generateId(),
        date: state.gameDate,
        type: 'milestone' as const,
        title: `🏗️ Colony Expansion: ${colony.name}`,
        description: `Infrastructure level ${targetLevel} under construction (${COLONY_UPGRADE_MONTHS_PER_LEVEL * targetLevel} months, ${formatMoney(cost)}).`,
      }, ...(state.eventLog || [])].slice(0, MAX_EVENT_LOG),
    },
  };
}

// ─── Trade routes ────────────────────────────────────────────────────────────

export interface TradeRouteError {
  ok: false;
  reason: 'colony_not_found' | 'resource_not_produced' | 'route_already_exists' | 'insufficient_funds';
  detail?: string;
}

export function establishTradeRoute(
  state: GameState,
  colonyId: string,
  resourceId: string,
  now: number = Date.now(),
  /** Row 12 (signal lag): fee already paid at transmission — see establishColony. */
  opts: { prepaid?: boolean } = {},
): { ok: true; state: GameState; route: InterstellarTradeRouteState } | TradeRouteError {
  const colony = (state.interstellarColonies || []).find(c => c.id === colonyId);
  if (!colony) return { ok: false, reason: 'colony_not_found' };
  if (!colony.localResources.includes(resourceId)) {
    return { ok: false, reason: 'resource_not_produced', detail: `${colony.name} does not produce ${resourceId}.` };
  }
  const existing = (state.interstellarTradeRoutes || []).some(
    r => r.colonyId === colonyId && r.resourceId === resourceId,
  );
  if (existing) return { ok: false, reason: 'route_already_exists' };
  const setupCharge = opts.prepaid ? 0 : TRADE_ROUTE_SETUP_COST;
  if (state.money < setupCharge) {
    return { ok: false, reason: 'insufficient_funds', detail: `Route setup requires ${formatMoney(TRADE_ROUTE_SETUP_COST)}.` };
  }

  const system = INTERSTELLAR_SYSTEM_MAP.get(colony.systemId);
  const distanceLy = system?.distanceLy ?? 5;
  const transitMonths = Math.ceil(distanceLy * GAME_MONTHS_PER_LY);
  const cycleMonths = Math.max(TRADE_MIN_CYCLE_MONTHS, Math.round(transitMonths / 2));
  const currentMonth = getTotalGameMonths(state.gameDate);

  const route: InterstellarTradeRouteState = {
    id: generateId(),
    colonyId,
    systemId: colony.systemId,
    resourceId,
    establishedAtMs: now,
    establishedGameMonth: currentMonth,
    transitMonths,
    cycleMonths,
    // First departure waits one full cycle — the colony needs to accumulate.
    nextDepartureGameMonth: currentMonth + cycleMonths,
    inTransit: [],
    logisticsFeePerShipment: Math.round(TRADE_LOGISTICS_BASE_FEE + TRADE_LOGISTICS_FEE_PER_LY * distanceLy),
    status: 'active',
    totalDelivered: 0,
  };

  return {
    ok: true,
    route,
    state: {
      ...state,
      money: state.money - setupCharge,
      totalSpent: state.totalSpent + setupCharge,
      interstellarTradeRoutes: [...(state.interstellarTradeRoutes || []), route],
      eventLog: [{
        id: generateId(),
        date: state.gameDate,
        type: 'milestone' as const,
        title: `🛰️ Trade Route Established: ${colony.name}`,
        description: `${RESOURCE_MAP.get(resourceId as never)?.name || resourceId} shipments to Sol every ~${cycleMonths} months (${transitMonths}-month transit, ${formatMoney(route.logisticsFeePerShipment)}/shipment logistics).`,
      }, ...(state.eventLog || [])].slice(0, MAX_EVENT_LOG),
    },
  };
}

export function setTradeRouteStatus(
  state: GameState,
  routeId: string,
  status: 'active' | 'suspended',
): GameState {
  const routes = state.interstellarTradeRoutes || [];
  if (!routes.some(r => r.id === routeId && r.status !== status)) return state;
  const currentMonth = getTotalGameMonths(state.gameDate);
  return {
    ...state,
    interstellarTradeRoutes: routes.map(r =>
      r.id === routeId
        ? {
            ...r,
            status,
            // Resuming re-anchors the departure clock so a long suspension
            // doesn't cause an instant burst of departures.
            nextDepartureGameMonth: status === 'active'
              ? Math.max(r.nextDepartureGameMonth, currentMonth + Math.min(r.cycleMonths, TRADE_MIN_CYCLE_MONTHS))
              : r.nextDepartureGameMonth,
          }
        : r,
    ),
  };
}

// ─── Tick processing (wired into game-engine.processFullTick) ───────────────

/** Advance all interstellar systems to the current game-month. Pure; returns
 *  the same state reference when there is nothing to do. Deterministic given
 *  state (all randomness flows from per-expedition/per-colony seeds + month
 *  indices — no Math.random in the tick path). */
export function processExpeditionTick(state: GameState, now: number = Date.now()): GameState {
  const hasWork =
    (state.expeditions?.length || 0) > 0 ||
    (state.interstellarColonies?.length || 0) > 0 ||
    (state.interstellarTradeRoutes?.length || 0) > 0;
  if (!hasWork) return state;

  const currentMonth = getTotalGameMonths(state.gameDate);
  const events: GameEvent[] = [];
  const reports: GameReport[] = [];

  let money = state.money;
  let totalEarned = state.totalEarned;
  let totalSpent = state.totalSpent;
  const resources = { ...(state.resources || {}) };
  const workforce = state.workforce ? { ...state.workforce } : undefined;
  let ships = state.ships || [];
  let changed = false;

  // W6: standing science-mission bonuses (heliopause chart, exoplanet census,
  // GW deep-space sensing) — survey data is worth more, transit is safer.
  const scienceBonuses = getExpeditionScienceBonuses(state);

  // ── 1. Expeditions ────────────────────────────────────────────────────────
  const expeditions = (state.expeditions || []).map(exp => {
    if (exp.phase === 'completed' || exp.phase === 'lost' || exp.phase === 'colonizing') return exp;
    const targetElapsed = Math.min(
      Math.max(0, currentMonth - exp.launchGameMonth),
      exp.monthsElapsed + MAX_CATCHUP_MONTHS,
    );
    if (targetElapsed <= exp.monthsElapsed) return exp;

    changed = true;
    const e: ExpeditionState = { ...exp, hazardLog: [...exp.hazardLog] };
    const system = INTERSTELLAR_SYSTEM_MAP.get(e.targetSystemId);
    const shipDef = SHIP_MAP.get(e.shipDefinitionId);
    const sysHazardMult = SYSTEM_HAZARD_MULTIPLIER[e.targetSystemId] ?? 1.2;

    // Mitigation: hull shielding + optional hardened provisioning, capped.
    const baseShielding = shipDef ? getShipDerivedStats(shipDef).shieldingRating : 0.2;
    const mitigation = Math.min(
      MITIGATION_CAP,
      baseShielding + (e.extraShielding ? EXTRA_SHIELDING_BONUS : 0),
    );
    const researchDamageMult = (state.completedResearch.includes(HEAVY_SHIELDING_RESEARCH_ID)
      ? 1 - HEAVY_SHIELDING_DAMAGE_REDUCTION
      : 1) * scienceBonuses.hazardDamageMult // W6: boundary charting trims transit damage
      // Construction Purposes wave (docs/CONSTRUCTION_PURPOSES_2026-08.md):
      // the deep-space support network (Deep Space Relay, sensor satellites,
      // Jupiter Relay Hub — expeditionSupport, capped 15%) trims transit
      // damage the same post-mitigation way the W6 science bonuses do.
      // Away-parity is automatic: this tick IS the shared catch-up path.
      * (1 - getGlobalCapabilityBonus(state, 'expeditionSupport'));

    const returnStartMonth = e.outboundMonths + e.exploreMonths;
    const totalMissionMonths = returnStartMonth + e.outboundMonths;
    const isColonyShip = (COLONY_CAPABLE_SHIP_IDS as readonly string[]).includes(e.shipDefinitionId);

    for (let m = e.monthsElapsed + 1; m <= targetElapsed; m++) {
      e.monthsElapsed = m;

      const inTransit =
        (e.phase === 'outbound' && m <= e.outboundMonths) ||
        (e.phase === 'returning');

      // Hazard roll — deterministic per (expedition seed, mission month).
      if (inTransit && e.phase !== ('lost' as ExpeditionPhase)) {
        const rng = mulberry32((e.seed + m * 7919) >>> 0);
        for (const type of Object.keys(TRANSIT_HAZARD_PROB) as ExpeditionHazardEntry['type'][]) {
          if (rng() >= TRANSIT_HAZARD_PROB[type] * sysHazardMult) continue;
          const [minD, maxD] = TRANSIT_HAZARD_DAMAGE[type];
          const raw = minD + rng() * (maxD - minD);
          const dmg = raw * (1 - mitigation) * researchDamageMult;
          e.hullIntegrity = Math.max(0, e.hullIntegrity - dmg);
          e.hazardLog.push({
            monthIndex: m,
            type,
            damagePct: dmg,
            mitigatedPct: mitigation,
            summary: `${type.replace('_', ' ')} — ${(dmg * 100).toFixed(1)}% hull damage (${(mitigation * 100).toFixed(0)}% absorbed).`,
          });
          if (e.hullIntegrity <= 0) break;
        }

        // Total loss — only reachable when the player skipped or under-bought
        // mitigation; insurance converts catastrophe into a survivable P&L hit.
        if (e.hullIntegrity <= 0) {
          e.phase = 'lost';
          e.completedAtMs = now;
          const payout = e.insured ? Math.round(e.totalCost * INSURANCE_PAYOUT_RATE) : 0;
          if (payout > 0) {
            money += payout;
            totalEarned += payout;
          }
          ships = ships.filter(s => s.instanceId !== e.shipInstanceId);
          events.push({
            id: generateId(),
            date: state.gameDate,
            type: 'random_event',
            title: `☄️ Expedition Lost: ${system?.name || e.targetSystemId}`,
            description: `All contact lost ${m} months into the mission. ${e.crew} crew lost.${payout > 0 ? ` Insurance paid ${formatMoney(payout)}.` : ' No insurance coverage.'}`,
          });
          break;
        }
      }

      // Phase transitions.
      if (e.phase === 'outbound' && m >= e.outboundMonths) {
        e.phase = 'exploring';
        if (system && !e.outcome) {
          e.outcome = rollOutcome(e, system);
          events.push({
            id: generateId(),
            date: state.gameDate,
            type: 'milestone',
            title: `🌌 Arrival: ${system.name}`,
            description: e.outcome.firstContactFactionId
              ? `Expedition arrived after ${e.outboundMonths} months. First contact: ${e.outcome.firstContactFactionId}.`
              : `Expedition arrived after ${e.outboundMonths} months. Survey underway.`,
          });
          reports.push({
            id: generateId(),
            type: 'probe_discovery',
            title: `Interstellar Survey: ${system.name}`,
            body: e.outcome.summary
              + `\n\nProjected data value on return: ${formatMoney(e.outcome.surveyDataPayout)}.`
              + `\nColony suitability: ${(e.outcome.colonySuitability * 100).toFixed(0)}%.`
              + (isColonyShip
                ? '\n\nThe ark is holding station. Establish the colony when ready — it will hold indefinitely (maintenance continues).'
                : `\n\nSurvey window: ${e.exploreMonths} months before the return jump.`),
            createdAt: now,
            read: false,
          });
        }
      } else if (e.phase === 'exploring' && !isColonyShip && m >= returnStartMonth) {
        // Colony arks hold station indefinitely; explorers head home.
        e.phase = 'returning';
      } else if (e.phase === 'returning' && m >= totalMissionMonths) {
        e.phase = 'completed';
        e.completedAtMs = now;
        // Deliver: data payout + resource samples enter inventory exactly the
        // way ship-cargo arrivals do in game-engine step 6. W6: survey data
        // sells higher when science programs have charted the frontier
        // (Meridian census / heliopause chart — capped +30% in science-missions).
        const payout = Math.round((e.outcome?.surveyDataPayout || 0) * scienceBonuses.surveyPayoutMult);
        if (payout > 0) {
          money += payout;
          totalEarned += payout;
        }
        for (const [resId, qty] of Object.entries(e.outcome?.resourceSamples || {})) {
          resources[resId] = (resources[resId] || 0) + qty;
        }
        // Crew and ship come home.
        if (workforce && e.crewBreakdown) {
          const wf = workforce as Record<string, number | undefined>;
          for (const [pool, n] of Object.entries(e.crewBreakdown)) {
            wf[pool] = (wf[pool] || 0) + n;
          }
        }
        ships = ships.map(s =>
          s.instanceId === e.shipInstanceId
            ? { ...s, status: 'idle' as const, currentLocation: 'earth_surface' }
            : s,
        );
        events.push({
          id: generateId(),
          date: state.gameDate,
          type: 'milestone',
          title: `🏠 Expedition Returned: ${system?.name || e.targetSystemId}`,
          description: `${totalMissionMonths}-month mission complete. Survey data sold for ${formatMoney(payout)}.${Object.keys(e.outcome?.resourceSamples || {}).length > 0 ? ' Exotic samples delivered to inventory.' : ''}`,
        });
        break;
      }
    }

    return e;
  });

  // ── 2. Colonies (production, growth, crises, upgrades) ────────────────────
  const colonies = (state.interstellarColonies || []).map(colony => {
    const target = Math.min(currentMonth, colony.lastProcessedGameMonth + MAX_CATCHUP_MONTHS);
    if (target <= colony.lastProcessedGameMonth) return colony;
    changed = true;

    const c: InterstellarColonyState = {
      ...colony,
      stockpile: { ...colony.stockpile },
      upgradeInProgress: colony.upgradeInProgress ? { ...colony.upgradeInProgress } : colony.upgradeInProgress,
    };
    // Seed from stable colony identity (one colony per system, enforced at
    // founding) so crisis rolls are deterministic and replayable — same
    // principle as expedition seeds.
    const colonySeed = hash32(`${c.systemId}:${c.foundedGameMonth}`);

    for (let m = c.lastProcessedGameMonth + 1; m <= target; m++) {
      // Upgrade completion.
      if (c.upgradeInProgress && m >= c.upgradeInProgress.completesAtGameMonth) {
        c.infrastructureLevel = c.upgradeInProgress.targetLevel;
        c.upgradeInProgress = null;
        events.push({
          id: generateId(),
          date: state.gameDate,
          type: 'milestone',
          title: `🏙️ ${c.name} — Infrastructure Level ${c.infrastructureLevel}`,
          description: 'Expansion complete. Production and population capacity increased.',
        });
      }

      // Production into the local stockpile (shipped home via trade routes —
      // logistics cost money; nothing teleports).
      const popCap = c.infrastructureLevel * COLONY_POP_CAP_PER_LEVEL;
      const staffing = Math.min(1, c.population / (COLONY_STARTING_POPULATION * c.infrastructureLevel));
      for (const resId of c.localResources) {
        const base = COLONY_OUTPUT_PER_LEVEL[resId];
        if (!base) continue;
        const produced = base * c.infrastructureLevel * c.suitability * staffing;
        c.stockpile[resId] = (c.stockpile[resId] || 0) + produced;
      }

      // Population growth.
      c.population = Math.min(popCap, c.population * (1 + COLONY_POP_GROWTH_RATE));

      // Colony crisis — deterministic per (colony, month). Higher
      // infrastructure means better containment.
      const rng = mulberry32((colonySeed + m * 104729) >>> 0);
      const crisisProb = COLONY_CRISIS_BASE_PROB * (1 - 0.1 * (c.infrastructureLevel - 1));
      if (rng() < crisisProb) {
        const popLoss = 0.10 + rng() * 0.20;
        c.population = Math.max(COLONY_CRISIS_POP_FLOOR, Math.floor(c.population * (1 - popLoss)));
        for (const resId of Object.keys(c.stockpile)) {
          c.stockpile[resId] = c.stockpile[resId] * 0.75;
        }
        events.push({
          id: generateId(),
          date: state.gameDate,
          type: 'random_event',
          title: `⚠ Colony Crisis: ${c.name}`,
          description: `Life-support emergency — ${(popLoss * 100).toFixed(0)}% of colonists lost, stockpiles damaged. Higher infrastructure levels improve containment.`,
        });
      }
    }
    c.lastProcessedGameMonth = target;
    return c;
  });

  // ── 3. Trade routes (departures from colony stockpiles, arrivals to Sol) ──
  const colonyById = new Map(colonies.map(c => [c.id, c]));
  const routes = (state.interstellarTradeRoutes || []).map(route => {
    let r = route;
    const ensureCopy = () => {
      if (r === route) r = { ...route, inTransit: [...route.inTransit] };
      return r;
    };

    // Departures — ship the colony's whole stockpile of the routed resource.
    if (r.status === 'active') {
      while (r.nextDepartureGameMonth <= currentMonth) {
        const rr = ensureCopy();
        const colony = colonyById.get(rr.colonyId);
        const available = Math.floor(colony?.stockpile[rr.resourceId] || 0);
        if (colony && available >= TRADE_MIN_SHIPMENT_UNITS) {
          if (money < rr.logisticsFeePerShipment) {
            // Can't pay freight — suspend rather than run negative silently.
            rr.status = 'suspended';
            events.push({
              id: generateId(),
              date: state.gameDate,
              type: 'random_event',
              title: `🛰️ Trade Route Suspended: ${colony.name}`,
              description: `Could not cover ${formatMoney(rr.logisticsFeePerShipment)} logistics fee. Resume the route when funds allow.`,
            });
            break;
          }
          money -= rr.logisticsFeePerShipment;
          totalSpent += rr.logisticsFeePerShipment;
          const departedAt = rr.nextDepartureGameMonth;
          rr.inTransit.push({
            quantity: available,
            departedGameMonth: departedAt,
            arrivesGameMonth: departedAt + rr.transitMonths,
          });
          // Deduct from the colony stockpile without mutating the (possibly
          // original) colony object — replace it with an updated copy.
          const idx = colonies.findIndex(c => c.id === rr.colonyId);
          if (idx >= 0) {
            const updatedColony: InterstellarColonyState = {
              ...colonies[idx],
              stockpile: {
                ...colonies[idx].stockpile,
                [rr.resourceId]: (colonies[idx].stockpile[rr.resourceId] || 0) - available,
              },
            };
            colonies[idx] = updatedColony;
            colonyById.set(updatedColony.id, updatedColony);
          }
          changed = true;
        }
        rr.nextDepartureGameMonth += rr.cycleMonths;
        changed = true;
      }
    }

    // Arrivals — exotic goods enter the same inventory the market trades from.
    const arrived = r.inTransit.filter(s => s.arrivesGameMonth <= currentMonth);
    if (arrived.length > 0) {
      const rr = ensureCopy();
      rr.inTransit = rr.inTransit.filter(s => s.arrivesGameMonth > currentMonth);
      let delivered = 0;
      for (const s of arrived) delivered += s.quantity;
      resources[rr.resourceId] = (resources[rr.resourceId] || 0) + delivered;
      rr.totalDelivered += delivered;
      changed = true;
      events.push({
        id: generateId(),
        date: state.gameDate,
        type: 'milestone',
        title: `📦 Interstellar Shipment Arrived`,
        description: `${delivered} ${RESOURCE_MAP.get(rr.resourceId as never)?.name || rr.resourceId} from ${colonyById.get(rr.colonyId)?.name || 'colony'} delivered to inventory.`,
      });
    }
    return r;
  });

  if (!changed && events.length === 0) return state;

  return {
    ...state,
    money,
    totalEarned,
    totalSpent,
    resources,
    workforce,
    ships,
    expeditions,
    interstellarColonies: colonies,
    interstellarTradeRoutes: routes,
    eventLog: events.length > 0
      ? [...events, ...(state.eventLog || [])].slice(0, MAX_EVENT_LOG)
      : state.eventLog,
    reports: reports.length > 0
      ? [...(state.reports || []), ...reports].slice(-50)
      : state.reports,
  };
}

// ─── Read-only helpers (for Phase 2 UI) ─────────────────────────────────────

/** Ships in the fleet that can be sent on expeditions right now. */
export function getExpeditionCapableShips(state: GameState): NonNullable<GameState['ships']> {
  return (state.ships || []).filter(
    s => s.isBuilt && s.status === 'idle' && (EXPEDITION_CAPABLE_SHIP_IDS as readonly string[]).includes(s.definitionId),
  );
}

// ─── Launch readiness — the ONE gate every surface must use (E3.1) ──────────
//
// AAA Round 1 defect #1 (docs/AAA_PROGRAM_2026-08.md §1a.5): every UI entry
// point used to block a launch unless the player already held
// `sys.jumpFuelRequired` units of `exotic_fuel` in inventory. But exotic_fuel
// has no Sol-side source at all — startingSupply 0, npcRestockPerHour 0, it is
// in MINED_ONLY_RESOURCE_IDS, npc-volume-caps.ts caps it at 0, and no building
// produces it. Its only producer is an interstellar colony, which can only be
// founded by an expedition. You needed a colony to get fuel and (per the UI)
// fuel to launch the expedition that founds the colony: the entire
// interstellar pillar was unreachable.
//
// `planExpedition` never had that rule. It procures the shortfall on the open
// market at FUEL_PROCUREMENT_PREMIUM (1.25x spot) and charges it as money —
// that is the DESIGNED first-jump path, and it is what the module's own tests
// exercise. The three gates were simply wrong.
//
// This function is the single source of truth those gates now share. It is
// deliberately expressed in terms of `planExpedition` itself, so the two can
// never diverge again: it runs the real planner over the player's actual
// eligible hulls and reports the cheapest plan the player could launch today.
//
// Sanity of the procurement path at the point a player first reaches it
// (numbers from interstellar.ts / resources.ts / the constants above):
//   Proxima Centauri, Colony Ark (1 jump): 500 units x $5M x 1.25 = $3.13B
//     fuel, + 140 months of supplies at $50M = $7.0B -> ~$10.1B uninsured.
//     Against an $80B ark hull already paid for and a $20B founding cost, the
//     fuel line is ~4% of the program. It is not a loophole; it is a rounding
//     error on a decision the player has already committed to.
//   Proxima, Starfarer Explorer (2 jumps): 1,000 units -> $6.25B fuel +
//     $13.4B supplies -> ~$19.7B uninsured against a ~$8.5B survey payout.
//     Explorer round trips are structurally net-negative on cash and are sold
//     as reconnaissance, not revenue (see SURVEY_DATA_PAYOUT_PER_LY above) —
//     unblocking the gate does not open an income exploit.
// Colonies then refine exotic_fuel at 20 units/level/month, so later jumps
// skip the premium: the compounding "it gets cheaper once you're out there"
// loop this module was designed around.

export interface ExpeditionLaunchReadiness {
  systemId: string;
  /** Missing jump-drive research ids. Empty when satisfied. */
  missingResearch: string[];
  /** Idle, expedition-capable hulls the player owns right now. */
  eligibleShipCount: number;
  /** Fuel units the cheapest eligible plan needs (1 jump for an ark, 2 for an explorer). */
  fuelUnitsRequired: number;
  /** Of those, how many come out of inventory. */
  fuelFromInventory: number;
  /** …and how many must be procured on the open market. */
  fuelUnitsPurchased: number;
  /** Cost of that procurement at the 1.25x broker premium. */
  fuelPurchaseCost: number;
  /** Total money the cheapest uninsured, unshielded plan would cost. */
  cheapestPlanCost: number;
  /** True when research is done, a hull is idle, and the money is there. */
  canLaunch: boolean;
  /** Player-facing blockers, in text (never colour-only). Empty when ready. */
  blockers: string[];
}

/**
 * What it would take to launch at `systemId` today, computed by running the
 * real planner. `null` for an unknown system.
 *
 * The quote is for the CHEAPEST eligible hull with insurance and extra
 * shielding OFF — the floor, so the gate never blocks a launch the planner
 * would accept. Players choose insurance/shielding in the planner itself.
 */
export function getExpeditionLaunchReadiness(
  state: GameState,
  systemId: string,
): ExpeditionLaunchReadiness | null {
  const sys = INTERSTELLAR_SYSTEM_MAP.get(systemId);
  if (!sys) return null;

  const missingResearch = getJumpPrerequisites(systemId, state.completedResearch);
  const eligible = getExpeditionCapableShips(state);

  // Quote every eligible hull; keep the cheapest plan that the planner
  // actually accepts, and remember the cheapest quote overall (even when
  // unaffordable) so the blocker copy can state the real shortfall.
  let best: ExpeditionPlan | null = null;
  let cheapestQuote: ExpeditionPlan | null = null;
  let sawInsufficientFunds = false;
  let otherReason: string | null = null;

  for (const ship of eligible) {
    const plan = planExpedition(state, {
      targetSystemId: systemId,
      shipInstanceId: ship.instanceId,
      insured: false,
      extraShielding: false,
    });
    if (plan.ok) {
      if (!best || plan.costs.totalMoneyCost < best.costs.totalMoneyCost) best = plan;
      if (!cheapestQuote || plan.costs.totalMoneyCost < cheapestQuote.costs.totalMoneyCost) cheapestQuote = plan;
    } else if (plan.reason === 'insufficient_funds') {
      sawInsufficientFunds = true;
      // Re-quote against a state with unlimited money purely to obtain the
      // cost figure the player needs to see. Pure function, no mutation of
      // the real state.
      const quote = planExpedition({ ...state, money: Number.MAX_SAFE_INTEGER }, {
        targetSystemId: systemId,
        shipInstanceId: ship.instanceId,
        insured: false,
        extraShielding: false,
      });
      if (quote.ok && (!cheapestQuote || quote.costs.totalMoneyCost < cheapestQuote.costs.totalMoneyCost)) {
        cheapestQuote = quote;
      }
    } else if (!otherReason) {
      otherReason = plan.detail || plan.reason.replace(/_/g, ' ');
    }
  }

  // No eligible hull at all — quote the explorer round trip (the conservative
  // 2-jump case) so the dossier can still show an honest fuel requirement.
  const fuelSpot = RESOURCE_MAP.get('exotic_fuel')?.baseMarketPrice || 5_000_000;
  const fallbackUnits = sys.jumpFuelRequired * 2;
  const fuelInInventory = state.resources?.exotic_fuel || 0;
  const fallbackFromInventory = Math.min(fuelInInventory, fallbackUnits);

  const costs = cheapestQuote?.costs;
  const fuelUnitsRequired = costs ? costs.fuelUnitsRequired : fallbackUnits;
  const fuelFromInventory = costs ? costs.fuelFromInventory : fallbackFromInventory;
  const fuelUnitsPurchased = costs ? costs.fuelUnitsPurchased : fallbackUnits - fallbackFromInventory;
  const fuelPurchaseCost = costs
    ? costs.fuelPurchaseCost
    : Math.round(fuelUnitsPurchased * fuelSpot * FUEL_PROCUREMENT_PREMIUM);
  const cheapestPlanCost = costs ? costs.totalMoneyCost : 0;

  const blockers: string[] = [];
  if (missingResearch.length > 0) {
    blockers.push(`Research required: ${missingResearch.map(r => r.replace(/_/g, ' ')).join(', ')}`);
  }
  if (eligible.length === 0) {
    blockers.push('No idle Starfarer Explorer or Colony Ark — build one in Fleet');
  } else if (!best) {
    if (sawInsufficientFunds) {
      blockers.push(`Launch budget short — the cheapest plan costs ${formatMoney(cheapestPlanCost)}`);
    } else if (otherReason) {
      blockers.push(otherReason);
    } else {
      blockers.push('No eligible hull can be dispatched right now');
    }
  }

  return {
    systemId,
    missingResearch,
    eligibleShipCount: eligible.length,
    fuelUnitsRequired,
    fuelFromInventory,
    fuelUnitsPurchased,
    fuelPurchaseCost,
    cheapestPlanCost,
    canLaunch: !!best,
    blockers,
  };
}

export interface ExpeditionProgress {
  expedition: ExpeditionState;
  systemName: string;
  phaseLabel: string;
  /** 0-1 across the whole planned mission (arks: outbound+explore only). */
  progressPct: number;
  monthsRemaining: number;
}

export function getExpeditionProgress(state: GameState, expeditionId: string): ExpeditionProgress | null {
  const exp = (state.expeditions || []).find(e => e.id === expeditionId);
  if (!exp) return null;
  const system = INTERSTELLAR_SYSTEM_MAP.get(exp.targetSystemId);
  const isColonyShip = (COLONY_CAPABLE_SHIP_IDS as readonly string[]).includes(exp.shipDefinitionId);
  const totalMonths = isColonyShip
    ? exp.outboundMonths + exp.exploreMonths
    : exp.outboundMonths * 2 + exp.exploreMonths;
  const phaseLabel: Record<ExpeditionPhase, string> = {
    outbound: 'In transit (outbound)',
    exploring: isColonyShip ? 'Holding at destination' : 'Surveying',
    returning: 'In transit (returning)',
    colonizing: 'Colony established',
    completed: 'Mission complete',
    lost: 'Lost with all hands',
  };
  return {
    expedition: exp,
    systemName: system?.name || exp.targetSystemId,
    phaseLabel: phaseLabel[exp.phase],
    progressPct: Math.min(1, exp.monthsElapsed / Math.max(1, totalMonths)),
    monthsRemaining: Math.max(0, totalMonths - exp.monthsElapsed),
  };
}
