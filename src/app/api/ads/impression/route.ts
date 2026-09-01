import { NextRequest, NextResponse } from 'next/server';
import { recordImpression } from '@/lib/ads/ad-server';
import {
  consumeNonce,
  hasImpressionTokenSecret,
  verifyImpressionToken,
} from '@/lib/ads/impression-token';
import { adImpressionSchema, validateBody } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Rightmost x-forwarded-for entry — the one the edge proxy appended, which a
 * client cannot spoof (mirrors `getClientIp` in src/middleware.ts). The
 * previous leftmost-entry read let a caller pick its own ip, which would have
 * defeated the per-ip dedup window in `recordImpression`.
 */
function getClientIp(req: NextRequest): string | undefined {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);
    if (ips.length > 0) return ips[ips.length - 1];
  }
  const realIp = req.headers.get('x-real-ip');
  return realIp?.trim() || undefined;
}

let warnedMissingSecret = false;

function unauthorized(reason: string) {
  return NextResponse.json(
    {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid ad token', reason },
    },
    { status: 401 }
  );
}

/**
 * POST /api/ads/impression
 *
 * Record an ad impression, click, or conversion.
 * No session required -- supports anonymous tracking -- but every call must
 * carry the signed `token` that `/api/ads/serve` issued for this exact
 * campaign/placement. Tokens expire after 6h and are single-use, and
 * `recordImpression` additionally refuses to charge repeat events from the
 * same ip inside a window. Together these stop the click-fraud budget drain
 * that an unauthenticated `{campaignId, placementId, type}` body allowed.
 *
 * Body: { placementId, campaignId, type, token, module? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = validateBody(adImpressionSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { placementId, campaignId, type, module, token } = validation.data;

    if (!hasImpressionTokenSecret()) {
      if (!warnedMissingSecret) {
        warnedMissingSecret = true;
        logger.error(
          'Ad impression recording disabled — set AD_TOKEN_SECRET (or CRON_SECRET / NEXTAUTH_SECRET)'
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Ad tracking is not configured' },
        },
        { status: 503 }
      );
    }

    const verified = verifyImpressionToken(token, { campaignId, placementId });
    if (!verified.ok) {
      logger.warn('Rejected ad impression: bad token', {
        reason: verified.reason,
        campaignId,
        placementId,
        type,
      });
      return unauthorized(verified.reason);
    }

    if (!consumeNonce(verified.payload.n, verified.payload.exp)) {
      logger.warn('Rejected ad impression: token replay', { campaignId, placementId, type });
      return unauthorized('token_reused');
    }

    // Extract tracking info from request
    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || undefined;

    const result = await recordImpression({
      campaignId,
      placementId,
      type,
      module,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      { success: true, recorded: result.recorded, charged: result.charged },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error recording ad impression', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to record impression');
  }
}
