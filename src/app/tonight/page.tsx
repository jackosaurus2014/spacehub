import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import JsonLd from '@/components/seo/JsonLd';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { TONIGHT_CITIES, TONIGHT_REGIONS } from '@/lib/tonight-cities';
import UseMyLocation from './UseMyLocation';

// /tonight — "Tonight over your town" index (2026-09-01, roadmap Tier 2).
// Static city grid; the only client code is the optional "use my location"
// island. Every /tonight/[city] page renders fully on the server.

const TITLE = 'ISS Passes Tonight — Visible Passes Over Your City';
const DESCRIPTION = `Tonight's visible ISS, Tiangong and Hubble passes over ${TONIGHT_CITIES.length} cities — rise time, peak height, how long, how bright — computed from CelesTrak orbital elements and checked for darkness. Free, no account.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['ISS passes tonight', 'ISS visible tonight', 'space station tonight', 'Tiangong pass', 'Hubble pass', 'spot the station'],
  alternates: { canonical: 'https://spacenexus.us/tonight' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: 'https://spacenexus.us/tonight', type: 'website' },
};

export default function TonightIndexPage() {
  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
          <Link href="/whats-overhead" className="hover:text-white/80">What&apos;s Overhead</Link><span>/</span>
          <span className="text-slate-400">Tonight</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Tonight over your town</h1>
          <p className="text-lg text-white/80 leading-relaxed">
            The space station is the brightest thing in the night sky after the Moon, and it crosses most cities several evenings a week.
            Pick your city for tonight&apos;s ISS, Tiangong and Hubble passes — when each one rises, how high it climbs, how long you have, and whether it will actually be lit.
          </p>
          <p className="text-sm text-slate-400 mt-3">
            Predictions use CelesTrak orbital elements, the local 6&nbsp;pm–6&nbsp;am window in each city&apos;s own time zone, and a darkness check at the observer plus a shadow check on the satellite.
            No account, no app.
          </p>
        </header>

        <div className="mb-10">
          <UseMyLocation />
        </div>

        {TONIGHT_REGIONS.map((region) => {
          const cities = TONIGHT_CITIES.filter((c) => c.region === region);
          if (cities.length === 0) return null;
          return (
            <section key={region} className="mb-8" aria-labelledby={`region-${region.replace(/\s+/g, '-').toLowerCase()}`}>
              <h2 id={`region-${region.replace(/\s+/g, '-').toLowerCase()}`} className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">{region}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {cities.map((c) => (
                  <Link key={c.slug} href={`/tonight/${c.slug}`} className="card px-3 py-2.5 hover:border-cyan-500/30 transition-colors">
                    <div className="text-sm font-semibold text-white">{c.name}</div>
                    <div className="text-[11px] text-slate-500">{c.area}{c.country !== 'USA' ? `, ${c.country}` : ''}</div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <section className="mb-10 card p-5">
          <h2 className="text-lg font-bold text-white mb-2">What counts as a visible pass</h2>
          <ul className="text-sm text-slate-300 space-y-1.5 list-disc pl-5">
            <li>The object climbs at least 10° above the horizon — lower than that it is behind trees and haze.</li>
            <li>The sun is more than 6° below your horizon at the pass&apos;s peak (end of civil twilight), otherwise the sky is too bright.</li>
            <li>The satellite is still in sunlight at that moment. Deep in the night it is usually in Earth&apos;s shadow — that is why the best passes cluster an hour or two after dusk and before dawn.</li>
          </ul>
          <p className="text-xs text-slate-500 mt-3">
            Passes that fail the darkness or shadow test are kept in a collapsed list on each city page so you can see everything that flew over.
            Direction of travel is not shown — our predictor computes elevation only.
          </p>
        </section>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm mb-10">
          <Link href="/whats-overhead" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">What&apos;s overhead right now</Link>
          <span className="hidden sm:inline text-white/10">|</span>
          <Link href="/satellites" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">Live satellite tracker</Link>
          <span className="hidden sm:inline text-white/10">|</span>
          <Link href="/alerts?tab=satellite-passes" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">Pass alerts for your exact spot (free account)</Link>
        </div>

        <RelatedModules modules={PAGE_RELATIONS['tonight']} />

        <JsonLd data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: TITLE,
          description: DESCRIPTION,
          url: 'https://spacenexus.us/tonight',
          isPartOf: { '@type': 'WebSite', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        }} />
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: "What's Overhead", href: '/whats-overhead' }, { name: 'Tonight' }]} />
      </div>
    </div>
  );
}
