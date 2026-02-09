'use client';

import { motion } from 'framer-motion';

interface SecondaryField {
  label: string;
  value: string | number;
}

interface MobileDataCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  primaryValue: string | number;
  primaryLabel: string;
  secondaryFields?: SecondaryField[];
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onClick?: () => void;
  className?: string;
}

const trendConfig = {
  up: { color: 'text-emerald-400', arrow: '\u2191', bg: 'bg-emerald-500/10' },
  down: { color: 'text-red-400', arrow: '\u2193', bg: 'bg-red-500/10' },
  neutral: { color: 'text-slate-400', arrow: '\u2192', bg: 'bg-slate-500/10' },
};

export default function MobileDataCard({
  title,
  subtitle,
  icon,
  primaryValue,
  primaryLabel,
  secondaryFields,
  trend,
  trendValue,
  onClick,
  className = '',
}: MobileDataCardProps) {
  const trendStyle = trend ? trendConfig[trend] : null;

  return (
    <motion.div
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`rounded-xl border border-slate-700/50 p-4 backdrop-blur-sm transition-colors ${
        onClick ? 'cursor-pointer active:bg-slate-800/60 hover:border-cyan-500/30' : ''
      } ${className}`}
      style={{
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.85))',
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Header row: icon + title + trend */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {icon && (
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-lg">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-100 truncate">{title}</h3>
            {subtitle && (
              <p className="text-xs text-slate-400 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {trendStyle && trendValue && (
          <span className={`flex-shrink-0 text-xs font-medium px-2 py-1 rounded-lg ${trendStyle.bg} ${trendStyle.color}`}>
            {trendStyle.arrow} {trendValue}
          </span>
        )}
      </div>

      {/* Primary value */}
      <div className="mb-3">
        <div className="text-2xl font-bold text-cyan-400 tabular-nums">{primaryValue}</div>
        <div className="text-xs text-slate-400 mt-0.5">{primaryLabel}</div>
      </div>

      {/* Secondary fields grid */}
      {secondaryFields && secondaryFields.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t border-slate-700/40">
          {secondaryFields.map((field) => (
            <div key={field.label}>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{field.label}</div>
              <div className="text-sm text-slate-200 font-medium tabular-nums">{field.value}</div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
