'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { clientLogger } from '@/lib/client-logger';
import { LineChart, BarChart } from '@/components/charts';

export const dynamic = 'force-dynamic';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface LaunchCostBenchmark {
  id: string;
  vehicle: string;
  provider: string;
  payloadKg: number;
  orbitType: string;
  launchDate: string;
  costUSD: number;
  costPerKg: number | null;
  source: string | null;
  sourceUrl: string | null;
  reliability: number | null;
  notes: string | null;
}

const ORBIT_TYPES = [
  { value: '', label: 'All Orbits' },
  { value: 'leo', label: 'LEO' },
  { value: 'meo', label: 'MEO' },
  { value: 'geo', label: 'GEO' },
  { value: 'lunar', label: 'Lunar' },
  { value: 'hyperbolic', label: 'Hyperbolic' },
];

const ORBIT_COLORS: Record<string, string> = {
  leo: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  meo: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  geo: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  lunar: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  hyperbolic: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

function formatCurrency(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPayload(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${kg.toFixed(0)}kg`;
}

function toSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function LaunchCostsPage() {
  const [benchmarks, setBenchmarks] = useState<LaunchCostBenchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [provider, setProvider] = useState<string>('');
  const [vehicle, setVehicle] = useState<string>('');
  const [orbitType, setOrbitType] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [minPayload, setMinPayload] = useState<string>('');
  const [maxPayload, setMaxPayload] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/launch-costs?limit=500', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        const rows: LaunchCostBenchmark[] = json?.data?.benchmarks ?? [];
        setBenchmarks(rows);
      } catch (err) {
        if (cancelled) return;
        clientLogger.error('Failed to load launch cost benchmarks', {
          error: err instanceof Error ? err.message : String(err),
        });
        setError('Failed to load launch cost benchmarks.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const providers = useMemo(
    () => Array.from(new Set(benchmarks.map((b) => b.provider))).sort(),
    [benchmarks]
  );
  const vehicles = useMemo(
    () => Array.from(new Set(benchmarks.map((b) => b.vehicle))).sort(),
    [benchmarks]
  );

  const filtered = useMemo(() => {
    return benchmarks.filter((b) => {
      if (provider && b.provider !== provider) return false;
      if (vehicle && b.vehicle !== vehicle) return false;
      if (orbitType && b.orbitType !== orbitType) return false;
      if (fromDate && new Date(b.launchDate) < new Date(fromDate)) return false;
      if (toDate && new Date(b.launchDate) > new Date(toDate)) return false;
      const minP = parseFloat(minPayload);
      const maxP = parseFloat(maxPayload);
      if (!Number.isNaN(minP) && b.payloadKg < minP) return false;
      if (!Number.isNaN(maxP) && b.payloadKg > maxP) return false;
      return true;
    });
  }, [benchmarks, provider, vehicle, orbitType, fromDate, toDate, minPayload, maxPayload]);

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime()
      ),
    [filtered]
  );

  // Cost-per-kg over time (aggregated yearly across filtered rows)
  const costOverTime = useMemo(() => {
    const buckets = new Map<number, { sum: number; count: number }>();
    for (const b of filtered) {
      if (b.costPerKg == null) continue;
      const year = new Date(b.launchDate).getFullYear();
      const entry = buckets.get(year) || { sum: 0, count: 0 };
      entry.sum += b.costPerKg;
      entry.count += 1;
      buckets.set(year, entry);
    }
    const years = Array.from(buckets.keys()).sort();
    const avg = years.map((y) => {
      const e = buckets.get(y)!;
      return e.count > 0 ? Math.round(e.sum / e.count) : 0;
    });
    return { labels: years.map(String), values: avg };
  }, [filtered]);

  // By-vehicle average cost per kg
  const byVehicle = useMemo(() => {
    const buckets = new Map<string, { sum: number; count: number }>();
    for (const b of filtered) {
      if (b.costPerKg == null) continue;
      const e = buckets.get(b.vehicle) || { sum: 0, count: 0 };
      e.sum += b.costPerKg;
      e.count += 1;
      buckets.set(b.vehicle, e);
    }
    return Array.from(buckets.entries())
      .map(([v, e]) => ({ label: v, value: Math.round(e.sum / e.count) }))
      .sort((a, b) => a.value - b.value)
      .slice(0, 12);
  }, [filtered]);

  const stats = useMemo(() => {
    if (filtered.length === 0) {
      return { count: 0, avgCostPerKg: 0, cheapest: null as LaunchCostBenchmark | null };
    }
    const withKg = filtered.filter((b) => b.costPerKg != null);
    const sum = withKg.reduce((acc, b) => acc + (b.costPerKg ?? 0), 0);
    const avg = withKg.length > 0 ? sum / withKg.length : 0;
    const cheapest = withKg.reduce<LaunchCostBenchmark | null>((best, b) => {
      if (!best || (b.costPerKg ?? Infinity) < (best.costPerKg ?? Infinity)) return b;
      return best;
    }, null);
    return { count: filtered.length, avgCostPerKg: avg, cheapest };
  }, [filtered]);

  function clearFilters() {
    setProvider('');
    setVehicle('');
    setOrbitType('');
    setFromDate('');
    setToDate('');
    setMinPayload('');
    setMaxPayload('');
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Launch Cost Benchmarking</h1>
          <p className="text-slate-400 max-w-3xl">
            Compare launch economics across vehicles, providers, and orbits. Historical cost-per-kg
            trends, payload ranges, and reliability data aggregated from public filings,
            press releases, and industry analysis.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Benchmarks</p>
            <p className="text-2xl font-bold text-white">{stats.count}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Avg $/kg</p>
            <p className="text-2xl font-bold text-cyan-400">
              {stats.avgCostPerKg > 0 ? formatCurrency(stats.avgCostPerKg) : '—'}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Cheapest ride</p>
            <p className="text-lg font-bold text-emerald-400">
              {stats.cheapest ? stats.cheapest.vehicle : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {stats.cheapest?.costPerKg ? `${formatCurrency(stats.cheapest.costPerKg)} /kg` : ''}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Vehicles tracked</p>
            <p className="text-2xl font-bold text-purple-400">{vehicles.length}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">
              Average cost per kg over time
            </h2>
            {costOverTime.values.length > 1 ? (
              <LineChart
                labels={costOverTime.labels}
                series={[{ name: '$/kg', data: costOverTime.values, color: 'cyan' }]}
                height={260}
                yAxisLabel="USD / kg"
              />
            ) : (
              <p className="text-sm text-slate-500 text-center py-10">
                Not enough data to chart — adjust filters.
              </p>
            )}
          </div>
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">
              $/kg by vehicle (lowest first)
            </h2>
            {byVehicle.length > 0 ? (
              <BarChart
                data={byVehicle.map((d) => ({ label: d.label, value: d.value }))}
                orientation="horizontal"
                height={Math.max(260, byVehicle.length * 22)}
                valueFormatter={(v) => formatCurrency(v)}
              />
            ) : (
              <p className="text-sm text-slate-500 text-center py-10">
                Not enough data to chart — adjust filters.
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="card p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full bg-black/60 border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none"
              >
                <option value="">All providers</option>
                {providers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                Vehicle
              </label>
              <select
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                className="w-full bg-black/60 border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none"
              >
                <option value="">All vehicles</option>
                {vehicles.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                Orbit type
              </label>
              <select
                value={orbitType}
                onChange={(e) => setOrbitType(e.target.value)}
                className="w-full bg-black/60 border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none"
              >
                {ORBIT_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                Payload (kg)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={minPayload}
                  onChange={(e) => setMinPayload(e.target.value)}
                  placeholder="Min"
                  className="w-full bg-black/60 border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <input
                  type="number"
                  value={maxPayload}
                  onChange={(e) => setMaxPayload(e.target.value)}
                  placeholder="Max"
                  className="w-full bg-black/60 border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                From
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-black/60 border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                To
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-black/60 border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing {filtered.length} of {benchmarks.length}
            </span>
            <button
              onClick={clearFilters}
              className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
            >
              Clear filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading benchmarks…</div>
          ) : error ? (
            <div className="p-8 text-center text-rose-300">{error}</div>
          ) : sorted.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No launch cost benchmarks match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.04] border-b border-white/[0.08]">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-white/80">Vehicle</th>
                    <th className="text-left px-4 py-3 font-semibold text-white/80">Provider</th>
                    <th className="text-left px-4 py-3 font-semibold text-white/80">Orbit</th>
                    <th className="text-right px-4 py-3 font-semibold text-white/80">Payload</th>
                    <th className="text-right px-4 py-3 font-semibold text-white/80">Cost</th>
                    <th className="text-right px-4 py-3 font-semibold text-white/80">$/kg</th>
                    <th className="text-right px-4 py-3 font-semibold text-white/80">Reliability</th>
                    <th className="text-left px-4 py-3 font-semibold text-white/80">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((b) => (
                    <tr
                      key={b.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/launch-costs/${toSlug(b.vehicle)}`}
                          className="text-cyan-400 hover:text-cyan-300 font-medium"
                        >
                          {b.vehicle}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-white/80">{b.provider}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border uppercase ${
                            ORBIT_COLORS[b.orbitType] ??
                            'bg-slate-600/20 text-slate-300 border-slate-500/40'
                          }`}
                        >
                          {b.orbitType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white/80">
                        {formatPayload(b.payloadKg)}
                      </td>
                      <td className="px-4 py-3 text-right text-white/80">
                        {formatCurrency(b.costUSD)}
                      </td>
                      <td className="px-4 py-3 text-right text-cyan-300 font-medium">
                        {b.costPerKg != null ? formatCurrency(b.costPerKg) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-white/70">
                        {b.reliability != null
                          ? `${(b.reliability * 100).toFixed(1)}%`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {new Date(b.launchDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
