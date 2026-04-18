import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, notFoundError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Public follower count + (if authed) whether current user is following
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const company = await prisma.companyProfile.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!company) {
      return notFoundError('Company');
    }

    const count = await prisma.companyFollow.count({ where: { companyId: company.id } });

    // Auth is optional — include userFollowing only if signed in
    let userFollowing = false;
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        const follow = await prisma.companyFollow.findUnique({
          where: { userId_companyId: { userId: session.user.id, companyId: company.id } },
          select: { id: true },
        });
        userFollowing = !!follow;
      }
    } catch {
      // Auth lookup failed — still return public count
    }

    return NextResponse.json({ count, userFollowing });
  } catch (error) {
    logger.error('Follower count error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch follower count');
  }
}
