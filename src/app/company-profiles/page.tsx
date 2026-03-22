'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import SubscribeCTA from '@/components/marketing/SubscribeCTA';
import FeatureTeaser from '@/components/marketing/FeatureTeaser';
import { useSubscription } from '@/components/SubscriptionProvider';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import WatchButton from '@/components/watchlist/WatchButton';
import SaveSearchButton from '@/components/watchlist/SaveSearchButton';
import ExportButton from '@/components/ui/ExportButton';
import AdSlot from '@/components/ads/AdSlot';
import EmptyState from '@/components/ui/EmptyState';
import PullToRefresh from '@/components/ui/PullToRefresh';
import StickyMobileCTA from '@/components/mobile/StickyMobileCTA';
import SponsorBadge from '@/components/company/SponsorBadge';
import ItemListSchema from '@/components/seo/ItemListSchema';
import FAQSchema from '@/components/seo/FAQSchema';

interface CompanyCard {
  id: string;
  slug: string;
  name: string;
  ticker: string | null;
  exchange: string | null;
  headquarters: string | null;
  country: string | null;
  foundedYear: number | null;
  employeeRange: string | null;
  website: string | null;
  description: string | null;
  logoUrl: string | null;
  isPublic: boolean;
  marketCap: number | null;
  status: string;
  sector: string | null;
  subsector: string | null;
  tags: string[];
  tier: number;
  sponsorTier: string | null;
  sponsorTagline: string | null;
  totalFunding: number | null;
  lastFundingRound: string | null;
  valuation: number | null;
  revenueEstimate: number | null;
  ownershipType: string | null;
  dataCompleteness: number;
  _count: {
    fundingRounds: number;
    products: number;
    keyPersonnel: number;
    contracts: number;
    events: number;
    satelliteAssets: number;
    facilities: number;
  };
}

interface Stats {
  totalCompanies: number;
  totalFundingTracked: number;
  totalMarketCap: number;
  avgCompleteness: number;
  sectors: { sector: string | null; count: number }[];
}

const SECTOR_OPTIONS = [
  { value: '', label: 'All Sectors' },
  { value: 'launch', label: 'Launch Providers' },
  { value: 'satellite', label: 'Satellite Operators' },
  { value: 'defense', label: 'Defense & National Security' },
  { value: 'infrastructure', label: 'Infrastructure & Services' },
  { value: 'ground-segment', label: 'Ground Segment' },
  { value: 'manufacturing', label: 'Components & Manufacturing' },
  { value: 'analytics', label: 'Analytics & Software' },
  { value: 'agency', label: 'Space Agencies' },
  { value: 'exploration', label: 'Exploration & Science' },
];

const TIER_OPTIONS = [
  { value: '', label: 'All Tiers' },
  { value: '1', label: 'Tier 1 — Must Have' },
  { value: '2', label: 'Tier 2 — High Growth' },
  { value: '3', label: 'Tier 3 — Emerging' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'acquired', label: 'Acquired' },
  { value: 'pre-revenue', label: 'Pre-Revenue' },
  { value: 'defunct', label: 'Defunct' },
];

function formatMoney(value: number | null, compact = true): string {
  if (!value) return '—';
  if (compact) {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

function getSectorIcon(sector: string | null): string {
  const map: Record<string, string> = {
    launch: '🚀', satellite: '🛰️', defense: '🛡️', infrastructure: '🏗️',
    'ground-segment': '📡', manufacturing: '⚙️', analytics: '📊',
    agency: '🏛️', exploration: '🔭', services: '🔧',
  };
  return map[sector || ''] || '🏢';
}

function getTierBadge(tier: number) {
  const styles: Record<number, { bg: string; text: string; label: string }> = {
    1: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'TIER 1' },
    2: { bg: 'bg-white/10', text: 'text-slate-300', label: 'TIER 2' },
    3: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'TIER 3' },
  };
  const style = styles[tier] || styles[3];
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function CompanyCardComponent({ company, index }: { company: CompanyCard; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.4 }}
    >
      <Link href={`/company-profiles/${company.slug}`}>
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={`card p-5 h-full group cursor-pointer relative overflow-hidden ${
            company.sponsorTier === 'premium' ? 'ring-1 ring-amber-500/30' :
            company.sponsorTier === 'verified' ? 'ring-1 ring-blue-500/20' : ''
          }`}
        >
          {/* Animated gradient border on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-[-1px] rounded-xl bg-gradient-to-r from-white/30 via-purple-500/30 to-slate-200/30 animate-pulse" />
            <div className="absolute inset-[1px] rounded-xl bg-black/95" />
          </div>

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-white/[0.08] to-white/[0.06] flex items-center justify-center text-lg flex-shrink-0 border border-white/[0.1]">
                  {company.logoUrl ? (
                    <Image src={company.logoUrl} alt={`${company.name} logo`} width={28} height={28} sizes="28px" className="w-7 h-7 rounded object-contain" unoptimized />
                  ) : (
                    getSectorIcon(company.sector)
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white truncate group-hover:text-white transition-colors">
                    {company.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    {company.ticker && (
                      <span className="font-mono text-slate-300">{company.ticker}</span>
                    )}
                    {company.headquarters && (
                      <span className="truncate">{company.headquarters}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <WatchButton companyProfileId={company.id} companyName={company.name} size="sm" />
                {getTierBadge(company.tier)}
                {company.sponsorTier && <SponsorBadge tier={company.sponsorTier as 'verified' | 'premium'} />}
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
              {company.description || 'No description available.'}
            </p>

            {company.sponsorTagline && (
              <p className="text-xs text-white/70 italic mb-2">{company.sponsorTagline}</p>
            )}

            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {company.totalFunding && (
                <div className="bg-white/[0.04] rounded-lg p-2">
                  <div className="text-xs text-slate-500 uppercase tracking-wider">Funding</div>
                  <div className="text-sm font-semibold text-emerald-400">
                    {formatMoney(company.totalFunding)}
                  </div>
                </div>
              )}
              {company.isPublic && company.marketCap ? (
                <div className="bg-white/[0.04] rounded-lg p-2">
                  <div className="text-xs text-slate-500 uppercase tracking-wider">Market Cap</div>
                  <div className="text-sm font-semibold text-blue-400">
                    {formatMoney(company.marketCap)}
                  </div>
                </div>
              ) : company.revenueEstimate ? (
                <div className="bg-white/[0.04] rounded-lg p-2">
                  <div className="text-xs text-slate-500 uppercase tracking-wider">Revenue</div>
                  <div className="text-sm font-semibold text-blue-400">
                    {formatMoney(company.revenueEstimate)}
                  </div>
                </div>
              ) : company.valuation ? (
                <div className="bg-white/[0.04] rounded-lg p-2">
                  <div className="text-xs text-slate-500 uppercase tracking-wider">Valuation</div>
                  <div className="text-sm font-semibold text-purple-400">
                    {formatMoney(company.valuation)}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-3">
              {company.sector && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-300 border border-white/[0.06]">
                  {getSectorIcon(company.sector)} {company.sector}
                </span>
              )}
              {company.tags?.slice(0, 2).map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                  {tag}
                </span>
              ))}
            </div>

            {/* Bottom Stats */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-white/[0.06]">
              <div className="flex gap-3">
                {company._count.products > 0 && (
                  <span>{company._count.products} products</span>
                )}
                {company._count.keyPersonnel > 0 && (
                  <span>{company._count.keyPersonnel} people</span>
                )}
                {company._count.contracts > 0 && (
                  <span>{company._count.contracts} contracts</span>
                )}
                {company._count.satelliteAssets > 0 && (
                  <span>{company._count.satelliteAssets} satellites</span>
                )}
              </div>
              {company.employeeRange && (
                <span>{company.employeeRange} employees</span>
              )}
            </div>

            {/* Completeness indicator */}
            <div className="mt-2">
              <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${company.dataCompleteness}%` }}
                  transition={{ delay: index * 0.03 + 0.5, duration: 0.8 }}
                  className={`h-full rounded-full ${
                    company.dataCompleteness >= 75 ? 'bg-emerald-500' :
                    company.dataCompleteness >= 50 ? 'bg-amber-500' :
                    'bg-red-500'
                  }`}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card p-4"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-xl`}>
          {icon}
        </div>
        <div>
          <div className="text-xl font-bold text-white">{value}</div>
          <div className="text-xs text-slate-400">{label}</div>
        </div>
      </div>
    </motion.div>
  );
}

export default function CompanyProfilesPage() {
  const { tier: subTier } = useSubscription();
  const isFreeUser = subTier === 'free';
  const FREE_PREVIEW_LIMIT = 6;

  const [companies, setCompanies] = useState<CompanyCard[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [tier, setTier] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('tier');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 24;

  const COMPANY_EXPORT_COLUMNS = [
    { key: 'name', label: 'Name' },
    { key: 'sector', label: 'Sector' },
    { key: 'country', label: 'Country' },
    { key: 'headquarters', label: 'Headquarters' },
    { key: 'tier', label: 'Tier' },
    { key: 'foundedYear', label: 'Founded' },
    { key: 'status', label: 'Status' },
    { key: 'employeeRange', label: 'Employees' },
    { key: 'isPublic', label: 'Public' },
    { key: 'ticker', label: 'Ticker' },
    { key: 'totalFunding', label: 'Total Funding ($)' },
    { key: 'marketCap', label: 'Market Cap ($)' },
    { key: 'revenueEstimate', label: 'Revenue Estimate ($)' },
    { key: 'website', label: 'Website' },
  ];

  const buildParams = useCallback((offset = 0) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sector) params.set('sector', sector);
    if (tier) params.set('tier', tier);
    if (statusFilter) params.set('status', statusFilter);
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));
    return params;
  }, [search, sector, tier, statusFilter, sortBy, sortOrder]);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/company-profiles?${buildParams(0)}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCompanies(data.companies || []);
      setTotal(data.total);
      setStats(data.stats);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/company-profiles?${buildParams(companies.length)}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCompanies(prev => [...prev, ...(data.companies || [])]);
    } catch {
      // silent — user can retry
    } finally {
      setLoadingMore(false);
    }
  }, [buildParams, companies.length]);

  useEffect(() => {
    const debounce = setTimeout(fetchCompanies, 300);
    return () => clearTimeout(debounce);
  }, [fetchCompanies]);

  return (
    <PullToRefresh onRefresh={async () => { await fetchCompanies(); }}>
    <div className="min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto">
      <ItemListSchema
        name="Space Company Directory"
        description="Comprehensive directory of 200+ space industry companies with financial data, satellite assets, facility locations, and competitive analysis."
        url="/company-profiles"
        items={
          companies.slice(0, 30).map(c => ({
            name: c.name,
            url: `/company-profiles/${c.slug}`,
            description: c.description || `${c.name} - ${c.sector || 'Space'} company${c.headquarters ? ` based in ${c.headquarters}` : ''}`,
          }))
        }
      />
      <FAQSchema items={[
        { question: 'How many space companies does SpaceNexus track?', answer: 'SpaceNexus profiles over 100 space and aerospace companies across launch, satellite, defense, infrastructure, ground segment, manufacturing, and analytics sectors, from publicly traded primes to venture-backed startups.' },
        { question: 'How are space companies ranked on SpaceNexus?', answer: 'Companies are organized by tier: Tier 1 (industry leaders with $1B+ revenue or market cap), Tier 2 (established players with significant market presence), and Tier 3 (emerging companies and startups).' },
        { question: 'How do I claim a company profile?', answer: 'Verified company representatives can claim their profile by clicking the Claim This Profile button on the company detail page and submitting a request with a company email address. Our team reviews claims within 48 hours.' },
      ]} />
      <AnimatedPageHeader
        title="Space Company Profiles"
        subtitle="Comprehensive intelligence on 100+ space industry companies — financials, leadership, products, contracts, and relationships"
        icon="🏢"
      />

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Companies Tracked" value={stats.totalCompanies.toString()} icon="🏢" color="bg-white/10" />
          <StatCard label="Funding Tracked" value={formatMoney(stats.totalFundingTracked)} icon="💰" color="bg-emerald-500/20" />
          <StatCard label="Market Cap Tracked" value={formatMoney(stats.totalMarketCap)} icon="📈" color="bg-blue-500/20" />
          <StatCard label="Avg Completeness" value={`${stats.avgCompleteness}%`} icon="📊" color="bg-purple-500/20" />
        </div>
      )}

      {/* Filters */}
      <ScrollReveal>
        <div className="card p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <input
                type="search"
                aria-label="Search companies by name, ticker, or location"
                placeholder="Search companies by name, ticker, or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 bg-white/[0.06] border border-white/[0.06] text-white rounded-lg py-2 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
              />
              <svg className="absolute left-3 top-3 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Filter dropdowns */}
            <select
              aria-label="Filter by sector"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
            >
              {SECTOR_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              aria-label="Filter by tier"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
            >
              {TIER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              aria-label="Sort companies"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
            >
              <option value="tier-asc">Sort: Tier (1→3)</option>
              <option value="name-asc">Sort: Name (A→Z)</option>
              <option value="totalFunding-desc">Sort: Funding (High→Low)</option>
              <option value="employeeCount-desc">Sort: Employees (High→Low)</option>
              <option value="marketCap-desc">Sort: Market Cap (High→Low)</option>
              <option value="foundedYear-desc">Sort: Founded (Newest)</option>
              <option value="dataCompleteness-desc">Sort: Most Complete</option>
            </select>

            {/* View Toggle */}
            <div className="flex bg-white/[0.04] border border-white/[0.06] rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className={`min-w-[44px] min-h-[44px] px-3 py-2.5 text-sm transition-colors flex items-center justify-center ${viewMode === 'grid' ? 'bg-white/10 text-slate-300' : 'text-slate-400 hover:text-slate-900'}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3z"/>
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-label="List view"
                className={`min-w-[44px] min-h-[44px] px-3 py-2.5 text-sm transition-colors flex items-center justify-center ${viewMode === 'list' ? 'bg-white/10 text-slate-300' : 'text-slate-400 hover:text-slate-900'}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M2.5 12a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-3 gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span>{total} companies found</span>
              <SaveSearchButton
                searchType="company_directory"
                filters={{ sector, tier, status: statusFilter, sortBy, sortOrder }}
                query={search || undefined}
              />
              <ExportButton
                data={companies}
                filename="spacenexus-company-profiles"
                columns={COMPANY_EXPORT_COLUMNS}
                label="Export Companies"
              />
            </div>
            {stats && stats.sectors.length > 0 && (
              <div className="relative">
                <div className="flex gap-2 overflow-x-auto max-w-full pb-1 scrollbar-hide">
                  {stats.sectors.slice(0, 5).map(s => (
                    <button
                      key={s.sector}
                      onClick={() => setSector(s.sector || '')}
                      className="px-3 py-1.5 min-h-[44px] rounded bg-white/[0.04] hover:bg-white/[0.08] transition-colors whitespace-nowrap flex-shrink-0 text-xs focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                      {getSectorIcon(s.sector)} {s.sector} ({s.count})
                    </button>
                  ))}
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent pointer-events-none sm:hidden" />
              </div>
            )}
          </div>
        </div>
      </ScrollReveal>

      {/* Error Banner */}
      {error && !loading && (
        <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
          <div className="text-red-400 text-sm font-medium">{error}</div>
        </div>
      )}

      {/* Companies Grid/List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/[0.06] rounded w-3/4" />
                  <div className="h-3 bg-white/[0.06] rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2 mb-3">
                <div className="h-3 bg-white/[0.06] rounded" />
                <div className="h-3 bg-white/[0.06] rounded w-5/6" />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="h-12 bg-white/[0.06] rounded-lg" />
                <div className="h-12 bg-white/[0.06] rounded-lg" />
              </div>
              <div className="flex gap-1">
                <div className="h-5 w-20 bg-white/[0.06] rounded-full" />
                <div className="h-5 w-16 bg-white/[0.06] rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : companies.length === 0 ? (
        <EmptyState
          icon={<span className="text-4xl">🔍</span>}
          title="No companies found"
          description="Try adjusting your search or filters to find matching companies."
        />
      ) : viewMode === 'grid' ? (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-grid">
          <AnimatePresence mode="popLayout">
            {(isFreeUser ? companies.slice(0, FREE_PREVIEW_LIMIT) : companies).map((company, i) => (
              <React.Fragment key={company.id}>
                <CompanyCardComponent company={company} index={i} />
                {(i + 1) % 9 === 0 && i + 1 < companies.length && (
                  <div className="col-span-1 md:col-span-2 xl:col-span-3">
                    <AdSlot position="in_feed" module="company-profiles" adsenseSlot="in_feed_companies" adsenseFormat="rectangle" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </AnimatePresence>
        </div>
        {isFreeUser && companies.length > FREE_PREVIEW_LIMIT && (
          <FeatureTeaser
            featureName="Company Profiles"
            description="Unlock full access to 200+ company profiles with funding data, executive teams, SpaceNexus Score ratings, and competitive analysis."
            requiredTier="pro"
            freePreviewCount={FREE_PREVIEW_LIMIT}
            totalCount={companies.length}
          >
            <div />
          </FeatureTeaser>
        )}
        </>
      ) : (
        <div className="space-y-2">
          {/* Sticky column header */}
          <div className="sticky top-0 z-10 hidden md:flex items-center gap-4 px-4 py-2.5 bg-black/95 backdrop-blur-md border border-white/[0.06] rounded-xl text-xs font-semibold uppercase tracking-wider text-slate-400">
            <div className="w-10 flex-shrink-0" />
            <div className="flex-1 min-w-0">Company</div>
            <div className="flex items-center gap-6">
              <div className="w-24 text-right">Funding</div>
              <div className="w-24 text-right">Market Cap</div>
              <div className="w-20 text-right">Employees</div>
            </div>
            <div className="w-4" />
          </div>
          <AnimatePresence mode="popLayout">
            {companies.map((company, i) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Link href={`/company-profiles/${company.slug}`}>
                  <motion.div
                    whileHover={{ x: 4 }}
                    className="card p-4 flex items-center gap-4 group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-white/[0.08] to-white/[0.06] flex items-center justify-center text-lg flex-shrink-0 border border-white/[0.1]">
                      {company.logoUrl ? (
                        <Image src={company.logoUrl} alt={`${company.name} logo`} width={28} height={28} sizes="28px" className="w-7 h-7 rounded object-contain" unoptimized />
                      ) : (
                        getSectorIcon(company.sector)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white group-hover:text-white transition-colors truncate">
                          {company.name}
                        </span>
                        {company.ticker && (
                          <span className="text-xs font-mono text-slate-300">{company.ticker}</span>
                        )}
                        {getTierBadge(company.tier)}
                        {company.sponsorTier && <SponsorBadge tier={company.sponsorTier as 'verified' | 'premium'} />}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {company.headquarters} {company.sector && `· ${company.sector}`}
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-sm">
                      {company.totalFunding && (
                        <div className="text-right">
                          <div className="text-emerald-400 font-semibold">{formatMoney(company.totalFunding)}</div>
                          <div className="text-xs text-slate-500">funding</div>
                        </div>
                      )}
                      {company.isPublic && company.marketCap ? (
                        <div className="text-right">
                          <div className="text-blue-400 font-semibold">{formatMoney(company.marketCap)}</div>
                          <div className="text-xs text-slate-500">market cap</div>
                        </div>
                      ) : null}
                      {company.employeeRange && (
                        <div className="text-right w-20">
                          <div className="text-slate-300">{company.employeeRange}</div>
                          <div className="text-xs text-slate-500">employees</div>
                        </div>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Load More */}
      {!loading && companies.length < total && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-8 py-3 bg-white/[0.06] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/10 text-slate-300 hover:text-white rounded-xl transition-all duration-200 font-medium text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <LoadingSpinner size="sm" />
                Loading...
              </>
            ) : (
              <>
                Show More Companies
                <span className="text-xs text-slate-500">
                  ({companies.length} of {total})
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Footer Ad */}
      <div className="mt-8">
        <AdSlot position="footer" module="company-profiles" adsenseSlot="footer_companies" adsenseFormat="horizontal" />

            {/* FeatureTeaser moved inline above the company grid */}
            <SubscribeCTA />

            <ScrollReveal>
              <RelatedModules
                modules={[
              { name: 'Market Intelligence', description: 'Space industry market data and trends', href: '/market-intel', icon: '📈' },
              { name: 'Funding Tracker', description: 'VC deals and investment rounds', href: '/funding-tracker', icon: '💰' },
              { name: 'Investment Tracker', description: 'Space sector investment analysis', href: '/investment-tracker', icon: '📊' },
              { name: 'Space Talent Hub', description: 'Jobs and workforce intelligence', href: '/space-talent', icon: '👥' },
                ]}
              />
            </ScrollReveal>

      </div>
    </div>
    <StickyMobileCTA
      label="Track Companies"
      href="/register?ref=company-profiles"
      icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>}
    />
    </PullToRefresh>
  );
}
