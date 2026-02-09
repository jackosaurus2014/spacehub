import { NextRequest, NextResponse } from 'next/server';
import { selectAd } from '@/lib/ads/ad-server';
import { logger } from '@/lib/logger';
import { SubscriptionTier } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ads/serve
 *
 * Select and serve an ad for a given position/module context.
 * Lightweight endpoint -- no auth required.
 *
 * Query params:
 *   position - required: "top_banner", "sidebar", "in_feed", "footer", "interstitial"
 *   module   - optional: module ID for targeting
 *   tier     - optional: user's subscription tier (for ad-free check client-side)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const position = searchParams.get('position');
    const module = searchParams.get('module') || undefined;
    const tier = searchParams.get('tier') as SubscriptionTier | null;

    if (!position) {
      return NextResponse.json(
        { success: false, error: 'position query parameter is required' },
        { status: 400 }
      );
    }

    const ad = await selectAd({
      position,
      module,
      userTier: tier || undefined,
    });

    if (!ad) {
      // No ad available -- return 204 No Content
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json({
      success: true,
      data: ad,
    });
  } catch (error) {
    logger.error('Error serving ad', {
      error: error instanceof Error ? error.message : String(error),
    });
    return new NextResponse(null, { status: 204 });
  }
}
