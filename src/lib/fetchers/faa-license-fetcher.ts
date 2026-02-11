import { logger } from '@/lib/logger';
import { createCircuitBreaker } from '@/lib/circuit-breaker';

const circuitBreaker = createCircuitBreaker('faa-federal-register', {
  failureThreshold: 3,
  resetTimeout: 300000, // 5 min
});

interface FederalRegisterDocument {
  title: string;
  type: string;
  abstract: string;
  document_number: string;
  html_url: string;
  pdf_url: string;
  publication_date: string;
  agencies: Array<{ name: string; slug: string }>;
  action?: string;
  dates?: string;
  docket_ids?: string[];
  regulation_id_numbers?: string[];
}

interface FAALicense {
  title: string;
  type: string;
  summary: string;
  documentNumber: string;
  url: string;
  pdfUrl: string;
  publishedDate: string;
  agency: string;
  action: string;
  docketId: string | null;
}

/**
 * Fetch FAA commercial space regulatory documents from the Federal Register API.
 * See: https://www.federalregister.gov/developers/documentation/api/v1
 */
export async function fetchFAALicenses(): Promise<FAALicense[]> {
  return circuitBreaker.execute(async () => {
    // Search for FAA/AST (Office of Commercial Space Transportation) documents
    const params = new URLSearchParams({
      'conditions[agencies][]': 'federal-aviation-administration',
      'conditions[term]': 'commercial space OR launch license OR reentry license OR spaceport',
      'per_page': '25',
      'order': 'newest',
      'fields[]': 'title,type,abstract,document_number,html_url,pdf_url,publication_date,agencies,action,dates,docket_ids',
    });

    const response = await fetch(
      `https://www.federalregister.gov/api/v1/documents.json?${params.toString()}`,
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      throw new Error(`Federal Register API error: ${response.status}`);
    }

    const data = await response.json();
    const documents: FederalRegisterDocument[] = data.results || [];

    logger.info('Fetched FAA documents from Federal Register', { count: documents.length });

    return documents.map((doc): FAALicense => ({
      title: doc.title,
      type: doc.type,
      summary: doc.abstract || '',
      documentNumber: doc.document_number,
      url: doc.html_url,
      pdfUrl: doc.pdf_url,
      publishedDate: doc.publication_date,
      agency: doc.agencies?.[0]?.name || 'FAA',
      action: doc.action || doc.type,
      docketId: doc.docket_ids?.[0] || null,
    }));
  }, []);
}

/**
 * Fetch and store FAA license data in DynamicContent.
 */
export async function fetchAndStoreFAALicenses(): Promise<number> {
  try {
    const licenses = await fetchFAALicenses();
    if (licenses.length === 0) return 0;

    const { upsertContent } = await import('@/lib/dynamic-content');

    await upsertContent(
      'regulatory:faa-licenses',
      'regulatory',
      'faa-licenses',
      {
        licenses,
        fetchedAt: new Date().toISOString(),
        count: licenses.length,
      },
      { sourceType: 'api', sourceUrl: 'https://www.federalregister.gov/api/v1/documents' }
    );

    logger.info('Stored FAA license data', { count: licenses.length });
    return licenses.length;
  } catch (error) {
    logger.error('Failed to fetch FAA licenses', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}
