/**
 * Enforcement Watch fetcher — "who got fined, for what, how much".
 *
 * Coverage decision (Regulatory Wave A source investigation, 8/17):
 * every reliably machine-readable enforcement stream flows through the
 * Federal Register API, so this fetcher is FR-term-search based:
 *
 *  - BIS  — denial-of-export-privileges orders, temporary denial orders,
 *           and settlement orders ("Order Relating to …") publish in the FR
 *           (356 / 69 historical hits respectively). bis.gov exposes no RSS;
 *           press-release-only items (some settlements announce on bis.gov
 *           e-FOIA first) arrive when their FR notice publishes.
 *  - DDTC — statutory debarments and rescissions publish in the FR (72
 *           hits). The consent-agreement library on pmddtc.state.gov is a
 *           ServiceNow SPA with no stable feed — NOT scraped; FR fallback.
 *  - FCC  — fcc.gov (including EDOCS and the Daily Digest RSS) returns 403
 *           to datacenter IPs, and the public API requires an api.data.gov
 *           key — keyless-only this wave, so FCC coverage is FR-fallback
 *           (space-relevant forfeitures/NALs that publish in the FR).
 *  - FAA  — no newsroom RSS; launch-operator enforcement is press-release
 *           only and rare. FR fallback via the civil-penalty term search.
 *
 * Same guarantees as congress-fetcher: circuit breaker, keyless, fail-soft,
 * wired into the /api/refresh?type=regulatory-feeds branch. DedupKeys are
 * identical to the main FR fetcher's (`federal-register:<doc#>`), and both
 * paths categorize through the same categorizeRegulatoryAction, so a
 * document seen by both fetchers converges on one row with one category.
 */

import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { logger } from '@/lib/logger';
import { isEnforcementAction } from '@/lib/regulatory-categorizer';
import { upsertRadarEntries } from '@/lib/regulatory-radar';
import {
  federalRegisterEntryToRadarInput,
  isRelevantFederalRegisterDoc,
  mapFederalRegisterDoc,
  EXPORT_CONTROL_AGENCY_SLUGS,
  type FederalRegisterApiDocument,
} from '@/lib/fetchers/federal-register-fetcher';

const circuitBreaker = createCircuitBreaker('federal-register-enforcement', {
  failureThreshold: 3,
  resetTimeout: 300000, // 5 min
});

const FR_API = 'https://www.federalregister.gov/api/v1/documents.json';

// Term searches verified against the live FR API (counts as of 2026-08-17).
// Agency slugs verified against /api/v1/agencies — an invalid slug 400s the
// whole query (see the BIS-slug lesson in federal-register-fetcher.ts).
export const ENFORCEMENT_QUERIES: Array<{ term: string; agencies: string[] }> = [
  { term: '"denial of export privileges"', agencies: ['industry-and-security-bureau'] },
  { term: '"order relating to"', agencies: ['industry-and-security-bureau'] },
  { term: '"settlement agreement"', agencies: ['industry-and-security-bureau', 'state-department'] },
  { term: '"statutory debarment"', agencies: ['state-department'] },
  {
    term: '"civil penalty"',
    agencies: [
      'industry-and-security-bureau',
      'state-department',
      'federal-aviation-administration',
      'federal-communications-commission',
    ],
  },
];

const FR_FIELDS = [
  'document_number', 'title', 'type', 'abstract', 'publication_date',
  'effective_on', 'agencies', 'html_url', 'pdf_url', 'citation',
  'docket_ids', 'regulation_id_numbers', 'significant', 'action',
  'comment_url', 'comments_close_on',
];

function buildQueryUrl(term: string, agencies: string[], sinceIso: string, perPage: number): string {
  const params: string[] = [
    `conditions%5Bterm%5D=${encodeURIComponent(term)}`,
    `conditions%5Bpublication_date%5D%5Bgte%5D=${encodeURIComponent(sinceIso)}`,
    `per_page=${perPage}`,
    'order=newest',
  ];
  for (const slug of agencies) params.push(`conditions%5Bagencies%5D%5B%5D=${encodeURIComponent(slug)}`);
  for (const f of FR_FIELDS) params.push(`fields%5B%5D=${encodeURIComponent(f)}`);
  return `${FR_API}?${params.join('&')}`;
}

/**
 * Keep only documents that ARE enforcement actions (title/action detector —
 * the term search also matches body-only mentions, e.g. a tariff-procedures
 * rule whose body quotes "order relating to") and that are radar-relevant
 * (export-control-agency enforcement is per se relevant; FCC/FAA enforcement
 * needs a space hook). Pure, exported for tests.
 */
export function filterEnforcementDocs(docs: FederalRegisterApiDocument[]): FederalRegisterApiDocument[] {
  return docs.filter((doc) => {
    if (!isEnforcementAction({ title: doc.title, actionText: doc.action })) return false;
    const slugs = doc.agencies?.map((a) => a.slug) || [];
    const fromExportControlAgency = slugs.some((s) => EXPORT_CONTROL_AGENCY_SLUGS.includes(s));
    return fromExportControlAgency || isRelevantFederalRegisterDoc(doc);
  });
}

interface FetchPageResult {
  docs: FederalRegisterApiDocument[];
  nextPageUrl: string | null;
}

async function fetchPage(url: string): Promise<FetchPageResult> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`Federal Register enforcement query error: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return { docs: data.results || [], nextPageUrl: data.next_page_url || null };
}

export interface EnforcementFetchResult {
  scanned: number;
  enforcement: number;
  stored: number;
  errors: number;
}

/**
 * Fetch enforcement documents published since `sinceDays` ago and store them
 * as category-'enforcement' RegulatoryAction rows. `maxPagesPerQuery` > 1 is
 * used only by the run-once historical backfill (scripts/backfill-enforcement.ts).
 */
export async function fetchAndStoreEnforcementActions(
  options: { sinceDays?: number; maxPagesPerQuery?: number } = {}
): Promise<EnforcementFetchResult> {
  const { sinceDays = 14, maxPagesPerQuery = 1 } = options;
  const sinceIso = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  try {
    const byDocNumber = new Map<string, FederalRegisterApiDocument>();
    let scanned = 0;

    await circuitBreaker.execute(async () => {
      for (const query of ENFORCEMENT_QUERIES) {
        let url: string | null = buildQueryUrl(query.term, query.agencies, sinceIso, maxPagesPerQuery > 1 ? 100 : 50);
        let pages = 0;
        while (url && pages < maxPagesPerQuery) {
          const page: FetchPageResult = await fetchPage(url);
          scanned += page.docs.length;
          for (const doc of page.docs) {
            if (doc.document_number && !byDocNumber.has(doc.document_number)) {
              byDocNumber.set(doc.document_number, doc);
            }
          }
          url = page.nextPageUrl;
          pages++;
        }
      }
      return null;
    }, null);

    const enforcementDocs = filterEnforcementDocs(Array.from(byDocNumber.values()));
    const entries = enforcementDocs.map((doc) => federalRegisterEntryToRadarInput(mapFederalRegisterDoc(doc)));
    const stored = await upsertRadarEntries(entries);

    logger.info('[EnforcementWatch] Fetched enforcement actions', {
      scanned,
      deduped: byDocNumber.size,
      enforcement: enforcementDocs.length,
      stored,
      sinceIso,
    });

    return { scanned, enforcement: enforcementDocs.length, stored, errors: 0 };
  } catch (error) {
    logger.error('[EnforcementWatch] Failed to fetch enforcement actions', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { scanned: 0, enforcement: 0, stored: 0, errors: 1 };
  }
}
