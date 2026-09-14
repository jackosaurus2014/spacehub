/**
 * The sync money ceiling's INPUT: `computeServerMonthlyGrossDetailed`.
 *
 * docs/SECURITY_AUDIT_2026-09.md "Monthly gross — verified terms"
 * (2026-09-13). The plausibility ceiling's allowance rail is derived from
 * this number, so it has exactly two obligations and they pull against each
 * other:
 *
 *   1. NEVER BELOW THE TRUTH. It is an upper bound on legitimate earning
 *      power. If it under-reports, the sync rejects honest income and the
 *      player watches money vanish — the failure this subsystem has already
 *      produced twice (2026-09-12 Frontier/one-shot payouts, 2026-09-13 flat
 *      $500/ms rail). `conservatism` below is the proof: for a spread of
 *      real GameStates, the estimate is >= what the engine's own tick pays
 *      that state over a full game-month.
 *   2. AS TIGHT AS THE ROW ALLOWS. Every term the persisted GameProfile can
 *      answer must be read, not assumed at its cap. `tightening` below pins
 *      which terms are verified and that they actually move the number.
 */
import type { GameState } from '../types';
import { getNewGameState } from '../save-load';
import { getGlobalGameDate } from '../server-time';
import { processTick } from '../game-engine';
import { TICKS_PER_GAME_MONTH } from '../constants';
import { SERVICE_MAP } from '../services';
import { BUILDING_MAP } from '../buildings';
import { COMMANDER_DEFS } from '../commanders';
import { MEGASTRUCTURES } from '../personal-megastructures';
import { RESEARCH } from '../research-tree';
import { checkCorporationTier } from '../corporation-tiers';
import {
  buildServerFlowState,
  computeServerMonthlyGrossDetailed,
  MAX_SERVICE_REVENUE_CLIENT_MULT,
  MAX_LEGACY_REVENUE_MULT,
  MAX_COMMANDER_REVENUE_MULT,
  MAX_MEGASTRUCTURE_REVENUE_MULT,
  MAX_RESEARCH_SERVICE_REVENUE_MULT,
  MAX_TIER_REVENUE_MULT,
  MAX_ERA_REVENUE_MULT,
  TIER_CEILING_SLACK,
  serverCorporationTierBound,
  serverTierRevenueMult,
  serverEraRevenueMult,
  serverCommanderRevenueMult,
  serverMegastructureRevenueMult,
  serverLegacyRevenueMult,
  serverResearchServiceRevenueMult,
  mothballedRevenueFraction,
  readStashedCommanderIds,
  // 2026-09-14 mining valuation (docs/SECURITY_AUDIT_2026-09.md "C-2
  // follow-up 5").
  MAX_BUILDING_MINING_CLIENT_MULT,
  MAX_MONEY_PATH_MINING_CLIENT_MULT,
  MAX_FREIGHTER_LOGISTICS_MINING_MULT,
  MAX_MONEY_PATH_SURVEY_PROBE_MULT,
  MINING_SPOT_HEADROOM_MULT,
  miningCeilingUnitPrice,
  miningOutputNameplateValue,
} from '../resource-plausibility';
import { MINING_PRODUCTION, RESOURCE_MAP } from '../resources';
import { PRICE_BAND_HIGH } from '../price-band';
import { MONEY_HEADROOM_MULT } from '../ledger-reconcile';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();

// ─── The persisted row, exactly as sync/route.ts writes it ──────────────────
// buildingsData / shipsData / activeServicesData / completedResearchList /
// workforceData (+ the `_commanders` stash) / totalEarned / createdAt /
// hqLocationId. Nothing the client sends that the row does NOT carry may
// reach the estimate — that is the whole point of going through this shape.

function persistedRowOf(state: GameState) {
  return {
    prevResources: state.resources || {},
    prevBuildingsData: (state.buildings || []).map(b => ({
      instanceId: b.instanceId, definitionId: b.definitionId, locationId: b.locationId,
      isComplete: b.isComplete, upgradeLevel: b.upgradeLevel || 0,
      markLevel: (b as { markLevel?: number }).markLevel ?? 1,
      status: (b as { status?: string }).status,
      damagePct: (b as { damagePct?: number }).damagePct,
    })),
    prevShipsData: state.ships || [],
    // sync-validation.ts SyncService — three fields, no revenueMultiplier.
    prevActiveServices: (state.activeServices || []).map(s => ({
      definitionId: s.definitionId, locationId: s.locationId,
      linkedBuildingIds: s.linkedBuildingIds || [],
    })),
    prevResearch: state.completedResearch || [],
  };
}

function grossFor(state: GameState, elapsedMs?: number, marketPrices?: Record<string, number> | null) {
  const workforceData: Record<string, unknown> = {
    ...(state.workforce || {}),
    _commanders: (state.hiredCommanders || []).map(h => h.definitionId),
  };
  return computeServerMonthlyGrossDetailed(buildServerFlowState(persistedRowOf(state)), {
    workforceData,
    totalEarned: state.totalEarned,
    createdAtMs: state.createdAt,
    nowMs: NOW,
    hqStage: (state.headquarters?.stage ?? 'earth_ops') as 'earth_ops',
    elapsedMs,
    marketPrices,
  });
}

// ─── Mining price fixtures (2026-09-14) ─────────────────────────────────────
// The engine prices mined output at `state.marketSnapshot` (mining-pricing.ts).
// The ESTIMATE prices it at `inputs.marketPrices` — the live MarketResource
// rows the sync route now reads. For the conservatism proof the two must be
// the same market, so both are built from the same per-resource figure.

/** Every resource any mining_output service produces. */
const MINED_RESOURCES: string[] = Array.from(new Set(
  Object.values(MINING_PRODUCTION).flatMap(rows => rows.map(r => r.resource as string)),
));

const basePriceOf = (r: string): number =>
  (RESOURCE_MAP.get(r as never) as { baseMarketPrice?: number } | undefined)?.baseMarketPrice || 0;

/** A price map over every mined resource at `mult x base`, band-clamped the
 *  way `buildMarketSnapshot` clamps the real rows. */
function priceMap(mult: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of MINED_RESOURCES) {
    const rd = RESOURCE_MAP.get(r as never) as { baseMarketPrice?: number; maxPrice?: number; minPrice?: number } | undefined;
    const base = rd?.baseMarketPrice || 0;
    const hi = Math.min(rd?.maxPrice || 0, Math.round(base * PRICE_BAND_HIGH));
    const lo = Math.max(rd?.minPrice || 0, Math.round(base * 0.3));
    out[r] = Math.max(lo, Math.min(hi, Math.round(base * mult)));
  }
  return out;
}

/** The snapshot shape the tick reads, from the same map. */
function snapshotFrom(prices: Record<string, number>) {
  const base: Record<string, number> = {};
  for (const r of MINED_RESOURCES) base[r] = basePriceOf(r);
  return { prices: { ...prices }, base, asOf: NOW };
}

/** What the engine's own tick pays this state, scaled to one game month.
 *  `totalEarned` only ever moves up on revenue, so its delta is the gross —
 *  the same quantity the ceiling bounds (costs are never netted). */
function engineMonthlyGross(state: GameState): number {
  const out = processTick({ ...state, lastTickAt: NOW });
  return (out.totalEarned - state.totalEarned) * TICKS_PER_GAME_MONTH;
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

const g = getGlobalGameDate();
const date = { year: g.year, month: g.month };

function building(instanceId: string, definitionId: string, locationId: string, extra: Record<string, unknown> = {}) {
  return {
    instanceId, definitionId, locationId,
    buildStartDate: date, completionDate: date, isComplete: true,
    startedAtMs: NOW - 10_000_000, realDurationSeconds: 1,
    ...extra,
  } as unknown as NonNullable<GameState['buildings']>[number];
}

function service(definitionId: string, locationId: string, linkedBuildingIds: string[] = []) {
  return { definitionId, locationId, linkedBuildingIds, startDate: date, revenueMultiplier: 1 } as unknown as GameState['activeServices'][number];
}

/** The building definition that enables a service (the tick needs the pair). */
function enablerFor(svcId: string): string | undefined {
  for (const [id, def] of Array.from(BUILDING_MAP.entries())) {
    if ((def as { enabledServices?: string[] }).enabledServices?.includes(svcId)) return id;
  }
  return undefined;
}

/** N services (and their enabling buildings) at one location. */
function fleet(svcIds: string[], locationId = 'earth_surface') {
  const buildings: GameState['buildings'] = [];
  const services: GameState['activeServices'] = [];
  svcIds.forEach((sid, i) => {
    const bd = enablerFor(sid);
    if (!bd) return;
    buildings.push(building(`b${i}`, bd, locationId));
    services.push(service(sid, locationId, [`b${i}`]));
  });
  return { buildings, services };
}

function baseState(extra: Partial<GameState> = {}): GameState {
  return {
    ...getNewGameState(),
    money: 100_000_000,
    resources: { rocket_fuel: 5_000, water: 5_000, oxygen: 5_000, methane: 5_000, electronics: 500 },
    gameDate: date,
    lastTickAt: NOW,
    createdAt: NOW - 400 * DAY,
    frontierStatus: 'none',
    workforce: { engineers: 4, scientists: 2, miners: 2, operators: 4 },
    ...extra,
  } as GameState;
}

const NON_MINING = Array.from(SERVICE_MAP.values()).filter(s => s.type !== 'mining_output');

/** 1. A brand-new solo corporation inside the Protected Frontier. */
function fixtureFrontierSolo(): GameState {
  const { buildings, services } = fleet(['svc_launch_small']);
  return baseState({
    buildings, activeServices: services,
    totalEarned: 0,
    createdAt: NOW - DAY,
    frontierStatus: 'active',
    frontierEnteredAtMs: NOW - DAY,
    workforce: { engineers: 1, scientists: 0, miners: 0, operators: 1 },
  });
}

/** 2. A veteran mid-size corporation: 14 services, research, upgrades, Marks. */
function fixtureMidSize(): GameState {
  const ids = NON_MINING.slice(0, 14).map(s => s.id);
  const { buildings, services } = fleet(ids);
  const upgraded = buildings.map((b, i) => ({ ...b, upgradeLevel: i % 3, markLevel: (i % 3) + 1 }));
  return baseState({
    buildings: upgraded, activeServices: services,
    totalEarned: 20_000_000_000,
    corporationTier: 4,
    completedResearch: RESEARCH.slice(0, 25).map(r => r.id),
    createdAt: NOW - 365 * DAY,
  });
}

/** 3. A mining corporation — the price-linked revenue path. Rigs sit at the
 *  location their definition requires, with reactors so the power ratio is
 *  1.0 (an unpowered rig earns nothing and the fixture would prove nothing). */
function fixtureMiner(): GameState {
  const lunar = fleet(['svc_mining_lunar_basic', 'svc_mining_lunar'], 'lunar_surface');
  const belt = fleet(['svc_mining_asteroid', 'svc_mining_ceres'], 'asteroid_belt');
  const power = [
    building('p1', 'nuclear_reactor_lunar', 'lunar_surface'),
    building('p2', 'nuclear_reactor_lunar', 'lunar_surface'),
    building('p3', 'nuclear_reactor_asteroid', 'asteroid_belt'),
    building('p4', 'nuclear_reactor_asteroid', 'asteroid_belt'),
  ];
  return baseState({
    buildings: [
      ...lunar.buildings.map((b, i) => ({ ...b, instanceId: `L${i}` })),
      ...belt.buildings.map((b, i) => ({ ...b, instanceId: `A${i}` })),
      ...power,
    ],
    activeServices: [
      ...lunar.services.map((s, i) => ({ ...s, linkedBuildingIds: [`L${i}`] })),
      ...belt.services.map((s, i) => ({ ...s, linkedBuildingIds: [`A${i}`] })),
    ],
    totalEarned: 5_000_000_000,
    corporationTier: 3,
    unlockedLocations: ['earth_surface', 'leo', 'lunar_surface', 'asteroid_belt'],
    workforce: { engineers: 8, scientists: 2, miners: 16, operators: 8 },
  });
}

/**
 * 4. The adversarial fixture: every client-only multiplier the engine
 * supports, simultaneously, on a row whose `totalEarned` actually supports
 * the gated ones. This is the state the estimate is MOST at risk of
 * under-reporting, and the reason the conservatism check exists.
 */
function fixtureEverythingMaxed(): GameState {
  const ids = NON_MINING.slice(0, 14).map(s => s.id);
  const { buildings, services } = fleet(ids);
  const upgraded = buildings.map(b => ({ ...b, upgradeLevel: 2, markLevel: 3 }));
  const totalEarned = 1e14; // past every tier gate and every megastructure gate
  return baseState({
    buildings: upgraded, activeServices: services,
    totalEarned,
    corporationTier: 7,
    reputation: 1_000_000,
    createdAt: NOW - 2000 * DAY,
    completedResearch: RESEARCH.map(r => r.id),
    workforce: { engineers: 40, scientists: 25, miners: 25, operators: 40, pilots: 10, negotiators: 10, securitys: 10, medics: 10, morale: 1.15, trainingLevel: 1, fatigue: 0 },
    hiredCommanders: COMMANDER_DEFS.slice(0, 9).map(d => ({
      definitionId: d.id, hiredAtMs: NOW - 300 * DAY, xp: 100, level: 5,
      assignment: null, assignedSinceMs: NOW - 300 * DAY,
    })),
    megastructures: MEGASTRUCTURES.map(d => ({
      definitionId: d.id, currentPhase: d.phases.length, completedPhases: d.phases.length,
      totalPhases: d.phases.length, status: 'complete' as const, startedAtMs: NOW - 500 * DAY,
      completedAtMs: NOW - 100 * DAY,
    })),
    legacy: {
      completedMilestones: [], stretchLevels: {},
      trackers: { totalResourcesMined: 0, totalContractsCompleted: 0, totalShipsBuilt: 0, totalBuildingsCompleted: 0 },
      legacyPower: 0, displayTier: 'Legend' as const,
    },
    activeEffects: [
      { eventId: 'e1', label: 'Boom', expiresAtMonth: date.year * 12 + date.month + 12, revenueMultiplier: 1.3, costMultiplier: 1 },
      { eventId: 'e2', label: 'Boom2', expiresAtMonth: date.year * 12 + date.month + 12, revenueMultiplier: 1.2, costMultiplier: 1 },
      { eventId: 'e3', label: 'Boom3', expiresAtMonth: date.year * 12 + date.month + 12, revenueMultiplier: 1.15, costMultiplier: 1 },
    ],
    corporateDoctrine: { activePolicies: { disclosure: 'proprietary' }, lastSwitchedMonth: {} },
    corporateEras: { currentEra: { charterId: 'expansion_era', startedAtMonth: 0, progress: 0 }, completedEras: [] },
    allianceBonuses: { revenueBonus: 0.5, miningBonus: 0.5, researchBonus: 0.5, buildSpeedBonus: 0.5 },
    mentorshipBonuses: { revenueBonus: 0.2, miningBonus: 0.2, researchBonus: 0.2 },
    megaProjectBonuses: { revenueBonus: 0.2, miningBonus: 0.2, researchBonus: 0.2, launchCostReduction: 0 },
    specialization: { primary: { path: 'launch_provider', tier: 5 }, secondary: null, respecCount: 0 },
  } as unknown as Partial<GameState>);
}

/** 5. A mothballed operation — the tick pays it nothing. */
function fixtureMothballed(): GameState {
  const s = fixtureMidSize();
  return {
    ...s,
    buildings: (s.buildings || []).map(b => ({ ...b, status: 'mothballed' as const })),
  };
}

// ─── Mining-heavy fixtures (2026-09-14) ─────────────────────────────────────
// The mining_output valuation is the largest single term in the gross, and it
// was the one term the 2026-09-13 pass left at a documented cap. These are the
// states that prove the tightened version still cannot under-report.

const REACTOR_FOR: Record<string, string> = {
  lunar_surface: 'nuclear_reactor_lunar',
  asteroid_belt: 'nuclear_reactor_asteroid',
  mars_surface: 'nuclear_reactor_mars_surface',
  saturn_system: 'nuclear_reactor_saturn',
  jupiter_system: 'nuclear_reactor_jupiter',
};

/** Rigs (and their enabling buildings) at their required locations, with
 *  enough reactors that the power ratio is 1.0 — an unpowered rig earns
 *  nothing and the fixture would prove nothing. */
function rigs(specs: [string, string][], prefix = 'M') {
  const buildings: GameState['buildings'] = [];
  const services: GameState['activeServices'] = [];
  specs.forEach(([sid, loc], i) => {
    const bd = enablerFor(sid);
    if (!bd) return;
    buildings.push(building(`${prefix}${i}`, bd, loc));
    services.push(service(sid, loc, [`${prefix}${i}`]));
  });
  Array.from(new Set(specs.map(([, loc]) => loc))).forEach((loc, i) => {
    const rid = REACTOR_FOR[loc];
    if (!rid) return;
    for (const k of ['a', 'b', 'c', 'd']) buildings.push(building(`${prefix}R${i}${k}`, rid, loc));
  });
  return { buildings, services };
}

const SIX_RIG_SPEC: [string, string][] = [
  ['svc_mining_lunar_basic', 'lunar_surface'], ['svc_mining_lunar', 'lunar_surface'],
  ['svc_mining_asteroid', 'asteroid_belt'], ['svc_mining_ceres', 'asteroid_belt'],
  ['svc_mining_mars', 'mars_surface'], ['svc_mining_titan', 'saturn_system'],
];

/** 6. Six rigs, 90 days old, $2B earned — the audit's headline mining row. */
function fixtureSixRigMiner(): GameState {
  const { buildings, services } = rigs(SIX_RIG_SPEC);
  return baseState({
    buildings, activeServices: services,
    totalEarned: 2_000_000_000, corporationTier: 3,
    createdAt: NOW - 90 * DAY,
    unlockedLocations: ['earth_surface', 'leo', 'lunar_surface', 'asteroid_belt', 'mars_surface', 'saturn_system'],
    workforce: { engineers: 12, scientists: 4, miners: 24, operators: 12 },
    marketSnapshot: snapshotFrom(priceMap(1)),
  } as unknown as Partial<GameState>);
}

/** 7. The same rigs plus a REFINING operation — Titan Chemical Works
 *  (`methane_refinery` / `svc_titan_chemicals`, a `fabrication_output`
 *  service). Mining Phase C's ore refining is credited server-side through
 *  the mining API's ledger rows, which the money ceiling adds AFTER the clamp;
 *  the refining income that rides the client tick, and therefore has to fit
 *  under this estimate, is the refinery service. Mixed-type row: it proves the
 *  mining term did not tighten at the expense of its neighbours. */
function fixtureMiningPlusRefining(): GameState {
  const { buildings, services } = rigs(SIX_RIG_SPEC);
  const refineryDef = enablerFor('svc_titan_chemicals');
  const extra: GameState['buildings'] = [];
  const extraSvc: GameState['activeServices'] = [];
  if (refineryDef) {
    extra.push(building('REF0', refineryDef, 'saturn_system'));
    extraSvc.push(service('svc_titan_chemicals', 'saturn_system', ['REF0']));
  }
  return baseState({
    buildings: [...buildings, ...extra], activeServices: [...services, ...extraSvc],
    totalEarned: 20_000_000_000, corporationTier: 4,
    createdAt: NOW - 365 * DAY,
    completedResearch: RESEARCH.slice(0, 25).map(r => r.id),
    unlockedLocations: ['earth_surface', 'leo', 'lunar_surface', 'asteroid_belt', 'mars_surface', 'saturn_system'],
    workforce: { engineers: 20, scientists: 8, miners: 30, operators: 20 },
    marketSnapshot: snapshotFrom(priceMap(1)),
  } as unknown as Partial<GameState>);
}

/**
 * 8. The adversarial MINING maximum: every client-only mining multiplier the
 * engine supports live at once, spot pinned at the top of the anti-cornering
 * band, stacked survey probes at the registry maximum, and a freighter wing
 * parked idle at every rig (the +50% logistics term the flow lens measures and
 * the nameplate valuation cannot). This is the state the mining valuation is
 * MOST at risk of under-reporting.
 */
function fixtureMiningAdversarial(): GameState {
  const spec: [string, string][] = [
    ...SIX_RIG_SPEC,
    ['svc_mining_europa', 'jupiter_system'], ['svc_mining_ganymede', 'jupiter_system'],
    ['svc_mining_callisto', 'jupiter_system'],
  ];
  const { buildings, services } = rigs(spec);
  const locations = Array.from(new Set(spec.map(([, loc]) => loc)));
  const ships = locations.flatMap((loc, li) => [0, 1, 2, 3, 4].map(i => ({
    instanceId: `F${li}_${i}`, definitionId: 'freighter', isBuilt: true,
    status: 'idle', currentLocation: loc, hullIntegrity: 1,
  }))) as unknown as NonNullable<GameState['ships']>;
  // Survey probes: the registry's largest anomaly is +50%; two concurrent
  // probes per (location, resource) is MAX_MONEY_PATH_SURVEY_PROBE_MULT.
  const miningBonuses = spec.flatMap(([sid, loc]) =>
    (MINING_PRODUCTION[sid] || []).flatMap(({ resource }) => [0, 1].map(k => ({
      locationId: loc, resourceId: resource, bonusPct: 50,
      expiresAtMonth: date.year * 12 + date.month + 60 + k,
    }))),
  ) as unknown as GameState['miningBonuses'];
  return baseState({
    buildings, activeServices: services, ships, miningBonuses,
    totalEarned: 1e14, corporationTier: 7, reputation: 1_000_000,
    createdAt: NOW - 2000 * DAY,
    completedResearch: RESEARCH.map(r => r.id),
    unlockedLocations: ['earth_surface', 'leo', 'lunar_surface', 'asteroid_belt', 'mars_surface', 'saturn_system', 'jupiter_system'],
    workforce: { engineers: 60, scientists: 40, miners: 80, operators: 60, pilots: 20, negotiators: 10, securitys: 10, medics: 10, morale: 1.15, trainingLevel: 1, fatigue: 0 },
    hiredCommanders: COMMANDER_DEFS.slice(0, 9).map(d => ({
      definitionId: d.id, hiredAtMs: NOW - 300 * DAY, xp: 100, level: 5,
      assignment: null, assignedSinceMs: NOW - 300 * DAY,
    })),
    megastructures: MEGASTRUCTURES.map(d => ({
      definitionId: d.id, currentPhase: d.phases.length, completedPhases: d.phases.length,
      totalPhases: d.phases.length, status: 'complete' as const, startedAtMs: NOW - 500 * DAY,
      completedAtMs: NOW - 100 * DAY,
    })),
    activeEffects: [
      { eventId: 'e1', label: 'Boom', expiresAtMonth: date.year * 12 + date.month + 12, revenueMultiplier: 1.3, costMultiplier: 1 },
      { eventId: 'e2', label: 'Boom2', expiresAtMonth: date.year * 12 + date.month + 12, revenueMultiplier: 1.2, costMultiplier: 1 },
      { eventId: 'e3', label: 'Boom3', expiresAtMonth: date.year * 12 + date.month + 12, revenueMultiplier: 1.15, costMultiplier: 1 },
    ],
    corporateDoctrine: { activePolicies: { disclosure: 'proprietary' }, lastSwitchedMonth: {} },
    corporateEras: { currentEra: { charterId: 'expansion_era', startedAtMonth: 0, progress: 0 }, completedEras: [] },
    allianceBonuses: { revenueBonus: 0.5, miningBonus: 0.5, researchBonus: 0.5, buildSpeedBonus: 0.5 },
    mentorshipBonuses: { revenueBonus: 0.2, miningBonus: 0.2, researchBonus: 0.2 },
    megaProjectBonuses: { revenueBonus: 0.2, miningBonus: 0.2, researchBonus: 0.2, launchCostReduction: 0 },
    specialization: { primary: { path: 'asteroid_mining', tier: 5 }, secondary: null, respecCount: 0 },
    // Spot pinned at the band ceiling — the most expensive ore the game can
    // ever sell, and the price the estimate must still cover.
    marketSnapshot: snapshotFrom(priceMap(PRICE_BAND_HIGH)),
  } as unknown as Partial<GameState>);
}

const FIXTURES: { name: string; state: GameState }[] = [
  { name: 'frontier solo (day 1, x2 revenue)', state: fixtureFrontierSolo() },
  { name: 'veteran mid-size (14 services, 25 techs, Marks)', state: fixtureMidSize() },
  { name: 'asteroid miner (price-linked revenue)', state: fixtureMiner() },
  { name: 'every client multiplier at once (tier 7, $100T earned)', state: fixtureEverythingMaxed() },
  { name: 'fully mothballed operation', state: fixtureMothballed() },
  { name: 'six-rig miner (mining_output valuation)', state: fixtureSixRigMiner() },
  { name: 'mining + refining (Titan Chemical Works)', state: fixtureMiningPlusRefining() },
  { name: 'adversarial mining maximum (spot at band ceiling)', state: fixtureMiningAdversarial() },
];

/** The live-price map each fixture's own market implies — what the sync route
 *  would read out of MarketResource for that world. */
function livePricesFor(state: GameState): Record<string, number> | null {
  const snap = (state as { marketSnapshot?: { prices?: Record<string, number> } }).marketSnapshot;
  return snap?.prices ? { ...snap.prices } : null;
}

// ─── 1. Conservatism: the estimate is never below the engine ────────────────

describe('server monthly gross — never below what the tick actually pays', () => {
  for (const { name, state } of FIXTURES) {
    it(`${name}: gross >= the engine's own monthly revenue for the same state`, () => {
      const engine = engineMonthlyGross(state);
      // A 30-day window is the widest the clamp ever grants, and the widest
      // window the mothball term is pro-rated against.
      const estimate = grossFor(state, 30 * DAY).gross;
      expect(estimate).toBeGreaterThanOrEqual(Math.floor(engine));
    });
  }

  it('holds for every sync window the clamp can see, not just the wide one', () => {
    for (const { name, state } of FIXTURES) {
      const engine = engineMonthlyGross(state);
      for (const elapsedMs of [undefined, 10_000, 65_000, 6 * 3600_000, 30 * DAY]) {
        const estimate = grossFor(state, elapsedMs).gross;
        expect([name, elapsedMs, estimate >= Math.floor(engine)]).toEqual([name, elapsedMs, true]);
      }
    }
  });

  it('a mothballed operation earns nothing from the engine, so zeroing it cannot under-report', () => {
    const s = fixtureMothballed();
    expect(engineMonthlyGross(s)).toBe(0);
    // Inside the reactivation spin-up the services are worth exactly zero;
    // only the un-gated allowances (subsidiaries) remain in the gross.
    const short = grossFor(s, 65_000);
    expect(short.services).toBe(0);
    // Over a long window they can come back online — and are billed again.
    const long = grossFor(s, 30 * DAY);
    expect(long.services).toBeGreaterThan(0);
    expect(long.services).toBeLessThan(grossFor(fixtureMidSize(), 30 * DAY).services);
  });

  it('mothballedRevenueFraction is 0 only while reactivation is impossible', () => {
    expect(mothballedRevenueFraction('mothballed', undefined)).toBe(1);   // unknown window
    expect(mothballedRevenueFraction('active', 0.001)).toBe(1);
    expect(mothballedRevenueFraction('reactivating', 0.001)).toBe(1);     // may flip any moment
    expect(mothballedRevenueFraction('mothballed', 0.001)).toBe(0);
    expect(mothballedRevenueFraction('mothballed', 1)).toBe(0);           // exactly the spin-up
    expect(mothballedRevenueFraction('mothballed', 120)).toBeCloseTo(119 / 120, 6);
  });
});

// ─── 1b. The mining_output valuation (2026-09-14) ───────────────────────────
// docs/SECURITY_AUDIT_2026-09.md "C-2 follow-up 5". Until 2026-09-14 mined
// output was valued at the resource's authored `maxPrice` (~10x base) — a
// price NO surface in the game can pay, since every spot is band-clamped to
// `base x PRICE_BAND_HIGH`. It is now the live `MarketResource.currentPrice`
// the sync route supplies, plus MINING_SPOT_HEADROOM_MULT, bounded by that
// band; and the band maximum when no live price is available.
//
// The obligation is unchanged and it is the strict one: the estimate must
// still be >= what `processTick` pays the same state over a game month, with
// the SAME market both sides.

const MINING_FIXTURES: { name: string; state: GameState }[] = [
  { name: 'six-rig miner, spot at base', state: fixtureSixRigMiner() },
  { name: 'mining + refining, spot at base', state: fixtureMiningPlusRefining() },
  { name: 'adversarial mining maximum, spot at the band ceiling', state: fixtureMiningAdversarial() },
];

describe('mining valuation — live prices never under-report', () => {
  for (const { name, state } of MINING_FIXTURES) {
    it(`${name}: gross >= the engine's own monthly revenue at the same prices`, () => {
      const engine = engineMonthlyGross(state);
      expect(engine).toBeGreaterThan(0); // the fixture must actually earn
      const estimate = grossFor(state, 30 * DAY, livePricesFor(state)).gross;
      expect(estimate).toBeGreaterThanOrEqual(Math.floor(engine));
    });
  }

  it('holds for every sync window, and for a market that moved under the client', () => {
    for (const { name, state } of MINING_FIXTURES) {
      const engine = engineMonthlyGross(state);
      for (const elapsedMs of [undefined, 10_000, 65_000, 6 * 3600_000, 30 * DAY]) {
        // (a) the live read agrees with the client's snapshot;
        // (b) no live read at all (the DB read failed) -> band maximum;
        // (c) the live read is at the BOTTOM of the band while the client's
        //     snapshot sat at the top — the worst case for a price that moved
        //     between the snapshot the tick used and the row this reads.
        for (const prices of [livePricesFor(state), null, priceMap(0.3)]) {
          const estimate = grossFor(state, elapsedMs, prices).gross;
          expect([name, elapsedMs, estimate >= Math.floor(engine)]).toEqual([name, elapsedMs, true]);
        }
      }
    }
  });

  it('a live spot prices mined output far below the authored maxPrice it replaced', () => {
    for (const r of ['iron', 'lunar_water', 'helium3', 'platinum_group']) {
      const rd = RESOURCE_MAP.get(r as never) as { baseMarketPrice?: number; maxPrice?: number };
      const base = rd?.baseMarketPrice || 0;
      const oldPrice = Math.max(rd?.maxPrice || 0, base);            // the pre-2026-09-14 figure
      const bandMax = miningCeilingUnitPrice(r);                      // no live price
      const atBase = miningCeilingUnitPrice(r, base);                 // live spot at base
      expect(bandMax).toBeLessThan(oldPrice);
      expect(bandMax).toBeCloseTo(Math.min(rd?.maxPrice || 0, base * PRICE_BAND_HIGH), 6);
      expect(atBase).toBeCloseTo(base * MINING_SPOT_HEADROOM_MULT, 6);
      expect(atBase).toBeLessThan(bandMax);
      // Never below the live spot itself, and never below base.
      expect(miningCeilingUnitPrice(r, base * 0.3)).toBeGreaterThanOrEqual(base);
      expect(miningCeilingUnitPrice(r, oldPrice)).toBeGreaterThanOrEqual(oldPrice);
      // A missing / absurd live figure degrades to the band, never to zero.
      expect(miningCeilingUnitPrice(r, 0)).toBe(bandMax);
      expect(miningCeilingUnitPrice(r, Number.NaN)).toBe(bandMax);
      expect(miningCeilingUnitPrice(r, -1)).toBe(bandMax);
    }
    // An unknown slug prices at 0 rather than throwing.
    expect(miningCeilingUnitPrice('not_a_resource')).toBe(0);
  });

  it('MONEY_HEADROOM_MULT x MINING_SPOT_HEADROOM_MULT covers the whole price band', () => {
    // The identity the headroom constant is chosen for: the ceiling's
    // effective per-unit price allowance is at least the band MAXIMUM for any
    // resource trading at or above base, so no price move the game permits can
    // make the money clamp reject honest mining income.
    expect(MONEY_HEADROOM_MULT * MINING_SPOT_HEADROOM_MULT).toBeGreaterThanOrEqual(PRICE_BAND_HIGH);
  });

  it('the money path owns its own mining multiplier — the shadow clamp constant is untouched', () => {
    // MAX_BUILDING_MINING_CLIENT_MULT is the RESOURCE clamp's constant and
    // must not move when the money path is re-tuned.
    expect(MAX_BUILDING_MINING_CLIENT_MULT).not.toBe(MAX_MONEY_PATH_MINING_CLIENT_MULT);
    // The money path is the WIDER of the two, never the narrower: it values
    // nameplate units instead of the flow lens, so the two terms the lens
    // measures for real have to be allowances here.
    expect(MAX_MONEY_PATH_MINING_CLIENT_MULT).toBeGreaterThan(MAX_BUILDING_MINING_CLIENT_MULT);
    expect(MAX_FREIGHTER_LOGISTICS_MINING_MULT).toBeGreaterThan(1);
    expect(MAX_MONEY_PATH_SURVEY_PROBE_MULT).toBeGreaterThan(1);
    const report = grossFor(fixtureSixRigMiner(), 65_000, livePricesFor(fixtureSixRigMiner()));
    expect(report.miningPriceSource).toBe('live');
    expect(grossFor(fixtureSixRigMiner(), 65_000, null).miningPriceSource).toBe('band-max');
    expect(grossFor(fixtureMidSize(), 65_000, null).miningPriceSource).toBe('none');
    expect(report.miningClientMultiplierBound).toBeGreaterThan(0);
    expect(report.miningClientMultiplierBound).toBeLessThanOrEqual(MAX_MONEY_PATH_MINING_CLIENT_MULT + 1e-9);
  });

  it('the valuation actually fell — live prices are ~6.7x tighter per unit than maxPrice', () => {
    const svc = 'svc_mining_asteroid';
    const prices = priceMap(1);
    const atSpot = miningOutputNameplateValue(svc, prices);
    const atBand = miningOutputNameplateValue(svc, null);
    // Feeding the OLD per-unit figure back in reproduces the old valuation
    // exactly (the `max(live, ...)` floor), so this is a true before/after.
    const oldPrices: Record<string, number> = {};
    for (const r of MINED_RESOURCES) {
      const rd = RESOURCE_MAP.get(r as never) as { baseMarketPrice?: number; maxPrice?: number };
      oldPrices[r] = Math.max(rd?.maxPrice || 0, rd?.baseMarketPrice || 0);
    }
    const before = miningOutputNameplateValue(svc, oldPrices);
    expect(before / atSpot).toBeGreaterThan(6);
    expect(before / atBand).toBeGreaterThan(3);
  });
});

// ─── 2. Tightening: each verified term reads the row ────────────────────────

describe('server monthly gross — verified terms replace the caps', () => {
  it('the corporation tier comes from ledger-backed totalEarned, with one rung of slack', () => {
    expect(serverCorporationTierBound(0)).toBe(1 + TIER_CEILING_SLACK);
    expect(serverCorporationTierBound(5_000_000_000)).toBe(3 + TIER_CEILING_SLACK);
    // Never below the tier the profile actually plays at.
    for (const earned of [0, 1e8, 5e8, 5e9, 5e10, 5e11, 5e12, 5e13, 1e15]) {
      const s = { ...fixtureMidSize(), totalEarned: earned };
      expect(serverCorporationTierBound(earned)).toBeGreaterThanOrEqual(checkCorporationTier(s));
    }
    expect(serverTierRevenueMult(1)).toBe(1);
    expect(serverTierRevenueMult(7)).toBeCloseTo(MAX_TIER_REVENUE_MULT, 10);
  });

  it('an era is impossible below tier 3, so its term is exactly 1 there', () => {
    expect(serverEraRevenueMult(1)).toBe(1);
    expect(serverEraRevenueMult(2)).toBe(1);
    expect(serverEraRevenueMult(3)).toBe(MAX_ERA_REVENUE_MULT);
  });

  it('the commander term reads the stashed roster, and the registry bound is the real one', () => {
    // The old ASSUMED 2.0 was not an upper bound at all: six legendary
    // commander-class hires clear it before traits.
    expect(MAX_COMMANDER_REVENUE_MULT).toBeGreaterThan(2.0);
    // An empty roster is still allowed one un-synced hire of head-room.
    const empty = serverCommanderRevenueMult([], 7);
    expect(empty).toBeGreaterThan(1);
    expect(empty).toBeLessThan(MAX_COMMANDER_REVENUE_MULT);
    // No stash at all → the tier's hire-cap bound.
    expect(serverCommanderRevenueMult(null, 7)).toBe(MAX_COMMANDER_REVENUE_MULT);
    expect(serverCommanderRevenueMult(null, 1)).toBeLessThan(serverCommanderRevenueMult(null, 7));
    // The maxed fixture's roster is read back off the row.
    const maxed = fixtureEverythingMaxed();
    expect(readStashedCommanderIds({ _commanders: (maxed.hiredCommanders || []).map(h => h.definitionId) }))
      .toHaveLength(9);
  });

  it('megastructure multipliers are gated on the totalEarned their prerequisites demand', () => {
    expect(serverMegastructureRevenueMult(0)).toBe(1);
    expect(serverMegastructureRevenueMult(24_000_000_000)).toBe(1); // under every minMoney gate
    expect(serverMegastructureRevenueMult(1e15)).toBeCloseTo(MAX_MEGASTRUCTURE_REVENUE_MULT, 6);
    // This is the single largest term in the all-caps product.
    expect(MAX_MEGASTRUCTURE_REVENUE_MULT).toBeGreaterThan(10);
  });

  it('legacy revenue is bounded by totalEarned and profile age, not taken whole', () => {
    const young = serverLegacyRevenueMult(0, 3 * DAY, 2);
    const old = serverLegacyRevenueMult(1e13, 3650 * DAY, 7);
    expect(young).toBeLessThan(2);
    expect(old).toBeGreaterThan(young);
    expect(old).toBeLessThanOrEqual(MAX_LEGACY_REVENUE_MULT);
    // No age on the row → no bound on retired leaders → the flat cap.
    expect(serverLegacyRevenueMult(1e13, undefined)).toBe(MAX_LEGACY_REVENUE_MULT);
  });

  it('the research bucket cap grows with tier — clamping at +50% under-reported a tier-2+ corp', () => {
    expect(MAX_RESEARCH_SERVICE_REVENUE_MULT).toBeGreaterThan(1.9);
    const all = RESEARCH.map(r => r.id);
    const t1 = serverResearchServiceRevenueMult(all, 1);
    const t7 = serverResearchServiceRevenueMult(all, 7);
    expect(t1).toBeCloseTo(1.5, 2);
    expect(t7).toBeGreaterThan(t1);
    expect(t7).toBeLessThanOrEqual(MAX_RESEARCH_SERVICE_REVENUE_MULT);
    expect(serverResearchServiceRevenueMult([], 1)).toBeGreaterThanOrEqual(1);
  });

  it('the live multiplier bound is far below the all-caps product for real profiles', () => {
    const solo = grossFor(fixtureFrontierSolo(), 65_000);
    const mid = grossFor(fixtureMidSize(), 65_000);
    const maxed = grossFor(fixtureEverythingMaxed(), 65_000);
    expect(solo.clientMultiplierBound).toBeLessThan(MAX_SERVICE_REVENUE_CLIENT_MULT / 50);
    expect(mid.clientMultiplierBound).toBeLessThan(MAX_SERVICE_REVENUE_CLIENT_MULT / 20);
    // The maxed profile earns most of it back — as it should.
    expect(maxed.clientMultiplierBound).toBeGreaterThan(mid.clientMultiplierBound * 10);
    // Nothing ever exceeds the all-caps product.
    for (const r of [solo, mid, maxed]) {
      expect(r.clientMultiplierBound).toBeLessThanOrEqual(MAX_SERVICE_REVENUE_CLIENT_MULT + 1e-9);
      expect(Object.keys(r.multiplierTerms.verified).sort()).toEqual(
        ['commanders', 'era', 'legacy', 'megastructures', 'tier'],
      );
      expect(Object.keys(r.multiplierTerms.allowance).sort()).toEqual(
        ['demandScarcity', 'doctrine', 'morale', 'randomEvents', 'reputation', 'returningCommander', 'waveB'],
      );
    }
  });

  it('a forged money figure buys no extra allowance — the gross never reads money', () => {
    const honest = fixtureMidSize();
    const forged = { ...honest, money: 9e15 };
    expect(grossFor(forged, 65_000).gross).toBe(grossFor(honest, 65_000).gross);
  });
});

// Diagnostic: prints the margin between the engine and the estimate for each
// fixture. Kept as a test so a future change that silently collapses the
// margin toward 1.0x (or blows it up again) shows in CI output.
describe('server monthly gross — margin report', () => {
  it('reports engine vs estimate for every fixture', () => {
    const rows = FIXTURES.map(({ name, state }) => {
      const engine = engineMonthlyGross(state);
      const r = grossFor(state, 30 * DAY);
      return { name, engine: Math.round(engine), estimate: r.gross, ratio: engine > 0 ? r.gross / engine : Infinity, mult: +r.clientMultiplierBound.toFixed(1), tier: r.serverTier };
    });
     
    console.log(JSON.stringify(rows, null, 2));
    for (const r of rows) expect(r.estimate).toBeGreaterThanOrEqual(r.engine);
  });
});
