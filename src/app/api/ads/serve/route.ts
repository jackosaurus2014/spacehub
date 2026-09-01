import { NextRequest, NextResponse } from 'next/server';
import { selectAd, type SelectedAd, type ServedAd } from '@/lib/ads/ad-server';
import { mintImpressionToken } from '@/lib/ads/impression-token';
import { normalizeTier } from '@/lib/subscription';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Rightmost x-forwarded-for entry — the one the edge proxy appended, which a
 * client cannot spoof (mirrors `getClientIp` in src/middleware.ts).
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

/**
 * GET /api/ads/serve
 *
 * Select and serve an ad for a given position/module context.
 * Lightweight endpoint -- no auth required.
 *
 * The response carries a signed `token` that the client must echo back to
 * `POST /api/ads/impression`; without it no impression or click is charged.
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
    const targetModule = searchParams.get('module') || undefined;
    const rawTier = searchParams.get('tier');
    const tier = rawTier ? normalizeTier(rawTier) : null;

    if (!position) {
      return NextResponse.json(
        { success: false, error: 'position query parameter is required' },
        { status: 400 }
      );
    }

    const selected = await selectAd({
      position,
      module: targetModule,
      userTier: tier || undefined,
    });

    if (!selected) {
      // No ad available -- return 204 No Content
      return new NextResponse(null, { status: 204 });
    }

    let ad: ServedAd | SelectedAd = selected;
    try {
      ad = {
        ...selected,
        token: mintImpressionToken({
          campaignId: selected.campaignId,
          placementId: selected.placementId,
          ip: getClientIp(req),
        }),
      };
    } catch (error) {
      // No signing secret configured: still render the ad (the advertiser
      // paid for placement) but omit the token, so the impression route will
      // refuse to charge. Log once rather than on every request.
      if (!warnedMissingSecret) {
        warnedMissingSecret = true;
        logger.error('Ad impression tokens disabled — no signing secret configured', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
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
