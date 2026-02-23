import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export interface SimilarCompany {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  sector: string | null;
  subsector: string | null;
  tags: string[];
  tier: number;
  headquarters: string | null;
  totalFunding: number | null;
  similarityScore: number;
  reasons: string[];
}

/**
 * Find companies similar to the given company based on sector, tags,
 * funding stage, and competitive mappings.
 *
 * Scoring weights:
 *   - CompetitiveMapping entry (direct competitor): +40
 *   - Same sector: +25
 *   - Same subsector: +15
 *   - Each overlapping tag: +5
 *   - Shared investors in funding rounds: +10
 *   - Same tier: +5
 *
 * @param companyId - The ID of the target company
 * @param limit - Maximum number of similar companies to return (default 6)
 */
export async function findSimilarCompanies(
  companyId: string,
  limit: number = 6
): Promise<SimilarCompany[]> {
  try {
    // 1. Get the target company
    const target = await prisma.companyProfile.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        sector: true,
        subsector: true,
        tags: true,
        tier: true,
        fundingRounds: {
          select: { investors: true, leadInvestor: true },
        },
        // Get competitive mappings (both directions)
        competitorOf: {
          select: { competitorId: true },
        },
      },
    });

    if (!target) {
      return [];
    }

    // Collect investor names from the target's funding rounds
    const targetInvestors = new Set<string>();
    for (const round of target.fundingRounds || []) {
      if (round.leadInvestor) targetInvestors.add(round.leadInvestor);
      for (const inv of round.investors || []) {
        targetInvestors.add(inv);
      }
    }

    // Collect competitor IDs from CompetitiveMapping
    const competitorIds = new Set<string>(
      (target.competitorOf || []).map((c: { competitorId: string }) => c.competitorId)
    );

    // Also find reverse mappings (where this company is the competitor)
    const reverseCompetitors = await prisma.competitiveMapping.findMany({
      where: { competitorId: companyId },
      select: { companyId: true },
    });
    for (const rc of reverseCompetitors) {
      competitorIds.add(rc.companyId);
    }

    // 2. Query candidate companies: same sector OR overlapping tags OR competitor
    const candidates = await prisma.companyProfile.findMany({
      where: {
        id: { not: companyId },
        status: { not: 'defunct' },
        OR: [
          ...(target.sector ? [{ sector: target.sector }] : []),
          ...(target.subsector ? [{ subsector: target.subsector }] : []),
          ...(target.tags && target.tags.length > 0
            ? [{ tags: { hasSome: target.tags } }]
            : []),
          ...(competitorIds.size > 0
            ? [{ id: { in: Array.from(competitorIds) } }]
            : []),
        ],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        sector: true,
        subsector: true,
        tags: true,
        tier: true,
        headquarters: true,
        totalFunding: true,
        fundingRounds: {
          select: { investors: true, leadInvestor: true },
        },
      },
      take: 50, // Get a reasonable pool of candidates
    });

    // 3. Score each candidate
    const scored: SimilarCompany[] = candidates.map((candidate: any) => {
      let score = 0;
      const reasons: string[] = [];

      // Competitive mapping
      if (competitorIds.has(candidate.id)) {
        score += 40;
        reasons.push('Competitor');
      }

      // Same sector
      if (target.sector && candidate.sector === target.sector) {
        score += 25;
        if (!reasons.includes('Competitor')) {
          reasons.push('Same sector');
        }
      }

      // Same subsector
      if (target.subsector && candidate.subsector === target.subsector) {
        score += 15;
        reasons.push('Same subsector');
      }

      // Overlapping tags
      const targetTags = new Set(target.tags || []);
      const overlapTags = (candidate.tags || []).filter((t: string) => targetTags.has(t));
      if (overlapTags.length > 0) {
        score += overlapTags.length * 5;
        if (overlapTags.length >= 2) {
          reasons.push(`${overlapTags.length} shared tags`);
        } else {
          reasons.push('Shared focus area');
        }
      }

      // Shared investors
      if (targetInvestors.size > 0) {
        const candidateInvestors = new Set<string>();
        for (const round of candidate.fundingRounds || []) {
          if (round.leadInvestor) candidateInvestors.add(round.leadInvestor);
          for (const inv of round.investors || []) {
            candidateInvestors.add(inv);
          }
        }

        let sharedCount = 0;
        for (const inv of Array.from(candidateInvestors)) {
          if (targetInvestors.has(inv)) sharedCount++;
        }
        if (sharedCount > 0) {
          score += sharedCount * 10;
          reasons.push('Shared investors');
        }
      }

      // Same tier
      if (candidate.tier === target.tier) {
        score += 5;
      }

      return {
        id: candidate.id,
        slug: candidate.slug,
        name: candidate.name,
        logoUrl: candidate.logoUrl,
        sector: candidate.sector,
        subsector: candidate.subsector,
        tags: candidate.tags || [],
        tier: candidate.tier,
        headquarters: candidate.headquarters,
        totalFunding: candidate.totalFunding,
        similarityScore: score,
        reasons: reasons.length > 0 ? reasons : ['Related company'],
      };
    });

    // 4. Sort by score descending, take top N
    scored.sort((a: SimilarCompany, b: SimilarCompany) => b.similarityScore - a.similarityScore);

    return scored.slice(0, limit);
  } catch (error) {
    logger.error('Error finding similar companies', {
      error: error instanceof Error ? error.message : String(error),
      companyId,
    });
    return [];
  }
}
