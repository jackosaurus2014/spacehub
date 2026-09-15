/**
 * SpaceNexus Most Active Space Investors — quarterly.
 *
 * The competitor's flagship report is a list of the VCs who did the most space
 * deals. We already hold the rounds, so the honest version of that report is
 * arithmetic: count the rounds each investor led, sum what was disclosed, and
 * print the denominator beside the ranking so the reader knows how much of the
 * quarter the table actually sees.
 *
 * TWO RANKINGS, TWO DENOMINATORS. A "most active investor" table is only as
 * good as its attribution, and ours has two different kinds:
 *   LED          — FundingRound.leadInvestor. One name, high confidence.
 *   PARTICIPATED — FundingRound.investors[]. A list we hold for some rounds and
 *                  not others. Ranking on it without saying how many rounds
 *                  carry a list at all would rank whoever we happen to have
 *                  better records for.
 * Both tables are published, each with its own coverage denominator printed
 * directly beneath it. Neither is merged into the other.
 *
 * Nothing here calls a model. Every number is a count, a sum, a median or a
 * ratio over rows in our own database.
 */

import prisma from '@/lib/db';
import {
  fmtCount,
  fmtShare,
  fmtUsd,
  hashEditionContent,
  median,
  type ReportFigure,
  type ReportTable,
  type ResearchReportEdition,
} from '@/lib/research-report-types';
import {
  getRelease,
  periodLabel,
  periodEndDate,
  periodRange,
  previousPeriod,
} from '@/lib/research-releases';

const RELEASE_ID = 'most-active-investors';

/** How many prior quarters an investor must be absent from to be "new". */
const NEW_ENTRANT_LOOKBACK_QUARTERS = 4;

interface RoundRow {
  id: string;
  date: Date;
  amount: number | null;
  amountUndisclosed: boolean;
  seriesLabel: string | null;
  roundType: string | null;
  leadInvestor: string | null;
  investors: string[];
  source: string | null;
  sourceUrl: string | null;
  company: { slug: string; name: string; sector: string | null } | null;
}

const SELECT = {
  id: true,
  date: true,
  amount: true,
  amountUndisclosed: true,
  seriesLabel: true,
  roundType: true,
  leadInvestor: true,
  investors: true,
  source: true,
  sourceUrl: true,
  company: { select: { slug: true, name: true, sector: true } },
} as const;

/** Trim and drop the empties; investor names arrive from several fetchers. */
function cleanNames(values: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const name = (v ?? '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

interface InvestorBucket {
  investor: string;
  roundCount: number;
  disclosedCount: number;
  disclosedTotal: number;
  amounts: number[];
  sectors: Set<string>;
  stages: Set<string>;
  companies: Set<string>;
}

function bucketFor(map: Map<string, InvestorBucket>, investor: string): InvestorBucket {
  const key = investor.toLowerCase();
  let bucket = map.get(key);
  if (!bucket) {
    bucket = {
      investor,
      roundCount: 0,
      disclosedCount: 0,
      disclosedTotal: 0,
      amounts: [],
      sectors: new Set(),
      stages: new Set(),
      companies: new Set(),
    };
    map.set(key, bucket);
  }
  return bucket;
}

function addRound(bucket: InvestorBucket, r: RoundRow): void {
  bucket.roundCount += 1;
  if (typeof r.amount === 'number' && r.amount > 0) {
    bucket.disclosedCount += 1;
    bucket.disclosedTotal += r.amount;
    bucket.amounts.push(r.amount);
  }
  if (r.company?.sector) bucket.sectors.add(r.company.sector);
  const stage = (r.seriesLabel || r.roundType || '').trim();
  if (stage) bucket.stages.add(stage);
  if (r.company?.name) bucket.companies.add(r.company.name);
}

/**
 * Rank a bucket map. Rounds first, disclosed total second, name last — a
 * ranking whose order wobbles between renders cannot be cited.
 */
function rankBuckets(map: Map<string, InvestorBucket>) {
  return Array.from(map.values())
    .map((b) => ({
      investor: b.investor,
      roundCount: b.roundCount,
      disclosedCount: b.disclosedCount,
      disclosedTotalUsd: b.disclosedTotal,
      medianDisclosedUsd: median(b.amounts),
      largestDisclosedUsd: b.amounts.length ? Math.max(...b.amounts) : null,
      sectors: Array.from(b.sectors).sort(),
      stages: Array.from(b.stages).sort(),
      companies: Array.from(b.companies).sort(),
    }))
    .sort(
      (a, b) =>
        b.roundCount - a.roundCount ||
        b.disclosedTotalUsd - a.disclosedTotalUsd ||
        a.investor.localeCompare(b.investor)
    );
}

/**
 * Build one edition.
 *
 * Returns an edition marked `empty` (never a table of zeroes) when the quarter
 * holds no rounds at all: no rounds recorded is a statement about our records,
 * and it must read that way.
 */
export async function buildInvestorsEdition(period: string): Promise<ResearchReportEdition> {
  const release = getRelease(RELEASE_ID)!;
  const range = periodRange('quarterly', period);
  if (!range) throw new Error(`Invalid quarter: ${period}`);

  // The trailing-twelve-month window ends with this quarter and reaches back
  // four quarters in total, so a single loud quarter cannot own the table.
  const ttmStart = new Date(Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth() - 9, 1));
  // Lookback for "new to the table": the four quarters BEFORE this one.
  const lookbackStart = new Date(
    Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth() - NEW_ENTRANT_LOOKBACK_QUARTERS * 3, 1)
  );
  const priorKey = previousPeriod('quarterly', period);
  const priorRange = priorKey ? periodRange('quarterly', priorKey) : null;

  const [quarterRounds, ttmRounds, lookbackRounds, priorRounds] = (await Promise.all([
    prisma.fundingRound.findMany({
      where: { date: { gte: range.start, lt: range.end } },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
      select: SELECT,
    }),
    prisma.fundingRound.findMany({
      where: { date: { gte: ttmStart, lt: range.end } },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
      select: SELECT,
    }),
    prisma.fundingRound.findMany({
      where: { date: { gte: lookbackStart, lt: range.start } },
      select: { leadInvestor: true },
    }),
    priorRange
      ? prisma.fundingRound.findMany({
          where: { date: { gte: priorRange.start, lt: priorRange.end } },
          select: { leadInvestor: true },
        })
      : Promise.resolve([] as { leadInvestor: string | null }[]),
  ])) as [RoundRow[], RoundRow[], { leadInvestor: string | null }[], { leadInvestor: string | null }[]];

  const computedAt = new Date().toISOString();
  const asOf = periodEndDate('quarterly', period)!;
  const title = `${release.title}, ${periodLabel('quarterly', period)}`;

  if (quarterRounds.length === 0) {
    return {
      releaseId: RELEASE_ID,
      period,
      periodLabel: periodLabel('quarterly', period),
      title,
      asOf,
      computedAt,
      headline: [],
      tables: [],
      coverage: [
        'No funding rounds are recorded in our database for this quarter. That is a statement about our coverage, not a claim that no rounds happened.',
      ],
      inputHash: hashEditionContent([], []),
      empty: true,
      emptyReason: 'No funding rounds are recorded for this quarter.',
    };
  }

  // --- Denominators, computed before anything is ranked --------------------
  const withLead = quarterRounds.filter((r) => (r.leadInvestor ?? '').trim().length > 0);
  const withInvestorList = quarterRounds.filter((r) => cleanNames(r.investors).length > 0);
  const disclosed = quarterRounds.filter((r) => typeof r.amount === 'number' && r.amount > 0);
  const disclosedTotal = disclosed.reduce((s, r) => s + (r.amount ?? 0), 0);

  // --- Table 1: leads, this quarter ---------------------------------------
  const leadMap = new Map<string, InvestorBucket>();
  for (const r of withLead) addRound(bucketFor(leadMap, r.leadInvestor!.trim()), r);
  const leadsThisQuarter = rankBuckets(leadMap);

  // --- Table 2: leads, trailing twelve months ------------------------------
  const ttmMap = new Map<string, InvestorBucket>();
  let ttmWithLead = 0;
  for (const r of ttmRounds) {
    const lead = (r.leadInvestor ?? '').trim();
    if (!lead) continue;
    ttmWithLead += 1;
    addRound(bucketFor(ttmMap, lead), r);
  }
  const leadsTtm = rankBuckets(ttmMap);

  // --- Table 3: participation ----------------------------------------------
  const participationMap = new Map<string, InvestorBucket>();
  for (const r of quarterRounds) {
    for (const name of cleanNames(r.investors)) {
      addRound(bucketFor(participationMap, name), r);
    }
  }
  const participants = rankBuckets(participationMap);

  // --- Table 4: new to the table -------------------------------------------
  const seenBefore = new Set(
    cleanNames(lookbackRounds.map((r) => r.leadInvestor)).map((n) => n.toLowerCase())
  );
  const newEntrants = leadsThisQuarter.filter(
    (row) => !seenBefore.has(row.investor.toLowerCase())
  );

  // --- Table 5: the rounds behind the tables -------------------------------
  const roundRows = quarterRounds
    .slice()
    .sort((a, b) => (b.amount ?? -1) - (a.amount ?? -1) || a.date.getTime() - b.date.getTime())
    .map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      company: r.company?.name ?? '',
      companySlug: r.company?.slug ?? '',
      sector: r.company?.sector ?? '',
      stage: r.seriesLabel ?? r.roundType ?? '',
      amountUsd: typeof r.amount === 'number' && r.amount > 0 ? r.amount : null,
      amountDisclosed: typeof r.amount === 'number' && r.amount > 0 ? 'yes' : 'no',
      leadInvestor: (r.leadInvestor ?? '').trim(),
      otherInvestors: cleanNames(r.investors).join('; '),
      source: r.source ?? '',
      sourceUrl: r.sourceUrl ?? '',
    }));

  const priorLeadCount = new Set(
    cleanNames(priorRounds.map((r) => r.leadInvestor)).map((n) => n.toLowerCase())
  ).size;

  const headline: ReportFigure[] = [
    {
      label: 'Rounds recorded',
      value: fmtCount(quarterRounds.length),
      detail: `${fmtCount(disclosed.length)} with a disclosed amount`,
    },
    {
      label: 'Disclosed capital',
      value: fmtUsd(disclosedTotal),
      detail: 'A floor: undisclosed rounds contribute nothing',
    },
    {
      label: 'Rounds naming a lead',
      value: `${fmtCount(withLead.length)} of ${fmtCount(quarterRounds.length)}`,
      detail: `${fmtShare(withLead.length, quarterRounds.length)} — the ranking below sees only these`,
    },
    {
      label: 'Distinct lead investors',
      value: fmtCount(leadsThisQuarter.length),
      detail:
        priorKey && priorLeadCount > 0
          ? `${fmtCount(priorLeadCount)} in ${periodLabel('quarterly', priorKey)}`
          : 'No comparable prior quarter in our records',
    },
  ];

  const tables: ReportTable[] = [
    {
      id: 'leads-quarter',
      label: `Lead investors, ${periodLabel('quarterly', period)}`,
      description:
        'Investors ranked by the number of rounds they are recorded as leading inside the quarter.',
      columns: [
        { key: 'rank', label: '#', numeric: true },
        { key: 'investor', label: 'Investor' },
        { key: 'roundCount', label: 'Rounds led', numeric: true },
        { key: 'disclosedTotalUsd', label: 'Disclosed total', numeric: true },
        { key: 'medianDisclosedUsd', label: 'Median round', numeric: true },
        { key: 'sectors', label: 'Sectors backed' },
        { key: 'companies', label: 'Companies' },
      ],
      rows: leadsThisQuarter.map((row, i) => ({
        rank: i + 1,
        investor: row.investor,
        roundCount: row.roundCount,
        disclosedCount: row.disclosedCount,
        disclosedTotalUsd: row.disclosedTotalUsd,
        medianDisclosedUsd: row.medianDisclosedUsd,
        largestDisclosedUsd: row.largestDisclosedUsd,
        sectors: row.sectors.join('; '),
        stages: row.stages.join('; '),
        companies: row.companies.join('; '),
      })),
      publicRowLimit: 10,
      note: `Computed over the ${withLead.length} of ${quarterRounds.length} rounds in the quarter that name a lead investor.`,
    },
    {
      id: 'leads-ttm',
      label: 'Lead investors, trailing twelve months',
      description:
        'The same ranking over the four quarters ending with this one — the stabler table, and the one to cite for "most active".',
      columns: [
        { key: 'rank', label: '#', numeric: true },
        { key: 'investor', label: 'Investor' },
        { key: 'roundCount', label: 'Rounds led', numeric: true },
        { key: 'disclosedTotalUsd', label: 'Disclosed total', numeric: true },
        { key: 'medianDisclosedUsd', label: 'Median round', numeric: true },
        { key: 'sectors', label: 'Sectors backed' },
      ],
      rows: leadsTtm.map((row, i) => ({
        rank: i + 1,
        investor: row.investor,
        roundCount: row.roundCount,
        disclosedCount: row.disclosedCount,
        disclosedTotalUsd: row.disclosedTotalUsd,
        medianDisclosedUsd: row.medianDisclosedUsd,
        largestDisclosedUsd: row.largestDisclosedUsd,
        sectors: row.sectors.join('; '),
        stages: row.stages.join('; '),
        companies: row.companies.join('; '),
      })),
      publicRowLimit: 10,
      note: `Computed over the ${ttmWithLead} of ${ttmRounds.length} rounds in the trailing twelve months that name a lead investor.`,
    },
    {
      id: 'participation',
      label: `Investor participation, ${periodLabel('quarterly', period)}`,
      description:
        'Investors ranked by rounds they appear in at all, lead or otherwise. A different question from the lead table, and a weaker denominator.',
      columns: [
        { key: 'rank', label: '#', numeric: true },
        { key: 'investor', label: 'Investor' },
        { key: 'roundCount', label: 'Rounds', numeric: true },
        { key: 'disclosedTotalUsd', label: 'Disclosed round value', numeric: true },
        { key: 'sectors', label: 'Sectors' },
      ],
      rows: participants.map((row, i) => ({
        rank: i + 1,
        investor: row.investor,
        roundCount: row.roundCount,
        disclosedCount: row.disclosedCount,
        disclosedTotalUsd: row.disclosedTotalUsd,
        sectors: row.sectors.join('; '),
        stages: row.stages.join('; '),
        companies: row.companies.join('; '),
      })),
      publicRowLimit: 10,
      note: `Only ${withInvestorList.length} of ${quarterRounds.length} rounds in the quarter carry an investor list. Disclosed round value is the size of the rounds an investor appears in, NOT the amount that investor put in — we do not hold per-investor allocations and will not infer them.`,
    },
    {
      id: 'new-entrants',
      label: 'Leads new to the table',
      description: `Investors who led a round this quarter and led none in the previous ${NEW_ENTRANT_LOOKBACK_QUARTERS} quarters of our records.`,
      columns: [
        { key: 'investor', label: 'Investor' },
        { key: 'roundCount', label: 'Rounds led', numeric: true },
        { key: 'disclosedTotalUsd', label: 'Disclosed total', numeric: true },
        { key: 'companies', label: 'Companies' },
      ],
      rows: newEntrants.map((row) => ({
        investor: row.investor,
        roundCount: row.roundCount,
        disclosedTotalUsd: row.disclosedTotalUsd,
        companies: row.companies.join('; '),
        sectors: row.sectors.join('; '),
      })),
      publicRowLimit: 10,
      note: 'Absence from the lookback window means we recorded no lead credit for that investor, not that the firm was inactive.',
    },
    {
      id: 'rounds',
      label: 'Rounds behind these tables',
      description:
        'Every round recorded in the quarter, largest disclosed first, with its source. This is the row set the tables above are computed from.',
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'company', label: 'Company' },
        { key: 'sector', label: 'Sector' },
        { key: 'stage', label: 'Stage' },
        { key: 'amountUsd', label: 'Amount', numeric: true },
        { key: 'leadInvestor', label: 'Lead' },
        { key: 'source', label: 'Source' },
      ],
      rows: roundRows,
      publicRowLimit: 10,
      note: 'A blank amount means the round is real and its size was never disclosed. Nothing downstream infers one.',
    },
  ];

  return {
    releaseId: RELEASE_ID,
    period,
    periodLabel: periodLabel('quarterly', period),
    title,
    asOf,
    computedAt,
    headline,
    tables,
    coverage: [
      `This edition sees ${quarterRounds.length} rounds recorded for the quarter, of which ${disclosed.length} disclosed an amount. Totals are a floor, not an estimate.`,
      `${withLead.length} of ${quarterRounds.length} rounds name a lead investor (${fmtShare(withLead.length, quarterRounds.length)}). Every lead ranking on this page is computed over that subset only.`,
      `${withInvestorList.length} of ${quarterRounds.length} rounds carry a wider investor list. The participation table is computed over that subset, and it is the weaker of the two attributions.`,
      'Our round coverage is built from regulatory filings, company announcements and cited press coverage. It is not a census of the market, and an investor absent from a table may simply be absent from our records for that quarter.',
      'Sector is taken from the company profile as it stands today, so a company that changed sector is reported under its current one in every quarter.',
      'Every figure on this page is a count, a sum, a median or a ratio over our own rows. Nothing is model-generated, estimated or projected.',
    ],
    inputHash: hashEditionContent(headline, tables),
    empty: false,
  };
}
