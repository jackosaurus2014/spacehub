import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { updateTicketListingSchema, validateBody } from '@/lib/validations';
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
 * GET /api/ticket-resale/[id]
 * Public: fetch a single listing with seller + rsvp info for display.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) return validationError('Listing id is required');

    const listing = await prisma.ticketListing.findUnique({
      where: { id },
    });
    if (!listing) return notFoundError('Listing');

    return createSuccessResponse({ listing });
  } catch (error) {
    logger.error('GET /api/ticket-resale/[id] failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load listing');
  }
}

/**
 * PATCH /api/ticket-resale/[id]
 * Seller-only: update askingPrice, notes, currency, or cancel.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const { id } = params;
    if (!id) return validationError('Listing id is required');

    const listing = await prisma.ticketListing.findUnique({ where: { id } });
    if (!listing) return notFoundError('Listing');
    if (listing.sellerUserId !== session.user.id) {
      return forbiddenError('You are not the seller of this listing');
    }
    if (listing.status === 'sold') {
      return conflictError('Sold listings cannot be modified');
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return validationError('Invalid JSON body');
    }

    const validation = validateBody(updateTicketListingSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { askingPrice, currency, notes, status } = validation.data;

    const updateData: Record<string, unknown> = {};
    if (askingPrice !== undefined) updateData.askingPrice = askingPrice;
    if (currency !== undefined) updateData.currency = currency;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.ticketListing.update({
      where: { id },
      data: updateData,
    });

    logger.info('Ticket listing updated', {
      listingId: id,
      sellerUserId: session.user.id,
      changes: Object.keys(updateData),
    });

    return createSuccessResponse({ listing: updated });
  } catch (error) {
    logger.error('PATCH /api/ticket-resale/[id] failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update listing');
  }
}

/**
 * DELETE /api/ticket-resale/[id]
 * Seller-only: remove a listing, but only if still in status "listed".
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const { id } = params;
    if (!id) return validationError('Listing id is required');

    const listing = await prisma.ticketListing.findUnique({ where: { id } });
    if (!listing) return notFoundError('Listing');
    if (listing.sellerUserId !== session.user.id) {
      return forbiddenError('You are not the seller of this listing');
    }
    if (listing.status !== 'listed') {
      return conflictError(
        `Cannot delete a listing with status "${listing.status}"`
      );
    }

    await prisma.ticketListing.delete({ where: { id } });

    logger.info('Ticket listing deleted', {
      listingId: id,
      sellerUserId: session.user.id,
    });

    return createSuccessResponse({ deleted: true });
  } catch (error) {
    logger.error('DELETE /api/ticket-resale/[id] failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete listing');
  }
}
