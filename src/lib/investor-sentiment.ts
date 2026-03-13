/**
 * Investor Sentiment / Activity Tracking
 *
 * Computes trend indicators by comparing deal activity in the recent period
 * versus the previous period (default 6 months each).
 */

export interface InvestorActivityResult {
  trend: 'increasing' | 'steady' | 'decreasing';
  label: string;
  color: string;
}

/**
 * Compute the activity trend for an investor based on deal counts
 * in two consecutive time windows.
 *
 * @param recentDeals  - Number of deals in the most recent period
 * @param previousDeals - Number of deals in the preceding period
 * @returns Trend label, display label, and Tailwind color class
 */
export function computeInvestorActivity(
  recentDeals: number,
  previousDeals: number
): InvestorActivityResult {
  // If there are no deals at all, show as steady
  if (recentDeals === 0 && previousDeals === 0) {
    return {
      trend: 'steady',
      label: 'No recent activity',
      color: 'text-slate-400',
    };
  }

  // Calculate percentage change (handle division by zero)
  if (previousDeals === 0 && recentDeals > 0) {
    return {
      trend: 'increasing',
      label: 'Active',
      color: 'text-emerald-400',
    };
  }

  if (recentDeals === 0 && previousDeals > 0) {
    return {
      trend: 'decreasing',
      label: 'Slowing',
      color: 'text-amber-400',
    };
  }

  const changeRatio = (recentDeals - previousDeals) / previousDeals;

  // More than 20% increase => increasing
  if (changeRatio > 0.2) {
    return {
      trend: 'increasing',
      label: 'Active',
      color: 'text-emerald-400',
    };
  }

  // More than 20% decrease => decreasing
  if (changeRatio < -0.2) {
    return {
      trend: 'decreasing',
      label: 'Slowing',
      color: 'text-amber-400',
    };
  }

  // Within +/- 20% => steady
  return {
    trend: 'steady',
    label: 'Steady',
    color: 'text-slate-300',
  };
}

/**
 * Get the icon/symbol for a given trend.
 */
export function getTrendIcon(trend: 'increasing' | 'steady' | 'decreasing'): string {
  switch (trend) {
    case 'increasing':
      return '\u25B2'; // ▲
    case 'decreasing':
      return '\u25BC'; // ▼
    case 'steady':
      return '\u25CF'; // ●
  }
}
