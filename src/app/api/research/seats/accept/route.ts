import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import {
  createSuccessResponse,
  forbiddenError,
  internalError,
  unauthorizedError,
  validationError,
} from '@/lib/errors';
import { researchSeatAcceptSchema, validateBody } from '@/lib/validations';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { hashResearchInviteToken } from '@/lib/research';
import { normalizeTier } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

/**
 * Accept a seat invite. This is the one place a seat comes into existence, so
 * every condition is checked here and none of them is optional:
 *
 *   1. The caller is SIGNED IN. An invite link alone grants nothing.
 *   2. The token matches a live invite by SHA-256 hash, is unexpired, and is
 *      still in status 'invited' (single use — accepting flips the status and
 *      clears the hash, so a forwarded link cannot be replayed).
 *   3. The caller's account email EQUALS the invited address, case-insensitively,
 *      AND is verified. Forwarding the email to a colleague does not transfer
 *      the seat; the owner must invite them by name.
 *   4. The owner is STILL an active Research subscriber at accept time.
 *
 * The seat never writes to User.subscriptionTier. It grants the Research
 * capability set through resolveResearchAccess and nothing else.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return unauthorizedError('Sign in to the SpaceNexus account that was invited, then accept.');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return validationError('Request body must be JSON.');
  }

  const parsed = validateBody(researchSeatAcceptSchema, body);
  if (!parsed.success) {
    const first = Object.values(parsed.errors)[0]?.[0] || 'Invalid invite token';
    return validationError(first, parsed.errors);
  }

  try {
    const seat = await prisma.researchSeat.findUnique({
      where: { inviteTokenHash: hashResearchInviteToken(parsed.data.token) },
    });

    // One message for every "this invite is no good" case, so the endpoint
    // cannot be used to probe which tokens exist.
    const invalid = forbiddenError(
      'That invite is not valid any more. Ask the account owner to send a new one.'
    );

    if (!seat || seat.status !== 'invited') return invalid;
    if (!seat.inviteExpiresAt || seat.inviteExpiresAt.getTime() < Date.now()) return invalid;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, emailVerified: true },
    });
    if (!user?.email) return invalid;

    if (user.email.toLowerCase() !== seat.email.toLowerCase()) {
      return forbiddenError(
        `This seat was issued to ${seat.email}. Sign in with that account, or ask the owner to invite this address instead.`
      );
    }
    if (!user.emailVerified) {
      return forbiddenError('Verify your email address before accepting a Research seat.');
    }

    const owner = await prisma.user.findUnique({
      where: { id: seat.ownerUserId },
      select: { subscriptionTier: true, subscriptionStatus: true },
    });
    if (
      !owner ||
      normalizeTier(owner.subscriptionTier) !== 'research' ||
      owner.subscriptionStatus !== 'active'
    ) {
      return forbiddenError(
        'The SpaceNexus Research subscription behind this invite is not active.'
      );
    }

    const accepted = await prisma.researchSeat.update({
      where: { id: seat.id },
      data: {
        memberUserId: user.id,
        status: 'active',
        acceptedAt: new Date(),
        // Single use: the hash is destroyed the moment the seat is claimed.
        inviteTokenHash: null,
        inviteExpiresAt: null,
      },
    });

    logger.info('Research seat accepted', {
      seatId: accepted.id,
      ownerUserId: seat.ownerUserId,
      memberUserId: user.id,
    });

    return createSuccessResponse({ id: accepted.id, status: accepted.status });
  } catch (error) {
    logger.error('Failed to accept research seat', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not accept that seat invite.');
  }
}
