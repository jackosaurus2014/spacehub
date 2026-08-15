/**
 * @jest-environment node
 *
 * Live-Service Wave LS1 "Night Shift" — away operations.
 * Covers: the away-efficiency curve (boundaries, investment bonus, cap),
 * determinism (same state + elapsed time -> identical ledger), the honesty
 * fix (costs can now exceed revenue while away — no net-clamp), command
 * queue chaining during catch-up, forecast-only hazard gating, and the 30s
 * minimum-away threshold.
 */
import { getNewGameState } from '../save-load';
import type { GameState } from '../types';
import {
  getAwayEfficiencyTierForHours,
  getAwayEfficiencyInvestmentBonus,
  getWeightedTicks,
  calculateAwayOperations,
  applyAwayOperations,
} from '../away-operations';
import { AWAY_EFFICIENCY_TIERS, AWAY_EFFICIENCY_INVESTMENT_CAP, TICK_INTERVALS } from '../constants';
import { enqueueBuildOrder } from '../command-queue';

const TICK_MS = TICK_INTERVALS[1];
const NOW = Date.UTC(2026, 5, 1, 12, 0, 0);

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...getNewGameState(),
    money: 1_000_000_000,
    createdAt: NOW - 999_999_999,
    lastTickAt: NOW,
    ...overrides,
  };
}

describe('getAwayEfficiencyTierForHours', () => {
  it('is 100% for the first 12 hours, unaffected by investment (tier 1 is the presence ceiling)', () => {
    expect(getAwayEfficiencyTierForHours(0, 1).efficiency).toBe(1.0);
    expect(getAwayEfficiencyTierForHours(11.99, 0.5).efficiency).toBe(1.0);
  });

  it('matches the spec boundaries with zero investment', () => {
    expect(getAwayEfficiencyTierForHours(12.01, 0).efficiency).toBeCloseTo(0.70);
    expect(getAwayEfficiencyTierForHours(48.01, 0).efficiency).toBeCloseTo(0.40);
    expect(getAwayEfficiencyTierForHours(24 * 7 + 1, 0).efficiency).toBeCloseTo(0.15);
  });

  it('raises tiers 2-4 by the investment bonus, capped at AWAY_EFFICIENCY_INVESTMENT_CAP', () => {
    const raised = getAwayEfficiencyTierForHours(12.01, 0.10);
    expect(raised.efficiency).toBeCloseTo(0.80);
    const capped = getAwayEfficiencyTierForHours(12.01, 5); // absurdly large bonus
    expect(capped.efficiency).toBe(AWAY_EFFICIENCY_INVESTMENT_CAP);
    // Never reaches or exceeds 100% — logging in always beats staying away.
    expect(capped.efficiency).toBeLessThan(1.0);
  });
});

describe('getAwayEfficiencyInvestmentBonus', () => {
  it('is zero with no automation research/workforce', () => {
    const s = baseState({ workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0 } });
    expect(getAwayEfficiencyInvestmentBonus(s)).toBe(0);
  });

  it('adds a fixed bonus per completed automation research', () => {
    const s = baseState({ completedResearch: ['predictive_maintenance', 'digital_twin'], workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0 } });
    expect(getAwayEfficiencyInvestmentBonus(s)).toBeCloseTo(0.10);
  });

  it('adds a bonus from operator workforce share, capped at +0.10', () => {
    const allOperators = baseState({ workforce: { engineers: 0, scientists: 0, miners: 0, operators: 10 } });
    expect(getAwayEfficiencyInvestmentBonus(allOperators)).toBeCloseTo(0.10);
    const halfOperators = baseState({ workforce: { engineers: 10, scientists: 0, miners: 0, operators: 10 } });
    expect(getAwayEfficiencyInvestmentBonus(halfOperators)).toBeCloseTo(0.05);
  });
});

describe('getWeightedTicks', () => {
  it('is zero below one tick', () => {
    expect(getWeightedTicks(TICK_MS - 1, 0)).toBe(0);
  });

  it('at 100% (within tier 1) equals the raw tick count', () => {
    const ms = 6 * 3_600_000; // 6h — inside tier 1
    const totalTicks = Math.floor(ms / TICK_MS);
    expect(getWeightedTicks(ms, 0)).toBe(totalTicks);
  });

  it('integrates across a tier boundary instead of blending', () => {
    // 24h away = 12h @ 1.00 + 12h @ 0.70 (zero investment).
    const ms = 24 * 3_600_000;
    const ticksTier1 = Math.floor((12 * 3_600_000) / TICK_MS);
    const ticksTier2 = Math.floor(ms / TICK_MS) - ticksTier1;
    const expected = ticksTier1 * 1.0 + ticksTier2 * 0.70;
    expect(getWeightedTicks(ms, 0)).toBeCloseTo(expected, 0);
  });

  it('is deterministic for the same inputs', () => {
    const a = getWeightedTicks(50 * 3_600_000, 0.08);
    const b = getWeightedTicks(50 * 3_600_000, 0.08);
    expect(a).toBe(b);
  });
});

describe('calculateAwayOperations', () => {
  it('returns null when away less than 30s', () => {
    const s = baseState({ lastTickAt: NOW - 1000 });
    expect(calculateAwayOperations(s, NOW)).toBeNull();
  });

  it('is deterministic — identical state + elapsed time produce an identical ledger', () => {
    const s = baseState({ lastTickAt: NOW - 6 * 3_600_000 });
    const a = calculateAwayOperations(s, NOW)!;
    const b = calculateAwayOperations(s, NOW)!;
    expect(a.ledger.moneyDelta).toBe(b.ledger.moneyDelta);
    expect(a.ledger.resourcesDelta).toEqual(b.ledger.resourcesDelta);
    expect(a.ledger.gameMonthsProcessed).toBe(b.ledger.gameMonthsProcessed);
    expect(a.state.money).toBe(b.state.money);
  });

  it('lets costs exceed revenue while away — no net-clamp (appendix defect #1 fix)', () => {
    // A single high-payroll workforce with zero revenue-generating services:
    // pure cost accrual should drive money DOWN over a long absence.
    const s = baseState({
      money: 10_000_000_000,
      activeServices: [],
      buildings: [],
      workforce: { engineers: 200, scientists: 200, miners: 200, operators: 200 },
      lastTickAt: NOW - 5 * 24 * 3_600_000, // 5 days away
    });
    const result = calculateAwayOperations(s, NOW)!;
    expect(result.ledger.moneyDelta).toBeLessThan(0);
    expect(result.state.money).toBeLessThan(s.money);
  });

  it('no 8h wall — a longer tier-1 absence earns proportionally more (uncapped time)', () => {
    // Both absences stay strictly inside tier 1 (<=12h, 100% efficiency), so
    // this isolates "uncapped time" from the efficiency curve itself: the
    // old MAX_OFFLINE_HOURS=8 wall would have frozen accrual at hour 8,
    // making an 11h return identical to a 6h one. It no longer does.
    const svcState = (awayMs: number) => baseState({
      activeServices: [{ definitionId: 'svc_launch_small', locationId: 'earth_surface', linkedBuildingIds: [], startDate: { year: 2026, month: 1 }, revenueMultiplier: 1 }],
      buildings: [{ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', buildStartDate: { year: 2026, month: 1 }, completionDate: { year: 2026, month: 1 }, isComplete: true, startedAtMs: NOW - 10_000_000, realDurationSeconds: 1 }],
      workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0 },
      lastTickAt: NOW - awayMs,
    });
    const sixHours = calculateAwayOperations(svcState(6 * 3_600_000), NOW)!;
    const elevenHours = calculateAwayOperations(svcState(11 * 3_600_000), NOW)!;
    expect(elevenHours.ledger.moneyDelta).toBeGreaterThan(sixHours.ledger.moneyDelta);
  });

  it('capped RATE: yield-per-hour shrinks the longer you stay away, even though total time is uncapped', () => {
    // launch_pad_small is a thin-margin building (revenue $5M/mo vs $2M
    // operating + $500K maintenance = $2.5M/mo net AT FULL EFFICIENCY).
    // Maintenance/payroll accrue at FULL rate regardless of away-efficiency
    // (appendix defect #1: "maintenance/payroll accrue truthfully") while
    // revenue is capped by the efficiency curve — so a long "dark ops" (7d+,
    // 15% floor) absence can net WORSE than a short "fresh shift" one for a
    // marginal operation. This is the intended economic tension: automation
    // investment (away-efficiency bonus) or simply logging back in sooner is
    // the counterplay, not a bug.
    const svcState = (awayMs: number) => baseState({
      activeServices: [{ definitionId: 'svc_launch_small', locationId: 'earth_surface', linkedBuildingIds: [], startDate: { year: 2026, month: 1 }, revenueMultiplier: 1 }],
      buildings: [{ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', buildStartDate: { year: 2026, month: 1 }, completionDate: { year: 2026, month: 1 }, isComplete: true, startedAtMs: NOW - 10_000_000, realDurationSeconds: 1 }],
      workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0 },
      lastTickAt: NOW - awayMs,
    });
    const twelveHours = calculateAwayOperations(svcState(12 * 3_600_000), NOW)!; // 100% efficiency throughout
    const eightDays = calculateAwayOperations(svcState(8 * 24 * 3_600_000), NOW)!; // mostly 15% floor
    const twelveHourRate = twelveHours.ledger.moneyDelta / 12;
    const eightDayRate = eightDays.ledger.moneyDelta / (8 * 24);
    expect(eightDayRate).toBeLessThan(twelveHourRate);
  });

  it('chains queued orders during catch-up and reports them in the ledger', () => {
    let s = baseState({ money: 10_000_000_000, lastTickAt: NOW - 3 * 24 * 3_600_000 });
    s = enqueueBuildOrder(s, 'launch_pad_small', 'earth_surface', NOW - 3 * 24 * 3_600_000).state;
    const result = calculateAwayOperations(s, NOW)!;
    expect(result.ledger.queueExecuted.length).toBeGreaterThanOrEqual(1);
    expect(result.state.commandQueue).toHaveLength(0);
    expect(result.state.buildings.length).toBeGreaterThanOrEqual(1);
  });

  it('applyAwayOperations resumes the tick loop from "now"', () => {
    const s = baseState({ lastTickAt: NOW - 3_600_000 });
    const result = calculateAwayOperations(s, NOW)!;
    const applied = applyAwayOperations(s, result);
    expect(applied.lastTickAt).toBe(NOW);
  });

  it('does not apply an unforecast hazard while away (defers to the first live tick)', () => {
    const s = baseState({
      money: 10_000_000_000,
      hazardWarnings: [], // nothing forecast at logout
      buildings: [{ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', buildStartDate: { year: 2026, month: 1 }, completionDate: { year: 2026, month: 1 }, isComplete: true, startedAtMs: NOW - 999_999_999, realDurationSeconds: 1 }],
      lastTickAt: NOW - 60 * 24 * 3_600_000, // ~2 months away
      gameDate: { year: 2026, month: 1 },
    });
    const result = calculateAwayOperations(s, NOW)!;
    expect(result.ledger.hazardsApplied).toHaveLength(0);
  });
});
