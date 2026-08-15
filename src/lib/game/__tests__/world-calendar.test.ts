/**
 * @jest-environment node
 *
 * Live-Service Wave LS3 — Mission Calendar pure derivation.
 * Covers: deterministic ordering, timezone (store UTC / render local)
 * handling of the weekly-occurrence helper, and per-category derivation
 * from mock system states (senate docket, expeditions, command queue).
 */
import { getNewGameState } from '../save-load';
import type { GameState, ExpeditionState } from '../types';
import {
  getMissionCalendarEntries, groupCalendarEntriesByDay, getNextWeeklyUtcOccurrence,
} from '../world-calendar';
import { SERVER_EPOCH_MS, REAL_SECONDS_PER_GAME_MONTH } from '../server-time';

const NOW = Date.UTC(2026, 7, 14, 12, 0, 0); // Friday, 2026-08-14 12:00 UTC

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...getNewGameState(),
    ...overrides,
  };
}

describe('getNextWeeklyUtcOccurrence (fixed-UTC appointment helper)', () => {
  it('returns a timestamp strictly after now, on the requested UTC weekday/time', () => {
    const result = getNextWeeklyUtcOccurrence(NOW, 1, 0, 5); // next Monday 00:05 UTC
    expect(result).toBeGreaterThan(NOW);
    const d = new Date(result);
    expect(d.getUTCDay()).toBe(1);
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(5);
  });

  it('rolls over to next week when "now" is exactly at the target moment', () => {
    const monday = getNextWeeklyUtcOccurrence(NOW, 1, 0, 5);
    const again = getNextWeeklyUtcOccurrence(monday, 1, 0, 5);
    expect(again).toBe(monday + 7 * 24 * 60 * 60 * 1000);
  });

  it('is stable across different UTC offsets of "now" within the same instant', () => {
    // Same instant, described differently — pure function of nowMs only.
    const a = getNextWeeklyUtcOccurrence(NOW, 3, 14, 30);
    const b = getNextWeeklyUtcOccurrence(NOW + 0, 3, 14, 30);
    expect(a).toBe(b);
  });

  it('every weekday target lands on the correct UTC weekday', () => {
    for (let wd = 0; wd < 7; wd++) {
      const result = getNextWeeklyUtcOccurrence(NOW, wd, 9, 0);
      expect(new Date(result).getUTCDay()).toBe(wd);
    }
  });
});

describe('getMissionCalendarEntries — determinism + ordering', () => {
  it('is sorted ascending by atMs', () => {
    const state = baseState({
      accordDocket: { quarterIndex: 30, measureIds: ['m1', 'm2'], resolved: false },
    });
    const entries = getMissionCalendarEntries(state, { nowMs: NOW, horizonDays: 400 });
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].atMs).toBeGreaterThanOrEqual(entries[i - 1].atMs);
    }
  });

  it('every entry falls within [now, now + horizon]', () => {
    const state = baseState();
    const horizonDays = 21;
    const entries = getMissionCalendarEntries(state, { nowMs: NOW, horizonDays });
    const horizonMs = horizonDays * 24 * 60 * 60 * 1000;
    for (const e of entries) {
      expect(e.atMs).toBeGreaterThanOrEqual(NOW);
      expect(e.atMs).toBeLessThanOrEqual(NOW + horizonMs);
    }
  });

  it('identical inputs produce an identical entry list (pure function)', () => {
    const state = baseState({
      accordDocket: { quarterIndex: 30, measureIds: ['m1'], resolved: false },
    });
    const a = getMissionCalendarEntries(state, { nowMs: NOW, horizonDays: 14 });
    const b = getMissionCalendarEntries(state, { nowMs: NOW, horizonDays: 14 });
    expect(a).toEqual(b);
  });

  it('a wider horizon never drops an entry the narrower horizon found', () => {
    const state = baseState({
      accordDocket: { quarterIndex: 30, measureIds: ['m1'], resolved: false },
    });
    const narrow = getMissionCalendarEntries(state, { nowMs: NOW, horizonDays: 7 }).map(e => e.id);
    const wide = getMissionCalendarEntries(state, { nowMs: NOW, horizonDays: 60 }).map(e => e.id);
    for (const id of narrow) expect(wide).toContain(id);
  });
});

describe('senate docket entry', () => {
  it('surfaces the docket close at the correct world-clock UTC timestamp', () => {
    const quarterIndex = 30; // arbitrary quarter boundary
    const state = baseState({
      accordDocket: { quarterIndex, measureIds: ['m1', 'm2', 'm3'], resolved: false },
    });
    const closeMs = SERVER_EPOCH_MS + (quarterIndex + 3) * REAL_SECONDS_PER_GAME_MONTH * 1000;
    const entries = getMissionCalendarEntries(state, { nowMs: closeMs - 1000, horizonDays: 365 });
    const senateEntry = entries.find(e => e.category === 'senate');
    expect(senateEntry).toBeDefined();
    expect(senateEntry!.atMs).toBe(closeMs);
    expect(senateEntry!.worldShared).toBe(true);
  });

  it('omits the senate entry once the docket is resolved', () => {
    const state = baseState({
      accordDocket: { quarterIndex: 30, measureIds: ['m1'], resolved: true },
    });
    const entries = getMissionCalendarEntries(state, { nowMs: NOW, horizonDays: 365 });
    expect(entries.some(e => e.category === 'senate')).toBe(false);
  });

  it('omits the senate entry entirely when no docket exists yet', () => {
    const state = baseState({ accordDocket: null });
    const entries = getMissionCalendarEntries(state, { nowMs: NOW, horizonDays: 365 });
    expect(entries.some(e => e.category === 'senate')).toBe(false);
  });
});

describe('league entry', () => {
  it('always appears within a 7-day horizon (weekly appointment)', () => {
    const state = baseState();
    const entries = getMissionCalendarEntries(state, { nowMs: NOW, horizonDays: 7 });
    const leagueEntry = entries.find(e => e.category === 'league');
    expect(leagueEntry).toBeDefined();
    expect(leagueEntry!.kind).toBe('lock');
    expect(leagueEntry!.worldShared).toBe(true);
  });
});

describe('corporate era entry (Live-Service Wave LS4)', () => {
  it('surfaces the active era end at its exact wall-clock endsAtMs', () => {
    const state = baseState({
      corporateEras: {
        currentEra: {
          eraIndex: 0,
          charterId: 'expansion_era',
          startedAtMs: NOW - 1000,
          endsAtMs: NOW + 5 * 24 * 60 * 60 * 1000,
          bracketAtStart: 1,
          startSnapshot: {
            buildingsCompleted: 0, researchCompleted: 0, resourcesMined: 0,
            shipsBuilt: 0, reputation: 0, expeditionsLaunched: 0, totalSpent: 0, netWorth: 0,
          },
        },
        completedEras: [],
      },
    });
    const entries = getMissionCalendarEntries(state, { nowMs: NOW, horizonDays: 14 });
    const eraEntry = entries.find(e => e.category === 'corporate_era');
    expect(eraEntry).toBeDefined();
    expect(eraEntry!.atMs).toBe(NOW + 5 * 24 * 60 * 60 * 1000);
    expect(eraEntry!.kind).toBe('ends');
    expect(eraEntry!.worldShared).toBe(false); // personal to this save, not world-shared
    expect(eraEntry!.title).toContain('Expansion Era');
  });

  it('omits the entry when no era is active', () => {
    const state = baseState({ corporateEras: { currentEra: null, completedEras: [] } });
    const entries = getMissionCalendarEntries(state, { nowMs: NOW, horizonDays: 14 });
    expect(entries.some(e => e.category === 'corporate_era')).toBe(false);
  });

  it('omits the entry once the era end falls outside the horizon', () => {
    const state = baseState({
      corporateEras: {
        currentEra: {
          eraIndex: 0,
          charterId: 'expansion_era',
          startedAtMs: NOW - 1000,
          endsAtMs: NOW + 100 * 24 * 60 * 60 * 1000, // far beyond a 14-day horizon
          bracketAtStart: 1,
          startSnapshot: {
            buildingsCompleted: 0, researchCompleted: 0, resourcesMined: 0,
            shipsBuilt: 0, reputation: 0, expeditionsLaunched: 0, totalSpent: 0, netWorth: 0,
          },
        },
        completedEras: [],
      },
    });
    const entries = getMissionCalendarEntries(state, { nowMs: NOW, horizonDays: 14 });
    expect(entries.some(e => e.category === 'corporate_era')).toBe(false);
  });
});

describe('expedition entries', () => {
  function mockExpedition(overrides: Partial<ExpeditionState> = {}): ExpeditionState {
    return {
      id: 'exp1',
      targetSystemId: 'alpha_centauri',
      shipInstanceId: 'ship1',
      shipDefinitionId: 'starfarer_explorer',
      crew: 12,
      phase: 'outbound',
      launchedAtMs: NOW,
      launchGameMonth: 0,
      outboundMonths: 12,
      exploreMonths: 6,
      monthsElapsed: 2,
      seed: 12345,
      insured: true,
      insurancePremiumPaid: 1000,
      extraShielding: false,
      totalCost: 1_000_000_000,
      hullIntegrity: 1.0,
      hazardLog: [],
      ...overrides,
    };
  }

  it('projects an ETA for the next phase transition (arrival)', () => {
    const state = baseState({ expeditions: [mockExpedition()] });
    const entries = getMissionCalendarEntries(state, { nowMs: NOW, horizonDays: 3650 });
    const expEntry = entries.find(e => e.category === 'expedition');
    expect(expEntry).toBeDefined();
    expect(expEntry!.kind).toBe('transition');
    expect(expEntry!.worldShared).toBe(false);
    expect(expEntry!.estimated).toBe(true);
    // 12 - 2 = 10 months remaining until arrival
    const expectedMonthsRemaining = 10;
    const expectedAtMs = NOW + expectedMonthsRemaining * REAL_SECONDS_PER_GAME_MONTH * 1000;
    expect(expEntry!.atMs).toBe(expectedAtMs);
  });

  it('skips completed/lost/colonizing expeditions', () => {
    const state = baseState({
      expeditions: [
        mockExpedition({ id: 'e1', phase: 'completed' }),
        mockExpedition({ id: 'e2', phase: 'lost' }),
        mockExpedition({ id: 'e3', phase: 'colonizing' }),
      ],
    });
    const entries = getMissionCalendarEntries(state, { nowMs: NOW, horizonDays: 3650 });
    expect(entries.some(e => e.category === 'expedition')).toBe(false);
  });

  it('a "returning" expedition surfaces a "returns" entry', () => {
    const state = baseState({
      expeditions: [mockExpedition({ phase: 'returning', monthsElapsed: 20 })],
    });
    const entries = getMissionCalendarEntries(state, { nowMs: NOW, horizonDays: 3650 });
    const expEntry = entries.find(e => e.category === 'expedition');
    expect(expEntry!.kind).toBe('returns');
    // total mission months = 12(out) + 6(explore) + 12(return) = 30; 30-20=10 remaining
    const expectedAtMs = NOW + 10 * REAL_SECONDS_PER_GAME_MONTH * 1000;
    expect(expEntry!.atMs).toBe(expectedAtMs);
  });
});

describe('command-queue entries', () => {
  it('surfaces an active research completion at its exact wall-clock ETA', () => {
    const startedAtMs = NOW - 1000;
    const realDurationSeconds = 3600; // 1 hour
    const state = baseState({
      activeResearch: {
        definitionId: 'basic_automation',
        startDate: { year: 2026, month: 1 },
        progressMonths: 0,
        totalMonths: 1,
        startedAtMs,
        realDurationSeconds,
      },
    });
    const entries = getMissionCalendarEntries(state, { nowMs: NOW, horizonDays: 1 });
    const queueEntry = entries.find(e => e.category === 'queue');
    expect(queueEntry).toBeDefined();
    expect(queueEntry!.atMs).toBe(startedAtMs + realDurationSeconds * 1000);
    expect(queueEntry!.worldShared).toBe(false);
  });

  it('surfaces an in-progress building completion', () => {
    const startedAtMs = NOW - 500;
    const realDurationSeconds = 7200;
    const state = baseState({
      buildings: [{
        instanceId: 'b1', definitionId: 'solar_farm_1', locationId: 'earth_surface',
        buildStartDate: { year: 2026, month: 1 }, completionDate: { year: 2026, month: 2 },
        isComplete: false, startedAtMs, realDurationSeconds,
      }],
    });
    const entries = getMissionCalendarEntries(state, { nowMs: NOW, horizonDays: 1 });
    const queueEntry = entries.find(e => e.category === 'queue');
    expect(queueEntry).toBeDefined();
    expect(queueEntry!.atMs).toBe(startedAtMs + realDurationSeconds * 1000);
  });

  it('omits already-complete buildings', () => {
    const state = baseState({
      buildings: [{
        instanceId: 'b1', definitionId: 'solar_farm_1', locationId: 'earth_surface',
        buildStartDate: { year: 2026, month: 1 }, completionDate: { year: 2026, month: 2 },
        isComplete: true, startedAtMs: NOW - 10_000, realDurationSeconds: 100,
      }],
    });
    const entries = getMissionCalendarEntries(state, { nowMs: NOW, horizonDays: 1 });
    expect(entries.some(e => e.category === 'queue')).toBe(false);
  });
});

describe('groupCalendarEntriesByDay', () => {
  it('groups entries occurring on the same local day together', () => {
    const dayStart = new Date(2026, 7, 14, 1, 0, 0).getTime(); // local midday-ish
    const sameDayLater = new Date(2026, 7, 14, 20, 0, 0).getTime();
    const nextDay = new Date(2026, 7, 15, 1, 0, 0).getTime();
    const entries = [
      { id: 'a', category: 'league' as const, title: 'A', icon: '🏁', atMs: dayStart, kind: 'lock' as const, detail: '', worldShared: true },
      { id: 'b', category: 'league' as const, title: 'B', icon: '🏁', atMs: sameDayLater, kind: 'lock' as const, detail: '', worldShared: true },
      { id: 'c', category: 'league' as const, title: 'C', icon: '🏁', atMs: nextDay, kind: 'lock' as const, detail: '', worldShared: true },
    ];
    const groups = groupCalendarEntriesByDay(entries);
    expect(groups).toHaveLength(2);
    expect(groups[0].entries.map(e => e.id)).toEqual(['a', 'b']);
    expect(groups[1].entries.map(e => e.id)).toEqual(['c']);
  });

  it('produces no groups for an empty entry list', () => {
    expect(groupCalendarEntriesByDay([])).toEqual([]);
  });
});
