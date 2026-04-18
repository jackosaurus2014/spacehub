import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * Auto-assignable verification tiers — these are computed from the user's
 * account state (admin flag, company claim, email verification).
 *
 * Manual tiers (founder, investor, media) are NEVER set or overwritten by
 * this function — only an admin can grant those via the review endpoint.
 */
const AUTOMATIC_TIERS = new Set(['unverified', 'email', 'domain', 'admin']);

/**
 * Recompute the user's verifiedBadge based on current account state.
 *
 * Precedence (highest first):
 *   admin  → User.isAdmin=true
 *   domain → User has a claimedCompany whose website domain matches the
 *            user's email domain
 *   email  → User.emailVerified=true
 *   unverified otherwise
 *
 * Manual tiers (founder, investor, media) are preserved — this function is
 * a no-op if the user already holds one of those.
 *
 * Callers should wrap this in try/catch and never let failures block their
 * main flow. This function itself also catches and logs internally.
 */
export async function recomputeVerificationBadge(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        isAdmin: true,
        verifiedBadge: true,
        claimedCompanyId: true,
      },
    });

    if (!user) {
      logger.warn('recomputeVerificationBadge: user not found', { userId });
      return;
    }

    // Never overwrite a manual tier.
    const current = user.verifiedBadge ?? 'unverified';
    if (!AUTOMATIC_TIERS.has(current)) {
      logger.debug('recomputeVerificationBadge: preserving manual tier', {
        userId,
        current,
      });
      return;
    }

    // Compute the new tier in precedence order.
    let nextTier: 'admin' | 'domain' | 'email' | 'unverified' = 'unverified';

    if (user.isAdmin) {
      nextTier = 'admin';
    } else if (user.claimedCompanyId) {
      const company = await prisma.companyProfile.findUnique({
        where: { id: user.claimedCompanyId },
        select: { website: true },
      });
      const domainMatch = checkDomainMatch(user.email, company?.website ?? null);
      if (domainMatch) {
        nextTier = 'domain';
      } else if (user.emailVerified) {
        nextTier = 'email';
      }
    } else if (user.emailVerified) {
      nextTier = 'email';
    }

    if (nextTier === current) {
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { verifiedBadge: nextTier },
    });

    logger.info('Verification badge recomputed', {
      userId,
      previous: current,
      next: nextTier,
    });
  } catch (error) {
    logger.error('recomputeVerificationBadge failed', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Returns true when the user's email domain matches the company website's
 * hostname (ignoring `www.` prefix). Malformed URLs return false.
 */
function checkDomainMatch(email: string | null | undefined, website: string | null): boolean {
  if (!email || !website) return false;
  const emailDomain = email.split('@')[1]?.toLowerCase();
  if (!emailDomain) return false;
  try {
    const companyDomain = new URL(website).hostname.replace(/^www\./, '').toLowerCase();
    return !!companyDomain && emailDomain === companyDomain;
  } catch {
    return false;
  }
}
