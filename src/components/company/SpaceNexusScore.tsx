'use client';

import { useState, useEffect } from 'react';
import {
  calculateSpaceNexusScore,
  getScoreRingColor,
  getGradeColor,
  getScoreColor,
  getScoreBgColor,
  DIMENSION_META,
  type CompanyScoreInput,
  type SpaceNexusScoreResult,
} from '@/lib/spacenexus-score';

// ─── Props ───────────────────────────────────────────────────────────────────

interface SpaceNexusScoreProps {
  company: CompanyScoreInput;
  compact?: boolean;
}

// ─── Animated Ring (SVG gauge) ───────────────────────────────────────────────

function ScoreRing({
  score,
  grade,
  size,
  strokeWidth,
}: {
  score: number;
  grade: string;
  size: number;
  strokeWidth: number;
}) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    // Small delay so the transition is visible on mount
    const t = setTimeout(() => setAnimatedProgress(score / 100), 80);
    return () => clearTimeout(t);
  }, [score]);

  const center = size / 2;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - animatedProgress);
  const ringColor = getScoreRingColor(score);
  const gradeColorClass = getGradeColor(grade);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full opacity-20 blur-md"
        style={{ backgroundColor: ringColor }}
      />

      <svg width={size} height={size} className="transform -rotate-90 relative z-10">
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgb(30 41 59 / 0.5)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <span className={`font-bold tabular-nums ${gradeColorClass}`} style={{ fontSize: size * 0.22 }}>
          {grade}
        </span>
        <span className="text-slate-400 font-medium tabular-nums" style={{ fontSize: size * 0.13 }}>
          {score}
        </span>
      </div>
    </div>
  );
}

// ─── Dimension Bar ───────────────────────────────────────────────────────────

function DimensionBar({
  label,
  score,
  dimKey,
  compact,
}: {
  label: string;
  score: number;
  dimKey: string;
  compact?: boolean;
}) {
  const [animatedWidth, setAnimatedWidth] = useState(0);
  const meta = DIMENSION_META[dimKey] || { icon: '?', color: 'text-slate-400', bgColor: 'bg-slate-500' };

  useEffect(() => {
    const t = setTimeout(() => setAnimatedWidth(score), 100);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <div className={compact ? 'flex items-center gap-2' : ''}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-medium ${meta.color} ${compact ? 'w-24 truncate' : ''}`}>
          <span className="mr-1 opacity-70">{meta.icon}</span>
          {label}
        </span>
        <span className="text-xs text-slate-400 tabular-nums ml-2">{score}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden" style={{ minWidth: compact ? 80 : undefined }}>
        <div
          className={`h-full rounded-full ${meta.bgColor} transition-all duration-1000 ease-out`}
          style={{ width: `${animatedWidth}%` }}
        />
      </div>
    </div>
  );
}

// ─── Confidence Indicator ────────────────────────────────────────────────────

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const label = confidence >= 0.7 ? 'High' : confidence >= 0.4 ? 'Medium' : 'Low';
  const colorClass = confidence >= 0.7
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : confidence >= 0.4
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      : 'text-red-400 bg-red-500/10 border-red-500/20';

  const dots = confidence >= 0.7 ? '\u25CF\u25CF\u25CF' : confidence >= 0.4 ? '\u25CF\u25CF\u25CB' : '\u25CF\u25CB\u25CB';

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${colorClass}`}
      title={`Data confidence: ${pct}% of fields available`}
    >
      <span className="text-[10px]">{dots}</span>
      <span>{label} Confidence ({pct}%)</span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SpaceNexusScore({ company, compact = false }: SpaceNexusScoreProps) {
  const [result, setResult] = useState<SpaceNexusScoreResult | null>(null);

  useEffect(() => {
    setResult(calculateSpaceNexusScore(company));
  }, [company]);

  if (!result) return null;

  const dims = result.dimensions;
  const dimensionList = [
    dims.financialHealth,
    dims.technologyReadiness,
    dims.marketPosition,
    dims.growthMomentum,
    dims.operationalMaturity,
    dims.riskProfile,
  ];

  // ── Compact Layout ──────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center gap-4">
          <ScoreRing score={result.overall} grade={result.grade} size={72} strokeWidth={4} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-slate-100">SpaceNexus Score</h4>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getScoreColor(result.overall)} bg-white/[0.05]`}>
                {result.label}
              </span>
            </div>
            <div className="space-y-1.5">
              {dimensionList.map((d) => (
                <DimensionBar
                  key={d.key}
                  label={d.label}
                  score={d.score}
                  dimKey={d.key}
                  compact
                />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <ConfidenceIndicator confidence={result.dataConfidence} />
        </div>
      </div>
    );
  }

  // ── Full Layout ─────────────────────────────────────────────────────────
  return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start gap-2 mb-6">
        <h3 className="text-lg font-bold text-slate-100">SpaceNexus Score</h3>
        <ConfidenceIndicator confidence={result.dataConfidence} />
      </div>

      {/* Score Ring + Label */}
      <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
        <ScoreRing score={result.overall} grade={result.grade} size={120} strokeWidth={6} />
        <div className="text-center sm:text-left">
          <p className={`text-xl font-bold ${getScoreColor(result.overall)}`}>
            {result.label}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Overall score: <span className="text-white/90 font-semibold">{result.overall}</span> / 100
          </p>
          <p className="text-sm text-slate-500 mt-0.5">
            Grade: <span className={`font-bold ${getGradeColor(result.grade)}`}>{result.grade}</span>
          </p>
        </div>
      </div>

      {/* Dimension Breakdown */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wider">
          Dimension Breakdown
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {dimensionList.map((d) => (
            <DimensionBar key={d.key} label={d.label} score={d.score} dimKey={d.key} />
          ))}
        </div>
      </div>

      {/* Weighted Contribution Visual */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-white/70 mb-2 uppercase tracking-wider">
          Score Composition
        </h4>
        <div className="flex rounded-full overflow-hidden h-2.5">
          {dimensionList.map((d) => {
            const meta = DIMENSION_META[d.key];
            const width = d.weight * 100;
            const fillPct = d.score / 100;
            return (
              <div
                key={d.key}
                className="relative"
                style={{ width: `${width}%` }}
                title={`${d.label}: ${d.score}/100 (${Math.round(d.weight * 100)}% weight)`}
              >
                <div className="absolute inset-0 bg-white/[0.05]" />
                <div
                  className={`absolute inset-y-0 left-0 ${meta?.bgColor || 'bg-slate-500'} transition-all duration-1000`}
                  style={{ width: `${fillPct * 100}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1.5">
          {dimensionList.map((d) => {
            const meta = DIMENSION_META[d.key];
            return (
              <span key={d.key} className={`text-[10px] ${meta?.color || 'text-slate-400'}`}>
                {Math.round(d.weight * 100)}%
              </span>
            );
          })}
        </div>
      </div>

      {/* Insights */}
      {result.insights.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white/70 mb-2 uppercase tracking-wider">
            Key Insights
          </h4>
          <ul className="space-y-1.5">
            {result.insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                <span className="text-white/70 mt-0.5 shrink-0">-</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Inline Badge Variant ────────────────────────────────────────────────────

export function SpaceNexusScoreInline({
  company,
  showLabel = false,
}: {
  company: CompanyScoreInput;
  showLabel?: boolean;
}) {
  const [result, setResult] = useState<SpaceNexusScoreResult | null>(null);

  useEffect(() => {
    setResult(calculateSpaceNexusScore(company));
  }, [company]);

  if (!result) return null;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`font-bold tabular-nums ${getScoreColor(result.overall)}`}>
        {result.grade}
      </span>
      <span className="text-xs text-slate-400 tabular-nums">({result.overall})</span>
      {showLabel && (
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getScoreBgColor(result.overall)}/20 ${getScoreColor(result.overall)}`}>
          {result.label}
        </span>
      )}
    </span>
  );
}
