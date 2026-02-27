/**
 * @jest-environment node
 */

/**
 * API route handler tests for community forums endpoints:
 *   - GET  /api/community/forums        (list forum categories with thread counts)
 *   - GET  /api/community/forums/[slug]  (list threads with pagination and sorting)
 *   - POST /api/community/forums/[slug]  (create thread — auth, ban check, validation)
 *
 * Validates category listing, thread pagination, sorting, authentication,
 * ban/mute enforcement, input validation, and error handling.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    forumCategory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    forumThread: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    threadSubscription: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/moderation', () => ({
  checkUserBanStatus: jest.fn(),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { checkUserBanStatus } from '@/lib/moderation';

import { GET as forumsListGET } from '@/app/api/community/forums/route';
import {
  GET as forumSlugGET,
  POST as forumSlugPOST,
} from '@/app/api/community/forums/[slug]/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as unknown as {
  forumCategory: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
  };
  forumThread: {
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
  };
  threadSubscription: {
    create: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

const mockGetServerSession = getServerSession as jest.Mock;
const mockCheckUserBanStatus = checkUserBanStatus as jest.Mock;

function makeCategory(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cat-1',
    slug: 'general',
    name: 'General Discussion',
    description: 'Talk about anything space-related',
    icon: '🚀',
    sortOrder: 1,
    _count: { threads: 5 },
    threads: [
      {
        id: 'thread-latest',
        title: 'Latest thread',
        createdAt: new Date('2026-02-20'),
        author: { id: 'user-1', name: 'Astronaut Alice' },
      },
    ],
    ...overrides,
  };
}

function makeThread(overrides: Record<string, unknown> = {}) {
  return {
    id: 'thread-1',
    title: 'My first thread',
    content: 'Hello, this is my first forum post!',
    author: { id: 'user-1', name: 'Test User' },
    isPinned: false,
    isLocked: false,
    viewCount: 10,
    _count: { posts: 3 },
    tags: ['question'],
    acceptedPostId: null,
    upvoteCount: 5,
    downvoteCount: 1,
    createdAt: new Date('2026-02-15'),
    updatedAt: new Date('2026-02-15'),
    ...overrides,
  };
}

function makeGetRequest(url: string) {
  return new NextRequest(url, { method: 'GET' });
}

function makePostRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeSlugParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: not banned, not muted
  mockCheckUserBanStatus.mockResolvedValue({ isBanned: false, isMuted: false });
  // Default: thread subscription create resolves (fire-and-forget)
  mockPrisma.threadSubscription.create.mockResolvedValue({});
});

// =============================================================================
// GET /api/community/forums — list categories
// =============================================================================

describe('GET /api/community/forums', () => {
  it('returns a list of forum categories with thread counts', async () => {
    const categories = [
      makeCategory(),
      makeCategory({
        id: 'cat-2',
        slug: 'missions',
        name: 'Missions',
        description: 'Mission discussions',
        sortOrder: 2,
        _count: { threads: 12 },
      }),
    ];
    mockPrisma.forumCategory.findMany.mockResolvedValue(categories);

    const res = await forumsListGET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.categories).toHaveLength(2);
    expect(body.data.categories[0].slug).toBe('general');
    expect(body.data.categories[0].threadCount).toBe(5);
    expect(body.data.categories[1].threadCount).toBe(12);
  });

  it('flattens the latest thread information', async () => {
    mockPrisma.forumCategory.findMany.mockResolvedValue([makeCategory()]);

    const res = await forumsListGET();
    const body = await res.json();

    const cat = body.data.categories[0];
    expect(cat.latestThread).not.toBeNull();
    expect(cat.latestThread.id).toBe('thread-latest');
    expect(cat.latestThread.title).toBe('Latest thread');
    expect(cat.latestThread.authorName).toBe('Astronaut Alice');
  });

  it('returns null latestThread when category has no threads', async () => {
    mockPrisma.forumCategory.findMany.mockResolvedValue([
      makeCategory({ threads: [], _count: { threads: 0 } }),
    ]);

    const res = await forumsListGET();
    const body = await res.json();

    expect(body.data.categories[0].latestThread).toBeNull();
    expect(body.data.categories[0].threadCount).toBe(0);
  });

  it('returns "Unknown" when latest thread author has no name', async () => {
    mockPrisma.forumCategory.findMany.mockResolvedValue([
      makeCategory({
        threads: [
          {
            id: 'thread-anon',
            title: 'Anonymous thread',
            createdAt: new Date(),
            author: { id: 'user-anon', name: null },
          },
        ],
      }),
    ]);

    const res = await forumsListGET();
    const body = await res.json();

    expect(body.data.categories[0].latestThread.authorName).toBe('Unknown');
  });

  it('returns an empty array when no categories exist', async () => {
    mockPrisma.forumCategory.findMany.mockResolvedValue([]);

    const res = await forumsListGET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.categories).toEqual([]);
  });

  it('includes id, slug, name, description, icon, and sortOrder', async () => {
    mockPrisma.forumCategory.findMany.mockResolvedValue([makeCategory()]);

    const res = await forumsListGET();
    const body = await res.json();

    const cat = body.data.categories[0];
    expect(cat).toHaveProperty('id', 'cat-1');
    expect(cat).toHaveProperty('slug', 'general');
    expect(cat).toHaveProperty('name', 'General Discussion');
    expect(cat).toHaveProperty('description', 'Talk about anything space-related');
    expect(cat).toHaveProperty('icon', '🚀');
    expect(cat).toHaveProperty('sortOrder', 1);
  });

  it('queries categories ordered by sortOrder ascending', async () => {
    mockPrisma.forumCategory.findMany.mockResolvedValue([]);

    await forumsListGET();

    expect(mockPrisma.forumCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { sortOrder: 'asc' },
      })
    );
  });

  it('returns 500 when database throws', async () => {
    mockPrisma.forumCategory.findMany.mockRejectedValue(new Error('DB connection lost'));

    const res = await forumsListGET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Failed to fetch forum categories');
  });
});

// =============================================================================
// GET /api/community/forums/[slug] — list threads
// =============================================================================

describe('GET /api/community/forums/[slug]', () => {
  const categoryRecord = {
    id: 'cat-1',
    slug: 'general',
    name: 'General Discussion',
    description: 'Talk about anything',
    icon: '🚀',
  };

  beforeEach(() => {
    mockPrisma.forumCategory.findUnique.mockResolvedValue(categoryRecord);
  });

  it('returns threads for a valid category with default pagination', async () => {
    const threads = [makeThread(), makeThread({ id: 'thread-2', title: 'Second thread' })];
    mockPrisma.forumThread.findMany.mockResolvedValue(threads);
    mockPrisma.forumThread.count.mockResolvedValue(2);

    const req = makeGetRequest('http://localhost/api/community/forums/general');
    const res = await forumSlugGET(req, makeSlugParams('general'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.category.slug).toBe('general');
    expect(body.data.threads).toHaveLength(2);
    expect(body.data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    });
  });

  it('transforms thread data with postCount, tags, and vote counts', async () => {
    mockPrisma.forumThread.findMany.mockResolvedValue([makeThread()]);
    mockPrisma.forumThread.count.mockResolvedValue(1);

    const req = makeGetRequest('http://localhost/api/community/forums/general');
    const res = await forumSlugGET(req, makeSlugParams('general'));
    const body = await res.json();

    const thread = body.data.threads[0];
    expect(thread.postCount).toBe(3);
    expect(thread.tags).toEqual(['question']);
    expect(thread.upvoteCount).toBe(5);
    expect(thread.downvoteCount).toBe(1);
    expect(thread.viewCount).toBe(10);
    expect(thread.acceptedPostId).toBeNull();
  });

  it('returns 404 when category slug is not found', async () => {
    mockPrisma.forumCategory.findUnique.mockResolvedValue(null);

    const req = makeGetRequest('http://localhost/api/community/forums/nonexistent');
    const res = await forumSlugGET(req, makeSlugParams('nonexistent'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain('Forum category');
  });

  it('respects page and limit query parameters', async () => {
    mockPrisma.forumThread.findMany.mockResolvedValue([]);
    mockPrisma.forumThread.count.mockResolvedValue(50);

    const req = makeGetRequest('http://localhost/api/community/forums/general?page=3&limit=10');
    const res = await forumSlugGET(req, makeSlugParams('general'));
    const body = await res.json();

    expect(body.data.pagination.page).toBe(3);
    expect(body.data.pagination.limit).toBe(10);
    expect(body.data.pagination.total).toBe(50);
    expect(body.data.pagination.totalPages).toBe(5);

    // Verify skip was calculated correctly: (3-1) * 10 = 20
    expect(mockPrisma.forumThread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      })
    );
  });

  it('constrains limit to maximum of 50', async () => {
    mockPrisma.forumThread.findMany.mockResolvedValue([]);
    mockPrisma.forumThread.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/community/forums/general?limit=200');
    const res = await forumSlugGET(req, makeSlugParams('general'));
    const body = await res.json();

    expect(body.data.pagination.limit).toBe(50);
    expect(mockPrisma.forumThread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 })
    );
  });

  it('defaults page to 1 when not provided or invalid', async () => {
    mockPrisma.forumThread.findMany.mockResolvedValue([]);
    mockPrisma.forumThread.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/community/forums/general?page=-5');
    const res = await forumSlugGET(req, makeSlugParams('general'));
    const body = await res.json();

    expect(body.data.pagination.page).toBe(1);
    expect(mockPrisma.forumThread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0 })
    );
  });

  it('sorts by newest (createdAt desc) by default', async () => {
    mockPrisma.forumThread.findMany.mockResolvedValue([]);
    mockPrisma.forumThread.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/community/forums/general');
    await forumSlugGET(req, makeSlugParams('general'));

    expect(mockPrisma.forumThread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      })
    );
  });

  it('sorts by popular (viewCount desc) when sort=popular', async () => {
    mockPrisma.forumThread.findMany.mockResolvedValue([]);
    mockPrisma.forumThread.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/community/forums/general?sort=popular');
    await forumSlugGET(req, makeSlugParams('general'));

    expect(mockPrisma.forumThread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ isPinned: 'desc' }, { viewCount: 'desc' }],
      })
    );
  });

  it('sorts by top (upvoteCount desc) when sort=top', async () => {
    mockPrisma.forumThread.findMany.mockResolvedValue([]);
    mockPrisma.forumThread.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/community/forums/general?sort=top');
    await forumSlugGET(req, makeSlugParams('general'));

    expect(mockPrisma.forumThread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ isPinned: 'desc' }, { upvoteCount: 'desc' }],
      })
    );
  });

  it('always pins first regardless of sort order', async () => {
    mockPrisma.forumThread.findMany.mockResolvedValue([]);
    mockPrisma.forumThread.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/community/forums/general?sort=popular');
    await forumSlugGET(req, makeSlugParams('general'));

    const callArg = mockPrisma.forumThread.findMany.mock.calls[0][0];
    expect(callArg.orderBy[0]).toEqual({ isPinned: 'desc' });
  });

  it('returns empty threads array when category has no threads', async () => {
    mockPrisma.forumThread.findMany.mockResolvedValue([]);
    mockPrisma.forumThread.count.mockResolvedValue(0);

    const req = makeGetRequest('http://localhost/api/community/forums/general');
    const res = await forumSlugGET(req, makeSlugParams('general'));
    const body = await res.json();

    expect(body.data.threads).toEqual([]);
    expect(body.data.pagination.total).toBe(0);
    expect(body.data.pagination.totalPages).toBe(0);
  });

  it('returns correct totalPages for multi-page results', async () => {
    mockPrisma.forumThread.findMany.mockResolvedValue([]);
    mockPrisma.forumThread.count.mockResolvedValue(45);

    const req = makeGetRequest('http://localhost/api/community/forums/general?limit=10');
    const res = await forumSlugGET(req, makeSlugParams('general'));
    const body = await res.json();

    expect(body.data.pagination.totalPages).toBe(5); // ceil(45/10)
  });

  it('defaults tags to empty array when thread has no tags', async () => {
    mockPrisma.forumThread.findMany.mockResolvedValue([
      makeThread({ tags: null }),
    ]);
    mockPrisma.forumThread.count.mockResolvedValue(1);

    const req = makeGetRequest('http://localhost/api/community/forums/general');
    const res = await forumSlugGET(req, makeSlugParams('general'));
    const body = await res.json();

    expect(body.data.threads[0].tags).toEqual([]);
  });

  it('defaults vote counts to 0 when not present on thread', async () => {
    mockPrisma.forumThread.findMany.mockResolvedValue([
      makeThread({ upvoteCount: undefined, downvoteCount: undefined }),
    ]);
    mockPrisma.forumThread.count.mockResolvedValue(1);

    const req = makeGetRequest('http://localhost/api/community/forums/general');
    const res = await forumSlugGET(req, makeSlugParams('general'));
    const body = await res.json();

    expect(body.data.threads[0].upvoteCount).toBe(0);
    expect(body.data.threads[0].downvoteCount).toBe(0);
  });

  it('returns 500 when database throws', async () => {
    mockPrisma.forumCategory.findUnique.mockRejectedValue(new Error('DB timeout'));

    const req = makeGetRequest('http://localhost/api/community/forums/general');
    const res = await forumSlugGET(req, makeSlugParams('general'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Failed to fetch forum threads');
  });
});

// =============================================================================
// POST /api/community/forums/[slug] — create thread
// =============================================================================

describe('POST /api/community/forums/[slug]', () => {
  const validBody = {
    title: 'My new thread title',
    content: 'This is the body content of my new thread.',
    tags: ['question', 'launch'],
  };

  const categoryRecord = { id: 'cat-1' };

  const createdThread = {
    id: 'thread-new',
    title: 'My new thread title',
    content: 'This is the body content of my new thread.',
    author: { id: 'user-1', name: 'Test User' },
    isPinned: false,
    isLocked: false,
    viewCount: 0,
    _count: { posts: 0 },
    tags: ['question', 'launch'],
    acceptedPostId: null,
    upvoteCount: 0,
    downvoteCount: 0,
    createdAt: new Date('2026-02-20'),
    updatedAt: new Date('2026-02-20'),
  };

  beforeEach(() => {
    mockGetServerSession.mockResolvedValue({ user: { id: 'user-1', name: 'Test User' } });
    mockPrisma.forumCategory.findUnique.mockResolvedValue(categoryRecord);
    mockPrisma.forumThread.create.mockResolvedValue(createdThread);
  });

  it('creates a thread successfully with valid data', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general', validBody);
    const res = await forumSlugPOST(req, makeSlugParams('general'));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('thread-new');
    expect(body.data.title).toBe('My new thread title');
    expect(body.data.content).toBe('This is the body content of my new thread.');
    expect(body.data.author).toEqual({ id: 'user-1', name: 'Test User' });
    expect(body.data.tags).toEqual(['question', 'launch']);
    expect(body.data.postCount).toBe(0);
  });

  it('trims title and content before saving', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general', {
      title: '  Spacey Title  ',
      content: '  Content with spaces  ',
    });
    await forumSlugPOST(req, makeSlugParams('general'));

    expect(mockPrisma.forumThread.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Spacey Title',
          content: 'Content with spaces',
        }),
      })
    );
  });

  it('passes category id and user id to create call', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general', validBody);
    await forumSlugPOST(req, makeSlugParams('general'));

    expect(mockPrisma.forumThread.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categoryId: 'cat-1',
          authorId: 'user-1',
        }),
      })
    );
  });

  it('auto-subscribes the author to the new thread', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general', validBody);
    await forumSlugPOST(req, makeSlugParams('general'));

    // Allow the fire-and-forget promise to settle
    await new Promise((r) => setTimeout(r, 10));

    expect(mockPrisma.threadSubscription.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', threadId: 'thread-new' },
    });
  });

  it('creates thread without tags when tags are omitted', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general', {
      title: 'No tags thread',
      content: 'Content here.',
    });
    await forumSlugPOST(req, makeSlugParams('general'));

    expect(mockPrisma.forumThread.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tags: [],
        }),
      })
    );
  });

  it('limits tags to a maximum of 5', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general', {
      title: 'Many tags',
      content: 'Content',
      tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    });
    await forumSlugPOST(req, makeSlugParams('general'));

    const createCall = mockPrisma.forumThread.create.mock.calls[0][0];
    expect(createCall.data.tags).toHaveLength(5);
  });

  it('filters out non-string tags', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general', {
      title: 'Mixed tags',
      content: 'Content',
      tags: ['valid', 123, null, 'also-valid', true],
    });
    await forumSlugPOST(req, makeSlugParams('general'));

    const createCall = mockPrisma.forumThread.create.mock.calls[0][0];
    expect(createCall.data.tags).toEqual(['valid', 'also-valid']);
  });

  // ── Authentication tests ──────────────────────────────────────────────────

  it('returns 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/community/forums/general', validBody);
    const res = await forumSlugPOST(req, makeSlugParams('general'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when session has no user id', async () => {
    mockGetServerSession.mockResolvedValue({ user: { name: 'No ID User' } });

    const req = makePostRequest('http://localhost/api/community/forums/general', validBody);
    const res = await forumSlugPOST(req, makeSlugParams('general'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  // ── Ban / Mute tests ──────────────────────────────────────────────────────

  it('returns 403 when user is banned', async () => {
    mockCheckUserBanStatus.mockResolvedValue({
      isBanned: true,
      isMuted: false,
      banReason: 'Spamming',
    });

    const req = makePostRequest('http://localhost/api/community/forums/general', validBody);
    const res = await forumSlugPOST(req, makeSlugParams('general'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.message).toContain('suspended');
    expect(body.error.message).toContain('Spamming');
  });

  it('returns 403 for banned user without a reason', async () => {
    mockCheckUserBanStatus.mockResolvedValue({
      isBanned: true,
      isMuted: false,
    });

    const req = makePostRequest('http://localhost/api/community/forums/general', validBody);
    const res = await forumSlugPOST(req, makeSlugParams('general'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.message).toContain('suspended');
  });

  it('returns 403 when user is muted', async () => {
    mockCheckUserBanStatus.mockResolvedValue({
      isBanned: false,
      isMuted: true,
    });

    const req = makePostRequest('http://localhost/api/community/forums/general', validBody);
    const res = await forumSlugPOST(req, makeSlugParams('general'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.message).toContain('muted');
  });

  it('does not create a thread when user is banned', async () => {
    mockCheckUserBanStatus.mockResolvedValue({
      isBanned: true,
      isMuted: false,
    });

    const req = makePostRequest('http://localhost/api/community/forums/general', validBody);
    await forumSlugPOST(req, makeSlugParams('general'));

    expect(mockPrisma.forumThread.create).not.toHaveBeenCalled();
  });

  it('does not create a thread when user is muted', async () => {
    mockCheckUserBanStatus.mockResolvedValue({
      isBanned: false,
      isMuted: true,
    });

    const req = makePostRequest('http://localhost/api/community/forums/general', validBody);
    await forumSlugPOST(req, makeSlugParams('general'));

    expect(mockPrisma.forumThread.create).not.toHaveBeenCalled();
  });

  // ── Category not found ────────────────────────────────────────────────────

  it('returns 404 when category slug does not exist', async () => {
    mockPrisma.forumCategory.findUnique.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/community/forums/nonexistent', validBody);
    const res = await forumSlugPOST(req, makeSlugParams('nonexistent'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  // ── Validation tests ──────────────────────────────────────────────────────

  it('rejects missing title', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general', {
      content: 'Some content',
    });
    const res = await forumSlugPOST(req, makeSlugParams('general'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('title');
  });

  it('rejects empty title string', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general', {
      title: '',
      content: 'Content here',
    });
    const res = await forumSlugPOST(req, makeSlugParams('general'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('rejects whitespace-only title', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general', {
      title: '   ',
      content: 'Content here',
    });
    const res = await forumSlugPOST(req, makeSlugParams('general'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('rejects non-string title', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general', {
      title: 12345,
      content: 'Content here',
    });
    const res = await forumSlugPOST(req, makeSlugParams('general'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('rejects title exceeding 200 characters', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general', {
      title: 'A'.repeat(201),
      content: 'Content here',
    });
    const res = await forumSlugPOST(req, makeSlugParams('general'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('200');
  });

  it('accepts title at exactly 200 characters', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general', {
      title: 'A'.repeat(200),
      content: 'Content here',
    });
    const res = await forumSlugPOST(req, makeSlugParams('general'));

    expect(res.status).toBe(201);
  });

  it('rejects missing content', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general', {
      title: 'Valid title',
    });
    const res = await forumSlugPOST(req, makeSlugParams('general'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('content');
  });

  it('rejects empty content string', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general', {
      title: 'Valid title',
      content: '',
    });
    const res = await forumSlugPOST(req, makeSlugParams('general'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('rejects whitespace-only content', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general', {
      title: 'Valid title',
      content: '    ',
    });
    const res = await forumSlugPOST(req, makeSlugParams('general'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('rejects content exceeding 10000 characters', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general', {
      title: 'Valid title',
      content: 'A'.repeat(10001),
    });
    const res = await forumSlugPOST(req, makeSlugParams('general'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('10000');
  });

  it('accepts content at exactly 10000 characters', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general', {
      title: 'Valid title',
      content: 'A'.repeat(10000),
    });
    const res = await forumSlugPOST(req, makeSlugParams('general'));

    expect(res.status).toBe(201);
  });

  // ── Error handling ────────────────────────────────────────────────────────

  it('returns 500 when thread creation fails in database', async () => {
    mockPrisma.forumThread.create.mockRejectedValue(new Error('DB write error'));

    const req = makePostRequest('http://localhost/api/community/forums/general', validBody);
    const res = await forumSlugPOST(req, makeSlugParams('general'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Failed to create forum thread');
  });

  it('returns 500 when ban status check throws', async () => {
    mockCheckUserBanStatus.mockRejectedValue(new Error('Ban check failed'));

    const req = makePostRequest('http://localhost/api/community/forums/general', validBody);
    const res = await forumSlugPOST(req, makeSlugParams('general'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to create forum thread');
  });

  it('succeeds even if thread subscription creation fails (fire-and-forget)', async () => {
    mockPrisma.threadSubscription.create.mockRejectedValue(new Error('Subscription error'));

    const req = makePostRequest('http://localhost/api/community/forums/general', validBody);
    const res = await forumSlugPOST(req, makeSlugParams('general'));

    expect(res.status).toBe(201);
  });
});
