/**
 * USPTO PatentsView Data Enrichment
 *
 * Fetches patent data by assignee for space companies from the
 * USPTO PatentsView API.
 *
 * API docs: https://patentsview.org/apis/api-endpoints
 * Rate limit: Generous (no hard limit published, but be respectful)
 * Cost: Free, no API key required
 */

import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { logger } from '@/lib/logger';
import { bulkUpsertContent } from '@/lib/dynamic-content';

const usptoBreaker = createCircuitBreaker('uspto-patents', {
  failureThreshold: 3,
  resetTimeout: 300000,
});

const PATENTS_API_URL = 'https://api.patentsview.org/patents/query';

/** Space-relevant CPC codes */
const SPACE_CPC_CODES = [
  'B64G', // Cosmonautics; vehicles or equipment therefor
  'H04B7/185', // Satellite communication systems
  'F02K9', // Rocket-propulsion plants
];

/** Known space companies and their assignee names for USPTO search */
export const SPACE_PATENT_ASSIGNEES: Array<{
  searchName: string;
  displayName: string;
}> = [
  { searchName: 'SpaceX', displayName: 'SpaceX' },
  { searchName: 'Rocket Lab', displayName: 'Rocket Lab' },
  { searchName: 'Blue Origin', displayName: 'Blue Origin' },
  { searchName: 'Planet Labs', displayName: 'Planet Labs' },
  { searchName: 'Spire Global', displayName: 'Spire Global' },
  { searchName: 'AST SpaceMobile', displayName: 'AST SpaceMobile' },
  { searchName: 'BlackSky', displayName: 'BlackSky Technology' },
  { searchName: 'Redwire', displayName: 'Redwire Corporation' },
  { searchName: 'Relativity Space', displayName: 'Relativity Space' },
  { searchName: 'Astra Space', displayName: 'Astra Space' },
  { searchName: 'Viasat', displayName: 'Viasat' },
  { searchName: 'Globalstar', displayName: 'Globalstar' },
  { searchName: 'Boeing', displayName: 'Boeing' },
  { searchName: 'Lockheed Martin', displayName: 'Lockheed Martin' },
  { searchName: 'Northrop Grumman', displayName: 'Northrop Grumman' },
  { searchName: 'L3Harris', displayName: 'L3Harris Technologies' },
  { searchName: 'Raytheon', displayName: 'RTX / Raytheon' },
  { searchName: 'Sierra Nevada Corporation', displayName: 'Sierra Space' },
  { searchName: 'Maxar', displayName: 'Maxar Technologies' },
  { searchName: 'Iridium', displayName: 'Iridium Communications' },
];

export interface PatentRecord {
  patentNumber: string;
  title: string;
  abstract: string | null;
  grantDate: string;
  applicationDate: string | null;
  cpcCodes: string[];
  inventors: string[];
  citationCount: number;
  patentUrl: string;
}

export interface CompanyPatentSummary {
  assigneeName: string;
  displayName: string;
  totalPatents: number;
  patents: PatentRecord[];
  topCpcCodes: Array<{ code: string; count: number }>;
  latestPatentDate: string | null;
  fetchedAt: string;
}

/**
 * Delay helper for rate limiting between API calls.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build the PatentsView query payload for an assignee name.
 * Searches by assignee organization and optionally filters by CPC codes.
 */
function buildPatentsQuery(assigneeName: string): Record<string, unknown> {
  return {
    q: {
      _and: [
        { _contains: { assignee_organization: assigneeName } },
      ],
    },
    f: [
      'patent_number',
      'patent_title',
      'patent_abstract',
      'patent_date',
      'app_date',
      'cpc_subgroup_id',
      'inventor_first_name',
      'inventor_last_name',
      'citedby_patent_number',
    ],
    o: {
      per_page: 50,
      page: 1,
    },
    s: [{ patent_date: 'desc' }],
  };
}

/**
 * Parse the PatentsView API response into our PatentRecord format.
 */
function parsePatentsResponse(data: Record<string, unknown>): PatentRecord[] {
  const patents = (data.patents as Record<string, unknown>[]) || [];

  return patents.map((p) => {
    // Extract CPC codes
    const cpcGroups = (p.cpcs as Array<Record<string, string>>) || [];
    const cpcCodes = cpcGroups
      .map((c) => c.cpc_subgroup_id)
      .filter(Boolean);

    // Extract inventors
    const inventorRecords = (p.inventors as Array<Record<string, string>>) || [];
    const inventors = inventorRecords
      .map((inv) => `${inv.inventor_first_name || ''} ${inv.inventor_last_name || ''}`.trim())
      .filter(Boolean);

    // Count citations
    const citations = (p.citedby_patents as Array<Record<string, string>>) || [];
    const citationCount = citations.length;

    const patentNumber = (p.patent_number as string) || '';

    return {
      patentNumber,
      title: (p.patent_title as string) || 'Untitled Patent',
      abstract: (p.patent_abstract as string) || null,
      grantDate: (p.patent_date as string) || '',
      applicationDate: (p.app_date as string) || null,
      cpcCodes: Array.from(new Set(cpcCodes)), // deduplicate
      inventors,
      citationCount,
      patentUrl: `https://patents.google.com/patent/US${patentNumber}`,
    };
  });
}

/**
 * Compute the most frequent CPC codes across a set of patents.
 */
function computeTopCpcCodes(patents: PatentRecord[]): Array<{ code: string; count: number }> {
  const codeCounts = new Map<string, number>();

  for (const patent of patents) {
    for (const code of patent.cpcCodes) {
      // Use the main group (first 4 chars like B64G) for aggregation
      const mainGroup = code.substring(0, 4);
      codeCounts.set(mainGroup, (codeCounts.get(mainGroup) || 0) + 1);
    }
  }

  return Array.from(codeCounts.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Fetch patent data for a single company by assignee name.
 */
export async function fetchCompanyPatents(assigneeName: string): Promise<CompanyPatentSummary | null> {
  const company = SPACE_PATENT_ASSIGNEES.find(
    (c) => c.searchName.toLowerCase() === assigneeName.toLowerCase()
  );
  const displayName = company?.displayName || assigneeName;

  const cacheKey = `uspto-patents:${assigneeName.toLowerCase()}`;
  const cached = apiCache.get<CompanyPatentSummary>(cacheKey);
  if (cached) {
    return cached;
  }

  return usptoBreaker.execute(
    async () => {
      const query = buildPatentsQuery(assigneeName);

      const response = await fetch(PATENTS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(query),
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        throw new Error(`USPTO PatentsView API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const totalPatents = (data.total_patent_count as number) || 0;
      const patents = parsePatentsResponse(data);
      const topCpcCodes = computeTopCpcCodes(patents);

      const latestPatentDate = patents.length > 0 ? patents[0].grantDate : null;

      const result: CompanyPatentSummary = {
        assigneeName,
        displayName,
        totalPatents,
        patents,
        topCpcCodes,
        latestPatentDate,
        fetchedAt: new Date().toISOString(),
      };

      // Cache for 30 minutes (patent data is very stable)
      apiCache.set(cacheKey, result, CacheTTL.VERY_SLOW);

      logger.info('USPTO PatentsView: Fetched patents', {
        assignee: assigneeName,
        total: totalPatents,
        returned: patents.length,
      });

      return result;
    },
    null
  );
}

/**
 * Batch fetch patents for all known space companies.
 * Includes rate limiting (2s delay between calls) to be respectful.
 */
export async function fetchAllSpaceCompanyPatents(): Promise<{
  fetched: number;
  stored: number;
  errors: string[];
}> {
  const errors: string[] = [];
  const results: CompanyPatentSummary[] = [];

  for (const company of SPACE_PATENT_ASSIGNEES) {
    try {
      const result = await fetchCompanyPatents(company.searchName);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      const msg = `USPTO: Failed to fetch patents for ${company.displayName}: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(msg);
      errors.push(msg);
    }

    // Rate limit: 2s between calls
    await delay(2000);
  }

  // Store via bulkUpsertContent
  let stored = 0;
  if (results.length > 0) {
    stored = await bulkUpsertContent(
      'company-enrichment',
      results.map((r) => ({
        contentKey: `uspto-patents:${r.assigneeName.toLowerCase().replace(/\s+/g, '-')}`,
        section: 'patents',
        data: r,
      })),
      {
        sourceType: 'api',
        sourceUrl: 'https://api.patentsview.org/',
      }
    );
  }

  logger.info('USPTO PatentsView: Batch fetch completed', {
    fetched: results.length,
    stored,
    errors: errors.length,
  });

  return { fetched: results.length, stored, errors };
}
