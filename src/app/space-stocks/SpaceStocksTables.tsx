'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DataFreshnessBadge from '@/components/ui/DataFreshnessBadge';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { clientLogger } from '@/lib/client-logger';

export interface StockRow {
  slug: string;
  name: string;
  ticker: string;
  exchange: string | null;
  dbMarketCap: number | null; // raw USD, from CompanyProfile.marketCap
  sector: string | null;
  /** ~90 daily closes for the sparkline (server-cached); absent when Yahoo did not answer. */
  history?: number[] | null;
}

export interface IpoRow extends StockRow {
  ipoDate: string | null; // ISO date
  raised: string | null; // pre-formatted display string, e.g. "$75B"
  notes: string | null;
  sourceUrl: string | null;
}

interface QuoteData {
  ticker: string;
  price?: number;
  change?: number;
  changePercent?: number;
  change30D?: number;
  marketCap?: number;
  success: boolean;
}

// Ported from the retired /market-intel page (2026-08 merge) — the only place
// on the site that tracks space-focused ETFs & funds alongside individual stocks.
interface SpaceETF {
  ticker: string;
  name: string;
  category: 'pure_space' | 'aerospace_defense';
  expenseRatio: number;
  leveraged?: boolean;
}

const SPACE_ETFS: SpaceETF[] = [
  { ticker: 'UFO', name: 'Procure Space ETF', category: 'pure_space', expenseRatio: 0.75 },
  { ticker: 'ARKX', name: 'ARK Space Exploration & Innovation ETF', category: 'pure_space', expenseRatio: 0.75 },
  { ticker: 'ROKT', name: 'SPDR S&P Kensho Final Frontiers ETF', category: 'pure_space', expenseRatio: 0.45 },
  { ticker: 'ITA', name: 'iShares U.S. Aerospace & Defense ETF', category: 'aerospace_defense', expenseRatio: 0.38 },
  { ticker: 'XAR', name: 'SPDR S&P Aerospace & Defense ETF', category: 'aerospace_defense', expenseRatio: 0.35 },
  { ticker: 'PPA', name: 'Invesco Aerospace & Defense ETF', category: 'aerospace_defense', expenseRatio: 0.58 },
  { ticker: 'DFEN', name: 'Direxion Daily A&D Bull 3X Shares', category: 'aerospace_defense', expenseRatio: 0.95, leveraged: true },
  { ticker: 'FITE', name: 'SPDR S&P Kensho Future Security ETF', category: 'aerospace_defense', expenseRatio: 0.45 },
];

function formatUSD(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(n) || n <= 0) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toFixed(0)}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function PriceCell({ quote, loading }: { quote: QuoteData | undefined; loading: boolean }) {
  if (loading && !quote) {
    return <div className="h-4 w-16 bg-white/[0.08] rounded animate-pulse ml-auto" />;
  }
  if (!quote || !quote.success || quote.price === undefined) {
    return <span className="text-slate-500 text-xs">Unavailable</span>;
  }
  return <span className="font-mono font-medium text-white">${quote.price.toFixed(2)}</span>;
}

function ChangeCell({ quote, loading }: { quote: QuoteData | undefined; loading: boolean }) {
  if (loading && !quote) {
    return <div className="h-4 w-14 bg-white/[0.08] rounded animate-pulse ml-auto" />;
  }
  if (!quote || !quote.success || quote.changePercent === undefined) {
    return <span className="text-slate-500 text-xs">—</span>;
  }
  const positive = quote.changePercent >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${positive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      <span aria-hidden="true">{positive ? '▲' : '▼'}</span>
      {positive ? '+' : ''}{quote.changePercent.toFixed(2)}%
    </span>
  );
}

function MarketCapCell({ row, quote }: { row: StockRow; quote: QuoteData | undefined }) {
  const value = quote?.success && quote.marketCap ? quote.marketCap : row.dbMarketCap;
  return <span className="text-slate-300">{formatUSD(value)}</span>;
}

function StockTable({
  rows,
  quotes,
  loading,
  variant = 'standard',
}: {
  rows: StockRow[] | IpoRow[];
  quotes: Record<string, QuoteData>;
  loading: boolean;
  variant?: 'standard' | 'ipo';
}) {
  if (rows.length === 0) {
    return <p className="text-slate-500 text-sm py-6 text-center">No companies matched this category yet.</p>;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="card overflow-hidden hidden md:block">
        <div className="overflow-x-auto data-scroll-mobile">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="bg-white/[0.06] border-b border-white/[0.06]">
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Company</th>
                {variant === 'ipo' && (
                  <>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">IPO Date</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Raised</th>
                  </>
                )}
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Price</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Change</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">90 days</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Market Cap</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Profile</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const quote = quotes[row.ticker];
                const ipo = variant === 'ipo' ? (row as IpoRow) : null;
                return (
                  <tr key={row.slug} className="border-b border-white/[0.06] hover:bg-white/[0.04] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">
                        <Link href={`/company-profiles/${row.slug}`} className="hover:underline">{row.name}</Link>
                      </div>
                      <div className="text-xs text-white/60 font-mono">
                        {row.exchange ? `${row.exchange}: ` : ''}{row.ticker}
                      </div>
                    </td>
                    {variant === 'ipo' && (
                      <>
                        <td className="py-3 px-4 text-sm text-slate-300">{fmtDate(ipo!.ipoDate)}</td>
                        <td className="py-3 px-4 text-sm text-slate-300">{ipo!.raised || '—'}</td>
                      </>
                    )}
                    <td className="py-3 px-4 text-right"><PriceCell quote={quote} loading={loading} /></td>
                    <td className="py-3 px-4 text-right"><ChangeCell quote={quote} loading={loading} /></td>
                    <td className="py-3 px-4 text-right"><Sparkline closes={row.history ?? null} /></td>
                    <td className="py-3 px-4 text-right"><MarketCapCell row={row} quote={quote} /></td>
                    <td className="py-3 px-4">
                      <Link href={`/company-profiles/${row.slug}`} className="text-xs text-cyan-400 hover:text-cyan-300">
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.map((row) => {
          const quote = quotes[row.ticker];
          const ipo = variant === 'ipo' ? (row as IpoRow) : null;
          return (
            <Link
              key={row.slug}
              href={`/company-profiles/${row.slug}`}
              className="card p-4 block active:scale-[0.99] transition-transform"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="font-semibold text-white text-sm truncate">{row.name}</div>
                  <div className="text-xs text-white/60 font-mono">{row.exchange ? `${row.exchange}: ` : ''}{row.ticker}</div>
                </div>
                <div className="text-right shrink-0">
                  <PriceCell quote={quote} loading={loading} />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <ChangeCell quote={quote} loading={loading} />
                <MarketCapCell row={row} quote={quote} />
              </div>
              {ipo && (
                <div className="mt-2 pt-2 border-t border-white/[0.06] text-xs text-slate-400">
                  IPO {fmtDate(ipo.ipoDate)} · Raised {ipo.raised || '—'}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}


// 90-day sparkline: pure SVG, colour by direction, word + shape via the title
// so the state never rides on colour alone. Null history → an honest dash.
function Sparkline({ closes }: { closes: number[] | null }) {
  if (!closes || closes.length < 5) return <span className="text-slate-600 text-xs" title="No price history from the quote provider">—</span>;
  const w = 88, h = 26, lo = Math.min(...closes), hi = Math.max(...closes), span = hi - lo || 1;
  const pts = closes.map((v, i) => `${((i / (closes.length - 1)) * (w - 2) + 1).toFixed(1)},${(h - 1 - ((v - lo) / span) * (h - 2)).toFixed(1)}`).join(' ');
  const up = closes[closes.length - 1] >= closes[0];
  const pct = Math.round(((closes[closes.length - 1] - closes[0]) / closes[0]) * 1000) / 10;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block align-middle" role="img" aria-label={`${up ? 'Up' : 'Down'} ${Math.abs(pct)}% over 90 days; range ${lo.toFixed(2)} to ${hi.toFixed(2)}`}>
      <title>{`${up ? '▲' : '▼'} ${Math.abs(pct)}% over 90 days · low ${lo.toFixed(2)} · high ${hi.toFixed(2)}`}</title>
      <polyline points={pts} fill="none" stroke={up ? 'var(--go)' : 'var(--crit)'} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function SpaceStocksTables({
  ipoClass,
  pureplay,
  primes,
  satelliteEO,
}: {
  ipoClass: IpoRow[];
  pureplay: StockRow[];
  primes: StockRow[];
  satelliteEO: StockRow[];
}) {
  const allTickers = Array.from(
    new Set([...ipoClass, ...pureplay, ...primes, ...satelliteEO].map((r) => r.ticker))
  );
  const etfTickers = SPACE_ETFS.map((e) => e.ticker);

  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [etfFilter, setEtfFilter] = useState<'all' | 'pure_space' | 'aerospace_defense'>('all');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stocks?tickers=${[...allTickers, ...etfTickers].join(',')}`);
      const data = await res.json();
      if (Array.isArray(data.stocks)) {
        const map: Record<string, QuoteData> = {};
        for (const s of data.stocks) {
          map[s.ticker] = s;
        }
        setQuotes(map);
      }
    } catch (error) {
      clientLogger.error('Failed to fetch space-stocks quotes', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  return (
    <PullToRefresh onRefresh={async () => { await fetchQuotes(); }}>
      <div>
        <div className="mb-4">
          <DataFreshnessBadge
            lastUpdated={lastUpdated}
            source="Yahoo Finance (delayed)"
            refreshInterval="on page load"
            onRefresh={() => fetchQuotes()}
          />
        </div>

        {ipoClass.length > 0 && (
          <section className="mb-10" aria-labelledby="ipo-class-heading">
            <h2 id="ipo-class-heading" className="text-xl font-semibold text-white mb-1 flex items-center gap-2">
              <span className="text-amber-400">🔔</span> IPO Class of 2025&ndash;26
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              Newly public space companies &mdash; the freshest tickers in the sector.
            </p>
            <StockTable rows={ipoClass} quotes={quotes} loading={loading} variant="ipo" />
          </section>
        )}

        <section className="mb-10" aria-labelledby="pureplay-heading">
          <h2 id="pureplay-heading" className="text-xl font-semibold text-white mb-1 flex items-center gap-2">
            <span className="text-cyan-400">🚀</span> Pure-Play Space Stocks
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Launch providers, satellite manufacturers, in-space infrastructure, and stations &mdash; companies whose core business is space.
          </p>
          <StockTable rows={pureplay} quotes={quotes} loading={loading} />
        </section>

        <section className="mb-10" aria-labelledby="primes-heading">
          <h2 id="primes-heading" className="text-xl font-semibold text-white mb-1 flex items-center gap-2">
            <span className="text-purple-400">🏛️</span> Primes &amp; Defense
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Legacy aerospace and defense primes with major national-security and civil space business lines.
          </p>
          <StockTable rows={primes} quotes={quotes} loading={loading} />
        </section>

        <section className="mb-10" aria-labelledby="eo-heading">
          <h2 id="eo-heading" className="text-xl font-semibold text-white mb-1 flex items-center gap-2">
            <span className="text-emerald-400">🛰️</span> Satellite Operators &amp; Earth Observation
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Satellite operators, geospatial intelligence, and Earth-observation constellations.
          </p>
          <StockTable rows={satelliteEO} quotes={quotes} loading={loading} />
        </section>

        <section className="mb-10" aria-labelledby="etf-heading">
          <h2 id="etf-heading" className="text-xl font-semibold text-white mb-1 flex items-center gap-2">
            <span className="text-purple-400">📊</span> Space ETFs &amp; Funds
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Diversified exposure to the sector via pure-play space ETFs and aerospace &amp; defense funds with significant space revenue.
          </p>

          <div className="flex gap-2 mb-4">
            {[
              { value: 'all' as const, label: 'All' },
              { value: 'pure_space' as const, label: 'Pure Space' },
              { value: 'aerospace_defense' as const, label: 'Aerospace & Defense' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setEtfFilter(tab.value)}
                className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                  etfFilter === tab.value
                    ? 'bg-white text-slate-900'
                    : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.08]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {SPACE_ETFS.filter((etf) => etfFilter === 'all' || etf.category === etfFilter).map((etf) => {
              const data = quotes[etf.ticker];
              const isPositive = (data?.changePercent ?? 0) >= 0;
              return (
                <div key={etf.ticker} className="card p-4 hover:border-white/15 transition-all relative">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      etf.category === 'pure_space' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {etf.category === 'pure_space' ? 'Pure Space' : 'A&D'}
                    </span>
                    {etf.leveraged && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">3x Leveraged</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-mono text-sm font-bold text-white/90">{etf.ticker}</div>
                    {data?.success ? (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {isPositive ? '+' : ''}{(data.changePercent ?? 0).toFixed(2)}%
                      </span>
                    ) : (
                      <div className="h-4 w-12 bg-white/[0.08] rounded animate-pulse" />
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mb-2 line-clamp-1">{etf.name}</div>
                  <div className="flex items-baseline gap-2 mb-2">
                    {data?.success ? (
                      <>
                        <span className="text-xl font-bold text-white">${(data.price ?? 0).toFixed(2)}</span>
                        <span className={`text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                          {isPositive ? '+' : ''}{(data.change ?? 0).toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <div className="h-6 w-16 bg-white/[0.08] rounded animate-pulse" />
                    )}
                  </div>
                  <div className="text-xs text-slate-500">ER: {etf.expenseRatio}%</div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </PullToRefresh>
  );
}
