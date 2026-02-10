import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, proposalCreateSchema } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rfqId = searchParams.get('rfqId');
    const companyId = searchParams.get('companyId');

    const where: Record<string, unknown> = {};

    if (rfqId) {
      // Verify user is the RFQ buyer
      const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });
      if (!rfq || rfq.buyerUserId !== session.user.id) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }
      where.rfqId = rfqId;
    } else if (companyId) {
      // Verify user owns this company
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (user?.claimedCompanyId !== companyId) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }
      where.companyId = companyId;
    } else {
      // Get all proposals for user's company
      const user = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (user?.claimedCompanyId) {
        where.companyId = user.claimedCompanyId;
      } else {
        return NextResponse.json({ proposals: [], total: 0 });
      }
    }

    const proposals = await prisma.proposal.findMany({
      where: where as any,
      orderBy: { submittedAt: 'desc' },
      include: {
        rfq: {
          select: {
            id: true, slug: true, title: true, category: true, status: true,
            budgetMin: true, budgetMax: true, deadline: true,
          },
        },
      },
    });

    return NextResponse.json({ proposals, total: proposals.length });
  } catch (error) {
    logger.error('List proposals error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch proposals');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { claimedCompanyId: true },
    });

    if (!user?.claimedCompanyId) {
      return NextResponse.json(
        { error: 'You must claim a company profile before submitting proposals' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateBody(proposalCreateSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const data = validation.data;

    // Verify RFQ exists and is open
    const rfq = await prisma.rFQ.findUnique({ where: { id: data.rfqId } });
    if (!rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }
    if (rfq.status !== 'open') {
      return NextResponse.json({ error: 'This RFQ is no longer accepting proposals' }, { status: 400 });
    }
    if (rfq.buyerUserId === session.user.id) {
      return NextResponse.json({ error: 'You cannot submit a proposal on your own RFQ' }, { status: 400 });
    }

    // Check for existing proposal
    const existing = await prisma.proposal.findUnique({
      where: { rfqId_companyId: { rfqId: data.rfqId, companyId: user.claimedCompanyId } },
    });
    if (existing) {
      return NextResponse.json({ error: 'You have already submitted a proposal for this RFQ' }, { status: 409 });
    }

    const proposal = await prisma.proposal.create({
      data: {
        rfqId: data.rfqId,
        companyId: user.claimedCompanyId,
        price: data.price || null,
        pricingDetail: data.pricingDetail || null,
        timeline: data.timeline || null,
        approach: data.approach,
        attachments: (data.attachments?.length > 0 ? data.attachments : undefined) as any,
        status: 'submitted',
      },
    });

    // Update match record if exists
    await prisma.rFQProviderMatch.updateMany({
      where: { rfqId: data.rfqId, companyId: user.claimedCompanyId },
      data: { respondedAt: new Date() },
    });

    logger.info('Proposal submitted', { proposalId: proposal.id, rfqId: data.rfqId });
    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error) {
    logger.error('Create proposal error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to submit proposal');
  }
}
