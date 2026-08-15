/**
 * @jest-environment node
 *
 * Live-Service Wave LS5 — Mission Calendar charter deadline entries.
 * Kept in a separate file from world-calendar.test.ts (LS3's file, also
 * touched by the concurrent LS4 corporate-era wave) to avoid a merge
 * collision — this only exercises the NEW charterEntries deriver via the
 * public getMissionCalendarEntries orchestrator + the myAllianceCharter
 * option, never editing the shared test file directly.
 */
import { getNewGameState } from '../save-load';
import { getMissionCalendarEntries, getNextWeeklyUtcOccurrence, type CalendarCharterLite } from '../world-calendar';

const NOW = Date.UTC(2026, 7, 14, 12, 0, 0); // Friday, 2026-08-14 12:00 UTC
const DAY_MS = 24 * 60 * 60 * 1000;

function charter(overrides: Partial<CalendarCharterLite> = {}): CalendarCharterLite {
  return {
    id: 'charter_1',
    name: 'Consolidation Charter',
    icon: '🏦',
    endsAtMs: NOW + 10 * DAY_MS,
    ...overrides,
  };
}

describe('Mission Calendar — alliance charter entries (LS5)', () => {
  it('omits every charter entry when no charter is supplied', () => {
    const state = getNewGameState();
    const entries = getMissionCalendarEntries(state, { nowMs: NOW, horizonDays: 14 });
    expect(entries.some(e => e.category === 'alliance_charter')).toBe(false);
  });

  it('includes the season-end deadline when within the horizon', () => {
    const state = getNewGameState();
    const entries = getMissionCalendarEntries(state, {
      nowMs: NOW, horizonDays: 14, myAllianceCharter: charter(),
    });
    const ends = entries.find(e => e.id === 'charter_ends_charter_1');
    expect(ends).toBeDefined();
    expect(ends?.category).toBe('alliance_charter');
    expect(ends?.kind).toBe('ends');
    expect(ends?.worldShared).toBe(false); // personal to this alliance, not identical for every player
  });

  it('excludes the season-end deadline once outside the horizon', () => {
    const state = getNewGameState();
    const entries = getMissionCalendarEntries(state, {
      nowMs: NOW, horizonDays: 14, myAllianceCharter: charter({ endsAtMs: NOW + 30 * DAY_MS }),
    });
    expect(entries.some(e => e.id === 'charter_ends_charter_1')).toBe(false);
  });

  it('excludes an already-ended charter (endsAtMs in the past)', () => {
    const state = getNewGameState();
    const entries = getMissionCalendarEntries(state, {
      nowMs: NOW, horizonDays: 14, myAllianceCharter: charter({ endsAtMs: NOW - DAY_MS }),
    });
    expect(entries.some(e => e.id === 'charter_ends_charter_1')).toBe(false);
  });

  it('the weekly pledge-close lock lands on the SAME fixed UTC slot as the league lock (Monday 00:05 UTC)', () => {
    const state = getNewGameState();
    const entries = getMissionCalendarEntries(state, {
      nowMs: NOW, horizonDays: 14, myAllianceCharter: charter(),
    });
    const lock = entries.find(e => e.category === 'alliance_charter' && e.kind === 'lock');
    expect(lock).toBeDefined();
    expect(lock?.atMs).toBe(getNextWeeklyUtcOccurrence(NOW, 1, 0, 5));
  });

  it('is sorted into the overall entry list by atMs like every other category', () => {
    const state = getNewGameState();
    const entries = getMissionCalendarEntries(state, {
      nowMs: NOW, horizonDays: 14, myAllianceCharter: charter(),
    });
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].atMs).toBeGreaterThanOrEqual(entries[i - 1].atMs);
    }
  });

  it('is a pure function — identical inputs produce an identical entry set', () => {
    const state = getNewGameState();
    const opts = { nowMs: NOW, horizonDays: 14, myAllianceCharter: charter() };
    const a = getMissionCalendarEntries(state, opts).filter(e => e.category === 'alliance_charter');
    const b = getMissionCalendarEntries(state, opts).filter(e => e.category === 'alliance_charter');
    expect(a).toEqual(b);
  });
});
