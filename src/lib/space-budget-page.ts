import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';

// /space-budget — server-rendered view of the curated US civil + national
// security space budget tables (SpaceBudgetItem) and the congressional
// calendar (CongressionalActivity). Both tables are hand-curated seed data
// refreshed each budget cycle (≈30 + ≈17 rows from /api/procurement/init,
// FY2026 PBR), so every number here is a real row and asOf is the newest
// createdAt in either table — never a render-time timestamp dressed up as
// freshness. Amounts are USD millions, as stored.

export interface AgencyYearRow {
  agency: string;
  fiscalYear: number;
  lineItems: number;
  totalRequest: number | null;
  totalEnacted: number | null;
  totalPreviousYear: number | null;
  /** Request vs prior-year, percent; null when either side is missing or prior is 0. */
  requestVsPriorPct: number | null;
  /** Enacted vs request, percent; null unless both are numeric. */
  enactedVsRequestPct: number | null;
}

export interface ProgramRow {
  agency: string;
  fiscalYear: number;
  category: string;
  program: string | null;
  requestAmount: number | null;
  enactedAmount: number | null;
  previousYear: number | null;
  changePercent: number | null;
  notes: string | null;
  source: string | null;
}

export interface CongressRow {
  id: string;
  type: string;
  committee: string;
  subcommittee: string | null;
  title: string;
  date: string | null; // ISO
  status: string | null;
  billNumber: string | null;
  sourceUrl: string | null;
}

export interface SpaceBudgetPageData {
  /** Newest createdAt across both curated tables (ISO), null if both are empty. */
  asOf: string | null;
  latestFiscalYear: number | null;
  budgetRowCount: number;
  congressRowCount: number;
  agencies: AgencyYearRow[];
  programs: ProgramRow[];
  congress: CongressRow[];
  /** Latest-FY NASA request across tracked line items, USD millions. */
  nasaRequest: number | null;
  nasaLineItems: number;
  /** Latest-FY Space Force request across tracked line items, USD millions, plus its category split. */
  spaceForceRequest: number | null;
  spaceForceCategories: { category: string; request: number }[];
  /** The tracked line with the largest enacted-vs-request gap (both numeric), for the FAQ. */
  requestEnactedExample: ProgramRow | null;
}

export const PROGRAM_TABLE_SIZE = 20;

function pct(numerator: number | null, denominator: number | null): number | null {
  if (numerator == null || denominator == null || denominator === 0) return null;
  return Math.round(((numerator - denominator) / denominator) * 1000) / 10;
}

export const getSpaceBudgetPageData = unstable_cache(async (): Promise<SpaceBudgetPageData | null> => {
  try {
    const [items, aggregates, congress, budgetMax, congressMax] = await Promise.all([
      prisma.spaceBudgetItem.findMany({
        orderBy: [{ fiscalYear: 'desc' }, { agency: 'asc' }, { category: 'asc' }],
        select: {
          agency: true, fiscalYear: true, category: true, program: true,
          requestAmount: true, enactedAmount: true, previousYear: true, changePercent: true,
          notes: true, source: true,
        },
      }),
      // Same aggregate shape as /api/procurement/budget.
      prisma.spaceBudgetItem.groupBy({
        by: ['agency', 'fiscalYear'],
        _sum: { requestAmount: true, enactedAmount: true, previousYear: true },
        _count: { _all: true },
      }),
      prisma.congressionalActivity.findMany({
        orderBy: [{ date: { sort: 'desc', nulls: 'last' } }],
        select: {
          id: true, type: true, committee: true, subcommittee: true, title: true,
          date: true, status: true, billNumber: true, sourceUrl: true,
        },
      }),
      prisma.spaceBudgetItem.aggregate({ _max: { createdAt: true } }),
      prisma.congressionalActivity.aggregate({ _max: { createdAt: true } }),
    ]);

    const stamps = [budgetMax._max.createdAt, congressMax._max.createdAt].filter((d): d is Date => d instanceof Date);
    const asOf = stamps.length ? new Date(Math.max(...stamps.map(d => d.getTime()))).toISOString() : null;
    const latestFiscalYear = items.length ? Math.max(...items.map(i => i.fiscalYear)) : null;

    const agencies: AgencyYearRow[] = aggregates
      .map(a => ({
        agency: a.agency,
        fiscalYear: a.fiscalYear,
        lineItems: a._count._all,
        totalRequest: a._sum.requestAmount,
        totalEnacted: a._sum.enactedAmount,
        totalPreviousYear: a._sum.previousYear,
        requestVsPriorPct: pct(a._sum.requestAmount, a._sum.previousYear),
        enactedVsRequestPct: pct(a._sum.enactedAmount, a._sum.requestAmount),
      }))
      .sort((x, y) => y.fiscalYear - x.fiscalYear || (y.totalRequest ?? 0) - (x.totalRequest ?? 0));

    const programs: ProgramRow[] = [...items]
      .sort((x, y) => (y.requestAmount ?? -1) - (x.requestAmount ?? -1))
      .slice(0, PROGRAM_TABLE_SIZE);

    const latestNasa = items.filter(i => i.agency === 'NASA' && i.fiscalYear === latestFiscalYear && i.requestAmount != null);
    const latestSf = items.filter(i => i.agency === 'Space Force' && i.fiscalYear === latestFiscalYear && i.requestAmount != null);
    const sfCats = new Map<string, number>();
    for (const i of latestSf) sfCats.set(i.category, (sfCats.get(i.category) ?? 0) + (i.requestAmount ?? 0));

    const withBoth = items.filter(i => i.requestAmount != null && i.enactedAmount != null);
    const requestEnactedExample = withBoth.length
      ? withBoth.reduce((best, i) =>
          Math.abs((i.enactedAmount ?? 0) - (i.requestAmount ?? 0)) > Math.abs((best.enactedAmount ?? 0) - (best.requestAmount ?? 0)) ? i : best)
      : null;

    return {
      asOf,
      latestFiscalYear,
      budgetRowCount: items.length,
      congressRowCount: congress.length,
      agencies,
      programs,
      congress: congress.map(c => ({ ...c, date: c.date ? c.date.toISOString() : null })),
      nasaRequest: latestNasa.length ? latestNasa.reduce((s, i) => s + (i.requestAmount ?? 0), 0) : null,
      nasaLineItems: latestNasa.length,
      spaceForceRequest: latestSf.length ? latestSf.reduce((s, i) => s + (i.requestAmount ?? 0), 0) : null,
      spaceForceCategories: Array.from(sfCats.entries()).map(([category, request]) => ({ category, request })).sort((a, b) => b.request - a.request),
      requestEnactedExample,
    };
  } catch {
    return null;
  }
}, ['space-budget-page'], { revalidate: 3600 });

/** USD millions → "$7.65B" / "$965M". */
export function fmtUsdM(v: number | null | undefined): string {
  if (v == null) return '—';
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(2).replace(/\.?0+$/, '')}B`;
  return `$${Math.round(v).toLocaleString('en-US')}M`;
}

export function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
}
