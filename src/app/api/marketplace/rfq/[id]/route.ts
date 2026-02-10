import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, rfqUpdateSchema } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const rfq = await prisma.rFQ.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
      include: {
        proposals: {
          include: {
            // Only include company info, not full proposal details for non-buyers
          },
          orderBy: { submittedAt: 'desc' },
        },
        matches: {
          orderBy: { matchScore: 'desc' },
          take: 10,
          include: {
            listing: {
              select: { id: true, slug: true, name: true, category: true, priceMin: true, priceMax: true },
            },
          },
        },
        _count: { select: { proposals: true } },
      },
    });

    if (!rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    // If buyer, show full details
    const isBuyer = session?.user?.id === rfq.buyerUserId;

    if (!isBuyer && !rfq.isPublic) {
      return NextResponse.json({ error: 'This RFQ is private' }, { status: 403 });
    }

    // For non-buyers, anonymize buyer info and hide proposal details
    const response: Record<string, unknown> = {
      id: rfq.id,
      slug: rfq.slug,
      title: rfq.title,
      description: rfq.description,
      category: rfq.category,
      subcategory: rfq.subcategory,
      budgetMin: rfq.budgetMin,
      budgetMax: rfq.budgetMax,
      budgetCurrency: rfq.budgetCurrency,
      deadline: rfq.deadline,
      deliveryDate: rfq.deliveryDate,
      complianceReqs: rfq.complianceReqs,
      requirements: rfq.requirements,
      status: rfq.status,
      isPublic: rfq.isPublic,
      createdAt: rfq.createdAt,
      proposalCount: rfq._count.proposals,
    };

    if (isBuyer) {
      response.proposals = rfq.proposals;
      response.matches = rfq.matches;
      response.awardedToCompanyId = rfq.awardedToCompanyId;
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Get RFQ error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch RFQ');
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const rfq = await prisma.rFQ.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
    });

    if (!rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    if (rfq.buyerUserId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to update this RFQ' }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateBody(rfqUpdateSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const data = validation.data;
    const updateData: Record<string, unknown> = {};

    if (data.title) updateData.title = data.title;
    if (data.description) updateData.description = data.description;
    if (data.status) updateData.status = data.status;
    if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    if (data.awardedToCompanyId !== undefined) {
      updateData.awardedToCompanyId = data.awardedToCompanyId;
      if (data.awardedToCompanyId) {
        updateData.status = 'awarded';
        // Update winning proposal status
        await prisma.proposal.updateMany({
          where: { rfqId: rfq.id, companyId: data.awardedToCompanyId },
          data: { status: 'awarded' },
        });
        // Reject other proposals
        await prisma.proposal.updateMany({
          where: { rfqId: rfq.id, companyId: { not: data.awardedToCompanyId }, status: { not: 'withdrawn' } },
          data: { status: 'rejected' },
        });
      }
    }

    const updated = await prisma.rFQ.update({
      where: { id: rfq.id },
      data: updateData,
    });

    logger.info('RFQ updated', { id: rfq.id, status: updated.status });
    return NextResponse.json({ rfq: updated });
  } catch (error) {
    logger.error('Update RFQ error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to update RFQ');
  }
}
