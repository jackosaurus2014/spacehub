'use client';

import { useEffect, useState } from 'react';

interface HiringSeriesPoint {
  date: string;
  activeJobs: number;
}

interface HiringSeriesResponse {
  companyName: string;
  series: HiringSeriesPoint[];
  latest: number | null;
  latestDate: string | null;
  changeVs30d: number | null;
  hasEnoughHistory: boolean;
}

interface HiringTrendProps {
  /** CompanyProfile slug (preferred) or raw company name to look up. */
  companySlug: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Small hiring-velocity sparkline for a company: "N jobs today, +/-M vs 30d
 * ago". Investors read hiring trends as a leading indicator, but the
 * dataset only starts accumulating once CompanyJobSnapshot rows exist —
 * this component is honest about that and renders nothing until there's
 * at least a week of history rather than showing a misleading single point.
 */
export default function HiringTrend({ companySlug, width = 96, height = 28, className }: HiringTrendProps) {
  const [data, setData] = useState<HiringSeriesResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchTrend() {
      try {
        const res = await fetch(`/api/hiring-trends?company=${encodeURIComponent(companySlug)}`);
        const json = await res.json();
        if (!cancelled) setData(json.series ?? null);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    fetchTrend();
    return () => {
      cancelled = true;
    };
  }, [companySlug]);

  // Sparse-data guard: say nothing rather than show a misleading chart.
  if (!loaded) return null;
  if (!data || !data.hasEnoughHistory || data.series.length < 7 || data.latest === null) return null;

  const { series, latest, changeVs30d } = data;
  const values = series.map((p) => p.activeJobs);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((value, index) => {
    const x = values.length > 1 ? (index / (values.length - 1)) * width : width;
    const y = height - ((value - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pathD = `M ${points.join(' L ')}`;

  const direction = changeVs30d === null ? 'unknown' : changeVs30d > 0 ? 'up' : changeVs30d < 0 ? 'down' : 'flat';
  const color = direction === 'up' ? '#4ade80' : direction === 'down' ? '#f87171' : '#94a3b8';
  const arrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '—';

  const changeLabel =
    changeVs30d === null
      ? 'not enough history for a 30-day comparison yet'
      : changeVs30d === 0
        ? 'flat vs 30d ago'
        : `${arrow} ${changeVs30d > 0 ? '+' : ''}${changeVs30d} vs 30d ago`;

  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible shrink-0"
        aria-hidden="true"
      >
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-xs text-slate-300 whitespace-nowrap">
        <span className="font-medium text-white">{latest} jobs today</span>
        <span className="text-slate-500">, </span>
        <span style={{ color }}>{changeLabel}</span>
      </span>
    </div>
  );
}
