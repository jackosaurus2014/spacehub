import type { Metadata } from 'next';
import Link from 'next/link';
import Console from '@/components/ui/Console';
import Telemetry from '@/components/ui/Telemetry';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import DatasetSchema from '@/components/seo/DatasetSchema';
import CiteEmbed from '@/components/CiteEmbed';
import { getLaunchCadence } from '@/lib/launch-cadence';

// G1 — the Launch Cadence Index (growth plan item 1). A live, citable,
// embeddable answer to "how fast is the world launching this year" — the
// BryceTech briefing, but live instead of a quarterly PDF.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Launch Cadence Index — Orbital Launch Pace, Live',
  description: 'Live year-over-year orbital launch pace: attempts to date vs the same date last year, by provider and country, with success rates and a full-year projection. Free to cite and embed.',
  alternates: { canonical: 'https://spacenexus.us/launch-cadence' },
};

export default async function LaunchCadencePage() {
  const data = await getLaunchCadence();
  const maxCtry = data ? Math.max(1, ...data.countries.map(c => c.thisYear)) : 1;
  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span><span className="text-slate-400">Launch Cadence Index</span>
        </nav>
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Launch Cadence Index</h1>
          <p className="text-lg text-white/70 max-w-3xl">
            How fast the world is launching, live. An attempt is an orbital launch that lifted off (success or failure —
            scrubs don&apos;t count), and to-date comparisons cut both years at the same UTC day. Sourced from Launch
            Library 2 plus our own tracking.
          </p>
        </header>

        {!data ? (
          <div className="card p-6"><p className="text-slate-400 text-sm">Cadence data is temporarily unavailable.</p></div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Telemetry label={`${data.year} attempts`} value={data.thisYearToDate} sub="to date" />
              <Telemetry label={`${data.year - 1} same date`} value={data.lastYearToDate} sub="attempts to the same day" tone="ink" />
              <Telemetry label="Pace vs last year" value={data.paceDeltaPct == null ? '—' : `${data.paceDeltaPct >= 0 ? '+' : ''}${data.paceDeltaPct}%`} tone={data.paceDeltaPct != null && data.paceDeltaPct < 0 ? 'ember' : 'signal'} sub="year-over-year" />
              <Telemetry label={`Projected ${data.year}`} value={`~${data.projectedFullYear}`} sub={`at current pace · ${data.successRateThisYear}% success`} />
            </div>

            <Console title={`Attempts by provider — ${data.year} vs ${data.year - 1} to date`} source="Launch Library 2 + SpaceNexus tracking" asOf={data.asOf}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Orbital launch attempts by provider, this year versus the same period last year</caption>
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                      <th className="py-2 pr-3">Provider</th>
                      <th className="py-2 pr-3 text-right">{data.year}</th>
                      <th className="py-2 pr-3 text-right">{data.year - 1} td</th>
                      <th className="py-2 pr-3 text-right">Δ</th>
                      <th className="py-2 text-right">Success</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.providers.map(p => (
                      <tr key={p.provider} className="border-b border-white/[0.04]">
                        <td className="py-2 pr-3 text-white/90">{p.provider}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-white">{p.thisYear}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-slate-400">{p.lastYearToDate}</td>
                        <td className={`py-2 pr-3 text-right font-mono tabular-nums ${p.delta > 0 ? 'text-emerald-400' : p.delta < 0 ? 'text-red-400' : 'text-slate-500'}`}>{p.delta > 0 ? `+${p.delta}` : p.delta}</td>
                        <td className="py-2 text-right font-mono tabular-nums text-slate-300">{p.successRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Console>

            <div className="grid md:grid-cols-2 gap-6">
              <Console title="Attempts by country">
                <ul className="space-y-2">
                  {data.countries.map(c => (
                    <li key={c.country} className="text-sm">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-white/90">{c.country}</span>
                        <span className="font-mono tabular-nums text-slate-300">{c.thisYear} <span className="text-slate-500 text-xs">({c.lastYearToDate} td LY)</span></span>
                      </div>
                      <div className="h-1.5 rounded bg-white/[0.04] overflow-hidden">
                        <div className="h-full bg-cyan-500/60 rounded" style={{ width: `${Math.round((c.thisYear / maxCtry) * 100)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Console>

              <Console title="Launches per month" actions={<Link href="/chart/launches-per-month" className="text-xs text-cyan-300 hover:underline">Permalink + data →</Link>}>
                <img src="/api/chart/launches-per-month?format=svg" alt="Orbital launches per month, trailing 12 months" width={1200} height={630} className="w-full h-auto rounded" loading="lazy" />
              </Console>
            </div>

            <CiteEmbed
              title="Launch Cadence Index"
              pageUrl="https://spacenexus.us/launch-cadence"
              embedUrl="https://spacenexus.us/embed/launch-cadence"
              sourceLine="SpaceNexus Launch Cadence Index (data: Launch Library 2 + SpaceNexus tracking)"
            />

            <p className="text-sm text-slate-500">
              Related: <Link href="/launches" className="text-cyan-300 hover:underline">upcoming launches</Link>{' · '}
              <Link href="/rockets" className="text-cyan-300 hover:underline">rocket profiles</Link>{' · '}
              <Link href="/hiring-trends" className="text-cyan-300 hover:underline">hiring trends</Link>
            </p>
          </div>
        )}
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Launch Cadence Index' }]} />
        <DatasetSchema
          name="SpaceNexus Launch Cadence Index"
          description="Live year-over-year orbital launch pace: attempts to date versus the same UTC day last year, by provider and country, with success rates and a full-year projection. Computed from the SpaceNexus orbital launch log (Launch Library 2 plus SpaceNexus tracking)."
          url="https://spacenexus.us/launch-cadence"
          distributionUrl="https://spacenexus.us/api/datasets/launch-log/csv"
          encodingFormat="text/csv"
          temporalCoverage={data ? `${data.year - 1}-01-01/${data.year}-12-31` : undefined}
          dateModified={data?.asOf}
          keywords={['orbital launches', 'launch cadence', 'launch rate', 'rockets']}
        />
      </div>
    </div>
  );
}
