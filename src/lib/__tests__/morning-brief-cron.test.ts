/**
 * @jest-environment node
 *
 * SpaceNexus AM cron — idempotency, gate-failure handling (no send + alert),
 * weekend skip, and the registry row. Prisma, the Resend batch sender, the
 * builder, and the alert are mocked: no DB, no email, no Anthropic call.
 */
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockSubscribers = jest.fn();
const mockLogCreate = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    morningBrief: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      create: (...a: unknown[]) => mockCreate(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
    newsletterSubscriber: { findMany: (...a: unknown[]) => mockSubscribers(...a) },
    dataRefreshLog: { create: (...a: unknown[]) => mockLogCreate(...a) },
  },
}));
jest.mock('@/lib/logger', () => ({ logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const mockBuild = jest.fn();
const mockAlert = jest.fn();
jest.mock('@/lib/morning-brief', () => ({
  buildMorningBrief: (...a: unknown[]) => mockBuild(...a),
  sendMorningBriefAlert: (...a: unknown[]) => mockAlert(...a),
}));

const mockSend = jest.fn();
jest.mock('@/lib/newsletter/email-service', () => ({ sendDailyDigest: (...a: unknown[]) => mockSend(...a) }));

import { POST } from '@/app/api/cron/morning-brief/route';

const WEEKDAY = new Date('2026-09-15T12:00:30Z');
const SATURDAY = new Date('2026-09-12T12:00:30Z');

function req() {
  return new NextRequest('https://spacenexus.us/api/cron/morning-brief', { method: 'POST', headers: { authorization: 'Bearer test-cron-secret' } });
}

function okBuild() {
  return {
    gate: { ok: true, failures: [] },
    poolSize: 20,
    rankedSize: 5,
    draftError: null,
    issue: { date: '2026-09-15', subject: 'AM: x', preheader: 'y', stories: [1, 2, 3, 4, 5], nextLaunch: null, oneNumber: null, model: 'claude-sonnet-5', windowHours: 24, generatedAt: WEEKDAY.toISOString() },
    rendered: { subject: 'AM: x', preheader: 'y', html: '<p>hi {{UNSUBSCRIBE_TOKEN}}</p>', plain: 'hi' },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(WEEKDAY);
  process.env.CRON_SECRET = 'test-cron-secret';
  mockCreate.mockResolvedValue({});
  mockUpdate.mockResolvedValue({});
  mockLogCreate.mockResolvedValue({});
});
afterEach(() => jest.useRealTimers());

describe('POST /api/cron/morning-brief', () => {
  it('rejects a missing bearer', async () => {
    const res = await POST(new NextRequest('https://spacenexus.us/api/cron/morning-brief', { method: 'POST' }));
    expect(res.status).toBe(401);
    expect(mockBuild).not.toHaveBeenCalled();
  });

  it('skips weekends without touching the ledger', async () => {
    jest.setSystemTime(SATURDAY);
    const body = await (await POST(req())).json();
    expect(body).toMatchObject({ skipped: true, reason: 'weekend' });
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockBuild).not.toHaveBeenCalled();
  });

  it('never sends twice for the same date (ledger fast-exit)', async () => {
    mockFindUnique.mockResolvedValue({ status: 'sent', sentCount: 12 });
    const body = await (await POST(req())).json();
    expect(body).toMatchObject({ alreadyHandled: true, date: '2026-09-15', status: 'sent' });
    expect(mockBuild).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('loses the claim race on P2002 and exits without sending', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockRejectedValue({ code: 'P2002' });
    const body = await (await POST(req())).json();
    expect(body).toMatchObject({ alreadyHandled: true });
    expect(mockBuild).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('claims the day, builds once, sends to morningBrief opt-ins, records counts', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockBuild.mockResolvedValue(okBuild());
    mockSubscribers.mockResolvedValue([{ email: 'a@x.io', unsubscribeToken: 't1' }, { email: 'b@x.io', unsubscribeToken: 't2' }]);
    mockSend.mockResolvedValue({ success: true, sentCount: 2, failedCount: 0, errors: [] });

    const body = await (await POST(req())).json();

    expect(mockCreate).toHaveBeenCalledWith({ data: { date: '2026-09-15', status: 'sending' } });
    expect(mockBuild).toHaveBeenCalledTimes(1);
    expect(mockSubscribers).toHaveBeenCalledWith(expect.objectContaining({ where: { verified: true, unsubscribedAt: null, morningBrief: true } }));
    expect(mockSend).toHaveBeenCalledWith(expect.any(Array), '<p>hi {{UNSUBSCRIBE_TOKEN}}</p>', 'hi', 'AM: x');
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { date: '2026-09-15' }, data: expect.objectContaining({ status: 'sent', sentCount: 2, failedCount: 0 }) }));
    expect(mockAlert).not.toHaveBeenCalled();
    expect(body).toMatchObject({ sent: true, sentCount: 2, subject: 'AM: x' });
  });

  it('on a gate failure: records failed, sends nothing, emails the alert inbox', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockBuild.mockResolvedValue({ ...okBuild(), gate: { ok: false, failures: ['only 2 qualifying stories (need 3)'] }, rendered: null });
    const body = await (await POST(req())).json();
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockSubscribers).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'failed', errorLog: 'only 2 qualifying stories (need 3)' }) }));
    expect(mockAlert).toHaveBeenCalledWith('2026-09-15', ['only 2 qualifying stories (need 3)']);
    expect(body).toMatchObject({ sent: false, failures: ['only 2 qualifying stories (need 3)'] });
  });

  it('with no opt-ins yet, archives the issue and records sentCount 0', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockBuild.mockResolvedValue(okBuild());
    mockSubscribers.mockResolvedValue([]);
    const body = await (await POST(req())).json();
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ htmlContent: '<p>hi {{UNSUBSCRIBE_TOKEN}}</p>' }) }));
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'sent', sentCount: 0 } }));
    expect(body).toMatchObject({ sent: true, sentCount: 0 });
  });
});

describe('cron registry', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/lib/cron-scheduler.ts'), 'utf-8');
  it('schedules SpaceNexus AM on weekdays at 12:00 UTC with a weekend-spanning staleness window', () => {
    const m = src.match(/schedule:\s*'([^']+)',\s*path:\s*'\/api\/cron\/morning-brief',\s*label:\s*'morning-brief',\s*maxStaleMinutes:\s*(\d+)/);
    expect(m).not.toBeNull();
    expect(m![1]).toBe('0 12 * * 1-5');
    // Friday 12:00 → Monday 12:00 is 4320 minutes; anything less alerts every weekend.
    expect(Number(m![2])).toBeGreaterThanOrEqual(4320);
  });
});
