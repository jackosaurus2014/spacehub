import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?newsletter=error&reason=missing_token`
      );
    }

    // Find subscriber by verification token
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { verificationToken: token },
    });

    if (!subscriber) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?newsletter=error&reason=invalid_token`
      );
    }

    if (subscriber.verified) {
      // Already verified, redirect with success
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?newsletter=already_verified`
      );
    }

    // Mark as verified
    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        verified: true,
        verifiedAt: new Date(),
        verificationToken: null, // Clear token after use
      },
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?newsletter=verified`
    );
  } catch (error) {
    console.error('Newsletter verify error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?newsletter=error&reason=server_error`
    );
  }
}
