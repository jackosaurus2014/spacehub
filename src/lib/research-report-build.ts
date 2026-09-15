/**
 * One entry point for every recurring release edition.
 *
 * The edition page, the gated row export and the publication cron all call
 * buildReleaseEdition() and nothing else. Three of the five franchises have
 * their own computation module; the other two — the Hiring Index and the Space
 * Score Top 25 — already have well-established public pages, so they are
 * ADAPTED into the common edition shape here rather than rebuilt. That is
 * deliberate: duplicating a page that already states its own methodology would
 * give us two surfaces that can disagree, which is the failure
 * src/lib/vehicle-status.ts exists to prevent.
 *
 * No model is called anywhere below. Every figure is arithmetic over our rows.
 */

import { getHiringIndex, monthLabelOf, parseMonthParam } from '@/lib/hiring-index';
import { getSpaceScoreEdition, SPACE_SCORE_TOP_N } from '@/lib/rankings-data';
import { getCompanyScore } from '@/lib/space-score';
import { buildInvestorsEdition } from '@/lib/research-report-investors';
import { buildLaunchCadenceEdition } from '@/lib/research-report-launch';
import { buildSupplyChainEdition } from '@/lib/research-report-supply-chain';
import {
  getRelease,
  isPublishedPeriod,
  periodEndDate,
  periodLabel,
  type ResearchRelease,
} from '@/lib/research-releases';
import {
  fmtCount,
  fmtSigned,
  hashEditionContent,
  type ReportFigure,
  type ReportTable,
  type ResearchReportEdition,
} from '@/lib/research-report-types';

// ---------------------------------------------------------------------------
// Adapter: the Hiring Index
// ---------------------------------------------------------------------------

async function buildHiringEdition(
  release: ResearchRelease,
  period: string
): Promise<ResearchReportEdition> {
  const parsed = parseMonthParam(period);
  if (!parsed) throw new Error(`Invalid month: ${period}`);
  const index = await getHiringIndex(parsed.year, parsed.month);
  const asOf = periodEndDate('monthly', period)!;
  const computedAt = new Date().toISOString();
  const title = `${release.title}, ${monthLabelOf(parsed.year, parsed.month)}`;

  if (!index) {
    return {
      releaseId: release.id,
      period,
      periodLabel: periodLabel('monthly', period),
      title,
      asOf,
      computedAt,
      headline: [],
      tables: [],
      coverage: [
        'No hiring snapshots exist for this month. Snapshot history begins in August 2026 and cannot be backfilled.',
      ],
      inputHash: hashEditionContent([], []),
      empty: true,
      emptyReason: 'No hiring snapshots exist for this month.',
    };
  }

  const monthEnd = index.activeAtMonthEnd ?? index.activeNow;
  const headline: ReportFigure[] = [
    {
      label: 'Open roles at month end',
      value: fmtCount(monthEnd),
      detail: index.activeAtMonthEndDate
        ? `Last snapshot ${index.activeAtMonthEndDate}`
        : 'No month-end snapshot; live count shown',
    },
    {
      label: 'Month-over-month',
      value: index.momChange === null ? '—' : fmtSigned(index.momChange),
      detail:
        index.momChange === null
          ? 'No prior month in our snapshot history'
          : `Against ${fmtCount(index.priorActiveAtMonthEnd)} the month before`,
    },
    {
      label: 'New postings in the month',
      value: fmtCount(index.newPostings.total),
      detail: `${index.newPostings.byCategory.length} functions represented`,
    },
    {
      label: 'Remote share',
      value:
        index.remoteShare.percent === null ? '—' : `${index.remoteShare.percent.toFixed(1)}%`,
      detail: `${fmtCount(index.remoteShare.remote)} of ${fmtCount(index.remoteShare.total)} active postings`,
    },
  ];

  const tables: ReportTable[] = [
    {
      id: 'top-employers',
      label: 'Employers by open roles at month end',
      description:
        'Each company’s open-role count at its last snapshot inside the month.',
      columns: [
        { key: 'rank', label: '#', numeric: true },
        { key: 'company', label: 'Company' },
        { key: 'activeJobs', label: 'Open roles', numeric: true },
        { key: 'snapshotDate', label: 'Snapshot' },
      ],
      rows: index.topCompanies.map((c, i) => ({
        rank: i + 1,
        company: c.companyName,
        slug: c.slug ?? '',
        activeJobs: c.activeJobs,
        snapshotDate: c.snapshotDate,
      })),
      publicRowLimit: 10,
    },
    {
      id: 'gainers',
      label: 'Employers that added the most roles',
      description:
        'First versus last snapshot inside the month — net roles, not gross postings.',
      columns: [
        { key: 'rank', label: '#', numeric: true },
        { key: 'company', label: 'Company' },
        { key: 'change', label: 'Net roles', numeric: true },
        { key: 'first', label: 'Start', numeric: true },
        { key: 'last', label: 'End', numeric: true },
        { key: 'percentChange', label: 'Change', numeric: true },
      ],
      rows: index.movers.gainers.map((m, i) => ({
        rank: i + 1,
        company: m.companyName,
        slug: m.slug ?? '',
        change: m.change,
        first: m.first,
        last: m.last,
        percentChange: m.percentChange,
        firstDate: m.firstDate,
        lastDate: m.lastDate,
      })),
      publicRowLimit: 10,
    },
    {
      id: 'decliners',
      label: 'Employers that shed the most roles',
      description: 'The same comparison, in the other direction.',
      columns: [
        { key: 'rank', label: '#', numeric: true },
        { key: 'company', label: 'Company' },
        { key: 'change', label: 'Net roles', numeric: true },
        { key: 'first', label: 'Start', numeric: true },
        { key: 'last', label: 'End', numeric: true },
        { key: 'percentChange', label: 'Change', numeric: true },
      ],
      rows: index.movers.decliners.map((m, i) => ({
        rank: i + 1,
        company: m.companyName,
        slug: m.slug ?? '',
        change: m.change,
        first: m.first,
        last: m.last,
        percentChange: m.percentChange,
        firstDate: m.firstDate,
        lastDate: m.lastDate,
      })),
      publicRowLimit: 10,
    },
    {
      id: 'by-function',
      label: 'New postings by function',
      description: 'Postings first seen inside the month, by recorded category.',
      columns: [
        { key: 'key', label: 'Function' },
        { key: 'count', label: 'Postings', numeric: true },
      ],
      rows: index.newPostings.byCategory.map((c) => ({ key: c.key, count: c.count })),
      publicRowLimit: 10,
    },
    {
      id: 'by-seniority',
      label: 'New postings by seniority',
      description: 'The same postings, by recorded seniority level.',
      columns: [
        { key: 'key', label: 'Seniority' },
        { key: 'count', label: 'Postings', numeric: true },
      ],
      rows: index.newPostings.bySeniority.map((c) => ({ key: c.key, count: c.count })),
      publicRowLimit: 10,
    },
    {
      id: 'locations',
      label: 'Leading hiring locations',
      description:
        'Active postings by normalised location. Remote-only postings are reported separately and are not double-counted here.',
      columns: [
        { key: 'location', label: 'Location' },
        { key: 'count', label: 'Postings', numeric: true },
      ],
      rows: index.topLocations.map((l) => ({ location: l.location, count: l.count })),
      publicRowLimit: 10,
    },
  ];

  return {
    releaseId: release.id,
    period,
    periodLabel: periodLabel('monthly', period),
    title,
    asOf,
    computedAt,
    headline,
    tables,
    coverage: [
      'Built from a daily snapshot of live postings across tracked space-company applicant-tracking systems.',
      index.activeAtMonthEndDate
        ? `The month-end figure is the site-wide snapshot of ${index.activeAtMonthEndDate}, the last on or before month end.`
        : 'No site-wide snapshot exists on or before this month end, so the live count is shown in its place and labelled as such.',
      index.momChange === null
        ? 'No prior month exists in our snapshot history, so no month-over-month change is reported. A zero here would be a fabrication.'
        : `Month-over-month compares against ${index.priorActiveAtMonthEnd} roles at the previous month end.`,
      'Movers compare a company’s first and last snapshot inside the month. A company that opened and filled ten roles inside the month shows no growth, by design.',
      'When a company’s board newly joins the tracker inside a month, its first snapshot is the day we started watching it, so its apparent growth is coverage rather than hiring.',
      'Coverage is the companies whose boards we track. A company we do not track contributes nothing to any figure here.',
    ],
    inputHash: hashEditionContent(headline, tables),
    empty: false,
  };
}

// ---------------------------------------------------------------------------
// Adapter: the Space Score Top 25
// ---------------------------------------------------------------------------

async function buildSpaceScoreEdition(
  release: ResearchRelease,
  period: string
): Promise<ResearchReportEdition> {
  const edition = await getSpaceScoreEdition(period);
  const asOf = periodEndDate('quarterly', period)!;
  const computedAt = new Date().toISOString();
  const title = `${release.title}, ${periodLabel('quarterly', period)}`;

  if (!edition) {
    return {
      releaseId: release.id,
      period,
      periodLabel: periodLabel('quarterly', period),
      title,
      asOf,
      computedAt,
      headline: [],
      tables: [],
      coverage: ['No Space Score edition exists for this quarter.'],
      inputHash: hashEditionContent([], []),
      empty: true,
      emptyReason: 'No Space Score edition exists for this quarter.',
    };
  }

  const PILLARS = [
    'Innovation',
    'Financial Health',
    'Market Position',
    'Operational Capacity',
    'Growth Trajectory',
  ];

  const rows = edition.rows.map((r) => {
    const detail = r.entry.slug ? getCompanyScore(r.entry.slug) : null;
    const pillars: Record<string, number | null> = {};
    for (const name of PILLARS) {
      const dim = detail?.score.breakdown.find((d) => d.name === name);
      pillars[name] = dim ? dim.score : null;
    }
    return {
      rank: r.rank,
      company: r.entry.name,
      slug: r.entry.slug ?? '',
      sector: r.entry.sector ?? '',
      total: r.entry.total,
      tier: r.entry.tierLabel,
      previousRank: r.previousRank,
      rankChange: r.delta,
      innovation: pillars['Innovation'],
      financialHealth: pillars['Financial Health'],
      marketPosition: pillars['Market Position'],
      operationalCapacity: pillars['Operational Capacity'],
      growthTrajectory: pillars['Growth Trajectory'],
    };
  });

  const sectorCounts = new Map<string, number>();
  for (const r of rows) {
    const sector = r.sector || 'Unclassified';
    sectorCounts.set(sector, (sectorCounts.get(sector) ?? 0) + 1);
  }

  const totals = rows.map((r) => r.total);
  const headline: ReportFigure[] = [
    {
      label: 'Companies ranked',
      value: fmtCount(rows.length),
      detail: `From a scored pool of ${fmtCount(edition.poolSize)}`,
    },
    {
      label: 'Top score',
      value: totals.length ? fmtCount(Math.max(...totals)) : '—',
      detail: rows[0] ? rows[0].company : undefined,
    },
    {
      label: 'Entry score',
      value: totals.length ? fmtCount(Math.min(...totals)) : '—',
      detail: `Lowest score inside the top ${SPACE_SCORE_TOP_N}`,
    },
    {
      label: 'Rank movement',
      value: edition.hasPrevious ? 'Measured' : 'First edition',
      detail: edition.hasPrevious
        ? `Against the ${edition.previousEdition} edition`
        : 'No previous edition exists, so no movement is shown',
    },
  ];

  const tables: ReportTable[] = [
    {
      id: 'top-25',
      label: `Space Score Top ${SPACE_SCORE_TOP_N}`,
      description:
        'The highest total scores in the tracked roster, with each company’s five pillar sub-scores out of 200.',
      columns: [
        { key: 'rank', label: '#', numeric: true },
        { key: 'company', label: 'Company' },
        { key: 'sector', label: 'Sector' },
        { key: 'total', label: 'Score', numeric: true },
        { key: 'tier', label: 'Tier' },
        { key: 'rankChange', label: 'Movement', numeric: true },
      ],
      rows,
      publicRowLimit: 10,
      note: edition.reconstructed
        ? 'No archived ordering existed for this closed quarter, so the table was reconstructed from the current score data. It is not a contemporaneous record and is labelled as such on the ranking page.'
        : undefined,
    },
    {
      id: 'sectors',
      label: 'Sector distribution',
      description: `How the top ${SPACE_SCORE_TOP_N} splits by sector.`,
      columns: [
        { key: 'sector', label: 'Sector' },
        { key: 'companies', label: 'Companies', numeric: true },
        { key: 'sharePercent', label: 'Share of table', numeric: true },
      ],
      rows: Array.from(sectorCounts.entries())
        .map(([sector, companies]) => ({
          sector,
          companies,
          sharePercent: Math.round((companies / Math.max(1, rows.length)) * 1000) / 10,
        }))
        .sort((a, b) => b.companies - a.companies || a.sector.localeCompare(b.sector)),
      publicRowLimit: 10,
    },
  ];

  return {
    releaseId: release.id,
    period,
    periodLabel: periodLabel('quarterly', period),
    title,
    asOf,
    computedAt,
    headline,
    tables,
    coverage: [
      `Ranked from a hand-maintained roster of ${edition.poolSize} scored companies. A company outside that roster cannot appear, however large it is.`,
      'Private companies are scored on disclosed figures only, so the score measures the evidence available rather than management quality.',
      edition.hasPrevious
        ? `Rank movement is measured against the stored ordering of the ${edition.previousEdition} edition, never against a re-derivation of today’s table.`
        : 'No previous edition exists, so every movement column is empty. A first edition that painted every row green would be inventing movement.',
      edition.scoresUpdatedAt
        ? `The underlying score table was last revised ${edition.scoresUpdatedAt}.`
        : 'The underlying score table carries no revision date.',
      'This is not investment advice. The Space Score is a descriptive composite, not a forecast or a recommendation.',
    ],
    inputHash: hashEditionContent(headline, tables),
    empty: rows.length === 0,
    emptyReason: rows.length === 0 ? 'No companies are scored for this quarter.' : undefined,
  };
}

// ---------------------------------------------------------------------------
// The dispatcher
// ---------------------------------------------------------------------------

export class UnknownReleaseError extends Error {}
export class UnpublishedPeriodError extends Error {}

/**
 * Build one edition.
 *
 * Throws UnknownReleaseError for an id that is not on the calendar and
 * UnpublishedPeriodError for a period the release does not publish — including
 * a period that has not finished. A half-finished quarter served as though it
 * were done is the fastest way to lose a research customer, so the refusal is
 * explicit rather than a quietly truncated edition.
 */
export async function buildReleaseEdition(
  releaseId: string,
  period: string,
  now: Date = new Date()
): Promise<ResearchReportEdition> {
  const release = getRelease(releaseId);
  if (!release) throw new UnknownReleaseError(`Unknown release: ${releaseId}`);
  if (!isPublishedPeriod(release, period, now)) {
    throw new UnpublishedPeriodError(
      `${release.title} does not publish an edition for ${period}.`
    );
  }

  switch (release.id) {
    case 'most-active-investors':
      return buildInvestorsEdition(period);
    case 'launch-cadence':
      return buildLaunchCadenceEdition(period);
    case 'supply-chain-concentration':
      return buildSupplyChainEdition(period);
    case 'hiring-index':
      return buildHiringEdition(release, period);
    case 'space-score-top-25':
      return buildSpaceScoreEdition(release, period);
    default:
      throw new UnknownReleaseError(`No builder registered for ${release.id}`);
  }
}
