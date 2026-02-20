import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET — get deal room details with members, documents, recent activities
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  try {
    const room = await (prisma as any).dealRoom.findUnique({
      where: { id },
      include: {
        members: {
          orderBy: { invitedAt: 'desc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
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

    // Check if requesting user is a member
    let membership = null;
    if (email) {
      membership = room.members.find((m: any) => m.email === email);
      if (!membership) {
        return NextResponse.json({ error: 'Access denied. You are not a member of this room.' }, { status: 403 });
      }

      // Update last access time
      await (prisma as any).dealRoomMember.update({
        where: { id: membership.id },
        data: { lastAccessAt: new Date() },
      });
    }

    return NextResponse.json({
      room,
      myRole: membership?.role || null,
      ndaAccepted: !!membership?.ndaAcceptedAt,
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

  try {
    const body = await request.json();
    const { name, description, ndaRequired, ndaText, status, email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email required for authorization' }, { status: 400 });
    }

    // Check if user is owner or admin
    const membership = await (prisma as any).dealRoomMember.findFirst({
      where: { dealRoomId: id, email, role: { in: ['owner', 'admin'] } },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Only owners and admins can update room settings' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (ndaRequired !== undefined) updateData.ndaRequired = ndaRequired;
    if (ndaText !== undefined) updateData.ndaText = ndaText?.trim() || null;
    if (status !== undefined && ['active', 'archived', 'closed'].includes(status)) {
      updateData.status = status;
    }

    const updatedRoom = await (prisma as any).dealRoom.update({
      where: { id },
      data: updateData,
      include: {
        members: true,
        documents: true,
        _count: { select: { documents: true, members: true, activities: true } },
      },
    });

    // Log activity
    await (prisma as any).dealRoomActivity.create({
      data: {
        dealRoomId: id,
        userEmail: email,
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
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email required for authorization' }, { status: 400 });
  }

  try {
    // Only owners can archive
    const membership = await (prisma as any).dealRoomMember.findFirst({
      where: { dealRoomId: id, email, role: 'owner' },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Only owners can archive a room' }, { status: 403 });
    }

    await (prisma as any).dealRoom.update({
      where: { id },
      data: { status: 'archived' },
    });

    await (prisma as any).dealRoomActivity.create({
      data: {
        dealRoomId: id,
        userEmail: email,
        action: 'archived_room',
        details: 'Room archived',
      },
    });

    logger.info('Deal room archived', { roomId: id, archivedBy: email });

    return NextResponse.json({ success: true, message: 'Room archived' });
  } catch (error) {
    logger.error('Failed to archive deal room', { error: error instanceof Error ? error.message : String(error), roomId: id });
    return NextResponse.json({ error: 'Failed to archive room' }, { status: 500 });
  }
}
