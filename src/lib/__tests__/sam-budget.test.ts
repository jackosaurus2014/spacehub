/**
 * @jest-environment node
 */

/**
 * Tests for the shared SAM.gov daily call budget
 * (src/lib/procurement/sam-budget.ts) and its enforcement inside
 * fetchSAMOpportunities() (src/lib/procurement/sam-gov.ts).
 *
 * Root cause under test: on 2026-09-03 a quota-exhausted / circuit-open
 * SAM.gov run still logged "SAM.gov fetch successful ... total:0" and
 * "SAM.gov sync completed" with success:true, because the circuit
 * breaker's empty fallback looked identical to a real (rare) empty
 * result. These tests lock in that a degraded run is always reported as
 * degraded, never as a silent success — and that a spent budget stops the
 * call before it's made, not after.
 */

const mockGetContentItem = jest.fn();
const mockUpsertContent = jest.fn();
jest.mock('@/lib/dynamic-content', () => ({
  getContentItem: (...args: unknown[]) => mockGetContentItem(...args),
  upsertContent: (...args: unknown[]) => mockUpsertContent(...args),
}));

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/api-cache', () => ({
  apiCache: {
    get: jest.fn().mockReturnValue(null),
    set: jest.fn(),
  },
  CacheTTL: { STOCKS: 600_000, DEFAULT: 300_000 },
}));

import { logger } from '@/lib/logger';
import {
  reserveSamCall,
  getSamBudgetStatus,
  shouldRunWeeklySamLeg,
  recordWeeklySamLegRun,
  SAM_DAILY_BUDGET,
  PROCUREMENT_RESERVE,
} from '@/lib/procurement/sam-budget';
import { fetchSAMOpportunities } from '@/lib/procurement/sam-gov';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetContentItem.mockResolvedValue(null);
  mockUpsertContent.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// reserveSamCall — daily budget
// ---------------------------------------------------------------------------
describe('reserveSamCall', () => {
  it('allows up to SAM_DAILY_BUDGET calls per UTC day, then refuses', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-01T12:00:00Z'));

    for (let i = 0; i < SAM_DAILY_BUDGET; i++) {
      const r = await reserveSamCall('procurement');
      expect(r.allowed).toBe(true);
      expect(r.used).toBe(i + 1);
      expect(r.budget).toBe(SAM_DAILY_BUDGET);
    }

    const refused = await reserveSamCall('procurement');
    expect(refused.allowed).toBe(false);
    expect(refused.used).toBe(SAM_DAILY_BUDGET);
    expect(refused.budget).toBe(SAM_DAILY_BUDGET);
  });

  it('keeps the last PROCUREMENT_RESERVE calls of the budget for label "procurement" only', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-02T12:00:00Z'));

    const nonReservedCalls = SAM_DAILY_BUDGET - PROCUREMENT_RESERVE;
    for (let i = 0; i < nonReservedCalls; i++) {
      const r = await reserveSamCall('space-defense');
      expect(r.allowed).toBe(true);
    }

    // Non-procurement labels are refused once only the reserve is left...
    expect((await reserveSamCall('space-defense')).allowed).toBe(false);
    expect((await reserveSamCall('funding')).allowed).toBe(false);

    // ...but 'procurement' can still spend the reserved calls.
    for (let i = 0; i < PROCUREMENT_RESERVE; i++) {
      const r = await reserveSamCall('procurement');
      expect(r.allowed).toBe(true);
    }
    expect((await reserveSamCall('procurement')).allowed).toBe(false);
  });

  it('rolls the counter over at UTC midnight', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-03T23:59:00Z'));

    for (let i = 0; i < SAM_DAILY_BUDGET; i++) {
      await reserveSamCall('procurement');
    }
    expect((await reserveSamCall('procurement')).allowed).toBe(false);

    jest.setSystemTime(new Date('2026-06-04T00:05:00Z'));
    const afterMidnight = await reserveSamCall('procurement');
    expect(afterMidnight.allowed).toBe(true);
    expect(afterMidnight.used).toBe(1);
  });

  it('fails open (still allows the call) and logs a warning when the content store errors', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-05T12:00:00Z'));
    mockGetContentItem.mockRejectedValue(new Error('DB unavailable'));
    mockUpsertContent.mockRejectedValue(new Error('DB unavailable'));

    const result = await reserveSamCall('procurement');

    expect(result.allowed).toBe(true);
    expect(logger.warn).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getSamBudgetStatus
// ---------------------------------------------------------------------------
describe('getSamBudgetStatus', () => {
  it('reports used/budget/byLabel/dayKey', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-06T12:00:00Z'));

    await reserveSamCall('procurement');
    await reserveSamCall('space-defense');

    const status = await getSamBudgetStatus();
    expect(status.budget).toBe(SAM_DAILY_BUDGET);
    expect(status.used).toBe(2);
    expect(status.byLabel).toEqual({ procurement: 1, 'space-defense': 1 });
    expect(status.dayKey).toBe('2026-06-06');
  });
});

// ---------------------------------------------------------------------------
// shouldRunWeeklySamLeg / recordWeeklySamLegRun
// ---------------------------------------------------------------------------
describe('weekly SAM leg gate', () => {
  it('runs when there is no prior marker', async () => {
    mockGetContentItem.mockResolvedValue(null);
    expect(await shouldRunWeeklySamLeg('space-defense')).toBe(true);
  });

  it('does not run again within 7 days of the last run', async () => {
    mockGetContentItem.mockResolvedValue({
      data: { lastRunAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
    });
    expect(await shouldRunWeeklySamLeg('space-defense')).toBe(false);
  });

  it('runs again once 7+ days have passed', async () => {
    mockGetContentItem.mockResolvedValue({
      data: { lastRunAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() },
    });
    expect(await shouldRunWeeklySamLeg('space-defense')).toBe(true);
  });

  it('fails open when the store errors', async () => {
    mockGetContentItem.mockRejectedValue(new Error('DB unavailable'));
    expect(await shouldRunWeeklySamLeg('funding')).toBe(true);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('recordWeeklySamLegRun writes a fresh marker', async () => {
    await recordWeeklySamLegRun('funding');
    expect(mockUpsertContent).toHaveBeenCalledWith(
      'sam-weekly:funding',
      'procurement',
      'sam-weekly',
      expect.objectContaining({ lastRunAt: expect.any(String) }),
      expect.objectContaining({ sourceType: 'api' }),
    );
  });
});

// ---------------------------------------------------------------------------
// fetchSAMOpportunities — budget enforcement & honest telemetry
// (src/lib/procurement/sam-gov.ts, exercised with a real budget module)
// ---------------------------------------------------------------------------
describe('fetchSAMOpportunities honors the shared budget and reports honest telemetry', () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.SAM_GOV_API_KEY;

  beforeEach(() => {
    process.env.SAM_GOV_API_KEY = 'test-key';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.SAM_GOV_API_KEY = originalApiKey;
  });

  it('returns degraded.reason "budget_exhausted" WITHOUT invoking fetch once the daily budget is spent', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-10T12:00:00Z'));

    for (let i = 0; i < SAM_DAILY_BUDGET; i++) {
      await reserveSamCall('procurement');
    }

    const result = await fetchSAMOpportunities({});

    expect(result.degraded?.reason).toBe('budget_exhausted');
    expect(result.opportunities).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('a mocked 429 gives degraded.reason "quota_exhausted" and never logs "SAM.gov fetch successful"', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-11T12:00:00Z'));

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: async () => ({}),
    });

    const result = await fetchSAMOpportunities({});

    expect(result.degraded?.reason).toBe('quota_exhausted');
    expect(result.opportunities).toEqual([]);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const infoMessages = (logger.info as jest.Mock).mock.calls.map((c) => c[0]);
    expect(infoMessages).not.toContain('SAM.gov fetch successful');
  });
});
