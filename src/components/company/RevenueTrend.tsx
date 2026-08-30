/**
 * RevenueTrend — three-year annual revenue trend for public companies
 * (SYNTHESIS.md item 35: "is this growing?" is the actual investor
 * question; before this, the profile showed one revenue figure with no
 * history). Populated by /api/cron/sec-revenue-backfill from SEC EDGAR
 * 10-K filings (src/lib/sec-revenue.ts).
 *
 * Takes the RevenueEstimate rows the company-profile API already returns —
 * no separate fetch. Renders nothing when there's no annual (quarter: null)
 * figure yet, e.g. private companies or tickers not yet backfilled.
 *
 * Server-safe (no 'use client'): plain props in, Telemetry tiles out.
 */

import Telemetry from '@/components/ui/Telemetry';

export interface RevenueTrendEstimate {
  year: number;
  quarter: number | null;
  revenue: number | null;
}

function formatRevenue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export default function RevenueTrend({ estimates }: { estimates: RevenueTrendEstimate[] }) {
  const annual = estimates
    .filter((e): e is RevenueTrendEstimate & { revenue: number } => e.quarter === null && e.revenue != null)
    .sort((a, b) => a.year - b.year);

  if (annual.length === 0) return null;

  const recent = annual.slice(-3);

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.06]">
      <div className="text-xs text-slate-500 mb-2">Annual Revenue (10-K)</div>
      <div className="flex flex-wrap gap-5">
        {recent.map((point, i) => {
          const prior = i > 0 ? recent[i - 1] : null;
          const delta =
            prior && prior.revenue
              ? Math.round(((point.revenue - prior.revenue) / prior.revenue) * 1000) / 10
              : undefined;
          return (
            <Telemetry
              key={point.year}
              label={`FY ${point.year}`}
              value={formatRevenue(point.revenue)}
              tone="ink"
              delta={delta !== undefined ? { value: delta, suffix: '%' } : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
