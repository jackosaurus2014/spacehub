'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ScrollReveal from '@/components/ui/ScrollReveal';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface CompanyScores {
  overall: number | null;
  technology: number | null;
  team: number | null;
  funding: number | null;
  market_position: number | null;
  growth: number | null;
  momentum: number | null;
}

interface FundingRoundData {
  date: string;
  amount: number | null;
  seriesLabel: string | null;
}

interface RecentMove {
  name: string;
  type: string;
  date: string;
  fromCompany: string | null;
  toCompany: string | null;
}

interface WarRoomCompany {
  slug: string;
  name: string;
  sector: string | null;
  totalFunding: number | null;
  valuation: number | null;
  employeeRange: string | null;
  scores: CompanyScores;
  contracts: {
    total: number;
    totalValue: number;
    byAgency: Record<string, number>;
    byYear: Record<string, { count: number; value: number }>;
  };
  funding: {
    totalRounds: number;
    totalRaised: number;
    rounds: FundingRoundData[];
    timeToLastRound: number | null;
  };
  team: {
    currentCount: number;
    departedCount: number;
    avgTenureMonths: number | null;
    recentMoves: RecentMove[];
  };
  products: {
    total: number;
    active: number;
    inDevelopment: number;
    byCategory: Record<string, number>;
  };
}

type Period = '1y' | '2y' | '3y' | '5y';

const PERIODS: Period[] = ['1y', '2y', '3y', '5y'];

const SCORE_LABELS: { key: keyof CompanyScores; label: string }[] = [
  { key: 'overall', label: 'Overall' },
  { key: 'technology', label: 'Technology' },
  { key: 'team', label: 'Team' },
  { key: 'funding', label: 'Funding' },
  { key: 'market_position', label: 'Market Position' },
  { key: 'growth', label: 'Growth' },
  { key: 'momentum', label: 'Momentum' },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '--';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function scoreColor(score: number | null, allScores: (number | null)[]): string {
  if (score == null) return 'text-slate-500';
  const valid = allScores.filter((s): s is number => s != null);
  if (valid.length === 0) return 'text-slate-300';
  const max = Math.max(...valid);
  const min = Math.min(...valid);
  if (valid.length > 1 && score === max) return 'text-emerald-400 font-semibold';
  if (valid.length > 1 && score === min) return 'text-red-400';
  return 'text-slate-300';
}

function moveTypeLabel(type: string): string {
  const map: Record<string, string> = {
    hired: 'Hired',
    departed: 'Departed',
    promoted: 'Promoted',
    appointed: 'Appointed',
    board_joined: 'Board',
  };
  return map[type] || type;
}

function moveTypeBadgeColor(type: string): string {
  const map: Record<string, string> = {
    hired: 'bg-emerald-500/20 text-emerald-400',
    departed: 'bg-red-500/20 text-red-400',
    promoted: 'bg-blue-500/20 text-blue-400',
    appointed: 'bg-purple-500/20 text-purple-400',
    board_joined: 'bg-amber-500/20 text-amber-400',
  };
  return map[type] || 'bg-slate-500/20 text-slate-400';
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function WarRoomPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const [slugInput, setSlugInput] = useState('');
  const [period, setPeriod] = useState<Period>('3y');
  const [companies, setCompanies] = useState<WarRoomCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login?returnTo=/intelligence/war-room');
    }
  }, [sessionStatus, router]);

  if (sessionStatus === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  const fetchData = useCallback(async () => {
    const slugs = slugInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (slugs.length === 0) {
      setError('Enter at least one company slug');
      return;
    }
    if (slugs.length > 5) {
      setError('Maximum 5 companies allowed');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/intelligence/war-room?companies=${encodeURIComponent(slugs.join(','))}&period=${period}`
      );
      const data = await res.json();

      if (!res.ok) {
        const msg =
          data?.error?.message || data?.error || 'Failed to load data';
        setError(typeof msg === 'string' ? msg : 'Failed to load data');
        setCompanies([]);
        return;
      }

      setCompanies(data.companies || []);
    } catch {
      setError('Network error. Please try again.');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [slugInput, period]);

  const colCount = companies.length || 1;

  return (
    <main className="min-h-screen bg-[#0B1120] px-4 py-12 md:px-8">
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <AnimatedPageHeader
          title="Competitive Intelligence War Room"
          subtitle="Side-by-side competitive analysis with scoring, contracts, funding, team stability, and product portfolio data."
          breadcrumb="Intelligence -> War Room"
          accentColor="red"
        />

        {/* Controls */}
        <ScrollReveal delay={0.1}>
          <div className="card p-5 mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
              {/* Company slugs input */}
              <div className="flex-1 w-full">
                <label
                  htmlFor="company-slugs"
                  className="block text-sm font-medium text-slate-400 mb-1.5"
                >
                  Company Slugs (comma-separated, max 5)
                </label>
                <input
                  id="company-slugs"
                  type="text"
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') fetchData();
                  }}
                  placeholder="spacex, rocket-lab, blue-origin"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                />
              </div>

              {/* Period selector */}
              <div>
                <span className="block text-sm font-medium text-slate-400 mb-1.5">
                  Period
                </span>
                <div className="flex rounded-lg border border-white/10 overflow-hidden">
                  {PERIODS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                        period === p
                          ? 'bg-cyan-600 text-white'
                          : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Analyze button */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-400">{error}</p>
            )}
          </div>
        </ScrollReveal>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-slate-400 text-sm">Gathering competitive intelligence...</p>
          </div>
        )}

        {/* Results */}
        {!loading && companies.length > 0 && (
          <div className="space-y-8">
            {/* ---- Section 1: Overview Cards ---- */}
            <ScrollReveal>
              <h2 className="text-xl font-semibold text-slate-200 mb-4">Company Overview</h2>
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
              >
                {companies.map((c) => (
                  <div key={c.slug} className="card p-5 space-y-3">
                    <h3 className="text-lg font-semibold text-white truncate">{c.name}</h3>
                    <span className="inline-block text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                      {c.sector || 'N/A'}
                    </span>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Funding</span>
                        <span className="text-slate-200">{formatCurrency(c.totalFunding)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Valuation</span>
                        <span className="text-slate-200">{formatCurrency(c.valuation)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Employees</span>
                        <span className="text-slate-200">{c.employeeRange || '--'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Overall Score</span>
                        <span
                          className={`font-semibold ${
                            c.scores.overall != null
                              ? c.scores.overall >= 70
                                ? 'text-emerald-400'
                                : c.scores.overall >= 40
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {c.scores.overall != null ? c.scores.overall.toFixed(0) : '--'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* ---- Section 2: Score Comparison ---- */}
            <ScrollReveal delay={0.05}>
              <h2 className="text-xl font-semibold text-slate-200 mb-4">Score Comparison</h2>
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-5 py-3 text-slate-400 font-medium">
                        Score Type
                      </th>
                      {companies.map((c) => (
                        <th
                          key={c.slug}
                          className="text-center px-5 py-3 text-slate-300 font-medium"
                        >
                          {c.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SCORE_LABELS.map(({ key, label }) => {
                      const allVals = companies.map((c) => c.scores[key]);
                      return (
                        <tr key={key} className="border-b border-white/[0.05]">
                          <td className="px-5 py-3 text-slate-400">{label}</td>
                          {companies.map((c) => (
                            <td
                              key={c.slug}
                              className={`text-center px-5 py-3 ${scoreColor(c.scores[key], allVals)}`}
                            >
                              <div className="flex flex-col items-center gap-1">
                                <span>
                                  {c.scores[key] != null ? c.scores[key]!.toFixed(0) : '--'}
                                </span>
                                {c.scores[key] != null && (
                                  <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        c.scores[key]! >= 70
                                          ? 'bg-emerald-500'
                                          : c.scores[key]! >= 40
                                            ? 'bg-amber-500'
                                            : 'bg-red-500'
                                      }`}
                                      style={{ width: `${c.scores[key]}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ScrollReveal>

            {/* ---- Section 3: Contract Win Analysis ---- */}
            <ScrollReveal delay={0.1}>
              <h2 className="text-xl font-semibold text-slate-200 mb-4">
                Contract Win Analysis
              </h2>
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
              >
                {companies.map((c) => (
                  <div key={c.slug} className="card p-5 space-y-4">
                    <h3 className="text-base font-semibold text-slate-200 truncate">{c.name}</h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/[0.06] rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-white">{c.contracts.total}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Total Contracts</p>
                      </div>
                      <div className="bg-white/[0.06] rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-400">
                          {formatCurrency(c.contracts.totalValue)}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Total Value</p>
                      </div>
                    </div>

                    {/* By agency */}
                    {Object.keys(c.contracts.byAgency).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                          By Agency
                        </p>
                        <div className="space-y-1.5">
                          {Object.entries(c.contracts.byAgency)
                            .sort(([, a], [, b]) => b - a)
                            .map(([agency, count]) => (
                              <div
                                key={agency}
                                className="flex justify-between text-sm bg-white/[0.04] rounded px-3 py-1.5"
                              >
                                <span className="text-slate-300">{agency}</span>
                                <span className="text-slate-200 font-medium">{count}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* By year */}
                    {Object.keys(c.contracts.byYear).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                          By Year
                        </p>
                        <div className="space-y-1.5">
                          {Object.entries(c.contracts.byYear)
                            .sort(([a], [b]) => b.localeCompare(a))
                            .map(([year, data]) => (
                              <div
                                key={year}
                                className="flex justify-between text-sm bg-white/[0.04] rounded px-3 py-1.5"
                              >
                                <span className="text-slate-300">{year}</span>
                                <span className="text-slate-200">
                                  {data.count} awards / {formatCurrency(data.value)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {c.contracts.total === 0 && (
                      <p className="text-sm text-slate-500 italic">
                        No contracts in selected period
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* ---- Section 4: Funding Timeline ---- */}
            <ScrollReveal delay={0.15}>
              <h2 className="text-xl font-semibold text-slate-200 mb-4">Funding Timeline</h2>
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
              >
                {companies.map((c) => (
                  <div key={c.slug} className="card p-5 space-y-4">
                    <h3 className="text-base font-semibold text-slate-200 truncate">{c.name}</h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/[0.06] rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-white">{c.funding.totalRounds}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Rounds</p>
                      </div>
                      <div className="bg-white/[0.06] rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-400">
                          {formatCurrency(c.funding.totalRaised)}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Total Raised</p>
                      </div>
                    </div>

                    {c.funding.timeToLastRound != null && (
                      <p className="text-xs text-slate-500">
                        Last round:{' '}
                        <span className="text-slate-300">
                          {c.funding.timeToLastRound} days ago
                        </span>
                      </p>
                    )}

                    {c.funding.rounds.length > 0 ? (
                      <div className="space-y-2">
                        {c.funding.rounds.map((r, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 text-sm bg-white/[0.04] rounded px-3 py-2"
                          >
                            <div className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
                            <span className="text-slate-400 text-xs w-16 shrink-0">
                              {formatDate(r.date)}
                            </span>
                            <span className="text-slate-300 truncate flex-1">
                              {r.seriesLabel || 'Round'}
                            </span>
                            <span className="text-emerald-400 font-medium shrink-0">
                              {formatCurrency(r.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">
                        No funding rounds in selected period
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* ---- Section 5: Team Stability ---- */}
            <ScrollReveal delay={0.2}>
              <h2 className="text-xl font-semibold text-slate-200 mb-4">Team Stability</h2>
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
              >
                {companies.map((c) => (
                  <div key={c.slug} className="card p-5 space-y-4">
                    <h3 className="text-base font-semibold text-slate-200 truncate">{c.name}</h3>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white/[0.06] rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-white">{c.team.currentCount}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Current</p>
                      </div>
                      <div className="bg-white/[0.06] rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-red-400">{c.team.departedCount}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Departed</p>
                      </div>
                      <div className="bg-white/[0.06] rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-cyan-400">
                          {c.team.avgTenureMonths != null ? `${c.team.avgTenureMonths}mo` : '--'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Avg Tenure</p>
                      </div>
                    </div>

                    {/* Retention ratio bar */}
                    {(c.team.currentCount > 0 || c.team.departedCount > 0) && (
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>Retention</span>
                          <span>
                            {c.team.currentCount + c.team.departedCount > 0
                              ? `${Math.round(
                                  (c.team.currentCount /
                                    (c.team.currentCount + c.team.departedCount)) *
                                    100
                                )}%`
                              : '--'}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{
                              width: `${
                                c.team.currentCount + c.team.departedCount > 0
                                  ? (c.team.currentCount /
                                      (c.team.currentCount + c.team.departedCount)) *
                                    100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Recent moves */}
                    {c.team.recentMoves.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                          Recent Moves
                        </p>
                        <div className="space-y-1.5">
                          {c.team.recentMoves.map((m, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-sm bg-white/[0.04] rounded px-3 py-1.5"
                            >
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded ${moveTypeBadgeColor(m.type)}`}
                              >
                                {moveTypeLabel(m.type)}
                              </span>
                              <span className="text-slate-300 truncate flex-1">{m.name}</span>
                              <span className="text-xs text-slate-500 shrink-0">
                                {formatDate(m.date)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {c.team.currentCount === 0 && c.team.departedCount === 0 && (
                      <p className="text-sm text-slate-500 italic">No personnel data available</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* ---- Section 6: Product Portfolio ---- */}
            <ScrollReveal delay={0.25}>
              <h2 className="text-xl font-semibold text-slate-200 mb-4">Product Portfolio</h2>
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
              >
                {companies.map((c) => (
                  <div key={c.slug} className="card p-5 space-y-4">
                    <h3 className="text-base font-semibold text-slate-200 truncate">{c.name}</h3>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white/[0.06] rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-white">{c.products.total}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Total</p>
                      </div>
                      <div className="bg-white/[0.06] rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-emerald-400">{c.products.active}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Active</p>
                      </div>
                      <div className="bg-white/[0.06] rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-amber-400">
                          {c.products.inDevelopment}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">In Dev</p>
                      </div>
                    </div>

                    {Object.keys(c.products.byCategory).length > 0 ? (
                      <div>
                        <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                          By Category
                        </p>
                        <div className="space-y-1.5">
                          {Object.entries(c.products.byCategory)
                            .sort(([, a], [, b]) => b - a)
                            .map(([cat, count]) => (
                              <div
                                key={cat}
                                className="flex justify-between text-sm bg-white/[0.04] rounded px-3 py-1.5"
                              >
                                <span className="text-slate-300">
                                  {cat.replace(/_/g, ' ')}
                                </span>
                                <span className="text-slate-200 font-medium">{count}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">No product data available</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        )}

        {/* Empty state */}
        {!loading && companies.length === 0 && !error && (
          <div className="text-center py-24">
            <p className="text-4xl mb-4">&#x1F50D;</p>
            <h2 className="text-xl font-semibold text-slate-300 mb-2">
              Enter company slugs to begin analysis
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Compare up to 5 companies side-by-side across scoring, government contracts, funding
              history, team stability, and product portfolios.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
