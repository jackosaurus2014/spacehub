/**
 * @jest-environment node
 *
 * Live-Service Wave LS2 "Returning Commander" — docs/LIVE_SERVICE_2026-08.md
 * §LS2 mechanic 2. Covers: lapse-threshold detection, the reentry stipend
 * curve, track creation (including idempotency), the boost-multiplier decay
 * curve at exact boundaries, objective baselining/evaluation, and pruning.
 */
import { getNewGameState } from '../save-load';
import type { GameState } from '../types';
import {
  isLapsedReturn,
  getReentryStipend,
  startReturningCommanderTrack,
  getReturningCommanderMultiplier,
  getReturningCommanderObjectives,
  isReturningCommanderTrackActive,
  isReturningCommanderTrackComplete,
  pruneExpiredReturningCommanderTrack,
} from '../returning-commander';
import {
  RETURNING_COMMANDER_LAPSE_MS,
  RETURNING_COMMANDER_TRACK_DURATION_MS,
  RETURNING_COMMANDER_BOOST_DECAY_MS,
  RETURNING_COMMANDER_STIPEND_CAP,
} from '../constants';

const NOW = Date.UTC(2026, 5, 1, 12, 0, 0);
const DAY_MS = 24 * 60 * 60 * 1000;

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...getNewGameState(),
    money: 1_000_000_000,
    createdAt: NOW - 999_999_999,
    lastTickAt: NOW,
    ...overrides,
  };
}

describe('isLapsedReturn', () => {
  it('is false below the 14-day threshold, true at/above it', () => {
    expect(isLapsedReturn(RETURNING_COMMANDER_LAPSE_MS - 1)).toBe(false);
    expect(isLapsedReturn(RETURNING_COMMANDER_LAPSE_MS)).toBe(true);
    expect(isLapsedReturn(RETURNING_COMMANDER_LAPSE_MS * 3)).toBe(true);
  });
});

describe('getReentryStipend', () => {
  it('scales linearly with days away, capped', () => {
    expect(getReentryStipend(14 * DAY_MS)).toBeGreaterThan(0);
    expect(getReentryStipend(28 * DAY_MS)).toBeCloseTo(getReentryStipend(14 * DAY_MS) * 2, -3);
  });

  it('never exceeds the flat cap regardless of how long the lapse is', () => {
    expect(getReentryStipend(365 * DAY_MS)).toBe(RETURNING_COMMANDER_STIPEND_CAP);
    expect(getReentryStipend(10_000 * DAY_MS)).toBe(RETURNING_COMMANDER_STIPEND_CAP);
  });
});

describe('startReturningCommanderTrack', () => {
  it('grants the stipend and creates a track with a baseline snapshot', () => {
    const s = baseState({
      stats: { ...getNewGameState().stats, researchCompleted: 3 },
      buildings: [{ instanceId: 'b1', definitionId: 'x', locationId: 'earth_surface', buildStartDate: { year: 2026, month: 1 }, completionDate: { year: 2026, month: 1 }, isComplete: true, startedAtMs: NOW, realDurationSeconds: 60 }],
    });
    const result = startReturningCommanderTrack(s, 20 * DAY_MS, NOW);
    expect(result.stipend).toBeGreaterThan(0);
    expect(result.state.money).toBe(s.money + result.stipend);
    expect(result.state.returningCommanderTrack).not.toBeNull();
    expect(result.state.returningCommanderTrack!.baseline.researchCompleted).toBe(3);
    expect(result.state.returningCommanderTrack!.baseline.buildingsComplete).toBe(1);
    expect(result.state.returningCommanderTrack!.lapseDays).toBe(20);
    expect(result.state.returningCommanderTrack!.expiresAtMs).toBe(NOW + RETURNING_COMMANDER_TRACK_DURATION_MS);
  });

  it('is idempotent — a second call while a track is still active grants no stipend and does not reset the baseline', () => {
    const s = baseState();
    const first = startReturningCommanderTrack(s, 20 * DAY_MS, NOW);
    const second = startReturningCommanderTrack(first.state, 20 * DAY_MS, NOW + DAY_MS);
    expect(second.stipend).toBe(0);
    expect(second.state).toBe(first.state); // same reference — true no-op
  });

  it('starts a fresh track once the previous one has fully expired', () => {
    const s = baseState();
    const first = startReturningCommanderTrack(s, 20 * DAY_MS, NOW);
    const muchLater = NOW + RETURNING_COMMANDER_TRACK_DURATION_MS + RETURNING_COMMANDER_BOOST_DECAY_MS + 1;
    const second = startReturningCommanderTrack(first.state, 30 * DAY_MS, muchLater);
    expect(second.stipend).toBeGreaterThan(0);
    expect(second.state.returningCommanderTrack!.startedAtMs).toBe(muchLater);
  });
});

describe('getReturningCommanderMultiplier', () => {
  it('is exactly 1.0 with no track', () => {
    expect(getReturningCommanderMultiplier(baseState(), NOW)).toBe(1.0);
  });

  it('is 1.3x the instant the track starts, decaying linearly to 1.0x by day 14, and staying at 1.0x after', () => {
    const { state } = startReturningCommanderTrack(baseState(), 20 * DAY_MS, NOW);
    expect(getReturningCommanderMultiplier(state, NOW)).toBeCloseTo(1.3);
    expect(getReturningCommanderMultiplier(state, NOW + 7 * DAY_MS)).toBeCloseTo(1.15, 5);
    expect(getReturningCommanderMultiplier(state, NOW + RETURNING_COMMANDER_BOOST_DECAY_MS)).toBe(1.0);
    expect(getReturningCommanderMultiplier(state, NOW + RETURNING_COMMANDER_BOOST_DECAY_MS + DAY_MS)).toBe(1.0);
  });

  it('never exceeds 1.3x — logging in always beats staying away (matches away-operations.ts invariant in spirit)', () => {
    const { state } = startReturningCommanderTrack(baseState(), 400 * DAY_MS, NOW);
    expect(getReturningCommanderMultiplier(state, NOW)).toBeLessThanOrEqual(1.3);
  });
});

describe('getReturningCommanderObjectives', () => {
  it('returns an empty list with no active track', () => {
    expect(getReturningCommanderObjectives(baseState())).toEqual([]);
  });

  it('marks nothing done at track creation', () => {
    const { state } = startReturningCommanderTrack(baseState(), 20 * DAY_MS, NOW);
    const objectives = getReturningCommanderObjectives(state);
    expect(objectives).toHaveLength(4);
    expect(objectives.every(o => !o.done)).toBe(true);
  });

  it('does not retroactively credit progress made BEFORE the lapse (baseline, not zero)', () => {
    const preLapse = baseState({ stats: { ...getNewGameState().stats, researchCompleted: 5 } });
    const { state } = startReturningCommanderTrack(preLapse, 20 * DAY_MS, NOW);
    // No NEW research completed since the track started — still not done.
    const objectives = getReturningCommanderObjectives(state);
    expect(objectives.find(o => o.id === 'produce')!.done).toBe(false);
  });

  it('credits the "produce" objective once research/builds complete AFTER the baseline', () => {
    const s = baseState({ stats: { ...getNewGameState().stats, researchCompleted: 5 } });
    const { state } = startReturningCommanderTrack(s, 20 * DAY_MS, NOW);
    const afterResearch = { ...state, stats: { ...state.stats, researchCompleted: 6 } };
    const objectives = getReturningCommanderObjectives(afterResearch);
    expect(objectives.find(o => o.id === 'produce')!.done).toBe(true);
    expect(objectives.find(o => o.id === 'queue')!.done).toBe(true); // researchDone also satisfies 'queue'
  });

  it('credits "queue" when the command queue has an order, independent of production', () => {
    const { state } = startReturningCommanderTrack(baseState(), 20 * DAY_MS, NOW);
    const queued = { ...state, commandQueue: [{ id: 'o1', kind: 'research' as const, createdAtMs: NOW, label: 'Test' }] };
    expect(getReturningCommanderObjectives(queued).find(o => o.id === 'queue')!.done).toBe(true);
  });

  it('isReturningCommanderTrackComplete is true only once every objective is done', () => {
    const s = baseState({ stats: { ...getNewGameState().stats, researchCompleted: 5 } });
    const { state } = startReturningCommanderTrack(s, 20 * DAY_MS, NOW);
    expect(isReturningCommanderTrackComplete(state)).toBe(false);
    const allDone: GameState = {
      ...state,
      stats: { ...state.stats, researchCompleted: 6 },
      accordLobbying: [{ measureId: 'm1', stance: 'support', moneySpent: 0, favorSpent: 0, committedAtMonth: 1 }],
      earnedAchievements: ['a1'],
    };
    expect(isReturningCommanderTrackComplete(allDone)).toBe(true);
  });
});

describe('isReturningCommanderTrackActive / pruneExpiredReturningCommanderTrack', () => {
  it('stays active while either the objective window or the boost is still live', () => {
    const { state } = startReturningCommanderTrack(baseState(), 20 * DAY_MS, NOW);
    // Objective window (7d) closed, but boost decay window (14d) still open.
    const midway = NOW + RETURNING_COMMANDER_TRACK_DURATION_MS + DAY_MS;
    expect(isReturningCommanderTrackActive(state, midway)).toBe(true);
    expect(pruneExpiredReturningCommanderTrack(state, midway).returningCommanderTrack).not.toBeNull();
  });

  it('prunes only once both windows have fully closed', () => {
    const { state } = startReturningCommanderTrack(baseState(), 20 * DAY_MS, NOW);
    const later = NOW + RETURNING_COMMANDER_BOOST_DECAY_MS + 1;
    expect(isReturningCommanderTrackActive(state, later)).toBe(false);
    expect(pruneExpiredReturningCommanderTrack(state, later).returningCommanderTrack).toBeNull();
  });

  it('is a no-op with no track', () => {
    const s = baseState();
    expect(pruneExpiredReturningCommanderTrack(s, NOW)).toBe(s);
  });
});
