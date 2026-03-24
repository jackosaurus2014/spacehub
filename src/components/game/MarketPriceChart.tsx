'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RESOURCE_MAP, RESOURCES } from '@/lib/game/resources';
import { formatMoney } from '@/lib/game/formulas';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Candle {
  t: string; // ISO timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
  n: number; // trade count
}

interface MarketPriceChartProps {
  resourceSlug?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_W = 600;
const CHART_H = 200;
const VOL_H = 40;
const PADDING = { top: 10, right: 50, bottom: 4, left: 10 };
const TIMEFRAMES = [
  { key: '1h', label: '1H' },
  { key: '4h', label: '4H' },
  { key: '1d', label: '1D' },
  { key: '1w', label: '1W' },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function MarketPriceChart({ resourceSlug: initialResource }: MarketPriceChartProps) {
  const [resource, setResource] = useState(initialResource || 'iron');
  const [timeframe, setTimeframe] = useState<string>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Update resource when prop changes
  useEffect(() => {
    if (initialResource) setResource(initialResource);
  }, [initialResource]);

  // Fetch candle data
  const fetchCandles = useCallback(async () => {
    try {
      const limitMap: Record<string, number> = { '1h': 48, '4h': 42, '1d': 30, '1w': 20 };
      const limit = limitMap[timeframe] || 48;
      const res = await fetch(
        `/api/space-tycoon/market/history?resourceSlug=${resource}&timeframe=${timeframe}&limit=${limit}`,
      );
      if (res.ok) {
        const data = await res.json();
        setCandles(data.candles || []);
      }
    } catch {
      // silently fail
    }
  }, [resource, timeframe]);

  useEffect(() => {
    setLoading(true);
    fetchCandles().finally(() => setLoading(false));
    const interval = setInterval(fetchCandles, 60_000);
    return () => clearInterval(interval);
  }, [fetchCandles]);

  // ─── Derived Values ───────────────────────────────────────────────────

  const resourceDef = RESOURCE_MAP.get(resource as never);

  const { priceMin, priceMax, volMax, pricePath, volumeBars, currentPrice, priceChange } = useMemo(() => {
    if (candles.length === 0) {
      return { priceMin: 0, priceMax: 1, volMax: 1, pricePath: '', volumeBars: [], currentPrice: 0, priceChange: 0 };
    }

    const closes = candles.map(c => c.c);
    const highs = candles.map(c => c.h);
    const lows = candles.map(c => c.l);
    const vols = candles.map(c => c.v);

    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const range = max - min || 1;
    const maxVol = Math.max(...vols, 1);

    const drawWidth = CHART_W - PADDING.left - PADDING.right;
    const drawHeight = CHART_H - PADDING.top - PADDING.bottom;

    // Build line path from close prices
    const points = closes.map((price, i) => {
      const x = PADDING.left + (i / Math.max(candles.length - 1, 1)) * drawWidth;
      const y = PADDING.top + (1 - (price - min) / range) * drawHeight;
      return { x, y };
    });

    let path = '';
    if (points.length > 0) {
      path = `M ${points[0].x},${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x},${points[i].y}`;
      }
    }

    // Volume bars
    const barWidth = Math.max(2, drawWidth / candles.length - 1);
    const bars = vols.map((vol, i) => {
      const x = PADDING.left + (i / Math.max(candles.length - 1, 1)) * drawWidth - barWidth / 2;
      const h = (vol / maxVol) * VOL_H;
      return {
        x,
        y: VOL_H - h,
        w: barWidth,
        h,
        vol,
        isUp: i > 0 ? closes[i] >= closes[i - 1] : true,
      };
    });

    const current = closes[closes.length - 1] || 0;
    const first = closes[0] || 0;
    const change = first > 0 ? Math.round(((current - first) / first) * 1000) / 10 : 0;

    return {
      priceMin: min,
      priceMax: max,
      volMax: maxVol,
      pricePath: path,
      volumeBars: bars,
      currentPrice: current,
      priceChange: change,
    };
  }, [candles]);

  // Hovered candle info
  const hovered = hoveredIdx !== null && hoveredIdx < candles.length ? candles[hoveredIdx] : null;

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!initialResource && (
            <select
              value={resource}
              onChange={e => setResource(e.target.value)}
              className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-cyan-500/30"
            >
              {RESOURCES.map(r => (
                <option key={r.id} value={r.id} className="bg-slate-900">{r.icon} {r.name}</option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-mono font-bold">{formatMoney(currentPrice)}</span>
            {priceChange !== 0 && (
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                priceChange > 0
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-red-500/10 text-red-400'
              }`}>
                {priceChange > 0 ? '+' : ''}{priceChange}%
              </span>
            )}
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex gap-0.5">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.key}
              onClick={() => setTimeframe(tf.key)}
              className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                timeframe === tf.key
                  ? 'bg-cyan-600/20 text-cyan-400'
                  : 'text-slate-500 hover:text-white'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hovered candle info */}
      {hovered && (
        <div className="flex items-center gap-3 text-[9px] text-slate-400 bg-white/[0.02] rounded px-2 py-1">
          <span>{new Date(hovered.t).toLocaleString()}</span>
          <span>O: <span className="text-white font-mono">{formatMoney(hovered.o)}</span></span>
          <span>H: <span className="text-green-400 font-mono">{formatMoney(hovered.h)}</span></span>
          <span>L: <span className="text-red-400 font-mono">{formatMoney(hovered.l)}</span></span>
          <span>C: <span className="text-white font-mono">{formatMoney(hovered.c)}</span></span>
          <span>Vol: <span className="text-amber-400 font-mono">{hovered.v}</span></span>
        </div>
      )}

      {/* Chart */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-[240px] text-slate-500 text-xs">
            Loading chart data...
          </div>
        ) : candles.length === 0 ? (
          <div className="flex items-center justify-center h-[240px] text-slate-500 text-xs">
            No trading data yet for this timeframe.
          </div>
        ) : (
          <div className="space-y-0">
            {/* Price Chart (SVG) */}
            <svg
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              className="w-full"
              style={{ height: '160px' }}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map(pct => {
                const y = PADDING.top + pct * (CHART_H - PADDING.top - PADDING.bottom);
                const priceAtLine = priceMax - pct * (priceMax - priceMin);
                return (
                  <g key={pct}>
                    <line
                      x1={PADDING.left} y1={y}
                      x2={CHART_W - PADDING.right} y2={y}
                      stroke="rgba(255,255,255,0.04)"
                      strokeDasharray="4,4"
                    />
                    <text
                      x={CHART_W - PADDING.right + 4} y={y + 3}
                      fill="rgba(255,255,255,0.25)"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {formatMoney(Math.round(priceAtLine))}
                    </text>
                  </g>
                );
              })}

              {/* Gradient fill under line */}
              {pricePath && (
                <>
                  <defs>
                    <linearGradient id={`grad-${resource}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={priceChange >= 0 ? 'rgb(34,197,94)' : 'rgb(239,68,68)'} stopOpacity="0.2" />
                      <stop offset="100%" stopColor={priceChange >= 0 ? 'rgb(34,197,94)' : 'rgb(239,68,68)'} stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`${pricePath} L ${CHART_W - PADDING.right},${CHART_H - PADDING.bottom} L ${PADDING.left},${CHART_H - PADDING.bottom} Z`}
                    fill={`url(#grad-${resource})`}
                  />
                  <path
                    d={pricePath}
                    fill="none"
                    stroke={priceChange >= 0 ? 'rgb(34,197,94)' : 'rgb(239,68,68)'}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </>
              )}

              {/* Hover hit areas */}
              {candles.map((_, i) => {
                const drawWidth = CHART_W - PADDING.left - PADDING.right;
                const x = PADDING.left + (i / Math.max(candles.length - 1, 1)) * drawWidth;
                const segW = drawWidth / Math.max(candles.length - 1, 1);
                return (
                  <rect
                    key={i}
                    x={x - segW / 2}
                    y={0}
                    width={segW}
                    height={CHART_H}
                    fill="transparent"
                    onMouseEnter={() => setHoveredIdx(i)}
                  />
                );
              })}

              {/* Hover crosshair */}
              {hoveredIdx !== null && candles[hoveredIdx] && (() => {
                const drawWidth = CHART_W - PADDING.left - PADDING.right;
                const x = PADDING.left + (hoveredIdx / Math.max(candles.length - 1, 1)) * drawWidth;
                return (
                  <line
                    x1={x} y1={PADDING.top}
                    x2={x} y2={CHART_H - PADDING.bottom}
                    stroke="rgba(255,255,255,0.15)"
                    strokeDasharray="2,2"
                  />
                );
              })()}
            </svg>

            {/* Volume Bars (SVG) */}
            <svg
              viewBox={`0 0 ${CHART_W} ${VOL_H}`}
              className="w-full"
              style={{ height: '30px' }}
            >
              {volumeBars.map((bar, i) => (
                <rect
                  key={i}
                  x={bar.x}
                  y={bar.y}
                  width={Math.max(1, bar.w)}
                  height={Math.max(0.5, bar.h)}
                  fill={bar.isUp ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}
                  rx="0.5"
                />
              ))}
            </svg>
          </div>
        )}
      </div>

      {/* Stats bar */}
      {candles.length > 0 && (
        <div className="flex items-center justify-between text-[9px] text-slate-500 px-1">
          <span>High: <span className="text-green-400 font-mono">{formatMoney(priceMax)}</span></span>
          <span>Low: <span className="text-red-400 font-mono">{formatMoney(priceMin)}</span></span>
          <span>Volume: <span className="text-amber-400 font-mono">
            {candles.reduce((s, c) => s + c.v, 0).toLocaleString()}
          </span></span>
          <span>Trades: <span className="text-white font-mono">
            {candles.reduce((s, c) => s + c.n, 0).toLocaleString()}
          </span></span>
        </div>
      )}
    </div>
  );
}
