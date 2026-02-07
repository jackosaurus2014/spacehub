'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';

export interface BarChartData {
  label: string;
  value: number;
  color?: 'cyan' | 'purple' | 'amber' | 'emerald' | 'rose';
}

export interface BarChartProps {
  data: BarChartData[];
  title?: string;
  height?: number;
  orientation?: 'vertical' | 'horizontal';
  showValues?: boolean;
  animate?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
}

const COLORS = {
  cyan: { main: '#22d3ee', glow: 'rgba(34, 211, 238, 0.4)' },
  purple: { main: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)' },
  amber: { main: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
  emerald: { main: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  rose: { main: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)' },
};

const DEFAULT_COLORS: Array<'cyan' | 'purple' | 'amber' | 'emerald' | 'rose'> = [
  'cyan', 'purple', 'amber', 'emerald', 'rose'
];

export default function BarChart({
  data,
  title,
  height = 300,
  orientation = 'vertical',
  showValues = true,
  animate = true,
  valueFormatter = (v) => v.toLocaleString(),
  className = '',
}: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isAnimated, setIsAnimated] = useState(false);
  const isMobile = useIsMobile();

  const labelFontSize = isMobile ? '10px' : '12px';
  const maxLabelLength = isMobile ? 8 : 10;

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

  // Trigger animation on mount
  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setIsAnimated(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsAnimated(true);
    }
  }, [animate]);

  // Calculate chart bounds
  const padding = orientation === 'vertical'
    ? { top: 20, right: 20, bottom: 60, left: 60 }
    : { top: 20, right: 80, bottom: 40, left: 120 };

  const chartWidth = dimensions.width - padding.left - padding.right;
  const chartHeight = dimensions.height - padding.top - padding.bottom;

  // Calculate max value for scaling
  const maxValue = useMemo(() => {
    const max = Math.max(...data.map(d => d.value));
    return max * 1.1; // Add 10% padding
  }, [data]);

  // Calculate bar dimensions
  const barSpacing = 0.3; // 30% of bar width as spacing
  const totalBars = data.length;

  if (!data.length) {
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
    <div ref={containerRef} className={`relative ${className}`} role="img" aria-label={title || 'Bar chart'}>
      {title && (
        <h3 className="text-slate-100 font-semibold mb-4">{title}</h3>
      )}

      <svg
        width="100%"
        height={height}
        className="overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {data.map((d, i) => {
            const colorKey = d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            const colors = COLORS[colorKey];
            return (
              <linearGradient
                key={`bar-gradient-${i}`}
                id={`bar-gradient-${i}`}
                x1="0%"
                y1="0%"
                x2={orientation === 'vertical' ? '0%' : '100%'}
                y2={orientation === 'vertical' ? '100%' : '0%'}
              >
                <stop offset="0%" stopColor={colors.main} stopOpacity="1" />
                <stop offset="100%" stopColor={colors.main} stopOpacity="0.6" />
              </linearGradient>
            );
          })}
        </defs>

        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grid lines */}
          {orientation === 'vertical' ? (
            // Horizontal grid lines for vertical bars
            Array.from({ length: 5 }, (_, i) => {
              const y = (i / 4) * chartHeight;
              return (
                <line
                  key={`grid-${i}`}
                  x1={0}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="rgba(148, 163, 184, 0.1)"
                  strokeDasharray="4 4"
                />
              );
            })
          ) : (
            // Vertical grid lines for horizontal bars
            Array.from({ length: 5 }, (_, i) => {
              const x = (i / 4) * chartWidth;
              return (
                <line
                  key={`grid-${i}`}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={chartHeight}
                  stroke="rgba(148, 163, 184, 0.1)"
                  strokeDasharray="4 4"
                />
              );
            })
          )}

          {/* Bars */}
          {data.map((d, i) => {
            const colorKey = d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            const colors = COLORS[colorKey];
            const isHovered = hoveredIndex === i;

            if (orientation === 'vertical') {
              const barWidth = (chartWidth / totalBars) * (1 - barSpacing);
              const barX = (i / totalBars) * chartWidth + (chartWidth / totalBars) * (barSpacing / 2);
              const barHeight = isAnimated ? (d.value / maxValue) * chartHeight : 0;
              const barY = chartHeight - barHeight;

              return (
                <g key={`bar-${i}`}>
                  <rect
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    fill={`url(#bar-gradient-${i})`}
                    rx={4}
                    ry={4}
                    className="cursor-pointer"
                    style={{
                      transition: animate ? 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                      transitionDelay: animate ? `${i * 100}ms` : '0ms',
                      filter: isHovered ? `drop-shadow(0 0 8px ${colors.glow})` : 'none',
                      opacity: hoveredIndex !== null && !isHovered ? 0.5 : 1,
                    }}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                  {/* Value label */}
                  {showValues && isAnimated && (
                    <text
                      x={barX + barWidth / 2}
                      y={barY - 8}
                      textAnchor="middle"
                      className="text-xs fill-slate-300 transition-opacity duration-300"
                      style={{
                        opacity: isHovered ? 1 : 0,
                      }}
                    >
                      {valueFormatter(d.value)}
                    </text>
                  )}
                  {/* X-axis label */}
                  <text
                    x={barX + barWidth / 2}
                    y={chartHeight + 20}
                    textAnchor="middle"
                    className="text-xs fill-slate-400"
                    style={{
                      fontSize: totalBars > 10 ? '10px' : labelFontSize,
                    }}
                  >
                    {d.label.length > maxLabelLength ? `${d.label.slice(0, maxLabelLength)}...` : d.label}
                    <title>{d.label}</title>
                  </text>
                </g>
              );
            } else {
              // Horizontal bars
              const barHeight = (chartHeight / totalBars) * (1 - barSpacing);
              const barY = (i / totalBars) * chartHeight + (chartHeight / totalBars) * (barSpacing / 2);
              const barWidth = isAnimated ? (d.value / maxValue) * chartWidth : 0;

              return (
                <g key={`bar-${i}`}>
                  <rect
                    x={0}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    fill={`url(#bar-gradient-${i})`}
                    rx={4}
                    ry={4}
                    className="cursor-pointer"
                    style={{
                      transition: animate ? 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                      transitionDelay: animate ? `${i * 100}ms` : '0ms',
                      filter: isHovered ? `drop-shadow(0 0 8px ${colors.glow})` : 'none',
                      opacity: hoveredIndex !== null && !isHovered ? 0.5 : 1,
                    }}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                  {/* Value label */}
                  {showValues && isAnimated && (
                    <text
                      x={barWidth + 8}
                      y={barY + barHeight / 2}
                      dominantBaseline="middle"
                      className="text-xs fill-slate-300 transition-opacity duration-300"
                      style={{
                        opacity: isHovered ? 1 : 0.7,
                      }}
                    >
                      {valueFormatter(d.value)}
                    </text>
                  )}
                  {/* Y-axis label */}
                  <text
                    x={-10}
                    y={barY + barHeight / 2}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="text-xs fill-slate-400"
                    style={{ fontSize: labelFontSize }}
                  >
                    {d.label.length > (isMobile ? 10 : 15) ? `${d.label.slice(0, isMobile ? 10 : 15)}...` : d.label}
                    <title>{d.label}</title>
                  </text>
                </g>
              );
            }
          })}

          {/* Axes */}
          {orientation === 'vertical' ? (
            <>
              {/* Y-axis */}
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={chartHeight}
                stroke="rgba(148, 163, 184, 0.3)"
              />
              {Array.from({ length: 5 }, (_, i) => {
                const value = (maxValue / 4) * (4 - i);
                const y = (i / 4) * chartHeight;
                return (
                  <g key={`y-tick-${i}`}>
                    <line
                      x1={-5}
                      y1={y}
                      x2={0}
                      y2={y}
                      stroke="rgba(148, 163, 184, 0.5)"
                    />
                    <text
                      x={-10}
                      y={y}
                      textAnchor="end"
                      dominantBaseline="middle"
                      className="text-xs fill-slate-400"
                      style={{ fontSize: labelFontSize }}
                    >
                      {valueFormatter(value)}
                    </text>
                  </g>
                );
              })}
              {/* X-axis */}
              <line
                x1={0}
                y1={chartHeight}
                x2={chartWidth}
                y2={chartHeight}
                stroke="rgba(148, 163, 184, 0.3)"
              />
            </>
          ) : (
            <>
              {/* Y-axis */}
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={chartHeight}
                stroke="rgba(148, 163, 184, 0.3)"
              />
              {/* X-axis */}
              <line
                x1={0}
                y1={chartHeight}
                x2={chartWidth}
                y2={chartHeight}
                stroke="rgba(148, 163, 184, 0.3)"
              />
              {Array.from({ length: 5 }, (_, i) => {
                const value = (maxValue / 4) * i;
                const x = (i / 4) * chartWidth;
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
                      y={chartHeight + 20}
                      textAnchor="middle"
                      className="text-xs fill-slate-400"
                    >
                      {valueFormatter(value)}
                    </text>
                  </g>
                );
              })}
            </>
          )}
        </g>
      </svg>

      {/* Tooltip for hovered bar */}
      {hoveredIndex !== null && (
        <div
          className="absolute pointer-events-none z-10 px-3 py-2 rounded-lg text-sm"
          style={{
            left: orientation === 'vertical'
              ? padding.left + ((hoveredIndex + 0.5) / totalBars) * chartWidth
              : padding.left + (data[hoveredIndex].value / maxValue) * chartWidth + 20,
            top: orientation === 'vertical'
              ? padding.top + chartHeight - (data[hoveredIndex].value / maxValue) * chartHeight - 60
              : padding.top + ((hoveredIndex + 0.5) / totalBars) * chartHeight,
            transform: orientation === 'vertical' ? 'translateX(-50%)' : 'translateY(-50%)',
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div className="text-slate-300 text-xs">{data[hoveredIndex].label}</div>
          <div className="text-cyan-400 font-semibold">
            {valueFormatter(data[hoveredIndex].value)}
          </div>
        </div>
      )}

      {/* Screen reader accessible data */}
      <div className="sr-only">
        <ul>
          {data.map((d, i) => (
            <li key={`sr-${i}`}>
              {d.label}: {valueFormatter(d.value)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
