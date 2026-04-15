'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface SalaryBenchmark {
  category: string;
  seniorityLevel: string;
  avgMin: number;
  avgMax: number;
  avgMedian: number;
  count: number;
}

interface ClearancePremiumRow {
  category: string;
  withClearance: { avgMin: number; avgMax: number; avgMedian: number; count: number } | null;
  withoutClearance: { avgMin: number; avgMax: number; avgMedian: number; count: number } | null;
  premiumAmount: number;
  premiumPercent: number;
}

interface SkillDemand {
  skill: string;
  index: number;
}

interface WorkforceTrendRow {
  period: string;
  year: number;
  quarter: number;
  totalOpenings: number;
  avgSalary: number | null;
  yoyGrowth: number | null;
  topCompanies: string | null;
}

interface CategoryDist {
  category: string;
  count: number;
}

interface SeniorityDist {
  seniorityLevel: string;
  count: number;
}

interface CareerIntelData {
  salaryBenchmarks: SalaryBenchmark[];
  clearancePremium: ClearancePremiumRow[];
  skillsDemand: SkillDemand[];
  workforceTrends: WorkforceTrendRow[];
  topHiringCompanies: string[];
  categoryDistribution: CategoryDist[];
  seniorityDistribution: SeniorityDist[];
}

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const SENIORITY_ORDER = ['entry', 'mid', 'senior', 'lead', 'director', 'vp', 'c_suite'];

const SENIORITY_LABELS: Record<string, string> = {
  entry: 'Entry',
  mid: 'Mid-Level',
  senior: 'Senior',
  lead: 'Lead',
  director: 'Director',
  vp: 'VP',
  c_suite: 'C-Suite',
};

const CATEGORY_LABELS: Record<string, string> = {
  engineering: 'Engineering',
  operations: 'Operations',
  business: 'Business',
  research: 'Research',
  legal: 'Legal',
  manufacturing: 'Manufacturing',
};

const CATEGORY_COLORS: Record<string, { text: string; bg: string; bar: string }> = {
  engineering: { text: 'text-blue-400', bg: 'bg-blue-500/20', bar: 'bg-blue-500' },
  operations: { text: 'text-emerald-400', bg: 'bg-emerald-500/20', bar: 'bg-emerald-500' },
  business: { text: 'text-yellow-400', bg: 'bg-yellow-500/20', bar: 'bg-yellow-500' },
  research: { text: 'text-purple-400', bg: 'bg-purple-500/20', bar: 'bg-purple-500' },
  legal: { text: 'text-cyan-400', bg: 'bg-cyan-500/20', bar: 'bg-cyan-500' },
  manufacturing: { text: 'text-orange-400', bg: 'bg-orange-500/20', bar: 'bg-orange-500' },
};

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function fmt(n: number): string {
  return `$${(n / 1000).toFixed(0)}K`;
}

function fmtFull(n: number): string {
  return `$${n.toLocaleString()}`;
}

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] || { text: 'text-slate-400', bg: 'bg-white/10', bar: 'bg-slate-500' };
}

// ────────────────────────────────────────
// Page Component
// ────────────────────────────────────────

export default function CareerIntelligencePage() {
  const [data, setData] = useState<CareerIntelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const res = await fetch('/api/career-intelligence');
        if (!res.ok) throw new Error('Failed to load career intelligence data');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  // Build salary matrix: category (rows) x seniority (columns)
  const salaryMatrix = useMemo(() => {
    if (!data) return { categories: [] as string[], matrix: new Map<string, Map<string, SalaryBenchmark>>() };
    const matrix = new Map<string, Map<string, SalaryBenchmark>>();
    const categories = new Set<string>();

    for (const b of data.salaryBenchmarks) {
      categories.add(b.category);
      if (!matrix.has(b.category)) matrix.set(b.category, new Map());
      matrix.get(b.category)!.set(b.seniorityLevel, b);
    }

    return { categories: Array.from(categories).sort(), matrix };
  }, [data]);

  // Find max salary across all benchmarks for color-coding
  const maxAvgMax = useMemo(() => {
    if (!data) return 0;
    return Math.max(...data.salaryBenchmarks.map((b) => b.avgMax), 1);
  }, [data]);

  // Career path data: average salary per seniority level across all categories
  const careerPathData = useMemo(() => {
    if (!data) return [];
    const byLevel = new Map<string, { totalMin: number; totalMax: number; count: number }>();
    for (const b of data.salaryBenchmarks) {
      const existing = byLevel.get(b.seniorityLevel) || { totalMin: 0, totalMax: 0, count: 0 };
      existing.totalMin += b.avgMin * b.count;
      existing.totalMax += b.avgMax * b.count;
      existing.count += b.count;
      byLevel.set(b.seniorityLevel, existing);
    }
    return SENIORITY_ORDER
      .filter((s) => byLevel.has(s))
      .map((s) => {
        const d = byLevel.get(s)!;
        return {
          level: s,
          avgMin: Math.round(d.totalMin / d.count),
          avgMax: Math.round(d.totalMax / d.count),
        };
      });
  }, [data]);

  // Total open roles
  const totalRoles = useMemo(() => {
    if (!data) return 0;
    return data.categoryDistribution.reduce((sum, c) => sum + c.count, 0);
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          <AnimatedPageHeader
            title="Space Career Intelligence"
            subtitle="Data-driven insights for space industry careers."
            accentColor="emerald"
          />
          <div className="card p-8 text-center">
            <p className="text-red-400 text-lg mb-2">Unable to load career intelligence data</p>
            <p className="text-slate-500 text-sm">{error || 'Please try again later.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <AnimatedPageHeader
          title="Space Career Intelligence"
          subtitle="Salary benchmarks, clearance premiums, skills demand, workforce trends, and career path data powering smarter aerospace career decisions."
          accentColor="emerald"
        />

        {/* Top-line Stats */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StaggerItem>
            <div className="card p-5 text-center">
              <p className="text-sm text-slate-400 mb-1">Open Roles Tracked</p>
              <p className="text-3xl font-bold text-emerald-400">{totalRoles.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Active postings</p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card p-5 text-center">
              <p className="text-sm text-slate-400 mb-1">Categories</p>
              <p className="text-3xl font-bold text-blue-400">{data.categoryDistribution.length}</p>
              <p className="text-xs text-slate-500 mt-1">Sectors analyzed</p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card p-5 text-center">
              <p className="text-sm text-slate-400 mb-1">Skills Tracked</p>
              <p className="text-3xl font-bold text-purple-400">{data.skillsDemand.length}</p>
              <p className="text-xs text-slate-500 mt-1">In-demand skills</p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card p-5 text-center">
              <p className="text-sm text-slate-400 mb-1">Top Hiring Companies</p>
              <p className="text-3xl font-bold text-yellow-400">{data.topHiringCompanies.length}</p>
              <p className="text-xs text-slate-500 mt-1">Leading employers</p>
            </div>
          </StaggerItem>
        </StaggerContainer>

        {/* ═══════════════════════════════════════ */}
        {/* 1. SALARY BENCHMARKS TABLE              */}
        {/* ═══════════════════════════════════════ */}
        <ScrollReveal>
          <div className="card p-5 mb-8">
            <h2 className="text-xl font-bold text-slate-100 mb-1">Salary Benchmarks</h2>
            <p className="text-sm text-slate-500 mb-5">Average salary ranges (min-max) by category and seniority level</p>

            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-3 pr-4 text-slate-400 font-medium whitespace-nowrap">Category</th>
                    {SENIORITY_ORDER.map((level) => (
                      <th key={level} className="text-center py-3 px-2 text-slate-400 font-medium whitespace-nowrap">
                        {SENIORITY_LABELS[level]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {salaryMatrix.categories.map((cat) => {
                    const row = salaryMatrix.matrix.get(cat);
                    const colors = getCategoryColor(cat);
                    return (
                      <tr key={cat} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pr-4">
                          <span className={`font-medium ${colors.text}`}>{CATEGORY_LABELS[cat] || cat}</span>
                        </td>
                        {SENIORITY_ORDER.map((level) => {
                          const cell = row?.get(level);
                          if (!cell) {
                            return (
                              <td key={level} className="text-center py-3 px-2 text-slate-600">
                                &mdash;
                              </td>
                            );
                          }
                          const intensity = cell.avgMax / maxAvgMax;
                          const isHighest = intensity > 0.85;
                          return (
                            <td key={level} className="text-center py-3 px-2">
                              <span
                                className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                  isHighest
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'text-white/80'
                                }`}
                              >
                                {fmt(cell.avgMin)}-{fmt(cell.avgMax)}
                              </span>
                              <span className="block text-[10px] text-slate-500 mt-0.5">
                                {cell.count} role{cell.count !== 1 ? 's' : ''}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </ScrollReveal>

        {/* ═══════════════════════════════════════ */}
        {/* 2. CLEARANCE PREMIUM CALCULATOR         */}
        {/* ═══════════════════════════════════════ */}
        <ScrollReveal>
          <div className="card p-5 mb-8">
            <h2 className="text-xl font-bold text-slate-100 mb-1">Clearance Premium Calculator</h2>
            <p className="text-sm text-slate-500 mb-5">How much more do security-cleared professionals earn?</p>

            {data.clearancePremium.filter((c) => c.withClearance && c.withoutClearance).length === 0 ? (
              <p className="text-slate-500 text-sm">No clearance comparison data available yet.</p>
            ) : (
              <div className="space-y-4">
                {data.clearancePremium
                  .filter((c) => c.withClearance && c.withoutClearance)
                  .sort((a, b) => b.premiumAmount - a.premiumAmount)
                  .map((row) => {
                    const colors = getCategoryColor(row.category);
                    const positive = row.premiumAmount > 0;
                    return (
                      <div key={row.category} className="bg-white/[0.03] rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <span className={`font-medium ${colors.text}`}>
                              {CATEGORY_LABELS[row.category] || row.category}
                            </span>
                            <p className="text-sm text-slate-400 mt-1">
                              {CATEGORY_LABELS[row.category] || row.category} professionals with clearance earn{' '}
                              <span className={positive ? 'text-emerald-400 font-semibold' : 'text-slate-400 font-semibold'}>
                                {fmtFull(Math.abs(row.premiumAmount))} {positive ? 'more' : 'less'}
                              </span>{' '}
                              {positive && (
                                <span className="text-emerald-400/70">(+{row.premiumPercent}%)</span>
                              )}
                            </p>
                          </div>
                          <div className="flex gap-4 text-xs">
                            <div className="text-center">
                              <p className="text-slate-500">With Clearance</p>
                              <p className="text-emerald-400 font-semibold">
                                {fmt(row.withClearance!.avgMedian || row.withClearance!.avgMin)}
                              </p>
                              <p className="text-slate-600">{row.withClearance!.count} roles</p>
                            </div>
                            <div className="text-center">
                              <p className="text-slate-500">Without</p>
                              <p className="text-white/70 font-semibold">
                                {fmt(row.withoutClearance!.avgMedian || row.withoutClearance!.avgMin)}
                              </p>
                              <p className="text-slate-600">{row.withoutClearance!.count} roles</p>
                            </div>
                          </div>
                        </div>
                        {/* Premium bar */}
                        {positive && (
                          <div className="mt-3 relative h-2 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                              style={{ width: `${Math.min(row.premiumPercent * 2, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* ═══════════════════════════════════════ */}
        {/* 3. SKILLS IN DEMAND + 5. CATEGORY DIST  */}
        {/* ═══════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Skills in Demand */}
          <ScrollReveal>
            <div className="card p-5 h-full">
              <h2 className="text-xl font-bold text-slate-100 mb-1">Skills in Demand</h2>
              <p className="text-sm text-slate-500 mb-5">Top skills from latest workforce trend data</p>

              {data.skillsDemand.length === 0 ? (
                <p className="text-slate-500 text-sm">No skills data available yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.skillsDemand.map((skill, i) => {
                    const maxIndex = data.skillsDemand[0]?.index ?? 1;
                    const barWidth = (skill.index / maxIndex) * 100;
                    const isTop3 = i < 3;
                    return (
                      <div key={skill.skill}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${isTop3 ? 'text-white/90' : 'text-white/70'}`}>
                            {isTop3 && <span className="text-emerald-400 mr-2">#{i + 1}</span>}
                            {skill.skill}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isTop3
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : i < 6
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-white/10 text-slate-400'
                          }`}>
                            {isTop3 ? 'High' : i < 6 ? 'Medium' : 'Growing'}
                          </span>
                        </div>
                        <div className="relative h-2 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              isTop3 ? 'bg-emerald-500' : i < 6 ? 'bg-blue-500' : 'bg-slate-500'
                            }`}
                            style={{ width: `${barWidth}%`, opacity: isTop3 ? 0.9 : 0.6 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollReveal>

          {/* Category Distribution */}
          <ScrollReveal delay={0.1}>
            <div className="card p-5 h-full">
              <h2 className="text-xl font-bold text-slate-100 mb-1">Open Roles by Category</h2>
              <p className="text-sm text-slate-500 mb-5">Distribution of active job postings</p>

              {data.categoryDistribution.length === 0 ? (
                <p className="text-slate-500 text-sm">No category data available yet.</p>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const maxCount = Math.max(...data.categoryDistribution.map((c) => c.count), 1);
                    return data.categoryDistribution.map((cat) => {
                      const colors = getCategoryColor(cat.category);
                      const pct = (cat.count / totalRoles) * 100;
                      const barWidth = (cat.count / maxCount) * 100;
                      return (
                        <div key={cat.category}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-medium ${colors.text}`}>
                              {CATEGORY_LABELS[cat.category] || cat.category}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white/70">{cat.count}</span>
                              <span className="text-xs text-slate-500">({pct.toFixed(0)}%)</span>
                            </div>
                          </div>
                          <div className="relative h-3 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors.bar} rounded-full transition-all duration-700 opacity-70`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* Seniority mini breakdown */}
              {data.seniorityDistribution.length > 0 && (
                <>
                  <div className="mt-6 pt-4 border-t border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3">By Seniority</h3>
                    <div className="flex flex-wrap gap-2">
                      {SENIORITY_ORDER.filter((s) => data.seniorityDistribution.find((d) => d.seniorityLevel === s))
                        .map((level) => {
                          const d = data.seniorityDistribution.find((s) => s.seniorityLevel === level)!;
                          return (
                            <span
                              key={level}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] text-xs"
                            >
                              <span className="text-white/70 font-medium">{SENIORITY_LABELS[level]}</span>
                              <span className="text-slate-400">{d.count}</span>
                            </span>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollReveal>
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* 4. WORKFORCE TRENDS                     */}
        {/* ═══════════════════════════════════════ */}
        <ScrollReveal>
          <div className="card p-5 mb-8">
            <h2 className="text-xl font-bold text-slate-100 mb-1">Workforce Trends</h2>
            <p className="text-sm text-slate-500 mb-5">Quarterly metrics across the space industry</p>

            {data.workforceTrends.length === 0 ? (
              <p className="text-slate-500 text-sm">No trend data available yet.</p>
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08]">
                      <th className="text-left py-3 pr-4 text-slate-400 font-medium">Quarter</th>
                      <th className="text-right py-3 px-4 text-slate-400 font-medium">Total Openings</th>
                      <th className="text-right py-3 px-4 text-slate-400 font-medium">Avg Salary</th>
                      <th className="text-right py-3 pl-4 text-slate-400 font-medium">YoY Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.workforceTrends.map((trend, i) => {
                      const isLatest = i === data.workforceTrends.length - 1;
                      return (
                        <tr
                          key={trend.period}
                          className={`border-b border-white/[0.04] ${
                            isLatest ? 'bg-emerald-500/[0.04]' : ''
                          }`}
                        >
                          <td className="py-3 pr-4">
                            <span className={`font-medium ${isLatest ? 'text-emerald-400' : 'text-white/80'}`}>
                              {trend.period}
                            </span>
                            {isLatest && (
                              <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                                Latest
                              </span>
                            )}
                          </td>
                          <td className="text-right py-3 px-4 text-white/70 font-semibold">
                            {trend.totalOpenings.toLocaleString()}
                          </td>
                          <td className="text-right py-3 px-4 text-white/70">
                            {trend.avgSalary ? fmt(trend.avgSalary) : '\u2014'}
                          </td>
                          <td className="text-right py-3 pl-4">
                            {trend.yoyGrowth != null ? (
                              <span
                                className={`font-semibold ${
                                  trend.yoyGrowth > 0
                                    ? 'text-emerald-400'
                                    : trend.yoyGrowth < 0
                                    ? 'text-red-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {trend.yoyGrowth > 0 ? '+' : ''}
                                {trend.yoyGrowth.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-slate-600">&mdash;</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Top hiring companies from trend data */}
            {data.topHiringCompanies.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/[0.06]">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Top Hiring Companies</h3>
                <div className="flex flex-wrap gap-2">
                  {data.topHiringCompanies.map((company, i) => (
                    <span
                      key={company}
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
                        i < 3
                          ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                          : 'bg-white/[0.06] text-white/60'
                      }`}
                    >
                      {i < 3 && <span className="mr-1.5 text-yellow-500">&#9733;</span>}
                      {company}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* ═══════════════════════════════════════ */}
        {/* 6. CAREER PATH GUIDE                    */}
        {/* ═══════════════════════════════════════ */}
        <ScrollReveal>
          <div className="card p-5 mb-8">
            <h2 className="text-xl font-bold text-slate-100 mb-1">Career Path Guide</h2>
            <p className="text-sm text-slate-500 mb-5">
              Typical salary progression across all space industry categories, based on actual posting data
            </p>

            {careerPathData.length === 0 ? (
              <p className="text-slate-500 text-sm">Not enough data to generate career path.</p>
            ) : (
              <div className="relative">
                {/* Progress line */}
                <div className="absolute top-[28px] left-0 right-0 h-0.5 bg-white/[0.08] hidden lg:block" />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                  {careerPathData.map((step, i) => {
                    const isFirst = i === 0;
                    const isLast = i === careerPathData.length - 1;
                    return (
                      <div key={step.level} className="relative text-center">
                        {/* Node */}
                        <div
                          className={`relative z-10 w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-xs font-bold ${
                            isLast
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                              : isFirst
                              ? 'bg-blue-500/30 text-blue-400 border border-blue-500/40'
                              : 'bg-white/10 text-white/70 border border-white/[0.12]'
                          }`}
                        >
                          {i + 1}
                        </div>
                        <p className={`text-xs font-semibold mb-1 ${
                          isLast ? 'text-emerald-400' : 'text-white/80'
                        }`}>
                          {SENIORITY_LABELS[step.level]}
                        </p>
                        <p className="text-sm font-bold text-white/90">{fmt(step.avgMin)}</p>
                        <p className="text-[10px] text-slate-500">to {fmt(step.avgMax)}</p>
                        {i < careerPathData.length - 1 && (
                          <span className="hidden lg:block absolute top-[12px] -right-2 text-white/20 text-lg">
                            &rarr;
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary */}
                {careerPathData.length >= 2 && (
                  <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row gap-4 sm:gap-8 text-center sm:text-left">
                    <div>
                      <p className="text-xs text-slate-500">Entry-Level Average</p>
                      <p className="text-lg font-bold text-blue-400">{fmt(careerPathData[0].avgMin)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Top-Level Average</p>
                      <p className="text-lg font-bold text-emerald-400">
                        {fmt(careerPathData[careerPathData.length - 1].avgMax)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Growth Potential</p>
                      <p className="text-lg font-bold text-yellow-400">
                        {(
                          ((careerPathData[careerPathData.length - 1].avgMax - careerPathData[0].avgMin) /
                            careerPathData[0].avgMin) *
                          100
                        ).toFixed(0)}
                        %
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* CTA / Related Links */}
        <ScrollReveal>
          <div className="card p-5 mb-8 bg-gradient-to-r from-emerald-500/[0.06] to-blue-500/[0.06] border-emerald-500/20">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Ready to explore opportunities?</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Browse open roles or dive deeper into salary benchmarks.
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/space-talent"
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors min-h-[44px] flex items-center"
                >
                  Browse Jobs
                </Link>
                <Link
                  href="/salary-benchmarks"
                  className="px-4 py-2 bg-white/[0.08] text-white/80 rounded-lg text-sm font-medium hover:bg-white/[0.12] transition-colors min-h-[44px] flex items-center"
                >
                  Salary Details
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Related Modules */}
        <RelatedModules modules={PAGE_RELATIONS['/career-intelligence'] || []} />
      </div>
    </div>
  );
}
