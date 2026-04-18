import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, createPitchDeckSchema } from '@/lib/validations';
import { validationError, internalError, unauthorizedError, forbiddenError, notFoundError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/pitch-decks?companyId=... — list, enforce visibility
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    if (!companyId) {
      return validationError('companyId is required');
    }

    const company = await prisma.companyProfile.findUnique({
      where: { id: companyId },
      select: { id: true, claimedByUserId: true },
    });
    if (!company) return notFoundError('Company');

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;
    const isAdmin = Boolean(session?.user?.isAdmin);
    const isOwner = Boolean(userId && company.claimedByUserId === userId);

    // Build visibility filter
    const allowedVisibilities: string[] = ['public'];
    if (userId) allowedVisibilities.push('logged_in');
    // invite_only: only owner/admin may see for v1
    const where = isOwner || isAdmin
      ? { companyId: company.id }
      : { companyId: company.id, visibility: { in: allowedVisibilities } };

    const decks = await prisma.pitchDeck.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ pitchDecks: decks, isOwner, isAdmin });
  } catch (error) {
    logger.error('List pitch decks error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch pitch decks');
  }
}

// POST /api/pitch-decks — create, owner only
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const body = await request.json();
    const validation = validateBody(createPitchDeckSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }
    const data = validation.data;

    const company = await prisma.companyProfile.findUnique({
      where: { id: data.companyId },
      select: { id: true, claimedByUserId: true, slug: true },
    });
    if (!company) return notFoundError('Company');

    const isOwner = company.claimedByUserId === session.user.id;
    const isAdmin = Boolean(session.user.isAdmin);
    if (!isOwner && !isAdmin) {
      return forbiddenError('Only the profile owner can upload a pitch deck');
    }

    const deck = await prisma.pitchDeck.create({
      data: {
        companyId: company.id,
        title: data.title,
        description: data.description || null,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize ?? null,
        visibility: data.visibility,
        roundType: data.roundType || null,
        amountRaising: data.amountRaising ?? null,
        currency: data.currency || 'USD',
        uploadedByUserId: session.user.id,
      },
    });

    logger.info('Pitch deck created', {
      pitchDeckId: deck.id,
      companyId: company.id,
      companySlug: company.slug,
      userId: session.user.id,
      visibility: deck.visibility,
    });

    return NextResponse.json({ success: true, pitchDeck: deck }, { status: 201 });
  } catch (error) {
    logger.error('Create pitch deck error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to create pitch deck');
  }
}
