import { prisma } from '@/lib/db';
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
import { validateBody, savedSearchSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in to update saved searches');
    }

    const existing = await prisma.savedProcurementSearch.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!existing) {
      return notFoundError('Saved search');
    }

    if (existing.userId !== session.user.id) {
      return unauthorizedError('You can only update your own saved searches');
    }

    const body = await request.json();
    const validation = validateBody(savedSearchSchema.partial(), body);

    if (!validation.success) {
      return validationError('Invalid update data', validation.errors);
    }

    const updated = await prisma.savedProcurementSearch.update({
      where: { id: params.id },
      data: {
        ...(validation.data.name && { name: validation.data.name }),
        ...(validation.data.filters && { filters: validation.data.filters }),
        ...(validation.data.alertEnabled !== undefined && {
          alertEnabled: validation.data.alertEnabled,
        }),
      },
    });

    logger.info('Saved procurement search updated', {
      userId: session.user.id,
      searchId: params.id,
    });

    return createSuccessResponse(updated);
  } catch (error) {
    logger.error('Failed to update saved search', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update saved search');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in to delete saved searches');
    }

    const existing = await prisma.savedProcurementSearch.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!existing) {
      return notFoundError('Saved search');
    }

    if (existing.userId !== session.user.id) {
      return unauthorizedError('You can only delete your own saved searches');
    }

    await prisma.savedProcurementSearch.delete({
      where: { id: params.id },
    });

    logger.info('Saved procurement search deleted', {
      userId: session.user.id,
      searchId: params.id,
    });

    return createSuccessResponse({ deleted: true });
  } catch (error) {
    logger.error('Failed to delete saved search', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete saved search');
  }
}
