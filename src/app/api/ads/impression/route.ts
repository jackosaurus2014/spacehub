import { NextRequest, NextResponse } from 'next/server';
import { recordImpression } from '@/lib/ads/ad-server';
import { adImpressionSchema, validateBody } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ads/impression
 *
 * Record an ad impression, click, or conversion.
 * No auth required -- supports anonymous tracking.
 *
 * Body: { placementId, campaignId, type, module? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = validateBody(adImpressionSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { placementId, campaignId, type, module } = validation.data;

    // Extract tracking info from request
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    await recordImpression({
      campaignId,
      placementId,
      type,
      module,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    logger.error('Error recording ad impression', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to record impression');
  }
}
