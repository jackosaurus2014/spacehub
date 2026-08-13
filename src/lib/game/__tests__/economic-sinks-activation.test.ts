/**
 * @jest-environment node
 *
 * Audit Wave E (Change #9 / C5) — economic-sinks.ts activation.
 * The file was "100% orphaned — the designed anti-inflation economy"
 * (audit §1e). Proofs: premiums charge, volatiles decay, disasters cost
 * (less when insured), the T5+ reserve requirement penalizes, and exec
 * comp escalates progressively.
 */
import {
  calculateInsurancePremium,
  getMonthlyInsurancePremium,
  computeInsuredAssetValue,
  countInsuranceRiskLocations,
  setInsuranceActive,
  applyResourceDecay,
  rollMonthlyDisaster,
  getReserveStatus,
  calculateRequiredReserve,
  MINED_ONLY_RESOURCE_IDS,
  DISASTER_INSURANCE_COVERAGE,
  ECONOMIC_DISASTERS,
} from '../economic-sinks';
import { executiveCompensationMonthly } from '../formulas';
import { processTick } from '../game-engine';
import { BUILDING_MAP } from '../buildings';
import type { GameState, BuildingInstance } from '../types';

const fixedNow = Date.UTC(2026, 2, 25, 12, 0, 0);

function makeBuilding(definitionId: string, locationId: string, n: number): BuildingInstance {
  return {
    instanceId: `bld_${definitionId}_${n}`,
    definitionId,
    locationId,
    buildStartDate: { year: 2026, month: 1 },
    completionDate: { year: 2026, month: 2 },
    isComplete: true,
    startedAtMs: fixedNow - 100_000,
    realDurationSeconds: 60,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    createdAt: fixedNow - 86_400_000,
    lastTickAt: fixedNow - 1_000,
    money: 100_000_000,
    totalEarned: 0,
    totalSpent: 0,
    gameDate: { year: 2026, month: 3 }, // stale vs mocked wall clock → month-end fires
    tickSpeed: 1,
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface', 'leo'],
    resources: {},
    eventLog: [],
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    npcCompanies: [],
    ships: [],
    workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0 },
    frontierStatus: 'graduated',
    insuranceActive: true,
    ...overrides,
  } as GameState;
}

describe('insurance premium sink (audit A4 / C5 §2)', () => {
  it('premium = 0.5% of asset value + 0.2% per hazardous location', () => {
    expect(calculateInsurancePremium(1_000_000_000, 0)).toBe(5_000_000);
    expect(calculateInsurancePremium(1_000_000_000, 2)).toBe(9_000_000);
  });

  it('asset value and risk locations derive from real holdings', () => {
    const state = makeState({
      buildings: [makeBuilding('sat_telecom', 'leo', 1), makeBuilding('sat_telecom', 'io_surface', 2)],
      ships: [{ instanceId: 's1', definitionId: 'prospector_drone', name: 'P', status: 'idle', currentLocation: 'asteroid_belt', isBuilt: true }],
    });
    const satCost = BUILDING_MAP.get('sat_telecom')!.baseCost;
    expect(computeInsuredAssetValue(state)).toBe(satCost * 2 + 30_000_000);
    expect(countInsuranceRiskLocations(state)).toBe(2); // io_surface + asteroid_belt
    expect(getMonthlyInsurancePremium(state)).toBe(
      calculateInsurancePremium(satCost * 2 + 30_000_000, 2),
    );
  });

  it('no policy → no premium; setInsuranceActive toggles', () => {
    const state = makeState({ buildings: [makeBuilding('sat_telecom', 'leo', 1)] });
    expect(getMonthlyInsurancePremium(setInsuranceActive(state, false))).toBe(0);
    expect(getMonthlyInsurancePremium(setInsuranceActive(setInsuranceActive(state, false), true))).toBeGreaterThan(0);
  });
});

describe('processTick month-end sinks (differential proofs)', () => {
  let originalDateNow: () => number;

  beforeEach(() => {
    originalDateNow = Date.now;
    Date.now = () => fixedNow;
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-03-25T12:00:00.000Z');
    jest.spyOn(Math, 'random').mockReturnValue(0.99); // suppress legacy random events
  });

  afterEach(() => {
    Date.now = originalDateNow;
    jest.restoreAllMocks();
  });

  it('charges the insurance premium at month-end (insured vs uninsured differ by exactly the premium)', () => {
    // One earth-surface building: below every disaster's minBuildings gate,
    // so the ONLY totalSpent difference between the runs is the premium
    // (hazard payouts touch totalEarned, not totalSpent).
    const insured = makeState({ buildings: [makeBuilding('ground_station', 'earth_surface', 1)] });
    const uninsured = makeState({ buildings: [makeBuilding('ground_station', 'earth_surface', 1)], insuranceActive: false });
    const premium = getMonthlyInsurancePremium(insured);
    expect(premium).toBeGreaterThan(0);

    const insuredResult = processTick(insured);
    const uninsuredResult = processTick(uninsured);
    expect(insuredResult.totalSpent - uninsuredResult.totalSpent).toBe(premium);
  });

  it('decays volatile resources monthly at the file rates; metals never decay (C5 §3)', () => {
    const decayed = applyResourceDecay({ lunar_water: 1000, methane: 1000, iron: 500, titanium: 40 });
    expect(decayed.lunar_water).toBe(990); // 1%/mo
    expect(decayed.methane).toBe(995);     // 0.5%/mo
    expect(decayed.iron).toBe(500);
    expect(decayed.titanium).toBe(40);

    // And the engine applies it at month-end:
    const state = makeState({ resources: { lunar_water: 1000, iron: 500 } });
    const result = processTick(state);
    expect(result.resources.lunar_water).toBe(990);
    expect(result.resources.iron).toBe(500);
  });

  it('T5+ reserve requirement: preset critical status cuts service revenue (C5 §7)', () => {
    const base: Partial<GameState> = {
      corporationTier: 5,
      insuranceActive: false,
      activeServices: [{
        definitionId: 'svc_telecom_leo', locationId: 'leo',
        linkedBuildingIds: [], startDate: { year: 2026, month: 2 }, revenueMultiplier: 1,
      }],
    };
    const healthy = processTick(makeState({ ...base }));
    const strained = processTick(makeState({
      ...base,
      reserveStatus: { status: 'critical', efficiencyMultiplier: 0.6, requiredReserve: 10_000_000_000 },
    }));
    expect(strained.totalEarned).toBeLessThan(healthy.totalEarned);
    // Month-end recomputes the status for T5+ corps…
    expect(healthy.reserveStatus).toBeDefined();
    expect(healthy.reserveStatus!.requiredReserve).toBe(
      calculateRequiredReserve(0, Math.round(healthy.reserveStatus!.requiredReserve / 3)),
    );
    // …and clears it below the tier gate.
    const tier1 = processTick(makeState({
      reserveStatus: { status: 'critical', efficiencyMultiplier: 0.6, requiredReserve: 1 },
    }));
    expect(tier1.reserveStatus).toBeUndefined();
  });

  it('getReserveStatus bands: healthy 1.0 / warning 0.85 / critical 0.60', () => {
    expect(getReserveStatus(300, 300).efficiencyMultiplier).toBe(1.0);
    expect(getReserveStatus(200, 300).efficiencyMultiplier).toBe(0.85);
    expect(getReserveStatus(100, 300).efficiencyMultiplier).toBe(0.60);
  });
});

describe('economic disasters (C5 §4 — seeded, insured-vs-not)', () => {
  it('never fires below the minBuildings gates (small operations are safe)', () => {
    const small = makeState({ buildings: [makeBuilding('ground_station', 'earth_surface', 1)] });
    for (let m = 0; m < 500; m++) {
      expect(rollMonthlyDisaster(small, m)).toBeNull();
    }
  });

  it('fires deterministically for large empires; insurance covers 75% of covered disasters', () => {
    const buildings = Array.from({ length: 25 }, (_, i) => makeBuilding('ground_station', 'earth_surface', i));
    const big = makeState({ buildings });
    let hitMonth = -1;
    for (let m = 0; m < 5_000; m++) {
      if (rollMonthlyDisaster(big, m)) { hitMonth = m; break; }
    }
    expect(hitMonth).toBeGreaterThanOrEqual(0);

    const insuredRoll = rollMonthlyDisaster(big, hitMonth)!;
    const uninsuredRoll = rollMonthlyDisaster(makeState({ buildings, insuranceActive: false }), hitMonth)!;

    // Deterministic: same month, same disaster, same gross cost.
    expect(uninsuredRoll.disaster.id).toBe(insuredRoll.disaster.id);
    expect(uninsuredRoll.grossCost).toBe(insuredRoll.grossCost);
    expect(insuredRoll.grossCost).toBeGreaterThan(0);

    if (insuredRoll.disaster.requiresInsurance) {
      expect(insuredRoll.insuranceCovered).toBe(Math.round(insuredRoll.grossCost * DISASTER_INSURANCE_COVERAGE));
      expect(insuredRoll.netCost).toBe(insuredRoll.grossCost - insuredRoll.insuranceCovered);
      expect(uninsuredRoll.insuranceCovered).toBe(0);
      expect(uninsuredRoll.netCost).toBe(uninsuredRoll.grossCost);
    } else {
      expect(insuredRoll.insuranceCovered).toBe(0);
    }
  });

  it('cost formulas match the definitions', () => {
    const perBuilding = ECONOMIC_DISASTERS.find(d => d.costFormula === 'per_building')!;
    const buildings = Array.from({ length: perBuilding.minBuildings }, (_, i) => makeBuilding('ground_station', 'earth_surface', i));
    const state = makeState({ buildings });
    for (let m = 0; m < 20_000; m++) {
      const roll = rollMonthlyDisaster(state, m);
      if (roll && roll.disaster.id === perBuilding.id) {
        expect(roll.grossCost).toBe(perBuilding.costAmount * buildings.length);
        return;
      }
    }
    // Statistically implausible to miss in 20k months at 0.3%/mo — fail loudly.
    throw new Error('per_building disaster never rolled in 20,000 months');
  });
});

describe('progressive executive compensation (C5 "escalate exec comp")', () => {
  it('keeps early/mid-game identical to the flat 0.03% rate', () => {
    expect(executiveCompensationMonthly(1_000_000_000)).toBe(270_000);
    expect(executiveCompensationMonthly(10_000_000_000)).toBe(2_970_000);
  });

  it('escalates through marginal brackets (0.06% / 0.10% / 0.15%)', () => {
    expect(executiveCompensationMonthly(100_000_000_000)).toBe(2_970_000 + 54_000_000);          // $56.97M
    expect(executiveCompensationMonthly(1_000_000_000_000)).toBe(2_970_000 + 54_000_000 + 900_000_000); // $956.97M
    expect(executiveCompensationMonthly(2_000_000_000_000)).toBe(956_970_000 + 1_500_000_000);   // +0.15% on the $1T above
  });

  it('brackets are marginal — no discontinuity at boundaries', () => {
    const below = executiveCompensationMonthly(9_999_999_999);
    const above = executiveCompensationMonthly(10_000_000_001);
    expect(above - below).toBeLessThan(10);
  });
});

describe('mined-only market restriction (C5 canBuyOnMarket:false)', () => {
  it('gates the interstellar-exclusive resources', () => {
    expect(MINED_ONLY_RESOURCE_IDS).toContain('exotic_fuel');
    expect(MINED_ONLY_RESOURCE_IDS).toContain('xenogenic_biomatter');
    // Common market commodities stay buyable
    expect(MINED_ONLY_RESOURCE_IDS).not.toContain('iron');
    expect(MINED_ONLY_RESOURCE_IDS).not.toContain('helium3');
  });
});
