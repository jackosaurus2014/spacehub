import type { Metadata } from 'next';
import Link from 'next/link';
import Console from '@/components/ui/Console';
import Telemetry from '@/components/ui/Telemetry';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import DatasetSchema from '@/components/seo/DatasetSchema';
import CiteEmbed from '@/components/CiteEmbed';
import { getMarketsDaily } from '@/lib/markets-daily';

// G13 — Space Markets Daily: the free space-sector market summary that
// doesn't exist anywhere else. The investor persona's daily loop.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Space Markets Daily — SpaceNexus Pure-Play Index',
  description: 'The daily space-sector market summary: the SpaceNexus Pure-Play Index (equal-weighted move across public space companies), top movers, and the day\'s funding rounds and contract awards. Free, every day.',
  alternates: { canonical: 'https://spacenexus.us/markets-daily' },
};

function pct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}
function usd(v: number | null): string {
  if (!v) return '—';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${Math.round(v / 1e6)}M`;
  return `$${Math.round(v).toLocaleString()}`;
}

export default async function MarketsDailyPage() {
  const d = await getMarketsDaily();
  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span><span className="text-slate-400">Markets Daily</span>
        </nav>
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Space Markets Daily</h1>
          <p className="text-lg text-white/70 max-w-3xl">
            The space sector&apos;s day, in one screen: the <span className="text-white/90">SpaceNexus Pure-Play Index</span> —
            the equal-weighted daily move across public space companies (primes excluded, so one mega-cap can&apos;t be the
            whole story) — plus movers, deals and awards. Free, every trading day.
          </p>
        </header>

        {!d ? (
          <div className="card p-6"><p className="text-slate-400 text-sm">Market data is temporarily unavailable.</p></div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Telemetry label="Pure-Play Index" value={d.index.value == null ? '—' : pct(d.index.value)} tone={d.index.value != null && d.index.value < 0 ? 'ember' : 'signal'} sub="equal-weighted daily move" />
              <Telemetry label="Members" value={d.index.members} sub="public pure-plays tracked" tone="ink" />
              <Telemetry label="Advancing" value={d.index.gainers} sub="up on the day" />
              <Telemetry label="Declining" value={d.index.decliners} sub="down on the day" tone="ember" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Console title="Top movers" source="Yahoo Finance (delayed quotes)" asOf={d.asOf}>
                <ul className="space-y-1.5">
                  {d.topMovers.map(m => (
                    <li key={m.slug} className="flex items-center justify-between text-sm">
                      <Link href={`/company-profiles/${m.slug}`} className="text-white/90 hover:text-cyan-300">{m.name} <span className="font-mono text-[11px] text-slate-500">{m.ticker}</span></Link>
                      <span className="font-mono tabular-nums text-emerald-400">{pct(m.changePct)}</span>
                    </li>
                  ))}
                </ul>
              </Console>
              <Console title="Biggest decliners" source="Yahoo Finance (delayed quotes)" asOf={d.asOf}>
                <ul className="space-y-1.5">
                  {d.bottomMovers.map(m => (
                    <li key={m.slug} className="flex items-center justify-between text-sm">
                      <Link href={`/company-profiles/${m.slug}`} className="text-white/90 hover:text-cyan-300">{m.name} <span className="font-mono text-[11px] text-slate-500">{m.ticker}</span></Link>
                      <span className="font-mono tabular-nums text-red-400">{pct(m.changePct)}</span>
                    </li>
                  ))}
                </ul>
              </Console>
            </div>

            {(d.deals.length > 0 || d.contracts.length > 0) && (
              <div className="grid md:grid-cols-2 gap-6">
                <Console title="New funding rounds (24h)">
                  {d.deals.length === 0 ? <p className="text-slate-500 text-sm">No new rounds recorded today.</p> : (
                    <ul className="space-y-1.5">
                      {d.deals.map((r, i) => (
                        <li key={i} className="flex items-center justify-between text-sm">
                          {r.slug ? <Link href={`/company-profiles/${r.slug}`} className="text-white/90 hover:text-cyan-300">{r.company}</Link> : <span className="text-white/90">{r.company}</span>}
                          <span className="font-mono tabular-nums text-slate-300">{r.series ? `${r.series} · ` : ''}{usd(r.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Console>
                <Console title="New contract awards (24h)">
                  {d.contracts.length === 0 ? <p className="text-slate-500 text-sm">No new awards recorded today.</p> : (
                    <ul className="space-y-1.5">
                      {d.contracts.map((c, i) => (
                        <li key={i} className="text-sm">
                          <span className="text-white/90">{c.company}</span>
                          <span className="text-slate-500 text-xs ml-2">{c.agency || ''} · {usd(c.value)}</span>
                          <p className="text-xs text-slate-500 line-clamp-1">{c.title}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Console>
              </div>
            )}

            <CiteEmbed
              title="SpaceNexus Pure-Play Index"
              pageUrl="https://spacenexus.us/markets-daily"
              sourceLine="SpaceNexus Space Markets Daily (Pure-Play Index: equal-weighted daily move, primes excluded; quotes delayed via Yahoo Finance)"
            />

            <p className="text-sm text-slate-500">
              Deeper: <Link href="/space-stocks" className="text-cyan-300 hover:underline">every public space company</Link>{' · '}
              <Link href="/funding-tracker" className="text-cyan-300 hover:underline">funding tracker</Link>{' · '}
              <Link href="/procurement" className="text-cyan-300 hover:underline">contracts &amp; opportunities</Link>{' · '}
              want it in your inbox? The <Link href="/newsletter" className="text-cyan-300 hover:underline">Daily Brief</Link> carries the movers.
            </p>
          </div>
        )}
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Markets Daily' }]} />
        <DatasetSchema
          name="SpaceNexus Pure-Play Index — daily space-sector market summary"
          description="Daily equal-weighted move across publicly traded pure-play space companies, with the day's top and bottom movers, funding rounds and contract awards. Underlying company records are in the SpaceNexus Space Company Database."
          url="https://spacenexus.us/markets-daily"
          distributionUrl="https://spacenexus.us/api/datasets/space-companies/csv"
          encodingFormat="text/csv"
          dateModified={d?.asOf}
          keywords={['space stocks', 'space sector index', 'pure-play space companies', 'market summary']}
        />
      </div>
    </div>
  );
}
