'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';

interface StickyMobileCTAProps {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'enterprise';
  icon?: ReactNode;
}

export default function StickyMobileCTA({
  label,
  href,
  onClick,
  variant = 'primary',
  icon,
}: StickyMobileCTAProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };

    // Check initial position
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const gradientClass =
    variant === 'enterprise'
      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 shadow-purple-500/25 hover:shadow-purple-500/40'
      : 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-cyan-500/25 hover:shadow-cyan-500/40';

  const sharedClass = [
    'flex items-center justify-center gap-2',
    'w-full min-h-[44px] py-3 px-6',
    'rounded-xl font-semibold text-white text-base',
    'transition-all shadow-lg',
    gradientClass,
  ].join(' ');

  const content = (
    <>
      {icon && <span className="shrink-0">{icon}</span>}
      {label}
    </>
  );

  return (
    <div
      className={[
        'fixed bottom-16 left-0 right-0 z-40 md:hidden',
        'px-4 pb-[env(safe-area-inset-bottom)]',
        'bg-gradient-to-t from-slate-900/95 via-slate-900/80 to-transparent',
        'backdrop-blur-sm',
        'transition-all duration-300 ease-out',
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-full opacity-0 pointer-events-none',
      ].join(' ')}
    >
      <div className="pt-3 pb-2">
        {href ? (
          <Link href={href} className={sharedClass}>
            {content}
          </Link>
        ) : (
          <button type="button" onClick={onClick} className={sharedClass}>
            {content}
          </button>
        )}
      </div>
    </div>
  );
}
