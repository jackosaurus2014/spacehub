/**
 * @jest-environment node
 */

// ---------------------------------------------------------------------------
// Mock Prisma client -- use inline jest.fn() to avoid hoisting issues
// ---------------------------------------------------------------------------
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    dynamicContent: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    dataRefreshLog: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

// Mock freshness-policies so we control the expiry date
jest.mock('@/lib/freshness-policies', () => ({
  getExpiresAt: jest.fn(() => new Date('2026-04-01T00:00:00Z')),
}));

// Mock logger to suppress output during tests
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import prisma from '@/lib/db';
import {
  upsertContent,
  getModuleContent,
  bulkUpsertContent,
  expireStaleContent,
  getModuleFreshness,
  getContentItem,
  logRefresh,
  pruneRefreshLogs,
  type ContentMeta,
} from '../dynamic-content';

// Typed references to the mock functions
const mockUpsert = prisma.dynamicContent.upsert as jest.Mock;
const mockFindMany = prisma.dynamicContent.findMany as jest.Mock;
const mockFindUnique = (prisma.dynamicContent as any).findUnique as jest.Mock;
const mockUpdateMany = prisma.dynamicContent.updateMany as jest.Mock;
const mockCreate = (prisma as any).dataRefreshLog.create as jest.Mock;
const mockDeleteMany = (prisma as any).dataRefreshLog.deleteMany as jest.Mock;

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// upsertContent
// ---------------------------------------------------------------------------
describe('upsertContent', () => {
  const baseMeta: ContentMeta = {
    sourceType: 'api',
    sourceUrl: 'https://example.com/data',
    aiConfidence: 0.95,
    aiNotes: 'High quality source',
  };

  it('calls prisma.dynamicContent.upsert with correct create/update data', async () => {
    mockUpsert.mockResolvedValue({});

    await upsertContent(
      'market-intel:key1',
      'market-intel',
      'overview',
      { title: 'Test' },
      baseMeta
    );

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const call = mockUpsert.mock.calls[0][0];

    // where clause should match on contentKey
    expect(call.where).toEqual({ contentKey: 'market-intel:key1' });

    // create block
    expect(call.create.contentKey).toBe('market-intel:key1');
    expect(call.create.module).toBe('market-intel');
    expect(call.create.section).toBe('overview');
    expect(call.create.data).toBe(JSON.stringify({ title: 'Test' }));
    expect(call.create.sourceType).toBe('api');
    expect(call.create.sourceUrl).toBe('https://example.com/data');
    expect(call.create.aiConfidence).toBe(0.95);
    expect(call.create.aiNotes).toBe('High quality source');
    expect(call.create.isActive).toBe(true);
    expect(call.create.refreshedAt).toBeInstanceOf(Date);
    expect(call.create.lastVerified).toBeInstanceOf(Date);
    expect(call.create.expiresAt).toBeInstanceOf(Date);

    // update block
    expect(call.update.data).toBe(JSON.stringify({ title: 'Test' }));
    expect(call.update.sourceType).toBe('api');
    expect(call.update.isActive).toBe(true);
    expect(call.update.version).toEqual({ increment: 1 });
  });

  it('uses custom expiresAt from meta when provided', async () => {
    mockUpsert.mockResolvedValue({});

    const customExpiry = new Date('2026-12-31T00:00:00Z');
    await upsertContent(
      'custom-key',
      'news',
      null,
      { headline: 'Breaking' },
      { sourceType: 'manual', expiresAt: customExpiry }
    );

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.expiresAt).toEqual(customExpiry);
    expect(call.update.expiresAt).toEqual(customExpiry);
  });

  it('falls back to getExpiresAt when meta.expiresAt is not provided', async () => {
    mockUpsert.mockResolvedValue({});

    await upsertContent(
      'fallback-key',
      'compliance',
      null,
      { text: 'data' },
      { sourceType: 'seed' }
    );

    const { getExpiresAt } = require('@/lib/freshness-policies');
    expect(getExpiresAt).toHaveBeenCalledWith('compliance');

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.expiresAt).toEqual(new Date('2026-04-01T00:00:00Z'));
  });

  it('serializes data to JSON', async () => {
    mockUpsert.mockResolvedValue({});

    const complexData = { items: [1, 2, 3], nested: { flag: true } };
    await upsertContent(
      'json-key',
      'module',
      'section',
      complexData,
      { sourceType: 'api' }
    );

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.data).toBe(JSON.stringify(complexData));
    expect(call.update.data).toBe(JSON.stringify(complexData));
  });

  it('handles null section correctly', async () => {
    mockUpsert.mockResolvedValue({});

    await upsertContent(
      'no-section',
      'module',
      null,
      'simple-value',
      { sourceType: 'manual' }
    );

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.section).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getModuleContent
// ---------------------------------------------------------------------------
describe('getModuleContent', () => {
  it('retrieves all active content for a module', async () => {
    const mockRows = [
      {
        contentKey: 'mod:key1',
        section: 'overview',
        data: JSON.stringify({ title: 'Item 1' }),
        refreshedAt: new Date('2026-01-15T00:00:00Z'),
        sourceType: 'api',
        aiConfidence: 0.9,
        isActive: true,
      },
      {
        contentKey: 'mod:key2',
        section: 'details',
        data: JSON.stringify({ title: 'Item 2' }),
        refreshedAt: new Date('2026-01-16T00:00:00Z'),
        sourceType: 'ai-research',
        aiConfidence: 0.85,
        isActive: true,
      },
    ];
    mockFindMany.mockResolvedValue(mockRows);

    const results = await getModuleContent('my-module');

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { module: 'my-module', isActive: true },
      orderBy: { contentKey: 'asc' },
    });

    expect(results).toHaveLength(2);
    expect(results[0].contentKey).toBe('mod:key1');
    expect(results[0].data).toEqual({ title: 'Item 1' });
    expect(results[0].sourceType).toBe('api');
    expect(results[0].aiConfidence).toBe(0.9);
    expect(results[1].data).toEqual({ title: 'Item 2' });
  });

  it('filters by section when provided', async () => {
    mockFindMany.mockResolvedValue([]);

    await getModuleContent('my-module', 'overview');

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { module: 'my-module', isActive: true, section: 'overview' },
      orderBy: { contentKey: 'asc' },
    });
  });

  it('returns empty array when no content exists', async () => {
    mockFindMany.mockResolvedValue([]);

    const results = await getModuleContent('empty-module');
    expect(results).toEqual([]);
  });

  it('parses JSON data from each row', async () => {
    const complexData = { nested: { arr: [1, 2] }, flag: true };
    mockFindMany.mockResolvedValue([
      {
        contentKey: 'parse-key',
        section: null,
        data: JSON.stringify(complexData),
        refreshedAt: new Date(),
        sourceType: 'seed',
        aiConfidence: null,
        isActive: true,
      },
    ]);

    const results = await getModuleContent('parse-module');
    expect(results[0].data).toEqual(complexData);
    expect(results[0].aiConfidence).toBeNull();
    expect(results[0].section).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getContentItem
// ---------------------------------------------------------------------------
describe('getContentItem', () => {
  it('returns a single content item by key', async () => {
    mockFindUnique.mockResolvedValue({
      contentKey: 'unique-key',
      section: 'details',
      data: JSON.stringify({ info: 'test' }),
      refreshedAt: new Date('2026-02-01T00:00:00Z'),
      sourceType: 'manual',
      aiConfidence: null,
      isActive: true,
    });

    const result = await getContentItem('unique-key');

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { contentKey: 'unique-key' },
    });
    expect(result).not.toBeNull();
    expect(result!.contentKey).toBe('unique-key');
    expect(result!.data).toEqual({ info: 'test' });
  });

  it('returns null when item does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await getContentItem('nonexistent');
    expect(result).toBeNull();
  });

  it('returns null when item exists but is inactive', async () => {
    mockFindUnique.mockResolvedValue({
      contentKey: 'inactive-key',
      section: null,
      data: JSON.stringify({}),
      refreshedAt: new Date(),
      sourceType: 'api',
      aiConfidence: null,
      isActive: false,
    });

    const result = await getContentItem('inactive-key');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// bulkUpsertContent
// ---------------------------------------------------------------------------
describe('bulkUpsertContent', () => {
  it('upserts multiple items and returns count', async () => {
    mockUpsert.mockResolvedValue({});

    const items = [
      { contentKey: 'bulk:1', section: 'sec-a', data: { a: 1 } },
      { contentKey: 'bulk:2', section: 'sec-b', data: { b: 2 } },
      { contentKey: 'bulk:3', section: null, data: { c: 3 } },
    ];

    const meta: ContentMeta = { sourceType: 'api', sourceUrl: 'https://api.test.com' };
    const count = await bulkUpsertContent('bulk-module', items, meta);

    expect(count).toBe(3);
    expect(mockUpsert).toHaveBeenCalledTimes(3);

    // Verify each call received the correct contentKey and module
    expect(mockUpsert.mock.calls[0][0].where).toEqual({ contentKey: 'bulk:1' });
    expect(mockUpsert.mock.calls[0][0].create.module).toBe('bulk-module');
    expect(mockUpsert.mock.calls[1][0].where).toEqual({ contentKey: 'bulk:2' });
    expect(mockUpsert.mock.calls[2][0].where).toEqual({ contentKey: 'bulk:3' });
  });

  it('returns 0 for an empty items array', async () => {
    const count = await bulkUpsertContent('empty', [], { sourceType: 'seed' });
    expect(count).toBe(0);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('passes meta fields through to each upsert call', async () => {
    mockUpsert.mockResolvedValue({});

    const meta: ContentMeta = {
      sourceType: 'ai-research',
      aiConfidence: 0.88,
      aiNotes: 'AI generated content',
    };

    await bulkUpsertContent(
      'ai-module',
      [{ contentKey: 'ai:1', section: null, data: {} }],
      meta
    );

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.sourceType).toBe('ai-research');
    expect(call.create.aiConfidence).toBe(0.88);
    expect(call.create.aiNotes).toBe('AI generated content');
  });
});

// ---------------------------------------------------------------------------
// expireStaleContent
// ---------------------------------------------------------------------------
describe('expireStaleContent', () => {
  it('marks expired active content as inactive and returns count', async () => {
    mockUpdateMany.mockResolvedValue({ count: 5 });

    const result = await expireStaleContent();

    expect(result).toBe(5);
    expect(mockUpdateMany).toHaveBeenCalledTimes(1);

    const call = mockUpdateMany.mock.calls[0][0];
    expect(call.where.isActive).toBe(true);
    expect(call.where.expiresAt).toHaveProperty('lt');
    expect(call.where.expiresAt.lt).toBeInstanceOf(Date);
    expect(call.data).toEqual({ isActive: false });
  });

  it('filters by module when provided', async () => {
    mockUpdateMany.mockResolvedValue({ count: 2 });

    const result = await expireStaleContent('news');

    expect(result).toBe(2);
    const call = mockUpdateMany.mock.calls[0][0];
    expect(call.where.module).toBe('news');
  });

  it('does not include module filter when not provided', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });

    await expireStaleContent();

    const call = mockUpdateMany.mock.calls[0][0];
    expect(call.where).not.toHaveProperty('module');
  });

  it('returns 0 when no content is expired', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });

    const result = await expireStaleContent('fresh-module');
    expect(result).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getModuleFreshness
// ---------------------------------------------------------------------------
describe('getModuleFreshness', () => {
  it('returns freshness stats for a module', async () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day ago
    const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 1 day ahead

    mockFindMany.mockResolvedValue([
      { isActive: true, expiresAt: futureDate, refreshedAt: now, sourceType: 'api' },
      { isActive: true, expiresAt: pastDate, refreshedAt: pastDate, sourceType: 'api' },
      { isActive: false, expiresAt: pastDate, refreshedAt: pastDate, sourceType: 'ai-research' },
    ]);

    const freshness = await getModuleFreshness('test-module');

    expect(freshness.total).toBe(3);
    expect(freshness.active).toBe(2);
    expect(freshness.stale).toBe(1); // active with past expiresAt
    expect(freshness.expired).toBe(1); // inactive with past expiresAt
    expect(freshness.lastRefreshed).toEqual(now);
    expect(freshness.sourceBreakdown).toEqual({ 'api': 2, 'ai-research': 1 });
  });

  it('returns zeros for a module with no content', async () => {
    mockFindMany.mockResolvedValue([]);

    const freshness = await getModuleFreshness('empty-module');

    expect(freshness.total).toBe(0);
    expect(freshness.active).toBe(0);
    expect(freshness.stale).toBe(0);
    expect(freshness.expired).toBe(0);
    expect(freshness.lastRefreshed).toBeNull();
    expect(freshness.sourceBreakdown).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// ContentMeta fields
// ---------------------------------------------------------------------------
describe('ContentMeta fields', () => {
  it('stores all meta fields including optional ones', async () => {
    mockUpsert.mockResolvedValue({});

    const meta: ContentMeta = {
      sourceType: 'ai-research',
      sourceUrl: 'https://ai.example.com/report',
      aiConfidence: 0.72,
      aiNotes: 'Generated from quarterly report analysis',
      expiresAt: new Date('2026-06-15T00:00:00Z'),
    };

    await upsertContent('meta-test', 'research', 'analysis', { report: true }, meta);

    const call = mockUpsert.mock.calls[0][0];

    // All meta fields present in create
    expect(call.create.sourceType).toBe('ai-research');
    expect(call.create.sourceUrl).toBe('https://ai.example.com/report');
    expect(call.create.aiConfidence).toBe(0.72);
    expect(call.create.aiNotes).toBe('Generated from quarterly report analysis');
    expect(call.create.expiresAt).toEqual(new Date('2026-06-15T00:00:00Z'));

    // All meta fields present in update
    expect(call.update.sourceType).toBe('ai-research');
    expect(call.update.sourceUrl).toBe('https://ai.example.com/report');
    expect(call.update.aiConfidence).toBe(0.72);
    expect(call.update.aiNotes).toBe('Generated from quarterly report analysis');
  });

  it('handles undefined optional meta fields', async () => {
    mockUpsert.mockResolvedValue({});

    const meta: ContentMeta = { sourceType: 'seed' };

    await upsertContent('minimal-meta', 'mod', null, {}, meta);

    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.sourceType).toBe('seed');
    expect(call.create.sourceUrl).toBeUndefined();
    expect(call.create.aiConfidence).toBeUndefined();
    expect(call.create.aiNotes).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// logRefresh
// ---------------------------------------------------------------------------
describe('logRefresh', () => {
  it('creates a data refresh log entry', async () => {
    mockCreate.mockResolvedValue({});

    await logRefresh('news', 'scheduled', 'success', {
      itemsChecked: 100,
      itemsUpdated: 5,
      itemsCreated: 3,
      itemsExpired: 2,
      tokensUsed: 1500,
      apiCallsMade: 10,
      duration: 4500,
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const call = mockCreate.mock.calls[0][0];
    expect(call.data.module).toBe('news');
    expect(call.data.refreshType).toBe('scheduled');
    expect(call.data.status).toBe('success');
    expect(call.data.itemsChecked).toBe(100);
    expect(call.data.itemsUpdated).toBe(5);
    expect(call.data.itemsCreated).toBe(3);
    expect(call.data.itemsExpired).toBe(2);
    expect(call.data.tokensUsed).toBe(1500);
    expect(call.data.apiCallsMade).toBe(10);
    expect(call.data.duration).toBe(4500);
  });

  it('defaults numeric fields to 0 when not provided', async () => {
    mockCreate.mockResolvedValue({});

    await logRefresh('market-intel', 'manual', 'error', {
      errorMessage: 'API timeout',
    });

    const call = mockCreate.mock.calls[0][0];
    expect(call.data.itemsChecked).toBe(0);
    expect(call.data.itemsUpdated).toBe(0);
    expect(call.data.itemsExpired).toBe(0);
    expect(call.data.itemsCreated).toBe(0);
    expect(call.data.errorMessage).toBe('API timeout');
  });

  it('serializes details to JSON when provided', async () => {
    mockCreate.mockResolvedValue({});

    const details = { failedKeys: ['a', 'b'], retryCount: 2 };
    await logRefresh('compliance', 'cron', 'partial', {
      details,
    });

    const call = mockCreate.mock.calls[0][0];
    expect(call.data.details).toBe(JSON.stringify(details));
  });

  it('sets details to null when not provided', async () => {
    mockCreate.mockResolvedValue({});

    await logRefresh('module', 'manual', 'success', {});

    const call = mockCreate.mock.calls[0][0];
    expect(call.data.details).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// pruneRefreshLogs
// ---------------------------------------------------------------------------
describe('pruneRefreshLogs', () => {
  it('deletes logs older than the specified number of days', async () => {
    mockDeleteMany.mockResolvedValue({ count: 10 });

    const result = await pruneRefreshLogs(7);

    expect(result).toBe(10);
    expect(mockDeleteMany).toHaveBeenCalledTimes(1);
    const call = mockDeleteMany.mock.calls[0][0];
    expect(call.where.createdAt).toHaveProperty('lt');
    expect(call.where.createdAt.lt).toBeInstanceOf(Date);
  });

  it('defaults to 30 days when no argument is provided', async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 });

    const now = Date.now();
    await pruneRefreshLogs();

    const call = mockDeleteMany.mock.calls[0][0];
    const cutoff = call.where.createdAt.lt as Date;
    // cutoff should be approximately 30 days ago (within 5 seconds tolerance)
    const expectedCutoff = now - 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs(cutoff.getTime() - expectedCutoff)).toBeLessThan(5000);
  });
});
