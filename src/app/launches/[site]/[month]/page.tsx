import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import LaunchRow from '@/components/launches/LaunchRow';
import { LAUNCH_SITES, getSite, getSiteMonth, monthLabel, monthParam, monthWindow, parseMonthParam } from '@/lib/launch-sites';

// Site × month pages. Valid months are the last 12 and next 6 — enumerated
// for the router so anything else is a real 404 — and rendered per request
// from SpaceEvent so past launches carry outcomes and future ones the
// current NET.
export const dynamic = 'force-dynamic';
export const dynamicParams = false;

export function generateStaticParams() {
  const months = monthWindow(new Date());
  return LAUNCH_SITES.flatMap((s) => months.map((m) => ({ site: s.slug, month: monthParam(m.year, m.month) })));
}

export async function generateMetadata({ params }: { params: { site: string; month: string } }): Promise<Metadata> {
  const site = getSite(params.site);
  const m = parseMonthParam(params.month);
  if (!site || !m) return {};
  const label = monthLabel(m.year, m.month);
  const title = `${site.shortName} Launch Schedule ${label}: Every Rocket Launch`;
  const description = `All rocket launches from ${site.name} in ${label} — dates, rockets, payloads and outcomes, updated from the live manifest.${site.viewingGuide ? ' Plus where to watch in person.' : ''}`;
  return { title, description, alternates: { canonical: `https://spacenexus.us/launches/${site.slug}/${params.month}` }, openGraph: { title, description, type: 'website' } };
}

export default async function SiteMonthPage({ params }: { params: { site: string; month: string } }) {
  const m = parseMonthParam(params.month);
  if (!m) notFound();
  const now = new Date();
  const data = await getSiteMonth(params.site, m.year, m.month, now);
  if (!data) notFound();
  const { site, launches, completed, failed, upcoming, prev, next } = data;
  const label = monthLabel(m.year, m.month);
  const past = launches.filter((l) => l.launchDate && l.launchDate.getTime() <= now.getTime());
  const future = launches.filter((l) => l.launchDate && l.launchDate.getTime() > now.getTime());
  const window = monthWindow(now);
  const inWindow = (y: number, mo: number) => window.some((w) => w.year === y && w.month === mo);

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
          <Link href="/launches" className="hover:text-white/80">Launches</Link><span>/</span>
          <Link href={`/launches/${site.slug}`} className="hover:text-white/80">{site.shortName}</Link><span>/</span>
          <span className="text-slate-400">{label}</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{site.shortName} launch schedule, {label}</h1>
          <p className="text-slate-400">{site.name} · {site.region}, {site.country}</p>
          <div className="flex flex-wrap gap-2 mt-4 text-xs">
            <span className="card px-3 py-1.5 text-slate-300">{launches.length} launch{launches.length === 1 ? '' : 'es'} this month</span>
            {completed > 0 && <span className="card px-3 py-1.5 text-emerald-300">{completed} successful</span>}
            {failed > 0 && <span className="card px-3 py-1.5 text-red-300">{failed} failed</span>}
            {upcoming > 0 && <span className="card px-3 py-1.5 text-sky-300">{upcoming} still to fly</span>}
          </div>
        </header>

        <div className="flex items-center justify-between mb-6 text-sm">
          {inWindow(prev.year, prev.month) ? <Link href={`/launches/${site.slug}/${monthParam(prev.year, prev.month)}`} className="text-cyan-400 hover:text-cyan-300">&larr; {monthLabel(prev.year, prev.month)}</Link> : <span />}
          {inWindow(next.year, next.month) ? <Link href={`/launches/${site.slug}/${monthParam(next.year, next.month)}`} className="text-cyan-400 hover:text-cyan-300">{monthLabel(next.year, next.month)} &rarr;</Link> : <span />}
        </div>

        {launches.length === 0 ? (
          <div className="card p-8 text-center text-slate-400 mb-8">
            No launches from {site.shortName} are on the tracked manifest for {label}{m.year * 100 + m.month > now.getUTCFullYear() * 100 + now.getUTCMonth() + 1 ? ' yet — schedules firm up a few weeks ahead' : ''}.
          </div>
        ) : (
          <>
            {future.length > 0 && (<section className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">Upcoming</h2>
              <div className="space-y-2">{future.map((l) => <LaunchRow key={l.id} launch={l} showSite={false} now={now} />)}</div>
            </section>)}
            {past.length > 0 && (<section className="mb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">Flown</h2>
              <div className="space-y-2">{[...past].reverse().map((l) => <LaunchRow key={l.id} launch={l} showSite={false} now={now} />)}</div>
            </section>)}
          </>
        )}

        {site.viewingGuide && (
          <div className="card p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white mb-1">Watching from the ground?</h2>
              <p className="text-sm text-slate-400">Best public viewing spots, road closures, and what to expect at {site.shortName}.</p>
            </div>
            <Link href={site.viewingGuide} className="btn-primary text-sm py-2 px-4 flex-shrink-0">Viewing guide</Link>
          </div>
        )}

        <section className="pt-6 border-t border-white/[0.06] text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Link href="/mission-control" className="text-slate-300 hover:text-white">Live countdowns and streams in Mission Control &rarr;</Link>
            <Link href="/guide/space-launch-schedule-2026" className="text-slate-300 hover:text-white">The full 2026 launch schedule guide &rarr;</Link>
            <Link href="/rockets" className="text-slate-300 hover:text-white">Every rocket: cost, payload, record &rarr;</Link>
            <Link href="/alerts" className="text-slate-300 hover:text-white">Get launch alerts by email &rarr;</Link>
          </div>
        </section>
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Launches', href: '/launches' }, { name: site.shortName, href: `/launches/${site.slug}` }, { name: label }]} />
      </div>
    </div>
  );
}
