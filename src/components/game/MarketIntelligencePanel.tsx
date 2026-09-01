'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { RESOURCES, RESOURCE_MAP } from '@/lib/game/resources';
import type { ResourceId } from '@/lib/game/resources';
import { RESOURCE_ASSETS } from '@/lib/game/assets';
import { formatMoney } from '@/lib/game/formulas';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { CATEGORY_LABELS } from '@/lib/game/demand-pools';
import { useModalA11y } from './useModalA11y';
import { ConsolePanel } from './chrome';
import GameIcon from './GameIcon';
import type { IconName } from '@/lib/game/icons';

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

type IntelTab = 'market' | 'corporations' | 'flows' | 'share' | 'demand' | 'npc' | 'offense';

interface MarketIntelligencePanelProps {
  /** Lever-discoverability pass (2026-09): the order book's selected resource,
   *  mirrored by the Markets hub so the NPC demand console filters to it. */
  selectedResource?: string | null;
  /** Jump to Spot & Orders with a resource preselected. */
  onOpenOrderBook?: (slug: string) => void;
  /** Open the order book's price-campaign console for a resource (the hub is
   *  the home of the declare form; Analytics keeps this thin link). */
  onDeclareCampaign?: (slug: string) => void;
}

// GET /api/space-tycoon/npc-forecast row shape (npc-forecast.ts NpcForecastItem).
interface NpcForecastItemView {
  npcId: string;
  npcName: string;
  factionId?: string;
  resourceSlug: string;
  side: 'buy' | 'sell';
  quantity: number;
  priceCap?: number;
  windowStartIso: string;
  windowEndIso: string;
  confidence: 'scheduled' | 'projected';
  source: 'industry' | 'drive' | 'pool';
  unit: 'units' | 'usd';
  locationId?: string;
  category?: string;
  note?: string;
}

interface NpcForecastView {
  generatedAt: string;
  horizonHours: number;
  scale: number;
  active30d: number;
  items: NpcForecastItemView[];
  byResource: Record<string, { buy: number; sell: number }>;
}

// Wave E4 (Finite Demand Pools — docs/ECONOMY_PVP_2026-08.md §E4): the
// demand map's row shape, as served by GET /api/space-tycoon/demand-pools.
interface DemandPoolRowView {
  locationId: string;
  category: string;
  mult: number;
  dTotal: number;
  dNpc: number;
  cSupply: number;
  playerShare: number;
  topShares: number[];
  supplierCount: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MarketIntelligencePanel({ selectedResource, onOpenOrderBook, onDeclareCampaign }: MarketIntelligencePanelProps = {}) {
  const [tab, setTab] = useState<IntelTab>('market');

  return (
    <div className="space-y-4">
      <ConsolePanel
        title="Market Intelligence"
        icon="activity"
        subtitle="Real-time commodity prices, corporate standings, and supply flows. Data access is gameplay — invest in intelligence to compete."
      >
        {/* Tab nav */}
        <div className="game-tab-bar flex gap-1 overflow-x-auto">
          <TabButton active={tab === 'market'} onClick={() => setTab('market')} icon="market">
            Markets
          </TabButton>
          <TabButton active={tab === 'corporations'} onClick={() => setTab('corporations')} icon="alliance">
            Corporations
          </TabButton>
          <TabButton active={tab === 'flows'} onClick={() => setTab('flows')} icon="globe">
            Supply Flows
          </TabButton>
          <TabButton active={tab === 'share'} onClick={() => setTab('share')} icon="leaderboard">
            Market Share
          </TabButton>
          <TabButton active={tab === 'demand'} onClick={() => setTab('demand')} icon="services">
            Demand
          </TabButton>
          <TabButton active={tab === 'npc'} onClick={() => setTab('npc')} icon="npc">
            NPC Demand
          </TabButton>
          <TabButton active={tab === 'offense'} onClick={() => setTab('offense')} icon="trending-down">
            Econ Warfare
          </TabButton>
        </div>
      </ConsolePanel>

      {tab === 'market' && <MarketsTab />}
      {tab === 'corporations' && <CorporationsTab />}
      {tab === 'flows' && <SupplyFlowsTab />}
      {tab === 'share' && <MarketShareTab />}
      {tab === 'demand' && <DemandMapTab />}
      {tab === 'npc' && <NpcForecastTab selectedResource={selectedResource} onOpenOrderBook={onOpenOrderBook} />}
      {tab === 'offense' && <EconWarfareTab onDeclareCampaign={onDeclareCampaign} />}
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: IconName; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
        active ? 'game-tab-active text-cyan-300' : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:text-white'
      }`}
    >
      <GameIcon name={icon} size={13} />
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
              <div className="mt-1 text-[10px] text-slate-600 flex justify-between">
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
    return <div className="h-full flex items-center justify-center text-[10px] text-slate-700">— no history —</div>;
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
              <GameIcon name="close" size={16} />
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
                      <ReferenceLine y={livePrice.basePrice} stroke="#475569" strokeDasharray="3 3" label={{ value: 'Base', fill: '#475569', fontSize: 10, position: 'left' }} />
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
                    <YAxis stroke="#475569" style={{ fontSize: 10 }} width={40} tickFormatter={(v: number) => v.toLocaleString()} />
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
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
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
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                        [{c.allianceTag}]
                      </span>
                    )}
                    {c.title && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 italic">
                        {c.title}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 flex gap-2.5 mt-0.5">
                    <span className="inline-flex items-center gap-0.5"><GameIcon name="build" size={11} /> {c.buildingCount}</span>
                    <span className="inline-flex items-center gap-0.5"><GameIcon name="research" size={11} /> {c.researchCount}</span>
                    <span className="inline-flex items-center gap-0.5"><GameIcon name="services" size={11} /> {c.serviceCount}</span>
                    <span className="inline-flex items-center gap-0.5"><GameIcon name="map" size={11} /> {c.locationsUnlocked}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-cyan-300 font-mono font-bold text-sm">{formatMoney(c.netWorth)}</div>
                  <div className="text-[10px] text-slate-500">net worth</div>
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
              <GameIcon name="close" size={16} />
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
          icon="trending-up"
        />
        <FlowBucket
          title="Balanced"
          subtitle="within ±10% of base"
          color="slate"
          resources={stable}
          icon="balance"
        />
        <FlowBucket
          title="Oversupplied"
          subtitle="price < -10% below base"
          color="red"
          resources={undersold}
          icon="trending-down"
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
  icon: IconName;
}) {
  const accent = color === 'emerald' ? 'text-emerald-300 border-emerald-500/30' : color === 'red' ? 'text-red-300 border-red-500/30' : 'text-slate-300 border-slate-500/30';
  return (
    <div className={`rounded-lg border ${accent} bg-white/[0.02] p-2.5 mb-2`}>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="flex items-baseline gap-2">
          <GameIcon name={icon} size={13} />
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

// ─── Market Share Tab ───────────────────────────────────────────────────────
// Wave E6 (docs/ECONOMY_PVP_2026-08.md §E6) — closes §1d: "No market-share
// telemetry of any kind exists." Free tier (always visible): top-5 traders
// overall + per traded resource. Earned tier (active `market_spy`
// espionage intel): full participant table — never free, never perfect.

interface ShareEntry {
  profileId: string;
  companyName: string | null;
  isNpc: boolean;
  totalVolume: number;
  totalValue: number;
  sharePct: number;
}

interface OverallShareResponse {
  earnedTier: boolean;
  windowDays: number;
  totalTradedValue: number;
  participantCount: number;
  entries: ShareEntry[];
  full: boolean;
}

interface ResourceTopReport {
  resourceSlug: string;
  totalTradedValue: number;
  entries: ShareEntry[];
}

function MarketShareTab() {
  const [overall, setOverall] = useState<OverallShareResponse | null>(null);
  const [byResource, setByResource] = useState<ResourceTopReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/space-tycoon/market/share').then(r => r.ok ? r.json() : null),
      fetch('/api/space-tycoon/market/share?all=1').then(r => r.ok ? r.json() : null),
    ]).then(([overallData, allData]) => {
      if (cancelled) return;
      if (overallData) setOverall(overallData);
      if (allData?.resources) setByResource(allData.resources);
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="card p-8 text-center text-slate-500 text-sm">Loading market share…</div>;

  const hasActivity = (overall?.totalTradedValue ?? 0) > 0;

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="text-white text-sm font-bold flex items-center gap-1.5">
            <GameIcon name="leaderboard" size={14} /> Overall Trade Leaders
          </div>
          <span className="text-[10px] text-slate-500">{overall?.windowDays ?? 30}-day window</span>
        </div>
        <p className="text-slate-500 text-[11px] mb-3">
          Ranked by traded value (buy + sell) across the shared order book, NPC Market Maker included — data
          access is gameplay. Top 5 are always public; the full table unlocks with an active Market Reconnaissance
          espionage report.
        </p>

        {!hasActivity ? (
          <div className="text-[11px] text-slate-600 italic py-4 text-center">
            No trades executed on the shared order book yet in this window. Be the first mover.
          </div>
        ) : (
          <ShareTable entries={overall?.entries ?? []} />
        )}

        {overall && !overall.full && hasActivity && (
          <p className="mt-2 text-[10px] text-purple-300/80 flex items-center gap-1">
            <GameIcon name="target" size={11} /> Full participant table + rival standing-order demand: earned via
            a successful Market Reconnaissance espionage report (Espionage panel).
          </p>
        )}
      </div>

      {byResource.length > 0 && (
        <div className="card p-3">
          <div className="text-white text-sm font-bold mb-1 flex items-center gap-1.5">
            <GameIcon name="market" size={14} /> Per-Resource Leaders
          </div>
          <p className="text-slate-500 text-[11px] mb-3">Top 5 traders in each resource with activity this window.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {byResource.map((r) => {
              const def = RESOURCE_MAP.get(r.resourceSlug as ResourceId);
              const leader = r.entries[0];
              return (
                <div key={r.resourceSlug} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-300 font-medium">{def?.name ?? r.resourceSlug}</span>
                    <span className="text-slate-500">{formatMoney(r.totalTradedValue)} traded</span>
                  </div>
                  {leader && (
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`truncate ${leader.isNpc ? 'text-slate-500 italic' : 'text-cyan-300'}`}>
                        {leader.companyName ?? 'Unknown'}
                      </span>
                      <span className="font-mono font-bold text-emerald-400 shrink-0">{leader.sharePct.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ShareTable({ entries }: { entries: ShareEntry[] }) {
  if (entries.length === 0) {
    return <div className="text-[11px] text-slate-600 italic py-2 text-center">No participants yet.</div>;
  }
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-[11px]" role="table" aria-label="Market share leaderboard">
        <thead>
          <tr className="text-slate-500 text-left">
            <th scope="col" className="px-1 py-1 font-medium">#</th>
            <th scope="col" className="px-1 py-1 font-medium">Corporation</th>
            <th scope="col" className="px-1 py-1 font-medium text-right">Volume</th>
            <th scope="col" className="px-1 py-1 font-medium text-right">Value</th>
            <th scope="col" className="px-1 py-1 font-medium text-right">Share</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={e.profileId} className="border-t border-white/[0.05]">
              <td className="px-1 py-1.5 text-slate-500">{i + 1}</td>
              <td className={`px-1 py-1.5 truncate max-w-[140px] ${e.isNpc ? 'text-slate-500 italic' : 'text-white'}`}>
                {e.companyName ?? 'Unknown'}
              </td>
              <td className="px-1 py-1.5 text-right font-mono text-slate-300">{e.totalVolume.toLocaleString()}</td>
              <td className="px-1 py-1.5 text-right font-mono text-slate-300">{formatMoney(e.totalValue)}</td>
              <td className="px-1 py-1.5 text-right font-mono font-bold text-emerald-400">{e.sharePct.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Demand Map Tab (Wave E4 — Finite Demand Pools) ──────────────────────────
// docs/ECONOMY_PVP_2026-08.md §E4 visibility: pool size, saturation, YOUR
// share, and anonymized competitor pressure per (location, category) market.
// Mobile-first semantic table (screen-reader order first, heat second);
// saturation state is always conveyed by TEXT + numbers, never color alone
// (accessibility canon).

function demandStatus(mult: number, dTotal: number, cSupply: number): { label: string; cls: string } {
  if (dTotal <= 0) return { label: 'No market', cls: 'text-slate-500' };
  if (cSupply > dTotal) {
    const pct = Math.round((1 - mult) * 100);
    return { label: `Saturated −${pct}%`, cls: 'text-amber-300' };
  }
  if (mult > 1.005) {
    const pct = Math.round((mult - 1) * 100);
    return { label: `Undersupplied +${pct}%`, cls: 'text-cyan-300' };
  }
  return { label: 'Balanced', cls: 'text-slate-300' };
}

function DemandMapTab() {
  const [pools, setPools] = useState<DemandPoolRowView[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/space-tycoon/demand-pools')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data) return;
        setPools(Array.isArray(data.pools) ? data.pools : []);
        setLoggedIn(!!data.loggedIn);
        setLastUpdatedAt(typeof data.lastUpdatedAt === 'number' ? data.lastUpdatedAt : null);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const byLocation = useMemo(() => {
    const m = new Map<string, DemandPoolRowView[]>();
    for (const p of pools) {
      const list = m.get(p.locationId) || [];
      list.push(p);
      m.set(p.locationId, list);
    }
    m.forEach(list => list.sort((a: DemandPoolRowView, b: DemandPoolRowView) => b.dTotal - a.dTotal));
    // Order locations by total pool size, biggest markets first.
    const total = (rows: DemandPoolRowView[]) => rows.reduce((s, p) => s + p.dTotal, 0);
    return Array.from(m.entries()).sort((a, b) => total(b[1]) - total(a[1]));
  }, [pools]);

  if (loading) return <div className="card p-8 text-center text-slate-500 text-sm">Loading demand map…</div>;

  if (pools.length === 0) {
    return (
      <div className="card p-8 text-center text-slate-500 text-sm">
        Demand pools have not been computed yet — the hourly market survey runs soon.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
          <div className="text-white text-sm font-bold flex items-center gap-1.5">
            <GameIcon name="services" size={14} /> Service Demand Map
          </div>
          {lastUpdatedAt && (
            <span className="text-[10px] text-slate-500">
              Surveyed {new Date(lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <p className="text-slate-500 text-[11px]">
          Every service market has a finite demand pool per location. Suppliers split the pool by capacity
          share: saturated markets pay each supplier less (competitors take customers), underserved locations
          pay up to +25%. Top supplier shares are anonymized — deeper intel is earned, never free.
          {!loggedIn && ' Sign in and sync your game to see your own market shares.'}
        </p>
      </div>

      {byLocation.map(([locationId, rows]) => {
        const locName = LOCATION_MAP.get(locationId)?.name || locationId.replace(/_/g, ' ');
        return (
          <div key={locationId} className="card p-3">
            <div className="text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">{locName}</div>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[11px]" role="table" aria-label={`Demand pools at ${locName}`}>
                <thead>
                  <tr className="text-slate-500 text-left">
                    <th scope="col" className="px-1 py-1 font-medium">Market</th>
                    <th scope="col" className="px-1 py-1 font-medium text-right">Pool /mo</th>
                    <th scope="col" className="px-1 py-1 font-medium text-right">Supply /mo</th>
                    <th scope="col" className="px-1 py-1 font-medium text-right">Payout</th>
                    <th scope="col" className="px-1 py-1 font-medium">Status</th>
                    <th scope="col" className="px-1 py-1 font-medium text-right">Suppliers</th>
                    <th scope="col" className="px-1 py-1 font-medium text-right">Top shares</th>
                    {loggedIn && <th scope="col" className="px-1 py-1 font-medium text-right">Your share</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(p => {
                    const status = demandStatus(p.mult, p.dTotal, p.cSupply);
                    const label = (CATEGORY_LABELS as Record<string, string>)[p.category] || p.category;
                    return (
                      <tr key={`${p.locationId}:${p.category}`} className="border-t border-white/[0.05]">
                        <td className="px-1 py-1.5 text-white">{label}</td>
                        <td className="px-1 py-1.5 text-right font-mono text-slate-300">{formatMoney(p.dTotal)}</td>
                        <td className="px-1 py-1.5 text-right font-mono text-slate-300">{formatMoney(p.cSupply)}</td>
                        <td className={`px-1 py-1.5 text-right font-mono font-bold ${status.cls}`}>{Math.round(p.mult * 100)}%</td>
                        <td className={`px-1 py-1.5 whitespace-nowrap ${status.cls}`}>{status.label}</td>
                        <td className="px-1 py-1.5 text-right font-mono text-slate-400">{p.supplierCount}</td>
                        <td className="px-1 py-1.5 text-right font-mono text-slate-400 whitespace-nowrap">
                          {p.topShares.length > 0 ? p.topShares.map(s => `${Math.round(s * 100)}%`).join(' · ') : '—'}
                        </td>
                        {loggedIn && (
                          <td className="px-1 py-1.5 text-right font-mono text-emerald-400">
                            {p.playerShare > 0 ? `${Math.round(p.playerShare * 100)}%` : '—'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── NPC Demand Tab (published NPC forecast, 2026-09) ────────────────────────
// CLAUDE.md "NPC economic backdrop": "NPC demand is visible and forecastable.
// Major NPC contracts, faction procurement drives, and scheduled
// infrastructure projects publish ahead of time — players can plan around
// them." GET /api/space-tycoon/npc-forecast publishes exactly what the hourly
// NPC industry tick will do (same helpers, parity-tested), every open faction
// procurement drive with its price cap, and the next-24h service demand
// floor per market. Confidence is a TEXT pill, never colour alone.

const NPC_FORECAST_ALL = '__all__';

function formatWindow(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const fmt = (d: Date) => d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `${fmt(s)} → ${fmt(e)}`;
}

function NpcForecastTab({ selectedResource, onOpenOrderBook }: { selectedResource?: string | null; onOpenOrderBook?: (slug: string) => void }) {
  const [forecast, setForecast] = useState<NpcForecastView | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>(selectedResource || NPC_FORECAST_ALL);
  const [showPools, setShowPools] = useState(false);

  // Stay in step with the order book's selection while it changes.
  useEffect(() => { if (selectedResource) setFilter(selectedResource); }, [selectedResource]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/space-tycoon/npc-forecast')
      .then(r => (r.ok ? r.json() : null))
      .then((d: NpcForecastView | null) => { if (!cancelled && d && Array.isArray(d.items)) setForecast(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const resourcesPresent = useMemo(() => {
    const set = new Set<string>();
    for (const it of forecast?.items || []) if (it.unit === 'units') set.add(it.resourceSlug);
    return RESOURCES.filter(r => set.has(r.id));
  }, [forecast]);

  const unitItems = useMemo(() => {
    const rows = (forecast?.items || []).filter(it => it.unit === 'units');
    const filtered = filter === NPC_FORECAST_ALL ? rows : rows.filter(it => it.resourceSlug === filter);
    return [...filtered].sort((a, b) => {
      if (a.source !== b.source) return a.source === 'drive' ? -1 : 1;
      if (a.windowEndIso !== b.windowEndIso) return a.windowEndIso < b.windowEndIso ? -1 : 1;
      return b.quantity - a.quantity;
    });
  }, [forecast, filter]);

  const poolRows = useMemo(() => (forecast?.items || []).filter(it => it.unit === 'usd'), [forecast]);
  const totals = filter !== NPC_FORECAST_ALL ? forecast?.byResource[filter] : null;

  if (loading) return <div className="card p-8 text-center text-slate-500 text-sm">Loading the NPC demand schedule…</div>;
  if (!forecast) {
    return <div className="card p-8 text-center text-slate-500 text-sm">The NPC demand schedule is unavailable right now — try again in a minute.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
          <div className="text-white text-sm font-bold flex items-center gap-1.5">
            <GameIcon name="npc" size={14} /> Scheduled NPC demand — next {forecast.horizonHours}h
          </div>
          <span className="text-[10px] text-slate-500">
            Published {new Date(forecast.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · NPC scale {Math.round(forecast.scale * 100)}%
          </span>
        </div>
        <p className="text-slate-500 text-[11px]">
          What the five NPC industrial corporations will bid for and list, and every open faction procurement drive
          with its price cap — published ahead of time so you can plan production around it. These are the same
          numbers the hourly tick executes, not estimates of them; &ldquo;projected&rdquo; rows still depend on the
          corporation&apos;s stock, treasury and player demand.
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <label className="text-[10px] text-slate-400 uppercase tracking-wider" htmlFor="npc-forecast-filter">Resource</label>
          <select
            id="npc-forecast-filter"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="min-h-[44px] bg-slate-900 border border-white/[0.1] rounded-md px-2 text-xs text-slate-200"
          >
            <option value={NPC_FORECAST_ALL}>All resources</option>
            {resourcesPresent.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
            {filter !== NPC_FORECAST_ALL && !resourcesPresent.some(r => r.id === filter) && (
              <option value={filter}>{RESOURCE_MAP.get(filter as ResourceId)?.name || filter}</option>
            )}
          </select>
          {filter !== NPC_FORECAST_ALL && (
            <span className="text-[11px] text-purple-300/90">
              NPC demand next {forecast.horizonHours}h: buy {(totals?.buy || 0).toLocaleString()} / sell {(totals?.sell || 0).toLocaleString()}
            </span>
          )}
          {filter !== NPC_FORECAST_ALL && onOpenOrderBook && (
            <button
              type="button"
              onClick={() => onOpenOrderBook(filter)}
              className="min-h-[44px] px-2.5 rounded-md text-[10px] font-bold border border-white/15 text-slate-200 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              Open order book →
            </button>
          )}
        </div>
      </div>

      <div className="card p-3">
        {unitItems.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">
            {filter === NPC_FORECAST_ALL
              ? 'No NPC purchases or listings are scheduled in this window.'
              : `No NPC purchases or listings are scheduled for ${RESOURCE_MAP.get(filter as ResourceId)?.name || filter} in this window.`}
          </p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[11px]" role="table" aria-label="Scheduled NPC demand">
              <thead>
                <tr className="text-slate-500 text-left">
                  <th scope="col" className="px-1 py-1 font-medium">Window</th>
                  <th scope="col" className="px-1 py-1 font-medium">NPC</th>
                  <th scope="col" className="px-1 py-1 font-medium">Resource</th>
                  <th scope="col" className="px-1 py-1 font-medium">Side</th>
                  <th scope="col" className="px-1 py-1 font-medium text-right">Qty</th>
                  <th scope="col" className="px-1 py-1 font-medium text-right">Price cap</th>
                  <th scope="col" className="px-1 py-1 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {unitItems.map((it, i) => {
                  const def = RESOURCE_MAP.get(it.resourceSlug as ResourceId);
                  return (
                    <tr key={`${it.npcId}:${it.resourceSlug}:${it.side}:${i}`} className="border-t border-white/[0.05]" title={it.note}>
                      <td className="px-1 py-1.5 text-slate-400 whitespace-nowrap">{formatWindow(it.windowStartIso, it.windowEndIso)}</td>
                      <td className="px-1 py-1.5 text-white whitespace-nowrap">
                        {it.npcName}
                        {it.source === 'drive' && <span className="ml-1 text-[9px] uppercase tracking-wider text-slate-500">drive</span>}
                      </td>
                      <td className="px-1 py-1.5 text-slate-200 whitespace-nowrap">
                        {onOpenOrderBook ? (
                          <button
                            type="button"
                            onClick={() => onOpenOrderBook(it.resourceSlug)}
                            className="underline decoration-dotted underline-offset-2 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
                            aria-label={`Open the order book for ${def?.name || it.resourceSlug}`}
                          >
                            {def?.name || it.resourceSlug}
                          </button>
                        ) : (def?.name || it.resourceSlug)}
                      </td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        {/* Side as a literal word — never colour alone. */}
                        <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${it.side === 'buy' ? 'border-emerald-500/40 text-emerald-300' : 'border-red-500/40 text-red-300'}`}>
                          {it.side === 'buy' ? 'Buys' : 'Sells'}
                        </span>
                      </td>
                      <td className="px-1 py-1.5 text-right font-mono text-slate-200">{it.quantity.toLocaleString()}</td>
                      <td className="px-1 py-1.5 text-right font-mono text-slate-300">{it.priceCap ? formatMoney(it.priceCap) : '—'}</td>
                      <td className="px-1 py-1.5 whitespace-nowrap">
                        <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border border-white/15 text-slate-300">
                          {it.confidence === 'scheduled' ? 'Scheduled' : 'Projected'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {poolRows.length > 0 && (
        <div className="card p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-white text-xs font-bold flex items-center gap-1.5">
              <GameIcon name="services" size={13} /> Service demand floor — next 24h
            </div>
            <button
              type="button"
              onClick={() => setShowPools(v => !v)}
              aria-expanded={showPools}
              aria-controls="npc-pool-floor-table"
              className="min-h-[44px] px-2 text-[10px] uppercase tracking-wider text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
            >
              {showPools ? 'Hide' : `Show ${poolRows.length} markets`}
            </button>
          </div>
          <p className="text-slate-500 text-[11px] mt-1">
            Dollars of NPC-backdrop demand each service market will pay out over the next day (authored floor ×
            population scale × season bias). It recedes as the server fills up — a floor, never a ceiling.
          </p>
          <div id="npc-pool-floor-table" hidden={!showPools} className="overflow-x-auto -mx-1 mt-2">
            <table className="w-full text-[11px]" role="table" aria-label="NPC service demand floor, next 24 hours">
              <thead>
                <tr className="text-slate-500 text-left">
                  <th scope="col" className="px-1 py-1 font-medium">Location</th>
                  <th scope="col" className="px-1 py-1 font-medium">Market</th>
                  <th scope="col" className="px-1 py-1 font-medium text-right">Demand /24h</th>
                </tr>
              </thead>
              <tbody>
                {poolRows.map(it => (
                  <tr key={it.npcId} className="border-t border-white/[0.05]">
                    <td className="px-1 py-1.5 text-white">{LOCATION_MAP.get(it.locationId || '')?.name || it.locationId}</td>
                    <td className="px-1 py-1.5 text-slate-300">{(CATEGORY_LABELS as Record<string, string>)[it.category || ''] || it.category}</td>
                    <td className="px-1 py-1.5 text-right font-mono text-slate-200">{formatMoney(it.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Econ Warfare Tab (Wave M5 — docs/MEANINGFUL_2026-08.md §3.2 O2/O3) ─────
// The offense toolkit's market surface: every active price campaign on the
// server (fully public — reputation is legible), a declare form (burned
// fee + real inventory ammunition required, one campaign at a time), and
// the standing-order demand report (market_microstructure research + a
// burned per-pull fee — the "aim your corner" intelligence read).

interface CampaignView {
  id: string;
  resourceSlug: string;
  byCompanyName: string;
  declaredAt: string;
  endsAt: string;
  feePaid: number;
}

interface StandingDemandView {
  resourceSlug: string;
  openQty: number;
  escrowValue: number;
  buyerCount: number;
  standingQty: number;
}

interface CampaignQuoteView {
  resourceSlug: string;
  fee: number;
  minInventory: number;
}

function EconWarfareTab({ onDeclareCampaign }: { onDeclareCampaign?: (slug: string) => void }) {
  const [campaigns, setCampaigns] = useState<CampaignView[]>([]);
  const [declareSlug, setDeclareSlug] = useState<string>('iron');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [demandReport, setDemandReport] = useState<StandingDemandView[] | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  // Balance Pass 9: the declare fee is market-keyed and SERVER-computed
  // (15% of the resource's trailing-7d window turnover, $25M-$5B) — the
  // pre-purchase display fetches the server quote, never a client guess.
  const [quote, setQuote] = useState<CampaignQuoteView | null>(null);

  const loadCampaigns = useCallback(async (quoteSlug?: string) => {
    try {
      const res = await fetch(`/api/space-tycoon/market/campaign${quoteSlug ? `?quote=${encodeURIComponent(quoteSlug)}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : []);
        if (data.quote && data.quote.resourceSlug) setQuote(data.quote as CampaignQuoteView);
      }
    } catch { /* best-effort */ }
  }, []);

  useEffect(() => { loadCampaigns(declareSlug); }, [loadCampaigns, declareSlug]);

  const declare = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/space-tycoon/market/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'declare', resourceSlug: declareSlug }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(`Campaign declared — fee ${formatMoney(data.feePaid)} burned. Now sell real volume below spot; the crash sticks until ${new Date(data.endsAt).toLocaleString()}.`);
        loadCampaigns();
      } else {
        setMessage(data.error || 'Declaration failed.');
      }
    } catch {
      setMessage('Network error — try again.');
    } finally {
      setBusy(false);
    }
  };

  const pullDemandReport = async () => {
    setBusy(true);
    setReportMessage(null);
    try {
      const res = await fetch('/api/space-tycoon/market/standing-demand', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setDemandReport(Array.isArray(data.demand) ? data.demand : []);
        setReportMessage(`Report pulled — ${formatMoney(data.feePaid)} burned.`);
      } else {
        setReportMessage(data.error || 'Report failed.');
      }
    } catch {
      setReportMessage('Network error — try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <ConsolePanel title="Active Price Campaigns" icon="trending-down" subtitle="Public dumping declarations — every campaign is visible to every corporation. Producers: buy the dip, spread into other markets, or out-wait the clock — mothballing mainly suits larger, diversified operations.">
        {campaigns.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">No active price campaigns anywhere on the server. Markets are healing normally.</p>
        ) : (
          <div className="space-y-2">
            {campaigns.map(c => {
              const def = RESOURCE_MAP.get(c.resourceSlug as ResourceId);
              const hoursLeft = Math.max(0, Math.round((new Date(c.endsAt).getTime() - Date.now()) / 3_600_000));
              return (
                <div key={c.id} className="flex items-center justify-between rounded-lg bg-red-500/[0.05] border border-red-500/20 px-3 py-2">
                  <div>
                    <p className="text-xs text-slate-200 font-bold">{def?.name || c.resourceSlug}</p>
                    <p className="text-[11px] text-slate-400">{c.byCompanyName} · fee {formatMoney(c.feePaid)} burned</p>
                  </div>
                  <span className="text-[11px] font-mono text-red-300">{hoursLeft}h left</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <p className="text-[11px] text-slate-400 mb-2">
            Declare your own campaign: burned fee = 15% of the market&apos;s weekly turnover ($25M-$5B), requires holding real inventory of the resource, one campaign at a time, 14-day per-market cooldown. Frontier corporations cannot declare or be starved.
          </p>
          {onDeclareCampaign ? (
            // Lever-discoverability pass (2026-09): the declare form lives on
            // Spot & Orders now (the order book header knows the selected
            // resource and your inventory). This is the thin link.
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={declareSlug}
                onChange={e => setDeclareSlug(e.target.value)}
                className="min-h-[44px] bg-slate-900 border border-white/[0.1] rounded-md px-2 py-1.5 text-xs text-slate-200"
                aria-label="Resource to campaign against"
              >
                {RESOURCES.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onDeclareCampaign(declareSlug)}
                aria-label={`Open the price-campaign console for ${RESOURCE_MAP.get(declareSlug as ResourceId)?.name || declareSlug} on the order book`}
                className="min-h-[44px] px-3 py-1.5 rounded-md text-xs font-bold bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                Declare from the order book →
              </button>
              {quote && quote.resourceSlug === declareSlug && (
                <span className="text-[11px] text-amber-300/90">
                  Quote: fee {formatMoney(quote.fee)} (burned) · {quote.minInventory} units held required.
                </span>
              )}
            </div>
          ) : (<>
          {quote && quote.resourceSlug === declareSlug && (
            <p className="text-[11px] text-amber-300/90 mb-2">
              Current quote for {RESOURCE_MAP.get(declareSlug as ResourceId)?.name || declareSlug}: fee {formatMoney(quote.fee)} (burned) · ammunition required: {quote.minInventory} units held.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={declareSlug}
              onChange={e => setDeclareSlug(e.target.value)}
              className="bg-slate-900 border border-white/[0.1] rounded-md px-2 py-1.5 text-xs text-slate-200"
              aria-label="Resource to campaign against"
            >
              {RESOURCES.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <button
              onClick={declare}
              disabled={busy}
              className="px-3 py-1.5 rounded-md text-xs font-bold bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 disabled:opacity-40"
            >
              Declare price campaign
            </button>
          </div>
          {message && <p className="text-[11px] text-slate-300 mt-2">{message}</p>}
          </>)}
        </div>
      </ConsolePanel>

      <ConsolePanel title="Standing-Order Demand Report" icon="market" subtitle="What rival buildings are short of, per resource — aim a corner where it bites. Requires Market Microstructure Analysis research; each pull burns a fee.">
        <button
          onClick={pullDemandReport}
          disabled={busy}
          className="px-3 py-1.5 rounded-md text-xs font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 disabled:opacity-40"
        >
          Pull report ($5M, burned)
        </button>
        {reportMessage && <p className="text-[11px] text-slate-300 mt-2">{reportMessage}</p>}
        {demandReport && (
          demandReport.length === 0 ? (
            <p className="text-xs text-slate-500 mt-3">No rival buy-side demand resting on the book right now.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-slate-500 uppercase tracking-wider">
                    <th className="py-1 pr-3">Resource</th>
                    <th className="py-1 pr-3">Open demand</th>
                    <th className="py-1 pr-3">Standing (building shortfalls)</th>
                    <th className="py-1 pr-3">Escrow value</th>
                    <th className="py-1">Buyers</th>
                  </tr>
                </thead>
                <tbody>
                  {demandReport.map(d => (
                    <tr key={d.resourceSlug} className="border-t border-white/[0.05] text-slate-300">
                      <td className="py-1.5 pr-3 font-bold">{RESOURCE_MAP.get(d.resourceSlug as ResourceId)?.name || d.resourceSlug}</td>
                      <td className="py-1.5 pr-3 font-mono">{d.openQty.toLocaleString()}</td>
                      <td className="py-1.5 pr-3 font-mono">{d.standingQty.toLocaleString()}</td>
                      <td className="py-1.5 pr-3 font-mono">{formatMoney(d.escrowValue)}</td>
                      <td className="py-1.5 font-mono">{d.buyerCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </ConsolePanel>
    </div>
  );
}
