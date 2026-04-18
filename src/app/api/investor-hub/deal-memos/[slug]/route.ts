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
import { validateBody, updateDealMemoSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

type Params = { params: { slug: string } };

function memoIsVisible(
  memo: { visibility: string; authorUserId: string; publishedAt: Date | null },
  userId: string | null,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  if (memo.authorUserId === userId) return true;
  if (!memo.publishedAt) return false; // drafts visible only to author / admin
  if (memo.visibility === 'public') return true;
  if (memo.visibility === 'logged_in' && userId) return true;
  return false;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;
    const isAdmin = Boolean(session?.user?.isAdmin);

    const memo = await prisma.dealMemo.findUnique({ where: { slug: params.slug } });
    if (!memo) return notFoundError('Deal memo');

    if (!memoIsVisible(memo, userId, isAdmin)) {
      return notFoundError('Deal memo');
    }

    const author = await prisma.user.findUnique({
      where: { id: memo.authorUserId },
      select: { id: true, name: true, verifiedBadge: true },
    });

    return createSuccessResponse({
      memo: {
        ...memo,
        author: author
          ? { id: author.id, name: author.name, verifiedBadge: author.verifiedBadge }
          : { id: memo.authorUserId, name: null, verifiedBadge: null },
      },
    });
  } catch (error) {
    logger.error('Failed to get deal memo', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to get deal memo');
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in to update a deal memo');
    }

    const memo = await prisma.dealMemo.findUnique({ where: { slug: params.slug } });
    if (!memo) return notFoundError('Deal memo');

    const isAuthor = memo.authorUserId === session.user.id;
    const isAdmin = Boolean(session.user.isAdmin);
    if (!isAuthor && !isAdmin) {
      return forbiddenError('You can only edit your own deal memos');
    }

    const body = (await request.json()) as Record<string, unknown>;
    const validation = validateBody(updateDealMemoSchema, body);
    if (!validation.success) {
      return validationError('Invalid update data', validation.errors);
    }

    const data = validation.data;
    const updateData: Record<string, unknown> = {};
    if (data.companyName !== undefined) updateData.companyName = data.companyName;
    if (data.companyId !== undefined) updateData.companyId = data.companyId;
    if (data.dealStage !== undefined) updateData.dealStage = data.dealStage;
    if (data.investmentAmount !== undefined) updateData.investmentAmount = data.investmentAmount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.thesis !== undefined) updateData.thesis = data.thesis;
    if (data.risks !== undefined) updateData.risks = data.risks;
    if (data.recommendation !== undefined) updateData.recommendation = data.recommendation;
    if (data.visibility !== undefined) updateData.visibility = data.visibility;
    if (data.publish !== undefined) {
      if (data.publish && !memo.publishedAt) {
        updateData.publishedAt = new Date();
      } else if (!data.publish) {
        updateData.publishedAt = null;
      }
    }

    const updated = await prisma.dealMemo.update({
      where: { id: memo.id },
      data: updateData,
    });

    logger.info('Deal memo updated', {
      userId: session.user.id,
      memoId: memo.id,
    });

    return createSuccessResponse({ memo: updated });
  } catch (error) {
    logger.error('Failed to update deal memo', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update deal memo');
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in to delete a deal memo');
    }

    const memo = await prisma.dealMemo.findUnique({ where: { slug: params.slug } });
    if (!memo) return notFoundError('Deal memo');

    const isAuthor = memo.authorUserId === session.user.id;
    const isAdmin = Boolean(session.user.isAdmin);
    if (!isAuthor && !isAdmin) {
      return forbiddenError('You can only delete your own deal memos');
    }

    await prisma.dealMemo.delete({ where: { id: memo.id } });

    logger.info('Deal memo deleted', {
      userId: session.user.id,
      memoId: memo.id,
    });

    return createSuccessResponse({ deleted: true });
  } catch (error) {
    logger.error('Failed to delete deal memo', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete deal memo');
  }
}
