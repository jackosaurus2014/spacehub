import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { getCampaignAnalytics } from '@/lib/ads/ad-server';
import { unauthorizedError, forbiddenError, notFoundError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ads/campaigns/[id]/analytics
 *
 * Detailed analytics for a campaign:
 *   - Impressions, clicks, CTR, spend
 *   - Revenue breakdown
 *   - By-day breakdown
 *   - By-module breakdown
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    // Verify ownership
    const campaign = await prisma.adCampaign.findUnique({
      where: { id: params.id },
      include: {
        advertiser: { select: { userId: true } },
      },
    });

    if (!campaign) {
      return notFoundError('Campaign');
    }

    // Check if user is admin or campaign owner
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (campaign.advertiser.userId !== session.user.id && !user?.isAdmin) {
      return forbiddenError();
    }

    const analytics = await getCampaignAnalytics(params.id);

    if (!analytics) {
      return notFoundError('Campaign analytics');
    }

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error fetching campaign analytics', {
      error: error instanceof Error ? error.message : String(error),
      campaignId: params.id,
    });
    return internalError('Failed to fetch campaign analytics');
  }
}
