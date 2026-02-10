import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, proposalUpdateSchema } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const proposal = await prisma.proposal.findUnique({
      where: { id: params.id },
      include: {
        rfq: {
          select: { id: true, slug: true, title: true, category: true, buyerUserId: true, status: true },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Only buyer or proposer can view
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { claimedCompanyId: true } });
    const isProposer = user?.claimedCompanyId === proposal.companyId;
    const isBuyer = proposal.rfq.buyerUserId === session.user.id;

    if (!isProposer && !isBuyer) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    return NextResponse.json({ proposal });
  } catch (error) {
    logger.error('Get proposal error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch proposal');
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const proposal = await prisma.proposal.findUnique({
      where: { id: params.id },
      include: { rfq: { select: { buyerUserId: true } } },
    });

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateBody(proposalUpdateSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const data = validation.data;
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { claimedCompanyId: true } });
    const isProposer = user?.claimedCompanyId === proposal.companyId;
    const isBuyer = proposal.rfq.buyerUserId === session.user.id;

    // Validate permissions based on action
    if (data.status === 'withdrawn' && !isProposer) {
      return NextResponse.json({ error: 'Only the proposer can withdraw' }, { status: 403 });
    }
    if (['shortlisted', 'awarded', 'rejected'].includes(data.status || '') && !isBuyer) {
      return NextResponse.json({ error: 'Only the buyer can change proposal status' }, { status: 403 });
    }

    const updated = await prisma.proposal.update({
      where: { id: params.id },
      data: data as any,
    });

    logger.info('Proposal updated', { id: params.id, status: updated.status });
    return NextResponse.json({ proposal: updated });
  } catch (error) {
    logger.error('Update proposal error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to update proposal');
  }
}
