'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface FundingSummary {
  totalRaised: number;
  roundCount: number;
  avgRoundSize: number;
  largestRound: number;
}

interface QuarterlyData {
  quarter: string;
  totalRaised: number;
  roundCount: number;
}

interface SectorData {
  sector: string;
  totalRaised: number;
  roundCount: number;
}

interface StageData {
  stage: string;
  totalRaised: number;
  roundCount: number;
  avgSize: number;
}

interface TopInvestorData {
  name: string;
  dealCount: number;
  totalInvested: number;
}

interface RecentRoundData {
  companyName: string;
  companySlug: string;
  amount: number | null;
  seriesLabel: string | null;
  date: string;
  leadInvestor: string | null;
}

interface ExitData {
  targetName: string;
  acquirerName: string;
  acquirerSlug: string;
  price: number | null;
  date: string | null;
  dealType: string | null;
  status: string;
}

interface ActiveInvestorData {
  name: string;
  type: string;
  aum: number | null;
  sectorFocus: string[];
  portfolioCount: number | null;
  headquarters: string | null;
  website: string | null;
}

interface FundingApiResponse {
  success: boolean;
  data: {
    summary: FundingSummary;
    byQuarter: QuarterlyData[];
    bySector: SectorData[];
    byStage: StageData[];
    topInvestors: TopInvestorData[];
    recentRounds: RecentRoundData[];
    exits: ExitData[];
    activeInvestors: ActiveInvestorData[];
  };
}

type Period = '1y' | '2y' | '3y' | '5y';

// ────────────────────────────────────────
// Formatting helpers
// ────────────────────────────────────────

function formatUsd(value: number | null): string {
  if (value == null || value === 0) return '--';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

const STAGE_COLORS: Record<string, string> = {
  Seed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Pre-Seed': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'Series A': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Series B': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Series C': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Series D': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Series E': 'bg-red-500/20 text-red-400 border-red-500/30',
  Growth: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  IPO: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  SPAC: 'bg-white/10 text-white/70 border-white/10',
};

function getStageColor(stage: string | null): string {
  if (!stage) return 'bg-slate-700/50 text-white/70 border-white/[0.1]';
  return STAGE_COLORS[stage] || 'bg-slate-700/50 text-white/70 border-white/[0.1]';
}

const SECTOR_COLORS: Record<string, string> = {
  launch: 'text-blue-400',
  satellite: 'text-purple-400',
  'earth-observation': 'text-emerald-400',
  defense: 'text-red-400',
  analytics: 'text-cyan-400',
  infrastructure: 'text-amber-400',
  manufacturing: 'text-orange-400',
  'ground-segment': 'text-teal-400',
  agency: 'text-indigo-400',
};

const SECTOR_BAR_COLORS: Record<string, string> = {
  launch: 'from-blue-500 to-blue-400',
  satellite: 'from-purple-500 to-purple-400',
  'earth-observation': 'from-emerald-500 to-emerald-400',
  defense: 'from-red-500 to-red-400',
  analytics: 'from-cyan-500 to-cyan-400',
  infrastructure: 'from-amber-500 to-amber-400',
  manufacturing: 'from-orange-500 to-orange-400',
  'ground-segment': 'from-teal-500 to-teal-400',
  agency: 'from-indigo-500 to-indigo-400',
};

const INVESTOR_TYPE_LABELS: Record<string, string> = {
  vc: 'Venture Capital',
  pe: 'Private Equity',
  corporate: 'Corporate',
  angel: 'Angel',
  government: 'Government',
  family_office: 'Family Office',
  accelerator: 'Accelerator',
};

// ────────────────────────────────────────
// Main Component
// ────────────────────────────────────────

export default function InvestmentTrackerPage() {
  const [period, setPeriod] = useState<Period>('3y');
  const [sectorFilter, setSectorFilter] = useState('');
  const [data, setData] = useState<FundingApiResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ period });
      if (sectorFilter) params.set('sector', sectorFilter);
      const res = await fetch(`/api/intelligence/funding?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) {
          setError('Please log in to access funding intelligence data.');
          return;
        }
        throw new Error(`Request failed (${res.status})`);
      }
      const json: FundingApiResponse = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        throw new Error('Unexpected response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [period, sectorFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Chart scaling
  const maxQuarterly = data
    ? Math.max(...data.byQuarter.map((q) => q.totalRaised), 1)
    : 1;
  const maxSector = data
    ? Math.max(...data.bySector.map((s) => s.totalRaised), 1)
    : 1;

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Funding & Investment Flow Tracker"
          subtitle="Track investment flows into the space industry -- funding rounds, M&A exits, top investors, and capital allocation by sector and stage"
          icon={<span>📈</span>}
          breadcrumb="Market Intel → Investment Intelligence"
          accentColor="cyan"
        />

        {/* ── Period + Sector Filter Bar ── */}
        <ScrollReveal>
          <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-4 mb-8">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">
                  Period
                </label>
                <div className="flex gap-1">
                  {(['1y', '2y', '3y', '5y'] as Period[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                        period === p
                          ? 'bg-white/10 text-white border-white/15'
                          : 'bg-white/[0.04] text-slate-400 border-white/[0.06] hover:border-white/10 hover:text-slate-200'
                      }`}
                    >
                      {p.replace('y', ' Year')}
                      {p !== '1y' ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">
                  Sector
                </label>
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="bg-black border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
                >
                  <option value="">All Sectors</option>
                  <option value="launch">Launch</option>
                  <option value="satellite">Satellite</option>
                  <option value="earth-observation">Earth Observation</option>
                  <option value="defense">Defense</option>
                  <option value="analytics">Analytics</option>
                  <option value="infrastructure">Infrastructure</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="ground-segment">Ground Segment</option>
                  <option value="agency">Agency</option>
                </select>
              </div>
              {sectorFilter && (
                <button
                  onClick={() => setSectorFilter('')}
                  className="text-sm text-slate-400 hover:text-white transition-colors pb-2 underline underline-offset-2"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* ── Loading / Error States ── */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center mb-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-medium rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {data && !loading && (
          <>
            {/* ── Summary Cards ── */}
            <ScrollReveal>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-5 text-center hover:border-white/10 transition-colors">
                  <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-300 to-blue-400 bg-clip-text text-transparent">
                    {formatUsd(data.summary.totalRaised)}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                    Total Raised
                  </div>
                </div>
                <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-5 text-center hover:border-purple-500/30 transition-colors">
                  <div className="text-2xl md:text-3xl font-bold text-purple-400">
                    {data.summary.roundCount}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                    Funding Rounds
                  </div>
                </div>
                <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-5 text-center hover:border-emerald-500/30 transition-colors">
                  <div className="text-2xl md:text-3xl font-bold text-emerald-400">
                    {formatUsd(data.summary.avgRoundSize)}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                    Avg Round Size
                  </div>
                </div>
                <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-5 text-center hover:border-amber-500/30 transition-colors">
                  <div className="text-2xl md:text-3xl font-bold text-amber-400">
                    {formatUsd(data.summary.largestRound)}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                    Largest Round
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* ── Quarterly Trends ── */}
            {data.byQuarter.length > 0 && (
              <ScrollReveal>
                <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-6 mb-8">
                  <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </span>
                    Quarterly Investment Trends
                  </h2>
                  <p className="text-slate-400 text-sm mb-6">
                    Capital deployed per quarter across the space industry
                  </p>

                  {/* Bar Chart */}
                  <div className="relative">
                    <div className="flex items-end gap-1 sm:gap-1.5 overflow-x-auto pb-2" style={{ minHeight: '260px' }}>
                      {data.byQuarter.map((q) => {
                        const heightPct = (q.totalRaised / maxQuarterly) * 100;
                        const isHovered = hoveredBar === q.quarter;
                        const isQ1 = q.quarter.endsWith('Q1');
                        return (
                          <div
                            key={q.quarter}
                            className="flex-1 flex flex-col items-center justify-end gap-1 min-w-[32px] relative"
                            onMouseEnter={() => setHoveredBar(q.quarter)}
                            onMouseLeave={() => setHoveredBar(null)}
                          >
                            {/* Tooltip */}
                            {isHovered && (
                              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-700 border border-white/[0.1] rounded-lg px-3 py-2 shadow-xl z-10 whitespace-nowrap">
                                <div className="text-white text-xs font-bold">{formatUsd(q.totalRaised)}</div>
                                <div className="text-slate-400 text-xs">{q.roundCount} rounds</div>
                                <div className="text-slate-500 text-xs">{q.quarter}</div>
                              </div>
                            )}

                            {/* Value label */}
                            <div className={`text-xs font-medium transition-colors ${isHovered ? 'text-white' : 'text-slate-500'}`}>
                              {formatUsd(q.totalRaised)}
                            </div>

                            {/* Bar */}
                            <div
                              className={`w-full max-w-[36px] rounded-t-md transition-all duration-500 cursor-pointer bg-gradient-to-t from-slate-600 to-slate-400 ${
                                isHovered ? 'opacity-100 scale-x-110' : 'opacity-80 hover:opacity-100'
                              }`}
                              style={{
                                height: `${Math.max(heightPct * 1.8, 6)}px`,
                              }}
                            />

                            {/* Quarter label */}
                            <div className={`text-xs font-medium transition-colors ${isHovered ? 'text-white' : 'text-slate-500'}`}>
                              {q.quarter.split('-')[1]}
                            </div>

                            {/* Year label (only on Q1) */}
                            {isQ1 && (
                              <div className="text-xs text-white/70 font-semibold">{q.quarter.split('-')[0]}</div>
                            )}
                            {!isQ1 && (
                              <div className="text-xs text-transparent select-none">&nbsp;</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t border-white/[0.06] mt-1" />
                  </div>

                  {/* Quarterly table below chart */}
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left text-slate-400 pb-3 font-medium">Quarter</th>
                          <th className="text-right text-slate-400 pb-3 font-medium">Total Raised</th>
                          <th className="text-right text-slate-400 pb-3 font-medium">Round Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.byQuarter.map((q) => (
                          <tr key={q.quarter} className="border-b border-white/[0.04] hover:bg-slate-700/20 transition-colors">
                            <td className="py-2.5 text-white font-medium">{q.quarter}</td>
                            <td className="py-2.5 text-right text-emerald-400 font-mono">{formatUsd(q.totalRaised)}</td>
                            <td className="py-2.5 text-right text-white/70 font-mono">{q.roundCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* ── By Sector + By Stage (side by side) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* By Sector */}
              {data.bySector.length > 0 && (
                <ScrollReveal>
                  <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-6 h-full">
                    <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-sm">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                        </svg>
                      </span>
                      By Sector
                    </h2>
                    <p className="text-slate-400 text-sm mb-5">Capital allocation across space industry sectors</p>
                    <div className="space-y-4">
                      {data.bySector.map((s) => {
                        const widthPct = (s.totalRaised / maxSector) * 100;
                        const colorClass = SECTOR_COLORS[s.sector] || 'text-slate-400';
                        const barColor = SECTOR_BAR_COLORS[s.sector] || 'from-slate-500 to-slate-400';
                        return (
                          <div key={s.sector}>
                            <div className="flex justify-between items-center mb-1.5">
                              <div>
                                <span className={`font-semibold text-sm capitalize ${colorClass}`}>{s.sector}</span>
                                <span className="text-slate-500 text-xs ml-2">({s.roundCount} rounds)</span>
                              </div>
                              <span className="text-white font-mono text-sm font-bold">{formatUsd(s.totalRaised)}</span>
                            </div>
                            <div className="w-full bg-slate-700/30 rounded-full h-3">
                              <div
                                className={`bg-gradient-to-r ${barColor} h-3 rounded-full transition-all duration-700`}
                                style={{ width: `${Math.max(widthPct, 3)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ScrollReveal>
              )}

              {/* By Stage */}
              {data.byStage.length > 0 && (
                <ScrollReveal>
                  <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-6 h-full">
                    <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </span>
                      By Stage
                    </h2>
                    <p className="text-slate-400 text-sm mb-4">Investment breakdown by funding stage</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/[0.06]">
                            <th className="text-left text-slate-400 pb-3 font-medium">Stage</th>
                            <th className="text-right text-slate-400 pb-3 font-medium">Total Raised</th>
                            <th className="text-right text-slate-400 pb-3 font-medium">Rounds</th>
                            <th className="text-right text-slate-400 pb-3 font-medium">Avg Size</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.byStage.map((s) => (
                            <tr key={s.stage} className="border-b border-white/[0.04] hover:bg-slate-700/20 transition-colors">
                              <td className="py-2.5">
                                <span className={`text-xs px-2 py-0.5 rounded border ${getStageColor(s.stage)}`}>
                                  {s.stage}
                                </span>
                              </td>
                              <td className="py-2.5 text-right text-emerald-400 font-mono font-bold">{formatUsd(s.totalRaised)}</td>
                              <td className="py-2.5 text-right text-white/70 font-mono">{s.roundCount}</td>
                              <td className="py-2.5 text-right text-white/70 font-mono">{formatUsd(s.avgSize)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </ScrollReveal>
              )}
            </div>

            {/* ── Most Active Investors + Recent Rounds (side by side) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Most Active Investors */}
              {data.topInvestors.length > 0 && (
                <ScrollReveal>
                  <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-6 h-full">
                    <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">
                        <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </span>
                      Most Active Investors
                    </h2>
                    <p className="text-slate-400 text-sm mb-4">Ranked by deal count in the selected period</p>
                    <div className="space-y-2">
                      {data.topInvestors.slice(0, 15).map((inv, i) => (
                        <div
                          key={inv.name}
                          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                        >
                          <span className="text-lg font-bold text-slate-600 w-6 text-right shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium text-sm truncate">
                              {inv.name}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-white/70 font-mono text-sm font-bold">
                              {inv.dealCount} deal{inv.dealCount !== 1 ? 's' : ''}
                            </div>
                            <div className="text-slate-500 text-xs font-mono">
                              {formatUsd(inv.totalInvested)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>
              )}

              {/* Recent Rounds */}
              {data.recentRounds.length > 0 && (
                <ScrollReveal>
                  <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-6 h-full">
                    <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-sm">
                        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                      Recent Funding Rounds
                    </h2>
                    <p className="text-slate-400 text-sm mb-4">Latest deals in the space industry</p>
                    <div className="space-y-2">
                      {data.recentRounds.slice(0, 15).map((round, i) => (
                        <div
                          key={`${round.companySlug}-${round.date}-${i}`}
                          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.06] transition-colors group"
                        >
                          <span className="text-lg font-bold text-slate-600 w-6 text-right shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={`/company-profiles/${round.companySlug}`}
                                className="text-white font-medium text-sm hover:text-cyan-400 transition-colors truncate"
                              >
                                {round.companyName}
                              </Link>
                              {round.seriesLabel && (
                                <span className={`text-xs px-2 py-0.5 rounded border ${getStageColor(round.seriesLabel)}`}>
                                  {round.seriesLabel}
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 text-xs mt-0.5">
                              {formatDate(round.date)}
                              {round.leadInvestor && <> -- Led by {round.leadInvestor}</>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-emerald-400 font-mono font-bold text-sm">
                              {formatUsd(round.amount)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>
              )}
            </div>

            {/* ── M&A / Exits ── */}
            {data.exits.length > 0 && (
              <ScrollReveal>
                <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-6 mb-8">
                  <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-sm">
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </span>
                    M&A / Exits
                  </h2>
                  <p className="text-slate-400 text-sm mb-4">Recent mergers, acquisitions, and exits</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left text-slate-400 pb-3 font-medium">Target</th>
                          <th className="text-left text-slate-400 pb-3 font-medium">Acquirer</th>
                          <th className="text-right text-slate-400 pb-3 font-medium">Price</th>
                          <th className="text-left text-slate-400 pb-3 font-medium">Type</th>
                          <th className="text-left text-slate-400 pb-3 font-medium">Status</th>
                          <th className="text-right text-slate-400 pb-3 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.exits.map((exit, i) => (
                          <tr key={`${exit.targetName}-${i}`} className="border-b border-white/[0.04] hover:bg-slate-700/20 transition-colors">
                            <td className="py-2.5 text-white font-medium">{exit.targetName}</td>
                            <td className="py-2.5">
                              <Link
                                href={`/company-profiles/${exit.acquirerSlug}`}
                                className="text-cyan-400 hover:text-cyan-300 transition-colors"
                              >
                                {exit.acquirerName}
                              </Link>
                            </td>
                            <td className="py-2.5 text-right text-emerald-400 font-mono font-bold">{formatUsd(exit.price)}</td>
                            <td className="py-2.5 text-white/70 capitalize">{exit.dealType || '--'}</td>
                            <td className="py-2.5">
                              <span className={`text-xs px-2 py-0.5 rounded border ${
                                exit.status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : exit.status === 'pending'
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                  : exit.status === 'announced'
                                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                  : 'bg-red-500/20 text-red-400 border-red-500/30'
                              }`}>
                                {exit.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right text-slate-400">{formatDate(exit.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* ── Active Investors Directory ── */}
            {data.activeInvestors.length > 0 && (
              <ScrollReveal>
                <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-6 mb-8">
                  <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-sm">
                      <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </span>
                    Active Space Investors
                  </h2>
                  <p className="text-slate-400 text-sm mb-4">Active investors in the space industry by portfolio size</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.activeInvestors.slice(0, 12).map((inv) => (
                      <div
                        key={inv.name}
                        className="p-4 rounded-lg bg-black/50 border border-white/[0.04] hover:border-white/10 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-white font-semibold text-sm truncate flex-1">{inv.name}</div>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/[0.06]">
                            {INVESTOR_TYPE_LABELS[inv.type] || inv.type}
                          </span>
                        </div>
                        <div className="space-y-1 text-xs text-slate-400">
                          {inv.aum != null && (
                            <div>AUM: <span className="text-white/70 font-mono">{formatUsd(inv.aum)}</span></div>
                          )}
                          {inv.portfolioCount != null && (
                            <div>Portfolio: <span className="text-white/70">{inv.portfolioCount} companies</span></div>
                          )}
                          {inv.headquarters && (
                            <div>HQ: <span className="text-white/70">{inv.headquarters}</span></div>
                          )}
                          {inv.sectorFocus.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {inv.sectorFocus.slice(0, 3).map((sf) => (
                                <span key={sf} className="text-xs px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-500 capitalize">
                                  {sf.replace(/_/g, ' ')}
                                </span>
                              ))}
                              {inv.sectorFocus.length > 3 && (
                                <span className="text-xs text-slate-600">+{inv.sectorFocus.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* ── Related Pages ── */}
            <ScrollReveal>
              <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-6 mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">Explore Related Intelligence</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link
                    href="/space-capital"
                    className="group p-4 rounded-lg bg-black/50 border border-white/[0.04] hover:border-white/15 transition-all"
                  >
                    <div className="text-white/70 text-xl mb-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-white font-semibold text-sm group-hover:text-white transition-colors">Space Capital</div>
                    <div className="text-slate-500 text-xs mt-1">VC landscape and investor profiles</div>
                  </Link>
                  <Link
                    href="/funding-tracker"
                    className="group p-4 rounded-lg bg-black/50 border border-white/[0.04] hover:border-emerald-500/40 transition-all"
                  >
                    <div className="text-emerald-400 text-xl mb-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="text-white font-semibold text-sm group-hover:text-emerald-400 transition-colors">Funding Tracker</div>
                    <div className="text-slate-500 text-xs mt-1">Live deal feed and round details</div>
                  </Link>
                  <Link
                    href="/space-economy"
                    className="group p-4 rounded-lg bg-black/50 border border-white/[0.04] hover:border-purple-500/40 transition-all"
                  >
                    <div className="text-purple-400 text-xl mb-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-white font-semibold text-sm group-hover:text-purple-400 transition-colors">Space Economy</div>
                    <div className="text-slate-500 text-xs mt-1">Global market size and projections</div>
                  </Link>
                  <Link
                    href="/company-profiles"
                    className="group p-4 rounded-lg bg-black/50 border border-white/[0.04] hover:border-amber-500/40 transition-all"
                  >
                    <div className="text-amber-400 text-xl mb-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="text-white font-semibold text-sm group-hover:text-amber-400 transition-colors">Company Profiles</div>
                    <div className="text-slate-500 text-xs mt-1">Detailed company intelligence</div>
                  </Link>
                </div>
              </div>
            </ScrollReveal>

            {/* ── Data Sources Footer ── */}
            <ScrollReveal>
              <div className="bg-white/[0.03] rounded-xl border border-white/[0.04] p-6">
                <h4 className="text-slate-400 font-semibold text-sm mb-3">
                  Data Sources & Methodology
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-500">
                  <div>SpaceNexus Company Intelligence</div>
                  <div>Crunchbase -- Startup Funding Data</div>
                  <div>PitchBook -- Private Market Intelligence</div>
                  <div>SEC Filings (EDGAR) -- Public Disclosures</div>
                  <div>Company Press Releases</div>
                  <div>BryceTech -- State of the Space Industry</div>
                </div>
                <p className="text-slate-600 text-xs mt-3">
                  Investment data is sourced from the SpaceNexus database and publicly available sources.
                  This is not investment advice. Always conduct your own due diligence before making investment decisions.
                </p>
              </div>
            </ScrollReveal>
          </>
        )}

        {/* Empty state */}
        {!loading && !error && data && data.summary.roundCount === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-white mb-2">No Funding Data Found</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              No funding rounds match your selected filters. Try expanding the time period or removing the sector filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
