/**
 * @jest-environment node
 *
 * D5 — flagship economics (docs/GAME_DESIGN_REVIEW_2026-09.md §1 D5,
 * docs/BALANCE.md "D5 flagship economics"). Both halves or neither:
 *  (a) upkeep floor: maintenance = max(authored, baseCost x 0.4%) applies
 *      ONLY at/above FLAGSHIP_COST_FLOOR ($20B) — T1–T3 untouched
 *  (b) T5 research reprice ÷10 on every node whose authored cost was
 *      >= $50B (35 nodes, ledgered in T5_RESEARCH_REPRICED), and flagship
 *      income retuned so every income flagship's first-copy self-payback
 *      lands in FLAGSHIP_PAYBACK_BAND at FLAGSHIP_REFERENCE_STACK — measured
 *      with the SAME harness (scripts/sim-harness.ts marginalCurve) the M1
 *      first-copy-ROI guard uses, so the band is a CI invariant, not a
 *      markdown table.
 */
import { marginalCurve, LOCATION_POWER_PLAN } from '../../../../scripts/sim-harness';
import { BUILDINGS, BUILDING_MAP, getEffectiveMaintenancePerMonth as fromBuildings } from '../buildings';
import { SERVICE_MAP } from '../services';
import { RESEARCH, RESEARCH_MAP, GATE_ONLY_COST_MULTIPLIER } from '../research-tree';
import { NPC_DEMAND_FLOOR } from '../demand-pools';
import {
  FLAGSHIP_COST_FLOOR, FLAGSHIP_UPKEEP_RATE, FLAGSHIP_REFERENCE_STACK, FLAGSHIP_PAYBACK_BAND,
  FLAGSHIP_INCOME_SET, FLAGSHIP_INFRASTRUCTURE_SET,
  T5_RESEARCH_REPRICED, T5_RESEARCH_REPRICE_THRESHOLD, T5_RESEARCH_REPRICE_DIVISOR,
  isFlagshipBuilding, flagshipUpkeepFloor, getEffectiveMaintenancePerMonth, flagshipPaybackMonths,
} from '../flagship-economics';

describe('D5(a) — flagship upkeep floor', () => {
  it('constants: $20B floor, 0.4%/month, reference stack 1.5 x 1.2 x 1.15, band 120–240', () => {
    expect(FLAGSHIP_COST_FLOOR).toBe(20_000_000_000);
    expect(FLAGSHIP_UPKEEP_RATE).toBe(0.004);
    expect(FLAGSHIP_REFERENCE_STACK).toBeCloseTo(2.07, 6);
    expect(FLAGSHIP_PAYBACK_BAND).toEqual({ min: 120, max: 240 });
  });

  it('applies only at/above the floor: every sub-$20B building keeps its authored maintenance', () => {
    for (const def of BUILDINGS) {
      if (def.baseCost < FLAGSHIP_COST_FLOOR) {
        expect(isFlagshipBuilding(def)).toBe(false);
        expect(flagshipUpkeepFloor(def)).toBe(0);
        expect(getEffectiveMaintenancePerMonth(def)).toBe(def.maintenanceCostPerMonth);
      } else {
        expect(isFlagshipBuilding(def)).toBe(true);
        expect(flagshipUpkeepFloor(def)).toBe(Math.round(def.baseCost * FLAGSHIP_UPKEEP_RATE));
        expect(getEffectiveMaintenancePerMonth(def)).toBe(Math.max(def.maintenanceCostPerMonth, Math.round(def.baseCost * FLAGSHIP_UPKEEP_RATE)));
      }
    }
    // buildings.ts re-exports the same function (single source of truth).
    expect(fromBuildings).toBe(getEffectiveMaintenancePerMonth);
  });

  it('no T1–T3 building is a flagship; the set is exactly the 8 income + 3 infrastructure buildings', () => {
    const flagships = BUILDINGS.filter(isFlagshipBuilding).map(b => b.id).sort();
    for (const id of flagships) expect(BUILDING_MAP.get(id)!.tier).toBeGreaterThanOrEqual(4);
    const expected = [...FLAGSHIP_INCOME_SET.map(f => f.buildingId), ...FLAGSHIP_INFRASTRUCTURE_SET].sort();
    expect(flagships).toEqual(expected);
    expect(flagships.length).toBe(11);
  });

  it('worked figures: mining_titan $160M/mo, datacenter_jupiter $80M/mo, outpost_outer $800M/mo', () => {
    expect(getEffectiveMaintenancePerMonth(BUILDING_MAP.get('mining_titan')!)).toBe(160_000_000);
    expect(getEffectiveMaintenancePerMonth(BUILDING_MAP.get('datacenter_jupiter')!)).toBe(80_000_000);
    expect(getEffectiveMaintenancePerMonth(BUILDING_MAP.get('outpost_outer')!)).toBe(800_000_000);
    expect(getEffectiveMaintenancePerMonth(BUILDING_MAP.get('space_station_mars')!)).toBe(10_000_000); // T3, $8B: untouched
  });
});

describe('D5(b) — payback band at the reference stack (harness-measured)', () => {
  const rows = FLAGSHIP_INCOME_SET.map(f => {
    const def = BUILDING_MAP.get(f.buildingId)!;
    const loc = def.requiredLocation;
    const powerOpts = def.powerRequired ? (LOCATION_POWER_PLAN[loc] || {}) : {};
    const [neutral] = marginalCurve(f.buildingId, loc, 1, { ...powerOpts, revenueMult: 1 });
    const [stacked] = marginalCurve(f.buildingId, loc, 1, { ...powerOpts, revenueMult: FLAGSHIP_REFERENCE_STACK });
    return { f, def, neutral, stacked };
  });

  it('every income flagship self-pays in 120–240 game-months at the reference stack', () => {
    const out = rows.filter(r => r.stacked.paybackMonths < FLAGSHIP_PAYBACK_BAND.min || r.stacked.paybackMonths > FLAGSHIP_PAYBACK_BAND.max)
      .map(r => `${r.f.buildingId}: ${r.stacked.paybackMonths} mo`);
    expect(out).toEqual([]);
  });

  it('every income flagship is still profitable on its first copy at NEUTRAL multipliers (the M1/F1 no-trap invariant)', () => {
    const losers = rows.filter(r => r.neutral.fleetNet <= 0).map(r => `${r.f.buildingId}: ${r.neutral.fleetNet}`);
    expect(losers).toEqual([]);
  });

  it('income was raised (never lowered) on every flagship service, and the retuned pool-priced services keep the 3.0x NPC floor rule', () => {
    for (const f of FLAGSHIP_INCOME_SET) {
      const svc = SERVICE_MAP.get(f.serviceId)!;
      expect(svc.revenuePerMonth).toBeGreaterThan(f.prevRevenuePerMonth);
    }
    expect(NPC_DEMAND_FLOOR.jupiter_system!.telecom).toBe(SERVICE_MAP.get('svc_jupiter_relay')!.revenuePerMonth * 3);
    expect(NPC_DEMAND_FLOOR.saturn_system!.fabrication).toBe(SERVICE_MAP.get('svc_titan_processing')!.revenuePerMonth * 3);
    expect(NPC_DEMAND_FLOOR.outer_system!.telecom).toBe(SERVICE_MAP.get('svc_deep_space_comm')!.revenuePerMonth * 3);
  });

  it('back-of-envelope helper agrees with the harness on direction (stack lifts payback into band, neutral stays finite)', () => {
    for (const { f, def } of rows) {
      const svc = SERVICE_MAP.get(f.serviceId)!;
      const atStack = flagshipPaybackMonths(def, svc, FLAGSHIP_REFERENCE_STACK);
      const neutral = flagshipPaybackMonths(def, svc, 1);
      expect(atStack).toBeLessThan(neutral);
      expect(Number.isFinite(neutral)).toBe(true);
      // The helper ignores pools/inputs/overhead, so it is a touch more
      // generous than the harness — never more than ~25% below the band floor.
      expect(atStack).toBeGreaterThanOrEqual(FLAGSHIP_PAYBACK_BAND.min * 0.75);
      expect(atStack).toBeLessThanOrEqual(FLAGSHIP_PAYBACK_BAND.max);
    }
  });
});

describe('D5(b) — T5 research reprice ÷10', () => {
  it('exactly the 35 ledgered nodes were divided by 10; nothing else ever cost >= $50B', () => {
    expect(Object.keys(T5_RESEARCH_REPRICED).length).toBe(35);
    for (const [id, prev] of Object.entries(T5_RESEARCH_REPRICED)) {
      const def = RESEARCH_MAP.get(id);
      expect(def).toBeDefined();
      expect(prev).toBeGreaterThanOrEqual(T5_RESEARCH_REPRICE_THRESHOLD);
      // Row 8 (docs/BALANCE.md "Inert techs rework (2026-09-02)") composes with
      // D5: a node that is BOTH D5-repriced and now `gateOnly` pays both
      // multipliers. antimatter_reactor is the one overlap today.
      const gateMult = def!.gateOnly ? GATE_ONLY_COST_MULTIPLIER : 1;
      expect(def!.baseCostMoney).toBe(Math.round((prev / T5_RESEARCH_REPRICE_DIVISOR) * gateMult));
    }
    for (const def of RESEARCH) {
      if (!(def.id in T5_RESEARCH_REPRICED)) expect(def.baseCostMoney).toBeLessThan(T5_RESEARCH_REPRICE_THRESHOLD);
      if (def.tier <= 3) expect(def.id in T5_RESEARCH_REPRICED).toBe(false); // T1–T3 untouched
    }
  });

  it('the repriced set is 34 T5 nodes plus mega_structures (T4); the 35 nodes summed to $4.925T before and $492.5B after', () => {
    const tiers = Object.keys(T5_RESEARCH_REPRICED).map(id => RESEARCH_MAP.get(id)!.tier);
    expect(tiers.filter(t => t === 5).length).toBe(34);
    expect(tiers.filter(t => t === 4)).toEqual([4]);
    expect(RESEARCH_MAP.get('mega_structures')!.tier).toBe(4);
    const t5Total = RESEARCH.filter(r => r.tier === 5).reduce((a, r) => a + r.baseCostMoney, 0);
    expect(t5Total).toBeLessThan(520_000_000_000);
    expect(t5Total).toBeGreaterThan(450_000_000_000);
    const prevTotal = Object.values(T5_RESEARCH_REPRICED).reduce((a, b) => a + b, 0);
    expect(prevTotal).toBe(4_925_000_000_000);
    // Row 8: the ledgered total is the D5 figure MINUS the extra 75% shaved
    // off any node that is also a gate-only prerequisite now.
    const gateShave = Object.keys(T5_RESEARCH_REPRICED)
      .map(id => RESEARCH_MAP.get(id)!)
      .filter(d => d.gateOnly)
      .reduce((a, d) => a + (T5_RESEARCH_REPRICED[d.id] / T5_RESEARCH_REPRICE_DIVISOR) * (1 - GATE_ONLY_COST_MULTIPLIER), 0);
    const nowTotal = Object.keys(T5_RESEARCH_REPRICED).reduce((a, id) => a + RESEARCH_MAP.get(id)!.baseCostMoney, 0);
    expect(nowTotal).toBe(492_500_000_000 - gateShave);
  });
});
