import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { validationError, forbiddenError, internalError } from '@/lib/errors';
import { featureRequestSchema, validateBody } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const bodyData = { ...body, email: session?.user?.email || body.email };

    const validation = validateBody(featureRequestSchema, bodyData);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }
    const { type, module, title, details, email } = validation.data;

    const featureRequest = await prisma.featureRequest.create({
      data: {
        userId: session?.user?.id || null,
        email,
        type,
        module: module || null,
        title,
        details,
      },
    });

    return NextResponse.json({ featureRequest }, { status: 201 });
  } catch (error) {
    console.error('Error creating feature request:', error);
    return internalError();
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return forbiddenError();
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
    return internalError();
  }
}
