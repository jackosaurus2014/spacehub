import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { dealRoomUpdateSchema, validateBody } from '@/lib/validations';
import { validationError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * Scalars every member of a room may see. `accessCode` is deliberately absent:
 * it is the room's master invite and re-issuing access is an owner/admin
 * privilege (see members/route.ts POST), so viewers must never receive it
 * (docs/SECURITY_AUDIT_2026-08.md P7).
 */
const DEAL_ROOM_MEMBER_SELECT = {
  id: true,
  name: true,
  description: true,
  companySlug: true,
  status: true,
  createdBy: true,
  createdByUserId: true,
  ndaRequired: true,
  ndaText: true,
  createdAt: true,
  updatedAt: true,
} as const;

// GET — get deal room details with members, documents, recent activities
export async function GET(
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
    // Membership first: the requester's role decides what the room query may
    // return, and non-members get the same 403 whether or not the room exists.
    const membership = await prisma.dealRoomMember.findFirst({
      where: { dealRoomId: id, email: userEmail },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Access denied. You are not a member of this room.' }, { status: 403 });
    }

    // Same roles the invite path (members/route.ts) trusts with the code.
    const canSeeAccessCode = membership.role === 'owner' || membership.role === 'admin';

    const room = await prisma.dealRoom.findUnique({
      where: { id },
      select: {
        ...DEAL_ROOM_MEMBER_SELECT,
        accessCode: canSeeAccessCode,
        members: {
          orderBy: { invitedAt: 'desc' },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        _count: {
          select: { documents: true, members: true, activities: true },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Deal room not found' }, { status: 404 });
    }

    // Same gate as documents/route.ts: an unsigned NDA hides the document list.
    // The UI reads `ndaRequired && !ndaAccepted` to raise the NDA prompt.
    const ndaAccepted = !!membership.ndaAcceptedAt;
    const ndaBlocked = room.ndaRequired && !ndaAccepted;
    const documents = ndaBlocked
      ? []
      : await prisma.dealRoomDocument.findMany({
          where: { dealRoomId: id },
          orderBy: { createdAt: 'desc' },
        });

    // Update last access time
    await prisma.dealRoomMember.update({
      where: { id: membership.id },
      data: { lastAccessAt: new Date() },
    });

    return NextResponse.json({
      room: { ...room, documents },
      myRole: membership.role,
      ndaRequired: room.ndaRequired,
      ndaAccepted,
    });
  } catch (error) {
    logger.error('Failed to fetch deal room', { error: error instanceof Error ? error.message : String(error), roomId: id });
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 });
  }
}

// PUT — update room settings
export async function PUT(
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
    const body = await request.json();
    const validation = validateBody(dealRoomUpdateSchema, body);

    if (!validation.success) {
      return validationError('Invalid update data', validation.errors);
    }

    // Check if user is owner or admin
    const membership = await prisma.dealRoomMember.findFirst({
      where: { dealRoomId: id, email: userEmail, role: { in: ['owner', 'admin'] } },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Only owners and admins can update room settings' }, { status: 403 });
    }

    const { name, description, ndaRequired, ndaText, status } = validation.data;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (ndaRequired !== undefined) updateData.ndaRequired = ndaRequired;
    if (ndaText !== undefined) updateData.ndaText = ndaText?.trim() || null;
    if (status !== undefined) updateData.status = status;

    const updatedRoom = await prisma.dealRoom.update({
      where: { id },
      data: updateData,
      include: {
        members: true,
        documents: true,
        _count: { select: { documents: true, members: true, activities: true } },
      },
    });

    // Log activity
    await prisma.dealRoomActivity.create({
      data: {
        dealRoomId: id,
        userEmail,
        action: 'updated_room',
        details: `Updated room settings: ${Object.keys(updateData).join(', ')}`,
      },
    });

    logger.info('Deal room updated', { roomId: id, updatedFields: Object.keys(updateData) });

    return NextResponse.json({ room: updatedRoom });
  } catch (error) {
    logger.error('Failed to update deal room', { error: error instanceof Error ? error.message : String(error), roomId: id });
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}

// DELETE — archive the room (soft delete)
export async function DELETE(
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
    // Only owners can archive
    const membership = await prisma.dealRoomMember.findFirst({
      where: { dealRoomId: id, email: userEmail, role: 'owner' },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Only owners can archive a room' }, { status: 403 });
    }

    await prisma.dealRoom.update({
      where: { id },
      data: { status: 'archived' },
    });

    await prisma.dealRoomActivity.create({
      data: {
        dealRoomId: id,
        userEmail,
        action: 'archived_room',
        details: 'Room archived',
      },
    });

    logger.info('Deal room archived', { roomId: id, archivedBy: userEmail });

    return NextResponse.json({ success: true, message: 'Room archived' });
  } catch (error) {
    logger.error('Failed to archive deal room', { error: error instanceof Error ? error.message : String(error), roomId: id });
    return NextResponse.json({ error: 'Failed to archive room' }, { status: 500 });
  }
}
