'use client';

import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  SALARY_ROLES,
  SALARY_CATEGORIES,
  COMPANY_COMPENSATIONS,
  SALARY_FAQS,
  type SalaryCategory,
  type SalaryRole,
  type LocationRegion,
  type DemandLevel,
  filterRoles,
} from '@/lib/salary-data';

// Dynamically import recharts (no SSR)
const BarChart = dynamic(() => import('recharts').then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then((m) => m.ResponsiveContainer), { ssr: false });
const Legend = dynamic(() => import('recharts').then((m) => m.Legend), { ssr: false });

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function formatSalary(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

const CATEGORY_COLORS: Record<SalaryCategory, { text: string; bg: string; border: string; bar: string }> = {
  engineering: { text: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', bar: '#60a5fa' },
  'mission-operations': { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', bar: '#4ade80' },
  business: { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', bar: '#facc15' },
  science: { text: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30', bar: '#c084fc' },
  executive: { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', bar: '#f87171' },
  manufacturing: { text: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', bar: '#fb923c' },
};

const DEMAND_BADGES: Record<DemandLevel, { label: string; classes: string }> = {
  high: { label: 'High Demand', classes: 'bg-green-500/20 text-green-400 border-green-500/30' },
  medium: { label: 'Moderate', classes: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  low: { label: 'Niche', classes: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

// ────────────────────────────────────────────────────────────────
// Role Card
// ────────────────────────────────────────────────────────────────

function RoleCard({ role, experienceLevel }: { role: SalaryRole; experienceLevel: 'junior' | 'mid' | 'senior' | 'all' }) {
  const [expanded, setExpanded] = useState(false);
  const colors = CATEGORY_COLORS[role.category];
  const demand = DEMAND_BADGES[role.demandLevel];

  const displayRange = experienceLevel === 'all'
    ? role.salaryRange
    : {
        min: role.experienceLevels[experienceLevel].min,
        max: role.experienceLevels[experienceLevel].max,
        median: Math.round((role.experienceLevels[experienceLevel].min + role.experienceLevels[experienceLevel].max) / 2),
        p25: role.salaryRange.p25,
        p75: role.salaryRange.p75,
      };

  const maxScale = 600000;
  const minPct = (displayRange.min / maxScale) * 100;
  const maxPct = (displayRange.max / maxScale) * 100;
  const medianPct = (displayRange.median / maxScale) * 100;

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/70 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-base">{role.title}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded border ${colors.bg} ${colors.text} ${colors.border}`}>
              {SALARY_CATEGORIES.find((c) => c.id === role.category)?.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded border ${demand.classes}`}>
              {demand.label}
            </span>
            <span className="text-xs text-slate-500">{role.growthRate}</span>
          </div>
        </div>
        <div className="text-right ml-3 flex-shrink-0">
          <div className="text-lg font-bold text-cyan-400">{formatSalary(displayRange.median)}</div>
          <div className="text-xs text-slate-500">median</div>
        </div>
      </div>

      <p className="text-slate-400 text-sm mb-3 line-clamp-2">{role.description}</p>

      {/* Salary bar */}
      <div className="relative h-3 bg-slate-700/50 rounded-full overflow-hidden mb-2">
        <div
          className="absolute h-full rounded-full opacity-40"
          style={{
            left: `${minPct}%`,
            width: `${Math.max(maxPct - minPct, 1)}%`,
            backgroundColor: colors.bar,
          }}
        />
        <div
          className="absolute h-full w-0.5 rounded-full"
          style={{ left: `${medianPct}%`, backgroundColor: colors.bar }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-500 mb-3">
        <span>{formatSalary(displayRange.min)}</span>
        <span>{formatSalary(displayRange.max)}</span>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {role.skills.slice(0, expanded ? undefined : 3).map((skill) => (
          <span key={skill} className="text-[10px] px-2 py-0.5 rounded bg-slate-700/50 text-slate-400">
            {skill}
          </span>
        ))}
        {!expanded && role.skills.length > 3 && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700/30 text-slate-500">
            +{role.skills.length - 3}
          </span>
        )}
      </div>

      {/* Expand/Collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        {expanded ? 'Show less' : 'Show details'}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-3">
          {/* Experience Level Breakdown */}
          <div>
            <h4 className="text-xs font-medium text-slate-400 mb-2">Salary by Experience</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-700/30 rounded-lg p-2 text-center">
                <div className="text-[10px] text-slate-500 mb-1">Junior (0-3 yr)</div>
                <div className="text-sm font-medium text-slate-300">
                  {formatSalary(role.experienceLevels.junior.min)} - {formatSalary(role.experienceLevels.junior.max)}
                </div>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-2 text-center">
                <div className="text-[10px] text-slate-500 mb-1">Mid (3-7 yr)</div>
                <div className="text-sm font-medium text-slate-300">
                  {formatSalary(role.experienceLevels.mid.min)} - {formatSalary(role.experienceLevels.mid.max)}
                </div>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-2 text-center">
                <div className="text-[10px] text-slate-500 mb-1">Senior (7+ yr)</div>
                <div className="text-sm font-medium text-slate-300">
                  {formatSalary(role.experienceLevels.senior.min)} - {formatSalary(role.experienceLevels.senior.max)}
                </div>
              </div>
            </div>
          </div>

          {/* Top Companies */}
          <div>
            <h4 className="text-xs font-medium text-slate-400 mb-2">Top Paying Companies</h4>
            <div className="flex flex-wrap gap-1.5">
              {role.topCompanies.map((company) => (
                <span key={company} className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300">
                  {company}
                </span>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div>
            <h4 className="text-xs font-medium text-slate-400 mb-2">Available In</h4>
            <div className="flex gap-2">
              {role.locations.map((loc) => (
                <span key={loc} className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-400">
                  {loc === 'US' ? 'United States' : loc === 'EU' ? 'Europe' : 'Remote'}
                </span>
              ))}
            </div>
          </div>

          {/* All skills */}
          <div>
            <h4 className="text-xs font-medium text-slate-400 mb-2">Key Skills</h4>
            <div className="flex flex-wrap gap-1.5">
              {role.skills.map((skill) => (
                <span key={skill} className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-400">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Company Comparison Card
// ────────────────────────────────────────────────────────────────

function CompanyCard({ comp }: { comp: typeof COMPANY_COMPENSATIONS[0] }) {
  const typeColors = {
    'new-space': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    'traditional-defense': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    government: 'text-green-400 bg-green-500/10 border-green-500/30',
    startup: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  };
  const typeLabels = {
    'new-space': 'New Space',
    'traditional-defense': 'Traditional Defense',
    government: 'Government',
    startup: 'Startup',
  };

  const multiplierLabel =
    comp.baseSalaryMultiplier >= 1
      ? `+${((comp.baseSalaryMultiplier - 1) * 100).toFixed(0)}% above market`
      : `${((1 - comp.baseSalaryMultiplier) * 100).toFixed(0)}% below market`;
  const multiplierColor = comp.baseSalaryMultiplier >= 1 ? 'text-green-400' : 'text-yellow-400';

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/70 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <Link
            href={`/company-profiles/${comp.slug}`}
            className="font-semibold text-white text-base hover:text-cyan-400 transition-colors"
          >
            {comp.company}
          </Link>
          <div className="mt-1">
            <span className={`text-xs px-2 py-0.5 rounded border ${typeColors[comp.type]}`}>
              {typeLabels[comp.type]}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-bold ${multiplierColor}`}>{multiplierLabel}</div>
          <div className="text-xs text-slate-500">base salary</div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="text-slate-500 text-xs font-medium">Equity:</span>
          <p className="text-slate-400 text-xs mt-0.5">{comp.equityNote}</p>
        </div>
        <div>
          <span className="text-slate-500 text-xs font-medium">Benefits:</span>
          <p className="text-slate-400 text-xs mt-0.5">{comp.benefitsNote}</p>
        </div>
        <div>
          <span className="text-slate-500 text-xs font-medium">Culture:</span>
          <p className="text-slate-400 text-xs mt-0.5">{comp.culture}</p>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Main Content (inside Suspense)
// ────────────────────────────────────────────────────────────────

function SalaryBenchmarksContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── URL state ──
  const initialCategory = (searchParams.get('category') as SalaryCategory | '') || '';
  const initialExperience = (searchParams.get('experience') as 'junior' | 'mid' | 'senior' | 'all') || 'all';
  const initialLocation = (searchParams.get('location') as LocationRegion | '') || '';
  const initialSearch = searchParams.get('search') || '';
  const initialView = (searchParams.get('view') as 'roles' | 'chart' | 'companies') || 'roles';

  const [activeCategory, setActiveCategory] = useState<SalaryCategory | ''>(initialCategory);
  const [experienceLevel, setExperienceLevel] = useState<'junior' | 'mid' | 'senior' | 'all'>(initialExperience);
  const [locationFilter, setLocationFilter] = useState<LocationRegion | ''>(initialLocation);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [activeView, setActiveView] = useState<'roles' | 'chart' | 'companies'>(initialView);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '' || value === 'all' || (key === 'view' && value === 'roles')) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // ── Filtered roles ──
  const filteredRoles = useMemo(() => {
    return filterRoles({
      category: activeCategory || undefined,
      location: locationFilter || undefined,
      search: searchQuery || undefined,
    });
  }, [activeCategory, locationFilter, searchQuery]);

  // ── Chart data ──
  const chartData = useMemo(() => {
    return SALARY_CATEGORIES.map((cat) => {
      const roles = SALARY_ROLES.filter((r) => r.category === cat.id);
      const avgMedian = roles.length > 0
        ? Math.round(roles.reduce((sum, r) => sum + r.salaryRange.median, 0) / roles.length)
        : 0;
      const avgMin = roles.length > 0
        ? Math.round(roles.reduce((sum, r) => sum + r.salaryRange.min, 0) / roles.length)
        : 0;
      const avgMax = roles.length > 0
        ? Math.round(roles.reduce((sum, r) => sum + r.salaryRange.max, 0) / roles.length)
        : 0;
      return {
        name: cat.label,
        median: avgMedian,
        min: avgMin,
        max: avgMax,
        roles: roles.length,
      };
    });
  }, []);

  // ── Company chart data ──
  const companyChartData = useMemo(() => {
    return COMPANY_COMPENSATIONS.map((c) => ({
      name: c.company.length > 15 ? c.company.slice(0, 14) + '...' : c.company,
      fullName: c.company,
      multiplier: Math.round(c.baseSalaryMultiplier * 100),
    }));
  }, []);

  // ── Overview stats ──
  const overviewStats = useMemo(() => {
    const allMedians = SALARY_ROLES.map((r) => r.salaryRange.median);
    const avgMedian = Math.round(allMedians.reduce((a, b) => a + b, 0) / allMedians.length);
    const highDemand = SALARY_ROLES.filter((r) => r.demandLevel === 'high').length;
    const avgGrowthRoles = SALARY_ROLES.filter((r) => {
      const match = r.growthRate.match(/\+(\d+)/);
      return match && parseInt(match[1]) >= 10;
    }).length;
    return {
      totalRoles: SALARY_ROLES.length,
      avgMedian,
      highDemand,
      fastGrowing: avgGrowthRoles,
      techPremium: 22, // % above general tech average
    };
  }, []);

  return (
    <>
      {/* FAQPage JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: SALARY_FAQS.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
              },
            })),
          }).replace(/</g, '\\u003c'),
        }}
      />

      {/* ──── OVERVIEW STATS ──── */}
      <ScrollReveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-white">{overviewStats.totalRoles}</div>
            <div className="text-slate-400 text-xs mt-1">Roles Tracked</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-cyan-400">{formatSalary(overviewStats.avgMedian)}</div>
            <div className="text-slate-400 text-xs mt-1">Average Median Salary</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-green-400">{overviewStats.highDemand}</div>
            <div className="text-slate-400 text-xs mt-1">High-Demand Roles</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-purple-400">+{overviewStats.techPremium}%</div>
            <div className="text-slate-400 text-xs mt-1">vs. General Tech</div>
          </div>
        </div>
      </ScrollReveal>

      {/* Intro */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl p-5 mb-8">
        <p className="text-slate-300 text-sm leading-relaxed">
          Space industry professionals earn a <strong className="text-cyan-400">{overviewStats.techPremium}% premium</strong> over
          general technology roles, driven by specialized skills in propulsion, avionics, orbital mechanics, and RF engineering.
          Salaries vary significantly by employer type: traditional defense contractors like Lockheed Martin and Northrop Grumman
          offer higher base pay with clearance bonuses, while new-space companies like SpaceX trade lower base for equity upside.
          Data aggregated from Glassdoor, Levels.fyi, BLS, and industry surveys.
        </p>
      </div>

      {/* ──── VIEW TABS ──── */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {([
          { id: 'roles' as const, label: 'Browse Roles', count: filteredRoles.length },
          { id: 'chart' as const, label: 'Salary Comparison', count: null },
          { id: 'companies' as const, label: 'Company Comparison', count: COMPANY_COMPENSATIONS.length },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveView(tab.id);
              updateUrl({ view: tab.id });
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeView === tab.id
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeView === tab.id ? 'bg-white/20' : 'bg-slate-700/50'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* BROWSE ROLES VIEW                                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeView === 'roles' && (
        <div>
          {/* Filters */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  aria-label="Search roles by title, skill, or description"
                  placeholder="Search roles by title, skill, or description..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    updateUrl({ search: e.target.value || null });
                  }}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              <select
                aria-label="Filter by experience level"
                value={experienceLevel}
                onChange={(e) => {
                  const val = e.target.value as typeof experienceLevel;
                  setExperienceLevel(val);
                  updateUrl({ experience: val === 'all' ? null : val });
                }}
                className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Experience Levels</option>
                <option value="junior">Junior (0-3 years)</option>
                <option value="mid">Mid-Level (3-7 years)</option>
                <option value="senior">Senior (7+ years)</option>
              </select>
              <select
                aria-label="Filter by location"
                value={locationFilter}
                onChange={(e) => {
                  const val = e.target.value as LocationRegion | '';
                  setLocationFilter(val);
                  updateUrl({ location: val || null });
                }}
                className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Locations</option>
                <option value="US">United States</option>
                <option value="EU">Europe</option>
                <option value="Remote">Remote</option>
              </select>
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setActiveCategory('');
                  updateUrl({ category: null });
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeCategory === ''
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-700/50 text-slate-400 hover:text-white'
                }`}
              >
                All ({SALARY_ROLES.length})
              </button>
              {SALARY_CATEGORIES.map((cat) => {
                const count = SALARY_ROLES.filter((r) => r.category === cat.id).length;
                const colors = CATEGORY_COLORS[cat.id];
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      updateUrl({ category: cat.id });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeCategory === cat.id
                        ? `${colors.bg} ${colors.text} border ${colors.border}`
                        : 'bg-slate-700/50 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category description */}
          {activeCategory && (
            <div className="mb-4">
              <p className="text-slate-400 text-sm">
                {SALARY_CATEGORIES.find((c) => c.id === activeCategory)?.description}
              </p>
            </div>
          )}

          {/* Role cards */}
          {filteredRoles.length === 0 ? (
            <div className="text-center py-16">
              <h3 className="text-lg font-semibold text-white mb-2">No roles found</h3>
              <p className="text-slate-400 text-sm mb-4">Try adjusting your filters or search terms.</p>
              <button
                onClick={() => {
                  setActiveCategory('');
                  setLocationFilter('');
                  setSearchQuery('');
                  setExperienceLevel('all');
                  updateUrl({ category: null, location: null, search: null, experience: null });
                }}
                className="text-cyan-400 hover:text-cyan-300 text-sm"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredRoles.map((role) => (
                <StaggerItem key={role.id}>
                  <RoleCard role={role} experienceLevel={experienceLevel} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SALARY COMPARISON CHART VIEW                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeView === 'chart' && (
        <div className="space-y-8">
          {/* Category Median Comparison */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-white font-semibold text-lg mb-1">Median Salary by Category</h3>
            <p className="text-slate-400 text-sm mb-6">Average median salary across all roles in each category</p>
            <div className="w-full" style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickFormatter={(v: unknown) => `$${(Number(v) / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                    }}
                    formatter={(value: unknown, name: unknown) => [
                      `$${(Number(value) / 1000).toFixed(0)}K`,
                      String(name).charAt(0).toUpperCase() + String(name).slice(1),
                    ]}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Bar dataKey="min" name="Min" fill="#475569" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="median" name="Median" fill="#22d3ee" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="max" name="Max" fill="#6366f1" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Company Base Salary Multiplier */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-white font-semibold text-lg mb-1">Company Base Salary vs. Market</h3>
            <p className="text-slate-400 text-sm mb-6">
              How each company&apos;s base salary compares to the industry median (100% = market rate)
            </p>
            <div className="w-full" style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={companyChartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    type="number"
                    domain={[80, 115]}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickFormatter={(v: unknown) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    width={95}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                    }}
                    formatter={(value: unknown) => [`${value}% of market`, 'Base Salary']}
                    labelFormatter={(label: unknown) => {
                      const found = companyChartData.find((c) => c.name === String(label));
                      return found?.fullName || String(label);
                    }}
                  />
                  <Bar
                    dataKey="multiplier"
                    fill="#22d3ee"
                    radius={[0, 4, 4, 0]}
                    label={{ fill: '#f1f5f9', fontSize: 11, position: 'right', formatter: (v: unknown) => `${v}%` }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
              <p className="text-slate-400 text-xs">
                Note: Base salary is only one component of total compensation. Companies with lower base salaries
                (like SpaceX) often compensate with significant equity grants. Government positions (NASA/JPL) offer
                lower base but exceptional benefits including pensions and job security.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* COMPANY COMPARISON VIEW                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeView === 'companies' && (
        <div>
          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-5 mb-6">
            <p className="text-slate-300 text-sm leading-relaxed">
              Compensation in the space industry varies dramatically by employer type.{' '}
              <strong className="text-blue-400">Traditional defense contractors</strong> offer the highest base salaries with
              clearance bonuses and stability, while <strong className="text-cyan-400">new-space companies</strong> trade
              lower base for equity upside. <strong className="text-green-400">Government positions</strong> offer the best
              benefits and job security at lower cash compensation.
            </p>
          </div>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {COMPANY_COMPENSATIONS.map((comp) => (
              <StaggerItem key={comp.slug}>
                <CompanyCard comp={comp} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FAQ SECTION                                                */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="mt-12 pt-8 border-t border-slate-700/50">
        <h2 className="text-xl font-bold text-white mb-6">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {SALARY_FAQS.map((faq, index) => (
            <div
              key={index}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setFaqOpen(faqOpen === index ? null : index)}
                className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
              >
                <h3 className="font-medium text-white text-sm pr-4">{faq.question}</h3>
                <svg
                  className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${
                    faqOpen === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {faqOpen === index && (
                <div className="px-5 pb-4">
                  <p className="text-slate-400 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ──── RELATED RESOURCES ──── */}
      <div className="mt-8 pt-8 border-t border-slate-700/50">
        <h3 className="text-slate-400 text-sm font-medium mb-4">Related Resources</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/space-talent"
            className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white hover:border-cyan-500/50 transition-all"
          >
            Space Talent Hub
          </Link>
          <Link
            href="/space-talent?tab=workforce"
            className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white hover:border-cyan-500/50 transition-all"
          >
            Workforce Analytics
          </Link>
          <Link
            href="/company-profiles"
            className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white hover:border-cyan-500/50 transition-all"
          >
            Company Profiles
          </Link>
          <Link
            href="/ecosystem-map"
            className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white hover:border-cyan-500/50 transition-all"
          >
            Ecosystem Map
          </Link>
          <Link
            href="/marketplace"
            className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white hover:border-cyan-500/50 transition-all"
          >
            Marketplace
          </Link>
        </div>
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// Page Component
// ────────────────────────────────────────────────────────────────

export default function SalaryBenchmarksPage() {
  return (
    <div className="min-h-screen bg-space-900 py-8">
      <BreadcrumbSchema
        items={[
          { name: 'Home', href: '/' },
          { name: 'Space Talent Hub', href: '/space-talent' },
          { name: 'Salary Benchmarks' },
        ]}
      />
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Space Industry Salary Benchmarks"
          subtitle="Comprehensive compensation data for 50+ roles across engineering, operations, science, business, and executive positions"
          icon="$"
          accentColor="cyan"
        />

        <Suspense
          fallback={
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          <SalaryBenchmarksContent />
        </Suspense>
      </div>
    </div>
  );
}
