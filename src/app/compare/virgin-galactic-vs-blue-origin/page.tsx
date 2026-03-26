import type { Metadata } from 'next';
import Link from 'next/link';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Virgin Galactic vs Blue Origin: Complete Comparison 2026',
  description: 'Compare Virgin Galactic and Blue Origin suborbital space tourism — vehicle design, ticket prices, flights completed, altitude reached, and current operational status.',
  keywords: ['Virgin Galactic vs Blue Origin', 'space tourism comparison', 'suborbital flight comparison', 'VSS Unity vs New Shepard', 'space tourism 2026'],
  openGraph: {
    title: 'Virgin Galactic vs Blue Origin: Complete Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Virgin Galactic and Blue Origin suborbital space tourism programs.',
    url: 'https://spacenexus.us/compare/virgin-galactic-vs-blue-origin',
    type: 'article',
  },
  alternates: { canonical: 'https://spacenexus.us/compare/virgin-galactic-vs-blue-origin' },
};

const COMPARISON_DATA = [
  { metric: 'Founded', a: '2004', b: '2000' },
  { metric: 'Founder', a: 'Richard Branson (Virgin Group)', b: 'Jeff Bezos' },
  { metric: 'Headquarters', a: 'Las Cruces, NM (Spaceport America)', b: 'Kent, WA' },
  { metric: 'Vehicle', a: 'VSS Unity (SpaceShipTwo); Delta class (development)', b: 'New Shepard (NS) capsule + booster' },
  { metric: 'Vehicle Type', a: 'Air-launched glider / rocket plane', b: 'Vertical launch, ballistic capsule' },
  { metric: 'Apogee Altitude', a: '~89–90 km (Kármán line disputed)', b: '~107 km (above 100 km Kármán line)' },
  { metric: 'Crewed Tourist Flights Completed', a: '6 commercial spaceflights (Galactic 01–06, June 2023 – Jan 2024)', b: '8 crewed flights (2021–2024, including post-return NS-25/NS-26)' },
  { metric: 'Passengers Per Flight', a: '6 (including 2 pilots)', b: '6 passengers (autonomous capsule)' },
  { metric: 'Ticket Price', a: '$450,000 per seat (2023 pricing)', b: 'Not publicly listed (auctioned / private)' },
  { metric: 'Operational Status (2026)', a: 'Suspended — grounded after Jan 2024 final Unity flight (Galactic 06), transitioning to Delta class', b: 'Resumed flights May 2024 post-anomaly; New Shepard operational' },
  { metric: 'New Shepard Anomaly', a: 'N/A', b: 'Uncrewed booster failure Sep 2022; flights resumed May 2024' },
  { metric: 'Publicly Traded', a: 'Yes (SPCE, NYSE)', b: 'No (private)' },
  { metric: 'Next Vehicle', a: 'Delta class spaceplane (in development)', b: 'New Glenn (orbital) — separate program' },
  { metric: 'FAA Launch License', a: 'Yes (commercial launch operator)', b: 'Yes (commercial launch operator)' },
];

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Virgin Galactic vs Blue Origin</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Virgin Galactic vs Blue Origin</h1>
      <p style={{ color: 'var(--text-secondary)' }} className="text-base max-w-2xl mb-8">
        The two pioneers of commercial suborbital space tourism — comparing vehicle design, altitude achieved, tickets sold, operational histories, and the road ahead.
      </p>

      {/* Terminal table */}
      <div className="card-terminal mb-8">
        <div className="card-terminal__header">
          <div className="flex items-center gap-2">
            <div className="card-terminal__dots">
              <div className="card-terminal__dot card-terminal__dot--red" />
              <div className="card-terminal__dot card-terminal__dot--amber" />
              <div className="card-terminal__dot card-terminal__dot--green" />
            </div>
            <span className="card-terminal__path">spacenexus:~/compare</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-left text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-tertiary)' }}>Metric</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Virgin Galactic</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-center text-[11px] sm:text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Blue Origin (New Shepard)</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_DATA.map((row, i) => (
                <tr key={row.metric} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)' }}>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-[11px] sm:text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{row.metric}</td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-center text-[11px] sm:text-xs" style={{ color: 'var(--text-primary)' }}>{row.a}</td>
                  <td className="py-2 sm:py-2.5 px-2 sm:px-4 text-center text-[11px] sm:text-xs" style={{ color: 'var(--text-primary)' }}>{row.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analysis */}
      <h2 className="text-display text-xl mb-3">Key Differences</h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-4">
        Virgin Galactic and Blue Origin represent fundamentally different engineering approaches to suborbital tourism. Virgin Galactic uses a carrier aircraft (WhiteKnightTwo) to air-launch SpaceShipTwo, which then ignites its hybrid rocket motor for a hypersonic climb. Blue Origin&apos;s New Shepard uses a conventional vertical rocket launch with a separating capsule that crosses 100 km before a parachute landing. New Shepard clearly exceeds the internationally recognized Kármán line at 100 km, while VSS Unity&apos;s ~89 km apogee meets the FAA/USAF definition of space (50 miles / 80 km) but falls short of the 100 km standard.
      </p>
      <p style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed mb-8">
        Virgin Galactic completed its final VSS Unity commercial flight in January 2024 (Galactic 06), then retired the vehicle to focus on its next-generation Delta class spaceplane. Blue Origin&apos;s New Shepard program was grounded following an uncrewed booster failure in September 2022 and returned to flight in May 2024. Both programs have flown a similar number of crewed missions (6 for VG, 8 for Blue Origin through 2024), and both face the fundamental challenge of scaling a high-cost, limited-seat experience into a sustainable business.
      </p>

      {/* CTA */}
      <div className="rounded-lg p-6 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Track both companies on SpaceNexus</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/compare/companies" className="btn-primary text-sm">Interactive Comparison</Link>
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse 200+ Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'SpaceX vs Blue Origin', href: '/compare/spacex-vs-blue-origin' },
            { title: 'SpaceX vs Rocket Lab', href: '/compare/spacex-vs-rocket-lab' },
            { title: 'Relativity Space vs Firefly', href: '/compare/relativity-space-vs-firefly' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4">{c.title} →</Link>
          ))}
        </div>
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Virgin Galactic vs Blue Origin: Complete Comparison 2026',
        description: 'Side-by-side comparison of Virgin Galactic and Blue Origin suborbital space tourism programs.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-03-22', dateModified: '2026-03-22',
        url: 'https://spacenexus.us/compare/virgin-galactic-vs-blue-origin',
      }).replace(/</g, '\\u003c') }} />
    

        <RelatedModules modules={PAGE_RELATIONS['compare/virgin-galactic-vs-blue-origin']} />
      </div>
  );
}
