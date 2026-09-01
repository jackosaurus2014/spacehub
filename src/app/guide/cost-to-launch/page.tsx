import type { Metadata } from 'next';
import Link from 'next/link';
import HeroArt from '@/components/ui/HeroArt';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { COST_TO_LAUNCH } from '@/lib/cost-to-launch';
import { LAUNCH_COST_AS_OF, LAUNCH_COST_SOURCE } from '@/lib/launch-cost-constants';

// Index for the "how much does it cost to launch X" series. Static: the
// registry is the only input, so the page can prerender and revalidate on
// the same clock as the entries. The [thing] pages breadcrumb back here.
export const revalidate = 3600;

const CANONICAL = 'https://spacenexus.us/guide/cost-to-launch';
const TITLE = 'What Does It Cost to Launch Something Into Space? (2026, by Payload)';
const DESCRIPTION = `Direct answers for ${COST_TO_LAUNCH.length} kinds of payload — a CubeSat, a satellite, a person, a GEO comsat, a lunar lander, a Starlink batch and more — with 2026 list and rideshare prices, the hidden costs, and the arithmetic behind each figure.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['how much does it cost to launch', 'cost to launch a satellite', 'cost to launch a cubesat', 'cost to send a person to space', 'launch cost per kg', 'rocket launch price 2026'],
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'article',
    url: CANONICAL,
    images: [{ url: `/api/og?title=${encodeURIComponent('What does it cost to launch…')}&subtitle=${encodeURIComponent(`${COST_TO_LAUNCH.length} payloads, 2026 prices`)}&type=guide`, width: 1200, height: 630 }],
  },
};

const thingLabel = (thing: string) => thing.replace(/^(a|an) /, '');

export default function CostToLaunchIndexPage() {
  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
          <Link href="/guide" className="hover:text-white/80">Guides</Link><span>/</span>
          <Link href="/guide/space-launch-cost-comparison" className="hover:text-white/80">Launch costs</Link><span>/</span>
          <span className="text-slate-400">Cost to launch</span>
        </nav>
        <HeroArt src="/art/hero-launch-cost.webp" className="mb-8" />

        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">What does it cost to launch…</h1>
          <p className="text-lg text-white/80 leading-relaxed">
            The question behind most of the traffic to our launch-cost guide is a specific one: not
            &quot;what does a rocket cost&quot; but &quot;what does it cost to launch <em>my</em> thing.&quot;
            Each page below answers that for one kind of payload — a direct answer up top, a price table
            by option, the costs that never appear on a price list, and the arithmetic, so you can check it.
          </p>
          <p className="text-xs text-slate-500 mt-3">
            List and rideshare prices as of {LAUNCH_COST_AS_OF}; every page tracks the same constants as the{' '}
            <Link href="/guide/space-launch-cost-comparison" className="text-cyan-400 hover:text-cyan-300">launch cost guide</Link>, so they move together.
          </p>
        </header>

        {/* Answer block: the short answers, in one place */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">The short answers</h2>
          <div className="space-y-3">
            {COST_TO_LAUNCH.map((c) => (
              <details key={c.slug} className="card p-4 group">
                <summary className="cursor-pointer list-none flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-white">What does it cost to launch {c.thing}?</span>
                  <span className="text-xs text-cyan-400 flex-shrink-0 group-open:hidden">Answer</span>
                </summary>
                <p className="text-sm text-slate-400 leading-relaxed mt-3">{c.shortAnswer}</p>
                <Link href={`/guide/cost-to-launch/${c.slug}`} className="inline-block text-xs text-cyan-400 hover:text-cyan-300 mt-2">
                  Full breakdown: {c.title} &rarr;
                </Link>
              </details>
            ))}
          </div>
        </section>

        {/* Card grid */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Every payload we price</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {COST_TO_LAUNCH.map((c) => (
              <Link key={c.slug} href={`/guide/cost-to-launch/${c.slug}`} className="card p-5 block hover:border-white/20 transition-colors">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{thingLabel(c.thing)}</div>
                <h3 className="text-base font-semibold text-white mb-2">{c.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-4">{c.shortAnswer}</p>
                <div className="text-xs text-cyan-400 mt-3">Price table, hidden costs, FAQ &rarr;</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="card p-5 mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">Not on the list? Run your own numbers</div>
            <div className="text-xs text-slate-400">Mass, orbit, vehicle, insurance — the calculator does the delivered-cost math for any payload.</div>
          </div>
          <Link href="/launch-cost-calculator" className="btn-primary text-sm py-2 px-4 flex-shrink-0">Launch cost calculator</Link>
        </section>

        {/* Constants footer */}
        <footer className="pt-6 border-t border-white/[0.06] text-xs text-slate-500 space-y-1">
          <p><strong className="text-slate-400">Figures as of:</strong> {LAUNCH_COST_AS_OF}</p>
          <p><strong className="text-slate-400">Source:</strong> {LAUNCH_COST_SOURCE}</p>
          <p>
            Related: <Link href="/guide/space-launch-cost-comparison" className="text-slate-300 hover:text-white">launch cost comparison</Link>,{' '}
            <Link href="/rockets" className="text-slate-300 hover:text-white">every rocket&apos;s cost and record</Link>,{' '}
            <Link href="/compare/vulcan-centaur-vs-falcon-9" className="text-slate-300 hover:text-white">Vulcan Centaur vs Falcon 9</Link>.
          </p>
        </footer>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org', '@type': 'CollectionPage',
          name: TITLE, description: DESCRIPTION, url: CANONICAL,
          isPartOf: { '@type': 'WebSite', name: 'SpaceNexus', url: 'https://spacenexus.us' },
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: COST_TO_LAUNCH.length,
            itemListElement: COST_TO_LAUNCH.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.title, url: `https://spacenexus.us/guide/cost-to-launch/${c.slug}` })),
          },
        }).replace(/</g, '\\u003c') }} />
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Guides', href: '/guide' }, { name: 'Launch costs', href: '/guide/space-launch-cost-comparison' }, { name: 'Cost to launch' }]} />
      </div>
    </div>
  );
}
