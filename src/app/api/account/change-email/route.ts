import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { unauthorizedError, validationError, internalError } from '@/lib/errors';
import { validateBody, changeEmailSchema } from '@/lib/validations';
import { sendEmailChangeVerification, sendEmailChangeNotice } from '@/lib/account-email';

export const dynamic = 'force-dynamic';

const TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * Self-serve email change (2026-09-10).
 *   POST   { newEmail, password } → verification link sent to the NEW address;
 *          the current address gets a heads-up. Nothing changes until the link
 *          is opened (see ./confirm).
 *   GET    → { pending: { newEmail, expiresAt } | null }
 *   DELETE → cancel a pending change.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();
    const validation = validateBody(changeEmailSchema, await req.json().catch(() => null));
    if (!validation.success) return validationError('Invalid request', validation.errors);
    const { newEmail, password } = validation.data!;
    const email = newEmail.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, password: true, name: true } });
    if (!user) return unauthorizedError();
    if (!(await bcrypt.compare(password, user.password))) return validationError('Password is incorrect');
    if (email === user.email.toLowerCase()) return validationError('That is already the email on this account');
    const taken = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } });
    if (taken) return validationError('That email is already in use on another account');

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    await prisma.$transaction([
      prisma.emailChangeToken.updateMany({ where: { userId: user.id, used: false }, data: { used: true } }),
      prisma.emailChangeToken.create({ data: { token, userId: user.id, newEmail: email, expiresAt } }),
    ]);
    const sent = await sendEmailChangeVerification({ to: email, name: user.name, token, expiresAt });
    if (!sent) return internalError('Could not send the verification email. Please try again in a few minutes.');
    void sendEmailChangeNotice({ to: user.email, name: user.name, newEmail: email });
    logger.info('Email change requested', { userId: user.id });
    return NextResponse.json({ success: true, data: { message: `We sent a verification link to ${email}. The change happens when you open it.`, pending: { newEmail: email, expiresAt: expiresAt.toISOString() } } });
  } catch (error) {
    logger.error('Email change request failed', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Could not start the email change. Please try again.');
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorizedError();
  const row = await prisma.emailChangeToken.findFirst({
    where: { userId: session.user.id, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: { newEmail: true, expiresAt: true },
  });
  return NextResponse.json({ success: true, data: { pending: row ? { newEmail: row.newEmail, expiresAt: row.expiresAt.toISOString() } : null } }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorizedError();
  const res = await prisma.emailChangeToken.updateMany({ where: { userId: session.user.id, used: false }, data: { used: true } });
  return NextResponse.json({ success: true, data: { cancelled: res.count } });
}
