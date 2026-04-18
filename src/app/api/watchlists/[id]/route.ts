import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  createSuccessResponse,
  forbiddenError,
  internalError,
  notFoundError,
  unauthorizedError,
  validationError,
} from '@/lib/errors';
import {
  updateWatchlistItemSchema,
  validateBody,
} from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in');
    }

    const { id } = params;
    if (!id) return validationError('Watchlist item id is required');

    const existing = await prisma.watchlistItem.findUnique({ where: { id } });
    if (!existing) return notFoundError('Watchlist item');
    if (existing.userId !== session.user.id) {
      return forbiddenError('Not authorized to update this item');
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return validationError('Invalid request body');
    }

    const validation = validateBody(updateWatchlistItemSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const data: { alertLevel?: string; notes?: string | null } = {};
    if (validation.data.alertLevel !== undefined) {
      data.alertLevel = validation.data.alertLevel;
    }
    if (validation.data.notes !== undefined) {
      data.notes = validation.data.notes ?? null;
    }

    const updated = await prisma.watchlistItem.update({
      where: { id },
      data,
    });

    return createSuccessResponse({ item: updated });
  } catch (error) {
    logger.error('Failed to update watchlist item', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update watchlist item');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in');
    }

    const { id } = params;
    if (!id) return validationError('Watchlist item id is required');

    const existing = await prisma.watchlistItem.findUnique({ where: { id } });
    if (!existing) return notFoundError('Watchlist item');
    if (existing.userId !== session.user.id) {
      return forbiddenError('Not authorized to delete this item');
    }

    await prisma.watchlistItem.delete({ where: { id } });

    logger.info('Watchlist item removed', {
      userId: session.user.id,
      entityType: existing.entityType,
      entityId: existing.entityId,
    });

    return createSuccessResponse({ deleted: true });
  } catch (error) {
    logger.error('Failed to delete watchlist item', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete watchlist item');
  }
}
