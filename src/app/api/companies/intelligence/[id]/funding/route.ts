import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  internalError,
  notFoundError,
  forbiddenError,
  validationError,
} from '@/lib/errors';
import { fundingRoundSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Verify company exists
    const company = await prisma.companyProfile.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!company) {
      return notFoundError('Company profile');
    }

    const fundingRounds = await prisma.fundingRound.findMany({
      where: { companyId: id },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        companyId: id,
        companyName: company.name,
        fundingRounds,
        total: fundingRounds.length,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch funding rounds', {
      error: error instanceof Error ? error.message : String(error),
      companyId: params.id,
    });
    return internalError('Failed to fetch funding rounds');
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin only
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return forbiddenError();
    }

    const { id } = params;

    // Verify company exists
    const company = await prisma.companyProfile.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!company) {
      return notFoundError('Company profile');
    }

    const body = await req.json();
    const validation = validateBody(fundingRoundSchema, body);

    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const data = validation.data;

    const fundingRound = await prisma.fundingRound.create({
      data: {
        companyId: id,
        date: new Date(data.date),
        amount: data.amount,
        currency: data.currency,
        seriesLabel: data.seriesLabel,
        roundType: data.roundType,
        preValuation: data.preValuation,
        postValuation: data.postValuation,
        leadInvestor: data.leadInvestor,
        investors: data.investors,
        source: data.source,
        sourceUrl: data.sourceUrl,
        notes: data.notes,
      },
    });

    logger.info('Funding round created', {
      id: fundingRound.id,
      companyId: id,
      seriesLabel: fundingRound.seriesLabel,
      amount: fundingRound.amount,
      adminUserId: session.user.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: fundingRound,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Failed to create funding round', {
      error: error instanceof Error ? error.message : String(error),
      companyId: params.id,
    });
    return internalError('Failed to create funding round');
  }
}
