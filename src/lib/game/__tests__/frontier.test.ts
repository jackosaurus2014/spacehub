/**
 * @jest-environment node
 */
import type { GameState } from '../types';
import {
  FRONTIER_DURATION_MS,
  FRONTIER_GRADUATION_NET_WORTH,
  FRONTIER_HARD_CAP_NET_WORTH,
  FRONTIER_CONTRACT_PAYOUT_MULTIPLIER,
  isInFrontier,
  getFrontierTimer,
  shouldAutoGraduate,
  graduateFrontier,
  initializeFrontier,
  canBeTargetedByRivals,
  canBeTargetedByEspionage,
  isHostileEventSuppressed,
  getFrontierSummary,
  computeNetWorth,
} from '../frontier';

function newGame(createdAtMs: number, overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1, createdAt: createdAtMs, lastTickAt: createdAtMs,
    money: 100_000_000, totalEarned: 0, totalSpent: 0,
    gameDate: { year: 2150, month: 1 }, tickSpeed: 1,
    buildings: [], completedResearch: [], activeResearch: null, activeServices: [],
    unlockedLocations: ['earth_surface'], resources: {}, eventLog: [],
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    ...initializeFrontier(createdAtMs),
    ...overrides,
  };
}

describe('frontier — initialization', () => {
  it('initializeFrontier sets active status and entered timestamp', () => {
    const result = initializeFrontier(12345);
    expect(result.frontierStatus).toBe('active');
    expect(result.frontierEnteredAtMs).toBe(12345);
  });
});

describe('frontier — isInFrontier', () => {
  it('true for a fresh new game', () => {
    const s = newGame(1_000_000);
    expect(isInFrontier(s, 1_000_001)).toBe(true);
  });

  it('false after 30 days have passed', () => {
    const s = newGame(0);
    expect(isInFrontier(s, FRONTIER_DURATION_MS + 1)).toBe(false);
  });

  it('false once player has graduated', () => {
    const s = newGame(0);
    const graduated = graduateFrontier(s, 100);
    expect(isInFrontier(graduated, 100)).toBe(false);
  });

  it('false when net worth exceeds hard cap', () => {
    const s = newGame(0, {
      money: FRONTIER_HARD_CAP_NET_WORTH,
      totalEarned: FRONTIER_HARD_CAP_NET_WORTH,
    });
    expect(isInFrontier(s, 1000)).toBe(false);
  });

  it('false for players with frontierStatus = "none"', () => {
    const s = newGame(0, { frontierStatus: 'none' });
    expect(isInFrontier(s, 1000)).toBe(false);
  });
});

describe('frontier — timer', () => {
  it('remaining time decreases over the 30-day window', () => {
    const s = newGame(0);
    const day15 = 15 * 24 * 60 * 60 * 1000;
    const timer = getFrontierTimer(s, day15);
    expect(timer.elapsedMs).toBe(day15);
    expect(timer.remainingMs).toBe(FRONTIER_DURATION_MS - day15);
  });

  it('remaining is 0 past the expiry time', () => {
    const s = newGame(0);
    const timer = getFrontierTimer(s, FRONTIER_DURATION_MS * 2);
    expect(timer.remainingMs).toBe(0);
  });
});

describe('frontier — auto-graduation', () => {
  it('graduates when time elapsed AND net worth over threshold', () => {
    const s = newGame(0, {
      money: FRONTIER_GRADUATION_NET_WORTH * 1.1,
      totalEarned: FRONTIER_GRADUATION_NET_WORTH * 1.1,
    });
    expect(shouldAutoGraduate(s, FRONTIER_DURATION_MS + 1000)).toBe(true);
  });

  it('graduates any time once hard cap is reached', () => {
    const s = newGame(0, {
      money: FRONTIER_HARD_CAP_NET_WORTH,
      totalEarned: FRONTIER_HARD_CAP_NET_WORTH,
    });
    expect(shouldAutoGraduate(s, 1000)).toBe(true);
  });

  it('grants 7-day grace period if net worth still below threshold at day 30', () => {
    const s = newGame(0, { money: 100_000, totalEarned: 100_000 });
    const day31 = FRONTIER_DURATION_MS + 24 * 60 * 60 * 1000;  // 1 day past
    expect(shouldAutoGraduate(s, day31)).toBe(false);
    const day38 = FRONTIER_DURATION_MS + 8 * 24 * 60 * 60 * 1000;  // 8 days past
    expect(shouldAutoGraduate(s, day38)).toBe(true);
  });
});

describe('frontier — graduate transitions state', () => {
  it('sets status to graduated and records timestamp', () => {
    const s = newGame(0);
    const after = graduateFrontier(s, 5000);
    expect(after.frontierStatus).toBe('graduated');
    expect(after.frontierGraduatedAtMs).toBe(5000);
  });

  it('is no-op for already-graduated players', () => {
    const s = newGame(0);
    const once = graduateFrontier(s, 1000);
    const twice = graduateFrontier(once, 2000);
    expect(twice).toBe(once);
  });
});

describe('frontier — protections', () => {
  it('rivals cannot target while in Frontier', () => {
    const s = newGame(0);
    expect(canBeTargetedByRivals(s, 1000)).toBe(false);
  });

  it('espionage cannot target while in Frontier', () => {
    const s = newGame(0);
    expect(canBeTargetedByEspionage(s, 1000)).toBe(false);
  });

  it('hostile events suppressed while in Frontier', () => {
    const s = newGame(0);
    expect(isHostileEventSuppressed(s, 1000)).toBe(true);
  });

  it('protections lift once graduated', () => {
    const s = newGame(0);
    const graduated = graduateFrontier(s, 100);
    expect(canBeTargetedByRivals(graduated, 200)).toBe(true);
    expect(canBeTargetedByEspionage(graduated, 200)).toBe(true);
    expect(isHostileEventSuppressed(graduated, 200)).toBe(false);
  });
});

describe('frontier — contract payout multiplier', () => {
  it('multiplier is greater than 1 so Frontier actually rewards', () => {
    expect(FRONTIER_CONTRACT_PAYOUT_MULTIPLIER).toBeGreaterThan(1);
  });
});

describe('frontier — summary for UI', () => {
  it('returns inFrontier true with sensible fields for a fresh game', () => {
    const s = newGame(1000);
    const summary = getFrontierSummary(s, 1001);
    expect(summary.status).toBe('active');
    expect(summary.inFrontier).toBe(true);
    expect(summary.remainingDays).toBeGreaterThan(29);
    expect(summary.remainingDays).toBeLessThanOrEqual(30);
    expect(summary.netWorthProgressPct).toBeGreaterThanOrEqual(0);
  });

  it('reports graduation-ready state when conditions are met', () => {
    const s = newGame(0, {
      money: FRONTIER_GRADUATION_NET_WORTH * 1.1,
      totalEarned: FRONTIER_GRADUATION_NET_WORTH * 1.1,
    });
    const summary = getFrontierSummary(s, FRONTIER_DURATION_MS + 1000);
    expect(summary.autoGraduateReady).toBe(true);
  });
});

describe('frontier — net worth', () => {
  it('computeNetWorth = money + totalEarned - totalSpent', () => {
    const s = newGame(0, { money: 100, totalEarned: 50, totalSpent: 20 });
    expect(computeNetWorth(s)).toBe(130);
  });
});
