/**
 * SpaceNexus recurring releases — the franchise registry.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * A $999/yr research seat renews for one of two reasons: a compounding archive,
 * or a habit the reader builds a workflow around. Both need the same thing —
 * NAMED, DATED, CITABLE releases that land on a fixed calendar and never skip.
 * This registry is the calendar. Every release declared here has a stable URL
 * with the period in it, a citable title, an "as of" date, a methodology block,
 * a coverage-limits block and a gated export of the underlying rows.
 *
 * THE RULE THAT GOVERNS EVERY RELEASE
 * -----------------------------------
 * Editions are COMPUTED, not written. Every figure a release publishes is
 * arithmetic over our own database rows — counts, sums, deltas, rankings,
 * ratios — with the method stated and the coverage limits printed beside the
 * numbers. Prose exists only to label what was computed. No model is called
 * anywhere in this subsystem; that is the standing product rule and it is also
 * the only version of this product we can honestly sell to an investor.
 * src/lib/research-quarterly.ts is the discipline these modules match.
 *
 * PURE ON PURPOSE
 * ---------------
 * No Prisma import, no `next/*` import, no Date.now() except through an
 * injected `now`. The middleware's real-404 registry (src/lib/registry-routes.ts)
 * consults this file on the edge runtime, and the tests exercise the period
 * arithmetic without a database. The computation lives in
 * src/lib/research-report-*.ts; the dispatcher in
 * src/lib/research-report-build.ts.
 */

// ---------------------------------------------------------------------------
// Period arithmetic
// ---------------------------------------------------------------------------

export type ReleaseCadence = 'monthly' | 'quarterly';

/** 'YYYY-MM' for monthly releases. */
export const MONTH_RE = /^(\d{4})-(\d{2})$/;
/** 'YYYY-Qn' for quarterly releases. */
export const QUARTER_RE = /^(\d{4})-Q([1-4])$/;

/** True when `key` is a well-formed period for the cadence. Shape only. */
export function isPeriodKey(cadence: ReleaseCadence, key: string): boolean {
  if (cadence === 'monthly') {
    const m = MONTH_RE.exec(key);
    if (!m) return false;
    const month = Number(m[2]);
    const year = Number(m[1]);
    return month >= 1 && month <= 12 && year >= 2000 && year <= 2100;
  }
  const q = QUARTER_RE.exec(key);
  if (!q) return false;
  const year = Number(q[1]);
  return year >= 2000 && year <= 2100;
}

/** Half-open UTC window [start, end) the period covers. */
export function periodRange(cadence: ReleaseCadence, key: string): { start: Date; end: Date } | null {
  if (!isPeriodKey(cadence, key)) return null;
  if (cadence === 'monthly') {
    const [, y, m] = MONTH_RE.exec(key)!;
    const year = Number(y);
    const month = Number(m);
    return {
      start: new Date(Date.UTC(year, month - 1, 1)),
      end: new Date(Date.UTC(year, month, 1)),
    };
  }
  const [, y, q] = QUARTER_RE.exec(key)!;
  const year = Number(y);
  const quarter = Number(q);
  return {
    start: new Date(Date.UTC(year, (quarter - 1) * 3, 1)),
    end: new Date(Date.UTC(year, quarter * 3, 1)),
  };
}

/** The last DAY inside the period, as YYYY-MM-DD. The edition's "as of". */
export function periodEndDate(cadence: ReleaseCadence, key: string): string | null {
  const range = periodRange(cadence, key);
  if (!range) return null;
  return new Date(range.end.getTime() - 86_400_000).toISOString().slice(0, 10);
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function periodLabel(cadence: ReleaseCadence, key: string): string {
  if (!isPeriodKey(cadence, key)) return key;
  if (cadence === 'monthly') {
    const [, y, m] = MONTH_RE.exec(key)!;
    return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
  }
  const [, y, q] = QUARTER_RE.exec(key)!;
  return `Q${q} ${y}`;
}

export function previousPeriod(cadence: ReleaseCadence, key: string): string | null {
  if (!isPeriodKey(cadence, key)) return null;
  if (cadence === 'monthly') {
    const [, y, m] = MONTH_RE.exec(key)!;
    const year = Number(y);
    const month = Number(m);
    return month === 1
      ? `${year - 1}-12`
      : `${year}-${String(month - 1).padStart(2, '0')}`;
  }
  const [, y, q] = QUARTER_RE.exec(key)!;
  const year = Number(y);
  const quarter = Number(q);
  return quarter === 1 ? `${year - 1}-Q4` : `${year}-Q${quarter - 1}`;
}

export function nextPeriod(cadence: ReleaseCadence, key: string): string | null {
  if (!isPeriodKey(cadence, key)) return null;
  if (cadence === 'monthly') {
    const [, y, m] = MONTH_RE.exec(key)!;
    const year = Number(y);
    const month = Number(m);
    return month === 12
      ? `${year + 1}-01`
      : `${year}-${String(month + 1).padStart(2, '0')}`;
  }
  const [, y, q] = QUARTER_RE.exec(key)!;
  const year = Number(y);
  const quarter = Number(q);
  return quarter === 4 ? `${year + 1}-Q1` : `${year}-Q${quarter + 1}`;
}

/** The period a date falls inside. */
export function periodOf(cadence: ReleaseCadence, now: Date): string {
  const year = now.getUTCFullYear();
  if (cadence === 'monthly') {
    return `${year}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  return `${year}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`;
}

// ---------------------------------------------------------------------------
// The release shape
// ---------------------------------------------------------------------------

export interface ReleaseRelation {
  /** Where an edition of this release is READ. */
  surface: 'series' | 'rankings' | 'hiring-index';
  href: (period: string) => string;
}

export interface ResearchRelease {
  /** Stable id. Appears in the URL and in ResearchReleaseLog.releaseId. */
  id: string;
  /** The citable franchise name. Editions cite as "<title>, <period label>". */
  title: string;
  /** Shorter label for cards and breadcrumbs. */
  shortTitle: string;
  cadence: ReleaseCadence;
  /** One factual line: what the release computes. Never a sales line. */
  summary: string;
  /** Bullet list of exactly what is computed, for the hub card. */
  computes: readonly string[];

  /** Oldest period with an edition. Older periods 404. */
  earliestPeriod: string;
  /**
   * The first edition published ON THE CALENDAR rather than computed
   * retrospectively. Editions before it are marked as back-computed on the
   * page — an archive that pretends to have been published at the time is a
   * lie a research buyer will eventually catch.
   */
  firstScheduledPeriod: string;
  /**
   * Most releases publish only for a period that has ENDED. The Space Score
   * Top 25 deliberately runs live through its quarter and freezes at quarter
   * end (see src/lib/rankings.ts), so it sets this true.
   */
  publishesLivePeriod: boolean;
  /**
   * Days after the period ends by which the edition must exist. Past this and
   * the release is OVERDUE, which the hub and the cron both surface.
   */
  graceDays: number;

  /** Canonical page for one edition. */
  href: (period: string) => string;
  /** Which surface renders it. 'series' = src/app/releases/[series]/[period]. */
  surface: ReleaseRelation['surface'];
  /** Gated row export. Always under /api/research — always Research-gated. */
  exportHref: (period: string) => string;

  /** Rendered verbatim on every edition. */
  methodology: readonly string[];
  /** Repo-relative file that COMPUTES the edition. Asserted to exist in tests. */
  computedBy: string;
}

const seriesHref = (id: string) => (period: string) => `/releases/${id}/${period}`;
const exportHref = (id: string) => (period: string) =>
  `/api/research/reports/${id}/${period}`;

/**
 * THE CALENDAR.
 *
 * Five franchises, chosen because our own tables already support every figure
 * they publish. Consistency beats volume: a monthly that lands on time every
 * month is worth more than three that appear once. Nothing is added here
 * without a computation module behind it.
 */
export const RESEARCH_RELEASES: readonly ResearchRelease[] = [
  {
    id: 'most-active-investors',
    title: 'SpaceNexus Most Active Space Investors',
    shortTitle: 'Most Active Investors',
    cadence: 'quarterly',
    summary:
      'Which investors led the most disclosed space funding rounds in the quarter, and over the trailing twelve months.',
    computes: [
      'Lead investors ranked by rounds led in the quarter, with disclosed totals and median cheque',
      'The same ranking over the trailing twelve months, which is the stabler table',
      'Sectors and stages each lead backed',
      'Leads new to the table — absent from the previous four quarters',
      'The share of rounds that name a lead at all, printed beside every ranking',
    ],
    earliestPeriod: '2024-Q1',
    firstScheduledPeriod: '2026-Q2',
    publishesLivePeriod: false,
    graceDays: 14,
    href: seriesHref('most-active-investors'),
    surface: 'series',
    exportHref: exportHref('most-active-investors'),
    methodology: [
      'Every figure is a count or a sum over the FundingRound table joined to the company profile. No estimate, model or projection is used anywhere in this release.',
      'A round is attributed to the quarter its announced date falls in, in UTC.',
      'A round counts toward an investor only when that investor is recorded as the LEAD. Participation without a lead credit is not counted, because we do not hold complete participant lists and a partial one would rank the wrong firms.',
      'Rounds with an undisclosed amount are counted in the round count and contribute $0 to totals. Totals are therefore a floor, never an estimate.',
      'Ranking is by rounds led, descending; ties break on disclosed total, then on investor name (A–Z), so the table is reproducible.',
      '"New to the table" means the investor led no recorded round in the previous four quarters. It is a statement about our records, not about the firm.',
    ],
    computedBy: 'src/lib/research-report-investors.ts',
  },
  {
    id: 'launch-cadence',
    title: 'SpaceNexus Launch Cadence and Slip Report',
    shortTitle: 'Launch Cadence & Slip',
    cadence: 'monthly',
    summary:
      'Orbital launch attempts, outcomes and schedule slippage for the month, by provider and vehicle.',
    computes: [
      'Attempts, successes and failures for the month, with the prior month and the same month a year earlier',
      'Year-to-date attempts against the same point last year',
      'Attempts by provider and by vehicle, with each provider’s share',
      'Manifest date changes observed in the month: how many, how many launches moved, and the net days lost',
      'Slip statistics by provider, unlocked only past a stated sample threshold',
      'Vehicles not currently flying, from the dated vehicle status sheet',
    ],
    earliestPeriod: '2026-01',
    firstScheduledPeriod: '2026-08',
    publishesLivePeriod: false,
    graceDays: 5,
    href: seriesHref('launch-cadence'),
    surface: 'series',
    exportHref: exportHref('launch-cadence'),
    methodology: [
      'Launch counts come from the SpaceEvent table, restricted to rows carrying a Launch Library 2 identifier and a terminal outcome (completed or failed). Curated seed events, which are not launches, are excluded by identifier shape.',
      'A launch is attributed to the month its launch date falls in, in UTC.',
      '"Attempts" counts every launch that left the pad and reached a recorded outcome. Success rate is successes divided by attempts for that month; a month with no attempts reports no rate rather than zero.',
      'Provider is the agency recorded on the launch row as Launch Library spells it; no provider names are merged or renamed.',
      'Slip figures come from the LaunchDateChange ledger, which records every manifest date move we observe. The ledger starts on 2026-08-29 and cannot be backfilled by anyone, us included — Launch Library exposes no revision history. Months before that date report launches without slips, and the page says so.',
      'Per-provider slip statistics appear only once the ledger holds enough observations to be worth reporting; below that threshold the section states the count instead of publishing a rate.',
      'Vehicle standings are read from the hand-maintained vehicle status sheet, each entry carrying its own as-of date, which is printed.',
    ],
    computedBy: 'src/lib/research-report-launch.ts',
  },
  {
    id: 'supply-chain-concentration',
    title: 'SpaceNexus Supply-Chain Concentration Report',
    shortTitle: 'Supply-Chain Concentration',
    cadence: 'quarterly',
    summary:
      'Where the tracked space supply chain concentrates: by country, by tier, and on the suppliers most programmes depend on.',
    computes: [
      'Supplier relationships by country and by tier, with each one’s share of the map and of its critical relationships',
      'Chokepoints: suppliers by how many distinct customers depend on them',
      'Single-source dependencies — customers whose critical inputs come from exactly one mapped supplier',
      'Bill-of-materials items at critical and high risk, by category',
      'Shortages active at the end of the quarter, by severity',
      'Whether anything in the map changed since the previous edition',
    ],
    earliestPeriod: '2026-Q1',
    firstScheduledPeriod: '2026-Q2',
    publishesLivePeriod: false,
    graceDays: 14,
    href: seriesHref('supply-chain-concentration'),
    surface: 'series',
    exportHref: exportHref('supply-chain-concentration'),
    methodology: [
      'Computed over the analyst-maintained supply-chain map (companies, relationships and shortages) and the bill-of-materials risk register. Both are reviewed rather than scraped, so they change in steps, not continuously.',
      'Concentration shares are counts of mapped relationships, not dollars or volumes. A country holding 30% of mapped relationships holds 30% of the relationships WE HAVE MAPPED, which is not the same as 30% of the industry.',
      'A relationship is "critical" when the register marks it so. Criticality is an analyst judgement recorded in the data, and it is the only judgement in this release.',
      'A single-source dependency is a customer for which exactly one mapped supplier supplies a relationship marked critical. Suppliers outside the map cannot be counted, so this is an upper bound on single-sourcing we can see and a lower bound on the real figure.',
      'Shortages are counted as active at the end of the quarter when their recorded start date falls on or before that date and no resolution is recorded.',
      'Each edition stores a hash of its inputs. When the hash matches the previous edition, the page states plainly that nothing in the map changed — an unchanged quarter is reported as unchanged rather than dressed up.',
    ],
    computedBy: 'src/lib/research-report-supply-chain.ts',
  },
  {
    id: 'hiring-index',
    title: 'SpaceNexus Hiring Index',
    shortTitle: 'Hiring Index',
    cadence: 'monthly',
    summary:
      'Open space-industry roles at month end, the month-over-month change, and which employers moved.',
    computes: [
      'Active postings at month end and the change against the prior month',
      'New postings in the month by function and by seniority',
      'The employers that added and shed the most roles inside the month',
      'Remote share and the leading hiring locations',
    ],
    earliestPeriod: '2026-08',
    firstScheduledPeriod: '2026-08',
    publishesLivePeriod: false,
    graceDays: 3,
    href: (period) => `/hiring-index/${period}`,
    surface: 'hiring-index',
    exportHref: exportHref('hiring-index'),
    methodology: [
      'Built from a daily snapshot of live postings across tracked space-company applicant-tracking systems. Every tracked company’s open-role count is recorded once a day.',
      'The month-end figure is the last site-wide snapshot taken on or before the end of the month; the month-over-month change compares it to the previous month’s equivalent.',
      'Within-month movers compare a company’s first and last snapshot inside the month — net roles, not gross postings.',
      'Snapshot history begins in August 2026. Months before that have no reading and are not published.',
      'When a company’s board newly joins the tracker inside a month, its first snapshot is the day we started watching it, so its apparent growth is coverage rather than hiring. Coverage changes inside the month are named on the page.',
    ],
    computedBy: 'src/lib/hiring-index.ts',
  },
  {
    id: 'space-score-top-25',
    title: 'SpaceNexus Space Score Top 25',
    shortTitle: 'Space Score Top 25',
    cadence: 'quarterly',
    summary:
      'The twenty-five highest-rated tracked space companies on the 0–1000 Space Score composite.',
    computes: [
      'The top 25 by total Space Score, with the five pillar sub-scores',
      'Rank movement against the previous edition, and only when one exists',
      'Sector and tier distribution across the table',
    ],
    earliestPeriod: '2026-Q3',
    firstScheduledPeriod: '2026-Q3',
    publishesLivePeriod: true,
    graceDays: 14,
    href: (period) => `/rankings/space-score-top-25/${period}`,
    surface: 'rankings',
    exportHref: exportHref('space-score-top-25'),
    methodology: [
      'The Space Score is a composite 0–1000 rating across five equally weighted dimensions worth 200 points each: Innovation, Financial Health, Market Position, Operational Capacity and Growth Trajectory.',
      'Scores are assigned to a fixed roster of tracked space companies from public data. Private companies are scored on disclosed figures only, so the score measures the evidence available rather than management quality.',
      'This table ranks the top 25 by total score; ties break on company name (A–Z), so the order is reproducible.',
      'The table runs live through its quarter and freezes when the quarter ends. Rank movement is measured only against the previous edition’s stored ordering, never against a re-derivation of today’s table.',
      'This is not investment advice. The Space Score is a descriptive composite, not a forecast or a recommendation.',
    ],
    computedBy: 'src/lib/space-score.ts',
  },
  {
    id: 'federal-space-awards',
    title: 'SpaceNexus Federal Space Awards',
    shortTitle: 'Federal Space Awards',
    cadence: 'quarterly',
    summary:
      'Which tracked space companies won US federal money in the quarter, from which agencies, and how concentrated that money is.',
    computes: [
      'Space-coded federal dollars obligated to each tracked company in the quarter, and over the trailing twelve months',
      'Agency mix — NASA against DoD against everyone else — as a customer-concentration signal',
      'Award concentration: what share of a company’s space money rides on its single largest award, and the HHI across the whole field',
      'Each company’s whole federal book beside the share of it the government codes as space, which is what separates a pure-play from a diversified prime',
      'Companies winning their first space award inside our window',
      'Space obligations set beside private funding for the companies that did both',
      'The full award list behind every table, each row linking to its usaspending.gov record',
    ],
    earliestPeriod: '2024-Q1',
    firstScheduledPeriod: '2026-Q3',
    publishesLivePeriod: false,
    // 30, not 14: defense contract records reach USAspending on a reporting
    // lag of up to 90 days, so publishing a quarter the day it closes would
    // publish a number we already know is low.
    graceDays: 30,
    href: seriesHref('federal-space-awards'),
    surface: 'series',
    exportHref: exportHref('federal-space-awards'),
    methodology: [
      'Every figure is a count, a sum, a share, a maximum or a Herfindahl index over the FederalAward table, which is built from USAspending.gov — the US Treasury’s public record of federal spending. No estimate, model or projection is used anywhere in this release, and every stored award carries the usaspending.gov URL it was read from.',
      'Every dollar figure is the SPACE-CODED subset: awards the government itself codes as space work through the award’s own product/service code (space vehicles, space R&D, space transportation and launch) or industry code (space research and technology, satellite telecommunications). Several tracked companies are diversified primes whose federal business is mostly aircraft, missiles and services, and reporting their whole federal book as space would be arithmetically correct and completely misleading. The all-federal figure is published beside the space figure, never instead of it.',
      'The space-coded flag deliberately excludes the "guided missile and space vehicle manufacturing" industry codes, which conflate tactical missiles with spacecraft. Space work under those codes almost always carries a space product/service code as well, so the loss is small — but every space figure here is a conservative floor rather than a ceiling.',
      'Only PRIME awards are counted. A company working as a subcontractor on another firm’s prime contract does not appear, because USAspending’s subaward file is reported voluntarily and incompletely and we will not mix the two.',
      'Amounts are the OBLIGATED total USAspending reports on the award — money actually placed on contract — not an announced ceiling. A multi-year IDIQ with a headline value appears only as the orders placed against it.',
      'Indefinite-delivery vehicles are stored and listed but contribute $0 to every dollar figure: their reported value is the sum of the orders under them, and those orders are counted individually, so counting both would count the same money twice.',
      'An award is attributed to the quarter its BASE OBLIGATION date falls in, in UTC — the date the award was originally made. A modification that adds money updates the existing award in place rather than creating a second row, so this release measures awards WON in the quarter, not dollars flowing in the quarter. Those are different questions and the page says which one it answers.',
      'A recipient is attributed to a tracked company only on an exact Unique Entity ID match, an exact name match once corporate form is stripped, or a name that is the company’s own followed solely by generic corporate or federal-contracting words. Nothing fuzzy is accepted, a recipient that would match two companies is attributed to neither, and every stored row records the government’s spelling of the recipient alongside the match quality.',
      'Concentration bands are the one judgement in this release and are fixed: a company whose largest single award is 90% or more of its federal total is called single-award dependent, 60% or more heavily concentrated, 35% or more concentrated, and below that spread. The underlying percentage is published beside the band.',
      'Defense contract records reach USAspending on a reporting lag of up to 90 days, so the most recent quarter is systematically incomplete and grows when the edition is recomputed. Each edition prints the moment it was computed.',
      'Classified and unacknowledged procurement is not published on USAspending at all. For a company whose federal business is largely classified, every figure here is a floor of unknown depth.',
    ],
    computedBy: 'src/lib/research-report-gov-awards.ts',
  },
  {
    id: 'space-insider-activity',
    title: 'SpaceNexus Space Insider Activity',
    shortTitle: 'Space Insider Activity',
    cadence: 'monthly',
    summary:
      'What company insiders and 5% holders filed with the SEC on the listed space names this month, and how much each issuer filed.',
    computes: [
      'Open-market insider purchases and sales — codes P and S only — with the insider, the role, the shares, the price and the filing',
      'Every other Form 4 transaction class published beside them, so what the headline excludes is visible rather than asserted',
      'Insider activity by company, with grants and tax withholding reported separately and never mixed into the net',
      'Schedule 13D and 13G holders of 5% or more, and the change against that holder’s previous filing on the same issuer',
      'Filing cadence by issuer: 8-K volume against its own trailing monthly average, form types first seen, late-filing notices, and the lag between a period end and its 10-Q',
      'The full filing index behind every table, each row linking to its accession on sec.gov',
    ],
    earliestPeriod: '2025-01',
    firstScheduledPeriod: '2026-09',
    publishesLivePeriod: false,
    // 12, not 5: a Form 4 is due within two business days of a transaction but
    // a Form 5 reports deferred transactions after the fiscal year, and
    // amendments arrive later still. Publishing the day the month closes would
    // publish a count we already know will move.
    graceDays: 12,
    href: seriesHref('space-insider-activity'),
    surface: 'series',
    exportHref: exportHref('space-insider-activity'),
    methodology: [
      'Every figure is a count, a sum or a difference over the InsiderTransaction, InstitutionalPosition and IssuerFiling tables, each row of which was parsed from an SEC filing document and stores that filing’s accession number and URL. No estimate, model, projection or score is used anywhere in this release.',
      'A transaction is attributed to the month its transaction date falls in, in UTC — the date the trade happened, not the date it was reported. A line carrying no transaction date falls back to the filing date, and nothing else is inferred.',
      'THE HEADLINE PURCHASE AND SALE FIGURES COUNT ONLY CODES P AND S: an open-market or private purchase, and an open-market or private sale. A restricted-stock grant (code A) is not a purchase and shares withheld to pay tax on it (code F) are not a sale — both are automatic events on a compensation calendar. Every other class is published in its own table with its line count, share total and disclosed value, so the exclusion can be checked rather than trusted.',
      'Value is shares multiplied by the price the filer disclosed. A line with no price contributes nothing and is counted as undisclosed — never as a value of zero, which would drag every total down silently.',
      'A joint Form 4 reports one set of shares held by several related reporting persons. The line is attributed to the first person named and the others are listed beside it; attributing it to each would multiply the block by the number of filers.',
      'Form 3 — an insider’s initial statement of holdings — is not imported. It reports a standing position rather than a transaction, and counting it as one would invent a trade on the day every director joined a board.',
      'Schedule 13D and 13G figures come only from structured XML submissions, which the SEC mandated from 2024-12-18. Earlier filings are free-text cover pages: they are indexed and never scraped for share counts. Percent of class is the figure the filer stated and is not recomputed by us.',
      'Filing-cadence comparisons use each company’s own trailing monthly average over the months we actually hold filings for, and the number of those months is printed beside the average. A company we began indexing recently would otherwise show a burst that is really coverage.',
      'Coverage is the tracked companies carrying a ticker that resolves to an SEC filer through EDGAR’s official ticker-to-CIK map. Foreign-listed and privately held space companies file none of these forms, so their absence says nothing about them.',
      'This release reports what was filed. It contains no recommendation, rating, target or forecast, it does not consider any reader’s circumstances, and it is not investment advice.',
    ],
    computedBy: 'src/lib/research-report-insider.ts',
  },
];

export function getRelease(id: string): ResearchRelease | undefined {
  return RESEARCH_RELEASES.find((r) => r.id === id);
}

export function allReleaseIds(): string[] {
  return RESEARCH_RELEASES.map((r) => r.id);
}

/** Releases whose editions are rendered by /reports/[series]/[period]. */
export function seriesReleases(): ResearchRelease[] {
  return RESEARCH_RELEASES.filter((r) => r.surface === 'series');
}

// ---------------------------------------------------------------------------
// Which editions exist
// ---------------------------------------------------------------------------

/**
 * The most recent period with a published edition.
 *
 * For every release but the Space Score table that is the last period which has
 * ENDED: a half-finished quarter served as though it were done is the fastest
 * way to lose a research customer. Never earlier than the release's own
 * earliest period.
 */
export function latestPeriod(release: ResearchRelease, now: Date = new Date()): string {
  const current = periodOf(release.cadence, now);
  const candidate = release.publishesLivePeriod
    ? current
    : previousPeriod(release.cadence, current) ?? current;
  return candidate < release.earliestPeriod ? release.earliestPeriod : candidate;
}

/** Every published period key for a release, oldest first. */
export function publishedPeriods(release: ResearchRelease, now: Date = new Date()): string[] {
  const out: string[] = [];
  const last = latestPeriod(release, now);
  let cursor: string | null = release.earliestPeriod;
  for (let i = 0; cursor && i < 400; i++) {
    out.push(cursor);
    if (cursor === last) break;
    if (cursor > last) {
      // The earliest period is itself in the future (a release configured
      // ahead of time). Publish nothing rather than an empty edition.
      return [];
    }
    cursor = nextPeriod(release.cadence, cursor);
  }
  return out;
}

/** True when this period has an edition the site will render. */
export function isPublishedPeriod(
  release: ResearchRelease,
  period: string,
  now: Date = new Date()
): boolean {
  if (!isPeriodKey(release.cadence, period)) return false;
  if (period < release.earliestPeriod) return false;
  return period <= latestPeriod(release, now);
}

/** True when the edition was computed after the fact rather than on schedule. */
export function isRetrospectiveEdition(release: ResearchRelease, period: string): boolean {
  return period < release.firstScheduledPeriod;
}

// ---------------------------------------------------------------------------
// Due dates — how a missed release becomes visible
// ---------------------------------------------------------------------------

export type ReleaseStatus = 'published' | 'due' | 'overdue' | 'awaiting-period-end';

export interface ReleaseDueState {
  release: ResearchRelease;
  /** The period that should be on the shelf right now. */
  period: string;
  periodLabel: string;
  /** The moment that edition became due. */
  dueAt: Date;
  /** When the cron last recorded the edition, if it ever did. */
  publishedAt: Date | null;
  status: ReleaseStatus;
  /** Whole days past due; 0 when not overdue. */
  daysLate: number;
  /** The next period and when it falls due, for the "next edition" line. */
  nextPeriod: string;
  nextDueAt: Date;
}

/** The moment an edition for `period` is expected to exist. */
export function dueAtFor(release: ResearchRelease, period: string): Date | null {
  const range = periodRange(release.cadence, period);
  if (!range) return null;
  // A live-period release is due as soon as its period OPENS: the Space Score
  // table is meant to be readable throughout its quarter.
  const base = release.publishesLivePeriod ? range.start : range.end;
  return new Date(base.getTime() + release.graceDays * 86_400_000);
}

/**
 * Where a release stands right now.
 *
 * A missed release must be VISIBLE, not silent. This is the one function that
 * decides that, and it is what /reports, the release hub and the cron all read.
 * `publishedAt` comes from the ResearchReleaseLog row for the period, so an
 * edition the cron never managed to compute reads as overdue rather than as
 * a page that merely happens to be empty.
 */
export function releaseDueState(
  release: ResearchRelease,
  publishedAt: Date | null,
  now: Date = new Date()
): ReleaseDueState {
  const period = latestPeriod(release, now);
  const dueAt = dueAtFor(release, period)!;
  const next = nextPeriod(release.cadence, period)!;
  const nextDueAt = dueAtFor(release, next)!;

  let status: ReleaseStatus;
  if (publishedAt) {
    status = 'published';
  } else if (now.getTime() < dueAt.getTime()) {
    status = 'awaiting-period-end';
  } else {
    const lateMs = now.getTime() - dueAt.getTime();
    status = lateMs > 86_400_000 ? 'overdue' : 'due';
  }

  return {
    release,
    period,
    periodLabel: periodLabel(release.cadence, period),
    dueAt,
    publishedAt,
    status,
    daysLate:
      publishedAt || now.getTime() <= dueAt.getTime()
        ? 0
        : Math.floor((now.getTime() - dueAt.getTime()) / 86_400_000),
    nextPeriod: next,
    nextDueAt,
  };
}

export const RELEASE_STATUS_LABEL: Record<ReleaseStatus, string> = {
  published: 'Published',
  due: 'Due now',
  overdue: 'Overdue',
  'awaiting-period-end': 'Next edition scheduled',
};

// ---------------------------------------------------------------------------
// Citation
// ---------------------------------------------------------------------------

const SITE = 'https://spacenexus.us';

/** The line a reader pastes into a memo. */
export function citationFor(release: ResearchRelease, period: string, asOf: string): string {
  return `${release.title}, ${periodLabel(release.cadence, period)}. SpaceNexus, data as of ${asOf}. ${SITE}${release.href(period)}`;
}

export function absoluteHref(release: ResearchRelease, period: string): string {
  return `${SITE}${release.href(period)}`;
}
