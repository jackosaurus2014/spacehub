import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  createSuccessResponse,
  internalError,
  notFoundError,
  validationError,
} from '@/lib/errors';
import { logger } from '@/lib/logger';
import { requireResearchAccess } from '@/lib/research-guard';
import {
  cancelRegistration,
  getCallById,
  getRegistration,
  getScheduledCall,
  registerForCall,
} from '@/lib/research-call';

export const dynamic = 'force-dynamic';

const registerSchema = z.object({
  callId: z.string().min(1).max(64).optional(),
  question: z.string().max(1000).optional(),
});

/**
 * Register for the quarterly briefing call.
 *
 * GATE: requireResearchAccess, server-side, first. A seat holder registers as
 * themselves; ownerUserId is recorded from the authorization that actually
 * happened rather than from anything the client sent, so a later seat change
 * cannot rewrite who a registration was billed under.
 *
 * There is no path here that creates a call. If no call is scheduled this
 * returns 404 with that exact statement — the software never invents a date.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = registerSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return validationError('Send an optional callId and an optional question.');
  }

  const call = parsed.data.callId
    ? await getCallById(parsed.data.callId)
    : await getScheduledCall();
  if (!call || call.status !== 'scheduled' || !call.scheduledAt) {
    return notFoundError(
      'No briefing call is scheduled. Registration opens when a date is set.'
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session!.user!.id },
    select: { email: true, name: true },
  });
  if (!user?.email) {
    return validationError('Your account needs a verified email address to register.');
  }

  const registration = await registerForCall({
    callId: call.id,
    userId: session!.user!.id,
    access: gate.access,
    email: user.email,
    name: user.name,
    question: parsed.data.question ?? null,
  });
  if (!registration) return internalError('Could not record that registration.');

  logger.info('Research call registration', {
    callId: call.id,
    via: gate.access.via,
    ownerUserId: gate.access.ownerUserId,
  });

  return createSuccessResponse({
    registered: true,
    callId: call.id,
    scheduledAt: call.scheduledAt,
    inviteUrl: `/api/research/call/${call.id}/invite.ics`,
  });
}

/** Cancel a registration. Same gate; a seat may only cancel its own row. */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  const callId = new URL(req.url).searchParams.get('callId');
  const call = callId ? await getCallById(callId) : await getScheduledCall();
  if (!call) return notFoundError('No such call.');

  const existing = await getRegistration(call.id, session!.user!.id);
  if (!existing) return createSuccessResponse({ registered: false, callId: call.id });

  const ok = await cancelRegistration(call.id, session!.user!.id);
  if (!ok) return internalError('Could not cancel that registration.');
  return createSuccessResponse({ registered: false, callId: call.id });
}

/** Whether the caller is registered, and for what. */
export async function GET() {
  const session = await getServerSession(authOptions);
  const gate = await requireResearchAccess(session?.user?.id);
  if ('error' in gate) return gate.error;

  const call = await getScheduledCall();
  if (!call) {
    return createSuccessResponse({ scheduled: false, registered: false });
  }
  const registration = await getRegistration(call.id, session!.user!.id);
  return createSuccessResponse({
    scheduled: true,
    callId: call.id,
    scheduledAt: call.scheduledAt,
    registered: !!registration,
    // The join URL is released only to a registered seat holder.
    joinUrl: registration ? call.joinUrl : null,
  });
}
