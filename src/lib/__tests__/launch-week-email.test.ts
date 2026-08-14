/**
 * Tests for src/lib/launch-week-email.ts — the weekly "This Week in
 * Launches" retention email that backs /api/cron/launch-week-email.
 *
 * Covers: pure email composition (empty week / normal week / overflow),
 * the Monday-anchored week-key computation, and the processLaunchWeekEmail
 * orchestration (per-week idempotency via DynamicContent, and subscriber
 * "topic" targeting via the existing 'news' NotificationPreference bucket —
 * see the module-level comment in launch-week-email.ts for why there is no
 * dedicated launch-alert topic).
 *
 * Resend is always mocked; no real email is ever sent from tests.
 */

const mockBatchSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    batch: { send: mockBatchSend },
  })),
}));

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    dynamicContent: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    newsletterSubscriber: {
      findMany: jest.fn(),
    },
    spaceEvent: {
      findMany: jest.fn(),
    },
    notificationPreference: {
      findMany: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';
import {
  composeLaunchWeekEmail,
  getWeekStart,
  getLaunchWeekKey,
  formatLaunchWeekLabel,
  processLaunchWeekEmail,
  type LaunchWeekEvent,
} from '@/lib/launch-week-email';

const mockPrisma = prisma as unknown as {
  dynamicContent: { findUnique: jest.Mock; upsert: jest.Mock };
  newsletterSubscriber: { findMany: jest.Mock };
  spaceEvent: { findMany: jest.Mock };
  notificationPreference: { findMany: jest.Mock };
};

function makeLaunch(overrides: Partial<LaunchWeekEvent> = {}): LaunchWeekEvent {
  return {
    id: 'evt-1',
    name: 'Falcon 9 | Starlink 12-3',
    mission: 'Starlink 12-3',
    rocket: 'Falcon 9',
    agency: 'SpaceX',
    location: 'Cape Canaveral SFS, FL',
    launchDate: new Date('2026-08-11T14:00:00.000Z'),
    ...overrides,
  };
}

describe('getWeekStart / getLaunchWeekKey', () => {
  it('anchors to the Monday of the current week for a mid-week date', () => {
    // 2026-08-12 is a Wednesday
    const wed = new Date('2026-08-12T18:30:00.000Z');
    const monday = getWeekStart(wed);
    expect(monday.toISOString().slice(0, 10)).toBe('2026-08-10');
  });

  it('anchors to the same Monday when run ON that Monday', () => {
    const mon = new Date('2026-08-10T12:30:00.000Z');
    expect(getWeekStart(mon).toISOString().slice(0, 10)).toBe('2026-08-10');
  });

  it('anchors a Sunday to the preceding Monday', () => {
    const sun = new Date('2026-08-16T23:00:00.000Z');
    expect(getWeekStart(sun).toISOString().slice(0, 10)).toBe('2026-08-10');
  });

  it('produces a stable, week-scoped idempotency key', () => {
    const wed = new Date('2026-08-12T18:30:00.000Z');
    const mon = new Date('2026-08-10T12:30:00.000Z');
    expect(getLaunchWeekKey(wed)).toBe(getLaunchWeekKey(mon));
    expect(getLaunchWeekKey(wed)).toBe('launch-week-email:2026-08-10');
  });
});

describe('formatLaunchWeekLabel', () => {
  it('formats a same-month week range', () => {
    expect(formatLaunchWeekLabel(new Date('2026-08-10T00:00:00.000Z'))).toBe('August 10–16, 2026');
  });
});

describe('composeLaunchWeekEmail', () => {
  it('handles an empty week honestly — no launches invented, no section hidden', () => {
    const { html, text, subject } = composeLaunchWeekEmail([], new Date('2026-08-10T00:00:00.000Z'));

    expect(subject).toContain('quiet week');
    expect(html).toContain('No launches are currently scheduled');
    expect(html).toContain('Mission Control');
    expect(text).toContain('No launches are currently scheduled');
    expect(html).not.toContain('undefined');
  });

  it('renders a normal week with launches, dates, and a Mission Control watch link', () => {
    const launches = [
      makeLaunch({ id: 'evt-1', name: 'Falcon 9 | Starlink 12-3' }),
      makeLaunch({
        id: 'evt-2',
        name: 'Ariane 6 | Galileo L13',
        mission: 'Galileo L13',
        rocket: 'Ariane 6',
        agency: 'Arianespace',
        location: 'Kourou, French Guiana',
        launchDate: new Date('2026-08-13T09:00:00.000Z'),
      }),
    ];

    const { html, text, subject } = composeLaunchWeekEmail(launches, new Date('2026-08-10T00:00:00.000Z'));

    expect(subject).toBe('This Week in Launches — 2 launches (August 10–16, 2026)');
    expect(html).toContain('Starlink 12-3');
    expect(html).toContain('Galileo L13');
    expect(html).toContain('Falcon 9');
    expect(html).toContain('Arianespace');
    expect(html).toContain(`mission-control?search=${encodeURIComponent('Falcon 9 | Starlink 12-3')}`);
    expect(text).toContain('Starlink 12-3');
    expect(text).toContain('Galileo L13');
  });

  it('caps the email body and reports overflow beyond the cap', () => {
    const launches = Array.from({ length: 18 }, (_, i) =>
      makeLaunch({ id: `evt-${i}`, name: `Mission ${i}`, mission: `Mission ${i}` })
    );

    const { html, text } = composeLaunchWeekEmail(launches, new Date('2026-08-10T00:00:00.000Z'));

    expect((html.match(/mission-control\?search=/g) || []).length).toBe(15);
    expect(html).toContain('+ 3 more this week');
    expect(text).toContain('+ 3 more this week');
  });

  it('falls back to "Date TBD" when launchDate is missing, without throwing', () => {
    const launches = [makeLaunch({ launchDate: null })];
    const { html } = composeLaunchWeekEmail(launches, new Date('2026-08-10T00:00:00.000Z'));
    expect(html).toContain('Date TBD');
  });
});

describe('processLaunchWeekEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.RESEND_API_KEY;
  });

  it('skips the run when this week has already been processed (idempotent)', async () => {
    mockPrisma.dynamicContent.findUnique.mockResolvedValue({
      contentKey: 'launch-week-email:2026-08-10',
      data: JSON.stringify({ sent: 5 }),
    });

    const result = await processLaunchWeekEmail(new Date('2026-08-12T12:30:00.000Z'));

    expect(result.skipped).toBe(true);
    expect(result.weekKey).toBe('launch-week-email:2026-08-10');
    expect(mockPrisma.newsletterSubscriber.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.spaceEvent.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.dynamicContent.upsert).not.toHaveBeenCalled();
  });

  it('queries only forward-looking launch statuses within the 7-day window', async () => {
    mockPrisma.dynamicContent.findUnique.mockResolvedValue(null);
    mockPrisma.spaceEvent.findMany.mockResolvedValue([]);
    mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
    mockPrisma.dynamicContent.upsert.mockResolvedValue({});

    await processLaunchWeekEmail(new Date('2026-08-10T12:30:00.000Z'));

    const where = mockPrisma.spaceEvent.findMany.mock.calls[0][0].where;
    expect(where.type).toBe('launch');
    expect(where.status).toEqual({ in: ['upcoming', 'tbd', 'in_progress'] });
  });

  it('excludes subscribers who opted out of the news digest, and keeps anonymous subscribers (topic handling)', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockPrisma.dynamicContent.findUnique.mockResolvedValue(null);
    mockPrisma.spaceEvent.findMany.mockResolvedValue([makeLaunch()]);
    mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([
      { email: 'anon@example.com', unsubscribeToken: 'tok-anon', userId: null },
      { email: 'opted-out@example.com', unsubscribeToken: 'tok-out', userId: 'user-out' },
      { email: 'opted-in@example.com', unsubscribeToken: 'tok-in', userId: 'user-in' },
    ]);
    mockPrisma.notificationPreference.findMany.mockResolvedValue([
      { userId: 'user-out', emailDigest: true, newsDigest: false, forumReplies: true },
      { userId: 'user-in', emailDigest: true, newsDigest: true, forumReplies: true },
    ]);
    mockPrisma.dynamicContent.upsert.mockResolvedValue({});
    mockBatchSend.mockResolvedValue({ data: { data: [{ id: 'e1' }, { id: 'e2' }] }, error: null });

    const result = await processLaunchWeekEmail(new Date('2026-08-10T12:30:00.000Z'));

    // anon + opted-in = 2 recipients; opted-out excluded via NotificationPreference.newsDigest
    expect(result.subscribersConsidered).toBe(2);
    expect(mockBatchSend).toHaveBeenCalledTimes(1);
    const sentEmails = mockBatchSend.mock.calls[0][0] as Array<{ to: string }>;
    const recipients = sentEmails.map((e) => e.to);
    expect(recipients).toEqual(expect.arrayContaining(['anon@example.com', 'opted-in@example.com']));
    expect(recipients).not.toContain('opted-out@example.com');
  });

  it('records the run as processed via DynamicContent even when RESEND_API_KEY is not configured', async () => {
    mockPrisma.dynamicContent.findUnique.mockResolvedValue(null);
    mockPrisma.spaceEvent.findMany.mockResolvedValue([makeLaunch()]);
    mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([
      { email: 'anon@example.com', unsubscribeToken: 'tok-anon', userId: null },
    ]);
    mockPrisma.dynamicContent.upsert.mockResolvedValue({});

    const result = await processLaunchWeekEmail(new Date('2026-08-10T12:30:00.000Z'));

    expect(mockBatchSend).not.toHaveBeenCalled();
    expect(result.sent).toBe(0);
    expect(mockPrisma.dynamicContent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { contentKey: 'launch-week-email:2026-08-10' },
        create: expect.objectContaining({ module: 'launch-week-email' }),
      })
    );
  });

  it('marks the week processed with zero launches (a quiet week is still a completed run)', async () => {
    mockPrisma.dynamicContent.findUnique.mockResolvedValue(null);
    mockPrisma.spaceEvent.findMany.mockResolvedValue([]);
    mockPrisma.newsletterSubscriber.findMany.mockResolvedValue([]);
    mockPrisma.dynamicContent.upsert.mockResolvedValue({});

    const result = await processLaunchWeekEmail(new Date('2026-08-10T12:30:00.000Z'));

    expect(result.launchCount).toBe(0);
    expect(result.skipped).toBe(false);
    expect(mockPrisma.dynamicContent.upsert).toHaveBeenCalledTimes(1);
  });
});
