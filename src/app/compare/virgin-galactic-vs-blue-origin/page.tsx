import type { Metadata } from 'next';
import Link from 'next/link';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { SITE_STATS } from '@/lib/site-stats';

export const metadata: Metadata = {
  title: 'Virgin Galactic vs Blue Origin: $750k Seats, 90 km vs 107 km, Both Paused (2026)',
  description: 'Neither is flying tourists today: Virgin Galactic is selling $750,000 seats for Delta-class flights targeted from late 2026, and Blue Origin paused New Shepard in January 2026 for at least two years. Vehicles, altitude, flight counts, safety records and what a ticket buys.',
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
  { metric: 'Ticket Price', a: '$750,000 per seat (sales reopened Apr 2026; was $450,000 in 2021 and $600,000 in 2023)', b: 'Not publicly listed (auctioned / private)' },
  { metric: 'Operational Status (2026)', a: 'Not flying — Unity retired after Galactic 06 (Jan 2024); Delta-class commercial service targeted Q4 2026', b: 'Paused — New Shepard flights halted Jan 30, 2026 for at least two years to focus on the Blue Moon lunar lander (last flight NS-38)' },
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
          <Link href="/company-profiles" className="btn-secondary text-sm">Browse {SITE_STATS.companies} Companies</Link>
        </div>
      </div>

      {/* Related */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-tertiary)' }}>Related Comparisons</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'SpaceX vs Blue Origin', href: '/compare/spacex-vs-blue-origin' },
            { title: 'Rocket Lab vs SpaceX', href: '/compare/rocket-lab-vs-spacex' },
            { title: 'Relativity Space vs Firefly', href: '/compare/relativity-space-vs-firefly' },
          ].map(c => (
            <Link key={c.href} href={c.href} className="card-content text-center text-sm p-4">{c.title} →</Link>
          ))}
        </div>
      </div>
      {/* FAQ + FAQPage schema (Tier 2 #13, 2026-09-06) */}
      <section id="faq" className="mt-8">
        <h2 className="text-lg font-bold text-white mb-4">Frequently asked</h2>
        <div className="space-y-4">
            <div key="Which goes higher, Virgin Galactic or Blue Origin?">
              <h3 className="text-base font-semibold text-white mb-1">Which goes higher, Virgin Galactic or Blue Origin?</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Blue Origin. New Shepard reaches about 107 km, above the 100 km Kármán line; Virgin Galactic&apos;s SpaceShipTwo reached about 89-90 km, above the 80 km line the US uses for astronaut wings but below the Kármán line.</p>
            </div>
            <div key="How much does a ticket cost?">
              <h3 className="text-base font-semibold text-white mb-1">How much does a ticket cost?</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Virgin Galactic reopened sales in April 2026 at $750,000 a seat, up from $450,000 in 2021 and $600,000 in 2023, for Delta-class flights targeted from late 2026. Blue Origin never published a New Shepard price — seats were auctioned or sold privately — and it is not selling flights during the pause. Our space-tourism guide keeps the current figures.</p>
            </div>
            <div key="Is Virgin Galactic still flying?">
              <h3 className="text-base font-semibold text-white mb-1">Is Virgin Galactic still flying?</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Not currently. Its last commercial flight was Galactic 06 in January 2024; VSS Unity was retired and the company is building its Delta-class spaceplanes, with commercial flights targeted after they enter service.</p>
            </div>
            <div key="Is New Shepard still flying?">
              <h3 className="text-base font-semibold text-white mb-1">Is New Shepard still flying?</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Not at the moment. Blue Origin paused New Shepard on January 30, 2026 for at least two years to put its people on the Blue Moon lunar lander, after NS-38 flew six customers a week earlier. Its safety record stands: crews flown since 2021 with no injuries, and the one failure — an uncrewed booster in September 2022 — saw the capsule&apos;s abort system pull it clear as designed.</p>
            </div>
            <div key="Can I invest in either company?">
              <h3 className="text-base font-semibold text-white mb-1">Can I invest in either company?</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Virgin Galactic is public as SPCE on the NYSE. Blue Origin is private, funded almost entirely by Jeff Bezos, with no announced listing. Nothing on SpaceNexus is investment advice.</p>
            </div>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: "{\"@context\": \"https://schema.org\", \"@type\": \"FAQPage\", \"mainEntity\": [{\"@type\": \"Question\", \"name\": \"Which goes higher, Virgin Galactic or Blue Origin?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"Blue Origin. New Shepard reaches about 107 km, above the 100 km Kármán line; Virgin Galactic's SpaceShipTwo reached about 89-90 km, above the 80 km line the US uses for astronaut wings but below the Kármán line.\"}}, {\"@type\": \"Question\", \"name\": \"How much does a ticket cost?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"Virgin Galactic's last published price was $450,000 a seat. Blue Origin does not publish a price; early seats were auctioned and later ones sold privately, with reports well above Virgin Galactic's figure. Our space-tourism guide keeps the current figures.\"}}, {\"@type\": \"Question\", \"name\": \"Is Virgin Galactic still flying?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"Not currently. Its last commercial flight was Galactic 06 in January 2024; VSS Unity was retired and the company is building its Delta-class spaceplanes, with commercial flights targeted after they enter service.\"}}, {\"@type\": \"Question\", \"name\": \"Is New Shepard still flying?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"It has flown crews repeatedly since 2021 with no injuries. An uncrewed booster failed in September 2022 — the capsule's abort system pulled the capsule clear as designed — and flights resumed in May 2024 after the investigation.\"}}, {\"@type\": \"Question\", \"name\": \"Can I invest in either company?\", \"acceptedAnswer\": {\"@type\": \"Answer\", \"text\": \"Virgin Galactic is public as SPCE on the NYSE. Blue Origin is private, funded almost entirely by Jeff Bezos, with no announced listing. Nothing on SpaceNexus is investment advice.\"}}]}".replace(/</g, '\\u003c') }} />


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
