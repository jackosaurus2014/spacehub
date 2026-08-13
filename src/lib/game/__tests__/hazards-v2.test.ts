/**
 * @jest-environment node
 *
 * Audit Wave D (Change #4) — hazards hurt, insurance pays.
 * Before/after proofs demanded by the wave spec:
 *  - a severe hazard destroys a genuinely exposed asset (v1: mathematically
 *    impossible — damage capped at 0.50 vs a 0.95 threshold, audit §1d-1)
 *  - insurance makes the player whole
 *  - shielded / module-protected / crewed assets survive the same event
 *  - warnings precede severe events by one game-month
 *  - Protected Frontier gating still holds
 */
import {
  rollMonthlyHazards,
  rollHazardOccurrence,
  resolveHazardHit,
  destructionThresholdForTier,
  applyHazards,
  forecastSevereHazards,
  getShipHazardMitigation,
  getBuildingHazardMitigation,
  MITIGATION_CAP,
  type HazardRecord,
} from '../hazards';
import { getMonthlyInsurancePremium } from '../economic-sinks';
import { processTick } from '../game-engine';
import { SHIP_MAP, getShipDerivedStats } from '../ships';
import { BUILDING_MAP } from '../buildings';
import type { GameState } from '../types';

const fixedNow = Date.UTC(2026, 2, 25, 12, 0, 0);

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    createdAt: fixedNow - 86_400_000,
    lastTickAt: fixedNow - 1_000,
    money: 100_000_000,
    totalEarned: 0,
    totalSpent: 0,
    gameDate: { year: 2026, month: 3 },
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

function beltSatelliteState(overrides: Partial<GameState> = {}): GameState {
  // A tier-1 satellite at the asteroid belt (pirate multiplier 2.0) with no
  // ships, no crew, no modules — the "genuinely exposed" asset of the spec.
  return makeState({
    buildings: [{
      instanceId: 'bld_exposed',
      definitionId: 'sat_telecom',
      locationId: 'asteroid_belt',
      buildStartDate: { year: 2026, month: 1 },
      completionDate: { year: 2026, month: 2 },
      isComplete: true,
      startedAtMs: fixedNow - 100_000,
      realDurationSeconds: 60,
    }],
    ...overrides,
  });
}

/** Scan world months for the first roll that destroys the exposed asset. */
function findDestructionMonth(state: GameState, maxMonths = 30_000): { month: number; record: HazardRecord } | null {
  for (let m = 0; m < maxMonths; m++) {
    const records = rollMonthlyHazards(state, fixedNow, m);
    const destroyed = records.find(r => r.destroyed);
    if (destroyed) return { month: m, record: destroyed };
  }
  return null;
}

describe('resolveHazardHit — tiered destruction math (audit A4)', () => {
  it('destruction threshold escalates with asset tier (0.70 → 0.90)', () => {
    expect(destructionThresholdForTier(1)).toBeCloseTo(0.70);
    expect(destructionThresholdForTier(2)).toBeCloseTo(0.75);
    expect(destructionThresholdForTier(5)).toBeCloseTo(0.90);
    expect(destructionThresholdForTier(9)).toBeCloseTo(0.90); // capped
  });

  it('a severe hit destroys an exposed tier-1 asset (v1 could never)', () => {
    const hit = resolveHazardHit({ rawDamage: 0.95, mitigation: 0, assetTier: 1, insured: false, insuredValue: 0 });
    expect(hit.destroyed).toBe(true);
    expect(hit.insurancePayout).toBe(0); // uninsured → total loss
  });

  it('insurance pays the insured value on destruction', () => {
    const hit = resolveHazardHit({ rawDamage: 0.95, mitigation: 0, assetTier: 1, insured: true, insuredValue: 12_345_678 });
    expect(hit.destroyed).toBe(true);
    expect(hit.insurancePayout).toBe(12_345_678);
  });

  it('the same severe hit does NOT destroy a shielded asset', () => {
    const hit = resolveHazardHit({ rawDamage: 0.95, mitigation: 0.5, assetTier: 1, insured: false, insuredValue: 0 });
    expect(hit.destroyed).toBe(false);
    expect(hit.finalDamage).toBeCloseTo(0.475);
  });

  it('tier protection: damage that kills a t1 asset leaves a t3 asset standing', () => {
    const t1 = resolveHazardHit({ rawDamage: 0.72, mitigation: 0, assetTier: 1, insured: false, insuredValue: 0 });
    const t3 = resolveHazardHit({ rawDamage: 0.72, mitigation: 0, assetTier: 3, insured: false, insuredValue: 0 });
    expect(t1.destroyed).toBe(true);
    expect(t3.destroyed).toBe(false);
  });

  it('mitigation is capped so risk never fully disappears', () => {
    const hit = resolveHazardHit({ rawDamage: 1.0, mitigation: 5, assetTier: 1, insured: false, insuredValue: 0 });
    expect(hit.finalDamage).toBeCloseTo(1 - MITIGATION_CAP, 5);
  });
});

describe('mitigation wiring — modules + workforce become real (audit §1b/§1c)', () => {
  it('a fitted Point Defense Battery raises pirate-raid mitigation by 0.20', () => {
    const base = makeState({
      ships: [{ instanceId: 'ship1', definitionId: 'prospector_drone', name: 'P-1', status: 'idle', currentLocation: 'asteroid_belt', isBuilt: true }],
    });
    const fitted: GameState = {
      ...base,
      moduleInventory: [{ instanceId: 'modinst1', definitionId: 'mod_point_defense', acquiredAtMs: fixedNow }],
      fittedModules: { ship1: ['modinst1'] },
    };
    const without = getShipHazardMitigation(base, 'ship1', 'pirate_raid');
    const withPd = getShipHazardMitigation(fitted, 'ship1', 'pirate_raid');
    expect(withPd - without).toBeCloseTo(0.20, 5);
    // Point defense does NOT help against solar storms
    expect(getShipHazardMitigation(fitted, 'ship1', 'solar_storm'))
      .toBeCloseTo(getShipHazardMitigation(base, 'ship1', 'solar_storm'), 5);
  });

  it('security crew raise building hazard mitigation', () => {
    const bare = makeState({});
    const crewed = makeState({
      workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0, securitys: 5, trainingLevel: 0.5, morale: 1.0, fatigue: 0 },
    });
    const m0 = getBuildingHazardMitigation(bare, 'sat_telecom');
    const m1 = getBuildingHazardMitigation(crewed, 'sat_telecom');
    expect(m1).toBeGreaterThan(m0);
  });
});

describe('end-to-end: severe hazard destroys, insurance pays, protection saves (audit A4)', () => {
  const exposed = beltSatelliteState();
  const found = findDestructionMonth(exposed);

  it('destruction is reachable for a genuinely exposed asset', () => {
    expect(found).not.toBeNull();
    expect(found!.record.severity).toBe('severe');
    expect(found!.record.affectedBuildingInstanceId).toBe('bld_exposed');
  });

  it('insurance makes the player whole (70% of baseCost for buildings)', () => {
    const def = BUILDING_MAP.get('sat_telecom')!;
    expect(found!.record.insurancePayout).toBe(Math.round(def.baseCost * 0.7));

    // applyHazards credits the payout and removes the asset + its services
    const withService = beltSatelliteState({
      activeServices: [{
        definitionId: 'svc_telecom_leo', locationId: 'asteroid_belt',
        linkedBuildingIds: ['bld_exposed'], startDate: { year: 2026, month: 2 }, revenueMultiplier: 1,
      }],
    });
    const applied = applyHazards(withService, [found!.record]);
    expect(applied.state.buildings.find(b => b.instanceId === 'bld_exposed')).toBeUndefined();
    expect(applied.state.activeServices).toHaveLength(0); // no zombie services
    expect(applied.state.money).toBe(withService.money + found!.record.insurancePayout);
    expect(applied.events[0].title).toContain('DESTROYED');
  });

  it('without a policy the same event pays nothing', () => {
    const uninsured = beltSatelliteState({ insuranceActive: false });
    const records = rollMonthlyHazards(uninsured, fixedNow, found!.month);
    const destroyed = records.find(r => r.destroyed)!;
    expect(destroyed).toBeDefined();
    expect(destroyed.insurancePayout).toBe(0);
  });

  it('the SAME world month spares the asset when the player invested in security crew', () => {
    const protectedState = beltSatelliteState({
      workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0, securitys: 8, trainingLevel: 0.5, morale: 1.0, fatigue: 0 },
    });
    const records = rollMonthlyHazards(protectedState, fixedNow, found!.month);
    // Same weather (occurrence + severity + raw damage are world-shared)…
    expect(records.length).toBeGreaterThan(0);
    // …but mitigation saves the asset.
    expect(records.some(r => r.destroyed)).toBe(false);
  });

  it('a warning precedes the severe event (one game-month cadence)', () => {
    const warnings = forecastSevereHazards(exposed, found!.month, fixedNow);
    const warn = warnings.find(w => w.locationId === 'asteroid_belt' && w.type === found!.record.type);
    expect(warn).toBeDefined();
    expect(warn!.severity).toBe('severe');
    expect(warn!.forecastMonthIndex).toBe(found!.month);
  });

  it('non-destroyed ship hits accrue persistent hull damage (mining penalty basis)', () => {
    const shipState = makeState({
      ships: [{ instanceId: 'shipA', definitionId: 'prospector_drone', name: 'P-1', status: 'idle', currentLocation: 'asteroid_belt', isBuilt: true }],
    });
    const record: HazardRecord = {
      id: 'r1', type: 'micrometeorite', severity: 'major', locationId: 'asteroid_belt',
      occurredAtMs: fixedNow, affectedShipInstanceId: 'shipA', targetName: 'P-1',
      damagePct: 0.3, mitigatedPct: 0.1, destroyed: false, insurancePayout: 0, summary: 'test',
    };
    const applied = applyHazards(shipState, [record]);
    expect(applied.state.ships![0].hullDamagePct).toBeCloseTo(0.3);
  });

  it('destroyed ships are removed and pay their insured value (80% baseCost)', () => {
    const shipState = makeState({
      ships: [{ instanceId: 'shipA', definitionId: 'prospector_drone', name: 'P-1', status: 'idle', currentLocation: 'asteroid_belt', isBuilt: true }],
    });
    const def = SHIP_MAP.get('prospector_drone')!;
    const insured = getShipDerivedStats(def).insuredValue;
    const record: HazardRecord = {
      id: 'r2', type: 'pirate_raid', severity: 'severe', locationId: 'asteroid_belt',
      occurredAtMs: fixedNow, affectedShipInstanceId: 'shipA', targetName: 'P-1',
      damagePct: 0.9, mitigatedPct: 0.05, destroyed: true, insurancePayout: insured, summary: 'test',
    };
    const applied = applyHazards(shipState, [record]);
    expect(applied.state.ships).toHaveLength(0);
    expect(applied.state.money).toBe(shipState.money + insured);
  });
});

describe('determinism — seeded rng patterns only (wave constraint)', () => {
  it('the same (month, location, type) always rolls the same outcome', () => {
    const a = rollHazardOccurrence(1234, 'asteroid_belt', 'pirate_raid');
    const b = rollHazardOccurrence(1234, 'asteroid_belt', 'pirate_raid');
    expect(a.occurs).toBe(b.occurs);
    expect(a.severity).toBe(b.severity);
    expect(a.rawDamage).toBe(b.rawDamage);
  });

  it('rollMonthlyHazards is reproducible for the same state + month', () => {
    const state = beltSatelliteState();
    const r1 = rollMonthlyHazards(state, fixedNow, 777);
    const r2 = rollMonthlyHazards(state, fixedNow, 777);
    expect(r1.map(r => [r.type, r.severity, r.damagePct, r.destroyed]))
      .toEqual(r2.map(r => [r.type, r.severity, r.damagePct, r.destroyed]));
  });
});

describe('Protected Frontier gating still holds (wave constraint)', () => {
  let originalDateNow: () => number;
  let randomSpy: jest.SpyInstance;

  beforeEach(() => {
    originalDateNow = Date.now;
    Date.now = () => fixedNow;
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-03-25T12:00:00.000Z');
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99); // suppress legacy random events
  });

  afterEach(() => {
    Date.now = originalDateNow;
    jest.restoreAllMocks();
  });

  it('frontier players see no hazards and pay no insurance premium', () => {
    const frontier = beltSatelliteState({
      frontierStatus: 'active',
      frontierEnteredAtMs: fixedNow - 86_400_000,
    });
    const graduated = beltSatelliteState();

    const premium = getMonthlyInsurancePremium(graduated);
    expect(premium).toBeGreaterThan(0);

    const frontierResult = processTick(frontier);
    const graduatedResult = processTick(graduated);

    // No hazards ever recorded inside the Frontier
    expect(frontierResult.recentHazards || []).toHaveLength(0);
    expect(frontierResult.hazardWarnings || []).toHaveLength(0);

    // Premium charged only outside the Frontier: identical states except
    // frontier status → totalSpent differs by exactly the premium.
    expect(graduatedResult.totalSpent - frontierResult.totalSpent).toBe(premium);
  });
});
