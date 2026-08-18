/**
 * @jest-environment node
 *
 * Balance Pass 4 (docs/BALANCE.md "Pass 4") — wage-indexed hiring.
 *
 * Pass 3's S8 audit verified talent poaching (O4) was dead content because
 * getHireCost charged 6 months' BASE salary with no wage-index term:
 * rehiring replacement crew strictly dominated retention at every index
 * level. The fix: the REAL charged hire price is
 * getHireCostWithWageIndex = getHireCost (voucher applied) × hire wage index,
 * where the hire wage index is the live snapshot index CAPPED at neutral
 * (1.0) for Protected-Frontier corps (premiums-pay-penalties-wait, matching
 * service-pricing's pool floor and mining's frontierSpotFloor postures).
 */
import type { GameState } from '../types';
import type { WorkforceState } from '../workforce';
import { getHireCost, WORKER_MAP } from '../workforce';
import {
  getHireWageIndex,
  getHireCostWithWageIndex,
  getPayrollWageIndex,
  getMonthlyPayrollForState,
  getPayrollAdjustedSalary,
  getMonthlyPayrollWithWageIndex,
  WAGE_INDEX_MAX,
} from '../labor-market';
import { isInFrontier } from '../frontier';

const NOW = 10_000_000; // deterministic clock for every call

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1, createdAt: NOW - 1000, lastTickAt: NOW,
    money: 0, totalEarned: 0, totalSpent: 0,
    gameDate: { year: 2150, month: 1 }, tickSpeed: 1,
    buildings: [], completedResearch: [], activeResearch: null, activeServices: [],
    unlockedLocations: ['earth_surface', 'leo'], resources: {}, eventLog: [],
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    frontierStatus: 'graduated',
    ...overrides,
  } as GameState;
}

const laborMarket = (engineerIndex: number) =>
  ({ index: { engineer: engineerIndex }, asOf: NOW });

const ENGINEER_BASE_HIRE = WORKER_MAP.get('engineer')!.salary * 6;

describe('getHireWageIndex — the index hiring actually pays', () => {
  it('neutral 1.0 with no labor-market snapshot', () => {
    expect(getHireWageIndex(baseState(), 'engineer', NOW)).toBe(1.0);
  });

  it('graduated corp pays the live index, hot or slack', () => {
    expect(getHireWageIndex(baseState({ laborMarket: laborMarket(1.6) }), 'engineer', NOW)).toBe(1.6);
    expect(getHireWageIndex(baseState({ laborMarket: laborMarket(0.8) }), 'engineer', NOW)).toBe(0.8);
  });

  it('index clamps to the wage band', () => {
    expect(getHireWageIndex(baseState({ laborMarket: laborMarket(9) }), 'engineer', NOW)).toBe(WAGE_INDEX_MAX);
  });

  it('Frontier shield: overheated index CAPPED at neutral (penalties wait)', () => {
    const s = baseState({ frontierStatus: 'active', frontierEnteredAtMs: NOW - 1000, laborMarket: laborMarket(1.6) });
    expect(isInFrontier(s, NOW)).toBe(true);
    expect(getHireWageIndex(s, 'engineer', NOW)).toBe(1.0);
  });

  it('Frontier shield: slack index still discounts (premiums pay)', () => {
    const s = baseState({ frontierStatus: 'active', frontierEnteredAtMs: NOW - 1000, laborMarket: laborMarket(0.85) });
    expect(getHireWageIndex(s, 'engineer', NOW)).toBe(0.85);
  });

  it('the shield ends at graduation — same snapshot, full index', () => {
    const s = baseState({ frontierStatus: 'graduated', laborMarket: laborMarket(1.6) });
    expect(getHireWageIndex(s, 'engineer', NOW)).toBe(1.6);
  });
});

describe('getHireCostWithWageIndex — the REAL charged hire price', () => {
  it('no snapshot: identical to the pre-Pass-4 base cost (opt-safe)', () => {
    expect(getHireCostWithWageIndex(baseState(), 'engineer', NOW)).toBe(ENGINEER_BASE_HIRE);
  });

  it('scales by the live index (graduated)', () => {
    const s = baseState({ laborMarket: laborMarket(1.6) });
    expect(getHireCostWithWageIndex(s, 'engineer', NOW)).toBe(Math.round(ENGINEER_BASE_HIRE * 1.6));
  });

  it('Frontier corp never pays above base at a hot index', () => {
    const s = baseState({ frontierStatus: 'active', frontierEnteredAtMs: NOW - 1000, laborMarket: laborMarket(1.6) });
    expect(getHireCostWithWageIndex(s, 'engineer', NOW)).toBe(ENGINEER_BASE_HIRE);
  });

  it('composes with the espionage headhunt voucher (A8) — voucher THEN index', () => {
    const s = baseState({
      laborMarket: laborMarket(1.6),
      activeIntelPerks: [{ type: 'headhunt_voucher', discount: 0.5, expiresAtMs: NOW + 3600_000 }],
    });
    const discountedBase = getHireCost('engineer', s, NOW); // voucher applied
    expect(discountedBase).toBe(Math.round(ENGINEER_BASE_HIRE * 0.5));
    expect(getHireCostWithWageIndex(s, 'engineer', NOW)).toBe(Math.round(discountedBase * 1.6));
  });

  it('Pass 9 — PAYROLL shield: getPayrollWageIndex mirrors getHireWageIndex exactly', () => {
    // Frontier: hot index capped at neutral, slack index still discounts.
    const hot = baseState({ frontierStatus: 'active', frontierEnteredAtMs: NOW - 1000, laborMarket: laborMarket(1.6) });
    expect(getPayrollWageIndex(hot, 'engineer', NOW)).toBe(1.0);
    expect(getPayrollWageIndex(hot, 'engineer', NOW)).toBe(getHireWageIndex(hot, 'engineer', NOW));
    const slack = baseState({ frontierStatus: 'active', frontierEnteredAtMs: NOW - 1000, laborMarket: laborMarket(0.85) });
    expect(getPayrollWageIndex(slack, 'engineer', NOW)).toBe(0.85);
    // Graduated: full index, hot or slack.
    const grad = baseState({ frontierStatus: 'graduated', laborMarket: laborMarket(1.6) });
    expect(getPayrollWageIndex(grad, 'engineer', NOW)).toBe(1.6);
  });

  it('Pass 9 — getMonthlyPayrollForState: Frontier caps hot payroll at base; graduated pays in full', () => {
    const wf: WorkforceState = { engineers: 10, scientists: 0, miners: 5, operators: 0 };
    const salaryE = WORKER_MAP.get('engineer')!.salary;
    const salaryM = WORKER_MAP.get('miner')!.salary;
    const snap = { index: { engineer: 1.6, miner: 0.9 }, asOf: NOW };
    // Frontier: engineer capped at 1.0, miner keeps its 0.9 discount.
    const frontier = baseState({ frontierStatus: 'active', frontierEnteredAtMs: NOW - 1000, laborMarket: snap });
    expect(getMonthlyPayrollForState(wf, frontier, NOW))
      .toBe(Math.round(10 * salaryE * 1.0 + 5 * salaryM * 0.9));
    // Graduated: identical to the unshielded Wave-E5 payroll.
    const grad = baseState({ frontierStatus: 'graduated', laborMarket: snap });
    expect(getMonthlyPayrollForState(wf, grad, NOW))
      .toBe(getMonthlyPayrollWithWageIndex(wf, snap, NOW));
  });

  it('Pass 9 — getPayrollAdjustedSalary shows what payroll charges (Frontier-capped)', () => {
    const salaryE = WORKER_MAP.get('engineer')!.salary;
    const frontier = baseState({ frontierStatus: 'active', frontierEnteredAtMs: NOW - 1000, laborMarket: laborMarket(1.6) });
    expect(getPayrollAdjustedSalary(frontier, 'engineer', NOW)).toBe(salaryE);
    const grad = baseState({ frontierStatus: 'graduated', laborMarket: laborMarket(1.6) });
    expect(getPayrollAdjustedSalary(grad, 'engineer', NOW)).toBe(Math.round(salaryE * 1.6));
  });

  it('S8 economics: rehire is no longer strictly dominant over retention', () => {
    // Retention = bonus × 0.75 = n·salary·6·idx·1.5·0.75 = n·salary·6·idx·1.125.
    // Wage-indexed rehire = n·salary·6·idx — 12.5% cheaper on paper, but a
    // poach walk also bumps the index (+0.02/head) and forfeits training.
    // The Pass 3 gap (rehire flat while retention scaled with idx) is gone:
    // both now scale with the SAME index.
    const idx = 1.6;
    const s = baseState({ laborMarket: laborMarket(idx) });
    const rehirePerHead = getHireCostWithWageIndex(s, 'engineer', NOW);
    const retentionPerHead = WORKER_MAP.get('engineer')!.salary * 6 * idx * 1.5 * 0.75;
    expect(rehirePerHead).toBe(Math.round(ENGINEER_BASE_HIRE * idx));
    expect(retentionPerHead / rehirePerHead).toBeCloseTo(1.125, 5);
  });
});
