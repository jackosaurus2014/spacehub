import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, rfqClarificationSchema, rfqClarificationAnswerSchema } from '@/lib/validations';
import { validationError, internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: List clarifications for an RFQ
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const rfq = await prisma.rFQ.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
      select: { id: true, buyerUserId: true, isPublic: true },
    });

    if (!rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    const isBuyer = session?.user?.id === rfq.buyerUserId;

    // Determine provider's company ID
    let userCompanyId: string | null = null;
    if (session?.user?.id && !isBuyer) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { claimedCompanyId: true },
      });
      userCompanyId = user?.claimedCompanyId || null;
    }

    // Fetch clarifications — filter private ones
    const clarifications = await prisma.rFQClarification.findMany({
      where: { rfqId: rfq.id },
      orderBy: { createdAt: 'asc' },
    });

    // Filter: public visible to all; private visible to buyer + asking provider only
    const filtered = clarifications.filter((c: any) => {
      if (c.isPublic) return true;
      if (isBuyer) return true;
      if (userCompanyId && c.companyId === userCompanyId) return true;
      return false;
    });

    return NextResponse.json({
      clarifications: filtered,
      total: filtered.length,
    });
  } catch (error) {
    logger.error('Get clarifications error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch clarifications');
  }
}

// POST: Submit a question (provider) or answer (buyer)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    const isBuyer = session.user.id === rfq.buyerUserId;
    const body = await request.json();

    // If buyer is answering an existing clarification
    if (isBuyer && body.clarificationId) {
      const validation = validateBody(rfqClarificationAnswerSchema, body);
      if (!validation.success) {
        return validationError('Validation failed', validation.errors);
      }

      const clarification = await prisma.rFQClarification.findUnique({
        where: { id: body.clarificationId },
      });

      if (!clarification || clarification.rfqId !== rfq.id) {
        return NextResponse.json({ error: 'Clarification not found' }, { status: 404 });
      }

      if (clarification.answer) {
        return NextResponse.json({ error: 'Already answered' }, { status: 409 });
      }

      const updated = await prisma.rFQClarification.update({
        where: { id: body.clarificationId },
        data: {
          answer: validation.data.answer,
          answeredAt: new Date(),
          isPublic: validation.data.isPublic ?? clarification.isPublic,
        },
      });

      logger.info('RFQ clarification answered', { rfqId: rfq.id, clarificationId: updated.id });
      return NextResponse.json({ clarification: updated });
    }

    // Provider asking a new question
    if (isBuyer) {
      return NextResponse.json({ error: 'Buyers answer clarifications, not ask them' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { claimedCompanyId: true },
    });

    if (!user?.claimedCompanyId) {
      return NextResponse.json({ error: 'You must claim a company profile to ask clarifications' }, { status: 403 });
    }

    const validation = validateBody(rfqClarificationSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }

    const clarification = await prisma.rFQClarification.create({
      data: {
        rfqId: rfq.id,
        authorId: session.user.id,
        authorRole: 'provider',
        companyId: user.claimedCompanyId,
        question: validation.data.question,
        isPublic: validation.data.isPublic,
      },
    });

    logger.info('RFQ clarification asked', { rfqId: rfq.id, clarificationId: clarification.id });
    return NextResponse.json({ clarification }, { status: 201 });
  } catch (error) {
    logger.error('Create clarification error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to create clarification');
  }
}
