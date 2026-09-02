/**
 * @jest-environment node
 *
 * EconomicSnapshot cron + library (docs/SIMULATION_INTEGRITY_TOOLING.md §S3,
 * docs/SECURITY_AUDIT_2026-09.md "Server-authoritative inventory — phase 1").
 */

import { NextRequest } from 'next/server';

const mockGameProfile = { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() };
const mockEconomicSnapshot = { create: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn(), findUnique: jest.fn() };
const mockMarketAuditLog = { create: jest.fn() };
const mockExecuteRaw = jest.fn();

// Getters: the ES imports below are hoisted above the `const mock*`
// declarations, so the factory must not dereference them eagerly.
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    get gameProfile() { return mockGameProfile; },
    get economicSnapshot() { return mockEconomicSnapshot; },
    get marketAuditLog() { return mockMarketAuditLog; },
    $executeRaw: (...args: unknown[]) => mockExecuteRaw(...args),
  },
}));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import {
  runDailyEconomicSnapshots,
  pruneEconomicSnapshots,
  restoreEconomicSnapshot,
  snapshotDataFromRow,
  DAILY_RETENTION_DAYS,
  WEEKLY_KEEPER_RETENTION_DAYS,
  PRE_CLAMP_RETENTION_DAYS,
  ACTIVE_WINDOW_DAYS,
  SNAPSHOT_BATCH_SIZE,
} from '@/lib/game/economic-snapshot';
import { RESOURCE_BASELINE_KEY, RESOURCE_CEILINGS_KEY } from '@/lib/game/resource-plausibility';

const DAY_MS = 24 * 3600_000;
const NOW = new Date('2026-09-01T03:20:00.000Z');

function profileRow(id: string) {
  return {
    id, money: 100, netWorth: 200,
    resources: { iron: 5 }, buildingsData: [{ definitionId: 'x' }], shipsData: [],
    completedResearchList: ['a'], activeServicesData: [], workforceData: null,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEconomicSnapshot.createMany.mockImplementation(async ({ data }: { data: unknown[] }) => ({ count: data.length }));
  mockEconomicSnapshot.deleteMany.mockResolvedValue({ count: 0 });
  mockExecuteRaw.mockResolvedValue(0);
});

describe('POST /api/cron/economic-snapshot — auth', () => {
  const ORIGINAL = process.env.CRON_SECRET;
  beforeAll(() => { process.env.CRON_SECRET = 'test-cron-secret'; });
  afterAll(() => {
    if (ORIGINAL === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = ORIGINAL;
  });

  it('401 without a Bearer token', async () => {
    const { POST } = await import('@/app/api/cron/economic-snapshot/route');
    const res = await POST(new NextRequest('http://localhost/api/cron/economic-snapshot', { method: 'POST' }));
    expect(res.status).toBe(401);
    expect(mockGameProfile.findMany).not.toHaveBeenCalled();
  });

  it('401 with the wrong Bearer token', async () => {
    const { POST } = await import('@/app/api/cron/economic-snapshot/route');
    const res = await POST(new NextRequest('http://localhost/api/cron/economic-snapshot', {
      method: 'POST', headers: { authorization: 'Bearer nope' },
    }));
    expect(res.status).toBe(401);
  });

  it('runs with the right Bearer token and reports counts', async () => {
    mockGameProfile.findMany.mockResolvedValueOnce([profileRow('p1'), profileRow('p2')]);
    const { POST } = await import('@/app/api/cron/economic-snapshot/route');
    const res = await POST(new NextRequest('http://localhost/api/cron/economic-snapshot', {
      method: 'POST', headers: { authorization: 'Bearer test-cron-secret' },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.profilesConsidered).toBe(2);
    expect(body.snapshotsWritten).toBe(2);
  });
});

describe('runDailyEconomicSnapshots', () => {
  it('snapshots profiles synced in the last 30 days, batched by id cursor, reason daily', async () => {
    const batch1 = Array.from({ length: SNAPSHOT_BATCH_SIZE }, (_, i) => profileRow(`p${String(i).padStart(3, '0')}`));
    mockGameProfile.findMany
      .mockResolvedValueOnce(batch1)
      .mockResolvedValueOnce([profileRow('p999')])
      .mockResolvedValueOnce([]);

    const result = await runDailyEconomicSnapshots(NOW);

    expect(result.profilesConsidered).toBe(SNAPSHOT_BATCH_SIZE + 1);
    expect(result.snapshotsWritten).toBe(SNAPSHOT_BATCH_SIZE + 1);
    expect(result.batches).toBe(2);

    const first = mockGameProfile.findMany.mock.calls[0][0];
    expect(first.where.lastSyncAt.gte.getTime()).toBe(NOW.getTime() - ACTIVE_WINDOW_DAYS * DAY_MS);
    expect(first.take).toBe(SNAPSHOT_BATCH_SIZE);
    expect(first.cursor).toBeUndefined();
    const second = mockGameProfile.findMany.mock.calls[1][0];
    expect(second.cursor).toEqual({ id: batch1[batch1.length - 1].id });
    expect(second.skip).toBe(1);

    const rows = mockEconomicSnapshot.createMany.mock.calls[0][0].data;
    expect(rows[0]).toEqual(expect.objectContaining({ profileId: 'p000', reason: 'daily', money: 100, netWorth: 200, takenAt: NOW }));
    expect(rows[0].resources).toEqual({ iron: 5 });
  });

  it('prunes after snapshotting', async () => {
    mockGameProfile.findMany.mockResolvedValueOnce([]);
    const result = await runDailyEconomicSnapshots(NOW);
    expect(result.snapshotsWritten).toBe(0);
    expect(mockExecuteRaw).toHaveBeenCalledTimes(1);
    expect(mockEconomicSnapshot.deleteMany).toHaveBeenCalledTimes(3);
  });
});

describe('pruneEconomicSnapshots — query shape', () => {
  it('deletes non-Monday daily rows > 14 d (raw DOW filter), keepers > 90 d, pre-clamp > 90 d, manual > 365 d', async () => {
    mockExecuteRaw.mockResolvedValueOnce(7);
    mockEconomicSnapshot.deleteMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 3 });

    const r = await pruneEconomicSnapshots(NOW);
    expect(r).toEqual({ dailyDeleted: 7, weeklyKeepersDeleted: 1, preClampDeleted: 2, manualDeleted: 3 });

    // The tagged-template raw delete: strings + the cutoff value.
    const [strings, cutoff] = mockExecuteRaw.mock.calls[0] as [TemplateStringsArray, Date];
    const sql = strings.join('?').replace(/\s+/g, ' ');
    expect(sql).toContain('DELETE FROM "EconomicSnapshot"');
    expect(sql).toContain(`"reason" = 'daily'`);
    expect(sql).toContain('"takenAt" < ?');
    expect(sql).toContain('EXTRACT(DOW FROM "takenAt" AT TIME ZONE \'UTC\') <> 1');
    expect(cutoff.getTime()).toBe(NOW.getTime() - DAILY_RETENTION_DAYS * DAY_MS);

    const [keepers, preClamp, manual] = mockEconomicSnapshot.deleteMany.mock.calls.map(c => c[0]);
    expect(keepers.where.reason).toBe('daily');
    expect(keepers.where.takenAt.lt.getTime()).toBe(NOW.getTime() - WEEKLY_KEEPER_RETENTION_DAYS * DAY_MS);
    expect(preClamp.where.reason).toBe('pre-clamp');
    expect(preClamp.where.takenAt.lt.getTime()).toBe(NOW.getTime() - PRE_CLAMP_RETENTION_DAYS * DAY_MS);
    expect(manual.where.reason).toBe('manual');
    expect(manual.where.takenAt.lt.getTime()).toBe(NOW.getTime() - 365 * DAY_MS);
  });
});

describe('snapshotDataFromRow', () => {
  it('normalises garbage columns', () => {
    const d = snapshotDataFromRow({
      id: 'p', money: Number.NaN, netWorth: 5, resources: null, buildingsData: 'x', shipsData: undefined,
      completedResearchList: ['a', 3 as unknown as string], activeServicesData: null, workforceData: { a: 1 },
    }, 'manual');
    expect(d).toEqual({
      profileId: 'p', reason: 'manual', money: 0, netWorth: 5,
      resources: {}, buildingsData: [], shipsData: [], completedResearchList: ['a'],
      activeServicesData: undefined, workforceData: { a: 1 },
    });
  });
});

describe('restoreEconomicSnapshot (admin helper, no route)', () => {
  it('writes the snapshot columns back, re-baselines the resource stash, and audits critical', async () => {
    mockEconomicSnapshot.findUnique.mockResolvedValue({
      id: 'snap-1', profileId: 'p1', reason: 'pre-clamp', takenAt: NOW,
      money: 50, netWorth: 60, resources: { iron: 1000 }, buildingsData: [{ b: 1 }], shipsData: [],
      completedResearchList: ['r1'], activeServicesData: [{ s: 1 }], workforceData: { engineers: 4 },
    });
    mockGameProfile.findUnique.mockResolvedValue({ id: 'p1', money: 1e12, netWorth: 2e12, workforceData: null });
    mockGameProfile.update.mockResolvedValue({});
    mockMarketAuditLog.create.mockResolvedValue({});

    const r = await restoreEconomicSnapshot('snap-1', { actor: 'admin@test' });

    expect(r.before).toEqual({ money: 1e12, netWorth: 2e12 });
    expect(r.after).toEqual({ money: 50, netWorth: 60 });
    const upd = mockGameProfile.update.mock.calls[0][0];
    expect(upd.where).toEqual({ id: 'p1' });
    expect(upd.data.money).toBe(50);
    expect(upd.data.resources).toEqual({ iron: 1000 });
    expect(upd.data.completedResearchList).toEqual(['r1']);
    expect(upd.data.activeServicesData).toEqual([{ s: 1 }]);
    expect(upd.data.workforceData.engineers).toBe(4);
    expect(typeof upd.data.workforceData[RESOURCE_BASELINE_KEY]).toBe('string');
    expect(upd.data.workforceData[RESOURCE_CEILINGS_KEY]).toEqual({ iron: 1000 });
    const audit = mockMarketAuditLog.create.mock.calls[0][0].data;
    expect(audit.eventType).toBe('economic_snapshot_restored');
    expect(audit.severity).toBe('critical');
    expect(audit.details.actor).toBe('admin@test');
  });

  it('throws on an unknown snapshot id without touching the profile', async () => {
    mockEconomicSnapshot.findUnique.mockResolvedValue(null);
    await expect(restoreEconomicSnapshot('nope')).rejects.toThrow('not found');
    expect(mockGameProfile.update).not.toHaveBeenCalled();
  });
});
