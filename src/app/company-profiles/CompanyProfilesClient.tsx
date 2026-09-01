'use client';

/**
 * The interactive half of /company-profiles (SYNTHESIS.md item 14).
 *
 * The <h1>, the deck, the provenance line and the first screen of rows are
 * rendered by the SERVER component in ./page.tsx and handed to this island as
 * `children`. This component owns search, filters, sort, view mode, load-more
 * and the Pro gating — nothing else. It does NOT refetch the default view on
 * hydration (see `skipFirstFetch`).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import VirtualList from '@/components/ui/VirtualList';
import ScrollReveal from '@/components/ui/ScrollReveal';
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
import CompanyAvatar from '@/components/company/CompanyAvatar';
import CompanyDirectoryTable from './CompanyDirectoryTable';
import { SITE_STATS } from '@/lib/site-stats';
import {
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  DIRECTORY_PAGE_SIZE,
  SECTOR_OPTIONS,
  STATUS_OPTIONS,
  TIER_OPTIONS,
  formatMoney,
  getSectorIcon,
  type CompanyCard,
  type DirectoryStats,
} from './shared';

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
                {company.logoUrl ? (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-white/[0.08] to-white/[0.06] flex items-center justify-center text-lg flex-shrink-0 border border-white/[0.1]">
                    <Image src={company.logoUrl} alt={`${company.name} logo`} width={28} height={28} sizes="28px" className="w-7 h-7 rounded object-contain" unoptimized />
                  </div>
                ) : (
                  <CompanyAvatar name={company.name} tier={company.tier} size={40} />
                )}
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
              {company._count.jobPostings > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {company._count.jobPostings} open role{company._count.jobPostings === 1 ? '' : 's'}
                </span>
              )}
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

            {/*
              The unlabeled `dataCompleteness` bar used to live here. Removed
              with the "Avg Completeness" tile (SYNTHESIS.md item 29): it is an
              internal data-quality metric, not intelligence about the company,
              and a red bar under a real company read as a judgement of the
              company rather than of our own coverage.
            */}
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

export interface CompanyProfilesClientProps {
  /** First page of rows, read on the server by page.tsx. */
  initialCompanies?: CompanyCard[];
  initialTotal?: number;
  initialStats?: DirectoryStats;
  /**
   * The server-rendered first screen (Console + DataTable). Shown while the
   * view is still at its defaults so the crawlable HTML is the same HTML the
   * first human sees — and so nothing is rendered twice.
   */
  children?: React.ReactNode;
}

export default function CompanyProfilesClient({
  initialCompanies,
  initialTotal,
  initialStats,
  children,
}: CompanyProfilesClientProps) {
  const { tier: subTier } = useSubscription();
  const isFreeUser = subTier === 'free';
  const FREE_PREVIEW_LIMIT = 6;

  // Seeded === the server handed us the default view. When it did, the first
  // effect pass must NOT refetch it (pattern: news/NewsPageClient.tsx:56,110).
  const seeded = Boolean(initialCompanies && initialCompanies.length > 0);

  const [companies, setCompanies] = useState<CompanyCard[]>(seeded ? initialCompanies! : []);
  const [stats, setStats] = useState<DirectoryStats | null>(initialStats ?? null);
  const [loading, setLoading] = useState(!seeded);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [tier, setTier] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState<string>(DEFAULT_SORT_BY);
  const [sortOrder, setSortOrder] = useState<string>(DEFAULT_SORT_ORDER);
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'list'>(seeded ? 'table' : 'grid');
  const [total, setTotal] = useState(initialTotal ?? 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const skipFirstFetch = useRef(seeded);
  /** True once the client has fetched or appended anything of its own. */
  const [clientOwnsRows, setClientOwnsRows] = useState(!seeded);

  // The server slot is the default view: no query deviation, no client fetch
  // yet, table mode. Anything else and the client renders its own rows.
  const showServerRows = Boolean(children) && seeded && !clientOwnsRows && viewMode === 'table';

  // The Pro upsell as it exists in grid view, reused under the table view so
  // the paywall surface is not lost now that the table is the default. The
  // rows themselves stay open in table/list view, exactly as list view has
  // always been — this splits no company data that was previously gated.
  const proTeaser = isFreeUser && companies.length > FREE_PREVIEW_LIMIT ? (
    <FeatureTeaser
      featureName="Company Profiles"
      description={`Unlock full access to ${SITE_STATS.companies} company profiles with funding data, executive teams, SpaceNexus Score ratings, and competitive analysis.`}
      requiredTier="pro"
      freePreviewCount={FREE_PREVIEW_LIMIT}
      totalCount={total}
    >
      <div />
    </FeatureTeaser>
  ) : null;

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
    params.set('limit', String(DIRECTORY_PAGE_SIZE));
    params.set('offset', String(offset));
    return params;
  }, [search, sector, tier, statusFilter, sortBy, sortOrder]);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    setClientOwnsRows(true);
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
      setClientOwnsRows(true);
    } catch {
      // silent — user can retry
    } finally {
      setLoadingMore(false);
    }
  }, [buildParams, companies.length]);

  useEffect(() => {
    // The server already rendered this exact query; do not repeat it on
    // hydration. Every later run (a filter, a search, a sort) fetches.
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    const debounce = setTimeout(fetchCompanies, 300);
    return () => clearTimeout(debounce);
  }, [fetchCompanies]);

  return (
    <PullToRefresh onRefresh={async () => { await fetchCompanies(); }}>
    <div>
      {/*
        <h1>, deck, provenance line and the JSON-LD now live in the server
        component (./page.tsx) so they exist in HTML for crawlers.
      */}

      {/* Stats Bar — three tiles. The fourth ("Avg Completeness") is deleted:
          it reported OUR coverage quality as if it were market intelligence
          (SYNTHESIS.md item 29). */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <StatCard label="Companies Tracked" value={stats.totalCompanies.toString()} icon="🏢" color="bg-white/10" />
          <StatCard label="Funding Tracked" value={formatMoney(stats.totalFundingTracked)} icon="💰" color="bg-emerald-500/20" />
          <StatCard label="Market Cap Tracked" value={formatMoney(stats.totalMarketCap)} icon="📈" color="bg-blue-500/20" />
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

            {/* Deep link to the dedicated Private / Pre-IPO hub */}
            <Link
              href="/startups"
              className="px-3 py-2 h-11 min-h-[44px] flex items-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors text-sm font-medium whitespace-nowrap"
            >
              Private / Pre-IPO →
            </Link>

            {/* View Toggle */}
            <div className="flex bg-white/[0.04] border border-white/[0.06] rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                aria-label="Table view"
                aria-pressed={viewMode === 'table'}
                className={`min-w-[44px] min-h-[44px] px-3 py-2.5 text-sm transition-colors flex items-center justify-center ${viewMode === 'table' ? 'bg-white/10 text-slate-300' : 'text-slate-400 hover:text-slate-900'}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M1 3a1 1 0 011-1h12a1 1 0 011 1v2H1V3zm0 3h4v3H1V6zm5 0h4v3H6V6zm5 0h4v3h-4V6zM1 10h4v3H2a1 1 0 01-1-1v-2zm5 0h4v3H6v-3zm5 0h4v2a1 1 0 01-1 1h-3v-3z" />
                </svg>
              </button>
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
                filename="spacenexus-companies"
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

      {/* Companies — server slot / table / grid / list.
          While the view is untouched we render the SERVER-rendered first
          screen passed in as `children`, so the crawlable HTML and the first
          human's screen are the same markup and nothing appears twice. */}
      {showServerRows ? (
        <>
          {children}
          {proTeaser}
        </>
      ) : loading ? (
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
          reason="The directory itself is not empty: your current search and filter combination excludes every company in it. Clearing a filter restores results immediately."
          icon={<span className="text-4xl">🔍</span>}
          illustration="/art/empty-state-no-results.png"
          title="No companies found"
          description="Try adjusting your search or filters to find matching companies."
        />
      ) : viewMode === 'table' ? (
        <>
          <div className="card p-4">
            <CompanyDirectoryTable
              rows={companies}
              caption={`Space company directory — ${companies.length} of ${total} rows`}
            />
          </div>
          {proTeaser}
        </>
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
            description={`Unlock full access to ${SITE_STATS.companies} company profiles with funding data, executive teams, SpaceNexus Score ratings, and competitive analysis.`}
            requiredTier="pro"
            freePreviewCount={FREE_PREVIEW_LIMIT}
            totalCount={total}
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
          <VirtualList
            items={companies}
            itemHeight={72}
            overscan={5}
            maxHeight={700}
            className="rounded-xl"
            renderItem={(company, i) => (
              <div className="pb-2">
                <Link href={`/company-profiles/${company.slug}`}>
                  <div className="card p-4 flex items-center gap-4 group cursor-pointer hover:bg-white/[0.03] transition-colors">
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
                  </div>
                </Link>
              </div>
            )}
          />
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
              { name: 'Space Stocks', description: 'Live prices for public space companies', href: '/space-stocks', icon: '📈' },
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
