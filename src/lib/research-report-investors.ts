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
 * WHAT COUNTS AS SPACE FUNDING (added 2026-09)
 * --------------------------------------------
 * This release's Q2 2026 edition headlined "DISCLOSED CAPITAL $84.9B" for one
 * quarter of space funding, roughly ten times the real market. It was summing
 * the amount column of every transaction we hold for a company in the space
 * database, and inside that sum sat a $75.0B SpaceX IPO, a $416M HawkEye 360
 * IPO, three registered directs and PIPEs into listed companies, and a $5.0B
 * Anduril round — a defence-autonomy company, not a space one. The trailing-
 * twelve-month table put Fidelity at the top on the strength of a $10.0B
 * SpaceX TENDER OFFER, which is existing shares changing hands.
 *
 * The federal-awards release solved the same problem correctly: it reports
 * only the subset the government itself codes as space and says so on the
 * page. src/lib/funding/space-classification.ts does the equivalent here, and
 * its rule is printed verbatim in this edition's coverage block. Nothing is
 * deleted — every excluded transaction is published in its own table with the
 * rule that excluded it.
 *
 * WHO LED THE ROUND (added 2026-09)
 * ---------------------------------
 * `leadInvestor` is one free-text column and our sources write a jointly-led
 * round as "Eclipse / Riot Ventures". Ranked as written, every co-lead credit
 * was lost and the most active investor in the quarter had two rounds.
 * src/lib/funding/investor-names.ts splits those strings — on " / " and
 * nothing else, because an ampersand or a comma can sit inside a real firm
 * name — and merges the handful of variant spellings our own data carries.
 * Every string it changed is published in an audit table so a wrong split is
 * visible rather than buried in an aggregate.
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
import {
  SPACE_VENTURE_RULE,
  classifyInstrument,
  exclusionReason,
  qualifiesAsSpaceVenture,
  spaceAttribution,
} from '@/lib/funding/space-classification';
import {
  investorNameAudit,
  splitInvestorString,
} from '@/lib/funding/investor-names';

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
  company: {
    slug: string;
    name: string;
    sector: string | null;
    subsector: string | null;
    isPublic: boolean | null;
  } | null;
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
  // sector/subsector/isPublic are what the space-venture rule reads. They are
  // selected here rather than fetched later so the classification can never be
  // computed against a different row set than the one that is published.
  company: {
    select: { slug: true, name: true, sector: true, subsector: true, isPublic: true },
  },
} as const;

/**
 * Every investor a set of recorded strings names, normalised and de-duplicated
 * within the round. One round never credits the same firm twice, however many
 * spellings of it the row carries.
 */
function cleanNames(values: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    for (const name of splitInvestorString(v)) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(name);
    }
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
      select: SELECT,
    }),
    priorRange
      ? prisma.fundingRound.findMany({
          where: { date: { gte: priorRange.start, lt: priorRange.end } },
          select: SELECT,
        })
      : Promise.resolve([] as RoundRow[]),
  ])) as [RoundRow[], RoundRow[], RoundRow[], RoundRow[]];

  const computedAt = new Date().toISOString();
  const asOf = periodEndDate('quarterly', period)!;
  const title = `${release.title}, ${periodLabel('quarterly', period)}`;

  // --- The rule, applied before anything is counted ------------------------
  // Every table, every total and every ranking below is computed over
  // `counted`. `excluded` is not thrown away: it is published as its own
  // table, each row carrying the reason the rule refused it.
  const counted = quarterRounds.filter((r) => qualifiesAsSpaceVenture(r));
  const excluded = quarterRounds.filter((r) => !qualifiesAsSpaceVenture(r));
  const ttmCounted = ttmRounds.filter((r) => qualifiesAsSpaceVenture(r));
  const excludedTotal = excluded.reduce((s, r) => s + (r.amount ?? 0), 0);

  // An empty edition says what KIND of empty it is. "We recorded nothing" and
  // "we recorded transactions but none of them were space funding rounds" are
  // different statements and a reader is entitled to which one applies.
  if (counted.length === 0) {
    const reason =
      quarterRounds.length === 0
        ? 'No funding rounds are recorded for this quarter.'
        : `${quarterRounds.length} transactions are recorded for this quarter but none of them is a private space funding round under the rule below.`;
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
        quarterRounds.length === 0
          ? 'No funding rounds are recorded in our database for this quarter. That is a statement about our coverage, not a claim that no rounds happened.'
          : `${quarterRounds.length} transactions are recorded against tracked companies in this quarter, and every one of them is excluded by the rule below — they are IPOs, secondaries, debt, grants, or rounds into companies our records do not classify as space. That is a statement about what we recorded, not a claim that no space rounds happened.`,
        ...SPACE_VENTURE_RULE,
      ],
      inputHash: hashEditionContent([], []),
      empty: true,
      emptyReason: reason,
    };
  }

  // --- Denominators, computed before anything is ranked --------------------
  const withLead = counted.filter((r) => splitInvestorString(r.leadInvestor).length > 0);
  const withInvestorList = counted.filter((r) => cleanNames(r.investors).length > 0);
  const disclosed = counted.filter((r) => typeof r.amount === 'number' && r.amount > 0);
  const disclosedTotal = disclosed.reduce((s, r) => s + (r.amount ?? 0), 0);

  // --- Table 1: leads, this quarter ---------------------------------------
  // A jointly-led round credits BOTH co-leads with one round led. That is the
  // point of the split, and it means the disclosed-total column sums to more
  // than the quarter's capital. The table note says so.
  const leadMap = new Map<string, InvestorBucket>();
  for (const r of counted) {
    for (const name of splitInvestorString(r.leadInvestor)) addRound(bucketFor(leadMap, name), r);
  }
  const leadsThisQuarter = rankBuckets(leadMap);

  // --- Table 2: leads, trailing twelve months ------------------------------
  const ttmMap = new Map<string, InvestorBucket>();
  let ttmWithLead = 0;
  for (const r of ttmCounted) {
    const names = splitInvestorString(r.leadInvestor);
    if (names.length === 0) continue;
    ttmWithLead += 1;
    for (const name of names) addRound(bucketFor(ttmMap, name), r);
  }
  const leadsTtm = rankBuckets(ttmMap);

  // --- Table 3: participation ----------------------------------------------
  const participationMap = new Map<string, InvestorBucket>();
  for (const r of counted) {
    for (const name of cleanNames(r.investors)) {
      addRound(bucketFor(participationMap, name), r);
    }
  }
  const participants = rankBuckets(participationMap);

  // --- Table 4: new to the table -------------------------------------------
  // The lookback is scoped by the same rule: an investor whose only earlier
  // credit was on a round this release does not count is genuinely new to
  // THIS table, and saying otherwise would be a different kind of lie.
  const seenBefore = new Set(
    lookbackRounds
      .filter((r) => qualifiesAsSpaceVenture(r))
      .flatMap((r) => splitInvestorString(r.leadInvestor))
      .map((n) => n.toLowerCase())
  );
  const newEntrants = leadsThisQuarter.filter(
    (row) => !seenBefore.has(row.investor.toLowerCase())
  );

  // --- Table 5: the rounds behind the tables -------------------------------
  const roundRows = counted
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
      leadInvestor: splitInvestorString(r.leadInvestor).join('; '),
      leadInvestorAsRecorded: (r.leadInvestor ?? '').trim(),
      otherInvestors: cleanNames(r.investors).join('; '),
      source: r.source ?? '',
      sourceUrl: r.sourceUrl ?? '',
    }));

  // --- Table 6: what the rule left out -------------------------------------
  const exclusionRows = excluded
    .slice()
    .sort((a, b) => (b.amount ?? -1) - (a.amount ?? -1) || a.date.getTime() - b.date.getTime())
    .map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      company: r.company?.name ?? '',
      companySlug: r.company?.slug ?? '',
      sector: r.company?.sector ?? '',
      subsector: r.company?.subsector ?? '',
      stage: r.seriesLabel ?? r.roundType ?? '',
      amountUsd: typeof r.amount === 'number' && r.amount > 0 ? r.amount : null,
      instrument: classifyInstrument(r),
      recipient: spaceAttribution(r.company),
      reason: exclusionReason(r) ?? '',
      source: r.source ?? '',
      sourceUrl: r.sourceUrl ?? '',
    }));

  // --- Table 7: every investor string this edition rewrote ------------------
  const nameAudit = investorNameAudit([
    ...ttmRounds.map((r) => r.leadInvestor),
    ...ttmRounds.flatMap((r) => r.investors),
  ]);

  const priorLeadCount = new Set(
    priorRounds
      .filter((r) => qualifiesAsSpaceVenture(r))
      .flatMap((r) => splitInvestorString(r.leadInvestor))
      .map((n) => n.toLowerCase())
  ).size;

  const headline: ReportFigure[] = [
    {
      label: 'Space rounds counted',
      value: fmtCount(counted.length),
      detail: `${fmtCount(excluded.length)} of ${fmtCount(quarterRounds.length)} recorded transactions fall outside the rule and are listed below`,
    },
    {
      label: 'Disclosed capital',
      value: fmtUsd(disclosedTotal),
      detail: `A floor: undisclosed rounds contribute nothing. A further ${fmtUsd(excludedTotal)} of recorded transactions — IPOs, secondaries, debt, grants and non-space recipients — is excluded by the rule, not hidden.`,
    },
    {
      label: 'Rounds naming a lead',
      value: `${fmtCount(withLead.length)} of ${fmtCount(counted.length)}`,
      detail: `${fmtShare(withLead.length, counted.length)} — the ranking below sees only these`,
    },
    {
      label: 'Distinct lead investors',
      value: fmtCount(leadsThisQuarter.length),
      detail:
        priorKey && priorLeadCount > 0
          ? `${fmtCount(priorLeadCount)} in ${periodLabel('quarterly', priorKey)}. Co-led rounds credit every co-lead.`
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
      note: `Computed over the ${withLead.length} of ${counted.length} counted space rounds in the quarter that name a lead investor. A jointly-led round credits every co-lead with one round led, so the disclosed-total column sums to more than the quarter’s capital — it is a per-investor figure, not a share of the market.`,
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
      note: `Computed over the ${ttmWithLead} of ${ttmCounted.length} counted space rounds in the trailing twelve months that name a lead investor (${ttmRounds.length} transactions were recorded in the window before the rule was applied). Co-leads are credited individually.`,
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
      note: `Only ${withInvestorList.length} of ${counted.length} counted space rounds in the quarter carry an investor list. Disclosed round value is the size of the rounds an investor appears in, NOT the amount that investor put in — we do not hold per-investor allocations and will not infer them.`,
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
        'Every round the rule counts, largest disclosed first, with its source. This is the row set the tables above are computed from. What the rule left out is in the next table, not missing.',
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
      note: 'A blank amount means the round is real and its size was never disclosed. Nothing downstream infers one. The Lead column is the recorded string split into its co-leads; the string exactly as stored travels in the export as leadInvestorAsRecorded.',
    },
    {
      id: 'exclusions',
      label: 'Transactions the rule excludes',
      description:
        'Every transaction recorded against a tracked company in the quarter that does NOT reach the capital figure, with the reason. Published so the headline can be checked rather than trusted.',
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'company', label: 'Company' },
        { key: 'stage', label: 'Stage' },
        { key: 'amountUsd', label: 'Amount', numeric: true },
        { key: 'instrument', label: 'Instrument' },
        { key: 'reason', label: 'Why it is excluded' },
      ],
      rows: exclusionRows,
      publicRowLimit: 10,
      note: `${fmtCount(excluded.length)} of ${fmtCount(quarterRounds.length)} recorded transactions, ${fmtUsd(excludedTotal)} in disclosed value. Nothing here has been deleted or altered in the database — these rows are excluded from ONE figure, and they are printed so the exclusion is checkable.`,
    },
    {
      id: 'investor-name-normalisation',
      label: 'Investor strings this edition rewrote',
      description:
        'Our sources record a jointly-led round as one free-text string. Every string this edition split or renamed is listed here with what it became, over the whole trailing-twelve-month window, so a wrong split is visible rather than buried in an aggregate.',
      columns: [
        { key: 'recorded', label: 'As recorded' },
        { key: 'resolved', label: 'Read as' },
        { key: 'action', label: 'Rule applied' },
        { key: 'occurrences', label: 'Rows', numeric: true },
      ],
      rows: nameAudit.map((row) => ({ ...row })),
      publicRowLimit: 10,
      note: 'Split only on a slash with whitespace on both sides. Ampersands and commas are deliberately left alone, because "Kongsberg Defence & Aerospace", "Mitsui & Co." and "ESA European Launcher Challenge (Germany, UK)" are single names — so a co-lead pair joined by an ampersand is under-credited rather than wrongly split. Strings that passed through unchanged are not listed.',
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
      ...SPACE_VENTURE_RULE,
      `APPLIED TO THIS QUARTER. ${quarterRounds.length} transactions are recorded against tracked companies, ${counted.length} of them pass the rule and ${excluded.length} do not. The ${excluded.length} excluded carry ${fmtUsd(excludedTotal)} of disclosed value, and every one of them is printed in the exclusions table above with the reason it was refused.`,
      `Of the ${counted.length} counted rounds, ${disclosed.length} disclosed an amount. Totals are a floor, not an estimate.`,
      `${withLead.length} of ${counted.length} counted rounds name a lead investor (${fmtShare(withLead.length, counted.length)}). Every lead ranking on this page is computed over that subset only.`,
      `${withInvestorList.length} of ${counted.length} counted rounds carry a wider investor list. The participation table is computed over that subset, and it is the weaker of the two attributions.`,
      'HOW CO-LED ROUNDS ARE READ. Our sources record a jointly-led round as one free-text string, such as "Eclipse / Riot Ventures". We split those on a slash with whitespace on both sides, and on nothing else, because an ampersand or a comma can sit inside a real firm name; each co-lead is then credited with one round led. A short list of variant spellings that both appear in our own data is merged to one name. Every string that was split or renamed is listed in the normalisation table above. One consequence to keep in mind: a round led by two firms appears in full under both, so the disclosed-total column of a ranking sums to more than the quarter did.',
      'Our round coverage is built from regulatory filings, company announcements and cited press coverage. It is not a census of the market, and an investor absent from a table may simply be absent from our records for that quarter.',
      'Sector is taken from the company profile as it stands today, so a company that changed sector is reported under its current one in every quarter. The space test above is therefore applied using the classification as it stands today.',
      'Every figure on this page is a count, a sum, a median or a ratio over our own rows. Nothing is model-generated, estimated or projected.',
    ],
    inputHash: hashEditionContent(headline, tables),
    empty: false,
  };
}
