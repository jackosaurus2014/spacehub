/**
 * @jest-environment node
 *
 * Fail-soft behavior of the Regulatory Radar read helpers that back the
 * /regulatory-radar/action/[id] detail page (and its OG image), the
 * compliance calendar, and the article cross-link strip. None of these may
 * ever throw into a page tree — a missing table/column degrades to
 * null / [].
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    regulatoryAction: {
      count: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';
import {
  __resetRegulatoryRadarAvailability,
  getRadarEntryById,
  getRecentActionsByCategories,
  getUpcomingEffectiveDates,
} from '../regulatory-radar';

const mockedPrisma = prisma as unknown as {
  regulatoryAction: {
    count: jest.Mock;
    upsert: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  __resetRegulatoryRadarAvailability();
});

describe('getRadarEntryById (detail page + OG image)', () => {
  it('rejects malformed ids without touching the database', async () => {
    expect(await getRadarEntryById('')).toBeNull();
    expect(await getRadarEntryById('../etc/passwd')).toBeNull();
    expect(await getRadarEntryById('a'.repeat(65))).toBeNull();
    expect(mockedPrisma.regulatoryAction.findUnique).not.toHaveBeenCalled();
  });

  it('returns null (never throws) when the table is missing or the query errors', async () => {
    mockedPrisma.regulatoryAction.findUnique.mockRejectedValue(new Error('relation does not exist'));
    expect(await getRadarEntryById('clx123abc')).toBeNull();
  });

  it('returns the entry when found', async () => {
    const row = { id: 'clx123abc', title: 'Order Relating to Acme', significant: true };
    mockedPrisma.regulatoryAction.findUnique.mockResolvedValue(row);
    expect(await getRadarEntryById('clx123abc')).toEqual(row);
  });
});

describe('getUpcomingEffectiveDates (compliance calendar)', () => {
  it('returns [] while the effectiveDate column has not been pushed yet', async () => {
    // Column probe fails — the pre-`prisma db push` window
    mockedPrisma.regulatoryAction.findFirst.mockRejectedValue(new Error('column "effectiveDate" does not exist'));
    expect(await getUpcomingEffectiveDates(90)).toEqual([]);
    expect(mockedPrisma.regulatoryAction.findMany).not.toHaveBeenCalled();
  });

  it('queries and returns dated rows once the column exists', async () => {
    mockedPrisma.regulatoryAction.findFirst.mockResolvedValue(null); // probe OK
    const row = { id: 'a1', title: 'Final rule', effectiveDate: new Date('2026-10-01T12:00:00Z') };
    mockedPrisma.regulatoryAction.findMany.mockResolvedValue([row]);
    const rows = await getUpcomingEffectiveDates(90, new Date('2026-08-17T00:00:00Z'));
    expect(rows).toEqual([row]);
  });
});

describe('getRecentActionsByCategories (article cross-links)', () => {
  it('returns [] for an empty category list without touching the database', async () => {
    expect(await getRecentActionsByCategories([])).toEqual([]);
    expect(mockedPrisma.regulatoryAction.findMany).not.toHaveBeenCalled();
  });

  it('fails soft to [] on query errors', async () => {
    mockedPrisma.regulatoryAction.findMany.mockRejectedValue(new Error('boom'));
    expect(await getRecentActionsByCategories(['enforcement'])).toEqual([]);
  });
});
