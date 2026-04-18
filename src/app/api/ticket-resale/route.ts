import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { createTicketListingSchema, validateBody } from '@/lib/validations';
import {
  unauthorizedError,
  validationError,
  internalError,
  notFoundError,
  forbiddenError,
  conflictError,
  createSuccessResponse,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ticket-resale
 * Public list of active resale listings.
 * Query: eventId? (filter), status? (default "listed"), limit?, offset?
 */
export async function GET(req: NextRequest) {
  try {
    const eventId = req.nextUrl.searchParams.get('eventId');
    const statusFilter = req.nextUrl.searchParams.get('status') || 'listed';
    const mine = req.nextUrl.searchParams.get('mine') === 'true';
    const limit = Math.min(
      Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '50', 10) || 50),
      100
    );
    const offset = Math.max(
      0,
      parseInt(req.nextUrl.searchParams.get('offset') || '0', 10) || 0
    );

    const where: Record<string, unknown> = {};
    if (statusFilter === 'all') {
      // no status filter
    } else {
      where.status = statusFilter;
    }
    if (eventId) where.eventId = eventId;

    // "mine" flag: require auth, scope to seller, and override status to "all"
    // by default so users see both active and sold listings.
    if (mine) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return unauthorizedError('You must be logged in to view your listings');
      }
      where.sellerUserId = session.user.id;
      if (!req.nextUrl.searchParams.get('status')) {
        delete where.status; // show all statuses for the current user by default
      }
    }

    const [listings, total] = await Promise.all([
      prisma.ticketListing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.ticketListing.count({ where }),
    ]);

    return createSuccessResponse({ listings, total, limit, offset });
  } catch (error) {
    logger.error('GET /api/ticket-resale failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load listings');
  }
}

/**
 * POST /api/ticket-resale
 * Create a new listing for a ticket the user already paid for via EventRSVP.
 * Body: { rsvpId, askingPrice, currency?, notes? }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in to list a ticket');
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return validationError('Invalid JSON body');
    }

    const validation = validateBody(createTicketListingSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { rsvpId, askingPrice, currency, notes } = validation.data;
    const userId = session.user.id;

    // Verify the RSVP exists, belongs to the seller, is paid, and is "going"
    const rsvp = await prisma.eventRSVP.findUnique({
      where: { id: rsvpId },
    });

    if (!rsvp) {
      return notFoundError('RSVP');
    }
    if (rsvp.userId !== userId) {
      return forbiddenError('You do not own this ticket');
    }
    if (!rsvp.paid) {
      return forbiddenError(
        'Only paid tickets can be listed for resale'
      );
    }
    if (rsvp.status !== 'going') {
      return forbiddenError('Only confirmed "going" tickets can be resold');
    }

    // Prevent duplicate active listings for the same RSVP
    const existing = await prisma.ticketListing.findUnique({
      where: { rsvpId },
    });
    if (existing && (existing.status === 'listed' || existing.status === 'sold')) {
      return conflictError(
        existing.status === 'sold'
          ? 'This ticket has already been sold'
          : 'This ticket is already listed for resale'
      );
    }

    const listing = existing
      ? await prisma.ticketListing.update({
          where: { id: existing.id },
          data: {
            status: 'listed',
            askingPrice,
            currency: currency || rsvp.currency || 'USD',
            originalPrice: rsvp.amount ?? existing.originalPrice,
            ticketTier: rsvp.ticketTier ?? existing.ticketTier,
            notes: notes ?? null,
            buyerUserId: null,
            soldAt: null,
          },
        })
      : await prisma.ticketListing.create({
          data: {
            rsvpId,
            eventId: rsvp.eventId,
            sellerUserId: userId,
            ticketTier: rsvp.ticketTier ?? null,
            askingPrice,
            currency: currency || rsvp.currency || 'USD',
            originalPrice: rsvp.amount ?? null,
            status: 'listed',
            notes: notes ?? null,
          },
        });

    logger.info('Ticket listing created', {
      listingId: listing.id,
      rsvpId,
      eventId: rsvp.eventId,
      sellerUserId: userId,
      askingPrice,
    });

    return createSuccessResponse({ listing }, 201);
  } catch (error) {
    logger.error('POST /api/ticket-resale failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create listing');
  }
}
