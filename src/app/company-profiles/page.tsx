/**
 * /company-profiles — SERVER component (SYNTHESIS.md item 14).
 *
 * This page used to be `'use client'` and shipped a skeleton, then
 * "0 companies found", to every crawler and every no-JS client. It now reads
 * the first page of the directory on the server and renders a real <h1>, a
 * Deck, one provenance line and the first 24 rows as crawlable HTML. The
 * filters/search/sort/gating live in the client island below.
 *
 * Prisma is read at request time and the Railway BUILD container has no
 * database, so this must stay `force-dynamic` and every DB read must be inside
 * a try/catch that degrades to "the client will fetch it".
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import Console from '@/components/ui/Console';
import Deck from '@/components/ui/Deck';
import ItemListSchema from '@/components/seo/ItemListSchema';
import FAQSchema from '@/components/seo/FAQSchema';
import CompanyDirectoryTable from './CompanyDirectoryTable';
import CompanyProfilesClient from './CompanyProfilesClient';
import {
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  DIRECTORY_PAGE_SIZE,
  type CompanyCard,
  type DirectoryStats,
} from './shared';

export const dynamic = 'force-dynamic';

// Exactly the columns the list needs — no longDescription, no verification
// blobs, no sponsorAnalytics JSON.
const LIST_SELECT = {
  id: true,
  slug: true,
  name: true,
  ticker: true,
  exchange: true,
  headquarters: true,
  country: true,
  foundedYear: true,
  employeeRange: true,
  website: true,
  description: true,
  logoUrl: true,
  isPublic: true,
  marketCap: true,
  status: true,
  sector: true,
  subsector: true,
  tags: true,
  tier: true,
  totalFunding: true,
  lastFundingRound: true,
  valuation: true,
  revenueEstimate: true,
  ownershipType: true,
  dataCompleteness: true,
  sponsorTier: true,
  sponsorTagline: true,
  _count: {
    select: {
      fundingRounds: true,
      products: true,
      keyPersonnel: true,
      contracts: true,
      events: true,
      satelliteAssets: true,
      facilities: true,
      jobPostings: { where: { isActive: true } },
    },
  },
};

interface FirstScreen {
  companies: CompanyCard[];
  total: number;
  stats: DirectoryStats;
  asOf: Date | null;
}

/**
 * The default view, read directly from Prisma. It MUST match the client's
 * default query (`buildParams` with no filters) exactly — same where, same
 * orderBy, same take — or hydration would show a different 24 companies than
 * the crawler saw.
 */
async function getFirstScreen(): Promise<FirstScreen | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma.companyProfile as any;

    const [companies, total, agg, sectorGroups] = await Promise.all([
      db.findMany({
        where: {},
        orderBy: { [DEFAULT_SORT_BY]: DEFAULT_SORT_ORDER },
        skip: 0,
        take: DIRECTORY_PAGE_SIZE,
        select: LIST_SELECT,
      }),
      db.count({ where: {} }),
      db.aggregate({
        _count: true,
        _sum: { totalFunding: true, marketCap: true },
        _avg: { dataCompleteness: true },
        _max: { updatedAt: true },
      }),
      db.groupBy({ by: ['sector'], _count: true, where: { sector: { not: null } } }),
    ]);

    // Prisma's aggregate _count is a number or { _all } depending on version.
    const countVal = typeof agg?._count === 'number' ? agg._count : (agg?._count?._all ?? total);

    return {
      // Dates never reach the client component: the list select carries none,
      // but JSON round-tripping keeps that guarantee true if the select grows.
      companies: JSON.parse(JSON.stringify(companies)) as CompanyCard[],
      total,
      stats: {
        totalCompanies: countVal,
        totalFundingTracked: agg?._sum?.totalFunding || 0,
        totalMarketCap: agg?._sum?.marketCap || 0,
        avgCompleteness: Math.round(agg?._avg?.dataCompleteness || 0),
        sectors: (sectorGroups as { sector: string | null; _count: number | { _all: number } }[]).map((s) => ({
          sector: s.sector,
          count: typeof s._count === 'number' ? s._count : (s._count?._all ?? 0),
        })),
      },
      asOf: agg?._max?.updatedAt ?? null,
    };
  } catch (error) {
    // Stale beats blank, blank beats invented (SYNTHESIS.md §2.5). We render
    // the header without a count and let the client island fetch the rows.
    logger.warn('company-profiles: server-side first screen failed; client will fetch', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export default async function CompanyProfilesPage() {
  const first = await getFirstScreen();

  const asOfLabel = first?.asOf ? new Date(first.asOf).toISOString().slice(0, 10) : null;
  const provenance = first
    ? [
        `${first.total.toLocaleString('en-US')} companies`,
        asOfLabel ? `as of ${asOfLabel}` : null,
        'source: SpaceNexus company directory',
      ].filter(Boolean).join(' · ')
    : 'Record count unavailable — the directory is loading from the live database.';

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto">
      <ItemListSchema
        name="Space Company Directory"
        description="Comprehensive directory of space industry companies with financial data, satellite assets, facility locations, and competitive analysis."
        url="/company-profiles"
        items={(first?.companies ?? []).slice(0, 30).map((c) => ({
          name: c.name,
          url: `/company-profiles/${c.slug}`,
          description: c.description || `${c.name} - ${c.sector || 'Space'} company${c.headquarters ? ` based in ${c.headquarters}` : ''}`,
        }))}
      />
      <FAQSchema items={[
        { question: 'How many space companies does SpaceNexus track?', answer: 'SpaceNexus profiles over 100 space and aerospace companies across launch, satellite, defense, infrastructure, ground segment, manufacturing, and analytics sectors, from publicly traded primes to venture-backed startups.' },
        { question: 'How are space companies ranked on SpaceNexus?', answer: 'Companies are organized by tier: Tier 1 (industry leaders with $1B+ revenue or market cap), Tier 2 (established players with significant market presence), and Tier 3 (emerging companies and startups).' },
        { question: 'How do I claim a company profile?', answer: 'Verified company representatives can claim their profile by clicking the Claim This Profile button on the company detail page and submitting a request with a company email address. Our team reviews claims within 48 hours.' },
      ]} />

      <header className="mb-6">
        <h1 className="font-display text-[clamp(2rem,3.6vw,3.1rem)] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--ink)]">
          Space Company Directory
        </h1>
        <Deck className="mt-3">
          Who builds, launches, insures and operates in space — with the funding, the
          headquarters, the contracts and the people behind each one, on one page per company.
        </Deck>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--ink-3)]">
          {provenance}
        </p>
      </header>

      <CompanyProfilesClient
        initialCompanies={first?.companies}
        initialTotal={first?.total}
        initialStats={first?.stats}
      >
        {first && first.companies.length > 0 ? (
          <Console
            title={`Directory · first ${first.companies.length} of ${first.total.toLocaleString('en-US')}`}
            source="SpaceNexus"
            asOf={first.asOf}
            status="verified"
          >
            <CompanyDirectoryTable
              rows={first.companies}
              caption={`Space company directory — first ${first.companies.length} of ${first.total} companies`}
            />
          </Console>
        ) : null}
      </CompanyProfilesClient>
    </div>
  );
}
