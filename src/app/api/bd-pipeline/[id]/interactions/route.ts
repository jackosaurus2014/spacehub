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
  constrainPagination,
  constrainOffset,
} from '@/lib/errors';
import { validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const VALID_INTERACTION_TYPES = [
  'call', 'email', 'meeting', 'site_visit',
  'proposal_draft', 'proposal_submit', 'negotiation', 'teaming', 'note',
];

const createInteractionSchema = z.object({
  type: z.enum(VALID_INTERACTION_TYPES as [string, ...string[]]),
  date: z.string().datetime().optional(),
  title: z.string().max(300).optional().nullable().transform((v) => v?.trim() || null),
  notes: z.string().max(10000).optional().nullable().transform((v) => v?.trim() || null),
  contactName: z.string().max(200).optional().nullable().transform((v) => v?.trim() || null),
  contactOrg: z.string().max(200).optional().nullable().transform((v) => v?.trim() || null),
});

/** Verify user has access to the opportunity */
async function verifyOpportunityAccess(opportunityId: string, userId: string) {
  const opportunity = await prisma.bDOpportunity.findUnique({
    where: { id: opportunityId },
    select: { id: true, ownerUserId: true, companyId: true, stage: true },
  });

  if (!opportunity || opportunity.stage === 'archived') {
    return { error: notFoundError('Opportunity'), ok: false };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { claimedCompanyId: true },
  });

  const hasAccess =
    opportunity.ownerUserId === userId ||
    (user?.claimedCompanyId && user.claimedCompanyId === opportunity.companyId);

  if (!hasAccess) {
    return { error: forbiddenError(), ok: false };
  }

  return { error: null, ok: true };
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
    const { error, ok } = await verifyOpportunityAccess(id, session.user.id);
    if (!ok) return error!;

    const { searchParams } = new URL(req.url);
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '50'));
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));

    const [interactions, total] = await Promise.all([
      prisma.bDInteraction.findMany({
        where: { opportunityId: id },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.bDInteraction.count({ where: { opportunityId: id } }),
    ]);

    return NextResponse.json({
      success: true,
      data: { interactions, total, hasMore: offset + interactions.length < total },
    });
  } catch (error) {
    logger.error('Error fetching BD interactions', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch interactions');
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { id } = await params;
    const { error, ok } = await verifyOpportunityAccess(id, session.user.id);
    if (!ok) return error!;

    const body = await req.json();
    const validation = validateBody(createInteractionSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const data = validation.data;

    const interaction = await prisma.bDInteraction.create({
      data: {
        opportunityId: id,
        type: data.type,
        date: data.date ? new Date(data.date) : new Date(),
        title: data.title,
        notes: data.notes,
        contactName: data.contactName,
        contactOrg: data.contactOrg,
      },
    });

    logger.info('BD interaction created', {
      id: interaction.id,
      opportunityId: id,
      type: interaction.type,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, data: interaction }, { status: 201 });
  } catch (error) {
    logger.error('Error creating BD interaction', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to create interaction');
  }
}
