import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  internalError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  validationError,
  createSuccessResponse,
} from '@/lib/errors';
import { validateBody, updateThesisSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

type Params = { params: { slug: string } };

export async function GET(request: Request, { params }: Params) {
  try {
    const { slug } = params;
    const thesis = await prisma.investorThesis.findUnique({ where: { slug } });
    if (!thesis) return notFoundError('Thesis');

    // Increment view count (fire-and-forget semantics)
    try {
      await prisma.investorThesis.update({
        where: { id: thesis.id },
        data: { views: { increment: 1 } },
      });
    } catch (err) {
      logger.warn('Failed to increment thesis views', {
        thesisId: thesis.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const author = await prisma.user.findUnique({
      where: { id: thesis.authorUserId },
      select: { id: true, name: true, verifiedBadge: true },
    });

    return createSuccessResponse({
      thesis: {
        ...thesis,
        views: thesis.views + 1,
        author: author
          ? { id: author.id, name: author.name, verifiedBadge: author.verifiedBadge }
          : { id: thesis.authorUserId, name: null, verifiedBadge: null },
      },
    });
  } catch (error) {
    logger.error('Failed to get investor thesis', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to get investor thesis');
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in to update a thesis');
    }

    const thesis = await prisma.investorThesis.findUnique({
      where: { slug: params.slug },
    });
    if (!thesis) return notFoundError('Thesis');

    const isAuthor = thesis.authorUserId === session.user.id;
    const isAdmin = Boolean(session.user.isAdmin);
    if (!isAuthor && !isAdmin) {
      return forbiddenError('You can only edit your own theses');
    }

    const body = (await request.json()) as Record<string, unknown>;
    const validation = validateBody(updateThesisSchema, body);
    if (!validation.success) {
      return validationError('Invalid update data', validation.errors);
    }

    const data = validation.data;
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.bodyMd !== undefined) updateData.bodyMd = data.bodyMd;
    if (data.sectors !== undefined) updateData.sectors = data.sectors;
    if (data.stagePreference !== undefined) updateData.stagePreference = data.stagePreference;
    if (data.geography !== undefined) updateData.geography = data.geography;
    if (data.publish !== undefined) {
      if (data.publish && !thesis.publishedAt) {
        updateData.publishedAt = new Date();
      } else if (!data.publish) {
        updateData.publishedAt = null;
      }
    }

    const updated = await prisma.investorThesis.update({
      where: { id: thesis.id },
      data: updateData,
    });

    logger.info('Investor thesis updated', {
      userId: session.user.id,
      thesisId: thesis.id,
    });

    return createSuccessResponse({ thesis: updated });
  } catch (error) {
    logger.error('Failed to update investor thesis', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update investor thesis');
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in to delete a thesis');
    }

    const thesis = await prisma.investorThesis.findUnique({
      where: { slug: params.slug },
    });
    if (!thesis) return notFoundError('Thesis');

    const isAuthor = thesis.authorUserId === session.user.id;
    const isAdmin = Boolean(session.user.isAdmin);
    if (!isAuthor && !isAdmin) {
      return forbiddenError('You can only delete your own theses');
    }

    await prisma.investorThesis.delete({ where: { id: thesis.id } });

    logger.info('Investor thesis deleted', {
      userId: session.user.id,
      thesisId: thesis.id,
    });

    return createSuccessResponse({ deleted: true });
  } catch (error) {
    logger.error('Failed to delete investor thesis', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete investor thesis');
  }
}
