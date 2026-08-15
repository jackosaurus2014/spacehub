// Wave V7 (docs/VISUAL_DEPTH_2026-08.md §V7) — "sound hooks for LS surfaces"
// derivation functions. Pure state-diff / threshold-crossing checks that
// GlobalEffectsLayer.tsx drives; tested independently of any component.

import { getEntriesEnteringFinalHour, deriveMedalEarned, countProgramCompletions } from '../juice-events';

describe('getEntriesEnteringFinalHour', () => {
  const HOUR = 3_600_000;
  const now = 10_000_000;

  it('flags an entry whose deadline is inside the next hour and not yet dinged', () => {
    const entries = [{ id: 'e1', atMs: now + HOUR / 2 }];
    expect(getEntriesEnteringFinalHour(entries, new Set(), now)).toEqual(['e1']);
  });

  it('does not flag an entry more than an hour out', () => {
    const entries = [{ id: 'e1', atMs: now + HOUR + 1 }];
    expect(getEntriesEnteringFinalHour(entries, new Set(), now)).toEqual([]);
  });

  it('does not flag an entry already in the past', () => {
    const entries = [{ id: 'e1', atMs: now - 1 }];
    expect(getEntriesEnteringFinalHour(entries, new Set(), now)).toEqual([]);
  });

  it('does not re-flag an entry already in the dinged set', () => {
    const entries = [{ id: 'e1', atMs: now + 60_000 }];
    expect(getEntriesEnteringFinalHour(entries, new Set(['e1']), now)).toEqual([]);
  });

  it('respects a custom window', () => {
    const entries = [{ id: 'e1', atMs: now + 10 * 60_000 }]; // 10 min out
    expect(getEntriesEnteringFinalHour(entries, new Set(), now, 5 * 60_000)).toEqual([]);
    expect(getEntriesEnteringFinalHour(entries, new Set(), now, 15 * 60_000)).toEqual(['e1']);
  });

  it('returns multiple ids in one pass, order-preserving', () => {
    const entries = [
      { id: 'a', atMs: now + 100 },
      { id: 'b', atMs: now + HOUR + 5000 }, // out of window
      { id: 'c', atMs: now + 200 },
    ];
    expect(getEntriesEnteringFinalHour(entries, new Set(), now)).toEqual(['a', 'c']);
  });
});

describe('deriveMedalEarned', () => {
  it('returns null when nothing changed', () => {
    const eras = [{ medal: 'gold' }];
    expect(deriveMedalEarned(eras, eras)).toBeNull();
  });

  it('treats an undefined/missing prev snapshot as length 0 (documents the contract — callers pass prev?.corporateEras?.completedEras, which is undefined pre-charter)', () => {
    expect(deriveMedalEarned(undefined, [{ medal: 'bronze' }])).toBe('bronze');
  });

  it('returns the medal of the newly appended era when the list grows', () => {
    const prev = [{ medal: 'bronze' }];
    const next = [{ medal: 'bronze' }, { medal: 'platinum' }];
    expect(deriveMedalEarned(prev, next)).toBe('platinum');
  });

  it('returns null when the list shrinks or stays the same length (never fires backwards)', () => {
    const prev = [{ medal: 'bronze' }, { medal: 'silver' }];
    expect(deriveMedalEarned(prev, [{ medal: 'bronze' }])).toBeNull();
    expect(deriveMedalEarned(prev, prev)).toBeNull();
  });
});

describe('countProgramCompletions', () => {
  it('returns 0 with no previous snapshot', () => {
    expect(countProgramCompletions(null, { crew_cohort: [{ id: 'p1', startedAtMs: 100 }] })).toBe(0);
  });

  it('counts an active program that disappeared as one completion', () => {
    const prev = { crew_cohort: [{ id: 'p1', startedAtMs: 100 }] };
    const next = { crew_cohort: [] };
    expect(countProgramCompletions(prev, next)).toBe(1);
  });

  it('does not count a still-queued (not yet started) program that disappeared', () => {
    const prev = { crew_cohort: [{ id: 'p1', startedAtMs: null }] };
    const next = { crew_cohort: [] };
    expect(countProgramCompletions(prev, next)).toBe(0);
  });

  it('does not count a program that is still present in the next queue', () => {
    const prev = { crew_cohort: [{ id: 'p1', startedAtMs: 100 }] };
    const next = { crew_cohort: [{ id: 'p1', startedAtMs: 100 }] };
    expect(countProgramCompletions(prev, next)).toBe(0);
  });

  it('sums completions across multiple tracks', () => {
    const prev = {
      crew_cohort: [{ id: 'p1', startedAtMs: 100 }],
      leader_development: [{ id: 'p2', startedAtMs: 200 }],
      rd_residency: [{ id: 'p3', startedAtMs: null }], // still queued, not counted
    };
    const next = { crew_cohort: [], leader_development: [], rd_residency: [] };
    expect(countProgramCompletions(prev, next)).toBe(2);
  });
});
