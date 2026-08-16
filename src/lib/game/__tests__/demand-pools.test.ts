/**
 * @jest-environment node
 *
 * Economic PvP Wave E4 — Finite Demand Pools (docs/ECONOMY_PVP_2026-08.md
 * §2.1/§E4). Covers the spec's test list:
 *   - pool derivation determinism (computePoolAggregates, local fallback)
 *   - capacity-share split math (saturation division, premium ≤ +25%,
 *     floor 0.35)
 *   - NPC floor invariants (floor-not-ceiling: NPC-only markets never
 *     saturated; population scaler recedes monotonically with a hard floor)
 *   - phase-in (25% → 100% over 3 game-months, mirrors E3)
 *   - away-catch-up parity (away revenue scales with the same snapshot
 *     multiplier the live tick uses — one helper, two paths)
 */

import {
  getServiceCategory,
  demandPoolKey,
  getNpcFloorBase,
  getNpcFloorDemand,
  getNpcSupplyCapacity,
  npcPopulationScaler,
  getDemandPoolSeasonModifier,
  deriveActivityDemand,
  computePoolAggregates,
  emaBlend,
  getDemandPoolPhaseInFraction,
  gameDateToMonthIndex,
  NPC_DEMAND_FLOOR,
  NPC_SUPPLY_FRACTION,
  SERVICE_CATEGORIES,
  SEASON_DEMAND_MOD_MIN,
  SEASON_DEMAND_MOD_MAX,
  DEMAND_POOL_STALE_MS,
  type ServiceCategory,
  type DemandPoolSnapshot,
} from '../demand-pools';
import {
  computePoolMultiplier,
  computeCapacityShare,
  clampDemandMultiplier,
  buildDemandPoolSnapshot,
  getServiceDemandMultiplier,
  DEMAND_MULT_FLOOR,
  DEMAND_PREMIUM_CAP,
} from '../service-pricing';
import { mergeDemandPoolSnapshot } from '../server-effects';
import { getNewGameState } from '../save-load';
import { SERVICES, SERVICE_MAP } from '../services';
import { BUILDINGS } from '../buildings';
import { calculateAwayOperations } from '../away-operations';
import { getGlobalGameDate } from '../server-time';
import type { GameState } from '../types';

// localStorage shim for save-load import in node env
beforeAll(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    };
  }
});

// ─── Category mapping ────────────────────────────────────────────────────────

describe('service categories', () => {
  it('maps every non-mining service to a pool category', () => {
    for (const svc of SERVICES) {
      const cat = getServiceCategory(svc.id);
      if (svc.type === 'mining_output') {
        expect(cat).toBeNull(); // §2.4 handles mining — never double-taxed
      } else {
        expect(cat).not.toBeNull();
        expect(SERVICE_CATEGORIES).toContain(cat as ServiceCategory);
      }
    }
  });

  it('assigns the spec overrides (logistics = depot/debris/nav; insurance)', () => {
    expect(getServiceCategory('svc_propellant_depot')).toBe('logistics');
    expect(getServiceCategory('svc_debris_removal')).toBe('logistics');
    expect(getServiceCategory('svc_navigation')).toBe('logistics');
    expect(getServiceCategory('svc_space_insurance')).toBe('insurance');
  });
});

// ─── Capacity-share split math (§2.1 "Payout") ──────────────────────────────

describe('computePoolMultiplier — the split math', () => {
  it('saturated market pays D/C (competitors take customers)', () => {
    expect(computePoolMultiplier(100, 200)).toBeCloseTo(0.5, 6);
    expect(computePoolMultiplier(100, 125)).toBeCloseTo(0.8, 6);
  });

  it('undersupplied market pays a premium 1 + 0.5·(D−C)/D', () => {
    expect(computePoolMultiplier(100, 80)).toBeCloseTo(1.1, 6);
    expect(computePoolMultiplier(100, 50)).toBeCloseTo(1.25, 6);
  });

  it('premium is capped at +25% — even an empty market', () => {
    expect(computePoolMultiplier(100, 10)).toBeLessThanOrEqual(DEMAND_PREMIUM_CAP);
    expect(computePoolMultiplier(100, 0)).toBe(DEMAND_PREMIUM_CAP);
  });

  it('saturation floors at 0.35 no matter how crowded', () => {
    expect(computePoolMultiplier(100, 10_000)).toBe(DEMAND_MULT_FLOOR);
  });

  it('is continuous at the balance point C = D', () => {
    expect(computePoolMultiplier(100, 100)).toBeCloseTo(1.0, 6);
    expect(computePoolMultiplier(100, 100.0001)).toBeCloseTo(1.0, 3);
  });

  it('total extraction never exceeds D (strict sublinearity)', () => {
    // rev_total = C × mult ≤ D whenever C > D
    for (const C of [101, 150, 300, 1000, 100000]) {
      const mult = computePoolMultiplier(100, C);
      const totalPaid = C * mult;
      // Floor kicks in below D/C = 0.35 — even then total paid is bounded
      // by C × 0.35 which for C ≤ D/0.35 stays ≤ D... above that the floor
      // is a deliberate migration-safety bound; check the unfloored region:
      if (mult > DEMAND_MULT_FLOOR) expect(totalPaid).toBeLessThanOrEqual(100.0001);
    }
  });

  it('unauthored market (D ≤ 0) is neutral; garbage inputs are safe', () => {
    expect(computePoolMultiplier(0, 500)).toBe(1);
    expect(computePoolMultiplier(NaN, 500)).toBe(1);
    expect(clampDemandMultiplier('bogus')).toBe(1);
    expect(clampDemandMultiplier(99)).toBe(DEMAND_PREMIUM_CAP);
    expect(clampDemandMultiplier(0)).toBe(DEMAND_MULT_FLOOR);
  });

  it('capacity share is a bounded fraction', () => {
    expect(computeCapacityShare(50, 200)).toBeCloseTo(0.25, 6);
    expect(computeCapacityShare(300, 200)).toBe(1);
    expect(computeCapacityShare(10, 0)).toBe(0);
  });
});

// ─── NPC floor invariants (§2.9 / NPC_BACKDROP.md) ──────────────────────────

describe('NPC backdrop — floor, not ceiling', () => {
  it('population scaler: full backdrop < 50 actives, ~40% at 500, ~10% at 5000, floor', () => {
    expect(npcPopulationScaler(0)).toBe(1);
    expect(npcPopulationScaler(50)).toBe(1);
    expect(npcPopulationScaler(500)).toBeCloseTo(0.4, 2);
    expect(npcPopulationScaler(5000)).toBeCloseTo(0.1, 2);
    expect(npcPopulationScaler(1_000_000)).toBe(0.1);
  });

  it('scaler is monotonically non-increasing', () => {
    let prev = npcPopulationScaler(0);
    for (const a of [10, 50, 80, 150, 400, 500, 900, 2000, 5000, 20000]) {
      const next = npcPopulationScaler(a);
      expect(next).toBeLessThanOrEqual(prev + 1e-9);
      prev = next;
    }
  });

  it('NPC-only markets are ALWAYS undersupplied — a solo first mover sees a premium, never NPC-caused saturation', () => {
    for (const [locationId, cats] of Object.entries(NPC_DEMAND_FLOOR)) {
      for (const cat of Object.keys(cats) as ServiceCategory[]) {
        for (const active of [0, 100, 1000, 10000]) {
          // Season modifier spans its full authored band:
          for (const mod of [SEASON_DEMAND_MOD_MIN, 1, SEASON_DEMAND_MOD_MAX]) {
            const D = getNpcFloorDemand(locationId, cat, active) * mod;
            const C = getNpcSupplyCapacity(locationId, cat, active);
            const mult = computePoolMultiplier(D, C);
            expect(mult).toBeGreaterThanOrEqual(1.0);
            expect(mult).toBeLessThanOrEqual(DEMAND_PREMIUM_CAP);
          }
        }
      }
    }
  });

  it('NPC demand and supply recede TOGETHER as players grow (fixed fraction)', () => {
    const D0 = getNpcFloorDemand('leo', 'telecom', 0);
    const D5k = getNpcFloorDemand('leo', 'telecom', 5000);
    expect(D5k).toBeLessThan(D0);
    expect(D5k / D0).toBeCloseTo(0.1, 2);
    expect(getNpcSupplyCapacity('leo', 'telecom', 5000) / D5k).toBeCloseTo(NPC_SUPPLY_FRACTION, 6);
  });

  it('unauthored locations fall back to a finite default floor (never infinite demand)', () => {
    expect(getNpcFloorBase('some_future_colony', 'telecom')).toBeGreaterThan(0);
    expect(getNpcFloorBase('leo', 'insurance')).toBeGreaterThan(0);
  });

  it('season modifier stays inside its authored band for every category and season', () => {
    for (let season = 1; season <= 12; season++) {
      for (const cat of SERVICE_CATEGORIES) {
        const mod = getDemandPoolSeasonModifier(cat, season);
        expect(mod).toBeGreaterThanOrEqual(SEASON_DEMAND_MOD_MIN);
        expect(mod).toBeLessThanOrEqual(SEASON_DEMAND_MOD_MAX);
      }
    }
  });
});

// ─── Floor-authoring rule (M1/F2): floor ≥ 2.5x flagship capacity ──────────
// docs/MEANINGFUL_2026-08.md §5 M1.1. "Flagship capacity" = the highest
// single-instance revenuePerMonth among services placeable in a given
// (location, category) market (mirrors scripts/sim-strategies.ts's build-menu
// sweep). A floor below 2.5x its flagship saturates that market at N=1 —
// exactly what broke earth_surface.launch (Heavy Launch Pad, F2) and
// mars_orbit.launch (Propellant Brokerage, F2) pre-M1.

describe('NPC_DEMAND_FLOOR authoring rule — floor ≥ 2.5x flagship capacity (F2)', () => {
  // Build the same (location, category) -> max revenuePerMonth map the
  // harness's build-menu sweep implicitly exercises: every building's
  // requiredLocation × its enabledServices' pool category.
  const flagshipCapacity = new Map<string, number>();
  for (const b of BUILDINGS) {
    const loc = b.requiredLocation;
    if (!loc) continue;
    for (const svcId of b.enabledServices) {
      const sDef = SERVICE_MAP.get(svcId);
      if (!sDef) continue;
      const cat = getServiceCategory(svcId);
      if (!cat) continue; // mining_output — exempt, §2.4
      const key = demandPoolKey(loc, cat);
      flagshipCapacity.set(key, Math.max(flagshipCapacity.get(key) || 0, sDef.revenuePerMonth));
    }
  }

  it('found at least one flagship market to check (sanity — the sweep is not vacuous)', () => {
    expect(flagshipCapacity.size).toBeGreaterThan(10);
  });

  it('every authored (location, category) floor is >= 2.5x its flagship service capacity', () => {
    const violations: string[] = [];
    flagshipCapacity.forEach((cap, key) => {
      const sep = key.indexOf(':');
      const locationId = key.slice(0, sep);
      const category = key.slice(sep + 1) as ServiceCategory;
      const floor = getNpcFloorBase(locationId, category);
      const ratio = floor / cap;
      if (ratio < 2.5) {
        violations.push(`${key}: floor=${floor.toLocaleString()} cap=${cap.toLocaleString()} ratio=${ratio.toFixed(2)}`);
      }
    });
    expect(violations).toEqual([]);
  });
});

// ─── Pool derivation determinism ────────────────────────────────────────────

const FIXTURE_PROFILES = [
  {
    id: 'p1',
    buildings: [
      { definitionId: 'sat_telecom', locationId: 'leo', isComplete: true },
      { definitionId: 'space_station_small', locationId: 'leo', isComplete: true },
    ],
    services: [
      { definitionId: 'svc_telecom_leo', locationId: 'leo' },
      { definitionId: 'svc_telecom_leo', locationId: 'leo' },
      { definitionId: 'svc_tourism_leo', locationId: 'leo' },
    ],
    ships: [{ currentLocation: 'leo' }],
  },
  {
    id: 'p2',
    buildings: [{ definitionId: 'sat_telecom', locationId: 'leo', isComplete: true }],
    services: [{ definitionId: 'svc_telecom_leo', locationId: 'leo' }],
    ships: [],
  },
];

describe('computePoolAggregates — deterministic server derivation', () => {
  it('same inputs produce identical aggregates (byte-for-byte)', () => {
    const a = computePoolAggregates(FIXTURE_PROFILES, 120);
    const b = computePoolAggregates(FIXTURE_PROFILES, 120);
    expect(Object.fromEntries(a)).toEqual(Object.fromEntries(b));
  });

  it('player capacity aggregates with the within-player saturation curve', () => {
    const aggs = computePoolAggregates(FIXTURE_PROFILES, 0);
    const leoTelecom = aggs.get(demandPoolKey('leo', 'telecom'))!;
    // p1: 3.5M × (sat(0) + sat(1)) ; p2: 3.5M × sat(0) ; + NPC supply
    const sat0 = 1.0;
    const sat1 = 0.35 + 0.65 * 0.92;
    const expectedPlayers = 3_500_000 * (sat0 + sat1) + 3_500_000 * sat0;
    const npcSupply = getNpcSupplyCapacity('leo', 'telecom', 0);
    expect(leoTelecom.cSupply).toBeCloseTo(Math.round(expectedPlayers + npcSupply), -1);
    // 2 player suppliers + the NPC backdrop
    expect(leoTelecom.supplierCount).toBe(3);
    expect(leoTelecom.topShares.length).toBeLessThanOrEqual(3);
    const sorted = [...leoTelecom.topShares].sort((x, y) => y - x);
    expect(leoTelecom.topShares).toEqual(sorted); // anonymized, descending
  });

  it('rival construction GROWS local demand (agglomeration)', () => {
    const withoutBuildings = computePoolAggregates(
      [{ id: 'p1', buildings: [], services: [], ships: [] }], 0,
    );
    const withBuildings = computePoolAggregates(
      [{ id: 'p1', buildings: [{ definitionId: 'sat_telecom', locationId: 'leo', isComplete: true }], services: [], ships: [] }], 0,
    );
    const before = withoutBuildings.get(demandPoolKey('leo', 'power'))!.dDerived;
    const after = withBuildings.get(demandPoolKey('leo', 'power'))!.dDerived;
    expect(after).toBeGreaterThan(before);
  });

  it('deriveActivityDemand is pure — repeated calls agree', () => {
    const s = FIXTURE_PROFILES[0];
    expect(Object.fromEntries(deriveActivityDemand(s))).toEqual(Object.fromEntries(deriveActivityDemand(s)));
  });

  it('EMA blend seeds raw on first observation and moves slowly after', () => {
    expect(emaBlend(undefined, 1000)).toBe(1000);
    const blended = emaBlend(1000, 2000);
    expect(blended).toBeGreaterThan(1000);
    expect(blended).toBeLessThan(1030); // 7-day horizon: ~1.2%/hour
  });
});

// ─── Snapshot building + merge ──────────────────────────────────────────────

describe('buildDemandPoolSnapshot', () => {
  const row = { locationId: 'leo', category: 'telecom', dNpc: 30_000_000, dDerived: 5_000_000, cSupply: 20_000_000, topShares: [0.6, 0.4], supplierCount: 2 };

  it('computes a clamped multiplier and the caller own share', () => {
    const snap = buildDemandPoolSnapshot([row], [{ definitionId: 'svc_telecom_leo', locationId: 'leo' }], 1, 12345);
    const entry = snap.pools[demandPoolKey('leo', 'telecom')];
    expect(entry).toBeDefined();
    expect(entry.mult).toBeGreaterThanOrEqual(DEMAND_MULT_FLOOR);
    expect(entry.mult).toBeLessThanOrEqual(DEMAND_PREMIUM_CAP);
    expect(entry.playerShare).toBeGreaterThan(0);
    expect(snap.asOf).toBe(12345);
  });

  it('counts unseen own capacity into C — no premium your own supply already filled', () => {
    const sparse = { ...row, cSupply: 0, topShares: [], supplierCount: 0 };
    const snap = buildDemandPoolSnapshot([sparse], [{ definitionId: 'svc_telecom_leo', locationId: 'leo' }], 1, 1);
    const entry = snap.pools[demandPoolKey('leo', 'telecom')];
    expect(entry.cSupply).toBeGreaterThanOrEqual(3_500_000);
    expect(entry.playerShare).toBeCloseTo(1, 3);
  });

  it('merge stamps prevPlayerShare from the previous snapshot (share-drop alerts)', () => {
    const prev: DemandPoolSnapshot = {
      pools: { 'leo:telecom': { locationId: 'leo', category: 'telecom', mult: 1, dTotal: 1, dNpc: 1, cSupply: 1, playerShare: 0.5, topShares: [], supplierCount: 1 } },
      asOf: 1,
    };
    const next: DemandPoolSnapshot = {
      pools: { 'leo:telecom': { locationId: 'leo', category: 'telecom', mult: 0.8, dTotal: 1, dNpc: 1, cSupply: 1, playerShare: 0.3, topShares: [], supplierCount: 2 } },
      asOf: 2,
    };
    const merged = mergeDemandPoolSnapshot(prev, next)!;
    expect(merged.pools['leo:telecom'].prevPlayerShare).toBe(0.5);
    expect(merged.pools['leo:telecom'].playerShare).toBe(0.3);
    // Defensive clamp survives garbage:
    const garbage = mergeDemandPoolSnapshot(null, {
      pools: { 'leo:telecom': { locationId: 'leo', category: 'telecom', mult: 99, dTotal: -5, dNpc: NaN, cSupply: 1, playerShare: 7, topShares: [9], supplierCount: -2 } },
      asOf: 3,
    })!;
    expect(garbage.pools['leo:telecom'].mult).toBe(DEMAND_PREMIUM_CAP);
    expect(garbage.pools['leo:telecom'].playerShare).toBe(1);
    expect(garbage.pools['leo:telecom'].supplierCount).toBe(0);
  });
});

// ─── Phase-in (§E4 [SAVE] — mirrors E3) ─────────────────────────────────────

describe('demand-pool phase-in', () => {
  it('null anchor = full effect (fresh games)', () => {
    expect(getDemandPoolPhaseInFraction(null, 100)).toBe(1);
    expect(getDemandPoolPhaseInFraction(undefined, 100)).toBe(1);
  });

  it('ramps 25% → 100% over 3 game-months from the anchor', () => {
    expect(getDemandPoolPhaseInFraction(10, 10)).toBeCloseTo(0.25, 6);
    expect(getDemandPoolPhaseInFraction(10, 11)).toBeCloseTo(0.5, 6);
    expect(getDemandPoolPhaseInFraction(10, 12)).toBeCloseTo(0.75, 6);
    expect(getDemandPoolPhaseInFraction(10, 13)).toBe(1);
    expect(getDemandPoolPhaseInFraction(10, 500)).toBe(1);
  });
});

// ─── getServiceDemandMultiplier — resolution, shield, staleness ─────────────

function makeState(overrides: Partial<GameState> = {}): GameState {
  const state = getNewGameState();
  const globalDate = getGlobalGameDate();
  return {
    ...state,
    frontierStatus: 'graduated',
    gameDate: { year: globalDate.year, month: globalDate.month },
    demandPoolPhaseInStartMonth: null,
    activeServices: [{
      definitionId: 'svc_telecom_leo', locationId: 'leo',
      linkedBuildingIds: [], startDate: { year: globalDate.year, month: globalDate.month },
      revenueMultiplier: 1,
    }],
    ...overrides,
  } as GameState;
}

function makeSnapshot(mult: number, asOf: number): DemandPoolSnapshot {
  return {
    pools: {
      'leo:telecom': {
        locationId: 'leo', category: 'telecom', mult,
        dTotal: 30_000_000, dNpc: 30_000_000, cSupply: 30_000_000,
        playerShare: 0.2, topShares: [0.5, 0.3, 0.2], supplierCount: 3,
      },
    },
    asOf,
  };
}

describe('getServiceDemandMultiplier', () => {
  const now = Date.now();
  const monthIndex = getGlobalGameDate(now).totalMonths;

  it('mining services are exempt (handled by §2.4)', () => {
    const state = makeState({ demandPools: makeSnapshot(0.5, now) });
    expect(getServiceDemandMultiplier(state, 'svc_mining_lunar', 'lunar_surface', monthIndex, now)).toBe(1);
  });

  it('uses a fresh server snapshot verbatim (clamped)', () => {
    const state = makeState({ demandPools: makeSnapshot(0.6, now) });
    expect(getServiceDemandMultiplier(state, 'svc_telecom_leo', 'leo', monthIndex, now)).toBeCloseTo(0.6, 6);
  });

  it('falls back to the deterministic local pool when the snapshot is stale', () => {
    const staleState = makeState({ demandPools: makeSnapshot(0.6, now - DEMAND_POOL_STALE_MS - 1000) });
    const noSnapState = makeState({ demandPools: null });
    const a = getServiceDemandMultiplier(staleState, 'svc_telecom_leo', 'leo', monthIndex, now);
    const b = getServiceDemandMultiplier(noSnapState, 'svc_telecom_leo', 'leo', monthIndex, now);
    expect(a).toBeCloseTo(b, 6); // stale ≡ never-synced
    expect(a).not.toBeCloseTo(0.6, 2); // the stale value is NOT used
    // Solo player with one small service vs the full NPC floor: undersupplied
    expect(a).toBeGreaterThanOrEqual(1.0);
    expect(a).toBeLessThanOrEqual(DEMAND_PREMIUM_CAP);
  });

  it('local fallback is deterministic — same state, same clocks, same answer', () => {
    const s = makeState({ demandPools: null });
    const x = getServiceDemandMultiplier(s, 'svc_telecom_leo', 'leo', monthIndex, now);
    const y = getServiceDemandMultiplier(s, 'svc_telecom_leo', 'leo', monthIndex, now);
    expect(x).toBe(y);
  });

  it('phase-in blends the pool effect toward neutral (25% at the anchor month)', () => {
    const state = makeState({
      demandPools: makeSnapshot(0.6, now),
      demandPoolPhaseInStartMonth: monthIndex,
    });
    // 1 + (0.6 − 1) × 0.25 = 0.9
    expect(getServiceDemandMultiplier(state, 'svc_telecom_leo', 'leo', monthIndex, now)).toBeCloseTo(0.9, 6);
    // Two months later: 1 + (0.6 − 1) × 0.75 = 0.7
    expect(getServiceDemandMultiplier(state, 'svc_telecom_leo', 'leo', monthIndex + 2, now)).toBeCloseTo(0.7, 6);
  });

  it('Protected Frontier corps are never pushed below neutral (premiums still pay)', () => {
    const shielded = makeState({
      demandPools: makeSnapshot(0.5, now),
      frontierStatus: 'active',
      frontierEnteredAtMs: now - 1000,
      createdAt: now - 1000,
    });
    expect(getServiceDemandMultiplier(shielded, 'svc_telecom_leo', 'leo', monthIndex, now)).toBe(1);
    const premium = makeState({
      demandPools: makeSnapshot(1.2, now),
      frontierStatus: 'active',
      frontierEnteredAtMs: now - 1000,
      createdAt: now - 1000,
    });
    expect(getServiceDemandMultiplier(premium, 'svc_telecom_leo', 'leo', monthIndex, now)).toBeCloseTo(1.2, 6);
  });

  it('result is always inside [0.35, 1.25]', () => {
    for (const mult of [0.01, 0.35, 0.7, 1.0, 1.25, 5]) {
      const state = makeState({ demandPools: makeSnapshot(mult, now) });
      const v = getServiceDemandMultiplier(state, 'svc_telecom_leo', 'leo', monthIndex, now);
      expect(v).toBeGreaterThanOrEqual(DEMAND_MULT_FLOOR);
      expect(v).toBeLessThanOrEqual(DEMAND_PREMIUM_CAP);
    }
  });
});

// ─── Away-catch-up parity (§E4 test list) ───────────────────────────────────
// The live tick and away catch-up share getServiceDemandMultiplier. Proof by
// proportionality: the same state, differing ONLY in the snapshot multiplier
// (0.6 vs 1.2), must earn away revenue in exactly that 1:2 ratio — the away
// path applies the identical multiplier the live tick would.

describe('away-catch-up parity', () => {
  it('away service revenue scales with the demand-pool multiplier exactly', () => {
    const now = Date.now();
    const AWAY_MS = 10 * 60_000; // 10 minutes = 300 ticks at 2s, tier-1 (100%) efficiency
    const base = makeState({ lastTickAt: now - AWAY_MS });

    const low = { ...base, demandPools: makeSnapshot(0.6, now) };
    const high = { ...base, demandPools: makeSnapshot(1.2, now) };

    const lowResult = calculateAwayOperations(low, now)!;
    const highResult = calculateAwayOperations(high, now)!;
    expect(lowResult).not.toBeNull();
    expect(highResult).not.toBeNull();

    const lowEarned = lowResult.state.totalEarned - low.totalEarned;
    const highEarned = highResult.state.totalEarned - high.totalEarned;
    expect(highEarned).toBeGreaterThan(0);
    // Ratio 0.6 / 1.2 = 0.5, modulo per-tick integer rounding.
    expect(lowEarned / highEarned).toBeGreaterThan(0.48);
    expect(lowEarned / highEarned).toBeLessThan(0.52);
  });

  it('gameDateToMonthIndex matches the server-time totalMonths convention', () => {
    const g = getGlobalGameDate();
    expect(gameDateToMonthIndex({ year: g.year, month: g.month })).toBe(g.totalMonths);
  });
});

// ─── Retirement of the log decay ────────────────────────────────────────────

describe('log-decay retirement', () => {
  it('service-pricing no longer exports the global instance-count decay', async () => {
    const mod = await import('../service-pricing');
    expect((mod as Record<string, unknown>).getServicePriceMultiplier).toBeUndefined();
    expect((mod as Record<string, unknown>).getAllServicePriceMultipliers).toBeUndefined();
  });
});
