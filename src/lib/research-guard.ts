/**
 * SpaceNexus Research — the route guard.
 *
 * Split out of lib/research.ts on purpose: this is the only part that needs
 * `next/server` (via lib/errors), and lib/research is imported by
 * lib/pricing-integrity, which in turn is imported by the content-accuracy
 * sentinel and its jsdom test. Keeping the NextResponse dependency in a leaf
 * module means the tier model and the flag stay importable anywhere.
 *
 * Every /api/research/** handler calls requireResearchAccess FIRST.
 * Authorization is server-side on every gated surface — the client is never
 * the gate.
 */

import { NextResponse } from 'next/server';
import { forbiddenError, unauthorizedError } from '@/lib/errors';
import {
  resolveResearchAccess,
  type ResearchAccess,
  type ResearchDenialReason,
} from '@/lib/research';

const DENIAL_MESSAGE: Record<ResearchDenialReason, string> = {
  'not-signed-in': 'Sign in with your SpaceNexus Research account to use this.',
  'no-research-subscription':
    'This is a SpaceNexus Research capability. Professional and free members keep everything they have today; Research adds full-history exports, portfolio exposure, screens and the quarterly.',
  'subscription-not-active':
    'The SpaceNexus Research subscription behind this account is not active. Check billing, or contact us and we will sort it out.',
  'seat-over-cap':
    'Your seat is outside the number of seats this subscription currently covers. The account owner can free a seat or add more.',
  'seat-revoked': 'This Research seat has been revoked by the account owner.',
};

/**
 * Returns a NextResponse to return immediately, or the resolved access.
 * Callers branch on `'error' in result`.
 */
export async function requireResearchAccess(
  userId: string | null | undefined
): Promise<{ error: NextResponse } | { access: ResearchAccess }> {
  const result = await resolveResearchAccess(userId);
  if (result.ok) return { access: result.access };
  if (result.reason === 'not-signed-in') {
    return { error: unauthorizedError(DENIAL_MESSAGE['not-signed-in']) };
  }
  return { error: forbiddenError(DENIAL_MESSAGE[result.reason]) };
}
