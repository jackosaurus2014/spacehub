'use client';

import { useRef, useState, useEffect, type ReactNode } from 'react';

interface LazySectionProps {
  children: ReactNode;
  /** @deprecated Use fallback instead */
  placeholder?: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  className?: string;
}

export default function LazySection({
  children,
  placeholder,
  fallback,
  rootMargin = '200px 0px',
  className = '',
}: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  const fallbackContent = fallback ?? placeholder ?? (
    <div className="h-48 animate-pulse bg-white/5 rounded-lg" />
  );

  return (
    <div ref={ref} className={className}>
      {visible ? (
        <div className="skeleton-reveal">{children}</div>
      ) : (
        fallbackContent
      )}
    </div>
  );
}
