import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import {
  createSuccessResponse,
  forbiddenError,
  internalError,
  notFoundError,
} from '@/lib/errors';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { requireResearchAccess } from '@/lib/research-guard';
import { sendResearchSeatRevoked } from '@/lib/research-email';

export const dynamic = 'force-dynamic';

/**
 * Revoke a seat. OWNER ONLY, and scoped to the owner's own ownerUserId so one
 * Research customer can never revoke another's seat by id.
 *
 * Revocation is immediate: resolveResearchAccess only ever looks at seats in
 * status 'active', so the next request from that member is denied. The row is
 * kept (status 'revoked') rather than deleted, so the owner can see the history
 * of who held a seat.
 */
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  if (gate.access.via !== 'owner' && gate.access.via !== 'test') {
    return forbiddenError(
      'Only the account that pays for this SpaceNexus Research subscription can manage its seats.'
    );
  }

  const seat = await prisma.researchSeat.findFirst({
    where: { id, ownerUserId: gate.access.ownerUserId },
  });
  if (!seat) return notFoundError('Seat not found.');

  try {
    await prisma.researchSeat.update({
      where: { id: seat.id },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        memberUserId: null,
        // Destroy any outstanding invite so a revoked seat's old link is dead.
        inviteTokenHash: null,
        inviteExpiresAt: null,
      },
    });

    const owner = await prisma.user.findUnique({
      where: { id: gate.access.ownerUserId },
      select: { name: true },
    });
    if (seat.status === 'active') {
      await sendResearchSeatRevoked({ to: seat.email, ownerName: owner?.name ?? null });
    }

    logger.info('Research seat revoked', {
      seatId: seat.id,
      ownerUserId: gate.access.ownerUserId,
    });

    return createSuccessResponse({ id: seat.id, status: 'revoked' });
  } catch (error) {
    logger.error('Failed to revoke research seat', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not revoke that seat.');
  }
}
