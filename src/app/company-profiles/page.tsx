'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import WatchButton from '@/components/watchlist/WatchButton';
import SaveSearchButton from '@/components/watchlist/SaveSearchButton';

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
    2: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'TIER 2' },
    3: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'TIER 3' },
  };
  const style = styles[tier] || styles[3];
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
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
          className="card p-5 h-full group cursor-pointer relative overflow-hidden"
        >
          {/* Animated gradient border on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-[-1px] rounded-xl bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-cyan-500/30 animate-pulse" />
            <div className="absolute inset-[1px] rounded-xl bg-slate-900/95" />
          </div>

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-lg flex-shrink-0 border border-slate-600/50">
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt={`${company.name} logo`} className="w-7 h-7 rounded object-contain" />
                  ) : (
                    getSectorIcon(company.sector)
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">
                    {company.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    {company.ticker && (
                      <span className="font-mono text-cyan-400">{company.ticker}</span>
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
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
              {company.description || 'No description available.'}
            </p>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {company.totalFunding && (
                <div className="bg-slate-800/50 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Funding</div>
                  <div className="text-sm font-semibold text-emerald-400">
                    {formatMoney(company.totalFunding)}
                  </div>
                </div>
              )}
              {company.isPublic && company.marketCap ? (
                <div className="bg-slate-800/50 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Market Cap</div>
                  <div className="text-sm font-semibold text-blue-400">
                    {formatMoney(company.marketCap)}
                  </div>
                </div>
              ) : company.revenueEstimate ? (
                <div className="bg-slate-800/50 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Revenue</div>
                  <div className="text-sm font-semibold text-blue-400">
                    {formatMoney(company.revenueEstimate)}
                  </div>
                </div>
              ) : company.valuation ? (
                <div className="bg-slate-800/50 rounded-lg p-2">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Valuation</div>
                  <div className="text-sm font-semibold text-purple-400">
                    {formatMoney(company.valuation)}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-3">
              {company.sector && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/30">
                  {getSectorIcon(company.sector)} {company.sector}
                </span>
              )}
              {company.tags?.slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 border border-slate-600/30">
                  {tag}
                </span>
              ))}
            </div>

            {/* Bottom Stats */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-700/50">
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
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
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

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (sector) params.set('sector', sector);
      if (tier) params.set('tier', tier);
      if (statusFilter) params.set('status', statusFilter);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('limit', '100');

      const res = await fetch(`/api/company-profiles?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCompanies(data.companies || []);
      setTotal(data.total);
      setStats(data.stats);
    } catch {
      console.error('Failed to load companies');
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [search, sector, tier, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    const debounce = setTimeout(fetchCompanies, 300);
    return () => clearTimeout(debounce);
  }, [fetchCompanies]);

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto">
      <AnimatedPageHeader
        title="Space Company Profiles"
        subtitle="Comprehensive intelligence on 100+ space industry companies — financials, leadership, products, contracts, and relationships"
        icon="🏢"
      />

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Companies Tracked" value={stats.totalCompanies.toString()} icon="🏢" color="bg-cyan-500/20" />
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
                type="text"
                aria-label="Search companies by name, ticker, or location"
                placeholder="Search companies by name, ticker, or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
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
              className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              {SECTOR_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              aria-label="Filter by tier"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              {TIER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
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
              className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
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
            <div className="flex bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2.5 text-sm transition-colors ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zm8 0A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zm-8 8A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zm8 0A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3z"/>
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2.5 text-sm transition-colors ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M2.5 12a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span>{total} companies found</span>
              <SaveSearchButton
                searchType="company_directory"
                filters={{ sector, tier, status: statusFilter, sortBy, sortOrder }}
                query={search || undefined}
              />
            </div>
            {stats && stats.sectors.length > 0 && (
              <div className="flex gap-2">
                {stats.sectors.slice(0, 5).map(s => (
                  <button
                    key={s.sector}
                    onClick={() => setSector(s.sector || '')}
                    className="px-2 py-0.5 rounded bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
                  >
                    {getSectorIcon(s.sector)} {s.sector} ({s.count})
                  </button>
                ))}
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
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">No companies found</h3>
          <p className="text-slate-400">Try adjusting your search or filters</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {companies.map((company, i) => (
              <CompanyCardComponent key={company.id} company={company} index={i} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-2">
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
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-lg flex-shrink-0 border border-slate-600/50">
                      {company.logoUrl ? (
                        <img src={company.logoUrl} alt={`${company.name} logo`} className="w-7 h-7 rounded object-contain" />
                      ) : (
                        getSectorIcon(company.sector)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">
                          {company.name}
                        </span>
                        {company.ticker && (
                          <span className="text-xs font-mono text-cyan-400">{company.ticker}</span>
                        )}
                        {getTierBadge(company.tier)}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {company.headquarters} {company.sector && `· ${company.sector}`}
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-sm">
                      {company.totalFunding && (
                        <div className="text-right">
                          <div className="text-emerald-400 font-semibold">{formatMoney(company.totalFunding)}</div>
                          <div className="text-[10px] text-slate-500">funding</div>
                        </div>
                      )}
                      {company.isPublic && company.marketCap ? (
                        <div className="text-right">
                          <div className="text-blue-400 font-semibold">{formatMoney(company.marketCap)}</div>
                          <div className="text-[10px] text-slate-500">market cap</div>
                        </div>
                      ) : null}
                      {company.employeeRange && (
                        <div className="text-right w-20">
                          <div className="text-slate-300">{company.employeeRange}</div>
                          <div className="text-[10px] text-slate-500">employees</div>
                        </div>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
