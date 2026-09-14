import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { createSuccessResponse, internalError, notFoundError } from '@/lib/errors';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { requireResearchAccess } from '@/lib/research-guard';
import {
  describeScreenCriteria,
  newResultIds,
  runResearchScreen,
  type ResearchScreenCriteria,
} from '@/lib/research-screens';

export const dynamic = 'force-dynamic';

/**
 * Run a saved screen now and record the result fingerprint.
 *
 * POST, not GET: it writes lastRunAt / lastResultIds, which is what makes the
 * weekly alert fire on a CHANGE rather than on a timer. Running the screen
 * therefore also acknowledges what is currently in it.
 */
export async function POST(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  const screen = await prisma.researchScreen.findFirst({
    where: { id, userId: session!.user!.id },
  });
  if (!screen) return notFoundError('Screen not found.');

  try {
    const criteria = (screen.criteria ?? {}) as ResearchScreenCriteria;
    const result = await runResearchScreen(criteria);
    const added = newResultIds(screen.lastResultIds, result.resultIds);

    await prisma.researchScreen.update({
      where: { id: screen.id },
      data: {
        lastRunAt: new Date(),
        lastResultCount: result.count,
        lastResultIds: result.resultIds,
      },
    });

    return createSuccessResponse({
      id: screen.id,
      name: screen.name,
      summary: describeScreenCriteria(criteria),
      ...result,
      newSinceLastRun: added.length,
    });
  } catch (error) {
    logger.error('Research screen run failed', {
      screenId: id,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not run that screen.');
  }
}
