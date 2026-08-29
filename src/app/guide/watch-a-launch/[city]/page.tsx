import type { Metadata } from 'next';
import Link from 'next/link';
import HeroArt from '@/components/ui/HeroArt';
import { notFound } from 'next/navigation';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import LaunchRow from '@/components/launches/LaunchRow';
import LaunchWatchForm from '@/components/launches/LaunchWatchForm';
import { VIEWING_CITIES, cityGeometry, getViewingCity } from '@/lib/launch-viewing-cities';
import { getSiteMonth, shiftMonth } from '@/lib/launch-sites';

// "Watch a launch from [city]" — geometry from coordinates, live manifest for
// the site, curated local spots. Registry-backed; the router 404s unknown
// cities (dynamicParams=false). Rendered per request for the live manifest.
export const dynamic = 'force-dynamic';
export const dynamicParams = false;

export function generateStaticParams() {
  return VIEWING_CITIES.map((c) => ({ city: c.slug }));
}

export function generateMetadata({ params }: { params: { city: string } }): Metadata {
  const city = getViewingCity(params.city);
  if (!city) return {};
  const g = cityGeometry(city);
  const title = `Can You See a Rocket Launch from ${city.name}? Where to Watch (2026)`;
  const description = `${city.name} is ${g.miles} miles ${g.compass} of ${g.site?.shortName ?? g.pad.name}. ${g.visibility.headline}. Look ${g.compass.toLowerCase()} — plus the best local spots, this month's launches, and how to get alerts.`;
  return { title, description, alternates: { canonical: `https://spacenexus.us/guide/watch-a-launch/${city.slug}` }, openGraph: { title, description, type: 'article' } };
}

export default async function WatchFromCityPage({ params }: { params: { city: string } }) {
  const city = getViewingCity(params.city);
  if (!city) notFound();
  const g = cityGeometry(city);
  const now = new Date();
  const y = now.getUTCFullYear(); const m = now.getUTCMonth() + 1; const nxt = shiftMonth(y, m, 1);
  const [thisMonth, nextMonth] = await Promise.all([getSiteMonth(city.site, y, m, now), getSiteMonth(city.site, nxt.year, nxt.month, now)]);
  const upcoming = [...(thisMonth?.launches ?? []), ...(nextMonth?.launches ?? [])].filter((l) => l.launchDate && l.launchDate.getTime() > now.getTime()).slice(0, 6);
  const siteName = g.site?.shortName ?? g.pad.name;
  const faq = [
    { q: `Can you see rocket launches from ${city.name}?`, a: `${g.visibility.headline}. ${city.name} is about ${g.miles} miles (${g.km} km) from ${g.pad.name}, bearing ${g.bearing}° (${g.compass}). ${g.visibility.detail}` },
    { q: `Which direction do I look from ${city.name}?`, a: `Face ${g.compass} (${g.bearing}°) toward ${siteName}. The rocket rises from that point on the horizon and arcs downrange — for ${siteName} launches that generally means ${city.site === 'vandenberg' ? 'south or southwest over the Pacific' : city.site === 'starbase' ? 'east over the Gulf' : 'east or northeast over the Atlantic'}.` },
    { q: 'How long does a launch stay visible?', a: 'Two to three minutes for the first stage, sometimes longer at night when the second-stage plume is sunlit. Twilight launches — just after sunset or before sunrise — produce the biggest, longest-lasting displays.' },
  ];

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
          <Link href="/guide" className="hover:text-white/80">Guides</Link><span>/</span>
          {g.site?.viewingGuide ? <Link href={g.site.viewingGuide} className="hover:text-white/80">Watch a launch at {siteName}</Link> : <span>Watch a launch</span>}<span>/</span>
          <span className="text-slate-400">{city.name}</span>
        </nav>
        <HeroArt src="/art/hero-watch-from-city.webp" className="mb-8" />

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Can you see a rocket launch from {city.name}?</h1>
          <p className="text-lg text-white/80 leading-relaxed"><strong className="text-white">{g.visibility.headline}.</strong> {city.intro}</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            ['Distance to the pad', `${g.miles} mi`, `${g.km} km to ${g.pad.name}`],
            ['Look toward', g.compass, `${g.bearing}° — ${siteName}`],
            ['What you\'ll see', g.visibility.tier === 'pad' ? 'Everything' : g.visibility.tier === 'ascent' ? 'The ascent' : g.visibility.tier === 'horizon' ? 'Night launches' : 'Stream only', g.visibility.headline],
            ['Next launch there', upcoming[0]?.launchDate ? upcoming[0].launchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : 'None listed', upcoming[0] ? upcoming[0].name.split(' | ').slice(-1)[0] : 'Check Mission Control'],
          ].map(([k, v, sub]) => (
            <div key={k} className="card p-4">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{k}</div>
              <div className="text-xl font-bold text-white">{v}</div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">{sub}</div>
            </div>
          ))}
        </div>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-2">What to expect from here</h2>
          <p className="text-slate-300 leading-relaxed">{g.visibility.detail}</p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-3">Best spots in and around {city.name}</h2>
          <div className="space-y-3">
            {city.spots.map((s) => (
              <div key={s.name} className="card p-4">
                <h3 className="text-sm font-semibold text-white mb-1">{s.name}</h3>
                <p className="text-sm text-slate-400">{s.note}</p>
              </div>
            ))}
          </div>
          {g.site?.viewingGuide && <p className="text-sm text-slate-400 mt-3">Making the trip? <Link href={g.site.viewingGuide} className="text-cyan-400 hover:text-cyan-300">The full {siteName} viewing guide</Link> has the pad-side spots, road closures and timing.</p>}
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-3">Upcoming launches from {siteName}</h2>
          {upcoming.length === 0 ? <p className="card p-4 text-sm text-slate-500">Nothing on the tracked manifest yet — schedules firm up a few weeks out.</p>
            : <div className="space-y-2">{upcoming.map((l) => <LaunchRow key={l.id} launch={l} showSite={false} now={now} />)}</div>}
          <p className="text-xs text-slate-500 mt-2"><Link href={`/launches/${city.site}`} className="text-cyan-400 hover:text-cyan-300">Month-by-month schedule for {siteName} →</Link></p>
        </section>

        <div className="mb-10">
          <LaunchWatchForm site={siteName} label={`every launch from ${siteName}`} source={`city-${city.slug}`} />
        </div>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-3">Frequently asked</h2>
          <div className="space-y-3">
            {faq.map((f) => (
              <div key={f.q} className="card p-4"><h3 className="text-sm font-semibold text-white mb-1.5">{f.q}</h3><p className="text-sm text-slate-400 leading-relaxed">{f.a}</p></div>
            ))}
          </div>
        </section>

        <section className="pt-6 border-t border-white/[0.06] text-sm">
          <h3 className="text-lg font-bold text-white mb-3">Other cities</h3>
          <div className="flex flex-wrap gap-2">
            {VIEWING_CITIES.filter((c) => c.slug !== city.slug).map((c) => (
              <Link key={c.slug} href={`/guide/watch-a-launch/${c.slug}`} className="card px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:border-cyan-500/30 transition-colors">{c.name}</Link>
            ))}
          </div>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }).replace(/</g, '\\u003c') }} />
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Guides', href: '/guide' }, { name: `Watch a launch from ${city.name}` }]} />
      </div>
    </div>
  );
}
