import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 3600; // ISR: revalidate every hour

export const metadata: Metadata = {
  title: 'Space Launch Cost Comparison 2026: Prices by Vehicle & Provider | SpaceNexus Guide',
  description:
    'Compare space launch costs across Falcon 9, Starship, Electron, Ariane 6, New Glenn, and more. Cost per kg data for every major vehicle.',
  keywords: [
    'space launch cost',
    'launch cost comparison',
    'rocket launch price',
    'Falcon 9 cost',
    'Starship launch cost',
    'cost per kilogram orbit',
    'launch vehicle comparison',
    'space launch market',
    'rocket cost per kg',
    'launch price 2026',
  ],
  openGraph: {
    title: 'Space Launch Cost Comparison 2026: Prices by Vehicle & Provider',
    description:
      'Compare space launch costs across all major vehicles. Cost per kg, payload capacity, and pricing data for Falcon 9, Starship, Electron, and more.',
    type: 'article',
    publishedTime: '2026-02-08T00:00:00Z',
    authors: ['SpaceNexus'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/guide/space-launch-cost-comparison',
  },
};

/* ------------------------------------------------------------------ */
/*  Table of Contents data                                            */
/* ------------------------------------------------------------------ */
const TOC = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'cost-revolution', label: 'The Cost Revolution' },
  { id: 'vehicle-comparison', label: 'Vehicle-by-Vehicle Comparison' },
  { id: 'cost-per-kg', label: 'Cost Per Kilogram Analysis' },
  { id: 'rideshare', label: 'Rideshare & Smallsat Pricing' },
  { id: 'government-pricing', label: 'Government Contract Pricing' },
  { id: 'hidden-costs', label: 'Hidden Costs & Total Mission Cost' },
  { id: 'cost-trends', label: 'Cost Trends & Future Outlook' },
  { id: 'choosing', label: 'Choosing a Launch Provider' },
  { id: 'spacenexus', label: 'Plan Missions on SpaceNexus' },
];

/* ------------------------------------------------------------------ */
/*  FAQ data                                                          */
/* ------------------------------------------------------------------ */
const FAQ_ITEMS = [
  {
    q: 'What is the cheapest rocket to launch to orbit?',
    a: 'On a cost-per-kilogram basis, SpaceX\'s Falcon 9 is currently the cheapest operational orbital launch vehicle, with commercial rideshare pricing starting at approximately $5,500 per kilogram to LEO. For dedicated missions, the Falcon 9 list price of $67 million translates to roughly $3,000 per kilogram for a full 22,800 kg payload to LEO. SpaceX\'s Starship, once fully operational, is expected to reduce costs further, potentially to $100-$500 per kilogram.',
  },
  {
    q: 'How much does a Falcon 9 launch cost?',
    a: 'SpaceX lists the Falcon 9 commercial launch price at $67 million for a dedicated mission. However, actual prices vary based on orbit, payload integration requirements, and contract terms. Rideshare missions on the Transporter series start at approximately $1.1 million for a 200 kg payload. Government missions (e.g., for the U.S. Space Force) are priced higher, with National Security Space Launch (NSSL) contracts valued at $100 million or more per mission.',
  },
  {
    q: 'How much does it cost to launch per kilogram?',
    a: 'Cost per kilogram varies dramatically by vehicle: Falcon 9 achieves roughly $2,700-$3,000/kg to LEO for a full payload, Electron costs approximately $25,000-$30,000/kg (small-sat premium), Ariane 6 is estimated at $8,000-$10,000/kg, and the Space Shuttle historically cost approximately $54,000/kg. Starship targets $100-$500/kg once operational at full cadence.',
  },
  {
    q: 'Why do small rockets cost more per kilogram?',
    a: 'Small launch vehicles like Electron have higher per-kilogram costs because many launch costs are relatively fixed regardless of payload size (ground operations, mission control, range fees, insurance). Dedicated small launch provides schedule flexibility and orbital specificity (precise orbit without compromise), which is worth the premium for many satellite operators. The alternative -- waiting for a rideshare slot on a larger rocket -- may cost less per kilogram but involves schedule uncertainty and orbit compromises.',
  },
];

/* ------------------------------------------------------------------ */
/*  Structured data (JSON-LD)                                         */
/* ------------------------------------------------------------------ */
function buildStructuredData() {
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Space Launch Cost Comparison 2026: Prices by Vehicle & Provider',
    description:
      'Comprehensive comparison of space launch costs across all major vehicles and providers, including cost per kilogram data and pricing trends.',
    author: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
    publisher: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' },
    },
    datePublished: '2026-02-08T00:00:00Z',
    dateModified: '2026-02-08T00:00:00Z',
    mainEntityOfPage: 'https://spacenexus.us/guide/space-launch-cost-comparison',
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
export default function SpaceLaunchCostComparisonPage() {
  const { article, faqSchema } = buildStructuredData();

  return (
    <>
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c') }}
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
              <span className="text-white">Launch Cost Comparison</span>
            </div>
            <h1 className="text-display-lg md:text-display-xl font-display font-bold text-white mb-6 leading-tight">
              Space Launch Cost Comparison 2026
            </h1>
            <p className="text-xl md:text-2xl text-star-200 leading-relaxed max-w-3xl mx-auto">
              Prices, Payload Capacity &amp; Cost Per Kilogram for Every Major Vehicle
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-star-300">
              <time dateTime="2026-02-08">Last updated: February 2026</time>
              <span className="hidden sm:inline text-star-300/40">|</span>
              <span>18 min read</span>
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
                    The cost of reaching orbit is the single most important economic variable in the
                    space industry. Launch cost determines the viability of satellite constellations,
                    the economics of in-space manufacturing, the pace of space exploration, and
                    ultimately how accessible space becomes as a domain for human activity.
                  </p>
                  <p>
                    Over the past two decades, launch costs have fallen dramatically -- driven
                    primarily by SpaceX&apos;s development of the reusable Falcon 9 rocket. Where
                    the Space Shuttle cost approximately $54,000 per kilogram to low Earth orbit
                    (LEO) and expendable vehicles of the 2000s cost $10,000-$20,000/kg, SpaceX has
                    brought the effective cost below $3,000/kg and is targeting sub-$500/kg with
                    Starship.
                  </p>
                  <p>
                    This guide provides a comprehensive comparison of launch costs across all major
                    operational and near-operational vehicles as of 2026. We cover listed prices,
                    estimated actual costs, cost-per-kilogram calculations, rideshare and smallsat
                    pricing, government contract pricing, and the hidden costs that go beyond the
                    launch sticker price. All figures are drawn from publicly available pricing data,
                    company disclosures, government contract values, and credible industry estimates.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 2. The Cost Revolution               */}
              {/* ──────────────────────────────────── */}
              <section id="cost-revolution" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  The Launch Cost Revolution
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    To appreciate the current landscape, it helps to understand the historical cost
                    trajectory. In the era of expendable launch vehicles (pre-2015), the cost of
                    reaching LEO was relatively stable at roughly $10,000 to $20,000 per kilogram for
                    medium-to-heavy lift vehicles, and significantly more for smaller dedicated
                    missions.
                  </p>

                  <div className="card p-6 my-8 border-l-4 border-l-cyan-400">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                      Historical Cost Per Kilogram to LEO
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">Space Shuttle (1981-2011)</span>
                        <span className="text-cyan-400 font-semibold">~$54,000/kg</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">Delta IV Heavy</span>
                        <span className="text-cyan-400 font-semibold">~$14,000/kg</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">Atlas V 551</span>
                        <span className="text-cyan-400 font-semibold">~$10,000/kg</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">Ariane 5</span>
                        <span className="text-cyan-400 font-semibold">~$9,000/kg</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">Falcon 9 (expendable, 2013)</span>
                        <span className="text-cyan-400 font-semibold">~$4,600/kg</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-star-300">Falcon 9 (reusable, 2026)</span>
                        <span className="text-cyan-400 font-semibold">~$2,700/kg</span>
                      </div>
                    </div>
                    <p className="text-star-300/60 text-xs mt-4">
                      Shuttle cost based on total program cost / total payload mass. Other figures based on listed price / max LEO payload. Approximate figures.
                    </p>
                  </div>

                  <p>
                    The key innovation was reusability. SpaceX&apos;s Falcon 9 first stage has been
                    recovered and reflown over 300 times in aggregate (with individual boosters
                    flying 20+ times), dramatically reducing the marginal cost of each launch. While
                    SpaceX does not publicly disclose its internal costs, estimates from financial
                    analysts and former SpaceX employees suggest the marginal cost of a Falcon 9
                    launch (with a reused booster) is approximately $15-20 million, significantly
                    below the $67 million list price. This margin funds development programs
                    including Starship and Starlink.
                  </p>
                  <p>
                    The economic impact extends well beyond SpaceX. Reduced launch costs have
                    enabled the deployment of mega-constellations (Starlink&apos;s 6,000+ satellites
                    would have been economically impossible at pre-Falcon 9 prices), stimulated
                    demand for smaller and more frequent satellite missions, and forced competitors
                    to invest in their own cost-reduction technologies.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 3. Vehicle Comparison                */}
              {/* ──────────────────────────────────── */}
              <section id="vehicle-comparison" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Vehicle-by-Vehicle Comparison
                </h2>
                <div className="space-y-6 text-star-200 leading-relaxed text-lg">
                  <h3 className="text-xl font-semibold text-white mt-4 mb-3">
                    SpaceX Falcon 9
                  </h3>
                  <p>
                    The Falcon 9 is the world&apos;s most-flown orbital rocket, with over 400
                    cumulative launches. Listed commercial price: <strong className="text-white">$67
                    million</strong> for a dedicated LEO mission. Payload to LEO: approximately
                    22,800 kg (with reusable first stage). Payload to GTO: approximately 8,300 kg.
                    The cost per kilogram for a full LEO payload is roughly $2,940/kg -- the lowest
                    of any currently operational vehicle. SpaceX conducts the majority of its
                    launches for internal Starlink deployment, with commercial and government
                    missions filling the remaining manifest.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    SpaceX Falcon Heavy
                  </h3>
                  <p>
                    The Falcon Heavy, consisting of three Falcon 9 first-stage cores, offers
                    significantly more payload capacity. Listed commercial price: <strong className="text-white">
                    $97 million</strong> (partially reusable). Payload to LEO: approximately 63,800
                    kg. Payload to GTO: approximately 26,700 kg. Cost per kg to LEO: approximately
                    $1,520/kg -- the best per-kg rate of any operational vehicle. However, the
                    Falcon Heavy flies relatively infrequently, primarily for heavy U.S. government
                    payloads and high-orbit commercial missions.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    SpaceX Starship
                  </h3>
                  <p>
                    Starship is the super heavy-lift, fully reusable launch system under active
                    development. With a target LEO payload of approximately 150,000 kg (150 tons)
                    in its fully reusable configuration, Starship aims to achieve per-kilogram costs
                    that are an order of magnitude below Falcon 9. SpaceX CEO Elon Musk has stated
                    a long-term target of <strong className="text-white">$10 per kilogram</strong>
                    to LEO, though most analysts consider $100-$500/kg more realistic in the
                    near-to-medium term. Even at $500/kg, Starship would represent a 5-6x reduction
                    from Falcon 9 and would transform the economics of nearly every space application.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Rocket Lab Electron
                  </h3>
                  <p>
                    Electron is the leading dedicated small-launch vehicle, optimized for payloads
                    up to 300 kg to LEO. Listed price: approximately <strong className="text-white">
                    $7.5 million</strong>. Cost per kg: approximately $25,000-$30,000/kg. While
                    this is significantly more expensive per kilogram than Falcon 9, Electron
                    provides dedicated launch with precise orbital placement and flexible scheduling
                    -- capabilities worth the premium for many customers who cannot afford to wait
                    for rideshare opportunities or accept orbit compromises. Rocket Lab has flown
                    Electron over 50 times with a strong reliability record.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Rocket Lab Neutron
                  </h3>
                  <p>
                    Neutron is Rocket Lab&apos;s in-development medium-lift vehicle, targeting
                    approximately 13,000 kg to LEO with a reusable first stage. The vehicle is
                    designed to compete with Falcon 9 for constellation deployment and other
                    medium-lift missions. Pricing has not been publicly announced, but Rocket Lab
                    has indicated it will be competitive with Falcon 9, implying a per-kg cost in
                    the $3,000-$5,000 range. First launch is targeted for 2025-2026.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Blue Origin New Glenn
                  </h3>
                  <p>
                    New Glenn is Blue Origin&apos;s heavy-lift orbital rocket with a reusable first
                    stage. Payload to LEO: approximately 45,000 kg. Pricing has not been publicly
                    disclosed, but industry estimates suggest a commercial price in the $70-100
                    million range, implying a cost per kg of approximately $1,600-$2,200/kg to LEO.
                    New Glenn began flight testing in 2025, with commercial operations expected to
                    ramp up through 2026-2027.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Arianespace Ariane 6
                  </h3>
                  <p>
                    Ariane 6 is Europe&apos;s primary launch vehicle, succeeding the Ariane 5. Two
                    configurations are available: Ariane 62 (two solid boosters, ~10,350 kg to LEO)
                    and Ariane 64 (four solid boosters, ~21,650 kg to LEO). Estimated commercial
                    pricing is approximately <strong className="text-white">$77-115 million</strong>
                    depending on configuration, yielding a cost per kg of approximately $5,300-$7,400/kg.
                    Ariane 6 is not price-competitive with Falcon 9 but provides independent European
                    access to space, which is a strategic priority for ESA and EU member states.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    ULA Vulcan Centaur
                  </h3>
                  <p>
                    Vulcan Centaur is ULA&apos;s next-generation vehicle, replacing the Atlas V and
                    Delta IV. Payload to LEO: approximately 27,200 kg (in its heaviest
                    configuration with six solid rocket boosters). Pricing for commercial missions
                    has not been widely disclosed, but NSSL contract values suggest per-mission
                    costs of <strong className="text-white">$100-150 million</strong> for government
                    missions. ULA positions Vulcan primarily for high-value government and
                    commercial missions requiring high reliability and specific orbit capabilities
                    rather than competing on per-kilogram cost.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 4. Cost Per Kilogram Analysis        */}
              {/* ──────────────────────────────────── */}
              <section id="cost-per-kg" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Cost Per Kilogram Analysis
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <div className="card p-6 my-8 overflow-x-auto">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                      Launch Vehicle Cost Comparison (2026)
                    </h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-cyan-400/20 text-left">
                          <th className="py-2 pr-3 text-star-300 font-medium">Vehicle</th>
                          <th className="py-2 pr-3 text-star-300 font-medium text-right">LEO Payload</th>
                          <th className="py-2 pr-3 text-star-300 font-medium text-right">List Price</th>
                          <th className="py-2 text-star-300 font-medium text-right">$/kg (LEO)</th>
                        </tr>
                      </thead>
                      <tbody className="text-star-200">
                        <tr className="border-b border-cyan-400/10">
                          <td className="py-2 pr-3 text-white">Falcon Heavy</td>
                          <td className="py-2 pr-3 text-right">63,800 kg</td>
                          <td className="py-2 pr-3 text-right">$97M</td>
                          <td className="py-2 text-right text-cyan-400 font-semibold">$1,520</td>
                        </tr>
                        <tr className="border-b border-cyan-400/10">
                          <td className="py-2 pr-3 text-white">New Glenn</td>
                          <td className="py-2 pr-3 text-right">45,000 kg</td>
                          <td className="py-2 pr-3 text-right">~$85M (est.)</td>
                          <td className="py-2 text-right text-cyan-400 font-semibold">~$1,900</td>
                        </tr>
                        <tr className="border-b border-cyan-400/10">
                          <td className="py-2 pr-3 text-white">Falcon 9</td>
                          <td className="py-2 pr-3 text-right">22,800 kg</td>
                          <td className="py-2 pr-3 text-right">$67M</td>
                          <td className="py-2 text-right text-cyan-400 font-semibold">$2,940</td>
                        </tr>
                        <tr className="border-b border-cyan-400/10">
                          <td className="py-2 pr-3 text-white">Neutron (est.)</td>
                          <td className="py-2 pr-3 text-right">13,000 kg</td>
                          <td className="py-2 pr-3 text-right">~$50M (est.)</td>
                          <td className="py-2 text-right text-cyan-400 font-semibold">~$3,850</td>
                        </tr>
                        <tr className="border-b border-cyan-400/10">
                          <td className="py-2 pr-3 text-white">Ariane 64</td>
                          <td className="py-2 pr-3 text-right">21,650 kg</td>
                          <td className="py-2 pr-3 text-right">~$115M</td>
                          <td className="py-2 text-right text-cyan-400 font-semibold">~$5,310</td>
                        </tr>
                        <tr className="border-b border-cyan-400/10">
                          <td className="py-2 pr-3 text-white">Vulcan Centaur</td>
                          <td className="py-2 pr-3 text-right">27,200 kg</td>
                          <td className="py-2 pr-3 text-right">~$120M (est.)</td>
                          <td className="py-2 text-right text-cyan-400 font-semibold">~$4,410</td>
                        </tr>
                        <tr className="border-b border-cyan-400/10">
                          <td className="py-2 pr-3 text-white">H3 (Japan)</td>
                          <td className="py-2 pr-3 text-right">6,500 kg</td>
                          <td className="py-2 pr-3 text-right">~$50M</td>
                          <td className="py-2 text-right text-cyan-400 font-semibold">~$7,690</td>
                        </tr>
                        <tr className="border-b border-cyan-400/10">
                          <td className="py-2 pr-3 text-white">Electron</td>
                          <td className="py-2 pr-3 text-right">300 kg</td>
                          <td className="py-2 pr-3 text-right">$7.5M</td>
                          <td className="py-2 text-right text-cyan-400 font-semibold">$25,000</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 text-white">Starship (target)</td>
                          <td className="py-2 pr-3 text-right">150,000 kg</td>
                          <td className="py-2 pr-3 text-right">TBD</td>
                          <td className="py-2 text-right text-cyan-400 font-semibold">$100-500 (target)</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="text-star-300/60 text-xs mt-4">
                      Prices are approximate and based on publicly available data, company disclosures, and industry estimates. Actual contract prices vary.
                    </p>
                  </div>

                  <p>
                    Several important caveats apply to cost-per-kilogram comparisons. First, few
                    missions actually fill a vehicle to its maximum payload capacity, so the
                    effective cost per kilogram for a specific mission is often higher than the
                    theoretical minimum. Second, GTO (geostationary transfer orbit) and higher
                    orbits require significantly more energy, reducing payload capacity and
                    increasing effective per-kilogram costs. Third, small and medium payloads on
                    large vehicles pay a premium for unused capacity unless rideshare arrangements
                    are available.
                  </p>

                  <p className="mt-4">
                    <Link href="/mission-cost" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Calculate launch costs for your specific mission on SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 5. Rideshare & Smallsat Pricing      */}
              {/* ──────────────────────────────────── */}
              <section id="rideshare" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Rideshare &amp; Smallsat Pricing
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The rise of rideshare services has transformed the economics of small satellite
                    launches. Rather than purchasing an entire dedicated launch (which may cost $7-67
                    million depending on the vehicle), smallsat operators can purchase a slot on a
                    shared mission at a fraction of the cost.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    SpaceX Transporter Rideshare
                  </h3>
                  <p>
                    SpaceX&apos;s Transporter rideshare program offers smallsat launch services
                    starting at approximately <strong className="text-white">$1.1 million for 200 kg
                    </strong> to sun-synchronous orbit (SSO), with a per-kilogram rate of
                    approximately $5,500/kg. Additional mass can be purchased at similar rates.
                    SpaceX typically conducts several Transporter missions per year, each carrying
                    dozens to over 100 small satellites. The Transporter program has become the
                    most popular rideshare option globally due to its low cost and regular cadence.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Rideshare Aggregators
                  </h3>
                  <p>
                    Companies like Exolaunch, D-Orbit, and Spaceflight Inc. (now owned by Firefly)
                    serve as rideshare aggregators, purchasing bulk capacity on launch vehicles and
                    reselling individual slots to smallsat customers. These companies also provide
                    integration, deployment, and orbital transfer services. D-Orbit&apos;s ION
                    Satellite Carrier can deliver smallsats to specific orbits after being released
                    from the launch vehicle, providing orbital precision that rideshare alone
                    cannot offer.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Dedicated Small Launch vs. Rideshare
                  </h3>
                  <p>
                    The choice between dedicated small launch (Electron, Firefly Alpha) and rideshare
                    on a larger vehicle involves tradeoffs. Dedicated launch offers schedule
                    control, precise orbital placement, and independence from other payloads, but
                    at a significantly higher per-kilogram cost. Rideshare offers lower per-kilogram
                    pricing but requires accepting the primary payload&apos;s orbit, schedule
                    constraints, and potential delays caused by other rideshare customers. For
                    constellation operators deploying many satellites, rideshare is typically more
                    economical; for time-sensitive or orbit-specific missions, dedicated launch
                    may be worth the premium.
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 6. Government Contract Pricing       */}
              {/* ──────────────────────────────────── */}
              <section id="government-pricing" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Government Contract Pricing
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    Government launch contracts -- particularly for the U.S. military and
                    intelligence community -- are typically priced significantly higher than
                    comparable commercial missions. This premium reflects additional requirements
                    including enhanced mission assurance processes, specialized integration support,
                    unique orbit requirements, and the cost of maintaining assured access to space
                    for national security payloads.
                  </p>

                  <div className="card p-6 my-8 border-l-4 border-l-nebula-400">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                      U.S. Government Launch Contract Values
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">NSSL Phase 2 (SpaceX, avg.)</span>
                        <span className="text-nebula-300 font-semibold">~$95M-$110M</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">NSSL Phase 2 (ULA, avg.)</span>
                        <span className="text-nebula-300 font-semibold">~$130M-$180M</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-cyan-400/10 pb-2">
                        <span className="text-star-300">NASA CRS-2 (SpaceX, per mission)</span>
                        <span className="text-nebula-300 font-semibold">~$150M-$170M</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-star-300">SDA Tranche missions (various)</span>
                        <span className="text-nebula-300 font-semibold">$30M-$60M</span>
                      </div>
                    </div>
                    <p className="text-star-300/60 text-xs mt-4">
                      Based on publicly available contract award values. Actual per-mission costs may differ based on mission-specific requirements.
                    </p>
                  </div>

                  <p>
                    The <strong className="text-white">National Security Space Launch (NSSL)</strong>{' '}
                    program, managed by the U.S. Space Force&apos;s Space Systems Command, is the
                    primary procurement vehicle for military and intelligence launches. NSSL Phase 2
                    (2022-2027) split launch awards between SpaceX and ULA, with SpaceX receiving
                    approximately 40% of missions and ULA 60%. The total Phase 2 contract value
                    exceeds $5 billion. NSSL Phase 3, which will add Blue Origin and potentially
                    other providers, is being structured as a more flexible, competed arrangement.
                  </p>

                  <p className="mt-4">
                    <Link href="/business-opportunities" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Track government launch procurement on SpaceNexus
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 7. Hidden Costs                      */}
              {/* ──────────────────────────────────── */}
              <section id="hidden-costs" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Hidden Costs &amp; Total Mission Cost
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The listed launch price is only one component of the total cost to get a payload
                    to its operational orbit. Several additional costs must be considered:
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Payload Integration
                  </h3>
                  <p>
                    Integration services -- mechanically and electrically mating the payload to the
                    launch vehicle, performing fit checks, and conducting pre-launch testing -- can
                    add $1-5 million depending on complexity. For rideshare missions, integration
                    through a deployer system (such as those provided by Exolaunch or ISISPACE)
                    typically costs $100,000-$500,000 per satellite.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Launch Insurance
                  </h3>
                  <p>
                    Launch insurance (covering loss of the satellite during launch) typically costs
                    6-12% of the insured value, depending on the vehicle&apos;s track record, the
                    payload value, and market conditions. For a $100 million satellite on a proven
                    vehicle, insurance might cost $6-8 million. The space insurance market is
                    relatively concentrated, with a small number of underwriters in London, Paris,
                    and the U.S. providing the majority of coverage.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Range and Regulatory Fees
                  </h3>
                  <p>
                    Launch range services (provided by the U.S. Space Force at Cape Canaveral and
                    Vandenberg, or by commercial spaceports) involve fees for range safety,
                    telemetry, tracking, and other support services. FAA launch licensing involves
                    application fees and compliance costs. For international launches, additional
                    regulatory and diplomatic costs may apply.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Ground Operations &amp; Post-Launch
                  </h3>
                  <p>
                    Post-launch activities including satellite deployment, orbit raising, checkout,
                    and commissioning involve ground station time, operations personnel, and
                    potentially propellant for orbit adjustments. For constellation operators,
                    the total deployment cost (including multiple launches, integration, and
                    commissioning across an entire constellation) can run into billions of dollars.
                  </p>

                  <p className="mt-4">
                    <Link href="/space-insurance" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Explore space insurance options on SpaceNexus
                    </Link>
                    {' '}&middot;{' '}
                    <Link href="/launch-vehicles" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Compare launch vehicles
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 8. Cost Trends & Future Outlook      */}
              {/* ──────────────────────────────────── */}
              <section id="cost-trends" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Cost Trends &amp; Future Outlook
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    The overall trajectory of launch costs is clearly downward, but the pace and
                    extent of future reductions depends on several key factors:
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Starship&apos;s Impact
                  </h3>
                  <p>
                    The single most important variable for future launch costs is whether SpaceX&apos;s
                    Starship achieves rapid, routine, and fully reusable operations. If Starship
                    can be reflown with turnaround times and costs comparable to commercial aircraft
                    -- the long-term goal -- per-kilogram costs could fall below $100. Even a more
                    conservative scenario ($500/kg) would be transformative. The timeline for
                    achieving these costs is uncertain; initial Starship missions will likely cost
                    far more while the vehicle matures and flight rates increase.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Competition Effects
                  </h3>
                  <p>
                    New Glenn, Neutron, and other vehicles entering the market will increase
                    competition, potentially driving commercial prices down even before Starship
                    reaches maturity. The presence of multiple credible medium-to-heavy launch
                    providers gives customers negotiating leverage and reduces dependence on any
                    single provider. For the small-launch market, Firefly Alpha, ABL Space Systems
                    RS1, and other entrants could compress pricing below current Electron levels.
                  </p>

                  <h3 className="text-xl font-semibold text-white mt-8 mb-3">
                    Demand Growth
                  </h3>
                  <p>
                    Lower launch costs stimulate demand, which in turn supports higher flight rates,
                    which further reduces per-unit costs through manufacturing learning curves and
                    fixed-cost amortization. This virtuous cycle is already visible with Falcon 9:
                    SpaceX&apos;s progression from 18 launches in 2020 to over 130 in 2025 has been
                    driven by the low costs that make Starlink economically viable.
                  </p>

                  <p className="mt-4">
                    <Link href="/market-intel" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Track launch market trends on SpaceNexus Market Intelligence
                    </Link>
                  </p>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 9. Choosing a Launch Provider        */}
              {/* ──────────────────────────────────── */}
              <section id="choosing" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Choosing a Launch Provider
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    Selecting a launch provider involves balancing multiple factors beyond price
                    alone:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>
                      <strong className="text-white">Reliability:</strong> A launch failure destroys
                      years of work and hundreds of millions in satellite investment. Historical
                      success rates matter enormously.
                    </li>
                    <li>
                      <strong className="text-white">Schedule availability:</strong> Wait times
                      for a Falcon 9 slot can be 12-24 months for commercial customers. New
                      vehicles may offer shorter queues.
                    </li>
                    <li>
                      <strong className="text-white">Orbit capability:</strong> Not all vehicles can
                      reach all orbits efficiently. GTO, SSO, and high-inclination orbits each
                      favor different vehicles and launch sites.
                    </li>
                    <li>
                      <strong className="text-white">Payload accommodation:</strong> Fairing size,
                      vibration environment, thermal conditions, and electrical interfaces must
                      match payload requirements.
                    </li>
                    <li>
                      <strong className="text-white">ITAR and export control:</strong> International
                      launches involve additional export control complexity. Some payloads can only
                      launch on U.S. vehicles.
                    </li>
                    <li>
                      <strong className="text-white">Insurance costs:</strong> Premiums vary by
                      vehicle track record. A cheaper launch on a less-proven vehicle may cost more
                      in insurance.
                    </li>
                  </ul>
                </div>
              </section>

              {/* ──────────────────────────────────── */}
              {/* 10. SpaceNexus CTA                   */}
              {/* ──────────────────────────────────── */}
              <section id="spacenexus" className="mb-16 scroll-mt-24">
                <h2 className="text-display-sm font-display font-bold text-white mb-6">
                  Plan Missions on SpaceNexus
                </h2>
                <div className="space-y-4 text-star-200 leading-relaxed text-lg">
                  <p>
                    SpaceNexus provides mission planning tools including launch cost calculators,
                    vehicle comparison features, launch window analysis, and insurance estimation
                    tools. Our{' '}
                    <Link href="/mission-cost" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                      Mission Planning module
                    </Link>{' '}
                    helps you evaluate options and estimate total mission costs across all major
                    launch providers.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  {[
                    { name: 'Mission Planning', href: '/mission-cost', desc: 'Cost estimation, vehicle comparison, and planning tools' },
                    { name: 'Launch Vehicles', href: '/launch-vehicles', desc: 'Detailed specs and capabilities for every vehicle' },
                    { name: 'Launch Windows', href: '/launch-windows', desc: 'Optimal launch timing and trajectory analysis' },
                    { name: 'Space Insurance', href: '/space-insurance', desc: 'Insurance options and premium estimation' },
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
                  Optimize Your Launch Strategy
                </h2>
                <p className="text-star-200 text-lg mb-8 max-w-2xl mx-auto">
                  Access mission planning tools, cost calculators, and launch market intelligence
                  that help you make better decisions about getting to orbit.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/register" className="btn-primary">
                    Create Free Account
                  </Link>
                  <Link href="/mission-cost" className="btn-secondary">
                    Explore Mission Planning
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
