import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 3600; // ISR: revalidate every hour

export const metadata: Metadata = {
  title: 'Complete Guide to the Space Industry 2026 | Markets, Tech & Opportunities',
  description:
    'Comprehensive guide to the $630B+ space industry. Learn about market size, key companies, government programs, emerging trends, careers, and investment opportunities in space.',
  keywords: [
    'space industry',
    'space economy',
    'space industry guide 2026',
    'space market size',
    'space companies',
    'space careers',
    'space investment',
    'commercial space',
    'NewSpace',
  ],
  openGraph: {
    title: 'The Complete Guide to the Space Industry in 2026',
    description:
      'Everything you need to know about the $630B+ space economy: markets, companies, trends, careers, and opportunities.',
    type: 'article',
    publishedTime: '2026-02-08T00:00:00Z',
    authors: ['SpaceNexus'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/guide/space-industry',
  },
};

/* ------------------------------------------------------------------ */
/*  Table of Contents data                                            */
/* ------------------------------------------------------------------ */
const TOC = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'market-size', label: 'Market Size & Growth' },
  { id: 'key-sectors', label: 'Key Sectors' },
  { id: 'major-companies', label: 'Major Companies' },
  { id: 'government-programs', label: 'Government Programs' },
  { id: 'emerging-trends', label: 'Emerging Trends' },
  { id: 'careers', label: 'Career Opportunities' },
  { id: 'investment', label: 'Investment Landscape' },
  { id: 'spacenexus', label: 'How SpaceNexus Helps' },
  { id: 'faq', label: 'FAQ' },
];

/* ------------------------------------------------------------------ */
/*  FAQ data                                                          */
/* ------------------------------------------------------------------ */
const FAQ_ITEMS = [
  {
    q: 'How big is the space industry?',
    a: 'The global space economy was valued at an estimated $630 billion or more in 2025, according to figures from the Space Foundation and Euroconsult. This encompasses government space budgets, commercial satellite services, launch revenues, ground equipment, and a growing array of downstream applications.',
  },
  {
    q: 'How fast is the space industry growing?',
    a: 'The space economy has been growing at roughly 7 to 9 percent annually over the past several years. Analysts at Morgan Stanley, Bank of America, and others project the global space economy could reach $1.8 trillion by 2035, driven by broadband constellations, reusable launch vehicles, and national security demand.',
  },
  {
    q: 'What are the main sectors of the space industry?',
    a: 'The major sectors include launch services, satellite communications, Earth observation and remote sensing, navigation and positioning (GPS/GNSS), space exploration, in-space manufacturing, on-orbit servicing and debris removal, and ground systems and equipment. Satellite communications remains the largest commercial segment by revenue.',
  },
  {
    q: 'Who are the biggest space companies?',
    a: 'SpaceX is the dominant private launch provider and satellite operator (Starlink). Among publicly traded companies, Rocket Lab (RKLB), Planet Labs (PL), and L3Harris are notable pure-play or significant space firms. Major defense primes with large space divisions include Lockheed Martin, Northrop Grumman, Boeing, and RTX (Raytheon). Blue Origin, backed by Jeff Bezos, is a significant private player.',
  },
  {
    q: 'How much does NASA spend?',
    a: 'NASA\'s annual budget has been approximately $25 billion in recent fiscal years. Major programs include Artemis (lunar exploration), the Commercial Crew and Commercial Cargo programs (supporting ISS operations via SpaceX and others), the Mars Sample Return effort, and a broad portfolio of science missions and technology development.',
  },
  {
    q: 'Is space a good career?',
    a: 'Yes. The space industry faces a growing talent shortage across engineering, software, data science, policy, and business roles. Salaries tend to be competitive with the broader aerospace and tech sectors. Entry-level aerospace engineers typically earn $75,000 to $95,000, while experienced systems engineers and program managers can earn $140,000 to $200,000 or more. The field is expanding well beyond traditional rocket science into areas like data analytics, cybersecurity, and regulatory affairs.',
  },
  {
    q: 'How can I invest in space?',
    a: 'Public market options include individual stocks (Rocket Lab, Planet Labs, Spire Global, BlackSky, L3Harris, Northrop Grumman, Lockheed Martin), space-focused ETFs such as the Procure Space ETF (UFO) and ARK Space Exploration & Innovation ETF (ARKX), and indirectly through large-cap companies with space divisions. SpaceX equity is available through secondary markets or select venture funds, though at a premium. Private market participation is possible via space-focused venture funds.',
  },
  {
    q: 'What is the cislunar economy?',
    a: 'The cislunar economy refers to commercial and governmental activity in the region between Earth and the Moon, including lunar orbit. Key drivers include NASA\'s Artemis program, the planned Lunar Gateway station, Commercial Lunar Payload Services (CLPS) contracts, and growing international interest in lunar resources. Multiple countries and private companies are planning lunar landers, surface habitats, and resource utilization missions.',
  },
  {
    q: 'What is New Space vs Old Space?',
    a: '"Old Space" refers to the legacy aerospace industry dominated by large government contractors like Lockheed Martin, Boeing, and Northrop Grumman, which historically operated on cost-plus government contracts. "New Space" (or "NewSpace") describes the wave of entrepreneurial, venture-backed companies like SpaceX, Rocket Lab, Planet Labs, and Relativity Space that emphasize speed, cost reduction, vertical integration, and commercial markets. In practice, the distinction is blurring as traditional primes adopt more agile practices and New Space companies win government contracts.',
  },
  {
    q: 'How is AI being used in space?',
    a: 'AI and machine learning are increasingly central to space operations. Applications include autonomous satellite operations and collision avoidance, real-time Earth observation image analysis, predictive maintenance for spacecraft and ground systems, mission planning optimization, space weather forecasting, signal processing for communications, and natural language processing for regulatory analysis. AI is also being used to process the enormous data volumes generated by large satellite constellations.',
  },
];

/* ------------------------------------------------------------------ */
/*  Structured data (JSON-LD)                                         */
/* ------------------------------------------------------------------ */
function buildStructuredData() {
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline:
      'The Complete Guide to the Space Industry in 2026: Markets, Technologies & Opportunities',
    description:
      'Comprehensive guide to the $630B+ space industry covering market size, key companies, government programs, emerging trends, careers, and investment opportunities.',
    author: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
    publisher: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' },
    },
    datePublished: '2026-02-08T00:00:00Z',
    dateModified: '2026-02-08T00:00:00Z',
    mainEntityOfPage: 'https://spacenexus.us/guide/space-industry',
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
export default function SpaceIndustryGuidePage() {
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
          {/* Background gradient */}
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
              <span className="text-white">Space Industry Guide</span>
            </div>
            <h1 className="text-display-lg md:text-display-xl font-display font-bold text-white mb-6 leading-tight">
              The Complete Guide to the Space Industry in 2026
            </h1>
            <p className="text-xl md:text-2xl text-star-200 leading-relaxed max-w-3xl mx-auto">
              Markets, Technologies &amp; Opportunities
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-star-300">
              <time dateTime="2026-02-08">February 8, 2026</time>
              <span className="hidden sm:inline text-star-300/40">|</span>
              <span>25 min read</span>
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
              {/* 1. Introduction                     */}
              {/* ──────────────────────────────────── */}
              <section id="introduction" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Introduction
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The space industry is undergoing a transformation unlike anything seen since the
                    Apollo era. What was once the exclusive domain of government agencies and a
                    handful of defense contractors has evolved into a dynamic commercial ecosystem
                    generating hundreds of billions of dollars in annual revenue.
                  </p>
                  <p>
                    The global space economy surpassed an estimated $630 billion in 2025, according
                    to the Space Foundation, and analysts project it could reach $1.8 trillion by
                    2035. Driving this growth are falling launch costs, the proliferation of
                    broadband satellite constellations, expanding national security space budgets,
                    and a new generation of entrepreneurial companies tackling everything from
                    orbital manufacturing to lunar logistics.
                  </p>
                  <p>
                    This guide provides a comprehensive overview of the space industry as it stands
                    in 2026: the market size and where the money flows, the companies shaping the
                    future, the government programs underwriting exploration, the emerging trends to
                    watch, and how you can participate -- whether as a professional, investor, or
                    informed observer.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 2. Market Size & Growth              */}
              {/* ──────────────────────────────────── */}
              <section id="market-size" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Space Economy Market Size &amp; Growth
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The global space economy has grown steadily over the past decade. According to
                    estimates from the Space Foundation and Euroconsult, the total value reached
                    approximately $630 billion or more in 2025, encompassing government budgets,
                    commercial revenues, and the broader ecosystem of ground equipment and
                    downstream services.
                  </p>

                  {/* Data callout */}
                  <div className="card p-6 my-8 border-l-4 border-l-cyan-400">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                      <div>
                        <div className="text-3xl font-display font-bold text-cyan-400">$630B+</div>
                        <div className="text-star-300 text-sm mt-1">Global Space Economy (2025 est.)</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-cyan-400">7-9%</div>
                        <div className="text-star-300 text-sm mt-1">Annual Growth Rate</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-cyan-400">$1.8T</div>
                        <div className="text-star-300 text-sm mt-1">Projected by 2035</div>
                      </div>
                    </div>
                  </div>

                  <p>
                    A key structural shift over the past two decades has been the growing share of
                    commercial activity. Government space spending still accounts for a significant
                    portion of the economy -- roughly 40 percent of the total -- but the commercial
                    sector now generates an estimated 60 percent or more of overall space-related
                    revenue. This ratio continues to tilt toward commercial as broadband
                    constellations, commercial launch, and downstream data services expand.
                  </p>
                  <p>
                    Several forces are driving growth. First, the cost of reaching orbit has fallen
                    dramatically thanks to reusable rockets -- SpaceX&apos;s Falcon 9 has reduced
                    per-kilogram launch costs by roughly an order of magnitude compared to
                    expendable vehicles of the previous era. Second, broadband satellite
                    constellations like Starlink are creating entirely new revenue streams in
                    connectivity. Third, government investment in space -- particularly national
                    security space -- has increased significantly, with the U.S. Space Force and
                    allied nations ramping up spending on resilient space architectures.
                  </p>
                  <p>
                    Projections from Morgan Stanley, Bank of America, and other financial
                    institutions estimate the space economy could reach between $1.4 trillion and
                    $1.8 trillion by 2035. The bulk of this growth is expected to come from
                    satellite broadband, Earth observation data services, and in-space
                    infrastructure.
                  </p>
                  <p>
                    <Link href="/market-intel" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Explore real-time space market data on SpaceNexus Market Intelligence
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 3. Key Sectors                       */}
              {/* ──────────────────────────────────── */}
              <section id="key-sectors" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Key Sectors of the Space Industry
                </h2>
                <div className="space-y-6 text-star-200 leading-relaxed text-lg">
                  {/* Launch Services */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="text-2xl" aria-hidden="true">&#x1F680;</span>
                      Launch Services
                    </h3>
                    <p>
                      The launch sector has been revolutionized by reusability. SpaceX dominates the
                      global launch market, conducting over 90 orbital launches in 2024 alone and
                      continuing to increase cadence with the Falcon 9 and Falcon Heavy. The
                      company&apos;s Starship super heavy-lift vehicle, under active development,
                      promises to further reduce costs and dramatically increase payload capacity.
                    </p>
                    <p className="mt-3">
                      Rocket Lab has established itself as the leading dedicated small-launch
                      provider with its Electron rocket and is developing the medium-lift Neutron
                      vehicle. Blue Origin&apos;s New Glenn, a large reusable rocket, has entered
                      flight testing. Europe&apos;s Ariane 6, developed by ArianeGroup for ESA,
                      provides independent European access to space. Other notable entrants include
                      Relativity Space (Terran R), Firefly Aerospace (Alpha and the MLV
                      medium-launch vehicle), and ULA&apos;s Vulcan Centaur.
                    </p>
                  </div>

                  {/* Satellite Communications */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="text-2xl" aria-hidden="true">&#x1F4E1;</span>
                      Satellite Communications
                    </h3>
                    <p>
                      Satellite broadband is the largest growth driver in the commercial space
                      economy. SpaceX&apos;s Starlink constellation has deployed over 6,000
                      satellites and serves millions of subscribers worldwide, generating billions in
                      annual revenue. Eutelsat OneWeb operates a medium-Earth orbit constellation for
                      enterprise and government connectivity. Amazon&apos;s Project Kuiper has begun
                      satellite production and deployment with plans for over 3,200 satellites.
                    </p>
                    <p className="mt-3">
                      Direct-to-device (D2D) satellite connectivity is an emerging frontier, with
                      partnerships between satellite operators and mobile carriers enabling
                      smartphone connectivity in areas without cell towers. T-Mobile and SpaceX,
                      along with AST SpaceMobile, are among the companies pursuing this market.
                    </p>
                  </div>

                  {/* Earth Observation */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="text-2xl" aria-hidden="true">&#x1F30D;</span>
                      Earth Observation &amp; Remote Sensing
                    </h3>
                    <p>
                      Earth observation (EO) is one of the fastest-growing space applications.
                      Planet Labs operates the largest constellation of Earth-imaging satellites,
                      providing daily global coverage. Maxar Technologies (now part of Advent
                      International) supplies high-resolution optical imagery used by governments and
                      commercial customers. Capella Space and ICEYE are expanding the
                      synthetic-aperture radar (SAR) market, providing all-weather, day-and-night
                      imaging.
                    </p>
                    <p className="mt-3">
                      The EO data analytics market is growing as AI and machine learning unlock new
                      insights from satellite imagery -- from supply chain monitoring and crop yield
                      prediction to climate change tracking and insurance risk assessment.
                    </p>
                  </div>

                  {/* Navigation */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="text-2xl" aria-hidden="true">&#x1F4CD;</span>
                      Navigation &amp; Positioning
                    </h3>
                    <p>
                      Global Navigation Satellite Systems (GNSS) -- including GPS (U.S.), Galileo
                      (EU), GLONASS (Russia), and BeiDou (China) -- underpin a downstream market
                      worth hundreds of billions of dollars. GPS modernization continues with the
                      GPS III satellite series, providing improved accuracy and resilience. The
                      commercial positioning, navigation, and timing (PNT) sector is growing as
                      industries from autonomous vehicles to precision agriculture demand
                      centimeter-level accuracy and resilient alternatives to GPS.
                    </p>
                  </div>
                </div>
                <p className="mt-6 text-star-200 text-lg">
                  <Link href="/satellites" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                    Track satellites and orbital operations
                  </Link>
                  {' '}&middot;{' '}
                  <Link href="/mission-cost" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                    Plan missions with cost estimation tools
                  </Link>
                </p>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 4. Major Companies                   */}
              {/* ──────────────────────────────────── */}
              <section id="major-companies" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Major Companies &amp; Market Positions
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The space industry features a mix of publicly traded companies, large defense
                    primes with space divisions, and high-profile private ventures. Understanding
                    the competitive landscape is essential for investors, job seekers, and business
                    development professionals.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Public &amp; High-Profile Companies
                  </h3>
                  <p>
                    <strong className="text-white">SpaceX</strong> remains the most influential
                    private space company. With a valuation reportedly exceeding $200 billion (based
                    on secondary market transactions), SpaceX operates the world&apos;s most active
                    launch vehicle (Falcon 9), the largest satellite constellation (Starlink), and is
                    developing Starship, intended for deep-space missions and eventually Mars
                    colonization.
                  </p>
                  <p>
                    <strong className="text-white">Rocket Lab (RKLB)</strong> is a publicly traded
                    end-to-end space company. Beyond its Electron small-launch vehicle, Rocket Lab
                    manufactures spacecraft, satellite components, and is developing the Neutron
                    medium-lift rocket. The company has won contracts from NASA, the U.S. Department
                    of Defense, and commercial customers.
                  </p>
                  <p>
                    <strong className="text-white">Planet Labs (PL)</strong> operates the largest
                    fleet of Earth observation satellites. <strong className="text-white">Spire
                    Global (SPIR)</strong> provides space-based data analytics for weather, maritime,
                    and aviation. <strong className="text-white">BlackSky (BKSY)</strong> offers
                    real-time geospatial intelligence and analytics.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Defense Primes &amp; Large Aerospace
                  </h3>
                  <p>
                    <strong className="text-white">Lockheed Martin</strong> is the largest defense
                    contractor by revenue and a major player in space through programs like the Orion
                    crew capsule (Artemis), GPS III satellites, and classified national security
                    systems. <strong className="text-white">Northrop Grumman</strong> supplies solid
                    rocket boosters for SLS, operates the Cygnus cargo vehicle for ISS resupply, and
                    pioneered on-orbit satellite servicing through its Mission Extension Vehicle
                    (MEV) program.
                  </p>
                  <p>
                    <strong className="text-white">Boeing</strong> builds the Space Launch System
                    (SLS) core stage and operates the Starliner crew capsule.{' '}
                    <strong className="text-white">L3Harris Technologies</strong> is a leading
                    provider of space-based sensors, payloads, and ground systems for national
                    security and civil applications.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Notable Private Companies
                  </h3>
                  <p>
                    <strong className="text-white">Blue Origin</strong>, founded by Jeff Bezos,
                    is developing the New Glenn orbital rocket and the Blue Moon lunar
                    lander selected by NASA for Artemis. <strong className="text-white">Relativity
                    Space</strong> is building 3D-printed rockets with its Terran R vehicle.{' '}
                    <strong className="text-white">Firefly Aerospace</strong> operates the Alpha
                    launch vehicle and is developing a medium-launch vehicle.{' '}
                    <strong className="text-white">Sierra Space</strong> is building the Dream
                    Chaser spaceplane for ISS cargo missions and is a partner in the proposed
                    Orbital Reef commercial space station.
                  </p>

                  <p className="mt-4">
                    <Link href="/market-intel" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Track space companies and market data on SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 5. Government Programs               */}
              {/* ──────────────────────────────────── */}
              <section id="government-programs" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Government Programs &amp; Budgets
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    Government spending remains a foundational pillar of the space economy. The
                    United States is by far the largest government spender on space, but other
                    nations are increasing their investments significantly.
                  </p>

                  {/* Data callout */}
                  <div className="card p-6 my-8 border-l-4 border-l-nebula-400">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-center">
                      <div>
                        <div className="text-3xl font-display font-bold text-nebula-300">~$25B</div>
                        <div className="text-star-300 text-sm mt-1">NASA Annual Budget</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-nebula-300">~$30B</div>
                        <div className="text-star-300 text-sm mt-1">U.S. Space Force &amp; NRO (est.)</div>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    NASA
                  </h3>
                  <p>
                    NASA&apos;s budget has been in the range of $25 billion annually in recent
                    fiscal years. The Artemis program -- aiming to return humans to the lunar
                    surface and establish sustained presence -- is the agency&apos;s flagship human
                    exploration initiative. Artemis relies on the Space Launch System (SLS), Orion
                    capsule, and commercial partners including SpaceX (Starship HLS) and Blue Origin
                    (Blue Moon) for lunar landers.
                  </p>
                  <p>
                    NASA&apos;s commercial programs are a major economic driver. Commercial Crew
                    (transporting astronauts to the ISS via SpaceX Crew Dragon and Boeing
                    Starliner), Commercial Cargo (ISS resupply), and Commercial Lunar Payload
                    Services (CLPS, delivering science and technology payloads to the Moon via
                    private landers) all channel significant funding to the private sector.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    U.S. Space Force &amp; National Security Space
                  </h3>
                  <p>
                    The U.S. Space Force, along with the National Reconnaissance Office (NRO) and
                    Space Development Agency (SDA), collectively spend an estimated $30 billion or
                    more annually on space capabilities. Priorities include resilient
                    satellite communications, missile warning and tracking constellations (such as
                    the SDA&apos;s Proliferated Warfighter Space Architecture), space domain
                    awareness, and responsive launch capabilities.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    International Programs
                  </h3>
                  <p>
                    The European Space Agency (ESA) operates with a budget of approximately
                    &euro;7.8 billion. Japan&apos;s JAXA is pursuing lunar exploration (SLIM lander,
                    Artemis partnership) and its own launch vehicle development (H3). India&apos;s
                    ISRO has demonstrated remarkable cost efficiency, with successful missions to
                    the Moon (Chandrayaan-3) and Mars, and is developing human spaceflight
                    capabilities (Gaganyaan). China&apos;s CNSA operates the Tiangong space station,
                    has returned lunar samples (Chang&apos;e-5, Chang&apos;e-6), and is pursuing an
                    ambitious program of Mars and deep-space exploration.
                  </p>

                  <p className="mt-4">
                    <Link href="/compliance" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Regulatory &amp; compliance tracking on SpaceNexus
                    </Link>
                    {' '}&middot;{' '}
                    <Link href="/business-opportunities" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Government procurement opportunities
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 6. Emerging Trends                   */}
              {/* ──────────────────────────────────── */}
              <section id="emerging-trends" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Emerging Trends
                </h2>
                <div className="space-y-6 text-star-200 leading-relaxed text-lg">
                  {/* Cislunar */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="text-2xl" aria-hidden="true">&#x1F319;</span>
                      The Cislunar Economy
                    </h3>
                    <p>
                      The region between Earth and the Moon is emerging as the next frontier for
                      commercial activity. NASA&apos;s Artemis program is the anchor tenant, with
                      the Lunar Gateway orbital station planned as a staging point for surface
                      missions. Commercial Lunar Payload Services (CLPS) contracts have been awarded
                      to companies including Intuitive Machines, Astrobotic, and Firefly to deliver
                      payloads to the lunar surface.
                    </p>
                    <p className="mt-2">
                      Multiple nations -- including India, Japan, South Korea, the UAE, and ESA
                      member states -- have active or planned lunar missions. The long-term vision
                      includes lunar resource utilization (particularly water ice at the poles),
                      which could provide propellant for deeper-space missions.
                    </p>
                  </div>

                  {/* In-Space Manufacturing */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="text-2xl" aria-hidden="true">&#x2699;</span>
                      In-Space Manufacturing
                    </h3>
                    <p>
                      Manufacturing in microgravity offers unique advantages for certain materials
                      and pharmaceuticals. Varda Space Industries has demonstrated the ability to
                      manufacture pharmaceutical crystals in orbit and return them to Earth. Redwire
                      Corporation operates manufacturing and research facilities on the ISS. Space
                      Forge (UK) is developing a reusable satellite platform for manufacturing
                      advanced semiconductor materials in space. While still in early stages, this
                      sector represents a potentially significant new market.
                    </p>
                  </div>

                  {/* Space Sustainability */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="text-2xl" aria-hidden="true">&#x267B;</span>
                      Space Sustainability &amp; Debris Removal
                    </h3>
                    <p>
                      With over 10,000 active satellites in orbit and tens of thousands of tracked
                      debris objects, space sustainability has become a critical concern.
                      Astroscale (Japan) is a pioneer in active debris removal, having demonstrated
                      proximity operations and docking with defunct satellites. ClearSpace
                      (Switzerland), under contract with ESA, is developing a mission to capture
                      and deorbit a piece of space debris. The growing need for space situational
                      awareness (SSA) and space traffic management is driving demand for both
                      government and commercial tracking services.
                    </p>
                  </div>

                  {/* On-Orbit Servicing */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="text-2xl" aria-hidden="true">&#x1F527;</span>
                      On-Orbit Servicing &amp; Assembly
                    </h3>
                    <p>
                      Extending the life of existing satellites through in-orbit servicing is a
                      growing market. Northrop Grumman&apos;s Mission Extension Vehicles (MEV-1 and
                      MEV-2) have successfully docked with and extended the lives of geostationary
                      satellites. Starfish Space is developing autonomous satellite servicing
                      vehicles. The long-term vision includes robotic assembly of large structures
                      in orbit, on-orbit refueling, and component replacement -- all of which would
                      fundamentally change how space infrastructure is built and maintained.
                    </p>
                  </div>

                  {/* Space Tourism */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                      <span className="text-2xl" aria-hidden="true">&#x1F30C;</span>
                      Space Tourism &amp; Human Spaceflight
                    </h3>
                    <p>
                      Space tourism has transitioned from concept to reality. Blue Origin&apos;s New
                      Shepard has carried paying passengers on suborbital flights. SpaceX has
                      conducted private orbital missions including Inspiration4 and the Polaris
                      program, and has announced future crewed missions including plans for
                      circumlunar flights. Virgin Galactic has conducted commercial suborbital
                      flights aboard SpaceShipTwo. Axiom Space has organized private missions to the
                      ISS and is developing modules for the planned first commercial space station.
                    </p>
                  </div>
                </div>

                <p className="mt-6 text-star-200 text-lg">
                  <Link href="/solar-exploration" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                    Explore solar system expansion on SpaceNexus
                  </Link>
                  {' '}&middot;{' '}
                  <Link href="/space-environment" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                    Monitor space environment and debris
                  </Link>
                </p>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 7. Career Opportunities              */}
              {/* ──────────────────────────────────── */}
              <section id="careers" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Career Opportunities in Space
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The space industry&apos;s rapid growth has created a significant talent
                    shortage. Companies across the sector are competing for engineers, software
                    developers, data scientists, policy experts, business development professionals,
                    and skilled manufacturing technicians.
                  </p>

                  {/* Salary callout */}
                  <div className="card p-6 my-8">
                    <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                      Estimated Salary Ranges (U.S., 2026)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">Aerospace Engineer (Entry)</span>
                        <span className="text-cyan-400 font-semibold">$75K - $95K</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">Aerospace Engineer (Senior)</span>
                        <span className="text-cyan-400 font-semibold">$120K - $160K</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">Systems Engineer</span>
                        <span className="text-cyan-400 font-semibold">$110K - $155K</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">Software Engineer (Space)</span>
                        <span className="text-cyan-400 font-semibold">$100K - $180K</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">Data Scientist / ML Engineer</span>
                        <span className="text-cyan-400 font-semibold">$110K - $175K</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">Program / Project Manager</span>
                        <span className="text-cyan-400 font-semibold">$120K - $200K</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">Space Policy / Regulatory</span>
                        <span className="text-cyan-400 font-semibold">$80K - $140K</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">GNC / Flight Dynamics</span>
                        <span className="text-cyan-400 font-semibold">$100K - $160K</span>
                      </div>
                    </div>
                    <p className="text-star-300/60 text-xs mt-4">
                      Ranges are approximate and vary by company, location, and experience. Source: industry surveys and job postings.
                    </p>
                  </div>

                  <p>
                    Breaking into the space industry no longer requires a PhD in aerospace
                    engineering. While technical roles in propulsion, guidance navigation and
                    control (GNC), and thermal systems remain in high demand, the industry also
                    needs software engineers (embedded systems, cloud, and full-stack), data
                    engineers and analysts, cybersecurity specialists, supply chain managers,
                    regulatory affairs professionals, and business analysts.
                  </p>
                  <p>
                    Key pathways include traditional aerospace engineering degrees, computer
                    science programs, internships at NASA centers or space companies, participation
                    in university CubeSat or rocketry projects, and industry conferences like
                    the SmallSat Conference, Space Symposium, and IAC (International Astronautical
                    Congress).
                  </p>

                  <p className="mt-4">
                    <Link href="/space-talent" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Find space jobs and workforce data on the Space Talent Hub
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 8. Investment Landscape              */}
              {/* ──────────────────────────────────── */}
              <section id="investment" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Investment &amp; Funding Landscape
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    Venture capital investment in space companies has averaged roughly $10 billion
                    or more per year in recent years, according to data from Space Capital and
                    BryceTech. While this represents a moderation from the peak SPAC-driven frenzy
                    of 2021, the underlying trend of growing private investment in space technology
                    remains strong.
                  </p>

                  <div className="card p-6 my-8 border-l-4 border-l-rocket-500">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                      <div>
                        <div className="text-3xl font-display font-bold text-rocket-400">$10B+</div>
                        <div className="text-star-300 text-sm mt-1">Annual VC Investment</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-rocket-400">$200B+</div>
                        <div className="text-star-300 text-sm mt-1">SpaceX Valuation (est.)</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-rocket-400">20+</div>
                        <div className="text-star-300 text-sm mt-1">Public Space Companies</div>
                      </div>
                    </div>
                  </div>

                  <p>
                    The SPAC wave of 2020-2021 brought numerous space companies to the public
                    markets, including Rocket Lab, Planet Labs, Spire Global, BlackSky, Virgin
                    Orbit, Astra, and Momentus. The results have been mixed: Rocket Lab and Planet
                    Labs have generally performed well and grown revenues, while several others
                    have struggled with execution challenges, and Virgin Orbit declared bankruptcy
                    in 2023. This experience has made public market investors more discerning about
                    space companies, placing greater emphasis on revenue growth, path to
                    profitability, and contract backlogs.
                  </p>
                  <p>
                    For individual investors, options include direct stock purchases in public space
                    companies, space-focused ETFs like the Procure Space ETF (UFO) and ARK Space
                    Exploration &amp; Innovation ETF (ARKX), and indirect exposure through defense
                    primes with significant space divisions. Private market access to companies like
                    SpaceX is possible through secondary market platforms and specialized venture
                    funds, though typically at premium valuations and with limited liquidity.
                  </p>

                  <p className="mt-4">
                    <Link href="/market-intel" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Track startup funding and market data on SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 9. How SpaceNexus Helps              */}
              {/* ──────────────────────────────────── */}
              <section id="spacenexus" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  How SpaceNexus Helps You Navigate the Space Industry
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    SpaceNexus is a comprehensive space industry intelligence platform designed for
                    professionals, investors, researchers, and enthusiasts who need to stay informed
                    about the rapidly evolving space economy. The platform aggregates data from
                    authoritative sources, provides analytical tools, and delivers actionable
                    insights across every major sector of the industry.
                  </p>
                  <p>
                    Whether you are tracking launch schedules, monitoring satellite constellations,
                    analyzing market trends, exploring government procurement opportunities, or
                    researching career options, SpaceNexus provides the data and tools you need in
                    one unified platform.
                  </p>
                </div>

                {/* Module grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  {[
                    { name: 'Mission Control', href: '/mission-control', desc: 'Real-time launch tracking and mission monitoring' },
                    { name: 'News & Media', href: '/news', desc: 'Aggregated space industry news and analysis' },
                    { name: 'Market Intelligence', href: '/market-intel', desc: 'Space economy data, company analytics, startup tracking' },
                    { name: 'Business Opportunities', href: '/business-opportunities', desc: 'Government contracts, procurement, supply chain' },
                    { name: 'Mission Planning', href: '/mission-cost', desc: 'Cost estimation, insurance, launch windows, vehicles' },
                    { name: 'Space Operations', href: '/satellites', desc: 'Satellite tracking, orbital management, constellations' },
                    { name: 'Space Talent Hub', href: '/space-talent', desc: 'Jobs board, workforce analytics, career resources' },
                    { name: 'Regulatory & Compliance', href: '/compliance', desc: 'Space law, licensing, spectrum management' },
                    { name: 'Solar System Expansion', href: '/solar-exploration', desc: 'Planetary missions, cislunar economy, asteroid tracking' },
                    { name: 'Space Environment', href: '/space-environment', desc: 'Solar weather, debris tracking, operational awareness' },
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
              {/* 10. FAQ                              */}
              {/* ──────────────────────────────────── */}
              <section id="faq" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-3">
                  {FAQ_ITEMS.map((item, i) => (
                    <details
                      key={i}
                      className="card group"
                    >
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
                  Subscribe to the SpaceNexus newsletter for weekly space industry analysis,
                  market data, and opportunities delivered to your inbox.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/register" className="btn-primary">
                    Create Free Account
                  </Link>
                  <Link href="/news" className="btn-secondary">
                    Browse Space News
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
