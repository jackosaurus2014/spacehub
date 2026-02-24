import { NextRequest, NextResponse } from 'next/server';
import { validateBody, telemetryEventSchema } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateBody(telemetryEventSchema, body);

    if (!validation.success) {
      return validationError('Invalid telemetry event', validation.errors);
    }

    const { level, message, context, url, userAgent, timestamp } = validation.data;

    // Log via structured logger so it appears in Railway/server logs
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
