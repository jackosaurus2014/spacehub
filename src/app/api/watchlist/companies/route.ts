import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  internalError,
  unauthorizedError,
  validationError,
  createSuccessResponse,
} from '@/lib/errors';
import { validateBody, companyWatchlistSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

function getWatchlistLimit(tier: string | null | undefined): number {
  if (tier === 'enterprise') return Infinity;
  if (tier === 'pro') return 50;
  return 10; // free
}

function getEffectiveTier(user: { subscriptionTier: string | null; trialTier: string | null; trialEndDate: Date | null }): string {
  if (user.subscriptionTier === 'enterprise' || user.subscriptionTier === 'pro') {
    return user.subscriptionTier;
  }
  if (user.trialTier && user.trialEndDate && user.trialEndDate > new Date()) {
    return user.trialTier;
  }
  return user.subscriptionTier || 'free';
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in to view your watchlist');
    }

    const user = await (prisma as any).user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true, trialTier: true, trialEndDate: true },
    });

    const tier = getEffectiveTier(user || { subscriptionTier: null, trialTier: null, trialEndDate: null });
    const limit = getWatchlistLimit(tier);

    const items = await (prisma as any).companyWatchlistItem.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        companyProfile: {
          select: {
            id: true,
            slug: true,
            name: true,
            logoUrl: true,
            sector: true,
            tier: true,
            status: true,
            tags: true,
            totalFunding: true,
            marketCap: true,
            isPublic: true,
          },
        },
      },
    });

    return createSuccessResponse({
      items,
      count: items.length,
      limit: limit === Infinity ? null : limit,
      tier,
    });
  } catch (error) {
    logger.error('Failed to fetch watchlist', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch watchlist');
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in to watch companies');
    }

    const user = await (prisma as any).user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true, trialTier: true, trialEndDate: true },
    });

    const tier = getEffectiveTier(user || { subscriptionTier: null, trialTier: null, trialEndDate: null });
    const limit = getWatchlistLimit(tier);

    // Check count limit
    const currentCount = await (prisma as any).companyWatchlistItem.count({
      where: { userId: session.user.id },
    });

    if (currentCount >= limit) {
      return validationError(
        `You've reached the maximum of ${limit} watched companies for the ${tier} tier. Upgrade to watch more.`
      );
    }

    const body = await request.json();
    const validation = validateBody(companyWatchlistSchema, body);
    if (!validation.success) {
      return validationError('Invalid watchlist data', validation.errors);
    }

    // Verify company exists
    const company = await (prisma as any).companyProfile.findUnique({
      where: { id: validation.data.companyProfileId },
      select: { id: true, name: true },
    });
    if (!company) {
      return validationError('Company not found');
    }

    // Check for existing watch (dedup)
    const existing = await (prisma as any).companyWatchlistItem.findUnique({
      where: {
        userId_companyProfileId: {
          userId: session.user.id,
          companyProfileId: validation.data.companyProfileId,
        },
      },
    });
    if (existing) {
      return createSuccessResponse({ item: existing, alreadyWatching: true });
    }

    const item = await (prisma as any).companyWatchlistItem.create({
      data: {
        userId: session.user.id,
        companyProfileId: validation.data.companyProfileId,
        priority: validation.data.priority,
        notifyNews: validation.data.notifyNews,
        notifyContracts: validation.data.notifyContracts,
        notifyListings: validation.data.notifyListings,
        notes: validation.data.notes,
      },
      include: {
        companyProfile: {
          select: { id: true, slug: true, name: true },
        },
      },
    });

    logger.info('Company added to watchlist', {
      userId: session.user.id,
      companyId: validation.data.companyProfileId,
      companyName: company.name,
    });

    return createSuccessResponse({ item }, 201);
  } catch (error) {
    logger.error('Failed to add to watchlist', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to add to watchlist');
  }
}
