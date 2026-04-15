import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { z } from 'zod';
import {
  validationError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  internalError,
} from '@/lib/errors';
import { validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const VALID_STAGES = [
  'discovery', 'pursuit', 'capture', 'proposal',
  'submitted', 'evaluation', 'award', 'lost', 'on_hold', 'archived',
];

const VALID_CLEARANCE_LEVELS = ['none', 'secret', 'top_secret', 'ts_sci'];
const VALID_SET_ASIDES = ['8(a)', 'HUBZone', 'WOSB', 'SDVOSB'];

const updateBDOpportunitySchema = z.object({
  title: z.string().min(1).max(300).transform((v) => v.trim()).optional(),
  description: z.string().max(10000).optional().nullable(),
  opportunityType: z.enum(['procurement', 'partnership', 'funding', 'teaming', 'contract_renewal', 'sbir']).optional(),
  externalId: z.string().max(255).optional().nullable(),
  agency: z.string().max(200).optional().nullable(),
  naicsCode: z.string().max(20).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  valueEstimated: z.number().min(0).optional().nullable(),
  itarRequired: z.boolean().optional(),
  clearanceRequired: z
    .enum(VALID_CLEARANCE_LEVELS as [string, ...string[]])
    .optional()
    .nullable(),
  setAsideEligibility: z
    .array(z.enum(VALID_SET_ASIDES as [string, ...string[]]))
    .optional(),
  solicitationNumber: z.string().max(100).optional().nullable(),
  samUrl: z.string().url().optional().nullable(),
  stage: z.enum(VALID_STAGES as [string, ...string[]]).optional(),
  probability: z.number().int().min(0).max(100).optional().nullable(),
  expectedCloseDate: z.string().datetime().optional().nullable(),
  proposalDeadline: z.string().datetime().optional().nullable(),
  wonAmount: z.number().min(0).optional().nullable(),
  lostReason: z.string().max(1000).optional().nullable(),
});

/** Verify user owns or belongs to the opportunity's company */
async function verifyAccess(opportunityId: string, userId: string) {
  const opportunity = await prisma.bDOpportunity.findUnique({
    where: { id: opportunityId },
    select: {
      id: true,
      ownerUserId: true,
      companyId: true,
      stage: true,
    },
  });

  if (!opportunity || opportunity.stage === 'archived') {
    return { error: notFoundError('Opportunity'), opportunity: null };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { claimedCompanyId: true },
  });

  const hasAccess =
    opportunity.ownerUserId === userId ||
    (user?.claimedCompanyId && user.claimedCompanyId === opportunity.companyId);

  if (!hasAccess) {
    return { error: forbiddenError(), opportunity: null };
  }

  return { error: null, opportunity };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { id } = await params;
    const { error } = await verifyAccess(id, session.user.id);
    if (error) return error;

    const opportunity = await prisma.bDOpportunity.findUnique({
      where: { id },
      include: {
        interactions: {
          orderBy: { date: 'desc' },
          take: 50,
        },
        company: { select: { id: true, name: true, slug: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: opportunity });
  } catch (error) {
    logger.error('Error fetching BD opportunity', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch BD opportunity');
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { id } = await params;
    const { error, opportunity: existing } = await verifyAccess(id, session.user.id);
    if (error || !existing) return error!;

    const body = await req.json();
    const validation = validateBody(updateBDOpportunitySchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const data = validation.data;

    // Auto-set timestamps on stage change
    const stageTimestamps: Record<string, Date | null> = {};
    if (data.stage && data.stage !== existing.stage) {
      const now = new Date();
      if (data.stage === 'pursuit') stageTimestamps.pursuitStartedAt = now;
      if (data.stage === 'submitted') stageTimestamps.proposalSubmittedAt = now;
      if (data.stage === 'award') stageTimestamps.awardedAt = now;
      if (data.stage === 'lost') stageTimestamps.lostAt = now;
    }

    const updateData: Record<string, unknown> = {};
    // Only include fields that were provided
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.opportunityType !== undefined) updateData.opportunityType = data.opportunityType;
    if (data.externalId !== undefined) updateData.externalId = data.externalId;
    if (data.agency !== undefined) updateData.agency = data.agency;
    if (data.naicsCode !== undefined) updateData.naicsCode = data.naicsCode;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.valueEstimated !== undefined) updateData.valueEstimated = data.valueEstimated;
    if (data.itarRequired !== undefined) updateData.itarRequired = data.itarRequired;
    if (data.clearanceRequired !== undefined) updateData.clearanceRequired = data.clearanceRequired;
    if (data.setAsideEligibility !== undefined) updateData.setAsideEligibility = data.setAsideEligibility;
    if (data.solicitationNumber !== undefined) updateData.solicitationNumber = data.solicitationNumber;
    if (data.samUrl !== undefined) updateData.samUrl = data.samUrl;
    if (data.stage !== undefined) updateData.stage = data.stage;
    if (data.probability !== undefined) updateData.probability = data.probability;
    if (data.expectedCloseDate !== undefined) {
      updateData.expectedCloseDate = data.expectedCloseDate ? new Date(data.expectedCloseDate) : null;
    }
    if (data.proposalDeadline !== undefined) {
      updateData.proposalDeadline = data.proposalDeadline ? new Date(data.proposalDeadline) : null;
    }
    if (data.wonAmount !== undefined) updateData.wonAmount = data.wonAmount;
    if (data.lostReason !== undefined) updateData.lostReason = data.lostReason;

    const updated = await prisma.bDOpportunity.update({
      where: { id },
      data: {
        ...updateData,
        ...stageTimestamps,
      },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        _count: { select: { interactions: true } },
      },
    });

    logger.info('BD opportunity updated', {
      id: updated.id,
      stage: updated.stage,
      userId: session.user.id,
      changedStage: data.stage ? `${existing.stage} -> ${data.stage}` : undefined,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating BD opportunity', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to update BD opportunity');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { id } = await params;
    const { error } = await verifyAccess(id, session.user.id);
    if (error) return error;

    // Soft delete: set stage to 'archived'
    await prisma.bDOpportunity.update({
      where: { id },
      data: { stage: 'archived' },
    });

    logger.info('BD opportunity archived', { id, userId: session.user.id });

    return NextResponse.json({ success: true, data: { message: 'Opportunity archived' } });
  } catch (error) {
    logger.error('Error archiving BD opportunity', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to archive BD opportunity');
  }
}
