import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET — list active polls for an event
export async function GET(
  _request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const polls = await (prisma as any).launchPoll.findMany({
      where: {
        eventId: params.eventId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({ success: true, data: { polls } });
  } catch (error) {
    logger.error('Error fetching polls', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: 'Failed to fetch polls' }, { status: 500 });
  }
}

// POST — create a new poll (admin only)
export async function POST(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check admin
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { question, options } = body;

    if (!question || !Array.isArray(options) || options.length < 2 || options.length > 6) {
      return NextResponse.json({ error: 'Question and 2-6 options required' }, { status: 400 });
    }

    const poll = await (prisma as any).launchPoll.create({
      data: {
        eventId: params.eventId,
        question,
        options: options as any,
        votes: {} as any,
      },
    });

    return NextResponse.json({ success: true, data: { poll } });
  } catch (error) {
    logger.error('Error creating poll', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: 'Failed to create poll' }, { status: 500 });
  }
}
