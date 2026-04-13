// ─── SAM.gov Subaward Reporting API Integration ─────────────────────────────
// Fetches first-tier subcontractor data from the FSRS system (now part of SAM.gov).
// This reveals teaming arrangements: which companies subcontract to which primes.
// Only covers subawards > $25,000.
// API docs: https://open.gsa.gov/api/acquisition-subaward-reporting-api/

import prisma from '@/lib/db';
import { logger } from '../logger';

const SUBAWARD_URL = 'https://api.sam.gov/prod/subawards/v1/subawards';

// Space agencies to filter by
const SPACE_AGENCIES = [
  'NATIONAL AERONAUTICS AND SPACE ADMINISTRATION',
  'DEPT OF DEFENSE',
  'DEPT OF THE AIR FORCE',
  'DEPT OF COMMERCE', // NOAA
];

async function matchCompanyByName(name: string): Promise<string | null> {
  if (!name) return null;
  const profile = await prisma.companyProfile.findFirst({
    where: {
      OR: [
        { name: { equals: name, mode: 'insensitive' } },
        { name: { contains: name.split(' ')[0], mode: 'insensitive' } },
      ],
    },
    select: { id: true },
  });
  return profile?.id || null;
}

/**
 * Fetch space-related subaward relationships from SAM.gov.
 * Reveals prime → subcontractor teaming arrangements.
 * Runs monthly via cron scheduler.
 */
export async function fetchSpaceSubawards(): Promise<number> {
  const apiKey = process.env.SAM_GOV_API_KEY;
  if (!apiKey) {
    logger.debug('SAM_GOV_API_KEY not set — skipping subaward fetch');
    return 0;
  }

  let totalStored = 0;

  for (const agency of SPACE_AGENCIES) {
    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        agency_name: agency,
        limit: '50',
        offset: '0',
      });

      const res = await fetch(`${SUBAWARD_URL}?${params}`, {
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        logger.debug('SAM.gov subaward fetch failed for agency', { agency, status: res.status });
        continue;
      }

      const data = await res.json();
      const subawards = data?.results || data?.data || [];

      for (const sub of subawards) {
        const primeName = sub.prime_recipient_name || sub.primeEntityName || '';
        const subName = sub.sub_recipient_name || sub.subEntityLegalBusinessName || '';

        if (!primeName || !subName) continue;

        try {
          const [primeCompanyId, subCompanyId] = await Promise.all([
            matchCompanyByName(primeName),
            matchCompanyByName(subName),
          ]);

          await prisma.subawardRelationship.create({
            data: {
              primeCompanyName: primeName,
              primeCompanyId: primeCompanyId,
              primeUei: sub.prime_recipient_uei || sub.primeEntityUei || null,
              subCompanyName: subName,
              subCompanyId: subCompanyId,
              subUei: sub.sub_recipient_uei || sub.subEntityUei || null,
              subawardAmount: sub.subaward_amount ? parseFloat(sub.subaward_amount) : null,
              subawardDate: sub.subaward_action_date ? new Date(sub.subaward_action_date) : null,
              agency: agency,
              description: (sub.subaward_description || '').slice(0, 500) || null,
              piid: sub.prime_award_piid || sub.piid || null,
              naicsCode: sub.naics_code || null,
            },
          });
          totalStored++;
        } catch (err) {
          // Skip duplicate errors silently
          if (err instanceof Error && !err.message.includes('Unique constraint')) {
            logger.debug('Failed to store subaward', { primeName, subName, error: String(err) });
          }
        }
      }
    } catch (err) {
      logger.debug('SAM.gov subaward error for agency', { agency, error: String(err) });
    }
  }

  logger.info('SAM.gov subaward relationships fetched', { totalStored });
  return totalStored;
}

/**
 * Get teaming intelligence for a specific company.
 * Returns both prime contracts where company is sub, and sub contracts where company is prime.
 */
export async function getCompanyTeamingIntelligence(companyId: string) {
  const [asSubcontractor, asPrime] = await Promise.all([
    prisma.subawardRelationship.findMany({
      where: { subCompanyId: companyId },
      orderBy: { subawardDate: 'desc' },
      take: 50,
    }),
    prisma.subawardRelationship.findMany({
      where: { primeCompanyId: companyId },
      orderBy: { subawardDate: 'desc' },
      take: 50,
    }),
  ]);

  // Aggregate frequent teaming partners
  const partnerCounts: Record<string, { name: string; count: number; totalValue: number }> = {};

  for (const rel of asSubcontractor) {
    const key = rel.primeCompanyName;
    if (!partnerCounts[key]) partnerCounts[key] = { name: key, count: 0, totalValue: 0 };
    partnerCounts[key].count++;
    partnerCounts[key].totalValue += rel.subawardAmount || 0;
  }

  for (const rel of asPrime) {
    const key = rel.subCompanyName;
    if (!partnerCounts[key]) partnerCounts[key] = { name: key, count: 0, totalValue: 0 };
    partnerCounts[key].count++;
    partnerCounts[key].totalValue += rel.subawardAmount || 0;
  }

  const frequentPartners = Object.values(partnerCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    asSubcontractor,
    asPrime,
    frequentPartners,
    totalSubawardValue: asSubcontractor.reduce((s, r) => s + (r.subawardAmount || 0), 0),
    totalPrimeSubawardValue: asPrime.reduce((s, r) => s + (r.subawardAmount || 0), 0),
  };
}
