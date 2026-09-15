/**
 * The shape every recurring release edition takes.
 *
 * One shape, five franchises. The edition page, the gated export and the
 * publication cron all read this and nothing else, which is what lets a new
 * release ship as one computation module rather than a new page, a new route
 * and a new template.
 *
 * Pure: types, formatters and a stable hash. No Prisma, no next/*.
 */

/** A single computed number for the headline strip. Never a sentence. */
export interface ReportFigure {
  label: string;
  /** Already formatted for display — the module decides the unit. */
  value: string;
  /** Optional second line: the comparison, the denominator, the caveat. */
  detail?: string;
}

export interface ReportColumn {
  key: string;
  label: string;
  /** Right-align and format as a number. */
  numeric?: boolean;
}

export interface ReportTable {
  id: string;
  label: string;
  /** One factual line saying what the rows are. */
  description: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  /**
   * How many rows are shown to everybody. The rest are Research-gated.
   *
   * The split is deliberate: a citable ranking nobody can see wins us nothing,
   * so the top of every table is public and quotable, while the full row set
   * and the export — the part a firm actually models against — is the paid
   * capability. A table with fewer rows than this limit is fully public and
   * the page says so rather than implying something is withheld.
   */
  publicRowLimit: number;
  /** Rendered under the table when the rows cannot carry the whole truth. */
  note?: string;
}

export interface ResearchReportEdition {
  releaseId: string;
  period: string;
  periodLabel: string;
  /** The citable title, period included. */
  title: string;
  /** YYYY-MM-DD. The date the figures describe, not the date they were run. */
  asOf: string;
  /** ISO timestamp of this computation. */
  computedAt: string;
  headline: ReportFigure[];
  tables: ReportTable[];
  /** What this edition can and cannot see. Travels with the numbers, always. */
  coverage: string[];
  /**
   * Stable hash of the computed content. Two consecutive editions with the
   * same hash mean nothing in the source data changed, which the page reports
   * plainly instead of dressing an unchanged quarter up as news.
   */
  inputHash: string;
  /**
   * True when there is nothing to report. An empty edition says "we recorded
   * nothing" — it never renders a zero that reads like a finding.
   */
  empty: boolean;
  /** Why it is empty, when it is. */
  emptyReason?: string;
}

// ---------------------------------------------------------------------------
// Formatting helpers — shared so two releases cannot disagree about a dollar
// ---------------------------------------------------------------------------

export function fmtUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (value === 0) return '$0';
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(abs >= 1e10 ? 1 : 2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(abs >= 1e8 ? 0 : 1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function fmtCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US');
}

/** A percentage that refuses to exist when the denominator is zero. */
export function fmtShare(numerator: number, denominator: number): string {
  if (!denominator) return '—';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export function fmtSignedPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function fmtSigned(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toLocaleString('en-US')}`;
}

/** Percent change, null when the base is zero (never Infinity, never 100%). */
export function pctChange(from: number, to: number): number | null {
  if (from === 0) return null;
  return Math.round(((to - from) / from) * 1000) / 10;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// ---------------------------------------------------------------------------
// Stable hash
// ---------------------------------------------------------------------------

/**
 * FNV-1a over a canonical JSON rendering. Not a cryptographic hash and not
 * meant to be one: its only job is to answer "did this edition's numbers move
 * since the last one?" deterministically across processes. Object keys are
 * sorted so a reordered Prisma result cannot fake a change.
 */
export function stableHash(value: unknown): string {
  const json = canonicalJson(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return 'null';
}

/**
 * The hash for an edition: its tables' rows and its headline values, and
 * nothing else. computedAt and generatedAt timestamps are deliberately
 * excluded — otherwise every recomputation would look like a change.
 */
export function hashEditionContent(
  headline: ReportFigure[],
  tables: ReportTable[]
): string {
  return stableHash({
    headline: headline.map((h) => [h.label, h.value, h.detail ?? '']),
    tables: tables.map((t) => [t.id, t.rows]),
  });
}

/** Total rows across an edition's tables — the "rows behind the numbers" count. */
export function editionRowCount(edition: ResearchReportEdition): number {
  return edition.tables.reduce((sum, t) => sum + t.rows.length, 0);
}
