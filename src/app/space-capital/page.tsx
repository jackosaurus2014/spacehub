'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import DataFreshness from '@/components/ui/DataFreshness';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TabId = 'overview' | 'investors' | 'startups' | 'matchmaker';

interface Investor {
  id: string;
  name: string;
  type: string;
  description: string;
  investmentThesis: string;
  aum: string;
  checkSizeRange: string;
  stagePreference: string[];
  sectorFocus: string[];
  dealCount: number;
  totalDeployed: string;
  notablePortfolio: string[];
  website: string;
  hqLocation: string;
  foundedYear: number;
}

interface FundingByYear {
  year: number;
  amount: number;
  deals: number;
}

interface StartupCompany {
  slug: string;
  name: string;
  description: string;
  country: string;
  headquarters?: string;
  founded?: number;
  website?: string;
  isPublic: boolean;
  totalFunding?: number;
  lastFundingRound?: string;
  lastFundingAmount?: number;
  lastFundingDate?: string;
  valuation?: number;
  focusAreas: string[];
  keyInvestors?: string[];
  employeeCount?: number;
}

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'investors', label: 'Top Investors', icon: '🏦' },
  { id: 'startups', label: 'Top Startups', icon: '🚀' },
  { id: 'matchmaker', label: 'Matchmaker', icon: '🤝' },
];

const INVESTOR_TYPES = ['All', 'Dedicated Space VC', 'Deep Tech VC', 'Generalist VC', 'Corporate VC', 'Government/Strategic', 'Accelerator', 'Impact VC'];
const STAGE_OPTIONS = ['All', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Late Stage'];

const TYPE_COLORS: Record<string, string> = {
  'Dedicated Space VC': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'Deep Tech VC': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Generalist VC': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Corporate VC': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Government/Strategic': 'bg-red-500/20 text-red-400 border-red-500/30',
  'Accelerator': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Impact VC': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const FOCUS_AREA_LABELS: Record<string, string> = {
  launch_provider: 'Launch',
  satellites: 'Satellites',
  earth_observation: 'Earth Observation',
  in_space_services: 'In-Space Services',
  space_infrastructure: 'Space Infrastructure',
  defense: 'Defense',
  propulsion: 'Propulsion',
  debris_removal: 'Debris Removal',
  manufacturing: 'Manufacturing',
  communications: 'Communications',
  analytics: 'Analytics',
  spacecraft: 'Spacecraft',
  space_broadband: 'Broadband',
};

// ────────────────────────────────────────
// Helper
// ────────────────────────────────────────

function formatFunding(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

// ────────────────────────────────────────
// Tab 1: Overview
// ────────────────────────────────────────

function OverviewTab({ investors, fundingByYear, startups }: {
  investors: Investor[];
  fundingByYear: FundingByYear[];
  startups: StartupCompany[];
}) {
  const totalDeals = fundingByYear.reduce((sum, y) => sum + y.deals, 0);
  const totalFunding = fundingByYear.reduce((sum, y) => sum + y.amount, 0);
  const maxAmount = Math.max(...fundingByYear.map(f => f.amount), 1);

  return (
    <div className="space-y-8">
      {/* Hero Stats */}
      <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StaggerItem>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              ${totalFunding.toFixed(0)}B+
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Total Space VC (2019-2025)</div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="text-3xl md:text-4xl font-bold text-cyan-400">{investors.length}+</div>
            <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Active Investors</div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="text-3xl md:text-4xl font-bold text-purple-400">{startups.length}</div>
            <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Top Funded Startups</div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="text-3xl md:text-4xl font-bold text-amber-400">{totalDeals}+</div>
            <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Total Deals</div>
          </div>
        </StaggerItem>
      </StaggerContainer>

      {/* Funding Trends */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-lg">📈</span>
          Space Startup Funding by Year
        </h3>
        <p className="text-slate-400 text-sm mb-6">Global venture investment in space startups (billions USD)</p>
        <div className="flex items-end gap-3 h-48">
          {fundingByYear.map((item) => {
            const heightPct = (item.amount / maxAmount) * 100;
            const isMax = item.amount === maxAmount;
            return (
              <div key={item.year} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-xs font-medium text-slate-400">${item.amount}B</div>
                <div className="w-full flex justify-center">
                  <div
                    className={`w-full max-w-[52px] rounded-t-md transition-all duration-500 ${
                      isMax
                        ? 'bg-gradient-to-t from-green-600 to-green-400'
                        : 'bg-gradient-to-t from-cyan-600 to-cyan-400'
                    }`}
                    style={{ height: `${heightPct * 1.6}px` }}
                  />
                </div>
                <div className="text-xs text-slate-400 font-medium">{item.year}</div>
                <div className="text-[10px] text-slate-500">{item.deals} deals</div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
          <span className="text-xs text-slate-500">Peak: $15.4B in 2021 driven by SPAC mergers and mega-rounds</span>
          <span className="text-xs text-slate-400">Source: Space Capital, Bryce Tech</span>
        </div>
      </div>

      {/* Top 20 Investors + Top 20 Startups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top 20 Investors</h3>
          <div className="space-y-3">
            {investors.slice(0, 20).map((inv, i) => (
              <div key={inv.id} className="flex items-center gap-3">
                <span className="text-lg font-bold text-slate-500 w-6 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm truncate">{inv.name}</div>
                  <div className="text-slate-400 text-xs">{inv.type} &middot; {inv.aum} AUM</div>
                </div>
                <span className="text-cyan-400 text-sm font-mono">{inv.dealCount}+ deals</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top 20 Funded Startups</h3>
          <div className="space-y-3">
            {startups.slice(0, 20).map((s, i) => (
              <div key={s.slug || s.name} className="flex items-center gap-3">
                <span className="text-lg font-bold text-slate-500 w-6 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm truncate">{s.name}</div>
                  <div className="text-slate-400 text-xs">
                    {s.headquarters || s.country}
                    {s.lastFundingRound ? ` \u00B7 ${s.lastFundingRound}` : ''}
                  </div>
                </div>
                <span className="text-green-400 text-sm font-mono font-bold">
                  {s.totalFunding ? formatFunding(s.totalFunding) : '--'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 2: Top Investors
// ────────────────────────────────────────

function InvestorsTab({ investors }: { investors: Investor[] }) {
  const [typeFilter, setTypeFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');

  const filtered = useMemo(() => {
    let result = [...investors];
    if (typeFilter !== 'All') result = result.filter(i => i.type === typeFilter);
    if (stageFilter !== 'All') result = result.filter(i => i.stagePreference.some(s => s.toLowerCase().includes(stageFilter.toLowerCase())));
    return result;
  }, [investors, typeFilter, stageFilter]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-slate-400 text-sm mb-1">Investor Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
          >
            {INVESTOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-slate-400 text-sm mb-1">Stage Focus</label>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
          >
            {STAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <span className="text-slate-500 text-sm pb-2">Showing {filtered.length} of {investors.length} investors</span>
      </div>

      {/* Investor Cards */}
      <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((inv, idx) => (
          <StaggerItem key={inv.id}>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 hover:border-cyan-500/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-slate-500">#{idx + 1}</span>
                    <h4 className="text-white font-semibold">{inv.name}</h4>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded border ${TYPE_COLORS[inv.type] || 'bg-slate-700/50 text-slate-300 border-slate-600'}`}>
                    {inv.type}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-cyan-400 font-mono font-bold">{inv.aum}</div>
                  <div className="text-slate-500 text-xs">AUM</div>
                </div>
              </div>

              <p className="text-slate-400 text-sm mb-3 line-clamp-2">{inv.investmentThesis}</p>

              <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                <div>
                  <span className="text-slate-500 text-xs">Deals</span>
                  <div className="text-white font-medium">{inv.dealCount}+</div>
                </div>
                <div>
                  <span className="text-slate-500 text-xs">Check Size</span>
                  <div className="text-white font-medium text-xs">{inv.checkSizeRange}</div>
                </div>
              </div>

              {/* Stage pills */}
              <div className="flex flex-wrap gap-1 mb-3">
                {inv.stagePreference.map(s => (
                  <span key={s} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded">{s}</span>
                ))}
              </div>

              {/* Sector pills */}
              <div className="flex flex-wrap gap-1 mb-3">
                {inv.sectorFocus.map(s => (
                  <span key={s} className="text-xs bg-cyan-900/30 text-cyan-400 px-2 py-0.5 rounded">{s}</span>
                ))}
              </div>

              {/* Notable Portfolio */}
              <div className="border-t border-slate-700/50 pt-3">
                <span className="text-slate-500 text-xs">Notable Portfolio: </span>
                <span className="text-slate-300 text-xs">{inv.notablePortfolio.join(', ')}</span>
              </div>

              <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                <span>{inv.hqLocation}</span>
                <span>Est. {inv.foundedYear}</span>
              </div>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 3: Top Startups
// ────────────────────────────────────────

function StartupsTab({ startups }: { startups: StartupCompany[] }) {
  const [categoryFilter, setCategoryFilter] = useState('All');

  const categories = useMemo(() => {
    const cats = new Set<string>();
    startups.forEach(s => s.focusAreas.forEach(fa => {
      const label = FOCUS_AREA_LABELS[fa] || fa;
      cats.add(label);
    }));
    return ['All', ...Array.from(cats).sort()];
  }, [startups]);

  const filtered = useMemo(() => {
    if (categoryFilter === 'All') return startups;
    return startups.filter(s =>
      s.focusAreas.some(fa => (FOCUS_AREA_LABELS[fa] || fa) === categoryFilter)
    );
  }, [startups, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-slate-400 text-sm">Category:</span>
        {categories.slice(0, 10).map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              categoryFilter === cat
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <span className="text-slate-500 text-sm">Showing {filtered.length} private startups sorted by total funding</span>

      {/* Startup Cards */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s, idx) => (
          <StaggerItem key={s.slug}>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 hover:border-green-500/30 transition-colors h-full flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-500">#{idx + 1}</span>
                  <h4 className="text-white font-semibold text-sm">{s.name}</h4>
                </div>
                <div className="text-green-400 font-mono font-bold text-sm">
                  {s.totalFunding ? formatFunding(s.totalFunding) : '--'}
                </div>
              </div>

              <p className="text-slate-400 text-xs mb-3 line-clamp-2 flex-1">{s.description}</p>

              <div className="space-y-2 text-xs">
                {s.lastFundingRound && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Last Round</span>
                    <span className="text-white">{s.lastFundingRound}{s.lastFundingAmount ? ` ($${s.lastFundingAmount}M)` : ''}</span>
                  </div>
                )}
                {s.valuation && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Valuation</span>
                    <span className="text-purple-400">${s.valuation}B</span>
                  </div>
                )}
                {s.headquarters && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">HQ</span>
                    <span className="text-slate-300">{s.headquarters}</span>
                  </div>
                )}
              </div>

              {/* Focus areas */}
              <div className="flex flex-wrap gap-1 mt-3">
                {s.focusAreas.map(fa => (
                  <span key={fa} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded">
                    {FOCUS_AREA_LABELS[fa] || fa}
                  </span>
                ))}
              </div>

              {/* Key investors */}
              {s.keyInvestors && s.keyInvestors.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-700/30">
                  <span className="text-slate-500 text-xs">Key Investors: </span>
                  <span className="text-cyan-400 text-xs">{s.keyInvestors.join(', ')}</span>
                </div>
              )}
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 4: Matchmaker
// ────────────────────────────────────────

function MatchmakerTab({ investors, startups }: { investors: Investor[]; startups: StartupCompany[] }) {
  const [mode, setMode] = useState<'startup' | 'investor'>('startup');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedInvestor, setSelectedInvestor] = useState('');

  const sectorOptions = useMemo(() => {
    const sectors = new Set<string>();
    investors.forEach(i => i.sectorFocus.forEach(s => sectors.add(s)));
    return Array.from(sectors).sort();
  }, [investors]);

  const stageOptions = ['Seed', 'Series A', 'Series B', 'Series C', 'Late Stage'];

  // Startup Mode: find matching investors for a given category + stage
  const matchingInvestors = useMemo(() => {
    if (mode !== 'startup' || (!selectedCategory && !selectedStage)) return [];
    return investors.filter(inv => {
      const categoryMatch = !selectedCategory || inv.sectorFocus.some(s =>
        s.toLowerCase().includes(selectedCategory.toLowerCase())
      );
      const stageMatch = !selectedStage || inv.stagePreference.some(s =>
        s.toLowerCase().includes(selectedStage.toLowerCase())
      );
      return categoryMatch && stageMatch;
    }).sort((a, b) => b.dealCount - a.dealCount);
  }, [mode, selectedCategory, selectedStage, investors]);

  // Investor Mode: find startups matching an investor's thesis
  const selectedInvestorData = investors.find(i => i.id === selectedInvestor);
  const matchingStartups = useMemo(() => {
    if (mode !== 'investor' || !selectedInvestorData) return [];
    return startups.filter(s => {
      return s.focusAreas.some(fa => {
        const label = (FOCUS_AREA_LABELS[fa] || fa).toLowerCase();
        return selectedInvestorData.sectorFocus.some(sf => sf.toLowerCase().includes(label) || label.includes(sf.toLowerCase()));
      });
    });
  }, [mode, selectedInvestorData, startups]);

  // Matrix data for the visual grid
  const matrixStages = ['Pre-seed/Seed', 'Series A', 'Series B', 'Series C+'];
  const matrixSectors = ['Launch', 'Earth Observation', 'Communications', 'Defense', 'In-Space Services', 'Satellites'];

  const matrixData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    matrixStages.forEach(stage => {
      data[stage] = {};
      matrixSectors.forEach(sector => {
        data[stage][sector] = investors.filter(inv =>
          inv.stagePreference.some(s => s.toLowerCase().includes(stage.split('/')[0].toLowerCase().trim())) &&
          inv.sectorFocus.some(sf => sf.toLowerCase().includes(sector.toLowerCase()))
        ).length;
      });
    });
    return data;
  }, [investors]);

  const maxDensity = Math.max(1, ...Object.values(matrixData).flatMap(row => Object.values(row)));

  return (
    <div className="space-y-8">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode('startup'); setSelectedInvestor(''); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'startup'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
          }`}
        >
          I&apos;m a Startup
        </button>
        <button
          onClick={() => { setMode('investor'); setSelectedCategory(''); setSelectedStage(''); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'investor'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
          }`}
        >
          I&apos;m an Investor
        </button>
      </div>

      {/* Startup Mode */}
      {mode === 'startup' && (
        <div className="space-y-6">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <h3 className="text-white font-semibold mb-4">Find investors for your space startup</h3>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">Your Sector</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select sector...</option>
                  {sectorOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Your Stage</label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select stage...</option>
                  {stageOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {matchingInvestors.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-4">
                {matchingInvestors.length} matching investor{matchingInvestors.length !== 1 ? 's' : ''} found
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matchingInvestors.map(inv => (
                  <div key={inv.id} className="bg-slate-800/50 rounded-xl border border-green-500/30 p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-white font-semibold">{inv.name}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded border ${TYPE_COLORS[inv.type] || 'bg-slate-700/50 text-slate-300 border-slate-600'}`}>
                        {inv.type}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mb-2">{inv.investmentThesis}</p>
                    <div className="flex gap-4 text-xs text-slate-300">
                      <span>Check: {inv.checkSizeRange}</span>
                      <span>{inv.dealCount}+ deals</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(selectedCategory || selectedStage) && matchingInvestors.length === 0 && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center">
              <p className="text-slate-400">No investors match your criteria. Try broadening your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Investor Mode */}
      {mode === 'investor' && (
        <div className="space-y-6">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <h3 className="text-white font-semibold mb-4">Find startups matching your thesis</h3>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Select Investor</label>
              <select
                value={selectedInvestor}
                onChange={(e) => setSelectedInvestor(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 w-full max-w-md"
              >
                <option value="">Choose an investor...</option>
                {investors.map(i => <option key={i.id} value={i.id}>{i.name} ({i.type})</option>)}
              </select>
            </div>
          </div>

          {selectedInvestorData && (
            <div className="bg-slate-800/50 rounded-xl border border-cyan-500/30 p-5">
              <h4 className="text-white font-semibold mb-1">{selectedInvestorData.name}</h4>
              <p className="text-slate-400 text-sm mb-3">{selectedInvestorData.investmentThesis}</p>
              <div className="flex flex-wrap gap-1">
                {selectedInvestorData.sectorFocus.map(s => (
                  <span key={s} className="text-xs bg-cyan-900/30 text-cyan-400 px-2 py-0.5 rounded">{s}</span>
                ))}
              </div>
            </div>
          )}

          {matchingStartups.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-4">{matchingStartups.length} matching startups</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchingStartups.map(s => (
                  <div key={s.slug} className="bg-slate-800/50 rounded-xl border border-green-500/30 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-semibold text-sm">{s.name}</h4>
                      <span className="text-green-400 font-mono text-sm">
                        {s.totalFunding ? formatFunding(s.totalFunding) : '--'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mb-2 line-clamp-2">{s.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {s.focusAreas.map(fa => (
                        <span key={fa} className="text-xs bg-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded">
                          {FOCUS_AREA_LABELS[fa] || fa}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Investment Activity Matrix */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-lg">📊</span>
          Investor Activity Matrix
        </h3>
        <p className="text-slate-400 text-sm mb-6">Number of active investors by stage and sector</p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs"></th>
                {matrixSectors.map(sector => (
                  <th key={sector} className="py-2 px-3 text-slate-400 font-medium text-xs text-center">{sector}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixStages.map(stage => (
                <tr key={stage}>
                  <td className="py-2 px-3 text-slate-300 font-medium text-xs whitespace-nowrap">{stage}</td>
                  {matrixSectors.map(sector => {
                    const count = matrixData[stage]?.[sector] || 0;
                    const intensity = count / maxDensity;
                    return (
                      <td key={sector} className="py-2 px-3 text-center">
                        <div
                          className="mx-auto w-12 h-8 rounded flex items-center justify-center text-xs font-medium transition-colors"
                          style={{
                            backgroundColor: count > 0 ? `rgba(6, 182, 212, ${0.1 + intensity * 0.5})` : 'rgba(51, 65, 85, 0.3)',
                            color: count > 0 ? '#06b6d4' : '#64748b',
                          }}
                        >
                          {count}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)' }} /> Low activity
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded" style={{ backgroundColor: 'rgba(6, 182, 212, 0.35)' }} /> Medium
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded" style={{ backgroundColor: 'rgba(6, 182, 212, 0.6)' }} /> High activity
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Inner component (needs useSearchParams)
// ────────────────────────────────────────

function SpaceCapitalInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(tabParam && TABS.some(t => t.id === tabParam) ? tabParam : 'overview');

  const [investors, setInvestors] = useState<Investor[]>([]);
  const [fundingByYear, setFundingByYear] = useState<FundingByYear[]>([]);
  const [startups, setStartups] = useState<StartupCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    const url = tab === 'overview' ? '/space-capital' : `/space-capital?tab=${tab}`;
    router.replace(url, { scroll: false });
  };

  useEffect(() => {
    async function fetchData() {
      setError(null);
      try {
        const [investorsRes, fundingRes, startupsRes] = await Promise.all([
          fetch('/api/content/space-capital?section=investors'),
          fetch('/api/content/space-capital?section=funding-by-year'),
          fetch('/api/companies?isPublic=false&sort=totalFunding&minFunding=1&limit=50'),
        ]);

        const investorsJson = await investorsRes.json();
        const fundingJson = await fundingRes.json();
        const startupsJson = await startupsRes.json();

        if (investorsJson.data) setInvestors(investorsJson.data);
        if (fundingJson.data) setFundingByYear(fundingJson.data);
        if (startupsJson.companies) {
          setStartups(startupsJson.companies);
        } else if (startupsJson.data) {
          setStartups(startupsJson.data);
        } else if (Array.isArray(startupsJson)) {
          setStartups(startupsJson);
        }

        const timestamps = [investorsJson.meta?.lastRefreshed, fundingJson.meta?.lastRefreshed].filter(Boolean);
        if (timestamps.length > 0) setRefreshedAt(timestamps.sort().reverse()[0]);
      } catch (error) {
        console.error('Failed to fetch space capital data:', error);
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="h-4 bg-slate-800 rounded w-2/3"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-800 rounded-lg"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Space Capital"
          subtitle="Connect space startups with investors -- top VCs, funding trends, and matchmaking tools"
          icon="💸"
          accentColor="emerald"
        />
        <DataFreshness refreshedAt={refreshedAt} source="DynamicContent" />

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-slate-700/50 mb-8">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <OverviewTab investors={investors} fundingByYear={fundingByYear} startups={startups} />}
        {activeTab === 'investors' && <InvestorsTab investors={investors} />}
        {activeTab === 'startups' && <StartupsTab startups={startups} />}
        {activeTab === 'matchmaker' && <MatchmakerTab investors={investors} startups={startups} />}

        {/* Data Sources Footer */}
        <ScrollReveal>
          <div className="mt-12 bg-slate-800/30 rounded-xl border border-slate-700/30 p-6">
            <h4 className="text-slate-400 font-semibold text-sm mb-3">Data Sources</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-500">
              <div>Space Capital -- Quarterly Investment Reports</div>
              <div>Crunchbase -- Startup Funding Data</div>
              <div>PitchBook -- Private Market Intelligence</div>
              <div>Bryce Tech -- Space Investment Quarterly</div>
              <div>CB Insights -- Venture Capital Analytics</div>
              <div>Public company filings and press releases</div>
            </div>
            <p className="text-slate-600 text-xs mt-3">
              Investor and funding data is compiled from publicly available sources and may not reflect the most recent activity.
              This is not investment advice. Always conduct your own due diligence.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Component (with Suspense)
// ────────────────────────────────────────

export default function SpaceCapitalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
        <div className="max-w-7xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-1/3"></div>
          <div className="h-4 bg-slate-800 rounded w-2/3"></div>
        </div>
      </div>
    }>
      <SpaceCapitalInner />
    </Suspense>
  );
}
