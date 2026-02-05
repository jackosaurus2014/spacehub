'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  SpaceJobPosting,
  WorkforceTrend,
  JobCategory,
  SeniorityLevel,
  JOB_CATEGORIES,
  SENIORITY_LEVELS,
} from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageHeader from '@/components/ui/PageHeader';
import ExportButton from '@/components/ui/ExportButton';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

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
// Constants
// ────────────────────────────────────────

const CATEGORY_COLORS: Record<JobCategory, { text: string; bg: string }> = {
  engineering: { text: 'text-blue-400', bg: 'bg-blue-500/20' },
  operations: { text: 'text-green-400', bg: 'bg-green-500/20' },
  business: { text: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  research: { text: 'text-purple-400', bg: 'bg-purple-500/20' },
  legal: { text: 'text-orange-400', bg: 'bg-orange-500/20' },
  manufacturing: { text: 'text-red-400', bg: 'bg-red-500/20' },
};

const SENIORITY_LABELS: Record<SeniorityLevel, string> = {
  entry: 'Entry',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead',
  director: 'Director',
  vp: 'VP',
  c_suite: 'C-Suite',
};

const JOB_EXPORT_COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'company', label: 'Company' },
  { key: 'location', label: 'Location' },
  { key: 'category', label: 'Category' },
  { key: 'seniorityLevel', label: 'Seniority Level' },
  { key: 'salaryMin', label: 'Salary Min' },
  { key: 'salaryMax', label: 'Salary Max' },
  { key: 'remoteOk', label: 'Remote OK' },
  { key: 'clearanceRequired', label: 'Clearance Required' },
  { key: 'postedDate', label: 'Posted Date' },
  { key: 'sourceUrl', label: 'Source URL' },
];

const TREND_EXPORT_COLUMNS = [
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
  { key: 'totalOpenings', label: 'Total Openings' },
  { key: 'totalHires', label: 'Total Hires' },
  { key: 'avgSalary', label: 'Avg Salary' },
  { key: 'medianSalary', label: 'Median Salary' },
  { key: 'yoyGrowth', label: 'YoY Growth' },
  { key: 'engineeringOpenings', label: 'Engineering Openings' },
  { key: 'operationsOpenings', label: 'Operations Openings' },
  { key: 'businessOpenings', label: 'Business Openings' },
  { key: 'researchOpenings', label: 'Research Openings' },
];

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
          <h3 className="font-semibold text-slate-900 text-base group-hover:text-nebula-300 transition-colors">
            {job.title}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-slate-500 text-sm">{job.company}</p>
            <Link
              href={`/market-intel?search=${encodeURIComponent(job.company)}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
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
        <span className="text-slate-500">{job.location}</span>
        <span className="text-slate-300">|</span>
        <span className={`px-2 py-0.5 rounded ${cat?.bg || 'bg-slate-100'} ${cat?.text || 'text-slate-500'}`}>
          {catLabel?.icon} {catLabel?.label || job.category}
        </span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500">{senLabel}</span>
        {job.degreeRequired && (
          <>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 capitalize">{job.degreeRequired}</span>
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-nebula-300">
            {formatSalary(job.salaryMin ?? 0)} - {formatSalary(job.salaryMax ?? 0)}
          </span>
          {job.yearsExperience !== null && job.yearsExperience !== undefined && (
            <span className="text-xs text-slate-500">
              {job.yearsExperience === 0 ? 'No exp required' : `${job.yearsExperience}+ years`}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">{daysAgo(job.postedDate)}</span>
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
        <h3 className="font-semibold text-slate-900 text-base">
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
          <span className="text-slate-500 text-xs block mb-1">Total Openings</span>
          <div className="text-slate-900 font-bold text-lg">{trend.totalOpenings.toLocaleString()}</div>
        </div>
        <div>
          <span className="text-slate-500 text-xs block mb-1">Total Hires</span>
          <div className="text-slate-900 font-bold text-lg">{(trend.totalHires ?? 0).toLocaleString()}</div>
        </div>
        <div>
          <span className="text-slate-500 text-xs block mb-1">Avg Salary</span>
          <div className="text-green-400 font-bold text-lg">{formatSalary(trend.avgSalary ?? 0)}</div>
        </div>
        <div>
          <span className="text-slate-500 text-xs block mb-1">Median Salary</span>
          <div className="text-nebula-300 font-bold text-lg">{formatSalary(trend.medianSalary ?? 0)}</div>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="border-t border-slate-200 pt-3 mb-3">
        <span className="text-slate-500 text-xs block mb-2">Openings by Category</span>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <div className="text-sm text-blue-400 font-bold">{trend.engineeringOpenings.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500">Eng</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-green-400 font-bold">{trend.operationsOpenings.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500">Ops</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-yellow-400 font-bold">{trend.businessOpenings.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500">Biz</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-purple-400 font-bold">{trend.researchOpenings.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500">R&D</div>
          </div>
        </div>
      </div>

      {/* Top Skills */}
      {topSkills.length > 0 && (
        <div className="border-t border-slate-200 pt-3 mb-3">
          <span className="text-slate-500 text-xs block mb-2">Top Skills</span>
          <div className="flex flex-wrap gap-1.5">
            {topSkills.map((skill) => (
              <span key={skill} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top Companies */}
      {topCompanies.length > 0 && (
        <div className="border-t border-slate-200 pt-3">
          <span className="text-slate-500 text-xs block mb-2">Top Hiring</span>
          <div className="flex flex-wrap gap-1.5">
            {topCompanies.map((company) => (
              <span key={company} className="text-[10px] px-2 py-0.5 rounded bg-nebula-500/10 text-nebula-300">
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
        <span className="text-xs text-slate-500">{count} roles</span>
      </div>

      <div className="relative h-4 bg-slate-50 rounded-full overflow-hidden mb-2">
        <div
          className="absolute h-full bg-slate-100 rounded-full"
          style={{ left: `${minPct}%`, width: `${Math.max(maxPct - minPct, 1)}%` }}
        />
        <div
          className="absolute h-full w-1 bg-nebula-400 rounded-full"
          style={{ left: `${medianPct}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-slate-500">
        <span>{formatSalary(avgMin)}</span>
        <span className="text-nebula-300 font-medium">Median: {formatSalary(avgMedian)}</span>
        <span>{formatSalary(avgMax)}</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Workforce Content (with URL state)
// ────────────────────────────────────────

function WorkforceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read initial values from URL
  const initialTab = (searchParams.get('tab') as 'jobs' | 'trends' | 'salaries') || 'jobs';
  const initialCategory = (searchParams.get('category') as JobCategory | '') || '';
  const initialSeniority = (searchParams.get('seniority') as SeniorityLevel | '') || '';
  const initialRemote = searchParams.get('remote') === 'true';
  const initialSearch = searchParams.get('search') || '';
  const initialSalaryView = (searchParams.get('salaryView') as 'category' | 'seniority') || 'category';

  const [activeTab, setActiveTab] = useState<'jobs' | 'trends' | 'salaries'>(initialTab);

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
  const [stats, setStats] = useState<WorkforceStats | null>(null);

  const JOBS_PER_PAGE = 15;

  // ── URL sync helper ──
  const updateUrl = useCallback(
    (updates: Record<string, string | boolean | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        // Remove default values from URL to keep it clean
        if (
          value === null ||
          value === '' ||
          value === false ||
          (key === 'tab' && value === 'jobs') ||
          (key === 'salaryView' && value === 'category')
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

  // Fetch jobs
  const fetchJobs = useCallback(async (offset: number, append: boolean = false) => {
    setJobsLoading(true);
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

      if (!stats && data.stats) setStats(data.stats);
      if (trends.length === 0 && data.trends) setTrends(data.trends);
      if (benchmarksByCategory.length === 0 && data.salaryBenchmarks) {
        setBenchmarksByCategory(data.salaryBenchmarks.byCategory || []);
        setBenchmarksBySeniority(data.salaryBenchmarks.bySeniority || []);
      }

      setTrendsLoading(false);
      setSalariesLoading(false);
    } catch (error) {
      console.error('Failed to fetch workforce data:', error);
    } finally {
      setJobsLoading(false);
    }
  }, [categoryFilter, seniorityFilter, remoteOnly, searchQuery, stats, trends.length, benchmarksByCategory.length]);

  // Initial load
  useEffect(() => {
    setJobsOffset(0);
    fetchJobs(0, false);
  }, [categoryFilter, seniorityFilter, remoteOnly, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = () => {
    const newOffset = jobsOffset + JOBS_PER_PAGE;
    setJobsOffset(newOffset);
    fetchJobs(newOffset, true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setJobsOffset(0);
    updateUrl({ search: searchInput || null });
  };

  const handleTabChange = (tab: 'jobs' | 'trends' | 'salaries') => {
    setActiveTab(tab);
    updateUrl({ tab: tab === 'jobs' ? null : tab });
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

  const clearFilters = () => {
    setCategoryFilter('');
    setSeniorityFilter('');
    setRemoteOnly(false);
    setSearchInput('');
    setSearchQuery('');
    setJobsOffset(0);
    updateUrl({ category: null, seniority: null, remote: null, search: null });
  };

  const hasFilters = categoryFilter || seniorityFilter || remoteOnly || searchQuery;

  return (
    <>
      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="card-elevated p-4 text-center">
            <div className="text-2xl font-bold font-display text-slate-900">
              {stats.totalOpenings.toLocaleString()}
            </div>
            <div className="text-slate-500 text-xs uppercase tracking-widest font-medium">
              Total Openings
            </div>
          </div>
          <div className="card-elevated p-4 text-center">
            <div className="text-2xl font-bold font-display text-green-400">
              {formatSalary(stats.avgSalary)}
            </div>
            <div className="text-slate-500 text-xs uppercase tracking-widest font-medium">
              Avg Salary
            </div>
          </div>
          <div className="card-elevated p-4 text-center">
            <div className="text-2xl font-bold font-display text-nebula-300">
              {JOB_CATEGORIES.find((c) => c.value === stats.topCategory)?.label || stats.topCategory}
            </div>
            <div className="text-slate-500 text-xs uppercase tracking-widest font-medium">
              Top Category
            </div>
          </div>
          <div className="card-elevated p-4 text-center">
            <div className="text-2xl font-bold font-display text-blue-400 truncate">
              {stats.topCompany}
            </div>
            <div className="text-slate-500 text-xs uppercase tracking-widest font-medium">
              Top Employer
            </div>
          </div>
          <div className="card-elevated p-4 text-center">
            <div className="text-2xl font-bold font-display text-purple-400">
              {stats.totalCompanies}
            </div>
            <div className="text-slate-500 text-xs uppercase tracking-widest font-medium">
              Companies
            </div>
          </div>
          <div className="card-elevated p-4 text-center">
            <div
              className={`text-2xl font-bold font-display ${
                (stats.growthRate ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {(stats.growthRate ?? 0) >= 0 ? '+' : ''}
              {(stats.growthRate ?? 0).toFixed(1)}%
            </div>
            <div className="text-slate-500 text-xs uppercase tracking-widest font-medium">
              YoY Growth
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {[
          { id: 'jobs' as const, label: 'Job Postings', count: totalJobs },
          { id: 'trends' as const, label: 'Workforce Trends', count: trends.length },
          { id: 'salaries' as const, label: 'Salary Benchmarks', count: benchmarksByCategory.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-nebula-500 text-slate-900 shadow-glow-sm'
                : 'bg-slate-100/50 text-slate-500 hover:bg-slate-100/50'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-slate-900'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ──────────────── JOB POSTINGS TAB ──────────────── */}
      {activeTab === 'jobs' && (
        <div>
          {/* Search & Filters */}
          <div className="card p-4 mb-6">
            <form onSubmit={handleSearch} className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search jobs by title, company, location, or specialization..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-star-400 focus:outline-none focus:border-nebula-500/50 transition-colors"
                />
                <button type="submit" className="btn-primary px-6">
                  Search
                </button>
              </div>
            </form>

            <div className="flex flex-wrap items-center gap-3">
              {/* Category */}
              <select
                value={categoryFilter}
                onChange={(e) => handleCategoryChange(e.target.value as JobCategory | '')}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-nebula-500/50"
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
                value={seniorityFilter}
                onChange={(e) => handleSeniorityChange(e.target.value as SeniorityLevel | '')}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-nebula-500/50"
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
                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-slate-200'
                }`}
              >
                Remote Only
              </button>

              {/* Clear Filters */}
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Clear Filters
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-slate-500">
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
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No jobs found</h3>
              <p className="text-slate-500 mb-4">
                {hasFilters
                  ? 'Try adjusting your filters or search terms.'
                  : 'Job postings will appear here once data is loaded.'}
              </p>
              {hasFilters && (
                <button onClick={clearFilters} className="btn-secondary">
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

      {/* ──────────────── WORKFORCE TRENDS TAB ──────────────── */}
      {activeTab === 'trends' && (
        <div>
          {trendsLoading ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : trends.length === 0 ? (
            <div className="text-center py-20">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No trend data available</h3>
              <p className="text-slate-500">Workforce trends will appear once data is loaded.</p>
            </div>
          ) : (
            <>
              {/* Summary banner */}
              <div className="card p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-slate-900 font-semibold">Industry Overview</h3>
                  <ExportButton
                    data={trends}
                    filename="spacehub-workforce-trends"
                    columns={TREND_EXPORT_COLUMNS}
                    label="Export Trends"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 text-xs block mb-1">Latest Quarter</span>
                    <span className="text-slate-900 font-bold">
                      Q{trends[trends.length - 1].quarter} {trends[trends.length - 1].year}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block mb-1">Openings Growth</span>
                    <span className="text-green-400 font-bold">
                      {trends.length >= 2
                        ? `${(((trends[trends.length - 1].totalOpenings - trends[0].totalOpenings) / trends[0].totalOpenings) * 100).toFixed(1)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block mb-1">Salary Growth</span>
                    <span className="text-green-400 font-bold">
                      {trends.length >= 2
                        ? `${((((trends[trends.length - 1].avgSalary ?? 0) - (trends[0].avgSalary ?? 0)) / (trends[0].avgSalary || 1)) * 100).toFixed(1)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs block mb-1">Total Hires (Latest)</span>
                    <span className="text-slate-900 font-bold">
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

      {/* ──────────────── SALARY BENCHMARKS TAB ──────────────── */}
      {activeTab === 'salaries' && (
        <div>
          {salariesLoading ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : benchmarksByCategory.length === 0 && benchmarksBySeniority.length === 0 ? (
            <div className="text-center py-20">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No salary data available</h3>
              <p className="text-slate-500">Salary benchmarks will appear once data is loaded.</p>
            </div>
          ) : (
            <>
              {/* View Toggle */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => handleSalaryViewChange('category')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    salaryView === 'category'
                      ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-glow-sm'
                      : 'bg-transparent text-slate-500 border border-slate-200 hover:border-slate-200'
                  }`}
                >
                  By Category
                </button>
                <button
                  onClick={() => handleSalaryViewChange('seniority')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    salaryView === 'seniority'
                      ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-glow-sm'
                      : 'bg-transparent text-slate-500 border border-slate-200 hover:border-slate-200'
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
                        color={colors?.text || 'text-slate-500'}
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
                <div className="flex items-center gap-6 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-2 bg-slate-100 rounded-full" />
                    <span>Salary Range (Min to Max)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-nebula-400 rounded-full" />
                    <span>Median</span>
                  </div>
                  <span className="ml-auto text-slate-500/70">
                    Based on {jobs.length > 0 ? totalJobs : '...'} active job postings
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

// ────────────────────────────────────────
// Main Page
// ────────────────────────────────────────

export default function WorkforcePage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <PageHeader
          title="Space Workforce & Talent Analytics"
          subtitle="Job postings, salary benchmarks, and workforce trends across the space industry"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Workforce' }]}
        />

        <Suspense
          fallback={
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          <WorkforceContent />
        </Suspense>
      </div>
    </div>
  );
}
