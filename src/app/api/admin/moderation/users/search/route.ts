export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { unauthorizedError, forbiddenError, internalError } from '@/lib/errors';

/**
 * GET /api/admin/moderation/users/search
 * Search users by name or email (admin only)
 * Query params: q (search term), limit (default 20)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const url = new URL(req.url);
    const q = url.searchParams.get('q')?.trim() || '';
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));

    if (!q) {
      return NextResponse.json({
        success: true,
        users: [],
      });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        isBanned: true,
        bannedUntil: true,
        isMuted: true,
        mutedUntil: true,
        createdAt: true,
      } as any,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    logger.error('Error searching users for moderation', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to search users');
  }
}
