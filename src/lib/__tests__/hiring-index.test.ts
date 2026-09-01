/**
 * @jest-environment node
 */

// Monthly Hiring Index (G2): month-window math, pre-history null, and the
// MoM delta only existing when a prior edition exists.

// unstable_cache: pass straight through so tests exercise the compute fn.
jest.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

jest.mock('../db', () => ({
  __esModule: true,
  default: {
    companyJobSnapshot: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    spaceJobPosting: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    companyProfile: {
      findMany: jest.fn(),
    },
  },
}));

import {
  getHiringIndex,
  parseMonthParam,
  latestEditionMonthKey,
  normalizeLocation,
  monthKey,
  EARLIEST_INDEX_MONTH,
} from '../hiring-index';
import prisma from '../db';

const snapshotFindFirst = prisma.companyJobSnapshot.findFirst as jest.Mock;
const snapshotFindMany = prisma.companyJobSnapshot.findMany as jest.Mock;
const jobCount = prisma.spaceJobPosting.count as jest.Mock;
const jobGroupBy = prisma.spaceJobPosting.groupBy as jest.Mock;
const profileFindMany = prisma.companyProfile.findMany as jest.Mock;

function mockEmptyDb() {
  snapshotFindFirst.mockResolvedValue(null);
  snapshotFindMany.mockResolvedValue([]);
  jobCount.mockResolvedValue(0);
  jobGroupBy.mockResolvedValue([]);
  profileFindMany.mockResolvedValue([]);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEmptyDb();
});

describe('parseMonthParam', () => {
  it('accepts a well-formed YYYY-MM', () => {
    expect(parseMonthParam('2026-08')).toEqual({ year: 2026, month: 8 });
    expect(parseMonthParam('2026-12')).toEqual({ year: 2026, month: 12 });
  });

  it('rejects malformed or out-of-range params', () => {
    for (const bad of ['2026-13', '2026-00', '2026-8', '08-2026', '2026/08', 'latest', '', '1999-05', '2200-01', '2026-08-01']) {
      expect(parseMonthParam(bad)).toBeNull();
    }
  });
});

describe('getHiringIndex — pre-history and invalid input', () => {
  it('returns null for months before snapshot history began', async () => {
    expect(await getHiringIndex(2026, 7)).toBeNull();
    expect(await getHiringIndex(2025, 12)).toBeNull();
    expect(snapshotFindFirst).not.toHaveBeenCalled();
    expect(jobCount).not.toHaveBeenCalled();
  });

  it('returns null for invalid month numbers without touching the DB', async () => {
    expect(await getHiringIndex(2026, 0)).toBeNull();
    expect(await getHiringIndex(2026, 13)).toBeNull();
    expect(await getHiringIndex(2026.5, 8)).toBeNull();
    expect(snapshotFindFirst).not.toHaveBeenCalled();
  });

  it('EARLIEST_INDEX_MONTH is the first month served', async () => {
    expect(EARLIEST_INDEX_MONTH).toBe('2026-08');
    expect(await getHiringIndex(2026, 8)).not.toBeNull();
  });
});

describe('getHiringIndex — month-window math', () => {
  it('uses [monthStart, nextMonthStart) UTC boundaries for postings and snapshots', async () => {
    await getHiringIndex(2026, 8);

    const monthStart = new Date(Date.UTC(2026, 7, 1)); // 2026-08-01T00:00:00Z
    const nextMonthStart = new Date(Date.UTC(2026, 8, 1)); // 2026-09-01T00:00:00Z

    // New-postings count: postedDate >= Aug 1, < Sep 1 (Aug 31 23:59:59 in, Sep 1 00:00 out).
    expect(jobCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { postedDate: { gte: monthStart, lt: nextMonthStart } },
      })
    );

    // Month-end _TOTAL snapshot: last snapshot strictly before next month start.
    expect(snapshotFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyName: '_TOTAL',
          date: { lt: nextMonthStart },
        }),
        orderBy: { date: 'desc' },
      })
    );

    // Per-company snapshots confined to the month window, sentinels excluded.
    expect(snapshotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: { gte: monthStart, lt: nextMonthStart },
          companyName: { notIn: ['_TOTAL', '_PRIVATE_TOTAL'] },
        }),
      })
    );
  });

  it('December wraps into January of the next year', async () => {
    await getHiringIndex(2026, 12);
    expect(jobCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          postedDate: {
            gte: new Date(Date.UTC(2026, 11, 1)),
            lt: new Date(Date.UTC(2027, 0, 1)),
          },
        },
      })
    );
  });
});

describe('getHiringIndex — MoM delta', () => {
  it('is null for the first edition (prior month predates history)', async () => {
    snapshotFindFirst.mockResolvedValue({ date: new Date(Date.UTC(2026, 7, 31)), activeJobs: 6733 });

    const index = await getHiringIndex(2026, 8);
    expect(index).not.toBeNull();
    expect(index!.activeAtMonthEnd).toBe(6733);
    expect(index!.priorActiveAtMonthEnd).toBeNull();
    expect(index!.momChange).toBeNull();
    // Only the month-end lookup — no prior-month snapshot query was issued.
    expect(snapshotFindFirst).toHaveBeenCalledTimes(1);
  });

  it('is computed when the prior month is within history', async () => {
    // First call: September month-end. Second call: prior (August) month-end.
    snapshotFindFirst
      .mockResolvedValueOnce({ date: new Date(Date.UTC(2026, 8, 30)), activeJobs: 7000 })
      .mockResolvedValueOnce({ activeJobs: 6733 });

    const index = await getHiringIndex(2026, 9);
    expect(index).not.toBeNull();
    expect(index!.activeAtMonthEnd).toBe(7000);
    expect(index!.priorActiveAtMonthEnd).toBe(6733);
    expect(index!.momChange).toBe(267);

    // Prior-month lookup is bounded by this month's start.
    expect(snapshotFindFirst).toHaveBeenNthCalledWith(2,
      expect.objectContaining({
        where: expect.objectContaining({
          companyName: '_TOTAL',
          date: { lt: new Date(Date.UTC(2026, 8, 1)) },
        }),
      })
    );
  });

  it('stays null when this month has no month-end snapshot even if the prior month does', async () => {
    snapshotFindFirst
      .mockResolvedValueOnce(null) // no September snapshot
      .mockResolvedValueOnce({ activeJobs: 6733 });

    const index = await getHiringIndex(2026, 9);
    expect(index!.activeAtMonthEnd).toBeNull();
    expect(index!.momChange).toBeNull();
  });
});

describe('getHiringIndex — company reduction', () => {
  it('ranks by last snapshot in month and computes first-vs-last movers (min 5 jobs)', async () => {
    const d13 = new Date(Date.UTC(2026, 7, 13));
    const d31 = new Date(Date.UTC(2026, 7, 31));
    snapshotFindMany.mockResolvedValue([
      // date-ascending, as the query orders
      { companyName: 'Acme', companyProfileId: 'p1', activeJobs: 100, date: d13 },
      { companyName: 'Tiny', companyProfileId: null, activeJobs: 3, date: d13 },
      { companyName: 'Shrink', companyProfileId: null, activeJobs: 50, date: d13 },
      { companyName: 'Acme', companyProfileId: 'p1', activeJobs: 130, date: d31 },
      { companyName: 'Tiny', companyProfileId: null, activeJobs: 4, date: d31 },
      { companyName: 'Shrink', companyProfileId: null, activeJobs: 40, date: d31 },
      { companyName: 'OneDay', companyProfileId: null, activeJobs: 20, date: d31 },
    ]);
    profileFindMany.mockResolvedValue([{ id: 'p1', slug: 'acme' }]);

    const index = await getHiringIndex(2026, 8);
    expect(index!.topCompanies.map((c) => c.companyName)).toEqual(['Acme', 'Shrink', 'OneDay', 'Tiny']);
    expect(index!.topCompanies[0]).toMatchObject({ slug: 'acme', activeJobs: 130, snapshotDate: '2026-08-31' });

    // Movers: Tiny excluded (< 5 jobs), OneDay excluded (single snapshot date).
    expect(index!.movers.gainers).toHaveLength(1);
    expect(index!.movers.gainers[0]).toMatchObject({ companyName: 'Acme', first: 100, last: 130, change: 30, percentChange: 30 });
    expect(index!.movers.decliners).toHaveLength(1);
    expect(index!.movers.decliners[0]).toMatchObject({ companyName: 'Shrink', change: -10 });
  });
});

describe('normalizeLocation', () => {
  it('collapses to City, Region and drops remote/empty values', () => {
    expect(normalizeLocation('Hawthorne, CA, United States')).toBe('Hawthorne, CA');
    expect(normalizeLocation('Denver, CO')).toBe('Denver, CO');
    expect(normalizeLocation('Luxembourg')).toBe('Luxembourg');
    expect(normalizeLocation('Remote')).toBeNull();
    expect(normalizeLocation('Remote - US')).toBeNull();
    expect(normalizeLocation('')).toBeNull();
    expect(normalizeLocation(null)).toBeNull();
    expect(normalizeLocation(undefined)).toBeNull();
  });
});

describe('latestEditionMonthKey', () => {
  it('is the previous UTC month once past the first edition', () => {
    expect(latestEditionMonthKey(new Date(Date.UTC(2026, 9, 2)))).toBe('2026-09'); // Oct 2 → Sep
    expect(latestEditionMonthKey(new Date(Date.UTC(2027, 0, 15)))).toBe('2026-12'); // Jan → Dec, year wrap
  });

  it('never precedes the first edition', () => {
    expect(latestEditionMonthKey(new Date(Date.UTC(2026, 7, 31)))).toBe('2026-08');
    expect(latestEditionMonthKey(new Date(Date.UTC(2026, 8, 15)))).toBe('2026-08');
  });
});

describe('monthKey', () => {
  it('zero-pads months', () => {
    expect(monthKey(2026, 8)).toBe('2026-08');
    expect(monthKey(2026, 12)).toBe('2026-12');
  });
});
