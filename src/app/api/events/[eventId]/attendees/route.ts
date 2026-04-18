import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  internalError,
  createSuccessResponse,
  validationError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/events/[eventId]/attendees
 *
 * Public response: confirmed-going attendees (name + verifiedBadge only).
 * Owner response: full list including email, notes, status, and waitlist.
 *
 * Owner is determined by either:
 *  - User.isAdmin = true
 *  - The event's `agency` matches a CompanyProfile owned by this user
 *    (via CompanyProfile.ownerUserId), if SpaceEvent has agency set.
 */
export async function GET(
  req: NextRequest,
  context: { params: { eventId: string } }
) {
  try {
    const eventId = context.params?.eventId;
    if (!eventId) {
      return validationError('eventId path parameter is required');
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;
    const isAdmin = session?.user?.isAdmin === true;

    // Determine ownership. SpaceEvent doesn't have an explicit owner column,
    // so we fall back to admin-only for the owner view unless the event has
    // an agency that resolves to a CompanyProfile owned by the requester.
    let isOwner = isAdmin;
    if (!isOwner && userId) {
      const event = await prisma.spaceEvent.findUnique({
        where: { id: eventId },
        select: { agency: true },
      });
      if (event?.agency) {
        const owned = await prisma.companyProfile
          .findFirst({
            where: {
              claimedByUserId: userId,
              OR: [{ name: event.agency }, { slug: event.agency }],
            },
            select: { id: true },
          })
          .catch(() => null);
        if (owned) isOwner = true;
      }
    }

    const rsvps = await prisma.eventRSVP.findMany({
      where: isOwner ? { eventId } : { eventId, status: 'going' },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            verifiedBadge: true,
          },
        },
      },
    });

    if (isOwner) {
      return createSuccessResponse({
        owner: true,
        attendees: rsvps.map((r) => ({
          id: r.id,
          status: r.status,
          ticketTier: r.ticketTier,
          paid: r.paid,
          amount: r.amount,
          currency: r.currency,
          notes: r.notes,
          createdAt: r.createdAt,
          user: {
            id: r.user?.id,
            name: r.user?.name ?? null,
            email: r.user?.email ?? null,
            verifiedBadge: r.user?.verifiedBadge ?? null,
          },
        })),
      });
    }

    return createSuccessResponse({
      owner: false,
      attendees: rsvps.map((r) => ({
        id: r.id,
        name: r.user?.name ?? 'Anonymous',
        verifiedBadge: r.user?.verifiedBadge ?? null,
      })),
    });
  } catch (error) {
    logger.error('GET /api/events/[eventId]/attendees failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load attendees');
  }
}
