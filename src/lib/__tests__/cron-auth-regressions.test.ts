/**
 * @jest-environment node
 */

/**
 * Cron / ingestion authentication regression tests.
 *
 * Seventeen scheduler-invoked POST handlers used to be reachable by anyone
 * who could forge a same-origin `Origin` header:
 *
 *  - Seven ingestion routes (news, blogs, events, solar-flares,
 *    launch-windows, debris-monitor, compliance) performed NO auth check at
 *    all — most did not even accept a `request` argument.
 *  - Nine Space Tycoon economy crons carried hand-rolled checks that were
 *    fail-OPEN: `if (cronSecret && header !== ...)` skipped the check when
 *    CRON_SECRET was unset, several also waived it in development, two read
 *    the secret from the JSON body (`body.secret`, LEAGUE_CRON_SECRET), and
 *    two compared a non-standard `x-cron-secret` header the scheduler never
 *    sends.
 *  - market/init took no request at all.
 *
 * The middleware `cronPaths` list only exempts these paths from the CSRF
 * Origin check; it never authenticated them. Every handler now delegates to
 * `requireCronSecret` (timing-safe, fail-closed), and the two routes with a
 * legitimate admin "refresh now" button accept an admin session as well via
 * `requireCronSecretOrAdmin`.
 *
 * These tests fail if any of that is reverted.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────
// Every handler is imported for real; only the heavy edges are stubbed so the
// auth gate is the first thing that runs. A rejecting Prisma proxy makes any
// DB call inside a handler throw (handlers catch and return non-401), which
// keeps the "correct bearer is NOT rejected" assertions honest without a DB.

jest.mock('@/lib/db', () => {
  const reject = () => Promise.reject(new Error('no database in test'));
  const model: unknown = new Proxy({}, { get: () => reject });
  const client = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === '$transaction' || prop === '$queryRaw' || prop === '$executeRaw') return reject;
        if (prop === 'then') return undefined;
        return model;
      },
    }
  );
  return { __esModule: true, default: client, prisma: client };
});

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/api-cache', () => ({
  apiCache: { set: jest.fn(), get: jest.fn(), getStale: jest.fn(() => null) },
  CacheTTL: { NEWS: 1, DEFAULT: 1, SLOW: 1, VERY_SLOW: 1 },
}));

// External fetchers: never touch the network from a unit test.
jest.mock('@/lib/news-fetcher', () => ({
  fetchSpaceflightNews: jest.fn().mockResolvedValue(0),
  tagRecentArticlesWithCompanies: jest.fn().mockResolvedValue(0),
}));
jest.mock('@/lib/blogs-fetcher', () => ({
  initializeBlogSources: jest.fn().mockResolvedValue(0),
  fetchBlogPosts: jest.fn().mockResolvedValue(0),
}));
jest.mock('@/lib/events-fetcher', () => ({
  fetchLaunchLibraryEvents: jest.fn().mockResolvedValue(0),
}));
jest.mock('@/lib/solar-flare-data', () => ({
  fetchNasaDonkiSolarFlares: jest.fn().mockResolvedValue([]),
  fetchNoaaXrayFlares: jest.fn().mockResolvedValue([]),
  fetchNoaaPlanetaryKIndex: jest.fn().mockResolvedValue([]),
  transformNasaDonkiFlare: jest.fn(),
  transformNoaaXrayFlare: jest.fn(),
  mergeSolarFlareData: jest.fn(() => []),
}));
jest.mock('@/lib/launch-windows-data', () => ({
  fetchLaunchLibraryUpcoming: jest.fn().mockResolvedValue([]),
  fetchSpaceXUpcoming: jest.fn().mockResolvedValue([]),
  mergeLaunchData: jest.fn(() => []),
  upsertLaunchEvents: jest.fn().mockResolvedValue({ created: 0, updated: 0 }),
}));
jest.mock('@/lib/debris-data', () => ({
  fetchCelesTrakGPData: jest.fn().mockResolvedValue([]),
  parseSatelliteCounts: jest.fn(() => 0),
  calculateOrbitalStatistics: jest.fn(() => ({ leo: 0, meo: 0, geo: 0 })),
  fetchSatcat: jest.fn().mockResolvedValue([]),
  computeCatalogStats: jest.fn(() => ({ totalTracked: 0, totalDebris: 0 })),
  updateDebrisStatsFromSatcat: jest.fn().mockResolvedValue(false),
  refreshDebrisObjectsFromSatcat: jest.fn().mockResolvedValue({ updated: 0, decayed: 0 }),
}));
jest.mock('@/lib/regulatory-hub-data', () => ({
  fetchFederalRegisterUpdates: jest.fn().mockResolvedValue({ success: true, documents: [] }),
}));
jest.mock('@/lib/game/market-share', () => ({
  rollupTradeStatsForDay: jest.fn().mockResolvedValue({ days: 0, rows: 0 }),
  resolveMetricCurrentValue: jest.fn(() => 0),
}));

const SECRET = 'correct-horse-battery-staple';

type Route = { name: string; path: string; adminOk?: boolean };

const ROUTES: Route[] = [
  // Ingestion (previously no auth at all)
  { name: 'news/fetch', path: '@/app/api/news/fetch/route', adminOk: true },
  { name: 'blogs/fetch', path: '@/app/api/blogs/fetch/route', adminOk: true },
  { name: 'events/fetch', path: '@/app/api/events/fetch/route' },
  { name: 'solar-flares/fetch', path: '@/app/api/solar-flares/fetch/route' },
  { name: 'launch-windows/fetch', path: '@/app/api/launch-windows/fetch/route' },
  { name: 'debris-monitor/fetch', path: '@/app/api/debris-monitor/fetch/route' },
  { name: 'compliance/fetch', path: '@/app/api/compliance/fetch/route' },
  // Space Tycoon economy crons (previously fail-open)
  { name: 'space-tycoon/market/restock', path: '@/app/api/space-tycoon/market/restock/route' },
  { name: 'space-tycoon/market/mean-revert', path: '@/app/api/space-tycoon/market/mean-revert/route' },
  { name: 'space-tycoon/demand-pools/update', path: '@/app/api/space-tycoon/demand-pools/update/route' },
  { name: 'space-tycoon/labor/update', path: '@/app/api/space-tycoon/labor/update/route' },
  { name: 'space-tycoon/zones/update', path: '@/app/api/space-tycoon/zones/update/route' },
  { name: 'space-tycoon/bidding/resolve', path: '@/app/api/space-tycoon/bidding/resolve/route' },
  { name: 'space-tycoon/orbital-slots/resolve', path: '@/app/api/space-tycoon/orbital-slots/resolve/route' },
  { name: 'space-tycoon/leagues/process-week', path: '@/app/api/space-tycoon/leagues/process-week/route' },
  { name: 'space-tycoon/market/share/rollup', path: '@/app/api/space-tycoon/market/share/rollup/route' },
  { name: 'space-tycoon/market/init', path: '@/app/api/space-tycoon/market/init/route' },
];

function makeRequest(name: string, headers: Record<string, string> = {}, body?: unknown) {
  const { NextRequest } = jest.requireActual('next/server') as typeof import('next/server');
  return new NextRequest(`http://localhost:3000/api/${name}`, {
    method: 'POST',
    // A same-origin Origin header — this is exactly what defeated the old
    // middleware-only "protection", and a loopback Host so the pre-fix
    // no-secret/localhost allowance would also have passed.
    headers: {
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body ?? {}),
  });
}

describe('scheduler-invoked routes require CRON_SECRET', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: SECRET };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  for (const route of ROUTES) {
    describe(route.name, () => {
      beforeEach(async () => {
        // Anonymous caller — exactly the attacker's position.
        const { getServerSession } = await import('next-auth');
        (getServerSession as jest.Mock).mockResolvedValue(null);
      });

      it('SECURITY: rejects an anonymous POST with a forged same-origin Origin header', async () => {
        const { POST } = await import(route.path);
        const res = await POST(makeRequest(route.name));
        expect(res.status).toBe(401);
      });

      it('SECURITY: rejects the wrong bearer token', async () => {
        const { POST } = await import(route.path);
        const res = await POST(makeRequest(route.name, { authorization: 'Bearer not-the-secret' }));
        expect(res.status).toBe(401);
      });

      it('SECURITY: ignores a legacy x-cron-secret header', async () => {
        const { POST } = await import(route.path);
        const res = await POST(makeRequest(route.name, { 'x-cron-secret': SECRET }));
        expect(res.status).toBe(401);
      });

      it('SECURITY: ignores a legacy body.secret field', async () => {
        const { POST } = await import(route.path);
        const res = await POST(makeRequest(route.name, {}, { secret: SECRET }));
        expect(res.status).toBe(401);
      });

      it('SECURITY: rejects an anonymous POST even when CRON_SECRET is unset in production', async () => {
        delete process.env.CRON_SECRET;
        (process.env as Record<string, string>).NODE_ENV = 'production';
        const { POST } = await import(route.path);
        const res = await POST(makeRequest(route.name));
        expect(res.status).toBe(401);
      });

      it('does not reject a POST carrying the correct bearer token', async () => {
        const { POST } = await import(route.path);
        const res = await POST(makeRequest(route.name, { authorization: `Bearer ${SECRET}` }));
        // The handler runs (and may then short-circuit on the absent DB) —
        // the point is that auth did not reject it.
        expect(res.status).not.toBe(401);
      });

      if (route.adminOk) {
        it('accepts an admin session without a bearer token (manual refresh button)', async () => {
          const { getServerSession } = await import('next-auth');
          (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', isAdmin: true } });
          const { POST } = await import(route.path);
          const res = await POST(makeRequest(route.name));
          expect(res.status).not.toBe(401);
        });

        it('SECURITY: rejects a signed-in NON-admin session', async () => {
          const { getServerSession } = await import('next-auth');
          (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', isAdmin: false } });
          const { POST } = await import(route.path);
          const res = await POST(makeRequest(route.name));
          expect(res.status).toBe(401);
        });
      } else {
        it('SECURITY: an admin session alone is NOT sufficient (cron-only route)', async () => {
          const { getServerSession } = await import('next-auth');
          (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', isAdmin: true } });
          const { POST } = await import(route.path);
          const res = await POST(makeRequest(route.name));
          expect(res.status).toBe(401);
        });
      }
    });
  }
});

describe('requireCronSecret with no CRON_SECRET configured', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.CRON_SECRET;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  function loopback(headers: Record<string, string> = {}) {
    return new Request('http://localhost:3000/api/cron/anything', {
      method: 'POST',
      headers: { host: 'localhost', ...headers },
    });
  }

  it('SECURITY: in production rejects Host: localhost (Host is attacker-controlled)', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const { requireCronSecret } = await import('@/lib/errors');
    const res = requireCronSecret(loopback());
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it('SECURITY: in production rejects Host: 127.0.0.1 too', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'production';
    const { requireCronSecret } = await import('@/lib/errors');
    const res = requireCronSecret(loopback({ host: '127.0.0.1:3000' }));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it('outside production still allows the loopback scheduler (dev convenience)', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'development';
    const { requireCronSecret } = await import('@/lib/errors');
    expect(requireCronSecret(loopback())).toBeNull();
  });

  it('outside production still rejects a non-loopback Host', async () => {
    (process.env as Record<string, string>).NODE_ENV = 'development';
    const { requireCronSecret } = await import('@/lib/errors');
    const res = requireCronSecret(loopback({ host: 'spacenexus.us' }));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });
});

describe('requireCronSecretOrAdmin', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: SECRET };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  const anon = () =>
    new Request('http://localhost:3000/api/news/fetch', {
      method: 'POST',
      headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
    });

  it('passes on a valid bearer without consulting the session', async () => {
    const { getServerSession } = await import('next-auth');
    const { requireCronSecretOrAdmin } = await import('@/lib/api-auth');
    const req = new Request('http://localhost:3000/api/news/fetch', {
      method: 'POST',
      headers: { authorization: `Bearer ${SECRET}` },
    });
    expect(await requireCronSecretOrAdmin(req)).toBeNull();
    expect(getServerSession).not.toHaveBeenCalled();
  });

  it('passes on an admin session', async () => {
    const { getServerSession } = await import('next-auth');
    (getServerSession as jest.Mock).mockResolvedValue({ user: { isAdmin: true } });
    const { requireCronSecretOrAdmin } = await import('@/lib/api-auth');
    expect(await requireCronSecretOrAdmin(anon())).toBeNull();
  });

  it('SECURITY: rejects a non-admin session and an anonymous caller', async () => {
    const { getServerSession } = await import('next-auth');
    const { requireCronSecretOrAdmin } = await import('@/lib/api-auth');

    (getServerSession as jest.Mock).mockResolvedValue({ user: { isAdmin: false } });
    expect((await requireCronSecretOrAdmin(anon()))?.status).toBe(401);

    (getServerSession as jest.Mock).mockResolvedValue(null);
    expect((await requireCronSecretOrAdmin(anon()))?.status).toBe(401);
  });

  it('SECURITY: a throwing session lookup does not widen access', async () => {
    const { getServerSession } = await import('next-auth');
    (getServerSession as jest.Mock).mockRejectedValue(new Error('jwt decode failed'));
    const { requireCronSecretOrAdmin } = await import('@/lib/api-auth');
    expect((await requireCronSecretOrAdmin(anon()))?.status).toBe(401);
  });
});
