import type { Metadata } from 'next';
import Link from 'next/link';
import FAQSchema from '@/components/seo/FAQSchema';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'How Much Does It Cost to Launch a Satellite in 2026? | SpaceNexus',
  description:
    'Complete satellite launch cost breakdown by provider: SpaceX Falcon 9 ($2,720/kg), Rocket Lab Electron ($25,000/kg), ULA Vulcan, Arianespace Ariane 6. Rideshare from $5,000/kg. Compare pricing, orbit types, and calculate your mission cost.',
  keywords: [
    'satellite launch cost',
    'how much to launch a satellite',
    'space launch pricing',
    'rideshare launch cost',
    'SpaceX launch cost',
    'Falcon 9 price per kg',
    'rocket launch cost comparison',
    'satellite deployment cost',
    'small satellite launch cost',
    'cubesat launch cost',
    'dedicated launch cost',
    'LEO launch cost',
    'GEO launch cost',
  ],
  openGraph: {
    title: 'How Much Does It Cost to Launch a Satellite in 2026?',
    description:
      'Complete breakdown of satellite launch costs by provider, orbit type, and payload mass. Compare rideshare vs. dedicated pricing.',
    type: 'article',
    url: 'https://spacenexus.us/learn/satellite-launch-cost',
    siteName: 'SpaceNexus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How Much Does It Cost to Launch a Satellite in 2026?',
    description:
      'Complete breakdown of satellite launch costs by provider, orbit, and mass. Rideshare from $5,000/kg.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/learn/satellite-launch-cost',
  },
};

const launchProviders = [
  {
    provider: 'SpaceX Falcon 9',
    country: 'United States',
    payloadLeo: '22,800 kg',
    payloadGto: '8,300 kg',
    dedicatedPrice: '$67M',
    pricePerKgLeo: '$2,720',
    pricePerKgGto: '$8,070',
    ridesharePerKg: '$5,500',
    status: 'Operational',
    notes: 'Most flown commercial rocket. Reusable first stage reduces costs. Transporter rideshare missions offer lowest per-kg rates.',
  },
  {
    provider: 'SpaceX Falcon Heavy',
    country: 'United States',
    payloadLeo: '63,800 kg',
    payloadGto: '26,700 kg',
    dedicatedPrice: '$97M',
    pricePerKgLeo: '$1,520',
    pricePerKgGto: '$3,630',
    ridesharePerKg: 'N/A',
    status: 'Operational',
    notes: 'Heaviest operational launch vehicle. Ideal for large GEO satellites and deep-space missions. Three Falcon 9 cores.',
  },
  {
    provider: 'Rocket Lab Electron',
    country: 'USA / NZ',
    payloadLeo: '300 kg',
    payloadGto: 'N/A',
    dedicatedPrice: '$7.5M',
    pricePerKgLeo: '$25,000',
    pricePerKgGto: 'N/A',
    ridesharePerKg: '$7,000',
    status: 'Operational',
    notes: 'Leading small-sat dedicated launcher. Fast cadence, responsive launch from multiple pads. Electron is partially reusable.',
  },
  {
    provider: 'ULA Vulcan Centaur',
    country: 'United States',
    payloadLeo: '27,200 kg',
    payloadGto: '14,400 kg',
    dedicatedPrice: '$110M (est.)',
    pricePerKgLeo: '$4,040',
    pricePerKgGto: '$7,640',
    ridesharePerKg: 'N/A',
    status: 'Operational',
    notes: 'Successor to Atlas V and Delta IV. Primary launcher for US national security missions. BE-4 engines from Blue Origin.',
  },
  {
    provider: 'Arianespace Ariane 6',
    country: 'Europe',
    payloadLeo: '21,650 kg',
    payloadGto: '11,500 kg',
    dedicatedPrice: '$77M (est.)',
    pricePerKgLeo: '$3,560',
    pricePerKgGto: '$6,700',
    ridesharePerKg: '$6,500',
    status: 'Operational',
    notes: 'Europe\'s primary launcher. Two variants: A62 (2 boosters) and A64 (4 boosters). Launches from Kourou, French Guiana.',
  },
  {
    provider: 'ISRO PSLV',
    country: 'India',
    payloadLeo: '1,750 kg',
    payloadGto: '1,425 kg',
    dedicatedPrice: '$21M',
    pricePerKgLeo: '$12,000',
    pricePerKgGto: '$14,740',
    ridesharePerKg: '$5,000',
    status: 'Operational',
    notes: 'Extremely reliable with 55+ consecutive successes. Popular for rideshare missions. Launched 104 satellites in a single flight.',
  },
  {
    provider: 'Rocket Lab Neutron',
    country: 'USA / NZ',
    payloadLeo: '13,000 kg',
    payloadGto: '5,000 kg (est.)',
    dedicatedPrice: '$55M (est.)',
    pricePerKgLeo: '$4,230',
    pricePerKgGto: '$11,000 (est.)',
    ridesharePerKg: 'TBD',
    status: 'In Development',
    notes: 'Medium-lift reusable rocket targeting 2026 first flight. Designed for mega-constellation deployment and interplanetary missions.',
  },
  {
    provider: 'SpaceX Starship',
    country: 'United States',
    payloadLeo: '150,000 kg',
    payloadGto: '21,000 kg',
    dedicatedPrice: '$10M (target)',
    pricePerKgLeo: '$67 (target)',
    pricePerKgGto: '$476 (target)',
    ridesharePerKg: 'TBD',
    status: 'In Development',
    notes: 'Fully reusable super-heavy lift vehicle. If target costs are achieved, would reduce launch costs by 10-100x. Still in test flight phase.',
  },
];

const costFactors = [
  {
    factor: 'Orbit Type',
    impact: 'High',
    description: 'LEO (160-2,000 km) is the cheapest. MEO costs 1.5-2x more. GEO (35,786 km) costs 2-3x more than LEO. Beyond GEO (lunar, interplanetary) can cost 5-10x more due to energy requirements.',
  },
  {
    factor: 'Payload Mass',
    impact: 'High',
    description: 'Heavier satellites need larger rockets. A 100 kg CubeSat can rideshare for $500K-$1M, while a 6,000 kg GEO comsat on a dedicated launch costs $60-110M. Per-kg costs decrease with larger payloads.',
  },
  {
    factor: 'Rideshare vs. Dedicated',
    impact: 'High',
    description: 'Rideshare missions (sharing a rocket with other payloads) cost 50-80% less per kg than dedicated launches. SpaceX Transporter missions offer rideshare slots starting at $275K for 50 kg.',
  },
  {
    factor: 'Launch Insurance',
    impact: 'Medium',
    description: 'Typically 5-15% of the satellite value. A $200M satellite may require $10-30M in launch insurance. Rates vary by vehicle reliability record and orbit complexity.',
  },
  {
    factor: 'Regulatory & Licensing',
    impact: 'Medium',
    description: 'FCC spectrum licensing ($50K-$500K), FAA launch license, ITU coordination, NOAA remote sensing license (if applicable), and export control (ITAR) compliance can add $200K-$2M to total costs.',
  },
  {
    factor: 'Integration & Testing',
    impact: 'Medium',
    description: 'Payload integration, vibration testing, thermal-vacuum testing, and launch campaign support typically cost $500K-$5M depending on satellite complexity and provider.',
  },
  {
    factor: 'Schedule Flexibility',
    impact: 'Low-Medium',
    description: 'Willing to wait for the next available slot? You save money. Need a specific launch window or responsive launch? Expect a 20-50% premium for dedicated, schedule-priority missions.',
  },
  {
    factor: 'Deployment Orbit Precision',
    impact: 'Low',
    description: 'Standard orbit insertion is included. Precise orbit placement, custom altitude, or multiple deployment orbits (cluster missions) may add $1-5M to mission cost.',
  },
];

const historicalCosts = [
  { year: '1970', costPerKg: '$54,500', vehicle: 'Saturn V', notes: 'Apollo program era' },
  { year: '1981', costPerKg: '$54,500', vehicle: 'Space Shuttle', notes: 'Reusable but expensive operations' },
  { year: '2000', costPerKg: '$18,500', vehicle: 'Ariane 4', notes: 'Commercial launch industry matures' },
  { year: '2010', costPerKg: '$10,000', vehicle: 'Falcon 9 v1.0', notes: 'SpaceX enters the market' },
  { year: '2015', costPerKg: '$4,650', vehicle: 'Falcon 9 FT', notes: 'First successful booster landing' },
  { year: '2020', costPerKg: '$2,720', vehicle: 'Falcon 9 Block 5', notes: 'Routine reuse, 10+ flights per booster' },
  { year: '2025', costPerKg: '$2,500', vehicle: 'Falcon 9 Block 5', notes: 'Booster reuse exceeds 20 flights' },
  { year: '2026+', costPerKg: '<$100 (target)', vehicle: 'Starship', notes: 'Fully reusable, super heavy lift' },
];

const faqItems = [
  {
    question: 'How much does it cost to launch a small satellite?',
    answer:
      'A small satellite (1-50 kg) can be launched via rideshare for $50,000-$500,000, or approximately $5,000-$10,000 per kilogram. SpaceX Transporter rideshare missions start at $275,000 for a 50 kg payload slot. CubeSat deployers on the ISS can cost as little as $40,000-$80,000 per unit. For a dedicated small-sat launch on Rocket Lab Electron, expect to pay approximately $7.5 million for up to 300 kg to LEO.',
  },
  {
    question: 'Why are SpaceX launches cheaper than competitors?',
    answer:
      'SpaceX achieves lower costs through three key innovations: (1) Reusable first-stage boosters that have flown 20+ times each, spreading manufacturing cost across many flights; (2) Vertical integration — SpaceX manufactures 80% of components in-house, avoiding subcontractor markups; (3) High launch cadence (60+ launches per year) that amortizes fixed infrastructure costs. This combination has reduced per-kg launch costs by approximately 90% compared to pre-SpaceX era pricing.',
  },
  {
    question: 'What is the difference between rideshare and dedicated launch?',
    answer:
      'A dedicated launch reserves the entire rocket for your payload, giving you full control over orbit, schedule, and deployment parameters. Costs range from $7.5M (small rockets) to $150M+ (heavy lift). A rideshare launch shares the rocket with multiple payloads, significantly reducing per-kg cost (50-80% savings) but limiting your orbit choice to the primary mission profile. Rideshare is ideal for smallsats heading to common orbits like sun-synchronous LEO.',
  },
  {
    question: 'How much does it cost to put a satellite in geostationary orbit?',
    answer:
      'A geostationary orbit (GEO) launch typically costs $60-150 million for a dedicated mission, depending on the launch vehicle and satellite mass (usually 3,000-7,000 kg). Per-kilogram costs to GEO range from $3,600 (Falcon Heavy) to $14,000+ (smaller vehicles). Total mission costs including the satellite itself, insurance, and ground segment are typically $200-500 million. GEO launches cost more than LEO because of the additional energy needed to reach 35,786 km altitude.',
  },
  {
    question: 'Will satellite launch costs continue to decrease?',
    answer:
      'Yes, the trend toward lower launch costs is expected to continue. SpaceX Starship aims to reduce per-kg costs to under $100, a 95% reduction from current Falcon 9 pricing. Increased competition from Rocket Lab Neutron, Relativity Terran R, Blue Origin New Glenn, and Chinese commercial providers will drive further price reductions. Industry analysts project launch costs could fall another 50-90% by 2030, enabled by full reusability, higher flight rates, and manufacturing improvements.',
  },
];

export default function SatelliteLaunchCostPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How Much Does It Cost to Launch a Satellite in 2026?',
    description:
      'Complete satellite launch cost breakdown by provider, orbit type, and payload mass. Compare rideshare vs. dedicated pricing.',
    author: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
    publisher: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      url: 'https://spacenexus.us',
      logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/spacenexus-logo.png' },
    },
    datePublished: '2026-02-18T00:00:00Z',
    dateModified: '2026-02-18T00:00:00Z',
    mainEntityOfPage: 'https://spacenexus.us/learn/satellite-launch-cost',
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
          <span className="text-slate-400">Satellite Launch Cost</span>
        </nav>

        {/* Hero */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-nebula-500/10 text-nebula-400 border border-nebula-500/20">
              Cost Analysis
            </span>
            <span className="text-xs text-slate-500">Updated February 2026</span>
            <span className="text-xs text-slate-500">12 min read</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
            How Much Does It Cost to Launch a Satellite in 2026?
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            The cost of reaching orbit has plummeted over the past decade. With SpaceX Falcon 9 offering
            dedicated launches for $67 million and rideshare slots starting at $275,000, space has never
            been more accessible. This guide breaks down real launch costs by provider, orbit type, and
            payload mass to help you budget your next mission.
          </p>
        </header>

        {/* Quick Answer */}
        <div className="bg-slate-800/60 border border-nebula-500/30 rounded-xl p-6 mb-12">
          <h2 className="text-lg font-bold text-white mb-4">Quick Answer: Satellite Launch Costs in 2026</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Rideshare (shared rocket)</div>
              <div className="text-2xl font-bold text-nebula-400">$5,000 - $10,000 / kg</div>
              <div className="text-xs text-slate-500 mt-1">Lowest cost, limited orbit flexibility</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Dedicated (your own rocket)</div>
              <div className="text-2xl font-bold text-nebula-400">$2,500 - $67,000 / kg</div>
              <div className="text-xs text-slate-500 mt-1">Full orbit control, varies by vehicle</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm text-slate-400">CubeSat (3U)</div>
                <div className="text-white font-semibold">$150K - $300K</div>
              </div>
              <div>
                <div className="text-sm text-slate-400">SmallSat (100 kg)</div>
                <div className="text-white font-semibold">$500K - $1M</div>
              </div>
              <div>
                <div className="text-sm text-slate-400">Large GEO Sat</div>
                <div className="text-white font-semibold">$60M - $150M</div>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Breakdown by Provider */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-2">Launch Cost Comparison by Provider</h2>
          <p className="text-slate-400 text-sm mb-6">
            Prices reflect publicly available data and industry estimates as of early 2026. All costs in
            USD. Costs adjusted to 2026 dollars where applicable.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left text-slate-400 font-medium py-3 pr-4">Provider / Vehicle</th>
                  <th className="text-left text-slate-400 font-medium py-3 pr-4">Payload to LEO</th>
                  <th className="text-left text-slate-400 font-medium py-3 pr-4">Dedicated Price</th>
                  <th className="text-left text-slate-400 font-medium py-3 pr-4">Price/kg (LEO)</th>
                  <th className="text-left text-slate-400 font-medium py-3">Rideshare/kg</th>
                </tr>
              </thead>
              <tbody>
                {launchProviders.map((lp) => (
                  <tr key={lp.provider} className="border-b border-slate-700/30">
                    <td className="py-3 pr-4">
                      <div className="text-white font-medium">{lp.provider}</div>
                      <div className="text-xs text-slate-500">{lp.country} &middot; {lp.status}</div>
                    </td>
                    <td className="py-3 pr-4 text-slate-300">{lp.payloadLeo}</td>
                    <td className="py-3 pr-4 text-slate-300">{lp.dedicatedPrice}</td>
                    <td className="py-3 pr-4 text-nebula-400 font-medium">{lp.pricePerKgLeo}</td>
                    <td className="py-3 text-slate-300">{lp.ridesharePerKg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-slate-500 text-xs mt-3">
            Sources: SpaceX published pricing, Rocket Lab investor presentations, industry analyst
            estimates, and government contract data. Estimated values marked with (est.).
          </p>
        </section>

        {/* Provider Details */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Launch Provider Details</h2>
          <div className="space-y-4">
            {launchProviders.map((lp) => (
              <div key={lp.provider} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold">{lp.provider}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    lp.status === 'Operational'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {lp.status}
                  </span>
                </div>
                <p className="text-slate-400 text-sm mb-3">{lp.notes}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">LEO Capacity:</span>
                    <span className="text-slate-300 ml-1">{lp.payloadLeo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">GTO Capacity:</span>
                    <span className="text-slate-300 ml-1">{lp.payloadGto}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Cost/kg LEO:</span>
                    <span className="text-nebula-400 ml-1">{lp.pricePerKgLeo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Cost/kg GTO:</span>
                    <span className="text-slate-300 ml-1">{lp.pricePerKgGto}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Factors Affecting Cost */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-2">Factors That Affect Satellite Launch Cost</h2>
          <p className="text-slate-400 text-sm mb-6">
            The sticker price of a launch vehicle is only part of the story. Understanding these factors
            helps you estimate true mission cost and identify savings opportunities.
          </p>
          <div className="space-y-4">
            {costFactors.map((cf) => (
              <div key={cf.factor} className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-white font-semibold">{cf.factor}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    cf.impact === 'High'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : cf.impact === 'Medium'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                  }`}>
                    {cf.impact} impact
                  </span>
                </div>
                <p className="text-slate-400 text-sm">{cf.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Historical Cost Trends */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-2">Historical Launch Cost Trends</h2>
          <p className="text-slate-400 text-sm mb-6">
            Launch costs have fallen by over 95% since the Space Shuttle era, driven primarily by SpaceX&apos;s
            reusable rocket technology. The next decade could see another 90%+ reduction if Starship
            achieves its cost targets.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left text-slate-400 font-medium py-3 pr-4">Year</th>
                  <th className="text-left text-slate-400 font-medium py-3 pr-4">Cost per kg to LEO</th>
                  <th className="text-left text-slate-400 font-medium py-3 pr-4">Vehicle</th>
                  <th className="text-left text-slate-400 font-medium py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {historicalCosts.map((hc) => (
                  <tr key={hc.year} className="border-b border-slate-700/30">
                    <td className="py-3 pr-4 text-white font-medium">{hc.year}</td>
                    <td className="py-3 pr-4 text-nebula-400 font-medium">{hc.costPerKg}</td>
                    <td className="py-3 pr-4 text-slate-300">{hc.vehicle}</td>
                    <td className="py-3 text-slate-400 text-xs">{hc.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-slate-500 text-xs mt-3">
            Costs in 2026 USD equivalent. Historical figures adjusted for inflation. Sources: NASA,
            FAA, SpaceX published pricing.
          </p>
        </section>

        {/* Orbit Types & Pricing */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Launch Costs by Orbit Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5">
              <h3 className="text-white font-semibold mb-1">Low Earth Orbit (LEO)</h3>
              <div className="text-sm text-slate-500 mb-3">160 - 2,000 km altitude</div>
              <div className="text-xl font-bold text-nebula-400 mb-2">$2,500 - $25,000 / kg</div>
              <p className="text-slate-400 text-sm">
                Most accessible orbit. Used by Earth observation, communications constellations (Starlink),
                ISS resupply, and scientific missions. Shortest travel time and lowest energy requirement.
              </p>
              <div className="mt-3 text-xs text-slate-500">Typical satellites: Starlink, Planet Labs, ISS cargo</div>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5">
              <h3 className="text-white font-semibold mb-1">Medium Earth Orbit (MEO)</h3>
              <div className="text-sm text-slate-500 mb-3">2,000 - 35,786 km altitude</div>
              <div className="text-xl font-bold text-nebula-400 mb-2">$5,000 - $35,000 / kg</div>
              <p className="text-slate-400 text-sm">
                Home to navigation constellations (GPS, Galileo, GLONASS) and some communications systems.
                Requires more energy than LEO but less than GEO. Longer orbital lifetime.
              </p>
              <div className="mt-3 text-xs text-slate-500">Typical satellites: GPS III, O3b mPOWER, Galileo</div>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5">
              <h3 className="text-white font-semibold mb-1">Geostationary Orbit (GEO)</h3>
              <div className="text-sm text-slate-500 mb-3">35,786 km altitude (equatorial)</div>
              <div className="text-xl font-bold text-nebula-400 mb-2">$8,000 - $67,000 / kg</div>
              <p className="text-slate-400 text-sm">
                Satellites appear stationary over one point on Earth. Ideal for broadcast television,
                weather monitoring, and wide-area communications. Highest cost due to energy requirements.
              </p>
              <div className="mt-3 text-xs text-slate-500">Typical satellites: SES, Intelsat, GOES weather</div>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-5">
              <h3 className="text-white font-semibold mb-1">Sun-Synchronous Orbit (SSO)</h3>
              <div className="text-sm text-slate-500 mb-3">600 - 800 km altitude (polar)</div>
              <div className="text-xl font-bold text-nebula-400 mb-2">$5,000 - $15,000 / kg</div>
              <p className="text-slate-400 text-sm">
                Passes over the same point at the same local time each day, providing consistent lighting
                for imaging. Most Earth observation satellites use SSO. Slightly more expensive than
                equatorial LEO due to polar launch requirements.
              </p>
              <div className="mt-3 text-xs text-slate-500">Typical satellites: Sentinel, Landsat, WorldView</div>
            </div>
          </div>
        </section>

        {/* How to Reduce Costs */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">How to Reduce Your Satellite Launch Cost</h2>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-6">
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="text-nebula-400 font-bold text-lg shrink-0">1.</span>
                <div>
                  <h4 className="text-white font-semibold">Choose rideshare over dedicated launch</h4>
                  <p className="text-slate-400 text-sm mt-1">
                    If your orbit requirements are flexible, rideshare missions can save 50-80% versus a dedicated
                    launch. SpaceX Transporter missions launch approximately every 2-3 months to SSO.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-nebula-400 font-bold text-lg shrink-0">2.</span>
                <div>
                  <h4 className="text-white font-semibold">Optimize satellite mass</h4>
                  <p className="text-slate-400 text-sm mt-1">
                    Every kilogram matters when you are paying $5,000-$25,000 per kg. Use lightweight materials,
                    miniaturized components, and efficient propulsion to reduce launch mass.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-nebula-400 font-bold text-lg shrink-0">3.</span>
                <div>
                  <h4 className="text-white font-semibold">Consider emerging launch providers</h4>
                  <p className="text-slate-400 text-sm mt-1">
                    New entrants like Firefly, ABL Space, and Chinese commercial providers often offer competitive
                    pricing to build their manifest. First-flight discounts can be significant.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-nebula-400 font-bold text-lg shrink-0">4.</span>
                <div>
                  <h4 className="text-white font-semibold">Book early, be flexible on schedule</h4>
                  <p className="text-slate-400 text-sm mt-1">
                    Launch providers offer better rates for bookings made 12-24 months in advance. Schedule
                    flexibility (willing to shift 1-3 months) can unlock lower pricing tiers.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-nebula-400 font-bold text-lg shrink-0">5.</span>
                <div>
                  <h4 className="text-white font-semibold">Use a launch broker or aggregator</h4>
                  <p className="text-slate-400 text-sm mt-1">
                    Companies like Spaceflight Inc., Exolaunch, and D-Orbit aggregate smallsat payloads and negotiate
                    bulk rates with launch providers, passing savings on to individual customers.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-slate-800/60 border border-nebula-500/30 rounded-xl p-6 text-center mb-12">
          <h3 className="text-xl font-bold text-white mb-2">Calculate Your Mission Cost</h3>
          <p className="text-slate-400 text-sm mb-4">
            Use the SpaceNexus Mission Cost Calculator to estimate total launch cost based on your
            satellite mass, target orbit, and preferred provider. Compare options side-by-side.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/mission-cost"
              className="inline-block bg-nebula-500 hover:bg-nebula-600 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Open Mission Cost Calculator
            </Link>
            <Link
              href="/orbital-costs"
              className="inline-block bg-slate-700/50 hover:bg-slate-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors border border-slate-600/50"
            >
              View Orbital Cost Data
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
              href="/mission-cost"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Mission Cost</div>
              <div className="text-slate-500 text-xs">Calculator</div>
            </Link>
            <Link
              href="/orbital-costs"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Orbital Costs</div>
              <div className="text-slate-500 text-xs">Pricing data</div>
            </Link>
            <Link
              href="/space-insurance"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Space Insurance</div>
              <div className="text-slate-500 text-xs">Coverage & rates</div>
            </Link>
            <Link
              href="/launch-vehicles"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 text-center hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Launch Vehicles</div>
              <div className="text-slate-500 text-xs">Full catalog</div>
            </Link>
          </div>
        </section>

        {/* Other Guides */}
        <section className="border-t border-slate-700/50 pt-8">
          <h3 className="text-lg font-bold text-white mb-4">More from the Learning Center</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Link
              href="/learn/space-industry-market-size"
              className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 hover:border-nebula-500/50 transition-colors"
            >
              <div className="text-white text-sm font-medium">Space Industry Market Size</div>
              <div className="text-slate-500 text-xs">$1.8 trillion and growing</div>
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
