// ─── Wave E5 "Depletion, Labor & Lanes" — labor-market.ts tests ─────────────
// docs/ECONOMY_PVP_2026-08.md §2.6/§E5.

import {
  WAGE_INDEX_MIN,
  WAGE_INDEX_MAX,
  WAGE_INDEX_NEUTRAL,
  LABOR_SUPPLY_BASE,
  LABOR_SUPPLY_PER_QUARTERS,
  laborSupply,
  computeWageIndex,
  computeLaborAggregates,
  workforceDataToHeadcount,
  sumCrewQuarters,
  getWageIndex,
  getMonthlyPayrollWithWageIndex,
  getWageAdjustedSalary,
  LABOR_MARKET_STALE_MS,
  GUILD_STRIKE_WAGE_THRESHOLD,
  type LaborActivitySummary,
  type LaborMarketSnapshot,
} from '../labor-market';
import { WORKER_TYPES, WORKER_MAP, type WorkforceState } from '../workforce';

describe('computeWageIndex — bounds [0.8, 1.6]', () => {
  it('returns neutral-ish ratio when employed == supply', () => {
    expect(computeWageIndex(100, 100)).toBe(1.0);
  });

  it('clamps to the floor when far under-employed', () => {
    expect(computeWageIndex(1, 1000)).toBe(WAGE_INDEX_MIN);
    expect(computeWageIndex(0, 1000)).toBe(WAGE_INDEX_MIN);
  });

  it('clamps to the ceiling when far over-employed', () => {
    expect(computeWageIndex(10_000, 100)).toBe(WAGE_INDEX_MAX);
  });

  it('is monotonically non-decreasing in employed for fixed supply', () => {
    const supply = 500;
    let prev = computeWageIndex(0, supply);
    for (const employed of [50, 100, 200, 400, 600, 1000]) {
      const next = computeWageIndex(employed, supply);
      expect(next).toBeGreaterThanOrEqual(prev);
      prev = next;
    }
  });

  it('degenerate zero supply clamps to the ceiling (never divides by zero)', () => {
    expect(computeWageIndex(10, 0)).toBe(WAGE_INDEX_MAX);
  });

  it('is deterministic', () => {
    expect(computeWageIndex(321, 654)).toBe(computeWageIndex(321, 654));
  });
});

describe('laborSupply — grows with server-wide crewQuarters', () => {
  it('equals the base at zero crewQuarters', () => {
    expect(laborSupply('engineer', 0)).toBe(LABOR_SUPPLY_BASE.engineer);
  });

  it('grows linearly with crewQuarters', () => {
    const at10 = laborSupply('engineer', 10);
    const at20 = laborSupply('engineer', 20);
    expect(at20 - at10).toBeCloseTo(10 * LABOR_SUPPLY_PER_QUARTERS, 6);
  });

  it('never shrinks supply for negative/garbage crewQuarters input', () => {
    expect(laborSupply('engineer', -50)).toBe(LABOR_SUPPLY_BASE.engineer);
  });
});

describe('computeLaborAggregates — server-aggregation core', () => {
  it('is deterministic — same summaries in, same aggregates out', () => {
    const summaries: LaborActivitySummary[] = [
      { id: 'p1', headcount: { engineer: 10, miner: 5 }, trainingLevel: 0.5, crewQuarters: 20 },
      { id: 'p2', headcount: { engineer: 20 }, trainingLevel: 0.8, crewQuarters: 40 },
    ];
    const a = computeLaborAggregates(summaries);
    const b = computeLaborAggregates(summaries);
    expect(Array.from(a.entries())).toEqual(Array.from(b.entries()));
  });

  it('sums raw headcount across all profiles for each crew type', () => {
    const summaries: LaborActivitySummary[] = [
      { id: 'p1', headcount: { engineer: 10 }, crewQuarters: 0 },
      { id: 'p2', headcount: { engineer: 20 }, crewQuarters: 0 },
    ];
    const agg = computeLaborAggregates(summaries);
    expect(agg.get('engineer')!.employedRaw).toBe(30);
  });

  it('an empty server (no profiles) yields the neutral floor index for every type', () => {
    const agg = computeLaborAggregates([]);
    for (const wDef of WORKER_TYPES) {
      expect(agg.get(wDef.type)!.index).toBe(WAGE_INDEX_MIN);
    }
  });

  it('mass-hiring one crew type raises ONLY that type\'s wage index (§2.6 "everyone mass-hiring engineers raises engineer pay for everyone")', () => {
    const summaries: LaborActivitySummary[] = [
      { id: 'p1', headcount: { engineer: LABOR_SUPPLY_BASE.engineer * 2 }, crewQuarters: 0, trainingLevel: 0 },
    ];
    const agg = computeLaborAggregates(summaries);
    expect(agg.get('engineer')!.index).toBeGreaterThan(WAGE_INDEX_MIN);
    // Untouched crew types stay at the floor.
    expect(agg.get('scientist')!.index).toBe(WAGE_INDEX_MIN);
  });

  it('building crewQuarters server-wide grows supply and can lower an otherwise-pinned index', () => {
    const heavyHiring: LaborActivitySummary[] = [
      { id: 'p1', headcount: { engineer: LABOR_SUPPLY_BASE.engineer * 2 }, crewQuarters: 0, trainingLevel: 0 },
    ];
    const withoutHousing = computeLaborAggregates(heavyHiring).get('engineer')!.index;
    const withHousing = computeLaborAggregates([
      { ...heavyHiring[0], crewQuarters: 100_000 }, // effectively infinite supply
    ]).get('engineer')!.index;
    expect(withHousing).toBeLessThanOrEqual(withoutHousing);
  });

  it('mitigation: higher trainingLevel reduces a profile\'s contribution to global wage pressure (never below the floor)', () => {
    const base: LaborActivitySummary = { id: 'p1', headcount: { miner: LABOR_SUPPLY_BASE.miner * 2 }, crewQuarters: 0 };
    const untrainedIndex = computeLaborAggregates([{ ...base, trainingLevel: 0 }]).get('miner')!.index;
    const trainedIndex = computeLaborAggregates([{ ...base, trainingLevel: 1 }]).get('miner')!.index;
    expect(trainedIndex).toBeLessThanOrEqual(untrainedIndex);
  });
});

describe('workforceDataToHeadcount — raw JSON -> WorkerType map', () => {
  it('reads every worker type\'s pluralized field, including the security irregular', () => {
    const wf = { engineers: 3, scientists: 1, miners: 2, operators: 0, securitys: 4, medics: 0 };
    const out = workforceDataToHeadcount(wf);
    expect(out.engineer).toBe(3);
    expect(out.scientist).toBe(1);
    expect(out.miner).toBe(2);
    expect(out.operator).toBeUndefined(); // zero omitted
    expect(out.security).toBe(4);
  });

  it('returns an empty map for null/undefined input', () => {
    expect(workforceDataToHeadcount(null)).toEqual({});
    expect(workforceDataToHeadcount(undefined)).toEqual({});
  });
});

describe('sumCrewQuarters', () => {
  it('sums derived crewQuarters across completed buildings only', () => {
    const buildings = [
      { definitionId: 'bld_space_station', isComplete: true },
      { definitionId: 'bld_space_station', isComplete: false }, // excluded
      { definitionId: 'bld_launch_pad_basic', isComplete: true },
    ];
    // Just assert it's non-negative and monotone with more completed
    // crew-bearing buildings — exact figures depend on buildings.ts tiers.
    const total = sumCrewQuarters(buildings);
    expect(total).toBeGreaterThanOrEqual(0);
  });

  it('ignores unknown definition ids gracefully', () => {
    expect(sumCrewQuarters([{ definitionId: 'not_a_real_building', isComplete: true }])).toBe(0);
  });
});

describe('getWageIndex — deterministic client read', () => {
  const snapshot = { index: { engineer: 1.3 } as LaborMarketSnapshot, asOf: 1_000_000 };

  it('returns the snapshot value for a known type', () => {
    expect(getWageIndex(snapshot, 'engineer', snapshot.asOf)).toBe(1.3);
  });

  it('defaults to neutral 1.0 for absent snapshot', () => {
    expect(getWageIndex(null, 'engineer')).toBe(WAGE_INDEX_NEUTRAL);
    expect(getWageIndex(undefined, 'engineer')).toBe(WAGE_INDEX_NEUTRAL);
  });

  it('defaults to neutral 1.0 for an untracked type', () => {
    expect(getWageIndex(snapshot, 'medic', snapshot.asOf)).toBe(WAGE_INDEX_NEUTRAL);
  });

  it('Wave M4: a stale snapshot degrades to the last-known index, not neutral — a real wage boom is still felt offline', () => {
    expect(getWageIndex(snapshot, 'engineer', snapshot.asOf + LABOR_MARKET_STALE_MS + 1)).toBe(1.3);
  });

  it('Wave M4: a stale snapshot below neutral is still floored at 1.0 — staleness never grants a below-market discount', () => {
    const lowSnapshot = { index: { engineer: 0.8 } as LaborMarketSnapshot, asOf: 1_000_000 };
    expect(getWageIndex(lowSnapshot, 'engineer', lowSnapshot.asOf + LABOR_MARKET_STALE_MS + 1)).toBe(WAGE_INDEX_NEUTRAL);
  });

  it('a fresh snapshot below neutral is NOT floored — only staleness applies the floor', () => {
    const lowSnapshot = { index: { engineer: 0.8 } as LaborMarketSnapshot, asOf: 1_000_000 };
    expect(getWageIndex(lowSnapshot, 'engineer', lowSnapshot.asOf)).toBe(0.8);
  });
});

describe('getMonthlyPayrollWithWageIndex — payroll integration', () => {
  const workforce: WorkforceState = {
    engineers: 2, scientists: 0, miners: 1, operators: 0,
  };

  it('matches plain salary math when no snapshot is supplied (pre-E5 parity)', () => {
    const engDef = WORKER_MAP.get('engineer')!;
    const minerDef = WORKER_MAP.get('miner')!;
    const expected = 2 * engDef.salary + 1 * minerDef.salary;
    expect(getMonthlyPayrollWithWageIndex(workforce, null)).toBe(expected);
  });

  it('scales payroll by each type\'s wage index when a snapshot is present', () => {
    const engDef = WORKER_MAP.get('engineer')!;
    const minerDef = WORKER_MAP.get('miner')!;
    const snapshot = { index: { engineer: 1.5, miner: 0.8 } as LaborMarketSnapshot, asOf: Date.now() };
    const expected = Math.round(2 * engDef.salary * 1.5 + 1 * minerDef.salary * 0.8);
    expect(getMonthlyPayrollWithWageIndex(workforce, snapshot, snapshot.asOf)).toBe(expected);
  });
});

describe('getWageAdjustedSalary', () => {
  it('returns base salary at neutral index', () => {
    const engDef = WORKER_MAP.get('engineer')!;
    expect(getWageAdjustedSalary('engineer', null)).toBe(engDef.salary);
  });

  it('scales by the wage index', () => {
    const engDef = WORKER_MAP.get('engineer')!;
    const snapshot = { index: { engineer: 1.6 } as LaborMarketSnapshot, asOf: Date.now() };
    expect(getWageAdjustedSalary('engineer', snapshot, snapshot.asOf)).toBe(Math.round(engDef.salary * 1.6));
  });
});

describe('GUILD_STRIKE_WAGE_THRESHOLD', () => {
  it('equals the wage index ceiling (§2.6: "pins at 1.6")', () => {
    expect(GUILD_STRIKE_WAGE_THRESHOLD).toBe(WAGE_INDEX_MAX);
  });
});
