import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { createSuccessResponse, internalError, validationError } from '@/lib/errors';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { requireResearchAccess } from '@/lib/research-guard';
import {
  RESEARCH_SCREEN_ALERT_CADENCES,
  describeScreenCriteria,
  researchScreenCriteriaSchema,
  type ResearchScreenCriteria,
} from '@/lib/research-screens';

export const dynamic = 'force-dynamic';

const MAX_SCREENS_PER_USER = 50;

export async function GET() {
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  try {
    const screens = await prisma.researchScreen.findMany({
      where: { userId: session!.user!.id },
      orderBy: { updatedAt: 'desc' },
    });
    return createSuccessResponse({
      screens: screens.map((s) => ({
        id: s.id,
        name: s.name,
        criteria: s.criteria,
        summary: describeScreenCriteria((s.criteria ?? {}) as ResearchScreenCriteria),
        alertCadence: s.alertCadence,
        lastRunAt: s.lastRunAt?.toISOString() ?? null,
        lastResultCount: s.lastResultCount,
        lastAlertAt: s.lastAlertAt?.toISOString() ?? null,
        updatedAt: s.updatedAt.toISOString(),
      })),
      limit: MAX_SCREENS_PER_USER,
      alertCadences: RESEARCH_SCREEN_ALERT_CADENCES,
    });
  } catch (error) {
    logger.error('Failed to list research screens', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not load your screens.');
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  let body: { name?: unknown; criteria?: unknown; alertCadence?: unknown };
  try {
    body = await req.json();
  } catch {
    return validationError('Request body must be JSON.');
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 120) {
    return validationError('Give the screen a name of 1-120 characters.');
  }

  const cadence = typeof body.alertCadence === 'string' ? body.alertCadence : 'none';
  if (!(RESEARCH_SCREEN_ALERT_CADENCES as readonly string[]).includes(cadence)) {
    return validationError(
      `alertCadence must be one of: ${RESEARCH_SCREEN_ALERT_CADENCES.join(', ')}`
    );
  }

  const parsed = researchScreenCriteriaSchema.safeParse(body.criteria ?? {});
  if (!parsed.success) {
    return validationError(
      parsed.error.issues[0]?.message || 'Those screen criteria are not valid.'
    );
  }

  try {
    const count = await prisma.researchScreen.count({ where: { userId: session!.user!.id } });
    if (count >= MAX_SCREENS_PER_USER) {
      return validationError(
        `You already have ${MAX_SCREENS_PER_USER} screens. Delete one to add another.`
      );
    }

    const created = await prisma.researchScreen.create({
      data: {
        userId: session!.user!.id,
        name,
        criteria: parsed.data,
        alertCadence: cadence,
      },
    });

    return createSuccessResponse({
      id: created.id,
      name: created.name,
      criteria: parsed.data,
      summary: describeScreenCriteria(parsed.data),
      alertCadence: created.alertCadence,
      lastRunAt: null,
      lastResultCount: 0,
    });
  } catch (error) {
    logger.error('Failed to create research screen', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not save that screen.');
  }
}
