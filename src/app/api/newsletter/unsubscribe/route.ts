import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET - Traditional unsubscribe via link
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?newsletter=error&reason=missing_token`
      );
    }

    // Find subscriber by unsubscribe token
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!subscriber) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?newsletter=error&reason=invalid_token`
      );
    }

    if (subscriber.unsubscribedAt) {
      // Already unsubscribed
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?newsletter=already_unsubscribed`
      );
    }

    // Mark as unsubscribed
    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        unsubscribedAt: new Date(),
        verified: false,
      },
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?newsletter=unsubscribed`
    );
  } catch (error) {
    logger.error('Newsletter unsubscribe error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?newsletter=error&reason=server_error`
    );
  }
}

// POST - RFC 8058 List-Unsubscribe-Post for one-click unsubscribe
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    // Also check body for token (some email clients send it there)
    let bodyToken: string | null = null;
    try {
      const contentType = request.headers.get('content-type');
      if (contentType?.includes('application/x-www-form-urlencoded')) {
        const text = await request.text();
        const params = new URLSearchParams(text);
        bodyToken = params.get('token');
      }
    } catch {
      // Ignore body parsing errors
    }

    const finalToken = token || bodyToken;

    if (!finalToken) {
      return NextResponse.json(
        { error: 'Missing unsubscribe token' },
        { status: 400 }
      );
    }

    // Find subscriber by unsubscribe token
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { unsubscribeToken: finalToken },
    });

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe token' },
        { status: 404 }
      );
    }

    if (subscriber.unsubscribedAt) {
      return NextResponse.json({
        success: true,
        message: 'Already unsubscribed',
      });
    }

    // Mark as unsubscribed
    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        unsubscribedAt: new Date(),
        verified: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed',
    });
  } catch (error) {
    logger.error('Newsletter unsubscribe POST error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}
