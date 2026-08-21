// ─── Resource Stock + Flow lens (Wave A1) ───────────────────────────────────
// docs/VISUAL_AAA_2026-08.md §A1.3. Stellaris's top bar is readable because
// every resource shows a STOCK and a FLOW (+X/month), and hovering the flow
// itemizes where it comes from. This module is that flow.
//
// ── The drift rule ────────────────────────────────────────────────────────
// The brief for this wave is explicit: the numbers MUST come from the real
// engine, never from a lookalike re-derivation that could disagree with the
// tick. This file honors that in three ways, in order of preference:
//
//   1. CALL THE ENGINE'S OWN LENS where one exists.
//        consumption  → `deriveSupplySummary` (consumption.ts)
//        production   → `getBuildingConsumptionEfficiency` × the recipe, the
//                       exact `output = base × phaseIn × eff` line the
//                       monthly pass runs
//        boiloff/     → `projectStorageIntegrityLosses` (consumption.ts) —
//        overflow       extracted in this wave so the month-end pass and this
//                       projection are literally the same function
//        decay        → `applyResourceDecay` (economic-sinks.ts), run on a
//                       copy and diffed, per-pool exactly as the tick does
//   2. SHARE THE FORMULA where the engine had it inline. The two mining
//      multiplier chains and the two mining side-bonuses below are now THE
//      definition sites — game-engine.ts imports them instead of keeping its
//      own copies, so a change to either propagates to both surfaces.
//   3. OMIT AND SAY SO where neither is possible. Everything omitted is
//      enumerated in `OMITTED_CONTRIBUTIONS` and surfaced verbatim in the
//      ResourceBar tooltip, so a player is never shown a total that quietly
//      pretends to be complete.
//
// ── What is deliberately NOT modelled ────────────────────────────────────
// See `OMITTED_CONTRIBUTIONS`. In short: anything event-driven (contract
// deliveries, freight transfers, market orders, refining jobs), anything
// random (survey discoveries, hazard losses), and anything on a multi-month
// cadence (interstellar shipments). These are one-off transfers, not rates;
// amortizing them into a per-month figure would be exactly the guess the
// brief forbids.
//
// Pure, synchronous, allocation-light. Every input is already on GameState
// (extraction pressure, consumption efficiency and demand pools all arrive
// via the existing sync). Memoize at the call site.

import type { GameState } from './types';
import { MINING_PRODUCTION, RESOURCE_MAP, type ResourceDefinition, type ResourceId } from './resources';
import { SHIP_MAP, getMiningMultiplier as getShipLocationMiningMultiplier } from './ships';
import { BUILDING_MAP } from './buildings';
import { isBuildingOperational } from './mothball';
import { getExtractionPressureMultiplier } from './extraction-pressure';
import { getShipMiningRateMultiplier } from './modules';
import {
  deriveSupplySummary,
  getConsumptionPhaseInFraction,
  getBuildingConsumptionEfficiency,
  projectStorageIntegrityLosses,
  DEFAULT_CONSUMPTION_STATE,
  hasRecipe,
} from './consumption';
import { applyResourceDecay } from './economic-sinks';
import { getWorkforceBonuses } from './workforce';
import { getEffectiveWorkforceForBonuses, mergeProgramWorkforceBonuses } from './programs';
import { getResearchBonuses } from './research-tree';
import { DEFAULT_LEGACY, getLegacyBonuses } from './legacy-system';
import { getActiveEraModifiers } from './corporate-eras';
import { getTierBonuses } from './corporation-tiers';
import { getMegastructureBonuses } from './personal-megastructures';
import { getReputationBonuses } from './reputation';
import { computeCommanderBonuses } from './commanders';
import { getSpecializationBonuses } from './specializations';
import { getVictoryBonuses } from './victory-conditions';
import { clampAllianceBonuses, clampMentorshipBonuses, clampMegaProjectBonuses } from './server-effects';
import { getActiveBoostMultiplier } from './speed-boosts';
import type { ActiveBoost } from './speed-boosts';
import { gameDateToMonthIndex } from './demand-pools';

// ─── Shared mining formulas (definition site; game-engine.ts imports these) ──

/** Every term feeding the building-mining output multiplier. The tick holds
 *  all of these as locals already and passes them straight through; the flow
 *  lens rebuilds them from GameState via `collectBuildingMiningTerms`. */
export interface BuildingMiningTerms {
  wfMiningOutput: number;
  resMiningOutputBonus: number;
  legacyMiningMult: number;
  eraMiningMult: number;
  tierMiningBonus: number;
  megaMiningMult: number;
  repMiningMult: number;
  commanderMiningMult: number;
  specMiningOutput: number;
  victoryMiningMult: number;
  allianceMiningBonus: number;
  mentorshipMiningBonus: number;
  coopMegaMiningBonus: number;
  boostMiningMult: number;
}

/** The "Wave B" sub-product, capped at 2.0 — kept as its own function
 *  because the cap must apply to this group only, before the outer chain. */
export function waveBMiningMultiplier(t: BuildingMiningTerms): number {
  return Math.min(2.0,
    (1 + t.specMiningOutput)
    * t.victoryMiningMult
    * (1 + t.allianceMiningBonus)
    * (1 + t.mentorshipMiningBonus)
    * (1 + t.coopMegaMiningBonus)
    * t.boostMiningMult,
  );
}

/** THE building-mining output multiplier. Single definition site, shared by
 *  the tick (game-engine.ts §0c) and this lens. */
export function buildingMiningMultiplier(t: BuildingMiningTerms): number {
  return (1 + t.wfMiningOutput)
    * (1 + t.resMiningOutputBonus)
    * t.legacyMiningMult
    * t.eraMiningMult
    * (1 + t.tierMiningBonus)
    * (t.megaMiningMult || 1)
    * t.repMiningMult
    * t.commanderMiningMult
    * waveBMiningMultiplier(t);
}

/** Ship mining runs a deliberately shorter chain than building mining (no
 *  era/reputation/commander/megastructure terms — see game-engine.ts's ship
 *  pass). Kept separate rather than unified so this lens reproduces the
 *  engine as it is, not as it arguably should be. */
export interface ShipMiningTerms {
  wfMiningOutput: number;
  legacyMiningMult: number;
  tierMiningBonus: number;
  specMiningOutput: number;
  victoryMiningMult: number;
  allianceMiningBonus: number;
}

export function shipMiningMultiplier(t: ShipMiningTerms): number {
  return (1 + t.wfMiningOutput)
    * t.legacyMiningMult
    * (1 + t.tierMiningBonus)
    * (1 + t.specMiningOutput)
    * t.victoryMiningMult
    * (1 + t.allianceMiningBonus);
}

/** Freighter/tanker logistics bonus for mining at a location: +10% per idle
 *  transport/tanker parked there, capped at +50%. */
export function freighterLogisticsBonus(ships: GameState['ships'], locationId: string): number {
  let count = 0;
  for (const ship of (ships || [])) {
    if (!ship.isBuilt || ship.status !== 'idle') continue;
    if (ship.currentLocation !== locationId) continue;
    const sDef = SHIP_MAP.get(ship.definitionId);
    if (sDef?.role === 'transport' || sDef?.role === 'tanker') count++;
  }
  return Math.min(count * 0.10, 0.50);
}

/** Survey-probe mining bonus for one (location, resource), time-limited. */
export function surveyProbeMiningBonus(
  miningBonuses: GameState['miningBonuses'],
  locationId: string,
  resource: string,
  currentTotalMonths: number,
): number {
  return (miningBonuses || [])
    .filter(b => b.locationId === locationId && b.resourceId === resource && b.expiresAtMonth > currentTotalMonths)
    .reduce((sum, b) => sum + b.bonusPct / 100, 0);
}

// ─── Term assembly from a GameState (used by the lens, not by the tick) ─────

/** Rebuild the tick's mining-multiplier inputs from state. Every call here
 *  mirrors game-engine.ts's own call with the same arguments, so the terms
 *  are the same values the tick computes. */
export function collectBuildingMiningTerms(state: GameState): BuildingMiningTerms {
  const wfBonuses = mergeProgramWorkforceBonuses(getWorkforceBonuses(getEffectiveWorkforceForBonuses(state)), state);
  const resBonuses = getResearchBonuses(state.completedResearch, state.repeatableResearchLevels);
  const legacyBonuses = getLegacyBonuses(state.legacy || DEFAULT_LEGACY);
  const eraModifiers = getActiveEraModifiers(state);
  const tierBonuses = getTierBonuses(state.corporationTier || 1);
  const megaBonuses = getMegastructureBonuses(state.megastructures || []);
  const repBonuses = getReputationBonuses(state.reputation || 0);
  const commanderBonuses = computeCommanderBonuses(state.hiredCommanders, state);
  const specBonuses = getSpecializationBonuses(state.specialization || { primary: null, secondary: null, respecCount: 0 });
  const victoryBonuses = getVictoryBonuses(state.earnedVictories || []);
  const allianceB = clampAllianceBonuses(state.allianceBonuses);
  const mentorshipB = clampMentorshipBonuses(state.mentorshipBonuses);
  const coopMegaB = clampMegaProjectBonuses(state.megaProjectBonuses);
  const activeBoosts: ActiveBoost[] = (state.activeBoosts || []) as ActiveBoost[];

  return {
    wfMiningOutput: wfBonuses.miningOutput,
    resMiningOutputBonus: resBonuses.miningOutputBonus,
    legacyMiningMult: legacyBonuses.miningMultiplier,
    eraMiningMult: eraModifiers.miningMultiplier,
    tierMiningBonus: tierBonuses.miningBonus,
    megaMiningMult: megaBonuses.miningMultiplier || 1,
    repMiningMult: repBonuses.miningMultiplier,
    commanderMiningMult: commanderBonuses.miningMultiplier,
    specMiningOutput: specBonuses.miningOutput,
    victoryMiningMult: victoryBonuses.miningMultiplier,
    allianceMiningBonus: allianceB?.miningBonus || 0,
    mentorshipMiningBonus: mentorshipB?.miningBonus || 0,
    coopMegaMiningBonus: coopMegaB?.miningBonus || 0,
    boostMiningMult: getActiveBoostMultiplier(activeBoosts, 'mining'),
  };
}

export function collectShipMiningTerms(state: GameState): ShipMiningTerms {
  const wfBonuses = mergeProgramWorkforceBonuses(getWorkforceBonuses(getEffectiveWorkforceForBonuses(state)), state);
  const legacyBonuses = getLegacyBonuses(state.legacy || DEFAULT_LEGACY);
  const tierBonuses = getTierBonuses(state.corporationTier || 1);
  const specBonuses = getSpecializationBonuses(state.specialization || { primary: null, secondary: null, respecCount: 0 });
  const victoryBonuses = getVictoryBonuses(state.earnedVictories || []);
  const allianceB = clampAllianceBonuses(state.allianceBonuses);
  return {
    wfMiningOutput: wfBonuses.miningOutput,
    legacyMiningMult: legacyBonuses.miningMultiplier,
    tierMiningBonus: tierBonuses.miningBonus,
    specMiningOutput: specBonuses.miningOutput,
    victoryMiningMult: victoryBonuses.miningMultiplier,
    allianceMiningBonus: allianceB?.miningBonus || 0,
  };
}

// ─── Report shape ───────────────────────────────────────────────────────────

export type FlowKind =
  | 'mining'
  | 'ship_mining'
  | 'megastructure'
  | 'production'
  | 'consumption'
  | 'decay'
  | 'storage';

/** Human-readable name for each contribution, used verbatim in the tooltip. */
export const FLOW_KIND_LABEL: Record<FlowKind, string> = {
  mining: 'Extraction',
  ship_mining: 'Fleet mining',
  megastructure: 'Megastructure output',
  production: 'Industry output',
  consumption: 'Industry demand',
  decay: 'Spoilage',
  storage: 'Boil-off & overflow',
};

export interface FlowContribution {
  kind: FlowKind;
  label: string;
  /** Signed units per game month. Positive = inflow, negative = outflow. */
  perMonth: number;
}

export interface ResourceFlow {
  resourceId: string;
  name: string;
  category: ResourceDefinition['category'] | 'unknown';
  /** Stock across ALL pools (global + every location inventory). */
  stock: number;
  /** Sum of positive contributions, units/month. */
  inflow: number;
  /** Sum of negative contributions as a positive magnitude, units/month. */
  outflow: number;
  /** inflow − outflow, units/month. */
  net: number;
  contributions: FlowContribution[];
  /** Months until the stock is exhausted at the current net, when net < 0.
   *  `null` when net >= 0 (nothing is running out). */
  depletionMonths: number | null;
  /** Any building currently reporting a shortfall on this resource. */
  short: boolean;
}

export interface ResourceFlowReport {
  flows: ResourceFlow[];
  byId: Record<string, ResourceFlow>;
  /** Verbatim disclosure list — render this in the tooltip. */
  omitted: readonly string[];
  monthIndex: number;
}

/** Contributions the engine applies to resource stocks that this lens does
 *  NOT model, and why. Shown to the player rather than silently dropped. */
export const OMITTED_CONTRIBUTIONS: readonly string[] = [
  'Contract deliveries, freight transfers and market orders — one-off transfers, not monthly rates.',
  'Refining and crafting jobs — driven by a real-time timer on one active job.',
  'Survey discoveries and hazard losses — random, resolved when they happen.',
  'Interstellar trade-route shipments — they arrive on a multi-month cycle.',
];

// ─── The lens ───────────────────────────────────────────────────────────────

function addContribution(
  map: Map<string, FlowContribution[]>,
  resourceId: string,
  kind: FlowKind,
  perMonth: number,
) {
  if (!Number.isFinite(perMonth) || Math.abs(perMonth) < 1e-6) return;
  const list = map.get(resourceId) || [];
  const existing = list.find(c => c.kind === kind);
  if (existing) existing.perMonth += perMonth;
  else list.push({ kind, label: FLOW_KIND_LABEL[kind], perMonth });
  map.set(resourceId, list);
}

/** Total stock of one resource across the global pool and every location
 *  inventory — the same summation `deriveSupplySummary` performs. */
function totalStock(state: GameState, resourceId: string): number {
  let stock = (state.resources || {})[resourceId] || 0;
  for (const inv of Object.values(state.locationInventories || {})) {
    stock += inv?.[resourceId] || 0;
  }
  return stock;
}

/**
 * Per-resource stock and net monthly flow, with an itemized breakdown.
 *
 * @param state      live GameState
 * @param monthIndex WORLD month index — the same counter the consumption
 *   engine advances on (`consumptionState.lastProcessedMonth`, sourced from
 *   the server global date). Defaults to that cursor.
 *
 * CAREFUL: the codebase carries THREE different month counters and they are
 * not interchangeable. Getting this wrong silently mis-expires things.
 *   1. world month  — `globalDate.totalMonths`; drives consumption phase-in
 *      and the storage-decay ramp. This is the `monthIndex` parameter.
 *   2. absolute game month — `gameDate.year * 12 + gameDate.month`; the tick
 *      compares survey-probe `expiresAtMonth` against this. Derived below as
 *      `gameMonth` — passing the world index here would make every probe
 *      bonus read as expired.
 *   3. campaign-relative month — `gameDateToMonthIndex()`, offset from
 *      GAME_START_YEAR; used by the demand pools. Not needed here.
 */
export function computeResourceFlows(state: GameState, monthIndex?: number): ResourceFlowReport {
  const month = monthIndex ?? state.consumptionState?.lastProcessedMonth ?? gameDateToMonthIndex(state.gameDate);
  // Convention #2 — see the warning above.
  const gameMonth = state.gameDate.year * 12 + state.gameDate.month;
  const contributions = new Map<string, FlowContribution[]>();
  const shortSet = new Set<string>();

  // ── 1. Building extraction (game-engine.ts §6) ──────────────────────────
  const miningMult = buildingMiningMultiplier(collectBuildingMiningTerms(state));
  const consumptionEff = state.consumptionState?.efficiency || {};
  for (const svc of (state.activeServices || [])) {
    const production = MINING_PRODUCTION[svc.definitionId];
    if (!production) continue;
    const ownerBld = svc.linkedBuildingIds?.length
      ? state.buildings.find(b => svc.linkedBuildingIds!.includes(b.instanceId))
      : undefined;
    // Mothballed / reactivating / decommissioning rigs produce nothing.
    if (ownerBld && !isBuildingOperational(ownerBld)) continue;
    const svcSupplyEff = svc.linkedBuildingIds?.length
      ? (consumptionEff[svc.linkedBuildingIds[0]] ?? 1)
      : 1;
    const freighterBonus = freighterLogisticsBonus(state.ships, svc.locationId);
    for (const { resource, amountPerMonth } of production) {
      const locationBonus = surveyProbeMiningBonus(state.miningBonuses, svc.locationId, resource, gameMonth);
      const extractionPressure = getExtractionPressureMultiplier(state.extractionPressure, svc.locationId, resource);
      addContribution(contributions, resource, 'mining',
        amountPerMonth * miningMult * extractionPressure * (1 + freighterBonus) * (1 + locationBonus) * svcSupplyEff);
    }
  }

  // ── 2. Fleet mining (game-engine.ts ship pass) ──────────────────────────
  const shipMult = shipMiningMultiplier(collectShipMiningTerms(state));
  for (const ship of (state.ships || [])) {
    if (!ship.isBuilt || ship.status !== 'mining' || !ship.miningOperation) continue;
    const shipDef = SHIP_MAP.get(ship.definitionId);
    if (!shipDef?.miningRate) continue;
    const resId = ship.miningOperation.resourceId;
    const locId = ship.miningOperation.locationId || ship.currentLocation;
    const locationMult = getShipLocationMiningMultiplier(locId) || 1;
    const moduleMult = getShipMiningRateMultiplier(state, ship.instanceId);
    const hullDamageFactor = Math.max(0.25, 1 - 0.75 * (ship.hullDamagePct || 0));
    const pressure = getExtractionPressureMultiplier(state.extractionPressure, locId, resId);
    addContribution(contributions, resId, 'ship_mining',
      shipDef.miningRate * 0.5 * shipMult * moduleMult * locationMult * hullDamageFactor * pressure);
  }

  // ── 3. Megastructure passive output (game-engine.ts §6b) ────────────────
  const passives = getMegastructureBonuses(state.megastructures || []).passiveResources;
  if (passives) {
    for (const [resId, amt] of Object.entries(passives)) {
      if (!amt || amt <= 0) continue;
      addContribution(contributions, resId, 'megastructure', amt);
    }
  }

  // ── 4. Industry demand (consumption.ts — the engine's own lens) ─────────
  // NOTE: `perMonth` here is effective REQUIRED demand (phase-in + research
  // reduction applied), which is what a shortfall-aware player wants to see.
  // A starved building actually draws less than this; the gap is exactly the
  // shortfall the `short` flag reports.
  for (const line of deriveSupplySummary(state, month)) {
    addContribution(contributions, line.resourceId, 'consumption', -line.perMonth);
    if (line.short) shortSet.add(line.resourceId);
  }

  // ── 5. Industry output (the engine's `base × phaseIn × efficiency` line) ─
  const cs = state.consumptionState || DEFAULT_CONSUMPTION_STATE;
  const phaseIn = getConsumptionPhaseInFraction(cs, month);
  for (const bld of state.buildings) {
    if (!bld.isComplete || !isBuildingOperational(bld)) continue;
    const def = BUILDING_MAP.get(bld.definitionId);
    if (!def || !hasRecipe(def) || !def.producesPerMonth) continue;
    const eff = getBuildingConsumptionEfficiency(state, bld.instanceId);
    for (const [resId, base] of Object.entries(def.producesPerMonth)) {
      addContribution(contributions, resId, 'production', base * phaseIn * eff);
    }
  }

  // ── 6. Spoilage (economic-sinks.applyResourceDecay, run per pool) ───────
  // The engine decays the global pool and each location inventory
  // SEPARATELY, and its per-resource loss has a `max(1, …)` floor — so
  // decaying the summed total would understate it. Mirror the pool split.
  const decayPools: Record<string, number>[] = [
    { ...(state.resources || {}) },
    ...Object.values(state.locationInventories || {}).map(inv => ({ ...(inv || {}) })),
  ];
  for (const pool of decayPools) {
    const after = applyResourceDecay(pool);
    for (const [resId, before] of Object.entries(pool)) {
      const lost = before - (after[resId] || 0);
      if (lost > 0) addContribution(contributions, resId, 'decay', -lost);
    }
  }

  // ── 7. Boil-off + over-capacity spoilage (shared with the month-end pass) ─
  const integrity = projectStorageIntegrityLosses(
    state.buildings,
    cs,
    state.resources || {},
    (state.locationInventories || {}) as Record<string, Record<string, number>>,
    month,
  );
  for (const [resId, lost] of Object.entries(integrity.losses)) {
    if (lost > 0) addContribution(contributions, resId, 'storage', -lost);
  }

  // ── Assemble ────────────────────────────────────────────────────────────
  // Every resource the player HOLDS also gets a row, even at zero flow, so a
  // stockpile never silently vanishes from the bar.
  const ids = new Set<string>(contributions.keys());
  for (const [resId, qty] of Object.entries(state.resources || {})) {
    if (qty > 0) ids.add(resId);
  }
  for (const inv of Object.values(state.locationInventories || {})) {
    for (const [resId, qty] of Object.entries(inv || {})) {
      if (qty > 0) ids.add(resId);
    }
  }

  const flows: ResourceFlow[] = [];
  for (const resourceId of Array.from(ids)) {
    const list = (contributions.get(resourceId) || [])
      .filter(c => Math.abs(c.perMonth) >= 0.005)
      .sort((a, b) => Math.abs(b.perMonth) - Math.abs(a.perMonth));
    let inflow = 0;
    let outflow = 0;
    for (const c of list) {
      if (c.perMonth > 0) inflow += c.perMonth;
      else outflow += -c.perMonth;
    }
    const net = inflow - outflow;
    const stock = totalStock(state, resourceId);
    const def = RESOURCE_MAP.get(resourceId as ResourceId);
    flows.push({
      resourceId,
      name: def?.name || resourceId.replace(/_/g, ' '),
      category: def?.category || 'unknown',
      stock: Math.round(stock * 100) / 100,
      inflow: Math.round(inflow * 100) / 100,
      outflow: Math.round(outflow * 100) / 100,
      net: Math.round(net * 100) / 100,
      contributions: list.map(c => ({ ...c, perMonth: Math.round(c.perMonth * 100) / 100 })),
      depletionMonths: net < -1e-6 && stock > 0 ? Math.round((stock / -net) * 10) / 10 : null,
      short: shortSet.has(resourceId),
    });
  }

  // Ordering: things running out first (soonest depletion), then biggest
  // stock. That makes the bar's leading slots the ones that need a decision.
  flows.sort((a, b) => {
    const ad = a.depletionMonths ?? Infinity;
    const bd = b.depletionMonths ?? Infinity;
    if (ad !== bd) return ad - bd;
    return b.stock - a.stock;
  });

  const byId: Record<string, ResourceFlow> = {};
  for (const f of flows) byId[f.resourceId] = f;

  return { flows, byId, omitted: OMITTED_CONTRIBUTIONS, monthIndex: month };
}

/** Formatting helper shared by the bar and its tooltip. Always emits an
 *  explicit sign, so the figure carries its direction in TEXT and never
 *  depends on colour (CLAUDE.md colourblind canon). */
export function formatFlow(perMonth: number, digits = 1): string {
  const rounded = Number(perMonth.toFixed(digits));
  if (rounded === 0) return '0';
  const abs = Math.abs(rounded);
  const body = abs >= 1000
    ? `${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
    : abs >= 100 ? abs.toFixed(0) : abs.toFixed(digits);
  return `${rounded > 0 ? '+' : '−'}${body}`;
}

/** Direction token for a flow figure. Shape AND sign are both meaningful, so
 *  the trend is legible with colour removed entirely. */
export function flowDirection(perMonth: number): 'up' | 'down' | 'flat' {
  if (perMonth > 1e-6) return 'up';
  if (perMonth < -1e-6) return 'down';
  return 'flat';
}
