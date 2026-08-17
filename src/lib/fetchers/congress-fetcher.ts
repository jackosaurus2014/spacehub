/**
 * Congressional tracker for space & export-control legislation.
 *
 * Uses the official congress.gov API v3 (https://api.congress.gov/v3/,
 * key via env CONGRESS_GOV_API_KEY — free signup at
 * https://api.congress.gov/sign-up/). The v3 API has no server-side keyword
 * search on /bill, so we pull the most-recently-updated bills (plus the
 * /summaries feed for abstract text) and keyword-filter locally for
 * space/export-control relevance.
 *
 * Env-gated: when CONGRESS_GOV_API_KEY is absent this logs once and returns
 * { skipped: true } — the regulatory-feeds pipeline stays healthy without it.
 *
 * Storage: RegulatoryAction rows via upsertRadarEntries, dedup-keyed by
 * bill id + latest action date, so a status CHANGE on a tracked bill
 * creates a new radar entry.
 */

import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { logger } from '@/lib/logger';
import { categorizeRegulatoryAction, isExportControlRelevant } from '@/lib/regulatory-categorizer';
import { upsertRadarEntries, type RadarEntryInput } from '@/lib/regulatory-radar';

const circuitBreaker = createCircuitBreaker('congress-gov', {
  failureThreshold: 3,
  resetTimeout: 300000, // 5 min
});

const API_BASE = 'https://api.congress.gov/v3';

// ---------------------------------------------------------------------------
// Types (congress.gov API v3 response shapes — subset we consume)
// ---------------------------------------------------------------------------

export interface CongressApiBill {
  congress: number;
  number: string;
  type: string; // 'HR' | 'S' | 'HRES' | 'SRES' | 'HJRES' | 'SJRES' | 'HCONRES' | 'SCONRES'
  title: string;
  originChamber?: string;
  latestAction?: {
    actionDate: string; // YYYY-MM-DD
    text: string;
  };
  updateDate?: string;
  url?: string;
}

export interface CongressApiSummary {
  actionDate?: string;
  bill?: {
    congress: number;
    number: string;
    type: string;
    title?: string;
  };
  text?: string; // HTML
  updateDate?: string;
}

// ---------------------------------------------------------------------------
// Relevance filter (pure)
// ---------------------------------------------------------------------------

// Word-boundary patterns keep bill matching precise — "space" must appear as
// a word (not inside "cyberspace"), etc.
const BILL_SPACE_PATTERNS: RegExp[] = [
  /\bspace\b/i,
  /\bsatellite/i,
  /\bnasa\b/i,
  /\borbital?\b/i,
  /\blaunch (vehicle|service|site|provider|industry)/i,
  /\bcommercial launch/i,
  /\bspaceport/i,
  /\bastronaut/i,
  /\bspace force\b/i,
  /\blunar\b/i,
  /\bmars exploration/i,
  /\bremote sensing/i,
  /\bspectrum\b/i,
];

const BILL_EXCLUDE_PATTERNS: RegExp[] = [/cyberspace/i, /crawl ?space/i, /parking space/i];

/**
 * True when a bill's combined text (title + latest action + summary) matches
 * space terms or export-control terms. Pure, exported for tests.
 */
export function isSpaceOrExportControlBill(text: string): boolean {
  let scrubbed = text;
  for (const ex of BILL_EXCLUDE_PATTERNS) scrubbed = scrubbed.replace(new RegExp(ex.source, 'gi'), ' ');
  if (BILL_SPACE_PATTERNS.some((p) => p.test(scrubbed))) return true;
  return isExportControlRelevant(scrubbed);
}

// ---------------------------------------------------------------------------
// URL + mapping helpers (pure)
// ---------------------------------------------------------------------------

const BILL_TYPE_SLUGS: Record<string, string> = {
  hr: 'house-bill',
  s: 'senate-bill',
  hres: 'house-resolution',
  sres: 'senate-resolution',
  hjres: 'house-joint-resolution',
  sjres: 'senate-joint-resolution',
  hconres: 'house-concurrent-resolution',
  sconres: 'senate-concurrent-resolution',
};

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/** Canonical congress.gov bill URL, e.g. https://www.congress.gov/bill/119th-congress/house-bill/1234 */
export function buildBillUrl(congress: number, type: string, number: string | number): string {
  const slug = BILL_TYPE_SLUGS[type.toLowerCase()] || 'house-bill';
  return `https://www.congress.gov/bill/${ordinal(congress)}-congress/${slug}/${number}`;
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Bill display label, e.g. "H.R. 1234" / "S. 98". */
export function billLabel(type: string, number: string | number): string {
  const labels: Record<string, string> = {
    hr: 'H.R.', s: 'S.', hres: 'H.Res.', sres: 'S.Res.',
    hjres: 'H.J.Res.', sjres: 'S.J.Res.', hconres: 'H.Con.Res.', sconres: 'S.Con.Res.',
  };
  return `${labels[type.toLowerCase()] || type.toUpperCase()} ${number}`;
}

/**
 * Map a congress.gov bill (plus optional plain-text summary) to a
 * RegulatoryAction input. Dedup key includes the latest action date so a
 * status change creates a NEW radar entry. Pure, exported for tests.
 */
export function billToRadarEntry(bill: CongressApiBill, summaryText?: string | null): RadarEntryInput {
  const actionDate = bill.latestAction?.actionDate || bill.updateDate?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const typeLower = bill.type.toLowerCase();
  const summary = summaryText
    ? summaryText.slice(0, 2000)
    : bill.latestAction?.text || null;
  return {
    dedupKey: `congress:${bill.congress}-${typeLower}-${bill.number}:${actionDate}`,
    source: 'congress',
    category: categorizeRegulatoryAction({ title: bill.title, summary }),
    title: `${billLabel(bill.type, bill.number)} — ${bill.title}`,
    summary,
    actionDate: new Date(`${actionDate}T12:00:00Z`),
    url: buildBillUrl(bill.congress, bill.type, bill.number),
    agency: bill.originChamber ? `U.S. ${bill.originChamber}` : 'U.S. Congress',
    documentType: typeLower,
    actionText: bill.latestAction?.text || null,
    significant: false,
    raw: bill,
  };
}

// ---------------------------------------------------------------------------
// Fetch + store
// ---------------------------------------------------------------------------

let missingKeyLogged = false;

export interface CongressFetchResult {
  skipped: boolean;
  stored: number;
  errors: number;
}

async function fetchJson(path: string, apiKey: string): Promise<unknown> {
  const sep = path.includes('?') ? '&' : '?';
  const response = await fetch(`${API_BASE}${path}${sep}api_key=${encodeURIComponent(apiKey)}&format=json`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`congress.gov API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch recently-updated bills matching space/export-control terms and store
 * them as RegulatoryAction rows. Returns { skipped: true } without touching
 * the network when CONGRESS_GOV_API_KEY is not configured.
 */
export async function fetchAndStoreCongressActions(): Promise<CongressFetchResult> {
  const apiKey = process.env.CONGRESS_GOV_API_KEY;
  if (!apiKey) {
    if (!missingKeyLogged) {
      logger.info('[Congress] CONGRESS_GOV_API_KEY not set — congressional tracker skipped (sign up free at https://api.congress.gov/sign-up/)');
      missingKeyLogged = true;
    }
    return { skipped: true, stored: 0, errors: 0 };
  }

  try {
    const fromDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19) + 'Z';

    const [billsJson, summariesJson] = await circuitBreaker.execute(
      async () =>
        Promise.all([
          fetchJson(`/bill?fromDateTime=${encodeURIComponent(fromDate)}&sort=updateDate+desc&limit=250`, apiKey),
          fetchJson(`/summaries?fromDateTime=${encodeURIComponent(fromDate)}&sort=updateDate+desc&limit=250`, apiKey),
        ]),
      [null, null] as [unknown, unknown]
    );

    const bills: CongressApiBill[] =
      (billsJson as { bills?: CongressApiBill[] } | null)?.bills || [];
    const summaries: CongressApiSummary[] =
      (summariesJson as { summaries?: CongressApiSummary[] } | null)?.summaries || [];

    // Index summary text by bill identity
    const summaryByBill = new Map<string, string>();
    for (const s of summaries) {
      if (!s.bill || !s.text) continue;
      const key = `${s.bill.congress}-${s.bill.type.toLowerCase()}-${s.bill.number}`;
      if (!summaryByBill.has(key)) summaryByBill.set(key, stripHtml(s.text));
    }

    const relevant = bills.filter((bill) => {
      const key = `${bill.congress}-${bill.type.toLowerCase()}-${bill.number}`;
      const text = [bill.title, bill.latestAction?.text || '', summaryByBill.get(key) || ''].join(' ');
      return isSpaceOrExportControlBill(text);
    });

    const entries = relevant.map((bill) => {
      const key = `${bill.congress}-${bill.type.toLowerCase()}-${bill.number}`;
      return billToRadarEntry(bill, summaryByBill.get(key) || null);
    });

    const stored = await upsertRadarEntries(entries);

    logger.info('[Congress] Fetched congressional actions', {
      billsScanned: bills.length,
      relevant: relevant.length,
      stored,
    });

    return { skipped: false, stored, errors: 0 };
  } catch (error) {
    logger.error('[Congress] Failed to fetch congressional actions', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { skipped: false, stored: 0, errors: 1 };
  }
}
