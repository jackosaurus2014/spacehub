'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

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
  alertRuleId: string;
  channel: string;
  status: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
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

const CHANNEL_LABELS: Record<string, string> = {
  in_app: 'In-App',
  email: 'Email',
  push: 'Push',
  webhook: 'Webhook',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-600 text-slate-200',
  normal: 'bg-cyan-900/60 text-cyan-300',
  high: 'bg-orange-900/60 text-orange-300',
  critical: 'bg-red-900/60 text-red-300',
};

// ============================================================
// Component
// ============================================================

export default function AlertsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [deliveries, setDeliveries] = useState<AlertDelivery[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'notifications'>('rules');

  // Create form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTriggerType, setFormTriggerType] = useState('keyword');
  const [formChannels, setFormChannels] = useState<string[]>(['in_app']);
  const [formEmailFrequency, setFormEmailFrequency] = useState('immediate');
  const [formPriority, setFormPriority] = useState('normal');
  const [formCooldown, setFormCooldown] = useState(60);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Keyword trigger config
  const [keywordsInput, setKeywordsInput] = useState('');
  const [matchType, setMatchType] = useState<'any' | 'all'>('any');

  // Price threshold config
  const [ticker, setTicker] = useState('');
  const [priceCondition, setPriceCondition] = useState<'above' | 'below' | 'percent_change'>('above');
  const [priceValue, setPriceValue] = useState('');

  // Regulatory filing config
  const [regAgencies, setRegAgencies] = useState('');
  const [regCategories, setRegCategories] = useState('');

  // Launch status config
  const [launchProviders, setLaunchProviders] = useState('');
  const [launchStatuses, setLaunchStatuses] = useState('');

  // Contract award config
  const [contractAgencies, setContractAgencies] = useState('');
  const [contractMinValue, setContractMinValue] = useState('');
  const [contractKeywords, setContractKeywords] = useState('');

  // Funding round config
  const [fundingSectors, setFundingSectors] = useState('');
  const [fundingMinAmount, setFundingMinAmount] = useState('');

  // Weather severity config
  const [minKpIndex, setMinKpIndex] = useState('5');

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

  const fetchDeliveries = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts/deliveries?limit=30');
      if (res.ok) {
        const json = await res.json();
        setDeliveries(json.data.deliveries);
        setUnreadCount(json.data.unreadCount);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      Promise.all([fetchRules(), fetchDeliveries()]).finally(() =>
        setLoading(false)
      );
    } else if (sessionStatus === 'unauthenticated') {
      setLoading(false);
    }
  }, [sessionStatus, fetchRules, fetchDeliveries]);

  const toggleRule = async (ruleId: string, isActive: boolean) => {
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
      }
    } catch {
      // silently fail
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) return;
    try {
      const res = await fetch(`/api/alerts/${ruleId}`, { method: 'DELETE' });
      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.id !== ruleId));
      }
    } catch {
      // silently fail
    }
  };

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
        setUnreadCount((prev) => Math.max(0, prev - ids.length));
      }
    } catch {
      // silently fail
    }
  };

  const buildTriggerConfig = (): Record<string, unknown> => {
    switch (formTriggerType) {
      case 'keyword':
        return {
          keywords: keywordsInput
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
          matchType,
        };
      case 'price_threshold':
        return {
          ticker: ticker.trim().toUpperCase(),
          condition: priceCondition,
          value: parseFloat(priceValue) || 0,
        };
      case 'regulatory_filing':
        return {
          agencies: regAgencies
            ? regAgencies.split(',').map((a) => a.trim()).filter(Boolean)
            : undefined,
          categories: regCategories
            ? regCategories.split(',').map((c) => c.trim()).filter(Boolean)
            : undefined,
        };
      case 'launch_status':
        return {
          providers: launchProviders
            ? launchProviders.split(',').map((p) => p.trim()).filter(Boolean)
            : undefined,
          statusChanges: launchStatuses
            ? launchStatuses.split(',').map((s) => s.trim()).filter(Boolean)
            : undefined,
        };
      case 'contract_award':
        return {
          agencies: contractAgencies
            ? contractAgencies.split(',').map((a) => a.trim()).filter(Boolean)
            : undefined,
          minValue: contractMinValue ? parseFloat(contractMinValue) : undefined,
          keywords: contractKeywords
            ? contractKeywords.split(',').map((k) => k.trim()).filter(Boolean)
            : undefined,
        };
      case 'funding_round':
        return {
          sectors: fundingSectors
            ? fundingSectors.split(',').map((s) => s.trim()).filter(Boolean)
            : undefined,
          minAmount: fundingMinAmount ? parseFloat(fundingMinAmount) : undefined,
        };
      case 'weather_severity':
        return {
          minKpIndex: parseFloat(minKpIndex) || 5,
        };
      default:
        return {};
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription || undefined,
          triggerType: formTriggerType,
          triggerConfig: buildTriggerConfig(),
          channels: formChannels,
          emailFrequency: formEmailFrequency,
          priority: formPriority,
          cooldownMinutes: formCooldown,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        setShowCreateForm(false);
        resetForm();
        fetchRules();
      } else {
        setFormError(json.error?.message || 'Failed to create alert rule');
      }
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormTriggerType('keyword');
    setFormChannels(['in_app']);
    setFormEmailFrequency('immediate');
    setFormPriority('normal');
    setFormCooldown(60);
    setKeywordsInput('');
    setMatchType('any');
    setTicker('');
    setPriceCondition('above');
    setPriceValue('');
    setRegAgencies('');
    setRegCategories('');
    setLaunchProviders('');
    setLaunchStatuses('');
    setContractAgencies('');
    setContractMinValue('');
    setContractKeywords('');
    setFundingSectors('');
    setFundingMinAmount('');
    setMinKpIndex('5');
    setFormError('');
  };

  const toggleChannel = (channel: string) => {
    setFormChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  // ============================================================
  // Render: Login required
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
          <svg className="w-16 h-16 text-cyan-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
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
  // Render: Main Page
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Smart Alerts</h1>
            <p className="text-slate-400 mt-1">
              Get notified about space industry events that matter to you.
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Alert
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-400">Active Rules</p>
              <p className="text-2xl font-bold text-cyan-400">{stats.activeRules}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-400">Total Rules</p>
              <p className="text-2xl font-bold text-white">{stats.totalRules}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-400">Triggered Today</p>
              <p className="text-2xl font-bold text-orange-400">{stats.deliveriesToday}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-400">Total Notifications</p>
              <p className="text-2xl font-bold text-white">{stats.totalDeliveries}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-900 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'rules'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Alert Rules
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
              activeTab === 'notifications'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Notifications
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab: Alert Rules */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            {rules.length === 0 ? (
              <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-lg">
                <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-slate-400 mb-4">No alert rules yet. Create one to get started.</p>
                <button
                  onClick={() => {
                    resetForm();
                    setShowCreateForm(true);
                  }}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                >
                  Create Your First Alert
                </button>
              </div>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`bg-slate-900 border rounded-lg p-5 transition-colors ${
                    rule.isActive ? 'border-slate-700' : 'border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <svg className="w-5 h-5 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TRIGGER_TYPE_ICONS[rule.triggerType] || TRIGGER_TYPE_ICONS.keyword} />
                        </svg>
                        <h3 className="text-lg font-semibold text-white truncate">{rule.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_COLORS[rule.priority]}`}>
                          {rule.priority}
                        </span>
                      </div>
                      {rule.description && (
                        <p className="text-sm text-slate-400 mb-2">{rule.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="bg-slate-800 px-2 py-1 rounded">
                          {TRIGGER_TYPE_LABELS[rule.triggerType] || rule.triggerType}
                        </span>
                        {rule.channels.map((ch) => (
                          <span key={ch} className="bg-slate-800 px-2 py-1 rounded">
                            {CHANNEL_LABELS[ch] || ch}
                          </span>
                        ))}
                        <span className="text-slate-600">|</span>
                        <span>{rule.triggerCount} triggers</span>
                        <span className="text-slate-600">|</span>
                        <span>{rule._count.deliveries} notifications</span>
                        {rule.lastTriggeredAt && (
                          <>
                            <span className="text-slate-600">|</span>
                            <span>
                              Last: {new Date(rule.lastTriggeredAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Toggle Switch */}
                      <button
                        onClick={() => toggleRule(rule.id, rule.isActive)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          rule.isActive ? 'bg-cyan-600' : 'bg-slate-700'
                        }`}
                        title={rule.isActive ? 'Disable' : 'Enable'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            rule.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      {/* Delete Button */}
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab: Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-3">
            {unreadCount > 0 && (
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => {
                    const unreadIds = deliveries
                      .filter((d) => !d.readAt && d.status !== 'read')
                      .map((d) => d.id);
                    if (unreadIds.length > 0) markAsRead(unreadIds);
                  }}
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Mark all as read
                </button>
              </div>
            )}
            {deliveries.length === 0 ? (
              <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-lg">
                <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-slate-400">No notifications yet.</p>
              </div>
            ) : (
              deliveries.map((delivery) => {
                const isUnread = !delivery.readAt && delivery.status !== 'read';
                return (
                  <div
                    key={delivery.id}
                    className={`bg-slate-900 border rounded-lg p-4 transition-colors cursor-pointer ${
                      isUnread
                        ? 'border-cyan-800/50 bg-cyan-950/20'
                        : 'border-slate-800'
                    }`}
                    onClick={() => {
                      if (isUnread) markAsRead([delivery.id]);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {isUnread && (
                            <span className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0" />
                          )}
                          <h4 className="text-sm font-semibold text-white truncate">
                            {delivery.title}
                          </h4>
                        </div>
                        <p className="text-sm text-slate-400 line-clamp-2">{delivery.message}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded">
                            {CHANNEL_LABELS[delivery.channel] || delivery.channel}
                          </span>
                          {delivery.alertRule && (
                            <span>{delivery.alertRule.name}</span>
                          )}
                          <span className="text-slate-600">|</span>
                          <span>
                            {new Date(delivery.createdAt).toLocaleString()}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded ${
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
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Create Alert Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
              <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
                <h2 className="text-lg font-bold text-white">Create Alert Rule</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
                {formError && (
                  <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg px-4 py-3 text-sm">
                    {formError}
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Alert Name *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., SpaceX Launch Updates"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    required
                    maxLength={100}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Optional description"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    maxLength={500}
                  />
                </div>

                {/* Trigger Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Trigger Type *
                  </label>
                  <select
                    value={formTriggerType}
                    onChange={(e) => setFormTriggerType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    {Object.entries(TRIGGER_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dynamic Trigger Config */}
                <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Trigger Configuration
                  </p>

                  {formTriggerType === 'keyword' && (
                    <>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">
                          Keywords (comma-separated) *
                        </label>
                        <input
                          type="text"
                          value={keywordsInput}
                          onChange={(e) => setKeywordsInput(e.target.value)}
                          placeholder="e.g., SpaceX, Starship, launch"
                          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">
                          Match Type
                        </label>
                        <select
                          value={matchType}
                          onChange={(e) => setMatchType(e.target.value as 'any' | 'all')}
                          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                          <option value="any">Match ANY keyword (OR)</option>
                          <option value="all">Match ALL keywords (AND)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {formTriggerType === 'price_threshold' && (
                    <>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Ticker *</label>
                        <input
                          type="text"
                          value={ticker}
                          onChange={(e) => setTicker(e.target.value)}
                          placeholder="e.g., RKLB, ASTS"
                          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Condition</label>
                        <select
                          value={priceCondition}
                          onChange={(e) => setPriceCondition(e.target.value as 'above' | 'below' | 'percent_change')}
                          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                          <option value="above">Price goes above</option>
                          <option value="below">Price drops below</option>
                          <option value="percent_change">% change exceeds</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">
                          {priceCondition === 'percent_change' ? 'Percentage (%)' : 'Price ($)'} *
                        </label>
                        <input
                          type="number"
                          value={priceValue}
                          onChange={(e) => setPriceValue(e.target.value)}
                          placeholder={priceCondition === 'percent_change' ? '5' : '100'}
                          step="0.01"
                          min="0"
                          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          required
                        />
                      </div>
                    </>
                  )}

                  {formTriggerType === 'regulatory_filing' && (
                    <>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">
                          Agencies (comma-separated, optional)
                        </label>
                        <input
                          type="text"
                          value={regAgencies}
                          onChange={(e) => setRegAgencies(e.target.value)}
                          placeholder="e.g., FAA, FCC, NOAA"
                          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">
                          Categories (comma-separated, optional)
                        </label>
                        <input
                          type="text"
                          value={regCategories}
                          onChange={(e) => setRegCategories(e.target.value)}
                          placeholder="e.g., licensing, export_control"
                          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                    </>
                  )}

                  {formTriggerType === 'launch_status' && (
                    <>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">
                          Providers (comma-separated, optional)
                        </label>
                        <input
                          type="text"
                          value={launchProviders}
                          onChange={(e) => setLaunchProviders(e.target.value)}
                          placeholder="e.g., SpaceX, Rocket Lab, ULA"
                          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">
                          Status Changes (comma-separated, optional)
                        </label>
                        <input
                          type="text"
                          value={launchStatuses}
                          onChange={(e) => setLaunchStatuses(e.target.value)}
                          placeholder="e.g., go, scrub, success, failure"
                          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                    </>
                  )}

                  {formTriggerType === 'contract_award' && (
                    <>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">
                          Agencies (comma-separated, optional)
                        </label>
                        <input
                          type="text"
                          value={contractAgencies}
                          onChange={(e) => setContractAgencies(e.target.value)}
                          placeholder="e.g., NASA, USSF, DARPA"
                          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">
                          Minimum Value ($M, optional)
                        </label>
                        <input
                          type="number"
                          value={contractMinValue}
                          onChange={(e) => setContractMinValue(e.target.value)}
                          placeholder="e.g., 10"
                          min="0"
                          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">
                          Keywords (comma-separated, optional)
                        </label>
                        <input
                          type="text"
                          value={contractKeywords}
                          onChange={(e) => setContractKeywords(e.target.value)}
                          placeholder="e.g., satellite, propulsion"
                          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                    </>
                  )}

                  {formTriggerType === 'funding_round' && (
                    <>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">
                          Sectors (comma-separated, optional)
                        </label>
                        <input
                          type="text"
                          value={fundingSectors}
                          onChange={(e) => setFundingSectors(e.target.value)}
                          placeholder="e.g., launch, satellite, space_station"
                          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">
                          Minimum Amount ($M, optional)
                        </label>
                        <input
                          type="number"
                          value={fundingMinAmount}
                          onChange={(e) => setFundingMinAmount(e.target.value)}
                          placeholder="e.g., 50"
                          min="0"
                          className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      </div>
                    </>
                  )}

                  {formTriggerType === 'weather_severity' && (
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">
                        Minimum Kp Index (0-9)
                      </label>
                      <input
                        type="number"
                        value={minKpIndex}
                        onChange={(e) => setMinKpIndex(e.target.value)}
                        min="0"
                        max="9"
                        step="1"
                        className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        5+ = minor storm, 7+ = strong storm, 9 = extreme
                      </p>
                    </div>
                  )}
                </div>

                {/* Channels */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Notification Channels *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['in_app', 'email', 'push', 'webhook'] as const).map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => toggleChannel(ch)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                          formChannels.includes(ch)
                            ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        } ${ch === 'webhook' ? 'opacity-75' : ''}`}
                      >
                        {CHANNEL_LABELS[ch]}
                        {ch === 'webhook' && (
                          <span className="ml-1 text-xs text-slate-500">(Enterprise)</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email Frequency (only if email channel selected) */}
                {formChannels.includes('email') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Email Frequency
                    </label>
                    <select
                      value={formEmailFrequency}
                      onChange={(e) => setFormEmailFrequency(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    >
                      <option value="immediate">Immediate</option>
                      <option value="daily_digest">Daily Digest</option>
                      <option value="weekly_digest">Weekly Digest</option>
                    </select>
                  </div>
                )}

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                {/* Cooldown */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Cooldown (minutes between re-triggers)
                  </label>
                  <input
                    type="number"
                    value={formCooldown}
                    onChange={(e) => setFormCooldown(parseInt(e.target.value) || 60)}
                    min={1}
                    max={10080}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Prevent the same alert from firing too often. Range: 1 min to 7 days (10080 min).
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting || formChannels.length === 0}
                    className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
                  >
                    {formSubmitting ? 'Creating...' : 'Create Alert'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
