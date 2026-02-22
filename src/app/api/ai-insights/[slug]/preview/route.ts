export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const token = request.nextUrl.searchParams.get('token');

    // Authorize via review token OR admin session
    let authorized = false;

    if (token) {
      // reviewToken is a new schema field — cast for Prisma client compat
      const insight = await (prisma.aIInsight as any).findFirst({
        where: { slug, reviewToken: token },
        select: { id: true },
      });
      if (insight) authorized = true;
    }

    if (!authorized) {
      const session = await getServerSession(authOptions);
      if (session?.user?.isAdmin) authorized = true;
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return the full insight regardless of status for preview
    const insight = await prisma.aIInsight.findUnique({
      where: { slug },
    });

    if (!insight) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    return NextResponse.json({ insight, preview: true });
  } catch (error) {
    logger.error('Error previewing AI insight', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to preview insight' }, { status: 500 });
  }
}
