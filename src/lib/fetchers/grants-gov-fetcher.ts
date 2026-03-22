// ─── Grants.gov Integration ──────────────────────────────────────────────────
// Fetches federal grant opportunities from Grants.gov Search API.
// Covers NASA, NOAA, NSF, DoD, DOE grants — free, no auth needed.
// API docs: https://grants.gov/api/api-guide

import { logger } from '../logger';
import { upsertContent } from '../dynamic-content';

const SEARCH_URL = 'https://api.grants.gov/v1/api/search2';

// Space-related keywords to search for
const SPACE_KEYWORDS = [
  'space technology', 'satellite', 'launch vehicle', 'orbital',
  'aerospace', 'rocket propulsion', 'Earth observation',
  'remote sensing', 'space weather', 'planetary science',
  'SBIR space', 'STTR space', 'lunar', 'Mars',
];

// Agencies that fund space work
const SPACE_AGENCIES = ['NASA', 'DOD', 'NOAA', 'NSF', 'DOE'];

interface GrantsGovOpportunity {
  id: string;
  number: string;
  title: string;
  agency: string;
  openDate: string;
  closeDate: string;
  description: string;
  category: string;
  estimatedFunding: string;
  expectedAwards: number;
  url: string;
}

/**
 * Fetch space-related grant opportunities from Grants.gov.
 * Runs daily via cron scheduler.
 */
export async function fetchSpaceGrants(): Promise<number> {
  let totalFound = 0;
  const allOpportunities: GrantsGovOpportunity[] = [];

  for (const keyword of SPACE_KEYWORDS.slice(0, 5)) { // Limit to 5 searches per run
    try {
      const res = await fetch(SEARCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword,
          oppStatuses: 'forecasted|posted',
          rows: 25,
          sortBy: 'openDate|desc',
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        logger.debug('Grants.gov search failed for keyword: ' + keyword, { status: res.status });
        continue;
      }

      const data = await res.json();
      const opportunities = data?.opportunitiesData || data?.oppHits || [];

      for (const opp of opportunities) {
        // Filter to space-relevant agencies
        const agency = opp.agencyCode || opp.agency || '';
        const isSpaceAgency = SPACE_AGENCIES.some(a => agency.toUpperCase().includes(a));
        const title = opp.title || opp.opportunityTitle || '';
        const isSpaceTitle = SPACE_KEYWORDS.some(kw => title.toLowerCase().includes(kw.toLowerCase()));

        if (isSpaceAgency || isSpaceTitle) {
          const id = opp.id || opp.opportunityId || opp.number || String(Math.random());
          // Deduplicate
          if (!allOpportunities.some(o => o.id === id)) {
            allOpportunities.push({
              id,
              number: opp.number || opp.opportunityNumber || '',
              title,
              agency,
              openDate: opp.openDate || opp.postDate || '',
              closeDate: opp.closeDate || opp.archiveDate || '',
              description: (opp.description || opp.synopsis || '').slice(0, 500),
              category: opp.fundingCategory || opp.category || 'Research',
              estimatedFunding: opp.awardCeiling || opp.estimatedFunding || 'Not specified',
              expectedAwards: opp.expectedNumberOfAwards || 0,
              url: `https://grants.gov/search-results-detail/${id}`,
            });
            totalFound++;
          }
        }
      }
    } catch (err) {
      logger.debug('Grants.gov fetch error for keyword: ' + keyword, { error: String(err) });
    }
  }

  // Store results
  if (allOpportunities.length > 0) {
    await upsertContent(
      'procurement:grants-gov:space-opportunities',
      'procurement',
      'grants-gov',
      allOpportunities.slice(0, 50), // Keep top 50
      { sourceType: 'api', sourceUrl: 'https://grants.gov' },
    );
  }

  logger.info('Grants.gov space grants fetched', { count: totalFound });
  return totalFound;
}
