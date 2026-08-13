'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { RESOURCES, RESOURCE_MAP } from '@/lib/game/resources';
import { RESOURCE_ASSETS } from '@/lib/game/assets';
import { formatMoney } from '@/lib/game/formulas';
import { useModalA11y } from './useModalA11y';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LivePrice {
  currentPrice: number;
  basePrice: number;
  effectivePrice: number;
  change: number;
  supply: number;
  available: number;
  supplyMultiplier: number;
}

interface Candle {
  t: string;   // ISO timestamp
  o: number;   // open
  h: number;   // high
  l: number;   // low
  c: number;   // close
  v: number;   // volume
  n: number;   // trade count
}

interface CorporationRow {
  id: string;
  companyName: string;
  title: string | null;
  netWorth: number;
  totalEarned: number;
  buildingCount: number;
  researchCount: number;
  serviceCount: number;
  locationsUnlocked: number;
  gameYear: number;
  lastSyncAt: string;
  allianceTag: string | null;
  allianceName: string | null;
  rank: number;
}

type IntelTab = 'market' | 'corporations' | 'flows';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MarketIntelligencePanel() {
  const [tab, setTab] = useState<IntelTab>('market');

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-white text-base font-bold flex items-center gap-2">
              <span className="text-cyan-400">⟁</span> Market Intelligence
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Real-time commodity prices, corporate standings, and supply flows. Data access is gameplay — invest in intelligence to compete.
            </p>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1">
          <TabButton active={tab === 'market'} onClick={() => setTab('market')}>
            📊 Markets
          </TabButton>
          <TabButton active={tab === 'corporations'} onClick={() => setTab('corporations')}>
            🏢 Corporations
          </TabButton>
          <TabButton active={tab === 'flows'} onClick={() => setTab('flows')}>
            🌐 Supply Flows
          </TabButton>
        </div>
      </div>

      {tab === 'market' && <MarketsTab />}
      {tab === 'corporations' && <CorporationsTab />}
      {tab === 'flows' && <SupplyFlowsTab />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Markets Tab ──────────────────────────────────────────────────────────────

function MarketsTab() {
  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/space-tycoon/market');
      if (res.ok) {
        const data = await res.json();
        setPrices(data.prices || {});
      }
    } catch {
      // Leave prices empty on failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const iv = setInterval(fetchPrices, 30_000);
    return () => clearInterval(iv);
  }, [fetchPrices]);

  if (loading && Object.keys(prices).length === 0) {
    return <div className="card p-8 text-center text-slate-500 text-sm">Loading markets…</div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {RESOURCES.map(r => {
          const p = prices[r.id];
          const change = p?.change ?? 0;
          const price = p?.effectivePrice ?? p?.currentPrice ?? r.baseMarketPrice;
          return (
            <button
              key={r.id}
              onClick={() => setSelectedResource(r.id)}
              className="card p-3 text-left hover:border-cyan-500/30 transition-colors group"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white/[0.04] shrink-0">
                  <Image src={RESOURCE_ASSETS[r.id] || RESOURCE_ASSETS.iron} alt="" fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-bold truncate">{r.name}</div>
                  <div className="text-slate-500 text-[10px] uppercase tracking-wide">{r.category || 'commodity'}</div>
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-cyan-300 font-mono font-bold text-base">{formatMoney(price)}</div>
                <div className={`text-xs font-mono font-bold ${change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                  {change > 0 ? '+' : ''}{change}%
                </div>
              </div>
              <div className="mt-2 h-10">
                <Sparkline resourceSlug={r.id} />
              </div>
              <div className="mt-1 text-[9px] text-slate-600 flex justify-between">
                <span>Supply: {(p?.available ?? 0).toLocaleString()}</span>
                <span className="text-cyan-500/70 opacity-0 group-hover:opacity-100 transition-opacity">Click for chart →</span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedResource && (
        <DeepDiveModal
          resourceSlug={selectedResource}
          livePrice={prices[selectedResource]}
          onClose={() => setSelectedResource(null)}
        />
      )}
    </>
  );
}

// ─── Sparkline (7d mini chart) ────────────────────────────────────────────────

function Sparkline({ resourceSlug }: { resourceSlug: string }) {
  const [candles, setCandles] = useState<Candle[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/space-tycoon/market/history?resourceSlug=${resourceSlug}&timeframe=1h&limit=168`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled && data) setCandles(data.candles || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [resourceSlug]);

  if (candles.length === 0) {
    return <div className="h-full flex items-center justify-center text-[9px] text-slate-700">— no history —</div>;
  }

  const data = candles.map(c => ({ t: c.t, p: c.c }));
  const first = data[0]?.p || 0;
  const last = data[data.length - 1]?.p || 0;
  const color = last >= first ? '#10b981' : '#ef4444';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sl-${resourceSlug}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="p" stroke={color} strokeWidth={1.5} fill={`url(#sl-${resourceSlug})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Deep-Dive Chart Modal ────────────────────────────────────────────────────

const TIMEFRAME_CONFIG = {
  '24h': { timeframe: '1h', limit: 24, label: '24 hours' },
  '7d':  { timeframe: '1h', limit: 168, label: '7 days' },
  '30d': { timeframe: '4h', limit: 180, label: '30 days' },
  '90d': { timeframe: '1d', limit: 90, label: '90 days' },
} as const;

type TimeframeKey = keyof typeof TIMEFRAME_CONFIG;

function DeepDiveModal({
  resourceSlug,
  livePrice,
  onClose,
}: {
  resourceSlug: string;
  livePrice: LivePrice | undefined;
  onClose: () => void;
}) {
  const [timeframe, setTimeframe] = useState<TimeframeKey>('7d');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);

  const resource = RESOURCE_MAP.get(resourceSlug as never);
  const config = TIMEFRAME_CONFIG[timeframe];

  useEffect(() => {
    setLoading(true);
    let cancelled = false;
    fetch(`/api/space-tycoon/market/history?resourceSlug=${resourceSlug}&timeframe=${config.timeframe}&limit=${config.limit}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled && data) setCandles(data.candles || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [resourceSlug, config.timeframe, config.limit]);

  const chartData = useMemo(() =>
    candles.map(c => ({
      t: new Date(c.t).getTime(),
      label: formatCandleLabel(c.t, timeframe),
      price: c.c,
      high: c.h,
      low: c.l,
      volume: c.v,
    })),
    [candles, timeframe],
  );

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const prices = chartData.map(c => c.price);
    const first = prices[0];
    const last = prices[prices.length - 1];
    const high = Math.max(...chartData.map(c => c.high));
    const low = Math.min(...chartData.map(c => c.low));
    const totalVol = chartData.reduce((sum, c) => sum + c.volume, 0);
    return {
      first, last, high, low, totalVol,
      change: last - first,
      changePct: first === 0 ? 0 : ((last - first) / first) * 100,
    };
  }, [chartData]);

  const modalRef = useModalA11y<HTMLDivElement>(onClose);
  if (!resource) return null;
  const titleId = `market-deepdive-${resourceSlug}`;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md game-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div ref={modalRef} tabIndex={-1} className="relative w-full max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden border border-cyan-500/30 flex flex-col game-modal-card" style={{ background: '#0a0a1a' }}>
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500" aria-hidden="true" />

        {/* Header */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/[0.04]">
                <Image src={RESOURCE_ASSETS[resourceSlug] || RESOURCE_ASSETS.iron} alt="" fill className="object-cover" />
              </div>
              <div>
                <h3 id={titleId} className="text-white text-lg font-bold">{resource.name}</h3>
                <p className="text-slate-500 text-xs">Commodity price intelligence</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label={`Close ${resource.name} price chart`}
              className="min-w-[44px] min-h-[44px] rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 flex items-center justify-center text-sm"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          {/* Current price strip */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Current" value={formatMoney(livePrice?.effectivePrice ?? livePrice?.currentPrice ?? resource.baseMarketPrice)} />
            <Stat label="Base" value={formatMoney(livePrice?.basePrice ?? resource.baseMarketPrice)} />
            <Stat
              label={config.label}
              value={stats ? `${stats.changePct >= 0 ? '+' : ''}${stats.changePct.toFixed(1)}%` : '—'}
              accent={stats ? (stats.changePct >= 0 ? 'emerald' : 'red') : undefined}
            />
            <Stat label="Supply" value={(livePrice?.available ?? 0).toLocaleString()} />
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="px-4 pt-3 flex gap-1.5">
          {(Object.keys(TIMEFRAME_CONFIG) as TimeframeKey[]).map(key => (
            <button
              key={key}
              onClick={() => setTimeframe(key)}
              className={`min-h-[38px] px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                timeframe === key ? 'bg-cyan-500 text-black' : 'bg-white/[0.04] text-slate-400 hover:text-white'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">Loading chart…</div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
              No price history yet. Candles are generated as trades happen.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 36 }}>
                    <XAxis
                      dataKey="label"
                      stroke="#475569"
                      style={{ fontSize: 10 }}
                      tickMargin={6}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke="#475569"
                      style={{ fontSize: 10 }}
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(v: number) => formatMoney(v)}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{ background: '#0a0a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                      labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                      itemStyle={{ color: '#22d3ee', fontSize: 11 }}
                      formatter={((v: number) => [formatMoney(v), 'Price']) as never}
                    />
                    {livePrice?.basePrice && (
                      <ReferenceLine y={livePrice.basePrice} stroke="#475569" strokeDasharray="3 3" label={{ value: 'Base', fill: '#475569', fontSize: 9, position: 'left' }} />
                    )}
                    <Line type="monotone" dataKey="price" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Volume bars */}
              <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 8, bottom: 0, left: 36 }}>
                    <XAxis dataKey="label" hide />
                    <YAxis stroke="#475569" style={{ fontSize: 9 }} width={40} tickFormatter={(v: number) => v.toLocaleString()} />
                    <Tooltip
                      contentStyle={{ background: '#0a0a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                      itemStyle={{ color: '#a78bfa', fontSize: 11 }}
                      formatter={((v: number) => [v.toLocaleString(), 'Volume']) as never}
                    />
                    <Bar dataKey="volume" fill="#8b5cf6" fillOpacity={0.5} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  <Stat label="High" value={formatMoney(stats.high)} />
                  <Stat label="Low" value={formatMoney(stats.low)} />
                  <Stat label="Volume" value={stats.totalVol.toLocaleString()} />
                  <Stat label="Trades" value={candles.reduce((sum, c) => sum + c.n, 0).toLocaleString()} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: 'emerald' | 'red' }) {
  const color = accent === 'emerald' ? 'text-emerald-400' : accent === 'red' ? 'text-red-400' : 'text-cyan-300';
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2">
      <div className="text-[9px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`font-mono text-sm font-bold ${color}`}>{value}</div>
    </div>
  );
}

function formatCandleLabel(iso: string, timeframe: TimeframeKey): string {
  const d = new Date(iso);
  if (timeframe === '24h') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (timeframe === '7d')  return `${d.toLocaleDateString([], { month: 'numeric', day: 'numeric' })} ${d.getHours().toString().padStart(2, '0')}:00`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Corporations Tab ─────────────────────────────────────────────────────────

function CorporationsTab() {
  const [corps, setCorps] = useState<CorporationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'netWorth' | 'totalEarned' | 'buildingCount' | 'researchCount'>('netWorth');
  const [selectedCorp, setSelectedCorp] = useState<CorporationRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/space-tycoon/leaderboard?sort=${sort}&limit=50`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data) return;
        const rows = (data.leaderboard || data.profiles || []).map((p: any, i: number) => ({
          id: p.id,
          companyName: p.companyName || 'Unnamed Corporation',
          title: p.title,
          netWorth: p.netWorth || 0,
          totalEarned: p.totalEarned || 0,
          buildingCount: p.buildingCount || 0,
          researchCount: p.researchCount || 0,
          serviceCount: p.serviceCount || 0,
          locationsUnlocked: p.locationsUnlocked || 0,
          gameYear: p.gameYear || 2150,
          lastSyncAt: p.lastSyncAt,
          allianceTag: p.allianceMembership?.alliance?.tag || null,
          allianceName: p.allianceMembership?.alliance?.name || null,
          rank: i + 1,
        }));
        setCorps(rows);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sort]);

  return (
    <>
      <div className="card p-3">
        <div className="flex items-center gap-2 mb-3 text-[10px]">
          <span className="text-slate-500 mr-1">Sort by:</span>
          {([
            { key: 'netWorth',      label: 'Net Worth' },
            { key: 'totalEarned',   label: 'Total Earned' },
            { key: 'buildingCount', label: 'Buildings' },
            { key: 'researchCount', label: 'Research' },
          ] as const).map(o => (
            <button
              key={o.key}
              onClick={() => setSort(o.key)}
              className={`min-h-[38px] px-2 py-1 rounded transition-colors ${
                sort === o.key ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/[0.04] text-slate-500 hover:text-white'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500 text-sm">Scanning the known corporate landscape…</div>
        ) : corps.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">No corporations registered yet.</div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {corps.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCorp(c)}
                className="w-full py-2.5 px-2 flex items-center gap-3 text-left hover:bg-white/[0.03] rounded transition-colors"
              >
                <div className={`w-8 font-mono text-xs font-bold text-right ${
                  c.rank === 1 ? 'text-amber-400' : c.rank === 2 ? 'text-slate-300' : c.rank === 3 ? 'text-orange-400' : 'text-slate-500'
                }`}>
                  {c.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-bold truncate">{c.companyName}</span>
                    {c.allianceTag && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                        [{c.allianceTag}]
                      </span>
                    )}
                    {c.title && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 italic">
                        {c.title}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 flex gap-2 mt-0.5">
                    <span>🏗️ {c.buildingCount}</span>
                    <span>🔬 {c.researchCount}</span>
                    <span>💼 {c.serviceCount}</span>
                    <span>🗺️ {c.locationsUnlocked}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-cyan-300 font-mono font-bold text-sm">{formatMoney(c.netWorth)}</div>
                  <div className="text-[9px] text-slate-500">net worth</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedCorp && <CorporationDetail corp={selectedCorp} onClose={() => setSelectedCorp(null)} />}
    </>
  );
}

function CorporationDetail({ corp, onClose }: { corp: CorporationRow; onClose: () => void }) {
  const modalRef = useModalA11y<HTMLDivElement>(onClose);
  const titleId = `corp-detail-${corp.id}`;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      <div ref={modalRef} tabIndex={-1} className="relative w-full max-w-xl rounded-2xl overflow-hidden border border-cyan-500/30" style={{ background: '#0a0a1a' }}>
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500" aria-hidden="true" />

        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Rank #{corp.rank}</div>
              <h3 id={titleId} className="text-white text-xl font-bold mt-0.5">{corp.companyName}</h3>
              {corp.title && <p className="text-amber-300 text-sm italic">{corp.title}</p>}
              {corp.allianceName && (
                <p className="text-purple-300 text-xs mt-1">
                  Alliance: <span className="font-mono">[{corp.allianceTag}]</span> {corp.allianceName}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label={`Close ${corp.companyName} profile`}
              className="min-w-[44px] min-h-[44px] rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 flex items-center justify-center text-sm shrink-0"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            <Stat label="Net Worth" value={formatMoney(corp.netWorth)} />
            <Stat label="Total Earned" value={formatMoney(corp.totalEarned)} />
            <Stat label="Game Year" value={corp.gameYear.toString()} />
            <Stat label="Buildings" value={corp.buildingCount.toString()} />
            <Stat label="Research" value={corp.researchCount.toString()} />
            <Stat label="Services" value={corp.serviceCount.toString()} />
            <Stat label="Locations" value={`${corp.locationsUnlocked} / 11+`} />
            <Stat label="Last Active" value={relativeTime(corp.lastSyncAt)} />
            <Stat label="Alliance" value={corp.allianceTag || '—'} />
          </div>

          <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Public Intelligence</div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Net worth and infrastructure counts are published voluntarily in accordance with Accord reporting standards.
              Deeper intelligence — production rates, cash reserves, research pipelines, commander rosters — must be earned
              through market observation, espionage contracts, or paid intelligence reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  if (!iso) return '—';
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(delta / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Supply Flows Tab ─────────────────────────────────────────────────────────

function SupplyFlowsTab() {
  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/space-tycoon/market')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPrices(data.prices || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card p-8 text-center text-slate-500 text-sm">Loading flows…</div>;

  // Categorize resources by price-relative-to-base to show scarcity pressure
  const resources = RESOURCES.map(r => {
    const p = prices[r.id];
    const ratio = p?.basePrice ? (p.effectivePrice || p.currentPrice) / p.basePrice : 1;
    return { ...r, ratio, supply: p?.available ?? 0, effectivePrice: p?.effectivePrice ?? p?.currentPrice ?? r.baseMarketPrice };
  }).sort((a, b) => b.ratio - a.ratio);

  const overbought = resources.filter(r => r.ratio > 1.1);
  const stable     = resources.filter(r => r.ratio >= 0.9 && r.ratio <= 1.1);
  const undersold  = resources.filter(r => r.ratio < 0.9);

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="text-white text-sm font-bold mb-1">Scarcity Pressure</div>
        <p className="text-slate-500 text-[11px] mb-3">
          Resources trading above their base price are in short supply — mine and sell aggressively.
          Resources below base are oversupplied — buy if you need them; avoid producing more.
        </p>

        <FlowBucket
          title="Short Supply"
          subtitle="price > +10% above base"
          color="emerald"
          resources={overbought}
          icon="📈"
        />
        <FlowBucket
          title="Balanced"
          subtitle="within ±10% of base"
          color="slate"
          resources={stable}
          icon="⚖️"
        />
        <FlowBucket
          title="Oversupplied"
          subtitle="price < -10% below base"
          color="red"
          resources={undersold}
          icon="📉"
        />
      </div>
    </div>
  );
}

function FlowBucket({
  title, subtitle, color, resources, icon,
}: {
  title: string;
  subtitle: string;
  color: 'emerald' | 'slate' | 'red';
  resources: { id: string; name: string; ratio: number; effectivePrice: number; supply: number }[];
  icon: string;
}) {
  const accent = color === 'emerald' ? 'text-emerald-300 border-emerald-500/30' : color === 'red' ? 'text-red-300 border-red-500/30' : 'text-slate-300 border-slate-500/30';
  return (
    <div className={`rounded-lg border ${accent} bg-white/[0.02] p-2.5 mb-2`}>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="flex items-baseline gap-2">
          <span>{icon}</span>
          <span className="text-sm font-bold">{title}</span>
          <span className="text-[10px] text-slate-500">{subtitle}</span>
        </div>
        <span className="text-[10px] text-slate-500">{resources.length} {resources.length === 1 ? 'resource' : 'resources'}</span>
      </div>
      {resources.length === 0 ? (
        <div className="text-[10px] text-slate-600 italic">(none)</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {resources.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-[10px] py-1 px-1.5 rounded bg-black/20">
              <span className="text-slate-300 truncate">{r.name}</span>
              <span className={`font-mono font-bold shrink-0 ${r.ratio > 1.1 ? 'text-emerald-400' : r.ratio < 0.9 ? 'text-red-400' : 'text-slate-400'}`}>
                {((r.ratio - 1) * 100 >= 0 ? '+' : '')}{((r.ratio - 1) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
