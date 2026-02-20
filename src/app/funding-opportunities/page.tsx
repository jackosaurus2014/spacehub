'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

// ---------- Types ----------

interface FundingOpportunity {
  id: string;
  externalId: string | null;
  title: string;
  description: string | null;
  agency: string;
  program: string | null;
  fundingType: string;
  amountMin: number | null;
  amountMax: number | null;
  totalBudget: number | null;
  deadline: string | null;
  openDate: string | null;
  status: string;
  eligibility: string[];
  setAside: string | null;
  categories: string[];
  applicationUrl: string | null;
  sourceUrl: string | null;
  source: string;
  contactName: string | null;
  contactEmail: string | null;
  naicsCode: string | null;
  solicitationNumber: string | null;
  stateIncentive: boolean;
  state: string | null;
  recurring: boolean;
}

interface Stats {
  total: number;
  open: number;
  byAgency: { agency: string; count: number }[];
  byType: { type: string; count: number }[];
  totalAvailableFunding: number;
}

// ---------- Constants ----------

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'rolling', label: 'Rolling' },
  { value: 'closed', label: 'Closed' },
];

const AGENCY_OPTIONS = [
  { value: '', label: 'All Agencies' },
  { value: 'NASA', label: 'NASA' },
  { value: 'DARPA', label: 'DARPA' },
  { value: 'NSF', label: 'NSF' },
  { value: 'Space Force', label: 'US Space Force' },
  { value: 'ESA', label: 'ESA' },
  { value: 'Space Florida', label: 'Space Florida' },
  { value: 'UK Space Agency', label: 'UK Space Agency' },
  { value: 'Canadian Space Agency', label: 'CSA' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'propulsion', label: 'Propulsion' },
  { value: 'earth_observation', label: 'Earth Observation' },
  { value: 'communications', label: 'Communications' },
  { value: 'launch', label: 'Launch' },
  { value: 'in_space', label: 'In-Space' },
  { value: 'defense', label: 'Defense' },
  { value: 'lunar', label: 'Lunar' },
  { value: 'debris', label: 'Debris' },
  { value: 'exploration', label: 'Exploration' },
  { value: 'navigation', label: 'Navigation' },
  { value: 'earth_science', label: 'Earth Science' },
  { value: 'general', label: 'General' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'grant', label: 'Grant' },
  { value: 'contract', label: 'Contract' },
  { value: 'cooperative_agreement', label: 'Cooperative Agreement' },
  { value: 'sbir', label: 'SBIR' },
  { value: 'sttr', label: 'STTR' },
  { value: 'prize', label: 'Prize' },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  propulsion: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  earth_observation: { bg: 'bg-green-500/20', text: 'text-green-400' },
  communications: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  launch: { bg: 'bg-red-500/20', text: 'text-red-400' },
  in_space: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  defense: { bg: 'bg-slate-500/20', text: 'text-slate-300' },
  lunar: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  debris: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  exploration: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  navigation: { bg: 'bg-teal-500/20', text: 'text-teal-400' },
  earth_science: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  general: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
};

const AGENCY_ICONS: Record<string, string> = {
  NASA: '🚀',
  DARPA: '🛡️',
  NSF: '🔬',
  'US Space Force': '⭐',
  ESA: '🇪🇺',
  'Space Florida': '🌴',
  'UK Space Agency': '🇬🇧',
  'Canadian Space Agency': '🇨🇦',
};

// ---------- Helpers ----------

function formatMoney(value: number | null): string {
  if (!value) return '';
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function formatAmountRange(min: number | null, max: number | null): string {
  if (min && max) return `${formatMoney(min)} - ${formatMoney(max)}`;
  if (max) return `Up to ${formatMoney(max)}`;
  if (min) return `From ${formatMoney(min)}`;
  return 'Varies';
}

function getDeadlineInfo(deadline: string | null, status: string): { text: string; urgency: 'critical' | 'warning' | 'normal' | 'none' } {
  if (status === 'rolling') return { text: 'Rolling Deadline', urgency: 'none' };
  if (!deadline) return { text: 'No deadline listed', urgency: 'none' };

  const d = new Date(deadline);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: 'Closed', urgency: 'none' };
  if (diffDays === 0) return { text: 'Closes today!', urgency: 'critical' };
  if (diffDays === 1) return { text: 'Closes tomorrow!', urgency: 'critical' };
  if (diffDays <= 7) return { text: `${diffDays} days left`, urgency: 'critical' };
  if (diffDays <= 30) return { text: `${diffDays} days left`, urgency: 'warning' };
  return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), urgency: 'normal' };
}

function getStatusBadge(status: string) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    open: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'OPEN' },
    upcoming: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'UPCOMING' },
    rolling: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'ROLLING' },
    closed: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'CLOSED' },
  };
  const style = styles[status] || styles.closed;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function getEligibilityLabel(elig: string): string {
  const map: Record<string, string> = {
    small_business: 'Small Business',
    university: 'University',
    nonprofit: 'Nonprofit',
    government: 'Government',
    any: 'Open to All',
  };
  return map[elig] || elig;
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    grant: 'Grant',
    contract: 'Contract',
    cooperative_agreement: 'Cooperative Agreement',
    sbir: 'SBIR',
    sttr: 'STTR',
    prize: 'Prize Competition',
  };
  return map[type] || type;
}

function getCategoryLabel(cat: string): string {
  const map: Record<string, string> = {
    propulsion: 'Propulsion',
    earth_observation: 'Earth Observation',
    communications: 'Communications',
    launch: 'Launch',
    in_space: 'In-Space',
    defense: 'Defense',
    lunar: 'Lunar',
    debris: 'Debris',
    exploration: 'Exploration',
    navigation: 'Navigation',
    earth_science: 'Earth Science',
    general: 'General',
  };
  return map[cat] || cat;
}

function getAgencyIcon(agency: string): string {
  for (const [key, icon] of Object.entries(AGENCY_ICONS)) {
    if (agency.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return '🏛️';
}

// ---------- Components ----------

function OpportunityCard({ opp, index }: { opp: FundingOpportunity; index: number }) {
  const deadlineInfo = getDeadlineInfo(opp.deadline, opp.status);
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.4 }}
      className="card p-5 group relative overflow-hidden"
    >
      {/* Urgency indicator bar */}
      {deadlineInfo.urgency === 'critical' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-red-400" />
      )}
      {deadlineInfo.urgency === 'warning' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 to-yellow-400" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-lg flex-shrink-0 border border-slate-600/50">
            {getAgencyIcon(opp.agency)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white leading-tight line-clamp-2 group-hover:text-cyan-400 transition-colors">
              {opp.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="font-medium text-cyan-400">{opp.agency}</span>
              {opp.program && (
                <>
                  <span className="text-slate-600">|</span>
                  <span className="truncate">{opp.program}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {getStatusBadge(opp.status)}
        </div>
      </div>

      {/* Description */}
      <p className={`text-xs text-slate-400 mb-3 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
        {opp.description || 'No description available.'}
      </p>
      {opp.description && opp.description.length > 150 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-cyan-400 hover:text-cyan-300 mb-3 transition-colors"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {/* Key Info Row */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Award Range</div>
          <div className="text-sm font-semibold text-emerald-400">
            {formatAmountRange(opp.amountMin, opp.amountMax)}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Deadline</div>
          <div className={`text-sm font-semibold ${
            deadlineInfo.urgency === 'critical' ? 'text-red-400' :
            deadlineInfo.urgency === 'warning' ? 'text-yellow-400' :
            'text-slate-300'
          }`}>
            {deadlineInfo.text}
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-1 mb-3">
        {opp.categories.slice(0, 4).map(cat => {
          const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.general;
          return (
            <span key={cat} className={`text-[10px] px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border border-slate-600/30`}>
              {getCategoryLabel(cat)}
            </span>
          );
        })}
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 border border-slate-600/30">
          {getTypeLabel(opp.fundingType)}
        </span>
        {opp.stateIncentive && opp.state && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {opp.state} State
          </span>
        )}
      </div>

      {/* Eligibility */}
      <div className="flex flex-wrap gap-1 mb-3">
        {opp.eligibility.slice(0, 3).map(elig => (
          <span key={elig} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/30">
            {getEligibilityLabel(elig)}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span>Source: {opp.source}</span>
          {opp.recurring && (
            <span className="text-cyan-400 font-medium">Recurring</span>
          )}
          {opp.solicitationNumber && (
            <span className="font-mono">{opp.solicitationNumber}</span>
          )}
        </div>
        {opp.applicationUrl && (
          <a
            href={opp.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/30 transition-colors border border-cyan-500/30"
          >
            Apply Now
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </motion.div>
  );
}

// ---------- Main Page ----------

export default function FundingOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<FundingOpportunity[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('open');
  const [agency, setAgency] = useState('');
  const [category, setCategory] = useState('');
  const [fundingType, setFundingType] = useState('');
  const [stateOnly, setStateOnly] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 24;

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (agency) params.set('agency', agency);
      if (category) params.set('category', category);
      if (fundingType) params.set('type', fundingType);
      if (stateOnly) params.set('stateIncentive', 'true');
      if (search) params.set('q', search);
      params.set('limit', String(limit));
      params.set('offset', String(offset));

      const res = await fetch(`/api/funding-opportunities?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setOpportunities(data.opportunities || []);
      setTotal(data.pagination?.total || 0);
    } catch {
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  }, [status, agency, category, fundingType, stateOnly, search, offset]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/funding-opportunities/stats');
      if (res.ok) {
        setStats(await res.json());
      }
    } catch {
      // Stats are non-critical
    }
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Reset pagination when filters change
  useEffect(() => {
    setOffset(0);
  }, [status, agency, category, fundingType, stateOnly, search]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="min-h-screen">
      <BreadcrumbSchema items={[
        { name: 'Home', href: '/' },
        { name: 'Funding Opportunities' },
      ]} />
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-700/50">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-slate-900 to-cyan-900/20" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Space Funding{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Opportunities
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
              Discover grants, contracts, SBIR/STTR awards, and state incentives for space companies.
              Aggregated from Grants.gov, SAM.gov, SBIR.gov, NASA NSPIRES, and curated programs.
            </p>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <div className="bg-slate-800/60 backdrop-blur rounded-xl p-4 border border-slate-700/50">
                <div className="text-2xl font-bold text-emerald-400">
                  {stats?.open ?? '--'}
                </div>
                <div className="text-xs text-slate-400 mt-1">Open Opportunities</div>
              </div>
              <div className="bg-slate-800/60 backdrop-blur rounded-xl p-4 border border-slate-700/50">
                <div className="text-2xl font-bold text-cyan-400">
                  {stats?.total ?? '--'}
                </div>
                <div className="text-xs text-slate-400 mt-1">Total Tracked</div>
              </div>
              <div className="bg-slate-800/60 backdrop-blur rounded-xl p-4 border border-slate-700/50">
                <div className="text-2xl font-bold text-purple-400">
                  {stats?.byAgency?.length ?? '--'}
                </div>
                <div className="text-xs text-slate-400 mt-1">Agencies</div>
              </div>
              <div className="bg-slate-800/60 backdrop-blur rounded-xl p-4 border border-slate-700/50">
                <div className="text-2xl font-bold text-amber-400">
                  {stats?.totalAvailableFunding ? formatMoney(stats.totalAvailableFunding) : '--'}
                </div>
                <div className="text-xs text-slate-400 mt-1">Available Funding</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="sticky top-[72px] z-30 border-b border-slate-700/50 bg-slate-900/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search opportunities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/50 text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40"
              />
            </div>

            {/* Status */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Agency */}
            <select
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            >
              {AGENCY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Category */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 hidden sm:block"
            >
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Type */}
            <select
              value={fundingType}
              onChange={(e) => setFundingType(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 hidden sm:block"
            >
              {TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* State Incentives Toggle */}
            <button
              onClick={() => setStateOnly(!stateOnly)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                stateOnly
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-slate-800/80 text-slate-400 border border-slate-700/50 hover:text-white'
              }`}
            >
              State Incentives
            </button>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        {/* Results count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-slate-400">
            {loading ? 'Loading...' : `${total} opportunit${total === 1 ? 'y' : 'ies'} found`}
          </p>
          {total > 0 && totalPages > 1 && (
            <p className="text-sm text-slate-500">
              Page {currentPage} of {totalPages}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : opportunities.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">No opportunities found</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Try adjusting your filters or search terms. You can also trigger a data refresh to pull the latest opportunities.
            </p>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {opportunities.map((opp, index) => (
                  <OpportunityCard key={opp.id} opp={opp} index={index} />
                ))}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm border border-slate-700/50 hover:border-cyan-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setOffset((pageNum - 1) * limit)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700/50 hover:border-cyan-500/40'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setOffset(Math.min((totalPages - 1) * limit, offset + limit))}
                  disabled={currentPage >= totalPages}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm border border-slate-700/50 hover:border-cyan-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Agency Breakdown (when stats available) */}
      {stats && stats.byAgency.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-bold text-white mb-4">By Agency</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {stats.byAgency.map(({ agency: agencyName, count }) => (
              <button
                key={agencyName}
                onClick={() => { setAgency(agencyName); setOffset(0); }}
                className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 hover:border-cyan-500/30 transition-colors text-left group"
              >
                <div className="text-lg mb-1">{getAgencyIcon(agencyName)}</div>
                <div className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors truncate">{agencyName}</div>
                <div className="text-xs text-slate-400">{count} opportunit{count === 1 ? 'y' : 'ies'}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Funding Type Breakdown */}
      {stats && stats.byType.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <h2 className="text-xl font-bold text-white mb-4">By Funding Type</h2>
          <div className="flex flex-wrap gap-3">
            {stats.byType.map(({ type, count }) => (
              <button
                key={type}
                onClick={() => { setFundingType(type); setOffset(0); }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-cyan-500/30 transition-colors"
              >
                <span className="text-sm text-white">{getTypeLabel(type)}</span>
                <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">{count}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
