'use client';

import { useRef, useState, useEffect, type ReactNode } from 'react';

interface LazySectionProps {
  children: ReactNode;
  placeholder?: ReactNode;
  rootMargin?: string;
  className?: string;
}

export default function LazySection({
  children,
  placeholder,
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

  return (
    <div ref={ref} className={className}>
      {visible ? (
        <div className="skeleton-reveal">{children}</div>
      ) : (
        placeholder ?? <div className="min-h-[200px]" />
      )}
    </div>
  );
}
