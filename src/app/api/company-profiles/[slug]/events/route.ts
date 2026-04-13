import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const EVENT_TYPES = [
  'milestone', 'product_launch', 'contract_win', 'partnership',
  'funding', 'acquisition', 'regulatory', 'first_launch', 'ipo', 'founding',
] as const;

const createEventSchema = z.object({
  title: z.string().min(3).max(300).transform(v => v.trim()),
  description: z.string().max(5000).optional().transform(v => v?.trim() || undefined),
  type: z.enum(EVENT_TYPES),
  date: z.string().refine(v => !isNaN(Date.parse(v)), 'Invalid date'),
  sourceUrl: z.string().url().max(1000).optional().nullable(),
  importance: z.number().int().min(1).max(10).default(5),
});

// GET: List company events (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const company = await prisma.companyProfile.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const events = await prisma.companyEvent.findMany({
      where: { companyId: company.id },
      orderBy: { date: 'desc' },
      take: 50,
    });

    return NextResponse.json({ events });
  } catch (error) {
    logger.error('List company events error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch company events');
  }
}

// POST: Owner creates a company event/announcement
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

    const company = await prisma.companyProfile.findUnique({
      where: { slug },
      select: { id: true, claimedByUserId: true, name: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company.claimedByUserId !== session.user.id) {
      return NextResponse.json({ error: 'Only the profile owner can post events' }, { status: 403 });
    }

    const body = await request.json();
    const validation = createEventSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: validation.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const data = validation.data;

    const event = await prisma.companyEvent.create({
      data: {
        companyId: company.id,
        title: data.title,
        description: data.description || null,
        type: data.type,
        date: new Date(data.date),
        source: 'owner',
        sourceUrl: data.sourceUrl || null,
        importance: data.importance,
      },
    });

    logger.info('Company event created by owner', {
      eventId: event.id,
      companyId: company.id,
      type: data.type,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    logger.error('Create company event error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to create company event');
  }
}
