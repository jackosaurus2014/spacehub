import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST — accept NDA for a deal room
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const membership = await (prisma as any).dealRoomMember.findFirst({
      where: { dealRoomId: id, email },
    });

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this room' }, { status: 403 });
    }

    if (membership.ndaAcceptedAt) {
      return NextResponse.json({ message: 'NDA already accepted' });
    }

    await (prisma as any).dealRoomMember.update({
      where: { id: membership.id },
      data: {
        ndaAcceptedAt: new Date(),
        joinedAt: membership.joinedAt || new Date(),
      },
    });

    await (prisma as any).dealRoomActivity.create({
      data: {
        dealRoomId: id,
        userEmail: email,
        action: 'accepted_nda',
        details: 'Accepted the NDA agreement',
      },
    });

    logger.info('NDA accepted', { roomId: id, email });

    return NextResponse.json({ success: true, message: 'NDA accepted' });
  } catch (error) {
    logger.error('Failed to accept NDA', { error: error instanceof Error ? error.message : String(error), roomId: id });
    return NextResponse.json({ error: 'Failed to accept NDA' }, { status: 500 });
  }
}
