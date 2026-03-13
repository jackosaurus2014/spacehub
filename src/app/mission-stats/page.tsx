'use client';

import { useState, useMemo } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface YearData {
  year: number;
  totalLaunches: number;
  successRate: number;
  mostActive: string;
  mostActiveLaunches: number;
  busiestSite: string;
  providers: Provider[];
  sites: Site[];
  orbitDistribution: OrbitSlice[];
  payloadTypes: PayloadSlice[];
}

interface Provider {
  name: string;
  launches: number;
  successRate: number;
}

interface Site {
  name: string;
  launches: number;
}

interface OrbitSlice {
  label: string;
  pct: number;
  color: string;
}

interface PayloadSlice {
  label: string;
  pct: number;
  color: string;
}

const ALL_YEAR_DATA: YearData[] = [
  {
    year: 2024,
    totalLaunches: 230,
    successRate: 96.1,
    mostActive: 'SpaceX',
    mostActiveLaunches: 135,
    busiestSite: 'Cape Canaveral',
    providers: [
      { name: 'SpaceX', launches: 135, successRate: 99.5 },
      { name: 'CASC / China', launches: 68, successRate: 94.1 },
      { name: 'Roscosmos', launches: 15, successRate: 93.3 },
      { name: 'Rocket Lab', launches: 11, successRate: 100 },
      { name: 'ULA', launches: 8, successRate: 100 },
      { name: 'Arianespace', launches: 6, successRate: 83.3 },
      { name: 'ISRO', launches: 5, successRate: 100 },
      { name: 'JAXA', launches: 3, successRate: 100 },
    ],
    sites: [
      { name: 'Cape Canaveral', launches: 75 },
      { name: 'Vandenberg', launches: 32 },
      { name: 'Xichang', launches: 24 },
      { name: 'Jiuquan', launches: 20 },
      { name: 'Baikonur', launches: 15 },
      { name: 'Mahia', launches: 11 },
      { name: 'Kourou', launches: 6 },
      { name: 'Sriharikota', launches: 5 },
    ],
    orbitDistribution: [
      { label: 'LEO', pct: 68, color: 'bg-white' },
      { label: 'SSO', pct: 15, color: 'bg-blue-500' },
      { label: 'GTO', pct: 10, color: 'bg-purple-500' },
      { label: 'MEO', pct: 4, color: 'bg-amber-500' },
      { label: 'Other', pct: 3, color: 'bg-slate-500' },
    ],
    payloadTypes: [
      { label: 'Commercial Comms', pct: 40, color: 'bg-white' },
      { label: 'Earth Observation', pct: 22, color: 'bg-emerald-500' },
      { label: 'Navigation', pct: 12, color: 'bg-blue-500' },
      { label: 'Military', pct: 10, color: 'bg-red-500' },
      { label: 'Science', pct: 8, color: 'bg-purple-500' },
      { label: 'Rideshare', pct: 5, color: 'bg-amber-500' },
      { label: 'Other', pct: 3, color: 'bg-slate-500' },
    ],
  },
  {
    year: 2023,
    totalLaunches: 212,
    successRate: 95.3,
    mostActive: 'SpaceX',
    mostActiveLaunches: 98,
    busiestSite: 'Cape Canaveral',
    providers: [
      { name: 'SpaceX', launches: 98, successRate: 99.0 },
      { name: 'CASC / China', launches: 67, successRate: 92.5 },
      { name: 'Roscosmos', launches: 19, successRate: 94.7 },
      { name: 'Rocket Lab', launches: 10, successRate: 100 },
      { name: 'ULA', launches: 3, successRate: 100 },
      { name: 'Arianespace', launches: 4, successRate: 75.0 },
      { name: 'ISRO', launches: 7, successRate: 100 },
      { name: 'JAXA', launches: 4, successRate: 75.0 },
    ],
    sites: [
      { name: 'Cape Canaveral', launches: 62 },
      { name: 'Vandenberg', launches: 28 },
      { name: 'Xichang', launches: 22 },
      { name: 'Jiuquan', launches: 19 },
      { name: 'Baikonur', launches: 18 },
      { name: 'Mahia', launches: 10 },
      { name: 'Kourou', launches: 4 },
      { name: 'Sriharikota', launches: 7 },
    ],
    orbitDistribution: [
      { label: 'LEO', pct: 65, color: 'bg-white' },
      { label: 'SSO', pct: 16, color: 'bg-blue-500' },
      { label: 'GTO', pct: 11, color: 'bg-purple-500' },
      { label: 'MEO', pct: 5, color: 'bg-amber-500' },
      { label: 'Other', pct: 3, color: 'bg-slate-500' },
    ],
    payloadTypes: [
      { label: 'Commercial Comms', pct: 38, color: 'bg-white' },
      { label: 'Earth Observation', pct: 23, color: 'bg-emerald-500' },
      { label: 'Navigation', pct: 13, color: 'bg-blue-500' },
      { label: 'Military', pct: 9, color: 'bg-red-500' },
      { label: 'Science', pct: 9, color: 'bg-purple-500' },
      { label: 'Rideshare', pct: 5, color: 'bg-amber-500' },
      { label: 'Other', pct: 3, color: 'bg-slate-500' },
    ],
  },
  {
    year: 2022,
    totalLaunches: 186,
    successRate: 94.6,
    mostActive: 'SpaceX',
    mostActiveLaunches: 61,
    busiestSite: 'Cape Canaveral',
    providers: [
      { name: 'SpaceX', launches: 61, successRate: 100 },
      { name: 'CASC / China', launches: 64, successRate: 90.6 },
      { name: 'Roscosmos', launches: 22, successRate: 95.5 },
      { name: 'Rocket Lab', launches: 9, successRate: 88.9 },
      { name: 'ULA', launches: 5, successRate: 100 },
      { name: 'Arianespace', launches: 6, successRate: 100 },
      { name: 'ISRO', launches: 5, successRate: 100 },
      { name: 'JAXA', launches: 2, successRate: 100 },
    ],
    sites: [
      { name: 'Cape Canaveral', launches: 48 },
      { name: 'Vandenberg', launches: 15 },
      { name: 'Xichang', launches: 22 },
      { name: 'Jiuquan', launches: 18 },
      { name: 'Baikonur', launches: 20 },
      { name: 'Mahia', launches: 9 },
      { name: 'Kourou', launches: 6 },
      { name: 'Sriharikota', launches: 5 },
    ],
    orbitDistribution: [
      { label: 'LEO', pct: 62, color: 'bg-white' },
      { label: 'SSO', pct: 17, color: 'bg-blue-500' },
      { label: 'GTO', pct: 12, color: 'bg-purple-500' },
      { label: 'MEO', pct: 5, color: 'bg-amber-500' },
      { label: 'Other', pct: 4, color: 'bg-slate-500' },
    ],
    payloadTypes: [
      { label: 'Commercial Comms', pct: 35, color: 'bg-white' },
      { label: 'Earth Observation', pct: 25, color: 'bg-emerald-500' },
      { label: 'Navigation', pct: 14, color: 'bg-blue-500' },
      { label: 'Military', pct: 8, color: 'bg-red-500' },
      { label: 'Science', pct: 10, color: 'bg-purple-500' },
      { label: 'Rideshare', pct: 4, color: 'bg-amber-500' },
      { label: 'Other', pct: 4, color: 'bg-slate-500' },
    ],
  },
  {
    year: 2021,
    totalLaunches: 146,
    successRate: 93.8,
    mostActive: 'SpaceX',
    mostActiveLaunches: 31,
    busiestSite: 'Cape Canaveral',
    providers: [
      { name: 'SpaceX', launches: 31, successRate: 100 },
      { name: 'CASC / China', launches: 55, successRate: 90.9 },
      { name: 'Roscosmos', launches: 25, successRate: 96.0 },
      { name: 'Rocket Lab', launches: 6, successRate: 83.3 },
      { name: 'ULA', launches: 7, successRate: 100 },
      { name: 'Arianespace', launches: 6, successRate: 100 },
      { name: 'ISRO', launches: 3, successRate: 66.7 },
      { name: 'JAXA', launches: 3, successRate: 100 },
    ],
    sites: [
      { name: 'Cape Canaveral', launches: 31 },
      { name: 'Vandenberg', launches: 8 },
      { name: 'Xichang', launches: 20 },
      { name: 'Jiuquan', launches: 16 },
      { name: 'Baikonur', launches: 22 },
      { name: 'Mahia', launches: 6 },
      { name: 'Kourou', launches: 6 },
      { name: 'Sriharikota', launches: 3 },
    ],
    orbitDistribution: [
      { label: 'LEO', pct: 58, color: 'bg-white' },
      { label: 'SSO', pct: 18, color: 'bg-blue-500' },
      { label: 'GTO', pct: 14, color: 'bg-purple-500' },
      { label: 'MEO', pct: 6, color: 'bg-amber-500' },
      { label: 'Other', pct: 4, color: 'bg-slate-500' },
    ],
    payloadTypes: [
      { label: 'Commercial Comms', pct: 32, color: 'bg-white' },
      { label: 'Earth Observation', pct: 24, color: 'bg-emerald-500' },
      { label: 'Navigation', pct: 15, color: 'bg-blue-500' },
      { label: 'Military', pct: 10, color: 'bg-red-500' },
      { label: 'Science', pct: 11, color: 'bg-purple-500' },
      { label: 'Rideshare', pct: 4, color: 'bg-amber-500' },
      { label: 'Other', pct: 4, color: 'bg-slate-500' },
    ],
  },
  {
    year: 2020,
    totalLaunches: 114,
    successRate: 92.1,
    mostActive: 'CASC / China',
    mostActiveLaunches: 39,
    busiestSite: 'Xichang',
    providers: [
      { name: 'SpaceX', launches: 26, successRate: 100 },
      { name: 'CASC / China', launches: 39, successRate: 89.7 },
      { name: 'Roscosmos', launches: 17, successRate: 94.1 },
      { name: 'Rocket Lab', launches: 7, successRate: 85.7 },
      { name: 'ULA', launches: 6, successRate: 100 },
      { name: 'Arianespace', launches: 5, successRate: 100 },
      { name: 'ISRO', launches: 2, successRate: 100 },
      { name: 'JAXA', launches: 4, successRate: 100 },
    ],
    sites: [
      { name: 'Cape Canaveral', launches: 25 },
      { name: 'Vandenberg', launches: 5 },
      { name: 'Xichang', launches: 18 },
      { name: 'Jiuquan', launches: 10 },
      { name: 'Baikonur', launches: 15 },
      { name: 'Mahia', launches: 7 },
      { name: 'Kourou', launches: 5 },
      { name: 'Sriharikota', launches: 2 },
    ],
    orbitDistribution: [
      { label: 'LEO', pct: 55, color: 'bg-white' },
      { label: 'SSO', pct: 18, color: 'bg-blue-500' },
      { label: 'GTO', pct: 16, color: 'bg-purple-500' },
      { label: 'MEO', pct: 6, color: 'bg-amber-500' },
      { label: 'Other', pct: 5, color: 'bg-slate-500' },
    ],
    payloadTypes: [
      { label: 'Commercial Comms', pct: 30, color: 'bg-white' },
      { label: 'Earth Observation', pct: 22, color: 'bg-emerald-500' },
      { label: 'Navigation', pct: 18, color: 'bg-blue-500' },
      { label: 'Military', pct: 12, color: 'bg-red-500' },
      { label: 'Science', pct: 10, color: 'bg-purple-500' },
      { label: 'Rideshare', pct: 3, color: 'bg-amber-500' },
      { label: 'Other', pct: 5, color: 'bg-slate-500' },
    ],
  },
  {
    year: 2019,
    totalLaunches: 102,
    successRate: 94.1,
    mostActive: 'CASC / China',
    mostActiveLaunches: 34,
    busiestSite: 'Xichang',
    providers: [
      { name: 'SpaceX', launches: 13, successRate: 100 },
      { name: 'CASC / China', launches: 34, successRate: 91.2 },
      { name: 'Roscosmos', launches: 25, successRate: 96.0 },
      { name: 'Rocket Lab', launches: 6, successRate: 100 },
      { name: 'ULA', launches: 5, successRate: 100 },
      { name: 'Arianespace', launches: 9, successRate: 100 },
      { name: 'ISRO', launches: 6, successRate: 83.3 },
      { name: 'JAXA', launches: 2, successRate: 100 },
    ],
    sites: [
      { name: 'Cape Canaveral', launches: 16 },
      { name: 'Vandenberg', launches: 3 },
      { name: 'Xichang', launches: 17 },
      { name: 'Jiuquan', launches: 8 },
      { name: 'Baikonur', launches: 22 },
      { name: 'Mahia', launches: 6 },
      { name: 'Kourou', launches: 9 },
      { name: 'Sriharikota', launches: 6 },
    ],
    orbitDistribution: [
      { label: 'LEO', pct: 50, color: 'bg-white' },
      { label: 'SSO', pct: 20, color: 'bg-blue-500' },
      { label: 'GTO', pct: 18, color: 'bg-purple-500' },
      { label: 'MEO', pct: 7, color: 'bg-amber-500' },
      { label: 'Other', pct: 5, color: 'bg-slate-500' },
    ],
    payloadTypes: [
      { label: 'Commercial Comms', pct: 28, color: 'bg-white' },
      { label: 'Earth Observation', pct: 20, color: 'bg-emerald-500' },
      { label: 'Navigation', pct: 20, color: 'bg-blue-500' },
      { label: 'Military', pct: 14, color: 'bg-red-500' },
      { label: 'Science', pct: 10, color: 'bg-purple-500' },
      { label: 'Rideshare', pct: 2, color: 'bg-amber-500' },
      { label: 'Other', pct: 6, color: 'bg-slate-500' },
    ],
  },
  {
    year: 2018,
    totalLaunches: 114,
    successRate: 93.9,
    mostActive: 'CASC / China',
    mostActiveLaunches: 39,
    busiestSite: 'Xichang',
    providers: [
      { name: 'SpaceX', launches: 21, successRate: 100 },
      { name: 'CASC / China', launches: 39, successRate: 89.7 },
      { name: 'Roscosmos', launches: 20, successRate: 95.0 },
      { name: 'Rocket Lab', launches: 3, successRate: 66.7 },
      { name: 'ULA', launches: 8, successRate: 100 },
      { name: 'Arianespace', launches: 11, successRate: 100 },
      { name: 'ISRO', launches: 7, successRate: 100 },
      { name: 'JAXA', launches: 6, successRate: 100 },
    ],
    sites: [
      { name: 'Cape Canaveral', launches: 22 },
      { name: 'Vandenberg', launches: 8 },
      { name: 'Xichang', launches: 17 },
      { name: 'Jiuquan', launches: 10 },
      { name: 'Baikonur', launches: 18 },
      { name: 'Mahia', launches: 3 },
      { name: 'Kourou', launches: 11 },
      { name: 'Sriharikota', launches: 7 },
    ],
    orbitDistribution: [
      { label: 'LEO', pct: 48, color: 'bg-white' },
      { label: 'SSO', pct: 20, color: 'bg-blue-500' },
      { label: 'GTO', pct: 20, color: 'bg-purple-500' },
      { label: 'MEO', pct: 7, color: 'bg-amber-500' },
      { label: 'Other', pct: 5, color: 'bg-slate-500' },
    ],
    payloadTypes: [
      { label: 'Commercial Comms', pct: 30, color: 'bg-white' },
      { label: 'Earth Observation', pct: 18, color: 'bg-emerald-500' },
      { label: 'Navigation', pct: 22, color: 'bg-blue-500' },
      { label: 'Military', pct: 12, color: 'bg-red-500' },
      { label: 'Science', pct: 10, color: 'bg-purple-500' },
      { label: 'Rideshare', pct: 2, color: 'bg-amber-500' },
      { label: 'Other', pct: 6, color: 'bg-slate-500' },
    ],
  },
];

const YEAR_LAUNCH_TOTALS = [
  { year: 2018, launches: 114 },
  { year: 2019, launches: 102 },
  { year: 2020, launches: 114 },
  { year: 2021, launches: 146 },
  { year: 2022, launches: 186 },
  { year: 2023, launches: 212 },
  { year: 2024, launches: 230 },
];

type SortField = 'launches' | 'successRate' | 'name';
type SortDir = 'asc' | 'desc';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MissionStatsPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [providerSort, setProviderSort] = useState<{ field: SortField; dir: SortDir }>({
    field: 'launches',
    dir: 'desc',
  });

  const yearData = useMemo(
    () => ALL_YEAR_DATA.find((d) => d.year === selectedYear)!,
    [selectedYear],
  );

  const sortedProviders = useMemo(() => {
    const list = [...yearData.providers];
    list.sort((a, b) => {
      let cmp = 0;
      if (providerSort.field === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else {
        cmp = a[providerSort.field] - b[providerSort.field];
      }
      return providerSort.dir === 'desc' ? -cmp : cmp;
    });
    return list;
  }, [yearData, providerSort]);

  const maxBarLaunches = Math.max(...YEAR_LAUNCH_TOTALS.map((d) => d.launches));
  const maxSiteLaunches = Math.max(...yearData.sites.map((s) => s.launches));

  function toggleProviderSort(field: SortField) {
    setProviderSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  }

  function sortIcon(field: SortField) {
    if (providerSort.field !== field) return '';
    return providerSort.dir === 'desc' ? ' \u25BC' : ' \u25B2';
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* ---------- Header ---------- */}
        <AnimatedPageHeader
          title="Mission Statistics"
          subtitle="Comprehensive launch data and trends across the global space industry."
          breadcrumb="SpaceNexus / Analytics"
          accentColor="cyan"
        />

        {/* ---------- Year filter ---------- */}
        <ScrollReveal>
          <div className="mb-10 flex flex-wrap items-center gap-2">
            <span className="mr-2 text-sm font-medium text-slate-400">Filter by year:</span>
            {YEAR_LAUNCH_TOTALS.map((d) => (
              <button
                key={d.year}
                onClick={() => setSelectedYear(d.year)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  selectedYear === d.year
                    ? 'bg-white text-white shadow-lg shadow-black/20/25'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/80'
                }`}
              >
                {d.year}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* ---------- KPI cards ---------- */}
        <ScrollReveal>
          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Total Orbital Launches" value={yearData.totalLaunches} sub={`In ${selectedYear}`} accent="cyan" />
            <KpiCard label="Global Success Rate" value={`${yearData.successRate}%`} sub={`${selectedYear} missions`} accent="emerald" />
            <KpiCard label="Most Active Provider" value={yearData.mostActive} sub={`${yearData.mostActiveLaunches} launches`} accent="purple" />
            <KpiCard label="Busiest Launch Site" value={yearData.busiestSite} sub={`${selectedYear}`} accent="amber" />
          </div>
        </ScrollReveal>

        {/* ---------- Launches by year bar chart ---------- */}
        <ScrollReveal delay={0.05}>
          <section className="mb-10 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
            <h2 className="mb-6 text-xl font-bold text-white">Launches by Year (2018 - 2024)</h2>
            <div className="flex items-end gap-3 sm:gap-5" style={{ height: 260 }}>
              {YEAR_LAUNCH_TOTALS.map((d) => {
                const heightPct = (d.launches / maxBarLaunches) * 100;
                const isSelected = d.year === selectedYear;
                return (
                  <button
                    key={d.year}
                    onClick={() => setSelectedYear(d.year)}
                    className="group relative flex flex-1 flex-col items-center"
                    style={{ height: '100%' }}
                  >
                    <span className="mb-1 text-xs font-bold text-slate-200">{d.launches}</span>
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className={`w-full rounded-t-md transition-all duration-500 ${
                          isSelected
                            ? 'bg-gradient-to-t from-slate-200 to-slate-400 shadow-lg shadow-black/15'
                            : 'bg-gradient-to-t from-slate-600 to-slate-500 group-hover:from-slate-500 group-hover:to-slate-400'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span
                      className={`mt-2 text-xs font-semibold ${
                        isSelected ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {d.year}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </ScrollReveal>

        {/* ---------- Two-column: Provider leaderboard + Launch sites ---------- */}
        <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Provider leaderboard */}
          <ScrollReveal delay={0.1}>
            <section className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
              <h2 className="mb-4 text-xl font-bold text-white">Provider Leaderboard ({selectedYear})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/60 text-slate-400">
                      <th className="pb-3 pr-4 font-medium">#</th>
                      <th
                        className="cursor-pointer pb-3 pr-4 font-medium hover:text-slate-200"
                        onClick={() => toggleProviderSort('name')}
                      >
                        Provider{sortIcon('name')}
                      </th>
                      <th
                        className="cursor-pointer pb-3 pr-4 text-right font-medium hover:text-slate-200"
                        onClick={() => toggleProviderSort('launches')}
                      >
                        Launches{sortIcon('launches')}
                      </th>
                      <th
                        className="cursor-pointer pb-3 text-right font-medium hover:text-slate-200"
                        onClick={() => toggleProviderSort('successRate')}
                      >
                        Success&nbsp;Rate{sortIcon('successRate')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProviders.map((p, i) => (
                      <tr
                        key={p.name}
                        className="border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20"
                      >
                        <td className="py-3 pr-4 text-slate-500">{i + 1}</td>
                        <td className="py-3 pr-4 font-medium text-slate-100">{p.name}</td>
                        <td className="py-3 pr-4 text-right text-slate-200">{p.launches}</td>
                        <td className="py-3 text-right">
                          <span
                            className={`font-semibold ${
                              p.successRate >= 99
                                ? 'text-emerald-400'
                                : p.successRate >= 95
                                  ? 'text-slate-300'
                                  : p.successRate >= 90
                                    ? 'text-amber-400'
                                    : 'text-red-400'
                            }`}
                          >
                            {p.successRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </ScrollReveal>

          {/* Launch sites */}
          <ScrollReveal delay={0.15}>
            <section className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
              <h2 className="mb-4 text-xl font-bold text-white">Launch Sites ({selectedYear})</h2>
              <div className="space-y-3">
                {yearData.sites.map((site) => {
                  const widthPct = (site.launches / maxSiteLaunches) * 100;
                  return (
                    <div key={site.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-200">{site.name}</span>
                        <span className="text-slate-400">{site.launches} launches</span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-700/50">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-slate-200 to-blue-500 transition-all duration-700"
                          style={{ width: `${widthPct}%` }}
                        />

        <RelatedModules modules={PAGE_RELATIONS['mission-stats']} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </ScrollReveal>
        </div>

        {/* ---------- Two-column: Orbit distribution + Payload types ---------- */}
        <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Orbit distribution */}
          <ScrollReveal delay={0.2}>
            <section className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
              <h2 className="mb-4 text-xl font-bold text-white">Orbit Distribution ({selectedYear})</h2>

              {/* Stacked bar */}
              <div className="mb-4 flex h-8 w-full overflow-hidden rounded-full">
                {yearData.orbitDistribution.map((o) => (
                  <div
                    key={o.label}
                    className={`${o.color} transition-all duration-700`}
                    style={{ width: `${o.pct}%` }}
                    title={`${o.label}: ${o.pct}%`}
                  />
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4">
                {yearData.orbitDistribution.map((o) => (
                  <div key={o.label} className="flex items-center gap-2 text-sm">
                    <span className={`inline-block h-3 w-3 rounded-sm ${o.color}`} />
                    <span className="text-slate-300">
                      {o.label} <span className="text-slate-500">({o.pct}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </ScrollReveal>

          {/* Payload types */}
          <ScrollReveal delay={0.25}>
            <section className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
              <h2 className="mb-4 text-xl font-bold text-white">Payload Types ({selectedYear})</h2>

              {/* Stacked bar */}
              <div className="mb-4 flex h-8 w-full overflow-hidden rounded-full">
                {yearData.payloadTypes.map((p) => (
                  <div
                    key={p.label}
                    className={`${p.color} transition-all duration-700`}
                    style={{ width: `${p.pct}%` }}
                    title={`${p.label}: ${p.pct}%`}
                  />
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4">
                {yearData.payloadTypes.map((p) => (
                  <div key={p.label} className="flex items-center gap-2 text-sm">
                    <span className={`inline-block h-3 w-3 rounded-sm ${p.color}`} />
                    <span className="text-slate-300">
                      {p.label} <span className="text-slate-500">({p.pct}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </ScrollReveal>
        </div>

        {/* ---------- Footer note ---------- */}
        <ScrollReveal delay={0.3}>
          <p className="text-center text-xs text-slate-500">
            Data compiled from public launch records. Figures are approximate and may differ
            slightly between reporting agencies.
          </p>
        </ScrollReveal>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub: string;
  accent: string;
}) {
  const borderColors: Record<string, string> = {
    cyan: 'border-white/10',
    emerald: 'border-emerald-500/30',
    purple: 'border-purple-500/30',
    amber: 'border-amber-500/30',
  };
  const textColors: Record<string, string> = {
    cyan: 'text-slate-300',
    emerald: 'text-emerald-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
  };

  return (
    <div
      className={`rounded-2xl border bg-slate-800/50 p-5 backdrop-blur-sm ${borderColors[accent] ?? 'border-slate-700/50'}`}
    >
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-2xl font-bold ${textColors[accent] ?? 'text-white'}`}>{value}</p>
      <p className="mt-1 text-sm text-slate-500">{sub}</p>
    </div>
  );
}
