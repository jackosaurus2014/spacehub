import type { Metadata } from 'next';
import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';
import GuideNavigation from '@/components/guide/GuideNavigation';
import ReadingTime from '@/components/ui/ReadingTime';
import RelatedModules from '@/components/ui/RelatedModules';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const revalidate = 3600;

const TITLE = 'The Space Economy Value Chain: Upstream, Midstream, Downstream';
const DESCRIPTION =
  'How money flows through the space industry — from launch and manufacturing (upstream) through satellite operators and ground segment (midstream) to data, services and applications (downstream). Segment sizes, margins, who captures the value, and where it is moving.';

export const metadata: Metadata = {
  title: 'Space Economy Value Chain: Where the Money Is Made (2026)',
  description: DESCRIPTION,
  keywords: [
    'space economy value chain',
    'space value chain',
    'space industry value chain',
    'upstream midstream downstream space',
    'space industry segments',
    'satellite industry value chain',
    'space economy 2026',
    'who makes money in space',
  ],
  openGraph: {
    title: 'Space Economy Value Chain: Where the Money Is Made (2026)',
    description: DESCRIPTION,
    type: 'article',
    authors: ['SpaceNexus'],
    images: [
      {
        url: '/api/og?title=The+Space+Economy+Value+Chain&subtitle=Upstream%2C+midstream%2C+downstream+%E2%80%94+where+the+money+is+made&type=guide',
        width: 1200,
        height: 630,
        alt: TITLE,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Economy Value Chain: Where the Money Is Made | SpaceNexus',
    description:
      'Upstream, midstream, downstream — segment sizes, margins, and who captures the value in the space economy.',
    images: ['/api/og?title=The+Space+Economy+Value+Chain&subtitle=Upstream%2C+midstream%2C+downstream+%E2%80%94+where+the+money+is+made&type=guide'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/guide/space-economy-value-chain',
  },
};

const TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'map', label: 'The Value Chain Map' },
  { id: 'upstream', label: 'Upstream: Building and Launching' },
  { id: 'midstream', label: 'Midstream: Operating' },
  { id: 'downstream', label: 'Downstream: Data, Services, Applications' },
  { id: 'enablers', label: 'Enablers: Capital, Insurance, Regulation, Talent' },
  { id: 'who-wins', label: 'Who Captures the Value' },
  { id: 'shifts', label: 'Where the Chain Is Moving' },
  { id: 'faq', label: 'FAQ' },
];

const SEGMENTS = [
  {
    tier: 'Upstream',
    name: 'Components & Subsystems',
    size: 'Tens of $B (inside manufacturing)',
    examples: 'Solar cells, rad-hard electronics, propulsion, star trackers, antennas, structures',
    margin: 'High for sole-source parts; thin for commodities',
    players: 'Rocket Lab (components), Redwire, Honeywell, Airbus, Mitsubishi Electric, hundreds of specialists',
  },
  {
    tier: 'Upstream',
    name: 'Spacecraft Manufacturing',
    size: '~$17–20B / yr',
    examples: 'Buses, payloads, integration and test',
    margin: 'Moderate; project risk is the killer',
    players: 'Airbus D&S, Thales Alenia, Lockheed, Northrop, Lanteris (ex-Maxar), York, Terran Orbital, Apex, SpaceX (Starlink, in-house)',
  },
  {
    tier: 'Upstream',
    name: 'Launch',
    size: '~$8–10B / yr',
    examples: 'Dedicated and rideshare launch, orbital transfer',
    margin: 'Historically poor; reusability changed it for exactly one company',
    players: 'SpaceX (~85% of global mass to orbit), ULA, Arianespace, Rocket Lab, Blue Origin, CASC, ISRO, Mitsubishi Heavy',
  },
  {
    tier: 'Midstream',
    name: 'Satellite Operators',
    size: '~$110B / yr (satellite services)',
    examples: 'Broadband, broadcast, mobile connectivity, Earth observation capacity, navigation signals (public)',
    margin: 'High once the constellation is paid for; brutal capex before that',
    players: 'Starlink, SES, Intelsat, Eutelsat OneWeb, Viasat, Iridium, Planet, ICEYE, Maxar/Vantor, Amazon Kuiper',
  },
  {
    tier: 'Midstream',
    name: 'Ground Segment',
    size: '~$150–160B / yr (ground equipment, mostly GNSS devices)',
    examples: 'User terminals, gateways, teleports, ground-station-as-a-service, GNSS chipsets in every phone',
    margin: 'Commodity for chips; strong for terminals and networks',
    players: 'Qualcomm/Broadcom/u-blox (GNSS), Hughes, Gilat, Kymeta, KSAT, SSC, AWS Ground Station, Viasat',
  },
  {
    tier: 'Downstream',
    name: 'Data, Analytics & Applications',
    size: 'The largest and least bounded tier — location, timing, imagery analytics, weather, insurance, agriculture, defence',
    examples: 'Ride-hailing, precision agriculture, maritime tracking, ESG monitoring, wildfire detection, disaster response',
    margin: 'Software margins — but the space part is a small share of the value',
    players: 'Google/Apple/Uber (GNSS-dependent), Planet, Spire, BlackSky, HawkEye 360, Descartes Labs, Palantir, insurers, banks',
  },
];

const FAQ_ITEMS = [
  {
    question: 'What is the space economy value chain?',
    answer:
      'It is the sequence of activities that turns capital and engineering into revenue from space: building components and spacecraft, launching them (upstream); operating satellites and the ground networks that talk to them (midstream); and turning the resulting data, signals and connectivity into products people pay for — navigation, broadband, imagery analytics, weather, defence intelligence (downstream). Finance, insurance, regulation and workforce sit alongside as enablers of every tier.',
  },
  {
    question: 'How big is the space economy?',
    answer:
      'Estimates converge on roughly $600 billion a year. The Space Foundation put the 2024 global space economy at about $613 billion, roughly three-quarters commercial and one-quarter government. McKinsey and the World Economic Forum estimated $630 billion in 2023 and project $1.8 trillion by 2035, most of the growth coming from downstream applications rather than rockets.',
  },
  {
    question: 'Which part of the space value chain makes the most money?',
    answer:
      'By revenue, the ground segment and downstream services dwarf launch and manufacturing: launch is under 2% of the total. By margin, satellite operators with paid-off constellations and downstream software businesses do best. Launch is the most visible tier and, historically, the least profitable — SpaceX changed that for itself through reusability and by owning its largest customer, Starlink.',
  },
  {
    question: 'Why is launch such a small share of the space economy?',
    answer:
      'Because a launch is a one-time cost that enables years of revenue. A $70 million Falcon 9 mission can deploy satellites that earn hundreds of millions over their lives. Falling launch prices have made the share smaller still even as the number of launches has grown — the value migrates downstream to whoever uses the capacity.',
  },
  {
    question: 'Where should a new space company position itself?',
    answer:
      'Where a scarce capability meets a paying customer. Upstream niches with few qualified suppliers (radiation-hardened electronics, propulsion, optical terminals) command pricing power. Downstream, the winners sell an outcome — crop yield, ship location, insurance risk — not "satellite data". The most crowded, hardest tier to enter is launch, followed by generic Earth-observation imagery.',
  },
];

function TierBadge({ tier }: { tier: string }) {
  const color =
    tier === 'Upstream'
      ? 'bg-orange-500/15 text-orange-300 border-orange-500/30'
      : tier === 'Midstream'
        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  return (
    <span className={`inline-block text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${color}`}>
      {tier}
    </span>
  );
}

export default function SpaceEconomyValueChainPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="pt-6" />

        <div className="max-w-4xl mx-auto">
          <header className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{TITLE}</h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Rockets get the headlines, but launch is less than 2% of the space economy. This guide
              follows the money from the factory floor to the phone in your pocket — which tiers are
              large, which are profitable, who owns the choke points, and where the value is moving.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <ReadingTime wordCount={2400} className="flex items-center gap-1.5" />
              <span>|</span>
              <span>Updated August 2026</span>
            </div>
          </header>

          <nav className="card p-6 mb-10">
            <h2 className="text-lg font-bold text-white mb-3">Table of Contents</h2>
            <ol className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {TOC.map((item, i) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="text-slate-300 hover:text-white text-sm transition-colors">
                    {i + 1}. {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <ScrollReveal delay={0.1}>
            <article className="card p-8 space-y-10">
              {/* Overview */}
              <section id="overview">
                <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The space economy is worth roughly <strong className="text-white">$600 billion a year</strong>{' '}
                  — the Space Foundation counted about $613 billion in 2024, three-quarters of it
                  commercial — and McKinsey and the World Economic Forum expect it to reach
                  $1.8 trillion by 2035. Almost none of that is rockets. The industry is best
                  understood as a chain: upstream companies build and launch hardware, midstream
                  companies operate it, and downstream companies sell what the hardware produces.
                  Value concentrates at the ends of the chain that touch scarce capability
                  (upstream niches) or the end customer (downstream), and thins out in the middle
                  wherever capacity is abundant.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  The framing matters because it predicts behaviour. It explains why SpaceX built a
                  satellite operator on top of a launch business, why Earth-observation companies
                  keep rebranding as analytics companies, and why the ground segment — the least
                  glamorous tier — is the largest by revenue.
                </p>
              </section>

              {/* Map */}
              <section id="map">
                <h2 className="text-2xl font-bold text-white mb-4">The Value Chain Map</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Segment sizes below are order-of-magnitude, drawn from the Satellite Industry
                  Association&apos;s annual State of the Satellite Industry report and the Space
                  Foundation&apos;s Space Report. Government spending (~$125 billion) runs through
                  every tier as a customer and is not shown as a segment of its own.
                </p>
                <div className="space-y-3">
                  {SEGMENTS.map((s) => (
                    <div key={s.name} className="card p-5">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <TierBadge tier={s.tier} />
                        <h3 className="font-semibold text-white text-base">{s.name}</h3>
                        <span className="text-xs text-slate-400 ml-auto">{s.size}</span>
                      </div>
                      <p className="text-xs text-slate-300 mb-1"><strong>What it sells:</strong> {s.examples}</p>
                      <p className="text-xs text-slate-300 mb-1"><strong>Margins:</strong> {s.margin}</p>
                      <p className="text-xs text-slate-400"><strong>Players:</strong> {s.players}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Upstream */}
              <section id="upstream">
                <h2 className="text-2xl font-bold text-white mb-4">Upstream: Building and Launching</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Upstream is where the physical risk lives. A spacecraft manufacturer carries
                  multi-year programmes, thin supplier bases and acceptance tests that can fail on
                  the last day. A launch provider carries the rocket. Both tiers are capital-heavy,
                  and both have been reshaped by one company.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-white">Launch</strong> is roughly $8–10 billion a year of
                  revenue on well over 250 orbital launches, and SpaceX carries the large majority
                  of the world&apos;s mass to orbit. Reusability drove the price of a kilogram to LEO
                  from tens of thousands of dollars to about $3,000 on a full Falcon 9, and
                  rideshare put a 50-kilogram satellite in orbit for under $400,000. The strategic
                  consequence: launch stopped being the bottleneck of the industry. Our{' '}
                  <Link href="/guide/space-launch-cost-comparison" className="text-slate-300 underline hover:text-white">
                    launch cost guide
                  </Link>{' '}
                  has the vehicle-by-vehicle numbers.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-white">Manufacturing</strong> splits into two businesses
                  that barely resemble each other. Bespoke GEO communications satellites and
                  government spacecraft sell for hundreds of millions each in single digits per
                  year. Constellation buses sell for low single-digit millions in hundreds — a
                  production-line business with automotive-style supply chains, where the customer
                  (Starlink, Kuiper, the Space Development Agency) often designs the bus itself.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  <strong className="text-white">Components</strong> are the quiet profit centre.
                  Radiation-hardened processors, triple-junction solar cells, precision reaction
                  wheels and optical inter-satellite terminals each have a handful of qualified
                  suppliers worldwide and lead times near a year. Rocket Lab&apos;s acquisitions of
                  solar, separation-system and software vendors were a bet on exactly this tier.
                  Our{' '}
                  <Link href="/learn/supply-chain" className="text-slate-300 underline hover:text-white">
                    supply-chain course
                  </Link>{' '}
                  covers how those bottlenecks work from the buyer&apos;s side.
                </p>
              </section>

              {/* Midstream */}
              <section id="midstream">
                <h2 className="text-2xl font-bold text-white mb-4">Midstream: Operating</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-white">Satellite operators</strong> own the assets in
                  orbit and sell capacity: broadband, broadcast, mobile backhaul, Earth-observation
                  tasking, machine-to-machine links. Satellite services run at roughly $110 billion
                  a year. The economics are a constellation&apos;s worst enemy and best friend: enormous
                  capex before the first dollar, then high-margin recurring revenue on a paid-for
                  asset. Legacy GEO operators (SES, Intelsat, Eutelsat) are living through the
                  transition from broadcast to broadband; Starlink — now well past $10 billion in
                  annual revenue — showed that a vertically integrated LEO operator can reach
                  profitability, and Amazon Kuiper is spending to prove it can be done twice.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  <strong className="text-white">The ground segment</strong> is the tier nobody
                  photographs and the largest by revenue — on the order of $150–160 billion — because
                  it includes every GNSS chipset in every phone, car and drone on Earth, plus user
                  terminals, gateways, teleports and the ground-station-as-a-service networks
                  (KSAT, SSC, AWS Ground Station) that rent antenna minutes to satellite operators.
                  Flat-panel terminals are the current battleground: whoever makes a cheap,
                  reliable electronically steered antenna sets the cost of every LEO subscriber.
                </p>
              </section>

              {/* Downstream */}
              <section id="downstream">
                <h2 className="text-2xl font-bold text-white mb-4">Downstream: Data, Services, Applications</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Downstream is where space stops looking like space. A ride-hailing app, a
                  precision-agriculture platform, a maritime insurer pricing risk from AIS and radar
                  imagery, a hedge fund counting cars in parking lots — all consume a satellite
                  input that is a small fraction of the value they create. This is the tier
                  McKinsey and the WEF expect to drive most of the growth to $1.8 trillion, and it is
                  the reason Earth-observation companies reposition as &ldquo;insights&rdquo;
                  companies: raw imagery is a commodity with falling prices, an answered question
                  is not.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  The downstream tier has two structural features. First, the space input is often
                  free or public — GPS, Galileo, Copernicus Sentinel data, NOAA weather — so the
                  customer relationship, not the satellite, is the asset. Second, government is
                  the anchor buyer for the newest capabilities (radar, RF sensing, hyperspectral)
                  years before commercial demand matures, which is why defence and intelligence
                  agencies appear on every EO company&apos;s revenue chart. Track the deals on the{' '}
                  <Link href="/procurement" className="text-slate-300 underline hover:text-white">
                    procurement tracker
                  </Link>
                  .
                </p>
              </section>

              {/* Enablers */}
              <section id="enablers">
                <h2 className="text-2xl font-bold text-white mb-4">Enablers: Capital, Insurance, Regulation, Talent</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">Capital</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Venture, growth equity, SPAC-era public listings, and — increasingly —
                      sovereign and defence-adjacent funds. Investment concentrates upstream in
                      hardware rounds and downstream in software; the middle is financed by
                      operators&apos; own balance sheets and export-credit agencies. Live data on the{' '}
                      <Link href="/funding-tracker" className="text-slate-300 underline hover:text-white">funding tracker</Link>.
                    </p>
                  </div>
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">Insurance</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Launch and in-orbit insurance is a ~$500–600 million-a-year premium pool that
                      has paid out more than it collected in several recent years after a run of GEO
                      failures. Rates rose, capacity shrank, and many constellation operators now
                      self-insure — a quiet transfer of risk from underwriters to balance sheets.
                    </p>
                  </div>
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">Regulation</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Spectrum (ITU, FCC), launch and re-entry licensing (FAA), remote-sensing
                      licences (NOAA), export control (ITAR/EAR) and a growing debris-mitigation
                      rulebook. Regulation is a moat for incumbents and a schedule risk for
                      everyone. Follow it on the{' '}
                      <Link href="/regulatory-radar" className="text-slate-300 underline hover:text-white">regulatory radar</Link>.
                    </p>
                  </div>
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">Talent</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      The chain runs on a few hundred thousand specialised engineers, and demand
                      exceeds supply for RF, GNC, flight software and manufacturing roles. The{' '}
                      <Link href="/jobs" className="text-slate-300 underline hover:text-white">jobs board</Link>{' '}
                      syncs thousands of open roles daily — a real-time read on where the chain is hiring.
                    </p>
                  </div>
                </div>
              </section>

              {/* Who wins */}
              <section id="who-wins">
                <h2 className="text-2xl font-bold text-white mb-4">Who Captures the Value</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Three positions capture disproportionate value in the chain:
                </p>
                <ul className="space-y-3">
                  {[
                    ['Vertical integrators', 'Own two or more tiers so the margin does not leak to a supplier or a customer. SpaceX (launch + operator + terminals) is the canonical case; Rocket Lab (launch + components + spacecraft) is building the same shape from the other end.'],
                    ['Scarce-capability suppliers', 'Sole- or dual-source components with year-long lead times. Small revenue, strong pricing power, and the reason big primes keep acquiring small specialists.'],
                    ['Customer owners', 'Downstream businesses that own the relationship and treat satellite data as one input among many. They capture software margins on a commodity input — and they can switch suppliers.'],
                  ].map(([title, body]) => (
                    <li key={title} className="flex items-start gap-3">
                      <span className="bg-white text-slate-900 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">•</span>
                      <span className="text-slate-400 text-sm"><strong className="text-white">{title}.</strong> {body}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-slate-400 leading-relaxed mt-4">
                  The squeezed middle is generic capacity: undifferentiated launch, undifferentiated
                  imagery, undifferentiated buses. Prices fall, and the value moves to whoever
                  does something specific with the capacity. See how individual companies stack up on{' '}
                  <Link href="/compare" className="text-slate-300 underline hover:text-white">
                    the comparison pages
                  </Link>
                  .
                </p>
              </section>

              {/* Shifts */}
              <section id="shifts">
                <h2 className="text-2xl font-bold text-white mb-4">Where the Chain Is Moving</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">Direct-to-device</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Satellites talking to unmodified phones (Starlink&apos;s D2C service with
                      T-Mobile, AST SpaceMobile, Skylo) collapse the terminal tier and hand the
                      customer relationship to mobile carriers. The ground segment shrinks; the
                      operator tier grows.
                    </p>
                  </div>
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">Defence as anchor tenant</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      The Space Development Agency&apos;s proliferated architecture, Golden Dome, and
                      allied programmes are buying constellations, launches and analytics at a scale
                      that sets prices for the commercial market too. Government share of the
                      chain is rising for the first time in a decade.
                    </p>
                  </div>
                  <div className="card p-4">
                    <h3 className="font-semibold text-white text-sm mb-1">In-space economy</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Servicing, refuelling, manufacturing in orbit and lunar logistics add tiers
                      that do not exist yet at scale. Starship-class lift makes them plausible; the
                      first real revenues are government (NASA CLPS, Space Force servicing demos).
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/space-industry" className="btn-primary text-sm py-2 px-4">
                    Space Industry Overview
                  </Link>
                  <Link href="/funding-tracker" className="btn-secondary text-sm py-2 px-4">
                    Funding Tracker
                  </Link>
                  <Link href="/space-tycoon" className="btn-secondary text-sm py-2 px-4">
                    Run the chain yourself in Space Tycoon
                  </Link>
                </div>
              </section>

              {/* FAQ */}
              <section id="faq">
                <h2 className="text-2xl font-bold text-white mb-4">Frequently Asked Questions</h2>
                <div className="space-y-4">
                  {FAQ_ITEMS.map((faq) => (
                    <div key={faq.question} className="card p-4">
                      <h3 className="font-semibold text-white text-sm mb-2">{faq.question}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="pt-6 border-t border-white/[0.06]">
                <h3 className="text-lg font-bold text-white mb-4">Related Guides</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Link href="/guide/space-industry" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Complete Guide to the Space Industry &rarr;
                  </Link>
                  <Link href="/guide/space-industry-market-size" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Space Industry Market Size &rarr;
                  </Link>
                  <Link href="/guide/commercial-space-economy" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Commercial Space Economy &rarr;
                  </Link>
                  <Link href="/guide/space-launch-cost-comparison" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Launch Cost Comparison &rarr;
                  </Link>
                  <Link href="/guide/space-economy-investment" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Investing in the Space Economy &rarr;
                  </Link>
                  <Link href="/learn/supply-chain" className="text-slate-300 hover:text-white text-sm transition-colors">
                    Learn: Space Supply Chain Fundamentals &rarr;
                  </Link>
                </div>
              </section>

              <GuideNavigation currentSlug="space-economy-value-chain" />
            </article>
          </ScrollReveal>

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: FAQ_ITEMS.map((faq) => ({
                  '@type': 'Question',
                  name: faq.question,
                  acceptedAnswer: { '@type': 'Answer', text: faq.answer },
                })),
              }).replace(/</g, '\\u003c'),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: TITLE,
                description: DESCRIPTION,
                author: { '@type': 'Organization', name: 'SpaceNexus' },
                publisher: {
                  '@type': 'Organization',
                  name: 'SpaceNexus',
                  logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' },
                },
                datePublished: '2026-08-26T00:00:00Z',
                dateModified: new Date().toISOString(),
                mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://spacenexus.us/guide/space-economy-value-chain' },
              }).replace(/</g, '\\u003c'),
            }}
          />

          <BreadcrumbSchema
            items={[
              { name: 'Home', href: '/' },
              { name: 'Guides', href: '/guide/space-industry' },
              { name: 'Space Economy Value Chain' },
            ]}
          />
        </div>

        <RelatedModules modules={PAGE_RELATIONS['guide/space-economy-value-chain']} />
      </div>
    </div>
  );
}
