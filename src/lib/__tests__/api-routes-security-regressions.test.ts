/**
 * @jest-environment node
 */

/**
 * Security regression tests — docs/SECURITY_AUDIT_2026-08.md.
 *
 * Two finding classes are guarded here:
 *
 *  A. Unauthenticated economic-resolution crons (finding G1). Three Space
 *     Tycoon "resolve" crons carried a comment claiming they were
 *     "CRON_SECRET-authenticated via middleware.ts's cronPaths". That was
 *     false: cronPaths only *skips the CSRF check* when a valid secret is
 *     presented, it never *requires* one. Each route's POST took no `request`
 *     argument at all, so it could not have checked a header even in
 *     principle — anyone sending a matching `Origin` could settle tenders,
 *     move shares, pay dividends, certify Chair elections, and seal crisis
 *     cycles on demand.
 *
 *  B. Unauthenticated PII disclosure (findings D1-D4). Four public GETs
 *     selected `email: true` on a User join purely to render a display name,
 *     making the registered user base's email addresses harvestable by
 *     walking public listings.
 *
 * These tests fail if either fix is reverted.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    professionalProfile: { findMany: jest.fn(), count: jest.fn() },
    mentorProfile: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    forumCategory: { findUnique: jest.fn() },
    forumThread: { findUnique: jest.fn(), update: jest.fn() },
    skillEndorsement: { findMany: jest.fn(), count: jest.fn() },
    threadVote: { findUnique: jest.fn() },
    threadSubscription: { findUnique: jest.fn() },
    postVote: { findMany: jest.fn() },
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ─────────────────────────────────────────────────────────────────────────────
// A. Cron authentication on the three economic-resolution routes
// ─────────────────────────────────────────────────────────────────────────────

describe('Space Tycoon resolution crons require CRON_SECRET', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'correct-horse-battery-staple' };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  // Each of these settles real economic state. A forged Origin header used to
  // be enough to run them; only a valid Bearer token should be.
  const routes: Array<{ name: string; path: string }> = [
    { name: 'equity/resolve', path: '@/app/api/space-tycoon/equity/resolve/route' },
    { name: 'chair/resolve', path: '@/app/api/space-tycoon/chair/resolve/route' },
    { name: 'crisis/resolve', path: '@/app/api/space-tycoon/crisis/resolve/route' },
  ];

  function request(headers: Record<string, string> = {}) {
    return new Request('http://localhost:3000/api/space-tycoon/resolve', {
      method: 'POST',
      // A same-origin Origin header — this is what defeated the old
      // middleware-only "protection".
      headers: { origin: 'http://localhost:3000', host: 'localhost:3000', ...headers },
    });
  }

  for (const route of routes) {
    describe(route.name, () => {
      it('SECURITY: rejects an anonymous POST with a forged same-origin header', async () => {
        const { POST } = await import(route.path);
        const res = await POST(request());

        expect(res.status).toBe(401);
      });

      it('SECURITY: rejects a POST carrying the wrong bearer token', async () => {
        const { POST } = await import(route.path);
        const res = await POST(request({ authorization: 'Bearer not-the-secret' }));

        expect(res.status).toBe(401);
      });

      it('does not reject a POST carrying the correct bearer token', async () => {
        const { POST } = await import(route.path);
        const res = await POST(
          request({ authorization: 'Bearer correct-horse-battery-staple' })
        );

        // The handler runs (it may then short-circuit on an unprovisioned
        // schema in the test env) — the point is that auth did not reject it.
        expect(res.status).not.toBe(401);
      });
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// B. Public GETs must not disclose user email addresses
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Asserts that a Prisma `select`/`include` argument tree never sets
 * `email: true`. Walking the actual query argument is what makes this a real
 * regression guard: it fails the moment someone re-adds the field, without
 * depending on fixture data flowing all the way through the response.
 */
function assertNoEmailSelected(queryArg: unknown, where: string) {
  const seen = new Set<unknown>();

  function walk(node: unknown, path: string) {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);

    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === 'email' && value === true) {
        throw new Error(
          `${where}: sensitive field "email" is selected at ${path}.email — ` +
            'this endpoint is reachable without a session, so the address ' +
            'would be world-readable.'
        );
      }
      walk(value, `${path}.${key}`);
    }
  }

  walk(queryArg, 'query');
}

describe('public directory GETs do not select user emails', () => {
  let prisma: any;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    prisma = (await import('@/lib/db')).default;
    const { getServerSession } = await import('next-auth');
    // Anonymous caller — exactly the attacker's position.
    (getServerSession as jest.Mock).mockResolvedValue(null);
  });

  it('SECURITY: /api/community/profiles does not select email', async () => {
    prisma.professionalProfile.findMany.mockResolvedValue([]);
    prisma.professionalProfile.count.mockResolvedValue(0);

    const { GET } = await import('@/app/api/community/profiles/route');
    const { NextRequest } = await import('next/server');
    await GET(
      new NextRequest('http://localhost:3000/api/community/profiles?page=1&limit=50')
    );

    expect(prisma.professionalProfile.findMany).toHaveBeenCalled();
    assertNoEmailSelected(
      prisma.professionalProfile.findMany.mock.calls[0][0],
      'GET /api/community/profiles'
    );
  });

  it('SECURITY: /api/mentors does not select email', async () => {
    // A non-empty mentor list is required: the route skips the user lookup
    // entirely when there are no mentors, which would make this assertion
    // pass vacuously.
    prisma.mentorProfile.findMany.mockResolvedValue([
      { id: 'mp-1', userId: 'user-1', acceptingMentees: true },
    ]);
    prisma.mentorProfile.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([
      { id: 'user-1', name: 'Mentor One', verifiedBadge: true },
    ]);

    const { GET } = await import('@/app/api/mentors/route');
    const { NextRequest } = await import('next/server');
    const res = await GET(new NextRequest('http://localhost:3000/api/mentors?limit=50'));

    expect(prisma.user.findMany).toHaveBeenCalled();
    assertNoEmailSelected(
      prisma.user.findMany.mock.calls[0][0],
      'GET /api/mentors'
    );

    // And nothing email-shaped reached the response body.
    expect(JSON.stringify(await res.json())).not.toContain('@');
  });

  it('SECURITY: /api/community/forums/[slug]/[threadId] does not select email', async () => {
    prisma.forumCategory.findUnique.mockResolvedValue({
      id: 'cat-1',
      slug: 'general',
      name: 'General',
    });
    prisma.forumThread.findUnique.mockResolvedValue(null);

    const { GET } = await import('@/app/api/community/forums/[slug]/[threadId]/route');
    const { NextRequest } = await import('next/server');
    await GET(
      new NextRequest('http://localhost:3000/api/community/forums/general/thread-1'),
      { params: Promise.resolve({ slug: 'general', threadId: 'thread-1' }) } as any
    );

    expect(prisma.forumThread.findUnique).toHaveBeenCalled();
    assertNoEmailSelected(
      prisma.forumThread.findUnique.mock.calls[0][0],
      'GET /api/community/forums/[slug]/[threadId]'
    );
  });
});
