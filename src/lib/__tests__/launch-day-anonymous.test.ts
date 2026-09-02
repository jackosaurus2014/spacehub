/**
 * @jest-environment node
 */

/**
 * Anonymous participation on launch-day pages (2026-09-01).
 *
 * Logged-out visitors can react, vote in polls and chat. Identity comes from
 * the httpOnly `sn_vid` visitor cookie set by middleware; signed-in users keep
 * their real identity. These tests pin the contract:
 *
 *   - reaction with sn_vid → 201, userId null; no cookie and no session → 401
 *   - poll vote twice from one sn_vid → upsert on (pollId, voterKey), never a
 *     second row
 *   - anonymous chat containing a URL → 400; signed-in chat with a URL → 201
 *   - the anonymous handle is deterministic per visitor id
 */

import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    launchReaction: { create: jest.fn() },
    launchPoll: { findUnique: jest.fn(), update: jest.fn() },
    launchPollVote: { upsert: jest.fn(), groupBy: jest.fn() },
    spaceEvent: { findUnique: jest.fn() },
    launchChatMessage: { create: jest.fn() },
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockCookieGet = jest.fn();
jest.mock('next/headers', () => ({
  // Next 15: cookies() returns a Promise.
  cookies: () => Promise.resolve({ get: mockCookieGet }),
}));

import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { POST as reactionPOST } from '@/app/api/launch-day/[eventId]/reactions/route';
import { POST as votePOST } from '@/app/api/launch-day/[eventId]/polls/vote/route';
import { POST as chatPOST } from '@/app/api/launch-day/[eventId]/chat/route';
import {
  anonymousHandle,
  resolveLaunchDayActor,
  BoundedRateLimiter,
} from '@/lib/launch-day-identity';

const mockGetServerSession = getServerSession as jest.Mock;
const mockPrisma = prisma as unknown as {
  launchReaction: { create: jest.Mock };
  launchPoll: { findUnique: jest.Mock; update: jest.Mock };
  launchPollVote: { upsert: jest.Mock; groupBy: jest.Mock };
  spaceEvent: { findUnique: jest.Mock };
  launchChatMessage: { create: jest.Mock };
};

const EVENT_ID = 'evt-1';
const ctx = { params: Promise.resolve({ eventId: EVENT_ID }) };

function post(path: string, body: unknown) {
  return new NextRequest(`http://localhost:3000/api/launch-day/${EVENT_ID}/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function anonymousVisitor(uuid: string) {
  mockGetServerSession.mockResolvedValue(null);
  mockCookieGet.mockImplementation((name: string) =>
    name === 'sn_vid' ? { name, value: uuid } : undefined
  );
}

function noIdentity() {
  mockGetServerSession.mockResolvedValue(null);
  mockCookieGet.mockReturnValue(undefined);
}

function signedIn(id = 'user-1') {
  mockGetServerSession.mockResolvedValue({ user: { id, name: 'Jay', email: 'jay@example.com' } });
  mockCookieGet.mockReturnValue(undefined);
}

// Distinct visitor ids per test so the per-voterKey limiters never collide.
const V1 = '11111111-2222-4333-8444-555555555555';
const V2 = '22222222-2222-4333-8444-555555555555';
const V3 = '33333333-2222-4333-8444-555555555555';
const V4 = '44444444-2222-4333-8444-555555555555';

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Identity ─────────────────────────────────────────────────────────────────

describe('resolveLaunchDayActor', () => {
  it('derives a deterministic handle from the visitor id', () => {
    const a = anonymousHandle(V1);
    expect(a).toBe(anonymousHandle(V1));
    expect(a).toBe(anonymousHandle(V1.toUpperCase()));
    expect(a).toMatch(/^Observer-[0-9A-F]{4}$/);
    expect(anonymousHandle(V2)).not.toBe(a);
    // The handle must not leak the cookie value itself.
    expect(V1).not.toContain(a.slice('Observer-'.length).toLowerCase());
  });

  it('prefers the session and uses the user id as voterKey', async () => {
    signedIn('user-9');
    const actor = await resolveLaunchDayActor(post('chat', {}));
    expect(actor).toEqual({
      userId: 'user-9',
      voterKey: 'user-9',
      displayName: 'Jay',
      anonymous: false,
    });
  });

  it('falls back to the sn_vid cookie for anonymous visitors', async () => {
    anonymousVisitor(V1);
    const actor = await resolveLaunchDayActor(post('chat', {}));
    expect(actor).toEqual({
      userId: null,
      voterKey: `anon:${V1}`,
      displayName: anonymousHandle(V1),
      anonymous: true,
    });
  });

  it('reads sn_vid from the request cookie header too', async () => {
    noIdentity();
    const req = new NextRequest(`http://localhost:3000/api/launch-day/${EVENT_ID}/chat`, {
      method: 'POST',
      headers: { cookie: `foo=bar; sn_vid=${V2}` },
    });
    const actor = await resolveLaunchDayActor(req);
    expect(actor?.voterKey).toBe(`anon:${V2}`);
  });

  it('rejects a cookie that is not a UUID', async () => {
    mockGetServerSession.mockResolvedValue(null);
    mockCookieGet.mockReturnValue({ name: 'sn_vid', value: 'not-a-uuid<script>' });
    expect(await resolveLaunchDayActor(post('chat', {}))).toBeNull();
  });

  it('returns null with no session and no cookie', async () => {
    noIdentity();
    expect(await resolveLaunchDayActor(post('chat', {}))).toBeNull();
  });
});

// ── Reactions ────────────────────────────────────────────────────────────────

describe('POST /api/launch-day/[eventId]/reactions', () => {
  it('accepts an anonymous reaction with sn_vid → 201, userId null', async () => {
    anonymousVisitor(V1);
    mockPrisma.launchReaction.create.mockResolvedValue({ id: 'r1' });

    const res = await reactionPOST(post('reactions', { emoji: 'rocket', phase: 'liftoff' }), ctx);
    expect(res.status).toBe(201);
    expect(mockPrisma.launchReaction.create).toHaveBeenCalledWith({
      data: { eventId: EVENT_ID, userId: null, emoji: 'rocket', phase: 'liftoff' },
    });
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.anonymous).toBe(true);
  });

  it('rejects with 401 when there is no session and no cookie', async () => {
    noIdentity();
    const res = await reactionPOST(post('reactions', { emoji: 'rocket' }), ctx);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Enable cookies to participate');
    expect(mockPrisma.launchReaction.create).not.toHaveBeenCalled();
  });

  it('rate-limits a second reaction from the same visitor within 2s', async () => {
    anonymousVisitor(V2);
    mockPrisma.launchReaction.create.mockResolvedValue({ id: 'r1' });
    const first = await reactionPOST(post('reactions', { emoji: 'fire' }), ctx);
    expect(first.status).toBe(201);
    const second = await reactionPOST(post('reactions', { emoji: 'fire' }), ctx);
    expect(second.status).toBe(429);
    expect(second.headers.get('Retry-After')).toBeTruthy();
    expect(mockPrisma.launchReaction.create).toHaveBeenCalledTimes(1);
  });

  it('still rejects unknown emoji', async () => {
    anonymousVisitor(V3);
    const res = await reactionPOST(post('reactions', { emoji: 'poop' }), ctx);
    expect(res.status).toBe(400);
  });
});

// ── Polls ────────────────────────────────────────────────────────────────────

describe('POST /api/launch-day/[eventId]/polls/vote', () => {
  const poll = {
    id: 'poll-1',
    eventId: EVENT_ID,
    isActive: true,
    options: ['Go', 'Scrub'],
    votes: {},
  };

  it('upserts on (pollId, voterKey): a second vote from the same sn_vid updates, never inserts', async () => {
    anonymousVisitor(V1);
    mockPrisma.launchPoll.findUnique.mockResolvedValue(poll);
    mockPrisma.launchPollVote.upsert.mockResolvedValue({ id: 'v1' });
    mockPrisma.launchPollVote.groupBy.mockResolvedValue([{ option: 0, _count: { option: 1 } }]);
    mockPrisma.launchPoll.update.mockResolvedValue(poll);

    const r1 = await votePOST(post('polls/vote', { pollId: 'poll-1', optionIndex: 0 }), ctx);
    expect(r1.status).toBe(200);

    // Second vote: the DB now holds the first tally and the row moves to option 1.
    mockPrisma.launchPoll.findUnique.mockResolvedValue({ ...poll, votes: { '0': 1 } });
    mockPrisma.launchPollVote.groupBy.mockResolvedValue([{ option: 1, _count: { option: 1 } }]);
    const r2 = await votePOST(post('polls/vote', { pollId: 'poll-1', optionIndex: 1 }), ctx);
    expect(r2.status).toBe(200);

    expect(mockPrisma.launchPollVote.upsert).toHaveBeenCalledTimes(2);
    for (const call of mockPrisma.launchPollVote.upsert.mock.calls) {
      expect(call[0].where).toEqual({
        pollId_voterKey: { pollId: 'poll-1', voterKey: `anon:${V1}` },
      });
      expect(call[0].create.userId).toBeNull();
      expect(call[0].create.voterKey).toBe(`anon:${V1}`);
    }
    expect(mockPrisma.launchPollVote.upsert.mock.calls[1][0].update.option).toBe(1);
    expect((mockPrisma.launchPollVote as any).create).toBeUndefined();

    // Tally is recomputed from the rows: the moved vote is not double-counted.
    const json = await r2.json();
    expect(json.data.votes).toEqual({ '0': 0, '1': 1 });
  });

  it('writes the user id for signed-in voters', async () => {
    signedIn('user-7');
    mockPrisma.launchPoll.findUnique.mockResolvedValue(poll);
    mockPrisma.launchPollVote.upsert.mockResolvedValue({ id: 'v1' });
    mockPrisma.launchPollVote.groupBy.mockResolvedValue([{ option: 0, _count: { option: 1 } }]);
    mockPrisma.launchPoll.update.mockResolvedValue(poll);

    const res = await votePOST(post('polls/vote', { pollId: 'poll-1', optionIndex: 0 }), ctx);
    expect(res.status).toBe(200);
    expect(mockPrisma.launchPollVote.upsert.mock.calls[0][0].where).toEqual({
      pollId_voterKey: { pollId: 'poll-1', voterKey: 'user-7' },
    });
    expect(mockPrisma.launchPollVote.upsert.mock.calls[0][0].create.userId).toBe('user-7');
  });

  it('keeps option-index validation', async () => {
    anonymousVisitor(V2);
    mockPrisma.launchPoll.findUnique.mockResolvedValue(poll);
    const res = await votePOST(post('polls/vote', { pollId: 'poll-1', optionIndex: 5 }), ctx);
    expect(res.status).toBe(400);
    expect(mockPrisma.launchPollVote.upsert).not.toHaveBeenCalled();
  });

  it('returns 401 without identity', async () => {
    noIdentity();
    const res = await votePOST(post('polls/vote', { pollId: 'poll-1', optionIndex: 0 }), ctx);
    expect(res.status).toBe(401);
  });
});

// ── Chat ─────────────────────────────────────────────────────────────────────

describe('POST /api/launch-day/[eventId]/chat', () => {
  beforeEach(() => {
    mockPrisma.spaceEvent.findUnique.mockResolvedValue({ id: EVENT_ID });
    mockPrisma.launchChatMessage.create.mockImplementation(async ({ data }: any) => ({
      id: 'm1',
      userName: data.userName,
      message: data.message,
      type: 'chat',
      createdAt: new Date('2026-09-01T00:00:00Z'),
      userId: data.userId,
    }));
  });

  it('rejects an anonymous message containing a URL → 400', async () => {
    anonymousVisitor(V1);
    const res = await chatPOST(post('chat', { message: 'go to https://evil.example/now' }), ctx);
    expect(res.status).toBe(400);
    expect(mockPrisma.launchChatMessage.create).not.toHaveBeenCalled();
  });

  it('lets a signed-in user post a URL → 201', async () => {
    signedIn('user-1');
    const res = await chatPOST(post('chat', { message: 'stream: https://youtube.com/x' }), ctx);
    expect(res.status).toBe(201);
    expect(mockPrisma.launchChatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1', userName: 'Jay' }),
      })
    );
  });

  it('posts anonymous messages under the Observer handle with userId null', async () => {
    anonymousVisitor(V2);
    const res = await chatPOST(post('chat', { message: 'Godspeed <b>crew</b>!' }), ctx);
    expect(res.status).toBe(201);
    const call = mockPrisma.launchChatMessage.create.mock.calls[0][0];
    expect(call.data.userId).toBeNull();
    expect(call.data.userName).toBe(anonymousHandle(V2));
    // HTML stripped via the schema
    expect(call.data.message).toBe('Godspeed crew!');
    const json = await res.json();
    expect(json.data.anonymous).toBe(true);
    expect(json.data.userName).toBe(anonymousHandle(V2));
  });

  it('rejects a message that is empty after HTML stripping', async () => {
    anonymousVisitor(V3);
    const res = await chatPOST(post('chat', { message: '<img src=x>' }), ctx);
    expect(res.status).toBe(400);
  });

  it('applies the 1 message / 5s limiter per visitor', async () => {
    anonymousVisitor(V4);
    const first = await chatPOST(post('chat', { message: 'one' }), ctx);
    expect(first.status).toBe(201);
    const second = await chatPOST(post('chat', { message: 'two' }), ctx);
    expect(second.status).toBe(429);
  });

  it('returns 401 without identity', async () => {
    noIdentity();
    const res = await chatPOST(post('chat', { message: 'hi' }), ctx);
    expect(res.status).toBe(401);
    expect((await res.json()).error.message).toBe('Enable cookies to participate');
  });
});

// ── Limiter ──────────────────────────────────────────────────────────────────

describe('BoundedRateLimiter', () => {
  it('enforces the min gap and the window cap, and bounds its key count', () => {
    const l = new BoundedRateLimiter({ minGapMs: 5000, max: 3, windowMs: 60_000 }, 2);
    let t = 0;
    expect(l.hit('a', t)).toBeNull();
    expect(l.hit('a', (t += 1000))).toBe(4); // too soon
    expect(l.hit('a', (t += 5000))).toBeNull();
    expect(l.hit('a', (t += 5000))).toBeNull(); // 3rd in window
    expect(l.hit('a', (t += 5000))).toBeGreaterThan(0); // window cap
    // Bounded: adding c evicts the oldest key (a), so a is fresh again.
    expect(l.hit('b', t)).toBeNull();
    expect(l.hit('c', t)).toBeNull();
    expect(l.hit('a', t)).toBeNull();
  });
});
