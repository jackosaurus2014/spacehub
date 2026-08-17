/**
 * @jest-environment node
 */

/**
 * Regulatory Wave C — per-user regulatory alerts.
 *
 * Covers:
 *   - qualifiesForRegulatoryAlert: the generalized per-category significance
 *     bar (enforcement always; FR rule/interim-final/significant; proposed
 *     only when significant; plain notices never; Congress passage-level
 *     only; agency feeds significant-only)
 *   - parseWatchedCategories / buildAlertSubject / isEffectivelyPro /
 *     buildAlertItem templated copy
 *   - processRegulatoryAlerts: absent-table fail-soft, one-email-per-user
 *     batching, watermark advance ONLY on confirmed send, non-Pro skip,
 *     10-item cap with overflow line
 */

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    regulatoryAlertPreference: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    regulatoryAction: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

import prisma from '@/lib/db';
import {
  __resetRegulatoryAlertPrefsAvailability,
  buildAlertItem,
  buildAlertSubject,
  isEffectivelyPro,
  parseWatchedCategories,
  qualifiesForRegulatoryAlert,
  whyItMattersForAlert,
} from '@/lib/regulatory-alerts';
import { __resetRegulatoryRadarAvailability, type RadarEntry } from '@/lib/regulatory-radar';
import { processRegulatoryAlerts } from '@/lib/alerts/regulatory-alert-processor';

const mockPrisma = prisma as unknown as {
  regulatoryAlertPreference: {
    count: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  regulatoryAction: {
    count: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
  };
};

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<RadarEntry> = {}): RadarEntry {
  return {
    id: 'act-1',
    dedupKey: 'federal-register:2026-1',
    source: 'federal-register',
    category: 'export-controls',
    title: 'Revisions to the Commerce Control List',
    summary: null,
    actionDate: new Date('2026-08-14T00:00:00Z'),
    url: 'https://www.federalregister.gov/d/2026-1',
    agency: 'Bureau of Industry and Security',
    documentType: 'Rule',
    actionText: 'Final rule',
    commentUrl: null,
    commentCloseDate: null,
    significant: false,
    ...overrides,
  };
}

const NOW = new Date('2026-08-16T09:00:00Z');

function makePref(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pref-1',
    userId: 'user-1',
    enabled: true,
    watchedCategories: JSON.stringify(['export-controls']),
    frequency: 'immediate',
    unsubscribeToken: 'tok-abc',
    lastSentAt: new Date('2026-08-15T09:00:00Z'),
    createdAt: new Date('2026-08-01T00:00:00Z'),
    updatedAt: new Date('2026-08-01T00:00:00Z'),
    user: {
      email: 'pro@example.com',
      name: 'Pro User',
      subscriptionTier: 'pro',
      trialTier: null,
      trialEndDate: null,
    },
    ...overrides,
  };
}

// ── Qualifier ────────────────────────────────────────────────────────────────

describe('qualifiesForRegulatoryAlert', () => {
  it('enforcement category ALWAYS qualifies (even notice-typed documents)', () => {
    expect(
      qualifiesForRegulatoryAlert(
        makeEntry({ category: 'enforcement', documentType: 'Notice', significant: false })
      )
    ).toBe(true);
    expect(
      qualifiesForRegulatoryAlert(
        makeEntry({ category: 'enforcement', source: 'fcc', documentType: null, significant: false })
      )
    ).toBe(true);
  });

  it('FR final rules qualify for any category', () => {
    expect(qualifiesForRegulatoryAlert(makeEntry({ category: 'spectrum', documentType: 'Rule' }))).toBe(true);
    expect(
      qualifiesForRegulatoryAlert(makeEntry({ category: 'launch-licensing', documentType: 'Rule' }))
    ).toBe(true);
  });

  it('FR interim final rules qualify via the action line', () => {
    expect(
      qualifiesForRegulatoryAlert(
        makeEntry({ category: 'space-traffic', documentType: 'Proposed Rule', actionText: 'Interim final rule' })
      )
    ).toBe(true);
  });

  it('FR proposed rules qualify ONLY when flagged significant', () => {
    const base = { category: 'remote-sensing' as const, documentType: 'Proposed Rule', actionText: 'Proposed rule' };
    expect(qualifiesForRegulatoryAlert(makeEntry({ ...base, significant: false }))).toBe(false);
    expect(qualifiesForRegulatoryAlert(makeEntry({ ...base, significant: true }))).toBe(true);
  });

  it('FR plain notices NEVER qualify, even flagged significant', () => {
    expect(
      qualifiesForRegulatoryAlert(
        makeEntry({ category: 'procurement-policy', documentType: 'Notice', significant: true })
      )
    ).toBe(false);
  });

  it('Congress: passage-level actions qualify, introductions never', () => {
    const congress = {
      source: 'congress' as const,
      category: 'procurement-policy' as const,
      documentType: 'hr',
    };
    expect(
      qualifiesForRegulatoryAlert(makeEntry({ ...congress, actionText: 'Passed the Senate by voice vote' }))
    ).toBe(true);
    expect(
      qualifiesForRegulatoryAlert(makeEntry({ ...congress, actionText: 'Became Public Law No: 119-42' }))
    ).toBe(true);
    expect(
      qualifiesForRegulatoryAlert(
        makeEntry({ ...congress, actionText: 'Introduced in House', significant: true })
      )
    ).toBe(false);
    expect(
      qualifiesForRegulatoryAlert(
        makeEntry({ ...congress, actionText: 'Referred to the Committee on Armed Services' })
      )
    ).toBe(false);
  });

  it('agency filing feeds (fcc/faa/itu/sec) qualify only when significant', () => {
    expect(
      qualifiesForRegulatoryAlert(makeEntry({ source: 'fcc', category: 'spectrum', documentType: null, significant: false }))
    ).toBe(false);
    expect(
      qualifiesForRegulatoryAlert(makeEntry({ source: 'fcc', category: 'spectrum', documentType: null, significant: true }))
    ).toBe(true);
    expect(
      qualifiesForRegulatoryAlert(makeEntry({ source: 'faa', category: 'launch-licensing', documentType: null, significant: false }))
    ).toBe(false);
  });
});

// ── Pure helpers ─────────────────────────────────────────────────────────────

describe('parseWatchedCategories', () => {
  it('parses valid categories, deduplicates, drops unknown values', () => {
    expect(
      parseWatchedCategories(JSON.stringify(['spectrum', 'spectrum', 'not-a-category', 'enforcement']))
    ).toEqual(['spectrum', 'enforcement']);
  });

  it('fails soft on invalid JSON / non-arrays / empty', () => {
    expect(parseWatchedCategories('not json')).toEqual([]);
    expect(parseWatchedCategories(JSON.stringify({ a: 1 }))).toEqual([]);
    expect(parseWatchedCategories(null)).toEqual([]);
    expect(parseWatchedCategories('')).toEqual([]);
  });
});

describe('buildAlertSubject', () => {
  it('single category: "Regulatory alert: 2 export-control actions"', () => {
    expect(
      buildAlertSubject([{ category: 'export-controls' }, { category: 'export-controls' }])
    ).toBe('Regulatory alert: 2 export-control actions');
  });

  it('singularizes for one item', () => {
    expect(buildAlertSubject([{ category: 'enforcement' }])).toBe(
      'Regulatory alert: 1 enforcement action'
    );
  });

  it('multiple categories: counts actions and categories', () => {
    expect(
      buildAlertSubject([
        { category: 'spectrum' },
        { category: 'enforcement' },
        { category: 'export-controls' },
      ])
    ).toBe('Regulatory alert: 3 actions across 3 categories');
  });
});

describe('isEffectivelyPro', () => {
  it('pro and legacy enterprise tiers are Pro', () => {
    expect(isEffectivelyPro({ subscriptionTier: 'pro', trialTier: null, trialEndDate: null })).toBe(true);
    expect(isEffectivelyPro({ subscriptionTier: 'enterprise', trialTier: null, trialEndDate: null })).toBe(true);
  });

  it('free is not Pro; an active pro trial is; an expired trial is not', () => {
    expect(isEffectivelyPro({ subscriptionTier: 'free', trialTier: null, trialEndDate: null })).toBe(false);
    expect(
      isEffectivelyPro(
        { subscriptionTier: 'free', trialTier: 'pro', trialEndDate: new Date(NOW.getTime() + 86400000) },
        NOW
      )
    ).toBe(true);
    expect(
      isEffectivelyPro(
        { subscriptionTier: 'free', trialTier: 'pro', trialEndDate: new Date(NOW.getTime() - 86400000) },
        NOW
      )
    ).toBe(false);
  });
});

describe('buildAlertItem / whyItMattersForAlert', () => {
  it('reuses the Export Control Watch agency-keyed copy for export-controls', () => {
    const item = buildAlertItem(makeEntry());
    expect(item.whatHappened).toBe('Final rule published');
    expect(item.whyItMatters).toContain('EAR');
    expect(item.dateLine).toBe('Published 2026-08-14');
  });

  it('uses category-templated copy for other categories', () => {
    expect(whyItMattersForAlert(makeEntry({ category: 'enforcement' }))).toContain('Enforcement actions');
    expect(whyItMattersForAlert(makeEntry({ category: 'spectrum' }))).toContain('Spectrum');
  });

  it('prefers the comment-close date line when a window is open', () => {
    const item = buildAlertItem(
      makeEntry({ commentCloseDate: new Date('2026-09-12T00:00:00Z') })
    );
    expect(item.dateLine).toBe('Comments close 2026-09-12');
  });
});

// ── Processor ────────────────────────────────────────────────────────────────

describe('processRegulatoryAlerts', () => {
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetRegulatoryAlertPrefsAvailability();
    __resetRegulatoryRadarAvailability();
    process.env.RESEND_API_KEY = 'test-key';
    fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    global.fetch = fetchMock as unknown as typeof fetch;
    mockPrisma.regulatoryAlertPreference.count.mockResolvedValue(0);
    mockPrisma.regulatoryAction.count.mockResolvedValue(0);
    mockPrisma.regulatoryAlertPreference.update.mockResolvedValue({});
  });

  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.RESEND_API_KEY;
  });

  it('fails soft to zero stats when the prefs table is missing', async () => {
    mockPrisma.regulatoryAlertPreference.count.mockRejectedValue(new Error('relation does not exist'));
    const stats = await processRegulatoryAlerts('immediate', NOW);
    expect(stats).toEqual({ usersProcessed: 0, emailsSent: 0, itemsSent: 0, skipped: 0, errors: 0 });
    expect(mockPrisma.regulatoryAlertPreference.findMany).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails soft to zero stats when the RegulatoryAction table is missing', async () => {
    mockPrisma.regulatoryAction.count.mockRejectedValue(new Error('relation does not exist'));
    const stats = await processRegulatoryAlerts('daily', NOW);
    expect(stats.emailsSent).toBe(0);
    expect(mockPrisma.regulatoryAlertPreference.findMany).not.toHaveBeenCalled();
  });

  it('batches all qualifying actions into ONE email and advances the watermark on send', async () => {
    mockPrisma.regulatoryAlertPreference.findMany.mockResolvedValue([makePref()]);
    mockPrisma.regulatoryAction.findMany.mockResolvedValue([
      makeEntry({ id: 'a1' }),
      makeEntry({ id: 'a2', documentType: 'Proposed Rule', significant: true }),
      makeEntry({ id: 'a3', documentType: 'Notice' }), // never qualifies
    ]);

    const stats = await processRegulatoryAlerts('immediate', NOW);

    expect(fetchMock).toHaveBeenCalledTimes(1); // one email per user per run
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to).toBe('pro@example.com');
    expect(body.subject).toBe('Regulatory alert: 2 export-control actions');
    expect(body.html).toContain('/regulatory-radar/action/a1');
    expect(body.html).toContain('/regulatory-radar/action/a2');
    expect(body.html).not.toContain('/regulatory-radar/action/a3');
    expect(body.html).toContain('not legal advice');
    expect(body.html).toContain('/api/regulatory-alerts/unsubscribe?token=tok-abc');
    expect(body.headers['List-Unsubscribe']).toContain('/api/regulatory-alerts/unsubscribe?token=tok-abc');
    expect(body.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');

    // Watermark advanced to the query's upper bound
    expect(mockPrisma.regulatoryAlertPreference.update).toHaveBeenCalledWith({
      where: { id: 'pref-1' },
      data: { lastSentAt: NOW },
    });
    expect(stats).toMatchObject({ usersProcessed: 1, emailsSent: 1, itemsSent: 2, errors: 0 });
  });

  it('queries strictly after the lastSentAt watermark', async () => {
    mockPrisma.regulatoryAlertPreference.findMany.mockResolvedValue([makePref()]);
    mockPrisma.regulatoryAction.findMany.mockResolvedValue([]);

    await processRegulatoryAlerts('immediate', NOW);

    const where = mockPrisma.regulatoryAction.findMany.mock.calls[0][0].where;
    expect(where.createdAt.gt).toEqual(new Date('2026-08-15T09:00:00Z'));
    expect(where.createdAt.lte).toEqual(NOW);
    expect(where.category).toEqual({ in: ['export-controls'] });
  });

  it('does NOT advance the watermark when the send fails (retries same window next run)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });
    mockPrisma.regulatoryAlertPreference.findMany.mockResolvedValue([makePref()]);
    mockPrisma.regulatoryAction.findMany.mockResolvedValue([makeEntry({ id: 'a1' })]);

    const stats = await processRegulatoryAlerts('immediate', NOW);

    expect(mockPrisma.regulatoryAlertPreference.update).not.toHaveBeenCalled();
    expect(stats.emailsSent).toBe(0);
    expect(stats.errors).toBe(1);
  });

  it('does not send or advance anything when no candidate qualifies', async () => {
    mockPrisma.regulatoryAlertPreference.findMany.mockResolvedValue([makePref()]);
    mockPrisma.regulatoryAction.findMany.mockResolvedValue([
      makeEntry({ documentType: 'Notice' }),
      makeEntry({ documentType: 'Proposed Rule', significant: false }),
    ]);

    const stats = await processRegulatoryAlerts('immediate', NOW);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockPrisma.regulatoryAlertPreference.update).not.toHaveBeenCalled();
    expect(stats.emailsSent).toBe(0);
  });

  it('skips non-Pro users server-side (lapsed subscriptions stop receiving)', async () => {
    mockPrisma.regulatoryAlertPreference.findMany.mockResolvedValue([
      makePref({
        user: {
          email: 'free@example.com',
          name: null,
          subscriptionTier: 'free',
          trialTier: null,
          trialEndDate: null,
        },
      }),
    ]);

    const stats = await processRegulatoryAlerts('immediate', NOW);

    expect(mockPrisma.regulatoryAction.findMany).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(stats.skipped).toBe(1);
  });

  it('caps at 10 items per email and appends the "more on the Radar" overflow line', async () => {
    mockPrisma.regulatoryAlertPreference.findMany.mockResolvedValue([makePref()]);
    mockPrisma.regulatoryAction.findMany.mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => makeEntry({ id: `act-${i}` }))
    );

    const stats = await processRegulatoryAlerts('immediate', NOW);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.subject).toBe('Regulatory alert: 10 export-control actions');
    expect(body.html).toContain('2 more qualifying actions');
    expect(body.html).toContain('/regulatory-radar');
    expect(stats.itemsSent).toBe(10);
  });

  it('brand-new prefs (no watermark) baseline at the pref creation time, not deep history', async () => {
    mockPrisma.regulatoryAlertPreference.findMany.mockResolvedValue([
      makePref({ lastSentAt: null, createdAt: new Date('2026-08-14T12:00:00Z') }),
    ]);
    mockPrisma.regulatoryAction.findMany.mockResolvedValue([]);

    await processRegulatoryAlerts('immediate', NOW);

    const where = mockPrisma.regulatoryAction.findMany.mock.calls[0][0].where;
    expect(where.createdAt.gt).toEqual(new Date('2026-08-14T12:00:00Z'));
  });
});
