import type { Metadata } from 'next';
import Link from 'next/link';
import HeroArt from '@/components/ui/HeroArt';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import ItemListSchema from '@/components/seo/ItemListSchema';
import { formatLaunchDate, missionTitle } from '@/components/launches/LaunchRow';
import { getSiteSummaries, getNextLaunches } from '@/lib/launch-sites';
import LaunchRow from '@/components/launches/LaunchRow';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Rocket Launches by Site: Cape Canaveral, Vandenberg, Starbase & More',
  description: 'Launch schedules and results for every major spaceport — Cape Canaveral, Vandenberg, Starbase, Kourou, Jiuquan, Wenchang, Sriharikota, Baikonur and more — month by month, from the live manifest.',
  alternates: { canonical: 'https://spacenexus.us/launches' },
};

export default async function LaunchesIndexPage() {
  const now = new Date();
  const [sitesRaw, next] = await Promise.all([getSiteSummaries(now), getNextLaunches(5, now)]);
  const sites = sitesRaw.sort((a, b) => b.last12Months - a.last12Months);
  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span><span className="text-slate-400">Launches</span>
        </nav>
        <HeroArt src="/art/hero-launch-sites.webp" className="mb-8" />
        <header className="mb-10 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Launches by site</h1>
          <p className="text-lg text-white/70 leading-relaxed">Every spaceport&apos;s schedule, month by month — what is coming, what flew, and how it went. Built from the same live manifest that powers Mission Control.</p>
          <p className="text-sm mt-3">
            <Link href="/gallery" className="inline-flex items-center min-h-[44px] text-cyan-400 hover:text-cyan-300">
              <span aria-hidden="true" className="mr-1.5">📷</span>Launch imagery — mission photos by provider, rocket and year &rarr;
            </Link>
          </p>
        </header>
        {next.length > 0 && (
          <section className="mb-12" aria-labelledby="next-launches">
            <h2 id="next-launches" className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">What is flying next</h2>
            <div className="space-y-2">{next.map((l) => <LaunchRow key={l.id} launch={l} showSite now={now} />)}</div>
            <p className="text-xs text-slate-500 mt-2"><Link href="/mission-control" className="text-cyan-400 hover:text-cyan-300">Every upcoming launch on Mission Control &rarr;</Link></p>
          </section>
        )}
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">By spaceport</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {sites.map(({ site, last12Months, upcoming, nextLaunch }) => (
            <Link key={site.slug} href={`/launches/${site.slug}`} className="card p-5 hover:border-cyan-500/30 transition-colors group flex flex-col">
              <h2 className="text-base font-semibold text-white group-hover:text-cyan-300 transition-colors">{site.name}</h2>
              <div className="text-xs text-slate-500 mb-3">{site.region}, {site.country}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><div className="text-slate-500">Last 12 months</div><div className="text-white font-medium">{last12Months} launch{last12Months === 1 ? '' : 'es'}</div></div>
                <div><div className="text-slate-500">Scheduled</div><div className="text-white font-medium">{upcoming}</div></div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.06] text-xs text-slate-400 truncate">
                {nextLaunch ? `Next: ${missionTitle(nextLaunch)} · ${formatLaunchDate(nextLaunch.launchDate, false)}` : 'No launch on the manifest'}
              </div>
              {site.viewingGuide && <div className="mt-2 text-[11px] text-cyan-400">Viewing guide available</div>}
            </Link>
          ))}
        </div>
        <ItemListSchema name="Launches by site" url="/launches" description={metadata.description as string} items={sites.map(({ site }) => ({ name: site.name, url: `/launches/${site.slug}`, description: `${site.region}, ${site.country}` }))} />
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Launches' }]} />
      </div>
    </div>
  );
}
