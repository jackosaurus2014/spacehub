'use client';

import Link from 'next/link';

interface PlayStoreBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  utm?: string;
}

/**
 * Reusable Google Play Store badge linking to the SpaceNexus app.
 * Used on homepage, /app, /getting-started, etc.
 */
export default function PlayStoreBadge({ size = 'md', className = '', utm = 'badge' }: PlayStoreBadgeProps) {
  const href = `https://play.google.com/store/apps/details?id=com.spacenexus.app&referrer=utm_source%3Dwebsite%26utm_medium%3D${utm}`;

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-2',
    md: 'px-4 py-2.5 text-sm gap-2.5',
    lg: 'px-6 py-3.5 text-base gap-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center ${sizes[size]} bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] hover:border-white/[0.15] rounded-xl font-medium text-white transition-all duration-200 active:scale-[0.98] ${className}`}
    >
      <svg className={iconSizes[size]} viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.4l2.453 1.42a1 1 0 010 1.546l-2.453 1.42-2.537-2.386 2.537-2zm-3.906-2.093L5.157 1.58l10.937 6.333-2.302 2.301z" />
      </svg>
      <span>
        <span className="block text-[9px] uppercase tracking-wider opacity-60 leading-none">Get it on</span>
        <span className="block leading-tight font-semibold">Google Play</span>
      </span>
    </a>
  );
}

/**
 * Internal link version for use within the site (links to /app page instead of Play Store directly).
 */
export function PlayStoreInternalBadge({ size = 'md', className = '' }: Omit<PlayStoreBadgeProps, 'utm'>) {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-2',
    md: 'px-4 py-2.5 text-sm gap-2.5',
    lg: 'px-6 py-3.5 text-base gap-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  return (
    <Link
      href="/app"
      className={`inline-flex items-center ${sizes[size]} bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] hover:border-white/[0.15] rounded-xl font-medium text-white transition-all duration-200 active:scale-[0.98] ${className}`}
    >
      <svg className={iconSizes[size]} viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.4l2.453 1.42a1 1 0 010 1.546l-2.453 1.42-2.537-2.386 2.537-2zm-3.906-2.093L5.157 1.58l10.937 6.333-2.302 2.301z" />
      </svg>
      <span>
        <span className="block text-[9px] uppercase tracking-wider opacity-60 leading-none">Available on</span>
        <span className="block leading-tight font-semibold">Google Play</span>
      </span>
    </Link>
  );
}
