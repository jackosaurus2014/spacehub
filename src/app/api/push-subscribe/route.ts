import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * POST /api/push-subscribe
 * Store a Web Push subscription from the browser.
 * Works for both authenticated and anonymous users.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription — missing endpoint or keys' }, { status: 400 });
    }

    // Get user ID if authenticated
    let userId: string | null = null;
    try {
      const session = await getServerSession(authOptions);
      userId = session?.user?.id || null;
    } catch { /* anonymous is fine */ }

    // Upsert subscription
    await prisma.webPushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: userId || undefined,
      },
    });

    logger.info('Web push subscription stored', { userId: userId || 'anonymous', endpoint: endpoint.slice(0, 50) });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Push subscribe error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to store subscription' }, { status: 500 });
  }
}

/**
 * DELETE /api/push-subscribe
 * Remove a Web Push subscription.
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }

    await prisma.webPushSubscription.deleteMany({ where: { endpoint } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Push unsubscribe error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
  }
}
