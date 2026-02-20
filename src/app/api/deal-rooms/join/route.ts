import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST — join a deal room using an access code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessCode, email } = body;

    if (!accessCode || !email) {
      return NextResponse.json({ error: 'accessCode and email are required' }, { status: 400 });
    }

    const room = await (prisma as any).dealRoom.findUnique({
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
    const existing = room.members.find((m: any) => m.email === email.trim().toLowerCase());
    if (existing) {
      return NextResponse.json({ roomId: room.id, message: 'Already a member' });
    }

    // Add as viewer
    await (prisma as any).dealRoomMember.create({
      data: {
        dealRoomId: room.id,
        email: email.trim().toLowerCase(),
        role: 'viewer',
        joinedAt: new Date(),
        ndaAcceptedAt: room.ndaRequired ? null : new Date(),
      },
    });

    await (prisma as any).dealRoomActivity.create({
      data: {
        dealRoomId: room.id,
        userEmail: email.trim().toLowerCase(),
        action: 'joined_room',
        details: 'Joined via access code',
      },
    });

    logger.info('Member joined deal room via access code', { roomId: room.id, email });

    return NextResponse.json({ roomId: room.id, name: room.name, ndaRequired: room.ndaRequired }, { status: 201 });
  } catch (error) {
    logger.error('Failed to join deal room', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 });
  }
}
