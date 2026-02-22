'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import PremiumGate from '@/components/PremiumGate';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface FundingRound {
  id: string;
  date: string;
  amount: number | null;
  seriesLabel: string | null;
  roundType: string | null;
  leadInvestor: string | null;
  investors: string[];
  postValuation: number | null;
  company: {
    id: string;
    name: string;
    slug: string;
    sector: string | null;
    tier: number;
    logoUrl: string | null;
    headquarters: string | null;
    isPublic: boolean;
  };
}

interface Stats {
  summary: {
    ytdTotal: number;
    ytdDealCount: number;
    allTimeTotal: number;
    totalDeals: number;
    avgRoundSize: number;
    largestRound: number;
  };
  fundingByQuarter: { quarter: string; total: number; dealCount: number }[];
  fundingBySector: { sector: string; total: number; deals: number }[];
  avgRoundByStage: { stage: string; avgAmount: number; totalAmount: number; dealCount: number }[];
  topInvestors: { name: string; deals: number; totalAmount: number }[];
  largestRounds: {
    id: string;
    companyName: string;
    companySlug: string | null;
    amount: number | null;
    seriesLabel: string | null;
    roundType: string | null;
    date: string;
    leadInvestor: string | null;
    postValuation: number | null;
  }[];
}

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const TIME_RANGES = [
  { value: '', label: 'All Time' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
  { value: '365', label: 'Last Year' },
  { value: '730', label: 'Last 2 Years' },
];

const ROUND_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'Seed', label: 'Seed' },
  { value: 'Series A', label: 'Series A' },
  { value: 'Series B', label: 'Series B' },
  { value: 'Series C', label: 'Series C' },
  { value: 'Series D', label: 'Series D+' },
  { value: 'SPAC', label: 'SPAC' },
  { value: 'IPO', label: 'IPO' },
  { value: 'Acquisition', label: 'Acquisition' },
];

const SECTOR_OPTIONS = [
  { value: '', label: 'All Sectors' },
  { value: 'launch', label: 'Launch' },
  { value: 'satellite', label: 'Satellite' },
  { value: 'defense', label: 'Defense' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'ground-segment', label: 'Ground Segment' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'exploration', label: 'Exploration' },
];

const ROUND_TYPE_COLORS: Record<string, string> = {
  'Seed': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Series A': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Series B': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Series C': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Series D': 'bg-red-500/20 text-red-400 border-red-500/30',
  'Series E': 'bg-red-500/20 text-red-400 border-red-500/30',
  'Series F': 'bg-red-500/20 text-red-400 border-red-500/30',
  'SPAC Merger': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'IPO': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Acquisition': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'Follow-on': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

function getRoundColor(label: string | null): string {
  if (!label) return 'bg-slate-700/50 text-slate-300 border-slate-600';
  for (const [key, color] of Object.entries(ROUND_TYPE_COLORS)) {
    if (label.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return 'bg-slate-700/50 text-slate-300 border-slate-600';
}

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatAmount(value: number): string {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

function FundingTrackerPageInner() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rounds, setRounds] = useState<FundingRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [roundsLoading, setRoundsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [timeRange, setTimeRange] = useState('');
  const [roundType, setRoundType] = useState('');
  const [sector, setSector] = useState('');
  const [investorSearch, setInvestorSearch] = useState('');

  // Load stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/funding-tracker/stats');
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError('Failed to load funding statistics');
        console.error(err);
      }
    }
    fetchStats();
  }, []);

  // Load rounds with filters
  const fetchRounds = useCallback(async () => {
    setRoundsLoading(true);
    try {
      const params = new URLSearchParams();
      if (timeRange) params.set('timeRange', timeRange);
      if (roundType) params.set('roundType', roundType);
      if (sector) params.set('sector', sector);
      if (investorSearch) params.set('investor', investorSearch);
      params.set('limit', '50');

      const res = await fetch(`/api/funding-tracker?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch rounds');
      const data = await res.json();
      setRounds(data.rounds);
    } catch (err) {
      console.error(err);
    } finally {
      setRoundsLoading(false);
      setLoading(false);
    }
  }, [timeRange, roundType, sector, investorSearch]);

  useEffect(() => {
    fetchRounds();
  }, [fetchRounds]);

  // Computed: max quarterly amount for chart scaling
  const maxQuarterlyAmount = useMemo(() => {
    if (!stats) return 1;
    return Math.max(...stats.fundingByQuarter.map((q) => q.total), 1);
  }, [stats]);

  // Computed: max sector amount for chart scaling
  const maxSectorAmount = useMemo(() => {
    if (!stats) return 1;
    return Math.max(...stats.fundingBySector.map((s) => s.total), 1);
  }, [stats]);

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <BreadcrumbSchema items={[
        { name: 'Home', href: '/' },
        { name: 'Funding Tracker' },
      ]} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Space Startup & Funding Tracker"
          subtitle="Track venture capital, M&A, and IPO activity across the space industry"
          icon="💰"
          accentColor="green"
        />

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* ── Hero Stats Bar ── */}
        {stats && (
          <ScrollReveal>
            <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StaggerItem>
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 text-center">
                  <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    {formatAmount(stats.summary.ytdTotal)}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                    Raised YTD
                  </div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-cyan-400">
                    {stats.summary.ytdDealCount}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                    Deals YTD
                  </div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-purple-400">
                    {formatAmount(stats.summary.avgRoundSize)}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                    Avg Round Size
                  </div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-amber-400">
                    {formatAmount(stats.summary.largestRound)}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                    Largest Round
                  </div>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </ScrollReveal>
        )}

        {/* ── Charts Row ── */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Quarterly Funding Chart */}
            <ScrollReveal>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-sm">
                    📊
                  </span>
                  Quarterly Funding Totals
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Last 8 quarters of space startup funding
                </p>
                <div className="flex items-end gap-2 h-44">
                  {stats.fundingByQuarter.map((q) => {
                    const heightPct = q.total > 0 ? (q.total / maxQuarterlyAmount) * 100 : 2;
                    return (
                      <div
                        key={q.quarter}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div className="text-[10px] font-medium text-slate-400 truncate">
                          {q.total > 0 ? formatAmount(q.total) : '--'}
                        </div>
                        <div className="w-full flex justify-center">
                          <div
                            className="w-full max-w-[40px] rounded-t-md bg-gradient-to-t from-green-600 to-green-400 transition-all duration-500"
                            style={{
                              height: `${Math.max(heightPct * 1.4, 4)}px`,
                            }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {q.quarter}
                        </div>
                        <div className="text-[9px] text-slate-600">
                          {q.dealCount} deals
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollReveal>

            {/* Sector Breakdown */}
            <ScrollReveal>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm">
                    🔬
                  </span>
                  Funding by Sector
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Capital allocation across space sectors
                </p>
                <div className="space-y-3">
                  {stats.fundingBySector.slice(0, 8).map((s) => {
                    const widthPct =
                      maxSectorAmount > 0
                        ? (s.total / maxSectorAmount) * 100
                        : 0;
                    return (
                      <div key={s.sector}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-300 capitalize">
                            {s.sector}
                          </span>
                          <span className="text-slate-400">
                            {formatAmount(s.total)} ({s.deals} deals)
                          </span>
                        </div>
                        <div className="w-full bg-slate-700/30 rounded-full h-2.5">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-cyan-400 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(widthPct, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollReveal>
          </div>
        )}

        {/* ── Notable Deals & Top Investors Row ── */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Largest Rounds */}
            <ScrollReveal>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-sm">
                    🏆
                  </span>
                  Largest Funding Rounds
                </h3>
                <div className="space-y-3">
                  {stats.largestRounds.map((r, i) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/30 transition-colors"
                    >
                      <span className="text-lg font-bold text-slate-500 w-6 text-right">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {r.companySlug ? (
                            <Link
                              href={`/company-profiles/${r.companySlug}`}
                              className="text-white font-medium text-sm hover:text-cyan-400 transition-colors truncate"
                            >
                              {r.companyName}
                            </Link>
                          ) : (
                            <span className="text-white font-medium text-sm truncate">
                              {r.companyName}
                            </span>
                          )}
                          {r.seriesLabel && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded border ${getRoundColor(
                                r.seriesLabel
                              )}`}
                            >
                              {r.seriesLabel}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 text-xs">
                          {formatDate(r.date)}
                          {r.leadInvestor
                            ? ` -- Led by ${r.leadInvestor}`
                            : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-mono font-bold text-sm">
                          {r.amount ? formatAmount(r.amount) : '--'}
                        </div>
                        {r.postValuation && (
                          <div className="text-slate-500 text-xs">
                            @ {formatAmount(r.postValuation)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Top Investors */}
            <ScrollReveal>
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-sm">
                    🏦
                  </span>
                  Top Investors by Deal Count
                </h3>
                <div className="space-y-3">
                  {stats.topInvestors.slice(0, 15).map((inv, i) => (
                    <div
                      key={inv.name}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/30 transition-colors"
                    >
                      <span className="text-lg font-bold text-slate-500 w-6 text-right">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/investors?search=${encodeURIComponent(
                            inv.name
                          )}`}
                          className="text-white font-medium text-sm hover:text-cyan-400 transition-colors truncate block"
                        >
                          {inv.name}
                        </Link>
                      </div>
                      <div className="text-right">
                        <div className="text-cyan-400 font-mono text-sm">
                          {inv.deals} deals
                        </div>
                        <div className="text-slate-500 text-xs">
                          {formatAmount(inv.totalAmount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  href="/investors"
                  className="block mt-4 text-center text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  View All Investors &rarr;
                </Link>
              </div>
            </ScrollReveal>
          </div>
        )}

        {/* ── Round Size by Stage ── */}
        {stats && (
          <ScrollReveal>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-sm">
                  📈
                </span>
                Average Round Size by Stage
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {stats.avgRoundByStage
                  .filter((s) => s.dealCount > 0)
                  .map((s) => (
                    <div
                      key={s.stage}
                      className="bg-slate-900/50 rounded-lg border border-slate-700/30 p-4 text-center"
                    >
                      <div className="text-white font-semibold text-sm mb-1">
                        {s.stage}
                      </div>
                      <div className="text-lg font-bold text-indigo-400">
                        {formatAmount(s.avgAmount)}
                      </div>
                      <div className="text-slate-500 text-xs mt-1">
                        {s.dealCount} deals &middot;{' '}
                        {formatAmount(s.totalAmount)} total
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* ── Filter Bar ── */}
        <ScrollReveal>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-slate-400 text-xs mb-1">
                  Time Range
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                >
                  {TIME_RANGES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">
                  Round Type
                </label>
                <select
                  value={roundType}
                  onChange={(e) => setRoundType(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                >
                  {ROUND_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">
                  Sector
                </label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                >
                  {SECTOR_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">
                  Investor
                </label>
                <input
                  type="text"
                  value={investorSearch}
                  onChange={(e) => setInvestorSearch(e.target.value)}
                  placeholder="Search investor..."
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 w-48"
                />
              </div>
              {(timeRange || roundType || sector || investorSearch) && (
                <button
                  onClick={() => {
                    setTimeRange('');
                    setRoundType('');
                    setSector('');
                    setInvestorSearch('');
                  }}
                  className="text-sm text-slate-400 hover:text-white transition-colors pb-2"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* ── Deal Feed ── */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">
            Recent Deals
            {roundsLoading && (
              <span className="text-sm text-slate-500 ml-2">Loading...</span>
            )}
          </h3>

          {rounds.length === 0 && !roundsLoading ? (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center">
              <p className="text-slate-400">
                No funding rounds match your filters.
              </p>
            </div>
          ) : (
            <StaggerContainer className="space-y-3">
              {rounds.map((round) => (
                <StaggerItem key={round.id}>
                  <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 hover:border-green-500/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Company info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/company-profiles/${round.company.slug}`}
                            className="text-white font-semibold hover:text-cyan-400 transition-colors"
                          >
                            {round.company.name}
                          </Link>
                          {round.seriesLabel && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded border ${getRoundColor(
                                round.seriesLabel
                              )}`}
                            >
                              {round.seriesLabel}
                            </span>
                          )}
                          {round.company.sector && (
                            <span className="text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded capitalize">
                              {round.company.sector}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 text-xs mt-1">
                          {formatDate(round.date)}
                          {round.company.headquarters
                            ? ` -- ${round.company.headquarters}`
                            : ''}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right sm:w-32">
                        <div className="text-green-400 font-mono font-bold">
                          {round.amount
                            ? formatAmount(round.amount)
                            : 'Undisclosed'}
                        </div>
                        {round.postValuation && (
                          <div className="text-slate-500 text-xs">
                            @ {formatAmount(round.postValuation)} val
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Investors */}
                    {(round.leadInvestor ||
                      round.investors.length > 0) && (
                      <div className="mt-2 pt-2 border-t border-slate-700/30">
                        <span className="text-slate-500 text-xs">
                          Investors:{' '}
                        </span>
                        {round.leadInvestor && (
                          <span className="text-cyan-400 text-xs font-medium">
                            {round.leadInvestor} (lead)
                          </span>
                        )}
                        {round.investors.filter(
                          (inv) => inv !== round.leadInvestor
                        ).length > 0 && (
                          <span className="text-slate-400 text-xs">
                            {round.leadInvestor ? ', ' : ''}
                            {round.investors
                              .filter((inv) => inv !== round.leadInvestor)
                              .join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>

        {/* ── Data Sources Footer ── */}
        <ScrollReveal>
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 p-6">
            <h4 className="text-slate-400 font-semibold text-sm mb-3">
              Data Sources
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-500">
              <div>SEC Filings (EDGAR)</div>
              <div>Crunchbase -- Startup Funding Data</div>
              <div>PitchBook -- Private Market Intelligence</div>
              <div>Space Capital -- Quarterly Reports</div>
              <div>Company Press Releases</div>
              <div>Bloomberg -- Market Data</div>
            </div>
            <p className="text-slate-600 text-xs mt-3">
              Funding data is compiled from publicly available sources and may
              not reflect the most recent activity. This is not investment
              advice. Always conduct your own due diligence.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}

export default function FundingTrackerPage() {
  return (
    <PremiumGate requiredTier="pro" context="funding-tracker" showPreview={true}>
      <FundingTrackerPageInner />
    </PremiumGate>
  );
}
