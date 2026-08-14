// ─── Space Tycoon: Corporate Registry — report shaping & sanitization ───────
// Pure helpers used by POST/GET /api/space-tycoon/corp-report (the opt-in
// publish endpoint) and by the public registry page
// (src/app/space-tycoon/registry/page.tsx). Kept dependency-free of
// Next.js/Prisma so the shaping/sanitization logic is directly unit-testable.
//
// Trust boundary: the client (browser) sends its own locally-generated
// QuarterlyReport (src/lib/game/quarterly-reports.ts) verbatim. Every field
// on that object either came from the player's own game state or — for
// `notableEvents` — from event-log titles that can themselves originate from
// player-chosen names (e.g. a ship or company name folded into an event
// string elsewhere in the engine). None of it is trusted as-is: numbers are
// clamped to finite/sane ranges and every string is run through
// sanitize-html with all tags stripped before it is ever persisted or
// rendered on the public registry page.

import sanitizeHtml from 'sanitize-html';

// Strip all markup — these strings render as plain text on a public,
// crawlable page. No tags, no attributes, no allowed schemes.
const PLAIN_TEXT_SANITIZE_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

/** Strip HTML and clamp length. Non-string input becomes an empty string. */
export function sanitizePlainText(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  const stripped = sanitizeHtml(input, PLAIN_TEXT_SANITIZE_CONFIG).trim();
  return stripped.slice(0, maxLen);
}

// ─── Types ───────────────────────────────────────────────────────────────────

/** Shape of the client-submitted payload — mirrors QuarterlyReport
 *  (quarterly-reports.ts) minus the fields the server derives itself
 *  (id, generatedAtMs). Validated against publishCorpReportSchema
 *  (src/lib/validations.ts) before ever reaching shapeCorpReportForStorage. */
export interface PublishableQuarterlyReport {
  quarterIndex: number;
  quarterNumber: number;
  gameYear: number;
  quarterOfYear: number;
  gameDate?: { year: number; month: number } | null;
  revenue: number;
  costs: number;
  profit: number;
  netWorth: number;
  fleetCount: number;
  buildingCount: number;
  corporationTier: number;
  notableEvents: string[];
  growthRatePct: number | null;
  governorTaxQuarterly?: number;
  subsidiaryIncomeQuarterly?: number;
  insurancePremiumQuarterly?: number;
  outstandingRepairCost?: number;
}

/** What actually gets JSON.stringify'd into PublishedCorpReport.reportJson. */
export interface StoredCorpReportPayload extends PublishableQuarterlyReport {
  /** Wall-clock ms when this snapshot was (re-)published — set server-side, never client-supplied. */
  publishedAt: number;
}

/** Deterministic, monotonic-per-corp DB key for @@unique([corpId, quarter]).
 *  Derived from quarterIndex (0-based, never repeats for a given corp)
 *  rather than a human "Q3 2027" label, which would collide across
 *  corp-lifetime resets/renames. */
export function quarterKey(quarterIndex: number): string {
  return `Q${Math.max(0, Math.floor(Number.isFinite(quarterIndex) ? quarterIndex : 0))}`;
}

// ─── Shaping (write path) ───────────────────────────────────────────────────

function safeFiniteNumber(n: unknown, fallback = 0): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

/** Clamp numeric fields to sane ranges and sanitize every player-influenced
 *  string before the report is persisted. Pure — no I/O, no Date.now() call
 *  unless the caller omits `publishedAt` (defaults for convenience only;
 *  callers writing to the DB should pass an explicit value so re-publishes
 *  are testable/deterministic). */
export function shapeCorpReportForStorage(
  report: PublishableQuarterlyReport,
  publishedAt: number = Date.now(),
): StoredCorpReportPayload {
  const gameDate =
    report.gameDate &&
    typeof report.gameDate === 'object' &&
    Number.isFinite(report.gameDate.year) &&
    Number.isFinite(report.gameDate.month)
      ? {
          year: Math.floor(report.gameDate.year),
          month: Math.min(12, Math.max(1, Math.floor(report.gameDate.month))),
        }
      : null;

  const notableEvents = (Array.isArray(report.notableEvents) ? report.notableEvents : [])
    .slice(0, 5)
    .map((e) => sanitizePlainText(e, 200))
    .filter((e) => e.length > 0);

  const growthRatePct =
    report.growthRatePct === null || report.growthRatePct === undefined
      ? null
      : Number.isFinite(report.growthRatePct)
        ? report.growthRatePct
        : null;

  const optionalField = (n: number | undefined): number | undefined =>
    n === undefined ? undefined : safeFiniteNumber(n);

  return {
    quarterIndex: Math.max(0, Math.floor(safeFiniteNumber(report.quarterIndex))),
    quarterNumber: Math.max(1, Math.floor(safeFiniteNumber(report.quarterNumber, 1))),
    gameYear: Math.floor(safeFiniteNumber(report.gameYear)),
    quarterOfYear: Math.min(4, Math.max(1, Math.floor(safeFiniteNumber(report.quarterOfYear, 1)))),
    gameDate,
    revenue: safeFiniteNumber(report.revenue),
    costs: safeFiniteNumber(report.costs),
    profit: safeFiniteNumber(report.profit),
    netWorth: safeFiniteNumber(report.netWorth),
    fleetCount: Math.max(0, Math.floor(safeFiniteNumber(report.fleetCount))),
    buildingCount: Math.max(0, Math.floor(safeFiniteNumber(report.buildingCount))),
    corporationTier: Math.min(20, Math.max(1, Math.floor(safeFiniteNumber(report.corporationTier, 1)))),
    notableEvents,
    growthRatePct,
    governorTaxQuarterly: optionalField(report.governorTaxQuarterly),
    subsidiaryIncomeQuarterly: optionalField(report.subsidiaryIncomeQuarterly),
    insurancePremiumQuarterly: optionalField(report.insurancePremiumQuarterly),
    outstandingRepairCost: optionalField(report.outstandingRepairCost),
    publishedAt,
  };
}

// ─── Parsing (read path) ─────────────────────────────────────────────────────

/** Defense-in-depth for the registry page: reportJson was already sanitized
 *  at write time, but SSR should never trust a raw JSON.parse of a DB text
 *  column blindly — a future schema/writer change or manual DB edit
 *  shouldn't be able to crash the public page. Returns null on anything that
 *  doesn't look like a shaped report. */
export function parseStoredCorpReport(reportJson: string): StoredCorpReportPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(reportJson);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const p = parsed as Record<string, unknown>;
  if (typeof p.netWorth !== 'number' || typeof p.quarterNumber !== 'number' || typeof p.gameYear !== 'number') {
    return null;
  }
  return shapeCorpReportForStorage(p as unknown as PublishableQuarterlyReport, safeFiniteNumber(p.publishedAt, Date.now()));
}

/** Human-readable quarter label for display ("Q3 2027"), independent of the
 *  DB key returned by quarterKey(). */
export function formatQuarterLabel(report: Pick<StoredCorpReportPayload, 'quarterOfYear' | 'gameYear'>): string {
  return `Q${report.quarterOfYear} ${report.gameYear}`;
}
