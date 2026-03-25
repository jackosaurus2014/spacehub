'use client';

import React from 'react';

interface CompanyAvatarProps {
  name: string;
  tier?: number;
  size?: number;
  className?: string;
}

/**
 * Generates a deterministic colored avatar from a company name,
 * similar to Slack/GitHub default avatars.
 */
export default function CompanyAvatar({ name, tier, size = 40, className = '' }: CompanyAvatarProps) {
  // Generate consistent hash from company name
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const colors = [
    'from-indigo-500 to-blue-600',
    'from-cyan-500 to-teal-600',
    'from-purple-500 to-violet-600',
    'from-amber-500 to-orange-600',
    'from-emerald-500 to-green-600',
    'from-rose-500 to-pink-600',
    'from-sky-500 to-indigo-600',
    'from-fuchsia-500 to-purple-600',
  ];

  const gradient = colors[hash % colors.length];

  const initials = name
    .split(/[\s\-&]+/)
    .filter(w => w.length > 0)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  // Tier-based border accent
  const borderColor =
    tier === 1 ? 'border-amber-500/40' :
    tier === 2 ? 'border-blue-500/30' :
    tier === 3 ? 'border-purple-500/30' :
    'border-white/10';

  // Scale font size relative to container
  const fontSize = size <= 32 ? 'text-[10px]' :
                   size <= 48 ? 'text-xs' :
                   size <= 64 ? 'text-base' :
                   'text-lg';

  return (
    <div
      className={`bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center border ${borderColor} shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className={`text-white font-bold ${fontSize} leading-none select-none`}>
        {initials}
      </span>
    </div>
  );
}
