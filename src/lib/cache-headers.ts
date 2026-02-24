import { NextResponse } from 'next/server';

/**
 * Cache-Control header utility for API routes.
 *
 * Use this helper when you need to set cache headers programmatically
 * (e.g., conditional caching based on auth state). For static cache
 * policies that apply to every response on a route, prefer the
 * declarative headers() config in next.config.js instead.
 *
 * @example
 * // 5-minute public cache (default)
 * return withCacheHeaders(NextResponse.json(data));
 *
 * // Real-time data — short cache
 * return withCacheHeaders(NextResponse.json(data), { maxAge: 60, staleWhileRevalidate: 120 });
 *
 * // Private / per-user data
 * return withCacheHeaders(NextResponse.json(data), { isPublic: false, maxAge: 0 });
 */
export function withCacheHeaders(
  response: NextResponse,
  options: {
    maxAge?: number;
    staleWhileRevalidate?: number;
    isPublic?: boolean;
  } = {}
): NextResponse {
  const {
    maxAge = 300,
    staleWhileRevalidate = 600,
    isPublic = true,
  } = options;

  const scope = isPublic ? 'public' : 'private';
  response.headers.set(
    'Cache-Control',
    `${scope}, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  );

  return response;
}
