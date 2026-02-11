import { logger } from '@/lib/logger';
import { createCircuitBreaker } from '@/lib/circuit-breaker';

const circuitBreaker = createCircuitBreaker('sec-edgar', {
  failureThreshold: 3,
  resetTimeout: 300000,
});

// Public space companies with their SEC CIK numbers
const SPACE_COMPANIES: Array<{ name: string; cik: string; ticker: string }> = [
  { name: 'Rocket Lab', cik: '0001819994', ticker: 'RKLB' },
  { name: 'Virgin Galactic', cik: '0001706946', ticker: 'SPCE' },
  { name: 'Intuitive Machines', cik: '0001881438', ticker: 'LUNR' },
  { name: 'Redwire', cik: '0001855631', ticker: 'RDW' },
  { name: 'Planet Labs', cik: '0001836935', ticker: 'PL' },
  { name: 'Spire Global', cik: '0001835022', ticker: 'SPIR' },
  { name: 'BlackSky', cik: '0001817944', ticker: 'BKSY' },
  { name: 'Momentus', cik: '0001781983', ticker: 'MNTS' },
  { name: 'Astra Space', cik: '0001814329', ticker: 'ASTR' },
];

interface SECFiling {
  companyName: string;
  ticker: string;
  formType: string;
  filingDate: string;
  description: string;
  url: string;
  accessionNumber: string;
}

/**
 * Fetch recent SEC EDGAR filings for public space companies.
 * Uses the SEC EFTS (full-text search) API.
 * Required: User-Agent header per SEC guidelines.
 */
export async function fetchSECFilings(): Promise<SECFiling[]> {
  return circuitBreaker.execute(async () => {
    const allFilings: SECFiling[] = [];
    const targetForms = ['10-K', '10-Q', '8-K', '6-K'];

    for (const company of SPACE_COMPANIES) {
      try {
        // Use EDGAR company search endpoint
        const response = await fetch(
          `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(company.name)}%22&dateRange=custom&startdt=${getThreeMonthsAgo()}&enddt=${getToday()}&forms=${targetForms.join(',')}&from=0&size=5`,
          {
            headers: {
              'User-Agent': 'SpaceNexus info@spacenexus.com',
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(10000),
          }
        );

        if (!response.ok) {
          // Fallback: try the submissions endpoint
          const subResponse = await fetch(
            `https://data.sec.gov/submissions/CIK${company.cik}.json`,
            {
              headers: {
                'User-Agent': 'SpaceNexus info@spacenexus.com',
                'Accept': 'application/json',
              },
              signal: AbortSignal.timeout(10000),
            }
          );

          if (subResponse.ok) {
            const subData = await subResponse.json();
            const recent = subData.filings?.recent;
            if (recent) {
              const count = Math.min(5, recent.form?.length || 0);
              for (let i = 0; i < count; i++) {
                const form = recent.form[i];
                if (!targetForms.includes(form)) continue;

                allFilings.push({
                  companyName: company.name,
                  ticker: company.ticker,
                  formType: form,
                  filingDate: recent.filingDate[i],
                  description: recent.primaryDocDescription?.[i] || `${form} Filing`,
                  url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.cik}&type=${form}&dateb=&owner=include&count=10`,
                  accessionNumber: recent.accessionNumber[i],
                });
              }
            }
          }
          continue;
        }

        const data = await response.json();
        const hits = data.hits?.hits || [];

        for (const hit of hits) {
          const source = hit._source;
          allFilings.push({
            companyName: company.name,
            ticker: company.ticker,
            formType: source.form_type || source.file_type || '',
            filingDate: source.file_date || source.period_of_report || '',
            description: source.display_names?.[0] || source.entity_name || `${company.name} Filing`,
            url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.cik}&type=&dateb=&owner=include&count=10`,
            accessionNumber: source.accession_no || '',
          });
        }

        // Respect SEC rate limiting: 10 requests/second
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        logger.warn(`SEC EDGAR fetch error for ${company.name}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info('Fetched SEC filings for space companies', { count: allFilings.length });
    return allFilings;
  }, []);
}

function getThreeMonthsAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().split('T')[0];
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Fetch and store SEC filings in DynamicContent.
 */
export async function fetchAndStoreSECFilings(): Promise<number> {
  try {
    const filings = await fetchSECFilings();
    if (filings.length === 0) return 0;

    const { upsertContent } = await import('@/lib/dynamic-content');

    // Group by company for better organization
    const byCompany: Record<string, SECFiling[]> = {};
    for (const filing of filings) {
      if (!byCompany[filing.ticker]) byCompany[filing.ticker] = [];
      byCompany[filing.ticker].push(filing);
    }

    await upsertContent(
      'market-intel:sec-filings',
      'market-intel',
      'sec-filings',
      {
        filings,
        byCompany,
        companies: SPACE_COMPANIES.map(c => ({ name: c.name, ticker: c.ticker })),
        fetchedAt: new Date().toISOString(),
        count: filings.length,
      },
      { sourceType: 'api', sourceUrl: 'https://efts.sec.gov/LATEST/search-index' }
    );

    logger.info('Stored SEC filings', { count: filings.length });
    return filings.length;
  } catch (error) {
    logger.error('Failed to fetch SEC filings', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}
