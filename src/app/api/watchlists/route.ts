import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  createSuccessResponse,
  internalError,
  unauthorizedError,
  validationError,
} from '@/lib/errors';
import {
  createWatchlistItemSchema,
  validateBody,
  WATCHLIST_ENTITY_TYPES,
  type WatchlistEntityType,
} from '@/lib/validations';

export const dynamic = 'force-dynamic';

function isEntityType(value: string | null): value is WatchlistEntityType {
  return (
    value !== null &&
    (WATCHLIST_ENTITY_TYPES as readonly string[]).includes(value)
  );
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in to view your watchlists');
    }

    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type');

    const where: { userId: string; entityType?: WatchlistEntityType } = {
      userId: session.user.id,
    };
    if (typeParam) {
      if (!isEntityType(typeParam)) {
        return validationError('Invalid entity type');
      }
      where.entityType = typeParam;
    }

    const items = await prisma.watchlistItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return createSuccessResponse({
      items,
      count: items.length,
    });
  } catch (error) {
    logger.error('Failed to fetch watchlist items', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch watchlist items');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in to add to your watchlist');
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return validationError('Invalid request body');
    }

    const validation = validateBody(createWatchlistItemSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { entityType, entityId, entityLabel, alertLevel, notes } =
      validation.data;

    const existing = await prisma.watchlistItem.findUnique({
      where: {
        userId_entityType_entityId: {
          userId: session.user.id,
          entityType,
          entityId,
        },
      },
    });

    if (existing) {
      return createSuccessResponse(
        { item: existing, alreadyWatching: true },
        200
      );
    }

    const item = await prisma.watchlistItem.create({
      data: {
        userId: session.user.id,
        entityType,
        entityId,
        entityLabel: entityLabel ?? null,
        alertLevel: alertLevel ?? 'all',
        notes: notes ?? null,
      },
    });

    logger.info('Watchlist item added', {
      userId: session.user.id,
      entityType,
      entityId,
    });

    return createSuccessResponse({ item }, 201);
  } catch (error) {
    logger.error('Failed to add watchlist item', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to add watchlist item');
  }
}
