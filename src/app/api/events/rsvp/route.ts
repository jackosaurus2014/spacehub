import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { eventRsvpSchema, validateBody } from '@/lib/validations';
import {
  unauthorizedError,
  validationError,
  internalError,
  createSuccessResponse,
} from '@/lib/errors';
import { getStripe } from '@/lib/stripe';
import { APP_URL } from '@/lib/constants';
import { createNotification } from '@/lib/notifications/create';

export const dynamic = 'force-dynamic';

/**
 * POST /api/events/rsvp
 * Upsert an EventRSVP for the current user.
 *
 * Body: { eventId, status, ticketTier?, notes? }
 *
 * If a ticketTier is provided AND status === 'going' AND the request body
 * carries `paidTier: { tier, amount, currency }`, a Stripe Checkout session
 * is created and the redirect URL is returned in the response.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in to RSVP');
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return validationError('Invalid JSON body');
    }

    const validation = validateBody(eventRsvpSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { eventId, status, ticketTier, notes } = validation.data;
    const userId = session.user.id;

    // Optional paid-tier checkout request
    const paidTier =
      body && typeof body === 'object' && 'paidTier' in body
        ? (body as { paidTier?: unknown }).paidTier
        : undefined;
    const isPaidGoing =
      status === 'going' &&
      paidTier &&
      typeof paidTier === 'object' &&
      'amount' in (paidTier as Record<string, unknown>) &&
      typeof (paidTier as Record<string, unknown>).amount === 'number' &&
      (paidTier as Record<string, number>).amount > 0;

    // Optional event metadata for the checkout session
    const eventName =
      body && typeof body === 'object' && typeof (body as { eventName?: unknown }).eventName === 'string'
        ? ((body as { eventName?: string }).eventName as string).slice(0, 200)
        : 'Event Ticket';

    // Upsert the RSVP first so we can attach the stripe session id later if needed
    const existing = await prisma.eventRSVP.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    const rsvp = await prisma.eventRSVP.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: {
        eventId,
        userId,
        status,
        ticketTier: ticketTier ?? null,
        notes: notes ?? null,
      },
      update: {
        status,
        ...(ticketTier !== undefined ? { ticketTier } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });

    logger.info('Event RSVP upserted', {
      userId,
      eventId,
      status,
      ticketTier: ticketTier ?? null,
      isNew: !existing,
    });

    // Fire a notification on confirmed RSVP (only for newly created or status changed to going)
    if (status === 'going' && (!existing || existing.status !== 'going')) {
      await createNotification({
        userId,
        type: 'system',
        title: 'RSVP Confirmed',
        body: `You're going to ${eventName}. We'll send a reminder closer to the date.`,
        link: `/space-events`,
        relatedContentType: 'event',
        relatedContentId: eventId,
      });
    }

    // If it's a paid ticket, hand back a Stripe Checkout URL
    if (isPaidGoing) {
      const tierData = paidTier as {
        tier: string;
        amount: number;
        currency?: string;
      };
      const currency = (tierData.currency || 'USD').toLowerCase();
      const amount = Math.round(tierData.amount); // amount in smallest currency unit (cents)

      try {
        const checkout = await getStripe().checkout.sessions.create({
          mode: 'payment',
          line_items: [
            {
              price_data: {
                currency,
                product_data: {
                  name: `${eventName} — ${tierData.tier}`,
                },
                unit_amount: amount,
              },
              quantity: 1,
            },
          ],
          customer_email: session.user.email || undefined,
          success_url: `${APP_URL}/space-events?ticket_success=1&event=${encodeURIComponent(eventId)}`,
          cancel_url: `${APP_URL}/space-events?ticket_canceled=1&event=${encodeURIComponent(eventId)}`,
          metadata: {
            kind: 'event_ticket',
            rsvpId: rsvp.id,
            eventId,
            userId,
            ticketTier: tierData.tier,
          },
        });

        await prisma.eventRSVP.update({
          where: { id: rsvp.id },
          data: {
            stripeSessionId: checkout.id,
            amount: amount / 100,
            currency: currency.toUpperCase(),
            ticketTier: tierData.tier,
          },
        });

        logger.info('Created Stripe checkout for event ticket', {
          userId,
          eventId,
          rsvpId: rsvp.id,
          sessionId: checkout.id,
          amount,
          currency,
        });

        return createSuccessResponse({
          rsvp: { ...rsvp, stripeSessionId: checkout.id },
          checkoutUrl: checkout.url,
        });
      } catch (err) {
        logger.error('Failed to create Stripe checkout for event ticket', {
          userId,
          eventId,
          error: err instanceof Error ? err.message : String(err),
        });
        return internalError('Failed to create checkout session');
      }
    }

    return createSuccessResponse({ rsvp });
  } catch (error) {
    logger.error('POST /api/events/rsvp failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to record RSVP');
  }
}

/**
 * GET /api/events/rsvp?eventId=...
 * Returns the current user's RSVP (if any) plus aggregate counts:
 * { going, maybe, waitlist }
 */
export async function GET(req: NextRequest) {
  try {
    const eventId = req.nextUrl.searchParams.get('eventId');
    if (!eventId) {
      return validationError('eventId query parameter is required');
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    const [mine, grouped] = await Promise.all([
      userId
        ? prisma.eventRSVP.findUnique({
            where: { eventId_userId: { eventId, userId } },
          })
        : Promise.resolve(null),
      prisma.eventRSVP.groupBy({
        by: ['status'],
        where: { eventId },
        _count: { _all: true },
      }),
    ]);

    const counts: Record<string, number> = {
      going: 0,
      maybe: 0,
      not_going: 0,
      waitlist: 0,
    };
    for (const row of grouped) {
      counts[row.status] = row._count._all;
    }

    return createSuccessResponse({
      rsvp: mine,
      counts: {
        going: counts.going,
        maybe: counts.maybe,
        waitlist: counts.waitlist,
      },
    });
  } catch (error) {
    logger.error('GET /api/events/rsvp failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load RSVP');
  }
}
