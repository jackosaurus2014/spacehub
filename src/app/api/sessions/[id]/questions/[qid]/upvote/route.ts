import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  internalError,
  notFoundError,
  unauthorizedError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

// ── One upvote per user per question ────────────────────────────────────────
// Unlike the forum (ThreadVote / PostVote rows), SessionQuestion has no vote
// model, so `upvotes` was a bare counter anyone could loop to pin a question
// (docs/SECURITY_AUDIT_2026-08.md P9). Until a schema-backed vote row exists
// the best available guard is a PER-INSTANCE, in-memory set of (user, question)
// pairs. Limitations: it resets on deploy/restart, and with N replicas each
// keeps its own set (so a determined user gets at most N votes, not unbounded).
// A SessionQuestionVote table with @@unique([questionId, userId]) is the real
// fix and would also enable un-voting.
const VOTED_MAX_ENTRIES = 100_000;
const voted = new Set<string>();

/** Records the vote; returns false if this user already voted on this question. */
function recordVote(key: string): boolean {
  if (voted.has(key)) return false;
  if (voted.size >= VOTED_MAX_ENTRIES) {
    // Set iteration is insertion-ordered: evict the oldest tenth.
    Array.from(voted)
      .slice(0, Math.floor(VOTED_MAX_ENTRIES / 10))
      .forEach((k) => voted.delete(k));
  }
  voted.add(key);
  return true;
}

/**
 * POST /api/sessions/[id]/questions/[qid]/upvote
 * Authenticated users can upvote a question once.
 */
export async function POST(
  _request: NextRequest,
  props: { params: Promise<{ id: string; qid: string }> }
) {
  const params = await props.params;
  try {
    const auth = await getServerSession(authOptions);
    if (!auth?.user?.id) {
      return unauthorizedError();
    }

    const question = await prisma.sessionQuestion.findFirst({
      where: { id: params.qid, sessionId: params.id },
      select: { id: true, upvotes: true },
    });
    if (!question) {
      return notFoundError('Question');
    }

    if (!recordVote(`${auth.user.id}:${question.id}`)) {
      // Idempotent: the client refetches on any 2xx, so report current state.
      return NextResponse.json({
        success: true,
        data: { id: question.id, upvotes: question.upvotes },
        alreadyUpvoted: true,
      });
    }

    const updated = await prisma.sessionQuestion.update({
      where: { id: question.id },
      data: { upvotes: { increment: 1 } },
      select: { id: true, upvotes: true },
    });

    logger.info('Session question upvoted', {
      questionId: question.id,
      userId: auth.user.id,
      upvotes: updated.upvotes,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Upvote question error', {
      error: error instanceof Error ? error.message : String(error),
      sessionId: params.id,
      qid: params.qid,
    });
    return internalError('Failed to upvote question');
  }
}
