// Chart of the Week — the registry (roadmap 2026-09, Tier 3).
//
// One chart per slug, rendered server-side as SVG (src/lib/charts/render.ts),
// served as PNG for email at /api/chart/[slug], with a permalink page at
// /chart/[slug]. The M/Th Digest carries one of these in a fixed slot; the
// pick rotates by ISO week (chartOfTheWeekSlug) and skips charts whose data
// came back empty. Prisma-free on purpose: the edge middleware consults
// allChartSlugs() for real 404s (src/lib/registry-routes.ts). Loaders live
// in src/lib/charts/data.ts.

export interface ChartDef {
  slug: string;
  title: string;
  /** One line under the title — what the reader is looking at. */
  subtitle: string;
  /** Where the numbers come from, shown on the page and in the email. */
  source: string;
  unit: 'count' | 'usd' | 'jobs';
  /** Site page that holds the underlying data. */
  exploreHref: string;
  exploreLabel: string;
}

export const CHART_DEFS: readonly ChartDef[] = [
  {
    slug: 'launches-per-month',
    title: 'Orbital launches per month',
    subtitle: 'Completed and failed launch attempts worldwide, last 12 months',
    source: 'SpaceNexus launch tracker (Launch Library 2, outcomes verified)',
    unit: 'count',
    exploreHref: '/launches',
    exploreLabel: 'Launches by site',
  },
  {
    slug: 'launches-by-agency-90d',
    title: 'Who launched the most in the last 90 days',
    subtitle: 'Launch attempts by provider, trailing 90 days',
    source: 'SpaceNexus launch tracker (Launch Library 2)',
    unit: 'count',
    exploreHref: '/rockets',
    exploreLabel: 'Every rocket',
  },
  {
    slug: 'funding-by-month',
    title: 'Private space funding by month',
    subtitle: 'Disclosed round sizes, last 12 months (USD)',
    source: 'SpaceNexus Startup Hub (disclosed rounds only)',
    unit: 'usd',
    exploreHref: '/funding-tracker',
    exploreLabel: 'Funding tracker',
  },
  {
    slug: 'open-space-jobs',
    title: 'Open space-industry jobs',
    subtitle: 'Active postings across tracked companies, weekly snapshots',
    source: 'SpaceNexus jobs machine (16 ATS boards, daily sync)',
    unit: 'jobs',
    exploreHref: '/space-talent?tab=workforce',
    exploreLabel: 'Who is hiring',
  },
  {
    slug: 'launch-slips-by-week',
    title: 'Launch date slips per week',
    subtitle: 'Scheduled launches that moved by more than a minute, last 8 weeks',
    source: 'SpaceNexus slip history (every manifest change is recorded)',
    unit: 'count',
    exploreHref: '/mission-control',
    exploreLabel: 'Mission Control',
  },
];

export function getChartDef(slug: string): ChartDef | undefined {
  return CHART_DEFS.find((c) => c.slug === slug);
}

export function allChartSlugs(): string[] {
  return CHART_DEFS.map((c) => c.slug);
}

/** ISO-8601 week number (1-53) of a UTC date. */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
}

/**
 * The scheduled chart for a given date's ISO week, with `offset` stepping to
 * the next candidate when the scheduled one has no data. Deterministic so the
 * Monday and Thursday digests of the same week show the same chart.
 */
export function chartOfTheWeekSlug(date: Date, offset: number = 0): string {
  const idx = (isoWeek(date) + offset) % CHART_DEFS.length;
  return CHART_DEFS[idx].slug;
}
