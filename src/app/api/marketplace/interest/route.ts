import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, interestExpressionSchema } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(interestExpressionSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const data = validation.data;

    // Verify opportunity exists
    const opportunity = await prisma.businessOpportunity.findUnique({
      where: { id: data.opportunityId },
    });
    if (!opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    // Check for existing interest
    const existing = await prisma.interestExpression.findUnique({
      where: { opportunityId_userId: { opportunityId: data.opportunityId, userId: session.user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: 'You have already expressed interest in this opportunity' }, { status: 409 });
    }

    // Get user's company if they have one
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { claimedCompanyId: true },
    });

    const interest = await prisma.interestExpression.create({
      data: {
        opportunityId: data.opportunityId,
        userId: session.user.id,
        companyId: data.companyId || user?.claimedCompanyId || null,
        contactEmail: data.contactEmail,
        message: data.message || null,
        status: 'expressed',
      },
    });

    // Get total interest count
    const count = await prisma.interestExpression.count({
      where: { opportunityId: data.opportunityId },
    });

    logger.info('Interest expressed', { opportunityId: data.opportunityId, userId: session.user.id });
    return NextResponse.json({ interest, totalInterested: count }, { status: 201 });
  } catch (error) {
    logger.error('Express interest error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to express interest');
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const opportunityId = searchParams.get('opportunityId');

    if (!opportunityId) {
      return NextResponse.json({ error: 'opportunityId is required' }, { status: 400 });
    }

    const count = await prisma.interestExpression.count({
      where: { opportunityId },
    });

    // Check if current user has expressed interest
    const session = await getServerSession(authOptions);
    let hasExpressedInterest = false;
    if (session?.user?.id) {
      const existing = await prisma.interestExpression.findUnique({
        where: { opportunityId_userId: { opportunityId, userId: session.user.id } },
      });
      hasExpressedInterest = !!existing;
    }

    return NextResponse.json({ totalInterested: count, hasExpressedInterest });
  } catch (error) {
    logger.error('Get interest count error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to get interest count');
  }
}
