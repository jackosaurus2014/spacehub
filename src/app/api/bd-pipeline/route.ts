import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { z } from 'zod';
import {
  validationError,
  unauthorizedError,
  forbiddenError,
  internalError,
  constrainPagination,
  constrainOffset,
} from '@/lib/errors';
import { validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const VALID_STAGES = [
  'discovery', 'pursuit', 'capture', 'proposal',
  'submitted', 'evaluation', 'award', 'lost', 'on_hold',
];

const VALID_OPPORTUNITY_TYPES = [
  'procurement', 'partnership', 'funding', 'teaming', 'contract_renewal', 'sbir',
];

const VALID_CLEARANCE_LEVELS = ['none', 'secret', 'top_secret', 'ts_sci'];

const VALID_SET_ASIDES = ['8(a)', 'HUBZone', 'WOSB', 'SDVOSB'];

// --- Zod schema for creating a BD opportunity ---
const createBDOpportunitySchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(300, 'Title is too long')
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(10000, 'Description is too long')
    .optional()
    .transform((val) => val?.trim() || null),
  opportunityType: z
    .enum(VALID_OPPORTUNITY_TYPES as [string, ...string[]])
    .default('procurement'),
  externalId: z.string().max(255).optional().nullable(),
  agency: z.string().max(200).optional().nullable(),
  naicsCode: z.string().max(20).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  valueEstimated: z.number().min(0).optional().nullable(),
  itarRequired: z.boolean().default(false),
  clearanceRequired: z
    .enum(VALID_CLEARANCE_LEVELS as [string, ...string[]])
    .optional()
    .nullable(),
  setAsideEligibility: z
    .array(z.enum(VALID_SET_ASIDES as [string, ...string[]]))
    .default([]),
  solicitationNumber: z.string().max(100).optional().nullable(),
  samUrl: z.string().url().optional().nullable(),
  stage: z
    .enum(VALID_STAGES as [string, ...string[]])
    .default('discovery'),
  probability: z.number().int().min(0).max(100).optional().nullable(),
  expectedCloseDate: z.string().datetime().optional().nullable(),
  proposalDeadline: z.string().datetime().optional().nullable(),
});

function getEffectiveTier(user: { subscriptionTier: string | null; trialTier: string | null; trialEndDate: Date | null }): string {
  if (user.subscriptionTier === 'enterprise' || user.subscriptionTier === 'pro') {
    return user.subscriptionTier;
  }
  if (user.trialTier && user.trialEndDate && user.trialEndDate > new Date()) {
    return user.trialTier;
  }
  return user.subscriptionTier || 'free';
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { searchParams } = new URL(req.url);
    const stage = searchParams.get('stage');
    const agency = searchParams.get('agency');
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '50'));
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));

    // Build filter: user's own opportunities OR their claimed company's opportunities
    const where: Record<string, unknown> = {};

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { claimedCompanyId: true, subscriptionTier: true, trialTier: true, trialEndDate: true },
    });

    if (user?.claimedCompanyId) {
      where.OR = [
        { ownerUserId: session.user.id },
        { companyId: user.claimedCompanyId },
      ];
    } else {
      where.ownerUserId = session.user.id;
    }

    // Exclude archived (soft-deleted)
    where.stage = stage && VALID_STAGES.includes(stage)
      ? stage
      : { not: 'archived' };

    if (agency) {
      where.agency = agency;
    }

    // Determine effective tier for free-tier limits
    const tier = getEffectiveTier({
      subscriptionTier: user?.subscriptionTier ?? null,
      trialTier: user?.trialTier ?? null,
      trialEndDate: user?.trialEndDate ?? null,
    });
    const isFree = tier === 'free';

    const [opportunities, total] = await Promise.all([
      prisma.bDOpportunity.findMany({
        where,
        orderBy: [{ stage: 'asc' }, { expectedCloseDate: 'asc' }, { createdAt: 'desc' }],
        take: isFree ? Math.min(limit, 3) : limit,
        skip: isFree ? 0 : offset,
        include: {
          _count: { select: { interactions: true } },
          company: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.bDOpportunity.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        opportunities,
        total,
        hasMore: offset + opportunities.length < total,
      },
    });
  } catch (error) {
    logger.error('Error fetching BD pipeline', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch BD pipeline');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    // User must have a claimed company
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { claimedCompanyId: true, subscriptionTier: true, trialTier: true, trialEndDate: true },
    });

    if (!user?.claimedCompanyId) {
      return forbiddenError('You must claim a company profile before creating BD opportunities');
    }

    // Free tier limit: max 3 pipeline opportunities
    const tier = getEffectiveTier({
      subscriptionTier: user.subscriptionTier ?? null,
      trialTier: user.trialTier ?? null,
      trialEndDate: user.trialEndDate ?? null,
    });

    if (tier === 'free') {
      const existingCount = await prisma.bDOpportunity.count({
        where: { companyId: user.claimedCompanyId },
      });

      if (existingCount >= 3) {
        return forbiddenError(
          'Free accounts are limited to 3 pipeline opportunities. Upgrade to Pro for unlimited pipeline tracking.'
        );
      }
    }

    const body = await req.json();
    const validation = validateBody(createBDOpportunitySchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const data = validation.data;

    // Set stage timestamp
    const now = new Date();
    const stageTimestamps: Record<string, Date> = {};
    if (data.stage === 'pursuit') stageTimestamps.pursuitStartedAt = now;
    if (data.stage === 'submitted') stageTimestamps.proposalSubmittedAt = now;
    if (data.stage === 'award') stageTimestamps.awardedAt = now;
    if (data.stage === 'lost') stageTimestamps.lostAt = now;

    const opportunity = await prisma.bDOpportunity.create({
      data: {
        companyId: user.claimedCompanyId,
        ownerUserId: session.user.id,
        title: data.title,
        description: data.description,
        opportunityType: data.opportunityType,
        externalId: data.externalId || null,
        agency: data.agency || null,
        naicsCode: data.naicsCode || null,
        category: data.category || null,
        valueEstimated: data.valueEstimated ?? null,
        itarRequired: data.itarRequired,
        clearanceRequired: data.clearanceRequired || null,
        setAsideEligibility: data.setAsideEligibility,
        solicitationNumber: data.solicitationNumber || null,
        samUrl: data.samUrl || null,
        stage: data.stage,
        probability: data.probability ?? null,
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
        proposalDeadline: data.proposalDeadline ? new Date(data.proposalDeadline) : null,
        discoveredAt: now,
        ...stageTimestamps,
      },
      include: {
        company: { select: { id: true, name: true, slug: true } },
      },
    });

    logger.info('BD opportunity created', {
      id: opportunity.id,
      title: opportunity.title,
      companyId: opportunity.companyId,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, data: opportunity }, { status: 201 });
  } catch (error) {
    logger.error('Error creating BD opportunity', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to create BD opportunity');
  }
}
