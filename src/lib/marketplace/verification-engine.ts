import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export type VerificationLevel = 'none' | 'identity' | 'capability' | 'performance';

interface VerificationResult {
  currentLevel: VerificationLevel;
  qualifiedLevel: VerificationLevel;
  upgraded: boolean;
  criteria: Record<string, boolean>;
}

const LEVEL_ORDER: VerificationLevel[] = ['none', 'identity', 'capability', 'performance'];

function levelIndex(level: VerificationLevel): number {
  return LEVEL_ORDER.indexOf(level);
}

/**
 * Evaluate the highest verification level a company qualifies for.
 * Only upgrades — never downgrades automatically.
 */
export async function evaluateVerificationLevel(companyId: string): Promise<VerificationResult> {
  const company = await prisma.companyProfile.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      verificationLevel: true,
      claimedByUserId: true,
      claimedAt: true,
      cageCode: true,
      samUei: true,
    },
  });

  if (!company) {
    return { currentLevel: 'none', qualifiedLevel: 'none', upgraded: false, criteria: {} };
  }

  const currentLevel = (company.verificationLevel || 'none') as VerificationLevel;
  const criteria: Record<string, boolean> = {};

  // Identity: User has claimed the company profile
  criteria.claimed = !!company.claimedByUserId;

  // Capability checks
  const [listingCount, hasGovContract, hasSamRegistration] = await Promise.all([
    prisma.serviceListing.count({
      where: { companyId, status: 'active', certifications: { isEmpty: false } },
    }),
    prisma.governmentContractAward.count({
      where: { companyId },
    }).catch(() => 0),
    Promise.resolve(!!company.cageCode || !!company.samUei),
  ]);

  criteria.hasThreeListingsWithCerts = listingCount >= 3;
  criteria.hasGovContract = hasGovContract > 0;
  criteria.hasSamRegistration = hasSamRegistration;

  // Performance checks
  const [reviewStats, awardedRfqs] = await Promise.all([
    prisma.providerReview.aggregate({
      where: { companyId, status: 'published' },
      _count: { id: true },
      _avg: { overallRating: true },
    }),
    prisma.rFQ.count({
      where: { awardedToCompanyId: companyId, status: 'awarded' },
    }),
  ]);

  criteria.fivePlusReviews = (reviewStats._count.id || 0) >= 5;
  criteria.avgRatingAboveFour = (reviewStats._avg.overallRating || 0) >= 4.0;
  criteria.hasAwardedRfq = awardedRfqs > 0;

  // Determine qualified level
  let qualifiedLevel: VerificationLevel = 'none';

  if (criteria.claimed) {
    qualifiedLevel = 'identity';
  }

  if (
    qualifiedLevel === 'identity' &&
    (criteria.hasGovContract || criteria.hasSamRegistration || criteria.hasThreeListingsWithCerts)
  ) {
    qualifiedLevel = 'capability';
  }

  if (
    qualifiedLevel === 'capability' &&
    criteria.fivePlusReviews &&
    criteria.avgRatingAboveFour &&
    criteria.hasAwardedRfq
  ) {
    qualifiedLevel = 'performance';
  }

  // Only upgrade, never downgrade
  const effectiveLevel = levelIndex(qualifiedLevel) > levelIndex(currentLevel)
    ? qualifiedLevel
    : currentLevel;

  return {
    currentLevel,
    qualifiedLevel: effectiveLevel,
    upgraded: levelIndex(effectiveLevel) > levelIndex(currentLevel),
    criteria,
  };
}

/**
 * Batch evaluate all claimed companies and upgrade those that qualify.
 * Returns count of upgraded companies.
 */
export async function batchEvaluateVerification(): Promise<{ evaluated: number; upgraded: number }> {
  const claimedCompanies = await prisma.companyProfile.findMany({
    where: { claimedByUserId: { not: null } },
    select: { id: true, verificationLevel: true },
  });

  let upgraded = 0;

  for (const company of claimedCompanies) {
    try {
      const result = await evaluateVerificationLevel(company.id);
      if (result.upgraded) {
        await prisma.companyProfile.update({
          where: { id: company.id },
          data: {
            verificationLevel: result.qualifiedLevel,
            verifiedAt: new Date(),
          },
        });
        upgraded++;
        logger.info('Verification upgraded', {
          companyId: company.id,
          from: result.currentLevel,
          to: result.qualifiedLevel,
        });
      }
    } catch (err) {
      logger.error('Verification evaluation failed', {
        companyId: company.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { evaluated: claimedCompanies.length, upgraded };
}
