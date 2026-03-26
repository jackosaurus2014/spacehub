'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { clientLogger } from '@/lib/client-logger';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface StoredError {
  id: string;
  timestamp: string;
  level: 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
  source: 'server' | 'client';
}

interface ErrorStats {
  total: number;
  errors: number;
  warnings: number;
  lastHour: number;
  lastDay: number;
  clientErrors: number;
  serverErrors: number;
  topMessages: { message: string; count: number }[];
  hourlyDistribution: { hour: string; errors: number; warnings: number }[];
  oldestEntry: string | null;
  newestEntry: string | null;
}

interface TelemetryResponse {
  success: boolean;
  data: {
    errors: StoredError[];
    stats: ErrorStats;
  };
}

type LevelFilter = 'all' | 'error' | 'warn';
type SourceFilter = 'all' | 'server' | 'client';

export default function ErrorMonitorPage() {
  const { data: session, status: authStatus } = useSession();
  const [errors, setErrors] = useState<StoredError[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchErrors = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (levelFilter !== 'all') params.set('level', levelFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);

      const res = await fetch(`/api/telemetry?${params.toString()}`);
      if (!res.ok) {
        setError(`Failed to load error data (HTTP ${res.status})`);
        return;
      }
      const json: TelemetryResponse = await res.json();
      if (json.success) {
        setErrors(json.data.errors);
        setStats(json.data.stats);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load error data');
      clientLogger.error('Error fetching telemetry', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }, [levelFilter, sourceFilter]);

  // Initial fetch and filter changes
  useEffect(() => {
    if (session?.user?.isAdmin) {
      setLoading(true);
      fetchErrors();
    }
  }, [session, fetchErrors]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (autoRefresh && session?.user?.isAdmin) {
      intervalRef.current = setInterval(fetchErrors, 30_000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, session, fetchErrors]);

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center max-w-md">
          <h1 className="text-2xl font-display font-bold text-white mb-4">Access Denied</h1>
          <p className="text-star-300">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <a href="/admin" className="text-star-300 hover:text-white text-sm transition-colors">
                Admin
              </a>
              <span className="text-star-500">/</span>
              <h1 className="text-3xl font-display font-bold text-white">Error Monitor</h1>
            </div>
            <p className="text-star-300 text-sm">
              Real-time view of production errors and warnings.
              {stats?.newestEntry && (
                <span className="text-star-400 ml-2">
                  Latest: {formatTimeAgo(stats.newestEntry)}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-star-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-space-600 bg-space-700 text-blue-500 focus:ring-blue-500/30"
              />
              Auto-refresh (30s)
            </label>
            <button
              onClick={() => { setLoading(true); fetchErrors(); }}
              className="btn-primary text-sm py-1.5 px-4"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400 mb-6">
            {error}
          </div>
        )}

        {loading && !stats ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Total Stored" value={stats.total} color="white" />
              <StatCard label="Errors" value={stats.errors} color="red" />
              <StatCard label="Warnings" value={stats.warnings} color="yellow" />
              <StatCard label="Last Hour" value={stats.lastHour} color={stats.lastHour > 10 ? 'red' : stats.lastHour > 0 ? 'yellow' : 'green'} />
              <StatCard label="Client-Side" value={stats.clientErrors} color="blue" />
              <StatCard label="Server-Side" value={stats.serverErrors} color="purple" />
            </div>

            {/* Hourly Distribution Chart */}
            {stats.hourlyDistribution.length > 0 && (
              <div className="card border border-space-600/50 p-5">
                <h2 className="text-white font-semibold text-sm mb-4">Error Frequency (Last 24 Hours)</h2>
                <HourlyChart data={stats.hourlyDistribution} />
              </div>
            )}

            {/* Top Error Messages */}
            {stats.topMessages.length > 0 && (
              <div className="card border border-space-600/50 overflow-hidden">
                <div className="px-5 py-3 border-b border-space-600/50 bg-space-700/30">
                  <h2 className="text-white font-semibold text-sm">Top Error Messages</h2>
                </div>
                <div className="divide-y divide-space-600/30">
                  {stats.topMessages.map((msg, i) => (
                    <div key={i} className="px-5 py-3 flex items-center justify-between gap-4">
                      <p className="text-star-200 text-sm font-mono truncate flex-1">{msg.message}</p>
                      <span className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                        {msg.count}x
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-star-300 text-sm">Filters:</span>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as LevelFilter)}
                className="input text-sm py-1.5 px-3"
              >
                <option value="all">All Levels</option>
                <option value="error">Errors Only</option>
                <option value="warn">Warnings Only</option>
              </select>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
                className="input text-sm py-1.5 px-3"
              >
                <option value="all">All Sources</option>
                <option value="server">Server Only</option>
                <option value="client">Client Only</option>
              </select>
              <span className="text-star-400 text-xs">
                Showing {errors.length} of {stats.total} entries
              </span>
            </div>

            {/* Error List */}
            <div className="card border border-space-600/50 overflow-hidden">
              <div className="px-5 py-3 border-b border-space-600/50 bg-space-700/30">
                <h2 className="text-white font-semibold text-sm">Recent Errors</h2>
              </div>
              {errors.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-3 opacity-30">--</div>
                  <p className="text-star-300">No errors recorded yet. Errors will appear here as they occur.</p>
                  <p className="text-star-400 text-sm mt-1">
                    The buffer resets on server restart.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-space-600/30">
                  {errors.map((err) => (
                    <ErrorRow
                      key={err.id}
                      error={err}
                      isExpanded={expandedError === err.id}
                      onToggle={() => setExpandedError(expandedError === err.id ? null : err.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Buffer info */}
            <div className="text-center text-star-500 text-xs py-4">
              In-memory buffer (max 200 entries). Resets on server restart.
              {stats.oldestEntry && (
                <span> Oldest entry: {new Date(stats.oldestEntry).toLocaleString()}</span>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// --------------- Sub-components ---------------

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    white: 'text-white',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
    green: 'text-green-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
  };

  const borderClasses: Record<string, string> = {
    white: 'border-space-600/50',
    red: 'border-red-500/30',
    yellow: 'border-yellow-500/30',
    green: 'border-green-500/30',
    blue: 'border-blue-500/30',
    purple: 'border-purple-500/30',
  };

  return (
    <div className={`card p-4 border ${borderClasses[color] || 'border-space-600/50'}`}>
      <div className={`text-2xl font-bold font-mono ${colorClasses[color] || 'text-white'}`}>
        {value}
      </div>
      <div className="text-star-400 text-xs mt-1">{label}</div>
    </div>
  );
}

function HourlyChart({ data }: { data: { hour: string; errors: number; warnings: number }[] }) {
  const maxVal = Math.max(1, ...data.map(d => d.errors + d.warnings));

  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => {
        const errHeight = (d.errors / maxVal) * 100;
        const warnHeight = (d.warnings / maxVal) * 100;
        const total = d.errors + d.warnings;
        const hour = new Date(d.hour).getHours();
        const showLabel = i % 4 === 0;

        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            {/* Tooltip */}
            {total > 0 && (
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                <div className="bg-space-700 border border-space-600/50 rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                  <span className="text-white">{hour}:00</span>
                  {d.errors > 0 && <span className="text-red-400 ml-2">{d.errors} err</span>}
                  {d.warnings > 0 && <span className="text-yellow-400 ml-2">{d.warnings} warn</span>}
                </div>
              </div>
            )}
            {/* Bars */}
            <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
              {d.errors > 0 && (
                <div
                  className="w-full bg-red-500/60 rounded-t-sm transition-all"
                  style={{ height: `${Math.max(2, errHeight)}%` }}
                />
              )}
              {d.warnings > 0 && (
                <div
                  className="w-full bg-yellow-500/40 rounded-t-sm transition-all"
                  style={{ height: `${Math.max(2, warnHeight)}%` }}
                />
              )}
              {total === 0 && (
                <div className="w-full bg-space-600/20 rounded-t-sm" style={{ height: '2%' }} />
              )}
            </div>
            {/* Hour label */}
            {showLabel && (
              <span className="text-star-500 text-[10px]">{hour}h</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ErrorRow({
  error,
  isExpanded,
  onToggle,
}: {
  error: StoredError;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isError = error.level === 'error';

  return (
    <div className="hover:bg-space-700/20 transition-colors">
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-3 flex items-start gap-3"
      >
        {/* Level badge */}
        <span
          className={`flex-shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded mt-0.5 ${
            isError
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          }`}
        >
          {error.level}
        </span>

        {/* Source badge */}
        <span
          className={`flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 ${
            error.source === 'client'
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
              : 'bg-purple-500/15 text-purple-400 border border-purple-500/25'
          }`}
        >
          {error.source}
        </span>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-star-200 text-sm font-mono truncate">{error.message}</p>
        </div>

        {/* Timestamp */}
        <span className="flex-shrink-0 text-star-400 text-xs whitespace-nowrap">
          {formatTimeAgo(error.timestamp)}
        </span>

        {/* Expand indicator */}
        <span className="flex-shrink-0 text-star-500 text-xs mt-0.5">
          {isExpanded ? '\u25B2' : '\u25BC'}
        </span>
      </button>

      {/* Expanded context */}
      {isExpanded && error.context && (
        <div className="px-5 pb-4 pl-20">
          <div className="bg-space-800/80 border border-space-600/30 rounded-lg p-4 overflow-x-auto">
            <pre className="text-star-300 text-xs font-mono whitespace-pre-wrap break-words">
              {JSON.stringify(error.context, null, 2)}
            </pre>
          </div>
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-star-500">
            <span>ID: {error.id}</span>
            <span>Time: {new Date(error.timestamp).toLocaleString()}</span>
            {error.context && typeof error.context === 'object' && 'clientUrl' in error.context && error.context.clientUrl ? (
              <span>URL: {String(error.context.clientUrl)}</span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// --------------- Utilities ---------------

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
