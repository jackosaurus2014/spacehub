import type { Metadata } from 'next';
import Link from 'next/link';
import Console from '@/components/ui/Console';
import Telemetry from '@/components/ui/Telemetry';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import DatasetSchema from '@/components/seo/DatasetSchema';
import CiteEmbed from '@/components/CiteEmbed';
import { getSlipData, PROVIDER_STATS_THRESHOLD, RECORDING_SINCE } from '@/lib/launch-slips';

// G8 — Slip Explorer. The only public record of announced-vs-actual launch
// date drift: LL2 exposes no revision history, so nobody (including us) can
// backfill this — it exists because we record every manifest change live.
// Honest framing while young: provider reliability stats unlock at a stated
// threshold instead of dressing days of data up as a dataset.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Launch Slip Explorer — Announced vs Actual Launch Dates',
  description: 'Every launch date change we observe, recorded live: which missions slipped, by how many days, and (as history accumulates) which providers hold their dates. A dataset nobody can backfill.',
  alternates: { canonical: 'https://spacenexus.us/launch-slips' },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default async function LaunchSlipsPage() {
  const data = await getSlipData();
  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span><span className="text-slate-400">Launch Slips</span>
        </nav>
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Launch Slip Explorer</h1>
          <p className="text-lg text-white/70 max-w-3xl">
            Launch dates move constantly — and the history of those moves vanishes unless someone records it as it
            happens. We do: every manifest change observed since {new Date(RECORDING_SINCE).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} is
            logged the moment it appears. No revision feed exists upstream, so this ledger can&apos;t be backfilled — by
            anyone. It only grows.
          </p>
        </header>

        {!data ? (
          <div className="card p-6"><p className="text-slate-400 text-sm">Slip data is temporarily unavailable.</p></div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Telemetry label="Date changes recorded" value={data.totalChanges} sub={`since ${fmtDate(RECORDING_SINCE + 'T00:00:00Z')}`} />
              <Telemetry label="Launches affected" value={data.launchesTracked} sub="distinct missions" />
              <Telemetry label="Biggest recent move" value={data.biggestRecentSlipDays == null ? '—' : `${data.biggestRecentSlipDays}d`} sub="largest shift in the ledger" />
            </div>

            <Console title="Recent date changes" source="SpaceNexus live manifest observation" asOf={data.asOf} status="verified">
              {data.recent.length === 0 ? (
                <p className="text-slate-400 text-sm">No date changes recorded yet — the ledger fills as manifests move.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Recent launch date changes: mission, provider, old and new dates, and the size of the move</caption>
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                        <th className="py-2 pr-3">Mission</th>
                        <th className="py-2 pr-3">Provider</th>
                        <th className="py-2 pr-3">From → To</th>
                        <th className="py-2 pr-3 text-right">Δ days</th>
                        <th className="py-2 text-right">Observed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map((r, i) => (
                        <tr key={`${r.eventId}-${i}`} className="border-b border-white/[0.04]">
                          <td className="py-2 pr-3"><Link href={`/launch/${r.eventId}`} className="text-white/90 hover:text-cyan-300">{r.mission}</Link></td>
                          <td className="py-2 pr-3 text-slate-400">{r.provider || '—'}</td>
                          <td className="py-2 pr-3 font-mono tabular-nums text-slate-300">{fmtDate(r.fromDate)} → {fmtDate(r.toDate)}</td>
                          <td className={`py-2 pr-3 text-right font-mono tabular-nums ${r.deltaDays > 0 ? 'text-amber-400' : r.deltaDays < 0 ? 'text-emerald-400' : 'text-slate-500'}`}>{r.deltaDays > 0 ? `+${r.deltaDays}` : r.deltaDays}</td>
                          <td className="py-2 text-right text-slate-500 text-xs">{fmtDate(r.observedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Console>

            {data.providerStatsUnlocked ? (
              <Console title="Provider scorecard — who holds their dates" source="SpaceNexus slip ledger" asOf={data.asOf}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Per-provider slip statistics</caption>
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                        <th className="py-2 pr-3">Provider</th>
                        <th className="py-2 pr-3 text-right">Changes</th>
                        <th className="py-2 pr-3 text-right">Avg move</th>
                        <th className="py-2 text-right">Net days lost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.providers.map(p => (
                        <tr key={p.provider} className="border-b border-white/[0.04]">
                          <td className="py-2 pr-3 text-white/90">{p.provider}</td>
                          <td className="py-2 pr-3 text-right font-mono tabular-nums text-white">{p.changes}</td>
                          <td className="py-2 pr-3 text-right font-mono tabular-nums text-slate-300">{p.avgSlipDays > 0 ? `+${p.avgSlipDays}` : p.avgSlipDays}d</td>
                          <td className="py-2 text-right font-mono tabular-nums text-amber-400">{p.netDaysLost}d</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Console>
            ) : (
              <Console title="Provider scorecard — collecting history">
                <p className="text-slate-400 text-sm">
                  Per-provider reliability stats (average slip, on-time tendency, net days lost) unlock at{' '}
                  <span className="font-mono text-white">{PROVIDER_STATS_THRESHOLD}</span> recorded changes —{' '}
                  <span className="font-mono text-cyan-300">{data.totalChanges}</span> so far. We&apos;d rather show you a
                  counter than dress days of data up as a verdict. The weekly chart below fills in on the same schedule.
                </p>
              </Console>
            )}

            <Console title="Slips per week" actions={<Link href="/chart/launch-slips-by-week" className="text-xs text-cyan-300 hover:underline">Permalink + data →</Link>}>
              <img src="/api/chart/launch-slips-by-week?format=svg" alt="Launch date slips per week" width={1200} height={630} className="w-full h-auto rounded" loading="lazy" />
            </Console>

            <CiteEmbed
              title="Launch Slip Explorer"
              pageUrl="https://spacenexus.us/launch-slips"
              embedUrl="https://spacenexus.us/embed/chart/launch-slips-by-week"
              sourceLine="SpaceNexus Launch Slip Explorer (live manifest observation; recording since Aug 29, 2026)"
            />

            <p className="text-sm text-slate-500">
              Related: <Link href="/launch-cadence" className="text-cyan-300 hover:underline">Launch Cadence Index</Link>{' · '}
              <Link href="/launches" className="text-cyan-300 hover:underline">launches by site</Link>{' · '}
              <Link href="/rockets" className="text-cyan-300 hover:underline">rocket reliability records</Link>
            </p>
          </div>
        )}
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Launch Slips' }]} />
        <DatasetSchema
          name="SpaceNexus Launch Slip Ledger"
          description={`Every launch date change observed on the global launch manifest since ${RECORDING_SINCE}: mission, vehicle, provider, old and new dates and the size of the move in days. Recorded live — no upstream revision history exists, so the ledger cannot be backfilled.`}
          url="https://spacenexus.us/launch-slips"
          distributionUrl="https://spacenexus.us/api/datasets/launch-slips/csv"
          encodingFormat="text/csv"
          temporalCoverage={`${RECORDING_SINCE}/..`}
          dateModified={data?.asOf}
          keywords={['launch slips', 'launch delays', 'launch schedule', 'manifest changes']}
        />
      </div>
    </div>
  );
}
