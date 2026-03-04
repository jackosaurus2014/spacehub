'use client';

import { useState, useMemo } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import {
  OVERVIEW_STATS,
  SECTOR_DATA,
  TOP_EMPLOYERS,
  SKILLS_GAP_DATA,
  GEO_HUBS,
  DIVERSITY_METRICS,
  STEM_PIPELINE,
  SECTOR_FILTER_OPTIONS,
  LOCATION_FILTER_OPTIONS,
  SIZE_FILTER_OPTIONS,
  SORT_OPTIONS,
  type SkillCategory,
  type EmployerTier,
  type TopEmployer,
} from './data';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return n.toLocaleString();
}

function getTierBadge(tier: EmployerTier) {
  const styles: Record<EmployerTier, { bg: string; text: string; label: string }> = {
    prime: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Prime' },
    major: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'Major' },
    growth: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Growth' },
  };
  const s = styles[tier];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function getTrendIcon(trend: 'up' | 'stable' | 'down' | 'flat') {
  if (trend === 'up') return <span className="text-emerald-400" title="Growing">&#9650;</span>;
  if (trend === 'down') return <span className="text-red-400" title="Declining">&#9660;</span>;
  return <span className="text-slate-400" title="Stable">&#9644;</span>;
}

function getSkillCategoryInfo(cat: SkillCategory) {
  const map: Record<SkillCategory, { label: string; color: string; bg: string }> = {
    most_in_demand: { label: 'Most In-Demand', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    hardest_to_fill: { label: 'Hardest to Fill', color: 'text-red-400', bg: 'bg-red-500/20' },
    emerging: { label: 'Emerging Need', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  };
  return map[cat];
}

function matchesSize(employer: TopEmployer, sizeFilter: string): boolean {
  if (!sizeFilter) return true;
  if (sizeFilter === 'large') return employer.headcount >= 10000;
  if (sizeFilter === 'medium') return employer.headcount >= 1000 && employer.headcount < 10000;
  if (sizeFilter === 'small') return employer.headcount < 1000;
  return true;
}

// ────────────────────────────────────────
// Active tab type
// ────────────────────────────────────────

type ActiveSection = 'overview' | 'employers' | 'skills' | 'geography' | 'diversity';

// ────────────────────────────────────────
// Page Component
// ────────────────────────────────────────

export default function WorkforceAnalyticsPage() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [sectorFilter, setSectorFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [sortBy, setSortBy] = useState('headcount_desc');
  const [skillCategoryFilter, setSkillCategoryFilter] = useState<SkillCategory | ''>('');

  // ── Filtered & sorted employers ──
  const filteredEmployers = useMemo(() => {
    let list = [...TOP_EMPLOYERS];

    if (sizeFilter) {
      list = list.filter((e) => matchesSize(e, sizeFilter));
    }

    switch (sortBy) {
      case 'headcount_asc':
        list.sort((a, b) => a.headcount - b.headcount);
        break;
      case 'company_asc':
        list.sort((a, b) => a.company.localeCompare(b.company));
        break;
      case 'company_desc':
        list.sort((a, b) => b.company.localeCompare(a.company));
        break;
      default:
        list.sort((a, b) => b.headcount - a.headcount);
    }

    return list;
  }, [sizeFilter, sortBy]);

  // ── Filtered sectors ──
  const filteredSectors = useMemo(() => {
    if (!sectorFilter) return SECTOR_DATA;
    return SECTOR_DATA.filter((s) => s.sector === sectorFilter);
  }, [sectorFilter]);

  // ── Filtered geo hubs ──
  const filteredGeoHubs = useMemo(() => {
    if (!locationFilter) return GEO_HUBS;
    return GEO_HUBS.filter((g) => g.state === locationFilter);
  }, [locationFilter]);

  // ── Filtered skills ──
  const filteredSkills = useMemo(() => {
    if (!skillCategoryFilter) return SKILLS_GAP_DATA;
    return SKILLS_GAP_DATA.filter((s) => s.category === skillCategoryFilter);
  }, [skillCategoryFilter]);

  const maxSectorEmployees = Math.max(...SECTOR_DATA.map((s) => s.employees));

  const sections: { id: ActiveSection; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'employers', label: 'Top Employers' },
    { id: 'skills', label: 'Skills Gap' },
    { id: 'geography', label: 'Geography' },
    { id: 'diversity', label: 'Diversity' },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumbs */}

        {/* Header */}
        <AnimatedPageHeader
          title="Space Industry Workforce Analytics"
          subtitle="Comprehensive employment data, employer rankings, skills gap analysis, geographic distribution, and diversity metrics across the global space sector."
          accentColor="cyan"
        />

        {/* Section Navigation */}
        <ScrollReveal>
          <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-700/50 pb-4">
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                  activeSection === sec.id
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 hover:text-white'
                }`}
              >
                {sec.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* ═══════════════════════════════════════ */}
        {/* OVERVIEW SECTION                        */}
        {/* ═══════════════════════════════════════ */}
        {activeSection === 'overview' && (
          <>
            {/* Overview Stats */}
            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {OVERVIEW_STATS.map((stat) => (
                <StaggerItem key={stat.label}>
                  <div className="card p-6 text-center">
                    <p className="text-sm text-slate-400 mb-1">{stat.label}</p>
                    <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-slate-500 mt-2">{stat.detail}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            {/* Employment by Sector */}
            <ScrollReveal>
              <div className="card p-6 mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <h2 className="text-xl font-bold text-slate-100">Employment by Sector</h2>
                  <select
                    value={sectorFilter}
                    onChange={(e) => setSectorFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 min-h-[44px]"
                    aria-label="Filter by sector"
                  >
                    {SECTOR_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  {filteredSectors.map((sector) => {
                    const widthPct = (sector.employees / maxSectorEmployees) * 100;
                    return (
                      <div key={sector.sector} className="group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-200">{sector.sector}</span>
                          <span className="text-sm font-semibold text-slate-300">
                            {sector.employees.toLocaleString()}
                          </span>
                        </div>
                        <div className="relative h-7 bg-slate-800/60 rounded-lg overflow-hidden">
                          <div
                            className={`h-full ${sector.color} rounded-lg transition-all duration-700 ease-out opacity-80 group-hover:opacity-100`}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{sector.description}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center justify-between">
                  <span className="text-sm text-slate-400">Total tracked workforce</span>
                  <span className="text-lg font-bold text-cyan-400">
                    {filteredSectors.reduce((sum, s) => sum + s.employees, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </ScrollReveal>

            {/* Quick Geography + Diversity preview cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ScrollReveal>
                <div className="card p-6 h-full">
                  <h2 className="text-xl font-bold text-slate-100 mb-4">Top Employment Hubs</h2>
                  <div className="space-y-3">
                    {GEO_HUBS.slice(0, 5).map((hub) => (
                      <div key={hub.location} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-200">{hub.location}, {hub.state}</p>
                          <p className="text-xs text-slate-500">{hub.specializations[0]}</p>
                        </div>
                        <span className="text-sm font-semibold text-cyan-400">{hub.employees.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveSection('geography')}
                    className="mt-4 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    View all hubs &rarr;
                  </button>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.1}>
                <div className="card p-6 h-full">
                  <h2 className="text-xl font-bold text-slate-100 mb-4">Diversity Snapshot</h2>
                  <div className="space-y-3">
                    {DIVERSITY_METRICS.slice(0, 4).map((metric) => (
                      <div key={metric.category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getTrendIcon(metric.trend)}
                          <span className="text-sm text-slate-200">{metric.category}</span>
                        </div>
                        <span className={`text-sm font-semibold ${metric.color}`}>{metric.percentage}%</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveSection('diversity')}
                    className="mt-4 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Full diversity report &rarr;
                  </button>
                </div>
              </ScrollReveal>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* TOP EMPLOYERS SECTION                   */}
        {/* ═══════════════════════════════════════ */}
        {activeSection === 'employers' && (
          <ScrollReveal>
            <div className="card p-6 mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold text-slate-100">
                  Top 20 Space Employers
                  <span className="text-sm font-normal text-slate-400 ml-2">by space workforce size</span>
                </h2>
                <div className="flex flex-wrap gap-3">
                  <select
                    value={sizeFilter}
                    onChange={(e) => setSizeFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 min-h-[44px]"
                    aria-label="Filter by company size"
                  >
                    {SIZE_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 min-h-[44px]"
                    aria-label="Sort employers"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-xs uppercase tracking-wider text-slate-400">
                      <th className="pb-3 pr-4">#</th>
                      <th className="pb-3 pr-4">Company</th>
                      <th className="pb-3 pr-4">Space Workforce</th>
                      <th className="pb-3 pr-4">Tier</th>
                      <th className="pb-3 pr-4">HQ</th>
                      <th className="pb-3 pr-4">Segment</th>
                      <th className="pb-3">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployers.map((emp, idx) => (
                      <tr
                        key={emp.company}
                        className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 pr-4 text-slate-500 text-sm">{idx + 1}</td>
                        <td className="py-3 pr-4">
                          <span className="text-sm font-medium text-slate-100">{emp.company}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-sm font-semibold text-cyan-400">{emp.spaceWorkforce}</span>
                        </td>
                        <td className="py-3 pr-4">{getTierBadge(emp.tier)}</td>
                        <td className="py-3 pr-4 text-sm text-slate-400">{emp.hq}</td>
                        <td className="py-3 pr-4 text-sm text-slate-400">{emp.segment}</td>
                        <td className="py-3">{getTrendIcon(emp.growthTrend)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {filteredEmployers.map((emp, idx) => (
                  <div key={emp.company} className="bg-slate-800/40 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-mono w-5">#{idx + 1}</span>
                        <span className="text-sm font-medium text-slate-100">{emp.company}</span>
                      </div>
                      {getTrendIcon(emp.growthTrend)}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold text-cyan-400">{emp.spaceWorkforce}</span>
                      {getTierBadge(emp.tier)}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span>{emp.hq}</span>
                      <span>{emp.segment}</span>

        <RelatedModules modules={PAGE_RELATIONS['workforce-analytics']} />
                    </div>
                  </div>
                ))}
              </div>

              {filteredEmployers.length === 0 && (
                <p className="text-center text-slate-400 py-8">No employers match the current filters.</p>
              )}

              <div className="mt-6 pt-4 border-t border-slate-700/50 text-xs text-slate-500">
                Workforce estimates based on publicly available data, SEC filings, and industry reports. Figures represent space-specific divisions, not total corporate headcount.
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* SKILLS GAP ANALYSIS SECTION             */}
        {/* ═══════════════════════════════════════ */}
        {activeSection === 'skills' && (
          <>
            <ScrollReveal>
              <div className="card p-6 mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <h2 className="text-xl font-bold text-slate-100">Skills Gap Analysis</h2>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSkillCategoryFilter('')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all min-h-[36px] ${
                        !skillCategoryFilter
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
                      }`}
                    >
                      All
                    </button>
                    {(['most_in_demand', 'hardest_to_fill', 'emerging'] as SkillCategory[]).map((cat) => {
                      const info = getSkillCategoryInfo(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => setSkillCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all min-h-[36px] ${
                            skillCategoryFilter === cat
                              ? `${info.bg} ${info.color} ring-1 ring-current`
                              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
                          }`}
                        >
                          {info.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <StaggerContainer className="space-y-3">
                  {filteredSkills.map((skill) => {
                    const catInfo = getSkillCategoryInfo(skill.category);
                    return (
                      <StaggerItem key={skill.skill}>
                        <div className="bg-slate-800/40 rounded-xl p-4 hover:bg-slate-800/60 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-slate-100">{skill.skill}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${catInfo.bg} ${catInfo.color}`}>
                                {catInfo.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                              <span>
                                <span className="text-slate-500">Open: </span>
                                <span className="font-semibold text-slate-200">{skill.openPositions.toLocaleString()}</span>
                              </span>
                              <span>
                                <span className="text-slate-500">Avg: </span>
                                <span className="font-semibold text-green-400">${(skill.avgSalary / 1000).toFixed(0)}K</span>
                              </span>
                              <span>
                                <span className="text-slate-500">Fill time: </span>
                                <span className="font-semibold text-orange-400">{skill.timeToFill}</span>
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500">{skill.notes}</p>
                        </div>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>

                {filteredSkills.length === 0 && (
                  <p className="text-center text-slate-400 py-8">No skills match the current filter.</p>
                )}
              </div>
            </ScrollReveal>

            {/* STEM Pipeline */}
            <ScrollReveal>
              <div className="card p-6">
                <h2 className="text-xl font-bold text-slate-100 mb-2">STEM Pipeline to Space</h2>
                <p className="text-sm text-slate-400 mb-6">
                  Annual US graduates vs. those entering the space workforce, with estimated demand gaps
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/50 text-xs uppercase tracking-wider text-slate-400">
                        <th className="pb-3 pr-4">Field</th>
                        <th className="pb-3 pr-4 text-right">Annual Grads</th>
                        <th className="pb-3 pr-4 text-right">Entering Space</th>
                        <th className="pb-3 pr-4 text-right">Demand Gap</th>
                        <th className="pb-3">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {STEM_PIPELINE.map((row) => (
                        <tr key={row.field} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 pr-4 font-medium text-slate-200">{row.field}</td>
                          <td className="py-3 pr-4 text-right text-slate-300">{row.annualGraduates.toLocaleString()}</td>
                          <td className="py-3 pr-4 text-right text-cyan-400">{row.enteringSpace.toLocaleString()}</td>
                          <td className="py-3 pr-4 text-right">
                            <span className="text-red-400">-{row.demandGap.toLocaleString()}</span>
                          </td>
                          <td className="py-3">{getTrendIcon(row.trend)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </ScrollReveal>
          </>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* GEOGRAPHIC DISTRIBUTION SECTION         */}
        {/* ═══════════════════════════════════════ */}
        {activeSection === 'geography' && (
          <ScrollReveal>
            <div className="card p-6 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold text-slate-100">
                  US Space Employment Hubs
                </h2>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 min-h-[44px]"
                  aria-label="Filter by location"
                >
                  {LOCATION_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredGeoHubs.map((hub) => (
                  <StaggerItem key={hub.location}>
                    <div className="bg-slate-800/40 rounded-xl p-5 hover:bg-slate-800/60 transition-colors h-full">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-base font-semibold text-slate-100">{hub.location}</h3>
                          <p className="text-xs text-slate-400">{hub.state}</p>
                        </div>
                        <span className="text-lg font-bold text-cyan-400">
                          {hub.employees.toLocaleString()}
                        </span>
                      </div>

                      <div className="mb-3">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Top Employers</p>
                        <div className="flex flex-wrap gap-1.5">
                          {hub.topEmployers.map((emp) => (
                            <span
                              key={emp}
                              className="inline-block px-2 py-0.5 bg-slate-700/50 rounded-full text-xs text-slate-300"
                            >
                              {emp}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Specializations</p>
                        <div className="flex flex-wrap gap-1.5">
                          {hub.specializations.map((spec) => (
                            <span
                              key={spec}
                              className="inline-block px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs text-cyan-300"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>

              {filteredGeoHubs.length === 0 && (
                <p className="text-center text-slate-400 py-8">No hubs match the selected location.</p>
              )}

              <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center justify-between">
                <span className="text-sm text-slate-400">Total across shown hubs</span>
                <span className="text-lg font-bold text-cyan-400">
                  {filteredGeoHubs.reduce((sum, h) => sum + h.employees, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* DIVERSITY METRICS SECTION               */}
        {/* ═══════════════════════════════════════ */}
        {activeSection === 'diversity' && (
          <>
            <ScrollReveal>
              <div className="card p-6 mb-8">
                <h2 className="text-xl font-bold text-slate-100 mb-2">Diversity & Inclusion Metrics</h2>
                <p className="text-sm text-slate-400 mb-6">
                  Workforce demographics and representation trends across the US space industry
                </p>

                <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {DIVERSITY_METRICS.map((metric) => (
                    <StaggerItem key={metric.category}>
                      <div className="bg-slate-800/40 rounded-xl p-5 hover:bg-slate-800/60 transition-colors h-full">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-slate-200">{metric.category}</span>
                          {getTrendIcon(metric.trend)}
                        </div>
                        <p className={`text-3xl font-bold ${metric.color} mb-2`}>
                          {metric.percentage}%
                        </p>
                        {/* Progress bar */}
                        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden mb-3">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700"
                            style={{ width: `${metric.percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500">{metric.detail}</p>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </ScrollReveal>

            {/* STEM Pipeline (also shown here) */}
            <ScrollReveal>
              <div className="card p-6">
                <h2 className="text-xl font-bold text-slate-100 mb-2">STEM Pipeline Trends</h2>
                <p className="text-sm text-slate-400 mb-6">
                  Tracking graduates entering the space workforce and identifying gaps in the talent supply chain
                </p>

                <div className="space-y-4">
                  {STEM_PIPELINE.map((row) => {
                    const conversionRate = ((row.enteringSpace / row.annualGraduates) * 100).toFixed(1);
                    return (
                      <div key={row.field} className="bg-slate-800/40 rounded-xl p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-100">{row.field}</span>
                            {getTrendIcon(row.trend)}
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-slate-400">
                              {row.annualGraduates.toLocaleString()} grads/yr
                            </span>
                            <span className="text-cyan-400 font-semibold">
                              {conversionRate}% to space
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-3 bg-slate-700/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700"
                              style={{ width: `${Math.min((row.enteringSpace / row.annualGraduates) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-red-400 font-semibold whitespace-nowrap">
                            Gap: {row.demandGap.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollReveal>
          </>
        )}

        {/* Footer note */}
        <ScrollReveal>
          <div className="mt-8 text-center text-xs text-slate-600">
            <p>
              Data compiled from Bureau of Labor Statistics, Space Foundation Workforce Reports, Payload Research,
              company filings, and industry surveys. Estimates are approximate and updated periodically.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
