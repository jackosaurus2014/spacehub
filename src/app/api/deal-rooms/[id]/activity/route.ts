import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET — returns activity log for the room, sorted by most recent
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

  try {
    // Verify membership
    if (email) {
      const membership = await (prisma as any).dealRoomMember.findFirst({
        where: { dealRoomId: id, email },
      });

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const activities = await (prisma as any).dealRoomActivity.findMany({
      where: { dealRoomId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const total = await (prisma as any).dealRoomActivity.count({
      where: { dealRoomId: id },
    });

    return NextResponse.json({ activities, total });
  } catch (error) {
    logger.error('Failed to fetch activity', { error: error instanceof Error ? error.message : String(error), roomId: id });
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
