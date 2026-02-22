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

    // status and reviewToken are new schema fields — cast for Prisma client compat
    const updated = await (prisma.aIInsight as any).update({
      where: { slug },
      data: { status: 'published', reviewToken: null },
      select: { id: true, title: true, slug: true, status: true },
    });

    logger.info('AI insight approved', { slug, title: updated.title });

    // Redirect to the published article for a nice UX from email clicks
    if (token) {
      return NextResponse.redirect(
        new URL(`/ai-insights/${slug}?approved=true`, request.url)
      );
    }

    return NextResponse.json({ success: true, insight: updated });
  } catch (error) {
    logger.error('Error approving AI insight', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to approve insight' }, { status: 500 });
  }
}
