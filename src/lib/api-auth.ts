/**
 * Server-only request authorization helpers for API route handlers.
 *
 * IMPORTANT: this module imports `@/lib/auth` (NextAuth options + Prisma) and
 * must NEVER be imported from `src/middleware.ts` — the Edge middleware bundle
 * cannot carry those dependencies. Route handlers only.
 */
import type { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireCronSecret, type ApiErrorResponse } from '@/lib/errors';

/**
 * Authorize a request if EITHER
 *   (a) it carries a valid `Authorization: Bearer <CRON_SECRET>` header
 *       (the internal scheduler — see requireCronSecret), OR
 *   (b) the caller has a NextAuth session whose user is an admin.
 *
 * Returns null when authorized, otherwise the 401 produced by
 * requireCronSecret. Intended for ingestion endpoints that have a legitimate
 * admin "refresh now" button in the browser as well as a scheduled caller.
 *
 * The cron check runs first and is fail-closed; the session lookup is only
 * consulted when the bearer check fails, so scheduler calls never pay for a
 * session decode.
 */
export async function requireCronSecretOrAdmin(
  request: Request
): Promise<NextResponse<ApiErrorResponse> | null> {
  const cronRejection = requireCronSecret(request);
  if (!cronRejection) return null;

  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.isAdmin === true) return null;
  } catch {
    // A broken session lookup must not widen access — fall through to 401.
  }

  return cronRejection;
}
