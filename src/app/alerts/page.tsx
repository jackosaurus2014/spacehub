'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import AlertRuleBuilder from '@/components/alerts/AlertRuleBuilder';
import { toast } from '@/lib/toast';

// ============================================================
// Types
// ============================================================

interface AlertRule {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  channels: string[];
  emailFrequency: string;
  isActive: boolean;
  priority: string;
  lastTriggeredAt: string | null;
  triggerCount: number;
  cooldownMinutes: number;
  createdAt: string;
  updatedAt: string;
  _count: { deliveries: number };
}

interface AlertDelivery {
  id: string;
  alertRuleId: string | null;
  channel: string;
  status: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  source: string;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
  alertRule: {
    name: string;
    triggerType: string;
    priority: string;
  } | null;
}

interface AlertStats {
  totalRules: number;
  activeRules: number;
  totalDeliveries: number;
  deliveriesToday: number;
}

interface SavedSearch {
  id: string;
  name: string;
  searchType: string;
  filters: Record<string, unknown>;
  query: string | null;
  alertEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

type Tab = 'alerts' | 'notifications' | 'saved-searches';

// ============================================================
// Constants
// ============================================================

const TRIGGER_TYPE_LABELS: Record<string, string> = {
  keyword: 'Keyword Watch',
  price_threshold: 'Price Threshold',
  regulatory_filing: 'Regulatory Filing',
  launch_status: 'Launch Status',
  contract_award: 'Contract Award',
  funding_round: 'Funding Round',
  weather_severity: 'Space Weather',
};

const TRIGGER_TYPE_ICONS: Record<string, string> = {
  keyword: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  price_threshold: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  regulatory_filing: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  launch_status: 'M13 10V3L4 14h7v7l9-11h-7z',
  contract_award: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  funding_round: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  weather_severity: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
};

const TRIGGER_TYPE_COLORS: Record<string, string> = {
  keyword: 'text-cyan-400',
  price_threshold: 'text-emerald-400',
  regulatory_filing: 'text-amber-400',
  launch_status: 'text-orange-400',
  contract_award: 'text-purple-400',
  funding_round: 'text-green-400',
  weather_severity: 'text-yellow-400',
};

const CHANNEL_LABELS: Record<string, string> = {
  in_app: 'In-App',
  email: 'Email',
  push: 'Push',
  webhook: 'Webhook',
};

const CHANNEL_ICONS: Record<string, string> = {
  in_app: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  email: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  push: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
  webhook: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-700/60 text-slate-300',
  normal: 'bg-cyan-900/50 text-cyan-300',
  high: 'bg-orange-900/50 text-orange-300',
  critical: 'bg-red-900/50 text-red-300',
};

const SEARCH_TYPE_LABELS: Record<string, string> = {
  company_directory: 'Company Directory',
  marketplace_listings: 'Marketplace Listings',
  marketplace_rfqs: 'RFQ Search',
};

const SEARCH_TYPE_ROUTES: Record<string, string> = {
  company_directory: '/company-profiles',
  marketplace_listings: '/marketplace/search',
  marketplace_rfqs: '/marketplace/search?tab=rfqs',
};

// ============================================================
// Inner component (uses searchParams)
// ============================================================

function AlertsPageInner() {
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentTab = (searchParams.get('tab') as Tab) || 'alerts';

  // Data state
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [deliveries, setDeliveries] = useState<AlertDelivery[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [deliveriesTotal, setDeliveriesTotal] = useState(0);
  const [deliveriesHasMore, setDeliveriesHasMore] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [togglingRuleId, setTogglingRuleId] = useState<string | null>(null);
  const [deletingSavedSearchId, setDeletingSavedSearchId] = useState<string | null>(null);
  const [loadingMoreDeliveries, setLoadingMoreDeliveries] = useState(false);

  // ============================================================
  // Tab navigation
  // ============================================================

  const setTab = useCallback(
    (tab: Tab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === 'alerts') {
        params.delete('tab');
      } else {
        params.set('tab', tab);
      }
      const query = params.toString();
      router.push(`${pathname}${query ? '?' + query : ''}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // ============================================================
  // Data fetching
  // ============================================================

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      if (res.ok) {
        const json = await res.json();
        setRules(json.data.rules);
        setStats(json.data.stats);
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchDeliveries = useCallback(async (offset = 0, append = false) => {
    try {
      const res = await fetch(`/api/alerts/deliveries?limit=30&offset=${offset}`);
      if (res.ok) {
        const json = await res.json();
        if (append) {
          setDeliveries((prev) => [...prev, ...json.data.deliveries]);
        } else {
          setDeliveries(json.data.deliveries);
        }
        setUnreadCount(json.data.unreadCount);
        setDeliveriesTotal(json.data.total);
        setDeliveriesHasMore(json.data.hasMore);
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchSavedSearches = useCallback(async () => {
    try {
      const res = await fetch('/api/saved-searches');
      if (res.ok) {
        const json = await res.json();
        setSavedSearches(json.data.savedSearches || []);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      Promise.all([fetchRules(), fetchDeliveries(), fetchSavedSearches()]).finally(() =>
        setLoading(false)
      );
    } else if (sessionStatus === 'unauthenticated') {
      setLoading(false);
    }
  }, [sessionStatus, fetchRules, fetchDeliveries, fetchSavedSearches]);

  // ============================================================
  // Alert rule actions
  // ============================================================

  const toggleRule = async (ruleId: string, isActive: boolean) => {
    setTogglingRuleId(ruleId);
    try {
      const res = await fetch(`/api/alerts/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) {
        setRules((prev) =>
          prev.map((r) =>
            r.id === ruleId ? { ...r, isActive: !isActive } : r
          )
        );
        toast.success(isActive ? 'Alert paused' : 'Alert activated');
      } else {
        toast.error('Failed to update alert');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setTogglingRuleId(null);
    }
  };

  const deleteRule = async (ruleId: string) => {
    setDeletingRuleId(ruleId);
    try {
      const res = await fetch(`/api/alerts/${ruleId}`, { method: 'DELETE' });
      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.id !== ruleId));
        setStats((prev) =>
          prev
            ? {
                ...prev,
                totalRules: prev.totalRules - 1,
                activeRules: rules.find((r) => r.id === ruleId)?.isActive
                  ? prev.activeRules - 1
                  : prev.activeRules,
              }
            : prev
        );
        toast.success('Alert rule deleted');
      } else {
        toast.error('Failed to delete alert');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setDeletingRuleId(null);
    }
  };

  // ============================================================
  // Notification actions
  // ============================================================

  const markAsRead = async (ids: string[]) => {
    try {
      const res = await fetch('/api/alerts/deliveries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setDeliveries((prev) =>
          prev.map((d) =>
            ids.includes(d.id)
              ? { ...d, status: 'read', readAt: new Date().toISOString() }
              : d
          )
        );
        const unreadIdsSet = new Set(ids);
        const markedCount = deliveries.filter(
          (d) => unreadIdsSet.has(d.id) && !d.readAt && d.status !== 'read'
        ).length;
        setUnreadCount((prev) => Math.max(0, prev - markedCount));
      }
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const markAllRead = async () => {
    const unreadIds = deliveries
      .filter((d) => !d.readAt && d.status !== 'read')
      .map((d) => d.id);
    if (unreadIds.length > 0) {
      await markAsRead(unreadIds);
      toast.success('All notifications marked as read');
    }
  };

  const loadMoreDeliveries = async () => {
    setLoadingMoreDeliveries(true);
    await fetchDeliveries(deliveries.length, true);
    setLoadingMoreDeliveries(false);
  };

  // ============================================================
  // Saved search actions
  // ============================================================

  const toggleSavedSearchAlert = async (searchId: string, currentlyEnabled: boolean) => {
    try {
      const res = await fetch(`/api/saved-searches/${searchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertEnabled: !currentlyEnabled }),
      });
      if (res.ok) {
        setSavedSearches((prev) =>
          prev.map((s) =>
            s.id === searchId ? { ...s, alertEnabled: !currentlyEnabled } : s
          )
        );
        toast.success(currentlyEnabled ? 'Alerts disabled for this search' : 'Alerts enabled for this search');
      }
    } catch {
      toast.error('Failed to update saved search');
    }
  };

  const deleteSavedSearch = async (searchId: string) => {
    setDeletingSavedSearchId(searchId);
    try {
      const res = await fetch(`/api/saved-searches/${searchId}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedSearches((prev) => prev.filter((s) => s.id !== searchId));
        toast.success('Saved search deleted');
      } else {
        toast.error('Failed to delete saved search');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setDeletingSavedSearchId(null);
    }
  };

  // ============================================================
  // Helpers
  // ============================================================

  const formatRelativeTime = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  };

  const buildSearchUrl = (search: SavedSearch): string => {
    const base = SEARCH_TYPE_ROUTES[search.searchType] || '/company-profiles';
    const params = new URLSearchParams();
    if (search.query) {
      params.set('q', search.query);
    }
    // Add filter params
    const filters = search.filters as Record<string, unknown>;
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            if (value.length > 0) params.set(key, value.join(','));
          } else {
            params.set(key, String(value));
          }
        }
      });
    }
    const qs = params.toString();
    return qs ? `${base}${base.includes('?') ? '&' : '?'}${qs}` : base;
  };

  const getFilterSummary = (search: SavedSearch): string => {
    const parts: string[] = [];
    if (search.query) parts.push(`"${search.query}"`);
    const filters = search.filters as Record<string, unknown>;
    if (filters) {
      const filterCount = Object.entries(filters).filter(
        ([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
      ).length;
      if (filterCount > 0) {
        parts.push(`${filterCount} filter${filterCount > 1 ? 's' : ''}`);
      }
    }
    return parts.length > 0 ? parts.join(', ') : 'No filters';
  };

  const getTriggerConfigPreview = (rule: AlertRule): string => {
    const config = rule.triggerConfig;
    switch (rule.triggerType) {
      case 'keyword': {
        const kws = (config.keywords as string[]) || [];
        return kws.length > 0 ? kws.slice(0, 3).join(', ') + (kws.length > 3 ? ` +${kws.length - 3}` : '') : '';
      }
      case 'price_threshold':
        return `${config.ticker || ''} ${config.condition === 'above' ? '>' : config.condition === 'below' ? '<' : '~'} ${config.condition === 'percent_change' ? config.value + '%' : '$' + config.value}`;
      case 'regulatory_filing': {
        const agencies = (config.agencies as string[]) || [];
        return agencies.length > 0 ? agencies.join(', ') : 'All agencies';
      }
      case 'launch_status': {
        const providers = (config.providers as string[]) || [];
        return providers.length > 0 ? providers.join(', ') : 'All providers';
      }
      case 'contract_award': {
        const agencies = (config.agencies as string[]) || [];
        const minVal = config.minValue as number;
        const parts: string[] = [];
        if (agencies.length > 0) parts.push(agencies.join(', '));
        if (minVal) parts.push(`>$${minVal}M`);
        return parts.length > 0 ? parts.join(' | ') : 'All contracts';
      }
      case 'funding_round': {
        const sectors = (config.sectors as string[]) || [];
        return sectors.length > 0 ? sectors.map((s: string) => s.replace(/_/g, ' ')).join(', ') : 'All sectors';
      }
      case 'weather_severity':
        return `Kp >= ${config.minKpIndex ?? 5}`;
      default:
        return '';
    }
  };

  // ============================================================
  // Loading / Auth states
  // ============================================================

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading alerts...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <svg
            className="w-16 h-16 text-cyan-400 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <h1 className="text-2xl font-bold text-white mb-2">Smart Alerts</h1>
          <p className="text-slate-400 mb-6">
            Sign in to create custom alert rules and receive notifications for space industry events.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================
  // Render: Tab — My Alerts
  // ============================================================

  const renderAlertsTab = () => (
    <div className="space-y-4">
      {rules.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-xl">
          <svg
            className="w-14 h-14 text-slate-600 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No alert rules yet</h3>
          <p className="text-slate-400 mb-6 max-w-sm mx-auto">
            Create your first alert rule to get notified about space industry events that matter to you.
          </p>
          <button
            onClick={() => setShowRuleBuilder(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Your First Alert
          </button>
        </div>
      ) : (
        rules.map((rule) => (
          <div
            key={rule.id}
            className={`bg-slate-900/80 border rounded-xl p-5 transition-all hover:border-slate-600 ${
              rule.isActive ? 'border-slate-700' : 'border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Title Row */}
                <div className="flex items-center gap-3 mb-1.5">
                  <svg
                    className={`w-5 h-5 flex-shrink-0 ${TRIGGER_TYPE_COLORS[rule.triggerType] || 'text-cyan-400'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={TRIGGER_TYPE_ICONS[rule.triggerType] || TRIGGER_TYPE_ICONS.keyword}
                    />
                  </svg>
                  <h3 className="text-base font-semibold text-white truncate">{rule.name}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[rule.priority]}`}
                  >
                    {rule.priority}
                  </span>
                  {!rule.isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 font-medium">
                      Paused
                    </span>
                  )}
                </div>

                {/* Description */}
                {rule.description && (
                  <p className="text-sm text-slate-400 mb-2 ml-8">{rule.description}</p>
                )}

                {/* Config Preview */}
                <p className="text-xs text-slate-500 mb-2.5 ml-8 italic">
                  {getTriggerConfigPreview(rule)}
                </p>

                {/* Meta Row */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 ml-8">
                  <span className="inline-flex items-center gap-1 bg-slate-800 px-2 py-1 rounded">
                    {TRIGGER_TYPE_LABELS[rule.triggerType] || rule.triggerType}
                  </span>
                  {rule.channels.map((ch) => (
                    <span
                      key={ch}
                      className="inline-flex items-center gap-1 bg-slate-800 px-2 py-1 rounded"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={CHANNEL_ICONS[ch] || CHANNEL_ICONS.in_app}
                        />
                      </svg>
                      {CHANNEL_LABELS[ch] || ch}
                    </span>
                  ))}
                  <span className="text-slate-600">|</span>
                  <span>{rule.triggerCount} trigger{rule.triggerCount !== 1 ? 's' : ''}</span>
                  <span className="text-slate-600">|</span>
                  <span>{rule._count.deliveries} notification{rule._count.deliveries !== 1 ? 's' : ''}</span>
                  {rule.lastTriggeredAt && (
                    <>
                      <span className="text-slate-600">|</span>
                      <span>Last: {formatRelativeTime(rule.lastTriggeredAt)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Toggle Switch */}
                <button
                  onClick={() => toggleRule(rule.id, rule.isActive)}
                  disabled={togglingRuleId === rule.id}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    rule.isActive ? 'bg-cyan-600' : 'bg-slate-700'
                  } ${togglingRuleId === rule.id ? 'opacity-50' : ''}`}
                  title={rule.isActive ? 'Pause alert' : 'Activate alert'}
                  aria-label={rule.isActive ? 'Pause alert' : 'Activate alert'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      rule.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this alert rule? This cannot be undone.')) {
                      deleteRule(rule.id);
                    }
                  }}
                  disabled={deletingRuleId === rule.id}
                  className={`p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-md hover:bg-red-900/20 ${
                    deletingRuleId === rule.id ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title="Delete alert rule"
                  aria-label="Delete alert rule"
                >
                  {deletingRuleId === rule.id ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ============================================================
  // Render: Tab — Notifications
  // ============================================================

  const renderNotificationsTab = () => (
    <div>
      {/* Header with Mark All Read */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-400">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
          <button
            onClick={markAllRead}
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
          >
            Mark All Read
          </button>
        </div>
      )}

      {deliveries.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-xl">
          <svg
            className="w-14 h-14 text-slate-600 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No notifications yet</h3>
          <p className="text-slate-400 max-w-sm mx-auto">
            When your alert rules are triggered, notifications will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {deliveries.map((delivery) => {
            const isUnread = !delivery.readAt && delivery.status !== 'read';
            const isExpanded = expandedDeliveryId === delivery.id;
            const priorityColor =
              delivery.alertRule?.priority
                ? PRIORITY_COLORS[delivery.alertRule.priority]
                : '';

            return (
              <div
                key={delivery.id}
                className={`bg-slate-900/80 border rounded-xl transition-all cursor-pointer ${
                  isUnread
                    ? 'border-cyan-800/50 bg-cyan-950/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
                onClick={() => {
                  if (isUnread) markAsRead([delivery.id]);
                  setExpandedDeliveryId(isExpanded ? null : delivery.id);
                }}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Unread indicator */}
                    <div className="flex-shrink-0 mt-1.5">
                      {isUnread ? (
                        <span className="block w-2.5 h-2.5 bg-cyan-400 rounded-full ring-2 ring-cyan-400/30" />
                      ) : (
                        <span className="block w-2.5 h-2.5 bg-slate-700 rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4
                          className={`text-sm font-semibold truncate ${
                            isUnread ? 'text-white' : 'text-slate-300'
                          }`}
                        >
                          {delivery.title}
                        </h4>
                        {delivery.alertRule?.priority && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${priorityColor}`}>
                            {delivery.alertRule.priority}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${isUnread ? 'text-slate-300' : 'text-slate-400'} ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {delivery.message}
                      </p>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d={CHANNEL_ICONS[delivery.channel] || CHANNEL_ICONS.in_app}
                            />
                          </svg>
                          {CHANNEL_LABELS[delivery.channel] || delivery.channel}
                        </span>
                        {delivery.alertRule && (
                          <span className="text-slate-500">{delivery.alertRule.name}</span>
                        )}
                        <span className="text-slate-600">|</span>
                        <span>{formatRelativeTime(delivery.createdAt)}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            delivery.status === 'read'
                              ? 'bg-slate-800 text-slate-500'
                              : delivery.status === 'delivered' || delivery.status === 'sent'
                                ? 'bg-green-900/40 text-green-400'
                                : delivery.status === 'failed'
                                  ? 'bg-red-900/40 text-red-400'
                                  : 'bg-yellow-900/40 text-yellow-400'
                          }`}
                        >
                          {delivery.status}
                        </span>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && delivery.data && (
                        <div className="mt-3 pt-3 border-t border-slate-800">
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Details</p>
                          <div className="bg-slate-800/60 rounded-lg p-3 text-xs text-slate-400 font-mono overflow-x-auto">
                            <pre className="whitespace-pre-wrap break-all">
                              {JSON.stringify(delivery.data, null, 2)}
                            </pre>
                          </div>
                          {delivery.source && delivery.source !== 'alert_rule' && (
                            <p className="text-xs text-slate-500 mt-2">
                              Source: {delivery.source}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expand chevron */}
                    <svg
                      className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Load More */}
          {deliveriesHasMore && (
            <div className="text-center pt-4">
              <button
                onClick={loadMoreDeliveries}
                disabled={loadingMoreDeliveries}
                className="px-5 py-2 text-sm text-cyan-400 hover:text-cyan-300 border border-slate-700 hover:border-slate-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {loadingMoreDeliveries ? (
                  <span className="flex items-center gap-2 justify-center">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading...
                  </span>
                ) : (
                  `Load More (${deliveriesTotal - deliveries.length} remaining)`
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ============================================================
  // Render: Tab — Saved Searches
  // ============================================================

  const renderSavedSearchesTab = () => (
    <div>
      {savedSearches.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-xl">
          <svg
            className="w-14 h-14 text-slate-600 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No saved searches</h3>
          <p className="text-slate-400 max-w-sm mx-auto mb-6">
            Save searches from the Company Directory or Marketplace to quickly re-run them and get alerts on new matches.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/company-profiles"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors border border-slate-700"
            >
              Browse Companies
            </Link>
            <Link
              href="/marketplace/search"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors border border-slate-700"
            >
              Marketplace Search
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {savedSearches.map((search) => (
            <div
              key={search.id}
              className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <svg
                      className="w-4 h-4 text-purple-400 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                    <h3 className="text-sm font-semibold text-white truncate">{search.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 font-medium">
                      {SEARCH_TYPE_LABELS[search.searchType] || search.searchType}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mb-2 ml-6.5">
                    {getFilterSummary(search)}
                  </p>

                  <div className="flex items-center gap-3 ml-6.5">
                    {/* Re-run link */}
                    <Link
                      href={buildSearchUrl(search)}
                      className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Run Search
                    </Link>
                    <span className="text-slate-700">|</span>
                    <span className="text-xs text-slate-500">
                      Saved {formatRelativeTime(search.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Alert toggle */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Alerts</span>
                    <button
                      onClick={() => toggleSavedSearchAlert(search.id, search.alertEnabled)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        search.alertEnabled ? 'bg-cyan-600' : 'bg-slate-700'
                      }`}
                      title={search.alertEnabled ? 'Disable alerts' : 'Enable alerts'}
                      aria-label={search.alertEnabled ? 'Disable alerts' : 'Enable alerts'}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          search.alertEnabled ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      if (confirm('Delete this saved search?')) {
                        deleteSavedSearch(search.id);
                      }
                    }}
                    disabled={deletingSavedSearchId === search.id}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-md hover:bg-red-900/20"
                    title="Delete saved search"
                    aria-label="Delete saved search"
                  >
                    {deletingSavedSearchId === search.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============================================================
  // Main Render
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
          <AnimatedPageHeader
            title="Smart Alerts"
            subtitle="Create custom alert rules and manage notifications for space industry events."
            icon={
              <svg
                className="w-8 h-8 text-cyan-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            }
            accentColor="cyan"
            breadcrumb="Alerts & Notifications"
          >
            <button
              onClick={() => setShowRuleBuilder(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors mt-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Alert
            </button>
          </AnimatedPageHeader>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Active Rules</p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">{stats.activeRules}</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Rules</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.totalRules}</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Triggered Today</p>
              <p className="text-2xl font-bold text-orange-400 mt-1">{stats.deliveriesToday}</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Total Notifications</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.totalDeliveries}</p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-slate-900/60 rounded-lg p-1 w-fit border border-slate-800">
          <button
            onClick={() => setTab('alerts')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentTab === 'alerts'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            My Alerts
          </button>
          <button
            onClick={() => setTab('notifications')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
              currentTab === 'notifications'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            Notifications
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('saved-searches')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentTab === 'saved-searches'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Saved Searches
            {savedSearches.length > 0 && (
              <span className="ml-1 text-xs bg-slate-700 text-slate-300 rounded-full px-1.5 py-0.5">
                {savedSearches.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {currentTab === 'alerts' && renderAlertsTab()}
        {currentTab === 'notifications' && renderNotificationsTab()}
        {currentTab === 'saved-searches' && renderSavedSearchesTab()}

        {/* Alert Rule Builder Modal */}
        {showRuleBuilder && (
          <AlertRuleBuilder
            onClose={() => setShowRuleBuilder(false)}
            onCreated={() => {
              setShowRuleBuilder(false);
              fetchRules();
            }}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// Page wrapper with Suspense boundary
// ============================================================

export default function AlertsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4" />
            <p className="text-slate-400">Loading alerts...</p>
          </div>
        </div>
      }
    >
      <AlertsPageInner />
    </Suspense>
  );
}
