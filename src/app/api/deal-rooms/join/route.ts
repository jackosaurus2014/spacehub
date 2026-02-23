import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { dealRoomJoinSchema, validateBody } from '@/lib/validations';
import { validationError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

// POST — join a deal room using an access code
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userEmail = session.user.email;
  const userId = (session.user as any).id;

  try {
    const body = await request.json();
    const validation = validateBody(dealRoomJoinSchema, body);

    if (!validation.success) {
      return validationError('Invalid join data', validation.errors);
    }

    const { accessCode } = validation.data;

    const room = await prisma.dealRoom.findUnique({
      where: { accessCode },
      include: { members: true },
    });

    if (!room) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 404 });
    }

    if (room.status !== 'active') {
      return NextResponse.json({ error: 'This deal room is no longer active' }, { status: 400 });
    }

    // Check if already a member
    const existing = room.members.find((m: any) => m.email === userEmail);
    if (existing) {
      return NextResponse.json({ roomId: room.id, message: 'Already a member' });
    }

    // Add as viewer
    await prisma.dealRoomMember.create({
      data: {
        dealRoomId: room.id,
        email: userEmail,
        userId: userId || null,
        role: 'viewer',
        joinedAt: new Date(),
        ndaAcceptedAt: room.ndaRequired ? null : new Date(),
      },
    });

    await prisma.dealRoomActivity.create({
      data: {
        dealRoomId: room.id,
        userId: userId || null,
        userEmail,
        action: 'joined_room',
        details: 'Joined via access code',
      },
    });

    logger.info('Member joined deal room via access code', { roomId: room.id, email: userEmail });

    return NextResponse.json({ roomId: room.id, name: room.name, ndaRequired: room.ndaRequired }, { status: 201 });
  } catch (error) {
    logger.error('Failed to join deal room', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
  }
}
