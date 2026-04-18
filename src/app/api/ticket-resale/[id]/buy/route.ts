import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  validationError,
  internalError,
  notFoundError,
  forbiddenError,
  conflictError,
  createSuccessResponse,
} from '@/lib/errors';
import { getStripe } from '@/lib/stripe';
import { APP_URL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ticket-resale/[id]/buy
 * Authenticated buyer: creates a Stripe Checkout session for the resale listing.
 * On webhook completion the listing becomes "sold", the RSVP transfers to the
 * buyer, and a ResaleTransaction is recorded with a 10% platform fee.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in to buy a ticket');
    }

    const { id } = params;
    if (!id) return validationError('Listing id is required');

    const listing = await prisma.ticketListing.findUnique({ where: { id } });
    if (!listing) return notFoundError('Listing');

    if (listing.status !== 'listed') {
      return conflictError(
        `This listing is no longer available (status: ${listing.status})`
      );
    }
    if (listing.sellerUserId === session.user.id) {
      return forbiddenError('You cannot buy your own listing');
    }

    const currency = (listing.currency || 'USD').toLowerCase();
    const amountCents = Math.round(listing.askingPrice * 100);
    if (amountCents <= 0) {
      return validationError('Invalid asking price on listing');
    }

    // Look up event info (best-effort; listing may reference a client-side event id)
    const event = await prisma.spaceEvent
      .findUnique({
        where: { id: listing.eventId },
        select: { id: true, name: true },
      })
      .catch(() => null);
    const eventName = event?.name || 'Space Event';

    let checkoutUrl: string | null = null;
    let sessionId: string | null = null;
    try {
      const checkout = await getStripe().checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: `Resale Ticket — ${eventName}${listing.ticketTier ? ` (${listing.ticketTier})` : ''}`,
                description: listing.notes?.slice(0, 300) || undefined,
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        customer_email: session.user.email || undefined,
        success_url: `${APP_URL}/ticket-resale/${listing.id}?purchase=success`,
        cancel_url: `${APP_URL}/ticket-resale/${listing.id}?purchase=canceled`,
        metadata: {
          kind: 'ticket_resale',
          listingId: listing.id,
          eventId: listing.eventId,
          sellerUserId: listing.sellerUserId,
          buyerUserId: session.user.id,
          rsvpId: listing.rsvpId || '',
        },
      });
      checkoutUrl = checkout.url;
      sessionId = checkout.id;

      logger.info('Resale checkout session created', {
        listingId: listing.id,
        buyerUserId: session.user.id,
        sellerUserId: listing.sellerUserId,
        sessionId,
        amount: amountCents,
        currency,
      });
    } catch (err) {
      logger.error('Failed to create resale Stripe checkout', {
        listingId: listing.id,
        buyerUserId: session.user.id,
        error: err instanceof Error ? err.message : String(err),
      });
      return internalError('Failed to create checkout session');
    }

    return createSuccessResponse({ checkoutUrl, sessionId });
  } catch (error) {
    logger.error('POST /api/ticket-resale/[id]/buy failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to start purchase');
  }
}
