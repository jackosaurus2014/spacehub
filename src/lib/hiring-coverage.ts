// Coverage-change ledger for the hiring data products (2026-09-01).
//
// When a new company board joins the ATS sync, total-postings series jump by
// that board's whole size — tracking growth, not market growth. The movers
// tables are already safe (companies without a prior snapshot are excluded),
// but WINDOW TOTALS (the 30-day tile on /hiring-trends, the MoM line on
// /hiring-index) would silently report the jump as hiring. Bloomberg-grade
// data flags its own methodology changes; so do we.
//
// Append a row whenever a board is added to or removed from ATS_BOARDS.

export interface CoverageChange {
  /** UTC date the board's jobs first landed in SpaceJobPosting. */
  date: string; // YYYY-MM-DD
  company: string;
  /** Approximate active postings added (sign it negative for removals). */
  jobsDelta: number;
  note: string;
}

export const HIRING_COVERAGE_CHANGES: CoverageChange[] = [
  {
    date: '2026-09-01',
    company: 'Blue Origin',
    jobsDelta: 1590,
    note: 'Blue Origin’s Workday board joined the tracker (+≈1,590 postings). Totals jump on this date reflects expanded coverage, not market hiring.',
  },
];

/** Coverage changes whose date falls inside [since, until] (ISO date strings
 *  or Dates). Used by pages to annotate any window the jump distorts. */
export function coverageChangesInWindow(since: Date | string, until: Date | string = new Date()): CoverageChange[] {
  const s = new Date(since).getTime();
  const u = new Date(until).getTime();
  return HIRING_COVERAGE_CHANGES.filter(c => {
    const t = new Date(c.date + 'T00:00:00Z').getTime();
    return t >= s && t <= u;
  });
}
