import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { validateBody, activityTrackSchema } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/analytics/track
 * Records a usage analytics event. Accepts JSON body:
 *   { event: string, module?: string, metadata?: object }
 *
 * Analytics MUST NEVER break the app — we always return 204 on any failure.
 */
export async function POST(request: NextRequest) {
  try {
    // Reject oversized payloads (5KB limit)
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
    if (contentLength > 5120) {
      return new NextResponse(null, { status: 204 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return new NextResponse(null, { status: 204 });
    }

    const validation = validateBody(activityTrackSchema, body);
    if (!validation.success) {
      // Invalid payload — just swallow, don't surface errors to the client
      return new NextResponse(null, { status: 204 });
    }

    const { event, module, metadata } = validation.data;

    const session = await getServerSession(authOptions).catch(() => null);
    const userId = session?.user?.id ?? null;

    const sessionId = request.cookies.get('sn-session')?.value ?? null;
    const userAgent = request.headers.get('user-agent');

    try {
      await prisma.activityLog.create({
        data: {
          userId,
          sessionId,
          event,
          module: module ?? null,
          metadata: (metadata ?? undefined) as object | undefined,
          userAgent: userAgent ? userAgent.slice(0, 500) : null,
        },
      });
    } catch (err) {
      logger.error('Failed to record activity log', {
        error: err instanceof Error ? err.message : String(err),
        event,
        module: module ?? null,
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    // Any unexpected error — analytics must never break UX
    return new NextResponse(null, { status: 204 });
  }
}
