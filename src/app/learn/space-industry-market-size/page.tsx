import type { Metadata } from 'next';
import Link from 'next/link';
import FAQSchema from '@/components/seo/FAQSchema';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Space Industry Market Size: $1.8 Trillion by 2035 | SpaceNexus',
  description:
    'The global space economy reached $546 billion in 2025 and is projected to exceed $1.8 trillion by 2035. Explore market segments, growth drivers, top companies by revenue, and investment trends.',
  keywords: [
    'space industry market size',
    'space economy size',
    'global space market',
    'space industry growth',
    'space market forecast',
    'space economy 2026',
    'space industry revenue',
    'commercial space market',
    'space industry statistics',
    'space sector investment',
    'satellite industry market size',
    'space industry CAGR',
  ],
  openGraph: {
    title: 'Space Industry Market Size: $1.8 Trillion and Growing',
    description:
      'The global space economy is on track to exceed $1.8 trillion by 2035. Explore segments, growth drivers, and the companies leading the expansion.',
    type: 'article',
    url: 'https://spacenexus.us/learn/space-industry-market-size',
    siteName: 'SpaceNexus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Market Size: $1.8 Trillion and Growing',
    description:
      'Global space economy at $546B in 2025, projected $1.8T by 2035. Market segments, growth drivers, and top companies.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/learn/space-industry-market-size',
  },
};

const marketSegments = [
  {
    segment: 'Satellite Services',
    size2025: '$193B',
    size2030: '$340B',
    size2035: '$580B',
    cagr: '11.6%',
    share: '35.3%',
    description: 'Direct-to-home TV, satellite broadband (Starlink, OneWeb, Kuiper), Earth observation data, IoT connectivity, and maritime/aviation communications.',
    drivers: ['Mega-constellation broadband (Starlink, Kuiper)', 'Earth observation data demand', 'IoT satellite connectivity'],
  },
  {
    segment: 'Ground Equipment',
    size2025: '$152B',
    size2030: '$230B',
    size2035: '$350B',
    cagr: '8.7%',
    share: '27.8%',
    description: 'Satellite dishes, GNSS receivers, ground station infrastructure, satellite phones, VSAT terminals, and user equipment for satellite broadband.',
    drivers: ['Consumer satellite terminals', 'Phased array antenna adoption', 'Ground station as a service'],
  },
  {
    segment: 'Satellite Manufacturing',
    size2025: '$22B',
    size2030: '$48B',
    size2035: '$85B',
    cagr: '14.4%',
    share: '4.0%',
    description: 'Design and construction of commercial, government, and military satellites. Includes components, subsystems, and full satellite assembly.',
    drivers: ['Mega-constellation production lines', 'Miniaturization (CubeSats, SmallSats)', 'In-space manufacturing'],
  },
  {
    segment: 'Launch Services',
    size2025: '$10B',
    size2030: '$28B',
    size2035: '$55B',
    cagr: '18.6%',
    share: '1.8%',
    description: 'Rocket launches, rideshare services, launch range operations, and mission management. The fastest-growing segment by percentage.',
    drivers: ['Reusable rockets driving volume', 'Small-sat dedicated launchers', 'Commercial crew and cargo'],
  },
  {
    segment: 'Space Exploration & Stations',
    size2025: '$48B',
    size2030: '$85B',
    size2035: '$165B',
    cagr: '13.1%',
    share: '8.8%',
    description: 'Government exploration programs (Artemis, Mars), commercial space stations (Axiom, Orbital Reef), and in-space services (refueling, debris removal).',
    drivers: ['Artemis program spending', 'Commercial space station development', 'Lunar economy infrastructure'],
  },
  {
    segment: 'Defense & Intelligence',
    size2025: '$95B',
    size2030: '$160B',
    size2035: '$280B',
    cagr: '11.4%',
    share: '17.4%',
    description: 'Military satellite communications, missile warning, reconnaissance, space domain awareness, and anti-satellite capabilities.',
    drivers: ['Space Force budget growth', 'Resilient satellite architectures', 'Allied nation space defense'],
  },
  {
    segment: 'Space Tourism & Habitation',
    size2025: '$3B',
    size2030: '$12B',
    size2035: '$40B',
    cagr: '29.5%',
    share: '0.5%',
    description: 'Suborbital flights (Blue Origin, Virgin Galactic), orbital tourism (SpaceX), and future commercial space station visits.',
    drivers: ['Declining ticket prices', 'Orbital hotel development', 'Suborbital point-to-point transport'],
  },
  {
    segment: 'Other (Insurance, Legal, Consulting)',
    size2025: '$23B',
    size2030: '$47B',
    size2035: '$85B',
    cagr: '13.9%',
    share: '4.2%',
    description: 'Space insurance, legal services, spectrum management, consulting, education, and space-related financial services.',
    drivers: ['Growing regulatory complexity', 'Space insurance market expansion', 'Specialized consulting demand'],
  },
];

const topCompanies = [
  { name: 'SpaceX', revenue: '$15.0B (est.)', segment: 'Launch, Satellite Services', marketCap: 'Private ($350B val.)', slug: 'spacex', highlight: 'Largest launch provider; Starlink has 4M+ subscribers' },
  { name: 'Boeing (Space & Defense)', revenue: '$12.3B', segment: 'Manufacturing, Defense', marketCap: '$115B', slug: 'boeing', highlight: 'SLS prime contractor; Starliner crew vehicle' },
  { name: 'Lockheed Martin (Space)', revenue: '$12.1B', segment: 'Defense, Satellites', marketCap: '$135B', slug: 'lockheed-martin', highlight: 'Orion spacecraft; GPS III; SBIRS missile warning' },
  { name: 'Northrop Grumman (Space)', revenue: '$10.8B', segment: 'Defense, Launch', marketCap: '$80B', slug: 'northrop-grumman', highlight: 'James Webb prime contractor; Cygnus cargo; solid rocket motors' },
  { name: 'Airbus Defence and Space', revenue: '$10.2B', segment: 'Manufacturing, Services', marketCap: '$165B (group)', slug: 'airbus-defence-and-space', highlight: 'OneWeb satellites; Ariane 6; Orion ESM' },
  { name: 'L3Harris Technologies', revenue: '$8.4B', segment: 'Defense, Sensors', marketCap: '$48B', slug: 'l3harris', highlight: 'Space sensors; missile tracking; responsive small sats' },
  { name: 'Raytheon (RTX) Space', revenue: '$5.2B', segment: 'Defense, Sensors', marketCap: '$155B (group)', slug: 'rtx', highlight: 'Space-based infrared sensors; GPS ground control' },
  { name: 'SES', revenue: '$2.0B', segment: 'Satellite Services', marketCap: '$5.8B', slug: 'ses', highlight: 'O3b mPOWER MEO constellation; largest GEO fleet' },
  { name: 'Rocket Lab', revenue: '$0.4B', segment: 'Launch, Components', marketCap: '$12B', slug: 'rocket-lab', highlight: 'Electron small-sat launcher; Neutron medium-lift in development' },
  { name: 'Planet Labs', revenue: '$0.24B', segment: 'Earth Observation', marketCap: '$2.8B', slug: 'planet-labs', highlight: 'Largest Earth imaging constellation (200+ satellites)' },
];

const growthDrivers = [
  {
    driver: 'Mega-Constellations',
    impact: 'Very High',
    description: 'SpaceX Starlink, Amazon Kuiper, OneWeb, and Telesat Lightspeed are deploying thousands of satellites to provide global broadband. Starlink alone requires 12,000+ satellites (with approval for 42,000). This drives demand across launch, manufacturing, ground equipment, and spectrum management.',
  },
  {
    driver: 'Government Defense Spending',
    impact: 'Very High',
    description: 'The US Space Force budget exceeds $30B annually. Allied nations (UK, Japan, Australia, France) are establishing or expanding space commands. Space-based missile warning, ISR, and communications are considered essential military capabilities.',
  },
  {
    driver: 'Earth Observation & Climate',
    impact: 'High',
    description: 'Demand for high-resolution, high-frequency Earth imagery is accelerating for agriculture, insurance, environmental monitoring, and disaster response. The Earth observation data market is growing 15-20% annually.',
  },
  {
    driver: 'Reusable Launch Vehicles',
    impact: 'High',
    description: 'Reusable rockets have reduced launch costs by 90%. Lower costs enable new use cases that were previously uneconomical: university CubeSats, startup constellations, and emerging nation space programs.',
  },
  {
    driver: 'Lunar Economy',
    impact: 'Medium-High',
    description: 'NASA Artemis and commercial lunar programs (Intuitive Machines, Astrobotic, ispace) are creating a cislunar economy. Lunar resource extraction, communication relays, and surface infrastructure could generate $100B+ by 2040.',
  },
  {
    driver: 'In-Space Services',
    impact: 'Medium',
    description: 'Satellite servicing (life extension, refueling, repositioning), active debris removal, and in-space assembly are emerging as a $5-10B market. Companies like Astroscale and Northrop Grumman MEV are pioneering this segment.',
  },
  {
    driver: 'Commercial Space Stations',
    impact: 'Medium',
    description: 'With ISS retirement approaching (late 2020s to early 2030s), Axiom Space, Orbital Reef (Blue Origin/Sierra Space), and Starlab are developing commercial replacements. NASA has committed $3.6B to support commercial LEO destinations.',
  },
  {
    driver: 'Space Tourism',
    impact: 'Low-Medium',
    description: 'Still a niche market but growing. Blue Origin and Virgin Galactic offer suborbital flights ($250K-$450K). SpaceX orbital missions cost $50M+ per seat. Prices are expected to decrease by 50-80% by 2030 with increased flight rates.',
  },
];

const projections = [
  { year: '2020', size: '$371B', label: 'Pre-Starlink scaling' },
  { year: '2022', size: '$424B', label: 'Post-COVID recovery' },
  { year: '2024', size: '$508B', label: 'Constellation deployments accelerate' },
  { year: '2025', size: '$546B', label: 'Current baseline' },
  { year: '2026', size: '$600B (est.)', label: 'Starship operational flights begin' },
  { year: '2028', size: '$740B (proj.)', label: 'Kuiper constellation online' },
  { year: '2030', size: '$950B (proj.)', label: 'Commercial space stations operational' },
  { year: '2035', size: '$1.8T (proj.)', label: 'Lunar economy emerging' },
];

const faqItems = [
  {
    question: 'How big is the global space industry in 2026?',
    answer:
      'The global space economy is estimated at approximately $600 billion in 2026, up from $546 billion in 2025. This includes satellite services ($193B), ground equipment ($152B), government space budgets ($95B defense + $48B civil), satellite manufacturing ($22B), launch services ($10B), and other segments. The industry is growing at approximately 7-9% CAGR, with launch services and satellite manufacturing growing the fastest at 15-18% annually.',
  },
  {
    question: 'What is the largest segment of the space economy?',
    answer:
      'Satellite services is the largest segment at approximately $193 billion (35% of the total market). This includes satellite television ($85B, though declining), satellite broadband ($42B, rapidly growing due to Starlink and similar services), Earth observation data ($8B), and satellite-enabled mobility services. Ground equipment is the second largest at $152B, driven by consumer satellite terminals and GNSS receivers.',
  },
  {
    question: 'How fast is the space industry growing?',
    answer:
      'The overall space economy is growing at 7-9% CAGR, but growth rates vary dramatically by segment. Launch services are growing at 18.6% CAGR, driven by reusable rockets and constellation deployments. Space tourism, while small, is the fastest-growing at nearly 30% CAGR. Satellite broadband is growing at 25%+ annually. Traditional satellite TV is declining at 3-5% per year. By 2035, the industry is projected to exceed $1.8 trillion.',
  },
  {
    question: 'Which countries lead the space economy?',
    answer:
      'The United States dominates with approximately 55% of global space economic activity ($300B+), driven by SpaceX, Boeing, Lockheed Martin, and large government budgets (NASA + Space Force). Europe holds about 15% share, led by Arianespace, Airbus, and ESA programs. China is third with approximately 12% and growing rapidly, with an ambitious government program and emerging commercial sector. Japan, India, and South Korea each hold 2-4% market share.',
  },
  {
    question: 'Is the space industry a good investment?',
    answer:
      'The space industry has generated strong returns for investors in high-growth segments. Private market valuations have risen significantly: SpaceX is valued at $350B+, and Rocket Lab market cap has exceeded $12B. However, the sector has seen mixed results for publicly traded companies: some SPACs have underperformed, while established players like L3Harris and Northrop Grumman have delivered steady returns. Key investment themes include satellite broadband, Earth observation, defense modernization, and launch vehicle manufacturing. SpaceNexus tracks space economy trends at /market-intel.',
  },
];

export default function SpaceIndustryMarketSizePage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Space Industry Market Size: $1.8 Trillion and Growing',
    description:
      'Comprehensive analysis of the global space economy size, growth projections, market segments, and top companies by revenue.',
    author: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
    publisher: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      url: 'https://spacenexus.us',
      logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/spacenexus-logo.png' },
    },
    datePublished: '2026-02-18T00:00:00Z',
    dateModified: '2026-02-18T00:00:00Z',
    mainEntityOfPage: 'https://spacenexus.us/learn/space-industry-market-size',
  };

  return (
    <div className="min-h-screen pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <FAQSchema items={faqItems} />

      <div className="container mx-auto px-4 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-8">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/learn" className="hover:text-slate-300 transition-colors">Learning Center</Link>
          <span>/</span>
          <span className="text-slate-400">Space Industry Market Size</span>
        </nav>

        {/* Hero */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-nebula-500/10 text-nebula-400 border border-nebula-500/20">
              Market Intelligence
            </span>
            <span className="text-xs text-slate-500">Updated February 2026</span>
            <span className="text-xs text-slate-500">10 min read</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
            Space Industry Market Size: $1.8 Trillion and Growing
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            The global space economy reached $546 billion in 2025 and is projected to exceed $1.8
            trillion by 2035. Driven by mega-constellations, reusable rockets, defense modernization,
            and emerging lunar infrastructure, the space sector is entering an era of unprecedented
            growth. Here is a data-driven look at where the industry stands and where it is heading.
          </p>
        </header>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-nebula-400 mb-1">$546B</div>
            <div className="text-xs text-slate-400">2025 Market Size</div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-nebula-400 mb-1">$1.8T</div>
            <div className="text-xs text-slate-400">2035 Projection</div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-nebula-400 mb-1">12.7%</div>
            <div className="text-xs text-slate-400">10-Year CAGR</div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-nebula-400 mb-1">90+</div>
            <div className="text-xs text-slate-400">Space-faring Nations</div>
          </div>
        </div>

        {/* Market Segments */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-2">Market Segments Breakdown</h2>
          <p className="text-slate-400 text-sm mb-6">
            The space economy spans eight major segments. Satellite services dominates by revenue, while
            launch services and space tourism are the fastest-growing by percentage.
          </p>
          <div className="space-y-4">
            {marketSegments.map((seg) => (
              <div key={seg.segment} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="text-white font-semibold text-lg">{seg.segment}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-nebula-500/10 text-nebula-400 border border-nebula-500/20">
                      {seg.share} of total
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                      {seg.cagr} CAGR
                    </span>
                  </div>
                </div>
                <p className="text-slate-400 text-sm mb-4">{seg.description}</p>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-slate-500">2025</div>
                    <div className="text-white font-semibold">{seg.size2025}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">2030 (proj.)</div>
                    <div className="text-white font-semibold">{seg.size2030}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">2035 (proj.)</div>
                    <div className="text-nebula-400 font-semibold">{seg.size2035}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Key Growth Drivers</div>
                  <div className="flex flex-wrap gap-2">
                    {seg.drivers.map((driver) => (
                      <span key={driver} className="text-xs px-2 py-1 rounded-full bg-slate-700/50 text-slate-300">
                        {driver}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Growth Projections Timeline */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-2">Growth Projections: 2020-2035</h2>
          <p className="text-slate-400 text-sm mb-6">
            The space economy has nearly doubled since 2020, and projections indicate continued
            acceleration. Key inflection points include Starship operational flights, Kuiper
            constellation launch, and the emergence of a commercial lunar economy.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left text-slate-400 font-medium py-3 pr-4">Year</th>
                  <th className="text-left text-slate-400 font-medium py-3 pr-4">Market Size</th>
                  <th className="text-left text-slate-400 font-medium py-3">Milestone</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((p) => (
                  <tr key={p.year} className="border-b border-slate-700/30">
                    <td className="py-3 pr-4 text-white font-medium">{p.year}</td>
                    <td className="py-3 pr-4 text-nebula-400 font-semibold">{p.size}</td>
                    <td className="py-3 text-slate-400 text-sm">{p.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-slate-500 text-xs mt-3">
            Sources: SIA State of the Satellite Industry Report, Space Foundation Space Report, Morgan Stanley Space
            Economy Forecast, Bank of America Global Space Report. Projections represent consensus estimates.
          </p>
        </section>

        {/* Growth Drivers */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-2">Key Growth Drivers</h2>
          <p className="text-slate-400 text-sm mb-6">
            Eight factors are converging to accelerate space economy growth over the next decade.
          </p>
          <div className="space-y-4">
            {growthDrivers.map((gd) => (
              <div key={gd.driver} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-white font-semibold">{gd.driver}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    gd.impact === 'Very High'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : gd.impact === 'High'
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      : gd.impact === 'Medium-High'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : gd.impact === 'Medium'
                      ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                  }`}>
                    {gd.impact} impact
                  </span>
                </div>
                <p className="text-slate-400 text-sm">{gd.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Top Companies */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-2">Top Space Companies by Revenue</h2>
          <p className="text-slate-400 text-sm mb-6">
            The ten largest space companies by space-related revenue represent a mix of traditional defense
            primes and newer commercial players.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left text-slate-400 font-medium py-3 pr-4">Company</th>
                  <th className="text-left text-slate-400 font-medium py-3 pr-4">Space Revenue</th>
                  <th className="text-left text-slate-400 font-medium py-3 pr-4">Segment</th>
                  <th className="text-left text-slate-400 font-medium py-3">Profile</th>
                </tr>
              </thead>
              <tbody>
                {topCompanies.map((company) => (
                  <tr key={company.slug} className="border-b border-slate-700/30">
                    <td className="py-3 pr-4">
                      <div className="text-white font-medium">{company.name}</div>
                      <div className="text-xs text-slate-500">{company.highlight}</div>
                    </td>
                    <td className="py-3 pr-4 text-nebula-400 font-medium">{company.revenue}</td>
                    <td className="py-3 pr-4 text-slate-400 text-xs">{company.segment}</td>
                    <td className="py-3">
                      <Link
                        href={`/company-profiles/${company.slug}`}
                        className="text-nebula-400 hover:underline text-sm"
                      >
                        View profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-slate-500 text-sm mt-4">
            <Link href="/company-profiles" className="text-nebula-400 hover:underline">
              Browse all 200+ space company profiles on SpaceNexus
            </Link>
          </p>
        </section>

        {/* Investment Trends */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Space Industry Investment Trends</h2>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-sm text-slate-400 mb-1">Private Space Investment (2025)</div>
                <div className="text-2xl font-bold text-white">$18.5 Billion</div>
                <div className="text-xs text-slate-500 mt-1">Across 260+ deals globally</div>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-1">Cumulative Investment (2015-2025)</div>
                <div className="text-2xl font-bold text-white">$115 Billion</div>
                <div className="text-xs text-slate-500 mt-1">VC, PE, and government grants combined</div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-white font-semibold text-sm">Top Investment Themes (2025-2026)</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-3 text-slate-300 text-sm">
                  <span className="text-nebula-400 mt-0.5 shrink-0">&#10003;</span>
                  <span><strong className="text-white">Satellite broadband</strong> — $4.2B invested in 2025. Starlink competitors raising capital to close coverage gaps.</span>
                </li>
                <li className="flex items-start gap-3 text-slate-300 text-sm">
                  <span className="text-nebula-400 mt-0.5 shrink-0">&#10003;</span>
                  <span><strong className="text-white">Earth observation AI</strong> — $2.8B invested. AI-powered analytics layered on top of satellite imagery data.</span>
                </li>
                <li className="flex items-start gap-3 text-slate-300 text-sm">
                  <span className="text-nebula-400 mt-0.5 shrink-0">&#10003;</span>
                  <span><strong className="text-white">Defense & dual-use</strong> — $3.1B invested. Government demand for resilient, proliferated satellite architectures.</span>
                </li>
                <li className="flex items-start gap-3 text-slate-300 text-sm">
                  <span className="text-nebula-400 mt-0.5 shrink-0">&#10003;</span>
                  <span><strong className="text-white">In-space services</strong> — $1.5B invested. Debris removal, satellite servicing, and space logistics.</span>
                </li>
                <li className="flex items-start gap-3 text-slate-300 text-sm">
                  <span className="text-nebula-400 mt-0.5 shrink-0">&#10003;</span>
                  <span><strong className="text-white">Launch vehicle development</strong> — $2.4B invested. New reusable vehicles from Rocket Lab (Neutron), Relativity, and others.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Regional Market Share */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Regional Market Share</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5">
              <h3 className="text-white font-semibold mb-1">United States</h3>
              <div className="text-xl font-bold text-nebula-400 mb-2">~55% market share</div>
              <p className="text-slate-400 text-sm">
                Dominant position driven by SpaceX, defense primes, NASA budgets ($25B+), Space Force ($30B+),
                and a thriving VC ecosystem. Home to most commercial space startups.
              </p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5">
              <h3 className="text-white font-semibold mb-1">Europe</h3>
              <div className="text-xl font-bold text-nebula-400 mb-2">~15% market share</div>
              <p className="text-slate-400 text-sm">
                ESA budget of $7.7B+, Arianespace launch services, Airbus and Thales satellite manufacturing.
                Strong in Earth observation (Copernicus) and navigation (Galileo).
              </p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5">
              <h3 className="text-white font-semibold mb-1">China</h3>
              <div className="text-xl font-bold text-nebula-400 mb-2">~12% market share</div>
              <p className="text-slate-400 text-sm">
                Rapidly growing with government-backed programs (Tiangong station, Chang&apos;e lunar missions)
                and an emerging commercial sector. 60+ launches annually. BeiDou navigation fully operational.
              </p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5">
              <h3 className="text-white font-semibold mb-1">Rest of World</h3>
              <div className="text-xl font-bold text-nebula-400 mb-2">~18% market share</div>
              <p className="text-slate-400 text-sm">
                Japan (JAXA, ispace), India (ISRO, IN-SPACe), South Korea, UAE, Australia, and emerging
                space nations in Africa and Southeast Asia. India&apos;s commercial space sector growing rapidly.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-slate-800/60 border border-nebula-500/30 rounded-xl p-6 text-center mb-12">
          <h3 className="text-xl font-bold text-white mb-2">Track the Space Economy in Real Time</h3>
          <p className="text-slate-400 text-sm mb-4">
            SpaceNexus Market Intelligence provides live data on space industry deals, company financials,
            government contracts, and sector analysis. Stay ahead of the market.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/market-intel"
              className="inline-block bg-nebula-500 hover:bg-nebula-600 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Open Market Intelligence
            </Link>
            <Link
              href="/space-economy"
              className="inline-block bg-slate-700/50 hover:bg-slate-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors border border-slate-600/50"
            >
              View Space Economy Dashboard
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">{item.question}</h3>
                <p className="text-slate-400 text-sm">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Internal Links */}
        <section className="border-t border-slate-700/50 pt-8 mb-8">
          <h3 className="text-lg font-bold text-white mb-4">Related SpaceNexus Tools & Data</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              href="/market-intel"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Market Intel</div>
              <div className="text-slate-500 text-xs">Live data</div>
            </Link>
            <Link
              href="/company-profiles"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Company Profiles</div>
              <div className="text-slate-500 text-xs">200+ companies</div>
            </Link>
            <Link
              href="/space-economy"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Space Economy</div>
              <div className="text-slate-500 text-xs">Trends & data</div>
            </Link>
            <Link
              href="/space-capital"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Space Capital</div>
              <div className="text-slate-500 text-xs">Investment tracking</div>
            </Link>
          </div>
        </section>

        {/* Other Guides */}
        <section className="border-t border-slate-700/50 pt-8">
          <h3 className="text-lg font-bold text-white mb-4">More from the Learning Center</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link
              href="/learn/satellite-launch-cost"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Satellite Launch Costs</div>
              <div className="text-slate-500 text-xs">Complete cost breakdown</div>
            </Link>
            <Link
              href="/learn/how-to-track-satellites"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">How to Track Satellites</div>
              <div className="text-slate-500 text-xs">Real-time tracking guide</div>
            </Link>
            <Link
              href="/learn/space-companies-to-watch"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Top Space Companies 2026</div>
              <div className="text-slate-500 text-xs">25 companies to watch</div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
