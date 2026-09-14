import { logger } from '@/lib/logger';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { ecfsApiKey } from './ecfs-api-key';

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
 *
 * ECFS requires an api_key as of 2026 (ecfs-api-key.ts); without one every
 * request answered 403 and this fetcher swallowed it. Two further bugs went
 * with it and are fixed here: the response array is `filing`, not
 * `filings`, and four of the fields this mapper read no longer exist on a
 * filing row. Live shape re-derived 2026-09-14.
 */
export async function fetchFCCSpaceFilings(): Promise<FCCFiling[]> {
  return circuitBreaker.execute(async () => {
    const apiKey = ecfsApiKey();
    if (!apiKey) {
      logger.info('[FCC] No FCC_API_KEY / CONGRESS_GOV_API_KEY — space-filings feed skipped (one free key from https://api.congress.gov/sign-up/ serves both)');
      return [];
    }
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
          api_key: apiKey,
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
        const filings = data.filing || data.filings || [];

        for (const filing of filings) {
          const proc = filing.proceedings?.[0];
          const filingType = filing.submissiontype?.description || filing.submissiontype?.short || 'filing';
          const proceedingName = proc?.description_display || proc?.description || '';
          const filingId = filing.id_submission || filing.confirmation_number || '';
          allFilings.push({
            // No comment text rides a filing row; the proceeding is the
            // substance, and the docket number is `name`, not `id`. The type
            // is carried by its own field, so it is not repeated in the title.
            title: proceedingName || filing.documents?.[0]?.filename?.trim() || `FCC Filing: ${term}`,
            filingId,
            proceedings: proc?.name || '',
            datePosted: filing.date_disseminated || filing.date_submission || '',
            url: filing.documents?.[0]?.src
              || (filingId ? `https://www.fcc.gov/ecfs/filing/${filingId}`
                : `https://www.fcc.gov/ecfs/search/filings?q=${encodeURIComponent(term)}`),
            filer: filing.filers?.[0]?.name || 'Unknown',
            filingType,
            bureau: proc?.bureau_name || 'Space Bureau',
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
