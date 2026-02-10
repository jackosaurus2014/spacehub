'use client';

import { useState } from 'react';
import { VERIFICATION_LEVELS } from '@/lib/marketplace-types';

interface VerificationBadgeProps {
  level: string | null | undefined;
  size?: 'sm' | 'md';
  showTooltip?: boolean;
}

const CRITERIA_DESCRIPTIONS: Record<string, string> = {
  identity: 'Company identity confirmed via claimed profile.',
  capability: 'Government contract on record, SAM.gov registration, or 3+ certified service listings.',
  performance: '5+ verified reviews with 4.0+ average rating and at least 1 awarded RFQ.',
};

export default function VerificationBadge({ level, size = 'sm', showTooltip = true }: VerificationBadgeProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const key = (level || 'none') as keyof typeof VERIFICATION_LEVELS;
  const info = VERIFICATION_LEVELS[key] || VERIFICATION_LEVELS.none;

  if (key === 'none') return null;

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5'
    : 'text-xs px-2 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-bold ${sizeClasses} ${info.bgColor}/20 ${info.color} relative cursor-help`}
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
      title={info.description}
    >
      <span>{info.icon}</span>
      <span>{info.label}</span>

      {showTooltip && tooltipVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 pointer-events-none">
          <div className="text-[10px] font-bold text-white mb-1">{info.label}</div>
          <div className="text-[10px] text-slate-400 leading-relaxed">
            {CRITERIA_DESCRIPTIONS[key] || info.description}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-r border-b border-slate-600 rotate-45 -mt-1" />
        </div>
      )}
    </span>
  );
}
