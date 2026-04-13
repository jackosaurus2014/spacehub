import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const PARTNERSHIP_TYPES = ['joint_venture', 'strategic_alliance', 'supply_agreement', 'licensing', 'research', 'teaming'] as const;

const createRequestSchema = z.object({
  receiverCompanySlug: z.string().min(1),
  type: z.enum(PARTNERSHIP_TYPES),
  message: z.string().max(5000).optional().transform(v => v?.trim()),
});

const respondSchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(['accept', 'reject']),
  responseMessage: z.string().max(2000).optional().transform(v => v?.trim()),
});

// GET: List partnership requests for this company (incoming + outgoing)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { slug } = await params;
    const company = await prisma.companyProfile.findUnique({
      where: { slug },
      select: { id: true, claimedByUserId: true, name: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company.claimedByUserId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const [sent, received] = await Promise.all([
      prisma.partnershipRequest.findMany({
        where: { senderCompanyId: company.id },
        include: {
          receiverCompany: {
            select: { id: true, slug: true, name: true, logoUrl: true, sector: true, verificationLevel: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.partnershipRequest.findMany({
        where: { receiverCompanyId: company.id },
        include: {
          senderCompany: {
            select: { id: true, slug: true, name: true, logoUrl: true, sector: true, verificationLevel: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({ sent, received });
  } catch (error) {
    logger.error('List partnership requests error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch partnership requests');
  }
}

// POST: Send a partnership request to another company
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { slug } = await params;
    const senderCompany = await prisma.companyProfile.findUnique({
      where: { slug },
      select: { id: true, claimedByUserId: true, name: true },
    });

    if (!senderCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (senderCompany.claimedByUserId !== session.user.id) {
      return NextResponse.json({ error: 'Only the profile owner can send partnership requests' }, { status: 403 });
    }

    const body = await request.json();
    const validation = createRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: validation.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const data = validation.data;

    const receiverCompany = await prisma.companyProfile.findUnique({
      where: { slug: data.receiverCompanySlug },
      select: { id: true, name: true },
    });

    if (!receiverCompany) {
      return NextResponse.json({ error: 'Target company not found' }, { status: 404 });
    }

    if (receiverCompany.id === senderCompany.id) {
      return NextResponse.json({ error: 'Cannot send a partnership request to yourself' }, { status: 400 });
    }

    // Check for existing request in either direction
    const existing = await prisma.partnershipRequest.findFirst({
      where: {
        OR: [
          { senderCompanyId: senderCompany.id, receiverCompanyId: receiverCompany.id },
          { senderCompanyId: receiverCompany.id, receiverCompanyId: senderCompany.id },
        ],
        status: { in: ['pending', 'accepted'] },
      },
    });

    if (existing) {
      const msg = existing.status === 'accepted'
        ? 'A partnership already exists between these companies'
        : 'A partnership request is already pending between these companies';
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    const partnerRequest = await prisma.partnershipRequest.create({
      data: {
        senderCompanyId: senderCompany.id,
        receiverCompanyId: receiverCompany.id,
        type: data.type,
        message: data.message || null,
        status: 'pending',
      },
      include: {
        receiverCompany: { select: { id: true, slug: true, name: true } },
      },
    });

    logger.info('Partnership request sent', {
      requestId: partnerRequest.id,
      from: senderCompany.name,
      to: receiverCompany.name,
      type: data.type,
    });

    return NextResponse.json({ success: true, request: partnerRequest }, { status: 201 });
  } catch (error) {
    logger.error('Send partnership request error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to send partnership request');
  }
}

// PATCH: Accept or reject a partnership request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { slug } = await params;
    const company = await prisma.companyProfile.findUnique({
      where: { slug },
      select: { id: true, claimedByUserId: true, name: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company.claimedByUserId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validation = respondSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: validation.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const data = validation.data;

    const partnerRequest = await prisma.partnershipRequest.findFirst({
      where: { id: data.requestId, receiverCompanyId: company.id, status: 'pending' },
      include: { senderCompany: { select: { name: true } } },
    });

    if (!partnerRequest) {
      return NextResponse.json({ error: 'Partnership request not found or already processed' }, { status: 404 });
    }

    const updated = await prisma.partnershipRequest.update({
      where: { id: data.requestId },
      data: {
        status: data.action === 'accept' ? 'accepted' : 'rejected',
        respondedAt: new Date(),
        responseMessage: data.responseMessage || null,
      },
    });

    logger.info('Partnership request responded', {
      requestId: data.requestId,
      action: data.action,
      company: company.name,
      from: partnerRequest.senderCompany.name,
    });

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    logger.error('Respond to partnership request error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to process partnership request');
  }
}
