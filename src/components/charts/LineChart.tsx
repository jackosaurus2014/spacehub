'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useChartInteraction } from '@/hooks/useChartInteraction';
import ChartExportButton from '@/components/charts/ChartExportButton';
import ChartTooltip from '@/components/charts/ChartTooltip';

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
  const isMobile = useIsMobile();
  const labelFontSize = isMobile ? '10px' : '12px';

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
  const [tappedTooltip, setTappedTooltip] = useState<{
    show: boolean;
    x: number;
    y: number;
    seriesName: string;
    value: number;
    label: string;
  } | null>(null);

  const { transform, handlers, isZoomed, resetZoom } = useChartInteraction();

  // The active tooltip: on mobile use tap, on desktop use hover
  const activeTooltip = isMobile ? tappedTooltip : tooltip;

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
  const { minValue, maxValue } = useMemo(() => {
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

  // Find tooltip data for a given position
  const findTooltipData = useCallback(
    (clientX: number, clientY: number, svgEl: SVGSVGElement | null) => {
      if (!series.length || chartWidth <= 0 || !svgEl) return null;

      const rect = svgEl.getBoundingClientRect();
      const x = clientX - rect.left - padding.left;
      const y = clientY - rect.top - padding.top;

      if (x < 0 || x > chartWidth || y < 0 || y > chartHeight) {
        return null;
      }

      const dataLength = series[0]?.data.length || 0;
      const index = Math.round((x / chartWidth) * (dataLength - 1));

      if (index < 0 || index >= dataLength) {
        return null;
      }

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

      return {
        show: true,
        x: pointX,
        y: pointY,
        seriesName: closestSeries.name,
        value,
        label: labels[index] || `Point ${index + 1}`,
      };
    },
    [series, chartWidth, chartHeight, labels, minValue, valueRange, padding.left, padding.top]
  );

  // Handle mouse interactions (desktop) - composed with zoom/pan handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    handlers.onMouseMove(e as unknown as React.MouseEvent);
    if (isMobile) return;
    const data = findTooltipData(e.clientX, e.clientY, e.currentTarget);
    setTooltip(data);
  }, [isMobile, findTooltipData, handlers]);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    handlers.onMouseDown(e as unknown as React.MouseEvent);
  }, [handlers]);

  const handleMouseUp = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    handlers.onMouseUp(e as unknown as React.MouseEvent);
  }, [handlers]);

  const handleMouseLeave = useCallback(() => {
    if (!isMobile) {
      setTooltip(null);
    }
  }, [isMobile]);

  // Handle tap interactions (mobile)
  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isMobile) return;
      const data = findTooltipData(e.clientX, e.clientY, e.currentTarget);
      if (data) {
        setTappedTooltip((prev) => {
          // If tapping the same point, dismiss
          if (prev && prev.x === data.x && prev.y === data.y) return null;
          return data;
        });
      } else {
        setTappedTooltip(null);
      }
    },
    [isMobile, findTooltipData]
  );

  // Prepare export data: one row per label, with a column per series
  const exportData = useMemo(() => {
    const maxLen = Math.max(...series.map((s) => s.data.length), 0);
    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < maxLen; i++) {
      const row: Record<string, unknown> = { label: labels[i] || `Point ${i + 1}` };
      series.forEach((s) => {
        row[s.name] = s.data[i] ?? '';
      });
      rows.push(row);
    }
    return rows;
  }, [series, labels]);

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

  // Build SVG transform string for zoom/pan
  const svgTransformStr = `translate(${transform.translateX}, ${transform.translateY}) scale(${transform.scale})`;

  return (
    <div ref={containerRef} className={`relative group ${className}`} role="img" aria-label={title || 'Line chart'}>
      <ChartExportButton
        data={exportData}
        chartRef={containerRef}
        filename={title ? title.replace(/\s+/g, '_').toLowerCase() : 'line-chart'}
      />
      {title && (
        <h3 className="text-slate-100 font-semibold mb-4">{title}</h3>
      )}

      {/* Zoom controls */}
      {isZoomed && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
          <span className="text-xs text-cyan-400 bg-slate-800/80 px-2 py-1 rounded border border-slate-600">
            {transform.scale.toFixed(1)}x
          </span>
          <button
            onClick={resetZoom}
            className="text-xs text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 px-2 py-1 rounded border border-slate-600 transition-colors"
          >
            Reset zoom
          </button>
        </div>
      )}

      <svg
        width="100%"
        height={height}
        className={`overflow-hidden ${isZoomed ? 'cursor-grab active:cursor-grabbing' : ''}`}
        aria-hidden="true"
        onWheel={handlers.onWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handlers.onTouchStart}
        onTouchMove={handlers.onTouchMove}
        onTouchEnd={handlers.onTouchEnd}
        onDoubleClick={handlers.onDoubleClick}
        onClick={handleSvgClick}
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

        <g
          transform={`translate(${padding.left}, ${padding.top})`}
          style={{ transition: 'transform 0.2s ease-out' }}
        >
          <g
            transform={svgTransformStr}
            style={{ transformOrigin: `${chartWidth / 2}px ${chartHeight / 2}px`, transition: 'transform 0.2s ease-out' }}
          >
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

            {/* Data points on hover/tap */}
            {activeTooltip && series.map((s, i) => {
              const colorKey = s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
              const colors = COLORS[colorKey];
              const dataLength = s.data.length;
              const index = Math.round(((activeTooltip.x - padding.left) / chartWidth) * (dataLength - 1));
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
                    style={{ fontSize: labelFontSize }}
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
                // On mobile, show fewer labels to prevent overlap (every other label);
                // on desktop, use the existing density logic
                const maxVisible = isMobile ? Math.floor(labels.length / 2) || 1 : 7;
                const showLabel = labels.length <= maxVisible
                  || i % Math.ceil(labels.length / maxVisible) === 0
                  || i === labels.length - 1;
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
                      style={{ fontSize: labelFontSize }}
                    >
                      {label}
                      <title>{label}</title>
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
            {activeTooltip && (
              <line
                x1={activeTooltip.x - padding.left}
                y1={0}
                x2={activeTooltip.x - padding.left}
                y2={chartHeight}
                stroke="rgba(148, 163, 184, 0.3)"
                strokeDasharray="4 4"
              />
            )}
          </g>
        </g>
      </svg>

      {/* Tooltip */}
      <ChartTooltip
        x={activeTooltip ? activeTooltip.x : 0}
        y={activeTooltip ? activeTooltip.y - 50 : 0}
        visible={activeTooltip !== null}
        content={
          activeTooltip ? (
            <>
              <div className="text-slate-300 text-xs">{activeTooltip.label}</div>
              <div className="text-cyan-400 font-semibold">
                {activeTooltip.seriesName}: {activeTooltip.value.toLocaleString()}
              </div>
            </>
          ) : null
        }
      />

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
