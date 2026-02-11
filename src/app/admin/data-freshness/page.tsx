'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

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

interface FreshnessData {
  dynamicContent: Record<string, unknown>;
  circuitBreakers: CircuitBreakerInfo[];
  recentRefreshLogs: RefreshLog[];
  tableTimestamps: {
    news: TableTimestamp;
    events: TableTimestamp;
    blogs: TableTimestamp;
  };
  generatedAt: string;
}

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
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${cls}`}>
      {status}
    </span>
  );
}

export default function DataFreshnessPage() {
  const [data, setData] = useState<FreshnessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);

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
              Last updated: {new Date(data.generatedAt).toLocaleString()}
            </p>
          </div>
          <Link href="/admin" className="text-cyan-400 hover:underline text-sm">
            Back to Admin
          </Link>
        </div>

        {/* Table Timestamps */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
            <h2 className="text-white font-semibold text-sm">Core Data Sources</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(data.tableTimestamps).map(([key, ts]) => (
                <div key={key} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300 font-medium capitalize">{key}</span>
                    <AgeLabel minutes={ts.ageMinutes} />
                  </div>
                  <div className="text-slate-500 text-xs">
                    {ts.lastFetchedAt || ts.lastUpdatedAt
                      ? new Date(ts.lastFetchedAt || ts.lastUpdatedAt || '').toLocaleString()
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
                        <div>Last fail: <span className="text-slate-300">{new Date(cb.lastFailure).toLocaleString()}</span></div>
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
                      const lastRefreshed = modInfo.lastRefreshedAt as string | null;
                      const ageMin = lastRefreshed
                        ? Math.round((Date.now() - new Date(lastRefreshed).getTime()) / 60000)
                        : null;
                      return (
                        <tr key={module} className="hover:bg-slate-800/30">
                          <td className="px-3 py-2 text-white font-medium">{module}</td>
                          <td className="px-3 py-2 text-slate-300">{(modInfo.itemCount as number) || '-'}</td>
                          <td className="px-3 py-2"><AgeLabel minutes={ageMin} /></td>
                          <td className="px-3 py-2">
                            {(modInfo.hasExpired as boolean)
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
                          {new Date(log.createdAt).toLocaleString()}
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
