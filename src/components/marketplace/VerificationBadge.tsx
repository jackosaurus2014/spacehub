'use client';

import { VERIFICATION_LEVELS } from '@/lib/marketplace-types';

interface VerificationBadgeProps {
  level: string | null | undefined;
  size?: 'sm' | 'md';
}

export default function VerificationBadge({ level, size = 'sm' }: VerificationBadgeProps) {
  const key = (level || 'none') as keyof typeof VERIFICATION_LEVELS;
  const info = VERIFICATION_LEVELS[key] || VERIFICATION_LEVELS.none;

  if (key === 'none') return null;

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5'
    : 'text-xs px-2 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-bold ${sizeClasses} ${info.bgColor}/20 ${info.color}`}
      title={info.description}
    >
      <span>{info.icon}</span>
      <span>{info.label}</span>
    </span>
  );
}
