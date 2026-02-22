export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  forbiddenError,
  internalError,
} from '@/lib/errors';

/**
 * GET /api/admin/moderation/reports
 * List content reports with filtering and pagination (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }
    if (!session?.user?.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const contentType = searchParams.get('contentType');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const skip = (page - 1) * limit;

    // Build filters
    const where: Record<string, unknown> = {};
    if (status && ['pending', 'reviewed', 'actioned', 'dismissed'].includes(status)) {
      where.status = status;
    }
    if (contentType && ['thread', 'post', 'message', 'profile'].includes(contentType)) {
      where.contentType = contentType;
    }

    const [reports, total] = await Promise.all([
      (prisma as any).contentReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          reporter: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      (prisma as any).contentReport.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        reports,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching moderation reports', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch reports');
  }
}
