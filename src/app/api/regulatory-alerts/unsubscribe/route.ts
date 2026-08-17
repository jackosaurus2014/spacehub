import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { APP_URL } from '@/lib/constants';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * One-click unsubscribe for regulatory alert emails (Regulatory Wave C).
 * Mirrors /api/newsletter/unsubscribe: GET for the footer link, POST for
 * RFC 8058 List-Unsubscribe-Post. Token = RegulatoryAlertPreference.
 * unsubscribeToken; unsubscribing sets enabled=false (preferences are kept,
 * so re-enabling from settings restores the watched categories).
 */

async function disableByToken(token: string): Promise<'ok' | 'invalid' | 'already'> {
  const pref = await prisma.regulatoryAlertPreference.findUnique({
    where: { unsubscribeToken: token },
    select: { id: true, enabled: true },
  });
  if (!pref) return 'invalid';
  if (!pref.enabled) return 'already';
  await prisma.regulatoryAlertPreference.update({
    where: { id: pref.id },
    data: { enabled: false },
  });
  return 'ok';
}

// GET — traditional unsubscribe via the email footer link
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(`${APP_URL}/regulatory-radar?alerts=error`);
    }

    const result = await disableByToken(token);
    if (result === 'invalid') {
      return NextResponse.redirect(`${APP_URL}/regulatory-radar?alerts=error`);
    }
    return NextResponse.redirect(`${APP_URL}/regulatory-radar?alerts=unsubscribed`);
  } catch (error) {
    logger.error('Regulatory alert unsubscribe error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.redirect(`${APP_URL}/regulatory-radar?alerts=error`);
  }
}

// POST — RFC 8058 List-Unsubscribe-Post one-click unsubscribe
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let token = searchParams.get('token');

    // Some email clients send the token in a form-encoded body
    if (!token) {
      try {
        const contentType = request.headers.get('content-type');
        if (contentType?.includes('application/x-www-form-urlencoded')) {
          const text = await request.text();
          token = new URLSearchParams(text).get('token');
        }
      } catch {
        // Ignore body parsing errors
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Missing unsubscribe token' }, { status: 400 });
    }

    const result = await disableByToken(token);
    if (result === 'invalid') {
      return NextResponse.json({ error: 'Invalid unsubscribe token' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      message: result === 'already' ? 'Already unsubscribed' : 'Successfully unsubscribed',
    });
  } catch (error) {
    logger.error('Regulatory alert unsubscribe POST error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
