/**
 * Tests for src/lib/job-alerts.ts — the daily job-alert processor that backs
 * /api/cron/job-alerts. Verifies filter matching, the createdAt-cursor
 * idempotency scheme, delivery recording, and that no real email is ever
 * sent from tests (Resend is always mocked; RESEND_API_KEY is never read
 * from a real environment here).
 */

const mockResendSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockResendSend },
  })),
}));

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    savedSearch: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    spaceJobPosting: {
      findMany: jest.fn(),
    },
    alertDelivery: {
      create: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';
import { processJobAlerts } from '@/lib/job-alerts';

const mockPrisma = prisma as unknown as {
  savedSearch: { findMany: jest.Mock; update: jest.Mock };
  user: { findMany: jest.Mock };
  spaceJobPosting: { findMany: jest.Mock };
  alertDelivery: { create: jest.Mock };
};

const BASE_SEARCH = {
  id: 'search-1',
  userId: 'user-1',
  name: 'Job alert: Engineering',
  searchType: 'space_jobs',
  query: null as string | null,
  alertEnabled: true,
  filters: { category: 'engineering', lastAlertRunAt: null as string | null },
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
};

const BASE_JOB = {
  id: 'job-1',
  title: 'Propulsion Engineer',
  company: 'Rocket Co',
  location: 'Denver, CO',
  remoteOk: false,
  category: 'engineering',
  seniorityLevel: 'mid',
  salaryMin: 100000,
  salaryMax: 140000,
};

describe('processJobAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.RESEND_API_KEY;
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1', email: 'user@example.com', name: 'Jay' }]);
  });

  it('returns zeroed result and never queries jobs when there are no enabled job-search alerts', async () => {
    mockPrisma.savedSearch.findMany.mockResolvedValue([]);

    const result = await processJobAlerts();

    expect(result).toEqual({
      searchesProcessed: 0,
      alertsSent: 0,
      emailsSkipped: 0,
      totalNewJobMatches: 0,
      errors: 0,
    });
    expect(mockPrisma.spaceJobPosting.findMany).not.toHaveBeenCalled();
  });

  it('only queries SavedSearch rows scoped to searchType=space_jobs and alertEnabled=true', async () => {
    mockPrisma.savedSearch.findMany.mockResolvedValue([]);
    await processJobAlerts();
    expect(mockPrisma.savedSearch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { searchType: 'space_jobs', alertEnabled: true } })
    );
  });

  it('applies category/seniority/remote/query filters and the createdAt cursor to the job query', async () => {
    const search = {
      ...BASE_SEARCH,
      query: 'thermal',
      filters: { category: 'engineering', seniorityLevel: 'senior', remoteOk: true, lastAlertRunAt: '2026-08-05T00:00:00.000Z' },
    };
    mockPrisma.savedSearch.findMany.mockResolvedValue([search]);
    mockPrisma.spaceJobPosting.findMany.mockResolvedValue([]);
    mockPrisma.savedSearch.update.mockResolvedValue({});

    await processJobAlerts();

    const where = mockPrisma.spaceJobPosting.findMany.mock.calls[0][0].where;
    expect(where.isActive).toBe(true);
    expect(where.category).toBe('engineering');
    expect(where.seniorityLevel).toBe('senior');
    expect(where.remoteOk).toBe(true);
    expect(where.createdAt).toEqual({ gte: new Date('2026-08-05T00:00:00.000Z') });
    expect(where.OR).toEqual([
      { title: { contains: 'thermal', mode: 'insensitive' } },
      { company: { contains: 'thermal', mode: 'insensitive' } },
      { location: { contains: 'thermal', mode: 'insensitive' } },
      { specialization: { contains: 'thermal', mode: 'insensitive' } },
    ]);
  });

  it('falls back to the search createdAt as the cursor on first run (no lastAlertRunAt yet)', async () => {
    mockPrisma.savedSearch.findMany.mockResolvedValue([BASE_SEARCH]);
    mockPrisma.spaceJobPosting.findMany.mockResolvedValue([]);
    mockPrisma.savedSearch.update.mockResolvedValue({});

    await processJobAlerts();

    const where = mockPrisma.spaceJobPosting.findMany.mock.calls[0][0].where;
    expect(where.createdAt).toEqual({ gte: BASE_SEARCH.createdAt });
  });

  it('advances the lastAlertRunAt cursor even when there are zero matches (idempotent no-op run)', async () => {
    mockPrisma.savedSearch.findMany.mockResolvedValue([BASE_SEARCH]);
    mockPrisma.spaceJobPosting.findMany.mockResolvedValue([]);
    mockPrisma.savedSearch.update.mockResolvedValue({});

    const result = await processJobAlerts();

    expect(result.alertsSent).toBe(0);
    expect(mockPrisma.savedSearch.update).toHaveBeenCalledTimes(1);
    const data = mockPrisma.savedSearch.update.mock.calls[0][0].data;
    expect(data.filters.lastAlertRunAt).toEqual(expect.any(String));
    expect(data.filters.category).toBe('engineering'); // preserves other filter keys
    expect(mockPrisma.alertDelivery.create).not.toHaveBeenCalled();
  });

  it('sends an email and records a sent AlertDelivery when RESEND_API_KEY is configured and there are matches', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockPrisma.savedSearch.findMany.mockResolvedValue([BASE_SEARCH]);
    mockPrisma.spaceJobPosting.findMany.mockResolvedValue([BASE_JOB]);
    mockPrisma.savedSearch.update.mockResolvedValue({});
    mockPrisma.alertDelivery.create.mockResolvedValue({});
    mockResendSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });

    const result = await processJobAlerts();

    expect(result.alertsSent).toBe(1);
    expect(result.totalNewJobMatches).toBe(1);
    expect(result.emailsSkipped).toBe(0);
    expect(mockResendSend).toHaveBeenCalledTimes(1);
    const sendArgs = mockResendSend.mock.calls[0][0];
    expect(sendArgs.to).toBe('user@example.com');
    expect(sendArgs.subject).toBe('1 new space job matches "Job alert: Engineering"');
    expect(sendArgs.html).toContain('/space-talent/job/job-1');

    expect(mockPrisma.alertDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          channel: 'email',
          status: 'sent',
          source: 'job_alert',
          data: expect.objectContaining({ searchId: 'search-1', jobIds: ['job-1'], totalMatches: 1 }),
        }),
      })
    );
  });

  it('never calls Resend and records a failed delivery when RESEND_API_KEY is not configured', async () => {
    mockPrisma.savedSearch.findMany.mockResolvedValue([BASE_SEARCH]);
    mockPrisma.spaceJobPosting.findMany.mockResolvedValue([BASE_JOB]);
    mockPrisma.savedSearch.update.mockResolvedValue({});
    mockPrisma.alertDelivery.create.mockResolvedValue({});

    const result = await processJobAlerts();

    expect(mockResendSend).not.toHaveBeenCalled();
    expect(result.alertsSent).toBe(0);
    expect(result.emailsSkipped).toBe(1);
    expect(mockPrisma.alertDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed', failReason: 'RESEND_API_KEY not configured' }) })
    );
  });

  it('caps the email body at 20 jobs and reports the overflow', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    const jobs = Array.from({ length: 25 }, (_, i) => ({ ...BASE_JOB, id: `job-${i}` }));
    mockPrisma.savedSearch.findMany.mockResolvedValue([BASE_SEARCH]);
    mockPrisma.spaceJobPosting.findMany.mockResolvedValue(jobs);
    mockPrisma.savedSearch.update.mockResolvedValue({});
    mockPrisma.alertDelivery.create.mockResolvedValue({});
    mockResendSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });

    await processJobAlerts();

    const sendArgs = mockResendSend.mock.calls[0][0];
    expect(sendArgs.subject).toBe('25 new space jobs match "Job alert: Engineering"');
    expect((sendArgs.html.match(/space-talent\/job\//g) || []).length).toBe(20);
    expect(sendArgs.html).toContain('+ 5 more');
  });

  it('dry-run mode never writes to the database or calls Resend', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockPrisma.savedSearch.findMany.mockResolvedValue([BASE_SEARCH]);
    mockPrisma.spaceJobPosting.findMany.mockResolvedValue([BASE_JOB]);

    const result = await processJobAlerts({ dryRun: true });

    expect(result.alertsSent).toBe(1);
    expect(mockResendSend).not.toHaveBeenCalled();
    expect(mockPrisma.savedSearch.update).not.toHaveBeenCalled();
    expect(mockPrisma.alertDelivery.create).not.toHaveBeenCalled();
  });

  it('skips a search whose user record cannot be found', async () => {
    mockPrisma.savedSearch.findMany.mockResolvedValue([{ ...BASE_SEARCH, userId: 'ghost-user' }]);
    mockPrisma.spaceJobPosting.findMany.mockResolvedValue([BASE_JOB]);
    mockPrisma.savedSearch.update.mockResolvedValue({});
    mockPrisma.user.findMany.mockResolvedValue([]); // no matching user

    const result = await processJobAlerts();

    expect(result.alertsSent).toBe(0);
    expect(mockResendSend).not.toHaveBeenCalled();
  });
});
