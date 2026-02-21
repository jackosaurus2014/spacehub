'use client';

import { motion } from 'framer-motion';
import { getScoreTier, getScoreColor, getScoreGradient, type SpaceScoreTier } from '@/lib/space-score';

interface SpaceScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showTier?: boolean;
  animated?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  sm: { outer: 40, inner: 34, stroke: 3, fontSize: 'text-xs', tierFont: 'text-[8px]' },
  md: { outer: 64, inner: 54, stroke: 4, fontSize: 'text-sm', tierFont: 'text-[10px]' },
  lg: { outer: 96, inner: 82, stroke: 5, fontSize: 'text-xl', tierFont: 'text-xs' },
};

function getStrokeColor(score: number): string {
  if (score >= 850) return '#3b82f6';
  if (score >= 700) return '#10b981';
  if (score >= 500) return '#eab308';
  if (score >= 300) return '#f97316';
  return '#ef4444';
}

export default function SpaceScoreBadge({
  score,
  size = 'md',
  showTier = false,
  animated = true,
  className = '',
}: SpaceScoreBadgeProps) {
  const config = SIZE_CONFIG[size];
  const tier: SpaceScoreTier = getScoreTier(score);
  const colorClass = getScoreColor(score);
  const gradient = getScoreGradient(score);

  const radius = (config.inner - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 1000) * circumference;
  const strokeColor = getStrokeColor(score);

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <div
        className="relative"
        style={{ width: config.outer, height: config.outer }}
        title={`Space Score: ${score}/1000 (${tier.label})`}
      >
        {/* Glow effect */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-sm`}
          style={{ width: config.outer, height: config.outer }}
        />

        {/* Background circle */}
        <svg
          width={config.outer}
          height={config.outer}
          className="transform -rotate-90 relative z-10"
        >
          {/* Track */}
          <circle
            cx={config.outer / 2}
            cy={config.outer / 2}
            r={radius}
            fill="none"
            stroke="rgb(30 41 59 / 0.6)"
            strokeWidth={config.stroke}
          />
          {/* Progress arc */}
          {animated ? (
            <motion.circle
              cx={config.outer / 2}
              cy={config.outer / 2}
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth={config.stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - progress }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          ) : (
            <circle
              cx={config.outer / 2}
              cy={config.outer / 2}
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth={config.stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
            />
          )}
        </svg>

        {/* Score number */}
        <div className={`absolute inset-0 flex items-center justify-center z-20 font-bold ${config.fontSize} ${colorClass}`}>
          {animated ? (
            <AnimatedNumber value={score} />
          ) : (
            <span>{score}</span>
          )}
        </div>
      </div>

      {/* Tier label */}
      {showTier && (
        <span className={`${config.tierFont} font-semibold ${tier.color} uppercase tracking-wider`}>
          {tier.label}
        </span>
      )}
    </div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      {value}
    </motion.span>
  );
}

// ─── Inline Badge Variant ─────────────────────────────────────────────────────
// A compact inline badge suitable for table rows and list items

export function SpaceScoreInlineBadge({
  score,
  showTier = false,
  className = '',
}: {
  score: number;
  showTier?: boolean;
  className?: string;
}) {
  const tier = getScoreTier(score);
  const colorClass = getScoreColor(score);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`font-bold tabular-nums ${colorClass}`}>{score}</span>
      {showTier && (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${tier.bgColor} ${tier.color}`}>
          {tier.label}
        </span>
      )}
    </span>
  );
}

// ─── Mini Dimension Bar ───────────────────────────────────────────────────────
// Shows a tiny horizontal bar breakdown of 5 dimensions

export function SpaceScoreMiniBar({
  breakdown,
  width = 120,
  height = 8,
  className = '',
}: {
  breakdown: { key: string; score: number; maxScore: number }[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const colors: Record<string, string> = {
    innovation: '#a855f7',
    financial: '#10b981',
    market: '#06b6d4',
    operations: '#f59e0b',
    growth: '#3b82f6',
  };

  const total = breakdown.reduce((sum, d) => sum + d.maxScore, 0);

  return (
    <div
      className={`flex rounded-full overflow-hidden ${className}`}
      style={{ width, height }}
      title={breakdown.map(d => `${d.key}: ${d.score}/${d.maxScore}`).join(', ')}
    >
      {breakdown.map(d => {
        const segmentWidth = (d.maxScore / total) * width;
        const fillPercent = d.score / d.maxScore;
        return (
          <div
            key={d.key}
            className="relative"
            style={{ width: segmentWidth, height }}
          >
            {/* Background */}
            <div className="absolute inset-0 bg-slate-800/60" />
            {/* Fill */}
            <div
              className="absolute inset-y-0 left-0 transition-all duration-1000"
              style={{
                width: `${fillPercent * 100}%`,
                backgroundColor: colors[d.key] || '#64748b',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
