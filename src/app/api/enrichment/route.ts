/**
 * Data Enrichment Trigger Endpoint
 *
 * POST /api/enrichment?source=sec|patents|github|fcc|all
 *
 * Protected by CRON_SECRET. Triggers the corresponding data enrichment
 * fetchAll* function and returns a summary of results.
 */

import { logger } from '@/lib/logger';
import { requireCronSecret, internalError, validationError, createSuccessResponse } from '@/lib/errors';
import {
  fetchAllSpaceCompanyFinancials,
  fetchAllSpaceCompanyPatents,
  fetchAllSpaceGitHubActivity,
  fetchAllSpaceLicenses,
} from '@/lib/data-enrichment';
import { logRefresh } from '@/lib/dynamic-content';

export const dynamic = 'force-dynamic';

type EnrichmentSource = 'sec' | 'patents' | 'github' | 'fcc' | 'all';

const VALID_SOURCES: EnrichmentSource[] = ['sec', 'patents', 'github', 'fcc', 'all'];

interface SourceResult {
  source: string;
  fetched: number;
  stored: number;
  errors: string[];
  durationMs: number;
}

async function runSource(
  source: string,
  fetchFn: () => Promise<{ fetched: number; stored: number; errors: string[] }>
): Promise<SourceResult> {
  const start = Date.now();
  try {
    const result = await fetchFn();
    const durationMs = Date.now() - start;

    // Log the refresh operation
    await logRefresh('company-enrichment', `enrichment-${source}`, 'success', {
      itemsChecked: result.fetched + result.errors.length,
      itemsUpdated: result.stored,
      apiCallsMade: result.fetched,
      duration: durationMs,
      errorMessage: result.errors.length > 0 ? result.errors.join('; ') : undefined,
    });

    return {
      source,
      fetched: result.fetched,
      stored: result.stored,
      errors: result.errors,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);

    await logRefresh('company-enrichment', `enrichment-${source}`, 'error', {
      duration: durationMs,
      errorMessage: errorMsg,
    });

    return {
      source,
      fetched: 0,
      stored: 0,
      errors: [errorMsg],
      durationMs,
    };
  }
}

export async function POST(request: Request) {
  try {
    // Verify CRON_SECRET
    const authError = requireCronSecret(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const source = (searchParams.get('source') || 'all') as string;

    if (!VALID_SOURCES.includes(source as EnrichmentSource)) {
      return validationError(
        `Invalid source: "${source}". Must be one of: ${VALID_SOURCES.join(', ')}`,
        { source: [`Must be one of: ${VALID_SOURCES.join(', ')}`] }
      );
    }

    const overallStart = Date.now();
    const results: SourceResult[] = [];

    if (source === 'sec' || source === 'all') {
      results.push(await runSource('sec', fetchAllSpaceCompanyFinancials));
    }

    if (source === 'patents' || source === 'all') {
      results.push(await runSource('patents', fetchAllSpaceCompanyPatents));
    }

    if (source === 'github' || source === 'all') {
      results.push(await runSource('github', fetchAllSpaceGitHubActivity));
    }

    if (source === 'fcc' || source === 'all') {
      results.push(await runSource('fcc', fetchAllSpaceLicenses));
    }

    const totalDuration = Date.now() - overallStart;
    const totalFetched = results.reduce((sum, r) => sum + r.fetched, 0);
    const totalStored = results.reduce((sum, r) => sum + r.stored, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    logger.info('Enrichment batch completed', {
      source,
      totalFetched,
      totalStored,
      totalErrors,
      durationMs: totalDuration,
    });

    return createSuccessResponse({
      source,
      results,
      summary: {
        totalFetched,
        totalStored,
        totalErrors,
        durationMs: totalDuration,
      },
    });
  } catch (error) {
    logger.error('Enrichment endpoint failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to run enrichment');
  }
}
