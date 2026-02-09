/**
 * Format large numbers in compact notation.
 * 1200000 → "1.2M", 5300 → "5.3K", 999 → "999"
 */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}

/**
 * Format a number as currency.
 * @param value - The number to format
 * @param compact - If true, uses compact notation ($1.2M instead of $1,200,000)
 * @param currency - Currency code (default: 'USD')
 */
export function formatCurrency(value: number, compact = false, currency = 'USD'): string {
  if (compact) {
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `;
    return `${symbol}${formatCompact(value)}`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number as a percentage.
 * @param value - The number to format (0.15 → "15.0%", 25.3 → "25.3%")
 * @param decimals - Number of decimal places (default: 1)
 */
export function formatPercentage(value: number, decimals = 1): string {
  // If value looks like it's already a percentage (> 1 or < -1), use directly
  // Otherwise treat it as a decimal (0.15 → 15%)
  const pct = Math.abs(value) <= 1 && Math.abs(value) > 0 ? value * 100 : value;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(decimals)}%`;
}

/**
 * Format a relative time string ("2h ago", "3d ago", "just now")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return `${Math.floor(diffDay / 30)}mo ago`;
}
