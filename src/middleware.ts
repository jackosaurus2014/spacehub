import { NextRequest, NextResponse } from 'next/server';
import { resolveMothball } from '@/lib/mothballed-routes';
import { registryRouteMissing } from '@/lib/registry-routes';
import { CSP_REPORT_PATH, REPORTING_ENDPOINTS_HEADER, documentCspHeaders } from '@/lib/csp';

/**
 * Edge Runtime compatible rate limiter and CSRF protection middleware
 */

// In-memory sliding-window rate limiter store
// Key: `${ip}:${route}` -> array of timestamps
// NOTE: This store is per-instance. On Railway single-instance deployments this
// is sufficient. If scaling to multiple instances, replace with Redis-backed
// rate limiting to share state across instances.
const rateLimitStore = new Map<string, number[]>();

// Cleanup interval tracker
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Rate limit configurations
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

function getRateLimitConfig(pathname: string, method: string): RateLimitConfig {
  // Security hardening 2026-09-01 (docs/SECURITY_AUDIT_2026-09.md H2): the
  // credentials sign-in callback previously fell into the generic 200/min
  // bucket — 200 password guesses a minute per IP. 10 per 15 minutes here,
  // plus a per-email lockout inside authorize() in src/lib/auth.ts.
  if (pathname.startsWith('/api/auth/callback/credentials')) {
    return { maxRequests: 10, windowMs: 15 * 60 * 1000 };
  }
  // No-account double-opt-in subscriptions (M4): each POST re-sends a
  // confirmation email to an arbitrary address. Same budget as newsletter.
  if (
    method === 'POST' &&
    (pathname === '/api/launch-watch' || pathname === '/api/company-brief')
  ) {
    return { maxRequests: 8, windowMs: 60 * 60 * 1000 };
  }
  // Browser CSP violation reports: unauthenticated by nature, so a tight
  // per-IP budget bounds log volume (the route also dedupes in-process).
  if (pathname === CSP_REPORT_PATH) {
    return { maxRequests: 20, windowMs: 60 * 1000 };
  }
  // Ad impression/click beacons (C1): signed single-use tokens gate the
  // charge; this bucket bounds the row-write rate.
  if (pathname.startsWith('/api/ads/impression')) {
    return { maxRequests: 30, windowMs: 60 * 1000 };
  }
  // Stripe session creation — Stripe-side cost and rate-limit exposure.
  if (
    pathname.startsWith('/api/stripe/checkout') ||
    pathname.startsWith('/api/ads/checkout') ||
    pathname.startsWith('/api/subscription')
  ) {
    return { maxRequests: 10, windowMs: 60 * 1000 };
  }
  // Public compliance Q&A submissions store an optional asker email.
  if (method === 'POST' && pathname.startsWith('/api/compliance/questions')) {
    return { maxRequests: 5, windowMs: 60 * 60 * 1000 };
  }
  if (pathname.startsWith('/api/auth/register')) {
    return { maxRequests: 10, windowMs: 60 * 60 * 1000 }; // 10 req/hour
  }
  if (pathname.startsWith('/api/auth/resend-verification')) {
    return { maxRequests: 3, windowMs: 60 * 60 * 1000 }; // 3 req/hour
  }
  if (pathname.startsWith('/api/newsletter')) {
    return { maxRequests: 5, windowMs: 60 * 60 * 1000 }; // 5 req/hour
  }
  if (pathname.startsWith('/api/auth/forgot-password')) {
    return { maxRequests: 5, windowMs: 60 * 60 * 1000 }; // 5 req/hour
  }
  if (pathname.startsWith('/api/auth/reset-password')) {
    return { maxRequests: 5, windowMs: 60 * 60 * 1000 }; // 5 req/hour
  }
  if (pathname.startsWith('/api/auth/verify-email')) {
    return { maxRequests: 10, windowMs: 60 * 60 * 1000 }; // 10 req/hour
  }
  // Contact form rate limit
  if (pathname.startsWith('/api/contact')) {
    return { maxRequests: 5, windowMs: 60 * 60 * 1000 }; // 5 per hour
  }
  // Feedback submissions (NPS widget + /feedback questionnaire)
  if (pathname.startsWith('/api/feedback')) {
    return { maxRequests: 10, windowMs: 60 * 60 * 1000 }; // 10 per hour
  }
  // Community rate limits
  if (pathname.startsWith('/api/community/forums')) {
    return { maxRequests: 20, windowMs: 60 * 60 * 1000 }; // 20 forum actions/hour
  }
  if (pathname.startsWith('/api/community/reports')) {
    return { maxRequests: 10, windowMs: 60 * 60 * 1000 }; // 10 reports/hour
  }
  if (pathname.startsWith('/api/messages')) {
    return { maxRequests: 50, windowMs: 60 * 60 * 1000 }; // 50 messages/hour
  }
  // Company research — expensive AI call
  if (pathname.startsWith('/api/company-research')) {
    return { maxRequests: 10, windowMs: 60 * 60 * 1000 }; // 10 per hour
  }
  // AI-powered endpoints (expensive external API calls)
  if (
    pathname.startsWith('/api/opportunities/moonshots') ||
    pathname.startsWith('/api/opportunities/analyze')
  ) {
    return { maxRequests: 10, windowMs: 60 * 1000 }; // 10 req/minute
  }
  // Blog view tracking — lightweight but frequent
  if (pathname.startsWith('/api/blog/views')) {
    return { maxRequests: 60, windowMs: 60 * 1000 }; // 60 req/minute
  }
  // Stripe webhooks — bypass rate limiting (verified via signature, not IP-based)
  if (pathname.startsWith('/api/stripe/webhooks')) {
    return { maxRequests: 10000, windowMs: 60 * 1000 };
  }
  // Public form submissions — strict rate limits to prevent spam
  if (pathname.includes('/meeting-requests') || pathname.includes('/leads')) {
    return { maxRequests: 5, windowMs: 60 * 60 * 1000 }; // 5 per hour
  }
  // Space Tycoon economic mutations (docs/SECURITY_AUDIT_2026-09.md game
  // exploit batch 2026-09-02, M-7): a per-IP bucket on top of the
  // per-profile limiter in src/lib/game/route-throttle.ts.
  if (
    method !== 'GET' &&
    /^\/api\/space-tycoon\/(market\/orders|market\/trade|bounties|predictions\/stake|equity|colonies|milestones|zones\/challenge|orbital-slots)$/.test(pathname)
  ) {
    return { maxRequests: 60, windowMs: 60 * 1000 };
  }
  // All other /api/* routes
  return { maxRequests: 200, windowMs: 60 * 1000 }; // 200 req/minute
}

/**
 * Get client IP from request headers
 */
function getClientIp(req: NextRequest): string {
  // Railway (and most reverse proxies) appends the real client IP as the
  // rightmost entry in x-forwarded-for. Using the rightmost IP prevents
  // clients from spoofing their IP by injecting a fake x-forwarded-for header.
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim()).filter(Boolean);
    return ips[ips.length - 1] || 'unknown';
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return 'unknown';
}

/**
 * Periodically clean up expired timestamps from the store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return;
  }
  lastCleanup = now;

  // Find the max window we need to consider (1 hour for register/newsletter)
  const maxWindow = 60 * 60 * 1000;
  const cutoff = now - maxWindow;

  const keys = Array.from(rateLimitStore.keys());
  for (const key of keys) {
    const timestamps = rateLimitStore.get(key);
    if (!timestamps) continue;
    const filtered = timestamps.filter((ts) => ts > cutoff);
    if (filtered.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, filtered);
    }
  }
}

/**
 * Check rate limit for a given IP and route
 * Returns { allowed, remaining, retryAfterSeconds }
 */
function checkRateLimit(
  ip: string,
  pathname: string,
  method: string
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const config = getRateLimitConfig(pathname, method);
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Group routes into buckets so sub-paths share a single counter
  // (e.g., /api/auth/register and /api/auth/register/resend share one limit)
  let routeKey: string;
  if (pathname.startsWith('/api/auth/callback/credentials')) {
    routeKey = 'auth-login';
  } else if (method === 'POST' && (pathname === '/api/launch-watch' || pathname === '/api/company-brief')) {
    routeKey = 'no-account-subscribe';
  } else if (pathname.startsWith('/api/ads/impression')) {
    routeKey = 'ads-impression';
  } else if (pathname === CSP_REPORT_PATH) {
    routeKey = 'csp-report';
  } else if (
    pathname.startsWith('/api/stripe/checkout') ||
    pathname.startsWith('/api/ads/checkout') ||
    pathname.startsWith('/api/subscription')
  ) {
    routeKey = 'checkout';
  } else if (method === 'POST' && pathname.startsWith('/api/compliance/questions')) {
    routeKey = 'compliance-questions';
  } else if (pathname.startsWith('/api/auth/resend-verification')) {
    routeKey = 'auth-resend-verification';
  } else if (pathname.startsWith('/api/auth/register')) {
    routeKey = 'auth-register';
  } else if (pathname.startsWith('/api/newsletter')) {
    routeKey = 'newsletter';
  } else if (pathname.startsWith('/api/auth/forgot-password')) {
    routeKey = 'auth-forgot-password';
  } else if (pathname.startsWith('/api/auth/reset-password')) {
    routeKey = 'auth-reset-password';
  } else if (pathname.startsWith('/api/auth/verify-email')) {
    routeKey = 'auth-verify-email';
  } else if (pathname.startsWith('/api/contact')) {
    routeKey = 'contact';
  } else if (pathname.startsWith('/api/feedback')) {
    routeKey = 'feedback';
  } else if (pathname.startsWith('/api/community/forums')) {
    routeKey = 'community-forums';
  } else if (pathname.startsWith('/api/community/reports')) {
    routeKey = 'community-reports';
  } else if (pathname.startsWith('/api/messages')) {
    routeKey = 'messages';
  } else if (pathname.startsWith('/api/company-research')) {
    routeKey = 'company-research';
  } else if (pathname.startsWith('/api/blog/views')) {
    routeKey = 'blog-views';
  } else if (
    pathname.startsWith('/api/opportunities/moonshots') ||
    pathname.startsWith('/api/opportunities/analyze')
  ) {
    routeKey = 'ai-endpoints';
  } else if (
    method !== 'GET' &&
    /^\/api\/space-tycoon\/(market\/orders|market\/trade|bounties|predictions\/stake|equity|colonies|milestones|zones\/challenge|orbital-slots)$/.test(pathname)
  ) {
    routeKey = 'tycoon-economy';
  } else {
    routeKey = 'api-general';
  }

  const key = `${ip}:${routeKey}`;

  // Sliding window: keep only timestamps within the current window,
  // then count them to decide if the request is allowed
  const timestamps = rateLimitStore.get(key) || [];
  const validTimestamps = timestamps.filter((ts) => ts > windowStart);

  if (validTimestamps.length >= config.maxRequests) {
    // Retry-After = when the oldest request in the window expires,
    // opening a slot for a new request
    const oldestInWindow = validTimestamps[0];
    const retryAfterMs = oldestInWindow + config.windowMs - now;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    // Still update the store with filtered timestamps
    rateLimitStore.set(key, validTimestamps);

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    };
  }

  // Add current timestamp
  validTimestamps.push(now);
  rateLimitStore.set(key, validTimestamps);

  return {
    allowed: true,
    remaining: config.maxRequests - validTimestamps.length,
    retryAfterSeconds: 0,
  };
}

/**
 * CSRF protection: verify Origin/Referer for state-changing methods
 * Excludes /api/auth/* routes (handled by NextAuth)
 */
function checkCsrf(req: NextRequest): boolean {
  const method = req.method.toUpperCase();
  const mutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

  if (!mutatingMethods.includes(method)) {
    return true; // GET, HEAD, OPTIONS are safe
  }

  const pathname = req.nextUrl.pathname;

  // Skip CSRF check for /api/auth/* routes (NextAuth handles these)
  if (pathname.startsWith('/api/auth/')) {
    return true;
  }

  // Skip CSRF check for /api/v1/* routes (API key auth, not cookie-based)
  if (pathname.startsWith('/api/v1/')) {
    return true;
  }

  // Skip CSRF check for Stripe webhooks (verified via signature, not cookie-based)
  if (pathname.startsWith('/api/stripe/webhooks')) {
    return true;
  }

  // Skip CSRF check for browser CSP violation reports: the browser POSTs
  // them without a usable Origin/Referer, they carry no credentials, and
  // the handler only logs (never mutates state). Rate-limited above.
  if (pathname === CSP_REPORT_PATH) {
    return true;
  }

  // Skip CSRF check for one-click email unsubscribe (Regulatory Wave C):
  // RFC 8058 List-Unsubscribe-Post requests come from mail-provider servers
  // with no Origin/Referer header. Auth is the per-user unsubscribe token in
  // the URL, not a cookie, so CSRF does not apply (same rationale as the
  // Stripe-webhook exemption above).
  if (pathname.startsWith('/api/regulatory-alerts/unsubscribe')) {
    return true;
  }
  // Same exemption for the newsletter's one-click unsubscribe — pre-existing
  // gap found during Wave C: mail-provider POSTs (no Origin) were CSRF-blocked,
  // breaking RFC 8058 one-click for Gmail/Yahoo. Token-authed like the above.
  if (pathname.startsWith('/api/newsletter/unsubscribe')) {
    return true;
  }

  // Skip CSRF check for cron/internal requests authenticated via valid CRON_SECRET Bearer token
  // Only bypass for known internal paths to prevent arbitrary CSRF bypass with any Bearer token
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const cronSecret = process.env.CRON_SECRET;

    // Only skip CSRF for valid cron secret on known internal paths
    if (cronSecret && token === cronSecret) {
      const cronPaths = [
        '/api/refresh', '/api/newsletter/send-digest', '/api/newsletter/send',
        '/api/newsletter/intelligence-brief', '/api/newsletter/forum-digest',
        '/api/ai-insights/generate', '/api/refresh/cleanup',
        '/api/admin/seed-all', '/api/admin/freshness-check',
        '/api/funding-opportunities',
        '/api/spacex', '/api/eonet', '/api/podcasts', '/api/launch-windows/init',
        '/api/livestreams',
        // Scheduler-invoked paths (see CRON_JOBS in src/lib/cron-scheduler.ts —
        // keep this list in sync or internal POSTs get 403'd by CSRF)
        '/api/cron/',
        '/api/winback', '/api/drip/process', '/api/nurture/process',
        '/api/space-tycoon/rivals/snapshot', '/api/space-tycoon/bidding/resolve',
        '/api/space-tycoon/zones/update', '/api/space-tycoon/leagues/process-week',
        '/api/space-tycoon/alliance-cron', '/api/space-tycoon/market/restock',
        '/api/space-tycoon/market/mean-revert',
        '/api/space-tycoon/market/npc-industry',
        // Wave E4 (Finite Demand Pools) — hourly pool aggregation, same
        // mean-revert precedent (scheduler-invoked internal POST).
        '/api/space-tycoon/demand-pools/update',
        // Wave E5 (Depletion, Labor & Lanes) — weekly labor wage-index job,
        // same scheduler-invoked-internal-POST precedent.
        '/api/space-tycoon/labor/update',
        '/api/procurement/opportunities',
        // Federal Register -> ProposedRegulation daily sync (2026-08-31
        // freshness audit): scheduler-invoked internal POST, same
        // mean-revert precedent. Sole writer of the ProposedRegulation table.
        '/api/compliance/fetch',
        // 4X Wave W3 (seasonal-event generation cron) — same mean-revert
        // precedent: a scheduler-invoked internal POST, not a browser mutation.
        '/api/space-tycoon/seasons/cron',
        // Previously-orphaned fetch endpoints, now scheduled in cron-scheduler.ts
        // (see CRON_JOBS) — same mean-revert precedent: scheduler-invoked
        // internal POSTs authenticated by CRON_SECRET, not browser mutations.
        '/api/launch-windows/fetch',
        '/api/debris-monitor/fetch',
        '/api/solar-flares/fetch',
        // 2026-09-01 hardening (H1): the remaining ingestion routes now
        // require the Bearer secret (or an admin session) too.
        '/api/news/fetch',
        '/api/blogs/fetch',
        '/api/events/fetch',
        '/api/space-tycoon/market/share/rollup',
        // Wave E7 (Chokepoints, Tariffs & NPC Drives) — orbital-slot
        // occupancy/auction resolution cron, same scheduler-invoked-
        // internal-POST precedent (this middleware.ts entry is the exact
        // "CSRF-for-new-cron gotcha" prior waves flagged — every new cron
        // route in cron-scheduler.ts MUST be added here too or it 403s).
        '/api/space-tycoon/orbital-slots/resolve',
        // Wave M6 (docs/MEANINGFUL_2026-08.md §M6): equity/takeover
        // resolution cron — tender contests, distress checks, dividends.
        '/api/space-tycoon/equity/resolve',
        // AAA Round 1 wave E1 (docs/AAA_PROGRAM_2026-08.md): the Accord
        // Chair certifier — closes each monthly ballot and seats (or
        // honestly vacates) the Chair.
        '/api/space-tycoon/chair/resolve',
        // AAA Program Round 2 (docs/AAA_PROGRAM_2026-08.md): the
        // systemic-crisis sealer — seals closed cycles and publishes the
        // measured world index for the current one.
        '/api/space-tycoon/crisis/resolve',
      ];
      // Also allow all /init endpoints
      if (cronPaths.some(p => pathname.startsWith(p)) || pathname.endsWith('/init')) {
        return true;
      }
    }
    // Invalid or unrecognized Bearer token — proceed with normal CSRF check
  }

  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');

  if (!host) {
    return false;
  }

  // Check Origin header first (most reliable)
  if (origin) {
    try {
      const originUrl = new URL(origin);
      return originUrl.host === host;
    } catch {
      return false;
    }
  }

  // Fall back to Referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.host === host;
    } catch {
      return false;
    }
  }

  // No Origin or Referer = likely a direct/scripted request, not a browser;
  // reject to prevent CSRF from clients that strip these headers
  return false;
}

// ─────────────────────────────────────────────────────────────────────────
// Real 404s for DB-backed dynamic detail routes
// ─────────────────────────────────────────────────────────────────────────
//
// notFound() called from inside a matched route (e.g. deep in a page.tsx
// after an "if (!row) notFound()" check) is caught by a CLIENT-SIDE React
// error boundary — NotFoundBoundary, see
// node_modules/next/dist/client/components/not-found-boundary.js. It can
// correctly swap in the not-found UI (and Next itself adds a
// <meta name="robots" content="noindex"> tag as a built-in mitigation) but
// it has no way to touch the HTTP response status code, which by the time
// that boundary runs has already been committed to 200. The only render
// path that reliably sets res.statusCode = 404 is a route-level "no page
// matched this URL" 404 — i.e. dynamicParams=false rejecting a slug that
// isn't in generateStaticParams()'s list, or a URL with no matching route
// at all. See src/app/blog/[slug]/page.tsx and
// src/app/space-talent/browse/[slug]/page.tsx for that fix, used where the
// valid slugs are a small static, build-time-known set.
//
// /company-profiles/[slug] and /marketplace/listings/[slug] can't use that
// trick: their valid slugs come from Postgres, and the Railway build
// container has no DB access, so generateStaticParams can't enumerate them
// (see CLAUDE.md/memory: "Railway build container has NO DB access").
// Instead, middleware — which runs before any page rendering — checks
// existence against a small side-effect-free API and returns a genuine
// 404 Response directly when the slug doesn't exist, bypassing the
// notFound()-boundary limitation entirely. If the check itself fails for
// any reason (network hiccup, DB blip, timeout), we fail OPEN — the
// request proceeds normally — so a transient error in this check can never
// incorrectly 404 real content.
// Exported for src/lib/__tests__/route-404-status.test.ts, which asserts
// every entry here has a real `exists` route handler behind it — the guard
// that catches "new dynamic route shipped, middleware entry forgotten".
export const SLUG_EXISTENCE_CHECKS: Array<{
  match: RegExp;
  excludedSlugs?: Set<string>;
  existsApiPath: (slug: string) => string;
}> = [
  {
    // /company-profiles/sponsor is a real static page, not a company slug.
    match: /^\/company-profiles\/([^/]+)\/?$/,
    excludedSlugs: new Set(['sponsor']),
    existsApiPath: (slug) => `/api/company-profiles/${encodeURIComponent(slug)}/exists`,
  },
  {
    match: /^\/marketplace\/listings\/([^/]+)\/?$/,
    existsApiPath: (slug) => `/api/marketplace/listings/${encodeURIComponent(slug)}/exists`,
  },
  {
    // Hiring Index editions (G2, 2026-09-01): month validity is date math,
    // not DB, but editions roll forward monthly without a deploy — so the
    // existence check keeps unknown months a genuine 404.
    match: /^\/hiring-index\/([^/]+)\/?$/,
    existsApiPath: (slug) => `/api/hiring-index/${encodeURIComponent(slug)}/exists`,
  },
  {
    // Podcast show pages (2026-09-01): DB-backed slugs from the roster sync.
    match: /^\/podcasts\/([^/]+)\/?$/,
    existsApiPath: (slug) => `/api/podcasts/${encodeURIComponent(slug)}/exists`,
  },
  {
    // Launch imagery gallery (2026-09-02): DB-backed SpaceEvent ids.
    match: /^\/gallery\/([^/]+)\/?$/,
    existsApiPath: (id) => `/api/gallery/${encodeURIComponent(id)}/exists`,
  },
  {
    // Episode slugs are unique only per show, so the probe carries both segments.
    match: /^\/podcasts\/([^/]+\/[^/]+)\/?$/,
    existsApiPath: (pair) => `/api/podcasts/${pair.split('/').map(encodeURIComponent).join('/')}/exists`,
  },
  {
    // /build-guides/new is a real static page, not a guide slug.
    match: /^\/build-guides\/([^/]+)\/?$/,
    excludedSlugs: new Set(['new']),
    existsApiPath: (slug) => `/api/build-guides/${encodeURIComponent(slug)}/exists`,
  },
  {
    // Cap tables are keyed by CompanyProfile.slug — the same column
    // /company-profiles/[slug] uses — so reuse that existence endpoint
    // rather than shipping a second identical query.
    match: /^\/cap-tables\/([^/]+)\/?$/,
    existsApiPath: (slug) => `/api/company-profiles/${encodeURIComponent(slug)}/exists`,
  },
  {
    // /countdown/new is a real static page, not a countdown slug.
    match: /^\/countdown\/([^/]+)\/?$/,
    excludedSlugs: new Set(['new']),
    existsApiPath: (slug) => `/api/countdown/${encodeURIComponent(slug)}/exists`,
  },
  {
    // /gig-work/post and /gig-work/my-gigs are real static pages.
    match: /^\/gig-work\/([^/]+)\/?$/,
    excludedSlugs: new Set(['post', 'my-gigs']),
    existsApiPath: (id) => `/api/gig-work/${encodeURIComponent(id)}/exists`,
  },
  {
    match: /^\/history\/([^/]+)\/?$/,
    existsApiPath: (slug) => `/api/history/${encodeURIComponent(slug)}/exists`,
  },
  // Learning Zone, three depths. The capture group deliberately spans '/'
  // so the whole trailing path travels as one ?path= value — middleware's
  // check shape only carries a single captured string per entry, and one
  // endpoint resolving all three depths keeps it that way. Anchored regexes
  // mean exactly one of these three can match a given URL.
  {
    // /learn/zone is a real static page, not a track. The /learn/* entries
    // in next.config.js's redirects() are listed too: those 301s are
    // evaluated before middleware runs, so this is belt-and-braces only —
    // an over-broad exclusion set is harmless (it just leaves today's
    // behaviour in place), an under-broad one would 404 a live page.
    match: /^\/learn\/([^/]+)\/?$/,
    excludedSlugs: new Set([
      'zone',
      'space-industry',
      'space-industry-market-size',
      'satellite-launch-cost',
      'how-to-track-satellites',
      'space-companies-to-watch',
    ]),
    existsApiPath: (p) => `/api/learn/exists?path=${encodeURIComponent(p)}`,
  },
  {
    match: /^\/learn\/([^/]+\/[^/]+)\/?$/,
    existsApiPath: (p) => `/api/learn/exists?path=${encodeURIComponent(p)}`,
  },
  {
    match: /^\/learn\/([^/]+\/[^/]+\/[^/]+)\/?$/,
    existsApiPath: (p) => `/api/learn/exists?path=${encodeURIComponent(p)}`,
  },
  {
    // These are in sitemap.ts, so unknown ids are directly wasted crawl.
    match: /^\/regulatory-radar\/action\/([^/]+)\/?$/,
    existsApiPath: (id) => `/api/regulatory-radar/action/${encodeURIComponent(id)}/exists`,
  },
  {
    // Highest-volume case: ~6,500 ATS postings, all in jobs-sitemap.xml,
    // and expired ids are the URLs Google re-crawls most.
    match: /^\/space-talent\/job\/([^/]+)\/?$/,
    existsApiPath: (id) => `/api/space-jobs/${encodeURIComponent(id)}/exists`,
  },
  {
    match: /^\/space-tycoon\/corp\/([^/]+)\/?$/,
    existsApiPath: (id) => `/api/space-tycoon/corp/${encodeURIComponent(id)}/exists`,
  },
  {
    // Also covers the page's second, worse failure mode: a numeric but
    // unsealed season renders a real 200 "Season N" shell, making
    // /space-tycoon/seasons/<any integer> an unbounded supply of thin
    // indexable pages. The exists route rejects both.
    match: /^\/space-tycoon\/seasons\/([^/]+)\/?$/,
    existsApiPath: (n) => `/api/space-tycoon/seasons/${encodeURIComponent(n)}/exists`,
  },

  // ── 2026-08-24 batch: the twelve remaining soft-404 client pages ──────────
  // Live-tested with garbage slugs before this change: every one returned
  // HTTP 200. All are client components, so notFound() can't set the status —
  // this registry is the only mechanism that can.
  {
    match: /^\/ai-insights\/([^/]+)\/?$/,
    existsApiPath: (slug) => `/api/ai-insights/${encodeURIComponent(slug)}/exists`,
  },
  {
    match: /^\/amas\/([^/]+)\/?$/,
    existsApiPath: (id) => `/api/sessions/${encodeURIComponent(id)}/exists`,
  },
  {
    match: /^\/community\/forums\/([^/]+)\/?$/,
    existsApiPath: (slug) => `/api/community/forums/${encodeURIComponent(slug)}/exists`,
  },
  {
    // Thread level: the category slug is validated by the entry above on its
    // own page; here only the thread id decides existence.
    match: /^\/community\/forums\/[^/]+\/([^/]+)\/?$/,
    existsApiPath: (id) => `/api/community/forum-threads/${encodeURIComponent(id)}/exists`,
  },
  {
    // /investor-hub/deal-memos/new is the authoring page.
    match: /^\/investor-hub\/deal-memos\/([^/]+)\/?$/,
    excludedSlugs: new Set(['new']),
    existsApiPath: (slug) => `/api/investor-hub/deal-memos/${encodeURIComponent(slug)}/exists`,
  },
  {
    // /investor-hub/theses/new is the authoring page.
    match: /^\/investor-hub\/theses\/([^/]+)\/?$/,
    excludedSlugs: new Set(['new']),
    existsApiPath: (slug) => `/api/investor-hub/theses/${encodeURIComponent(slug)}/exists`,
  },
  {
    // /marketplace/rfq/new is the authoring page.
    match: /^\/marketplace\/rfq\/([^/]+)\/?$/,
    excludedSlugs: new Set(['new']),
    existsApiPath: (id) => `/api/marketplace/rfq/${encodeURIComponent(id)}/exists`,
  },
  {
    match: /^\/mentors\/([^/]+)\/?$/,
    existsApiPath: (userId) => `/api/mentors/${encodeURIComponent(userId)}/exists`,
  },
  {
    // /mission-debriefs/admin is the operator surface.
    match: /^\/mission-debriefs\/([^/]+)\/?$/,
    excludedSlugs: new Set(['admin']),
    existsApiPath: (slug) => `/api/mission-debriefs/${encodeURIComponent(slug)}/exists`,
  },
  {
    match: /^\/regulation-explainers\/([^/]+)\/?$/,
    existsApiPath: (slug) => `/api/regulation-explainers/${encodeURIComponent(slug)}/exists`,
  },
  {
    // /speaking/submit is the submission form.
    match: /^\/speaking\/([^/]+)\/?$/,
    excludedSlugs: new Set(['submit']),
    existsApiPath: (id) => `/api/speaking/${encodeURIComponent(id)}/exists`,
  },
  {
    // /ticket-resale/list and /ticket-resale/my-listings are real pages.
    match: /^\/ticket-resale\/([^/]+)\/?$/,
    excludedSlugs: new Set(['list', 'my-listings']),
    existsApiPath: (id) => `/api/ticket-resale/${encodeURIComponent(id)}/exists`,
  },
];

async function checkKnownSlugMissing(req: NextRequest, pathname: string): Promise<boolean> {
  for (const check of SLUG_EXISTENCE_CHECKS) {
    const m = pathname.match(check.match);
    if (!m) continue;
    // decodeURIComponent throws URIError on a malformed % sequence; with
    // this list now covering a dozen route families it is worth not letting
    // that become a 500. Fail open, same as every other failure here.
    let slug: string;
    try {
      slug = decodeURIComponent(m[1]);
    } catch {
      return false;
    }
    if (check.excludedSlugs?.has(slug)) return false;

    // Try the container-internal loopback FIRST, then the public origin.
    //
    // WHY (found 2026-08-22 by curl-testing the deployed site): the
    // origin-only version of this check silently did nothing in production.
    // Middleware ran (the www redirect on the same path works), the exists
    // endpoints answered correctly when called directly, yet unknown slugs
    // still returned 200 — and returned it in ~370ms, far too fast to be the
    // 2500ms timeout. That signature is an immediately-throwing fetch: the
    // Railway container cannot reach its own PUBLIC hostname from inside
    // (no hairpin), so every check threw and fail-open swallowed it. The
    // mechanism had therefore never worked in production for ANY DB-backed
    // route, while the static dynamicParams=false routes were fine — which
    // is why earlier verification of "the 404 fix" looked convincing.
    //
    // Loopback is how the rest of the codebase addresses itself internally
    // (see INTERNAL_APP_URL in src/lib/constants.ts). Fail-open is preserved
    // at every step: any throw, timeout, or non-404 leaves content reachable.
    const path = check.existsApiPath(slug);
    const port = process.env.PORT || '3000';
    const candidates = [`http://127.0.0.1:${port}${path}`, new URL(path, req.nextUrl.origin).toString()];

    for (const url of candidates) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      try {
        const res = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: { 'x-internal-existence-check': '1' },
        });
        // A reachable check is authoritative: 404 means missing, anything
        // else means present (or the endpoint erred, which it answers 200 to).
        return res.status === 404;
      } catch {
        // This candidate is unreachable — try the next one.
        continue;
      } finally {
        clearTimeout(timeout);
      }
    }
    // Every candidate failed: fail open rather than 404 real content.
    return false;
  }
  return false;
}


/**
 * A minimal, self-contained 404 page — middleware can't invoke Next's own
 * React rendering pipeline (that's the exact mechanism that fails to set a
 * real status code), so this is a small hand-written page rather than the
 * site's styled not-found.tsx. Dark-themed, links back to a working page.
 */
function notFoundResponse(): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Not Found | SpaceNexus</title><meta name="robots" content="noindex"><style>body{background:#000;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0}main{text-align:center;padding:2rem}h1{font-size:1.5rem;margin:0 0 .5rem}p{color:#94a3b8;margin:0 0 1.5rem}a{color:#22d3ee;text-decoration:none}a:hover{text-decoration:underline}</style></head><body><main><h1>Page not found</h1><p>The page you're looking for doesn't exist or has been removed.</p><a href="/">Return to SpaceNexus</a></main></body></html>`;
  const response = new NextResponse(html, {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' },
  });
  // No inline script on this page; its <style> is covered by style-src
  // 'unsafe-inline'. Nonce-free policy on purpose — nothing here to nonce.
  applyDocumentSecurityHeaders(response, {
    enforced: documentCspHeaders({ pathname: '/404' }).enforced,
    xFrameOptions: 'DENY',
  });
  return response;
}

/**
 * Security headers every HTML document gets (src/lib/csp.ts builds the
 * policies). X-Frame-Options is only set when frame-ancestors is 'none' —
 * XFO has no ALLOWALL value, and a DENY alongside `frame-ancestors *` is
 * exactly the intersection that broke /embed/* before 2026-09-01.
 */
function applyDocumentSecurityHeaders(
  response: NextResponse,
  csp: { enforced: string; reportOnly?: string; xFrameOptions?: 'DENY' },
): void {
  response.headers.set('Content-Security-Policy', csp.enforced);
  if (csp.reportOnly) response.headers.set('Content-Security-Policy-Report-Only', csp.reportOnly);
  response.headers.set('Reporting-Endpoints', REPORTING_ENDPOINTS_HEADER);
  if (csp.xFrameOptions) response.headers.set('X-Frame-Options', csp.xFrameOptions);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
}

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || '';

  // Redirect www → non-www (301 permanent)
  if (hostname.startsWith('www.')) {
    const newUrl = req.nextUrl.clone();
    newUrl.host = hostname.replace(/^www\./, '');
    return NextResponse.redirect(newUrl, 301);
  }

  const pathname = req.nextUrl.pathname;

  // Mothballed feature suites (2026-08 consolidation Phase 2) — 307 to the
  // hub that will relist them. Runs before the existence probes below so a
  // mothballed detail route costs no DB read. Registry: src/lib/mothballed-routes.ts
  const mothballed = resolveMothball(pathname);
  if (mothballed) {
    // redirectTo may carry a query and/or hash ('/report-cards?view=score',
    // '/history#today'); the visitor's own ?tab= survives so deep links
    // into the old page land on the same tab of the new one.
    const target = new URL(mothballed.redirectTo, req.nextUrl.origin);
    const hub = req.nextUrl.clone();
    hub.pathname = target.pathname;
    hub.search = target.search;
    hub.hash = target.hash;
    const tab = req.nextUrl.searchParams.get('tab');
    if (tab && !hub.searchParams.has('tab')) hub.searchParams.set('tab', tab);
    const res = NextResponse.redirect(hub, 307);
    res.headers.set('x-mothballed', mothballed.group);
    return res;
  }

  // Registry-backed routes (/rockets/[slug], /launches/[site]/[month]) —
  // valid params are known statically, so an unknown one is a real 404
  // here, with no fetch or DB read. See src/lib/registry-routes.ts.
  if (registryRouteMissing(pathname)) {
    return notFoundResponse();
  }

  // Give the small set of DB-backed detail routes above a real 404 status
  // for unknown slugs — see SLUG_EXISTENCE_CHECKS comment.
  if (!pathname.startsWith('/api/') && SLUG_EXISTENCE_CHECKS.some((c) => c.match.test(pathname))) {
    const missing = await checkKnownSlugMissing(req, pathname);
    if (missing) {
      // A minimal, self-contained 404 page — middleware can't invoke
      // Next's own React rendering pipeline (that's the exact mechanism
      // that fails to set a real status code; see the comment above), so
      // this is a small hand-written page rather than the site's styled
      // not-found.tsx. It matches the site's dark theme closely enough to
      // not look broken, and links back to a working page.
      return notFoundResponse();
    }
  }

  // Rate limiting and CSRF only apply to API routes
  if (pathname.startsWith('/api/')) {
    // Skip rate limiting for healthcheck (Railway pings this frequently)
    if (pathname === '/api/health') {
      return NextResponse.next();
    }

    // Run periodic cleanup
    cleanupExpiredEntries();

    // CSRF check for mutating requests
    if (!checkCsrf(req)) {
      console.warn(`[CSRF_REJECT] ${req.method} ${pathname} from ${getClientIp(req)}`);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Invalid or missing origin. Cross-site requests are not allowed.',
          },
        },
        { status: 403 }
      );
    }

    // Rate limiting
    const clientIp = getClientIp(req);
    const { allowed, remaining, retryAfterSeconds } = checkRateLimit(clientIp, pathname, req.method);

    if (!allowed) {
      console.warn(`[RATE_LIMIT] ${req.method} ${pathname} from ${clientIp} — retry after ${retryAfterSeconds}s`);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // Proceed with the request, adding rate limit + security headers
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (pathname === CSP_REPORT_PATH) {
      response.headers.set('Cache-Control', 'no-store');
    }

    // Default Cache-Control for GET API requests (routes can override)
    if (req.method === 'GET') {
      const privatePaths = [
        '/api/account', '/api/alerts', '/api/watchlist', '/api/notifications',
        '/api/messages', '/api/saved-searches', '/api/reading-list',
        '/api/dashboard', '/api/admin', '/api/developer/keys',
        '/api/developer/usage', '/api/subscription', '/api/deal-rooms',
        '/api/auth', '/api/nps', '/api/community/profiles',
      ];
      const isPrivate = privatePaths.some(p => pathname.startsWith(p));

      if (isPrivate) {
        response.headers.set('Cache-Control', 'private, no-cache');
      } else {
        response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
      }
    }

    return response;
  }

  // ── Document responses: CSP + the other security headers ────────────────
  // Policies come from src/lib/csp.ts (single source of truth; next.config.js
  // no longer sets CSP or X-Frame-Options, so there is exactly one CSP header
  // per response). /embed/* and /widgets/* get `frame-ancestors *` and no XFO;
  // everything else gets 'none' + DENY.
  //
  // Nonce rollout (CSP_MODE, default report-only): on routes Next renders per
  // request the nonce policy also goes out — as Report-Only until the reports
  // run clean, then enforced. Next 14 reads the nonce from the request's
  // Content-Security-Policy[-Report-Only] header and stamps it on its own
  // bootstrap + next/script tags, so the header carrying the nonce is
  // forwarded on the request (never the nonce-free one — Next would read
  // that first and find no nonce). x-nonce is forwarded for server components.
  const csp = documentCspHeaders({ pathname });
  let response: NextResponse;
  if (csp.nonce) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-nonce', csp.nonce);
    if (csp.reportOnly) {
      requestHeaders.delete('content-security-policy');
      requestHeaders.set('content-security-policy-report-only', csp.reportOnly);
    } else {
      requestHeaders.set('content-security-policy', csp.enforced);
    }
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else {
    response = NextResponse.next();
  }
  applyDocumentSecurityHeaders(response, csp);

  // Space Tycoon invite links: /space-tycoon?ref=<profileId>. Remember the
  // referrer for 30 days so the attribution survives sign-up; the game's
  // profile-creation path reads it (src/lib/game/referrals.ts).
  if (pathname.startsWith('/space-tycoon')) {
    const ref = req.nextUrl.searchParams.get('ref');
    if (ref && /^[a-z0-9]{10,40}$/i.test(ref)) {
      // httpOnly + secure (2026-09-01 L1): the cookie is read server-side
      // only (src/lib/game/referrals.ts); page scripts never need it.
      response.cookies.set('sn_ref', ref, {
        maxAge: 30 * 24 * 3600,
        path: '/',
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
    }
  }

  // Anonymous visitor id (2026-09-01): lets logged-out visitors react and
  // vote on launch-day pages with one-vote-per-visitor semantics. httpOnly —
  // page scripts never see it; API routes read it via cookies().get('sn_vid').
  // Set once, only on page navigations (API and static paths are excluded
  // by the branches above / the matcher).
  if (!req.cookies.get('sn_vid')?.value) {
    response.cookies.set('sn_vid', crypto.randomUUID(), {
      maxAge: 365 * 24 * 3600,
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });
  }
  return response;
}

export const config = {
  matcher: [
    // Match all API routes for rate limiting + CSRF
    '/api/:path*',
    // Match all pages for www redirect (exclude static assets)
    '/((?!_next/static|_next/image|favicon\\.ico|icons|sw\\.js|site\\.webmanifest|robots\\.txt|sitemap\\.xml).*)',
  ],
};
