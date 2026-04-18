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
import {
  validateBody,
  generalSavedSearchSchema,
  createSavedSearchSchema,
  GLOBAL_SEARCH_TYPES,
  SAVED_SEARCH_NOTIFY_CHANNELS,
  type GlobalSearchType,
  type SavedSearchNotifyChannel,
} from '@/lib/validations';

export const dynamic = 'force-dynamic';

/**
 * Tier limits for saved searches. Free tier is intentionally low (3) — Pro and
 * Enterprise are unlimited. The legacy company-directory / marketplace saved
 * searches share this same pool because they live in the same Prisma model.
 */
function getSavedSearchLimit(tier: string | null | undefined): number {
  if (tier === 'enterprise' || tier === 'pro') return Infinity;
  return 3; // free
}

function getEffectiveTier(user: {
  subscriptionTier: string | null;
  trialTier: string | null;
  trialEndDate: Date | null;
}): string {
  if (user.subscriptionTier === 'enterprise' || user.subscriptionTier === 'pro') {
    return user.subscriptionTier;
  }
  if (user.trialTier && user.trialEndDate && user.trialEndDate > new Date()) {
    return user.trialTier;
  }
  return user.subscriptionTier || 'free';
}

/**
 * Read the global-search-flavoured fields out of `SavedSearch.filters` (Json).
 * The DB has no `notifyVia` / `lastRunAt` / `lastResultIds` columns, so we
 * stash everything in the existing `filters` blob.
 */
function readSearchMeta(filters: unknown): {
  type: GlobalSearchType;
  notifyVia: SavedSearchNotifyChannel;
  lastRunAt: string | null;
  lastResultIds: string[];
  lastResultCount: number;
} {
  const blob = (filters && typeof filters === 'object' ? (filters as Record<string, unknown>) : {});
  const rawType = typeof blob.type === 'string' ? blob.type : 'all';
  const type = (GLOBAL_SEARCH_TYPES as readonly string[]).includes(rawType)
    ? (rawType as GlobalSearchType)
    : 'all';
  const rawNotify = typeof blob.notifyVia === 'string' ? blob.notifyVia : 'notification';
  const notifyVia = (SAVED_SEARCH_NOTIFY_CHANNELS as readonly string[]).includes(rawNotify)
    ? (rawNotify as SavedSearchNotifyChannel)
    : 'notification';
  const lastRunAt = typeof blob.lastRunAt === 'string' ? blob.lastRunAt : null;
  const lastResultIds = Array.isArray(blob.lastResultIds)
    ? blob.lastResultIds.filter((v): v is string => typeof v === 'string')
    : [];
  const lastResultCount = typeof blob.lastResultCount === 'number' ? blob.lastResultCount : 0;
  return { type, notifyVia, lastRunAt, lastResultIds, lastResultCount };
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true, trialTier: true, trialEndDate: true },
    });

    const tier = getEffectiveTier(
      user || { subscriptionTier: null, trialTier: null, trialEndDate: null }
    );
    const limit = getSavedSearchLimit(tier);

    const savedSearches = await prisma.savedSearch.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    // Decorate each row with the meta we hide in `filters`
    const decorated = savedSearches.map((s) => {
      const meta = readSearchMeta(s.filters);
      return {
        id: s.id,
        userId: s.userId,
        name: s.name,
        query: s.query,
        searchType: s.searchType,
        type: meta.type,
        notifyVia: meta.notifyVia,
        alertEnabled: s.alertEnabled,
        lastRunAt: meta.lastRunAt,
        lastResultCount: meta.lastResultCount,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });

    return createSuccessResponse({
      savedSearches: decorated,
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true, trialTier: true, trialEndDate: true },
    });

    const tier = getEffectiveTier(
      user || { subscriptionTier: null, trialTier: null, trialEndDate: null }
    );
    const limit = getSavedSearchLimit(tier);

    // Enforce shared per-user cap across all SavedSearch rows
    const currentCount = await prisma.savedSearch.count({
      where: { userId: session.user.id },
    });

    if (currentCount >= limit) {
      return validationError(
        `You've reached the maximum of ${limit} saved searches on the ${tier} tier. Upgrade to Pro for unlimited saved searches.`
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    // Two creation flavours coexist:
    //  1. Global /search dashboard payload: { name, query, type, notifyVia }
    //  2. Legacy module payload: { name, searchType, filters, query, alertEnabled }
    const isGlobalPayload =
      typeof body.type === 'string' && (typeof body.searchType !== 'string' || body.searchType === 'global_search');

    if (isGlobalPayload) {
      const validation = validateBody(createSavedSearchSchema, body);
      if (!validation.success) {
        return validationError('Invalid search data', validation.errors);
      }

      const { name, query, type, notifyVia } = validation.data;

      const filters = {
        type,
        notifyVia,
        lastRunAt: null,
        lastResultIds: [] as string[],
        lastResultCount: 0,
      };

      const savedSearch = await prisma.savedSearch.create({
        data: {
          userId: session.user.id,
          name,
          searchType: 'global_search',
          query,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          filters: filters as any,
          alertEnabled: notifyVia !== 'notification' ? true : true, // smart alerts always on for global searches
        },
      });

      logger.info('Saved global search created', {
        userId: session.user.id,
        searchId: savedSearch.id,
        type,
        notifyVia,
      });

      return createSuccessResponse(
        {
          savedSearch: {
            id: savedSearch.id,
            userId: savedSearch.userId,
            name: savedSearch.name,
            query: savedSearch.query,
            searchType: savedSearch.searchType,
            type,
            notifyVia,
            alertEnabled: savedSearch.alertEnabled,
            lastRunAt: null,
            lastResultCount: 0,
            createdAt: savedSearch.createdAt,
            updatedAt: savedSearch.updatedAt,
          },
        },
        201
      );
    }

    // Legacy module payload
    const validation = validateBody(generalSavedSearchSchema, body);
    if (!validation.success) {
      return validationError('Invalid search data', validation.errors);
    }

    const savedSearch = await prisma.savedSearch.create({
      data: {
        userId: session.user.id,
        name: validation.data.name,
        searchType: validation.data.searchType,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
