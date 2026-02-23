/**
 * @jest-environment node
 */

/**
 * API route handler tests for extended community endpoints:
 *   - POST  /api/community/forums/[slug]/[threadId]/vote            (thread voting)
 *   - POST  /api/community/forums/[slug]/[threadId]/posts/[postId]/vote (post voting)
 *   - POST  /api/community/forums/[slug]/[threadId]/accept          (accept answer)
 *   - POST  /api/community/forums/[slug]/[threadId]/subscribe       (subscribe)
 *   - DELETE /api/community/forums/[slug]/[threadId]/subscribe      (unsubscribe)
 *
 * Validates authentication, validation, voting, reputation, and error handling.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    forumThread: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    forumPost: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    threadVote: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    postVote: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    threadSubscription: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/reputation', () => ({
  updateReputation: jest.fn().mockResolvedValue(undefined),
  REPUTATION_POINTS: {
    THREAD_CREATED: 5,
    POST_CREATED: 2,
    UPVOTE_RECEIVED: 10,
    DOWNVOTE_RECEIVED: -2,
    ACCEPTED_ANSWER: 25,
    ACCEPTED_ANSWER_REVOKED: -25,
  },
}));
jest.mock('@/lib/notifications-server', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { updateReputation } from '@/lib/reputation';

import { POST as threadVotePOST } from '@/app/api/community/forums/[slug]/[threadId]/vote/route';
import { POST as postVotePOST } from '@/app/api/community/forums/[slug]/[threadId]/posts/[postId]/vote/route';
import { POST as acceptPOST } from '@/app/api/community/forums/[slug]/[threadId]/accept/route';
import {
  POST as subscribePOST,
  DELETE as subscribeDELETE,
} from '@/app/api/community/forums/[slug]/[threadId]/subscribe/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as unknown as {
  forumThread: { findUnique: jest.Mock; update: jest.Mock };
  forumPost: { findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
  threadVote: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock; count: jest.Mock };
  postVote: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock; count: jest.Mock };
  threadSubscription: { findUnique: jest.Mock; upsert: jest.Mock; deleteMany: jest.Mock };
};

const mockGetServerSession = getServerSession as jest.Mock;
const mockUpdateReputation = updateReputation as jest.Mock;

function makePostRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(url: string) {
  return new NextRequest(url, { method: 'DELETE' });
}

function makeThreadParams(slug: string, threadId: string) {
  return { params: Promise.resolve({ slug, threadId }) };
}

function makePostParams(slug: string, threadId: string, postId: string) {
  return { params: Promise.resolve({ slug, threadId, postId }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: authenticated user
  mockGetServerSession.mockResolvedValue({ user: { id: 'user-1', name: 'Test User' } });
});

// =============================================================================
// POST /api/community/forums/[slug]/[threadId]/vote — Thread Voting
// =============================================================================

describe('POST thread vote', () => {
  beforeEach(() => {
    mockPrisma.forumThread.findUnique.mockResolvedValue({
      id: 'thread-1',
      authorId: 'author-1',
    });
    mockPrisma.threadVote.count
      .mockResolvedValueOnce(5)  // upvotes
      .mockResolvedValueOnce(1); // downvotes
    mockPrisma.forumThread.update.mockResolvedValue({});
  });

  it('creates a new upvote on a thread', async () => {
    mockPrisma.threadVote.findUnique.mockResolvedValue(null); // no existing vote
    mockPrisma.threadVote.create.mockResolvedValue({});

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/vote', { value: 1 });
    const res = await threadVotePOST(req, makeThreadParams('general', 'thread-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.userVote).toBe(1);
    expect(body.upvoteCount).toBe(5);
    expect(body.downvoteCount).toBe(1);
    expect(mockPrisma.threadVote.create).toHaveBeenCalledWith({
      data: { threadId: 'thread-1', userId: 'user-1', value: 1 },
    });
  });

  it('creates a new downvote on a thread', async () => {
    mockPrisma.threadVote.findUnique.mockResolvedValue(null);
    mockPrisma.threadVote.create.mockResolvedValue({});

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/vote', { value: -1 });
    const res = await threadVotePOST(req, makeThreadParams('general', 'thread-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.userVote).toBe(-1);
  });

  it('toggles off when same vote exists (upvote -> remove)', async () => {
    mockPrisma.threadVote.findUnique.mockResolvedValue({ value: 1, threadId: 'thread-1', userId: 'user-1' });
    mockPrisma.threadVote.delete.mockResolvedValue({});

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/vote', { value: 1 });
    const res = await threadVotePOST(req, makeThreadParams('general', 'thread-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.userVote).toBeNull();
    expect(mockPrisma.threadVote.delete).toHaveBeenCalled();
  });

  it('updates vote when different value exists (upvote -> downvote)', async () => {
    mockPrisma.threadVote.findUnique.mockResolvedValue({ value: 1, threadId: 'thread-1', userId: 'user-1' });
    mockPrisma.threadVote.update.mockResolvedValue({});

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/vote', { value: -1 });
    const res = await threadVotePOST(req, makeThreadParams('general', 'thread-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.userVote).toBe(-1);
    expect(mockPrisma.threadVote.update).toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/vote', { value: 1 });
    const res = await threadVotePOST(req, makeThreadParams('general', 'thread-1'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('validates vote value (must be 1 or -1)', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/vote', { value: 2 });
    const res = await threadVotePOST(req, makeThreadParams('general', 'thread-1'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when thread does not exist', async () => {
    mockPrisma.forumThread.findUnique.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/community/forums/general/nonexistent/vote', { value: 1 });
    const res = await threadVotePOST(req, makeThreadParams('general', 'nonexistent'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
  });

  it('awards reputation to thread author on new upvote', async () => {
    mockPrisma.threadVote.findUnique.mockResolvedValue(null);
    mockPrisma.threadVote.create.mockResolvedValue({});

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/vote', { value: 1 });
    await threadVotePOST(req, makeThreadParams('general', 'thread-1'));

    expect(mockUpdateReputation).toHaveBeenCalledWith('author-1', 10, 'thread_vote_received');
  });

  it('does not award reputation when voting on own thread', async () => {
    mockPrisma.forumThread.findUnique.mockResolvedValue({ id: 'thread-1', authorId: 'user-1' });
    mockPrisma.threadVote.findUnique.mockResolvedValue(null);
    mockPrisma.threadVote.create.mockResolvedValue({});

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/vote', { value: 1 });
    await threadVotePOST(req, makeThreadParams('general', 'thread-1'));

    expect(mockUpdateReputation).not.toHaveBeenCalled();
  });
});

// =============================================================================
// POST /api/community/forums/[slug]/[threadId]/posts/[postId]/vote — Post Voting
// =============================================================================

describe('POST post vote', () => {
  beforeEach(() => {
    mockPrisma.forumPost.findUnique.mockResolvedValue({
      id: 'post-1',
      threadId: 'thread-1',
      authorId: 'post-author-1',
    });
    mockPrisma.postVote.count
      .mockResolvedValueOnce(3)  // upvotes
      .mockResolvedValueOnce(0); // downvotes
    mockPrisma.forumPost.update.mockResolvedValue({});
  });

  it('creates a new upvote on a post', async () => {
    mockPrisma.postVote.findUnique.mockResolvedValue(null);
    mockPrisma.postVote.create.mockResolvedValue({});

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/posts/post-1/vote', { value: 1 });
    const res = await postVotePOST(req, makePostParams('general', 'thread-1', 'post-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.userVote).toBe(1);
    expect(body.upvoteCount).toBe(3);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/posts/post-1/vote', { value: 1 });
    const res = await postVotePOST(req, makePostParams('general', 'thread-1', 'post-1'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 404 when post does not exist', async () => {
    mockPrisma.forumPost.findUnique.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/posts/nonexistent/vote', { value: 1 });
    const res = await postVotePOST(req, makePostParams('general', 'thread-1', 'nonexistent'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
  });

  it('returns 404 when post does not belong to thread', async () => {
    mockPrisma.forumPost.findUnique.mockResolvedValue({
      id: 'post-1',
      threadId: 'other-thread',
      authorId: 'post-author-1',
    });

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/posts/post-1/vote', { value: 1 });
    const res = await postVotePOST(req, makePostParams('general', 'thread-1', 'post-1'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.message).toContain('does not belong');
  });

  it('validates vote value (must be 1 or -1)', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/posts/post-1/vote', { value: 0 });
    const res = await postVotePOST(req, makePostParams('general', 'thread-1', 'post-1'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it('awards reputation to post author on new upvote', async () => {
    mockPrisma.postVote.findUnique.mockResolvedValue(null);
    mockPrisma.postVote.create.mockResolvedValue({});

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/posts/post-1/vote', { value: 1 });
    await postVotePOST(req, makePostParams('general', 'thread-1', 'post-1'));

    expect(mockUpdateReputation).toHaveBeenCalledWith('post-author-1', 10, 'post_vote_received');
  });
});

// =============================================================================
// POST /api/community/forums/[slug]/[threadId]/accept — Accept Answer
// =============================================================================

describe('POST accept answer', () => {
  it('marks a post as the accepted answer', async () => {
    mockPrisma.forumThread.findUnique.mockResolvedValue({
      id: 'thread-1',
      authorId: 'user-1', // same as session user
      acceptedPostId: null,
    });
    mockPrisma.forumPost.findUnique.mockResolvedValue({
      id: 'post-1',
      threadId: 'thread-1',
      authorId: 'post-author-1',
    });
    mockPrisma.forumPost.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.forumPost.update.mockResolvedValue({});
    mockPrisma.forumThread.update.mockResolvedValue({});

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/accept', { postId: 'post-1' });
    const res = await acceptPOST(req, makeThreadParams('general', 'thread-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.acceptedPostId).toBe('post-1');
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/accept', { postId: 'post-1' });
    const res = await acceptPOST(req, makeThreadParams('general', 'thread-1'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 403 when user is not the thread author', async () => {
    mockPrisma.forumThread.findUnique.mockResolvedValue({
      id: 'thread-1',
      authorId: 'other-user',
      acceptedPostId: null,
    });

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/accept', { postId: 'post-1' });
    const res = await acceptPOST(req, makeThreadParams('general', 'thread-1'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.message).toContain('thread author');
  });

  it('returns 404 when thread does not exist', async () => {
    mockPrisma.forumThread.findUnique.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/community/forums/general/nonexistent/accept', { postId: 'post-1' });
    const res = await acceptPOST(req, makeThreadParams('general', 'nonexistent'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
  });

  it('returns 404 when post does not exist', async () => {
    mockPrisma.forumThread.findUnique.mockResolvedValue({
      id: 'thread-1',
      authorId: 'user-1',
      acceptedPostId: null,
    });
    mockPrisma.forumPost.findUnique.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/accept', { postId: 'nonexistent' });
    const res = await acceptPOST(req, makeThreadParams('general', 'thread-1'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
  });

  it('validates postId is required', async () => {
    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/accept', {});
    const res = await acceptPOST(req, makeThreadParams('general', 'thread-1'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('awards ACCEPTED_ANSWER reputation to post author', async () => {
    mockPrisma.forumThread.findUnique.mockResolvedValue({
      id: 'thread-1',
      authorId: 'user-1',
      acceptedPostId: null,
    });
    mockPrisma.forumPost.findUnique.mockResolvedValue({
      id: 'post-1',
      threadId: 'thread-1',
      authorId: 'answer-author',
    });
    mockPrisma.forumPost.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.forumPost.update.mockResolvedValue({});
    mockPrisma.forumThread.update.mockResolvedValue({});

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/accept', { postId: 'post-1' });
    await acceptPOST(req, makeThreadParams('general', 'thread-1'));

    expect(mockUpdateReputation).toHaveBeenCalledWith('answer-author', 25, 'accepted_answer');
  });

  it('toggles off accepted answer when same post is already accepted', async () => {
    mockPrisma.forumThread.findUnique.mockResolvedValue({
      id: 'thread-1',
      authorId: 'user-1',
      acceptedPostId: 'post-1', // already accepted
    });
    mockPrisma.forumPost.findUnique.mockResolvedValue({
      id: 'post-1',
      threadId: 'thread-1',
      authorId: 'answer-author',
    });
    mockPrisma.forumPost.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.forumThread.update.mockResolvedValue({});

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/accept', { postId: 'post-1' });
    const res = await acceptPOST(req, makeThreadParams('general', 'thread-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.acceptedPostId).toBeNull();
    // Should revoke reputation
    expect(mockUpdateReputation).toHaveBeenCalledWith('answer-author', -25, 'accepted_answer_revoked');
  });
});

// =============================================================================
// POST /api/community/forums/[slug]/[threadId]/subscribe
// =============================================================================

describe('POST subscribe to thread', () => {
  it('subscribes to a thread successfully', async () => {
    mockPrisma.forumThread.findUnique.mockResolvedValue({ id: 'thread-1', title: 'Test Thread' });
    mockPrisma.threadSubscription.upsert.mockResolvedValue({});

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/subscribe', {});
    const res = await subscribePOST(req, makeThreadParams('general', 'thread-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.subscribed).toBe(true);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/subscribe', {});
    const res = await subscribePOST(req, makeThreadParams('general', 'thread-1'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 404 when thread does not exist', async () => {
    mockPrisma.forumThread.findUnique.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/community/forums/general/nonexistent/subscribe', {});
    const res = await subscribePOST(req, makeThreadParams('general', 'nonexistent'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
  });

  it('uses upsert to handle re-subscribing idempotently', async () => {
    mockPrisma.forumThread.findUnique.mockResolvedValue({ id: 'thread-1', title: 'Test' });
    mockPrisma.threadSubscription.upsert.mockResolvedValue({});

    const req = makePostRequest('http://localhost/api/community/forums/general/thread-1/subscribe', {});
    await subscribePOST(req, makeThreadParams('general', 'thread-1'));

    expect(mockPrisma.threadSubscription.upsert).toHaveBeenCalledWith({
      where: {
        userId_threadId: { userId: 'user-1', threadId: 'thread-1' },
      },
      update: {},
      create: { userId: 'user-1', threadId: 'thread-1' },
    });
  });
});

// =============================================================================
// DELETE /api/community/forums/[slug]/[threadId]/subscribe
// =============================================================================

describe('DELETE unsubscribe from thread', () => {
  it('unsubscribes from a thread successfully', async () => {
    mockPrisma.threadSubscription.deleteMany.mockResolvedValue({ count: 1 });

    const req = makeDeleteRequest('http://localhost/api/community/forums/general/thread-1/subscribe');
    const res = await subscribeDELETE(req, makeThreadParams('general', 'thread-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.subscribed).toBe(false);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makeDeleteRequest('http://localhost/api/community/forums/general/thread-1/subscribe');
    const res = await subscribeDELETE(req, makeThreadParams('general', 'thread-1'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('succeeds even if no subscription existed (deleteMany returns 0)', async () => {
    mockPrisma.threadSubscription.deleteMany.mockResolvedValue({ count: 0 });

    const req = makeDeleteRequest('http://localhost/api/community/forums/general/thread-1/subscribe');
    const res = await subscribeDELETE(req, makeThreadParams('general', 'thread-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.subscribed).toBe(false);
  });

  it('returns 500 when database throws', async () => {
    mockPrisma.threadSubscription.deleteMany.mockRejectedValue(new Error('DB error'));

    const req = makeDeleteRequest('http://localhost/api/community/forums/general/thread-1/subscribe');
    const res = await subscribeDELETE(req, makeThreadParams('general', 'thread-1'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
