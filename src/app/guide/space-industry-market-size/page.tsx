import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 3600; // ISR: revalidate every hour

export const metadata: Metadata = {
  title: 'Space Industry Market Size 2026: Data, Trends & Forecasts | SpaceNexus Guide',
  description:
    'The global space economy exceeded $630B in 2025. Explore detailed market size data, growth forecasts, and sector breakdowns for the space industry.',
  keywords: [
    'space industry market size',
    'space economy 2026',
    'space market forecast',
    'space industry revenue',
    'satellite market size',
    'launch market size',
    'space industry growth',
    'space economy statistics',
    'global space market',
  ],
  openGraph: {
    title: 'Space Industry Market Size 2026: Data, Trends & Forecasts',
    description:
      'The global space economy exceeded $630B in 2025. Explore detailed market size data, growth forecasts, and sector breakdowns.',
    type: 'article',
    publishedTime: '2026-02-08T00:00:00Z',
    authors: ['SpaceNexus'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/guide/space-industry-market-size',
  },
};

/* ------------------------------------------------------------------ */
/*  Table of Contents data                                            */
/* ------------------------------------------------------------------ */
const TOC = [
  { id: 'overview', label: 'Market Overview' },
  { id: 'total-market', label: 'Total Market Size' },
  { id: 'sector-breakdown', label: 'Sector Breakdown' },
  { id: 'satellite-services', label: 'Satellite Services' },
  { id: 'launch-market', label: 'Launch Services Market' },
  { id: 'ground-equipment', label: 'Ground Equipment' },
  { id: 'government-spending', label: 'Government Spending' },
  { id: 'regional-analysis', label: 'Regional Analysis' },
  { id: 'growth-drivers', label: 'Growth Drivers' },
  { id: 'forecasts', label: 'Market Forecasts' },
  { id: 'investment-flows', label: 'Investment Flows' },
  { id: 'methodology', label: 'Data Sources & Methodology' },
  { id: 'spacenexus', label: 'Track Market Data on SpaceNexus' },
];

/* ------------------------------------------------------------------ */
/*  FAQ data                                                          */
/* ------------------------------------------------------------------ */
const FAQ_ITEMS = [
  {
    q: 'What is the total size of the space industry in 2026?',
    a: 'The global space economy is estimated at approximately $670 billion to $700 billion in 2026, building on the $630 billion figure reported for 2025 by the Space Foundation and Euroconsult. This includes commercial revenues, government budgets, and the broader ground equipment and services ecosystem.',
  },
  {
    q: 'What is the largest segment of the space economy?',
    a: 'Satellite services -- including satellite television, satellite broadband, fixed satellite services, and mobile satellite services -- remain the largest commercial segment, generating over $100 billion annually. When the broader downstream services ecosystem (navigation, Earth observation analytics) is included, the figure is substantially larger.',
  },
  {
    q: 'How fast is the space market growing?',
    a: 'The overall space economy has been growing at approximately 7 to 9 percent annually. Certain sub-segments are growing faster: satellite broadband (driven by Starlink) is expanding at over 30 percent annually, while Earth observation data analytics and in-space services are also in double-digit growth territory.',
  },
  {
    q: 'Where can I find real-time space market data?',
    a: 'SpaceNexus provides real-time space market intelligence including company analytics, startup tracking, and economy dashboards. The platform aggregates data from industry sources and provides analytical tools for professionals and investors.',
  },
];

/* ------------------------------------------------------------------ */
/*  Structured data (JSON-LD)                                         */
/* ------------------------------------------------------------------ */
function buildStructuredData() {
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Space Industry Market Size 2026: Data, Trends & Forecasts',
    description:
      'Comprehensive analysis of the global space economy market size, sector breakdowns, growth drivers, and forecasts through 2035.',
    author: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
    publisher: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' },
    },
    datePublished: '2026-02-08T00:00:00Z',
    dateModified: '2026-02-08T00:00:00Z',
    mainEntityOfPage: 'https://spacenexus.us/guide/space-industry-market-size',
    image: 'https://spacenexus.us/og-image.png',
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return { article, faqSchema };
}

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */
export default function SpaceIndustryMarketSizePage() {
  const { article, faqSchema } = buildStructuredData();

  return (
    <>
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="min-h-screen">
        {/* ── Hero ── */}
        <header className="relative overflow-hidden py-20 md:py-28">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-nebula-600/30 via-space-900/80 to-transparent pointer-events-none"
          />
          <div className="relative container mx-auto px-4 text-center max-w-4xl">
            <div className="flex items-center justify-center gap-2 text-star-300 text-sm mb-4">
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <span className="text-star-300/50">/</span>
              <Link href="/guide/space-industry" className="hover:text-white transition-colors">
                Guide
              </Link>
              <span className="text-star-300/50">/</span>
              <span className="text-white">Market Size</span>
            </div>
            <h1 className="text-display-lg md:text-display-xl font-display font-bold text-white mb-6 leading-tight">
              Space Industry Market Size 2026
            </h1>
            <p className="text-xl md:text-2xl text-star-200 leading-relaxed max-w-3xl mx-auto">
              Data, Trends &amp; Growth Forecasts for the Global Space Economy
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-star-300">
              <time dateTime="2026-02-08">Last updated: February 2026</time>
              <span className="hidden sm:inline text-star-300/40">|</span>
              <span>20 min read</span>
              <span className="hidden sm:inline text-star-300/40">|</span>
              <span>By SpaceNexus Research</span>
            </div>
            <div className="w-24 h-[3px] bg-gradient-to-r from-nebula-500 to-plasma-400 rounded-full mx-auto mt-8" />
          </div>
        </header>

        {/* ── Main content area ── */}
        <div className="container mx-auto px-4 pb-20">
          <div className="flex flex-col lg:flex-row gap-10 max-w-7xl mx-auto">
            {/* ── Table of Contents (sidebar) ── */}
            <aside className="lg:w-64 shrink-0">
              <nav
                aria-label="Table of Contents"
                className="lg:sticky lg:top-24 card p-5"
              >
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                  Contents
                </h2>
                <ol className="space-y-2 text-sm">
                  {TOC.map((item, i) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="flex items-start gap-2 text-star-300 hover:text-cyan-400 transition-colors"
                      >
                        <span className="text-cyan-500/60 font-mono text-xs mt-0.5">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            {/* ── Article content ── */}
            <article className="min-w-0 flex-1 max-w-3xl">
              {/* ──────────────────────────────────── */}
              {/* 1. Market Overview                   */}
              {/* ──────────────────────────────────── */}
              <section id="overview" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Market Overview
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The global space economy has entered a period of sustained, accelerating growth.
                    What was a $280 billion industry in 2010 has more than doubled, surpassing $630
                    billion in 2025 according to the Space Foundation&apos;s annual report and
                    corroborated by Euroconsult&apos;s Space Economy Report. The industry is on track
                    to exceed $670 billion in 2026, driven by commercial satellite broadband expansion,
                    increasing government defense space budgets, and the maturation of downstream
                    data services.
                  </p>
                  <p>
                    This guide provides a detailed breakdown of where the money flows within the space
                    economy, which segments are growing fastest, and what leading analysts project
                    for the decade ahead. Whether you are an investor evaluating space opportunities,
                    a business development professional identifying addressable markets, or a policy
                    analyst tracking government spending, this data-driven overview will provide the
                    context you need.
                  </p>
                  <p>
                    All figures cited in this guide are drawn from publicly available reports from
                    the Satellite Industry Association (SIA), the Space Foundation, Euroconsult,
                    BryceTech, the Aerospace Industries Association (AIA), and financial institutions
                    including Morgan Stanley and Bank of America. Where figures are estimates or
                    projections, they are noted as such.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 2. Total Market Size                 */}
              {/* ──────────────────────────────────── */}
              <section id="total-market" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Total Market Size: The $630 Billion Space Economy
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The most commonly cited figure for the global space economy comes from the Space
                    Foundation, which estimated the total at over $630 billion for 2025. This number
                    encompasses four broad categories: government space budgets, commercial space
                    revenues (including satellite services, launch, and manufacturing), ground
                    equipment and infrastructure, and downstream applications that depend on
                    space-derived data and signals.
                  </p>

                  {/* Data callout */}
                  <div className="card p-6 my-8 border-l-4 border-l-cyan-400">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-center">
                      <div>
                        <div className="text-3xl font-display font-bold text-cyan-400">$630B+</div>
                        <div className="text-star-300 text-sm mt-1">Total Space Economy (2025)</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-cyan-400">~60%</div>
                        <div className="text-star-300 text-sm mt-1">Commercial Share</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-cyan-400">~40%</div>
                        <div className="text-star-300 text-sm mt-1">Government Share</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-cyan-400">7-9%</div>
                        <div className="text-star-300 text-sm mt-1">Annual Growth Rate</div>
                      </div>
                    </div>
                  </div>

                  <p>
                    Euroconsult&apos;s Space Economy Report provides a complementary but slightly
                    different segmentation, estimating the &quot;core&quot; space economy (government
                    budgets plus commercial space industry revenues, excluding the broader downstream
                    ecosystem) at approximately $330 billion. The difference between the $330 billion
                    and $630 billion figures reflects how broadly one defines &quot;space economy&quot;
                    -- whether to include the downstream GPS, satellite TV, and data analytics
                    markets that depend on space infrastructure but operate primarily on the ground.
                  </p>
                  <p>
                    Regardless of which definition is used, the trajectory is clear: the space economy
                    has been growing at a compound annual rate of approximately 7 to 9 percent over
                    the past five years, substantially outpacing global GDP growth. The commercial
                    share has been steadily increasing, driven primarily by satellite broadband
                    (Starlink), Earth observation data services, and commercial launch.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 3. Sector Breakdown                  */}
              {/* ──────────────────────────────────── */}
              <section id="sector-breakdown" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Sector Breakdown
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The space economy is not monolithic. It consists of several distinct sectors, each
                    with different market dynamics, growth rates, and competitive structures. The
                    Satellite Industry Association&apos;s (SIA) annual State of the Satellite Industry
                    Report provides the most granular breakdown of the commercial satellite sector,
                    which forms the largest component of the commercial space economy.
                  </p>

                  {/* Sector table */}
                  <div className="card p-6 my-8 overflow-x-auto">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                      Space Economy Sector Sizes (2025 Estimates)
                    </h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-cyan-400/20 text-left">
                          <th className="py-2 pr-4 text-star-300 font-medium">Sector</th>
                          <th className="py-2 pr-4 text-star-300 font-medium text-right">Est. Revenue</th>
                          <th className="py-2 text-star-300 font-medium text-right">Growth Rate</th>
                        </tr>
                      </thead>
                      <tbody className="text-star-200">
                        <tr className="border-b border-cyan-400/10">
                          <td className="py-2 pr-4">Satellite Services</td>
                          <td className="py-2 pr-4 text-right text-cyan-400 font-semibold">$113B</td>
                          <td className="py-2 text-right">~8%</td>
                        </tr>
                        <tr className="border-b border-cyan-400/10">
                          <td className="py-2 pr-4">Ground Equipment</td>
                          <td className="py-2 pr-4 text-right text-cyan-400 font-semibold">$145B</td>
                          <td className="py-2 text-right">~5%</td>
                        </tr>
                        <tr className="border-b border-cyan-400/10">
                          <td className="py-2 pr-4">Satellite Manufacturing</td>
                          <td className="py-2 pr-4 text-right text-cyan-400 font-semibold">$19B</td>
                          <td className="py-2 text-right">~12%</td>
                        </tr>
                        <tr className="border-b border-cyan-400/10">
                          <td className="py-2 pr-4">Launch Services</td>
                          <td className="py-2 pr-4 text-right text-cyan-400 font-semibold">$9B</td>
                          <td className="py-2 text-right">~15%</td>
                        </tr>
                        <tr className="border-b border-cyan-400/10">
                          <td className="py-2 pr-4">Government Budgets (Global)</td>
                          <td className="py-2 pr-4 text-right text-cyan-400 font-semibold">$117B</td>
                          <td className="py-2 text-right">~6%</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4">Other (downstream, PNT ecosystem)</td>
                          <td className="py-2 pr-4 text-right text-cyan-400 font-semibold">$230B+</td>
                          <td className="py-2 text-right">~9%</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="text-star-300/60 text-xs mt-4">
                      Sources: SIA State of the Satellite Industry Report (2025), Euroconsult, Space Foundation. Figures rounded.
                    </p>
                  </div>

                  <p>
                    The SIA reports that the satellite industry alone -- encompassing satellite
                    services, satellite manufacturing, the launch industry, and ground equipment --
                    generated approximately $285 billion in 2024 revenues. Within this total,
                    satellite services (the revenue generated by satellite operators selling
                    connectivity, broadcasting, and data products) is the largest component at
                    roughly $113 billion.
                  </p>
                  <p>
                    Ground equipment -- the consumer devices, network equipment, and infrastructure
                    that receive and process satellite signals -- represents the second-largest
                    segment at approximately $145 billion. This includes GNSS devices, satellite
                    terminals (such as Starlink dishes), and VSAT equipment.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 4. Satellite Services                */}
              {/* ──────────────────────────────────── */}
              <section id="satellite-services" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Satellite Services: The Largest Commercial Segment
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    Satellite services remain the engine of the commercial space economy. The SIA
                    estimates this segment at approximately $113 billion in 2024 revenues, though
                    this figure is likely conservative given the rapid growth of SpaceX&apos;s
                    Starlink, which does not publicly report detailed financial results.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Satellite Broadband
                  </h3>
                  <p>
                    Satellite broadband is the fastest-growing sub-segment within satellite services.
                    SpaceX&apos;s Starlink constellation, with over 6,000 satellites deployed and
                    millions of subscribers, is estimated to be generating $6 billion to $8 billion
                    in annual recurring revenue as of late 2025, based on industry estimates and
                    secondary market disclosures. Amazon&apos;s Project Kuiper has begun deploying
                    its planned 3,236-satellite constellation. Eutelsat OneWeb operates approximately
                    630 satellites in medium Earth orbit, primarily serving enterprise and government
                    customers.
                  </p>
                  <p>
                    The addressable market for satellite broadband is enormous: an estimated 3 billion
                    people worldwide lack reliable internet access, and satellite broadband can serve
                    maritime, aviation, and remote enterprise markets that terrestrial infrastructure
                    cannot economically reach. Analysts at Morgan Stanley project satellite broadband
                    revenues could reach $80 billion to $100 billion annually by 2030.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Earth Observation &amp; Remote Sensing
                  </h3>
                  <p>
                    The Earth observation (EO) market is estimated at approximately $5 billion to $7
                    billion for imagery and data products, with the broader EO analytics market
                    (including AI-powered insights derived from satellite imagery) adding several
                    billion more. Key operators include Planet Labs (daily global coverage with its
                    SuperDove and SkySat constellations), Maxar Technologies (now owned by Advent
                    International, providing high-resolution optical imagery), and SAR specialists
                    Capella Space and ICEYE.
                  </p>
                  <p>
                    Growth in the EO sector is driven by increasing demand from agriculture,
                    insurance, financial services, climate monitoring, and defense and intelligence
                    customers. AI and machine learning are enabling automated analysis of satellite
                    imagery at scale, unlocking applications from supply chain monitoring to methane
                    emissions detection.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Satellite Television &amp; Radio
                  </h3>
                  <p>
                    Satellite television remains a substantial revenue generator, though the segment
                    is in structural decline as consumers shift to terrestrial streaming services.
                    The SIA reported satellite TV revenues at approximately $73 billion in recent
                    years, but the trend is downward at roughly 3 to 5 percent annually. Major
                    operators including DirecTV, Dish Network, and SES are adapting by shifting
                    capacity toward broadband and enterprise services.
                  </p>

                  <p className="mt-4">
                    <Link href="/market-intel" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Explore real-time satellite market data on SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 5. Launch Services Market             */}
              {/* ──────────────────────────────────── */}
              <section id="launch-market" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Launch Services Market
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The global launch services market was valued at approximately $9 billion in 2024
                    according to BryceTech and the SIA, making it one of the smaller sectors by
                    revenue but one of the most strategically important -- everything else in the
                    space economy depends on the ability to reach orbit.
                  </p>

                  <div className="card p-6 my-8 border-l-4 border-l-nebula-400">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                      <div>
                        <div className="text-3xl font-display font-bold text-nebula-300">230+</div>
                        <div className="text-star-300 text-sm mt-1">Orbital Launches (2025)</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-nebula-300">~65%</div>
                        <div className="text-star-300 text-sm mt-1">SpaceX Market Share</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-nebula-300">$9B</div>
                        <div className="text-star-300 text-sm mt-1">Launch Market Revenue</div>
                      </div>
                    </div>
                  </div>

                  <p>
                    SpaceX dominates the global launch market with an estimated 60 to 65 percent
                    share of commercial launches by mass to orbit. The company conducted over 130
                    orbital launches in 2025, an unprecedented cadence made possible by the reusable
                    Falcon 9 first stage, which has now flown individual boosters more than 20 times.
                    SpaceX&apos;s internal launch costs are estimated at $15 million to $20 million
                    per Falcon 9 mission, a fraction of the listed commercial price of $67 million.
                  </p>
                  <p>
                    Other significant launch providers include Rocket Lab (Electron, with 50+ cumulative
                    launches, and the forthcoming Neutron medium-lift vehicle), China&apos;s CASC
                    (Long March family, representing the second-most-active national launch program),
                    Arianespace (Ariane 6, which entered service in 2024), ULA (Vulcan Centaur, the
                    successor to Atlas V and Delta IV), and Blue Origin (New Glenn, currently in
                    early flight testing).
                  </p>
                  <p>
                    The launch market is expected to grow significantly as satellite constellation
                    deployments continue, national security launch demand increases, and new vehicle
                    classes -- particularly SpaceX&apos;s Starship and Rocket Lab&apos;s Neutron --
                    open new market segments through lower per-kilogram pricing and larger payload
                    capacity.
                  </p>

                  <p className="mt-4">
                    <Link href="/mission-cost" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Compare launch costs and plan missions on SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 6. Ground Equipment                  */}
              {/* ──────────────────────────────────── */}
              <section id="ground-equipment" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Ground Equipment &amp; Infrastructure
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    Ground equipment represents the largest single segment in the SIA&apos;s
                    satellite industry taxonomy at approximately $145 billion. This category
                    encompasses all the hardware and infrastructure required to receive, process, and
                    utilize satellite signals on the ground.
                  </p>
                  <p>
                    GNSS (Global Navigation Satellite System) devices represent the largest
                    sub-category, reflecting the ubiquity of GPS and related positioning technology
                    in smartphones, vehicles, drones, precision agriculture equipment, and surveying
                    instruments. The GNSS device market alone is estimated at over $100 billion
                    annually by the European GNSS Agency (EUSPA).
                  </p>
                  <p>
                    Satellite terminals -- including the millions of Starlink user terminals
                    manufactured by SpaceX, VSAT systems for maritime and enterprise use, and
                    satellite phone handsets -- form a growing sub-segment. SpaceX has reportedly
                    manufactured over 5 million Starlink dishes, each initially costing the company
                    an estimated $1,300 to produce (though costs have reportedly decreased
                    significantly through manufacturing optimization).
                  </p>
                  <p>
                    Ground station networks operated by companies like AWS Ground Station, Microsoft
                    Azure Orbital, and KSAT (Kongsberg Satellite Services) provide the infrastructure
                    for satellite operators to communicate with their spacecraft. This segment is
                    growing as the number of satellites in orbit increases.
                  </p>

                  <p className="mt-4">
                    <Link href="/satellites" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Track satellite constellations and ground stations on SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 7. Government Spending               */}
              {/* ──────────────────────────────────── */}
              <section id="government-spending" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Government Space Spending
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    Government space budgets worldwide totaled approximately $117 billion in 2025,
                    according to Euroconsult&apos;s Government Space Programs report. This represents
                    continued growth from approximately $103 billion in 2023 and $92 billion in 2022.
                    The trend is broadly upward across all major spacefaring nations, driven by
                    national security concerns, scientific ambitions, and the recognition of space
                    as critical infrastructure.
                  </p>

                  <div className="card p-6 my-8">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                      Top Government Space Budgets (2025 Estimates)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">United States (Total)</span>
                        <span className="text-cyan-400 font-semibold">~$73B</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">China (est.)</span>
                        <span className="text-cyan-400 font-semibold">~$14B</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">Europe (ESA + national)</span>
                        <span className="text-cyan-400 font-semibold">~$12B</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">Japan</span>
                        <span className="text-cyan-400 font-semibold">~$4.5B</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">India</span>
                        <span className="text-cyan-400 font-semibold">~$2B</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">Rest of World</span>
                        <span className="text-cyan-400 font-semibold">~$11.5B</span>
                      </div>
                    </div>
                    <p className="text-star-300/60 text-xs mt-4">
                      Sources: Euroconsult Government Space Programs 2025, national budget documents. U.S. total includes NASA, Space Force, NRO, SDA, and other agencies.
                    </p>
                  </div>

                  <p>
                    The United States is by far the largest government space spender, with a combined
                    total of approximately $73 billion across NASA (~$25 billion), the U.S. Space
                    Force and Space Development Agency (~$30 billion), the National Reconnaissance
                    Office (classified, estimated at $15-20 billion), and space-related activities
                    at NOAA, the FAA, and other agencies. U.S. government space spending has been
                    growing at roughly 5 to 7 percent annually, driven primarily by national security
                    space priorities.
                  </p>
                  <p>
                    China is the second-largest government space spender, though exact figures are
                    difficult to determine due to limited transparency. Euroconsult estimates
                    China&apos;s government space budget at approximately $14 billion. China has been
                    expanding rapidly, operating the Tiangong space station, deploying the BeiDou
                    navigation constellation, building its own broadband satellite constellation
                    (Guowang, planned for 13,000+ satellites), and pursuing an ambitious lunar and
                    Mars exploration program.
                  </p>

                  <p className="mt-4">
                    <Link href="/business-opportunities" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Track government procurement opportunities on SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 8. Regional Analysis                 */}
              {/* ──────────────────────────────────── */}
              <section id="regional-analysis" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Regional Analysis
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <h3 className="text-xl font-semibold text-white mt-4 mb-3">
                    North America
                  </h3>
                  <p>
                    North America -- primarily the United States -- accounts for roughly half of
                    global space economy revenues. The U.S. dominates in launch services (SpaceX,
                    Rocket Lab, ULA, Blue Origin), satellite broadband (Starlink, Kuiper), Earth
                    observation (Planet Labs, Maxar, BlackSky), and government spending. The U.S.
                    space industry directly employs an estimated 360,000 people, according to the
                    Bureau of Labor Statistics and industry surveys, with hundreds of thousands more
                    in the broader aerospace supply chain.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Europe
                  </h3>
                  <p>
                    Europe&apos;s space sector is anchored by ESA and the major national space agencies
                    (CNES in France, DLR in Germany, ASI in Italy, UKSA in the UK). The European
                    commercial space sector includes Arianespace (launch services), Airbus Defence
                    and Space and Thales Alenia Space (satellite manufacturing), SES and Eutelsat
                    (satellite operators), and a growing NewSpace ecosystem. The European Commission
                    has been increasing its space budget through programs like Copernicus (Earth
                    observation) and Galileo (navigation).
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Asia-Pacific
                  </h3>
                  <p>
                    The Asia-Pacific region is the fastest-growing space market. Beyond China and
                    Japan, India&apos;s ISRO continues to demonstrate exceptional cost efficiency
                    and has opened its space sector to private companies, with startups like Skyroot
                    Aerospace and Agnikul Cosmos developing indigenous launch vehicles. South Korea
                    has established the Korea AeroSpace Administration (KASA) and is building
                    commercial space capabilities. Australia, New Zealand, and Singapore are also
                    growing their space sectors through regulatory reform and strategic investment.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Middle East &amp; Africa
                  </h3>
                  <p>
                    The UAE has emerged as a notable space actor, operating the Hope Mars orbiter,
                    investing in commercial space ventures through Mubadala and other sovereign
                    wealth vehicles, and establishing the Mohammed Bin Rashid Space Centre. Saudi
                    Arabia has invested in satellite operator Arabsat and recently established a
                    national space commission. Africa&apos;s space sector is growing, with countries
                    including Nigeria, Kenya, Rwanda, and South Africa developing national space
                    programs and regulatory frameworks.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 9. Growth Drivers                    */}
              {/* ──────────────────────────────────── */}
              <section id="growth-drivers" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Key Growth Drivers
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    Understanding what is propelling the space economy&apos;s growth is critical for
                    investors, companies, and policymakers. The following factors represent the most
                    significant near-term growth drivers:
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    1. Falling Launch Costs
                  </h3>
                  <p>
                    The cost of reaching low Earth orbit has fallen by approximately 90 percent over
                    the past two decades, from roughly $60,000 per kilogram on the Space Shuttle to
                    under $3,000 per kilogram on SpaceX&apos;s Falcon 9. If Starship achieves its
                    cost targets, per-kilogram costs could fall below $100 -- a reduction that would
                    fundamentally reshape the economics of every space application. Cheaper access to
                    orbit enables more satellites, more frequent replacement cycles, and entirely new
                    applications that were previously uneconomical.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    2. Satellite Broadband Constellations
                  </h3>
                  <p>
                    Mega-constellations are the single largest commercial growth driver. Starlink is
                    projected to generate $10 billion or more in annual revenue within the next few
                    years. Amazon&apos;s Kuiper, which has an authorized $10 billion-plus investment,
                    will add further competition and capacity. The combined broadband satellite market
                    is projected to grow from approximately $7 billion in 2024 to $40 billion or more
                    by 2030, driven by enterprise, maritime, aviation, and consumer demand.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    3. National Security Demand
                  </h3>
                  <p>
                    Government defense and intelligence agencies worldwide are increasing space
                    spending in response to geopolitical competition. The U.S. Space Development
                    Agency&apos;s Proliferated Warfighter Space Architecture (PWSA) alone involves
                    hundreds of satellites for missile tracking and communication. Allied nations
                    including the UK, Japan, Australia, and NATO partners are investing in resilient
                    space capabilities, creating demand for commercial launch, satellite
                    manufacturing, and ground systems.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    4. Data &amp; Analytics
                  </h3>
                  <p>
                    The downstream market for space-derived data is enormous and growing. McKinsey
                    estimates that the geospatial analytics market could reach $100 billion by 2030.
                    AI-powered analysis of satellite imagery is enabling applications across
                    agriculture, insurance, finance, climate monitoring, supply chain management, and
                    urban planning. As more satellites launch and resolution improves, the data
                    available for analysis expands correspondingly.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    5. Emerging Market Segments
                  </h3>
                  <p>
                    Several nascent market segments could add tens of billions to the space economy
                    over the coming decade. These include on-orbit servicing (satellite life extension,
                    debris removal), in-space manufacturing, commercial space stations (replacing
                    the ISS), the cislunar economy (lunar missions and resource utilization),
                    direct-to-device satellite connectivity, and space-based solar power research.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 10. Market Forecasts                 */}
              {/* ──────────────────────────────────── */}
              <section id="forecasts" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Market Forecasts: The Road to $1.8 Trillion
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    Multiple financial institutions and research firms have published long-range
                    forecasts for the space economy. While specific numbers vary based on methodology
                    and market definition, the directional consensus is clear: the space economy is
                    expected to roughly triple by 2035.
                  </p>

                  <div className="card p-6 my-8 border-l-4 border-l-rocket-500">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                      Major Space Economy Forecasts
                    </h3>
                    <div className="space-y-4 text-sm">
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">Morgan Stanley (2023)</span>
                        <span className="text-rocket-400 font-semibold">$1.8T by 2035</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">Bank of America (2023)</span>
                        <span className="text-rocket-400 font-semibold">$1.4T by 2030</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">Euroconsult (2024)</span>
                        <span className="text-rocket-400 font-semibold">$737B core by 2033</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">McKinsey &amp; Company (2024)</span>
                        <span className="text-rocket-400 font-semibold">$1.8T by 2035</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-star-300">Space Foundation (2025)</span>
                        <span className="text-rocket-400 font-semibold">$1T+ by 2030</span>
                      </div>
                    </div>
                    <p className="text-star-300/60 text-xs mt-4">
                      Note: Differences in figures reflect varying market definitions (core vs. extended ecosystem) and forecast dates.
                    </p>
                  </div>

                  <p>
                    Morgan Stanley&apos;s widely cited $1.8 trillion projection (by 2035) assumes
                    satellite broadband becomes a $400 billion revenue stream, with the bulk of
                    remaining growth coming from Earth observation data services, launch, and
                    government spending. Bank of America&apos;s more aggressive $1.4 trillion by
                    2030 estimate includes the broader ecosystem of downstream applications.
                  </p>
                  <p>
                    The key uncertainty in these projections centers on satellite broadband adoption
                    rates, the pace of launch cost reduction (particularly whether Starship achieves
                    near-target economics), and government budget trajectories. Downside risks
                    include orbital congestion concerns, potential regulatory constraints on mega-
                    constellations, and geopolitical disruptions. Upside scenarios involve faster
                    adoption of direct-to-device connectivity, breakthrough in-space manufacturing
                    applications, or accelerated cislunar development.
                  </p>

                  <p className="mt-4">
                    <Link href="/market-intel" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Track market forecasts and analytics on SpaceNexus Market Intelligence
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 11. Investment Flows                 */}
              {/* ──────────────────────────────────── */}
              <section id="investment-flows" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Venture Capital &amp; Investment Flows
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    Private investment in space companies has been a critical enabler of the
                    industry&apos;s commercial growth. According to Space Capital&apos;s quarterly
                    reports and BryceTech&apos;s annual Start-Up Space analysis, venture capital
                    investment in space infrastructure companies has totaled over $70 billion
                    cumulatively since 2012.
                  </p>
                  <p>
                    Annual VC investment peaked at approximately $17 billion in 2021 (inflated by
                    SPAC transactions) and normalized to approximately $8 to $10 billion annually
                    in 2023-2025. While this represents a decline from the SPAC-era peak, it
                    remains well above pre-2020 levels and reflects healthy, sustainable investor
                    interest in the sector.
                  </p>
                  <p>
                    Investment is concentrated in several key areas: launch vehicles, satellite
                    broadband, Earth observation and analytics, on-orbit services, and space-related
                    AI and software. The U.S. attracts the majority of space venture funding, but
                    European, Indian, and other Asia-Pacific space startups are drawing increasing
                    investment.
                  </p>
                  <p>
                    For public market investors, the space investment landscape includes pure-play
                    public companies (Rocket Lab, Planet Labs, Spire Global, BlackSky), space-focused
                    ETFs (Procure Space ETF/UFO, ARK Space Exploration/ARKX), defense primes with
                    large space divisions (Lockheed Martin, Northrop Grumman, L3Harris), and
                    secondary market access to private companies like SpaceX.
                  </p>

                  <p className="mt-4">
                    <Link href="/space-economy" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Explore space economy data and startup tracking on SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 12. Data Sources & Methodology       */}
              {/* ──────────────────────────────────── */}
              <section id="methodology" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Data Sources &amp; Methodology
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The space industry lacks a single, universally agreed-upon market sizing
                    methodology. Different organizations define the &quot;space economy&quot;
                    differently, leading to varying headline figures. Understanding these
                    differences is important for accurate interpretation.
                  </p>
                  <p>
                    <strong className="text-white">The Space Foundation</strong> uses the broadest
                    definition, including all commercial space revenue (satellite services, launch,
                    manufacturing, ground equipment), government budgets, and downstream applications
                    that depend on space infrastructure. This produces the largest figure (~$630B).
                  </p>
                  <p>
                    <strong className="text-white">The Satellite Industry Association (SIA)</strong>{' '}
                    focuses specifically on the satellite industry: satellite services, satellite
                    manufacturing, launch industry, and ground equipment. Their 2024 total was
                    approximately $285 billion.
                  </p>
                  <p>
                    <strong className="text-white">Euroconsult</strong> reports both a
                    &quot;core&quot; space economy (government + commercial upstream) and a broader
                    figure. Their core estimate is approximately $330 billion.
                  </p>
                  <p>
                    <strong className="text-white">BryceTech</strong> focuses on the orbital launch
                    market and publishes detailed launch manifest and market data. They also produce
                    the annual &quot;Start-Up Space&quot; report on venture capital flows.
                  </p>
                  <p>
                    This guide uses a synthesis of these sources, noting the specific source where
                    precision matters. All projected figures are identified as estimates or forecasts
                    and should not be taken as guarantees of future market size.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 13. SpaceNexus CTA                   */}
              {/* ──────────────────────────────────── */}
              <section id="spacenexus" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Track Space Market Data on SpaceNexus
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    SpaceNexus provides real-time space market intelligence that goes beyond static
                    reports. Our{' '}
                    <Link href="/market-intel" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Market Intelligence module
                    </Link>{' '}
                    delivers company analytics, startup funding tracking, market trend dashboards,
                    and economy overviews updated continuously from authoritative data sources.
                  </p>
                  <p>
                    Whether you are an investor evaluating space opportunities, a business
                    development professional sizing addressable markets, a journalist researching
                    industry trends, or a policy analyst tracking government spending, SpaceNexus
                    provides the data infrastructure you need.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  {[
                    { name: 'Market Intelligence', href: '/market-intel', desc: 'Company analytics, market trends, economy dashboards' },
                    { name: 'Space Economy', href: '/space-economy', desc: 'Macro-level space economy data and analysis' },
                    { name: 'Space Capital', href: '/space-capital', desc: 'VC investors, startups, and matchmaking' },
                    { name: 'Business Opportunities', href: '/business-opportunities', desc: 'Government contracts and procurement tracking' },
                  ].map((mod) => (
                    <Link
                      key={mod.href}
                      href={mod.href}
                      className="card-interactive p-4 block"
                    >
                      <div className="font-semibold text-white text-sm">{mod.name}</div>
                      <div className="text-star-300 text-xs mt-1">{mod.desc}</div>
                    </Link>
                  ))}
                </div>

                <div className="mt-8 text-center">
                  <Link href="/register" className="btn-primary">
                    Get Started Free
                  </Link>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* FAQ                                  */}
              {/* ──────────────────────────────────── */}
              <section className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-3">
                  {FAQ_ITEMS.map((item, i) => (
                    <details key={i} className="card group">
                      <summary className="cursor-pointer p-5 flex items-center justify-between text-white font-medium select-none list-none [&::-webkit-details-marker]:hidden">
                        <span>{item.q}</span>
                        <span
                          aria-hidden="true"
                          className="ml-4 shrink-0 text-cyan-400 transition-transform group-open:rotate-45 text-xl leading-none"
                        >
                          +
                        </span>
                      </summary>
                      <div className="px-5 pb-5 text-star-200 leading-relaxed">
                        {item.a}
                      </div>
                    </details>
                  ))}
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* Newsletter CTA                       */}
              {/* ──────────────────────────────────── */}
              <section className="card p-8 md:p-12 text-center glow-border">
                <h2 className="text-display-sm font-display font-bold text-white mb-4">
                  Stay Ahead of the Space Economy
                </h2>
                <p className="text-star-200 text-lg mb-8 max-w-2xl mx-auto">
                  Get weekly space market intelligence delivered to your inbox. Track the data
                  that matters for investment, business, and policy decisions.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/register" className="btn-primary">
                    Create Free Account
                  </Link>
                  <Link href="/market-intel" className="btn-secondary">
                    Explore Market Data
                  </Link>
                </div>
              </section>
            </article>
          </div>
        </div>
      </div>
    </>
  );
}
