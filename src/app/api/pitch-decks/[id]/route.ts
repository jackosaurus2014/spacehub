import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, updatePitchDeckSchema } from '@/lib/validations';
import { validationError, internalError, unauthorizedError, forbiddenError, notFoundError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function loadDeckWithOwner(id: string) {
  return prisma.pitchDeck.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, slug: true, claimedByUserId: true } },
    },
  });
}

// GET /api/pitch-decks/[id]
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deck = await loadDeckWithOwner(id);
    if (!deck) return notFoundError('Pitch deck');

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;
    const isAdmin = Boolean(session?.user?.isAdmin);
    const isOwner = Boolean(userId && deck.company.claimedByUserId === userId);

    // Visibility enforcement
    if (deck.visibility === 'invite_only' && !isOwner && !isAdmin) {
      return forbiddenError('This pitch deck is not visible to you');
    }
    if (deck.visibility === 'logged_in' && !userId) {
      return unauthorizedError('Sign in to view this pitch deck');
    }

    return NextResponse.json({ pitchDeck: deck, isOwner, isAdmin });
  } catch (error) {
    logger.error('Get pitch deck error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch pitch deck');
  }
}

// PATCH /api/pitch-decks/[id] — owner only
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const { id } = await params;
    const deck = await loadDeckWithOwner(id);
    if (!deck) return notFoundError('Pitch deck');

    const isOwner = deck.company.claimedByUserId === session.user.id;
    const isAdmin = Boolean(session.user.isAdmin);
    if (!isOwner && !isAdmin) {
      return forbiddenError('Only the profile owner can update this pitch deck');
    }

    const body = await request.json();
    const validation = validateBody(updatePitchDeckSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }
    const data = validation.data;

    const updated = await prisma.pitchDeck.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.fileUrl !== undefined && { fileUrl: data.fileUrl }),
        ...(data.fileSize !== undefined && { fileSize: data.fileSize }),
        ...(data.visibility !== undefined && { visibility: data.visibility }),
        ...(data.roundType !== undefined && { roundType: data.roundType }),
        ...(data.amountRaising !== undefined && { amountRaising: data.amountRaising }),
        ...(data.currency !== undefined && { currency: data.currency }),
      },
    });

    logger.info('Pitch deck updated', { pitchDeckId: id, userId: session.user.id });
    return NextResponse.json({ success: true, pitchDeck: updated });
  } catch (error) {
    logger.error('Update pitch deck error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to update pitch deck');
  }
}

// DELETE /api/pitch-decks/[id] — owner only
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const { id } = await params;
    const deck = await loadDeckWithOwner(id);
    if (!deck) return notFoundError('Pitch deck');

    const isOwner = deck.company.claimedByUserId === session.user.id;
    const isAdmin = Boolean(session.user.isAdmin);
    if (!isOwner && !isAdmin) {
      return forbiddenError('Only the profile owner can delete this pitch deck');
    }

    await prisma.pitchDeck.delete({ where: { id } });

    logger.info('Pitch deck deleted', { pitchDeckId: id, userId: session.user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Delete pitch deck error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to delete pitch deck');
  }
}
