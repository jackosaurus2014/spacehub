// ─── Space Tycoon: Systemic Crises + the Situation mechanic ─────────────────
// AAA Program Round 2 (docs/AAA_PROGRAM_2026-08.md "Round 2"). Round 1
// deferred R1-E2 to headline this round: "the biggest idea in the round and
// the most faithful answer to 'escalating external pressure'".
//
// The problem this exists to solve is NOT difficulty. It is DECISION
// STARVATION. BALANCE.md Pass 5 §H3 measured decision cadence collapsing to
// 0-3 months per decade after year ~10 for every archetype except the
// deepest ladder-climber ("the economic core alone goes static by year ~12").
// A decade is 120 game-months = 30 real days, so the dead decades are, in
// real time, month two onward. This module's job is to put real, costed,
// counterplayable decisions into those weeks.
//
// ─── The two halves ───────────────────────────────────────────────────────
//
//  1. THE CRISIS — a world-shared, calendar-dated emergency whose BITE
//     scales to measured server telemetry (published quarterly net worth,
//     orbital-slot occupancy, extraction pressure, demand-pool concentration,
//     built capacity). Announced two real weeks ahead, runs four, then a week
//     of aftermath. Losses are hazard-/regulatory-/counterparty-driven and
//     forecast-visible — never PvP (CLAUDE.md no-combat canon).
//
//  2. THE SITUATION — the Stellaris mechanic 4X_BASELINE_2026-08.md Part 2c
//     specced and nobody built: a progress bar that ticks toward a bad
//     outcome, with APPROACH choices that trade money or capacity for time.
//     (situation-log.ts is a derived alert list; it is not this.)
//
// ─── Identity is pure; severity is measured (the load-bearing split) ──────
//
// Which crisis a cycle runs is a PURE FUNCTION OF THE WALL CLOCK —
// CRISIS_DEFINITIONS[cycleIndex % N] — so every client, the server, the
// market routes and every test agree without a database round trip. That is
// the same boundary market-events.ts documents at its head, and it is why
// the crisis's market-event channel below can never make the price a player
// is shown disagree with the price the server charges.
//
// How HARD it bites is measured: `worldIndex` is computed server-side from
// real telemetry rows (server-crises.ts) and published on the cycle row at
// forecast time, so the whole world reads the identical number and can plan
// against it. Per-player `exposureIndex` is derived from the player's own
// state. Severity is the MAX of the two — the world's crisis is as bad as
// the worse of "what everyone built" and "what you built".
//
// This split is deliberate and is the honest version of Stellaris's
// scale-to-player-power trick. A catalogue that only ever fires the peril you
// are biggest in is a punishment mechanic; a rotating catalogue whose bite is
// priced off your exposure to it is a risk model. Insurers do not choose
// which peril occurs — they price your exposure to it.
//
// ─── What this module does NOT do ────────────────────────────────────────
//
//  - It does not fork the effect dispatcher. Every consequence it applies
//    goes through narrative-events.ts's `applyChainConsequence`, the same
//    single dispatcher the senate, the chains and the chapters all delegate
//    to (Round 1 Part 2 rejects a parallel engine for exactly this reason).
//  - It does not touch spot price, demand pools, extraction pressure, mining
//    revenue, or any tick multiplier directly. Its only economy surfaces are
//    (a) money charged/lost through applyChainConsequence, (b) a bounded
//    insurance-premium multiplier on an OPT-IN sink, and (c) authored market
//    events on the existing published schedule.
//  - It never fires against a Protected Frontier player or one still inside
//    the FTUE chain. See `isCrisisEligible`.

import type { GameState, GameEvent } from './types';
import { generateId } from './formulas';
import type { ChainConsequence } from './narrative-events';
import { applyChainConsequence } from './narrative-events';
import { BUILDING_MAP } from './buildings';
import { SHIP_MAP } from './ships';
import { isInFrontier, getGraduationGlideFraction } from './frontier';
import { isOnboardingComplete } from './onboarding';
import type { FactionId } from './factions';

// ─── Calendar (pure function of wall-clock time) ───────────────────────────
// Same discipline as chapters.ts: epoch-anchored week index, so every
// boundary lands on a Thursday 00:00 UTC forever (Jan 1 1970 was a Thursday).
// Deliberately an 8-week cycle against chapters.ts's 6, so a crisis peak and
// a chapter finale weekend beat against each other (LCM 24 weeks) instead of
// colliding every time — CLAUDE.md's "don't collapse the tempo".

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const CRISIS_CYCLE_WEEKS = 8;
/** Weeks 0-1: forecast published, zero mechanical effect. */
export const CRISIS_FORECAST_WEEKS = 2;
/** Weeks 2-5: the crisis is live — situations tick, the assessment is open. */
export const CRISIS_ACTIVE_WEEKS = 4;
/** Week 6: resolution, relief, the permanent record. Week 7 is recess. */
export const CRISIS_AFTERMATH_WEEK = 6;

export const CRISIS_ACTIVE_WINDOW_MS = CRISIS_ACTIVE_WEEKS * WEEK_MS;

/** Stage boundaries inside the active window. Five stages over four real
 *  weeks = one costed decision every ~5.6 days, which is the loop
 *  SESSION_DESIGN.md leaves thinnest at the corporate level (weekly holds
 *  only seasons, leagues and alliance rotations today). */
export const CRISIS_STAGES = 5;

export type CrisisPhase = 'recess' | 'forecast' | 'active' | 'aftermath';

export function getCrisisWeekIndex(nowMs: number): number {
  return Math.floor(nowMs / WEEK_MS);
}

export function getCrisisCycleIndex(nowMs: number): number {
  return Math.floor(getCrisisWeekIndex(nowMs) / CRISIS_CYCLE_WEEKS);
}

export function getCrisisCycleStartMs(cycleIndex: number): number {
  return cycleIndex * CRISIS_CYCLE_WEEKS * WEEK_MS;
}

export interface CrisisWindow {
  cycleIndex: number;
  weekInCycle: number;
  phase: CrisisPhase;
  forecastStartMs: number;
  activeStartMs: number;
  activeEndMs: number;
  aftermathStartMs: number;
  aftermathEndMs: number;
  /** 0 before onset, 1 at the close of the active window. */
  activeFraction: number;
  /** 0..CRISIS_STAGES. Stage 0 is onset; stage CRISIS_STAGES is "window
   *  closed". */
  stage: number;
}

export function getCrisisWindow(nowMs: number): CrisisWindow {
  const weekIndex = getCrisisWeekIndex(nowMs);
  const cycleIndex = Math.floor(weekIndex / CRISIS_CYCLE_WEEKS);
  const weekInCycle = ((weekIndex % CRISIS_CYCLE_WEEKS) + CRISIS_CYCLE_WEEKS) % CRISIS_CYCLE_WEEKS;
  const cycleStart = getCrisisCycleStartMs(cycleIndex);
  const forecastStartMs = cycleStart;
  const activeStartMs = cycleStart + CRISIS_FORECAST_WEEKS * WEEK_MS;
  const activeEndMs = activeStartMs + CRISIS_ACTIVE_WINDOW_MS;
  const aftermathStartMs = cycleStart + CRISIS_AFTERMATH_WEEK * WEEK_MS;
  const aftermathEndMs = aftermathStartMs + WEEK_MS;

  let phase: CrisisPhase;
  if (weekInCycle < CRISIS_FORECAST_WEEKS) phase = 'forecast';
  else if (weekInCycle < CRISIS_FORECAST_WEEKS + CRISIS_ACTIVE_WEEKS) phase = 'active';
  else if (weekInCycle === CRISIS_AFTERMATH_WEEK) phase = 'aftermath';
  else phase = 'recess';

  const activeFraction = Math.max(0, Math.min(1, (nowMs - activeStartMs) / CRISIS_ACTIVE_WINDOW_MS));
  const stage = Math.max(0, Math.min(CRISIS_STAGES, Math.floor(activeFraction * CRISIS_STAGES)));

  return {
    cycleIndex, weekInCycle, phase,
    forecastStartMs, activeStartMs, activeEndMs, aftermathStartMs, aftermathEndMs,
    activeFraction, stage,
  };
}

// ─── Severity ──────────────────────────────────────────────────────────────

export type CrisisTier = 'advisory' | 'elevated' | 'severe' | 'systemic';

export const CRISIS_TIER_ORDER: CrisisTier[] = ['advisory', 'elevated', 'severe', 'systemic'];

/** Index thresholds. An index is `measured / anchor`, clamped to [0, 2], so
 *  0.35 means "the world (or this corporation) is at ~a third of the scale
 *  the anchor calls a fully-developed one". Advisory is genuinely inert: it
 *  publishes a forecast and applies nothing. That is the state a quiet shard
 *  sits in today, and it is honest rather than a hidden feature flag. */
export const CRISIS_TIER_THRESHOLDS: { tier: CrisisTier; minIndex: number }[] = [
  { tier: 'systemic', minIndex: 1.40 },
  { tier: 'severe', minIndex: 0.80 },
  { tier: 'elevated', minIndex: 0.35 },
  { tier: 'advisory', minIndex: 0 },
];

export const CRISIS_INDEX_MAX = 2;

export function clampCrisisIndex(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return 0;
  return Math.min(CRISIS_INDEX_MAX, v);
}

export function crisisTierForIndex(index: number): CrisisTier {
  const i = clampCrisisIndex(index);
  for (const t of CRISIS_TIER_THRESHOLDS) {
    if (i >= t.minIndex) return t.tier;
  }
  return 'advisory';
}

export function crisisTierRank(tier: CrisisTier): number {
  return Math.max(0, CRISIS_TIER_ORDER.indexOf(tier));
}

export const CRISIS_TIER_LABEL: Record<CrisisTier, string> = {
  advisory: 'Advisory',
  elevated: 'Elevated',
  severe: 'Severe',
  systemic: 'Systemic',
};

/** Progress accrued over a full four-week active window at exposure factor
 *  1.0 with no mitigation. >= 1 realizes the bad outcome, so at every live
 *  tier "do nothing" loses unless the corporation is barely exposed. The
 *  ladder is deliberate: at `elevated` hardening alone contains; at `severe`
 *  hardening still contains; at `systemic` hardening alone is NOT enough for
 *  a heavily-exposed corporation — it must divest capacity or add the
 *  Accord assessment's mitigation on top. That is where the cooperation
 *  pressure comes from, and it comes from arithmetic rather than from a
 *  scripted "you must cooperate" beat. */
export const CRISIS_BASE_RATE_PER_WINDOW: Record<CrisisTier, number> = {
  advisory: 0,
  elevated: 1.05,
  severe: 1.60,
  systemic: 2.40,
};

/** Exposure factor band. A corporation with no exposure still feels half the
 *  world's weather (shared supply chains); a maximally exposed one feels
 *  1.5x. Bounded so a whale can never accelerate itself past the point where
 *  the authored counterplays work. */
export const CRISIS_EXPOSURE_FACTOR_MIN = 0.5;
export const CRISIS_EXPOSURE_FACTOR_MAX = 1.5;

export function crisisExposureFactor(exposureIndex: number): number {
  const i = clampCrisisIndex(exposureIndex);
  return Math.max(
    CRISIS_EXPOSURE_FACTOR_MIN,
    Math.min(CRISIS_EXPOSURE_FACTOR_MAX, CRISIS_EXPOSURE_FACTOR_MIN + 0.5 * i),
  );
}

// ─── Approaches (the "situation" verbs) ────────────────────────────────────

export type CrisisApproachId = 'absorb' | 'harden' | 'divest';

export interface CrisisApproachDef {
  id: CrisisApproachId;
  name: string;
  /** Fraction of the tick rate this approach removes. */
  mitigation: number;
  /** Recurring per-stage cost as a fraction of operational capital. */
  perStageCostPct: Partial<Record<CrisisTier, number>>;
  /** One-shot cost as a fraction of operational capital, charged when the
   *  approach is first adopted. */
  adoptionCostPct: Partial<Record<CrisisTier, number>>;
  /** Revenue multiplier applied for the remainder of the crisis when this
   *  approach is adopted (capacity you pulled out of the line of fire is
   *  capacity that is not earning). 1 = none. */
  revenueMultiplier: number;
  summary: string;
}

/** Costs are expressed as fractions of the corporation's OWN operational
 *  capital, never as constants — a $500M corporation and a $40B one both
 *  face a decision of the same shape and the same relative weight. The
 *  numbers are set so that the expected cost of hardening lands at roughly
 *  40% of the loss it prevents (see CRISIS_REALIZED_LOSS_PCT): defence is
 *  clearly +EV, and it is still real money leaving the economy. */
export const CRISIS_APPROACHES: CrisisApproachDef[] = [
  {
    id: 'absorb',
    name: 'Absorb the shock',
    mitigation: 0,
    perStageCostPct: {},
    adoptionCostPct: {},
    revenueMultiplier: 1,
    summary: 'Change nothing. No spend, no capacity given up — and the exposure runs its full course.',
  },
  {
    id: 'harden',
    name: 'Harden operations',
    mitigation: 0.60,
    perStageCostPct: { elevated: 0.0008, severe: 0.0016, systemic: 0.0026 },
    adoptionCostPct: {},
    revenueMultiplier: 1,
    summary: 'Fund retrofits, escorts, contingency stock and compliance work every stage while the window is open. Recurring cost, no capacity lost.',
  },
  {
    id: 'divest',
    name: 'Reposition capacity',
    mitigation: 0.85,
    perStageCostPct: {},
    adoptionCostPct: { elevated: 0.006, severe: 0.011, systemic: 0.018 },
    revenueMultiplier: 0.95,
    summary: 'Pull crews and cargo out of the exposed lane and stand them up elsewhere. One-time cost plus a revenue drag for the rest of the crisis — and much the safest posture.',
  },
];

export const CRISIS_APPROACH_MAP = new Map(CRISIS_APPROACHES.map(a => [a.id, a]));

/** Mitigation the Accord assessment adds ON TOP of the chosen approach when
 *  a corporation has pledged. Stacks additively, then the total is bounded
 *  by CRISIS_MITIGATION_CAP — the same 0.90 ceiling hazards.ts has always
 *  used for shielding, so no posture is ever fully safe. */
export const CRISIS_PLEDGE_MITIGATION = 0.20;
export const CRISIS_MITIGATION_CAP = 0.90;

/** Realized loss as a fraction of operational capital when a situation runs
 *  the bar to 1.0, plus the hard cash ceiling that guarantees no single
 *  crisis can bankrupt anybody (Round 1's acceptance requirement (b): "no
 *  archetype is driven insolvent by a single crisis"). */
export const CRISIS_REALIZED_LOSS_PCT: Record<CrisisTier, number> = {
  advisory: 0,
  elevated: 0.010,
  severe: 0.020,
  systemic: 0.035,
};

/** A realized crisis never takes more than this fraction of cash on hand.
 *  Test-asserted: money after a realized loss is always > 0. */
export const CRISIS_LOSS_CASH_CAP_PCT = 0.25;

/** Cost drag applied for CRISIS_REALIZED_EFFECT_MONTHS after a realized
 *  outcome — the repair-and-recovery tail. */
export const CRISIS_REALIZED_COST_MULT: Record<CrisisTier, number> = {
  advisory: 1,
  elevated: 1.06,
  severe: 1.10,
  systemic: 1.15,
};
export const CRISIS_REALIZED_EFFECT_MONTHS = 6;

// ─── Operational capital ───────────────────────────────────────────────────

/** Completed buildings + built ships at sticker price: the corporation's
 *  capital that is physically in harm's way.
 *
 *  This is the SAME arithmetic as `economic-sinks.ts::computeInsuredAssetValue`
 *  and is deliberately NOT imported from there: economic-sinks must import
 *  `getCrisisInsurancePremiumMultiplier` from THIS module (the insurance
 *  hardening channel), and the reciprocal import would be a cycle — the
 *  identical shape accord-chair.ts hit with accord-senate.ts. A regression
 *  test asserts the two functions agree on arbitrary states so they cannot
 *  drift apart. */
export function crisisOperationalCapital(state: GameState): number {
  let total = 0;
  for (const b of state.buildings || []) {
    if (!b.isComplete) continue;
    const def = BUILDING_MAP.get(b.definitionId);
    if (def) total += def.baseCost;
  }
  for (const s of state.ships || []) {
    if (!s.isBuilt) continue;
    const def = SHIP_MAP.get(s.definitionId);
    if (def) total += def.baseCost;
  }
  return total;
}

// ─── Crisis catalogue ──────────────────────────────────────────────────────

export interface CrisisExposureReading {
  /** Raw measured quantity in the crisis's own unit. */
  measured: number;
  /** The scale at which a corporation counts as fully exposed. Estimates —
   *  labelled as such wherever they are shown — anchored on the catalogue
   *  and on BALANCE.md Pass 5's measured 50-year portfolios, not on wishes. */
  anchor: number;
  unit: string;
  detail: string;
}

export interface CrisisReliefDef {
  id: string;
  name: string;
  description: string;
  /** Applied to every corporation in the aftermath week, magnitude scaled by
   *  the containment fraction. Pure content — dispatched through
   *  applyChainConsequence like everything else. */
  contained: ChainConsequence;
  shortfall: ChainConsequence;
}

export interface CrisisMarketEventDef {
  /** Index into the active window, in weeks, when this price dislocation
   *  opens; duration in hours. Pure — see the module header on why the
   *  crisis's price channel must never depend on server state. */
  startWeek: number;
  durationHours: number;
  id: string;
  name: string;
  icon: string;
  description: string;
  affectedResources: string[];
  priceMultiplier: number;
}

export interface CrisisDefinition {
  id: string;
  name: string;
  icon: string;
  /** LORE.md precedent this crisis is drawn from — printed in the briefing. */
  precedent: string;
  tagline: string;
  briefing: string;
  /** The faction whose standing moves when a corporation contains its own
   *  situation or funds the assessment. Always an Accord signatory: the
   *  Accord is who convenes the emergency session. */
  patronFaction: FactionId;
  /** Which server telemetry channel prices this crisis's world index. The
   *  string is the key server-crises.ts switches on, and it is surfaced to
   *  players so the scaling is auditable from inside the game. */
  worldIndexChannel: CrisisWorldIndexChannel;
  worldIndexLabel: string;
  /** Per-player exposure, read from the player's own state. Never a
   *  constant — asserted by test. */
  exposure: (state: GameState) => CrisisExposureReading;
  /** What "hardening" concretely means here, for the briefing copy. */
  hardenDetail: string;
  divestDetail: string;
  reliefOptions: CrisisReliefDef[];
  defaultReliefId: string;
  marketEvents: CrisisMarketEventDef[];
}

export type CrisisWorldIndexChannel =
  | 'orbital_density'
  | 'insured_capital'
  | 'extraction_pressure'
  | 'market_concentration'
  | 'built_capacity';

const ORBITAL_LOCATIONS = new Set(['leo', 'geo', 'lunar_orbit', 'mars_orbit']);

/** Locations whose occupancy carries the elevated hazard class — the same
 *  set economic-sinks.ts prices an insurance surcharge on. Imported by value
 *  rather than by reference for the cycle reason documented on
 *  crisisOperationalCapital; the drift test covers this too. */
const CRISIS_HAZARDOUS_LOCATIONS = new Set([
  'mercury_surface', 'io_surface', 'asteroid_belt', 'outer_system', 'jupiter_system',
]);

function countCompletedBuildingsWhere(state: GameState, pred: (locationId: string) => boolean): number {
  let n = 0;
  for (const b of state.buildings || []) {
    if (b.isComplete && pred(b.locationId)) n++;
  }
  return n;
}

const THE_CASCADE: CrisisDefinition = {
  id: 'kessler_cascade',
  name: 'The Cascade',
  icon: '☄️',
  precedent: 'Accord of Geneva, Article 4 — defensive systems (shielding, point-defence against debris) are the only armament permitted beyond cislunar space. Debris has been the one universally-recognised orbital hazard since the treaty was signed.',
  tagline: 'A derelict upper stage broke up in a crossing orbit. The debris field is spreading.',
  briefing: 'A spent transfer stage fragmented at 780km after a micrometeoroid strike, and the resulting shell is now sweeping through the busiest inclinations in low orbit. Conjunction warnings are running at forty times baseline. Every orbital facility on the board is flying avoidance manoeuvres it did not budget propellant for, and the Accord has convened an emergency session on collision-avoidance funding.',
  patronFaction: 'the-dominion',
  worldIndexChannel: 'orbital_density',
  worldIndexLabel: 'orbital objects on the shared registry',
  exposure: (state) => {
    const buildings = countCompletedBuildingsWhere(state, l => ORBITAL_LOCATIONS.has(l));
    let ships = 0;
    for (const s of state.ships || []) {
      if (s.isBuilt && ORBITAL_LOCATIONS.has(s.currentLocation)) ships++;
    }
    const measured = buildings + ships;
    return {
      measured,
      anchor: 12,
      unit: 'orbital assets',
      detail: `${buildings} orbital facilit${buildings === 1 ? 'y' : 'ies'} and ${ships} hull${ships === 1 ? '' : 's'} currently parked in a crossing orbit.`,
    };
  },
  hardenDetail: 'Buy conjunction-screening service, fund avoidance propellant, and fit Whipple layers on the exposed faces.',
  divestDetail: 'Deorbit or re-phase the exposed platforms to a quieter inclination and stand the crews up elsewhere.',
  defaultReliefId: 'cascade_sweep',
  reliefOptions: [
    {
      id: 'cascade_sweep',
      name: 'Fund the debris sweep',
      description: 'Contract the Orbital Engineers\' Union to fly active-removal tugs through the densest shells. Slow, expensive, and it is the only option that actually reduces the object count.',
      contained: { label: 'Debris Sweep Completed', reputationPoints: 900, hazardMitigationBonus: { amount: 0.05, durationMonths: 4 } },
      shortfall: { label: 'Sweep Underfunded', costMultiplier: 1.04, effectDurationMonths: 3, reputationPoints: 150 },
    },
    {
      id: 'cascade_screening',
      name: 'Fund conjunction screening',
      description: 'Stand up a shared tracking and warning network instead of removing anything. Cheap, immediate, and it does nothing about next year.',
      contained: { label: 'Shared Screening Network Live', reputationPoints: 600, costMultiplier: 0.97, effectDurationMonths: 3 },
      shortfall: { label: 'Screening Gaps Remain', costMultiplier: 1.05, effectDurationMonths: 3 },
    },
    {
      id: 'cascade_indemnity',
      name: 'Fund the collision indemnity pool',
      description: 'Backstop the operators who lose hardware rather than preventing the losses. Keeps balance sheets intact; keeps the shell exactly where it is.',
      contained: { label: 'Indemnity Pool Paid Out', reputationPoints: 500, moneyReward: 0 },
      shortfall: { label: 'Indemnity Pool Exhausted', costMultiplier: 1.06, effectDurationMonths: 2, reputationPoints: 100 },
    },
  ],
  marketEvents: [
    {
      startWeek: 0, durationHours: 8,
      id: 'crisis_cascade_shielding', name: 'Debris-Shielding Demand', icon: '🛡️',
      description: 'Every orbital operator is fitting Whipple layers at once. Structural stock is bid up hard.',
      affectedResources: ['titanium', 'aluminum'], priceMultiplier: 1.45,
    },
    {
      startWeek: 2, durationHours: 8,
      id: 'crisis_cascade_propellant', name: 'Avoidance-Manoeuvre Propellant Call', icon: '⛽',
      description: 'Unbudgeted avoidance burns across the whole LEO fleet drain propellant reserves.',
      affectedResources: ['methane', 'ethane'], priceMultiplier: 1.35,
    },
  ],
};

const THE_MUTUALS_RESERVES: CrisisDefinition = {
  id: 'mutual_solvency',
  name: "The Mutual's Reserves",
  icon: '🏦',
  precedent: 'LORE.md — Outer Rim Insurance Mutual, "the largest insurer of outer-system operations; its risk models influence where corporations will operate."',
  tagline: 'Outer Rim Insurance Mutual has suspended new binding. Its reserves are gone.',
  briefing: 'A clustered run of outer-system claims has burned through the Mutual\'s free reserves and most of its retrocession tower. Binding authority is suspended, renewal quotes have doubled where they exist at all, and half the board is discovering that its "insured" tonnage is insured by a syndicate that cannot pay. The Accord is weighing a public backstop against letting the Mutual fail.',
  patronFaction: 'echo-remnants',
  worldIndexChannel: 'insured_capital',
  worldIndexLabel: 'published corporate net worth inside the Accord filing window',
  exposure: (state) => {
    const capital = crisisOperationalCapital(state);
    const risky = countCompletedBuildingsWhere(state, l => CRISIS_HAZARDOUS_LOCATIONS.has(l));
    return {
      measured: capital,
      anchor: 20_000_000_000,
      unit: 'capital at risk',
      detail: `$${(capital / 1e9).toFixed(2)}B of hulls and facilities on the books${risky > 0 ? `, ${risky} of them at an elevated-hazard site` : ''}. ${state.insuranceActive === true ? 'Your policy renews into a hard market.' : 'You carry no policy — an uncovered loss is an uncovered loss.'}`,
    };
  },
  hardenDetail: 'Pre-fund a captive retention, post collateral against your own tonnage, and pay the renewal loading rather than going bare.',
  divestDetail: 'Sell down the exposure the Mutual will no longer write and redeploy the crews to covered lanes.',
  defaultReliefId: 'mutual_backstop',
  reliefOptions: [
    {
      id: 'mutual_backstop',
      name: 'Backstop the Mutual',
      description: 'Recapitalise the syndicate so existing policies pay. Protects everyone who bought cover; rewards the underwriting that got us here.',
      contained: { label: 'Mutual Recapitalised', reputationPoints: 800, costMultiplier: 0.97, effectDurationMonths: 4 },
      shortfall: { label: 'Mutual Enters Run-Off', costMultiplier: 1.05, effectDurationMonths: 4, reputationPoints: 150 },
    },
    {
      id: 'mutual_orderly_wind',
      name: 'Fund an orderly run-off',
      description: 'Let the Mutual fail, but fund the claims queue so nobody is left with a worthless certificate. Slower, cleaner, and the market reprices honestly afterwards.',
      contained: { label: 'Claims Queue Cleared', reputationPoints: 900, factionRep: { 'the-dominion': 6 } },
      shortfall: { label: 'Claims Queue Frozen', costMultiplier: 1.06, effectDurationMonths: 3 },
    },
    {
      id: 'mutual_new_syndicate',
      name: 'Seed a successor syndicate',
      description: 'Put the pool behind a new underwriter with tighter models. Nothing is paid on the old book; capacity comes back fastest.',
      contained: { label: 'Successor Syndicate Bound', reputationPoints: 650, hazardMitigationBonus: { amount: 0.04, durationMonths: 4 } },
      shortfall: { label: 'No Successor Found', costMultiplier: 1.07, effectDurationMonths: 3 },
    },
  ],
  marketEvents: [
    {
      startWeek: 1, durationHours: 6,
      id: 'crisis_mutual_flight_to_quality', name: 'Flight to Hard Assets', icon: '🥇',
      description: 'With cover unobtainable, balance sheets rotate into metal that does not need underwriting.',
      affectedResources: ['gold', 'platinum_group'], priceMultiplier: 1.40,
    },
    {
      startWeek: 3, durationHours: 6,
      id: 'crisis_mutual_forced_sales', name: 'Forced-Sale Overhang', icon: '📉',
      description: 'Uninsurable tonnage is liquidated into a thin market. Industrial feedstock gaps down.',
      affectedResources: ['iron', 'aluminum'], priceMultiplier: 0.70,
    },
  ],
};

const THE_THIN_SEAM: CrisisDefinition = {
  id: 'deposit_exhaustion',
  name: 'The Thin Seam',
  icon: '⛏️',
  precedent: 'LORE.md — the Belt Rush of 2112-2128. Psyche-16\'s exceptional grades founded the modern belt economy; every high-grade body since has been worked the same way.',
  tagline: 'The high-grade faces are worked out. Every rig on the board just got poorer.',
  briefing: 'Assay returns across the worked faces have fallen below the grade the current generation of rigs was designed around. This is not a price move — it is ore. Cut-off grades are being re-set, marginal faces are being abandoned, and the Belt Miners\' Guild is refusing new development contracts until the Accord rules on abandonment liability.',
  patronFaction: 'nebula-reavers',
  worldIndexChannel: 'extraction_pressure',
  worldIndexLabel: 'accumulated extraction pressure across the shared deposit registry',
  exposure: (state) => {
    let rigs = 0;
    for (const b of state.buildings || []) {
      if (!b.isComplete) continue;
      const def = BUILDING_MAP.get(b.definitionId);
      if (def && def.category === 'mining_enterprise') rigs++;
    }
    const pressures = Object.values(state.extractionPressure?.entries || {});
    // pressure runs 0.4 (worked hard) .. 1.0 (fresh); invert so "thin" is high
    let thin = 0;
    for (const e of pressures) thin += Math.max(0, 1 - (e?.pressure ?? 1));
    const measured = rigs * (1 + thin);
    return {
      measured,
      anchor: 8,
      unit: 'pressure-weighted rigs',
      detail: `${rigs} extraction facilit${rigs === 1 ? 'y' : 'ies'} on the books${pressures.length > 0 ? `, against ${pressures.length} deposit${pressures.length === 1 ? '' : 's'} already carrying measured pressure` : ''}.`,
    };
  },
  hardenDetail: 'Fund deeper development headings, replace the sorting plant, and pay the Guild\'s abandonment bond up front.',
  divestDetail: 'Abandon the marginal faces now and move the rigs and crews to an unworked deposit.',
  defaultReliefId: 'seam_development',
  reliefOptions: [
    {
      id: 'seam_development',
      name: 'Fund deep-development credits',
      description: 'Subsidise the capital it takes to reach the next horizon. Expensive, slow, and it is the only option that leaves the belt with a future.',
      contained: { label: 'Deep Development Funded', reputationPoints: 850, revenueMultiplier: 1.03, effectDurationMonths: 4 },
      shortfall: { label: 'Development Credits Short', costMultiplier: 1.05, effectDurationMonths: 3 },
    },
    {
      id: 'seam_abandonment',
      name: 'Fund the abandonment bond',
      description: 'Pay to close the exhausted faces safely and settle the Guild. Nothing is developed; nothing is left derelict either.',
      contained: { label: 'Abandonment Settled', reputationPoints: 700, factionRep: { 'nebula-reavers': 6 } },
      shortfall: { label: 'Derelict Faces Left Open', costMultiplier: 1.05, effectDurationMonths: 3, reputationPoints: 100 },
    },
    {
      id: 'seam_substitution',
      name: 'Fund substitution research',
      description: 'Buy your way out of the ore instead of out of the ground. Pays nothing to the belt, and shortens the next crisis.',
      contained: { label: 'Substitution Programme Funded', reputationPoints: 700, researchSpeedMultiplier: 1.06, effectDurationMonths: 4 },
      shortfall: { label: 'Substitution Programme Stalled', costMultiplier: 1.04, effectDurationMonths: 3 },
    },
  ],
  marketEvents: [
    {
      startWeek: 0, durationHours: 8,
      id: 'crisis_seam_grade_shock', name: 'Grade Shock', icon: '📈',
      description: 'Cut-off grades reset across the worked faces. Refined metal reprices on genuine scarcity.',
      affectedResources: ['platinum_group', 'rare_earth'], priceMultiplier: 1.50,
    },
    {
      startWeek: 2, durationHours: 8,
      id: 'crisis_seam_bulk_glut', name: 'Bulk Ore Dumping', icon: '📉',
      description: 'Abandoning a face means selling its stockpile. Bulk ore floods the book on the way out.',
      affectedResources: ['iron'], priceMultiplier: 0.65,
    },
  ],
};

const THE_CLEARING_FAILURE: CrisisDefinition = {
  id: 'counterparty_contagion',
  name: 'The Clearing Failure',
  icon: '🧾',
  precedent: 'LORE.md — the Kepler Merger Wave of 2128 folded 74 independent corporations into 5 in a single year. The clearing arrangements those mergers left behind have never been unwound.',
  tagline: 'A clearing member failed overnight. Nobody is certain who is good for what.',
  briefing: 'A mid-tier clearing member missed a settlement window and did not open the next morning. Because the post-Kepler novation chains run through the same handful of balance sheets, every corporation on the board is now a creditor of a counterparty it never chose. The Spacefaring Commerce Court has frozen the affected escrow and is taking submissions on a haircut.',
  patronFaction: 'the-dominion',
  worldIndexChannel: 'market_concentration',
  worldIndexLabel: 'largest single supplier share across the shared demand registry',
  exposure: (state) => {
    const contracts = (state.activeContracts || []).length;
    const pools = Object.values(state.demandPools?.pools || {});
    let concentrated = 0;
    for (const p of pools) {
      const top = (p?.topShares || [])[0] ?? 0;
      if (top >= 0.5) concentrated++;
    }
    const services = (state.activeServices || []).length;
    const measured = contracts * 1.5 + concentrated + services * 0.25;
    return {
      measured,
      anchor: 10,
      unit: 'settlement exposures',
      detail: `${contracts} open contract${contracts === 1 ? '' : 's'} awaiting settlement and ${services} revenue service${services === 1 ? '' : 's'} billing through the clearing chain${concentrated > 0 ? `, ${concentrated} of them into a market a single supplier already dominates` : ''}.`,
    };
  },
  hardenDetail: 'Post additional margin, novate away from the failed member, and pre-fund your own settlement obligations.',
  divestDetail: 'Close out the exposed contracts at a discount and re-paper the book onto direct bilateral terms.',
  defaultReliefId: 'clearing_haircut',
  reliefOptions: [
    {
      id: 'clearing_haircut',
      name: 'Fund a mutualised haircut',
      description: 'Every surviving member takes a share of the loss so the chain settles at once. Fastest reopening; the prudent subsidise the reckless.',
      contained: { label: 'Chain Settled', reputationPoints: 800, costMultiplier: 0.97, effectDurationMonths: 3 },
      shortfall: { label: 'Chain Still Frozen', costMultiplier: 1.06, effectDurationMonths: 4 },
    },
    {
      id: 'clearing_receivership',
      name: 'Fund an SCC receivership',
      description: 'Put the failed member into court-run receivership and pay creditors in strict priority. Slow, and every claim is honestly ranked.',
      contained: { label: 'Receivership Concluded', reputationPoints: 900, factionRep: { 'the-dominion': 8 } },
      shortfall: { label: 'Receivership Contested', costMultiplier: 1.05, effectDurationMonths: 4, reputationPoints: 120 },
    },
    {
      id: 'clearing_bilateral',
      name: 'Fund bilateral re-papering',
      description: 'Abandon central clearing for this cycle and subsidise direct contracts between counterparties who can still see each other\'s books.',
      contained: { label: 'Bilateral Terms Restored', reputationPoints: 650, revenueMultiplier: 1.03, effectDurationMonths: 3 },
      shortfall: { label: 'Bilateral Talks Collapse', costMultiplier: 1.05, effectDurationMonths: 3 },
    },
  ],
  marketEvents: [
    {
      startWeek: 1, durationHours: 6,
      id: 'crisis_clearing_liquidity', name: 'Settlement Freeze', icon: '🧊',
      description: 'With escrow frozen, sellers dump into whatever bid exists to raise cash.',
      affectedResources: ['iron', 'aluminum', 'titanium'], priceMultiplier: 0.75,
    },
    {
      startWeek: 3, durationHours: 6,
      id: 'crisis_clearing_collateral', name: 'Collateral Scramble', icon: '💎',
      description: 'Anything the Court will accept as margin is bid for regardless of use.',
      affectedResources: ['gold', 'platinum_group'], priceMultiplier: 1.45,
    },
  ],
};

const THE_RETROFIT_ORDER: CrisisDefinition = {
  id: 'regulatory_upheaval',
  name: 'The Retrofit Order',
  icon: '📜',
  precedent: 'LORE.md — the Ring Fire of 2137 killed 1,800 workers at Saturn and produced the modern safety regime. The Accord has never hesitated to legislate after a body count.',
  tagline: 'The Accord has issued an emergency retrofit order. Non-compliant sites throttle down.',
  briefing: 'A fatal pressure-vessel failure at a mid-tier facility turned out to share a design lineage with several thousand installed units. The Accord\'s emergency session did what it did after the Ring Fire: an immediate compliance order, a short window to certify, and throttled operation for anything uncertified. The Orbital Engineers\' Union has the only certified inspectors, and it is in no hurry.',
  patronFaction: 'the-dominion',
  worldIndexChannel: 'built_capacity',
  worldIndexLabel: 'installed facilities across corporations synced this month',
  exposure: (state) => {
    const buildings = countCompletedBuildingsWhere(state, () => true);
    const hazardous = countCompletedBuildingsWhere(state, l => CRISIS_HAZARDOUS_LOCATIONS.has(l));
    const measured = buildings + hazardous;
    return {
      measured,
      // SIM-DERIVED, not designed. The first authoring pass used 30 and
      // `sim-50yr` §9b measured the consequence: five of the eight 50-year
      // archetypes (industrialist 9 buildings, turtle 8, aggressor 7,
      // hoarder 6, joiner-y30 4) sat permanently at index 0.23-0.30, i.e.
      // BELOW the 0.35 Advisory threshold, and therefore never saw a single
      // measure in force across fifty game-years — precisely the archetypes
      // whose dead decades Pass 5 H3 measured as worst. 20 is the top of the
      // observed mature distribution rather than above it (Pass 5 measured
      // 50-year plateaus of 2-37 installations), which puts a 9-building
      // industrialist at Elevated and leaves a genuinely tiny 6-building
      // corporation exempt. The Pass-5→Pass-6 lesson applies verbatim here:
      // do not ship a designed constant without simulating it.
      anchor: 20,
      unit: 'certifiable installations',
      detail: `${buildings} completed facilit${buildings === 1 ? 'y' : 'ies'}${hazardous > 0 ? `, ${hazardous} of them at a site the order treats as elevated-hazard (double weighting)` : ''}.`,
    };
  },
  hardenDetail: 'Book inspector time at the emergency rate, fund the retrofit queue, and certify ahead of the deadline.',
  divestDetail: 'Take the uncertifiable installations out of service and consolidate output onto the sites that already comply.',
  defaultReliefId: 'retrofit_inspectors',
  reliefOptions: [
    {
      id: 'retrofit_inspectors',
      name: 'Fund the inspector corps',
      description: 'Pay to train and field enough certified inspectors to clear the queue. Everybody certifies; nobody gets a pass.',
      contained: { label: 'Inspection Queue Cleared', reputationPoints: 850, costMultiplier: 0.97, effectDurationMonths: 4 },
      shortfall: { label: 'Inspection Backlog Persists', costMultiplier: 1.06, effectDurationMonths: 4 },
    },
    {
      id: 'retrofit_subsidy',
      name: 'Fund a retrofit subsidy',
      description: 'Pay for the hardware, not the paperwork. Small operators survive the order; the queue still takes as long as it takes.',
      contained: { label: 'Retrofit Subsidy Disbursed', reputationPoints: 800, hazardMitigationBonus: { amount: 0.05, durationMonths: 4 } },
      shortfall: { label: 'Subsidy Runs Dry', costMultiplier: 1.05, effectDurationMonths: 3, reputationPoints: 120 },
    },
    {
      id: 'retrofit_grandfather',
      name: 'Fund a grandfathering review',
      description: 'Pay for the engineering case that exempts the older lineage. Cheapest and fastest — and the Union will remember who argued for it.',
      contained: { label: 'Grandfathering Granted', reputationPoints: 500, revenueMultiplier: 1.04, effectDurationMonths: 3, factionRep: { 'the-dominion': -4 } },
      shortfall: { label: 'Grandfathering Refused', costMultiplier: 1.06, effectDurationMonths: 3 },
    },
  ],
  marketEvents: [
    {
      startWeek: 1, durationHours: 8,
      id: 'crisis_retrofit_components', name: 'Certified-Component Squeeze', icon: '🔧',
      description: 'Every operator needs the same certified pressure hardware in the same eight weeks.',
      affectedResources: ['titanium', 'rare_earth'], priceMultiplier: 1.40,
    },
    {
      startWeek: 3, durationHours: 8,
      id: 'crisis_retrofit_throttle', name: 'Throttled-Output Glut', icon: '🐌',
      description: 'Uncertified sites run at reduced rates, and their held inventory is sold rather than stored.',
      affectedResources: ['helium3', 'lunar_water'], priceMultiplier: 0.75,
    },
  ],
};

export const CRISIS_DEFINITIONS: CrisisDefinition[] = [
  THE_CASCADE,
  THE_MUTUALS_RESERVES,
  THE_THIN_SEAM,
  THE_CLEARING_FAILURE,
  THE_RETROFIT_ORDER,
];

export const CRISIS_MAP = new Map(CRISIS_DEFINITIONS.map(c => [c.id, c]));

/** The crisis a cycle runs. PURE — see the module header. Five definitions
 *  on an 8-week cycle means 40 weeks (~9 months) before the catalogue
 *  repeats, against chapters.ts's 18. */
export function getCrisisForCycle(cycleIndex: number): CrisisDefinition {
  const n = CRISIS_DEFINITIONS.length;
  return CRISIS_DEFINITIONS[((cycleIndex % n) + n) % n];
}

// ─── Eligibility (newcomer safety) ─────────────────────────────────────────

export type CrisisIneligibleReason =
  | 'frontier'
  | 'onboarding'
  | 'no_snapshot'
  | 'not_active'
  | 'advisory';

export interface CrisisEligibility {
  eligible: boolean;
  reason?: CrisisIneligibleReason;
  detail?: string;
}

/**
 * Can a situation open against this save right now?
 *
 * Round 2's newcomer bar, in one function and asserted by test:
 *  - a Protected Frontier corporation is NEVER touched (`isInFrontier`),
 *  - a corporation still inside the FTUE chain is NEVER touched
 *    (`isOnboardingComplete`),
 *  - nothing opens outside the active window,
 *  - nothing opens at Advisory severity.
 *
 * The post-Frontier graduation glide is handled separately, in
 * `computeSituationRate` — a fresh graduate feels the crisis, but at a
 * fraction of its rate that decays linearly over the same 14 real days
 * BALANCE.md Pass 6 measured for the demand-pool glide. Suppressing it
 * entirely would produce a cliff on day 15, which is the exact defect Pass 5
 * C1 found and Pass 6 fixed.
 */
export function isCrisisEligible(
  state: GameState,
  snapshot: CrisisSnapshot | null | undefined,
  nowMs: number = Date.now(),
): CrisisEligibility {
  if (isInFrontier(state, nowMs)) {
    return { eligible: false, reason: 'frontier', detail: 'Protected Frontier corporations are exempt from Accord emergency measures.' };
  }
  if (!isOnboardingComplete(state)) {
    return { eligible: false, reason: 'onboarding', detail: 'Emergency measures are deferred until your corporation has completed its charter filings.' };
  }
  if (!snapshot || !snapshot.enabled) {
    return { eligible: false, reason: 'no_snapshot', detail: 'No Accord emergency is on the register for this cycle.' };
  }
  const win = getCrisisWindow(nowMs);
  if (win.phase !== 'active') {
    return { eligible: false, reason: 'not_active', detail: 'The emergency window is not open.' };
  }
  const tier = effectiveCrisisTier(state, snapshot);
  if (tier === 'advisory') {
    return { eligible: false, reason: 'advisory', detail: 'The Accord has published an advisory only — no measures are in force.' };
  }
  return { eligible: true };
}

// ─── The snapshot (server-authoritative, read-only on the client) ──────────

export interface CrisisPledgeRow {
  corpName: string;
  amountUsd: number;
}

export interface CrisisHistoryEntry {
  cycleIndex: number;
  crisisId: string;
  /** pledged / target, clamped 0..1. */
  containment: number;
  reliefId: string;
  worldIndex: number;
  pledgeCount: number;
}

export interface CrisisSnapshot {
  /** False when the schema is not pushed or the server declined to publish —
   *  every reader treats this exactly as "no crisis system". */
  enabled: boolean;
  cycleIndex: number;
  crisisId: string;
  /** Measured, published at forecast time so the whole world plans against
   *  the same number. See server-crises.ts for the query behind each
   *  channel. */
  worldIndex: number;
  worldIndexMeasured: number;
  worldIndexAnchor: number;
  worldIndexChannel: CrisisWorldIndexChannel;
  assessmentTargetUsd: number;
  pledgedUsd: number;
  pledgeCount: number;
  myPledgeUsd: number;
  reliefId: string;
  reliefSetByCorp: string | null;
  /** True only for the seated Accord Chair, and only while the directive is
   *  still unspent for this cycle. */
  canSetRelief: boolean;
  topPledges: CrisisPledgeRow[];
  history: CrisisHistoryEntry[];
  asOf: number;
}

const MAX_TOP_PLEDGES = 8;
const MAX_SNAPSHOT_HISTORY = 12;

/** Defensive re-clamp on the way into GameState — the same posture
 *  clampChairSnapshot / clampEquitySnapshot take. Server data is trusted more
 *  than client data, but a bugged aggregate must never explode a cost. */
export function clampCrisisSnapshot(s: CrisisSnapshot | null | undefined): CrisisSnapshot | null {
  if (!s || typeof s !== 'object') return null;
  const money = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
  const crisisId = CRISIS_MAP.has(s.crisisId) ? s.crisisId : getCrisisForCycle(Number(s.cycleIndex) || 0).id;
  const def = CRISIS_MAP.get(crisisId)!;
  const reliefId = def.reliefOptions.some(r => r.id === s.reliefId) ? s.reliefId : def.defaultReliefId;
  return {
    enabled: s.enabled === true,
    cycleIndex: Number.isFinite(s.cycleIndex) ? Math.floor(s.cycleIndex) : 0,
    crisisId,
    worldIndex: clampCrisisIndex(s.worldIndex),
    worldIndexMeasured: typeof s.worldIndexMeasured === 'number' && Number.isFinite(s.worldIndexMeasured)
      ? Math.max(0, s.worldIndexMeasured) : 0,
    worldIndexAnchor: typeof s.worldIndexAnchor === 'number' && Number.isFinite(s.worldIndexAnchor) && s.worldIndexAnchor > 0
      ? s.worldIndexAnchor : 1,
    worldIndexChannel: def.worldIndexChannel,
    assessmentTargetUsd: money(s.assessmentTargetUsd),
    pledgedUsd: money(s.pledgedUsd),
    pledgeCount: typeof s.pledgeCount === 'number' && Number.isFinite(s.pledgeCount) ? Math.max(0, Math.floor(s.pledgeCount)) : 0,
    myPledgeUsd: money(s.myPledgeUsd),
    reliefId,
    reliefSetByCorp: typeof s.reliefSetByCorp === 'string' ? s.reliefSetByCorp.slice(0, 64) : null,
    canSetRelief: s.canSetRelief === true,
    topPledges: Array.isArray(s.topPledges)
      ? s.topPledges.slice(0, MAX_TOP_PLEDGES).map(p => ({
        corpName: String(p?.corpName ?? '').slice(0, 64),
        amountUsd: money(p?.amountUsd),
      }))
      : [],
    history: Array.isArray(s.history)
      ? s.history.slice(0, MAX_SNAPSHOT_HISTORY).map(h => ({
        cycleIndex: Number.isFinite(h?.cycleIndex) ? Math.floor(h.cycleIndex) : 0,
        crisisId: CRISIS_MAP.has(h?.crisisId) ? h.crisisId : getCrisisForCycle(0).id,
        containment: Math.max(0, Math.min(1, typeof h?.containment === 'number' && Number.isFinite(h.containment) ? h.containment : 0)),
        reliefId: String(h?.reliefId ?? ''),
        worldIndex: clampCrisisIndex(h?.worldIndex),
        pledgeCount: typeof h?.pledgeCount === 'number' && Number.isFinite(h.pledgeCount) ? Math.max(0, Math.floor(h.pledgeCount)) : 0,
      }))
      : [],
    asOf: typeof s.asOf === 'number' && Number.isFinite(s.asOf) ? s.asOf : Date.now(),
  };
}

// ─── Exposure and effective severity ───────────────────────────────────────

export interface CrisisExposure extends CrisisExposureReading {
  index: number;
  tier: CrisisTier;
  factor: number;
}

export function computeCrisisExposure(state: GameState, crisisId: string): CrisisExposure {
  const def = CRISIS_MAP.get(crisisId) ?? CRISIS_DEFINITIONS[0];
  const reading = def.exposure(state);
  const anchor = reading.anchor > 0 ? reading.anchor : 1;
  const index = clampCrisisIndex(reading.measured / anchor);
  return {
    ...reading,
    index,
    tier: crisisTierForIndex(index),
    factor: crisisExposureFactor(index),
  };
}

/** Severity is the worse of what the world built and what you built. */
export function effectiveCrisisTier(
  state: GameState,
  snapshot: CrisisSnapshot | null | undefined,
): CrisisTier {
  if (!snapshot || !snapshot.enabled) return 'advisory';
  const worldTier = crisisTierForIndex(snapshot.worldIndex);
  const exposureTier = computeCrisisExposure(state, snapshot.crisisId).tier;
  return crisisTierRank(exposureTier) > crisisTierRank(worldTier) ? exposureTier : worldTier;
}

// ─── The situation ─────────────────────────────────────────────────────────

export interface CorporateSituation {
  crisisId: string;
  cycleIndex: number;
  /** 0..1 toward the bad outcome. */
  progress: number;
  /** Highest stage index whose costs have already been charged. -1 = none. */
  chargedStage: number;
  approachId: CrisisApproachId;
  /** Stage at which the current approach was adopted — used so switching
   *  approach re-charges an adoption cost rather than being free. */
  approachAdoptedStage: number;
  /** Exposure index measured at onset, frozen so the bar does not jump when
   *  a player builds or decommissions mid-crisis. */
  exposureAtOnset: number;
  tierAtOnset: CrisisTier;
  operationalCapitalAtOnset: number;
  openedAtMs: number;
  lastAdvancedMs: number;
  pledged: boolean;
  outcome?: 'contained' | 'realized';
  resolvedAtMs?: number;
}

export interface CrisisRecord {
  cycleIndex: number;
  crisisId: string;
  crisisName: string;
  tier: CrisisTier;
  outcome: 'contained' | 'realized' | 'exempt';
  approachId: CrisisApproachId;
  pledgedUsd: number;
  spentUsd: number;
  lossUsd: number;
  /** World containment fraction at the time this record was written. */
  containment: number;
  reliefId: string;
  atMs: number;
}

export const MAX_CRISIS_HISTORY = 20;

/** Progress per millisecond, given tier, exposure, approach and pledge.
 *  Multiplied by the elapsed wall-clock delta — so an offline corporation
 *  accrues exactly what an online one does, and a fast-ticking save gains
 *  nothing (the same wall-clock discipline chapters.ts uses for staging). */
export function computeSituationRatePerMs(
  tier: CrisisTier,
  exposureIndex: number,
  approachId: CrisisApproachId,
  pledged: boolean,
  glideFraction: number = 0,
): number {
  const base = CRISIS_BASE_RATE_PER_WINDOW[tier] ?? 0;
  if (base <= 0) return 0;
  const approach = CRISIS_APPROACH_MAP.get(approachId) ?? CRISIS_APPROACH_MAP.get('absorb')!;
  const mitigation = Math.min(
    CRISIS_MITIGATION_CAP,
    approach.mitigation + (pledged ? CRISIS_PLEDGE_MITIGATION : 0),
  );
  // Post-graduation glide: a corporation N days out of the Frontier feels
  // (1 - fraction) of the rate, linear to full exposure at 14 real days.
  // Never boosts (fraction is 0 for veterans by construction).
  const glide = Math.max(0, Math.min(1, glideFraction));
  return (base * crisisExposureFactor(exposureIndex) * (1 - mitigation) * (1 - glide))
    / CRISIS_ACTIVE_WINDOW_MS;
}

export function situationApproachCostForStage(
  situation: CorporateSituation,
  approachId: CrisisApproachId,
  tier: CrisisTier,
): number {
  const approach = CRISIS_APPROACH_MAP.get(approachId);
  if (!approach) return 0;
  const pct = approach.perStageCostPct[tier] ?? 0;
  return Math.max(0, Math.round(situation.operationalCapitalAtOnset * pct));
}

export function situationAdoptionCost(
  operationalCapital: number,
  approachId: CrisisApproachId,
  tier: CrisisTier,
): number {
  const approach = CRISIS_APPROACH_MAP.get(approachId);
  if (!approach) return 0;
  const pct = approach.adoptionCostPct[tier] ?? 0;
  return Math.max(0, Math.round(operationalCapital * pct));
}

/** The loss if the bar reaches 1.0. Bounded twice: by a fraction of the
 *  operational capital measured AT ONSET (so nothing a player does during
 *  the crisis can inflate it) and by a fraction of cash on hand (so it can
 *  never take a corporation to zero). */
export function situationRealizedLoss(
  situation: CorporateSituation,
  tier: CrisisTier,
  money: number,
): number {
  const pct = CRISIS_REALIZED_LOSS_PCT[tier] ?? 0;
  const raw = situation.operationalCapitalAtOnset * pct;
  const cashCap = Math.max(0, money) * CRISIS_LOSS_CASH_CAP_PCT;
  return Math.max(0, Math.round(Math.min(raw, cashCap)));
}

/** Total money a corporation would spend on this approach for the rest of
 *  the window — the number the panel shows before the player commits. */
export function projectedApproachSpend(
  situation: CorporateSituation,
  approachId: CrisisApproachId,
  tier: CrisisTier,
  currentStage: number,
): number {
  const remainingStages = Math.max(0, CRISIS_STAGES - Math.max(0, currentStage));
  const adoption = situationAdoptionCost(situation.operationalCapitalAtOnset, approachId, tier);
  const perStage = situationApproachCostForStage(situation, approachId, tier);
  return adoption + perStage * remainingStages;
}

// ─── The Accord Stabilization Assessment ───────────────────────────────────

/** Target as a fraction of the world's published economic scale, by tier.
 *  Server-computed and published at forecast so it can be planned against.
 *  Deliberately small relative to any single corporation's balance sheet:
 *  the assessment is a coordination problem, not a wealth tax. */
export const CRISIS_ASSESSMENT_TARGET_PCT: Record<CrisisTier, number> = {
  advisory: 0,
  elevated: 0.004,
  severe: 0.009,
  systemic: 0.016,
};

/** Floor so a thin shard still has a meaningful, non-zero target rather than
 *  a target of $0 that is trivially "met". */
export const CRISIS_ASSESSMENT_TARGET_FLOOR = 250_000_000;

export function computeAssessmentTarget(tier: CrisisTier, worldScaleUsd: number): number {
  const pct = CRISIS_ASSESSMENT_TARGET_PCT[tier] ?? 0;
  if (pct <= 0) return 0;
  return Math.max(CRISIS_ASSESSMENT_TARGET_FLOOR, Math.round(Math.max(0, worldScaleUsd) * pct));
}

/** Minimum pledge that earns the assessment's mitigation — scaled to the
 *  pledging corporation, never a flat constant, so a small corporation can
 *  buy the same protection as a large one by contributing proportionally.
 *  This is the anti-pay-to-win shape: money buys no edge, only a share of a
 *  public good. */
export const CRISIS_QUALIFYING_PLEDGE_PCT = 0.0025;
export const CRISIS_QUALIFYING_PLEDGE_MIN = 1_000_000;

export function qualifyingPledge(operationalCapital: number): number {
  return Math.max(
    CRISIS_QUALIFYING_PLEDGE_MIN,
    Math.round(Math.max(0, operationalCapital) * CRISIS_QUALIFYING_PLEDGE_PCT),
  );
}

export function containmentFraction(pledgedUsd: number, targetUsd: number): number {
  if (!(targetUsd > 0)) return 0;
  return Math.max(0, Math.min(1, pledgedUsd / targetUsd));
}

// ─── Insurance hardening (the one live-sink multiplier) ────────────────────

/** Premium loading while an emergency is in force. Bounded, published two
 *  real weeks ahead, and applied only to an OPT-IN sink
 *  (`economic-sinks.ts::getMonthlyInsurancePremium`) — a corporation that
 *  carries no policy pays nothing extra and simply carries its own risk.
 *  This is exactly how a reinsurance hard market works: a large loss
 *  anywhere reprices capacity everywhere. */
export const CRISIS_PREMIUM_MULTIPLIER: Record<CrisisTier, number> = {
  advisory: 1.0,
  elevated: 1.15,
  severe: 1.35,
  systemic: 1.60,
};

/**
 * Insurance premium loading for this save right now. Returns exactly 1 when
 * there is no snapshot, the window is not open, the tier is advisory, or the
 * corporation is Frontier-protected / mid-FTUE — so a pre-Round-2 save and a
 * newcomer both pay precisely what they paid before.
 */
export function getCrisisInsurancePremiumMultiplier(
  state: GameState,
  nowMs: number = Date.now(),
): number {
  const snap = state.systemicCrisis;
  if (!snap || !snap.enabled) return 1;
  const win = getCrisisWindow(nowMs);
  if (win.cycleIndex !== snap.cycleIndex) return 1;
  if (win.phase !== 'active' && win.phase !== 'aftermath') return 1;
  if (isInFrontier(state, nowMs) || !isOnboardingComplete(state)) return 1;
  const tier = effectiveCrisisTier(state, snap);
  return CRISIS_PREMIUM_MULTIPLIER[tier] ?? 1;
}

// ─── Advancement (called once per tick from processFullTick) ───────────────

export interface AdvanceCrisisResult {
  state: GameState;
  events: GameEvent[];
}

function logEvent(state: GameState, title: string, description: string, type: GameEvent['type'] = 'random_event'): GameEvent {
  return { id: generateId(), date: state.gameDate, type, title, description };
}

/**
 * Advance this save's crisis situation to match the world's calendar.
 *
 * Deterministic given (state, snapshot, nowMs). Idempotent within a tick:
 * calling it twice with the same clock charges nothing twice, because every
 * charge is keyed to a stage index recorded on the situation.
 *
 * Order of business:
 *   1. File a stale situation (the world moved on) into history.
 *   2. Open a situation at onset if eligible.
 *   3. Accrue progress by wall-clock delta.
 *   4. Charge the chosen approach's per-stage cost at each new stage.
 *   5. Realize the outcome when the bar hits 1.0, or contain it when the
 *      window closes.
 *   6. Apply the world-shared relief consequence once, in the aftermath week.
 */
export function advanceSystemicCrisis(
  state: GameState,
  nowMs: number = Date.now(),
): AdvanceCrisisResult {
  const events: GameEvent[] = [];
  const snap = state.systemicCrisis;
  const win = getCrisisWindow(nowMs);
  let out = state;
  let situation = state.crisisSituation ?? null;
  let history = state.crisisHistory ?? [];

  // ── 1. Stale progress from a previous cycle ─────────────────────────────
  if (situation && situation.cycleIndex !== win.cycleIndex) {
    if (!situation.outcome) {
      // The window closed while this save was away and nothing resolved it.
      // Treat an unresolved bar as contained if it never reached 1.0 — the
      // same "missing a window forfeits the upside, never adds a penalty"
      // fairness rule chapters.ts and LS5 already use.
      const def = CRISIS_MAP.get(situation.crisisId);
      history = [...history, {
        cycleIndex: situation.cycleIndex,
        crisisId: situation.crisisId,
        crisisName: def?.name ?? situation.crisisId,
        tier: situation.tierAtOnset,
        outcome: (situation.progress >= 1 ? 'realized' : 'contained') as CrisisRecord['outcome'],
        approachId: situation.approachId,
        pledgedUsd: 0,
        spentUsd: 0,
        lossUsd: 0,
        containment: 0,
        reliefId: '',
        atMs: nowMs,
      }].slice(-MAX_CRISIS_HISTORY);
    }
    situation = null;
  }

  // ── 2. Open ─────────────────────────────────────────────────────────────
  if (!situation && snap && snap.enabled && snap.cycleIndex === win.cycleIndex) {
    const eligibility = isCrisisEligible(out, snap, nowMs);
    if (eligibility.eligible) {
      const def = CRISIS_MAP.get(snap.crisisId) ?? CRISIS_DEFINITIONS[0];
      const exposure = computeCrisisExposure(out, snap.crisisId);
      const tier = effectiveCrisisTier(out, snap);
      situation = {
        crisisId: snap.crisisId,
        cycleIndex: snap.cycleIndex,
        progress: 0,
        chargedStage: -1,
        approachId: 'absorb',
        approachAdoptedStage: 0,
        exposureAtOnset: exposure.index,
        tierAtOnset: tier,
        operationalCapitalAtOnset: crisisOperationalCapital(out),
        openedAtMs: Math.max(win.activeStartMs, nowMs),
        lastAdvancedMs: Math.max(win.activeStartMs, nowMs),
        pledged: (snap.myPledgeUsd ?? 0) > 0,
      };
      events.push(logEvent(
        out,
        `${def.icon} ${def.name}: ${CRISIS_TIER_LABEL[tier]}`,
        `${def.tagline} Your exposure: ${exposure.detail} Choose a posture in Reports → Emergency before the bar runs out.`,
        'milestone',
      ));
    }
  }

  // ── 3-5. Advance an open situation ──────────────────────────────────────
  if (situation && !situation.outcome && snap && snap.enabled) {
    const def = CRISIS_MAP.get(situation.crisisId) ?? CRISIS_DEFINITIONS[0];
    const tier = situation.tierAtOnset;
    // Pledge state is server-owned; mirror it every tick so a pledge made in
    // the panel starts mitigating on the very next tick.
    if ((snap.myPledgeUsd ?? 0) > 0) situation = { ...situation, pledged: true };

    const clockNow = Math.min(nowMs, win.activeEndMs);
    const deltaMs = Math.max(0, clockNow - situation.lastAdvancedMs);
    if (deltaMs > 0) {
      const rate = computeSituationRatePerMs(
        tier,
        situation.exposureAtOnset,
        situation.approachId,
        situation.pledged,
        getGraduationGlideFraction(out, nowMs),
      );
      situation = {
        ...situation,
        progress: Math.max(0, Math.min(1, situation.progress + rate * deltaMs)),
        lastAdvancedMs: clockNow,
      };
    }

    // ── 4. Per-stage approach charges ─────────────────────────────────────
    const reachedStage = Math.min(CRISIS_STAGES - 1, win.stage);
    if (win.phase === 'active' && reachedStage > situation.chargedStage) {
      let charged = 0;
      const perStage = situationApproachCostForStage(situation, situation.approachId, tier);
      const stagesDue = reachedStage - situation.chargedStage;
      charged = perStage * stagesDue;
      if (charged > 0) {
        out = applyChainConsequence(out, {
          label: `${def.name}: ${CRISIS_APPROACH_MAP.get(situation.approachId)?.name ?? 'posture'} upkeep`,
          moneyCost: charged,
        }, 0);
        events.push(logEvent(
          out,
          `${def.icon} ${def.name}: posture upkeep`,
          `$${(charged / 1e6).toFixed(1)}M committed across ${stagesDue} stage${stagesDue === 1 ? '' : 's'} of ${CRISIS_APPROACH_MAP.get(situation.approachId)?.name.toLowerCase()}.`,
        ));
      }
      situation = { ...situation, chargedStage: reachedStage };
    }

    // ── 5. Resolve ────────────────────────────────────────────────────────
    if (situation.progress >= 1) {
      const loss = situationRealizedLoss(situation, tier, out.money);
      const consequence: ChainConsequence = {
        label: `${def.name}: loss realized`,
        moneyCost: loss,
        costMultiplier: CRISIS_REALIZED_COST_MULT[tier] ?? 1,
        effectDurationMonths: CRISIS_REALIZED_EFFECT_MONTHS,
        moraleDelta: -0.03,
      };
      out = applyChainConsequence(out, consequence, 0);
      situation = { ...situation, outcome: 'realized', resolvedAtMs: nowMs };
      events.push(logEvent(
        out,
        `${def.icon} ${def.name}: loss realized`,
        `Your exposure ran the full course. $${(loss / 1e6).toFixed(1)}M written off and recovery costs run ${Math.round(((CRISIS_REALIZED_COST_MULT[tier] ?? 1) - 1) * 100)}% higher for ${CRISIS_REALIZED_EFFECT_MONTHS} months.`,
        'milestone',
      ));
    } else if (nowMs >= win.activeEndMs) {
      out = applyChainConsequence(out, {
        label: `${def.name}: contained`,
        reputationPoints: 400 + 200 * crisisTierRank(tier),
        factionRep: { [def.patronFaction]: 4 + 2 * crisisTierRank(tier) } as ChainConsequence['factionRep'],
        hazardMitigationBonus: { amount: 0.02, durationMonths: 3 },
      }, 0);
      situation = { ...situation, outcome: 'contained', resolvedAtMs: nowMs };
      events.push(logEvent(
        out,
        `${def.icon} ${def.name}: contained`,
        `Your corporation came through the emergency window without a realized loss. The Accord's register notes it.`,
        'milestone',
      ));
    }
  }

  // ── 6. World-shared relief, once, in the aftermath week ─────────────────
  if (
    situation && situation.outcome
    && snap && snap.enabled && snap.cycleIndex === situation.cycleIndex
    && win.phase === 'aftermath'
    && !history.some(h => h.cycleIndex === situation!.cycleIndex)
  ) {
    const def = CRISIS_MAP.get(situation.crisisId) ?? CRISIS_DEFINITIONS[0];
    const relief = def.reliefOptions.find(r => r.id === snap.reliefId) ?? def.reliefOptions[0];
    const contained = containmentFraction(snap.pledgedUsd, snap.assessmentTargetUsd);
    const met = contained >= 1;
    out = applyChainConsequence(out, met ? relief.contained : relief.shortfall, 0);
    history = [...history, {
      cycleIndex: situation.cycleIndex,
      crisisId: situation.crisisId,
      crisisName: def.name,
      tier: situation.tierAtOnset,
      outcome: situation.outcome,
      approachId: situation.approachId,
      pledgedUsd: snap.myPledgeUsd ?? 0,
      spentUsd: 0,
      lossUsd: 0,
      containment: contained,
      reliefId: relief.id,
      atMs: nowMs,
    }].slice(-MAX_CRISIS_HISTORY);
    events.push(logEvent(
      out,
      `${def.icon} ${def.name}: ${met ? 'Assessment Subscribed' : 'Assessment Short'}`,
      `${relief.name} — ${met ? relief.contained.label : relief.shortfall.label}. The Accord raised $${(snap.pledgedUsd / 1e6).toFixed(0)}M of a $${(snap.assessmentTargetUsd / 1e6).toFixed(0)}M target from ${snap.pledgeCount} corporation${snap.pledgeCount === 1 ? '' : 's'}.`,
      'milestone',
    ));
  }

  // Identity check, deliberately against the ORIGINAL references rather than
  // against `?? []` sentinels: `state.crisisHistory ?? []` allocates a fresh
  // array on every call, so comparing against it would report a change on
  // every quiet tick and hand the engine a new GameState for nothing. A tick
  // in which no crisis exists must return the same object it was given —
  // asserted by test, because that identity is what makes the whole system
  // provably inert for a pre-Round-2 save.
  const situationChanged = situation !== (state.crisisSituation ?? null);
  const historyChanged = history !== state.crisisHistory && history.length > 0;
  if (situationChanged || historyChanged) {
    out = { ...out, crisisSituation: situation, crisisHistory: history };
  }
  return { state: out, events };
}

// ─── Approach switching (panel-driven, not a modal) ────────────────────────
// Stellaris presents a situation as a MANAGED problem in a panel, not as a
// one-shot modal, and that is the shape that makes it a decision the player
// keeps making rather than a dialogue box they dismiss. It also avoids
// contending for the single `pendingChoice` slot that narrative chains and
// chapters already share.

export interface SetApproachResult {
  state: GameState;
  ok: boolean;
  reason?: string;
  charged: number;
}

export function setCrisisApproach(
  state: GameState,
  approachId: CrisisApproachId,
  nowMs: number = Date.now(),
): SetApproachResult {
  const situation = state.crisisSituation;
  if (!situation || situation.outcome) {
    return { state, ok: false, reason: 'No open emergency situation.', charged: 0 };
  }
  const win = getCrisisWindow(nowMs);
  if (win.phase !== 'active' || win.cycleIndex !== situation.cycleIndex) {
    return { state, ok: false, reason: 'The emergency window is closed.', charged: 0 };
  }
  if (!CRISIS_APPROACH_MAP.has(approachId)) {
    return { state, ok: false, reason: 'Unknown posture.', charged: 0 };
  }
  if (situation.approachId === approachId) {
    return { state, ok: false, reason: 'Already the current posture.', charged: 0 };
  }

  const def = CRISIS_MAP.get(situation.crisisId) ?? CRISIS_DEFINITIONS[0];
  const approach = CRISIS_APPROACH_MAP.get(approachId)!;
  const adoption = situationAdoptionCost(situation.operationalCapitalAtOnset, approachId, situation.tierAtOnset);
  if (adoption > state.money) {
    return { state, ok: false, reason: 'Insufficient cash for the standing-up cost.', charged: 0 };
  }

  let out = state;
  if (adoption > 0) {
    out = applyChainConsequence(out, {
      label: `${def.name}: ${approach.name}`,
      moneyCost: adoption,
    }, 0);
  }
  if (approach.revenueMultiplier !== 1) {
    // Capacity pulled out of the exposed lane is capacity that is not
    // earning — expressed through the existing activeEffects channel, for
    // the remaining weeks of the crisis rounded to game-months.
    const remainingMs = Math.max(0, win.activeEndMs - nowMs);
    const months = Math.max(1, Math.round(remainingMs / (6 * 60 * 60 * 1000)));
    out = applyChainConsequence(out, {
      label: `${def.name}: capacity repositioned`,
      revenueMultiplier: approach.revenueMultiplier,
      effectDurationMonths: months,
    }, 0);
  }

  out = {
    ...out,
    crisisSituation: {
      ...situation,
      approachId,
      approachAdoptedStage: win.stage,
      // The stage the new posture takes over from: the next boundary charges
      // at the new rate. Already-charged stages are never re-charged.
      chargedStage: Math.min(situation.chargedStage, CRISIS_STAGES - 1),
    },
    eventLog: [logEvent(
      out,
      `${def.icon} ${def.name}: posture → ${approach.name}`,
      adoption > 0
        ? `$${(adoption / 1e6).toFixed(1)}M committed to stand it up.`
        : approach.id === 'absorb'
          ? 'Standing down all emergency spend.'
          : 'Posture changed.',
    ), ...out.eventLog].slice(0, 200),
  };
  return { state: out, ok: true, charged: adoption };
}

// ─── Presentation helpers (pure; shared by the panel, the Situation Log and
// the Mission Calendar so no two surfaces can describe the same crisis
// differently) ─────────────────────────────────────────────────────────────

export interface CrisisStatus {
  window: CrisisWindow;
  def: CrisisDefinition;
  snapshot: CrisisSnapshot | null;
  enabled: boolean;
  tier: CrisisTier;
  worldTier: CrisisTier;
  exposure: CrisisExposure;
  eligibility: CrisisEligibility;
  situation: CorporateSituation | null;
  /** Projected progress at the close of the window if nothing changes. */
  projectedProgress: number;
  containment: number;
  qualifyingPledgeUsd: number;
  premiumMultiplier: number;
}

export function getCrisisStatus(state: GameState, nowMs: number = Date.now()): CrisisStatus {
  const window = getCrisisWindow(nowMs);
  const snapshot = state.systemicCrisis ?? null;
  const crisisId = snapshot?.enabled ? snapshot.crisisId : getCrisisForCycle(window.cycleIndex).id;
  const def = CRISIS_MAP.get(crisisId) ?? CRISIS_DEFINITIONS[0];
  const exposure = computeCrisisExposure(state, def.id);
  const worldTier = crisisTierForIndex(snapshot?.worldIndex ?? 0);
  const tier = effectiveCrisisTier(state, snapshot);
  const situation = state.crisisSituation ?? null;

  let projectedProgress = situation?.progress ?? 0;
  if (situation && !situation.outcome) {
    const rate = computeSituationRatePerMs(
      situation.tierAtOnset,
      situation.exposureAtOnset,
      situation.approachId,
      situation.pledged,
      getGraduationGlideFraction(state, nowMs),
    );
    const remainingMs = Math.max(0, window.activeEndMs - Math.max(nowMs, situation.lastAdvancedMs));
    projectedProgress = Math.min(1, situation.progress + rate * remainingMs);
  }

  return {
    window,
    def,
    snapshot,
    enabled: snapshot?.enabled === true,
    tier,
    worldTier,
    exposure,
    eligibility: isCrisisEligible(state, snapshot, nowMs),
    situation,
    projectedProgress,
    containment: containmentFraction(snapshot?.pledgedUsd ?? 0, snapshot?.assessmentTargetUsd ?? 0),
    qualifyingPledgeUsd: qualifyingPledge(crisisOperationalCapital(state)),
    premiumMultiplier: getCrisisInsurancePremiumMultiplier(state, nowMs),
  };
}
