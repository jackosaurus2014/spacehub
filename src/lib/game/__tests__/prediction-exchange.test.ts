/**
 * Prediction Exchange — weekly in-game prediction market on real space
 * events. Pure-logic proofs only (no Prisma, no network): question
 * generation from mock SpaceEvent/ticker data, resolution outcome logic,
 * fixed-odds payout math, and stake validation/clamping.
 */
import {
  PREDICTION_STAKE_MIN,
  PREDICTION_STAKE_MAX,
  PREDICTION_PAYOUT_MULTIPLIER,
  MAX_LAUNCH_QUESTIONS_PER_WEEK,
  LAUNCH_CANDIDATE_WINDOW_DAYS,
  isMilestoneCandidate,
  isEligibleLaunchCandidate,
  buildLaunchQuestionSpec,
  buildMilestoneQuestionSpec,
  generateWeeklyEventQuestions,
  mondayOfWeekUTC,
  nextFridayCloseUTC,
  selectWeeklyTicker,
  buildStockQuestionSpec,
  isReadyToResolve,
  resolveSpaceEventOutcome,
  resolveStockOutcome,
  computePayout,
  validateStakeAmount,
  type LaunchCandidate,
  type TickerCandidate,
} from '../prediction-exchange';

const NOW = new Date('2026-08-17T12:00:00.000Z'); // a Monday

function launchCandidate(overrides: Partial<LaunchCandidate> = {}): LaunchCandidate {
  return {
    id: 'evt-1',
    name: 'Falcon 9 Block 5 | Starlink 12-4',
    mission: null,
    rocket: 'Falcon 9',
    type: 'launch',
    windowStart: new Date(NOW.getTime() + 2 * 86_400_000),
    windowEnd: new Date(NOW.getTime() + 2 * 86_400_000 + 2 * 3600_000),
    launchDate: null,
    infoUrl: 'https://spacenexus.com/launch-tracker/evt-1',
    ...overrides,
  };
}

describe('prediction-exchange: constants', () => {
  it('exposes sane bounds', () => {
    expect(PREDICTION_STAKE_MIN).toBeGreaterThan(0);
    expect(PREDICTION_STAKE_MAX).toBeGreaterThan(PREDICTION_STAKE_MIN);
    expect(PREDICTION_PAYOUT_MULTIPLIER).toBeGreaterThan(1);
  });
});

describe('isMilestoneCandidate', () => {
  it('flags by tracked type', () => {
    expect(isMilestoneCandidate(launchCandidate({ type: 'crewed_mission' }))).toBe(true);
    expect(isMilestoneCandidate(launchCandidate({ type: 'moon_mission' }))).toBe(true);
    expect(isMilestoneCandidate(launchCandidate({ type: 'launch' }))).toBe(false);
  });

  it('flags by notable name even with a generic type', () => {
    expect(isMilestoneCandidate(launchCandidate({ type: 'launch', name: 'Starship Flight 14' }))).toBe(true);
    expect(isMilestoneCandidate(launchCandidate({ type: 'launch', mission: 'Artemis III' }))).toBe(true);
    expect(isMilestoneCandidate(launchCandidate({ type: 'launch', name: 'Starlink Group 12-4' }))).toBe(false);
  });
});

describe('isEligibleLaunchCandidate', () => {
  it('accepts a candidate inside the lookahead window', () => {
    expect(isEligibleLaunchCandidate(launchCandidate(), NOW)).toBe(true);
  });

  it('rejects a candidate with no window/date at all', () => {
    const c = launchCandidate({ windowStart: null, windowEnd: null, launchDate: null });
    expect(isEligibleLaunchCandidate(c, NOW)).toBe(false);
  });

  it('rejects a candidate already in the past', () => {
    const c = launchCandidate({ windowStart: new Date(NOW.getTime() - 3600_000), windowEnd: null });
    expect(isEligibleLaunchCandidate(c, NOW)).toBe(false);
  });

  it('rejects a candidate beyond the lookahead window', () => {
    const c = launchCandidate({ windowStart: new Date(NOW.getTime() + (LAUNCH_CANDIDATE_WINDOW_DAYS + 5) * 86_400_000) });
    expect(isEligibleLaunchCandidate(c, NOW)).toBe(false);
  });

  it('falls back to launchDate when no window is set', () => {
    const c = launchCandidate({ windowStart: null, windowEnd: null, launchDate: new Date(NOW.getTime() + 86_400_000) });
    expect(isEligibleLaunchCandidate(c, NOW)).toBe(true);
  });
});

describe('buildLaunchQuestionSpec / buildMilestoneQuestionSpec', () => {
  it('returns null when the candidate has no resolvable date', () => {
    const c = launchCandidate({ windowStart: null, windowEnd: null, launchDate: null });
    expect(buildLaunchQuestionSpec(c)).toBeNull();
  });

  it('builds a deterministic key and yes/no options for a launch', () => {
    const c = launchCandidate();
    const spec = buildLaunchQuestionSpec(c)!;
    expect(spec.key).toBe(`launch-${c.id}`);
    expect(spec.category).toBe('launch');
    expect(spec.options.map(o => o.id)).toEqual(['yes', 'no']);
    expect(spec.closesAt).toEqual(c.windowStart);
    expect(spec.resolvesAt.getTime()).toBeGreaterThan(c.windowEnd!.getTime());
    expect(spec.sourceRef).toEqual({ spaceEventId: c.id });
  });

  it('milestone spec uses a distinct key prefix and category', () => {
    const c = launchCandidate({ id: 'evt-starship-14', name: 'Starship Flight 14', type: 'launch' });
    const spec = buildMilestoneQuestionSpec(c)!;
    expect(spec.key).toBe(`milestone-${c.id}`);
    expect(spec.category).toBe('milestone');
  });

  it('two different candidates never collide on key', () => {
    const a = buildLaunchQuestionSpec(launchCandidate({ id: 'evt-a' }))!;
    const b = buildLaunchQuestionSpec(launchCandidate({ id: 'evt-b' }))!;
    expect(a.key).not.toBe(b.key);
  });
});

describe('generateWeeklyEventQuestions', () => {
  it('returns nothing for an empty candidate pool', () => {
    expect(generateWeeklyEventQuestions({ now: NOW, candidates: [] })).toEqual([]);
  });

  it('caps plain launch questions at MAX_LAUNCH_QUESTIONS_PER_WEEK', () => {
    const candidates = Array.from({ length: 8 }, (_, i) =>
      launchCandidate({ id: `evt-${i}`, windowStart: new Date(NOW.getTime() + (i + 1) * 3600_000), windowEnd: new Date(NOW.getTime() + (i + 1) * 3600_000 + 3600_000) }),
    );
    const specs = generateWeeklyEventQuestions({ now: NOW, candidates });
    const launchSpecs = specs.filter(s => s.category === 'launch');
    expect(launchSpecs.length).toBe(MAX_LAUNCH_QUESTIONS_PER_WEEK);
  });

  it('adds one milestone question for a notable mission not already used as a launch question', () => {
    const candidates = [
      launchCandidate({ id: 'evt-routine-1' }),
      launchCandidate({ id: 'evt-starship', name: 'Starship Flight 14', type: 'launch', windowStart: new Date(NOW.getTime() + 3 * 86_400_000), windowEnd: new Date(NOW.getTime() + 3 * 86_400_000 + 3600_000) }),
    ];
    const specs = generateWeeklyEventQuestions({ now: NOW, candidates });
    const milestone = specs.find(s => s.category === 'milestone');
    expect(milestone).toBeDefined();
    expect(milestone!.key).toBe('milestone-evt-starship');
    // Starship candidate should not ALSO appear as a plain launch question.
    expect(specs.filter(s => s.key.includes('evt-starship')).length).toBe(1);
  });

  it('ignores candidates outside the eligibility window entirely', () => {
    const candidates = [launchCandidate({ windowStart: new Date(NOW.getTime() - 3600_000), windowEnd: null })];
    expect(generateWeeklyEventQuestions({ now: NOW, candidates })).toEqual([]);
  });
});

describe('mondayOfWeekUTC', () => {
  it('returns the same Monday for every day in that week', () => {
    expect(mondayOfWeekUTC(new Date('2026-08-17T00:00:00Z'))).toBe('2026-08-17'); // Monday
    expect(mondayOfWeekUTC(new Date('2026-08-19T23:59:00Z'))).toBe('2026-08-17'); // Wednesday
    expect(mondayOfWeekUTC(new Date('2026-08-23T12:00:00Z'))).toBe('2026-08-17'); // Sunday
  });

  it('rolls into the next Monday once the following week starts', () => {
    expect(mondayOfWeekUTC(new Date('2026-08-24T00:00:00Z'))).toBe('2026-08-24'); // next Monday
  });
});

describe('nextFridayCloseUTC', () => {
  it('finds the upcoming Friday 20:00 UTC from a Monday', () => {
    const friday = nextFridayCloseUTC(new Date('2026-08-17T12:00:00Z'));
    expect(friday.toISOString()).toBe('2026-08-21T20:00:00.000Z');
  });

  it('rolls to next week if called after this Friday\'s close', () => {
    const friday = nextFridayCloseUTC(new Date('2026-08-21T21:00:00Z'));
    expect(friday.toISOString()).toBe('2026-08-28T20:00:00.000Z');
  });

  it('returns this Friday if called before its close', () => {
    const friday = nextFridayCloseUTC(new Date('2026-08-21T10:00:00Z'));
    expect(friday.toISOString()).toBe('2026-08-21T20:00:00.000Z');
  });
});

describe('selectWeeklyTicker', () => {
  const tickers: TickerCandidate[] = [
    { ticker: 'RKLB', name: 'Rocket Lab' },
    { ticker: 'SPCX', name: 'SpaceX (illustrative)' },
    { ticker: 'ASTS', name: 'AST SpaceMobile' },
  ];

  it('returns null for an empty roster', () => {
    expect(selectWeeklyTicker([], NOW)).toBeNull();
  });

  it('is deterministic for a given week', () => {
    const a = selectWeeklyTicker(tickers, NOW);
    const b = selectWeeklyTicker(tickers, new Date(NOW.getTime() + 3600_000));
    expect(a).toEqual(b);
  });

  it('rotates across weeks', () => {
    const week1 = selectWeeklyTicker(tickers, NOW);
    const week2 = selectWeeklyTicker(tickers, new Date(NOW.getTime() + 7 * 86_400_000));
    // Not guaranteed to differ for every roster length, but with 3 tickers and a 1-week shift it must.
    expect(week1?.ticker).not.toBe(week2?.ticker);
  });
});

describe('buildStockQuestionSpec', () => {
  const ticker: TickerCandidate = { ticker: 'RKLB', name: 'Rocket Lab' };

  it('returns null for an invalid base price', () => {
    expect(buildStockQuestionSpec(ticker, NOW, 0)).toBeNull();
    expect(buildStockQuestionSpec(ticker, NOW, NaN)).toBeNull();
    expect(buildStockQuestionSpec(ticker, NOW, -5)).toBeNull();
  });

  it('builds up/down options and a deterministic weekly key', () => {
    const spec = buildStockQuestionSpec(ticker, NOW, 42.5)!;
    expect(spec.key).toBe('stocks-2026-08-17-RKLB');
    expect(spec.category).toBe('stocks');
    expect(spec.options.map(o => o.id)).toEqual(['up', 'down']);
    expect(spec.sourceRef).toMatchObject({ ticker: 'RKLB', basePrice: 42.5 });
  });
});

describe('isReadyToResolve', () => {
  it('gates on resolvesAt when present', () => {
    const q = { closesAt: new Date('2026-08-17T00:00:00Z'), resolvesAt: new Date('2026-08-19T00:00:00Z') };
    expect(isReadyToResolve(q, new Date('2026-08-18T00:00:00Z'))).toBe(false);
    expect(isReadyToResolve(q, new Date('2026-08-19T00:00:01Z'))).toBe(true);
  });

  it('falls back to closesAt when resolvesAt is null', () => {
    const q = { closesAt: new Date('2026-08-17T00:00:00Z'), resolvesAt: null };
    expect(isReadyToResolve(q, new Date('2026-08-16T00:00:00Z'))).toBe(false);
    expect(isReadyToResolve(q, new Date('2026-08-17T00:00:01Z'))).toBe(true);
  });
});

describe('resolveSpaceEventOutcome', () => {
  it('treats completed and in_progress as launched', () => {
    expect(resolveSpaceEventOutcome('completed')).toBe('yes');
    expect(resolveSpaceEventOutcome('in_progress')).toBe('yes');
  });

  it('treats scrubbed, still-pending, and missing status as not launched', () => {
    expect(resolveSpaceEventOutcome('scrubbed')).toBe('no');
    expect(resolveSpaceEventOutcome('upcoming')).toBe('no');
    expect(resolveSpaceEventOutcome('tbd')).toBe('no');
    expect(resolveSpaceEventOutcome(null)).toBe('no');
    expect(resolveSpaceEventOutcome(undefined)).toBe('no');
  });
});

describe('resolveStockOutcome', () => {
  it('resolves up only strictly above the base price', () => {
    expect(resolveStockOutcome(100, 100.01)).toBe('up');
  });

  it('resolves down on a tie (documented tie-break)', () => {
    expect(resolveStockOutcome(100, 100)).toBe('down');
  });

  it('resolves down when below base price', () => {
    expect(resolveStockOutcome(100, 90)).toBe('down');
  });
});

describe('computePayout', () => {
  it('pays PREDICTION_PAYOUT_MULTIPLIER times the stake on a correct pick', () => {
    expect(computePayout(10_000, 'yes', 'yes')).toBe(10_000 * PREDICTION_PAYOUT_MULTIPLIER);
  });

  it('pays nothing on an incorrect pick', () => {
    expect(computePayout(10_000, 'no', 'yes')).toBe(0);
  });

  it('pays nothing for a non-positive or non-finite stake', () => {
    expect(computePayout(0, 'yes', 'yes')).toBe(0);
    expect(computePayout(-500, 'yes', 'yes')).toBe(0);
    expect(computePayout(NaN, 'yes', 'yes')).toBe(0);
  });

  it('rounds the payout to a whole number of credits', () => {
    expect(computePayout(1_001, 'yes', 'yes')).toBe(Math.round(1_001 * PREDICTION_PAYOUT_MULTIPLIER));
  });
});

describe('validateStakeAmount', () => {
  it('rejects non-numeric input', () => {
    expect(validateStakeAmount('10000', 1_000_000).valid).toBe(false);
    expect(validateStakeAmount(undefined, 1_000_000).valid).toBe(false);
    expect(validateStakeAmount(NaN, 1_000_000).valid).toBe(false);
  });

  it('rejects below the minimum', () => {
    const r = validateStakeAmount(PREDICTION_STAKE_MIN - 1, 1_000_000);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/minimum/i);
  });

  it('rejects above the maximum', () => {
    const r = validateStakeAmount(PREDICTION_STAKE_MAX + 1, 10_000_000);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/maximum/i);
  });

  it('rejects a stake exceeding the player balance', () => {
    const r = validateStakeAmount(50_000, 10_000);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/balance/i);
  });

  it('accepts and rounds a valid stake within bounds and balance', () => {
    const r = validateStakeAmount(12_345.6, 1_000_000);
    expect(r.valid).toBe(true);
    expect(r.amount).toBe(12_346);
  });

  it('accepts exactly the min and max boundaries', () => {
    expect(validateStakeAmount(PREDICTION_STAKE_MIN, PREDICTION_STAKE_MAX).valid).toBe(true);
    expect(validateStakeAmount(PREDICTION_STAKE_MAX, PREDICTION_STAKE_MAX).valid).toBe(true);
  });
});
