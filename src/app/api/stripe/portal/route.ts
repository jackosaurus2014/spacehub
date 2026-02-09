import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import { unauthorizedError, internalError, createSuccessResponse } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return unauthorizedError('You must be logged in to manage your subscription');
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        stripeCustomerId: true,
      },
    });

    if (!user?.stripeCustomerId) {
      return unauthorizedError('No active subscription found. Please subscribe first.');
    }

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.com';

    // Create Stripe billing portal session
    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${APP_URL}/pricing`,
    });

    logger.info('Created Stripe portal session', {
      userId: user.id,
      stripeCustomerId: user.stripeCustomerId,
    });

    return createSuccessResponse({ url: portalSession.url });
  } catch (error) {
    logger.error('Failed to create portal session', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to open billing portal. Please try again.');
  }
}
