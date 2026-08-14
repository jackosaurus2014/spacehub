/**
 * @jest-environment node
 */
import type { GameState } from '../types';
import {
  getTotalGameMonthsElapsed,
  getCurrentQuarterIndex,
  getCompletedQuarterIndex,
  shouldGenerateQuarterlyReport,
  generateQuarterlyReport,
  recordQuarterlyReport,
} from '../quarterly-reports';
import { STARTING_YEAR } from '../constants';
import { SAVE_KEY } from '../constants';
import { loadGame, getNewGameState } from '../save-load';

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    createdAt: 0,
    lastTickAt: 0,
    money: 500_000_000,
    totalEarned: 500_000_000,
    totalSpent: 0,
    gameDate: { year: STARTING_YEAR, month: 1 },
    tickSpeed: 1,
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface'],
    resources: {},
    eventLog: [],
    ships: [],
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    ...overrides,
  };
}

// ─── Game-time → quarter derivation ─────────────────────────────────────────

describe('quarterly-reports — game-time derivation', () => {
  it('getTotalGameMonthsElapsed is 0 in the starting month', () => {
    expect(getTotalGameMonthsElapsed({ year: STARTING_YEAR, month: 1 })).toBe(0);
  });

  it('getTotalGameMonthsElapsed counts whole months across year boundaries', () => {
    expect(getTotalGameMonthsElapsed({ year: STARTING_YEAR + 1, month: 1 })).toBe(12);
    expect(getTotalGameMonthsElapsed({ year: STARTING_YEAR, month: 7 })).toBe(6);
  });

  it('getCurrentQuarterIndex is 0 for months 0-2, 1 for months 3-5', () => {
    expect(getCurrentQuarterIndex({ year: STARTING_YEAR, month: 1 })).toBe(0);
    expect(getCurrentQuarterIndex({ year: STARTING_YEAR, month: 3 })).toBe(0);
    expect(getCurrentQuarterIndex({ year: STARTING_YEAR, month: 4 })).toBe(1);
    expect(getCurrentQuarterIndex({ year: STARTING_YEAR, month: 6 })).toBe(1);
    expect(getCurrentQuarterIndex({ year: STARTING_YEAR, month: 7 })).toBe(2);
  });

  it('getCompletedQuarterIndex is -1 until the first quarter (3 months) has fully elapsed', () => {
    expect(getCompletedQuarterIndex({ year: STARTING_YEAR, month: 1 })).toBe(-1);
    expect(getCompletedQuarterIndex({ year: STARTING_YEAR, month: 3 })).toBe(-1);
    // Month 4 = 3 whole months elapsed = quarter index 1 current = quarter 0 completed
    expect(getCompletedQuarterIndex({ year: STARTING_YEAR, month: 4 })).toBe(0);
    expect(getCompletedQuarterIndex({ year: STARTING_YEAR, month: 7 })).toBe(1);
  });
});

// ─── Trigger check ───────────────────────────────────────────────────────────

describe('quarterly-reports — shouldGenerateQuarterlyReport', () => {
  it('false while still inside the first quarter', () => {
    const s = baseState({ gameDate: { year: STARTING_YEAR, month: 2 } });
    expect(shouldGenerateQuarterlyReport(s)).toBe(false);
  });

  it('true once the first quarter has completed and no report exists yet', () => {
    const s = baseState({ gameDate: { year: STARTING_YEAR, month: 4 } });
    expect(shouldGenerateQuarterlyReport(s)).toBe(true);
  });

  it('false again immediately after a report for the current completed quarter is stored', () => {
    const s = baseState({
      gameDate: { year: STARTING_YEAR, month: 4 },
      quarterlyReports: [{
        id: 'r1', quarterIndex: 0, quarterNumber: 1, gameYear: STARTING_YEAR, quarterOfYear: 1,
        generatedAtMs: 1000, gameDate: { year: STARTING_YEAR, month: 4 },
        revenue: 0, costs: 0, profit: 0, netWorth: 0, fleetCount: 0, buildingCount: 0,
        corporationTier: 1, notableEvents: [], growthRatePct: null,
      }],
    });
    expect(shouldGenerateQuarterlyReport(s)).toBe(false);
  });

  it('true again once a second quarter has also completed', () => {
    const s = baseState({
      gameDate: { year: STARTING_YEAR, month: 7 }, // quarter index 1 completed
      quarterlyReports: [{
        id: 'r1', quarterIndex: 0, quarterNumber: 1, gameYear: STARTING_YEAR, quarterOfYear: 1,
        generatedAtMs: 1000, gameDate: { year: STARTING_YEAR, month: 4 },
        revenue: 0, costs: 0, profit: 0, netWorth: 0, fleetCount: 0, buildingCount: 0,
        corporationTier: 1, notableEvents: [], growthRatePct: null,
      }],
    });
    expect(shouldGenerateQuarterlyReport(s)).toBe(true);
  });
});

// ─── Generation ──────────────────────────────────────────────────────────────

describe('quarterly-reports — generateQuarterlyReport', () => {
  it('produces the correct quarter numbering and snapshot fields', () => {
    const s = baseState({
      gameDate: { year: STARTING_YEAR, month: 4 },
      buildings: [{
        instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface',
        buildStartDate: { year: STARTING_YEAR, month: 1 }, completionDate: { year: STARTING_YEAR, month: 1 },
        isComplete: true, startedAtMs: 0, realDurationSeconds: 0,
      }],
      ships: [{ instanceId: 's1', definitionId: 'freighter_light', name: 'Test Ship', status: 'idle', currentLocation: 'earth_surface', isBuilt: true }],
      corporationTier: 2,
    });
    const report = generateQuarterlyReport(s, 5000);

    expect(report.quarterIndex).toBe(0);
    expect(report.quarterNumber).toBe(1);
    expect(report.quarterOfYear).toBe(1);
    expect(report.gameYear).toBe(STARTING_YEAR);
    expect(report.generatedAtMs).toBe(5000);
    expect(report.fleetCount).toBe(1);
    expect(report.buildingCount).toBe(1);
    expect(report.corporationTier).toBe(2);
    expect(report.netWorth).toBe(s.money + s.totalEarned - s.totalSpent);
    expect(report.growthRatePct).toBeNull(); // first report, nothing to compare against
  });

  it('computes growth rate relative to the prior stored report', () => {
    const s = baseState({
      gameDate: { year: STARTING_YEAR, month: 7 },
      money: 1_000_000_000,
      totalEarned: 0,
      totalSpent: 0,
      quarterlyReports: [{
        id: 'r1', quarterIndex: 0, quarterNumber: 1, gameYear: STARTING_YEAR, quarterOfYear: 1,
        generatedAtMs: 1000, gameDate: { year: STARTING_YEAR, month: 4 },
        revenue: 0, costs: 0, profit: 0, netWorth: 500_000_000, fleetCount: 0, buildingCount: 0,
        corporationTier: 1, notableEvents: [], growthRatePct: null,
      }],
    });
    const report = generateQuarterlyReport(s, 9000);
    expect(report.quarterIndex).toBe(1);
    expect(report.quarterNumber).toBe(2);
    // netWorth went from 500M to 1B = +100%
    expect(report.growthRatePct).toBeCloseTo(100, 5);
  });

  it('pulls milestone event titles that fall within the completed quarter window', () => {
    const s = baseState({
      gameDate: { year: STARTING_YEAR, month: 4 },
      eventLog: [
        { id: 'e1', date: { year: STARTING_YEAR, month: 2 }, type: 'milestone', title: 'In-quarter milestone', description: '' },
        { id: 'e2', date: { year: STARTING_YEAR, month: 5 }, type: 'milestone', title: 'Future milestone (excluded)', description: '' },
      ],
    });
    const report = generateQuarterlyReport(s, 5000);
    expect(report.notableEvents).toContain('In-quarter milestone');
    expect(report.notableEvents).not.toContain('Future milestone (excluded)');
  });
});

// ─── recordQuarterlyReport ───────────────────────────────────────────────────

describe('quarterly-reports — recordQuarterlyReport', () => {
  it('is a no-op (same state reference) when no quarter boundary has passed', () => {
    const s = baseState({ gameDate: { year: STARTING_YEAR, month: 2 } });
    const result = recordQuarterlyReport(s);
    expect(result).toBe(s);
  });

  it('appends a report and an eventLog entry once a quarter completes', () => {
    const s = baseState({ gameDate: { year: STARTING_YEAR, month: 4 }, eventLog: [] });
    const result = recordQuarterlyReport(s, 5000);
    expect(result).not.toBe(s);
    expect(result.quarterlyReports).toHaveLength(1);
    expect(result.quarterlyReports![0].quarterNumber).toBe(1);
    expect(result.eventLog[0].title).toContain('Quarterly Report');
  });

  it('does not duplicate a report for the same quarter on repeated calls', () => {
    const s = baseState({ gameDate: { year: STARTING_YEAR, month: 4 }, eventLog: [] });
    const once = recordQuarterlyReport(s, 5000);
    const twice = recordQuarterlyReport(once, 6000);
    expect(twice).toBe(once);
    expect(twice.quarterlyReports).toHaveLength(1);
  });
});

// ─── W13 (Corporate Doctrine & Board Politics) — additive hook ─────────────
// docs/4X_BASELINE_2026-08.md §1.7: board directives hook recordQuarterlyReport's
// generation point additively. See corporate-doctrine.test.ts for the pure
// advanceBoardDirectives/evaluateBoardDirective unit coverage; these confirm
// the wiring at this module's call site specifically.

describe('quarterly-reports — W13 board-directive hook', () => {
  it('a fresh corporation\'s first report seeds a directive but evaluates nothing (no eventLog noise)', () => {
    const s = baseState({ gameDate: { year: STARTING_YEAR, month: 4 }, eventLog: [] });
    const result = recordQuarterlyReport(s, 5000);
    expect(result.boardDirectives).toHaveLength(1);
    expect(result.boardDirectives![0].status).toBe('pending');
    // Only the quarterly-report entry — no board-directive entry yet.
    expect(result.eventLog.filter(e => e.title.includes('Board directive'))).toHaveLength(0);
  });

  it('a second quarterly report evaluates the directive seeded by the first', () => {
    const s = baseState({ gameDate: { year: STARTING_YEAR, month: 4 }, eventLog: [], money: 500_000_000 });
    const once = recordQuarterlyReport(s, 5000);
    // Advance three more months to the next quarter boundary.
    const advanced = { ...once, gameDate: { year: STARTING_YEAR, month: 7 } };
    const twice = recordQuarterlyReport(advanced, 9000);
    expect(twice.boardDirectives!.length).toBeGreaterThanOrEqual(1);
    const evaluatedOne = twice.boardDirectives!.find(d => d.status !== 'pending');
    expect(evaluatedOne).toBeDefined();
    expect(twice.eventLog.some(e => e.title.includes('Board directive'))).toBe(true);
  });
});

// ─── Save-migration defaulting (additive-state requirement) ────────────────

describe('quarterly-reports — save-migration defaulting', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    (global as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;
  });

  it('getNewGameState() initializes quarterlyReports to an empty array', () => {
    const fresh = getNewGameState();
    expect(fresh.quarterlyReports).toEqual([]);
  });

  it('loadGame() defaults quarterlyReports to [] for a pre-Wave-8 save that lacks the field', () => {
    const oldSave = getNewGameState();
    // Simulate an old save predating this wave — strip the field entirely,
    // the way a save written before quarterly-reports.ts existed would look.
    const oldSaveRecord = oldSave as unknown as Record<string, unknown>;
    delete oldSaveRecord.quarterlyReports;
    store.set(SAVE_KEY, JSON.stringify(oldSaveRecord));

    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.quarterlyReports).toEqual([]);
  });

  it('loadGame() preserves existing quarterlyReports history on newer saves', () => {
    const existing = getNewGameState();
    existing.quarterlyReports = [{
      id: 'r1', quarterIndex: 0, quarterNumber: 1, gameYear: STARTING_YEAR, quarterOfYear: 1,
      generatedAtMs: 1000, gameDate: { year: STARTING_YEAR, month: 4 },
      revenue: 100, costs: 50, profit: 50, netWorth: 1000, fleetCount: 1, buildingCount: 1,
      corporationTier: 1, notableEvents: [], growthRatePct: null,
    }];
    store.set(SAVE_KEY, JSON.stringify(existing));

    const loaded = loadGame();
    expect(loaded!.quarterlyReports).toHaveLength(1);
    expect(loaded!.quarterlyReports![0].id).toBe('r1');
  });
});
