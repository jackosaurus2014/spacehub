import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  internalError,
  unauthorizedError,
  notFoundError,
  createSuccessResponse,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

type Params = { params: { slug: string } };

// In-memory dedupe per session lifetime. This is not persistent — a dedicated
// join table would be needed for hard dedupe. The client also stores an
// "already upvoted" flag in localStorage for the common case.
const recentUpvotes = new Map<string, number>();
const UPVOTE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

function sweepRecentUpvotes() {
  const now = Date.now();
  // Convert to array first (Edge-friendly) and mutate the map during iteration is fine here (Node)
  const keys = Array.from(recentUpvotes.keys());
  for (const k of keys) {
    const ts = recentUpvotes.get(k) ?? 0;
    if (now - ts > UPVOTE_COOLDOWN_MS) {
      recentUpvotes.delete(k);
    }
  }
}

/**
 * POST /api/investor-hub/theses/[slug]/upvote
 * Per-user, per-thesis in-memory cooldown (24h) prevents spam. Does not
 * persist across server restarts; the client should also hide the upvote
 * button after a successful vote.
 */
export async function POST(_request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in to upvote');
    }

    const thesis = await prisma.investorThesis.findUnique({
      where: { slug: params.slug },
      select: { id: true, upvotes: true },
    });
    if (!thesis) return notFoundError('Thesis');

    sweepRecentUpvotes();

    const dedupeKey = `${session.user.id}:${thesis.id}`;
    const lastAt = recentUpvotes.get(dedupeKey);
    if (lastAt && Date.now() - lastAt < UPVOTE_COOLDOWN_MS) {
      return createSuccessResponse({
        upvotes: thesis.upvotes,
        upvoted: true,
        alreadyUpvoted: true,
      });
    }

    recentUpvotes.set(dedupeKey, Date.now());

    const updated = await prisma.investorThesis.update({
      where: { id: thesis.id },
      data: { upvotes: { increment: 1 } },
    });

    logger.info('Investor thesis upvoted', {
      userId: session.user.id,
      thesisId: thesis.id,
    });

    return createSuccessResponse({
      upvotes: updated.upvotes,
      upvoted: true,
      alreadyUpvoted: false,
    });
  } catch (error) {
    logger.error('Failed to upvote thesis', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to upvote thesis');
  }
}
