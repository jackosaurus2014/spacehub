import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  internalError,
  unauthorizedError,
  forbiddenError,
  validationError,
  createSuccessResponse,
} from '@/lib/errors';
import { validateBody, savedSearchSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in to view saved searches');
    }

    // Check subscription tier (Pro+ required)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        trialTier: true,
        trialEndDate: true,
      },
    });

    const hasAccess =
      user?.subscriptionTier === 'pro' ||
      user?.subscriptionTier === 'enterprise' ||
      (user?.trialTier && user.trialEndDate && user.trialEndDate > new Date());

    if (!hasAccess) {
      return forbiddenError('Saved searches require a Pro or Enterprise subscription');
    }

    const savedSearches = await prisma.savedProcurementSearch.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        matches: {
          where: { isNew: true },
          select: { id: true },
        },
      },
    });

    const result = savedSearches.map((s) => ({
      id: s.id,
      name: s.name,
      filters: s.filters,
      alertEnabled: s.alertEnabled,
      lastCheckedAt: s.lastCheckedAt,
      newMatchCount: s.matches.length,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return createSuccessResponse({ savedSearches: result });
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

    // Check subscription tier
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        trialTier: true,
        trialEndDate: true,
      },
    });

    const hasAccess =
      user?.subscriptionTier === 'pro' ||
      user?.subscriptionTier === 'enterprise' ||
      (user?.trialTier && user.trialEndDate && user.trialEndDate > new Date());

    if (!hasAccess) {
      return forbiddenError('Saved searches require a Pro or Enterprise subscription');
    }

    // Limit saved searches to 10
    const existingCount = await prisma.savedProcurementSearch.count({
      where: { userId: session.user.id },
    });

    if (existingCount >= 10) {
      return validationError('Maximum of 10 saved searches allowed');
    }

    const body = await request.json();
    const validation = validateBody(savedSearchSchema, body);

    if (!validation.success) {
      return validationError('Invalid search data', validation.errors);
    }

    const savedSearch = await prisma.savedProcurementSearch.create({
      data: {
        userId: session.user.id,
        name: validation.data.name,
        filters: validation.data.filters,
        alertEnabled: validation.data.alertEnabled,
      },
    });

    logger.info('Saved procurement search created', {
      userId: session.user.id,
      searchId: savedSearch.id,
    });

    return createSuccessResponse(savedSearch, 201);
  } catch (error) {
    logger.error('Failed to create saved search', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create saved search');
  }
}
