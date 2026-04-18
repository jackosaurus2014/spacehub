import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, unauthorizedError, notFoundError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST: Follow a company (idempotent via upsert)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be signed in to follow a company');
    }

    const { id } = await params;

    const company = await prisma.companyProfile.findUnique({
      where: { id },
      select: { id: true, slug: true, name: true },
    });
    if (!company) {
      return notFoundError('Company');
    }

    // Upsert for idempotency — follow twice = still one row
    await prisma.companyFollow.upsert({
      where: { userId_companyId: { userId: session.user.id, companyId: company.id } },
      create: { userId: session.user.id, companyId: company.id },
      update: {},
    });

    const count = await prisma.companyFollow.count({ where: { companyId: company.id } });

    logger.info('Company followed', {
      userId: session.user.id,
      companyId: company.id,
      companySlug: company.slug,
    });

    return NextResponse.json({ success: true, userFollowing: true, count });
  } catch (error) {
    logger.error('Follow company error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to follow company');
  }
}

// DELETE: Unfollow a company
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be signed in to unfollow a company');
    }

    const { id } = await params;

    const company = await prisma.companyProfile.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });
    if (!company) {
      return notFoundError('Company');
    }

    await prisma.companyFollow.deleteMany({
      where: { userId: session.user.id, companyId: company.id },
    });

    const count = await prisma.companyFollow.count({ where: { companyId: company.id } });

    logger.info('Company unfollowed', {
      userId: session.user.id,
      companyId: company.id,
      companySlug: company.slug,
    });

    return NextResponse.json({ success: true, userFollowing: false, count });
  } catch (error) {
    logger.error('Unfollow company error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to unfollow company');
  }
}
