'use client';

import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  glow?: 'none' | 'cyan' | 'purple' | 'emerald';
  onClick?: () => void;
}

const glowStyles = {
  none: '',
  cyan: 'hover:shadow-cyan-500/10 hover:border-cyan-500/30',
  purple: 'hover:shadow-purple-500/10 hover:border-purple-500/30',
  emerald: 'hover:shadow-emerald-500/10 hover:border-emerald-500/30',
};

export default function GlassCard({
  children,
  className = '',
  hoverable = true,
  glow = 'cyan',
  onClick,
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`card p-6 transition-all duration-200 ${
        hoverable ? `hover:-translate-y-1 hover:shadow-lg ${glowStyles[glow]}` : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
