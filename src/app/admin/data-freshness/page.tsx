'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

// TTL policies mirrored from src/lib/freshness-policies.ts for client-side status calculation
const FRESHNESS_POLICIES: Record<string, { ttlHours: number; refreshPriority: string }> = {
  'space-stations': { ttlHours: 24, refreshPriority: 'critical' },
  'constellations': { ttlHours: 168, refreshPriority: 'high' },
  'space-economy': { ttlHours: 24, refreshPriority: 'high' },
  'startups': { ttlHours: 168, refreshPriority: 'high' },
  'space-capital': { ttlHours: 168, refreshPriority: 'moderate' },
  'space-defense': { ttlHours: 24, refreshPriority: 'high' },
  'cislunar': { ttlHours: 168, refreshPriority: 'high' },
  'compliance': { ttlHours: 48, refreshPriority: 'high' },
  'asteroid-watch': { ttlHours: 48, refreshPriority: 'high' },
  'patents': { ttlHours: 168, refreshPriority: 'moderate' },
  'launch-vehicles': { ttlHours: 168, refreshPriority: 'moderate' },
  'mars-planner': { ttlHours: 336, refreshPriority: 'moderate' },
  'spaceports': { ttlHours: 336, refreshPriority: 'moderate' },
  'space-manufacturing': { ttlHours: 168, refreshPriority: 'moderate' },
  'space-tourism': { ttlHours: 168, refreshPriority: 'moderate' },
  'supply-chain': { ttlHours: 336, refreshPriority: 'moderate' },
  'talent-board': { ttlHours: 168, refreshPriority: 'moderate' },
  'webinars': { ttlHours: 168, refreshPriority: 'moderate' },
  'mission-control': { ttlHours: 24, refreshPriority: 'high' },
  'business-opportunities': { ttlHours: 24, refreshPriority: 'high' },
  'space-environment': { ttlHours: 6, refreshPriority: 'critical' },
  'exoplanets': { ttlHours: 168, refreshPriority: 'low' },
  'earth-imagery': { ttlHours: 24, refreshPriority: 'moderate' },
  'dsn': { ttlHours: 1, refreshPriority: 'critical' },
  'fireballs': { ttlHours: 24, refreshPriority: 'moderate' },
  'sbir-grants': { ttlHours: 168, refreshPriority: 'low' },
  'solar-imagery': { ttlHours: 1, refreshPriority: 'critical' },
  'aurora': { ttlHours: 1, refreshPriority: 'critical' },
  'ground-stations': { ttlHours: 1440, refreshPriority: 'low' },
};

const DEFAULT_TTL_HOURS = 720;

type HeatmapStatus = 'fresh' | 'stale' | 'expired' | 'no-data';
type SortBy = 'priority' | 'staleness' | 'name';

interface CircuitBreakerInfo {
  name: string;
  state: string;
  failures: number;
  lastFailure: string | null;
}

interface RefreshLog {
  id: string;
  module: string;
  refreshType: string;
  status: string;
  itemsUpdated: number;
  duration: number | null;
  errorMessage: string | null;
  createdAt: string;
}

interface TableTimestamp {
  lastFetchedAt?: string | null;
  lastUpdatedAt?: string | null;
  ageMinutes: number | null;
}

interface ModuleFreshnessDetail {
  total?: number;
  active?: number;
  stale?: number;
  expired?: number;
  lastRefreshed?: string | null;
  sourceBreakdown?: Record<string, number>;
  // Some modules return these alternate shapes
  itemCount?: number;
  lastRefreshedAt?: string | null;
  hasExpired?: boolean;
}

interface FreshnessData {
  dynamicContent: Record<string, ModuleFreshnessDetail>;
  circuitBreakers: CircuitBreakerInfo[];
  recentRefreshLogs: RefreshLog[];
  tableTimestamps: {
    news: TableTimestamp;
    events: TableTimestamp;
    blogs: TableTimestamp;
  };
  generatedAt: string;
}

interface HeatmapEntry {
  module: string;
  status: HeatmapStatus;
  ageLabel: string;
  ageMinutes: number | null;
  priority: string;
  ttlHours: number;
}

function getModuleHeatmapStatus(
  module: string,
  lastRefreshed: string | null | undefined
): { status: HeatmapStatus; ageMinutes: number | null } {
  if (!lastRefreshed) return { status: 'no-data', ageMinutes: null };

  const policy = FRESHNESS_POLICIES[module];
  const ttlHours = policy?.ttlHours ?? DEFAULT_TTL_HOURS;
  const ttlMs = ttlHours * 60 * 60 * 1000;

  const ageMs = Date.now() - new Date(lastRefreshed).getTime();
  const ageMinutes = Math.floor(ageMs / 60000);

  if (ageMs > ttlMs * 2) return { status: 'expired', ageMinutes };
  if (ageMs > ttlMs) return { status: 'stale', ageMinutes };
  return { status: 'fresh', ageMinutes };
}

function formatAgeShort(minutes: number | null): string {
  if (minutes === null) return 'No data';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const priorityOrder: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'CLOSED' ? 'bg-green-500' :
    status === 'HALF_OPEN' ? 'bg-yellow-500' :
    status === 'OPEN' ? 'bg-red-500' : 'bg-slate-500';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />;
}

function AgeLabel({ minutes }: { minutes: number | null }) {
  if (minutes === null) return <span className="text-slate-500">No data</span>;
  if (minutes < 15) return <span className="text-green-400">{minutes}m ago</span>;
  if (minutes < 60) return <span className="text-yellow-400">{minutes}m ago</span>;
  if (minutes < 1440) return <span className="text-orange-400">{Math.round(minutes / 60)}h ago</span>;
  return <span className="text-red-400">{Math.round(minutes / 1440)}d ago</span>;
}

function LogStatusBadge({ status }: { status: string }) {
  const cls =
    status === 'success' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
    status === 'partial' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
    'bg-red-500/20 text-red-400 border-red-500/30';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>
      {status}
    </span>
  );
}

function HeatmapCell({ entry }: { entry: HeatmapEntry }) {
  const bgColor =
    entry.status === 'fresh' ? 'bg-green-500/15 border-green-500/30 hover:bg-green-500/25' :
    entry.status === 'stale' ? 'bg-yellow-500/15 border-yellow-500/30 hover:bg-yellow-500/25' :
    entry.status === 'expired' ? 'bg-red-500/15 border-red-500/30 hover:bg-red-500/25' :
    'bg-slate-800/50 border-slate-700/30 hover:bg-slate-700/50';

  const textColor =
    entry.status === 'fresh' ? 'text-green-400' :
    entry.status === 'stale' ? 'text-yellow-400' :
    entry.status === 'expired' ? 'text-red-400' :
    'text-slate-500';

  return (
    <div
      className={`rounded-lg p-2.5 border transition-colors cursor-default ${bgColor}`}
      title={`${entry.module} - TTL: ${entry.ttlHours}h - Priority: ${entry.priority}`}
    >
      <div className="text-white text-xs font-medium truncate">{entry.module}</div>
      <div className={`text-xs mt-0.5 ${textColor}`}>{entry.ageLabel}</div>
    </div>
  );
}

export default function DataFreshnessPage() {
  const [data, setData] = useState<FreshnessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('priority');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/data-freshness');
      if (res.status === 401 || res.status === 403) {
        setError('Unauthorized. Admin access required.');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const triggerRefresh = async (module: string) => {
    setRefreshing(module);
    try {
      const res = await fetch('/api/admin/data-freshness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module }),
      });
      if (res.ok) {
        // Re-fetch freshness data after a short delay
        setTimeout(fetchData, 2000);
      }
    } catch {
      // Silent fail
    } finally {
      setRefreshing(null);
    }
  };

  // Build heatmap entries from all known modules (policies + dynamic content)
  const heatmapEntries = useMemo((): HeatmapEntry[] => {
    if (!data) return [];

    const allModules = new Set<string>();

    // Add all modules from freshness policies
    for (const mod of Object.keys(FRESHNESS_POLICIES)) {
      allModules.add(mod);
    }

    // Add all modules from dynamic content data
    if (data.dynamicContent) {
      for (const mod of Object.keys(data.dynamicContent)) {
        allModules.add(mod);
      }
    }

    const entries: HeatmapEntry[] = [];
    for (const mod of Array.from(allModules)) {
      const info = data.dynamicContent?.[mod];
      const lastRefreshed = info?.lastRefreshed ?? info?.lastRefreshedAt ?? null;
      const { status, ageMinutes } = getModuleHeatmapStatus(mod, lastRefreshed);
      const policy = FRESHNESS_POLICIES[mod];

      entries.push({
        module: mod,
        status,
        ageLabel: formatAgeShort(ageMinutes),
        ageMinutes,
        priority: policy?.refreshPriority ?? 'low',
        ttlHours: policy?.ttlHours ?? DEFAULT_TTL_HOURS,
      });
    }

    return entries;
  }, [data]);

  // Sort heatmap entries
  const sortedEntries = useMemo(() => {
    const sorted = [...heatmapEntries];
    switch (sortBy) {
      case 'priority':
        sorted.sort((a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4));
        break;
      case 'staleness': {
        const statusOrder: Record<HeatmapStatus, number> = {
          'expired': 0, 'stale': 1, 'no-data': 2, 'fresh': 3,
        };
        sorted.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
        break;
      }
      case 'name':
        sorted.sort((a, b) => a.module.localeCompare(b.module));
        break;
    }
    return sorted;
  }, [heatmapEntries, sortBy]);

  // Summary counts
  const summary = useMemo(() => {
    let fresh = 0, stale = 0, expired = 0, noData = 0;
    for (const entry of heatmapEntries) {
      switch (entry.status) {
        case 'fresh': fresh++; break;
        case 'stale': stale++; break;
        case 'expired': expired++; break;
        case 'no-data': noData++; break;
      }
    }
    return { fresh, stale, expired, noData };
  }, [heatmapEntries]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-800 rounded w-64" />
            <div className="h-48 bg-slate-800 rounded" />
            <div className="h-48 bg-slate-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Data Freshness</h1>
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
            {error}
          </div>
          <Link href="/admin" className="text-cyan-400 hover:underline mt-4 inline-block text-sm">
            Back to Admin
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const refreshModules = [
    { key: 'news', label: 'News' },
    { key: 'events', label: 'Events' },
    { key: 'blogs', label: 'Blogs' },
    { key: 'external-apis', label: 'External APIs' },
    { key: 'space-weather', label: 'Space Weather' },
    { key: 'regulatory-feeds', label: 'Regulatory Feeds' },
    { key: 'sec-filings', label: 'SEC Filings' },
    { key: 'ai-research', label: 'AI Research' },
    { key: 'space-defense', label: 'Space Defense' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Data Freshness Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">
              Last updated: {new Date(data.generatedAt).toLocaleString('en-US', { timeZone: 'UTC' })}
            </p>
          </div>
          <Link href="/admin" className="text-cyan-400 hover:underline text-sm">
            Back to Admin
          </Link>
        </div>

        {/* Freshness Heatmap */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-white font-semibold text-sm">Freshness Heatmap</h2>
                <div className="flex flex-wrap gap-3 mt-1.5 text-xs">
                  <span className="text-green-400">{summary.fresh} fresh</span>
                  <span className="text-yellow-400">{summary.stale} stale</span>
                  <span className="text-red-400">{summary.expired} expired</span>
                  {summary.noData > 0 && (
                    <span className="text-slate-500">{summary.noData} no data</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs">Sort:</span>
                <div className="flex rounded-lg border border-slate-700/50 overflow-hidden">
                  {(['priority', 'staleness', 'name'] as SortBy[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSortBy(s)}
                      className={`px-2.5 py-1 text-xs font-medium transition-colors capitalize ${
                        sortBy === s
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-4 mb-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-500/30 border border-green-500/50" />
                <span className="text-slate-400">Fresh (within TTL)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-yellow-500/30 border border-yellow-500/50" />
                <span className="text-slate-400">Stale (&gt;TTL)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-500/30 border border-red-500/50" />
                <span className="text-slate-400">Expired (&gt;2x TTL)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-700/50 border border-slate-600/50" />
                <span className="text-slate-400">No data</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {sortedEntries.map((entry) => (
                <HeatmapCell key={entry.module} entry={entry} />
              ))}
            </div>
          </div>
        </div>

        {/* Table Timestamps */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
            <h2 className="text-white font-semibold text-sm">Core Data Sources</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(data.tableTimestamps).map(([key, ts]) => (
                <div key={key} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300 font-medium capitalize">{key}</span>
                    <AgeLabel minutes={ts.ageMinutes} />
                  </div>
                  <div className="text-slate-500 text-xs">
                    {ts.lastFetchedAt || ts.lastUpdatedAt
                      ? new Date(ts.lastFetchedAt || ts.lastUpdatedAt || '').toLocaleString('en-US', { timeZone: 'UTC' })
                      : 'Never fetched'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Circuit Breakers */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
            <h2 className="text-white font-semibold text-sm">Circuit Breakers</h2>
          </div>
          <div className="p-4">
            {data.circuitBreakers.length === 0 ? (
              <p className="text-slate-500 text-sm">No circuit breakers registered in this process.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.circuitBreakers.map((cb) => (
                  <div
                    key={cb.name}
                    className={`rounded-lg p-3 border ${
                      cb.state === 'CLOSED' ? 'bg-slate-800/50 border-slate-700/30' :
                      cb.state === 'HALF_OPEN' ? 'bg-yellow-900/10 border-yellow-500/20' :
                      'bg-red-900/10 border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <StatusDot status={cb.state} />
                      <span className="text-white text-sm font-medium">{cb.name}</span>
                    </div>
                    <div className="text-slate-500 text-xs space-y-0.5">
                      <div>State: <span className="text-slate-300">{cb.state}</span></div>
                      <div>Failures: <span className="text-slate-300">{cb.failures}</span></div>
                      {cb.lastFailure && (
                        <div>Last fail: <span className="text-slate-300">{new Date(cb.lastFailure).toLocaleString('en-US', { timeZone: 'UTC' })}</span></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Manual Refresh */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
            <h2 className="text-white font-semibold text-sm">Manual Refresh</h2>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {refreshModules.map((mod) => (
                <button
                  key={mod.key}
                  onClick={() => triggerRefresh(mod.key)}
                  disabled={refreshing !== null}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    refreshing === mod.key
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 animate-pulse'
                      : 'bg-slate-800/50 border-slate-700/30 text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  } disabled:opacity-50`}
                >
                  {refreshing === mod.key ? 'Refreshing...' : mod.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Content Freshness */}
        {data.dynamicContent && Object.keys(data.dynamicContent).length > 0 && (
          <div className="bg-slate-900/80 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
              <h2 className="text-white font-semibold text-sm">Dynamic Content Modules</h2>
            </div>
            <div className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs uppercase">
                      <th className="text-left px-3 py-2">Module</th>
                      <th className="text-left px-3 py-2">Items</th>
                      <th className="text-left px-3 py-2">Last Refreshed</th>
                      <th className="text-left px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {Object.entries(data.dynamicContent).map(([module, info]) => {
                      const modInfo = info as Record<string, unknown>;
                      const lastRefreshed = (modInfo.lastRefreshedAt ?? modInfo.lastRefreshed) as string | null;
                      const ageMin = lastRefreshed
                        ? Math.round((Date.now() - new Date(lastRefreshed).getTime()) / 60000)
                        : null;
                      return (
                        <tr key={module} className="hover:bg-slate-800/30">
                          <td className="px-3 py-2 text-white font-medium">{module}</td>
                          <td className="px-3 py-2 text-slate-300">{(modInfo.itemCount as number) ?? (modInfo.total as number) ?? '-'}</td>
                          <td className="px-3 py-2"><AgeLabel minutes={ageMin} /></td>
                          <td className="px-3 py-2">
                            {(modInfo.hasExpired as boolean) || (modInfo.expired as number) > 0
                              ? <span className="text-red-400 text-xs">Expired items</span>
                              : <span className="text-green-400 text-xs">OK</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Recent Refresh Logs */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
            <h2 className="text-white font-semibold text-sm">Recent Refresh Logs</h2>
          </div>
          <div className="p-4">
            {data.recentRefreshLogs.length === 0 ? (
              <p className="text-slate-500 text-sm">No refresh logs yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs uppercase">
                      <th className="text-left px-3 py-2">Time</th>
                      <th className="text-left px-3 py-2">Module</th>
                      <th className="text-left px-3 py-2">Type</th>
                      <th className="text-left px-3 py-2">Status</th>
                      <th className="text-left px-3 py-2">Updated</th>
                      <th className="text-left px-3 py-2">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {data.recentRefreshLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('en-US', { timeZone: 'UTC' })}
                        </td>
                        <td className="px-3 py-2 text-white font-medium">{log.module}</td>
                        <td className="px-3 py-2 text-slate-300">{log.refreshType}</td>
                        <td className="px-3 py-2"><LogStatusBadge status={log.status} /></td>
                        <td className="px-3 py-2 text-slate-300">{log.itemsUpdated}</td>
                        <td className="px-3 py-2 text-slate-400">
                          {log.duration ? `${(log.duration / 1000).toFixed(1)}s` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
