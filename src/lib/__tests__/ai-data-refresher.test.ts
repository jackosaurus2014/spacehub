/**
 * Tests for the AI-research staleness gate in src/lib/ai-data-refresher.ts.
 *
 * Root-cause bug (from the completed stale-content audit): the gate in
 * refreshAllAIResearchedModules() looked only at the single MOST RECENTLY
 * refreshed DynamicContent row for a module. Any module mixing a
 * live-API-refreshed key (e.g. a daily cron) with AI-researched keys had
 * its AI sections masked forever — space-defense's 5 AI sections sat at
 * 186 days old / sourceType 'seed' because a daily live-procurement key
 * always looked "fresh" to the old per-module-newest-key check.
 *
 * The fix: gate off the OLDEST active key, and steer the AI pass toward
 * the stalest keys explicitly (priorityKeys) since the LLM only updates an
 * arbitrary subset of sections per pass on its own.
 */

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockAnthropicCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: (...args: unknown[]) => mockAnthropicCreate(...args) },
  }));
});

const mockGetModuleContent = jest.fn();
const mockUpsertContent = jest.fn();
const mockLogRefresh = jest.fn();
jest.mock('@/lib/dynamic-content', () => ({
  getModuleContent: (...args: unknown[]) => mockGetModuleContent(...args),
  upsertContent: (...args: unknown[]) => mockUpsertContent(...args),
  logRefresh: (...args: unknown[]) => mockLogRefresh(...args),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    dynamicContent: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    newsArticle: { findMany: jest.fn() },
  },
}));

// Swap in a small, deterministic module set so the gate logic can be
// exercised without depending on (or having to mock calls for) every
// module in the real FRESHNESS_POLICIES registry.
jest.mock('@/lib/freshness-policies', () => {
  const actual = jest.requireActual('@/lib/freshness-policies');
  return {
    ...actual,
    FRESHNESS_POLICIES: {
      'test-module-a': { ttlHours: 24, refreshPriority: 'high', refreshSource: 'ai-research', keywords: [] },
      'test-module-b': { ttlHours: 24, refreshPriority: 'moderate', refreshSource: 'ai-research', keywords: [] },
    },
    getModulesBySource: (source: string) =>
      source === 'ai-research' ? ['test-module-a', 'test-module-b'] : [],
  };
});

import { logger } from '@/lib/logger';
import prisma from '@/lib/db';
import { refreshAllAIResearchedModules, refreshModuleViaAI } from '@/lib/ai-data-refresher';

const mockPrisma = prisma as unknown as {
  dynamicContent: { findMany: jest.Mock; updateMany: jest.Mock };
  newsArticle: { findMany: jest.Mock };
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function anthropicResponse(
  overrides: Partial<{ updates: unknown[]; newItems: unknown[]; removals: string[]; notes: string }> = {}
) {
  const payload = { updates: [], newItems: [], removals: [], notes: 'ok', ...overrides };
  return {
    usage: { input_tokens: 100, output_tokens: 50 },
    content: [{ type: 'text', text: JSON.stringify(payload) }],
  };
}

let setTimeoutSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetModuleContent.mockResolvedValue([]);
  mockPrisma.newsArticle.findMany.mockResolvedValue([]);
  mockAnthropicCreate.mockResolvedValue(anthropicResponse());
  // The real function sleeps 1s between modules to avoid rate limiting —
  // collapse that to a no-op so the suite stays fast.
  setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(((cb: () => void) => {
    cb();
    return 0 as unknown as NodeJS.Timeout;
  }) as unknown as typeof setTimeout);
});

afterEach(() => {
  setTimeoutSpy.mockRestore();
});

describe('refreshAllAIResearchedModules staleness gate', () => {
  it('skips a module whose oldest active key is within TTL', async () => {
    mockPrisma.dynamicContent.findMany.mockImplementation(({ where }: { where: { module: string } }) => {
      const key = where.module === 'test-module-a' ? 'test-module-a:x' : 'test-module-b:x';
      return Promise.resolve([{ contentKey: key, refreshedAt: new Date(Date.now() - 1 * HOUR) }]);
    });

    await refreshAllAIResearchedModules();

    expect(mockAnthropicCreate).not.toHaveBeenCalled();
  });

  it('qualifies a module whose OLDEST active key exceeds TTL even though its newest key is fresh (root-cause repro)', async () => {
    // Module has one fresh (API-refreshed) key and one very stale
    // (AI-researched) key — mirrors space-defense's live-procurement key
    // masking its 186-day-old AI sections. The old gate looked only at the
    // newest key and would skip this module forever.
    mockPrisma.dynamicContent.findMany.mockImplementation(({ where }: { where: { module: string } }) => {
      if (where.module === 'test-module-a') {
        return Promise.resolve([
          { contentKey: 'test-module-a:stale-ai-section', refreshedAt: new Date(Date.now() - 40 * DAY) }, // oldest
          { contentKey: 'test-module-a:fresh-api-key', refreshedAt: new Date(Date.now() - 30 * 60 * 1000) }, // newest, fresh
        ]);
      }
      // Give module-b a fresh single key so only module-a is under test here.
      return Promise.resolve([{ contentKey: 'test-module-b:x', refreshedAt: new Date(Date.now() - 1 * HOUR) }]);
    });

    const result = await refreshAllAIResearchedModules();

    const refreshedModules = result.results.map((r) => r.module);
    expect(refreshedModules).toEqual(['test-module-a']);
    expect(mockAnthropicCreate).toHaveBeenCalledTimes(1);
  });

  it('refreshes a module with zero active rows unconditionally (nothing to gate on)', async () => {
    mockPrisma.dynamicContent.findMany.mockResolvedValue([]);

    const result = await refreshAllAIResearchedModules();

    expect(mockAnthropicCreate).toHaveBeenCalledTimes(2);
    expect(result.results.map((r) => r.module).sort()).toEqual(['test-module-a', 'test-module-b']);
  });

  it('passes the stalest content keys as priority steering into the AI prompt', async () => {
    mockPrisma.dynamicContent.findMany.mockImplementation(({ where }: { where: { module: string } }) => {
      if (where.module === 'test-module-a') {
        return Promise.resolve([
          { contentKey: 'test-module-a:oldest', refreshedAt: new Date(Date.now() - 40 * DAY) },
          { contentKey: 'test-module-a:middle', refreshedAt: new Date(Date.now() - 20 * DAY) },
        ]);
      }
      return Promise.resolve([]);
    });

    await refreshAllAIResearchedModules();

    const calls = mockAnthropicCreate.mock.calls as Array<[{ messages: Array<{ content: string }> }]>;
    const aCall = calls.find((c) => c[0].messages[0].content.includes('Module: test-module-a'));
    expect(aCall).toBeDefined();
    const prompt = aCall![0].messages[0].content;
    expect(prompt).toContain('Priority — Stalest Content Keys');
    expect(prompt).toContain('test-module-a:oldest');
    expect(prompt).toContain('test-module-a:middle');
  });

  it('logs a per-key freshness snapshot for coverage visibility, including for a module that gets skipped', async () => {
    mockPrisma.dynamicContent.findMany.mockImplementation(({ where }: { where: { module: string } }) => {
      const key = where.module === 'test-module-a' ? 'test-module-a:x' : 'test-module-b:x';
      return Promise.resolve([{ contentKey: key, refreshedAt: new Date(Date.now() - 1 * HOUR) }]);
    });

    await refreshAllAIResearchedModules();

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Per-key freshness snapshot for test-module-a'),
      expect.objectContaining({
        keys: expect.arrayContaining([expect.objectContaining({ contentKey: 'test-module-a:x' })]),
      })
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Per-key freshness snapshot for test-module-b'),
      expect.anything()
    );
  });
});

describe('refreshModuleViaAI priorityKeys parameter', () => {
  it('omits the priority-steering section from the prompt when no priorityKeys are given', async () => {
    await refreshModuleViaAI('test-module-a');

    const prompt = mockAnthropicCreate.mock.calls[0][0].messages[0].content as string;
    expect(prompt).not.toContain('Priority — Stalest Content Keys');
  });

  it('includes every passed priority key in the prompt when provided', async () => {
    await refreshModuleViaAI('test-module-a', ['test-module-a:one', 'test-module-a:two']);

    const prompt = mockAnthropicCreate.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain('Priority — Stalest Content Keys');
    expect(prompt).toContain('test-module-a:one');
    expect(prompt).toContain('test-module-a:two');
  });
});
