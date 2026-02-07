'use client';

import { useState, useEffect } from 'react';
import StockMiniChart from './StockMiniChart';

interface StockData {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  change30D: number;
  marketCap: number;
  chartData: number[];
  success: boolean;
}

interface StockCardProps {
  ticker: string;
  exchange: string;
  companyName: string;
  onDataLoad?: (data: StockData) => void;
}

function formatPrice(price: number): string {
  return price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMarketCap(cap: number): string {
  if (!cap) return 'N/A';
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
  return `$${cap.toLocaleString()}`;
}

function formatChange(change: number, isPercent = false): string {
  const prefix = change >= 0 ? '+' : '';
  if (isPercent) {
    return `${prefix}${change.toFixed(2)}%`;
  }
  return `${prefix}${change.toFixed(2)}`;
}

export default function StockCard({
  ticker,
  exchange,
  companyName,
  onDataLoad,
}: StockCardProps) {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const res = await fetch(`/api/stocks?tickers=${ticker}`);
        const result = await res.json();

        if (result.stocks && result.stocks[0]?.success) {
          setData(result.stocks[0]);
          onDataLoad?.(result.stocks[0]);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStock();
  }, [ticker, onDataLoad]);

  if (loading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-20 bg-space-700 rounded" />
          <div className="h-4 w-16 bg-space-700 rounded" />
        </div>
        <div className="h-8 w-24 bg-space-700 rounded mb-2" />
        <div className="h-8 w-full bg-space-700 rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card p-4 border-red-500/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-star-300">{exchange}:{ticker}</span>
          <span className="text-xs text-red-400">Unable to load</span>
        </div>
        <div className="text-sm text-white font-medium truncate">{companyName}</div>
      </div>
    );
  }

  const isPositive = data.changePercent >= 0;
  const is30DPositive = data.change30D >= 0;

  return (
    <div className="card p-4 hover:border-nebula-500/50 transition-all">
      <span className="sr-only">
        {`${companyName} (${exchange}:${ticker}): Price ${formatPrice(data.price)}, ${isPositive ? 'up' : 'down'} ${formatChange(data.changePercent, true)} today, 30-day change ${formatChange(data.change30D, true)}, market cap ${formatMarketCap(data.marketCap)}`}
      </span>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-nebula-300">
          {exchange}:{ticker}
        </span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded ${
            isPositive
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {formatChange(data.changePercent, true)}
        </span>
      </div>

      {/* Price */}
      <div className="mb-3">
        <div className="text-2xl font-bold text-white">
          {formatPrice(data.price)}
        </div>
        <div className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {formatChange(data.change)} today
        </div>
      </div>

      {/* Mini Chart */}
      <div className="mb-3">
        <StockMiniChart
          data={data.chartData}
          width={150}
          height={40}
          positive={is30DPositive}
        />
      </div>

      {/* Performance Pills */}
      <div className="flex gap-2 text-xs">
        <div
          className={`px-2 py-1 rounded ${
            isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}
        >
          1D: {formatChange(data.changePercent, true)}
        </div>
        <div
          className={`px-2 py-1 rounded ${
            is30DPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}
        >
          30D: {formatChange(data.change30D, true)}
        </div>
      </div>

      {/* Market Cap */}
      <div className="mt-2 text-xs text-star-300">
        Market Cap: {formatMarketCap(data.marketCap)}
      </div>
    </div>
  );
}

// Compact version for tables
export function StockPriceCell({
  ticker,
}: {
  ticker: string;
}) {
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const res = await fetch(`/api/stocks?tickers=${ticker}`);
        const result = await res.json();
        if (result.stocks && result.stocks[0]?.success) {
          setData(result.stocks[0]);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchStock();
  }, [ticker]);

  if (loading) {
    return <span className="text-star-300">Loading...</span>;
  }

  if (!data) {
    return <span className="text-star-300">—</span>;
  }

  const isPositive = data.changePercent >= 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-white font-medium">{formatPrice(data.price)}</span>
      <span
        className={`text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}
      >
        {formatChange(data.changePercent, true)}
      </span>
    </div>
  );
}

// Performance row for detailed view
export function StockPerformanceRow({ ticker }: { ticker: string }) {
  const [data, setData] = useState<{
    price: number;
    performance: { '1D': number; '30D': number; '1Y': number };
    chartData: { daily: Array<{ close: number }>; monthly: Array<{ close: number }> };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const res = await fetch(`/api/stocks/${ticker}`);
        const result = await res.json();
        if (!result.error) {
          setData(result);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchStock();
  }, [ticker]);

  if (loading) {
    return (
      <div className="flex items-center gap-4 animate-pulse">
        <div className="h-6 w-20 bg-space-700 rounded" />
        <div className="h-6 w-32 bg-space-700 rounded" />
        <div className="h-6 w-24 bg-space-700 rounded" />
      </div>
    );
  }

  if (!data) {
    return <span className="text-star-300">Stock data unavailable</span>;
  }

  const chartData = data.chartData.daily.map((d) => d.close);

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="text-xl font-bold text-white">
        {formatPrice(data.price)}
      </div>

      <StockMiniChart
        data={chartData}
        width={120}
        height={32}
        positive={data.performance['30D'] >= 0}
      />

      <div className="flex gap-2">
        <PerformancePill label="1D" value={data.performance['1D']} />
        <PerformancePill label="30D" value={data.performance['30D']} />
        <PerformancePill label="1Y" value={data.performance['1Y']} />
      </div>
    </div>
  );
}

function PerformancePill({ label, value }: { label: string; value: number }) {
  const isPositive = value >= 0;
  return (
    <div
      className={`px-2 py-1 rounded text-xs font-medium ${
        isPositive
          ? 'bg-green-500/20 text-green-400'
          : 'bg-red-500/20 text-red-400'
      }`}
    >
      {label}: {formatChange(value, true)}
    </div>
  );
}
