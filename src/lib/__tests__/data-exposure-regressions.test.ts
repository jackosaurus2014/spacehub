/**
 * @jest-environment node
 */

/**
 * Data-exposure regression tests — docs/SECURITY_AUDIT_2026-08.md P7, P8, P9.
 *
 *  P7. Deal rooms: viewer-role members used to receive the room's master
 *      `accessCode` (letting them re-issue invites) and the full `documents`
 *      array with no NDA check, while documents/route.ts gated the same data
 *      behind `ndaRequired && !ndaAcceptedAt`.
 *  P8. Non-members reading a public corporate channel got every member's
 *      email; study-group rosters were public regardless of `isPrivate`.
 *  P9. `company-profiles/recalculate` was an unauthenticated GET that wrote;
 *      sponsor view counters accepted unlimited anonymous increments;
 *      session-question upvotes had no per-user record.
 *
 * These tests fail if any of those fixes is reverted.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    dealRoom: { findUnique: jest.fn() },
    dealRoomMember: { findFirst: jest.fn(), update: jest.fn() },
    dealRoomDocument: { findMany: jest.fn() },
    corporateChannel: { findUnique: jest.fn() },
    channelMembership: { findUnique: jest.fn(), findMany: jest.fn() },
    channelMessage: { findMany: jest.fn() },
    companyProfile: { findUnique: jest.fn(), update: jest.fn() },
    user: { findMany: jest.fn() },
    studyGroup: { findUnique: jest.fn() },
    groupMembership: { findUnique: jest.fn(), findMany: jest.fn() },
    sessionQuestion: { findFirst: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
// Imported by the recalculate route; stubbed so the module loads without a DB.
jest.mock('@/lib/company-completeness', () => ({
  calculateCompleteness: jest.fn(() => 0),
  calculateCompletenessBreakdown: jest.fn(() => ({ total: 0 })),
  COMPLETENESS_COUNT_SELECT: {},
  COMPLETENESS_SCALAR_SELECT: {},
}));
jest.mock('@/lib/satellite-signal', () => ({
  satelliteAssetSignalAvailable: jest.fn(async () => false),
}));

import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';

const db = prisma as unknown as Record<string, Record<string, jest.Mock>>;
const mockSession = getServerSession as jest.Mock;

/**
 * Honour a Prisma-style `select` on a fixture row, so a route that asks for
 * fewer fields actually gets fewer fields — the mock must not hand back
 * columns the query never requested, or the "no email anywhere" assertions
 * would be testing the fixture rather than the route.
 */
function applySelect<T extends Record<string, unknown>>(
  row: T,
  select: Record<string, unknown> | undefined
): Partial<T> {
  if (!select) return row;
  const out: Partial<T> = {};
  for (const key of Object.keys(select) as Array<keyof T>) {
    if (select[key as string] && key in row) out[key] = row[key];
  }
  return out;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// P7. Deal room [id] GET
// ─────────────────────────────────────────────────────────────────────────────

describe('P7: deal-room [id] GET', () => {
  const ROOM = {
    id: 'room_1',
    name: 'Series B data room',
    description: null,
    companySlug: 'orbital-foundry',
    status: 'active',
    createdBy: 'owner@example.com',
    createdByUserId: 'u_owner',
    accessCode: 'deadbeefcafe',
    ndaRequired: true,
    ndaText: 'Keep it secret.',
    createdAt: new Date('2026-08-01'),
    updatedAt: new Date('2026-08-01'),
    members: [],
    activities: [],
    _count: { documents: 3, members: 2, activities: 5 },
  };

  function arrange(role: 'viewer' | 'owner', ndaAcceptedAt: Date | null) {
    mockSession.mockResolvedValue({ user: { email: 'member@example.com', id: 'u_member' } });
    db.dealRoomMember.findFirst.mockResolvedValue({
      id: 'dm_1',
      dealRoomId: 'room_1',
      email: 'member@example.com',
      role,
      ndaAcceptedAt,
    });
    db.dealRoom.findUnique.mockImplementation(async (args: { select?: Record<string, unknown> }) =>
      applySelect(ROOM, args.select)
    );
    db.dealRoomDocument.findMany.mockResolvedValue([{ id: 'doc_1', name: 'deck.pdf' }]);
    db.dealRoomMember.update.mockResolvedValue({});
  }

  async function get() {
    const { GET } = await import('@/app/api/deal-rooms/[id]/route');
    const res = await GET(
      new Request('http://localhost:3000/api/deal-rooms/room_1') as never,
      { params: { id: 'room_1' } }
    );
    return { status: res.status, body: await res.json() };
  }

  it('omits accessCode and hides documents for a viewer who has not signed the NDA', async () => {
    arrange('viewer', null);
    const { status, body } = await get();

    expect(status).toBe(200);
    expect(body.room).not.toHaveProperty('accessCode');
    expect(JSON.stringify(body)).not.toContain('deadbeefcafe');

    // NDA gate mirrors documents/route.ts, with flags so the UI can prompt.
    expect(body.room.documents).toEqual([]);
    expect(body.ndaRequired).toBe(true);
    expect(body.ndaAccepted).toBe(false);
    expect(db.dealRoomDocument.findMany).not.toHaveBeenCalled();

    // The query itself must not ask for the code — not merely strip it after.
    const select = db.dealRoom.findUnique.mock.calls[0][0].select;
    expect(select.accessCode).toBe(false);
    expect(select).not.toHaveProperty('documents');

    // Fields the deal-room UI reads are all still present.
    for (const field of ['id', 'name', 'status', 'ndaRequired', 'ndaText', 'companySlug', 'createdAt', '_count', 'members', 'activities']) {
      expect(body.room).toHaveProperty(field);
    }
    expect(body.myRole).toBe('viewer');
  });

  it('still returns accessCode and documents to an owner who has accepted the NDA', async () => {
    arrange('owner', new Date('2026-08-02'));
    const { status, body } = await get();

    expect(status).toBe(200);
    expect(body.room.accessCode).toBe('deadbeefcafe');
    expect(body.room.documents).toHaveLength(1);
    expect(body.ndaAccepted).toBe(true);
  });

  it('refuses non-members before touching the room', async () => {
    mockSession.mockResolvedValue({ user: { email: 'stranger@example.com' } });
    db.dealRoomMember.findFirst.mockResolvedValue(null);
    const { status } = await get();
    expect(status).toBe(403);
    expect(db.dealRoom.findUnique).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P8. Public channel GET contains no email; study-group roster is gated
// ─────────────────────────────────────────────────────────────────────────────

describe('P8: teams channel [id] GET', () => {
  it('returns no email anywhere in the payload to a non-member of a public channel', async () => {
    mockSession.mockResolvedValue({ user: { id: 'u_outsider' } });
    db.corporateChannel.findUnique.mockResolvedValue({
      id: 'ch_1',
      companyId: 'co_1',
      name: 'general',
      visibility: 'public',
    });
    db.channelMembership.findUnique.mockResolvedValue(null);
    db.channelMessage.findMany.mockResolvedValue([
      { id: 'm_1', channelId: 'ch_1', authorId: 'u_1', body: 'hello', createdAt: new Date() },
    ]);
    db.channelMembership.findMany.mockResolvedValue([
      { id: 'cm_1', channelId: 'ch_1', userId: 'u_1', role: 'owner', joinedAt: new Date() },
      { id: 'cm_2', channelId: 'ch_1', userId: 'u_2', role: 'member', joinedAt: new Date() },
    ]);
    db.companyProfile.findUnique.mockResolvedValue({ id: 'co_1', slug: 'co', name: 'Co', logoUrl: null });
    const USERS = [
      { id: 'u_1', name: 'Ada', email: 'ada@example.com', verifiedBadge: 'domain' },
      { id: 'u_2', name: 'Grace', email: 'grace@example.com', verifiedBadge: null },
    ];
    db.user.findMany.mockImplementation(async (args: { select?: Record<string, unknown> }) =>
      USERS.map((u) => applySelect(u, args.select))
    );

    const { GET } = await import('@/app/api/teams/channels/[id]/route');
    const res = await GET(
      new Request('http://localhost:3000/api/teams/channels/ch_1') as never,
      { params: { id: 'ch_1' } }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.members).toHaveLength(2);
    expect(body.data.members[0].user.name).toBe('Ada');
    // No `email` key anywhere — members, message authors, anything.
    expect(JSON.stringify(body)).not.toMatch(/"email"/);
    expect(JSON.stringify(body)).not.toContain('@example.com');
    expect(db.user.findMany.mock.calls[0][0].select).not.toHaveProperty('email');
  });
});

describe('P8: study-group members GET', () => {
  async function get() {
    const { GET } = await import('@/app/api/study-groups/[slug]/members/route');
    return GET(
      new Request('http://localhost:3000/api/study-groups/orbital-mechanics/members') as never,
      { params: { slug: 'orbital-mechanics' } }
    );
  }

  it('requires a session', async () => {
    mockSession.mockResolvedValue(null);
    const res = await get();
    expect(res.status).toBe(401);
    expect(db.studyGroup.findUnique).not.toHaveBeenCalled();
  });

  it('hides a private group roster from non-members', async () => {
    mockSession.mockResolvedValue({ user: { id: 'u_outsider' } });
    db.studyGroup.findUnique.mockResolvedValue({ id: 'g_1', isPrivate: true });
    db.groupMembership.findUnique.mockResolvedValue(null);
    const res = await get();
    expect(res.status).toBe(403);
    expect(db.groupMembership.findMany).not.toHaveBeenCalled();
  });

  it('never returns emails to members', async () => {
    mockSession.mockResolvedValue({ user: { id: 'u_1' } });
    db.studyGroup.findUnique.mockResolvedValue({ id: 'g_1', isPrivate: true });
    db.groupMembership.findUnique.mockResolvedValue({ id: 'gm_1' });
    db.groupMembership.findMany.mockResolvedValue([
      { id: 'gm_1', userId: 'u_1', role: 'host', joinedAt: new Date() },
    ]);
    db.user.findMany.mockImplementation(async (args: { select?: Record<string, unknown> }) =>
      [applySelect({ id: 'u_1', name: 'Ada', email: 'ada@example.com', verifiedBadge: null }, args.select)]
    );
    const res = await get();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.members[0].user).toEqual({ id: 'u_1', name: 'Ada', verifiedBadge: null });
    expect(JSON.stringify(body)).not.toMatch(/"email"/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P9. Unauthenticated writes and metric inflation
// ─────────────────────────────────────────────────────────────────────────────

describe('P9a: company-profiles/recalculate GET', () => {
  const ORIGINAL_ENV = process.env;
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'correct-horse-battery-staple' };
  });
  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('returns 401 without the Bearer secret and does not write', async () => {
    const { GET } = await import('@/app/api/company-profiles/recalculate/route');
    const res = await GET(
      new Request('http://localhost:3000/api/company-profiles/recalculate?slug=spacex', {
        headers: { host: 'localhost:3000' },
      }) as never
    );
    expect(res.status).toBe(401);
    expect(db.companyProfile.findUnique).not.toHaveBeenCalled();
    expect(db.companyProfile.update).not.toHaveBeenCalled();
  });
});

describe('P9b: sponsor analytics POST dedup', () => {
  function post(xff: string, event = 'view') {
    return new Request('http://localhost:3000/api/company-profiles/acme/analytics', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': xff },
      body: JSON.stringify({ event }),
    }) as never;
  }

  it('counts the first view from an IP and acknowledges a repeat with 204 and no write', async () => {
    db.companyProfile.findUnique.mockResolvedValue({
      sponsorTier: 'gold',
      sponsorAnalytics: { views: 10, clicks: 0, leads: 0 },
    });
    db.companyProfile.update.mockResolvedValue({});

    const { POST } = await import('@/app/api/company-profiles/[slug]/analytics/route');
    const params = Promise.resolve({ slug: 'acme' });

    // A client-supplied entry on the left; the proxy-appended real IP on the right.
    const first = await POST(post('1.2.3.4, 203.0.113.7'), { params });
    expect(first.status).toBe(200);
    expect(db.companyProfile.update).toHaveBeenCalledTimes(1);
    expect(db.companyProfile.update.mock.calls[0][0].data.sponsorAnalytics.views).toBe(11);

    const second = await POST(post('1.2.3.4, 203.0.113.7'), { params });
    expect(second.status).toBe(204);
    expect(db.companyProfile.update).toHaveBeenCalledTimes(1);

    // A different real client IP is a new viewer.
    const other = await POST(post('1.2.3.4, 203.0.113.8'), { params });
    expect(other.status).toBe(200);
    expect(db.companyProfile.update).toHaveBeenCalledTimes(2);

    // Spoofing only the left-hand (client-controlled) entry must not reset the window.
    const spoofed = await POST(post('9.9.9.9, 203.0.113.7'), { params });
    expect(spoofed.status).toBe(204);
    expect(db.companyProfile.update).toHaveBeenCalledTimes(2);
  });
});

describe('P9c: session question upvote', () => {
  it('increments once per user per question', async () => {
    mockSession.mockResolvedValue({ user: { id: 'u_voter' } });
    db.sessionQuestion.findFirst.mockResolvedValue({ id: 'q_1', upvotes: 4 });
    db.sessionQuestion.update.mockResolvedValue({ id: 'q_1', upvotes: 5 });

    const { POST } = await import('@/app/api/sessions/[id]/questions/[qid]/upvote/route');
    const req = () => new Request('http://localhost:3000/x', { method: 'POST' }) as never;
    const params = { params: { id: 's_1', qid: 'q_1' } };

    const first = await POST(req(), params);
    expect(first.status).toBe(200);
    expect(db.sessionQuestion.update).toHaveBeenCalledTimes(1);

    const second = await POST(req(), params);
    const body = await second.json();
    expect(second.status).toBe(200);
    expect(body.alreadyUpvoted).toBe(true);
    expect(db.sessionQuestion.update).toHaveBeenCalledTimes(1);
  });
});
