'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

export interface LineChartSeries {
  name: string;
  data: number[];
  color?: 'cyan' | 'purple' | 'amber' | 'emerald' | 'rose';
}

export interface LineChartProps {
  series: LineChartSeries[];
  labels?: string[];
  title?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  yAxisLabel?: string;
  xAxisLabel?: string;
  className?: string;
}

const COLORS = {
  cyan: { stroke: '#22d3ee', fill: 'rgba(34, 211, 238, 0.15)' },
  purple: { stroke: '#a855f7', fill: 'rgba(168, 85, 247, 0.15)' },
  amber: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.15)' },
  emerald: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.15)' },
  rose: { stroke: '#f43f5e', fill: 'rgba(244, 63, 94, 0.15)' },
};

const DEFAULT_COLORS: Array<'cyan' | 'purple' | 'amber' | 'emerald' | 'rose'> = [
  'cyan', 'purple', 'amber', 'emerald', 'rose'
];

export default function LineChart({
  series,
  labels = [],
  title,
  height = 300,
  showGrid = true,
  showLegend = true,
  yAxisLabel,
  xAxisLabel,
  className = '',
}: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height });
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    x: number;
    y: number;
    seriesName: string;
    value: number;
    label: string;
  } | null>(null);

  // Responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [height]);

  // Calculate chart bounds
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = dimensions.width - padding.left - padding.right;
  const chartHeight = dimensions.height - padding.top - padding.bottom;

  // Calculate min/max values across all series
  const { minValue, maxValue, allData } = useMemo(() => {
    const allData = series.flatMap(s => s.data);
    const min = Math.min(...allData);
    const max = Math.max(...allData);
    const range = max - min || 1;
    return {
      minValue: min - range * 0.1,
      maxValue: max + range * 0.1,
      allData,
    };
  }, [series]);

  const valueRange = maxValue - minValue || 1;

  // Generate paths for each series
  const generatePath = useCallback((data: number[]) => {
    if (data.length === 0 || chartWidth <= 0) return '';

    const points = data.map((value, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * chartWidth;
      const y = chartHeight - ((value - minValue) / valueRange) * chartHeight;
      return { x, y };
    });

    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [chartWidth, chartHeight, minValue, valueRange]);

  // Generate area fill path
  const generateAreaPath = useCallback((data: number[]) => {
    if (data.length === 0 || chartWidth <= 0) return '';

    const linePath = generatePath(data);
    const lastX = (data.length - 1) / Math.max(data.length - 1, 1) * chartWidth;
    return `${linePath} L ${lastX} ${chartHeight} L 0 ${chartHeight} Z`;
  }, [generatePath, chartWidth, chartHeight]);

  // Generate Y-axis ticks
  const yTicks = useMemo(() => {
    const tickCount = 5;
    const ticks = [];
    for (let i = 0; i <= tickCount; i++) {
      const value = minValue + (valueRange * i) / tickCount;
      const y = chartHeight - (i / tickCount) * chartHeight;
      ticks.push({ value, y });
    }
    return ticks;
  }, [minValue, valueRange, chartHeight]);

  // Handle mouse interactions
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!series.length || chartWidth <= 0) return;

    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left - padding.left;
    const y = e.clientY - rect.top - padding.top;

    if (x < 0 || x > chartWidth || y < 0 || y > chartHeight) {
      setTooltip(null);
      return;
    }

    // Find closest data point
    const dataLength = series[0]?.data.length || 0;
    const index = Math.round((x / chartWidth) * (dataLength - 1));

    if (index < 0 || index >= dataLength) {
      setTooltip(null);
      return;
    }

    // Find the series with the closest value to the cursor
    let closestSeries = series[0];
    let closestDistance = Infinity;

    series.forEach(s => {
      const value = s.data[index];
      const pointY = chartHeight - ((value - minValue) / valueRange) * chartHeight;
      const distance = Math.abs(pointY - y);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSeries = s;
      }
    });

    const value = closestSeries.data[index];
    const pointX = (index / Math.max(dataLength - 1, 1)) * chartWidth + padding.left;
    const pointY = chartHeight - ((value - minValue) / valueRange) * chartHeight + padding.top;

    setTooltip({
      show: true,
      x: pointX,
      y: pointY,
      seriesName: closestSeries.name,
      value,
      label: labels[index] || `Point ${index + 1}`,
    });
  }, [series, chartWidth, chartHeight, labels, minValue, valueRange, padding.left, padding.top]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  if (!series.length) {
    return (
      <div
        className={`bg-slate-900/50 rounded-xl flex items-center justify-center text-slate-400 ${className}`}
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`} role="img" aria-label={title || 'Line chart'}>
      {title && (
        <h3 className="text-slate-100 font-semibold mb-4">{title}</h3>
      )}

      <svg
        width="100%"
        height={height}
        className="overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        aria-hidden="true"
      >
        <defs>
          {series.map((s, i) => {
            const colorKey = s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            const colors = COLORS[colorKey];
            return (
              <linearGradient
                key={`gradient-${i}`}
                id={`line-gradient-${i}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor={colors.stroke} stopOpacity="0.3" />
                <stop offset="100%" stopColor={colors.stroke} stopOpacity="0" />
              </linearGradient>
            );
          })}
        </defs>

        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grid lines */}
          {showGrid && (
            <g className="grid-lines">
              {yTicks.map((tick, i) => (
                <line
                  key={`grid-${i}`}
                  x1={0}
                  y1={tick.y}
                  x2={chartWidth}
                  y2={tick.y}
                  stroke="rgba(148, 163, 184, 0.1)"
                  strokeDasharray="4 4"
                />
              ))}
            </g>
          )}

          {/* Area fills */}
          {series.map((s, i) => (
            <path
              key={`area-${i}`}
              d={generateAreaPath(s.data)}
              fill={`url(#line-gradient-${i})`}
              className="transition-opacity duration-300"
            />
          ))}

          {/* Lines */}
          {series.map((s, i) => {
            const colorKey = s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            const colors = COLORS[colorKey];
            return (
              <path
                key={`line-${i}`}
                d={generatePath(s.data)}
                fill="none"
                stroke={colors.stroke}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
                style={{
                  filter: `drop-shadow(0 0 6px ${colors.stroke})`,
                }}
              />
            );
          })}

          {/* Data points on hover */}
          {tooltip && series.map((s, i) => {
            const colorKey = s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            const colors = COLORS[colorKey];
            const dataLength = s.data.length;
            const index = Math.round(((tooltip.x - padding.left) / chartWidth) * (dataLength - 1));
            if (index < 0 || index >= dataLength) return null;

            const value = s.data[index];
            const pointX = (index / Math.max(dataLength - 1, 1)) * chartWidth;
            const pointY = chartHeight - ((value - minValue) / valueRange) * chartHeight;

            return (
              <circle
                key={`point-${i}`}
                cx={pointX}
                cy={pointY}
                r={4}
                fill={colors.stroke}
                stroke="rgba(15, 23, 42, 0.8)"
                strokeWidth="2"
                className="transition-all duration-150"
                style={{
                  filter: `drop-shadow(0 0 4px ${colors.stroke})`,
                }}
              />
            );
          })}

          {/* Y-axis */}
          <g className="y-axis">
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={chartHeight}
              stroke="rgba(148, 163, 184, 0.3)"
            />
            {yTicks.map((tick, i) => (
              <g key={`y-tick-${i}`}>
                <line
                  x1={-5}
                  y1={tick.y}
                  x2={0}
                  y2={tick.y}
                  stroke="rgba(148, 163, 184, 0.5)"
                />
                <text
                  x={-10}
                  y={tick.y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="text-xs fill-slate-400"
                >
                  {tick.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </text>
              </g>
            ))}
            {yAxisLabel && (
              <text
                x={-padding.left + 15}
                y={chartHeight / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(-90, ${-padding.left + 15}, ${chartHeight / 2})`}
                className="text-xs fill-slate-400"
              >
                {yAxisLabel}
              </text>
            )}
          </g>

          {/* X-axis */}
          <g className="x-axis">
            <line
              x1={0}
              y1={chartHeight}
              x2={chartWidth}
              y2={chartHeight}
              stroke="rgba(148, 163, 184, 0.3)"
            />
            {labels.length > 0 && labels.map((label, i) => {
              const x = (i / Math.max(labels.length - 1, 1)) * chartWidth;
              // Only show some labels to avoid overcrowding
              const showLabel = labels.length <= 7 || i % Math.ceil(labels.length / 7) === 0 || i === labels.length - 1;
              if (!showLabel) return null;

              return (
                <g key={`x-tick-${i}`}>
                  <line
                    x1={x}
                    y1={chartHeight}
                    x2={x}
                    y2={chartHeight + 5}
                    stroke="rgba(148, 163, 184, 0.5)"
                  />
                  <text
                    x={x}
                    y={chartHeight + 18}
                    textAnchor="middle"
                    className="text-xs fill-slate-400"
                  >
                    {label}
                  </text>
                </g>
              );
            })}
            {xAxisLabel && (
              <text
                x={chartWidth / 2}
                y={chartHeight + 35}
                textAnchor="middle"
                className="text-xs fill-slate-400"
              >
                {xAxisLabel}
              </text>
            )}
          </g>

          {/* Vertical hover line */}
          {tooltip && (
            <line
              x1={tooltip.x - padding.left}
              y1={0}
              x2={tooltip.x - padding.left}
              y2={chartHeight}
              stroke="rgba(148, 163, 184, 0.3)"
              strokeDasharray="4 4"
            />
          )}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 px-3 py-2 rounded-lg text-sm"
          style={{
            left: tooltip.x,
            top: tooltip.y - 50,
            transform: 'translateX(-50%)',
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div className="text-slate-300 text-xs">{tooltip.label}</div>
          <div className="text-cyan-400 font-semibold">
            {tooltip.seriesName}: {tooltip.value.toLocaleString()}
          </div>
        </div>
      )}

      {/* Legend */}
      {showLegend && series.length > 1 && (
        <div className="flex flex-wrap gap-4 mt-4 justify-center" role="list" aria-label="Chart legend">
          {series.map((s, i) => {
            const colorKey = s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            const colors = COLORS[colorKey];
            return (
              <div key={`legend-${i}`} className="flex items-center gap-2" role="listitem">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors.stroke }}
                />
                <span className="text-sm text-slate-300">{s.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Screen reader accessible data */}
      <div className="sr-only">
        {series.map((s, i) => (
          <div key={`sr-${i}`}>
            <p>{s.name}: {s.data.map((v, j) => `${labels[j] || `Point ${j + 1}`}: ${v}`).join(', ')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
