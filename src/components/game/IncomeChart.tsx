'use client';

import { formatMoney } from '@/lib/game/formulas';

interface IncomeChartProps {
  data: number[];
}

/**
 * SVG sparkline area chart showing income history.
 * Green gradient when trending up, red when trending down.
 */
export default function IncomeChart({ data }: IncomeChartProps) {
  if (!data || data.length < 2) return null;

  const width = 300;
  const height = 60;
  const padding = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const trending = data[data.length - 1] >= data[Math.max(0, data.length - 4)];
  const latest = data[data.length - 1];
  const gradientId = trending ? 'incomeGradUp' : 'incomeGradDown';
  const lineColor = trending ? '#22c55e' : '#ef4444';
  const fillColorStart = trending ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)';
  const fillColorEnd = 'rgba(0,0,0,0)';

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-500 text-[10px] uppercase tracking-wider font-medium">Income Trend (24mo)</span>
        <span className={`text-xs font-mono ${trending ? 'text-green-400' : 'text-red-400'}`}>
          {latest >= 0 ? '+' : ''}{formatMoney(latest)}/mo
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColorStart} />
            <stop offset="100%" stopColor={fillColorEnd} />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradientId})`} />
        {/* Line */}
        <path d={linePath} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Current value dot */}
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.5" fill={lineColor} />
      </svg>
    </div>
  );
}
