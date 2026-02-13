import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { validationError, forbiddenError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { helpRequestSchema, validateBody } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();

    // Honeypot: if the hidden _hp field is filled, it's a bot — return fake success
    if (body._hp) {
      return NextResponse.json({ helpRequest: { id: 'ok' } }, { status: 201 });
    }

    const bodyData = { ...body, email: session?.user?.email || body.email };

    const validation = validateBody(helpRequestSchema, bodyData);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }
    const { subject, details, email } = validation.data;

    const helpRequest = await prisma.helpRequest.create({
      data: {
        userId: session?.user?.id || null,
        email,
        subject,
        details,
      },
    });

    return NextResponse.json({ helpRequest }, { status: 201 });
  } catch (error) {
    logger.error('Error creating help request', { error: error instanceof Error ? error.message : String(error) });
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
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
    logger.error('Error fetching help requests', { error: error instanceof Error ? error.message : String(error) });
    return internalError();
  }
}
