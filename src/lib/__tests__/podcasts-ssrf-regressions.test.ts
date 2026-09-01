/**
 * @jest-environment node
 */

/**
 * Stored-SSRF regression tests for the podcast directory.
 *
 * Attack that is being guarded against: anyone could POST /api/podcasts with
 * feedUrl = http://169.254.169.254/... or http://127.0.0.1:3000/api/..., and
 * the podcasts-sync cron would later fetch that URL server-side (rss-parser
 * parseURL, which follows redirects) and publish the parsed body as episodes.
 *
 * Three layers now block this and each is pinned here:
 *   1. POST /api/podcasts requires an admin session or CRON_SECRET.
 *   2. createPodcastSchema rejects localhost / private-IP-literal URLs.
 *   3. syncPodcastFeed fetches through safeFetchText, which validates the URL
 *      (and its DNS answers, and every redirect) before connecting.
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    podcast: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    podcastEpisode: { upsert: jest.fn(), count: jest.fn() },
  },
}));

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('dns', () => ({ promises: { lookup: jest.fn() } }));

const ORIGINAL_ENV = process.env;

function podcastRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost:3000/api/podcasts', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      // Same-origin Origin header — passes the middleware CSRF check, which is
      // all an anonymous attacker needed before the fix.
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  name: 'Example Space Podcast',
  feedUrl: 'https://feeds.example.com/space.xml',
  category: 'industry',
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. POST /api/podcasts authentication
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/podcasts requires admin or cron secret', () => {
  let prisma: any;
  let getServerSession: jest.Mock;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'correct-horse-battery-staple' };
    prisma = (await import('@/lib/db')).default;
    getServerSession = (await import('next-auth')).getServerSession as jest.Mock;
    getServerSession.mockResolvedValue(null);
    prisma.podcast.findUnique.mockResolvedValue(null);
    prisma.podcast.create.mockResolvedValue({
      id: 'pod-1',
      slug: 'example-space-podcast',
      name: VALID_BODY.name,
      category: 'industry',
    });
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('SECURITY: rejects an anonymous POST with a forged same-origin header (401)', async () => {
    const { POST } = await import('@/app/api/podcasts/route');
    const res = await POST(podcastRequest(VALID_BODY) as any);

    expect(res.status).toBe(401);
    expect(prisma.podcast.create).not.toHaveBeenCalled();
  });

  it('SECURITY: rejects a signed-in non-admin user (401)', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'user-1', isAdmin: false } });
    const { POST } = await import('@/app/api/podcasts/route');
    const res = await POST(podcastRequest(VALID_BODY) as any);

    expect(res.status).toBe(401);
    expect(prisma.podcast.create).not.toHaveBeenCalled();
  });

  it('SECURITY: rejects a wrong bearer token (401)', async () => {
    const { POST } = await import('@/app/api/podcasts/route');
    const res = await POST(
      podcastRequest(VALID_BODY, { authorization: 'Bearer not-the-secret' }) as any,
    );

    expect(res.status).toBe(401);
    expect(prisma.podcast.create).not.toHaveBeenCalled();
  });

  it('accepts an admin session (201)', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'admin-1', isAdmin: true } });
    const { POST } = await import('@/app/api/podcasts/route');
    const res = await POST(podcastRequest(VALID_BODY) as any);

    expect(res.status).toBe(201);
    expect(prisma.podcast.create).toHaveBeenCalledTimes(1);
  });

  it('accepts the correct CRON_SECRET bearer token (201)', async () => {
    const { POST } = await import('@/app/api/podcasts/route');
    const res = await POST(
      podcastRequest(VALID_BODY, { authorization: 'Bearer correct-horse-battery-staple' }) as any,
    );

    expect(res.status).toBe(201);
    expect(prisma.podcast.create).toHaveBeenCalledTimes(1);
  });

  // ── 2. Schema-level URL policy (even an admin cannot plant a private URL) ──

  const badUrls = [
    'http://169.254.169.254/latest/meta-data/',
    'http://127.0.0.1:3000/api/admin/seed-all',
    'http://127.0.0.1/feed.xml',
    'http://localhost/feed.xml',
    'http://[::1]/feed.xml',
    'http://10.0.0.5/feed.xml',
    'http://metadata.internal/computeMetadata/v1/',
    'http://user:pw@feeds.example.com/feed.xml',
    'http://feeds.example.com:8080/feed.xml',
  ];

  for (const field of ['feedUrl', 'websiteUrl', 'artworkUrl'] as const) {
    it.each(badUrls)(`SECURITY: rejects ${field} = %s with 400 even for an admin`, async (url) => {
      getServerSession.mockResolvedValue({ user: { id: 'admin-1', isAdmin: true } });
      const { POST } = await import('@/app/api/podcasts/route');
      const res = await POST(podcastRequest({ ...VALID_BODY, [field]: url }) as any);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(JSON.stringify(json)).toMatch(new RegExp(field));
      expect(prisma.podcast.create).not.toHaveBeenCalled();
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. syncPodcastFeed never fetches a private feedUrl already in the DB
// ─────────────────────────────────────────────────────────────────────────────

describe('syncPodcastFeed refuses private feed URLs already stored in the DB', () => {
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;
  let prisma: any;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    prisma = (await import('@/lib/db')).default;
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  it.each([
    'http://169.254.169.254/latest/meta-data/',
    'http://127.0.0.1:3000/api/admin/seed-all',
    'http://[::1]/feed.xml',
  ])('SECURITY: %s → success:false and no network call', async (feedUrl) => {
    const { syncPodcastFeed } = await import('@/lib/podcast-sync');
    const result = await syncPodcastFeed({ id: 'pod-1', slug: 'evil', name: 'Evil', feedUrl });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Failed to fetch RSS feed/);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prisma.podcastEpisode.upsert).not.toHaveBeenCalled();
    expect(prisma.podcast.update).not.toHaveBeenCalled();
  });

  it('SECURITY: a public hostname that resolves to a private IP is refused', async () => {
    const dns = await import('dns');
    (dns.promises.lookup as unknown as jest.Mock).mockResolvedValue([
      { address: '10.0.0.5', family: 4 },
    ]);

    const { syncPodcastFeed } = await import('@/lib/podcast-sync');
    const result = await syncPodcastFeed({
      id: 'pod-1',
      slug: 'rebind',
      name: 'Rebind',
      feedUrl: 'https://rebind.example.com/feed.xml',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/non-public address/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('parses a public feed via safeFetchText + parseString and upserts episodes', async () => {
    const dns = await import('dns');
    (dns.promises.lookup as unknown as jest.Mock).mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
    ]);
    fetchMock.mockResolvedValue(
      new Response(
        `<?xml version="1.0"?><rss version="2.0"><channel><title>Show</title>
          <item><title>Ep 1</title><guid>ep-1</guid><pubDate>Mon, 01 Sep 2026 00:00:00 GMT</pubDate>
            <enclosure url="https://cdn.example.com/ep1.mp3" type="audio/mpeg"/></item>
        </channel></rss>`,
        { status: 200, headers: { 'content-type': 'application/rss+xml' } },
      ),
    );
    prisma.podcastEpisode.upsert.mockResolvedValue({});
    prisma.podcastEpisode.count.mockResolvedValue(1);
    prisma.podcast.update.mockResolvedValue({});

    const { syncPodcastFeed } = await import('@/lib/podcast-sync');
    const result = await syncPodcastFeed({
      id: 'pod-1',
      slug: 'show',
      name: 'Show',
      feedUrl: 'https://feeds.example.com/feed.xml',
    });

    expect(result.success).toBe(true);
    expect(result.upserted).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].redirect).toBe('manual');
    expect(prisma.podcastEpisode.upsert).toHaveBeenCalledTimes(1);
  });
});
