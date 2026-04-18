import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  internalError,
  unauthorizedError,
  notFoundError,
  validationError,
  createSuccessResponse,
} from '@/lib/errors';
import {
  updateSavedSearchSchema,
  validateBody,
  GLOBAL_SEARCH_TYPES,
  SAVED_SEARCH_NOTIFY_CHANNELS,
  type GlobalSearchType,
  type SavedSearchNotifyChannel,
} from '@/lib/validations';

export const dynamic = 'force-dynamic';

function readSearchMeta(filters: unknown): {
  type: GlobalSearchType;
  notifyVia: SavedSearchNotifyChannel;
  lastRunAt: string | null;
  lastResultIds: string[];
  lastResultCount: number;
} {
  const blob = filters && typeof filters === 'object' ? (filters as Record<string, unknown>) : {};
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

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in');
    }

    const { id } = params;
    const existing = await prisma.savedSearch.findUnique({ where: { id } });
    if (!existing) return notFoundError('Saved search not found');
    if (existing.userId !== session.user.id) {
      return unauthorizedError('Not authorized to view this search');
    }

    const meta = readSearchMeta(existing.filters);

    return createSuccessResponse({
      savedSearch: {
        id: existing.id,
        userId: existing.userId,
        name: existing.name,
        query: existing.query,
        searchType: existing.searchType,
        type: meta.type,
        notifyVia: meta.notifyVia,
        alertEnabled: existing.alertEnabled,
        lastRunAt: meta.lastRunAt,
        lastResultCount: meta.lastResultCount,
        lastResultIds: meta.lastResultIds,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch saved search', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch saved search');
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in');
    }

    const { id } = params;
    const existing = await prisma.savedSearch.findUnique({ where: { id } });
    if (!existing) return notFoundError('Saved search not found');
    if (existing.userId !== session.user.id) {
      return unauthorizedError('Not authorized to update this search');
    }

    const body = await request.json();
    const validation = validateBody(updateSavedSearchSchema, body);
    if (!validation.success) {
      return validationError('Invalid update payload', validation.errors);
    }

    const { name, query, type, notifyVia, alertEnabled } = validation.data;

    const meta = readSearchMeta(existing.filters);
    const newFilters: Record<string, unknown> = {
      ...((existing.filters && typeof existing.filters === 'object'
        ? (existing.filters as Record<string, unknown>)
        : {})),
      type: type ?? meta.type,
      notifyVia: notifyVia ?? meta.notifyVia,
      lastRunAt: meta.lastRunAt,
      lastResultIds: meta.lastResultIds,
      lastResultCount: meta.lastResultCount,
    };

    const updateData: Record<string, unknown> = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filters: newFilters as any,
    };
    if (name !== undefined) updateData.name = name;
    if (query !== undefined) updateData.query = query;
    if (alertEnabled !== undefined) updateData.alertEnabled = alertEnabled;

    const updated = await prisma.savedSearch.update({
      where: { id },
      data: updateData,
    });

    const updatedMeta = readSearchMeta(updated.filters);

    logger.info('Saved search updated', { userId: session.user.id, searchId: id });

    return createSuccessResponse({
      savedSearch: {
        id: updated.id,
        userId: updated.userId,
        name: updated.name,
        query: updated.query,
        searchType: updated.searchType,
        type: updatedMeta.type,
        notifyVia: updatedMeta.notifyVia,
        alertEnabled: updated.alertEnabled,
        lastRunAt: updatedMeta.lastRunAt,
        lastResultCount: updatedMeta.lastResultCount,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Failed to update saved search', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update saved search');
  }
}

// Kept for backward-compat with the previous module-level UI which used PUT.
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in');
    }

    const { id } = params;

    const existing = await prisma.savedSearch.findUnique({ where: { id } });
    if (!existing) return notFoundError('Saved search not found');
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

    const updated = await prisma.savedSearch.update({
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
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in');
    }

    const { id } = params;

    const existing = await prisma.savedSearch.findUnique({ where: { id } });
    if (!existing) return notFoundError('Saved search not found');
    if (existing.userId !== session.user.id) {
      return unauthorizedError('Not authorized to delete this search');
    }

    await prisma.savedSearch.delete({ where: { id } });

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
