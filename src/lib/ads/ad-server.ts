import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { canAccessFeature } from '@/lib/subscription';
import { SubscriptionTier } from '@/types';

/**
 * Ad placement data returned to clients
 */
export interface ServedAd {
  placementId: string;
  campaignId: string;
  position: string;
  format: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string;
  ctaText: string | null;
  advertiserName: string;
  advertiserLogo: string | null;
}

/**
 * Select the best ad for a given context.
 *
 * 1. Check if user is on an ad-free tier (Pro/Enterprise) -- return null
 * 2. Find active campaigns targeting this module and position
 * 3. Filter by budget (spent < budget, daily spent < dailyBudget)
 * 4. Sort by priority, then by least recently shown
 * 5. Return the selected placement or null
 */
export async function selectAd(options: {
  position: string;
  module?: string;
  userId?: string;
  sessionId?: string;
  userTier?: SubscriptionTier;
}): Promise<ServedAd | null> {
  const { position, module, userId, userTier } = options;

  try {
    // 1. Check if user is on ad-free tier
    if (userTier && canAccessFeature(userTier, 'adFree')) {
      return null;
    }

    // If we have a userId but no tier info, look it up
    if (userId && !userTier) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionTier: true },
      });

      if (user) {
        const tier = user.subscriptionTier as SubscriptionTier;
        if (canAccessFeature(tier, 'adFree')) {
          return null;
        }
      }
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 2. Find active campaigns with placements for this position
    const placements = await prisma.adPlacement.findMany({
      where: {
        isActive: true,
        position,
        campaign: {
          status: 'active',
          startDate: { lte: now },
          endDate: { gte: now },
          // Target this module (or empty array means all modules)
          ...(module
            ? { targetModules: { has: module } }
            : {}),
        },
      },
      include: {
        campaign: {
          include: {
            advertiser: {
              select: {
                companyName: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    if (placements.length === 0) {
      return null;
    }

    // 3. Filter by budget constraints
    const eligiblePlacements = [];

    for (const placement of placements) {
      const campaign = placement.campaign;

      // Check total budget
      if (campaign.spent >= campaign.budget) {
        continue;
      }

      // Check daily budget if set
      if (campaign.dailyBudget) {
        const dailySpent = await prisma.adImpression.aggregate({
          where: {
            campaignId: campaign.id,
            createdAt: { gte: startOfDay },
          },
          _sum: { revenue: true },
        });

        if ((dailySpent._sum.revenue || 0) >= campaign.dailyBudget) {
          continue;
        }
      }

      eligiblePlacements.push(placement);
    }

    if (eligiblePlacements.length === 0) {
      return null;
    }

    // 4. Sort by priority (higher first), then by fewest recent impressions
    eligiblePlacements.sort((a, b) => {
      // Higher priority first
      if (b.campaign.priority !== a.campaign.priority) {
        return b.campaign.priority - a.campaign.priority;
      }
      // Lower spend ratio first (less shown campaigns get priority)
      const aRatio = a.campaign.spent / a.campaign.budget;
      const bRatio = b.campaign.spent / b.campaign.budget;
      return aRatio - bRatio;
    });

    // 5. Select the top placement
    const selected = eligiblePlacements[0];

    return {
      placementId: selected.id,
      campaignId: selected.campaignId,
      position: selected.position,
      format: selected.format,
      title: selected.title,
      description: selected.description,
      imageUrl: selected.imageUrl,
      linkUrl: selected.linkUrl,
      ctaText: selected.ctaText,
      advertiserName: selected.campaign.advertiser.companyName,
      advertiserLogo: selected.campaign.advertiser.logoUrl,
    };
  } catch (error) {
    logger.error('Error selecting ad', {
      error: error instanceof Error ? error.message : String(error),
      position,
      module,
    });
    return null;
  }
}

/**
 * Record an ad impression, click, or conversion.
 *
 * 1. Create AdImpression record
 * 2. If type is 'impression', calculate revenue (campaignCpmRate / 1000)
 * 3. If type is 'click' and cpcRate set, add cpc revenue
 * 4. Update campaign spent amount
 */
export async function recordImpression(options: {
  campaignId: string;
  placementId: string;
  userId?: string;
  sessionId?: string;
  type: 'impression' | 'click' | 'conversion';
  module?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const { campaignId, placementId, userId, sessionId, type, module, ipAddress, userAgent } = options;

  try {
    // Fetch campaign for rate info
    const campaign = await prisma.adCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        cpmRate: true,
        cpcRate: true,
        budget: true,
        spent: true,
        status: true,
      },
    });

    if (!campaign || campaign.status !== 'active') {
      return;
    }

    // Calculate revenue for this event
    let revenue = 0;
    if (type === 'impression') {
      // CPM = cost per 1000 impressions, so per impression = cpmRate / 1000
      revenue = campaign.cpmRate / 1000;
    } else if (type === 'click' && campaign.cpcRate) {
      revenue = campaign.cpcRate;
    }

    // Enforce budget cap: never overspend
    const newSpent = campaign.spent + revenue;
    if (newSpent > campaign.budget) {
      // Cap revenue at remaining budget
      revenue = Math.max(0, campaign.budget - campaign.spent);
    }

    // Create impression record and update campaign spent in a transaction
    await prisma.$transaction([
      prisma.adImpression.create({
        data: {
          campaignId,
          placementId,
          userId: userId || null,
          sessionId: sessionId || null,
          type,
          module: module || null,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          revenue,
        },
      }),
      prisma.adCampaign.update({
        where: { id: campaignId },
        data: {
          spent: { increment: revenue },
          // Auto-complete campaign if budget is exhausted
          ...(newSpent >= campaign.budget ? { status: 'completed' } : {}),
        },
      }),
    ]);

    logger.debug('Ad impression recorded', {
      campaignId,
      placementId,
      type,
      revenue,
      module,
    });
  } catch (error) {
    logger.error('Error recording ad impression', {
      error: error instanceof Error ? error.message : String(error),
      campaignId,
      placementId,
      type,
    });
  }
}

/**
 * Get campaign analytics data.
 */
export async function getCampaignAnalytics(campaignId: string) {
  try {
    const [campaign, impressionStats, clickStats, conversionStats, dailyBreakdown, moduleBreakdown] =
      await Promise.all([
        prisma.adCampaign.findUnique({
          where: { id: campaignId },
          include: {
            advertiser: { select: { companyName: true } },
            placements: { select: { id: true, position: true, format: true } },
          },
        }),
        prisma.adImpression.aggregate({
          where: { campaignId, type: 'impression' },
          _count: true,
          _sum: { revenue: true },
        }),
        prisma.adImpression.aggregate({
          where: { campaignId, type: 'click' },
          _count: true,
          _sum: { revenue: true },
        }),
        prisma.adImpression.aggregate({
          where: { campaignId, type: 'conversion' },
          _count: true,
        }),
        // Daily breakdown for the last 30 days
        prisma.adImpression.groupBy({
          by: ['type'],
          where: {
            campaignId,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
          _count: true,
          _sum: { revenue: true },
        }),
        // Module breakdown
        prisma.adImpression.groupBy({
          by: ['module'],
          where: {
            campaignId,
            module: { not: null },
          },
          _count: true,
          _sum: { revenue: true },
        }),
      ]);

    if (!campaign) {
      return null;
    }

    const impressions = impressionStats._count;
    const clicks = clickStats._count;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        budget: campaign.budget,
        spent: campaign.spent,
        cpmRate: campaign.cpmRate,
        cpcRate: campaign.cpcRate,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        advertiserName: campaign.advertiser.companyName,
      },
      metrics: {
        impressions,
        clicks,
        conversions: conversionStats._count,
        ctr: Math.round(ctr * 100) / 100,
        totalSpend: campaign.spent,
        impressionRevenue: impressionStats._sum.revenue || 0,
        clickRevenue: clickStats._sum.revenue || 0,
        budgetRemaining: campaign.budget - campaign.spent,
        budgetUtilization: Math.round((campaign.spent / campaign.budget) * 100 * 100) / 100,
      },
      byType: dailyBreakdown.map((d) => ({
        type: d.type,
        count: d._count,
        revenue: d._sum.revenue || 0,
      })),
      byModule: moduleBreakdown.map((m) => ({
        module: m.module,
        count: m._count,
        revenue: m._sum.revenue || 0,
      })),
      placements: campaign.placements,
    };
  } catch (error) {
    logger.error('Error fetching campaign analytics', {
      error: error instanceof Error ? error.message : String(error),
      campaignId,
    });
    return null;
  }
}
