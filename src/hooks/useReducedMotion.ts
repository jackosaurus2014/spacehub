'use client';

import { useEffect, useState } from 'react';

// One hook for every JS-driven animation (rAF counters, reveal-on-scroll).
// The CSS clamp in globals.css never reaches requestAnimationFrame code, so
// AnimatedCounter, KPIStrip and ScrollReveal each ignored the user's setting
// until they read this. Also honours the site's own "reduce motion" toggle
// (html.reduce-motion) so the two never disagree.
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (document.documentElement.classList.contains('reduce-motion')) return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function useReducedMotion(): boolean {
  // Start false on the server and on first paint so SSR and hydration agree;
  // flip on the client before any animation has a chance to run a frame.
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(prefersReducedMotion());
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => setReduced(prefersReducedMotion());
      mq.addEventListener('change', onChange);
      return () => mq?.removeEventListener('change', onChange);
    } catch {
      return undefined;
    }
  }, []);
  return reduced;
}
