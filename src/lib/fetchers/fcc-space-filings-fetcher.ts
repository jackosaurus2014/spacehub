import { logger } from '@/lib/logger';
import { createCircuitBreaker } from '@/lib/circuit-breaker';

const circuitBreaker = createCircuitBreaker('fcc-space-filings', {
  failureThreshold: 3,
  resetTimeout: 300000,
});

interface FCCFiling {
  title: string;
  filingId: string;
  proceedings: string;
  datePosted: string;
  url: string;
  filer: string;
  filingType: string;
  bureau: string;
}

/**
 * Fetch FCC ECFS filings related to satellite/NGSO/spectrum.
 * Uses the public FCC ECFS search API.
 */
export async function fetchFCCSpaceFilings(): Promise<FCCFiling[]> {
  return circuitBreaker.execute(async () => {
    // Search for satellite and NGSO filings in key proceedings
    const searchTerms = [
      'satellite',
      'NGSO',
      'non-geostationary',
      'orbital debris',
      'spectrum sharing',
    ];

    const allFilings: FCCFiling[] = [];

    for (const term of searchTerms.slice(0, 2)) { // Limit to reduce API calls
      try {
        const params = new URLSearchParams({
          q: term,
          sort: 'date_disseminated,DESC',
          limit: '10',
        });

        const response = await fetch(
          `https://publicapi.fcc.gov/ecfs/filings?${params.toString()}`,
          {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(15000),
          }
        );

        if (!response.ok) {
          logger.warn(`FCC API returned ${response.status} for term "${term}"`);
          continue;
        }

        const data = await response.json();
        const filings = data.filings || [];

        for (const filing of filings) {
          allFilings.push({
            title: filing.short_comment || filing.text_data?.substring(0, 200) || `FCC Filing: ${term}`,
            filingId: filing.id_submission || filing.confirmation_number || '',
            proceedings: filing.proceedings?.[0]?.name || '',
            datePosted: filing.date_disseminated || filing.date_submission || '',
            url: `https://www.fcc.gov/ecfs/search/filings?q=${encodeURIComponent(term)}`,
            filer: filing.filers?.[0]?.name || 'Unknown',
            filingType: filing.type_of_filing || 'filing',
            bureau: filing.bureau?.name || 'International Bureau',
          });
        }
      } catch (err) {
        logger.warn(`FCC fetch error for term "${term}"`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Deduplicate by filingId
    const seen = new Set<string>();
    const unique = allFilings.filter(f => {
      if (!f.filingId || seen.has(f.filingId)) return false;
      seen.add(f.filingId);
      return true;
    });

    logger.info('Fetched FCC space filings', { count: unique.length });
    return unique;
  }, []);
}

/**
 * Fetch and store FCC filings data in DynamicContent.
 */
export async function fetchAndStoreFCCFilings(): Promise<number> {
  try {
    const filings = await fetchFCCSpaceFilings();
    if (filings.length === 0) return 0;

    const { upsertContent } = await import('@/lib/dynamic-content');

    await upsertContent(
      'regulatory:fcc-filings',
      'regulatory',
      'fcc-filings',
      {
        filings,
        fetchedAt: new Date().toISOString(),
        count: filings.length,
      },
      { sourceType: 'api', sourceUrl: 'https://publicapi.fcc.gov/ecfs/filings' }
    );

    logger.info('Stored FCC space filings', { count: filings.length });
    return filings.length;
  } catch (error) {
    logger.error('Failed to fetch FCC filings', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}
