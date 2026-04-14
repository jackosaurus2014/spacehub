// ─── SBIR.gov Awards API Integration ────────────────────────────────────────
// Fetches SBIR/STTR award data to identify which companies win space R&D contracts.
// Multiple winners on the same topicCode reveals competitors in the same technology area.
// API docs: https://www.sbir.gov/api
// No API key required (public API).

import prisma from '@/lib/db';
import { logger } from '../logger';

const SBIR_AWARDS_URL = 'https://www.sbir.gov/api/awards.json';

// Space agencies
const SPACE_AGENCIES = ['NASA', 'DOD', 'NOAA'];

// Keywords to identify space-related SBIR awards
const SPACE_KEYWORDS = [
  'space', 'satellite', 'orbit', 'launch', 'rocket', 'propulsion', 'spacecraft',
  'lunar', 'mars', 'asteroid', 'telescope', 'remote sensing', 'earth observation',
  'GPS', 'navigation', 'cislunar', 'deep space', 'solar array', 'radiation',
  'microgravity', 'LEO', 'GEO', 'MEO', 'smallsat', 'cubesat', 'constellation',
  'artemis', 'space station', 'habitat', 'ISRU', 'in-space',
];

function isSpaceRelated(title: string, abstract: string): boolean {
  const text = `${title} ${abstract}`.toLowerCase();
  return SPACE_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
}

async function matchCompanyByName(firmName: string): Promise<string | null> {
  if (!firmName) return null;
  const profile = await prisma.companyProfile.findFirst({
    where: {
      OR: [
        { name: { equals: firmName, mode: 'insensitive' } },
        { name: { contains: firmName.replace(/,?\s*(Inc|LLC|Corp|Ltd|LP)\.?$/i, '').trim(), mode: 'insensitive' } },
      ],
    },
    select: { id: true },
  });
  return profile?.id || null;
}

/**
 * Fetch space-related SBIR/STTR awards.
 * Identifies companies competing in the same technology areas via topicCode.
 * Runs monthly via cron scheduler.
 */
export async function fetchSBIRAwards(): Promise<number> {
  let totalStored = 0;

  for (const agency of SPACE_AGENCIES) {
    try {
      // Fetch recent awards (last 2 years)
      const currentYear = new Date().getFullYear();
      for (const year of [currentYear, currentYear - 1]) {
        const params = new URLSearchParams({
          agency: agency,
          year: String(year),
          rows: '100',
          start: '0',
        });

        const res = await fetch(`${SBIR_AWARDS_URL}?${params}`, {
          signal: AbortSignal.timeout(20000),
        });

        if (!res.ok) {
          logger.debug('SBIR awards fetch failed', { agency, year, status: res.status });
          continue;
        }

        const awards = await res.json();
        if (!Array.isArray(awards)) continue;

        for (const award of awards) {
          const title = award.award_title || '';
          const abstract = award.abstract || '';

          // Filter to space-related awards
          if (agency !== 'NASA' && !isSpaceRelated(title, abstract)) continue;

          const firmName = award.firm || '';
          if (!firmName) continue;

          try {
            const companyId = await matchCompanyByName(firmName);

            await prisma.sBIRAward.upsert({
              where: {
                firm_topicCode_phase_awardYear: {
                  firm: firmName,
                  topicCode: award.topic_code || '',
                  phase: award.phase || '',
                  awardYear: year,
                },
              },
              update: {
                awardAmount: award.award_amount ? parseFloat(award.award_amount) : undefined,
                companyId: companyId || undefined,
              },
              create: {
                firm: firmName,
                companyId: companyId,
                awardTitle: title.slice(0, 500),
                agency: agency,
                phase: award.phase || 'Unknown',
                program: award.program || 'SBIR',
                topicCode: award.topic_code || null,
                awardAmount: award.award_amount ? parseFloat(award.award_amount) : null,
                awardYear: year,
                proposalAwardDate: award.proposal_award_date ? new Date(award.proposal_award_date) : null,
                contractEndDate: award.contract_end_date ? new Date(award.contract_end_date) : null,
                solicitationNumber: award.solicitation_number || null,
                abstract: abstract.slice(0, 2000) || null,
                keywords: (award.research_area_keywords || '').split(',').map((k: string) => k.trim()).filter(Boolean),
                city: award.city || null,
                state: award.state || null,
                hubzoneOwned: award.hubzone_owned === 'Y',
                womenOwned: award.women_owned === 'Y',
                numberOfEmployees: award.number_employees ? parseInt(award.number_employees, 10) : null,
              },
            });
            totalStored++;
          } catch (err) {
            if (err instanceof Error && !err.message.includes('Unique constraint')) {
              logger.debug('Failed to store SBIR award', { firm: firmName, error: String(err) });
            }
          }
        }
      }
    } catch (err) {
      logger.debug('SBIR awards fetch error', { agency, error: String(err) });
    }
  }

  logger.info('SBIR awards fetched', { totalStored });
  return totalStored;
}

/**
 * Get competitors on the same SBIR topic.
 * Companies that win awards on the same topicCode are competing in the same technology area.
 */
export async function getSBIRCompetitors(companyId: string) {
  // Find all topic codes this company has won
  const myAwards = await prisma.sBIRAward.findMany({
    where: { companyId },
    select: { topicCode: true, phase: true, agency: true, awardTitle: true },
  });

  const topicCodes = Array.from(new Set(myAwards.map(a => a.topicCode).filter((t): t is string => !!t)));

  if (topicCodes.length === 0) return { myAwards: [], competitors: [], topicAnalysis: [] };

  // Find all other companies that won on the same topics
  const competitors = await prisma.sBIRAward.findMany({
    where: {
      topicCode: { in: topicCodes },
      companyId: { not: companyId },
    },
    select: {
      firm: true,
      companyId: true,
      topicCode: true,
      phase: true,
      awardAmount: true,
      agency: true,
    },
    orderBy: { awardAmount: 'desc' },
  });

  // Aggregate by competitor
  const competitorMap: Record<string, { firm: string; companyId: string | null; topicOverlap: number; totalAwarded: number }> = {};
  for (const c of competitors) {
    const key = c.firm;
    if (!competitorMap[key]) {
      competitorMap[key] = { firm: c.firm, companyId: c.companyId, topicOverlap: 0, totalAwarded: 0 };
    }
    competitorMap[key].topicOverlap++;
    competitorMap[key].totalAwarded += c.awardAmount || 0;
  }

  return {
    myAwards,
    competitors: Object.values(competitorMap).sort((a, b) => b.topicOverlap - a.topicOverlap).slice(0, 20),
    topicAnalysis: topicCodes.map(tc => ({
      topicCode: tc,
      winnersCount: competitors.filter(c => c.topicCode === tc).length + 1, // +1 for the queried company
    })),
  };
}
