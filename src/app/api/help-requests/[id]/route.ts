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
    const { status, adminResponse } = body;

    const data: Record<string, string | Date> = {};
    if (status) data.status = status;
    if (adminResponse !== undefined) {
      data.adminResponse = adminResponse;
      data.respondedAt = new Date();
    }

    const helpRequest = await prisma.helpRequest.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ helpRequest });
  } catch (error) {
    console.error('Error updating help request:', error);
    return NextResponse.json(
      { error: 'Failed to update help request' },
      { status: 500 }
    );
  }
}
