import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDesk } from '@/lib/desk';
import { createSuccessResponse, internalError, unauthorizedError } from '@/lib/errors';
import { logger } from '@/lib/logger';

// JSON mirror of /desk (growth plan G6) — same composition, same shape, for
// the mobile app and any client that wants the desk without the page. Note
// that a GET here advances the since-watermark exactly like a page visit.

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in to view your desk');
    }
    const desk = await getDesk(session.user.id, session.user.email);
    return createSuccessResponse(desk);
  } catch (error) {
    logger.error('[api/desk] failed', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to load your desk');
  }
}
