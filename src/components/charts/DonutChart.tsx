'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';

export interface DonutChartSegment {
  label: string;
  value: number;
  color?: 'cyan' | 'purple' | 'amber' | 'emerald' | 'rose' | 'slate';
}

export interface DonutChartProps {
  data: DonutChartSegment[];
  title?: string;
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
  showLegend?: boolean;
  animate?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
}

const COLORS = {
  cyan: { main: '#22d3ee', glow: 'rgba(34, 211, 238, 0.4)', bg: 'rgba(34, 211, 238, 0.1)' },
  purple: { main: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)', bg: 'rgba(168, 85, 247, 0.1)' },
  amber: { main: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', bg: 'rgba(245, 158, 11, 0.1)' },
  emerald: { main: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', bg: 'rgba(16, 185, 129, 0.1)' },
  rose: { main: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)', bg: 'rgba(244, 63, 94, 0.1)' },
  slate: { main: '#64748b', glow: 'rgba(100, 116, 139, 0.4)', bg: 'rgba(100, 116, 139, 0.1)' },
};

const DEFAULT_COLORS: Array<'cyan' | 'purple' | 'amber' | 'emerald' | 'rose' | 'slate'> = [
  'cyan', 'purple', 'amber', 'emerald', 'rose', 'slate'
];

interface SegmentData {
  startAngle: number;
  endAngle: number;
  percentage: number;
  color: typeof COLORS[keyof typeof COLORS];
  colorKey: string;
  data: DonutChartSegment;
}

export default function DonutChart({
  data,
  title,
  size = 200,
  thickness = 30,
  centerLabel,
  centerValue,
  showLegend = true,
  animate = true,
  valueFormatter = (v) => v.toLocaleString(),
  className = '',
}: DonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [animationProgress, setAnimationProgress] = useState(animate ? 0 : 1);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const legendFontSize = isMobile ? '10px' : undefined;
  const maxLegendLabelLength = isMobile ? 12 : Infinity;

  // Animation effect
  useEffect(() => {
    if (!animate) {
      setAnimationProgress(1);
      return;
    }

    let startTime: number;
    const duration = 1000; // 1 second animation

    const animateChart = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimationProgress(eased);

      if (progress < 1) {
        requestAnimationFrame(animateChart);
      }
    };

    const timer = setTimeout(() => {
      requestAnimationFrame(animateChart);
    }, 100);

    return () => clearTimeout(timer);
  }, [animate]);

  // Calculate total and segments
  const { total, segments } = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    let currentAngle = -90; // Start from top

    const segments: SegmentData[] = data.map((d, i) => {
      const percentage = total > 0 ? (d.value / total) * 100 : 0;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const colorKey = d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];

      return {
        startAngle,
        endAngle,
        percentage,
        color: COLORS[colorKey],
        colorKey,
        data: d,
      };
    });

    return { total, segments };
  }, [data]);

  // SVG calculations
  const center = size / 2;
  const radius = (size - thickness) / 2;
  const innerRadius = radius - thickness;

  // Generate arc path
  const createArcPath = (startAngle: number, endAngle: number, outerR: number, innerR: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + outerR * Math.cos(startRad);
    const y1 = center + outerR * Math.sin(startRad);
    const x2 = center + outerR * Math.cos(endRad);
    const y2 = center + outerR * Math.sin(endRad);
    const x3 = center + innerR * Math.cos(endRad);
    const y3 = center + innerR * Math.sin(endRad);
    const x4 = center + innerR * Math.cos(startRad);
    const y4 = center + innerR * Math.sin(startRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `
      M ${x1} ${y1}
      A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `;
  };

  if (!data.length) {
    return (
      <div
        className={`flex items-center justify-center text-slate-400 ${className}`}
        style={{ width: size, height: size }}
      >
        No data
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`${className}`} role="img" aria-label={title || 'Donut chart'}>
      {title && (
        <h3 className="text-slate-100 font-semibold mb-4 text-center">{title}</h3>
      )}

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Chart */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            className="transform -rotate-0"
            aria-hidden="true"
          >
            {/* Background circle */}
            <circle
              cx={center}
              cy={center}
              r={radius - thickness / 2}
              fill="none"
              stroke="rgba(51, 65, 85, 0.5)"
              strokeWidth={thickness}
            />

            {/* Segments */}
            {segments.map((segment, i) => {
              const isHovered = hoveredIndex === i;
              const animatedEndAngle = segment.startAngle +
                (segment.endAngle - segment.startAngle) * animationProgress;

              // Skip if segment would be too small
              if (animatedEndAngle - segment.startAngle < 0.5) return null;

              const outerR = isHovered ? radius + 5 : radius;
              const innerR = isHovered ? innerRadius - 2 : innerRadius;

              return (
                <path
                  key={`segment-${i}`}
                  d={createArcPath(segment.startAngle, animatedEndAngle, outerR, innerR)}
                  fill={segment.color.main}
                  className="cursor-pointer transition-all duration-200"
                  style={{
                    filter: isHovered ? `drop-shadow(0 0 10px ${segment.color.glow})` : 'none',
                    opacity: hoveredIndex !== null && !isHovered ? 0.5 : 1,
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}

            {/* Inner circle overlay for cleaner look */}
            <circle
              cx={center}
              cy={center}
              r={innerRadius - 5}
              fill="rgba(15, 23, 42, 0.9)"
            />
          </svg>

          {/* Center label */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{
              padding: thickness + 10,
            }}
          >
            {hoveredIndex !== null ? (
              <>
                <div className="text-slate-300 text-xs text-center truncate max-w-full">
                  {segments[hoveredIndex].data.label}
                </div>
                <div className="text-xl font-bold text-white">
                  {valueFormatter(segments[hoveredIndex].data.value)}
                </div>
                <div className="text-sm text-cyan-400">
                  {segments[hoveredIndex].percentage.toFixed(1)}%
                </div>
              </>
            ) : (
              <>
                {centerLabel && (
                  <div className="text-slate-400 text-xs">{centerLabel}</div>
                )}
                {centerValue !== undefined && (
                  <div className="text-xl font-bold text-white">
                    {typeof centerValue === 'number' ? valueFormatter(centerValue) : centerValue}
                  </div>
                )}
                {!centerLabel && !centerValue && (
                  <>
                    <div className="text-slate-400 text-xs">Total</div>
                    <div className="text-xl font-bold text-white">
                      {valueFormatter(total)}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="flex flex-col gap-2" role="list" aria-label="Chart legend">
            {segments.map((segment, i) => {
              const isHovered = hoveredIndex === i;
              return (
                <div
                  key={`legend-${i}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    isHovered ? 'bg-slate-700/50' : 'hover:bg-slate-800/50'
                  }`}
                  style={{
                    opacity: hoveredIndex !== null && !isHovered ? 0.5 : 1,
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  role="listitem"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: segment.color.main,
                      boxShadow: isHovered ? `0 0 8px ${segment.color.glow}` : 'none',
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm text-slate-200 truncate"
                      style={legendFontSize ? { fontSize: legendFontSize } : undefined}
                      title={segment.data.label}
                    >
                      {segment.data.label.length > maxLegendLabelLength
                        ? `${segment.data.label.slice(0, maxLegendLabelLength)}...`
                        : segment.data.label}
                    </div>
                    <div
                      className="text-xs text-slate-400"
                      style={legendFontSize ? { fontSize: legendFontSize } : undefined}
                    >
                      {valueFormatter(segment.data.value)} ({segment.percentage.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Screen reader accessible data */}
      <div className="sr-only">
        <ul>
          {segments.map((segment, i) => (
            <li key={`sr-${i}`}>
              {segment.data.label}: {valueFormatter(segment.data.value)} ({segment.percentage.toFixed(1)}%)
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
