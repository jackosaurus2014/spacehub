'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  SpaceJobPosting,
  WorkforceTrend,
  JobCategory,
  SeniorityLevel,
} from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface SalaryBenchmark {
  category: JobCategory;
  avgMin: number;
  avgMedian: number;
  avgMax: number;
  count: number;
}

interface WorkforceStats {
  totalOpenings: number;
  avgSalary: number;
  topCategory: string;
  growthRate: number;
}

const SENIORITY_LABELS: Record<SeniorityLevel, string> = {
  entry: 'Entry',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead',
  director: 'Director',
  vp: 'VP',
  c_suite: 'C-Suite',
};

const CATEGORY_LABELS: Record<JobCategory, { label: string; color: string }> = {
  engineering: { label: 'Engineering', color: 'text-blue-400 bg-blue-500/20' },
  operations: { label: 'Operations', color: 'text-green-400 bg-green-500/20' },
  business: { label: 'Business', color: 'text-yellow-400 bg-yellow-500/20' },
  research: { label: 'Research', color: 'text-purple-400 bg-purple-500/20' },
  legal: { label: 'Legal', color: 'text-orange-400 bg-orange-500/20' },
  manufacturing: { label: 'Manufacturing', color: 'text-red-400 bg-red-500/20' },
};

function formatSalary(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}K`;
}

function JobPostingCard({ job }: { job: SpaceJobPosting }) {
  const categoryInfo = CATEGORY_LABELS[job.category as JobCategory];
  const seniorityLabel = SENIORITY_LABELS[job.seniorityLevel as SeniorityLevel] || job.seniorityLevel;

  return (
    <div className="bg-space-700/30 rounded-lg p-4 hover:bg-space-700/50 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white text-sm truncate">{job.title}</h4>
          <p className="text-star-300 text-xs">{job.company}</p>
        </div>
        {job.remoteOk && (
          <span className="text-xs bg-nebula-500/20 text-nebula-300 px-2 py-0.5 rounded ml-2 whitespace-nowrap">
            Remote
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2 text-xs">
        <span className="text-star-400">{job.location}</span>
        <span className="text-space-500">|</span>
        <span className={`px-1.5 py-0.5 rounded ${categoryInfo?.color || 'text-star-300 bg-space-600'}`}>
          {categoryInfo?.label || job.category}
        </span>
        <span className="text-space-500">|</span>
        <span className="text-star-300">{seniorityLabel}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-nebula-300">
          {formatSalary(job.salaryMin ?? 0)} - {formatSalary(job.salaryMax ?? 0)}
        </span>
        {job.clearanceRequired && (
          <span className="text-xs text-yellow-400 bg-yellow-500/20 px-1.5 py-0.5 rounded">
            Clearance
          </span>
        )}
      </div>
    </div>
  );
}

function TrendCard({ trend }: { trend: WorkforceTrend }) {
  const yoyGrowth = trend.yoyGrowth ?? 0;
  const isGrowthPositive = yoyGrowth >= 0;

  return (
    <div className="bg-space-700/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white">
          Q{trend.quarter} {trend.year}
        </span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded ${
            isGrowthPositive
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {isGrowthPositive ? '+' : ''}{yoyGrowth.toFixed(1)}% YoY
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-star-400">Openings</span>
          <div className="text-white font-medium text-sm">{trend.totalOpenings.toLocaleString()}</div>
        </div>
        <div>
          <span className="text-star-400">Avg Salary</span>
          <div className="text-white font-medium text-sm">{formatSalary(trend.avgSalary ?? 0)}</div>
        </div>
        <div>
          <span className="text-star-400">Hires</span>
          <div className="text-white font-medium text-sm">{(trend.totalHires ?? 0).toLocaleString()}</div>
        </div>
        <div>
          <span className="text-star-400">Median Salary</span>
          <div className="text-white font-medium text-sm">{formatSalary(trend.medianSalary ?? 0)}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1">
        <div className="text-center">
          <div className="text-xs text-blue-400 font-medium">{trend.engineeringOpenings}</div>
          <div className="text-[10px] text-star-400">Eng</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-green-400 font-medium">{trend.operationsOpenings}</div>
          <div className="text-[10px] text-star-400">Ops</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-yellow-400 font-medium">{trend.businessOpenings}</div>
          <div className="text-[10px] text-star-400">Biz</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-purple-400 font-medium">{trend.researchOpenings}</div>
          <div className="text-[10px] text-star-400">R&D</div>
        </div>
      </div>
    </div>
  );
}

function SalaryBenchmarkBar({ benchmark }: { benchmark: SalaryBenchmark }) {
  const categoryInfo = CATEGORY_LABELS[benchmark.category];
  const maxRange = 500000; // max salary for bar scale
  const minPct = (benchmark.avgMin / maxRange) * 100;
  const medianPct = (benchmark.avgMedian / maxRange) * 100;
  const maxPct = (benchmark.avgMax / maxRange) * 100;

  return (
    <div className="bg-space-700/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${categoryInfo?.color || 'text-star-300 bg-space-600'}`}>
          {categoryInfo?.label || benchmark.category}
        </span>
        <span className="text-xs text-star-400">{benchmark.count} roles</span>
      </div>

      <div className="relative h-3 bg-space-800 rounded-full overflow-hidden mb-1">
        <div
          className="absolute h-full bg-space-600 rounded-full"
          style={{ left: `${minPct}%`, width: `${Math.max(maxPct - minPct, 1)}%` }}
        />
        <div
          className="absolute h-full w-1 bg-nebula-400 rounded-full"
          style={{ left: `${medianPct}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-star-400">
        <span>{formatSalary(benchmark.avgMin)}</span>
        <span className="text-nebula-300 font-medium">Median: {formatSalary(benchmark.avgMedian)}</span>
        <span>{formatSalary(benchmark.avgMax)}</span>
      </div>
    </div>
  );
}

export default function SpaceWorkforceModule() {
  const [jobs, setJobs] = useState<SpaceJobPosting[]>([]);
  const [trends, setTrends] = useState<WorkforceTrend[]>([]);
  const [stats, setStats] = useState<WorkforceStats | null>(null);
  const [salaryBenchmarks, setSalaryBenchmarks] = useState<SalaryBenchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [activeTab, setActiveTab] = useState<'jobs' | 'trends' | 'salaries'>('jobs');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/workforce');
      const data = await res.json();

      if (data.jobs) setJobs(data.jobs);
      if (data.trends) setTrends(data.trends);
      if (data.stats) setStats(data.stats);
      if (data.salaryBenchmarks?.byCategory) setSalaryBenchmarks(data.salaryBenchmarks.byCategory);
    } catch (error) {
      console.error('Failed to fetch workforce data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch('/api/workforce/init', { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error('Failed to initialize workforce data:', error);
    } finally {
      setInitializing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!stats || (jobs.length === 0 && trends.length === 0)) {
    return (
      <div className="card p-8 text-center">
        <span className="text-5xl block mb-4">{'\uD83D\uDC54'}</span>
        <h3 className="text-xl font-semibold text-white mb-2">Space Workforce & Talent Analytics</h3>
        <p className="text-star-300 mb-4">
          Track job postings, salary benchmarks, and workforce trends across the space industry.
        </p>
        <button
          onClick={handleInitialize}
          disabled={initializing}
          className="btn-primary"
        >
          {initializing ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              Loading Data...
            </span>
          ) : (
            'Load Data'
          )}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{'\uD83D\uDC54'}</span>
          <div>
            <h2 className="text-2xl font-display font-bold text-white">
              Space Workforce & Talent Analytics
            </h2>
            <p className="text-star-300 text-sm">Jobs, salaries & workforce trends</p>
          </div>
        </div>
        <Link
          href="/workforce"
          className="text-nebula-300 hover:text-nebula-200 transition-colors text-sm"
        >
          Full Dashboard →
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-white">
            {stats.totalOpenings.toLocaleString()}
          </div>
          <div className="text-star-300 text-xs">Total Openings</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-green-400">
            {(stats.avgSalary ?? 0).toFixed(0)}
          </div>
          <div className="text-star-300 text-xs">Avg Salary ($K)</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-nebula-300">
            {CATEGORY_LABELS[stats.topCategory as JobCategory]?.label || stats.topCategory}
          </div>
          <div className="text-star-300 text-xs">Top Category</div>
        </div>
        <div className="card p-3 text-center">
          <div
            className={`text-2xl font-bold ${
              (stats.growthRate ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {(stats.growthRate ?? 0) >= 0 ? '+' : ''}{(stats.growthRate ?? 0).toFixed(1)}
          </div>
          <div className="text-star-300 text-xs">YoY Growth (%)</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {[
          { id: 'jobs', label: 'Job Postings', icon: '\uD83D\uDCCB' },
          { id: 'trends', label: 'Workforce Trends', icon: '\uD83D\uDCC8' },
          { id: 'salaries', label: 'Salary Benchmarks', icon: '\uD83D\uDCB0' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-nebula-500 text-white'
                : 'bg-space-700/50 text-star-300 hover:bg-space-600/50'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'jobs' && (
        <div className="space-y-3">
          {jobs.slice(0, 8).map((job) => (
            <JobPostingCard key={job.id} job={job} />
          ))}
          {jobs.length === 0 && (
            <p className="text-star-400 text-sm text-center py-4">No job postings available.</p>
          )}
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trends.slice(0, 4).map((trend) => (
            <TrendCard key={trend.id} trend={trend} />
          ))}
          {trends.length === 0 && (
            <p className="text-star-400 text-sm text-center py-4 col-span-2">No trend data available.</p>
          )}
        </div>
      )}

      {activeTab === 'salaries' && (
        <div className="space-y-3">
          {salaryBenchmarks.map((benchmark) => (
            <SalaryBenchmarkBar key={benchmark.category} benchmark={benchmark} />
          ))}
          {salaryBenchmarks.length === 0 && (
            <p className="text-star-400 text-sm text-center py-4">No salary benchmarks available.</p>
          )}
        </div>
      )}
    </div>
  );
}
