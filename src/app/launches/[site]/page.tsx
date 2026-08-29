import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import LaunchRow from '@/components/launches/LaunchRow';
import LaunchWatchForm from '@/components/launches/LaunchWatchForm';
import LaunchCrossLinks from '@/components/launches/LaunchCrossLinks';
import { LAUNCH_SITES, getSite, getSiteMonth, monthLabel, monthParam, monthWindow, shiftMonth } from '@/lib/launch-sites';

export const dynamic = 'force-dynamic';
export const dynamicParams = false;

export function generateStaticParams() {
  return LAUNCH_SITES.map((s) => ({ site: s.slug }));
}

export async function generateMetadata({ params }: { params: { site: string } }): Promise<Metadata> {
  const site = getSite(params.site);
  if (!site) return {};
  const title = `${site.shortName} Launch Schedule 2026: Upcoming & Recent Rocket Launches`;
  const description = `Every rocket launch from ${site.name} — this month's schedule, what just flew and how it went, month-by-month archive${site.viewingGuide ? ', and where to watch in person' : ''}.`;
  return { title, description, alternates: { canonical: `https://spacenexus.us/launches/${site.slug}` }, openGraph: { title, description, type: 'website' } };
}

export default async function SitePage({ params }: { params: { site: string } }) {
  const site = getSite(params.site);
  if (!site) notFound();
  const now = new Date();
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth() + 1;
  const nxt = shiftMonth(y, mo, 1);
  const [thisMonth, nextMonth] = await Promise.all([getSiteMonth(site.slug, y, mo, now), getSiteMonth(site.slug, nxt.year, nxt.month, now)]);
  const months = monthWindow(now);

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
          <Link href="/launches" className="hover:text-white/80">Launches</Link><span>/</span>
          <span className="text-slate-400">{site.shortName}</span>
        </nav>
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{site.name}</h1>
          <p className="text-slate-400">{site.region}, {site.country}</p>
          <p className="text-slate-300 leading-relaxed mt-3 max-w-3xl">{site.blurb}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {site.viewingGuide && <Link href={site.viewingGuide} className="btn-primary text-sm py-2 px-4">Where to watch a launch at {site.shortName}</Link>}
          </div>
        </header>
        <div className="mb-8">
          <LaunchWatchForm site={site.shortName} label={`every launch from ${site.shortName}`} source="site-page" />
        </div>

        {[thisMonth, nextMonth].map((d) => d && (
          <section key={`${d.year}-${d.month}`} className="mb-8">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-lg font-bold text-white">{monthLabel(d.year, d.month)}</h2>
              <Link href={`/launches/${site.slug}/${monthParam(d.year, d.month)}`} className="text-xs text-cyan-400 hover:text-cyan-300">Full month &rarr;</Link>
            </div>
            {d.launches.length === 0 ? <p className="text-sm text-slate-500 card p-4">Nothing on the tracked manifest yet.</p>
              : <div className="space-y-2">{d.launches.map((l) => <LaunchRow key={l.id} launch={l} showSite={false} now={now} />)}</div>}
          </section>
        ))}

        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">Month by month</h2>
          <div className="flex flex-wrap gap-2">
            {[...months].reverse().map((m) => (
              <Link key={`${m.year}-${m.month}`} href={`/launches/${site.slug}/${monthParam(m.year, m.month)}`} className={`card px-3 py-1.5 text-xs hover:border-cyan-500/30 transition-colors ${m.year === y && m.month === mo ? 'text-cyan-300' : 'text-slate-300'}`}>
                {monthLabel(m.year, m.month)}
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">What&apos;s next</h2>
          <LaunchCrossLinks rocket={thisMonth?.launches.find((l) => l.launchDate && l.launchDate.getTime() > now.getTime())?.rocket ?? null} location={site.name} upcoming={(thisMonth?.upcoming ?? 0) + (nextMonth?.upcoming ?? 0) > 0} hide={['site']} />
        </section>

        <section className="pt-6 border-t border-white/[0.06] text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Link href="/launches" className="text-slate-300 hover:text-white">All launch sites &rarr;</Link>
            <Link href="/rockets" className="text-slate-300 hover:text-white">Every rocket: cost, payload, record &rarr;</Link>
            <Link href="/mission-control" className="text-slate-300 hover:text-white">Mission Control: live countdowns &rarr;</Link>
            <Link href="/spaceports" className="text-slate-300 hover:text-white">Spaceport directory &rarr;</Link>
          </div>
        </section>
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Launches', href: '/launches' }, { name: site.shortName }]} />
      </div>
    </div>
  );
}
