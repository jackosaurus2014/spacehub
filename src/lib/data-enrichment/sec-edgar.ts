/**
 * SEC EDGAR Financial Data Enrichment
 *
 * Fetches 10-K and 10-Q filings for public space companies from the
 * SEC EDGAR EFTS (Electronic Filing and Transfer System) API.
 *
 * API docs: https://efts.sec.gov/LATEST/
 * Rate limit: 10 requests/second (fair access, User-Agent required)
 * Cost: Free, no API key required
 */

import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { logger } from '@/lib/logger';
import { bulkUpsertContent } from '@/lib/dynamic-content';

const edgarBreaker = createCircuitBreaker('sec-edgar', {
  failureThreshold: 3,
  resetTimeout: 300000,
});

const EDGAR_BASE_URL = 'https://efts.sec.gov/LATEST';
const EDGAR_COMPANY_URL = 'https://data.sec.gov/submissions';

const USER_AGENT = 'SpaceNexus admin@spacenexus.us';

/** Known public space companies with their CIK numbers and tickers */
export const SPACE_COMPANY_TICKERS: Array<{
  ticker: string;
  name: string;
  cik: string;
}> = [
  { ticker: 'RKLB', name: 'Rocket Lab USA', cik: '0001819994' },
  { ticker: 'PL', name: 'Planet Labs', cik: '0001836935' },
  { ticker: 'SPIR', name: 'Spire Global', cik: '0001835567' },
  { ticker: 'ASTS', name: 'AST SpaceMobile', cik: '0001780312' },
  { ticker: 'SATL', name: 'Satellogic', cik: '0001866757' },
  { ticker: 'BKSY', name: 'BlackSky Technology', cik: '0001753706' },
  { ticker: 'RDW', name: 'Redwire Corporation', cik: '0001819796' },
  { ticker: 'BA', name: 'Boeing', cik: '0000012927' },
  { ticker: 'LMT', name: 'Lockheed Martin', cik: '0000936468' },
  { ticker: 'NOC', name: 'Northrop Grumman', cik: '0001133421' },
  { ticker: 'LHX', name: 'L3Harris Technologies', cik: '0000202058' },
  { ticker: 'RTX', name: 'RTX Corporation', cik: '0000101829' },
  { ticker: 'VSAT', name: 'Viasat', cik: '0000797721' },
  { ticker: 'GSAT', name: 'Globalstar', cik: '0001176316' },
];

export interface SECFiling {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  form: string;
  primaryDocument: string;
  fileNumber: string;
}

export interface CompanyFinancialSummary {
  ticker: string;
  companyName: string;
  cik: string;
  recentFilings: SECFiling[];
  latestAnnualFiling: SECFiling | null;
  latestQuarterlyFiling: SECFiling | null;
  fiscalYearEnd: string | null;
  stateOfIncorporation: string | null;
  sic: string | null;
  sicDescription: string | null;
  edgarUrl: string;
  fetchedAt: string;
}

/**
 * Delay helper for rate limiting between API calls.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch company filing data from SEC EDGAR for a given CIK.
 * Uses the submissions endpoint which returns recent filings.
 */
async function fetchEdgarSubmissions(cik: string): Promise<Record<string, unknown> | null> {
  // Pad CIK to 10 digits
  const paddedCik = cik.replace(/^0+/, '').padStart(10, '0');
  const url = `${EDGAR_COMPANY_URL}/CIK${paddedCik}.json`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    if (response.status === 404) {
      logger.warn('SEC EDGAR: CIK not found', { cik });
      return null;
    }
    throw new Error(`SEC EDGAR API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Extract recent 10-K and 10-Q filings from EDGAR submissions data.
 */
function extractFilings(data: Record<string, unknown>): SECFiling[] {
  const recentFilings = (data.filings as Record<string, unknown>)?.recent as Record<string, unknown[]> | undefined;
  if (!recentFilings) return [];

  const forms = (recentFilings.form || []) as string[];
  const accessionNumbers = (recentFilings.accessionNumber || []) as string[];
  const filingDates = (recentFilings.filingDate || []) as string[];
  const reportDates = (recentFilings.reportDate || []) as string[];
  const primaryDocuments = (recentFilings.primaryDocument || []) as string[];
  const fileNumbers = (recentFilings.fileNumber || []) as string[];

  const filings: SECFiling[] = [];
  const targetForms = new Set(['10-K', '10-Q', '10-K/A', '10-Q/A']);

  for (let i = 0; i < forms.length && filings.length < 20; i++) {
    if (targetForms.has(forms[i])) {
      filings.push({
        accessionNumber: accessionNumbers[i] || '',
        filingDate: filingDates[i] || '',
        reportDate: reportDates[i] || '',
        form: forms[i],
        primaryDocument: primaryDocuments[i] || '',
        fileNumber: fileNumbers[i] || '',
      });
    }
  }

  return filings;
}

/**
 * Fetch financial filing summary for a single company by ticker.
 */
export async function fetchCompanyFinancials(ticker: string): Promise<CompanyFinancialSummary | null> {
  const company = SPACE_COMPANY_TICKERS.find(
    (c) => c.ticker.toUpperCase() === ticker.toUpperCase()
  );
  if (!company) {
    logger.warn('SEC EDGAR: Unknown ticker', { ticker });
    return null;
  }

  const cacheKey = `sec-edgar:${company.ticker}`;
  const cached = apiCache.get<CompanyFinancialSummary>(cacheKey);
  if (cached) {
    return cached;
  }

  return edgarBreaker.execute(
    async () => {
      const data = await fetchEdgarSubmissions(company.cik);
      if (!data) return null;

      const filings = extractFilings(data);
      const latestAnnual = filings.find((f) => f.form === '10-K' || f.form === '10-K/A') || null;
      const latestQuarterly = filings.find((f) => f.form === '10-Q' || f.form === '10-Q/A') || null;

      const result: CompanyFinancialSummary = {
        ticker: company.ticker,
        companyName: (data.name as string) || company.name,
        cik: company.cik,
        recentFilings: filings,
        latestAnnualFiling: latestAnnual,
        latestQuarterlyFiling: latestQuarterly,
        fiscalYearEnd: (data.fiscalYearEnd as string) || null,
        stateOfIncorporation: (data.stateOfIncorporation as string) || null,
        sic: (data.sic as string) || null,
        sicDescription: (data.sicDescription as string) || null,
        edgarUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.cik}&type=10-K&dateb=&owner=include&count=40`,
        fetchedAt: new Date().toISOString(),
      };

      // Cache for 30 minutes (financials don't change often)
      apiCache.set(cacheKey, result, CacheTTL.VERY_SLOW);

      logger.info('SEC EDGAR: Fetched financials', {
        ticker: company.ticker,
        filings: filings.length,
        latestAnnual: latestAnnual?.filingDate || 'none',
      });

      return result;
    },
    null
  );
}

/**
 * Batch fetch financials for all known public space companies.
 * Includes rate limiting (1.5s delay between calls) to respect SEC fair access.
 */
export async function fetchAllSpaceCompanyFinancials(): Promise<{
  fetched: number;
  stored: number;
  errors: string[];
}> {
  const errors: string[] = [];
  const results: CompanyFinancialSummary[] = [];

  for (const company of SPACE_COMPANY_TICKERS) {
    try {
      const result = await fetchCompanyFinancials(company.ticker);
      if (result) {
        results.push(result);
      }
    } catch (error) {
      const msg = `SEC EDGAR: Failed to fetch ${company.ticker}: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(msg);
      errors.push(msg);
    }

    // Rate limit: SEC requires max 10 req/sec, use 1.5s to be safe
    await delay(1500);
  }

  // Store via bulkUpsertContent
  let stored = 0;
  if (results.length > 0) {
    stored = await bulkUpsertContent(
      'company-enrichment',
      results.map((r) => ({
        contentKey: `sec-financials:${r.ticker}`,
        section: 'sec-filings',
        data: r,
      })),
      {
        sourceType: 'api',
        sourceUrl: 'https://efts.sec.gov/LATEST/',
      }
    );
  }

  logger.info('SEC EDGAR: Batch fetch completed', {
    fetched: results.length,
    stored,
    errors: errors.length,
  });

  return { fetched: results.length, stored, errors };
}
