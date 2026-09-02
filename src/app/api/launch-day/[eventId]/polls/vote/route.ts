import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, launchPollVoteSchema } from '@/lib/validations';
import { validationError } from '@/lib/errors';
import { COOKIES_REQUIRED_MESSAGE, resolveLaunchDayActor } from '@/lib/launch-day-identity';

export const dynamic = 'force-dynamic';

// POST — vote on a poll. One vote per actor (signed-in user id or anonymous
// sn_vid cookie); voting again from the same actor updates the existing row
// via the (pollId, voterKey) unique key rather than creating a second one.
export async function POST(request: Request, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  try {
    const actor = await resolveLaunchDayActor(request);
    if (!actor) {
      return NextResponse.json({ error: COOKIES_REQUIRED_MESSAGE }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(launchPollVoteSchema, body);
    if (!validation.success) {
      return validationError('Invalid vote data', validation.errors);
    }
    const { pollId, optionIndex: option } = validation.data;

    // Verify poll exists and is active
    const poll = await prisma.launchPoll.findUnique({
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

    await prisma.launchPollVote.upsert({
      where: { pollId_voterKey: { pollId, voterKey: actor.voterKey } },
      create: {
        pollId,
        voterKey: actor.voterKey,
        userId: actor.userId,
        option,
      },
      update: {
        option,
        userId: actor.userId,
      },
    });

    // Recompute the tally from the vote rows so a changed vote moves rather
    // than double-counts.
    const grouped = await prisma.launchPollVote.groupBy({
      by: ['option'],
      where: { pollId },
      _count: { option: true },
    });
    const votes: Record<string, number> = {};
    for (const row of grouped) {
      votes[String(row.option)] = row._count.option;
    }
    // Keep zero entries for options that were tallied before but lost all votes.
    for (const key of Object.keys((poll.votes || {}) as Record<string, number>)) {
      if (!(key in votes)) votes[key] = 0;
    }

    await prisma.launchPoll.update({
      where: { id: pollId },
      data: { votes: votes as any },
    });

    return NextResponse.json({
      success: true,
      data: { votes, option, anonymous: actor.anonymous },
    });
  } catch (error) {
    logger.error('Error voting on poll', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: false, error: 'Failed to vote' }, { status: 500 });
  }
}
