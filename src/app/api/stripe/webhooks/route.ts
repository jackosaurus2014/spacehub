import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, priceIdToTier, mapSubscriptionStatus } from '@/lib/stripe';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { generatePaymentFailedEmail, generateSubscriptionConfirmEmail } from '@/lib/stripe-helpers';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

// Lazy Resend initialization (same pattern as email-service.ts)
let resendClient: Resend | null = null;
function getResend(): Resend | null {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      logger.warn('RESEND_API_KEY not set; payment notification emails will be skipped');
      return null;
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <newsletter@spacenexus.us>';

/**
 * Stripe webhook handler.
 * No auth middleware — Stripe sends these directly.
 * Signature verification ensures authenticity.
 */
export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // Read raw body for signature verification
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    logger.warn('Missing stripe-signature header on webhook request');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    logger.error('Webhook signature verification failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  logger.info('Stripe webhook received', {
    eventType: event.type,
    eventId: event.id,
  });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        logger.info('Unhandled webhook event type', { eventType: event.type });
    }
  } catch (error) {
    logger.error('Error processing webhook event', {
      eventType: event.type,
      eventId: event.id,
      error: error instanceof Error ? error.message : String(error),
    });
    // Return 200 anyway to prevent Stripe from retrying
    // (we log the error and can investigate)
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

/**
 * Handle checkout.session.completed:
 * User has successfully completed a Stripe Checkout. Update their subscription data.
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    logger.warn('checkout.session.completed missing userId in metadata', {
      sessionId: session.id,
    });
    return;
  }

  if (!subscriptionId) {
    logger.warn('checkout.session.completed missing subscription ID', {
      sessionId: session.id,
      userId,
    });
    return;
  }

  // Retrieve the subscription to get the price and tier
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceId ? priceIdToTier(priceId) : (session.metadata?.tier as 'pro' | 'enterprise' | null);

  if (!tier) {
    logger.error('Could not determine tier from checkout session', {
      sessionId: session.id,
      priceId,
      userId,
    });
    return;
  }

  // Update user in database
  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionTier: tier,
      subscriptionStatus: mapSubscriptionStatus(subscription.status),
      subscriptionStartDate: new Date(subscription.start_date * 1000),
      // Clear trial fields since they now have a real subscription
      trialTier: null,
      trialStartDate: null,
      trialEndDate: null,
    },
  });

  logger.info('Subscription activated via checkout', {
    userId,
    tier,
    subscriptionId,
    status: subscription.status,
  });

  // Send confirmation email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (user) {
    const resend = getResend();
    if (resend) {
      const amountTotal = session.amount_total || 0;
      const email = generateSubscriptionConfirmEmail(
        user.name || 'Space Explorer',
        tier,
        amountTotal
      );

      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: user.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });
        logger.info('Subscription confirmation email sent', { userId, email: user.email });
      } catch (err) {
        logger.error('Failed to send subscription confirmation email', {
          userId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}

/**
 * Handle customer.subscription.updated:
 * Subscription changes — upgrades, downgrades, status changes.
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const customerId = subscription.customer as string;

  // Find user by customer ID if metadata is missing
  let user;
  if (userId) {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, subscriptionTier: true },
    });
  }

  if (!user) {
    user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
      select: { id: true, subscriptionTier: true },
    });
  }

  if (!user) {
    logger.warn('customer.subscription.updated: user not found', {
      customerId,
      userId,
      subscriptionId: subscription.id,
    });
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const newTier = priceId ? priceIdToTier(priceId) : null;
  const newStatus = mapSubscriptionStatus(subscription.status);

  const updateData: Record<string, unknown> = {
    subscriptionStatus: newStatus,
    stripeSubscriptionId: subscription.id,
  };

  if (newTier) {
    updateData.subscriptionTier = newTier;
  }

  // Set end date if subscription has a cancel_at or current_period_end
  if (subscription.cancel_at) {
    updateData.subscriptionEndDate = new Date(subscription.cancel_at * 1000);
  } else if (subscription.current_period_end) {
    updateData.subscriptionEndDate = new Date(subscription.current_period_end * 1000);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  logger.info('Subscription updated', {
    userId: user.id,
    previousTier: user.subscriptionTier,
    newTier: newTier || user.subscriptionTier,
    status: newStatus,
    subscriptionId: subscription.id,
  });
}

/**
 * Handle customer.subscription.deleted:
 * Subscription has been canceled and fully ended. Downgrade to free.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const userId = subscription.metadata?.userId;

  let user;
  if (userId) {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
  }

  if (!user) {
    user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
      select: { id: true, email: true },
    });
  }

  if (!user) {
    logger.warn('customer.subscription.deleted: user not found', {
      customerId,
      subscriptionId: subscription.id,
    });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: 'free',
      subscriptionStatus: 'canceled',
      subscriptionEndDate: new Date(),
      stripeSubscriptionId: null,
    },
  });

  logger.info('Subscription deleted, downgraded to free', {
    userId: user.id,
    subscriptionId: subscription.id,
  });
}

/**
 * Handle invoice.payment_succeeded:
 * Log successful payment for monitoring.
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  logger.info('Invoice payment succeeded', {
    invoiceId: invoice.id,
    customerId,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    subscriptionId: invoice.subscription as string | undefined,
  });
}

/**
 * Handle invoice.payment_failed:
 * Update status to past_due and send a recovery email.
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    logger.warn('invoice.payment_failed: user not found', {
      customerId,
      invoiceId: invoice.id,
    });
    return;
  }

  // Update subscription status to past_due
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: 'past_due',
    },
  });

  logger.warn('Invoice payment failed, status set to past_due', {
    userId: user.id,
    invoiceId: invoice.id,
    amountDue: invoice.amount_due,
    attemptCount: invoice.attempt_count,
  });

  // Send recovery email
  const resend = getResend();
  if (resend) {
    const email = generatePaymentFailedEmail(
      user.name || 'Space Explorer',
      invoice.amount_due || 0
    );

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      logger.info('Payment failed recovery email sent', {
        userId: user.id,
        email: user.email,
      });
    } catch (err) {
      logger.error('Failed to send payment failed email', {
        userId: user.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
