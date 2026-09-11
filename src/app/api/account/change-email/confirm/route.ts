import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { APP_URL } from '@/lib/constants';
import { sendEmailChangedConfirmation } from '@/lib/account-email';

export const dynamic = 'force-dynamic';

/**
 * GET /api/account/change-email/confirm?token=… (2026-09-10) — the link in
 * the verification email. Works without a session (the user may open it on
 * another device); the token is the proof. On success the account email is
 * switched, marked verified, both addresses are told, and the browser lands
 * on /login with a notice: the session cookie still carries the old email.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const back = (status: string) => NextResponse.redirect(`${APP_URL}/login?emailChange=${status}&callbackUrl=%2Faccount%3Fsection%3Dsecurity`, 302);
  if (!token) return back('invalid');
  try {
    const row = await prisma.emailChangeToken.findUnique({ where: { token }, select: { id: true, userId: true, newEmail: true, expiresAt: true, used: true, user: { select: { email: true, name: true } } } });
    if (!row || row.used) return back('invalid');
    if (row.expiresAt.getTime() < Date.now()) return back('expired');
    const taken = await prisma.user.findFirst({ where: { email: { equals: row.newEmail, mode: 'insensitive' }, NOT: { id: row.userId } }, select: { id: true } });
    if (taken) return back('taken');
    const oldEmail = row.user.email;
    await prisma.$transaction([
      prisma.user.update({ where: { id: row.userId }, data: { email: row.newEmail, emailVerified: true } }),
      prisma.emailChangeToken.update({ where: { id: row.id }, data: { used: true } }),
    ]);
    void sendEmailChangedConfirmation({ oldEmail, newEmail: row.newEmail, name: row.user.name });
    logger.info('Email change confirmed', { userId: row.userId });
    return back('done');
  } catch (error) {
    logger.error('Email change confirm failed', { error: error instanceof Error ? error.message : String(error) });
    return back('error');
  }
}
