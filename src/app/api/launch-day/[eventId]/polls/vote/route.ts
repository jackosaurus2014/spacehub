import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST — vote on a poll
export async function POST(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Sign in to vote' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { pollId, option } = body;

    if (!pollId || typeof option !== 'number') {
      return NextResponse.json({ error: 'pollId and option (number) required' }, { status: 400 });
    }

    // Verify poll exists and is active
    const poll = await (prisma as any).launchPoll.findUnique({
      where: { id: pollId },
    });

    if (!poll || poll.eventId !== params.eventId) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    if (!poll.isActive) {
      return NextResponse.json({ error: 'Poll is closed' }, { status: 400 });
    }

    const options = poll.options as string[];
    if (option < 0 || option >= options.length) {
      return NextResponse.json({ error: 'Invalid option index' }, { status: 400 });
    }

    // Create vote (unique constraint prevents double voting)
    try {
      await (prisma as any).launchPollVote.create({
        data: {
          pollId,
          userId,
          option,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return NextResponse.json({ error: 'You already voted on this poll' }, { status: 409 });
      }
      throw err;
    }

    // Update vote tally
    const currentVotes = (poll.votes || {}) as Record<string, number>;
    const optionKey = String(option);
    currentVotes[optionKey] = (currentVotes[optionKey] || 0) + 1;

    await (prisma as any).launchPoll.update({
      where: { id: pollId },
      data: { votes: currentVotes as any },
    });

    return NextResponse.json({
      success: true,
      data: { votes: currentVotes },
    });
  } catch (error) {
    logger.error('Error voting on poll', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: 'Failed to vote' }, { status: 500 });
  }
}
