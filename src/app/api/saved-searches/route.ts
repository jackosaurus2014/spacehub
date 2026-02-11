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
import { validateBody, generalSavedSearchSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

function getSavedSearchLimit(tier: string | null | undefined): number {
  if (tier === 'enterprise') return Infinity;
  if (tier === 'pro') return 20;
  return 5; // free
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
      return unauthorizedError('You must be logged in to view saved searches');
    }

    const { searchParams } = new URL(request.url);
    const searchType = searchParams.get('searchType');

    const where: Record<string, unknown> = { userId: session.user.id };
    if (searchType) {
      where.searchType = searchType;
    }

    const user = await (prisma as any).user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true, trialTier: true, trialEndDate: true },
    });

    const tier = getEffectiveTier(user || { subscriptionTier: null, trialTier: null, trialEndDate: null });
    const limit = getSavedSearchLimit(tier);

    const savedSearches = await (prisma as any).savedSearch.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return createSuccessResponse({
      savedSearches,
      count: savedSearches.length,
      limit: limit === Infinity ? null : limit,
      tier,
    });
  } catch (error) {
    logger.error('Failed to fetch saved searches', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch saved searches');
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in to save searches');
    }

    const user = await (prisma as any).user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true, trialTier: true, trialEndDate: true },
    });

    const tier = getEffectiveTier(user || { subscriptionTier: null, trialTier: null, trialEndDate: null });
    const limit = getSavedSearchLimit(tier);

    // Check count limit
    const currentCount = await (prisma as any).savedSearch.count({
      where: { userId: session.user.id },
    });

    if (currentCount >= limit) {
      return validationError(
        `You've reached the maximum of ${limit} saved searches for the ${tier} tier. Upgrade to save more.`
      );
    }

    const body = await request.json();
    const validation = validateBody(generalSavedSearchSchema, body);
    if (!validation.success) {
      return validationError('Invalid search data', validation.errors);
    }

    const savedSearch = await (prisma as any).savedSearch.create({
      data: {
        userId: session.user.id,
        name: validation.data.name,
        searchType: validation.data.searchType,
        filters: validation.data.filters as any,
        query: validation.data.query,
        alertEnabled: validation.data.alertEnabled,
      },
    });

    logger.info('Saved search created', {
      userId: session.user.id,
      searchId: savedSearch.id,
      searchType: validation.data.searchType,
    });

    return createSuccessResponse({ savedSearch }, 201);
  } catch (error) {
    logger.error('Failed to create saved search', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create saved search');
  }
}
