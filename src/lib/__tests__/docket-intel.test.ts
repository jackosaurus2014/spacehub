/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    docketSnapshot: { count: jest.fn(), upsert: jest.fn(), findMany: jest.fn() },
  },
}));

import prisma from '@/lib/db';
import {
  __resetDocketIntelAvailability,
  getDocketSnapshotsForAction,
  getRecentDocketActivity,
  isDocketIntelAvailable,
  regulationsGovDocketUrl,
  upsertDocketSnapshot,
} from '../docket-intel';

const mockPrisma = prisma as unknown as {
  docketSnapshot: { count: jest.Mock; upsert: jest.Mock; findMany: jest.Mock };
};

describe('docket-intel storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetDocketIntelAvailability();
  });

  it('builds the public Regulations.gov docket URL', () => {
    expect(regulationsGovDocketUrl('FAA-2026-1234')).toBe('https://www.regulations.gov/docket/FAA-2026-1234');
  });

  it('probe fails soft when the DocketSnapshot table does not exist', async () => {
    mockPrisma.docketSnapshot.count.mockRejectedValue(new Error('relation "DocketSnapshot" does not exist'));
    expect(await isDocketIntelAvailable()).toBe(false);
  });

  it('upsert is a no-op (returns false, never throws) while the table is absent', async () => {
    mockPrisma.docketSnapshot.count.mockRejectedValue(new Error('relation does not exist'));
    const written = await upsertDocketSnapshot({
      docketId: 'FAA-2026-1234',
      actionDedupKey: 'federal-register:2026-12345',
      commentCount: 47,
      organizations: [{ name: 'SpaceX', count: 2 }],
    });
    expect(written).toBe(false);
    expect(mockPrisma.docketSnapshot.upsert).not.toHaveBeenCalled();
  });

  it('upsert writes once the table exists', async () => {
    mockPrisma.docketSnapshot.count.mockResolvedValue(0);
    mockPrisma.docketSnapshot.upsert.mockResolvedValue({});
    const written = await upsertDocketSnapshot({
      docketId: 'FAA-2026-1234',
      actionDedupKey: 'federal-register:2026-12345',
      commentCount: 47,
      organizations: [{ name: 'SpaceX', count: 2 }],
    });
    expect(written).toBe(true);
    const { where, create } = mockPrisma.docketSnapshot.upsert.mock.calls[0][0];
    expect(where).toEqual({ docketId: 'FAA-2026-1234' });
    expect(create.commentCount).toBe(47);
    expect(JSON.parse(create.organizations)).toEqual([{ name: 'SpaceX', count: 2 }]);
  });

  it('reads fail soft to [] when the table is absent or the query errors', async () => {
    mockPrisma.docketSnapshot.findMany.mockRejectedValue(new Error('relation does not exist'));
    expect(await getDocketSnapshotsForAction('federal-register:2026-12345')).toEqual([]);
    expect(await getRecentDocketActivity()).toEqual([]);
  });

  it('parses stored organizations JSON and drops malformed entries', async () => {
    mockPrisma.docketSnapshot.findMany.mockResolvedValue([
      {
        docketId: 'FAA-2026-1234',
        actionDedupKey: 'federal-register:2026-12345',
        commentCount: 47,
        organizations: JSON.stringify([{ name: 'SpaceX', count: 2 }, { name: '' }, { bogus: true }, { name: 'Iridium' }]),
        lastCheckedAt: new Date('2026-08-17T12:00:00Z'),
      },
    ]);
    const rows = await getDocketSnapshotsForAction('federal-register:2026-12345');
    expect(rows).toHaveLength(1);
    expect(rows[0].organizations).toEqual([
      { name: 'SpaceX', count: 2 },
      { name: 'Iridium', count: 1 },
    ]);
  });
});
