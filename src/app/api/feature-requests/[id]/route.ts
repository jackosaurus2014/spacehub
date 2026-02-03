import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

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

    const data: Record<string, string> = {};
    if (status) data.status = status;
    if (adminNotes !== undefined) data.adminNotes = adminNotes;

    const featureRequest = await prisma.featureRequest.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ featureRequest });
  } catch (error) {
    console.error('Error updating feature request:', error);
    return NextResponse.json(
      { error: 'Failed to update feature request' },
      { status: 500 }
    );
  }
}
