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
  // AI-powered endpoints (expensive external API calls)
  if (
    pathname.startsWith('/api/search/ai-intent') ||
    pathname.startsWith('/api/marketplace/copilot') ||
    pathname.startsWith('/api/opportunities/moonshots') ||
    pathname.startsWith('/api/opportunities/analyze')
  ) {
    return { maxRequests: 10, windowMs: 60 * 1000 }; // 10 req/minute
  }
  // All other /api/* routes
  return { maxRequests: 100, windowMs: 60 * 1000 }; // 100 req/minute
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
  if (pathname.startsWith('/api/auth/register')) {
    routeKey = 'auth-register';
  } else if (pathname.startsWith('/api/newsletter')) {
    routeKey = 'newsletter';
  } else if (pathname.startsWith('/api/auth/forgot-password')) {
    routeKey = 'auth-forgot-password';
  } else if (pathname.startsWith('/api/auth/reset-password')) {
    routeKey = 'auth-reset-password';
  } else if (pathname.startsWith('/api/auth/verify-email')) {
    routeKey = 'auth-verify-email';
  } else if (
    pathname.startsWith('/api/search/ai-intent') ||
    pathname.startsWith('/api/marketplace/copilot') ||
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
    // Run periodic cleanup
    cleanupExpiredEntries();

    // CSRF check for mutating requests
    if (!checkCsrf(req)) {
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
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all API routes for rate limiting + CSRF
    '/api/:path*',
    // Match all pages for www redirect (exclude static assets)
    '/((?!_next/static|_next/image|favicon\\.ico|icons|sw\\.js|site\\.webmanifest|robots\\.txt|sitemap\\.xml).*)',
  ],
};
