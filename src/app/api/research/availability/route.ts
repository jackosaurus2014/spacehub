import { createSuccessResponse } from '@/lib/errors';
import { getResearchAvailability } from '@/lib/research';

export const dynamic = 'force-dynamic';

/**
 * Public. The SERVER is the authority on whether SpaceNexus Research is for
 * sale; /pricing is a client component and must not guess from a NEXT_PUBLIC_
 * copy of the flag.
 *
 * When `available` is false the client renders nothing about Research — no
 * card, no price, no button. That is how "build it, do not launch it" is kept
 * honest: one env var, read in one place, and the pricing page cannot advertise
 * around it.
 *
 * `available` requires the flag AND a configured Stripe price, because a buy
 * button whose price ID is missing is a promise checkout would refuse.
 */
export async function GET() {
  return createSuccessResponse(getResearchAvailability());
}
