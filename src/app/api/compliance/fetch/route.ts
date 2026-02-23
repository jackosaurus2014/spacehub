import { NextRequest, NextResponse } from 'next/server';
import { fetchFederalRegisterUpdates, type FederalRegisterDocument } from '@/lib/regulatory-hub-data';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db';

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

    // Upsert fetched documents into the ProposedRegulation table
    let newDocumentsCount = 0;

    for (const doc of documents) {
      const slug = doc.documentNumber
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const agency = doc.agencies[0] || 'Unknown';
      const docketNumber = doc.docketIds[0] || null;

      // Map Federal Register document type to ProposedRegulation type
      const typeMap: Record<string, string> = {
        'Rule': 'final_rule',
        'Proposed Rule': 'proposed_rule',
        'Notice': 'notice',
        'Presidential Document': 'executive_order',
      };
      const regulationType = typeMap[doc.type] || 'notice';

      // Determine category from agency slugs and title keywords
      const titleLower = (doc.title || '').toLowerCase();
      const abstractLower = (doc.abstract || '').toLowerCase();
      const combinedText = `${titleLower} ${abstractLower}`;
      const agencySlugsLower = doc.agencySlugs.map(s => s.toLowerCase());

      let category = 'commercial_space';
      if (agencySlugsLower.includes('bureau-of-industry-and-security') ||
          combinedText.includes('export') || combinedText.includes('itar') || combinedText.includes('ear')) {
        category = 'export_control';
      } else if (combinedText.includes('license') || combinedText.includes('licensing') || combinedText.includes('permit')) {
        category = 'licensing';
      } else if (combinedText.includes('safety') || combinedText.includes('hazard') || combinedText.includes('mishap')) {
        category = 'safety';
      } else if (agencySlugsLower.includes('federal-communications-commission') ||
                 combinedText.includes('spectrum') || combinedText.includes('frequency') || combinedText.includes('mhz')) {
        category = 'spectrum';
      } else if (combinedText.includes('environment') || combinedText.includes('nepa') || combinedText.includes('pollution')) {
        category = 'environmental';
      }

      // Derive impact areas from title/abstract keywords
      const impactAreas: string[] = [];
      if (combinedText.includes('launch') || combinedText.includes('reentry')) impactAreas.push('launch');
      if (combinedText.includes('satellite') || combinedText.includes('spacecraft')) impactAreas.push('satellite');
      if (combinedText.includes('component') || combinedText.includes('hardware')) impactAreas.push('components');
      if (combinedText.includes('software') || combinedText.includes('cyber')) impactAreas.push('software');
      if (combinedText.includes('technology') || combinedText.includes('technical')) impactAreas.push('technology');
      if (impactAreas.length === 0) impactAreas.push('technology'); // default

      // Determine status: 'open' if effective date is in the future, 'closed' otherwise
      const now = new Date();
      let status = 'open';
      if (doc.effectiveOn) {
        const effectiveDate = new Date(doc.effectiveOn);
        status = effectiveDate > now ? 'open' : 'closed';
      } else if (regulationType === 'final_rule') {
        status = 'closed';
      }

      // Derive comment URL from docket ID
      const commentUrl = docketNumber
        ? `https://www.regulations.gov/docket/${docketNumber}`
        : null;

      const data = {
        title: doc.title,
        summary: doc.abstract || 'No abstract available',
        agency,
        docketNumber,
        federalRegisterCitation: doc.citation,
        type: regulationType,
        category,
        impactAreas: JSON.stringify(impactAreas),
        publishedDate: new Date(doc.publicationDate),
        effectiveDate: doc.effectiveOn ? new Date(doc.effectiveOn) : null,
        status,
        sourceUrl: doc.htmlUrl,
        commentUrl,
      };

      try {
        const result = await prisma.proposedRegulation.upsert({
          where: { slug },
          create: { slug, ...data },
          update: data,
        });

        // If createdAt equals updatedAt (within 1 second), it was newly created
        const timeDiff = Math.abs(result.createdAt.getTime() - result.updatedAt.getTime());
        if (timeDiff < 1000) {
          newDocumentsCount++;
        }
      } catch (upsertError) {
        logger.error(`[Federal Register Fetch] Failed to upsert document ${doc.documentNumber}`, {
          error: upsertError instanceof Error ? upsertError.message : String(upsertError),
        });
      }
    }

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
