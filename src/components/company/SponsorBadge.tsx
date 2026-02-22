'use client';

interface SponsorBadgeProps {
  tier: 'verified' | 'premium' | null | undefined;
  size?: 'sm' | 'md';
}

export default function SponsorBadge({ tier, size = 'sm' }: SponsorBadgeProps) {
  if (!tier) return null;

  if (tier === 'premium') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-full border ${
        size === 'sm'
          ? 'text-xs px-2 py-0.5'
          : 'text-sm px-3 py-1'
      } bg-amber-500/15 text-amber-400 border-amber-500/30`}>
        <svg className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        Premium Sponsor
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded-full border ${
      size === 'sm'
        ? 'text-xs px-2 py-0.5'
        : 'text-sm px-3 py-1'
    } bg-blue-500/15 text-blue-400 border-blue-500/30`}>
      <svg className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Verified
    </span>
  );
}
