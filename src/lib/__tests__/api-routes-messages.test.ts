/**
 * @jest-environment node
 */

/**
 * API route handler tests for messaging endpoints:
 *   - GET  /api/messages                  (list conversations)
 *   - POST /api/messages                  (send a message / start conversation)
 *   - GET  /api/messages/[conversationId] (get messages in a conversation, paginated)
 *   - POST /api/messages/[conversationId] (mark conversation as read)
 *
 * Validates auth checks, input validation, ownership/participant checks,
 * ban/mute/block enforcement, conversation creation, and pagination.
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    conversationParticipant: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    conversation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    directMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({ authOptions: {} }));

jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/moderation', () => ({
  checkUserBanStatus: jest.fn(),
  isUserBlocked: jest.fn(),
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { checkUserBanStatus, isUserBlocked } from '@/lib/moderation';

import { GET as messagesGET, POST as messagesPOST } from '@/app/api/messages/route';
import { GET as unreadGET } from '@/app/api/messages/unread/route';
import {
  GET as conversationGET,
  POST as conversationPOST,
} from '@/app/api/messages/[conversationId]/route';

// ── Mock references ──────────────────────────────────────────────────────────

const mockPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock };
  conversationParticipant: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  conversation: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  directMessage: {
    findMany: jest.Mock;
    create: jest.Mock;
    count: jest.Mock;
  };
};

const mockGetServerSession = getServerSession as jest.Mock;
const mockCheckUserBanStatus = checkUserBanStatus as jest.Mock;
const mockIsUserBlocked = isUserBlocked as jest.Mock;

// ── Helpers ──────────────────────────────────────────────────────────────────

function authedSession(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com', ...overrides },
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

beforeEach(() => {
  jest.clearAllMocks();
  // Default: not banned, not muted, not blocked
  mockCheckUserBanStatus.mockResolvedValue({ isBanned: false, isMuted: false });
  mockIsUserBlocked.mockResolvedValue(false);
});

// =============================================================================
// GET /api/messages — List conversations
// =============================================================================

describe('GET /api/messages', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await messagesGET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns empty conversations array when user has no participations', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.conversationParticipant.findMany.mockResolvedValue([]);

    const res = await messagesGET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.conversations).toEqual([]);
  });

  it('returns conversations with unread counts and other participants', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());

    const lastRead = new Date('2026-02-20T00:00:00Z');
    mockPrisma.conversationParticipant.findMany.mockResolvedValue([
      { conversationId: 'conv-1', lastReadAt: lastRead },
    ]);

    mockPrisma.conversation.findMany.mockResolvedValue([
      {
        id: 'conv-1',
        lastMessageAt: new Date('2026-02-21T12:00:00Z'),
        participants: [
          { userId: 'user-1', user: { id: 'user-1', name: 'Test User', email: 'test@example.com' } },
          { userId: 'user-2', user: { id: 'user-2', name: 'Other User', email: 'other@example.com' } },
        ],
        messages: [
          {
            id: 'msg-99',
            content: 'Latest message',
            createdAt: new Date('2026-02-21T12:00:00Z'),
            sender: { id: 'user-2', name: 'Other User' },
          },
        ],
      },
    ]);

    // unreadCount query
    mockPrisma.directMessage.count.mockResolvedValue(3);

    const res = await messagesGET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.conversations).toHaveLength(1);

    const conv = body.data.conversations[0];
    expect(conv.id).toBe('conv-1');
    expect(conv.unreadCount).toBe(3);
    expect(conv.otherParticipants).toEqual([
      { id: 'user-2', name: 'Other User', email: 'other@example.com' },
    ]);
    expect(conv.lastMessage.content).toBe('Latest message');
  });

  it('counts all messages as unread when lastReadAt is null', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());

    mockPrisma.conversationParticipant.findMany.mockResolvedValue([
      { conversationId: 'conv-1', lastReadAt: null },
    ]);

    mockPrisma.conversation.findMany.mockResolvedValue([
      {
        id: 'conv-1',
        lastMessageAt: new Date(),
        participants: [
          { userId: 'user-1', user: { id: 'user-1', name: 'Test User', email: 'test@example.com' } },
          { userId: 'user-2', user: { id: 'user-2', name: 'Other', email: 'o@example.com' } },
        ],
        messages: [],
      },
    ]);

    mockPrisma.directMessage.count.mockResolvedValue(7);

    const res = await messagesGET();
    const body = await res.json();

    expect(body.data.conversations[0].unreadCount).toBe(7);
    // When lastReadAt is null, the count query should NOT use a `gt` filter
    expect(mockPrisma.directMessage.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          conversationId: 'conv-1',
          senderId: { not: 'user-1' },
        }),
      })
    );
  });

  it('returns null lastMessage when conversation has no messages', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());

    mockPrisma.conversationParticipant.findMany.mockResolvedValue([
      { conversationId: 'conv-1', lastReadAt: new Date() },
    ]);

    mockPrisma.conversation.findMany.mockResolvedValue([
      {
        id: 'conv-1',
        lastMessageAt: new Date(),
        participants: [
          { userId: 'user-1', user: { id: 'user-1', name: 'Test User', email: 'test@example.com' } },
          { userId: 'user-2', user: { id: 'user-2', name: 'Other', email: 'o@example.com' } },
        ],
        messages: [], // no messages
      },
    ]);

    mockPrisma.directMessage.count.mockResolvedValue(0);

    const res = await messagesGET();
    const body = await res.json();

    expect(body.data.conversations[0].lastMessage).toBeNull();
  });

  it('returns 500 when database throws', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.conversationParticipant.findMany.mockRejectedValue(new Error('DB down'));

    const res = await messagesGET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toBe('Failed to fetch conversations');
  });
});

// =============================================================================
// POST /api/messages — Send a message
// =============================================================================

describe('POST /api/messages', () => {
  const validBody = {
    recipientId: 'user-2',
    content: 'Hello, world!',
  };

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/messages', validBody);
    const res = await messagesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 403 when user is banned', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockCheckUserBanStatus.mockResolvedValue({ isBanned: true, isMuted: false });

    const req = makePostRequest('http://localhost/api/messages', validBody);
    const res = await messagesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain('suspended');
  });

  it('returns 403 when user is muted', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockCheckUserBanStatus.mockResolvedValue({ isBanned: false, isMuted: true });

    const req = makePostRequest('http://localhost/api/messages', validBody);
    const res = await messagesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain('muted');
  });

  it('returns 400 when recipientId is missing', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());

    const req = makePostRequest('http://localhost/api/messages', { content: 'hi' });
    const res = await messagesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toContain('recipientId');
  });

  it('returns 400 when recipientId is not a string', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());

    const req = makePostRequest('http://localhost/api/messages', {
      recipientId: 123,
      content: 'hi',
    });
    const res = await messagesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toContain('recipientId');
  });

  it('returns 400 when content is missing', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());

    const req = makePostRequest('http://localhost/api/messages', { recipientId: 'user-2' });
    const res = await messagesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toContain('content');
  });

  it('returns 400 when content is empty/whitespace-only', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());

    const req = makePostRequest('http://localhost/api/messages', {
      recipientId: 'user-2',
      content: '   ',
    });
    const res = await messagesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toContain('content');
  });

  it('returns 400 when content exceeds 5000 characters', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());

    const req = makePostRequest('http://localhost/api/messages', {
      recipientId: 'user-2',
      content: 'x'.repeat(5001),
    });
    const res = await messagesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toContain('5000');
  });

  it('accepts content at exactly 5000 characters', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
    mockPrisma.conversationParticipant.findMany.mockResolvedValue([]);
    mockPrisma.conversation.create.mockResolvedValue({ id: 'conv-new' });
    mockPrisma.directMessage.create.mockResolvedValue({
      id: 'msg-1',
      content: 'x'.repeat(5000),
      sender: { id: 'user-1', name: 'Test User' },
    });
    mockPrisma.conversationParticipant.updateMany.mockResolvedValue({ count: 1 });

    const req = makePostRequest('http://localhost/api/messages', {
      recipientId: 'user-2',
      content: 'x'.repeat(5000),
    });
    const res = await messagesPOST(req);

    expect(res.status).toBe(201);
  });

  it('returns 400 when trying to message yourself', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());

    const req = makePostRequest('http://localhost/api/messages', {
      recipientId: 'user-1', // same as session user
      content: 'Hello me',
    });
    const res = await messagesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toContain('cannot message yourself');
  });

  it('returns 403 when recipient has blocked the sender', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockIsUserBlocked.mockResolvedValue(true);

    const req = makePostRequest('http://localhost/api/messages', validBody);
    const res = await messagesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toContain('Unable to message');
    // Verify called with recipientId as blocker, senderId as blocked
    expect(mockIsUserBlocked).toHaveBeenCalledWith('user-2', 'user-1');
  });

  it('returns 400 when recipient does not exist', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = makePostRequest('http://localhost/api/messages', validBody);
    const res = await messagesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toContain('Recipient not found');
  });

  it('creates a new conversation when none exists between users', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2' });

    // No existing participations for sender
    mockPrisma.conversationParticipant.findMany.mockResolvedValue([]);

    // Conversation creation
    mockPrisma.conversation.create.mockResolvedValue({ id: 'conv-new' });

    // Message creation
    const createdMessage = {
      id: 'msg-1',
      conversationId: 'conv-new',
      senderId: 'user-1',
      content: 'Hello, world!',
      createdAt: new Date(),
      sender: { id: 'user-1', name: 'Test User' },
    };
    mockPrisma.directMessage.create.mockResolvedValue(createdMessage);
    mockPrisma.conversationParticipant.updateMany.mockResolvedValue({ count: 1 });

    const req = makePostRequest('http://localhost/api/messages', validBody);
    const res = await messagesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.conversationId).toBe('conv-new');
    expect(body.data.message.content).toBe('Hello, world!');

    // Verify conversation was created with both participants
    expect(mockPrisma.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          participants: {
            create: expect.arrayContaining([
              expect.objectContaining({ userId: 'user-1' }),
              expect.objectContaining({ userId: 'user-2' }),
            ]),
          },
        }),
      })
    );
  });

  it('reuses existing conversation when one exists between users', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2' });

    // Sender participates in conv-existing
    mockPrisma.conversationParticipant.findMany.mockResolvedValue([
      { conversationId: 'conv-existing' },
    ]);

    // Recipient also in conv-existing
    mockPrisma.conversationParticipant.findFirst.mockResolvedValue({
      conversationId: 'conv-existing',
    });

    // Update existing conversation timestamp
    mockPrisma.conversation.update.mockResolvedValue({ id: 'conv-existing' });

    const createdMessage = {
      id: 'msg-2',
      conversationId: 'conv-existing',
      senderId: 'user-1',
      content: 'Hello, world!',
      createdAt: new Date(),
      sender: { id: 'user-1', name: 'Test User' },
    };
    mockPrisma.directMessage.create.mockResolvedValue(createdMessage);
    mockPrisma.conversationParticipant.updateMany.mockResolvedValue({ count: 1 });

    const req = makePostRequest('http://localhost/api/messages', validBody);
    const res = await messagesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.conversationId).toBe('conv-existing');

    // Should NOT create a new conversation
    expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
    // Should update existing conversation's lastMessageAt
    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conv-existing' },
        data: expect.objectContaining({ lastMessageAt: expect.any(Date) }),
      })
    );
  });

  it('trims message content before saving', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
    mockPrisma.conversationParticipant.findMany.mockResolvedValue([]);
    mockPrisma.conversation.create.mockResolvedValue({ id: 'conv-new' });
    mockPrisma.directMessage.create.mockResolvedValue({
      id: 'msg-3',
      content: 'trimmed',
      sender: { id: 'user-1', name: 'Test User' },
    });
    mockPrisma.conversationParticipant.updateMany.mockResolvedValue({ count: 1 });

    const req = makePostRequest('http://localhost/api/messages', {
      recipientId: 'user-2',
      content: '  trimmed  ',
    });
    await messagesPOST(req);

    expect(mockPrisma.directMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: 'trimmed',
        }),
      })
    );
  });

  it('updates sender lastReadAt after sending a message', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
    mockPrisma.conversationParticipant.findMany.mockResolvedValue([]);
    mockPrisma.conversation.create.mockResolvedValue({ id: 'conv-new' });
    mockPrisma.directMessage.create.mockResolvedValue({
      id: 'msg-4',
      content: 'hi',
      sender: { id: 'user-1', name: 'Test User' },
    });
    mockPrisma.conversationParticipant.updateMany.mockResolvedValue({ count: 1 });

    const req = makePostRequest('http://localhost/api/messages', validBody);
    await messagesPOST(req);

    expect(mockPrisma.conversationParticipant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          conversationId: 'conv-new',
          userId: 'user-1',
        }),
        data: expect.objectContaining({
          lastReadAt: expect.any(Date),
        }),
      })
    );
  });

  it('returns 500 when database throws', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockCheckUserBanStatus.mockRejectedValue(new Error('DB down'));

    const req = makePostRequest('http://localhost/api/messages', validBody);
    const res = await messagesPOST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.message).toBe('Failed to send message');
  });
});

// =============================================================================
// GET /api/messages/[conversationId] — Get messages in a conversation
// =============================================================================

describe('GET /api/messages/[conversationId]', () => {
  const conversationId = 'conv-1';
  const routeParams = { params: { conversationId } };

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makeGetRequest(`http://localhost/api/messages/${conversationId}`);
    const res = await conversationGET(req, routeParams);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 403 when user is not a participant', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.conversationParticipant.findUnique.mockResolvedValue(null);

    const req = makeGetRequest(`http://localhost/api/messages/${conversationId}`);
    const res = await conversationGET(req, routeParams);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('not a participant');
  });

  it('returns paginated messages with default page=1 limit=50', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.conversationParticipant.findUnique.mockResolvedValue({
      conversationId,
      userId: 'user-1',
      lastReadAt: new Date(),
    });

    const messages = [
      { id: 'msg-1', content: 'Hello', sender: { id: 'user-2', name: 'Other', email: 'o@test.com' } },
      { id: 'msg-2', content: 'Hi!', sender: { id: 'user-1', name: 'Test User', email: 'test@example.com' } },
    ];

    mockPrisma.directMessage.findMany.mockResolvedValue(messages);
    mockPrisma.directMessage.count.mockResolvedValue(2);
    mockPrisma.conversationParticipant.update.mockResolvedValue({});

    const req = makeGetRequest(`http://localhost/api/messages/${conversationId}`);
    const res = await conversationGET(req, routeParams);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.messages).toHaveLength(2);
    expect(body.data.pagination).toEqual({
      page: 1,
      limit: 50,
      total: 2,
      totalPages: 1,
    });
  });

  it('respects custom pagination parameters', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.conversationParticipant.findUnique.mockResolvedValue({
      conversationId,
      userId: 'user-1',
    });

    mockPrisma.directMessage.findMany.mockResolvedValue([]);
    mockPrisma.directMessage.count.mockResolvedValue(150);
    mockPrisma.conversationParticipant.update.mockResolvedValue({});

    const req = makeGetRequest(
      `http://localhost/api/messages/${conversationId}?page=3&limit=25`
    );
    const res = await conversationGET(req, routeParams);
    const body = await res.json();

    expect(body.data.pagination).toEqual({
      page: 3,
      limit: 25,
      total: 150,
      totalPages: 6,
    });

    // Verify skip/take passed to Prisma
    expect(mockPrisma.directMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 50, // (3-1) * 25
        take: 25,
      })
    );
  });

  it('constrains limit to a maximum of 100', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.conversationParticipant.findUnique.mockResolvedValue({
      conversationId,
      userId: 'user-1',
    });

    mockPrisma.directMessage.findMany.mockResolvedValue([]);
    mockPrisma.directMessage.count.mockResolvedValue(0);
    mockPrisma.conversationParticipant.update.mockResolvedValue({});

    const req = makeGetRequest(
      `http://localhost/api/messages/${conversationId}?limit=500`
    );
    const res = await conversationGET(req, routeParams);
    const body = await res.json();

    expect(body.data.pagination.limit).toBe(100);
  });

  it('defaults page to 1 when negative or invalid', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.conversationParticipant.findUnique.mockResolvedValue({
      conversationId,
      userId: 'user-1',
    });

    mockPrisma.directMessage.findMany.mockResolvedValue([]);
    mockPrisma.directMessage.count.mockResolvedValue(0);
    mockPrisma.conversationParticipant.update.mockResolvedValue({});

    const req = makeGetRequest(
      `http://localhost/api/messages/${conversationId}?page=-5`
    );
    const res = await conversationGET(req, routeParams);
    const body = await res.json();

    expect(body.data.pagination.page).toBe(1);
  });

  it('orders messages by createdAt ascending', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.conversationParticipant.findUnique.mockResolvedValue({
      conversationId,
      userId: 'user-1',
    });

    mockPrisma.directMessage.findMany.mockResolvedValue([]);
    mockPrisma.directMessage.count.mockResolvedValue(0);
    mockPrisma.conversationParticipant.update.mockResolvedValue({});

    const req = makeGetRequest(`http://localhost/api/messages/${conversationId}`);
    await conversationGET(req, routeParams);

    expect(mockPrisma.directMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'asc' },
      })
    );
  });

  it('auto-marks conversation as read on GET', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.conversationParticipant.findUnique.mockResolvedValue({
      conversationId,
      userId: 'user-1',
    });

    mockPrisma.directMessage.findMany.mockResolvedValue([]);
    mockPrisma.directMessage.count.mockResolvedValue(0);
    mockPrisma.conversationParticipant.update.mockResolvedValue({});

    const req = makeGetRequest(`http://localhost/api/messages/${conversationId}`);
    await conversationGET(req, routeParams);

    expect(mockPrisma.conversationParticipant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          conversationId_userId: {
            conversationId,
            userId: 'user-1',
          },
        },
        data: {
          lastReadAt: expect.any(Date),
        },
      })
    );
  });

  it('returns 500 when database throws', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.conversationParticipant.findUnique.mockRejectedValue(new Error('DB down'));

    const req = makeGetRequest(`http://localhost/api/messages/${conversationId}`);
    const res = await conversationGET(req, routeParams);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.message).toBe('Failed to fetch messages');
  });
});

// =============================================================================
// POST /api/messages/[conversationId] — Mark conversation as read
// =============================================================================

describe('POST /api/messages/[conversationId]', () => {
  const conversationId = 'conv-1';
  const routeParams = { params: { conversationId } };

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = makePostRequest(`http://localhost/api/messages/${conversationId}`, {});
    const res = await conversationPOST(req, routeParams);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 404 when conversation does not exist', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.conversation.findUnique.mockResolvedValue(null);

    const req = makePostRequest(`http://localhost/api/messages/${conversationId}`, {});
    const res = await conversationPOST(req, routeParams);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('not found');
  });

  it('returns 403 when user is not a participant', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.conversation.findUnique.mockResolvedValue({ id: conversationId });
    mockPrisma.conversationParticipant.findUnique.mockResolvedValue(null);

    const req = makePostRequest(`http://localhost/api/messages/${conversationId}`, {});
    const res = await conversationPOST(req, routeParams);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('not a participant');
  });

  it('marks conversation as read and returns lastReadAt', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.conversation.findUnique.mockResolvedValue({ id: conversationId });
    mockPrisma.conversationParticipant.findUnique.mockResolvedValue({
      conversationId,
      userId: 'user-1',
    });
    mockPrisma.conversationParticipant.update.mockResolvedValue({});

    const req = makePostRequest(`http://localhost/api/messages/${conversationId}`, {});
    const res = await conversationPOST(req, routeParams);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.lastReadAt).toBeDefined();

    expect(mockPrisma.conversationParticipant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          conversationId_userId: {
            conversationId,
            userId: 'user-1',
          },
        },
        data: {
          lastReadAt: expect.any(Date),
        },
      })
    );
  });

  it('verifies conversation exists before checking participation', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.conversation.findUnique.mockResolvedValue({ id: conversationId });
    mockPrisma.conversationParticipant.findUnique.mockResolvedValue({
      conversationId,
      userId: 'user-1',
    });
    mockPrisma.conversationParticipant.update.mockResolvedValue({});

    const req = makePostRequest(`http://localhost/api/messages/${conversationId}`, {});
    await conversationPOST(req, routeParams);

    // conversation.findUnique should be called before participant check
    expect(mockPrisma.conversation.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: conversationId },
      })
    );
  });

  it('returns 500 when database throws', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.conversation.findUnique.mockRejectedValue(new Error('DB down'));

    const req = makePostRequest(`http://localhost/api/messages/${conversationId}`, {});
    const res = await conversationPOST(req, routeParams);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.message).toBe('Failed to mark conversation as read');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/messages/unread
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/messages/unread', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await unreadGET();
    expect(res.status).toBe(401);
  });

  it('returns 0 when user has no conversations', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.conversationParticipant.findMany.mockResolvedValue([]);

    const res = await unreadGET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.unreadCount).toBe(0);
  });

  it('returns correct unread count across conversations', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.conversationParticipant.findMany.mockResolvedValue([
      { conversationId: 'conv-1', lastReadAt: new Date('2024-01-01') },
      { conversationId: 'conv-2', lastReadAt: null },
    ]);
    // 3 unread in conv-1, 5 unread in conv-2
    mockPrisma.directMessage.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(5);

    const res = await unreadGET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.unreadCount).toBe(8);
  });

  it('returns 500 when database throws', async () => {
    mockGetServerSession.mockResolvedValue(authedSession());
    mockPrisma.conversationParticipant.findMany.mockRejectedValue(
      new Error('DB down')
    );

    const res = await unreadGET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.message).toBe('Failed to fetch unread count');
  });
});
