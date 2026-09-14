/**
 * @jest-environment node
 *
 * Balance Pass 10 (docs/BALANCE.md "Pass 10 — early-game pace (2026-09-12)").
 * Founder decision: a fresh corporation earned +$4.9M per 6-hour game-month,
 * so a $100M tier-1 research was five real days of income. Three levers:
 *
 *  1. every tier-1 research and tier-1 building costs HALF (data edited in
 *     place — no runtime multiplier);
 *  2. service revenue is DOUBLED while the Protected Frontier is active, and
 *     the doubling decays along the existing 14-day graduation glide (never
 *     a cliff) — applied on the live tick, away catch-up, every P&L surface
 *     AND mirrored on the server's sync money ceiling from createdAt;
 *  3. the starter launch pad no longer runs dry: archetypes that start with
 *     a consuming building get STARTER_SUPPLY_MONTHS of its inputs and the
 *     building starts on a standing market order — on the client kit and the
 *     server kit alike; the first-hour guide teaches the starter contract at
 *     step 2 (the early-game income engine).
 */
import type { GameState } from '../types';
import { getNewGameState } from '../save-load';
import { getGlobalGameDate } from '../server-time';
import { processTick } from '../game-engine';
import { calculateAwayOperations } from '../away-operations';
import { computeEconomyReport } from '../economy-report';
import { TICKS_PER_GAME_MONTH } from '../constants';
import { RESEARCH } from '../research-tree';
import { BUILDINGS, BUILDING_MAP } from '../buildings';
import { ARCHETYPE_MAP, applyArchetype, starterSupplyFor, STARTER_SUPPLY_MONTHS } from '../archetypes';
import { buildFirstSyncKit } from '../sync-validation';
import { buildServerFlowState, computeServerMonthlyGrossDetailed } from '../resource-plausibility';
import { buildSourcingRows } from '../sourcing';
import { ONBOARDING_STEPS, ONBOARDING_STEP_MAP, isOnboardingStepComplete } from '../onboarding';
import {
  FRONTIER_REVENUE_MULTIPLIER,
  FRONTIER_DURATION_MS,
  FRONTIER_LATEST_GRADUATION_MS,
  GRADUATION_GLIDE_MS,
  frontierRevenueMultiplierFor,
  getFrontierRevenueMultiplier,
  frontierRevenueMultiplierUpperBound,
} from '../frontier';

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

// ─── 1. Cost tables ─────────────────────────────────────────────────────────

describe('Pass 10 — tier-1 costs are half their pre-pass figures (data, not a multiplier)', () => {
  const T1_RESEARCH_PRE_PASS_10: Record<string, number> = {
    reusable_boosters: 200_000_000,
    launch_abort_systems: 150_000_000,
    launch_site_optimization: 100_000_000,
    modular_spacecraft: 150_000_000,
    rad_hard_processors: 200_000_000,
    resource_prospecting: 150_000_000,
    orbital_assembly: 300_000_000,
    triple_junction: 60_000_000,
    space_burial: 30_000_000,
    zero_g_fitness: 40_000_000,
  };
  const T1_BUILDING_PRE_PASS_10: Record<string, number> = {
    launch_pad_small: 50_000_000,
    ground_station: 30_000_000,
    mission_control: 80_000_000,
    sat_telecom: 15_000_000,
    sat_sensor: 25_000_000,
    sat_telecom_geo: 150_000_000,
    space_station_small: 500_000_000,
    research_institute_earth: 250_000_000,
    solar_farm_orbital: 100_000_000,
    mining_lunar_basic: 250_000_000,
    fabrication_earth: 350_000_000,
  };

  it('every tier-1 research node costs exactly half its pre-Pass-10 figure; durations untouched', () => {
    const byId = new Map(RESEARCH.map(r => [r.id, r]));
    for (const [id, pre] of Object.entries(T1_RESEARCH_PRE_PASS_10)) {
      const def = byId.get(id)!;
      expect(def.tier).toBe(1);
      expect(def.baseCostMoney).toBe(pre / 2);
    }
    const t1 = RESEARCH.filter(r => r.tier === 1);
    expect(t1.length).toBe(39);
    // The whole tier: $3.87B before, $1.935B after (sim-50yr §1 research schedule).
    const total = t1.reduce((s, r) => s + r.baseCostMoney, 0);
    expect(total).toBe(1_935_000_000);
    expect(Math.max(...t1.map(r => r.baseCostMoney))).toBe(150_000_000);
    expect(Math.min(...t1.map(r => r.baseCostMoney))).toBe(15_000_000);
    // Durations were NOT touched (10-minute tier-1 clock).
    expect(byId.get('reusable_boosters')!.realResearchSeconds).toBe(600);
    expect(byId.get('reusable_boosters')!.baseTimeMonths).toBe(12);
    // Tier 2+ untouched.
    expect(byId.get('lidar_systems')?.baseCostMoney).toBe(400_000_000);
  });

  it('every tier-1 building costs exactly half its pre-Pass-10 figure; nothing else moved', () => {
    for (const [id, pre] of Object.entries(T1_BUILDING_PRE_PASS_10)) {
      const def = BUILDING_MAP.get(id)!;
      expect(def.tier).toBe(1);
      expect(def.baseCost).toBe(pre / 2);
    }
    expect(BUILDINGS.filter(b => b.tier === 1).length).toBe(Object.keys(T1_BUILDING_PRE_PASS_10).length);
    // Maintenance / build time untouched.
    expect(BUILDING_MAP.get('launch_pad_small')!.maintenanceCostPerMonth).toBe(500_000);
    expect(BUILDING_MAP.get('ground_station')!.buildTimeMonths).toBe(4);
    // A tier-2 neighbour is untouched.
    expect(BUILDING_MAP.get('launch_pad_medium')!.baseCost).toBe(200_000_000);
  });

  it('tooltips that quote a tier-1 sticker price quote the new one', () => {
    expect(BUILDING_MAP.get('ground_station')!.tooltip).toContain('$15M');
    expect(BUILDING_MAP.get('ground_station')!.tooltip).not.toContain('$30M');
    expect(BUILDING_MAP.get('launch_pad_small')!.tooltip).toContain('$25M');
    expect(BUILDING_MAP.get('sat_telecom')!.tooltip).toContain('$7.5M');
    expect(BUILDING_MAP.get('sat_telecom_geo')!.tooltip).toContain('$75M');
    expect(BUILDING_MAP.get('mining_lunar_basic')!.tooltip).toContain('$125M');
    expect(BUILDING_MAP.get('solar_farm_orbital')!.tooltip).toContain('$50M');
  });
});

// ─── 2. Frontier revenue multiplier ─────────────────────────────────────────

function frontierState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...getNewGameState(),
    createdAt: NOW - DAY,
    frontierStatus: 'active',
    frontierEnteredAtMs: NOW - DAY,
    ...overrides,
  } as GameState;
}

describe('Pass 10 — Frontier service-revenue multiplier', () => {
  it('is 2.0 while the Frontier is active', () => {
    expect(FRONTIER_REVENUE_MULTIPLIER).toBe(2.0);
    expect(getFrontierRevenueMultiplier(frontierState(), NOW)).toBe(2.0);
  });

  it('decays along the graduation glide: 2.0 at graduation, 1.5 half-way, 1.0 at the end', () => {
    const grad = (agoMs: number) => frontierState({
      frontierStatus: 'graduated', frontierGraduatedAtMs: NOW - agoMs,
    });
    expect(getFrontierRevenueMultiplier(grad(0), NOW)).toBe(2.0);
    expect(getFrontierRevenueMultiplier(grad(GRADUATION_GLIDE_MS / 2), NOW)).toBeCloseTo(1.5, 10);
    expect(getFrontierRevenueMultiplier(grad(GRADUATION_GLIDE_MS * 0.75), NOW)).toBeCloseTo(1.25, 10);
    expect(getFrontierRevenueMultiplier(grad(GRADUATION_GLIDE_MS), NOW)).toBe(1);
    expect(getFrontierRevenueMultiplier(grad(GRADUATION_GLIDE_MS * 10), NOW)).toBe(1);
  });

  it('is exactly 1.0 for veterans, "none" saves, and a timed-out Frontier', () => {
    expect(getFrontierRevenueMultiplier(frontierState({ frontierStatus: 'none' }), NOW)).toBe(1);
    expect(getFrontierRevenueMultiplier(frontierState({ frontierStatus: 'graduated', frontierGraduatedAtMs: undefined }), NOW)).toBe(1);
    // Frontier timer expired but never formally graduated: isInFrontier is
    // false and there is no graduation timestamp → 1.0 (no free ride).
    expect(getFrontierRevenueMultiplier(frontierState({ frontierEnteredAtMs: NOW - FRONTIER_DURATION_MS - 1 }), NOW)).toBe(1);
  });

  it('pure helper: never below 1.0, never above the constant, clamps bad fractions', () => {
    expect(frontierRevenueMultiplierFor(true, 0)).toBe(2);
    expect(frontierRevenueMultiplierFor(false, 1)).toBe(2);
    expect(frontierRevenueMultiplierFor(false, 0)).toBe(1);
    expect(frontierRevenueMultiplierFor(false, -3)).toBe(1);
    expect(frontierRevenueMultiplierFor(false, 7)).toBe(2);
    expect(frontierRevenueMultiplierFor(false, Number.NaN)).toBe(1);
  });

  it('the live tick pays exactly 2x the same tick with the Frontier off (mid-month, no lumps)', () => {
    const g = getGlobalGameDate();
    const base = frontierState({
      money: 100_000_000, // under the $500M Frontier hard cap
      resources: { rocket_fuel: 200 }, // no supply brownout when the Frontier consumption exemption is off (small: inventory counts toward the hard cap)
      gameDate: { year: g.year, month: g.month },
      lastTickAt: Date.now(),
      workforce: { engineers: 1, scientists: 0, miners: 0, operators: 1 },
      activeServices: [{ definitionId: 'svc_launch_small', locationId: 'earth_surface', linkedBuildingIds: [], startDate: { year: g.year, month: g.month }, revenueMultiplier: 1 }],
      buildings: [{ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', buildStartDate: { year: g.year, month: g.month }, completionDate: { year: g.year, month: g.month }, isComplete: true, startedAtMs: Date.now() - 10_000_000, realDurationSeconds: 1 }],
      createdAt: Date.now() - DAY,
      frontierEnteredAtMs: Date.now() - DAY,
    });
    const off = { ...base, frontierStatus: 'none' } as GameState;
    const onOut = processTick(base);
    const offOut = processTick(off);
    const onEarned = onOut.totalEarned - base.totalEarned;
    const offEarned = offOut.totalEarned - off.totalEarned;
    expect(offEarned).toBeGreaterThan(0);
    // ±1 for the per-tick rounding (Math.round on the revenue product).
    expect(Math.abs(onEarned - 2 * offEarned)).toBeLessThanOrEqual(1);
    // The P&L surface agrees: the report's revenue multiplier breakdown
    // carries the same term, and its combined product includes it.
    const rep = computeEconomyReport(base, Date.now());
    expect(rep.revenueMultipliers.frontier).toBe(2);
    expect(rep.revenueMultipliers.combined).toBeCloseTo(
      rep.revenueMultipliers.workforce * rep.revenueMultipliers.research * rep.revenueMultipliers.legacy
      * rep.revenueMultipliers.era * rep.revenueMultipliers.corporationTier * rep.revenueMultipliers.megastructure
      * rep.revenueMultipliers.reputation * rep.revenueMultipliers.commander * rep.revenueMultipliers.event * 2, 10);
    expect(computeEconomyReport(off, Date.now()).revenueMultipliers.frontier).toBe(1);
  });

  it('away catch-up pays the same doubling (away-parity)', () => {
    const g = getGlobalGameDate();
    const now = Date.now();
    const mk = (status: GameState['frontierStatus']) => frontierState({
      money: 100_000_000, // under the $500M Frontier hard cap
      resources: { rocket_fuel: 200 }, // no supply brownout when the Frontier consumption exemption is off (small: inventory counts toward the hard cap)
      gameDate: { year: g.year, month: g.month },
      lastTickAt: now - 2 * 3_600_000,
      lastSaveAt: now - 2 * 3_600_000,
      workforce: { engineers: 1, scientists: 0, miners: 0, operators: 1 },
      activeServices: [{ definitionId: 'svc_launch_small', locationId: 'earth_surface', linkedBuildingIds: [], startDate: { year: g.year, month: g.month }, revenueMultiplier: 1 }],
      buildings: [{ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', buildStartDate: { year: g.year, month: g.month }, completionDate: { year: g.year, month: g.month }, isComplete: true, startedAtMs: now - 10_000_000, realDurationSeconds: 1 }],
      createdAt: now - DAY,
      frontierEnteredAtMs: now - DAY,
      frontierStatus: status,
    } as Partial<GameState>);
    const onBase = mk('active');
    const offBase = mk('none');
    const on = calculateAwayOperations(onBase, now);
    const off = calculateAwayOperations(offBase, now);
    expect(on).not.toBeNull();
    expect(off).not.toBeNull();
    const onEarned = on!.state.totalEarned - onBase.totalEarned;
    const offEarned = off!.state.totalEarned - offBase.totalEarned;
    expect(offEarned).toBeGreaterThan(0);
    expect(onEarned / offEarned).toBeGreaterThan(1.9);
    expect(onEarned / offEarned).toBeLessThan(2.1);
  });
});

// ─── 3. Server mirror (the sync money ceiling) ──────────────────────────────

describe('Pass 10 — the server sync ceiling mirrors the Frontier doubling', () => {
  it('upper bound from createdAt: 2.0 through the latest possible graduation, then the same glide, then 1.0', () => {
    const created = NOW - DAY;
    expect(frontierRevenueMultiplierUpperBound(created, NOW)).toBe(2);
    expect(frontierRevenueMultiplierUpperBound(created, created + FRONTIER_DURATION_MS)).toBe(2); // day 30: still possibly active (grace)
    expect(frontierRevenueMultiplierUpperBound(created, created + FRONTIER_LATEST_GRADUATION_MS - 1)).toBe(2);
    expect(frontierRevenueMultiplierUpperBound(created, created + FRONTIER_LATEST_GRADUATION_MS + GRADUATION_GLIDE_MS / 2)).toBeCloseTo(1.5, 10);
    expect(frontierRevenueMultiplierUpperBound(created, created + FRONTIER_LATEST_GRADUATION_MS + GRADUATION_GLIDE_MS)).toBe(1);
    expect(frontierRevenueMultiplierUpperBound(created, created + 365 * DAY)).toBe(1);
    // Unknown createdAt: no doubling (never a free ceiling).
    expect(frontierRevenueMultiplierUpperBound(undefined, NOW)).toBe(1);
    expect(frontierRevenueMultiplierUpperBound(Number.NaN, NOW)).toBe(1);
  });

  it('the bound is never below the client\'s live multiplier at any instant of a Frontier life', () => {
    const created = NOW;
    for (let day = 0; day <= 60; day += 0.5) {
      const now = created + day * DAY;
      // Client A: never graduates until auto (timer at 30d, grace 7d).
      const active = frontierState({ createdAt: created, frontierEnteredAtMs: created });
      // Client B: graduated voluntarily on day 3.
      const early = frontierState({ createdAt: created, frontierEnteredAtMs: created, frontierStatus: 'graduated', frontierGraduatedAtMs: created + 3 * DAY });
      // Client C: auto-graduated at the end of the grace window.
      const late = frontierState({ createdAt: created, frontierEnteredAtMs: created, frontierStatus: 'graduated', frontierGraduatedAtMs: created + FRONTIER_LATEST_GRADUATION_MS });
      const bound = frontierRevenueMultiplierUpperBound(created, now);
      for (const s of [active, early, late]) {
        expect(getFrontierRevenueMultiplier(s, now)).toBeLessThanOrEqual(bound + 1e-12);
      }
    }
  });

  it('server monthly gross for a Frontier profile carries the 2.0 and equals the client\'s doubling of the same row', () => {
    const g = getGlobalGameDate();
    const now = Date.now();
    const created = now - DAY;
    const row = {
      prevResources: {},
      prevBuildingsData: [{ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', isComplete: true }],
      prevShipsData: [],
      prevActiveServices: [{ definitionId: 'svc_launch_small', locationId: 'earth_surface', linkedBuildingIds: [], revenueMultiplier: 1 }],
      prevResearch: [],
    };
    const state = buildServerFlowState(row);
    const wf = { engineers: 1, scientists: 0, miners: 0, operators: 1 };
    const frontier = computeServerMonthlyGrossDetailed(state, { totalEarned: 0, workforceData: wf, createdAtMs: created, nowMs: now });
    const veteran = computeServerMonthlyGrossDetailed(state, { totalEarned: 0, workforceData: wf, createdAtMs: created - 400 * DAY, nowMs: now });
    const unknown = computeServerMonthlyGrossDetailed(state, { totalEarned: 0, workforceData: wf });
    expect(frontier.frontierRevenueMult).toBe(2);
    expect(veteran.frontierRevenueMult).toBe(1);
    expect(unknown.frontierRevenueMult).toBe(1);
    // 2026-09-13 (docs/SECURITY_AUDIT_2026-09.md "Monthly gross — verified
    // terms"): the gross now also reads profile AGE — the legacy
    // stretch-family bound counts how many 60-day commander terms could
    // possibly have retired. These two rows are 400 days apart on purpose,
    // so that term is divided back out to isolate the Frontier doubling.
    const legacyAdj = frontier.multiplierTerms.verified.legacy / veteran.multiplierTerms.verified.legacy;
    expect(legacyAdj).toBeLessThan(1); // the older row legitimately reaches further
    expect(frontier.services).toBeCloseTo(veteran.services * 2 * legacyAdj, -1);
    expect(frontier.gross).toBeGreaterThan(veteran.gross);

    // The client's doubled income over a full game-month sits UNDER the
    // server's Frontier ceiling term — the 2026-09-12 bug was the reverse.
    const client = frontierState({
      money: 100_000_000, // under the $500M Frontier hard cap
      resources: { rocket_fuel: 200 }, // no supply brownout when the Frontier consumption exemption is off (small: inventory counts toward the hard cap)
      gameDate: { year: g.year, month: g.month },
      lastTickAt: now,
      workforce: wf,
      activeServices: [{ definitionId: 'svc_launch_small', locationId: 'earth_surface', linkedBuildingIds: [], startDate: { year: g.year, month: g.month }, revenueMultiplier: 1 }],
      buildings: [{ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', buildStartDate: { year: g.year, month: g.month }, completionDate: { year: g.year, month: g.month }, isComplete: true, startedAtMs: now - 10_000_000, realDurationSeconds: 1 }],
      createdAt: created,
      frontierEnteredAtMs: created,
    });
    const out = processTick(client);
    const clientMonthly = (out.totalEarned - client.totalEarned) * TICKS_PER_GAME_MONTH;
    expect(clientMonthly).toBeGreaterThan(0);
    expect(clientMonthly).toBeLessThanOrEqual(frontier.services);
    // and would NOT fit under a ceiling that ignored the Frontier term with
    // every other client-only multiplier at neutral: the doubling is real.
    const rep = computeEconomyReport(client, now);
    expect(rep.revenueMultipliers.frontier).toBe(2);
  });
});

// ─── 4. Starter flow ────────────────────────────────────────────────────────

describe('Pass 10 — the starter pad is fuelled and on a standing market order (client + server kits agree)', () => {
  it('Cape Heritage starts with six months of the pad\'s rocket fuel', () => {
    const pad = BUILDING_MAP.get('launch_pad_small')!;
    const perMonth = pad.consumesPerMonth!.rocket_fuel;
    expect(perMonth).toBe(10);
    expect(STARTER_SUPPLY_MONTHS).toBe(6);
    expect(starterSupplyFor('launch_pad_small')).toEqual({ rocket_fuel: 60 });
    const def = ARCHETYPE_MAP.get('cape_heritage')!;
    expect(def.startingResources.rocket_fuel).toBe(perMonth * STARTER_SUPPLY_MONTHS);
    expect(def.startingBuildings[0]).toEqual({ definitionId: 'launch_pad_small', locationId: 'earth_surface', supplyPolicy: 'market' });
    // A building with no inputs contributes nothing.
    expect(starterSupplyFor('ground_station')).toEqual({});
    expect(starterSupplyFor('not_a_building')).toEqual({});
  });

  it('applyArchetype and buildFirstSyncKit produce the same resources and the same supplyPolicy per building', () => {
    for (const id of ['cape_heritage', 'meridian_signals', 'tracking_consortium'] as const) {
      const def = ARCHETYPE_MAP.get(id)!;
      const client = applyArchetype(getNewGameState(), id);
      const kit = buildFirstSyncKit(id, 1);
      expect(kit.money).toBe(client.money);
      for (const [res, qty] of Object.entries(def.startingResources)) {
        expect(client.resources[res as keyof typeof client.resources]).toBe(qty);
        expect(kit.resources[res]).toBe(qty);
      }
      expect(kit.buildings.length).toBe(def.startingBuildings.length);
      def.startingBuildings.forEach((b, i) => {
        expect(client.buildings[i].definitionId).toBe(b.definitionId);
        expect(client.buildings[i].supplyPolicy).toBe(b.supplyPolicy);
        expect(kit.buildings[i].definitionId).toBe(b.definitionId);
        expect(kit.buildings[i].supplyPolicy).toBe(b.supplyPolicy);
      });
    }
    const cape = buildFirstSyncKit('cape_heritage', 1);
    expect(cape.resources.rocket_fuel).toBe(60);
    expect(cape.buildings[0].supplyPolicy).toBe('market');
    expect(cape.buildings[1].supplyPolicy).toBeUndefined();
  });

  it('the Sourcing console no longer shows the starter pad as Short on day one', () => {
    const state = applyArchetype(getNewGameState(), 'cape_heritage');
    const pad = buildSourcingRows(state).find(r => r.definitionId === 'launch_pad_small')!;
    expect(pad).toBeDefined();
    expect(pad.policy).toBe('market');
    expect(pad.status).toBe('market');
    expect(pad.inputs[0].resourceId).toBe('rocket_fuel');
    expect(pad.inputs[0].stock).toBe(60);
  });
});

describe('Pass 10 — the first-hour guide teaches the starter contract at step 2', () => {
  it('step order: command deck → contract → build → income → research → trade → GEO → Luna', () => {
    expect(ONBOARDING_STEPS.map(s => s.id)).toEqual([
      'command_deck', 'first_contract', 'first_build', 'first_income',
      'first_research', 'first_trade', 'next_orbit', 'road_to_luna',
    ]);
    const contract = ONBOARDING_STEP_MAP.get(2)!;
    expect(contract.id).toBe('first_contract');
    expect(contract.targetTab).toBe('contracts');
    expect(contract.where).toContain('Contracts & Diplomacy');
    expect(contract.why).toMatch(/\$50M.\$100M/);
    expect(contract.rewardMoney).toBe(0); // the contract itself pays
    expect(contract.manualAdvance).toBeUndefined(); // detection-backed
  });

  it('the contract step detects an accepted or completed contract, and the build step still ignores archetype buildings', () => {
    const state = applyArchetype(getNewGameState(), 'cape_heritage');
    expect(isOnboardingStepComplete(state, 2)).toBe(false);
    expect(isOnboardingStepComplete({ ...state, activeContracts: ['c_first_launch'] }, 2)).toBe(true);
    expect(isOnboardingStepComplete({ ...state, completedContracts: ['c_first_launch'] }, 2)).toBe(true);
    expect(isOnboardingStepComplete(state, 3)).toBe(false);
  });

  it('guide copy quotes the halved tier-1 prices', () => {
    expect(ONBOARDING_STEP_MAP.get(3)!.what).toContain('$15M');
    expect(ONBOARDING_STEP_MAP.get(3)!.what).toContain('$7.5M');
    expect(ONBOARDING_STEP_MAP.get(7)!.what).toContain('$75M');
  });
});
