import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Commercial Space Economy Overview: Industries, Revenue & Opportunities | SpaceNexus Guide',
  description:
    'Explore the commercial space economy: satellite broadband, Earth observation, launch, in-space manufacturing, and emerging space industries.',
  keywords: [
    'commercial space economy',
    'space industry revenue',
    'commercial satellite market',
    'space business opportunities',
    'NewSpace economy',
    'satellite broadband market',
    'Earth observation market',
    'space startup ecosystem',
    'space industry sectors',
    'commercial space companies',
  ],
  openGraph: {
    title: 'Commercial Space Economy Overview: Industries, Revenue & Opportunities',
    description:
      'Explore the commercial space economy: satellite broadband, EO, launch, manufacturing, and the emerging space business landscape.',
    type: 'article',
    publishedTime: '2026-02-08T00:00:00Z',
    authors: ['SpaceNexus'],
  },
  alternates: {
    canonical: 'https://spacenexus.com/guide/commercial-space-economy',
  },
};

/* ------------------------------------------------------------------ */
/*  Table of Contents data                                            */
/* ------------------------------------------------------------------ */
const TOC = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'commercial-vs-government', label: 'Commercial vs. Government' },
  { id: 'satellite-broadband', label: 'Satellite Broadband' },
  { id: 'earth-observation', label: 'Earth Observation & Analytics' },
  { id: 'commercial-launch', label: 'Commercial Launch' },
  { id: 'manufacturing', label: 'Satellite Manufacturing' },
  { id: 'in-space-services', label: 'In-Space Services' },
  { id: 'space-stations', label: 'Commercial Space Stations' },
  { id: 'startups', label: 'The Startup Ecosystem' },
  { id: 'business-models', label: 'Space Business Models' },
  { id: 'opportunities', label: 'Business Opportunities' },
  { id: 'spacenexus', label: 'Explore the Space Economy on SpaceNexus' },
];

/* ------------------------------------------------------------------ */
/*  FAQ data                                                          */
/* ------------------------------------------------------------------ */
const FAQ_ITEMS = [
  {
    q: 'What is the commercial space economy?',
    a: 'The commercial space economy encompasses all private-sector revenue generated from space-related activities, including satellite services (broadband, broadcasting, Earth observation), satellite manufacturing, launch services, ground equipment, and emerging markets like in-space manufacturing and on-orbit servicing. It is distinct from government space budgets, though government contracts to commercial providers represent a significant overlap.',
  },
  {
    q: 'How big is the commercial space market?',
    a: 'The commercial space sector generates approximately $380 billion or more annually, representing roughly 60% of the total global space economy. This includes satellite services (~$113B), ground equipment (~$145B), satellite manufacturing (~$19B), and launch services (~$9B), plus a growing contribution from downstream data services and emerging in-space markets. These figures are from the SIA and Euroconsult.',
  },
  {
    q: 'What are the fastest-growing space businesses?',
    a: 'The fastest-growing commercial space segments include satellite broadband (30%+ annual growth driven by Starlink), Earth observation data analytics (15-20% growth), small satellite manufacturing (12-15% growth), commercial launch services (15% growth), and emerging sectors like on-orbit servicing and in-space manufacturing. The direct-to-device satellite connectivity market is also expanding rapidly as partnerships between satellite operators and mobile carriers mature.',
  },
  {
    q: 'How can I start a space company?',
    a: 'The barrier to entry in the space industry has decreased significantly. Opportunities exist across hardware (smallsats, components, ground equipment), software (mission planning, data analytics, SSA), services (launch brokerage, regulatory consulting, insurance), and data products (geospatial analytics, weather, maritime). Key steps include identifying a specific market need, understanding regulatory requirements (FCC, NOAA, FAA, ITAR/EAR), securing initial funding (government SBIR/STTR grants are a common starting point), and building a team with relevant technical and business expertise.',
  },
];

/* ------------------------------------------------------------------ */
/*  Structured data (JSON-LD)                                         */
/* ------------------------------------------------------------------ */
function buildStructuredData() {
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Commercial Space Economy Overview: Industries, Revenue & Opportunities',
    description:
      'Comprehensive overview of the commercial space economy including satellite broadband, Earth observation, launch services, and emerging space industries.',
    author: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.com' },
    publisher: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      logo: { '@type': 'ImageObject', url: 'https://spacenexus.com/logo.png' },
    },
    datePublished: '2026-02-08T00:00:00Z',
    dateModified: '2026-02-08T00:00:00Z',
    mainEntityOfPage: 'https://spacenexus.com/guide/commercial-space-economy',
    image: 'https://spacenexus.com/og-image.png',
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
export default function CommercialSpaceEconomyPage() {
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
              <span className="text-white">Commercial Space Economy</span>
            </div>
            <h1 className="text-display-lg md:text-display-xl font-display font-bold text-white mb-6 leading-tight">
              Commercial Space Economy Overview
            </h1>
            <p className="text-xl md:text-2xl text-star-200 leading-relaxed max-w-3xl mx-auto">
              Industries, Revenue Streams &amp; Business Opportunities in the New Space Age
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-star-300">
              <time dateTime="2026-02-08">Last updated: February 2026</time>
              <span className="hidden sm:inline text-star-300/40">|</span>
              <span>22 min read</span>
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
                    The commercial space economy is no longer a sideshow to government space
                    programs -- it is the main event. Commercial activities now account for
                    approximately 60 percent of the global space economy, generating over $380
                    billion in annual revenue. This shift from a government-dominated to a
                    commercially-driven space industry is the defining transformation of the
                    modern space age.
                  </p>
                  <p>
                    The drivers of this transformation are well established: dramatically lower
                    launch costs have made satellite deployment economically viable at unprecedented
                    scale; venture capital has funded a new generation of entrepreneurial space
                    companies; government agencies have embraced commercial procurement models;
                    and downstream applications of space data -- from GPS navigation to satellite
                    imagery analytics -- have become embedded in the global economy.
                  </p>
                  <p>
                    This guide maps the commercial space economy as it exists in 2026: the major
                    revenue-generating sectors, the companies leading each market, the emerging
                    business opportunities, and how the landscape is likely to evolve over the
                    coming decade. It is designed for business professionals, investors,
                    entrepreneurs, and analysts who need a thorough understanding of where
                    commercial space revenue comes from and where it is going.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 2. Commercial vs. Government         */}
              {/* ──────────────────────────────────── */}
              <section id="commercial-vs-government" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Commercial vs. Government Space
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <div className="card p-6 my-8 border-l-4 border-l-cyan-400">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                      <div>
                        <div className="text-3xl font-display font-bold text-cyan-400">~60%</div>
                        <div className="text-star-300 text-sm mt-1">Commercial Share</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-cyan-400">~40%</div>
                        <div className="text-star-300 text-sm mt-1">Government Share</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-cyan-400">$380B+</div>
                        <div className="text-star-300 text-sm mt-1">Commercial Revenue</div>
                      </div>
                    </div>
                  </div>

                  <p>
                    The boundary between &quot;commercial&quot; and &quot;government&quot; space is
                    increasingly blurred. Many commercial space companies derive a significant
                    portion of their revenue from government contracts. SpaceX, for example,
                    generates substantial revenue from NASA (Commercial Crew, Commercial Cargo,
                    Artemis HLS) and the U.S. Space Force (NSSL launches, Starshield). Planet Labs
                    derives a significant share of its revenue from defense and intelligence
                    customers. This public-private interplay is a defining feature of the modern
                    space economy.
                  </p>
                  <p>
                    What distinguishes the &quot;commercial space economy&quot; is the presence of
                    market-driven business models -- companies that sell products and services to
                    customers (whether government or private) based on competition, innovation, and
                    commercial terms, rather than operating as cost-plus government contractors.
                    The shift toward fixed-price contracts, venture-funded startups, and commercial
                    off-the-shelf (COTS) space technology has been the driving force behind the
                    industry&apos;s growth and cost reduction.
                  </p>
                  <p>
                    NASA&apos;s embrace of commercial partnerships has been particularly important.
                    The Commercial Orbital Transportation Services (COTS) program, which funded
                    SpaceX and Orbital Sciences to develop cargo vehicles for the ISS, is widely
                    regarded as one of the most successful public-private partnerships in U.S.
                    government history. The model has since been replicated in Commercial Crew,
                    Commercial Lunar Payload Services (CLPS), and commercial space station
                    development programs.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 3. Satellite Broadband               */}
              {/* ──────────────────────────────────── */}
              <section id="satellite-broadband" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Satellite Broadband: The Dominant Growth Engine
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    Satellite broadband is the single largest driver of commercial space economy
                    growth. The convergence of low-cost LEO access, mass-produced satellites, and
                    phased-array terminal technology has created a viable business case for
                    providing global internet connectivity from space -- something that was
                    economically impossible a decade ago.
                  </p>

                  <div className="card p-6 my-8 border-l-4 border-l-nebula-400">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                      <div>
                        <div className="text-3xl font-display font-bold text-nebula-300">6,000+</div>
                        <div className="text-star-300 text-sm mt-1">Starlink Satellites Deployed</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-nebula-300">$6-8B</div>
                        <div className="text-star-300 text-sm mt-1">Starlink Annual Revenue (est.)</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-nebula-300">4M+</div>
                        <div className="text-star-300 text-sm mt-1">Starlink Subscribers (est.)</div>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    SpaceX Starlink
                  </h3>
                  <p>
                    Starlink is the largest satellite constellation in history and the dominant player
                    in LEO broadband. With over 6,000 operational satellites, an estimated 4+ million
                    subscribers, and annual recurring revenue estimated at $6-8 billion (based on
                    pricing and subscriber estimates), Starlink has single-handedly created a
                    multi-billion dollar market. The service provides internet speeds of 50-250 Mbps
                    with latencies of 20-40 ms, competitive with many terrestrial broadband options
                    and vastly superior to legacy satellite internet (GEO-based, with 600+ ms latency).
                  </p>
                  <p>
                    Starlink serves consumer, enterprise, maritime, aviation, and government
                    customers. The maritime segment has been particularly successful, with major
                    cruise lines, shipping companies, and yacht operators adopting the service.
                    Starlink Aviation provides in-flight connectivity to airlines. Starlink
                    Business offers dedicated service tiers for enterprise customers. The
                    government-focused Starshield variant provides secure services to defense
                    and intelligence agencies.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Amazon Project Kuiper
                  </h3>
                  <p>
                    Amazon&apos;s Project Kuiper is the most significant competitor to Starlink,
                    with FCC authorization for 3,236 satellites and an investment commitment
                    exceeding $10 billion. Kuiper began prototype satellite launches in late 2023
                    and started constellation deployment in 2025. Amazon brings formidable advantages
                    including AWS integration (providing ground infrastructure and cloud computing
                    at edge locations), an established enterprise sales force, and deep financial
                    resources. The competitive dynamics between Starlink and Kuiper will shape the
                    satellite broadband market for the next decade.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Direct-to-Device (D2D) Connectivity
                  </h3>
                  <p>
                    One of the most commercially significant emerging applications is direct-to-device
                    satellite connectivity, which enables standard smartphones to connect to
                    satellite networks without specialized equipment. SpaceX and T-Mobile have
                    partnered to provide text messaging via Starlink satellites, with voice and data
                    capabilities planned. AST SpaceMobile is developing large-aperture satellites
                    (BlueBird constellation) designed to provide broadband connectivity directly to
                    unmodified smartphones. Apple&apos;s Emergency SOS via Satellite feature (powered
                    by Globalstar) has already demonstrated consumer demand for satellite-smartphone
                    integration.
                  </p>

                  <p className="mt-4">
                    <Link href="/space-economy" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Track satellite broadband market data on SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 4. Earth Observation & Analytics     */}
              {/* ──────────────────────────────────── */}
              <section id="earth-observation" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Earth Observation &amp; Geospatial Analytics
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    Earth observation (EO) is one of the most commercially dynamic sectors of the
                    space economy. The combination of cheap satellites, AI-powered analytics, and
                    growing demand for geospatial intelligence has created a market estimated at
                    $5-7 billion for imagery and data products, with the broader analytics market
                    adding several billion more.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Optical Imagery
                  </h3>
                  <p>
                    <strong className="text-white">Planet Labs (PL)</strong> operates the largest
                    fleet of Earth-imaging satellites, with over 200 SuperDove satellites providing
                    daily global coverage at 3-5 meter resolution and SkySat satellites providing
                    sub-meter resolution tasking capability. Planet&apos;s annual revenue is
                    approximately $220 million (FY2025) and growing at roughly 15% annually.
                  </p>
                  <p>
                    <strong className="text-white">Maxar Technologies</strong> (now private, owned
                    by Advent International) operates the WorldView and Legion satellite
                    constellations, providing the highest commercially available optical resolution
                    at approximately 30 cm. Maxar is a primary imagery supplier to the U.S.
                    intelligence community through the EnhancedView/EOCL contract.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Synthetic Aperture Radar (SAR)
                  </h3>
                  <p>
                    SAR satellites can image the Earth through clouds, at night, and in all weather
                    conditions -- capabilities that optical satellites cannot match. <strong className="text-white">
                    ICEYE</strong> (Finland) and <strong className="text-white">Capella Space</strong>{' '}
                    (U.S.) are the leading commercial SAR operators, each operating constellations
                    of small SAR satellites. The ability to detect changes on the ground regardless
                    of weather or lighting makes SAR particularly valuable for defense, maritime
                    monitoring, infrastructure monitoring, and disaster response.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Analytics &amp; AI
                  </h3>
                  <p>
                    The real value creation in Earth observation is increasingly in the analytics
                    layer -- using AI and machine learning to extract actionable insights from
                    satellite imagery at scale. Companies like <strong className="text-white">
                    BlackSky (BKSY)</strong> combine satellite imagery with other data sources
                    (social media, maritime AIS, RF signals) to provide real-time geospatial
                    intelligence. Orbital Insight, Descartes Labs (now part of Uber Freight), and
                    RS Metrics are pure analytics companies that process satellite imagery for
                    specific vertical applications.
                  </p>
                  <p>
                    Applications include agricultural yield prediction and crop monitoring,
                    insurance risk assessment and claims verification, supply chain monitoring
                    (tracking ships, rail, and truck activity), financial intelligence (monitoring
                    retail parking lots, oil storage, construction activity), climate and
                    environmental monitoring (deforestation, methane emissions, ice coverage),
                    and defense intelligence and military planning.
                  </p>

                  <p className="mt-4">
                    <Link href="/market-intel" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Track EO companies and market data on SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 5. Commercial Launch                 */}
              {/* ──────────────────────────────────── */}
              <section id="commercial-launch" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Commercial Launch Services
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The commercial launch market has been transformed by SpaceX&apos;s dominance and
                    the entry of multiple new competitors. The total commercial launch market
                    (excluding government-only missions) is estimated at approximately $6-7 billion
                    annually, with SpaceX capturing 60-65% of the addressable market.
                  </p>
                  <p>
                    The commercial launch landscape is increasingly segmented by vehicle class:
                  </p>

                  <div className="card p-6 my-8">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                      Launch Market Segments
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="border-b border-cyan-400/10 pb-2">
                        <span className="text-white font-medium">Super Heavy-Lift</span>
                        <span className="text-star-300"> (Starship, SLS) -- &gt;50,000 kg to LEO. For mega-constellations, deep space, and heavy government payloads.</span>
                      </div>
                      <div className="border-b border-cyan-400/10 pb-2">
                        <span className="text-white font-medium">Heavy-Lift</span>
                        <span className="text-star-300"> (Falcon Heavy, New Glenn) -- 20,000-65,000 kg to LEO. For large GEO satellites, national security missions.</span>
                      </div>
                      <div className="border-b border-cyan-400/10 pb-2">
                        <span className="text-white font-medium">Medium-Lift</span>
                        <span className="text-star-300"> (Falcon 9, Ariane 6, Vulcan, Neutron) -- 10,000-25,000 kg to LEO. The workhorse segment for most commercial missions.</span>
                      </div>
                      <div>
                        <span className="text-white font-medium">Small-Lift</span>
                        <span className="text-star-300"> (Electron, Alpha, RS1) -- &lt;1,500 kg to LEO. For dedicated smallsat missions requiring precise orbit placement.</span>
                      </div>
                    </div>
                  </div>

                  <p>
                    The commercial launch market is expected to grow significantly through 2030,
                    driven by continued mega-constellation deployment, increasing government
                    procurement of commercial launch services, and new demand created by lower
                    per-kilogram costs. However, SpaceX&apos;s dominant position and the entry
                    of Starship (which could capture much of the medium-lift market on rideshare
                    missions) will put intense competitive pressure on other providers.
                  </p>

                  <p className="mt-4">
                    <Link href="/mission-cost" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Compare launch providers and costs on SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 6. Satellite Manufacturing           */}
              {/* ──────────────────────────────────── */}
              <section id="manufacturing" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Satellite Manufacturing
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The satellite manufacturing sector is estimated at approximately $19 billion
                    annually (SIA, 2024). This includes traditional large GEO satellite manufacturing
                    (led by Airbus Defence and Space, Thales Alenia Space, Lockheed Martin, Northrop
                    Grumman, and Maxar), as well as the rapidly growing small and medium satellite
                    manufacturing market.
                  </p>
                  <p>
                    The mega-constellation era has transformed satellite manufacturing. SpaceX has
                    built the world&apos;s highest-volume satellite production line, manufacturing
                    Starlink satellites at a rate of 40-60 per week at its facility in Redmond,
                    Washington. This mass-production approach, borrowing techniques from automotive
                    manufacturing, has driven per-satellite costs down to an estimated $250,000-
                    $500,000 -- a fraction of traditional satellite costs which run $100 million
                    to $500 million for large GEO platforms.
                  </p>
                  <p>
                    The small satellite (smallsat) market has grown dramatically. Companies like
                    York Space Systems, Terran Orbital (now part of Lockheed Martin), and Rocket
                    Lab (which manufactures spacecraft in addition to rockets) produce standardized
                    bus platforms that reduce cost and delivery times. Rocket Lab&apos;s Photon
                    and Pioneer spacecraft buses have been used for missions from LEO Earth
                    observation to deep space (the CAPSTONE cislunar mission).
                  </p>

                  <p className="mt-4">
                    <Link href="/space-manufacturing" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Explore space manufacturing on SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 7. In-Space Services                 */}
              {/* ──────────────────────────────────── */}
              <section id="in-space-services" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  In-Space Services: Servicing, Manufacturing &amp; Logistics
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    In-space services represent one of the most exciting emerging commercial
                    markets. This category encompasses on-orbit servicing (satellite life extension,
                    inspection, repair), active debris removal, in-space manufacturing, and space
                    logistics (transportation between orbits).
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    On-Orbit Servicing
                  </h3>
                  <p>
                    <strong className="text-white">Northrop Grumman</strong> pioneered commercial
                    on-orbit servicing with its Mission Extension Vehicle (MEV) program. MEV-1 and
                    MEV-2 docked with operational GEO satellites to extend their lives by providing
                    station-keeping propulsion. The next-generation Mission Extension Pod (MEP)
                    provides a more compact life extension solution. The economic case is
                    compelling: extending a $300 million GEO satellite&apos;s life by five years
                    through a $15-20 million servicing mission represents extraordinary return on
                    investment for the satellite operator.
                  </p>
                  <p>
                    <strong className="text-white">Astroscale</strong> (Japan/UK) is focused on
                    end-of-life servicing and debris removal. The company has demonstrated
                    proximity operations and docking capabilities and has contracts from the UK
                    Space Agency, JAXA, and ESA. <strong className="text-white">Starfish Space</strong>{' '}
                    is developing autonomous servicing vehicles using electric propulsion for precise
                    proximity operations.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    In-Space Manufacturing
                  </h3>
                  <p>
                    Manufacturing in microgravity offers unique advantages for certain materials
                    and products. <strong className="text-white">Varda Space Industries</strong> has
                    demonstrated the ability to manufacture pharmaceutical crystals in orbit and
                    return them to Earth in a reentry capsule -- a potential multi-billion dollar
                    market if specific drugs can be manufactured more effectively in microgravity.
                    <strong className="text-white"> Redwire Corporation</strong> operates 3D printing
                    and manufacturing facilities on the ISS and is developing commercial
                    manufacturing capabilities for the post-ISS era. <strong className="text-white">
                    Space Forge</strong> (UK) is developing reusable satellite platforms for
                    manufacturing advanced semiconductor materials in microgravity.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Space Logistics
                  </h3>
                  <p>
                    As the number of objects and activities in orbit grows, there is increasing
                    demand for in-space transportation services -- moving payloads between orbits,
                    providing last-mile delivery from rideshare drop-off orbits to operational
                    orbits, and eventually servicing cislunar infrastructure. D-Orbit&apos;s ION
                    Satellite Carrier provides orbital transfer services for smallsats. Impulse
                    Space is developing orbital transfer vehicles using high-performance propulsion.
                    Momentus provides in-space transportation using water plasma propulsion.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 8. Commercial Space Stations         */}
              {/* ──────────────────────────────────── */}
              <section id="space-stations" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Commercial Space Stations
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The International Space Station (ISS) is scheduled for retirement around 2030,
                    and NASA is actively supporting the development of commercial space station
                    replacements. This represents a multi-billion dollar market opportunity and a
                    fundamental shift in how humans operate in low Earth orbit.
                  </p>
                  <p>
                    NASA awarded Commercial LEO Destinations (CLD) contracts to three teams:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>
                      <strong className="text-white">Axiom Space:</strong> Building a module that will
                      initially attach to the ISS before detaching to become a free-flying station.
                      Axiom has already conducted multiple private astronaut missions to the ISS and
                      is developing a suite of commercial and government services.
                    </li>
                    <li>
                      <strong className="text-white">Blue Origin / Sierra Space (Orbital Reef):</strong>{' '}
                      A partnership to develop a commercial space station combining Blue Origin&apos;s
                      orbital infrastructure with Sierra Space&apos;s inflatable habitat technology and
                      Dream Chaser spaceplane for crew and cargo transport.
                    </li>
                    <li>
                      <strong className="text-white">Starlab (Voyager Space / Airbus):</strong> A
                      continuously crewed commercial station developed by Voyager Space in partnership
                      with Airbus Defence and Space, targeting scientific research, technology
                      demonstration, and manufacturing applications.
                    </li>
                  </ul>
                  <p>
                    Revenue models for commercial space stations include government anchor tenancy
                    (NASA purchasing crew time and research capabilities), in-space manufacturing,
                    pharmaceutical research, materials science, media and entertainment, and
                    space tourism. The challenge is achieving sufficient utilization and revenue
                    diversification to sustain operations without heavy government subsidy.
                  </p>

                  <p className="mt-4">
                    <Link href="/space-stations" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Track space station developments on SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 9. The Startup Ecosystem             */}
              {/* ──────────────────────────────────── */}
              <section id="startups" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  The Space Startup Ecosystem
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The space startup ecosystem has matured significantly over the past decade.
                    According to BryceTech&apos;s Start-Up Space report, cumulative venture
                    investment in space startups has exceeded $70 billion since 2012, funding over
                    1,700 unique companies. While the pace moderated from the 2021 SPAC-era peak,
                    annual investment remains robust at $8-10 billion.
                  </p>

                  <div className="card p-6 my-8 border-l-4 border-l-rocket-500">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                      <div>
                        <div className="text-3xl font-display font-bold text-rocket-400">1,700+</div>
                        <div className="text-star-300 text-sm mt-1">Space Startups Funded</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-rocket-400">$70B+</div>
                        <div className="text-star-300 text-sm mt-1">Cumulative VC Investment</div>
                      </div>
                      <div>
                        <div className="text-3xl font-display font-bold text-rocket-400">$8-10B</div>
                        <div className="text-star-300 text-sm mt-1">Annual Investment (2024-25)</div>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Investor Landscape
                  </h3>
                  <p>
                    Space-focused venture funds include <strong className="text-white">Space Capital</strong>{' '}
                    (which tracks the space economy and invests broadly), <strong className="text-white">
                    Seraphim Space</strong> (one of the largest dedicated space funds), <strong className="text-white">
                    Airbus Ventures</strong>, and <strong className="text-white">In-Q-Tel</strong>{' '}
                    (the CIA&apos;s venture arm, which has backed numerous space companies). Major
                    generalist VC firms including Founders Fund, Andreessen Horowitz, and Khosla
                    Ventures have also made significant space investments.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Government Funding Pathways
                  </h3>
                  <p>
                    Government programs provide critical early-stage funding for space startups.
                    The SBIR (Small Business Innovation Research) and STTR (Small Business
                    Technology Transfer) programs award billions annually across DoD, NASA, and
                    other agencies. The Space Force&apos;s SpaceWERX program specifically targets
                    space technology startups. DIU (Defense Innovation Unit) provides rapid
                    prototyping contracts that help startups transition technology to government
                    customers. AFRL (Air Force Research Laboratory) and DARPA fund advanced
                    space technology development.
                  </p>

                  <p className="mt-4">
                    <Link href="/startups" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Track space startups and funding on SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 10. Space Business Models            */}
              {/* ──────────────────────────────────── */}
              <section id="business-models" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Space Business Models
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The commercial space economy encompasses several distinct business model types,
                    each with different economics, capital requirements, and risk profiles:
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Infrastructure Providers
                  </h3>
                  <p>
                    Companies that build and operate physical space infrastructure -- satellites,
                    launch vehicles, ground stations, and space stations. These businesses are
                    capital-intensive, require long development timelines, and carry significant
                    technical risk, but can generate large-scale recurring revenue once operational.
                    Examples: SpaceX, Rocket Lab, SES, Planet Labs, Axiom Space.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Data &amp; Analytics
                  </h3>
                  <p>
                    Companies that create value by processing and analyzing space-derived data.
                    These businesses are typically less capital-intensive than infrastructure
                    providers (they may not operate their own satellites) and can scale more
                    efficiently through software. Margins tend to be higher once the analytics
                    platform is developed. Examples: BlackSky, Spire Global, Orbital Insight,
                    HawkEye 360.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Component &amp; Subsystem Suppliers
                  </h3>
                  <p>
                    Companies that manufacture specialized components for spacecraft, launch
                    vehicles, and ground systems. This segment benefits from the overall growth
                    of the space economy without being tied to the success of any single mission
                    or constellation. Examples: Aerojet Rocketdyne (propulsion), Moog (actuators
                    and mechanisms), Teledyne (sensors), Mercury Systems (electronics).
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Services &amp; Software
                  </h3>
                  <p>
                    Companies providing mission support, regulatory consulting, insurance brokerage,
                    launch coordination, space situational awareness, and mission management
                    software. These businesses are the least capital-intensive and can scale quickly
                    with industry growth. Examples: Slingshot Aerospace, LeoLabs, ExoAnalytic,
                    COMSPOC, Spaceflight Inc.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 11. Business Opportunities           */}
              {/* ──────────────────────────────────── */}
              <section id="opportunities" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Business Opportunities in the Space Economy
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The rapid growth and expanding scope of the commercial space economy is creating
                    business opportunities across multiple dimensions:
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Supply Chain &amp; Manufacturing
                  </h3>
                  <p>
                    As satellite production scales from dozens to thousands per year, traditional
                    aerospace supply chains are being replaced by higher-volume manufacturing
                    approaches. Opportunities exist in automated testing equipment, mass-produced
                    space-qualified components, advanced materials, and manufacturing process
                    innovation. Companies that can bring automotive or consumer electronics
                    manufacturing efficiency to space hardware production are well positioned.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Government Contracting
                  </h3>
                  <p>
                    Government space budgets are growing, and agencies are increasingly procuring
                    from commercial providers rather than traditional cost-plus contractors. The
                    SDA alone is deploying hundreds of satellites through commercial procurements.
                    Companies that can navigate government procurement processes (SAM.gov, SBIR/STTR,
                    GSA schedules) while delivering commercial-pace innovation have significant
                    opportunities.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Space-Derived Data Applications
                  </h3>
                  <p>
                    The downstream market for space data applications is vastly larger than the
                    upstream space economy. Opportunities exist in applying satellite data to
                    specific vertical markets: precision agriculture, insurance underwriting,
                    financial intelligence, climate monitoring, urban planning, disaster response,
                    and logistics optimization. Many of these applications require domain expertise
                    in the target vertical as much as space technology expertise.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Professional Services
                  </h3>
                  <p>
                    The growing and increasingly regulated space industry needs professional
                    services including regulatory consulting (FCC, FAA, NOAA, ITAR), space insurance
                    brokerage, patent strategy, M&amp;A advisory, and specialized legal services.
                    These service businesses can be built with relatively modest capital investment.
                  </p>

                  <p className="mt-4">
                    <Link href="/business-opportunities" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Explore business opportunities on SpaceNexus
                    </Link>
                    {' '}&middot;{' '}
                    <Link href="/supply-chain" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Track the space supply chain
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 12. SpaceNexus CTA                   */}
              {/* ──────────────────────────────────── */}
              <section id="spacenexus" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Explore the Space Economy on SpaceNexus
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    SpaceNexus provides the data, analytics, and tools that space industry
                    professionals need to navigate the commercial space economy. From market
                    intelligence and startup tracking to supply chain analysis and government
                    procurement monitoring, our platform delivers actionable insights across
                    every sector of the space economy.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  {[
                    { name: 'Space Economy', href: '/space-economy', desc: 'Macro-level space economy data and trend analysis' },
                    { name: 'Market Intelligence', href: '/market-intel', desc: 'Company analytics, market trends, and competitive intelligence' },
                    { name: 'Startup Tracker', href: '/startups', desc: 'Venture funding, company profiles, and deal flow tracking' },
                    { name: 'Business Opportunities', href: '/business-opportunities', desc: 'Government contracts, RFPs, and procurement opportunities' },
                    { name: 'Supply Chain', href: '/supply-chain', desc: 'Space supply chain mapping and vendor intelligence' },
                    { name: 'Space Talent Hub', href: '/space-talent', desc: 'Space industry jobs and workforce analytics' },
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
                  Navigate the Commercial Space Economy
                </h2>
                <p className="text-star-200 text-lg mb-8 max-w-2xl mx-auto">
                  Get the intelligence you need to succeed in the space industry. Market data,
                  company analytics, funding trends, and business opportunities -- all in one
                  platform.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/register" className="btn-primary">
                    Create Free Account
                  </Link>
                  <Link href="/space-economy" className="btn-secondary">
                    Explore Space Economy Data
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
