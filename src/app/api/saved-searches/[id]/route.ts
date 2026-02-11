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
    const existing = await (prisma as any).savedSearch.findUnique({
      where: { id },
    });
    if (!existing) {
      return notFoundError('Saved search not found');
    }
    if (existing.userId !== session.user.id) {
      return unauthorizedError('Not authorized to update this search');
    }

    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) {
      updateData.name = body.name.trim();
    }
    if (typeof body.alertEnabled === 'boolean') {
      updateData.alertEnabled = body.alertEnabled;
    }
    if (body.filters && typeof body.filters === 'object') {
      updateData.filters = body.filters;
    }
    if (body.query !== undefined) {
      updateData.query = typeof body.query === 'string' ? body.query.trim() || null : null;
    }

    const updated = await (prisma as any).savedSearch.update({
      where: { id },
      data: updateData,
    });

    return createSuccessResponse({ savedSearch: updated });
  } catch (error) {
    logger.error('Failed to update saved search', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update saved search');
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
    const existing = await (prisma as any).savedSearch.findUnique({
      where: { id },
    });
    if (!existing) {
      return notFoundError('Saved search not found');
    }
    if (existing.userId !== session.user.id) {
      return unauthorizedError('Not authorized to delete this search');
    }

    await (prisma as any).savedSearch.delete({
      where: { id },
    });

    logger.info('Saved search deleted', {
      userId: session.user.id,
      searchId: id,
    });

    return createSuccessResponse({ deleted: true });
  } catch (error) {
    logger.error('Failed to delete saved search', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete saved search');
  }
}
