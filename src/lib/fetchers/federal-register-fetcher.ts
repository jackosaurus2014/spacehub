/**
 * Federal Register fetcher for space-related regulatory documents
 *
 * Uses the free Federal Register API to fetch rules, proposed rules, and notices
 * from agencies relevant to the space industry.
 *
 * API documentation: https://www.federalregister.gov/developers/documentation/api/v1
 */

import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { bulkUpsertContent } from '@/lib/dynamic-content';
import { logger } from '@/lib/logger';

const circuitBreaker = createCircuitBreaker('federal-register-space', {
  failureThreshold: 3,
  resetTimeout: 300000, // 5 min
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FederalRegisterApiDocument {
  document_number: string;
  title: string;
  type: string;
  abstract: string | null;
  publication_date: string;
  effective_on: string | null;
  agencies: Array<{
    raw_name: string;
    name: string;
    id: number;
    slug: string;
  }>;
  html_url: string;
  pdf_url: string;
  citation: string | null;
  docket_ids: string[];
  regulation_id_numbers: string[];
  significant: boolean;
  action: string | null;
}

export interface FederalRegisterEntry {
  documentNumber: string;
  title: string;
  type: string;
  abstract: string | null;
  publicationDate: string;
  effectiveDate: string | null;
  agencies: string[];
  agencySlugs: string[];
  htmlUrl: string;
  pdfUrl: string;
  citation: string | null;
  docketIds: string[];
  action: string | null;
  significant: boolean;
}

// ---------------------------------------------------------------------------
// Agency slugs covering space-related regulatory bodies
// ---------------------------------------------------------------------------

const SPACE_AGENCY_SLUGS = [
  'federal-aviation-administration',
  'federal-communications-commission',
  'national-aeronautics-and-space-administration',
  'national-oceanic-and-atmospheric-administration',
  'defense-department',
  'bureau-of-industry-and-security',
  'state-department', // DDTC falls under State
  'air-force-department', // Space Force resides under Air Force/DoD
];

// ---------------------------------------------------------------------------
// Space-relevant keyword filter (applied to title + abstract)
// ---------------------------------------------------------------------------

const SPACE_KEYWORDS = [
  'satellite',
  'space',
  'orbit',
  'launch',
  'spectrum',
  'itar',
  'munitions',
  'export control',
  'rocket',
  'reentry',
  'spacecraft',
  'debris',
  'constellation',
  'geostationary',
  'non-geostationary',
  'ngso',
  'remote sensing',
  'earth observation',
  'spaceport',
  'space vehicle',
  'deorbit',
  'cislunar',
  'lunar',
  'mars',
  'asteroid',
];

function isSpaceRelevant(title: string, abstract: string | null): boolean {
  const text = `${title} ${abstract || ''}`.toLowerCase();
  return SPACE_KEYWORDS.some((kw) => text.includes(kw));
}

// ---------------------------------------------------------------------------
// Fetch from Federal Register API
// ---------------------------------------------------------------------------

/**
 * Fetch space-related documents from the Federal Register API.
 * Results are filtered to only include documents mentioning space-related keywords.
 */
export async function fetchFederalRegisterEntries(): Promise<FederalRegisterEntry[]> {
  return circuitBreaker.execute(async () => {
    // Build agency filter params (array notation)
    const agencyParams = SPACE_AGENCY_SLUGS.map(
      (slug) => `conditions[agencies][]=${encodeURIComponent(slug)}`
    ).join('&');

    // Document types: rules, proposed rules, and notices
    const typeParams = [
      'conditions[type][]=RULE',
      'conditions[type][]=PRORULE',
      'conditions[type][]=NOTICE',
    ].join('&');

    const baseParams = new URLSearchParams({
      per_page: '50',
      order: 'newest',
    });

    const url = `https://www.federalregister.gov/api/v1/documents.json?${baseParams.toString()}&${agencyParams}&${typeParams}`;

    logger.info('[FederalRegister] Fetching documents', { url: url.substring(0, 120) + '...' });

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      throw new Error(`Federal Register API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawDocuments: FederalRegisterApiDocument[] = data.results || [];

    // Filter for space relevance
    const spaceDocuments = rawDocuments.filter((doc) =>
      isSpaceRelevant(doc.title, doc.abstract)
    );

    const entries: FederalRegisterEntry[] = spaceDocuments.map((doc) => ({
      documentNumber: doc.document_number,
      title: doc.title,
      type: doc.type,
      abstract: doc.abstract,
      publicationDate: doc.publication_date,
      effectiveDate: doc.effective_on,
      agencies: doc.agencies?.map((a) => a.name) || [],
      agencySlugs: doc.agencies?.map((a) => a.slug) || [],
      htmlUrl: doc.html_url,
      pdfUrl: doc.pdf_url,
      citation: doc.citation,
      docketIds: doc.docket_ids || [],
      action: doc.action,
      significant: doc.significant,
    }));

    logger.info('[FederalRegister] Fetched documents', {
      rawCount: rawDocuments.length,
      spaceRelevant: entries.length,
    });

    return entries;
  }, []);
}

// ---------------------------------------------------------------------------
// Store in DynamicContent
// ---------------------------------------------------------------------------

/**
 * Fetch Federal Register entries and store each as a separate DynamicContent record
 * under module='compliance', section='federal-register-entries'.
 */
export async function fetchAndStoreFederalRegister(): Promise<{
  stored: number;
  errors: number;
}> {
  let stored = 0;
  let errors = 0;

  try {
    const entries = await fetchFederalRegisterEntries();

    if (entries.length === 0) {
      logger.info('[FederalRegister] No space-relevant entries found');
      return { stored: 0, errors: 0 };
    }

    const items = entries.map((entry) => ({
      contentKey: `compliance:federal-register:${entry.documentNumber}`,
      section: 'federal-register-entries',
      data: {
        ...entry,
        fetchedAt: new Date().toISOString(),
      },
    }));

    stored = await bulkUpsertContent('compliance', items, {
      sourceType: 'api' as const,
      sourceUrl: 'https://www.federalregister.gov/api/v1/documents',
    });

    logger.info('[FederalRegister] Stored entries in DynamicContent', { stored });
  } catch (error) {
    errors++;
    logger.error('[FederalRegister] Failed to fetch and store entries', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return { stored, errors };
}
