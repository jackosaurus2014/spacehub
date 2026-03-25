'use client';

import Link from 'next/link';
import Image from 'next/image';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const COMPARISON_TOOLS = [
  {
    title: 'Launch Vehicle Comparison',
    description: 'Compare 15+ rockets side-by-side: payload capacity, cost per kg, dimensions, reusability, and success rates.',
    href: '/compare/launch-vehicles',
    icon: '🚀',
    stats: '15 vehicles',
    heroImage: '/art/hero-launch-vehicles.png',
  },
  {
    title: 'Satellite Constellation Comparison',
    description: 'Compare major constellations: Starlink, OneWeb, Kuiper, GPS, Galileo, and more. Orbit types, coverage, and capacity.',
    href: '/compare/satellites',
    icon: '🛰️',
    stats: '12+ constellations',
    heroImage: '/art/hero-space-operations.png',
  },
  {
    title: 'Company Comparison',
    description: 'Compare space companies head-to-head: revenue, funding, employees, market cap, and capabilities.',
    href: '/compare/companies',
    icon: '🏢',
    stats: '100+ companies',
    heroImage: '/art/hero-market-intel.png',
  },
  {
    title: 'Satellite Bus Comparison',
    description: 'Compare satellite platforms by mass, power, pointing accuracy, lifespan, and payload accommodation across 22 buses.',
    href: '/compare/satellite-buses',
    icon: '📡',
    stats: '22 buses',
    heroImage: '/art/hero-space-comms.png',
  },
];

const COMPETITOR_COMPARISONS = [
  {
    title: 'SpaceNexus vs Bloomberg Terminal',
    description: 'Purpose-built space intelligence vs. general finance terminal. $0-99/mo vs $25,000/yr.',
    href: '/compare/bloomberg-terminal',
    icon: '⚖️',
  },
  {
    title: 'SpaceNexus vs Quilty Space Analytics',
    description: 'Self-service platform vs. premium research reports. $0-99/mo vs $5K-50K/yr.',
    href: '/compare/quilty-analytics',
    icon: '⚖️',
  },
  {
    title: 'SpaceNexus vs Payload Space',
    description: 'Interactive intelligence platform vs. curated newsletter. Both have free tiers.',
    href: '/compare/payload-space',
    icon: '⚖️',
  },
];

const INDUSTRY_MATCHUPS = [
  {
    title: 'SpaceX vs Blue Origin vs Rocket Lab',
    description: 'The three leading commercial launch providers compared: vehicles, pricing, track records, and future roadmaps.',
    href: '/blog/spacex-blue-origin-rocket-lab-comparison-2026',
    category: 'Launch Providers',
  },
  {
    title: 'Starlink vs OneWeb vs Kuiper',
    description: 'Mega-constellation showdown: coverage, capacity, pricing, and deployment timelines for the top three broadband satellite networks.',
    href: '/blog/starlink-oneweb-kuiper-mega-constellation-comparison',
    category: 'Mega-Constellations',
  },
  {
    title: 'Falcon 9 vs New Glenn vs Neutron',
    description: 'Medium-to-heavy lift reusable rockets: payload capacity, cost per kg, cadence, and target markets.',
    href: '/compare/launch-vehicles',
    category: 'Launch Vehicles',
  },
  {
    title: 'Axiom vs Vast vs Orbital Reef',
    description: 'Commercial space station contenders: timelines, architectures, business models, and crew capacity.',
    href: '/blog/commercial-space-stations-race-to-replace-iss',
    category: 'Space Stations',
  },
  {
    title: 'Planet vs Maxar vs BlackSky',
    description: 'Earth observation providers: resolution, revisit rates, constellation sizes, and defense vs. commercial focus.',
    href: '/compare/companies',
    category: 'Earth Observation',
  },
  {
    title: 'NASA SLS vs SpaceX Starship',
    description: 'Government vs. commercial super heavy-lift: development costs, payload capacity, reusability, and mission profiles.',
    href: '/compare/launch-vehicles',
    category: 'Heavy Lift',
  },
];

const BLOG_COMPARISONS = [
  {
    title: 'SpaceX vs Blue Origin vs Rocket Lab: Launch Provider Comparison 2026',
    href: '/blog/spacex-blue-origin-rocket-lab-comparison-2026',
    category: 'Analysis',
  },
  {
    title: 'Starlink vs OneWeb vs Kuiper: Mega-Constellation Comparison',
    href: '/blog/starlink-oneweb-kuiper-mega-constellation-comparison',
    category: 'Analysis',
  },
  {
    title: 'Commercial Space Stations: The Race to Replace the ISS',
    href: '/blog/commercial-space-stations-race-to-replace-iss',
    category: 'Analysis',
  },
  {
    title: 'Rocket Lab: The SpaceX Competitor to Watch in 2026',
    href: '/blog/rocket-lab-spacex-competitor-2026',
    category: 'Analysis',
  },
  {
    title: 'Space Industry M&A: The Biggest Deals and What They Mean',
    href: '/blog/space-industry-mergers-acquisitions-biggest-deals',
    category: 'Market',
  },
  {
    title: 'SpaceNexus vs Free Tools: Do You Need a Platform?',
    href: '/blog/spacenexus-vs-free-tools-comparison',
    category: 'Guide',
  },
];

export default function ComparisonHubPage() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <AnimatedPageHeader
          title="Compare Space Industry Players"
          subtitle="Side-by-side analysis of launch vehicles, satellite constellations, companies, and platforms across the space industry. Data-driven comparisons to inform your decisions."
          accentColor="cyan"
        />

        {/* Interactive Comparison Tools */}
        <section className="mt-8">
          <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Interactive Comparison Tools
          </h2>
          <p className="text-slate-400 mb-6 max-w-3xl">
            Use our interactive tools to build custom side-by-side comparisons with real data.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {COMPARISON_TOOLS.map((tool, index) => (
              <ScrollReveal key={tool.href} delay={0.1 + index * 0.1}>
                <Link
                  href={tool.href}
                  className="group block card p-6 hover:border-white/10 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-black/20 hover:-translate-y-1 relative overflow-hidden"
                >
                  {/* Background accent image */}
                  <Image
                    src={tool.heroImage}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-300"
                  />

                  <div className="relative z-10 flex items-start gap-4">
                    <Image
                      src={tool.heroImage}
                      alt=""
                      width={48}
                      height={48}
                      sizes="48px"
                      className="rounded-lg opacity-70 flex-shrink-0 mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-2xl mb-2">{tool.icon}</div>
                      <h3 className="text-lg font-bold text-white group-hover:text-white/90 transition-colors mb-2">
                        {tool.title}
                      </h3>
                      <p className="text-sm text-slate-400 mb-4 line-clamp-3">
                        {tool.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white/70 bg-white/5 px-2.5 py-1 rounded-full">
                          {tool.stats}
                        </span>
                        <span className="text-sm text-slate-400 group-hover:text-white transition-colors">
                          Compare &rarr;
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Industry Matchups */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Industry Head-to-Head Matchups
          </h2>
          <p className="text-slate-400 mb-8 max-w-3xl">
            Deep-dive comparisons of the biggest rivals in the space industry — from launch providers to constellation operators.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {INDUSTRY_MATCHUPS.map((matchup, index) => (
              <ScrollReveal key={matchup.title} delay={0.1 + index * 0.05}>
                <Link
                  href={matchup.href}
                  className="group block card p-5 hover:border-white/10 hover:bg-white/[0.05] hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/15">
                      {matchup.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-white/90 transition-colors mb-2">
                    {matchup.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                    {matchup.description}
                  </p>
                  <span className="text-xs text-slate-500 group-hover:text-white/70 transition-colors font-medium">
                    Read comparison &rarr;
                  </span>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Platform Comparisons */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Platform Comparisons
          </h2>
          <p className="text-slate-400 mb-8 max-w-3xl">
            See how SpaceNexus compares to other space industry tools and platforms used by aerospace professionals.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COMPETITOR_COMPARISONS.map((comp, index) => (
              <ScrollReveal key={comp.href} delay={0.2 + index * 0.1}>
                <Link
                  href={comp.href}
                  className="group block card p-5 hover:border-white/10 hover:bg-white/[0.05]"
                >
                  <div className="text-2xl mb-3">{comp.icon}</div>
                  <h3 className="text-sm font-bold text-white group-hover:text-white transition-colors mb-2">
                    {comp.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {comp.description}
                  </p>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Blog Comparison Articles */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Comparison Articles
          </h2>
          <p className="text-slate-400 mb-8 max-w-3xl">
            In-depth analysis articles comparing companies, technologies, and market segments across the space industry.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {BLOG_COMPARISONS.map((article, index) => (
              <ScrollReveal key={article.href} delay={0.1 + index * 0.05}>
                <Link
                  href={article.href}
                  className="group block card p-5 hover:border-white/10 hover:bg-white/[0.05] transition-all"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10">
                      {article.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-white/90 transition-colors mb-2 line-clamp-2">
                    {article.title}
                  </h3>
                  <span className="text-xs text-slate-500 group-hover:text-white/70 transition-colors font-medium">
                    Read article &rarr;
                  </span>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 mb-8">
          <ScrollReveal delay={0.3}>
            <div className="card p-8 text-center bg-gradient-to-b from-white/[0.06] to-white/[0.02]">
              <h2 className="text-xl font-bold text-white mb-3">
                Need a Custom Comparison?
              </h2>
              <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
                SpaceNexus tracks 100+ space companies with real-time data on financials, capabilities, contracts, and market position. Build your own comparisons with our interactive tools.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="inline-block bg-white hover:bg-slate-100 text-slate-900 font-medium px-6 py-2.5 rounded-lg transition-colors"
                >
                  Get Started Free
                </Link>
                <Link
                  href="/company-profiles"
                  className="inline-block bg-white/10 hover:bg-white/15 text-white font-medium px-6 py-2.5 rounded-lg border border-white/10 transition-colors"
                >
                  Browse Companies
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </section>

        <RelatedModules modules={PAGE_RELATIONS['compare']} />
      </div>
    </div>
  );
}
