'use client';

import { useState, useEffect } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import DataFreshness from '@/components/ui/DataFreshness';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TabId = 'market' | 'investment' | 'government' | 'public-markets' | 'workforce';

interface MarketSegment {
  name: string;
  revenue: number; // in billions USD
  share: number; // percentage
  growth: number; // YoY growth percentage
  description: string;
}

interface MarketProjection {
  year: number;
  size: number; // in billions USD
  source: string;
}

interface VCDeal {
  quarter: string;
  year: number;
  totalInvested: number; // in billions USD
  dealCount: number;
  topSector: string;
}

interface AnnualInvestment {
  year: number;
  vcInvestment: number; // billions
  debtFinancing: number; // billions
  publicOfferings: number; // billions
  totalPrivate: number; // billions
}

interface TopInvestor {
  name: string;
  type: string;
  notableDeals: string[];
  estimatedDeployed: string;
}

interface GovernmentBudget {
  agency: string;
  country: string;
  flag: string;
  budget2024: number; // billions USD
  budget2025: number; // billions USD
  change: number; // percentage
  currency: string;
  focusAreas: string[];
  notes: string;
}

interface SpaceCompanyStock {
  name: string;
  ticker: string;
  exchange: string;
  marketCap: number; // billions
  price: number;
  ytdChange: number; // percentage
  sector: string;
  revenue2024: number; // billions
}

interface SpaceETF {
  name: string;
  ticker: string;
  aum: number; // billions
  expenseRatio: number; // percentage
  ytdReturn: number; // percentage
  topHoldings: string[];
}

interface WorkforceStat {
  category: string;
  value: string;
  detail: string;
  source: string;
}

interface LaunchCostDataPoint {
  vehicle: string;
  operator: string;
  year: number;
  costPerKgLEO: number; // USD
  payload: number; // kg to LEO
  reusable: boolean;
}

interface SalaryBenchmark {
  role: string;
  minSalary: number;
  maxSalary: number;
  median: number;
  growth: number; // YoY percentage
}

// ────────────────────────────────────────
// Constants & Tab Config
// ────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'market', label: 'Market Overview', icon: '📊' },
  { id: 'investment', label: 'Investment', icon: '💰' },
  { id: 'government', label: 'Government Budgets', icon: '🏛️' },
  { id: 'public-markets', label: 'Public Markets', icon: '📈' },
  { id: 'workforce', label: 'Workforce & Trends', icon: '👷' },
];

// ────────────────────────────────────────
// (Data fetched from /api/content/space-economy)
// ────────────────────────────────────────

// (Investment data fetched from API)

// (Government budget data fetched from API)

// (Public markets data fetched from API)

// (Workforce & trends data fetched from API)

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

function formatBillions(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}T`;
  if (value >= 1) return `$${value.toFixed(1)}B`;
  return `$${(value * 1000).toFixed(0)}M`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number, showPlus = true): string {
  const prefix = showPlus && value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

// ────────────────────────────────────────
// Tab 1: Market Overview
// ────────────────────────────────────────

interface MarketOverviewTabProps {
  marketSegments: MarketSegment[];
}

function MarketOverviewTab({ marketSegments }: MarketOverviewTabProps) {
  // Derive headline values from data
  const totalRevenue = marketSegments.reduce((sum, s) => sum + s.revenue, 0);
  const avgGrowth = marketSegments.length > 0
    ? marketSegments.reduce((sum, s) => sum + s.growth, 0) / marketSegments.length
    : 0;

  return (
    <div className="space-y-8">
      {/* Headline Stats */}
      <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StaggerItem>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {formatBillions(totalRevenue)}
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">2024 Market Size</div>
            <div className="text-slate-500 text-xs mt-1">Space Foundation</div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              ~{formatBillions(totalRevenue * 1.053)}
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">2025 Estimate</div>
            <div className="text-slate-500 text-xs mt-1">Projected</div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="text-3xl md:text-4xl font-bold text-cyan-400">
              {avgGrowth.toFixed(1)}%
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Avg Segment Growth</div>
            <div className="text-slate-500 text-xs mt-1">YoY</div>
          </div>
        </StaggerItem>
        <StaggerItem>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              $1.8T
            </div>
            <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">2040 Forecast</div>
            <div className="text-slate-500 text-xs mt-1">Morgan Stanley</div>
          </div>
        </StaggerItem>
      </StaggerContainer>

      {/* Segment Breakdown */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-lg">📊</span>
          Market Segment Breakdown (2024)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Segment</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Revenue</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Share</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">YoY Growth</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm hidden lg:table-cell">Description</th>
              </tr>
            </thead>
            <tbody>
              {marketSegments.map((segment) => (
                <tr key={segment.name} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="py-3 px-4 text-white font-medium">{segment.name}</td>
                  <td className="py-3 px-4 text-right text-cyan-400 font-mono">{formatBillions(segment.revenue)}</td>
                  <td className="py-3 px-4 text-right text-slate-300">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                          style={{ width: `${segment.share}%` }}
                        />
                      </div>
                      {segment.share.toFixed(1)}%
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={segment.growth >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {formatPercent(segment.growth)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-sm hidden lg:table-cell">{segment.description}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-600">
                <td className="py-3 px-4 text-white font-bold">Total</td>
                <td className="py-3 px-4 text-right text-cyan-400 font-mono font-bold">
                  {formatBillions(totalRevenue)}
                </td>
                <td className="py-3 px-4 text-right text-slate-300 font-bold">100%</td>
                <td className="py-3 px-4 text-right text-green-400 font-bold">{formatPercent(avgGrowth)}</td>
                <td className="hidden lg:table-cell" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Key Trends */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StaggerItem>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h4 className="text-white font-semibold mb-3">Growth Drivers</h4>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">+</span> Mega-constellation broadband deployment (Starlink, Kuiper)</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">+</span> National security space spending surge globally</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">+</span> Falling launch costs enabling new applications</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">+</span> Direct-to-device satellite connectivity market</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">+</span> Space-based climate monitoring and carbon tracking</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">+</span> Commercial space station development (Axiom, Vast, Orbital Reef)</li>
          </ul>
        </div>
        </StaggerItem>
        <StaggerItem>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h4 className="text-white font-semibold mb-3">Market Risks</h4>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">-</span> Orbital debris growth threatening sustainability</li>
            <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">-</span> Spectrum congestion and regulatory bottlenecks</li>
            <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">-</span> Geopolitical tensions fragmenting supply chains</li>
            <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">-</span> SPAC-era space companies facing profitability pressure</li>
            <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">-</span> Satellite broadband over-capacity risk</li>
            <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">-</span> Workforce shortage constraining industry growth</li>
          </ul>
        </div>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 2: Investment
// ────────────────────────────────────────

interface InvestmentTabProps {
  quarterlyVC: VCDeal[];
  annualInvestment: AnnualInvestment[];
}

function InvestmentTab({ quarterlyVC, annualInvestment }: InvestmentTabProps) {
  // Derive headline stats from data
  const latestYear = annualInvestment.length > 0
    ? annualInvestment.reduce((max, yr) => yr.year > max.year ? yr : max, annualInvestment[0])
    : null;
  const totalDeals = quarterlyVC
    .filter(q => q.year === (latestYear?.year || 0))
    .reduce((sum, q) => sum + q.dealCount, 0);
  const cumulativeTotal = annualInvestment.reduce((sum, yr) => sum + yr.totalPrivate, 0);

  return (
    <div className="space-y-8">
      {/* Headline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-cyan-400">{latestYear ? formatBillions(latestYear.vcInvestment) : '--'}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">{latestYear?.year || ''} VC Investment</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-green-400">{totalDeals || '--'}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">{latestYear?.year || ''} Deal Count</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-purple-400">{latestYear ? formatBillions(latestYear.totalPrivate) : '--'}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">{latestYear?.year || ''} Total Private</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-amber-400">{formatBillions(cumulativeTotal)}+</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Cumulative Total</div>
        </div>
      </div>

      {/* Quarterly VC */}
      {quarterlyVC.length > 0 && (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-lg">💰</span>
          Quarterly VC Investment
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Quarter</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Total Invested</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Deal Count</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Top Sector</th>
              </tr>
            </thead>
            <tbody>
              {quarterlyVC.map((q) => (
                <tr key={`${q.quarter}-${q.year}`} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="py-3 px-4 text-white font-medium">{q.quarter} {q.year}</td>
                  <td className="py-3 px-4 text-right text-cyan-400 font-mono">{formatBillions(q.totalInvested)}</td>
                  <td className="py-3 px-4 text-right text-slate-300">{q.dealCount}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs bg-cyan-900/30 text-cyan-400 px-2 py-1 rounded">{q.topSector}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Annual Investment Trends */}
      {annualInvestment.length > 0 && (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-lg">📈</span>
          Annual Investment Trends
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Year</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">VC/PE</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Debt</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Public Offerings</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Total</th>
              </tr>
            </thead>
            <tbody>
              {annualInvestment.map((yr) => (
                <tr key={yr.year} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="py-3 px-4 text-white font-medium">{yr.year}</td>
                  <td className="py-3 px-4 text-right text-cyan-400 font-mono">{formatBillions(yr.vcInvestment)}</td>
                  <td className="py-3 px-4 text-right text-slate-300 font-mono">{formatBillions(yr.debtFinancing)}</td>
                  <td className="py-3 px-4 text-right text-purple-400 font-mono">{formatBillions(yr.publicOfferings)}</td>
                  <td className="py-3 px-4 text-right text-green-400 font-mono font-bold">{formatBillions(yr.totalPrivate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Bar visualization */}
        <div className="mt-6">
          <div className="flex items-end gap-2 h-32">
            {annualInvestment.map((yr) => {
              const maxTotal = Math.max(...annualInvestment.map((y) => y.totalPrivate));
              const heightPct = maxTotal > 0 ? (yr.totalPrivate / maxTotal) * 100 : 0;
              return (
                <div key={yr.year} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs text-slate-400">{formatBillions(yr.totalPrivate)}</div>
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all"
                    style={{ height: `${heightPct}%` }}
                  />
                  <div className="text-xs text-slate-500">{yr.year}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* SPAC Activity Note */}
      <div className="bg-slate-800/50 rounded-xl border border-amber-500/30 p-6">
        <h4 className="text-amber-400 font-semibold mb-2">SPAC Activity Update</h4>
        <p className="text-slate-300 text-sm">
          The space SPAC wave of 2020-2022 brought 15+ space companies public including Planet Labs (PL), Rocket Lab (RKLB),
          BlackSky (BKSY), Spire Global (SPIR), Virgin Orbit (bankrupt 2023), Momentus (delisted 2024), and others.
          Post-SPAC performance has been mixed: Rocket Lab is the standout winner, growing from ~$5 to $25+ per share,
          while several others have struggled with profitability timelines. The SPAC window has effectively closed as of 2024,
          with new IPOs now following the traditional route. Companies like SpaceX, Relativity Space, and Firefly remain private.
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 3: Government Budgets
// ────────────────────────────────────────

interface GovernmentBudgetsTabProps {
  governmentBudgets: GovernmentBudget[];
}

function GovernmentBudgetsTab({ governmentBudgets }: GovernmentBudgetsTabProps) {
  const [sortBy, setSortBy] = useState<'budget' | 'change'>('budget');

  const sortedBudgets = [...governmentBudgets].sort((a, b) => {
    if (sortBy === 'budget') return b.budget2025 - a.budget2025;
    return b.change - a.change;
  });

  const totalBudget2024 = governmentBudgets.reduce((sum, b) => sum + b.budget2024, 0);
  const totalBudget2025 = governmentBudgets.reduce((sum, b) => sum + b.budget2025, 0);

  return (
    <div className="space-y-8">
      {/* Headline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-cyan-400">{formatBillions(totalBudget2025)}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Total Gov&apos;t Space 2025</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-green-400">
            {formatPercent(((totalBudget2025 - totalBudget2024) / totalBudget2024) * 100)}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">YoY Growth</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-purple-400">{governmentBudgets.length}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Agencies Tracked</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-amber-400">$58.9B</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">U.S. Space (Total)</div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex gap-2 items-center">
        <span className="text-slate-400 text-sm">Sort by:</span>
        <button
          onClick={() => setSortBy('budget')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            sortBy === 'budget'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
          }`}
        >
          Budget Size
        </button>
        <button
          onClick={() => setSortBy('change')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            sortBy === 'change'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
          }`}
        >
          Growth Rate
        </button>
      </div>

      {/* Budget Cards */}
      <div className="space-y-4">
        {sortedBudgets.map((budget) => (
          <div key={budget.agency} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Agency Info */}
              <div className="flex items-center gap-3 md:w-64 shrink-0">
                <span className="text-3xl">{budget.flag}</span>
                <div>
                  <div className="text-white font-semibold">{budget.agency}</div>
                  <div className="text-slate-400 text-sm">{budget.country}</div>
                </div>
              </div>

              {/* Budget Numbers */}
              <div className="flex gap-6 items-center">
                <div>
                  <div className="text-slate-500 text-xs">FY2024</div>
                  <div className="text-slate-300 font-mono">{formatBillions(budget.budget2024)}</div>
                </div>
                <div className="text-slate-600">&#8594;</div>
                <div>
                  <div className="text-slate-500 text-xs">FY2025</div>
                  <div className="text-cyan-400 font-mono font-bold">{formatBillions(budget.budget2025)}</div>
                </div>
                <div>
                  <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                    budget.change >= 0
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-red-900/30 text-red-400'
                  }`}>
                    {formatPercent(budget.change)}
                  </span>
                </div>
              </div>

              {/* Budget Bar */}
              <div className="flex-1 hidden lg:block">
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                    style={{ width: `${(budget.budget2025 / Math.max(...governmentBudgets.map((b) => b.budget2025))) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Focus Areas & Notes */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {budget.focusAreas.map((area) => (
                <span key={area} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded">
                  {area}
                </span>
              ))}
            </div>
            <div className="mt-2 text-slate-500 text-xs">{budget.notes}</div>
          </div>
        ))}
      </div>

      {/* Context Note */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/30 p-4 text-center">
        <p className="text-slate-500 text-xs">
          Budget figures are approximated in USD using 2024-2025 average exchange rates where applicable.
          Chinese spending is estimated as official figures are not published. U.S. figures include both NASA civil and DoD/IC classified programs.
          Sources: NASA, ESA, JAXA, ISRO official budgets; Euroconsult; OECD Space Economy reports.
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 4: Public Markets
// ────────────────────────────────────────

interface PublicMarketsTabProps {
  stocks: SpaceCompanyStock[];
  etfs?: SpaceETF[];
}

function PublicMarketsTab({ stocks, etfs = [] }: PublicMarketsTabProps) {
  const [sectorFilter, setSectorFilter] = useState<string>('');

  const publicStocks = stocks.filter((s) => s.ticker !== 'Private' && s.ticker !== 'Acquired');
  const sectors = Array.from(new Set(publicStocks.map((s) => s.sector))).sort();

  const filteredStocks = sectorFilter
    ? publicStocks.filter((s) => s.sector === sectorFilter)
    : publicStocks;

  const totalMarketCap = publicStocks.reduce((sum, s) => sum + s.marketCap, 0);

  return (
    <div className="space-y-8">
      {/* Headline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-cyan-400">{publicStocks.length}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Tracked Stocks</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-green-400">{formatBillions(totalMarketCap)}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Combined Market Cap</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-amber-400">
            {formatPercent(publicStocks.reduce((sum, s) => sum + s.ytdChange, 0) / publicStocks.length)}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Avg YTD Change</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 text-center">
          <div className="text-3xl font-bold text-purple-400">{etfs.length}</div>
          <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">Space ETFs</div>
        </div>
      </div>

      {/* Sector Filter */}
      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-slate-400 text-sm">Filter:</span>
        <button
          onClick={() => setSectorFilter('')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            !sectorFilter
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
          }`}
        >
          All
        </button>
        {sectors.map((sector) => (
          <button
            key={sector}
            onClick={() => setSectorFilter(sector)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              sectorFilter === sector
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
            }`}
          >
            {sector}
          </button>
        ))}
      </div>

      {/* Stock Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-900/50">
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Company</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Ticker</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Price</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Market Cap</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">YTD</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm hidden md:table-cell">Revenue (2024)</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm hidden lg:table-cell">Sector</th>
              </tr>
            </thead>
            <tbody>
              {filteredStocks
                .sort((a, b) => b.marketCap - a.marketCap)
                .map((stock) => (
                  <tr key={stock.ticker} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="py-3 px-4 text-white font-medium">{stock.name}</td>
                    <td className="py-3 px-4 text-cyan-400 font-mono text-sm">
                      {stock.exchange}:{stock.ticker}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300 font-mono">
                      ${stock.price.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300 font-mono">
                      {formatBillions(stock.marketCap)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                        stock.ytdChange >= 0
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-red-900/30 text-red-400'
                      }`}>
                        {formatPercent(stock.ytdChange)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono hidden md:table-cell">
                      {stock.revenue2024 >= 1 ? formatBillions(stock.revenue2024) : `$${(stock.revenue2024 * 1000).toFixed(0)}M`}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded">{stock.sector}</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notable Private Companies */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-lg">🔒</span>
          Notable Private Companies
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stocks.filter((s) => s.ticker === 'Private').map((company) => (
            <div key={company.name} className="bg-slate-900/50 rounded-lg border border-slate-700/30 p-4">
              <div className="text-white font-semibold">{company.name}</div>
              <div className="text-purple-400 text-lg font-bold">{formatBillions(company.marketCap)} valuation</div>
              <div className="text-slate-400 text-sm">{company.sector}</div>
              <div className="text-slate-500 text-xs mt-1">2024 Revenue: {formatBillions(company.revenue2024)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Space ETFs */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-lg">📊</span>
          Space-Related ETFs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {etfs.map((etf) => (
            <div key={etf.ticker} className="bg-slate-900/50 rounded-lg border border-slate-700/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-white font-semibold text-sm">{etf.name}</div>
                  <div className="text-cyan-400 font-mono text-sm">{etf.ticker}</div>
                </div>
                <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                  etf.ytdReturn >= 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                }`}>
                  {formatPercent(etf.ytdReturn)}
                </span>
              </div>
              <div className="flex gap-4 text-sm mb-3">
                <div>
                  <span className="text-slate-500">AUM: </span>
                  <span className="text-slate-300">{formatBillions(etf.aum)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Expense: </span>
                  <span className="text-slate-300">{etf.expenseRatio}%</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {etf.topHoldings.map((holding) => (
                  <span key={holding} className="text-xs bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded">
                    {holding}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/30 p-4 text-center">
        <p className="text-slate-500 text-xs">
          Stock prices and market data are approximate and may not reflect real-time values.
          For publicly traded companies, data is based on recent filings and market reports.
          This is not investment advice. Always conduct your own research.
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Tab 5: Workforce & Trends
// ────────────────────────────────────────

interface WorkforceTrendsTabProps {
  workforceStats: WorkforceStat[];
  launchCostTrends: LaunchCostDataPoint[];
  salaryBenchmarks?: SalaryBenchmark[];
}

function WorkforceTrendsTab({ workforceStats, launchCostTrends, salaryBenchmarks = [] }: WorkforceTrendsTabProps) {
  return (
    <div className="space-y-8">
      {/* Workforce Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {workforceStats.slice(0, 4).map((stat) => (
          <div key={stat.category} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
            <div className="text-2xl font-bold text-cyan-400 mb-1">{stat.value}</div>
            <div className="text-white text-sm font-medium mb-1">{stat.category}</div>
            <div className="text-slate-500 text-xs">{stat.detail}</div>
            <div className="text-slate-600 text-xs mt-1">Source: {stat.source}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {workforceStats.slice(4).map((stat) => (
          <div key={stat.category} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
            <div className="text-2xl font-bold text-green-400 mb-1">{stat.value}</div>
            <div className="text-white text-sm font-medium mb-1">{stat.category}</div>
            <div className="text-slate-500 text-xs">{stat.detail}</div>
            <div className="text-slate-600 text-xs mt-1">Source: {stat.source}</div>
          </div>
        ))}
      </div>

      {/* Salary Benchmarks */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-lg">💵</span>
          Space Industry Salary Benchmarks (U.S., 2025)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Role</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Min</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Median</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Max</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">YoY Growth</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm hidden md:table-cell">Range</th>
              </tr>
            </thead>
            <tbody>
              {[...salaryBenchmarks].sort((a, b) => b.median - a.median).map((role) => {
                const rangeMin = role.minSalary;
                const rangeMax = role.maxSalary;
                const maxPossible = 220000;
                const leftPct = (rangeMin / maxPossible) * 100;
                const widthPct = ((rangeMax - rangeMin) / maxPossible) * 100;
                const medianPct = ((role.median - rangeMin) / (rangeMax - rangeMin)) * 100;
                return (
                  <tr key={role.role} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="py-3 px-4 text-white font-medium text-sm">{role.role}</td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono text-sm">{formatCurrency(role.minSalary)}</td>
                    <td className="py-3 px-4 text-right text-cyan-400 font-mono font-bold text-sm">{formatCurrency(role.median)}</td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono text-sm">{formatCurrency(role.maxSalary)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-green-400 text-sm">{formatPercent(role.growth)}</span>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="w-full h-3 bg-slate-700 rounded-full relative overflow-hidden">
                        <div
                          className="absolute h-full bg-gradient-to-r from-cyan-600/60 to-cyan-400/60 rounded-full"
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        />
                        <div
                          className="absolute h-full w-0.5 bg-white rounded-full"
                          style={{ left: `${leftPct + (widthPct * medianPct) / 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Launch Cost Trends */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-lg">🚀</span>
          Launch Cost Comparison ($/kg to LEO)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Vehicle</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Operator</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">$/kg (LEO)</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm hidden sm:table-cell">Payload (LEO)</th>
                <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">Reusable</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm hidden md:table-cell">Cost Bar</th>
              </tr>
            </thead>
            <tbody>
              {launchCostTrends
                .sort((a, b) => a.costPerKgLEO - b.costPerKgLEO)
                .map((launch) => {
                  const maxCost = Math.max(...launchCostTrends.map((l) => l.costPerKgLEO));
                  const logMax = Math.log10(maxCost);
                  const logVal = Math.log10(launch.costPerKgLEO);
                  const barWidth = (logVal / logMax) * 100;
                  return (
                    <tr key={launch.vehicle} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                      <td className="py-3 px-4 text-white font-medium text-sm">{launch.vehicle}</td>
                      <td className="py-3 px-4 text-slate-400 text-sm">{launch.operator}</td>
                      <td className="py-3 px-4 text-right text-cyan-400 font-mono font-bold text-sm">
                        ${launch.costPerKgLEO.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono text-sm hidden sm:table-cell">
                        {launch.payload.toLocaleString()} kg
                      </td>
                      <td className="py-3 px-4 text-center">
                        {launch.reusable ? (
                          <span className="text-green-400 text-xs bg-green-900/30 px-2 py-0.5 rounded">Yes</span>
                        ) : (
                          <span className="text-slate-500 text-xs bg-slate-700/30 px-2 py-0.5 rounded">No</span>
                        )}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              launch.costPerKgLEO <= 1000
                                ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                : launch.costPerKgLEO <= 5000
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-400'
                                : launch.costPerKgLEO <= 10000
                                ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                                : 'bg-gradient-to-r from-red-500 to-rose-400'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Under $1,000/kg
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> $1,000 - $5,000/kg
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> $5,000 - $10,000/kg
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Over $10,000/kg
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h4 className="text-white font-semibold mb-3">Launch Cost Revolution</h4>
          <div className="space-y-3 text-sm text-slate-300">
            <p>
              Launch costs have dropped by over 95% since the Space Shuttle era.
              SpaceX&apos;s Falcon 9 reduced costs to ~$2,720/kg through booster reuse (20+ flights per booster).
            </p>
            <p>
              Starship, if operational at projected rates, could reduce costs to ~$100/kg --
              a 500x reduction from the Shuttle and enabling entirely new categories of space activity.
            </p>
            <p>
              Small launch vehicles like Electron are more expensive per kg ($26,500) but offer
              dedicated orbits and schedules for small satellites, commanding a premium.
            </p>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h4 className="text-white font-semibold mb-3">Workforce Outlook</h4>
          <div className="space-y-3 text-sm text-slate-300">
            <p>
              The space industry faces an estimated 45,000+ unfilled positions in the U.S. alone,
              primarily in software engineering, systems engineering, and RF/satellite communications.
            </p>
            <p>
              Space software engineers command the highest salaries (median $165K), reflecting
              the growing importance of software-defined satellites and AI/ML in space applications.
            </p>
            <p>
              GNC (Guidance, Navigation & Control) engineers are seeing 5.5% annual salary growth,
              driven by demand from autonomous spacecraft operations and lunar/Mars missions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function SpaceEconomyPage() {
  const [activeTab, setActiveTab] = useState<TabId>('market');
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  // Data state for all sections
  const [marketSegments, setMarketSegments] = useState<MarketSegment[]>([]);
  const [quarterlyVC, setQuarterlyVC] = useState<VCDeal[]>([]);
  const [annualInvestment, setAnnualInvestment] = useState<AnnualInvestment[]>([]);
  const [governmentBudgets, setGovernmentBudgets] = useState<GovernmentBudget[]>([]);
  const [stocks, setStocks] = useState<SpaceCompanyStock[]>([]);
  const [workforceStats, setWorkforceStats] = useState<WorkforceStat[]>([]);
  const [launchCostTrends, setLaunchCostTrends] = useState<LaunchCostDataPoint[]>([]);

  useEffect(() => {
    async function fetchSection(section: string) {
      const res = await fetch(`/api/content/space-economy?section=${section}`);
      if (!res.ok) throw new Error(`Failed to fetch ${section}`);
      return res.json();
    }

    async function fetchAllData() {
      try {
        const [
          segmentsRes,
          vcRes,
          investmentRes,
          budgetsRes,
          stocksRes,
          workforceRes,
          launchRes,
        ] = await Promise.all([
          fetchSection('market-segments'),
          fetchSection('quarterly-vc'),
          fetchSection('annual-investment'),
          fetchSection('government-budgets'),
          fetchSection('stocks'),
          fetchSection('workforce-stats'),
          fetchSection('launch-cost-trends'),
        ]);

        setMarketSegments(segmentsRes.data || []);
        setQuarterlyVC(vcRes.data || []);
        setAnnualInvestment(investmentRes.data || []);
        setGovernmentBudgets(budgetsRes.data || []);
        setStocks(stocksRes.data || []);
        setWorkforceStats(workforceRes.data || []);
        setLaunchCostTrends(launchRes.data || []);

        // Use the freshest lastRefreshed from any section
        const allMetas = [segmentsRes, vcRes, investmentRes, budgetsRes, stocksRes, workforceRes, launchRes];
        const freshest = allMetas
          .map(r => r.meta?.lastRefreshed)
          .filter(Boolean)
          .sort()
          .pop();
        setRefreshedAt(freshest || null);
      } catch (err) {
        console.error('Error fetching space economy data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAllData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="h-4 bg-slate-800 rounded w-2/3"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-800 rounded-lg"></div>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-800 rounded-lg"></div>)}
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
          title="Space Economy Dashboard"
          subtitle="Comprehensive intelligence on the global space economy -- market size, investment trends, government budgets, public markets, and workforce data"
          icon="💰"
          accentColor="emerald"
        />
        <DataFreshness refreshedAt={refreshedAt} source="DynamicContent" />

        {/* Tab Navigation */}
        <div className="border-b border-slate-700/50 mb-8">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
        {activeTab === 'market' && <MarketOverviewTab marketSegments={marketSegments} />}
        {activeTab === 'investment' && <InvestmentTab quarterlyVC={quarterlyVC} annualInvestment={annualInvestment} />}
        {activeTab === 'government' && <GovernmentBudgetsTab governmentBudgets={governmentBudgets} />}
        {activeTab === 'public-markets' && <PublicMarketsTab stocks={stocks} />}
        {activeTab === 'workforce' && <WorkforceTrendsTab workforceStats={workforceStats} launchCostTrends={launchCostTrends} />}

        {/* Data Sources Footer */}
        <ScrollReveal>
        <div className="mt-12 bg-slate-800/30 rounded-xl border border-slate-700/30 p-6">
          <h4 className="text-slate-400 font-semibold text-sm mb-3">Data Sources</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-500">
            <div>Space Foundation -- The Space Report (2024)</div>
            <div>Satellite Industry Association (SIA) -- SOTSI 2024</div>
            <div>Space Capital -- Quarterly Investment Reports</div>
            <div>Morgan Stanley -- Space Economy Forecast</div>
            <div>Goldman Sachs -- Space: The Next Frontier</div>
            <div>Euroconsult -- Government Space Programs</div>
            <div>Bureau of Labor Statistics (BLS) -- OES Data</div>
            <div>NASA, ESA, JAXA, ISRO -- Official Budgets</div>
            <div>OECD -- The Space Economy at a Glance</div>
          </div>
          <p className="text-slate-600 text-xs mt-3">
            Data is compiled from publicly available industry reports and may include estimates where official figures are unavailable.
            Market data is approximate and not intended as investment advice. Last updated: Q2 2025.
          </p>
        </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
