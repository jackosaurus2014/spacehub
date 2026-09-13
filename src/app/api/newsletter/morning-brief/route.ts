import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/newsletter/morning-brief?token=<unsubscribeToken>&action=enable|disable
 *
 * One-click SpaceNexus AM toggle (2026-09-12). Same mechanism as unsubscribe:
 * the per-subscriber unsubscribeToken (32 random bytes, unique) is the
 * credential, so the link in the M/Th digest promo block and the AM footer
 * works without a session. Only verified, still-subscribed addresses can be
 * enabled — an unsubscribed address must re-subscribe (double opt-in) first.
 */
export async function GET(request: Request) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us';
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const action = searchParams.get('action') === 'disable' ? 'disable' : 'enable';

    if (!token) return NextResponse.redirect(`${base}/?newsletter=error&reason=missing_token`);

    const subscriber = await prisma.newsletterSubscriber.findUnique({ where: { unsubscribeToken: token } });
    if (!subscriber) return NextResponse.redirect(`${base}/?newsletter=error&reason=invalid_token`);

    if (action === 'disable') {
      if (subscriber.morningBrief) {
        await prisma.newsletterSubscriber.update({ where: { id: subscriber.id }, data: { morningBrief: false } });
      }
      return NextResponse.redirect(`${base}/?newsletter=am_disabled`);
    }

    if (subscriber.unsubscribedAt || !subscriber.verified) {
      return NextResponse.redirect(`${base}/newsletter?newsletter=error&reason=not_subscribed`);
    }
    if (!subscriber.morningBrief) {
      await prisma.newsletterSubscriber.update({ where: { id: subscriber.id }, data: { morningBrief: true } });
    }
    return NextResponse.redirect(`${base}/?newsletter=am_enabled`);
  } catch (error) {
    logger.error('Morning brief toggle error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.redirect(`${base}/?newsletter=error&reason=server_error`);
  }
}
