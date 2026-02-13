import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { status, adminNotes } = body;

    const VALID_STATUSES = ['new', 'under-review', 'in-progress', 'completed', 'rejected', 'deferred'];
    const data: Record<string, string> = {};
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      data.status = status;
    }
    if (adminNotes !== undefined) data.adminNotes = adminNotes;

    const featureRequest = await prisma.featureRequest.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ featureRequest });
  } catch (error) {
    logger.error('Error updating feature request', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to update feature request' },
      { status: 500 }
    );
  }
}
