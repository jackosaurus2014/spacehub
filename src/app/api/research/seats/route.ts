import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import prisma from '@/lib/db';
import {
  createSuccessResponse,
  forbiddenError,
  internalError,
  validationError,
} from '@/lib/errors';
import { researchSeatInviteSchema, validateBody } from '@/lib/validations';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { RESEARCH_INVITE_TTL_DAYS, hashResearchInviteToken } from '@/lib/research';
import { requireResearchAccess } from '@/lib/research-guard';
import { sendResearchSeatInvite } from '@/lib/research-email';

export const dynamic = 'force-dynamic';

/**
 * Seat administration. OWNER ONLY.
 *
 * A seat holder has Research capability but zero authority over the
 * subscription: they cannot list, invite or revoke seats, and cannot see who
 * else is on the account beyond what the owner tells them. That is enforced
 * here by requiring access.via === 'owner' (or the internal 'test' tier) rather
 * than merely requiring Research access — the most common way a seat model
 * leaks is treating "has access" as "is the admin".
 */
async function requireOwner(userId: string | undefined) {
  const gate = await requireResearchAccess(userId);
  if ('error' in gate) return { error: gate.error };
  if (gate.access.via !== 'owner' && gate.access.via !== 'test') {
    return {
      error: forbiddenError(
        'Only the account that pays for this SpaceNexus Research subscription can manage its seats.'
      ),
    };
  }
  return { access: gate.access };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const owner = await requireOwner(session?.user?.id);
  if ('error' in owner) return owner.error;

  try {
    const ownerUserId = owner.access.ownerUserId;
    const seats = await prisma.researchSeat.findMany({
      where: { ownerUserId, status: { in: ['invited', 'active'] } },
      orderBy: [{ acceptedAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });

    const memberCap = Math.max(0, owner.access.seatsTotal - 1);
    const active = seats.filter((s) => s.status === 'active');

    return createSuccessResponse({
      seatsTotal: owner.access.seatsTotal,
      memberSeatCap: memberCap,
      // Mirrors resolveResearchAccess exactly: the first `memberCap` ACTIVE
      // seats in this order are the authorized ones. Shown to the owner so a
      // seat that has fallen outside the cap is visible, not mysterious.
      seats: seats.map((s, i) => ({
        id: s.id,
        email: s.email,
        status: s.status,
        invitedAt: s.invitedAt.toISOString(),
        acceptedAt: s.acceptedAt?.toISOString() ?? null,
        withinCap:
          s.status === 'active' ? active.findIndex((a) => a.id === s.id) < memberCap : undefined,
        position: i + 1,
      })),
      seatsUsed: active.length,
    });
  } catch (error) {
    logger.error('Failed to list research seats', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not load your seats.');
  }
}

/** Invite a named user to a seat. Owner only. */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const owner = await requireOwner(session?.user?.id);
  if ('error' in owner) return owner.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return validationError('Request body must be JSON.');
  }

  const parsed = validateBody(researchSeatInviteSchema, body);
  if (!parsed.success) {
    const first = Object.values(parsed.errors)[0]?.[0] || 'Enter a valid email address';
    return validationError(first, parsed.errors);
  }

  const email = parsed.data.email.toLowerCase();
  const ownerUserId = owner.access.ownerUserId;

  try {
    const ownerUser = await prisma.user.findUnique({
      where: { id: ownerUserId },
      select: { email: true, name: true },
    });
    if (ownerUser?.email && ownerUser.email.toLowerCase() === email) {
      return validationError(
        'You already hold a seat as the account owner — invite your colleagues instead.'
      );
    }

    const memberCap = Math.max(0, owner.access.seatsTotal - 1);
    const held = await prisma.researchSeat.count({
      where: { ownerUserId, status: { in: ['invited', 'active'] }, NOT: { email } },
    });
    if (held >= memberCap) {
      return validationError(
        `This subscription covers ${owner.access.seatsTotal} named users (you plus ${memberCap}). Revoke a seat, or add seats in the billing portal, before inviting another.`
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESEARCH_INVITE_TTL_DAYS * 86_400_000);

    // Upsert on (ownerUserId, email): re-inviting the same address replaces the
    // outstanding invite rather than consuming a second seat.
    const seat = await prisma.researchSeat.upsert({
      where: { ownerUserId_email: { ownerUserId, email } },
      create: {
        ownerUserId,
        email,
        status: 'invited',
        inviteTokenHash: hashResearchInviteToken(token),
        inviteExpiresAt: expiresAt,
      },
      update: {
        status: 'invited',
        memberUserId: null,
        acceptedAt: null,
        revokedAt: null,
        invitedAt: new Date(),
        inviteTokenHash: hashResearchInviteToken(token),
        inviteExpiresAt: expiresAt,
      },
    });

    const sent = await sendResearchSeatInvite({
      to: email,
      token,
      inviterName: ownerUser?.name ?? null,
      expiresAt,
    });

    logger.info('Research seat invited', { ownerUserId, seatId: seat.id, emailSent: sent });

    return createSuccessResponse({
      id: seat.id,
      email: seat.email,
      status: seat.status,
      expiresAt: expiresAt.toISOString(),
      emailSent: sent,
    });
  } catch (error) {
    logger.error('Failed to invite research seat', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Could not send that seat invite.');
  }
}
