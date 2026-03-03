'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useNavigationDirection } from '@/hooks/useNavigationDirection';
import { useIsMobile } from '@/hooks/useIsMobile';

interface PageTransitionProviderProps {
  children: React.ReactNode;
}

export default function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const pathname = usePathname();
  const direction = useNavigationDirection();
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(true);
  const prevPathRef = useRef(pathname);
  const prefersReduced = typeof window !== 'undefined'
    ? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    : false;

  useEffect(() => {
    if (!isMobile || prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    // Brief fade out then back in
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, [pathname, isMobile]);

  // On desktop, skip animations entirely
  if (!isMobile) {
    return <>{children}</>;
  }

  const duration = prefersReduced ? '0.1s' : '0.2s';
  const translateX = prefersReduced ? '0' : direction > 0 ? '8px' : '-8px';

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : `translateX(${translateX})`,
        transition: `opacity ${duration} ease-out, transform ${duration} ease-out`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
