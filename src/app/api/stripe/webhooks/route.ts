import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, priceIdToTier, priceIdToSponsorTier, mapSubscriptionStatus } from '@/lib/stripe';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { generatePaymentFailedEmail, generateSubscriptionConfirmEmail } from '@/lib/stripe-helpers';
import { Resend } from 'resend';
import { createNotification } from '@/lib/notifications/create';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for webhook processing (DB + email)

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
    // Return 500 so Stripe retries (up to ~16 times with exponential backoff).
    // Transient DB errors will self-heal on retry.
    return NextResponse.json(
      { error: 'Webhook processing failed', eventId: event.id },
      { status: 500 }
    );
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

  // Event ticket purchase flow — short-circuit before subscription / sponsor logic
  if (session.metadata?.kind === 'event_ticket') {
    await handleEventTicketCompleted(session);
    return;
  }

  // Resale ticket purchase flow — short-circuit before subscription / sponsor logic
  if (session.metadata?.kind === 'ticket_resale') {
    await handleResaleTicketCompleted(session);
    return;
  }

  // Check if this is a company sponsorship checkout (has companySlug instead of userId)
  const companySlug = session.metadata?.companySlug;

  if (!userId && companySlug) {
    // --- Sponsorship checkout flow ---
    if (!subscriptionId) {
      logger.warn('Sponsorship checkout.session.completed missing subscription ID', {
        sessionId: session.id,
        companySlug,
      });
      return;
    }

    const sponsorSub = await getStripe().subscriptions.retrieve(subscriptionId);
    const sponsorPriceId = sponsorSub.items.data[0]?.price?.id;
    const sponsorTier = sponsorPriceId ? priceIdToSponsorTier(sponsorPriceId) : null;

    if (!sponsorTier) {
      logger.error('Could not determine sponsor tier from checkout session', {
        sessionId: session.id,
        priceId: sponsorPriceId,
        companySlug,
      });
      return;
    }

    await (prisma.companyProfile as any).update({
      where: { slug: companySlug },
      data: {
        sponsorTier,
        sponsorSince: new Date(),
        sponsorStatus: 'active',
        sponsorStripeSubId: subscriptionId,
      },
    });

    logger.info('Company sponsorship activated via checkout', {
      companySlug,
      sponsorTier,
      subscriptionId,
      status: sponsorSub.status,
    });
    return;
  }

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
    // Check if this subscription belongs to a company sponsorship
    const sponsoredCompany = await (prisma.companyProfile as any).findFirst({
      where: { sponsorStripeSubId: subscription.id },
      select: { id: true, slug: true, sponsorTier: true },
    });

    if (sponsoredCompany) {
      const sponsorPriceId = subscription.items.data[0]?.price?.id;
      const newSponsorTier = sponsorPriceId ? priceIdToSponsorTier(sponsorPriceId) : null;
      const sponsorStatus = mapSubscriptionStatus(subscription.status);

      const sponsorUpdateData: Record<string, unknown> = {
        sponsorStatus: sponsorStatus === 'active' ? 'active' : sponsorStatus === 'past_due' ? 'past_due' : 'expired',
      };

      if (newSponsorTier) {
        sponsorUpdateData.sponsorTier = newSponsorTier;
      }

      const sponsorPeriodEnd = subscription.items.data[0]?.current_period_end;
      if (subscription.cancel_at) {
        sponsorUpdateData.sponsorExpires = new Date(subscription.cancel_at * 1000);
      } else if (sponsorPeriodEnd) {
        sponsorUpdateData.sponsorExpires = new Date(sponsorPeriodEnd * 1000);
      }

      await (prisma.companyProfile as any).update({
        where: { id: sponsoredCompany.id },
        data: sponsorUpdateData,
      });

      logger.info('Company sponsorship updated', {
        companySlug: sponsoredCompany.slug,
        previousTier: sponsoredCompany.sponsorTier,
        newTier: newSponsorTier || sponsoredCompany.sponsorTier,
        status: sponsorStatus,
        subscriptionId: subscription.id,
      });
      return;
    }

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
  const periodEnd = subscription.items.data[0]?.current_period_end;
  if (subscription.cancel_at) {
    updateData.subscriptionEndDate = new Date(subscription.cancel_at * 1000);
  } else if (periodEnd) {
    updateData.subscriptionEndDate = new Date(periodEnd * 1000);
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
    // Check if this subscription belongs to a company sponsorship
    const sponsoredCompany = await (prisma.companyProfile as any).findFirst({
      where: { sponsorStripeSubId: subscription.id },
      select: { id: true, slug: true },
    });

    if (sponsoredCompany) {
      await (prisma.companyProfile as any).update({
        where: { id: sponsoredCompany.id },
        data: {
          sponsorTier: null,
          sponsorStatus: 'expired',
          sponsorStripeSubId: null,
        },
      });

      logger.info('Company sponsorship deleted, marked as expired', {
        companySlug: sponsoredCompany.slug,
        subscriptionId: subscription.id,
      });
      return;
    }

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
    subscriptionId: invoice.parent?.subscription_details?.subscription as string | undefined,
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

/**
 * Handle checkout.session.completed for event ticket purchases.
 * Marks the EventRSVP as paid, fires a notification to the buyer, and
 * (best-effort) notifies the event owner if one can be resolved.
 */
async function handleEventTicketCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  const eventId = meta.eventId;
  const buyerUserId = meta.userId;
  const ticketTier = meta.ticketTier || null;
  const sessionId = session.id;

  if (!eventId || !buyerUserId) {
    logger.warn('event_ticket checkout missing eventId or userId', {
      sessionId,
      eventId,
      buyerUserId,
    });
    return;
  }

  // Find the RSVP either by stripeSessionId (preferred) or by (eventId, userId)
  let rsvp = await prisma.eventRSVP.findFirst({
    where: { stripeSessionId: sessionId },
  });
  if (!rsvp) {
    rsvp = await prisma.eventRSVP.findUnique({
      where: { eventId_userId: { eventId, userId: buyerUserId } },
    });
  }

  if (!rsvp) {
    logger.warn('event_ticket checkout completed but no RSVP found', {
      sessionId,
      eventId,
      buyerUserId,
    });
    return;
  }

  const amountTotalCents = session.amount_total ?? 0;
  const currencyCode = (session.currency || rsvp.currency || 'USD').toUpperCase();

  await prisma.eventRSVP.update({
    where: { id: rsvp.id },
    data: {
      paid: true,
      status: 'going',
      stripeSessionId: sessionId,
      amount: amountTotalCents / 100,
      currency: currencyCode,
      ...(ticketTier ? { ticketTier } : {}),
    },
  });

  logger.info('Event ticket payment confirmed', {
    rsvpId: rsvp.id,
    eventId,
    buyerUserId,
    sessionId,
    amount: amountTotalCents,
    currency: currencyCode,
  });

  // Look up the buyer + event for notifications
  const [buyer, event] = await Promise.all([
    prisma.user.findUnique({
      where: { id: buyerUserId },
      select: { id: true, email: true, name: true },
    }),
    prisma.spaceEvent
      .findUnique({
        where: { id: eventId },
        select: { id: true, name: true, agency: true, launchDate: true },
      })
      .catch(() => null),
  ]);

  const eventName = event?.name || 'your event';
  const formattedAmount = (amountTotalCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: currencyCode,
  });

  // Notify buyer (in-app)
  await createNotification({
    userId: buyerUserId,
    type: 'system',
    title: 'Ticket Confirmed',
    body: `Your ${ticketTier || 'ticket'} for ${eventName} is paid (${formattedAmount}). See you there!`,
    link: `/space-events`,
    relatedContentType: 'event_ticket',
    relatedContentId: eventId,
  });

  // Email buyer (best-effort)
  if (buyer?.email) {
    const resend = getResend();
    if (resend) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: buyer.email,
          subject: `Ticket confirmed: ${eventName}`,
          text: `Hi ${buyer.name || 'there'},\n\nYour ticket purchase for ${eventName} is confirmed.\nAmount: ${formattedAmount}\nTier: ${ticketTier || 'standard'}\n\nWe'll send a reminder closer to the date.\n\n— SpaceNexus`,
          html: `<p>Hi ${buyer.name || 'there'},</p><p>Your ticket purchase for <strong>${eventName}</strong> is confirmed.</p><ul><li>Amount: ${formattedAmount}</li><li>Tier: ${ticketTier || 'standard'}</li></ul><p>We'll send a reminder closer to the date.</p><p>— SpaceNexus</p>`,
        });
      } catch (err) {
        logger.error('Failed to send ticket confirmation email', {
          buyerUserId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // Best-effort: notify the event owner if one can be resolved via CompanyProfile.claimedByUserId
  if (event?.agency) {
    const owner = await prisma.companyProfile
      .findFirst({
        where: {
          claimedByUserId: { not: null },
          OR: [{ name: event.agency }, { slug: event.agency }],
        },
        select: { claimedByUserId: true },
      })
      .catch(() => null);
    if (owner?.claimedByUserId) {
      await createNotification({
        userId: owner.claimedByUserId,
        type: 'system',
        title: 'New ticket sale',
        body: `${buyer?.name || 'A user'} purchased a ${ticketTier || 'ticket'} for ${eventName} (${formattedAmount}).`,
        link: `/events/${eventId}/manage`,
        relatedContentType: 'event_ticket',
        relatedContentId: eventId,
      });
    }
  }
}

/**
 * Handle checkout.session.completed for resale ticket purchases.
 * Transfers RSVP ownership from seller to buyer, marks listing sold,
 * and records a ResaleTransaction with a 10% platform fee.
 */
async function handleResaleTicketCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata || {};
  const listingId = meta.listingId;
  const buyerUserId = meta.buyerUserId;
  const sellerUserId = meta.sellerUserId;
  const rsvpId = meta.rsvpId || null;
  const eventId = meta.eventId;
  const sessionId = session.id;
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null;

  if (!listingId || !buyerUserId || !sellerUserId) {
    logger.warn('ticket_resale checkout missing required metadata', {
      sessionId,
      listingId,
      buyerUserId,
      sellerUserId,
    });
    return;
  }

  const listing = await prisma.ticketListing.findUnique({
    where: { id: listingId },
  });
  if (!listing) {
    logger.warn('ticket_resale checkout completed but listing not found', {
      sessionId,
      listingId,
    });
    return;
  }

  if (listing.status === 'sold') {
    logger.info('ticket_resale checkout re-run for already-sold listing', {
      sessionId,
      listingId,
    });
    return;
  }

  const amountTotalCents = session.amount_total ?? 0;
  const amount = amountTotalCents / 100;
  const currency = (session.currency || listing.currency || 'USD').toUpperCase();
  const platformFee = Math.round(amount * 0.1 * 100) / 100; // 10%, round to cents

  // Transfer RSVP ownership to buyer + mark listing sold + create transaction
  try {
    await prisma.$transaction(async (tx) => {
      await tx.ticketListing.update({
        where: { id: listingId },
        data: {
          status: 'sold',
          buyerUserId,
          soldAt: new Date(),
        },
      });

      if (rsvpId) {
        // Reassign the existing RSVP to the buyer. If the buyer already has an
        // RSVP for this event, we can't just reassign (unique constraint), so
        // we cancel theirs first and then transfer.
        const existingBuyerRsvp = await tx.eventRSVP.findUnique({
          where: { eventId_userId: { eventId, userId: buyerUserId } },
        });
        if (existingBuyerRsvp && existingBuyerRsvp.id !== rsvpId) {
          await tx.eventRSVP.delete({ where: { id: existingBuyerRsvp.id } });
        }
        await tx.eventRSVP.update({
          where: { id: rsvpId },
          data: {
            userId: buyerUserId,
            paid: true,
            status: 'going',
            stripeSessionId: sessionId,
            amount,
            currency,
          },
        });
      }

      await tx.resaleTransaction.create({
        data: {
          ticketListingId: listingId,
          buyerUserId,
          sellerUserId,
          amount,
          currency,
          platformFee,
          stripePaymentIntentId: paymentIntentId,
          status: 'completed',
        },
      });
    });
  } catch (err) {
    logger.error('Failed to finalize resale ticket transaction', {
      sessionId,
      listingId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  logger.info('Resale ticket purchase completed', {
    sessionId,
    listingId,
    buyerUserId,
    sellerUserId,
    amount,
    currency,
    platformFee,
  });

  // Best-effort: in-app notifications to both parties
  const [buyer, sellerEvent] = await Promise.all([
    prisma.user
      .findUnique({
        where: { id: buyerUserId },
        select: { id: true, email: true, name: true },
      })
      .catch(() => null),
    eventId
      ? prisma.spaceEvent
          .findUnique({
            where: { id: eventId },
            select: { id: true, name: true },
          })
          .catch(() => null)
      : Promise.resolve(null),
  ]);
  const eventName = sellerEvent?.name || 'a space event';
  const formattedAmount = amount.toLocaleString('en-US', {
    style: 'currency',
    currency,
  });

  try {
    await createNotification({
      userId: buyerUserId,
      type: 'system',
      title: 'Resale Ticket Confirmed',
      body: `Your resale ticket for ${eventName} is confirmed (${formattedAmount}).`,
      link: `/ticket-resale/${listingId}`,
      relatedContentType: 'ticket_resale',
      relatedContentId: listingId,
    });
    const netFormatted = (amount - platformFee).toLocaleString('en-US', {
      style: 'currency',
      currency,
    });
    await createNotification({
      userId: sellerUserId,
      type: 'system',
      title: 'Your ticket has been resold',
      body: `${buyer?.name || 'A buyer'} purchased your ticket for ${eventName}. Payout: ${netFormatted} (10% fee applied).`,
      link: `/ticket-resale/my-listings`,
      relatedContentType: 'ticket_resale',
      relatedContentId: listingId,
    });
  } catch (err) {
    logger.warn('Failed to create resale notifications', {
      listingId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
