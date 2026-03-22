'use client';

import { useEffect, useState } from 'react';
import { loadPreferences } from '@/lib/user-preferences';

/**
 * Wraps the Space Tycoon promo section.
 * For enthusiasts: adds a "Featured for You" badge and ensures prominence.
 * For other personas: renders normally.
 */
export default function PersonaAwareSpaceTycoon({ children }: { children: React.ReactNode }) {
  const [isEnthusiast, setIsEnthusiast] = useState(false);

  useEffect(() => {
    const prefs = loadPreferences();
    if (prefs?.persona === 'enthusiast') {
      setIsEnthusiast(true);
    }
  }, []);

  if (!isEnthusiast) return <>{children}</>;

  return (
    <div className="relative">
      {/* Enthusiast highlight */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ background: 'var(--accent-primary)', color: '#fff', boxShadow: '0 0 16px rgba(99,102,241,0.3)' }}>
          ★ Featured for You
        </span>
      </div>
      {children}
    </div>
  );
}
