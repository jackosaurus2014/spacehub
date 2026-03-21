import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/activity?limit=20
 * Returns the global activity feed — all player activities visible to everyone.
 */
export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(50, parseInt(request.nextUrl.searchParams.get('limit') || '20', 10));

    const activities = await prisma.playerActivity.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        companyName: true,
        type: true,
        title: true,
        description: true,
        metadata: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ activities });
  } catch (error) {
    return NextResponse.json({ activities: [] });
  }
}
