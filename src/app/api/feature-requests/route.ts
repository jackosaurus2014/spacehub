import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { type, module, title, details, email } = body;

    const userEmail = session?.user?.email || email;
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!type || !title || !details) {
      return NextResponse.json(
        { error: 'Type, title, and details are required' },
        { status: 400 }
      );
    }

    if (type === 'existing_module' && !module) {
      return NextResponse.json(
        { error: 'Module selection is required for existing module requests' },
        { status: 400 }
      );
    }

    const featureRequest = await prisma.featureRequest.create({
      data: {
        userId: session?.user?.id || null,
        email: userEmail,
        type,
        module: module || null,
        title,
        details,
      },
    });

    return NextResponse.json({ featureRequest }, { status: 201 });
  } catch (error) {
    console.error('Error creating feature request:', error);
    return NextResponse.json(
      { error: 'Failed to submit feature request' },
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

    const [featureRequests, total] = await Promise.all([
      prisma.featureRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.featureRequest.count({ where }),
    ]);

    return NextResponse.json({ featureRequests, total });
  } catch (error) {
    console.error('Error fetching feature requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature requests' },
      { status: 500 }
    );
  }
}
