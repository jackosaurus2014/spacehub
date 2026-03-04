import { NextRequest, NextResponse } from 'next/server';

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

function getRateLimitConfig(pathname: string): RateLimitConfig {
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
  // Investment thesis — expensive AI call
  if (pathname.startsWith('/api/investment-thesis')) {
    return { maxRequests: 5, windowMs: 60 * 60 * 1000 }; // 5 per hour
  }
  // Report generation — expensive AI call
  if (pathname.startsWith('/api/reports/generate')) {
    return { maxRequests: 5, windowMs: 60 * 60 * 1000 }; // 5 per hour
  }
  // Marketplace copilot — expensive AI call
  if (pathname.startsWith('/api/marketplace/copilot')) {
    return { maxRequests: 10, windowMs: 60 * 60 * 1000 }; // 10 per hour
  }
  // Company research — expensive AI call
  if (pathname.startsWith('/api/company-research')) {
    return { maxRequests: 10, windowMs: 60 * 60 * 1000 }; // 10 per hour
  }
  // AI-powered endpoints (expensive external API calls)
  if (
    pathname.startsWith('/api/search/ai-intent') ||
    pathname.startsWith('/api/opportunities/moonshots') ||
    pathname.startsWith('/api/opportunities/analyze')
  ) {
    return { maxRequests: 10, windowMs: 60 * 1000 }; // 10 req/minute
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
  pathname: string
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const config = getRateLimitConfig(pathname);
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Group routes into buckets so sub-paths share a single counter
  // (e.g., /api/auth/register and /api/auth/register/resend share one limit)
  let routeKey: string;
  if (pathname.startsWith('/api/auth/resend-verification')) {
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
  } else if (pathname.startsWith('/api/community/forums')) {
    routeKey = 'community-forums';
  } else if (pathname.startsWith('/api/community/reports')) {
    routeKey = 'community-reports';
  } else if (pathname.startsWith('/api/messages')) {
    routeKey = 'messages';
  } else if (pathname.startsWith('/api/investment-thesis')) {
    routeKey = 'investment-thesis';
  } else if (pathname.startsWith('/api/reports/generate')) {
    routeKey = 'reports-generate';
  } else if (pathname.startsWith('/api/marketplace/copilot')) {
    routeKey = 'marketplace-copilot';
  } else if (pathname.startsWith('/api/company-research')) {
    routeKey = 'company-research';
  } else if (
    pathname.startsWith('/api/search/ai-intent') ||
    pathname.startsWith('/api/opportunities/moonshots') ||
    pathname.startsWith('/api/opportunities/analyze')
  ) {
    routeKey = 'ai-endpoints';
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

export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || '';

  // Redirect www → non-www (301 permanent)
  if (hostname.startsWith('www.')) {
    const newUrl = req.nextUrl.clone();
    newUrl.host = hostname.replace(/^www\./, '');
    return NextResponse.redirect(newUrl, 301);
  }

  const pathname = req.nextUrl.pathname;

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
    const { allowed, remaining, retryAfterSeconds } = checkRateLimit(clientIp, pathname);

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

    // Proceed with the request, adding rate limit headers
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Remaining', String(remaining));

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

  // Add security headers to all non-API responses
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
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
