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

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in');
    }

    const { searchParams } = new URL(request.url);
    const companyProfileId = searchParams.get('companyProfileId');

    if (!companyProfileId) {
      return validationError('companyProfileId is required');
    }

    const item = await (prisma as any).companyWatchlistItem.findUnique({
      where: {
        userId_companyProfileId: {
          userId: session.user.id,
          companyProfileId,
        },
      },
    });

    return createSuccessResponse({
      watching: !!item,
      item: item || null,
    });
  } catch (error) {
    logger.error('Failed to check watchlist status', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to check watchlist status');
  }
}
