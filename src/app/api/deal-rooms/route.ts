import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { dealRoomCreateSchema, validateBody } from '@/lib/validations';
import { validationError } from '@/lib/errors';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// GET — list deal rooms for the authenticated user
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userEmail = session.user.email;

  try {
    const memberships = await prisma.dealRoomMember.findMany({
      where: { email: userEmail },
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userEmail = session.user.email;
  const userId = (session.user as any).id;

  try {
    const body = await request.json();
    const validation = validateBody(dealRoomCreateSchema, body);

    if (!validation.success) {
      return validationError('Invalid deal room data', validation.errors);
    }

    const { name, description, companySlug, ndaRequired, ndaText } = validation.data;

    const accessCode = crypto.randomBytes(6).toString('hex');

    const room = await prisma.dealRoom.create({
      data: {
        name,
        description: description || null,
        companySlug: companySlug?.trim() || null,
        createdBy: userEmail,
        createdByUserId: userId || null,
        accessCode,
        ndaRequired: ndaRequired || false,
        ndaText: ndaText?.trim() || null,
        members: {
          create: {
            email: userEmail,
            userId: userId || null,
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
    await prisma.dealRoomActivity.create({
      data: {
        dealRoomId: room.id,
        userId: userId || null,
        userEmail,
        action: 'created_room',
        details: `Created deal room: ${name}`,
      },
    });

    logger.info('Deal room created', { roomId: room.id, name: room.name, createdBy: userEmail });

    return NextResponse.json({ room, accessCode }, { status: 201 });
  } catch (error) {
    logger.error('Failed to create deal room', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}
