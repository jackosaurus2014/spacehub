import { NextRequest, NextResponse } from 'next/server';
import { fetchFederalRegisterUpdates, type FederalRegisterDocument } from '@/lib/regulatory-hub-data';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Agency slugs for Federal Register API
const SPACE_AGENCIES = [
  'federal-aviation-administration',
  'federal-communications-commission',
  'national-oceanic-and-atmospheric-administration',
  'national-aeronautics-and-space-administration',
];

// Space-related search terms
const SEARCH_TERMS = ['space', 'satellite', 'launch', 'orbit', 'spectrum'];

const CACHE_KEY = 'compliance:fetch-result';

interface FetchRequestBody {
  agencies?: string[];
  searchTerms?: string[];
  perPage?: number;
  startDate?: string;
  endDate?: string;
}

interface FetchResponse {
  success: boolean;
  documentsCount: number;
  newDocumentsCount: number;
  documents: FederalRegisterDocument[];
  fetchedAt: string;
  source?: string;
  cached?: boolean;
  cachedAt?: string;
  warning?: string;
  error?: string;
}

/**
 * POST /api/compliance/fetch
 *
 * Fetches space-related regulations from the Federal Register API.
 * Filters by specified agencies and search terms, then stores/logs new regulations.
 *
 * Request body (all optional):
 * - agencies: Array of agency slugs to filter by (defaults to FAA, FCC, NOAA, NASA)
 * - searchTerms: Array of search terms (defaults to space, satellite, launch, orbit, spectrum)
 * - perPage: Number of results per page (default 25, max 100)
 * - startDate: Start date for filtering (YYYY-MM-DD format)
 * - endDate: End date for filtering (YYYY-MM-DD format)
 */
export async function POST(request: NextRequest): Promise<NextResponse<FetchResponse>> {
  try {
    // Parse request body
    let body: FetchRequestBody = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine, use defaults
    }

    const {
      agencies = SPACE_AGENCIES,
      searchTerms = SEARCH_TERMS,
      perPage = 25,
      startDate,
      endDate,
    } = body;

    // Validate perPage
    const validPerPage = Math.min(Math.max(1, perPage), 100);

    // Build combined search term for the API
    const combinedSearchTerm = searchTerms.join(' OR ');

    logger.info(`[Federal Register Fetch] Starting fetch`, {
      agencies: agencies.join(', '),
      searchTerm: combinedSearchTerm,
      perPage: String(validPerPage),
    });

    // Fetch from Federal Register API
    const result = await fetchFederalRegisterUpdates({
      agencies,
      searchTerm: combinedSearchTerm,
      perPage: validPerPage,
      startDate,
      endDate,
    });

    if (!result.success) {
      logger.error(`[Federal Register Fetch] API error`, { error: result.error || 'Unknown' });

      // Try cached data on API failure
      const cached = apiCache.getStale<FetchResponse>(CACHE_KEY);
      if (cached) {
        logger.info(`[Compliance] Serving cached data on API failure (stale: ${cached.isStale})`);
        return NextResponse.json({
          ...cached.value,
          source: 'cache',
          cached: true,
          cachedAt: new Date(cached.storedAt).toISOString(),
          warning: 'Federal Register API returned an error. Showing previously fetched data.',
        });
      }

      return NextResponse.json({
        success: false,
        documentsCount: 0,
        newDocumentsCount: 0,
        documents: [],
        fetchedAt: new Date().toISOString(),
        source: 'fallback',
        error: result.error,
      });
    }

    const documents = result.documents || [];

    logger.info(`[Federal Register Fetch] Fetched ${documents.length} documents`);

    // TODO: Store new regulations in database
    // For now, we return all fetched documents
    // In production, compare with existing records to determine newDocumentsCount
    const newDocumentsCount = documents.length;

    const responseData: FetchResponse = {
      success: true,
      documentsCount: documents.length,
      newDocumentsCount,
      documents,
      fetchedAt: new Date().toISOString(),
      source: 'live',
    };

    // Cache the successful result
    apiCache.set(CACHE_KEY, responseData, CacheTTL.VERY_SLOW);

    return NextResponse.json(responseData);
  } catch (error) {
    logger.error('[Federal Register Fetch] Unexpected error', { error: error instanceof Error ? error.message : String(error) });

    // Try to return cached result
    const cached = apiCache.getStale<FetchResponse>(CACHE_KEY);

    if (cached) {
      logger.info(`[Compliance] Serving cached fetch result (stale: ${cached.isStale})`);
      return NextResponse.json({
        ...cached.value,
        source: 'cache',
        cached: true,
        cachedAt: new Date(cached.storedAt).toISOString(),
        warning: 'Federal Register API is temporarily unavailable. Showing previously fetched data.',
      });
    }

    // No cache -- return graceful fallback instead of 500
    return NextResponse.json({
      success: false,
      documentsCount: 0,
      newDocumentsCount: 0,
      documents: [],
      fetchedAt: new Date().toISOString(),
      source: 'fallback',
      error: 'Federal Register API is temporarily unavailable.',
    });
  }
}

/**
 * GET /api/compliance/fetch
 *
 * Returns information about the fetch endpoint and default parameters.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: '/api/compliance/fetch',
    method: 'POST',
    description: 'Fetches space-related regulations from the Federal Register API',
    defaultParameters: {
      agencies: SPACE_AGENCIES,
      searchTerms: SEARCH_TERMS,
      perPage: 25,
    },
    federalRegisterApiDocs: 'https://www.federalregister.gov/developers/documentation/api/v1',
  });
}
