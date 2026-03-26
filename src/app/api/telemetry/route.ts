import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { validateBody, telemetryEventSchema } from '@/lib/validations';
import { validationError, unauthorizedError, forbiddenError, internalError } from '@/lib/errors';
import { logger, getRecentErrors, getErrorStats } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Reject oversized payloads (5KB limit for telemetry beacons)
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
    if (contentLength > 5120) {
      return new NextResponse(null, { status: 204 });
    }

    const body = await request.json();
    const validation = validateBody(telemetryEventSchema, body);

    if (!validation.success) {
      return validationError('Invalid telemetry event', validation.errors);
    }

    const { level, message, context, url, userAgent, timestamp } = validation.data;

    // Log via structured logger so it appears in Railway/server logs.
    // The 'client-telemetry' source tag causes the logger's ring buffer to
    // categorize these as client-side errors rather than server-side.
    const logContext = {
      ...(context ?? {}),
      clientUrl: url,
      clientUserAgent: userAgent,
      clientTimestamp: timestamp,
      source: 'client-telemetry',
    };

    if (level === 'error') {
      logger.error(`[Client] ${message}`, logContext);
    } else if (level === 'warn') {
      logger.warn(`[Client] ${message}`, logContext);
    } else {
      logger.info(`[Client] ${message}`, logContext);
    }

    // 204 No Content — beacon callers don't read the body
    return new NextResponse(null, { status: 204 });
  } catch {
    // If parsing fails (e.g., malformed JSON from beacon), just discard
    logger.warn('Telemetry endpoint received unparseable payload');
    return new NextResponse(null, { status: 204 });
  }
}

/**
 * GET /api/telemetry
 * Returns recent errors and statistics for the admin error dashboard.
 * Requires admin authentication.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const url = new URL(request.url);
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '100', 10)));
    const levelFilter = (url.searchParams.get('level') || 'all') as 'error' | 'warn' | 'all';
    const sourceFilter = (url.searchParams.get('source') || 'all') as 'server' | 'client' | 'all';

    const errors = getRecentErrors(limit, levelFilter, sourceFilter);
    const stats = getErrorStats();

    return NextResponse.json({
      success: true,
      data: {
        errors,
        stats,
      },
    });
  } catch (err) {
    logger.error('Error in telemetry GET handler', {
      error: err instanceof Error ? err.message : String(err),
    });
    return internalError('Failed to retrieve error data');
  }
}
