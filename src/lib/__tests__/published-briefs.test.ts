/**
 * @jest-environment node
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    publishedBrief: {
      count: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  isPublishedBriefAvailable,
  mirrorInsightAsBrief,
  __resetPublishedBriefAvailability,
} from '@/lib/published-briefs';

const mockPrisma = prisma as unknown as {
  publishedBrief: { count: jest.Mock; upsert: jest.Mock };
};

function insightInput(overrides: Partial<Parameters<typeof mirrorInsightAsBrief>[0]> = {}) {
  return {
    id: 'insight-1',
    slug: 'state-of-the-space-economy-2026-08-10',
    title: 'State of the Space Economy — Aug 10',
    summary: 'This week in numbers.',
    content: '# This week\n\nDetails.',
    publishedAt: new Date('2026-08-10T00:00:00Z'),
    briefType: 'economy' as const,
    ...overrides,
  };
}

describe('isPublishedBriefAvailable', () => {
  beforeEach(() => {
    __resetPublishedBriefAvailability();
    jest.clearAllMocks();
  });

  it('returns true and caches when the table exists', async () => {
    mockPrisma.publishedBrief.count.mockResolvedValue(0);
    const first = await isPublishedBriefAvailable();
    const second = await isPublishedBriefAvailable();
    expect(first).toBe(true);
    expect(second).toBe(true);
    // Cached once true — only probed once.
    expect(mockPrisma.publishedBrief.count).toHaveBeenCalledTimes(1);
  });

  it('returns false and logs a warning when the table does not exist yet', async () => {
    mockPrisma.publishedBrief.count.mockRejectedValue(new Error('relation "PublishedBrief" does not exist'));
    const result = await isPublishedBriefAvailable();
    expect(result).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('PublishedBrief table unavailable'));
  });

  it('re-probes on the next call within the TTL window returns cached false without re-querying immediately after a failure, but does re-query once the probe is reset', async () => {
    mockPrisma.publishedBrief.count.mockRejectedValueOnce(new Error('missing table'));
    const first = await isPublishedBriefAvailable();
    expect(first).toBe(false);

    // Within TTL — should short-circuit to cached false, no extra query.
    const second = await isPublishedBriefAvailable();
    expect(second).toBe(false);
    expect(mockPrisma.publishedBrief.count).toHaveBeenCalledTimes(1);

    // After a manual reset (simulating TTL expiry / cold start), it probes again.
    __resetPublishedBriefAvailability();
    mockPrisma.publishedBrief.count.mockResolvedValueOnce(0);
    const third = await isPublishedBriefAvailable();
    expect(third).toBe(true);
    expect(mockPrisma.publishedBrief.count).toHaveBeenCalledTimes(2);
  });
});

describe('mirrorInsightAsBrief', () => {
  beforeEach(() => {
    __resetPublishedBriefAvailability();
    jest.clearAllMocks();
  });

  it('upserts a PublishedBrief row keyed by slug when the table is available', async () => {
    mockPrisma.publishedBrief.count.mockResolvedValue(0);
    mockPrisma.publishedBrief.upsert.mockResolvedValue({});

    const input = insightInput();
    const ok = await mirrorInsightAsBrief(input);

    expect(ok).toBe(true);
    expect(mockPrisma.publishedBrief.upsert).toHaveBeenCalledWith({
      where: { slug: input.slug },
      create: expect.objectContaining({
        slug: input.slug,
        title: input.title,
        briefType: 'economy',
        summary: input.summary,
        contentMd: input.content,
        publishedAt: input.publishedAt,
        sourceInsightId: input.id,
      }),
      update: expect.objectContaining({
        title: input.title,
        summary: input.summary,
        contentMd: input.content,
        publishedAt: input.publishedAt,
        sourceInsightId: input.id,
      }),
    });
  });

  it('is a no-op that returns false — never throws — when the table is missing', async () => {
    mockPrisma.publishedBrief.count.mockRejectedValue(new Error('relation does not exist'));

    const ok = await mirrorInsightAsBrief(insightInput());

    expect(ok).toBe(false);
    expect(mockPrisma.publishedBrief.upsert).not.toHaveBeenCalled();
  });

  it('is a no-op that returns false — never throws — when the upsert itself fails', async () => {
    mockPrisma.publishedBrief.count.mockResolvedValue(0);
    mockPrisma.publishedBrief.upsert.mockRejectedValue(new Error('unique constraint violation'));

    const ok = await mirrorInsightAsBrief(insightInput());

    expect(ok).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      'mirrorInsightAsBrief: upsert failed',
      expect.objectContaining({ slug: insightInput().slug })
    );
  });

  it('mirrors hiring-type insights with briefType "hiring"', async () => {
    mockPrisma.publishedBrief.count.mockResolvedValue(0);
    mockPrisma.publishedBrief.upsert.mockResolvedValue({});

    const input = insightInput({
      slug: 'whos-hiring-week-of-2026-08-10',
      briefType: 'hiring',
    });
    await mirrorInsightAsBrief(input);

    expect(mockPrisma.publishedBrief.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ briefType: 'hiring' }),
      })
    );
  });
});
