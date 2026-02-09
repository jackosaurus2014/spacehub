import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  validationError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  internalError,
} from '@/lib/errors';
import { adCampaignUpdateSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Helper to verify campaign ownership.
 */
async function verifyCampaignOwnership(campaignId: string, userId: string) {
  const campaign = await prisma.adCampaign.findUnique({
    where: { id: campaignId },
    include: {
      advertiser: { select: { userId: true } },
      placements: true,
      _count: {
        select: { impressions: true },
      },
    },
  });

  if (!campaign) {
    return { campaign: null, error: 'not_found' as const };
  }

  // Check if user is an admin or the campaign owner
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  if (campaign.advertiser.userId !== userId && !user?.isAdmin) {
    return { campaign: null, error: 'forbidden' as const };
  }

  return { campaign, error: null };
}

/**
 * GET /api/ads/campaigns/[id]
 *
 * Get campaign details with impression/click/conversion counts.
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

    const { campaign, error } = await verifyCampaignOwnership(params.id, session.user.id);

    if (error === 'not_found') {
      return notFoundError('Campaign');
    }
    if (error === 'forbidden') {
      return forbiddenError();
    }

    // Get impression counts by type
    const [impressionCount, clickCount, conversionCount] = await Promise.all([
      prisma.adImpression.count({
        where: { campaignId: params.id, type: 'impression' },
      }),
      prisma.adImpression.count({
        where: { campaignId: params.id, type: 'click' },
      }),
      prisma.adImpression.count({
        where: { campaignId: params.id, type: 'conversion' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...campaign,
        metrics: {
          impressions: impressionCount,
          clicks: clickCount,
          conversions: conversionCount,
          ctr: impressionCount > 0
            ? Math.round((clickCount / impressionCount) * 100 * 100) / 100
            : 0,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching campaign details', {
      error: error instanceof Error ? error.message : String(error),
      campaignId: params.id,
    });
    return internalError('Failed to fetch campaign details');
  }
}

/**
 * PUT /api/ads/campaigns/[id]
 *
 * Update campaign: pause, resume, update budget, etc.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { campaign, error } = await verifyCampaignOwnership(params.id, session.user.id);

    if (error === 'not_found') {
      return notFoundError('Campaign');
    }
    if (error === 'forbidden') {
      return forbiddenError();
    }

    const body = await req.json();
    const validation = validateBody(adCampaignUpdateSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const updateData = validation.data;

    // Validate status transitions
    if (updateData.status) {
      const validTransitions: Record<string, string[]> = {
        draft: ['pending_review'],
        pending_review: ['active', 'rejected'],
        active: ['paused', 'completed'],
        paused: ['active', 'completed'],
        completed: [],
        rejected: ['draft'],
      };

      const currentStatus = campaign!.status;
      const allowed = validTransitions[currentStatus] || [];

      if (!allowed.includes(updateData.status)) {
        return validationError(
          `Cannot transition from "${currentStatus}" to "${updateData.status}". Allowed: ${allowed.join(', ') || 'none'}`
        );
      }
    }

    // Validate budget increase (cannot decrease below spent)
    if (updateData.budget !== undefined && campaign) {
      if (updateData.budget < campaign.spent) {
        return validationError(
          `Budget cannot be less than amount already spent ($${campaign.spent.toFixed(2)})`
        );
      }
    }

    // Validate end date
    if (updateData.endDate && campaign) {
      const newEnd = new Date(updateData.endDate);
      if (newEnd <= campaign.startDate) {
        return validationError('End date must be after start date');
      }
    }

    const updated = await prisma.adCampaign.update({
      where: { id: params.id },
      data: {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.status && { status: updateData.status }),
        ...(updateData.budget !== undefined && { budget: updateData.budget }),
        ...(updateData.dailyBudget !== undefined && { dailyBudget: updateData.dailyBudget }),
        ...(updateData.endDate && { endDate: new Date(updateData.endDate) }),
        ...(updateData.priority !== undefined && { priority: updateData.priority }),
      },
      include: {
        placements: true,
      },
    });

    logger.info('Ad campaign updated', {
      campaignId: params.id,
      updates: Object.keys(updateData),
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('Error updating campaign', {
      error: error instanceof Error ? error.message : String(error),
      campaignId: params.id,
    });
    return internalError('Failed to update campaign');
  }
}

/**
 * DELETE /api/ads/campaigns/[id]
 *
 * Cancel and delete a campaign. Only allowed for draft/rejected campaigns,
 * or sets status to "completed" for active campaigns.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { campaign, error } = await verifyCampaignOwnership(params.id, session.user.id);

    if (error === 'not_found') {
      return notFoundError('Campaign');
    }
    if (error === 'forbidden') {
      return forbiddenError();
    }

    if (!campaign) {
      return notFoundError('Campaign');
    }

    // For draft/rejected campaigns, actually delete
    if (campaign.status === 'draft' || campaign.status === 'rejected') {
      await prisma.adCampaign.delete({
        where: { id: params.id },
      });

      logger.info('Ad campaign deleted', { campaignId: params.id });

      return NextResponse.json({
        success: true,
        data: { message: 'Campaign deleted successfully' },
      });
    }

    // For active/paused campaigns, mark as completed instead
    await prisma.adCampaign.update({
      where: { id: params.id },
      data: { status: 'completed' },
    });

    logger.info('Ad campaign cancelled', { campaignId: params.id });

    return NextResponse.json({
      success: true,
      data: { message: 'Campaign cancelled and marked as completed' },
    });
  } catch (error) {
    logger.error('Error deleting campaign', {
      error: error instanceof Error ? error.message : String(error),
      campaignId: params.id,
    });
    return internalError('Failed to delete campaign');
  }
}
