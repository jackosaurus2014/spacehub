'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  SpaceTalent,
  Webinar,
  TALENT_EXPERTISE_AREAS,
  TALENT_AVAILABILITY_INFO,
  WEBINAR_TOPICS,
  TalentExpertiseArea,
  TalentAvailability,
  SpaceJobPosting,
  WorkforceTrend,
  JobCategory,
  SeniorityLevel,
  JOB_CATEGORIES,
  SENIORITY_LEVELS,
} from '@/types';
import TalentCard from '@/components/talent/TalentCard';
import WebinarCard from '@/components/webinars/WebinarCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';
import AdSlot from '@/components/ads/AdSlot';
import PullToRefresh from '@/components/ui/PullToRefresh';
import ItemListSchema from '@/components/seo/ItemListSchema';
import { useSwipeTabs } from '@/hooks/useSwipeTabs';
import { clientLogger } from '@/lib/client-logger';
import {
  CATEGORY_COLORS,
  SENIORITY_LABELS,
  JOB_EXPORT_COLUMNS,
  TREND_EXPORT_COLUMNS,
  SECTOR_EMPLOYMENT_DATA,
  SKILLS_DEMAND_DATA,
  GEO_DISTRIBUTION_US,
  GEO_DISTRIBUTION_INTL,
  ROLE_SALARY_DATA,
  EDUCATION_PIPELINE_DATA,
  TOP_EMPLOYERS_DATA,
  WORKFORCE_OVERVIEW_STATS,
  DIVERSITY_DATA,
  AGE_DISTRIBUTION_DATA,
  type SectorEmployment,
  type SkillDemand,
  type GeoDistribution,
  type RoleSalaryRange,
  type EducationPipelineStat,
  type TopEmployer,
  type WorkforceOverviewStat,
  type DiversityBreakdown,
  type AgeDistribution,
} from './data';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { extractApiError } from '@/lib/errors';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TopLevelTab = 'talent' | 'workforce';

interface ServiceProviderFormData {
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  pricing: string;
}

const INITIAL_FORM_DATA: ServiceProviderFormData = {
  businessName: '',
  contactName: '',
  phone: '',
  email: '',
  website: '',
  description: '',
  pricing: '',
};

interface TalentStats {
  totalExperts: number;
  featuredCount: number;
  availableCount: number;
  avgConsultingRate: number;
}

interface WebinarStats {
  totalWebinars: number;
  liveCount: number;
  upcomingCount: number;
  pastCount: number;
  recordingsAvailable: number;
}

interface SalaryBenchmarkEntry {
  category?: JobCategory;
  seniorityLevel?: SeniorityLevel;
  avgMin: number;
  avgMax: number;
  avgMedian: number;
  count: number;
}

interface WorkforceStats {
  totalOpenings: number;
  avgSalary: number;
  topCategory: string;
  topCompany: string;
  totalCompanies: number;
  growthRate: number;
}


// ────────────────────────────────────────
// Utility Functions
// ────────────────────────────────────────

function formatSalary(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}K`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function daysAgo(date: Date): string {
  const now = new Date();
  const posted = new Date(date);
  const diffMs = now.getTime() - posted.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 60) return '1 month ago';
  return `${Math.floor(diffDays / 30)} months ago`;
}

// ────────────────────────────────────────
// Job Posting Card
// ────────────────────────────────────────

function JobCard({ job }: { job: SpaceJobPosting }) {
  const cat = CATEGORY_COLORS[job.category as JobCategory];
  const catLabel = JOB_CATEGORIES.find((c) => c.value === job.category);
  const senLabel = SENIORITY_LABELS[job.seniorityLevel as SeniorityLevel] || job.seniorityLevel;

  const inner = (
    <div className="card p-5 hover:border-nebula-500/50 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-base group-hover:text-nebula-200 transition-colors">
            {job.title}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-slate-400 text-sm">{job.company}</p>
            <Link
              href={`/market-intel?search=${encodeURIComponent(job.company)}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
            >
              Market Intel
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {job.remoteOk && (
            <span className="text-xs bg-nebula-500/20 text-nebula-300 px-2 py-0.5 rounded">
              Remote
            </span>
          )}
          {job.clearanceRequired && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
              Clearance
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
        <span className="text-slate-400">{job.location}</span>
        <span className="text-slate-300">|</span>
        <span className={`px-2 py-0.5 rounded ${cat?.bg || 'bg-slate-700/50'} ${cat?.text || 'text-slate-500'}`}>
          {catLabel?.icon} {catLabel?.label || job.category}
        </span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-400">{senLabel}</span>
        {job.degreeRequired && (
          <>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400 capitalize">{job.degreeRequired}</span>
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-nebula-300">
            {formatSalary(job.salaryMin ?? 0)} - {formatSalary(job.salaryMax ?? 0)}
          </span>
          {job.yearsExperience !== null && job.yearsExperience !== undefined && (
            <span className="text-xs text-slate-400">
              {job.yearsExperience === 0 ? 'No exp required' : `${job.yearsExperience}+ years`}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">{daysAgo(job.postedDate)}</span>

        <RelatedModules modules={PAGE_RELATIONS['space-talent']} />
      </div>
    </div>
  );

  if (job.sourceUrl) {
    return (
      <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }

  return inner;
}

// ────────────────────────────────────────
// Trend Card
// ────────────────────────────────────────

function TrendCard({ trend }: { trend: WorkforceTrend }) {
  const yoyGrowth = trend.yoyGrowth ?? 0;
  const isPositive = yoyGrowth >= 0;
  const topSkills: string[] = (() => {
    try {
      const raw = trend.topSkills;
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') return JSON.parse(raw);
      return [];
    } catch {
      return [];
    }
  })();
  const topCompanies: string[] = (() => {
    try {
      const raw = trend.topCompanies;
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') return JSON.parse(raw);
      return [];
    } catch {
      return [];
    }
  })();

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white text-base">
          Q{trend.quarter} {trend.year}
        </h3>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded ${
            isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}
        >
          {isPositive ? '+' : ''}{yoyGrowth.toFixed(1)}% YoY
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span className="text-slate-400 text-xs block mb-1">Total Openings</span>
          <div className="text-white font-bold text-lg">{trend.totalOpenings.toLocaleString()}</div>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-1">Total Hires</span>
          <div className="text-white font-bold text-lg">{(trend.totalHires ?? 0).toLocaleString()}</div>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-1">Avg Salary</span>
          <div className="text-green-400 font-bold text-lg">{formatSalary(trend.avgSalary ?? 0)}</div>
        </div>
        <div>
          <span className="text-slate-400 text-xs block mb-1">Median Salary</span>
          <div className="text-nebula-300 font-bold text-lg">{formatSalary(trend.medianSalary ?? 0)}</div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="border-t border-slate-700/50 pt-3 mb-3">
        <span className="text-slate-400 text-xs block mb-2">Openings by Category</span>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <div className="text-sm text-blue-400 font-bold">{trend.engineeringOpenings.toLocaleString()}</div>
            <div className="text-xs text-slate-400">Eng</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-green-400 font-bold">{trend.operationsOpenings.toLocaleString()}</div>
            <div className="text-xs text-slate-400">Ops</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-yellow-400 font-bold">{trend.businessOpenings.toLocaleString()}</div>
            <div className="text-xs text-slate-400">Biz</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-purple-400 font-bold">{trend.researchOpenings.toLocaleString()}</div>
            <div className="text-xs text-slate-400">R&D</div>
          </div>
        </div>
      </div>

      {/* Top Skills */}
      {topSkills.length > 0 && (
        <div className="border-t border-slate-700/50 pt-3 mb-3">
          <span className="text-slate-400 text-xs block mb-2">Top Skills</span>
          <div className="flex flex-wrap gap-1.5">
            {topSkills.map((skill) => (
              <span key={skill} className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-500">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top Companies */}
      {topCompanies.length > 0 && (
        <div className="border-t border-slate-700/50 pt-3">
          <span className="text-slate-400 text-xs block mb-2">Top Hiring</span>
          <div className="flex flex-wrap gap-1.5">
            {topCompanies.map((company) => (
              <span key={company} className="text-xs px-2 py-0.5 rounded bg-nebula-500/10 text-nebula-300">
                {company}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Salary Benchmark Bar
// ────────────────────────────────────────

function BenchmarkBar({
  label,
  color,
  avgMin,
  avgMax,
  avgMedian,
  count,
  maxRange,
}: {
  label: string;
  color: string;
  avgMin: number;
  avgMax: number;
  avgMedian: number;
  count: number;
  maxRange: number;
}) {
  const minPct = (avgMin / maxRange) * 100;
  const medianPct = (avgMedian / maxRange) * 100;
  const maxPct = (avgMax / maxRange) * 100;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-medium ${color}`}>{label}</span>
        <span className="text-xs text-slate-400">{count} roles</span>
      </div>

      <div className="relative h-4 bg-slate-800/50 rounded-full overflow-hidden mb-2">
        <div
          className="absolute h-full bg-slate-700/50 rounded-full"
          style={{ left: `${minPct}%`, width: `${Math.max(maxPct - minPct, 1)}%` }}
        />
        <div
          className="absolute h-full w-1 bg-nebula-400 rounded-full"
          style={{ left: `${medianPct}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-slate-400">
        <span>{formatSalary(avgMin)}</span>
        <span className="text-nebula-300 font-medium">Median: {formatSalary(avgMedian)}</span>
        <span>{formatSalary(avgMax)}</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Sector Employment Section
// ────────────────────────────────────────

function SectorEmploymentSection() {
  const maxEmployees = Math.max(...SECTOR_EMPLOYMENT_DATA.map((s) => s.employees));
  const totalEmployees = SECTOR_EMPLOYMENT_DATA.reduce((sum, s) => sum + s.employees, 0);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-base">Industry Employment by Sector</h3>
        <span className="text-xs text-slate-400">{totalEmployees.toLocaleString()} total estimated workforce</span>
      </div>
      <div className="space-y-3">
        {SECTOR_EMPLOYMENT_DATA
          .sort((a, b) => b.employees - a.employees)
          .map((sector) => {
            const pct = (sector.employees / maxEmployees) * 100;
            return (
              <div key={sector.sector}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-300">{sector.sector}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white font-medium">{sector.employees.toLocaleString()}</span>
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        sector.growthRate >= 20
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : sector.growthRate >= 10
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-slate-700/50 text-slate-400'
                      }`}
                    >
                      +{sector.growthRate}%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${sector.color} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
        Source: Estimated from Bureau of Labor Statistics, SIA, and Bryce Tech Space Workforce reports. Growth rates YoY.
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Skills Demand Section
// ────────────────────────────────────────

function SkillsDemandSection() {
  const demandColors = {
    critical: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', label: 'Critical Shortage' },
    high: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', label: 'High Demand' },
    growing: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'Rapidly Growing' },
    steady: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30', label: 'Steady' },
  };

  const categories = Array.from(new Set(SKILLS_DEMAND_DATA.map((s) => s.category)));

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold text-base">Skills Demand Analysis</h3>
      </div>
      <p className="text-slate-400 text-xs mb-4">
        Most in-demand skills across the space workforce, ranked by urgency and open role count.
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-5">
        {Object.entries(demandColors).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${val.bg} border ${val.border}`} />
            <span className="text-xs text-slate-400">{val.label}</span>
          </div>
        ))}
      </div>

      {categories.map((cat) => (
        <div key={cat} className="mb-5 last:mb-0">
          <h4 className="text-sm font-medium text-slate-300 mb-3 uppercase tracking-wider">{cat}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SKILLS_DEMAND_DATA.filter((s) => s.category === cat)
              .sort((a, b) => b.openRoles - a.openRoles)
              .map((skill) => {
                const dc = demandColors[skill.demandLevel];
                return (
                  <div
                    key={skill.skill}
                    className={`p-3 rounded-lg border ${dc.border} ${dc.bg}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-white">{skill.skill}</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${dc.bg} ${dc.text} border ${dc.border}`}>
                        {dc.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block">Open Roles</span>
                        <span className="text-white font-bold">{skill.openRoles.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Avg Salary</span>
                        <span className="text-green-400 font-bold">{formatSalary(skill.avgSalary)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">YoY Growth</span>
                        <span className="text-emerald-400 font-bold">+{skill.yoyChange}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────
// Geographic Distribution Section
// ────────────────────────────────────────

function GeographicDistributionSection() {
  const [geoView, setGeoView] = useState<'us' | 'intl'>('us');
  const data = geoView === 'us' ? GEO_DISTRIBUTION_US : GEO_DISTRIBUTION_INTL;
  const maxJobs = Math.max(...data.map((d) => d.jobs));

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-base">Geographic Distribution of Space Jobs</h3>
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-0.5">
          <button
            onClick={() => setGeoView('us')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              geoView === 'us'
                ? 'bg-nebula-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            US States
          </button>
          <button
            onClick={() => setGeoView('intl')}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              geoView === 'intl'
                ? 'bg-nebula-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            International
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left text-slate-400 text-xs uppercase tracking-wider pb-2 pr-4">
                {geoView === 'us' ? 'State' : 'Country'}
              </th>
              <th className="text-right text-slate-400 text-xs uppercase tracking-wider pb-2 px-3">Jobs</th>
              <th className="text-right text-slate-400 text-xs uppercase tracking-wider pb-2 px-3">Companies</th>
              <th className="text-right text-slate-400 text-xs uppercase tracking-wider pb-2 px-3">Avg Salary</th>
              <th className="text-left text-slate-400 text-xs uppercase tracking-wider pb-2 pl-4 hidden lg:table-cell">Top Employers</th>
            </tr>
          </thead>
          <tbody>
            {data
              .sort((a, b) => b.jobs - a.jobs)
              .map((loc) => {
                const barPct = (loc.jobs / maxJobs) * 100;
                return (
                  <tr key={loc.location} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">{loc.location}</span>
                      </div>
                      <div className="mt-1 h-1 bg-slate-800/50 rounded-full overflow-hidden w-24">
                        <div className="h-full bg-nebula-500 rounded-full" style={{ width: `${barPct}%` }} />
                      </div>
                    </td>
                    <td className="text-right py-3 px-3 text-white font-medium">{loc.jobs.toLocaleString()}</td>
                    <td className="text-right py-3 px-3 text-slate-300">{loc.companies}</td>
                    <td className="text-right py-3 px-3 text-green-400 font-medium">{formatSalary(loc.avgSalary)}</td>
                    <td className="py-3 pl-4 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {loc.topEmployers.map((emp) => (
                          <span key={emp} className="text-xs px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">
                            {emp}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
        Salary data in USD. International salaries converted at current exchange rates.
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Salary by Role Category Section
// ────────────────────────────────────────

function SalaryByRoleSection() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold text-base">Salary Ranges by Role</h3>
      </div>
      <p className="text-slate-400 text-xs mb-4">
        Detailed compensation ranges across seniority levels for key space industry positions.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left text-slate-400 text-xs uppercase tracking-wider pb-2 pr-4">Role</th>
              <th className="text-center text-slate-400 text-xs uppercase tracking-wider pb-2 px-2">Entry Level</th>
              <th className="text-center text-slate-400 text-xs uppercase tracking-wider pb-2 px-2">Mid Level</th>
              <th className="text-center text-slate-400 text-xs uppercase tracking-wider pb-2 px-2">Senior</th>
              <th className="text-center text-slate-400 text-xs uppercase tracking-wider pb-2 px-2">Lead / Principal</th>
            </tr>
          </thead>
          <tbody>
            {ROLE_SALARY_DATA.map((role) => (
              <tr key={role.role} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="py-3 pr-4">
                  <div className="text-white font-medium">{role.role}</div>
                  <div className="text-xs text-slate-500">{role.category}</div>
                </td>
                <td className="text-center py-3 px-2">
                  <div className="text-slate-300 text-xs">
                    {formatSalary(role.entryMin)} - {formatSalary(role.entryMax)}
                  </div>
                </td>
                <td className="text-center py-3 px-2">
                  <div className="text-slate-200 text-xs">
                    {formatSalary(role.midMin)} - {formatSalary(role.midMax)}
                  </div>
                </td>
                <td className="text-center py-3 px-2">
                  <div className="text-green-400 text-xs font-medium">
                    {formatSalary(role.seniorMin)} - {formatSalary(role.seniorMax)}
                  </div>
                </td>
                <td className="text-center py-3 px-2">
                  <div className="text-emerald-400 text-xs font-medium">
                    {formatSalary(role.leadMin)} - {formatSalary(role.leadMax)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
        Ranges represent base compensation in USD. Total compensation with equity/bonuses may be 10-30% higher at senior+ levels.
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Education Pipeline Section
// ────────────────────────────────────────

function EducationPipelineSection() {
  const totalGrads = EDUCATION_PIPELINE_DATA.reduce((sum, e) => sum + e.annualGraduates, 0);
  const totalEntering = EDUCATION_PIPELINE_DATA.reduce((sum, e) => sum + e.enteringSpace, 0);
  const totalGap = EDUCATION_PIPELINE_DATA.reduce((sum, e) => sum + e.demandGap, 0);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold text-base">STEM Education Pipeline</h3>
      </div>
      <p className="text-slate-400 text-xs mb-4">
        Annual STEM graduates and the portion entering the space industry, along with estimated demand gaps.
      </p>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-white">{(totalGrads / 1000).toFixed(0)}K</div>
          <div className="text-xs text-slate-400">Relevant STEM Grads/yr</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-slate-300">{(totalEntering / 1000).toFixed(1)}K</div>
          <div className="text-xs text-slate-400">Entering Space Sector</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-red-400">{(totalGap / 1000).toFixed(1)}K</div>
          <div className="text-xs text-slate-400">Estimated Talent Gap</div>
        </div>
      </div>

      <div className="space-y-3">
        {EDUCATION_PIPELINE_DATA
          .sort((a, b) => b.demandGap - a.demandGap)
          .map((edu) => {
            const maxGrads = Math.max(...EDUCATION_PIPELINE_DATA.map((e) => e.annualGraduates));
            const gradBarPct = (edu.annualGraduates / maxGrads) * 100;
            const enterPct = (edu.enteringSpace / edu.annualGraduates) * 100;

            return (
              <div key={edu.field} className="bg-slate-800/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{edu.field}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs ${
                        edu.trend === 'up' ? 'text-green-400' : edu.trend === 'down' ? 'text-red-400' : 'text-slate-400'
                      }`}
                    >
                      {edu.trend === 'up' ? 'Trending Up' : edu.trend === 'down' ? 'Declining' : 'Stable'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 text-xs mb-2">
                  <div>
                    <span className="text-slate-400 block">Annual Grads</span>
                    <span className="text-white font-bold">{edu.annualGraduates.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Entering Space</span>
                    <span className="text-slate-300 font-bold">{edu.enteringSpace.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Conversion</span>
                    <span className="text-white font-bold">{edu.enteringSpacePct}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Demand Gap</span>
                    <span className="text-red-400 font-bold">-{edu.demandGap.toLocaleString()}</span>
                  </div>
                </div>

                {/* Stacked bar showing graduates vs entering space */}
                <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden" style={{ width: `${gradBarPct}%` }}>
                  <div
                    className="h-full bg-white rounded-full"
                    style={{ width: `${enterPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-0.5">
                  <span>{edu.enteringSpacePct}% of grads enter space</span>
                </div>
              </div>
            );
          })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
        Source: Estimated from NSF STEM data, AIAA workforce surveys, and industry hiring reports. &quot;Demand Gap&quot; reflects unfilled positions relative to pipeline.
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Workforce Overview Stats Section
// ────────────────────────────────────────

function WorkforceOverviewSection() {
  const totalHeadcount = TOP_EMPLOYERS_DATA.reduce((sum, e) => sum + e.headcount, 0);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold text-base">US Space Workforce Overview</h3>
        <span className="text-xs text-slate-400">2025 Estimates</span>
      </div>
      <p className="text-slate-400 text-xs mb-5">
        Key demographics and statistics for the United States space industry workforce.
      </p>

      {/* Top-level stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {WORKFORCE_OVERVIEW_STATS.map((stat) => (
          <div key={stat.label} className="bg-slate-800/50 rounded-lg p-4 text-center">
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-white font-medium mt-1">{stat.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{stat.detail}</div>
          </div>
        ))}
      </div>

      {/* Age Distribution */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-slate-300 mb-3">Age Distribution</h4>
        <div className="flex gap-1 h-8 rounded-lg overflow-hidden mb-2">
          {AGE_DISTRIBUTION_DATA.map((age) => (
            <div
              key={age.range}
              className={`${age.color} relative group cursor-default transition-opacity hover:opacity-90`}
              style={{ width: `${age.percentage}%` }}
              title={`${age.range}: ${age.percentage}%`}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                {age.percentage >= 10 && (
                  <span className="text-xs font-bold text-white drop-shadow-sm">{age.percentage}%</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {AGE_DISTRIBUTION_DATA.map((age) => (
            <div key={age.range} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${age.color}`} />
              <span className="text-xs text-slate-400">{age.range}: {age.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Diversity & Demographics Table */}
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-3">Diversity & Demographics</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {DIVERSITY_DATA.map((item) => (
            <div key={item.category} className="bg-slate-800/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white">{item.category}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${
                    item.trend === 'up' ? 'text-green-400' : item.trend === 'down' ? 'text-orange-400' : 'text-slate-400'
                  }`}>
                    {item.trend === 'up' ? 'Improving' : item.trend === 'down' ? 'Declining' : 'Stable'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-800/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.trend === 'up' ? 'bg-green-500' : item.trend === 'down' ? 'bg-orange-500' : 'bg-slate-500'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-white w-12 text-right">{item.percentage}%</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">{item.note}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
        Source: Space Foundation Workforce Reports, AIAA Diversity Survey, BLS Occupational Statistics, and SIA Annual Reports.
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Top Employers Section
// ────────────────────────────────────────

function TopEmployersSection() {
  const [sortKey, setSortKey] = useState<'headcount' | 'growth' | 'name'>('headcount');
  const [filterTier, setFilterTier] = useState<'all' | 'prime' | 'major' | 'growth'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const tierColors = {
    prime: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Defense Prime' },
    major: { bg: 'bg-white/8', text: 'text-slate-300', border: 'border-white/10', label: 'Major Player' },
    growth: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'High Growth' },
  };

  const filtered = TOP_EMPLOYERS_DATA
    .filter((e) => filterTier === 'all' || e.tier === filterTier)
    .filter((e) => !searchTerm || e.company.toLowerCase().includes(searchTerm.toLowerCase()) || e.segment.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortKey === 'headcount') return b.headcount - a.headcount;
      if (sortKey === 'growth') return b.recentGrowth - a.recentGrowth;
      return a.company.localeCompare(b.company);
    });

  const totalHeadcount = TOP_EMPLOYERS_DATA.reduce((sum, e) => sum + e.headcount, 0);
  const maxHeadcount = Math.max(...TOP_EMPLOYERS_DATA.map((e) => e.headcount));

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold text-base">Top Space Employers</h3>
        <span className="text-xs text-slate-400">{totalHeadcount.toLocaleString()} combined headcount (top 10)</span>
      </div>
      <p className="text-slate-400 text-xs mb-4">
        Leading space industry employers ranked by space-related workforce size.
      </p>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="search"
          placeholder="Search companies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-star-400 focus:outline-none focus:border-nebula-500/50 transition-colors w-48"
          aria-label="Search top employers"
        />
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-0.5">
          {[
            { id: 'all' as const, label: 'All' },
            { id: 'prime' as const, label: 'Primes' },
            { id: 'major' as const, label: 'Major' },
            { id: 'growth' as const, label: 'Growth' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterTier(t.id)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                filterTier === t.id ? 'bg-nebula-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-0.5 ml-auto">
          {[
            { id: 'headcount' as const, label: 'By Size' },
            { id: 'growth' as const, label: 'By Growth' },
            { id: 'name' as const, label: 'A-Z' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSortKey(s.id)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                sortKey === s.id ? 'bg-nebula-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Employer Cards */}
      <div className="space-y-3">
        {filtered.map((employer, idx) => {
          const tc = tierColors[employer.tier];
          const barPct = (employer.headcount / maxHeadcount) * 100;
          return (
            <div
              key={employer.company}
              className={`bg-slate-800/30 rounded-lg p-4 border ${tc.border} hover:bg-slate-800/50 transition-colors`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-slate-500 w-6 text-right">{idx + 1}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/company-profiles/${employer.company.toLowerCase().replace(/[\s\/]+/g, '-').replace(/[^a-z0-9-]/g, '')}`}
                        className="text-white font-semibold hover:text-nebula-300 transition-colors"
                      >
                        {employer.company}
                      </Link>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${tc.bg} ${tc.text} border ${tc.border}`}>
                        {tc.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{employer.segment} &middot; {employer.hqLocation}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-lg">{employer.headcount.toLocaleString()}</div>
                  <div className={`text-xs font-medium ${employer.recentGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {employer.recentGrowth >= 0 ? '+' : ''}{employer.recentGrowth}% YoY
                  </div>
                </div>
              </div>

              {/* Headcount bar */}
              <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    employer.tier === 'prime' ? 'bg-blue-500' : employer.tier === 'major' ? 'bg-white' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${barPct}%` }}
                />
              </div>

              {/* Key Programs */}
              <div className="flex flex-wrap gap-1.5">
                {employer.keyPrograms.map((prog) => (
                  <span key={prog} className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-400">
                    {prog}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-sm">No employers match the current filters.</div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
        Source: Company filings, Space Foundation, Payload Research. Headcount reflects space-related employees as of 2025 estimates.
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Skills Tag Cloud Section
// ────────────────────────────────────────

function SkillsTagCloudSection() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'high' | 'growing'>('all');

  const demandColors = {
    critical: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30', size: 'text-base font-bold' },
    high: { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/30', size: 'text-sm font-semibold' },
    growing: { bg: 'bg-yellow-500/15', text: 'text-yellow-300', border: 'border-yellow-500/30', size: 'text-xs font-medium' },
    steady: { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/30', size: 'text-xs' },
  };

  const filtered = SKILLS_DEMAND_DATA
    .filter((s) => activeFilter === 'all' || s.demandLevel === activeFilter)
    .sort((a, b) => b.openRoles - a.openRoles);

  const totalOpenRoles = SKILLS_DEMAND_DATA.reduce((sum, s) => sum + s.openRoles, 0);
  const avgSalaryAll = Math.round(SKILLS_DEMAND_DATA.reduce((sum, s) => sum + s.avgSalary, 0) / SKILLS_DEMAND_DATA.length);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold text-base">Skills Tag Cloud</h3>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>{totalOpenRoles.toLocaleString()} open roles</span>
          <span>Avg: {formatSalary(avgSalaryAll)}</span>
        </div>
      </div>
      <p className="text-slate-400 text-xs mb-4">
        Visual representation of skill demand. Size reflects the number of open roles; color indicates urgency level.
      </p>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { id: 'all' as const, label: 'All Skills' },
          { id: 'critical' as const, label: 'Critical Shortage' },
          { id: 'high' as const, label: 'High Demand' },
          { id: 'growing' as const, label: 'Rapidly Growing' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeFilter === f.id
                ? 'bg-nebula-500/20 text-nebula-300 border border-nebula-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tag Cloud */}
      <div className="flex flex-wrap gap-2 justify-center py-4">
        {filtered.map((skill) => {
          const dc = demandColors[skill.demandLevel];
          // Scale size based on openRoles relative to max
          const maxRoles = Math.max(...SKILLS_DEMAND_DATA.map((s) => s.openRoles));
          const scale = 0.75 + (skill.openRoles / maxRoles) * 0.75;

          return (
            <div
              key={skill.skill}
              className={`px-3 py-1.5 rounded-lg border ${dc.border} ${dc.bg} cursor-default transition-all hover:scale-105 group relative`}
              style={{ fontSize: `${scale}rem` }}
              title={`${skill.skill}: ${skill.openRoles.toLocaleString()} open roles, ${formatSalary(skill.avgSalary)} avg salary, +${skill.yoyChange}% YoY`}
            >
              <span className={dc.text}>{skill.skill}</span>
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl whitespace-nowrap text-xs">
                  <div className="text-white font-semibold mb-1">{skill.skill}</div>
                  <div className="text-slate-400">Open Roles: <span className="text-white">{skill.openRoles.toLocaleString()}</span></div>
                  <div className="text-slate-400">Avg Salary: <span className="text-green-400">{formatSalary(skill.avgSalary)}</span></div>
                  <div className="text-slate-400">YoY Growth: <span className="text-emerald-400">+{skill.yoyChange}%</span></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-slate-500 text-sm">No skills match the selected filter.</div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
        Tag size is proportional to open role count. Hover for detailed statistics.
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Space Talent Hub Content (with URL state)
// ────────────────────────────────────────

function SpaceTalentHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read top-level tab from URL (?tab=talent or ?tab=workforce)
  const initialTopTab = (searchParams.get('tab') as TopLevelTab) || 'talent';
  const validTopTab: TopLevelTab = initialTopTab === 'workforce' ? 'workforce' : 'talent';
  const [topTab, setTopTab] = useState<TopLevelTab>(validTopTab);

  // ── URL sync helper ──
  const updateUrl = useCallback(
    (updates: Record<string, string | boolean | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (
          value === null ||
          value === '' ||
          value === false ||
          (key === 'tab' && value === 'talent')
        ) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  // ════════════════════════════════════════
  // TALENT & EXPERTS STATE (from space-jobs)
  // ════════════════════════════════════════

  type TalentSubTab = 'experts' | 'webinars';
  const [talentSubTab, setTalentSubTab] = useState<TalentSubTab>('experts');

  // Service provider modal state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [spFormData, setSpFormData] = useState<ServiceProviderFormData>(INITIAL_FORM_DATA);
  const [spFormErrors, setSpFormErrors] = useState<Record<string, string>>({});
  const [spSubmitting, setSpSubmitting] = useState(false);
  const [spSubmitSuccess, setSpSubmitSuccess] = useState(false);

  // Talent state
  const [talent, setTalent] = useState<SpaceTalent[]>([]);
  const [talentStats, setTalentStats] = useState<TalentStats | null>(null);
  const [talentLoading, setTalentLoading] = useState(false);
  const [expertiseFilter, setExpertiseFilter] = useState<TalentExpertiseArea | ''>('');
  const [availabilityFilter, setAvailabilityFilter] = useState<TalentAvailability | ''>('');
  const [talentSearch, setTalentSearch] = useState('');

  // Webinar state
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [webinarStats, setWebinarStats] = useState<WebinarStats | null>(null);
  const [webinarLoading, setWebinarLoading] = useState(false);
  const [webinarFilter, setWebinarFilter] = useState<'all' | 'live' | 'upcoming' | 'past'>('all');
  const [topicFilter, setTopicFilter] = useState<string>('');

  // Error state
  const [error, setError] = useState<string | null>(null);

  // ════════════════════════════════════════
  // WORKFORCE ANALYTICS STATE (from workforce)
  // ════════════════════════════════════════

  // Read initial workforce sub-values from URL
  const initialWfSubTab = (searchParams.get('wfTab') as 'jobs' | 'trends' | 'salaries' | 'insights') || 'jobs';
  const initialCategory = (searchParams.get('category') as JobCategory | '') || '';
  const initialSeniority = (searchParams.get('seniority') as SeniorityLevel | '') || '';
  const initialRemote = searchParams.get('remote') === 'true';
  const initialSearch = searchParams.get('search') || '';
  const initialSalaryView = (searchParams.get('salaryView') as 'category' | 'seniority') || 'category';

  const [wfSubTab, setWfSubTab] = useState<'jobs' | 'trends' | 'salaries' | 'insights'>(initialWfSubTab);

  // Jobs state
  const [jobs, setJobs] = useState<SpaceJobPosting[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsOffset, setJobsOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState<JobCategory | ''>(initialCategory);
  const [seniorityFilter, setSeniorityFilter] = useState<SeniorityLevel | ''>(initialSeniority);
  const [remoteOnly, setRemoteOnly] = useState(initialRemote);

  // Trends state
  const [trends, setTrends] = useState<WorkforceTrend[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(true);

  // Salary benchmarks state
  const [benchmarksByCategory, setBenchmarksByCategory] = useState<SalaryBenchmarkEntry[]>([]);
  const [benchmarksBySeniority, setBenchmarksBySeniority] = useState<SalaryBenchmarkEntry[]>([]);
  const [salaryView, setSalaryView] = useState<'category' | 'seniority'>(initialSalaryView);
  const [salariesLoading, setSalariesLoading] = useState(true);

  // Stats
  const [wfStats, setWfStats] = useState<WorkforceStats | null>(null);

  const JOBS_PER_PAGE = 15;

  // ════════════════════════════════════════
  // TALENT DATA FETCHING
  // ════════════════════════════════════════

  const fetchTalent = async () => {
    setTalentLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (expertiseFilter) params.set('expertise', expertiseFilter);
      if (availabilityFilter) params.set('availability', availabilityFilter);
      if (talentSearch) params.set('search', talentSearch);

      const res = await fetch(`/api/space-jobs/talent?${params.toString()}`);
      const data = await res.json();

      if (data.talent) setTalent(data.talent);
      if (data.stats) setTalentStats(data.stats);
    } catch (error) {
      clientLogger.error('Failed to fetch talent', { error: error instanceof Error ? error.message : String(error) });
      setError('Failed to load data.');
    } finally {
      setTalentLoading(false);
    }
  };

  const fetchWebinars = async () => {
    setWebinarLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (topicFilter) params.set('topic', topicFilter);
      if (webinarFilter === 'live') params.set('isLive', 'true');
      if (webinarFilter === 'upcoming') {
        params.set('isPast', 'false');
        params.set('isLive', 'false');
      }
      if (webinarFilter === 'past') params.set('isPast', 'true');

      const res = await fetch(`/api/space-jobs/webinars?${params.toString()}`);
      const data = await res.json();

      if (data.webinars) setWebinars(data.webinars);
      if (data.stats) setWebinarStats(data.stats);
    } catch (error) {
      clientLogger.error('Failed to fetch webinars', { error: error instanceof Error ? error.message : String(error) });
      setError('Failed to load data.');
    } finally {
      setWebinarLoading(false);
    }
  };

  // Fetch talent data on mount and when filters change
  useEffect(() => {
    if (topTab === 'talent' && talentSubTab === 'experts') {
      fetchTalent();
    }
  }, [topTab, talentSubTab, expertiseFilter, availabilityFilter, talentSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch webinar data when sub-tab changes or filters change
  useEffect(() => {
    if (topTab === 'talent' && talentSubTab === 'webinars') {
      fetchWebinars();
    }
  }, [topTab, talentSubTab, webinarFilter, topicFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ════════════════════════════════════════
  // WORKFORCE DATA FETCHING
  // ════════════════════════════════════════

  const fetchJobs = useCallback(async (offset: number, append: boolean = false) => {
    setJobsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category', categoryFilter);
      if (seniorityFilter) params.set('seniorityLevel', seniorityFilter);
      if (remoteOnly) params.set('remoteOnly', 'true');
      if (searchQuery) params.set('search', searchQuery);
      params.set('limit', JOBS_PER_PAGE.toString());
      params.set('offset', offset.toString());

      const res = await fetch(`/api/workforce?${params}`);
      const data = await res.json();

      if (append) {
        setJobs((prev) => [...prev, ...(data.jobs || [])]);
      } else {
        setJobs(data.jobs || []);
      }
      setTotalJobs(data.totalJobs || 0);

      if (!wfStats && data.stats) setWfStats(data.stats);
      if (trends.length === 0 && data.trends) setTrends(data.trends);
      if (benchmarksByCategory.length === 0 && data.salaryBenchmarks) {
        setBenchmarksByCategory(data.salaryBenchmarks.byCategory || []);
        setBenchmarksBySeniority(data.salaryBenchmarks.bySeniority || []);
      }

      setTrendsLoading(false);
      setSalariesLoading(false);
    } catch (error) {
      clientLogger.error('Failed to fetch workforce data', { error: error instanceof Error ? error.message : String(error) });
      setError('Failed to load data.');
    } finally {
      setJobsLoading(false);
    }
  }, [categoryFilter, seniorityFilter, remoteOnly, searchQuery, wfStats, trends.length, benchmarksByCategory.length]);

  // Fetch workforce data when switching to that tab or when filters change
  useEffect(() => {
    if (topTab === 'workforce') {
      setJobsOffset(0);
      fetchJobs(0, false);
    }
  }, [topTab, categoryFilter, seniorityFilter, remoteOnly, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // ════════════════════════════════════════
  // WORKFORCE HANDLERS
  // ════════════════════════════════════════

  const handleLoadMore = () => {
    const newOffset = jobsOffset + JOBS_PER_PAGE;
    setJobsOffset(newOffset);
    fetchJobs(newOffset, true);
  };

  const handleJobSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setJobsOffset(0);
    updateUrl({ search: searchInput || null });
  };

  const handleWfSubTabChange = (tab: 'jobs' | 'trends' | 'salaries' | 'insights') => {
    setWfSubTab(tab);
    updateUrl({ wfTab: tab === 'jobs' ? null : tab });
  };

  const handleCategoryChange = (value: JobCategory | '') => {
    setCategoryFilter(value);
    setJobsOffset(0);
    updateUrl({ category: value || null });
  };

  const handleSeniorityChange = (value: SeniorityLevel | '') => {
    setSeniorityFilter(value);
    setJobsOffset(0);
    updateUrl({ seniority: value || null });
  };

  const handleRemoteToggle = () => {
    const newValue = !remoteOnly;
    setRemoteOnly(newValue);
    setJobsOffset(0);
    updateUrl({ remote: newValue ? 'true' : null });
  };

  const handleSalaryViewChange = (view: 'category' | 'seniority') => {
    setSalaryView(view);
    updateUrl({ salaryView: view === 'category' ? null : view });
  };

  const clearJobFilters = () => {
    setCategoryFilter('');
    setSeniorityFilter('');
    setRemoteOnly(false);
    setSearchInput('');
    setSearchQuery('');
    setJobsOffset(0);
    updateUrl({ category: null, seniority: null, remote: null, search: null });
  };

  const hasJobFilters = categoryFilter || seniorityFilter || remoteOnly || searchQuery;

  // ════════════════════════════════════════
  // TOP-LEVEL TAB CHANGE
  // ════════════════════════════════════════

  const handleTopTabChange = (tab: TopLevelTab) => {
    setTopTab(tab);
    updateUrl({ tab: tab === 'talent' ? null : tab });
  };

  // Swipe between tabs
  useSwipeTabs(['talent', 'workforce'], topTab, (tab) => handleTopTabChange(tab as TopLevelTab));

  // Combined refresh for pull-to-refresh
  const handleRefresh = async () => {
    if (topTab === 'talent') {
      if (talentSubTab === 'experts') await fetchTalent();
      else await fetchWebinars();
    } else {
      await fetchJobs(0, false);
    }
  };

  // ════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      {/* JobPosting structured data for Google for Jobs */}
      {jobs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jobs.slice(0, 20).map((job) => ({
              '@context': 'https://schema.org',
              '@type': 'JobPosting',
              title: job.title,
              hiringOrganization: {
                '@type': 'Organization',
                name: job.company,
              },
              jobLocation: {
                '@type': 'Place',
                address: job.location,
              },
              ...(job.remoteOk && { jobLocationType: 'TELECOMMUTE' }),
              datePosted: new Date(job.postedDate).toISOString(),
              validThrough: new Date(Date.now() + 60 * 86400000).toISOString(),
              employmentType: 'FULL_TIME',
              ...(job.salaryMin && job.salaryMax && {
                baseSalary: {
                  '@type': 'MonetaryAmount',
                  currency: 'USD',
                  value: {
                    '@type': 'QuantitativeValue',
                    minValue: job.salaryMin,
                    maxValue: job.salaryMax,
                    unitText: 'YEAR',
                  },
                },
              }),
              ...(job.sourceUrl && { url: job.sourceUrl }),
            }))).replace(/</g, '\\u003c'),
          }}
        />
      )}

      {error && (
        <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
          <div className="text-red-400 text-sm font-medium">{error}</div>
        </div>
      )}

      {/* ──────────────── TOP-LEVEL TAB NAVIGATION ──────────────── */}
      <div className="flex border-b border-slate-700/50 mb-8 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => handleTopTabChange('talent')}
          className={`py-3 px-6 min-h-[44px] font-medium text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
            topTab === 'talent'
              ? 'border-white/15 text-white'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            Talent & Experts
          </span>
        </button>
        <button
          onClick={() => handleTopTabChange('workforce')}
          className={`py-3 px-6 min-h-[44px] font-medium text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
            topTab === 'workforce'
              ? 'border-white/15 text-white'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            Workforce Analytics
          </span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TALENT & EXPERTS TAB                                      */}
      {/* ══════════════════════════════════════════════════════════ */}
      {topTab === 'talent' && (
        <div>
          {/* Sub-tab navigation (Experts / Webinars) */}
          <div className="flex border-b border-slate-700/50 mb-6 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setTalentSubTab('experts')}
              className={`py-3 px-6 min-h-[44px] font-medium text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
                talentSubTab === 'experts'
                  ? 'border-white/15 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                Expert Consultants
              </span>
            </button>
            <button
              onClick={() => setTalentSubTab('webinars')}
              className={`py-3 px-6 min-h-[44px] font-medium text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
                talentSubTab === 'webinars'
                  ? 'border-white/15 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                Technical Panels & Webinars
                {webinarStats?.liveCount ? (
                  <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded animate-pulse">
                    {webinarStats.liveCount} LIVE
                  </span>
                ) : null}
              </span>
            </button>
          </div>

          {/* ── Expert Consultants Sub-Tab ── */}
          {talentSubTab === 'experts' && (
            <div>
              {/* Description */}
              <div className="bg-gradient-to-r from-white/5 to-purple-500/10 border border-white/10 rounded-lg p-4 mb-6">
                <p className="text-slate-300 text-sm">
                  <strong className="text-slate-300">Find the right expert for your project.</strong>{' '}
                  Our network includes space lawyers, regulatory specialists, aerospace engineers,
                  policy advisors, and business consultants with deep industry experience.
                </p>
              </div>

              {/* Service Provider Listing CTA */}
              <div className="bg-gradient-to-r from-purple-500/10 to-white/5 border border-purple-500/20 rounded-lg p-4 mb-6">
                <p className="text-slate-300 text-sm">
                  If you are a service provider in this area and would like to be listed here, please{' '}
                  <button
                    onClick={() => {
                      setSpFormData(INITIAL_FORM_DATA);
                      setSpFormErrors({});
                      setSpSubmitSuccess(false);
                      setIsContactModalOpen(true);
                    }}
                    className="text-slate-300 hover:text-white underline underline-offset-2 font-medium transition-colors"
                  >
                    contact us
                  </button>
                  .
                </p>
              </div>

              {/* Stats Cards */}
              {talentStats && (
                <ScrollReveal>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="card p-4 text-center">
                    <div className="text-2xl font-bold text-white">{talentStats.totalExperts}</div>
                    <div className="text-slate-400 text-xs">Total Experts</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-2xl font-bold text-slate-300">{talentStats.featuredCount}</div>
                    <div className="text-slate-400 text-xs">Featured</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">{talentStats.availableCount}</div>
                    <div className="text-slate-400 text-xs">Available Now</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-2xl font-bold text-white">${talentStats.avgConsultingRate}</div>
                    <div className="text-slate-400 text-xs">Avg. Rate/hr</div>
                  </div>
                </div>
                </ScrollReveal>
              )}

              {/* Filters */}
              <div className="card p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="search"
                      aria-label="Search by name, title, organization, or expertise"
                      placeholder="Search by name, title, organization, or expertise..."
                      value={talentSearch}
                      onChange={(e) => setTalentSearch(e.target.value)}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-white/15"
                    />
                  </div>
                  <select
                    aria-label="Filter by expertise area"
                    value={expertiseFilter}
                    onChange={(e) => setExpertiseFilter(e.target.value as TalentExpertiseArea | '')}
                    className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
                  >
                    <option value="">All Expertise Areas</option>
                    {TALENT_EXPERTISE_AREAS.map(exp => (
                      <option key={exp.value} value={exp.value}>
                        {exp.icon} {exp.label}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter by availability"
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value as TalentAvailability | '')}
                    className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
                  >
                    <option value="">All Availability</option>
                    {Object.entries(TALENT_AVAILABILITY_INFO).map(([key, info]) => (
                      <option key={key} value={key}>{info.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="card p-4 mb-6">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-slate-300">
                    The information contained in these cards is our best estimate of the services and prices offered by the service provider based on publicly available information. Please contact the service provider directly to confirm any details.
                  </p>
                </div>
              </div>

              {/* Talent Grid */}
              {talentLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : talent.length > 0 ? (
                <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {talent.map((t, index) => (
                    <React.Fragment key={t.id}>
                      <StaggerItem>
                        <TalentCard talent={t} />
                      </StaggerItem>
                      {(index + 1) % 6 === 0 && index + 1 < talent.length && (
                        <div className="col-span-1 md:col-span-2 lg:col-span-3">
                          <AdSlot position="in_feed" module="space-talent" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </StaggerContainer>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-400">No experts found matching your criteria.</p>
                  <button
                    onClick={() => {
                      setExpertiseFilter('');
                      setAvailabilityFilter('');
                      setTalentSearch('');
                    }}
                    className="mt-4 text-slate-300 hover:text-white text-sm"
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {/* CTA for experts to join */}
              <div className="mt-8 bg-gradient-to-r from-slate-800/80 to-slate-700/80 border border-slate-600/50 rounded-lg p-6 text-center">
                <h3 className="text-white font-semibold mb-2">Are you a space industry expert?</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Join our network to connect with companies and projects seeking your expertise.
                </p>
                <a
                  href="mailto:talent@spacenexus.us?subject=Expert Network Application"
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
                >
                  Apply to Join Network
                </a>
              </div>
            </div>
          )}

          {/* ── Webinars Sub-Tab ── */}
          {talentSubTab === 'webinars' && (
            <div>
              {/* Description */}
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4 mb-6">
                <p className="text-slate-300 text-sm">
                  <strong className="text-purple-400">Learn from industry leaders.</strong>{' '}
                  Join live technical panels, webinars, and discussions on topics like space nuclear payloads,
                  in-orbit manufacturing, regulatory compliance, and emerging space technologies.
                </p>
              </div>

              {/* Stats Cards */}
              {webinarStats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="card p-4 text-center">
                    <div className="text-2xl font-bold text-white">{webinarStats.totalWebinars}</div>
                    <div className="text-slate-400 text-xs">Total Events</div>
                  </div>
                  <div className={`card p-4 text-center ${webinarStats.liveCount > 0 ? 'border-red-500/50 bg-red-500/5' : ''}`}>
                    <div className="text-2xl font-bold text-red-400">{webinarStats.liveCount}</div>
                    <div className="text-slate-400 text-xs">Live Now</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-2xl font-bold text-slate-300">{webinarStats.upcomingCount}</div>
                    <div className="text-slate-400 text-xs">Upcoming</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-2xl font-bold text-slate-400">{webinarStats.pastCount}</div>
                    <div className="text-slate-400 text-xs">Past Events</div>
                  </div>
                  <div className="card p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">{webinarStats.recordingsAvailable}</div>
                    <div className="text-slate-400 text-xs">Recordings</div>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="card p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex gap-2">
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'live', label: 'Live', color: 'text-red-400' },
                      { value: 'upcoming', label: 'Upcoming', color: 'text-slate-300' },
                      { value: 'past', label: 'Past', color: 'text-slate-400' },
                    ].map(filter => (
                      <button
                        key={filter.value}
                        onClick={() => setWebinarFilter(filter.value as typeof webinarFilter)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                          webinarFilter === filter.value
                            ? 'bg-white text-white'
                            : `bg-slate-700/50 hover:bg-slate-600/50 ${filter.color || 'text-slate-300'}`
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                  <select
                    aria-label="Filter by topic"
                    value={topicFilter}
                    onChange={(e) => setTopicFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
                  >
                    <option value="">All Topics</option>
                    {WEBINAR_TOPICS.map(topic => (
                      <option key={topic.value} value={topic.value}>
                        {topic.icon} {topic.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Webinar Grid */}
              {webinarLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : webinars.length > 0 ? (
                <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {webinars.map(w => (
                    <StaggerItem key={w.id}>
                      <WebinarCard webinar={w} />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-400">No webinars found matching your criteria.</p>
                  <button
                    onClick={() => {
                      setWebinarFilter('all');
                      setTopicFilter('');
                    }}
                    className="mt-4 text-slate-300 hover:text-white text-sm"
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {/* CTA for hosting webinars */}
              <div className="mt-8 bg-gradient-to-r from-slate-800/80 to-slate-700/80 border border-slate-600/50 rounded-lg p-6 text-center">
                <h3 className="text-white font-semibold mb-2">Want to host a technical panel?</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Share your expertise with the space industry community. We support webinars,
                  panel discussions, and technical presentations.
                </p>
                <a
                  href="mailto:webinars@spacenexus.us?subject=Webinar Hosting Inquiry"
                  className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-medium px-6 py-2 rounded-lg transition-colors"
                >
                  Propose a Webinar
                </a>
              </div>
            </div>
          )}

          {/* Related Resources for Talent tab */}
          <div className="mt-8 pt-8 border-t border-slate-700/50">
            <h3 className="text-slate-400 text-sm font-medium mb-4">Related Resources</h3>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/business-opportunities"
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white hover:border-white/15 transition-all"
              >
                Business Opportunities
              </Link>
              <Link
                href="/compliance"
                className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:text-white hover:border-white/15 transition-all"
              >
                Compliance & Regulations
              </Link>
            </div>
          </div>

          {/* Service Provider Contact Modal */}
          {isContactModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setIsContactModalOpen(false);
              }}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

              {/* Modal */}
              <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900/95 border border-slate-700/50 rounded-xl shadow-2xl backdrop-blur-md">
                {/* Close button */}
                <button
                  onClick={() => setIsContactModalOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="p-6">
                  <h2 className="text-xl font-semibold text-white mb-1">Get Listed as a Service Provider</h2>
                  <p className="text-slate-400 text-sm mb-6">
                    Submit your details and we will review your listing for inclusion.
                  </p>

                  {spSubmitSuccess ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-white font-semibold text-lg mb-2">Submission Received!</h3>
                      <p className="text-slate-400 text-sm mb-6">
                        Thank you for your interest. We will review your submission and get back to you shortly.
                      </p>
                      <button
                        onClick={() => setIsContactModalOpen(false)}
                        className="bg-white hover:bg-slate-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setSpFormErrors({});

                        // Client-side validation
                        const errors: Record<string, string> = {};
                        if (!spFormData.businessName.trim()) {
                          errors.businessName = 'Business name is required';
                        }
                        if (!spFormData.email.trim()) {
                          errors.email = 'Email is required';
                        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(spFormData.email.trim())) {
                          errors.email = 'Please enter a valid email address';
                        }
                        if (!spFormData.description.trim()) {
                          errors.description = 'Description is required';
                        } else if (spFormData.description.trim().length < 10) {
                          errors.description = 'Please provide at least 10 characters';
                        }
                        if (spFormData.website.trim() && !/^https?:\/\/.+/.test(spFormData.website.trim())) {
                          errors.website = 'Please enter a valid URL (starting with http:// or https://)';
                        }

                        if (Object.keys(errors).length > 0) {
                          setSpFormErrors(errors);
                          return;
                        }

                        setSpSubmitting(true);
                        try {
                          const res = await fetch('/api/service-providers', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              businessName: spFormData.businessName.trim(),
                              contactName: spFormData.contactName.trim() || undefined,
                              phone: spFormData.phone.trim() || undefined,
                              email: spFormData.email.trim(),
                              website: spFormData.website.trim() || undefined,
                              description: spFormData.description.trim(),
                              pricing: spFormData.pricing.trim() || undefined,
                            }),
                          });

                          if (res.ok) {
                            setSpSubmitSuccess(true);
                          } else {
                            const data = await res.json();
                            if (data.details) {
                              const serverErrors: Record<string, string> = {};
                              for (const [key, msgs] of Object.entries(data.details)) {
                                if (Array.isArray(msgs) && msgs.length > 0) {
                                  serverErrors[key] = msgs[0] as string;
                                }
                              }
                              setSpFormErrors(serverErrors);
                            } else {
                              setSpFormErrors({ _form: extractApiError(data, 'Something went wrong. Please try again.') });
                            }
                          }
                        } catch {
                          setSpFormErrors({ _form: 'Network error. Please try again.' });
                        } finally {
                          setSpSubmitting(false);
                        }
                      }}
                      className="space-y-4"
                    >
                      {spFormErrors._form && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <p className="text-red-400 text-sm">{spFormErrors._form}</p>
                        </div>
                      )}

                      {/* Business Name */}
                      <div>
                        <label htmlFor="sp-business-name" className="block text-sm font-medium text-slate-300 mb-1">
                          Business / Provider Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          id="sp-business-name"
                          type="text"
                          value={spFormData.businessName}
                          onChange={(e) => setSpFormData(prev => ({ ...prev, businessName: e.target.value }))}
                          className={`w-full bg-slate-800/50 border rounded-lg px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-white/15 ${
                            spFormErrors.businessName ? 'border-red-500/50' : 'border-slate-600/50'
                          }`}
                          placeholder="Your business or provider name"
                        />
                        {spFormErrors.businessName && (
                          <p className="text-red-400 text-xs mt-1">{spFormErrors.businessName}</p>
                        )}
                      </div>

                      {/* Contact Name */}
                      <div>
                        <label htmlFor="sp-contact-name" className="block text-sm font-medium text-slate-300 mb-1">
                          Contact Name
                        </label>
                        <input
                          id="sp-contact-name"
                          type="text"
                          value={spFormData.contactName}
                          onChange={(e) => setSpFormData(prev => ({ ...prev, contactName: e.target.value }))}
                          className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-white/15"
                          placeholder="Primary contact person"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label htmlFor="sp-phone" className="block text-sm font-medium text-slate-300 mb-1">
                          Phone Number
                        </label>
                        <input
                          id="sp-phone"
                          type="tel"
                          value={spFormData.phone}
                          onChange={(e) => setSpFormData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-white/15"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label htmlFor="sp-email" className="block text-sm font-medium text-slate-300 mb-1">
                          Email Address <span className="text-red-400">*</span>
                        </label>
                        <input
                          id="sp-email"
                          type="email"
                          value={spFormData.email}
                          onChange={(e) => setSpFormData(prev => ({ ...prev, email: e.target.value }))}
                          className={`w-full bg-slate-800/50 border rounded-lg px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-white/15 ${
                            spFormErrors.email ? 'border-red-500/50' : 'border-slate-600/50'
                          }`}
                          placeholder="you@company.com"
                        />
                        {spFormErrors.email && (
                          <p className="text-red-400 text-xs mt-1">{spFormErrors.email}</p>
                        )}
                      </div>

                      {/* Website */}
                      <div>
                        <label htmlFor="sp-website" className="block text-sm font-medium text-slate-300 mb-1">
                          Website
                        </label>
                        <input
                          id="sp-website"
                          type="url"
                          value={spFormData.website}
                          onChange={(e) => setSpFormData(prev => ({ ...prev, website: e.target.value }))}
                          className={`w-full bg-slate-800/50 border rounded-lg px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-white/15 ${
                            spFormErrors.website ? 'border-red-500/50' : 'border-slate-600/50'
                          }`}
                          placeholder="https://yourcompany.com"
                        />
                        {spFormErrors.website && (
                          <p className="text-red-400 text-xs mt-1">{spFormErrors.website}</p>
                        )}
                      </div>

                      {/* Description */}
                      <div>
                        <label htmlFor="sp-description" className="block text-sm font-medium text-slate-300 mb-1">
                          Description of Services <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          id="sp-description"
                          value={spFormData.description}
                          onChange={(e) => setSpFormData(prev => ({ ...prev, description: e.target.value }))}
                          rows={4}
                          className={`w-full bg-slate-800/50 border rounded-lg px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-white/15 resize-vertical ${
                            spFormErrors.description ? 'border-red-500/50' : 'border-slate-600/50'
                          }`}
                          placeholder="Describe the services you offer, your areas of expertise, and what makes you stand out..."
                        />
                        {spFormErrors.description && (
                          <p className="text-red-400 text-xs mt-1">{spFormErrors.description}</p>
                        )}
                        <p className="text-slate-500 text-xs mt-1">{spFormData.description.length}/2000 characters</p>
                      </div>

                      {/* Pricing */}
                      <div>
                        <label htmlFor="sp-pricing" className="block text-sm font-medium text-slate-300 mb-1">
                          Pricing Information
                        </label>
                        <textarea
                          id="sp-pricing"
                          value={spFormData.pricing}
                          onChange={(e) => setSpFormData(prev => ({ ...prev, pricing: e.target.value }))}
                          rows={2}
                          className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-white/15 resize-vertical"
                          placeholder="e.g., Hourly rates, project-based pricing, consultation fees..."
                        />
                      </div>

                      {/* Submit */}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={spSubmitting}
                          className="flex-1 bg-white hover:bg-slate-700 disabled:bg-white/50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          {spSubmitting ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Submitting...
                            </>
                          ) : (
                            'Submit Listing Request'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsContactModalOpen(false)}
                          className="px-6 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-medium rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* WORKFORCE ANALYTICS TAB                                   */}
      {/* ══════════════════════════════════════════════════════════ */}
      {topTab === 'workforce' && (
        <div>
          {/* Quick Stats */}
          {wfStats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-white">
                  {wfStats.totalOpenings.toLocaleString()}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Total Openings
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-green-400">
                  {formatSalary(wfStats.avgSalary)}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Avg Salary
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-nebula-300">
                  {JOB_CATEGORIES.find((c) => c.value === wfStats.topCategory)?.label || wfStats.topCategory}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Top Category
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-blue-400 truncate">
                  {wfStats.topCompany}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Top Employer
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-purple-400">
                  {wfStats.totalCompanies}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Companies
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div
                  className={`text-2xl font-bold font-display ${
                    (wfStats.growthRate ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {(wfStats.growthRate ?? 0) >= 0 ? '+' : ''}
                  {(wfStats.growthRate ?? 0).toFixed(1)}%
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  YoY Growth
                </div>
              </div>
            </div>
          )}

          {/* Workforce Sub-Tab Navigation */}
          <div className="relative">
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
              {[
                { id: 'jobs' as const, label: 'Job Postings', count: totalJobs },
                { id: 'trends' as const, label: 'Workforce Trends', count: trends.length },
                { id: 'salaries' as const, label: 'Salary Benchmarks', count: benchmarksByCategory.length },
                { id: 'insights' as const, label: 'Industry Insights', count: 0 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleWfSubTabChange(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    wfSubTab === tab.id
                      ? 'bg-nebula-500 text-white shadow-glow-sm'
                      : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700/50'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        wfSubTab === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-700/50 text-slate-500'
                    }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none md:hidden" />
          </div>

          {/* ──────────────── JOB POSTINGS SUB-TAB ──────────────── */}
          {wfSubTab === 'jobs' && (
            <div>
              {/* Search & Filters */}
              <div className="card p-4 mb-6">
                <form onSubmit={handleJobSearch} className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="search"
                      aria-label="Search jobs by title, company, location, or specialization"
                      placeholder="Search jobs by title, company, location, or specialization..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm text-white placeholder-star-400 focus:outline-none focus:border-nebula-500/50 transition-colors"
                    />
                    <button type="submit" className="btn-primary px-6">
                      Search
                    </button>
                  </div>
                </form>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Category */}
                  <select
                    aria-label="Filter by job category"
                    value={categoryFilter}
                    onChange={(e) => handleCategoryChange(e.target.value as JobCategory | '')}
                    className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
                  >
                    <option value="">All Categories</option>
                    {JOB_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>

                  {/* Seniority */}
                  <select
                    aria-label="Filter by seniority level"
                    value={seniorityFilter}
                    onChange={(e) => handleSeniorityChange(e.target.value as SeniorityLevel | '')}
                    className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
                  >
                    <option value="">All Levels</option>
                    {SENIORITY_LEVELS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>

                  {/* Remote Toggle */}
                  <button
                    onClick={handleRemoteToggle}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      remoteOnly
                        ? 'bg-nebula-500/20 text-nebula-300 border border-nebula-500/30'
                        : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:border-slate-700/50'
                    }`}
                  >
                    Remote Only
                  </button>

                  {/* Clear Filters */}
                  {hasJobFilters && (
                    <button
                      onClick={clearJobFilters}
                      className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-slate-400">
                      {totalJobs} {totalJobs === 1 ? 'job' : 'jobs'} found
                    </span>
                    <ExportButton
                      data={jobs}
                      filename="spacehub-jobs"
                      columns={JOB_EXPORT_COLUMNS}
                      label="Export Jobs"
                    />
                  </div>
                </div>
              </div>

              {/* Job Listings */}
              {jobsLoading && jobs.length === 0 ? (
                <div className="flex justify-center py-20">
                  <LoadingSpinner size="lg" />
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-20">
                  <h3 className="text-xl font-semibold text-white mb-2">No jobs found</h3>
                  <p className="text-slate-400 mb-4">
                    {hasJobFilters
                      ? 'Try adjusting your filters or search terms.'
                      : 'Job postings will appear here once data is loaded.'}
                  </p>
                  {hasJobFilters && (
                    <button onClick={clearJobFilters} className="btn-secondary">
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {jobs.map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>

                  {jobs.length < totalJobs && (
                    <div className="text-center mt-8">
                      <button
                        onClick={handleLoadMore}
                        disabled={jobsLoading}
                        className="btn-secondary py-3 px-8"
                      >
                        {jobsLoading ? (
                          <span className="flex items-center gap-2">
                            <LoadingSpinner size="sm" />
                            Loading...
                          </span>
                        ) : (
                          `Load More (${jobs.length} of ${totalJobs})`
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ──────────────── WORKFORCE TRENDS SUB-TAB ──────────────── */}
          {wfSubTab === 'trends' && (
            <div>
              {trendsLoading ? (
                <div className="flex justify-center py-20">
                  <LoadingSpinner size="lg" />
                </div>
              ) : trends.length === 0 ? (
                <div className="text-center py-20">
                  <h3 className="text-xl font-semibold text-white mb-2">No trend data available</h3>
                  <p className="text-slate-400">Workforce trends will appear once data is loaded.</p>
                </div>
              ) : (
                <>
                  {/* Summary banner */}
                  <div className="card p-5 mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-semibold">Industry Overview</h3>
                      <ExportButton
                        data={trends}
                        filename="spacehub-workforce-trends"
                        columns={TREND_EXPORT_COLUMNS}
                        label="Export Trends"
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Latest Quarter</span>
                        <span className="text-white font-bold">
                          Q{trends[trends.length - 1].quarter} {trends[trends.length - 1].year}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Openings Growth</span>
                        <span className="text-green-400 font-bold">
                          {trends.length >= 2
                            ? `${(((trends[trends.length - 1].totalOpenings - trends[0].totalOpenings) / trends[0].totalOpenings) * 100).toFixed(1)}%`
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Salary Growth</span>
                        <span className="text-green-400 font-bold">
                          {trends.length >= 2
                            ? `${((((trends[trends.length - 1].avgSalary ?? 0) - (trends[0].avgSalary ?? 0)) / (trends[0].avgSalary || 1)) * 100).toFixed(1)}%`
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Total Hires (Latest)</span>
                        <span className="text-white font-bold">
                          {(trends[trends.length - 1].totalHires ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {trends.map((trend) => (
                      <TrendCard key={trend.id} trend={trend} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ──────────────── SALARY BENCHMARKS SUB-TAB ──────────────── */}
          {wfSubTab === 'salaries' && (
            <div>
              {salariesLoading ? (
                <div className="flex justify-center py-20">
                  <LoadingSpinner size="lg" />
                </div>
              ) : benchmarksByCategory.length === 0 && benchmarksBySeniority.length === 0 ? (
                <div className="text-center py-20">
                  <h3 className="text-xl font-semibold text-white mb-2">No salary data available</h3>
                  <p className="text-slate-400">Salary benchmarks will appear once data is loaded.</p>
                </div>
              ) : (
                <>
                  {/* View Toggle */}
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => handleSalaryViewChange('category')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        salaryView === 'category'
                          ? 'bg-slate-700/50 text-white border border-slate-700/50 shadow-glow-sm'
                          : 'bg-transparent text-slate-400 border border-slate-700/50 hover:border-slate-700/50'
                      }`}
                    >
                      By Category
                    </button>
                    <button
                      onClick={() => handleSalaryViewChange('seniority')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        salaryView === 'seniority'
                          ? 'bg-slate-700/50 text-white border border-slate-700/50 shadow-glow-sm'
                          : 'bg-transparent text-slate-400 border border-slate-700/50 hover:border-slate-700/50'
                      }`}
                    >
                      By Seniority Level
                    </button>
                  </div>

                  {salaryView === 'category' ? (
                    <div className="space-y-3">
                      {benchmarksByCategory.map((b) => {
                        const cat = b.category as JobCategory;
                        const catInfo = JOB_CATEGORIES.find((c) => c.value === cat);
                        const colors = CATEGORY_COLORS[cat];
                        return (
                          <BenchmarkBar
                            key={cat}
                            label={`${catInfo?.icon || ''} ${catInfo?.label || cat}`}
                            color={colors?.text || 'text-slate-400'}
                            avgMin={b.avgMin}
                            avgMax={b.avgMax}
                            avgMedian={b.avgMedian}
                            count={b.count}
                            maxRange={500000}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {benchmarksBySeniority.map((b) => {
                        const level = b.seniorityLevel as SeniorityLevel;
                        return (
                          <BenchmarkBar
                            key={level}
                            label={SENIORITY_LABELS[level] || level}
                            color="text-nebula-300"
                            avgMin={b.avgMin}
                            avgMax={b.avgMax}
                            avgMedian={b.avgMedian}
                            count={b.count}
                            maxRange={500000}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Salary legend */}
                  <div className="card p-4 mt-6 border-dashed">
                    <div className="flex items-center gap-6 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-2 bg-slate-700/50 rounded-full" />
                        <span>Salary Range (Min to Max)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-nebula-400 rounded-full" />
                        <span>Median</span>
                      </div>
                      <span className="ml-auto text-slate-400/70">
                        Based on {jobs.length > 0 ? totalJobs : '...'} active job postings
                      </span>
                    </div>
                  </div>

                  {/* Detailed Role Salary Ranges */}
                  <div className="mt-8">
                    <SalaryByRoleSection />
                  </div>
                </>
              )}
            </div>
          )}

          {/* ──────────────── INDUSTRY INSIGHTS SUB-TAB ──────────────── */}
          {wfSubTab === 'insights' && (
            <div>
              {/* Intro banner */}
              <div className="bg-gradient-to-r from-white/5 to-purple-500/10 border border-white/10 rounded-lg p-4 mb-6">
                <p className="text-slate-300 text-sm">
                  <strong className="text-slate-300">Deep-dive workforce intelligence.</strong>{' '}
                  Explore workforce demographics, top employers by headcount, the most critical skill shortages,
                  employment across sectors, geographic hiring patterns, and the STEM education pipeline.
                </p>
              </div>

              <div className="space-y-6">
                {/* Workforce Overview Stats */}
                <ScrollReveal>
                  <WorkforceOverviewSection />
                </ScrollReveal>

                {/* Top Employers */}
                <ScrollReveal>
                  <TopEmployersSection />
                </ScrollReveal>

                {/* Skills Tag Cloud */}
                <ScrollReveal>
                  <SkillsTagCloudSection />
                </ScrollReveal>

                {/* Sector Employment */}
                <ScrollReveal>
                  <SectorEmploymentSection />
                </ScrollReveal>

                {/* Skills Demand (detailed) */}
                <ScrollReveal>
                  <SkillsDemandSection />
                </ScrollReveal>

                {/* Geographic Distribution */}
                <ScrollReveal>
                  <GeographicDistributionSection />
                </ScrollReveal>

                {/* Education Pipeline */}
                <ScrollReveal>
                  <EducationPipelineSection />
                </ScrollReveal>

                {/* Data methodology note */}
                <div className="card p-4 border-dashed">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-xs text-slate-500">
                      <p className="mb-1">
                        <strong className="text-slate-400">Data Methodology:</strong> Workforce statistics are compiled from
                        multiple sources including the Bureau of Labor Statistics, Space Foundation workforce reports,
                        Bryce Tech analysis, SIA annual reports, NSF STEM education data, and aggregated job posting data.
                        Figures represent estimates and may not reflect real-time conditions.
                      </p>
                      <p>
                        Salary data represents base compensation for US-based positions unless otherwise noted.
                        International salary comparisons use PPP-adjusted rates where applicable.
                        Employer headcount data sourced from company filings and Payload Research estimates.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PullToRefresh>
  );
}

// ────────────────────────────────────────
// Main Page
// ────────────────────────────────────────

export default function SpaceTalentHubPage() {
  return (
    <div className="min-h-screen bg-space-900 py-8">
      <ItemListSchema
        name="Space Talent Hub"
        description="Space industry job listings, expert consultants, salary benchmarks, and workforce analytics"
        url="/space-talent"
        items={[
          { name: 'Space Industry Jobs', url: '/space-talent?tab=workforce', description: 'Browse open positions in the space industry' },
          { name: 'Expert Consultants', url: '/space-talent?tab=talent', description: 'Connect with space industry consultants and advisors' },
          { name: 'Salary Benchmarks', url: '/space-talent?tab=workforce&wfTab=salaries', description: 'Space industry salary data by role and seniority' },
          { name: 'Industry Insights', url: '/space-talent?tab=workforce&wfTab=insights', description: 'Space workforce sector employment, skills demand, and education pipeline analytics' },
        ]}
      />
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Space Talent Hub"
          subtitle="Expert consultants, webinars, job listings, salary benchmarks, and workforce analytics"
          icon="👨‍🚀"
          accentColor="emerald"
        />

        <Suspense
          fallback={
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          <SpaceTalentHubContent />
        </Suspense>

        {/* Footer Ad */}
        <div className="mt-12">
          <AdSlot position="footer" module="space-talent" />
        </div>
      </div>
    </div>
  );
}
