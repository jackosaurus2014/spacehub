'use client';

/**
 * Visual badge showing a company's Health Index score.
 * Color-coded by grade. Shows score number and grade label.
 * Used on company profiles, rankings, and search results.
 */

interface HealthScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function getGradeInfo(score: number) {
  if (score >= 80) return { grade: 'Strong Growth', color: '#22c55e', bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400' };
  if (score >= 60) return { grade: 'Stable', color: '#06b6d4', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' };
  if (score >= 40) return { grade: 'Watch', color: '#eab308', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400' };
  if (score >= 20) return { grade: 'At Risk', color: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' };
  return { grade: 'Distressed', color: '#ef4444', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' };
}

export default function HealthScoreBadge({ score, size = 'md', showLabel = true }: HealthScoreBadgeProps) {
  const info = getGradeInfo(score);

  const sizes = {
    sm: { circle: 'w-8 h-8', text: 'text-xs', label: 'text-[9px]' },
    md: { circle: 'w-12 h-12', text: 'text-sm', label: 'text-[10px]' },
    lg: { circle: 'w-16 h-16', text: 'text-lg', label: 'text-xs' },
  };

  const s = sizes[size];

  // SVG ring progress
  const radius = size === 'lg' ? 28 : size === 'md' ? 20 : 14;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const svgSize = size === 'lg' ? 64 : size === 'md' ? 48 : 32;

  return (
    <div className="flex items-center gap-2">
      <div className={`relative ${s.circle} flex items-center justify-center`}>
        <svg width={svgSize} height={svgSize} className="absolute inset-0 -rotate-90">
          {/* Background ring */}
          <circle
            cx={svgSize / 2} cy={svgSize / 2} r={radius}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"
          />
          {/* Progress ring */}
          <circle
            cx={svgSize / 2} cy={svgSize / 2} r={radius}
            fill="none" stroke={info.color} strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <span className={`${s.text} font-bold ${info.text} relative z-10`}>{score}</span>
      </div>
      {showLabel && (
        <div>
          <p className={`${s.label} font-semibold ${info.text}`}>{info.grade}</p>
          <p className={`${s.label} text-slate-600`}>Health Index</p>
        </div>
      )}
    </div>
  );
}
