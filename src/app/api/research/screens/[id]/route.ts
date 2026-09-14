import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { createSuccessResponse, internalError, notFoundError, validationError } from '@/lib/errors';
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

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  const screen = await prisma.researchScreen.findFirst({
    where: { id, userId: session!.user!.id },
  });
  if (!screen) return notFoundError('Screen not found.');

  return createSuccessResponse({
    id: screen.id,
    name: screen.name,
    criteria: screen.criteria,
    summary: describeScreenCriteria((screen.criteria ?? {}) as ResearchScreenCriteria),
    alertCadence: screen.alertCadence,
    lastRunAt: screen.lastRunAt?.toISOString() ?? null,
    lastResultCount: screen.lastResultCount,
  });
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  const existing = await prisma.researchScreen.findFirst({
    where: { id, userId: session!.user!.id },
  });
  if (!existing) return notFoundError('Screen not found.');

  let body: { name?: unknown; criteria?: unknown; alertCadence?: unknown };
  try {
    body = await req.json();
  } catch {
    return validationError('Request body must be JSON.');
  }

  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 120) return validationError('Name must be 1-120 characters.');
    data.name = name;
  }

  if (body.alertCadence !== undefined) {
    const cadence = typeof body.alertCadence === 'string' ? body.alertCadence : '';
    if (!(RESEARCH_SCREEN_ALERT_CADENCES as readonly string[]).includes(cadence)) {
      return validationError(
        `alertCadence must be one of: ${RESEARCH_SCREEN_ALERT_CADENCES.join(', ')}`
      );
    }
    data.alertCadence = cadence;
  }

  if (body.criteria !== undefined) {
    const parsed = researchScreenCriteriaSchema.safeParse(body.criteria);
    if (!parsed.success) {
      return validationError(
        parsed.error.issues[0]?.message || 'Those screen criteria are not valid.'
      );
    }
    data.criteria = parsed.data;
    // The saved fingerprint belongs to the OLD criteria. Keeping it would make
    // the next alert claim every row is new; clearing it makes the next run a
    // baseline instead of a false alarm.
    data.lastResultIds = [];
    data.lastResultCount = 0;
    data.lastRunAt = null;
  }

  if (Object.keys(data).length === 0) {
    return validationError('Nothing to update.');
  }

  try {
    const updated = await prisma.researchScreen.update({ where: { id: existing.id }, data });
    return createSuccessResponse({
      id: updated.id,
      name: updated.name,
      criteria: updated.criteria,
      summary: describeScreenCriteria((updated.criteria ?? {}) as ResearchScreenCriteria),
      alertCadence: updated.alertCadence,
      lastRunAt: updated.lastRunAt?.toISOString() ?? null,
      lastResultCount: updated.lastResultCount,
    });
  } catch (error) {
    logger.error('Failed to update research screen', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not update that screen.');
  }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  const existing = await prisma.researchScreen.findFirst({
    where: { id, userId: session!.user!.id },
  });
  if (!existing) return notFoundError('Screen not found.');

  try {
    await prisma.researchScreen.delete({ where: { id: existing.id } });
    return createSuccessResponse({ deleted: true, id: existing.id });
  } catch (error) {
    logger.error('Failed to delete research screen', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not delete that screen.');
  }
}
