import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';
import { hashApiKey, API_RATE_LIMITS, ApiTier } from '@/lib/api-keys';
import { logger } from '@/lib/logger';

/**
 * API key authentication middleware for SpaceNexus v1 public API.
 *
 * Extracts API key from Authorization header or X-API-Key header,
 * validates it, checks rate limits, logs usage, and returns the
 * authenticated ApiKey record or an error response.
 */

interface AuthResult {
  success: true;
  apiKey: {
    id: string;
    userId: string;
    tier: string;
    name: string;
  };
  requestId: string;
}

interface AuthError {
  success: false;
  response: NextResponse;
}

export async function authenticateApiKey(
  req: NextRequest
): Promise<AuthResult | AuthError> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Extract API key from headers
  let rawKey: string | null = null;

  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer snx_')) {
    rawKey = authHeader.slice(7); // Remove "Bearer "
  }

  if (!rawKey) {
    rawKey = req.headers.get('x-api-key');
  }

  if (!rawKey || !rawKey.startsWith('snx_')) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid API key. Provide a valid key via Authorization: Bearer snx_... or X-API-Key header.',
          },
        },
        {
          status: 401,
          headers: { 'X-Request-Id': requestId },
        }
      ),
    };
  }

  // Hash and look up key
  const keyHash = hashApiKey(rawKey);

  let apiKey;
  try {
    apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      select: {
        id: true,
        userId: true,
        name: true,
        tier: true,
        rateLimitPerMonth: true,
        rateLimitPerMinute: true,
        isActive: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
  } catch (error) {
    logger.error('Database error during API key lookup', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Authentication service unavailable' },
        },
        { status: 500, headers: { 'X-Request-Id': requestId } }
      ),
    };
  }

  if (!apiKey) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid API key.' },
        },
        { status: 401, headers: { 'X-Request-Id': requestId } }
      ),
    };
  }

  // Check if key is active
  if (!apiKey.isActive || apiKey.revokedAt) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'API key has been revoked.' },
        },
        { status: 401, headers: { 'X-Request-Id': requestId } }
      ),
    };
  }

  // Check expiration
  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'API key has expired.' },
        },
        { status: 401, headers: { 'X-Request-Id': requestId } }
      ),
    };
  }

  // Check monthly rate limit
  const tier = apiKey.tier as ApiTier;
  const limits = API_RATE_LIMITS[tier] || API_RATE_LIMITS.developer;

  if (limits.monthly > 0) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyCount = await prisma.apiUsageLog.count({
      where: {
        apiKeyId: apiKey.id,
        createdAt: { gte: monthStart },
      },
    });

    if (monthlyCount >= limits.monthly) {
      const nextMonth = new Date(monthStart);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const resetSeconds = Math.ceil((nextMonth.getTime() - Date.now()) / 1000);

      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: `Monthly API limit exceeded (${limits.monthly} calls/month). Resets at the start of next month.`,
            },
          },
          {
            status: 429,
            headers: {
              'X-Request-Id': requestId,
              'X-RateLimit-Limit': String(limits.monthly),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(resetSeconds),
              'Retry-After': String(resetSeconds),
            },
          }
        ),
      };
    }
  }

  // Check per-minute rate limit
  const oneMinuteAgo = new Date(Date.now() - 60_000);
  const minuteCount = await prisma.apiUsageLog.count({
    where: {
      apiKeyId: apiKey.id,
      createdAt: { gte: oneMinuteAgo },
    },
  });

  if (minuteCount >= limits.perMinute) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: `Per-minute rate limit exceeded (${limits.perMinute} calls/minute). Please slow down.`,
          },
        },
        {
          status: 429,
          headers: {
            'X-Request-Id': requestId,
            'X-RateLimit-Limit': String(limits.perMinute),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': '60',
            'Retry-After': '60',
          },
        }
      ),
    };
  }

  // Log the API usage (non-blocking -- fire and forget)
  const endpoint = new URL(req.url).pathname;
  const method = req.method;
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined;
  const userAgent = req.headers.get('user-agent') || undefined;

  prisma.apiUsageLog
    .create({
      data: {
        apiKeyId: apiKey.id,
        endpoint,
        method,
        statusCode: 200, // Will be the presumed status; actual status logged separately if needed
        responseTimeMs: Date.now() - startTime,
        ipAddress,
        userAgent,
      },
    })
    .catch((err) => {
      logger.warn('Failed to log API usage', { error: err instanceof Error ? err.message : String(err) });
    });

  // Update lastUsedAt (non-blocking)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Silently ignore
    });

  return {
    success: true,
    apiKey: {
      id: apiKey.id,
      userId: apiKey.userId,
      tier: apiKey.tier,
      name: apiKey.name,
    },
    requestId,
  };
}

/**
 * Helper to add standard rate limit headers to a successful response.
 */
export function addRateLimitHeaders(
  response: NextResponse,
  requestId: string,
  tier: string
): NextResponse {
  const limits = API_RATE_LIMITS[tier as ApiTier] || API_RATE_LIMITS.developer;
  response.headers.set('X-Request-Id', requestId);
  response.headers.set('X-RateLimit-Limit', String(limits.perMinute));
  return response;
}
