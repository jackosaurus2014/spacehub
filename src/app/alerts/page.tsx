'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import AlertRuleBuilder from '@/components/alerts/AlertRuleBuilder';
import PremiumGate from '@/components/PremiumGate';
import { toast } from '@/lib/toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

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

type Tab = 'alerts' | 'notifications' | 'saved-searches' | 'webhooks' | 'preferences';

interface AlertPreferences {
  alertDigestMode: 'instant' | 'hourly' | 'daily' | 'weekly';
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  quietHoursTimezone: string;
}

interface WebhookConfig {
  id: string;
  name: string;
  type: 'slack' | 'discord';
  url: string;
  enabled: boolean;
  createdAt: string;
  lastDeliveryAt?: string;
  lastDeliverySuccess?: boolean;
}

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
  keyword: 'text-white/70',
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
  low: 'bg-white/[0.06] text-white/70',
  normal: 'bg-white/[0.04] text-white/90',
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

  // Webhook state
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [webhookName, setWebhookName] = useState('');
  const [webhookType, setWebhookType] = useState<'slack' | 'discord'>('slack');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [addingWebhook, setAddingWebhook] = useState(false);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [deletingWebhookId, setDeletingWebhookId] = useState<string | null>(null);
  const [loadingMoreDeliveries, setLoadingMoreDeliveries] = useState(false);

  // Preferences state
  const [prefs, setPrefs] = useState<AlertPreferences>({
    alertDigestMode: 'instant',
    quietHoursStart: null,
    quietHoursEnd: null,
    quietHoursTimezone: 'UTC',
  });
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

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

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts/webhooks');
      if (res.ok) {
        const json = await res.json();
        setWebhooks(json.data.webhooks || []);
      }
    } catch {
      // silently fail
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch('/api/account/notification-preferences');
      if (res.ok) {
        const json = await res.json();
        const data = json.data;
        setPrefs({
          alertDigestMode: data.alertDigestMode || 'instant',
          quietHoursStart: data.quietHoursStart ?? null,
          quietHoursEnd: data.quietHoursEnd ?? null,
          quietHoursTimezone: data.quietHoursTimezone || 'UTC',
        });
        setQuietHoursEnabled(data.quietHoursStart !== null && data.quietHoursEnd !== null);
        setPrefsLoaded(true);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      Promise.all([fetchRules(), fetchDeliveries(), fetchSavedSearches(), fetchWebhooks(), fetchPreferences()]).finally(() =>
        setLoading(false)
      );
    } else if (sessionStatus === 'unauthenticated') {
      setLoading(false);
    }
  }, [sessionStatus, fetchRules, fetchDeliveries, fetchSavedSearches, fetchWebhooks, fetchPreferences]);

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
  // Webhook actions
  // ============================================================

  const addWebhook = async () => {
    if (!webhookName.trim() || !webhookUrl.trim()) {
      toast.error('Name and URL are required');
      return;
    }

    setAddingWebhook(true);
    try {
      const res = await fetch('/api/alerts/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: webhookName.trim(),
          type: webhookType,
          url: webhookUrl.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setWebhooks((prev) => [...prev, json.data.webhook]);
        setWebhookName('');
        setWebhookUrl('');
        toast.success('Webhook added successfully');
      } else {
        toast.error(json.error?.message || 'Failed to add webhook');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setAddingWebhook(false);
    }
  };

  const testWebhook = async (webhookId: string) => {
    setTestingWebhookId(webhookId);
    try {
      const res = await fetch('/api/alerts/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', webhookId }),
      });

      const json = await res.json();
      if (res.ok && json.data.delivered) {
        setWebhooks((prev) =>
          prev.map((w) =>
            w.id === webhookId ? json.data.webhook : w
          )
        );
        toast.success('Test message sent successfully!');
      } else if (res.ok && !json.data.delivered) {
        setWebhooks((prev) =>
          prev.map((w) =>
            w.id === webhookId ? json.data.webhook : w
          )
        );
        toast.error('Test message failed to deliver. Check your webhook URL.');
      } else {
        toast.error(json.error?.message || 'Failed to test webhook');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setTestingWebhookId(null);
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    setDeletingWebhookId(webhookId);
    try {
      const res = await fetch(`/api/alerts/webhooks?id=${webhookId}`, { method: 'DELETE' });
      if (res.ok) {
        setWebhooks((prev) => prev.filter((w) => w.id !== webhookId));
        toast.success('Webhook removed');
      } else {
        toast.error('Failed to delete webhook');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setDeletingWebhookId(null);
    }
  };

  // ============================================================
  // Preferences actions
  // ============================================================

  const savePreferences = async () => {
    setSavingPrefs(true);
    try {
      const payload: Record<string, unknown> = {
        alertDigestMode: prefs.alertDigestMode,
        quietHoursTimezone: prefs.quietHoursTimezone,
      };

      if (quietHoursEnabled) {
        payload.quietHoursStart = prefs.quietHoursStart ?? 22;
        payload.quietHoursEnd = prefs.quietHoursEnd ?? 7;
      } else {
        payload.quietHoursStart = null;
        payload.quietHoursEnd = null;
      }

      const res = await fetch('/api/account/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success('Alert preferences saved');
        fetchPreferences();
      } else {
        toast.error('Failed to save preferences');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSavingPrefs(false);
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
          <LoadingSpinner size="lg" />
          <p className="text-slate-400">Loading alerts...</p>

        <RelatedModules modules={PAGE_RELATIONS['alerts']} />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <svg
            className="w-16 h-16 text-white/70 mx-auto mb-4"
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
            className="inline-block px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 font-medium rounded-lg transition-colors"
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
        <div className="text-center py-20 bg-black/50 border border-white/[0.06] rounded-xl">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/20 flex items-center justify-center mb-6">
            <svg
              className="w-10 h-10 text-orange-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Set up smart alerts</h3>
          <p className="text-slate-400 mb-2 max-w-md mx-auto">
            Stay informed about launches, funding rounds, contract awards, and industry events that matter to you.
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
            Configure keyword watches, price thresholds, launch status changes, and more. Get notified via email, in-app, or webhook.
          </p>
          <button
            onClick={() => setShowRuleBuilder(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-medium rounded-lg transition-colors"
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
            className={`bg-black/80 border rounded-xl p-5 transition-all hover:border-white/[0.1] ${
              rule.isActive ? 'border-white/[0.08]' : 'border-white/[0.06] opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Title Row */}
                <div className="flex items-center gap-3 mb-1.5">
                  <svg
                    className={`w-5 h-5 flex-shrink-0 ${TRIGGER_TYPE_COLORS[rule.triggerType] || 'text-white/70'}`}
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
                  <span className="inline-flex items-center gap-1 bg-white/[0.06] px-2 py-1 rounded">
                    {TRIGGER_TYPE_LABELS[rule.triggerType] || rule.triggerType}
                  </span>
                  {rule.channels.map((ch) => (
                    <span
                      key={ch}
                      className="inline-flex items-center gap-1 bg-white/[0.06] px-2 py-1 rounded"
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
                    rule.isActive ? 'bg-white' : 'bg-white/[0.08]'
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
            className="text-sm text-white/70 hover:text-white transition-colors font-medium"
          >
            Mark All Read
          </button>
        </div>
      )}

      {deliveries.length === 0 ? (
        <EmptyState
          icon={<span className="text-4xl">🔔</span>}
          title="No notifications yet"
          description="When your alert rules are triggered, notifications will appear here."
        />
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
                className={`bg-black/80 border rounded-xl transition-all cursor-pointer ${
                  isUnread
                    ? 'border-white/10 bg-slate-900/10'
                    : 'border-white/[0.06] hover:border-white/[0.08]'
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
                        <span className="block w-2.5 h-2.5 bg-white rounded-full ring-2 ring-white/10" />
                      ) : (
                        <span className="block w-2.5 h-2.5 bg-white/[0.08] rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4
                          className={`text-sm font-semibold truncate ${
                            isUnread ? 'text-white' : 'text-white/70'
                          }`}
                        >
                          {delivery.title}
                        </h4>
                        {delivery.alertRule?.priority && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${priorityColor}`}>
                            {delivery.alertRule.priority}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${isUnread ? 'text-white/70' : 'text-slate-400'} ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {delivery.message}
                      </p>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 bg-white/[0.06] px-1.5 py-0.5 rounded">
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
                          className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            delivery.status === 'read'
                              ? 'bg-white/[0.06] text-slate-500'
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
                        <div className="mt-3 pt-3 border-t border-white/[0.06]">
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Details</p>
                          <div className="bg-white/[0.05] rounded-lg p-3 text-xs text-slate-400 font-mono overflow-x-auto">
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
                className="px-5 py-2 text-sm text-white/70 hover:text-white border border-white/[0.08] hover:border-white/[0.1] rounded-lg transition-colors disabled:opacity-50"
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
        <div className="text-center py-20 bg-black/50 border border-white/[0.06] rounded-xl">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 flex items-center justify-center mb-6">
            <svg
              className="w-10 h-10 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No saved searches</h3>
          <p className="text-slate-400 mb-2 max-w-md mx-auto">
            Save searches from the Company Directory or Marketplace to quickly re-run them and get alerts on new matches.
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
            Enable alerts on any saved search to be notified automatically when new results appear.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/company-profiles"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Browse Companies
            </Link>
            <Link
              href="/marketplace/search"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-white/[0.1] text-white text-sm font-medium rounded-lg transition-colors"
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
              className="bg-black/80 border border-white/[0.08] rounded-xl p-4 hover:border-white/[0.1] transition-all"
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
                      className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors"
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
                        search.alertEnabled ? 'bg-white' : 'bg-white/[0.08]'
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
  // Render: Tab — Preferences
  // ============================================================

  const DIGEST_MODE_OPTIONS: { value: AlertPreferences['alertDigestMode']; label: string; description: string }[] = [
    { value: 'instant', label: 'Instant', description: 'Deliver alerts immediately as they trigger' },
    { value: 'hourly', label: 'Hourly Digest', description: 'Bundle alerts into an hourly summary email' },
    { value: 'daily', label: 'Daily Digest', description: 'Receive one daily summary of all alerts' },
    { value: 'weekly', label: 'Weekly Digest', description: 'Receive a weekly summary every Monday' },
  ];

  const COMMON_TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Berlin',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
  ];

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12:00 AM';
    if (hour === 12) return '12:00 PM';
    if (hour < 12) return `${hour}:00 AM`;
    return `${hour - 12}:00 PM`;
  };

  const renderPreferencesTab = () => (
    <div className="space-y-6 max-w-2xl">
      {/* Delivery Mode */}
      <div className="bg-black/80 border border-white/[0.08] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-1">Alert Delivery Mode</h3>
        <p className="text-sm text-slate-400 mb-5">
          Choose how you want to receive alert notifications. Digest modes batch multiple alerts into a single summary.
        </p>
        <div className="space-y-3">
          {DIGEST_MODE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                prefs.alertDigestMode === option.value
                  ? 'border-white/15 bg-slate-900/20'
                  : 'border-white/[0.08] hover:border-white/[0.1] bg-white/[0.04]'
              }`}
            >
              <input
                type="radio"
                name="alertDigestMode"
                value={option.value}
                checked={prefs.alertDigestMode === option.value}
                onChange={() => setPrefs((p) => ({ ...p, alertDigestMode: option.value }))}
                className="mt-0.5 accent-slate-400"
              />
              <div>
                <span className="text-sm font-medium text-white">{option.label}</span>
                <p className="text-xs text-slate-400 mt-0.5">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-black/80 border border-white/[0.08] rounded-xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-white">Quiet Hours</h3>
          <button
            onClick={() => {
              setQuietHoursEnabled(!quietHoursEnabled);
              if (!quietHoursEnabled) {
                // Initialize defaults when enabling
                setPrefs((p) => ({
                  ...p,
                  quietHoursStart: p.quietHoursStart ?? 22,
                  quietHoursEnd: p.quietHoursEnd ?? 7,
                }));
              }
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              quietHoursEnabled ? 'bg-white' : 'bg-white/[0.08]'
            }`}
            aria-label={quietHoursEnabled ? 'Disable quiet hours' : 'Enable quiet hours'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                quietHoursEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p className="text-sm text-slate-400 mb-5">
          During quiet hours, all alerts are silently queued and delivered in the next digest. Ideal for avoiding notifications while you sleep.
        </p>

        {quietHoursEnabled && (
          <div className="space-y-4 pt-2 border-t border-white/[0.08]">
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                  Start (Do Not Disturb from)
                </label>
                <select
                  value={prefs.quietHoursStart ?? 22}
                  onChange={(e) => setPrefs((p) => ({ ...p, quietHoursStart: parseInt(e.target.value) }))}
                  className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {formatHour(i)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                  End (Resume alerts at)
                </label>
                <select
                  value={prefs.quietHoursEnd ?? 7}
                  onChange={(e) => setPrefs((p) => ({ ...p, quietHoursEnd: parseInt(e.target.value) }))}
                  className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {formatHour(i)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quiet hours visual preview */}
            <div className="bg-white/[0.05] rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-2">Preview</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-6 bg-white/[0.08] rounded-full overflow-hidden relative">
                  {(() => {
                    const start = prefs.quietHoursStart ?? 22;
                    const end = prefs.quietHoursEnd ?? 7;
                    if (start <= end) {
                      // Same-day range
                      const left = (start / 24) * 100;
                      const width = ((end - start) / 24) * 100;
                      return (
                        <div
                          className="absolute top-0 bottom-0 bg-indigo-800/60 border-x border-indigo-500/40"
                          style={{ left: `${left}%`, width: `${width}%` }}
                        />
                      );
                    }
                    // Overnight range
                    const leftWidth = ((24 - start) / 24) * 100;
                    const rightWidth = (end / 24) * 100;
                    return (
                      <>
                        <div
                          className="absolute top-0 bottom-0 bg-indigo-800/60 border-l border-indigo-500/40 rounded-r-none"
                          style={{ left: `${(start / 24) * 100}%`, width: `${leftWidth}%` }}
                        />
                        <div
                          className="absolute top-0 bottom-0 left-0 bg-indigo-800/60 border-r border-indigo-500/40 rounded-l-none"
                          style={{ width: `${rightWidth}%` }}
                        />
                      </>
                    );
                  })()}
                  {/* Hour markers */}
                  {[0, 6, 12, 18].map((h) => (
                    <div
                      key={h}
                      className="absolute top-0 bottom-0 w-px bg-slate-600"
                      style={{ left: `${(h / 24) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-600">
                <span>12 AM</span>
                <span>6 AM</span>
                <span>12 PM</span>
                <span>6 PM</span>
                <span>12 AM</span>
              </div>
              <p className="text-xs text-indigo-300 mt-2 text-center">
                Quiet from {formatHour(prefs.quietHoursStart ?? 22)} to {formatHour(prefs.quietHoursEnd ?? 7)}
              </p>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                Timezone
              </label>
              <select
                value={prefs.quietHoursTimezone}
                onChange={(e) => setPrefs((p) => ({ ...p, quietHoursTimezone: e.target.value }))}
                className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Quiet hours are based on your selected timezone.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-black/40 border border-white/[0.06] rounded-xl p-4 flex gap-3">
        <svg className="w-5 h-5 text-white/70 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm text-slate-400">
          <p className="font-medium text-white/70 mb-1">How Smart Batching Works</p>
          <ul className="space-y-1 text-xs list-disc list-inside">
            <li><strong className="text-white/70">Instant:</strong> Alerts are delivered immediately through all configured channels.</li>
            <li><strong className="text-white/70">Hourly/Daily/Weekly:</strong> Alerts are queued and sent as a consolidated digest email.</li>
            <li><strong className="text-white/70">Quiet Hours:</strong> During quiet hours, all alerts are silently queued regardless of delivery mode.</li>
            <li><strong className="text-white/70">In-App:</strong> In-app notifications are always delivered immediately for real-time visibility.</li>
          </ul>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={savePreferences}
          disabled={savingPrefs}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-medium rounded-lg transition-colors"
        >
          {savingPrefs ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Preferences
            </>
          )}
        </button>
      </div>
    </div>
  );

  // ============================================================
  // Render: Tab -- Webhooks
  // ============================================================

  const renderWebhooksTab = () => (
    <div className="space-y-6">
      <div className="bg-black/80 border border-white/[0.08] rounded-xl p-5">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Webhook Integration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="webhook-name" className="block text-sm text-slate-400 mb-1">Integration Name</label>
            <input id="webhook-name" type="text" value={webhookName} onChange={(e) => setWebhookName(e.target.value)} placeholder="e.g. Launch Alerts Channel" className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent" maxLength={100} />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Platform</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setWebhookType('slack')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${webhookType === 'slack' ? 'bg-purple-900/20 border-purple-700 text-purple-300' : 'bg-slate-800 border-white/[0.08] text-slate-400 hover:border-white/[0.1]'}`}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" /></svg>
                Slack
              </button>
              <button type="button" onClick={() => setWebhookType('discord')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${webhookType === 'discord' ? 'bg-indigo-900/20 border-indigo-700 text-indigo-300' : 'bg-slate-800 border-white/[0.08] text-slate-400 hover:border-white/[0.1]'}`}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" /></svg>
                Discord
              </button>
            </div>
          </div>
        </div>
        <div className="mb-4">
          <label htmlFor="webhook-url" className="block text-sm text-slate-400 mb-1">Webhook URL</label>
          <input id="webhook-url" type="url" autoComplete="url" inputMode="url" enterKeyHint="done" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder={webhookType === 'slack' ? 'https://hooks.slack.com/services/...' : 'https://discord.com/api/webhooks/...'} className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent font-mono" />
          <p className="text-xs text-slate-500 mt-1">{webhookType === 'slack' ? 'Create an Incoming Webhook in your Slack workspace settings.' : 'Create a webhook in your Discord server\'s channel Integrations settings.'}</p>
        </div>
        <button onClick={addWebhook} disabled={addingWebhook || !webhookName.trim() || !webhookUrl.trim()} className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 disabled:bg-slate-700 disabled:text-slate-500 text-slate-900 font-medium rounded-lg transition-colors text-sm">
          {addingWebhook ? (<span className="flex items-center gap-2"><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Adding...</span>) : (<span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Add Webhook</span>)}
        </button>
      </div>
      {webhooks.length === 0 ? (
        <div className="text-center py-16 bg-black/50 border border-white/[0.06] rounded-xl">
          <svg className="w-14 h-14 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          <h3 className="text-lg font-semibold text-white mb-2">No webhooks configured</h3>
          <p className="text-slate-400 max-w-sm mx-auto">Add a Slack or Discord webhook above to receive alert notifications in your team channels.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className="bg-black/80 border border-white/[0.08] rounded-xl p-4 hover:border-white/[0.1] transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    {webhook.type === 'slack' ? (
                      <svg className="w-5 h-5 text-purple-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" /></svg>
                    ) : (
                      <svg className="w-5 h-5 text-indigo-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" /></svg>
                    )}
                    <h3 className="text-sm font-semibold text-white truncate">{webhook.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${webhook.type === 'slack' ? 'bg-purple-900/30 text-purple-300' : 'bg-indigo-900/30 text-indigo-300'}`}>{webhook.type === 'slack' ? 'Slack' : 'Discord'}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono truncate mb-2 ml-8">{webhook.url.length > 60 ? webhook.url.substring(0, 57) + '...' : webhook.url}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 ml-8">
                    <span>Added {formatRelativeTime(webhook.createdAt)}</span>
                    {webhook.lastDeliveryAt && (<><span className="text-slate-700">|</span><span className="flex items-center gap-1">Last delivery: {formatRelativeTime(webhook.lastDeliveryAt)}{webhook.lastDeliverySuccess ? (<span className="inline-block w-2 h-2 bg-green-400 rounded-full" title="Success" />) : (<span className="inline-block w-2 h-2 bg-red-400 rounded-full" title="Failed" />)}</span></>)}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => testWebhook(webhook.id)} disabled={testingWebhookId === webhook.id} className="inline-flex items-center gap-1 px-3 py-2.5 text-xs font-medium text-white/70 border border-white/[0.08] hover:border-white/15 hover:bg-white/[0.03] rounded-lg transition-colors disabled:opacity-50 min-h-[44px]" aria-label="Send a test message">
                    {testingWebhookId === webhook.id ? (<span className="flex items-center gap-1"><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Testing...</span>) : (<span className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Test</span>)}
                  </button>
                  <button onClick={() => { if (confirm('Remove this webhook integration?')) deleteWebhook(webhook.id); }} disabled={deletingWebhookId === webhook.id} className={`p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-md hover:bg-red-900/20 ${deletingWebhookId === webhook.id ? 'opacity-50 cursor-not-allowed' : ''}`} aria-label="Remove webhook">
                    {deletingWebhookId === webhook.id ? (<svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>) : (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>)}
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <ScrollReveal delay={0.1}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
          <AnimatedPageHeader
            title="Smart Alerts"
            subtitle="Create custom alert rules and manage notifications for space industry events."
            icon={
              <svg
                className="w-8 h-8 text-white/70"
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
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-medium rounded-lg transition-colors mt-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Alert
            </button>
          </AnimatedPageHeader>
        </div>
        </ScrollReveal>

        {/* Stats Cards */}
        {stats && (
          <ScrollReveal delay={0.15}>
          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StaggerItem>
              <div className="bg-black/80 border border-white/[0.06] rounded-xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Active Rules</p>
                <p className="text-2xl font-bold text-white/70 mt-1">{stats.activeRules}</p>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="bg-black/80 border border-white/[0.06] rounded-xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Total Rules</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalRules}</p>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="bg-black/80 border border-white/[0.06] rounded-xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Triggered Today</p>
                <p className="text-2xl font-bold text-orange-400 mt-1">{stats.deliveriesToday}</p>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="bg-black/80 border border-white/[0.06] rounded-xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Total Notifications</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.totalDeliveries}</p>
              </div>
            </StaggerItem>
          </StaggerContainer>
          </ScrollReveal>
        )}

        {/* Tab Navigation */}
        <ScrollReveal delay={0.2}>
        <div className="flex gap-1 mb-6 bg-black/60 rounded-lg p-1 w-fit border border-white/[0.06]">
          <button
            onClick={() => setTab('alerts')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentTab === 'alerts'
                ? 'bg-white text-slate-900 shadow-lg shadow-black/15'
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
                ? 'bg-white text-slate-900 shadow-lg shadow-black/15'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            Notifications
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('saved-searches')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentTab === 'saved-searches'
                ? 'bg-white text-slate-900 shadow-lg shadow-black/15'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Saved Searches
            {savedSearches.length > 0 && (
              <span className="ml-1 text-xs bg-white/[0.08] text-white/70 rounded-full px-1.5 py-0.5">
                {savedSearches.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('webhooks')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentTab === 'webhooks'
                ? 'bg-white text-slate-900 shadow-lg shadow-black/15'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Webhooks
            {webhooks.length > 0 && (
              <span className="ml-1 text-xs bg-white/[0.08] text-white/70 rounded-full px-1.5 py-0.5">
                {webhooks.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('preferences')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentTab === 'preferences'
                ? 'bg-white text-slate-900 shadow-lg shadow-black/15'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Preferences
          </button>
        </div>
        </ScrollReveal>

        {/* Tab Content */}
        <ScrollReveal delay={0.25}>
        {currentTab === 'alerts' && renderAlertsTab()}
        {currentTab === 'notifications' && renderNotificationsTab()}
        {currentTab === 'saved-searches' && renderSavedSearchesTab()}
        {currentTab === 'webhooks' && renderWebhooksTab()}
        {currentTab === 'preferences' && renderPreferencesTab()}
        </ScrollReveal>

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
    <PremiumGate requiredTier="pro" context="alerts" showPreview={true}>
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="text-slate-400">Loading alerts...</p>
            </div>
          </div>
        }
      >
        <AlertsPageInner />
      </Suspense>
    </PremiumGate>
  );
}
