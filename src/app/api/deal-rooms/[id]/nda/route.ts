import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST — accept NDA for a deal room
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userEmail = session.user.email;

  try {
    const membership = await prisma.dealRoomMember.findFirst({
      where: { dealRoomId: id, email: userEmail },
    });

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this room' }, { status: 403 });
    }

    if (membership.ndaAcceptedAt) {
      return NextResponse.json({ message: 'NDA already accepted' });
    }

    await prisma.dealRoomMember.update({
      where: { id: membership.id },
      data: {
        ndaAcceptedAt: new Date(),
        joinedAt: membership.joinedAt || new Date(),
      },
    });

    await prisma.dealRoomActivity.create({
      data: {
        dealRoomId: id,
        userEmail,
        action: 'accepted_nda',
        details: 'Accepted the NDA agreement',
      },
    });

    logger.info('NDA accepted', { roomId: id, email: userEmail });

    return NextResponse.json({ success: true, message: 'NDA accepted' });
  } catch (error) {
    logger.error('Failed to accept NDA', { error: error instanceof Error ? error.message : String(error), roomId: id });
    return NextResponse.json({ error: 'Failed to accept NDA' }, { status: 500 });
  }
}
