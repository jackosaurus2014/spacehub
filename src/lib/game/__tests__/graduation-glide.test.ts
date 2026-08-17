/**
 * @jest-environment node
 *
 * Balance Pass 6 (docs/BALANCE.md "Pass 6") — C1 "the graduation cliff".
 * The Frontier demand-pool shield now GLIDES instead of vanishing at
 * graduation: for GRADUATION_GLIDE_MS a below-neutral pool multiplier blends
 * linearly from 1.0 (neutral) down to the true market rate, giving a fresh
 * graduate one bounded window to build out of the floored starter pools.
 *
 * Guards (per the Pass-6 spec):
 *  - glide active right after graduation (multiplier = 1.0 exactly)
 *  - decays linearly to the market rate by GRADUATION_GLIDE_MS
 *  - gone for veterans (long-graduated, or no graduation timestamp)
 *  - NEVER boosts above 1.0, and premiums (mult > 1) pass through untouched
 *  - the Frontier itself is unchanged (active status still floors at 1.0)
 *  - live tick: a just-graduated save out-earns a veteran under floored
 *    pools; away catch-up shares the same math by construction (both engines
 *    call getServiceDemandMultiplier — asserted here at the away level too)
 */
import type { GameState } from '../types';
import { getNewGameState } from '../save-load';
import { getGlobalGameDate } from '../server-time';
import { processTick } from '../game-engine';
import { calculateAwayOperations } from '../away-operations';
import {
  GRADUATION_GLIDE_MS,
  getGraduationGlideFraction,
  applyGraduationGlide,
} from '../frontier';
import { getServiceDemandMultiplier, DEMAND_MULT_FLOOR } from '../service-pricing';
import type { DemandPoolSnapshot } from '../demand-pools';

// ─── Unit: getGraduationGlideFraction ───────────────────────────────────────

const NOW = 1_800_000_000_000;

function graduatedState(graduatedAtMs: number | undefined, overrides: Partial<GameState> = {}): GameState {
  return {
    ...getNewGameState(),
    frontierStatus: 'graduated',
    frontierGraduatedAtMs: graduatedAtMs,
    ...overrides,
  } as GameState;
}

describe('getGraduationGlideFraction', () => {
  it('is 1.0 at the moment of graduation', () => {
    expect(getGraduationGlideFraction(graduatedState(NOW), NOW)).toBe(1);
  });

  it('decays linearly: 0.5 at half the window, 0.25 at three quarters', () => {
    expect(getGraduationGlideFraction(graduatedState(NOW - GRADUATION_GLIDE_MS / 2), NOW)).toBeCloseTo(0.5, 10);
    expect(getGraduationGlideFraction(graduatedState(NOW - (GRADUATION_GLIDE_MS * 3) / 4), NOW)).toBeCloseTo(0.25, 10);
  });

  it('is 0 at and after GRADUATION_GLIDE_MS (veterans get nothing)', () => {
    expect(getGraduationGlideFraction(graduatedState(NOW - GRADUATION_GLIDE_MS), NOW)).toBe(0);
    expect(getGraduationGlideFraction(graduatedState(NOW - GRADUATION_GLIDE_MS * 10), NOW)).toBe(0);
  });

  it('is 0 without a graduation timestamp (pre-glide saves, defensive)', () => {
    expect(getGraduationGlideFraction(graduatedState(undefined), NOW)).toBe(0);
  });

  it('is 0 for non-graduated statuses — the Frontier branch owns those', () => {
    const active = { ...getNewGameState(), frontierStatus: 'active' } as GameState;
    const none = { ...getNewGameState(), frontierStatus: 'none' } as GameState;
    expect(getGraduationGlideFraction(active, NOW)).toBe(0);
    expect(getGraduationGlideFraction(none, NOW)).toBe(0);
  });
});

describe('applyGraduationGlide', () => {
  it('blends a below-neutral mult toward 1.0 by the fraction', () => {
    expect(applyGraduationGlide(0.35, 1)).toBe(1);
    expect(applyGraduationGlide(0.35, 0.5)).toBeCloseTo(0.675, 10);
    expect(applyGraduationGlide(0.35, 0)).toBe(0.35);
  });

  it('never boosts: premiums pass through untouched, blend never exceeds 1.0', () => {
    expect(applyGraduationGlide(1.2, 1)).toBe(1.2);
    expect(applyGraduationGlide(1.0, 1)).toBe(1.0);
    expect(applyGraduationGlide(0.35, 2)).toBe(1); // fraction over-clamp
  });
});

// ─── Through THE multiplier source (getServiceDemandMultiplier) ─────────────

function flooredSnapshot(asOf: number, mult = DEMAND_MULT_FLOOR): DemandPoolSnapshot {
  return {
    asOf,
    pools: {
      'leo:telecom': {
        locationId: 'leo', category: 'telecom', mult,
        dTotal: 10_000_000, dNpc: 10_000_000, cSupply: 100_000_000,
        playerShare: 0, topShares: [], supplierCount: 5,
      },
    },
  };
}

function poolState(graduatedAtMs: number | undefined, mult?: number): GameState {
  return graduatedState(graduatedAtMs, {
    demandPools: flooredSnapshot(NOW, mult),
    demandPoolPhaseInStartMonth: null, // fresh world — no phase-in damping
  });
}

describe('getServiceDemandMultiplier — post-graduation glide', () => {
  const MONTH = 100;

  it('pays exactly neutral (1.0) right after graduation despite a floored pool', () => {
    expect(getServiceDemandMultiplier(poolState(NOW), 'svc_telecom_leo', 'leo', MONTH, NOW)).toBe(1);
  });

  it('pays the linear blend mid-glide', () => {
    const halfway = getServiceDemandMultiplier(poolState(NOW - GRADUATION_GLIDE_MS / 2), 'svc_telecom_leo', 'leo', MONTH, NOW);
    expect(halfway).toBeCloseTo(0.35 + (1 - 0.35) * 0.5, 6);
  });

  it('pays the true market rate once the glide has fully decayed', () => {
    const done = getServiceDemandMultiplier(poolState(NOW - GRADUATION_GLIDE_MS), 'svc_telecom_leo', 'leo', MONTH, NOW);
    expect(done).toBe(DEMAND_MULT_FLOOR);
  });

  it('gives veterans (no timestamp) the raw market rate', () => {
    expect(getServiceDemandMultiplier(poolState(undefined), 'svc_telecom_leo', 'leo', MONTH, NOW)).toBe(DEMAND_MULT_FLOOR);
  });

  it('leaves scarcity premiums untouched during the glide (never boosts above 1.0... and never trims a premium)', () => {
    expect(getServiceDemandMultiplier(poolState(NOW, 1.2), 'svc_telecom_leo', 'leo', MONTH, NOW)).toBe(1.2);
  });

  it('Frontier-active saves are unchanged — the original shield still floors at 1.0', () => {
    const s = {
      ...getNewGameState(),
      frontierStatus: 'active',
      frontierEnteredAtMs: NOW,
      createdAt: NOW,
      demandPools: flooredSnapshot(NOW),
      demandPoolPhaseInStartMonth: null,
    } as GameState;
    expect(getServiceDemandMultiplier(s, 'svc_telecom_leo', 'leo', MONTH, NOW)).toBe(1);
  });
});

// ─── Live tick + away catch-up (shared-source parity) ───────────────────────

function telecomOperator(graduatedAtMs: number | undefined, now: number): GameState {
  const globalDate = getGlobalGameDate(now);
  return {
    ...getNewGameState(),
    npcCompanies: [],
    money: 100_000_000,
    createdAt: now - 40 * 24 * 3600 * 1000,
    lastTickAt: now,
    frontierStatus: 'graduated',
    frontierGraduatedAtMs: graduatedAtMs,
    gameDate: { year: globalDate.year, month: globalDate.month },
    demandPools: flooredSnapshot(now),
    demandPoolPhaseInStartMonth: null,
    buildings: [{
      instanceId: 't1', definitionId: 'sat_telecom', locationId: 'leo',
      buildStartDate: { year: 2026, month: 1 }, completionDate: { year: 2026, month: 1 },
      isComplete: true, startedAtMs: 0, realDurationSeconds: 0,
    }],
    activeServices: [{
      definitionId: 'svc_telecom_leo', locationId: 'leo',
      startDate: { year: 2026, month: 1 }, revenueMultiplier: 1, linkedBuildingIds: ['t1'],
    }],
  } as GameState;
}

describe('engines — a just-graduated save out-earns a veteran under a floored pool', () => {
  it('live tick (game-engine.ts §1)', () => {
    const now = Date.now();
    const before = telecomOperator(now, now).money;
    const gradDelta = processTick(telecomOperator(now, now)).money - before;
    const vetDelta = processTick(telecomOperator(now - GRADUATION_GLIDE_MS - 1, now)).money - before;
    expect(gradDelta).toBeGreaterThan(vetDelta);
  });

  it('away catch-up (away-operations.ts) — same glide math via the shared multiplier source', () => {
    const now = Date.now();
    const away = (graduatedAtMs: number) => {
      const s = telecomOperator(graduatedAtMs, now);
      s.lastTickAt = now - 3600 * 1000; // 1h away, same game month
      const r = calculateAwayOperations(s, now);
      expect(r).not.toBeNull();
      return r!.ledger.moneyDelta;
    };
    expect(away(now)).toBeGreaterThan(away(now - GRADUATION_GLIDE_MS - 1));
  });
});
