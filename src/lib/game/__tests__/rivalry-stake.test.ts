/**
 * GAME_DESIGN_REVIEW_2026-09 §2 row 14 — the rivalry stake: settlement
 * arithmetic, the weekly rep cap, the designation rules, the idempotent
 * client-side application, and the Situation Log item.
 */
import {
  RIVALRY_STAKE,
  settleRivalryStake,
  rivalryRepAward,
  checkRivalryDesignation,
  growthPct,
} from '../rivalry-stake';
import { applyRivalryStakesToState } from '../server-effects';
import { deriveSituationLog } from '../situation-log';
import { getNewGameState } from '../save-load';
import type { GameState } from '../types';

function state(overrides: Partial<GameState> = {}): GameState {
  return { ...getNewGameState(), reputation: 100, ...overrides } as GameState;
}

describe('settleRivalryStake', () => {
  it('compares week-over-week net-worth growth, not absolute size', () => {
    // Rival is 10× bigger but grew slower.
    const s = settleRivalryStake(100e6, 120e6, 1e9, 1.1e9);
    expect(s.outcome).toBe('player');
    expect(s.playerGrowthPct).toBe(20);
    expect(s.rivalGrowthPct).toBe(10);
  });

  it('rival wins when they out-grow the player', () => {
    expect(settleRivalryStake(100e6, 105e6, 100e6, 130e6).outcome).toBe('rival');
  });

  it('a difference inside the draw band is a draw (sync-timing noise is not a win)', () => {
    expect(settleRivalryStake(100e6, 110e6, 100e6, 110.05e6).outcome).toBe('draw');
    expect(settleRivalryStake(0, 0, 0, 0).outcome).toBe('draw');
  });

  it('guards zero / negative starts', () => {
    expect(growthPct(0, 50)).toBe(5000);
    expect(growthPct(-100, 0)).toBe(100);
    expect(Number.isFinite(growthPct(Number.NaN, 5))).toBe(true);
  });
});

describe('rivalryRepAward — +1 per win, capped +3/week', () => {
  it('pays REP_PER_WIN until the weekly cap, then 0', () => {
    expect(RIVALRY_STAKE.REP_PER_WIN).toBe(1);
    expect(RIVALRY_STAKE.REP_CAP_PER_WEEK).toBe(3);
    expect(rivalryRepAward(0)).toBe(1);
    expect(rivalryRepAward(2)).toBe(1);
    expect(rivalryRepAward(3)).toBe(0);
    expect(rivalryRepAward(10)).toBe(0);
  });
});

describe('checkRivalryDesignation', () => {
  it('allows up to MAX_DESIGNATED stakes in the same league', () => {
    expect(RIVALRY_STAKE.MAX_DESIGNATED).toBe(3);
    expect(checkRivalryDesignation(3, 3, 0).ok).toBe(true);
    expect(checkRivalryDesignation(3, 3, 2).ok).toBe(true);
    expect(checkRivalryDesignation(3, 3, 3).ok).toBe(false);
  });

  it('forbids a pair one or more league brackets apart', () => {
    expect(checkRivalryDesignation(3, 4, 0).ok).toBe(false);
    expect(checkRivalryDesignation(5, 2, 0).ok).toBe(false);
    expect(checkRivalryDesignation(3, 4, 0).reason).toMatch(/league/i);
  });
});

describe('applyRivalryStakesToState (client hop)', () => {
  const win = (id: string, weekId = 2960, rep = 1) => ({ id, weekId, opponent: 'Nova Aerospace', rep, atMs: 1_700_000_000_000 });

  it('adds reputation once per activity id — sync retries never double-grant', () => {
    const once = applyRivalryStakesToState(state(), [win('a1')]);
    expect(once.reputation).toBe(101);
    expect(once.rivalryStakesApplied).toEqual(['a1']);
    expect(once.rivalryResults).toHaveLength(1);
    const twice = applyRivalryStakesToState(once, [win('a1')]);
    expect(twice).toBe(once);
    expect(twice.reputation).toBe(101);
  });

  it('re-enforces the +3/week cap as defense in depth', () => {
    const s = applyRivalryStakesToState(state(), [win('a'), win('b'), win('c'), win('d'), win('e', 2961)]);
    expect(s.reputation).toBe(100 + 3 + 1); // three in week 2960, one in 2961
    expect(s.rivalryResults?.find(r => r.id === 'd')?.rep).toBe(0);
  });

  it('never pays more than REP_PER_WIN per stake even if the server row says more', () => {
    const s = applyRivalryStakesToState(state(), [win('big', 2960, 50)]);
    expect(s.reputation).toBe(101);
  });

  it('ignores garbage and leaves state untouched when nothing applies', () => {
    const base = state();
    expect(applyRivalryStakesToState(base, null)).toBe(base);
    expect(applyRivalryStakesToState(base, [{ id: 'x', weekId: 1, opponent: 'y', rep: Number.NaN, atMs: 0 }])).toBe(base);
  });
});

describe('Situation Log rivalry item', () => {
  it('surfaces a stake won inside the last 7 days and deep-links to Standings', () => {
    const now = 1_700_000_000_000;
    const s = state({ rivalryResults: [
      { id: 'recent', weekId: 2960, opponent: 'Nova Aerospace', rep: 1, atMs: now - 2 * 86400000 },
      { id: 'old', weekId: 2950, opponent: 'Helios Energy', rep: 1, atMs: now - 20 * 86400000 },
    ] });
    const items = deriveSituationLog(s, { nowMs: now }).filter(i => i.category === 'rivalry');
    expect(items).toHaveLength(1);
    expect(items[0].label).toContain('Nova Aerospace');
    expect(items[0].tab).toBe('leaderboard');
    expect(items[0].severity).toBe('info');
  });
});
