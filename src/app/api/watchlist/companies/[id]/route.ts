import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  internalError,
  unauthorizedError,
  notFoundError,
  createSuccessResponse,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in');
    }

    const { id } = await params;

    // Ownership check
    const existing = await (prisma as any).companyWatchlistItem.findUnique({
      where: { id },
    });
    if (!existing) {
      return notFoundError('Watchlist item not found');
    }
    if (existing.userId !== session.user.id) {
      return unauthorizedError('Not authorized to update this item');
    }

    const body = await request.json();

    // Only allow updating specific fields
    const updateData: Record<string, unknown> = {};
    if (body.priority !== undefined && ['high', 'medium', 'low'].includes(body.priority)) {
      updateData.priority = body.priority;
    }
    if (typeof body.notifyNews === 'boolean') updateData.notifyNews = body.notifyNews;
    if (typeof body.notifyContracts === 'boolean') updateData.notifyContracts = body.notifyContracts;
    if (typeof body.notifyListings === 'boolean') updateData.notifyListings = body.notifyListings;
    if (body.notes !== undefined) {
      updateData.notes = typeof body.notes === 'string' ? body.notes.trim() || null : null;
    }

    const updated = await (prisma as any).companyWatchlistItem.update({
      where: { id },
      data: updateData,
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in');
    }

    const { id } = await params;

    // Ownership check
    const existing = await (prisma as any).companyWatchlistItem.findUnique({
      where: { id },
    });
    if (!existing) {
      return notFoundError('Watchlist item not found');
    }
    if (existing.userId !== session.user.id) {
      return unauthorizedError('Not authorized to delete this item');
    }

    await (prisma as any).companyWatchlistItem.delete({
      where: { id },
    });

    logger.info('Company removed from watchlist', {
      userId: session.user.id,
      companyId: existing.companyProfileId,
    });

    return createSuccessResponse({ deleted: true });
  } catch (error) {
    logger.error('Failed to delete watchlist item', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete watchlist item');
  }
}
