import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST — invite a member by email
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const body = await request.json();
    const { inviteeEmail, role, inviterEmail } = body;

    if (!inviteeEmail || !inviterEmail) {
      return NextResponse.json({ error: 'inviteeEmail and inviterEmail are required' }, { status: 400 });
    }

    if (typeof inviteeEmail !== 'string' || !inviteeEmail.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const validRoles = ['admin', 'viewer'];
    const memberRole = validRoles.includes(role) ? role : 'viewer';

    // Check if inviter has permission (owner or admin)
    const inviter = await (prisma as any).dealRoomMember.findFirst({
      where: { dealRoomId: id, email: inviterEmail, role: { in: ['owner', 'admin'] } },
    });

    if (!inviter) {
      return NextResponse.json({ error: 'Only owners and admins can invite members' }, { status: 403 });
    }

    // Check if already a member
    const existing = await (prisma as any).dealRoomMember.findUnique({
      where: { dealRoomId_email: { dealRoomId: id, email: inviteeEmail.trim().toLowerCase() } },
    });

    if (existing) {
      return NextResponse.json({ error: 'This person is already a member of this room' }, { status: 409 });
    }

    const member = await (prisma as any).dealRoomMember.create({
      data: {
        dealRoomId: id,
        email: inviteeEmail.trim().toLowerCase(),
        role: memberRole,
      },
    });

    // Log activity
    await (prisma as any).dealRoomActivity.create({
      data: {
        dealRoomId: id,
        userEmail: inviterEmail,
        action: 'invited_member',
        details: `Invited ${inviteeEmail.trim().toLowerCase()} as ${memberRole}`,
      },
    });

    logger.info('Deal room member invited', { roomId: id, invitee: inviteeEmail, role: memberRole });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    logger.error('Failed to invite member', { error: error instanceof Error ? error.message : String(error), roomId: id });
    return NextResponse.json({ error: 'Failed to invite member' }, { status: 500 });
  }
}

// DELETE — remove a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const memberEmail = searchParams.get('memberEmail');
  const requesterEmail = searchParams.get('requesterEmail');

  if (!memberEmail || !requesterEmail) {
    return NextResponse.json({ error: 'memberEmail and requesterEmail are required' }, { status: 400 });
  }

  try {
    // Check if requester has permission (owner or admin), or is removing themselves
    const requester = await (prisma as any).dealRoomMember.findFirst({
      where: { dealRoomId: id, email: requesterEmail },
    });

    if (!requester) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const isSelfRemoval = memberEmail === requesterEmail;
    const hasPermission = requester.role === 'owner' || requester.role === 'admin';

    if (!isSelfRemoval && !hasPermission) {
      return NextResponse.json({ error: 'Only owners and admins can remove other members' }, { status: 403 });
    }

    // Cannot remove the owner
    const targetMember = await (prisma as any).dealRoomMember.findFirst({
      where: { dealRoomId: id, email: memberEmail },
    });

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove the room owner' }, { status: 400 });
    }

    await (prisma as any).dealRoomMember.delete({
      where: { id: targetMember.id },
    });

    // Log activity
    await (prisma as any).dealRoomActivity.create({
      data: {
        dealRoomId: id,
        userEmail: requesterEmail,
        action: 'removed_member',
        details: isSelfRemoval ? `Left the room` : `Removed ${memberEmail}`,
      },
    });

    logger.info('Deal room member removed', { roomId: id, removedEmail: memberEmail, removedBy: requesterEmail });

    return NextResponse.json({ success: true, message: 'Member removed' });
  } catch (error) {
    logger.error('Failed to remove member', { error: error instanceof Error ? error.message : String(error), roomId: id });
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
