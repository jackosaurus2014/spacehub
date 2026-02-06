import { NextRequest, NextResponse } from 'next/server';
import { fetchFederalRegisterUpdates, type FederalRegisterDocument } from '@/lib/regulatory-hub-data';

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

    console.log(`[Federal Register Fetch] Starting fetch with params:`, {
      agencies,
      searchTerm: combinedSearchTerm,
      perPage: validPerPage,
      startDate,
      endDate,
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
      console.error(`[Federal Register Fetch] API error:`, result.error);
      return NextResponse.json(
        {
          success: false,
          documentsCount: 0,
          newDocumentsCount: 0,
          documents: [],
          fetchedAt: new Date().toISOString(),
          error: result.error,
        },
        { status: 500 }
      );
    }

    const documents = result.documents || [];

    // Log fetched documents for now
    // In production, this would store to database
    console.log(`[Federal Register Fetch] Fetched ${documents.length} documents:`);
    for (const doc of documents) {
      console.log(`  - [${doc.documentNumber}] ${doc.title} (${doc.type})`);
      console.log(`    Agencies: ${doc.agencies.join(', ')}`);
      console.log(`    Published: ${doc.publicationDate}`);
      if (doc.effectiveOn) {
        console.log(`    Effective: ${doc.effectiveOn}`);
      }
    }

    // TODO: Store new regulations in database
    // For now, we return all fetched documents
    // In production, compare with existing records to determine newDocumentsCount
    const newDocumentsCount = documents.length;

    return NextResponse.json({
      success: true,
      documentsCount: documents.length,
      newDocumentsCount,
      documents,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Federal Register Fetch] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        documentsCount: 0,
        newDocumentsCount: 0,
        documents: [],
        fetchedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
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
