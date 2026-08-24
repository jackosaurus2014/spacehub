import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import {
  forbiddenError,
  internalError,
  unauthorizedError,
  validationError,
} from '@/lib/errors';
import { validateBody, generateDebriefSchema } from '@/lib/validations';
import { generateDebriefDraft } from '@/lib/mission-debrief-generator';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/mission-debriefs/generate-ai
 *
 * Admin-only manual generation. Returns a draft WITHOUT saving — the admin
 * form hydrates from it, and the admin edits and saves/publishes explicitly.
 *
 * The generation pipeline itself lives in src/lib/mission-debrief-generator
 * and is shared with the daily cron, which enriches and auto-publishes
 * unattended (see /api/cron/mission-debriefs). This route is the manual
 * override path.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return unauthorizedError();
    if (!session.user.isAdmin) return forbiddenError('Admin access required');

    const body = await request.json().catch(() => ({}));
    const validation = validateBody(generateDebriefSchema, body);
    if (!validation.success) {
      return validationError('Invalid generate request', validation.errors);
    }
    const { eventId, additionalContext } = validation.data;

    const result = await generateDebriefDraft(eventId, additionalContext);

    logger.info('Mission debrief AI draft generated (admin)', {
      eventId,
      missionName: result.event.name,
      takeaways: result.draft.keyTakeaways.length,
      userId: session.user.id,
    });

    return NextResponse.json({
      draft: result.draft,
      missionName: result.event.name,
      missionDate: result.event.launchDate?.toISOString() ?? null,
      eventId: result.event.id,
      suggestedCompanyIds: result.suggestedCompanyIds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not found/i.test(message)) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message } },
        { status: 404 },
      );
    }
    logger.error('Mission debrief AI generation failed', { error: message });
    return internalError('AI generation failed');
  }
}
