import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { subject, details, email } = body;

    const userEmail = session?.user?.email || email;
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!subject || !details) {
      return NextResponse.json(
        { error: 'Subject and details are required' },
        { status: 400 }
      );
    }

    const helpRequest = await prisma.helpRequest.create({
      data: {
        userId: session?.user?.id || null,
        email: userEmail,
        subject,
        details,
      },
    });

    return NextResponse.json({ helpRequest }, { status: 201 });
  } catch (error) {
    console.error('Error creating help request:', error);
    return NextResponse.json(
      { error: 'Failed to submit help request' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = status ? { status } : {};

    const [helpRequests, total] = await Promise.all([
      prisma.helpRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.helpRequest.count({ where }),
    ]);

    return NextResponse.json({ helpRequests, total });
  } catch (error) {
    console.error('Error fetching help requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch help requests' },
      { status: 500 }
    );
  }
}
