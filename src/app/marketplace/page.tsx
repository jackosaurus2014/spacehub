/**
 * /marketplace — SERVER component.
 *
 * This page used to be `'use client'` and shipped a full-screen spinner as its
 * prerendered HTML — zero content for crawlers and no-JS clients. It now reads
 * the first screen on the server and renders a real <h1>, intro, stats line and
 * the first MARKETPLACE_FIRST_SCREEN listings as crawlable cards; the stats
 * bar, category grid and everything interactive live in the client island.
 *
 * Prisma is read at request time and the Railway BUILD container has no
 * database, so this must stay `force-dynamic` and the DB read sits inside a
 * try/catch that degrades to "the client will fetch it" (the island then
 * behaves exactly like the old client page).
 */

import Link from 'next/link';
import Image from 'next/image';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import ItemListSchema from '@/components/seo/ItemListSchema';
import FAQSchema from '@/components/seo/FAQSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { getCategoryIcon, getCategoryLabel, getSubcategoryLabel } from '@/lib/marketplace-types';
import MarketplaceClient, { type MarketplaceStats } from './MarketplaceClient';

export const dynamic = 'force-dynamic';

/** How many listings the server renders as crawlable cards. */
const MARKETPLACE_FIRST_SCREEN = 12;

interface ListingCard {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  subcategory: string | null;
  isEditorial: boolean;
  company: { slug: string; name: string } | null;
}

interface FirstScreen {
  listings: ListingCard[];
  stats: MarketplaceStats;
}

/**
 * The newest active listings plus the stats the island renders. The listing
 * query MUST match /api/marketplace/listings' default ordering
 * (status=active, createdAt desc) so the directory and this first screen
 * never disagree about what "recent" means.
 */
async function getFirstScreen(): Promise<FirstScreen | null> {
  try {
    const [listings, activeListings, providerGroups, categoryGroups] = await Promise.all([
      prisma.serviceListing.findMany({
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: MARKETPLACE_FIRST_SCREEN,
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          category: true,
          subcategory: true,
          isEditorial: true,
          company: { select: { slug: true, name: true } },
        },
      }),
      prisma.serviceListing.count({ where: { status: 'active' } }),
      prisma.serviceListing.groupBy({ by: ['companyId'], where: { status: 'active' } }),
      prisma.serviceListing.groupBy({ by: ['category'], where: { status: 'active' }, _count: { id: true } }),
    ]);

    return {
      listings,
      stats: {
        activeListings,
        activeProviders: providerGroups.length,
        categories: categoryGroups.map((c) => ({ category: c.category, count: c._count.id })),
      },
    };
  } catch (error) {
    // Stale beats blank, blank beats invented: render the header without
    // counts and let the client island fetch everything, as it always did.
    logger.warn('marketplace: server-side first screen failed; client will fetch', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export default async function MarketplacePage() {
  const first = await getFirstScreen();

  const provenance = first
    ? `${first.stats.activeListings.toLocaleString('en-US')} active listings from ${first.stats.activeProviders.toLocaleString('en-US')} providers · curated space-industry service directory`
    : 'The listings directory loads from the live database.';

  return (
    <div className="min-h-screen">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Marketplace' }]} />
      <ItemListSchema
        name="Space Industry Marketplace"
        description="B2B marketplace for space industry products and services including launch slots, satellite components, ground stations, and engineering services."
        url="/marketplace"
        items={[
          { name: 'Launch Services', url: '/marketplace/search?category=launch-services', description: 'Rideshare slots, dedicated launches, and launch vehicle services' },
          { name: 'Satellite Components', url: '/marketplace/search?category=satellite-components', description: 'Satellite subsystems, sensors, and hardware' },
          { name: 'Ground Stations', url: '/marketplace/search?category=ground-stations', description: 'Ground station time, antenna networks, and TT&C services' },
          { name: 'Engineering Services', url: '/marketplace/search?category=engineering', description: 'Aerospace engineering, consulting, and integration services' },
          { name: 'Data & Analytics', url: '/marketplace/search?category=data-analytics', description: 'Earth observation, space weather, and orbital data services' },
          { name: 'Insurance', url: '/marketplace/search?category=insurance', description: 'Launch insurance, in-orbit insurance, and liability coverage' },
        ]}
      />
      <FAQSchema items={[
        { question: 'How do I list services on the SpaceNexus marketplace?', answer: 'Service providers can create listings through the Provider Dashboard. Listings include company details, service descriptions, pricing, certifications, and verification badges. Basic listings are free.' },
        { question: 'What types of space services are listed?', answer: 'The marketplace covers 10 categories including Launch Services, Satellite Manufacturing, Ground Station Services, Space Insurance, Mission Operations, Testing and Qualification, Consulting, Data and Analytics, Components and Materials, and Workforce and Recruitment.' },
        { question: 'How do I get a quote from a provider?', answer: 'Every listing carries the provider\'s direct contact. Open a listing and use Contact Provider to reach them with your requirements, budget range, and timeline.' },
      ]} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Hero — static server HTML (was AnimatedPageHeader) so the page's
            promise is in the raw HTML for crawlers and no-JS clients. */}
        <div className="relative overflow-hidden text-center space-y-4">
          <div className="absolute inset-0 -z-10">
            <Image
              src="/art/hero-marketplace.png"
              alt=""
              fill
              sizes="100vw"
              className="object-cover opacity-15"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/70 to-[#09090b]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white pt-4">
            Space Industry Marketplace
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Find verified providers across launch, manufacturing, ground stations, insurance, and more
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-slate-500">
            {provenance}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2 pb-4">
            <Link
              href="/marketplace/search"
              className="inline-flex items-center px-6 py-3 min-h-[44px] bg-gradient-to-r from-slate-200 to-blue-600 hover:from-white hover:to-blue-500 text-white rounded-lg font-semibold transition-all"
            >
              Browse Services
            </Link>
            <Link
              href="/provider-dashboard"
              className="inline-flex items-center px-6 py-3 min-h-[44px] bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg font-semibold transition-all"
            >
              List Your Services
            </Link>
          </div>
        </div>

        <MarketplaceClient initialStats={first?.stats}>
          {first && first.listings.length > 0 ? (
            <section aria-labelledby="recent-listings-heading">
              <div className="flex items-center justify-between mb-4">
                <h2 id="recent-listings-heading" className="text-lg font-semibold text-white">
                  Recent Listings
                </h2>
                <Link href="/marketplace/search" className="text-xs text-slate-300 hover:text-white">
                  View All →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {first.listings.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/marketplace/listings/${listing.slug}`}
                    className="card p-5 h-full block group hover:border-white/15 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-2">
                      <span aria-hidden="true">{getCategoryIcon(listing.category)}</span>
                      <span>{getCategoryLabel(listing.category)}</span>
                      {listing.subcategory && (
                        <>
                          <span className="text-slate-600">/</span>
                          <span>{getSubcategoryLabel(listing.category, listing.subcategory)}</span>
                        </>
                      )}
                      {listing.isEditorial && (
                        <span
                          className="text-[9px] px-1 py-0.5 bg-purple-500/15 text-purple-400 rounded font-medium"
                          title="Curated by SpaceNexus from public data, not submitted by the provider"
                        >
                          Platform-curated
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors mb-1">
                      {listing.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-2">
                      {listing.description}
                    </p>
                    {listing.company && (
                      <p className="text-xs text-slate-500">{listing.company.name}</p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          ) : undefined}
        </MarketplaceClient>
      </div>
    </div>
  );
}
