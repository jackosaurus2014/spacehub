import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  validationError,
  unauthorizedError,
  forbiddenError,
  internalError,
  constrainPagination,
  constrainOffset,
} from '@/lib/errors';
import { adCampaignCreateSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ads/campaigns
 *
 * List the authenticated advertiser's campaigns.
 * Auth required -- user must have an approved advertiser profile.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    // Find advertiser profile for this user
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id },
    });

    if (!advertiser) {
      return forbiddenError('You must register as an advertiser first');
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '20'));
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));

    const where: Record<string, unknown> = {
      advertiserId: advertiser.id,
    };

    if (status) {
      where.status = status;
    }

    const [campaigns, total] = await Promise.all([
      prisma.adCampaign.findMany({
        where,
        include: {
          placements: {
            select: {
              id: true,
              position: true,
              format: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              impressions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.adCampaign.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        campaigns,
        total,
        hasMore: offset + campaigns.length < total,
      },
    });
  } catch (error) {
    logger.error('Error listing ad campaigns', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to list campaigns');
  }
}

/**
 * POST /api/ads/campaigns
 *
 * Create a new ad campaign.
 * Auth required -- user must be an approved advertiser.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    // Find approved advertiser profile
    const advertiser = await prisma.advertiser.findUnique({
      where: { userId: session.user.id },
    });

    if (!advertiser) {
      return forbiddenError('You must register as an advertiser first');
    }

    if (advertiser.status !== 'approved') {
      return forbiddenError('Your advertiser account is not yet approved');
    }

    const body = await req.json();
    const validation = validateBody(adCampaignCreateSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { placements: placementData, ...campaignData } = validation.data;

    // Validate dates
    const startDate = new Date(campaignData.startDate);
    const endDate = new Date(campaignData.endDate);

    if (endDate <= startDate) {
      return validationError('End date must be after start date');
    }

    if (startDate < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      return validationError('Start date cannot be in the past');
    }

    // Create campaign with placements in a transaction
    const campaign = await prisma.$transaction(async (tx) => {
      const newCampaign = await tx.adCampaign.create({
        data: {
          advertiserId: advertiser.id,
          name: campaignData.name,
          type: campaignData.type,
          status: 'draft',
          budget: campaignData.budget,
          dailyBudget: campaignData.dailyBudget || null,
          cpmRate: campaignData.cpmRate,
          cpcRate: campaignData.cpcRate || null,
          startDate,
          endDate,
          targetModules: campaignData.targetModules,
          targetTiers: campaignData.targetTiers,
          priority: campaignData.priority,
        },
      });

      // Create placements
      if (placementData && placementData.length > 0) {
        await tx.adPlacement.createMany({
          data: placementData.map((p) => ({
            campaignId: newCampaign.id,
            position: p.position,
            format: p.format,
            title: p.title || null,
            description: p.description || null,
            imageUrl: p.imageUrl || null,
            linkUrl: p.linkUrl,
            ctaText: p.ctaText || 'Learn More',
          })),
        });
      }

      return tx.adCampaign.findUnique({
        where: { id: newCampaign.id },
        include: {
          placements: true,
        },
      });
    });

    logger.info('Ad campaign created', {
      campaignId: campaign?.id,
      advertiserId: advertiser.id,
      name: campaignData.name,
      type: campaignData.type,
      budget: campaignData.budget,
    });

    return NextResponse.json(
      {
        success: true,
        data: campaign,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating ad campaign', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create campaign');
  }
}
