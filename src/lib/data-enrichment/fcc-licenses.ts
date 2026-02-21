/**
 * FCC ULS License Data Enrichment
 *
 * Fetches FCC license data for satellite operators from the
 * FCC Universal Licensing System (ULS) API.
 *
 * API docs: https://www.fcc.gov/general/license-view-api
 * Rate limit: Not formally published, but be respectful
 * Cost: Free, no API key required
 */

import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { logger } from '@/lib/logger';
import { bulkUpsertContent } from '@/lib/dynamic-content';

const fccBreaker = createCircuitBreaker('fcc-licenses', {
  failureThreshold: 3,
  resetTimeout: 300000,
});

const FCC_LICENSE_API = 'https://data.fcc.gov/api/license-view/basicSearch/getLicenses';

/** Known satellite operators and their FCC search terms */
export const SPACE_FCC_OPERATORS: Array<{
  searchTerm: string;
  displayName: string;
}> = [
  { searchTerm: 'SPACEX', displayName: 'SpaceX' },
  { searchTerm: 'STARLINK', displayName: 'Starlink (SpaceX)' },
  { searchTerm: 'KUIPER', displayName: 'Project Kuiper (Amazon)' },
  { searchTerm: 'ONEWEB', displayName: 'OneWeb' },
  { searchTerm: 'SES', displayName: 'SES S.A.' },
  { searchTerm: 'TELESAT', displayName: 'Telesat' },
  { searchTerm: 'VIASAT', displayName: 'Viasat' },
  { searchTerm: 'IRIDIUM', displayName: 'Iridium Communications' },
  { searchTerm: 'GLOBALSTAR', displayName: 'Globalstar' },
  { searchTerm: 'HUGHESNET', displayName: 'Hughes Network Systems' },
  { searchTerm: 'ECHOSTAR', displayName: 'EchoStar' },
  { searchTerm: 'INTELSAT', displayName: 'Intelsat' },
  { searchTerm: 'ORBCOMM', displayName: 'ORBCOMM' },
  { searchTerm: 'PLANET LABS', displayName: 'Planet Labs' },
  { searchTerm: 'SPIRE', displayName: 'Spire Global' },
  { searchTerm: 'BLACKSKY', displayName: 'BlackSky Technology' },
];

interface RawFCCLicense {
  licName?: string;
  frn?: string;
  callsign?: string;
  categoryDesc?: string;
  serviceDesc?: string;
  statusDesc?: string;
  expiredDate?: string;
  issueDate?: string;
  effectiveDate?: string;
  cancellationDate?: string;
  lastActionDate?: string;
  licenseID?: string;
}

export interface FCCLicenseRecord {
  licenseName: string;
  frn: string | null;
  callSign: string | null;
  category: string | null;
  serviceType: string | null;
  status: string | null;
  issueDate: string | null;
  effectiveDate: string | null;
  expirationDate: string | null;
  cancellationDate: string | null;
  lastActionDate: string | null;
  licenseId: string | null;
  fccUrl: string | null;
}

export interface CompanyLicenseSummary {
  searchTerm: string;
  displayName: string;
  totalLicenses: number;
  activeLicenses: number;
  licenses: FCCLicenseRecord[];
  serviceTypes: Array<{ type: string; count: number }>;
  latestIssueDate: string | null;
  earliestExpirationDate: string | null;
  fetchedAt: string;
}

/**
 * Delay helper for rate limiting between API calls.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Map a raw FCC license record to our internal format.
 */
function mapLicense(raw: RawFCCLicense): FCCLicenseRecord {
  const licenseId = raw.licenseID || null;

  return {
    licenseName: raw.licName || 'Unknown',
    frn: raw.frn || null,
    callSign: raw.callsign || null,
    category: raw.categoryDesc || null,
    serviceType: raw.serviceDesc || null,
    status: raw.statusDesc || null,
    issueDate: raw.issueDate || null,
    effectiveDate: raw.effectiveDate || null,
    expirationDate: raw.expiredDate || null,
    cancellationDate: raw.cancellationDate || null,
    lastActionDate: raw.lastActionDate || null,
    licenseId,
    fccUrl: licenseId
      ? `https://wireless2.fcc.gov/UlsApp/UlsSearch/license.jsp?licKey=${licenseId}`
      : null,
  };
}

/**
 * Compute service type breakdown from licenses.
 */
function computeServiceTypes(licenses: FCCLicenseRecord[]): Array<{ type: string; count: number }> {
  const typeCounts = new Map<string, number>();

  for (const lic of licenses) {
    const serviceType = lic.serviceType || 'Unknown';
    typeCounts.set(serviceType, (typeCounts.get(serviceType) || 0) + 1);
  }

  return Array.from(typeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Fetch FCC licenses for a single search term (company/operator name).
 */
export async function fetchCompanyLicenses(searchTerm: string): Promise<CompanyLicenseSummary | null> {
  const operator = SPACE_FCC_OPERATORS.find(
    (o) => o.searchTerm.toLowerCase() === searchTerm.toLowerCase()
  );
  const displayName = operator?.displayName || searchTerm;

  const cacheKey = `fcc-licenses:${searchTerm.toLowerCase()}`;
  const cached = apiCache.get<CompanyLicenseSummary>(cacheKey);
  if (cached) {
    return cached;
  }

  return fccBreaker.execute(
    async () => {
      const url = `${FCC_LICENSE_API}?searchValue=${encodeURIComponent(searchTerm)}&format=json&limit=100`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SpaceNexus admin@spacenexus.us',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`FCC License API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // FCC API wraps results in SearchResult -> Licenses -> License
      const searchResult = (data.SearchResult || data.searchResult || data) as Record<string, unknown>;
      const licensesWrapper = (searchResult.Licenses || searchResult.licenses || {}) as Record<string, unknown>;
      const rawLicenses: RawFCCLicense[] = Array.isArray(licensesWrapper.License)
        ? licensesWrapper.License
        : licensesWrapper.License
          ? [licensesWrapper.License as RawFCCLicense]
          : [];

      const totalCount = parseInt(String(searchResult.totalRows || licensesWrapper.totalRows || rawLicenses.length), 10);

      const licenses = rawLicenses.map(mapLicense);

      // Count active licenses
      const activeLicenses = licenses.filter(
        (l) => l.status && l.status.toLowerCase().includes('active')
      ).length;

      // Compute service type breakdown
      const serviceTypes = computeServiceTypes(licenses);

      // Find latest issue date and earliest expiration
      const issueDates = licenses
        .map((l) => l.issueDate)
        .filter(Boolean)
        .sort()
        .reverse();

      const expirationDates = licenses
        .filter((l) => l.status && l.status.toLowerCase().includes('active'))
        .map((l) => l.expirationDate)
        .filter(Boolean)
        .sort();

      const result: CompanyLicenseSummary = {
        searchTerm,
        displayName,
        totalLicenses: totalCount,
        activeLicenses,
        licenses,
        serviceTypes,
        latestIssueDate: issueDates[0] || null,
        earliestExpirationDate: expirationDates[0] || null,
        fetchedAt: new Date().toISOString(),
      };

      // Cache for 30 minutes (license data changes infrequently)
      apiCache.set(cacheKey, result, CacheTTL.VERY_SLOW);

      logger.info('FCC ULS: Fetched licenses', {
        searchTerm,
        total: totalCount,
        active: activeLicenses,
      });

      return result;
    },
    null
  );
}

/**
 * Batch fetch FCC licenses for all known satellite operators.
 * Includes rate limiting (1.5s delay between calls).
 */
export async function fetchAllSpaceLicenses(): Promise<{
  fetched: number;
  stored: number;
  errors: string[];
}> {
  const errors: string[] = [];
  const results: CompanyLicenseSummary[] = [];

  for (const operator of SPACE_FCC_OPERATORS) {
    try {
      const result = await fetchCompanyLicenses(operator.searchTerm);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      const msg = `FCC: Failed to fetch licenses for ${operator.displayName}: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(msg);
      errors.push(msg);
    }

    // Rate limit: 1.5s between calls
    await delay(1500);
  }

  // Store via bulkUpsertContent
  let stored = 0;
  if (results.length > 0) {
    stored = await bulkUpsertContent(
      'company-enrichment',
      results.map((r) => ({
        contentKey: `fcc-licenses:${r.searchTerm.toLowerCase().replace(/\s+/g, '-')}`,
        section: 'fcc-licenses',
        data: r,
      })),
      {
        sourceType: 'api',
        sourceUrl: 'https://data.fcc.gov/api/license-view/',
      }
    );
  }

  logger.info('FCC ULS: Batch fetch completed', {
    fetched: results.length,
    stored,
    errors: errors.length,
  });

  return { fetched: results.length, stored, errors };
}
