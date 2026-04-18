'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import { BLOG_POSTS } from '@/lib/blog-content';

interface AnalyticsData {
  totalUsers: number;
  signupsLast7Days: number;
  signupsLast30Days: number;
  activeTrials: number;
  tierBreakdown: Record<string, number>;
  recentSignups: Array<{
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
    tier: string;
    status: string;
    trialTier: string | null;
    trialActive: boolean;
  }>;
  topModules?: Array<{ module: string; count: number }>;
  funnel?: {
    signUp: number;
    trialStarted: number;
    upgradeClicked: number;
    paidConversions: number;
  };
  activeUsers?: {
    dau: number;
    wau: number;
    mau: number;
  };
}

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: 'Explorer (Free)', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  pro: { label: 'Professional', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  enterprise: { label: 'Enterprise', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
};

export default function AdminAnalyticsPage() {
  const { data: session, status: authStatus } = useSession();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/analytics');
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message || `Failed to load analytics (${res.status})`);
      }
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error('Unexpected response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.isAdmin) {
      fetchAnalytics();
    }
  }, [session, fetchAnalytics]);

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
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <ScrollReveal>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-white">User Analytics</h1>
              <p className="text-star-300 mt-1">Registration metrics, subscription breakdown, and recent activity.</p>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 text-sm font-medium rounded-lg border border-space-600/50 text-star-300 hover:bg-space-700/50 hover:text-white transition-colors"
            >
              Back to Admin
            </Link>
          </div>
        </ScrollReveal>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="md" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="card border border-red-500/30 p-4">
            <p className="text-red-400 font-medium">Error loading analytics</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
            <button onClick={fetchAnalytics} className="text-red-300 underline hover:no-underline text-sm mt-2">
              Try again
            </button>
          </div>
        )}

        {/* Analytics Data */}
        {!loading && !error && data && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <ScrollReveal delay={0.1}>
              <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StaggerItem>
                  <div className="card p-5 border border-space-600/50">
                    <p className="text-star-400 text-sm font-medium">Total Users</p>
                    <p className="text-3xl font-bold text-white mt-1">{data.totalUsers.toLocaleString()}</p>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div className="card p-5 border border-space-600/50">
                    <p className="text-star-400 text-sm font-medium">Last 7 Days</p>
                    <p className="text-3xl font-bold text-emerald-400 mt-1">+{data.signupsLast7Days}</p>
                    <p className="text-star-500 text-xs mt-1">new registrations</p>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div className="card p-5 border border-space-600/50">
                    <p className="text-star-400 text-sm font-medium">Last 30 Days</p>
                    <p className="text-3xl font-bold text-blue-400 mt-1">+{data.signupsLast30Days}</p>
                    <p className="text-star-500 text-xs mt-1">new registrations</p>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div className="card p-5 border border-space-600/50">
                    <p className="text-star-400 text-sm font-medium">Active Trials</p>
                    <p className="text-3xl font-bold text-amber-400 mt-1">{data.activeTrials}</p>
                    <p className="text-star-500 text-xs mt-1">users on trial</p>
                  </div>
                </StaggerItem>
              </StaggerContainer>
            </ScrollReveal>

            {/* Subscription Tier Breakdown */}
            <ScrollReveal delay={0.15}>
              <div className="card border border-space-600/50 p-5">
                <h2 className="text-white font-semibold text-lg mb-4">Subscription Tier Breakdown</h2>
                <div className="space-y-3">
                  {Object.entries(data.tierBreakdown).map(([tier, count]) => {
                    const info = TIER_LABELS[tier] || { label: tier, color: 'bg-white/10 text-white border-white/20' };
                    const percentage = data.totalUsers > 0 ? Math.round((count / data.totalUsers) * 100) : 0;

                    return (
                      <div key={tier} className="flex items-center gap-4">
                        <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${info.color} min-w-[140px] justify-center`}>
                          {info.label}
                        </span>
                        <div className="flex-1">
                          <div className="h-3 w-full rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-white/20 to-white/40 transition-all duration-500"
                              style={{ width: `${Math.max(percentage, 2)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <span className="text-white font-semibold text-sm">{count.toLocaleString()}</span>
                          <span className="text-star-500 text-xs ml-1">({percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollReveal>

            {/* Content Stats */}
            <ScrollReveal delay={0.17}>
              <div className="card border border-space-600/50 p-5">
                <h2 className="text-white font-semibold text-lg mb-4">Content Stats</h2>
                <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StaggerItem>
                    <div className="rounded-lg border border-space-600/30 bg-space-700/20 p-4 text-center">
                      <p className="text-star-400 text-sm font-medium">Blog Articles</p>
                      <p className="text-3xl font-bold text-cyan-400 mt-1">{BLOG_POSTS.length}</p>
                      <p className="text-star-500 text-xs mt-1">original posts</p>
                    </div>
                  </StaggerItem>
                  <StaggerItem>
                    <div className="rounded-lg border border-space-600/30 bg-space-700/20 p-4 text-center">
                      <p className="text-star-400 text-sm font-medium">RSS Sources</p>
                      <p className="text-3xl font-bold text-purple-400 mt-1">97</p>
                      <p className="text-star-500 text-xs mt-1">aggregated feeds</p>
                    </div>
                  </StaggerItem>
                  <StaggerItem>
                    <div className="rounded-lg border border-space-600/30 bg-space-700/20 p-4 text-center">
                      <p className="text-star-400 text-sm font-medium">Cron Jobs</p>
                      <p className="text-3xl font-bold text-amber-400 mt-1">33</p>
                      <p className="text-star-500 text-xs mt-1">scheduled tasks</p>
                    </div>
                  </StaggerItem>
                </StaggerContainer>
              </div>
            </ScrollReveal>

            {/* Active Users */}
            {data.activeUsers && (
              <ScrollReveal delay={0.175}>
                <div className="card border border-space-600/50 p-5">
                  <h2 className="text-white font-semibold text-lg mb-4">Active Users</h2>
                  <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StaggerItem>
                      <div className="rounded-lg border border-space-600/30 bg-space-700/20 p-4 text-center">
                        <p className="text-star-400 text-sm font-medium">DAU</p>
                        <p className="text-3xl font-bold text-emerald-400 mt-1">
                          {data.activeUsers.dau.toLocaleString()}
                        </p>
                        <p className="text-star-500 text-xs mt-1">last 24 hours</p>
                      </div>
                    </StaggerItem>
                    <StaggerItem>
                      <div className="rounded-lg border border-space-600/30 bg-space-700/20 p-4 text-center">
                        <p className="text-star-400 text-sm font-medium">WAU</p>
                        <p className="text-3xl font-bold text-blue-400 mt-1">
                          {data.activeUsers.wau.toLocaleString()}
                        </p>
                        <p className="text-star-500 text-xs mt-1">last 7 days</p>
                      </div>
                    </StaggerItem>
                    <StaggerItem>
                      <div className="rounded-lg border border-space-600/30 bg-space-700/20 p-4 text-center">
                        <p className="text-star-400 text-sm font-medium">MAU</p>
                        <p className="text-3xl font-bold text-purple-400 mt-1">
                          {data.activeUsers.mau.toLocaleString()}
                        </p>
                        <p className="text-star-500 text-xs mt-1">last 30 days</p>
                      </div>
                    </StaggerItem>
                  </StaggerContainer>
                </div>
              </ScrollReveal>
            )}

            {/* Top Modules */}
            {data.topModules && data.topModules.length > 0 && (
              <ScrollReveal delay={0.18}>
                <div className="card border border-space-600/50 p-5">
                  <h2 className="text-white font-semibold text-lg mb-1">Top Modules</h2>
                  <p className="text-star-400 text-xs mb-4">
                    module_viewed events in the last 7 days (top 10)
                  </p>
                  <div className="space-y-3">
                    {(() => {
                      const max = Math.max(...data.topModules!.map((m) => m.count), 1);
                      return data.topModules!.map((row) => {
                        const pct = Math.round((row.count / max) * 100);
                        return (
                          <div key={row.module} className="flex items-center gap-4">
                            <span className="text-star-200 text-sm min-w-[160px] truncate">
                              {row.module}
                            </span>
                            <div className="flex-1">
                              <div className="h-3 w-full rounded-full bg-white/[0.06] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-cyan-400/40 to-blue-500/60 transition-all duration-500"
                                  style={{ width: `${Math.max(pct, 2)}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-white font-semibold text-sm min-w-[60px] text-right">
                              {row.count.toLocaleString()}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* Conversion Funnel */}
            {data.funnel && (
              <ScrollReveal delay={0.185}>
                <div className="card border border-space-600/50 p-5">
                  <h2 className="text-white font-semibold text-lg mb-1">Conversion Funnel</h2>
                  <p className="text-star-400 text-xs mb-4">last 30 days</p>
                  <div className="space-y-2">
                    {(() => {
                      const steps: Array<{ label: string; value: number; color: string }> = [
                        { label: 'Sign-ups', value: data.funnel!.signUp, color: 'text-slate-200' },
                        { label: 'Trial started', value: data.funnel!.trialStarted, color: 'text-amber-300' },
                        { label: 'Upgrade clicked', value: data.funnel!.upgradeClicked, color: 'text-blue-300' },
                        { label: 'Paid conversions', value: data.funnel!.paidConversions, color: 'text-emerald-300' },
                      ];
                      const top = Math.max(steps[0].value, 1);
                      return steps.map((step, idx) => {
                        const pctOfTop = Math.round((step.value / top) * 100);
                        const prev = idx === 0 ? null : steps[idx - 1].value;
                        const stepConversion =
                          prev !== null && prev > 0
                            ? Math.round((step.value / prev) * 100)
                            : null;
                        return (
                          <div
                            key={step.label}
                            className="rounded-lg border border-space-600/30 bg-space-700/20 px-4 py-3 flex items-center justify-between gap-4"
                          >
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${step.color}`}>{step.label}</p>
                              <div className="h-2 mt-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-white/20 to-white/40 transition-all duration-500"
                                  style={{ width: `${Math.max(pctOfTop, 2)}%` }}
                                />
                              </div>
                            </div>
                            <div className="text-right min-w-[110px]">
                              <p className="text-white font-semibold text-lg">
                                {step.value.toLocaleString()}
                              </p>
                              <p className="text-star-500 text-xs">
                                {idx === 0
                                  ? 'top of funnel'
                                  : stepConversion !== null
                                    ? `${stepConversion}% of prev`
                                    : '—'}
                              </p>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* Recent Activity */}
            <ScrollReveal delay={0.19}>
              <div className="card border border-space-600/50 p-5">
                <h2 className="text-white font-semibold text-lg mb-4">Recent Activity</h2>
                <div className="space-y-3">
                  {data.recentSignups.length > 0 ? (
                    <>
                      <p className="text-star-300 text-sm">
                        <span className="text-emerald-400 font-semibold">{data.signupsLast7Days}</span> new subscriptions in the last 7 days
                      </p>
                      <div className="space-y-2">
                        {data.recentSignups.slice(0, 5).map((user) => (
                          <div key={user.id} className="flex items-center justify-between rounded-lg border border-space-600/30 bg-space-700/20 px-4 py-2.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {(user.name || user.email).charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-white text-sm font-medium truncate">{user.name || 'Anonymous'}</p>
                                <p className="text-star-500 text-xs truncate">{user.email}</p>
                              </div>
                            </div>
                            <span className="text-star-400 text-xs whitespace-nowrap ml-3">
                              {new Date(user.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                timeZone: 'UTC',
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-star-400 text-sm text-center py-4">No recent newsletter subscriptions to display.</p>
                  )}
                </div>
              </div>
            </ScrollReveal>

            {/* Recent Signups */}
            <ScrollReveal delay={0.2}>
              <div className="card border border-space-600/50 overflow-hidden">
                <div className="px-5 py-4 border-b border-space-600/50 flex items-center justify-between">
                  <h2 className="text-white font-semibold text-lg">Recent Signups</h2>
                  <Link
                    href="/admin/users"
                    className="text-sm text-star-300 hover:text-white transition-colors"
                  >
                    View all users &rarr;
                  </Link>
                </div>

                {data.recentSignups.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-star-400">No users yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-star-400 text-xs uppercase tracking-wider bg-space-700/30">
                          <th className="text-left px-5 py-3">User</th>
                          <th className="text-left px-5 py-3">Tier</th>
                          <th className="text-left px-5 py-3">Status</th>
                          <th className="text-left px-5 py-3">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-space-600/30">
                        {data.recentSignups.map((user) => {
                          const tierInfo = TIER_LABELS[user.tier] || { label: user.tier, color: 'bg-white/10 text-white border-white/20' };

                          return (
                            <tr key={user.id} className="hover:bg-space-700/20 transition-colors">
                              <td className="px-5 py-3">
                                <p className="text-white font-medium truncate max-w-[200px]">{user.name || 'No name'}</p>
                                <p className="text-star-500 text-xs truncate max-w-[200px]">{user.email}</p>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${tierInfo.color}`}>
                                  {tierInfo.label}
                                </span>
                                {user.trialActive && (
                                  <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 ml-1">
                                    Trial
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3">
                                <span className={`text-xs font-medium ${
                                  user.status === 'active' ? 'text-green-400' :
                                  user.status === 'canceled' ? 'text-red-400' :
                                  'text-amber-400'
                                }`}>
                                  {user.status}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-star-300 text-xs whitespace-nowrap">
                                {new Date(user.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  timeZone: 'UTC',
                                })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </ScrollReveal>
          </div>
        )}
      </div>
    </div>
  );
}
