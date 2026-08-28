import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { COST_TO_LAUNCH, getCostToLaunch } from '@/lib/cost-to-launch';

// Static registry (src/lib/cost-to-launch.ts): every slug is enumerated and
// dynamicParams=false makes the router 404 anything else at the routing
// layer — the pattern src/app/blog/[slug] documents. No DB, so it can
// prerender.
export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return COST_TO_LAUNCH.map((c) => ({ thing: c.slug }));
}

export function generateMetadata({ params }: { params: { thing: string } }): Metadata {
  const c = getCostToLaunch(params.thing);
  if (!c) return {};
  return {
    title: c.metaTitle,
    description: c.description,
    alternates: { canonical: `https://spacenexus.us/guide/cost-to-launch/${c.slug}` },
    openGraph: { title: c.metaTitle, description: c.description, type: 'article', images: [{ url: `/api/og?title=${encodeURIComponent(c.title)}&subtitle=${encodeURIComponent('2026 prices, by option')}&type=guide`, width: 1200, height: 630 }] },
  };
}

export default function CostToLaunchPage({ params }: { params: { thing: string } }) {
  const c = getCostToLaunch(params.thing);
  if (!c) notFound();
  const others = COST_TO_LAUNCH.filter((o) => o.slug !== c.slug);

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
          <Link href="/guide" className="hover:text-white/80">Guides</Link><span>/</span>
          <Link href="/guide/space-launch-cost-comparison" className="hover:text-white/80">Launch costs</Link><span>/</span>
          <span className="text-slate-400">{c.thing.replace(/^a /, '').replace(/^\w/, (ch) => ch.toUpperCase())}</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{c.title}</h1>
          <p className="text-lg text-white/80 leading-relaxed"><strong className="text-white">Short answer:</strong> {c.shortAnswer}</p>
          <p className="text-xs text-slate-500 mt-3">2026 list and rideshare prices. Figures track the <Link href="/guide/space-launch-cost-comparison" className="text-cyan-400 hover:text-cyan-300">launch cost guide</Link>; contract prices vary.</p>
        </header>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-3">Price by option</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                  <th className="px-4 py-2.5">Option</th><th className="px-4 py-2.5">Price</th><th className="px-4 py-2.5">Notes</th>
                </tr>
              </thead>
              <tbody>
                {c.rows.map((r) => (
                  <tr key={r.option} className="border-b border-white/[0.06] last:border-0 align-top">
                    <td className="px-4 py-2.5 text-white">{r.rocket ? <Link href={`/rockets/${r.rocket}`} className="hover:text-cyan-300">{r.option}</Link> : r.option}</td>
                    <td className="px-4 py-2.5 text-white font-semibold whitespace-nowrap">{r.price}</td>
                    <td className="px-4 py-2.5 text-slate-400">{r.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-3">The costs that are not on the price list</h2>
          <ul className="space-y-2">
            {c.hiddenCosts.map((h) => (
              <li key={h} className="flex items-start gap-3 text-sm text-slate-300"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" />{h}</li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-3">Frequently asked</h2>
          <div className="space-y-3">
            {c.faq.map((f) => (
              <div key={f.q} className="card p-4">
                <h3 className="text-sm font-semibold text-white mb-1.5">{f.q}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5 mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">Run your own numbers</div>
            <div className="text-xs text-slate-400">Mass, orbit, vehicle, insurance — the calculator does the delivered-cost math.</div>
          </div>
          <Link href="/launch-cost-calculator" className="btn-primary text-sm py-2 px-4 flex-shrink-0">Launch cost calculator</Link>
        </section>

        <section className="pt-6 border-t border-white/[0.06] text-sm">
          <h3 className="text-lg font-bold text-white mb-3">Related</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {c.related.map((r) => <Link key={r.href} href={r.href} className="text-slate-300 hover:text-white">{r.label} &rarr;</Link>)}
            {others.map((o) => <Link key={o.slug} href={`/guide/cost-to-launch/${o.slug}`} className="text-slate-300 hover:text-white">{o.title} &rarr;</Link>)}
            <Link href="/rockets" className="text-slate-300 hover:text-white">Every rocket: cost, payload, record &rarr;</Link>
          </div>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org', '@type': 'FAQPage',
          mainEntity: [{ '@type': 'Question', name: c.title, acceptedAnswer: { '@type': 'Answer', text: c.shortAnswer } }, ...c.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))],
        }).replace(/</g, '\\u003c') }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org', '@type': 'Article', headline: c.title, description: c.description,
          author: { '@type': 'Organization', name: 'SpaceNexus' }, publisher: { '@type': 'Organization', name: 'SpaceNexus', logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' } },
          datePublished: '2026-08-28T00:00:00Z', dateModified: new Date().toISOString(), mainEntityOfPage: { '@type': 'WebPage', '@id': `https://spacenexus.us/guide/cost-to-launch/${c.slug}` },
        }).replace(/</g, '\\u003c') }} />
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Guides', href: '/guide' }, { name: 'Launch costs', href: '/guide/space-launch-cost-comparison' }, { name: c.title }]} />
      </div>
    </div>
  );
}
