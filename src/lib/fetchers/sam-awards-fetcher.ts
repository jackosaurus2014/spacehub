// ─── SAM.gov Contract Awards API Integration ────────────────────────────────
// Fetches historical contract award data (who won, how much, which agency).
// Uses same API key as existing SAM.gov opportunities integration.
// API docs: https://open.gsa.gov/api/contract-awards/
// This replaces the deprecated FPDS.gov (merged into SAM.gov Feb 2026).

import { logger } from '../logger';
import { upsertContent } from '../dynamic-content';

const AWARDS_URL = 'https://api.sam.gov/prod/contractdata/v1/awards';

// Space-related NAICS codes
const SPACE_NAICS = [
  '336414', // Guided missile and space vehicle manufacturing
  '336415', // Guided missile and space vehicle propulsion unit
  '336419', // Other guided missile and space vehicle parts
  '517410', // Satellite telecommunications
  '541715', // R&D in physical, engineering, and life sciences
  '927110', // Space research and technology (NASA)
];

interface ContractAward {
  awardId: string;
  contractNumber: string;
  vendorName: string;
  awardAmount: number;
  agencyName: string;
  description: string;
  awardDate: string;
  naicsCode: string;
  placeOfPerformance: string;
}

/**
 * Fetch recent space-related contract awards from SAM.gov.
 * Runs weekly via cron scheduler.
 */
export async function fetchSpaceContractAwards(): Promise<number> {
  const apiKey = process.env.SAM_GOV_API_KEY;
  if (!apiKey) {
    logger.debug('SAM_GOV_API_KEY not set — skipping contract awards fetch');
    return 0;
  }

  const allAwards: ContractAward[] = [];

  for (const naics of SPACE_NAICS.slice(0, 3)) { // Limit API calls
    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        naicsCode: naics,
        limit: '25',
        offset: '0',
      });

      const res = await fetch(`${AWARDS_URL}?${params}`, {
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        logger.debug('SAM.gov awards fetch failed for NAICS ' + naics, { status: res.status });
        continue;
      }

      const data = await res.json();
      const awards = data?.data || data?.results || [];

      for (const award of awards) {
        allAwards.push({
          awardId: award.awardId || award.piid || String(Math.random()),
          contractNumber: award.piid || award.contractNumber || '',
          vendorName: award.vendorName || award.recipientName || 'Unknown',
          awardAmount: parseFloat(award.totalObligatedAmount || award.awardAmount || '0'),
          agencyName: award.agencyName || award.fundingAgency || '',
          description: (award.descriptionOfContractRequirement || award.description || '').slice(0, 300),
          awardDate: award.signedDate || award.awardDate || '',
          naicsCode: naics,
          placeOfPerformance: award.placeOfPerformanceCity || '',
        });
      }
    } catch (err) {
      logger.debug('SAM.gov awards error for NAICS ' + naics, { error: String(err) });
    }
  }

  // Store results
  if (allAwards.length > 0) {
    await upsertContent(
      'procurement:sam-awards:recent-space-contracts',
      'procurement',
      'sam-awards',
      allAwards.slice(0, 50),
      { sourceType: 'api', sourceUrl: 'https://sam.gov' },
    );
  }

  logger.info('SAM.gov contract awards fetched', { count: allAwards.length });
  return allAwards.length;
}
