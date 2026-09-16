/**
 * The arithmetic behind the Federal Space Awards release.
 *
 * PURE ON PURPOSE. No Prisma, no next/*, no clock. Every function here takes
 * rows and returns numbers, so the test suite can pin the exact behaviour the
 * published edition depends on - above all the two measures a buyer will act
 * on: agency mix and award concentration.
 *
 * Nothing in this file estimates, projects or infers. Every output is a count,
 * a sum, a share or a max over rows that were read from a cited government
 * record.
 */

/** The shape every function here consumes. A trimmed FederalAward row. */
export interface AwardRow {
  generatedInternalId: string;
  awardIdPiid: string;
  awardGroup: string;
  awardType: string | null;
  countsTowardTotals: boolean;
  companyId: string | null;
  companySlug: string | null;
  companyName: string;
  recipientName: string;
  matchQuality: string | null;
  amount: number | null;
  awardingAgency: string;
  awardingSubAgency: string | null;
  actionDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  naicsCode: string | null;
  pscCode: string | null;
  cfdaProgramTitle: string | null;
  description: string | null;
  sourceUrl: string;
}

// ---------------------------------------------------------------------------
// Is this award actually SPACE work?
// ---------------------------------------------------------------------------

/**
 * THE MOST IMPORTANT DISTINCTION IN THIS DATASET.
 *
 * Several tracked companies are diversified primes. Lockheed Martin, Northrop
 * Grumman and Raytheon each hold hundreds of billions of federal dollars, and
 * the overwhelming majority of it is aircraft, missiles, ships and services
 * that have nothing to do with space. Publishing "federal dollars obligated to
 * tracked space companies" with all of that inside it would produce a headline
 * number that is arithmetically correct and completely misleading.
 *
 * So every dollar figure is published TWICE: once for all federal awards to
 * the company, and once for the subset the GOVERNMENT ITSELF codes as space
 * work. The second is the number a space analyst wants.
 *
 * THE FLAG IS THE GOVERNMENT'S, NOT OURS. Every code below was read from the
 * live API together with its official description, and every one of those
 * descriptions names space explicitly:
 *
 *   PSC 18xx  "SPACE VEHICLES", "SPACE VEHICLE COMPONENTS", ...
 *   PSC 1555  "SPACE VEHICLES" (sits in the aircraft group, names space)
 *   PSC ARxx  "R&D- SPACE: FLIGHT", "R&D- SPACE: STATION", "SPACE R&D SERVICES"
 *   PSC V126  "TRANSPORTATION: SPACE TRANSPORTATION/LAUNCH"
 *   NAICS 927110  "SPACE RESEARCH AND TECHNOLOGY"
 *   NAICS 517410  "SATELLITE TELECOMMUNICATIONS"
 *
 * DELIBERATELY EXCLUDED: NAICS 336414/336415/336419, whose official names are
 * "GUIDED MISSILE AND SPACE VEHICLE MANUFACTURING" and its propulsion and
 * parts siblings. That code conflates missiles with spacecraft, and counting
 * it would book tactical-missile production as space revenue — for the primes
 * it is most of the code's volume. Excluding it makes the space figure a
 * conservative floor, which is the right direction to be wrong in. Launch and
 * spacecraft work under that NAICS almost always carries a space PSC anyway,
 * so the loss is small and the error direction is safe.
 *
 * Nothing here is inferred from a description we wrote, a keyword search over
 * an award's free-text narrative, or a model. It is set membership over the
 * government's own coded fields, plus - for grants, which carry no codes at
 * all - the government's own programme title. See the note below.
 */
export const SPACE_PSC_PREFIXES: readonly string[] = ['18', 'AR'];
export const SPACE_PSC_CODES: readonly string[] = ['1555', 'V126'];
export const SPACE_NAICS_CODES: readonly string[] = ['927110', '517410'];

/**
 * GRANTS HAVE NO PRODUCT/SERVICE CODE AT ALL.
 *
 * Verified against the live API: an assistance award returns psc_code null and
 * naics_code null. It carries an assistance listing instead — a CFDA number
 * and the government's own program title, e.g. "43.012 SPACE TECHNOLOGY",
 * "43.007 SPACE OPERATIONS". Without this rule every NASA research grant in
 * the dataset would be classified as non-space, which for an early-stage space
 * company is most of its federal money.
 *
 * The rule is the same shape as the code rule: the GOVERNMENT's own title for
 * the programme names space. Matched on a word boundary, so "AEROSPACE" does
 * not qualify a programme and neither does NASA's education or aeronautics
 * listing — 43.008 "OFFICE OF STEM ENGAGEMENT" and 43.002 "AERONAUTICS" are
 * NASA money that is not space work, and they are correctly refused. The title
 * is stored on every row so the call can be checked without re-reading the API.
 */
const SPACE_PROGRAM_TITLE = /\bspace\b/i;

/** True when the government coded this award as space work. */
export function isSpaceCoded(row: {
  pscCode?: string | null;
  naicsCode?: string | null;
  cfdaProgramTitle?: string | null;
}): boolean {
  const psc = (row.pscCode ?? '').trim().toUpperCase();
  if (psc) {
    if (SPACE_PSC_CODES.includes(psc)) return true;
    if (SPACE_PSC_PREFIXES.some((p) => psc.startsWith(p))) return true;
  }
  const naics = (row.naicsCode ?? '').trim();
  if (naics && SPACE_NAICS_CODES.includes(naics)) return true;
  const programme = (row.cfdaProgramTitle ?? '').trim();
  if (programme && SPACE_PROGRAM_TITLE.test(programme)) return true;
  return false;
}

/** The space-coded subset of a row set. */
export function spaceCodedOnly(rows: readonly AwardRow[]): AwardRow[] {
  return rows.filter(isSpaceCoded);
}

/**
 * Short labels for the handful of agencies that dominate space spending.
 *
 * A LABEL ONLY. The verbatim agency name stays on every row and in every
 * export; this map exists so a headline can say "NASA" instead of "National
 * Aeronautics and Space Administration" without anyone having to retype the
 * name and get it subtly wrong. An agency not listed here keeps its full name.
 */
const AGENCY_SHORT_NAMES: Record<string, string> = {
  'National Aeronautics and Space Administration': 'NASA',
  'Department of Defense': 'DoD',
  'Department of Commerce': 'Commerce',
  'Department of Energy': 'Energy',
  'Department of Transportation': 'Transportation',
  'Department of Homeland Security': 'DHS',
  'National Science Foundation': 'NSF',
  'Department of State': 'State',
  'Department of the Interior': 'Interior',
  'General Services Administration': 'GSA',
  'Department of Health and Human Services': 'HHS',
  'Department of Agriculture': 'Agriculture',
};

export function shortAgency(name: string): string {
  return AGENCY_SHORT_NAMES[name] ?? name;
}

/** Awards that contribute to dollar totals: never an IDV, never a null amount. */
export function countable(rows: readonly AwardRow[]): AwardRow[] {
  return rows.filter((r) => r.countsTowardTotals && typeof r.amount === 'number');
}

export function sumAmount(rows: readonly AwardRow[]): number {
  return countable(rows).reduce((s, r) => s + (r.amount ?? 0), 0);
}

// ---------------------------------------------------------------------------
// By company
// ---------------------------------------------------------------------------

export interface CompanyAwardTotals {
  companyId: string;
  companySlug: string;
  companyName: string;
  awardCount: number;
  /** Awards with an amount that count toward dollars. */
  countedAwards: number;
  obligatedUsd: number;
  /**
   * The subset the government codes as space work. For a pure-play space
   * company this is nearly all of obligatedUsd; for a diversified prime it is
   * a small fraction, which is exactly the point of reporting both.
   */
  spaceObligatedUsd: number;
  spaceAwardCount: number;
  /** spaceObligatedUsd / obligatedUsd. Null when there are no dollars at all. */
  spaceShare: number | null;
  largestAwardUsd: number | null;
  largestAwardId: string | null;
  /**
   * The largest single award as a share of everything this company was
   * obligated in the window. The concentration signal: 0.9 means nine dollars
   * in ten ride on one contract.
   */
  topAwardShare: number | null;
  /** Distinct awarding agencies, and the one that gave the most money. */
  agencies: string[];
  leadAgency: string | null;
  leadAgencyShare: number | null;
  /** Distinct match qualities behind this company's rows, for auditing. */
  matchQualities: string[];
}

export function totalsByCompany(rows: readonly AwardRow[]): CompanyAwardTotals[] {
  const buckets = new Map<string, AwardRow[]>();
  for (const row of rows) {
    if (!row.companyId) continue;
    const list = buckets.get(row.companyId);
    if (list) list.push(row);
    else buckets.set(row.companyId, [row]);
  }

  const out: CompanyAwardTotals[] = [];
  for (const [companyId, list] of buckets) {
    const counted = countable(list);
    const obligated = counted.reduce((s, r) => s + (r.amount ?? 0), 0);
    let largest: AwardRow | null = null;
    for (const r of counted) {
      if (!largest || (r.amount ?? 0) > (largest.amount ?? 0)) largest = r;
    }

    const byAgency = new Map<string, number>();
    for (const r of counted) {
      byAgency.set(r.awardingAgency, (byAgency.get(r.awardingAgency) ?? 0) + (r.amount ?? 0));
    }
    let leadAgency: string | null = null;
    let leadAmount = 0;
    for (const [agency, amount] of byAgency) {
      if (amount > leadAmount || (amount === leadAmount && leadAgency && agency < leadAgency)) {
        leadAgency = agency;
        leadAmount = amount;
      }
    }

    const spaceCounted = counted.filter(isSpaceCoded);
    const spaceObligated = spaceCounted.reduce((s, r) => s + (r.amount ?? 0), 0);

    out.push({
      companyId,
      companySlug: list[0].companySlug ?? '',
      companyName: list[0].companyName,
      awardCount: list.length,
      countedAwards: counted.length,
      obligatedUsd: obligated,
      spaceObligatedUsd: spaceObligated,
      spaceAwardCount: list.filter(isSpaceCoded).length,
      spaceShare: obligated > 0 ? spaceObligated / obligated : null,
      largestAwardUsd: largest?.amount ?? null,
      largestAwardId: largest?.awardIdPiid ?? null,
      topAwardShare: obligated > 0 && largest ? (largest.amount ?? 0) / obligated : null,
      agencies: Array.from(new Set(list.map((r) => r.awardingAgency))).sort(),
      leadAgency,
      leadAgencyShare: obligated > 0 && leadAgency ? leadAmount / obligated : null,
      matchQualities: Array.from(
        new Set(list.map((r) => r.matchQuality).filter((q): q is string => Boolean(q)))
      ).sort(),
    });
  }

  return out.sort(
    (a, b) =>
      b.obligatedUsd - a.obligatedUsd ||
      b.awardCount - a.awardCount ||
      a.companyName.localeCompare(b.companyName)
  );
}

// ---------------------------------------------------------------------------
// By agency
// ---------------------------------------------------------------------------

export interface AgencyTotals {
  agency: string;
  shortName: string;
  awardCount: number;
  obligatedUsd: number;
  companies: number;
  /** Sub-agencies that actually placed the money, largest first. */
  subAgencies: { name: string; obligatedUsd: number }[];
}

export function totalsByAgency(rows: readonly AwardRow[]): AgencyTotals[] {
  const buckets = new Map<string, AwardRow[]>();
  for (const row of countable(rows)) {
    const list = buckets.get(row.awardingAgency);
    if (list) list.push(row);
    else buckets.set(row.awardingAgency, [row]);
  }

  const out: AgencyTotals[] = [];
  for (const [agency, list] of buckets) {
    const subs = new Map<string, number>();
    for (const r of list) {
      const name = r.awardingSubAgency ?? agency;
      subs.set(name, (subs.get(name) ?? 0) + (r.amount ?? 0));
    }
    out.push({
      agency,
      shortName: shortAgency(agency),
      awardCount: list.length,
      obligatedUsd: list.reduce((s, r) => s + (r.amount ?? 0), 0),
      companies: new Set(list.map((r) => r.companyId).filter(Boolean)).size,
      subAgencies: Array.from(subs.entries())
        .map(([name, obligatedUsd]) => ({ name, obligatedUsd }))
        .sort((a, b) => b.obligatedUsd - a.obligatedUsd || a.name.localeCompare(b.name)),
    });
  }

  return out.sort(
    (a, b) => b.obligatedUsd - a.obligatedUsd || a.agency.localeCompare(b.agency)
  );
}

// ---------------------------------------------------------------------------
// Concentration
// ---------------------------------------------------------------------------

/**
 * Herfindahl-Hirschman index over a set of shares, on the 0-10,000 scale
 * regulators use. Returns null when there is nothing to measure, never 0 -
 * a zero would read as "perfectly competitive" when the truth is "no data".
 *
 * Used two ways: across companies (how concentrated is space federal spending
 * on a few winners) and within one company (how much rides on one contract).
 */
export function hhi(values: readonly number[]): number | null {
  const positive = values.filter((v) => Number.isFinite(v) && v > 0);
  const total = positive.reduce((s, v) => s + v, 0);
  if (total <= 0 || positive.length === 0) return null;
  const index = positive.reduce((s, v) => s + Math.pow((v / total) * 100, 2), 0);
  return Math.round(index);
}

/** Share of a total held by the largest `n` values. Null when there is no total. */
export function topNShare(values: readonly number[], n: number): number | null {
  const positive = values.filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => b - a);
  const total = positive.reduce((s, v) => s + v, 0);
  if (total <= 0) return null;
  return positive.slice(0, n).reduce((s, v) => s + v, 0) / total;
}

/**
 * How dependent a company is on its single largest award, expressed as a
 * plain English band. The number is published beside it; the band exists so a
 * reader scanning a table can see the shape without reading every decimal.
 *
 * The thresholds are stated in the methodology and are the only judgement in
 * the release.
 */
export function concentrationBand(topShare: number | null): string {
  if (topShare === null) return 'no measurable total';
  if (topShare >= 0.9) return 'single-award dependent';
  if (topShare >= 0.6) return 'heavily concentrated';
  if (topShare >= 0.35) return 'concentrated';
  return 'spread';
}

// ---------------------------------------------------------------------------
// Windows
// ---------------------------------------------------------------------------

/** The date an award is attributed by: its base obligation date. */
export function awardDate(row: AwardRow): Date | null {
  return row.actionDate ?? row.startDate ?? null;
}

/** Rows whose award date falls inside [start, end). */
export function inWindow(rows: readonly AwardRow[], start: Date, end: Date): AwardRow[] {
  return rows.filter((r) => {
    const d = awardDate(r);
    if (!d) return false;
    return d.getTime() >= start.getTime() && d.getTime() < end.getTime();
  });
}
