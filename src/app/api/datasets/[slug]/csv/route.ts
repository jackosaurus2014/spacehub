import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

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

const DATASETS: Record<string, { title: string; build: () => Promise<{ header: string[]; rows: unknown[][] }> }> = {
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
};

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
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
      `# Free to use with attribution: "Data: SpaceNexus, https://spacenexus.us/datasets"`,
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
