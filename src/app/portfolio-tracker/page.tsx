'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import EmptyState from '@/components/ui/EmptyState';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface SpaceCompany {
  ticker: string;
  name: string;
  sector: string;
  marketCapBillions: number;
  price: number;
  dayChange: number;
  ytdChange: number;
  note?: string;
}

type SortKey = 'ticker' | 'name' | 'sector' | 'marketCapBillions' | 'price' | 'dayChange' | 'ytdChange';
type SortDirection = 'asc' | 'desc';

interface SectorGroup {
  name: string;
  icon: string;
  color: string;
  companies: string[];
}

interface IPOEntry {
  name: string;
  ticker: string;
  date: string;
  type: 'IPO' | 'SPAC' | 'Direct Listing';
  raisedMillions: number;
  sector: string;
}

interface InvestmentThesis {
  title: string;
  icon: string;
  color: string;
  summary: string;
  keyDrivers: string[];
  timeHorizon: string;
  riskLevel: string;
}

// ────────────────────────────────────────
// Data
// ────────────────────────────────────────

const SPACE_COMPANIES: SpaceCompany[] = [
  { ticker: 'RKLB', name: 'Rocket Lab USA', sector: 'Launch', marketCapBillions: 14.2, price: 29.45, dayChange: 1.82, ytdChange: 34.6 },
  { ticker: 'LUNR', name: 'Intuitive Machines', sector: 'Lunar Services', marketCapBillions: 3.8, price: 22.10, dayChange: 3.41, ytdChange: 62.3 },
  { ticker: 'RDW', name: 'Redwire Corporation', sector: 'Space Infrastructure', marketCapBillions: 2.1, price: 13.87, dayChange: -0.72, ytdChange: 28.1 },
  { ticker: 'ASTS', name: 'AST SpaceMobile', sector: 'Satellite Comms', marketCapBillions: 8.5, price: 27.63, dayChange: 2.15, ytdChange: 48.9 },
  { ticker: 'SPIR', name: 'Spire Global', sector: 'Data/Analytics', marketCapBillions: 1.2, price: 7.84, dayChange: -1.26, ytdChange: 12.4 },
  { ticker: 'PL', name: 'Planet Labs PBC', sector: 'Earth Observation', marketCapBillions: 2.4, price: 8.32, dayChange: 0.61, ytdChange: 22.7 },
  { ticker: 'BKSY', name: 'BlackSky Technology', sector: 'Earth Observation', marketCapBillions: 0.9, price: 6.15, dayChange: -0.49, ytdChange: 8.3 },
  { ticker: 'MNTS', name: 'Momentus Inc', sector: 'In-Space Services', marketCapBillions: 0.3, price: 4.22, dayChange: -2.84, ytdChange: -18.5 },
  { ticker: 'ASTR', name: 'Astra Space', sector: 'Launch', marketCapBillions: 0.2, price: 1.87, dayChange: -4.10, ytdChange: -32.1 },
  { ticker: 'VSAT', name: 'Viasat Inc', sector: 'Satellite Comms', marketCapBillions: 6.8, price: 42.56, dayChange: 0.38, ytdChange: 14.2 },
  { ticker: 'GSAT', name: 'Globalstar Inc', sector: 'Satellite Comms', marketCapBillions: 4.2, price: 2.34, dayChange: 1.73, ytdChange: 41.8 },
  { ticker: 'IRDM', name: 'Iridium Communications', sector: 'Satellite Comms', marketCapBillions: 7.3, price: 58.92, dayChange: -0.34, ytdChange: 6.8 },
  { ticker: 'MAXR', name: 'Maxar Technologies', sector: 'Earth Observation', marketCapBillions: 6.4, price: 51.00, dayChange: 0.00, ytdChange: 0.0, note: 'Acquired by Advent International (2023)' },
  { ticker: 'BA', name: 'Boeing Co', sector: 'Defense/Primes', marketCapBillions: 128.4, price: 208.15, dayChange: 0.92, ytdChange: 11.3, note: 'Partial space exposure (SLS, Starliner, satellites)' },
  { ticker: 'LMT', name: 'Lockheed Martin', sector: 'Defense/Primes', marketCapBillions: 134.2, price: 562.30, dayChange: 0.45, ytdChange: 8.7, note: 'Partial space exposure (Orion, A2100, GPS III)' },
  { ticker: 'NOC', name: 'Northrop Grumman', sector: 'Defense/Primes', marketCapBillions: 78.6, price: 512.44, dayChange: -0.21, ytdChange: 5.4, note: 'Partial space exposure (Cygnus, GBSD, JWST)' },
  { ticker: 'LHX', name: 'L3Harris Technologies', sector: 'Defense/Primes', marketCapBillions: 48.3, price: 251.18, dayChange: 0.67, ytdChange: 9.2, note: 'Partial space exposure (acquired Aerojet Rocketdyne)' },
  { ticker: 'RTX', name: 'RTX Corporation', sector: 'Defense/Primes', marketCapBillions: 156.8, price: 118.72, dayChange: 0.29, ytdChange: 7.1, note: 'Partial space exposure (Pratt & Whitney, Collins Aerospace)' },
  { ticker: 'AJRD', name: 'Aerojet Rocketdyne', sector: 'Launch', marketCapBillions: 4.8, price: 58.00, dayChange: 0.00, ytdChange: 0.0, note: 'Acquired by L3Harris (2023)' },
  { ticker: 'SPCE', name: 'Virgin Galactic', sector: 'In-Space Services', marketCapBillions: 0.4, price: 1.52, dayChange: -5.59, ytdChange: -44.2, note: 'Under restructuring; suborbital tourism paused' },
  { ticker: 'SATL', name: 'Satellogic Inc', sector: 'Earth Observation', marketCapBillions: 0.5, price: 3.41, dayChange: 2.10, ytdChange: 18.6 },
  { ticker: 'LLAP', name: 'Terran Orbital', sector: 'Space Infrastructure', marketCapBillions: 0.6, price: 2.78, dayChange: -1.42, ytdChange: -8.7 },
  { ticker: 'MNTS', name: 'Sidus Space', sector: 'In-Space Services', marketCapBillions: 0.1, price: 1.05, dayChange: -3.67, ytdChange: -26.4 },
];

// Deduplicate by ticker (keep first occurrence)
const UNIQUE_COMPANIES: SpaceCompany[] = [];
const seenTickers = new Set<string>();
for (const c of SPACE_COMPANIES) {
  if (!seenTickers.has(c.ticker)) {
    seenTickers.add(c.ticker);
    UNIQUE_COMPANIES.push(c);
  }
}

const SECTOR_GROUPS: SectorGroup[] = [
  { name: 'Launch', icon: '\u{1F680}', color: 'from-orange-500/20 to-orange-600/5 border-orange-500/30', companies: ['RKLB', 'ASTR', 'AJRD', 'BA'] },
  { name: 'Satellite Comms', icon: '\u{1F4E1}', color: 'from-white/5 to-slate-300/5 border-white/10', companies: ['ASTS', 'VSAT', 'GSAT', 'IRDM', 'SPCE'] },
  { name: 'Earth Observation', icon: '\u{1F30D}', color: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30', companies: ['PL', 'BKSY', 'MAXR', 'SATL'] },
  { name: 'In-Space Services', icon: '\u{1F6F8}', color: 'from-purple-500/20 to-purple-600/5 border-purple-500/30', companies: ['MNTS', 'RDW', 'LLAP'] },
  { name: 'Defense/Primes', icon: '\u{1F6E1}\uFE0F', color: 'from-amber-500/20 to-amber-600/5 border-amber-500/30', companies: ['LMT', 'NOC', 'LHX', 'RTX', 'BA'] },
];

const RECENT_IPOS: IPOEntry[] = [
  { name: 'Apex Space Dynamics', ticker: 'APEX', date: '2026-01-15', type: 'IPO', raisedMillions: 340, sector: 'Launch' },
  { name: 'Orbital Reef Partners', ticker: 'ORFP', date: '2025-11-08', type: 'SPAC', raisedMillions: 520, sector: 'Space Infrastructure' },
  { name: 'Muon Space', ticker: 'MUON', date: '2025-09-22', type: 'IPO', raisedMillions: 210, sector: 'Earth Observation' },
  { name: 'Starfish Space', ticker: 'STAR', date: '2025-07-14', type: 'Direct Listing', raisedMillions: 180, sector: 'In-Space Services' },
  { name: 'K2 Space', ticker: 'KTWO', date: '2026-02-03', type: 'IPO', raisedMillions: 275, sector: 'Satellite Comms' },
  { name: 'True Anomaly', ticker: 'TANM', date: '2025-06-19', type: 'SPAC', raisedMillions: 390, sector: 'Space Defense' },
  { name: 'Phantom Space', ticker: 'PHSN', date: '2025-10-30', type: 'SPAC', raisedMillions: 150, sector: 'Launch' },
];

const INVESTMENT_THESES: InvestmentThesis[] = [
  {
    title: 'LEO Constellation Boom',
    icon: '\u{1F310}',
    color: 'border-white/15/40',
    summary: 'Starlink, Kuiper, and OneWeb are driving unprecedented demand for launch services, ground equipment, and inter-satellite link technology. This rising tide lifts the entire LEO supply chain.',
    keyDrivers: ['SpaceX Starlink 12,000+ sats deployed', 'Amazon Kuiper $10B+ investment', 'Growing direct-to-device connectivity market', 'Satellite refresh cycles create recurring demand'],
    timeHorizon: '2-5 years',
    riskLevel: 'Medium',
  },
  {
    title: 'Lunar Economy',
    icon: '\u{1F315}',
    color: 'border-purple-500/40',
    summary: 'NASA\'s Artemis program and CLPS contracts are catalyzing a commercial lunar services ecosystem. Companies providing transportation, infrastructure, and resource utilization stand to benefit from $93B+ in projected lunar economy value by 2040.',
    keyDrivers: ['Artemis III crewed landing scheduled', 'CLPS contracts exceeding $2.6B', 'Lunar Gateway assembly underway', 'International lunar base agreements signed'],
    timeHorizon: '5-10 years',
    riskLevel: 'High',
  },
  {
    title: 'Space-Based Solar Power',
    icon: '\u{2600}\uFE0F',
    color: 'border-amber-500/40',
    summary: 'Collecting solar energy in orbit and beaming it to Earth via microwave could provide baseload renewable power. ESA, JAXA, and China are funding demonstrator missions. A long-term transformational play on clean energy.',
    keyDrivers: ['ESA SOLARIS program advancing', 'China 2028 orbital demonstrator', 'Caltech SSPP successful power beam test', 'Declining launch costs improving economics'],
    timeHorizon: '10-20 years',
    riskLevel: 'Very High',
  },
  {
    title: 'In-Space Manufacturing',
    icon: '\u{1F3ED}',
    color: 'border-emerald-500/40',
    summary: 'Microgravity enables production of superior fiber optics (ZBLAN), pharmaceuticals, and semiconductor materials impossible to make on Earth. Early movers are securing ISS and commercial station partnerships.',
    keyDrivers: ['ZBLAN fiber optic production validated on ISS', 'Varda Space Industries capsule returned successfully', 'Commercial space stations coming online 2027-2028', 'Pharma companies investing in orbital R&D'],
    timeHorizon: '3-7 years',
    riskLevel: 'High',
  },
];

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatMarketCap(b: number): string {
  if (b >= 100) return `$${b.toFixed(0)}B`;
  if (b >= 1) return `$${b.toFixed(1)}B`;
  return `$${(b * 1000).toFixed(0)}M`;
}

function formatPrice(p: number): string {
  return `$${p.toFixed(2)}`;
}

function formatChange(c: number): string {
  const sign = c >= 0 ? '+' : '';
  return `${sign}${c.toFixed(2)}%`;
}

function changeColor(val: number): string {
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-slate-400';
}

function changeBg(val: number): string {
  if (val > 0) return 'bg-emerald-500/10';
  if (val < 0) return 'bg-red-500/10';
  return 'bg-slate-500/10';
}

// ────────────────────────────────────────
// Component
// ────────────────────────────────────────

export default function PortfolioTrackerPage() {
  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('marketCapBillions');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');

  // Watchlist
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());

  // Load watchlist from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('spacenexus-watchlist');
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        setWatchlist(new Set(parsed));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save watchlist to localStorage
  const saveWatchlist = useCallback((next: Set<string>) => {
    setWatchlist(next);
    try {
      localStorage.setItem('spacenexus-watchlist', JSON.stringify(Array.from(next)));
    } catch {
      // ignore
    }
  }, []);

  const toggleWatchlist = useCallback((ticker: string) => {
    setWatchlist(prev => {
      const next = new Set(prev);
      if (next.has(ticker)) {
        next.delete(ticker);
      } else {
        next.add(ticker);
      }
      saveWatchlist(next);
      return next;
    });
  }, [saveWatchlist]);

  // Sorting handler
  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return key;
      }
      setSortDir(key === 'ticker' || key === 'name' || key === 'sector' ? 'asc' : 'desc');
      return key;
    });
  }, []);

  // Filtered & sorted companies
  const filteredCompanies = useMemo(() => {
    let result = [...UNIQUE_COMPANIES];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.ticker.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.sector.toLowerCase().includes(q)
      );
    }

    // Sector filter
    if (sectorFilter) {
      result = result.filter(c => c.sector === sectorFilter);
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      const aNum = aVal as number;
      const bNum = bVal as number;
      return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
    });

    return result;
  }, [searchQuery, sectorFilter, sortKey, sortDir]);

  // Watchlist companies
  const watchlistCompanies = useMemo(() => {
    return UNIQUE_COMPANIES.filter(c => watchlist.has(c.ticker));
  }, [watchlist]);

  // Unique sectors for filter
  const sectors = useMemo(() => {
    const s = new Set(UNIQUE_COMPANIES.map(c => c.sector));
    return Array.from(s).sort();
  }, []);

  // Sort arrow indicator
  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return <span className="text-slate-600 ml-1">{'\u2195'}</span>;
    return <span className="text-slate-300 ml-1">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>;
  };

  // Market index mock data
  const indexValue = 1847.32;
  const indexChange = 2.4;
  const mockTimestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8">
      <div className="container mx-auto px-4">

        {/* Header */}
        <AnimatedPageHeader
          title="Space Investment Portfolio Tracker"
          subtitle="Track publicly traded space companies, monitor sector performance, and build your watchlist. Data shown is illustrative and for informational purposes only."
          breadcrumb="Market Intelligence"
          accentColor="emerald"
        />

        {/* ───── Market Overview ───── */}
        <ScrollReveal>
          <div className="card p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <p className="text-sm text-slate-400 mb-1">SpaceNexus Space Index</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-white font-mono">{indexValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <span className={`text-lg font-semibold ${changeColor(indexChange)}`}>
                    {formatChange(indexChange)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 md:mt-0">Last updated: {mockTimestamp} (mock data)</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Market Cap', value: '$312B', change: '+4.2%', positive: true },
                { label: 'YTD Performance', value: '+18.7%', change: 'vs S&P +12.1%', positive: true },
                { label: 'Space IPOs (2026)', value: '4', change: '2 more expected', positive: true },
                { label: 'SPACs Active', value: '3', change: '1 in PIPE stage', positive: false },
              ].map((stat) => (
                <div key={stat.label} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
                  <p className="text-xl font-bold text-white">{stat.value}</p>
                  <p className={`text-xs mt-1 ${stat.positive ? 'text-emerald-400' : 'text-slate-400'}`}>{stat.change}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* ───── Watchlist ───── */}
        <ScrollReveal>
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-yellow-400">{'\u2605'}</span> Your Watchlist
              {watchlistCompanies.length > 0 && (
                <span className="text-sm font-normal text-slate-400">({watchlistCompanies.length} companies)</span>
              )}
            </h2>
            {watchlistCompanies.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {watchlistCompanies.map((company) => (
                  <div key={company.ticker} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-300">{company.ticker}</span>
                        <span className="text-xs text-slate-400">{company.name}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-white font-mono">{formatPrice(company.price)}</span>
                        <span className={`text-xs font-medium ${changeColor(company.dayChange)}`}>
                          {formatChange(company.dayChange)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleWatchlist(company.ticker)}
                      className="text-yellow-400 hover:text-yellow-300 transition-colors text-lg"
                      aria-label={`Remove ${company.ticker} from watchlist`}
                    >
                      {'\u2605'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/20 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Add space industry stocks to your portfolio</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mb-2">
                  Click the star icon next to any company in the table below to start tracking its performance.
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Suggested tickers: RKLB, LUNR, ASTS, PL, IRDM, GSAT
                </p>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* ───── Public Space Companies Table ───── */}
        <ScrollReveal>
          <div className="card p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
              <h2 className="text-lg font-semibold text-white">Public Space Companies</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <input
                    type="search"
                    placeholder="Search ticker or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 px-4 py-2 bg-slate-800/70 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/15 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-sm"
                      aria-label="Clear search"
                    >
                      {'\u2715'}
                    </button>
                  )}
                </div>
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="px-4 py-2 bg-slate-800/70 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-white/15 transition-colors"
                >
                  <option value="">All Sectors</option>
                  {sectors.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-3 px-2 text-slate-400 font-medium w-8"></th>
                    <th
                      className="text-left py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors select-none"
                      onClick={() => handleSort('ticker')}
                    >
                      Ticker{sortArrow('ticker')}
                    </th>
                    <th
                      className="text-left py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors select-none"
                      onClick={() => handleSort('name')}
                    >
                      Company{sortArrow('name')}
                    </th>
                    <th
                      className="text-left py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors select-none hidden md:table-cell"
                      onClick={() => handleSort('sector')}
                    >
                      Sector{sortArrow('sector')}
                    </th>
                    <th
                      className="text-right py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors select-none"
                      onClick={() => handleSort('marketCapBillions')}
                    >
                      Market Cap{sortArrow('marketCapBillions')}
                    </th>
                    <th
                      className="text-right py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors select-none hidden sm:table-cell"
                      onClick={() => handleSort('price')}
                    >
                      Price{sortArrow('price')}
                    </th>
                    <th
                      className="text-right py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors select-none"
                      onClick={() => handleSort('dayChange')}
                    >
                      Day{sortArrow('dayChange')}
                    </th>
                    <th
                      className="text-right py-3 px-2 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors select-none hidden sm:table-cell"
                      onClick={() => handleSort('ytdChange')}
                    >
                      YTD{sortArrow('ytdChange')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8">
                        <EmptyState
                          icon={<span className="text-4xl">📊</span>}
                          title="No companies found"
                          description="No companies match your search criteria. Try adjusting your filters."
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map((company) => (
                      <tr
                        key={company.ticker}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group"
                      >
                        <td className="py-3 px-2">
                          <button
                            onClick={() => toggleWatchlist(company.ticker)}
                            className={`text-base transition-colors ${
                              watchlist.has(company.ticker)
                                ? 'text-yellow-400 hover:text-yellow-300'
                                : 'text-slate-600 hover:text-yellow-400'
                            }`}
                            aria-label={`${watchlist.has(company.ticker) ? 'Remove from' : 'Add to'} watchlist: ${company.ticker}`}
                          >
                            {watchlist.has(company.ticker) ? '\u2605' : '\u2606'}
                          </button>
                        </td>
                        <td className="py-3 px-2">
                          <span className="font-bold text-slate-300">{company.ticker}</span>
                        </td>
                        <td className="py-3 px-2">
                          <div>
                            <span className="text-white group-hover:text-white transition-colors">{company.name}</span>
                            {company.note && (
                              <p className="text-xs text-slate-500 mt-0.5">{company.note}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-slate-300 hidden md:table-cell">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs ${changeBg(1)} text-slate-300`}>
                            {company.sector}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right text-white font-mono">
                          {formatMarketCap(company.marketCapBillions)}
                        </td>
                        <td className="py-3 px-2 text-right text-white font-mono hidden sm:table-cell">
                          {formatPrice(company.price)}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className={`font-mono font-medium ${changeColor(company.dayChange)}`}>
                            {formatChange(company.dayChange)}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right hidden sm:table-cell">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium font-mono ${changeBg(company.ytdChange)} ${changeColor(company.ytdChange)}`}>
                            {formatChange(company.ytdChange)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-500 mt-4">
              Showing {filteredCompanies.length} of {UNIQUE_COMPANIES.length} companies. Market data is illustrative and not real-time. Not investment advice.
            </p>
          </div>
        </ScrollReveal>

        {/* ───── Sector Breakdown ───── */}
        <ScrollReveal>
          <h2 className="text-lg font-semibold text-white mb-4">Sector Breakdown</h2>
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {SECTOR_GROUPS.map((group) => {
              const groupCompanies = UNIQUE_COMPANIES.filter(c => group.companies.includes(c.ticker));
              const totalMcap = groupCompanies.reduce((sum, c) => sum + c.marketCapBillions, 0);
              const avgYtd = groupCompanies.length > 0
                ? groupCompanies.reduce((sum, c) => sum + c.ytdChange, 0) / groupCompanies.length
                : 0;

              return (
                <StaggerItem key={group.name}>
                  <div className={`card p-5 bg-gradient-to-br ${group.color} border`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{group.icon}</span>
                      <h3 className="text-sm font-semibold text-white">{group.name}</h3>
                    </div>
                    <p className="text-2xl font-bold text-white mb-1">{group.companies.length}</p>
                    <p className="text-xs text-slate-400 mb-3">companies</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Combined Mkt Cap</span>
                        <span className="text-white font-mono">{formatMarketCap(totalMcap)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Avg YTD</span>
                        <span className={`font-mono ${changeColor(avgYtd)}`}>{formatChange(avgYtd)}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <div className="flex flex-wrap gap-1">
                        {group.companies.map(t => (
                          <span key={t} className="text-xs px-1.5 py-0.5 bg-slate-800/60 rounded text-slate-300 font-mono">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </ScrollReveal>

        {/* ───── Recent Space IPOs & SPACs ───── */}
        <ScrollReveal>
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Space IPOs & SPACs (2025-2026)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">Company</th>
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">Ticker</th>
                    <th className="text-left py-3 px-2 text-slate-400 font-medium hidden sm:table-cell">Date</th>
                    <th className="text-left py-3 px-2 text-slate-400 font-medium">Type</th>
                    <th className="text-right py-3 px-2 text-slate-400 font-medium">Raised</th>
                    <th className="text-left py-3 px-2 text-slate-400 font-medium hidden md:table-cell">Sector</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_IPOS.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((ipo) => (
                    <tr key={ipo.ticker} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-2 text-white">{ipo.name}</td>
                      <td className="py-3 px-2 font-bold text-slate-300 font-mono">{ipo.ticker}</td>
                      <td className="py-3 px-2 text-slate-300 hidden sm:table-cell">
                        {new Date(ipo.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          ipo.type === 'IPO' ? 'bg-emerald-500/10 text-emerald-400' :
                          ipo.type === 'SPAC' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-purple-500/10 text-purple-400'
                        }`}>
                          {ipo.type}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right text-white font-mono">${ipo.raisedMillions}M</td>
                      <td className="py-3 px-2 text-slate-300 hidden md:table-cell">{ipo.sector}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              IPO/SPAC data is illustrative. Actual offering details may vary.
            </p>
          </div>
        </ScrollReveal>

        {/* ───── Investment Thesis Cards ───── */}
        <ScrollReveal>
          <h2 className="text-lg font-semibold text-white mb-4">Investment Thesis Spotlight</h2>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {INVESTMENT_THESES.map((thesis) => (
              <StaggerItem key={thesis.title}>
                <div className={`card p-6 border-l-4 ${thesis.color}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{thesis.icon}</span>
                    <div>
                      <h3 className="text-base font-semibold text-white">{thesis.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800/60 text-slate-300">
                          {thesis.timeHorizon}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          thesis.riskLevel === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                          thesis.riskLevel === 'High' ? 'bg-orange-500/10 text-orange-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {thesis.riskLevel} Risk
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 mb-4 leading-relaxed">{thesis.summary}</p>
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Key Drivers</p>
                    <ul className="space-y-1.5">
                      {thesis.keyDrivers.map((driver, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                          <span className="text-slate-300 mt-0.5 shrink-0">{'\u2192'}</span>
                          {driver}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </ScrollReveal>

        {/* ───── Disclaimer ───── */}
        <ScrollReveal>
          <div className="card p-5 border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-start gap-3">
              <span className="text-amber-400 text-lg shrink-0">{'\u26A0\uFE0F'}</span>
              <div>
                <h3 className="text-sm font-semibold text-amber-300 mb-1">Disclaimer</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  All market data, prices, and financial information shown on this page are illustrative mock data for demonstration purposes only.
                  This is not real-time financial data and should not be used to make investment decisions. SpaceNexus does not provide investment advice.
                  Always consult a qualified financial advisor before making investment decisions. Past performance does not guarantee future results.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ───── Related Links ───── */}
        <ScrollReveal>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/market-intel" className="text-sm px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:text-white hover:border-white/15/40 transition-colors">
              Market Intelligence
            </Link>
            <Link href="/funding-tracker" className="text-sm px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:text-white hover:border-white/15/40 transition-colors">
              Funding Tracker
            </Link>
            <Link href="/company-profiles" className="text-sm px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:text-white hover:border-white/15/40 transition-colors">
              Company Profiles
            </Link>
            <Link href="/investors" className="text-sm px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:text-white hover:border-white/15/40 transition-colors">
              Investor Hub
            </Link>
            <Link href="/space-economy" className="text-sm px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:text-white hover:border-white/15/40 transition-colors">
              Space Economy
            </Link>
          </div>
        </ScrollReveal>

        <RelatedModules modules={PAGE_RELATIONS['portfolio-tracker']} />
      </div>
    </div>
  );
}
