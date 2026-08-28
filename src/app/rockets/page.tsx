import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { getRocketIndex } from '@/lib/rockets';
import { formatLaunchDate } from '@/components/launches/LaunchRow';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Every Rocket: Launch Cost, Next Launch & Record (2026)',
  description: 'Falcon 9, Starship, New Glenn, Electron, Vulcan, Ariane 6, Long March and more — price per launch, cost per kilogram, payload, reliability, and each rocket\'s live launch schedule.',
  alternates: { canonical: 'https://spacenexus.us/rockets' },
  openGraph: { title: 'Every Rocket: Launch Cost, Next Launch & Record', description: 'Price, payload, reliability and a live schedule for every operational and upcoming launch vehicle.', type: 'website' },
};

export default async function RocketsIndexPage() {
  const now = new Date();
  const rockets = await getRocketIndex(now);
  const operational = rockets.filter((r) => r.spec.status === 'Operational').sort((a, b) => b.last90Days - a.last90Days || b.flown - a.flown);
  const development = rockets.filter((r) => r.spec.status === 'In Development');
  const retired = rockets.filter((r) => r.spec.status === 'Retired');

  const Card = ({ r }: { r: (typeof rockets)[number] }) => (
    <Link href={`/rockets/${r.slug}`} className="card p-5 hover:border-cyan-500/30 transition-colors group flex flex-col">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <h2 className="text-base font-semibold text-white group-hover:text-cyan-300 transition-colors">{r.spec.name}</h2>
        <span className="text-xs text-slate-500 whitespace-nowrap">{r.spec.manufacturer}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs mt-2">
        <div><div className="text-slate-500">Price</div><div className="text-white font-medium">{r.spec.costMillions ? `~$${r.spec.costMillions}M` : '—'}</div></div>
        <div><div className="text-slate-500">To LEO</div><div className="text-white font-medium">{(r.spec.payloadLeoKg / 1000).toFixed(r.spec.payloadLeoKg >= 10000 ? 0 : 1)} t</div></div>
        <div><div className="text-slate-500">Record</div><div className="text-white font-medium">{r.spec.successRate}%</div></div>
      </div>
      <div className="mt-3 pt-3 border-t border-white/[0.06] text-xs text-slate-400 flex justify-between gap-2">
        <span>{r.last90Days} launch{r.last90Days === 1 ? '' : 'es'} / 90d</span>
        <span className="truncate">{r.nextLaunch ? `Next: ${formatLaunchDate(r.nextLaunch, false)}` : 'No launch scheduled'}</span>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span><span className="text-slate-400">Rockets</span>
        </nav>
        <header className="mb-10 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Rockets</h1>
          <p className="text-lg text-white/70 leading-relaxed">
            One page per launch vehicle: what it costs, what it carries, how reliable it has been, and — live from our launch tracker — what it flew recently and when it flies next.
          </p>
        </header>

        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">Operational · by recent cadence</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">{operational.map((r) => <Card key={r.slug} r={r} />)}</div>

        {development.length > 0 && (<>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">In development</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">{development.map((r) => <Card key={r.slug} r={r} />)}</div>
        </>)}
        {retired.length > 0 && (<>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">Retired</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">{retired.map((r) => <Card key={r.slug} r={r} />)}</div>
        </>)}

        <div className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Compare them side by side</h2>
            <p className="text-sm text-slate-400">Sortable specs, reliability charts and cost-per-kilogram analysis across every vehicle.</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link href="/launch-vehicles" className="btn-primary text-sm py-2 px-4">Launch vehicle database</Link>
            <Link href="/launches" className="btn-secondary text-sm py-2 px-4">Launches by site</Link>
          </div>
        </div>
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Rockets' }]} />
      </div>
    </div>
  );
}
