'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useCallback } from 'react';
import { FEATURE_REQUEST_STATUSES, HELP_REQUEST_STATUSES } from '@/types';
import { clientLogger } from '@/lib/client-logger';
import type { FeatureRequest, HelpRequest } from '@/types';
import { AVAILABLE_MODULES } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

type Tab = 'feature' | 'help' | 'data-status';

// Init endpoints for the data status panel
const INIT_ENDPOINTS = [
  { key: 'init', label: 'Master Init', path: '/api/init' },
  { key: 'blueprints', label: 'Blueprints', path: '/api/blueprints/init' },
  { key: 'companies', label: 'Companies', path: '/api/companies/init' },
  { key: 'compliance', label: 'Compliance', path: '/api/compliance/init' },
  { key: 'debris-monitor', label: 'Debris Monitor', path: '/api/debris-monitor/init' },
  { key: 'funding-opportunities', label: 'Funding Opportunities', path: '/api/funding-opportunities/init' },
  { key: 'funding-tracker', label: 'Funding Tracker', path: '/api/funding-tracker/init' },
  { key: 'government-contracts', label: 'Gov Contracts', path: '/api/government-contracts/init' },
  { key: 'launch-windows', label: 'Launch Windows', path: '/api/launch-windows/init' },
  { key: 'operational-awareness', label: 'Ops Awareness', path: '/api/operational-awareness/init' },
  { key: 'opportunities', label: 'Opportunities', path: '/api/opportunities/init' },
  { key: 'orbital-services', label: 'Orbital Services', path: '/api/orbital-services/init' },
  { key: 'orbital-slots', label: 'Orbital Slots', path: '/api/orbital-slots/init' },
  { key: 'regulatory-agencies', label: 'Regulatory Agencies', path: '/api/regulatory-agencies/init' },
  { key: 'resources', label: 'Resources', path: '/api/resources/init' },
  { key: 'solar-exploration', label: 'Solar Exploration', path: '/api/solar-exploration/init' },
  { key: 'solar-flares', label: 'Solar Flares', path: '/api/solar-flares/init' },
  { key: 'space-insurance', label: 'Space Insurance', path: '/api/space-insurance/init' },
  { key: 'space-mining', label: 'Space Mining', path: '/api/space-mining/init' },
  { key: 'spectrum', label: 'Spectrum', path: '/api/spectrum/init' },
  { key: 'workforce', label: 'Workforce', path: '/api/workforce/init' },
  { key: 'community-forums', label: 'Community Forums', path: '/api/community/forums/init' },
  { key: 'space-economy', label: 'Space Economy', path: '/api/space-economy/init' },
  { key: 'procurement', label: 'Procurement', path: '/api/procurement/init' },
];

interface ModuleFreshnessInfo {
  total: number;
  active: number;
  stale: number;
  expired: number;
  lastRefreshed: string | null;
  sourceBreakdown: Record<string, number>;
}

interface RefreshLog {
  id: string;
  module: string;
  refreshType: string;
  status: string;
  itemsUpdated: number;
  createdAt: string;
}

interface SeedAllResult {
  success: boolean;
  summary: {
    total: number;
    success: number;
    errors: number;
    durationMs: number;
  };
  results: Array<{
    endpoint: string;
    status: 'success' | 'error';
    message?: string;
    durationMs: number;
  }>;
}

export default function AdminPage() {
  const { data: session, status: authStatus } = useSession();
  const [tab, setTab] = useState<Tab>('feature');
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'feature') {
        const res = await fetch('/api/feature-requests');
        if (res.ok) {
          const data = await res.json();
          setFeatureRequests(data.featureRequests);
        }
      } else if (tab === 'help') {
        const res = await fetch('/api/help-requests');
        if (res.ok) {
          const data = await res.json();
          setHelpRequests(data.helpRequests);
        }
      }
    } catch (err) {
      clientLogger.error('Error fetching data', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (session?.user?.isAdmin && tab !== 'data-status') {
      fetchData();
    }
  }, [session, tab, fetchData]);

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
        <h1 className="text-3xl font-display font-bold text-white mb-8">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="flex border-b border-space-600/50 mb-6">
          <button
            onClick={() => setTab('feature')}
            className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 -mb-px ${
              tab === 'feature'
                ? 'border-white/15 text-white'
                : 'border-transparent text-star-300 hover:text-white'
            }`}
          >
            Feature Requests
          </button>
          <button
            onClick={() => setTab('help')}
            className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 -mb-px ${
              tab === 'help'
                ? 'border-white/15 text-white'
                : 'border-transparent text-star-300 hover:text-white'
            }`}
          >
            Help Requests
          </button>
          <button
            onClick={() => setTab('data-status')}
            className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 -mb-px ${
              tab === 'data-status'
                ? 'border-white/15 text-white'
                : 'border-transparent text-star-300 hover:text-white'
            }`}
          >
            Data Status
          </button>
        </div>

        {tab === 'data-status' ? (
          <DataStatusPanel />
        ) : loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : tab === 'feature' ? (
          <FeatureRequestList items={featureRequests} onUpdate={fetchData} />
        ) : (
          <HelpRequestList items={helpRequests} onUpdate={fetchData} />
        )}
      </div>
    </div>
  );
}

// --------------- Data Status Panel ---------------

function DataStatusPanel() {
  const [freshnessData, setFreshnessData] = useState<Record<string, ModuleFreshnessInfo>>({});
  const [recentLogs, setRecentLogs] = useState<RefreshLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seedingAll, setSeedingAll] = useState(false);
  const [seedAllResult, setSeedAllResult] = useState<SeedAllResult | null>(null);
  const [seedingModule, setSeedingModule] = useState<string | null>(null);
  const [seedProgress, setSeedProgress] = useState<string>('');

  const fetchFreshness = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/data-freshness');
      if (!res.ok) {
        setError(`Failed to load freshness data (HTTP ${res.status})`);
        return;
      }
      const json = await res.json();
      if (json.success) {
        setFreshnessData(json.data.dynamicContent || {});
        setRecentLogs(json.data.recentRefreshLogs || []);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFreshness();
  }, [fetchFreshness]);

  const handleSeedAll = async () => {
    setSeedingAll(true);
    setSeedAllResult(null);
    setSeedProgress('Starting seed-all pipeline...');

    try {
      const res = await fetch('/api/admin/seed-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result: SeedAllResult = await res.json();
      setSeedAllResult(result);
      setSeedProgress('');
      // Refresh freshness data after seeding
      await fetchFreshness();
    } catch (err) {
      setSeedProgress('');
      setSeedAllResult({
        success: false,
        summary: { total: 0, success: 0, errors: 1, durationMs: 0 },
        results: [
          {
            endpoint: '/api/admin/seed-all',
            status: 'error',
            message: err instanceof Error ? err.message : 'Network error',
            durationMs: 0,
          },
        ],
      });
    } finally {
      setSeedingAll(false);
    }
  };

  const handleReseedModule = async (endpoint: typeof INIT_ENDPOINTS[number]) => {
    setSeedingModule(endpoint.key);
    try {
      const res = await fetch(endpoint.path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      // Wait briefly, then refresh data
      if (res.ok) {
        setTimeout(fetchFreshness, 1500);
      }
    } catch {
      // Silent fail
    } finally {
      setSeedingModule(null);
    }
  };

  const getModuleStatus = (key: string): 'fresh' | 'stale' | 'never' => {
    const info = freshnessData[key];
    if (!info || !info.lastRefreshed) return 'never';
    if (info.stale > 0 || info.expired > 0) return 'stale';
    return 'fresh';
  };

  const getStatusColor = (status: 'fresh' | 'stale' | 'never'): string => {
    switch (status) {
      case 'fresh':
        return 'border-green-500/40 bg-green-500/5';
      case 'stale':
        return 'border-yellow-500/40 bg-yellow-500/5';
      case 'never':
        return 'border-slate-600/40 bg-slate-800/30';
    }
  };

  const getStatusDot = (status: 'fresh' | 'stale' | 'never'): string => {
    switch (status) {
      case 'fresh':
        return 'bg-green-500';
      case 'stale':
        return 'bg-yellow-500';
      case 'never':
        return 'bg-slate-500';
    }
  };

  const formatAge = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';
    const ageMs = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(ageMs / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seed All Button */}
      <ScrollReveal>
      <div className="card p-5 border border-space-600/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-white font-semibold text-lg">Seed All Data</h2>
            <p className="text-star-300 text-sm mt-1">
              Run all {INIT_ENDPOINTS.length} init endpoints sequentially in 5 phases.
            </p>
          </div>
          <button
            onClick={handleSeedAll}
            disabled={seedingAll}
            className="btn-primary py-2.5 px-8 text-sm font-semibold disabled:opacity-50 whitespace-nowrap"
          >
            {seedingAll ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Seeding...
              </span>
            ) : (
              'Seed All Endpoints'
            )}
          </button>
        </div>

        {/* Progress indicator */}
        {seedingAll && seedProgress && (
          <div className="mt-4 bg-space-700/50 rounded-lg p-3">
            <p className="text-slate-300 text-sm animate-pulse">{seedProgress}</p>
          </div>
        )}

        {/* Results summary */}
        {seedAllResult && (
          <div className="mt-4 space-y-3">
            <div
              className={`rounded-lg p-4 border ${
                seedAllResult.success
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className={`w-3 h-3 rounded-full ${seedAllResult.success ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-white font-medium">
                  {seedAllResult.success ? 'All endpoints seeded successfully' : 'Some endpoints failed'}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-star-300">
                  Total: <span className="text-white">{seedAllResult.summary.total}</span>
                </span>
                <span className="text-green-400">
                  Success: {seedAllResult.summary.success}
                </span>
                {seedAllResult.summary.errors > 0 && (
                  <span className="text-red-400">
                    Errors: {seedAllResult.summary.errors}
                  </span>
                )}
                <span className="text-star-300">
                  Duration: <span className="text-white">{(seedAllResult.summary.durationMs / 1000).toFixed(1)}s</span>
                </span>
              </div>
            </div>

            {/* Individual results */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {seedAllResult.results.map((r) => (
                <div
                  key={r.endpoint}
                  className={`rounded-lg p-2 border text-xs ${
                    r.status === 'success'
                      ? 'bg-green-500/5 border-green-500/20 text-green-400'
                      : 'bg-red-500/5 border-red-500/20 text-red-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="truncate font-medium">{r.endpoint}</span>
                  </div>
                  {r.message && (
                    <p className="text-red-300/80 mt-1 truncate pl-3">{r.message}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </ScrollReveal>

      {/* Module Initialization Grid */}
      <ScrollReveal delay={0.1}>
      <div>
        <h2 className="text-white font-semibold text-lg mb-4">Module Initialization Status</h2>
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {INIT_ENDPOINTS.map((endpoint) => {
            const status = getModuleStatus(endpoint.key);
            const info = freshnessData[endpoint.key];

            return (
              <StaggerItem key={endpoint.key}>
                <div
                  className={`card p-4 border rounded-lg ${getStatusColor(status)}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusDot(status)}`} />
                      <h3 className="text-white text-sm font-medium truncate">{endpoint.label}</h3>
                    </div>
                    <button
                      onClick={() => handleReseedModule(endpoint)}
                      disabled={seedingModule !== null}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors flex-shrink-0 ${
                        seedingModule === endpoint.key
                          ? 'bg-white/10 border-white/15 text-slate-200 animate-pulse'
                          : 'bg-space-700/50 border-space-600/30 text-star-300 hover:bg-space-600/50 hover:text-white'
                      } disabled:opacity-50`}
                    >
                      {seedingModule === endpoint.key ? '...' : 'Re-seed'}
                    </button>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex justify-between text-star-300">
                      <span>Last seeded:</span>
                      <span className={
                        status === 'fresh' ? 'text-green-400' :
                        status === 'stale' ? 'text-yellow-400' :
                        'text-slate-500'
                      }>
                        {info?.lastRefreshed ? formatAge(info.lastRefreshed) : 'Never'}
                      </span>
                    </div>
                    <div className="flex justify-between text-star-300">
                      <span>Records:</span>
                      <span className="text-white">{info?.total || 0}</span>
                    </div>
                    {info && info.active > 0 && (
                      <div className="flex justify-between text-star-300">
                        <span>Active:</span>
                        <span className="text-green-400">{info.active}</span>
                      </div>
                    )}
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
      </ScrollReveal>

      {/* Recent Seed Logs */}
      {recentLogs.length > 0 && (
        <ScrollReveal delay={0.15}>
        <div className="card border border-space-600/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-space-600/50 bg-space-700/30">
            <h2 className="text-white font-semibold text-sm">Recent Activity</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-star-300 text-xs uppercase">
                  <th className="text-left px-3 py-2">Time</th>
                  <th className="text-left px-3 py-2">Module</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-space-600/30">
                {recentLogs.slice(0, 20).map((log) => (
                  <tr key={log.id} className="hover:bg-space-700/20">
                    <td className="px-3 py-2 text-star-300 text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('en-US', { timeZone: 'UTC' })}
                    </td>
                    <td className="px-3 py-2 text-white font-medium">{log.module}</td>
                    <td className="px-3 py-2 text-star-300">{log.refreshType}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          log.status === 'success'
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : log.status === 'partial'
                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-star-300">{log.itemsUpdated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </ScrollReveal>
      )}
    </div>
  );
}

// --------------- Feature Requests ---------------

function FeatureRequestList({ items, onUpdate }: { items: FeatureRequest[]; onUpdate: () => void }) {
  if (items.length === 0) {
    return <p className="text-star-300 text-center py-12">No feature requests yet.</p>;
  }

  return (
    <StaggerContainer className="space-y-4">
      {items.map((item) => (
        <StaggerItem key={item.id}>
          <FeatureRequestItem item={item} onUpdate={onUpdate} />
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}

function FeatureRequestItem({ item, onUpdate }: { item: FeatureRequest; onUpdate: () => void }) {
  const [status, setStatus] = useState(item.status);
  const [adminNotes, setAdminNotes] = useState(item.adminNotes || '');
  const [saving, setSaving] = useState(false);

  const moduleName = item.module
    ? AVAILABLE_MODULES.find((m) => m.moduleId === item.module)?.name || item.module
    : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/feature-requests/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes }),
      });
      if (res.ok) onUpdate();
    } catch (err) {
      clientLogger.error('Error saving', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  };

  const statusInfo = FEATURE_REQUEST_STATUSES.find((s) => s.value === item.status);

  return (
    <div className="card p-5 border border-space-600/50">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-white font-semibold">{item.title}</h3>
          <p className="text-star-300 text-sm">
            {item.email} &middot; {new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })} &middot;{' '}
            {item.type === 'existing_module' ? `Module: ${moduleName}` : 'New Module'}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${statusInfo?.color || 'bg-slate-500'} text-white`}>
          {statusInfo?.label || item.status}
        </span>
      </div>
      <p className="text-star-200 text-sm mb-4 whitespace-pre-wrap">{item.details}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as FeatureRequest['status'])}
          className="input text-sm flex-shrink-0"
        >
          {FEATURE_REQUEST_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Admin notes..."
          rows={1}
          className="input text-sm flex-1 resize-none"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-sm py-1.5 px-4 flex-shrink-0 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// --------------- Help Requests ---------------

function HelpRequestList({ items, onUpdate }: { items: HelpRequest[]; onUpdate: () => void }) {
  if (items.length === 0) {
    return <p className="text-star-300 text-center py-12">No help requests yet.</p>;
  }

  return (
    <StaggerContainer className="space-y-4">
      {items.map((item) => (
        <StaggerItem key={item.id}>
          <HelpRequestItem item={item} onUpdate={onUpdate} />
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}

function HelpRequestItem({ item, onUpdate }: { item: HelpRequest; onUpdate: () => void }) {
  const [status, setStatus] = useState(item.status);
  const [adminResponse, setAdminResponse] = useState(item.adminResponse || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/help-requests/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminResponse }),
      });
      if (res.ok) onUpdate();
    } catch (err) {
      clientLogger.error('Error saving', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  };

  const statusInfo = HELP_REQUEST_STATUSES.find((s) => s.value === item.status);

  return (
    <div className="card p-5 border border-space-600/50">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-white font-semibold">{item.subject}</h3>
          <p className="text-star-300 text-sm">
            {item.email} &middot; {new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${statusInfo?.color || 'bg-slate-500'} text-white`}>
          {statusInfo?.label || item.status}
        </span>
      </div>
      <p className="text-star-200 text-sm mb-4 whitespace-pre-wrap">{item.details}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as HelpRequest['status'])}
          className="input text-sm flex-shrink-0"
        >
          {HELP_REQUEST_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <textarea
          value={adminResponse}
          onChange={(e) => setAdminResponse(e.target.value)}
          placeholder="Admin response..."
          rows={1}
          className="input text-sm flex-1 resize-none"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-sm py-1.5 px-4 flex-shrink-0 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
