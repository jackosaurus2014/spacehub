'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import AdSlot from '@/components/ads/AdSlot';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type DealType = 'funding_round' | 'acquisition' | 'ipo' | 'spac' | 'contract_win';

interface DealParty {
  company: string;
  companySlug?: string;
  role: 'target' | 'acquirer' | 'recipient' | 'investor' | 'awarder';
}

interface Deal {
  id: string;
  type: DealType;
  title: string;
  amount: number | null;
  date: string;
  parties: DealParty[];
  stage?: string;
  source: string;
  sourceUrl?: string;
  verified: boolean;
  description: string;
}

interface DealStats {
  totalDeals: number;
  totalVolume: number;
  avgDealSize: number;
  dealsThisMonth: number;
  volumeThisMonth: number;
  ytdDealCount: number;
  ytdVolume: number;
  byType: { type: DealType; count: number; volume: number }[];
  byQuarter: { quarter: string; count: number; volume: number }[];
  byYear: { year: number; count: number; volume: number }[];
}

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const TABS: { value: DealType | ''; label: string; icon: string }[] = [
  { value: '', label: 'All Deals', icon: '' },
  { value: 'funding_round', label: 'Funding', icon: '' },
  { value: 'acquisition', label: 'M&A', icon: '' },
  { value: 'contract_win', label: 'Contracts', icon: '' },
  { value: 'spac', label: 'SPACs', icon: '' },
  { value: 'ipo', label: 'IPOs', icon: '' },
];

const AMOUNT_RANGES = [
  { value: '', label: 'Any Amount' },
  { value: '0-100000000', label: 'Under $100M' },
  { value: '100000000-1000000000', label: '$100M - $1B' },
  { value: '1000000000-999999999999', label: '$1B+' },
];

const TYPE_STYLES: Record<DealType, { bg: string; text: string; label: string }> = {
  funding_round: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'FUNDING' },
  acquisition: { bg: 'bg-pink-500/15', text: 'text-pink-400', label: 'M&A' },
  ipo: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', label: 'IPO' },
  spac: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', label: 'SPAC' },
  contract_win: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'CONTRACT' },
};

const TYPE_COLORS: Record<string, string> = {
  FUNDING: 'bg-emerald-500',
  'M&A': 'bg-pink-500',
  CONTRACT: 'bg-blue-500',
  SPAC: 'bg-cyan-500',
  IPO: 'bg-yellow-500',
};

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatAmount(value: number | null): string {
  if (value === null) return 'Undisclosed';
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(1)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  });
}

function getTypeBadge(type: DealType) {
  const style = TYPE_STYLES[type];
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.bg} ${style.text} border border-current/20 uppercase tracking-wider`}>
      {style.label}
    </span>
  );
}

function formatChartVolume(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(0)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  return `$${value.toFixed(0)}`;
}

// ────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────

function StatCard({ label, value, subValue, color }: { label: string; value: string; subValue?: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 text-center"
    >
      <div className={`text-2xl md:text-3xl font-bold ${color}`}>
        {value}
      </div>
      <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
        {label}
      </div>
      {subValue && (
        <div className="text-slate-500 text-[10px] mt-0.5">{subValue}</div>
      )}
    </motion.div>
  );
}

function DealCard({ deal, index }: { deal: Deal; index: number }) {
  const [expanded, setExpanded] = useState(false);

  // Determine primary parties to show
  const primaryParties = deal.parties.filter(
    (p) => p.role === 'recipient' || p.role === 'target' || p.role === 'acquirer'
  );
  const investors = deal.parties.filter((p) => p.role === 'investor');
  const awarders = deal.parties.filter((p) => p.role === 'awarder');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.3 }}
      layout
    >
      <div
        className="bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200 cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded); }}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
      >
        <div className="p-4 sm:p-5">
          {/* Main row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Date */}
            <div className="text-xs text-slate-500 font-mono w-24 flex-shrink-0 hidden sm:block">
              {formatShortDate(deal.date)}
            </div>

            {/* Type badge */}
            <div className="flex items-center gap-2 sm:w-24 flex-shrink-0">
              <span className="text-xs text-slate-500 font-mono sm:hidden">
                {formatShortDate(deal.date)}
              </span>
              {getTypeBadge(deal.type)}
            </div>

            {/* Title and parties */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">
                  {deal.title}
                </h3>
                {deal.verified && (
                  <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-label="Verified">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {primaryParties.map((p) => (
                  <span key={p.company + p.role} className="text-xs text-slate-400">
                    {p.companySlug ? (
                      <Link
                        href={`/company-profiles/${p.companySlug}`}
                        className="text-cyan-400/80 hover:text-cyan-300 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {p.company}
                      </Link>
                    ) : (
                      p.company
                    )}
                    {p.role === 'acquirer' && <span className="text-slate-600 ml-1">(acquirer)</span>}
                    {p.role === 'target' && <span className="text-slate-600 ml-1">(target)</span>}
                  </span>
                ))}
                {investors.length > 0 && (
                  <span className="text-[10px] text-slate-500">
                    + {investors.length} investor{investors.length > 1 ? 's' : ''}
                  </span>
                )}
                {awarders.length > 0 && awarders.map((a) => (
                  <span key={a.company} className="text-xs text-slate-500">
                    from {a.companySlug ? (
                      <Link
                        href={`/company-profiles/${a.companySlug}`}
                        className="text-cyan-400/80 hover:text-cyan-300 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {a.company}
                      </Link>
                    ) : (
                      a.company
                    )}
                  </span>
                ))}
                {deal.stage && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400 border border-slate-600/30">
                    {deal.stage}
                  </span>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="text-right flex-shrink-0">
              <div className={`font-mono font-bold text-sm ${deal.amount ? 'text-emerald-400' : 'text-slate-500'}`}>
                {formatAmount(deal.amount)}
              </div>
            </div>

            {/* Expand indicator */}
            <motion.svg
              className="w-4 h-4 text-slate-600 flex-shrink-0 hidden sm:block"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-slate-700/30 pt-4">
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                  {deal.description}
                </p>

                {/* Investors list */}
                {investors.length > 0 && (
                  <div className="mb-3">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Investors: </span>
                    <span className="text-xs text-slate-400">
                      {investors.map((inv, i) => (
                        <React.Fragment key={inv.company}>
                          {i > 0 && ', '}
                          {inv.companySlug ? (
                            <Link
                              href={`/company-profiles/${inv.companySlug}`}
                              className="text-cyan-400/80 hover:text-cyan-300 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {inv.company}
                            </Link>
                          ) : (
                            inv.company
                          )}
                        </React.Fragment>
                      ))}
                    </span>
                  </div>
                )}

                {/* Source */}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>Source: {deal.source}</span>
                  {deal.sourceUrl && (
                    <a
                      href={deal.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400/70 hover:text-cyan-300 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Source
                      <svg className="w-3 h-3 inline ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                  <span className="text-slate-600">{formatDate(deal.date)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────
// Main Page (wrapped in Suspense)
// ────────────────────────────────────────

function DealsPageContent() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stats, setStats] = useState<DealStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<DealType | ''>('');
  const [search, setSearch] = useState('');
  const [amountRange, setAmountRange] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [company, setCompany] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [chartsVisible, setChartsVisible] = useState(false);

  const LIMIT = 25;

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeTab) params.set('type', activeTab);
      if (search) params.set('search', search);
      if (company) params.set('company', company);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (amountRange) {
        const [min, max] = amountRange.split('-');
        if (min) params.set('minAmount', min);
        if (max) params.set('maxAmount', max);
      }
      params.set('page', page.toString());
      params.set('limit', LIMIT.toString());

      const res = await fetch(`/api/deals?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch deals');
      const data = await res.json();

      setDeals(data.deals || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
      if (data.stats) setStats(data.stats);
    } catch {
      setError('Failed to load deal data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, company, dateFrom, dateTo, amountRange, page]);

  // Debounced fetch
  useEffect(() => {
    const debounce = setTimeout(fetchDeals, 300);
    return () => clearTimeout(debounce);
  }, [fetchDeals]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [activeTab, search, company, dateFrom, dateTo, amountRange]);

  // Chart data
  const maxQuarterlyVolume = useMemo(() => {
    if (!stats) return 1;
    return Math.max(...stats.byQuarter.map((q) => q.volume), 1);
  }, [stats]);

  const typeChartData = useMemo(() => {
    if (!stats) return [];
    return stats.byType
      .filter((t) => t.count > 0)
      .map((t) => ({
        name: TYPE_STYLES[t.type]?.label || t.type,
        count: t.count,
        volume: t.volume,
      }));
  }, [stats]);

  const totalTypeCount = useMemo(() => {
    return typeChartData.reduce((sum, t) => sum + t.count, 0);
  }, [typeChartData]);

  const hasFilters = activeTab || search || company || dateFrom || dateTo || amountRange;

  return (
    <div className="min-h-screen bg-slate-900">
      <BreadcrumbSchema items={[
        { name: 'Home', href: '/' },
        { name: 'Deal Flow Database' },
      ]} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Space Industry Deal Flow"
          subtitle="Track funding rounds, M&A, IPOs, SPACs, and major contract wins across the space economy"
          icon="💎"
          accentColor="emerald"
        />

        {/* Error Banner */}
        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
            <button
              onClick={fetchDeals}
              className="mt-2 text-xs text-slate-400 hover:text-white transition-colors underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stats Bar */}
        {stats && (
          <ScrollReveal>
            <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StaggerItem>
                <StatCard
                  label="Total Deals"
                  value={stats.totalDeals.toLocaleString()}
                  color="text-white"
                />
              </StaggerItem>
              <StaggerItem>
                <StatCard
                  label="Total Volume"
                  value={formatAmount(stats.totalVolume)}
                  color="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent"
                />
              </StaggerItem>
              <StaggerItem>
                <StatCard
                  label="Avg Deal Size"
                  value={formatAmount(stats.avgDealSize)}
                  color="text-purple-400"
                />
              </StaggerItem>
              <StaggerItem>
                <StatCard
                  label="YTD Deals"
                  value={stats.ytdDealCount.toString()}
                  subValue={stats.ytdVolume > 0 ? formatAmount(stats.ytdVolume) : undefined}
                  color="text-amber-400"
                />
              </StaggerItem>
            </StaggerContainer>
          </ScrollReveal>
        )}

        {/* Tabs */}
        <ScrollReveal>
          <div className="flex flex-wrap gap-2 mb-6">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.value;
              const typeCount = stats?.byType.find((t) => t.type === tab.value)?.count;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value as DealType | '')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  {tab.label}
                  {tab.value && typeCount !== undefined && (
                    <span className={`ml-1.5 text-xs ${isActive ? 'text-cyan-400/70' : 'text-slate-500'}`}>
                      ({typeCount})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollReveal>

        {/* Filters */}
        <ScrollReveal>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  aria-label="Search deals by company, title, or description"
                  placeholder="Search deals by company, title, or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-sm"
                />
                <svg className="absolute left-3 top-3 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Amount range */}
              <select
                aria-label="Filter by deal amount"
                value={amountRange}
                onChange={(e) => setAmountRange(e.target.value)}
                className="px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                {AMOUNT_RANGES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* Date from */}
              <input
                type="date"
                aria-label="Date from"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />

              {/* Date to */}
              <input
                type="date"
                aria-label="Date to"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />

              {hasFilters && (
                <button
                  onClick={() => {
                    setActiveTab('');
                    setSearch('');
                    setAmountRange('');
                    setDateFrom('');
                    setDateTo('');
                    setCompany('');
                  }}
                  className="px-3 py-2.5 text-sm text-slate-400 hover:text-white transition-colors border border-slate-700/50 rounded-lg hover:bg-slate-700/30"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
              <span>{total} deal{total !== 1 ? 's' : ''} found</span>
              <button
                onClick={() => setChartsVisible(!chartsVisible)}
                className="text-cyan-400/70 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {chartsVisible ? 'Hide Charts' : 'Show Charts'}
              </button>
            </div>
          </div>
        </ScrollReveal>

        {/* Charts Section (collapsible) */}
        <AnimatePresence>
          {chartsVisible && stats && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mb-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quarterly Volume Bar Chart (CSS-based) */}
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                  <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </span>
                    Deal Volume by Quarter
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">Total deal value per quarter</p>
                  <div className="flex items-end gap-2 h-44">
                    {stats.byQuarter.map((q) => {
                      const heightPct = q.volume > 0 ? (q.volume / maxQuarterlyVolume) * 100 : 2;
                      return (
                        <div
                          key={q.quarter}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <div className="text-[10px] font-medium text-slate-400 truncate">
                            {q.volume > 0 ? formatChartVolume(q.volume) : '--'}
                          </div>
                          <div className="w-full flex justify-center">
                            <div
                              className="w-full max-w-[40px] rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-500"
                              style={{
                                height: `${Math.max(heightPct * 1.4, 4)}px`,
                              }}
                            />
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {q.quarter}
                          </div>
                          <div className="text-[9px] text-slate-600">
                            {q.count} deal{q.count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Deals by Type Breakdown (CSS-based) */}
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                  <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                      </svg>
                    </span>
                    Deals by Type
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">Distribution of deal types</p>

                  {/* Stacked bar */}
                  <div className="w-full h-6 rounded-full overflow-hidden flex mb-4">
                    {typeChartData.map((entry) => {
                      const pct = totalTypeCount > 0 ? (entry.count / totalTypeCount) * 100 : 0;
                      return (
                        <div
                          key={entry.name}
                          className={`${TYPE_COLORS[entry.name] || 'bg-slate-500'} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                          title={`${entry.name}: ${entry.count} deals`}
                        />
                      );
                    })}
                  </div>

                  {/* Legend with bars */}
                  <div className="space-y-3">
                    {typeChartData.map((entry) => {
                      const pct = totalTypeCount > 0 ? (entry.count / totalTypeCount) * 100 : 0;
                      return (
                        <div key={entry.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${TYPE_COLORS[entry.name] || 'bg-slate-500'}`} />
                              <span className="text-slate-300">{entry.name}</span>
                            </div>
                            <span className="text-slate-400">
                              {entry.count} deals ({pct.toFixed(0)}%) -- {formatChartVolume(entry.volume)}
                            </span>
                          </div>
                          <div className="w-full bg-slate-700/30 rounded-full h-2">
                            <div
                              className={`${TYPE_COLORS[entry.name] || 'bg-slate-500'} h-2 rounded-full transition-all duration-500`}
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Deal List */}
        <div className="mb-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner />
            </div>
          ) : deals.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">
                <svg className="w-16 h-16 mx-auto text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No deals found</h3>
              <p className="text-slate-400 mb-4">Try adjusting your search or filters</p>
              {hasFilters && (
                <button
                  onClick={() => {
                    setActiveTab('');
                    setSearch('');
                    setAmountRange('');
                    setDateFrom('');
                    setDateTo('');
                    setCompany('');
                  }}
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {deals.map((deal, i) => (
                  <React.Fragment key={deal.id}>
                    <DealCard deal={deal} index={i} />
                    {(i + 1) % 12 === 0 && i + 1 < deals.length && (
                      <div className="py-1">
                        <AdSlot position="in_feed" module="deals" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <ScrollReveal>
            <div className="flex items-center justify-center gap-2 mb-8">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </ScrollReveal>
        )}

        {/* Data Sources Footer */}
        <ScrollReveal>
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 p-6">
            <h4 className="text-slate-400 font-semibold text-sm mb-3">Data Sources</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-500">
              <div>SEC Filings (EDGAR)</div>
              <div>Crunchbase -- Startup Funding Data</div>
              <div>PitchBook -- Private Market Intelligence</div>
              <div>Space Capital -- Quarterly Reports</div>
              <div>Company Press Releases</div>
              <div>SpaceNews -- Industry Coverage</div>
              <div>DoD & NASA Contract Awards</div>
              <div>USASpending.gov</div>
              <div>Bloomberg & Reuters -- Market Data</div>
            </div>
            <p className="text-slate-600 text-xs mt-3">
              Deal data is compiled from publicly available sources. Amounts are based on reported figures and may not reflect
              exact transaction values. This is not investment advice -- always conduct your own due diligence.
            </p>
          </div>
        </ScrollReveal>

        {/* Footer Ad */}
        <div className="mt-8">
          <AdSlot position="footer" module="deals" />
        </div>
      </div>
    </div>
  );
}

export default function DealsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex justify-center items-center">
        <LoadingSpinner />
      </div>
    }>
      <DealsPageContent />
    </Suspense>
  );
}
