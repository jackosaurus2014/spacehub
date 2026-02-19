import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: '2026 Space Launch Schedule: Every Mission This Year | SpaceNexus',
  description:
    'Complete 2026 space launch schedule with dates, launch vehicles, payloads, and launch sites. Track SpaceX Falcon 9, Starship, ULA Vulcan, Rocket Lab Electron, and every orbital mission worldwide.',
  keywords: [
    'space launch schedule 2026',
    'rocket launch schedule',
    'SpaceX launch schedule',
    'upcoming rocket launches',
    'satellite launch dates',
    'Starship launch date',
    'space launch calendar',
    'orbital launch manifest',
  ],
  openGraph: {
    title: '2026 Space Launch Schedule — Every Mission This Year',
    description:
      'Track every orbital and suborbital launch in 2026. Complete schedule with dates, vehicles, payloads, and real-time updates.',
    type: 'article',
    publishedTime: '2026-02-14T00:00:00Z',
    authors: ['SpaceNexus'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/guide/space-launch-schedule-2026',
  },
};

const TOC = [
  { id: 'overview', label: 'Launch Activity Overview' },
  { id: 'providers', label: 'Launch Providers' },
  { id: 'monthly', label: 'Month-by-Month Schedule' },
  { id: 'vehicles', label: 'Launch Vehicles in 2026' },
  { id: 'sites', label: 'Launch Sites' },
  { id: 'milestones', label: 'Key Milestones' },
  { id: 'track', label: 'How to Track Launches' },
  { id: 'faq', label: 'FAQ' },
];

const LAUNCH_PROVIDERS = [
  { name: 'SpaceX', vehicle: 'Falcon 9, Falcon Heavy, Starship', missions: '80-100+', country: 'United States' },
  { name: 'Rocket Lab', vehicle: 'Electron, Neutron', missions: '15-20', country: 'United States / New Zealand' },
  { name: 'ULA', vehicle: 'Vulcan Centaur, Atlas V', missions: '8-12', country: 'United States' },
  { name: 'Arianespace', vehicle: 'Ariane 6, Vega-C', missions: '8-10', country: 'Europe (French Guiana)' },
  { name: 'ISRO', vehicle: 'GSLV, SSLV, LVM3', missions: '8-12', country: 'India' },
  { name: 'CASC', vehicle: 'Long March 5, 7, 2D', missions: '50-60', country: 'China' },
  { name: 'Blue Origin', vehicle: 'New Glenn, New Shepard', missions: '3-6', country: 'United States' },
  { name: 'Relativity Space', vehicle: 'Terran R', missions: '1-2', country: 'United States' },
];

const LAUNCH_SITES = [
  { name: 'Kennedy Space Center (KSC)', location: 'Florida, USA', pads: 'LC-39A, LC-39B' },
  { name: 'Cape Canaveral SFS', location: 'Florida, USA', pads: 'SLC-40, SLC-41' },
  { name: 'Vandenberg SFB', location: 'California, USA', pads: 'SLC-4E, SLC-6' },
  { name: 'Mahia Peninsula', location: 'New Zealand', pads: 'LC-1A, LC-1B' },
  { name: 'Kourou', location: 'French Guiana', pads: 'ELA-4 (Ariane 6)' },
  { name: 'Boca Chica (Starbase)', location: 'Texas, USA', pads: 'OLP-A, OLP-B' },
  { name: 'Satish Dhawan', location: 'Sriharikota, India', pads: 'FLP, SLP' },
  { name: 'Wenchang', location: 'Hainan, China', pads: 'LC-1, LC-2' },
];

const FAQ_ITEMS = [
  {
    question: 'How many rocket launches are expected in 2026?',
    answer: 'The space industry is on track for over 250 orbital launches in 2026, continuing the rapid growth from 2024-2025. SpaceX alone accounts for 80-100+ missions, with significant contributions from China, Europe, India, and emerging providers.',
  },
  {
    question: 'Where can I watch rocket launches live?',
    answer: 'SpaceNexus provides live launch tracking with countdown timers and links to official webcasts. Most launches are streamed live on YouTube by their providers (SpaceX, Rocket Lab, ULA, etc.). SpaceNexus aggregates all launch streams in one place.',
  },
  {
    question: 'What is the most anticipated launch of 2026?',
    answer: 'Key milestones include SpaceX Starship crewed missions, the Blue Origin New Glenn orbital debut, Ariane 6 reaching operational cadence, and potential commercial space station module launches from Axiom Space.',
  },
  {
    question: 'How do I get launch notifications?',
    answer: 'Sign up for SpaceNexus (free) and enable push notifications. You can customize alerts for specific launch providers, vehicles, or mission types. Notifications are sent at T-24h, T-1h, and T-10min before launch.',
  },
  {
    question: 'What launch vehicles are new in 2026?',
    answer: 'New vehicles expected to fly or reach milestones in 2026 include Blue Origin New Glenn, Relativity Space Terran R, ABL Space RS1 operational flights, and several small launch vehicles from Firefly, Virgin Orbit successor ventures, and international startups.',
  },
];

export default function SpaceLaunchSchedule2026Page() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        {/* Breadcrumbs */}
        <nav className="pt-6 mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-slate-400">
            <li><Link href="/" className="hover:text-cyan-400 transition-colors">Home</Link></li>
            <li>/</li>
            <li><Link href="/guide/space-industry" className="hover:text-cyan-400 transition-colors">Guides</Link></li>
            <li>/</li>
            <li className="text-cyan-400">2026 Launch Schedule</li>
          </ol>
        </nav>

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              2026 Space Launch Schedule: Every Mission This Year
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              A comprehensive, continuously updated guide to every orbital and suborbital launch
              planned for 2026 — from SpaceX Falcon 9 rideshares to Ariane 6 commercial flights.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>Last updated: February 2026</span>
              <span>|</span>
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <span>15 min read</span>
            </div>
          </header>

          {/* Table of Contents */}
          <nav className="card p-6 mb-10">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Table of Contents</h2>
            <ol className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {TOC.map((item, i) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="text-cyan-500 hover:text-cyan-400 text-sm transition-colors"
                  >
                    {i + 1}. {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Content */}
          <article className="card p-8 space-y-10">
            {/* Overview */}
            <section id="overview">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Launch Activity Overview</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                2026 is shaping up to be the busiest year in spaceflight history. The global space industry
                is projected to conduct <strong className="text-slate-700">over 250 orbital launches</strong>,
                building on the record-breaking cadence of 2024 and 2025. SpaceX continues to dominate with
                roughly 40% of global launches, while China maintains a robust 50+ launch campaign.
              </p>
              <p className="text-slate-400 leading-relaxed mb-4">
                New entrants are reshaping the landscape: Blue Origin&apos;s New Glenn enters operational service,
                Ariane 6 reaches full cadence in Europe, and multiple small launch vehicle providers compete
                for dedicated rideshare missions. The mega-constellation buildout continues with Starlink,
                OneWeb, and Amazon&apos;s Project Kuiper all requiring dozens of flights.
              </p>
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                <p className="text-cyan-800 text-sm">
                  <strong>Live tracking:</strong> SpaceNexus tracks every launch in real time with countdown
                  timers, mission details, and launch vehicle specs.{' '}
                  <Link href="/launch" className="text-cyan-600 underline hover:text-cyan-500">
                    View the live launch dashboard &rarr;
                  </Link>
                </p>
              </div>
            </section>

            {/* Providers */}
            <section id="providers">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Launch Providers in 2026</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                The global launch services market has expanded dramatically. Here are the major providers
                and their expected 2026 launch cadence:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-3 pr-4 text-left text-slate-700 font-semibold">Provider</th>
                      <th className="py-3 pr-4 text-left text-slate-700 font-semibold">Vehicles</th>
                      <th className="py-3 pr-4 text-left text-slate-700 font-semibold">Est. Missions</th>
                      <th className="py-3 text-left text-slate-700 font-semibold">Country</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LAUNCH_PROVIDERS.map((provider) => (
                      <tr key={provider.name} className="border-b border-slate-100">
                        <td className="py-3 pr-4 text-slate-900 font-medium">{provider.name}</td>
                        <td className="py-3 pr-4 text-slate-400">{provider.vehicle}</td>
                        <td className="py-3 pr-4 text-cyan-600 font-semibold">{provider.missions}</td>
                        <td className="py-3 text-slate-400">{provider.country}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-slate-400 text-sm mt-4">
                <Link href="/company-profiles" className="text-cyan-500 hover:underline">
                  View detailed profiles for all 200+ space companies &rarr;
                </Link>
              </p>
            </section>

            {/* Monthly */}
            <section id="monthly">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Month-by-Month Launch Schedule</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                Launch schedules are dynamic and subject to delays. SpaceNexus updates this data in real time
                as providers announce schedule changes. For the most current information, visit our{' '}
                <Link href="/launch" className="text-cyan-500 hover:underline">live launch dashboard</Link>.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => (
                  <div key={month} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                    <div className="text-sm font-semibold text-slate-700">{month} 2026</div>
                    <div className="text-lg font-bold text-cyan-600 mt-1">20-25</div>
                    <div className="text-xs text-slate-400">expected launches</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Vehicles */}
            <section id="vehicles">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Launch Vehicles Active in 2026</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                The launch vehicle landscape in 2026 spans from small dedicated launchers (Electron, SSLV)
                to super-heavy lift systems (Starship, SLS). Key vehicles to watch:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 text-sm">SpaceX Starship</h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Super-heavy lift. 150t to LEO. Fully reusable target. Key for Artemis HLS and Starlink V2.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 text-sm">Blue Origin New Glenn</h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Heavy lift. 45t to LEO. Reusable first stage. Key for Project Kuiper constellation.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 text-sm">Ariane 6</h3>
                  <p className="text-slate-400 text-xs mt-1">
                    European heavy lift. A62 and A64 variants. Replacing Ariane 5 for institutional missions.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 text-sm">Rocket Lab Neutron</h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Medium lift. 13t to LEO. Reusable. Targeting constellation deployment and government missions.
                  </p>
                </div>
              </div>
              <p className="text-slate-400 text-sm mt-4">
                <Link href="/launch-vehicles" className="text-cyan-500 hover:underline">
                  Compare all launch vehicles with specs and pricing &rarr;
                </Link>
              </p>
            </section>

            {/* Sites */}
            <section id="sites">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Global Launch Sites</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-3 pr-4 text-left text-slate-700 font-semibold">Site</th>
                      <th className="py-3 pr-4 text-left text-slate-700 font-semibold">Location</th>
                      <th className="py-3 text-left text-slate-700 font-semibold">Active Pads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LAUNCH_SITES.map((site) => (
                      <tr key={site.name} className="border-b border-slate-100">
                        <td className="py-3 pr-4 text-slate-900 font-medium">{site.name}</td>
                        <td className="py-3 pr-4 text-slate-400">{site.location}</td>
                        <td className="py-3 text-slate-400">{site.pads}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-slate-400 text-sm mt-4">
                <Link href="/spaceports" className="text-cyan-500 hover:underline">
                  Explore our interactive spaceport map &rarr;
                </Link>
              </p>
            </section>

            {/* Milestones */}
            <section id="milestones">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Key Milestones to Watch in 2026</h2>
              <ul className="space-y-3">
                {[
                  'SpaceX Starship crewed orbital mission (targeting Q3-Q4)',
                  'Blue Origin New Glenn reaching operational cadence',
                  'Amazon Project Kuiper initial constellation deployment',
                  'Ariane 6 achieving commercial operational status',
                  'Axiom Space commercial station module launch',
                  'NASA Artemis III preparations and gateway module flights',
                  'India ISRO Gaganyaan crewed spaceflight program milestones',
                  'Commercial space station demonstrations (Orbital Reef, Starlab)',
                ].map((milestone) => (
                  <li key={milestone} className="flex items-start gap-3">
                    <span className="text-cyan-500 mt-1 flex-shrink-0">&#9656;</span>
                    <span className="text-slate-400 text-sm">{milestone}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* How to Track */}
            <section id="track">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">How to Track Launches with SpaceNexus</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                SpaceNexus provides the most comprehensive launch tracking experience available:
              </p>
              <ol className="space-y-3">
                {[
                  'Visit the Launch Dashboard for all upcoming missions with countdown timers',
                  'Enable push notifications for launch alerts (T-24h, T-1h, T-10min)',
                  'Use Mission Control for a real-time overview with live launch status',
                  'Track launched payloads on the Satellite Tracker after deployment',
                  'Read post-launch analysis in our News feed, auto-tagged by company',
                ].map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="bg-cyan-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-slate-400 text-sm">{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/launch" className="btn-primary text-sm py-2 px-4">
                  Launch Dashboard
                </Link>
                <Link href="/mission-control" className="btn-secondary text-sm py-2 px-4">
                  Mission Control
                </Link>
                <Link href="/register" className="btn-secondary text-sm py-2 px-4">
                  Sign Up Free
                </Link>
              </div>
            </section>

            {/* FAQ */}
            <section id="faq">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {FAQ_ITEMS.map((faq) => (
                  <div key={faq.question} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-900 text-sm mb-2">{faq.question}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Related Content */}
            <section className="pt-6 border-t border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Related Guides</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Link href="/guide/space-industry" className="text-cyan-500 hover:text-cyan-400 text-sm transition-colors">
                  Complete Guide to the Space Industry &rarr;
                </Link>
                <Link href="/guide/space-launch-cost-comparison" className="text-cyan-500 hover:text-cyan-400 text-sm transition-colors">
                  Space Launch Cost Comparison &rarr;
                </Link>
                <Link href="/guide/space-industry-market-size" className="text-cyan-500 hover:text-cyan-400 text-sm transition-colors">
                  Space Industry Market Size &rarr;
                </Link>
                <Link href="/guide/how-satellite-tracking-works" className="text-cyan-500 hover:text-cyan-400 text-sm transition-colors">
                  How Satellite Tracking Works &rarr;
                </Link>
              </div>
            </section>
          </article>

          {/* FAQ Schema */}
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

          {/* Article Schema */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: '2026 Space Launch Schedule: Every Mission This Year',
                description: 'Complete 2026 space launch schedule with dates, launch vehicles, payloads, and launch sites.',
                author: { '@type': 'Organization', name: 'SpaceNexus' },
                publisher: { '@type': 'Organization', name: 'SpaceNexus', logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' } },
                datePublished: '2026-02-14T00:00:00Z',
                dateModified: new Date().toISOString(),
                mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://spacenexus.us/guide/space-launch-schedule-2026' },
              }).replace(/</g, '\\u003c'),
            }}
          />
        </div>
      </div>
    </div>
  );
}
