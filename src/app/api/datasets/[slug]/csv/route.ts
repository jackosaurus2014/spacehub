import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { TOTAL_SENTINEL, PRIVATE_TOTAL_SENTINEL } from '@/lib/hiring-snapshots';
import { RECORDING_SINCE } from '@/lib/launch-slips';

// G10 (growth plan): dataset downloads as lead-gen. Free account required
// (never a paywall — the export IS the signup ask); attribution requested in
// the file header. Slugs are a fixed allow-list — this route can only ever
// export the columns written here, nothing user-controlled.
export const dynamic = 'force-dynamic';

function esc(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header: string[], rows: unknown[][]): string {
  return [header.join(','), ...rows.map(r => r.map(esc).join(','))].join('\n') + '\n';
}

const HIRING_SENTINELS = [TOTAL_SENTINEL, PRIVATE_TOTAL_SENTINEL];

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// `notes` are extra `# ` preamble lines — provenance a reader needs before
// trusting the file (recording start dates, sentinel meanings).
const DATASETS: Record<string, { title: string; notes?: string[]; build: () => Promise<{ header: string[]; rows: unknown[][] }> }> = {
  'space-companies': {
    title: 'SpaceNexus Space Company Database',
    build: async () => {
      const rows = await prisma.companyProfile.findMany({
        where: { status: { not: 'defunct' } },
        orderBy: [{ valuation: { sort: 'desc', nulls: 'last' } }, { totalFunding: { sort: 'desc', nulls: 'last' } }],
        select: { name: true, slug: true, sector: true, country: true, ownershipType: true, isPublic: true, ticker: true, exchange: true, valuation: true, totalFunding: true, lastFundingRound: true, foundedYear: true, headquarters: true },
      });
      return {
        header: ['name', 'slug', 'sector', 'country', 'ownership', 'is_public', 'ticker', 'exchange', 'valuation_usd', 'total_funding_usd', 'last_round', 'founded', 'headquarters'],
        rows: rows.map(c => [c.name, c.slug, c.sector, c.country, c.ownershipType, c.isPublic, c.ticker, c.exchange, c.valuation, c.totalFunding, c.lastFundingRound, c.foundedYear, c.headquarters]),
      };
    },
  },
  'funding-rounds': {
    title: 'SpaceNexus Space Funding Rounds',
    build: async () => {
      const rows = await prisma.fundingRound.findMany({
        orderBy: { date: 'desc' },
        include: { company: { select: { name: true, slug: true } } },
      });
      return {
        header: ['company', 'company_slug', 'date', 'amount_usd', 'series', 'round_type', 'post_valuation_usd', 'lead_investor'],
        rows: rows.map(r => [r.company?.name, r.company?.slug, r.date.toISOString().slice(0, 10), r.amount, r.seriesLabel, r.roundType, r.postValuation, r.leadInvestor]),
      };
    },
  },
  'launch-log': {
    title: 'SpaceNexus Orbital Launch Log',
    build: async () => {
      const rows = await prisma.spaceEvent.findMany({
        where: { status: { in: ['completed', 'failed'] }, rocket: { not: null }, launchDate: { not: null } },
        orderBy: { launchDate: 'desc' },
        select: { launchDate: true, name: true, rocket: true, agency: true, country: true, location: true, status: true },
      });
      return {
        header: ['date_utc', 'mission', 'rocket', 'provider', 'country', 'site', 'outcome'],
        rows: rows.map(e => [e.launchDate!.toISOString(), e.name, e.rocket, e.agency, e.country, e.location, e.status === 'completed' ? 'success' : 'failure']),
      };
    },
  },
  'executive-moves': {
    title: 'SpaceNexus Executive Moves',
    build: async () => {
      const rows = await prisma.executiveMove.findMany({ orderBy: { date: 'desc' } });
      return {
        header: ['date', 'person', 'move_type', 'from_company', 'from_title', 'to_company', 'to_title', 'source_url'],
        rows: rows.map(m => [m.date.toISOString().slice(0, 10), m.personName, m.moveType, m.fromCompany, m.fromTitle, m.toCompany, m.toTitle, m.sourceUrl]),
      };
    },
  },
  // Slip ledger: every manifest date change we observed, live. LL2 exposes no
  // revision history, so rows exist only from RECORDING_SINCE onward.
  'launch-slips': {
    title: 'SpaceNexus Launch Slip Ledger',
    notes: [`Recording began ${RECORDING_SINCE}; no upstream revision feed exists, so earlier changes cannot be backfilled`],
    build: async () => {
      const rows = await prisma.launchDateChange.findMany({
        orderBy: { observedAt: 'desc' },
        include: { event: { select: { name: true, rocket: true, agency: true } } },
      });
      return {
        header: ['observed_utc', 'mission', 'rocket', 'provider', 'from_date_utc', 'to_date_utc', 'slip_days'],
        rows: rows.map(c => [
          c.observedAt.toISOString(),
          c.event?.name,
          c.event?.rocket,
          c.event?.agency,
          c.fromDate.toISOString(),
          c.toDate.toISOString(),
          Math.round(((c.toDate.getTime() - c.fromDate.getTime()) / 86400_000) * 10) / 10,
        ]),
      };
    },
  },
  // Per-company daily open-role counts (the series behind /hiring-trends).
  // Site-wide sentinel rows live in hiring-index-totals instead.
  'hiring-index': {
    title: 'SpaceNexus Hiring Index — daily open roles by company',
    notes: ['Daily snapshots since 2026-08-13; source=ats means every counted posting came through the ATS sync'],
    build: async () => {
      const rows = await prisma.companyJobSnapshot.findMany({
        where: { companyName: { notIn: HIRING_SENTINELS } },
        orderBy: [{ date: 'desc' }, { companyName: 'asc' }],
        select: { date: true, companyName: true, companyProfileId: true, activeJobs: true, source: true },
      });
      return {
        header: ['date', 'company', 'company_profile_id', 'active_jobs', 'source'],
        rows: rows.map(s => [isoDay(s.date), s.companyName, s.companyProfileId, s.activeJobs, s.source]),
      };
    },
  },
  'hiring-index-totals': {
    title: 'SpaceNexus Hiring Index — site-wide daily totals',
    notes: [`company=${TOTAL_SENTINEL} is every tracked posting; company=${PRIVATE_TOTAL_SENTINEL} is private companies only`],
    build: async () => {
      const rows = await prisma.companyJobSnapshot.findMany({
        where: { companyName: { in: HIRING_SENTINELS } },
        orderBy: [{ date: 'desc' }, { companyName: 'asc' }],
        select: { date: true, companyName: true, activeJobs: true, source: true },
      });
      return {
        header: ['date', 'company', 'active_jobs', 'source'],
        rows: rows.map(s => [isoDay(s.date), s.companyName, s.activeJobs, s.source]),
      };
    },
  },
  // Per-vehicle record from the launch log. Groups on the raw LL2 vehicle
  // string (so variants like "Falcon 9 Block 5" stay distinct and vehicles
  // outside the rocket registry are still counted); provider = the most
  // common agency on that vehicle's flights.
  'launch-reliability': {
    title: 'SpaceNexus Launch Vehicle Reliability',
    notes: ['flights = completed + failed orbital attempts in the SpaceNexus launch log (scrubs excluded); rows grouped on the vehicle name as reported'],
    build: async () => {
      const events = await prisma.spaceEvent.findMany({
        where: { status: { in: ['completed', 'failed'] }, rocket: { not: null } },
        select: { rocket: true, agency: true, status: true, launchDate: true },
      });
      type Agg = { successes: number; failures: number; first: Date | null; last: Date | null; agencies: Map<string, number> };
      const byRocket = new Map<string, Agg>();
      for (const e of events) {
        const key = e.rocket!.trim();
        if (!key) continue;
        const a = byRocket.get(key) ?? { successes: 0, failures: 0, first: null, last: null, agencies: new Map() };
        if (e.status === 'completed') a.successes++; else a.failures++;
        if (e.launchDate) {
          if (!a.first || e.launchDate < a.first) a.first = e.launchDate;
          if (!a.last || e.launchDate > a.last) a.last = e.launchDate;
        }
        if (e.agency) a.agencies.set(e.agency, (a.agencies.get(e.agency) ?? 0) + 1);
        byRocket.set(key, a);
      }
      const rows = Array.from(byRocket.entries())
        .map(([rocket, a]) => {
          const flights = a.successes + a.failures;
          const provider = Array.from(a.agencies.entries()).sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;
          return {
            rocket, provider, flights, successes: a.successes, failures: a.failures,
            rate: flights > 0 ? Math.round((a.successes / flights) * 1000) / 10 : null,
            first: a.first?.toISOString() ?? null, last: a.last?.toISOString() ?? null,
          };
        })
        .sort((x, y) => y.flights - x.flights || x.rocket.localeCompare(y.rocket));
      return {
        header: ['rocket', 'provider', 'flights', 'successes', 'failures', 'success_rate_pct', 'first_flight_utc', 'last_flight_utc'],
        rows: rows.map(r => [r.rocket, r.provider, r.flights, r.successes, r.failures, r.rate, r.first, r.last]),
      };
    },
  },
};

export async function GET(request: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const def = DATASETS[params.slug];
  if (!def) return NextResponse.json({ error: 'Unknown dataset' }, { status: 404 });

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent('/datasets')}&reason=dataset`, request.url), 302);
  }

  try {
    const { header, rows } = await def.build();
    const preamble = [
      `# ${def.title}`,
      `# Rows: ${rows.length} · Retrieved: ${new Date().toISOString()}`,
      ...(def.notes ?? []).map(n => `# ${n}`),
      `# License: CC BY 4.0 — free to use with attribution: "Data: SpaceNexus, https://spacenexus.us/datasets"`,
      `# Live API with the same data: https://spacenexus.us/developer`,
    ].join('\n');
    return new NextResponse(preamble + '\n' + toCsv(header, rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="spacenexus-${params.slug}.csv"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    logger.warn('dataset export failed', { slug: params.slug, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
