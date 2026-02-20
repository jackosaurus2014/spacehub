import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// GET — list deal rooms for a user (by email query param)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
  }

  try {
    const memberships = await (prisma as any).dealRoomMember.findMany({
      where: { email },
      include: {
        dealRoom: {
          include: {
            members: { select: { email: true, role: true, ndaAcceptedAt: true } },
            documents: { select: { id: true, name: true, category: true } },
            _count: { select: { documents: true, members: true, activities: true } },
          },
        },
      },
    });

    const rooms = memberships.map((m: any) => ({
      ...m.dealRoom,
      myRole: m.role,
      ndaAccepted: !!m.ndaAcceptedAt,
    }));

    return NextResponse.json({ rooms });
  } catch (error) {
    logger.error('Failed to fetch deal rooms', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}

// POST — create a new deal room
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, companySlug, createdByEmail, ndaRequired, ndaText } = body;

    if (!name || !createdByEmail) {
      return NextResponse.json({ error: 'name and createdByEmail are required' }, { status: 400 });
    }

    if (typeof name !== 'string' || name.length > 200) {
      return NextResponse.json({ error: 'Name must be a string under 200 characters' }, { status: 400 });
    }

    const accessCode = crypto.randomBytes(6).toString('hex');

    const room = await (prisma as any).dealRoom.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        companySlug: companySlug?.trim() || null,
        createdBy: createdByEmail,
        accessCode,
        ndaRequired: ndaRequired || false,
        ndaText: ndaText?.trim() || null,
        members: {
          create: {
            email: createdByEmail,
            role: 'owner',
            joinedAt: new Date(),
            ndaAcceptedAt: new Date(), // Owner auto-accepts
          },
        },
      },
      include: {
        members: true,
      },
    });

    // Log activity
    await (prisma as any).dealRoomActivity.create({
      data: {
        dealRoomId: room.id,
        userEmail: createdByEmail,
        action: 'created_room',
        details: `Created deal room: ${name.trim()}`,
      },
    });

    logger.info('Deal room created', { roomId: room.id, name: room.name, createdBy: createdByEmail });

    return NextResponse.json({ room, accessCode }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create deal room', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}
