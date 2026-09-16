/**
 * SpaceNexus Federal Space Awards - quarterly.
 *
 * WHAT IT ANSWERS
 * ---------------
 * For a space company, the federal government is customer, funder and
 * regulator at once. "Who won federal money, from which agency, and how is
 * that trending" is the question a strategy team, a BD lead and an investor
 * all ask, and nobody packages the answer space-specifically. Payload sells no
 * data at any price; Quilty sells a model at several times ours. What we sell
 * is machine-readable breadth with provenance, and this release is the
 * public, citable face of it.
 *
 * THE DISTINCTION THIS RELEASE IS BUILT AROUND
 * --------------------------------------------
 * Several tracked companies are diversified primes whose federal business is
 * overwhelmingly aircraft, missiles and services. Reporting their whole
 * federal book as "space" would be arithmetically correct and completely
 * misleading. So every dollar figure here is computed over the subset the
 * GOVERNMENT codes as space work (see isSpaceCoded in gov-awards/aggregate.ts,
 * which is set membership over the award's own PSC and NAICS codes), and the
 * all-federal figure is published beside it rather than instead of it.
 *
 * SIX MEASURES, ALL OF THEM COMPUTED
 * ----------------------------------
 *   1. Space-coded obligated dollars and award counts by company, for the
 *      quarter and for the trailing twelve months (the stabler table).
 *   2. Agency mix - NASA against DoD against everyone else. A company whose
 *      federal revenue is one agency's budget line is a different risk from
 *      one selling across four.
 *   3. Award concentration - what share of a company's space money rides on
 *      its single largest award, and the HHI across the whole tracked field.
 *   4. All-federal obligations with each company's space share, so the
 *      difference between a pure-play and a prime is legible.
 *   5. New entrants - companies whose first space-coded award in our records
 *      falls inside this quarter.
 *   6. Federal awards set against private funding, which is the one place this
 *      dataset meets the rest of ours.
 *
 * NO MODEL IS CALLED ANYWHERE IN THIS PATH. Every figure is a count, a sum, a
 * share, a max or an HHI over rows in our own database, each of which carries
 * the usaspending.gov URL it was read from. That is the standing product rule
 * and it is also the only version of this we can honestly sell to an investor.
 *
 * Shape and discipline follow src/lib/research-report-investors.ts exactly.
 */

import prisma from '@/lib/db';
import {
  fmtCount,
  fmtShare,
  fmtUsd,
  hashEditionContent,
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
  concentrationBand,
  hhi,
  isSpaceCoded,
  shortAgency,
  spaceCodedOnly,
  sumAmount,
  topNShare,
  totalsByAgency,
  totalsByCompany,
  type AwardRow,
  type CompanyAwardTotals,
} from '@/lib/gov-awards/aggregate';

const RELEASE_ID = 'federal-space-awards';

/** Quarters an entrant must be absent from our award records to count as new. */
const NEW_ENTRANT_LOOKBACK_QUARTERS = 4;

const SELECT = {
  generatedInternalId: true,
  awardIdPiid: true,
  awardGroup: true,
  awardType: true,
  countsTowardTotals: true,
  companyId: true,
  companySlug: true,
  recipientName: true,
  matchQuality: true,
  matchedName: true,
  amount: true,
  awardingAgency: true,
  awardingSubAgency: true,
  actionDate: true,
  startDate: true,
  endDate: true,
  naicsCode: true,
  naicsDescription: true,
  pscCode: true,
  pscDescription: true,
  cfdaNumber: true,
  cfdaProgramTitle: true,
  description: true,
  sourceUrl: true,
} as const;

type DbAward = {
  generatedInternalId: string;
  awardIdPiid: string;
  awardGroup: string;
  awardType: string | null;
  countsTowardTotals: boolean;
  companyId: string | null;
  companySlug: string | null;
  recipientName: string;
  matchQuality: string | null;
  matchedName: string | null;
  amount: number | null;
  awardingAgency: string;
  awardingSubAgency: string | null;
  actionDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  naicsCode: string | null;
  naicsDescription: string | null;
  pscCode: string | null;
  pscDescription: string | null;
  cfdaNumber: string | null;
  cfdaProgramTitle: string | null;
  description: string | null;
  sourceUrl: string;
};

/**
 * Attach the company's CURRENT display name to each award row.
 *
 * The award record carries the government's spelling of the recipient and the
 * name we matched from; neither is necessarily the name on the company's
 * profile today. Tables key on the profile name so a company appears once, and
 * the government's spelling is printed beside it in the award table so the two
 * can always be compared.
 */
function toAwardRows(rows: DbAward[], names: Map<string, string>): AwardRow[] {
  return rows.map((r) => ({
    generatedInternalId: r.generatedInternalId,
    awardIdPiid: r.awardIdPiid,
    awardGroup: r.awardGroup,
    awardType: r.awardType,
    countsTowardTotals: r.countsTowardTotals,
    companyId: r.companyId,
    companySlug: r.companySlug,
    companyName:
      (r.companyId ? names.get(r.companyId) : null) ?? r.matchedName ?? r.recipientName,
    recipientName: r.recipientName,
    matchQuality: r.matchQuality,
    amount: r.amount,
    awardingAgency: r.awardingAgency,
    awardingSubAgency: r.awardingSubAgency,
    actionDate: r.actionDate,
    startDate: r.startDate,
    endDate: r.endDate,
    naicsCode: r.naicsCode,
    pscCode: r.pscCode,
    cfdaProgramTitle: r.cfdaProgramTitle,
    description: r.description,
    sourceUrl: r.sourceUrl,
  }));
}

function iso(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : '';
}

function pct(share: number | null): number | null {
  return share === null ? null : Math.round(share * 1000) / 10;
}

/** Awards whose base obligation date falls in [start, end), attributed rows only. */
async function awardsBetween(start: Date, end: Date): Promise<DbAward[]> {
  return prisma.federalAward.findMany({
    where: {
      companyId: { not: null },
      OR: [
        { actionDate: { gte: start, lt: end } },
        { actionDate: null, startDate: { gte: start, lt: end } },
      ],
    },
    orderBy: [{ actionDate: 'asc' }, { generatedInternalId: 'asc' }],
    select: SELECT,
  }) as unknown as Promise<DbAward[]>;
}

/**
 * Build one edition.
 *
 * Returns an edition marked `empty` - never a table of zeroes - when no
 * attributed award falls inside the quarter. No awards recorded is a statement
 * about our records, and it must read that way.
 */
export async function buildGovAwardsEdition(period: string): Promise<ResearchReportEdition> {
  const release = getRelease(RELEASE_ID)!;
  const range = periodRange('quarterly', period);
  if (!range) throw new Error(`Invalid quarter: ${period}`);

  // TTM: this quarter plus the three before it.
  const ttmStart = new Date(
    Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth() - 9, 1)
  );
  const priorKey = previousPeriod('quarterly', period);
  const priorRange = priorKey ? periodRange('quarterly', priorKey) : null;

  const [quarterRaw, ttmRaw, priorRaw, everBeforeRaw, coverage, roster] = await Promise.all([
    awardsBetween(range.start, range.end),
    awardsBetween(ttmStart, range.end),
    priorRange
      ? awardsBetween(priorRange.start, priorRange.end)
      : Promise.resolve([] as DbAward[]),
    prisma.federalAward.findMany({
      where: {
        companyId: { not: null },
        OR: [
          { actionDate: { lt: range.start } },
          { actionDate: null, startDate: { lt: range.start } },
        ],
      },
      select: { companyId: true, pscCode: true, naicsCode: true, cfdaProgramTitle: true },
    }),
    prisma.federalAwardCoverage.findMany({
      select: {
        companyId: true,
        companySlug: true,
        companyName: true,
        status: true,
        truncated: true,
        windowStart: true,
        searchedAt: true,
        awardsStored: true,
      },
    }),
    prisma.companyProfile.findMany({ select: { id: true, name: true, sector: true } }),
  ]);

  const names = new Map(roster.map((c) => [c.id, c.name] as const));
  const sectors = new Map(roster.map((c) => [c.id, c.sector ?? ''] as const));
  const quarter = toAwardRows(quarterRaw, names);
  const ttm = toAwardRows(ttmRaw, names);
  const prior = toAwardRows(priorRaw, names);

  // Keyed once: the award table prints the government's own code descriptions,
  // which live on the raw row rather than the aggregation shape.
  const rawById = new Map(quarterRaw.map((r) => [r.generatedInternalId, r] as const));

  const quarterSpace = spaceCodedOnly(quarter);
  const ttmSpace = spaceCodedOnly(ttm);
  const priorSpace = spaceCodedOnly(prior);

  const computedAt = new Date().toISOString();
  const asOf = periodEndDate('quarterly', period)!;
  const title = `${release.title}, ${periodLabel('quarterly', period)}`;

  const searched = coverage.filter((c) => c.status === 'searched');
  const skippedGeneric = coverage.filter((c) => c.status === 'skipped-generic');
  const truncated = coverage.filter((c) => c.truncated);
  const windowStart = coverage.reduce<Date | null>(
    (oldest, c) => (!oldest || c.windowStart < oldest ? c.windowStart : oldest),
    null
  );
  const rosterSize = roster.length;

  const coverageLines = (extra: string[]): string[] => [
    ...extra,
    'Every dollar figure on this page is the SPACE-CODED subset: awards the government itself codes as space work through the award’s own product/service code (space vehicles, space R&D, space transportation and launch) or its industry code (space research and technology, satellite telecommunications). That flag is set membership over two coded fields on the government record — never a keyword search, a judgement of ours, or a model.',
    'The space-coded flag deliberately EXCLUDES the "guided missile and space vehicle manufacturing" industry codes, which conflate tactical missiles with spacecraft. Space work under those codes almost always carries a space product/service code as well, so the loss is small — but it means every space figure here is a conservative floor rather than a ceiling.',
    'The all-federal table is published beside the space tables on purpose. For a diversified prime, the all-federal figure is its ENTIRE government book — aircraft, missiles, ships, services — and is not a statement about its space business.',
    'Prime awards only, and only those we could attribute to a tracked company with high confidence. Subawards are not counted: a company working as a subcontractor on somebody else’s prime contract does not appear here at all.',
    'Amounts are what USAspending reports as OBLIGATED on the award — money actually put on contract — not an announced ceiling or a potential maximum. A ten-year IDIQ worth a headline billion shows up here only as the orders placed against it.',
    'Indefinite-delivery vehicles are stored and listed, but contribute $0 to every dollar figure. Their reported value is the sum of the orders placed under them, and those orders are counted individually, so counting both would count the same money twice.',
    `We searched ${fmtCount(searched.length)} of ${fmtCount(rosterSize)} tracked companies against USAspending${
      skippedGeneric.length > 0
        ? `; ${fmtCount(skippedGeneric.length)} were deliberately not searched by name because their name is too generic to match safely and we hold no Unique Entity ID for them`
        : ''
    }. A company we did not search cannot appear, whatever it won.`,
    'Matching is precision-first and deliberately misses things. A federal arm whose name does not begin with the parent’s name — a joint venture, or a subsidiary trading under an unrelated brand — is not attributed to the parent. Every attributed row records the government’s spelling of the recipient and how the match was made.',
    truncated.length > 0
      ? `${fmtCount(truncated.length)} company(ies) returned more awards than one sweep stores (${truncated
          .map((c) => c.companyName)
          .sort()
          .slice(0, 8)
          .join(', ')}${truncated.length > 8 ? ', and others' : ''}). For those, the largest awards by obligated amount are held and every total is a floor.`
      : 'No company returned more awards than one sweep stores, so no company’s total is truncated.',
    windowStart
      ? `Our award window begins ${iso(windowStart)}. Awards obligated before that date are not in our records, and "first federal award" below means first in OUR records, not first ever.`
      : 'No award window has been recorded yet.',
    'An award is attributed to the quarter its BASE OBLIGATION date falls in — the date the award was originally made. A modification that adds money to an existing award updates that award’s amount in place; it does not appear as new activity in the quarter of the modification. This release therefore measures awards WON in the quarter, not dollars flowing in the quarter, and those are different questions.',
    'Defense contract records reach USAspending on a reporting lag of up to 90 days, so the most recent quarter is systematically incomplete and grows when the edition is recomputed. This edition states the moment it was computed.',
    'Classified and unacknowledged procurement does not appear on USAspending at all. For a company whose federal business is largely classified, the figures here are a floor of unknown depth and should not be read as its federal revenue.',
    'Every figure on this page is a count, a sum, a share, a maximum or a Herfindahl index over our own rows. Nothing is model-generated, estimated or projected, and every row carries the usaspending.gov URL it was read from.',
  ];

  if (quarter.length === 0) {
    return {
      releaseId: RELEASE_ID,
      period,
      periodLabel: periodLabel('quarterly', period),
      title,
      asOf,
      computedAt,
      headline: [],
      tables: [],
      coverage: coverageLines([
        'No federal award attributed to a tracked space company falls inside this quarter in our records. That is a statement about our coverage and our matching rules, not a claim that no space company won federal money.',
      ]),
      inputHash: hashEditionContent([], []),
      empty: true,
      emptyReason: 'No attributed federal awards fall inside this quarter.',
    };
  }

  // --- Totals ---------------------------------------------------------------
  const spaceByCompany = totalsByCompany(quarterSpace);
  const spaceByCompanyTtm = totalsByCompany(ttmSpace);
  const allByCompany = totalsByCompany(quarter);
  const allFederalUsd = new Map(allByCompany.map((c) => [c.companyId, c.obligatedUsd] as const));

  const spaceDollars = sumAmount(quarterSpace);
  const allDollars = sumAmount(quarter);
  const spaceDollarsTtm = sumAmount(ttmSpace);
  const priorSpaceDollars = sumAmount(priorSpace);

  // --- Agency mix, over space-coded awards ---------------------------------
  const spaceByAgency = totalsByAgency(quarterSpace);
  const spaceByAgencyTtm = totalsByAgency(ttmSpace);
  const nasa = spaceByAgency.find((a) => a.shortName === 'NASA');
  const dod = spaceByAgency.find((a) => a.shortName === 'DoD');

  // --- Concentration --------------------------------------------------------
  const fieldHhi = hhi(spaceByCompany.map((c) => c.obligatedUsd));
  const top5 = topNShare(spaceByCompany.map((c) => c.obligatedUsd), 5);

  // --- New entrants: first SPACE-CODED award in our records -----------------
  const seenBefore = new Set(
    everBeforeRaw
      .filter((r) => isSpaceCoded(r))
      .map((r) => r.companyId)
      .filter((id): id is string => Boolean(id))
  );
  const newEntrants = spaceByCompany.filter((c) => !seenBefore.has(c.companyId));

  // --- Federal money against private funding --------------------------------
  const fundingRounds = await prisma.fundingRound.findMany({
    where: { date: { gte: ttmStart, lt: range.end } },
    select: { companyId: true, amount: true },
  });
  const raisedByCompany = new Map<string, { rounds: number; disclosed: number }>();
  for (const r of fundingRounds) {
    if (!r.companyId) continue;
    const bucket = raisedByCompany.get(r.companyId) ?? { rounds: 0, disclosed: 0 };
    bucket.rounds += 1;
    if (typeof r.amount === 'number' && r.amount > 0) bucket.disclosed += r.amount;
    raisedByCompany.set(r.companyId, bucket);
  }
  const bothSides = spaceByCompanyTtm
    .filter((c) => raisedByCompany.has(c.companyId))
    .map((c) => ({
      company: c.companyName,
      companySlug: c.companySlug,
      sector: sectors.get(c.companyId) ?? '',
      spaceObligatedUsd: c.obligatedUsd,
      federalAwards: c.awardCount,
      privateRounds: raisedByCompany.get(c.companyId)!.rounds,
      privateDisclosedUsd: raisedByCompany.get(c.companyId)!.disclosed,
    }))
    .sort(
      (a, b) => b.spaceObligatedUsd - a.spaceObligatedUsd || a.company.localeCompare(b.company)
    );

  // --- Headline -------------------------------------------------------------
  const headline: ReportFigure[] = [
    {
      label: 'Space-coded obligations',
      value: fmtUsd(spaceDollars),
      detail:
        priorKey && priorSpaceDollars > 0
          ? `${fmtUsd(priorSpaceDollars)} in ${periodLabel('quarterly', priorKey)}`
          : 'No comparable prior quarter in our records',
    },
    {
      label: 'Companies winning space work',
      value: fmtCount(spaceByCompany.length),
      detail: `${fmtCount(quarterSpace.length)} space-coded awards of ${fmtCount(quarter.length)} federal awards recorded`,
    },
    {
      label: 'NASA share of space-coded',
      value: nasa ? fmtShare(nasa.obligatedUsd, spaceDollars) : '—',
      detail: dod
        ? `DoD ${fmtShare(dod.obligatedUsd, spaceDollars)}; the rest is every other agency`
        : 'No Department of Defense space award recorded this quarter',
    },
    {
      label: 'Top five share',
      value: top5 === null ? '—' : `${(top5 * 100).toFixed(1)}%`,
      detail:
        fieldHhi === null
          ? 'No measurable concentration'
          : `HHI ${fmtCount(fieldHhi)} across ${fmtCount(spaceByCompany.length)} companies`,
    },
  ];

  // --- Tables ---------------------------------------------------------------
  const spaceColumns = [
    { key: 'rank', label: '#', numeric: true },
    { key: 'company', label: 'Company' },
    { key: 'spaceObligatedUsd', label: 'Space obligated', numeric: true },
    { key: 'awardCount', label: 'Awards', numeric: true },
    { key: 'leadAgency', label: 'Lead agency' },
    { key: 'topAwardSharePct', label: 'Top award share', numeric: true },
    { key: 'concentration', label: 'Concentration' },
  ];

  const spaceRow = (c: CompanyAwardTotals, i: number) => {
    const allFederal = allFederalUsd.get(c.companyId) ?? c.obligatedUsd;
    return {
      rank: i + 1,
      company: c.companyName,
      companySlug: c.companySlug,
      sector: sectors.get(c.companyId) ?? '',
      spaceObligatedUsd: c.obligatedUsd,
      allFederalUsd: allFederal,
      spaceSharePct: allFederal > 0 ? pct(c.obligatedUsd / allFederal) : null,
      awardCount: c.awardCount,
      countedAwards: c.countedAwards,
      largestAwardUsd: c.largestAwardUsd,
      largestAwardId: c.largestAwardId,
      leadAgency: c.leadAgency ? shortAgency(c.leadAgency) : '',
      leadAgencySharePct: pct(c.leadAgencyShare),
      topAwardSharePct: pct(c.topAwardShare),
      concentration: concentrationBand(c.topAwardShare),
      agencies: c.agencies.map(shortAgency).join('; '),
      matchQuality: c.matchQualities.join('; '),
    };
  };

  const tables: ReportTable[] = [
    {
      id: 'companies-quarter',
      label: `Space-coded federal obligations by company, ${periodLabel('quarterly', period)}`,
      description:
        'Tracked companies ranked by the federal dollars obligated to them on awards the government codes as space work, with the agency that gave the most and how much rides on their single largest award.',
      columns: spaceColumns,
      rows: spaceByCompany.map(spaceRow),
      publicRowLimit: 10,
      note: `Computed over ${fmtCount(quarterSpace.length)} space-coded awards of the ${fmtCount(quarter.length)} attributed federal awards recorded in the quarter. Every row also carries its all-federal total and space share in the export.`,
    },
    {
      id: 'companies-ttm',
      label: 'Space-coded federal obligations by company, trailing twelve months',
      description:
        'The same ranking over the four quarters ending with this one. Federal obligations are lumpy — one large award can own a quarter — so this is the stabler table and the one to cite.',
      columns: spaceColumns,
      rows: spaceByCompanyTtm.map(spaceRow),
      publicRowLimit: 10,
      note: `Computed over ${fmtCount(ttmSpace.length)} space-coded awards obligated between ${iso(ttmStart)} and ${asOf}. Trailing-twelve-month dollars: ${fmtUsd(spaceDollarsTtm)}.`,
    },
    {
      id: 'agency-mix',
      label: `Awarding agencies for space work, ${periodLabel('quarterly', period)}`,
      description:
        'Where the space money came from. Agency mix is a risk measure: a company whose federal revenue is one agency’s budget line is exposed to that agency’s appropriation in a way a company selling across four is not.',
      columns: [
        { key: 'rank', label: '#', numeric: true },
        { key: 'agency', label: 'Agency' },
        { key: 'obligatedUsd', label: 'Obligated', numeric: true },
        { key: 'sharePct', label: 'Share of quarter', numeric: true },
        { key: 'awardCount', label: 'Awards', numeric: true },
        { key: 'companies', label: 'Companies', numeric: true },
      ],
      rows: spaceByAgency.map((a, i) => ({
        rank: i + 1,
        agency: a.shortName,
        agencyFullName: a.agency,
        obligatedUsd: a.obligatedUsd,
        sharePct: spaceDollars > 0 ? pct(a.obligatedUsd / spaceDollars) : null,
        awardCount: a.awardCount,
        companies: a.companies,
        subAgencies: a.subAgencies
          .slice(0, 6)
          .map((s) => `${s.name} (${fmtUsd(s.obligatedUsd)})`)
          .join('; '),
      })),
      publicRowLimit: 10,
      note: 'Shares are of the space-coded dollars in this edition, not of the agency’s whole budget. NASA obligated far more to organisations we do not track than to those we do.',
    },
    {
      id: 'agency-mix-ttm',
      label: 'Awarding agencies for space work, trailing twelve months',
      description: 'The same agency split over the four quarters ending with this one.',
      columns: [
        { key: 'rank', label: '#', numeric: true },
        { key: 'agency', label: 'Agency' },
        { key: 'obligatedUsd', label: 'Obligated', numeric: true },
        { key: 'sharePct', label: 'Share of TTM', numeric: true },
        { key: 'awardCount', label: 'Awards', numeric: true },
        { key: 'companies', label: 'Companies', numeric: true },
      ],
      rows: spaceByAgencyTtm.map((a, i) => ({
        rank: i + 1,
        agency: a.shortName,
        agencyFullName: a.agency,
        obligatedUsd: a.obligatedUsd,
        sharePct: spaceDollarsTtm > 0 ? pct(a.obligatedUsd / spaceDollarsTtm) : null,
        awardCount: a.awardCount,
        companies: a.companies,
      })),
      publicRowLimit: 10,
    },
    {
      id: 'all-federal',
      label: `All federal obligations to tracked companies, ${periodLabel('quarterly', period)}`,
      description:
        'The same companies ranked by their ENTIRE federal book, with the share of it the government codes as space. This is the table that separates a pure-play space company from a diversified prime — and the left-hand number is emphatically not a space figure.',
      columns: [
        { key: 'rank', label: '#', numeric: true },
        { key: 'company', label: 'Company' },
        { key: 'allFederalUsd', label: 'All federal', numeric: true },
        { key: 'spaceObligatedUsd', label: 'Of which space-coded', numeric: true },
        { key: 'spaceSharePct', label: 'Space share', numeric: true },
        { key: 'awardCount', label: 'Awards', numeric: true },
      ],
      rows: allByCompany.map((c, i) => ({
        rank: i + 1,
        company: c.companyName,
        companySlug: c.companySlug,
        sector: sectors.get(c.companyId) ?? '',
        allFederalUsd: c.obligatedUsd,
        spaceObligatedUsd: c.spaceObligatedUsd,
        spaceSharePct: pct(c.spaceShare),
        awardCount: c.awardCount,
        spaceAwardCount: c.spaceAwardCount,
        leadAgency: c.leadAgency ? shortAgency(c.leadAgency) : '',
      })),
      publicRowLimit: 10,
      note: 'For a diversified prime this row is aircraft, missiles, ships and services as well as space. It is published so the space figure can be read in context, never as a measure of space business.',
    },
    {
      id: 'new-entrants',
      label: 'Companies winning their first recorded space award',
      description: `Tracked companies with an attributed space-coded award inside this quarter and none in our records before it. Our records begin ${windowStart ? iso(windowStart) : 'when the sweep started'}.`,
      columns: [
        { key: 'company', label: 'Company' },
        { key: 'spaceObligatedUsd', label: 'Space obligated', numeric: true },
        { key: 'awardCount', label: 'Awards', numeric: true },
        { key: 'leadAgency', label: 'Agency' },
      ],
      rows: newEntrants.map((c, i) => spaceRow(c, i)),
      publicRowLimit: 10,
      note: `"First" means first in our records over a window beginning ${windowStart ? iso(windowStart) : 'at the start of the sweep'} — not first ever. A company that last won space work before that window reads as new here, and that is a limit of the window, not a finding. Absence from the previous ${NEW_ENTRANT_LOOKBACK_QUARTERS} quarters alone is not enough: the whole of our history before this quarter is checked.`,
    },
    {
      id: 'federal-and-private',
      label: 'Space awards against private funding, trailing twelve months',
      description:
        'Tracked companies that both won space-coded federal money and raised privately inside the same twelve months. The two columns are different kinds of money and are never added together.',
      columns: [
        { key: 'company', label: 'Company' },
        { key: 'spaceObligatedUsd', label: 'Space obligated', numeric: true },
        { key: 'federalAwards', label: 'Awards', numeric: true },
        { key: 'privateRounds', label: 'Rounds', numeric: true },
        { key: 'privateDisclosedUsd', label: 'Disclosed raised', numeric: true },
      ],
      rows: bothSides,
      publicRowLimit: 10,
      note: 'Federal obligations are revenue the company has to earn by delivering; a funding round is capital it sold equity for. Comparing them says something about a company’s mix of customers and backers and nothing about its profitability. Rounds with an undisclosed amount contribute $0.',
    },
    {
      id: 'awards',
      label: `Awards behind these tables, ${periodLabel('quarterly', period)}`,
      description:
        'Every attributed award obligated inside the quarter, largest first, with the recipient exactly as the government spells it, the code that makes it space work or not, and a link to the award record.',
      columns: [
        { key: 'actionDate', label: 'Obligated' },
        { key: 'company', label: 'Company' },
        { key: 'recipientName', label: 'Recipient on the award' },
        { key: 'amountUsd', label: 'Amount', numeric: true },
        { key: 'spaceCoded', label: 'Space-coded' },
        { key: 'agency', label: 'Agency' },
        { key: 'sourceUrl', label: 'Source' },
      ],
      rows: quarter
        .slice()
        .sort(
          (a, b) =>
            (b.amount ?? -1) - (a.amount ?? -1) ||
            a.awardIdPiid.localeCompare(b.awardIdPiid)
        )
        .map((r) => {
          const db = rawById.get(r.generatedInternalId);
          return {
            actionDate: iso(r.actionDate ?? r.startDate),
            company: r.companyName,
            companySlug: r.companySlug ?? '',
            recipientName: r.recipientName,
            matchQuality: r.matchQuality ?? '',
            awardId: r.awardIdPiid,
            amountUsd: r.amount,
            spaceCoded: isSpaceCoded(r) ? 'yes' : 'no',
            countsTowardTotals: r.countsTowardTotals ? 'yes' : 'no',
            agency: shortAgency(r.awardingAgency),
            agencyFullName: r.awardingAgency,
            subAgency: r.awardingSubAgency ?? '',
            awardType: r.awardType ?? r.awardGroup,
            pscCode: r.pscCode ?? '',
            pscDescription: db?.pscDescription ?? '',
            cfdaNumber: db?.cfdaNumber ?? '',
            cfdaProgramTitle: r.cfdaProgramTitle ?? '',
            naicsCode: r.naicsCode ?? '',
            naicsDescription: db?.naicsDescription ?? '',
            startDate: iso(r.startDate),
            endDate: iso(r.endDate),
            description: r.description ?? '',
            sourceUrl: r.sourceUrl,
          };
        }),
      publicRowLimit: 10,
      note: 'The space-coded column is the government’s own product/service or industry code for the award, not our reading of it; the code and its official description travel with every row in the export. Rows marked "no" under counts-toward-totals are indefinite-delivery vehicles, listed for the contract-vehicle intelligence they carry and excluded from every dollar figure.',
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
    coverage: coverageLines([
      `This edition sees ${fmtCount(quarter.length)} attributed federal awards obligated inside the quarter, of which ${fmtCount(quarterSpace.length)} are coded as space work. Space-coded obligations total ${fmtUsd(spaceDollars)}, against ${fmtUsd(allDollars)} of federal obligations of every kind to the same companies.`,
    ]),
    inputHash: hashEditionContent(headline, tables),
    empty: false,
  };
}
