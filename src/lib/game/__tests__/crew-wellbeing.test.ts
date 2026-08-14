/**
 * @jest-environment node
 *
 * Audit Wave B — A10 morale writer. The audit found morale/fatigue/training
 * were orphan inputs pinned at a hidden −20% revenue tax ("no writer
 * exists... moraleMultiplier is permanently 0.8"). These tests prove:
 * 1. the default is now a neutral 1.0 with a 0.8–1.15 band,
 * 2. updateCrewWellbeing moves the stats from player-influenceable causes,
 * 3. the engine runs the writer (and charges the training budget) monthly.
 */
import type { GameState } from '../types';
import {
  DEFAULT_WORKFORCE,
  getWorkforceBonuses,
  updateCrewWellbeing,
} from '../workforce';
import { processTick } from '../game-engine';
import { getGlobalGameDate } from '../server-time';
import { loadGame } from '../save-load';
import { SAVE_KEY } from '../constants';

// ─── Band + defaults ─────────────────────────────────────────────────────────

describe('morale multiplier band (audit A10)', () => {
  it('default workforce has neutral morale — no hidden tax', () => {
    expect(DEFAULT_WORKFORCE.morale).toBe(1.0);
    const bonuses = getWorkforceBonuses({ engineers: 0, scientists: 0, miners: 0, operators: 0 });
    expect(bonuses.moraleMultiplier).toBe(1.0);
  });

  it('multiplier clamps to the 0.8–1.15 band', () => {
    const low = getWorkforceBonuses({ engineers: 0, scientists: 0, miners: 0, operators: 0, morale: 0.1 });
    const high = getWorkforceBonuses({ engineers: 0, scientists: 0, miners: 0, operators: 0, morale: 2.0 });
    expect(low.moraleMultiplier).toBe(0.8);
    expect(high.moraleMultiplier).toBe(1.15);
  });
});

// ─── Pure writer model ───────────────────────────────────────────────────────

describe('updateCrewWellbeing', () => {
  const crew = { ...DEFAULT_WORKFORCE, miners: 4 };

  it('training budget raises trainingLevel; zero budget decays it', () => {
    const funded = updateCrewWellbeing(
      { ...crew, trainingBudgetPerCrew: 500_000 },
      { utilization: 0.3, recentHazardCount: 0, cashNegative: false },
    );
    expect(funded.trainingLevel!).toBeGreaterThan(crew.trainingLevel!);
    const unfunded = updateCrewWellbeing(
      { ...crew, trainingBudgetPerCrew: 0 },
      { utilization: 0.3, recentHazardCount: 0, cashNegative: false },
    );
    expect(unfunded.trainingLevel!).toBeLessThan(crew.trainingLevel!);
  });

  it('high utilization builds fatigue; slack crews recover; medics soften it', () => {
    const overworked = updateCrewWellbeing(crew, { utilization: 0.95, recentHazardCount: 0, cashNegative: false });
    expect(overworked.fatigue!).toBeGreaterThan(0);
    const withMedics = updateCrewWellbeing(
      { ...crew, medics: 3 },
      { utilization: 0.95, recentHazardCount: 0, cashNegative: false },
    );
    expect(withMedics.fatigue!).toBeLessThan(overworked.fatigue!);
    const rested = updateCrewWellbeing(
      { ...crew, fatigue: 0.5 },
      { utilization: 0.2, recentHazardCount: 0, cashNegative: false },
    );
    expect(rested.fatigue!).toBeLessThan(0.5);
  });

  it('hazards and cash trouble drop morale; budget + rest recover it toward/above baseline', () => {
    const struck = updateCrewWellbeing(crew, { utilization: 0.3, recentHazardCount: 2, cashNegative: true });
    expect(struck.morale!).toBeLessThan(1.0);
    // Recovery drifts back up
    const recovering = updateCrewWellbeing(
      { ...crew, morale: 0.85, trainingBudgetPerCrew: 200_000 },
      { utilization: 0.2, recentHazardCount: 0, cashNegative: false },
    );
    expect(recovering.morale!).toBeGreaterThan(0.85);
    // Sustained investment can push morale above 1.0 (bonus band), capped at 1.15
    let wf: typeof crew = { ...crew, morale: 1.0, trainingBudgetPerCrew: 200_000, fatigue: 0 };
    for (let i = 0; i < 30; i++) {
      wf = { ...wf, ...updateCrewWellbeing(wf, { utilization: 0.2, recentHazardCount: 0, cashNegative: false }), trainingBudgetPerCrew: 200_000 };
    }
    expect(wf.morale!).toBeGreaterThan(1.0);
    expect(wf.morale!).toBeLessThanOrEqual(1.15);
  });

  it('is deterministic', () => {
    const a = updateCrewWellbeing(crew, { utilization: 0.8, recentHazardCount: 1, cashNegative: false });
    const b = updateCrewWellbeing(crew, { utilization: 0.8, recentHazardCount: 1, cashNegative: false });
    expect(a).toEqual(b);
  });
});

// ─── Engine integration (month-end tick) ─────────────────────────────────────

describe('engine wiring — monthly wellbeing pass', () => {
  function monthEndState(overrides: Partial<GameState> = {}): GameState {
    const now = Date.now();
    const globalDate = getGlobalGameDate();
    // gameDate one month behind the global clock → isMonthEnd true this tick
    const prevMonth = globalDate.month === 1
      ? { year: globalDate.year - 1, month: 12 }
      : { year: globalDate.year, month: globalDate.month - 1 };
    return {
      version: 1, createdAt: now, lastTickAt: now,
      money: 50_000_000, totalEarned: 0, totalSpent: 0,
      gameDate: prevMonth, tickSpeed: 1,
      buildings: [], completedResearch: [], activeResearch: null, activeServices: [],
      unlockedLocations: ['earth_surface', 'leo'], resources: {}, eventLog: [],
      stats: {
        rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
        researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
      },
      npcCompanies: [],
      // Frontier shields the month-end hazard roll → deterministic
      frontierStatus: 'active', frontierEnteredAtMs: now,
      ...overrides,
    };
  }

  let randomSpy: jest.SpyInstance;
  beforeEach(() => {
    // Suppress month-end random/market event rolls for determinism
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);
  });
  afterEach(() => randomSpy.mockRestore());

  it('charges the training budget and raises trainingLevel at month end', () => {
    const state = monthEndState({
      workforce: {
        engineers: 0, scientists: 0, miners: 2, operators: 0,
        morale: 1.0, fatigue: 0, trainingLevel: 0.5, trainingBudgetPerCrew: 200_000,
      },
    });
    const out = processTick(state);
    expect(out.workforce!.trainingLevel!).toBeGreaterThan(0.5);
    // 2 crew × $200K budget = $400K charged (only cost this tick besides payroll)
    const payroll = Math.round((2 * 400_000) / 30); // 2 miners, fractional payroll
    expect(state.money - out.money).toBe(400_000 + payroll);
  });

  it('recent hazards drag morale down at month end', () => {
    const now = Date.now();
    const state = monthEndState({
      workforce: {
        engineers: 0, scientists: 0, miners: 2, operators: 0,
        morale: 1.0, fatigue: 0, trainingLevel: 0.5, trainingBudgetPerCrew: 0,
      },
      recentHazards: [{
        id: 'h1', type: 'pirate_raid', locationId: 'leo', occurredAtMs: now - 60_000,
        damagePct: 0.2, mitigatedPct: 0.1, destroyed: false, insurancePayout: 0,
        summary: 'Pirate raid',
      }],
    });
    const out = processTick(state);
    expect(out.workforce!.morale!).toBeLessThan(1.0);
  });

  it('W13: corporate-doctrine constituency approval feeds morale at month end (board politics, no direct engine wiring change to the causes above)', () => {
    const workforce = {
      engineers: 4, scientists: 0, miners: 0, operators: 0,
      morale: 1.0, fatigue: 0, trainingLevel: 0.5, trainingBudgetPerCrew: 0,
    };
    const neutral = processTick(monthEndState({ workforce: { ...workforce } }));
    // Aggressive Schedule + Lean Compensation both hurt Orbital Engineers'
    // Union approval (corporate-doctrine.ts POLICY_PREFERENCE), which should
    // pull morale below the neutral-doctrine run given the same crew/hazards.
    const withBadDoctrine = processTick(monthEndState({
      workforce: { ...workforce },
      corporateDoctrine: { activePolicies: { operations: 'aggressive_schedule', compensation: 'lean_compensation' }, lastSwitchedMonth: {} },
    }));
    expect(withBadDoctrine.workforce!.morale!).toBeLessThan(neutral.workforce!.morale!);
  });

  it('does not run the writer mid-month', () => {
    const now = Date.now();
    const globalDate = getGlobalGameDate();
    const state = monthEndState({
      gameDate: { year: globalDate.year, month: globalDate.month }, // current month → no boundary
      workforce: {
        engineers: 0, scientists: 0, miners: 2, operators: 0,
        morale: 1.0, fatigue: 0, trainingLevel: 0.5, trainingBudgetPerCrew: 200_000,
      },
      createdAt: now,
    });
    const out = processTick(state);
    expect(out.workforce!.trainingLevel).toBe(0.5); // unchanged mid-month
  });
});

// ─── Save migration (V14) ────────────────────────────────────────────────────

describe('save-load V14 morale migration', () => {
  const storage = new Map<string, string>();
  beforeAll(() => {
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
      removeItem: (k: string) => void storage.delete(k),
      clear: () => storage.clear(),
      key: () => null,
      length: 0,
    } as unknown as Storage;
  });
  afterAll(() => {
    delete (globalThis as unknown as { localStorage?: Storage }).localStorage;
  });

  it('lifts the old hidden 0.8 morale default to 1.0 and seeds V14 fields', () => {
    const oldSave = {
      version: 1, createdAt: 1, lastTickAt: 1,
      money: 1_000_000, totalEarned: 0, totalSpent: 0,
      gameDate: { year: 2026, month: 5 }, tickSpeed: 1,
      buildings: [], completedResearch: [], activeResearch: null, activeServices: [],
      unlockedLocations: ['earth_surface'], resources: {},
      eventLog: [], stats: {},
      workforce: { engineers: 1, scientists: 0, miners: 0, operators: 0, morale: 0.8 },
    };
    storage.set(SAVE_KEY, JSON.stringify(oldSave));
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.workforce!.morale).toBe(1.0);
    expect(loaded!.workforce!.fatigue).toBe(0);
    expect(loaded!.zoneStandings).toEqual([]);
    expect(loaded!.activeIntelPerks).toEqual([]);
    expect(loaded!.claimedLeagueBoostSeasonIds).toEqual([]);
  });
});
