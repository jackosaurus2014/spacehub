'use client';

interface ComingSoonBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

export default function ComingSoonBadge({ size = 'sm', className = '' }: ComingSoonBadgeProps) {
  const sizeClasses = size === 'sm'
    ? 'text-[9px] px-1.5 py-0.5'
    : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-bold border ${sizeClasses} bg-blue-500/15 text-blue-400 border-blue-500/30 ${className}`}
    >
      Coming Soon
    </span>
  );
}
