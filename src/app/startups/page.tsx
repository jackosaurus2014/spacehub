'use client';

import { useState, useMemo, useEffect } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import DataFreshness from '@/components/ui/DataFreshness';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type StartupCategory =
  | 'Launch'
  | 'Earth Observation'
  | 'SAR/EO'
  | 'Space Station'
  | 'In-Space Transport'
  | 'Debris Removal'
  | 'In-Space Manufacturing'
  | 'SSA/Defense'
  | 'Satellites'
  | 'Communications';

type StartupStage =
  | 'Seed'
  | 'Series A'
  | 'Series B'
  | 'Series C'
  | 'Late'
  | 'Growth'
  | 'Public'
  | 'Series G';

interface FundingRound {
  round: string;
  amount: string;
  date: string;
}

interface Startup {
  id: string;
  name: string;
  founded: number;
  hq: string;
  category: StartupCategory;
  stage: StartupStage;
  totalRaised: string;
  totalRaisedNum: number; // in millions, for sorting/filtering
  lastRound: FundingRound | null;
  ticker: string | null;
  marketCap: string | null;
  keyProduct: string;
  status: 'Active' | 'Inactive' | 'Acquired';
  description: string;
  website: string;
}

interface FundingByYear {
  year: number;
  amount: number;
  deals: number;
}

interface Investor {
  name: string;
  focus: string;
  investments: number;
  notable: string;
}

interface SBIRAward {
  award_title: string;
  agency: string;
  branch: string;
  company: string;
  award_amount: number;
  award_year: number;
  abstract: string;
  sbir_type: string;
  solicitation_number: string;
  ri_city: string;
  ri_state: string;
}

// ────────────────────────────────────────
// Static Config (not data - UI mappings)
// ────────────────────────────────────────

const CATEGORY_INFO: Record<string, { label: string; color: string; icon: string; description: string }> = {
  'Launch': { label: 'Launch Vehicles', color: 'text-orange-400', icon: 'M15 11.25l-3-3m0 0l-3 3m3-3v7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z', description: 'Orbital launch vehicle developers building next-gen rockets' },
  'Earth Observation': { label: 'Earth Observation', color: 'text-blue-400', icon: 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z', description: 'Satellite constellations imaging Earth for climate, agriculture, and intelligence' },
  'SAR/EO': { label: 'SAR / Earth Observation', color: 'text-cyan-400', icon: 'M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546', description: 'Synthetic Aperture Radar satellites for all-weather, day/night imaging' },
  'Space Station': { label: 'Space Stations', color: 'text-purple-400', icon: 'M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21', description: 'Commercial space habitats and orbital infrastructure' },
  'In-Space Transport': { label: 'In-Space Transport', color: 'text-green-400', icon: 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5', description: 'Orbital transfer vehicles for last-mile delivery in space' },
  'Debris Removal': { label: 'Debris Removal', color: 'text-red-400', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z', description: 'Active debris removal and on-orbit servicing missions' },
  'In-Space Manufacturing': { label: 'In-Space Manufacturing', color: 'text-yellow-400', icon: 'M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5', description: 'Manufacturing pharmaceuticals and materials in microgravity' },
  'SSA/Defense': { label: 'SSA & Defense', color: 'text-slate-300', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z', description: 'Space domain awareness, inspection, and national security missions' },
  'Satellites': { label: 'Satellite Platforms', color: 'text-indigo-400', icon: 'M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0', description: 'Satellite bus and platform developers for next-gen space infrastructure' },
  'Communications': { label: 'Communications', color: 'text-teal-400', icon: 'M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0', description: 'Satellite communications and connectivity providers' },
};

const STAGE_COLORS: Record<StartupStage, string> = {
  'Seed': 'bg-emerald-500/20 text-emerald-400',
  'Series A': 'bg-blue-500/20 text-blue-400',
  'Series B': 'bg-indigo-500/20 text-indigo-400',
  'Series C': 'bg-purple-500/20 text-purple-400',
  'Late': 'bg-orange-500/20 text-orange-400',
  'Growth': 'bg-amber-500/20 text-amber-400',
  'Public': 'bg-green-500/20 text-green-400',
  'Series G': 'bg-pink-500/20 text-pink-400',
};

// ────────────────────────────────────────
// Components
// ────────────────────────────────────────

function HeroStats({ startups, topInvestors }: { startups: Startup[]; topInvestors: Investor[] }) {
  const totalStartups = startups.length;
  const totalFunding = startups.reduce((sum, s) => sum + s.totalRaisedNum, 0);
  const categories = new Set(startups.map(s => s.category)).size;
  const activeInvestors = topInvestors.reduce((sum, i) => sum + i.investments, 0);

  return (
    <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <StaggerItem>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-slate-900">{totalStartups}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Startups Tracked</div>
        </div>
      </StaggerItem>
      <StaggerItem>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-green-400">
            ${(totalFunding / 1000).toFixed(1)}B+
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Total Funding</div>
        </div>
      </StaggerItem>
      <StaggerItem>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-nebula-300">{activeInvestors}+</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Investor Deals</div>
        </div>
      </StaggerItem>
      <StaggerItem>
        <div className="card-elevated p-6 text-center">
          <div className="text-4xl font-bold font-display tracking-tight text-purple-400">{categories}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Categories</div>
        </div>
      </StaggerItem>
    </StaggerContainer>
  );
}

function FundingChart({ fundingByYear }: { fundingByYear: FundingByYear[] }) {
  if (fundingByYear.length === 0) return null;
  const maxAmount = Math.max(...fundingByYear.map(f => f.amount));

  return (
    <div className="card p-6 mb-8">
      <h3 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
        <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        Space Startup Funding by Year
      </h3>
      <p className="text-slate-400 text-sm mb-6">Global venture investment in space startups (billions USD)</p>

      <div className="flex items-end gap-3 h-56">
        {fundingByYear.map((item) => {
          const heightPct = (item.amount / maxAmount) * 100;
          const isMax = item.amount === maxAmount;
          return (
            <div key={item.year} className="flex-1 flex flex-col items-center gap-2">
              <div className="text-xs font-medium text-slate-400">
                ${item.amount}B
              </div>
              <div className="w-full flex justify-center">
                <div
                  className={`w-full max-w-[52px] rounded-t-md transition-all duration-500 ${
                    isMax
                      ? 'bg-gradient-to-t from-green-600 to-green-400'
                      : 'bg-gradient-to-t from-nebula-600 to-nebula-400'
                  }`}
                  style={{ height: `${heightPct * 1.8}px` }}
                />
              </div>
              <div className="text-xs text-slate-400 font-medium">{item.year}</div>
              <div className="text-[10px] text-slate-500">{item.deals} deals</div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200/50 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Peak: $15.4B in 2021 driven by SPAC mergers and mega-rounds
        </span>
        <span className="text-xs text-slate-400">
          Source: Space Capital, Bryce Tech estimates
        </span>
      </div>
    </div>
  );
}

function CategoryBreakdown({ startups }: { startups: Startup[] }) {
  const categoryCounts = startups.reduce((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="card p-6 mb-8">
      <h3 className="text-lg font-semibold text-slate-900 mb-1">Startup Ecosystem by Category</h3>
      <p className="text-slate-400 text-sm mb-4">Distribution across the space startup landscape</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(CATEGORY_INFO).map(([key, info]) => {
          const count = categoryCounts[key] || 0;
          return (
            <div
              key={key}
              className="bg-slate-50/50 border border-slate-200/50 rounded-lg p-4 hover:border-nebula-500/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <svg className={`w-5 h-5 ${info.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={info.icon} />
                </svg>
                <span className="font-medium text-slate-900 text-sm">{info.label}</span>
              </div>
              <p className="text-xs text-slate-400 mb-2 line-clamp-2">{info.description}</p>
              {count > 0 && (
                <span className="text-xs text-nebula-300 font-medium">
                  {count} startup{count !== 1 ? 's' : ''} tracked
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StartupCard({ startup }: { startup: Startup }) {
  const [expanded, setExpanded] = useState(false);
  const catInfo = CATEGORY_INFO[startup.category];

  return (
    <div
      className="card p-5 hover:border-nebula-500/30 transition-all cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-slate-900 truncate">{startup.name}</h4>
            {startup.status === 'Active' && (
              <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" title="Active" />
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${STAGE_COLORS[startup.stage]}`}>
              {startup.stage}
              {startup.ticker && ` (${startup.ticker})`}
            </span>
            <span className={`text-xs ${catInfo?.color || 'text-slate-400'}`}>
              {startup.category}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          {startup.ticker ? (
            <div>
              <div className="text-sm font-semibold text-green-400">{startup.marketCap}</div>
              <div className="text-xs text-slate-400">Market Cap</div>
            </div>
          ) : (
            <div>
              <div className="text-sm font-semibold text-slate-900">{startup.totalRaised}</div>
              <div className="text-xs text-slate-400">Total Raised</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mb-3">
        <span>Founded {startup.founded}</span>
        <span>{startup.hq}</span>
        <span className="text-nebula-300">{startup.keyProduct}</span>
      </div>

      {startup.lastRound && (
        <div className="bg-slate-50/50 border border-slate-200/30 rounded px-3 py-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Last Round</span>
            <span className="text-slate-900 font-medium">
              {startup.lastRound.round} &middot; {startup.lastRound.amount} &middot; {startup.lastRound.date}
            </span>
          </div>
        </div>
      )}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-200/50">
          <p className="text-sm text-slate-500 mb-3">{startup.description}</p>
          <a
            href={startup.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-nebula-300 hover:text-nebula-200 text-sm inline-flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            Visit Website
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}

function TopInvestorsSection({ topInvestors }: { topInvestors: Investor[] }) {
  if (topInvestors.length === 0) return null;

  return (
    <div className="card p-6 mb-8">
      <h3 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
        <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
        Top Space Investors
      </h3>
      <p className="text-slate-400 text-sm mb-4">Most active venture capital firms investing in space startups</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {topInvestors.map((investor) => (
          <div
            key={investor.name}
            className="bg-slate-50/50 border border-slate-200/50 rounded-lg p-4 hover:border-yellow-500/30 transition-colors"
          >
            <div className="font-semibold text-slate-900 text-sm mb-1">{investor.name}</div>
            <div className="text-xs text-slate-400 mb-2">{investor.focus}</div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-yellow-400 font-medium">{investor.investments}+ investments</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Notable: {investor.notable}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page
// ────────────────────────────────────────

export default function StartupTrackerPage() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [fundingByYear, setFundingByYear] = useState<FundingByYear[]>([]);
  const [topInvestors, setTopInvestors] = useState<Investor[]>([]);
  const [sbirAwards, setSbirAwards] = useState<SBIRAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'funding' | 'founded' | 'name'>('funding');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [startupsRes, fundingRes, investorsRes, sbirRes] = await Promise.all([
          fetch('/api/content/startups?section=startups'),
          fetch('/api/content/startups?section=funding-by-year'),
          fetch('/api/content/startups?section=top-investors'),
          fetch('/api/content/startups?section=sbir-awards'),
        ]);

        const [startupsJson, fundingJson, investorsJson, sbirJson] = await Promise.all([
          startupsRes.json(),
          fundingRes.json(),
          investorsRes.json(),
          sbirRes.json(),
        ]);

        if (startupsJson.data) setStartups(startupsJson.data);
        if (fundingJson.data) setFundingByYear(fundingJson.data);
        if (investorsJson.data) setTopInvestors(investorsJson.data);
        if (sbirJson.data) setSbirAwards(sbirJson.data);

        // Use the most recent lastRefreshed from any section
        const timestamps = [
          startupsJson.meta?.lastRefreshed,
          fundingJson.meta?.lastRefreshed,
          investorsJson.meta?.lastRefreshed,
          sbirJson.meta?.lastRefreshed,
        ].filter(Boolean);
        if (timestamps.length > 0) {
          setRefreshedAt(timestamps.sort().reverse()[0]);
        }
      } catch (error) {
        console.error('Failed to fetch startup data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(startups.map(s => s.category)));
    return cats.sort();
  }, [startups]);

  const stages = useMemo(() => {
    const stgs = Array.from(new Set(startups.map(s => s.stage)));
    return stgs.sort();
  }, [startups]);

  const filteredStartups = useMemo(() => {
    let result = [...startups];

    if (categoryFilter) {
      result = result.filter(s => s.category === categoryFilter);
    }
    if (stageFilter) {
      result = result.filter(s => s.stage === stageFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.keyProduct.toLowerCase().includes(query) ||
        s.hq.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      );
    }

    switch (sortBy) {
      case 'funding':
        result.sort((a, b) => b.totalRaisedNum - a.totalRaisedNum);
        break;
      case 'founded':
        result.sort((a, b) => b.founded - a.founded);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [startups, categoryFilter, stageFilter, sortBy, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="h-4 bg-slate-800 rounded w-2/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-800 rounded-lg"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Space Startup Tracker"
          subtitle="Track space startups, funding rounds, investors, and the startup ecosystem"
          icon="🚀"
          accentColor="purple"
        />
        <DataFreshness refreshedAt={refreshedAt} source="DynamicContent" />

        {/* Hero Stats */}
        <HeroStats startups={startups} topInvestors={topInvestors} />

        {/* Funding Trends Chart */}
        <FundingChart fundingByYear={fundingByYear} />

        {/* Category Breakdown */}
        <CategoryBreakdown startups={startups} />

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-slate-400 text-sm mb-1">Search</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search startups, products, locations..."
                  className="w-full bg-slate-100 border border-slate-200 text-slate-900 rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-nebula-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-1">Stage</label>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
              >
                <option value="">All Stages</option>
                {stages.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'funding' | 'founded' | 'name')}
                className="bg-slate-100 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-nebula-500"
              >
                <option value="funding">Total Funding</option>
                <option value="founded">Newest First</option>
                <option value="name">Alphabetical</option>
              </select>
            </div>

            {(categoryFilter || stageFilter || searchQuery) && (
              <button
                onClick={() => {
                  setCategoryFilter('');
                  setStageFilter('');
                  setSearchQuery('');
                }}
                className="text-sm text-nebula-300 hover:text-nebula-200 py-2"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-400">
            Showing {filteredStartups.length} of {startups.length} startups
          </span>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            All startups currently active
          </div>
        </div>

        {/* Startup Cards Grid */}
        {filteredStartups.length === 0 ? (
          <div className="card p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No Startups Found</h2>
            <p className="text-slate-400">
              No startups match your current filters. Try adjusting your criteria.
            </p>
          </div>
        ) : (
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {filteredStartups.map((startup) => (
              <StaggerItem key={startup.id}>
                <StartupCard startup={startup} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}

        {/* Top Investors */}
        <TopInvestorsSection topInvestors={topInvestors} />

        {/* SBIR Space Innovation Grants */}
        {sbirAwards.length > 0 && (
          <div className="card p-6 mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              SBIR Space Innovation Grants
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Small Business Innovation Research (SBIR) awards funding space technology development across federal agencies.
            </p>
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sbirAwards.map((award, idx) => (
                <StaggerItem key={idx}>
                  <div className="bg-slate-50/50 border border-slate-200/50 rounded-lg p-5 hover:border-blue-500/30 transition-colors h-full flex flex-col">
                    <h4 className="font-semibold text-slate-900 text-sm mb-2 line-clamp-2" title={award.award_title}>
                      {award.award_title}
                    </h4>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-blue-500/20 text-blue-400">
                        {award.sbir_type}
                      </span>
                      <span className="text-xs text-slate-400">{award.agency}{award.branch ? ` / ${award.branch}` : ''}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-900">{award.company}</span>
                      <span className="text-sm font-bold text-green-400">
                        {typeof award.award_amount === 'number'
                          ? `$${award.award_amount.toLocaleString()}`
                          : award.award_amount || '--'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                      <span>{award.award_year}</span>
                      {(award.ri_city || award.ri_state) && (
                        <span>{[award.ri_city, award.ri_state].filter(Boolean).join(', ')}</span>
                      )}
                    </div>
                    {award.abstract && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mt-auto" title={award.abstract}>
                        {award.abstract}
                      </p>
                    )}
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
            {sbirAwards.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-8">No SBIR award data available yet.</p>
            )}
            <p className="text-slate-500 text-xs mt-4 italic">
              Data sourced from SBIR.gov. Awards shown are space-related grants from participating federal agencies.
            </p>
          </div>
        )}

        {/* Ecosystem Summary Table */}
        {startups.length > 0 && (
        <div className="card p-6 mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-nebula-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            Full Startup Directory
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Startup</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Category</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Stage</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Funding / Mkt Cap</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Key Product</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Founded</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">HQ</th>
                </tr>
              </thead>
              <tbody>
                {[...startups].sort((a, b) => b.totalRaisedNum - a.totalRaisedNum || a.name.localeCompare(b.name)).map((s) => {
                  const catInfo = CATEGORY_INFO[s.category];
                  return (
                    <tr key={s.id} className="border-b border-slate-200/50 hover:bg-slate-100/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                          <span className="font-medium text-slate-900">{s.name}</span>
                          {s.ticker && (
                            <span className="text-xs text-nebula-300 font-mono">({s.ticker})</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs ${catInfo?.color || 'text-slate-400'}`}>{s.category}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STAGE_COLORS[s.stage]}`}>
                          {s.stage}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {s.ticker ? (
                          <span className="text-green-400 font-medium">{s.marketCap}</span>
                        ) : (
                          <span className="text-slate-900 font-medium">{s.totalRaised}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{s.keyProduct}</td>
                      <td className="py-3 px-4 text-slate-400">{s.founded}</td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{s.hq}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Disclaimer */}
        <ScrollReveal>
          <div className="card p-6 mb-8 border-dashed">
            <div className="text-center">
              <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">About Startup Tracker</h3>
              <p className="text-slate-400 text-sm max-w-2xl mx-auto">
                Funding data and valuations are based on publicly available information and may not reflect
                the most recent rounds. Market caps for public companies fluctuate daily.
                This tracker is for informational purposes only and should not be considered investment advice.
                Data sourced from Crunchbase, PitchBook, Space Capital, and public filings.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
