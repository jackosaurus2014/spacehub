/**
 * sec-revenue — pure parsing helpers for the SEC EDGAR XBRL "companyfacts"
 * payload, used by /api/cron/sec-revenue-backfill (SYNTHESIS.md item 35:
 * three years of annual revenue for public companies, rendered as a trend).
 *
 * No network calls here — this module only shapes the JSON EDGAR returns
 * from https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json into
 * the three most recent annual (10-K, fp=FY, unit USD) revenue figures.
 *
 * Kept side-effect-free and dependency-free so it is trivially unit
 * testable against a small hand-written fixture.
 */

/** One us-gaap XBRL fact data point, as EDGAR returns it. */
export interface SecFactPoint {
  start?: string;
  end: string;
  val: number;
  accn: string;
  fy: number;
  fp: string;
  form: string;
  filed: string;
  frame?: string;
}

export interface SecCompanyFacts {
  cik?: number;
  entityName?: string;
  facts?: {
    'us-gaap'?: Record<
      string,
      {
        label?: string;
        description?: string;
        units?: Record<string, SecFactPoint[]>;
      }
    >;
  };
}

/** One resolved annual revenue figure, ready to upsert into RevenueEstimate. */
export interface AnnualRevenuePoint {
  fiscalYear: number;
  revenue: number;
  filedDate: string;
  /** Which us-gaap tag this figure came from — kept for traceability/notes. */
  tag: string;
  accn: string;
}

// Preference order: broad "Revenues" first, then the post-ASC-606 contract
// revenue tag most issuers moved to, then the older net-sales tag some
// legacy filers still use.
export const REVENUE_TAGS = [
  'Revenues',
  'RevenueFromContractWithCustomerExcludingAssessedTax',
  'SalesRevenueNet',
] as const;

/**
 * From one us-gaap tag's USD fact points, keep only annual 10-K/FY entries,
 * dedupe to one point per fiscal year (the entry with the latest `filed`
 * date wins — handles restatements/amendments reusing the same fy), and
 * return the `count` most recent fiscal years, most recent first.
 */
export function dedupeAnnualByFiscalYear(
  points: SecFactPoint[],
  tag: string,
  count = 3
): AnnualRevenuePoint[] {
  const annual = points.filter(
    (p) =>
      p.form === '10-K' &&
      p.fp === 'FY' &&
      typeof p.val === 'number' &&
      Number.isFinite(p.val) &&
      typeof p.fy === 'number'
  );
  if (annual.length === 0) return [];

  const byYear = new Map<number, SecFactPoint>();
  for (const p of annual) {
    const existing = byYear.get(p.fy);
    if (!existing || new Date(p.filed).getTime() >= new Date(existing.filed).getTime()) {
      byYear.set(p.fy, p);
    }
  }

  return Array.from(byYear.values())
    .sort((a, b) => b.fy - a.fy)
    .slice(0, count)
    .map((p) => ({ fiscalYear: p.fy, revenue: p.val, filedDate: p.filed, tag, accn: p.accn }));
}

/**
 * Walk REVENUE_TAGS in preference order and return the first tag that has
 * usable annual USD data — the three (or fewer) most recent fiscal years,
 * most recent first. Returns [] if none of the tags have any 10-K/FY data.
 */
export function extractAnnualRevenue(
  facts: SecCompanyFacts | null | undefined,
  count = 3
): AnnualRevenuePoint[] {
  const gaap = facts?.facts?.['us-gaap'];
  if (!gaap) return [];

  for (const tag of REVENUE_TAGS) {
    const points = gaap[tag]?.units?.USD;
    if (!points || points.length === 0) continue;
    const result = dedupeAnnualByFiscalYear(points, tag, count);
    if (result.length > 0) return result;
  }

  return [];
}

/** True for tickers carrying a dot-suffix (e.g. foreign/dual-listing markers) we skip. */
export function hasExchangeSuffix(ticker: string): boolean {
  return ticker.includes('.');
}

/** Zero-pad a numeric CIK to the 10-digit form EDGAR's companyfacts URL requires. */
export function padCik(cik: number | string): string {
  return String(cik).padStart(10, '0');
}

/** Shape of one row in https://www.sec.gov/files/company_tickers.json. */
export interface SecTickerRow {
  cik_str: number;
  ticker: string;
  title: string;
}

/** Build a TICKER -> zero-padded CIK lookup from the company_tickers.json body. */
export function buildTickerCikMap(
  rows: Record<string, SecTickerRow> | SecTickerRow[]
): Map<string, string> {
  const list = Array.isArray(rows) ? rows : Object.values(rows);
  const map = new Map<string, string>();
  for (const row of list) {
    if (!row?.ticker || row.cik_str == null) continue;
    map.set(row.ticker.toUpperCase(), padCik(row.cik_str));
  }
  return map;
}
