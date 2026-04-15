import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createMeetingRequestSchema = z.object({
  visitorName: z.string().min(1, 'Name is required').max(200).transform(v => v.trim()),
  visitorEmail: z.string().email('Please provide a valid email address').max(255).transform(v => v.trim().toLowerCase()),
  visitorCompany: z.string().max(200).optional().nullable().transform(v => v?.trim() || null),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000).transform(v => v.trim()),
  preferredDate: z.string().refine(v => !v || !isNaN(Date.parse(v)), 'Invalid date').optional().nullable(),
});

// GET: List meeting requests (owner only)
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
      select: { id: true, claimedByUserId: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company.claimedByUserId !== session.user.id) {
      return NextResponse.json({ error: 'Only the profile owner can view meeting requests' }, { status: 403 });
    }

    // Optional status filter
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    const meetingRequests = await prisma.meetingRequest.findMany({
      where: {
        companyId: company.id,
        ...(statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ meetingRequests });
  } catch (error) {
    logger.error('List meeting requests error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch meeting requests');
  }
}

// POST: Submit a meeting request (public, no auth needed)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const company = await prisma.companyProfile.findUnique({
      where: { slug },
      select: { id: true, name: true, claimedByUserId: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (!company.claimedByUserId) {
      return NextResponse.json({ error: 'This company profile has not been claimed yet. Meeting requests are only available for claimed profiles.' }, { status: 400 });
    }

    const body = await request.json();
    const validation = createMeetingRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: validation.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const data = validation.data;

    const meetingRequest = await prisma.meetingRequest.create({
      data: {
        companyId: company.id,
        visitorName: data.visitorName,
        visitorEmail: data.visitorEmail,
        visitorCompany: data.visitorCompany,
        message: data.message,
        preferredDate: data.preferredDate ? new Date(data.preferredDate) : null,
      },
    });

    logger.info('Meeting request submitted', {
      meetingRequestId: meetingRequest.id,
      companyId: company.id,
      companyName: company.name,
      visitorEmail: data.visitorEmail,
    });

    return NextResponse.json({ success: true, meetingRequest: { id: meetingRequest.id, status: meetingRequest.status } }, { status: 201 });
  } catch (error) {
    logger.error('Create meeting request error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to submit meeting request');
  }
}

// PATCH: Owner accepts/declines a meeting request
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
      select: { id: true, claimedByUserId: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company.claimedByUserId !== session.user.id) {
      return NextResponse.json({ error: 'Only the profile owner can respond to meeting requests' }, { status: 403 });
    }

    const body = await request.json();
    const { requestId, action } = body;

    if (!requestId || !['accepted', 'declined', 'completed'].includes(action)) {
      return NextResponse.json({ error: 'requestId and valid action (accepted/declined/completed) are required' }, { status: 400 });
    }

    const existing = await prisma.meetingRequest.findFirst({
      where: { id: requestId, companyId: company.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Meeting request not found' }, { status: 404 });
    }

    const updated = await prisma.meetingRequest.update({
      where: { id: requestId },
      data: {
        status: action,
        respondedAt: new Date(),
      },
    });

    logger.info('Meeting request updated', {
      requestId,
      companyId: company.id,
      action,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, meetingRequest: updated });
  } catch (error) {
    logger.error('Update meeting request error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to update meeting request');
  }
}
