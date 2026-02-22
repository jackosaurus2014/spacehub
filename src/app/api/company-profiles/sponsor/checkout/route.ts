export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStripe, getPriceIds } from '@/lib/stripe';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody } from '@/lib/validations';
import { z } from 'zod';

const sponsorCheckoutSchema = z.object({
  companySlug: z.string().min(1),
  sponsorTier: z.enum(['verified', 'premium']),
  billingCycle: z.enum(['monthly', 'yearly']),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(sponsorCheckoutSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
    }

    const { companySlug, sponsorTier, billingCycle } = validation.data;

    // Verify user has claimed this company
    const company = await (prisma.companyProfile as any).findUnique({
      where: { slug: companySlug },
      select: { id: true, name: true, claimedByUserId: true, sponsorTier: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company.claimedByUserId !== session.user.id) {
      return NextResponse.json({ error: 'You must claim this company profile before sponsoring' }, { status: 403 });
    }

    if (company.sponsorTier) {
      return NextResponse.json({ error: 'Company already has an active sponsorship' }, { status: 400 });
    }

    // Get the appropriate price ID
    const prices = getPriceIds();
    const priceKey = `sponsor_${sponsorTier}_${billingCycle}` as keyof ReturnType<typeof getPriceIds>;
    const priceId = prices[priceKey];

    if (!priceId) {
      return NextResponse.json(
        { error: `Sponsorship pricing not configured for ${sponsorTier} ${billingCycle}` },
        { status: 500 }
      );
    }

    // Create Stripe checkout session
    const stripe = getStripe();
    const origin = new URL(request.url).origin;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/company-profiles/${companySlug}?sponsor=success`,
      cancel_url: `${origin}/company-profiles/sponsor?canceled=true`,
      metadata: {
        type: 'sponsorship',
        companySlug,
        companyId: company.id,
        sponsorTier,
        userId: session.user.id,
      },
      customer_email: session.user.email || undefined,
    });

    logger.info('Sponsor checkout session created', {
      sessionId: checkoutSession.id,
      companySlug,
      sponsorTier,
      billingCycle,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    logger.error('Sponsor checkout failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
