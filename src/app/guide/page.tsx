import type { Metadata } from 'next';
import Link from 'next/link';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { GUIDE_LIST } from '@/lib/guide-navigation';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Space Industry Guides | SpaceNexus',
  description:
    'In-depth guides to the space industry: market size and data, investing, launch costs, satellite tracking, regulatory compliance, and where to watch a launch.',
  keywords: [
    'space industry guides',
    'space industry guide',
    'space economy guide',
    'satellite tracking guide',
    'space launch cost guide',
    'space regulatory guide',
  ],
  alternates: {
    canonical: 'https://spacenexus.us/guide',
  },
  openGraph: {
    title: 'Space Industry Guides | SpaceNexus',
    description:
      'In-depth guides to the space industry: market size and data, investing, launch costs, satellite tracking, regulatory compliance, and where to watch a launch.',
    type: 'website',
  },
};

// One-line description per guide, keyed by slug. Guides without an entry
// still render (using their title) so this list can lag GUIDE_LIST safely.
const GUIDE_DESCRIPTIONS: Record<string, string> = {
  'space-industry': 'Markets, technologies, companies, and opportunities shaping the $626B+ space economy.',
  'space-industry-market-size': 'Sector-by-sector data, growth forecasts, and regional breakdowns of the global space economy.',
  'commercial-space-economy': 'How commercial space companies generate revenue across launch, satellites, and services.',
  'space-economy-value-chain': 'Upstream, midstream, downstream — segment sizes, margins, and who captures the value.',
  'space-economy-investment': 'A practical guide to investing in space stocks, ETFs, and private space companies.',
  'space-business-opportunities': 'Where the addressable market is opening up for new space businesses in 2026.',
  'space-launch-cost-comparison': 'Vehicle-by-vehicle launch pricing, cost per kilogram, and hidden mission costs.',
  'space-launch-schedule-2026': 'A running list of major 2026 orbital and deep-space launches to watch.',
  'watch-a-launch-cape-canaveral': 'The best public viewing spots for a rocket launch at Cape Canaveral.',
  'watch-a-launch-vandenberg': 'The best public viewing spots for a rocket launch at Vandenberg Space Force Base.',
  'watch-a-launch-starbase': 'The best public viewing spots for a Starship launch at Starbase, Texas.',
  'satellite-tracking-guide': 'TLE data, SGP4 propagation, orbit types, and how to track any object in orbit.',
  'how-satellite-tracking-works': 'The technical fundamentals behind real-time satellite position tracking.',
  'itar-compliance-guide': 'What space companies need to know about U.S. export control (ITAR) compliance.',
  'space-regulatory-compliance': 'Licensing, spectrum management, and the regulatory landscape for space operators.',
};

export default function GuideIndexPage() {
  return (
    <div className="min-h-screen">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Guides' }]} />
      <header className="relative overflow-hidden py-16 md:py-24">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-slate-200/30 via-space-900/80 to-transparent pointer-events-none"
        />
        <div className="relative container mx-auto px-4 text-center max-w-3xl">
          <nav className="flex items-center justify-center gap-2 text-star-300 text-sm mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span className="text-star-300/50">/</span>
            <span className="text-white">Guides</span>
          </nav>
          <h1 className="text-display-lg md:text-display-xl font-display font-bold text-white mb-6 leading-tight">
            Space Industry Guides
          </h1>
          <p className="text-lg md:text-xl text-star-200 leading-relaxed max-w-2xl mx-auto">
            In-depth, data-driven guides covering the space economy, launch costs, satellite
            tracking, regulatory compliance, and where to watch a launch in person.
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 pb-20">
        <ScrollReveal>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {GUIDE_LIST.map((guide) => (
              <StaggerItem key={guide.slug}>
                <Link
                  href={`/guide/${guide.slug}`}
                  className="card-interactive p-5 h-full flex flex-col"
                >
                  <span className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                    {guide.shortTitle}
                  </span>
                  <h2 className="text-white font-semibold text-lg mb-2">{guide.title}</h2>
                  {GUIDE_DESCRIPTIONS[guide.slug] && (
                    <p className="text-star-300 text-sm leading-relaxed">
                      {GUIDE_DESCRIPTIONS[guide.slug]}
                    </p>
                  )}
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </ScrollReveal>
      </div>
    </div>
  );
}
