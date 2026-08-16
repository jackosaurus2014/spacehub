// ─── Live-Service Wave LS5 — Alliance Season Charters: pure math ───────────
// docs/LIVE_SERVICE_2026-08.md §LS5. Covers goal/quota scaling, escrow/
// stipend sizing, pledge evaluation (forgiving-by-construction), progress
// aggregation, grading, and week-index determinism — every number the
// charter route + weekly cron step depend on.

import {
  ALLIANCE_CHARTER_DEFINITIONS, ALLIANCE_CHARTER_MAP,
  computeCharterGoal, computeDefaultWeeklyQuota, computeCharterEscrow,
  computeStipend, evaluatePledgeWeek, aggregateCharterProgress,
  gradeCharter, getCharterGradeXP, getCharterWeekIndex,
  CHARTER_WEEK_MS, CHARTER_WEEKS_PER_SEASON, CHARTER_STIPEND_RATE,
  CHARTER_PLEDGE_MET_XP,
} from '../alliance-charters';

describe('ALLIANCE_CHARTER_DEFINITIONS', () => {
  it('every definition has a positive per-member season target', () => {
    for (const def of ALLIANCE_CHARTER_DEFINITIONS) {
      expect(def.perMemberSeasonTarget).toBeGreaterThan(0);
      expect(ALLIANCE_CHARTER_MAP.get(def.type)).toBe(def);
    }
  });

  it('has exactly the four metric-backed charter types (Wave E7 adds market_share)', () => {
    const types = ALLIANCE_CHARTER_DEFINITIONS.map(d => d.type).sort();
    expect(types).toEqual(['event_points', 'market_share', 'science_cofund_count', 'treasury_growth'].sort());
  });
});

describe('computeCharterGoal', () => {
  it('scales linearly with member count', () => {
    const goal5 = computeCharterGoal('treasury_growth', 5);
    const goal10 = computeCharterGoal('treasury_growth', 10);
    expect(goal10).toBe(goal5 * 2);
  });

  it('floors member count at 1 (never zero/negative)', () => {
    const goalZero = computeCharterGoal('treasury_growth', 0);
    const goalOne = computeCharterGoal('treasury_growth', 1);
    expect(goalZero).toBe(goalOne);
    expect(goalZero).toBeGreaterThan(0);
  });

  it('returns 0 for an unknown charter type', () => {
    expect(computeCharterGoal('not_a_real_type' as never, 10)).toBe(0);
  });
});

describe('computeDefaultWeeklyQuota', () => {
  it('splits the goal evenly across members and weeks', () => {
    const goal = 4_000_000; // divisible cleanly
    const quota = computeDefaultWeeklyQuota(goal, 5);
    expect(quota).toBe(Math.round(goal / (5 * CHARTER_WEEKS_PER_SEASON)));
  });

  it('never returns less than 1', () => {
    expect(computeDefaultWeeklyQuota(1, 1000)).toBeGreaterThanOrEqual(1);
  });
});

describe('computeCharterEscrow / computeStipend', () => {
  it('escrow is proportional to the stipend rate with a 20% buffer', () => {
    const goal = 1_000_000_000;
    const escrow = computeCharterEscrow(goal);
    expect(escrow).toBe(Math.round(goal * CHARTER_STIPEND_RATE * 1.2));
  });

  it('a met week never costs more than the stipend rate of its quota', () => {
    const quota = 10_000_000;
    const stipend = computeStipend(quota);
    expect(stipend).toBe(Math.round(quota * CHARTER_STIPEND_RATE));
    expect(stipend).toBeLessThan(quota);
  });

  it('escrow comfortably covers every member meeting every week (no starvation in the common case)', () => {
    const memberCount = 8;
    const goal = computeCharterGoal('treasury_growth', memberCount);
    const escrow = computeCharterEscrow(goal);
    const quota = computeDefaultWeeklyQuota(goal, memberCount);
    const totalStipendIfAllMetAllWeeks = computeStipend(quota) * memberCount * CHARTER_WEEKS_PER_SEASON;
    expect(escrow).toBeGreaterThanOrEqual(totalStipendIfAllMetAllWeeks);
  });
});

describe('evaluatePledgeWeek — forgiving by construction', () => {
  it('meets when contributed >= quota and quota > 0', () => {
    const r = evaluatePledgeWeek(100, 150, 1_000_000);
    expect(r.met).toBe(true);
    expect(r.stipend).toBeGreaterThan(0);
  });

  it('an unmet week costs only the stipend — no other side effect encoded here', () => {
    const r = evaluatePledgeWeek(100, 40, 1_000_000);
    expect(r.met).toBe(false);
    expect(r.stipend).toBe(0);
    expect(r.contributed).toBe(40); // still recorded, just not "met"
  });

  it('a quota of 0 (opted out) can never be "met", even with contribution', () => {
    const r = evaluatePledgeWeek(0, 999, 1_000_000);
    expect(r.met).toBe(false);
    expect(r.stipend).toBe(0);
  });

  it('stipend is clamped by remaining escrow — never overpays past what was reserved', () => {
    const r = evaluatePledgeWeek(1_000_000, 1_000_000, 100); // stipend would be 50,000 but only 100 remains
    expect(r.met).toBe(true);
    expect(r.stipend).toBe(100);
  });

  it('zero escrow remaining still marks the week met, just pays nothing', () => {
    const r = evaluatePledgeWeek(1000, 1000, 0);
    expect(r.met).toBe(true);
    expect(r.stipend).toBe(0);
  });
});

describe('aggregateCharterProgress', () => {
  it('sums contributed across every pledge row', () => {
    expect(aggregateCharterProgress([{ contributed: 100 }, { contributed: 250 }, { contributed: 0 }])).toBe(350);
  });

  it('ignores negative/garbage contributed values defensively', () => {
    expect(aggregateCharterProgress([{ contributed: -50 }, { contributed: 100 }])).toBe(100);
  });

  it('returns 0 for an empty list', () => {
    expect(aggregateCharterProgress([])).toBe(0);
  });
});

describe('gradeCharter', () => {
  it('grades gold at or above 100% of goal', () => {
    expect(gradeCharter(1000, 1000)).toBe('gold');
    expect(gradeCharter(1200, 1000)).toBe('gold');
  });

  it('grades silver at 75-99%', () => {
    expect(gradeCharter(800, 1000)).toBe('silver');
  });

  it('grades bronze at 50-74%', () => {
    expect(gradeCharter(600, 1000)).toBe('bronze');
  });

  it('grades incomplete below 50% — never a punitive negative grade', () => {
    expect(gradeCharter(100, 1000)).toBe('incomplete');
    expect(gradeCharter(0, 1000)).toBe('incomplete');
  });

  it('handles a zero goalTarget without dividing by zero', () => {
    expect(gradeCharter(0, 0)).toBe('incomplete');
  });

  it('grade reward XP is monotonic with grade and never negative', () => {
    expect(getCharterGradeXP('gold')).toBeGreaterThan(getCharterGradeXP('silver'));
    expect(getCharterGradeXP('silver')).toBeGreaterThan(getCharterGradeXP('bronze'));
    expect(getCharterGradeXP('bronze')).toBeGreaterThan(getCharterGradeXP('incomplete'));
    expect(getCharterGradeXP('incomplete')).toBe(0);
  });
});

describe('getCharterWeekIndex — determinism, matches the league-week convention', () => {
  it('is a pure function of wall-clock time', () => {
    const t = Date.UTC(2026, 5, 15, 12, 0, 0);
    expect(getCharterWeekIndex(t)).toBe(getCharterWeekIndex(t));
  });

  it('increments exactly once per CHARTER_WEEK_MS', () => {
    const t = Date.UTC(2026, 5, 15, 12, 0, 0);
    expect(getCharterWeekIndex(t + CHARTER_WEEK_MS)).toBe(getCharterWeekIndex(t) + 1);
  });

  it('matches world-calendar.ts league week convention (Math.floor(nowMs / WEEK_MS))', () => {
    const t = 1_765_000_000_000;
    expect(getCharterWeekIndex(t)).toBe(Math.floor(t / CHARTER_WEEK_MS));
  });
});

describe('CHARTER_PLEDGE_MET_XP', () => {
  it('is a small, positive, fixed amount (a weekly social beat, not a jackpot)', () => {
    expect(CHARTER_PLEDGE_MET_XP).toBeGreaterThan(0);
    expect(CHARTER_PLEDGE_MET_XP).toBeLessThan(getCharterGradeXP('bronze'));
  });
});
