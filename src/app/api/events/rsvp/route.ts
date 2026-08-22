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

    // Paid-ticket checkout is DISABLED.
    //
    // This path used to mint a Stripe Checkout session using `paidTier.amount`
    // straight from the request body, which meant any logged-in user could name
    // their own price for a ticket (POST { paidTier: { tier: 'VIP', amount: 50 } }
    // => a $0.50 checkout) and the webhook would still mark the RSVP paid.
    // There is no server-side price for a ticket to validate against: SpaceEvent
    // carries no ticket-pricing fields (see prisma/schema.prisma), and no live UI
    // sends `paidTier` (RSVPButton.tsx is not rendered anywhere), so the safe
    // behaviour is to refuse rather than to trust the client.
    //
    // To re-enable: add ticket tiers + prices to the event model, look the price
    // up server-side by tier name, and pass THAT to Stripe — never the body.
    const paidTier =
      body && typeof body === 'object' && 'paidTier' in body
        ? (body as { paidTier?: unknown }).paidTier
        : undefined;
    if (paidTier !== undefined && paidTier !== null) {
      return validationError(
        'Paid ticket checkout is not available for this event.'
      );
    }

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
