import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, notFoundError, forbiddenError, unauthorizedError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/pitch-decks/[id]/view — record a view (auth optional)
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const deck = await prisma.pitchDeck.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, claimedByUserId: true } },
      },
    });
    if (!deck) return notFoundError('Pitch deck');

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;
    const isAdmin = Boolean(session?.user?.isAdmin);
    const isOwner = Boolean(userId && deck.company.claimedByUserId === userId);

    // Visibility enforcement — only record a view if the viewer is allowed
    if (deck.visibility === 'invite_only' && !isOwner && !isAdmin) {
      return forbiddenError('This pitch deck is not visible to you');
    }
    if (deck.visibility === 'logged_in' && !userId) {
      return unauthorizedError('Sign in to view this pitch deck');
    }

    await prisma.$transaction([
      prisma.pitchDeckView.create({
        data: {
          pitchDeckId: deck.id,
          userId: userId || null,
        },
      }),
      prisma.pitchDeck.update({
        where: { id: deck.id },
        data: { views: { increment: 1 } },
      }),
    ]);

    logger.info('Pitch deck view recorded', { pitchDeckId: deck.id, userId });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Record pitch deck view error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to record view');
  }
}
