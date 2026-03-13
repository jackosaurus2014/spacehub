'use client';

import React from 'react';
import { getTrendIcon } from '@/lib/investor-sentiment';

interface InvestorActivityBadgeProps {
  trend: 'increasing' | 'steady' | 'decreasing';
  label: string;
  color: string;
  recentDeals?: number;
  previousDeals?: number;
}

/**
 * Small badge to display alongside investor cards showing their
 * recent deal activity trend.
 */
export default function InvestorActivityBadge({
  trend,
  label,
  color,
  recentDeals,
  previousDeals,
}: InvestorActivityBadgeProps) {
  const icon = getTrendIcon(trend);

  const bgColor =
    trend === 'increasing'
      ? 'bg-emerald-500/10 border-emerald-500/20'
      : trend === 'decreasing'
      ? 'bg-amber-500/10 border-amber-500/20'
      : 'bg-white/5 border-white/10';

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border ${bgColor}`}
      title={
        recentDeals !== undefined && previousDeals !== undefined
          ? `${recentDeals} deals (last 6mo) vs ${previousDeals} deals (prev 6mo)`
          : label
      }
    >
      <span className={`${color} font-bold text-xs`}>{icon}</span>
      <span className={`${color} font-medium`}>{label}</span>
    </div>
  );
}
